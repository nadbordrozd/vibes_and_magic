import {
  BASE_TERRAIN_VISUALS, GAME_TERRAIN_VISUALS,
  type BaseTerrainVisualGrid, type BaseTerrainVisualId,
  type TerrainVisualGrid, type TerrainVisualId,
} from './terrainTransitions';

export const TERRAIN_SHOWCASE_WIDTH = 60;
export const TERRAIN_SHOWCASE_HEIGHT = 42;
export const GAME_TERRAIN_SHOWCASE_WIDTH = 54;
export const GAME_TERRAIN_SHOWCASE_HEIGHT = 26;

type MutableGrid = BaseTerrainVisualId[][];

function paint(grid: MutableGrid, terrain: BaseTerrainVisualId, predicate: (x: number, y: number) => boolean): void {
  grid.forEach((row, y) => row.forEach((_, x) => {
    if (predicate(x, y)) row[x] = terrain;
  }));
}

function ellipse(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number): boolean {
  return ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2 <= 1;
}

/**
 * Empty visual stress map: no roads, props, labels, mountains, or gameplay entities. The terrain
 * itself supplies broad masses, acute elbows, islands, one-cell channels, holes and multi-biome
 * junctions so every transition failure is visible in one review.
 */
export function createTerrainShowcaseGrid(): BaseTerrainVisualGrid {
  const grid: MutableGrid = Array.from({ length: TERRAIN_SHOWCASE_HEIGHT }, () =>
    Array.from({ length: TERRAIN_SHOWCASE_WIDTH }, (): BaseTerrainVisualId => 'grass'));

  // Northern sea: uneven coast, two grass peninsulas and a one-cell tidal inlet.
  paint(grid, 'water', (x, y) => y < 7 + Math.round(Math.sin(x * 0.42) * 2));
  paint(grid, 'grass', (x, y) => (x >= 7 && x <= 11 && y <= 9 + Math.abs(x - 9))
    || (x >= 23 && x <= 27 && y <= 11 - Math.abs(x - 25)));
  paint(grid, 'water', (x, y) => x === 18 && y >= 5 && y <= 18);
  paint(grid, 'water', (x, y) => ellipse(x, y, 11, 16, 8, 6));
  paint(grid, 'grass', (x, y) => ellipse(x, y, 11, 16, 2.4, 1.8));
  paint(grid, 'beach', (x, y) => ellipse(x, y, 5, 12, 2.8, 1.8));

  // Snow shelf with a rounded island, concave bite and a narrow grass channel.
  paint(grid, 'snow', (x, y) => x >= 31 && y <= 16
    && y >= 5 + Math.round(Math.sin(x * 0.55) * 2));
  paint(grid, 'snow', (x, y) => ellipse(x, y, 43, 18, 11, 7));
  paint(grid, 'grass', (x, y) => ellipse(x, y, 40, 13, 3.2, 2.3));
  paint(grid, 'grass', (x, y) => x === 49 && y >= 8 && y <= 19);
  paint(grid, 'snow', (x, y) => ellipse(x, y, 27, 12, 3.2, 2.2));

  // Swamp lobes surround both an island and a one-cell grass channel.
  paint(grid, 'swamp', (x, y) => ellipse(x, y, 18, 27, 15, 8)
    || ellipse(x, y, 7, 29, 7, 6));
  paint(grid, 'grass', (x, y) => ellipse(x, y, 13, 27, 3.4, 2.2));
  paint(grid, 'grass', (x, y) => y === 31 && x >= 4 && x <= 23);
  paint(grid, 'swamp', (x, y) => x === 29 && y >= 20 && y <= 33);

  // Volcanic ground presses against swamp, snow and desert at a deliberately busy junction.
  paint(grid, 'volcanic', (x, y) => ellipse(x, y, 34, 28, 10, 8)
    || (x >= 28 && x <= 42 && y >= 23 && y <= 31 && x + y > 55));
  paint(grid, 'swamp', (x, y) => ellipse(x, y, 30, 25, 2.6, 2));
  paint(grid, 'volcanic', (x, y) => x === 43 && y >= 24 && y <= 36);

  // Southern band provides broad dirt/desert/plains joins and multiple narrow necks.
  paint(grid, 'desert', (x, y) => y >= 33 && x >= 13 && x <= 42
    && y >= 36 - Math.round(Math.sin(x * 0.47) * 2));
  paint(grid, 'desert', (x, y) => ellipse(x, y, 46, 32, 8, 5));
  paint(grid, 'dirt', (x, y) => y >= 34 && x < 14 + Math.round(Math.sin(y * 0.8) * 3));
  paint(grid, 'dirt', (x, y) => x === 25 && y >= 30 && y <= 40);
  paint(grid, 'plains', (x, y) => x >= 43 && y >= 35
    || ellipse(x, y, 53, 28, 6, 5));
  paint(grid, 'desert', (x, y) => ellipse(x, y, 52, 38, 3, 2));

  // Eastern bay and two islands exercise beach as both authored terrain and automatic coastline.
  paint(grid, 'water', (x, y) => x >= 56 && y >= 20
    || ellipse(x, y, 57, 31, 6, 9));
  paint(grid, 'beach', (x, y) => ellipse(x, y, 55, 27, 2.8, 2));
  paint(grid, 'plains', (x, y) => ellipse(x, y, 55, 27, 1.1, 0.8));
  paint(grid, 'grass', (x, y) => ellipse(x, y, 57, 37, 1.8, 1.4));

  // Protect the fixture from accidentally dropping a terrain family during later edits.
  const present = new Set(grid.flat());
  for (const terrain of BASE_TERRAIN_VISUALS) {
    if (!present.has(terrain)) throw new Error(`Terrain showcase is missing ${terrain}.`);
  }
  return grid;
}

