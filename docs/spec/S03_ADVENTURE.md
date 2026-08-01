# Adventure Map Rules

## Time, turns, and loss

Players take turns. Seven days make a week. Heroes receive daily movement; owned income pays daily;
dwellings replenish at each week start; each town may construct one building per day. At a new week,
resolve moving/creative objects, omen transition and announcement, week-start Debts, dwelling growth,
guardian growth, Tavern refresh, market stock, Provisioner items, then Founder's Vault production.
Resolve ordinary day-start Debts afterward. This order is deterministic and portable.

Conquest eliminates a player who has no hero and no castle, or who remains castleless for seven
days. A map may replace or supplement the objective as described below. A dormant player is never
an economic actor: it does not move, build, recruit, hire, or collect income; its garrisoned heroes
still defend with the normal combat AI.

## Movement and exploration

Heroes have daily movement points. Entering a tile pays its terrain/overlay cost; diagonal movement
uses the normal diagonal surcharge unless a rule removes it. Paths, costs, boat state, pickups,
visits, and transfers are core actions. Explored fog persists per player; visibility derives from
heroes, owned castles, skills, artifacts, and explicit reveal effects.

The adventure map uses eight-direction movement and adjacency except guardian aggro, which is the
explicit orthogonal exception. A hero may occupy only a legal entrance/empty tile. Heroes meet in
battle; friendly heroes may exchange army stacks and items only while adjacent or co-located by a
legal service. A hero has seven army slots, and same-unit stacks merge when a destination permits.

## Terrain: three strictly separate layers

1. **Gameplay terrain** is a closed rules-facing type with move cost, native faction, resonance,
   and battlefield template.
2. **Skin** is an authored visual family for a gameplay terrain. It has no mechanics.
3. **Decoration** is deterministic seeded micro-scatter within a skin. It has no mechanics, is
   always passable, is never stored in a save, and regenerates identically.

Each authored tile stores `{terrain, skin?}`. Only the gameplay terrain reaches the rules engine.
The catalog and current defaults live in
[`../../src/content/terrain.ts`](../../src/content/terrain.ts) and movement constants in
[`../../src/content/constants.ts`](../../src/content/constants.ts).

Gameplay terrains are Meadow, Deepwood, Mosswold, Ashsteppe, Barrowfield, Lacquer Flats, The Hush,
Mire, Mountain, and Water. Mountain is impassable. Water requires a boat. Road and Seam are overlays:
Road sets cost to 65; Seam sets cost to 100 and battles on it are resonant in all four schools.

A hero pays 100 on their own faction’s native terrain, based on hero faction rather than army
composition. In combat on native ground, qualifying faction stacks gain +1 speed; both sides can
qualify. An army containing an aquatic stack pays 125 rather than 175 in Mire. No native-ground
attack or defense bonus exists.

Battlefield palette, obstacle catalog, special hexes, and resonance derive from the entered tile’s
template. Mire produces 2–3 shallow hexes; sea uses its fixed deck/shallows template. Obstacle
placement remains seeded per battle.

## Authored/seeded boundary

**Anything that blocks adventure movement is always authored in map data. Decorations are always
seeded and always passable. Nothing generated at map initialization may block movement.** This is
binding because pathing, guardian verification, replay, and map lint depend on it.

Adventure obstacle objects are point-impassables with `{kind: obstacle, prop, footprint?}`. Their
appearance may follow local skin but placement legality is independent. A flagged anomaly prop is
rationed by authors to at most one per 12×12 region; generated decoration anomalies have their own
independent one-per-region limit. Authoring guidance is in [`../MAPS.md`](../MAPS.md).

## Occupancy, footprints, and entrances

Nothing overlaps. Every hero, guardian, pickup, building, mine, castle, dwelling, shrine, and site
occupies its own footprint. Guardians stand next to the thing they protect. Object coordinates are
top-left anchors. Footprint and entrance semantics are defined in [`S02_ENGINE.md`](S02_ENGINE.md).

Moving onto an entrance captures or visits mines, dwellings, shrines, sites, and castles. A defended
castle begins a garrison battle. Fog reveal distance is measured from footprint edges. Non-entrance
cells of a footprint are impassable.

## Guardian aggro

The current setting is **4-way orthogonal adjacency**, controlled only by `AGGRO_ADJACENCY = 4` in
[`../../src/content/constants.ts`](../../src/content/constants.ts). Eight-way adjacency is a logged
playtest option and must remain a one-line switch; it is not the current rule.

- Entering an aggro tile stops movement on that tile and starts combat immediately. A victory keeps
  the hero’s remaining movement.
- Deliberately pathing onto the guardian’s tile starts combat from the hero’s current position; a
  victory removes the guardian and completes the move onto its tile.
- If several zones cover the entered tile, fight only the nearest guardian by path distance; ties
  use lowest object ID. Surviving zones remain active for later entries.
- Guardians never move to initiate combat. Only tile entry triggers aggro; standing outside a zone
  is safe.
- Aggro and footprints work identically on water.
- Pathfinding treats aggro as blocked unless its current objective is that guardian and the power
  check accepts the fight.

Hover/inspection shades a guardian’s zone. A path segment crossing it is marked as a fight at the
trigger tile before confirmation.

## Ranged pickup

