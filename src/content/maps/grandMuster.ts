import type {
  Coord, FactionId, GameMap, MapObject, PlayerId, ResourceId, TerrainTile, UnitId,
} from '../../core/types';
import { objectFootprintTiles } from '../../core/map/occupancy';
import { FACTION_UNITS, UNITS } from '../units';
import { terrainId, tile } from '../terrain';
import { materializeGuardians, type AuthoredGuardian } from './occupancyAuthoring';
import { validateMap } from './borderMarches';

export const GRAND_MUSTER_WIDTH = 56;
export const GRAND_MUSTER_HEIGHT = 44;

export const GRAND_MUSTER_CASTLES: ReadonlyArray<{ faction: FactionId; entrance: Coord }> = [
  { faction: 'hearthguard', entrance: { x: 5, y: 5 } },
  { faction: 'woundWrights', entrance: { x: 18, y: 5 } },
  { faction: 'unfinished', entrance: { x: 5, y: 19 } },
  { faction: 'vespiary', entrance: { x: 18, y: 19 } },
  { faction: 'hagwood', entrance: { x: 5, y: 33 } },
  { faction: 'wildergrass', entrance: { x: 18, y: 33 } },
];

export const GRAND_MUSTER_ENEMY_CASTLE = {
  faction: 'woundWrights' as const, entrance: { x: 51, y: 39 },
};

const factionOrder = GRAND_MUSTER_CASTLES.map((entry) => entry.faction);

function baseTerrain(): TerrainTile[][] {
  return Array.from({ length: GRAND_MUSTER_HEIGHT }, (_, y) =>
    Array.from({ length: GRAND_MUSTER_WIDTH }, (_, x): TerrainTile => {
      // Keep the six deployment yards quiet and neutral. The eastern exhibition field carries the
      // biome samples, lakes, and discontinuous mountain chains.
      const frontier = 24 + Math.round(Math.sin(y * 0.57) * 1.5 + Math.cos(y * 0.19));
      if (x <= frontier) {
        if ((x + y * 3) % 23 < 3 && Math.min(...GRAND_MUSTER_CASTLES.map((castle) =>
          Math.max(Math.abs(x - castle.entrance.x), Math.abs(y - castle.entrance.y)))) > 6) {
          return tile('deepwood');
        }
        return tile('meadow');
      }

      const mountain = [
        { left: 27, right: 35, top: 10, bottom: 12 },
        { left: 39, right: 47, top: 24, bottom: 26 },
        { left: 27, right: 36, top: 40, bottom: 42 },
      ].some((range) => x >= range.left && x <= range.right
        && y >= range.top + ((x + range.left) % 2) && y <= range.bottom);
      if (mountain) return tile('mountain', x > 43 ? 'snowcap' : 'granite');

      const lake = ((x - 49) / 4) ** 2 + ((y - 22) / 3) ** 2 < 1;
      if (lake) return tile('water', 'coastal');
      const wobble = Math.sin(x * 0.37 + y * 0.21) * 0.12
        + Math.cos(x * 0.19 - y * 0.43) * 0.09;
      const ellipse = (centerX: number, centerY: number, radiusX: number, radiusY: number) =>
        ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2;
      if (y < 8 + Math.round(Math.sin(x * 0.47) * 2)) return tile('hush', 'north');
      if (ellipse(34, 14, 9, 7) + wobble < 1) return tile('mosswold', 'mossy');
      if (ellipse(47, 14, 8, 6) - wobble < 1) return tile('deepwood', 'mossy');
      if (ellipse(34, 25, 9, 7) - wobble < 1) return tile('mire', 'coastal');
      if (ellipse(47, 28, 9, 8) + wobble < 1) return tile('lacquerFlats');
      if (ellipse(34, 35, 9, 7) + wobble < 1) return tile('barrowfield');
      if (ellipse(48, 38, 9, 7) - wobble < 1) return tile('ashsteppe', 'south');
      return tile('meadow');
    }));
}

function resources(): MapObject[] {
  const kinds: Array<[ResourceId, number]> = [
    ['gold', 1_000], ['timber', 5], ['iron', 3], ['essence', 3],
  ];
  const positions = [
    [28, 8], [32, 8], [36, 8], [40, 8], [44, 8], [48, 8], [52, 8],
    [27, 16], [31, 16], [35, 16], [39, 16], [43, 16], [47, 16], [51, 16],
    [28, 29], [32, 29], [36, 29], [40, 29], [44, 29], [48, 29], [52, 29],
  ];
  return positions.map(([x, y], index): MapObject => {
    const [resource, amount] = kinds[index % kinds.length];
    return {
      id: `muster-pile-${index + 1}`, kind: 'pile', position: { x, y },
      resource, amount, collected: false,
    };
  });
}

