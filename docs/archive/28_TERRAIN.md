# Terrain System

Three layers, strictly separated in data and code:
1. **Gameplay terrain** — a small closed set of types with mechanical meaning (move cost, resonance, native faction, combat template). This is the only layer the rules engine ever sees.
2. **Skin** — a visual family chosen per map region for a gameplay type (mossy vs granite vs snowcapped Mountain). Zero mechanics. Authored.
3. **Decoration** — seeded micro-scatter within a skin (a flower, a butterfly, a leaning fencepost). Zero mechanics. Generated deterministically from the map seed at initialization; never stored per-save (regenerates identically).

Map data: each tile stores `{terrain, skin?}`; decorations are derived. The map editor (someday) may place any skin on any terrain and any terrain anywhere — defaults just fit, per HoMM tradition.

## Gameplay terrain catalog

| Terrain | Move cost | Native faction | Resonance | Notes |
|---|---|---|---|---|
| **Meadow** | 100 | Hearthguard | — | the host world's default; label "Grass" |
| **Deepwood** | 150 | Hagwood | Wild | replaces generic "forest" |
| **Mosswold** | 150 | Vespiary | — | the carpet-forest: Broad World cloth grown into landscape; essence-rich by authoring convention |
| **Ashsteppe** | 125 | Wildergrass | — | dry plains under old ash |
| **Barrowfield** | 125 | Unfinished | Grave | pale grass, standing stones, candle-mist; barrow objects usually sit on it (point-barrow tiles on other terrain remain legal and keep their resonance) |
| **Lacquer Flats** | 100 | Wound-Wrights | Craft | vast smooth stone with a regular grain, oddly glossy (author-side: floorboards; never stated) — replaces mine-tile resonance as Craft's terrain home; mine tiles keep Craft resonance too |
| **The Hush** | 150 | — | — | snow; no faction's home (the Quiet's country, canonically — a faction that doesn't exist yet) |
| **Mire** | 175 | — | — | marsh; `aquatic` units' heroes... see native rule below: armies containing ≥1 `aquatic` stack pay 125 |
| **Mountain** | impassable | — | — | skins: granite, snowcap, mossgrown, amber |
| **Water** | boat only | — | — | per 26 |

Overlays (stack on a terrain tile): **Road** (cost 65, any terrain), **Seam** (cost 100 flat for everyone; **battles fought on a seam tile are resonant in ALL FOUR schools** — seams are wild-magic ground, rare by authoring law, and this finally gives the seam a rule to go with its look), battle-only tiles (resin/thicket/walls) unchanged.

Rite's terrain home stays castles + the Wayside Shrine spell — every school now has ground: Wild/Deepwood, Grave/Barrowfield, Craft/Lacquer, Rite/consecrated.

## Native ground rules (movement-first, per design preference)

- **Adventure:** a hero pays flat **100** on their faction's native terrain, waiving its penalty (Hagwood in Deepwood, Vespiary in Mosswold, etc.). Nativity follows the *hero's* faction, not army composition.
- **Combat:** battles on a faction's native terrain: that faction's stacks get **+1 speed**. Both sides can qualify simultaneously (mirror matches on home ground).
- No attack/defense bonuses — movement and tempo only, deliberately: it's felt every turn and doesn't touch the damage math.
- Mire special case: armies containing at least one `aquatic` stack pay 125 instead of 175 (the Rusalka knows the ways).

## Combat battlefield derivation

