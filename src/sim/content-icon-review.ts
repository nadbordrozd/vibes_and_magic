import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { SKILL_IDS } from '../content/skills';
import { SPELL_IDS } from '../content/spells';
import { createGame } from '../core/game';
import type { GameState, SecondarySkillId } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/spell-skill-icons';
mkdirSync(output, { recursive: true });

function fixture(): GameState {
  const state = createGame({
    seed: 74646, mapId: 'grand-muster', difficulty: 'normal',
    p1: 'human', p2: 'dormant',
  });
  const hero = state.players.p1.hero!;
  hero.knownSpells = [...SPELL_IDS];
  hero.skills = Object.fromEntries(SKILL_IDS.map((id) => [id, 1])) as Partial<Record<SecondarySkillId, 1>>;
  hero.mana = Math.max(hero.mana, 30);
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

async function loadState(page: Page, state: GameState): Promise<void> {
  const persisted = actionSave(state);
  await page.evaluate(({ save, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
  }, { save: persisted, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  const primer = await page.$('.choice-dialog .primary');
  if (primer) {
    await primer.click();
    await page.waitForSelector('.choice-dialog', { hidden: true });
  }
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120_000);
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}?content-icons`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.content-icon-sheet img');
  const sheetAudit = await page.$$eval('.content-icon-sheet img', (images) => ({
    count: images.length,
    uniqueSources: new Set(images.map((image) => (image as HTMLImageElement).src)).size,
    unloaded: images.filter((image) => !(image as HTMLImageElement).complete
      || (image as HTMLImageElement).naturalWidth !== 32
      || (image as HTMLImageElement).naturalHeight !== 32).length,
    overflowing: images.filter((image) => {
      const box = image.getBoundingClientRect();
      return box.left < 0 || box.right > document.documentElement.clientWidth;
    }).length,
  }));
  if (sheetAudit.count !== 89 || sheetAudit.uniqueSources !== 89
      || sheetAudit.unloaded || sheetAudit.overflowing) {
    throw new Error(`Content icon sheet audit failed: ${JSON.stringify(sheetAudit)}`);
  }
  await page.screenshot({ path: `${output}/manifest-icon-sheet.png`, fullPage: true });

  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await loadState(page, fixture());
  await page.locator('.adventure-spell-button').click();
  await page.waitForSelector('.adventure-spellbook .spell-icon');
  const desktopAudit = await page.$$eval('.adventure-spellbook .spell-icon', (images) => ({
    count: images.length,
    bad: images.filter((image) => (image as HTMLImageElement).naturalWidth !== 32).length,
  }));
  if (desktopAudit.count < 1 || desktopAudit.bad) {
    throw new Error(`Desktop spellbook icon audit failed: ${JSON.stringify(desktopAudit)}`);
  }
  await page.screenshot({ path: `${output}/desktop-adventure-spellbook.png` });
  await page.locator('.adventure-spellbook button[aria-label="Close spellbook"]').click();

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.$$eval('.rail-commands button', (buttons) => {
    const button = buttons.find((candidate) => candidate.textContent?.trim() === 'Hero details');
    if (!(button instanceof HTMLButtonElement)) throw new Error('Hero details button missing');
    button.click();
  });
  await page.waitForSelector('.hero-details-dialog');
  await page.$$eval('.hero-details-tabs button', (buttons) => {
    const button = buttons.find((candidate) => candidate.textContent?.trim() === 'Special skills');
    if (!(button instanceof HTMLButtonElement)) throw new Error('Special skills tab missing');
    button.click();
  });
  await page.waitForSelector('.hero-details-skills .skill-icon');
  const narrowAudit = await page.evaluate(() => ({
    count: document.querySelectorAll('.hero-details-skills .skill-icon').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    dialogOverflow: (() => {
      const dialog = document.querySelector('.hero-details-dialog') as HTMLElement;
      return dialog.scrollWidth - dialog.clientWidth;
    })(),
  }));
  if (narrowAudit.count !== 21 || narrowAudit.overflow > 0 || narrowAudit.dialogOverflow > 0) {
    throw new Error(`Narrow skill icon audit failed: ${JSON.stringify(narrowAudit)}`);
  }
  await page.screenshot({ path: `${output}/narrow-hero-skills-390.png`, fullPage: true });
  console.log(`Content icon review passed: ${JSON.stringify({ sheetAudit, desktopAudit, narrowAudit })}`);
} finally {
  await browser.close();
}
