# Pixel Art Prompt Ledger

Every shipped bitmap records its exact prompt, PixelLab endpoint, parameters, seed, and references
here. Prompts are source code: update this file in the same change as the corresponding manifest
entry and PNG.

The dedicated adventure guardian roster prompt and all 18 per-creature subject clauses are recorded
in [`prompts/guardian-adventure-built-in.md`](prompts/guardian-adventure-built-in.md).

## Shared style law

- HoMM2/Warcraft I–II-era storybook pixel art: warm, painterly, crisp, readable at native resolution.
- Terrain and terrain-bound overlays use a low oblique/isometric adventure-map camera, never a
  straight overhead camera. They still fill native square cells edge-to-edge; this is a rendering
  perspective law, not diamond-grid geometry.
- Upper-left light direction; restrained selective outlines; no photorealism or grimdark treatment.
- Terrain tiles have uniform illumination across every edge and no per-tile gradient.
- Standalone objects use transparent backgrounds with no environmental context or cast scenery.
- Faction palette, material, silhouette, and mundane-first laws follow `docs/spec/S08_CANON.md` and
  `docs/spec/S01_RATIONALE.md`.
- No baked player ownership colors, text, logos, or watermark.

## Fresh A1 regeneration reference (not a shipped sprite)

`assets/references/a1-style-lock.png` was regenerated with the built-in image generator on
2026-08-01. It is a disposable style/reference input for the native PixelLab A1 rerun in
`assets/jobs/a1-regenerate.json`; it is not resized, sliced, manifested, or shipped as game art.

```text
Use case: stylized-concept
Asset type: style-lock reference sheet for a 1990s fantasy turn-based strategy game's native pixel-art terrain assets
Primary request: Create one cohesive pixel-art reference sheet showing four separate square terrain studies: quiet meadow, dense deepwood canopy, hard granite mountain, and calm blue-green water. This is a fresh art-direction reference, not a final tileset and not a UI mockup.
Scene/backdrop: four evenly spaced terrain studies on a plain warm neutral background, with clear separation and no overlap
Style/medium: authentic hand-placed 1990s storybook pixel art, Heroes-era warmth and readability, crisp selective outlines, restrained texture, emphatically not vector art and not modern smooth digital painting
Composition/framing: square sheet; four equal studies in a clean 2-by-2 arrangement; each study reads at thumbnail scale; high-oblique three-quarter strategy-map camera around 65 degrees while the ground cell itself has zero extrusion
Lighting/mood: consistent upper-left light in every study; warm, wondrous, wistful; never grimdark
Color palette: meadow warm greens and straw; deepwood dark leaf green and umber; mountain granite grey with muted warm highlights; water blue-green and slate; narrow value range within each terrain
Materials/textures: small quiet microtexture; forest crowns and crags may show height through upper-left tops and lower-right near faces
Constraints: mundane first read; uniform illumination within each study; no per-panel top-to-bottom gradient; no repeated rows, large tonal patches, checkerboard pattern, or visible tile seams; no terrain transitions; no characters, buildings, objects, roads, borders, labels, text, logos, or watermark
Avoid: isometric diamond tiles, side-on extruded slabs, photorealism, glossy 3D render, neon magic, grim palette, broccoli-like isolated tree blobs
```

The three fresh Wang probe requests preserve their literal endpoint parameters, seeds, reference,
and prompts in `assets/jobs/a1-regenerate.json`. Run them with `scripts/pixelgen`; do not promote any
candidate until the 3×3 self-tile and in-game reflection gates pass.

## Fresh phase references (not shipped sprites)

These three sheets were regenerated with the built-in image generator on 2026-08-02. They are
disposable style inputs for native PixelLab jobs, not sources to slice, resize, manifest, or ship.

### Phase B adventure objects and castles

Saved as `assets/references/b-adventure-objects-style-lock.png`.

```text
Use case: stylized-concept
Asset type: fresh art-direction reference sheet for native pixel-art adventure-map objects and castles in a 1990s fantasy turn-based strategy game
Primary request: Create one cohesive pixel-art reference sheet showing five separate high-oblique adventure-map studies: a gold mine with an open foreground-left mouth, a timber camp with an open foreground-left entrance, a pale stone Hearthguard castle with a centered foreground gate and tall towers, a crooked Hagwood dwelling, and a small ordinary roadside shrine. This is a fresh reference only, not final sprites or a UI mockup.
Scene/backdrop: five evenly spaced isolated studies on a plain warm neutral background, clear separation, no overlap, no terrain plinths
Style/medium: authentic hand-placed 1990s storybook strategy-game pixel art, warm HoMM2-era readability, crisp selective outlines, painterly clusters, not vector and not smooth modern painting
Composition/framing: square reference sheet; high-oblique three-quarter adventure-map camera around 65 degrees; roofs and upper surfaces visible; each subject readable at thumbnail scale; castle visibly taller than ordinary objects
Lighting/mood: identical upper-left light for every subject; wondrous, practical, gently weathered, never grimdark
Color palette: restrained medieval cream, umber, slate, muted red, moss green; faction materials remain distinct; no baked ownership colors
Materials/textures: readable stone blocks, timber braces, cloth, wicker, roof planes, compact pixel clusters
Constraints: mundane first read; entrances visibly aligned to the foreground ground-contact edge; transparent-sprite-friendly isolated silhouettes; no flags, characters, labels, text, logos, watermark, scenery, horizon, cast environment, grass square, pedestal, glow, neon magic, or baked ground patch
Avoid: straight-on facades, inventory icons, photorealism, glossy 3D rendering, isometric diamond tiles, miniature landscape dioramas, unreadable micro-detail
```

### Phase C heroes

Saved as `assets/references/c-heroes-style-lock.png`.

```text
Use case: stylized-concept
Asset type: fresh art-direction reference sheet for six 32x48 eight-direction adventure-map hero classes in a 1990s fantasy turn-based strategy game
Primary request: Create one cohesive pixel-art reference sheet showing six separate mounted or floating hero-class studies: a Hearthguard Banneret on a sturdy horse carrying a small plain pennant, a Wound-Wrights Guildmaster riding a lacquer-and-tin hobby-horse construct, an Unfinished Chandler drifting with a hooded ordinary lantern, a Vespiary Broodspeaker on a compact chitin mount, a Hagwood Crone riding a crooked besom, and a Wildergrass Ashrider on a lean steppe horse. This is a fresh direction reference, not final sprites, rotations, or UI.
Scene/backdrop: six evenly spaced isolated full-body studies on a plain warm neutral background, no overlap and no environmental scenery
Style/medium: authentic hand-placed 1990s storybook strategy-game pixel art, warm HoMM2-era readability, crisp selective outlines, compact clusters, not vector and not smooth modern illustration
Composition/framing: square sheet in a clean 3-by-2 arrangement; every figure shown in the same south-east three-quarter adventure-map camera; full silhouette visible; consistent apparent scale and baseline; readable at thumbnail size
Lighting/mood: consistent upper-left light; practical, eccentric, wistful, never grimdark
Color palette: faction-specific restrained materials—cream/red cloth and iron, oxblood lacquer/tin, pale wax/linen, paper amber/chitin, black wicker/birch, hide/ochre/ash—without neon magic
Materials/textures: simple cloth folds, readable mount silhouettes, small metal and wood highlights, limited pixel detail
Constraints: mundane first read; each locomotion concept unmistakable; generous separation; no names, labels, text, logos, watermark, UI, scenery, cast ground patches, giant weapons, baked player-color flags, halos, glows, or spell effects
Avoid: portrait busts, side-view battle poses, photorealism, glossy 3D rendering, anime proportions, excessive particles, smooth anti-aliased painting
```

### Phase D battle units

Saved as `assets/references/d-battle-units-style-lock.png`.

```text
Use case: stylized-concept
Asset type: fresh art-direction and silhouette reference sheet for static 64x64 side-view battle-unit sprites in a 1990s fantasy turn-based strategy game
Primary request: Create one cohesive pixel-art reference sheet showing six isolated faction flagship combatants, all facing right: Hearthguard Bannerman with upright shield and cloth banner; Wound-Wrights Marionette with lacquered jointed wooden limbs and visible strings; Unfinished Bone Choir as a gentle draped cluster carrying candles and grave goods; Vespiary Amber Carrier as a broad segmented insect bearing resin; Hagwood Leshy as a crooked birch-and-wicker woodland being; Wildergrass Aurochs Herd as a low horned plural silhouette. This is a fresh direction reference, not final sprites or a UI mockup.
Scene/backdrop: six evenly spaced isolated studies on a perfectly plain warm neutral background, no overlap or scenery
Style/medium: authentic hand-placed 1990s storybook strategy-game pixel art, warm HoMM2-era readability, crisp selective outlines, compact painterly clusters, not vector and not smooth modern illustration
Composition/framing: square sheet in a clean 3-by-2 arrangement; strict side-view battle stance facing right; feet or ground contact share a consistent baseline; complete silhouettes visible; mutually distinct black-silhouette profiles; larger creatures may occupy wider frames
Lighting/mood: consistent upper-left light; warm, wondrous, wistful, practical, never grimdark
Color palette: faction-bound restrained materials—warm red/cream/gold wool and iron; nursery-primary lacquer/tin/porcelain; ash-white linen/bone/candle-gold; amber/black/paper chitin; birch/wicker/crow black/berry red; ochre hide/horn/ash-grey
Materials/textures: readable cloth blocks, joints, wax, paper wing or chitin planes, bark and wicker, hide and horn; limited native-sprite-like detail
Constraints: mundane first read; all six attributable by material and silhouette; no environment, floor tile, cast shadow, labels, text, numbers, health bars, badges, circles, UI, logos, watermark, neon magic, gore, or baked player colors
Avoid: front-facing poses, adventure-map camera, photorealism, glossy 3D render, anime proportions, excessive particle effects, anti-aliased smooth painting
```

### Hearthguard battle roster — built-in source pass

Saved as six source PNGs under `assets/sources/hearthguard-roster/`; final native extraction is
reproducible with `scripts/buildHearthguardRoster.py`. Every request used this exact shared contract:

```text
Use case: stylized-concept
Asset type: source for one native static side-view battle-unit sprite in a 1990s fantasy strategy game
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, uniform edge to edge
Style/medium: authentic hand-placed HoMM2-era storybook pixel art, crisp square pixel clusters, selective dark outline, limited readable detail, never smooth illustration
Composition/framing: strict side view facing right; complete subject visible; physical contact on one horizontal baseline; generous padding; no cropping
Lighting/mood: consistent upper-left light; warm and practical, never grimdark
Constraints: one isolated subject only; no scenery, floor, cast shadow, terrain patch, text, UI, health bar, badge, logo, watermark, glow, spell effect, gore, or baked player-color flag; do not use #ff00ff in the subject
Avoid: front view, portrait framing, anime, glossy 3D, anti-aliased painting
```

The exact subject additions were:

- **Yeoman:** sturdy ordinary levy spearman, simple round shield, short spear, practical cap and
  boots; warm cream tunic, muted brick-red wool, dark iron, tiny gold accent; low compact silhouette.
- **Longbowman:** standing levy archer drawing a fully visible tall English longbow and arrow to his
  cheek, quiver on back; no shield, sword, crossbow, empty hands, or punching pose.
- **Bannerman:** marching armored foot soldier with one dominant upright red-and-cream swallowtail
  banner and modest round shield; entire pole and cloth visible; no horse or drawn giant sword.
- **Lance Knight:** armored rider on an ordinary sturdy horse charging right with a long level lance,
  cream caparison, muted red wool, iron and restrained gold; full horse, hooves, rider and lance.
- **Oriflamme Warden:** imposing veteran with heavy practical plate, broad shield, and an ancient
  upright flame-shaped cloth standard; tall blocky planted silhouette; no literal flame effect.
- **Oriflamme Wyvern:** long low heraldic wyvern with hooked snout, folded wings and curling tail;
  cream scales, red wing planes and old-gold accents; no rider, flight pose, fire, or scenery.

Combat-resolution correction: the Bannerman and Oriflamme Warden sources were edited in place as
new `*-combat-source.png` variants. Each retained its fighter, palette, side view, equipment, and
flat magenta isolation, while shortening and compacting the ceremonial standard so the fighter
occupies roughly seventy percent of the subject height and the complete finial and cloth remain
inside the frame. Production exports use these variants; the earlier sources remain as provenance.

## Batch A1 — Border Marches terrain style lock (superseded camera pass)

These jobs are retained as prompt provenance, but their straight-overhead camera was rejected after
the user clarified the required HoMM/Warcraft oblique-isometric view.

Endpoint: `create_tiles_pro`

Parameters shared by all candidate runs:

```text
tile_type: square_topdown
tile_size: 32
tile_view: top-down
outline_mode: segmentation
style_images: none
```

Exact prompt:

```text
Twelve independent seamless 32x32 square top-down terrain tiles for a turn-based fantasy strategy map, arranged as numbered outputs.
1). meadow variant A, healthy practical short grass, sparse cream clover
2). meadow variant B, healthy practical short grass, a few warm dry blades
3). meadow variant C, healthy practical short grass, subtle small leaf texture
4). deepwood variant A, dense old forest canopy read from high top-down, dark green rounded crowns
5). deepwood variant B, dense old forest canopy read from high top-down, mossy branches and deep shade
6). deepwood variant C, dense old forest canopy read from high top-down, clustered broadleaf crowns
7). granite mountain variant A, impassable steep grey crags read from high top-down
8). granite mountain variant B, impassable steep grey crags with pale fractured ridges
9). granite mountain variant C, impassable steep grey crags with restrained lichen
10). deep water variant A, calm blue-green open water with tiny uniform ripples
11). deep water variant B, calm blue-green open water with sparse dark wavelets
12). deep water variant C, calm blue-green open water with small crossed ripples
Shared style: warm HoMM2-era storybook pixel art, painterly but crisp, restrained texture, readable at native 32x32, no photorealism, never grimdark. Lighting impression from upper-left but illumination MUST remain uniform across every tile and every edge. Every tile must tile seamlessly with itself on all four edges: no per-tile gradient, no border, no vignette, no central spotlight, no obvious focal object, no text, no UI, no watermark. Keep each terrain palette internally consistent across its three variants.
```

Candidate runs:

| Seed | PixelLab job | Result |
|---:|---|---|
| 3101 | `be3e4bf5-8f56-432a-beb2-dcaa6deb96f7` | 16 candidates completed |
| 3102 | `75feff30-c6ad-4b8f-b7ec-a377d9198d89` | rejected by service policy; no output |
| 3103 | `03c11919-ae5b-4aef-acb8-7edfee9a622b` | 16 candidates completed |

Shipped selections (the endpoint returned four candidates for each terrain family):

| Manifest asset | Candidate |
|---|---|
| `terrain:meadow:default:0` | seed 3103, `tile_1` |
| `terrain:meadow:default:1` | seed 3103, `tile_2` |
| `terrain:meadow:default:2` | seed 3103, `tile_3` |
| `terrain:deepwood:default:0` | seed 3101, `tile_4` |
| `terrain:deepwood:default:1` | seed 3101, `tile_6` |
| `terrain:deepwood:default:2` | seed 3101, `tile_7` |
| `terrain:mountain:granite:0` | seed 3101, `tile_8` |
| `terrain:mountain:granite:1` | seed 3101, `tile_9` |
| `terrain:mountain:granite:2` | seed 3101, `tile_10` |
| `terrain:water:default:0` | seed 3103, `tile_12` |
| `terrain:water:default:1` | seed 3103, `tile_13` |
| `terrain:water:default:2` | seed 3103, `tile_14` |

## Batch A2 — Roads and Seam (superseded camera pass)

These jobs are retained as topology and failure provenance. The road art is superseded by the
camera-corrected pass below.

### Road discovery pass (rejected)

Endpoint: `create_image_pixen`

Shared parameters: `width: 32`, `height: 32`, `no_background: true`, `view: high
top-down`, `detail: medium detail`, `outline: selective outline`.

Exact prompt template (the bracketed shape was replaced verbatim for each call):

