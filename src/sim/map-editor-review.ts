import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import puppeteer, { type ElementHandle, type Page } from 'puppeteer-core';
import { promoteMapFile } from '../../scripts/promoteMap';
import {
  hashEditorMapDocument, parseEditorMapDocument, validateEditorMapForPlay,
} from '../core/mapEditor';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = resolve('.pixel-work/review/map-editor');
mkdirSync(output, { recursive: true });

const mapId = 'acceptance-archipelago';
const copyId = `${mapId}-copy`;
const exportedPath = join(output, `${mapId}.vam-map.json`);
const requiredMapPath = join(output, `${copyId}.vam-map.json`);
for (const path of [exportedPath, requiredMapPath]) if (existsSync(path)) unlinkSync(path);

async function frames(page: Page, count = 2): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
  }
}

async function clickButton(page: Page, text: string, scope = 'body'): Promise<void> {
  await page.$eval(scope, (root, label) => {
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
    const button = buttons.find((candidate) => (candidate.getAttribute('aria-label')
      ?? (candidate.textContent ?? '').replace(/\s+/g, ' ').trim()
      ?? candidate.getAttribute('title') ?? '') === label)
      ?? buttons.find((candidate) => (candidate.getAttribute('aria-label')
        ?? (candidate.textContent ?? '').replace(/\s+/g, ' ').trim()
        ?? candidate.getAttribute('title') ?? '').includes(label));
    if (!button) throw new Error(`Button containing "${label}" was not found in ${root.nodeName}`);
    if (button.disabled) throw new Error(`Button "${label}" is disabled: ${button.title}`);
    button.click();
  }, text);
  await frames(page);
}

async function setLabelValue(
  page: Page, scope: string, labelText: string, value: string,
): Promise<void> {
  await page.$eval(scope, (root, payload) => {
    const label = [...root.querySelectorAll<HTMLLabelElement>('label')].find((candidate) =>
      (candidate.textContent ?? '').replace(/\s+/g, ' ').trim().startsWith(payload.label));
    const control = label?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    );
    if (!control) throw new Error(`Control labelled "${payload.label}" was not found`);
    const owner = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(owner, 'value')!.set!.call(control, payload.value);
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', {
      bubbles: true,
    }));
  }, { label: labelText, value });
  await frames(page);
}

