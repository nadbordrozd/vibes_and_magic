import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { EQUIPMENT_SLOTS } from '../content/artifacts';
import { UNITS } from '../content/units';
import { createGame } from '../core/game';
import type { ArtifactId, EquipmentSlotId, GameState } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.argv[2] ?? process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const outputDir = '.pixel-work/review/hero-dashboard';
mkdirSync(outputDir, { recursive: true });

function fixture(): GameState {
  const state = createGame({ seed: 5903, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
  const hero = state.players.p1.hero!;
  hero.skills = { logistics: 3, scouting: 3, attunement: 3, ritualist: 3,
    provisioner: 3, command: 3 };
  const unitIds = Object.keys(UNITS) as Array<keyof typeof UNITS>;
  hero.army = Array.from({ length: 7 }, (_, index) => ({ unitId: unitIds[index], count: index + 2 }));
  const equipped: Record<EquipmentSlotId, ArtifactId> = {
    head: 'circletOfSmallRites', cloak: 'travelersCloak', amulet: 'seamstone',
    weapon: 'skirmishersBlade', shield: 'yeomansBuckler', armor: 'quiltedCoat',
    ring1: 'ringOfSmallMendings', ring2: 'ringOfTheSteadyHand', boots: 'cobblersPride',
    misc1: 'tailorsNeedle', misc2: 'mirrorMask',
  };
  for (const slot of EQUIPMENT_SLOTS) hero.artifacts.equipment[slot] = {
    id: equipped[slot], ...(slot === 'amulet' ? { chosenSchool: 'rite' as const } : {}),
  };
  hero.artifacts.backpack = [{ id: 'queensAmber' }, { id: 'patternbook' },
    { id: 'quietHorseshoe' }, { id: 'wayfarersMantle' }];
  hero.inventory = [{ id: 'spellScroll', storedSpellId: 'rally', plus: true },
    { id: 'waybread' }, { id: 'potionOfVigor' }, { id: 'tradeGoods', origin: { x: 2, y: 3 } },
    null, null, null, null];
  hero.adventureEffects.nextBattleMeterBonus = 10;
  hero.adventureEffects.nextBattleLuckBonus = 1;
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

async function install(page: Page, state: GameState): Promise<void> {
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(({ save, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({
      savedAt: 1, day: initial.day, week: initial.week, activePlayer: initial.activePlayer,
    }));
  }, { save: actionSave(state), initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  const primer = await page.$('.objective-primer');
  if (primer) {
    await page.locator('.choice-dialog .primary').click();
    await page.waitForSelector('.choice-dialog', { hidden: true });
  }
  await page.$$eval('button', (buttons) => {
    const button = buttons.find((candidate) => candidate.textContent?.trim() === 'Hero details');
    if (!button) throw new Error('Hero details entry was not found');
    button.click();
  });
  await page.waitForSelector('.hero-dashboard-dialog');
}

async function audit(page: Page, name: string): Promise<void> {
  await page.evaluate(async () => {
    const body = document.querySelector<HTMLElement>('.hero-dashboard-body')!;
    for (const top of [0, Math.floor(body.scrollHeight / 2), body.scrollHeight]) {
      body.scrollTop = top;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    body.scrollTop = 0;
  });
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>(
    '.hero-dashboard-dialog img',
  )].every((image) => image.complete));
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const dialog = document.querySelector<HTMLElement>('.hero-dashboard-dialog')!;
    const body = document.querySelector<HTMLElement>('.hero-dashboard-body')!;
    const dialogRect = dialog.getBoundingClientRect();
    const visibleButtons = [...dialog.querySelectorAll<HTMLButtonElement>('button')].filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewportHeight;
    });
    const undersized = visibleButtons.filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).map((button) => ({ text: button.textContent?.trim(), rect: button.getBoundingClientRect().toJSON() }));
    const images = [...dialog.querySelectorAll<HTMLImageElement>('img')];
    const failedImages = images.filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.src);
    const regionOverflow = [...dialog.querySelectorAll<HTMLElement>('[data-dashboard-region]')]
      .filter((region) => region.scrollWidth > region.clientWidth + 1).map((region) => region.dataset.dashboardRegion);
    return {
      viewportWidth, viewportHeight,
      dialog: { left: dialogRect.left, right: dialogRect.right, top: dialogRect.top, bottom: dialogRect.bottom },
      documentOverflow: document.documentElement.scrollWidth - viewportWidth,
      bodyOverflow: body.scrollWidth - body.clientWidth,
      bodyScrolls: getComputedStyle(body).overflowY === 'auto',
      regions: [...dialog.querySelectorAll('[data-dashboard-region]')].map((region) =>
        (region as HTMLElement).dataset.dashboardRegion),
      tabs: dialog.querySelectorAll('.hero-details-tabs, [role="tab"]').length,
      army: dialog.querySelectorAll('.hero-dashboard-army-grid > *').length,
      equipment: dialog.querySelectorAll('.hero-dashboard-equipment-grid > button').length,
      items: dialog.querySelectorAll('.hero-dashboard-item-grid > *').length,
      failedImages, regionOverflow, undersized,
      fallbacks: dialog.querySelectorAll('[class*="fallback"]').length,
      closeFocused: document.activeElement?.getAttribute('aria-label') === 'Close hero dashboard',
    };
  });
  const expectedRegions = ['identity', 'primary-stats', 'vitals-status', 'army',
    'secondary-skills', 'equipped-artifacts', 'artifact-backpack', 'consumables', 'special-controls'];
  if (result.documentOverflow > 0 || result.bodyOverflow > 0 || result.tabs
      || result.army !== 7 || result.equipment !== 11 || result.items !== 8
      || result.failedImages.length || result.fallbacks || result.regionOverflow.length || result.undersized.length
      || !result.bodyScrolls || !result.closeFocused
      || JSON.stringify(result.regions) !== JSON.stringify(expectedRegions)
      || result.dialog.left < 0 || result.dialog.right > result.viewportWidth
      || result.dialog.top < 0 || result.dialog.bottom > result.viewportHeight) {
    throw new Error(`${name} dashboard audit failed: ${JSON.stringify(result)}`);
  }
}

