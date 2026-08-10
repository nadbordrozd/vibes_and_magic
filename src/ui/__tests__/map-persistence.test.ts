import { describe, expect, it } from 'vitest';
import {
  createBlankEditorMap,
  createDefaultEditorCastle,
  createDefaultEditorPlayer,
  type EditorMapDocument,
} from '../../core/mapEditor';
import { encodeLocalMapReference } from '../../core/mapReference';
import {
  deleteEditorMap,
  duplicateEditorMap,
  EDITOR_MAP_STORAGE_NAMESPACE,
  exportEditorMapFile,
  exportFrozenEditorMapReference,
  freezeEditorMapRevision,
  importEditorMapFile,
  listEditorMaps,
  loadEditorMapDraft,
  loadEditorMapRevision,
  renameEditorMap,
  saveEditorMapDraft,
} from '../mapPersistence';
import type { StorageLike } from '../persistence';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('storage blocked');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('quota exceeded');
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.failWrites) throw new Error('storage blocked');
    this.values.delete(key);
  }
}

function map(id: string, name = id): EditorMapDocument {
  const document = createBlankEditorMap({
    id, name, width: 8, height: 6, terrain: 'meadow',
  });
  document.victory = {
    type: 'conquest', flavor: 'Keep a banner flying.', mechanics: 'Defeat every rival.',
  };
  document.players = [createDefaultEditorPlayer('p1', 'hearthguard')];
  document.castles = [createDefaultEditorCastle(
    `${id}-castle`, { x: 1, y: 1 }, 'p1', 'hearthguard',
  )];
  return document;
}

function value<T>(result: { ok: true; value: T } | { ok: false }): T {
  expect(result.ok).toBe(true);
  return (result as { ok: true; value: T }).value;
}

