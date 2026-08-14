# 60 — Magic Overhaul: Tiers, Scaling, and the Combo Layer

**Status:** design work order. No code in this document.
**Companions:** [61 Spell Catalog v2](61_SPELL_CATALOG_V2.md), [62 Combo Design](62_COMBO_DESIGN.md),
[63 Content Support v2](63_CONTENT_SUPPORT_V2.md).
**Amends:** S01, S04, S05, S06, S07, S09. The exact amendments are listed in §10.

---

## 1. What is wrong today

The MVP's magic layer is structurally sound and dramatically underpowered. Six concrete faults:

1. **No spell scales with the hero.** Every damaging effect in the catalog is a percentage of the
   target's current HP (Trial 25%, Dirge 3%/kill, Storm 6%, Reckoning 2%/mana). A Spell Power 18
   archmage deletes almost exactly as much as a Spell Power 2 novice. Spell Power currently buys
   duration, one counter pip per 5, and one percentage point per 2. The single most important
   reason a HoMM hero feels like a hero — "my spell just erased that stack" — does not exist here.
2. **Flat mana curve, flat power curve.** Every spell costs 3–7 mana. There is no cheap
   round-one cantrip and no expensive fight-ending haymaker. Guild level 3 feels like guild level 1
   with different words.
3. **Three guild levels.** With 80% pair-school dealing and 3 levels, a run exposes roughly 8–12
   spells out of 68. That is far too few draws for a discovery-driven game and it flattens the
   "building the guild is a reveal moment" law in S01.
4. **Almost no enablers.** The combos the game wants come from verbs that change the rules of the
   board — teleport, control, redirect, clone, sacrifice, detonate, resurrect, mass — not from
   larger numbers. The catalog has four of these (Quicksilver's phase, Gale's push, Borrow Shape,
   Hourglass Crack) and they are all single-target and mild.
5. **The counter system is the best-designed thing here and nothing exploits it.** Four counters,
   capped at 9, decaying 1 per turn, with four twisters that operate on effects. That is a complete
   combo engine with no payoff cards: nothing consumes a pile, nothing stops decay, nothing converts
   one counter into another, no creature cares how many pips are on it.
6. **Adventure magic is timid.** Beacon, Gate, Cold Road, and Greenway are the whole topology kit.
   There is no Dimension Door, no Fly, no cross-map economic warfare. In HoMM3 the adventure
   spellbook is where a hero's power actually lives.

Two smaller faults worth fixing in the same pass: five spells have Upgraded rules identical to
Standard (Standard of Dawn, Unmake, Standing Mirror, Shed Skin, Hedgerow March), and three spells
have no gameplay effect at all (Census, False Colors, Hedgerow March).

---

## 2. Design goals this work order serves

| Goal | Primary lever in this overhaul |
|---|---|
| The hero matters from day one | Impact damage that scales with Spell Power; every hero starts with two tier-1 spells; base mana regen doubled |
| Powerful tactical combos and creature synergy | New effect primitives (§6), counter payoffs, and the ability additions in doc 63 |
| Very different builds | Five tiers per school, build-around relics naming specific mechanics, three new magic skills |
| Loot-driven swing | Guild 1–5 with tier-gated deals, tier-4/5 scroll and tome sources, chaotic sites |

**Accepted cost, stated once so nobody re-litigates it later:** this raises outcome variance. A
player can be handed a tier-4 spell on day nine and win a fight they should have lost. That is the
intended feel — HoMM2 exploration and economy, Slay the Spire draw variance. The balance posture in
S01 already defers parity; §10 amends it to say variance is a design target rather than a defect.
Degenerate *loops* remain forbidden (see doc 62 §5); degenerate *blowouts* are the product.

---

## 3. Spell tiers and the Mage Guild ladder

### 3.1 Five tiers

Every spell gains a `tier: 1 | 2 | 3 | 4 | 5`. Tier is the primary acquisition gate and the primary
power band. Existing `rarity` is retained for scroll eligibility and chest tables only; it no longer
implies power.

| Tier | Mana band | Role | Count per school |
|---:|---|---|---:|
| 1 | 2–5 | Cast every round from level 1. One cantrip, then small capped effects. | 8 |
| 2 | 5–9 | The workhorse band. Real decisions. | 8 |
| 3 | 8–14 | Fight-shaping. Enchantments and mass effects begin. | 7 |
| 4 | 12–20 | Build-defining. One per battle for a mid-game hero. | 5 |
| 5 | 18–30 | Haymakers. A Knowledge-3 hero can cast exactly one. | 3 |

