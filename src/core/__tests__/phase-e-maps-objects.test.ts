import { describe, expect, it } from 'vitest';
import { createBorderMarches } from '../../content/maps/borderMarches';
import { ARTIFACTS } from '../../content/artifacts';
import { apply, createGame } from '../game';
import {
  advanceCreativeObjects, buyTimingBlessing, depositGloamingArtifact,
  depositGloamingItem, recruitDwelling, visitCreativeObject,
} from '../game/mapObjects';

describe('phase E maps and creative locations', () => {
  it('builds the authored 36×28 four-corner Crosstitch map', () => {
    const state = createGame({
      seed: 801, mapId: 'crosstitch', playerCount: 4,
      p1: 'human', p2: 'human', p3: 'human', p4: 'human',
    });
    expect([state.map.width, state.map.height]).toEqual([36, 28]);
    expect(Object.values(state.players).filter((player) => player.active)).toHaveLength(4);
    expect(state.castles).toHaveLength(4);
    expect(state.map.seams?.length).toBeGreaterThanOrEqual(64);
    expect(state.map.objects.filter((object) => object.kind === 'dwelling').length)
      .toBeGreaterThanOrEqual(19);
    expect(state.map.objects.filter((object) => object.kind === 'lock'
      && object.reward.artifacts?.some((artifact) => ARTIFACTS[artifact.id].class === 'kit')))
      .toHaveLength(4);
    for (const kind of [
      'tinkersCart', 'monastery', 'gloamingRing', 'storyteller', 'chrysalis',
      'bridge', 'hedgeSchool', 'reliquaryCairn', 'tollGate', 'omenStone', 'crone',
      'barrowField',
    ] as const) expect(state.map.objects.some((object) => object.kind === kind)).toBe(true);
  });

  it('cycles all active hot-seat slots and advances moving locations once per day', () => {
    let state = createGame({
      seed: 802, mapId: 'crosstitch', playerCount: 4,
      p1: 'human', p2: 'human', p3: 'human', p4: 'human',
    });
    const cart = state.map.objects.find((object) => object.kind === 'tinkersCart')!;
    const start = { ...cart.position };
    for (const expected of ['p2', 'p3', 'p4', 'p1'] as const) {
      state = apply(state, { type: 'END_TURN' });
      expect(state.activePlayer).toBe(expected);
    }
    expect(state.day).toBe(2);
    const moved = state.map.objects.find((object) => object.kind === 'tinkersCart')!;
    expect(moved.position).not.toEqual(start);
  });

  it('supports cross-faction field recruitment and monastery provenance', () => {
    const state = createGame({
      seed: 803, mapId: 'crosstitch', playerCount: 2,
      p1: 'human', p2: 'human', p1Faction: 'hearthguard',
    });
    const hero = state.players.p1.hero!;
    const dwelling = state.map.objects.find((object) =>
      object.kind === 'dwelling' && object.unitId === 'tinSoldier')!;
    if (dwelling.kind !== 'dwelling') throw new Error('fixture');
    hero.position = { ...dwelling.position };
    state.players.p1.resources.gold = 100_000;
    recruitDwelling(state, dwelling.id, 1);
    expect(hero.army.some((stack) => stack?.unitId === 'tinSoldier')).toBe(true);

    const monastery = state.map.objects.find((object) => object.kind === 'monastery')!;
    hero.position = { ...monastery.position };
    visitCreativeObject(state, monastery, hero);
    expect(hero.knownSpells).toContain('hourglassCrack');
    state.players.p1.resources.essence = 3;
    buyTimingBlessing(state, monastery.id);
    expect(hero.adventureEffects.timingBlessingUntilDay).toBe(state.day + 2);
  });

  it('returns Gloaming consumables upgraded and politely declines Relics', () => {
    const state = createGame({ seed: 804, mapId: 'crosstitch', p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    const ring = state.map.objects.find((object) => object.kind === 'gloamingRing')!;
    if (ring.kind !== 'gloamingRing') throw new Error('fixture');
    hero.position = { ...ring.position };
    hero.inventory[0] = { id: 'potionOfVigor' };
    depositGloamingItem(state, ring.id, 0);
    state.week = 2;
    advanceCreativeObjects(state, true);
    visitCreativeObject(state, ring, hero);
    expect(hero.inventory.some((item) => item && typeof item !== 'string'
      && item.id !== 'potionOfVigor')).toBe(true);

    hero.artifacts.backpack.push({ id: 'sunderedHourglass' });
    depositGloamingArtifact(state, ring.id, 0);
    state.week = 3;
    advanceCreativeObjects(state, true);
    visitCreativeObject(state, ring, hero);
    expect(hero.artifacts.backpack).toContainEqual({ id: 'sunderedHourglass' });
  });

  it('adds three creative sites and deliberately no Tailor Kit to Border Marches', () => {
    const map = createBorderMarches(805);
    expect(map.objects.filter((object) => [
      'storyteller', 'omenStone', 'hedgeSchool',
    ].includes(object.kind))).toHaveLength(3);
    expect(map.objects.some((object) => object.kind === 'lock'
      && object.reward.artifacts?.some((artifact) => ARTIFACTS[artifact.id].class === 'kit')))
      .toBe(false);
    const sleeper = map.objects.find((object) => object.id === 'the-sleeper');
    expect(sleeper?.kind === 'lock' ? sleeper.reward.teachesSpell : null)
      .toBe('loyalUntoDeath');
  });
});
