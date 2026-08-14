import { describe, expect, it } from 'vitest';
import { ARTIFACTS, validateArtifacts } from '../../content/artifacts';
import { OMENS } from '../../content/omens';
import { SKILLS, SKILL_IDS } from '../../content/skills';
import { makeArmy } from '../army';
import {
  addArtifact, dropAllArtifacts, equipArtifact, kitBonuses, unequipArtifact,
} from '../artifacts';
import { battleReachableHexes, createBattle } from '../combat/battle';
import {
  addBattleCounter, beginStackTurn,
} from '../combat/magicEffects';
import { applyRoundMorale } from '../combat/round';
import { isUpgraded } from '../combat/spells';
import {
  advanceBattleTiles, createBattleTile, placeBattleTile, runTileHooks,
} from '../combat/tiles';
import {
  debtCountdown, effectIsManipulable, resolveDebtEvent, scheduleDebt,
  tryManipulateDebt,
} from '../debts';
import { apply, createGame } from '../game';
import { commandMeter, foragerRate, logisticsRate } from '../heroBehaviors';
import { movementCost } from '../map/pathfinding';
import {
  burnApplicationBonus, growthWithOmen, rollOmen,
} from '../omens';
import { drawLevelOptions } from '../progression';
import type {
  BattleState, GameState, Hero, PlayerId, SecondarySkillId,
} from '../types';

function hero(state: GameState, player: PlayerId = 'p1'): Hero {
  return state.players[player].hero!;
}

function battle(seed = 1): BattleState {
  const game = createGame({ seed, p1: 'human', p2: 'human' });
  return createBattle(
    makeArmy([{ unitId: 'yeoman', count: 20 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }]),
    hero(game), hero(game, 'p2'),
    {
      kind: 'hero', targetId: hero(game, 'p2').id,
      destination: { x: 4, y: 4 }, attackerHeroId: hero(game).id,
      defenderHeroId: hero(game, 'p2').id, defenderPlayerId: 'p2',
    },
    seed,
  )[0];
}

describe('Phase A persistent battlefield tiles', () => {
  it('runs generic enter and turn-start hooks and expires finite tiles', () => {
    const state = battle(300);
    const stack = state.stacks[0];
    const tile = createBattleTile(
      state, 'test', stack.position, 1, 'defender',
    );
    placeBattleTile(state, tile);
    runTileHooks(state, 'on-enter', stack);
    expect(stack.morale).toBeGreaterThanOrEqual(7);
    runTileHooks(state, 'on-turn-start', stack);
    expect(stack.counters.burn).toBeGreaterThanOrEqual(1);
    state.round += 1;
    advanceBattleTiles(state);
    expect(state.tiles).toHaveLength(0);
  });

  it('uses wall tiles as the single pathing mechanism', () => {
    const state = battle(301);
    const wall = { x: 1, y: 4 };
    placeBattleTile(
      state, createBattleTile(state, 'wall', wall, -1, 'attacker', true),
    );
    expect(battleReachableHexes(state, state.stacks[0])).not.toContainEqual(wall);
    state.stacks[1].position = { x: 2, y: 4 };
    beginStackTurn(state, state.stacks[1]);
    expect(state.stacks[1].counters.burn).toBe(1);
  });
});