Thirty-one spells per school, 124 total. The four provenance rares (Echo, Hourglass Crack, Borrow Shape,
Loyal Unto Death) sit inside those counts at tiers 4–5 and remain excluded from guild pools.

### 3.2 Mage Guild 1–5

Add `mageGuild4` and `mageGuild5` to the common city tree as the same single upgrade chain, so the
building-card grid in S07 is unchanged.

| Stage | Cost (pencilled) | Prerequisite | Spells dealt |
|---|---|---|---:|
| Mage Guild 1 | 1000g, 2 essence | — | 4 |
| Mage Guild 2 | 1500g, 3 essence | MG1 | 3 |
| Mage Guild 3 | 2500g, 5 essence | MG2 | 3 |
| Mage Guild 4 | 4500g, 4 iron, 9 essence | MG3 + Town Hall | 2 |
| Mage Guild 5 | 8000g, 8 iron, 16 essence | MG4 + City Hall | 2 |

**Deal rule.** Each dealt spell at guild level `N` is drawn at tier `N` with weight 70 and tier
`N−1` with weight 30 (level 1 always draws tier 1). Guild levels 4 and 5 each guarantee **at least
one** spell of their own tier. School weighting is unchanged: ~80% from the city faction's pair,
~20% adjacent, ~0% from the excluded school.

A full 1–5 guild therefore deals 14 spells. Two cities of different factions expose ~28 of 124 —
inside the 30–40% exposure budget while leaving most of the catalog unmet on any given run.

Building a Mage Guild 4 or 5 must present as a **reveal moment**: a named dialog, the dealt spells
face-up, and a log line. It is the single largest lootbox in the game.

### 3.3 Every hero starts able to cast

Currently only nine of thirty-six heroes have starting spells. Change: **every hero begins with two
tier-1 spells, one from each of their faction's two schools**, seeded from the campaign seed.
Authored `startingSpells` are honoured first and count toward the two (so Corwin keeps Rally and
draws one Craft tier-1; Silas keeps Wither and draws one Craft tier-1).

Combined with tier-1 costing 2–5 mana against a 10–20 mana starting pool, a day-one hero casts
something meaningful in every round of their first guardian fight. That is goal 1, delivered by
acquisition rather than by numbers.

---

## 4. Scaling: two damage families

The current target-scaling law in S01 forbids caster-scaled deletion. Keep its intent, split its
scope.

### 4.1 Toll damage (percentage of the target) — unchanged law

Effects that remove a percentage of HP, disable, copy, revive, or otherwise derive value from the
target continue to scale primarily with the target. Spell Power may add percentage points at the
documented +1 per 2 SP. Trial, Dirge, Storm, Reckoning, Harvest, Puppet Strings and friends live
here. These are **strong against large stacks and weak against small ones**.

### 4.2 Impact damage (flat, Spell Power scaled) — new

A new spell family deals a flat HP amount:

```text
impact = (base + coefficient × effectivePower) × (1 + 0.05 × targetHex) × registeredModifiers
```

`effectivePower` is the hero's Spell Power including artifacts. Impact damage is **strong against
many cheap units and weak against a few tough ones** — the exact inverse of Toll damage. Holding
both families makes target selection a real decision every round and gives Spell Power a linear,
legible payoff.

Pencilled bands (tuning happens later; the shape is what matters):

| Tier | Single target | Mass (per company) | Cap |
|---:|---|---|---|
| 1 | `8 + 4×SP` | — | hard cap 40 |
| 2 | `16 + 7×SP` | `8 + 3×SP` | half rate above SP 10 |
| 3 | `28 + 11×SP` | `14 + 5×SP` | uncapped |
| 4 | `45 + 16×SP` | `22 + 8×SP` | uncapped |
| 5 | `70 + 22×SP` | `35 + 11×SP` | uncapped |

### 4.2.1 Tier determines the *shape* of the curve, not just its height

Low-tier spells must be genuinely good on day three and genuinely marginal by week eight. That
falloff is not a balance accident to be corrected later — it is the pressure that makes climbing the
guild ladder an economic decision, and it is why a level-2 hero and a level-14 hero play differently
even when they know the same spell.

Three curve shapes exist, and every spell declares which it uses:

| Shape | Rule | Used by | Lifecycle |
|---|---|---|---|
| **Fixed** | No Spell Power scaling at all | Tier-1 cantrips (§4.2.2) | Excellent day 3, decorative by week 5 |
| **Capped** | Scales normally, then stops at a printed ceiling | All tier-1 impact spells (ceiling 40); tier-2 at half rate above SP 10 | Strong early, a cheap filler cast later |
| **Open** | Full linear scaling, no ceiling | Tier 3–5 | The reason to build a Mage Guild 4 |

