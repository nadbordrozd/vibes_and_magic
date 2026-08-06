import {
  AI_BUILD_ORDER, BUILDINGS, buildingBelongsToFaction, buildingPresentation,
} from '../../content/buildings';
import { BOAT_COST } from '../../content/constants';
import { FACTION_UNITS, UNITS } from '../../content/units';
import {
  addUnits, canAfford, compactArmy, pay,
} from '../army';
import { findOwnedHero, selectedHero } from '../heroes';
import { sameCoord } from '../map/pathfinding';
import { castleEntrance, castleFootprintTiles } from '../map/occupancy';
import type {
  BuildingId, Castle, GameState, UnitTier,
} from '../types';
import { skillRank } from '../heroBehaviors';
import { learnGuildSpells } from './magic';
import { buildingIsActive } from './buildingStatus';
import { terrainId } from '../../content/terrain';
import { CASTLE_NAMES } from '../../content/factionPresentation';

export function build(
  state: GameState,
  castleId: string,
  buildingId: BuildingId,
): void {
  const castle = state.castles.find((item) => item.id === castleId);
  if (!castle || castle.owner !== state.activePlayer) throw new Error('Castle not owned');
  const definition = BUILDINGS[buildingId];
  if (!definition || ['villageHall', 'dwelling1'].includes(buildingId)) {
    throw new Error('Building cannot be constructed');
  }
  if (!buildingBelongsToFaction(buildingId, castle.faction)) {
    throw new Error('Wrong faction building');
  }
  if (castle.buildings.includes(buildingId)) throw new Error('Already built');
  if (!castleSupportsBuilding(state, castle, buildingId)) {
    throw new Error('Building is unavailable in this castle');
  }
  if (castle.builtOnDay === state.day) throw new Error('Already built today');
  if (definition.prerequisite && !castle.buildings.includes(definition.prerequisite)) {
    throw new Error('Missing prerequisite');
  }
  if (buildingId === 'shipyard' && !coastalWater(state, castle, 3).length) {
    throw new Error('Shipyard requires a coastal castle');
  }
  const player = state.players[state.activePlayer];
  if (!canAfford(player.resources, definition.cost)) throw new Error('Cannot afford');
  player.resources = pay(player.resources, definition.cost);
  castle.buildings.push(buildingId);
  if (buildingId === 'chapelOfTheBanner' && buildingIsActive(castle, buildingId)
      && player.hero) {
    for (const hero of player.heroes) hero.moraleBonus += 5;
  }
  if (buildingId.startsWith('mageGuild') && buildingIsActive(castle, buildingId)) {
    for (const hero of player.heroes.filter((candidate) =>
      sameCoord(candidate.position, castleEntrance(castle)))) {
      learnGuildSpells(hero, castle);
    }
  }
  castle.builtOnDay = state.day;
  state.lastMessage = `${buildingPresentation(buildingId, castle.faction).name} constructed.`;
}

function coastalWater(state: GameState, castle: Castle, range: number) {
  const footprint = castleFootprintTiles(castle);
  return state.map.terrain.flatMap((row, y) => row.flatMap((terrain, x) =>
    terrainId(terrain) === 'water' && footprint.some((tile) =>
      Math.max(Math.abs(x - tile.x), Math.abs(y - tile.y)) <= range)
      ? [{ x, y }] : []));
}

export function castleSupportsBuilding(
  state: GameState, castle: Castle, buildingId: BuildingId,
): boolean {
  return !(castle.bannedBuildings ?? []).includes(buildingId)
    && (buildingId !== 'shipyard' || coastalWater(state, castle, 3).length > 0);
}

