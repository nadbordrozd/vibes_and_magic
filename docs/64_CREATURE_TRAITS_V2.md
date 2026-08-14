# 64 — Creature Traits v2: Resistance, Creature Casting, and Multi-Hex Attacks

**Status:** design work order. No code in this document.
**Depends on:** [60 Magic Overhaul](60_MAGIC_OVERHAUL.md), [63 Content Support v2](63_CONTENT_SUPPORT_V2.md).
**Amends:** doc 62 §4 (the "no magic resistance" bullet), S04, S09.

Doc 63 added twenty abilities that hook the spell layer. This document adds the three trait
*systems* that were missing, plus the trait families that make army composition a real decision:

1. **Resistance and immunity** — deterministic, per-creature, rationed.
2. **Creature casting** — companies with their own small spell repertoires.
3. **Multi-hex attack patterns** — hydras, breath weapons, lines, and blasts.
4. **Aura, threshold, positional, adventure, and drawback traits.**

---

## 0. Correction to doc 62 §4

Doc 62 listed "magic resistance as a universal stat" among things deliberately not added, on the
grounds that S05 forbids school opposition from becoming a damage-resistance rule. That reasoning
holds for a *universal* stat and does not hold for *per-creature abilities*. S05's sentence is
"Opposition guides acquisition weighting and voice, **not a universal damage-resistance rule**" —
it prohibits every unit silently carrying a resistance percentage, not a specific creature being
hard to burn.

**Amended position:** resistance exists as rationed creature abilities. No unit carries a hidden
resistance number; every resistance is a printed, inspectable ability on a named creature, and no
more than roughly one in five catalog units has one. That preserves S05's rule and gives the game
what it was missing: a reason to look at the enemy roster before choosing which spell to cast.

### 0.1 Determinism constraint

HoMM's magic resistance is a percentage roll. That is illegal here — S01 forbids hidden dice after a
commitment and S02 forbids ambient randomness. Every resistance below is therefore a **deterministic
translation** of the same feel:

| HoMM idiom | Deterministic form used here |
|---|---|
| "20% chance to resist" | "The first spell targeting this company each battle has no effect" |
| "Magic resistance 40%" | "Spell damage against this company is reduced by 40%" |
| "Immune to fire" | "This company cannot gain Burn" |
| "Immune to level 1–3 spells" | "Tier 1–2 spells have no effect on this company" |
| "Magic immune" | "Cannot be targeted by any spell, friendly or hostile" |

The last one is the strongest and cuts both ways — a magic-immune company cannot be healed,
resurrected, hasted, or Blessed by you either. That two-sided cost is what keeps it fair, and it is
why `spellbound` creatures are always cheap bodies rather than elite ones.

---

## 1. Resistance and immunity abilities

| Ability | Effect | Notes |
|---|---|---|
| `warded_hide:N` | Spell damage against this company is reduced by N% | N ∈ {25, 40, 60}. Applies at `damage-routing` alongside Mourner's Veil and Ironclad |
| `spell_shrug` | Impact-spell damage halved *(from doc 63)* | The common, cheap form. Equivalent to `warded_hide:50` restricted to impact |
| `low_magic_immune` | Tier 1 and tier 2 spells have no effect on this company | The most interesting one. Your cantrips do nothing; you must spend real mana |
| `school_resistant:<school>` | Single-target spells of that school have no effect. Mass and enchantment effects still apply | Rationed to thematic pairings (§4) |
| `unburnable` / `unchillable` / `unhexable` | Cannot gain that counter. Existing counters are removed on acquisition | The cleanest resistance shape; reads instantly on the pip row |
| `spell_ward:N` | The first N spells each battle that target this company have no effect | N is 1 or 2. Deterministic answer to "chance to resist" |
| `spell_deflect` | The first enemy spell each battle that targets this company instead targets a company on the caster's side, chosen by the defender | Mirror-Bound flavour; a rare relic-tier ability |
| `spellbound` | Cannot be targeted by **any** spell, friendly or hostile *(from doc 63)* | Also blocks Borrow Shape, Puppet Strings, Yoke, and every buff you own |
| `spell_frail` | Takes 50% more spell damage and counters applied to it are +1 | The **downside** tag. Pays for oversized bodies |

**Rationing rule for the validator:** no more than 20% of catalog units may carry any resistance
ability, no more than two units per faction may carry `low_magic_immune` or `school_resistant`, and
at most three units in the entire catalog may carry `spellbound`. Ubiquitous resistance turns the
Evoker archetype from a build into a coin flip.

**Counter-play must exist for every resistance.** `spellbound` companies are still hit by mass
effects that do not "target" (Storm, Reckoning, Harvest, The Unmaking Engine), by hazard tiles, and
by ordinary weapons. `low_magic_immune` folds to a tier-3 spell. `school_resistant` folds to any
other school. This is a list of puzzles, not a list of walls.

