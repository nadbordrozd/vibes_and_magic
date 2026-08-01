import { BATTLE_COLS, BATTLE_ROWS } from '../../content/constants';
import type { Coord } from '../types';
import { coordKey, sameCoord } from '../map/pathfinding';

export function hexNeighbors(coord: Coord): Coord[] {
  const odd = coord.y % 2 === 1;
  const offsets = odd
    ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
  return offsets
    .map(([x, y]) => ({ x: coord.x + x, y: coord.y + y }))
    .filter((next) =>
      next.x >= 0 && next.y >= 0 && next.x < BATTLE_COLS && next.y < BATTLE_ROWS,
    );
}

function toCube(coord: Coord): [number, number, number] {
  const q = coord.x - (coord.y - (coord.y & 1)) / 2;
  const z = coord.y;
  const y = -q - z;
  return [q, y, z];
}

export function hexDistance(a: Coord, b: Coord): number {
  const ac = toCube(a);
  const bc = toCube(b);
  return Math.max(
    Math.abs(ac[0] - bc[0]),
    Math.abs(ac[1] - bc[1]),
    Math.abs(ac[2] - bc[2]),
  );
}

export function reachableHexes(
  start: Coord,
  speed: number,
  occupied: Coord[],
  obstacles: Coord[],
  flying: boolean,
  canLandOnObstacles = false,
  extraEntryCost: (coord: Coord) => number = () => 0,
  footprintSize: 1 | 2 | 3 = 1,
): Coord[] {
  const footprint = (anchor: Coord) => Array.from({ length: footprintSize }, (_, index) => ({
    x: anchor.x + index, y: anchor.y,
  }));
  const inBattle = (coord: Coord) => coord.x >= 0 && coord.y >= 0
    && coord.x < BATTLE_COLS && coord.y < BATTLE_ROWS;
  if (flying) {
    const blockedLanding = new Set(
      [...occupied, ...(canLandOnObstacles ? [] : obstacles)].map(coordKey),
    );
    const result: Coord[] = [];
    for (let y = 0; y < BATTLE_ROWS; y += 1) {
      for (let x = 0; x < BATTLE_COLS; x += 1) {
        const coord = { x, y };
        if (hexDistance(start, coord) <= speed && footprint(coord).every((hex) =>
          inBattle(hex) && !blockedLanding.has(coordKey(hex)))) {
          result.push(coord);
        }
      }
    }
    return result;
  }

  const blocked = new Set([...occupied, ...obstacles].map(coordKey));
  footprint(start).forEach((coord) => blocked.delete(coordKey(coord)));
  const visited = new Map([[coordKey(start), 0]]);
  const queue = [start];
  while (queue.length) {
    queue.sort((a, b) => visited.get(coordKey(a))! - visited.get(coordKey(b))!
      || a.y - b.y || a.x - b.x);
    const current = queue.shift()!;
    const distance = visited.get(coordKey(current))!;
    if (distance >= speed) continue;
    for (const next of hexNeighbors(current)) {
      const key = coordKey(next);
      if (!footprint(next).every((hex) => inBattle(hex) && !blocked.has(coordKey(hex)))) continue;
      const nextDistance = distance + 1 + Math.max(
        0, ...footprint(next).map(extraEntryCost),
      );
      if (nextDistance > speed || nextDistance >= (visited.get(key) ?? Infinity)) continue;
      visited.set(key, nextDistance);
      queue.push(next);
    }
  }
  return [...visited.keys()]
    .filter((key) => key !== coordKey(start))
    .map((key) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
}

export function nearestReachableToTarget(
  reachable: Coord[],
  target: Coord,
): Coord | null {
  return [...reachable].sort(
    (a, b) => hexDistance(a, target) - hexDistance(b, target)
      || a.y - b.y || a.x - b.x,
  )[0] ?? null;
}

export function isAdjacent(a: Coord, b: Coord): boolean {
  return hexNeighbors(a).some((coord) => sameCoord(coord, b));
}
