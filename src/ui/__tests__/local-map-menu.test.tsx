import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MainMenu } from '../components/MainMenu';
import type { EditorMapSummary } from '../mapPersistence';

const localMap: EditorMapSummary = {
  id: 'ash-road', name: 'The Ash Road', draftRevision: 2, revisions: [1],
  updatedAt: 1, mapHash: '22222222', compatibility: 'compatible', diagnostics: [],
  latestPlayable: {
    revision: 1, mapHash: '11111111', name: 'The Ash Road', author: 'Nadbor',
    style: 'Two-player crossing', width: 36, height: 28,
  },
};

describe('title local-map catalog', () => {
  it('shows exact frozen identity with accessible play/edit/duplicate controls', () => {
    const html = renderToStaticMarkup(<MainMenu
      onStart={() => undefined} savedGame={null} manualSaves={[]} autoSaves={[]}
      onLoad={() => undefined} onImport={() => undefined} onOpenEditor={() => undefined}
      onPlayLocal={() => undefined} localMaps={[localMap]} />);
    for (const text of [
      'Frozen local maps', 'The Ash Road', 'frozen revision 1', '36×28', 'Nadbor',
      'Two-player crossing', 'hash 11111111', 'Edit draft', 'Duplicate as draft', 'Play',
    ]) expect(html).toContain(text);
    expect(html).toContain('Play The Ash Road revision 1');
  });

  it('disables an unplayable local draft with an actionable reason', () => {
    const html = renderToStaticMarkup(<MainMenu
      onStart={() => undefined} savedGame={null} manualSaves={[]} autoSaves={[]}
      onLoad={() => undefined} onImport={() => undefined} onOpenEditor={() => undefined}
      onPlayLocal={() => undefined} localMaps={[{ ...localMap, latestPlayable: null }]} />);
    expect(html).toContain('Freeze a zero-error revision in Map Editor first.');
    expect(html).toContain('disabled');
  });
});
