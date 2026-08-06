# 36 — Native Terrain Transitions and Generated Game Families

Status: accepted for game use on 2026-08-05; HoMM2 image dependency retired later that day. This is the authoritative rendering and continuation
handoff for the native terrain-transition work. It consolidates the implementation checkpoints,
asset-batch reflections, and operative decisions; `ASSETS_LOG.md` remains the chronological
generation record and `DECISIONS.md` remains the decision record.

This work is presentation-only. Gameplay terrain IDs, movement, native-ground bonuses, resonance,
map authoring, collision, saves, and mountain footprints remain governed by S03 and the content
catalog. Pixel-art process rules remain governed by doc 31. Mountain composition remains governed
by doc 35.

## Current state

Adventure terrain is native 32×32 and displayed at integer ×1. `AdventureMap` converts the
rules-facing terrain grid to a visual grid with `gameMapTerrainGrid`, then mounts
`NativeTerrainSurface`. The surface is used by the production game and the standalone review; it is not
a showcase-only renderer.

The current visual mapping is:

| Gameplay terrain | Rendered material | Source status |
|---|---|---|
| Meadow | Grass | original PixelLab material |
| Deepwood | Deepwood | existing game palette plus selected PixelLab material |
| Mosswold | Mosswold | existing game palette plus selected PixelLab material |
| Ashsteppe | Ashsteppe | existing game palette plus selected PixelLab material |
| Barrowfield | Barrowfield | existing game palette plus selected PixelLab material |
| Lacquer Flats | Lacquer Flats | existing game palette plus selected PixelLab material |
| The Hush | Snow | original PixelLab material |
| Mire | Mire | existing game palette plus selected PixelLab material |
| Mountain | Grass beneath transparent mountain sprites | mountain compositor unchanged |
| Water | Water | original PixelLab material |

Dirt and Beach are rendering-only bridge materials, not additions to the gameplay terrain catalog.
Beach mediates Water against any non-Beach material. Dirt mediates incompatible land families.
Existing Dirt and Beach meet their neighbours directly, so the bridge rule does not recurse.

All nine base/bridge materials and six game-specific families are approved for production use. The
base/bridge sources live under `public/assets/terrain/original-native/`; their derived 288×288
patterns are `original-showcase-*.png`. Broad-value matching is applied only while composing those
derived fields so alternating original variants do not checkerboard; native sources are untouched.
The game-specific derived 288×288 patterns are
already visible in the production adventure renderer. All sixteen selected Wang cells per family
are promoted and reviewed, but the runtime does **not yet choose those cells as literal edge
pieces**. Today, edge geometry comes from the SVG compositor and the selected Wang interior cell is
used sparsely inside the derived family pattern. Direct Wang edge selection is the next integration
task.

## Transition compositor

The implementation lives in:

- `src/ui/terrainTransitions.ts` — visual mapping, bridge rules, deterministic ownership field, and
  SVG path generation;
- `src/ui/components/NativeTerrainSurface.tsx` — shared production/showcase SVG surface and patterns;
- `src/ui/components/AdventureMap.tsx` — production mount;
- `src/ui/terrainShowcase.ts` and `src/ui/components/TerrainShowcase.tsx` — stress fixtures and
  selected-vocabulary presentation.

The compositor samples each logical cell on a two-pixel native grid. Bilinear corner ownership,
small deterministic hash noise, and symmetric four-pixel bridge probes create curved and irregular
boundaries while retaining exact integer coordinates. Horizontal runs with the same owner are
coalesced into SVG paths filled by native-derived PNG patterns. Adjacent paths share coordinates,
so there are no antialiased gaps. No runtime canvas, scaling, or blur is used.

This grammar deliberately avoids a quadratic transition catalog. A family needs a coherent
family-to-Dirt vocabulary; water-facing land uses Beach. The standalone fixtures cover broad
masses, convex and concave corners, islands, holes, acute elbows, one-cell channels, peninsulas,
three-way contacts, and crowded multi-family junctions.

## Retired HoMM2 image boundary

