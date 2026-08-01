# 29 — Discovery Expansion: Neutral Towns, More Everything, the Wander Map

Purpose: the exploration itch. Current inventory vs the H2 bar: ~35 map-object types (H2: ~65+), 48 artifacts (H2: ~85), 24 heroes (H2: ~54). This doc closes the gaps and adds the sandbox to enjoy them in. Flavor lines are given inline (register rules from 22 apply); mechanics are penciled per 13. Judgment calls → DECISIONS.md.

## 1. Neutral towns

- A castle may be authored with `owner: neutral` and any faction. It has an authored garrison (and optionally prebuilt buildings, resources in vault). Capture by defeating the garrison via the entrance; it becomes fully yours: build its tree, recruit its faction's units (mixed-army meter penalty applies as normal; the Patchwork Standard remains the fix).
- Diplomacy stand-aside (R3) does NOT apply to garrisons — towns are taken, not tipped.
- Variants for authors: **Free Town** (small garrison, no walls, poor), **Old Seat** (walls, T4 dwelling prebuilt, strong garrison), **The Hollow Town** (empty garrison, gates open — and a one-line flavor that makes you hesitate: "The gates are open. The tables are set. Nobody minds.") — mechanically free real estate; the hesitation is the content.
- Neutral towns never build, recruit, or grow their garrison (guardian growth rules do NOT apply inside walls). AI players value them as conquest targets by garrison-vs-power check.

## 2. New adventure map objects (+28 types)

**Capture for recurring income** (flag like mines): **Watermill** — 500g on week start ("The wheel turns for whoever oils it."). **Windmill** — 2 of a seeded rare resource weekly ("It grinds what the week brings."). **Trading Camp** — flagging grants marketplace access from anywhere ("Everything is for sale here, including directions.").

