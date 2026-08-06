import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGameTerrainShowcaseGrid, createTerrainShowcaseGrid } from '../../ui/terrainShowcase';
import { createGrandMuster } from '../../content/maps/grandMuster';
import {
  BASE_TERRAIN_VISUALS, GAME_TERRAIN_VISUALS, gameMapTerrainGrid,
  NATIVE_TERRAIN_TILE, terrainGridPaths, transitionBridge, type BaseTerrainVisualId,
} from '../../ui/terrainTransitions';

function pngDimensions(file: string): [number, number] {
  const bytes = readFileSync(file);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

describe('native terrain transition composition', () => {
  it('routes coastlines through beach and incompatible land through dirt', () => {
    expect(transitionBridge('water', 'grass')).toBe('beach');
    expect(transitionBridge('water', 'volcanic')).toBe('beach');
    expect(transitionBridge('grass', 'snow')).toBe('dirt');
    expect(transitionBridge('snow', 'swamp')).toBe('dirt');
    expect(transitionBridge('volcanic', 'desert')).toBe('dirt');
    expect(transitionBridge('water', 'beach')).toBeNull();
    expect(transitionBridge('grass', 'dirt')).toBeNull();
    expect(transitionBridge('dirt', 'snow')).toBeNull();

    for (let left = 0; left < BASE_TERRAIN_VISUALS.length; left += 1) {
      for (let right = left + 1; right < BASE_TERRAIN_VISUALS.length; right += 1) {
        const a = BASE_TERRAIN_VISUALS[left];
        const b = BASE_TERRAIN_VISUALS[right];
        const expected = a === 'water' || b === 'water'
          ? a === 'beach' || b === 'beach' ? null : 'beach'
          : a === 'dirt' || b === 'dirt' || a === 'beach' || b === 'beach'
            ? null : 'dirt';
        expect(transitionBridge(a, b), `${a} ↔ ${b}`).toBe(expected);
      }
    }
  });

  it('keeps the review fixture large, empty and inclusive of all nine families', () => {
    const grid = createTerrainShowcaseGrid();
    expect(NATIVE_TERRAIN_TILE).toBe(32);
    expect(grid).toHaveLength(42);
    expect(grid.every((row) => row.length === 60)).toBe(true);
    expect(new Set(grid.flat())).toEqual(new Set(BASE_TERRAIN_VISUALS));
    expect(new Set(terrainGridPaths(grid).map(({ terrain }) => terrain)))
      .toEqual(new Set(BASE_TERRAIN_VISUALS));
  });

  it('showcases every game-specific visual family with dirt-mediated joins', () => {
    const grid = createGameTerrainShowcaseGrid();
    expect(grid).toHaveLength(26);
    expect(grid.every((row) => row.length === 54)).toBe(true);
    const present = new Set(grid.flat());
    GAME_TERRAIN_VISUALS.forEach((terrain) => expect(present.has(terrain)).toBe(true));
    const paths = terrainGridPaths(grid);
    GAME_TERRAIN_VISUALS.forEach((terrain) => {
      expect(paths.some((path) => path.terrain === terrain)).toBe(true);
    });
    expect(paths.some((path) => path.terrain === 'dirt')).toBe(true);
    expect(paths.some((path) => path.terrain === 'beach')).toBe(true);
  });

  it('ships reproducible native texture patterns for the SVG renderer', () => {
    BASE_TERRAIN_VISUALS.forEach((terrain) => {
      expect(pngDimensions(`public/assets/terrain/original-showcase-${terrain}.png`))
        .toEqual([288, 288]);
      for (let index = 0; index < 2; index += 1) {
        expect(pngDimensions(`public/assets/terrain/original-native/${terrain}-${index}.png`))
          .toEqual([32, 32]);
      }
    });
    GAME_TERRAIN_VISUALS.forEach((terrain) => {
      const slug = terrain === 'lacquerFlats' ? 'lacquer-flats' : terrain;
      expect(pngDimensions(`public/assets/terrain/game-showcase-${slug}.png`))
        .toEqual([288, 288]);
      expect(pngDimensions(`public/assets/terrain/game-native/${slug}/wang-strip.png`))
        .toEqual([512, 32]);
      for (let index = 1; index <= 16; index += 1) {
        expect(pngDimensions(`public/assets/terrain/game-native/${slug}/wang-${String(index).padStart(2, '0')}.png`))
          .toEqual([32, 32]);
      }
    });
  });

  it('contains varied direct joins for the bridge compositor to resolve', () => {
    const grid = createTerrainShowcaseGrid();
    const joins = new Set<string>();
    grid.forEach((row, y) => row.forEach((terrain, x) => {
      const neighbours = [grid[y]?.[x + 1], grid[y + 1]?.[x]]
        .filter((candidate): candidate is BaseTerrainVisualId => Boolean(candidate));
      neighbours.forEach((other) => {
        if (terrain === other) return;
        joins.add([terrain, other].sort().join(':'));
      });
    }));
    expect(joins.size).toBeGreaterThanOrEqual(16);
    expect([...joins].filter((join) => {
      const [a, b] = join.split(':') as [BaseTerrainVisualId, BaseTerrainVisualId];
      return transitionBridge(a, b) !== null;
    }).length).toBeGreaterThanOrEqual(10);
  });

  it('adapts canonical terrain for display without changing game terrain data', () => {
    const map = createGrandMuster(37);
    const before = JSON.stringify(map.terrain);
    const visual = gameMapTerrainGrid(map);
    expect(visual).toHaveLength(map.height);
    expect(visual.every((row) => row.length === map.width)).toBe(true);
    const present = new Set(visual.flat());
    for (const terrain of [
      'grass', 'snow', 'mire', 'ashsteppe', 'barrowfield', 'lacquerFlats', 'water',
    ] as const) {
      expect(present.has(terrain)).toBe(true);
    }
    expect(JSON.stringify(map.terrain)).toBe(before);
  });
});