The battle inherits the tile: **palette + obstacle prop set + special hexes + resonance banner**, all from one `battlefieldTemplate` per terrain:
- Meadow: hay bales, drystone stubs. · Deepwood: trunks, stumps (and Leshy makes more). · Mosswold: giant tufts, a half-buried thimble-sized... no — props stay mundane-first: woven ridges, "boulders" with suspicious regularity. · Ashsteppe: bone piles, dust devils (visual). · Barrowfield: standing stones, unlit candles (light when Grave spells resolve — pure presentation cue). · Lacquer Flats: **2-hex block obstacles** (the only terrain with wide props — big toys' shadows, never say so). · Hush: snowdrifts. · Mire: **2–3 water hexes** appear (aquatic +1 speed in them, land units +1 cost — reuses the sea-battlefield shallows rule from 26). · Sea: per 26.
- Obstacle count/placement still seeded per battle as today; only the prop catalog and specials change.

## Decoration system

- Per skin, a decoration catalog with weights: Meadow: flowers (3 kinds), butterfly, beehive, cart ruts. Deepwood: mushroom rings, deadfall. Ashsteppe: skulls, lone banners. Barrowfield: candles, unsent-letter stones. Mosswold: patterned "moss," one **rationed anomaly** entry (a ridge that is clearly, never-admittedly, a seam of stitching or the shadow of an enormous domestic object — max ONE anomaly decoration per map region, enforced by the generator, per Assimilation Law 4). Lacquer: grain-lines, paint flecks. Hush: fox tracks, frozen ponds.
- Generated at map init from the map seed: deterministic, not stored, respects a density constant. Decorations are inspectable (flavor labels — "A butterfly. It is having a better week than you.") but never interactive.

## Obstacle props (adventure map)

Point-impassables: gameplay-identical to Mountain, per-tile, with terrain-appropriate looks. They exist so map authors can shape chokepoints, funnel paths, and complete aggro cages without painting whole mountain ranges.

- **The authored/seeded boundary (binding):** obstacles are ALWAYS authored in map data; decorations are ALWAYS seeded and ALWAYS passable. Nothing generated at map init may block movement — pathing, aggro verification, and map-lint depend on it. Lint gains a check: no obstacle entry outside authored map data.
- Data: `{type: obstacle, prop, footprint?}` — default 1×1; 2×1 allowed for large props. Fog, aggro, and footprint rules per 24 apply.
- **Prop catalog by terrain** (skin layer; place-anywhere legal, defaults fit): Meadow — boulder, old oak, drystone cairn. Deepwood — deadfall, hollow trunk, standing stone. Mosswold — woven knoll, "the Spool" (2×1; a wound cylinder of hillside; say nothing). Ashsteppe — termite spire, burnt wagon, bone arch. Barrowfield — dolmen, toppled statue. Lacquer Flats — the Block (2×1, painted, weathered), a seam-nail (say nothing). Hush — ice shelf, frozen fountain. Mire — sinkhole, drowned fence. Universal — ruin fragment, menhir.
- Flavor labels per prop (one line each, register rules apply; anomalous props obey the one-per-region ration alongside decoration anomalies — the generator does not count these, the AUTHOR does; lint warns at >1 flagged-anomaly prop per 12×12 region).
- Battlefield prop catalogs (combat obstacles) already exist per template above; adventure props and battle props share art direction per terrain but are separate catalogs.

## Authoring & migration

- Border Marches: re-skin only — a Barrowfield patch around the existing barrows, roads per 25, one seam segment at the central gap. Crosstitch: full palette — each castle slot's quadrant leans its likely-faction's terrain? No — factions are player-chosen; instead give Crosstitch terrain variety on geographic logic (Hush north, Ashsteppe south, Mosswold around the center seam-crossing) and let nativity fall where it falls. Torn Sound: Mire on the marshy island fringes.
- Authoring guidance (goes in a MAPS.md for future maps): start zones SHOULD use varied neutral terrain rather than gifting anyone their native ground near home — native bonuses are for *expansion* choices ("push through their Deepwood or around it?"), not compounding start advantages. Lint: warn if >30% of tiles within 6 of a start position are any single faction's native terrain.
- Flavor labels for the new terrains (23 addendum): Mosswold — "The moss grows in a pattern. The pattern repeats." · Ashsteppe — "The grass grew back. The ash stayed underneath." · Barrowfield — "Quiet country. Well-tended." · Lacquer Flats — "Smooth stone, strange grain, and a shine no rain explains." · The Hush — "Snow that fell somewhere else, on somewhere else, and settled here." · Mire — "The ground is negotiable."

## Tests & acceptance

Move-cost matrix per faction×terrain (incl. aquatic-Mire and hero-faction nativity); seam all-school resonance; native +1 speed both-sides case; Mire water-hex battlefield; decoration determinism (same seed → identical scatter, save/load safe); lint start-zone warning on a fixture. Sim: league re-run zero crashes; movement-heavy AI paths still terminate. Human acceptance: chase a Hagwood hero into their own Deepwood and regret the terms; fight one battle on a seam and watch every spell come out oversized.
