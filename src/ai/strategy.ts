import { FACTIONS } from '../content/factions';
import {
  AI_SECOND_HERO_GOLD, AI_THIRD_HERO_GOLD,
} from '../content/constants';
import { FACTION_UNITS, UNITS } from '../content/units';
import { AI_BUILD_ORDER, BUILDINGS } from '../content/buildings';
import {
  MARKET_AI_MAX_SHORTFALL, MARKET_BUY_GOLD, MARKET_SELL_GOLD,
  MARKET_SURPLUS_RESERVE,
} from '../content/marketplace';
import { armyPower, canAfford } from '../core/army';
import {
  apply, applyAutomaticChoice, firstAffordableBuilding,
} from '../core/game';
import { adventurePath } from '../core/game/exploration';
import { heroHireCost } from '../core/game/tavern';
import {
  movementCost, sameCoord,
} from '../core/map/pathfinding';
import type {
  Action, BuildingId, GameState, Hero,
} from '../core/types';
import { chooseStrategyObjective } from './strategyObjectives';

function recruitAtCastle(state: GameState, hero: Hero): GameState {
  const castle = state.castles.find((item) => item.owner === hero.owner
    && sameCoord(item.position, hero.position));
  if (!castle) return state;
  let next = state;
  for (const tier of [5, 4, 3, 2, 1] as const) {
    const current = next.castles.find((item) => item.id === castle.id)!;
    if (tier > 1 && !current.buildings.includes(`dwelling${tier}` as BuildingId)) continue;
    const unitId = FACTION_UNITS[current.faction][tier - 1];
    let count = current.available[tier - 1];
    while (count > 0 && !canAfford(next.players[hero.owner].resources,
      UNITS[unitId].cost, count)) count -= 1;
    if (count > 0) {
      next = apply(next, { type: 'RECRUIT', castleId: castle.id, tier, count });
    }
  }
  return next;
}

function buildAtCastle(state: GameState): GameState {
  for (const castle of state.castles.filter((item) => item.owner === state.activePlayer)) {
    const prepared = useMarketplace(state, castle.id);
    const current = prepared.castles.find((candidate) => candidate.id === castle.id)!;
    const buildingId = firstAffordableBuilding(prepared, current);
    if (buildingId) {
      return apply(prepared, { type: 'BUILD', castleId: castle.id, buildingId });
    }
    state = prepared;
  }
  return state;
}

function nextPlannedBuilding(state: GameState, castleId: string): BuildingId | null {
  const castle = state.castles.find((candidate) => candidate.id === castleId)!;
  return AI_BUILD_ORDER.find((id) => {
    if (castle.buildings.includes(id)) return false;
    if ((id === 'chapelOfTheBanner' && castle.faction !== 'hearthguard')
        || (id === 'guildWorkshop' && castle.faction !== 'woundWrights')) return false;
    const prerequisite = BUILDINGS[id].prerequisite;
    return !prerequisite || castle.buildings.includes(prerequisite);
  }) ?? null;
}

function useMarketplace(initial: GameState, castleId: string): GameState {
  let state = initial;
  for (let step = 0; step < 6; step += 1) {
    const castle = state.castles.find((candidate) => candidate.id === castleId)!;
    const player = state.players[castle.owner];
    const visiting = player.heroes.some((hero) =>
      hero.alive && sameCoord(hero.position, castle.position));
    if (!castle.buildings.includes('marketplace') || !visiting) return state;
    const buildingId = nextPlannedBuilding(state, castleId);
    if (!buildingId) return state;
    const cost = BUILDINGS[buildingId].cost;
    const missing = (['timber', 'iron', 'essence'] as const).find((resource) => {
      const shortfall = (cost[resource] ?? 0) - player.resources[resource];
      return shortfall >= 1 && shortfall <= MARKET_AI_MAX_SHORTFALL
        && player.resources.gold >= MARKET_BUY_GOLD[resource] * shortfall;
    });
    if (missing) {
      const amount = (cost[missing] ?? 0) - player.resources[missing];
      state = apply(state, {
        type: 'MARKET_TRADE', castleId, direction: 'buy',
        resource: missing, amount,
      });
      continue;
    }
    const otherCostsMet = (['timber', 'iron', 'essence'] as const).every(
      (resource) => player.resources[resource] >= (cost[resource] ?? 0),
    );
    const goldShortfall = (cost.gold ?? 0) - player.resources.gold;
    if (!otherCostsMet || goldShortfall <= 0) return state;
    const surplus = (['timber', 'iron', 'essence'] as const).find(
      (resource) => player.resources[resource] > MARKET_SURPLUS_RESERVE,
    );
    if (!surplus) return state;
    const amount = Math.min(
      player.resources[surplus] - MARKET_SURPLUS_RESERVE,
      Math.ceil(goldShortfall / MARKET_SELL_GOLD),
    );
    state = apply(state, {
      type: 'MARKET_TRADE', castleId, direction: 'sell',
      resource: surplus, amount,
    });
  }
  return state;
}

