import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../../core/game';
import { build } from '../../core/game/economy';
import type { BuildingId, GameState } from '../../core/types';
import { SPELLS } from '../../content/spells';
import { CastleScreen } from '../components/CastleScreen';

function buildThrough(state: GameState, ids: BuildingId[]): void {
  state.players.p1.resources = { gold: 100_000, timber: 100, iron: 100, essence: 100 };
  for (const id of ids) {
    state.castles[0].builtOnDay = null;
    build(state, state.castles[0].id, id);
  }
}

describe('Mage Guild 4/5 face-up reveal moment', () => {
  it.each([
    ['mageGuild4', ['mageGuild1', 'mageGuild2', 'mageGuild3', 'townHall', 'mageGuild4']],
    ['mageGuild5', ['mageGuild1', 'mageGuild2', 'mageGuild3', 'townHall', 'mageGuild4',
      'cityHall', 'mageGuild5']],
  ] as const)('stores and logs the exact named %s deal', (buildingId, path) => {
    const state = createGame({ seed: 6018, p1: 'human', p2: 'dormant' });
    buildThrough(state, [...path]);
    const reveal = state.guildReveal!;
    expect(reveal).toMatchObject({ castleId: state.castles[0].id, buildingId });
    expect(reveal.spellIds).toEqual(buildingId === 'mageGuild4'
      ? state.castles[0].guildDeck.slice(10, 12) : state.castles[0].guildDeck.slice(12, 14));
    const named = reveal.spellIds.map((id) => SPELLS[id].name).join(', ');
    expect(state.eventLog.at(-1)).toContain(named);
    expect(state.lastMessage).toContain(named);
  });

  it('survives serialization, renders face-up names/rules, and dismisses exactly once', () => {
    const state = createGame({ seed: 6019, p1: 'human', p2: 'dormant' });
    buildThrough(state, ['mageGuild1', 'mageGuild2', 'mageGuild3', 'townHall', 'mageGuild4']);
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    const html = renderToStaticMarkup(<CastleScreen state={restored} castle={restored.castles[0]}
      dispatch={() => undefined} onClose={() => undefined} />);
    expect(html).toContain('Mage Guild reveal');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('autofocus=""');
    expect(html).toContain('inert=""');
    for (const id of restored.guildReveal!.spellIds) {
      expect(html).toContain(SPELLS[id].name);
      expect(html).toContain(`/assets/icons/spells/${id}.png`);
    }
    const dismissed = apply(restored, { type: 'DISMISS_GUILD_REVEAL' });
    expect(dismissed.guildReveal).toBeNull();
    expect(() => apply(dismissed, { type: 'DISMISS_GUILD_REVEAL' })).not.toThrow();
    expect(state.guildReveal).not.toBeNull();
    expect(() => apply(restored, { type: 'END_TURN' })).toThrow(/Dismiss the face-up/);
    expect(() => apply(restored, {
      type: 'BUILD', castleId: restored.castles[0].id, buildingId: 'cityHall',
    })).toThrow(/Dismiss the face-up/);
  });

  it('pins modal blocking, keyboard dismissal, and narrow-layout contracts', () => {
    const source = renderToStaticMarkup(<CastleScreen
      state={{ ...createGame({ seed: 6020, p1: 'human', p2: 'dormant' }), guildReveal: null }}
      castle={createGame({ seed: 6020, p1: 'human', p2: 'dormant' }).castles[0]}
      dispatch={() => undefined} onClose={() => undefined} />);
    expect(source).not.toContain('guild-reveal-dialog');
    const component = readFileSync('src/ui/components/CastleScreen.tsx', 'utf8');
    const css = readFileSync('src/ui/styles/castle.css', 'utf8');
    expect(component).toContain("event.key === 'Escape'");
    expect(component).toContain('inert={guildReveal ? true : undefined}');
    expect(css).toContain('@media (max-width: 430px)');
    expect(css).toContain('grid-template-columns: 1fr');
  });
});
