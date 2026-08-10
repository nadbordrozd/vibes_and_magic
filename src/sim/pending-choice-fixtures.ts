import { createGame } from '../core/game';
import type { GameState, MapObject, PendingChoice } from '../core/types';

export interface PendingChoiceFixture {
  name: string;
  state: GameState;
  expected: string[];
  disabledReasons?: string[];
  minimumInspectionTargets: number;
}

function baseFixture(seed: number): { state: GameState; hero: GameState['players']['p1']['heroes'][number] } {
  const state = createGame({
    seed, mapId: 'manywhere', difficulty: 'normal', p1: 'human', p2: 'dormant',
  });
  state.day = 2;
  state.replay = [];
  state.pendingChoice = null;
  const hero = state.players.p1.hero!;
  return { state, hero };
}

function objectOfKind<K extends MapObject['kind']>(state: GameState, kind: K): Extract<
  MapObject, { kind: K }
> {
  const object = state.map.objects.find((candidate) => candidate.kind === kind);
  if (!object || object.kind !== kind) throw new Error(`Pending-choice fixture needs ${kind}`);
  return object as Extract<MapObject, { kind: K }>;
}

function withChoice(
  name: string,
  seed: number,
  build: (state: GameState, hero: GameState['players']['p1']['heroes'][number]) => PendingChoice,
  expected: string[],
  minimumInspectionTargets: number,
  disabledReasons?: string[],
): PendingChoiceFixture {
  const { state, hero } = baseFixture(seed);
  state.pendingChoice = build(state, hero);
  return { name, state, expected, minimumInspectionTargets, disabledReasons };
}

