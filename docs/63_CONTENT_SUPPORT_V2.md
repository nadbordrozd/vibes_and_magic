# 63 — Content Support v2: Creatures, Artifacts, Consumables, Skills

**Status:** design work order. No code in this document.
**Depends on:** [60 Magic Overhaul](60_MAGIC_OVERHAUL.md), [61 Spell Catalog v2](61_SPELL_CATALOG_V2.md),
[62 Combo Design](62_COMBO_DESIGN.md).

Spells alone do not make a build. This document adds the other three quarters: creature abilities
that care what your spellbook is, artifacts that name a mechanic and warp it, consumables that break
the one-cast rule, and a reworked magic skill cluster. Every entry here exists to feed a numbered
combo or archetype in doc 62; nothing is here for volume.

---

## 1. Creature abilities

### 1.1 New ability registry entries

Each declares its pipeline stage per S02. None of these is faction-exclusive; they are assigned in
§1.2 and §1.3.

| Ability | Stage | Behaviour | Feeds |
|---|---|---|---|
| `hex_feeder` | damage-computation | This company deals +10% damage per Hex counter **on its target**, in addition to Hex's own +5%/pip | 62 §1.19 |
| `counter_eater` | turn-start | Consumes one counter of every type present on this company and gains +1 Attack per counter consumed until its next turn | Counter Alchemist |
| `burn_conduit` | apply | Its attacks move 2 Burn from itself to the target; if it carries none, it applies Burn 1 | Bonfire |
| `bloomshare` | turn-start | Bloom healing on this company also heals every adjacent ally for half | Counter Alchemist |
| `echoing` | apply (spell) | Spells your hero casts targeting this company gain +1 counter magnitude and +1 round of duration | All caster builds |
| `spell_battery` | — (hero cost hook) | While this company lives, your hero's spells cost 1 less mana, minimum 1 | All caster builds |
| `mana_leech` | apply | When it damages an enemy, the enemy hero loses 1 mana and your hero gains 1. Once per round | Anti-caster |
| `spell_shrug` | damage-routing | Takes half damage from impact spells | Counter-play to Evoker |
| `spellbound` | target-selection | Cannot be targeted by **any** spell, friendly or hostile | Counter-play; blocks Borrow Shape |
| `sniper` | damage-computation | Ignores the beyond-seven-hexes ranged penalty | Siege / Denial |
| `chain_shot` | apply | A shot also hits one company adjacent to the target for half damage | Siege / Denial |
| `first_strike` | retaliation | When attacked in melee it deals its retaliation **before** the attacker's damage applies; if the attacker is destroyed, the attack does not resolve | Attrition Wall |
| `phalanx` | damage-routing | Adjacent allied companies take 15% less damage | Attrition Wall |
| `unstable` | death-triggers | On destruction, deals 20% of its starting maximum HP to every adjacent company on both sides | Sacrifice Ledger |
| `soul_tithe` | death-triggers (global) | Whenever any enemy company is destroyed, this company gains +1 Attack for the rest of the battle | Action Economy |
| `blink_step` | activated, once per battle | Move to any legal empty hex its footprint fits | Puppeteer |
| `altar` | activated | Destroy an adjacent friendly **summoned** company; fully heal this one and grant your hero 2 mana | Duplicator, Sacrifice |
| `hedge_caster` | activated, once per battle | Cast one fixed tier-1 spell at Spell Power 3 without consuming the hero act. *Generalised into the full `caster` system by [doc 64](64_CREATURE_TRAITS_V2.md) §2; retained as its one-spell case* | Everyone |
| `ward_bearer` | target-selection | The first enemy spell each battle that targets an adjacent ally retargets to this company | Attrition Wall |
| `siphon` | apply | Half of the damage it deals heals the allied company with the lowest current HP | Attrition Wall |

**Strategic-strength note (doc 39).** Four of these have a stable, matchup-independent value
direction and belong in `STRENGTH_ABILITY_ADJUSTMENTS`: `sniper` +0.08, `first_strike` +0.10,
`phalanx` +0.06, `spell_shrug` +0.05. The rest are combo-, spellbook-, or choice-dependent and must
stay outside the scalar per doc 39's stated rule. The combined multiplier clamp of `[0.85, 1.35]`
is unchanged, and the calibration report must be regenerated.

