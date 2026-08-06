import { ROAD_MOVE_COST, TERRAIN_COST } from '../../content/constants';
import { SKILLS } from '../../content/skills';
import { OMENS } from '../../content/omens';
import type { Coord, GameMap, Hero, OmenId } from '../types';
import { heroIsNative, terrainIdAt } from '../../content/terrain';
import { UNITS } from '../../content/units';
import { PriorityQueue } from './priorityQueue';

const DIRECTIONS: Coord[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 },
];

export const coordKey = (coord: Coord): string => `${coord.x},${coord.y}`;

interface CoordinateKeyCache {
  source: readonly Coord[] | undefined;
  keys: ReadonlySet<string>;
}

const roadCache = new WeakMap<GameMap, CoordinateKeyCache>();
const seamCache = new WeakMap<GameMap, CoordinateKeyCache>();

function coordinateKeys(
  cache: WeakMap<GameMap, CoordinateKeyCache>, map: GameMap, coords: readonly Coord[] | undefined,
): ReadonlySet<string> {
  let cached = cache.get(map);
  if (!cached || cached.source !== coords) {
    cached = { source: coords, keys: new Set((coords ?? []).map(coordKey)) };
    cache.set(map, cached);
  }
  return cached.keys;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

export function inBounds(map: GameMap, coord: Coord): boolean {
  return coord.x >= 0 && coord.y >= 0 && coord.x < map.width && coord.y < map.height;
}

export function movementCost(
  map: GameMap,
  from: Coord,
  to: Coord,
  hero?: Pick<Hero, 'skills' | 'faction' | 'army'>,
  omen: OmenId = 'quiet',
  freeForest = false,
): number {
  const terrain = terrainIdAt(map, to);
  const toKey = coordKey(to);
  if (coordinateKeys(roadCache, map, map.roads).has(toKey)) return ROAD_MOVE_COST;
  if (coordinateKeys(seamCache, map, map.seams).has(toKey)) return 100;
  if (freeForest && terrain === 'deepwood') return 0;
  const native = hero && heroIsNative(hero, terrain);
  const aquaticMire = terrain === 'mire' && hero?.army.some((stack) =>
    stack && UNITS[stack.unitId].abilities.includes('aquatic'));
  const wayfaring = hero?.skills.wayfaring ?? 0;
  const omenTerrainCost = OMENS[omen].effects.terrainCost;
  const base = native ? 100 : aquaticMire ? 125
    : wayfaring === 3 && Number.isFinite(TERRAIN_COST[terrain])
    ? SKILLS.wayfaring.values.rank3TerrainCost
    : omenTerrainCost !== undefined && Number.isFinite(TERRAIN_COST[terrain])
      ? omenTerrainCost
      : wayfaring === 2 && Number.isFinite(TERRAIN_COST[terrain])
        ? SKILLS.wayfaring.values.terrainCost
        : wayfaring === 1 && terrain === 'deepwood'
          ? SKILLS.wayfaring.values.terrainCost : TERRAIN_COST[terrain];
  return from.x !== to.x && from.y !== to.y && wayfaring !== 3
    ? Math.round(base * 1.41) : base;
}

export function findPath(
  map: GameMap,
  start: Coord,
  goal: Coord,
  blocked: ReadonlySet<string> = new Set(),
  hero?: Pick<Hero, 'skills' | 'faction' | 'army'>,
  omen: OmenId = 'quiet',
  freeForest = false,
): Coord[] | null {
  if (!inBounds(map, goal)
      || !Number.isFinite(movementCost(map, start, goal, hero, omen, freeForest))) return null;
  const open = new PriorityQueue<Coord>();
  open.push(coordKey(start), freeForest ? 0 : heuristic(start, goal), start);
  const coords = new Map([[coordKey(start), start]]);
  const cameFrom = new Map<string, string>();
  const g = new Map([[coordKey(start), 0]]);
  const f = new Map([[coordKey(start), freeForest ? 0 : heuristic(start, goal)]]);

  while (open.size > 0) {
    const entry = open.pop()!;
    const currentKey = entry.key;
    if (entry.priority !== f.get(currentKey)) continue;
    const current = entry.value;
    if (sameCoord(current, goal)) return reconstruct(cameFrom, coords, currentKey);

    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = coordKey(next);
      if (!inBounds(map, next) || (blocked.has(nextKey) && !sameCoord(next, goal))) continue;
      const cost = movementCost(map, current, next, hero, omen, freeForest);
      if (!Number.isFinite(cost)) continue;
      const tentative = (g.get(currentKey) ?? Infinity) + cost;
      if (tentative >= (g.get(nextKey) ?? Infinity)) continue;
      cameFrom.set(nextKey, currentKey);
      coords.set(nextKey, next);
      g.set(nextKey, tentative);
      f.set(nextKey, tentative + (freeForest ? 0 : heuristic(next, goal)));
      open.push(nextKey, f.get(nextKey)!, next);
    }
  }
  return null;
}

function heuristic(a: Coord, b: Coord): number {
  const diagonal = Math.min(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const straight = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) - diagonal;
  return diagonal * 141 + straight * 100;
}

function reconstruct(
  cameFrom: Map<string, string>,
  coords: Map<string, Coord>,
  endKey: string,
): Coord[] {
  const path: Coord[] = [];
  let current: string | undefined = endKey;
  while (current) {
    path.unshift(coords.get(current)!);
    current = cameFrom.get(current);
  }
  return path;
}

export function pathCost(
  map: GameMap,
  path: Coord[],
  hero?: Pick<Hero, 'skills' | 'faction' | 'army'>,
  omen: OmenId = 'quiet',
  freeForest = false,
): number {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += movementCost(map, path[index - 1], path[index], hero, omen, freeForest);
  }
  return total;
}

export function reachablePathPrefix(
  map: GameMap,
  path: Coord[],
  budget: number,
  hero?: Pick<Hero, 'skills' | 'faction' | 'army'>,
  omen: OmenId = 'quiet',
  freeForest = false,
): Coord[] {
  const reachable = [path[0]];
  let spent = 0;
  for (let index = 1; index < path.length; index += 1) {
    const step = movementCost(map, path[index - 1], path[index], hero, omen, freeForest);
    if (spent + step > budget) break;
    spent += step;
    reachable.push(path[index]);
  }
  return reachable;
}
