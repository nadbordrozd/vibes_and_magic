import type { EditorRuntimeSetupInputs } from './mapEditor/types';
import type { GameMap, MapId } from './types';

export interface ResolvedGameMap {
  mapId: MapId;
  map: GameMap;
  setup: EditorRuntimeSetupInputs | null;
  /** Portable normalized-map hash. Legacy factories participate in the ordinary build hash. */
  mapHash: string | null;
  source: 'legacy-built-in' | 'portable-built-in' | 'local';
}

export interface GameMapRepository {
  has(mapId: string): boolean;
  resolve(mapId: MapId, seed: number): ResolvedGameMap;
}

export class MapResolutionError extends Error {
  constructor(
    public readonly code: 'map-reference-invalid' | 'map-not-found' | 'map-hash-mismatch'
      | 'map-invalid',
    message: string,
  ) {
    super(message);
    this.name = 'MapResolutionError';
  }
}