function structures(seed: number): MapObject[] {
  const mines = ([
    ['gold', 1_000], ['timber', 2], ['iron', 1], ['essence', 1],
  ] as const).map(([resource, income], index): MapObject => ({
    id: `muster-${resource}-mine`, kind: 'mine', position: { x: 28 + index * 6, y: 4 },
    footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 },
    resource, income, owner: null, cleared: true, chartered: false,
  }));
  const shrines: MapObject[] = ([
    ['rite', 'trial'], ['craft', 'forgeSpark'], ['grave', 'graveSpeech'], ['wild', 'bloom'],
  ] as const).map(([school, teaches], index) => ({
    id: `muster-${school}-shrine`, kind: 'shrine', position: { x: 28 + index * 6, y: 14 },
    school, teaches, cleared: false, visitedBy: [],
  }));
  const dwellings = factionOrder.map((faction, index): MapObject => {
    const unitId = FACTION_UNITS[faction][2];
    return {
      id: `muster-${faction}-dwelling`, kind: 'dwelling',
      position: { x: 27 + index * 5, y: 18 }, unitId,
      available: UNITS[unitId].growth, lastGrowthWeek: 1,
    };
  });
  return [
    ...mines, ...shrines, ...dwellings,
    { id: 'muster-waystation', kind: 'waystation', position: { x: 27, y: 27 }, visitedOnDay: {} },
    { id: 'muster-story', kind: 'storyteller', position: { x: 31, y: 27 }, visitedWeek: {} },
    { id: 'muster-hedge-school', kind: 'hedgeSchool', position: { x: 35, y: 27 }, visitedBy: [] },
    { id: 'muster-mana', kind: 'manaSpring', position: { x: 39, y: 27 }, visitedWeek: {} },
    { id: 'muster-omen', kind: 'omenStone', position: { x: 43, y: 27 }, visitedBy: [] },
    { id: 'muster-well', kind: 'wishingWell', position: { x: 47, y: 27 }, visitedWeek: {} },
    { id: 'muster-monastery', kind: 'monastery', position: { x: 51, y: 27 }, firstVisitorId: null, blessings: {} },

    { id: 'muster-watermill', kind: 'watermill', position: { x: 27, y: 31 }, owner: null },
    { id: 'muster-windmill', kind: 'windmill', position: { x: 31, y: 31 }, owner: null, rareResource: seed % 2 ? 'iron' : 'essence' },
    { id: 'muster-trading', kind: 'tradingCamp', position: { x: 35, y: 31 }, owner: null },
    { id: 'muster-table', kind: 'warmTable', position: { x: 39, y: 31 }, visitedWeek: {} },
    { id: 'muster-spring', kind: 'coldSpring', position: { x: 43, y: 31 }, visitedWeek: {} },
    { id: 'muster-tree', kind: 'treeSecondThoughts', position: { x: 47, y: 31 }, visitedBy: [] },
    { id: 'muster-hut', kind: 'hutOnTheHill', position: { x: 51, y: 31 }, visitedBy: [], skill: 'scouting' },

    { id: 'muster-watchtower', kind: 'ruinedWatchtower', position: { x: 27, y: 35 }, cleared: false, reward: { gold: 1_500, artifacts: [{ id: 'fairScale' }] } },
    { id: 'muster-bear', kind: 'oldBearsCave', position: { x: 31, y: 35 }, cleared: false, reward: { gold: 1_200 }, recruitUnitId: 'hearthHound' },
    { id: 'muster-wolves', kind: 'wolfHollow', position: { x: 35, y: 35 }, cleared: false, reward: { gold: 1_000 }, recruitUnitId: 'ashmaneWolves' },
    { id: 'muster-yard', kind: 'unquietYard', position: { x: 39, y: 35 }, cleared: false, reward: { artifacts: [{ id: 'unsentLetter' }] } },
    { id: 'muster-court', kind: 'moltingCourt', position: { x: 43, y: 35 }, cleared: false, reward: { essence: 6 } },
    { id: 'muster-hoard', kind: 'spoolHoard', position: { x: 47, y: 35 }, cleared: false, reward: { artifacts: [{ id: 'longSpoon' }] } },
    { id: 'muster-rich-vein', kind: 'richVein', position: { x: 51, y: 35 }, owner: null, flaggedOnDay: null, depleted: false, income: 2, days: 7 },

    { id: 'muster-mercenaries', kind: 'mercenaryCamp', position: { x: 27, y: 41 }, stockWeek: 1, roster: [{ unitId: 'maskedDuelist', count: 8 }, { unitId: 'hearthHound', count: 12 }] },
    { id: 'muster-wagon', kind: 'wagonCamp', position: { x: 31, y: 41 }, stockWeek: 1, stock: { id: 'bottledEcho' } },
    { id: 'muster-tithe', kind: 'titheBarn', position: { x: 35, y: 41 }, usedWeek: { p1: 0, p2: 0, p3: 0, p4: 0 } as Record<PlayerId, number> },
    { id: 'muster-skeleton', kind: 'skeletonGrass', position: { x: 39, y: 41 }, searched: false, reward: { items: [{ id: 'haresHeel' }] } },
    { id: 'muster-fire', kind: 'coldCampfire', position: { x: 43, y: 41 }, searched: false, reward: { gold: 250, items: [{ id: 'saltedMeat' }] } },
    { id: 'muster-lean-to', kind: 'shepherdsLeanTo', position: { x: 47, y: 41 }, searched: false, reward: { essence: 2 } },
    { id: 'muster-cart', kind: 'overgrownCart', position: { x: 51, y: 41 }, searched: false, reward: { items: [{ id: 'cartographersCase' }] } },
    { id: 'muster-chest', kind: 'chest', position: { x: 25, y: 12 }, cleared: true, collected: false },
    { id: 'muster-item', kind: 'item', position: { x: 25, y: 26 }, item: { id: 'waybread' }, collected: false },
  ];
}

