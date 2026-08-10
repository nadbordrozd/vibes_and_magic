import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { tile } from '../content/terrain';
import { apply, createGame } from '../core/game';
import { revealForPlayer } from '../core/map/visibility';
import type { Coord, GameState } from '../core/types';
import { actionSave, stateHash } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/incremental-fog';
mkdirSync(output, { recursive: true });

const route: Coord[] = [
  { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
  { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
];

function reviewState(): GameState {
  const state = createGame({ seed: 4803, p1: 'human', p2: 'dormant' });
  state.map = {
    ...state.map, width: 15, height: 9,
    terrain: Array.from({ length: 9 }, () =>
      Array.from({ length: 15 }, () => tile('meadow'))),
    objects: [], roads: [], seams: [],
  };
  state.castles = [];
  state.mapEffects = [];
  const hero = state.players.p1.hero!;
  hero.position = { ...route[0] };
  hero.movement = 5_000;
  hero.pathMemory = [];
  state.players.p1.heroes = [hero];
  state.players.p1.activeHeroId = hero.id;
  state.players.p1.hero = hero;
  state.players.p1.explored = revealForPlayer([], state.map, hero, []);
  state.players.p2.heroes.forEach((candidate) => { candidate.alive = false; });
  state.players.p2.explored = ['14,8'];
  state.replay = [];
  state.pendingChoice = null;
  return state;
}

async function loadState(page: Page, state: GameState): Promise<void> {
  await page.evaluate(({ save, initial }) => {
    localStorage.clear();
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
  }, { save: actionSave(state), initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.objective-primer', { hidden: true });
  await page.$$eval('button', (buttons) => {
    const button = buttons.find((candidate) => candidate.textContent?.includes('Menu & saves'));
    if (!(button instanceof HTMLButtonElement)) throw new Error('Menu & saves control missing');
    button.click();
  });
  await page.select('.command-menu-dialog select', 'slow');
  await page.locator('.command-menu-dialog .structure-dialog-close').click();
}

async function visibleExplored(page: Page): Promise<string[]> {
  return page.$$eval('[data-map-x][data-map-y][data-explored="true"]', (tiles) =>
    tiles.map((node) => `${node.getAttribute('data-map-x')},${node.getAttribute('data-map-y')}`)
      .sort());
}

function expectedPrefix(initial: GameState, index: number): string[] {
  let projected = structuredClone(initial);
  for (let step = 1; step <= index; step += 1) {
    const hero = projected.players.p1.hero!;
    projected.players.p1.explored = revealForPlayer(
      projected.players.p1.explored, projected.map,
      { ...hero, position: route[step] }, [],
    );
  }
  return projected.players.p1.explored.slice().sort();
}

const initial = reviewState();
const finalReducer = apply(initial, { type: 'MOVE_HERO', destination: route.at(-1)! });
const finalExplored = finalReducer.players.p1.explored.slice().sort();
const audit: Array<Record<string, unknown>> = [];
const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'narrow', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error(`browser page error: ${String(error)}`));
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await loadState(page, reviewState());
    // Stretch only presentation timers so each honest React path index can be audited and captured
    // before the next transition. The reducer/action and the configured Slow timing remain intact.
    await page.evaluate(`(() => {
      const browserSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (handler, timeout = 0, ...args) =>
        browserSetTimeout(handler, timeout >= 250 ? timeout * 5 : timeout, ...args);
    })()`);
    await page.$eval('[data-map-x="7"][data-map-y="4"]', (node) =>
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));

    let previous = initial.players.p1.explored.slice().sort();
    for (let index = 1; index < route.length; index += 1) {
      await page.waitForFunction((wanted) =>
        document.querySelector('.adventure-map')?.getAttribute('data-movement-index') === String(wanted),
      { timeout: 10_000 }, index);
      const observed = await visibleExplored(page);
      const expected = expectedPrefix(initial, index);
      if (JSON.stringify(observed) !== JSON.stringify(expected)) {
        throw new Error(`${viewport.name} index ${index} exploration differs from prefix authority`);
      }
      const current = route[index];
      const heroTransform = await page.$eval('.map-hero[data-selected="true"]', (node) =>
        (node as SVGGElement).style.transform);
      if (!heroTransform.includes(`translate(${current.x * 32 + 16}px, ${current.y * 32 + 16}px)`)) {
        throw new Error(`${viewport.name} index ${index} hero position mismatch: ${heroTransform}`);
      }
      const newlyVisible = observed.filter((key) => !previous.includes(key));
      const futureStillHidden = finalExplored.filter((key) => !observed.includes(key));
      if (!newlyVisible.length) throw new Error(`${viewport.name} index ${index} revealed no new tiles`);
      if (index < route.length - 1 && !futureStillHidden.length) {
        throw new Error(`${viewport.name} index ${index} leaked all future vision`);
      }
      const overlays = await page.$$eval(
        '.modal-backdrop, .inspection-backdrop, .help-backdrop, .objective-primer, .notice-toast, .error-toast',
        (nodes) => nodes.filter((node) => getComputedStyle(node).display !== 'none').length,
      );
      if (overlays !== 0) throw new Error(`${viewport.name} index ${index} has ${overlays} overlays/toasts`);
      const file = `${viewport.name}-step-${index}.png`;
      await page.screenshot({ path: `${output}/${file}` });
      audit.push({
        viewport: viewport.name, index, heroPosition: current,
        newlyVisibleTiles: newlyVisible, stillHiddenFutureTiles: futureStillHidden,
        reducerExploredCount: finalExplored.length, presentedExploredCount: observed.length,
        overlays, screenshot: file,
      });
      previous = observed;
    }

    await page.waitForFunction(() =>
      document.querySelector('.adventure-map')?.getAttribute('data-moving') === 'false');
    const browserFinal = await visibleExplored(page);
    const finalTransform = await page.$eval('.map-hero[data-selected="true"]', (node) =>
      (node as SVGGElement).style.transform);
    if (JSON.stringify(browserFinal) !== JSON.stringify(finalExplored)
        || !finalTransform.includes('translate(240px, 144px)')) {
      throw new Error(`${viewport.name} final presentation does not match reducer`);
    }
    audit.push({
      viewport: viewport.name, finalReducerHash: stateHash(finalReducer),
      finalHeroPosition: finalReducer.players.p1.hero!.position,
      finalExploredCount: finalExplored.length, presentationParity: true,
    });
    await page.close();
  }
  writeFileSync(`${output}/audit.json`, `${JSON.stringify({ route, audit }, null, 2)}\n`);
  console.log(`Incremental fog review passed: ${route.length - 1} entered steps × desktop/narrow, no future leak, no overlays, final reducer parity.`);
} finally {
  await browser.close();
}
