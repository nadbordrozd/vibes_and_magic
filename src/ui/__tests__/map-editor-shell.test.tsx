import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { cloneEditorMapDocument, hashEditorMapDocument,
  validateEditorMapDocument } from '../../core/mapEditor';
import { ADVENTURE_PROP_CATALOG } from '../../content/adventureProps';
import { CAMPAIGN_PRESENTATIONS } from '../campaignPresentation';
import { MapEditor } from '../components/MapEditor';
import {
  exportEditorMapFile, importEditorMapFile, listEditorMaps, loadEditorMapDraft,
  saveEditorMapDraft,
} from '../mapPersistence';
import type { StorageLike } from '../persistence';
import {
  BUILT_IN_EDITOR_CLONE_SEED, cloneBuiltInMapForEditor, createNewBlankEditorMap,
  editorDocumentIsDirty,
} from '../mapEditorLibrary';
import {
  EMPTY_TERRAIN_HISTORY, commitTerrainEdit, createPropPlacementEdit,
} from '../mapEditorTerrain';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function value<T>(result: { ok: true; value: T } | { ok: false }): T {
  expect(result.ok).toBe(true);
  return (result as { ok: true; value: T }).value;
}

describe('map editor title route and library shell', () => {
  it('renders every first-class map-library task and every built-in source', () => {
    const storage = new MemoryStorage();
    const local = createNewBlankEditorMap({
      id: 'local-crossing', name: 'Local Crossing', width: 12, height: 9,
      terrain: 'meadow', skin: 'default', playerCount: 2,
    });
    value(saveEditorMapDraft(local, storage));
    const html = renderToStaticMarkup(
      <MapEditor storage={storage} onReturnToTitle={() => undefined} />,
    );
    for (const label of [
      'New blank map', 'Edit local map', 'Clone built-in map', 'Import map',
      'Return to title', 'Local Crossing', '.vam-map.json',
    ]) expect(html).toContain(label);
    for (const map of CAMPAIGN_PRESENTATIONS) expect(html).toContain(map.name);
    expect(html).toContain('Fill terrain');
    expect(html).toContain('Terrain skin');
    expect(html).toContain('Player slots');
  });

  it('renders unavailable storage as an actionable error without hiding authoring choices', () => {
    const html = renderToStaticMarkup(
      <MapEditor storage={null} onReturnToTitle={() => undefined} />,
    );
    expect(html).toContain('Browser storage is unavailable');
    expect(html).toContain('Export the map to keep a portable copy');
    expect(html).toContain('New blank map');
  });
});

describe('map editor document opening flows', () => {
  it('creates a blank rectangular draft with catalog-derived contiguous slots', () => {
    const document = createNewBlankEditorMap({
      id: '  Moss Gate  ', name: 'Moss Gate', width: 7, height: 5,
      terrain: 'deepwood', skin: 'mossy', playerCount: 6,
    });
    expect(document.id).toBe('moss-gate');
    expect(document.tiles).toHaveLength(5);
    expect(document.tiles.every((row) => row.length === 7)).toBe(true);
    expect(document.tiles.flat().every((tile) =>
      tile.terrain === 'deepwood' && tile.skin === 'mossy')).toBe(true);
    expect(document.players.map((player) => player.id))
      .toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(document.players.map((player) => player.faction)).toEqual([
      'hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass',
    ]);
    expect(document.players.map((player) => player.controller))
      .toEqual(['human', 'ai', 'ai', 'ai', 'ai', 'ai']);
  });

  it.each(CAMPAIGN_PRESENTATIONS)(
    'clones $name deterministically with explicit starts and a new local identity',
    (presentation) => {
      const id = `${presentation.id}-editor-copy`;
      const first = cloneBuiltInMapForEditor(presentation.id, id, `${presentation.name} Copy`);
      const second = cloneBuiltInMapForEditor(presentation.id, id, `${presentation.name} Copy`);
      expect(BUILT_IN_EDITOR_CLONE_SEED).toBe(1);
      expect(first).toEqual(second);
      expect(first.source).toEqual({ kind: 'builtIn', mapId: presentation.id });
      expect(first.players.length).toBeGreaterThan(0);
      expect(first.castles.some((castle) => castle.owner !== 'neutral')).toBe(true);
      expect(first.heroes.length).toBeGreaterThan(0);
      expect(first.heroes.every((hero) => hero.army.length > 0)).toBe(true);
      expect(validateEditorMapDocument(first)).toEqual([]);
    },
  );

  it('opens local, clone, and import results while failed imports preserve stored bytes', () => {
    const storage = new MemoryStorage();
    const local = createNewBlankEditorMap({
      id: 'local-map', name: 'Local Map', width: 8, height: 6,
      terrain: 'meadow', skin: 'default', playerCount: 1,
    });
    value(saveEditorMapDraft(local, storage));
    expect(value(loadEditorMapDraft('local-map', storage)).document.metadata.name).toBe('Local Map');

    const clone = cloneBuiltInMapForEditor(
      'border-marches', 'border-remix', 'Border Remix',
    );
    value(saveEditorMapDraft(clone, storage, { createOnly: true }));
    const portable = value(exportEditorMapFile(clone)).contents
      .replace('"border-remix"', '"portable-remix"');
    value(importEditorMapFile(portable, storage));
    expect(value(listEditorMaps(storage)).maps.map((map) => map.id).sort())
      .toEqual(['border-remix', 'local-map', 'portable-remix']);

    const before = new Map(storage.values);
    expect(importEditorMapFile('{broken', storage)).toMatchObject({
      ok: false, error: { code: 'import-invalid' },
    });
    expect(storage.values).toEqual(before);
  });

  it('requires an explicit import collision choice and keeps replacement/copy separate', () => {
    const storage = new MemoryStorage();
    const document = cloneBuiltInMapForEditor('manywhere', 'many-remix', 'Many Remix');
    const contents = value(exportEditorMapFile(document)).contents;
    value(importEditorMapFile(contents, storage));
    expect(importEditorMapFile(contents, storage)).toMatchObject({
      ok: false, error: { code: 'import-cancelled', documentId: 'many-remix' },
    });
    value(importEditorMapFile(contents, storage, {
      collision: 'copy', copyId: 'many-remix-copy', copyName: 'Many Remix Copy',
    }));
    expect(value(loadEditorMapDraft('many-remix-copy', storage)).document.source)
      .toEqual({ kind: 'local', documentId: 'many-remix', revision: 1 });
    expect(value(importEditorMapFile(contents, storage, { collision: 'replace' }))
      .document.id).toBe('many-remix');
  });
});

