import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { autoResolveBattle } from '../ai/combat';
import { UNITS } from '../content/units';
import { armyPower, makeArmy, unitStrength } from '../core/army';
import { createBattle } from '../core/combat/setup';
import { createGame } from '../core/game';
import type {
  ArmyStack, FactionId, Hero, UnitId,
} from '../core/types';

const SEEDS = [11, 29, 47] as const;
const REFERENCE_COUNT = 12;

const SAME_UNIT_COUNTS = [4, 8, 16, 32] as const;

const UNIT_PAIRS: ReadonlyArray<readonly [UnitId, UnitId]> = [
  ['yeoman', 'tinSoldier'],
  ['longbowman', 'hobbyKnight'],
  ['marionette', 'sentries'],
  ['lanceKnight', 'stuffedSentinel'],
  ['boneChoir', 'rusalka'],
  ['oriflammeWarden', 'dragonflyCavalry'],
  ['silkSpinners', 'ashmaneWolves'],
  ['amberCarriers', 'aurochsHerd'],
  ['brides', 'leshy'],
  ['oriflammeWyvern', 'thunderbird'],
  ['reliquaryArk', 'walkingHut'],
  ['halfWokenQueen', 'ferry'],
];

interface MixedMatchup {
  name: string;
  left: ArmyStack[];
  right: ArmyStack[];
}

const MIXED_MATCHUPS: readonly MixedMatchup[] = [
  {
    name: 'low-tier melee against ranged support',
    left: [{ unitId: 'yeoman', count: 30 }, { unitId: 'hobbyKnight', count: 10 }],
    right: [{ unitId: 'longbowman', count: 14 }, { unitId: 'sentries', count: 11 }],
  },
  {
    name: 'fast assault against defensive line',
    left: [{ unitId: 'marionette', count: 12 }, { unitId: 'lanceKnight', count: 7 }],
    right: [{ unitId: 'stuffedSentinel', count: 7 }, { unitId: 'boneChoir', count: 8 }],
  },
  {
    name: 'flying force against beasts',
    left: [{ unitId: 'dragonflyCavalry', count: 8 }, { unitId: 'thunderbird', count: 3 }],
    right: [{ unitId: 'ashmaneWolves', count: 15 }, { unitId: 'aurochsHerd', count: 8 }],
  },
  {
    name: 'high-tier mixed companies',
    left: [{ unitId: 'oriflammeWarden', count: 7 }, { unitId: 'oriflammeWyvern', count: 3 }],
    right: [{ unitId: 'leshy', count: 7 }, { unitId: 'walkingHut', count: 3 }],
  },
  {
    name: 'ranged and control mix',
    left: [{ unitId: 'silkSpinners', count: 14 }, { unitId: 'halfWokenQueen', count: 3 }],
    right: [{ unitId: 'boneChoir', count: 10 }, { unitId: 'ferry', count: 3 }],
  },
  {
    name: 'three-faction combined arms',
    left: [
      { unitId: 'yeoman', count: 24 }, { unitId: 'rusalka', count: 6 },
      { unitId: 'grassSerpent', count: 3 },
    ],
    right: [
      { unitId: 'tinSoldier', count: 22 }, { unitId: 'amberCarriers', count: 6 },
      { unitId: 'brides', count: 3 },
    ],
  },
];

function neutralHero(seed: number, faction: FactionId): Hero {
  const game = createGame({ seed, p1: 'human', p2: 'human' });
  const hero = structuredClone(game.players.p1.hero!);
  hero.faction = faction;
  hero.attack = 0;
  hero.defense = 0;
  hero.spellPower = 0;
  hero.knowledge = 0;
  hero.luck = 0;
  hero.moraleBonus = 0;
  hero.mana = 0;
  hero.level = 1;
  hero.knownSpells = [];
  hero.upgradedSpells = [];
  hero.skills = {};
  hero.inventory.fill(null);
  hero.artifacts = {
    equipment: Object.fromEntries(Object.keys(hero.artifacts.equipment)
      .map((slot) => [slot, null])) as Hero['artifacts']['equipment'],
    backpack: [],
  };
  return hero;
}

