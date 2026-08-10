import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { applyBattleAction, legalBattleActions } from '../../core/combat/battle';
import { createBattle } from '../../core/combat/setup';
import { createGame } from '../../core/game';
import type { Action } from '../../core/types';
import type { AttackAction } from '../attackPrediction';
import { attackActionForActivation } from '../combatAttackInput';

describe('aimed attackable-hex activation', () => {
  it('dispatches and commits the selected legal melee approach', () => {
    const game = createGame({ seed: 6814, p1: 'human', p2: 'ai' });
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 20 }]),
      makeArmy([{ unitId: 'yeoman', count: 12 }]),
      game.players.p1.hero!, game.players.p2.hero!,
      {
        kind: 'hero', targetId: game.players.p2.hero!.id,
        destination: { x: 1, y: 1 }, attackerHeroId: game.players.p1.hero!.id,
        defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
      }, 6814, true, 'quiet', true,
    );
    battle.obstacles = [];
    battle.currentStackId = 'attacker-0';
    battle.order = ['attacker-0', 'defender-0'];
    const target = battle.stacks.find((stack) => stack.id === 'defender-0')!;
    target.position = { x: 5, y: 4 };
    const options = legalBattleActions(battle).filter((action): action is AttackAction =>
      (action.type === 'BATTLE_ATTACK' || action.type === 'BATTLE_MOVE_ATTACK')
      && action.targetId === target.id);
    const approaches = options.filter((action): action is Extract<Action, { type: 'BATTLE_MOVE_ATTACK' }> =>
      action.type === 'BATTLE_MOVE_ATTACK');
    expect(approaches.length).toBeGreaterThan(1);
    const selected = approaches.at(-1)!;
    const hoveredHex = { ...target.position };
    const dispatched = attackActionForActivation(target.id, hoveredHex, options, {
      targetId: target.id, hoveredHex, action: selected,
    });
    expect(dispatched).toEqual(selected);

    const next = applyBattleAction(battle, dispatched!);
    const committedActor = next.stacks.find((stack) => stack.id === 'attacker-0')!;
    const committedTarget = next.stacks.find((stack) => stack.id === target.id)!;
    expect(committedActor.position).toEqual(selected.destination);
    expect(committedActor.attacksMade).toBe(1);
    expect([committedTarget.count, committedTarget.topHp])
      .not.toEqual([target.count, target.topHp]);
    expect(next.log.at(-1)).toMatch(/Yeoman attack Yeoman: \d+ damage, \d+ fall/);
  });

  it('refuses a stale aimed action and falls back to the current legal option', () => {
    const current: AttackAction = { type: 'BATTLE_ATTACK', targetId: 'current' };
    expect(attackActionForActivation('current', { x: 3, y: 2 }, [current], {
      targetId: 'current', hoveredHex: { x: 3, y: 2 },
      action: { type: 'BATTLE_ATTACK', targetId: 'stale' },
    })).toEqual(current);
  });
});
