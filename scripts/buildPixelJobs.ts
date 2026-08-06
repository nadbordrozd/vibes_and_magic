import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assetWorklist, type AssetWorkItem } from '../assets/worklist';
import { UNITS } from '../src/content/units';

type Endpoint = 'create-tileset' | 'map-objects' | 'create-image-bitforge'
  | 'create-image-pixflux' | 'create-image-pixen' | 'create-character-with-8-directions';

interface Reference {
  file: string;
  parameter: string;
  deferred?: boolean;
}

interface JobRequest {
  id: string;
  assets: string[];
  output: string;
  prompt: string;
  endpoint: Endpoint;
  size: [number, number];
  generation_size?: [number, number];
  candidates: 2 | 3;
  seed: number;
  parameters: Record<string, unknown>;
  references?: Reference[];
  review_only?: boolean;
}

const ROOT = resolve(import.meta.dirname, '..');
const WORKLIST = assetWorklist();
const JOBS: string[] = [];
JOBS.push('a1-regenerate.json · 3 Wang probes · ready');

const C_STYLE = 'assets/references/c-heroes-style-lock.png';
const D_STYLE = 'assets/references/d-battle-units-style-lock.png';

const COMMON = 'Authentic hand-placed 1990s warm storybook strategy-game pixel art, crisp '
  + 'selective outlines, compact painterly clusters, consistent upper-left light, readable at '
  + 'native resolution, mundane first read, never grimdark.';

const FACTION_MATERIAL: Record<string, string> = {
  hearthguard: 'warm red and cream wool, wrought iron, modest gold heraldry, upright shields and pennants',
  woundWrights: 'oxblood lacquered wood, tin, porcelain and stitched cloth, round jointed nursery silhouettes',
  unfinished: 'ash-white funeral linen, bone, ordinary candle-gold and grave goods, gentle hollow drapery',
  vespiary: 'honey amber, black chitin, resin and paper nest, segmented asymmetric forms and papery wings',
  hagwood: 'white birch, black wicker, bone fence and crow feather with restrained berry red, crooked asymmetry',
  wildergrass: 'ochre hide, horn, ash-grey cloth and blood-red accents, low fast plural silhouettes',
  gloamingCourt: 'plum masque cloth, hearth amber, wax and polished old silver, theatrical but practical',
  seamborn: 'weathered ordinary masonry, iron, cloth and wrong-but-restrained surveying geometry',
  driftfolk: 'salt-dark timber, rope, shell, blue-grey cloth and dim lantern brass, practical maritime salvage',
};

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function pretty(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function seedFor(value: string): number {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return 6000 + ((hash >>> 0) % 900_000);
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size));
}

function balancedChunks<T>(items: readonly T[], maximum: number): T[][] {
  const count = Math.ceil(items.length / maximum);
  return chunks(items, Math.ceil(items.length / count));
}

function writeJob(
  name: string, requests: JobRequest[],
  options: { status?: 'ready' | 'staged'; blockedBy?: string } = {},
): void {
  const job = {
    version: 1,
    status: options.status ?? 'ready',
    ...(options.blockedBy ? { blocked_by: options.blockedBy } : {}),
    contact_sheet: `assets/jobs/${name}-candidates.html`,
    requests,
  };
  writeFileSync(resolve(ROOT, `assets/jobs/${name}.json`), `${JSON.stringify(job, null, 2)}\n`);
  JOBS.push(`${name}.json · ${requests.length} request${requests.length === 1 ? '' : 's'} · ${job.status}`);
}

function output(batch: string, id: string): string {
  return `.pixel-work/pixelgen/${batch}/${safeId(id)}`;
}

function bitforge(
  batch: string, id: string, prompt: string, size: [number, number],
  reference?: Reference, assets: string[] = [id], view = 'high top-down', direction?: string,
): JobRequest {
  return {
    id, assets, output: output(batch, id), prompt, endpoint: 'create-image-bitforge',
    size, candidates: 2, seed: seedFor(`${batch}:${id}`),
    parameters: {
      negative_description: 'background, floor tile, scenery, text, UI, logo, watermark, glow, '
        + 'photorealism, smooth vector art, baked ownership colors',
      text_guidance_scale: 9, style_strength: reference ? 35 : 0,
      outline: 'selective outline', shading: 'medium shading', detail: 'medium detail',
      view, ...(direction ? { direction } : {}), no_background: true,
    },
    ...(reference ? { references: [reference] } : {}),
  };
}

function pixflux(
  batch: string, item: AssetWorkItem, description: string, variant: string,
): JobRequest {
  const seedOverrides: Record<string, number> = {
    'terrain:deepwood:default:1': 77211,
    'terrain:deepwood:default:2': 77231,
  };
  return {
    id: item.id, assets: [item.id], output: output(batch, item.id),
    prompt: `Native 32x32 seamless square terrain tile: ${description}. Variant cue: ${variant}. `
      + `${COMMON} High-oblique 65-degree material read inside a flat square cell; uniform whole-tile `
      + 'illumination and edge values. Quiet continuous low-contrast field, mostly one material and '
      + '5–7 closely related colours; no distinct cluster larger than 3 pixels. Fill every pixel '
      + 'opaquely. No flowers, berries, bright dots, separate plants, transparency, gradient, vignette, '
      + 'pink, magenta or red accents, border, row, column, checkerboard, large focal motif, object, '
      + 'path, text, UI, logo or watermark.',
    endpoint: 'create-image-pixflux', size: [32, 32], candidates: 2,
    seed: seedOverrides[item.id] ?? seedFor(`${batch}:${item.id}`),
    parameters: {
      negative_description: 'transparent pixels, empty background, isolated icon, tile border, '
        + 'top-to-bottom lighting gradient, horizontal band, vertical band, repeated row, scenery, '
        + 'flowers, berries, red dots, pink pixels, magenta pixels, yellow dots, bouquets, large '
        + 'tufts, circular plant clumps',
      text_guidance_scale: 10, outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', view: 'high top-down', no_background: false,
      init_image_strength: 220,
    },
    references: [{ file: `assets/guides/a1-${item.id.split(':')[1]}-base.png`, parameter: 'init_image' }],
  };
}

