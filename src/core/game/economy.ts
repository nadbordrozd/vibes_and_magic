import { AI_BUILD_ORDER, BUILDINGS } from '../../content/buildings';
import { FACTION_UNITS, UNITS } from '../../content/units';
import {
  addUnits, canAfford, compactArmy, pay,
} from '../army';
import { findOwnedHero, selectedHero } from '../heroes';
import { sameCoord } from '../map/pathfinding';
import type {
  BuildingId, Castle, GameState, UnitTier,
} from '../types';
import { learnGuildSpells } from './magic';

export function build(
  state: GameState,
  castleId: string,
  buildingId: BuildingId,
): void {
  const castle = state.castles.find((item) => item.id === castleId);
  if (!castle || castle.owner !== state.activePlayer) throw new Error('Castle not owned');
  const definition = BUILDINGS[buildingId];
  if (!definition || ['townHall', 'dwelling1'].includes(buildingId)) {
    throw new Error('Building cannot be constructed');
  }
  if ((buildingId === 'chapelOfTheBanner' && castle.faction !== 'hearthguard')
      || (buildingId === 'guildWorkshop' && castle.faction !== 'woundWrights')) {
    throw new Error('Wrong faction building');
  }
  if (castle.buildings.includes(buildingId)) throw new Error('Already built');
  if (castle.builtOnDay === state.day) throw new Error('Already built today');
  if (definition.prerequisite && !castle.buildings.includes(definition.prerequisite)) {
    throw new Error('Missing prerequisite');
  }
  const player = state.players[state.activePlayer];
  if (!canAfford(player.resources, definition.cost)) throw new Error('Cannot afford');
  player.resources = pay(player.resources, definition.cost);
  castle.buildings.push(buildingId);
  if (buildingId === 'chapelOfTheBanner' && player.hero) {
    for (const hero of player.heroes) hero.moraleBonus += 5;
  }
  if (buildingId.startsWith('mageGuild')) {
    for (const hero of player.heroes.filter((candidate) =>
      sameCoord(candidate.position, castle.position))) {
      learnGuildSpells(hero, castle);
    }
  }
  castle.builtOnDay = state.day;
  state.lastMessage = `${definition.name} constructed.`;
}

export function recruit(
  state: GameState,
  castleId: string,
  tier: UnitTier,
  count: number,
): void {
  const castle = state.castles.find((item) => item.id === castleId);
  if (!castle || castle.owner !== state.activePlayer) throw new Error('Castle not owned');
  if (tier > 1 && !castle.buildings.includes(`dwelling${tier}` as BuildingId)) {
    throw new Error('Dwelling not built');
  }
  if (!Number.isInteger(count) || count <= 0 || castle.available[tier - 1] < count) {
    throw new Error('Invalid recruit count');
  }
  const unitId = FACTION_UNITS[castle.faction][tier - 1];
  const unit = UNITS[unitId];
  const player = state.players[state.activePlayer];
  if (!canAfford(player.resources, unit.cost, count)) throw new Error('Cannot afford');
  const selected = selectedHero(player);
  const visiting = selected?.alive && sameCoord(selected.position, castle.position)
    ? selected : null;
  const nextArmy = addUnits(visiting?.army ?? castle.garrison, unitId, count);
  if (!nextArmy) throw new Error('No army slot available');
  if (visiting) visiting.army = nextArmy;
  else castle.garrison = nextArmy;
  player.resources = pay(player.resources, unit.cost, count);
  castle.available[tier - 1] -= count;
  state.lastMessage = `${count} ${unit.name} recruited.`;
}

export function swapArmy(
  state: GameState,
  castleId: string,
  heroSlot: number,
  garrisonSlot: number,
): void {
  const castle = state.castles.find((item) => item.id === castleId);
  const hero = selectedHero(state.players[state.activePlayer]);
  if (!castle || castle.owner !== state.activePlayer || !hero
      || !sameCoord(hero.position, castle.position)) {
    throw new Error('Hero is not visiting this castle');
  }
  if (heroSlot < 0 || heroSlot >= 7 || garrisonSlot < 0 || garrisonSlot >= 7) {
    throw new Error('Invalid army slot');
  }
  const heroStack = hero.army[heroSlot];
  hero.army[heroSlot] = castle.garrison[garrisonSlot];
  castle.garrison[garrisonSlot] = heroStack;
  hero.army = compactArmy(hero.army);
  castle.garrison = compactArmy(castle.garrison);
  state.lastMessage = 'Army stacks transferred.';
}