function sparringSites(): MapObject[] {
  return GRAND_MUSTER_CASTLES.map((castle, index): MapObject => ({
    id: `muster-sparring-${castle.faction}`, kind: 'sparringStone',
    position: { x: castle.entrance.x, y: castle.entrance.y + 4 }, visitedBy: [],
    flavorHint: `The ${castle.faction} yard keeps a standing challenge for its new commander.`,
  }));
}

function guardianSpecs(): AuthoredGuardian[] {
  const units: Array<[UnitId, number]> = [
    ['maskedDuelist', 10], ['waxServitor', 14], ['hearthHound', 16],
    ['sirens', 12], ['drownedCrew', 14], ['hullTurtle', 6],
  ];
  return GRAND_MUSTER_CASTLES.map((castle, index) => ({
    id: `muster-guardian-${castle.faction}`,
    targetId: `muster-sparring-${castle.faction}`,
    position: { x: castle.entrance.x, y: castle.entrance.y + 3 },
    army: [{ unitId: units[index][0], count: units[index][1] }],
    split: true, static: true,
  }));
}

function roads(): Coord[] {
  const coordinates = [
    ...[5, 19, 33].flatMap((y) => Array.from({ length: 20 }, (_, index) => ({ x: 5 + index, y }))),
    ...Array.from({ length: 35 }, (_, index) => ({ x: 24, y: 5 + index })),
    ...Array.from({ length: 28 }, (_, index) => ({ x: 24 + index, y: 39 })),
  ];
  return [...new Map(coordinates.map((position) => [`${position.x},${position.y}`, position])).values()];
}

function carvePassableGround(
  terrain: TerrainTile[][], objects: MapObject[], roadTiles: Coord[], guardianPosts: Coord[],
): void {
  const castleTiles = [...GRAND_MUSTER_CASTLES, GRAND_MUSTER_ENEMY_CASTLE].flatMap((castle) => {
    const anchor = { x: castle.entrance.x - 1, y: castle.entrance.y - 1 };
    return Array.from({ length: 2 }, (_, dy) => Array.from({ length: 3 }, (_, dx) => ({
      x: anchor.x + dx, y: anchor.y + dy,
    }))).flat();
  });
  const clear = [...objects.flatMap(objectFootprintTiles), ...roadTiles, ...guardianPosts, ...castleTiles];
  clear.forEach(({ x, y }) => {
    if (y >= 0 && y < terrain.length && x >= 0 && x < terrain[y].length
        && ['mountain', 'water'].includes(terrainId(terrain[y][x]))) {
      terrain[y][x] = tile('meadow');
    }
  });
}

export function createGrandMuster(seed = 1): GameMap {
  const roadTiles = roads();
  const objects = [...sparringSites(), ...resources(), ...structures(seed)];
  const specs = guardianSpecs();
  const terrain = baseTerrain();
  carvePassableGround(terrain, objects, roadTiles, specs.map((guardian) => guardian.position!));
  const map = materializeGuardians({
    id: 'grand-muster', name: 'The Grand Muster', seed,
    width: GRAND_MUSTER_WIDTH, height: GRAND_MUSTER_HEIGHT,
    terrain, objects, roads: roadTiles,
    victory: {
      type: 'none',
      flavor: 'Every banner has come to compare notes, creatures, and bruises.',
      mechanics: 'Showcase sandbox: fight, explore, build, and retire when finished.',
    },
  }, specs);
  validateMap(map);
  return map;
}
