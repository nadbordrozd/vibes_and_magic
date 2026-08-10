import {
  ASSET_MANIFEST, type AssetCategory, type AssetManifestEntry,
} from '../../assets/manifest';
import {
  AUTHORED_MAPS, assetWorklist, mapObjectAssetId, type AssetWorkItem,
} from '../../assets/worklist';
import {
  DEFAULT_TERRAIN_DECORATION_DENSITY, LARGE_MAP_TERRAIN_DECORATION_DENSITY,
  TERRAIN, TERRAIN_DECORATIONS, deriveTerrainDecorations, tile,
  type TerrainDecoration,
} from '../content/terrain';
import type {
  GameMap, MapObject, TerrainId, TerrainSkinId, TerrainTile,
} from '../core/types';
import { deriveMountainRanges, type MountainRangeDecoration } from './mountainRanges';

export const ADVENTURE_SHOWCASE_SEED = 0x4f574134;

export const ADVENTURE_SHOWCASE_CATEGORIES = [
  'terrain', 'overlay', 'decoration', 'map-object', 'castle', 'hero', 'guardian-unit',
] as const satisfies readonly AssetCategory[];

export interface AdventureShowcaseItem extends AssetWorkItem {
  entry: AssetManifestEntry;
}

export interface TerrainSkinCoverage {
  terrain: TerrainId;
  skin: TerrainSkinId;
  label: string;
  grid: TerrainTile[][];
}

export interface DecorationDensityFixture {
  map: GameMap;
  decorations: TerrainDecoration[];
  density: number;
  expectedKinds: string[];
}

export interface MountainTopologyFixture {
  map: GameMap;
  pieces: MountainRangeDecoration[];
  labels: Array<{ name: string; x: number; y: number; w: number; h: number }>;
}

export interface InteractionHierarchyFixture {
  map: GameMap;
  decorations: TerrainDecoration[];
  items: Array<AdventureShowcaseItem & { position: { x: number; y: number } }>;
}

const ADVENTURE_CATEGORY_SET = new Set<AssetCategory>(ADVENTURE_SHOWCASE_CATEGORIES);

export function adventureShowcaseInventory(): AdventureShowcaseItem[] {
  return assetWorklist().filter((item) => ADVENTURE_CATEGORY_SET.has(item.category)).map((item) => {
    const entry = ASSET_MANIFEST[item.id];
    if (!entry) throw new Error(`Adventure showcase asset has no manifest entry: ${item.id}`);
    return { ...item, entry };
  });
}

export function terrainSkinCoverage(): TerrainSkinCoverage[] {
  return Object.values(TERRAIN).flatMap((terrain) => terrain.skins.map((skin) => ({
    terrain: terrain.id,
    skin,
    label: `${terrain.label} / ${skin}`,
    grid: Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => tile(terrain.id, skin))),
  })));
}

function emptyMap(width: number, height: number, terrain: TerrainTile[][], seed: number): GameMap {
  return {
    id: 'manywhere', name: 'Adventure visual showcase', width, height, seed, terrain,
    objects: [], roads: [], seams: [],
    victory: { type: 'none', flavor: '', mechanics: '' },
  };
}

function decorationFixtureForTerrain(
  terrainId: TerrainId, density: number, requireComplete: boolean,
): DecorationDensityFixture {
  const catalog = TERRAIN_DECORATIONS[terrainId] ?? [];
  const expectedKinds = catalog.map(([kind]) => kind).sort();
  const width = density < 0.1 ? 48 : 20;
  const height = density < 0.1 ? 20 : 12;
  const skin = TERRAIN[terrainId].skins[0];
  const terrain = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => tile(terrainId, skin)));

  for (let offset = 0; offset < 20_000; offset += 1) {
    const seed = ADVENTURE_SHOWCASE_SEED + offset;
    const map = emptyMap(width, height, terrain, seed);
    const decorations = deriveTerrainDecorations(map, density);
    const present = new Set(decorations.map(({ kind }) => kind));
    if (!requireComplete || expectedKinds.every((kind) => present.has(kind))) {
      return { map, decorations, density, expectedKinds };
    }
  }
  throw new Error(`Could not derive complete ${terrainId} decoration fixture at density ${density}`);
}

export function decorationDensityFixtures(): DecorationDensityFixture[] {
  return (Object.keys(TERRAIN_DECORATIONS) as TerrainId[]).flatMap((terrainId) => [
    decorationFixtureForTerrain(terrainId, DEFAULT_TERRAIN_DECORATION_DENSITY, true),
    decorationFixtureForTerrain(terrainId, LARGE_MAP_TERRAIN_DECORATION_DENSITY, false),
  ]);
}

function paintRun(terrain: TerrainTile[][], y: number, fromX: number, toX: number): void {
  for (let x = fromX; x <= toX; x += 1) terrain[y][x] = tile('mountain', 'granite');
}

/**
 * Named topology recipes exercise the production compositor. No mountain sprite is selected here:
 * the fixture authors only gameplay cells, then deriveMountainRanges chooses every visible piece.
 */
