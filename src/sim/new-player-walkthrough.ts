import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import type { Action } from '../core/types';
import { replaySave, type ActionSave } from '../ui/persistence';
import {
  REQUIRED_CONTINUOUS_ACTIONS, SCREEN_MATRIX_COVERAGE,
  WALKTHROUGH_STEP_COVERAGE,
} from './walkthrough-coverage';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/new-player-walkthrough';
const desktop = { width: 1440, height: 1000, deviceScaleFactor: 1 };
const narrow = { width: 390, height: 844, deviceScaleFactor: 1 };
const seed = 18;
mkdirSync(output, { recursive: true });

const observed = new Set<string>();
const inspectionSubjects = new Set<string>();
const evidence = new Set<string>();

const settle = (milliseconds = 100) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function requireSelector(page: Page, selector: string, label = selector): Promise<void> {
  await settle();
  if (!await page.$(selector)) throw new Error(`Missing ${label}: ${selector}`);
}

async function screenshot(page: Page, path: string): Promise<void> {
  await Promise.race([
    page.screenshot({ path }),
    settle(15_000).then(() => {
      throw new Error(`Screenshot did not settle within 15 seconds: ${path}`);
    }),
  ]);
}

async function audit(page: Page, label: string): Promise<void> {
  const result = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth
      - document.documentElement.clientWidth,
    unnamed: [...document.querySelectorAll<HTMLElement>('button, input, select')]
      .filter((node) => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden'
          && style.display !== 'none' && !(node.getAttribute('aria-label')
            || node.getAttribute('title') || node.textContent?.trim()
            || node.closest('label')?.textContent?.trim());
      }).map((node) => node.outerHTML.slice(0, 160)),
    unexplained: [...document.querySelectorAll<HTMLButtonElement>('button:disabled')]
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0
          && !(node.title.trim() || node.dataset.disabledReason?.trim());
      }).map((node) => node.textContent?.trim()),
    overflowing: [...document.querySelectorAll<HTMLElement>('body *')].flatMap((node) => {
      const box = node.getBoundingClientRect();
      return box.right > document.documentElement.clientWidth + 2
        ? [`${node.tagName.toLowerCase()}.${node.className.toString().replaceAll(' ', '.')}: ${Math.round(box.left)}..${Math.round(box.right)}`]
        : [];
    }).slice(0, 12),
  }));
  if (result.horizontalOverflow > 2 || result.unnamed.length || result.unexplained.length) {
    throw new Error(`${label} UX audit failed: ${JSON.stringify(result)}`);
  }
}

async function capturePair(page: Page, stem: string, focusSelector?: string): Promise<void> {
  if (page.viewport()?.width !== desktop.width) {
    await page.setViewport(desktop);
    await settle(180);
  }
  if (focusSelector) {
    await page.$eval(focusSelector, (node) => node.scrollIntoView({ block: 'center' }));
    await page.mouse.move(5, 5);
    await settle(80);
  }
  await audit(page, `${stem} desktop`);
  await screenshot(page, `${output}/${stem}-desktop.png`);
  evidence.add(`${stem}-desktop.png`);
  await page.setViewport(narrow);
  await settle(180);
  if (focusSelector) {
    await page.$eval(focusSelector, (node) => node.scrollIntoView({ block: 'center' }));
    await page.mouse.move(5, 5);
    await settle(80);
  }
  await audit(page, `${stem} narrow`);
  await screenshot(page, `${output}/${stem}-narrow.png`);
  evidence.add(`${stem}-narrow.png`);
}

async function clickText(page: Page, selector: string, text: string): Promise<void> {
  await page.$$eval(selector, (nodes, wanted) => {
    const node = nodes.find((candidate) => candidate.textContent?.includes(wanted));
    if (!node) throw new Error(`No matching control contains ${JSON.stringify(wanted)}`);
    (node as HTMLElement).click();
  }, text);
}

async function clickSelector(page: Page, selector: string): Promise<void> {
  await page.$eval(selector, (node) => node.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true,
  })));
}

async function beginCombatSpell(
  page: Page, spellId: string, school: string,
): Promise<void> {
  if (!await page.$('.spellbook')) await clickSelector(page, '.spellbook-button');
  await clickSelector(page, `.spell-school-tab.${school}`);
  await page.waitForSelector(`.spell-grid-cell[data-spell-id="${spellId}"]`);
  await clickSelector(page, `.spell-grid-cell[data-spell-id="${spellId}"]`);
  await page.waitForSelector(`[data-cast-spell-id="${spellId}"]:not(:disabled)`);
  await clickSelector(page, `[data-cast-spell-id="${spellId}"]`);
}

