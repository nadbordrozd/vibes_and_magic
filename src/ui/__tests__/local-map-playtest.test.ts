import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createBlankEditorMap, createDefaultEditorCastle, createDefaultEditorHero,
  createDefaultEditorPlayer,
} from '../../core/mapEditor';
import { createGame } from '../../core/game';
import { encodeLocalMapReference, parseLocalMapReference } from '../../core/mapReference';
import {
  actionSave, CONTENT_HASH, createGameLink, loadGameDetailed, loadGameLink,
  replaySave, saveGame, stateHash, type StorageLike,
} from '../persistence';
import { createGameMapRepository } from '../mapRepository';
import { freezeEditorMapRevision, saveEditorMapDraft } from '../mapPersistence';
import { MapEditor } from '../components/MapEditor';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function playable() {
  const document = createBlankEditorMap({
    id: 'revision-pin', name: 'Revision Pin', author: 'Mapwright', style: 'Playtest',
    width: 12, height: 8, terrain: 'meadow',
  });
  document.victory = {
    type: 'conquest', flavor: 'Keep the old road.', mechanics: 'Defeat every active rival.',
  };
  document.players = [
    createDefaultEditorPlayer('p1', 'hearthguard', 'human'),
    createDefaultEditorPlayer('p2', 'woundWrights', 'dormant'),
  ];
  document.castles = [
    createDefaultEditorCastle('red-keep', { x: 1, y: 1 }, 'p1', 'hearthguard'),
    createDefaultEditorCastle('blue-keep', { x: 8, y: 5 }, 'p2', 'woundWrights'),
  ];
  document.heroes = [
    createDefaultEditorHero('red-one', { x: 2, y: 2 }, 'p1', 'hearthguard', 'aldith'),
    createDefaultEditorHero('red-two', { x: 4, y: 3 }, 'p1', 'hearthguard', 'corwin'),
    createDefaultEditorHero('blue-one', { x: 9, y: 6 }, 'p2', 'woundWrights', 'petra'),
  ];
  return document;
}

function value<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

