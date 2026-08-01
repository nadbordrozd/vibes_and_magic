import { describe, expect, it } from 'vitest';
import { BARGAIN_IDS } from '../../content/bargains';
import { createGame } from '../game';
import { resolveDebtEvent } from '../debts';
import { chooseBargain, dealBargains } from '../game/bargains';
import { incomeForPlayer } from '../game/setup';
import type { BargainId, GameState } from '../types';

function offered(id: BargainId): GameState {
  const state = createGame({
    seed: 509, p1: 'human', p2: 'human', p1Faction: 'hagwood',
  });
  const hero = state.players.p1.hero!;
  hero.specialtyId = 'brightSour';
  state.pendingChoice = {
    kind: 'bargain', playerId: 'p1', heroId: hero.id,
    options: [id], source: 'post',
  };
  return state;
}

describe('phase C bargains and Debts', () => {
  it('defines and accepts all eight bargains', () => {
    expect(BARGAIN_IDS).toHaveLength(8);
    for (const id of BARGAIN_IDS) {
      const state = offered(id);
      const hero = state.players.p1.hero!;
      if (id === 'cuckoosDeal') {
        chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: id, castleId: 'p2-castle' });
      } else if (id === 'whatWasPromised') {
        chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: id, castleId: 'p1-castle' });
      } else {
        chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: id });
      }
      expect(hero.debts, id).toHaveLength(1);
      expect(state.pendingChoice, id).toBeNull();
    }
  });

  it('calls the First Harvest on schedule and suppresses tier-one growth', () => {
    const state = offered('firstHarvest');
    chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: 'firstHarvest' });
    expect(state.players.p1.resources.gold).toBeGreaterThanOrEqual(9_000);
    resolveDebtEvent(state, { kind: 'week-start', week: 4 });
    expect(state.castles[0].growthEffects).toContainEqual(expect.objectContaining({
      multiplier: 0, tier: 1,
    }));
  });

  it('makes Milk Teeth benefits and penalties concrete in the growth schedule', () => {
    const state = offered('milkTeeth');
    chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: 'milkTeeth' });
    expect(state.players.p1.adventureEffects.tierOneGrowth[0]).toEqual({
      multiplier: 2, startWeek: 2, endWeek: 3,
    });
    resolveDebtEvent(state, { kind: 'week-start', week: 4 });
    expect(state.players.p1.adventureEffects.tierOneGrowth[1].multiplier).toBe(0.5);
  });

  it('schedules the Third Child one-card follow-up draft', () => {
    const state = offered('thirdChild');
    const hero = state.players.p1.hero!;
    chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: 'thirdChild' });
    expect(hero.draftBonusCards).toBe(3);
    resolveDebtEvent(state, {
      kind: 'level-up', heroId: hero.id, level: hero.level + 2,
    });
    expect(hero.draftBonusCards).toBe(-2);
  });

  it('enforces the visible two-Debt cap', () => {
    const state = offered('firstHarvest');
    const hero = state.players.p1.hero!;
    chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: 'firstHarvest' });
    state.pendingChoice = {
      kind: 'bargain', playerId: 'p1', heroId: hero.id,
      options: ['longNap'], source: 'post',
    };
    chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: 'longNap' });
    dealBargains(state, hero, 2, 'post');
    expect(hero.debts).toHaveLength(2);
    expect(state.pendingChoice).toBeNull();
  });

  it('keeps a missed promised instalment visible until paid and suppresses the building', () => {
    const state = offered('whatWasPromised');
    const hero = state.players.p1.hero!;
    const castle = state.castles[0];
    chooseBargain(state, {
      type: 'CHOOSE_BARGAIN', bargainId: 'whatWasPromised', castleId: castle.id,
    });
    castle.buildings.push('townHall');
    state.players.p1.resources.essence = 0;
    resolveDebtEvent(state, { kind: 'week-start', week: 2 });
    expect(castle.dormantBuildings.townHall).toBe(true);
    expect(incomeForPlayer(state, 'p1').gold).toBe(500);
    expect(hero.debts[0]).toMatchObject({ remainingTriggers: 3 });
    state.players.p1.resources.essence = 3;
    resolveDebtEvent(state, { kind: 'week-start', week: 3 });
    expect(castle.dormantBuildings.townHall).toBe(false);
    expect(incomeForPlayer(state, 'p1').gold).toBe(1_000);
    expect(hero.debts[0]).toMatchObject({ remainingTriggers: 2 });
  });
});
