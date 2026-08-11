import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/adventure-showcase';

interface ViewportAudit {
  name: string;
  width: number;
  height: number;
  inventoryCount: number;
  uniqueCardIds: number;
  loadedSpriteIds: number;
  spriteInstances: number;
  terrainSkins: number;
  decorationFixtures: number;
  mountainPieces: number;
  contextInteractables: number;
  contextDecorations: number;
  contextPainterEntries: number;
  horizontalOverflow: number;
}

async function audit(page: Page, name: string, width: number, height: number): Promise<ViewportAudit> {
  return page.evaluate(async ({ name: viewportName, width: viewportWidth, height: viewportHeight }) => {
    const shell = document.querySelector<HTMLElement>('.adventure-showcase-shell[data-ready="true"]');
    if (!shell) throw new Error('Adventure showcase failed to become ready');
    if (document.querySelector('canvas')) throw new Error('Adventure showcase mounted a runtime canvas');

    const cards = [...document.querySelectorAll<HTMLElement>('[data-showcase-id]')];
    const expected = Number(shell.dataset.inventoryCount);
    const cardIds = cards.map((card) => card.dataset.showcaseId ?? '');
    if (cards.length !== expected) throw new Error(`Expected ${expected} audit cards, found ${cards.length}`);
    if (new Set(cardIds).size !== expected) throw new Error('Adventure showcase has duplicate audit cards');

    const images = [...document.querySelectorAll<SVGImageElement>('.showcase-sprite[data-asset-id]')];
    const unique = new Map<string, SVGImageElement>();
    images.forEach((image) => unique.set(image.dataset.assetId!, image));
    const failures: string[] = [];
    await Promise.all([...unique].map(async ([id, image]) => {
      const href = image.href.baseVal;
      const declaredW = Number(image.dataset.nativeWidth);
      const declaredH = Number(image.dataset.nativeHeight);
      const probe = new Image();
      await new Promise<void>((resolve) => {
        probe.onload = () => resolve();
        probe.onerror = () => { failures.push(`${id}: failed to load ${href}`); resolve(); };
        probe.src = href;
      });
      if (probe.naturalWidth !== declaredW || probe.naturalHeight !== declaredH) {
        failures.push(`${id}: source ${probe.naturalWidth}x${probe.naturalHeight}, declared ${declaredW}x${declaredH}`);
      }
      const box = image.getBoundingClientRect();
      if (Math.abs(box.width - declaredW) > 0.01 || Math.abs(box.height - declaredH) > 0.01) {
        failures.push(`${id}: rendered ${box.width}x${box.height}, expected native ${declaredW}x${declaredH}`);
      }
      if (!Number.isInteger(Number(image.dataset.anchorX))
          || !Number.isInteger(Number(image.dataset.anchorY))) failures.push(`${id}: non-integer anchor`);
    }));
    if (failures.length) throw new Error(failures.slice(0, 20).join('\n'));

    const mountainPieces = [...document.querySelectorAll<SVGImageElement>('.mountain-showcase-piece')];
    let previous = [-1, -1];
    mountainPieces.forEach((piece) => {
      const nativeWidth = Number(piece.dataset.nativeWidth);
      const visualX = Number(piece.dataset.visualX);
      const visualWidth = Number(piece.dataset.visualWidth);
      const mountedX = Number(piece.getAttribute('x'));
      const mountedWidth = Number(piece.getAttribute('width'));
      if (mountedX !== visualX || mountedWidth !== visualWidth
          || mountedWidth !== nativeWidth) {
        failures.push(`${piece.dataset.assetId}: mounted x/width ${mountedX}/${mountedWidth}, `
          + `visual x/width ${visualX}/${visualWidth}, native width ${nativeWidth}`);
      }
      const next = [Number(piece.dataset.painterRow), Number(piece.dataset.painterCol)];
      if (next[0] < previous[0] || (next[0] === previous[0] && next[1] < previous[1])) {
        failures.push(`mountain painter order regressed at ${piece.dataset.assetId}`);
      }
      previous = next;
    });
    if (failures.length) throw new Error(failures.join('\n'));

    const context = document.querySelector<SVGSVGElement>(
      '.interaction-hierarchy-study .showcase-native-map',
    );
    if (!context) throw new Error('Interaction hierarchy fixture is missing');
    const contextInteractables = Number(context.dataset.contextItemCount);
    const contextDecorations = Number(context.dataset.contextDecorationCount);
    const contextPainterEntries = [...context.querySelectorAll<SVGImageElement>('[data-painter-row]')];
    if (contextPainterEntries.length !== contextInteractables + contextDecorations) {
      throw new Error(`Interaction hierarchy expected ${contextInteractables + contextDecorations} painter entries, found ${contextPainterEntries.length}`);
    }
    previous = [-1, -1];
    contextPainterEntries.forEach((entry) => {
      const next = [Number(entry.dataset.painterRow), Number(entry.dataset.painterCol)];
      if (!next.every(Number.isFinite)) failures.push(`non-finite context painter position at ${entry.dataset.assetId}`);
      if (next[0] < previous[0] || (next[0] === previous[0] && next[1] < previous[1])) {
        failures.push(`context painter order regressed at ${entry.dataset.assetId}`);
      }
      previous = next;
    });
    if (failures.length) throw new Error(failures.join('\n'));

    const horizontalOverflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    if (horizontalOverflow > 1) throw new Error(`Page has ${horizontalOverflow}px horizontal overflow`);

    return {
      name: viewportName,
      width: viewportWidth,
      height: viewportHeight,
      inventoryCount: expected,
      uniqueCardIds: new Set(cardIds).size,
      loadedSpriteIds: unique.size,
      spriteInstances: images.length,
      terrainSkins: document.querySelectorAll('[data-showcase-section="terrain-skins"] [data-skin]').length,
      decorationFixtures: document.querySelectorAll('[data-showcase-section="decorations"] [data-density]').length,
      mountainPieces: mountainPieces.length,
      contextInteractables,
      contextDecorations,
      contextPainterEntries: contextPainterEntries.length,
      horizontalOverflow,
    };
  }, { name, width, height });
}

