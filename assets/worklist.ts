import { FACTIONS } from '../src/content/factions';
import { HEROES } from '../src/content/heroes';
import { ITEMS } from '../src/content/items';
import { ARTIFACTS, INSTALLED_ARTIFACT_IDS } from '../src/content/artifacts';
import { createBorderMarches } from '../src/content/maps/borderMarches';
import { createCrosstitch } from '../src/content/maps/crosstitch';
import { createManywhere } from '../src/content/maps/manywhere';
import { createGrandMuster } from '../src/content/maps/grandMuster';
import { createCrookedCrown } from '../src/content/maps/crookedCrown';
import { createSixfoldTrial } from '../src/content/maps/sixfoldTrial';
import { createTornSound } from '../src/content/maps/tornSound';
import {
  TERRAIN, TERRAIN_DECORATIONS, deriveTerrainDecorations, terrainId,
} from '../src/content/terrain';
import { UNITS } from '../src/content/units';
import { objectFootprint } from '../src/core/map/occupancy';
import type {
  Castle, FactionId, GameMap, MapObject, TerrainSkinId,
} from '../src/core/types';
import { assetId, type AssetCategory } from './manifest';

export interface AssetWorkItem {
  id: string;
  category: AssetCategory;
  w: number;
  h: number;
  source: string;
  /** Map objects and castles may overhang their ground-contact footprint. */
  groundContact?: boolean;
  /** Capturable/flaggable sprites must declare an in-canvas flag anchor. */
  ownable?: boolean;
  /** Obstacle-family geometry audited by doc 33's silhouette checks. */
  obstacleFamily?: {
    family: string;
    role: 'scatter' | 'knoll' | 'ridge' | 'massif' | 'backbone' | 'boundary';
    palette: readonly (readonly [number, number, number])[];
    paletteTolerance: number;
  };
}

const GRANITE_MOUNTAIN_RAMP = [
  [31, 38, 34], [43, 50, 44], [54, 61, 52], [68, 72, 61], [79, 82, 68],
  [93, 94, 76], [109, 107, 87], [126, 121, 98], [145, 137, 111],
  [166, 157, 129], [190, 181, 151], [216, 207, 177], [39, 69, 34],
  [51, 88, 40], [67, 108, 47], [86, 132, 55], [111, 157, 67],
  [139, 177, 82], [100, 55, 35], [132, 69, 40], [164, 84, 44], [194, 109, 55],
  [46, 32, 48], [48, 43, 58], [51, 51, 65], [64, 68, 79], [75, 81, 93],
  [83, 90, 101], [96, 103, 114], [117, 127, 137], [128, 139, 149],
] as const;

const SNOWCAP_MOUNTAIN_RAMP = [
  [44, 40, 55], [59, 58, 72], [74, 78, 91], [91, 101, 106], [113, 119, 121],
  [137, 143, 141], [168, 171, 163], [193, 198, 190], [220, 222, 211],
] as const;

const ROCKY_MOUNTAIN_RAMP = [
  [24, 28, 31], [34, 39, 43], [46, 52, 57], [59, 65, 69], [73, 79, 81],
  [89, 94, 94], [107, 111, 108], [128, 130, 123], [151, 150, 138], [181, 177, 158],
  [31, 43, 31], [42, 56, 36], [55, 70, 42], [70, 84, 49], [87, 99, 59],
  [107, 116, 71],
] as const;

function mountainFamilyWorkItem(
  skin: 'rocky' | 'granite' | 'snowcap',
  role: 'scatter' | 'knoll' | 'ridge' | 'massif' | 'backbone' | 'boundary',
  index: number,
): AssetWorkItem {
  const footprint = role === 'scatter' ? { w: 32, h: 32 }
    : role === 'knoll' ? { w: 64, h: 32 }
      : role === 'ridge' ? { w: 96, h: 32 }
        : role === 'backbone' || role === 'boundary' ? { w: 192, h: 32 }
        // Doc 31 wins over doc 33's 5x2 guide on the authored two-cell mountain spines: the
        // 160px canvas supplies the massif scale while the central 2x1 contact stays map-derived.
        : { w: 64, h: 32 };
  return {
    id: assetId.decoration('mountain', `${skin}-${role}-${index}`),
    category: 'decoration', ...footprint, groundContact: true,
    obstacleFamily: {
      family: `mountain-${skin}`, role,
      palette: skin === 'rocky' ? ROCKY_MOUNTAIN_RAMP
        : skin === 'granite' ? GRANITE_MOUNTAIN_RAMP : SNOWCAP_MOUNTAIN_RAMP,
      paletteTolerance: 32,
    },
    source: `deterministic ${skin} mountain overlap family`,
  };
}

const OWNABLE_OBJECT_KINDS = new Set<MapObject['kind']>([
  'mine', 'richVein', 'dwelling', 'boat', 'lighthouse', 'watermill', 'windmill',
  'tradingCamp',
]);

