import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { ARTIFACTS, EQUIPMENT_SLOTS } from '../content/artifacts';
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

function fixture(mapId: 'grand-muster' | 'manywhere' = 'grand-muster'): GameState {
  const state = createGame({ seed: 5903, mapId, p1: 'human', p2: 'dormant' });
  const hero = state.players.p1.hero!;
  hero.skills = { logistics: 3, scouting: 3, attunement: 3, ritualist: 3,
    provisioner: 3, quartermaster: 1 };
  const unitIds = Object.keys(UNITS) as Array<keyof typeof UNITS>;
  hero.army = Array.from({ length: 8 }, (_, index) => ({ unitId: unitIds[index], count: index + 2 }));
  const equipped: Record<EquipmentSlotId, ArtifactId> = {
    head: 'leadenCrown', cloak: 'travelersCloak', amulet: 'goldenThread',
    weapon: 'tailorsNeedle', shield: 'yeomansBuckler', armor: 'quiltedCoat',
    ring1: 'tailorsThimble', ring2: 'ringOfTheSteadyHand', boots: 'cobblersPride',
    misc1: 'patternbook', misc2: 'mirrorMask', misc3: 'knucklebonesOfTheSaint',
  };
  for (const slot of EQUIPMENT_SLOTS) hero.artifacts.equipment[slot] = {
    id: equipped[slot], ...(equipped[slot] === 'seamstone' ? { chosenSchool: 'rite' as const } : {}),
  };
  hero.artifacts.backpack = [{ id: 'queensAmber' }, { id: 'quietHorseshoe' },
    { id: 'wayfarersMantle' }, { id: 'weathercockIllOmen' }, { id: 'lastToy' },
    { id: 'marchGlass' }, { id: 'seamstone' }];
  hero.inventory = [{ id: 'spellScroll', storedSpellId: 'rally', plus: false },
    { id: 'spellScroll', storedSpellId: 'ward', plus: true }, { id: 'waybread' },
    { id: 'potionOfVigor' }, { id: 'tradeGoods', origin: { x: 2, y: 3 } }, null, null, null];
  hero.adventureEffects.nextBattleMeterBonus = 10;
  hero.adventureEffects.nextBattleLuckBonus = 1;
  hero.debts = [{ id: 'review-day', name: 'Review at Dawn', description: 'Pay 500 gold.',
    trigger: { kind: 'day-start', dueDay: state.day + 1 }, handlerTag: 'review', remainingTriggers: 1 },
  { id: 'review-week', name: 'Review at Week', description: 'Deliver 2 timber.',
    trigger: { kind: 'week-start', dueWeek: state.week + 1 }, handlerTag: 'review', remainingTriggers: 1 }];
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

function splitFixture(): GameState {
  const state = fixture();
  state.players.p1.hero!.army[6] = null;
  state.replay = [];
  return state;
}

function emptyFixture(): GameState {
  const state = fixture();
  const hero = state.players.p1.hero!;
  hero.skills = {};
  hero.army = Array(7).fill(null);
  hero.artifacts.equipment.cloak = null;
  hero.artifacts.backpack = [{ id: 'wayfarersMantle' }];
  hero.inventory = Array(6).fill(null);
  hero.debts = [];
  state.replay = [];
  return state;
}

function longBackpackFixture(): GameState {
  const state = fixture();
  state.players.p1.hero!.artifacts.backpack = (Object.keys(ARTIFACTS) as ArtifactId[])
    .map((id) => ({ id, ...(id === 'seamstone' ? { chosenSchool: 'craft' as const } : {}) }));
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
    button.focus();
    button.click();
  });
  await page.waitForSelector('.hero-dashboard-dialog');
}