async function inspect(
  page: Page, selector: string, subject: string, captureStem?: string,
): Promise<void> {
  await page.$eval(selector, (node) => node.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true,
  })));
  await new Promise((resolve) => setTimeout(resolve, 80));
  if (!await page.$('.inspection-card') && subject !== 'terrain') {
    throw new Error(`${subject} did not open an inspection card from ${selector}`);
  }
  if (subject === 'terrain') {
    const label = await page.$eval('.inspect-label', (node) => node.textContent ?? '');
    if (!label.trim()) throw new Error('Terrain inspection did not open its canonical short label');
    inspectionSubjects.add(subject);
    return;
  }
  const card = await page.$eval('.inspection-card', (node) => node.textContent ?? '');
  if (!card.trim() || /muster-|p1-|_[a-z]/.test(card)) {
    throw new Error(`${subject} inspection is empty or exposes an internal id: ${card}`);
  }
  inspectionSubjects.add(subject);
  if (captureStem) await capturePair(page, captureStem);
  await clickSelector(page, '.inspection-close');
  await page.waitForSelector('.inspection-card', { hidden: true });
}

async function inspectDashboardDetail(
  page: Page, selector: string, subject: string, captureStem?: string,
): Promise<void> {
  await clickSelector(page, selector);
  await page.waitForSelector('.hero-dashboard-detail');
  const card = await page.$eval('.hero-dashboard-detail', (node) => node.textContent ?? '');
  if (!card.trim() || /muster-|p1-|_[a-z]/.test(card)) {
    throw new Error(`${subject} dashboard detail is empty or exposes an internal id: ${card}`);
  }
  inspectionSubjects.add(subject);
  if (captureStem) await capturePair(page, captureStem);
  await clickSelector(page, '.hero-dashboard-detail-close');
  await page.waitForSelector('.hero-dashboard-detail', { hidden: true });
}

async function inspectCombatEnemy(page: Page): Promise<void> {
  await page.$eval('.battle-hex.enemy-occupied', (node) => node.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
  ));
  await page.waitForFunction(() =>
    document.querySelector('.active-unit span')?.textContent === 'Inspected unit');
  const copy = await page.$eval('.active-unit', (node) => node.textContent ?? '');
  if (!copy.includes('Defender') || !copy.includes('Count') || !copy.includes('Footprint')) {
    throw new Error(`Enemy combat inspection is incomplete: ${copy}`);
  }
  inspectionSubjects.add('enemy unit');
}

async function mapPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  await page.$eval('.adventure-map', (node, target) => {
    const map = node as SVGSVGElement;
    const frame = map.closest<HTMLElement>('.map-frame');
    if (!frame) throw new Error('Adventure map frame is missing');
    const frameBounds = frame.getBoundingClientRect();
    const mapBounds = map.getBoundingClientRect();
    const mapLeft = frame.scrollLeft + mapBounds.left - frameBounds.left;
    const mapTop = frame.scrollTop + mapBounds.top - frameBounds.top;
    frame.scrollTo({
      left: mapLeft + mapBounds.width * ((target.x + 0.5) / 56) - frame.clientWidth / 2,
      top: mapTop + mapBounds.height * ((target.y + 0.5) / 44) - frame.clientHeight / 2,
    });
  }, { x, y });
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return page.$eval(
    `.terrain-cell[data-map-x="${x}"][data-map-y="${y}"]`,
    (node) => {
      const box = node.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    },
  );
}

async function hoverMapTile(page: Page, x: number, y: number): Promise<void> {
  const point = await mapPoint(page, x, y);
  await page.mouse.move(point.x, point.y);
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function waitForAdventureRoute(page: Page): Promise<void> {
  await settle(80);
  await page.waitForFunction(() => Boolean(
    document.querySelector('.combat-shell')
      || document.querySelector<HTMLButtonElement>('.end-turn:not(:disabled)'),
  ), { timeout: 20_000 });
}

async function clickMapTile(page: Page, x: number, y: number): Promise<void> {
  await page.$eval(
    `.terrain-cell[data-map-x="${x}"][data-map-y="${y}"]`,
    (node) => (node as SVGElement).dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true,
    })),
  );
  // The route is animated one tile at a time. Do not inspect its outcome or issue the next
  // action until the adventure control becomes available again (or combat replaces it).
  await waitForAdventureRoute(page);
}

async function clickMapObject(page: Page, selector: string): Promise<void> {
  await page.$eval(selector, (node) => (node as SVGElement).dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true,
  })));
  await waitForAdventureRoute(page);
}