describe('map editor workspace shell and navigation safety', () => {
  it('hides advanced map details with useful defaults and shows the terrain canvas', () => {
    const document = createNewBlankEditorMap({
      id: 'shell-map', name: 'Shell Map', width: 10, height: 8,
      terrain: 'meadow', skin: 'default', playerCount: 2,
    });
    const html = renderToStaticMarkup(<MapEditor storage={new MemoryStorage()}
      initialDocument={document} onReturnToTitle={() => undefined} />);
    for (const label of [
      'Map library', 'Title screen', 'Save draft', 'Export map', 'Edit map details',
      'Objective presentation', 'Objective rules', 'Diagnostics', 'Map canvas', 'Terrain',
      'Pencil', 'Unsaved changes',
    ]) expect(html).toContain(label);
    expect(html).not.toContain('Portable identity');
    expect(html).toContain('A custom map created in the in-game editor.');
    expect(html).toContain('Local mapmaker');
    expect(html).toContain('2-player conquest map');
    expect(html).toContain('Claim the realm before your rivals do.');
    expect(html).toContain('Defeat every active opponent.');
    expect(html).toContain('<details class="editor-identity">');
    expect(html).toContain('Editable 10 by 8 terrain map');
    expect(html).toContain('playable.player_start.required');
  });

  it('detects unsaved edits and includes both in-app and browser navigation guards', () => {
    const document = cloneBuiltInMapForEditor(
      'border-marches', 'guard-test', 'Guard Test',
    );
    const baseline = hashEditorMapDocument(document);
    expect(editorDocumentIsDirty(document, baseline)).toBe(false);
    const changed = cloneEditorMapDocument(document);
    changed.metadata.description = 'Changed after opening';
    expect(editorDocumentIsDirty(changed, baseline)).toBe(true);
    expect(editorDocumentIsDirty(document, null)).toBe(true);

    const source = readFileSync(resolve('src/ui/components/MapEditor.tsx'), 'utf8');
    expect(source).toContain("window.addEventListener('beforeunload'");
    expect(source).toContain("setPendingExit(destination)");
    expect(source).toContain('Discard your changes?');
    expect(source).toContain('Keep editing');
  });

  it('persists a prop edit as the new clean baseline and makes a later edit dirty', () => {
    const storage = new MemoryStorage();
    const document = createNewBlankEditorMap({
      id: 'prop-dirty-map', name: 'Prop Dirty Map', width: 8, height: 6,
      terrain: 'meadow', skin: 'default', playerCount: 1,
    });
    const placement = createPropPlacementEdit(
      document, ADVENTURE_PROP_CATALOG[0], { x: 4, y: 3 },
    );
    expect(placement.ok).toBe(true);
    if (!placement.ok) return;
    const changed = commitTerrainEdit(document, EMPTY_TERRAIN_HISTORY, placement.edit).document;
    expect(editorDocumentIsDirty(changed, hashEditorMapDocument(document))).toBe(true);
    const stored = value(saveEditorMapDraft(changed, storage));
    const loaded = value(loadEditorMapDraft(document.id, storage));
    expect(loaded.document.objects).toEqual(changed.objects);
    expect(editorDocumentIsDirty(loaded.document, stored.mapHash)).toBe(false);
    const later = cloneEditorMapDocument(loaded.document);
    later.objects[0].position.x += 1;
    expect(editorDocumentIsDirty(later, stored.mapHash)).toBe(true);
  });

  it('defines distinct desktop and narrow responsive workspace structures', () => {
    const css = readFileSync(resolve('src/ui/styles/map-editor.css'), 'utf8');
    expect(css).toMatch(/\.editor-workspace-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(420px, 1fr\)/);
    expect(css).toMatch(/\.editor-canvas-panel\s*\{[\s\S]*height:\s*max\(620px, calc\(100vh - 180px\)\)/);
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*\.editor-library-grid, \.editor-workspace-grid, \.editor-form-grid\s*\{\s*grid-template-columns: 1fr/);
  });
});
