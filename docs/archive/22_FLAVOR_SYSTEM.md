# Flavor & Inspection System

## The inspection UI

- **Desktop:** hover = name label only. Right-click (or an Inspect toggle button) = flavor card. **Mobile:** tap = name, long-press = flavor card.
- Everything on screen is inspectable: terrain tiles, map objects, units (in armies, recruit screens, and combat), buildings, spells, artifacts, consumables, skills, heroes, counters, enchantments, omens.
- **Flavor card layout:** name → flavor text (in-world, from 23) → mechanics section. The mechanics section is auto-generated from data (stats, effects, costs) — flavor is never the only place a rule lives, and rules text is never the only thing shown.
- **Discovery rule for visitable map objects:** until this player has visited an object of that type, its card shows flavor ONLY — no mechanics. After first visit, the mechanics line appears permanently (a small "learned" journal per player). The flavor must therefore hint honestly at function without stating it. Shrine says "You can steady your hand here," not "+1 Attack."
- **Buildings are the exception:** their cards always show function and requirements (the player is making a purchase decision). Requirement lines are appended plainly: "Requires: Town Hall."
- Terrain gets a label and at most a five-word phrase; no cards.
- Hero cards show the background paragraph, then stats/skills/specialty.

## Data schema

Every content entry in `src/content/` gains a `flavor: string` field (heroes: `story: string`). Terrain entries gain `label: string`. Map-object entries may add `flavorHint` (shown pre-visit) if it should differ from the standard flavor — default: same string. Validate at load: no entry ships without flavor; CI fails on empty strings.

## Writing register (rules for all future flavor, including agent-generated)

1. Two sentences maximum; most entries one. Heroes: one paragraph, 50–90 words.
2. In-world voice, always. No numbers, no game terms (stack, meter, tier, buff) in flavor. Mechanics live in the mechanics section.
3. Assimilation Laws apply: nothing knows its own origin; mundane first read; myths contradict; wonder is the double-take.
4. Warm, wondrous, wistful. Humor is allowed and dry. Never grimdark, never winking at the player.
5. Faction voices: Hearthguard plain and proud · Wound-Wrights reverent guild-speak that never quite sees it · Unfinished gentle, present-tense, unresolved · Vespiary formal alien courtesy · Hagwood folk-tale cadence, bargain-shaped · Wildergrass terse, spoken, drum-rhythm · school voices: Rite ceremonial, Craft matter-of-fact, Wild weather-worded, Grave quiet.
6. Visitable-object flavor must hint at function truthfully but obliquely (the discovery rule depends on it).

## Hero rosters — the four new factions (fills the gap in Milestone 21 Phase B)

Class starting stats / draft weights (A/D/SP/K), then 4 heroes each. Specialties are behaviors. Stories in 23.

**The Unfinished — class: Chandler.** Start A1 D2 SP2 K1; weights 15/25/30/30.
- **Maren** — her Candle-Wisps' `last_light` applies Hex 3 instead of 2.
- **Elgiva** — knows Remembrance; always resolves as its + face for her.
- **Tobiah** — his Sentries retaliate at +25% damage.
- **Brother Hollis** — his `unfinished_business` deals 20% instead of 15%.

**The Vespiary — class: Broodspeaker.** Start A2 D2 SP1 K1; weights 25/30/25/20.
- **Vess** — her Larvae have 5 HP instead of 4.
- **Oszra** — her `render_down` converts 15% instead of 10%.
- **Kettl** — her Paper-Wasp Lancers +1 speed.
- **Humm** — knows Bloom; always + face.

**The Hagwood — class: Crone.** Start A1 D1 SP2 K2; weights 10/15/40/35.
- **Baba Zima** — her Debts trigger one step later or lighter (per-card, stated on deal).
- **Yaga Olen** — knows Sour; always + face.
- **Old Marta** — her Crow Chorus applies Hex on retaliation too.
- **Vasilisa** — her Besom Riders push 2 hexes.

**The Wildergrass Clans — class: Ashrider.** Start A2 D1 SP1 K1 (+1 A at level 2 guaranteed... no — weights only); weights 40/20/20/20.
- **Temir** — his `blood_price` grants +25 instead of +20.
- **Saiga** — her Ashmane Wolves' `pack_hunger` is +25%.
- **Anai** — knows Gale; always + face.
- **Bataar** — his Outriders' `skirmish` movement ignores Fence-Post-style speed penalties and adjacency slows.
