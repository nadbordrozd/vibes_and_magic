import { afterEach, describe, expect, it } from 'vitest';
import { runStrategyTurn } from '../../ai/strategy';
import { ARTIFACTS } from '../../content/artifacts';
import {
  deriveHeroArmyCapacity, heroArmyCapacity, makeArmy, setQuartermasterRank,
  synchronizeHeroArmyCapacity,
} from '../army';
import { createBattle } from '../combat/battle';
import { apply, createGame } from '../game';
import { chooseDiplomacy } from '../game/exploration';
import { finalizeBattle } from '../game/outcomes';
import type { ArtifactDefinition } from '../../content/artifacts';
import type { GameState, Hero, UnitId } from '../types';

const originalMirrorMask: ArtifactDefinition = { ...ARTIFACTS.mirrorMask,
  effects: [...ARTIFACTS.mirrorMask.effects], values: { ...ARTIFACTS.mirrorMask.values } };

function enableLongTableSurrogate(amount = 1): void {
  ARTIFACTS.mirrorMask = {
    ...originalMirrorMask,
    name: 'The Long Table',
    description: '+1 army slot.',
    effects: [...originalMirrorMask.effects, 'army_slot_bonus'],
    values: { ...originalMirrorMask.values, amount },
  };
}

afterEach(() => {
  ARTIFACTS.mirrorMask = { ...originalMirrorMask,
    effects: [...originalMirrorMask.effects], values: { ...originalMirrorMask.values } };
});

const NINE_UNITS: UnitId[] = [
  'yeoman', 'longbowman', 'bannerman', 'lanceKnight', 'oriflammeWarden',
  'oriflammeWyvern', 'tinSoldier', 'hobbyKnight', 'marionette',
];

function fill(hero: Hero, count: 7 | 8 | 9): void {
  hero.army = makeArmy(NINE_UNITS.slice(0, count).map((unitId, index) => ({
    unitId, count: index + 2,
  })), heroArmyCapacity(hero));
}

function equipLongTable(state: GameState, hero: Hero): GameState {
  hero.artifacts.backpack.push({ id: 'mirrorMask' });
  return apply(state, {
    type: 'EQUIP_ARTIFACT', heroId: hero.id,
    backpackIndex: hero.artifacts.backpack.length - 1, equipmentSlot: 'misc1',
  });
}

function heroBattle(state: GameState) {
  const attacker = state.players.p1.hero!;
  const defender = state.players.p2.hero!;
  const [battle] = createBattle(attacker.army, defender.army, attacker, defender, {
    kind: 'hero', targetId: defender.id, destination: defender.position,
    attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: defender.owner,
  }, state.rng);
  state.phase = 'combat';
  state.battle = battle;
  return { attacker, defender, battle };
}

