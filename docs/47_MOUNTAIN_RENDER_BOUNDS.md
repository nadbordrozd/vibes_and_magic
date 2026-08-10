# 47 — Mountain Render Bounds and Crooked Crown Culling

Status: implemented and verified on 2026-08-10. This is a presentation correction to work orders
35, 37, and 40. Gameplay terrain, authored collision, routes, saves, replay authority, and all
native mountain PNGs remain unchanged.

## Report and diagnosis

On The Crooked Crown, the legal 54-tile route from the north-west start at `(9,9)` to the
south-west start at `(9,62)` appeared to cross mountain art. The old compositor aligned a role
sprite's left anchor to the first contact regardless of the declared contact width. A 192px
six-cell boundary used for a four- or five-cell contact therefore painted one or two passable cells
to its right; a 96px ridge used on a one-cell vertical spine painted two passable cells to its
right. The exact route had 22 same-row false visual occupations, including `(9,15)`–`(9,21)`,
`(7,28)`–`(7,32)`, and `(8,49)`–`(8,56)`. Across the complete map, 302 of 842 compositions exceeded
their declared horizontal contact. Their southern alignment was already correct.

The bare-Grass Mountain report had a separate visibility cause. `AdventureMap` mounted a composed
range only when every horizontal contact was explored. At a fog boundary, an already explored
Mountain contact could therefore retain the Grass underlay while another contact belonging to the
same range remained unseen. The representative mid-south regression is the six-cell composition
anchored at `(38,48)`.

## Executable rendering contract

`mountainRangeGeometry` is the shared production and test authority for each composed piece:

- the authored contact is `contactWidth × 1` cells and remains the only blocking footprint;
- the selected PNG is rendered at native resolution, never stretched or resampled;
- when the role PNG is wider than its contact, a centered native-pixel slice is exposed;
- an SVG clip admits no pixel left or right of the contact and none below its southern edge;
- the complete native northern overhang remains legal and may partly obscure the tile above;
- viewport culling intersects the clipped visual rectangle, including its northern overhang,
  rather than testing only the anchor or requiring the complete footprint inside the viewport;
- one explored contact is sufficient to mount a range, while a late opaque fog layer covers every
  unseen cell after all world sprites, preventing the partial mount from revealing unseen terrain.

The geometry applies without coordinate exceptions to knolls, ridges, massifs, backbones, and
boundary variants. The existing PixelLab PNGs, dimensions, deterministic variant selection,
topology compositor, and painter order are retained.

## Acceptance and browser evidence

Focused tests cover representative one-tile, ridge, massif, and backbone geometry; left/right/down
prohibition; allowed northward overhang; native dimensions; partially intersecting viewports at all
edges; partial fog visibility; the exact Crooked Crown west route; and the `(38,48)` mid-south
composition. The dedicated browser review asserts that each visible clip equals its declared
visual rectangle, every contact is authored Mountain, full-map coverage is complete, viewport DOM
contents exactly match visual-rectangle intersections, and late fog follows a partially mounted
range.

Run:

```sh
npm run map-lint
npx vitest run src/core/__tests__/mountain-ranges.test.ts \
  src/core/__tests__/crooked-crown.test.ts
npm run build
npm run smoke
npm run review:mountain-showcase
npm run review:mountain
npm run review:crooked-crown
```

The Crooked Crown review writes full-map, three west-route, mid-south, north/west/south edge-clipped,
and partial-fog captures under `.pixel-work/review/crooked-crown/`. Chromium omits external SVG
image layers when all 842 pieces are forced through one monolithic screenshot, so the trustworthy
full map is assembled from nine exact 768×768 production-culling viewport captures as unscaled HTML
images. No runtime canvas, raster resampling, or culling bypass is used. No art generation,
promotion, post-processing, or manifest replacement was needed, so there is no new PixelLab job or
provenance record.