export const AUTHORED_MAPS = [
  createBorderMarches(1), createCrosstitch(1), createTornSound(1), createManywhere(1),
  createGrandMuster(1),
  createCrookedCrown(1),
  createSixfoldTrial(1),
] as const;

function tileSkin(tile: GameMap['terrain'][number][number]): TerrainSkinId {
  if (typeof tile === 'object' && tile.skin) return tile.skin;
  return TERRAIN[terrainId(tile)].skins[0];
}

export function roadMask(map: GameMap, x: number, y: number): string {
  const roads = new Set((map.roads ?? []).map((coord) => `${coord.x},${coord.y}`));
  const bits = [
    roads.has(`${x},${y - 1}`) ? 'n' : '',
    roads.has(`${x + 1},${y}`) ? 'e' : '',
    roads.has(`${x},${y + 1}`) ? 's' : '',
    roads.has(`${x - 1},${y}`) ? 'w' : '',
  ].join('');
  return bits || 'isolated';
}

export function mapObjectVariant(object: MapObject): string {
  if (object.kind === 'pile' || object.kind === 'mine') return object.resource;
  if (object.kind === 'shrine') return object.school;
  if (object.kind === 'item') return object.item.id;
  if (object.kind === 'dwelling') return object.unitId;
  if (object.kind === 'lock') return object.id;
  if (object.kind === 'obstacle') return object.prop;
  if (object.kind === 'bridge') return object.completed ? 'complete' : 'incomplete';
  return 'default';
}

export function mapObjectAssetId(object: MapObject): string {
  return assetId.mapObject(object.kind, mapObjectVariant(object));
}

function pushUnique(items: Map<string, AssetWorkItem>, item: AssetWorkItem): void {
  const existing = items.get(item.id);
  if (existing && (existing.w !== item.w || existing.h !== item.h)) {
    throw new Error(`Conflicting worklist dimensions for ${item.id}`);
  }
  if (!existing) items.set(item.id, item);
}

function castleWorkItem(faction: FactionId, variant: NonNullable<Castle['variant']> | 'castle'):
AssetWorkItem {
  return {
    id: assetId.castle(faction, variant), category: 'castle', w: 160, h: 64,
    groundContact: true, ownable: true,
    source: variant === 'castle' ? 'playable faction city' : `Manywhere ${variant}`,
  };
}