async function day(page: Page): Promise<number> {
  return page.$eval('.turn-badge b', (node) => Number(node.textContent?.match(/\d+/)?.[0]));
}

async function endTurn(page: Page): Promise<void> {
  await page.waitForSelector('.end-turn:not(:disabled)', { timeout: 20_000 });
  const before = await day(page);
  await clickSelector(page, '.end-turn');
  observed.add('END_TURN');
  try {
    await page.waitForFunction((prior) => {
      const text = document.querySelector('.turn-badge b')?.textContent ?? '';
      return Number(text.match(/\d+/)?.[0]) !== prior
        && Boolean(document.querySelector('.end-turn:not(:disabled)'));
    }, { timeout: 20_000 }, before);
  } catch (error) {
    const state = await page.evaluate(() => ({
      day: document.querySelector('.turn-badge b')?.textContent,
      endTurnDisabled: document.querySelector<HTMLButtonElement>('.end-turn')?.disabled,
      message: document.querySelector('.message-strip')?.textContent,
      modal: document.querySelector('.modal-backdrop')?.textContent?.slice(0, 240),
      combat: Boolean(document.querySelector('.combat-shell')),
      error: document.querySelector('.error-banner')?.textContent,
    }));
    throw new Error(`End turn did not settle from day ${before}: ${JSON.stringify(state)}`, {
      cause: error,
    });
  }
}

async function travelUntil(
  page: Page, destination: { x: number; y: number }, arrivedSelector: string,
): Promise<void> {
  if (await page.$(arrivedSelector)) return;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await clickMapTile(page, destination.x, destination.y);
    observed.add('MOVE_HERO');
    if (await page.$(arrivedSelector)) return;
    await endTurn(page);
  }
  throw new Error(`Could not reach ${destination.x},${destination.y} (${arrivedSelector})`);
}

async function travelToPickupMessage(
  page: Page, waypoint: { x: number; y: number }, objectSelector: string, message: string,
): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const currentCopy = await page.$eval('.message-strip', (node) => node.textContent ?? '');
    if (currentCopy.includes(message)) return;
    const wasVisible = Boolean(await page.$(objectSelector));
    if (wasVisible) await clickMapObject(page, objectSelector);
    else await clickMapTile(page, waypoint.x, waypoint.y);
    observed.add('MOVE_HERO');
    try {
      await page.waitForFunction((expected) =>
        (document.querySelector('.message-strip')?.textContent ?? '').includes(expected),
      { timeout: 2_000 }, message);
      return;
    } catch {
      // A route may stop short of the object; in that case the next day continues it.
    }
    const copy = await page.$eval('.message-strip', (node) => node.textContent ?? '');
    if (copy.includes(message)) return;
    if (wasVisible && !await page.$(objectSelector)) {
      throw new Error(`${objectSelector} disappeared without ${message}: ${copy}`);
    }
    await endTurn(page);
  }
  throw new Error(`Could not activate ${objectSelector} (${message})`);
}

async function travelObjectUntil(
  page: Page, objectSelector: string, arrivedSelector: string,
): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await clickMapObject(page, objectSelector);
    observed.add('MOVE_HERO');
    if (await page.$(arrivedSelector)) return;
    await endTurn(page);
  }
  throw new Error(`Could not activate ${objectSelector} (${arrivedSelector})`);
}

async function waitForHumanCombat(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(
    document.querySelector('.combat-shell')
    && document.querySelector('.combat-actions .auto:not(:disabled)')
    && !document.querySelector('.combat-action-status, .thinking-badge'),
  ), { timeout: 15_000 });
}

async function completeTargeting(page: Page): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    const stage = await page.$eval('.combat-targeting-banner', (node) =>
      node.getAttribute('data-target-stage'));
    if (stage === 'confirm') {
      await clickSelector(page, '.confirm-target');
      await page.waitForSelector('.combat-targeting-banner', { hidden: true });
      return;
    }
    const selector = stage === 'targetId' || stage === 'secondaryTargetId'
      ? '.battle-hex.target-choice'
      : stage === 'destination' ? '.battle-hex.destination-choice'
        : stage === 'positions' ? '.battle-hex.placement-choice:not(.position-selected)'
          : '.combat-targeting-choices button';
    await clickSelector(page, selector);
  }
  throw new Error('Combat targeting did not reach confirmation');
}