Utility spells whose value is positional or tempo-based — Steady Hands, Ward, Blink, Quicksilver —
need no scaling at all and stay relevant forever on purpose. A spell that changes *where a company
is* does not get worse when armies get bigger. This is why tier-1 utility and tier-1 damage age
completely differently, and both belong in the catalog.

### 4.2.2 Cantrips

Each school gets one **cantrip**: 2 mana, fixed magnitude, zero Spell Power scaling. These are the
spells a level-1 hero with Knowledge 1 casts three times in their first guardian fight. They cost
almost nothing, they never scale, and they are never cut from a spellbook because two mana is always
affordable. They are listed in doc 61 alongside their schools.

Cantrips are the mana-positive floor of the caster's turn; **Faction Knacks** (doc 67) are the
mana-free floor. Between them, no hero in any state ever has a turn where the hero act does nothing.

**Why this is self-limiting.** Impact is a fixed HP budget per cast. Army total HP grows
superlinearly through the game (tier-6 stacks, weekly growth, difficulty growth), while Spell Power
grows roughly linearly through drafts and artifacts. A tier-1 Sunlance at SP 2 kills two Yeomen on
day three and is decorative by week eight; a tier-5 nuke at SP 15 removes about 2.5 Wooden Colossi
out of a ten-stack. Magic stays decisive in skirmishes and supplementary in doomstack fights,
which is exactly the HoMM curve.

### 4.3 Resolution rules for impact damage

- Enters at `damage-computation`; routes through `damage-routing` like any other damage.
- **Ignores** the Attack/Defense multiplier — it is not a stat check.
- **Ignores** luck positioning — there is no range to position within.
- **Is multiplied** by the target's Hex counters (+5%/pip). This is deliberate: it is the primary
  reason a Grave/Craft hero opens with Wither before nuking.
- **Is reduced** by Mourner's Veil, Ironclad, and other registered `damage-routing` reducers.
- **Is not** an attack. Ward (zero the next *attack*) does not stop it; Sanctuary (untargetable by
  enemy spells) does. Keeping those two protections distinct is load-bearing for build variety.
- Cannot be retaliated against and never triggers `melee_reflect`.

### 4.4 Other scaling corrections

- **Counter magnitude scaling becomes universal.** The documented +1 per 5 Spell Power currently
  applies to some counter applications and not others (Bloom is the logged exception in
  DECISIONS 2026-08-12/doc 53). Every spell that applies a counter now scales by default; a spell
  that should not scale says so explicitly.
- **Counter cap stays at 9.** It is a visible-pips rule and must not become soft. Raising the cap is
  an artifact/skill privilege only (doc 63).
- **Field mana regen 1 → 2 per day.** With tier-4/5 spells in the pool, +1/day makes a field hero a
  once-a-week caster. Attunement is reworked in doc 63 to remain worth drafting.
- **Maximum mana stays `10 × Knowledge`,** with Attunement rank 3 raising it to `12 × Knowledge`.
  This keeps tier-5 spells gated behind a real Knowledge investment.

---

## 5. Casting economy

One hero act per round remains the baseline and must stay the baseline: it is what forces combos to
be built across rounds as setup → payoff, which is the most interesting shape available.

What changes is that **breaking that rule becomes a findable build axis** rather than one artifact.
Every breaker is explicit, bounded, and comes from a different acquisition channel:

| Breaker | Channel | Bound |
|---|---|---|
| Sundered Hourglass (existing) | Relic artifact | Even rounds only |
| Pocket Sundial (existing) | Trinket | Cast before the first stack acts |
| Twicetold R3 (reworked) | Skill | Once per battle, tier ≤ 2 |
| The Long Oath (new, Rite T5) | Enchantment | Second spell must cost ≤ 5 mana |
| Mirror Hall (new, Craft T5) | Enchantment | Copies a cast; never grants mana or extra actions |
| Evoker R3 (new skill) | Skill | Once per battle, impact spells only |
| Empty Reliquary (new relic) | Artifact | Store one spell, release without an act |
| Hedge-caster creatures | Unit ability | Fixed spell, fixed power, once per battle |

A hero who has assembled three of these plays a visibly different game from one who has none. That
is goal 3.

### 5.1 Mass targeting

Add a targeting mode — `mass-enemy`, `mass-ally`, `mass-all` — as a spell property, not as twenty
new spell IDs and not as a twister. Several tier-3+ spells are simply the mass form of a tier-1
effect at reduced magnitude. Mass targeting is the cleanest way to make higher tiers *feel* higher
without inflating single-target numbers.

### 5.2 Adventure-spell time gates

