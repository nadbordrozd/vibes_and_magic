import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createGame } from '../core/game';
import type { MapId } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const requestedMap = process.argv[2];
const mapId = ['border-marches', 'crosstitch', 'torn-sound', 'manywhere', 'grand-muster',
  'crooked-crown']
  .includes(requestedMap)
  ? requestedMap as MapId
  : 'border-marches';
const viewportWidth = Number.parseInt(process.argv[4] ?? '1440', 10);
if (!Number.isInteger(viewportWidth) || viewportWidth < 320 || viewportWidth > 2560) {
  throw new Error('Mountain review viewport must be an integer from 320 through 2560');
}
const viewportHeight = viewportWidth <= 390 ? 844 : 1000;
const outputDir = '.pixel-work/review/mountain-edge-repair-maps';
mkdirSync(outputDir, { recursive: true });

const state = createGame({
  seed: 1, mapId, difficulty: 'normal', p1: 'human', p2: 'ai',
});
let regionLabel = '';
if (mapId === 'manywhere' || mapId === 'grand-muster' || mapId === 'crooked-crown') {
  // Render oversized maps in bounded sections. Chromium stalls while mounting the full map SVG
  // before a screenshot can even be requested. Cropping the review-only
  // initial state retains each authored tile/object verbatim while keeping the production renderer
  // and native production scale unchanged.
  const regionTiles = { w: 16, h: 20 };
  const columns = Math.ceil(state.map.width / regionTiles.w);
  const rows = Math.ceil(state.map.height / regionTiles.h);
  const requestedRegion = Number.parseInt(process.argv[3] ?? '1', 10);
  if (!Number.isInteger(requestedRegion) || requestedRegion < 1
      || requestedRegion > columns * rows) {
    throw new Error(`${state.map.name} review section must be 1..${columns * rows}`);
  }
  const row = Math.floor((requestedRegion - 1) / columns);
  const col = (requestedRegion - 1) % columns;
  const origin = { x: col * regionTiles.w, y: row * regionTiles.h };
  const width = Math.min(regionTiles.w, state.map.width - origin.x);
  const height = Math.min(regionTiles.h, state.map.height - origin.y);
  const inside = (position: { x: number; y: number }) => position.x >= origin.x
    && position.y >= origin.y && position.x < origin.x + width
    && position.y < origin.y + height;
  const shift = (position: { x: number; y: number }) => ({
    x: position.x - origin.x, y: position.y - origin.y,
  });
  state.map.terrain = state.map.terrain.slice(origin.y, origin.y + height)
    .map((terrainRow) => terrainRow.slice(origin.x, origin.x + width));
  state.map.width = width;
  state.map.height = height;
  state.map.roads = (state.map.roads ?? []).filter(inside).map(shift);
  state.map.seams = (state.map.seams ?? []).filter(inside).map(shift);
  state.map.objects = state.map.objects.filter((object) => inside(object.position))
    .map((object) => ({ ...object, position: shift(object.position) }));
  state.castles = state.castles.filter((castle) => inside(castle.position))
    .map((castle) => ({ ...castle, position: shift(castle.position) }));
  for (const player of Object.values(state.players)) {
    player.heroes = player.heroes.map((hero) => ({ ...hero, position: shift(hero.position) }));
    player.hero = player.hero
      ? player.heroes.find((hero) => hero.id === player.hero!.id) ?? null : null;
  }
  if (state.mapEffects.length) throw new Error('Oversized-map review crop requires an effect-free day');
  state.map.name = `${state.map.name} · section ${row + 1},${col + 1}`;
  regionLabel = `-r${row + 1}c${col + 1}`;
}
state.players.p1.explored = state.map.terrain.flatMap((row, y) =>
  row.map((_, x) => `${x},${y}`));
