# Native grassy mountain family — PixelLab prompt record

Generated on 2026-08-04 with the PixelLab HTTP API through `scripts/pixelgen`. These are native
production-canvas requests, not a concept sheet that is later cut up or scaled. The canonical,
literal request records—including every positive prompt, negative prompt, endpoint, size, seed,
guidance value, and init-image reference—are:

- `assets/jobs/mountain-grassy-native-ridges.json`
- `assets/jobs/mountain-grassy-native-family.json`

The two ridge probes were requested at 96×96. The family batch requested four 64×64 knolls, two
additional 96×96 ridges, and two 160×112 massifs. Every input guide was copied to the stable
`assets/guides/grassy-mountain-native-init/` directory before the live sprites changed.

## Prompt strategy

The useful prompt pattern asks for a single broad, connected green landform in a high oblique
top-down camera, with a wide irregular footprint, low self-terminating ends, visible upper planes,
dark green folds, and sparse warm stone ribs. It explicitly says “green first and stone second” and
excludes bare alpine peaks, snow, isolated rocks, scenery plates, buildings, and isometric diamonds.

Prompt-only Bitforge requests failed: they produced circular forest/garden islands rather than
mountains. Pixflux with a role-matched init image at the exact final dimensions and strength 210
preserved the required ridge geometry. `oblique_projection` was omitted after PixelLab correctly
rejected it as unsupported for that endpoint.

## Selection

| Production asset | PixelLab candidate |
| --- | --- |
| `mountain-granite-knoll-1.png` | family `knoll-1/candidate-1.png` |
| `mountain-granite-knoll-2.png` | family `knoll-2/candidate-1.png` |
| `mountain-granite-knoll-3.png` | family `knoll-3/candidate-2.png` |
| `mountain-granite-knoll-4.png` | family `knoll-4/candidate-2.png` |
| `mountain-granite-ridge-1.png` | probe-v2 `folded-ridge/candidate-1.png` |
| `mountain-granite-ridge-2.png` | probe-v2 `horseshoe-ridge/candidate-1.png` |
| `mountain-granite-ridge-3.png` | family `ridge-3/candidate-1.png` |
| `mountain-granite-ridge-4.png` | family `ridge-4/candidate-1.png` |
| `mountain-granite-massif-1.png` | family `massif-1/candidate-2.png` |
| `mountain-granite-massif-2.png` | family `massif-2/candidate-2.png` |

Knoll 4 candidate 1 and massif 1 candidate 1 were rejected for stray pixels. Knoll 2 candidate 2
was rejected after the production silhouette check measured excessive bilateral symmetry.

## Deterministic promotion

`scripts/promoteGrassyMountains` asserts the exact requested dimensions, hardens alpha, maps the
selected pixels through a fixed green/tan palette, removes detached generation specks, and
bottom-anchors without changing the canvas. It never resizes production art or draws an artificial
full-width base. Its audit image is
`.pixel-work/review/grassy-mountain-native-contact.png`.
