import { describe, expect, it } from 'vitest';
import { autoResolveBattle } from '../../ai/combat';
import { simulateGame } from '../../sim/run';
import { apply, createGame, incomeForPlayer } from '../game';
import { createBattle } from '../combat/battle';
import { runAttackPipeline } from '../combat/pipeline';
import { makeArmy } from '../army';
import type { Action } from '../types';

describe('mechanics regressions', () => {
  it('replays a game from only its seed and action list', () => {
    const options = { seed: 42, p1: 'human' as const, p2: 'human' as const };
    const actions: Action[] = [
      { type: 'BUILD', castleId: 'p1-castle', buildingId: 'treasury' },
      { type: 'RECRUIT', castleId: 'p1-castle', tier: 1, count: 2 },
      { type: 'MOVE_HERO', destination: { x: 4, y: 10 } },
      { type: 'END_TURN' },
    ];
    const first = actions.reduce(apply, createGame(options));
    const replayed = first.replay.reduce(apply, createGame(options));
    expect(replayed).toEqual(first);
  });

  it('replenishes built dwellings at the start of a week', () => {
    let state = createGame({ seed: 1, p1: 'human', p2: 'human' });
    for (let turn = 0; turn < 14; turn += 1) state = apply(state, { type: 'END_TURN' });
    expect(state.day).toBe(8);
    expect(state.castles[0].available[0]).toBe(34);
  });

  it('adds treasury income at turn start', () => {
    let state = createGame({ seed: 1, p1: 'human', p2: 'human' });
    state = apply(state, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'treasury',
    });
    expect(incomeForPlayer(state, 'p1').gold).toBe(1500);
    state = apply(state, { type: 'END_TURN' });
    state = apply(state, { type: 'END_TURN' });
    expect(state.players.p1.resources.gold).toBe(5000);
  });

  it('regenerates one mana per day in the field', () => {
    let state = createGame({ seed: 1, p1: 'human', p2: 'human' });
    state.players.p1.hero!.position = { x: 4, y: 10 };
    state.players.p1.hero!.mana = 0;
    state = apply(state, { type: 'END_TURN' });
    state = apply(state, { type: 'END_TURN' });
    expect(state.players.p1.hero!.mana).toBe(1);
  });

  it('restores mana fully in a friendly castle', () => {
    let state = createGame({ seed: 1, p1: 'human', p2: 'human' });
    state.players.p1.hero!.mana = 0;
    state = apply(state, { type: 'END_TURN' });
    state = apply(state, { type: 'END_TURN' });
    expect(state.players.p1.hero!.mana).toBe(10);
  });

  it('transfers an army stack into a castle garrison', () => {
    const state = apply(
      createGame({ seed: 1, p1: 'human', p2: 'human' }),
      { type: 'SWAP_ARMY', castleId: 'p1-castle', heroSlot: 0, garrisonSlot: 0 },
    );
    expect(state.castles[0].garrison[0]).toEqual({ unitId: 'yeoman', count: 25 });
    expect(state.players.p1.hero!.army[0]).toEqual({ unitId: 'longbowman', count: 6 });
  });

  it('starts combat on entering a guarded mine', () => {
    const state = apply(
      createGame({ seed: 1, p1: 'human', p2: 'human' }),
      { type: 'MOVE_HERO', destination: { x: 7, y: 10 } },
    );
    expect(state.phase).toBe('combat');
    expect(state.battle?.context.targetId).toBe('west-gold');
  });

  it('claims a guarded mine after auto-combat victory', () => {
    let state = createGame({ seed: 1, p1: 'human', p2: 'human' });
    state = apply(state, { type: 'MOVE_HERO', destination: { x: 7, y: 10 } });
    state = apply(state, { type: 'AUTO_COMBAT' });
    const mine = state.map.objects.find((object) => object.id === 'west-gold');
    expect(mine?.kind === 'mine' && mine.owner).toBe('p1');
  });

  it('fills allied morale when a stack is destroyed', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const [battle] = createBattle(
      makeArmy([
        { unitId: 'lanceKnight', count: 1 },
        { unitId: 'yeoman', count: 1 },
      ]),
      makeArmy([{ unitId: 'yeoman', count: 1 }]),
      game.players.p1.hero!,
      null,
      {
        kind: 'guardian', targetId: 'test', destination: { x: 1, y: 1 },
        attackerHeroId: 'p1-hero',
      },
      1,
    );
    const drake = battle.stacks.find((stack) => stack.unitId === 'lanceKnight')!;
    const defender = battle.stacks.find((stack) => stack.side === 'defender')!;
    defender.position = { x: 1, y: drake.position.y };
    runAttackPipeline(battle, drake.id, defender.id);
    expect(drake.morale).toBe(30);
    expect(battle.stacks.find((stack) => stack.unitId === 'yeoman'
      && stack.side === 'attacker')!.morale).toBe(15);
  });

  it('applies a hero morale bonus at round start', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'human' });
    game.players.p1.hero!.moraleBonus = 8;
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 2 }]),
      makeArmy([{ unitId: 'longbowman', count: 2 }]),
      game.players.p1.hero!,
      game.players.p2.hero!,
      {
        kind: 'hero', targetId: 'p2-hero', destination: { x: 2, y: 2 },
        attackerHeroId: 'p1-hero',
      },
      1,
    );
    expect(battle.stacks.find((stack) => stack.side === 'attacker')!.morale).toBe(8);
  });

  it('grants an immediate bonus action at one hundred morale', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const [battle] = createBattle(
      makeArmy([{ unitId: 'lanceKnight', count: 1 }]),
      makeArmy([{ unitId: 'yeoman', count: 1 }]),
      game.players.p1.hero!,
      null,
      {
        kind: 'guardian', targetId: 'test', destination: { x: 1, y: 1 },
        attackerHeroId: 'p1-hero',
      },
      1,
    );
    const drake = battle.stacks.find((stack) => stack.side === 'attacker')!;
    const defender = battle.stacks.find((stack) => stack.side === 'defender')!;
    drake.morale = 90;
    defender.position = { x: 1, y: drake.position.y };
    runAttackPipeline(battle, drake.id, defender.id);
    expect(drake.morale).toBe(15);
    expect(drake.bonusActions).toBe(1);
  });

  it('uses deterministic obstacle generation for the same battle seed', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const args = [
      makeArmy([{ unitId: 'yeoman', count: 2 }]),
      makeArmy([{ unitId: 'longbowman', count: 2 }]),
      game.players.p1.hero!,
      game.players.p2.hero!,
      {
        kind: 'hero' as const, targetId: 'p2-hero', destination: { x: 2, y: 2 },
        attackerHeroId: 'p1-hero',
      },
      99,
    ] as const;
    expect(createBattle(...args)[0].obstacles).toEqual(createBattle(...args)[0].obstacles);
  });

  it('auto-resolves battles without ambient randomness', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const [battle] = createBattle(
      game.players.p1.hero!.army,
      game.players.p2.hero!.army,
      game.players.p1.hero!,
      game.players.p2.hero!,
      {
        kind: 'hero', targetId: 'p2-hero', destination: { x: 2, y: 2 },
        attackerHeroId: 'p1-hero',
      },
      7,
    );
    expect(autoResolveBattle(battle).winner).not.toBeNull();
  });

  it('finishes a deterministic AI game within eight weeks', () => {
    const result = simulateGame(1, 56);
    expect(result.crashed).toBeUndefined();
    expect(result.winner).not.toBeNull();
    expect(result.days).toBeLessThanOrEqual(56);
  });
});
