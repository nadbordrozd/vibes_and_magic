import { describe, expect, it } from 'vitest';
import { createBorderMarches } from '../../content/maps/borderMarches';
import { deriveTerrainDecorations, terrainIdAt } from '../../content/terrain';
import {
  canopyShouldFade, deriveForestReviewCanopies, forestExperimentMode,
} from '../../ui/forestExperiment';

describe('A1 forest-height review modes', () => {
  it('parses only the two explicit renderer review modes', () => {
    expect(forestExperimentMode('?forestExperiment=scattered')).toBe('scattered');
    expect(forestExperimentMode('?forestExperiment=border')).toBe('border');
    expect(forestExperimentMode('?forestExperiment=other')).toBeNull();
  });

  it('uses seeded decoration positions for scattered canopies', () => {
    const map = createBorderMarches(1);
    const canopies = deriveForestReviewCanopies(map, deriveTerrainDecorations(map), 'scattered');
    expect(canopies.length).toBeGreaterThan(0);
    expect(canopies.every((canopy) => terrainIdAt(map, canopy.position) === 'deepwood')).toBe(true);
  });

  it('keeps border canopies on the edge of connected forest regions', () => {
    const map = createBorderMarches(1);
    const canopies = deriveForestReviewCanopies(map, [], 'border');
    expect(canopies.length).toBeGreaterThan(0);
    for (const canopy of canopies) {
      const { x, y } = canopy.position;
      expect([
        { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
      ].some((neighbor) => neighbor.x < 0 || neighbor.y < 0
        || neighbor.x >= map.width || neighbor.y >= map.height
        || terrainIdAt(map, neighbor) !== 'deepwood')).toBe(true);
    }
  });

  it('fades only for a subject on the same or immediately-behind row', () => {
    expect(canopyShouldFade({ x: 4, y: 5 }, [{ x: 3, y: 4 }])).toBe(true);
    expect(canopyShouldFade({ x: 4, y: 5 }, [{ x: 4, y: 6 }])).toBe(false);
    expect(canopyShouldFade({ x: 4, y: 5 }, [{ x: 2, y: 4 }])).toBe(false);
  });
});