state.replay = [];
const reviewState = structuredClone(state);
const reviewSave = actionSave(state);

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(({ save, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({
      savedAt: Date.now(), day: initial.day, week: initial.week, activePlayer: initial.activePlayer,
    }));
  }, { save: reviewSave, initial: reviewState });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.$eval('.load-button', (node) => (node as HTMLButtonElement).click());
  await Promise.race([
    page.waitForSelector('.adventure-map'),
    page.waitForSelector('.choice-dialog'),
    page.waitForSelector('.error-toast'),
  ]);
  const error = await page.$eval('.error-toast', (node) => node.textContent).catch(() => null);
  if (error) throw new Error(`Load failed: ${error}`);
  const choice = await page.$('.choice-dialog .primary');
  if (choice) {
    await choice.click();
    await page.waitForSelector('.choice-dialog', { hidden: true });
  }
  await page.waitForSelector('.adventure-map');
  await page.waitForSelector('.terrain-composite');
  const runtimeCanvasCount = await page.$$eval('canvas', (nodes) => nodes.length);
  if (runtimeCanvasCount) {
    throw new Error(`${mapId} mounted ${runtimeCanvasCount} runtime canvas elements`);
  }
  await page.waitForFunction(() => [...document.querySelectorAll('image.pixel-sprite')]
    .every((node) => node.getAttribute('opacity') === '1'));
  const fallbacks = await page.evaluate(() => ({
    terrain: document.querySelectorAll('.terrain-glyph').length,
    decoration: document.querySelectorAll('.terrain-decoration').length,
    object: document.querySelectorAll('.map-object-sprite .map-object-glyph').length,
    castle: document.querySelectorAll('.castle-glyph').length,
  }));
  if (Object.values(fallbacks).some(Boolean)) {
    throw new Error(`${mapId} still renders in-scope glyph fallbacks: ${JSON.stringify(fallbacks)}`);
  }
  const mountainCount = await page.$$eval('.mountain-range-decoration', (nodes) => nodes.length);
  const internalHorizontalCrops = await page.$$eval('.mountain-range-decoration', (nodes) =>
    nodes.filter((node) => {
      const clip = node.querySelector('svg.mountain-footprint-clip');
      const image = node.querySelector('image.pixel-sprite');
      if (!clip || !image) return true;
      const viewBox = (clip.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
      const visualX = Number((node as SVGGElement).dataset.visualX);
      const visualWidth = Number((node as SVGGElement).dataset.visualWidth);
      const clipX = Number(clip.getAttribute('x'));
      const clipWidth = Number(clip.getAttribute('width'));
      return !viewBox.every(Number.isFinite) || viewBox.length !== 4
        || clipX !== Number(image.getAttribute('x'))
        || clipWidth !== Number(image.getAttribute('width'))
        || viewBox[0] !== clipX || viewBox[2] !== clipWidth
        || visualX !== clipX || visualWidth !== clipWidth;
    }).length);
  if (internalHorizontalCrops) {
    throw new Error(`${mapId} mounts ${internalHorizontalCrops} mountain images across a horizontal crop`);
  }
  const exposedMountainGround = await page.$$eval(
    '.terrain-mountain .terrain-pixel, .terrain-mountain .mountain-glyph',
    (nodes) => nodes.length,
  );
  if (exposedMountainGround) {
    throw new Error(`${mapId} exposes ${exposedMountainGround} grey mountain-ground layers`);
  }
  const map = await page.$('.adventure-map');
  if (!map) throw new Error('Adventure map is missing');
  const evidenceStem = `${outputDir}/${mapId}${regionLabel}-${viewportWidth}px`;
  await map.screenshot({ path: `${evidenceStem}-map-native.png` });
  const firstMountain = await page.$('.mountain-range-decoration image');
  if (firstMountain) {
    await firstMountain.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'center' }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    await page.screenshot({ path: `${evidenceStem}-viewport.png` });
  }
  console.log(`ok ${mapId}${regionLabel} ${viewportWidth}px evidence · ${mountainCount} mountain-family pieces · no horizontal mountain crops or in-scope glyphs`);
} finally {
  await browser.close();
}