const A1_TERRAIN: Record<string, { description: string; variants: string[] }> = {
  meadow: {
    description: 'quiet warm-green medieval meadow ground with short straw-green grass and tiny earth flecks',
    variants: ['fine diagonal blade clusters', 'sparse umber soil pinpricks', 'subtle wind-flattened grass weave'],
  },
  deepwood: {
    description: 'quiet continuous dark Deepwood forest floor, ordinary damp umber-green loam and low moss dust beneath separate tall canopy decorations; no visible roots, plants, leaves, flowers or branches',
    variants: ['fine moss-dark grains', 'nearly featureless damp loam with tiny charcoal grains', 'subdued moss-dark leaf dust reduced to irregular one-pixel fragments'],
  },
  mountain: {
    description: 'hard impassable grey granite ground with close broken rock planes and small scree, ready to sit beneath separate tall range props',
    variants: ['angular upper-left-lit chips', 'tight charcoal fissures', 'broad restrained granite planes'],
  },
  water: {
    description: 'calm slate-blue-green open water with tiny foreshortened diagonal ripples',
    variants: ['sparse pale ripple stitches', 'quiet deep-slate wavelets', 'small broken blue-green reflections'],
  },
};
const a1Fallback = ['meadow', 'deepwood', 'mountain', 'water'].flatMap((terrain) =>
  A1_TERRAIN[terrain].variants.map((variant, index) => {
    const item = WORKLIST.find((candidate) => candidate.id === `terrain:${terrain}:${
      terrain === 'mountain' ? 'granite' : 'default'}:${index}`)!;
    return pixflux('a1-tiles', item, A1_TERRAIN[terrain].description, variant);
  }));
chunks(a1Fallback, 6).forEach((requests, index) => writeJob(`a1-tiles-${index + 1}`, requests));

writeJob('a1-height-experiment', [
  {
    id: 'decoration:deepwood:canopy-clump', assets: ['decoration:deepwood:canopy-clump'],
    output: output('a1-height-experiment', 'deepwood-scattered-canopy'),
    prompt: 'Native 32x64 transparent passable Deepwood canopy-clump decoration. One irregular '
      + 'cluster of two or three overlapping ordinary broadleaf crowns occupies the upper 42 pixels; '
      + 'one narrow dark trunk and sparse low branches meet the bottom-center ground anchor. It must '
      + 'overhang a hero standing one tile behind it without reading as a blocking object. Warm '
      + 'storybook 1990s strategy-game pixel art, high-oblique 65-degree view, upper-left-lit crown '
      + 'tops and dark lower-right near faces. No terrain square, grass, roots spreading across the '
      + 'bottom row, path, flowers, fruit, glow, scenery, horizon, text, UI, logo or watermark.',
    endpoint: 'map-objects', size: [32, 64], candidates: 3, seed: 78100,
    parameters: {
      view: 'high top-down', outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', text_guidance_scale: 10,
    },
  },
  {
    id: 'review:deepwood:border-tree', assets: ['review:deepwood:border-tree'],
    review_only: true, output: output('a1-height-experiment', 'deepwood-border-tree'),
    prompt: 'Native 32x64 transparent Deepwood border-tree decoration. One tall narrow ordinary '
      + 'broadleaf tree with a readable dark trunk in the lower half and an asymmetric dense crown '
      + 'in the upper half; copies on neighboring forest-edge tiles must overlap into a continuous '
      + 'perimeter while leaving the forest interior visually quiet. Warm storybook 1990s strategy-game '
      + 'pixel art, high-oblique 65-degree view, upper-left-lit crown and dark lower-right near face. '
      + 'No terrain square, grass, roots across the bottom row, path, flowers, fruit, glow, scenery, '
      + 'horizon, text, UI, logo or watermark.',
    endpoint: 'map-objects', size: [32, 64], candidates: 3, seed: 78120,
    parameters: {
      view: 'high top-down', outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', text_guidance_scale: 10,
    },
  },
  {
    id: 'decoration:mountain:range-clump', assets: ['decoration:mountain:range-clump'],
    output: output('a1-height-experiment', 'mountain-range-clump'),
    prompt: 'Native 64x96 transparent squat granite ridge decoration spanning two bottom tiles. '
      + 'Follow the supplied silhouette and value guide closely: three close blunt broken crags, '
      + 'not a single triangular peak, with a broad complete 64x16 ground contact along the bottom. '
      + 'Use only dark charcoal, cool grey, and muted pewter rock planes; every light plane is bare '
      + 'grey stone. Authentic hand-placed 1990s warm storybook strategy-game pixel art, crisp '
      + 'selective outlines, compact painterly clusters, upper-left light, high-oblique view. '
      + 'Transparent outside the rock silhouette. No snow, ice, white, cream, blue-white, conifers, '
      + 'trees, grass, orange rock, isolated alpine peak, horizon, sky, cave, glow, text, UI, logo or watermark.',
    endpoint: 'create-image-pixflux', size: [64, 96], candidates: 3, seed: 78240,
    parameters: {
      view: 'high top-down', outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', text_guidance_scale: 12, no_background: true,
      init_image_strength: 260,
    },
    references: [{ file: 'assets/guides/a1-mountain-range.png', parameter: 'init_image' }],
  },
]);

const roadItems = WORKLIST.filter((item) => item.id.startsWith('overlay:road:'));
const roadDirection: Record<string, string> = {
  n: 'north', e: 'east', s: 'south', w: 'west',
};
const roadRequests = roadItems.map((item) => {
  const mask = item.id.split(':')[2];
  const edges = [...mask].map((direction) => roadDirection[direction]).join(', ');
  return {
    id: item.id, assets: [item.id], output: output('a2-overlays', item.id),
    prompt: `Native 32x32 transparent packed-earth road overlay connecting only the ${edges} edge centers. `
    + 'The road is exactly six pixels wide at every requested edge, aligned to the middle six '
    + 'pixels, with a solid filled restrained warm ochre-brown surface and sparse cream pebbles. Every '
    + 'unrequested edge remains fully transparent; dead ends have compact rounded caps. '
    + `${COMMON} Follow the supplied topology guide exactly. No grass, ground square, branch to any `
    + 'other edge, cast shadow or border.',
    endpoint: 'create-image-pixflux' as const, size: [32, 32] as [number, number],
    candidates: 2 as const,
    seed: item.id === 'overlay:road:ew' ? 88320 : seedFor(`a2-overlays:${item.id}`),
    parameters: {
      negative_description: 'hollow road, outline-only road, one-pixel line, empty image, background, floor tile, scenery, extra road branch, wrong edge connection, text, UI, logo, watermark, glow, smooth vector art',
      text_guidance_scale: 12, outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', view: 'high top-down', no_background: true,
      init_image_strength: item.id === 'overlay:road:ew' ? 350 : 420,
    },
    references: [{ file: `assets/guides/a2-road-${mask}.png`, parameter: 'init_image' }],
  };
});
const seam = WORKLIST.find((item) => item.id === 'overlay:seam:default')!;
const seamRequest: JobRequest = {
  id: seam.id, assets: [seam.id], output: output('a2-overlays', seam.id),
  prompt: 'Native 32x32 transparent Seam overlay: one quiet wrong-coloured surveying hairline crossing '
  + 'the ground diagonally, made from a sparse one-pixel broken plum-blue stitch. It reads as land '
  + 'that changes its mind, not a spell effect. It must remain subordinate when repeated across a '
  + `large map. ${COMMON} Follow the supplied layout guide exactly. No glow, particles, thick stripe, `
  + 'central symbol, border or ground fill.',
  endpoint: 'create-image-bitforge', size: [32, 32], candidates: 2,
  seed: 13520,
  parameters: {
    negative_description: 'empty image, fully transparent image, background, floor tile, scenery, thick stripe, extra marks, central symbol, text, UI, logo, watermark, glow',
    text_guidance_scale: 14, outline: 'selective outline', shading: 'medium shading',
    detail: 'medium detail', view: 'high top-down', no_background: true,
    style_strength: 90,
  },
  references: [{ file: 'assets/guides/a2-seam.png', parameter: 'style_image' }],
};
writeJob('a2-overlays-1', roadRequests.slice(0, 6));
writeJob('a2-overlays-2', [...roadRequests.slice(6), seamRequest]);

