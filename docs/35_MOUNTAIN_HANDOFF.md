# 35 — Mountain Family Handoff

Status: grassy family accepted by the user on 2026-08-04. The first rocky family pass was rejected
on 2026-08-05 because it composed as separate 2×1 formations; the connectivity-first backbone
revision and arbitrary-shape proof supersede that pass. This is a continuation note, not a new
mechanics spec. Docs 31 and 33 remain the governing pixel-art and map-prop instructions.

## What shipped

The adventure map retains one complete grassy mountain climate:

- four 64×64 knolls;
- four 96×96 workhorse ridges;
- two rare 160×112 massifs.

They live at `public/assets/decorations/mountain-granite-{knoll,ridge,massif}-*.png`. All were
requested from PixelLab at their final native dimensions. Production never scales the PNGs; the
renderer applies only the global integer pixel scale. The accepted proof below was made at ×2;
the later native-terrain pass moved production to ×1 without changing these assets or their
compositor. Doc 36 owns that terrain scale, underlay, and transition continuation state.

The accepted proof image is:

`.pixel-work/review/mountain-shape-showcase-x2.png`

It contains only meadow and six automatically composed footprints: compact oval, long shoulder,
crescent, broad elbow, diagonal staircase, and twin-lobed saddle. It uses 174 sprite placements and
nine variants. No individual sprite was hand-picked for the screenshot.

The production compositor now selects a separate climate-neutral rocky family first:

- four 64×64 knolls;
- four 96×96 ridges;
- two rare 160×112 massifs.
- eight 192×128 continuous six-tile backbones for hidden/interior joins;
- eight matching 192×128 irregular boundary forms for terrain-facing edges.

They live at `public/assets/decorations/mountain-rocky-{knoll,ridge,massif}-*.png`. The reproducible
PixelLab job is `assets/jobs/mountain-rocky-native-family.json`; literal prompts and selection notes
are in `assets/prompts/mountain-rocky-native.md`; deterministic promotion is
`scripts/promoteRockyMountains`. All requests and production files use the same final native
dimensions, with no resize step. The connectivity revision adds
`assets/jobs/mountain-rocky-connected-backbones.json`,
`assets/jobs/mountain-rocky-backbone-variety.json`,
`assets/prompts/mountain-rocky-connected-backbones.md`, `scripts/buildRockyBackboneGuide.py`, and
`scripts/promoteRockyBackbones.py`.

The current proof image is `.pixel-work/review/rocky-mountain-shape-showcase-native.png`. It contains
eight automatically composed footprints: compact oval, long shoulder, crescent, broad elbow,
diagonal staircase, twin-lobed saddle, one-cell-wide hook, and two irregular lobes joined by a
one-cell bottleneck. It uses 74 placements and 17 variants. This dedicated fixture, not Border
Marches, is the visual acceptance surface for connectivity and shape variety.

## How composition works

`src/ui/mountainRanges.ts` is the production compositor. `deriveMountainRanges(map)` reads authored
impassable mountain cells and emits deterministic, painter-sorted decorations:

- one- and two-cell horizontal slices use tall ridges when they continue north/south, so narrow
  vertical spines overlap instead of becoming separated dashes;
- genuinely isolated one- and two-cell ledges retain the approved knolls;
- three-cell runs use a ridge;
- every row of four or more cells starts with a continuous 192×128 spine;
- eight base silhouettes rotate in a step-three sequence before local-repeat avoidance;
- long rows overlap successive six-tile spines by two contact cells;
- segments touching flat terrain on the left, right, or south use an irregular `boundary` form;
- only fully occluded interior segments may use their solid `backbone` counterpart;
- later/southern rows occlude earlier/northern rows, joining broad masks into deep masses;
- every authored mountain cell remains the gameplay footprint and is covered by a sprite contact
  band; visual overhang never changes collision or pathfinding.

The composer intentionally selects the new `rocky` family for all mountain cells for now. Authored
`granite` and `snowcap` metadata remains unchanged for later climate selection, and the accepted
grassy family remains available as a reproducible source family. Do not select a terrain-specific
skin until it has a complete native family and passes the same arbitrary-shape showcase.

## Generation and promotion

Use the PixelLab API through `scripts/pixelgen`, not MCP or built-in image generation. The API key
is supplied by `PIXELLAB_API_KEY`; never write it to the repository.

Canonical request records:

