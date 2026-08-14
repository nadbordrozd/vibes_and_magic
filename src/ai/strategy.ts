import { FACTIONS } from '../content/factions';
import {
  AI_SECOND_HERO_GOLD, AI_THIRD_HERO_GOLD, RANGED_PICKUP_MOVE_COST,
} from '../content/constants';
import { FACTION_UNITS, UNITS } from '../content/units';
import {
  AI_BUILD_ORDER, BUILDINGS, buildingBelongsToFaction, buildingPrerequisites,
} from '../content/buildings';
import { terrainId } from '../content/terrain';
import {
  MARKET_AI_MAX_SHORTFALL, MARKET_BUY_GOLD, MARKET_SELL_GOLD,
  MARKET_SURPLUS_RESERVE,
} from '../content/marketplace';
import { addUnits, armyPower, canAfford } from '../core/army';
import {
  apply, applyAutomaticChoice, firstAffordableBuilding,
} from '../core/game';
import { adventurePath } from '../core/game/exploration';
import { adventureMovementCost } from '../core/game/navigation';
import { heroHireCost } from '../core/game/tavern';
import { movementCost, pathCost, sameCoord } from '../core/map/pathfinding';
import type {
  Action, BuildingId, GameState, Hero,
} from '../core/types';
import { chooseStrategyObjective } from './strategyObjectives';
import { castleEntrance, castleFootprintTiles } from '../core/map/occupancy';
import { skillRank } from '../core/heroBehaviors';
import { SKILLS } from '../content/skills';
import { castleSupportsBuilding } from '../core/game/economy';
import { canCastAdventureSpell } from '../core/game/adventureSpells';

function p2AdventureCast(
  state: GameState, hero: Hero, used: Set<string>, onlyMovement = false,
): Action | null {
  const candidate = (spellId: Parameters<typeof canCastAdventureSpell>[1], fields: Partial<Action>) => {
    const key = `${hero.id}:${spellId}`;
    return !used.has(`${hero.id}:p2`) && !used.has(key) && canCastAdventureSpell(state, spellId)
      ? ({ type: 'CAST_ADVENTURE_SPELL', spellId, ...fields } as Action) : null;
  };
  const plus = (spellId: Parameters<typeof canCastAdventureSpell>[1]) =>
    hero.upgradedSpells.includes(spellId);
  if (hero.movement < hero.dailyMovementMaximum / 2) {
    const companion = state.players[hero.owner].heroes.find((other) => other.alive
      && other.id !== hero.id && Math.max(Math.abs(other.position.x - hero.position.x),
        Math.abs(other.position.y - hero.position.y)) <= 1);
    const action = candidate('processionOfLamps', plus('processionOfLamps')
      ? { secondaryHeroId: companion?.id } : {});
    if (action && (!plus('processionOfLamps') || companion)) return action;
  }
  if (onlyMovement) return null;
  const enemyMine = state.map.objects.find((object) => object.kind === 'mine' && object.owner
    && object.owner !== hero.owner
    && state.players[hero.owner].explored.includes(`${object.position.x},${object.position.y}`));
  const enemyHero = Object.values(state.players).filter((player) => player.id !== hero.owner)
    .flatMap((player) => player.heroes).filter((other) => other.alive)
    .sort((a, b) => armyPower(b.army) - armyPower(a.army) || a.id.localeCompare(b.id))[0];
  const enemyDistance = enemyHero ? Math.max(Math.abs(enemyHero.position.x - hero.position.x),
    Math.abs(enemyHero.position.y - hero.position.y)) : Number.POSITIVE_INFINITY;
  const nearbyPile = state.map.objects.some((object) => object.kind === 'pile'
    && Math.max(Math.abs(object.position.x - hero.position.x),
      Math.abs(object.position.y - hero.position.y)) <= 12);
  const nearbyGuardian = state.map.objects.some((object) => object.kind === 'guardian'
    && Math.max(Math.abs(object.position.x - hero.position.x),
      Math.abs(object.position.y - hero.position.y)) <= 10);
  return (enemyHero && enemyDistance <= 8
      && candidate('theDebtCalled', { targetHeroId: enemyHero.id }))
    || (enemyMine && candidate('stealAway', { targetId: enemyMine.id }))
    || (enemyDistance <= 12 && candidate('illWind', {}))
    || (nearbyPile && candidate('prospect', {}))
    || (nearbyGuardian && candidate('beastSense', {}))
    || (enemyHero && enemyDistance <= 6 && armyPower(enemyHero.army) > armyPower(hero.army)
      && candidate('falseColors', { displayedBand: 'great host' }))
    || null;
}

