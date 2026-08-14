import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { SPELLS } from '../content/spells';
import { createGame } from '../core/game';
import { build } from '../core/game/economy';
import type { BuildingId, GameState } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.argv[2] ?? process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/mage-guild-reveal';
mkdirSync(output, { recursive: true });

function fixture(buildingId: 'mageGuild4' | 'mageGuild5'): GameState {
  const state = createGame({ seed: buildingId === 'mageGuild4' ? 6018 : 6019,
    p1: 'human', p2: 'dormant' });
  state.players.p1.resources = { gold: 100_000, timber: 100, iron: 100, essence: 100 };
  const path: BuildingId[] = buildingId === 'mageGuild4'
    ? ['mageGuild1', 'mageGuild2', 'mageGuild3', 'townHall', 'mageGuild4']
    : ['mageGuild1', 'mageGuild2', 'mageGuild3', 'townHall', 'mageGuild4',
      'cityHall', 'mageGuild5'];
  for (const id of path) {
    state.castles[0].builtOnDay = null;
    build(state, state.castles[0].id, id);
    if (id === 'mageGuild4' && buildingId === 'mageGuild5') state.guildReveal = null;
  }
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

async function install(page: Page, state: GameState): Promise<void> {
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(({ persisted, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(persisted));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({
      savedAt: 1, day: initial.day, week: initial.week, activePlayer: initial.activePlayer,
    }));
  }, { persisted: actionSave(state), initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) {
    await page.locator('.choice-dialog .primary').click();
    await page.waitForSelector('.objective-primer', { hidden: true });
  }
  await page.locator('.town-list button').click();
  await page.waitForSelector('.guild-reveal-dialog');
}

async function audit(page: Page, state: GameState, label: string): Promise<void> {
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>(
    '.guild-reveal-dialog img',
  )].every((image) => image.complete));
  const expectedNames = state.guildReveal!.spellIds.map((id) => SPELLS[id].name);
  const result = await page.evaluate(() => {
    const viewport = { width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight };
    const dialog = document.querySelector<HTMLElement>('.guild-reveal-dialog')!;
    const rect = dialog.getBoundingClientRect();
    const button = dialog.querySelector<HTMLButtonElement>('.dialog-actions button')!;
    const buttonRect = button.getBoundingClientRect();
    const images = [...dialog.querySelectorAll<HTMLImageElement>('img')];
    return {
      viewport,
      bounds: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      pageOverflow: document.documentElement.scrollWidth - viewport.width,
      dialogOverflow: dialog.scrollWidth - dialog.clientWidth,
      names: [...dialog.querySelectorAll('article > b')].map((node) => node.textContent?.trim()),
      structuredRules: dialog.querySelectorAll('.spell-rule-text').length,
      imageCount: dialog.querySelectorAll('article > .content-icon').length,
      failedImages: images.filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.src),
      focused: document.activeElement === button,
      buttonSize: { width: buttonRect.width, height: buttonRect.height },
      modal: dialog.getAttribute('aria-modal'),
      underlyingInert: document.querySelector('.castle-screen')?.hasAttribute('inert'),
      underlyingHidden: document.querySelector('.castle-screen')?.getAttribute('aria-hidden'),
    };
  });
  if (JSON.stringify(result.names) !== JSON.stringify(expectedNames)
      || result.structuredRules !== expectedNames.length || result.imageCount !== expectedNames.length
      || result.failedImages.length || !result.focused || result.modal !== 'true'
      || !result.underlyingInert || result.underlyingHidden !== 'true'
      || result.pageOverflow > 1 || result.dialogOverflow > 1
      || result.bounds.left < 0 || result.bounds.right > result.viewport.width
      || result.bounds.top < 0 || result.bounds.bottom > result.viewport.height
      || result.buttonSize.width < 44 || result.buttonSize.height < 44) {
    throw new Error(`${label} audit failed: ${JSON.stringify(result)}`);
  }
  console.log(`${label}: ${JSON.stringify(result)}`);
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  for (const buildingId of ['mageGuild4', 'mageGuild5'] as const) {
    const state = fixture(buildingId);
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await install(page, state);
    await audit(page, state, `${buildingId}-desktop`);
    await page.screenshot({ path: `${output}/${buildingId}-desktop.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForSelector('.guild-reveal-dialog', { hidden: true });

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await install(page, state);
    await audit(page, state, `${buildingId}-390`);
    await page.screenshot({ path: `${output}/${buildingId}-390.png`, fullPage: true });
    const point = await page.$eval('.guild-reveal-dialog .dialog-actions button', (button) => {
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    await page.touchscreen.tap(point.x, point.y);
    await page.waitForSelector('.guild-reveal-dialog', { hidden: true });
  }
  console.log('Mage Guild reveal review passed: MG4/MG5 named structured cards, native icons, '
    + 'autofocus, inert background, Escape, touch dismissal, desktop and 390px bounds.');
} finally {
  await browser.close();
}
