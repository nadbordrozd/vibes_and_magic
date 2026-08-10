import { builtInMapRepository } from '../content/maps/catalog';
import { convertEditorMapDocument, hashEditorMapDocument } from '../core/mapEditor';
import { MapResolutionError, type GameMapRepository } from '../core/mapRepository';
import { parseLocalMapReference } from '../core/mapReference';
import type { MapId } from '../core/types';
import { loadEditorMapRevision } from './mapPersistence';
import { browserStorage, type StorageLike } from './persistence';

/** Repository composition is the single boundary between game setup and browser-local maps. */
export function createGameMapRepository(
  storage: StorageLike | null = browserStorage(),
): GameMapRepository {
  return {
    has(mapId: string): boolean {
      if (builtInMapRepository.has(mapId)) return true;
      const reference = parseLocalMapReference(mapId);
      if (!reference || !storage) return false;
      const stored = loadEditorMapRevision(reference.documentId, reference.revision, storage);
      return stored.ok && stored.value.mapHash === reference.mapHash
        && hashEditorMapDocument(stored.value.document) === reference.mapHash;
    },
    resolve(mapId: MapId, seed: number) {
      const reference = parseLocalMapReference(mapId);
      if (!reference) return builtInMapRepository.resolve(mapId, seed);
      if (!storage) throw new MapResolutionError(
        'map-not-found',
        `Local map "${reference.documentId}" revision ${reference.revision} is required. Import its .vam-map.json file and try again.`,
      );
      const stored = loadEditorMapRevision(reference.documentId, reference.revision, storage);
      if (!stored.ok) throw new MapResolutionError(
        'map-not-found',
        `Local map "${reference.documentId}" revision ${reference.revision} is required. Import its .vam-map.json file and try again. (${stored.error.message})`,
      );
      const actualHash = hashEditorMapDocument(stored.value.document);
      if (actualHash !== reference.mapHash || stored.value.mapHash !== reference.mapHash) {
        throw new MapResolutionError(
          'map-hash-mismatch',
          `Local map "${reference.documentId}" revision ${reference.revision} has hash ${actualHash}, but this campaign requires ${reference.mapHash}. Import the exact matching .vam-map.json file.`,
        );
      }
      const converted = convertEditorMapDocument(stored.value.document, seed);
      converted.map.id = mapId;
      return {
        mapId, ...converted, mapHash: reference.mapHash, source: 'local' as const,
      };
    },
  };
}