function hireAtTavern(state: GameState): GameState {
  const player = state.players[state.activePlayer];
  const count = player.heroes.length;
  const threshold = count === 0 ? 0
    : count === 1 ? AI_SECOND_HERO_GOLD
      : count === 2 ? AI_THIRD_HERO_GOLD : Number.POSITIVE_INFINITY;
  if (player.resources.gold <= threshold) return state;
  const castle = state.castles.find((item) => item.owner === player.id
    && item.buildings.includes('tavern'));
  const heroId = player.tavernOffers[0];
  const candidate = player.tavernPool.find((hero) => hero.id === heroId);
  return castle && heroId && candidate
    && player.resources.gold >= heroHireCost(candidate)
    ? apply(state, { type: 'HIRE_HERO', castleId: castle.id, heroId }) : state;
}

function deliverSurplus(state: GameState, gatherer: Hero, main: Hero): GameState {
  if (Math.max(Math.abs(gatherer.position.x - main.position.x),
    Math.abs(gatherer.position.y - main.position.y)) > 1) return state;
  let next = state;
  let reserve = FACTIONS[gatherer.faction].hireArmy.reduce(
    (sum, stack) => sum + stack.count, 0,
  );
  for (let sourceSlot = 0; sourceSlot < gatherer.army.length; sourceSlot += 1) {
    const stack = gatherer.army[sourceSlot];
    if (!stack) continue;
    const keep = Math.min(reserve, stack.count);
    reserve -= keep;
    const count = stack.count - keep;
    if (count <= 0) continue;
    const currentMain = next.players[main.owner].heroes.find((hero) => hero.id === main.id)!;
    const destinationSlot = currentMain.army.findIndex((candidate) =>
      candidate?.unitId === stack.unitId) >= 0
      ? currentMain.army.findIndex((candidate) => candidate?.unitId === stack.unitId)
      : currentMain.army.findIndex((candidate) => !candidate);
    if (destinationSlot < 0) continue;
    next = apply(next, {
      type: 'TRANSFER_ARMY',
      source: { kind: 'hero', id: gatherer.id }, sourceSlot,
      destination: { kind: 'hero', id: main.id }, destinationSlot, count,
    });
  }
  return next;
}

export function runStrategyTurn(initial: GameState, maxSteps = 200): GameState {
  const playerId = initial.activePlayer;
  let state = initial;
  const claims = new Set<string>();
  const finished = new Set<string>();
  let economyDone = false;
  let deliveryDone = false;
  for (let step = 0; step < maxSteps; step += 1) {
    if (state.phase === 'gameOver' || state.activePlayer !== playerId) return state;
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
    if (!economyDone) {
      state = buildAtCastle(state);
      state = hireAtTavern(state);
      economyDone = true;
    }
    const living = state.players[playerId].heroes.filter((hero) => hero.alive)
      .sort((a, b) => armyPower(b.army) - armyPower(a.army) || a.id.localeCompare(b.id));
    if (!living.length) return apply(state, { type: 'END_TURN' });
    const main = living[0];
    if (!deliveryDone) {
      for (const gatherer of living.slice(1)) {
        state = deliverSurplus(state, gatherer, main);
      }
      deliveryDone = true;
      continue;
    }
    const hero = living.find((candidate) => !finished.has(candidate.id));
    if (!hero) return apply(state, { type: 'END_TURN' });
    if (state.players[playerId].activeHeroId !== hero.id) {
      state = apply(state, { type: 'SELECT_HERO', heroId: hero.id });
      continue;
    }
    state = recruitAtCastle(state, hero);
    if (hero.id !== main.id) state = deliverSurplus(state, hero, main);
    const current = state.players[playerId].heroes.find((candidate) => candidate.id === hero.id)!;
    if (current.movement <= 0) {
      finished.add(current.id);
      continue;
    }
    const objective = chooseStrategyObjective(
      state, current, current.id === main.id ? 'main' : 'gatherer', claims,
    );
    if (!objective || sameCoord(objective.position, current.position)) {
      finished.add(current.id);
      continue;
    }
    const path = adventurePath(state, objective.position);
    if (!path || path.length < 2
        || movementCost(state.map, path[0], path[1], current) > current.movement) {
      finished.add(current.id);
      continue;
    }
    claims.add(objective.id);
    const move: Action = {
      type: 'MOVE_HERO', heroId: current.id, destination: objective.position,
    };
    state = apply(state, move);
    finished.add(current.id);
  }
  throw new Error(`Strategy AI exceeded ${maxSteps} actions on day ${state.day}`);
}
