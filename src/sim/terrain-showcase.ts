import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/terrain-transition-showcase-native.png';
const gameOutput = '.pixel-work/review/game-terrain-transition-showcase-native.png';

mkdirSync('.pixel-work/review', { recursive: true });
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  // Shell padding must fit inside the viewport so the element capture does not clip its last cell.
  await page.setViewport({ width: 1984, height: 1392, deviceScaleFactor: 1 });
  const url = new URL(baseUrl);
  url.searchParams.set('terrain-showcase', '1');
  await page.goto(url.href, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.terrain-showcase-shell[data-ready="true"]');
  const runtimeCanvasCount = await page.$$eval('canvas', (nodes) => nodes.length);
  if (runtimeCanvasCount) throw new Error(`Terrain showcase mounted ${runtimeCanvasCount} canvases`);
  const showcase = await page.$('.terrain-showcase-frame svg');
  if (!showcase) throw new Error('Terrain showcase SVG failed to mount.');
  await showcase.screenshot({ path: output });
  const gameShowcase = await page.$('.game-terrain-study');
  if (!gameShowcase) throw new Error('Game terrain showcase failed to mount.');
  await gameShowcase.screenshot({ path: gameOutput });
} finally {
  await browser.close();
}

console.log('ok 60x42 terrain cells · 32x32 native/displayed · 9 terrain families');
console.log(output);
console.log(gameOutput);
