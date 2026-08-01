import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../game';
import {
  adventureSpellMoveCost, castAdventureSpell,
} from '../game/adventureSpells';
import { adventurePath } from '../game/navigation';
import type { GameState, Hero, SpellId } from '../types';
import { castleEntrance } from '../map/occupancy';

function prepared(...spells: SpellId[]): [GameState, Hero] {
  const state = createGame({ seed: 403, p1: 'human', p2: 'human' });
  const hero = state.players.p1.hero!;
  hero.knownSpells = [...spells];
  hero.mana = 100;
  hero.movement = 10_000;
  return [state, hero];
}

describe('phase C adventure spells', () => {
  it('charges mana and movement, including the Provisioner discount', () => {
    const [state, hero] = prepared('census');
    hero.skills.provisioner = 2;
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'census' });
    expect(hero.mana).toBe(96);
    expect(hero.movement).toBe(9_850);
    expect(adventureSpellMoveCost(hero)).toBe(150);
    expect(state.players.p1.adventureEffects.censusUntilDay).toBe(1);
  });

  it('applies Borrowed Time now and its scheduled penalty tomorrow', () => {
    let [state, hero] = prepared('borrowedTime');
    hero.movement = 2_000;
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'borrowedTime' });
    expect(hero.movement).toBe(3_700);
    state = apply(state, { type: 'END_TURN' });
    state = apply(state, { type: 'END_TURN' });
    expect(state.day).toBe(2);
    expect(state.players.p1.hero!.movement).toBe(0);
  });

  it('creates a usable paired Gate and an impassable Root and Ruin wall', () => {
    const [state, hero] = prepared('gate', 'rootAndRuin');
    const first = { x: 3, y: 10 };
    const second = { x: 5, y: 10 };
    state.players.p1.explored.push('5,10');
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'gate',
      target: first, secondaryTarget: second,
    });
    expect(adventurePath(state, second)).toEqual([first, second]);
    hero.knownSpells = ['rootAndRuin'];
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'rootAndRuin',
      positions: [{ x: 6, y: 9 }, { x: 6, y: 10 }, { x: 6, y: 11 }],
    });
    expect(state.mapEffects.some((effect) => effect.kind === 'thicket')).toBe(true);
  });

  it('teleports with Beacon and stores a chosen Wayside resonance', () => {
    const [state, hero] = prepared('beacon', 'waysideShrine');
    hero.position = { x: 12, y: 12 };
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'beacon' });
    expect(hero.position).toEqual(castleEntrance(state.castles[0]));
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'waysideShrine' });
    expect(state.mapEffects).toContainEqual(expect.objectContaining({
      kind: 'resonance', school: 'rite', position: hero.position,
    }));
  });

  it('suppresses enemy mines and applies weekly castle growth effects', () => {
    const [state, hero] = prepared('saltTheVein', 'feastDay', 'wildGrowth');
    const mine = state.map.objects.find((object) => object.kind === 'mine'
      && object.id === 'east-gold')!;
    if (mine.kind !== 'mine') throw new Error('fixture');
    mine.owner = 'p2';
    state.players.p1.explored.push(`${mine.position.x},${mine.position.y}`);
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'saltTheVein', targetId: mine.id,
    });
    expect(mine.suppressedUntilDay).toBe(5);
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'feastDay' });
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'wildGrowth', castleId: 'p1-castle',
    });
    expect(state.castles[0].growthEffects.map((effect) => effect.multiplier))
      .toEqual([1.25, 1.5]);
    expect(hero.mana).toBe(85);
  });

  it('raises a temporary Pale Procession and replays Grave-Speech records', () => {
    const [state, hero] = prepared('paleProcession', 'graveSpeech');
    state.battleRecords.push({
      day: 1, position: { ...hero.position }, casualties: 120,
      spells: ['wither'], winner: 'attacker', summary: 'A remembered victory.',
    });
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'paleProcession' });
    expect(hero.army.some((stack) => stack?.unitId === 'candleWisps')).toBe(true);
    hero.upgradedSpells.push('graveSpeech');
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'graveSpeech' });
    expect(hero.knownSpells).toContain('wither');
  });

  it('parleys with beast guardians and can recruit them on the plus face', () => {
    const [state, hero] = prepared('beastTongue');
    hero.upgradedSpells.push('beastTongue');
    const chest = state.map.objects.find((object) => object.kind === 'chest'
      && state.map.objects.some((candidate) => candidate.kind === 'guardian'
        && candidate.protects === object.id))!;
    if (chest.kind !== 'chest') throw new Error('fixture');
    const guardian = state.map.objects.find((object) => object.kind === 'guardian'
      && object.protects === chest.id)!;
    if (guardian.kind !== 'guardian') throw new Error('fixture guardian');
    guardian.army = [{ unitId: 'ashmaneWolves', count: 2 }];
    state.players.p1.resources.gold = 100_000;
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'beastTongue',
      targetId: chest.id, recruit: true,
    });
    expect(hero.army.some((stack) => stack?.unitId === 'ashmaneWolves')).toBe(true);
    expect(state.map.objects.some((object) => object.id === guardian.id)).toBe(false);
    expect(chest.cleared).toBe(false);
  });
});
