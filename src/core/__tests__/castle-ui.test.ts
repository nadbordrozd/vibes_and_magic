import { describe, expect, it } from 'vitest';
import {
  BUILDINGS, DWELLINGS, buildingPresentation, validateBuildings,
} from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import { apply, createGame } from '../game';
import { build } from '../game/economy';
import {
  buildingStatus, castleBuildingSlots, visibleUpgradeStage,
} from '../selectors';
import type { BuildingId, FactionId } from '../types';

describe('castle building cards milestone', () => {
  it('starts every faction castle with a working gold Tavern card', () => {
    for (const faction of Object.keys(FACTIONS) as FactionId[]) {
      const state = createGame({
        seed: 2700, p1: 'human', p2: 'human', p1Faction: faction,
      });
      const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
      expect(castle.buildings).toContain('tavern');
      expect(buildingStatus(state, castle, 'tavern').state).toBe('built');
      const offer = state.players.p1.tavernOffers[0];
      const hired = apply(state, { type: 'HIRE_HERO', castleId: castle.id, heroId: offer });
      expect(hired.players.p1.heroes).toHaveLength(2);
    }
  });

  it('resolves each upgrade line into one stable advancing slot', () => {
    const state = createGame({ seed: 2701, p1: 'human', p2: 'human' });
    const castle = state.castles[0];
    state.players.p1.resources = { gold: 50_000, timber: 50, iron: 50, essence: 50 };
    expect(visibleUpgradeStage(castle, 'mageGuild1')).toBe('mageGuild1');
    expect(castleBuildingSlots(castle)).toContain('townHall');
    expect(castleBuildingSlots(castle)).not.toContain('villageHall');
    build(state, castle.id, 'mageGuild1');
    expect(visibleUpgradeStage(castle, 'mageGuild1')).toBe('mageGuild2');
    castle.builtOnDay = null;
    build(state, castle.id, 'mageGuild2');
    expect(visibleUpgradeStage(castle, 'mageGuild1')).toBe('mageGuild3');
    castle.builtOnDay = null;
    build(state, castle.id, 'mageGuild3');
    expect(visibleUpgradeStage(castle, 'mageGuild1')).toBe('mageGuild3');
    expect(buildingStatus(state, castle, 'mageGuild3').state).toBe('built');
  });

  it('computes gold, green, red, and grey states with distinct red reasons', () => {
    const state = createGame({ seed: 2702, p1: 'human', p2: 'human' });
    const castle = state.castles[0];
    state.players.p1.resources = { gold: 50_000, timber: 50, iron: 50, essence: 50 };
    expect(buildingStatus(state, castle, 'tavern')).toMatchObject({
      state: 'built', color: 'gold', reason: 'Built.',
    });
    expect(buildingStatus(state, castle, 'marketplace')).toMatchObject({
      state: 'available', color: 'green', reason: 'Available to build.',
    });
    expect(buildingStatus(state, castle, 'dwelling3')).toMatchObject({
      state: 'locked', color: 'red', reason: 'Requires The Butts.',
    });

    castle.bannedBuildings.push('marketplace');
    expect(buildingStatus(state, castle, 'marketplace')).toMatchObject({
      state: 'unavailable', color: 'grey', reason: 'Cannot be built in this castle.',
    });
    castle.bannedBuildings = [];
    state.players.p1.resources = { gold: 0, timber: 0, iron: 0, essence: 0 };
    expect(buildingStatus(state, castle, 'townHall')).toMatchObject({
      state: 'locked', reason: 'Not enough resources.',
    });
    state.players.p1.resources = { gold: 50_000, timber: 50, iron: 50, essence: 50 };
    castle.builtOnDay = state.day;
    expect(buildingStatus(state, castle, 'townHall')).toMatchObject({
      state: 'locked', reason: 'Already built today.',
    });
    expect(buildingStatus(state, castle, 'marketplace').state).toBe('locked');
  });

  it('registers all 36 named dwellings with flavor and generated recruit functions', () => {
    validateBuildings();
    expect(Object.values(DWELLINGS).flat()).toHaveLength(36);
    for (const [faction, dwellings] of Object.entries(DWELLINGS) as Array<
      [FactionId, typeof DWELLINGS[FactionId]]
    >) {
      for (const dwelling of dwellings) {
        const id = `dwelling${dwelling.tier}` as BuildingId;
        const definition = buildingPresentation(id, faction);
        expect(definition.name).not.toMatch(/Tier \d Dwelling/);
        expect(definition.flavor.trim()).not.toBe('');
        expect(definition.function).toMatch(/^Recruits: .+ · Growth: \d+\/week$/);
      }
    }
    expect(Object.values(BUILDINGS).some((building) => building.name === 'Treasury')).toBe(false);
  });
});