async function clickCombatAction(page: Page, text: 'Wait' | 'Defend'): Promise<void> {
  await clickText(page, '.combat-actions button:not(:disabled)', text);
  observed.add(text === 'Wait' ? 'BATTLE_WAIT' : 'BATTLE_DEFEND');
  await waitForHumanCombat(page);
}

async function moveActiveStack(page: Page): Promise<void> {
  const choices = await page.$$('.battle-hex.reachable');
  const ranked = (await Promise.all(choices.map(async (choice) => ({
    choice, box: await choice.boundingBox(),
  })))).filter((entry) => entry.box).sort((a, b) => b.box!.x - a.box!.x);
  if (!ranked[0]?.box) throw new Error('No manual combat move is available');
  await page.mouse.click(
    ranked[0].box.x + ranked[0].box.width / 2,
    ranked[0].box.y + ranked[0].box.height / 2,
  );
  observed.add('BATTLE_MOVE');
  await waitForHumanCombat(page);
}

async function attack(page: Page, expected: 'ranged' | 'melee'): Promise<boolean> {
  const targets = await page.$$('.battle-hex.attackable');
  for (const target of targets) {
    const box = await target.boundingBox();
    if (!box) continue;
    const x = box.x + box.width / 2;
    for (const y of [box.y + 5, box.y + box.height / 2, box.y + box.height - 5]) {
      await page.mouse.move(x, y);
      await settle(60);
      const cursor = await page.$('.combat-sword-cursor');
      if (!cursor) continue;
      const attack = await cursor.evaluate((node) => ({
        actionType: node.getAttribute('data-attack-type'),
        effect: document.querySelector('.attack-prediction')
          ?.getAttribute('data-attack-mode')?.toLowerCase() ?? null,
      }));
      if (attack.effect !== expected) continue;
      await page.mouse.click(x, y);
      observed.add(attack.actionType ?? (expected === 'ranged' ? 'BATTLE_ATTACK' : 'BATTLE_MOVE_ATTACK'));
      observed.add(expected === 'ranged' ? 'RANGED_ATTACK' : 'MELEE_ATTACK');
      await waitForHumanCombat(page);
      return true;
    }
  }
  return false;
}

function actionTypes(actions: readonly Action[]): Set<string> {
  return new Set(actions.map((action) => action.type));
}

// Keep the Windows-hosted Node process alive while a CDP promise is pending. Without an
// active handle, Node may exit cleanly before Puppeteer's own timeout reports the boundary.
const keepAlive = setInterval(() => undefined, 1_000);
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