---

## 2. Creature casting

Some companies should be small casters in their own right. Thematically this belongs to the Hagwood
(everything is bargained or grown), the Unfinished (they continue their obligations), and a handful
of neutral cultures — never to the martial factions, whose identity lies elsewhere.

### 2.1 The `caster` ability

A unit definition carrying `caster` declares:

```text
caster: {
  repertoire: SpellId[]   // 1–3 spells, normally tier 1–2
  charges: number         // per COMPANY per battle, never per unit
  castPower: number       // fixed effective Spell Power, does not vary with count
}
```

Rules:

- Casting is the **company's action** for the turn. It replaces moving and attacking. This is the
  opposite of hero casting, which does not consume a stack action — and it is what keeps a company
  of casters from being strictly better than a company of attackers.
- Casting does **not** consume the hero act. A hero and a caster company can both act in the same
  round. That is the point: creature casters are a second caster you recruit rather than draft.
- `charges` are per company per battle and **must not scale with unit count**. A stack of 40
  Fence-Post Familiars has the same three charges as a stack of 3. This is the single most important
  anti-abuse rule in the system.
- `castPower` is a fixed printed value and does not scale with count, hero stats, or level. It is
  usually 1–5, i.e. well below a developed hero.
- Repertoires are independent of the hero's spellbook. A Hearthguard hero who recruits a Bone Choir
  gains access to Grave magic they never learned. This is deliberate and is a real reason to pay the
  mixed-faction morale penalty.
- The existing `abilitiesSuppressed` check covers this for free: Brittle and Oathbind shut a caster
  company down. So does `spellbound` on the intended target.
- Legal casts enumerate through `legalBattleActions` like every other activated ability, so UI, AI,
  and replay all work without special cases. AI uses the spell's existing `aiHints`.
- A creature cast is a spell for every other purpose: Standing Mirror copies it, Sanctuary blocks
  it, resonance upgrades it, Curse-Eater responds to it.

### 2.2 Repertoire assignments

| Company | Faction | Repertoire | Charges | Power |
|---|---|---|---:|---:|
| Fence-Post Familiars | Hagwood | Pinch of Ash, Grudge | 3 | 1 |
| Leshy | Hagwood | Bramblelash, Thicket | 2 | 5 |
| Bone Choir | Unfinished | Wither, Grave-Chill | 2 | 3 |
| The Brides | Unfinished | Second Wind, Mourner's Veil | 2 | 4 |
| The Half-Woken Queen | Vespiary | Bloom, Sap and Sinew | 2 | 5 |
| Lantern Bearer *(new)* | Unstruck Bell | Kindle, Blessing | 3 | 3 |
| Bellfounder *(new)* | Unstruck Bell | Steady Hands, Clarion | 2 | 3 |
| Whistling Nan *(new)* | Hagwood/neutral | Wither, Quiet | 3 | 4 |

This supersedes doc 63's `hedge_caster`, which becomes the degenerate one-spell case of `caster`
(`repertoire` of length 1, `charges: 1`). Keep the simpler tag for units that only need one trick.

### 2.3 Why this matters for the brief

A creature caster is a *second* hero act per round that no artifact grants. Recruiting Fence-Post
Familiars means your Hagwood hero casts Wither while the familiars cast Grudge — two Hex applications
per round from turn one, at level 1, with no guild built. That is goal 1 delivered through the army
rather than through the hero, and it makes the recruitment screen a spellbook decision.

---

## 3. Multi-hex attack patterns

### 3.1 Shared rules

Every pattern below obeys these, so the coding agent implements one framework and six shapes:

- Patterns operate over the **union of occupied hexes** for wide footprints, per S02.
- Only the **primary target** retaliates, and only if the pattern says it may. Secondary victims
  never retaliate — they were struck simultaneously.
- Damage to secondary victims is a printed fraction of the computed damage. Attack/Defense,
  luck position, Hex, and all `damage-routing` reducers are recomputed per victim.
- Riders (counters, `pecking_order`, `web`, `storm_wake`) apply to the **primary target only**
  unless the pattern states otherwise.
- Patterns that can strike friendly companies say so. That is not a bug; it is the positioning cost
  that makes them interesting rather than free.
- Each destroyed company resolves its own death triggers and its own S04 destruction-proportionality
  scale, in a stable order: primary first, then secondaries by ascending stack ID.
- Ranged patterns spend one shot regardless of how many companies are hit.

### 3.2 The six patterns

