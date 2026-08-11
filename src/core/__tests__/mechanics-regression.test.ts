import { describe, expect, it } from 'vitest';
import { autoResolveBattle } from '../../ai/combat';
import { simulateGame } from '../../sim/run';
import { apply, createGame, incomeForPlayer } from '../game';
import {
  activeBattleStack, applyBattleAction, createBattle,
} from '../combat/battle';
import { cloneBattle } from '../combat/battleClone';
import { runAttackPipeline } from '../combat/pipeline';
import { castSpell } from '../combat/spells';
import { makeArmy } from '../army';
import type { Action } from '../types';
import { objectEntranceTile } from '../map/occupancy';

describe('mechanics regressions', () => {
  it('replays a game from only its seed and action list', () => {
    const options = { seed: 42, p1: 'human' as const, p2: 'human' as const };
    const actions: Action[] = [
      { type: 'BUILD', castleId: 'p1-castle', buildingId: 'townHall' },
      { type: 'RECRUIT', castleId: 'p1-castle', tier: 1, count: 2 },
      { type: 'MOVE_HERO', destination: { x: 3, y: 11 } },
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
    expect(state.omen).toBe('plenty');
    expect(state.castles[0].available[0]).toBe(38);
  });

  it('adds Town Hall income at turn start', () => {
    let state = createGame({ seed: 1, p1: 'human', p2: 'human' });
    state = apply(state, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'townHall',
    });
    expect(incomeForPlayer(state, 'p1').gold).toBe(1000);
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
    const initial = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const mine = initial.map.objects.find((object) => object.id === 'west-gold')!;
    const state = apply(
      initial,
      { type: 'MOVE_HERO', destination: objectEntranceTile(mine) },
    );
    expect(state.phase).toBe('combat');
    expect(state.battle?.context.targetId).toBe('west-gold-guardian');
  });

  it('claims a guarded mine after auto-combat victory', () => {
    let state = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const mineBefore = state.map.objects.find((object) => object.id === 'west-gold')!;
    state = apply(state, { type: 'MOVE_HERO', destination: objectEntranceTile(mineBefore) });
    state = apply(state, { type: 'AUTO_COMBAT' });
    expect(state.map.objects.find((object) => object.id === 'west-gold')?.kind === 'mine'
      && (state.map.objects.find((object) => object.id === 'west-gold') as any).owner).toBe(null);
    state = apply(state, { type: 'MOVE_HERO', destination: state.players.p1.hero!.position });
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

  it('advances when Reckoning destroys the current stack before its unit action', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const [battle] = createBattle(
      makeArmy([
        { unitId: 'yeoman', count: 1 },
        { unitId: 'longbowman', count: 10 },
      ]),
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      game.players.p1.hero!,
      null,
      {
        kind: 'guardian', targetId: 'test', destination: { x: 1, y: 1 },
        attackerHeroId: 'p1-hero',
      },
      82,
    );
    battle.currentStackId = 'attacker-0';
    battle.order = ['attacker-0', 'attacker-1', 'defender-0'];
    battle.attackerHero.knownSpells = ['reckoning'];
    battle.attackerHero.mana = 30;
    battle.stacks.find((stack) => stack.id === 'attacker-0')!.topHp = 1;

    const stale = cloneBattle(battle);
    castSpell(stale, { type: 'BATTLE_CAST', spellId: 'reckoning' });
    expect(activeBattleStack(stale)).toBeNull();
    expect(autoResolveBattle(stale).winner).not.toBeNull();

    const afterCast = applyBattleAction(
      battle, { type: 'BATTLE_CAST', spellId: 'reckoning' },
    );

    expect(afterCast.stacks.find((stack) => stack.id === 'attacker-0')!.count).toBe(0);
    expect(activeBattleStack(afterCast)?.id).toBe('attacker-1');
  });

  it('finishes a deterministic AI game within eight weeks', () => {
    const result = simulateGame(1, 56);
    expect(result.crashed).toBeUndefined();
    expect(result.winner).not.toBeNull();
    expect(result.days).toBeLessThanOrEqual(56);
  }, 90_000);
});
