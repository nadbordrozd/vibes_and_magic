import { activeHero as selectedActiveHero } from '../heroes';
import {
  coordKey, findPath,
} from '../map/pathfinding';
import type { GameState, Hero } from '../types';

function blockedMapTiles(state: GameState, hero: Hero): Set<string> {
  const blocked = new Set(
    Object.values(state.players).flatMap((player) =>
      player.heroes.filter((candidate) => candidate.alive && candidate.id !== hero.id)
        .map((candidate) => coordKey(candidate.position)),
    ),
  );
  for (const object of state.map.objects) {
    const active = object.kind === 'pile'
      ? !object.collected
      : object.kind === 'chest'
        ? !object.collected
        : object.kind === 'shrine'
          ? !object.cleared
          : object.kind === 'mine'
            ? object.owner !== hero.owner || !object.cleared
            : object.kind === 'item'
              ? !object.collected
              : object.kind === 'richVein'
                ? !object.depleted && object.owner !== hero.owner
                : object.kind === 'lock' ? !object.cleared : false;
    if (active) blocked.add(coordKey(object.position));
  }
  for (const castle of state.castles) {
    if (castle.owner !== hero.owner) blocked.add(coordKey(castle.position));
  }
  return blocked;
}

export function adventurePath(
  state: GameState,
  destination: { x: number; y: number },
): ReturnType<typeof findPath> {
  const hero = selectedActiveHero(state);
  return findPath(
    state.map, hero.position, destination, blockedMapTiles(state, hero), hero,
  );
}