async function audit(
  page: Page, name: string, expectedBackpack = 7, expectedFallbacks = 0,
): Promise<void> {
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
    const outOfBounds = visibleButtons.filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left < 0 || rect.right > viewportWidth;
    }).map((button) => button.getAttribute('aria-label') ?? button.textContent?.trim());
    const unnamed = [...dialog.querySelectorAll<HTMLButtonElement>('button')].filter((button) => {
      const name = button.getAttribute('aria-label') ?? button.textContent?.trim();
      const unavailable = button.disabled || button.getAttribute('aria-disabled') === 'true';
      const reason = button.title || button.dataset.disabledReason || button.textContent?.includes('Unavailable');
      return !name || (unavailable && !reason);
    }).map((button) => button.outerHTML);
    const wrongIntrinsic = images.filter((image) => {
      if (!image.complete || image.naturalWidth === 0) return false;
      if (image.classList.contains('hero-dashboard-bitmap')) {
        return image.naturalWidth !== Number(image.getAttribute('width'))
          || image.naturalHeight !== Number(image.getAttribute('height'));
      }
      return ![32, 96, 128, 192, 256].includes(image.naturalWidth)
        || ![32, 96, 128].includes(image.naturalHeight);
    }).map((image) => ({ src: image.src, natural: [image.naturalWidth, image.naturalHeight] }));
    const transformedImages = images.filter((image) => getComputedStyle(image).transform !== 'none')
      .map((image) => image.src);
    const verticalScrollers = [...dialog.querySelectorAll<HTMLElement>('*')].filter((element) => {
      const style = getComputedStyle(element);
      return element.scrollHeight > element.clientHeight + 1
        && ['auto', 'scroll'].includes(style.overflowY);
    }).map((element) => element.className);
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
      backpack: dialog.querySelectorAll('.hero-dashboard-backpack-grid > button').length,
      items: dialog.querySelectorAll('.hero-dashboard-item-grid > *').length,
      headings: [...dialog.querySelectorAll('[data-dashboard-region] > h3')].map((heading) => heading.textContent?.trim()),
      failedImages, wrongIntrinsic, transformedImages, regionOverflow, outOfBounds, unnamed, undersized,
      verticalScrollers,
      fallbacks: dialog.querySelectorAll('[class*="fallback"]').length,
      closeFocused: document.activeElement?.getAttribute('aria-label') === 'Close hero dashboard',
      pageLocked: getComputedStyle(document.body).overflow === 'hidden',
    };
  });
  const expectedRegions = ['identity', 'primary-stats', 'vitals-status', 'army',
    'secondary-skills', 'equipped-artifacts', 'artifact-backpack', 'artifact-actions',
    'consumables', 'special-controls'];
  if (result.documentOverflow > 0 || result.bodyOverflow > 0 || result.tabs
      || result.army !== 8 || result.equipment !== 11 || result.backpack !== expectedBackpack || result.items !== 8
      || result.headings.length !== 10 || result.failedImages.length || result.wrongIntrinsic.length
      || result.transformedImages.length || result.fallbacks !== expectedFallbacks
      || result.regionOverflow.length
      || result.outOfBounds.length || result.unnamed.length || result.undersized.length
      || result.verticalScrollers.length !== 1 || !result.bodyScrolls || !result.closeFocused || !result.pageLocked
      || JSON.stringify(result.regions) !== JSON.stringify(expectedRegions)
      || result.dialog.left < 0 || result.dialog.right > result.viewportWidth
      || result.dialog.top < 0 || result.dialog.bottom > result.viewportHeight) {
    throw new Error(`${name} dashboard audit failed: ${JSON.stringify(result)}`);
  }
}

async function assertDetail(page: Page, selector: string, expected: string, activation:
  'click' | 'enter' | 'space' | 'tap' = 'click'): Promise<void> {
  if (activation === 'click') await page.locator(selector).click();
  else if (activation === 'tap') {
    await page.$eval(selector, (element) => element.scrollIntoView({ block: 'center' }));
    const rect = await page.$eval(selector, (element) => {
      const value = element.getBoundingClientRect();
      return { x: value.left + value.width / 2, y: value.top + value.height / 2 };
    });
    await page.touchscreen.tap(rect.x, rect.y);
  } else {
    await page.focus(selector);
    await page.keyboard.press(activation === 'enter' ? 'Enter' : 'Space');
  }
  await page.waitForSelector('.hero-dashboard-detail');
  const result = await page.evaluate((text) => {
    const dialog = document.querySelector<HTMLElement>('.hero-dashboard-detail')!;
    const close = dialog.querySelector<HTMLElement>('.hero-dashboard-detail-close');
    return {
      text: dialog.textContent ?? '', focused: document.activeElement === close,
      containsFocus: dialog.contains(document.activeElement),
    };
  }, expected);
  if (!result.text.includes(expected) || !result.focused || !result.containsFocus) {
    throw new Error(`Detail activation failed for ${selector}: ${JSON.stringify(result)}`);
  }
}