```text
Use case: stylized-concept. Asset type: native 32x32 transparent top-down road overlay for a fantasy strategy map. Draw ONLY [SHAPE]. Road width exactly 6 pixels where it meets every requested edge, aligned precisely to the middle 6 pixels of that edge so neighboring road tiles connect. Warm muted ochre-brown packed earth, restrained cream pebble highlights, crisp HoMM2-era storybook pixel art, subtle upper-left lighting but no cast shadow. Transparent everywhere outside the road. The road must be terrain-independent and readable over grass, forest, snow, rock, and water. No grass, surrounding ground, border, frame, scenery, sign, text, gradient, glow, UI, logo, or watermark. No road branch toward any edge not explicitly requested.
```

The first queue accepted three east-dead-end candidates (seeds 3200–3202, jobs
`0bc80489-d4cb-4c60-941b-9e5fd539f593`, `04b5e6d1-064d-4b05-b692-f4619ca526d3`,
and `495cc726-6c17-49b7-b462-84d1fe638156`) and one east-to-south corner (seed
3210, job `4a08ab50-c108-47c1-bb90-07caeda65ac5`). The remaining calls were rejected
by the service concurrency limit. All four completed images were rejected: they were decorative
medallions without reliable edge connections.

### Road topology candidates

Endpoint: `create_path_tiles`

Parameters shared by all candidate runs:

```text
tile_type: square_topdown
tile_size: 32
tile_view_angle: 90
tile_depth_ratio: 1
outline_mode: segmentation
```

Exact prompt:

```text
Warm muted ochre-brown packed-earth road over a perfectly flat, uniform chroma-key magenta ground (#ff00ff), restrained cream pebble highlights, crisp 1990s fantasy strategy storybook pixel art, subtle upper-left lighting, readable at 1x. Road width exactly 6 pixels at every connecting edge. Ground must be featureless solid magenta with no texture or shadow; road must contain no magenta.
```

| Seed | PixelLab job | Result |
|---:|---|---|
| 3250 | `069ce7ac-cf71-4c80-bb3f-99f5bd3cd193` | completed; all 16 edge masks valid; selected |
| 3251 | `59d1c2a6-d947-45ae-8103-c1de91e90444` | completed; valid masks but pale and visually flat; rejected |
| 3252 | `22b7b328-d25c-4d4a-9252-24e400bc2db3` | completed; placement metadata collapsed most masks; rejected |

Seed 3250 selections use the endpoint's bit order `N=1 E=2 S=4 W=8`:

| Manifest mask | Candidate |
|---|---|
| `e` | `tile_3` (mask 2) |
| `es` | `tile_8` (mask 6) |
| `esw` | `tile_12` (mask 14) |
| `ew` | `tile_6` (mask 10) |
| `n` | `tile_2` (mask 1) |
| `ne` | `tile_10` (mask 3) |
| `ns` | `tile_7` (mask 5) |
| `nw` | `tile_11` (mask 9) |
| `s` | `tile_4` (mask 4) |
| `sw` | `tile_9` (mask 12) |
| `w` | `tile_5` (mask 8) |

The eleven selected frames were sent together to `edit_image` as job
`5c94cdca-c8e3-4fd3-9974-3ce796c64aab`, seed 3330, native 32×32, with
`no_background: true` and this exact edit:

```text
Remove every magenta ground pixel and make it fully transparent. Preserve the packed-earth road pixel-for-pixel: exact canvas position, width, edge connection geometry, topology, color, pebble highlights, and closed rounded dead-end caps. Add nothing. No ground, scenery, shadow, glow, frame, text, UI, logo, or watermark.
```

The edit result was rejected because it rewrote the road frames. The shipped overlays are instead
reproducibly derived from the original seed-3250 PNGs by `src/tools/chromaKeyPng.ts`, which changes
only pixels in the magenta guide hue to transparent and leaves every generated road pixel intact.

### Seam candidates

Endpoint: `create_image_pixflux`

Parameters shared by the selected run: `width: 32`, `height: 32`, `no_background: true`,
`view: high top-down`, `detail: low detail`, `outline: lineless`, `shading: flat shading`,
`text_guidance_scale: 10`.

Exact prompt:

```text
Use case: stylized-concept. Asset type: native 32x32 transparent top-down map seam overlay for a fantasy strategy map. Draw only a subtle, irregular hairline fault made of a few muted dusty violet and oxidized teal pixels crossing the tile from northwest edge to southeast edge, with one tiny offset stitch near the center. It must first read as an ordinary hairline crack or surveying mark, not a spell effect. Crisp 1990s storybook strategy-game pixel art, sparse low-contrast pixels, no glow, no aura, no particles, no ground, no scenery, no frame, no text, no UI, no logo, no watermark. Transparent everywhere except the seam pixels.
```

| Seed | PixelLab job | Result |
|---:|---|---|
| 3310 | `16872ab1-ea95-4a05-b5c8-561e9a5111ca` | selected color/detail source; excess marks alpha-masked after composition |
| 3311 | `d9d99d41-b0c1-4562-96e3-07fbcae5882b` | rejected: magical bloom |
| 3312 | `3a75f696-d050-4a9d-b6d6-b7a50f76f790` | rejected: opaque ground context |

Two layout-guided retry trios (seeds 3320–3322 and 3331–3333) were also rejected because the
transparent sparse guide collapsed to blank output. The selected asset therefore remains the best
candidate from the original three. Full-map composition showed that its unmasked flecks repeated
as a loud effect, so `src/tools/chromaKeyPng.ts` removes generated marks outside a one-pixel
diagonal band; it does not add or recolor pixels.

## Camera correction — Batch A1R

The user clarified that terrain must use the oblique/isometric adventure-map camera of HoMM and
Warcraft I–II, not a straight overhead camera. Square 32×32 map geometry remains unchanged.

Endpoint: `create_tiles_pro`

The first correction used `tile_type: square_topdown`, `tile_size: 32`, `tile_view: low top-down`,
`tile_view_angle: 45`, and `outline_mode: segmentation`.

| Seed | PixelLab job | Result |
|---:|---|---|
| 3401 | `a6a80d93-db93-48e2-8a94-071cd11a8660` | rejected: side-on slab and bottom band |
| 3402 | `3bdfa02f-c26e-4adf-bcfc-6242e15e3d51` | rejected: side-on slab and bottom band |

Exact rejected prompt:

```text
Twelve independent seamless native 32x32 SQUARE terrain cells for an oblique/isometric fantasy strategy adventure map in the camera language of classic 1990s HoMM and Warcraft I-II. IMPORTANT CAMERA: NOT straight overhead. Paint every material from a low oblique three-quarter game camera, as if the viewer can perceive the near side and height of tree crowns, crags, grass tufts, and wavelets. Keep the square map-cell geometry and fill every pixel to every edge: no diamond tile, no rhombus, no raised slab, no transparent corner, no border.
1). meadow variant A, healthy practical short grass, sparse cream clover, tiny oblique tufts
2). meadow variant B, healthy practical short grass, a few warm dry blades, oblique tufts
3). meadow variant C, healthy practical short grass, subtle small leaf texture, oblique tufts
4). deepwood variant A, dense old forest canopy seen from the oblique game camera, dark green rounded crowns with visible near faces
5). deepwood variant B, dense old forest canopy, mossy branches, deep shade beneath raised crowns
6). deepwood variant C, clustered broadleaf crowns with visible height and near-side shade
7). granite mountain variant A, impassable steep grey crags with visible near faces
8). granite mountain variant B, impassable grey crags with pale fractured ridges and near-side shade
9). granite mountain variant C, impassable grey crags with restrained lichen and visible height
10). deep water variant A, calm blue-green open water with tiny oblique ripples
11). deep water variant B, calm blue-green open water with sparse angled wavelets
12). deep water variant C, calm blue-green open water with small foreshortened ripples
Shared style: warm HoMM2 / Warcraft II era storybook pixel art, painterly but crisp, restrained texture, readable at native 32x32, no photorealism, never grimdark. Consistent upper-left light and lower-right near-face shade, but whole-tile illumination MUST remain uniform across every edge. Every tile must tile seamlessly with itself on all four square edges: no per-tile gradient, border, vignette, central spotlight, rows, repeated clearing, large focal object, text, UI, logo, or watermark. Keep each terrain palette internally consistent across its three variants.
```

The accepted correction used `tile_type: square_topdown`, `tile_size: 32`, `tile_view: high
top-down`, `tile_view_angle: 65`, `tile_depth_ratio: 0`, and `outline_mode: segmentation`.

| Seed | PixelLab job | Result |
|---:|---|---|
| 3411 | `563288c4-d899-49ef-a545-25d521251ed7` | completed; selected family |
| 3412 | `8a552533-c2f9-4193-b3e5-627eafdb80b8` | completed; alternate candidates rejected for larger motifs/banding |

Exact accepted-run prompt:

```text
Twelve independent seamless native 32x32 SQUARE terrain cells for a classic 1990s HoMM / Warcraft I-II oblique-isometric strategy adventure map. CAMERA: high oblique three-quarter game camera around 65 degrees, NEVER straight overhead. Express perspective INSIDE the material: upper-left lit surfaces, lower-right near-facing shade on tree crowns, crags, grass tufts, and foreshortened ripples. The square cell itself is a continuous flat map surface and MUST fill every pixel edge-to-edge. CRITICAL: no horizon, no bottom strip, no side-view slab, no raised tile edge, no dark band at any edge, no diamond/rhombus, no transparent corner.
1). meadow A, healthy practical short grass, sparse cream clover, tiny raised oblique tufts
2). meadow B, healthy practical short grass, few warm dry blades with tiny lower-right shade
3). meadow C, healthy practical short grass, subtle leaves and oblique tufts
4). deepwood A, dense old forest canopy, dark green rounded crowns with upper-left tops and lower-right near faces
5). deepwood B, dense canopy, mossy branches and shade beneath raised crowns
6). deepwood C, clustered broadleaf crowns with visible internal height
7). granite mountain A, impassable steep grey crags with upper-left ridges and lower-right near faces
8). granite mountain B, pale fractured ridges and internal near-face shade
9). granite mountain C, grey crags, restrained lichen, visible internal height
10). deep water A, calm blue-green water with tiny foreshortened diagonal ripples
11). deep water B, calm blue-green water with sparse angled wavelets
12). deep water C, calm blue-green water with small oblique crossed ripples
Warm storybook pixel art, painterly but crisp, restrained low-contrast microtexture, readable at native 32x32, no photorealism, never grimdark. Uniform whole-tile illumination. Every tile self-tiles seamlessly on all four square edges: no gradient, border, vignette, spotlight, horizontal row, repeated clearing, large focal object, text, UI, logo, or watermark. Narrow consistent palette within each three-variant family.
```

Shipped selections from seed 3411: meadow `tile_0/1/2`; Deepwood `tile_4/6/7`;
granite mountain `tile_8/9/10`; water `tile_12/13/14`. PixelLab's square template left rows
0, 30, and 31 transparent despite the prompt. The reproducible `terrain-seamless` mode in
`src/tools/chromaKeyPng.ts` fills only those template rows from the generated edge pixels and their
50/50 edge blend; the 3×3 check confirms the technical repair removes the band.

## Camera correction — Batch A2R

Endpoint: `create_path_tiles`. Parameters: `tile_type: square_topdown`, `tile_size: 32`,
`tile_view_angle: 45`, `tile_depth_ratio: 1`, `outline_mode: segmentation`.

Exact prompt:

```text
Classic HoMM2 / Warcraft II oblique-isometric adventure-map terrain: warm muted ochre-brown packed-earth road painted as a surface marking over perfectly flat uniform chroma-key magenta guide ground (#ff00ff). IMPORTANT CAMERA: low oblique three-quarter game view, not straight overhead; pebbles and shallow ruts are foreshortened consistently with raised terrain forms, with subtle lower-right near-edge shade but no raised curb. Every output remains a full 32x32 square map cell, not a diamond or rhombus. Road connections meet the exact center of requested N/E/S/W square edges at one consistent width. Restrained cream pebble highlights, crisp 1990s storybook strategy pixel art, readable at 1x. Ground must be featureless solid magenta with no texture or shadow; road must contain no magenta. No scenery, sign, text, UI, logo, or watermark.
```

| Seed | PixelLab job | Result |
|---:|---|---|
| 3501 | `3056c624-0d5e-4ce2-a4bf-a95ca8cb7a22` | completed; valid full mask set; selected |
| 3502 | `dbd62782-904b-407e-a7be-4c0d3b0635ca` | completed; incomplete/collapsed masks; rejected |

Seed 3501 uses the same mask-to-tile table documented in the superseded A2 pass. The magenta guide
is removed reproducibly with `src/tools/chromaKeyPng.ts`; generated road pixels are unchanged.
The Grand Muster later required the missing NSW junction. `road-nsw.png` is the lossless 90°
clockwise rotation of the approved ESW junction, introducing no generated pixels or new art direction.

## Batch A3 — Remaining authored terrain families

Endpoint: `create_tiles_pro`. Every run used `tile_type: square_topdown`, `tile_size: 32`,
`tile_view: high top-down`, `tile_view_angle: 65`, `tile_depth_ratio: 0`, and
`outline_mode: segmentation`. The camera direction is expressed inside the material; square-grid
geometry and gameplay are unchanged.

### A3a — Barrowfield, Mosswold, and Ashsteppe

Exact prompt:

```text
Nine independent seamless native 32x32 SQUARE terrain cells for a classic 1990s HoMM / Warcraft I-II oblique-isometric strategy adventure map. CAMERA LAW: high oblique three-quarter game camera around 65 degrees, never straight overhead. Express perspective inside grass blades, moss pile, and ash texture using upper-left lit surfaces and restrained lower-right near-facing shade. The square cell is a continuous flat map surface and fills every pixel edge-to-edge. CRITICAL: no horizon, bottom strip, side-view slab, raised tile edge, dark band, diamond/rhombus, transparent corner, or transparent row.
1). Barrowfield default A: pale grey-green well-tended country grass, fine chalky blades, quiet and mundane
2). Barrowfield default B: pale desaturated grass, sparse cream seed heads, faint low ground haze implied only by a few pixels
3). Barrowfield default C: pale grass with tiny flattened tufts and restrained cool soil flecks
4). Mosswold mossy A: dense low moss carpet with subtly regular woven ridges, first read ordinary living moss
5). Mosswold mossy B: plush deep-green moss with tiny repeating stitch-like leaf clusters, suspicious regularity only on second look
6). Mosswold mossy C: carpet-forest moss, broad soft hummocks aligned like quiet cloth grain, no literal fabric or stitching
7). Ashsteppe south A: dry tawny grass over old charcoal-grey ash, sparse oblique brittle blades
8). Ashsteppe south B: muted ochre steppe with thin dark ash showing between grass clumps, warm southern dryness
9). Ashsteppe south C: faded straw grass and soft grey ash dust, a few wind-leaning tufts, not scorched earth
Shared style: stylized-concept tileable game texture; warm storybook pixel art, painterly but crisp, restrained low-contrast microtexture, readable at native 32x32, no photorealism, never grimdark. Mundane first read. Uniform whole-tile illumination. Every output must self-tile seamlessly on all four square edges with no gradient, border, vignette, spotlight, horizontal row, vertical column, large focal object, obvious checker motif, text, UI, logo, or watermark. Do not include standing stones, candles, bones, banners, flowers, props, roads, seams, or any decoration; those are separate transparent layers. Keep each three-variant family within one narrow palette and scale.
```

| Seed | PixelLab job | Result |
|---:|---|---|
| 3601 | `8edd8667-08be-425f-8b8c-b4f40c2339bd` | completed; selected Barrowfield/Mosswold and two Ashsteppe frames |
| 3602 | `cb112318-a936-4953-92d0-e86e7a20425c` | completed; selected one Ashsteppe frame; maze-like moss rejected |

Selections: Barrowfield seed 3601 `tile_0/1/3`; Mosswold seed 3601 `tile_5/6/7`;
Ashsteppe seed 3601 `tile_10/14` plus seed 3602 `tile_13`.

### A3b — Lacquer Flats, The Hush, and Mire

Exact prompt:

```text
Nine independent seamless native 32x32 SQUARE terrain cells for a classic 1990s HoMM / Warcraft I-II oblique-isometric strategy adventure map. CAMERA LAW: high oblique three-quarter game camera around 65 degrees, never straight overhead. Express perspective inside stone grain, snow texture, mud clods, and shallow water sheen with upper-left light and restrained lower-right near-facing shade. The square cell is a continuous flat map surface and fills every pixel edge-to-edge. CRITICAL: no horizon, bottom strip, side-view slab, raised tile edge, dark band, diamond/rhombus, transparent corner, or transparent row.
1). Lacquer Flats default A: vast smooth charcoal-brown stone with fine parallel grain and a restrained warm glossy sheen, first read polished natural stone
2). Lacquer Flats default B: muted umber-grey smooth stone, subtly regular long grain lines, tiny upper-left glints, not literal floorboards
3). Lacquer Flats default C: dark taupe polished flats with quiet flowing grain and a shine no rain explains, mundane first read
4). The Hush north A: cold blue-white wind-packed snow, tiny foreshortened ripples and soft upper-left facets
5). The Hush north B: pale quiet snow with sparse muted blue shadow pockets, no drifts or tracks
6). The Hush north C: slightly grey old snow, subtle oblique crust texture, unnaturally still but mundane first read
7). Mire coastal A: dark olive-brown saturated mud with shallow blue-green water sheen between soft clods
8). Mire coastal B: muted mossy marsh ground, slick mud islands and thin reflective wet channels, no reeds
9). Mire coastal C: grey-green negotiable ground, small waterlogged depressions and soft peat texture
Shared style: stylized-concept tileable game texture; warm storybook pixel art, painterly but crisp, restrained low-contrast microtexture, readable at native 32x32, no photorealism, never grimdark. Mundane first read. Uniform whole-tile illumination. Every output must self-tile seamlessly on all four square edges with no gradient, border, vignette, spotlight, horizontal row, vertical column, large focal object, obvious checker motif, text, UI, logo, or watermark. Do not include paint flecks, fox tracks, frozen ponds, reeds, fences, sinkholes, props, roads, seams, or any decoration; those are separate transparent layers. Keep each three-variant family within one narrow palette and scale.
```

| Seed | PixelLab job | Result |
|---:|---|---|
| 3611 | `8d5100f8-6161-4668-b922-6f28a8350c7b` | completed; selected two quieter Mire frames |
| 3612 | `811c456b-87d7-409e-b661-c10e7b3674c5` | completed; selected Lacquer, Hush, and one Mire frame |

Selections: Lacquer Flats seed 3612 `tile_0/1/3`; Hush seed 3612 `tile_4/5/7`; Mire
seed 3611 `tile_4/11` plus seed 3612 `tile_10`.

### A3c — Mossy Deepwood, coastal Meadow, and snowcap Mountain

Exact prompt:

```text
Nine independent seamless native 32x32 SQUARE terrain cells for a classic 1990s HoMM / Warcraft I-II oblique-isometric strategy adventure map. CAMERA LAW: high oblique three-quarter game camera around 65 degrees, never straight overhead. Express perspective inside tree crowns, salt-bent grass, and snow-capped crags with upper-left lit surfaces and lower-right near-facing shade. The square cell is a continuous flat map surface and fills every pixel edge-to-edge. CRITICAL: no horizon, bottom strip, side-view slab, raised tile edge, dark band, diamond/rhombus, transparent corner, or transparent row.
1). Deepwood mossy A: dense old forest canopy over moss country, rounded dark-green crowns with moss-bright upper-left surfaces and deep lower-right near faces
2). Deepwood mossy B: clustered broadleaf canopy, cool emerald moss on branches, visible crown height, no clearing
3). Deepwood mossy C: tangled ancient crowns in narrow dark-and-moss-green palette, soft raised canopy texture
4). Meadow coastal A: practical salt-tough coastal grass, muted sage green, tiny wind-leaning blades
5). Meadow coastal B: cool sea-green short grass with sparse pale dry tips, flattened by steady wind
6). Meadow coastal C: muted green coastal turf with tiny oblique tufts and restrained sandy-grey flecks
7). Mountain snowcap A: impassable steep blue-grey crags with snow on upper-left ridges and dark lower-right near faces
8). Mountain snowcap B: pale fractured alpine ridges, restrained wind-packed snow caps, visible internal height
9). Mountain snowcap C: cold grey crags with thin old snow in creases and strong oblique silhouette
Shared style: stylized-concept tileable game texture; warm storybook pixel art, painterly but crisp, restrained low-contrast microtexture, readable at native 32x32, no photorealism, never grimdark. Mundane first read. Uniform whole-tile illumination. Every output must self-tile seamlessly on all four square edges with no gradient, border, vignette, spotlight, horizontal row, vertical column, large focal object, obvious checker motif, text, UI, logo, or watermark. Do not include mushrooms, deadfall, flowers, shells, driftwood, tracks, props, roads, seams, or any decoration; those are separate transparent layers. Keep each three-variant family within one narrow palette and scale.
```

| Seed | PixelLab job | Result |
|---:|---|---|
| 3621 | `5fd1798f-d392-41a4-9420-4bafefa1eba7` | rejected: large pale diamond motifs and clearing bands in the 3×3 field |
| 3622 | `8804d556-afcc-4064-8260-223668680165` | completed; selected all three families |

Selections from seed 3622: mossy Deepwood `tile_1/2/3`; coastal Meadow `tile_0/4/6`;
snowcap Mountain `tile_8/11/13`.

### A3d — Coastal water

Exact prompt:

```text
Three independent seamless native 32x32 SQUARE coastal-water terrain cells for a classic 1990s HoMM / Warcraft I-II oblique-isometric strategy adventure map. CAMERA LAW: high oblique three-quarter game camera around 65 degrees, never straight overhead. Express perspective inside foreshortened diagonal wavelets and upper-left highlights with restrained lower-right trough shade. The square cell is a continuous flat map surface and fills every pixel edge-to-edge. CRITICAL: no horizon, shore, bottom strip, side-view slab, raised tile edge, dark band, diamond/rhombus, transparent corner, or transparent row.
1). Coastal water A: cool blue-green sea near land, small wind-driven oblique ripples, calmer than open ocean
2). Coastal water B: muted teal coastal water with sparse pale diagonal wavelets and soft darker troughs
3). Coastal water C: grey-blue-green nearshore sea with tiny crossed foreshortened ripples and restrained glints
Shared style: stylized-concept tileable game texture; warm storybook pixel art, painterly but crisp, restrained low-contrast microtexture, readable at native 32x32, no photorealism, never grimdark. Uniform whole-tile illumination. Every output must self-tile seamlessly on all four square edges with no gradient, border, vignette, spotlight, horizontal row, vertical column, large focal wave, obvious checker motif, text, UI, logo, or watermark. No shoreline, foam edge, sand, rocks, boats, flotsam, creatures, props, roads, seams, or decoration. Keep all candidates within one narrow coastal-water palette and scale.
```

| Seed | PixelLab job | Result |
|---:|---|---|
| 3631 | `6a1a554a-94c5-4289-8378-0dbc40a7b019` | completed; rejected for paler open-water read |
| 3632 | `05df632e-f135-4cbb-8dc5-719cde9efab9` | completed; selected coastal teal family |

Selections from seed 3632: `tile_0/4/7`. As in A1R, all selected A3 candidates had transparent
template rows 0, 30, and 31. `terrain-seamless` fills only those rows from generated edge pixels;
all interior PixelLab art is unchanged. The manifest validator independently requires every terrain
pixel to be opaque.

## Batch A4a — Meadow decorations and old-oak obstacle

Endpoint: `create_image_pixen` for the flower source, cart-rut source, and oak; final butterfly and
beehive use `create_image_pixflux` with native 32px layout guides after the first real-map
composition exposed their scale. Pixen parameters: `width: 32`, `height: 32`,
`no_background: true`, `outline: selective outline`; the oak uses `view: low top-down`, all other
shipped Pixen sources `high top-down`. Detail is `low detail` for flowers/cart-ruts and
`highly detailed` for the oak.

Every exact shipped Pixen source prompt is the following shared prefix followed verbatim by the
asset suffix in the table:

```text
Use case: stylized-concept. Asset type: native 32x32 transparent adventure-map sprite for a classic 1990s HoMM / Warcraft I-II high-oblique strategy map. CAMERA LAW: high oblique three-quarter game camera around 65 degrees, never straight overhead. Warm storybook pixel art, painterly but crisp, readable at 1x, upper-left light, restrained selective outline, mundane first read. Transparent everywhere outside the subject; no square ground tile, terrain patch, horizon, frame, text, UI, logo, watermark, glow, particles, or environmental backdrop.
```

| Asset/source seed | PixelLab job | Exact suffix / result |
|---|---|---|
| flowers-white 3723 | `83b5cc33-e0a5-40c6-914d-a80c38a714ec` | `Three separate 2-pixel white flower crosses with three single-pixel dark-green stems, loosely spaced near the center. Minimal 8-bit map decoration, total visible footprint under 10x8 pixels. No leaves, greenery clump, bouquet, border, diamond, planter, basket, mound, or base.` Selected. |
| cart-ruts 3721 | `d42f01f0-af78-41cd-9707-e4eff78c70c7` | `Two faint parallel old cart ruts crossing the cell from northwest edge to southeast edge, each groove only 1-2 pixels wide, broken muted-brown compressed-earth marks and a few tiny stones. Transparent terrain overlay; no cart, full road, grass, ground fill, curb, or shadow.` Selected generated color/detail source after mask described below. |
| old oak 3722 | `fb8ce802-04c3-430d-b32e-8a32ca06ad0d` | `A self-contained ancient old oak obstacle filling about 28x31 pixels: stout dark trunk rooted at bottom center and broad irregular green crown seen from high oblique camera, upper-left leaves lit and lower-right near face shaded, clearly solid and impassable. Only a tiny neutral contact shadow; no surrounding grass, forest, square ground, horizon, or backdrop.` Selected. |

Candidate provenance:

| Asset | Other jobs | Rejection |
|---|---|---|
| flowers-white | seed 3700 `93956841-93a2-4bf0-9b8e-fbf7995e1618`; seed 3710 `7c1e3ae4-7dca-4e25-839f-8b2824923704` | dense bouquet; bordered diamond |
| flowers-yellow | seed 3701 `f309a92f-14dd-4dab-a6ad-e0e5e6eba68e`; seed 3711 `c1fd3a9b-94b5-42b7-947c-064920cf7caf` | oversized clump; checkerboard baked into the image |
| flowers-blue | seed 3702 `449ae92e-897a-4926-b52e-70602e1f2982`; seed 3712 `34df34bc-e2b4-41ab-9c42-eeec9923b49c`; seed 3730 `72e5203b-9255-49e9-8b12-b1f69ad3179e` | all read as a bouquet or planter |
| butterfly | seed 3703 `3bc8ea02-62f6-40ee-a510-7a458bd745d7`; seed 3713 `b589e758-c24b-4954-b2b8-537bd09edea5` | both oversized in the real Crosstitch composition |
| beehive | seed 3720 `e877a3f5-6932-406d-95cc-835c0c4408b0`; seed 3733 `99d3e6da-c931-4572-bf98-21b25e959cd0` | both valid alone but too loud at map scale |
| cart-ruts | Pixflux seed 3731 `d21fbd27-8b27-466b-8bc9-c5407c4e2b33` | baked path, trees, and terrain context |
| old oak | seed 3732 `0a097c64-f162-4f53-be6d-f88a353448b5` | too small and windswept to block a cell |

The final white flower uses `flower-single` to retain the lower generated blossom/stem cluster from
seed 3723 after the first real-map composition showed that all three clusters together were too
loud. Yellow and blue use that retained geometry. Reproducible `flower-yellow` / `flower-blue`
modes in `src/tools/chromaKeyPng.ts` change only light neutral blossom pixels to the documented
yellow or blue palette; stems, outlines, alpha, canvas position, and resolution are unchanged.
This keeps the three authored color scatters at one scale after the independent candidates failed
in different ways.

The seed-3721 cart candidate baked a small grassy slab around useful generated rut pixels.
`cart-ruts` retains only generated earth-colored pixels inside two narrow parallel diagonal bands,
normalizes those retained pixels to the muted-brown terrain-overlay palette, and makes every other
pixel transparent. It neither invents geometry nor changes resolution. The derived overlay was
composed over all three Meadow variants before selection.

### A4a native layout-guide correction

The final butterfly and beehive are native 32×32 Pixflux img2img outputs. Their transparent layout
guides were rendered at 32×32 from these exact SVGs (the guide is a composition constraint, not a
shipped asset):

```svg
<!-- butterfly guide -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="#d8a63f" stroke="#513c24" stroke-width="1"><path d="M15 16l-5-3-2 1 1 4 5 1z"/><path d="M17 16l5-3 2 1-1 4-5 1z"/><path d="M15 17l-3 4 3-1z"/><path d="M17 17l3 4-3-1z"/></g><path d="M16 14v7" stroke="#33271c" stroke-width="2"/></svg>
<!-- beehive guide -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M12 26h9v-2h2v-7h-2v-3h-2v-2h-5v2h-2v3h-2v7h2z" fill="#ca8b36" stroke="#503419"/><path d="M14 22h5v3h-5z" fill="#3e2818"/></svg>
```

Shared Pixflux parameters: `width: 32`, `height: 32`, `no_background: true`, `isometric: true`,
`detail: low detail`, `outline: selective outline`, `shading: basic shading`,
`text_guidance_scale: 12`. The selected candidates use `init_image_strength: 300`.

| Asset | Seed / job | Exact prompt |
|---|---|---|
| butterfly | 3740 / `795840ed-aebf-4e7c-b14b-cbc2a3943a1d` | `One tiny cream-and-orange meadow butterfly, preserve the exact small centered silhouette and transparent canvas of the layout guide. Refine only inside that 8x8 guide shape with crisp 1990s storybook pixels, high-oblique view, upper-left light. No enlargement, flower, trail, shadow, base, ground, border, text, or backdrop.` |
| beehive | 3742 / `cbed65c6-beab-4cad-ae63-9bdd58be9e36` | `One tiny practical straw skep beehive, preserve the exact small bottom-centered silhouette and transparent canvas of the layout guide. Refine only inside the guide shape with honey-tan woven coils, dark entrance, high-oblique near face, upper-left light, crisp 1990s storybook pixels. No enlargement, bees, flowers, grass, mound, square base, border, text, or backdrop.` |

Strength-400 alternates were valid but flatter: butterfly seed 3741 job
`408f3938-b4d1-42b0-9790-347a9e22db6a`; beehive seed 3743 job
`a277bc29-c5b0-4189-8b34-0ebef754fa75`.

## Batch A4b — Deepwood/Mosswold decorations and the Spool

The direct Pixen runs use the A4a transparent high-oblique prefix, native dimensions,
`no_background: true`, and `outline: selective outline`. Shipped direct-source prompts:

| Asset | Seed / job | Exact suffix |
|---|---|---|
| Deepwood deadfall | 3811 / `1fc065d9-08b8-4aaa-b565-0d314ffa9693` | `Native 32x32. One low fallen branch and short broken log spanning about 20x7 pixels diagonally, dark weathered bark, small splintered end, two moss pixels. The rest transparent. Passable Deepwood decoration; no standing tree, stump, leaves, ground slab, or backdrop.` |
| patterned moss | 3812 / `465b1a47-68ec-40a8-9bd3-57e18ab3f850` | `Native 32x32. A small flat irregular patch of living green moss within a 14x8 pixel area, subtly repeating leaf stitches visible only on second look. The rest transparent. Passable Mosswold decoration; no raised bush, literal fabric, embroidery, square base, flowers, stone, or glow.` |

Text-only mushroom candidates (seed 3800 job `231aa2bf-c8ce-468c-bdfd-be2a59430ca3`;
seed 3810 job `20118f83-cd61-4433-b816-9a1d593856a9`) baked a green base or a checkerboard.
The first deadfall (seed 3801, `8eb307c3-9c52-4dd9-82f6-faef20fa3de7`) was valid but too
large for passable scatter. Text-only stitched ridges (seed 3803,
`a2ea0ff3-4b54-4522-a66f-29284a5fe29e`; seed 3813,
`da85d7db-a59a-4e45-8871-438ab2779f65`) became a bright zipper or an emblem. The first patterned
moss (seed 3802, `b5d97c0c-c78f-478c-b29a-d08fd54bf4bc`) was too luminous.

Final mushroom ring, stitched ridge, and Spool use native transparent Pixflux guides rendered from
these exact SVGs:

