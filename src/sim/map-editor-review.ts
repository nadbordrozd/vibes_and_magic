import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import puppeteer, { type ElementHandle, type Page } from 'puppeteer-core';
import { promoteMapFile } from '../../scripts/promoteMap';
import {
  convertEditorMapDocument, EDITOR_GUARDIAN_BASE_COUNTS, EDITOR_RANDOM_GUARDIAN_UNITS,
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

async function auditSelectedGuardian(page: Page, label: string): Promise<number> {
  const audit = await page.$eval(
    'input[aria-label="Guardian army stack 1 count"]',
    (input) => {
      input.scrollIntoView({ block: 'center', inline: 'nearest' });
      const field = input.getBoundingClientRect();
      const column = input.closest('.editor-canvas-column')!.getBoundingClientRect();
      return {
        count: Number((input as HTMLInputElement).value),
        heading: document.querySelector('#editor-guardian-inspector-title')?.textContent?.trim() ?? '',
        field: { top: field.top, bottom: field.bottom, left: field.left, right: field.right },
        column: { top: column.top, bottom: column.bottom, left: column.left, right: column.right },
      };
    },
  );
  if (!audit.heading || audit.count < 1
      || audit.field.top < audit.column.top || audit.field.bottom > audit.column.bottom
      || audit.field.left < audit.column.left || audit.field.right > audit.column.right) {
    throw new Error(`${label} selected guardian inspector is not reachable: ${JSON.stringify(audit)}`);
  }
  return audit.count;
}

async function auditIconPalette(page: Page, label: string): Promise<void> {
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll<HTMLImageElement>(
      '.editor-castle-grid img, .editor-guardian-catalog img',
    )];
    return images.length === 56 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, { timeout: 30_000 });
  const audit = await page.evaluate(() => {
    const cities = [...document.querySelectorAll<HTMLButtonElement>('.editor-castle-stamp')];
    const guardians = [...document.querySelectorAll<HTMLButtonElement>('.editor-guardian-choice')];
    const randomTiers = [...document.querySelectorAll<HTMLButtonElement>('.editor-random-guardian')];
    const cityImages = cities.map((button) => button.querySelector<HTMLImageElement>('img')!);
    const guardianImages = guardians.map((button) => button.querySelector<HTMLImageElement>('img')!);
    return {
      cities: cities.length,
      guardians: guardians.length,
      randomTiers: randomTiers.length,
      namedCities: cities.every((button) => Boolean(button.getAttribute('aria-label'))),
      namedGuardians: guardians.every((button) => Boolean(button.getAttribute('aria-label'))),
      iconOnlyGuardians: guardians.every((button) => (button.textContent ?? '').trim() === ''),
      cityNativeSizes: [...new Set(cityImages.map((image) =>
        `${image.naturalWidth}x${image.naturalHeight}`))],
      minCityIcon: Math.min(...cityImages.map((image) => image.getBoundingClientRect().width)),
      minGuardianIcon: Math.min(...guardianImages.map((image) => image.getBoundingClientRect().width)),
      guardianFallbacks: document.querySelectorAll('.editor-guardian-fallback').length,
    };
  });
  if (audit.cities !== 6 || audit.guardians !== 50 || audit.randomTiers !== 6
      || !audit.namedCities || !audit.namedGuardians || !audit.iconOnlyGuardians
      || audit.cityNativeSizes.join(',') !== '160x160'
      || audit.minCityIcon < 63 || audit.minGuardianIcon < 45 || audit.guardianFallbacks) {
    throw new Error(`${label} icon palette audit failed: ${JSON.stringify(audit)}`);
  }
}

