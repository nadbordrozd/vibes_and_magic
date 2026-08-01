import { describe, expect, it } from 'vitest';
import { SKILL_IDS } from '../../content/skills';
import { makeArmy } from '../army';
import { createBattle } from '../combat/setup';
import { applyRoundMorale } from '../combat/round';
import {
  apply, createGame,
} from '../game';
import {
  diplomacyTerms,
} from '../game/exploration';
import { visitShrine } from '../game/magic';
import { finalizeBattle } from '../game/outcomes';
import {
  foragerRate, logisticsRate,
} from '../heroBehaviors';
import { movementCost } from '../map/pathfinding';
import {
  guardianIntel, guardianSizeBand,
} from '../selectors';
import { drawLevelOptions } from '../progression';
import type {
  GameState, Hero, MapObject, PlayerId,
} from '../types';

function selected(state: GameState, player: PlayerId = 'p1'): Hero {
  return state.players[player].hero!;
}

function guardedObject(state: GameState) {
  const object = state.map.objects.find((candidate) => candidate.kind === 'guardian'
    && state.map.objects.some((target) => target.kind === 'chest'
      && candidate.protects === target.id))!;
  if (object.kind !== 'guardian') throw new Error('guard missing');
  return object;
}

describe('secondary skill ranks', () => {
  it('Logistics grants 10% and 20% daily movement', () => {
    const hero = selected(createGame({ seed: 30, p1: 'human', p2: 'human' }));
    hero.specialtyId = 'steadyAim';
    hero.skills.logistics = 1;
    expect(logisticsRate(hero)).toBe(0.1);
    hero.skills.logistics = 2;
    expect(logisticsRate(hero)).toBe(0.2);
  });

  it('Scouting shows bands normally, exact guardian details at rank one, and +2 reveal at rank two', () => {
    let game = createGame({ seed: 31, p1: 'human', p2: 'human' });
    const hero = selected(game);
    const object = guardedObject(game);
    object.position = { x: hero.position.x + 3, y: hero.position.y };
    object.army = [{ unitId: 'bannerman', count: 18 }];
    expect(guardianIntel(game, object, hero)).toMatchObject({
      exact: false, label: 'Dozens', count: null,
    });
    hero.skills.scouting = 1;
    expect(guardianIntel(game, object, hero)).toMatchObject({
      exact: true, label: '18', count: 18, abilities: ['banner'],
    });
    hero.position = { x: 10, y: 10 };
    const before = game.players.p1.explored.length;
    hero.skills.scouting = 2;
    game = apply(game, { type: 'END_TURN' });
    game = apply(game, { type: 'END_TURN' });
    expect(game.players.p1.explored.length).toBeGreaterThan(before);
  });

  it('uses all four guardian size bands at their exact boundaries', () => {
    expect([1, 9, 10, 24, 25, 74, 75, 400].map(guardianSizeBand)).toEqual([
      'Few', 'Few', 'Dozens', 'Dozens',
      'Scores', 'Scores', 'Hundreds', 'Hundreds',
    ]);
  });

  it('Wayfaring makes forests cost 100 at rank one and every passable terrain 100 at rank two', () => {
    const game = createGame({ seed: 32, p1: 'human', p2: 'human' });
    const hero = selected(game);
    const from = { x: 0, y: 0 };
    game.map.terrain[0][1] = 'forest';
    game.map.terrain[0][2] = 'barrow';
    hero.skills.wayfaring = 1;
    expect(movementCost(game.map, from, { x: 1, y: 0 }, hero)).toBe(100);
    expect(movementCost(game.map, { x: 1, y: 0 }, { x: 2, y: 0 }, hero)).toBe(125);
    hero.skills.wayfaring = 2;
    expect(movementCost(game.map, { x: 1, y: 0 }, { x: 2, y: 0 }, hero)).toBe(100);
    game.map.terrain[0][3] = 'mountain';
    expect(movementCost(game.map, { x: 2, y: 0 }, { x: 3, y: 0 }, hero)).toBe(Infinity);
  });

  it('Diplomacy enforces 50%/80% thresholds and 2x/3x gold costs', () => {
    const game = createGame({ seed: 33, p1: 'human', p2: 'human' });
    const hero = selected(game);
    hero.army = makeArmy([{ unitId: 'yeoman', count: 10 }]);
    const object = guardedObject(game);
    object.army = [{ unitId: 'yeoman', count: 5 }];
    hero.skills.diplomacy = 1;
    expect(diplomacyTerms(hero, object)).toEqual({
      disbandCost: 700, recruitCost: null,
    });
    object.army = [{ unitId: 'yeoman', count: 6 }];
    expect(diplomacyTerms(hero, object)).toBeNull();
    hero.skills.diplomacy = 2;
    object.army = [{ unitId: 'yeoman', count: 8 }];
    expect(diplomacyTerms(hero, object)).toEqual({
      disbandCost: 1120, recruitCost: 1680,
    });
    object.army = [{ unitId: 'yeoman', count: 9 }];
    expect(diplomacyTerms(hero, object)).toBeNull();
  });

  it('Attunement adds 2/4 field mana and grants two shrine upgrade choices at rank two', () => {
    for (const [rank, expected] of [[1, 3], [2, 5]] as const) {
      let game = createGame({ seed: 34 + rank, p1: 'human', p2: 'human' });
      const hero = selected(game);
      hero.position = { x: 4, y: 10 };
      hero.mana = 0;
      hero.skills.attunement = rank;
      game = apply(game, { type: 'END_TURN' });
      game = apply(game, { type: 'END_TURN' });
      expect(selected(game).mana).toBe(expected);
    }
    let game = createGame({ seed: 37, p1: 'human', p2: 'human' });
    const hero = selected(game);
    hero.skills.attunement = 2;
    hero.knownSpells.push('ward');
    const shrine = game.map.objects.find((object) => object.id === 'craft-shrine')!;
    if (shrine.kind !== 'shrine') throw new Error('shrine missing');
    shrine.cleared = true;
    visitShrine(game, shrine.id, hero);
    const first = game.pendingChoice?.kind === 'shrine'
      ? game.pendingChoice.options[0] : 'forgeSpark';
    game = apply(game, { type: 'CHOOSE_SPELL_UPGRADE', spellId: first });
    expect(game.pendingChoice?.kind).toBe('shrine');
    const second = game.pendingChoice?.kind === 'shrine'
      ? game.pendingChoice.options[0] : 'ward';
    game = apply(game, { type: 'CHOOSE_SPELL_UPGRADE', spellId: second });
    expect(game.pendingChoice).toBeNull();
    expect(selected(game).upgradedSpells).toHaveLength(2);
  });

  it('Command grants 3 and 6 meter per allied stack at round start', () => {
    for (const [rank, expected] of [[1, 3], [2, 6]] as const) {
      const game = createGame({ seed: 40 + rank, p1: 'human', p2: 'human' });
      const hero = selected(game, 'p2');
      hero.skills.command = rank;
      const enemy = selected(game);
      const [battle] = createBattle(
        hero.army, enemy.army, hero, enemy,
        {
          kind: 'hero', targetId: enemy.id, destination: enemy.position,
          attackerHeroId: hero.id, defenderHeroId: enemy.id,
          defenderPlayerId: enemy.owner,
        },
        40 + rank,
      );
      battle.stacks.filter((stack) => stack.side === 'attacker')
        .forEach((stack) => { stack.morale = 0; });
      applyRoundMorale(battle);
      expect(battle.stacks.filter((stack) => stack.side === 'attacker')
        .every((stack) => stack.morale === expected)).toBe(true);
    }
  });

  it('Forager grants +50% piles and rank two collects adjacent piles', () => {
    let game = createGame({ seed: 43, p1: 'human', p2: 'human' });
    let hero = selected(game);
    hero.specialtyId = 'steadyAim';
    hero.skills.forager = 1;
    expect(foragerRate(hero)).toBe(0.5);
    const pile = game.map.objects.find((object): object is Extract<MapObject, { kind: 'pile' }> =>
      object.kind === 'pile')!;
    pile.position = { x: 4, y: 10 };
    pile.resource = 'gold';
    pile.amount = 100;
    const before = game.players.p1.resources.gold;
    game = apply(game, { type: 'MOVE_HERO', destination: pile.position });
    expect(game.players.p1.resources.gold).toBe(before + 150);

    game = createGame({ seed: 44, p1: 'human', p2: 'human' });
    hero = selected(game);
    hero.skills.forager = 2;
    const adjacent = game.map.objects.find((object): object is Extract<MapObject, { kind: 'pile' }> =>
      object.kind === 'pile')!;
    adjacent.position = { x: 4, y: 11 };
    adjacent.resource = 'timber';
    adjacent.amount = 4;
    const timber = game.players.p1.resources.timber;
    game = apply(game, { type: 'MOVE_HERO', destination: { x: 4, y: 10 } });
    expect(game.players.p1.resources.timber).toBeGreaterThanOrEqual(timber + 6);
    const collected = game.map.objects.find((object) => object.id === adjacent.id);
    expect(collected?.kind === 'pile' && collected.collected).toBe(true);
  });

  it('Spellthief learns one spell and rank two also copies an upgrade', () => {
    for (const rank of [1, 2] as const) {
      let game = createGame({ seed: 45 + rank, p1: 'human', p2: 'human' });
      const thief = selected(game);
      const loser = selected(game, 'p2');
      thief.skills.spellthief = rank;
      loser.knownSpells.push('ward');
      loser.upgradedSpells.push('ward');
      const [battle] = createBattle(
        thief.army, loser.army, thief, loser,
        {
          kind: 'hero', targetId: loser.id, destination: loser.position,
          attackerHeroId: thief.id, defenderHeroId: loser.id,
          defenderPlayerId: loser.owner,
        },
        45 + rank,
      );
      battle.winner = 'attacker';
      game.battle = battle;
      game.phase = 'combat';
      finalizeBattle(game);
      expect(game.pendingChoice?.kind).toBe('spellthief');
      game = apply(game, { type: 'CHOOSE_STOLEN_SPELL', spellId: 'ward' });
      expect(selected(game).knownSpells).toContain('ward');
      expect(selected(game).upgradedSpells.includes('ward')).toBe(rank === 2);
    }
  });

  it('puts every skill into the draft and upgrades held cards to rank two', () => {
    const hero = selected(createGame({ seed: 50, p1: 'human', p2: 'human' }));
    const seen = new Set(Array.from({ length: 400 }, (_, seed) =>
      drawLevelOptions(hero, seed)[0]).flat());
    expect(SKILL_IDS.every((skill) => seen.has(skill))).toBe(true);
    hero.skills.logistics = 1;
    expect(Array.from({ length: 100 }, (_, seed) => drawLevelOptions(hero, seed)[0])
      .some((options) => options.includes('logistics'))).toBe(true);
  });
});
