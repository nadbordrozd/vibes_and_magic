import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/game';
import { castleEntrance } from '../../core/map/occupancy';
import { tile } from '../../content/terrain';
import { CASTLE_NAMES } from '../../content/factionPresentation';
import { AdventureItemDialog } from '../components/AdventureItemDialog';
import { PalimpsestService } from '../components/PalimpsestService';
import {
  adventureItemDraft, legalAdventureItemMapTargets,
} from '../adventureItemPresentation';
import { previewAction } from '../actionPreview';
import {
  HUMAN_ACTION_ROUTES, validateHumanActionRoutes,
} from '../actionRouteCoverage';

function fixture() {
  return createGame({
    seed: 5303, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
  });
}

describe('adventure and castle service presentation', () => {
  it('keeps an exhaustive action-to-UI inventory with deliberate internal handling', () => {
    validateHumanActionRoutes();
    const source = readFileSync(new URL('../../core/actionTypes.ts', import.meta.url), 'utf8');
    const actionTypes = [...source.matchAll(/type: '([A-Z_]+)'/g)].map((match) => match[1]);
    expect(Object.keys(HUMAN_ACTION_ROUTES).sort()).toEqual([...new Set(actionTypes)].sort());
    expect(HUMAN_ACTION_ROUTES.SWAP_ARMY).toMatchObject({
      handling: 'deliberate-internal', surface: expect.stringContaining('TRANSFER_ARMY'),
    });
    expect(HUMAN_ACTION_ROUTES.PALIMPSEST_FORGET.handling).toBe('visible-control');
  });

  it('offers every owned hero for Salted Meat before final confirmation', () => {
    const state = fixture();
    const hero = state.players.p1.hero!;
    hero.inventory[0] = { id: 'saltedMeat' };
    const before = JSON.stringify(state);
    const html = renderToStaticMarkup(<AdventureItemDialog state={state} hero={hero}
      inventorySlot={0} onDraft={() => undefined} onCancel={() => undefined} />);
    for (const candidate of state.players.p1.heroes) expect(html).toContain(candidate.name);
    expect(html).toContain('Nothing is consumed until the final confirmation');
    expect(JSON.stringify(state)).toBe(before);
    const recipient = state.players.p1.heroes[1];
    expect(adventureItemDraft(state, hero, 0, undefined, recipient).action).toMatchObject({
      type: 'USE_ADVENTURE_ITEM', targetHeroId: recipient.id,
    });
  });

  it('shares Ferryman landing authority with map highlighting and projected dispatch', () => {
    const state = fixture();
    const hero = state.players.p1.hero!;
    hero.position = { x: 8, y: 8 };
    state.map.terrain[8][9] = tile('mountain');
    state.map.terrain[8][10] = tile('meadow');
    hero.inventory[0] = { id: 'ferrymansCoin' };
    const targets = legalAdventureItemMapTargets(state, hero, 0);
    expect(targets.has('10,8')).toBe(true);
    expect(targets.has('9,8')).toBe(false);
    const draft = adventureItemDraft(state, hero, 0, { x: 10, y: 8 });
    expect(previewAction(state, draft.action)).toMatchObject({ legal: true, cost: {} });
    expect(draft.target).toBe('landing tile 10, 8');
  });

  it('shows every owned castle and reducer-derived Writ availability', () => {
    const state = fixture();
    const hero = state.players.p1.hero!;
    hero.inventory[0] = { id: 'militiaWrit' };
    state.players.p1.resources.gold = 0;
    const html = renderToStaticMarkup(<AdventureItemDialog state={state} hero={hero}
      inventorySlot={0} onDraft={() => undefined} onCancel={() => undefined} />);
    for (const castle of state.castles.filter((candidate) => candidate.owner === 'p1')) {
      expect(html).toContain(CASTLE_NAMES[castle.faction]);
    }
    expect(html).toContain('Unavailable');
    expect(html).toContain('Exact cost');
  });

  it('exposes Palimpsest forgetting at a visited Mage Guild without changing rules', () => {
    const state = fixture();
    const hero = state.players.p1.hero!;
    const castle = state.castles.find((candidate) => candidate.owner === 'p1'
      && candidate.faction === hero.faction)!;
    hero.position = castleEntrance(castle);
    hero.skills.palimpsest = 2;
    hero.knownSpells = ['rally'];
    castle.buildings.push('mageGuild1');
    castle.guildDeck = ['blessing', 'ward', 'quiet'];
    const before = JSON.stringify(state);
    const html = renderToStaticMarkup(<PalimpsestService state={state} hero={hero}
      site={castle} onDraft={() => undefined} />);
    expect(html).toContain('Palimpsest · rank 2');
    expect(html).toContain('Forget Rally');
    expect(html).toContain('Then keep one of 3 seeded unknown spells');
    expect(JSON.stringify(state)).toBe(before);
    expect(previewAction(state, {
      type: 'PALIMPSEST_FORGET', siteId: castle.id, spellId: 'rally',
    }).legal).toBe(true);
  });

  it('projects exact modified service cost and prevents reducer-error discovery', () => {
    const state = fixture();
    const hero = state.players.p1.hero!;
    const monastery = state.map.objects.find((object) => object.kind === 'monastery')!;
    hero.position = { ...monastery.position };
    state.players.p1.resources.essence = 0;
    const unavailable = previewAction(state, {
      type: 'BUY_TIMING_BLESSING', objectId: monastery.id,
    });
    expect(unavailable.legal).toBe(false);
    expect(unavailable.reason).toContain('costs');
    state.players.p1.resources.essence = 20;
    const available = previewAction(state, {
      type: 'BUY_TIMING_BLESSING', objectId: monastery.id,
    });
    expect(available).toMatchObject({ legal: true, cost: { essence: 3 } });
    expect(hero.inventory).toEqual(state.players.p1.hero!.inventory);
  });
});