function recruitAtCastle(state: GameState, hero: Hero): GameState {
  const castle = state.castles.find((item) => item.owner === hero.owner
    && sameCoord(castleEntrance(item), hero.position));
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

function recruitAtFieldDwelling(state: GameState, hero: Hero): GameState {
  const dwelling = state.map.objects.find((object) => object.kind === 'dwelling'
    && object.available > 0 && sameCoord(object.position, hero.position));
  if (!dwelling || dwelling.kind !== 'dwelling') return state;
  const unit = UNITS[dwelling.unitId];
  const discount = unit.abilities.includes('beast') && skillRank(hero, 'beastmaster') >= 1
    ? 0.75 : 1;
  const cost = Object.fromEntries(Object.entries(unit.cost).map(([resource, amount]) =>
    [resource, Math.ceil((amount ?? 0) * discount)]));
  let count = dwelling.available;
  while (count > 0 && (!canAfford(state.players[hero.owner].resources, cost, count)
      || !addUnits(hero.army, dwelling.unitId, count))) count -= 1;
  return count > 0 ? apply(state, {
    type: 'RECRUIT_DWELLING', objectId: dwelling.id, count,
  }) : state;
}

function buildAtCastle(state: GameState): GameState {
  for (const castle of state.castles.filter((item) => item.owner === state.activePlayer)) {
    const prepared = useMarketplace(state, castle.id);
    const current = prepared.castles.find((candidate) => candidate.id === castle.id)!;
    if (current.owner === 'neutral') continue;
    const coastal = castleFootprintTiles(current).some((tile) =>
      prepared.map.terrain.some((row, y) => row.some((terrain, x) => terrainId(terrain) === 'water'
        && Math.max(Math.abs(x - tile.x), Math.abs(y - tile.y)) <= 3)));
    if (coastal && !current.buildings.includes('shipyard')
        && current.builtOnDay !== prepared.day
        && canAfford(prepared.players[current.owner].resources, BUILDINGS.shipyard.cost)) {
      return apply(prepared, { type: 'BUILD', castleId: current.id, buildingId: 'shipyard' });
    }
    if (current.buildings.includes('shipyard')
        && !prepared.map.objects.some((object) => object.kind === 'boat'
          && object.owner === current.owner)
        && canAfford(prepared.players[current.owner].resources, { gold: 1000, timber: 3 })) {
      return apply(prepared, { type: 'BUILD_BOAT', castleId: current.id });
    }
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
    if (!buildingBelongsToFaction(id, castle.faction)
        || !castleSupportsBuilding(state, castle, id)) return false;
    return buildingPrerequisites(id).every((required) => castle.buildings.includes(required));
  }) ?? null;
}

function useMarketplace(initial: GameState, castleId: string): GameState {
  let state = initial;
  for (let step = 0; step < 6; step += 1) {
    const castle = state.castles.find((candidate) => candidate.id === castleId)!;
    if (castle.owner === 'neutral') return state;
    const player = state.players[castle.owner];
    const visiting = player.heroes.some((hero) =>
      hero.alive && sameCoord(hero.position, castleEntrance(castle)));
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
  let delivered = false;
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
    delivered = true;
  }
  if (delivered) {
    const receiver = next.players[main.owner].heroes.find((hero) => hero.id === main.id);
    if (receiver) receiver.movement = 0;
  }
  return next;
}

