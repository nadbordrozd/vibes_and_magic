import { BUILDINGS } from '../content/buildings';
import { FACTION_UNITS, UNITS } from '../content/units';
import { canAfford } from './army';
import { battleReachableHexes, legalBattleActions } from './combat/battle';
import { findPath, pathCost, sameCoord } from './map/pathfinding';
import { reachablePathPrefix } from './map/pathfinding';
import { adventurePath } from './game/exploration';
import type {
  BattleStack, BuildingId, Castle, Coord, GameState, PlayerId, UnitTier,
} from './types';

export interface BuildingStatus {
  state: 'built' | 'available' | 'locked';
  reason: string;
}

export function buildingStatus(
  state: GameState,
  castle: Castle,
  buildingId: BuildingId,
): BuildingStatus {
  if (castle.buildings.includes(buildingId)) return { state: 'built', reason: 'Built' };
  const definition = BUILDINGS[buildingId];
  if (definition.prerequisite && !castle.buildings.includes(definition.prerequisite)) {
    return { state: 'locked', reason: `Requires ${BUILDINGS[definition.prerequisite].name}` };
  }
  if (castle.builtOnDay === state.day) {
    return { state: 'locked', reason: 'Already built in this castle today' };
  }
  if (!canAfford(state.players[castle.owner].resources, definition.cost)) {
    return { state: 'locked', reason: 'Not enough resources' };
  }
  return { state: 'available', reason: 'Available to build' };
}

export function maxRecruitable(
  state: GameState,
  castle: Castle,
  tier: UnitTier,
): number {
  if (tier > 1 && !castle.buildings.includes(`dwelling${tier}` as BuildingId)) return 0;
  const unit = UNITS[FACTION_UNITS[castle.faction][tier - 1]];
  let count = castle.available[tier - 1];
  while (count > 0 && !canAfford(state.players[castle.owner].resources, unit.cost, count)) {
    count -= 1;
  }
  return count;
}

export function visitingCastle(state: GameState): Castle | null {
  const hero = state.players[state.activePlayer].hero;
  if (!hero) return null;
  return state.castles.find(
    (castle) => castle.owner === state.activePlayer
      && sameCoord(castle.position, hero.position),
  ) ?? null;
}

export function reachableAdventureTiles(state: GameState): Set<string> {
  const hero = state.players[state.activePlayer].hero;
  const result = new Set<string>();
  if (!hero) return result;
  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      const path = findPath(state.map, hero.position, { x, y });
      if (path && pathCost(state.map, path) <= hero.movement) result.add(`${x},${y}`);
    }
  }
  return result;
}

export function previewPath(state: GameState, destination: Coord): Coord[] {
  return state.players[state.activePlayer].hero
    ? adventurePath(state, destination) ?? [] : [];
}

export function animatedAdventurePath(state: GameState, destination: Coord): Coord[] {
  const hero = state.players[state.activePlayer].hero;
  const path = hero ? adventurePath(state, destination) : null;
  return path ? reachablePathPrefix(state.map, path, hero!.movement) : [];
}

export function battleStackController(
  state: GameState,
  stack: BattleStack,
): 'human' | 'ai' {
  if (stack.side === 'attacker') return state.players[state.activePlayer].controller;
  const defenderId = state.battle?.context.defenderPlayerId;
  return defenderId ? state.players[defenderId].controller : 'ai';
}

export function activeBattleOptions(state: GameState) {
  if (!state.battle) return { actions: [], reachable: [] as Coord[] };
  const stack = state.battle.stacks.find(
    (item) => item.id === state.battle!.currentStackId && item.count > 0,
  );
  return {
    actions: legalBattleActions(state.battle),
    reachable: stack ? battleReachableHexes(state.battle, stack) : [],
  };
}

export function opponent(playerId: PlayerId): PlayerId {
  return playerId === 'p1' ? 'p2' : 'p1';
}
