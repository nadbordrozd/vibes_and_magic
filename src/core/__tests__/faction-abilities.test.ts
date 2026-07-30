import { describe, expect, it } from 'vitest';
import golden from './fixtures/faction-battle-golden.json';
import { autoResolveBattle } from '../../ai/combat';
import { attackAbilityMultiplier } from '../combat/abilities';
import {
  applyBattleAction, createBattle, legalBattleActions,
} from '../combat/battle';
import { runAttackPipeline } from '../combat/pipeline';
import { applyRoundMorale } from '../combat/round';
import { createGame } from '../game';
import { recoverSpareParts } from '../game/outcomes';
import { makeArmy } from '../army';
import type { BattleState, UnitId } from '../types';

function battle(
  attacker: Array<{ unitId: UnitId; count: number }>,
  defender: Array<{ unitId: UnitId; count: number }>,
  seed = 7,
): BattleState {
  const game = createGame({ seed, p1: 'human', p2: 'ai' });
  return createBattle(
    makeArmy(attacker), makeArmy(defender),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'p2-hero', destination: { x: 8, y: 8 },
      attackerHeroId: 'p1-hero', defenderHeroId: 'p2-hero',
      defenderPlayerId: 'p2',
    },
    seed,
  )[0];
}

describe('real faction ability hooks', () => {
  it('stacks hero, banner, and oriflamme round-start meter', () => {
    const state = battle([
      { unitId: 'yeoman', count: 10 },
      { unitId: 'bannerman', count: 1 },
      { unitId: 'oriflammeWarden', count: 1 },
    ], [{ unitId: 'tinSoldier', count: 1 }]);
    const [yeoman, banner, warden] = state.stacks.filter((stack) =>
      stack.side === 'attacker');
    yeoman.position = { x: 1, y: 4 };
    banner.position = { x: 1, y: 3 };
    warden.position = { x: 1, y: 5 };
    state.stacks.forEach((stack) => { stack.morale = 0; });
    applyRoundMorale(state);
    expect(yeoman.morale).toBe(20);
  });

  it('steadfast halves allied stack-destruction meter loss', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 10 }, { unitId: 'longbowman', count: 1 }],
      [{ unitId: 'woodenColossus', count: 1 }],
    );
    const survivor = state.stacks.find((stack) => stack.unitId === 'yeoman')!;
    const victim = state.stacks.find((stack) => stack.unitId === 'longbowman')!;
    const enemy = state.stacks.find((stack) => stack.side === 'defender')!;
    survivor.morale = 50;
    enemy.position = { x: 1, y: victim.position.y };
    runAttackPipeline(state, enemy.id, victim.id);
    expect(victim.count).toBe(0);
    expect(survivor.morale).toBe(35);
  });

  it('oriflamme prevents allied stack-destruction meter loss', () => {
    const state = battle(
      [
        { unitId: 'yeoman', count: 10 },
        { unitId: 'longbowman', count: 1 },
        { unitId: 'oriflammeWarden', count: 1 },
      ],
      [{ unitId: 'woodenColossus', count: 2 }],
    );
    const survivor = state.stacks.find((stack) => stack.unitId === 'yeoman')!;
    const victim = state.stacks.find((stack) => stack.unitId === 'longbowman')!;
    const enemy = state.stacks.find((stack) => stack.side === 'defender')!;
    survivor.morale = 50;
    enemy.position = { x: 1, y: victim.position.y };
    runAttackPipeline(state, enemy.id, victim.id);
    expect(victim.count).toBe(0);
    expect(survivor.morale).toBe(50);
  });

  it('soft_body pins the roll before charge multiplies it', () => {
    const state = battle(
      [{ unitId: 'lanceKnight', count: 1 }],
      [{ unitId: 'stuffedSentinel', count: 1 }],
    );
    const attacker = state.stacks[0];
    const defender = state.stacks[1];
    state.attackerHero.attack = 0;
    state.attackerHero.luck = 5;
    state.defenderHero = null;
    attacker.movedHexes = 10;
    defender.position = { x: 1, y: attacker.position.y };
    runAttackPipeline(state, attacker.id, defender.id);
    expect(defender.topHp).toBe(59);
  });

  it('springloaded applies only to the first attack', () => {
    const state = battle(
      [{ unitId: 'hobbyKnight', count: 1 }],
      [{ unitId: 'yeoman', count: 1 }],
    );
    const knight = state.stacks[0];
    expect(attackAbilityMultiplier(knight)).toBe(1.5);
    knight.attacksMade = 1;
    expect(attackAbilityMultiplier(knight)).toBe(1);
  });

  it('marionette melee attacks cannot be retaliated', () => {
    const state = battle(
      [{ unitId: 'marionette', count: 2 }],
      [{ unitId: 'yeoman', count: 10 }],
    );
    const attacker = state.stacks[0];
    const defender = state.stacks[1];
    defender.position = { x: 1, y: attacker.position.y };
    runAttackPipeline(state, attacker.id, defender.id);
    expect(defender.retaliated).toBe(false);
    expect(attacker.count).toBe(2);
  });

  it('overwind grants an action then skips the next round', () => {
    let state = battle(
      [{ unitId: 'woodenColossus', count: 1 }],
      [{ unitId: 'stuffedSentinel', count: 1 }],
    );
    expect(legalBattleActions(state)).toContainEqual({ type: 'BATTLE_OVERWIND' });
    state = applyBattleAction(state, { type: 'BATTLE_OVERWIND' });
    state = applyBattleAction(state, { type: 'BATTLE_DEFEND' });
    expect(state.currentStackId).toBe('attacker-0');
    state = applyBattleAction(state, { type: 'BATTLE_DEFEND' });
    state = applyBattleAction(state, { type: 'BATTLE_DEFEND' });
    expect(state.round).toBe(2);
    expect(state.currentStackId).toBe('defender-0');
    state = applyBattleAction(state, { type: 'BATTLE_DEFEND' });
    expect(state.round).toBe(3);
    expect(state.currentStackId).toBe('attacker-0');
  });

  it.each([[1, 0], [2, 0], [3, 0]])(
    'spare_parts rounds %i losses down to %i recovered',
    (losses, expected) => {
      const state = battle(
        [{ unitId: 'tinSoldier', count: 10 }],
        [{ unitId: 'yeoman', count: 1 }],
      );
      state.stacks[0].count = 10 - losses;
      const recovered = recoverSpareParts(state, 'attacker', 0.3);
      expect(recovered.tinSoldier ?? 0).toBe(expected);
    },
  );

  it('matches the scripted faction-pair golden battle', () => {
    const game = createGame({ seed: 4242, p1: 'human', p2: 'ai' });
    const state = createBattle(
      game.players.p1.hero!.army, game.players.p2.hero!.army,
      game.players.p1.hero!, game.players.p2.hero!,
      {
        kind: 'hero', targetId: 'p2-hero', destination: { x: 10, y: 10 },
        attackerHeroId: 'p1-hero', defenderHeroId: 'p2-hero',
        defenderPlayerId: 'p2',
      },
      4242,
    )[0];
    const result = autoResolveBattle(state);
    expect({
      winner: result.winner,
      round: result.round,
      casualties: result.casualties,
      survivors: result.stacks.filter((stack) => stack.count > 0).map((stack) => ({
        side: stack.side, slot: stack.slot, unitId: stack.unitId,
        count: stack.count, topHp: stack.topHp,
      })),
    }).toEqual(golden);
  });
});
