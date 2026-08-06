import { describe, expect, it } from 'vitest';
import { AGGRO_ADJACENCY, RANGED_PICKUP_MOVE_COST } from '../../content/constants';
import { createBorderMarches } from '../../content/maps/borderMarches';
import { createCrosstitch, CROSSTITCH_CASTLE_POSITIONS } from '../../content/maps/crosstitch';
import { UNITS } from '../../content/units';
import { createGame } from '../game';
import { battleReachableHexes, legalBattleActions } from '../combat/battle';
import { createBattle } from '../combat/setup';
import { stackHexes, stacksAdjacent } from '../combat/footprint';
import { createBattleTile, placeBattleTile, runTileHooks } from '../combat/tiles';
import { moveHero, pickupObject } from '../game/exploration';
import { finalizeBattle } from '../game/outcomes';
import {
  castleEntrance, guardianAggroTiles, objectEntranceTile,
} from '../map/occupancy';
import { lintMap } from '../../tools/mapLint';
import type { MapObject } from '../types';

const options = { seed: 7, p1: 'human' as const, p2: 'ai' as const };

describe('milestone 24 occupancy', () => {
  it('authors separate guardians, building footprints, and clean maps', () => {
    expect(AGGRO_ADJACENCY).toBe(4);
    for (const [map, starts] of [
      [createBorderMarches(7), [{ x: 3, y: 10 }, { x: 24, y: 10 }]],
      [createCrosstitch(7), CROSSTITCH_CASTLE_POSITIONS],
    ] as const) {
      expect(lintMap(map, [...starts])).toEqual([]);
      expect(map.objects.some((object) => object.kind === 'guardian')).toBe(true);
      expect(map.objects.every((object) => !Object.prototype.propertyIsEnumerable.call(
        object, 'guard',
      ))).toBe(true);
      expect(map.objects.filter((object) => object.kind === 'mine').every((mine) =>
        mine.footprint?.w === 2 && mine.footprint.h === 1
        && mine.entrance?.dx === 0 && mine.entrance.dy === 0)).toBe(true);
    }
    const state = createGame(options);
    expect(state.castles.every((castle) => castle.footprint.w === 3
      && castle.footprint.h === 2 && castle.entrance.dx === 1
      && castle.entrance.dy === 1)).toBe(true);
    expect(state.players.p1.hero?.position).toEqual(castleEntrance(state.castles[0]));
  });

  it('map lint rejects overlaps and ineffective guardians', () => {
    const map = createBorderMarches(7);
    const pile = map.objects.find((object) => object.kind === 'pile')!;
    const mine = map.objects.find((object) => object.kind === 'mine')!;
    pile.position = { ...mine.position };
    const guardian = map.objects.find((object) => object.kind === 'guardian')!;
    if (guardian.kind !== 'guardian') throw new Error('guardian missing');
    guardian.position = { x: 0, y: 0 };
    const codes = lintMap(map, [{ x: 3, y: 10 }, { x: 24, y: 10 }])
      .map((issue) => issue.code);
    expect(codes).toContain('overlap');
    expect(codes).toContain('guard-efficacy');

    const missingGuard = createBorderMarches(7);
    const guarded = missingGuard.objects.find((object) => object.guardedBy?.length)!;
    missingGuard.objects = missingGuard.objects.filter((object) =>
      !guarded.guardedBy!.includes(object.id));
    expect(lintMap(missingGuard, [{ x: 3, y: 10 }, { x: 24, y: 10 }])
      .map((issue) => issue.code)).toContain('guard-target');
  });

  it('stops on guardian aggro, retains movement, and leaves the reward separate', () => {
    const state = createGame(options);
    const hero = state.players.p1.hero!;
    hero.movement = 10_000;
    const mine = state.map.objects.find((object) => object.id === 'west-gold')!;
    const guardian = state.map.objects.find((object) => object.kind === 'guardian'
      && object.protects === mine.id)!;
    if (guardian.kind !== 'guardian') throw new Error('guardian missing');
    const entrance = objectEntranceTile(mine);
    expect(guardianAggroTiles(guardian, state.map)).toContainEqual(entrance);
    moveHero(state, entrance);
    expect(state.phase).toBe('combat');
    expect(state.battle?.context.targetId).toBe(guardian.id);
    expect(hero.position).toEqual(entrance);
    expect(hero.movement).toBeGreaterThan(0);

    state.battle!.stacks.filter((stack) => stack.side === 'defender')
      .forEach((stack) => { stack.count = 0; stack.topHp = 0; });
    state.battle!.winner = 'attacker';
    finalizeBattle(state);
    expect(state.map.objects.some((object) => object.id === guardian.id)).toBe(false);
    expect(mine.kind === 'mine' && mine.owner).toBe(null);
    moveHero(state, entrance);
    expect(mine.kind === 'mine' && mine.owner).toBe(hero.owner);
  });

  it('completes deliberate guardian movement only after victory', () => {
    const state = createGame(options);
    const hero = state.players.p1.hero!;
    const guardian = state.map.objects.find((object) => object.kind === 'guardian')!;
    if (guardian.kind !== 'guardian') throw new Error('guardian missing');
    hero.position = guardianAggroTiles(guardian, state.map)[0];
    hero.movement = 1_000;
    const before = { ...hero.position };
    moveHero(state, guardian.position);
    expect(hero.position).toEqual(before);
    expect(state.battle?.context.completeMoveTo).toEqual(guardian.position);
    state.battle!.stacks.filter((stack) => stack.side === 'defender')
      .forEach((stack) => { stack.count = 0; });
    state.battle!.winner = 'attacker';
    finalizeBattle(state);
    expect(hero.position).toEqual(guardian.position);
  });

  it('picks up adjacent objects for 100 movement without moving', () => {
    const state = createGame(options);
    const hero = state.players.p1.hero!;
    const pile = state.map.objects.find((object): object is Extract<MapObject, { kind: 'pile' }> =>
      object.kind === 'pile')!;
    hero.position = { x: pile.position.x - 1, y: pile.position.y };
    hero.movement = 500;
    const before = { ...hero.position };
    const gold = state.players.p1.resources[pile.resource];
    pickupObject(state, pile.id);
    expect(hero.position).toEqual(before);
    expect(hero.movement).toBe(500 - RANGED_PICKUP_MOVE_COST);
    expect(state.players.p1.resources[pile.resource]).toBe(gold + pile.amount);
  });

  it('does not trigger aggro for ranged pickup from a safe adjacent tile', () => {
    const state = createGame(options);
    const hero = state.players.p1.hero!;
    state.map.objects = [
      { id: 'sloppy-pile', kind: 'pile', position: { x: 4, y: 4 },
        resource: 'gold', amount: 50, collected: false, guardedBy: ['sloppy-guard'] },
      { id: 'sloppy-guard', kind: 'guardian', position: { x: 5, y: 4 },
        army: [{ unitId: 'yeoman', count: 1 }], protects: 'sloppy-pile' },
    ];
    hero.position = { x: 3, y: 3 };
    hero.movement = 500;
    pickupObject(state, 'sloppy-pile');
    expect(state.phase).toBe('adventure');
    expect(state.map.objects.some((object) => object.id === 'sloppy-guard')).toBe(true);
  });

  it('resolves overlapping zones by lowest guardian id at equal path distance', () => {
    const state = createGame(options);
    const hero = state.players.p1.hero!;
    state.map.objects = [
      { id: 'z-guard', kind: 'guardian', position: { x: 5, y: 4 },
        army: [{ unitId: 'yeoman', count: 1 }] },
      { id: 'a-guard', kind: 'guardian', position: { x: 5, y: 6 },
        army: [{ unitId: 'yeoman', count: 1 }] },
    ];
    hero.position = { x: 4, y: 5 };
    hero.movement = 500;
    moveHero(state, { x: 5, y: 5 });
    expect(state.battle?.context.targetId).toBe('a-guard');
  });

  it('assigns the required wide footprints and deploys them without overlap', () => {
    const sizeTwo = [
      'oriflammeWyvern', 'reliquaryArk', 'woodenColossus', 'stuffedSentinel',
      'ferry', 'halfWokenQueen', 'walkingHut', 'aurochsHerd', 'thunderbird', 'siegeRam',
    ] as const;
    sizeTwo.forEach((id) => expect(UNITS[id].hexSize).toBe(2));
    expect(UNITS.sleeper.hexSize).toBe(3);
    const game = createGame(options);
    const [battle] = createBattle(
      [{ unitId: 'sleeper', count: 1 }, ...Array(6).fill(null)],
      [{ unitId: 'woodenColossus', count: 1 }, ...Array(6).fill(null)],
      game.players.p1.hero!, null,
      { kind: 'guardian', targetId: 'test', destination: { x: 1, y: 1 },
        attackerHeroId: game.players.p1.hero!.id }, 11,
    );
    const occupied = battle.stacks.flatMap((stack) => stackHexes(stack));
    expect(new Set(occupied.map((hex) => `${hex.x},${hex.y}`)).size).toBe(occupied.length);
    expect(occupied.every((hex) => hex.x >= 0 && hex.x < 13)).toBe(true);
    expect(battle.obstacles.every((obstacle) => !occupied.some((hex) =>
      hex.x === obstacle.x && hex.y === obstacle.y))).toBe(true);
  });

  it('uses every occupied hex for gaps, adjacency, attacks, and tiles', () => {
    const game = createGame(options);
    const [battle] = createBattle(
      [{ unitId: 'woodenColossus', count: 2 }, ...Array(6).fill(null)],
      [{ unitId: 'yeoman', count: 2 }, ...Array(6).fill(null)],
      game.players.p1.hero!, null,
      { kind: 'guardian', targetId: 'test', destination: { x: 1, y: 1 },
        attackerHeroId: game.players.p1.hero!.id }, 13,
    );
    const actor = battle.stacks.find((stack) => stack.side === 'attacker')!;
    const enemy = battle.stacks.find((stack) => stack.side === 'defender')!;
    actor.position = { x: 0, y: 4 };
    enemy.position = { x: 2, y: 4 };
    battle.currentStackId = actor.id;
    battle.order = [actor.id, enemy.id];
    battle.obstacles = [{ x: 2, y: 3 }];
    expect(stacksAdjacent(actor, enemy)).toBe(true);
    expect(legalBattleActions(battle)).toContainEqual({
      type: 'BATTLE_ATTACK', targetId: enemy.id,
    });
    expect(battleReachableHexes(battle, actor)).not.toContainEqual({ x: 1, y: 3 });

    placeBattleTile(battle, createBattleTile(battle, 'resin', { x: 1, y: 4 }, 2, 'defender'));
    runTileHooks(battle, 'on-turn-start', actor);
    expect(actor.counters.chill).toBe(1);
  });
});
