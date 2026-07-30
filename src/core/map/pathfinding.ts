import { TERRAIN_COST } from '../../content/constants';
import { SKILLS } from '../../content/skills';
import type { Coord, GameMap, Hero } from '../types';

const DIRECTIONS: Coord[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 },
];

export const coordKey = (coord: Coord): string => `${coord.x},${coord.y}`;

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
  hero?: Pick<Hero, 'skills'>,
): number {
  const terrain = map.terrain[to.y]?.[to.x];
  if (!terrain) return Number.POSITIVE_INFINITY;
  const wayfaring = hero?.skills.wayfaring ?? 0;
  const base = wayfaring === 2 && Number.isFinite(TERRAIN_COST[terrain])
    ? SKILLS.wayfaring.values.terrainCost
    : wayfaring === 1 && terrain === 'forest'
      ? SKILLS.wayfaring.values.terrainCost : TERRAIN_COST[terrain];
  return from.x !== to.x && from.y !== to.y ? Math.round(base * 1.41) : base;
}

export function findPath(
  map: GameMap,
  start: Coord,
  goal: Coord,
  blocked: ReadonlySet<string> = new Set(),
  hero?: Pick<Hero, 'skills'>,
): Coord[] | null {
  if (!inBounds(map, goal)
      || !Number.isFinite(movementCost(map, start, goal, hero))) return null;
  const open = new Set([coordKey(start)]);
  const coords = new Map([[coordKey(start), start]]);
  const cameFrom = new Map<string, string>();
  const g = new Map([[coordKey(start), 0]]);
  const f = new Map([[coordKey(start), heuristic(start, goal)]]);

  while (open.size > 0) {
    const currentKey = [...open].sort(
      (a, b) => (f.get(a) ?? Infinity) - (f.get(b) ?? Infinity) || a.localeCompare(b),
    )[0];
    const current = coords.get(currentKey)!;
    if (sameCoord(current, goal)) return reconstruct(cameFrom, coords, currentKey);
    open.delete(currentKey);

    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = coordKey(next);
      if (!inBounds(map, next) || (blocked.has(nextKey) && !sameCoord(next, goal))) continue;
      const cost = movementCost(map, current, next, hero);
      if (!Number.isFinite(cost)) continue;
      const tentative = (g.get(currentKey) ?? Infinity) + cost;
      if (tentative >= (g.get(nextKey) ?? Infinity)) continue;
      cameFrom.set(nextKey, currentKey);
      coords.set(nextKey, next);
      g.set(nextKey, tentative);
      f.set(nextKey, tentative + heuristic(next, goal));
      open.add(nextKey);
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
  hero?: Pick<Hero, 'skills'>,
): number {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += movementCost(map, path[index - 1], path[index], hero);
  }
  return total;
}

export function reachablePathPrefix(
  map: GameMap,
  path: Coord[],
  budget: number,
  hero?: Pick<Hero, 'skills'>,
): Coord[] {
  const reachable = [path[0]];
  let spent = 0;
  for (let index = 1; index < path.length; index += 1) {
    const step = movementCost(map, path[index - 1], path[index], hero);
    if (spent + step > budget) break;
    spent += step;
    reachable.push(path[index]);
  }
  return reachable;
}
