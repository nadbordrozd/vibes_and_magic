import type {
  Coord, FactionId, GameMap, Hero, SpellSchool, TerrainId, TerrainSkinId, TerrainTile,
} from '../core/types';

export interface TerrainDefinition {
  id: TerrainId;
  label: string;
  flavor: string;
  moveCost: number;
  nativeFaction: FactionId | null;
  resonance: SpellSchool | null;
  battlefieldTemplate: string;
  skins: readonly TerrainSkinId[];
}

const terrain = (
  id: TerrainId, label: string, flavor: string, moveCost: number,
  nativeFaction: FactionId | null, resonance: SpellSchool | null,
  battlefieldTemplate: string, skins: readonly TerrainSkinId[] = ['default'],
): TerrainDefinition => ({
  id, label, flavor, moveCost, nativeFaction, resonance, battlefieldTemplate, skins,
});

export const TERRAIN: Record<TerrainId, TerrainDefinition> = {
  meadow: terrain('meadow', 'Grass', 'Grass.', 100, 'hearthguard', null, 'meadow'),
  deepwood: terrain('deepwood', 'Deepwood', 'Old trees, older shade.', 150, 'hagwood', 'wild', 'deepwood', ['default', 'mossy']),
  mosswold: terrain('mosswold', 'Mosswold', 'The moss grows in a pattern. The pattern repeats.', 150, 'vespiary', null, 'mosswold', ['default', 'mossy']),
  ashsteppe: terrain('ashsteppe', 'Ashsteppe', 'The grass grew back. The ash stayed underneath.', 125, 'wildergrass', null, 'ashsteppe', ['default', 'south']),
  barrowfield: terrain('barrowfield', 'Barrowfield', 'Quiet country. Well-tended.', 125, 'unfinished', 'grave', 'barrowfield'),
  lacquerFlats: terrain('lacquerFlats', 'Lacquer Flats', 'Smooth stone, strange grain, and a shine no rain explains.', 100, 'woundWrights', 'craft', 'lacquer'),
  hush: terrain('hush', 'The Hush', 'Snow that fell somewhere else, on somewhere else, and settled here.', 150, null, null, 'hush', ['default', 'north']),
  mire: terrain('mire', 'Mire', 'The ground is negotiable.', 175, null, null, 'mire', ['default', 'coastal']),
  mountain: terrain('mountain', 'Mountain', 'No road goes over.', Infinity, null, null, 'mountain', ['granite', 'snowcap', 'mossgrown', 'amber']),
  water: terrain('water', 'Water', 'Deep enough.', Infinity, null, null, 'sea', ['default', 'coastal']),
};

export const BATTLEFIELD_TEMPLATES: Record<string, {
  props: readonly string[]; wideProps?: boolean; special?: string;
}> = {
  meadow: { props: ['hay bale', 'drystone stub'] },
  deepwood: { props: ['trunk', 'stump'] },
  mosswold: { props: ['woven ridge', 'regular boulder'] },
  ashsteppe: { props: ['bone pile', 'dust devil'] },
  barrowfield: { props: ['standing stone', 'unlit candle'] },
  lacquer: { props: ['painted block', 'toy-shadow'], wideProps: true },
  hush: { props: ['snowdrift'] }, mire: { props: ['reed clump'], special: 'shallows' },
  mountain: { props: ['rockfall'] }, sea: { props: ['shallows'], special: 'shallows' },
};

export const tile = (terrainId: TerrainId, skin?: TerrainSkinId): TerrainTile => ({
  terrain: terrainId, ...(skin ? { skin } : {}),
});

export function terrainId(value: TerrainTile): TerrainId {
  if (typeof value !== 'string') return value.terrain;
  if (value === 'grass') return 'meadow';
  if (value === 'forest') return 'deepwood';
  if (value === 'barrow') return 'barrowfield';
  return value;
}

export function terrainIdAt(map: Pick<GameMap, 'terrain'>, position: Coord): TerrainId {
  const value = map.terrain[position.y]?.[position.x];
  return value ? terrainId(value) : 'mountain';
}