async function setAriaValue(page: Page, ariaLabel: string, value: string): Promise<void> {
  const selector = `[aria-label="${ariaLabel}"]`;
  const tag = await page.$eval(selector, (node) => node.tagName);
  if (tag === 'SELECT') await page.select(selector, value);
  else await page.$eval(selector, (control, next) => {
    const input = control as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await frames(page);
}

async function cellPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  await page.$eval('.editor-canvas-viewport', (node, target) => {
    const viewport = node as HTMLElement;
    const canvas = viewport.querySelector('canvas')!;
    const width = Number(canvas.getAttribute('width'));
    const height = Number(canvas.getAttribute('height'));
    const cssWidth = canvas.getBoundingClientRect().width;
    const cssHeight = canvas.getBoundingClientRect().height;
    canvas.scrollIntoView({ block: 'center', inline: 'nearest' });
    viewport.scrollTo({
      left: cssWidth * ((target.x + .5) / (width / 32)) - viewport.clientWidth / 2,
      top: cssHeight * ((target.y + .5) / (height / 32)) - viewport.clientHeight / 2,
    });
  }, { x, y });
  await frames(page);
  const point = await page.$eval('.editor-canvas-stage canvas', (node, target) => {
    const canvas = node as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    return {
      x: box.left + (target.x + .5) / (canvas.width / 32) * box.width,
      y: box.top + (target.y + .5) / (canvas.height / 32) * box.height,
    };
  }, { x, y });
  const hit = await page.evaluate((target) => {
    const node = document.elementFromPoint(target.x, target.y);
    return { tag: node?.tagName ?? '', className: node?.getAttribute('class') ?? '' };
  }, point);
  if (hit.tag !== 'CANVAS') throw new Error(
    `Canvas cell ${x},${y} is not pointer-visible at ${point.x},${point.y}: ${JSON.stringify(hit)}`,
  );
  return point;
}

async function clickCell(page: Page, x: number, y: number): Promise<void> {
  const point = await cellPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
  await frames(page);
}

async function dragCells(
  page: Page, start: { x: number; y: number }, end: { x: number; y: number },
): Promise<void> {
  const from = await cellPoint(page, start.x, start.y);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const to = await cellPoint(page, end.x, end.y);
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await frames(page);
}

async function waitForFile(path: string): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (!existsSync(path) && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  if (!existsSync(path)) throw new Error(`Expected browser download was not written: ${path}`);
}

async function chooseFile(page: Page, path: string): Promise<void> {
  const input = await page.$('.editor-file-input') as ElementHandle<HTMLInputElement> | null;
  if (!input) throw new Error('Portable-map file input is missing');
  await input.uploadFile(path);
  await frames(page, 3);
}

async function auditLayout(page: Page, label: string): Promise<void> {
  const audit = await page.evaluate(() => ({
    rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    paletteOverflow: document.querySelector('.editor-palette')
      ? document.querySelector<HTMLElement>('.editor-palette')!.scrollWidth
        - document.querySelector<HTMLElement>('.editor-palette')!.clientWidth : 0,
    focusVisible: document.activeElement instanceof HTMLElement
      && document.activeElement.getBoundingClientRect().width > 0,
  }));
  if (audit.rootOverflow > 2 || audit.paletteOverflow > 2) {
    throw new Error(`${label} overflows horizontally: ${JSON.stringify(audit)}`);
  }
}

function verifyPromotionReady(path: string): { hash: string; diagnostics: number } {
  const contents = readFileSync(path, 'utf8');
  const parsed = parseEditorMapDocument(contents);
  if (!parsed.document) throw new Error(`Export is not a portable map: ${JSON.stringify(parsed.diagnostics)}`);
  const authored = parsed.document;
  const deepwood = authored.tiles.flat().filter((tile) => tile.terrain === 'deepwood').length;
  const mountains = authored.tiles.flat().filter((tile) => tile.terrain === 'mountain').length;
  const p1Castle = authored.castles.find((castle) => castle.owner === 'p1');
  const p2Castle = authored.castles.find((castle) => castle.owner === 'p2');
  const p1Hero = authored.heroes.find((hero) => hero.owner === 'p1');
  const p2Hero = authored.heroes.find((hero) => hero.owner === 'p2');
  const guardian = authored.guardians[0];
  if (deepwood < 10 || mountains < 5
      || authored.tiles[1][25].terrain !== 'meadow'
      || !authored.objects.some((object) => object.kind === 'obstacle')
      || !authored.objects.some((object) => object.kind === 'windmill')
      || authored.players[0]?.faction !== 'woundWrights'
      || authored.players[1]?.faction !== 'hagwood'
      || p1Castle?.faction !== 'hagwood' || p2Castle?.faction !== 'vespiary'
      || p1Hero?.faction !== 'woundWrights' || p2Hero?.faction !== 'wildergrass'
      || guardian?.army[0]?.count !== 37
      || !guardian.protects?.startsWith('windmill')
      || !authored.rewards.some((reward) => reward.bundle.artifacts.length)
      || !authored.rewards.some((reward) => reward.bundle.items.length)
      || !authored.rewards.some((reward) => Object.values(reward.bundle.resources)
        .some((amount) => amount > 0))
      || authored.overlays.roads.length < 7) {
    throw new Error('Canonical export does not preserve every exercised authoring category, independent owner/faction choice, guardian count/link, undo/redo shape, or pointer-cancel result.');
  }
  const diagnostics = validateEditorMapForPlay(parsed.document)
    .filter((item) => item.severity === 'error');
  if (diagnostics.length) throw new Error(
    `Export is not promotion-ready: ${diagnostics.map((item) => `${item.code}: ${item.message}`).join('; ')}`,
  );
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'vam-map-promotion-review-'));
  try {
    const authored = join(temporaryRoot, 'src/content/maps/authored');
    mkdirSync(authored, { recursive: true });
    writeFileSync(join(authored, 'index.ts'), [
      '// PROMOTED_MAP_IMPORTS',
      'export const PROMOTED_MAPS = [',
      '  // PROMOTED_MAP_ENTRIES',
      '];',
      '',
    ].join('\n'));
    const promoted = promoteMapFile(path, false, temporaryRoot);
    const copied = readFileSync(join(temporaryRoot, promoted.assetPath), 'utf8');
    if (copied !== contents) throw new Error('Promotion changed the canonical exported bytes');
    promoteMapFile(path, true, temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  return { hash: hashEditorMapDocument(parsed.document), diagnostics: parsed.diagnostics.length };
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: output });
  page.on('pageerror', (error) => {
    throw new Error(`Browser page error: ${error instanceof Error ? error.message : String(error)}`);
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(Crypto.prototype, 'getRandomValues', {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array && 'length' in array) (array as Uint32Array)[0] = 50_500_013;
        return array;
      },
    });
  });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await clickButton(page, 'Map Editor', '.menu-modes');
  await page.waitForSelector('[data-surface="map-editor-library"]');
  await auditLayout(page, 'desktop library');
  await page.screenshot({ path: join(output, '01-library-desktop.png') });

  await setLabelValue(page, '.new-map-card', 'Map ID', mapId);
  await setLabelValue(page, '.new-map-card', 'Map name', 'Acceptance Archipelago');
  await setLabelValue(page, '.new-map-card', 'Width', '28');
  await setLabelValue(page, '.new-map-card', 'Height', '20');
  await setLabelValue(page, '.new-map-card', 'Player slots', '2');
  await clickButton(page, 'Create map', '.new-map-card');
  await page.waitForSelector('[data-surface="map-editor-workspace"]');
  await page.click('.editor-identity summary');
  await setLabelValue(page, '.editor-identity', 'Objective presentation',
    'Chart the archipelago and outlast every rival claim.');
  await setLabelValue(page, '.editor-identity', 'Objective rules',
    'Defeat every active opponent and hold the final surviving claim.');

  const paletteOrder = await page.$$eval('[data-palette-order]', (sections) => sections.map((section) => ({
    order: Number(section.getAttribute('data-palette-order')),
    heading: section.querySelector('h3')?.textContent?.trim() ?? '',
  })));
  if (paletteOrder.map((entry) => entry.order).join(',') !== '1,2,3,4,5,6,7,8,9') {
    throw new Error(`Palette order is not canonical: ${JSON.stringify(paletteOrder)}`);
  }
  await page.$$eval('.editor-player-slots article', (players) => {
    const choices = [
      { controller: 'human', faction: 'woundWrights', name: 'Crimson Cartographer' },
      { controller: 'ai', faction: 'hagwood', name: 'Azure Surveyor' },
    ];
    players.forEach((player, index) => {
      const [controller, faction] = player.querySelectorAll<HTMLSelectElement>('select');
      const name = player.querySelector<HTMLInputElement>('input')!;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
        .call(controller, choices[index].controller);
      controller.dispatchEvent(new Event('change', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
        .call(faction, choices[index].faction);
      faction.dispatchEvent(new Event('change', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, choices[index].name);
      name.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await frames(page, 4);

  // Text entry owns keyboard shortcuts; the same key on the focused canvas selects a tool.
  const detailsName = await page.$('.editor-identity label input');
  if (!detailsName) throw new Error('Map name field is missing');
  await detailsName.focus();
  const nameBefore = await detailsName.evaluate((input) => (input as HTMLInputElement).value);
  const toolBefore = await page.$eval('.editor-canvas-viewport', (node) =>
    (node as HTMLElement).dataset.tool);
  await page.keyboard.type('p');
  if (await page.$eval('.editor-canvas-viewport', (node) =>
    (node as HTMLElement).dataset.tool) !== toolBefore) {
    throw new Error('Typing in metadata unexpectedly changed the canvas tool');
  }
  await page.keyboard.press('Backspace');
  if (await detailsName.evaluate((input) => (input as HTMLInputElement).value) !== nameBefore) {
    throw new Error('Metadata keyboard focus did not preserve text editing');
  }

  await clickButton(page, 'Deepwood', '.editor-terrain-choices');
  await clickButton(page, 'Brush', '.editor-toolstrip');
  await page.$eval('.editor-toolstrip input[type="range"]', (input) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '2');
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await dragCells(page, { x: 3, y: 16 }, { x: 8, y: 16 });
  await clickButton(page, 'Rectangle', '.editor-toolstrip');
  await dragCells(page, { x: 0, y: 18 }, { x: 3, y: 19 });

  await clickButton(page, 'Mountain terrain', '.editor-prop-palette');
  await clickButton(page, 'Pencil', '.editor-toolstrip');
  await dragCells(page, { x: 9, y: 2 }, { x: 12, y: 2 });
  await clickButton(page, 'Ellipse', '.editor-toolstrip');
  await dragCells(page, { x: 9, y: 3 }, { x: 12, y: 5 });
  const canvas = await page.$('.editor-canvas-stage canvas');
  if (!canvas) throw new Error('Editor canvas is missing');
  await canvas.focus();
  await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
  await page.keyboard.down('Control'); await page.keyboard.press('y'); await page.keyboard.up('Control');
  await frames(page);

  // A cancelled pointer stroke must never become an undoable document edit.
  await clickButton(page, 'Deepwood', '.editor-terrain-choices');
  await clickButton(page, 'Pencil', '.editor-toolstrip');
  const cancelledStart = await cellPoint(page, 25, 1);
  await page.mouse.move(cancelledStart.x, cancelledStart.y);
  await page.mouse.down();
  const cancelledEnd = await cellPoint(page, 26, 1);
  await page.mouse.move(cancelledEnd.x, cancelledEnd.y);
  await page.$eval('.editor-canvas-stage canvas', (node) => node.dispatchEvent(new PointerEvent(
    'pointercancel', { bubbles: true, pointerId: 1, pointerType: 'mouse' },
  )));
  await page.mouse.up();
  await frames(page);
  await page.screenshot({ path: join(output, '02-painted-desktop.png') });

  await page.$eval('.editor-prop-group button', (button) => (button as HTMLButtonElement).click());
  await clickCell(page, 18, 3);

  await clickButton(page, 'Windmill', '.editor-structure-palette');
  await clickCell(page, 14, 8);
  if (!await page.$('#editor-object-inspector-title')) {
    const structureState = await page.evaluate(() => ({
      message: document.querySelector('.editor-canvas-message')?.textContent ?? '',
      tool: document.querySelector<HTMLElement>('.editor-canvas-viewport')?.dataset.tool,
      selectedKind: document.querySelector<HTMLButtonElement>(
        '.editor-structure-palette .editor-icon-button.selected',
      )?.getAttribute('aria-label'),
    }));
    throw new Error(`Structure stamp did not select an object: ${JSON.stringify(structureState)}`);
  }

  await page.select('select[aria-label="Castle owner flag"]', 'p1');
  await clickButton(page, 'Hagwood castle', '.editor-castle-palette');
  await clickCell(page, 2, 2);
  await page.select('select[aria-label="Castle owner flag"]', 'p2');
  await clickButton(page, 'Vespiary castle', '.editor-castle-palette');
  await clickCell(page, 22, 15);

  await page.select('select[aria-label="Hero owner flag"]', 'p1');
  await page.select('select[aria-label="Hero faction"]', 'woundWrights');
  await frames(page);
  await clickButton(page, 'Place', '.editor-hero-palette');
  await clickCell(page, 6, 4);
  await page.select('select[aria-label="Hero owner flag"]', 'p2');
  await page.select('select[aria-label="Hero faction"]', 'wildergrass');
  await frames(page);
  await clickButton(page, 'Place', '.editor-hero-palette');
  await clickCell(page, 21, 13);

  await page.$eval('.editor-guardian-choice', (button) => (button as HTMLButtonElement).click());
  await clickCell(page, 14, 7);
  await setAriaValue(page, 'Guardian army stack 1 count', '37');
  const guardianCountReachable = await page.$eval(
    'input[aria-label="Guardian army stack 1 count"]',
    (input) => {
      input.scrollIntoView({ block: 'center' });
      const field = input.getBoundingClientRect();
      const column = input.closest('.editor-canvas-column')!.getBoundingClientRect();
      return field.top >= column.top && field.bottom <= column.bottom;
    },
  );
  if (!guardianCountReachable) throw new Error('Selected guardian count is clipped outside the scrollable canvas column.');
  const protectTarget = await page.$eval('select[aria-label="Guardian protects object"]', (select) =>
    [...(select as HTMLSelectElement).options]
      .find((option) => (option.textContent ?? '').includes('windmill'))?.value ?? '');
  if (!protectTarget) {
    const placementState = await page.evaluate(() => ({
      message: document.querySelector('.editor-canvas-message')?.textContent ?? '',
      protectOptions: [...document.querySelectorAll<HTMLOptionElement>(
        'select[aria-label="Guardian protects object"] option',
      )].map((option) => ({ value: option.value, text: option.textContent })),
      tool: document.querySelector<HTMLElement>('.editor-canvas-viewport')?.dataset.tool,
    }));
    throw new Error(`Placed structure was not offered as a guardian target: ${JSON.stringify(placementState)}`);
  }
  await page.select('select[aria-label="Guardian protects object"]', protectTarget);
  await frames(page);

  await page.$eval('.editor-artifact-palette .editor-icon-button', (button) =>
    (button as HTMLButtonElement).click());
  await clickCell(page, 10, 10);
  await page.$eval('.editor-item-palette .editor-icon-button', (button) =>
    (button as HTMLButtonElement).click());
  await clickCell(page, 11, 10);
  await clickButton(page, 'gold reward', '.editor-resource-shortcuts');
  await clickCell(page, 12, 10);
  await clickButton(page, 'Road overlay', '.editor-rewards-palette');
  await dragCells(page, { x: 1, y: 11 }, { x: 7, y: 11 });
  await frames(page, 4);

  const diagnosticText = await page.$eval('.editor-diagnostics header strong', (node) =>
    node.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  if (!diagnosticText.startsWith('0 errors')) {
    const diagnostics = await page.$$eval('.editor-diagnostics li', (items) =>
      items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim()));
    throw new Error(`Authored review map is not playable (${diagnosticText}): ${diagnostics.join(' | ')}`);
  }
  await page.$eval('.editor-canvas-panel', (node) => node.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: join(output, '03-all-categories-desktop.png') });

  await clickButton(page, 'Save draft', '.editor-topbar');
  await page.waitForFunction(() => document.querySelector('.editor-notice')?.textContent?.includes('saved locally'));
  await clickButton(page, 'Map library', '.editor-topbar');
  await page.waitForSelector('[data-surface="map-editor-library"]');
  await page.$eval('.editor-local-list article', (article) => {
    const open = [...article.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Open');
    if (!open) throw new Error('Saved map has no Open action');
    open.click();
  });
  await page.waitForSelector('[data-surface="map-editor-workspace"]');
  await clickButton(page, 'Export map', '.editor-topbar');
  await waitForFile(exportedPath);
  const promotion = verifyPromotionReady(exportedPath);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.$eval('.editor-canvas-panel', (node) => node.scrollIntoView({ block: 'start' }));
  await auditLayout(page, '390px workspace');
  await page.screenshot({ path: join(output, '04-workspace-390.png') });

  await clickButton(page, 'Map library', '.editor-topbar');
  await page.waitForSelector('[data-surface="map-editor-library"]');
  await chooseFile(page, exportedPath);
  await page.waitForSelector('#import-collision-title');
  const focusedInCollision = await page.evaluate(() => Boolean(
    document.activeElement?.closest('[role="dialog"]'),
  ));
  if (!focusedInCollision) throw new Error('Import collision did not move focus into its dialog');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#import-collision-title', { hidden: true });
  if (!await page.$eval('.editor-file-input', (input) => input === document.activeElement)) {
    throw new Error('Escape did not restore focus to the import control');
  }
  await chooseFile(page, exportedPath);
  await page.waitForSelector('#import-collision-title');
  await setLabelValue(page, '.editor-confirm', 'Copy ID', copyId);
  await setLabelValue(page, '.editor-confirm', 'Copy name', 'Acceptance Archipelago Copy');
  await clickButton(page, 'Import as copy', '.editor-confirm');
  await page.waitForSelector('[data-surface="map-editor-workspace"]');
  const copiedIdentity = await page.$eval('.editor-topbar small', (node) => node.textContent ?? '');
  if (!copiedIdentity.includes(copyId)) throw new Error(`Import-as-copy opened wrong map: ${copiedIdentity}`);
  await page.screenshot({ path: join(output, '05-imported-copy-390.png') });

  await clickButton(page, 'Test play', '.editor-topbar');
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) await clickButton(page, 'Take the field', '.choice-dialog');
  const runtime = await page.evaluate(() => ({
    title: document.querySelector('.adventure-status-strip .turn-badge')?.textContent ?? '',
    mapId: document.querySelector('.adventure-shell')?.textContent ?? '',
  }));
  if (!runtime.title.includes('Day 1')) throw new Error(`Local test play did not launch: ${JSON.stringify(runtime)}`);
  await auditLayout(page, '390px local test play');
  await page.screenshot({ path: join(output, '06-test-play-390.png') });

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await clickButton(page, 'Menu & saves', '.rail-commands');
  await page.waitForSelector('.command-menu-dialog');
  if (!await page.$eval('.command-menu-dialog', (dialog) =>
    [...dialog.querySelectorAll('button')].some((button) => button.textContent?.includes('Export required map')))) {
    throw new Error('Local campaign menu does not offer its matching map export');
  }
  await clickButton(page, 'Export required map', '.command-menu-dialog');
  await waitForFile(requiredMapPath);
  await page.screenshot({ path: join(output, '07-local-campaign-exports-desktop.png') });
  await clickButton(page, 'Return to title', '.command-menu-dialog');
  await page.waitForSelector('.title-exit-dialog');
  await clickButton(page, 'Leave and return to title', '.title-exit-dialog');
  await page.waitForSelector('[data-surface="map-editor-workspace"]');
  if (!await page.$eval('.editor-topbar small', (node, expectedId) =>
    node.textContent?.includes(expectedId), copyId)) {
    throw new Error('Test play did not return to its originating editor workspace');
  }
  await page.screenshot({ path: join(output, '08-returned-workspace-desktop.png') });

  // Exercise a large but ordinary editor document without relying on ambient timing or scrolling.
  await clickButton(page, 'Map library', '.editor-topbar');
  await page.waitForSelector('[data-surface="map-editor-library"]');
  await setLabelValue(page, '.new-map-card', 'Map ID', 'acceptance-large-map');
  await setLabelValue(page, '.new-map-card', 'Map name', 'Acceptance Large Map');
  await setLabelValue(page, '.new-map-card', 'Width', '128');
  await setLabelValue(page, '.new-map-card', 'Height', '128');
  await setLabelValue(page, '.new-map-card', 'Player slots', '1');
  const creationStarted = performance.now();
  await clickButton(page, 'Create map', '.new-map-card');
  await page.waitForSelector('.editor-canvas-stage canvas[width="4096"][height="4096"]');
  await frames(page, 3);
  const creationMs = performance.now() - creationStarted;
  const paintStarted = performance.now();
  await clickButton(page, 'Deepwood', '.editor-terrain-choices');
  await clickButton(page, 'Rectangle', '.editor-toolstrip');
  await dragCells(page, { x: 56, y: 56 }, { x: 72, y: 72 });
  const paintMs = performance.now() - paintStarted;
  if (creationMs > 8_000 || paintMs > 5_000) {
    throw new Error(`Large-map interaction exceeded review budget: create ${creationMs.toFixed(0)}ms, paint ${paintMs.toFixed(0)}ms`);
  }
  await page.$eval('.editor-canvas-panel', (node) => node.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: join(output, '09-large-map-desktop.png') });

  const requiredContents = readFileSync(requiredMapPath, 'utf8');
  const requiredParsed = parseEditorMapDocument(requiredContents).document;
  if (!requiredParsed || requiredParsed.id !== copyId || requiredParsed.revision !== 1) {
    throw new Error('Local campaign exported a draft or the wrong frozen map revision');
  }
  console.log(JSON.stringify({
    result: 'Map editor review passed', output, palette: paletteOrder.map((entry) => entry.heading),
    mapHash: promotion.hash, exportDiagnostics: promotion.diagnostics,
    largeMap: { dimensions: '128x128', creationMs: Math.round(creationMs), paintMs: Math.round(paintMs) },
    screenshots: 9,
  }, null, 2));
} finally {
  await browser.close();
}
