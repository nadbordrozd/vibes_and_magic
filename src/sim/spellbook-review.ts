import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { SPELL_IDS } from '../content/spells';
import { makeArmy } from '../core/army';
import { createBattle } from '../core/combat/battle';
import { createGame } from '../core/game';
import type { GameState } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.argv[2] ?? process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const outputDir = '.pixel-work/review/spellbook';
mkdirSync(outputDir, { recursive: true });
console.log(`Spellbook browser review starting at ${baseUrl}`);

function adventureFixture(): GameState {
  const state = createGame({ seed: 1510, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
  const hero = state.players.p1.hero!;
  hero.knownSpells = [...SPELL_IDS];
  hero.upgradedSpells = ['beacon'];
  hero.knowledge = 3;
  hero.mana = 30;
  hero.movement = 1_400;
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

function combatFixture(): GameState {
  const state = createGame({ seed: 1511, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
  const attacker = state.players.p1.hero!;
  const defender = structuredClone(state.players.p2.hero!);
  defender.owner = 'p2';
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 12 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 12 }]),
    attacker, defender, {
      kind: 'hero', targetId: defender.id, destination: { x: 18, y: 18 },
      attackerHeroId: attacker.id, defenderHeroId: defender.id,
      defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.currentStackId = 'attacker-0';
  battle.attackerHero.knownSpells = [...SPELL_IDS];
  battle.attackerHero.upgradedSpells = ['rally'];
  battle.attackerHero.mana = 3;
  battle.resonance = 'craft';
  state.battle = battle;
  state.phase = 'combat';
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

async function install(page: Page, state: GameState, surface: '.combat-shell' | '.adventure-map') {
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  const save = actionSave(state);
  await page.evaluate(({ payload, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(payload));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({
      savedAt: 1, day: initial.day, week: initial.week, activePlayer: initial.activePlayer,
    }));
  }, { payload: save, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector(surface);
  if (surface === '.adventure-map') {
    const primer = await page.$('.objective-primer');
    if (primer) {
      await page.locator('.choice-dialog .primary').click();
      await page.waitForSelector('.choice-dialog', { hidden: true });
    }
  }
}

async function auditBook(page: Page, detail: boolean) {
  return page.evaluate((detailExpected) => {
    const viewport = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const book = document.querySelector<HTMLElement>('.stitched-spellbook')!;
    const pages = document.querySelector<HTMLElement>('.spellbook-pages')!;
    const close = document.querySelector<HTMLElement>('.spellbook-close')!;
    const rect = book.getBoundingClientRect();
    const closeRect = close.getBoundingClientRect();
    const icons = [...document.querySelectorAll<HTMLElement>('.spell-grid-art .content-icon')]
      .filter((icon) => icon.getBoundingClientRect().width > 0);
    const cast = document.querySelector<HTMLElement>('[data-cast-spell-id]');
    const castRect = cast?.getBoundingClientRect();
    const back = document.querySelector<HTMLElement>('.spellbook-detail-actions button:first-child');
    const backRect = back?.getBoundingClientRect();
    const visibleToggles = [...document.querySelectorAll<HTMLElement>('.help-toggle, .inspect-toggle')]
      .filter((toggle) => {
        const style = getComputedStyle(toggle);
        const toggleRect = toggle.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden'
          && toggleRect.width > 0 && toggleRect.height > 0;
      });
    const actionRects = [closeRect, ...(detailExpected && backRect && castRect ? [backRect, castRect] : [])];
    const toggleIntersections = visibleToggles.flatMap((toggle) => {
      const toggleRect = toggle.getBoundingClientRect();
      return actionRects.filter((actionRect) => actionRect.left < toggleRect.right
        && actionRect.right > toggleRect.left && actionRect.top < toggleRect.bottom
        && actionRect.bottom > toggleRect.top);
    }).length;
    return {
      pageOverflow: document.documentElement.scrollWidth - viewport,
      bookOverflow: pages.scrollWidth - pages.clientWidth,
      viewport,
      bookBounds: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      closeVisible: closeRect.width > 0 && closeRect.height > 0
        && closeRect.left >= 0 && closeRect.right <= viewport
        && closeRect.top >= 0 && closeRect.bottom <= viewportHeight,
      minIcon: icons.length ? Math.min(...icons.map((icon) => icon.getBoundingClientRect().width)) : 64,
      backVisible: !detailExpected || Boolean(backRect
        && backRect.width > 0 && backRect.height > 0
        && backRect.left >= 0 && backRect.right <= viewport
        && backRect.top >= 0 && backRect.bottom <= viewportHeight),
      castVisible: !detailExpected || Boolean(castRect
        && castRect.width > 0 && castRect.height > 0
        && castRect.left >= 0 && castRect.right <= viewport
        && castRect.top >= 0 && castRect.bottom <= viewportHeight),
      visibleToggleCount: visibleToggles.length,
      toggleIntersections,
      detailOpen: book.dataset.detailOpen === String(detailExpected),
    };
  }, detail);
}

function assertAudit(label: string, audit: Awaited<ReturnType<typeof auditBook>>) {
  if (audit.pageOverflow > 0 || audit.bookOverflow > 0 || !audit.closeVisible
      || audit.minIcon < 63 || !audit.backVisible || !audit.castVisible || !audit.detailOpen
      || audit.visibleToggleCount !== 0 || audit.toggleIntersections !== 0
      || audit.bookBounds.left < 0 || audit.bookBounds.right > audit.viewport) {
    throw new Error(`${label} spellbook audit failed: ${JSON.stringify(audit)}`);
  }
}

function manaFromVitals(text: string | null): number {
  const mana = text?.match(/Mana\s*(\d+)\//)?.[1];
  if (mana === undefined) throw new Error(`Could not read mana from spellbook vitals: ${text}`);
  return Number(mana);
}

async function openAdventureBook(page: Page) {
  const status = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.adventure-spell-button')];
    const button = buttons[0];
    const rect = button?.getBoundingClientRect();
    return {
      buttonCount: buttons.length,
      disabled: button?.disabled ?? null,
      title: button?.title ?? null,
      text: button?.textContent?.trim() ?? null,
      visible: Boolean(rect && rect.width > 0 && rect.height > 0),
      hero: document.querySelector('.rail-hero-summary .hero-portrait')?.textContent?.trim() ?? null,
      primerOpen: Boolean(document.querySelector('.objective-primer')),
      choiceDialog: document.querySelector('.choice-dialog h2')?.textContent?.trim() ?? null,
      modalCount: document.querySelectorAll('.modal-backdrop').length,
    };
  });
  console.log(`Adventure spellbook entry status: ${JSON.stringify(status)}`);
  if (status.buttonCount !== 1 || status.disabled || !status.visible
      || status.title !== 'Open this hero’s map spells.' || status.primerOpen
      || status.choiceDialog || status.modalCount) {
    await page.screenshot({ path: `${outputDir}/failure-adventure-entry.png`, fullPage: true });
    throw new Error(`Adventure spellbook entry is blocked: ${JSON.stringify(status)}`);
  }
  await page.locator('.adventure-spell-button').click();
  try {
    await page.waitForSelector('.adventure-spellbook.stitched-spellbook', { timeout: 5_000 });
  } catch (error) {
    const blocked = await page.evaluate(() => ({
      spellbookCount: document.querySelectorAll('.stitched-spellbook').length,
      buttonDisabled: document.querySelector<HTMLButtonElement>('.adventure-spell-button')?.disabled,
      buttonTitle: document.querySelector<HTMLButtonElement>('.adventure-spell-button')?.title,
      activeElement: document.activeElement?.textContent?.trim(),
      dialogs: [...document.querySelectorAll('[role="dialog"]')]
        .map((dialog) => dialog.textContent?.trim().slice(0, 180)),
      bodyClasses: document.body.className,
    }));
    console.error(`Adventure spellbook did not open: ${JSON.stringify(blocked)}`);
    await page.screenshot({ path: `${outputDir}/failure-adventure-open.png`, fullPage: true });
    throw error;
  }
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', (error) => console.error(`browser page error: ${String(error)}`));

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: '390', width: 390, height: 844 },
  ] as const) {
    console.log(`Reviewing spellbooks at ${viewport.name}`);
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await install(page, adventureFixture(), '.adventure-map');
    await openAdventureBook(page);
    assertAudit(`adventure list ${viewport.name}`, await auditBook(page, false));
    await page.screenshot({ path: `${outputDir}/adventure-list-${viewport.name}.png` });
    console.log(`Captured adventure list at ${viewport.name}`);
    const manaBeforeAdventureSelection = await page.$eval('.spellbook-vitals', (node) => node.textContent);
    await page.locator('[data-spell-id="beacon"]').click();
    await page.waitForSelector('[data-cast-spell-id="beacon"]');
    const manaAfterAdventureSelection = await page.$eval('.spellbook-vitals', (node) => node.textContent);
    if (manaBeforeAdventureSelection !== manaAfterAdventureSelection) {
      throw new Error('Adventure spell selection spent resources');
    }
    assertAudit(`adventure detail ${viewport.name}`, await auditBook(page, true));
    await page.screenshot({ path: `${outputDir}/adventure-upgraded-detail-${viewport.name}.png` });
    await page.locator('[data-cast-spell-id="beacon"]').click();
    await page.waitForSelector('.adventure-spell-target');
    if (await page.$('.stitched-spellbook')) {
      throw new Error('Adventure Cast did not leave selection for the explicit confirmation step');
    }
    const cityOptions = await page.$$eval('.adventure-spell-target select option', (options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
    if (cityOptions.length < 2) throw new Error('Upgraded Beacon did not offer friendly-city targets');
    await page.select('.adventure-spell-target select', cityOptions[cityOptions.length - 1]);
    await page.waitForFunction(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '.adventure-spell-target .dialog-actions .primary',
      );
      return Boolean(button && !button.disabled);
    });
    await page.screenshot({ path: `${outputDir}/adventure-cast-confirm-${viewport.name}.png` });
    await page.locator('.adventure-spell-target .dialog-actions .primary').click();
    await page.waitForSelector('.adventure-spell-target', { hidden: true });
    await openAdventureBook(page);
    const manaAfterAdventureCast = await page.$eval('.spellbook-vitals', (node) => node.textContent);
    if (manaFromVitals(manaAfterAdventureCast) >= manaFromVitals(manaBeforeAdventureSelection)) {
      throw new Error(`Confirmed adventure Cast did not spend mana: ${manaAfterAdventureCast}`);
    }
    await page.locator('.spellbook-close').click();
    await page.waitForSelector('.stitched-spellbook', { hidden: true });

    await install(page, combatFixture(), '.combat-shell');
    await page.locator('.spellbook-button').click();
    await page.waitForSelector('.stitched-spellbook');
    assertAudit(`combat list ${viewport.name}`, await auditBook(page, false));
    await page.screenshot({ path: `${outputDir}/combat-list-${viewport.name}.png` });
    await page.locator('[role="tab"].craft').click();
    const manaBeforeCombatSelection = await page.$eval('.spellbook-vitals', (node) => node.textContent);
    await page.locator('[data-spell-id="forgeSpark"]').click();
    await page.waitForSelector('[data-cast-spell-id="forgeSpark"]');
    const manaAfterCombatSelection = await page.$eval('.spellbook-vitals', (node) => node.textContent);
    if (manaBeforeCombatSelection !== manaAfterCombatSelection) {
      throw new Error('Combat spell selection spent resources');
    }
    assertAudit(`combat detail ${viewport.name}`, await auditBook(page, true));
    await page.screenshot({ path: `${outputDir}/combat-temporary-detail-${viewport.name}.png` });
    await page.locator('[data-cast-spell-id="forgeSpark"]').click();
    await page.waitForSelector('.combat-targeting-banner');
    if (await page.$('.stitched-spellbook')) {
      throw new Error('Combat Cast did not leave selection for explicit targeting');
    }
    const targetingStage = await page.$eval('.combat-targeting-banner', (banner) =>
      banner.getAttribute('data-target-stage'));
    if (targetingStage === 'targetId') {
      const target = await page.$('.battle-hex.target-choice');
      if (!target) throw new Error('Forge Spark targeting offered no legal stack');
      await target.click();
    } else if (targetingStage !== 'confirm') {
      throw new Error(`Unexpected Forge Spark targeting stage: ${targetingStage}`);
    }
    await page.waitForFunction(() => {
      const confirm = document.querySelector<HTMLButtonElement>('.combat-targeting-banner .confirm-target');
      return Boolean(confirm && !confirm.disabled);
    });
    await page.screenshot({ path: `${outputDir}/combat-cast-confirm-${viewport.name}.png` });
    await page.locator('.combat-targeting-banner .confirm-target').click();
    await page.waitForSelector('.combat-targeting-banner', { hidden: true });
    const combatManaAfter = await page.$eval('.spellbook-button', (button) => button.textContent ?? '');
    if (Number(combatManaAfter.match(/(\d+)\s*$/)?.[1])
        >= manaFromVitals(manaBeforeCombatSelection)) {
      throw new Error(`Confirmed combat Cast did not spend mana: ${combatManaAfter}`);
    }
  }
  console.log('Spellbook browser review passed: 12 screenshots; desktop and 390px list/detail/confirmed-Cast audits clean.');
} finally {
  await browser.close();
}