async function closeDetailAndAssertReturn(page: Page, selector: string): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
  await page.waitForFunction((target) => document.activeElement?.matches(target), {}, selector)
    .catch(() => undefined);
  const returned = await page.evaluate((target) => document.activeElement?.matches(target), selector);
  if (!returned || !await page.$('.hero-dashboard-dialog')) {
    throw new Error(`Detail Escape did not restore ${selector}`);
  }
}

async function auditDetailJourney(page: Page, name: string): Promise<void> {
  const saveBefore = await page.evaluate(() => localStorage.getItem('border-marches.save.v4'));
  await assertDetail(page, '.hero-dashboard-portrait-button', 'Corwin', 'click');
  const trap = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>('.hero-dashboard-detail')!;
    (dialog.querySelector('.hero-dashboard-detail-close') as HTMLElement).focus();
    return true;
  });
  if (!trap) throw new Error(`${name} detail focus trap setup failed`);
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  if (!await page.evaluate(() => document.querySelector('.hero-dashboard-detail')?.contains(document.activeElement))) {
    throw new Error(`${name} detail focus escaped backward`);
  }
  await page.screenshot({ path: `${outputDir}/detail-${name}.png` });
  await closeDetailAndAssertReturn(page, '.hero-dashboard-portrait-button');

  const journeys: Array<[string, string, 'click' | 'enter' | 'space', string?]> = [
    ['.hero-dashboard-specialty-button', 'Bright Rally', 'space'],
    ['.hero-dashboard-stat-grid button:first-child', 'Current effective value', 'enter', 'primary-detail'],
    ['.hero-dashboard-vital-grid button:first-child', 'Current movement', 'click'],
    ['.hero-dashboard-status-list button:first-child', 'Next battle morale', 'click'],
    ['.hero-dashboard-army-grid button:first-child', 'Tier / footprint', 'click', 'company-detail'],
    ['.hero-dashboard-skills button:first-child', 'Rank 1', 'enter', 'skill-detail'],
    ['.hero-dashboard-equipment-grid button:first-child', 'Removal condition', 'click'],
    ['.hero-dashboard-backpack-grid button:first-child', "Queen's Amber", 'click'],
    ['.hero-dashboard-item-grid button:first-child', 'Stored Spell Id', 'click'],
  ];
  for (const [selector, expected, activation, capture] of journeys) {
    await assertDetail(page, selector, expected, activation);
    if (capture) await page.screenshot({ path: `${outputDir}/${capture}-${name}.png` });
    await closeDetailAndAssertReturn(page, selector);
  }
  if (name === '390') {
    await assertDetail(page, '.hero-dashboard-vital-grid button:nth-child(2)', 'authoritative maximum', 'tap');
    await page.$eval('.hero-dashboard-nested-backdrop', (backdrop) => backdrop.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    ));
    await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
    if (!await page.evaluate(() => document.activeElement?.matches(
      '.hero-dashboard-vital-grid button:nth-child(2)',
    ))) throw new Error('Nested backdrop did not restore exact invoking focus');
  }
  const saveAfter = await page.evaluate(() => localStorage.getItem('border-marches.save.v4'));
  if (saveAfter !== saveBefore) throw new Error(`${name} pure detail journeys changed the save JSON`);
}