const TERRAIN_DESCRIPTION: Record<string, string> = {
  'ashsteppe:south': 'dry ochre-grey steppe grass with fine black ash beneath, low wind-combed blades and no bones or banners',
  'barrowfield:default': 'quiet pale country grass with chalky straw and subtle well-tended hummock texture, no graves or stones',
  'deepwood:mossy': 'quiet dense wet old-forest floor with dark loam and moss dust beneath separate tall canopy props, no roots, branches, leaves or clearing',
  'hush:north': 'pale quiet wind-set snow with restrained blue-grey shadow grains, no drift object or tracks',
  'lacquerFlats:default': 'smooth muted oxblood-brown stone with strange fine lacquer grain and restrained dull shine, no boards or objects',
  'meadow:coastal': 'salt-lush coastal meadow with short warm green grass and sparse straw blades, no flowers, rocks or shore',
  'mire:coastal': 'dark negotiable peat and blue-green shallow wet ground with tiny broken reed reflections, no reeds or pools as objects',
  'mosswold:mossy': 'ordinary green moss field with subtly too-regular woven microtexture, no ridge, symbols or glow',
  'mountain:snowcap': 'impassable cold grey mountain ground with close broken stone planes and restrained old snow grains beneath separate tall range props',
  'water:coastal': 'calm slate-blue coastal water with tiny foreshortened blue-green ripples, no rocks, foam, shore or horizontal bands',
};
const coreTerrain = new Set(['deepwood:default', 'meadow:default', 'mountain:granite', 'water:default']);
const terrainPairs = [...new Set(WORKLIST.filter((item) => item.category === 'terrain'
  && item.id.startsWith('terrain:'))
  .map((item) => item.id.split(':').slice(1, 3).join(':')))]
  .filter((pair) => !coreTerrain.has(pair));
const terrainCues = [
  'fine irregular material grains', 'sparse darker broken flecks', 'quiet broad microtexture planes',
];
const A3_SEED_OVERRIDES: Record<string, number> = {
  'terrain:barrowfield:default:0': 84500,
  'terrain:barrowfield:default:2': 84520,
  'terrain:deepwood:mossy:1': 84610,
  'terrain:lacquerFlats:default:2': 84720,
  'terrain:mire:coastal:1': 84810,
  'terrain:mire:coastal:2': 84820,
  'terrain:ashsteppe:south:1': 85010,
  'terrain:deepwood:mossy:0': 85020,
  'terrain:hush:north:1': 85030,
  'terrain:lacquerFlats:default:1': 85040,
  'terrain:water:coastal:1': 85050,
  'terrain:water:coastal:2': 85060,
};
const A3_STRENGTH_OVERRIDES: Record<string, number> = {
  'terrain:ashsteppe:south:1': 340,
  'terrain:deepwood:mossy:0': 340,
  'terrain:hush:north:1': 340,
  'terrain:lacquerFlats:default:1': 340,
  'terrain:water:coastal:1': 340,
  'terrain:water:coastal:2': 340,
};
const terrainRequests = terrainPairs.flatMap((pair) => [0, 1, 2].map((variant): JobRequest => {
  const id = `terrain:${pair}:${variant}`;
  return {
    id, assets: [id], output: output('a3-terrain', id),
    prompt: `Native 32x32 seamless opaque terrain tile: ${TERRAIN_DESCRIPTION[pair]}. `
      + `Variant cue: ${terrainCues[variant]}. ${COMMON} High-oblique 65-degree material read inside `
      + 'a flat square cell; quiet continuous low-contrast field in 5–7 close colours. Fill every '
      + 'pixel opaquely and keep illumination and edge values uniform. No distinct motif larger than '
      + '3 pixels, transparency, gradient, vignette, border, row, column, checkerboard, focal object, '
      + 'path, flowers, large plant, text, UI, logo or watermark.',
    endpoint: 'create-image-pixflux', size: [32, 32], candidates: 2,
    seed: A3_SEED_OVERRIDES[id] ?? seedFor(`a3:${id}`),
    parameters: {
      negative_description: 'transparent pixels, empty background, tile border, gradient, horizontal band, vertical band, repeated row, checkerboard, scenery, flowers, berries, bright dots, large motif, object, path, text, UI, logo, watermark',
      text_guidance_scale: 10, outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', view: 'high top-down', no_background: false,
      init_image_strength: A3_STRENGTH_OVERRIDES[id]
        ?? (A3_SEED_OVERRIDES[id] ? 280 : 220),
    },
    references: [{ file: `assets/guides/a3-${pair.replace(':', '-')}.png`, parameter: 'init_image' }],
  };
}));
chunks(terrainRequests, 10).forEach((requests, index) =>
  writeJob(`a3-terrain-${index + 1}`, requests));