**One-off permanent boosts** (once per hero): **The Sparring Stone** — +1 Attack or +1 Defense, chooser ("Generations have hit this rock. The rock has learned nothing. The visitors have."). **The Listening Stones** — +1 Spell Power ("Stand in the circle. The circle finishes your sentences."). **The Long Draught** — +1 Knowledge ("A well with opinions about you."). **The Grinning Idol** — luck +1 permanently, rare, guarded ("It grins. Eventually you get the joke; the joke is favorable."). **The Hut on the Hill** — learn a seeded skill at R1 (Witch's Hut homage; walks a few tiles some weeks — it has legs, this is never remarked upon): "There's a hut here most days. The path to the door negotiates." **Tree of Second Thoughts** — pay 1500g × current level: gain a level immediately (draft deals as usual): "It grew through a library, once. It remembers enough to charge."

**Weekly-recurring visits**: **The Warm Table** — next battle starts with all stacks +10 meter ("Soup, bread, and the strong impression of being expected."). **The Cold Spring** — +400 move today ("Water with somewhere to be."). **The Idol of Somebody** — luck +1 next battle ("Nobody remembers whom. It accepts flowers on their behalf."). **Wishing Well** — throw 1 gold: a tiny seeded boon (move, meter, 25g back, or splash) ("Rates of return vary. The splash is guaranteed.").

**Fight for reward** (authored guardians per site; drops per 17/18 sourcing): **Ruined Watchtower** — gold + a Charm ("The garrison left in a hurry, in several directions, some time ago."). **The Old Bear's Cave** — gold + Hearth-Hound recruits offer ("Occupied. Firmly."). **Wolf Hollow** — Ashmane recruits offer ("The howling is administrative: territory, hours, grievances."). **The Unquiet Yard** — artifact + XP; Unfinished-type guardians ("The residents keep it tidy and dislike the phrase 'final resting place.'"). **The Molting Court** — essence cache; Vespiary-type guardians ("Something grew up here and grew out of here. The husks stand in receiving lines."). **The Spool-Hoard** — a Relic; hard authored fight in the Mosswold ("Wound around the great cylinder: thread, wire, and things that glint.").

**Pay for reward**: **Mercenary Camp** — buy mixed neutral stacks from a seeded weekly roster ("Loyalty by the week, invoiced in advance."). **Wagon Camp** — buy 1 seeded consumable, restocks weekly ("Everything fell off a cart. Technically theirs, now technically yours."). **The Tithe Barn** — pay 1000g: all your towns' growth +10% this week ("The granary tithes back, at interest, to the pious and the liquid.").

**Search & scavenge** (once, seeded contents, sometimes nothing): **The Skeleton in the Grass** ("He was carrying something. He is not attached to it, anymore, in any sense."). **Cold Campfire** — small gold + resource ("Whoever sat here left warm coals and cold trail."). **Shepherd's Lean-to** — small resource ("Wool, weather, and one forgotten useful thing."). **The Overgrown Cart** ("The oxen made it. The cargo didn't.").

**The Cache-Mark system** (obelisk homage): each map may bury one **Cache** (artifact + gold, authored) at a secret tile. **Patient Stones** (3–6 per map) each reveal a fragment of a sketch pinpointing it; visiting any subset narrows the region shown on a puzzle overlay. A hero on the exact tile spends a full day's move to **dig**. ("The stone shows a picture, patiently, in pieces. It has all the time you don't.") Digging on the wrong tile: nothing, day spent, one dry-laconic log line.

## 3. More artifacts (+32 → 80 total)

- **+12 vanillas**: fill the slot×tier grid with mixed-stat pieces (Sash of the Levied Mile +1A+150 move; Scribe's Cuff +1SP+1K; etc. — agent fills the grid per 18's naming voice, one line flavor each).
- **+10 Charms**: Gauntlet of the Second Throw (your first Gale/push each battle +1 hex) · Candle-Snuffer's Ring (enemy death-triggers −1 magnitude) · The Fair Scale (marketplace rates as Peddler R1) · Drover's Crook (+1 speed to T1–T2 stacks) · Hex-Keeper's Locket (your Hex lasts +1 turn) · The Third Boot (ignore first aggro trigger each day — walk past one guard) · Bell-Metal Torque (your meter drains −50%) · The Unsent Letter (Unfinished units in your army +2 all stats) · Moth-Eaten Map (one extra Patient Stone fragment on inspect) · The Spare Face (False Colors once per week, free).
- **+6 Relics**: The Long Spoon (once/battle: eat one counter pile anywhere, gain its total ×5 as meter) · The First Drum (your side's round-start meter gains double on rounds 1–2) · Crown of the Hollow Town (neutral towns' garrisons visible map-wide; their capture yields double vault) · The Weathercock of Ill Omen (you choose which omen the Fickle Weather deal offers) · The Seam-Ripper (your battles on seams: only YOUR spells get all-school resonance) · The Last Toy (when your last stack would be destroyed, it survives at 1 unit instead — once per battle).
- **+4 Burdens** (cursed, H2 homage under the Bargain law — downside visible, removal condition stated, cannot unequip otherwise): **Leaden Crown** (+3 SP; −25% move; remove: any shrine, 5 essence) · **The Hungry Blade** (+4 A; after each battle eats 5% of your largest stack; remove: defeat any puzzle-lock while wielding it) · **Beggar's Ring** (luck +2; all prices against you ×1.5; remove: throw 5000g in a Wishing Well) · **The Patternless Coat** (+3 D; your spells never resolve as + faces; remove: trade at the Reliquary Cairn, which accepts it smugly). Burdens enter drop tables at Relic rarity and are always inspectable before pickup — taking one is informed consent.

## 4. More heroes (+12 → 36; two per faction; stories per register, 22 schema)

- **Hearthguard — Edwin** (his Hearth-Hounds… future unit; until then: garrisons he installs gain +5 meter/round): a kennel-master who argues the old sign-boards are muster rolls. **Maud** (Trial always +): a circuit judge who brought her gavel to a war and found the war amenable.
- **Wound-Wrights — Ansel** (Clockwork Escort always +): a novice who hears the molds humming and hums back, on key. **Rivka** (his — her — Marionettes +1 speed): a puppeteer before the Guild; she insists, gently, that she retired.
- **Unfinished — Cerys** (The Ferry may carry twice per battle): a ferrywoman in life; the river is gone; the fares continue. **Dunstan** (Bone Choir +25% dirge scaling): a choirmaster completing an interrupted requiem, movement by movement, battle by battle.
- **Vespiary — Szet** (resin trails last +2 rounds): a carrier-caste voice who paves as she negotiates. **Ollo** (brood_call spawns +50%): the Queens' census-taker; his counts are prophecy, self-fulfilling.
- **Hagwood — Agata** (Fence-Post Familiars' slow also hits diagonals): she planted her first fence at nine, around a bully, who is arguably still there. **Bogdan** (the only male Crone; the wood ruled it irregular and binding): his bargains all have loopholes; the loopholes are the trap.
- **Wildergrass — Qara** (Thunderbird's storm_wake Burn 3): born during the loud sky; the sky remembers her fondly and at volume. **Erdem** (surrendering to Erdem costs double): the clans' toll-taker; defeat, he says, is a border, and borders pay.
(Full 50–90-word stories: agent drafts per 22's register; the lines above are the seeds and the specialty spec is binding.)

## 5. The Wander Map: "Manywhere"

- **48×40, 1 human start** (Hearthguard slot default, any faction selectable) + up to 2 optional AI slots. Every terrain type present in coherent regions (Hush north, Ashsteppe southwest, Mosswold on the central seam-cross, Mire river-delta east, Lacquer Flats southeast, Barrowfield mid-west, coast + islands along the south for the full 26 water kit).
- Contents: **at least one of every map-object type in the game** (lint: enumerate content registry vs map, fail on missing), 4 neutral towns (one Free Town, one Old Seat, one Hollow Town, one coastal), all six factions' dwellings somewhere, 6+ puzzle-locks including the Sleeper and Mirror-Bound, the full Tailor's Kit, one Cache with 5 Patient Stones, both unique monasteries/rings, dense guardian ecology with growth on, and seams enough to matter.
- Victory: `conquest`, plus a new option **`victory: none`** (sandbox — the game runs until the player leaves; "retire" button ends with the stats screen).
- Authoring may be procedural-assisted (agent may script placement and hand-fix), but the result is a committed, authored map file passing all lints.

## 6. Dormant AI

- New per-slot AI type in the menu: **Standard** / **Dormant**. Dormant: never moves, builds, recruits, or hires; heroes sit garrisoned; defends battles with the normal combat AI; collects no income (vault frozen). Exists for sandbox exploration and testing. Sim harness gains `--ai dormant` for reproduction cases.

## 7. Acceptance

Map-lint extended (registry coverage on Manywhere; Cache/Patient-Stone consistency; burden inspectability). Sim: Manywhere with one Standard AI, 50 games, zero crashes (long-game stress test — this map will find slow leaks nothing else has). Exposure recount per 13 against the enlarged pools (~65 object types, 80 artifacts, 36 heroes): single-run exposure should now land near 25% — that's the goal, not a problem. Human acceptance: a full evening on Manywhere with a Dormant neighbor, and at least one moment of "wait, what is THAT" that the docs didn't spoil for you — which, given you wrote them, sets a high bar for the map author.