| Pattern | Shape | Damage | Retaliation | Friendly fire |
|---|---|---|---|---|
| `all_adjacent` | Melee. Strikes every **enemy** adjacent to the attacker's footprint | Full to all | None from anyone | No |
| `breath` | Melee. Also strikes whatever occupies the hex directly beyond the target along the attack axis | Full to both | Primary only | **Yes** |
| `cleave` | Melee. Also strikes the companies in the two hexes flanking the primary target | Half to flanks | Primary only | **Yes** |
| `line_strike:N` | Attack strikes every company in a straight line from the attacker, up to N hexes | 100% / 75% / 50%, then 50% | None | **Yes** |
| `blast_shot` | Ranged. Strikes the target hex and every hex adjacent to it | Full to primary, half to the rest | None | **Yes** |
| `arc_shot` | Ranged. Jumps from the target to the nearest enemy, up to three companies total | 100% / 70% / 50% | None | No |

`chain_shot` from doc 63 is retained as the light form of `blast_shot`: target plus one adjacent
company, half damage. It stays on tier-3 shooters; `blast_shot` is for tier 5–6.

**Balance shape, not balance numbers.** `all_adjacent` is enormous and belongs only on slow, tough,
expensive creatures — the whole point of the Sleeper being speed 3 and the Nine-Mouthed Well being
`slow_witted`. `breath` and `cleave` belong on fast attackers, where the friendly-fire risk is real
because your own line is behind the enemy. `line_strike` belongs on lightning and lances.

### 3.3 Pattern assignments

| Company | Faction | Pattern | Reasoning |
|---|---|---|---|
| Lance Knight | Hearthguard | `line_strike:3` | A couched lance drives through the rank behind |
| Oriflamme Wyvern | Hearthguard | `breath` | Tier-6 flyer; the faction's only area attack |
| Wooden Colossus | Wound-Wrights | `cleave` | Enormous limbs, plus `spell_frail` as the cost |
| Reliquary Ark | Wound-Wrights | `blast_shot` | A rolling reliquary that scatters what it carries |
| The Ferry | Unfinished | `all_adjacent` | It gathers everyone adjacent at once. Fits the psychopomp read exactly |
| Dragonfly Cavalry | Vespiary | `line_strike:2` | Skim already gives a second target; the line replaces it at tier 5 |
| Leshy | Hagwood | `all_adjacent` | Branches in every direction |
| The Walking Hut | Hagwood | `cleave` | It stamps |
| Grass-Serpent | Wildergrass | `all_adjacent` | Coils and strikes the whole ring |
| Thunderbird | Wildergrass | `line_strike:4` | The lightning creature. Its signature |
| Aurochs Herd | Wildergrass | `cleave` | Alongside the existing `trample` |
| The Sleeper | seamborn | `all_adjacent` | Three hexes, speed 3, full heal — the boss puzzle |

Every playable faction gets at least one multi-hex attacker and no faction gets more than two, so
the pattern reads as an identity rather than a default.

---

## 4. Other trait families

### 4.1 Aura traits (passive, affect neighbours)

| Ability | Effect |
|---|---|
| `phalanx` *(doc 63)* | Adjacent allies take 15% less damage |
| `dread` | Adjacent enemies lose 10 morale at each round start |
| `hearth` | Adjacent allies gain Bloom 1 at each round start |
| `standard_bearer` | Adjacent allies ignore the mixed-faction morale penalty |
| `quench` | Adjacent companies on both sides cannot gain Burn |

### 4.2 Threshold traits (grow or change on a condition)

| Ability | Effect |
|---|---|
| `cornered` | +1 Attack for every 20% of its starting count it has lost |
| `soul_tithe` *(doc 63)* | +1 Attack for the battle whenever any enemy company is destroyed |
| `swelling_dirge` *(existing)* | Damage scales with total companies destroyed |
| `first_blood` | Its first attack of the battle deals double damage |
| `last_stand` | While it is your only surviving non-summoned company, it takes half damage and retaliates without limit |

### 4.3 Positional traits

| Ability | Effect |
|---|---|
| `ambush` | Deploys on any legal hex on its own half of the field rather than in the deployment column |
| `burrow` | Activated: leaves the field; returns at the start of its next turn on any legal empty hex |
| `blink_step` *(doc 63)* | Activated once per battle: move to any legal empty hex |
| `rear_guard` | Cannot be melee-attacked while another allied company is adjacent to the attacker |
| `wall_walker` | Ignores wall hexes and siege walls for movement and does not block them |

### 4.4 Adventure-facing traits — a new axis

Nothing in the current catalog makes a creature worth carrying for reasons outside combat. This is
an entirely unused design space and it is cheap to implement: each is a passive that checks the
hero's army once per day.