describe('derived per-hero army capacity', () => {
  it('derives exactly seven, eight, or nine and caps composed printed bonuses at nine', () => {
    expect(deriveHeroArmyCapacity()).toBe(7);
    expect(deriveHeroArmyCapacity({ quartermasterRank: 1 })).toBe(8);
    expect(deriveHeroArmyCapacity({ artifactSlotBonus: 1 })).toBe(8);
    expect(deriveHeroArmyCapacity({ quartermasterRank: 3, artifactSlotBonus: 1 })).toBe(9);
    expect(deriveHeroArmyCapacity({ quartermasterRank: 1, artifactSlotBonus: 99 })).toBe(9);
  });

  it('expands on Quartermaster acquisition and rejects skill shrink before mutation or loss', () => {
    const state = createGame({ seed: 1401, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    expect(heroArmyCapacity(hero)).toBe(7);
    setQuartermasterRank(hero, 1);
    expect(heroArmyCapacity(hero)).toBe(8);
    expect(hero.army).toHaveLength(8);
    hero.army[7] = { unitId: 'marionette', count: 3 };
    const before = JSON.stringify(hero.army);
    expect(() => setQuartermasterRank(hero, undefined)).toThrow('higher slots are occupied');
    expect(hero.skills.quartermaster).toBe(1);
    expect(JSON.stringify(hero.army)).toBe(before);
    hero.army[7] = null;
    setQuartermasterRank(hero, undefined);
    expect(hero.army).toHaveLength(7);
  });

  it('composes the Long Table effect with Quartermaster and safely preflights replacement/removal', () => {
    enableLongTableSurrogate();
    let state = createGame({ seed: 1402, p1: 'human', p2: 'human' });
    let hero = state.players.p1.hero!;
    state = equipLongTable(state, hero);
    hero = state.players.p1.hero!;
    expect(heroArmyCapacity(hero)).toBe(8);
    expect(hero.army).toHaveLength(8);
    setQuartermasterRank(hero, 1);
    expect(heroArmyCapacity(hero)).toBe(9);
    expect(hero.army).toHaveLength(9);
    hero.army[8] = { unitId: 'marionette', count: 4 };
    hero.artifacts.backpack.push({ id: 'quietHorseshoe' });
    const beforeReplacement = JSON.stringify(hero);
    expect(() => apply(state, {
      type: 'EQUIP_ARTIFACT', heroId: hero.id,
      backpackIndex: hero.artifacts.backpack.length - 1, equipmentSlot: 'misc1',
    })).toThrow('higher slots are occupied');
    expect(JSON.stringify(hero)).toBe(beforeReplacement);
    const before = JSON.stringify(hero);
    expect(() => apply(state, {
      type: 'UNEQUIP_ARTIFACT', heroId: hero.id, equipmentSlot: 'misc1',
    })).toThrow('higher slots are occupied');
    expect(JSON.stringify(hero)).toBe(before);
    hero.army[8] = null;
    const shrunk = apply(state, {
      type: 'UNEQUIP_ARTIFACT', heroId: hero.id, equipmentSlot: 'misc1',
    });
    expect(shrunk.players.p1.hero!.army).toHaveLength(8);
    expect(shrunk.players.p1.hero!.artifacts.backpack.at(-1)?.id).toBe('mirrorMask');
  });

  it('uses expanded slots for split, merge, transfer, garrison, and recruitment mutations', () => {
    let state = createGame({ seed: 1403, p1: 'human', p2: 'human' });
    let hero = state.players.p1.hero!;
    setQuartermasterRank(hero, 1);
    fill(hero, 7);
    state = apply(state, {
      type: 'SPLIT_ARMY', holder: { kind: 'hero', id: hero.id },
      sourceSlot: 0, destinationSlot: 7, count: 1,
    });
    hero = state.players.p1.hero!;
    expect(hero.army[7]).toEqual({ unitId: 'yeoman', count: 1 });

    const castle = state.castles.find((candidate) => candidate.owner === hero.owner)!;
    hero.position = { x: castle.position.x + castle.entrance.dx,
      y: castle.position.y + castle.entrance.dy };
    state = apply(state, {
      type: 'TRANSFER_ARMY', source: { kind: 'hero', id: hero.id }, sourceSlot: 7,
      destination: { kind: 'garrison', id: castle.id }, destinationSlot: 6, count: 1,
    });
    expect(state.castles.find((candidate) => candidate.id === castle.id)!.garrison[6])
      .toEqual({ unitId: 'yeoman', count: 1 });
    state = apply(state, {
      type: 'TRANSFER_ARMY', source: { kind: 'garrison', id: castle.id }, sourceSlot: 6,
      destination: { kind: 'hero', id: hero.id }, destinationSlot: 0, count: 1,
    });
    expect(state.players.p1.hero!.army[0]!.count).toBe(2);

    hero = state.players.p1.hero!;
    fill(hero, 7);
    const castleState = state.castles.find((candidate) => candidate.id === castle.id)!;
    hero.position = { x: castleState.position.x + castleState.entrance.dx,
      y: castleState.position.y + castleState.entrance.dy };
    // Switch the fixture city's recruitment catalog so tier two is a new company type.
    castleState.faction = 'woundWrights';
    const tier = 2 as const;
    castleState.buildings.push('dwelling2');
    castleState.available[1] = 2;
    state.players.p1.resources.gold = 100_000;
    state = apply(state, { type: 'RECRUIT', castleId: castle.id, tier, count: 1 });
    expect(state.players.p1.hero!.army.filter(Boolean)).toHaveLength(8);
    expect(state.players.p1.hero!.army[7]?.unitId).toBe('hobbyKnight');
  });

  it('preflights multi-company Diplomacy joining before spending or clearing the guardian', () => {
    const state = createGame({ seed: 1404, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    setQuartermasterRank(hero, 1);
    fill(hero, 7);
    const guardian = state.map.objects.find((object) => object.kind === 'guardian')!;
    if (guardian.kind !== 'guardian') throw new Error('guardian fixture missing');
    guardian.army = [{ unitId: 'hobbyKnight', count: 2 }];
    state.pendingChoice = {
      kind: 'diplomacy', playerId: hero.owner, heroId: hero.id, objectId: guardian.id,
      disbandCost: 10, recruitCost: 10, canStandAside: false,
    };
    const gold = state.players.p1.resources.gold;
    chooseDiplomacy(state, 'recruit');
    expect(hero.army.filter(Boolean)).toHaveLength(8);
    expect(state.players.p1.resources.gold).toBe(gold - 10);

    const overflow = createGame({ seed: 1405, p1: 'human', p2: 'human' });
    const full = overflow.players.p1.hero!;
    setQuartermasterRank(full, 1); fill(full, 8);
    const blocked = overflow.map.objects.find((object) => object.kind === 'guardian')!;
    if (blocked.kind !== 'guardian') throw new Error('guardian fixture missing');
    blocked.army = [{ unitId: 'marionette', count: 2 }];
    overflow.pendingChoice = {
      kind: 'diplomacy', playerId: full.owner, heroId: full.id, objectId: blocked.id,
      disbandCost: 10, recruitCost: 10, canStandAside: false,
    };
    const before = JSON.stringify(overflow);
    expect(() => chooseDiplomacy(overflow, 'recruit')).toThrow('fit or merge');
    expect(JSON.stringify(overflow)).toBe(before);
  });

  it('lets strategy AI deliver surplus into an eighth derived destination', () => {
    let state = createGame({ seed: 1410, p1: 'ai', p2: 'dormant' });
    state.players.p1.resources.gold = 10_000;
    const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
    castle.builtOnDay = state.day;
    castle.available = [0, 0, 0, 0, 0];
    state = apply(state, {
      type: 'HIRE_HERO', castleId: castle.id, heroId: state.players.p1.tavernOffers[0],
    });
    const [main, gatherer] = state.players.p1.heroes;
    main.position = { x: 8, y: 8 };
    gatherer.position = { x: 9, y: 8 };
    setQuartermasterRank(main, 1);
    fill(main, 7);
    gatherer.army = makeArmy([{ unitId: 'marionette', count: 12 }]);
    state.players.p1.resources.gold = 0;
    state = runStrategyTurn(state);
    const delivered = state.players.p1.heroes.find((hero) => hero.id === main.id)!;
    expect(delivered.army).toHaveLength(8);
    expect(delivered.army[7]).toEqual({ unitId: 'marionette', count: 4 });
  });

  it('round-trips all nine battle slots through casualties and attacker victory settlement', () => {
    enableLongTableSurrogate();
    let state = createGame({ seed: 1406, p1: 'human', p2: 'human' });
    let attacker = state.players.p1.hero!;
    setQuartermasterRank(attacker, 1);
    state = equipLongTable(state, attacker);
    attacker = state.players.p1.hero!;
    fill(attacker, 9);
    const { battle } = heroBattle(state);
    const ninth = battle.stacks.find((stack) => stack.side === 'attacker' && stack.slot === 8)!;
    expect(ninth.position.y).toBe(5);
    ninth.count -= 1;
    battle.casualties.attacker[ninth.unitId] = 1;
    battle.winner = 'attacker';
    finalizeBattle(state);
    expect(attacker.army).toHaveLength(9);
    expect(attacker.army[8]).toEqual({ unitId: ninth.unitId, count: ninth.count });
    expect(JSON.parse(JSON.stringify(attacker.army))).toEqual(attacker.army);
  });

  it('preserves 8/9 surrender and retreat shapes and prevents a Duelist trophy from shrinking survivors', () => {
    enableLongTableSurrogate();
    let state = createGame({ seed: 1407, p1: 'human', p2: 'human' });
    const attacker = state.players.p1.hero!;
    attacker.skills.duelist = 3;
    let defender = state.players.p2.hero!;
    setQuartermasterRank(defender, 1);
    defender.artifacts.equipment.misc1 = { id: 'mirrorMask' };
    synchronizeHeroArmyCapacity(defender);
    fill(defender, 9);
    defender.artifacts.backpack.push({ id: 'quietHorseshoe' });
    const { battle } = heroBattle(state);
    battle.withdrawal = { side: 'defender', kind: 'surrender', cost: 0 };
    battle.winner = 'attacker';
    finalizeBattle(state);
    expect(state.pendingChoice).toMatchObject({
      kind: 'duelistArtifact', options: ['quietHorseshoe'],
    });
    expect((state.pendingChoice?.kind === 'duelistArtifact'
      ? state.pendingChoice.options : [])).not.toContain('mirrorMask');
    state = apply(state, { type: 'CHOOSE_DUELIST_ARTIFACT', artifactId: 'quietHorseshoe' });
    const surrendered = state.players.p2.tavernPool.find((hero) => hero.id === defender.id)!;
    expect(surrendered.army).toHaveLength(9);
    expect(surrendered.army.filter(Boolean)).toHaveLength(9);
    expect(surrendered.artifacts.equipment.misc1?.id).toBe('mirrorMask');

    const retreat = createGame({ seed: 1408, p1: 'human', p2: 'human' });
    const retreating = retreat.players.p1.hero!;
    setQuartermasterRank(retreating, 1);
    fill(retreating, 8);
    const retreatBattle = heroBattle(retreat).battle;
    retreatBattle.withdrawal = { side: 'attacker', kind: 'retreat', cost: 0 };
    retreatBattle.winner = 'defender';
    finalizeBattle(retreat);
    const tavernHero = retreat.players.p1.tavernPool.find((hero) => hero.id === retreating.id)!;
    expect(tavernHero.army).toHaveLength(8);
    expect(tavernHero.army.every((slot) => slot === null)).toBe(true);
  });

  it('keeps ordinary seven-slot fixtures and JSON state round trips unchanged', () => {
    const state = createGame({ seed: 1409, p1: 'human', p2: 'human' });
    expect(state.players.p1.hero!.army).toHaveLength(7);
    expect(JSON.parse(JSON.stringify(state)).players.p1.hero.army).toHaveLength(7);
    synchronizeHeroArmyCapacity(state.players.p1.hero!);
    expect(state.players.p1.hero!.army).toHaveLength(7);
  });
});
