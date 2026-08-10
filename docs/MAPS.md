# Map authoring guide

Maps store gameplay tiles as `{ terrain, skin? }`. The terrain is the only part read by rules;
skins are authored presentation, and decorations are derived deterministically from the map seed.
Never commit generated decorations to a map or save.

Skins are legal only for the terrain families listed in the executable terrain catalog. A visual
family may be deliberately shared: `coastal` is valid for Meadow, Mire, and Water, and Torn Sound
uses that continuity to carry its salt-faded shoreline look across distinct gameplay terrain.

The in-game editor, local maps, built-in clones, and newly promoted built-ins share the versioned
portable authoring contract in [`50_MAP_EDITOR.md`](50_MAP_EDITOR.md). An editor export is promoted
as validated JSON through the built-in manifest; do not manually reconstruct its terrain, starts,
entities, guardians, or rewards in a TypeScript factory. Existing hand-authored maps remain inputs to
the built-in-to-portable clone adapter until they are migrated.

Promote an editor export with `npm run promote-map -- path/to/map.vam-map.json`, then verify the
checked registration with the same command plus `--check`. The adapter rejects noncanonical bytes,
catalog incompatibility, validation/lint errors, and duplicate IDs; it copies the JSON unchanged and
generates only the authored-registry import/entry. See the exact workflow in
[`50_MAP_EDITOR.md`](50_MAP_EDITOR.md#exact-promotion-workflow).

Run `npm run review:map-editor` against the local Vite app for the repeatable desktop/390 px
authoring journey, exact local-revision export, and isolated promotion-readiness check. Its evidence
is written only to `.pixel-work/review/map-editor/`; the exercised interaction and performance
coverage is listed in [`50_MAP_EDITOR.md`](50_MAP_EDITOR.md#reproducible-acceptance-review).

## Starts and terrain

Start zones should mix neutral terrain instead of gifting a faction its native ground. Native
movement and battle tempo are intended to shape expansion routes, not compound opening advantage.
Map lint warns when more than 30% of tiles within six spaces of a start share one faction's native
terrain.

Roads and seams are overlays. Roads cost 65 movement on any passable terrain. Seams cost a flat
100 and make battles resonant in all four schools; keep them rare enough to remain meaningful.

## Obstacles and decoration

Anything that blocks adventure movement must be an authored `obstacle` object. Use
`{ kind: 'obstacle', prop, footprint? }`; the default footprint is 1x1 and large props may use
2x1. Generated decorations are always cosmetic, passable, and absent from saved state.

Obstacle props should fit their local terrain, though place-anywhere authoring remains legal.
Anomalous props use `anomaly: true`; author at most one anomalous prop in each 12x12 region. The
decoration generator independently enforces that same regional ration for generated anomalies.

## Footprints and guarded sites

Object positions are top-left footprint anchors. Author a valid entrance inside every footprint;
obstacles have no usable entrance. Guardians are independent objects linked with `protects` and
`guardedBy`, never embedded reward data. Run `npm run map-lint` after every map edit to check
bounds, collisions, reachability, guard coverage, Manywhere registry coverage, and Cache links.

Cities always occupy exact 5×2 ground contact with centered bottom entrance `(2,1)`; maps cannot
override either value. A neutral city must declare a faction. Omit its `garrison` to derive exactly
three weeks of that faction's base tier-1, tier-2, and tier-3 growth; write `garrison: []` for an
intentional free capture; or write a complete nonempty legal army to replace the default. Never use
`null`, random-tier placeholders, or an additive/partial override. See
[`51_CITY_SPELLBOOK_SPRITES.md`](51_CITY_SPELLBOOK_SPRITES.md).

## Cache marks

A map may author one hidden Cache at a passable secret tile and three to six Patient Stones linked
by `cacheId`. The Cache tile never blocks movement or triggers an ordinary visit. Digging is a
separate full-movement action, including a wrong guess.

## Fixed showcase starts

Ordinary maps derive one starting city and hero per active player. A showcase may instead declare
a fixed setup in `createGame` when the setup itself is the subject under review. The Grand Muster is
the current example: six mixed-faction cities and six full-roster heroes belong to one human while
the remote opponent uses the existing Dormant controller. The authored map still owns terrain,
roads, guardian targets, resources, and structures, and must pass the same footprint/reachability
lint as every ordinary scenario.

The Sixfold Trial is the advanced-combat counterpart and uses six actual configurable player slots,
not one player's allied cities. `SIXFOLD_PLAYER_SETUP` owns the six distinct default factions,
starts, representative advanced heroes, and skill packages. City buildings, two-week armies, and
complete two-school spellbooks derive from canonical catalogs during setup. Its lint profile pins
start exits, reward/guardian totals, and calibrated strength-band coverage.

## Dense labyrinth scenarios

Large maps must earn their dimensions through route structure rather than open travel time. Use
shaped chambers, narrow corridors, loops, alternate connections, guarded shortcuts, and optional
spurs. Every start needs local unguarded income plus at least two routes toward different regions.
Measure the result: exact dimensions, interactive objects per passable tile, authored/decorative
terrain ratio, road coverage, largest unbroken passable square, start-route divergence, intended
gates, and reward guardian coverage belong in map lint.

The Crooked Crown is the reference implementation. Its guardians convert authored progression
targets into stack counts through the centralized calibrated `unitStrength` rating; maps must not
reintroduce HP × damage or another local strength heuristic.