Adventure spells keep the printed mana + 300 movement cost. Add two catalog flags — `oncePerDay`
and `oncePerWeek` — serialized per hero (per player where the effect is player-wide). Movement and
mana alone cannot gate a spell that relocates a hero across the map; a day gate can. Every tier-4
and tier-5 adventure spell carries one of these flags.

---

## 6. New effect primitives

The coding agent needs these as generic, registered operations — one handler each, hooked at a named
pipeline stage, reusable by any spell, item, artifact, or unit ability. Doc 61 references them by
name.

**Combat**

| Primitive | Stage | Behaviour |
|---|---|---|
| `impact-damage` | damage-computation | Flat SP-scaled damage per §4.2 |
| `resurrect` | apply | Restore HP to a company, reviving units up to its **starting** count; never on summoned companies |
| `mind-control` | ownership-resolution | An enemy company acts on your side for N rounds, then reverts. Eligibility capped by target HP |
| `damage-link` | damage-routing | Bind two companies; a share of damage to one is dealt to the other |
| `teleport-stack` | apply | Move any company to any legal empty hex its footprint fits |
| `stun` | turn-advance | The company forfeits its next N actions. Distinct from `skipRound` |
| `berserk` | target-selection | The company attacks the nearest company of any side |
| `clone` | apply | Create a summoned copy of a friendly company at a derived count |
| `spell-immune` | target-selection | Untargetable by **all** spells, friendly or hostile |
| `counter-detonate` | apply | Remove a counter pile and convert it into an immediate effect |
| `counter-convert` | apply | Change counters of one type into another, one for one |
| `sacrifice` | death-triggers | Destroy a friendly company deliberately; pays a benefit derived from its lost HP |
| `grant-shots` | apply | Restore or add ranged ammunition |
| `grant-extra-action` | turn-advance | Immediate or scheduled extra action, outside the morale meter |
| `delayed-trigger` | turn-advance | A stored effect that resolves at a named future round or condition |
| `mid-battle-resonance` | declare | Grant a school's resonance for the remainder of the battle |
| `hazard-hex` | tile registry | Persistent tiles that damage, heal, chill, or teleport on enter/turn-start |
| `mana-drain` | apply | Move mana between heroes |

**Adventure**

| Primitive | Behaviour |
|---|---|
| `hero-teleport-radius` | Move the caster to any explored tile within a computed radius, ignoring terrain and blockers, refusing occupied/illegal destinations |
| `terrain-ignore-day` | For the rest of the day, this hero pays a fixed cost per tile and may cross otherwise-impassable domains |
| `remote-mana` | Restore mana to a chosen owned hero anywhere on the map |
| `production-steal` | Redirect a number of days of an enemy mine's output |
| `enemy-movement-denial` | Zero a named enemy hero's remaining movement for N days |
| `prebattle-condition` | Attach a condition that applies at the start of a future battle (e.g. enemy companies begin Chilled) |
| `guardian-intel` | Exact counts and abilities within a radius |

All of these are ordinary serialized state and explicit replayable actions. Nothing here may consume
ambient randomness; `Wildcall` and `The Weather Itself` derive from the battle seed, and
`Fickle Weather` keeps the dedicated omen stream.

---

## 7. Counters become an economy

The four-counter system is the game's best combo substrate. This overhaul gives it payoffs at every
layer, so that "I am running a Burn deck" or "I am running a Chill lock" becomes a real build:

- **Payoff spells** — Detonate (consume a Burn pile for burst), The Turning Year (convert every
  counter on the field to one chosen type), Ashen Pall and Verdant Surge (mass application).
- **Persistence** — the Bellows relic stops your Burn decaying; Tallykeeper R2 slows enemy decay;
  Hex-Keeper's Locket already extends Hex.
- **Cap-breaking** — Hexwright's Tally raises your Hex cap to 15 on enemies only. The visible-pip
  rule survives because the cap change is a printed, inspectable artifact effect.
- **Creature hooks** — `hex_feeder`, `counter_eater`, `burn_conduit`, `bloomshare`, `echoing`
  (doc 63) make specific creatures worth recruiting *because of what your spellbook is*.
- **Twisters get real targets** — Amplify doubling a 9-pip Burn pile under Forgefire is finally a
  play worth building toward, not a curiosity.

No fifth counter is added. S05's prohibition stands.

---

## 8. Acquisition and discovery

Spells are the primary loot. Widen the channels:

| Channel | Change |
|---|---|
| Mage Guild | 1–5 with tier-gated deals (§3.2). Guild 4/5 are reveal events |
| Shrines | Gain a tier: ordinary school shrines teach tier 1–2; barrow shrines teach tier 3; a rare Reliquary of Pages teaches tier 4 |
| Scrolls | Tier 1–3 scrolls appear normally. **Tier 4–5 scrolls exist only in puzzle locks, barrows, and provenance sites.** Tier-5 scrolls are always stored Upgraded |
| Spell Tomes (new item kind) | A pickup that permanently teaches one named spell. Chests, locks, and the Reliquary Cairn |
| The Stacks (new site) | Pay 3 essence: draw 3 spells of tier ≤ your highest owned guild level, keep 1. Once per hero |
| Wild Shrine (new site) | Teaches one random spell weighted toward higher tiers. Once per hero. Pure gamble |
| Level draft | Add two rare cards from level 6: **Adept** (permanently reduce one known spell's mana by 2) and **Grimoire** (learn a random spell of tier ≤ ceil(level/3)) |
| Palimpsest | Unchanged mechanic; now draws within the guild's tier range, so it is far stronger at a Mage Guild 5 |

The anti-planning law is preserved throughout: no channel routes to a *named* uncommon or rare. The
Stacks and Palimpsest deal offers; every other channel deals outcomes.

---

## 9. Implementation phasing

The catalog in doc 61 marks each entry **P1** or **P2**. Ship in this order:

1. **Foundation** — tier field, mana rebanding, Mage Guild 4/5 and the deal rule, starting spells,
   `impact-damage`, universal counter scaling, mana regen, mass targeting, adventure time gates.
2. **P1 spells** — every new tier 1–2 spell plus the eleven highest-combo tier 3–4 spells
   (Detonate, Clockwork Double, Blink, Yoke, Puppet Strings, Grave Bargain, The Turning Year,
   Consecrated Ground, Reprise, Overclock, Dimension Door).
3. **P1 support** — the doc 63 abilities and artifacts those spells combo with, and the three new
   skills.
4. **P2** — remaining tier 3–5 spells, new neutral creatures, remaining artifacts and consumables.
5. **Combo acceptance** — doc 62's numbered combos become the integration test list.

Each phase updates its S-files and adds a DECISIONS entry in the same change, per S00.

---

## 10. Required specification amendments

| File | Amendment |
|---|---|
| **S01** — Target-scaling law | Add: "Flat *impact* damage that scales with Spell Power is outside this law. It is bounded instead by the army-HP curve: a fixed HP budget per cast becomes proportionally weaker as armies grow. Effects that remove a percentage of HP, disable, copy, or revive remain target-scaled." |
| **S01** — Balance posture | Add a **Variance posture** paragraph: high draw variance across guilds, drafts, scrolls, tomes, and chaotic sites is an intended product of the design, not a defect. Only non-terminating loops, strictly-correct openings, and fight-stalling combinations are degeneracy. A finite blowout produced by an assembled combination is the goal. |
| **S05** — Mana and casting | Field regen 2/day; Attunement R3 raises max mana to 12×Knowledge; add the impact-damage scaling clause; state that counter magnitude scaling applies to every counter application by default |
| **S05** — Spell acquisition | Mage Guild 1–5, deal counts, tier draw rule, guaranteed tier at levels 4–5, tier-4/5 scroll restriction, Spell Tomes, The Stacks, Wild Shrine |
| **S05** — new sections | Spell tiers; mass targeting; adventure `oncePerDay`/`oncePerWeek`; the effect-primitive registry in §6; the anti-loop rules in doc 62 §5 |
| **S04** — Deterministic damage | Note that impact damage bypasses the Attack/Defense multiplier and luck positioning but obeys Hex and `damage-routing` reducers |
| **S06** — Secondary skills | 21 → 24 skills; the reworked magic cluster; every hero begins with two tier-1 spells |
| **S07** — Common city tree | Mage Guild line becomes 1→2→3→4→5 with costs and prerequisites |
| **S09** — Catalog invariants | 124 spells (31 per school, tier distribution 8/8/7/5/3, each declaring a scaling shape); 30 skills; updated artifact and item counts; validators for tier legality, mana band per tier, primitive-handler coverage, and per-tier guild-pool non-emptiness |

Presentation follows automatically: `rulePresentation.ts` gains records for the new spells,
`spellLexicon.ts` gains terms for the new primitives (`impact damage`, `mind control`, `damage
link`, `resurrection`, `stun`, `clone`, `detonate`, `mass`), and doc 46/54's icon worklists grow.
Flavor for every new spell must be authored to the S01 writing register — one or two in-world
sentences, no numbers, no game terms — and added to `flavor.ts`; `spellFlavor()` will otherwise
throw on the new IDs.