// Native review batch requested after the H2 transition study. These six gameplay families have
// no exact H2 equivalent. Each Wang request generates the family's complete dirt-mediated edge
// vocabulary; the small detail requests test map-scale decoration discipline without replacing the
// separately-authored decoration layer. H2-derived guides preserve 32px transition and motif scale.
const GAME_TERRAIN_GENERATION = [
  {
    id: 'deepwood', label: 'Deepwood',
    material: 'dark wet old-forest floor, fine loam and moss dust beneath separate canopy props',
    transition: 'an irregular low dirt shoulder feathered with moss and a few grass pixels',
    micro: 'one tiny cluster of two or three mushrooms occupying only 2–4 pixels total',
    macro: 'one fallen branch lying flat across 8–14 pixels, narrow and ground-bound',
  },
  {
    id: 'mosswold', label: 'Mosswold',
    material: 'ordinary green moss field with a subtle too-regular woven microtexture',
    transition: 'a soft broken dirt edge where moss threads thin into ordinary soil',
    micro: 'one tiny pale mushroom cap cluster occupying only 2–4 pixels total',
    macro: 'one shallow woven moss ridge spanning 8–14 pixels without becoming an object or wall',
  },
  {
    id: 'ashsteppe', label: 'Ashsteppe',
    material: 'dry ochre-grey steppe grass with fine black ash beneath and low wind-combed blades',
    transition: 'a dusty broken dirt edge with a restrained scatter of ash-dark grains',
    micro: 'two tiny weathered animal-bone fragments occupying only 3–5 pixels total',
    macro: 'one thin irregular ground crack spanning 8–14 pixels without glow or depth',
  },
  {
    id: 'barrowfield', label: 'Barrowfield',
    material: 'quiet pale country grass with chalky straw and subtle well-tended hummock texture',
    transition: 'a narrow pale-grass-to-dirt edge with sparse chalky root pixels',
    micro: 'one tiny unlit candle stub occupying only 2–3 pixels, no flame or glow',
    macro: 'one shallow grass-covered hummock spanning 8–14 pixels, low and passable',
  },
  {
    id: 'lacquer-flats', label: 'Lacquer Flats',
    material: 'smooth muted oxblood-brown stone with strange fine lacquer grain and restrained dull shine',
    transition: 'an irregular chipped lacquer-stone edge exposing ordinary brown dirt',
    micro: 'one tiny weathered paint fleck occupying only 1–3 pixels',
    macro: 'one hairline branching crack spanning 8–14 pixels without becoming a trench',
  },
  {
    id: 'mire', label: 'Mire',
    material: 'dark negotiable peat and blue-green shallow wet ground with tiny broken reflections',
    transition: 'a soft muddy dirt margin with two or three damp blue-green pixels',
    micro: 'one tiny frog-like green speck occupying only 2–3 pixels and readable as incidental life',
    macro: 'one low reed-shadow and ripple mark spanning 8–14 pixels, flat and passable',
  },
] as const;

const GAME_TERRAIN_DIRT = 'quiet ordinary warm brown dirt with compact irregular grains, uniform '
  + 'illumination and no road, border, object, repeated row, gradient or tile extrusion';

const gameTerrainWangRequests = GAME_TERRAIN_GENERATION.map((family): JobRequest => ({
  id: `review:game-terrain:${family.id}:wang`,
  assets: [`review:game-terrain:${family.id}:wang`],
  output: output('game-terrain-native-wang', family.id),
  prompt: `Native 32x32 ${family.label}-to-dirt Wang tileset for the adventure-map showcase. `
    + 'The literal material, transition, scale, camera and style requirements are in parameters.',
  endpoint: 'create-tileset', size: [32, 32], candidates: 2,
  seed: seedFor(`game-terrain-wang:${family.id}`),
  parameters: {
    lower_description: `${GAME_TERRAIN_DIRT}. ${COMMON}`,
    upper_description: `${family.material}. Every cell represents roughly one human-sized patch of ground. `
      + `Incidental insects, fungi, bone chips or paint flecks must stay 1–5 pixels; a branch, ridge `
      + `or crack may span 8–14 pixels but must remain flat. ${COMMON} Quiet continuous opaque field, `
      + 'uniform edge values, no focal object, border, path, gradient, checkerboard, text or watermark.',
    transition_description: `${family.transition}; two or more alternate irregular edge profiles, `
      + 'restrained pixel-scale feathering, no cliff, wall, glow, outline band or oversized motif.',
    transition_size: 0.25,
    mode: 'standard', view: 'high top-down', outline: 'selective outline',
    shading: 'medium shading', detail: 'medium detail', text_guidance_scale: 10,
    color_image: null,
  },
  references: [{
    file: `assets/guides/game-terrain-${family.id}-h2-reference.png`, parameter: 'color_image',
  }],
  review_only: true,
}));

balancedChunks(gameTerrainWangRequests, 3).forEach((requests, index) =>
  writeJob(`game-terrain-native-wang-${index + 1}`, requests));

const gameTerrainWangRetryRequests = GAME_TERRAIN_GENERATION
  .filter((family) => family.id === 'ashsteppe' || family.id === 'lacquer-flats')
  .map((family): JobRequest => {
    const paletteCorrection = family.id === 'ashsteppe'
      ? 'Desaturated taupe-grey and subdued dry ochre only; no bright orange, yellow sand, white sand, checkerboard, repeated dots or woven grid.'
      : 'Muted oxblood, dusty plum-brown and dull stone-grey only; no orange clay, bright copper, floorboards, parallel rows, checkerboard or woven grid.';
    return {
      id: `review:game-terrain:${family.id}:wang-v2`,
      assets: [`review:game-terrain:${family.id}:wang-v2`],
      output: output('game-terrain-native-wang-retry', family.id),
      prompt: `Native 32x32 corrected ${family.label}-to-dirt Wang tileset for the adventure-map `
        + `showcase. ${paletteCorrection} Keep H2 reference influence to edge geometry and native `
        + 'detail scale; the upper two guide rows own the game-family palette.',
      endpoint: 'create-tileset', size: [32, 32], candidates: 2,
      seed: seedFor(`game-terrain-wang-v2:${family.id}`),
      parameters: {
        lower_description: `${GAME_TERRAIN_DIRT}. ${COMMON}`,
        upper_description: `${family.material}. ${paletteCorrection} Every cell represents roughly `
          + 'one human-sized patch of ground; quiet irregular continuous opaque material with uniform '
          + `edge values. ${COMMON} No focal object, path, border, gradient, text or watermark.`,
        transition_description: `${family.transition}; two alternate irregular edge profiles using `
          + 'the H2 guide only for native contour scale, no cliff, glow, outline stripe or large motif.',
        transition_size: 0.25,
        mode: 'standard', view: 'high top-down', outline: 'selective outline',
        shading: 'medium shading', detail: 'medium detail', text_guidance_scale: 12,
        color_image: null,
      },
      references: [{
        file: `assets/guides/game-terrain-${family.id}-h2-reference-v2.png`, parameter: 'color_image',
      }],
      review_only: true,
    };
  });
writeJob('game-terrain-native-wang-retry', gameTerrainWangRetryRequests);

const gameTerrainDetailRequests = GAME_TERRAIN_GENERATION.flatMap((family) =>
  (['micro', 'macro'] as const).map((scale): JobRequest => {
    const scaleLaw = scale === 'micro'
      ? 'The decoration must occupy at most one eighth of the tile width and under 2% of its area.'
      : 'The mark may span one quarter to under one half of the tile width, but must remain narrow, flat and secondary.';
    return {
      id: `review:game-terrain:${family.id}:${scale}`,
      assets: [`review:game-terrain:${family.id}:${scale}`],
      output: output('game-terrain-native-details', `${family.id}-${scale}`),
      prompt: `Native 32x32 seamless opaque ${family.label} terrain cell: ${family.material}; `
        + `${family[scale]}. One tile is roughly human-sized. ${scaleLaw} ${COMMON} Preserve a quiet `
        + 'continuous field across all four edges with uniform illumination. No enlarged icon, specimen, '
        + 'foreground object, border, vignette, gradient, path, text, UI, logo or watermark.',
      endpoint: 'create-image-pixflux', size: [32, 32], candidates: 2,
      seed: seedFor(`game-terrain-detail:${family.id}:${scale}`),
      parameters: {
        negative_description: 'oversized decoration, giant insect, giant mushroom, giant bone, focal object, centered icon, tile border, gradient, vignette, horizontal band, repeated row, checkerboard, transparency, scenery, text, UI, logo, watermark',
        text_guidance_scale: 11, outline: 'selective outline', shading: 'medium shading',
        detail: 'medium detail', view: 'high top-down', no_background: false,
        init_image_strength: 190,
      },
      references: [{
        file: `assets/guides/game-terrain-${family.id}-${scale}-h2.png`, parameter: 'init_image',
      }],
      review_only: true,
    };
  }));

