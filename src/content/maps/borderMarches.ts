import { MAP_HEIGHT, MAP_WIDTH } from '../constants';
import { SCROLL_SPELL_IDS } from '../spells';
import type {
  Coord, GameMap, ItemInstance, MapObject, ResourceId, TerrainTile, UnitId,
} from '../../core/types';
import { terrainId, terrainIdAt, tile } from '../terrain';
import {
  materializeGuardians, trimRoadsForCities, type AuthoredGuardian,
} from './occupancyAuthoring';
import { seededSpellTome } from '../../core/game/chests';
import { validateSpellTomeInstance } from '../items';

export const BORDER_MARCHES_CITY_ENTRANCES: readonly Coord[] = [
  { x: 3, y: 10 }, { x: 24, y: 10 },
];

function makeTerrain(): TerrainTile[][] {
  return Array.from({ length: MAP_HEIGHT }, (_, y) =>
    Array.from({ length: MAP_WIDTH }, (_, x): TerrainTile => {
      if ([[6, 3], [21, 3], [8, 17], [19, 17]]
        .some(([barrowX, barrowY]) => Math.max(Math.abs(x - barrowX), Math.abs(y - barrowY)) <= 1)) return tile('barrowfield');
      if ((y === 1 && [2, 3, 24, 25].includes(x))
          || (y === 2 && [3, 24].includes(x))) return tile('mountain', 'granite');
      const mirroredX = Math.min(x, MAP_WIDTH - 1 - x);
      if ((x < 2 || x > 25) && (y < 3 || y > 16)) return tile('water');
      if ((x === 13 || x === 14) && ![3, 4, 14, 15].includes(y)) return tile('mountain', 'granite');
      if ((mirroredX + y * 3) % 11 === 0 || (mirroredX * 2 + y) % 17 === 0) {
        return tile('deepwood');
      }
      return tile('meadow');
    }),
  );
}

function guard(
  targetId: string,
  unitId: UnitId,
  count: number,
  drop?: ItemInstance,
  split = true,
  staticGuard = false,
): AuthoredGuardian {
  return { targetId, army: [{ unitId, count }], drop, split, static: staticGuard };
}

function mirror(position: Coord): Coord {
  return { x: MAP_WIDTH - 1 - position.x, y: position.y };
}

function mine(
  id: string,
  position: Coord,
  resource: ResourceId,
  income: number,
  guarded = false,
): Extract<MapObject, { kind: 'mine' }> {
  return {
    id, kind: 'mine', position: { x: position.x, y: position.y + 1 }, resource, income, owner: null,
    footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 },
    cleared: !guarded, chartered: false,
  };
}

const WEST_PILES: ReadonlyArray<[Coord, ResourceId, number]> = [
  [{ x: 5, y: 8 }, 'gold', 750],
  [{ x: 2, y: 6 }, 'gold', 500],
  [{ x: 6, y: 16 }, 'gold', 1000],
  [{ x: 6, y: 12 }, 'timber', 5],
  [{ x: 3, y: 15 }, 'timber', 3],
  [{ x: 9, y: 4 }, 'timber', 6],
  [{ x: 7, y: 2 }, 'iron', 3],
  [{ x: 10, y: 13 }, 'iron', 2],
  [{ x: 4, y: 18 }, 'essence', 3],
  [{ x: 11, y: 7 }, 'essence', 2],
];

function scrollAt(seed: number, salt: number, plus = false): ItemInstance {
  return {
    id: 'spellScroll',
    storedSpellId: SCROLL_SPELL_IDS[(Math.imul(seed ^ salt, 2654435761) >>> 0)
      % SCROLL_SPELL_IDS.length],
    plus,
  };
}

