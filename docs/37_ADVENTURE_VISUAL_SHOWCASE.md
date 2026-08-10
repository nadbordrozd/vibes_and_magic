# 37 — Adventure Visual Showcase

Status: implemented and verified on 2026-08-07. This is the continuation and acceptance note for
the standalone adventure-map visual fixture. It is a presentation-only companion to docs 31, 34,
35, and 36. Gameplay terrain, occupancy, interaction, map content, saves, and simulation remain
unchanged.

## Purpose and coverage

The fixture is an exhaustive, native-scale answer to two questions: whether every adventure-map
sprite is technically sound, and whether the full visual system remains legible when its parts are
composed together. It is reachable from the main menu or directly with
`?adventure-showcase=1`.

Coverage is derived from `assetWorklist()` and `ASSET_MANIFEST`, not maintained as a second manual
asset list. The accepted inventory is 316 unique entries:

| Category | Entries |
|---|---:|
| Terrain | 43 |
| Overlay | 13 |
| Decoration | 80 |
| Map object | 104 |
| Castle | 10 |
| Hero | 48 |
| Guardian unit | 18 |

`src/ui/adventureShowcase.ts` also derives all 19 terrain/skin pairs from `TERRAIN`, every
map-object presentation from authored maps (including the completed bridge state), and standard
and Manywhere decoration fields from the production decoration catalog. The interaction stress
surface contains every map object, castle, and guardian plus one south-facing hero per faction.
Its placement is deterministic and its ordinary decorations use the shipped derivation path.

The mountain fixture authors gameplay cells only. `deriveMountainRanges` chooses its 102 visible
pieces and exercises single cells, runs of 2/3/4/6/10, exposed boundaries, a corner and branch, a
deep mass with interior, unequal lobes joined by a bottleneck, a stair and hook, and a concave
crescent with narrow channels. Both the mountain fixture and the mixed interaction surface use
production painter ordering.

## Acceptance method

The browser audit runs at integer pixel scale 1 in a 1600×1000 desktop viewport and a 390×844
narrow viewport. It rejects:

- a missing or duplicate catalog card;
- a missing image, source dimension mismatch, non-native rendered dimension, or non-integer anchor;
- a regression in mountain or mixed-context painter order;
- any runtime canvas, page/console error, or horizontal page overflow.

The atlas shows each sprite on its declared footprint with renderer, footprint, and flag anchors.
Separate composed sections cover all terrain skins, topology-heavy mountains, both production
decoration densities, and the unlabelled interaction hierarchy. Narrow evidence keeps wide native
surfaces in explicit local scroll containers rather than shrinking their pixels.

## Visual finding and resolution

The first composed review objectively failed the interaction-hierarchy criterion. At the former
16% normal-map decoration density, repeated tall canopies, deadfalls, banners, candles, letter
stones, and frozen ponds competed with pickups and services as plausible interactables.

The fix is presentation-only: `DEFAULT_TERRAIN_DECORATION_DENSITY` is now 4%, while the existing
Manywhere density is named and retained as `LARGE_MAP_TERRAIN_DECORATION_DENSITY` at 1.5%. The
second capture leaves regional texture present while structures, guardians, and heroes own the
first read. No sprite failed dimensions, transparency, anchor, footprint, palette, or composed
legibility checks, so no PixelLab generation or replacement was performed. There is therefore no
new generation job, prompt, selection, provenance, or failed-batch reflection to record.

The atlas initially clipped the bottom of three-by-two castle presentations because its review
stage was too short. Increasing that fixture stage to 208 pixels exposed the full 96×128 sources,
96×64 ground contacts, entrances, renderer anchors, and flag anchors. This was fixture
infrastructure only; castle assets were not altered.

## Reproduction and evidence

Start Vite, then run the review against the chosen port:

```sh
npm run dev -- --host 127.0.0.1 --port 5190
BM_URL=http://127.0.0.1:5190/ npm run review:adventure-showcase
```

The review writes `.pixel-work/review/adventure-showcase/audit.json` plus desktop and narrow PNGs.
The most useful acceptance captures are:

- `03-mountains-desktop.png` — topology and production mountain composition;
- `04-decorations-desktop.png` — standard 4% and Manywhere 1.5% fields;
- `05-interaction-hierarchy-desktop.png` — unlabelled first-read stress surface;
- `10-atlas-castle-desktop.png` — complete footprints, entrances, and anchors;
- `17-interaction-hierarchy-narrow.png` — narrow-layout and native-scroll behavior;
- `18-atlas-map-object-narrow.png` — narrow native-scale object audit.

After changing adventure sprites or composition, run:

```sh
npm run assets-check
npm run pixel-jobs-check
npm run homm2-assets-check
npm run map-lint
npm run spec-link-check
npm run ux-check
npx vitest run src/core/__tests__/adventure-showcase.test.ts \
  src/core/__tests__/terrain-discovery.test.ts \
  src/core/__tests__/forest-experiment.test.ts
npm run build
npm run smoke
npm run review:terrain-showcase
npm run review:mountain-showcase
npm run review:mountain
npm run review:adventure-showcase
```

The source-level tests pin exact category counts, catalog-derived terrain skins and object variants,
deterministic density coverage, named mountain topologies and cell coverage, and the complete
interaction inventory. `assets-check` remains authoritative for the broader manifest/worklist,
alpha, native dimensions, anchors, flags, obstacle palette, and geometry contracts.
