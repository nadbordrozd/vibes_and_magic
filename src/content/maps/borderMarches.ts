import { MAP_HEIGHT, MAP_WIDTH } from '../constants';
import type {
  ArmyStack, Coord, GameMap, MapObject, ResourceId, TerrainId, UnitId,
} from '../../core/types';

function makeTerrain(): TerrainId[][] {
  return Array.from({ length: MAP_HEIGHT }, (_, y) =>
    Array.from({ length: MAP_WIDTH }, (_, x): TerrainId => {
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

function guard(unitId: UnitId, count: number): { army: ArmyStack[] } {
  return { army: [{ unitId, count }] };
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
): MapObject {
  return {
    id, kind: 'mine', position, resource, income, owner: null,
    guard: unitId && count ? guard(unitId, count) : undefined,
    cleared: !unitId,
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

function makeObjects(): MapObject[] {
  const objects: MapObject[] = [
    mine('west-gold', { x: 7, y: 10 }, 'gold', 1000, 'militia', 30),
    mine('west-timber', { x: 4, y: 5 }, 'timber', 2),
    mine('west-iron', { x: 8, y: 15 }, 'iron', 1, 'berserker', 10),
    mine('west-essence', { x: 9, y: 7 }, 'essence', 1, 'berserker', 8),
    mine('east-gold', mirror({ x: 7, y: 10 }), 'gold', 1000, 'slinger', 30),
    mine('east-timber', mirror({ x: 4, y: 5 }), 'timber', 2),
    mine('east-iron', mirror({ x: 8, y: 15 }), 'iron', 1, 'frostAdept', 10),
    mine('east-essence', mirror({ x: 9, y: 7 }), 'essence', 1, 'frostAdept', 8),
    mine('north-gap-gold', { x: 12, y: 4 }, 'gold', 1000, 'drake', 2),
    mine('south-gap-gold', { x: 15, y: 15 }, 'gold', 1000, 'golem', 2),
    {
      id: 'west-chest-1', kind: 'chest', position: { x: 5, y: 3 },
      guard: guard('militia', 15), cleared: false, collected: false,
    },
    {
      id: 'west-chest-2', kind: 'chest', position: { x: 11, y: 17 },
      guard: guard('militia', 15), cleared: false, collected: false,
    },
    {
      id: 'east-chest-1', kind: 'chest', position: mirror({ x: 5, y: 3 }),
      guard: guard('slinger', 15), cleared: false, collected: false,
    },
    {
      id: 'east-chest-2', kind: 'chest', position: mirror({ x: 11, y: 17 }),
      guard: guard('slinger', 15), cleared: false, collected: false,
    },
  ];
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

export function createBorderMarches(): GameMap {
  return {
    id: 'border-marches',
    name: 'Border Marches',
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    terrain: makeTerrain(),
    objects: makeObjects(),
  };
}

export function validateMap(map: GameMap): void {
  if (map.terrain.length !== map.height) throw new Error('Map height mismatch');
  if (map.terrain.some((row) => row.length !== map.width)) {
    throw new Error('Map width mismatch');
  }
  const seen = new Set<string>();
  const terrains = new Set<TerrainId>(['grass', 'forest', 'mountain', 'water']);
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
    if (object.kind !== 'pile' && object.guard
        && object.guard.army.some((stack) => stack.count <= 0)) {
      throw new Error(`Invalid guardian: ${object.id}`);
    }
  }
}