### 1.2 Retunes to existing units

Several roster units currently carry zero or one bland ability. Give them a hook so that recruiting
them is a spellbook decision.

| Unit | Faction | Current | Add |
|---|---|---|---|
| Yeoman | Hearthguard | none | `phalanx` — the levy line that makes the army durable |
| Tin Soldier | Wound-Wrights | none | `counter_eater` — the toy that eats its own damage |
| Larval Tide | Vespiary | none | `altar` — the brood exists to be spent |
| Wax Servitor | Gloaming Court | `construct` | `ward_bearer` — the courtier who takes the curse |
| Longbowman | Hearthguard | `ranged` | `sniper` |
| Silk-Spinners | Vespiary | `ranged`, `web` | `chain_shot` |
| Bone Choir | Unfinished | `ranged`, `swelling_dirge` | `hedge_caster` (fixed spell: Wither) |
| Sentries | Unfinished | `still_on_watch` | `first_strike` |
| Fence-Post Familiars | Hagwood | `boundary` | `echoing` |
| Candle-Wisps | Unfinished | `flying`, `spirit`, `last_light` | `unstable` |
| Crow Chorus | Hagwood | `flying`, `beast`, `pecking_order` | `hex_feeder` |
| Marionette | Wound-Wrights | `no_retaliation` | `blink_step` |
| Drum-Callers | Wildergrass | `war_drums` | `soul_tithe` |
| Amber-Carriers | Vespiary | `resin_trail` | `bloomshare` |
| Rusalka | Hagwood | `spirit`, `beckoning_song`, `aquatic` | `siphon` |
| Grass-Serpent | Wildergrass | `beast`, `undergrass`, `aquatic` | `burn_conduit` |

This deliberately hands each faction at least one spellbook hook without touching the faction verbs
in S08. A Hearthguard player now has a reason to draft Craft impact spells (Longbowman + Shrapnel +
`sniper`); a Hagwood player has a reason to build Hex (Crow Chorus `hex_feeder` + Grudge).

### 1.3 New neutral creatures

Eight neutrals, recruitable through map dwellings, Diplomacy, Beast Tongue, and Beastmaster. Neutrals
are the right home for pure combo pieces: they are cross-faction, they carry the mixed-army morale
penalty as a real cost, and finding their dwelling is a discovery event.

| Creature | Culture | Tier | Abilities | Role |
|---|---|---:|---|---|
| **Seam Moth** | seamborn | 2 | `flying`, `spellbound`, `mana_leech` | Anti-caster. Cannot be buffed or hexed by anyone |
| **Chalk Wight** | seamborn | 3 | `echoing`, `spirit` | The company your hero casts everything on |
| **Ember Toad** | neutral beast | 2 | `beast`, `burn_conduit`, `spell_shrug` | Cheap Burn delivery |
| **Glass Hound** | Gloaming Court | 3 | `beast`, `blink_step`, `no_retaliation` | Mobile assassin, recruitable Blink |
| **The Tallyman** | Gloaming Court | 4 | `soul_tithe`, `first_strike` | Grows through a long fight |
| **Lantern Bearer** | Order of the Unstruck Bell | 3 | `hedge_caster` (fixed spell: Blessing), `ward_bearer` | A second, small caster |
| **Bone Orchard** | seamborn | 4 | `immobile`, `ranged`, `altar`, `construct` | Static emplacement that eats your summons |
| **Stitch-Ox** | seamborn | 5 | `phalanx`, `siphon`, hexSize 2 | The Attrition Wall's centrepiece |

All eight obey the S08 constraints: seamborn appear near seams, essence springs, and anomalies and
have no city; Gloaming Court entries use masks and glamour; the Unstruck Bell entry is a monk. Each
needs a distinct silhouette, one to two flavor sentences, and battle art.

---

## 2. Artifacts

Current catalog: 90 definitions (80 ordinary = 36 vanilla / 22 charm / 18 relic / 4 burden, plus
4 Kit and 6 trinket). Add **20 ordinary** artifacts: 8 charms, 8 relics, 4 burdens.