function verifyPromotionReady(path: string): {
  hash: string;
  diagnostics: number;
  randomGuardian: { tier: number; count: number; resolvedUnitId: string };
} {
  const contents = readFileSync(path, 'utf8');
  const parsed = parseEditorMapDocument(contents);
  if (!parsed.document) throw new Error(`Export is not a portable map: ${JSON.stringify(parsed.diagnostics)}`);
  const authored = parsed.document;
  const deepwood = authored.tiles.flat().filter((tile) => tile.terrain === 'deepwood').length;
  const mountains = authored.tiles.flat().filter((tile) => tile.terrain === 'mountain').length;
  const p1Castle = authored.castles.find((castle) => castle.owner === 'p1');
  const p2Castle = authored.castles.find((castle) => castle.owner === 'p2');
  const neutralCity = authored.castles.find((castle) => castle.owner === 'neutral');
  const p1Hero = authored.heroes.find((hero) => hero.owner === 'p1');
  const p2Hero = authored.heroes.find((hero) => hero.owner === 'p2');
  const guardian = authored.guardians[0];
  const randomGuardian = authored.guardians.find((candidate) =>
    candidate.army.some((stack) => 'randomTier' in stack));
  const randomStack = randomGuardian?.army.find((stack) => 'randomTier' in stack);
  const preservation = {
    deepwood: deepwood >= 10, mountains: mountains >= 5,
    pointerCancel: authored.tiles[1][25].terrain === 'meadow',
    obstacle: authored.objects.some((object) => object.kind === 'obstacle'),
    windmill: authored.objects.some((object) => object.kind === 'windmill'
      && object.properties.rareResource === 'essence'),
    playerFactions: authored.players[0]?.faction === 'woundWrights'
      && authored.players[1]?.faction === 'hagwood',
    ownedCities: p1Castle?.faction === 'hagwood' && p2Castle?.faction === 'vespiary',
    neutralCity: neutralCity?.faction === 'unfinished' && neutralCity.garrison === undefined,
    cityGeometry: authored.castles.every((city) => (!city.footprint
      || city.footprint.w === 5 && city.footprint.h === 2)
      && (!city.entrance || city.entrance.dx === 2 && city.entrance.dy === 1)),
    heroes: p1Hero?.faction === 'woundWrights' && p2Hero?.faction === 'wildergrass',
    guardian: guardian?.army[0]?.count === 37 && guardian.protects?.startsWith('windmill'),
    randomGuardian: randomGuardian && randomStack && 'randomTier' in randomStack
      && randomStack.randomTier === 4
      && randomStack.count >= Math.round(EDITOR_GUARDIAN_BASE_COUNTS[4] * .8)
      && randomStack.count <= Math.round(EDITOR_GUARDIAN_BASE_COUNTS[4] * 1.2)
      && randomGuardian.protects?.startsWith('waystation'),
    artifactReward: authored.rewards.some((reward) => reward.bundle.artifacts.length),
    itemReward: authored.rewards.some((reward) => reward.bundle.items.length),
    resourceReward: authored.rewards.some((reward) => Object.values(reward.bundle.resources)
      .some((amount) => amount > 0)),
    roads: authored.overlays.roads.length >= 7,
  };
  if (Object.values(preservation).some((preserved) => !preserved)) {
    throw new Error(`Canonical export lost exercised authoring data: ${JSON.stringify(preservation)}`);
  }
  const diagnostics = validateEditorMapForPlay(parsed.document)
    .filter((item) => item.severity === 'error');
  if (diagnostics.length) throw new Error(
    `Export is not promotion-ready: ${diagnostics.map((item) => `${item.code}: ${item.message}`).join('; ')}`,
  );
  if (!randomGuardian || !randomStack || !('randomTier' in randomStack)) {
    throw new Error('Export lost the authored random-tier guardian placeholder');
  }
  const resolveRandomGuardian = (seed: number) => {
    const converted = convertEditorMapDocument(authored, seed);
    const runtimeGuardian = converted.map.objects.find((object) =>
      object.kind === 'guardian' && object.id === randomGuardian.id);
    if (!runtimeGuardian || runtimeGuardian.kind !== 'guardian') {
      throw new Error(`Converted random guardian ${randomGuardian.id} is missing`);
    }
    return runtimeGuardian.army[0].unitId;
  };
  const resolvedUnitId = resolveRandomGuardian(50_500_013);
  if (resolvedUnitId !== resolveRandomGuardian(50_500_013)
      || !EDITOR_RANDOM_GUARDIAN_UNITS[randomStack.randomTier].includes(resolvedUnitId)) {
    throw new Error(`Random guardian resolution is not seed-stable: ${resolvedUnitId}`);
  }
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
  return {
    hash: hashEditorMapDocument(parsed.document), diagnostics: parsed.diagnostics.length,
    randomGuardian: {
      tier: randomStack.randomTier, count: randomStack.count, resolvedUnitId,
    },
  };
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
  const defaultDetails = await page.$eval('.editor-identity', (node) => ({
    open: (node as HTMLDetailsElement).open,
    values: [...node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')]
      .map((control) => control.value),
  }));
  const expectedDefaults = [
    'Acceptance Archipelago', 'A custom map created in the in-game editor.',
    'Local mapmaker', '2-player conquest map',
    'Claim the realm before your rivals do.', 'Defeat every active opponent.',
  ];
  if (defaultDetails.open || JSON.stringify(defaultDetails.values) !== JSON.stringify(expectedDefaults)) {
    throw new Error(`Advanced map details are not collapsed with valid defaults: ${JSON.stringify(defaultDetails)}`);
  }
  await page.screenshot({ path: join(output, '01b-default-workspace-desktop.png') });
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
  await auditIconPalette(page, 'desktop');
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll<HTMLImageElement>(
      '.editor-artifact-palette .artifact-sprite, .editor-item-palette .item-sprite',
    )];
    return images.length === 127 && images.every((image) => image.complete
      && image.naturalWidth === 32 && image.naturalHeight === 32);
  }, { timeout: 30_000 });
  const collectiblePalette = await page.evaluate(() => ({
    artifacts: document.querySelectorAll('.editor-artifact-palette .artifact-sprite').length,
    items: document.querySelectorAll('.editor-item-palette .item-sprite').length,
    fallbacks: document.querySelectorAll(
      '.editor-artifact-palette .artifact-sprite-fallback, .editor-item-palette .item-sprite-fallback',
    ).length,
    uniquePaths: new Set([...document.querySelectorAll<HTMLImageElement>(
      '.editor-artifact-palette .artifact-sprite, .editor-item-palette .item-sprite',
    )].map((image) => image.getAttribute('src'))).size,
  }));
  if (collectiblePalette.artifacts !== 90 || collectiblePalette.items !== 37
      || collectiblePalette.fallbacks || collectiblePalette.uniquePaths !== 127) {
    throw new Error(`Collectible editor palette is incomplete: ${JSON.stringify(collectiblePalette)}`);
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
  if (await page.$('#editor-object-inspector-title')) {
    const structureState = await page.evaluate(() => ({
      message: document.querySelector('.editor-canvas-message')?.textContent ?? '',
      tool: document.querySelector<HTMLElement>('.editor-canvas-viewport')?.dataset.tool,
      selectedKind: document.querySelector<HTMLButtonElement>(
        '.editor-structure-palette .editor-icon-button.selected',
      )?.getAttribute('aria-label'),
    }));
    throw new Error(`Structure stamp opened details without an explicit selection: ${JSON.stringify(structureState)}`);
  }
  await page.screenshot({ path: join(output, '02a-structure-stamp-unselected-desktop.png') });
  await canvas.focus();
  await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
  await page.keyboard.down('Control'); await page.keyboard.press('y'); await page.keyboard.up('Control');
  await frames(page);
  if (await page.$('#editor-object-inspector-title')) {
    throw new Error('Structure undo/redo unexpectedly selected the restored stamp');
  }
  await clickButton(page, 'Select / move', '.editor-toolstrip');
  await clickCell(page, 14, 8);
  const selectedStructure = await page.$eval('.editor-object-inspector', (inspector) => ({
    heading: inspector.querySelector('h3')?.textContent?.trim() ?? '',
    rareResource: [...inspector.querySelectorAll<HTMLLabelElement>('label')]
      .find((label) => label.textContent?.trim().startsWith('Rare resource'))
      ?.querySelector<HTMLSelectElement>('select')?.value ?? '',
  }));
  if (selectedStructure.heading !== 'Windmill' || selectedStructure.rareResource !== 'iron') {
    throw new Error(`Explicit structure selection did not open editable details: ${JSON.stringify(selectedStructure)}`);
  }
  await setLabelValue(page, '.editor-object-inspector', 'Rare resource', 'essence');
  await page.screenshot({ path: join(output, '02b-structure-explicit-selection-desktop.png') });

  await page.select('select[aria-label="City owner flag"]', 'p1');
  await clickButton(page, 'Hagwood city', '.editor-castle-palette');
  await clickCell(page, 2, 2);
  await page.select('select[aria-label="City owner flag"]', 'p2');
  await clickButton(page, 'Vespiary city', '.editor-castle-palette');
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
  const defaultGuardian = await page.$eval('.editor-guardian-inspector', (inspector) => {
    const creature = inspector.querySelector<HTMLSelectElement>(
      'select[aria-label="Guardian army stack 1 creature"]',
    )!;
    const count = inspector.querySelector<HTMLInputElement>(
      'input[aria-label="Guardian army stack 1 count"]',
    )!;
    return { option: creature.selectedOptions[0].textContent?.trim() ?? '', count: Number(count.value) };
  });
  const placedTier = Number(defaultGuardian.option.match(/^T([1-6])/)?.[1]);
  const placedBase = EDITOR_GUARDIAN_BASE_COUNTS[placedTier as keyof typeof EDITOR_GUARDIAN_BASE_COUNTS];
  if (!placedBase || defaultGuardian.count < Math.round(placedBase * .8)
      || defaultGuardian.count > Math.round(placedBase * 1.2)) {
    throw new Error(`Placed guardian did not receive a tier-scaled ±20% count: ${JSON.stringify(defaultGuardian)}`);
  }
  await setAriaValue(page, 'Guardian army stack 1 count', '37');
  if (await auditSelectedGuardian(page, 'desktop') !== 37) {
    throw new Error('Desktop selected guardian count edit did not remain visible and editable.');
  }
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
  await page.screenshot({ path: join(output, '03a-selected-guardian-desktop.png') });

  await clickButton(page, 'Waystation', '.editor-structure-palette');
  await clickCell(page, 18, 13);
  await clickButton(page, 'Random tier 4 creature', '.editor-random-guardian-grid');
  await clickCell(page, 18, 12);
  const randomGuardian = await page.$eval('.editor-guardian-inspector', (inspector) => ({
    creature: inspector.querySelector<HTMLSelectElement>(
      'select[aria-label="Guardian army stack 1 creature"]',
    )!.value,
    count: Number(inspector.querySelector<HTMLInputElement>(
      'input[aria-label="Guardian army stack 1 count"]',
    )!.value),
  }));
  if (randomGuardian.creature !== 'random:4'
      || randomGuardian.count < Math.round(EDITOR_GUARDIAN_BASE_COUNTS[4] * .8)
      || randomGuardian.count > Math.round(EDITOR_GUARDIAN_BASE_COUNTS[4] * 1.2)) {
    throw new Error(`Random-tier stamp did not preserve its tier-scaled placeholder: ${JSON.stringify(randomGuardian)}`);
  }
  const randomProtectTarget = await page.$eval(
    'select[aria-label="Guardian protects object"]',
    (select) => [...(select as HTMLSelectElement).options]
      .find((option) => (option.textContent ?? '').includes('waystation'))?.value ?? '',
  );
  if (!randomProtectTarget) throw new Error('Placed Waystation was not offered to the random guardian');
  await page.select('select[aria-label="Guardian protects object"]', randomProtectTarget);
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

  // Keep the final desktop inspector on an inherited neutral defense so the review proves both
  // the 5×2 stamp and the presence-based omission contract in the actual authoring surface.
  await page.select('select[aria-label="City owner flag"]', 'neutral');
  await clickButton(page, 'Unfinished city', '.editor-castle-palette');
  await clickCell(page, 15, 16);
  const neutralInspector = await page.$eval('.editor-castle-inspector', (node) =>
    (node.textContent ?? '').replace(/\s+/g, ' ').trim());
  if (!neutralInspector.includes('Canonical 5×2 top-left footprint')
      || !neutralInspector.includes('Garrison Inherited from core')
      || !neutralInspector.includes('54 Candle-Wisps · 27 Couriers · 18 Sentries')) {
    throw new Error(`Neutral city inspector does not expose the inherited defense contract: ${neutralInspector}`);
  }

  const diagnosticText = await page.$eval('.editor-diagnostics header strong', (node) =>
    node.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  if (!diagnosticText.startsWith('0 errors')) {
    const diagnostics = await page.$$eval('.editor-diagnostics li', (items) =>
      items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim()));
    throw new Error(`Authored review map is not playable (${diagnosticText}): ${diagnostics.join(' | ')}`);
  }
  await page.$eval('.editor-canvas-panel', (node) => node.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: join(output, '03-all-categories-desktop.png') });
  await page.$eval('.editor-artifact-palette', (node) => node.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: join(output, '03c-collectible-palettes-desktop.png') });
  await cellPoint(page, 17, 17);
  await (await page.$('.editor-canvas-viewport'))!.screenshot({
    path: join(output, '03b-neutral-city-canvas-desktop.png'),
  });

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
  await auditIconPalette(page, '390px');
  const narrowCollectibles = await page.evaluate(() => ({
    artifacts: document.querySelectorAll('.editor-artifact-palette .artifact-sprite').length,
    items: document.querySelectorAll('.editor-item-palette .item-sprite').length,
    fallbacks: document.querySelectorAll(
      '.editor-artifact-palette .artifact-sprite-fallback, .editor-item-palette .item-sprite-fallback',
    ).length,
  }));
  if (narrowCollectibles.artifacts !== 90 || narrowCollectibles.items !== 37
      || narrowCollectibles.fallbacks) {
    throw new Error(`Narrow collectible editor palette is incomplete: ${JSON.stringify(narrowCollectibles)}`);
  }
  await page.screenshot({ path: join(output, '04-workspace-390.png') });
  await clickButton(page, 'Select / move', '.editor-toolstrip');
  await clickCell(page, 14, 8);
  const narrowStructure = await page.$eval('.editor-object-inspector', (inspector) => ({
    heading: inspector.querySelector('h3')?.textContent?.trim() ?? '',
    rareResource: [...inspector.querySelectorAll<HTMLLabelElement>('label')]
      .find((label) => label.textContent?.trim().startsWith('Rare resource'))
      ?.querySelector<HTMLSelectElement>('select')?.value ?? '',
  }));
  if (narrowStructure.heading !== 'Windmill' || narrowStructure.rareResource !== 'essence') {
    throw new Error(`390px explicit structure inspector is not usable: ${JSON.stringify(narrowStructure)}`);
  }
  await page.screenshot({ path: join(output, '04d-selected-structure-390.png') });
  await clickButton(page, 'Select / move', '.editor-toolstrip');
  await clickCell(page, 14, 7);
  if (await auditSelectedGuardian(page, '390px') !== 37) {
    throw new Error('390px selected guardian count edit did not remain visible and editable.');
  }
  await page.screenshot({ path: join(output, '04a-selected-guardian-390.png') });
  await page.$eval('.editor-artifact-palette', (node) => node.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: join(output, '04c-collectible-palettes-390.png') });
  await clickButton(page, 'Select / move', '.editor-toolstrip');
  await clickCell(page, 17, 17);
  await cellPoint(page, 17, 17);
  await (await page.$('.editor-canvas-viewport'))!.screenshot({
    path: join(output, '04b-neutral-city-canvas-390.png'),
  });

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
    collectibles: collectiblePalette, randomGuardian: promotion.randomGuardian, screenshots: 19,
  }, null, 2));
} finally {
  await browser.close();
}