async function auditActionDetails(page: Page, name: string): Promise<void> {
  const saveBefore = await page.evaluate(() => localStorage.getItem('border-marches.save.v4'));
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
  const saveAfterPreview = await page.evaluate(() => localStorage.getItem('border-marches.save.v4'));
  if (saveAfterPreview !== saveBefore) throw new Error(`${name} pure equipment preview changed save JSON`);

  await page.locator('.hero-dashboard-item-grid button:nth-child(3)').click();
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

async function clickButtonText(page: Page, scope: string, text: string): Promise<void> {
  await page.$$eval(scope ? `${scope} button` : 'button', (buttons, wanted) => {
    const button = buttons.find((candidate) => candidate.textContent?.trim() === wanted)
      ?? buttons.find((candidate) => candidate.textContent?.includes(wanted));
    if (!button) throw new Error(`Button was not found: ${wanted}`);
    button.click();
  }, text);
}

async function auditEquipmentOutcomes(page: Page): Promise<void> {
  await page.locator('.hero-dashboard-backpack-grid button:first-child').click();
  await clickButtonText(page, '.hero-dashboard-detail', 'Equip…');
  await clickButtonText(page, '.equipment-destinations', 'Ring 1Replace The Thimble');
  await clickButtonText(page, '.hero-dashboard-detail', 'Confirm equip');
  await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
  const displaced = await page.evaluate(() => ({
    ring: document.querySelector('.hero-dashboard-equipment-grid button:nth-child(7)')?.textContent,
    backpack: document.querySelector('.hero-dashboard-backpack-grid')?.textContent,
  }));
  if (!displaced.ring?.includes("Queen's Amber") || !displaced.backpack?.includes('The Thimble')) {
    throw new Error(`Confirmed displacement failed: ${JSON.stringify(displaced)}`);
  }

  await page.locator('.hero-dashboard-equipment-grid button:nth-child(2)').click();
  await clickButtonText(page, '.hero-dashboard-detail', 'Unequip to backpack…');
  const preview = await page.$eval('.hero-dashboard-detail', (dialog) => dialog.textContent ?? '');
  if (!preview.includes('moves to backpack position')) throw new Error('Unequip preview is incomplete');
  await clickButtonText(page, '.hero-dashboard-detail', 'Confirm unequip');
  if (!await page.$eval('.hero-dashboard-equipment-grid button:nth-child(2)', (button) =>
    button.textContent?.includes('Empty'))) throw new Error('Confirmed unequip did not empty Cloak');

  await page.locator('.hero-dashboard-equipment-grid button:first-child').click();
  const burden = await page.evaluate(() => {
    const action = [...document.querySelectorAll<HTMLButtonElement>('.hero-dashboard-detail button')]
      .find((button) => button.textContent?.includes('Unequip to backpack'));
    return { disabled: action?.disabled, reason: action?.dataset.disabledReason, text: document.querySelector(
      '.hero-dashboard-detail',
    )?.textContent };
  });
  if (!burden.disabled || !burden.reason?.includes('Visit any shrine')
      || !burden.text?.includes('Removal condition')) throw new Error(`Burden audit failed: ${JSON.stringify(burden)}`);
  await page.keyboard.press('Escape');

  await page.$$eval('.hero-dashboard-backpack-grid button', (buttons) => {
    const seamstone = buttons.find((button) => button.textContent?.includes('Seamstone'));
    if (!seamstone) throw new Error('Backpack Seamstone not found');
    seamstone.click();
  });
  await clickButtonText(page, '.hero-dashboard-detail', 'Equip…');
  await clickButtonText(page, '.equipment-destinations', 'AmuletReplace The Golden Thread');
  const confirmDisabled = await page.$eval('.hero-dashboard-detail button.primary', (button) =>
    (button as HTMLButtonElement).disabled);
  if (!confirmDisabled) throw new Error('Seamstone allowed confirmation without explicit school');
  await clickButtonText(page, '.resonance-choice', 'wild');
  await clickButtonText(page, '.hero-dashboard-detail', 'Confirm equip');
  await page.locator('.hero-dashboard-equipment-grid button:nth-child(3)').click();
  if (!await page.$eval('.hero-dashboard-detail', (dialog) => dialog.textContent?.includes('Chosen school · Wild'))) {
    throw new Error('Seamstone chosen school was not retained after equip');
  }
  await page.keyboard.press('Escape');

  await page.locator('.structure-dialog-close').click();
  await page.waitForSelector('.hero-dashboard-dialog', { hidden: true });
  await clickButtonText(page, '', 'Menu & saves');
  await clickButtonText(page, '.command-menu-dialog', 'Quick save');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('border-marches.save.v4') ?? 'null') as {
    actionLog: Array<{ type: string }>; [key: string]: unknown;
  });
  const actionTypes = saved.actionLog.slice(-3).map((action) => action.type);
  if (JSON.stringify(Object.keys(saved).sort()) !== JSON.stringify(
    ['actionLog', 'contentHash', 'difficulty', 'mapId', 'seed'],
  ) || JSON.stringify(actionTypes) !== JSON.stringify(
    ['EQUIP_ARTIFACT', 'UNEQUIP_ARTIFACT', 'EQUIP_ARTIFACT'],
  )) throw new Error(`Dashboard action save JSON failed: ${JSON.stringify({ actionTypes, keys: Object.keys(saved) })}`);
}

