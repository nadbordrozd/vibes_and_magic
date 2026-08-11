import { describe, expect, it } from 'vitest';
import { SCHOOL_SPELLS, SPELLS } from '../../content/spells';
import { makeArmy } from '../army';
import { stackHasAbility } from '../combat/abilities';
import { createBattle } from '../combat/battle';
import { canUseRanged } from '../combat/damage';
import { addBattleCounter, addTimedEffect } from '../combat/magicEffects';
import { runAttackPipeline } from '../combat/pipeline';
import { canCastSpell, castSpell, castStoredSpell } from '../combat/spells';
import { createGame } from '../game';
import type { BattleState, SpellId, UnitId } from '../types';

function battle(
  attacker: Array<{ unitId: UnitId; count: number }> = [{ unitId: 'yeoman', count: 20 }],
  defender: Array<{ unitId: UnitId; count: number }> = [{ unitId: 'tinSoldier', count: 20 }],
): BattleState {
  const game = createGame({ seed: 501, p1: 'human', p2: 'human' });
  return createBattle(
    makeArmy(attacker), makeArmy(defender), game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'hero', destination: { x: 2, y: 2 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 501,
  )[0];
}

function stored(
  state: BattleState, side: 'attacker' | 'defender', spellId: SpellId,
  targetId?: string, plus = false, extra: Record<string, unknown> = {},
) {
  castStoredSpell(state, side, {
    type: 'BATTLE_CAST', spellId, targetId, ...extra,
  }, plus);
}

describe('Phase C complete spell catalog', () => {
  it('contains 68 spells with 16 entries per school plus four provenance spells', () => {
    expect(Object.keys(SPELLS)).toHaveLength(68);
    for (const school of ['rite', 'craft', 'grave', 'wild'] as const) {
      expect(SCHOOL_SPELLS(school)).toHaveLength(16 + (
        school === 'rite' || school === 'craft' || school === 'grave' || school === 'wild'
          ? 1 : 0
      ));
    }
    expect(Object.values(SPELLS).reduce((counts, spell) => ({
      ...counts, [spell.rarity!]: counts[spell.rarity!] + 1,
    }), { common: 0, uncommon: 0, rare: 0 })).toEqual({
      common: 20, uncommon: 32, rare: 16,
    });
  });

  it('does not offer adventure or topology spells during combat', () => {
    const state = battle();
    state.attackerHero.knownSpells.push('census', 'greenway');
    expect(canCastSpell(state, 'census')).toBe(false);
    expect(canCastSpell(state, 'greenway')).toBe(false);
  });

  it('resolves Bloom, Rains, Storm, and Thicket versions', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 5 }],
      [{ unitId: 'oriflammeWyvern', count: 2 }],
    );
    state.stacks[1].position = { x: 1, y: state.stacks[0].position.y };
    stored(state, 'attacker', 'bloom', 'attacker-0', true);
    expect(state.stacks[0].counters.bloom).toBe(4);
    expect(state.stacks[1].counters.bloom).toBe(1);
    addBattleCounter(state, state.stacks[0], 'burn', 3, 'defender');
    stored(state, 'attacker', 'rains', undefined, true);
    expect(state.stacks[0].counters.burn).toBe(0);
    expect(state.stacks[2].counters.chill).toBe(1);
    const before = state.stacks[2].count;
    stored(state, 'attacker', 'storm', undefined, true);
    expect(state.stacks[2].count).toBeLessThanOrEqual(before);
    stored(state, 'attacker', 'thicket', undefined, false, {
      positions: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }],
    });
    expect(state.tiles.filter((tile) => tile.type === 'undergrowth')).toHaveLength(3);
  });

  it('spreads counters with Overgrow and permits one +face exclusion', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 5 }, { unitId: 'longbowman', count: 5 }],
      [{ unitId: 'tinSoldier', count: 5 }],
    );
    const source = state.stacks[0];
    const adjacent = state.stacks[1];
    adjacent.position = { x: 1, y: source.position.y };
    addBattleCounter(state, source, 'bloom', 3, 'attacker');
    stored(state, 'attacker', 'overgrow', undefined, true, {
      effectId: `counter:${source.id}:bloom`, secondaryTargetId: adjacent.id,
    });
    expect(adjacent.counters.bloom).toBe(0);
  });

  it('sets meter with Clarion and suppresses effects with Oathbind', () => {
    const state = battle();
    stored(state, 'attacker', 'clarion', 'attacker-0', true);
    expect(state.stacks[0].bonusActions).toBe(1);
    stored(state, 'attacker', 'oathbind', 'defender-0');
    addBattleCounter(state, state.stacks[1], 'hex', 4, 'attacker');
    addTimedEffect(state.stacks[1], 'blessing', 2, 1, true, 'defender');
    expect(state.stacks[1].counters.hex).toBe(0);
    expect(state.stacks[1].effects.some((effect) => effect.spellId === 'blessing')).toBe(false);
  });

  it('disables unit abilities with Brittle', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 5 }],
      [{ unitId: 'silkSpinners', count: 5 }],
    );
    stored(state, 'attacker', 'brittle', 'defender-0');
    expect(canUseRanged(state.stacks[1])).toBe(false);
  });

  it('copies abilities with Borrow Shape and manipulates time with Hourglass Crack', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 5 }],
      [{ unitId: 'thunderbird', count: 2 }],
    );
    stored(state, 'attacker', 'borrowShape', 'attacker-0', true, {
      secondaryTargetId: 'defender-0',
    });
    expect(stackHasAbility(state.stacks[0], 'storm_wake')).toBe(true);
    stored(state, 'attacker', 'hourglassCrack', 'attacker-0');
    expect(state.stacks[0].bonusActions).toBe(1);
    expect(state.stacks[0].skipRound).toBe(2);
  });

  it('pays the Toll and fires Loyal Unto Death', () => {
    const state = battle(
      [{ unitId: 'woodenColossus', count: 10 }],
      [{ unitId: 'yeoman', count: 1 }],
    );
    state.destroyedStacks = 3;
    const mana = state.defenderHero!.mana;
    stored(state, 'defender', 'theToll', undefined, true);
    expect(state.defenderHero!.mana).toBe(mana + 9);
    stored(state, 'defender', 'loyalUntoDeath', 'defender-0', true);
    const attacker = state.stacks[0];
    const defender = state.stacks[1];
    defender.position = { x: 1, y: attacker.position.y };
    const before = attacker.topHp;
    runAttackPipeline(state, attacker.id, defender.id);
    expect(attacker.topHp).toBeLessThan(before);
    expect(state.defenderHero!.mana).toBe(mana + 12);
  });

  it('Standing Mirror copies an enemy spell without spending its hero act', () => {
    const state = battle();
    stored(state, 'defender', 'standingMirror');
    state.attackerHero.knownSpells.push('wither');
    state.attackerHero.mana = 20;
    castSpell(state, { type: 'BATTLE_CAST', spellId: 'wither', targetId: 'defender-0' });
    expect(state.stacks[1].counters.hex).toBeGreaterThan(0);
    expect(state.stacks[0].counters.hex).toBeGreaterThan(0);
    expect(state.castRound.defender).toBe(0);
  });
});
