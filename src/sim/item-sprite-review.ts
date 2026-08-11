import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createGame } from '../core/game';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/items';
mkdirSync(output, { recursive: true });

const state = createGame({ seed: 515101, mapId: 'grand-muster', difficulty: 'normal',
  p1: 'human', p2: 'dormant' });
const hero = state.players.p1.hero!;
hero.inventory = [
  { id: 'potionOfVigor' }, { id: 'scrollQuiet', plus: true }, { id: 'waybread' },
  { id: 'hornetJar' }, { id: 'tradeGoods', origin: { x: 2, y: 3 } }, null,
];
state.pendingChoice = null;
const persisted = actionSave(state);

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => { throw error; });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(({ save, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({ savedAt: Date.now(),
      day: initial.day, week: initial.week, activePlayer: initial.players[initial.activePlayer].name }));
  }, { save: persisted, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  await page.$eval('.rail-commands', (commands) => {
    const button = [...commands.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Hero details'));
    if (!button) throw new Error('Hero details command missing');
    button.click();
  });
  await page.waitForSelector('.hero-details-dialog');
  await page.$eval('.hero-details-tabs', (tabs) => {
    const button = [...tabs.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Items'));
    if (!button) throw new Error('Items tab missing');
    button.click();
  });
  await page.waitForSelector('.hero-details-items .item-sprite');
  const audit = await page.evaluate(() => ({
    sprites: document.querySelectorAll('.hero-details-items .item-sprite').length,
    labels: [...document.querySelectorAll('.hero-details-items .army-slot')]
      .map((node) => node.textContent?.trim()).filter(Boolean),
    rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (audit.sprites !== 5 || audit.labels.length !== 6 || audit.rootOverflow > 2) {
    throw new Error(`Item desktop audit failed: ${JSON.stringify(audit)}`);
  }
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.screenshot({ path: `${output}/item-inventory-desktop.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const narrowOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (narrowOverflow > 2) throw new Error(`Item narrow layout overflows by ${narrowOverflow}px`);
  await page.screenshot({ path: `${output}/item-inventory-390.png`, fullPage: true });
  console.log(`Item sprite browser review: ${audit.sprites} sprites, desktop + 390px, no overflow`);
} finally {
  await browser.close();
}
