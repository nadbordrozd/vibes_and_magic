import { terrainId } from '../content/terrain';
import type { GameMap, TerrainId } from '../core/types';

export const NATIVE_TERRAIN_TILE = 32 as const;
const COMPOSITOR_STEP = 2;
const SAMPLES_PER_TILE = NATIVE_TERRAIN_TILE / COMPOSITOR_STEP;

export const BASE_TERRAIN_VISUALS = [
  'water', 'grass', 'snow', 'swamp', 'volcanic', 'desert', 'dirt', 'plains', 'beach',
] as const;

/** Canonical gameplay families with their own generated material vocabularies. */
export const GAME_TERRAIN_VISUALS = [
  'deepwood', 'mosswold', 'ashsteppe', 'barrowfield', 'lacquerFlats', 'mire',
] as const;

export const TERRAIN_VISUALS = [...BASE_TERRAIN_VISUALS, ...GAME_TERRAIN_VISUALS] as const;

export type BaseTerrainVisualId = typeof BASE_TERRAIN_VISUALS[number];
export type GameTerrainVisualId = typeof GAME_TERRAIN_VISUALS[number];
export type TerrainVisualId = typeof TERRAIN_VISUALS[number];
export type TerrainVisualGrid = readonly (readonly TerrainVisualId[])[];
export type BaseTerrainVisualGrid = readonly (readonly BaseTerrainVisualId[])[];

const GAME_TERRAIN_VISUAL: Record<TerrainId, TerrainVisualId> = {
  meadow: 'grass',
  deepwood: 'deepwood',
  mosswold: 'mosswold',
  ashsteppe: 'ashsteppe',
  barrowfield: 'barrowfield',
  lacquerFlats: 'lacquerFlats',
  hush: 'snow',
  mire: 'mire',
  mountain: 'grass',
  water: 'water',
};

const TERRAIN_INDEX = Object.fromEntries(
  TERRAIN_VISUALS.map((terrain, index) => [terrain, index]),
) as Record<TerrainVisualId, number>;

/**
 * The composition vocabulary has two shared transition materials. Water reaches land through
 * beach; unrelated land families reach one another through dirt. Existing beach/dirt cells join
 * their neighbours directly so the bridge never recursively produces another bridge.
 */
export function transitionBridge(a: TerrainVisualId, b: TerrainVisualId): BaseTerrainVisualId | null {
  if (a === b) return null;
  if (a === 'water' || b === 'water') {
    return a === 'beach' || b === 'beach' ? null : 'beach';
  }
  if (a === 'dirt' || b === 'dirt' || a === 'beach' || b === 'beach') return null;
  return 'dirt';
}

/** Rendering-only adapter; canonical gameplay terrain remains unchanged. */
export function gameMapTerrainGrid(map: Pick<GameMap, 'terrain'>): TerrainVisualGrid {
  return map.terrain.map((row) => row.map((tile) => GAME_TERRAIN_VISUAL[terrainId(tile)]));
}

function hash(x: number, y: number, salt = 0): number {
  let value = (Math.imul(x + 1, 0x9e3779b1)
    ^ Math.imul(y + 1, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function smoothTerrainLabels(grid: TerrainVisualGrid): Uint8Array {
  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length ?? 0;
  const width = gridWidth * SAMPLES_PER_TILE;
  const height = gridHeight * SAMPLES_PER_TILE;
  const labels = new Uint8Array(width * height);
  const weights = new Float32Array(TERRAIN_VISUALS.length);

  for (let pixelY = 0; pixelY < height; pixelY += 1) {
    const gridY = pixelY / SAMPLES_PER_TILE - 0.5;
    const top = Math.floor(gridY);
    const fractionY = gridY - top;
    for (let pixelX = 0; pixelX < width; pixelX += 1) {
      weights.fill(0);
      const gridX = pixelX / SAMPLES_PER_TILE - 0.5;
      const left = Math.floor(gridX);
      const fractionX = gridX - left;
      const samples = [
        [left, top, (1 - fractionX) * (1 - fractionY)],
        [left + 1, top, fractionX * (1 - fractionY)],
        [left, top + 1, (1 - fractionX) * fractionY],
        [left + 1, top + 1, fractionX * fractionY],
      ] as const;
      for (const [sampleX, sampleY, weight] of samples) {
        const terrain = grid[clamp(sampleY, 0, gridHeight - 1)][
          clamp(sampleX, 0, gridWidth - 1)
        ];
        weights[TERRAIN_INDEX[terrain]] += weight;
      }

      let winner = 0;
      let winnerScore = -1;
      for (let terrainIndex = 0; terrainIndex < weights.length; terrainIndex += 1) {
        if (weights[terrainIndex] === 0) continue;
        // One sample becomes a 2×2 native-pixel cluster: crisp hand dithering, no subpixels.
        const noise = (hash(pixelX, pixelY, terrainIndex) / 0xffffffff - 0.5) * 0.12;
        const score = weights[terrainIndex] + noise;
        if (score > winnerScore) {
          winner = terrainIndex;
          winnerScore = score;
        }
      }
      labels[pixelY * width + pixelX] = winner;
    }
  }
  return labels;
}

function addBridgeBorders(labels: Uint8Array, width: number, height: number): Uint8Array {
  const result = labels.slice();
  const radius = 4 / COMPOSITOR_STEP;
  const probes = [
    [-radius, 0], [radius, 0], [0, -radius], [0, radius],
    [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius],
  ] as const;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const terrain = TERRAIN_VISUALS[labels[index]];
      let bridge: BaseTerrainVisualId | null = null;
      for (const [offsetX, offsetY] of probes) {
        const otherIndex = clamp(y + offsetY, 0, height - 1) * width
          + clamp(x + offsetX, 0, width - 1);
        const candidate = transitionBridge(terrain, TERRAIN_VISUALS[labels[otherIndex]]);
        if (!candidate) continue;
        // A coastline keeps its sand even at a three-way meeting; dirt owns other land junctions.
        if (candidate === 'beach' || bridge === null) bridge = candidate;
      }
      if (bridge) result[index] = TERRAIN_INDEX[bridge];
    }
  }
  return result;
}

export interface TerrainPath {
  terrain: TerrainVisualId;
  d: string;
}

/**
 * Converts the pixel ownership field to nine compact SVG paths. Each command is a horizontal run
 * of native pixels, so adjacent terrains share exact integer boundaries without antialiasing or a
 * runtime canvas.
 */
export function terrainGridPaths(grid: TerrainVisualGrid): TerrainPath[] {
  if (!grid.length || !grid[0].length || grid.some((row) => row.length !== grid[0].length)) {
    throw new Error('Terrain showcase grid must be a non-empty rectangle.');
  }
  const width = grid[0].length * SAMPLES_PER_TILE;
  const height = grid.length * SAMPLES_PER_TILE;
  const labels = addBridgeBorders(smoothTerrainLabels(grid), width, height);
  const commands = TERRAIN_VISUALS.map(() => [] as string[]);

  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      const terrainIndex = labels[y * width + x];
      const start = x;
      x += 1;
      while (x < width && labels[y * width + x] === terrainIndex) x += 1;
      commands[terrainIndex].push(`M${start * COMPOSITOR_STEP} ${y * COMPOSITOR_STEP}`
        + `h${(x - start) * COMPOSITOR_STEP}v${COMPOSITOR_STEP}`
        + `H${start * COMPOSITOR_STEP}z`);
    }
  }
  return TERRAIN_VISUALS.map((terrain, index) => ({
    terrain,
    d: commands[index].join(''),
  })).filter(({ d }) => d.length > 0);
}