async function auditSplit(page: Page, name: string): Promise<void> {
  await page.locator('.hero-dashboard-army-grid button:first-child').click();
  await clickButtonText(page, '.hero-dashboard-detail', 'Split company…');
  await page.screenshot({ path: `${outputDir}/split-review-${name}.png` });
  await clickButtonText(page, '.split-destinations', 'Empty slot 7');
  await clickButtonText(page, '.hero-dashboard-detail', 'Confirm split');
  const result = await page.evaluate(() => ({
    source: document.querySelector('.hero-dashboard-army-grid > :first-child')?.textContent,
    destination: document.querySelector('.hero-dashboard-army-grid > :nth-child(7)')?.textContent,
  }));
  if (!result.source || !result.destination || result.destination.includes('Empty')) {
    throw new Error(`Split outcome failed: ${JSON.stringify(result)}`);
  }
}

async function auditItemAndSpecialHandoffs(page: Page): Promise<void> {
  for (const [needle, timing] of [['Potion of Vigor', 'Combat timing'], ['Trade Goods', 'Automatic timing']]) {
    await page.$$eval('.hero-dashboard-item-grid button', (buttons, value) => {
      const button = buttons.find((candidate) => candidate.textContent?.includes(value));
      if (!button) throw new Error(`Item was not found: ${value}`);
      button.click();
    }, needle);
    const inspection = await page.$eval('.hero-dashboard-detail', (dialog) => ({
      text: dialog.textContent ?? '', use: [...dialog.querySelectorAll('button')]
        .some((button) => button.textContent?.includes('Use item')),
    }));
    if (!inspection.text.includes(timing) || inspection.use) {
      throw new Error(`${needle} incorrectly exposed adventure use: ${JSON.stringify(inspection)}`);
    }
    await page.keyboard.press('Escape');
  }
  await page.$$eval('.hero-dashboard-item-grid button', (buttons) => {
    const button = buttons.find((candidate) => candidate.textContent?.includes('Waybread'));
    if (!button) throw new Error('Waybread was not found');
    button.click();
  });
  await clickButtonText(page, '.hero-dashboard-detail', 'Use item…');
  await page.waitForSelector('.action-confirm-dialog');
  if (await page.$('.hero-dashboard-dialog')) throw new Error('Adventure item Use did not hand off from dashboard');
  await clickButtonText(page, '.action-confirm-dialog', 'Cancel · change nothing');

  await page.$$eval('button', (buttons) => {
    const button = buttons.find((candidate) => candidate.textContent?.trim() === 'Hero details');
    if (!button) throw new Error('Hero details entry was not found');
    button.focus(); button.click();
  });
  await clickButtonText(page, '.hero-dashboard-special', 'Open adventure spellbook');
  await page.waitForSelector('.adventure-spellbook');
  if (await page.$('.hero-dashboard-dialog')) throw new Error('Spellbook did not hand off from dashboard');
  await page.locator('.spellbook-close').click();

  await page.$$eval('button', (buttons) => {
    const button = buttons.find((candidate) => candidate.textContent?.trim() === 'Hero details');
    if (!button) throw new Error('Hero details entry was not found');
    button.focus(); button.click();
  });
  await clickButtonText(page, '.hero-dashboard-special', 'Unstitch to an explored tile');
  await page.waitForSelector('.map-cast-prompt');
  if (!await page.$eval('.map-cast-prompt', (prompt) => prompt.textContent?.includes('Unstitching the road'))) {
    throw new Error('Unstitch did not hand off to map targeting');
  }
}

async function auditDirectSpecialControls(page: Page): Promise<void> {
  await clickButtonText(page, '.resonance-picker', 'craft');
  if (!await page.$eval('.hero-dashboard-status-list', (list) => list.textContent?.includes(
    'Craft resonance declared',
  ))) throw new Error('Attunement resonance did not dispatch through the reducer');
  await clickButtonText(page, '.omen-preview', 'Plenty');
  const omen = await page.evaluate(() => ({
    text: document.querySelector('.omen-preview')?.textContent,
    unavailable: [...document.querySelectorAll<HTMLButtonElement>('.omen-preview button')]
      .every((button) => button.disabled && Boolean(button.dataset.disabledReason)),
  }));
  if (!omen.text?.includes('Plenty') || !omen.unavailable) {
    throw new Error(`Ritualist choice outcome failed: ${JSON.stringify(omen)}`);
  }
}

