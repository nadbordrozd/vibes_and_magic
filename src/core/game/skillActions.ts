import { FACTION_UNITS, UNITS } from '../../content/units';
import { addUnits } from '../army';
import { canPlayerAfford, payPlayer } from '../artifacts';
import { skillRank } from '../heroBehaviors';
import { findOwnedHero } from '../heroes';
import type { GameState, UnitTier } from '../types';

export function refreshLogistics(state: GameState, heroId: string): void {
  if (state.phase !== 'adventure') throw new Error('Logistics refresh is adventure-only');
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  if (!hero || skillRank(hero, 'logistics') < 3) throw new Error('Logistics rank 3 is required');
  if (hero.skillUses.weekly.logistics === state.week) throw new Error('Movement was refreshed this week');
  hero.movement = hero.dailyMovementMaximum;
  hero.logisticsCarry = 0;
  hero.skillUses.weekly.logistics = state.week;
  state.lastMessage = `${hero.name}'s movement refreshes in full.`;
}

export function designateTactician(state: GameState, heroId: string, armySlot: number): void {
  if (state.phase !== 'adventure') throw new Error('Tactician designation is adventure-only');
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  if (!hero || skillRank(hero, 'tactician') < 2) throw new Error('Tactician rank 2 is required');
  if (!Number.isInteger(armySlot) || armySlot < 0 || armySlot >= hero.army.length
      || !hero.army[armySlot]) throw new Error('Choose an occupied army slot');
  hero.tacticianSlot = armySlot;
  state.lastMessage = `${hero.name} designates army slot ${armySlot + 1}.`;
}

export function remoteRecruit(
  state: GameState, heroId: string, castleId: string, tier: UnitTier, count: number,
): void {
  if (state.phase !== 'adventure') throw new Error('Remote recruitment is adventure-only');
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  const castle = state.castles.find((candidate) => candidate.id === castleId
    && candidate.owner === state.activePlayer);
  if (!hero || skillRank(hero, 'quartermaster') < 3 || !castle) {
    throw new Error('Quartermaster remote recruitment is unavailable');
  }
  if (hero.skillUses.weekly.quartermaster === state.week) {
    throw new Error('Remote recruitment was used this week');
  }
  if (!Number.isInteger(count) || count <= 0 || castle.available[tier - 1] < count) {
    throw new Error('Invalid recruit count');
  }
  const unitId = FACTION_UNITS[castle.faction][tier - 1];
  const unit = UNITS[unitId];
  const player = state.players[state.activePlayer];
  if (!canPlayerAfford(player, unit.cost, count)) throw new Error('Cannot afford');
  const army = addUnits(hero.army, unitId, count);
  if (!army) throw new Error('No army slot available');
  hero.army = army;
  payPlayer(player, unit.cost, count);
  castle.available[tier - 1] -= count;
  hero.skillUses.weekly.quartermaster = state.week;
  state.lastMessage = `${count} ${unit.name} recruited remotely.`;
}
