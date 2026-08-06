// Adventure-map art is authored and displayed at its native size. Review tools may still enlarge
// screenshots with nearest-neighbour scaling, but production world coordinates stay 32px per tile.
export const PIXEL_SCALE = 1 as const;

export type AssetCategory =
  | 'terrain'
  | 'overlay'
  | 'decoration'
  | 'map-object'
  | 'castle'
  | 'hero'
  | 'guardian-unit'
  | 'battle-unit';

export interface AssetManifestEntry {
  /** Path relative to Vite's public root. */
  file: string;
  /** Native bitmap dimensions. Renderers choose an explicit integer scale. */
  w: number;
  h: number;
  /** Pixel in the bitmap aligned to the renderer-provided world anchor. */
  anchor: { x: number; y: number };
  /** Native pixel where an ownership pennant's pole is planted. */
  flagAnchor?: { x: number; y: number };
}

function terrainFamily(terrain: string, skin: string): Record<string, AssetManifestEntry> {
  return Object.fromEntries([0, 1, 2].map((variant) => [
    `terrain:${terrain}:${skin}:${variant}`,
    {
      file: `assets/terrain/${terrain}-${skin}-${variant}.png`,
      w: 32, h: 32, anchor: { x: 0, y: 0 },
    },
  ]));
}

function mountainDecorationFamily(skin: string): Record<string, AssetManifestEntry> {
  const roles = [
    ['knoll', 4, 64, 64, 0, 32],
    ['ridge', 4, 96, 96, 0, 64],
    ['massif', 2, 160, 112, 48, 80],
    ['backbone', 8, 192, 128, 0, 96],
    ['boundary', 8, 192, 128, 0, 96],
  ] as const;
  return Object.fromEntries(roles.flatMap(([role, count, w, h, anchorX, anchorY]) =>
    Array.from({ length: count }, (_, offset) => [
      `decoration:mountain:${skin}-${role}-${offset + 1}`,
      {
        file: `assets/decorations/mountain-${skin}-${role}-${offset + 1}.png`,
        w, h, anchor: { x: anchorX, y: anchorY },
      },
    ])));
}

const HERO_DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;

function heroDirectionSet(faction: string, fileStem = faction): Record<string, AssetManifestEntry> {
  return Object.fromEntries(HERO_DIRECTIONS.map((direction) => [
    `hero:${faction}:${direction}`,
    {
      file: `assets/heroes/${fileStem}-${direction}.png`,
      w: 32, h: 48, anchor: { x: 16, y: 40 },
    },
  ]));
}

const AUTHORED_GUARDIAN_UNIT_IDS = [
  'ashmaneWolves', 'bannerman', 'boneChoir', 'drownedCrew', 'hearthHound', 'hullTurtle',
  'lanternAngler', 'marionette', 'maskedDuelist', 'mirrorBound', 'oriflammeWarden',
  'silkSpinners', 'sirens', 'sleeper', 'tinSoldier', 'waxServitor', 'woodenColossus', 'yeoman',
] as const;

function guardianUnitSet(): Record<string, AssetManifestEntry> {
  return Object.fromEntries(AUTHORED_GUARDIAN_UNIT_IDS.map((unitId) => [
    `guardian-unit:${unitId}`,
    {
      file: `assets/guardian-units/${unitId}.png`,
      w: 32, h: 48, anchor: { x: 16, y: 40 },
    },
  ]));
}

/**
 * Rendering source of truth. Missing keys deliberately keep the procedural SVG glyph.
 * Add assets in small, independently shippable batches.
 */
/**
 * Dormant candidates from the interrupted first pass. The current work order explicitly requires
 * regeneration, so an entry becomes renderer-visible only after its fresh job is reviewed and its
 * id is added to REGENERATED_ASSET_IDS.
 */
