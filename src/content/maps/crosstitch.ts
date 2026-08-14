import { FACTION_UNITS, UNITS } from '../units';
import { SCROLL_SPELL_IDS } from '../spells';
import type {
  Coord, FactionId, GameMap, MapObject, TerrainTile,
} from '../../core/types';
import { terrainId, tile } from '../terrain';
import { validateMap } from './borderMarches';
import {
  materializeGuardians, trimRoadsForCities, type AuthoredGuardian,
} from './occupancyAuthoring';
import { seededSpellTome } from '../../core/game/chests';

export const CROSSTITCH_WIDTH = 36;
export const CROSSTITCH_HEIGHT = 28;
export const CROSSTITCH_CASTLE_POSITIONS: Coord[] = [
  { x: 4, y: 4 }, { x: 31, y: 4 }, { x: 4, y: 23 }, { x: 31, y: 23 },
];

function terrain(): TerrainTile[][] {
  return Array.from({ length: CROSSTITCH_HEIGHT }, (_, y) =>
    Array.from({ length: CROSSTITCH_WIDTH }, (_, x): TerrainTile => {
      if ((x === 17 || x === 18) && ![6, 13, 14, 21].includes(y)) return tile(y < 8 ? 'hush' : 'mountain', y < 8 ? 'north' : 'granite');
      if ((y === 13 || y === 14) && ![7, 17, 18, 28].includes(x)) return tile('water');
      if (y < 7 && (x * 5 + y * 7) % 5 < 2) return tile('hush', 'north');
      if (y > 20 && (x * 3 + y) % 4 < 2) return tile('ashsteppe', 'south');
      if (x > 12 && x < 23 && y > 7 && y < 20) return tile('mosswold', 'mossy');
      if ((x * 5 + y * 7) % 19 < 3) return tile('deepwood');
      if ((x + y * 3) % 31 === 0) return tile('barrowfield');
      return tile('meadow');
    }));
}

function scroll(seed: number, salt: number, plus = false) {
  return {
    id: 'spellScroll' as const,
    storedSpellId: SCROLL_SPELL_IDS[(Math.imul(seed ^ salt, 2654435761) >>> 0)
      % SCROLL_SPELL_IDS.length],
    plus,
  };
}

function factionDwellings(): MapObject[] {
  const factions: FactionId[] = [
    'hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass',
  ];
  const positions = [
    [8, 3], [12, 6], [7, 9], [23, 3], [28, 8], [23, 10],
    [3, 9], [11, 11], [7, 17], [28, 10], [24, 17], [32, 15],
    [3, 18], [11, 21], [8, 25], [27, 18], [23, 22], [31, 25],
  ];
  let cursor = 0;
  return factions.flatMap((faction) => [0, 1, 2].map((tier) => {
    const unitId = FACTION_UNITS[faction][tier];
    const [x, y] = positions[cursor++];
    return {
      id: `${faction}-dwelling-${tier + 1}`, kind: 'dwelling' as const,
      position: { x, y }, unitId,
      available: Math.max(1, Math.floor(UNITS[unitId].growth / 2)), lastGrowthWeek: 1,
    };
  }));
}