balancedChunks(gameTerrainDetailRequests, 6).forEach((requests, index) =>
  writeJob(`game-terrain-native-details-${index + 1}`, requests));

const gameTerrainDetailRetryRequests = GAME_TERRAIN_GENERATION.flatMap((family) =>
  (['micro', 'macro'] as const).map((scale): JobRequest => {
    const exactScale = scale === 'micro'
      ? 'Preserve the guide motif at exactly 2–5 pixels total; it may not exceed 4 pixels in either dimension.'
      : 'Preserve the guide mark at 8–14 pixels long and at most 2 pixels thick; it may not grow, become upright, or fill the cell.';
    return {
      id: `review:game-terrain:${family.id}:${scale}-v2`,
      assets: [`review:game-terrain:${family.id}:${scale}-v2`],
      output: output('game-terrain-native-details-retry', `${family.id}-${scale}`),
      prompt: `Native 32x32 seamless opaque ${family.label} terrain cell derived from the supplied `
        + `same-size composition guide. ${family.material}; ${family[scale]}. ${exactScale} One cell is `
        + `roughly human-sized. Change only the marked pixels into the requested incidental detail; `
        + `preserve the guide's field palette, motif footprint, placement, uniform edges and 32x32 scale. `
        + `${COMMON} No enlarged specimen, icon, focal object, border, path, gradient, text or watermark.`,
      endpoint: 'create-image-pixflux', size: [32, 32], candidates: 2,
      seed: seedFor(`game-terrain-detail-v2:${family.id}:${scale}`),
      parameters: {
        negative_description: 'oversized decoration, giant insect, giant mushroom, giant bone, enlarged branch, thick crack, focal object, centered icon, palette replacement, tile border, gradient, vignette, banding, checkerboard, transparency, scenery, text, UI, logo, watermark',
        text_guidance_scale: 13, outline: 'selective outline', shading: 'medium shading',
        detail: 'medium detail', view: 'high top-down', no_background: false,
        init_image_strength: 330,
      },
      references: [{
        file: `assets/guides/game-terrain-${family.id}-${scale}-guide-v2.png`, parameter: 'init_image',
      }],
      review_only: true,
    };
  }));

balancedChunks(gameTerrainDetailRetryRequests, 6).forEach((requests, index) =>
  writeJob(`game-terrain-native-details-retry-${index + 1}`, requests));

function mapObjectRequest(
  batch: string, item: AssetWorkItem, size: [number, number], subject: string,
  extra = '',
): JobRequest {
  const overhang = size[1] > item.h
    ? `The bottom ${item.h}px is the ground-contact footprint and every pixel above it is visual overhang. `
    : '';
  const ownership = item.ownable
    ? 'No owner colour and no flag; preserve a small clear upper-right silhouette edge for the runtime pennant. '
    : '';
  return {
    id: item.id, assets: [item.id], output: output(batch, item.id),
    prompt: `Native ${size[0]}x${size[1]} transparent adventure-map sprite of ${subject}. `
      + `${overhang}${ownership}${extra}High-oblique three-quarter adventure camera around 65 degrees, `
      + `readable roof or upper surfaces, bottom-anchored. ${COMMON} No terrain patch, grass square, `
      + 'environment, horizon, pedestal, cast scenery, UI, text, logo, watermark, glow or baked shadow.',
    endpoint: 'map-objects', size, candidates: 2, seed: seedFor(`${batch}:${item.id}`),
    parameters: {
      view: 'high top-down', outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', text_guidance_scale: 9,
    },
  };
}

const decorationItems = WORKLIST.filter((item) => item.category === 'decoration'
  && item.id !== 'decoration:mountain:range-clump'
  && item.id !== 'decoration:deepwood:canopy-clump');
const DECORATION_SUBJECT: Record<string, string> = {
  'decoration:deepwood:deadfall': 'one low fallen weathered log lying diagonally with two short broken branch stubs',
  'decoration:lacquerFlats:grain-lines': 'three short thin parallel scratches lying flat on lacquered stone',
  'decoration:mosswold:stitched-ridge': 'one low narrow raised moss ridge with an unnaturally regular stitched shadow',
};
const DECORATION_SEED: Record<string, number> = {
  'decoration:deepwood:deadfall': 86110,
  'decoration:lacquerFlats:grain-lines': 86120,
  'decoration:mosswold:stitched-ridge': 86130,
};
const FLAT_DECORATION_GUIDE: Record<string, string> = {
  'decoration:lacquerFlats:grain-lines': 'assets/guides/a4-lacquer-grain-lines.png',
  'decoration:mosswold:stitched-ridge': 'assets/guides/a4-mosswold-stitched-ridge.png',
};
const decorationRequests = decorationItems.map((item) => {
  const [, terrain, variant] = item.id.split(':');
  const flat = DECORATION_SUBJECT[item.id]
    ? 'Keep it low and ground-bound with transparent space around it. It is a terrain mark or fallen material, not an upright object, building, sign, tool, plant, fence, plinth, icon or pickup. '
    : 'Keep the motif sparse, low, non-interactive and subordinate to heroes and objects. ';
  const request = mapObjectRequest('a4-decorations', item, [Math.max(32, item.w), Math.max(32, item.h)],
    DECORATION_SUBJECT[item.id]
      ?? `a small passable ${pretty(variant)} terrain decoration for ${pretty(terrain)}`,
    flat);
  if (!FLAT_DECORATION_GUIDE[item.id]) {
    return { ...request, seed: DECORATION_SEED[item.id] ?? request.seed };
  }
  return {
    ...request, endpoint: 'create-image-pixflux' as const,
    seed: DECORATION_SEED[item.id],
    parameters: {
      negative_description: 'empty image, upright object, building, sign, tool, fence, pedestal, plinth, square ground tile, scenery, text, UI, logo, watermark, glow',
      text_guidance_scale: 13, outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', view: 'high top-down', no_background: true,
      init_image_strength: 300,
    },
    references: [{ file: FLAT_DECORATION_GUIDE[item.id], parameter: 'init_image' }],
  };
});
chunks(decorationRequests, 7).forEach((requests, index) =>
  writeJob(`a4-decorations-${index + 1}`, requests));

