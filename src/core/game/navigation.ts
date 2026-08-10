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

export interface FriendlyHeroMeetingPlan {
  targetHeroId: string;
  destination: { x: number; y: number };
  path: { x: number; y: number }[];
  cost: number;
  adjacent: boolean;
}

export type FriendlyHeroMeetingResult =
  | { ok: true; plan: FriendlyHeroMeetingPlan }
  | { ok: false; reason: string };

export type FriendlyHeroMeetingCompletion =
  | { ok: true }
  | { ok: false; reason: string };

interface AdventurePathOptions {
  avoidAggro?: boolean;
  fightGuardianId?: string;
  allowDestinationGuardian?: boolean;
}

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
  options: AdventurePathOptions = {},
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
    fightGuardianId: options.fightGuardianId
      ?? (options.allowDestinationGuardian === false ? undefined : destinationGuardian?.id),
  };
  const freeForest = state.players[hero.owner].adventureEffects.greenTideUntilWeek
    >= state.week;
  return findMixedPathResult(
    state.map, hero.position, destination, blockedMapTiles(state, hero, pathOptions), hero, state.omen,
    freeForest,
  )?.path ?? null;
}

/**
 * Choose the least-cost safe square beside a friendly hero. Equal-cost destinations use map order
 * (north-to-south, then west-to-east), so saves, previews, and browsers choose the same route.
 */
export function friendlyHeroMeetingPlan(
  state: GameState, targetHeroId: string,
): FriendlyHeroMeetingResult {
  if (state.phase !== 'adventure') {
    return { ok: false, reason: 'Hero meetings are only available on the adventure map.' };
  }
  const hero = selectedActiveHero(state);
  if (hero.id === targetHeroId) {
    return { ok: false, reason: 'Choose another friendly hero to exchange with.' };
  }
  const target = Object.values(state.players).flatMap((player) => player.heroes)
    .find((candidate) => candidate.id === targetHeroId);
  if (!target || !target.alive) {
    return { ok: false, reason: 'That hero is no longer available.' };
  }
  if (target.owner !== hero.owner) {
    return { ok: false, reason: 'That hero is no longer friendly.' };
  }
  if (adjacent(hero.position, target.position)) {
    return { ok: true, plan: {
      targetHeroId, destination: { ...hero.position }, path: [{ ...hero.position }],
      cost: 0, adjacent: true,
    } };
  }

  const candidates = Array.from({ length: 3 }, (_, dy) =>
    Array.from({ length: 3 }, (_, dx) => ({
      x: target.position.x + dx - 1, y: target.position.y + dy - 1,
    }))).flat().filter((position) => !same(position, target.position)
      && legalMeetingDestination(state, hero, position));
  const freeForest = state.players[hero.owner].adventureEffects.greenTideUntilWeek >= state.week;
  const blocked = blockedMapTiles(state, hero, { avoidAggro: true });
  const routes = candidates.flatMap((destination) => {
    const passage = state.mapEffects.find((effect) => effect.kind === 'passage'
      && effect.owner === hero.owner && effect.expiresDay >= state.day
      && ((same(effect.entrances[0], hero.position) && same(effect.entrances[1], destination))
        || (same(effect.entrances[1], hero.position) && same(effect.entrances[0], destination))));
    const result = passage
      ? { path: [{ ...hero.position }, { ...destination }], cost: 0 }
      : findMixedPathResult(
        state.map, hero.position, destination, blocked, hero, state.omen, freeForest,
      );
    return result ? [{ destination, ...result }] : [];
  }).sort((a, b) => a.cost - b.cost
    || a.destination.y - b.destination.y || a.destination.x - b.destination.x);
  const route = routes[0];
  if (!route) {
    return {
      ok: false,
      reason: candidates.length
        ? 'No safe route reaches a free tile beside that hero.'
        : 'No free legal tile is available beside that hero.',
    };
  }
  return { ok: true, plan: {
    targetHeroId, destination: { ...route.destination },
    path: route.path.map((position) => ({ ...position })), cost: route.cost, adjacent: false,
  } };
}

/** Revalidate the rules-owned outcome after MOVE_HERO resolves before presentation opens exchange. */
export function friendlyHeroMeetingCompletion(
  state: GameState, sourceHeroId: string, targetHeroId: string,
  destination: { x: number; y: number },
): FriendlyHeroMeetingCompletion {
  const source = Object.values(state.players).flatMap((player) => player.heroes)
    .find((candidate) => candidate.id === sourceHeroId);
  const target = Object.values(state.players).flatMap((player) => player.heroes)
    .find((candidate) => candidate.id === targetHeroId);
  if (!source?.alive) return { ok: false, reason: 'the travelling hero is no longer available.' };
  if (!target?.alive) return { ok: false, reason: 'the other hero is no longer available.' };
  if (source.owner !== target.owner) {
    return { ok: false, reason: 'the heroes are no longer friendly.' };
  }
  if (state.phase !== 'adventure') {
    return {
      ok: false,
      reason: `movement was interrupted${state.lastMessage ? `: ${state.lastMessage}` : '.'}`,
    };
  }
  if (state.pendingChoice) {
    return { ok: false, reason: `movement was interrupted: ${state.lastMessage}` };
  }
  if (!legalMeetingDestination(state, source, destination, source.id)) {
    return { ok: false, reason: 'the meeting tile is no longer legal.' };
  }
  if (!same(source.position, destination) || !adjacent(source.position, target.position)) {
    return { ok: false, reason: state.lastMessage || 'the destination was not reached.' };
  }
  return { ok: true };
}

function legalMeetingDestination(
  state: GameState, hero: Hero, position: { x: number; y: number },
  occupyingHeroId?: string,
): boolean {
  if (!inBounds(state.map, position)
      || !Number.isFinite(movementCost(state.map, hero.position, position, hero, state.omen))) {
    return false;
  }
  if (Object.values(state.players).flatMap((player) => player.heroes)
    .some((candidate) => candidate.alive && candidate.id !== occupyingHeroId
      && same(candidate.position, position))) return false;
  if (state.map.objects.some((object) => isObjectActive(object)
    && objectFootprintTiles(object).some((tile) => same(tile, position)))) return false;
  if (state.castles.some((castle) => castleFootprintTiles(castle)
    .some((tile) => same(tile, position)))) return false;
  if (state.mapEffects.some((effect) => effect.kind === 'thicket'
    && effect.expiresDay >= state.day && effect.positions.some((tile) => same(tile, position)))) {
    return false;
  }
  return !state.map.objects.some((object) => object.kind === 'guardian'
    && isObjectActive(object) && !object.stoodAsideFor?.includes(hero.id)
    && guardianAggroTiles(object, state.map).some((tile) => same(tile, position)));
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

function findMixedPathResult(
  map: GameState['map'], start: { x: number; y: number }, goal: { x: number; y: number },
  blocked: ReadonlySet<string>, hero: Hero, omen: GameState['omen'], freeForest: boolean,
): { path: { x: number; y: number }[]; cost: number } | null {
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
      return { path: result, cost: distance.get(currentKey) ?? 0 };
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

function adjacent(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return !same(a, b) && Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;
}