```svg
<!-- mushroom ring, 32x32 -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="#c5793b" stroke="#56331f"><path d="M9 16h4v3H9z"/><path d="M11 12h4v3h-4z"/><path d="M15 10h4v3h-4z"/><path d="M20 12h4v3h-4z"/><path d="M22 16h4v3h-4z"/><path d="M16 20h4v3h-4z"/></g><g stroke="#d5c394" stroke-width="1"><path d="M11 19v2M13 15v2M17 13v2M22 15v2M24 19v2M18 23v2"/></g></svg>
<!-- stitched ridge, 32x32 -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M6 21L25 12" stroke="#42602f" stroke-width="5"/><path d="M7 23L26 14" stroke="#263c24" stroke-width="2" stroke-dasharray="2 2"/></svg>
<!-- the Spool, 64x32 -->
<svg width="64" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M5 23Q8 8 23 7H51Q60 10 59 21Q56 27 47 28H17Q8 28 5 23Z" fill="#566b35" stroke="#29371f" stroke-width="2"/><path d="M16 8Q9 14 9 24M22 7Q15 14 15 27M29 7Q23 14 23 28M36 7Q31 14 31 28M43 7Q39 14 39 28" stroke="#73884a" stroke-width="2"/><ellipse cx="50" cy="18" rx="8" ry="9" fill="#45552e" stroke="#26341e" stroke-width="2"/></svg>
```

Shared selected Pixflux parameters: `no_background: true`, `isometric: true`,
`init_image_strength: 400`, `view: low top-down`, `detail: medium detail`,
`outline: selective outline`, `shading: medium shading`, `text_guidance_scale: 12`.

| Asset | Seed / job | Exact prompt |
|---|---|---|
| mushroom ring | 3821 / `15b35c05-9bb0-4345-926a-f7e07777dfb9` | `A small low broken ring of six ordinary woodland mushrooms. Preserve the exact native 32x32 transparent layout-guide footprint and six-part ring. Refine only within those tiny shapes: muted russet caps, cream stems, high-oblique upper-left light, crisp storybook pixels. No enlargement, connected base, grass mound, checkerboard, glow, magic, basket, border, ground, text, or backdrop.` |
| stitched ridge | 3823 / `a1a02dec-943f-46a1-bfac-0fa3d2b7067e` | `A thin low moss-covered earth ridge. Preserve the exact native 32x32 transparent diagonal layout-guide footprint. Refine only inside the guide: ordinary green-brown raised ground first, with a quiet regular dotted lower-right shadow suggesting stitches only on second look. No bright studs, literal thread, zipper, needle, glow, square base, text, or backdrop.` |
| the Spool | 3825 / `b5a2c492-b01f-4dd7-be96-e7a512f2f117` | `A huge horizontal mossy terraced earthen knoll, strange wound cylinder only on second look. Preserve the native 64x32 transparent layout-guide silhouette: low rounded hill spanning two cells, subtle parallel sediment-like contour ridges, shadowed round near end. High-oblique upper-left light, solid impassable mass. No literal sewing spool, flanges, hole, loose thread, needle, grass rectangle, landscape, horizon, text, or backdrop.` |

Strength-300 mushroom and ridge alternates were valid but less legible: jobs
`b4f20a7e-fc18-4b09-99d0-00857aa17010` and `d19eef8f-7b72-4a96-9fa1-9de8128b8a0d`.
Direct Spool candidates (seed 3804 `f2b85ab5-e013-4378-bb9b-7db3bb88d685`; seed 3814
`1569c23d-46db-4f8f-a7aa-ef53fe6a405b`) were literal manufactured spools. The strength-300
layout candidate `58228a23-12cb-4ea3-946e-6119e7aa6846` lost too much solid mass.

## Batch A4c — Ashsteppe/Barrowfield/Lacquer decorations and the Block

The selected lone banner and letter-stone are native transparent Pixen candidates using the A4a
high-oblique prefix, `width: 32`, `height: 32`, `no_background: true`, `view: high top-down`,
`outline: selective outline`, and `detail: low detail`.

| Asset | Seed / job | Exact suffix |
|---|---|---|
| lone banner | 3911 / `c49aa734-43e1-49c8-80e4-875f7ad73fe3` | `Native 32x32. One small weather-faded red lone banner on a short dark pole, occupying about 13x22 pixels near bottom center. High-oblique view with a tiny neutral contact shadow and visible lower-right pole/base planes. The rest transparent. No person, scarecrow, army, hill, square ground, frame, text, or backdrop.` |
| letter-stone | 3913 / `0f3d841c-6b0f-4534-a2c9-e46ca8f77569` | `Native 32x32. One small pale angular letter-shaped stone occupying about 15x11 pixels near the center, broad upper-left surface and restrained lower-right near face in high-oblique view. The rest transparent. No mail pile, envelope stack, pedestal, grass patch, border, text, or backdrop.` |

Text-only candidates repeatedly invented object bases or full tiles. Skulls seed 3900 job
`68a33857-2527-4bcd-930b-e33378e63567` became an oversized mask-like emblem; seed 3910 job
`3bdca557-70ae-4ad9-833c-cc9a35712fa0` added a pedestal. Lone-banner seed 3901 job
`422199c7-06cb-426c-a808-3eaccb5426dd` read as a humanoid. Candle jobs seed 3902
`f8f3bfdd-d92d-4c6a-aa3c-af23ad22405c`, seed 3912
`23c975a7-09cf-4b4a-b96f-1900867b92cf`, and seed 3920
`7893e1b2-0ff4-4ddd-8490-126acf3b613e` all added flames or environmental context. Letter-stone
seed 3903 job `0811984c-109e-4f2d-9fdb-ac44fe4fca0a` became a mail/stone pile. Grain seed 3904
job `881aa52c-7ac2-4f87-bcf8-15fae9c696e8` and seed 3914 job
`97ff33cf-1f63-44b4-b97b-78af2cf02ae3` became floor or board tiles. Paint jobs seed 3905
`0eb8e81c-c8f0-4829-9272-0a89234f1363` and seed 3915
`660909df-a51a-461a-9310-8c11e9cdd2ed` became bordered emblems. Block seed 3906 job
`98a58b69-36ed-47ae-ad8a-3452c18a3849` was a thin painted board; seed 3916 job
`c03876f9-7512-496d-a4c4-964fe76d3ef8` was a good small stone but did not occupy its 2x1 footprint.

The final skulls, candles, grain-lines, paint-flecks, and Block use native transparent Pixflux
layout guides rendered from these exact SVGs:

```svg
<!-- skulls, 32x32 -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g stroke="#514735" stroke-width="1"><path d="M8 19l2-3h5l2 3-1 4-2 1h-4l-2-2z" fill="#d5c79c"/><path d="M17 17l2-3h5l2 3-1 4-2 1h-4l-2-2z" fill="#bcae87"/></g><g fill="#514735"><path d="M10 19h2v2h-2zM14 19h2v2h-2zM12 22h2v2h-2zM19 17h2v2h-2zM23 17h2v2h-2zM21 20h2v2h-2z"/></g></svg>
<!-- candles, 32x32 -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g stroke="#594c3a"><path d="M11 18h4v7h-4z" fill="#d8c59b"/><path d="M17 16h4v9h-4z" fill="#cbb78b"/><path d="M22 20h3v5h-3z" fill="#e1cfa4"/></g><g stroke="#3b342a"><path d="M13 16v2M19 14v2M23 18v2"/></g><path d="M9 26h17" stroke="#665a45" stroke-width="1"/></svg>
<!-- grain-lines, 32x32 -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="none" stroke="#6d5238" stroke-width="1"><path d="M7 20l7-4m2-1l7-4"/><path d="M8 22l5-3m2-1l9-5"/><path d="M10 23l7-4m2-1l6-3"/><path d="M13 24l5-3m2-1l6-3"/></g></svg>
<!-- paint-flecks, 32x32 -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M11 19h2v1h-2z" fill="#a84b37"/><path d="M15 16h2v1h-2z" fill="#d49b42"/><path d="M19 19h1v1h-1z" fill="#d8c7a0"/><path d="M22 15h2v1h-2z" fill="#55758b"/><path d="M17 22h2v1h-2z" fill="#9e4939"/><path d="M24 20h1v1h-1z" fill="#c58c3b"/></svg>
<!-- the Block, 64x32 -->
<svg width="64" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M5 11L23 3H59L43 13H5Z" fill="#a88764" stroke="#40362d" stroke-width="2"/><path d="M5 11L43 13V29L5 25Z" fill="#735b48" stroke="#40362d" stroke-width="2"/><path d="M43 13L59 5V21L43 29Z" fill="#54483d" stroke="#40362d" stroke-width="2"/><path d="M12 12l9-5m8 3l10-6m-25 16l9 1m6 1l10 1m9-8l8-4M13 24l8-3m7 6l8-4" stroke="#c19755" stroke-width="2"/></svg>
```

Shared selected Pixflux parameters: native guide dimensions, `no_background: true`,
`isometric: true`, `view: high top-down`, `detail: low detail`, `outline: selective outline`,
`shading: basic shading`, and `text_guidance_scale: 12`.

| Asset | Seed / job / guide strength | Exact prompt |
|---|---|---|
| skulls | 3930 / `de82078d-2c9a-4363-a95c-332ec6d652ae` / 400 | `Two tiny old animal skull fragments resting directly on dry steppe, preserve the exact small paired silhouettes and transparent canvas of the layout guide. Refine only inside the guide shapes with crisp 1990s storybook pixels. High-oblique three-quarter strategy-map camera around 65 degrees, visible brow tops and lower-right face planes, upper-left light. Sun-bleached muted bone, mundane remains. No pedestal, plaque, grass patch, border, glow, full skeleton, text, UI, logo, watermark, or background.` |
| candles | 3931 / `d31748dd-4dc7-46bb-b525-239a69821a51` / 430 | `Exactly three tiny extinguished wax candle stubs resting directly on quiet country ground, preserve the exact small clustered silhouettes and transparent canvas of the layout guide. Refine only inside the guide shapes with crisp 1990s storybook pixels. High-oblique three-quarter strategy-map camera around 65 degrees, tiny visible candle tops and restrained lower-right near faces, upper-left light. Cream wax with three short black wicks. Absolutely no flames, orange fire, glow, flowers, leaves, altar, plaque, terrain patch, border, text, UI, logo, watermark, or background.` |
| grain-lines | 3932 / `f20e581e-828c-4d36-bfc5-81013ec70133` / 450 | `Four faint broken parallel grain scratches in polished dark stone, preserve the exact sparse diagonal line placement and transparent canvas of the layout guide. Refine only the guide pixels with crisp restrained 1990s storybook pixels. The marks lie on a surface seen from a high-oblique three-quarter strategy-map camera around 65 degrees, foreshortened northwest-to-southeast. Muted brown, low contrast, mundane natural grain. No boards, floor tile, diamond, border, stone slab, emblem, terrain fill, text, UI, logo, watermark, or background.` |
| paint-flecks | 3933 / `e4806b58-bd44-4372-8279-b21f30819e38` / 480 | `Exactly six tiny separate weathered paint flecks on polished stone, preserve the exact isolated pixel positions and transparent canvas of the layout guide. Refine only the guide pixels with crisp restrained 1990s storybook pixels. Surface marks seen in a high-oblique three-quarter strategy-map camera around 65 degrees. Muted red, ochre, cream, and blue; low contrast and worn. No medallion, object, pile, plaque, border, ground tile, terrain fill, glow, text, UI, logo, watermark, or background.` |
| the Block | 3934 / `3dba3d5a-1379-42b7-a33f-37c559fa1aea` / 400 | `One massive weathered masonry block occupying a full two-cell-wide by one-cell-tall adventure-map footprint, preserve the exact broad rectangular-prism silhouette and transparent canvas of the layout guide. Refine inside that silhouette with crisp 1990s storybook pixels. High-oblique three-quarter strategy-map camera around 65 degrees: broad upper surface, substantial lower-right and near faces, upper-left light. Muted umber-grey stone with a few faded painted geometric strokes, mundane ruined architecture first. No thin board, chest, sarcophagus, platform, terrain patch, grass, border, text, UI, logo, watermark, or background.` |

## Batch A4d — Hush and Mire decorations

All three selections are native 32×32 transparent Pixflux img2img outputs. Their exact layout
guides are:

```svg
<!-- fox tracks -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="#657582"><path d="M8 23h2v2H8zM7 21h1v1H7zM10 21h1v1h-1z"/><path d="M13 19h2v2h-2zM12 17h1v1h-1zM15 17h1v1h-1z"/><path d="M18 15h2v2h-2zM17 13h1v1h-1zM20 13h1v1h-1z"/><path d="M23 11h2v2h-2zM22 9h1v1h-1zM25 9h1v1h-1z"/></g></svg>
<!-- frozen pond -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M4 18l7-6 13-1 5 4-5 7-14 1z" fill="#668b9a" stroke="#354f5d" stroke-width="2"/><path d="M9 17l7-2 7 1m-10 4l5-2 5 1" fill="none" stroke="#a7c4ca"/><path d="M8 22l16-1" stroke="#263d49"/></svg>
<!-- reeds -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g stroke="#435136" stroke-width="2"><path d="M11 26l-2-14M15 26l1-18M19 26l3-15M23 26l1-11"/></g><g fill="#806947"><path d="M7 10h4v5H8zM14 6h4v5h-4zM20 9h4v5h-4zM22 13h4v5h-4z"/></g><path d="M8 27h18" stroke="#34412f" stroke-width="2"/></svg>
```

Shared parameters: `width: 32`, `height: 32`, `no_background: true`, `isometric: true`,
`view: high top-down`, `detail: low detail`, `outline: selective outline`,
`shading: basic shading`, and `text_guidance_scale: 12`.

| Asset | Seed / job / guide strength | Exact prompt |
|---|---|---|
| fox-tracks | 4000 / `f30c1c06-eef0-408c-bfb1-43db8e9de345` / 450 | `A short trail of four tiny fox paw prints crossing quiet snow, preserve the exact sparse diagonal placement and transparent canvas of the layout guide. Refine only inside the guide marks with crisp restrained 1990s storybook pixels. The prints lie on snow seen from a high-oblique three-quarter strategy-map camera around 65 degrees, foreshortened from lower-left to upper-right. Muted blue-grey indentations, mundane and low contrast. No fox, feet, glow, path, snow tile, terrain patch, border, text, UI, logo, watermark, or background.` |
| frozen-pond | 4001 / `80aa4b0b-8344-4317-ad90-12420409516b` / 380 | `One small dark frozen pond embedded flush with snow, preserve the exact low foreshortened irregular silhouette and transparent canvas of the layout guide. Refine only inside the guide shape with crisp restrained 1990s storybook pixels. High-oblique three-quarter strategy-map camera around 65 degrees, thin pale ice upper surface with a restrained darker lower-right lip, upper-left light. Muted blue-grey, mundane first read, no magical glow. No square ground tile, snow bank scene, hole, cliff, raised platform, frame, text, UI, logo, watermark, or background.` |
| reeds | 4002 / `f4675883-fbae-4160-880f-07e7e6512667` / 380 | `A small clump of five marsh reeds leaning away from solid ground, preserve the exact narrow upright footprint and transparent canvas of the layout guide. Refine only inside the guide silhouette with crisp 1990s storybook pixels. High-oblique three-quarter strategy-map camera around 65 degrees, visible lower-right sides on brown seed heads, upper-left light. Muted olive stems and dry brown heads, mundane vegetation. No pond, mud tile, grass patch, basket, fence, square base, border, text, UI, logo, watermark, or background.` |

## Batch B1 — Resource piles and treasure chest

Endpoint: `create_image_pixen`. Shared parameters: `width: 32`, `height: 32`,
`no_background: true`, `view: high top-down`, `detail: medium detail`, and
`outline: selective outline`.

Every prompt begins with this exact shared prefix:

```text
Use case: stylized-concept. Native 32x32 transparent adventure-map pickup sprite for a classic 1990s HoMM / Warcraft I-II strategy map. CAMERA LAW: high-oblique three-quarter game camera around 65 degrees, never straight overhead. Upper-left light, visible lower-right near faces, warm storybook pixel art, painterly but crisp, readable at 1x, restrained selective outline. Self-contained and valid on any terrain. Transparent everywhere outside the subject; at most a tiny neutral contact shadow. No square ground tile, grass, snow, stone floor, horizon, environment, frame, text, UI, logo, watermark, glow, or particles.
```

