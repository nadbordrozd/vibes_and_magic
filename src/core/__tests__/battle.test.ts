import { describe, expect, it } from 'vitest';
import { chooseCombatAction } from '../../ai/combat';
import {
  applyBattleAction, armyAfterBattle, createBattle, legalBattleActions,
  splitGuardianArmy,
} from '../combat/battle';
import { RESOLUTION_STAGES } from '../combat/pipeline';
import { createGame } from '../game';
import { makeArmy } from '../army';

function battleFixture() {
  const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
  return createBattle(
    makeArmy([{ unitId: 'yeoman', count: 10 }]),
    makeArmy([{ unitId: 'longbowman', count: 10 }]),
    game.players.p1.hero!,
    game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'p2-hero', destination: { x: 5, y: 5 },
      attackerHeroId: 'p1-hero', defenderHeroId: 'p2-hero', defenderPlayerId: 'p2',
    },
    1,
  )[0];
}

describe('battle state machine', () => {
  it('uses the canonical nine pipeline stages', () => {
    expect(RESOLUTION_STAGES).toEqual([
      'declare', 'target-selection', 'ownership-resolution',
      'damage-computation', 'damage-routing', 'apply', 'death-triggers',
      'retaliation', 'turn-advance',
    ]);
  });

  it('splits guardians into up to five stacks', () => {
    const army = splitGuardianArmy([{ unitId: 'yeoman', count: 30 }]);
    expect(army.filter(Boolean)).toHaveLength(5);
    expect(army.filter(Boolean).map((stack) => stack!.count)).toEqual([6, 6, 6, 6, 6]);
  });

  it('places attacker and defender on deployment columns', () => {
    const battle = battleFixture();
    expect(battle.stacks.find((stack) => stack.side === 'attacker')!.position.x).toBe(0);
    expect(battle.stacks.find((stack) => stack.side === 'defender')!.position.x).toBe(12);
  });

  it('creates exactly eight obstacles off deployment columns', () => {
    const battle = battleFixture();
    expect(battle.obstacles).toHaveLength(8);
    expect(battle.obstacles.every((coord) => coord.x > 0 && coord.x < 12)).toBe(true);
  });

  it('orders stacks by speed', () => {
    const battle = battleFixture();
    expect(battle.currentStackId).toBe('attacker-0');
  });

  it('offers movement, wait, and defend actions', () => {
    const actions = legalBattleActions(battleFixture());
    expect(actions.some((action) => action.type === 'BATTLE_MOVE')).toBe(true);
    expect(actions.some((action) => action.type === 'BATTLE_WAIT')).toBe(true);
    expect(actions.some((action) => action.type === 'BATTLE_DEFEND')).toBe(true);
  });

  it('advances after defending', () => {
    const battle = applyBattleAction(battleFixture(), { type: 'BATTLE_DEFEND' });
    expect(battle.currentStackId).toBe('defender-0');
  });

  it('marks defense until the next round', () => {
    const battle = applyBattleAction(battleFixture(), { type: 'BATTLE_DEFEND' });
    expect(battle.stacks.find((stack) => stack.id === 'attacker-0')!.defended).toBe(true);
  });

  it('lets the combat AI select a legal action', () => {
    const battle = battleFixture();
    const chosen = chooseCombatAction(battle);
    expect(legalBattleActions(battle)).toContainEqual(chosen);
  });

  it('preserves surviving armies by slot', () => {
    const battle = battleFixture();
    expect(armyAfterBattle(battle, 'attacker')[0]).toEqual({
      unitId: 'yeoman', count: 10,
    });
  });

  it('rejects an illegal distant melee attack', () => {
    expect(() => applyBattleAction(
      battleFixture(),
      { type: 'BATTLE_ATTACK', targetId: 'defender-0' },
    )).toThrow('Illegal battle action');
  });

  it('ranged AI casts, then shoots while unengaged', () => {
    let battle = battleFixture();
    battle.currentStackId = 'defender-0';
    battle.order = ['defender-0', 'attacker-0'];
    expect(chooseCombatAction(battle)).toEqual({
      type: 'BATTLE_CAST', spellId: 'wither', targetId: 'attacker-0',
    });
    battle = applyBattleAction(battle, chooseCombatAction(battle));
    expect(chooseCombatAction(battle)).toEqual({
      type: 'BATTLE_ATTACK', targetId: 'attacker-0',
    });
  });
});
