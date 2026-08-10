import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { makeArmy } from '../core/army';
import { createGame } from '../core/game';
import type { GameState } from '../core/types';
import { tile } from '../content/terrain';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/hero-meeting';
mkdirSync(output, { recursive: true });

function meetingState(blocked = false): GameState {
  const state = createGame({
    seed: 8066, mapId: 'grand-muster', difficulty: 'normal',
    p1: 'human', p2: 'dormant',
  });
  const [source, target] = state.players.p1.heroes;
  source.position = { x: 8, y: 8 };
  source.movement = 2_000;
  source.army = makeArmy([{ unitId: 'yeoman', count: 9 }]);
  source.inventory[0] = { id: 'waybread' };
  target.position = { x: 12, y: 8 };
  target.army = makeArmy([{ unitId: 'bannerman', count: 4 }]);
  target.inventory[1] = { id: 'saltedMeat' };
  const enemy = state.players.p2.heroes[0];
  enemy.position = { x: 14, y: 8 };
  enemy.alive = true;
  state.map.objects = state.map.objects.filter((object) =>
    Math.max(Math.abs(object.position.x - 11), Math.abs(object.position.y - 8)) > 5);
  state.castles = state.castles.filter((castle) =>
    Math.max(Math.abs(castle.position.x - 11), Math.abs(castle.position.y - 8)) > 6);
  for (let y = 5; y <= 11; y += 1) for (let x = 5; x <= 16; x += 1) {
    state.map.terrain[y][x] = tile('meadow');
  }
  if (blocked) {
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      state.map.objects.push({
        id: `meeting-block-${dx}-${dy}`, kind: 'obstacle', prop: 'meeting review block',
        position: { x: target.position.x + dx, y: target.position.y + dy },
      });
    }
  }
  state.players.p1.explored = Array.from({ length: state.map.height }, (_, y) =>
    Array.from({ length: state.map.width }, (_, x) => `${x},${y}`)).flat();
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

