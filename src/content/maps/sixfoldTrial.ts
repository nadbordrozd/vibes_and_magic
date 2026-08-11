import { armyPower, makeArmy, unitStrength } from '../../core/army';
import type {
  ArtifactId, Coord, FactionId, GameMap, HeroDefinitionId, MapObject,
  PlayerId, SecondarySkillId, SkillRank, TerrainTile, UnitId,
} from '../../core/types';
import { PLAYER_IDS } from '../../core/types';
import { tile } from '../terrain';
import {
  materializeGuardians, trimRoadsForCities, type AuthoredGuardian,
} from './occupancyAuthoring';
import { validateMap } from './borderMarches';

export const SIXFOLD_TRIAL_WIDTH = 54;
export const SIXFOLD_TRIAL_HEIGHT = 42;
export const SIXFOLD_RECRUIT_WEEKS = 2;

export interface SixfoldPlayerSetup {
  id: PlayerId;
  faction: FactionId;
  entrance: Coord;
  heroDefinitionId: HeroDefinitionId;
  level: number;
  statBonus: number;
  skills: Partial<Record<SecondarySkillId, SkillRank>>;
}

/** Executable setup authority; tests derive all six starting states from this catalog. */
export const SIXFOLD_PLAYER_SETUP: readonly SixfoldPlayerSetup[] = [
  { id: 'p1', faction: 'hearthguard', entrance: { x: 5, y: 5 }, heroDefinitionId: 'aldith',
    level: 8, statBonus: 7, skills: { command: 3, vanguard: 3, siegewright: 3, logistics: 3, attunement: 3, warden: 3 } },
  { id: 'p2', faction: 'woundWrights', entrance: { x: 27, y: 5 }, heroDefinitionId: 'silas',
    level: 8, statBonus: 7, skills: { alchemist: 3, provisioner: 3, siegewright: 3, logistics: 3, spellthief: 3, warden: 3 } },
  { id: 'p3', faction: 'unfinished', entrance: { x: 49, y: 5 }, heroDefinitionId: 'maren',
    level: 8, statBonus: 7, skills: { chronicler: 3, palimpsest: 3, curseEater: 3, attunement: 3, siegewright: 3, logistics: 3 } },
  { id: 'p4', faction: 'vespiary', entrance: { x: 5, y: 36 }, heroDefinitionId: 'vess',
    level: 8, statBonus: 7, skills: { alchemist: 3, twicetold: 3, spellthief: 3, attunement: 3, siegewright: 3, logistics: 3 } },
  { id: 'p5', faction: 'hagwood', entrance: { x: 27, y: 36 }, heroDefinitionId: 'babaZima',
    level: 8, statBonus: 7, skills: { ritualist: 3, peddler: 3, curseEater: 3, diplomacy: 3, attunement: 3, logistics: 3 } },
  { id: 'p6', faction: 'wildergrass', entrance: { x: 49, y: 36 }, heroDefinitionId: 'temir',
    level: 8, statBonus: 7, skills: { beastmaster: 3, vanguard: 3, ransomer: 3, command: 3, siegewright: 3, logistics: 3 } },
] as const;

if (SIXFOLD_PLAYER_SETUP.length !== PLAYER_IDS.length
    || new Set(SIXFOLD_PLAYER_SETUP.map((slot) => slot.id)).size !== PLAYER_IDS.length
    || new Set(SIXFOLD_PLAYER_SETUP.map((slot) => slot.faction)).size !== PLAYER_IDS.length) {
  throw new Error('The Sixfold Trial requires six unique slots and six unique factions');
}

export const SIXFOLD_ARTIFACTS: readonly ArtifactId[] = [
  'travelersCloak', 'ringOfSmallMendings', 'falconersGlove', 'whetstoneOfTheClans',
  'quietHorseshoe', 'purseOfThePrudentToad', 'sashOfTheLeviedMile', 'scribesCuff',
  'captainsWeathercoat', 'surveyorsBoots', 'fieldClerksSeal', 'ashwoodBracer',
  'sunderedHourglass', 'longestCandle', 'bannerOfTheFirstField', 'seamstone',
  'mirrorshardPendant', 'wolfMothersTorc',
] as const;

export const SIXFOLD_GUARDIAN_BANDS = [
  { id: 'skirmish', minimum: 100, maximum: 220 },
  { id: 'field', minimum: 240, maximum: 440 },
  { id: 'elite', minimum: 500, maximum: 800 },
  { id: 'ordeal', minimum: 850, maximum: 1_300 },
] as const;

const GUARD_UNITS: readonly UnitId[] = [
  'maskedDuelist', 'waxServitor', 'hearthHound', 'sirens', 'mirrorBound',
  'sleeper', 'lanternAngler', 'drownedCrew', 'hullTurtle', 'marionette',
  'boneChoir', 'silkSpinners', 'woodenColossus', 'oriflammeWarden', 'bannerman',
  'ashmaneWolves', 'tinSoldier', 'yeoman',
];

const GUARD_TARGETS = [150, 180, 210, 280, 340, 410, 540, 640, 760,
  900, 1_000, 1_150, 160, 320, 600, 1_200, 720, 380] as const;

