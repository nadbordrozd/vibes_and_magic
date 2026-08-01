# Map authoring guide

Maps store gameplay tiles as `{ terrain, skin? }`. The terrain is the only part read by rules;
skins are authored presentation, and decorations are derived deterministically from the map seed.
Never commit generated decorations to a map or save.

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

## Cache marks

A map may author one hidden Cache at a passable secret tile and three to six Patient Stones linked
by `cacheId`. The Cache tile never blocks movement or triggers an ordinary visit. Digging is a
separate full-movement action, including a wrong guess.
