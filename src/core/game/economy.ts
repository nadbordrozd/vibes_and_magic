import { AI_BUILD_ORDER, BUILDINGS } from '../../content/buildings';
import { FACTION_UNITS, UNITS } from '../../content/units';
import {
  addUnits, canAfford, compactArmy, pay,
} from '../army';
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
    player.hero.moraleBonus += 5;
  }
  if (buildingId.startsWith('mageGuild') && player.hero
      && sameCoord(player.hero.position, castle.position)) {
    learnGuildSpells(player.hero, castle);
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
  const visiting = player.hero?.alive
    && sameCoord(player.hero.position, castle.position) ? player.hero : null;
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
  const hero = state.players[state.activePlayer].hero;
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

export function firstAffordableBuilding(
  state: GameState,
  castle: Castle,
): BuildingId | null {
  const player = state.players[castle.owner];
  return AI_BUILD_ORDER.find((id) => {
    const building = BUILDINGS[id];
    if ((id === 'chapelOfTheBanner' && castle.faction !== 'hearthguard')
        || (id === 'guildWorkshop' && castle.faction !== 'woundWrights')) return false;
    return !castle.buildings.includes(id)
      && castle.builtOnDay !== state.day
      && (!building.prerequisite || castle.buildings.includes(building.prerequisite))
      && canAfford(player.resources, building.cost);
  }) ?? null;
}
