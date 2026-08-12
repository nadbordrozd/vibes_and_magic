import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/game';
import { AdventureHeroDetails } from '../components/AdventureHeroDetails';
import { AdventureScreen } from '../components/AdventureScreen';

function fixture() {
  const state = createGame({
    seed: 4511, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
  });
  const hero = state.players.p1.hero!;
  hero.skills.attunement = 3;
  hero.skills.ritualist = 3;
  hero.inventory[0] = { id: 'ferrymansCoin' };
  hero.artifacts.backpack.push({ id: 'quietHorseshoe' });
  return state;
}

describe('map-first adventure information architecture', () => {
  it('keeps only routine navigation and turn decisions in the persistent rail', () => {
    const state = fixture();
    const before = JSON.stringify(state);
    const html = renderToStaticMarkup(<AdventureScreen state={state} dispatch={() => undefined}
      onOpenCastle={() => undefined} onMenu={() => undefined} onSave={() => undefined}
      onExport={() => undefined} onImport={() => undefined} onShare={() => undefined}
      animationSpeed="instant" onAnimationSpeedChange={() => undefined}
      onMovementStateChange={() => undefined} />);
    const rail = html.slice(html.indexOf('<aside class="hero-panel"'), html.indexOf('</aside>') + 8);
    for (const required of [
      'rail-minimap', 'Heroes', 'Owned towns', 'Move', 'Mana', 'Army', 'Hero details',
      'Spellbook', 'World view', 'Menu &amp; saves', 'End turn',
    ]) expect(rail).toContain(required);
    for (const removed of [
      'Artifacts', 'Backpack', 'Consumables', 'Secondary skills', 'specialty',
      'Declare next battle resonance', 'Ritualist', 'Activity log', 'Save slot',
    ]) expect(rail).not.toContain(removed);
    expect(html).toContain('class="minimap"');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('gives every removed hero-management family a deliberate transient home', () => {
    const state = fixture();
    const hero = state.players.p1.hero!;
    const before = JSON.stringify(state);
    const html = renderToStaticMarkup(<AdventureHeroDetails state={state} hero={hero}
      dispatch={() => undefined} onClose={() => undefined} onOpenSpellbook={() => undefined}
      onUseItem={() => undefined} onUnstitch={() => undefined} />);
    for (const region of [
      'Identity', 'Primary stats', 'Vitals and current status', 'Army', 'Learned skills',
      'Equipped artifacts', 'Artifact backpack', 'Consumables', 'Special controls and obligations',
    ]) {
      expect(html).toContain(region);
    }
    expect(html).not.toContain('hero-details-tabs');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('one-screen management');
    const source = readFileSync(new URL('../components/AdventureHeroDetails.tsx', import.meta.url), 'utf8');
    for (const route of [
      'EQUIPMENT_SLOTS', 'slotAccepts', 'SPLIT_ARMY', 'DIG_CACHE', 'DECLARE_RESONANCE',
      'CHOOSE_NEXT_OMEN', 'onUseItem', 'Open adventure spellbook',
    ]) expect(source).toContain(route);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps every primary adventure route wired without adding core actions', () => {
    const source = readFileSync(new URL('../components/AdventureScreen.tsx', import.meta.url), 'utf8');
    for (const route of [
      'AdventureStructureDialog', 'AdventurePalimpsestDialog', 'ExchangeScreen',
      'AdventureSpellbook', 'AdventureItemDialog', 'onOpenCastle', 'onSave', 'onExport',
      'onImport', 'onShare', "dispatch({ type: 'END_TURN'", "dispatch({ type: 'RETIRE'",
    ]) expect(source).toContain(route);
    expect(source).not.toContain('map-service-card');
  });
});
