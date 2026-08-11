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
const pickupPosition = { x: hero.position.x + 1, y: hero.position.y };
const mixedPosition = { x: hero.position.x + 2, y: hero.position.y };
state.map.objects.push({
  id: 'review-waybread-pickup', kind: 'item', position: pickupPosition,
  item: { id: 'waybread' }, collected: false,
}, {
  id: 'review-mixed-pickup', kind: 'rewardPickup', position: mixedPosition,
  reward: {
    artifacts: [{ id: 'seamstone', chosenSchool: 'wild' }],
    items: [{ id: 'spellScroll', storedSpellId: 'ward', plus: true }],
    gold: 333,
  }, collected: false,
});
for (const position of [pickupPosition, mixedPosition]) {
  const key = `${position.x},${position.y}`;
  if (!state.players.p1.explored.includes(key)) state.players.p1.explored.push(key);
}
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
  if (await page.$('.objective-primer')) {
    await page.$eval('.objective-primer', (primer) => {
      const button = [...primer.closest('section')!.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.toLocaleLowerCase().includes('take the field'));
      if (!button) throw new Error('Objective primer has no Take the field action');
      button.click();
    });
    await page.waitForSelector('.objective-primer', { hidden: true });
  }
  await page.waitForSelector('[data-inspect-id="review-waybread-pickup"] image[opacity="1"]');
  await page.waitForSelector('[data-inspect-id="review-mixed-pickup"] image[opacity="1"]');
  const mapAudit = await page.evaluate(() => ({
    item: document.querySelector('[data-inspect-id="review-waybread-pickup"] image')
      ?.getAttribute('href') ?? '',
    mixed: document.querySelector('[data-inspect-id="review-mixed-pickup"] image')
      ?.getAttribute('href') ?? '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (!mapAudit.item.endsWith('/assets/items/waybread.png')
      || !mapAudit.mixed.endsWith('/assets/artifacts/seamstone.png')
      || mapAudit.overflow > 2) {
    throw new Error(`Collectible map sprite audit failed: ${JSON.stringify(mapAudit)}`);
  }
  await page.screenshot({ path: `${output}/collectible-pickups-desktop.png`, fullPage: true });
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const image = document.querySelector('.pickup-flight image');
      if (image) {
        document.body.dataset.reviewPickupFlight = image.getAttribute('href') ?? '';
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.$eval('[data-inspect-id="review-waybread-pickup"]', (node) =>
    (node as SVGGElement).dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.waitForFunction(() => Boolean(document.body.dataset.reviewPickupFlight));
  const flight = await page.$eval('body', (body) => body.dataset.reviewPickupFlight ?? '');
  if (!flight.endsWith('assets/items/waybread.png')) {
    throw new Error(`Pickup result did not reuse the canonical item sprite: ${flight}`);
  }
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
  if (audit.sprites !== 6 || audit.labels.length !== 6
      || !audit.labels.includes('Waybread') || audit.rootOverflow > 2) {
    throw new Error(`Item desktop audit failed: ${JSON.stringify(audit)}`);
  }
  await page.screenshot({ path: `${output}/item-inventory-desktop.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const narrowOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (narrowOverflow > 2) throw new Error(`Item narrow layout overflows by ${narrowOverflow}px`);
  await page.screenshot({ path: `${output}/item-inventory-390.png`, fullPage: true });
  console.log(`Item sprite browser review: map pickups + result and ${audit.sprites} inventory sprites, desktop + 390px, no overflow`);
} finally {
  await browser.close();
}
