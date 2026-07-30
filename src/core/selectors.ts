import { BUILDINGS } from '../content/buildings';
import { FACTION_UNITS, UNITS } from '../content/units';
import { canAfford } from './army';
import { battleReachableHexes, legalBattleActions } from './combat/battle';
import { findPath, pathCost, sameCoord } from './map/pathfinding';
import { reachablePathPrefix } from './map/pathfinding';
import { adventurePath } from './game/exploration';
import type {
  BattleStack, BuildingId, Castle, Coord, GameState, MapObject, PlayerId, UnitTier,
} from './types';
import { selectedHero } from './heroes';
import { skillRank } from './heroBehaviors';
import { SKILLS } from '../content/skills';

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
  const hero = selectedHero(state.players[state.activePlayer]);
  if (!hero) return null;
  return state.castles.find(
    (castle) => castle.owner === state.activePlayer
      && sameCoord(castle.position, hero.position),
  ) ?? null;
}

export function reachableAdventureTiles(state: GameState): Set<string> {
  const hero = selectedHero(state.players[state.activePlayer]);
  const result = new Set<string>();
  if (!hero) return result;
  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      const path = findPath(state.map, hero.position, { x, y }, new Set(), hero);
      if (path && pathCost(state.map, path, hero) <= hero.movement) result.add(`${x},${y}`);
    }
  }
  return result;
}

export function previewPath(state: GameState, destination: Coord): Coord[] {
  return selectedHero(state.players[state.activePlayer])
    ? adventurePath(state, destination) ?? [] : [];
}

export function animatedAdventurePath(state: GameState, destination: Coord): Coord[] {
  const hero = selectedHero(state.players[state.activePlayer]);
  const path = hero ? adventurePath(state, destination) : null;
  return path ? reachablePathPrefix(state.map, path, hero!.movement, hero!) : [];
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

export type GuardianSizeBand = 'Few' | 'Dozens' | 'Scores' | 'Hundreds';

export function guardianSizeBand(count: number): GuardianSizeBand {
  if (count <= 9) return 'Few';
  if (count <= 24) return 'Dozens';
  if (count <= 74) return 'Scores';
  return 'Hundreds';
}

export interface GuardianIntel {
  exact: boolean;
  label: string;
  count: number | null;
  abilities: string[];
}

export function guardianIntel(
  state: GameState,
  object: MapObject,
  hero = selectedHero(state.players[state.activePlayer]),
): GuardianIntel | null {
  if (object.kind === 'pile' || !object.guard || object.cleared) return null;
  const count = object.guard.army.reduce((sum, stack) => sum + stack.count, 0);
  const distance = hero
    ? Math.max(Math.abs(hero.position.x - object.position.x),
      Math.abs(hero.position.y - object.position.y))
    : Number.POSITIVE_INFINITY;
  const exact = distance <= 1 || Boolean(hero
    && skillRank(hero, 'scouting') >= 1
    && distance <= SKILLS.scouting.values.inspectRange);
  const abilities = exact
    ? [...new Set(object.guard.army.flatMap((stack) => UNITS[stack.unitId].abilities))]
    : [];
  return {
    exact, label: exact ? String(count) : guardianSizeBand(count),
    count: exact ? count : null, abilities,
  };
}
