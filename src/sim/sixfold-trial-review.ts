import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createBattle } from '../core/combat/setup';
import { createGame } from '../core/game';
import { actionSave } from '../ui/persistence';
import { castleEntrance } from '../core/map/occupancy';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/sixfold-trial';
mkdirSync(output, { recursive: true });

const blockers = [
  '.error-toast', '.notice-toast', '.help-backdrop', '.inspection-backdrop',
  '.choice-dialog', '.result-dialog', '.action-confirmation',
];

function baseState() {
  const state = createGame({
    seed: 4900, mapId: 'sixfold-trial', playerCount: 6, difficulty: 'normal',
    p1: 'human', p2: 'dormant', p3: 'dormant', p4: 'dormant', p5: 'dormant', p6: 'dormant',
  });
  state.players.p1.explored = state.map.terrain.flatMap((row, y) =>
    row.map((_tile, x) => `${x},${y}`));
  state.replay = [];
  return state;
}

async function loadState(page: Page, state: ReturnType<typeof baseState>, expected: string) {
  await page.evaluate(({ save, initial }) => {
    localStorage.clear();
    localStorage.setItem('border-marches.save.v4', JSON.stringify(save));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
  }, { save: actionSave(state), initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.$eval('.load-button', (button) => (button as HTMLButtonElement).click());
  await page.waitForSelector(expected, { timeout: 15_000 });
  if (await page.$('.objective-primer')) {
    await page.$eval('.choice-dialog .primary', (button) => (button as HTMLButtonElement).click());
    await page.waitForSelector('.objective-primer', { hidden: true });
  }
  await page.waitForFunction(() => [...document.querySelectorAll('image.pixel-sprite')]
    .every((node) => node.getAttribute('opacity') === '1'), { timeout: 30_000 });
}

async function assertClean(page: Page, label: string, allowed: string[] = []) {
  const forbidden = blockers.filter((selector) => !allowed.includes(selector));
  const visible = await page.$$eval(forbidden.join(','), (nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width && rect.height;
    }).map((node) => ({ className: node.className, text: node.textContent?.slice(0, 100) })));
  if (visible.length) throw new Error(`${label} has stale overlays: ${JSON.stringify(visible)}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth
    - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`${label} has ${overflow}px horizontal page overflow`);
}

const audit: Record<string, unknown> = { fixture: 'sixfold-trial', seed: 4900, captures: [] };
const capture = async (page: Page, file: string, allowed: string[] = []) => {
  await assertClean(page, file, allowed);
  await page.screenshot({ path: `${output}/${file}`, fullPage: true });
  (audit.captures as string[]).push(file);
};

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  const selectable = await page.$eval('body', (body) => body.textContent?.includes(
    'The Sixfold Trial · Six-player advanced combat proving ground'));
  if (!selectable) throw new Error('The Sixfold Trial is absent from campaign setup');

  const adventure = baseState();
  await loadState(page, adventure, '.adventure-map');
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  const dimensions = await page.$eval('.adventure-map', (map) => ({
    width: map.getAttribute('width'), height: map.getAttribute('height'),
  }));
  if (dimensions.width !== '1728' || dimensions.height !== '1344') {
    throw new Error(`Unexpected native map dimensions: ${JSON.stringify(dimensions)}`);
  }
  await page.setViewport({ width: 1728, height: 1344, deviceScaleFactor: 1 });
  const nativeStyle = await page.addStyleTag({ content: `
    body * { visibility: hidden !important; }
    .map-frame, .adventure-map, .adventure-map * { visibility: visible !important; }
    .map-frame { position: fixed !important; inset: 0 !important; width: 1728px !important;
      height: 1344px !important; overflow: hidden !important; padding: 0 !important; z-index: 9999; }
    .adventure-map { position: absolute !important; inset: 0 !important; margin: 0 !important; }
    .map-caption, .minimap { display: none !important; }
  ` });
  await page.$eval('.map-frame', (node) => node.scrollTo(0, 0));
  const mapElement = await page.$('.adventure-map');
  if (!mapElement) throw new Error('Native map missing');
  await mapElement.screenshot({ path: `${output}/01-full-native-map-desktop.png` });
  (audit.captures as string[]).push('01-full-native-map-desktop.png');
  await nativeStyle.evaluate((node) => node.remove());

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.town-list button').click();
  await page.waitForSelector('.castle-screen');
  const castleText = await page.$eval('.castle-screen', (node) => node.textContent ?? '');
  for (const expected of ['City Hall', 'Keep', 'Mage Guild 3']) {
    if (!castleText.includes(expected)) throw new Error(`Developed castle omits ${expected}`);
  }
  await capture(page, '02-developed-castle-desktop.png');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await capture(page, '03-developed-castle-390.png');

  await loadState(page, adventure, '.adventure-map');
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.$eval('.rail-commands', (commands) => {
    const button = [...commands.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Hero details'));
    if (!button) throw new Error('Hero details command missing'); button.click();
  });
  await page.waitForSelector('.hero-details-dialog');
  await page.$eval('.hero-details-tabs', (tabs) => {
    const button = [...tabs.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Army'))!; button.click();
  });
  const armySlots = await page.$$('.hero-details-dialog .army-slot[data-inspect-kind="unit"]');
  if (armySlots.length !== 6) throw new Error(`Expected full six-tier roster, got ${armySlots.length}`);
  await capture(page, '04-full-army-desktop.png');
  await page.$eval('.hero-details-tabs', (tabs) => {
    const button = [...tabs.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Special skills'))!; button.click();
  });
  const skillCount = await page.$$('.hero-details-skills article');
  if (skillCount.length !== 6) throw new Error(`Expected six advanced skills, got ${skillCount.length}`);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await capture(page, '05-hero-skills-390.png');
  await page.locator('.hero-details-tabs button').click();
  await page.$eval('.hero-details-dialog', (dialog) => {
    const button = [...dialog.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Open adventure spellbook'))!; button.click();
  });
  await page.waitForSelector('.adventure-spellbook');
  const spellCount = await page.$$('.adventure-spellbook .spell-card');
  if (spellCount.length < 8) throw new Error(`Expected the complete adventure subset, got ${spellCount.length}`);
  await capture(page, '06-adventure-spellbook-390.png', ['.inspection-backdrop']);

  const neutral = baseState();
  const attacker = neutral.players.p1.hero!;
  const guardian = neutral.map.objects.find((object) => object.id === 'sixfold-guardian-16');
  if (!guardian || guardian.kind !== 'guardian') throw new Error('Advanced guardian fixture missing');
  [neutral.battle] = createBattle(attacker.army,
    Array(7).fill(null).map((_slot, index) => guardian.army[index]
      ? { ...guardian.army[index] } : null), attacker, null, {
      kind: 'guardian', targetId: guardian.id, destination: guardian.position,
      attackerHeroId: attacker.id, terrain: 'meadow',
    }, neutral.rng);
  neutral.phase = 'combat';
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await loadState(page, neutral, '.combat-shell');
  await capture(page, '06-advanced-neutral-combat-desktop.png');
  await page.locator('.spellbook-button').click();
  await page.waitForSelector('.spellbook');
  const combatSpellCount = await page.$$('.spellbook .spell-card');
  if (combatSpellCount.length !== 34) {
    throw new Error(`Expected all 34 faction-school spells, got ${combatSpellCount.length}`);
  }
  await capture(page, '07-combat-spells-and-abilities-desktop.png');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await capture(page, '08-advanced-neutral-combat-390.png');

  const siegeState = baseState();
  const siegeAttacker = siegeState.players.p1.hero!;
  const siegeDefender = siegeState.players.p2.hero!;
  const defendedCastle = siegeState.castles.find((castle) => castle.owner === 'p2')!;
  [siegeState.battle] = createBattle(siegeAttacker.army, siegeDefender.army,
    siegeAttacker, siegeDefender, {
      kind: 'castle', targetId: defendedCastle.id, destination: castleEntrance(defendedCastle),
      attackerHeroId: siegeAttacker.id, defenderHeroId: siegeDefender.id, defenderPlayerId: 'p2',
    }, siegeState.rng, true, 'quiet', true, siegeState.week);
  siegeState.phase = 'combat';
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await loadState(page, siegeState, '.combat-shell');
  await capture(page, '09-developed-castle-siege-desktop.png');

  const duelState = baseState();
  const duelist = duelState.players.p1.hero!;
  const rival = duelState.players.p4.hero!;
  [duelState.battle] = createBattle(duelist.army, rival.army, duelist, rival, {
    kind: 'hero', targetId: rival.id, destination: rival.position,
    attackerHeroId: duelist.id, defenderHeroId: rival.id, defenderPlayerId: rival.owner,
    terrain: 'meadow',
  }, duelState.rng);
  duelState.phase = 'combat';
  await loadState(page, duelState, '.combat-shell');
  await capture(page, '10-full-army-hero-duel-desktop.png');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  audit.browserErrors = errors;
  writeFileSync(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(`Sixfold review passed: ${(audit.captures as string[]).length} captures, no stale overlays or browser errors.`);
} finally {
  await browser.close();
}
