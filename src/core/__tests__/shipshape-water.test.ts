import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../game';
import { createBattle, legalBattleActions } from '../combat/battle';
import { destructionProportionality } from '../combat/pipeline';
import { growGuardians } from '../game/setup';
import { build, buildBoat } from '../game/economy';
import { adventurePath } from '../game/navigation';
import { actionSave, replaySave, stateHash } from '../../ui/persistence';
import { DIFFICULTY_MODIFIERS } from '../../content/constants';
import { UNITS } from '../../content/units';
import { checkVictory } from '../game/outcomes';
import type { BattleStack, BattleState } from '../types';
import { terrainIdAt } from '../../content/terrain';
import { revealForPlayer } from '../map/visibility';

describe('Ship-Shape and Water milestones', () => {
  it('applies global difficulty levers and records the setting', () => {
    const easy = createGame({ seed: 2601, p1: 'human', p2: 'ai', difficulty: 'easy' });
    const brutal = createGame({ seed: 2601, p1: 'human', p2: 'ai', difficulty: 'brutal' });
    expect(easy.difficulty).toBe('easy');
    expect(easy.players.p1.resources.timber).toBe(20);
    expect(brutal.players.p1.resources.timber).toBe(7);
    expect(DIFFICULTY_MODIFIERS.brutal.aiIncome).toBe(1.5);
    const easyGuard = easy.map.objects.find((object) => object.kind === 'guardian')!;
    const brutalGuard = brutal.map.objects.find((object) => object.kind === 'guardian')!;
    if (easyGuard.kind !== 'guardian' || brutalGuard.kind !== 'guardian') return;
    expect(brutalGuard.army[0].count).toBeGreaterThan(easyGuard.army[0].count);
  });

  it('splits only into an empty adventure army slot', () => {
    const state = createGame({ seed: 2602, p1: 'human', p2: 'ai' });
    const hero = state.players.p1.hero!;
    const source = hero.army[0]!;
    const next = apply(state, {
      type: 'SPLIT_ARMY', holder: { kind: 'hero', id: hero.id },
      sourceSlot: 0, destinationSlot: 6, count: 1,
    });
    expect(next.players.p1.hero!.army[0]!.count).toBe(source.count - 1);
    expect(next.players.p1.hero!.army[6]).toEqual({ unitId: source.unitId, count: 1 });
  });

  it('pins the destruction guard at exactly ten percent', () => {
    const destroyed = { id: 'small', side: 'attacker', unitId: 'yeoman', count: 0 } as BattleStack;
    const battle = {
      initialCounts: { small: 10, rest: 90 },
      stacks: [destroyed, { id: 'rest', side: 'attacker', unitId: 'yeoman', count: 90 }],
    } as unknown as BattleState;
    expect(destructionProportionality(battle, destroyed)).toBe(1);
    battle.initialCounts.small = 5;
    battle.initialCounts.rest = 95;
    expect(destructionProportionality(battle, destroyed)).toBeCloseTo(0.5);
  });

  it('grows guardians weekly to five times original and leaves static guards alone', () => {
    const state = createGame({ seed: 2603, p1: 'human', p2: 'ai' });
    const growing = state.map.objects.find((object) => object.kind === 'guardian' && !object.static)!;
    const fixed = state.map.objects.find((object) => object.kind === 'guardian' && object.static)!;
    if (growing.kind !== 'guardian' || fixed.kind !== 'guardian') return;
    const original = growing.originalArmy![0].count;
    const fixedCount = fixed.army[0].count;
    for (let week = 0; week < 100; week += 1) growGuardians(state);
    expect(growing.army[0].count).toBe(original * 5);
    expect(fixed.army[0].count).toBe(fixedCount);
  });

  it('replays a five-field save to the identical state hash', () => {
    const initial = createGame({ seed: 2604, p1: 'human', p2: 'ai', difficulty: 'hard' });
    const state = apply(initial, { type: 'END_TURN' });
    const save = actionSave(state);
    expect(Object.keys(save).sort()).toEqual([
      'actionLog', 'contentHash', 'difficulty', 'mapId', 'seed',
    ]);
    expect(stateHash(replaySave(save))).toBe(stateHash(state));
  });

  it('triggers assemble, slay, and consecutive-hold objectives', () => {
    const assembled = createGame({
      seed: 2610, mapId: 'crosstitch-kit', playerCount: 2, p1: 'human', p2: 'human',
    });
    assembled.players.p1.hero!.artifacts.backpack.push(
      { id: 'tailorsNeedle' }, { id: 'goldenThread' },
      { id: 'tailorsThimble' }, { id: 'patternbook' },
    );
    checkVictory(assembled);
    expect(assembled.winner).toBe('p1');

    const slain = createGame({ seed: 2611, p1: 'human', p2: 'human' });
    slain.map.victory = {
      type: 'slay', objectId: 'the-sleeper', flavor: 'Wake the hill.', mechanics: 'Slay it.',
    };
    slain.objectiveClaims['the-sleeper'] = 'p2';
    checkVictory(slain);
    expect(slain.winner).toBe('p2');

    const held = createGame({
      seed: 2612, mapId: 'torn-sound', p1: 'human', p2: 'human',
    });
    const lighthouse = held.map.objects.find((object) => object.kind === 'lighthouse')!;
    if (lighthouse.kind !== 'lighthouse') return;
    held.map.victory = {
      type: 'hold', objectId: lighthouse.id, days: 3,
      flavor: 'Keep the light.', mechanics: 'Hold it for three days.',
    };
    lighthouse.owner = 'p1';
    for (held.day = 1; held.day <= 3; held.day += 1) checkVictory(held);
    expect(held.winner).toBe('p1');
  });

  it('retreats without loot and surrenders with surviving troops retained', () => {
    const makeFight = () => {
      const state = createGame({ seed: 2605, p1: 'human', p2: 'human' });
      const attacker = state.players.p1.hero!;
      const defender = state.players.p2.hero!;
      const [battle] = createBattle(attacker.army, defender.army, attacker, defender, {
        kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2',
        battlefield: 'land',
      }, state.rng);
      battle.currentStackId = battle.stacks.find((stack) => stack.side === 'attacker')!.id;
      state.phase = 'combat'; state.battle = battle;
      return { state, attacker };
    };
    const retreat = makeFight();
    expect(legalBattleActions(retreat.state.battle!).some((action) =>
      action.type === 'BATTLE_RETREAT')).toBe(true);
    const retreated = apply(retreat.state, { type: 'BATTLE_RETREAT' });
    const retiredHero = retreated.players.p1.tavernPool.find((hero) =>
      hero.id === retreat.attacker.id)!;
    expect(retiredHero.army.every((stack) => stack === null)).toBe(true);

    const surrender = makeFight();
    surrender.state.players.p1.resources.gold = 100_000;
    const before = surrender.attacker.army.reduce((sum, stack) => sum + (stack?.count ?? 0), 0);
    const surrendered = apply(surrender.state, { type: 'BATTLE_SURRENDER' });
    const tavernHero = surrendered.players.p1.tavernPool.find((hero) =>
      hero.id === surrender.attacker.id)!;
    expect(tavernHero.tavernArmyRetained).toBe(true);
    expect(tavernHero.army.reduce((sum, stack) => sum + (stack?.count ?? 0), 0)).toBe(before);

    const castleState = createGame({ seed: 2607, p1: 'human', p2: 'human' });
    const castleAttacker = castleState.players.p1.hero!;
    const [castleBattle] = createBattle(
      castleAttacker.army, castleState.players.p2.hero!.army, castleAttacker, null,
      {
        kind: 'castle', targetId: castleState.castles[1].id,
        destination: castleState.castles[1].position,
        attackerHeroId: castleAttacker.id, defenderPlayerId: 'p2', battlefield: 'land',
      }, castleState.rng,
    );
    castleBattle.currentStackId = castleBattle.stacks.find((stack) =>
      stack.side === 'attacker')!.id;
    expect(legalBattleActions(castleBattle).some((action) =>
      action.type === 'BATTLE_RETREAT')).toBe(true);
    castleBattle.currentStackId = castleBattle.stacks.find((stack) =>
      stack.side === 'defender')!.id;
    expect(legalBattleActions(castleBattle).some((action) =>
      action.type === 'BATTLE_RETREAT')).toBe(false);
  });

  it('authors Torn Sound and launches a reusable boat from a coastal shipyard', () => {
    const state = createGame({
      seed: 2606, mapId: 'torn-sound', p1: 'human', p2: 'ai', difficulty: 'normal',
    });
    expect(state.map.width).toBe(32); expect(state.map.height).toBe(24);
    expect(state.map.objects.filter((object) => object.kind === 'whirlpool')).toHaveLength(2);
    const castle = state.castles[0];
    state.players.p1.resources = { gold: 20_000, timber: 20, iron: 20, essence: 20 };
    build(state, castle.id, 'shipyard');
    buildBoat(state, castle.id);
    const boat = state.map.objects.find((object) => object.kind === 'boat');
    expect(boat?.kind).toBe('boat');
    if (boat?.kind !== 'boat') return;
    expect(adventurePath(state, boat.position)?.at(-1)).toEqual(boat.position);
    let sailing = apply(state, { type: 'MOVE_HERO', destination: boat.position });
    expect(sailing.players.p1.hero!.embarkedBoatId).toBe(boat.id);
    const launched = sailing.map.objects.find((object) => object.id === boat.id)!;
    if (launched.kind !== 'boat') return;
    const nextSea = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({
      x: launched.position.x + dx, y: launched.position.y + dy,
    }))).find((position) => terrainIdAt(sailing.map, position) === 'water'
      && (position.x !== launched.position.x || position.y !== launched.position.y))!;
    sailing = apply(sailing, { type: 'MOVE_HERO', destination: nextSea });
    expect(sailing.players.p1.hero!.position).toEqual(nextSea);
    expect(sailing.map.objects.find((object) => object.id === boat.id)?.position).toEqual(nextSea);

    const entrance = sailing.map.objects.find((object) =>
      object.id === 'sound-whirlpool-nw')!;
    const exit = sailing.map.objects.find((object) =>
      object.id === 'sound-whirlpool-se')!;
    const sailor = sailing.players.p1.hero!;
    sailor.position = { ...entrance.position }; sailor.movement = 5000;
    const sailingBoat = sailing.map.objects.find((object) => object.id === boat.id)!;
    sailingBoat.position = { ...entrance.position };
    const weakestBefore = sailor.army.flatMap((stack) => stack ? [stack] : [])
      .sort((a, b) => a.count * UNITS[a.unitId].hp - b.count * UNITS[b.unitId].hp)[0].count;
    expect(adventurePath(sailing, exit.position)).toEqual([entrance.position, exit.position]);
    sailing.players.p1.explored = revealForPlayer([], sailing.map, sailor, []);
    const beforeWhirlpoolVision = new Set(sailing.players.p1.explored);
    sailing = apply(sailing, { type: 'MOVE_HERO', destination: exit.position });
    expect(sailing.players.p1.hero!.position).toEqual(exit.position);
    expect(sailing.players.p1.explored).toContain(`${exit.position.x},${exit.position.y}`);
    expect(sailing.players.p1.explored.some((key) => !beforeWhirlpoolVision.has(key))).toBe(true);
    const totalAfter = sailing.players.p1.hero!.army.reduce((sum, stack) =>
      sum + (stack?.count ?? 0), 0);
    const totalBefore = sailor.army.reduce((sum, stack) => sum + (stack?.count ?? 0), 0);
    expect(totalAfter).toBe(totalBefore - Math.max(1, Math.ceil(weakestBefore * 0.25)));
  });
});