function makeObjects(seed: number): MapObject[] {
  const objects: MapObject[] = [
    mine('west-gold', { x: 7, y: 10 }, 'gold', 1000, true),
    mine('west-timber', { x: 4, y: 5 }, 'timber', 2),
    mine('west-iron', { x: 8, y: 15 }, 'iron', 1, true),
    mine('west-essence', { x: 9, y: 7 }, 'essence', 1, true),
    mine('east-gold', mirror({ x: 7, y: 10 }), 'gold', 1000, true),
    mine('east-timber', mirror({ x: 4, y: 5 }), 'timber', 2),
    mine('east-iron', mirror({ x: 8, y: 15 }), 'iron', 1, true),
    mine('east-essence', mirror({ x: 9, y: 7 }), 'essence', 1, true),
    mine('north-gap-gold', { x: 11, y: 4 }, 'gold', 1000, true),
    mine('south-gap-gold', { x: 15, y: 15 }, 'gold', 1000, true),
    {
      id: 'west-chest-1', kind: 'chest', position: { x: 2, y: 2 },
      cleared: false, collected: false,
    },
    {
      id: 'west-chest-2', kind: 'chest', position: { x: 11, y: 17 },
      cleared: true, collected: false,
    },
    {
      id: 'east-chest-1', kind: 'chest', position: mirror({ x: 2, y: 2 }),
      cleared: false, collected: false,
    },
    {
      id: 'east-chest-2', kind: 'chest', position: mirror({ x: 11, y: 17 }),
      cleared: true, collected: false,
    },
    {
      id: 'rite-shrine', kind: 'shrine', position: { x: 6, y: 4 },
      school: 'rite', teaches: 'rally',
      cleared: false, visitedBy: [],
    },
    {
      id: 'craft-shrine', kind: 'shrine', position: { x: 13, y: 3 },
      school: 'craft', teaches: 'forgeSpark',
      cleared: false, visitedBy: [],
    },
    {
      id: 'grave-shrine', kind: 'shrine', position: { x: 21, y: 4 },
      school: 'grave', teaches: 'wither',
      cleared: false, visitedBy: [],
    },
    {
      id: 'the-sleeper', kind: 'lock', position: { x: 13, y: 4 },
      name: 'The Sleeper',
      tell: 'It does not wake. It mends. Whatever is done to it must be done in one breath.',
      reward: {
        gold: 6000, essence: 12,
        items: [scrollAt(seed, 211, true), scrollAt(seed, 223, true),
          seededSpellTome(seed, 'the-sleeper', 'lock')],
        teachesSpell: 'loyalUntoDeath',
      },
      cleared: false,
    },
    {
      id: 'the-mirror-bound', kind: 'lock', position: { x: 14, y: 15 },
      name: 'The Mirror-Bound',
      tell: 'Blades return to their wielders. The mirror does not care for arrows.',
      reward: {
        gold: 4000, essence: 8, artifacts: [{ id: 'mirrorMask' }],
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
    {
      id: 'border-storytellers-fire', kind: 'storyteller', position: { x: 10, y: 10 },
      visitedWeek: {},
    },
    {
      id: 'border-omen-stone', kind: 'omenStone', position: { x: 17, y: 10 },
      visitedBy: [],
    },
    {
      id: 'border-hedge-school', kind: 'hedgeSchool', position: { x: 12, y: 9 },
      visitedBy: [],
    },
    { id: 'border-stacks', kind: 'stacks', position: { x: 5, y: 12 }, visitedBy: [] },
    { id: 'border-wild-shrine', kind: 'wildShrine', position: { x: 8, y: 12 }, visitedBy: [] },
    { id: 'border-pages', kind: 'reliquaryOfPages', position: { x: 22, y: 12 }, claimed: false,
      tomeSpellId: seededSpellTome(seed, 'border-pages', 'reliquary-pages').storedSpellId! },
  ];
  const barrows = [
    { x: 6, y: 3 }, { x: 21, y: 3 }, { x: 8, y: 17 }, { x: 19, y: 17 },
  ];
  barrows.forEach((position, index) => objects.push({
    id: `barrow-${index + 1}`, kind: 'item', position,
    item: index === 0 ? seededSpellTome(seed, 'border-barrow-1', 'barrow')
      : scrollAt(seed, 307 + index * 13, true), collected: false,
  }));
  objects.push({
    id: 'border-mana-spring', kind: 'manaSpring', position: { x: 15, y: 11 },
    visitedWeek: {},
  });
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

function authoredGuardians(seed: number): AuthoredGuardian[] {
  return [
    guard('west-gold', 'yeoman', 35),
    guard('west-iron', 'bannerman', 10),
    guard('west-essence', 'bannerman', 8),
    guard('east-gold', 'tinSoldier', 40),
    guard('east-iron', 'marionette', 10),
    guard('east-essence', 'marionette', 8),
    guard('north-gap-gold', 'oriflammeWarden', 2, scrollAt(seed, 101)),
    guard('south-gap-gold', 'woodenColossus', 2, scrollAt(seed, 103)),
    guard('west-chest-1', 'yeoman', 18),
    guard('east-chest-1', 'tinSoldier', 20),
    guard('rite-shrine', 'bannerman', 8),
    {
      targetId: 'craft-shrine', split: true,
      army: [{ unitId: 'bannerman', count: 4 }, { unitId: 'marionette', count: 4 }],
    },
    guard('grave-shrine', 'marionette', 8),
    guard('border-mana-spring', 'boneChoir', 6),
    guard('border-pages', 'boneChoir', 12),
    guard('the-sleeper', 'sleeper', 18, undefined, false, true),
    guard('the-mirror-bound', 'mirrorBound', 30, undefined, false, true),
  ];
}

export function createBorderMarches(seed = 1): GameMap {
  const terrain = makeTerrain();
  return materializeGuardians({
    id: 'border-marches',
    name: 'Border Marches',
    seed, width: MAP_WIDTH,
    height: MAP_HEIGHT,
    terrain,
    objects: makeObjects(seed),
    seams: [{ x: 13, y: 10 }],
    roads: trimRoadsForCities(
      Array.from({ length: 22 }, (_, index) => ({ x: index + 3, y: 10 }))
        .filter((position) => !['mountain', 'water'].includes(terrainId(terrain[position.y][position.x]))),
      BORDER_MARCHES_CITY_ENTRANCES,
    ),
    victory: {
      type: 'conquest',
      flavor: 'Break every rival banner and keep your own flying.',
      mechanics: 'Defeat all opposing players.',
    },
  }, authoredGuardians(seed));
}

export function validateMap(map: GameMap): void {
  if (map.terrain.length !== map.height) throw new Error('Map height mismatch');
  if (map.terrain.some((row) => row.length !== map.width)) {
    throw new Error('Map width mismatch');
  }
  const seen = new Set<string>();
  const terrains = new Set(['meadow', 'deepwood', 'mosswold', 'ashsteppe', 'barrowfield', 'lacquerFlats', 'hush', 'mire', 'mountain', 'water']);
  if (map.terrain.some((row, y) => row.some((_terrain, x) => !terrains.has(terrainIdAt(map, { x, y }))))) {
    throw new Error('Unknown terrain in map');
  }
  for (const object of map.objects) {
    if (seen.has(object.id)) throw new Error(`Duplicate map object ${object.id}`);
    seen.add(object.id);
    const objectTerrain = terrainIdAt(map, object.position);
    const waterObject = ['boat', 'manaSpring', 'flotsam', 'sealedCask', 'castaway', 'messageBottle',
      'whirlpool', 'shipwreck', 'drownedBell', 'sirenRocks', 'lighthouse', 'guardian']
      .includes(object.kind);
    if (objectTerrain === 'mountain' && object.kind !== 'bridge'
      || (objectTerrain === 'water' && object.kind !== 'bridge' && !waterObject)) {
      throw new Error(`Object ${object.id} is on impassable terrain`);
    }
    if (object.kind === 'pile' && object.amount <= 0) {
      throw new Error(`Invalid pickup amount: ${object.id}`);
    }
    if (object.kind === 'guardian' && object.army.some((stack) => stack.count <= 0)) {
      throw new Error(`Invalid guardian: ${object.id}`);
    }
    const validateNestedTomes = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if ('id' in value && value.id === 'spellTome') {
        validateSpellTomeInstance(value as ItemInstance);
      }
      for (const nested of Object.values(value)) validateNestedTomes(nested);
    };
    validateNestedTomes(object);
    if (object.kind === 'reliquaryCairn' && object.tomeSpellId) {
      validateSpellTomeInstance({ id: 'spellTome', storedSpellId: object.tomeSpellId,
        tomeSource: 'reliquary-cairn' });
    }
    if (object.kind === 'reliquaryOfPages') {
      validateSpellTomeInstance({ id: 'spellTome', storedSpellId: object.tomeSpellId,
        tomeSource: 'reliquary-pages' });
    }
  }
  for (const object of map.objects.filter((candidate) =>
    candidate.kind === 'reliquaryOfPages')) {
    if (!map.objects.some((candidate) =>
      candidate.kind === 'guardian' && candidate.protects === object.id)) {
      throw new Error(`Reliquary of Pages ${object.id} requires a guarding company`);
    }
  }
}