function factionFor(army: readonly ArmyStack[]): FactionId {
  const faction = UNITS[army[0].unitId].faction;
  return ['hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass']
    .includes(faction) ? faction as FactionId : 'hearthguard';
}

function leftWin(
  left: readonly ArmyStack[], right: readonly ArmyStack[], seed: number, swap: boolean,
): boolean {
  const attacker = swap ? right : left;
  const defender = swap ? left : right;
  const attackerHero = neutralHero(seed, factionFor(attacker));
  const defenderHero = neutralHero(seed ^ 0x5f3759df, factionFor(defender));
  const [battle] = createBattle(
    makeArmy([...attacker]), makeArmy([...defender]), attackerHero, defenderHero,
    {
      kind: 'hero', targetId: defenderHero.id, destination: { x: 0, y: 0 },
      attackerHeroId: attackerHero.id, defenderHeroId: defenderHero.id,
      defenderPlayerId: defenderHero.owner,
    }, seed,
  );
  // Open ground isolates catalog statistics and abilities from seeded obstacle luck.
  battle.obstacles = [];
  battle.obstacleProps = [];
  const winner = autoResolveBattle(battle).winner;
  return swap ? winner === 'defender' : winner === 'attacker';
}

function leftWinRate(left: readonly ArmyStack[], right: readonly ArmyStack[]): number {
  let wins = 0;
  for (const seed of SEEDS) {
    if (leftWin(left, right, seed, false)) wins += 1;
    if (leftWin(left, right, seed, true)) wins += 1;
  }
  return wins / (SEEDS.length * 2);
}

function empiricalEquivalentCount(leftId: UnitId, rightId: UnitId): number {
  let low = 1;
  let high = 2;
  const left = [{ unitId: leftId, count: REFERENCE_COUNT }];
  while (leftWinRate(left, [{ unitId: rightId, count: high }]) >= 0.5 && high < 512) {
    low = high;
    high *= 2;
  }
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (leftWinRate(left, [{ unitId: rightId, count: middle }]) >= 0.5) low = middle;
    else high = middle;
  }
  return high;
}

function legacyUnitStrength(unitId: UnitId): number {
  const unit = UNITS[unitId];
  return unit.hp * ((unit.damage[0] + unit.damage[1]) / 2);
}