async function auditCacheControl(page: Page): Promise<void> {
  const text = await page.$eval('.cache-sketch', (article) => article.textContent ?? '');
  if (!text.includes('Patient Stone sketch') || !text.includes('fragments') || !text.includes('Dig here')) {
    throw new Error(`Cache control is incomplete: ${text}`);
  }
  await clickButtonText(page, '.cache-sketch', 'Dig here · spend all movement');
  const outcome = await page.evaluate(() => ({
    movement: document.querySelector('.hero-dashboard-vital-grid button:first-child')?.textContent,
    message: document.querySelector('.message-strip')?.textContent,
  }));
  if (!outcome.movement?.includes('0 /') || !outcome.message?.includes('Dry earth')) {
    throw new Error(`Dig reducer outcome failed: ${JSON.stringify(outcome)}`);
  }
}

async function auditEmptyDashboard(page: Page, name: string): Promise<void> {
  const result = await page.evaluate(() => ({
    tabs: document.querySelectorAll('.hero-details-tabs, [role="tab"]').length,
    army: document.querySelectorAll('.hero-dashboard-army-grid > *').length,
    armyButtons: document.querySelectorAll('.hero-dashboard-army-grid > button').length,
    skills: document.querySelector('.hero-dashboard-skills')?.textContent,
    equipment: document.querySelectorAll('.hero-dashboard-equipment-grid > button').length,
    items: document.querySelectorAll('.hero-dashboard-item-grid > *').length,
    itemButtons: document.querySelectorAll('.hero-dashboard-item-grid > button').length,
  }));
  if (result.tabs || result.army !== 7 || result.armyButtons || result.equipment !== 11
      || result.items !== 6 || result.itemButtons || !result.skills?.includes('No secondary skills learned')) {
    throw new Error(`${name} empty dashboard audit failed: ${JSON.stringify(result)}`);
  }
  await page.locator('.hero-dashboard-equipment-grid button:nth-child(2)').click();
  const detail = await page.$eval('.hero-dashboard-detail', (dialog) => dialog.textContent ?? '');
  if (!detail.includes('accepts cloak artifacts') || !detail.includes("Equip Wayfarer's Mantle")) {
    throw new Error(`${name} empty equipment detail failed: ${detail}`);
  }
  await page.screenshot({ path: `${outputDir}/empty-detail-${name}.png` });
  await page.keyboard.press('Escape');
}

async function auditOuterClose(page: Page, method: 'escape' | 'backdrop'): Promise<void> {
  if (method === 'escape') {
    await page.locator('.hero-dashboard-portrait-button').click();
    await page.keyboard.press('Escape');
    await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
    await page.keyboard.press('Escape');
  } else {
    await page.$eval('.hero-details-backdrop', (backdrop) => backdrop.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    ));
  }
  await page.waitForSelector('.hero-dashboard-dialog', { hidden: true });
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Hero details',
    { timeout: 2_000 }).catch(() => undefined);
  const focus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  if (focus !== 'Hero details') throw new Error(`${method} did not restore the original map control: ${focus}`);
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', (error) => { throw error; });
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 },
    { name: '390', width: 390, height: 844 }] as const) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1,
      hasTouch: viewport.name === '390', isMobile: viewport.name === '390' });
    await install(page, fixture());
    await audit(page, viewport.name);
    await page.screenshot({ path: `${outputDir}/dashboard-${viewport.name}.png` });
    await auditDetailJourney(page, viewport.name);
    await auditActionDetails(page, viewport.name);
    await page.$eval('.hero-dashboard-special', (region) => region.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${outputDir}/special-controls-${viewport.name}.png` });

    await install(page, emptyFixture());
    await auditEmptyDashboard(page, viewport.name);
    await page.screenshot({ path: `${outputDir}/empty-dashboard-${viewport.name}.png` });

    await install(page, longBackpackFixture());
    await audit(page, `${viewport.name} long backpack`, Object.keys(ARTIFACTS).length, 0);
    await page.$eval('.hero-dashboard-backpack', (region) => region.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${outputDir}/long-backpack-${viewport.name}.png` });

    await install(page, splitFixture());
    await auditSplit(page, viewport.name);
  }
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await install(page, fixture());
  await auditEquipmentOutcomes(page);

  await install(page, fixture());
  await auditDirectSpecialControls(page);

  await install(page, fixture('manywhere'));
  await auditCacheControl(page);

  await install(page, fixture());
  await auditItemAndSpecialHandoffs(page);

  await install(page, fixture());
  await auditOuterClose(page, 'escape');
  await install(page, fixture());
  await auditOuterClose(page, 'backdrop');
  console.log(`Hero dashboard review passed at 1440x1000 and 390x844; evidence: ${outputDir}`);
} finally {
  await browser.close();
}