try {
  console.log(`Launching walkthrough browser for ${baseUrl}`);
  browser = await puppeteer.launch({
    executablePath, headless: true, args: ['--disable-gpu'],
  });
  console.log('Browser launched; opening walkthrough page');
  const page = await browser.newPage();
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(
    error instanceof Error ? error.message : String(error),
  ));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.setViewport(desktop);
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  console.log('Walkthrough page loaded; resetting stored campaign');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await page.select('.menu-fields label:first-child select', 'grand-muster');
  await page.$eval('.seed-row input', (node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seed);
  const setupCopy = await page.$eval('.menu-card', (node) => node.textContent ?? '');
  for (const fragment of ['Showcase sandbox', 'dormant', 'same seed', 'Resources ×']) {
    if (!setupCopy.toLowerCase().includes(fragment.toLowerCase())) {
      throw new Error(`Setup omits ${JSON.stringify(fragment)}`);
    }
  }
  await capturePair(page, 'matrix-01-title-setup-load');
  await clickSelector(page, '.start-button');
  observed.add('CAMPAIGN_SETUP');
  await page.waitForSelector('.objective-primer');
  const objective = await page.$eval('.choice-dialog', (node) => node.textContent ?? '');
  if (!objective.includes('Showcase sandbox: fight, explore, build, and retire when finished.')) {
    throw new Error(`Wrong authored objective: ${objective}`);
  }
  await capturePair(page, 'step-01-objective');
  await clickSelector(page, '.choice-dialog .primary');
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await clickText(page, '.rail-commands button', 'Menu & saves');
  await page.select('.command-menu-grid select', 'instant');
  await clickText(page, '.command-menu-dialog footer button', 'Close');
  await capturePair(page, 'matrix-02-adventure-header-map');

  console.log('walkthrough · title, objective, and responsive adventure evidence captured');
  await clickSelector(page, '.hero-list button[data-inspect-id="p1-berta"]');
  observed.add('SELECT_HERO');
  console.log('walkthrough · Berta selected for the binding inspection set');
  await inspect(page, '.hero-portrait', 'hero');
  await clickText(page, '.rail-commands button', 'Hero details');
  await page.$eval('[data-dashboard-region="secondary-skills"]', (region) =>
    region.scrollIntoView({ block: 'center' }));
  await inspectDashboardDetail(page, '.hero-dashboard-skill-grid > button', 'secondary skill');
  await clickSelector(page, '.hero-details-dialog .structure-dialog-close');
  await inspect(page, '.army-block .army-slot[data-inspect-kind="unit"]', 'unit');
  await hoverMapTile(page, 7, 7);
  const terrainLabel = await page.$eval('.inspect-label', (node) => node.textContent ?? '');
  if (!terrainLabel.trim()) throw new Error('Terrain hover omitted its canonical short label');
  inspectionSubjects.add('terrain');
  await inspect(page, '.map-object-sprite[data-inspect-id="muster-sparring-hearthguard"] .sprite-hitbox', 'ordinary object');
  await inspect(page, '.guardian-object[data-inspect-id="muster-guardian-hearthguard"] .sprite-hitbox', 'guardian');
  await capturePair(page, 'matrix-03-hero-sidebar');
  console.log('walkthrough · opening hero/terrain/object/unit/guardian/skill inspections passed');

  await clickSelector(page, '.help-toggle');
  await page.waitForSelector('.help-dialog');
  await capturePair(page, 'matrix-10-global-reference');
  await clickSelector(page, '.help-dialog button[aria-label="Close help"]');

  await clickSelector(page, '.hero-list button[data-inspect-id="p1-vess"]');
  observed.add('SELECT_HERO');
  await page.waitForSelector('.map-hero[data-inspect-id="p1-vess"][data-selected="true"]');
  console.log('walkthrough · contextual help closed and Vess selected');
  await clickMapTile(page, 18, 19);
  observed.add('MOVE_HERO');
  if (!await page.$('.town-list .hero-present')) {
    const stateText = await page.$eval('.hero-panel', (node) => node.textContent ?? '');
    throw new Error(`Vess did not reach the castle entrance: ${stateText.slice(0, 800)}`);
  }
  console.log('walkthrough · Vess entered the Vespiary castle');
  await clickSelector(page, '.town-list .hero-present');
  await requireSelector(page, '.castle-screen', 'opened castle screen');

  await clickSelector(page, '[data-castle-view="army"]');
  await clickSelector(page, '.direct-transfer-side:first-child .army-slot:not(:disabled)');
  await requireSelector(page, '.direct-exchange .army-slot.valid-destination',
    'direct company transfer targets');
  await capturePair(page, 'matrix-07-exchange-equipment', '.direct-exchange');
  console.log('walkthrough · direct company source and reducer-projected destinations captured');
  await clickSelector(page, '.direct-transfer-side:last-child .army-slot:last-child');
  observed.add('TRANSFER_ARMY');
  await settle();
  if (await page.$('.direct-exchange .army-slot.selected')) {
    throw new Error('Direct company transfer did not clear its source after dispatch');
  }
  await clickSelector(page, '[data-castle-view="town"]');
  await clickSelector(page, '.building-card.green[data-inspect-id="marketplace@vespiary"]');
  await requireSelector(page, '.building-detail .primary', 'Marketplace Build action');
  await clickSelector(page, '.building-detail .primary');
  observed.add('BUILD');
  await requireSelector(page, '.building-card.gold[data-inspect-id="marketplace@vespiary"]',
    'built Marketplace card');
  await clickSelector(page, '[data-castle-view="recruit"]');
  await page.$eval('.recruit-row', (row) => {
    const add = [...row.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === '+' && !button.disabled);
    if (!add) throw new Error('No tier-one recruit can be selected');
    add.click();
  });
  await page.$eval('.recruit-row', (row) => {
    const hire = [...row.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Hire' && !button.disabled);
    if (!hire) throw new Error('Selected recruit has no enabled Hire action');
    hire.click();
  });
  observed.add('RECRUIT');
  await capturePair(page, 'matrix-04-castle');
  console.log('walkthrough · transfer, Marketplace build, and recruitment committed');
  await clickSelector(page, '.castle-screen .close-button');

  await clickText(page, '.rail-commands button', 'Menu & saves');
  await clickText(page, '.command-menu-grid button', 'Quick save');
  await page.waitForSelector('.notice-toast');
  await clickText(page, '.command-menu-grid button', 'Return to title');
  await clickText(page, '.title-exit-dialog button', 'Leave and return to title');
  await page.waitForSelector('.save-row.compatible');
  const saveRow = await page.$eval('.save-row.compatible', (node) => node.textContent ?? '');
  if (!saveRow.includes('Grand Muster') || !saveRow.includes('seed 18')) {
    throw new Error(`Saved campaign metadata is incomplete: ${saveRow}`);
  }
  await capturePair(page, 'matrix-01-title-setup-load');
  await clickSelector(page, '.save-row.compatible .load-button');
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) throw new Error('Resume reopened the new-campaign primer');

  await hoverMapTile(page, 19, 20);
  await page.waitForFunction(() => document.querySelector('.destination-intent')
    ?.getAttribute('data-preview-kind') === 'safe');
  await travelToPickupMessage(
    page, { x: 24, y: 19 }, '[data-inspect-id="muster-pile-8"]', 'Collected 3Essence',
  );
  await travelUntil(page, { x: 25, y: 14 }, '[data-inspect-id="muster-chest"]');
  await travelObjectUntil(page, '[data-inspect-id="muster-chest"]', '.chest-choice');
  await capturePair(page, 'matrix-06-offers-choices');
  await inspect(page, '.chest-choice [data-inspect-kind="artifact"]', 'artifact offer');
  await clickSelector(page, '.chest-choice [data-inspect-kind="artifact"]');
  observed.add('CHOOSE_CHEST');
  await page.waitForSelector('.chest-choice', { hidden: true });
  await clickText(page, '.rail-commands button', 'Hero details');
  await page.$eval('[data-dashboard-region="artifact-backpack"]', (region) =>
    region.scrollIntoView({ block: 'center' }));
  await inspectDashboardDetail(page, '.hero-dashboard-backpack-grid > button',
    'artifact', 'step-03-inspections');
  await clickSelector(page, '.hero-details-dialog .structure-dialog-close');

  await endTurn(page);
  await travelUntil(page, { x: 31, y: 24 }, '[data-inspect-id="muster-hedge-school"]');
  await travelObjectUntil(page, '[data-inspect-id="muster-hedge-school"]', '.structure-dialog');
  const heroBeforeLesson = await page.$eval('.hero-panel', (node) => node.textContent ?? '');
  await clickText(page, '.structure-dialog button', 'Attend a lesson');
  await page.waitForSelector('.action-confirm-dialog');
  await clickText(page, '.action-confirm-dialog button', 'Confirm');
  observed.add('ATTEND_HEDGE_SCHOOL');
  await page.waitForSelector('.choice-cards');
  await clickSelector(page, '.choice-cards button:not(:disabled)');
  observed.add('CHOOSE_LEVEL');
  await page.waitForSelector('.choice-dialog', { hidden: true });
  const heroAfterLesson = await page.$eval('.hero-panel', (node) => node.textContent ?? '');
  if (heroBeforeLesson === heroAfterLesson) throw new Error('Hedge School reward did not persist');
  await capturePair(page, 'step-04-route-and-visit');

  await travelUntil(page, { x: 31, y: 38 }, '[data-inspect-id="muster-wagon"]');
  await travelObjectUntil(page, '[data-inspect-id="muster-wagon"]', '.structure-dialog');
  await clickText(page, '.structure-dialog button', 'Buy Bottled Echo');
  await page.waitForSelector('.action-confirm-dialog');
  await clickText(page, '.action-confirm-dialog button', 'Confirm');
  observed.add('BUY_WAGON_ITEM');
  await page.waitForSelector('.action-confirm-dialog', { hidden: true });
  await clickText(page, '.rail-commands button', 'Hero details');
  await page.$eval('[data-dashboard-region="consumables"]', (region) =>
    region.scrollIntoView({ block: 'center' }));
  const inventory = await page.$eval('.hero-dashboard-item-grid',
    (node) => node.textContent ?? '');
  if (!inventory.includes('Bottled Echo')) throw new Error('Authored Wagon item was not acquired');
  await clickSelector(page, '.hero-details-dialog .structure-dialog-close');

  await clickMapTile(page, 20, 24);
  observed.add('MOVE_HERO');
  if (!await page.$('.combat-shell')) {
    await hoverMapTile(page, 18, 22);
    await page.waitForFunction(() => document.querySelector('.destination-intent')
      ?.getAttribute('data-preview-kind') === 'fight');
    await capturePair(page, 'step-04-route-and-visit');
    await clickMapObject(page, '[data-inspect-id="muster-guardian-vespiary"]');
    observed.add('MOVE_HERO');
  }
  if (!await page.$('.combat-shell')) {
    await endTurn(page);
    await clickMapObject(page, '[data-inspect-id="muster-guardian-vespiary"]');
    observed.add('MOVE_HERO');
  }
  await page.waitForSelector('.combat-shell');
  await waitForHumanCombat(page);
  await page.select('.combat-speed select', 'fast');
  await inspectCombatEnemy(page);
  await capturePair(page, 'matrix-05-combat');

  await clickSelector(page, '.spellbook-button');
  await page.waitForSelector('.spellbook');
  await capturePair(page, 'matrix-08-spellbooks');
  await beginCombatSpell(page, 'shrapnel', 'craft');
  await page.waitForSelector('.combat-targeting-banner');
  const manaBeforeCancel = await page.$eval('.spellbook-button', (node) => node.textContent ?? '');
  const logBeforeCancel = await page.$$eval('.battle-log p', (nodes) =>
    nodes.map((node) => node.textContent ?? ''));
  await clickText(page, '.combat-targeting-controls button', 'Cancel');
  await page.waitForSelector('.combat-targeting-banner', { hidden: true });
  const manaAfterCancel = await page.$eval('.spellbook-button', (node) => node.textContent ?? '');
  const logAfterCancel = await page.$$eval('.battle-log p', (nodes) =>
    nodes.map((node) => node.textContent ?? ''));
  if (manaBeforeCancel !== manaAfterCancel
      || JSON.stringify(logBeforeCancel) !== JSON.stringify(logAfterCancel)) {
    throw new Error('Canceling Shrapnel targeting mutated battle state');
  }
  observed.add('CANCEL_TARGETING');
  await beginCombatSpell(page, 'shrapnel', 'craft');
  await completeTargeting(page);
  observed.add('BATTLE_CAST');
  await waitForHumanCombat(page);
  await clickCombatAction(page, 'Defend');

  let moved = false;
  let waited = false;
  let ranged = false;
  let melee = false;
  let item = false;
  for (let turn = 0; turn < 80 && !(moved && waited && ranged && melee && item); turn += 1) {
    await waitForHumanCombat(page);
    const itemButton = await page.$('.combat-items button[data-inspect-id="bottledEcho"]:not(:disabled)');
    if (!item && itemButton) {
      await itemButton.click();
      await page.waitForSelector('.combat-targeting-banner');
      await completeTargeting(page);
      observed.add('BATTLE_USE_ITEM');
      item = true;
      await waitForHumanCombat(page);
    }
    if (!ranged && await attack(page, 'ranged')) {
      ranged = true;
      continue;
    }
    if (!melee && await attack(page, 'melee')) {
      melee = true;
      continue;
    }
    if (!waited && await page.$eval('.combat-actions', (node) =>
      [...node.querySelectorAll<HTMLButtonElement>('button')]
        .some((button) => button.textContent?.includes('Wait') && !button.disabled))) {
      await clickCombatAction(page, 'Wait');
      waited = true;
      continue;
    }
    if (await page.$('.battle-hex.reachable')) {
      await moveActiveStack(page);
      moved = true;
      continue;
    }
    await clickCombatAction(page, 'Defend');
  }
  if (!(moved && waited && ranged && melee && item)) {
    throw new Error(`Manual combat coverage incomplete: ${JSON.stringify({ moved, waited, ranged, melee, item })}`);
  }
  await capturePair(page, 'step-06-manual-combat');
  await clickSelector(page, '.combat-actions .auto:not(:disabled)');
  observed.add('AUTO_COMBAT');
  await page.waitForSelector('.result-dialog', { timeout: 20_000 });
  const resultCopy = await page.$eval('.result-dialog', (node) => node.textContent ?? '');
  if (!resultCopy.includes('Attacker losses') || !resultCopy.includes('Defender losses')
      || !resultCopy.includes('Continue to adventure map')) {
    throw new Error(`Battle result lacks casualties/next action: ${resultCopy}`);
  }
  await capturePair(page, 'step-06-battle-result');
  await clickSelector(page, '.result-dialog .primary');
  await page.waitForSelector('.adventure-map');

  await clickMapTile(page, 18, 23);
  observed.add('MOVE_HERO');
  await page.waitForSelector('.choice-dialog');
  await clickSelector(page, '.choice-cards button');
  observed.add('CHOOSE_SITE_STAT');
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await clickSelector(page, '.help-toggle');
  await page.waitForSelector('.help-dialog');
  await capturePair(page, 'matrix-10-global-reference');
  await clickSelector(page, '.help-dialog button[aria-label="Close help"]');

  await clickText(page, '.rail-commands button', 'Menu & saves');
  await clickText(page, '.command-menu-grid button', 'Quick save');
  await page.waitForSelector('.notice-toast');
  const save = await page.evaluate(() => JSON.parse(
    localStorage.getItem('border-marches.save.v4') ?? 'null',
  ) as ActionSave | null);
  if (!save) throw new Error('Final deterministic replay save is missing');
  const replayed = replaySave(save, true);
  const logged = actionTypes(save.actionLog);
  for (const required of REQUIRED_CONTINUOUS_ACTIONS) {
    if (!logged.has(required) && !observed.has(required)) {
      throw new Error(`Continuous run omitted required action ${required}`);
    }
  }
  for (const subject of [
    'hero', 'secondary skill', 'unit', 'terrain', 'ordinary object', 'guardian',
    'artifact offer', 'artifact', 'enemy unit',
  ]) if (!inspectionSubjects.has(subject)) throw new Error(`Missing ${subject} inspection`);
  const vess = replayed.players.p1.heroes.find((hero) => hero.id === 'p1-vess')!;
  const castle = replayed.castles.find((candidate) => candidate.id === 'muster-vespiary-castle')!;
  const chest = replayed.map.objects.find((object) => object.id === 'muster-chest');
  const pile = replayed.map.objects.find((object) => object.id === 'muster-pile-8');
  const school = replayed.map.objects.find((object) => object.id === 'muster-hedge-school');
  const stone = replayed.map.objects.find((object) => object.id === 'muster-sparring-vespiary');
  const guardian = replayed.map.objects.find((object) => object.id === 'muster-guardian-vespiary');
  const replayAudit = {
    map: replayed.map.id === 'grand-muster', seed: replayed.seed === seed,
    marketplace: castle.buildings.includes('marketplace'), garrison: castle.garrison.some(Boolean),
    artifact: vess.artifacts.backpack.length > 0,
    chest: chest?.kind === 'chest' && chest.collected,
    pile: pile?.kind === 'pile' && pile.collected,
    school: school?.kind === 'hedgeSchool' && school.visitedBy.includes(vess.id),
    stone: stone?.kind === 'sparringStone' && stone.visitedBy.includes(vess.id),
    guardian: !guardian,
    itemUsed: !vess.inventory.some((entry) =>
      typeof entry !== 'string' && entry?.id === 'bottledEcho'),
  };
  if (Object.values(replayAudit).some((passed) => !passed)) {
    throw new Error(`Replayed final state omitted a persistent walkthrough result: ${JSON.stringify(replayAudit)}`);
  }

  await clickText(page, 'button', 'Retire · end expedition');
  observed.add('RETIRE');
  await page.waitForSelector('.victory-dialog');
  const outcome = await page.$eval('.victory-dialog', (node) => node.textContent ?? '');
  if (!outcome.includes('The Grand Muster · Expedition retired')
      || !outcome.includes('Showcase sandbox: fight, explore, build, and retire when finished.')) {
    throw new Error(`Authored campaign outcome is incomplete: ${outcome}`);
  }
  await capturePair(page, 'matrix-09-results-victory');

  for (const entry of [...SCREEN_MATRIX_COVERAGE, ...WALKTHROUGH_STEP_COVERAGE]) {
    for (const file of Object.values(entry.evidence)) {
      if (!evidence.has(file)) throw new Error(`${entry.id} lacks generated evidence ${file}`);
    }
  }
  if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(' | ')}`);

  writeFileSync(`${output}/audit.json`, `${JSON.stringify({
    version: 1,
    fixture: { mapId: 'grand-muster', seed, difficulty: 'normal' },
    objective: 'Showcase sandbox: fight, explore, build, and retire when finished.',
    actionSequence: save.actionLog.map((action) => action.type).concat('RETIRE'),
    observed: [...observed].sort(),
    inspections: [...inspectionSubjects].sort(),
    matrix: SCREEN_MATRIX_COVERAGE,
    walkthrough: WALKTHROUGH_STEP_COVERAGE,
    replayAssertions: {
      contentHash: save.contentHash,
      day: replayed.day,
      builtMarketplace: true,
      recruitedAndTransferred: true,
      collectedPile: true,
      acceptedArtifact: 'skirmishersBlade',
      attendedHedgeSchool: true,
      consumedCombatItem: 'bottledEcho',
      guardianRemoved: true,
      acceptedSparringReward: true,
      authoredOutcome: 'retired',
    },
  }, null, 2)}\n`);
  console.log(`New-player walkthrough passed: ${save.actionLog.length + 1} actions, day ${replayed.day}, ${evidence.size} screenshots, ${output}`);
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser?.close();
  clearInterval(keepAlive);
}