export function pendingChoiceFixtures(): PendingChoiceFixture[] {
  return [
    withChoice('site-stat', 3701, (state, hero) => ({
      kind: 'siteStat', objectId: objectOfKind(state, 'sparringStone').id,
      playerId: 'p1', heroId: hero.id, options: ['attack', 'defense'],
    }), ['Source · The Sparring Stone', 'Gain +1 attack', 'cannot be cancelled'], 1),
    withChoice('chest-consumable-open', 3702, (state, hero) => ({
      kind: 'chest', objectId: objectOfKind(state, 'chest').id,
      playerId: 'p1', heroId: hero.id, item: { id: 'potionOfVigor' },
    }), ['Potion of Vigor', 'Occupies one empty consumable slot'], 2),
    withChoice('chest-consumable-full', 3703, (state, hero) => {
      hero.inventory = hero.inventory.map(() => ({ id: 'potionOfVigor' }));
      return {
        kind: 'chest', objectId: objectOfKind(state, 'chest').id,
        playerId: 'p1', heroId: hero.id, item: { id: 'potionOfVigor' },
      };
    }, ['Potion of Vigor', 'Unavailable'], 2,
    ['This consumable needs one empty consumable inventory slot; the hero has none.']),
    withChoice('chest-artifact-full-consumables', 3704, (state, hero) => {
      hero.inventory = hero.inventory.map(() => ({ id: 'potionOfVigor' }));
      return {
        kind: 'chest', objectId: objectOfKind(state, 'chest').id,
        playerId: 'p1', heroId: hero.id, item: { id: 'potionOfVigor' },
        artifact: { id: 'travelersCloak' },
      };
    }, ["Traveler's Cloak", 'unlimited artifact backpack'], 2),
    withChoice('level-up-chronicler', 3705, (_state, hero) => {
      hero.skills.chronicler = 3;
      return {
        kind: 'level', playerId: 'p1', heroId: hero.id,
        options: ['attack', 'logistics', 'inscribe'], canSkip: true, canReroll: true,
        source: 'levelUp',
      };
    }, ['Hero progression', 'Reroll this deal', 'Skip for +300 XP', 'no ordinary Cancel'], 1),
    withChoice('level-hedge-school', 3706, (_state, hero) => ({
      kind: 'level', playerId: 'p1', heroId: hero.id,
      options: ['attack', 'defense', 'knowledge'], canSkip: false, canReroll: false,
      source: 'hedgeSchool',
    }), ['Hedge School lesson', '1,500 gold already paid', 'cannot be cancelled'], 0),
    withChoice('shrine-two-choices', 3707, (state, hero) => ({
      kind: 'shrine', objectId: objectOfKind(state, 'shrine').id,
      playerId: 'p1', heroId: hero.id, options: ['rally', 'blessing'], choicesRemaining: 2,
    }), ['additional shrine choice follows', 'Rally+', 'Blessing+'], 3),
    withChoice('inscription', 3708, (_state, hero) => ({
      kind: 'inscribe', playerId: 'p1', heroId: hero.id, options: ['rally', 'blessing'],
    }), ['Level-up reward · Inscribe', 'Permanently use the + face'], 2),
    withChoice('diplomacy-affordable', 3709, (state, hero) => {
      const guardian = objectOfKind(state, 'guardian');
      guardian.army = [{ unitId: 'yeoman', count: 12 }];
      hero.skills.diplomacy = 3;
      state.players.p1.resources.gold = 10_000;
      return {
        kind: 'diplomacy', objectId: guardian.id, playerId: 'p1', heroId: hero.id,
        disbandCost: 1_200, recruitCost: 2_400, canStandAside: true,
      };
    }, ['12 Yeoman', 'Recruit · 2,400', 'Stand aside · 1,200'], 2),
    withChoice('diplomacy-unavailable', 3710, (state, hero) => {
      const guardian = objectOfKind(state, 'guardian');
      guardian.army = [{ unitId: 'tinSoldier', count: 15 }];
      hero.skills.diplomacy = 1;
      state.players.p1.resources.gold = 0;
      return {
        kind: 'diplomacy', objectId: guardian.id, playerId: 'p1', heroId: hero.id,
        disbandCost: 1_500, recruitCost: null, canStandAside: false,
      };
    }, ['Recruit · Unavailable', 'Unavailable'], 2, [
      'Disband costs 1,500 gold; you have 0.',
      'Recruit requires Diplomacy rank 2 or 3.',
      'Stand aside requires Diplomacy rank 3.',
    ]),
    withChoice('spellthief-rank-two', 3711, (_state, hero) => {
      hero.skills.spellthief = 2;
      return {
        kind: 'spellthief', playerId: 'p1', heroId: hero.id,
        options: ['forgeSpark', 'ward'], upgradeOptions: ['blessing'],
      };
    }, ['Defeated rival · Spellthief', 'also learns and upgrades Blessing+'], 2),
    withChoice('palimpsest', 3712, (_state, hero) => ({
      kind: 'palimpsest', playerId: 'p1', heroId: hero.id, options: ['forgeSpark', 'ward'],
    }), ['Forgotten spell · Palimpsest', 'every other offer is lost'], 2),
    withChoice('bargain-available', 3713, (state, hero) => {
      const target = state.castles.find((castle) => castle.owner !== hero.owner);
      if (!target) throw new Error('Bargain fixture needs a rival castle');
      target.owner = 'p2';
      return {
        kind: 'bargain', playerId: 'p1', heroId: hero.id,
        options: ['firstHarvest', 'cuckoosDeal'], source: 'post',
      };
    }, ['Source · Bargain Post', 'Gain', 'Debt:', 'Target ·'], 1),
    withChoice('bargain-unavailable', 3714, (state, hero) => {
      hero.army = [
        { unitId: 'yeoman', count: 1 }, { unitId: 'longbowman', count: 1 },
        { unitId: 'bannerman', count: 1 }, { unitId: 'lanceKnight', count: 1 },
        { unitId: 'tinSoldier', count: 1 }, { unitId: 'hobbyKnight', count: 1 },
        { unitId: 'marionette', count: 1 },
      ];
      hero.position = { x: 0, y: 0 };
      state.players.p1.resources.gold = 0;
      return {
        kind: 'bargain', playerId: 'p1', heroId: hero.id,
        options: ['borrowedLegion', 'whatWasPromised'], source: 'crone',
      };
    }, ['Source · Wayward Crone', 'Borrowed Legion', 'What Was Promised', 'Unavailable'], 0, [
      'The borrowed company needs an empty army slot or an existing Candle Wisps company.',
      'This bargain must be accepted at an owned castle entrance.',
    ]),
    withChoice('toll-unaffordable', 3715, (state, hero) => {
      const toll = objectOfKind(state, 'tollGate');
      state.players.p1.resources.gold = 125;
      return {
        kind: 'toll', playerId: 'p1', heroId: hero.id, objectId: toll.id, cost: 500,
      };
    }, ['Source · Toll Gate', 'Pay 500', 'Fight the Keeper · 0 gold'], 1,
    ['Passage costs 500 gold; you have 125.']),
    withChoice('siren', 3716, (state, hero) => {
      const rocks = objectOfKind(state, 'sirenRocks');
      hero.movement = 125;
      return { kind: 'siren', playerId: 'p1', heroId: hero.id, objectId: rocks.id };
    }, ['Source · Siren Rocks', 'Hoard on victory', 'Row past · −125 movement'], 1),
  ];
}