| Asset | Seed / job | Exact suffix |
|---|---|---|
| pile:gold | 4100 / `59c760db-59b4-4aba-b03a-536696632a27` | `A small practical pile of about twelve dull gold coins with three coins leaning against the front, occupying roughly 18x11 pixels near bottom center. Visible oval coin tops and shaded near edges; wealth pickup, not a treasure mountain. No sack, chest, crown, pedestal, medallion, or bright aura.` |
| pile:timber | 4101 / `38c9e49b-4432-4a8f-aaf9-c2ca43d1d7e6` | `A compact stack of four short cut timber logs, two over two, occupying roughly 22x13 pixels near bottom center. Warm muted wood, visible circular cut ends on the lower-right side and long upper-left log surfaces. No tree, stump, leaves, lumberyard, cart, pallet, firewood scene, or saw.` |
| pile:iron | 4102 / `ad5a70da-14c2-4b93-89ab-a9d0f6dfa382` | `A compact pile of four rough dark iron ingots, two crossed over two, occupying roughly 19x12 pixels near bottom center. Cool charcoal metal with restrained pale edge glints, broad upper surfaces and shaded lower-right sides. No ore boulder, anvil, weapon, crate, forge, sparks, or pedestal.` |
| pile:essence | 4103 / `0e8784fa-c2a9-4b02-8878-3cc51f50d129` | `A small cluster of three ordinary-looking translucent blue-violet essence shards rising from one tiny dark knot, occupying roughly 17x16 pixels near bottom center. Facets use upper-left highlights and lower-right shade; strange resource second read but no magical effect. No bottle, altar, crystal cave, ring, glow, aura, sparks, or ground patch.` |
| chest | 4104 / `0683b0a5-76c1-4d7f-8052-ec152f487035` | `One small closed weathered wooden treasure chest occupying roughly 24x18 pixels near bottom center. Broad lid top, dark lower-right front and side faces, dull iron straps and tiny brass latch. Practical old coffer, no open lid or visible treasure. No coins outside, pedestal, room, dungeon floor, halo, glow, or scenery.` |

All five first candidates were selected after composition over Meadow, dense Deepwood, and pale
Hush terrain. Their silhouettes remain self-contained and readable at native scale without a
terrain-colored base.

## Batch B2 — Mines and Rich Vein

The selected Rich Vein is Pixen seed 4204, job
`11902d40-4d51-4231-a701-69995a51d99f`, with `width: 32`, `height: 32`,
`no_background: true`, `view: high top-down`, `detail: medium detail`, and
`outline: selective outline`. Exact prompt:

```text
Use case: stylized-concept. Native 32x32 transparent adventure-map site sprite for a classic 1990s HoMM / Warcraft I-II strategy map. CAMERA LAW: high-oblique three-quarter game camera around 65 degrees, never straight overhead. Upper-left light and restrained lower-right near-edge shade, warm storybook pixels, readable at 1x. A narrow jagged crack in one low self-contained charcoal stone outcrop, occupying about 26x15 pixels near bottom center, with three restrained blue-violet Essence mineral seams visible inside. Mundane rock first, wrong vein second. Transparent everywhere outside; valid on any terrain; tiny neutral contact shadow only. No square ground tile, landscape, mountain, mine building, crystal cluster, glow, aura, particles, frame, text, UI, logo, or watermark.
```

The first Pixen mine candidates—gold seed 4200 job
`56358ca2-5f63-48b6-9bb4-ce115b9e5e85`, timber seed 4201 job
`024353a4-14e4-4837-950c-c6a8eee422bc`, iron seed 4202 job
`276b5d21-25db-4111-a3d0-65f61518753e`, and Essence seed 4203 job
`ce949deb-29f0-4ffe-bff1-33696c9b128c`—were rejected because all baked a square terrain plinth
into otherwise detailed architecture. Dedicated `create_map_object` retries also failed footprint
or context law: gold `d3fef9ca-a7ef-4ac5-aa24-c738d464daad`, timber
`e0f45e27-511d-42fc-8ac7-a8e185e5cf4d`, iron
`a5f52702-7e4e-4d7b-86ba-43fdbc7a319e`, and Essence
`f0d815a4-b8bb-46f6-b56d-69868f88301c`.

Final mines use these exact native transparent guides:

```svg
<!-- gold mine, 64x64 -->
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="#8a8172" stroke="#403a33" stroke-width="2"><path d="M7 31l8-14 12 3 7-12 13 7 10 15-5 27H8z"/><path d="M35 17l8-9 9 8-4 12z" fill="#aaa08c"/></g><path d="M7 35l10-8 20 7v25H7z" fill="#795032" stroke="#392b22" stroke-width="2"/><path d="M17 27l20 7 10-6-20-7z" fill="#a16839" stroke="#392b22" stroke-width="2"/><path d="M10 40h14v19H10z" fill="#252322" stroke="#c28a43" stroke-width="3"/><path d="M39 34l13-5v28H37V35z" fill="#68472f" stroke="#392b22" stroke-width="2"/><path d="M9 59h17" stroke="#55504a" stroke-width="3"/></svg>
<!-- timber camp, 64x64 -->
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M19 25L34 10l25 12-15 14z" fill="#7d5b35" stroke="#35291f" stroke-width="2"/><path d="M23 28l21 8v22H24z" fill="#654329" stroke="#35291f" stroke-width="2"/><path d="M44 36l15-14v27L44 58z" fill="#4f3928" stroke="#35291f" stroke-width="2"/><path d="M8 46l13-6v18H8z" fill="#493a28" stroke="#2f271d" stroke-width="2"/><path d="M10 45l7-4 1 16h-8z" fill="#28271f"/><g fill="#a36b35" stroke="#422a19"><path d="M38 48h20v5H38z"/><path d="M35 53h22v5H35z"/></g><g fill="#c58a48"><circle cx="54" cy="50" r="2"/><circle cx="53" cy="55" r="2"/></g><path d="M8 59h18" stroke="#4d493b" stroke-width="2"/></svg>
<!-- iron mine, 64x64 -->
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="#596068" stroke="#292d31" stroke-width="2"><path d="M5 37l11-16 12 5 8-15 12 9 11 18-6 20H7z"/><path d="M37 20l9-11 10 12-5 12z" fill="#747b7e"/></g><path d="M8 39h19v20H8z" fill="#25282a" stroke="#935b32" stroke-width="3"/><path d="M10 39l8-9 12 8" fill="none" stroke="#573a2a" stroke-width="4"/><path d="M34 17v41M50 25v33M34 17l16 8M34 31l16-6" stroke="#493329" stroke-width="4"/><path d="M35 18h16" stroke="#8a5a37" stroke-width="2"/><path d="M8 59h21" stroke="#4c5054" stroke-width="3"/></svg>
<!-- Essence spring, 64x64 -->
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M20 22l12-9 20 6 8 18-10 19-25 3-13-13z" fill="#77766c" stroke="#393b38" stroke-width="3"/><path d="M25 31l9-7 15 3 6 11-7 12-17 2-10-10z" fill="#435f70" stroke="#283a44" stroke-width="2"/><path d="M29 33l8-4 11 3 3 7-5 7-12 1-7-7z" fill="#557f96"/><path d="M42 28l3-13 6 11-4 7zM29 30l-4-12 9 9z" fill="#7969a0" stroke="#3c3858"/><path d="M8 53l12-7 10 6-10 8H8z" fill="#918878" stroke="#3f3b36" stroke-width="2"/><path d="M9 60h13" stroke="#53514b" stroke-width="2"/></svg>
```

Selected Pixflux parameters: `width: 64`, `height: 64`, `init_image_strength: 220`, the rejected
Pixen candidate passed as `color_image_base64` (palette only), `no_background: true`,
`isometric: true`, `view: high top-down`, `detail: highly detailed`,
`outline: selective outline`, `shading: medium shading`, and `text_guidance_scale: 12`.

| Asset | Seed / job | Exact prompt |
|---|---|---|
| mine:gold | 4230 / `6b0c9839-7520-4685-a21e-65784ad6e27c` | `A compact practical gold mine built around a timber-framed dark adit in quarried grey-brown rock. Keep the native 64x64 transparent guide composition: bottom-left open adit/entrance, machinery and rock blocking lower-right, irregular silhouette with no rectangular base. Add believable timber braces, winch detail, and quarried rock only within that footprint. Match the supplied candidate palette and crisp 1990s storybook detail. 65-degree high-oblique strategy-map camera, upper-left-lit tops and shaded lower-right faces. No square soil plinth, grass, mountainside, landscape, giant coins, glow, road, text, or backdrop.` |
| mine:timber | 4231 / `59a69d7c-0be9-4030-add9-ee66a309c1dd` | `A compact practical timber camp. Keep the native 64x64 transparent guide composition: bottom-left open entrance yard, saw shelter above/right, log stacks blocking lower-right, irregular silhouette with no rectangular base. Add open posts, shingles, sawbench, and clearly round cut log ends only within that footprint. Match the supplied candidate palette and crisp 1990s storybook detail. 65-degree high-oblique strategy-map camera, upper-left-lit roof/log tops and shaded lower-right faces. No square soil plinth, grass, forest, standing trees, landscape, road, text, or backdrop.` |
| mine:iron | 4232 / `e3b9b1c8-0be4-4ffa-880a-405bf689a72e` | `A compact practical iron mine. Keep the native 64x64 transparent guide composition: bottom-left open adit/entrance, dark timber headframe and hoist above/right, charcoal rock blocking lower-right, irregular silhouette with no rectangular base. Add braces, pulley, rails, and rough iron-bearing stone only within that footprint. Match the supplied candidate palette and crisp 1990s storybook detail. 65-degree high-oblique strategy-map camera, upper-left-lit tops and shaded lower-right faces. No square soil plinth, grass, mountain, landscape, forge, sparks, road, text, or backdrop.` |
| mine:essence | 4233 / `80eba33c-f787-4afc-8f98-42e0e1c9fd9b` | `A quiet rural Essence spring. Keep the native 64x64 transparent guide composition: bottom-left oblique flagstone entrance step, irregular low old-stone basin blocking lower-right, crooked pump-frame and restrained wrong water, no rectangular base. Add weathered stones, wood, and subtle blue-violet mineral facets only within that footprint. Match the supplied candidate palette and crisp 1990s storybook detail. 65-degree high-oblique strategy-map camera, upper-left-lit rim tops and shaded lower-right faces. Mundane spring first. No square soil plinth, grass, landscape, temple, fountain jet, glow, aura, particles, road, text, or backdrop.` |

Strength-330 alternates were rejected as too diagrammatic: gold
`8e7e25aa-0911-479d-b3f8-71e872619886`, timber
`20be5fc3-daf6-4a3d-9cf5-3ad2ee493e06`, iron
`89945ba5-251a-407e-b0f6-b3dc4b8664b4`, and Essence
`f23de730-3bbe-4057-b449-92ea524a5f27`.

## Batch B3 — Castles and neutral town variants

All source sets use `create_image_pro` at native `96x96`, `no_background: true`, and return
four candidates. After Hearthguard established the quality bar, its selected candidate
(`d334230b-228d-4af3-ae8b-9f8cb5fb5fee?index=2`) was supplied as
`style_image_url` with `style_copy: [outline, detail, shading]`; palette was deliberately not
copied so the S08 faction laws remain visible.

The canonical-faction prompts use this exact shared prefix:

```text
Native 96x96 pixel-art adventure-map castle sprite on transparent background. High-oblique isometric-like view from the south-east, in the camera language of Heroes of Might and Magic and Warcraft II: clearly visible roofs, courtyard, and two receding wall directions; never a straight-on facade and never a straight top-down plan. Substantial architecture fills most of a 3x3 square-grid footprint. One clearly open arched entrance is centered along the foreground bottom edge for hero entry. Upper-left light, lower-right shaded faces, crisp selective outlines, readable at native size. Isolated structure only: no grass, soil, snow, water, terrain tile, square plinth, road, path, landscape, horizon, characters, UI frame, text, emblem panel, or backdrop.
```

| Asset | Seed / source job / selected index | Exact faction suffix |
|---|---|---|
| hearthguard:castle | 4302 / `d334230b-228d-4af3-ae8b-9f8cb5fb5fee` / 2 | `Hearthguard faction stronghold built from warm cream plaster, wool banners, wrought iron and gold fittings. Upright red-roofed towers and pennants around a visible defended courtyard; warm red, cream and restrained gold. Sturdy heraldic silhouette. No gothic black stone, crooked ruin, green-black necromancer palette, giant cathedral, terrain, or scenery.` |
| hagwood:castle | 4310 / `78e3e4b8-bd9a-4863-8cb2-362b0e640de6` / 2 | `Hagwood faction stronghold grown and bargained from pale crooked birch trunks, woven wicker walls, bone fencing, and crow-feather roof accents. White birch, charcoal black, and tiny berry-red cloth accents. Asymmetric, leaning, gnarled silhouette with a visible inner yard; organic and unsettling but still a functional fortress. No ordinary stone castle, red tile roofs, green-black necromancer palette, giant tree canopy, forest scenery, or ground roots.` |
| unfinished:castle | 4311 / `8f017254-d8c9-4191-9907-6445856133a6` / 2 | `Unfinished faction stronghold: a pale hollow mausoleum-city built of ivory bone ribs, ash-white stone, draped funeral linen, candle-gold metal, and grave goods. A large dark central void framed by hanging white cloth, with visible roof ledges and a quiet open court. White, ash, cream, and restrained candle-gold only. Asymmetric draped hollow silhouette. No green, black-green, purple necromancer palette, skull pile, ordinary gothic castle, red roofs, cemetery ground, fog, or glowing magic.` |
| vespiary:castle | 4312 / `60187242-8b72-4a15-ba5e-6d5ea163f534` / 2 | `Vespiary faction stronghold assembled from segmented black chitin buttresses, honey-gold amber chambers, resin seams, and pale layered paper nest walls. Strong asymmetric clustered silhouette with hexagonal openings, visible papery roof layers and interior court. Honey gold, amber, warm paper cream, and charcoal black. Built insect architecture, not a literal giant bug. No medieval stone castle, red roofs, beehive icon, giant wasp, honeycomb ground tile, flowers, vegetation, or glowing magic.` |
| wildergrass:castle | 4313 / `75cb1348-4dc4-47d3-ab1b-905e68a558b0` / 1 | `Wildergrass faction stronghold: a low fast-looking herd fortress of ash-grey timber palisades, stretched hide roofs, enormous horn arches, ochre leather, and small blood-red war-cloth accents. Broad horizontal silhouette with open inner stockyard, outward-leaning stakes, and a massive horned foreground gate. Ochre, ash-grey, bone horn, dark brown, restrained blood red. No tall European stone castle, red tile roofs, tipi camp, grass base, mountain scenery, animals, or bonfire.` |
| woundWrights:castle | 4314 / `fa910259-9434-462f-aa54-449ee2c759d2` / 0 | `Wound-Wrights faction stronghold built from lacquered red and blue wood, pale porcelain panels, tin edges, brass fasteners, and stitched cloth canopies. Jointed round towers with visible circular seams and articulated toy-like hinges; nursery-primary accents but weathered and architectural, not cute. Asymmetric mechanical courtyard silhouette. No ordinary stone castle, European red roofs, giant doll, face, toy box, ground platform, glowing magic, or checkerboard.` |

Hearthguard also rejected two strength-guided layout candidates (seed 4300 job
`cbac0c27-df3c-4960-bc9a-18ad40b429ea`, strength 180; seed 4301 job
`f4b733e3-ad5b-477b-9aff-ffc3878b4853`, strength 260) as too diagrammatic, dedicated map-object
`d8f6d322-7b5d-4b48-9766-59cacac1ba69` as straight-on, and free Pixflux seed 4303 job
`0222d9b8-5638-4cf0-8364-1aaa6a3fe383` for its baked grass plinth.

Neutral-town Pro prompts use this exact shared prefix:

```text
Native 96x96 pixel-art adventure-map town sprite on transparent background. High-oblique isometric-like view from the south-east, in the camera language of Heroes of Might and Magic and Warcraft II: clearly visible roofs, inner yard, and two receding wall directions; never a straight-on facade and never a straight top-down plan. Substantial architecture fills most of a 3x3 square-grid footprint. One clearly open entrance is centered along the foreground bottom edge for hero entry. Upper-left light, lower-right shaded faces, crisp selective outlines, readable at native size. Neutral settlement with no ownership color or player banner. Isolated structure only: no grass, soil, snow, water, terrain tile, square plinth, road, path, landscape, horizon, characters, UI frame, text, emblem panel, or backdrop.
```

| Asset | Seed / source job / selected index | Exact variant suffix |
|---|---|---|
| hearthguard:freeTown | 4320 / `60a00463-1533-4c87-876e-c046664a4488` / 2 | `Hearthguard Free Town: a modest mixed civilian market-town enclosed by cream plaster and wrought-iron walls, with wool awnings, small red-brown roofs, a visible market court and sturdy upright gate. Warm cream, muted brick red, faded gold and dark iron. Less military and less heraldic than the flagship castle; varied roof heights and a broader market silhouette. No bright faction pennants, clock tower, cathedral, royal keep, grass base, or road.` |
| woundWrights:oldSeat | 4321 / `c6ec106d-0c3f-465c-8ef3-2d8d156e1b35` / 0 | `Wound-Wrights Old Seat: a weathered original seat of lacquered red and blue wood, cracked pale porcelain panels, dull tin edges, brass fasteners and faded stitched canopies. Jointed round towers with visible circular seams and old articulated hinges, nursery-primary traces worn by age. Asymmetric, sagging mechanical courtyard silhouette. No ordinary stone castle, European red tile roofs, giant doll, face, toy box, ground platform, glowing magic, or checkerboard.` |
| unfinished:hollowTown | 4322 / `323f27e3-3e3b-4887-9634-47cd36d52f4b` / 0 | `Unfinished Hollow Town: a quiet larger settlement of low ash-white mausoleum houses, ivory bone ribs, draped funeral linen, candle-gold fittings and several deep dark doorways around a visible hollow court. White, ash, cream and restrained candle-gold only; tiered and draped rather than spired. No green, black-green, purple necromancer palette, ordinary gothic castle, red roofs, cemetery ground, fog, flames, or glowing magic.` |
| vespiary:coastal | 4323 / `2d111eb0-4e2a-43f7-ad31-7ac65791be14` / 3 | `Vespiary Coastal Town: a salt-weathered cluster of black chitin ribs, honey-amber resin chambers and pale layered paper-nest walls, with bleached edges and a low asymmetric harbor-like inner court but no actual water or dock. Hexagonal openings, segmented buttresses, folded papery roofs. Honey gold, warm paper cream, charcoal and tiny salt-white highlights. No medieval stone castle, red roofs, literal beehive, giant insect, honeycomb ground tile, flowers, vegetation, waves, boats, or glowing magic.` |

The source sets favored side-wall gates even when prompted otherwise. The final ten sprites therefore
use `edit_image` with the following exact correction, `96x96`, transparent output:

```text
Preserve every sprite's existing native pixel-art style, high-oblique isometric-like camera, silhouette, courtyard, faction materials, palette, transparent background, and upper-left lighting. Make only this architectural correction: add one clearly open dark arched gate at the exact horizontal center of the lowest foreground wall, aligned with the bottom-middle square-grid entrance cell. Close any old off-center doorway on the lower-left or lower-right wall using that sprite's matching wall material. The centered gate must be visually unmistakable but integrated into the perspective. Do not add terrain, plinth, road, path, characters, text, flags, or backdrop.
```

Final edit batches are seed 4340 job `74fc4082-c18c-443f-be66-356ce591c936`
(Hearthguard, Hagwood, Unfinished, Vespiary in frame order), seed 4341 job
`7beef0d9-e51b-4c77-b53a-fe8df202c414` (Wildergrass, Wound-Wrights, Free Town,
Hollow Town), and seed 4342 job `56494db3-826d-4406-9644-71c66884f7ff`
(Coastal, Old Seat). The final frames were composed over Meadow, Deepwood, and Hush before promotion.

## Batch B4 — Shrines, Barrow Field, Waystation, and Mana Spring

Craft and Rite use `create_image_pixen` with `width: 32`, `height: 32`,
`no_background: true`, `view: high top-down`, `direction: south-east`,
`detail: medium detail`, and `outline: selective outline`. Their exact shared prefix is:

```text
Use case: stylized-concept. Native 32x32 transparent adventure-map visitable-site sprite for a classic 1990s HoMM / Warcraft I-II strategy map. CAMERA LAW: high-oblique three-quarter game camera around 65 degrees, never straight overhead and never a straight-on icon. Upper-left light, visible top planes and lower-right near faces, warm storybook pixel art, painterly but crisp, readable at 1x, restrained selective outline. Self-contained and valid on any terrain, occupying roughly 24x24 pixels near bottom center. Transparent everywhere outside the subject; at most a tiny neutral contact shadow. No square ground tile, grass, snow, floor, landscape, horizon, environment, frame, text, UI, logo, watermark, glow, aura, or particles.
```

| Asset | Seed / job | Exact suffix |
|---|---|---|
| shrine:craft | 4400 / `eac0a73c-474d-4fea-9955-f81c34fd024e` | `Craft shrine: one compact cold wrought-iron anvil on a squat lacquered-wood work altar, with a small brass gear and folded tool-cloth. Broad visible anvil top and shaded right side. Matter-of-fact workshop relic, no fire, sparks, forge building, weapon pile, giant gear, magic effect, or pedestal scene.` |
| shrine:rite | 4401 / `704e8602-bf34-4ec3-94f6-e7705afc1566` | `Rite shrine: one compact pale stone wayside altar with two upright posts, a tiny cream-and-muted-red oath cloth hanging between them, and a shallow gold offering bowl. Upright, orderly, ceremonial silhouette with visible slab top and shaded right face. No church, statue, giant banner, throne, fire, magic circle, halo, or scenery.` |

The other five sites use these exact native transparent guides:

```svg
<!-- Grave shrine -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M8 17l7-6 11 4-7 6z" fill="#e1d7bd" stroke="#514c43" stroke-width="2"/><path d="M8 17l11 4v7H8z" fill="#b9ae98" stroke="#514c43" stroke-width="2"/><path d="M19 21l7-6v7l-7 6z" fill="#8f887a" stroke="#514c43" stroke-width="2"/><path d="M12 13v-5h3v4m4 2V8h3v5" fill="#d8c8a2" stroke="#514c43"/><path d="M13 24h5v4h-5z" fill="#2d2c2a"/></svg>
<!-- Wild shrine -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M8 27c1-11 2-17 8-20M25 27c-2-11-3-17-9-20M10 17l12-5M9 21l15-5" fill="none" stroke="#65513a" stroke-width="3"/><path d="M12 25l5-4 7 3-5 5z" fill="#6c7650" stroke="#39412e" stroke-width="2"/><path d="M9 10l-4-3 5-1zM21 8l5-3-1 5zM23 15l5 1-4 3z" fill="#768953"/></svg>
<!-- Barrow Field -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M3 20l8-9 12 1 7 8-5 8H7z" fill="#aaa188" stroke="#49453c" stroke-width="2"/><path d="M5 20l20 1v7H7z" fill="#777264" stroke="#49453c" stroke-width="2"/><path d="M12 27v-6q4-7 8 0v6z" fill="#292827" stroke="#c3b99c" stroke-width="2"/><path d="M11 12l1-7h3l1 7m6 1l1-6h3l1 9" fill="#948c77" stroke="#49453c" stroke-width="2"/></svg>
<!-- Waystation -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M6 15l10-9 12 6-10 9z" fill="#98483c" stroke="#49372e" stroke-width="2"/><path d="M7 15l11 6v8H7z" fill="#c6b184" stroke="#49372e" stroke-width="2"/><path d="M18 21l10-9v9l-10 8z" fill="#8e7c62" stroke="#49372e" stroke-width="2"/><path d="M11 21h5v8h-5z" fill="#2b2925"/><path d="M22 21v7m4-10v10m-6-2h8" stroke="#3d3830" stroke-width="2"/></svg>
<!-- Mana Spring -->
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M4 20l9-7 12 2 4 7-8 7H9z" fill="#898477" stroke="#3e403c" stroke-width="2"/><path d="M9 20l7-4 8 2 1 4-6 4h-8z" fill="#557a8d" stroke="#344d59" stroke-width="2"/><path d="M20 17V7h4v9m-4-9l5 3" fill="none" stroke="#695b47" stroke-width="3"/><path d="M12 22l6-3 5 2-5 3z" fill="#718fa0"/></svg>
```

Shared guided Pixflux parameters are `width: 32`, `height: 32`,
`init_image_strength: 300`, `no_background: true`, `isometric: true`,
`view: high top-down`, `direction: south-east`, `detail: medium detail`,
`outline: selective outline`, `shading: medium shading`, and
`text_guidance_scale: 12`.

| Asset | Seed / job | Exact prompt |
|---|---|---|
| shrine:grave | 4412 / `4dd88943-3381-4576-a0a3-dba1bbcb1399` | `A compact quiet Grave shrine. Preserve the exact native 32x32 transparent guide silhouette: ash-white high-oblique letter-stone altar, broad visible upper slab, shaded lower-right face, central low arched hollow, two unlit candle stubs, and one funeral-linen strip. Refine only within that footprint in crisp restrained 1990s storybook pixels. White, ash, cream, muted candle-wax only. No flame, purple, green, glow, aura, particles, skulls, bones, cemetery, square base, grass, terrain, frame, text, or backdrop.` |
| shrine:wild | 4413 / `c8368c15-b506-4050-b402-0fedac45d81e` | `A compact listening Wild shrine. Preserve the exact native 32x32 transparent guide silhouette: two crooked pale branches forming an open arch above one small moss-dark offering stone, three restrained leaves and one berry-red thread tie. High-oblique visible branch tops and lower-right sides, mundane woodland shrine first. Refine only within the footprint. No full tree, forest, flower bed, vine circle, green ground base, glowing runes, fairy ring, crystals, aura, square tile, text, or backdrop.` |
| barrowField | 4414 / `8456482b-bcdb-49bb-8ffb-2cc9234ce7c5` | `A low ancient Barrow Field entrance. Preserve the exact native 32x32 transparent guide silhouette: grassless pale weathered sod-stone mound, broad foreshortened upper surface, shaded lower-right lip, two small standing stones, and one open dark arch centered on the foreground lower edge. Refine only within the irregular mound footprint. No grass patch, green pixels, terrain rectangle, cemetery, skulls, bones, tree, fog, glow, runes, square base, text, or backdrop.` |
| waystation | 4415 / `9f088d01-5091-4935-be4d-cca3a01d5e5b` | `A compact neutral Waystation. Preserve the exact native 32x32 transparent guide silhouette: high-oblique warm cream plaster shelter, broad visible muted red-brown roof top, shaded right wall, open foreground doorway, dark wrought-iron posts, tiny tea kettle and short hitching rail. Refine only within the footprint. No person, horse, cart, inn sign, writing, tavern scene, road, grass base, ground tile, smoke, landscape, text, or backdrop.` |
| manaSpring | 4416 / `ec5ba565-993f-46d0-abf7-f5731effe3a2` | `A quiet rural Mana Spring. Preserve the exact native 32x32 transparent guide silhouette: low irregular old-stone basin in high-oblique view, broad visible rim, shaded lower-right face, restrained blue-grey water, and a crooked wooden pump frame. Refine only within the footprint; ordinary spring first, water remembers sky only on second look. No fountain jet, temple, grass, terrain plinth, square base, landscape, crystal, purple glow, aura, particles, road, text, or backdrop.` |

Rejected text-only candidates were Grave seed 4402 job
`e72840e0-fb09-4de2-b553-69590c479290` (purple magical framing), Wild seed 4403 job
`ed819aa8-0f2d-4616-9b75-a156acdc6ef3` (green circular base), Barrow seed 4404 job
`74517106-5014-4097-8a57-26e3a08e162b` (green plinth), and Waystation seed 4405 job
`99a937cd-f5b4-44a6-9d8b-4582bd4ecb7b` (grass base). Final sprites were composed over
Meadow, Deepwood, and Hush.

## Batch B5 — Authored dwellings

Endpoint: `create_image_pixen`. Shared parameters: `width: 32`, `height: 32`,
`no_background: true`, `view: high top-down`, `direction: south-east`,
`detail: medium detail`, and `outline: selective outline`. Every selected prompt begins with:

```text
Use case: stylized-concept. Native 32x32 transparent adventure-map dwelling sprite for a classic 1990s HoMM / Warcraft I-II strategy map. CAMERA LAW: high-oblique three-quarter game camera around 65 degrees, never straight overhead and never a straight-on facade. Upper-left light, broad visible roof or upper planes, shaded lower-right wall faces, crisp warm storybook pixels, selective outline, readable at 1x. One compact self-contained recruitment building occupying roughly 25x25 pixels near bottom center, valid on any terrain. Transparent everywhere outside the architecture; tiny neutral contact shadow only. No square ground tile, grass, snow, road, path, landscape, horizon, environment, characters, creature portrait, UI, frame, text, logo, watermark, glow, aura, or particles.
```