The user-supplied screenshots and composed map reference remain local-only generation references.
They and their direct crops, mixed guides, extracted fields, transition strips, and stale rendered
screenshots are precisely gitignored and fingerprinted in
`assets/provenance/homm2-image-inventory.json`. No ignored image is loaded by runtime, build, tests,
or browser review fixtures. Textual references to the interaction hierarchy, connected-range
grammar, and storybook-era presentation remain deliberately retained.

`scripts/buildH2TerrainPlaceholder` and `scripts/buildGameTerrainGuides` are historical/local
reproduction utilities only. Their outputs match targeted ignore rules and cannot become build or
review inputs. PixelLab generation records may still name a local-only reference image, which doc 31
permits, while the selected generated candidate remains original project art.

The retired transition strips are no longer mounted in the standalone review. The deterministic SVG
ownership field is the only transition geometry used by the current renderer.

## Generated game-family assets

Deepwood, Mosswold, Ashsteppe, Barrowfield, Lacquer Flats, and Mire had no exact material match in
the H2 reference. PixelLab generated a native family-to-Dirt Wang set for each one, plus controlled
incidental details. Production files are under:

`public/assets/terrain/game-native/<family>/`

Each family contains `wang-01.png` through `wang-16.png`, a 512×32 `wang-strip.png`, and one accepted
32×32 `detail-micro.png`. Mosswold and Lacquer Flats also contain `detail-macro.png`. The complete
promotion is 96 Wang cells plus eight detail cells, all copied at their requested 32×32 size without
resampling.

| Family | Selected Wang output | Accepted details |
|---|---|---|
| Deepwood | first-pass candidate 2 | micro candidate 1 |
| Mosswold | first-pass candidate 2 | micro 1, macro 2 |
| Ashsteppe | palette-lock retry candidate 2 | micro 1 |
| Barrowfield | first-pass candidate 2 | micro 2 |
| Lacquer Flats | palette-lock retry candidate 2 | micro 2, macro 2 |
| Mire | first-pass candidate 2 | micro 1 |

Barrowfield Wang cell 13 is copied from candidate 1 because Pixelgen deduplicated the byte-identical
candidate-2 frame. This is a storage fallback, not a mixed visual selection.

The first Ashsteppe and Lacquer Flats Wang outputs drifted toward orange/checkerboard and
orange/board-like materials. Their accepted retries use guides in which existing game art occupies
two thirds of the image and H2 contributes only transition geometry. The first detail protocol made
mushrooms and branches too large and recoloured whole fields; none of those candidates shipped.
The accepted retry uses a same-size game-palette composition lock at strength 330.

## Scale law

One 32×32 terrain cell represents roughly a human-sized patch of ground. Generated detail is judged
at native size and in a repeated field, not as an isolated enlarged sprite.

- Insects, mushrooms, bone chips, paint flecks, and similar incidentals occupy 1–5 pixels and may
  not become a centred specimen or icon.
- A fallen branch, shallow ridge, ripple, or ground crack may span 8–14 pixels only when it remains
  narrow, flat, and subordinate; accepted larger marks stay below half a cell.
- Fields must remain opaque and quiet across all four edges, with uniform illumination and no
  gradient, vignette, border, checkerboard, repeated row, path, text, or baked focal object.
- Production generation and promotion never resize terrain PNGs.

Derived `game-showcase-<family>.png` files are 288×288 deterministic patterns. Existing approved
game variants carry most of each field. A selected generated interior appears at roughly one cell
in twenty-nine and accepted details at roughly one in thirty-seven. Broad-value matching is applied
only while building these derived patterns; promoted source PNGs are not overwritten.

## Reproduction and provenance

Credential availability can be checked without network traffic or printing the secret:

```sh
scripts/pixelgen assets/jobs/game-terrain-native-wang-1.json --check-auth
```

The shell setup exports `PIXELLAB_API_KEY` (or the supported `PIXELLAB_SECRET` fallback) from
`~/.zshenv`, so interactive shells, non-interactive shells, and child Python processes inherit it.
Secrets remain outside the repository. On a `/mnt/c` WSL mount, Windows ACLs rather than Unix mode
bits govern the external key file.