async function auditDetailJourney(page: Page, name: string): Promise<void> {
  const trigger = '.hero-dashboard-portrait-button';
  await page.locator(trigger).click();
  await page.waitForSelector('.hero-dashboard-detail');
  const detailFocused = await page.evaluate(() =>
    document.activeElement?.classList.contains('hero-dashboard-detail-close'));
  if (!detailFocused) throw new Error(`${name} detail did not receive initial focus`);
  await page.screenshot({ path: `${outputDir}/detail-${name}.png` });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
  const returned = await page.evaluate((selector) => document.activeElement?.matches(selector), trigger);
  if (!returned || !await page.$('.hero-dashboard-dialog')) {
    throw new Error(`${name} detail Escape did not restore its invoking cell`);
  }
  await page.focus('.hero-dashboard-skills button');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.hero-dashboard-detail');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
}

async function auditActionDetails(page: Page, name: string): Promise<void> {
  const replayBefore = await page.evaluate(() =>
    document.querySelector('.activity-log')?.textContent ?? '');
  await page.locator('.hero-dashboard-backpack-grid button').click();
  await page.waitForSelector('.hero-dashboard-detail');
  const artifactText = await page.$eval('.hero-dashboard-detail', (dialog) => dialog.textContent ?? '');
  if (!artifactText.includes("Queen's Amber") || !artifactText.includes('Equip…')) {
    throw new Error(`${name} backpack activation did not open artifact details first`);
  }
  await page.screenshot({ path: `${outputDir}/artifact-detail-${name}.png` });
  await page.$$eval('.hero-dashboard-detail button', (buttons) => {
    const equip = buttons.find((button) => button.textContent?.trim() === 'Equip…');
    if (!equip) throw new Error('Equip action was not found in artifact detail');
    equip.click();
  });
  await page.waitForSelector('.equipment-destinations');
  const destinations = await page.evaluate(() => ({
    count: document.querySelectorAll('.equipment-destinations > button').length,
    disabled: document.querySelectorAll('.equipment-destinations > button:disabled').length,
    unavailable: document.querySelectorAll('.equipment-destinations > button[aria-disabled="true"]').length,
  }));
  if (destinations.count !== 11 || destinations.disabled !== 0 || destinations.unavailable !== 9) {
    throw new Error(`${name} equipment destination contract failed: ${JSON.stringify(destinations)}`);
  }
  await page.screenshot({ path: `${outputDir}/equipment-review-${name}.png` });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.equipment-destinations', { hidden: true });
  const replayAfter = await page.evaluate(() => document.querySelector('.activity-log')?.textContent ?? '');
  if (replayAfter !== replayBefore) throw new Error(`${name} pure equipment preview changed visible history`);

  await page.locator('.hero-dashboard-item-grid button:nth-child(2)').click();
  await page.waitForSelector('.hero-dashboard-detail');
  const itemText = await page.$eval('.hero-dashboard-detail', (dialog) => dialog.textContent ?? '');
  if (!itemText.includes('Waybread') || !itemText.includes('Adventure timing')
      || !itemText.includes('Use item…')) {
    throw new Error(`${name} item activation did not open adventure-use detail first`);
  }
  await page.screenshot({ path: `${outputDir}/item-detail-${name}.png` });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', (error) => { throw error; });
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 },
    { name: '390', width: 390, height: 844 }] as const) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await install(page, fixture());
    await audit(page, viewport.name);
    await page.screenshot({ path: `${outputDir}/dashboard-${viewport.name}.png` });
    await auditDetailJourney(page, viewport.name);
    await auditActionDetails(page, viewport.name);
  }
  console.log(`Hero dashboard review passed at 1440x1000 and 390x844; evidence: ${outputDir}`);
} finally {
  await browser.close();
}