New totals: 36 vanilla / 30 charm / 26 relic / 8 burden = **100 ordinary**, 110 definitions. Update
the pinned counts in `validateArtifacts()` and S06/S09.

The design rule for this batch, borrowed wholesale from Slay the Spire relics: **an artifact should
name a mechanic and change its rules, not add a number.** Numbers are what the 36 vanilla pieces are
for.

### 2.1 Charms (+8)

| Artifact | Slot | Effect | Feeds |
|---|---|---|---|
| **The Bellows** | misc | Your Burn counters do not decay at turn end | 62 §1.1 |
| **The Nine-Pip Cord** | amulet | Counter magnitude scaling is +1 per 3 Spell Power instead of per 5 | Counter builds |
| **Ash Censer** | misc | Your impact spells deal +4 damage per point of Spell Power | Evoker |
| **Sapper's Chalk** | ring | Wall and undergrowth hexes you create are +2 in number and last the whole battle | Siege / Denial |
| **Loom of Small Repairs** | misc | Healing and resurrection you cast restore 50% more | Attrition Wall |
| **Puppeteer's Thimble** | ring | Mind control you cast lasts one extra round, and the returned company keeps its counters | Puppeteer |
| **The Quiet Ledger** | cloak | The first time each battle one of your companies is destroyed, your hero gains 6 mana | Sacrifice Ledger |
| **Beast-Caller's Cord** | misc | Companies you summon arrive with +1 speed and Bloom 2 | Beast / Duplicator |

### 2.2 Relics (+8)

| Artifact | Slot | Effect | Feeds |
|---|---|---|---|
| **Empty Reliquary** | misc | Spend a hero act to store one spell you cast. Later, release the stored spell without consuming a hero act. One stored spell at a time | Action economy |
| **The Cracked Prism** | head | Your single-target spells may choose one additional legal target; the second application is at half magnitude | Everything |
| **The Second Sunrise** | amulet | The first spell you cast each battle costs no mana | Everything |
| **Hexwright's Tally** | ring | Hex counters you apply to enemies cap at 15 instead of 9 | Chill/Hex lock |
| **The Grafted Hand** | weapon | You may cast twice in round one | Alpha strike |
| **Discordant Fork** | amulet | On any resonant battlefield, the resonance applies only to your side | 62 §1.7 |
| **The Whistling Kettle** | misc | At each round start, one counter pile on a random *enemy* company is doubled, chosen deterministically from the battle seed | Chaos |
| **The Tuning Peg** | boots | Your battle enchantments cannot be removed by Unmake or Sour, and you may hold three instead of two | Enchantment builds |

**Note on The Tuning Peg:** it is the one artifact that changes the two-slot enchantment rule in
S05. That rule is load-bearing and this is the deliberate, printed, findable exception. Upgraded
Unmake (doc 61) can still remove a protected enchantment, so there is an answer in the catalog.

### 2.3 Burdens (+4)

Burdens are the purest expression of the requested design: a large upside with an inspectable,
visible cost and a stated removal condition. S06's informed-consent rule applies to all four.

| Burden | Slot | Effect | Removal |
|---|---|---|---|
| **The Greedy Grimoire** | misc | +6 Spell Power. Your hero cannot use consumables | Teach a spell at a Hedge School |
| **The Loud Bell** | cloak | +4 Knowledge. Every enemy player permanently sees this hero's position | Fight a battle inside one of your own cities |
| **The Iron Tongue** | amulet | Your spells cost 2 less mana. You cannot cast in round one | Win a battle without casting a spell |
| **The Split Reed** | weapon | Your Upgraded spell rules always apply. Your hero's maximum mana is halved | Complete a Mage Guild 5 |

### 2.4 New artifact effect tags

`burn_no_decay`, `counter_scaling`, `impact_bonus`, `hex_cap`, `created_hex_bonus`, `heal_bonus`,
`control_duration`, `death_mana`, `summon_bonus`, `store_spell`, `extra_spell_target`,
`free_first_spell`, `round_one_double_cast`, `owner_only_resonance`, `random_counter_double`,
`enchantment_protection`, `enchantment_slots`, `no_consumables`, `visible_position`,
`mana_cost_reduction`, `no_round_one_cast`, `always_upgraded`, `max_mana_penalty`.