/**
 * Rendering-only game-family study. These are the six canonical terrain identities that have no
 * exact base-material counterpart; dirt and beach are still shared intermediary materials.
 */
export function createGameTerrainShowcaseGrid(): TerrainVisualGrid {
  const grid: TerrainVisualId[][] = Array.from({ length: GAME_TERRAIN_SHOWCASE_HEIGHT }, () =>
    Array.from({ length: GAME_TERRAIN_SHOWCASE_WIDTH }, (): TerrainVisualId => 'deepwood'));
  const paintVisual = (terrain: TerrainVisualId, predicate: (x: number, y: number) => boolean) => {
    grid.forEach((row, y) => row.forEach((_, x) => {
      if (predicate(x, y)) row[x] = terrain;
    }));
  };

  // Mosswold encloses a Deepwood island and shares a narrow one-cell throat with the east.
  paintVisual('mosswold', (x, y) => ellipse(x, y, 10, 12, 10, 8)
    || ellipse(x, y, 21, 8, 7, 5));
  paintVisual('deepwood', (x, y) => ellipse(x, y, 10, 12, 2.8, 2));
  paintVisual('mosswold', (x, y) => y === 12 && x >= 18 && x <= 31);

  // Ashsteppe rises through a one-cell neck and crowds both Barrowfield and Mosswold.
  paintVisual('ashsteppe', (x, y) => y >= 17 + Math.round(Math.sin(x * 0.5) * 2)
    || ellipse(x, y, 29, 17, 9, 5));
  paintVisual('ashsteppe', (x, y) => x === 29 && y >= 7 && y <= 20);

  // Barrowfield carries a concavity, a small island and a busy four-way junction.
  paintVisual('barrowfield', (x, y) => ellipse(x, y, 31, 8, 10, 6));
  paintVisual('deepwood', (x, y) => ellipse(x, y, 29, 8, 2.4, 1.7));
  paintVisual('barrowfield', (x, y) => ellipse(x, y, 20, 19, 3.2, 2.1));

  // Lacquer Flats forms an angular eastern shelf with an Ashsteppe hole.
  paintVisual('lacquerFlats', (x, y) => x >= 39 && y >= 4
    && y <= 21 - Math.round(Math.sin(x * 0.65) * 2));
  paintVisual('ashsteppe', (x, y) => ellipse(x, y, 45, 15, 3, 2));

  // Mire reaches a water bay through a narrow channel; beach remains the shared coastline bridge.
  paintVisual('mire', (x, y) => ellipse(x, y, 47, 6, 8, 5)
    || (x >= 36 && x <= 48 && y <= 3));
  paintVisual('mire', (x, y) => x === 37 && y >= 2 && y <= 13);
  paintVisual('water', (x, y) => x >= 51 || ellipse(x, y, 51, 8, 5, 6));
  paintVisual('mire', (x, y) => ellipse(x, y, 51, 8, 1.6, 1.2));

  const present = new Set(grid.flat());
  for (const terrain of GAME_TERRAIN_VISUALS) {
    if (!present.has(terrain)) throw new Error(`Game terrain showcase is missing ${terrain}.`);
  }
  return grid;
}