| Asset | Seed / job | Exact suffix |
|---|---|---|
| dwelling:yeoman | 4500 / `762101d5-9d99-40c5-b2ad-8385ba31e23e` | `Hearthguard Yeoman dwelling: a sturdy cream-plaster village muster hall with a low red wool roof, dark wrought-iron braces, open foreground door, and two upright practice shields leaning against the side. Warm red, cream and dull gold; practical and upright. No castle, farmhouse scene, crops, fence line, soldier, weapon pile, or banner emblem.` |
| dwelling:longbowman | 4501 / `3fd700e8-a192-4ce0-8bc9-3c20cb1d2b95` | `Hearthguard Longbowman dwelling: a compact cream-and-wrought-iron fletcher's lodge with a long narrow red roof, open foreground doorway, bundled unstrung bows beneath one eave and a small straw target mounted on the wall. Warm red, cream and dark iron. No archer, shooting range ground, forest, giant bow, arrows flying, castle, or banner.` |
| dwelling:bannerman | 4502 / `27bcf7d8-8fa3-470c-bc34-d5806b5eedbf` | `Hearthguard Bannerman dwelling: a compact upright heralds' hall with cream plaster, wrought-iron frame, steep red wool canopy, open foreground door, and three rolled pennants in a side rack. Warm red, cream and restrained gold; disciplined silhouette. No person, giant flag, ownership banner, castle tower, parade ground, throne, or emblem panel.` |
| dwelling:tinSoldier | 4503 / `18a327dd-a549-4c73-a326-5d6f6ea12023` | `Wound-Wrights Tin Soldier dwelling: a compact lacquered-wood and pale porcelain assembly shop with a blue-grey tin roof, round brass joints at the corners, open foreground hatch, and a tiny rack of identical tin helmets. Weathered nursery-red, blue, cream and brass; architectural, not cute. No person, giant toy soldier, toy box, factory scene, smoke, checkerboard, or stone castle.` |
| dwelling:hobbyKnight | 4504 / `6647d809-4faa-4321-b134-3e545228e1a8` | `Wound-Wrights Hobby Knight dwelling: a compact articulated stable-workshop made from lacquered red-and-blue wood, porcelain panels, tin edges and brass round hinges, with an open foreground door and one small carved hobby-horse head mounted under the visible roof. Architectural and weathered, not cute. No rider, full horse, carousel, toy box, grass yard, checkerboard, or stone castle.` |
| dwelling:marionette | 4505 / `a106345d-4707-4533-893d-27d474da7755` | `Wound-Wrights Marionette dwelling: a compact crooked puppet theatre-workshop built from lacquered red and blue wood, stitched cloth awning, porcelain side panels, tin roof edges and visible brass pulley joints. Open dark foreground doorway with two slack strings under the eave. No puppet figure, face, stage performance, audience, circus tent, checkerboard, glow, or stone castle.` |
| dwelling:candleWisps | 4510 / `14c64ce1-42a5-407b-9508-c3da5c8eac3e` | `Unfinished Candle-Wisp dwelling: a tiny ash-white open lantern-house with ivory bone-rib posts, a draped funeral-linen roof, candle-gold fittings, three empty wick cups and an open foreground arch. Pale white, ash and muted gold only; quiet and architectural. No flames, floating spirits, purple, green-black, cemetery, skulls, fog, or magic effect.` |
| dwelling:couriers | 4511 / `a5c5f741-b49a-4f54-b1a2-2bee531d22a4` | `Unfinished Couriers dwelling: a compact pale letter-house with ash-white stone walls, ivory bone-rib awning, layered funeral-linen roof, open foreground door, and several sealed cream envelopes resting in wall slots. White, ash and candle-gold only; quiet and practical. No person, postal sign, giant letter, graveyard, purple, green-black, fog, or magic effect.` |
| dwelling:sentries | 4522 / `f65cf664-2bd1-4fab-a815-672a8feeeea8` | `Unfinished Sentries dwelling. ENTIRE structure uses only ash-white stone, ivory bone ribs, cream funeral linen, charcoal doorway and tiny dull-gold hinges: absolutely zero green, moss, plants, turf or colored ground. Compact silent high-oblique watch-house with broad pale roof planes, two narrow empty watch openings and one open foreground arch. No guard figure, weapon, gothic black tower, skulls, cemetery, purple, fog, or glow.` |
| dwelling:larvalTide | 4523 / `e17b6102-8685-4229-8a90-9a78b71ab7f8` | `Vespiary Larval Tide dwelling. A compact LOW PAPER-NEST NURSERY BUILDING, not a bowl or pot: three joined pale paper chambers with visible folded roof tops, black segmented chitin braces, honey-amber resin seams, several tiny dark hexagonal wall openings and one open foreground hatch. Asymmetric built architecture. No larvae, cauldron, basin, ring, literal beehive, giant insect, honeycomb ground tile, flowers, vegetation, cave, or glow.` |
| dwelling:paperWaspLancers | 4514 / `8c13f1b5-9cfc-4193-81e8-eed09dd607c4` | `Vespiary Paper-Wasp Lancer dwelling: a compact tall folded-paper aerie braced with segmented black chitin and amber resin, with narrow lance racks under a visible layered roof and an open foreground hatch. Honey gold, paper cream and charcoal; asymmetric built insect architecture. No wasp figure, giant lance, medieval tower, literal beehive, flowers, vegetation, ground honeycomb, or glow.` |
| dwelling:silkSpinners | 4515 / `ae6a87db-30d0-420e-9e9d-edb42c8db46a` | `Vespiary Silk-Spinner dwelling: a compact asymmetric spinning house of layered paper nest panels, black chitin arches, honey-amber resin and three taut pale silk lines beneath the visible roof, with an open foreground hatch. Architectural and practical. No spider figure, giant web circle, cocoon creature, literal beehive, flowers, vegetation, ground tile, or glow.` |
| dwelling:crowChorus | 4530 / `c8890516-15b1-4e72-adfb-27684144309f` | `Hagwood Crow Chorus dwelling: a compact crooked rookery made from pale forked birch trunks, black woven-wicker roof baskets, bone-fence rails and one berry-red thread tie, with several empty perches and an open foreground gap. Asymmetric and bargained-looking. No crows, giant tree, forest, leafy canopy, nest eggs, green moss base, gothic tower, or magic effect.` |
| dwelling:fencePostFamiliars | 4531 / `67f1d330-8b46-4f96-8e71-fda3c0dee002` | `Hagwood Fence-Post Familiar dwelling: a compact crooked boundary-house made from four pale birch and bone fence posts linked by black wicker, with tiny carved eyes in the wood, one berry-red cloth scrap, a visible slanted top and open foreground gap. Mundane fence first. No creature figures, full fence line, field, grass base, giant eye, skull pile, hut scene, or glow.` |
| dwelling:besomRiders | 4532 / `a794689a-1dde-41b6-b911-0c26a8ac2c30` | `Hagwood Besom Rider dwelling: a compact leaning broom-shed of pale crooked birch, black wicker walls and crow-feather roofing, with three ordinary straw besoms stored diagonally under the eave and an open foreground door. White, charcoal and tiny berry-red accents. No witch figure, flying broom, giant tree, forest, grass base, cauldron, moon, or magic effect.` |
| dwelling:outriders | 4533 / `bf94c5fc-2ffa-4eb4-9fec-60d0ef70706b` | `Wildergrass Outrider dwelling: a low broad horse shelter of ash-grey timber, stretched ochre hide roofing, bone-horn braces and one small blood-red cloth tie, with an open foreground bay and a saddle rack. Fast practical silhouette. No rider, horse, tipi camp, grass yard, fence line, bonfire, mountain, or stone building.` |
| dwelling:drumCallers | 4534 / `75fd016f-143d-4134-be15-a746c21477b6` | `Wildergrass Drum-Caller dwelling: a low round-edged gathering lodge of ash-grey timber stakes, ochre hide roofing and curved horn braces, with two muted skin drums under the visible eave and an open foreground entry. Broad practical silhouette with tiny blood-red lashings. No drummer, giant drum icon, tipi camp, grass base, bonfire, instruments floating, or stone castle.` |
| dwelling:ashmaneWolves | 4535 / `a35df970-877b-49b6-9f91-d0c8d420d4e1` | `Wildergrass Ashmane Wolf dwelling: a low horn-framed kennel hollow built from ash-grey timber, stretched ochre hide and pale bone horns, with three dark den openings facing the foreground and restrained blood-red lashings. Broad pack shelter, architectural rather than a cave scene. No wolves, animal face, grass, rock landscape, mountain, bones pile, fire, or glow.` |
| dwelling:maskedDuelist | 4540 / `c0c0e068-dccc-4b8a-b1ed-40cd9303e614` | `Gloaming Court Masked Duelist dwelling, the Masque Ring: a compact high-oblique open practice pavilion with a dark timber octagonal roof, pale floorless arch posts, faded plum-and-cream cloth, two small blank porcelain masks hanging under the eave, and one open foreground entry. Elegant but weathered. No person, giant face, theatre stage, audience, circus tent, circular ground ring, grass, purple glow, magic portal, or castle.` |

The first Sentries candidate (seed 4512, job
`f2b12934-1cac-4957-aee0-9f5c076df7c9`) violated the Unfinished palette with a green roof.
The first Larval Tide candidate (seed 4513, job
`a0586eba-972a-4ece-b92e-975b694ce789`) read as a freestanding bowl rather than a building.

Pixen added a thin green contact/plinth fringe to many otherwise valid transparent buildings. The
checked-in `green-base` extraction removes only green-dominant pixels in the lower two-thirds
(`g > r*1.08`, `g > b*1.05`, and at least 12 above the weaker channel). It is used only for
faction/site palettes that contain no green material; generated architecture pixels otherwise remain
unchanged. All selected dwellings were composed over Meadow and Hush before promotion.

## Landscape proof — continuous Meadow and broad range

The literal production prompts and current PixelLab parameters are in
`assets/jobs/landscape-proof.json`. The accepted Meadow is seed 91421 (candidate 2), native
128×128 Pixflux with `assets/guides/landscape-meadow-field.png` as `init_image`, strength 450,
guidance 12, high-top-down view, selective outline, and medium shading/detail. The guide is rebuilt
by `scripts/buildPixelGuides`; PixelLab supplies the shipped material pixels. The checked-in
`terrain-seamless` post-process averages only the two opposite one-pixel borders so the macro field
self-tiles; it does not resize or repaint the interior.

Both first unguided Meadow candidates were rejected because they became miniature scenes with
trees, paths, flowers, and rocks. The accepted mountain is the second candidate of the final seed
91521 map-object request, native 64×96. An earlier prompt and the first candidate of the final
prompt were rejected as isolated alpine triangle icons. The selected broad low escarpment and
128×128 Meadow are promoted by the `landscape-proof` entries in `assets/selections.json` and are
reviewed in four cumulative in-game captures produced by `npm run review:landscape`.

## Landscape cute-style probe — castle, mountain, hero

The reproducible review-only job is `assets/jobs/landscape-cute-style-probe.json`. The selected
castle is seed 94120 from `generate-image-v2`, native 96×128, `no_background: true`, image 1 of
the endpoint's four variations:

```text
One freestanding cute fortified manor built from cream stone, with three round towers, bare red conical tile roofs, and a central arched gate. Warm hand-painted 1990s storybook pixel art. Front-facing oblique view with a little roof visible. Bright warm light hits right walls; left walls are dark. Only masonry and roofs on transparency. No poles, finials, flags, banners, plants, ground, or platform.
```

The selected mountain is seed 94222 from `create-image-pixflux`, native 160×112, candidate 3.
Parameters: `text_guidance_scale: 7`, `outline: selective outline`,
`shading: detailed shading`, `detail: medium detail`, `view: low top-down`,
`direction: south`, `isometric: false`, and `no_background: true`.

```text
An isolated sprite of one broad connected grey mountain ridge with four unequal overlapping peaks, in warm hand-painted 1990s storybook pixel art. Oblique view with rocky front slopes visible. Bright light hits right-facing rock planes; left faces are dark; shadow falls up-left. Rock pixels meet transparency directly. No snow, vegetation, ground patch, platform, cave, or diamond.
```

The selected south-facing hero is seed 94321 from `create-image-pixflux`, native 32×48,
candidate 2, with the same Pixflux controls except `shading: medium shading`.

```text
A cute mounted knight hero for a 1990s storybook fantasy adventure map: one complete small brown horse and one rider in red and cream with a steel cap and round shield. The horse faces south toward the viewer in an oblique map view. Sunlight comes from the lower right. Transparent background, with no flag, ground plate, or scenery.
```

All three remain review-only under `public/assets/review/`; no production manifest entry is
replaced by this probe. Their cumulative in-game frame is
`.pixel-work/review/landscape/05-cute-three-sprite-proof.png`.
# 2026-08-02 live regeneration addendum

The post-restart A1 source of truth is the literal request JSON in
`assets/jobs/a1-tiles-1.json`, `assets/jobs/a1-tiles-2.json`, and
`assets/jobs/a1-height-experiment.json`. The four opaque ground guides and transparent mountain
silhouette are rebuilt by `scripts/buildPixelGuides`; none is shipped. Base tiles use
`create-image-pixflux`, their declared native 32×32 guide as `init_image`, strength 220,
`text_guidance_scale: 10`, selective outline, medium shading/detail, high-top-down view, and opaque
background. Exact accepted candidates are:

| Asset variants 0 / 1 / 2 | Seeds | Selected candidates |
|---|---|---|
| meadow:default | 803158 / 480777 / 547920 | 1 / 2 / 2 |
| deepwood:default | 202412 / 77211 / 77231 | 2 / 1 / 2 |
| mountain:granite | 356583 / 678964 / 611821 | 1 / 1 / 1 |
| water:default | 376564 / 54183 / 631802 | 2 / 1 / 2 |

The height experiment uses the exact prompts and parameters in
`assets/jobs/a1-height-experiment.json`. Scattered canopy seed 78100 candidate 1 (PixelLab object
`99084617-3221-4ab6-b438-4b5174ada255`) won the same-state comparison against border-tree seed
78120 candidate 2 (`5a0c139b-2703-4ca9-89f7-c1eeefbdd1a8`). The canonical mountain uses seed
78240 candidate 2 at native 64×96 with the transparent `assets/guides/a1-mountain-range.png`
init guide, strength 260, no background, and guidance 12. Two preceding prompt-only mountain runs
were rejected for snow-white alpine caps and conifers.

The post-restart A2 source of truth is `assets/jobs/a2-overlays-1.json` and
`assets/jobs/a2-overlays-2.json`; guides are rebuilt by `scripts/buildPixelGuides`. Road candidates
were selected e/1, es/2, esw/1, ew/2, n/1, ne/2, ns/2, nw/2, s/1, sw/2, and w/2. Roads use guided
Pixflux with strength 420 except east–west seed 88320/strength 350. Seam uses Bitforge seed 13520,
candidate 2, the native `assets/guides/a2-seam.png` style input, style strength 90, no background,
guidance 14, selective outline, and medium shading/detail. Earlier guided Seam outputs were fully
transparent; the meadow-style retry became an unrelated object and was rejected.

A3 exact prompts and parameters live in `assets/jobs/a3-terrain-{1,2,3}.json`; the ten native guides
are rebuilt by `scripts/buildPixelGuides`. Selected candidate indices by family (variants 0/1/2)
are: Ashsteppe south 2/1/2, Barrowfield 2/1/2, Deepwood mossy 1/1/1, Hush north 2/1/1,
Lacquer Flats 2/2/1, coastal Meadow 1/2/1, coastal Mire 1/2/2, Mosswold mossy 2/2/2,
Mountain snowcap ground 2/2/2, and coastal Water 1/2/2. Seed overrides 84500–85060 and their
strength overrides are literal in `scripts/buildPixelJobs.ts`; they are not hidden post-processing.
The selected 3×3 fields are `.pixel-work/review/a3-terrain-selections-repeat.png`.

## Landscape camera lock — supersedes the rejected 128px proof

The literal prompts, parameters, seeds, and reference paths are committed in
`assets/jobs/landscape-camera-lock.json`; those strings are the exact API inputs. Shipped selections
are recorded under `landscape-camera-lock` in `assets/selections.json`.

| Shipped asset | Endpoint / winner | Camera and reference protocol |
|---|---|---|
| `terrain-field:meadow` | Pixflux, seed 92642 candidate 3, 256×256 | `high top-down`, `isometric:false`; the 256px organic guide is both `init_image` (520) and `color_image`; opposite one-pixel borders are matched without resampling. |
| `hero:hearthguard:{8 directions}` | 8-direction character, seed 92731 candidate 2, 32×48 | `low top-down`, `isometric:false`, horse template. Generated at 28×40; PixelLab's transparent animation padding is stripped and the unchanged visible native pixels are bottom-centered in 32×48. No color image—the first retry proved it recolored the entire rider green. |
| `map-object:mine:timber` | Bitforge, seed 92842 candidate 3, 64×80 | `low top-down`, `direction:south`, `isometric:false`, `oblique_projection:true`; frontal layout init 380, isolated H2 timber style reference 48, meadow palette anchors in prompt. |
| `decoration:mountain:range-clump{,-b}` | Bitforge, seed 92940 candidate 1, 128×160 | Same pinned oblique camera; broad frontal init 390 and rock-isolated H2 reference 50. The second file is a no-resampling horizontal mirror. A deterministic cleanup changes 51 inherited saturated yellow marker pixels to the established warm-rock highlight `(210,169,119)`. |
| `castle:hearthguard:castle` | Bitforge, seed 93042 candidate 3, 96×128 | Same pinned oblique camera; frontal gate layout init 330 and transparent architecture-only H2 castle style reference 60. Prompt explicitly bans flags, poles, banners, terrain, paths, and base plates. |

Shared object prompt law, sent literally in each relevant request: front façade or broad rock faces
face south toward the camera with a slight low-top-down tilt around 30 degrees; `isometric false`,
`oblique projection true`; ground contact is one horizontal band; no diamond/rhombus, corner-on
miniature, grass skirt, terrain plate, scenery, horizon, ownership color, flag, UI, text, or logo.
Every prompt states visual tile coverage and the shipped meadow anchors `#27612f`, `#3d7d33`, and
`#67a045`. Timber also pins `#503722`, `#8d5c30`, and `#bd8246`.

Exact scale clauses sent: hero fills about 28×42 pixels with hooves near y=44; timber fills two
tiles and rises about 2.5; each mountain massif spans four visual tiles over a central two-tile
gameplay footprint and rises five tiles; the castle fills three tiles wide, rises four, and places
its only gate at x=32..63/y=96..127. The castle's runtime `flagAnchor` remains the only pennant.

## Cute faction castles v2

All six deliverables are native 96×128 RGBA PNGs under `public/assets/castles-v2/`. Five original
files use `generate-image-v2` with `no_background: true`; Hearthguard reuses the approved
landscape-probe seed 94120 image 1 and is now wired to the live `castle:hearthguard:castle`
manifest entry. The toy-factory replacement uses the staged Pixflux/edit process recorded below.
Literal requests, seeds, candidates, and selections are recorded in the jobs and
`assets/selections.json`.