Each needs a registered handler; per RECONCILIATION_BUGS' standing complaint, wire them as
**effect-tag lookups**, not artifact-ID special cases. While in this area, close RB-001, RB-002, and
RB-003 (Gauntlet of the Second Throw, Candle-Snuffer's Ring, and the Long Spoon still have tags with
no consumer) — the Long Spoon in particular is already a counter-payoff artifact and belongs to the
Bonfire archetype.

---

## 3. Consumables

Consumables are the best burst channel in the game because they cost no mana and, with Alchemist R1,
no hero act. They are also the easiest thing to find. Add **12**, weighted toward breaking the
one-cast rule and toward one-shot combo pieces. Update the pinned item count in S09 (currently 37 —
verify the authored count before changing the assertion).

| Item | Use | Effect |
|---|---|---|
| **Vial of Borrowed Hours** | combat | One allied company immediately takes an extra action |
| **Wildfire Flask** | combat | Apply Burn 5 to one enemy and Burn 2 to every company adjacent to it |
| **Counterfeit Coin** | combat | Cast a copy of the last spell the enemy hero cast this battle, at your Spell Power, free |
| **Grave-Dust Sachet** | combat | The next company destroyed this battle, on either side, is resurrected on your side at 25% of its starting count |
| **Tuning Fork** | combat | Choose a school. Your spells of that school use their Upgraded rules for the rest of this battle |
| **Sealing Wax Cord** | combat | One of your battle enchantments becomes protected for the rest of the battle |
| **Iron Filings** | combat | One enemy company's counters are converted to Burn, one for one |
| **Loose Thread** | combat | Teleport one allied company to any legal empty hex |
| **Ledger Page** | combat | Your hero gains mana equal to the number of companies destroyed this battle, times 3 |
| **Nightjar Feather** | adventure | This hero ignores guardian aggro for the rest of today |
| **Surveyor's Twine** | adventure | Reveal a radius-8 circle anywhere on the map and show exact guardian counts inside it |
| **Spellbook Page** | adventure | Learn one random spell of tier ≤ 3 from a school you already know a spell in |

**Spell Tomes** (new item kind, per doc 60 §8): a pickup that permanently teaches one named spell.
Contents are seeded at map setup, revealed on pickup. Sources: chests, puzzle locks, the Reliquary
Cairn, and barrow rewards. Tier 4–5 tomes are lock- and barrow-only. This is the single most
valuable loot type in the game and should feel like it.

---

## 4. Secondary skills

> **Superseded by [doc 66](66_SKILLS_V2.md).** The three new skills and six reworks below are
> correct and are folded into doc 66's thirty-skill roster, which is the current contract. Read
> doc 66 instead of this section.

21 → **24**. Three new skills, six reworked. S06's pinned count and the draft pool both change; the
six-skill-per-hero cap is unchanged, which means the magic cluster now genuinely competes with the
movement and economy clusters for slots. That competition is the build decision.

### 4.1 New skills

**Evoker** — the impact-damage skill. Makes "my hero is the weapon" a real draft commitment.
1. Your impact spells deal +25% damage.
2. +50%, and your impact spells also apply Burn 1.
3. +75%, and once per battle an impact spell does not consume the hero act.

**Tallykeeper** — the counter skill. The spine of the Bonfire, Chill Lock, and Counter Alchemist
archetypes.
1. Counters you apply are +1.
2. Counters you applied to enemies decay one round later than normal.
3. Counters you apply to enemies cap at 12 instead of 9.

**Reliquarian** — the artifact skill. Rewards a loot-heavy run and gives Burdens a home.
1. +1 Misc equipment slot.
2. Charm artifacts you wear give 50% more of their numeric values.
3. You may unequip one Burden per game without satisfying its removal condition.

### 4.2 Reworked skills