function standardObjects(): MapObject[] {
  const minePositions = [
    [[5, 7], [2, 6], [6, 1], [9, 6]],
    [[30, 7], [33, 6], [27, 2], [26, 6]],
    [[6, 19], [1, 20], [6, 25], [9, 20]],
    [[28, 19], [33, 23], [29, 25], [26, 20]],
  ];
  const resources = [
    ['gold', 1_000], ['timber', 2], ['iron', 1], ['essence', 1],
  ] as const;
  const mines: MapObject[] = minePositions.flatMap((corner, cornerIndex) =>
    corner.map(([x, y], resourceIndex) => ({
      id: `crosstitch-${cornerIndex}-${resources[resourceIndex][0]}-mine`,
      kind: 'mine' as const, position: { x, y: y + 1 },
      footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 },
      resource: resources[resourceIndex][0], income: resources[resourceIndex][1],
      owner: null, cleared: resourceIndex > 0, chartered: false,
    })));
  const cornerSites = [
    { chest: [6, 6], shrine: [10, 4], school: 'rite', teaches: 'rally' },
    { chest: [29, 6], shrine: [25, 4], school: 'craft', teaches: 'forgeSpark' },
    { chest: [6, 21], shrine: [10, 23], school: 'grave', teaches: 'wither' },
    { chest: [29, 21], shrine: [25, 23], school: 'wild', teaches: 'bloom' },
  ] as const;
  const sites: MapObject[] = cornerSites.flatMap((site, index) => [
    {
      id: `crosstitch-chest-${index + 1}`, kind: 'chest' as const,
      position: { x: site.chest[0], y: site.chest[1] },
      cleared: true, collected: false,
    },
    {
      id: `crosstitch-shrine-${index + 1}`, kind: 'shrine' as const,
      position: { x: site.shrine[0], y: site.shrine[1] },
      school: site.school, teaches: site.teaches,
      cleared: false, visitedBy: [],
    },
  ]);
  const piles: MapObject[] = [
    [12, 3, 'gold', 750], [23, 5, 'timber', 5],
    [12, 24, 'iron', 3], [23, 24, 'essence', 3],
    [7, 14, 'essence', 4], [28, 14, 'essence', 4],
  ].map(([x, y, resource, amount], index) => ({
    id: `crosstitch-pile-${index + 1}`, kind: 'pile' as const,
    position: { x: x as number, y: y as number },
    resource: resource as 'gold' | 'timber' | 'iron' | 'essence',
    amount: amount as number, collected: false,
  }));
  return [...mines, ...sites, ...piles];
}

function objects(seed: number): MapObject[] {
  const result: MapObject[] = [
    ...standardObjects(),
    ...factionDwellings(),
    {
      id: 'masque-ring', kind: 'dwelling', position: { x: 18, y: 6 },
      unitId: 'maskedDuelist', available: 2, lastGrowthWeek: 1,
    },
    {
      id: 'tinkers-cart', kind: 'tinkersCart', position: { x: 8, y: 12 },
      route: [{ x: 8, y: 12 }, { x: 12, y: 12 }, { x: 16, y: 12 },
        { x: 17, y: 13 }, { x: 19, y: 12 }, { x: 23, y: 12 }, { x: 27, y: 12 }],
      routeIndex: 0, stock: { id: 'blackfireOil' }, stockWeek: 1,
    },
    {
      id: 'unstruck-bell', kind: 'monastery', position: { x: 17, y: 6 },
      firstVisitorId: null, blessings: {},
    },
    { id: 'gloaming-ring', kind: 'gloamingRing', position: { x: 19, y: 21 }, deposit: null },
    { id: 'storytellers-fire', kind: 'storyteller', position: { x: 14, y: 10 }, visitedWeek: {} },
    { id: 'chrysalis-pool', kind: 'chrysalis', position: { x: 21, y: 17 }, visitedWeek: {} },
    {
      id: 'half-built-bridge', kind: 'bridge', position: { x: 17, y: 13 },
      completed: false, opens: [{ x: 17, y: 12 }, { x: 18, y: 12 }],
    },
    { id: 'hedge-school', kind: 'hedgeSchool', position: { x: 13, y: 18 }, visitedBy: [] },
    { id: 'reliquary-cairn', kind: 'reliquaryCairn', position: { x: 22, y: 9 },
      tomeSpellId: seededSpellTome(seed, 'crosstitch-reliquary-cairn', 'reliquary-cairn').storedSpellId,
      tomeClaimed: false },
    {
      id: 'toll-gate', kind: 'tollGate', position: { x: 18, y: 14 },
      paidBy: [], cleared: false,
    },
    { id: 'omen-stone', kind: 'omenStone', position: { x: 10, y: 15 }, visitedBy: [] },
    { id: 'wayward-crone', kind: 'crone', position: { x: 27, y: 19 }, visitedWeek: {} },
    {
      id: 'barrow-field', kind: 'barrowField', position: { x: 25, y: 12 },
      scroll: seededSpellTome(seed, 'crosstitch-barrow-field', 'barrow'), collected: false,
    },
    {
      id: 'seam-echo-lock', kind: 'lock', position: { x: 18, y: 21 },
      name: 'The Seam-Born Choir', tell: 'Its answer arrives before the question.',
      reward: { teachesSpell: 'echo', essence: 6 }, cleared: false,
    },
  ];
  result.push({
    id: 'crosstitch-mana-spring', kind: 'manaSpring', position: { x: 16, y: 10 },
    visitedWeek: {},
  });
  const locks = [
    { id: 'nw-kit-lock', position: { x: 2, y: 2 }, artifact: 'tailorsNeedle' as const },
    { id: 'ne-kit-lock', position: { x: 33, y: 2 }, artifact: 'goldenThread' as const },
    { id: 'sw-kit-lock', position: { x: 2, y: 25 }, artifact: 'tailorsThimble' as const },
    { id: 'se-kit-lock', position: { x: 33, y: 25 }, artifact: 'patternbook' as const },
  ];
  locks.forEach((entry) => result.push({
    id: entry.id, kind: 'lock', position: entry.position,
    name: 'The Corner Stitch', tell: 'Four corners hold one unfinished pattern.',
    reward: { artifacts: [{ id: entry.artifact }] }, cleared: false,
  }));
  return result;
}