const obstacleItems = WORKLIST.filter((item) => item.id.startsWith('map-object:obstacle:'));
const obstacleRequests = obstacleItems.map((item) => {
  const variant = item.id.split(':')[2];
  const size: [number, number] = item.w === 64 ? [64, 32] : [32, 64];
  const request = mapObjectRequest('a4-obstacles', item, size,
    variant === 'old oak' ? 'one ancient broadleaf oak with a thick ordinary trunk and dense crown'
      : variant === 'the Spool' ? 'the Spool, a giant weathered wooden thread spool anomaly'
        : 'the Block, one giant worn rectangular toy-maker block anomaly',
    'The complete blocking silhouette must meet the bottom footprint. ');
  if (item.id !== 'map-object:obstacle:the Block') return request;
  return {
    ...request, endpoint: 'create-image-pixflux' as const, seed: 86210,
    parameters: {
      negative_description: 'building, house, castle, tower, windows, door, grass, ground tile, plinth, scenery, text, UI, logo, watermark, glow',
      text_guidance_scale: 13, outline: 'selective outline', shading: 'medium shading',
      detail: 'medium detail', view: 'high top-down', no_background: true,
      init_image_strength: 300,
    },
    references: [{ file: 'assets/guides/a4-obstacle-block.png', parameter: 'init_image' }],
  };
});
writeJob('a4-obstacles', obstacleRequests);

const mapItems = WORKLIST.filter((item) => item.category === 'map-object');
function byIds(ids: string[]): AssetWorkItem[] {
  return ids.map((id) => mapItems.find((item) => item.id === id)!).filter(Boolean);
}

const b1 = byIds([
  'map-object:pile:gold', 'map-object:pile:timber', 'map-object:pile:iron',
  'map-object:pile:essence', 'map-object:chest:default',
]);
writeJob('b1-resources', b1.map((item) => {
  const [, kind, variant] = item.id.split(':');
  const subject = kind === 'chest' ? 'a closed practical timber treasure chest with iron bands'
    : `a compact pickup pile of ${pretty(variant)}`;
  return mapObjectRequest('b1-resources', item, [32, 32], subject,
    'Use a strong simple material silhouette with generous transparent padding and no ground patch. ');
}));

const b2 = byIds([
  'map-object:mine:gold', 'map-object:mine:timber', 'map-object:mine:iron',
  'map-object:mine:essence', 'map-object:richVein:default',
]);
writeJob('b2-mines', b2.map((item) => {
  const variant = item.id.split(':')[2];
  if (item.id.includes(':mine:')) return mapObjectRequest('b2-mines', item, [64, 80],
    variant === 'timber' ? 'a compact timber camp with stacked logs, braces and a small shelter'
      : variant === 'essence' ? 'an ordinary stone-lined essence spring with restrained blue-violet water'
        : `a practical ${pretty(variant)} mine with timber braces and quarried material`,
    'The bottom 32px row is the 2x1 ground contact. The open visitable mouth must occupy the '
      + 'bottom-left 32x32 entrance tile; the bottom-right tile must read physically blocked. ');
  return mapObjectRequest('b2-mines', item, [32, 48],
    'a compact rich mineral vein outcrop with readable faceted ore',
    'Keep the bottom 32px as physical contact and the upper pixels as a low overhang. ');
}));

const castleItems = WORKLIST.filter((item) => item.category === 'castle');
chunks(castleItems, 5).forEach((items, index) => writeJob(`b3-castles-${index + 1}`,
  items.map((item) => {
    const [, faction, variant] = item.id.split(':');
    const variantText = variant === 'castle' ? 'faction castle' : pretty(variant);
    return mapObjectRequest('b3-castles', item, [96, 128],
      `the ${pretty(faction)} ${variantText}, built from ${FACTION_MATERIAL[faction]}`,
      'The bottom 64px is the exact 3x2 ground contact. Draw the only convincing gate dead-centre '
        + 'on the bottom edge, inside pixels x=32..63 and y=96..127. Towers and roofs rise through '
        + 'the upper 64px. Keep a clear pennant planting edge near pixel x=86,y=80. No other door '
        + 'may imply a legal entrance. ');
  })));

const b4Kinds = new Set(['barrowField', 'manaSpring', 'waystation', 'shrine']);
const b4 = mapItems.filter((item) => b4Kinds.has(item.id.split(':')[1]));
writeJob('b4-sites', b4.map((item) => {
  const [, kind, variant] = item.id.split(':');
  const size: [number, number] = ['barrowField', 'waystation'].includes(kind) ? [32, 64] : [32, 48];
  return mapObjectRequest('b4-sites', item, size,
    kind === 'shrine' ? `a small raised ${pretty(variant)} school roadside shrine`
      : kind === 'barrowField' ? 'one compact pale barrow mound with a single dark foreground mouth'
        : kind === 'waystation' ? 'a narrow roofed traveller waystation with a foreground doorway'
          : 'an ordinary stone mana-spring basin with restrained strange water',
    'The foreground visit point must be visually obvious without an emblem ring or ground plinth. ');
}));

const dwellingItems = mapItems.filter((item) => item.id.startsWith('map-object:dwelling:'));
const dwellingRequests = dwellingItems.map((item) => {
  const unitId = item.id.split(':')[2] as keyof typeof UNITS;
  const unit = UNITS[unitId];
  return mapObjectRequest('b5-dwellings', item, [32, 48],
    `a small recruitable ${unit.name} dwelling built from ${FACTION_MATERIAL[unit.faction]}`,
    'It must read as a building rather than a unit icon, bowl, emblem or miniature creature. Draw '
      + 'one foreground doorway on the bottom contact tile. ');
});
chunks(dwellingRequests, 7).forEach((requests, index) =>
  writeJob(`b5-dwellings-${index + 1}`, requests));