export function createMountainTopologyFixture(): MountainTopologyFixture {
  const width = 48;
  const height = 38;
  const terrain = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => tile('meadow')));
  const labels: MountainTopologyFixture['labels'] = [];
  const label = (name: string, x: number, y: number, w: number, h: number) =>
    labels.push({ name, x, y, w, h });

  // Multiple run sizes and exposed boundaries.
  [1, 2, 3, 4, 6, 10].forEach((length, index) => paintRun(terrain, 3 + index * 2, 2, 1 + length));
  label('runs 1/2/3/4/6/10', 1, 1, 13, 14);

  // A corner and a three-way branch.
  for (let y = 3; y <= 10; y += 1) paintRun(terrain, y, 18, y >= 9 ? 25 : 20);
  paintRun(terrain, 7, 14, 24);
  label('corner + branch', 13, 1, 14, 12);

  // Deep irregular blob with a deliberately enclosed interior.
  for (let y = 3; y <= 12; y += 1) {
    const inset = Math.abs(7 - y) > 3 ? 2 : 0;
    paintRun(terrain, y, 31 + inset, 44 - inset - (y % 3 === 0 ? 1 : 0));
  }
  label('deep blob + interior', 29, 1, 18, 14);

  // Two unequal lobes joined by a one-cell bottleneck.
  for (let y = 18; y <= 24; y += 1) {
    paintRun(terrain, y, 3 + Math.abs(21 - y), 11 - Math.max(0, Math.abs(21 - y) - 1));
    paintRun(terrain, y, 18 + Math.max(0, Math.abs(21 - y) - 1), 27 - Math.abs(21 - y));
  }
  paintRun(terrain, 21, 10, 19);
  label('lobes + bottleneck', 1, 16, 28, 11);

  // A one-cell staircase spine terminating in a hook.
  for (let step = 0; step < 8; step += 1) {
    const x = 34 + Math.floor(step / 2);
    const y = 18 + step;
    terrain[y][x] = tile('mountain', 'granite');
  }
  paintRun(terrain, 25, 37, 43);
  paintRun(terrain, 24, 43, 43);
  label('stair + hook', 31, 16, 16, 12);

  // Concave crescent and narrow boundary-facing channels.
  for (let y = 29; y <= 35; y += 1) {
    paintRun(terrain, y, 4, 15);
    if (y >= 31 && y <= 33) for (let x = 8; x <= 15; x += 1) terrain[y][x] = tile('meadow');
  }
  for (let y = 29; y <= 35; y += 1) paintRun(terrain, y, 22 + (y % 2), 24 + (y % 2));
  label('crescent + channels', 1, 28, 28, 9);

  const map = emptyMap(width, height, terrain, ADVENTURE_SHOWCASE_SEED);
  return { map, pieces: deriveMountainRanges(map), labels };
}

export function representativeMapObjects(): Map<string, MapObject> {
  const representatives = new Map<string, MapObject>();
  for (const map of AUTHORED_MAPS) for (const object of map.objects) {
    if (object.kind === 'guardian') continue;
    const id = mapObjectAssetId(object);
    if (!representatives.has(id)) representatives.set(id, object);
    if (object.kind === 'bridge' && !object.completed) {
      const completed = { ...object, completed: true };
      representatives.set(mapObjectAssetId(completed), completed);
    }
  }
  return representatives;
}

/** All interactive adventure presentations in one ordinary-density field. Placement is generated
 * from sorted worklist order; it is review transport and never enters authored map content. */
export function createInteractionHierarchyFixture(): InteractionHierarchyFixture {
  const inventory = adventureShowcaseInventory();
  const oneHeroPerFaction = new Map<string, AdventureShowcaseItem>();
  inventory.filter(({ category }) => category === 'hero').forEach((item) => {
    const faction = item.id.split(':')[1];
    if (!oneHeroPerFaction.has(faction) || item.id.endsWith(':s')) oneHeroPerFaction.set(faction, item);
  });
  const reviewItems = [
    ...inventory.filter(({ category }) => ['map-object', 'castle', 'guardian-unit'].includes(category)),
    ...oneHeroPerFaction.values(),
  ].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  const columns = 12;
  const spacing = 5;
  const width = columns * spacing;
  const height = Math.ceil(reviewItems.length / columns) * spacing + 2;
  const decorativeTerrains = Object.keys(TERRAIN_DECORATIONS) as TerrainId[];
  const terrain = Array.from({ length: height }, (_, y) => {
    const terrainId = decorativeTerrains[Math.floor(y / spacing) % decorativeTerrains.length];
    const skin = TERRAIN[terrainId].skins[0];
    return Array.from({ length: width }, () => tile(terrainId, skin));
  });
  const map = emptyMap(width, height, terrain, ADVENTURE_SHOWCASE_SEED + 73);
  return {
    map,
    decorations: deriveTerrainDecorations(map, DEFAULT_TERRAIN_DECORATION_DENSITY),
    items: reviewItems.map((item, index) => ({
      ...item,
      position: { x: (index % columns) * spacing + 1, y: Math.floor(index / columns) * spacing + 3 },
    })),
  };
}