export function runStrategyTurn(initial: GameState, maxSteps = 200): GameState {
  if (initial.players[initial.activePlayer].controller === 'dormant') {
    return apply(initial, { type: 'END_TURN' });
  }
  const playerId = initial.activePlayer;
  let state = initial;
  const claims = new Set<string>();
  const finished = new Set<string>();
  let economyDone = false;
  let deliveryDone = false;
  const adventureSpellsUsed = new Set<string>();
  for (let step = 0; step < maxSteps; step += 1) {
    if (state.phase === 'gameOver' || state.activePlayer !== playerId) return state;
    if (state.guildReveal) {
      state = apply(state, { type: 'DISMISS_GUILD_REVEAL' });
      continue;
    }
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
      // A Mage Guild 4/5 build exposes a serialized face-up reveal. Resolve that
      // explicit action before attempting another economy action in this turn.
      if (state.guildReveal) continue;
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
    state = recruitAtFieldDwelling(state, hero);
    if (hero.id !== main.id) state = deliverSurplus(state, hero, main);
    const current = state.players[playerId].heroes.find((candidate) => candidate.id === hero.id)!;
    const spellAction = current.movement < current.dailyMovementMaximum / 2
      ? p2AdventureCast(state, current, adventureSpellsUsed, true) : null;
    if (spellAction && spellAction.type === 'CAST_ADVENTURE_SPELL') {
      adventureSpellsUsed.add(`${current.id}:${spellAction.spellId}`);
      adventureSpellsUsed.add(`${current.id}:p2`);
      state = apply(state, spellAction);
      continue;
    }
    if (current.movement <= 0) {
      finished.add(current.id);
      continue;
    }
    const objective = chooseStrategyObjective(
      state, current, current.id === main.id ? 'main' : 'gatherer', claims,
    );
    if (!objective) {
      const fallbackSpell = p2AdventureCast(state, current, adventureSpellsUsed);
      if (fallbackSpell && fallbackSpell.type === 'CAST_ADVENTURE_SPELL') {
        adventureSpellsUsed.add(`${current.id}:${fallbackSpell.spellId}`);
        adventureSpellsUsed.add(`${current.id}:p2`);
        state = apply(state, fallbackSpell);
        continue;
      }
    }
    const pickup = objective && state.map.objects.find((object) => object.id === objective.id
      && ['pile', 'item', 'chest', 'flotsam', 'sealedCask', 'castaway',
        'messageBottle'].includes(object.kind));
    if (pickup) {
      const rank = skillRank(current, 'forager');
      const range = rank >= 3 ? SKILLS.forager.values.rank3Range
        : rank >= 2 ? SKILLS.forager.values.rank2Range : 1;
      const distance = Math.max(Math.abs(pickup.position.x - current.position.x),
        Math.abs(pickup.position.y - current.position.y));
      const route = adventurePath(state, objective.position, { avoidAggro: true });
      if (distance <= range && current.movement >= RANGED_PICKUP_MOVE_COST
          && route && pathCost(state.map, route, current, state.omen) > RANGED_PICKUP_MOVE_COST) {
        claims.add(objective.id);
        state = apply(state, { type: 'PICKUP_OBJECT', objectId: objective.id });
        continue;
      }
    }
    if (!objective || sameCoord(objective.position, current.position)) {
      finished.add(current.id);
      continue;
    }
    const safePath = adventurePath(state, objective.position, {
      avoidAggro: true, fightGuardianId: objective.guardianId,
    });
    const path = safePath ?? adventurePath(state, objective.position, {
      avoidAggro: false,
      fightGuardianId: objective.guardianId,
    });
    if (!path || path.length < 2
        || adventureMovementCost(state, current, path[0], path[1]) > current.movement) {
      finished.add(current.id);
      continue;
    }
    claims.add(objective.id);
    const move: Action = {
      type: 'MOVE_HERO', heroId: current.id, destination: objective.position,
      avoidAggro: Boolean(safePath),
    };
    state = apply(state, move);
    finished.add(current.id);
  }
  throw new Error(`Strategy AI exceeded ${maxSteps} actions on day ${state.day}`);
}