function authoredGuardians(): AuthoredGuardian[] {
  return [
    ...Array.from({ length: 4 }, (_, cornerIndex): AuthoredGuardian => ({
      targetId: `crosstitch-${cornerIndex}-gold-mine`,
      army: [{ unitId: 'waxServitor', count: 12 }], split: true,
    })),
    ...Array.from({ length: 4 }, (_, index): AuthoredGuardian => ({
      targetId: `crosstitch-shrine-${index + 1}`,
      army: [{ unitId: 'maskedDuelist', count: 6 }], split: true,
    })),
    {
      targetId: 'toll-gate', army: [{ unitId: 'waxServitor', count: 20 }],
    },
    { targetId: 'crosstitch-mana-spring', army: [{ unitId: 'boneChoir', count: 8 }] },
    {
      targetId: 'seam-echo-lock', army: [{ unitId: 'sleeper', count: 6 }], split: false,
    },
    ...['nw-kit-lock', 'ne-kit-lock', 'sw-kit-lock', 'se-kit-lock'].map(
      (targetId, index): AuthoredGuardian => ({
        targetId,
        ...(index === 0 ? { position: { x: 1, y: 2 } }
          : index === 1 ? { position: { x: 34, y: 2 } } : {}),
        army: [{ unitId: 'mirrorBound', count: 10 }], split: false, static: true,
      }),
    ),
  ];
}

export function createCrosstitch(seed = 1): GameMap {
  const seams = [
    ...Array.from({ length: CROSSTITCH_HEIGHT }, (_, y) => ({ x: 18, y })),
    ...Array.from({ length: CROSSTITCH_WIDTH }, (_, x) => ({ x, y: 14 })),
  ];
  const authoredTerrain = terrain();
  const roads = [
    ...Array.from({ length: 28 }, (_, index) => ({ x: index + 4, y: 4 })),
    ...Array.from({ length: 20 }, (_, index) => ({ x: 4, y: index + 4 })),
    ...Array.from({ length: 20 }, (_, index) => ({ x: 31, y: index + 4 })),
    ...Array.from({ length: 28 }, (_, index) => ({ x: index + 4, y: 23 })),
  ].filter((position) => !['mountain', 'water'].includes(terrainId(authoredTerrain[position.y][position.x])));
  const map: GameMap = materializeGuardians({
    id: 'crosstitch', name: 'Crosstitch', seed, width: CROSSTITCH_WIDTH,
    height: CROSSTITCH_HEIGHT, terrain: authoredTerrain, objects: objects(seed), seams,
    roads: trimRoadsForCities(roads, CROSSTITCH_CASTLE_POSITIONS),
    victory: {
      type: 'conquest',
      flavor: 'Unpick every rival claim upon the Crosstitch.',
      mechanics: 'Defeat all opposing players.',
    },
  }, authoredGuardians());
  validateMap(map);
  return map;
}

export function createCrosstitchKit(seed = 1): GameMap {
  const map = createCrosstitch(seed);
  return {
    ...map, id: 'crosstitch-kit', name: 'Crosstitch: The Kit',
    victory: {
      type: 'assemble', setId: 'tailorsKit',
      flavor: 'Bring the four corner-tools together and finish the old pattern.',
      mechanics: "Equip or carry Tailor's Needle, Golden Thread, Tailor's Thimble, and Patternbook.",
    },
  };
}
