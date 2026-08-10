import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { createBattle, legalBattleActions } from '../../core/combat/battle';
import { createGame } from '../../core/game';
import type { Action } from '../../core/types';
import { predictAttack } from '../attackPrediction';

type AttackAction = Extract<Action, { type: 'BATTLE_ATTACK' | 'BATTLE_MOVE_ATTACK' }>;

function battle(attackerUnit: 'longbowman' | 'yeoman') {
  const game = createGame({ seed: 7731, p1: 'human', p2: 'ai' });
  game.players.p1.hero!.specialtyId = 'brightRally';
  const [state] = createBattle(
    makeArmy([{ unitId: attackerUnit, count: 12 }]),
    makeArmy([{ unitId: 'woodenColossus', count: 2 }]),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: game.players.p2.hero!.id,
      destination: { x: 1, y: 1 }, attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 7731, true, 'quiet', true,
  );
  state.obstacles = [];
  state.currentStackId = 'attacker-0';
  state.order = ['attacker-0', 'defender-0'];
  return state;
}

describe('visible attack prediction', () => {
  it('uses cloned core resolution and exposes ranged, adjacency, wall and retaliation facts', () => {
    const state = battle('longbowman');
    const actor = state.stacks[0];
    const target = state.stacks[1];
    target.position = { x: 1, y: actor.position.y };
    const action = legalBattleActions(state).find((candidate): candidate is AttackAction =>
      candidate.type === 'BATTLE_ATTACK' && candidate.targetId === target.id)!;
    const before = structuredClone(state);
    const prediction = predictAttack(state, action)!;
    expect(prediction.mode).toBe('Ranged');
    expect(prediction.adjacencyModifier).toContain('×0.5');
    expect(prediction.wallModifier).toContain('×0.7');
    expect(prediction.retaliation).toContain('no · ranged');
    expect(prediction.damageRange[0]).toBe(prediction.damageRange[1]);
    expect(prediction.casualtyRange[0]).toBe(prediction.casualtyRange[1]);
    expect(prediction.targetFootprint).toHaveLength(2);
    expect(state).toEqual(before);
  });

  it('identifies the long-range penalty independently of adjacency', () => {
    const state = battle('longbowman');
    const target = state.stacks[1];
    const action = legalBattleActions(state).find((candidate): candidate is AttackAction =>
      candidate.type === 'BATTLE_ATTACK' && candidate.targetId === target.id)!;
    const prediction = predictAttack(state, action)!;
    expect(prediction.rangeModifier).toContain('×0.5 ranged penalty');
    expect(prediction.adjacencyModifier).toContain('No adjacent-enemy penalty');
  });

  it('exposes the exact melee origin, direction, footprints and retaliation expectation', () => {
    const state = battle('yeoman');
    const target = state.stacks[1];
    target.position = { x: 3, y: 4 };
    const action = legalBattleActions(state).find((candidate): candidate is AttackAction =>
      candidate.type === 'BATTLE_MOVE_ATTACK' && candidate.targetId === target.id)!;
    expect(action.type).toBe('BATTLE_MOVE_ATTACK');
    if (action.type !== 'BATTLE_MOVE_ATTACK') throw new Error('Expected a move-and-attack action');
    const prediction = predictAttack(state, action)!;
    expect(prediction.mode).toBe('Melee');
    expect(prediction.origin).toEqual(action.destination);
    expect(prediction.direction).toContain('chosen melee origin');
    expect(prediction.originFootprint).toHaveLength(1);
    expect(prediction.targetFootprint).toHaveLength(2);
    expect(prediction.retaliation).toMatch(/Expected: (yes|no)/);
  });
});