Canonical generation records are:

- `assets/jobs/game-terrain-native-wang-{1,2}.json` and
  `assets/jobs/game-terrain-native-wang-retry.json`;
- `assets/jobs/game-terrain-native-details-{1,2}.json` and
  `assets/jobs/game-terrain-native-details-retry-{1,2}.json`;
- `assets/guides/game-terrain-*.png`;
- selection and copy rules in `scripts/promoteGameTerrainFamilies.py`.

The HoMM2-retirement generation records are:

- `assets/jobs/homm2-retirement-{core,bridges,showcase}.json`;
- selection and native no-resize promotion in `scripts/promoteOriginalTerrain.py`;
- exact prompts in those jobs and the consolidated record in `assets/prompts.md`;
- source/reference/output classification in `assets/provenance/homm2-image-inventory.json`.

The request IDs are marked `review_only` because these cells are a supplemental transition
vocabulary rather than one-to-one asset-manifest entries. The selected promoted PNGs are production
files regardless of that catalog classification. Rejected candidates and receipts remain under
`.pixel-work` only.

Rebuild the currently shipped original base materials from reviewed PixelLab candidates with:

```sh
scripts/pixelgen assets/jobs/homm2-retirement-core.json --dry-run
scripts/pixelgen assets/jobs/homm2-retirement-bridges.json --dry-run
scripts/pixelgen assets/jobs/homm2-retirement-showcase.json --dry-run
scripts/promoteOriginalTerrain
```

Running the live jobs again spends PixelLab generations and is unnecessary unless deliberately
requesting new candidates. `scripts/promoteGameTerrainFamilies` copies the recorded selections and
then rebuilds the derived patterns.

## Review and acceptance

Start Vite and capture all three reviews:

```sh
npm run dev -- --host 127.0.0.1 --port 5190
BM_URL=http://127.0.0.1:5190/ npm run review:terrain-showcase
```

Outputs:

- `.pixel-work/review/terrain-transition-showcase-native.png` — 60×42 H2-derived stress map;
- `.pixel-work/review/game-terrain-transition-showcase-native.png` — 54×26 canonical-family map,
  six selected Wang rows, and native detail swatches.

After changing terrain art or composition, run:

```sh
npx vitest run src/core/__tests__/terrain-transitions.test.ts \
  src/core/__tests__/mountain-ranges.test.ts \
  src/core/__tests__/asset-manifest.test.ts
npm run pixel-jobs-check
npm run build
npm run smoke
npm run review:terrain-showcase
npm run review:mountain
```

The terrain tests cover bridge symmetry, fixture breadth, canonical-to-visual adaptation, and exact
PNG dimensions. The mountain review is mandatory because mountain cells deliberately render Grass
beneath the independent transparent mountain sprites.

At original-material consolidation time, all focused checks, provenance/asset checks, production build, browser smoke, terrain review,
mountain review, and 322/322 asset/worklist coverage pass. The repository-wide suite has one known
unrelated failure: the deterministic AI simulation does not always produce a winner within eight
weeks (`mechanics-regression.test.ts`).

## Next integration step

Live tracking: Beads epic `vibes_and_magic-6sf`; direct Wang selection remains
`vibes_and_magic-6sf.1`. Original Meadow/Hush/Water materials and retirement of the temporary image
dependency were completed by `vibes_and_magic-owa.9`; reconcile or close the superseded 6sf children
when next maintaining that epic.

Use the promoted Wang cells directly in the game rather than generating another batch. First write
down or inspect PixelLab's sixteen-cell edge-mask ordering; do not infer it from filename order.
Add a deterministic selector that maps local family/Dirt adjacency to that verified ordering, then
compare it against the current SVG boundary in the same 54×26 stress fixture. Keep the SVG bridge
path as a fallback until all convex corners, concave corners, narrow channels, islands, and
three-way joins pass visual review.

Do not change gameplay terrain data or the mountain compositor during this work. The original
base-material batch is complete; direct use of the already-approved six-family Wang vocabulary is
still a separate integration concern.
