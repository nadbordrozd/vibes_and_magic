import { activeHero as selectedActiveHero } from '../heroes';
import {
  coordKey, findPath, inBounds, movementCost,
} from '../map/pathfinding';
import { DISEMBARK_MOVE_COST, EMBARK_MOVE_COST, SEA_MOVE_COST } from '../../content/constants';
import {
  castleEntrance, castleFootprintTiles, guardianAggroTiles, isObjectActive,
  objectEntranceTile, objectFootprintTiles,
} from '../map/occupancy';
import type { GameState, Hero } from '../types';
import { terrainIdAt } from '../../content/terrain';
import { PriorityQueue } from '../map/priorityQueue';

function blockedMapTiles(
  state: GameState, hero: Hero,
  options: { avoidAggro?: boolean; fightGuardianId?: string } = {},
): Set<string> {
  const blocked = new Set(
    Object.values(state.players).flatMap((player) =>
      player.heroes.filter((candidate) => candidate.alive && candidate.id !== hero.id)
        .map((candidate) => coordKey(candidate.position)),
    ),
  );
  for (const object of state.map.objects) {
    if (!isObjectActive(object)) continue;
    const entrance = objectEntranceTile(object);
    for (const tile of objectFootprintTiles(object)) {
      if (!same(tile, entrance) || object.kind === 'guardian' || object.kind === 'obstacle') {
        blocked.add(coordKey(tile));
      }
    }
    if (options.avoidAggro && object.kind === 'guardian'
        && object.id !== options.fightGuardianId
        && !object.stoodAsideFor?.includes(hero.id)) {
      guardianAggroTiles(object, state.map).forEach((tile) => blocked.add(coordKey(tile)));
    }
  }
  for (const castle of state.castles) {
    const entrance = castleEntrance(castle);
    for (const tile of castleFootprintTiles(castle)) {
      if (!same(tile, entrance)) blocked.add(coordKey(tile));
    }
  }
  for (const effect of state.mapEffects) {
    if (effect.kind === 'thicket' && effect.expiresDay >= state.day) {
      effect.positions.forEach((position) => blocked.add(coordKey(position)));
    }
  }
  return blocked;
}

export function adventurePath(
  state: GameState,
  destination: { x: number; y: number },
  options: { avoidAggro?: boolean; fightGuardianId?: string } = {},
): ReturnType<typeof findPath> {
  const hero = selectedActiveHero(state);
  if (state.map.objects.some((object) => object.kind === 'obstacle'
      && objectFootprintTiles(object).some((tile) => same(tile, destination)))) return null;
  const passage = state.mapEffects.find((effect) => effect.kind === 'passage'
    && effect.owner === hero.owner && effect.expiresDay >= state.day
    && ((same(effect.entrances[0], hero.position) && same(effect.entrances[1], destination))
      || (same(effect.entrances[1], hero.position) && same(effect.entrances[0], destination))));
  if (passage) return [{ ...hero.position }, { ...destination }];
  const destinationGuardian = state.map.objects.find((object) => object.kind === 'guardian'
    && same(object.position, destination)) ?? state.map.objects
    .filter((object) => object.kind === 'guardian'
      && guardianAggroTiles(object, state.map).some((tile) => same(tile, destination)))
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  const pathOptions = {
    avoidAggro: options.avoidAggro ?? true,
    fightGuardianId: options.fightGuardianId ?? destinationGuardian?.id,
  };
  const freeForest = state.players[hero.owner].adventureEffects.greenTideUntilWeek
    >= state.week;
  return findMixedPath(
    state.map, hero.position, destination, blockedMapTiles(state, hero, pathOptions), hero, state.omen,
    freeForest,
  );
}

export function adventureMovementCost(
  state: GameState, hero: Hero, from: { x: number; y: number }, to: { x: number; y: number },
  freeForest = false,
): number {
  const whirlpool = state.map.objects.find((object) => object.kind === 'whirlpool'
    && same(object.position, from) && state.map.objects.some((paired) =>
      paired.id === object.pairedId && same(paired.position, to)));
  if (whirlpool) return hero.embarkedBoatId ? 0 : Infinity;
  const fromWater = terrainIdAt(state.map, from) === 'water';
  const toWater = terrainIdAt(state.map, to) === 'water';
  if (fromWater && toWater) return hero.embarkedBoatId ? SEA_MOVE_COST : Infinity;
  if (fromWater && !toWater) return hero.embarkedBoatId ? DISEMBARK_MOVE_COST : Infinity;
  if (!fromWater && toWater) {
    const boat = state.map.objects.find((object) => object.kind === 'boat'
      && same(object.position, to) && (!object.occupiedBy || object.occupiedBy === hero.id));
    return boat ? EMBARK_MOVE_COST : Infinity;
  }
  return movementCost(state.map, from, to, hero, state.omen, freeForest);
}

