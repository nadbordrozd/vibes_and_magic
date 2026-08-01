# Milestone: Castle Screen — Named Dwellings, Upgrade Chains, Building Cards

Four changes to how castles present themselves: (1) every dwelling gets a proper in-world name — no more "Tier 2 Dwelling"; (2) buildings that upgrade one another (Mage Guild levels, the hall line, Walls→Keep) occupy ONE slot in the build panel, HoMM-style; (3) the castle screen becomes a grid of picture-cards with a color state, and clicking a card opens a detail dialog with function, cost, and prerequisites; (4) every castle starts with a Tavern prebuilt. Judgment calls → DECISIONS.md; do not ask.

## 1. Named dwellings

Dwellings are content data and get real names + flavor like every other content entry (22's validator applies: no empty flavor ships). Recruit rows, build cards, tooltips, and logs all use the name — the string "Tier N Dwelling" must not appear anywhere in the UI. Mechanics lines stay auto-generated ("Recruits: Longbowmen · Growth: 9/week").

| Tier | Hearthguard | Wound-Wrights | Unfinished | Vespiary | Hagwood | Wildergrass |
|---|---|---|---|---|---|---|
| 1 | Yeoman Crofts | Tin Rows | Candle Chapel | Larval Warren | Crow Gallows | Outrider Camp |
| 2 | The Butts | Rocking Stables | Dead Letter Office | Paper Barracks | The Crooked Fence | Drum Circle |
| 3 | Hall of Banners | String Garret | The Watch-House | Silk Galleries | Besom Yard | Wolf Runs |
| 4 | The Tilt Yard | Batting Hall | Choir Loft | Amber Vaults | The Old Millpond | Grazing Grounds |
| 5 | Oriflamme Chapel | The Great Jointworks | Bridal Bower | The High Eaves | The Old Growth | The Long Grass |
| 6 | Wyvern's Roost | Procession Yard | The Ferry Landing | The Waking Cell | Hut's Clearing | Storm Eyrie |

Flavor lines (register per 22; one each, faction voice):

- **Yeoman Crofts** — Good soil, straight fences, and sons to spare. · **The Butts** — Every village green has one. Sunday practice is law, and lately well attended. · **Hall of Banners** — The cloth is stored flat, carried high, and never folded in anger. · **The Tilt Yard** — Three generations have splintered lances here. The fourth is saddling up. · **Oriflamme Chapel** — The old banner rests here between wars. It does not rest well. · **Wyvern's Roost** — Nothing nests in it. Something steps out of the blazon above the door, when asked properly.
- **Tin Rows** — Rank upon rank upon shelf upon shelf. · **Rocking Stables** — The mounts rock when no one is riding. The Guild finds this devout. · **String Garret** — High rafters, for reasons the Guild does not examine. · **Batting Hall** — Stuffing, sackcloth, and the patience of upholsterers. · **The Great Jointworks** — The largest lathes the Guild has ever built, copying the largest limbs it has ever found. · **Procession Yard** — The Ark is wheeled out singing and wheeled back heavier.
- **Candle Chapel** — Lit for the small ones. Someone keeps lighting more. · **Dead Letter Office** — Every letter here is still expected somewhere. · **The Watch-House** — The rota was never cancelled. New names keep appearing on it. · **Choir Loft** — They rehearse endings. Attendance is excellent. · **Bridal Bower** — Kept ready. She has somewhere to be. · **The Ferry Landing** — A dock, nowhere near water, well maintained.
- **Larval Warren** — Warm, papered, and full. The Hive's future, by the thousand. · **Paper Barracks** — Folded, not built. The lancers drill in courteous silence. · **Silk Galleries** — The looms are alive. The thread is a gift. · **Amber Vaults** — What the Hive values is kept in gold that was never metal. · **The High Eaves** — The fast ones roost highest. Guests are announced at speed. · **The Waking Cell** — She sleeps less every year. The court rehearses its manners.
- **Crow Gallows** — The wood's watchers hold assizes here. Verdicts are cawed. · **The Crooked Fence** — Posts walk here at night to be planted by day. · **Besom Yard** — Brooms, bundled and waiting. Sweeping is serious work. · **The Old Millpond** — The mill is gone. Something still draws the water into rings. · **The Old Growth** — Trees older than the contract, honoring it anyway. · **Hut's Clearing** — Trampled flat, twice a day, by something with excellent legs.
- **Outrider Camp** — Saddled by dawn, gone by rumor. · **Drum Circle** — The hides are stretched, the rhythm is inherited. · **Wolf Runs** — The packs come when the ash-horn blows. Mostly when. · **Grazing Grounds** — The herds eat, grow, and remember the fire. · **The Long Grass** — Do not walk it. Ride around, like everyone sensible. · **Storm Eyrie** — The high ledge smells of rain that hasn't happened yet.

## 2. Upgrade chains — one slot per line

- Building data gains `upgrades: <buildingId>` (optional). A connected chain of such links is an **upgrade line**. Canonical lines: **Village Hall → Town Hall → City Hall** · **Mage Guild 1 → 2 → 3** · **Walls → Keep**. Dwellings are prerequisites, not upgrades — each dwelling keeps its own slot (it recruits a different unit).
- The build panel shows **one card per line**: the next unbuilt stage if any remains (state per §3), else the topmost built stage in gold. So a fresh castle shows "Mage Guild 1"; once built, the same slot shows "Mage Guild 2"; after Guild 3 the slot shows "Mage Guild 3", gold.
- The detail dialog of a chain card notes its line ("Upgrades to: Mage Guild 2" / "Upgrades: Town Hall"). Prerequisite display and build rules are unchanged — a stage's prerequisite is simply the previous stage plus anything it already required.
- Effects of built lower stages persist as today (guild spells learned at L1 stay learned). No refunds, no skipping stages.

## 3. Building cards and states

The castle screen's build panel is a grid of uniform cards: **placeholder SVG picture + name**, nothing else on the card face. Placeholder art: one simple generic glyph per building category (hall, dwelling, guild, walls, economy, faction-special) in faction palette — a single `<symbol>` each, reused; individual art is explicitly out of scope.

Card state is shown by frame/tint color, exactly four states:

| Color | Meaning |
|---|---|
| **Gold** | already built |
| **Green** | buildable right now (prereqs met, resources sufficient, castle hasn't built today) |
| **Red** | cannot be built right now (missing prereqs, or insufficient resources, or the castle already built today) |
| **Grey** | not available in this castle at all |

- Grey source: map data gains an optional per-castle `bannedBuildings: <buildingId[]>` list. Currently empty on all authored maps; the state must render and be testable regardless (future consumers: coastal-only Shipyard per 26, scenario restrictions). Other factions' buildings are NOT grey — they simply never appear; the panel lists only this castle's faction tree plus the common tree.
- Layout: fixed grouped order — hall line, economy (Marketplace, Tavern), military (Walls line), Mage Guild line, dwellings T1→T6, faction specials. Same slot positions every visit; no reflowing as things get built.
- The one-build-per-day rule is surfaced honestly: after today's build, all green cards flip red and the dialog reason reads "Already built today."

## 4. Detail dialog (click a card)

Clicking any card, in any state, opens a modal:

1. **Picture** (same placeholder, larger) and **name**.
2. **Flavor line** (buildings always show flavor AND function — 22's stated exception to the discovery rule).
3. **Function** — auto-generated from building data, never hand-written (dwellings: unit + growth; halls: income; guild: spells taught count/level; specials: their effect line).
4. **Cost** — resource icons + amounts, each tinted red if the player currently lacks it.
5. **Requires** — prerequisite building names, each tinted red if not yet built. Chain cards list the previous stage here like any other prerequisite.
6. **State line + action**: Gold → "Built." no button · Green → **Build** button (builds, closes, panel refreshes with the day's builds spent) · Red → the specific blocking reason(s), disabled button · Grey → "Cannot be built in this castle." no button.

This dialog replaces the current hover-text/inline behavior; the inspection system (22) routes building inspection to this same dialog rather than a separate flavor card.

## 5. Tavern prebuilt

Every castle starts with the Tavern already built (alongside the existing prebuilt Village Hall and T1 dwelling). Applies to starting castles and any castle authored on a map; the Tavern card shows gold from day 1. Remove the Tavern from the AI build order (11's "after Mage Guild L1" step becomes moot — log it). Hiring economics unchanged: the tavern being free to have is not free to use.

## 6. Tests & acceptance

- Tests: Tavern present and gold in a fresh castle of every faction (and its hire flow works on day 1); chain slot resolution (fresh castle shows stage 1; each build advances the visible stage; full line shows top stage gold); state computation for all four colors including `bannedBuildings` grey and the built-today red flip; dwelling names present for all 36 entries with non-empty flavor (extend the 22 validator); detail dialog reason strings for each red cause (prereq, resources, built-today) asserted separately; Treasury/City Hall migration untouched (no "Treasury" card anywhere).
- No engine/rule changes in this milestone beyond the `upgrades` and `bannedBuildings` data fields — build costs, effects, and the one-per-day rule are untouched. If any rules logic is found living in castle-screen components while implementing this, move it into core and log it.
- Human acceptance: open a castle and see named buildings only; watch the Mage Guild slot advance 1→2→3 in place; click a red card and learn exactly why; click a grey card on a test map with a banned building; build from the dialog and see everything flip red for the day.
