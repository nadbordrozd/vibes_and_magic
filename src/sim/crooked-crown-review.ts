import { mkdirSync, readFileSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createGame } from '../core/game';
import { actionSave } from '../ui/persistence';
import { terrainIdAt } from '../content/terrain';
import {
  deriveMountainRanges, mountainRangeGeometry, mountainRectangleIntersects,
} from '../ui/mountainRanges';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/crooked-crown';
mkdirSync(output, { recursive: true });
const fullMapTilesOutput = `${output}/full-map-tiles`;
mkdirSync(fullMapTilesOutput, { recursive: true });

const state = createGame({
  seed: 4040, mapId: 'crooked-crown', playerCount: 4, difficulty: 'normal',
  p1: 'human', p2: 'dormant', p3: 'dormant', p4: 'dormant',
});
state.players.p1.explored = state.map.terrain.flatMap((row, y) =>
  row.map((_tile, x) => `${x},${y}`));
state.replay = [];
const initial = structuredClone(state);
const save = actionSave(state);
const mountainRanges = deriveMountainRanges(state.map);
const mountainGeometry = mountainRanges.map((range) => ({
  range, geometry: mountainRangeGeometry(range),
}));

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

const captureBlockers = [
  '.modal-backdrop', '.objective-primer', '.choice-dialog', '.result-dialog',
  '.inspection-backdrop', '.help-backdrop', '.spellbook-backdrop',
  '.error-toast', '.notice-toast',
].join(', ');

async function dismissObjective(page: Page): Promise<void> {
  await page.waitForSelector('.objective-primer', { visible: true, timeout: 10_000 });
  await page.$eval('.choice-dialog .primary', (button) => (button as HTMLButtonElement).click());
  await page.waitForSelector('.modal-backdrop', { hidden: true, timeout: 10_000 });
}

async function waitForCaptureReady(page: Page, name: string): Promise<void> {
  await page.waitForSelector('.adventure-map');
  await page.waitForSelector('.terrain-composite');
  await page.waitForFunction((selector) => !document.querySelector(selector),
    { timeout: 10_000 }, captureBlockers);
  await page.waitForFunction(() => [...document.querySelectorAll('image.pixel-sprite')]
    .every((node) => node.getAttribute('opacity') === '1'), { timeout: 30_000 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() =>
    requestAnimationFrame(() => resolve()))));
  const blockers = await page.$$eval(captureBlockers, (nodes) => nodes.map((node) => ({
    className: node.getAttribute('class'), text: node.textContent?.trim().slice(0, 120),
  })));
  if (blockers.length) {
    throw new Error(`${name} is obscured by UI: ${JSON.stringify(blockers)}`);
  }
}