- `assets/jobs/mountain-grassy-native-ridges.json`
- `assets/jobs/mountain-grassy-native-family.json`
- `assets/prompts/mountain-grassy-native.md`
- stable init guides under `assets/guides/grassy-mountain-native-init/`
- `assets/jobs/mountain-rocky-native-family.json`
- `assets/prompts/mountain-rocky-native.md`
- `assets/jobs/mountain-rocky-connected-backbones.json`
- `assets/jobs/mountain-rocky-backbone-variety.json`
- `assets/prompts/mountain-rocky-connected-backbones.md`

Pixflux with a role-matched init image at strength 210 worked. Prompt-only Bitforge produced round
garden/forest islands and should not be repeated. Prompts should demand a high-oblique top-down,
broad connected landform that is green first and stone second, with low self-terminating ends.

Selected candidates are encoded in `scripts/promoteGrassyMountains.py`. Rebuild production files
with:

```sh
scripts/promoteGrassyMountains
```

The script verifies exact native dimensions, hardens alpha, removes detached specks, normalizes the
green/tan palette, and bottom-anchors within the unchanged canvas. It does not crop-to-fit, resize,
or add a base plate.

The rocky selections are encoded in `scripts/promoteRockyMountains.py` and rebuilt with
`scripts/promoteRockyMountains`. Pixflux used the same role-matched native guides at strength 195,
then the deterministic promoter hardened alpha, removed detached specks, mapped a fixed slate/stone
palette with sparse moss, and bottom-anchored inside the original canvas. It does not alter geometry
or dimensions.

The connected backbones use a separate no-resize pipeline. `scripts/buildRockyBackboneGuide.py`
overlaps approved native sprites into four transparent 192×128 init guides. PixelLab redraws those
whole silhouettes as joined geology. `scripts/promoteRockyBackbones.py` promotes eight selected
bases at unchanged 192×128 size, then removes pixels to derive eight matching irregular boundary
forms. It never scales. The unsuccessful 256×160 prompt-only and init-guided probes remain in the
job record: they drew attractive ranges but baked opaque scene backgrounds.

Important failed iteration: the first two full backbones connected well but had all 192 bottom-row
pixels opaque and substantial opaque side columns. They produced ruler-straight terrain boundaries.
A later narrow-margin retry only moved each vertical cut inward. The current boundary contract
requires tapered low shoulders at both sides, an irregular 2–7px bottom cut, no canvas-side pixels,
and at most 25% bottom-row opacity. Full forms remain legal only where overlap hides their edges.

Important failed iteration: never add a full-width opaque “grass contact” row to satisfy footprint
coverage. Repeated sprites turned that row into obvious dark horizontal seams. The correct fix was
to preserve each generated self-terminating ground edge and let obstacle validation allow at most a
ten-percent transparent taper against the declared footprint width.

## Reproducing the accepted review

Start Vite, then run the production-compositor review:

```sh
npm run dev -- --host 127.0.0.1 --port 5190
BM_URL=http://127.0.0.1:5190/ npm run review:mountain-showcase
```

The fixture is `src/sim/mountain-showcase.ts`. It constructs only mountain terrain masks; it must
continue to call `deriveMountainRanges` rather than duplicating or hand-authoring composition. The
command writes `.pixel-work/review/rocky-mountain-shape-showcase-native.png`; the accepted grassy ×2
image remains unchanged as historical evidence.

Run the focused acceptance checks after changing assets or the compositor:

```sh
npm run assets-check
npm test -- --run src/core/__tests__/mountain-ranges.test.ts
npm run build
```

The tests cover determinism, contact coverage, boundary dominance on exposed long runs, native
family dimensions, eight-variant rotation, interior-versus-boundary selection, every possible 3×3 mask, longer one-cell runs, and
named block, elbow, stair, enclosure, hook, bottleneck, and crescent topologies. Always inspect the
regenerated showcase as well: automated coverage did not catch either the historical horizontal
seam failure or the rejected necklace-of-rocks composition.

## Where to continue

For another climate, create the full knoll/ridge/massif/backbone/boundary vocabulary first, validate it in
the same eight-shape showcase, and only then make the compositor select that skin. Do not derive
variants by resizing a landmark. The detailed iteration history remains in `ASSETS_LOG.md` under
“Native PixelLab grassy mountains” and “Native PixelLab rocky mountains.”
