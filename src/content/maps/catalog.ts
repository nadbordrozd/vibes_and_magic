import { convertEditorMapDocument, hashEditorMapDocument,
  validateEditorMapDocument } from '../../core/mapEditor';
import type { EditorMapDocument } from '../../core/mapEditor';
import type { GameMap, LegacyBuiltInMapId, MapId } from '../../core/types';
import type { GameMapRepository, ResolvedGameMap } from '../../core/mapRepository';
import { MapResolutionError } from '../../core/mapRepository';
import { createBorderMarches } from './borderMarches';
import { createCrosstitch, createCrosstitchKit } from './crosstitch';
import { createTornSound } from './tornSound';
import { createManywhere } from './manywhere';
import { createGrandMuster } from './grandMuster';
import { createCrookedCrown } from './crookedCrown';
import { createSixfoldTrial } from './sixfoldTrial';
import { BUILT_IN_PORTABLE_MAPS } from './authored';

export const LEGACY_MAP_FACTORIES = {
  'border-marches': createBorderMarches,
  crosstitch: createCrosstitch,
  'crosstitch-kit': createCrosstitchKit,
  'torn-sound': createTornSound,
  manywhere: createManywhere,
  'grand-muster': createGrandMuster,
  'crooked-crown': createCrookedCrown,
  'sixfold-trial': createSixfoldTrial,
} as const satisfies Record<LegacyBuiltInMapId, (seed?: number) => GameMap>;

export type LegacyMapId = keyof typeof LEGACY_MAP_FACTORIES;
export const LEGACY_MAP_IDS = Object.keys(LEGACY_MAP_FACTORIES) as LegacyMapId[];

type PortableEntry = { id: string; document: unknown };

export function createBuiltInMapRepository(
  entries: readonly PortableEntry[] = BUILT_IN_PORTABLE_MAPS,
): GameMapRepository {
  const portableById = new Map<string, EditorMapDocument>(entries.map((entry) => [
    entry.id, entry.document as EditorMapDocument,
  ]));
  return {
    has(mapId) {
      return Object.hasOwn(LEGACY_MAP_FACTORIES, mapId) || portableById.has(mapId);
    },
    resolve(mapId, seed): ResolvedGameMap {
      const factory = LEGACY_MAP_FACTORIES[mapId as LegacyMapId];
      if (factory) return {
        mapId, map: factory(seed), setup: null, mapHash: null, source: 'legacy-built-in',
      };
      const document = portableById.get(mapId);
      if (!document) throw new MapResolutionError(
        'map-not-found', `Built-in map "${mapId}" is not installed in this build.`,
      );
      const diagnostics = validateEditorMapDocument(document)
        .filter((item) => item.severity === 'error');
      if (diagnostics.length) throw new MapResolutionError(
        'map-invalid', `Built-in portable map "${mapId}" is invalid: ${diagnostics[0].message}`,
      );
      const converted = convertEditorMapDocument(document, seed);
      converted.map.id = mapId;
      return {
        mapId, ...converted,
        mapHash: hashEditorMapDocument(document), source: 'portable-built-in',
      };
    },
  };
}

export const builtInMapRepository = createBuiltInMapRepository();

export function builtInPortableMapDocuments(): readonly EditorMapDocument[] {
  return (BUILT_IN_PORTABLE_MAPS as readonly PortableEntry[])
    .map((entry) => entry.document as EditorMapDocument);
}

export function builtInPortableMapDocument(mapId: string): EditorMapDocument | null {
  return builtInPortableMapDocuments().find((document) => document.id === mapId) ?? null;
}
