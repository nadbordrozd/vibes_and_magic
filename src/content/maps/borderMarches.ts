import { MAP_HEIGHT, MAP_WIDTH } from '../constants';
import { SCROLL_ITEM_IDS } from '../items';
import type {
  ArmyStack, Coord, GameMap, ItemInstance, MapObject, ResourceId, TerrainId, UnitId,
} from '../../core/types';

function makeTerrain(): TerrainId[][] {
  return Array.from({ length: MAP_HEIGHT }, (_, y) =>
    Array.from({ length: MAP_WIDTH }, (_, x): TerrainId => {
      if ([[6, 3], [21, 3], [8, 17], [19, 17]]
        .some(([barrowX, barrowY]) => x === barrowX && y === barrowY)) return 'barrow';
      const mirroredX = Math.min(x, MAP_WIDTH - 1 - x);
      if ((x < 2 || x > 25) && (y < 3 || y > 16)) return 'water';
      if ((x === 13 || x === 14) && ![3, 4, 14, 15].includes(y)) return 'mountain';
      if ((mirroredX + y * 3) % 11 === 0 || (mirroredX * 2 + y) % 17 === 0) {
        return 'forest';
      }
      return 'grass';
    }),
  );
}

function guard(
  unitId: UnitId,
  count: number,
  drop?: ItemInstance,
  split = true,
): { army: ArmyStack[]; drop?: ItemInstance; split: boolean } {
  return { army: [{ unitId, count }], drop, split };
}

function mirror(position: Coord): Coord {
  return { x: MAP_WIDTH - 1 - position.x, y: position.y };
}

function mine(
  id: string,
  position: Coord,
  resource: ResourceId,
  income: number,
  unitId?: UnitId,
  count?: number,
): Extract<MapObject, { kind: 'mine' }> {
  return {
    id, kind: 'mine', position, resource, income, owner: null,
    guard: unitId && count ? guard(unitId, count) : undefined,
    cleared: !unitId, chartered: false,
  };
}

const WEST_PILES: ReadonlyArray<[Coord, ResourceId, number]> = [
  [{ x: 5, y: 8 }, 'gold', 750],
  [{ x: 2, y: 6 }, 'gold', 500],
  [{ x: 7, y: 16 }, 'gold', 1000],
  [{ x: 6, y: 12 }, 'timber', 5],
  [{ x: 3, y: 15 }, 'timber', 3],
  [{ x: 9, y: 4 }, 'timber', 6],
  [{ x: 7, y: 2 }, 'iron', 3],
  [{ x: 10, y: 13 }, 'iron', 2],
  [{ x: 4, y: 18 }, 'essence', 3],
  [{ x: 10, y: 7 }, 'essence', 2],
];

function scrollAt(seed: number, salt: number, plus = false): ItemInstance {
  return {
    id: SCROLL_ITEM_IDS[(Math.imul(seed ^ salt, 2654435761) >>> 0)
      % SCROLL_ITEM_IDS.length],
    plus,
  };
}