const handled = new Set([
  ...obstacleItems, ...b1, ...b2, ...b4, ...dwellingItems,
].map((item) => item.id));
const TALL_KINDS = new Set([
  'lighthouse', 'monastery', 'ruinedWatchtower', 'titheBarn', 'tollGate', 'watermill',
  'waystation', 'windmill', 'hutOnTheHill', 'oldBearsCave', 'reliquaryCairn',
]);
const WIDE_KINDS = new Set(['shipwreck', 'wagonCamp', 'mercenaryCamp', 'tradingCamp']);
const LANDMARK_SUBJECT: Record<string, string> = {
  coldCampfire: 'an extinguished cold campfire: a low ring of grey stones around black charred '
    + 'logs and a little pale ash, absolutely no flame, ember, smoke, light or glow',
  coldSpring: 'a low circular frost-rimmed stone spring basin holding still blue-grey water, '
    + 'ordinary outdoor wellspring with no building, roof, flowers, person, fountain jet or glow',
  idolOfSomebody: 'one squat weathered anthropomorphic roadside idol carved from old grey stone, '
    + 'a vague worn face and folded hands, unmistakably a freestanding statue; no building, roof, '
    + 'door, shrine house, grass, pedestal inscription or glow',
  listeningStones: 'a low open circle of three weathered grey standing stones leaning inward, '
    + 'broad high-oblique top planes and one clear gap; no building, roof, door, grass, runes or glow',
  longDraught: 'one old circular stone well with a broad visible rim, dark deep water and a simple '
    + 'wooden bucket arm; unmistakably a well, no house, roof, flowers, fountain jet or glow',
  oldBearsCave: 'a low natural grey-brown rock cave with one wide dark rounded mouth, a few old '
    + 'claw scratches and loose stones; unmistakably a cave, no building, roof, door, timber, grass '
    + 'patch, bear figure, bones or glow',
  patientStone: 'one squat weathered grey standing stone with a broad upper-left-lit face bearing '
    + 'a faint map-like scratch fragment; unmistakably a natural stone, no building, roof, door, '
    + 'house, writing, grass patch, rune glow or pedestal',
  shipwreck: 'the broken open ribs of one salt-dark timber boat hull lying diagonally, snapped mast '
    + 'and a little torn blue-grey sail cloth; unmistakably a wrecked boat, no intact house, roof, '
    + 'island, dock, grass, water tile, scenery or person',
  skeletonGrass: 'a few pale weathered human skeleton bones lying partly hidden among five sparse '
    + 'dull-green grass blades: skull, rib arc and one long bone clearly visible; no living person, '
    + 'dense plant clump, flowers, grave, building, square turf tile or gore',
  spoolHoard: 'a compact pickup hoard of four weathered wooden thread spools lying at varied angles '
    + 'with short loose red, cream and blue threads; no building, roof, chest, grass or ground patch',
  storyteller: 'one elderly travelling storyteller seated on a low stool beside an open blank book '
    + 'and small satchel, warm ordinary clothing; no building, stage, audience, text, grass or glow',
  tinkersCart: 'one small practical two-wheeled tinker handcart loaded with copper pots, folded cloth '
    + 'and tools; no building, horse, person, market stall, grass or ground patch',
  treeSecondThoughts: 'one crooked old broadleaf tree with a split two-crown silhouette, sparse '
    + 'ordinary leaves and a small hollow in the trunk; no building, face, sign, grass tile or glow',
  unquietYard: 'one low broken graveyard boundary with two leaning pale headstones and an open dark '
    + 'iron gate, restrained and ordinary; no church, house, large grass tile, skeleton, fog or glow',
  warmTable: 'one low old wooden outdoor table holding a covered warm loaf, kettle and two plain '
    + 'cups, a few restrained steam pixels only; no building, room, chairs, feast, grass or glow',
  wolfHollow: 'one low ash-grey natural den hollow under tangled roots and two pale stones, three '
    + 'dark openings; no wolf figure, building, roof, door, grass tile, bones or glow',
  watermill: 'one compact old timber-and-cream-plaster mill building with a large vertical wooden '
    + 'water wheel fixed to its visible right side and a short trough; no windmill sails, tower, '
    + 'river tile, landscape, grass patch, person or glow',
  whirlpool: 'one low circular spiral of dark slate-blue seawater curling into a small black centre, '
    + 'high-oblique foreshortened water surface with irregular transparent outer edge; no bottle, '
    + 'fountain, building, boat, square water tile, glow or scenery',
};
const ITEM_SUBJECT: Record<string, string> = {
  overseersCharter: 'a compact rolled cream parchment charter pickup tied with dull red cord and '
    + 'one small dark wax seal; no writing, building, roof, signboard, desk, grass or ground patch',
  spellScroll: 'a compact partly unrolled old parchment spell scroll pickup with two wooden rollers '
    + 'and one tiny blue ink mark; no writing, building, roof, signboard, desk, glow or ground patch',
  tradeGoods: 'a compact pickup bundle of one small timber crate, a tied cloth bale and a squat '
    + 'sealed jar; no building, market stall, cart, person, grass or ground patch',
  waybread: 'a compact pickup bundle of two dense rustic travel loaves wrapped together in cream '
    + 'cloth and cord; no building, bakery, table, basket, person, grass or ground patch',
};
const LOCK_SUBJECT: Record<string, string> = {
  'manywhere-lock-needle': 'a giant old sewing needle thrust diagonally through two crossed cream '
    + 'cloth scraps, an unmistakable sewing-tool barrier; no building, roof, door, sign or grass',
  'manywhere-lock-thread': 'a dense four-ended knot of giant golden thread stretched between two '
    + 'short black bobbins, an unmistakable sewing barrier; no building, roof, door, sign or grass',
  'manywhere-lock-thimble': 'one giant worn brass tailor thimble standing like a tiny cup, open top '
    + 'and dotted sides clearly visible; no building, roof, door, sign, hand or grass',
  'manywhere-lock-pattern': 'one folded blank cream tailor pattern page held by two dark pattern '
    + 'weights, dotted seam marks but no writing; no building, roof, door, sign or grass',
  'nw-kit-lock': 'a low old-stone corner marker pierced by one giant sewing needle; no building, roof, door or grass',
  'ne-kit-lock': 'a low old-stone corner marker tied shut with a knot of golden thread; no building, roof, door or grass',
  'sw-kit-lock': 'a low old-stone corner marker capped by one giant brass tailor thimble; no building, roof, door or grass',
  'se-kit-lock': 'a low old-stone corner marker holding one folded blank tailor pattern page; no building, roof, door or grass',
  'seam-echo-lock': 'two narrow pale standing stone chimes facing a thin violet seam crack, mundane '
    + 'stone barrier first; no building, roof, door, person, grass, aura or glow',
  'the-mirror-bound': 'one tall cracked old silver mirror bound crosswise in dark iron straps, '
    + 'freestanding impassable relic; no building, room, person, reflected face, grass or glow',
  'the-sleeper': 'one low rounded grey-brown hill-shaped stone with a subtle ribbed breathing '
    + 'silhouette, an impassable sleeping mass; no building, roof, door, face, grass or glow',
};
const b6Items = mapItems.filter((item) => !handled.has(item.id));
const b6Requests = b6Items.map((item) => {
  const [, kind, variant] = item.id.split(':');
  const size: [number, number] = TALL_KINDS.has(kind) ? [32, 64]
    : WIDE_KINDS.has(kind) ? [64, 48] : [item.w, Math.max(item.h, 32)];
  const subject = (kind === 'item' ? ITEM_SUBJECT[variant]
    : kind === 'lock' ? LOCK_SUBJECT[variant] : LANDMARK_SUBJECT[kind])
    ?? (variant === 'default' ? pretty(kind) : `${pretty(variant)} ${pretty(kind)}`);
  return mapObjectRequest('b6-landmarks', item, size,
    `${subject}, interpreted as one practical folkloric map landmark or pickup`,
    'Prefer one unmistakable ordinary silhouette; ration any anomalous cue to one small material '
      + 'contradiction. Pickups remain compact; buildings expose a foreground visit point. ');
});
balancedChunks(b6Requests, 10).forEach((requests, index) =>
  writeJob(`b6-landmarks-${index + 1}`, requests));

