# Native rocky mountain family — PixelLab prompt record

Generated on 2026-08-05 with the PixelLab HTTP API through `scripts/pixelgen`. The ten production
assets were requested at their final native canvases: four 64×64 knolls, four 96×96 ridges, and two
160×112 massifs. No production image is resized. The literal prompts, negative prompts, endpoint,
size, seeds, guidance values, and init-image references are recorded in:

- `assets/jobs/mountain-rocky-native-family.json`

The supplied `h2-grass-mountains-Copy.png`, `docs/h2 adventure map.png`, and
`docs/homm2-mountains.jpg` were visual references for the connected-range grammar: broad overlapping
landforms, low self-terminating ends, irregular crowns, and visual overhang beyond obstacle cells.
PixelLab used the existing role-matched native guides under
`assets/guides/grassy-mountain-native-init/` as init images so each request preserved a useful
compositor role rather than drifting toward an isolated landmark peak.

## Prompt strategy

Every prompt asks for one connected, joinable range segment in a high-oblique top-down camera. The
family is stone-first: charcoal and slate-grey planes, warm-grey lower-right highlights, cool deep
crevices, and only sparse olive lichen. Negative prompts reject single centered peaks, isometric
diamonds, snow, grass-covered hills, trees, detached rocks, and rectangular scenery plates.

Pixflux at init strength 195 retained the required footprint roles while materially varying ridge
folds, crown positions, saddles, and ledges. Two candidates were generated independently for every
asset. The selected candidates are:

| Production asset | PixelLab candidate |
| --- | --- |
| `mountain-rocky-knoll-1.png` | `knoll-1/candidate-1.png` |
| `mountain-rocky-knoll-2.png` | `knoll-2/candidate-1.png` |
| `mountain-rocky-knoll-3.png` | `knoll-3/candidate-2.png` |
| `mountain-rocky-knoll-4.png` | `knoll-4/candidate-1.png` |
| `mountain-rocky-ridge-1.png` | `ridge-1/candidate-2.png` |
| `mountain-rocky-ridge-2.png` | `ridge-2/candidate-2.png` |
| `mountain-rocky-ridge-3.png` | `ridge-3/candidate-1.png` |
| `mountain-rocky-ridge-4.png` | `ridge-4/candidate-1.png` |
| `mountain-rocky-massif-1.png` | `massif-1/candidate-1.png` |
| `mountain-rocky-massif-2.png` | `massif-2/candidate-2.png` |

## Deterministic promotion

`scripts/promoteRockyMountains` verifies exact dimensions, hardens alpha, removes detached specks,
maps the selected pixels through a fixed slate/stone palette with sparse moss, and bottom-anchors
inside the unchanged canvas. It never crops or scales production art. Its inspection sheet is
`.pixel-work/review/rocky-mountain-native-contact.png`.