function adjacent(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;
}

export function transferArmy(
  state: GameState,
  action: Extract<import('../types').Action, { type: 'TRANSFER_ARMY' }>,
): void {
  const playerId = state.activePlayer;
  const resolve = (holder: typeof action.source) => {
    if (holder.kind === 'hero') {
      const hero = findOwnedHero(state, playerId, holder.id);
      if (!hero) throw new Error('Hero not owned');
      return { army: hero.army, position: hero.position, hero };
    }
    const castle = state.castles.find((candidate) =>
      candidate.id === holder.id && candidate.owner === playerId);
    if (!castle) throw new Error('Garrison not owned');
    return { army: castle.garrison, position: castle.position, hero: null };
  };
  const source = resolve(action.source);
  const destination = resolve(action.destination);
  if (action.sourceSlot < 0 || action.sourceSlot >= 7
      || action.destinationSlot < 0 || action.destinationSlot >= 7
      || !Number.isInteger(action.count) || action.count <= 0) {
    throw new Error('Invalid transfer');
  }
  if (!adjacent(source.position, destination.position)) {
    throw new Error('Armies are not adjacent');
  }
  const sourceStack = source.army[action.sourceSlot];
  const destinationStack = destination.army[action.destinationSlot];
  if (!sourceStack || action.count > sourceStack.count) throw new Error('Invalid stack count');
  if (destinationStack && destinationStack.unitId !== sourceStack.unitId) {
    if (action.count !== sourceStack.count) throw new Error('Partial stacks cannot be swapped');
    source.army[action.sourceSlot] = destinationStack;
    destination.army[action.destinationSlot] = sourceStack;
  } else {
    destination.army[action.destinationSlot] = {
      unitId: sourceStack.unitId,
      count: (destinationStack?.count ?? 0) + action.count,
    };
    sourceStack.count -= action.count;
    if (sourceStack.count === 0) source.army[action.sourceSlot] = null;
  }
  state.lastMessage = 'Army stacks transferred.';
}

export function transferItem(
  state: GameState,
  action: Extract<import('../types').Action, { type: 'TRANSFER_ITEM' }>,
): void {
  const source = findOwnedHero(state, state.activePlayer, action.sourceHeroId);
  const destination = findOwnedHero(state, state.activePlayer, action.destinationHeroId);
  if (!source || !destination || !adjacent(source.position, destination.position)) {
    throw new Error('Heroes are not adjacent');
  }
  if (action.sourceSlot < 0 || action.sourceSlot >= source.inventory.length
      || action.destinationSlot < 0
      || action.destinationSlot >= destination.inventory.length) {
    throw new Error('Invalid item slot');
  }
  const item = source.inventory[action.sourceSlot];
  source.inventory[action.sourceSlot] = destination.inventory[action.destinationSlot];
  destination.inventory[action.destinationSlot] = item;
  state.lastMessage = 'Items exchanged.';
}

export function firstAffordableBuilding(
  state: GameState,
  castle: Castle,
): BuildingId | null {
  const player = state.players[castle.owner];
  return AI_BUILD_ORDER.find((id) => {
    const building = BUILDINGS[id];
    if ((id === 'chapelOfTheBanner' && castle.faction !== 'hearthguard')
        || (id === 'guildWorkshop' && castle.faction !== 'woundWrights')) return false;
    if (id === 'tavern' && !castle.buildings.includes('mageGuild1')) return false;
    return !castle.buildings.includes(id)
      && castle.builtOnDay !== state.day
      && (!building.prerequisite || castle.buildings.includes(building.prerequisite))
      && canAfford(player.resources, building.cost);
  }) ?? null;
}
