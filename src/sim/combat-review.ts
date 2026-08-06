import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { FACTION_UNITS, UNITS } from '../content/units';
import { makeArmy } from '../core/army';
import { createBattle } from '../core/combat/setup';
import { createGame } from '../core/game';
import { actionSave } from '../ui/persistence';
import type { FactionId, UnitId } from '../core/types';

const SPECIAL_ROSTERS = {
  gloamingCourt: ['mirrorBound', 'maskedDuelist', 'hearthHound', 'waxServitor', 'standingMirror'],
  seamborn: ['sleeper', 'siegeWall', 'siegeRam', 'watchtower', 'makerWall'],
  driftfolk: ['sirens', 'drownedCrew', 'hullTurtle', 'lanternAngler'],
} satisfies Record<string, UnitId[]>;

type ReviewRosterId = FactionId | keyof typeof SPECIAL_ROSTERS;

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const outputDir = '.pixel-work/review/combat';
mkdirSync(outputDir, { recursive: true });
const rosterArgument = process.argv[2] ?? 'hearthguard';
if (!(rosterArgument in FACTION_UNITS) && !(rosterArgument in SPECIAL_ROSTERS)) {
  throw new Error(`Unknown combat review roster: ${rosterArgument}`);
}
const rosterId = rosterArgument as ReviewRosterId;
const unitIds: readonly UnitId[] = rosterId in SPECIAL_ROSTERS
  ? SPECIAL_ROSTERS[rosterId as keyof typeof SPECIAL_ROSTERS]
  : FACTION_UNITS[rosterId as FactionId];
// Two opposing Sleepers heal to full every round, so their no-magic auto-resolve projection is
// intentionally endless. A large Thunderbird stack keeps the visual review deterministic while
// still displaying every Seamborn and siege sprite together on the attacker side.
const defenderUnitIds: readonly UnitId[] = rosterId === 'seamborn'
  ? ['thunderbird']
  : unitIds;

const state = createGame({
  seed: 602, mapId: 'grand-muster', difficulty: 'normal', p1: 'human', p2: 'dormant',
});
const attacker = rosterId in FACTION_UNITS
  ? state.players.p1.heroes.find((hero) => hero.faction === rosterId)!
  : state.players.p1.hero!;
const defender = structuredClone(attacker);
defender.id = `${rosterId}-review-defender`;
defender.name = 'The Other Muster';
defender.owner = 'p2';
const roster = makeArmy(unitIds.map((unitId) => ({
  unitId, count: UNITS[unitId].growth * 2,
})));
const defenderRoster = makeArmy(defenderUnitIds.map((unitId) => ({
  unitId, count: rosterId === 'seamborn' ? 100 : UNITS[unitId].growth * 2,
})));
const [battle] = createBattle(
  roster, defenderRoster, attacker, defender,
  {
    kind: 'hero', targetId: defender.id, destination: { x: 20, y: 20 },
    attackerHeroId: attacker.id, defenderHeroId: defender.id,
    defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
  }, state.rng,
);
battle.obstacles = [];
battle.obstacleProps = [];
state.battle = battle;
state.phase = 'combat';
state.replay = [];

const reviewState = structuredClone(state);
const reviewSave = actionSave(state);
const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(`browser page error: ${
    error instanceof Error ? error.stack ?? error.message : String(error)
  }`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`browser console error: ${message.text()}`);
  });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
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
  await page.waitForSelector('.combat-shell');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => [...document.querySelectorAll('.battle-unit-pixel')]
    .every((node) => Number(node.getAttribute('opacity')) === 1));
  const fallbackCount = await page.$$eval('.battle-stack .stack-body', (nodes) => nodes.length);
  if (fallbackCount) throw new Error(`${fallbackCount} ${rosterId} units used glyph fallbacks`);
  const layout = await page.evaluate(() => {
    const board = document.querySelector<SVGSVGElement>('.battle-board > svg')!;
    const boardRect = board.getBoundingClientRect();
    let clippedHexes = 0;
    for (const node of document.querySelectorAll('.battle-hex')) {
      const rect = node.getBoundingClientRect();
      if (rect.left < boardRect.left - 1 || rect.top < boardRect.top - 1
          || rect.right > boardRect.right + 1 || rect.bottom > boardRect.bottom + 1) {
        clippedHexes += 1;
      }
    }
    let clippedUnits = 0;
    for (const node of document.querySelectorAll('.battle-unit-pixel')) {
      const rect = node.getBoundingClientRect();
      if (rect.left < boardRect.left - 1 || rect.top < boardRect.top - 1
          || rect.right > boardRect.right + 1 || rect.bottom > boardRect.bottom + 1) {
        clippedUnits += 1;
      }
    }
    const ids: string[] = [];
    for (const node of document.querySelectorAll<SVGGElement>('.battle-stack')) {
      ids.push(node.dataset.inspectId!);
    }
    return {
      board: {
        left: boardRect.left, top: boardRect.top,
        right: boardRect.right, bottom: boardRect.bottom,
      },
      clippedHexes,
      clippedUnits,
      roster: [...new Set(ids)],
      unitCount: ids.length,
    };
  });
  if (layout.clippedHexes || layout.clippedUnits) {
    throw new Error(`Clipped combat layout: ${JSON.stringify(layout)}`);
  }
  const expectedRoster = new Set([...unitIds, ...defenderUnitIds]);
  if (layout.unitCount !== unitIds.length + defenderUnitIds.length
      || layout.roster.length !== expectedRoster.size) {
    throw new Error(`Incomplete ${rosterId} lineup: ${JSON.stringify(layout)}`);
  }
  await page.screenshot({ path: `${outputDir}/${rosterId}-lineup.png` });
  console.log(`ok ${rosterId} battle · ${unitIds.length} reviewed types · no clipped hexes/sprites/glyphs`);
} finally {
  await browser.close();
}
