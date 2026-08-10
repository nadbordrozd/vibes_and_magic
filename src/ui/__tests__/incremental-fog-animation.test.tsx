import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { tile } from '../../content/terrain';
import { createGame } from '../../core/game';
import { revealForPlayer } from '../../core/map/visibility';
import { AdventureMap } from '../components/AdventureMap';

function fixture() {
  const state = createGame({ seed: 4802, p1: 'human', p2: 'dormant' });
  state.map = {
    ...state.map, width: 15, height: 9,
    terrain: Array.from({ length: 9 }, () =>
      Array.from({ length: 15 }, () => tile('meadow'))),
    objects: [], roads: [], seams: [],
  };
  state.castles = [];
  state.mapEffects = [];
  const hero = state.players.p1.hero!;
  hero.position = { x: 1, y: 4 };
  state.players.p1.heroes = [hero];
  state.players.p1.hero = hero;
  state.players.p1.explored = revealForPlayer([], state.map, hero, []);
  return { state, hero };
}

function renderAt(index: number) {
  const { state, hero } = fixture();
  const path = [
    { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
    { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
  ];
  const before = JSON.stringify(state);
  const html = renderToStaticMarkup(<AdventureMap state={state} hero={hero}
    reachable={new Set()} path={[]} movement={{ path, index }}
    mapStep={140} onTile={() => undefined} onSelectHero={() => undefined}
    onMeetHero={() => undefined} onPreviewHero={() => undefined}
    onPreview={() => undefined} onPickup={() => undefined} />);
  expect(JSON.stringify(state)).toBe(before);
  return html;
}

describe('incremental fog animation presentation', () => {
  it('shows only vision through the current animated path index', () => {
    const first = renderAt(1);
    expect(first).toContain('data-movement-index="1"');
    expect(first).not.toContain('data-fog-key="7,4"');
    expect(first).toContain('data-fog-key="8,4"');

    const middle = renderAt(4);
    expect(middle).toContain('data-movement-index="4"');
    expect(middle).not.toContain('data-fog-key="10,4"');
    expect(middle).toContain('data-fog-key="11,4"');

    const last = renderAt(6);
    expect(last).toContain('data-movement-index="6"');
    expect(last).not.toContain('data-fog-key="12,4"');
  });

  it('keeps late fog after mountain/world painting while the prefix changes', () => {
    const html = renderAt(3);
    expect(html.indexOf('fog-occlusion')).toBeGreaterThan(html.indexOf('landscape-ground'));
    expect(html.indexOf('fog-occlusion')).toBeGreaterThan(html.indexOf('map-hero'));
    expect(html).toContain('data-moving="true"');
  });
});