describe('exact local map campaign references', () => {
  it('strictly encodes and decodes the immutable identity', () => {
    const mapId = encodeLocalMapReference({
      documentId: 'revision-pin', revision: 12, mapHash: '0123abcd',
    });
    expect(mapId).toBe('local:v1:revision-pin:r12:h0123abcd');
    expect(parseLocalMapReference(mapId)).toEqual({
      kind: 'local', mapId, documentId: 'revision-pin', revision: 12, mapHash: '0123abcd',
    });
    expect(parseLocalMapReference('local:v1:Revision Pin:r0:hxyz')).toBeNull();
  });

  it('creates declared multi-hero/dormant setup deterministically and pins replay to revision', async () => {
    const storage = new MemoryStorage();
    const frozen = value(freezeEditorMapRevision(playable(), storage));
    const mapId = encodeLocalMapReference({
      documentId: frozen.document.id,
      revision: frozen.document.revision,
      mapHash: frozen.mapHash,
    });
    const repository = createGameMapRepository(storage);
    expect(repository.has(mapId)).toBe(true);
    const options = { seed: 7001, mapId, p1: 'ai' as const, p2: 'ai' as const };
    const first = createGame(options, repository);
    expect(createGame(options, repository)).toEqual(first);
    expect(first.map.id).toBe(mapId);
    expect(first.players.p1.controller).toBe('human');
    expect(first.players.p2.controller).toBe('dormant');
    expect(first.players.p1.heroes.map((hero) => hero.id)).toEqual(['red-one', 'red-two']);
    expect(first.players.p2.heroes.map((hero) => hero.id)).toEqual(['blue-one']);
    expect(first.castles.map((castle) => castle.id)).toEqual(['red-keep', 'blue-keep']);

    const save = actionSave(first);
    expect(Object.keys(save).sort()).toEqual(
      ['actionLog', 'contentHash', 'difficulty', 'mapId', 'seed'],
    );
    expect(save.contentHash).not.toBe(CONTENT_HASH);
    expect(save.mapId).toBe(mapId);
    expect(stateHash(replaySave(save, true, undefined, repository))).toBe(stateHash(first));
    const link = await createGameLink(first);
    expect(stateHash(await loadGameLink(link.fragment, repository))).toBe(stateHash(first));
    expect(saveGame(first, storage)).not.toBeNull();
    expect(Object.keys(JSON.parse(storage.getItem('border-marches.save.v4')!)).sort()).toEqual(
      ['actionLog', 'contentHash', 'difficulty', 'mapId', 'seed'],
    );
    expect(storage.getItem('border-marches.save.v4.initial')).toBeNull();
    expect(stateHash(loadGameDetailed(storage).state!)).toBe(stateHash(first));

    const newer = playable();
    newer.revision = 2;
    newer.metadata.name = 'A Different Draft';
    value(saveEditorMapDraft(newer, storage));
    expect(stateHash(replaySave(save, true, undefined, repository))).toBe(stateHash(first));
  });

  it('refuses missing revisions and hash mismatches without fallback', () => {
    const storage = new MemoryStorage();
    const frozen = value(freezeEditorMapRevision(playable(), storage));
    const repository = createGameMapRepository(storage);
    const missing = encodeLocalMapReference({
      documentId: frozen.document.id, revision: 99, mapHash: frozen.mapHash,
    });
    const mismatch = encodeLocalMapReference({
      documentId: frozen.document.id, revision: 1, mapHash: 'deadbeef',
    });
    expect(repository.has(missing)).toBe(false);
    expect(repository.has(mismatch)).toBe(false);
    expect(() => repository.resolve(missing, 1)).toThrow(/revision 99 is required.*Import/);
    expect(() => repository.resolve(mismatch, 1)).toThrow(/hash .*requires deadbeef.*exact matching/);

    const exact = encodeLocalMapReference({
      documentId: frozen.document.id, revision: 1, mapHash: frozen.mapHash,
    });
    saveGame(createGame({ seed: 2, mapId: exact, p1: 'human', p2: 'ai' }, repository), storage);
    const campaignOnly = new MemoryStorage();
    for (const [key, value] of storage.values) if (key.startsWith('border-marches.save.v4')) {
      campaignOnly.setItem(key, value);
    }
    const loaded = loadGameDetailed(campaignOnly);
    expect(loaded.state).toBeNull();
    expect(loaded.error).toMatch(/revision 1 is required.*Import its \.vam-map\.json/);
  });
});

describe('local map play controls', () => {
  it('offers frozen library play and save/freeze test play with stable disabled reasons', () => {
    const storage = new MemoryStorage();
    value(freezeEditorMapRevision(playable(), storage));
    const library = renderToStaticMarkup(createElement(MapEditor, {
      storage, onReturnToTitle: () => undefined, onPlayMap: () => undefined,
    }));
    expect(library).toContain('frozen revision');
    expect(library).toContain('>Play<');
    expect(library).toContain('Duplicate as draft');

    const workspace = renderToStaticMarkup(createElement(MapEditor, {
      storage, initialDocument: playable(), onReturnToTitle: () => undefined,
      onPlayMap: () => undefined,
    }));
    expect(workspace).toContain('Save, freeze &amp; test play');
    expect(workspace).not.toContain('Fix every validation error before test play.');

    const invalid = createBlankEditorMap({
      id: 'invalid-launch', name: '', width: 4, height: 4, terrain: 'meadow',
    });
    const invalidWorkspace = renderToStaticMarkup(createElement(MapEditor, {
      storage, initialDocument: invalid, onReturnToTitle: () => undefined,
      onPlayMap: () => undefined,
    }));
    expect(invalidWorkspace).toContain('Fix every validation error before test play.');
    expect(invalidWorkspace).toContain('playable.active_player.required');
  });
});