| Ability | Effect |
|---|---|
| `pathfinder` | While in the army, the hero pays 100 movement in Deepwood, Mosswold, and The Hush |
| `beast_of_burden` | +150 hero movement per day |
| `ley_touched` | +1 hero mana per day |
| `tithe_bearer` | +50 gold per day |
| `far_sighted` | +2 to the hero's reveal radius |
| `carrion_sense` | Reveals guarded reward objects within 5 tiles |
| `sea_legs` | The army embarks and disembarks for 150 movement instead of 300 |

Carrying one Fence-Post Familiar for `ley_touched`, or one cheap flyer for `far_sighted`, becomes a
genuine army-slot decision against a seventh combat company. That is a new strategic choice for free.

### 4.5 Drawback traits — informed-consent power

The Burden pattern applied to creatures. A drawback lets a tier-3 creature carry tier-5 power, which
is exactly the kind of lopsided, memorable content the brief asks for.

| Ability | Effect |
|---|---|
| `mindless` | Cannot receive morale extra actions; also immune to morale drains |
| `feral` | If it begins its turn with no allied company adjacent, it attacks the nearest company of any side |
| `hungry` | Costs 100 gold per day while in an army; if you cannot pay, it leaves at week start |
| `slow_witted` | Always acts last in the round regardless of speed |
| `brittle_bones` | Takes 25% more melee damage |
| `unruly` | Cannot be targeted by allied spells (but can be by enemy ones) |

Every drawback must be visible on the recruitment card before purchase, per S01's inspection law.

---

## 5. New creatures

Five, each existing to showcase one of the systems above. These are in addition to doc 63's eight.

| Creature | Culture | Tier | Traits | Role |
|---|---|---:|---|---|
| **The Nine-Mouthed Well** | seamborn | 5 | hexSize 3, `all_adjacent`, `unstable`, `slow_witted` | The hydra. Devastating in a crowd, always acts last, explodes on death |
| **Kiln Drake** | neutral beast | 5 | `flying`, `beast`, `breath`, `unburnable`, `hungry` | The dragon, with a gold upkeep. Its breath hits your own line if you position badly |
| **Whistling Nan** | Hagwood | 4 | `caster` (Wither, Quiet), `hex_feeder`, `dread` | A recruitable hexer. The Hagwood's second caster |
| **The Unbaptized** | Unfinished | 3 | `spellbound`, `mindless`, `cornered` | A cheap magic-proof wall you also cannot buff or heal |
| **Bellfounder** | Unstruck Bell | 4 | `caster` (Steady Hands, Clarion), `low_magic_immune` | Timing blessings, per S08's description of the Order |

All five obey S08: seamborn cluster at seams and anomalies and have no city; the Unstruck Bell
entries are monks tending mechanisms they did not make; Hagwood names are folkloric. Each needs a
distinct silhouette, flavor to the S01 register, and battle art.

---

## 6. Engine and validation impact

| Area | Change |
|---|---|
| Ability registry | ~35 new ability IDs across §1–§4, each declaring a pipeline stage per S02 |
| Attack pipeline | One shared multi-hex pattern framework at `target-selection` → `damage-computation` → `apply`, with the §3.1 rules; six pattern shapes on top of it |
| Spell resolution | Resistance checks at `target-selection` (immunity, ward, deflect, tier gate) and `damage-routing` (reduction). A blocked spell must still consume the cast and report a clear reason |
| Unit schema | `caster` block on unit definitions; `resistance` and `pattern` fields; validator for the §1 rationing rule |
| Legal actions | Creature casts enumerate through `legalBattleActions` with the spell's own targeting rules |
| Adventure loop | §4.4 traits evaluate once per day against each hero's army |
| `army.ts` | Strength adjustments for the stable-direction traits only: `all_adjacent` +0.20, `breath` +0.12, `line_strike` +0.10, `cleave` +0.08, `blast_shot` +0.12, `arc_shot` +0.10, `warded_hide` +0.06, `low_magic_immune` +0.08, `spellbound` +0.05, `caster` +0.10, `spell_frail` −0.06, `slow_witted` −0.10, `hungry` −0.05, `mindless` −0.04, `brittle_bones` −0.06. Everything matchup-dependent stays outside the scalar per doc 39. The `[0.85, 1.35]` clamp is unchanged; regenerate the calibration report and re-derive Crooked Crown and Sixfold Trial guardian counts |
| S04 | Document the multi-hex retaliation and proportionality rules from §3.1 |
| S05 | Document creature casting as a spell source distinct from the hero act, and the resistance vocabulary as printed per-creature abilities rather than a universal rule |
| S09 | Unit-catalog invariants: resistance rationing, `caster` charge-independence from count, one pattern per unit maximum, every drawback visible on the recruitment card |

**Test priorities.** The charge-independence rule (§2.1), the multi-hex retaliation rule (§3.1), and
the two-sided cost of `spellbound` are the three places where a plausible implementation shortcut
silently breaks the design.
