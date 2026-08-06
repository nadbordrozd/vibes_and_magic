import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createGame } from '../core/game';
import type { GameState } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/adventure-spells';
mkdirSync(output, { recursive: true });

function fixture(): GameState {
  const state = createGame({
    seed: 5102, mapId: 'grand-muster', difficulty: 'normal',
    p1: 'human', p2: 'dormant',
  });
  const hero = state.players.p1.hero!;
  hero.knownSpells = ['saltTheVein', 'fickleWeather', 'gate'];
  hero.mana = 100;
  hero.movement = 10_000;
  state.players.p1.explored = state.map.terrain.flatMap((row, y) =>
    row.map((_tile, x) => `${x},${y}`));
  const mine = state.map.objects.find((object) => object.kind === 'mine')!;
  if (mine.kind !== 'mine') throw new Error('Review fixture needs a mine');
  mine.owner = 'p2';
  state.replay = [];
  return state;
}

async function load(page: Page, state: GameState): Promise<void> {
  const persisted = actionSave(state);
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(({ save, initial }) => {
    localStorage.clear();
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
  }, { save: persisted, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) await page.locator('.choice-dialog .primary').click();
}

async function openSpell(page: Page, name: string): Promise<void> {
  const state = await page.$eval('.adventure-spell-button', (button) => ({
    disabled: (button as HTMLButtonElement).disabled,
    title: (button as HTMLButtonElement).title,
  }));
  if (state.disabled) throw new Error(`Adventure spellbook is disabled: ${state.title}`);
  await page.$eval('.adventure-spell-button', (button) => (button as HTMLButtonElement).click());
  await page.waitForSelector('.adventure-spellbook');
  await page.$$eval('.adventure-spellbook .spell-card', (cards, wanted) => {
    const card = cards.find((candidate) => candidate.textContent?.includes(wanted));
    const button = card?.querySelector<HTMLButtonElement>('button');
    if (!button || button.disabled) throw new Error(`${wanted} is not castable in the review fixture`);
    button.click();
  }, name);
  await page.waitForSelector('.adventure-spell-target, .map-cast-prompt');
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => { throw error; });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await load(page, fixture());
  await openSpell(page, 'Salt the Vein');
  const before = await page.$eval('.meter-label + .meter + .meter-label b', (node) => node.textContent);
  await page.screenshot({ path: `${output}/desktop-mine-choice.png`, fullPage: true });
  await page.locator('.adventure-spell-target fieldset button').click();
  await page.screenshot({ path: `${output}/desktop-mine-confirm.png`, fullPage: true });
  await page.$$eval('.adventure-spell-target .dialog-actions button', (buttons) => {
    const cancel = buttons.find((button) => button.textContent?.includes('Cancel')) as HTMLButtonElement;
    cancel.click();
  });
  await page.waitForSelector('.adventure-spell-target', { hidden: true });
  const afterCancel = await page.$eval('.meter-label + .meter + .meter-label b', (node) => node.textContent);
  if (afterCancel !== before) throw new Error('Cancelling an adventure spell changed mana');

  await page.setViewport({ width: 520, height: 820, deviceScaleFactor: 1 });
  await openSpell(page, 'Fickle Weather');
  await page.waitForSelector('.adventure-spell-target fieldset button');
  await page.locator('.adventure-spell-target fieldset button').click();
  await page.screenshot({ path: `${output}/narrow-omen-confirm.png`, fullPage: true });
  const dialogBounds = await page.$eval('.adventure-spell-target', (dialog) => {
    const box = dialog.getBoundingClientRect();
    const backdrop = dialog.parentElement!;
    const backdropBox = backdrop.getBoundingClientRect();
    return {
      left: box.left, right: box.right, width: box.width, viewport: window.innerWidth,
      boxSizing: getComputedStyle(dialog).boxSizing,
      backdrop: { left: backdropBox.left, right: backdropBox.right, width: backdropBox.width,
        padding: getComputedStyle(backdrop).padding, boxSizing: getComputedStyle(backdrop).boxSizing },
    };
  });
  if (dialogBounds.left < -2 || dialogBounds.right > dialogBounds.viewport + 2) {
    throw new Error(`Narrow spell target dialog is outside the viewport: ${JSON.stringify(dialogBounds)}`);
  }
  await page.$$eval('.adventure-spell-target .dialog-actions button', (buttons) => {
    const confirm = buttons.find((button) => button.textContent?.includes('Confirm')) as HTMLButtonElement;
    if (!confirm || confirm.disabled) throw new Error('Completed omen choice cannot be confirmed');
    confirm.click();
  });
  await page.waitForFunction(() =>
    (document.querySelector('.message-strip')?.textContent ?? '').includes('Fickle Weather'));

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await openSpell(page, 'Gate');
  const highlighted = await page.$$eval('.terrain-cell.spell-legal-target', (nodes) => nodes.length);
  if (highlighted < 2) throw new Error('Gate does not expose legal map targets');
  await page.screenshot({ path: `${output}/desktop-map-targets.png`, fullPage: true });
  console.log(`Adventure spell target review passed. Screenshots written to ${output}.`);
} finally {
  await browser.close();
}
