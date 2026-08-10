import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createGame } from '../core/game';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/crooked-crown';
mkdirSync(output, { recursive: true });

const state = createGame({
  seed: 4040, mapId: 'crooked-crown', playerCount: 4, difficulty: 'normal',
  p1: 'human', p2: 'dormant', p3: 'dormant', p4: 'dormant',
});
state.players.p1.explored = state.map.terrain.flatMap((row, y) =>
  row.map((_tile, x) => `${x},${y}`));
state.replay = [];
const initial = structuredClone(state);
const save = actionSave(state);

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  const menuEntry = await page.$$eval('.map-options button', (buttons) =>
    buttons.some((button) => button.textContent?.includes('The Crooked Crown')));
  if (!menuEntry) throw new Error('The Crooked Crown is absent from campaign selection');
  await page.evaluate(({ actionSavePayload, initialState }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(actionSavePayload));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initialState));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initialState.setup));
  }, { actionSavePayload: save, initialState: initial });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await Promise.race([
    page.waitForSelector('.adventure-map'), page.waitForSelector('.error-toast'),
  ]);
  const error = await page.$eval('.error-toast', (node) => node.textContent).catch(() => null);
  if (error) throw new Error(`Load failed: ${error}`);
  const choice = await page.$('.choice-dialog .primary');
  if (choice) await choice.click();
  await page.waitForSelector('.adventure-map');
  await page.waitForSelector('.terrain-composite');
  await page.waitForFunction(() => [...document.querySelectorAll('image.pixel-sprite')]
    .every((node) => node.getAttribute('opacity') === '1'), { timeout: 30_000 });

  const dimensions = await page.$eval('.adventure-map', (map) => ({
    width: map.getAttribute('width'), height: map.getAttribute('height'),
    viewBox: map.getAttribute('viewBox'),
  }));
  if (dimensions.width !== '2304' || dimensions.height !== '2304'
      || dimensions.viewBox !== '0 0 2304 2304') {
    throw new Error(`Unexpected 72x72 render dimensions: ${JSON.stringify(dimensions)}`);
  }
  const map = await page.$('.adventure-map');
  if (!map) throw new Error('Adventure map missing');
  const fullMapStyle = await page.addStyleTag({ content: `
    body * { visibility: hidden !important; }
    .map-frame, .adventure-map, .adventure-map * { visibility: visible !important; }
    .map-frame { position: fixed !important; inset: 0 !important; width: 2304px !important;
      height: 2304px !important; padding: 0 !important; overflow: hidden !important; z-index: 9999; }
    .map-caption, .minimap { display: none !important; }
    .adventure-map { position: absolute !important; inset: 0 !important; margin: 0 !important;
      border: 0 !important; box-shadow: none !important; }
  ` });
  await page.setViewport({ width: 2304, height: 2304, deviceScaleFactor: 1 });
  await page.$eval('.map-frame', (frame) => frame.scrollTo(0, 0));
  await page.$eval('.map-frame', (node) => {
    const frame = node as HTMLElement;
    const map = frame.querySelector('.adventure-map');
    if (!map) throw new Error('Full-map capture lost its SVG');
    const rect = map.getBoundingClientRect();
    frame.style.transform = `translate(${-rect.x}px, ${-rect.y}px)`;
  });
  const fullMapClip = await page.$eval('.adventure-map', (node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  if (Math.abs(fullMapClip.x) > 0.1 || Math.abs(fullMapClip.y) > 0.1) {
    throw new Error(`Full-map capture offset remains: ${JSON.stringify(fullMapClip)}`);
  }
  await page.screenshot({ path: `${output}/01-full-map-72x72.png`,
    clip: fullMapClip, captureBeyondViewport: true });
  await fullMapStyle.evaluate((node) => node.remove());
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

  async function captureViewport(name: string, x: number, y: number): Promise<void> {
    await page.$eval('.map-frame', (frame, target) => {
      frame.scrollTo({
        left: target.x * 32 - frame.clientWidth / 2,
        top: target.y * 32 - frame.clientHeight / 2,
      });
    }, { x, y });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const frame = await page.$('.map-frame');
    if (!frame) throw new Error('Map viewport missing');
    await frame.screenshot({ path: `${output}/${name}.png` });
  }

  await captureViewport('02-northwest-opening', 9, 9);
  await captureViewport('03-central-contested-circuit', 36, 35);
  await captureViewport('04-southeast-start-and-gates', 62, 62);

  const counts = await page.evaluate(() => ({
    objects: document.querySelectorAll('.map-object-sprite').length,
    guardians: document.querySelectorAll('.guardian-object').length,
    mountains: document.querySelectorAll('.mountain-range-decoration').length,
    decorations: document.querySelectorAll('[data-inspect-kind="decoration"]').length,
    roads: document.querySelectorAll('.road-pixel, .road-overlay').length,
    castles: document.querySelectorAll('[data-inspect-kind="castle"]').length,
    canvases: document.querySelectorAll('canvas').length,
  }));
  if (counts.canvases) throw new Error(`Review mounted ${counts.canvases} runtime canvases`);
  if (counts.objects < 120 || counts.guardians !== 20 || counts.mountains < 100
      || counts.roads < 500 || counts.castles !== 4) {
    throw new Error(`Dense render coverage regressed: ${JSON.stringify(counts)}`);
  }
  console.log(`Crooked Crown review written to ${output}: ${JSON.stringify(counts)}`);
} finally {
  await browser.close();
}