| Skill | Change | Why |
|---|---|---|
| **Attunement** | R1 +2 field mana/day (on top of the new base 2). R2 +4/day and all spells cost 1 less mana. R3 +6/day and maximum mana becomes 12 × Knowledge | With tier-5 spells in the pool, the mana skill must reach the top of the ladder |
| **Twicetold** | Generalised from twisters to casting. R1 the first spell each battle costs half. R2 twisters use Upgraded rules. R3 once per battle a spell of tier ≤ 2 does not consume the hero act | Currently three twister-only ranks in a game with five twisters. Now the general action-economy skill |
| **Curse-Eater** | R1 counters on your companies decay by 2. R2 removed counters grant +5 morale each. R3 the first Hex or Burn applied to your army each battle is **redirected to an enemy company of your choice** | R3 was "redirect" with no stated destination; making it a redirect *to the enemy* turns a defensive skill into a combo piece |
| **Siegewright** | R1 enemy Walls bonuses halved. R2 Maker walls become 40-HP barriers **and every hex you create gains +10 HP**. R3 breach one wall before an assault, **and hexes you create last the whole battle** | Absorbs the created-hex domain so no separate Runewright skill is needed |
| **Alchemist** | R1 unchanged. R2 unchanged. R3 potions affect one additional target **and consumables you use may target any legal company regardless of range** | Makes the consumable build reach the whole board |
| **Spellthief** | R1 unchanged. R2 unchanged. R3 after battle, learn unknown enemy spells cast against you **including tier 4–5** | Currently the only skill that can hand you a tier-5 spell; say so explicitly |

### 4.3 Level draft additions

Two rare cards, available from level 6, dealt inside the ordinary three-card offer:

- **Adept** — choose one known spell; its mana cost is permanently reduced by 2, minimum 1.
- **Grimoire** — learn one random spell of tier ≤ `ceil(level / 3)` from a school you already know.

Both are explicit replayable choices per S02 and both respect the anti-planning law: Adept lets you
sharpen what you were dealt, Grimoire deals you more.

---

## 5. Acquisition sites

Three new map object kinds, per doc 60 §8. All three go in the registry, get presentation routing
per doc 41, and are placed on Manywhere (which must contain every registered kind) plus at least one
conquest map.

| Site | Behaviour |
|---|---|
| **The Stacks** | Pay 3 essence: draw 3 spells of tier ≤ your highest owned Mage Guild level, keep 1. Once per hero |
| **Wild Shrine** | Teaches one random spell, weighted toward higher tiers. Once per hero. No choice, no refund |
| **Reliquary of Pages** | A guarded reward site. Its reward is one tier-4 spell tome |

---

## 6. Validation and specification impact

| Area | Change |
|---|---|
| Units | 20 new ability IDs with registered handlers and declared stages; 16 unit retunes; 8 new neutral creatures with flavor, art subjects, and unique IDs |
| `army.ts` | Four new entries in `STRENGTH_ABILITY_ADJUSTMENTS`; regenerate `GUARDIAN_STRENGTH_CALIBRATION.md`; re-derive authored guardian counts on Crooked Crown and Sixfold Trial, which pin counts through `unitStrength` |
| Artifacts | 90 → 110 definitions (100 ordinary); update `validateArtifacts()` class counts and S06/S09; 23 new effect tags with tag-based handlers; close RB-001/002/003 |
| Items | +12 consumables and the Spell Tome kind; update the S09 item count and the sprite inventory in `adventureSpriteInventory.ts` |
| Skills | 21 → 24; update S06, the draft pool, class weights for the three new skills, and icon worklists |
| Map objects | 3 new kinds in `mapObjectRegistry.ts`, presentation routing, Manywhere coverage, map lint |
| Icons | Every new spell, skill, and lexicon term needs a 32×32 asset per docs 46 and 54; the manifest has no fallback path, so this is a hard gate on shipping any of it |
| Flavor | Every new spell, ability, creature, artifact, item, and site needs authored flavor to the S01 writing register. `spellFlavor()`, `unitFlavor()`, and `artifactFlavor()` will throw on unknown IDs |

**Sequencing note.** The icon and flavor gates are strict and non-negotiable in this codebase — a
new spell ID with no manifest entry fails validation, and there is no glyph fallback. Plan asset
generation in the same phase as each content batch, not after it.