try {
  const page = await browser.newPage();
  // Navigate at the complete native map size so production viewport culling legitimately mounts
  // every intersecting range for the complete-map geometry audit.
  await page.setViewport({ width: 2304, height: 2304, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  const menuEntry = await page.$eval('body', (body) =>
    body.textContent?.includes('The Crooked Crown · Four-player dense labyrinth conquest campaign')
      ?? false);
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
  await dismissObjective(page);
  await waitForCaptureReady(page, 'initial Crooked Crown map');

  const fullMapLayoutStyle = await page.addStyleTag({ content: `
    .map-frame { position: fixed !important; inset: 0 !important; width: 2304px !important;
      height: 2304px !important; padding: 0 !important; overflow: hidden !important; z-index: 9999; }
    .map-caption, .minimap { display: none !important; }
    .adventure-map { position: absolute !important; inset: 0 !important; margin: 0 !important;
      border: 0 !important; box-shadow: none !important; }
  ` });

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
  await new Promise((resolve) => setTimeout(resolve, 300));
  await page.waitForFunction((expected) =>
    document.querySelectorAll('.mountain-range-decoration').length === expected,
  { timeout: 10_000 }, mountainRanges.length);
  await page.waitForFunction(() => [...document.querySelectorAll('image.pixel-sprite')]
    .every((node) => node.getAttribute('opacity') === '1'), { timeout: 30_000 });
  const renderedMountainGeometry = await page.$$eval('.mountain-range-decoration', (nodes) =>
    nodes.map((node) => {
      const data = (node as SVGElement).dataset;
      const image = node.querySelector('image.pixel-sprite');
      const clip = node.querySelector('.mountain-footprint-clip');
      return {
        key: data.inspectId!,
        footprint: {
          x: Number(data.footprintX), y: Number(data.footprintY),
          width: Number(data.footprintWidth), height: Number(data.footprintHeight),
        },
        visual: {
          x: Number(data.visualX), y: Number(data.visualY),
          width: Number(data.visualWidth), height: Number(data.visualHeight),
        },
        image: image ? {
          x: Number(image.getAttribute('x')), y: Number(image.getAttribute('y')),
          width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height')),
        } : null,
        clip: clip ? {
          x: Number(clip.getAttribute('x')), y: Number(clip.getAttribute('y')),
          width: Number(clip.getAttribute('width')), height: Number(clip.getAttribute('height')),
        } : null,
      };
    }));
  if (renderedMountainGeometry.length !== mountainRanges.length) {
    throw new Error(`Full-map mountain coverage is incomplete: ${renderedMountainGeometry.length}/${mountainRanges.length}`);
  }
  for (const rendered of renderedMountainGeometry) {
    if (!rendered.image || !rendered.clip
        || JSON.stringify(rendered.visual) !== JSON.stringify(rendered.clip)
        || rendered.visual.x !== rendered.footprint.x
        || rendered.visual.width !== rendered.footprint.width
        || rendered.visual.y + rendered.visual.height
          > rendered.footprint.y + rendered.footprint.height) {
      throw new Error(`Mountain render bounds escape their authored footprint: ${JSON.stringify(rendered)}`);
    }
    const x = rendered.footprint.x / 32;
    const y = rendered.footprint.y / 32;
    for (let offset = 0; offset < rendered.footprint.width / 32; offset += 1) {
      if (terrainIdAt(state.map, { x: x + offset, y }) !== 'mountain') {
        throw new Error(`Mountain paint claims passable contact ${x + offset},${y}`);
      }
    }
  }
  const fullCounts = await page.evaluate(() => ({
    objects: document.querySelectorAll('.map-object-sprite').length,
    guardians: document.querySelectorAll('.guardian-object').length,
    mountains: document.querySelectorAll('.mountain-range-decoration').length,
    decorations: document.querySelectorAll('[data-inspect-kind="decoration"]').length,
    roads: document.querySelectorAll('.road-pixel, .road-overlay').length,
    castles: document.querySelectorAll('[data-inspect-kind="castle"]').length,
    canvases: document.querySelectorAll('canvas').length,
  }));
  if (fullCounts.canvases || fullCounts.objects < 120 || fullCounts.guardians !== 20
      || fullCounts.mountains !== mountainRanges.length || fullCounts.roads < 500
      || fullCounts.castles !== 4) {
    throw new Error(`Dense full-map render coverage regressed: ${JSON.stringify(fullCounts)}`);
  }
  await fullMapStyle.evaluate((node) => node.remove());
  await fullMapLayoutStyle.evaluate((node) => node.remove());
  await page.setViewport({ width: 768, height: 768, deviceScaleFactor: 1 });
  const tileLayoutStyle = await page.addStyleTag({ content: `
    body { margin: 0 !important; overflow: hidden !important; }
    .map-frame { position: fixed !important; inset: 0 !important; width: 768px !important;
      height: 768px !important; padding: 0 !important; overflow: hidden !important; z-index: 9999; }
    .map-caption, .minimap { display: none !important; }
    .adventure-map { position: absolute !important; inset: 0 !important; margin: 0 !important;
      border: 0 !important; box-shadow: none !important; }
  ` });
  const tilePaths: string[] = [];
  for (let tileY = 0; tileY < 3; tileY += 1) for (let tileX = 0; tileX < 3; tileX += 1) {
    await page.$eval('.map-frame', (frame, target) => frame.scrollTo(target), {
      left: tileX * 768, top: tileY * 768,
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    await waitForCaptureReady(page, `full-map tile ${tileY},${tileX}`);
    const tilePath = `${fullMapTilesOutput}/tile-${tileY}-${tileX}.png`;
    const tileFrame = await page.$('.map-frame');
    if (!tileFrame) throw new Error('Full-map tile viewport missing');
    await tileFrame.screenshot({ path: tilePath });
    tilePaths.push(tilePath);
  }
  await tileLayoutStyle.evaluate((node) => node.remove());

  const stitchPage = await browser.newPage();
  await stitchPage.setViewport({ width: 2304, height: 2304, deviceScaleFactor: 1 });
  const tileImages = tilePaths.map((path, index) => {
    const x = index % 3 * 768;
    const y = Math.floor(index / 3) * 768;
    return `<img src="data:image/png;base64,${readFileSync(path).toString('base64')}" `
      + `style="position:absolute;left:${x}px;top:${y}px;width:768px;height:768px">`;
  }).join('');
  await stitchPage.setContent(`<body style="margin:0;width:2304px;height:2304px;overflow:hidden;background:#080a09">${tileImages}</body>`);
  await stitchPage.screenshot({ path: `${output}/01-full-map-72x72.png` });
  await stitchPage.close();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.addStyleTag({ content: `
    .adventure-map { margin-inline: 0 !important; }
    .map-caption, .minimap { display: none !important; }
  ` });

  async function captureViewport(
    name: string, x: number, y: number, expectedRangeKey: string,
    routeTile?: { x: number; y: number },
  ): Promise<void> {
    await page.$eval('.map-frame', (frame, target) => {
      frame.scrollTo({
        left: target.x * 32 - frame.clientWidth / 2,
        top: target.y * 32 - frame.clientHeight / 2,
      });
    }, { x, y });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await waitForCaptureReady(page, name);
    const culling = await page.evaluate(() => {
      const frame = document.querySelector('.map-frame') as HTMLElement | null;
      const map = document.querySelector('.adventure-map') as SVGSVGElement | null;
      if (!frame || !map) throw new Error('Map viewport missing during culling audit');
      const frameBounds = frame.getBoundingClientRect();
      const mapBounds = map.getBoundingClientRect();
      const scaleX = 2304 / mapBounds.width;
      const scaleY = 2304 / mapBounds.height;
      return {
        viewport: {
          x: Math.max(0, frameBounds.left - mapBounds.left) * scaleX,
          y: Math.max(0, frameBounds.top - mapBounds.top) * scaleY,
          width: frame.clientWidth * scaleX,
          height: frame.clientHeight * scaleY,
        },
        keys: [...document.querySelectorAll('.mountain-range-decoration')]
          .map((node) => (node as SVGElement).dataset.inspectId!),
      };
    });
    const expected = mountainGeometry.filter(({ geometry }) =>
      mountainRectangleIntersects(geometry.visual, culling.viewport))
      .map(({ range }) => range.key).sort();
    const actual = culling.keys.sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Visual-rectangle culling mismatch at ${name}: ${actual.length}/${expected.length}`);
    }
    if (!actual.includes(expectedRangeKey)) {
      throw new Error(`${name} does not show expected mountain content ${expectedRangeKey}`);
    }
    if (routeTile) {
      const range = mountainGeometry.find(({ range: candidate }) =>
        candidate.key === expectedRangeKey);
      const routeRectangle = {
        x: routeTile.x * 32, y: routeTile.y * 32, width: 32, height: 32,
      };
      if (!range || terrainIdAt(state.map, routeTile) === 'mountain'
          || !mountainRectangleIntersects(routeRectangle, culling.viewport)
          || mountainRectangleIntersects(range.geometry.visual, routeRectangle)) {
        throw new Error(`${name} does not visibly preserve passable route tile ${routeTile.x},${routeTile.y}`);
      }
    }
    const frame = await page.$('.map-frame');
    if (!frame) throw new Error('Map viewport missing');
    await frame.screenshot({ path: `${output}/${name}.png` });
  }

  await captureViewport('02-northwest-opening-and-west-route', 9, 16,
    'mountain-range-4-15-rocky-boundary-3', { x: 9, y: 15 });
  await captureViewport('03-west-route-middle', 7, 32,
    'mountain-range-6-28-rocky-ridge-3', { x: 7, y: 28 });
  await captureViewport('04-southwest-route', 8, 51,
    'mountain-range-4-49-rocky-boundary-4', { x: 8, y: 49 });
  await captureViewport('05-mid-south-mountains', 38, 50,
    'mountain-range-38-48-rocky-boundary-4');
  await captureViewport('06-north-edge-clipped', 36, 0,
    'mountain-range-36-0-rocky-backbone-5');
  await captureViewport('07-west-edge-clipped', 0, 36,
    'mountain-range-0-36-rocky-boundary-2');
  await captureViewport('08-south-edge-clipped', 36, 71,
    'mountain-range-36-71-rocky-boundary-8');

  const partialState = structuredClone(state);
  partialState.players.p1.explored = ['38,48'];
  partialState.replay = [];
  await page.evaluate(({ actionSavePayload, initialState }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(actionSavePayload));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initialState));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initialState.setup));
  }, { actionSavePayload: actionSave(partialState), initialState: partialState });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await dismissObjective(page);
  await page.addStyleTag({ content: `
    .adventure-map { margin-inline: 0 !important; }
    .map-caption, .minimap { display: none !important; }
  ` });
  await page.$eval('.map-frame', (frame) => frame.scrollTo({
    left: 38 * 32 - frame.clientWidth / 2,
    top: 48 * 32 - frame.clientHeight / 2,
  }));
  await new Promise((resolve) => setTimeout(resolve, 200));
  await waitForCaptureReady(page, '09-mid-south-partial-fog');
  const partialFogAudit = await page.evaluate(() => {
    const mountain = [...document.querySelectorAll('.mountain-range-decoration')]
      .find((node) => (node as SVGElement).dataset.footprintX === String(38 * 32)
        && (node as SVGElement).dataset.footprintY === String(48 * 32));
    const fog = [...document.querySelectorAll('.fog-occlusion rect')]
      .find((node) => node.getAttribute('x') === String(39 * 32)
        && node.getAttribute('y') === String(48 * 32));
    return {
      mountain: Boolean(mountain), fog: Boolean(fog),
      fogAfterMountain: Boolean(mountain && fog
        && (mountain.compareDocumentPosition(fog) & Node.DOCUMENT_POSITION_FOLLOWING)),
    };
  });
  if (!partialFogAudit.mountain || !partialFogAudit.fog || !partialFogAudit.fogAfterMountain) {
    throw new Error(`Partial mountain reveal leaked unseen contacts: ${JSON.stringify(partialFogAudit)}`);
  }
  const partialFrame = await page.$('.map-frame');
  if (!partialFrame) throw new Error('Partial-fog viewport missing');
  await partialFrame.screenshot({ path: `${output}/09-mid-south-partial-fog.png` });

  if (await page.$('canvas')) throw new Error('Review mounted a runtime canvas');
  console.log(`Crooked Crown review written to ${output}: ${JSON.stringify(fullCounts)}`);
} finally {
  await browser.close();
}