function findMixedPath(
  map: GameState['map'], start: { x: number; y: number }, goal: { x: number; y: number },
  blocked: ReadonlySet<string>, hero: Hero, omen: GameState['omen'], freeForest: boolean,
): { x: number; y: number }[] | null {
  const directions = [-1, 0, 1].flatMap((dx) => [-1, 0, 1]
    .filter((dy) => dx !== 0 || dy !== 0).map((dy) => ({ x: dx, y: dy })));
  type Node = { position: { x: number; y: number }; embarked: boolean };
  const key = (node: Node) => `${coordKey(node.position)}:${node.embarked ? 1 : 0}`;
  const initial: Node = { position: start, embarked: Boolean(hero.embarkedBoatId) };
  const open = new PriorityQueue<Node>();
  open.push(key(initial), 0, initial);
  const distance = new Map([[key(initial), 0]]);
  const previous = new Map<string, string>();
  const nodes = new Map([[key(initial), initial]]);
  while (open.size) {
    const entry = open.pop()!;
    const currentKey = entry.key;
    if (entry.priority !== distance.get(currentKey)) continue;
    const current = entry.value;
    if (same(current.position, goal)) {
      const result: { x: number; y: number }[] = [];
      let cursor: string | undefined = currentKey;
      while (cursor) { result.unshift(nodes.get(cursor)!.position); cursor = previous.get(cursor); }
      return result;
    }
    const whirlpool = current.embarked ? map.objects.find((object) => object.kind === 'whirlpool'
      && same(object.position, current.position)) : undefined;
    const paired = whirlpool?.kind === 'whirlpool'
      ? map.objects.find((object) => object.id === whirlpool.pairedId
        && object.kind === 'whirlpool') : undefined;
    const candidates = [
      ...directions.map((direction) => ({
        position: {
          x: current.position.x + direction.x, y: current.position.y + direction.y,
        }, routePenalty: 0,
      })),
      ...(paired ? [{ position: paired.position, routePenalty: whirlpoolRoutePenalty(hero) }] : []),
    ];
    for (const candidateNode of candidates) {
      const { position, routePenalty } = candidateNode;
      if (!inBounds(map, position)
          || (blocked.has(coordKey(position)) && !same(position, goal))) continue;
      const fromWater = terrainIdAt(map, current.position) === 'water';
      const toWater = terrainIdAt(map, position) === 'water';
      let embarked = current.embarked;
      let cost: number;
      const crossingWhirlpool = routePenalty > 0;
      if (crossingWhirlpool) cost = embarked ? 0 : Infinity;
      else if (fromWater && toWater) cost = embarked ? SEA_MOVE_COST : Infinity;
      else if (fromWater && !toWater) { cost = embarked ? DISEMBARK_MOVE_COST : Infinity; embarked = false; }
      else if (!fromWater && toWater) {
        const boat = map.objects.find((object) => object.kind === 'boat'
          && same(object.position, position) && (!object.occupiedBy || object.occupiedBy === hero.id));
        cost = boat ? EMBARK_MOVE_COST : Infinity; embarked = Boolean(boat);
      } else cost = movementCost(map, current.position, position, hero, omen, freeForest);
      if (!Number.isFinite(cost)) continue;
      const next = { position, embarked };
      const nextKey = key(next);
      const candidate = (distance.get(currentKey) ?? Infinity) + cost + routePenalty;
      if (candidate >= (distance.get(nextKey) ?? Infinity)) continue;
      distance.set(nextKey, candidate); previous.set(nextKey, currentKey);
      nodes.set(nextKey, next); open.push(nextKey, candidate, next);
    }
  }
  return null;
}

/**
 * Finds every destination the active hero can reach this turn in one bounded search. The old UI
 * implementation ran a complete point-to-point search for every map tile, making a render grow
 * roughly quadratically with map area.
 */