describe('local editor map repository', () => {
  it('keeps multiple maps and their summaries independently', () => {
    const storage = new MemoryStorage();
    value(saveEditorMapDraft(map('ash-road', 'Ash Road'), storage));
    value(saveEditorMapDraft(map('moss-gate', 'Moss Gate'), storage));
    expect(value(listEditorMaps(storage)).maps.map((summary) => summary.id))
      .toEqual(['ash-road', 'moss-gate']);
    expect(value(loadEditorMapDraft('ash-road', storage)).document.metadata.name).toBe('Ash Road');
    expect(value(loadEditorMapDraft('moss-gate', storage)).document.metadata.name).toBe('Moss Gate');
  });

  it('forks changed drafts after freezing and leaves exact revisions immutable', () => {
    const storage = new MemoryStorage();
    const original = map('ash-road', 'Ash Road');
    value(freezeEditorMapRevision(original, storage));
    original.tiles[0][0].terrain = 'deepwood';
    const changed = value(saveEditorMapDraft(original, storage));
    expect(changed.document.revision).toBe(2);
    expect(value(loadEditorMapRevision('ash-road', 1, storage)).document.tiles[0][0].terrain)
      .toBe('meadow');
    changed.document.tiles[0][0].terrain = 'water';
    expect(value(loadEditorMapRevision('ash-road', 1, storage)).document.tiles[0][0].terrain)
      .toBe('meadow');
    expect(value(loadEditorMapDraft('ash-road', storage)).document.tiles[0][0].terrain)
      .toBe('deepwood');
  });

  it('freezes revisions idempotently and loads exact revisions', () => {
    const storage = new MemoryStorage();
    const first = value(freezeEditorMapRevision(map('ash-road'), storage));
    expect(first.immutable).toBe(true);
    expect(value(freezeEditorMapRevision(first.document, storage)).mapHash).toBe(first.mapHash);
    const edited = first.document;
    edited.metadata.description = 'Changed';
    const secondDraft = value(saveEditorMapDraft(edited, storage));
    expect(secondDraft.document.revision).toBe(2);
    value(freezeEditorMapRevision(secondDraft.document, storage));
    expect(value(listEditorMaps(storage)).maps[0].revisions).toEqual([1, 2]);
    expect(value(loadEditorMapRevision('ash-road', 2, storage)).document.metadata.description)
      .toBe('Changed');
  });

  it('preserves incomplete drafts but refuses to freeze them as playable revisions', () => {
    const storage = new MemoryStorage();
    const draft = createBlankEditorMap({
      id: 'unfinished-road', name: 'Unfinished Road', width: 4, height: 4, terrain: 'meadow',
    });
    expect(saveEditorMapDraft(draft, storage).ok).toBe(true);
    expect(freezeEditorMapRevision(draft, storage)).toMatchObject({
      ok: false,
      error: {
        code: 'map-not-playable',
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: 'playable.active_player.required' }),
        ]),
      },
    });
    expect(value(listEditorMaps(storage)).maps[0]).toMatchObject({ revisions: [] });
  });

  it('supports display-name rename and duplicate-as-copy without rewriting frozen history', () => {
    const storage = new MemoryStorage();
    value(freezeEditorMapRevision(map('ash-road', 'Ash Road'), storage));
    const renamed = value(renameEditorMap('ash-road', 'The Ash Road', storage));
    expect(renamed.document.revision).toBe(2);
    expect(value(loadEditorMapRevision('ash-road', 1, storage)).document.metadata.name)
      .toBe('Ash Road');
    const copy = value(duplicateEditorMap('ash-road', storage, {
      id: 'ash-road-remix', name: 'Ash Road Remix',
    }));
    expect(copy.document).toMatchObject({
      id: 'ash-road-remix', revision: 1, metadata: { name: 'Ash Road Remix' },
      source: { kind: 'local', documentId: 'ash-road', revision: 2 },
    });
  });

  it('requires an exact confirmation token before deletion', () => {
    const storage = new MemoryStorage();
    value(saveEditorMapDraft(map('ash-road'), storage));
    expect(deleteEditorMap('ash-road', undefined, storage)).toMatchObject({
      ok: false, error: { code: 'confirmation-required' },
    });
    expect(loadEditorMapDraft('ash-road', storage).ok).toBe(true);
    expect(deleteEditorMap('ash-road', { confirmDocumentId: 'moss-gate' }, storage).ok).toBe(false);
    expect(deleteEditorMap('ash-road', { confirmDocumentId: 'ash-road' }, storage).ok).toBe(true);
    expect(loadEditorMapDraft('ash-road', storage)).toMatchObject({
      ok: false, error: { code: 'map-not-found' },
    });
  });

  it('diagnoses ID, stale-draft, and revision collisions', () => {
    const storage = new MemoryStorage();
    const first = value(saveEditorMapDraft(map('ash-road'), storage));
    expect(saveEditorMapDraft(map('ash-road'), storage, { createOnly: true })).toMatchObject({
      ok: false, error: { code: 'id-collision' },
    });
    const concurrent = first.document;
    concurrent.metadata.description = 'First writer';
    value(saveEditorMapDraft(concurrent, storage, { expectedDraftHash: first.mapHash }));
    concurrent.metadata.description = 'Stale writer';
    expect(saveEditorMapDraft(concurrent, storage, { expectedDraftHash: first.mapHash }))
      .toMatchObject({ ok: false, error: { code: 'draft-collision' } });
    const newer = value(loadEditorMapDraft('ash-road', storage)).document;
    newer.revision = 3;
    value(saveEditorMapDraft(newer, storage));
    newer.revision = 2;
    expect(saveEditorMapDraft(newer, storage)).toMatchObject({
      ok: false, error: { code: 'revision-collision', revision: 2 },
    });
  });

  it('keeps corrupt and unsupported records visible and non-destructive', () => {
    const storage = new MemoryStorage();
    value(saveEditorMapDraft(map('ash-road'), storage));
    const key = [...storage.values.keys()].find((candidate) => candidate.includes('.document.'))!;
    storage.values.set(key, '{bad json');
    expect(value(listEditorMaps(storage)).maps[0]).toMatchObject({
      id: 'ash-road', compatibility: 'corrupt', name: 'Unreadable local map',
      diagnostics: [{ code: 'storage.envelope.corrupt' }],
    });
    const corrupt = loadEditorMapDraft('ash-road', storage);
    expect(corrupt).toMatchObject({ ok: false, error: { code: 'storage-record-corrupt' } });
    expect(corrupt.ok ? '' : corrupt.error.rawRecord).toBe('{bad json');
    expect(storage.values.get(key)).toBe('{bad json');
    storage.values.set(key, JSON.stringify({
      envelopeType: 'vibes-and-magic-local-map', schemaVersion: 99,
    }));
    expect(value(listEditorMaps(storage)).maps[0].compatibility).toBe('unsupported');
    expect(loadEditorMapDraft('ash-road', storage)).toMatchObject({
      ok: false, error: { code: 'storage-version-unsupported' },
    });
  });

  it('reports catalog incompatibility while retaining an editable draft', () => {
    const storage = new MemoryStorage();
    const document = map('ash-road');
    document.compatibility.catalogHash = 'older-catalog';
    value(saveEditorMapDraft(document, storage));
    const summary = value(listEditorMaps(storage)).maps[0];
    expect(summary.compatibility).toBe('diagnostic');
    expect(summary.diagnostics.map((diagnostic) => diagnostic.code))
      .toContain('compatibility.catalog.mismatch');
  });

  it('returns actionable unavailable, read, and quota-like storage failures', () => {
    expect(listEditorMaps(null)).toMatchObject({
      ok: false, error: { code: 'storage-unavailable' },
    });
    const storage = new MemoryStorage();
    storage.failReads = true;
    expect(listEditorMaps(storage)).toMatchObject({
      ok: false, error: { code: 'storage-read-failed' },
    });
    storage.failReads = false;
    storage.failWrites = true;
    expect(saveEditorMapDraft(map('ash-road'), storage)).toMatchObject({
      ok: false, error: { code: 'storage-write-failed' },
    });
  });

  it('exports canonical byte-stable files with promotion information', () => {
    const document = map('ash-road', 'Ash Road');
    document.overlays.roads = [{ x: 4, y: 2 }, { x: 0, y: 0 }];
    const exported = value(exportEditorMapFile(document));
    expect(exported.filename).toBe('ash-road.vam-map.json');
    expect(exported.mimeType).toBe('application/json');
    expect(exported.promotion).toMatchObject({
      documentId: 'ash-road', revision: 1, eligible: true,
      suggestedRepositoryPath: 'src/content/maps/authored/ash-road.vam-map.json',
    });
    expect(value(exportEditorMapFile(JSON.parse(exported.contents))).contents)
      .toBe(exported.contents);
  });

  it('exports only the exact frozen revision required by a local campaign', () => {
    const storage = new MemoryStorage();
    const first = value(freezeEditorMapRevision(map('ash-road', 'Frozen Ash Road'), storage));
    const draft = first.document;
    draft.metadata.name = 'Newer Draft';
    value(saveEditorMapDraft(draft, storage));
    const reference = encodeLocalMapReference({
      documentId: 'ash-road', revision: 1, mapHash: first.mapHash,
    });
    const exported = value(exportFrozenEditorMapReference(reference, storage));
    expect(JSON.parse(exported.contents).metadata.name).toBe('Frozen Ash Road');
    expect(exported.mapHash).toBe(first.mapHash);

    const missing = encodeLocalMapReference({
      documentId: 'ash-road', revision: 9, mapHash: first.mapHash,
    });
    expect(exportFrozenEditorMapReference(missing, storage)).toMatchObject({
      ok: false,
      error: { code: 'map-not-found', message: expect.stringContaining('Import the required') },
    });
    const mismatch = encodeLocalMapReference({
      documentId: 'ash-road', revision: 1, mapHash: '00000000',
    });
    expect(exportFrozenEditorMapReference(mismatch, storage)).toMatchObject({
      ok: false,
      error: {
        code: 'map-hash-mismatch', message: expect.stringContaining('newest draft was not exported'),
      },
    });
  });

  it('round-trips imports and keeps malformed or unsupported files out of storage', () => {
    const storage = new MemoryStorage();
    const exported = value(exportEditorMapFile(map('ash-road')));
    const imported = value(importEditorMapFile(exported.contents, storage));
    expect(imported.document).toEqual(map('ash-road'));
    expect(value(exportEditorMapFile(
      value(loadEditorMapDraft('ash-road', storage)).document,
    )).contents).toBe(exported.contents);
    const before = new Map(storage.values);
    expect(importEditorMapFile('{', storage)).toMatchObject({
      ok: false, error: { code: 'import-invalid' },
    });
    expect(importEditorMapFile(exported.contents.replace(
      '"schemaVersion": 1', '"schemaVersion": 99',
    ), storage)).toMatchObject({ ok: false, error: { code: 'import-invalid' } });
    expect(storage.values).toEqual(before);
  });

  it('offers cancel, replace-draft, and import-as-copy collision choices', () => {
    const storage = new MemoryStorage();
    const first = map('ash-road', 'Original');
    value(freezeEditorMapRevision(first, storage));
    const incoming = map('ash-road', 'Imported');
    const exported = value(exportEditorMapFile(incoming));
    expect(importEditorMapFile(exported.contents, storage)).toMatchObject({
      ok: false, error: { code: 'import-cancelled' },
    });
    const importedCopy = value(importEditorMapFile(
      exported.contents, storage, { collision: 'copy' },
    ));
    expect(importedCopy.document).toMatchObject({
        id: 'ash-road-copy', revision: 1,
        source: { kind: 'local', documentId: 'ash-road', revision: 1 },
      });
    expect(importedCopy.immutable).toBe(true);
    expect(loadEditorMapRevision('ash-road-copy', 1, storage).ok).toBe(true);
    expect(value(importEditorMapFile(exported.contents, storage, { collision: 'replace' }))
      .document.metadata.name).toBe('Imported');
    expect(value(loadEditorMapRevision('ash-road', 1, storage)).document.metadata.name)
      .toBe('Original');
  });

  it('never reads, writes, rotates, or deletes campaign save slots', () => {
    const storage = new MemoryStorage();
    const campaignKeys = [
      'border-marches.save.v4', 'border-marches.save.v4.meta',
      'border-marches.save.v4.auto-0', 'border-marches.save.v4.auto-cursor',
    ];
    campaignKeys.forEach((key) => storage.values.set(key, `sentinel:${key}`));
    const before = campaignKeys.map((key) => storage.values.get(key));
    value(freezeEditorMapRevision(map('ash-road'), storage));
    value(duplicateEditorMap('ash-road', storage));
    value(deleteEditorMap('ash-road-copy', { confirmDocumentId: 'ash-road-copy' }, storage));
    expect(campaignKeys.map((key) => storage.values.get(key))).toEqual(before);
    expect([...storage.values.keys()].filter((key) => key.startsWith(EDITOR_MAP_STORAGE_NAMESPACE)))
      .not.toHaveLength(0);
  });
});
