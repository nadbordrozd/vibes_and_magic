import { CASTLE_REVEAL_RADIUS, HERO_REVEAL_RADIUS } from '../../content/constants';
import { SKILLS } from '../../content/skills';
import type { Castle, Coord, GameMap, Hero } from '../types';
import { coordKey } from './pathfinding';
import { castleFootprintTiles } from './occupancy';

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
    const radius = HERO_REVEAL_RADIUS + ((hero.skills.scouting ?? 0) >= 2
      ? SKILLS.scouting.values.revealBonus : 0);
    revealCircle(explored, map, hero.position, radius);
  }
  for (const castle of castles) castleFootprintTiles(castle).forEach((edge) =>
    revealCircle(explored, map, edge, CASTLE_REVEAL_RADIUS));
  return [...explored].sort();
}

/**
 * Project permanent exploration through movement positions that this hero actually entered.
 *
 * The reducer uses this one step at a time so interruptions retain the complete trail. The
 * adventure renderer uses the same pure projection over the currently animated prefix; animation
 * therefore presents rules-owned vision without becoming rules state itself.
 */
export function revealForMovementPath(
  current: string[],
  map: GameMap,
  heroes: Hero[],
  castles: Castle[],
  movingHero: Hero,
  enteredPositions: Coord[],
): string[] {
  const explored = new Set(revealForPlayer(current, map, heroes, castles));
  const radius = HERO_REVEAL_RADIUS + ((movingHero.skills.scouting ?? 0) >= 2
    ? SKILLS.scouting.values.revealBonus : 0);
  for (const position of enteredPositions) revealCircle(explored, map, position, radius);
  return [...explored].sort();
}
