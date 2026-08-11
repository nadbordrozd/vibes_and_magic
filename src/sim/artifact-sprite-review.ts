import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { CHARM_ARTIFACT_IDS } from '../content/artifacts';
import { createGame } from '../core/game';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/artifacts';
mkdirSync(output, { recursive: true });

const state = createGame({ seed: 515102, mapId: 'grand-muster', difficulty: 'normal',
  p1: 'human', p2: 'dormant' });
const hero = state.players.p1.hero!;
hero.artifacts.equipment = {
  head: { id: 'beeCharmersVeil' }, cloak: { id: 'standardBearersBaldric' },
  amulet: { id: 'saltCrustedCompass' }, weapon: { id: 'droversCrook' },
  shield: null, armor: null,
  ring1: { id: 'candleSnuffersRing' }, ring2: { id: 'chalkmastersRing' },
  boots: { id: 'thirdBoot' }, misc1: { id: 'falconersGlove' },
  misc2: { id: 'fairScale' },
};
const equipped = new Set(Object.values(hero.artifacts.equipment).flatMap((artifact) =>
  artifact ? [artifact.id] : []));
hero.artifacts.backpack = CHARM_ARTIFACT_IDS
  .filter((id) => !equipped.has(id)).map((id) => ({ id }));
state.pendingChoice = null;
const persisted = actionSave(state);

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => { throw error; });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
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
      .find((candidate) => candidate.textContent?.includes('Equipment'));
    if (!button) throw new Error('Equipment tab missing');
    button.click();
  });
  await page.waitForSelector('.artifact-paper-doll .artifact-sprite');
  const audit = await page.evaluate(() => ({
    sprites: document.querySelectorAll('.artifact-paper-doll .artifact-sprite').length,
    semanticCards: document.querySelectorAll('.artifact-paper-doll [data-inspect-kind="artifact"]').length,
    rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (audit.sprites !== CHARM_ARTIFACT_IDS.length
      || audit.semanticCards !== CHARM_ARTIFACT_IDS.length || audit.rootOverflow > 2) {
    throw new Error(`Artifact desktop audit failed: ${JSON.stringify(audit)}`);
  }
  await page.screenshot({ path: `${output}/charm-equipment-desktop.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const narrowOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (narrowOverflow > 2) throw new Error(`Artifact narrow layout overflows by ${narrowOverflow}px`);
  await page.screenshot({ path: `${output}/charm-equipment-390.png`, fullPage: true });
  await page.$eval('.hero-details-body', (body) => { body.scrollTop = body.scrollHeight; });
  await page.screenshot({ path: `${output}/charm-backpack-390.png`, fullPage: true });
  console.log(`Artifact sprite browser review: ${audit.sprites} sprites, desktop + 390px, no overflow`);
} finally {
  await browser.close();
}
