# Milestone: Map Occupancy & Big Things

Two related mechanics changes: (1) HoMM-style separation of guardians, treasures, and buildings on the adventure map, with guardian aggro zones; (2) multi-tile map objects and multi-hex battlefield creatures. Judgment calls → DECISIONS.md; do not ask.

## Part 1 — Adventure map occupancy & guardians

### Occupancy rules
- **Nothing overlaps.** Every object (hero, guardian, resource pile, item, mine, castle, dwelling, shrine, chest, etc.) occupies its own tile(s). Remove the current guardian-on-top-of-reward model entirely.
- Guardians are placed **next to** what they guard, not on it.

### Guardian aggro
- A guardian projects an **aggro zone: the 4 orthogonally adjacent tiles** (constant `AGGRO_ADJACENCY = 4` in constants.ts — HoMM3 uses 8 including diagonals; we start at 4 per design decision; make flipping to 8 a one-line change and note it as a playtest question).
- A hero **entering any aggro tile** immediately: movement stops on that tile, combat with that guardian begins. Remaining move points are kept if the hero wins.
- A hero may attack a guardian deliberately by pathing onto the guardian's own tile (combat resolves at the hero's current position; on victory the guardian is removed and the move completes onto its tile).
- Overlapping aggro zones: entering a tile covered by multiple guardians triggers ONE battle — the nearest guardian by path distance (tie: lowest object id). Other guardians' zones still apply to subsequent movement.
- Aggro is passive: guardians never move, and nothing except tile-entry triggers them. Standing outside the zone is always safe.

### Capturing and visiting
- Mines, dwellings, shrines, and all visitable buildings are captured/visited by **moving onto them** (their entrance tile — see Part 2). If a guardian's aggro zone covers the entrance approach, the guardian must be defeated first. This is emergent, not scripted: the guard "guards" exactly what its zone cuts off.
- **Castles unchanged in spirit:** enter via the entrance tile; garrison battle if defended.

### Ranged pickup
- Resource piles, items, and chests are picked up by a hero **standing on any of the 8 adjacent tiles** and clicking the object. Costs **100 move points**, hero does not change tile. Stepping onto the pickup's own tile also works (normal move cost, auto-pickup, hero ends there).
- Ranged pickup does NOT check aggro — only tile entry does. Consequence (intended): a sloppily placed guardian can be looted around; a well-placed one covers every tile from which the pickup could be clicked. Authoring must account for this (lint below).
- Chests still open their choice dialog; Forager R2's adjacent-collection becomes range 2 (R3: range 3 — renumber its ranks accordingly, since range-1 collection is now free for everyone).

### Map re-authoring + lint tool
- Re-author Border Marches and Crosstitch: guardians moved off rewards onto adjacent tiles, positioned so their zones genuinely block the intended approaches.
- Build `npm run map-lint`: verifies (a) no overlapping footprints; (b) every entrance tile reachable from both/all start positions; (c) every object listed as "guarded" in map data is actually secured — i.e., every tile from which it could be entered or range-picked is inside an aggro zone or impassable; (d) no aggro zone covers a castle entrance or a start tile. Lint runs in CI; both maps must pass.

### AI updates
- Pathfinding treats aggro tiles as blocked UNLESS the current objective is fighting that guardian (power check as before, now evaluated before zone entry).
- Gatherer heroes use ranged pickup and exploit unguarded-in-practice loot the lint would flag (AI may loot around bad guards on future user-made maps; that's fair play).

### UI
- Hovering/inspecting a guardian shades its 4 aggro tiles.
- Path preview: any segment crossing an aggro tile renders red with a crossed-swords marker at the trigger tile; confirming the move is accepting the fight.
- Range-pickup affordance: adjacent pickups highlight on hero selection; click to collect (with a small float animation of the resource toward the resource bar).

## Part 2 — Multi-tile map objects

- Map objects gain `footprint: {w, h}` (default 1×1) and `entrance: {dx, dy}` (offset within footprint; default 0,0).
- **Castles: 3×3, entrance bottom-center.** **Mines: 2×2, entrance bottom-left.** Everything else stays 1×1 unless authored otherwise (the Monastery and the Half-Built Bridge may be 2×1 at the map author's discretion).
- All footprint tiles except the entrance are impassable; interaction (capture, visit) happens only via the entrance. Rendering scales to the footprint (SVG: one sized group; visual polish later).
- Aggro/guard placement, pathfinding, fog reveal (reveal radius measured from footprint edge), and the lint all operate on footprints, not anchor tiles.
- Both maps re-authored to fit (castle areas need clearing; keep mirror fairness).

## Part 3 — Multi-hex battlefield creatures

- Units gain `hexSize: 1 | 2 | 3` (default 1). Wide units occupy N horizontally contiguous hexes, axis-locked (no rotation — simplification vs HoMM3; log it).
- **General rule: all adjacency, attack range, targeting, retaliation reach, aura/aoe, tile effects, and push/collision checks are computed over the union of occupied hexes.** Movement requires all destination hexes free along the path; forced movement moves the whole footprint and collides if any hex is blocked; created tiles (resin trail) are laid under every occupied hex.
- Deployment: wide units take contiguous slots on the deployment column; if the column can't fit everything, overflow deploys one column inward (attacker column 1 / defender column 11).
- **Size assignments** (2-hex): Oriflamme Wyvern, Reliquary Ark, Wooden Colossus, Stuffed Sentinel, The Ferry, The Half-Woken Queen, The Walking Hut, Aurochs Herd, Thunderbird, and the siege Ram. **3-hex:** The Sleeper. Everything else 1. (Grass-Serpent stays 1 — it travels beneath, not beside.)
- Ability audit for wide units (test each): `skim` (two targets adjacent to any occupied hex), `trample` (path = swept area of the footprint), `fowl_legs` (relocation needs 2 free hexes), `crossing` (the Ferry carries; carried unit placed adjacent to either hex), Gale/`sweep` pushes (full-footprint collision), Wall of the Maker (cannot be cast under a unit — now checks all hexes).
- Combat AI: wide units path with footprint awareness (BFS over footprint positions); no other AI change required.
- UI: wide tokens render as a pill spanning their hexes; movement preview shows the full footprint; deployment shows slot consumption.

## Tests & acceptance

- Unit tests: aggro trigger on entry; no trigger on ranged pickup from outside zones; overlapping-zone resolution; deliberate attack via guardian tile; move-points retained after aggro victory; footprint impassability + entrance-only interaction; castle entrance battles; each wide-unit ability case above; map-lint catches a deliberately broken fixture map (guard that fails to guard).
- Sim: full league re-run, zero crashes; game-length medians within 20% of pre-change values (aggro shouldn't stall the AI — if it does, fix AI pathing, not the mechanic).
- Human acceptance: loot a badly-guarded pile from behind; get caught by a well-placed guard; capture a 2×2 mine through its entrance; watch an Aurochs Herd fail to fit through a one-hex gap the Outriders slip through — that last one is the point of the whole feature.