const LEGACY_ASSET_CANDIDATES: Readonly<Record<string, AssetManifestEntry>> = {
  'terrain-field:meadow': {
    file: 'assets/terrain/meadow-landscape-field.png',
    w: 256, h: 256, anchor: { x: 0, y: 0 },
  },
  ...terrainFamily('meadow', 'default'),
  ...terrainFamily('deepwood', 'default'),
  ...terrainFamily('mountain', 'granite'),
  ...terrainFamily('water', 'default'),
  ...terrainFamily('ashsteppe', 'south'),
  ...terrainFamily('barrowfield', 'default'),
  ...terrainFamily('deepwood', 'mossy'),
  ...terrainFamily('hush', 'north'),
  ...terrainFamily('lacquerFlats', 'default'),
  ...terrainFamily('meadow', 'coastal'),
  ...terrainFamily('mire', 'coastal'),
  ...terrainFamily('mosswold', 'mossy'),
  ...terrainFamily('mountain', 'snowcap'),
  ...terrainFamily('water', 'coastal'),
  ...heroDirectionSet('hagwood'),
  ...heroDirectionSet('hearthguard'),
  ...heroDirectionSet('unfinished'),
  ...heroDirectionSet('vespiary'),
  ...heroDirectionSet('wildergrass'),
  ...heroDirectionSet('woundWrights', 'wound-wrights'),
  ...guardianUnitSet(),
  'overlay:seam:default': {
    file: 'assets/overlays/seam-default.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:e': {
    file: 'assets/overlays/road-e.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:es': {
    file: 'assets/overlays/road-es.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:esw': {
    file: 'assets/overlays/road-esw.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:nsw': {
    file: 'assets/overlays/road-nsw.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:ew': {
    file: 'assets/overlays/road-ew.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:n': {
    file: 'assets/overlays/road-n.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:ne': {
    file: 'assets/overlays/road-ne.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:ns': {
    file: 'assets/overlays/road-ns.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:nw': {
    file: 'assets/overlays/road-nw.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:s': {
    file: 'assets/overlays/road-s.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:sw': {
    file: 'assets/overlays/road-sw.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'overlay:road:w': {
    file: 'assets/overlays/road-w.png', w: 32, h: 32, anchor: { x: 0, y: 0 },
  },
  'decoration:meadow:flowers-white': {
    file: 'assets/decorations/meadow-flowers-white.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:meadow:flowers-yellow': {
    file: 'assets/decorations/meadow-flowers-yellow.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:meadow:flowers-blue': {
    file: 'assets/decorations/meadow-flowers-blue.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:meadow:butterfly': {
    file: 'assets/decorations/meadow-butterfly.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:meadow:beehive': {
    file: 'assets/decorations/meadow-beehive.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:meadow:cart-ruts': {
    file: 'assets/decorations/meadow-cart-ruts.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:obstacle:old oak': {
    file: 'assets/map-objects/obstacle-old-oak.png', w: 32, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:deepwood:mushroom-ring': {
    file: 'assets/decorations/deepwood-mushroom-ring.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:deepwood:deadfall': {
    file: 'assets/decorations/deepwood-deadfall.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:deepwood:canopy-clump': {
    file: 'assets/decorations/deepwood-canopy-clump.png', w: 32, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:range-clump': {
    file: 'assets/decorations/mountain-range-clump.png', w: 128, h: 160,
    anchor: { x: 32, y: 128 },
  },
  'decoration:mountain:range-clump-b': {
    file: 'assets/decorations/mountain-range-clump-b.png', w: 128, h: 160,
    anchor: { x: 32, y: 128 },
  },
  ...mountainDecorationFamily('rocky'),
  'decoration:mountain:granite-massif-1': {
    file: 'assets/decorations/mountain-granite-massif-1.png', w: 160, h: 112,
    anchor: { x: 48, y: 80 },
  },
  'decoration:mountain:granite-scatter-1': {
    file: 'assets/decorations/mountain-granite-scatter-1.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:granite-scatter-2': {
    file: 'assets/decorations/mountain-granite-scatter-2.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:granite-scatter-3': {
    file: 'assets/decorations/mountain-granite-scatter-3.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:granite-scatter-4': {
    file: 'assets/decorations/mountain-granite-scatter-4.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:granite-scatter-5': {
    file: 'assets/decorations/mountain-granite-scatter-5.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:granite-scatter-6': {
    file: 'assets/decorations/mountain-granite-scatter-6.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:granite-knoll-1': {
    file: 'assets/decorations/mountain-granite-knoll-1.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:granite-knoll-2': {
    file: 'assets/decorations/mountain-granite-knoll-2.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:granite-knoll-3': {
    file: 'assets/decorations/mountain-granite-knoll-3.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:granite-knoll-4': {
    file: 'assets/decorations/mountain-granite-knoll-4.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:granite-ridge-1': {
    file: 'assets/decorations/mountain-granite-ridge-1.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:granite-ridge-2': {
    file: 'assets/decorations/mountain-granite-ridge-2.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:granite-ridge-3': {
    file: 'assets/decorations/mountain-granite-ridge-3.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:granite-ridge-4': {
    file: 'assets/decorations/mountain-granite-ridge-4.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:granite-massif-2': {
    file: 'assets/decorations/mountain-granite-massif-2.png', w: 160, h: 112,
    anchor: { x: 48, y: 80 },
  },
  'decoration:mountain:snowcap-scatter-1': {
    file: 'assets/decorations/mountain-snowcap-scatter-1.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:snowcap-scatter-2': {
    file: 'assets/decorations/mountain-snowcap-scatter-2.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:snowcap-scatter-3': {
    file: 'assets/decorations/mountain-snowcap-scatter-3.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:snowcap-scatter-4': {
    file: 'assets/decorations/mountain-snowcap-scatter-4.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:snowcap-scatter-5': {
    file: 'assets/decorations/mountain-snowcap-scatter-5.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:snowcap-scatter-6': {
    file: 'assets/decorations/mountain-snowcap-scatter-6.png', w: 32, h: 48,
    anchor: { x: 0, y: 16 },
  },
  'decoration:mountain:snowcap-knoll-1': {
    file: 'assets/decorations/mountain-snowcap-knoll-1.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:snowcap-knoll-2': {
    file: 'assets/decorations/mountain-snowcap-knoll-2.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:snowcap-knoll-3': {
    file: 'assets/decorations/mountain-snowcap-knoll-3.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:snowcap-knoll-4': {
    file: 'assets/decorations/mountain-snowcap-knoll-4.png', w: 64, h: 64,
    anchor: { x: 0, y: 32 },
  },
  'decoration:mountain:snowcap-ridge-1': {
    file: 'assets/decorations/mountain-snowcap-ridge-1.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:snowcap-ridge-2': {
    file: 'assets/decorations/mountain-snowcap-ridge-2.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:snowcap-ridge-3': {
    file: 'assets/decorations/mountain-snowcap-ridge-3.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:snowcap-ridge-4': {
    file: 'assets/decorations/mountain-snowcap-ridge-4.png', w: 96, h: 96,
    anchor: { x: 0, y: 64 },
  },
  'decoration:mountain:snowcap-massif-1': {
    file: 'assets/decorations/mountain-snowcap-massif-1.png', w: 160, h: 112,
    anchor: { x: 48, y: 80 },
  },
  'decoration:mountain:snowcap-massif-2': {
    file: 'assets/decorations/mountain-snowcap-massif-2.png', w: 160, h: 112,
    anchor: { x: 48, y: 80 },
  },
  'decoration:mosswold:patterned-moss': {
    file: 'assets/decorations/mosswold-patterned-moss.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:mosswold:stitched-ridge': {
    file: 'assets/decorations/mosswold-stitched-ridge.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:obstacle:the Spool': {
    file: 'assets/map-objects/obstacle-the-spool.png', w: 64, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:ashsteppe:skulls': {
    file: 'assets/decorations/ashsteppe-skulls.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:ashsteppe:lone-banner': {
    file: 'assets/decorations/ashsteppe-lone-banner.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:barrowfield:candles': {
    file: 'assets/decorations/barrowfield-candles.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:barrowfield:letter-stone': {
    file: 'assets/decorations/barrowfield-letter-stone.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:lacquerFlats:grain-lines': {
    file: 'assets/decorations/lacquerFlats-grain-lines.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:lacquerFlats:paint-flecks': {
    file: 'assets/decorations/lacquerFlats-paint-flecks.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:obstacle:the Block': {
    file: 'assets/map-objects/obstacle-the-block.png', w: 64, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:hush:fox-tracks': {
    file: 'assets/decorations/hush-fox-tracks.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:hush:frozen-pond': {
    file: 'assets/decorations/hush-frozen-pond.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'decoration:mire:reeds': {
    file: 'assets/decorations/mire-reeds.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:pile:gold': {
    file: 'assets/map-objects/pile-gold.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:pile:timber': {
    file: 'assets/map-objects/pile-timber.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:pile:iron': {
    file: 'assets/map-objects/pile-iron.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:pile:essence': {
    file: 'assets/map-objects/pile-essence.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:chest:default': {
    file: 'assets/map-objects/chest-default.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:mine:gold': {
    file: 'assets/map-objects/mine-gold.png', w: 64, h: 80,
    anchor: { x: 0, y: 0 },
  },
  'map-object:mine:timber': {
    file: 'assets/map-objects/mine-timber.png', w: 64, h: 80,
    anchor: { x: 0, y: 0 },
  },
  'map-object:mine:iron': {
    file: 'assets/map-objects/mine-iron.png', w: 64, h: 80,
    anchor: { x: 0, y: 0 },
  },
  'map-object:mine:essence': {
    file: 'assets/map-objects/mine-essence.png', w: 64, h: 80,
    anchor: { x: 0, y: 0 },
  },
  'map-object:richVein:default': {
    file: 'assets/map-objects/richVein-default.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'castle:hearthguard:castle': {
    file: 'assets/castles-v2/hearthguard-castle.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:hagwood:castle': {
    file: 'assets/castles/hagwood-castle.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:hearthguard:freeTown': {
    file: 'assets/castles/hearthguard-free-town.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:unfinished:castle': {
    file: 'assets/castles/unfinished-castle.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:unfinished:hollowTown': {
    file: 'assets/castles/unfinished-hollow-town.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:vespiary:castle': {
    file: 'assets/castles/vespiary-castle.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:vespiary:coastal': {
    file: 'assets/castles/vespiary-coastal.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:wildergrass:castle': {
    file: 'assets/castles/wildergrass-castle.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:woundWrights:castle': {
    file: 'assets/castles/wound-wrights-castle.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'castle:woundWrights:oldSeat': {
    file: 'assets/castles/wound-wrights-old-seat.png', w: 96, h: 128,
    anchor: { x: 0, y: 0 },
  },
  'map-object:shrine:craft': {
    file: 'assets/map-objects/shrine-craft.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:shrine:rite': {
    file: 'assets/map-objects/shrine-rite.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:shrine:grave': {
    file: 'assets/map-objects/shrine-grave.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:shrine:wild': {
    file: 'assets/map-objects/shrine-wild.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:barrowField:default': {
    file: 'assets/map-objects/barrow-field.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:waystation:default': {
    file: 'assets/map-objects/waystation.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:manaSpring:default': {
    file: 'assets/map-objects/mana-spring.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:yeoman': {
    file: 'assets/map-objects/dwelling-yeoman.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:longbowman': {
    file: 'assets/map-objects/dwelling-longbowman.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:bannerman': {
    file: 'assets/map-objects/dwelling-bannerman.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:tinSoldier': {
    file: 'assets/map-objects/dwelling-tin-soldier.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:hobbyKnight': {
    file: 'assets/map-objects/dwelling-hobby-knight.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:marionette': {
    file: 'assets/map-objects/dwelling-marionette.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:candleWisps': {
    file: 'assets/map-objects/dwelling-candle-wisps.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:couriers': {
    file: 'assets/map-objects/dwelling-couriers.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:sentries': {
    file: 'assets/map-objects/dwelling-sentries.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:larvalTide': {
    file: 'assets/map-objects/dwelling-larval-tide.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:paperWaspLancers': {
    file: 'assets/map-objects/dwelling-paper-wasp-lancers.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:silkSpinners': {
    file: 'assets/map-objects/dwelling-silk-spinners.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:crowChorus': {
    file: 'assets/map-objects/dwelling-crow-chorus.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:fencePostFamiliars': {
    file: 'assets/map-objects/dwelling-fence-post-familiars.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:besomRiders': {
    file: 'assets/map-objects/dwelling-besom-riders.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:outriders': {
    file: 'assets/map-objects/dwelling-outriders.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:drumCallers': {
    file: 'assets/map-objects/dwelling-drum-callers.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:ashmaneWolves': {
    file: 'assets/map-objects/dwelling-ashmane-wolves.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:dwelling:maskedDuelist': {
    file: 'assets/map-objects/dwelling-masked-duelist.png', w: 32, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:boat:default': {
    file: 'assets/map-objects/boat.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:castaway:default': {
    file: 'assets/map-objects/castaway.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:chrysalis:default': {
    file: 'assets/map-objects/chrysalis.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:crone:default': {
    file: 'assets/map-objects/crone.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:drownedBell:default': {
    file: 'assets/map-objects/drowned-bell.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:flotsam:default': {
    file: 'assets/map-objects/flotsam.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:gloamingRing:default': {
    file: 'assets/map-objects/gloaming-ring.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:hedgeSchool:default': {
    file: 'assets/map-objects/hedge-school.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lighthouse:default': {
    file: 'assets/map-objects/lighthouse.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:messageBottle:default': {
    file: 'assets/map-objects/message-bottle.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:sealedCask:default': {
    file: 'assets/map-objects/sealed-cask.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:shipwreck:default': {
    file: 'assets/map-objects/shipwreck.png', w: 64, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:bridge:incomplete': {
    file: 'assets/map-objects/bridge-incomplete.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:bridge:complete': {
    file: 'assets/map-objects/bridge-complete.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:coldSpring:default': {
    file: 'assets/map-objects/cold-spring.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:sirenRocks:default': {
    file: 'assets/map-objects/siren-rocks.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:whirlpool:default': {
    file: 'assets/map-objects/whirlpool.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:cache:default': {
    file: 'assets/map-objects/cache.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:item:overseersCharter': {
    file: 'assets/map-objects/item-overseers-charter.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:item:spellScroll': {
    file: 'assets/map-objects/item-spell-scroll.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:item:tradeGoods': {
    file: 'assets/map-objects/item-trade-goods.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:item:waybread': {
    file: 'assets/map-objects/item-waybread.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:coldCampfire:default': {
    file: 'assets/map-objects/cold-campfire.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:longDraught:default': {
    file: 'assets/map-objects/long-draught.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:spoolHoard:default': {
    file: 'assets/map-objects/spool-hoard.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:patientStone:default': {
    file: 'assets/map-objects/patient-stone.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:sparringStone:default': {
    file: 'assets/map-objects/sparring-stone.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:omenStone:default': {
    file: 'assets/map-objects/omen-stone.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:grinningIdol:default': {
    file: 'assets/map-objects/grinning-idol.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:idolOfSomebody:default': {
    file: 'assets/map-objects/idol-of-somebody.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:listeningStones:default': {
    file: 'assets/map-objects/listening-stones.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:manywhere-lock-needle': {
    file: 'assets/map-objects/lock-manywhere-needle.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:manywhere-lock-pattern': {
    file: 'assets/map-objects/lock-manywhere-pattern.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:manywhere-lock-thimble': {
    file: 'assets/map-objects/lock-manywhere-thimble.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:manywhere-lock-thread': {
    file: 'assets/map-objects/lock-manywhere-thread.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:ne-kit-lock': {
    file: 'assets/map-objects/lock-ne-kit.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:nw-kit-lock': {
    file: 'assets/map-objects/lock-nw-kit.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:se-kit-lock': {
    file: 'assets/map-objects/lock-se-kit.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:seam-echo-lock': {
    file: 'assets/map-objects/lock-seam-echo.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:skeletonGrass:default': {
    file: 'assets/map-objects/skeleton-grass.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:overgrownCart:default': {
    file: 'assets/map-objects/overgrown-cart.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:hutOnTheHill:default': {
    file: 'assets/map-objects/hut-on-the-hill.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:mercenaryCamp:default': {
    file: 'assets/map-objects/mercenary-camp.png', w: 64, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:moltingCourt:default': {
    file: 'assets/map-objects/molting-court.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:monastery:default': {
    file: 'assets/map-objects/monastery.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:oldBearsCave:default': {
    file: 'assets/map-objects/old-bears-cave.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:sw-kit-lock': {
    file: 'assets/map-objects/lock-sw-kit.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:the-mirror-bound': {
    file: 'assets/map-objects/lock-mirror-bound.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:lock:the-sleeper': {
    file: 'assets/map-objects/lock-the-sleeper.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:reliquaryCairn:default': {
    file: 'assets/map-objects/reliquary-cairn.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:ruinedWatchtower:default': {
    file: 'assets/map-objects/ruined-watchtower.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:shepherdsLeanTo:default': {
    file: 'assets/map-objects/shepherds-lean-to.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:tinkersCart:default': {
    file: 'assets/map-objects/tinkers-cart.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:titheBarn:default': {
    file: 'assets/map-objects/tithe-barn.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:storyteller:default': {
    file: 'assets/map-objects/storyteller.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:tollGate:default': {
    file: 'assets/map-objects/toll-gate.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:tradingCamp:default': {
    file: 'assets/map-objects/trading-camp.png', w: 64, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:treeSecondThoughts:default': {
    file: 'assets/map-objects/tree-second-thoughts.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:unquietYard:default': {
    file: 'assets/map-objects/unquiet-yard.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:wagonCamp:default': {
    file: 'assets/map-objects/wagon-camp.png', w: 64, h: 48,
    anchor: { x: 0, y: 0 },
  },
  'map-object:warmTable:default': {
    file: 'assets/map-objects/warm-table.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:watermill:default': {
    file: 'assets/map-objects/watermill.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:windmill:default': {
    file: 'assets/map-objects/windmill.png', w: 32, h: 64,
    anchor: { x: 0, y: 0 },
  },
  'map-object:wishingWell:default': {
    file: 'assets/map-objects/wishing-well.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'map-object:wolfHollow:default': {
    file: 'assets/map-objects/wolf-hollow.png', w: 32, h: 32,
    anchor: { x: 0, y: 0 },
  },
  'battle-unit:yeoman': {
    file: 'assets/battle-units/yeoman.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:longbowman': {
    file: 'assets/battle-units/longbowman.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:bannerman': {
    file: 'assets/battle-units/bannerman.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:lanceKnight': {
    file: 'assets/battle-units/lanceKnight.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:oriflammeWarden': {
    file: 'assets/battle-units/oriflammeWarden.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:oriflammeWyvern': {
    file: 'assets/battle-units/oriflammeWyvern.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:candleWisps': {
    file: 'assets/battle-units/candleWisps.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:couriers': {
    file: 'assets/battle-units/couriers.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:sentries': {
    file: 'assets/battle-units/sentries.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:boneChoir': {
    file: 'assets/battle-units/boneChoir.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:brides': {
    file: 'assets/battle-units/brides.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:ferry': {
    file: 'assets/battle-units/ferry.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:tinSoldier': {
    file: 'assets/battle-units/tinSoldier.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:hobbyKnight': {
    file: 'assets/battle-units/hobbyKnight.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:marionette': {
    file: 'assets/battle-units/marionette.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:stuffedSentinel': {
    file: 'assets/battle-units/stuffedSentinel.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:woodenColossus': {
    file: 'assets/battle-units/woodenColossus.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:reliquaryArk': {
    file: 'assets/battle-units/reliquaryArk.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:larvalTide': {
    file: 'assets/battle-units/larvalTide.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:paperWaspLancers': {
    file: 'assets/battle-units/paperWaspLancers.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:silkSpinners': {
    file: 'assets/battle-units/silkSpinners.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:amberCarriers': {
    file: 'assets/battle-units/amberCarriers.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:dragonflyCavalry': {
    file: 'assets/battle-units/dragonflyCavalry.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:halfWokenQueen': {
    file: 'assets/battle-units/halfWokenQueen.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:crowChorus': {
    file: 'assets/battle-units/crowChorus.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:fencePostFamiliars': {
    file: 'assets/battle-units/fencePostFamiliars.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:besomRiders': {
    file: 'assets/battle-units/besomRiders.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:rusalka': {
    file: 'assets/battle-units/rusalka.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:leshy': {
    file: 'assets/battle-units/leshy.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:walkingHut': {
    file: 'assets/battle-units/walkingHut.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:outriders': {
    file: 'assets/battle-units/outriders.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:drumCallers': {
    file: 'assets/battle-units/drumCallers.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:ashmaneWolves': {
    file: 'assets/battle-units/ashmaneWolves.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:aurochsHerd': {
    file: 'assets/battle-units/aurochsHerd.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:grassSerpent': {
    file: 'assets/battle-units/grassSerpent.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:thunderbird': {
    file: 'assets/battle-units/thunderbird.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:mirrorBound': {
    file: 'assets/battle-units/mirrorBound.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:maskedDuelist': {
    file: 'assets/battle-units/maskedDuelist.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:hearthHound': {
    file: 'assets/battle-units/hearthHound.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:waxServitor': {
    file: 'assets/battle-units/waxServitor.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:standingMirror': {
    file: 'assets/battle-units/standingMirror.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:sleeper': {
    file: 'assets/battle-units/sleeper.png', w: 256, h: 128, anchor: { x: 128, y: 120 },
  },
  'battle-unit:siegeWall': {
    file: 'assets/battle-units/siegeWall.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:siegeRam': {
    file: 'assets/battle-units/siegeRam.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:watchtower': {
    file: 'assets/battle-units/watchtower.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:makerWall': {
    file: 'assets/battle-units/makerWall.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:sirens': {
    file: 'assets/battle-units/sirens.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:drownedCrew': {
    file: 'assets/battle-units/drownedCrew.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
  'battle-unit:hullTurtle': {
    file: 'assets/battle-units/hullTurtle.png', w: 192, h: 128, anchor: { x: 96, y: 120 },
  },
  'battle-unit:lanternAngler': {
    file: 'assets/battle-units/lanternAngler.png', w: 128, h: 128, anchor: { x: 64, y: 120 },
  },
};

const OWNABLE_MAP_PREFIXES = [
  'map-object:mine:', 'map-object:richVein:', 'map-object:dwelling:',
  'map-object:boat:', 'map-object:lighthouse:', 'map-object:watermill:',
  'map-object:windmill:', 'map-object:tradingCamp:',
] as const;

const REGENERATED_ASSET_IDS = new Set<string>([
  // Fresh native-resolution PixelLab winners are promoted here batch by batch.
  'battle-unit:yeoman',
  'battle-unit:longbowman',
  'battle-unit:bannerman',
  'battle-unit:lanceKnight',
  'battle-unit:oriflammeWarden',
  'battle-unit:oriflammeWyvern',
  'battle-unit:candleWisps',
  'battle-unit:couriers',
  'battle-unit:sentries',
  'battle-unit:boneChoir',
  'battle-unit:brides',
  'battle-unit:ferry',
  'battle-unit:tinSoldier',
  'battle-unit:hobbyKnight',
  'battle-unit:marionette',
  'battle-unit:stuffedSentinel',
  'battle-unit:woodenColossus',
  'battle-unit:reliquaryArk',
  'battle-unit:larvalTide',
  'battle-unit:paperWaspLancers',
  'battle-unit:silkSpinners',
  'battle-unit:amberCarriers',
  'battle-unit:dragonflyCavalry',
  'battle-unit:halfWokenQueen',
  'battle-unit:crowChorus',
  'battle-unit:fencePostFamiliars',
  'battle-unit:besomRiders',
  'battle-unit:rusalka',
  'battle-unit:leshy',
  'battle-unit:walkingHut',
  'battle-unit:outriders',
  'battle-unit:drumCallers',
  'battle-unit:ashmaneWolves',
  'battle-unit:aurochsHerd',
  'battle-unit:grassSerpent',
  'battle-unit:thunderbird',
  'battle-unit:mirrorBound',
  'battle-unit:maskedDuelist',
  'battle-unit:hearthHound',
  'battle-unit:waxServitor',
  'battle-unit:standingMirror',
  'battle-unit:sleeper',
  'battle-unit:siegeWall',
  'battle-unit:siegeRam',
  'battle-unit:watchtower',
  'battle-unit:makerWall',
  'battle-unit:sirens',
  'battle-unit:drownedCrew',
  'battle-unit:hullTurtle',
  'battle-unit:lanternAngler',
  'terrain-field:meadow',
  'terrain:meadow:default:0',
  'terrain:meadow:default:1',
  'terrain:meadow:default:2',
  'terrain:deepwood:default:0',
  'terrain:deepwood:default:1',
  'terrain:deepwood:default:2',
  'terrain:mountain:granite:0',
  'terrain:mountain:granite:1',
  'terrain:mountain:granite:2',
  'terrain:water:default:0',
  'terrain:water:default:1',
  'terrain:water:default:2',
  'decoration:deepwood:canopy-clump',
  'decoration:mountain:range-clump',
  'decoration:mountain:range-clump-b',
  'decoration:mountain:granite-massif-1',
  'decoration:mountain:granite-scatter-1',
  'decoration:mountain:granite-scatter-2',
  'decoration:mountain:granite-scatter-3',
  'decoration:mountain:granite-scatter-4',
  'decoration:mountain:granite-scatter-5',
  'decoration:mountain:granite-scatter-6',
  'decoration:mountain:granite-knoll-1',
  'decoration:mountain:granite-knoll-2',
  'decoration:mountain:granite-knoll-3',
  'decoration:mountain:granite-knoll-4',
  'decoration:mountain:granite-ridge-1',
  'decoration:mountain:granite-ridge-2',
  'decoration:mountain:granite-ridge-3',
  'decoration:mountain:granite-ridge-4',
  'decoration:mountain:granite-massif-2',
  'decoration:mountain:rocky-knoll-1',
  'decoration:mountain:rocky-knoll-2',
  'decoration:mountain:rocky-knoll-3',
  'decoration:mountain:rocky-knoll-4',
  'decoration:mountain:rocky-ridge-1',
  'decoration:mountain:rocky-ridge-2',
  'decoration:mountain:rocky-ridge-3',
  'decoration:mountain:rocky-ridge-4',
  'decoration:mountain:rocky-massif-1',
  'decoration:mountain:rocky-massif-2',
  'decoration:mountain:rocky-backbone-1',
  'decoration:mountain:rocky-backbone-2',
  'decoration:mountain:rocky-backbone-3',
  'decoration:mountain:rocky-backbone-4',
  'decoration:mountain:rocky-backbone-5',
  'decoration:mountain:rocky-backbone-6',
  'decoration:mountain:rocky-backbone-7',
  'decoration:mountain:rocky-backbone-8',
  'decoration:mountain:rocky-boundary-1',
  'decoration:mountain:rocky-boundary-2',
  'decoration:mountain:rocky-boundary-3',
  'decoration:mountain:rocky-boundary-4',
  'decoration:mountain:rocky-boundary-5',
  'decoration:mountain:rocky-boundary-6',
  'decoration:mountain:rocky-boundary-7',
  'decoration:mountain:rocky-boundary-8',
  'decoration:mountain:snowcap-scatter-1',
  'decoration:mountain:snowcap-scatter-2',
  'decoration:mountain:snowcap-scatter-3',
  'decoration:mountain:snowcap-scatter-4',
  'decoration:mountain:snowcap-scatter-5',
  'decoration:mountain:snowcap-scatter-6',
  'decoration:mountain:snowcap-knoll-1',
  'decoration:mountain:snowcap-knoll-2',
  'decoration:mountain:snowcap-knoll-3',
  'decoration:mountain:snowcap-knoll-4',
  'decoration:mountain:snowcap-ridge-1',
  'decoration:mountain:snowcap-ridge-2',
  'decoration:mountain:snowcap-ridge-3',
  'decoration:mountain:snowcap-ridge-4',
  'decoration:mountain:snowcap-massif-1',
  'decoration:mountain:snowcap-massif-2',
  'overlay:road:e',
  'overlay:road:es',
  'overlay:road:esw',
  'overlay:road:nsw',
  'overlay:road:ew',
  'overlay:road:n',
  'overlay:road:ne',
  'overlay:road:ns',
  'overlay:road:nw',
  'overlay:road:s',
  'overlay:road:sw',
  'overlay:road:w',
  'overlay:seam:default',
  'terrain:ashsteppe:south:0',
  'terrain:ashsteppe:south:1',
  'terrain:ashsteppe:south:2',
  'terrain:barrowfield:default:0',
  'terrain:barrowfield:default:1',
  'terrain:barrowfield:default:2',
  'terrain:deepwood:mossy:0',
  'terrain:deepwood:mossy:1',
  'terrain:deepwood:mossy:2',
  'terrain:hush:north:0',
  'terrain:hush:north:1',
  'terrain:hush:north:2',
  'terrain:lacquerFlats:default:0',
  'terrain:lacquerFlats:default:1',
  'terrain:lacquerFlats:default:2',
  'terrain:meadow:coastal:0',
  'terrain:meadow:coastal:1',
  'terrain:meadow:coastal:2',
  'terrain:mire:coastal:0',
  'terrain:mire:coastal:1',
  'terrain:mire:coastal:2',
  'terrain:mosswold:mossy:0',
  'terrain:mosswold:mossy:1',
  'terrain:mosswold:mossy:2',
  'terrain:mountain:snowcap:0',
  'terrain:mountain:snowcap:1',
  'terrain:mountain:snowcap:2',
  'terrain:water:coastal:0',
  'terrain:water:coastal:1',
  'terrain:water:coastal:2',
  'decoration:ashsteppe:lone-banner',
  'decoration:ashsteppe:skulls',
  'decoration:barrowfield:candles',
  'decoration:barrowfield:letter-stone',
  'decoration:deepwood:deadfall',
  'decoration:deepwood:mushroom-ring',
  'decoration:hush:fox-tracks',
  'decoration:hush:frozen-pond',
  'decoration:lacquerFlats:grain-lines',
  'decoration:lacquerFlats:paint-flecks',
  'decoration:meadow:beehive',
  'decoration:meadow:butterfly',
  'decoration:meadow:cart-ruts',
  'decoration:meadow:flowers-blue',
  'decoration:meadow:flowers-white',
  'decoration:meadow:flowers-yellow',
  'decoration:mire:reeds',
  'decoration:mosswold:patterned-moss',
  'decoration:mosswold:stitched-ridge',
  'map-object:obstacle:old oak',
  'map-object:obstacle:the Block',
  'map-object:obstacle:the Spool',
  'map-object:pile:gold',
  'map-object:pile:timber',
  'map-object:pile:iron',
  'map-object:pile:essence',
  'map-object:chest:default',
  'map-object:mine:gold',
  'map-object:mine:timber',
  'map-object:mine:iron',
  'map-object:mine:essence',
  'map-object:richVein:default',
  'castle:hagwood:castle',
  'castle:hearthguard:castle',
  'castle:hearthguard:freeTown',
  'castle:unfinished:castle',
  'castle:unfinished:hollowTown',
  'castle:vespiary:castle',
  'castle:vespiary:coastal',
  'castle:wildergrass:castle',
  'castle:woundWrights:castle',
  'castle:woundWrights:oldSeat',
  'map-object:barrowField:default',
  'map-object:manaSpring:default',
  'map-object:shrine:craft',
  'map-object:shrine:grave',
  'map-object:shrine:rite',
  'map-object:shrine:wild',
  'map-object:waystation:default',
  'map-object:dwelling:ashmaneWolves',
  'map-object:dwelling:bannerman',
  'map-object:dwelling:besomRiders',
  'map-object:dwelling:candleWisps',
  'map-object:dwelling:couriers',
  'map-object:dwelling:crowChorus',
  'map-object:dwelling:drumCallers',
  'map-object:dwelling:fencePostFamiliars',
  'map-object:dwelling:hobbyKnight',
  'map-object:dwelling:larvalTide',
  'map-object:dwelling:longbowman',
  'map-object:dwelling:marionette',
  'map-object:dwelling:maskedDuelist',
  'map-object:dwelling:outriders',
  'map-object:dwelling:paperWaspLancers',
  'map-object:dwelling:sentries',
  'map-object:dwelling:silkSpinners',
  'map-object:dwelling:tinSoldier',
  'map-object:dwelling:yeoman',
  'map-object:boat:default',
  'map-object:bridge:complete',
  'map-object:bridge:incomplete',
  'map-object:cache:default',
  'map-object:castaway:default',
  'map-object:chrysalis:default',
  'map-object:coldCampfire:default',
  'map-object:coldSpring:default',
  'map-object:crone:default',
  'map-object:drownedBell:default',
  'map-object:flotsam:default',
  'map-object:gloamingRing:default',
  'map-object:grinningIdol:default',
  'map-object:hedgeSchool:default',
  'map-object:hutOnTheHill:default',
  'map-object:idolOfSomebody:default',
  'map-object:item:overseersCharter',
  'map-object:item:spellScroll',
  'map-object:item:tradeGoods',
  'map-object:item:waybread',
  'map-object:lighthouse:default',
  'map-object:listeningStones:default',
  'map-object:lock:manywhere-lock-needle',
  'map-object:lock:manywhere-lock-pattern',
  'map-object:lock:manywhere-lock-thimble',
  'map-object:lock:manywhere-lock-thread',
  'map-object:lock:ne-kit-lock',
  'map-object:lock:nw-kit-lock',
  'map-object:lock:se-kit-lock',
  'map-object:lock:seam-echo-lock',
  'map-object:lock:sw-kit-lock',
  'map-object:lock:the-mirror-bound',
  'map-object:lock:the-sleeper',
  'map-object:longDraught:default',
  'map-object:mercenaryCamp:default',
  'map-object:messageBottle:default',
  'map-object:moltingCourt:default',
  'map-object:monastery:default',
  'map-object:oldBearsCave:default',
  'map-object:omenStone:default',
  'map-object:overgrownCart:default',
  'map-object:patientStone:default',
  'map-object:reliquaryCairn:default',
  'map-object:ruinedWatchtower:default',
  'map-object:sealedCask:default',
  'map-object:shepherdsLeanTo:default',
  'map-object:shipwreck:default',
  'map-object:sirenRocks:default',
  'map-object:skeletonGrass:default',
  'map-object:sparringStone:default',
  'map-object:spoolHoard:default',
  'map-object:storyteller:default',
  'map-object:tinkersCart:default',
  'map-object:titheBarn:default',
  'map-object:tollGate:default',
  'map-object:tradingCamp:default',
  'map-object:treeSecondThoughts:default',
  'map-object:unquietYard:default',
  'map-object:wagonCamp:default',
  'map-object:warmTable:default',
  'map-object:watermill:default',
  'map-object:whirlpool:default',
  'map-object:windmill:default',
  'map-object:wishingWell:default',
  'map-object:wolfHollow:default',
  ...['hagwood', 'hearthguard', 'unfinished', 'vespiary', 'wildergrass', 'woundWrights']
    .flatMap((faction) => HERO_DIRECTIONS.map((direction) => `hero:${faction}:${direction}`)),
  ...AUTHORED_GUARDIAN_UNIT_IDS.map((unitId) => `guardian-unit:${unitId}`),
]);

function groundContactHeight(id: string): number | null {
  if (id.startsWith('castle:')) return 64;
  if (id.startsWith('map-object:mine:')) return 32;
  if (id === 'decoration:deepwood:canopy-clump'
      || id === 'decoration:mountain:range-clump'
      || id === 'decoration:mountain:range-clump-b'
      || id.startsWith('decoration:mountain:granite-')
      || id.startsWith('decoration:mountain:snowcap-')) return 32;
  return id.startsWith('map-object:') ? 32 : null;
}

export function canonicalAssetAnchor(
  id: string,
  w: number,
  h: number,
  fallback: AssetManifestEntry['anchor'] = { x: 0, y: 0 },
): AssetManifestEntry['anchor'] {
  const footprintHeight = groundContactHeight(id);
  if (footprintHeight !== null) return { x: fallback.x, y: h - footprintHeight };
  if (id.startsWith('hero:') || id.startsWith('guardian-unit:')
      || id.startsWith('battle-unit:')) {
    return { x: Math.floor(w / 2), y: h - 8 };
  }
  return fallback;
}

function finalizeEntry(id: string, entry: AssetManifestEntry): AssetManifestEntry {
  const footprintHeight = groundContactHeight(id);
  const ownable = id.startsWith('castle:')
    || OWNABLE_MAP_PREFIXES.some((prefix) => id.startsWith(prefix));
  return {
    ...entry,
    anchor: canonicalAssetAnchor(id, entry.w, entry.h, entry.anchor),
    flagAnchor: ownable ? {
      x: Math.max(1, entry.w - 10), y: Math.min(entry.h - 1, Math.max(15, entry.h - footprintHeight! + 16)),
    } : entry.flagAnchor,
  };
}

export const ASSET_MANIFEST: Readonly<Record<string, AssetManifestEntry>> = Object.freeze(
  Object.fromEntries(Object.entries(LEGACY_ASSET_CANDIDATES)
    .filter(([id]) => REGENERATED_ASSET_IDS.has(id))
    .map(([id, entry]) => [id, finalizeEntry(id, entry)])),
);

export const assetId = {
  terrainField: (terrain: string) => `terrain-field:${terrain}`,
  terrain: (terrain: string, skin: string, variant: number) =>
    `terrain:${terrain}:${skin}:${variant}`,
  overlay: (kind: 'road' | 'seam', variant: string) =>
    `overlay:${kind}:${variant}`,
  decoration: (terrain: string, kind: string) =>
    `decoration:${terrain}:${kind}`,
  mapObject: (kind: string, variant = 'default') =>
    `map-object:${kind}:${variant}`,
  castle: (faction: string, variant = 'castle') =>
    `castle:${faction}:${variant}`,
  hero: (faction: string, direction: string) =>
    `hero:${faction}:${direction}`,
  guardianUnit: (unitId: string) => `guardian-unit:${unitId}`,
  battleUnit: (unitId: string) => `battle-unit:${unitId}`,
} as const;

/**
 * Deliberate non-sprite representations belong here, with a player-facing reason. The coverage
 * gate accepts neither an accidental omission nor an undocumented glyph. All current work items
 * are sprited, so this seam is intentionally empty until a future renderable is explicitly
 * declared unsuitable for bitmap art.
 */
export const NON_SPRITE_REPRESENTATIONS: Readonly<Record<string, string>> = Object.freeze({});

export function manifestEntry(id: string): AssetManifestEntry | undefined {
  return ASSET_MANIFEST[id];
}
