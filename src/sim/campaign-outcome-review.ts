import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createGame } from '../core/game';
import type { GameState, MapId } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/campaign-outcomes';
mkdirSync(output, { recursive: true });

function terminalFixture(mapId: MapId, winner: 'p1' | 'p2' = 'p1'): GameState {
  const state = createGame({
    seed: 4302, mapId, difficulty: 'normal', p1: 'human', p2: 'ai', playerCount: 2,
  });
  state.winner = winner;
  state.phase = 'gameOver';
  state.pendingChoice = null;
  state.day = 19;
  state.metrics.battles = 7;
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
  await page.waitForSelector('.victory-dialog');
}

async function assertOutcome(page: Page, expected: string[], forbidden: string[] = []): Promise<void> {
  const audit = await page.evaluate(() => ({
    copy: document.querySelector('.victory-dialog')?.textContent ?? '',
    outcomeOverflow: (() => {
      const dialog = document.querySelector<HTMLElement>('.victory-dialog');
      return dialog ? dialog.scrollWidth - dialog.clientWidth : -1;
    })(),
    help: Boolean(document.querySelector('.help-toggle')),
    returnAction: [...document.querySelectorAll('button')]
      .some((button) => button.textContent?.includes('Return to title')),
  }));
  for (const text of expected) {
    if (!audit.copy.includes(text)) throw new Error(`Outcome is missing ${text}: ${audit.copy}`);
  }
  for (const text of forbidden) {
    if (audit.copy.includes(text)) throw new Error(`Outcome leaked ${text}: ${audit.copy}`);
  }
  if (audit.outcomeOverflow > 2 || !audit.help || !audit.returnAction) {
    throw new Error(`Terminal controls/layout failed: ${JSON.stringify(audit)}`);
  }
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  await loadState(page, terminalFixture('border-marches'));
  await assertOutcome(page, ['Border Marches · Conquest', 'Player 1 is victorious',
    'Defeat all opposing players.', 'Final campaign record']);
  await page.screenshot({ path: `${output}/01-border-marches-victory-desktop.png` });

  await loadState(page, terminalFixture('border-marches', 'p2'));
  await assertOutcome(page, ['Campaign defeat', 'WinnerPlayer 2', 'Defeated commanderPlayer 1']);
  await page.screenshot({ path: `${output}/02-border-marches-defeat-desktop.png` });

  await loadState(page, terminalFixture('crosstitch-kit'));
  await assertOutcome(page, ['Crosstitch: The Kit · Artifact assembly',
    'authored artifact-assembly objective', "Tailor's Needle"], ['Border Marches answer']);
  await page.screenshot({ path: `${output}/03-kit-assembly-desktop.png` });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await loadState(page, terminalFixture('grand-muster'));
  await assertOutcome(page, ['The Grand Muster · Expedition retired', 'The Muster retires',
    'Showcase sandbox: fight, explore, build, and retire when finished.'], ['rival banner falls']);
  await page.screenshot({ path: `${output}/04-grand-muster-retirement-narrow.png`, fullPage: true });

  await page.locator('.help-toggle').click();
  await page.waitForSelector('.help-dialog');
  const helpCopy = await page.$eval('.help-dialog', (node) => node.textContent ?? '');
  if (!helpCopy.includes('Campaign outcome') || !helpCopy.includes('Current objective')
      || !helpCopy.includes('Showcase sandbox')) {
    throw new Error(`Terminal help is incomplete: ${helpCopy}`);
  }
  await page.screenshot({ path: `${output}/05-terminal-help-narrow.png`, fullPage: true });
  await page.locator('.help-dialog button[aria-label="Close help"]').click();
  await page.locator('.victory-dialog .primary').click();
  await page.waitForSelector('.menu-shell');
  if (!await page.$('.map-options')) throw new Error('Return to title did not restore campaign setup');

  console.log(`Campaign outcome review passed. Screenshots written to ${output}.`);
} finally {
  await browser.close();
}
