# Water Expansion — Boats, Sea Combat, and the Torn Sound

Water becomes real: travel, combat, pickups, sea "buildings," native creatures, and a map to exercise it all. In-world frame (per canon): the stitched world's seas came from different worlds — their seams are visible as color-lines in the water, and things live in them that no single ocean evolved. Judgment calls → DECISIONS.md.

## 1. Boats & travel

- **Water tiles are passable only by boat.** Boats are map objects (1×1) that heroes board.
- **Shipyard** (castle building, buildable only in coastal castles — auto-detected: any water tile within 3 of the footprint): 2000g + 5 timber. Builds a **boat** (1000g + 3 timber) on an adjacent water tile. Flavor: "Keels laid to old patterns. Some of the patterns insist on figureheads."
- **Embark:** hero moves onto a boat tile → the whole army boards (costs 300 move). **Disembark:** move from boat onto an adjacent land tile (costs 300). Sea tiles cost 65 move (the sea is fast; that's its compensation for being a detour).
- An empty boat (hero disembarked) stays where left, owned but stealable: any hero walking onto it takes it. **Summon Skiff activates:** base face summons a new boat to the nearest shore tile (7 mana); + face teleports the nearest existing boat on the map to your shore — the theft homage, now live.
- Heroes at sea use ranged pickup as normal (water pickups below); aggro zones work identically on water.

## 2. Sea combat

- Hero-vs-hero battles where both are embarked, and battles against sea guardians, use the **sea battlefield**: the outer 3 columns on each side are deck (normal hexes); the middle 7 columns are **shallows** — land units pay +1 move per shallow hex, `aquatic` units ignore the penalty and gain +1 speed while in shallows, `flying` unaffected. No other special rules; all existing spells/abilities work (Wall of the Maker on water is a very good trick and legal).
- Amphibious assaults (boat attacking a shore hero/castle or vice versa): standard land battlefield; no modifiers. Castle assaults from the sea require the attacker to disembark first — you cannot besiege from a boat.
- New unit tag **`aquatic`**, retroactively granted to: The Ferry (of course), Rusalka, Grass-Serpent. Sea-native creatures below all carry it.

## 3. Water pickups (ranged-pickup rules apply)

- **Flotsam** — 2–5 timber, sometimes a little gold. Flavor: "Someone's cargo. The sea has amended the bill of lading."
- **Sealed Cask** — chest-equivalent at sea: gold / XP / an item. "Tarred, corked, and heavier than hope."
- **Castaway** — +500 hero XP; seed-chance of an item and a story. "He has been extremely alone and would like to discuss it."
- **Message in a Bottle** — one seeded rumour (as Tavern Tales). "The handwriting is urgent. The date is unhelpful."

## 4. Sea locations

- **Whirlpool** (paired, 2 per map): enter one, exit the other, anywhere on the map; your weakest stack loses 25% of its units (min 1) to the crossing. Deterministic, brutal, and worth it. "The two seas argue here. Travelers are the concession."
- **Shipwreck**: guarded (Drowned Crew, below); victory yields gold + one artifact. "The figurehead is still smiling. Nothing else is."
- **The Drowned Bell** (unique; the monastery's sunken sibling — the brothers do not discuss it): visit once per hero: +1000 move today and your next battle starts with Vanguard-R1 timing. "Below, at anchor, a bell. It has rung exactly once, downward."
- **Siren Rocks**: on approach (entering the 2-tile ring): choose — *listen* (fight the Sirens; victory yields their hoard and a Charm-class artifact) or *row past* (lose 300 move). "The song is about you, specifically. It is very flattering."
- **Lighthouse** (flaggable like a mine): all your heroes +500 sea move/day. "Somebody keeps it lit. Nobody rows out to ask who."

## 5. Sea creatures (neutral guardians; `aquatic`; penciled stats)

| Creature | Stats | Abilities |
|---|---|---|
| **Sirens** | 16 / 3–5 / A5 D4 / spd 6 / — | `ranged(8)`. **`the_song`** (apply): ranged attacks also drain 10 meter from the target. Flavor: "Every sailor hears a different name. It is always the right one." |
| **Drowned Crew** | 22 / 4–7 / A6 D7 / spd 4 / — | **`still_aboard`** (death-triggers): `unfinished_business` at 10% (they are Unfinished, technically; the Chandlers have filed a claim). Flavor: "They maintain the wreck. They are behind schedule and aware of it." |
| **Hull-Turtle** | 130 / 10–16 / A9 D15 / spd 4 / — | **2-hex.** **`shellback`** (damage-computation): ranged damage against it resolves at attacker's range minimum. Flavor: "Barnacled, patient, occasionally mistaken for an island. The mistake is survivable in most cases." |
| **Lantern-Angler** | 70 / 12–19 / A11 D8 / spd 7 / — | **`the_lure`** (declare): once per battle, force an enemy stack to move its full speed toward it (Rusalka's trick, convergently evolved — log the shared implementation). Flavor: "A light in the dark water, exactly where you were hoping one would be." |

Drop tables: Sirens → a Charm; Hull-Turtle → gold + timber; Angler → an item. All four join the neutral pool for coastal map authoring; growth rules apply (Hull-Turtle `static`).

## 6. The map: "The Torn Sound"

- Third map: 32×24, 2 players, an archipelago — two castle islands (coastal, Shipyards buildable), a resource-rich center island guarded by the Hull-Turtle, whirlpool pair linking the far corners, Drowned Bell north, Siren Rocks at the two natural sea lanes, Lighthouse contested center-south, sea lanes salted with flotsam/casks. Land is scarce: the map's argument is that whoever reads the sea better wins. Victory: conquest. Lint applies (aggro zones on water included).

## 7. AI

- Mixed-domain pathfinding: A* over land+sea with embark/disembark transfer costs; boats as reusable resources (remember where yours are; prefer reboarding over rebuilding).
- Strategy: builds a Shipyard when a scored objective is unreachable by land; Gatherers collect sea pickups; treats whirlpools as edges with the 25%-weakest-stack cost priced in.
- Sim gates: Torn Sound league (both factions × 40 games) zero crashes; games end ≤ 10 weeks median; AI must successfully perform ≥ 1 amphibious capture per game on average (else its naval logic is decorative — fix pathing).

## Deferred at spec time
Ship-to-ship boarding minigames, ship upgrades, sea omens, the Driftfolk as a faction (the sea creatures here are their advance scouts, canonically), underwater layer. Log, don't build.
