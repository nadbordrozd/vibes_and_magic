# Connected rocky mountain backbones

## Goal

Replace the rejected necklace of self-terminating 2×1 formations with a small vocabulary whose
staple is one continuous mountain spine. The existing rocky knolls, ridges, and massifs remain as
short-run and edge/detail pieces.

## Camera and light contract

- Native resolution only; production backbones are 192×128 and are never resized.
- Camera south of the obstacle, looking north from roughly 45 degrees above the terrain.
- Broad southern faces and partial east/west planes are visible; northern slopes remain hidden.
- Sunlight comes from southeast/map lower-right. Southeast and right-facing planes are bright;
  western and left-facing slopes are cool shadow; cast shadows fall northwest/upper-left.
- One uninterrupted geological mass: unequal peaks joined by saddles, diagonal ridges, foothills,
  and a broad foreground wall. No transparent or grassy channel may split the interior.

The literal PixelLab prompts and parameters are stored in
`assets/jobs/mountain-rocky-connected-backbones.json` and
`assets/jobs/mountain-rocky-backbone-variety.json`.

## Pipeline and selections

1. `scripts/buildRockyBackboneGuide.py` overlaps approved rocky sprites at their unchanged native
   pixels to create four transparent 192×128 composition guides.
2. `scripts/pixelgen assets/jobs/mountain-rocky-connected-backbones.json --only
   decoration:mountain:rocky-backbone-compact` asks PixelLab Pixflux to fuse that silhouette into
   continuous geology at the exact final size.
3. The compact request supplies backbones 1–2. Variety-B candidates 1–3 supply 3–5; variety-C
   candidate 2 supplies 6; variety-D candidates 1–2 supply 7–8. The volcano-like variety-C
   candidate 1 and detached-snow candidate 3 are rejected; variety-D candidate 3 is redundant.
4. `scripts/promoteRockyBackbones.py` hardens alpha, removes detached specks, applies the rocky
   palette, and writes both a full interior form and a matching terrain-facing boundary form for
   each selected PixelLab source. Boundary forms are not resized: pixels are removed to create
   low tapered side shoulders and an irregular bottom with only three small baseline contacts.
5. `deriveMountainRanges` overlaps successive six-tile backbones by two contact cells. Tall ridge
   pieces handle one- and two-cell horizontal slices that continue north/south; shallow knolls are
   reserved for genuinely isolated short ledges.

## Boundary contract

- Full `backbone` sprites may reach the canvas sides and bottom, but only when another mountain
  row or overlapping spine hides those boundaries.
- Matching `boundary` sprites are mandatory where a segment meets flat terrain at its left, right,
  or southern edge.
- A boundary must have no opaque pixels in either canvas side column and no more than 25% of its
  bottom row opaque. The remaining bottom contacts must be separated, not one straight baseline.
- Side visibility tapers from a low shoulder to full mountain height over roughly one 32px tile.
  A narrow transparent margin alone is invalid because it merely moves the vertical cut inward.

## Rejected probe

The prompt-only 256×160 probe produced attractive connected geology but baked a full opaque scene
background. Init-guided 256×160 retries had the same failure. The final 192×128 init-guided request
preserved transparency and the desired oblique structure, so no background-removal or downscaling
was needed.

## Proof

`npm run review:mountain-showcase` writes
`.pixel-work/review/rocky-mountain-shape-showcase-native.png`. The fixture supplies only terrain
masks and calls the production compositor; it never chooses individual sprites. The current proof
uses 74 placements and 17 variants from the expanded interior/boundary vocabulary.
