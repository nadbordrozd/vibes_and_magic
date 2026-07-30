import { CASTLE_REVEAL_RADIUS, HERO_REVEAL_RADIUS } from '../../content/constants';
import { SKILLS } from '../../content/skills';
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

export function revealArea(
  current: string[],
  map: GameMap,
  center: Coord,
  radius: number,
): string[] {
  const explored = new Set(current);
  revealCircle(explored, map, center, radius);
  return [...explored].sort();
}

export function revealForPlayer(
  current: string[],
  map: GameMap,
  heroOrHeroes: Hero | Hero[] | null,
  castles: Castle[],
): string[] {
  const explored = new Set(current);
  const heroes = Array.isArray(heroOrHeroes)
    ? heroOrHeroes : heroOrHeroes ? [heroOrHeroes] : [];
  for (const hero of heroes.filter((candidate) => candidate.alive)) {
    const radius = HERO_REVEAL_RADIUS + (hero.skills.scouting === 2
      ? SKILLS.scouting.values.revealBonus : 0);
    revealCircle(explored, map, hero.position, radius);
  }
  for (const castle of castles) revealCircle(explored, map, castle.position, CASTLE_REVEAL_RADIUS);
  return [...explored].sort();
}
