# 40 — The Crooked Crown Dense Adventure Map

Status: implemented and verified on 2026-08-09. This work order adds a normal selectable four-player
conquest map and the automated density/topology profile required to keep its 72×72 area meaningful.

## Reference boundary

The broad structural reference is the Country Lords full-map overview at
<https://vgmaps.de/maps/view?m=26522>. It informed region scale and the idea of obstacle-defined
travel. The implementation does not copy its art, text, palette, exact object placement, or route
geometry. The Crooked Crown uses the game's own setting, catalogs, terrain, objects, and rendering.

## Authored topology

The map is exactly 72×72. Four distinct corner chambers contain selectable player castles and open
into different horizontal and vertical routes. Twelve irregular chambers form a three-by-four
regional grid. Narrow dogleg corridors, wider contested passages, four oblique links, perimeter
loops, a central circuit, and nine blind reward pockets create alternate routes and chokepoints.
Mountain masses define the labyrinth; six enclosed ponds, regional deep forests, native terrain
families, roads, and sparse authored landmarks give each region a distinct silhouette.

Each start has an unguarded mine, a 1,200-gold pile, a second resource pile, an adventure item, and
two verified routes to different adjacent regions. Six named central-route guardians serve as
intended gates without sealing content because the loop network retains alternate connections.

## Content and measured density

Seed 4040 and seed 1 share topology and counts; the seed only controls normal seeded offers and one
service stock choice.

| Measure | Accepted value | Gate |
|---|---:|---:|
| Map dimensions | 72×72 | exactly 72×72 |
| Passable tiles | 1,718 | informational |
| Mountain tiles | 3,256 | informational |
| Water tiles | 210 | informational |
| Deepwood/Mosswold tiles | 358 | informational |
| Interactive objects | 109 | at least 100 |
| Guardians | 20 | all linked |
| Authored landmarks | 12 | at least 12 |
| Road tiles | 575 | at least 450 |
| Interactions/passable tile | 6.34% | at least 5% |
| Shaped/decorative terrain ratio | 74.0% | at least 68% |
| Largest open passable square | 9×9 | at most 10×10 |

Against the two previous largest ordinary render surfaces, Manywhere has 75 interactions (4.94%
of passable tiles), 40.5% shaped/decorative terrain, and a 15×15 open square; Grand Muster has 71
(3.00%), 17.0%, and 27×27. The Crooked Crown is therefore both more populated and much more tightly
shaped at comparable or greater scale.

The 109 interactions include 24 resource piles; 12 mines, dwellings, shrines, items, and guarded
reward sites apiece; nine pocket chests; and recurring waystations, warm tables, hedge schools,
wishing wells, a mercenary camp, wagon, omen stone, and reliquary cairn. Four player castles are
created by the canonical setup path, bringing active strategic structures to 113 before guardians
and landmarks.

## Calibrated guardian progression

Every authored count calls doc 39's centralized `unitStrength` and divides a named target rating by
the selected unit rating. The twenty normal-difficulty armies span 89.00–350.79 with a 178.01 median.
Twelve guard the optional artifact/recruit reward sites; eight guard non-start mines. The usual
difficulty multiplier applies later in canonical game setup. This keeps map progression on the same
rating consumed by strategic AI, Diplomacy, artifacts, skills, Sirens, and bargains.

## Integration and replay contract

`crooked-crown` is a canonical `MapId` wired through game setup, four-player controller/faction
selection, campaign presentation, AI simulation, save validation, content hashing, replay
reconstruction, asset worklist derivation, deterministic decorations, minimap, camera, and SVG
rendering. The focused test drives one real strategic-AI turn and reconstructs its canonical
five-field action save to the same state hash.

## Automated acceptance

General lint continues to own bounds, footprints, overlaps, terrain legality, entrances, linked
guardian efficacy, start aggro, and reachability from every start. The Crooked Crown profile adds:

- exact 72×72 dimensions;
- two divergent regional routes and two opening pickups per start;
- all twelve reward sites guarded and all six named gates linked;
- object, landmark, road, and shaped-terrain density floors;
- a 10×10 maximum unbroken passable square.

The dedicated Puppeteer review loads the canonical local save path in the real client, asserts the
campaign selector and 2,304×2,304 SVG, rejects runtime canvas, checks dense DOM coverage, and writes:

- `.pixel-work/review/crooked-crown/01-full-map-72x72.png`;
- `.pixel-work/review/crooked-crown/02-northwest-opening.png`;
- `.pixel-work/review/crooked-crown/03-central-contested-circuit.png`;
- `.pixel-work/review/crooked-crown/04-southeast-start-and-gates.png`.

Reproduce with Vite running on the selected port:

```sh
npm run dev -- --host 127.0.0.1 --port 5190
BM_URL=http://127.0.0.1:5190/ npm run review:crooked-crown
```

Required verification is `npm run map-lint`, the focused Crooked Crown test, relevant persistence,
AI, terrain/minimap tests, `npm run smoke`, `npm run build`, the full `npm test`, the browser review,
and `git diff --check`. The known deferred xm5.1 seed-1 AI-termination failure remains outside this
map work and must be reported exactly if it is still the only full-suite failure.
