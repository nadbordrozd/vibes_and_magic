import { FACTION_UNITS, UNITS } from '../content/units';
import { armyPower, canAfford, makeArmy } from '../core/army';
import {
  apply, applyAutomaticChoice, firstAffordableBuilding,
} from '../core/game';
import {
  findPath, movementCost, pathCost, sameCoord,
} from '../core/map/pathfinding';
import type {
  Action, Coord, GameState, MapObject, PlayerId,
} from '../core/types';

interface Objective {
  id: string;
  position: Coord;
  priority: number;
  power: number;
}

function guardedPower(object: MapObject): number {
  if (object.kind === 'pile' || !object.guard) return 0;
  return armyPower(makeArmy(object.guard.army));
}

function pathDistance(state: GameState, position: Coord): number {
  const hero = state.players[state.activePlayer].hero;
  if (!hero) return Number.POSITIVE_INFINITY;
  const path = findPath(state.map, hero.position, position);
  return path ? pathCost(state.map, path) : Number.POSITIVE_INFINITY;
}

function enemyArmyPower(state: GameState, playerId: PlayerId): number {
  const player = state.players[playerId];
  const heroPower = player.hero ? armyPower(player.hero.army) : 0;
  const garrisonPower = state.castles
    .filter((castle) => castle.owner === playerId)
    .reduce((sum, castle) => sum + armyPower(castle.garrison), 0);
  return heroPower + garrisonPower;
}

function collectObjectives(state: GameState): Objective[] {
  const playerId = state.activePlayer;
  const hero = state.players[playerId].hero;
  if (!hero) return [];
  const power = armyPower(hero.army);
  const objectives: Objective[] = [];
  for (const object of state.map.objects) {
    if (object.kind === 'pile' && !object.collected) {
      objectives.push({ id: object.id, position: object.position, priority: 0, power: 0 });
    } else if (object.kind === 'chest' && !object.collected) {
      const guard = object.cleared ? 0 : guardedPower(object);
      if (guard === 0 || guard <= power * 0.8) {
        objectives.push({
          id: object.id, position: object.position,
          priority: guard ? 2 : 0, power: guard,
        });
      }
    } else if (object.kind === 'mine' && object.owner !== playerId) {
      const guard = object.cleared ? 0 : guardedPower(object);
      if (guard === 0 || guard <= power * 0.8) {
        objectives.push({
          id: object.id, position: object.position,
          priority: guard ? 2 : 1, power: guard,
        });
      }
    }
  }
  for (const castle of state.castles.filter((item) => item.owner !== playerId)) {
    objectives.push({
      id: castle.id, position: castle.position,
      priority: state.day >= 15 ? -1 : 3,
      power: enemyArmyPower(state, castle.owner),
    });
  }
  const enemy = state.players[playerId === 'p1' ? 'p2' : 'p1'].hero;
  if (enemy?.alive && !state.castles.some((castle) =>
    sameCoord(castle.position, enemy.position) && castle.owner === enemy.owner)) {
    objectives.push({
      id: enemy.id, position: enemy.position,
      priority: state.day >= 15 ? -1 : 3,
      power: armyPower(enemy.army),
    });
  }
  return objectives.filter((objective) => Number.isFinite(pathDistance(state, objective.position)));
}

function chooseObjective(state: GameState): Objective | null {
  const hero = state.players[state.activePlayer].hero;
  if (!hero) return null;
  const ownPower = armyPower(hero.army);
  const immediateAttack = collectObjectives(state).filter(
    (objective) => objective.priority === 3
      && objective.power * 1.2 <= ownPower
      && pathDistance(state, objective.position) <= hero.movement,
  ).sort((a, b) => pathDistance(state, a.position) - pathDistance(state, b.position))[0];
  if (immediateAttack) return immediateAttack;
  return collectObjectives(state).sort(
    (a, b) => a.priority - b.priority
      || pathDistance(state, a.position) - pathDistance(state, b.position)
      || a.id.localeCompare(b.id),
  )[0] ?? null;
}

function recruitAtCastle(state: GameState): GameState {
  const hero = state.players[state.activePlayer].hero;
  const castle = hero && state.castles.find(
    (item) => item.owner === state.activePlayer
      && sameCoord(item.position, hero.position),
  );
  if (!castle) return state;
  let next = state;
  for (const tier of [3, 2, 1] as const) {
    if (tier > 1 && !castle.buildings.includes(`dwelling${tier}` as 'dwelling2' | 'dwelling3')) {
      continue;
    }
    const currentCastle = next.castles.find((item) => item.id === castle.id)!;
    const unitId = FACTION_UNITS[currentCastle.faction][tier - 1];
    const cost = UNITS[unitId].cost;
    let count = currentCastle.available[tier - 1];
    while (count > 0 && !canAfford(next.players[next.activePlayer].resources, cost, count)) {
      count -= 1;
    }
    if (count > 0) {
      next = apply(next, { type: 'RECRUIT', castleId: castle.id, tier, count });
    }
  }
  return next;
}

function buildAtCastle(state: GameState): GameState {
  const castle = state.castles.find((item) => item.owner === state.activePlayer);
  if (!castle) return state;
  const buildingId = firstAffordableBuilding(state, castle);
  return buildingId
    ? apply(state, { type: 'BUILD', castleId: castle.id, buildingId })
    : state;
}

export function runStrategyTurn(initial: GameState, maxSteps = 100): GameState {
  const startingPlayer = initial.activePlayer;
  let state = initial;
  for (let step = 0; step < maxSteps; step += 1) {
    if (state.phase === 'gameOver' || state.activePlayer !== startingPlayer) return state;
    if (state.pendingChoice) {
      state = applyAutomaticChoice(state);
      continue;
    }
    if (state.phase === 'combat') {
      const defenderId = state.battle?.context.defenderPlayerId;
      if (defenderId && state.players[defenderId].controller === 'human') return state;
      state = apply(state, { type: 'AUTO_COMBAT' });
      continue;
    }
    const hero = state.players[startingPlayer].hero;
    if (!hero?.alive) return apply(state, { type: 'END_TURN' });

    const recruited = recruitAtCastle(state);
    const built = buildAtCastle(recruited);
    if (built !== state) {
      state = built;
      continue;
    }

    if (hero.movement <= 0) return apply(state, { type: 'END_TURN' });
    const objective = chooseObjective(state);
    if (!objective || sameCoord(objective.position, hero.position)) {
      return apply(state, { type: 'END_TURN' });
    }
    const path = findPath(state.map, hero.position, objective.position);
    if (!path || path.length < 2
        || movementCost(state.map, path[0], path[1]) > hero.movement) {
      return apply(state, { type: 'END_TURN' });
    }
    const move: Action = { type: 'MOVE_HERO', destination: objective.position };
    state = apply(state, move);
  }
  throw new Error(`Strategy AI exceeded ${maxSteps} actions on day ${state.day}`);
}
