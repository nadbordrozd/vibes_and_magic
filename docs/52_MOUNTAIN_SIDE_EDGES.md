# 52 — Native Mountain Side Edges

Status: implemented and verified on 2026-08-11. This presentation correction partially supersedes
docs 35, 37, and 47 where they select a wider bitmap and expose a centered horizontal slice.
Authored mountain terrain, blocking cells, routes, collision, saves, replay, and deterministic map
semantics do not change.

## Native-size audit

The published rocky PNGs generally terminate naturally before their native left and right canvas
edges, retain valid bottom contact, and are not source-cropped. The visible straight walls came
from doc 47's renderer geometry: a 64px knoll, 96px ridge, or 192px backbone was centered behind a
32–160px contact viewport. Every representative internal boundary intersected opaque rock:

- one-cell knoll slices cut opaque columns 10–20px tall;
- one- and two-cell ridge slices cut opaque columns 19–46px tall;
- four- and five-cell backbone slices cut opaque columns 22–60px tall.

The failure therefore combined alpha/canvas-safe source art with unsafe renderer clipping,
topology selection that assigned wide art to narrow contacts, and a missing exact-width vocabulary.
It was not caused by anchors, southern overhang, authored terrain skins, adjacency metadata, or
map collision. The old standalone and Adventure Visual Showcase proofs rendered complete images
and bypassed production clipping, so they could not expose the defect.

## Executable topology contract

`deriveMountainRanges` and `mountainRangeGeometry` are the shared authority for production,
showcase, tests, and browser review:

- a one-cell contact selects a complete native 32×96 rocky column;
- a vertically joined two-cell contact selects a complete native 64×96 rocky shoulder, while an
  isolated two-cell run retains a complete native knoll;
- a three-cell contact selects a complete native 96×96 ridge;
- four- and five-cell runs overlap complete two- and three-cell landforms;
- runs of six or more overlap complete 192×128 six-cell boundary/backbone landforms and finish
  with complete two- or three-cell tails;
- every selected bitmap width must equal `contactWidth × 32`; geometry and the all-built-in asset
  gate reject a mismatch before render;
- the existing SVG viewport may still enforce the legal southern footprint edge and northern
  overhang, but its horizontal bounds equal the complete image exactly and never cross mountain
  pixels;
- gameplay occupancy remains the authored terrain cells, independent from visual overlap.

The Adventure Visual Showcase and native mountain showcase call the same geometry path, so review
cannot silently bypass a production horizontal crop.

## Art, provenance, and review

Eight selected built-in sources add four rocky columns and four rocky shoulders. Each request was a
distinct call with a flat `#ff00ff` background and the established storybook pixel, camera,
palette, and south-east-light contract. Deterministic local promotion uses the installed chroma
helper, one LANCZOS fit, hard alpha, a fixed rocky palette, largest-component cleanup, side-margin
validation, and bottom anchoring. Exact prompts and hashes live in
`assets/jobs/mountain-edge-repair-built-in.json` and
`assets/provenance/mountain-edge-repair.json`.

The first `rocky-column-3` passed alpha/edge checks but was rejected after real-map review because
its repeated diagonal bands read as a corkscrew. A ninth, corrective edit call produced the
selected broken-crag replacement. The original keyed, transparent, and native-baked review files,
prompt, hashes, and rejection reason are retained under
`assets/sources/mountain-edge-repair/rejected/`.

Native contact evidence is `.pixel-work/review/mountain-edge-repair-native-contact.png`. Real
Crooked Crown production evidence at desktop and narrow widths is under
`.pixel-work/review/mountain-edge-repair-maps/`. The browser review fails if a mounted image and its
horizontal viewport differ. Static regression derives every built-in placement and fails if its
native bitmap width differs from its contact width.

## Acceptance commands

```sh
./scripts/promoteMountainEdgeRepair
npm run assets-check
npm run pixel-jobs-check
npm run homm2-assets-check
npm run map-lint
npm run spec-link-check
npm run ux-check
npx vitest run src/core/__tests__/mountain-ranges.test.ts \
  src/core/__tests__/adventure-showcase.test.ts src/core/__tests__/asset-manifest.test.ts
npm run build
BM_URL=http://127.0.0.1:5173/ npm run review:mountain -- crooked-crown 1 1440
BM_URL=http://127.0.0.1:5173/ npm run review:mountain -- crooked-crown 1 390
```