export function heroIsNative(hero: Pick<Hero, 'faction'>, terrainId: TerrainId): boolean {
  return TERRAIN[terrainId].nativeFaction === hero.faction;
}

export interface TerrainDecoration {
  id: string;
  position: Coord;
  kind: string;
  label: string;
  anomaly: boolean;
}

export const TERRAIN_DECORATIONS: Partial<
Record<TerrainId, readonly [string, string, number, boolean?][]>
> = {
  meadow: [
    ['flowers-white', 'A scatter of white flowers.', 3],
    ['flowers-yellow', 'A scatter of yellow flowers.', 3],
    ['flowers-blue', 'A scatter of blue flowers.', 3],
    ['butterfly', 'A butterfly. It is having a better week than you.', 1],
    ['beehive', 'A beehive, busy with local government.', 1],
    ['cart-ruts', 'Old cart ruts going somewhere practical.', 2],
  ],
  deepwood: [
    ['mushroom-ring', 'A ring of mushrooms, keeping its own counsel.', 2],
    ['deadfall', 'A tree finally chose a direction.', 2],
    ['canopy-clump', 'Old crowns overlap above the path.', 2],
  ],
  mosswold: [['patterned-moss', 'The pattern repeats one stitch too neatly.', 5], ['stitched-ridge', 'A ridge with an unreasonably regular shadow.', 1, true]],
  ashsteppe: [['skulls', 'Old bones, sanded clean by the wind.', 2], ['lone-banner', 'A lone banner has forgotten its side.', 1]],
  barrowfield: [['candles', 'Unlit candles wait without impatience.', 2], ['letter-stone', 'A stone shaped like a letter nobody sent.', 2]],
  lacquerFlats: [['grain-lines', 'Fine parallel lines run through the stone.', 3], ['paint-flecks', 'A bright fleck survives every weather.', 1]],
  hush: [['fox-tracks', 'Fox tracks cross the quiet.', 2], ['frozen-pond', 'The ice keeps a small dark sky.', 1]],
  mire: [['reeds', 'The reeds lean away from solid ground.', 3]],
};

/** Cosmetic placement rates. Four percent keeps ordinary-map texture visible without promoting
 * passable marks to the same repeated visual tier as interactables; the oversized Manywhere
 * catalog surface stays quieter still. */
export const DEFAULT_TERRAIN_DECORATION_DENSITY = 0.04;
export const LARGE_MAP_TERRAIN_DECORATION_DENSITY = 0.015;

function hash(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16; value = Math.imul(value, 0x7feb352d); value ^= value >>> 15;
  return value >>> 0;
}

/** Pure derivation: decorations are deterministic and intentionally absent from save data. */
export function deriveTerrainDecorations(
  map: GameMap, density = DEFAULT_TERRAIN_DECORATION_DENSITY,
): TerrainDecoration[] {
  const decorations: TerrainDecoration[] = [];
  const anomalyRegions = new Set<string>();
  for (let y = 0; y < map.height; y += 1) for (let x = 0; x < map.width; x += 1) {
    const id = terrainIdAt(map, { x, y });
    const catalog = TERRAIN_DECORATIONS[id];
    const roll = hash(map.seed ?? 0, x, y);
    if (!catalog?.length || (roll % 10_000) >= Math.round(density * 10_000)) continue;
    const weighted = catalog.flatMap((entry) => Array(entry[2]).fill(entry));
    let chosen = weighted[(roll >>> 8) % weighted.length];
    const region = `${Math.floor(x / 12)},${Math.floor(y / 12)}`;
    if (chosen[3] && anomalyRegions.has(region)) {
      chosen = catalog.find((entry) => !entry[3]) ?? chosen;
    }
    if (chosen[3]) anomalyRegions.add(region);
    decorations.push({
      id: `decoration-${x}-${y}-${chosen[0]}`, position: { x, y },
      kind: chosen[0], label: chosen[1], anomaly: Boolean(chosen[3]),
    });
  }
  return decorations;
}