describe('Phase A artifacts and equipment', () => {
  it('contains the complete catalog and twelve serialized paper-doll slots', () => {
    expect(() => validateArtifacts()).not.toThrow();
    expect(Object.keys(ARTIFACTS)).toHaveLength(148);
    expect(Object.values(ARTIFACTS).filter((item) =>
      item.class === 'trinket' && item.slot === 'misc')).toHaveLength(6);
    expect(Object.keys(hero(createGame({
      seed: 302, p1: 'human', p2: 'human',
    })).artifacts.equipment)).toHaveLength(12);
  });

  it('equips and unequips only on the adventure layer', () => {
    const state = createGame({ seed: 303, p1: 'human', p2: 'human' });
    const owner = hero(state);
    addArtifact(owner, { id: 'mirrorMask' });
    equipArtifact(state, owner.id, 0, 'misc1');
    expect(owner.artifacts.equipment.misc1?.id).toBe('mirrorMask');
    state.phase = 'combat';
    expect(() => unequipArtifact(state, owner.id, 'misc1')).toThrow();
    state.phase = 'adventure';
    unequipArtifact(state, owner.id, 'misc1');
    expect(owner.artifacts.backpack[0].id).toBe('mirrorMask');
  });

  it('detects every Tailor Kit threshold', () => {
    const owner = hero(createGame({ seed: 304, p1: 'human', p2: 'human' }));
    owner.artifacts.equipment.weapon = { id: 'tailorsNeedle' };
    owner.artifacts.equipment.amulet = { id: 'goldenThread' };
    expect(kitBonuses(owner)).toMatchObject({
      pieces: 2, allStats: true, revealEssenceAndSeams: true,
    });
    owner.artifacts.equipment.ring1 = { id: 'tailorsThimble' };
    expect(kitBonuses(owner).allSpellsUpgraded).toBe(true);
    owner.artifacts.equipment.misc1 = { id: 'patternbook' };
    expect(kitBonuses(owner)).toMatchObject({
      allResonances: true, canUnstitch: true,
    });
  });

  it('drops all equipped and backpack artifacts to a victorious hero', () => {
    const state = createGame({ seed: 305, p1: 'human', p2: 'human' });
    const loser = hero(state, 'p2');
    const winner = hero(state);
    loser.artifacts.equipment.misc1 = { id: 'mirrorMask' };
    addArtifact(loser, { id: 'knucklebonesOfTheSaint' });
    expect(dropAllArtifacts(loser, winner)).toBe(2);
    expect(winner.artifacts.backpack.map((item) => item.id)).toEqual([
      'mirrorMask', 'knucklebonesOfTheSaint',
    ]);
    expect(loser.artifacts.backpack).toHaveLength(0);
  });
});

describe('Phase A three-rank skills', () => {
  it('defines three behavioral ranks for all thirty skills', () => {
    expect(SKILL_IDS).toHaveLength(30);
    for (const id of SKILL_IDS) {
      expect([SKILLS[id].ranks[1], SKILLS[id].ranks[2], SKILLS[id].ranks[3]]
        .every(Boolean)).toBe(true);
    }
  });

  it('applies every original skill rank-three numeric hook', () => {
    const state = createGame({ seed: 306, p1: 'human', p2: 'human' });
    const owner = [...state.players.p1.heroes, ...state.players.p1.tavernPool]
      .find((candidate) => candidate.definitionId === 'aldith')!;
    owner.skills.logistics = 3;
    owner.skills.forager = 3;
    owner.skills.command = 3;
    expect(logisticsRate(owner)).toBe(0.3);
    expect(foragerRate(owner)).toBe(1);
    expect(commandMeter(owner)).toBe(10);
    owner.skills.wayfaring = 3;
    state.map.terrain[1][1] = 'forest';
    expect(movementCost(
      state.map, { x: 0, y: 0 }, { x: 1, y: 1 }, owner,
    )).toBe(90);
    const berta = [...state.players.p1.heroes, ...state.players.p1.tavernPool]
      .find((candidate) => candidate.definitionId === 'berta')!;
    berta.skills.logistics = 3;
    expect(logisticsRate(berta)).toBe(0.45);
    const grigor = [...state.players.p2.heroes, ...state.players.p2.tavernPool]
      .find((candidate) => candidate.definitionId === 'grigor')!;
    grigor.skills.forager = 3;
    expect(foragerRate(grigor)).toBe(1.25);
  });

  it('never offers a seventh distinct skill and preserves held upgrades', () => {
    const state = createGame({ seed: 307, p1: 'human', p2: 'human' });
    const owner = hero(state);
    const held = SKILL_IDS.slice(0, 6);
    for (const id of held) owner.skills[id] = 1;
    const offers = Array.from({ length: 100 }, (_, seed) =>
      drawLevelOptions(owner, seed)[0]).flat();
    expect(offers.filter((entry): entry is SecondarySkillId =>
      SKILL_IDS.includes(entry as SecondarySkillId))
      .every((entry) => held.includes(entry))).toBe(true);
  });
});