function percentError(estimate: number, actual: number): number {
  return Math.abs(estimate - actual) / actual * 100;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function guardianStrengthCalibrationMarkdown(): string {
  const sameUnitRows = (['yeoman', 'longbowman', 'marionette', 'stuffedSentinel',
    'oriflammeWyvern', 'halfWokenQueen'] as UnitId[]).map((unitId) => ({
    unitId,
    equalRate: leftWinRate(
      [{ unitId, count: REFERENCE_COUNT }], [{ unitId, count: REFERENCE_COUNT }],
    ),
    doubledRate: leftWinRate(
      [{ unitId, count: REFERENCE_COUNT * 2 }], [{ unitId, count: REFERENCE_COUNT }],
    ),
  }));
  const rows = UNIT_PAIRS.map(([leftId, rightId]) => {
    const empirical = empiricalEquivalentCount(leftId, rightId);
    const chosen = REFERENCE_COUNT * unitStrength(leftId) / unitStrength(rightId);
    const legacy = REFERENCE_COUNT * legacyUnitStrength(leftId) / legacyUnitStrength(rightId);
    return { leftId, rightId, empirical, chosen, legacy };
  });
  const chosenErrors = rows.map((row) => percentError(row.chosen, row.empirical));
  const legacyErrors = rows.map((row) => percentError(row.legacy, row.empirical));

  const mixed = MIXED_MATCHUPS.map((matchup) => {
    const rate = leftWinRate(matchup.left, matchup.right);
    const chosenRatio = armyPower(makeArmy([...matchup.left]))
      / armyPower(makeArmy([...matchup.right]));
    const legacy = (army: readonly ArmyStack[]) => army.reduce((sum, stack) =>
      sum + stack.count * legacyUnitStrength(stack.unitId), 0);
    const legacyRatio = legacy(matchup.left) / legacy(matchup.right);
    const observed = rate > 0.5 ? 'left' : rate < 0.5 ? 'right' : 'split';
    return { ...matchup, rate, chosenRatio, legacyRatio, observed };
  });
  const decisive = mixed.filter((row) => row.observed !== 'split');
  const agrees = (ratio: number, observed: string) =>
    (ratio > 1 && observed === 'left') || (ratio < 1 && observed === 'right');
  const chosenOrdering = decisive.filter((row) => agrees(row.chosenRatio, row.observed)).length;
  const legacyOrdering = decisive.filter((row) => agrees(row.legacyRatio, row.observed)).length;

  const lines = [
    '# Guardian strength calibration report',
    '',
    `Generated deterministically with seeds ${SEEDS.join(', ')}. Each result combines both attacker/defender seatings on open meadow.`,
    '',
    '## Count invariance',
    '',
    '| Unit | Counts | Rating / one-unit rating |',
    '|---|---:|---:|',
    ...(['yeoman', 'longbowman', 'marionette', 'stuffedSentinel', 'oriflammeWyvern',
      'sleeper'] as UnitId[]).map((unitId) => {
      const ratios = SAME_UNIT_COUNTS.map((count) =>
        armyPower(makeArmy([{ unitId, count }])) / unitStrength(unitId));
      return `| ${UNITS[unitId].name} | ${SAME_UNIT_COUNTS.join(', ')} | ${ratios.join(', ')} |`;
    }),
    '',
    '## Same-unit battle outcomes',
    '',
    `Each row uses ${REFERENCE_COUNT} defenders. Equal stacks split by seating; doubling only the left count must win every paired battle.`,
    '',
    '| Unit | Equal-count left wins | Double-count left wins |',
    '|---|---:|---:|',
    ...sameUnitRows.map((row) => `| ${UNITS[row.unitId].name} | ${(row.equalRate * 100).toFixed(0)}% | ${(row.doubledRate * 100).toFixed(0)}% |`),
    '',
    '## Same-stack-type break-even counts',
    '',
    `For ${REFERENCE_COUNT} units in the left column, empirical is the first opposing count winning at least half of ${SEEDS.length * 2} paired battles.`,
    '',
    '| Left | Right | Empirical | Chosen estimate | Chosen error | Legacy estimate | Legacy error |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...rows.map((row) => `| ${UNITS[row.leftId].name} ×${REFERENCE_COUNT} | ${UNITS[row.rightId].name} | ${row.empirical} | ${row.chosen.toFixed(1)} | ${percentError(row.chosen, row.empirical).toFixed(1)}% | ${row.legacy.toFixed(1)} | ${percentError(row.legacy, row.empirical).toFixed(1)}% |`),
    '',
    `Chosen median absolute break-even error: **${median(chosenErrors).toFixed(1)}%**; legacy: **${median(legacyErrors).toFixed(1)}%**.`,
    '',
    '## Mixed-army ordering',
    '',
    '| Matchup | Left win rate | Observed | Chosen L/R | Legacy L/R |',
    '|---|---:|---|---:|---:|',
    ...mixed.map((row) => `| ${row.name} | ${(row.rate * 100).toFixed(0)}% | ${row.observed} | ${row.chosenRatio.toFixed(2)} | ${row.legacyRatio.toFixed(2)} |`),
    '',
    `Chosen ordering agreement: **${chosenOrdering}/${decisive.length}** decisive matchups; legacy: **${legacyOrdering}/${decisive.length}**.`,
    '',
  ];
  return lines.join('\n');
}

const report = `${guardianStrengthCalibrationMarkdown()}\n`;
if (process.argv.includes('--check')) {
  const committed = readFileSync(resolve('docs/reports/GUARDIAN_STRENGTH_CALIBRATION.md'), 'utf8');
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').trimEnd();
  if (normalize(committed) !== normalize(report)) throw new Error(
    'Guardian strength calibration report is stale; rerun without --check and update the report.',
  );
  console.log('Guardian strength calibration report matches deterministic simulations.');
} else {
  console.log(report.trimEnd());
}