export function buildBoat(state: GameState, castleId: string): void {
  const castle = state.castles.find((candidate) => candidate.id === castleId
    && candidate.owner === state.activePlayer);
  if (!castle || !buildingIsActive(castle, 'shipyard')) throw new Error('Shipyard unavailable');
  const water = coastalWater(state, castle, 1).filter((position) =>
    !state.map.objects.some((object) => object.kind === 'boat'
      && sameCoord(object.position, position)))
    .sort((a, b) => a.y - b.y || a.x - b.x)[0];
  if (!water) throw new Error('No adjacent water tile for a boat');
  const player = state.players[state.activePlayer];
  if (!canAfford(player.resources, BOAT_COST)) throw new Error('Cannot afford boat');
  player.resources = pay(player.resources, BOAT_COST);
  state.map.objects.push({
    id: `boat-${state.day}-${state.activePlayer}-${state.map.objects.length}`,
    kind: 'boat', position: water, owner: state.activePlayer, occupiedBy: null,
  });
  state.lastMessage = `A boat is launched beside ${CASTLE_NAMES[castle.faction]}.`;
}

export function recruit(
  state: GameState,
  castleId: string,
  tier: UnitTier,
  count: number,
): void {
  const castle = state.castles.find((item) => item.id === castleId);
  if (!castle || castle.owner !== state.activePlayer) throw new Error('Castle not owned');
  if (tier > 1 && !buildingIsActive(castle, `dwelling${tier}` as BuildingId)) {
    throw new Error('Dwelling not built');
  }
  if (tier === 1 && !buildingIsActive(castle, 'dwelling1')) {
    throw new Error('Dwelling is dormant');
  }
  if (!Number.isInteger(count) || count <= 0 || castle.available[tier - 1] < count) {
    throw new Error('Invalid recruit count');
  }
  const unitId = FACTION_UNITS[castle.faction][tier - 1];
  const unit = UNITS[unitId];
  const player = state.players[state.activePlayer];
  if (!canAfford(player.resources, unit.cost, count)) throw new Error('Cannot afford');
  const selected = selectedHero(player);
  const visiting = selected?.alive && sameCoord(selected.position, castleEntrance(castle))
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
      || !sameCoord(hero.position, castleEntrance(castle))) {
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
      return { army: hero.army, position: hero.position, hero, castle: null };
    }
    const castle = state.castles.find((candidate) =>
      candidate.id === holder.id && candidate.owner === playerId);
    if (!castle) throw new Error('Garrison not owned');
    return { army: castle.garrison, position: castleEntrance(castle), hero: null, castle };
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
  if (destination.castle && source.hero && skillRank(source.hero, 'warden') >= 1) {
    destination.castle.wardenHeroId = source.hero.id;
  }
  state.lastMessage = 'Army stacks transferred.';
}

/** Split a company inside a hero army or castle garrison. Adventure-only by dispatch. */
export function splitArmy(
  state: GameState,
  action: Extract<import('../types').Action, { type: 'SPLIT_ARMY' }>,
): void {
  const holder = action.holder.kind === 'hero'
    ? findOwnedHero(state, state.activePlayer, action.holder.id)
    : state.castles.find((castle) => castle.id === action.holder.id
      && castle.owner === state.activePlayer);
  if (!holder) throw new Error('Army holder not owned');
  const army = 'army' in holder ? holder.army : holder.garrison;
  if (action.sourceSlot < 0 || action.sourceSlot >= 7
      || action.destinationSlot < 0 || action.destinationSlot >= 7
      || action.sourceSlot === action.destinationSlot
      || !Number.isInteger(action.count) || action.count <= 0) {
    throw new Error('Invalid split');
  }
  const source = army[action.sourceSlot];
  if (!source || source.count <= action.count || army[action.destinationSlot]) {
    throw new Error('Split requires a smaller count and an empty slot');
  }
  source.count -= action.count;
  army[action.destinationSlot] = { unitId: source.unitId, count: action.count };
  state.lastMessage = `${action.count} ${UNITS[source.unitId].name} split into a new company.`;
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
  if (castle.owner === 'neutral') return null;
  const player = state.players[castle.owner];
  return AI_BUILD_ORDER.find((id) => {
    const building = BUILDINGS[id];
    if (!buildingBelongsToFaction(id, castle.faction)) return false;
    return !castle.buildings.includes(id)
      && castleSupportsBuilding(state, castle, id)
      && castle.builtOnDay !== state.day
      && (!building.prerequisite || castle.buildings.includes(building.prerequisite))
      && canAfford(player.resources, building.cost);
  }) ?? null;
}