async function loadState(page: Page, state: GameState): Promise<void> {
  const persisted = actionSave(state);
  await page.evaluate(({ save, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
  }, { save: persisted, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.objective-primer', { hidden: true });
}

async function hoverHero(page: Page, heroId: string): Promise<void> {
  const hero = await page.$(`.map-hero[data-inspect-id="${heroId}"]`);
  const box = await hero?.boundingBox();
  if (!hero || !box) throw new Error(`Visible hero ${heroId} is missing`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction((id) => document.querySelector(
    `.map-hero[data-inspect-id="${id}"]`,
  )?.matches(':hover'), {}, heroId);
}

async function activate(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector);
  await page.$eval(selector, (node) => {
    if (node instanceof HTMLButtonElement) {
      if (node.disabled) throw new Error(`Review control is disabled: ${node.title}`);
      node.click();
    } else node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(`browser page error: ${
    error instanceof Error ? error.message : String(error)
  }`));
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  const state = meetingState();
  const [source, target] = state.players.p1.heroes;
  const enemy = state.players.p2.heroes[0];
  await loadState(page, state);
  await hoverHero(page, target.id);
  const exchangeIntent = await page.$eval(`.map-hero[data-inspect-id="${target.id}"]`, (node) => ({
    intent: node.getAttribute('data-map-intent'), label: node.getAttribute('aria-label'),
    cursor: getComputedStyle(node).cursor,
    caption: document.querySelector('.destination-intent')?.textContent,
    route: document.querySelector('.path-preview')?.getAttribute('points'),
  }));
  if (exchangeIntent.intent !== 'exchange'
      || !exchangeIntent.label?.includes(`Exchange with ${target.name}`)
      || !exchangeIntent.cursor.includes('url(')
      || !exchangeIntent.caption?.includes(`Exchange with ${target.name}`)
      || !exchangeIntent.route) {
    throw new Error(`Friendly hover is not a complete exchange intent: ${JSON.stringify(exchangeIntent)}`);
  }
  await page.screenshot({ path: `${output}/friendly-route-preview.png` });
  await hoverHero(page, enemy.id);
  const enemyIntent = await page.$eval(`.map-hero[data-inspect-id="${enemy.id}"]`, (node) => ({
    intent: node.getAttribute('data-map-intent'), label: node.getAttribute('aria-label'),
    cursor: getComputedStyle(node).cursor,
  }));
  if (enemyIntent.intent !== 'attack' || !enemyIntent.label?.includes('Attack')
      || enemyIntent.cursor === exchangeIntent.cursor) {
    throw new Error(`Enemy hover is not distinct from exchange: ${JSON.stringify(enemyIntent)}`);
  }

  await page.locator(`.map-hero[data-inspect-id="${target.id}"]`).click();
  await page.waitForSelector('.exchange-screen');
  const positions = await page.$$eval('.map-hero', (heroes) => heroes.map((hero) => ({
    id: hero.getAttribute('data-inspect-id'), transform: (hero as SVGGElement).style.transform,
  })));
  const sourceTransform = positions.find((entry) => entry.id === source.id)?.transform;
  const targetTransform = positions.find((entry) => entry.id === target.id)?.transform;
  if (sourceTransform === targetTransform || !sourceTransform || !targetTransform) {
    throw new Error(`Meeting overlapped heroes: ${JSON.stringify(positions)}`);
  }
  await page.screenshot({ path: `${output}/route-complete-exchange.png` });

  await activate(page, '.exchange-screen .transfer-area .army-block:first-child .army-slot-wrap:nth-child(1) > .army-slot');
  await activate(page, '.exchange-screen .transfer-area .army-block:last-child .army-slot-wrap:nth-child(7) > .army-slot');
  await page.$eval('.transfer-dialog input[type="number"]', (input) => {
    const control = input as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(control, '3'); control.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await activate(page, '.transfer-dialog .primary');
  await page.waitForSelector('.transfer-dialog', { hidden: true });
  await activate(page, '.exchange-screen .transfer-area .army-block:last-child .army-slot-wrap:nth-child(7) > .army-slot');
  await activate(page, '.exchange-screen .transfer-area .army-block:first-child .army-slot-wrap:nth-child(1) > .army-slot');
  await page.$eval('.transfer-dialog input[type="number"]', (input) => {
    const control = input as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(control, '1'); control.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await activate(page, '.transfer-dialog .primary');
  await page.waitForSelector('.transfer-dialog', { hidden: true });
  await activate(page, '.item-transfer-side:first-child .army-slot:first-child');
  await activate(page, '.item-transfer-side:last-child .army-slot:nth-child(2)');
  await activate(page, '#item-transfer-heading + p ~ .dialog-actions .primary');
  await page.waitForSelector('#item-transfer-heading', { hidden: true });
  await page.screenshot({ path: `${output}/both-direction-conservation.png` });
  await page.locator('.exchange-screen .close-button').click();
  await page.locator(`.map-hero[data-inspect-id="${target.id}"]`).click();
  await page.waitForSelector('.exchange-screen');
  await page.screenshot({ path: `${output}/adjacent-immediate.png` });

  const blocked = meetingState(true);
  await loadState(page, blocked);
  await page.$eval(`.map-hero[data-inspect-id="${blocked.players.p1.heroes[1].id}"]`, (node) =>
    node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
  await page.waitForFunction(() => document.querySelector('.destination-intent')?.textContent
    ?.includes('Cannot meet'));
  const unavailable = await page.$eval('.destination-intent', (node) => node.textContent ?? '');
  if (!unavailable.includes('No free legal tile')) {
    throw new Error(`Blocked meeting hover did not explain failure: ${unavailable}`);
  }
  await activate(page, `.map-hero[data-inspect-id="${blocked.players.p1.heroes[1].id}"]`);
  await page.waitForFunction(() => document.querySelector('.meeting-status')?.textContent
    ?.includes('No free legal tile'));
  if (await page.$('.exchange-screen')) throw new Error('Blocked meeting opened exchange');
  await page.$eval('.meeting-status', (node) => node.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: `${output}/unreachable-reason.png` });

  const structureBlocked = meetingState();
  const structureSource = structureBlocked.players.p1.heroes[0];
  const structureTarget = structureBlocked.players.p1.heroes[1];
  structureTarget.position = { x: structureSource.position.x + 1, y: structureSource.position.y };
  structureBlocked.map.objects.push({
    id: 'meeting-review-wagon', kind: 'wagonCamp', position: { ...structureSource.position },
    stockWeek: 1, stock: { id: 'bottledEcho' },
  });
  await loadState(page, structureBlocked);
  await page.waitForSelector('.structure-dialog');
  await activate(page, `.map-hero[data-inspect-id="${structureTarget.id}"]`);
  if (await page.$('.exchange-screen')) {
    throw new Error('A meeting opened behind the contextual structure dialog');
  }
  await page.screenshot({ path: `${output}/structure-dialog-blocks-map.png` });
  await activate(page, '.structure-dialog-close');
  await page.waitForSelector('.structure-dialog', { hidden: true });
  await activate(page, `.map-hero[data-inspect-id="${structureTarget.id}"]`);
  await page.waitForSelector('.exchange-screen');

  console.log('Hero meeting review passed: distinct friendly/enemy intent, routed and immediate exchange, both-direction transfers, separate positions, blocked reason, and structure-dialog input guard.');
} finally {
  await browser.close();
}