export function reachableAdventureTileKeys(state: GameState, hero: Hero): Set<string> {
  type Node = { position: { x: number; y: number }; embarked: boolean };
  const nodeKey = (node: Node) => `${coordKey(node.position)}:${node.embarked ? 1 : 0}`;
  const result = new Set<string>();
  const blocked = blockedMapTiles(state, hero);
  const obstacles = new Set(state.map.objects
    .filter((object) => object.kind === 'obstacle' && isObjectActive(object))
    .flatMap((object) => objectFootprintTiles(object).map(coordKey)));
  const guardianStops = new Set<string>();
  for (const object of state.map.objects) {
    if (object.kind !== 'guardian' || !isObjectActive(object)) continue;
    guardianStops.add(coordKey(object.position));
    if (!object.stoodAsideFor?.includes(hero.id)) {
      guardianAggroTiles(object, state.map).forEach((position) =>
        guardianStops.add(coordKey(position)));
    }
  }
  const freeForest = state.players[hero.owner].adventureEffects.greenTideUntilWeek >= state.week;
  const initial: Node = { position: hero.position, embarked: Boolean(hero.embarkedBoatId) };
  const initialKey = nodeKey(initial);
  const distance = new Map([[initialKey, 0]]);
  const open = new PriorityQueue<Node>();
  open.push(initialKey, 0, initial);
  const directions = [-1, 0, 1].flatMap((dx) => [-1, 0, 1]
    .filter((dy) => dx !== 0 || dy !== 0).map((dy) => ({ x: dx, y: dy })));

  while (open.size) {
    const entry = open.pop()!;
    if (entry.priority !== distance.get(entry.key)) continue;
    if (entry.priority > hero.movement) break;
    const current = entry.value;
    const positionKey = coordKey(current.position);
    result.add(positionKey);
    if (positionKey !== coordKey(hero.position)
        && (blocked.has(positionKey) || guardianStops.has(positionKey))) continue;

    const whirlpool = current.embarked ? state.map.objects.find((object) =>
      object.kind === 'whirlpool' && same(object.position, current.position)) : undefined;
    const paired = whirlpool?.kind === 'whirlpool'
      ? state.map.objects.find((object) => object.id === whirlpool.pairedId
        && object.kind === 'whirlpool') : undefined;
    const candidates = [
      ...directions.map((direction) => ({
        position: {
          x: current.position.x + direction.x,
          y: current.position.y + direction.y,
        },
        routePenalty: 0,
      })),
      ...(paired ? [{ position: paired.position, routePenalty: whirlpoolRoutePenalty(hero) }] : []),
    ];
    for (const candidateNode of candidates) {
      const { position, routePenalty } = candidateNode;
      const positionKey = coordKey(position);
      if (!inBounds(state.map, position) || obstacles.has(positionKey)) continue;
      const fromWater = terrainIdAt(state.map, current.position) === 'water';
      const toWater = terrainIdAt(state.map, position) === 'water';
      let embarked = current.embarked;
      let cost: number;
      if (routePenalty > 0) cost = embarked ? 0 : Infinity;
      else if (fromWater && toWater) cost = embarked ? SEA_MOVE_COST : Infinity;
      else if (fromWater && !toWater) {
        cost = embarked ? DISEMBARK_MOVE_COST : Infinity;
        embarked = false;
      } else if (!fromWater && toWater) {
        const boat = state.map.objects.find((object) => object.kind === 'boat'
          && same(object.position, position) && (!object.occupiedBy || object.occupiedBy === hero.id));
        cost = boat ? EMBARK_MOVE_COST : Infinity;
        embarked = Boolean(boat);
      } else {
        cost = movementCost(state.map, current.position, position, hero, state.omen, freeForest);
      }
      if (!Number.isFinite(cost)) continue;
      const next = { position, embarked };
      const nextKey = nodeKey(next);
      const nextDistance = entry.priority + cost + routePenalty;
      if (nextDistance > hero.movement
          || nextDistance >= (distance.get(nextKey) ?? Infinity)) continue;
      distance.set(nextKey, nextDistance);
      open.push(nextKey, nextDistance, next);
    }
  }

  for (const effect of state.mapEffects) {
    if (effect.kind !== 'passage' || effect.owner !== hero.owner || effect.expiresDay < state.day) {
      continue;
    }
    if (same(effect.entrances[0], hero.position)) result.add(coordKey(effect.entrances[1]));
    if (same(effect.entrances[1], hero.position)) result.add(coordKey(effect.entrances[0]));
  }
  return result;
}

function whirlpoolRoutePenalty(hero: Hero): number {
  const weakest = hero.army.flatMap((stack) => stack ? [stack] : [])
    .sort((a, b) => a.count - b.count)[0];
  return weakest ? Math.max(100, Math.ceil(weakest.count * 0.25) * 100) : 100;
}

function same(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return a.x === b.x && a.y === b.y;
}