export function assetWorklist(): AssetWorkItem[] {
  const items = new Map<string, AssetWorkItem>();

  pushUnique(items, {
    id: assetId.terrainField('meadow'), category: 'terrain', w: 256, h: 256,
    source: 'continuous adventure-map meadow field support',
  });

  for (const map of AUTHORED_MAPS) {
    for (const row of map.terrain) for (const tile of row) {
      const terrain = terrainId(tile);
      const skin = tileSkin(tile);
      for (let variant = 0; variant < 3; variant += 1) pushUnique(items, {
        id: assetId.terrain(terrain, skin, variant), category: 'terrain', w: 32, h: 32,
        source: `${map.id} terrain`,
      });
    }
    for (const road of map.roads ?? []) pushUnique(items, {
      id: assetId.overlay('road', roadMask(map, road.x, road.y)), category: 'overlay',
      w: 32, h: 32, source: `${map.id} road topology`,
    });
    if ((map.seams ?? []).length) pushUnique(items, {
      id: assetId.overlay('seam', 'default'), category: 'overlay', w: 32, h: 32,
      source: `${map.id} seams`,
    });
    for (const object of map.objects.filter((candidate) => candidate.kind !== 'guardian')) {
      const footprint = objectFootprint(object);
      pushUnique(items, {
        id: mapObjectAssetId(object), category: 'map-object',
        w: footprint.w * 32, h: footprint.h * 32,
        groundContact: true, ownable: OWNABLE_OBJECT_KINDS.has(object.kind),
        source: `${map.id}:${object.id}`,
      });
      if (object.kind === 'bridge') pushUnique(items, {
        id: assetId.mapObject('bridge', 'complete'), category: 'map-object',
        w: footprint.w * 32, h: footprint.h * 32,
        groundContact: true,
        source: `${map.id}:${object.id} completed state`,
      });
    }
    for (const guardian of map.objects.filter((candidate) => candidate.kind === 'guardian')) {
      if (guardian.kind !== 'guardian') continue;
      for (const stack of guardian.army) pushUnique(items, {
        id: assetId.guardianUnit(stack.unitId), category: 'guardian-unit', w: 32, h: 48,
        source: `${map.id}:${guardian.id}`,
      });
    }
  }

  for (const [terrain, decorations] of Object.entries(TERRAIN_DECORATIONS)) {
    for (const [kind] of decorations ?? []) pushUnique(items, {
      id: assetId.decoration(terrain, kind), category: 'decoration', w: 32, h: 32,
      groundContact: kind === 'canopy-clump',
      source: `terrain decoration catalog:${terrain}`,
    });
  }

  // Both mountain skins occur in authored maps. The full overlap-family contract is part of the
  // data-derived worklist even while later stages remain blocked on approval of their canonical
  // scatter reference; nominal manifest coverage must not hide an incomplete family.
  for (const skin of ['granite', 'snowcap'] as const) {
    for (let index = 1; index <= 6; index += 1) {
      pushUnique(items, mountainFamilyWorkItem(skin, 'scatter', index));
    }
    for (let index = 1; index <= 4; index += 1) {
      pushUnique(items, mountainFamilyWorkItem(skin, 'knoll', index));
      pushUnique(items, mountainFamilyWorkItem(skin, 'ridge', index));
    }
    for (let index = 1; index <= 2; index += 1) {
      pushUnique(items, mountainFamilyWorkItem(skin, 'massif', index));
    }
  }
  // The production compositor uses the new rocky family as its first climate-neutral vocabulary.
  // It intentionally has no scatter role: every impassable cell is covered by a substantial
  // whole landform, including one-cell-wide authored runs.
  for (let index = 1; index <= 4; index += 1) {
    pushUnique(items, mountainFamilyWorkItem('rocky', 'knoll', index));
    pushUnique(items, mountainFamilyWorkItem('rocky', 'ridge', index));
  }
  for (let index = 1; index <= 2; index += 1) {
    pushUnique(items, mountainFamilyWorkItem('rocky', 'massif', index));
  }
  for (let index = 1; index <= 8; index += 1) {
    pushUnique(items, mountainFamilyWorkItem('rocky', 'backbone', index));
    pushUnique(items, mountainFamilyWorkItem('rocky', 'boundary', index));
  }
  pushUnique(items, {
    id: assetId.decoration('mountain', 'range-clump'), category: 'decoration',
    w: 64, h: 32, groundContact: true,
    source: 'legacy mountain renderer retained until doc 33 family promotion',
  });
  pushUnique(items, {
    id: assetId.decoration('mountain', 'range-clump-b'), category: 'decoration',
    w: 64, h: 32, groundContact: true,
    source: 'legacy mountain renderer retained until doc 33 family promotion',
  });

  // This assertion keeps the worklist tied to the same deterministic decorator used by maps.
  for (const map of AUTHORED_MAPS) deriveTerrainDecorations(map).forEach((decoration) => {
    const terrain = terrainId(map.terrain[decoration.position.y][decoration.position.x]);
    if (!items.has(assetId.decoration(terrain, decoration.kind))) {
      throw new Error(`Decoration missing from worklist: ${decoration.kind}`);
    }
  });

  for (const faction of Object.keys(FACTIONS) as FactionId[]) {
    pushUnique(items, castleWorkItem(faction, 'castle'));
    const heroClass = Object.values(HEROES).find((hero) => hero.faction === faction)!.heroClass;
    for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) pushUnique(items, {
      id: assetId.hero(faction, direction), category: 'hero', w: 32, h: 48,
      source: `${faction} ${heroClass}`,
    });
  }

  pushUnique(items, castleWorkItem('hearthguard', 'freeTown'));
  pushUnique(items, castleWorkItem('woundWrights', 'oldSeat'));
  pushUnique(items, castleWorkItem('unfinished', 'hollowTown'));
  pushUnique(items, castleWorkItem('vespiary', 'coastal'));

  // Collectibles are catalog-owned, not map-occurrence-owned: every canonical definition needs
  // the same sprite in editor, pickup, inventory, market, choice, and result surfaces.
  for (const item of Object.values(ITEMS)) pushUnique(items, {
    id: assetId.mapObject('item', item.id), category: 'map-object', w: 32, h: 32,
    source: `canonical item catalog:${item.use}`,
  });
  for (const artifactId of INSTALLED_ARTIFACT_IDS) pushUnique(items, {
    id: assetId.mapObject('artifact', artifactId), category: 'map-object', w: 32, h: 32,
    source: `canonical artifact catalog:${ARTIFACTS[artifactId].class}`,
  });

  for (const unit of Object.values(UNITS)) {
    // Combat canvases describe visual overhang, not occupied hexes. Wide creatures and mounted
    // units use the 192px presentation canvas; rules occupancy still comes from hexSize.
    const width = unit.hexSize === 3 ? 256
      : unit.hexSize === 2 || unit.id === 'lanceKnight' ? 192 : 128;
    pushUnique(items, {
      id: assetId.battleUnit(unit.id), category: 'battle-unit',
      w: width, h: 128, source: `${unit.faction ?? 'neutral'} unit catalog`,
    });
  }

  return [...items.values()].sort((a, b) =>
    a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
}