function terrain(): TerrainTile[][] {
  return Array.from({ length: SIXFOLD_TRIAL_HEIGHT }, (_, y) =>
    Array.from({ length: SIXFOLD_TRIAL_WIDTH }, (_, x): TerrainTile => {
      if (x === 0 || y === 0 || x === SIXFOLD_TRIAL_WIDTH - 1
          || y === SIXFOLD_TRIAL_HEIGHT - 1) return tile('mountain', 'granite');
      if (y < 8) return x < 18 ? tile('meadow')
        : x < 36 ? tile('lacquerFlats') : tile('barrowfield');
      if (y > 33) return x < 18 ? tile('mosswold', 'mossy')
        : x < 36 ? tile('deepwood', 'mossy') : tile('ashsteppe', 'south');
      if (y >= 18 && y <= 24) return (x + y) % 5 === 0
        ? tile('hush', 'north') : tile('meadow');
      return (x * 7 + y * 11) % 9 < 2 ? tile('meadow')
        : x < 14 ? tile('mosswold', 'mossy')
          : x < 27 ? tile('mire', 'coastal')
            : x < 40 ? tile('barrowfield') : tile('lacquerFlats');
    }));
}

function roads(): Coord[] {
  const cells: Coord[] = [];
  for (const y of [5, 21, 36]) for (let x = 1; x < SIXFOLD_TRIAL_WIDTH - 1; x += 1) {
    cells.push({ x, y });
  }
  for (const x of [5, 27, 49]) for (let y = 1; y < SIXFOLD_TRIAL_HEIGHT - 1; y += 1) {
    cells.push({ x, y });
  }
  const intersections = new Set([5, 21, 36].flatMap((y) =>
    [5, 27, 49].map((x) => `${x},${y}`)));
  return [...new Map(cells.map((cell) => [`${cell.x},${cell.y}`, cell])).values()]
    .filter((cell) => !intersections.has(`${cell.x},${cell.y}`));
}

function treasureChests(): MapObject[] {
  const xs = [4, 10, 16, 22, 28, 34, 40, 46, 52];
  const ys = [10, 14, 28, 32];
  return ys.flatMap((y, row) => xs.map((x, column): MapObject => ({
    id: `sixfold-chest-${row + 1}-${column + 1}`,
    kind: 'chest', position: { x, y }, cleared: false, collected: false,
  })));
}

function artifactSites(): MapObject[] {
  const xs = [4, 10, 16, 22, 28, 34, 40, 46, 52];
  const kinds = [
    'ruinedWatchtower', 'oldBearsCave', 'wolfHollow', 'unquietYard', 'moltingCourt',
    'spoolHoard',
  ] as const;
  return SIXFOLD_ARTIFACTS.map((artifactId, index): MapObject => ({
    id: `sixfold-reward-${index + 1}`, kind: kinds[index % kinds.length],
    position: { x: xs[index % xs.length], y: index < xs.length ? 18 : 23 },
    reward: { gold: 1_000 + index * 150, essence: 1 + Math.floor(index / 6),
      artifacts: [{ id: artifactId }] },
    cleared: false,
    ...(kinds[index % kinds.length] === 'oldBearsCave'
      ? { recruitUnitId: 'hearthHound' as const } : {}),
  } as MapObject));
}

function guardians(): AuthoredGuardian[] {
  const xs = [4, 10, 16, 22, 28, 34, 40, 46, 52];
  return SIXFOLD_ARTIFACTS.map((_artifact, index) => {
    const unitId = GUARD_UNITS[index];
    return {
      id: `sixfold-guardian-${index + 1}`,
      targetId: `sixfold-reward-${index + 1}`,
      position: { x: xs[index % xs.length], y: index < xs.length ? 19 : 24 },
      army: [{ unitId, count: Math.max(1, Math.round(GUARD_TARGETS[index] / unitStrength(unitId))) }],
      split: true, static: true,
    };
  });
}

export interface SixfoldMetrics {
  chests: number;
  artifacts: number;
  guardians: number;
  guardianStrengths: number[];
  roads: number;
}

export function sixfoldMetrics(map: GameMap): SixfoldMetrics {
  return {
    chests: map.objects.filter((object) => object.kind === 'chest').length,
    artifacts: map.objects.filter((object) => object.id.startsWith('sixfold-reward-'))
      .reduce((count, object) => count + ('reward' in object
        ? object.reward.artifacts?.length ?? 0 : 0), 0),
    guardians: map.objects.filter((object) => object.kind === 'guardian').length,
    guardianStrengths: map.objects.filter((object) => object.kind === 'guardian')
      .map((object) => object.kind === 'guardian' ? armyPower(makeArmy(object.army)) : 0)
      .sort((a, b) => a - b),
    roads: map.roads?.length ?? 0,
  };
}

export function createSixfoldTrial(seed = 1): GameMap {
  const map = materializeGuardians({
    id: 'sixfold-trial', name: 'The Sixfold Trial', seed,
    width: SIXFOLD_TRIAL_WIDTH, height: SIXFOLD_TRIAL_HEIGHT,
    terrain: terrain(), roads: trimRoadsForCities(
      roads(), SIXFOLD_PLAYER_SETUP.map((slot) => slot.entrance),
    ), objects: [...treasureChests(), ...artifactSites()],
    seams: [{ x: 26, y: 20 }, { x: 27, y: 20 }, { x: 26, y: 21 }, { x: 27, y: 21 }],
    victory: {
      type: 'conquest',
      flavor: 'Six banners enter a proving field built to reveal every clever edge.',
      mechanics: 'Master advanced battles, claim the proving seals, and defeat all opposing players.',
    },
  }, guardians());
  validateMap(map);
  return map;
}