const HERO_DESCRIPTION: Record<string, string> = {
  hearthguard: 'Hearthguard Banneret on a sturdy ordinary horse carrying a small plain pennant',
  woundWrights: 'Wound-Wrights Guildmaster riding a lacquer-and-tin hobby-horse construct',
  unfinished: 'Unfinished Chandler drifting just above the ground with a hooded ordinary lantern',
  vespiary: 'Vespiary Broodspeaker riding a compact segmented chitin mount',
  hagwood: 'Hagwood Crone riding a crooked birch-and-wicker besom',
  wildergrass: 'Wildergrass Ashrider on a lean low steppe horse',
};
const heroFactions = [...new Set(WORKLIST.filter((item) => item.category === 'hero')
  .map((item) => item.id.split(':')[1]))];
writeJob('c-heroes', heroFactions.map((faction) => ({
  id: `hero:${faction}:8-directions`,
  assets: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
    .map((direction) => `hero:${faction}:${direction}`),
  output: output('c-heroes', faction),
  prompt: `Native 32x48 transparent eight-direction adventure hero: ${HERO_DESCRIPTION[faction]}. `
    + `Materials: ${FACTION_MATERIAL[faction]}. All rotations must preserve the same rider, mount, `
    + `equipment, palette, scale and baseline. ${COMMON} High-oblique adventure-map view around 65 `
    + 'degrees; full silhouette; no ground patch, scenery, spell effect, UI, text, logo, watermark '
    + 'or baked player-colour flag.',
  endpoint: 'create-character-with-8-directions' as const,
  size: [32, 48] as [number, number], candidates: 2 as const,
  generation_size: [21, 34] as [number, number],
  seed: seedFor(`c:${faction}`),
  parameters: {
    mode: 'standard', view: 'high top-down', isometric: false, outline: 'selective outline',
    shading: 'medium shading', detail: 'medium detail', text_guidance_scale: 9,
    template_id: ['hearthguard', 'vespiary', 'wildergrass'].includes(faction)
      ? 'horse' : 'mannequin',
  },
  references: [{ file: C_STYLE, parameter: 'color_image' }],
})));

function unitPrompt(unitId: keyof typeof UNITS): string {
  const unit = UNITS[unitId];
  const asset = WORKLIST.find((item) => item.id === `battle-unit:${unitId}`);
  if (!asset) throw new Error(`Missing battle-unit work item for ${unitId}`);
  return `Native ${asset.w}x${asset.h} transparent static battle sprite of ${unit.name}. `
    + `${unit.flavor} Materials: ${FACTION_MATERIAL[unit.faction]}. Strict side view facing right; `
    + 'feet or physical contact on a baseline eight pixels above the bottom; complete solid-black '
    + `silhouette distinguishable from every roster-mate. ${COMMON} No floor tile, cast shadow, `
    + 'environment, health bar, badge, number, circle token, UI, text, logo, watermark, animation '
    + 'frame, gore, glow or baked player colour.';
}

function unitRequest(
  batch: string, unitId: keyof typeof UNITS, reference?: Reference, idSuffix = '',
): JobRequest {
  const asset = WORKLIST.find((item) => item.id === `battle-unit:${unitId}`);
  if (!asset) throw new Error(`Missing battle-unit work item for ${unitId}`);
  return bitforge(batch, `battle-unit:${unitId}${idSuffix}`, unitPrompt(unitId),
    [asset.w, asset.h], reference, [`battle-unit:${unitId}`], 'side', 'east');
}

writeJob('d1-hearthguard-flagship', [unitRequest('d1-hearthguard-flagship', 'bannerman')]);
writeJob('d1-hearthguard-experiment-prompt', [
  unitRequest('d1-hearthguard-experiment-prompt', 'longbowman', undefined, ':prompt-only'),
]);
writeJob('d1-hearthguard-experiment-reference', [
  unitRequest('d1-hearthguard-experiment-reference', 'longbowman', {
    file: 'assets/references/d-hearthguard-flagship.png', parameter: 'style_image', deferred: true,
  }, ':flagship-reference'),
], { status: 'staged', blockedBy: 'Select and copy a fresh Bannerman winner to assets/references/d-hearthguard-flagship.png' });

writeJob('d2-wound-wrights-flagship', [unitRequest('d2-wound-wrights-flagship', 'marionette')]);
writeJob('d2-wound-wrights-experiment-prompt', [
  unitRequest('d2-wound-wrights-experiment-prompt', 'hobbyKnight', undefined, ':prompt-only'),
]);
writeJob('d2-wound-wrights-experiment-reference', [
  unitRequest('d2-wound-wrights-experiment-reference', 'hobbyKnight', {
    file: 'assets/references/d-wound-wrights-flagship.png', parameter: 'style_image', deferred: true,
  }, ':flagship-reference'),
], { status: 'staged', blockedBy: 'Select and copy a fresh Marionette winner to assets/references/d-wound-wrights-flagship.png' });

const experimental = new Set(['bannerman', 'longbowman', 'marionette', 'hobbyKnight']);
const unitGroups = Object.groupBy(
  Object.keys(UNITS).filter((id) => !experimental.has(id)) as (keyof typeof UNITS)[],
  (id) => UNITS[id].faction,
);
const unitOrder = [
  'hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass',
  'gloamingCourt', 'seamborn', 'driftfolk',
];
for (const [index, faction] of unitOrder.entries()) {
  const units = unitGroups[faction] ?? [];
  if (!units.length) continue;
  const name = `d${index + 1}-${safeId(faction).toLowerCase()}-roster`;
  writeJob(name, units.map((id) => unitRequest(name, id, {
    file: D_STYLE, parameter: 'style_image',
  })), {
    status: 'staged',
    blockedBy: 'Run and log the Hearthguard/Wound-Wrights flagship reference experiments; replace the broad phase reference with the winning protocol before production',
  });
}

const catalog = `# PixelLab production job catalog\n\nGenerated by \`scripts/buildPixelJobs.ts\` from the data-derived worklist. Do not hand-add rendered assets without adding or regenerating the corresponding job. A \`staged\` job is intentionally blocked by the Phase-D flagship protocol and \`pixelgen\` will refuse to submit it until its status and references are resolved.\n\n${JOBS.map((entry) => `- ${entry}`).join('\n')}\n`;
writeFileSync(resolve(ROOT, 'assets/jobs/CATALOG.md'), catalog);
