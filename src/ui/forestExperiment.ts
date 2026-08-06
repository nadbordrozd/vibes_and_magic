import type { TerrainDecoration } from '../content/terrain';
import { terrainIdAt } from '../content/terrain';
import type { Coord, GameMap } from '../core/types';

export type ForestExperimentMode = 'scattered' | 'border';

export interface ForestReviewCanopy {
  key: string;
  mode: ForestExperimentMode;
  position: Coord;
}

export function forestExperimentMode(search: string): ForestExperimentMode | null {
  const value = new URLSearchParams(search).get('forestExperiment');
  return value === 'scattered' || value === 'border' ? value : null;
}

export function deriveForestReviewCanopies(
  map: GameMap,
  decorations: readonly TerrainDecoration[],
  mode: ForestExperimentMode,
): ForestReviewCanopy[] {
  if (mode === 'scattered') {
    return decorations.filter((decoration) =>
      terrainIdAt(map, decoration.position) === 'deepwood').map((decoration) => ({
      key: `forest-review:scattered:${decoration.position.x},${decoration.position.y}`,
      mode, position: decoration.position,
    }));
  }
  const canopies: ForestReviewCanopy[] = [];
  for (let y = 0; y < map.height; y += 1) for (let x = 0; x < map.width; x += 1) {
    const position = { x, y };
    if (terrainIdAt(map, position) !== 'deepwood') continue;
    const border = [
      { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
    ].some((neighbor) => neighbor.x < 0 || neighbor.y < 0
      || neighbor.x >= map.width || neighbor.y >= map.height
      || terrainIdAt(map, neighbor) !== 'deepwood');
    if (border) canopies.push({
      key: `forest-review:border:${x},${y}`, mode, position,
    });
  }
  return canopies;
}

export function canopyShouldFade(canopy: Coord, subjects: readonly Coord[]): boolean {
  return subjects.some((subject) => subject.y <= canopy.y
    && canopy.y - subject.y <= 1 && Math.abs(canopy.x - subject.x) <= 1);
}
