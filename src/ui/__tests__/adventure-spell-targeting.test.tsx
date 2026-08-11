import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/game';
import { castAdventureSpell } from '../../core/game/adventureSpells';
import type { Action, GameState, Hero, SpellId } from '../../core/types';
import {
  adventureDraftIncompleteReason, legalMapTargets, mapDraftAction, mapTargetReason,
} from '../adventureSpellTargeting';
import { AdventureSpellTargetDialog } from '../components/AdventureSpellTargetDialog';

type Cast = Extract<Action, { type: 'CAST_ADVENTURE_SPELL' }>;

function fixture(...spells: SpellId[]): [GameState, Hero] {
  const state = createGame({
    seed: 5101, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
  });
  const hero = state.players.p1.hero!;
  hero.knownSpells = spells;
  hero.mana = 100;
  hero.movement = 10_000;
  state.players.p1.explored = state.map.terrain.flatMap((row, y) =>
    row.map((_tile, x) => `${x},${y}`));
  return [state, hero];
}

function render(state: GameState, action: Cast): string {
  return renderToStaticMarkup(<AdventureSpellTargetDialog state={state} action={action}
    onChange={() => undefined} onConfirm={() => undefined} onBack={() => undefined}
    onCancel={() => undefined} />);
}

describe('explicit adventure spell targeting', () => {
  it('presents identity, exact costs, consequence, safe exits, and blocks incomplete casts', () => {
    const [state] = fixture('saltTheVein');
    const mine = state.map.objects.find((object) => object.kind === 'mine')!;
    if (mine.kind !== 'mine') throw new Error('fixture mine');
    mine.owner = 'p2';
    const before = JSON.stringify(state);
    const html = render(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'saltTheVein' });
    expect(html).toContain('Salt the Vein');
    expect(html).toContain('4 mana');
    expect(html).toContain('300 movement');
    expect(html).toContain('Visible enemy mine');
    expect(html).toContain('Cancel · spend nothing');
    expect(html).toContain('Back to spellbook');
    expect(html).toMatch(/Confirm Salt the Vein[^>]*|disabled=""/);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('covers castles, mines, guardians, heroes, inventory, garrisons, omens, and remembered spells', () => {
    const [state, hero] = fixture(
      'beacon', 'saltTheVein', 'clockworkCourier', 'beastTongue',
      'wildGrowth', 'fickleWeather', 'graveSpeech',
    );
    hero.upgradedSpells.push('beacon', 'clockworkCourier', 'beastTongue', 'graveSpeech');
    hero.inventory[0] = { id: 'waybread' };
    const other = state.players.p1.heroes.find((candidate) => candidate.id !== hero.id)!;
    other.inventory[0] = null;
    const mine = state.map.objects.find((object) => object.kind === 'mine')!;
    if (mine.kind !== 'mine') throw new Error('fixture mine');
    mine.owner = 'p2';
    const guardian = state.map.objects.find((object) => object.kind === 'guardian')!;
    if (guardian.kind !== 'guardian') throw new Error('fixture guardian');
    guardian.army = [{ unitId: 'ashmaneWolves', count: 2 }];
    state.battleRecords.push({
      day: 1, position: { ...hero.position }, casualties: 10, spells: ['wither'],
      winner: 'attacker', summary: 'Remembered battle.',
    });
    const cases: Array<[Cast, string[]]> = [
      [{ type: 'CAST_ADVENTURE_SPELL', spellId: 'beacon' }, ['Friendly city', 'at']],
      [{ type: 'CAST_ADVENTURE_SPELL', spellId: 'saltTheVein' }, ['enemy mine', '/day']],
      [{ type: 'CAST_ADVENTURE_SPELL', spellId: 'clockworkCourier', courierKind: 'army', sourceSlot: 0 },
        ['Send from', 'Exact destination', 'Item 1: Waybread', 'garrison']],
      [{ type: 'CAST_ADVENTURE_SPELL', spellId: 'beastTongue', targetId: guardian.id },
        ['Beast guardian', 'Ashmane Wolves', 'Disperse', 'Recruit']],
      [{ type: 'CAST_ADVENTURE_SPELL', spellId: 'wildGrowth' }, ['Owned city', 'current growth effects']],
      [{ type: 'CAST_ADVENTURE_SPELL', spellId: 'fickleWeather' }, ['Dealt omen', 'Week of']],
      [{ type: 'CAST_ADVENTURE_SPELL', spellId: 'graveSpeech' }, ['Remembered spell', 'Wither', 'learn nothing']],
    ];
    for (const [action, labels] of cases) {
      const html = render(state, action);
      for (const label of labels) expect(html).toContain(label);
    }
  });

  it('requires explicit optional choices and handles unavailable/no-target states', () => {
    const [state, hero] = fixture('beastTongue', 'graveSpeech', 'wildGrowth');
    hero.upgradedSpells.push('beastTongue', 'graveSpeech');
    const guardian = state.map.objects.find((object) => object.kind === 'guardian')!;
    if (guardian.kind !== 'guardian') throw new Error('fixture guardian');
    guardian.army = [{ unitId: 'ashmaneWolves', count: 2 }];
    state.battleRecords.push({
      day: 1, position: { ...hero.position }, casualties: 2, spells: ['wither'],
      winner: 'attacker', summary: 'A memory.',
    });
    expect(adventureDraftIncompleteReason(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'beastTongue', targetId: guardian.id,
    })).toContain('disperse or recruit');
    expect(adventureDraftIncompleteReason(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'graveSpeech',
    })).toContain('continue without learning');
    state.castles.forEach((castle) => { castle.owner = 'p2'; });
    expect(adventureDraftIncompleteReason(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'wildGrowth',
    })).toContain('owned city');
  });

  it('marks only legal map targets and builds ordered, confirmation-ready actions', () => {
    const [state, hero] = fixture('gate', 'rootAndRuin', 'murmuration');
    const first = { x: 8, y: 8 };
    const second = { x: 9, y: 8 };
    expect(mapTargetReason(state, hero, 'gate', first, [])).toBeNull();
    expect(mapTargetReason(state, hero, 'gate', first, [first])).toContain('different');
    expect(legalMapTargets(state, hero, 'gate', [first]).has('8,8')).toBe(false);
    expect(mapDraftAction('gate', hero, [first, second])).toMatchObject({
      target: first, secondaryTarget: second,
    });
    expect(mapDraftAction('murmuration', hero, [first, second]).positions)
      .toEqual([hero.position, first, second]);
  });

  it('dispatches the exact selected courier family and slot only after confirmation', () => {
    const [state, hero] = fixture('clockworkCourier');
    const other = state.players.p1.heroes.find((candidate) => candidate.id !== hero.id)!;
    hero.inventory[0] = { id: 'waybread' };
    hero.army[0] = { unitId: 'yeoman', count: 3 };
    other.inventory[0] = { id: 'saltedMeat' };
    other.army[0] = { unitId: 'tinSoldier', count: 4 };
    const draft: Cast = {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'clockworkCourier', courierKind: 'army',
      sourceSlot: 0, targetHeroId: other.id, destinationSlot: 0,
    };
    const before = JSON.stringify(state);
    expect(adventureDraftIncompleteReason(state, draft)).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
    castAdventureSpell(state, draft);
    expect(hero.army[0]).toEqual({ unitId: 'tinSoldier', count: 4 });
    expect(other.army[0]).toEqual({ unitId: 'yeoman', count: 3 });
    expect(hero.inventory[0]).toEqual({ id: 'waybread' });
    expect(other.inventory[0]).toEqual({ id: 'saltedMeat' });
  });
});