| Faction | Seed / selected image | Exact prompt |
|---|---|---|
| Wound-Wrights | 95120 / 2 | `One freestanding cute Wound-Wrights fortified manor with three joined round towers and one central arched gate. Lacquered red and blue wood, cream porcelain wall panels, dull tin roofs, stitched cloth seams, and small brass hinges. Warm hand-painted 1990s storybook pixel art. Front-facing oblique view with a little roof visible. Bright warm light hits right walls; left walls are dark. Only architecture on transparency. No people, toys, poles, flags, banners, plants, ground, or platform.` |
| Toy-factory castle replacement | 95931 / 2 + edit | `Rework this building as a medieval toy-making factory. Keep the cute two-tower gatehouse silhouette, cream stone, arched wooden door, and large central brass gear. Replace both flagpoles with a giant winding key and a short copper exhaust pipe. Add interlocking cogwheels and copper pipes across the lower front wall. Remove every flower, shrub, rock, and patch of ground so the bottom meets transparency in a clean horizontal edge. Cute 1990s storybook pixel art, front-facing with a slight overhead view. Bright warm light on the right, shadow on the left.` |
| Vespiary | 95321 / 3 | `One freestanding formal Vespiary hive fortress with three joined asymmetric paper-nest towers and one central dark gate. Layered cream paper walls, black segmented chitin braces, honey-gold amber windows, and warm resin seams. Warm hand-painted 1990s storybook pixel art. Front-facing oblique view with a little roof visible. Bright warm light hits right faces; left faces are dark. Only architecture on transparency. No insects, honeycomb ground, organic mound, poles, flags, plants, ground, or platform.` |
| Hagwood | 95421 / 1 | `One freestanding crooked Hagwood stronghold with three joined leaning towers grown from white birch and one central open gate. Black wicker walls, pale bone-fence braces, crow-feather roofs, and one tiny berry-red thread accent; asymmetrical but readable. Warm hand-painted 1990s storybook pixel art. Front-facing oblique view with a little roof visible. Bright warm light hits right faces; left faces are dark. Only architecture on transparency. No witch, crows, forest, full trees, poles, flags, plants, ground, or platform.` |
| Wildergrass | 95521 / 2 | `One freestanding low broad Wildergrass clan stronghold with three joined horn-framed lodges and one central open gate. Ash-grey timber walls, ochre hide roofs, pale curved horn braces, and restrained blood-red lashings; sturdy, windswept, and fast-looking. Warm hand-painted 1990s storybook pixel art. Front-facing oblique view with a little roof visible. Bright warm light hits right faces; left faces are dark. Only architecture on transparency. No riders, animals, tents, camp, poles, flags, grass, ground, or platform.` |

The sixth castle-only in-game review is `.pixel-work/review/landscape/06-castle-faction-lineup.png`.

The final cleanup edit used the Pixflux candidate above as its image reference; the reviewed native
reference is retained as `assets/guides/b3-toy-factory-init.png`, so the job's input resolves in a
clean clone. Its exact prompt:
`Edit this exact pixel-art building sprite. Preserve its cute medieval gatehouse proportions, cream
stone walls, red roofs, central brass gear, arched wooden door, front-facing oblique camera,
pixel-art rendering, and transparent background. Remove both red flags and their poles completely.
Remove every flower, shrub, rock, weed, and patch of ground along the bottom; replace them with the
building's clean straight stone foundation ending directly on transparency. Strengthen the
toy-factory identity by adding two or three small interlocking brass cogwheels and simple copper
pipes on the lower front walls, plus one chunky wind-up key mounted on the right roof. Keep the
steampunk influence restrained and playful, not industrial. Do not add a base plate, landscape,
smoke, text, banner, character, loose toy, or new flag. Return a single isolated pixel-art game
sprite with transparency.` The returned checkerboard was removed from the outside inward, then the
visible sprite was fitted without stretching to the 96×128 contract and reduced to 64 colors.

## Doc 33 mountain overlap family — active

The first retained production member reuses the already-approved PixelLab Pixflux seed 94222,
candidate 3, at native 160×112. Literal winning prompt:

`An isolated sprite of one broad connected grey mountain ridge with four unequal overlapping peaks,
in warm hand-painted 1990s storybook pixel art. Oblique view with rocky front slopes visible. Bright
light hits right-facing rock planes; left faces are dark; shadow falls up-left. Rock pixels meet
transparency directly. No snow, vegetation, ground patch, platform, cave, or diamond.`

Endpoint: `create-image-pixflux`; `view: low top-down`, `direction: south`, `isometric: false`,
`no_background: true`, guidance 7, selective outline, detailed shading, medium detail. The selected
bitmap is repacked without resampling to place its visible base on the canvas bottom and promoted as
`decoration:mountain:granite-massif-1`.

The scatter-family job is `assets/jobs/doc33-mountain-granite-scatter.json`. Its first literal prompt
was:

`a low granite outcrop, cool charcoal-grey stone with warm grey highlights, one split slab leaning
over two smaller rocks and both ends descending to pebble height, oblique front-on view with a slight
overhead tilt, light from the lower right with shadows falling to the upper left, flat horizontal
ground contact, 1 tile wide and about 1 tile tall, HoMM2-era storybook pixel art`

Bitforge revision 0 failed before generation because the supplied 160×112 style reference did not
match the 32×48 request. Revision 1 used exact-size generated-only references
`assets/guides/doc33-granite-scatter-style-32x48.png` and
`assets/guides/doc33-granite-scatter-color-32x48.png`; candidate 1 collapsed into a narrow vertical
smear. Candidate 2 and the other five subjects were blocked by the PixelLab 2,000-generation account
limit. None of the scatter requests is selected or renderer-visible.

A later scripted retry of candidate 2 did not reach PixelLab: the agent process had neither
`PIXELLAB_API_KEY` nor `PIXELLAB_SECRET`, even though an earlier shell session had reported the key
present. This is recorded separately from the HTTP 402 quota failure because no prompt or candidate
was submitted.

The shipped B1/B2/B4/B5 candidates were also re-audited under doc 33. Their original literal prompts
remain in their job files as the failure record; they predate the binding template and include
asset-management language, `simple`, a high/corner-biased camera, and an upper-left-light clause.
The resulting grass skirts and baked dwelling pennants are therefore systematic prompt failures,
not seed failures. Selective replacement prompts must use doc 33 §1.3 verbatim camera/light/contact
strings and describe visible subject materials instead of re-rolling those requests.

The complete mountain-family request graph is now recorded before submission:

- `doc33-mountain-granite-scatter.json`: 6 ready 32×48 scatter requests.
- `doc33-mountain-granite-medium.json`: 4 knolls, 4 ridges and the second massif, staged behind the
  approved granite scatter and exact-size family references.
- `doc33-mountain-snowcap-scatter.json`: 6 scatter requests, staged behind the approved granite
  scatter as the projection/style reference; the shipped snowcap terrain supplies the colour guide.
- `doc33-mountain-snowcap-medium.json`: 4 knolls, 4 ridges and 2 massifs, staged behind an approved
  snowcap scatter.

Every positive prompt in those jobs uses doc 33's fixed camera, light, contact, scale and style
clauses verbatim. Role/index/status vocabulary appears only in IDs and metadata, never in the
positive descriptions.

Selective non-mountain retries are also scripted but not submitted:

- `doc33-a4-plateless-replacements.json` contains the old oak and Deepwood canopy whose existing
  sprites have a blue-green ground pad.
- `doc33-core-prop-replacements.json` contains seven visibly plate-bound B1/B2/B4 assets.
- `doc33-dwelling-replacements-{1,2,3}.json` contains nineteen distinct architectural subjects.
  The new subjects are visual descriptions such as a horn-framed kennel lodge, open lantern house,
  lacquered toy stable, resin hatchery and woven paper loom house; unit and faction proper names are
  absent from the positive prompts. `bare roof ridge`, a concrete door or niche, and the API's
  background-free parameter replace the old flag/terrain-heavy wording.

All four jobs use `generate-image-v2` with `no_background: true`, three candidates, native final
dimensions and no reference image. This endpoint/protocol is inherited from the clean castle-v2
batch; if the first core contact sheet drifts in palette, it must be revised with an exact-size
terrain/style reference before any selection is promoted.

## User-approved cute granite family — built-in image-generation source

The eight interim shipped granite pieces use
`prototypes/adventure-map/assets/mountain-family-source.png`. They were generated with the built-in
image-generation tool and promoted by `scripts/buildCuteMountainFamily.mjs`; no new model request
was made during promotion. The literal source prompt was:

```text
Use case: stylized-concept
Asset type: reference sheet for small reusable adventure-map mountain sprites
Input image: the supplied Heroes of Might and Magic II adventure-map screenshot is a composition and scale reference only; do not reproduce its UI, map, buildings, or layout.
Primary request: create eight distinct small grassy mountain and rocky-hill sprite concepts that can be overlapped into many natural ranges. Include two low scatter outcrops, two rounded knolls, three asymmetric narrow ridge pieces, and one slightly larger massif. Every silhouette must differ materially; avoid repeating a centered three-peak stamp.
Scene/backdrop: a perfectly flat solid #ff00ff chroma-key background, with all eight sprites separated and arranged in a clean 4-by-2 reference sheet; no labels.
Style/medium: authentic hand-placed HoMM2-era storybook pixel art, crisp native-looking pixel clusters, restrained detail, no smooth painting or anti-aliasing.
Composition/framing: each common piece should visually cover roughly one or two square-grid cells and remain much smaller than a castle; front-facing oblique adventure-map view with a slight overhead tilt, horizontal ground contact, never an isometric diamond. Pieces must have self-terminating left and right ends so adjacent sprites can overlap without cut cliff edges.
Lighting/mood: warm light from the lower right, shadows implied toward the upper left; warm, practical, storybook.
Color palette: muted charcoal and warm grey stone with dark creases, meadow-green grass and tiny ochre scree at the contact edge.
Constraints: transparent-sprite-friendly isolated silhouettes; grassy contact integrated into every base; enough internal variation to build long ranges without obvious copy-paste; no snow; no trees; no flowers; no caves; no structures; no flags; no text; no UI; no borders; no cast shadows; no ground patches beyond the narrow grassy contact; do not use #ff00ff inside any sprite.
Avoid: one giant landmark mountain, six nearly identical triangular peaks, diamond bases, miniature landscape dioramas, alpine snowcaps, photorealism, smooth 3D rendering, watermark.
```

The output files are `mountain-granite-scatter-{1..4}.png`,
`mountain-granite-knoll-{1..2}.png`, `mountain-granite-ridge-1.png`, and
`mountain-granite-massif-2.png` under `public/assets/decorations/`.

## Mountain family v2 — supersedes the interim eight-piece sheet

The active 32-piece granite and snowcap family was generated as eight role-specific source sheets,
so scatter, knoll, ridge, and massif subjects are independently drawn rather than resized from one
landmark. The literal built-in requests are recorded in
`assets/prompts/mountain-family-v2.md`. Project-bound keyed and transparent sources live in
`assets/sources/mountain-family-v2/`; final native game canvases are rebuilt by
`scripts/buildCuteMountainFamily.mjs`.

## Mountain ridges v3 — higher-angle range fill

The four granite and four snowcap workhorse ridge files are superseded by broader, more top-down
subjects generated specifically for multi-row occlusion. Their two literal built-in prompts are in
`assets/prompts/mountain-ridges-topdown-v3.md`; keyed and chroma-removed sources are in
`assets/sources/mountain-family-v3/`. Scatter, knoll, and massif sources remain v2.

## Unfinished combat roster — built-in image-generation sources

The six active Unfinished battle-unit sources were generated individually with the built-in image
tool, keyed on flat magenta, chroma-removed locally, and reduced through one fixed bone/linen/candle
palette. The exact literal prompts are in `assets/prompts/unfinished-combat-built-in.md`; keyed
project sources are in `assets/sources/unfinished-roster/`, and the deterministic native-canvas
bake is `scripts/buildUnfinishedRoster.py`.

## Remaining playable-faction combat rosters — built-in sources

The active Wound-Wrights, Vespiary, Hagwood and Wildergrass combat sprites were generated as 24
independent flat-magenta sources with the built-in image tool. Their reproducible subject prompts,
shared rendering contract, source locations and rejected first Larval Tide are recorded in
`assets/prompts/remaining-faction-combat-built-in.md`. The native-canvas bake is
`scripts/buildRemainingFactionRosters.py`.

## Missing special-culture and siege combat sprites — built-in sources

The 14 formerly missing combat sprites for the Gloaming Court, Seamborn/siege set, and Driftfolk
were generated as independent keyed sources. Their literal subject prompts, shared rendering
contract, source locations, canvas contracts, and deterministic fixed-palette bake are recorded in
`assets/prompts/missing-battle-rosters-built-in.md`. The native-canvas builder is
`scripts/buildMissingBattleRosters.py`.

## Six 5x2 faction cities — built-in sources

The active faction-city sprites were generated on 2026-08-10 with exactly one built-in
image-generation request per faction. Every request names the literal physical subject from
`assets/adventureSpriteInventory.ts`, the front-facing high-oblique camera, lower-right/south-east
key light, centered `(2,1)` entrance, flat green key, and complete terrain/flag/text exclusions.
The exact literal requests and selected source/final pairs are in
`assets/jobs/city-sprites-built-in.json`; accepted hashes, alpha review, and visual assessments are
in `assets/provenance/city-sprite-generation.json`.

The retained 1254x1254 chroma sources are under `assets/sources/cities/`. The installed helper
removes the sampled flat border key with soft matte and despill; `scripts/buildCitySprites.py` then
performs one deterministic nearest-neighbour reduction, applies hard alpha, bottom-centres the
subject on a 160x160 canvas, and writes `public/assets/cities/`. The final canvas exposes the 5x2
contact at `y=96..159`; the only entrance is centered over tile `(2,1)`. The builder also writes a
nearest-neighbour ×3 native-final contact sheet to
`.pixel-work/review/cities/city-sprites-contact-sheet.png`.

## Complete canonical item family — built-in sources

All 37 canonical items were generated with one separate built-in image-generation call per ItemId.
Each exact request embeds the literal subject from `assets/adventureSpriteInventory.ts`, the shared
bright storybook pixel treatment, high-oblique non-isometric camera, south-east key light, generous
padding, and a removable flat green or magenta key. Sources live in `assets/sources/items/`, native
hard-alpha finals in `public/assets/items/`, and exact prompts/call paths/hashes/selections in
`assets/jobs/item-sprites-built-in.json` and `assets/provenance/item-sprite-generation.json`.

`scripts/buildCollectibleSprites.py` is family-generic for later artifact batches. It removes the
declared chroma locally, crops, nearest-neighbour reduces, applies a compact adaptive palette and
hard alpha, then emits group contact sheets under `.pixel-work/review/collectibles/item/`. Contact
review rejected the first Scroll of Quiet because a full bell dominated its parchment; that source
is retained under `assets/sources/items/discarded/` and the selected targeted retry is parchment-first.

## Original base and bridge terrain — HoMM2 image retirement

Eighteen native 32×32 opaque terrain cells were generated through PixelLab Pixflux using the
repository `scripts/pixelgen` workflow. The three production job files contain the exact literal
prompts, negative prompts, endpoint, size, seeds, guidance values, and original project palette
references:

- `assets/jobs/homm2-retirement-core.json` — Grass, Snow, and Water;
- `assets/jobs/homm2-retirement-bridges.json` — Dirt, Beach, and Plains;
- `assets/jobs/homm2-retirement-showcase.json` — Swamp, Volcanic, and Desert.

No request used a HoMM2 image. Each material has two independently prompted variants and two
candidates per variant. After native 3×3 repeat review and targeted retry, the selected one-based
candidate pairs are: Grass 1/1, Snow 2/2, Water 2/1, Dirt 1/2, Beach 1/1, Plains 2/1, Swamp 2/2,
Volcanic 1/2, and Desert 2/2. `scripts/promoteOriginalTerrain.py` is the selection authority. It
copies the selected native files without resizing and assembles each 288×288 runtime pattern from
the two source cells without resizing them. The second variant is broad-value matched to the first
only in the derived runtime pattern; promoted native PixelLab sources remain byte-for-byte selected.

The final native sources are under `public/assets/terrain/original-native/`; runtime patterns are
`public/assets/terrain/original-showcase-*.png`. Local third-party image references and their exact
provenance boundary are recorded separately in
`assets/provenance/homm2-image-inventory.json` and are not production inputs.
