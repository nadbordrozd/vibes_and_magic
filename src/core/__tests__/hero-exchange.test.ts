import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../game';
import type {
  Army, GameState,
} from '../types';

function armyCounts(armies: Army[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const stack of armies.flat()) {
    if (stack) result[stack.unitId] = (result[stack.unitId] ?? 0) + stack.count;
  }
  return result;
}

function twoHeroGame(): GameState {
  let state = createGame({ seed: 60, p1: 'human', p2: 'human' });
  state.players.p1.resources.gold = 10000;
  state = apply(state, {
    type: 'HIRE_HERO', castleId: 'p1-castle',
    heroId: state.players.p1.tavernOffers[0],
  });
  return state;
}

describe('multi-hero exchange', () => {
  it('conserves every unit across partial transfers for all legal split sizes', () => {
    for (let count = 1; count <= 8; count += 1) {
      let state = twoHeroGame();
      const [main, scout] = state.players.p1.heroes;
      const before = armyCounts([
        main.army, scout.army, state.castles[0].garrison,
      ]);
      state = apply(state, {
        type: 'TRANSFER_ARMY',
        source: { kind: 'hero', id: scout.id }, sourceSlot: 0,
        destination: { kind: 'hero', id: main.id }, destinationSlot: 0,
        count,
      });
      const after = armyCounts([
        ...state.players.p1.heroes.map((hero) => hero.army),
        state.castles[0].garrison,
      ]);
      expect(after).toEqual(before);
    }
  });

  it('conserves units when swapping different stacks with a garrison', () => {
    let state = twoHeroGame();
    const main = state.players.p1.heroes[0];
    state.castles[0].garrison[0] = { unitId: 'bannerman', count: 3 };
    const before = armyCounts([
      ...state.players.p1.heroes.map((hero) => hero.army),
      state.castles[0].garrison,
    ]);
    state = apply(state, {
      type: 'TRANSFER_ARMY',
      source: { kind: 'hero', id: main.id }, sourceSlot: 0,
      destination: { kind: 'garrison', id: 'p1-castle' }, destinationSlot: 0,
      count: main.army[0]!.count,
    });
    expect(armyCounts([
      ...state.players.p1.heroes.map((hero) => hero.army),
      state.castles[0].garrison,
    ])).toEqual(before);
  });

  it('exchanges consumable slots without duplication', () => {
    let state = twoHeroGame();
    const [main, scout] = state.players.p1.heroes;
    main.inventory[0] = 'test-scroll';
    scout.inventory[2] = 'test-potion';
    state = apply(state, {
      type: 'TRANSFER_ITEM',
      sourceHeroId: main.id, destinationHeroId: scout.id,
      sourceSlot: 0, destinationSlot: 2,
    });
    const items = state.players.p1.heroes.flatMap((hero) =>
      hero.inventory.filter(Boolean)).sort();
    expect(items).toEqual(['test-potion', 'test-scroll']);
    expect(state.players.p1.heroes.find((hero) => hero.id === main.id)!.inventory[0])
      .toBe('test-potion');
  });

  it('cycles only through living roster heroes and preserves independent state', () => {
    let state = twoHeroGame();
    const [main, scout] = state.players.p1.heroes;
    main.mana = 1;
    scout.mana = 9;
    main.movement = 0;
    scout.movement = 700;
    state = apply(state, { type: 'NEXT_HERO' });
    expect(state.players.p1.activeHeroId).toBe(scout.id);
    expect(state.players.p1.hero).toMatchObject({ mana: 9, movement: 700 });
    expect(state.players.p1.heroes.find((hero) => hero.id === main.id))
      .toMatchObject({ mana: 1, movement: 0 });
  });
});