Resource piles, items, and chests may be collected from any of the eight adjacent tiles by clicking
the object. This costs 100 movement and does not move the hero. Entering the object tile also works,
pays normal movement, auto-collects, and ends there. Forager extends click range to 2 at rank 2 and
3 at rank 3.

Ranged pickup does not test aggro because no tile is entered. A badly placed guard can therefore be
looted around; this is intentional and map lint rejects a site marked guarded unless every legal
entry or pickup position is impassable or covered.

## Guardians and authored encounters

At each week start, non-static neutral stacks grow by `floor(10%)`, minimum +1, capped at five times
their original count. Puzzle locks, authored bosses, Kit guards, and any object marked `static` do
not grow. Scouting and display bands update from the grown state. Neutral armies have no hero,
cannot cast, and never retreat.

Puzzle locks are authored fights with a legible tell and a discoverable lever, designed to resist
brute force and pay a disproportionate reward. Guardian data, reward data, and sites remain separate
even when an encounter supplies both.

## Object taxonomy

The registry in [`../../src/content/mapObjectRegistry.ts`](../../src/content/mapObjectRegistry.ts)
is the source of object kinds. Behavior falls into these stable shapes:

- recurring captures: mines, Watermill, Windmill, Trading Camp, Lighthouse;
- pickups: resources, items, chests, sea Flotsam/Casks/Castaways/Bottles;
- learning and improvement: shrines, Hedge School, permanent-stat sites, Hut on the Hill;
- recruiting: faction/neutral dwellings, Mercenary Camp, Chrysalis Pool;
- weekly visits: Storyteller’s Fire, Warm Table, Cold Spring, idols, Wishing Well;
- guarded reward sites and locks: barrows, shipwrecks, creature sites, Sleeper, Mirror-Bound;
- markets/exchanges: Marketplace, Tinker Cart, Wagon Camp, Gloaming Ring, Reliquary Cairn;
- information: Omen Stone, Patient Stones/Cache sketch, rumors, map-reveal sites;
- topology: gates, Half-Built Bridge, Deep Tunnels, Whirlpool pair, boats, moving sites;
- unique provenance: Unstruck Bell, Gloaming/Masque sites, seams, Drowned Bell;
- victory objects and the four visible Tailor’s Kit locks.

Visits are per hero or per player exactly as the catalog action specifies. The inspection journal is
per player and keyed by object kind. A moving object follows an authored, seeded route and remains
fully replayable.

The Cache system authors one hidden Cache and 3–6 linked Patient Stones. Each visited stone reveals
one sketch fragment to that hero; equipped Moth-Eaten Map contributes a virtual fragment. Digging
at any tile spends the hero’s full remaining movement. A wrong tile yields nothing and a log line;
the exact Cache tile yields its authored reward.

## Weekly omens

An omen is seeded per week, pre-rolled, announced to all players on day 1, and visible in the log and
status UI. Quiet Week is the common result; named weeks hook Burn magnitude, universal Grave
resonance, growth, shots/resonance suppression, terrain costs, or round meter. Current weights and
effects live in [`../../src/content/omens.ts`](../../src/content/omens.ts). Omen forecasting and
Fickle Weather operate on the dedicated omen stream, not campaign RNG.

## Town ownership and neutral towns

A neutral town has an authored faction, garrison, optional prebuilt buildings, and optional vault.
Defeat its garrison through the entrance to capture it, then build and recruit normally. Diplomacy
stand-aside never applies to a garrison. A neutral town does not build, recruit, collect, or grow its
garrison before capture. AI values it as a conquest target using the same power check as other
guarded objectives.

Free Town, Old Seat, and Hollow Town are authoring presets, not separate rule engines. The Hollow
Town may be empty and mechanically free. Mixed-faction army meter rules still apply after recruiting
from a captured town of another faction.

## Victory and defeat

Map data supplies a visible in-world objective plus plain mechanics. Supported victory types are:
`conquest` (default), `hold {objectId, days}`, `assemble {setId}`, `slay {objectId}`, and `none`.
Optional defeat conditions mirror map-authored needs and override victory when simultaneous. AI
plans conquest and only contests other objectives opportunistically.

`none` is a sandbox: play continues until the human invokes Retire, which ends at the normal
statistics screen. The Tailor’s Kit is not inherently a victory condition; only an `assemble` map
makes it one.

## Boats and water

An empty boat is a stealable 1×1 object. A hero enters it to embark the whole army for 300 movement;
moving from boat to adjacent land disembarks for 300. The boat moves with the hero at sea and remains
on the last water tile after disembarkation. Sea tiles cost 65. Ranged pickup and aggro are unchanged
at sea.

A Shipyard is available only in a coastal castle, defined by water within three tiles of its
footprint. It builds a boat on a legal adjacent water tile for its catalog cost. Summon Skiff creates
a boat at the nearest shore; its + face teleports the nearest existing boat instead.

Whirlpools are authored pairs. Entering one exits at the other and removes 25% of the weakest stack,
minimum one unit, deterministically. Siren Rocks prompt listen/fight or row past/pay movement. Mixed-
domain pathfinding models embark state and transfer costs, remembers reusable boats, and may price
the known Whirlpool loss. A castle assault from water requires disembarkation; cross-shore hero
battles otherwise use the standard land battlefield.
