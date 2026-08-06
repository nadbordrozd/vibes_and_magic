import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://localhost:5173/';
const output = '.pixel-work/review/landscape';
mkdirSync(output, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.locator('.start-button').click();
  await page.waitForSelector('.adventure-map');
  await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await page.waitForFunction(() => [...document.querySelectorAll('.terrain-pixel')]
    .every((node) => Number(getComputedStyle(node).opacity) === 1));
  await page.addStyleTag({ content: `
    .map-object-glyph, .terrain-decoration, .decoration-pixel,
    .mountain-range-decoration, .map-overlay-glyph { visibility: hidden !important; }
    .terrain-surface { visibility: hidden !important; }
    .road-pixel, .road-overlay { visibility: hidden !important; }
    .map-overlay-glyph[data-inspect-kind="hero"], .landscape-proof-visible {
      visibility: visible !important;
    }
    .minimap { display: none !important; }
  ` });
  await page.screenshot({ path: `${output}/01-hero-on-grass.png` });

  await page.$eval('[data-inspect-id="west-timber"]', (node) =>
    node.classList.add('landscape-proof-visible'));
  await page.screenshot({ path: `${output}/02-hero-and-building.png` });

  await page.$eval('.adventure-map', (map) => {
    const hero = map.querySelector<SVGGElement>('[data-inspect-kind="hero"]');
    if (!hero) throw new Error('Landscape review hero is missing');
    const matrix = new DOMMatrix(getComputedStyle(hero).transform);
    [[80, -376], [190, -388], [300, -372]].forEach(([dx, dy], index) => {
      const mountain = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      mountain.classList.add('landscape-proof-visible', 'landscape-proof-mountain');
      mountain.setAttribute('data-segment', String(index));
      mountain.setAttribute('href', index === 1
        ? 'assets/decorations/mountain-range-clump-b.png'
        : 'assets/decorations/mountain-range-clump.png');
      mountain.setAttribute('x', String(matrix.m41 + dx));
      mountain.setAttribute('y', String(matrix.m42 + dy));
      mountain.setAttribute('width', '256');
      mountain.setAttribute('height', '320');
      mountain.setAttribute('preserveAspectRatio', 'none');
      map.append(mountain);
    });
  });
  await page.waitForNetworkIdle({ idleTime: 250, timeout: 5_000 });
  await page.screenshot({ path: `${output}/03-hero-building-mountains.png` });

  await page.$$eval('[data-inspect-kind="castle"]', (nodes) =>
    nodes.forEach((node) => node.classList.add('landscape-proof-visible')));
  await page.screenshot({ path: `${output}/04-complete-proof.png` });

  await page.addStyleTag({ content: `
    .map-overlay-glyph[data-inspect-kind="castle"],
    .map-overlay-glyph[data-inspect-kind="hero"],
    .landscape-proof-visible { visibility: hidden !important; }
    .landscape-cute-visible { visibility: visible !important; }
  ` });
  await page.$eval('.adventure-map', (map) => {
    const hero = map.querySelector<SVGGElement>('[data-inspect-kind="hero"]');
    if (!hero) throw new Error('Landscape review hero is missing');
    const matrix = new DOMMatrix(getComputedStyle(hero).transform);
    const sprites = [
      { href: 'assets/review/landscape-cute-castle.png', x: matrix.m41 - 200,
        y: matrix.m42 - 256, width: 192, height: 256,
        shadow: 'drop-shadow(-12px -8px 0 rgba(18, 25, 20, .32))' },
      { href: 'assets/review/landscape-cute-mountain.png', x: matrix.m41 + 100,
        y: matrix.m42 - 224, width: 320, height: 224,
        shadow: 'drop-shadow(-16px -10px 0 rgba(18, 25, 20, .28))' },
      { href: 'assets/review/landscape-cute-hero.png', x: matrix.m41 - 32,
        y: matrix.m42 - 80, width: 64, height: 96, shadow: '' },
    ];
    sprites.forEach((sprite) => {
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.classList.add('landscape-cute-visible');
      image.setAttribute('href', sprite.href);
      image.setAttribute('x', String(sprite.x));
      image.setAttribute('y', String(sprite.y));
      image.setAttribute('width', String(sprite.width));
      image.setAttribute('height', String(sprite.height));
      image.setAttribute('preserveAspectRatio', 'none');
      image.style.filter = sprite.shadow;
      map.append(image);
    });
  });
  await page.waitForNetworkIdle({ idleTime: 250, timeout: 5_000 });
  await page.screenshot({ path: `${output}/05-cute-three-sprite-proof.png` });

  await page.addStyleTag({ content: `
    .landscape-cute-visible { visibility: hidden !important; }
    .castle-lineup-visible { visibility: visible !important; }
  ` });
  await page.$eval('.adventure-map', (map) => {
    const hero = map.querySelector<SVGGElement>('[data-inspect-kind="hero"]');
    if (!hero) throw new Error('Landscape review hero is missing');
    const matrix = new DOMMatrix(getComputedStyle(hero).transform);
    const castles = [
      ['hearthguard', -200, -380], ['wound-wrights', 20, -380],
      ['unfinished', 240, -380], ['vespiary', -200, -100],
      ['hagwood', 20, -100], ['wildergrass', 240, -100],
    ] as const;
    castles.forEach(([faction, dx, dy]) => {
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.classList.add('castle-lineup-visible');
      image.setAttribute('href', `assets/castles-v2/${faction}-castle.png`);
      image.setAttribute('x', String(matrix.m41 + dx));
      image.setAttribute('y', String(matrix.m42 + dy));
      image.setAttribute('width', '192');
      image.setAttribute('height', '256');
      image.setAttribute('preserveAspectRatio', 'none');
      image.style.filter = 'drop-shadow(-12px -8px 0 rgba(18, 25, 20, .32))';
      map.append(image);
    });
  });
  await page.waitForNetworkIdle({ idleTime: 250, timeout: 5_000 });
  await page.screenshot({ path: `${output}/06-castle-faction-lineup.png` });
  console.log(`Landscape review written to ${output}`);
} finally {
  await browser.close();
}