async function capture(page: Page, selector: string, filename: string): Promise<void> {
  const element = await page.$(selector);
  if (!element) throw new Error(`Missing screenshot selector ${selector}`);
  await element.screenshot({ path: `${output}/${filename}` });
}

mkdirSync(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });
const audits: ViewportAudit[] = [];
const consoleErrors: string[] = [];

try {
  const page = await browser.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(
    error instanceof Error ? error.message : String(error),
  ));
  const url = new URL(baseUrl);
  url.searchParams.set('adventure-showcase', '1');

  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.goto(url.href, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.adventure-showcase-shell[data-ready="true"]');
  audits.push(await audit(page, 'desktop', 1600, 1000));
  await page.screenshot({ path: `${output}/01-overview-desktop.png` });
  await capture(page, '[data-showcase-section="terrain-skins"]', '02-terrain-skins-desktop.png');
  await capture(page, '[data-showcase-section="mountains"]', '03-mountains-desktop.png');
  await capture(page, '[data-showcase-section="decorations"]', '04-decorations-desktop.png');
  await capture(page, '[data-showcase-section="interaction-hierarchy"]', '05-interaction-hierarchy-desktop.png');
  for (const [index, category] of [
    'terrain', 'overlay', 'decoration', 'map-object', 'castle', 'hero', 'guardian-unit',
  ].entries()) {
    await capture(page, `[data-showcase-section="${category}"]`,
      `${String(index + 6).padStart(2, '0')}-atlas-${category}-desktop.png`);
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.adventure-showcase-shell[data-ready="true"]');
  audits.push(await audit(page, 'narrow', 390, 844));
  await page.screenshot({ path: `${output}/13-overview-narrow.png` });
  await capture(page, '[data-showcase-section="terrain-skins"]', '14-terrain-skins-narrow.png');
  await capture(page, '[data-showcase-section="mountains"]', '15-mountains-narrow.png');
  await capture(page, '[data-showcase-section="decorations"]', '16-decorations-narrow.png');
  await capture(page, '[data-showcase-section="interaction-hierarchy"]', '17-interaction-hierarchy-narrow.png');
  await capture(page, '[data-showcase-section="map-object"]', '18-atlas-map-object-narrow.png');
} finally {
  await browser.close();
}

if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
writeFileSync(`${output}/audit.json`, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  pixelScale: 1,
  audits,
}, null, 2)}\n`);
console.log(`ok adventure showcase · ${audits[0].inventoryCount} catalog-derived audit cards · ${audits[0].terrainSkins} terrain/skin pairs`);
console.log(`ok native image geometry · ${audits[0].loadedSpriteIds} unique displayed sprites · ${audits[0].mountainPieces} composed mountain pieces`);
console.log(`ok desktop ${audits[0].width}x${audits[0].height} · narrow ${audits[1].width}x${audits[1].height} · no horizontal overflow`);
console.log(output);
