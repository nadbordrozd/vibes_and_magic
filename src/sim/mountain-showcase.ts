import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { PIXEL_SCALE, assetId, manifestEntry } from '../../assets/manifest';
import type { GameMap, TerrainTile } from '../core/types';
import { deriveMountainRanges, mountainRangeGeometry,
  type MountainRangeDecoration } from '../ui/mountainRanges';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/rocky-mountain-shape-showcase-native.png';
const TILE = 32 * PIXEL_SCALE;
const width = 38;
const height = 32;

const terrain: TerrainTile[][] = Array.from({ length: height }, () =>
  Array.from({ length: width }, () => ({ terrain: 'meadow', skin: 'default' })));

function mountainRun(y: number, fromX: number, toX: number): void {
  for (let x = fromX; x <= toX; x += 1) {
    terrain[y][x] = { terrain: 'mountain', skin: 'granite' };
  }
}

// Six deliberately different authored footprints. The production compositor sees only these
// impassable cells; the review does not hand-place or choose individual mountain sprites.
// 1. Compact oval mass.
mountainRun(4, 4, 8);
mountainRun(5, 2, 10);
mountainRun(6, 2, 10);
mountainRun(7, 3, 9);

// 2. Long, shallow ridge with an offset shoulder.
mountainRun(4, 15, 26);
mountainRun(5, 14, 31);
mountainRun(6, 16, 32);
mountainRun(7, 20, 29);

// 3. Small isolated crescent.
mountainRun(11, 29, 35);
mountainRun(12, 28, 30);
mountainRun(12, 34, 36);
mountainRun(13, 28, 30);
mountainRun(13, 34, 36);
mountainRun(14, 29, 35);

// 4. Broad elbow / bent range.
mountainRun(16, 3, 7);
mountainRun(17, 2, 7);
mountainRun(18, 2, 7);
mountainRun(19, 2, 7);
mountainRun(20, 2, 13);
mountainRun(21, 3, 14);
mountainRun(22, 5, 13);

// 5. Diagonal staircase with changing width.
mountainRun(16, 17, 21);
mountainRun(17, 17, 23);
mountainRun(18, 19, 25);
mountainRun(19, 21, 27);
mountainRun(20, 23, 29);
mountainRun(21, 25, 31);
mountainRun(22, 28, 32);

// 6. Broken twin-lobed range connected by a low saddle.
mountainRun(24, 11, 16);
mountainRun(24, 22, 27);
mountainRun(25, 9, 18);
mountainRun(25, 20, 29);
mountainRun(26, 10, 28);

// 7. One-cell-wide hooked spine. Broad sprite canvases may overlap, but every contact is one cell.
mountainRun(25, 2, 2);
mountainRun(26, 2, 2);
mountainRun(27, 2, 4);
mountainRun(28, 4, 4);
mountainRun(29, 4, 4);

// 8. Two irregular lobes joined through a one-cell bottleneck.
mountainRun(25, 32, 36);
mountainRun(26, 31, 36);
mountainRun(27, 33, 33);
mountainRun(28, 31, 35);
mountainRun(29, 30, 36);

const map: GameMap = {
  id: 'manywhere',
  name: 'Mountain shape showcase',
  width,
  height,
  seed: 34871,
  terrain,
  objects: [],
  roads: [],
  seams: [],
  victory: { type: 'none', flavor: '', mechanics: '' },
};

const pieces = deriveMountainRanges(map).sort((a, b) =>
  a.position.y - b.position.y || a.position.x - b.position.x || a.key.localeCompare(b.key));
const meadow = manifestEntry('terrain-field:meadow');
if (!meadow) throw new Error('Missing meadow field asset');

function spriteMarkup(piece: MountainRangeDecoration): string {
  const entry = manifestEntry(assetId.decoration('mountain', piece.variant));
  if (!entry) throw new Error(`Missing mountain sprite ${piece.variant}`);
  const geometry = mountainRangeGeometry(piece, TILE);
  const src = new URL(entry.file, baseUrl).href;
  return `<img src="${src}" alt="" data-contact-width="${piece.contactWidth}" `
    + `data-visual-width="${geometry.visual.width}" style="left:${geometry.sprite.x}px;`
    + `top:${geometry.sprite.y}px;width:${geometry.sprite.width}px;`
    + `height:${geometry.sprite.height}px">`;
}

const canvasWidth = width * TILE;
const canvasHeight = height * TILE;
const meadowUrl = new URL(meadow.file, baseUrl).href;
const html = `<!doctype html><html><head><style>
  html,body{margin:0;background:#182019;overflow:hidden}
  #showcase{position:relative;width:${canvasWidth}px;height:${canvasHeight}px;
    background:#377d35 url("${meadowUrl}") repeat;background-size:${meadow.w * PIXEL_SCALE}px ${meadow.h * PIXEL_SCALE}px;
    image-rendering:pixelated}
  img{position:absolute;display:block;image-rendering:pixelated}
</style></head><body><main id="showcase">${pieces.map((piece) =>
  spriteMarkup(piece)).join('')}</main></body></html>`;

mkdirSync('.pixel-work/review', { recursive: true });
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: canvasWidth, height: canvasHeight, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete
    && image.naturalWidth > 0));
  const showcase = await page.$('#showcase');
  if (!showcase) throw new Error('Mountain showcase failed to mount');
  await showcase.screenshot({ path: output });
} finally {
  await browser.close();
}

const variants = new Set(pieces.map(({ variant }) => variant));
console.log(`ok 8 rocky range shapes · ${pieces.length} composed pieces · ${variants.size} variants · native ×${PIXEL_SCALE}`);
console.log(output);