function makeObjects(seed: number): MapObject[] {
  const objects: MapObject[] = [
    mine('west-gold', { x: 7, y: 10 }, 'gold', 1000, 'yeoman', 35),
    mine('west-timber', { x: 4, y: 5 }, 'timber', 2),
    mine('west-iron', { x: 8, y: 15 }, 'iron', 1, 'bannerman', 10),
    mine('west-essence', { x: 9, y: 7 }, 'essence', 1, 'bannerman', 8),
    mine('east-gold', mirror({ x: 7, y: 10 }), 'gold', 1000, 'tinSoldier', 40),
    mine('east-timber', mirror({ x: 4, y: 5 }), 'timber', 2),
    mine('east-iron', mirror({ x: 8, y: 15 }), 'iron', 1, 'marionette', 10),
    mine('east-essence', mirror({ x: 9, y: 7 }), 'essence', 1, 'marionette', 8),
    {
      ...mine('north-gap-gold', { x: 12, y: 4 }, 'gold', 1000),
      guard: guard('oriflammeWarden', 2, scrollAt(seed, 101)), cleared: false,
    },
    {
      ...mine('south-gap-gold', { x: 15, y: 15 }, 'gold', 1000),
      guard: guard('woodenColossus', 2, scrollAt(seed, 103)), cleared: false,
    },
    {
      id: 'west-chest-1', kind: 'chest', position: { x: 5, y: 3 },
      guard: guard('yeoman', 18), cleared: false, collected: false,
    },
    {
      id: 'west-chest-2', kind: 'chest', position: { x: 11, y: 17 },
      guard: guard('yeoman', 18), cleared: false, collected: false,
    },
    {
      id: 'east-chest-1', kind: 'chest', position: mirror({ x: 5, y: 3 }),
      guard: guard('tinSoldier', 20), cleared: false, collected: false,
    },
    {
      id: 'east-chest-2', kind: 'chest', position: mirror({ x: 11, y: 17 }),
      guard: guard('tinSoldier', 20), cleared: false, collected: false,
    },
    {
      id: 'rite-shrine', kind: 'shrine', position: { x: 6, y: 4 },
      school: 'rite', teaches: 'rally', guard: guard('bannerman', 8),
      cleared: false, visitedBy: [],
    },
    {
      id: 'craft-shrine', kind: 'shrine', position: { x: 13, y: 3 },
      school: 'craft', teaches: 'forgeSpark',
      guard: { army: [{ unitId: 'bannerman', count: 4 }, { unitId: 'marionette', count: 4 }] },
      cleared: false, visitedBy: [],
    },
    {
      id: 'grave-shrine', kind: 'shrine', position: { x: 21, y: 4 },
      school: 'grave', teaches: 'wither', guard: guard('marionette', 8),
      cleared: false, visitedBy: [],
    },
    {
      id: 'the-sleeper', kind: 'lock', position: { x: 13, y: 4 },
      name: 'The Sleeper',
      tell: 'It does not wake. It mends. Whatever is done to it must be done in one breath.',
      guard: guard('sleeper', 18, undefined, false),
      reward: {
        gold: 6000, essence: 12,
        items: [scrollAt(seed, 211, true), scrollAt(seed, 223, true)],
      },
      cleared: false,
    },
    {
      id: 'the-mirror-bound', kind: 'lock', position: { x: 14, y: 15 },
      name: 'The Mirror-Bound',
      tell: 'Blades return to their wielders. The mirror does not care for arrows.',
      guard: guard('mirrorBound', 30, undefined, false),
      reward: {
        gold: 4000, essence: 8, items: [{ id: 'mirrorMask' }],
      },
      cleared: false,
    },
    {
      id: 'north-waystation', kind: 'waystation', position: { x: 12, y: 3 },
      visitedOnDay: {},
    },
    {
      id: 'south-waystation', kind: 'waystation', position: { x: 15, y: 14 },
      visitedOnDay: {},
    },
    {
      id: 'west-rich-vein', kind: 'richVein', position: { x: 11, y: 1 },
      owner: null, flaggedOnDay: null, depleted: false, income: 3, days: 10,
    },
    {
      id: 'east-rich-vein', kind: 'richVein', position: mirror({ x: 11, y: 18 }),
      owner: null, flaggedOnDay: null, depleted: false, income: 3, days: 10,
    },
    {
      id: 'west-charter', kind: 'item', position: { x: 7, y: 14 },
      item: { id: 'overseersCharter' }, collected: false,
    },
    {
      id: 'east-charter', kind: 'item', position: mirror({ x: 7, y: 14 }),
      item: { id: 'overseersCharter' }, collected: false,
    },
    {
      id: 'west-trade-goods-1', kind: 'item', position: { x: 11, y: 6 },
      item: { id: 'tradeGoods', origin: { x: 11, y: 6 } }, collected: false,
    },
    {
      id: 'west-trade-goods-2', kind: 'item', position: { x: 11, y: 13 },
      item: { id: 'tradeGoods', origin: { x: 11, y: 13 } }, collected: false,
    },
    {
      id: 'east-trade-goods-1', kind: 'item', position: mirror({ x: 11, y: 6 }),
      item: { id: 'tradeGoods', origin: mirror({ x: 11, y: 6 }) }, collected: false,
    },
    {
      id: 'east-trade-goods-2', kind: 'item', position: mirror({ x: 11, y: 13 }),
      item: { id: 'tradeGoods', origin: mirror({ x: 11, y: 13 }) }, collected: false,
    },
  ];
  const barrows = [
    { x: 6, y: 3 }, { x: 21, y: 3 }, { x: 8, y: 17 }, { x: 19, y: 17 },
  ];
  barrows.forEach((position, index) => objects.push({
    id: `barrow-scroll-${index + 1}`, kind: 'item', position,
    item: scrollAt(seed, 307 + index * 13, true), collected: false,
  }));
  WEST_PILES.forEach(([position, resource, amount], index) => {
    objects.push({
      id: `west-pile-${index}`, kind: 'pile', position,
      resource, amount, collected: false,
    });
    objects.push({
      id: `east-pile-${index}`, kind: 'pile', position: mirror(position),
      resource, amount, collected: false,
    });
  });
  return objects;
}

export function createBorderMarches(seed = 1): GameMap {
  return {
    id: 'border-marches',
    name: 'Border Marches',
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    terrain: makeTerrain(),
    objects: makeObjects(seed),
  };
}

export function validateMap(map: GameMap): void {
  if (map.terrain.length !== map.height) throw new Error('Map height mismatch');
  if (map.terrain.some((row) => row.length !== map.width)) {
    throw new Error('Map width mismatch');
  }
  const seen = new Set<string>();
  const terrains = new Set<TerrainId>(['grass', 'forest', 'barrow', 'mountain', 'water']);
  if (map.terrain.some((row) => row.some((terrain) => !terrains.has(terrain)))) {
    throw new Error('Unknown terrain in map');
  }
  for (const object of map.objects) {
    if (seen.has(object.id)) throw new Error(`Duplicate map object ${object.id}`);
    seen.add(object.id);
    const terrain = map.terrain[object.position.y]?.[object.position.x];
    if (!terrain || terrain === 'mountain' || terrain === 'water') {
      throw new Error(`Object ${object.id} is on impassable terrain`);
    }
    if (object.kind === 'pile' && object.amount <= 0) {
      throw new Error(`Invalid pickup amount: ${object.id}`);
    }
    if ('guard' in object && object.guard
        && object.guard.army.some((stack) => stack.count <= 0)) {
      throw new Error(`Invalid guardian: ${object.id}`);
    }
  }
}
