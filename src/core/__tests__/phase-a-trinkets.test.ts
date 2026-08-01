import { describe, expect, it } from 'vitest';
import { SPELLS } from '../../content/spells';
import { makeArmy } from '../army';
import { createBattle } from '../combat/battle';
import {
  canCastPreBattleSpell, castPreBattleSpell,
} from '../combat/preBattleSpells';
import { runAttackPipeline } from '../combat/pipeline';
import { spellManaCost } from '../combat/spellModifiers';
import { createGame } from '../game';
import type {
  BattleContext, Hero,
} from '../types';

const context = (attacker: Hero, defender: Hero): BattleContext => ({
  kind: 'hero', targetId: defender.id,
  destination: { x: 4, y: 4 }, attackerHeroId: attacker.id,
  defenderHeroId: defender.id, defenderPlayerId: 'p2',
});

describe('Phase A migrated trinket effects', () => {
  it('reads Knucklebones and Drum from equipped Misc slots', () => {
    const game = createGame({ seed: 950, p1: 'human', p2: 'human' });
    const attacker = game.players.p1.hero!;
    const defender = game.players.p2.hero!;
    attacker.artifacts.equipment.misc1 = { id: 'knucklebonesOfTheSaint' };
    attacker.artifacts.equipment.misc2 = { id: 'drumOfTheDeepGrass' };
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
      attacker, defender, context(attacker, defender), 950,
    );
    expect(battle.attackerHero.luck).toBe(attacker.luck + 1);
    expect(battle.stacks[0].morale).toBeGreaterThanOrEqual(5);
  });

  it('charges Censer tax against the enemy first spell', () => {
    const game = createGame({ seed: 951, p1: 'human', p2: 'human' });
    const attacker = game.players.p1.hero!;
    const defender = game.players.p2.hero!;
    defender.artifacts.equipment.misc1 = { id: 'censerOfStillness' };
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
      attacker, defender, context(attacker, defender), 951,
    );
    expect(spellManaCost(battle, 'attacker', battle.attackerHero, 'rally'))
      .toBe(Number(SPELLS.rally.mana) + 3);
  });

  it('casts Pocket Sundial before the first normal stack action', () => {
    const game = createGame({ seed: 952, p1: 'human', p2: 'human' });
    const attacker = game.players.p1.hero!;
    const defender = game.players.p2.hero!;
    attacker.artifacts.equipment.misc1 = { id: 'pocketSundial' };
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
      attacker, defender, context(attacker, defender), 952,
    );
    expect(canCastPreBattleSpell(battle, 'attacker', 'rally')).toBe(true);
    castPreBattleSpell(battle, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0',
    });
    expect(battle.castRound.attacker).toBe(1);
    expect(battle.stacks[0].morale).toBeGreaterThanOrEqual(50);
  });

  it('spends Iron Nail when it cancels the first enemy attack ability', () => {
    const game = createGame({ seed: 953, p1: 'human', p2: 'human' });
    const attacker = game.players.p1.hero!;
    const defender = game.players.p2.hero!;
    defender.artifacts.equipment.misc1 = { id: 'ironNail' };
    const [battle] = createBattle(
      makeArmy([{ unitId: 'hobbyKnight', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 20 }]),
      attacker, defender, context(attacker, defender), 953,
    );
    battle.stacks[1].position = { x: 1, y: battle.stacks[0].position.y };
    runAttackPipeline(battle, battle.stacks[0].id, battle.stacks[1].id);
    expect(battle.defenderHero!.artifacts.equipment.misc1).toBeNull();
    expect(battle.ironNailSpent.defender).toBe(true);
  });
});