describe('Phase A omens', () => {
  it('rolls deterministically with the documented weighted outcomes', () => {
    expect(rollOmen(1234)).toEqual(rollOmen(1234));
    expect(OMENS.quiet.weight).toBe(45);
    expect(Object.values(OMENS).reduce((sum, omen) => sum + omen.weight, 0))
      .toBe(100);
    const seen = new Set(Array.from({ length: 1000 }, (_, seed) => rollOmen(seed)[0]));
    expect(seen.size).toBe(7);
  });

  it('hooks growth, Burn, terrain, shots, and round meter', () => {
    expect(growthWithOmen(20, 'plenty')).toBe(25);
    expect(burnApplicationBonus('embers')).toBe(1);
    const state = createGame({ seed: 308, p1: 'human', p2: 'human' });
    state.map.terrain[0][1] = 'forest';
    expect(movementCost(
      state.map, { x: 0, y: 0 }, { x: 1, y: 0 }, hero(state), 'openRoad',
    )).toBe(100);
    const embers = battle(309);
    embers.omen = 'embers';
    addBattleCounter(embers, embers.stacks[1], 'burn', 2, 'attacker');
    expect(embers.stacks[1].counters.burn).toBe(3);
    const game = createGame({ seed: 309, p1: 'human', p2: 'human' });
    const still = createBattle(
      makeArmy([{ unitId: 'longbowman', count: 5 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 5 }]),
      hero(game), hero(game, 'p2'),
      {
        kind: 'hero', targetId: hero(game, 'p2').id,
        destination: { x: 3, y: 3 }, attackerHeroId: hero(game).id,
        defenderHeroId: hero(game, 'p2').id, defenderPlayerId: 'p2',
      },
      309, false, 'stillAir',
    )[0];
    expect(still.stacks[0].shots).toBe(16);
    const veil = battle(309);
    veil.omen = 'veil';
    expect(isUpgraded(veil, veil.attackerHero, 'wither')).toBe(true);
    const loud = battle(310);
    loud.omen = 'loudSky';
    loud.stacks.forEach((stack) => { stack.morale = 0; });
    applyRoundMorale(loud);
    expect(loud.stacks.every((stack) => stack.morale >= 5)).toBe(true);
  });

  it('announces each seeded week in the state log', () => {
    let state = createGame({ seed: 311, p1: 'human', p2: 'human' });
    const first = state.eventLog[0];
    for (let count = 0; count < 14; count += 1) {
      state = apply(state, { type: 'END_TURN' });
    }
    expect(state.week).toBe(2);
    expect(state.eventLog.length).toBeGreaterThan(1);
    expect(state.eventLog[0]).toBe(first);
  });
});

describe('Phase A Debt entries', () => {
  it('caps heroes at two visible scheduled entries', () => {
    const state = createGame({ seed: 312, p1: 'human', p2: 'human' });
    const owner = hero(state);
    for (const index of [1, 2]) scheduleDebt(owner, {
      id: `debt-${index}`, name: `Debt ${index}`, description: 'A bell rings.',
      trigger: { kind: 'day-start', dueDay: state.day + index },
      handlerTag: 'announce',
    });
    expect(owner.debts).toHaveLength(2);
    expect(debtCountdown(owner.debts[0], state)).toBe('1 day(s)');
    expect(() => scheduleDebt(owner, {
      id: 'debt-3', name: 'Debt 3', description: 'Too many.',
      trigger: { kind: 'day-start', dueDay: 9 }, handlerTag: 'announce',
    })).toThrow('at most 2');
  });

  it('triggers on schedule and is never effect-manipulable', () => {
    const state = createGame({ seed: 313, p1: 'human', p2: 'human' });
    const owner = hero(state);
    scheduleDebt(owner, {
      id: 'called', name: 'Called Debt', description: 'Pay what was promised.',
      trigger: { kind: 'week-start', dueWeek: 2 }, handlerTag: 'announce',
    });
    expect(resolveDebtEvent(state, { kind: 'week-start', week: 1 })).toEqual([]);
    expect(resolveDebtEvent(state, { kind: 'week-start', week: 2 })).toEqual(['called']);
    expect(owner.debts).toHaveLength(0);
    scheduleDebt(owner, {
      id: 'dawn', name: 'Dawn Debt', description: 'It comes tomorrow.',
      trigger: { kind: 'day-start', dueDay: 2 }, handlerTag: 'announce',
    });
    scheduleDebt(owner, {
      id: 'battle', name: 'Battle Debt', description: 'It comes after battle.',
      trigger: { kind: 'battle-complete', dueBattle: 1 }, handlerTag: 'announce',
    });
    for (const operation of ['sour', 'unmake', 'waxSeal'] as const) {
      expect(tryManipulateDebt(owner, 'battle', operation)).toBe(false);
    }
    expect(owner.debts.some((debt) => debt.id === 'battle')).toBe(true);
    expect(resolveDebtEvent(state, { kind: 'day-start', day: 2 })).toEqual(['dawn']);
    expect(resolveDebtEvent(state, {
      kind: 'battle-complete', battle: 1,
    })).toEqual(['battle']);
    expect(effectIsManipulable('debt')).toBe(false);
    expect(['counter', 'timed', 'enchantment'].every(effectIsManipulable)).toBe(true);
  });
});
