import { CASTLE_REVEAL_RADIUS, HERO_REVEAL_RADIUS } from '../../content/constants';
import type { Castle, Coord, GameMap, Hero } from '../types';
import { coordKey } from './pathfinding';

function revealCircle(
  explored: Set<string>,
  map: GameMap,
  center: Coord,
  radius: number,
): void {
  for (let y = Math.max(0, center.y - radius); y <= Math.min(map.height - 1, center.y + radius); y += 1) {
    for (let x = Math.max(0, center.x - radius); x <= Math.min(map.width - 1, center.x + radius); x += 1) {
      if ((x - center.x) ** 2 + (y - center.y) ** 2 <= radius ** 2) {
        explored.add(coordKey({ x, y }));
      }
    }
  }
}

export function revealForPlayer(
  current: string[],
  map: GameMap,
  hero: Hero | null,
  castles: Castle[],
): string[] {
  const explored = new Set(current);
  if (hero?.alive) revealCircle(explored, map, hero.position, HERO_REVEAL_RADIUS);
  for (const castle of castles) revealCircle(explored, map, castle.position, CASTLE_REVEAL_RADIUS);
  return [...explored].sort();
}
