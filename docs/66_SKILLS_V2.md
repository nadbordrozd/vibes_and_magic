# 66 — Skills v2: Thirty Skills, Six Slots

**Status:** design work order. No code in this document.
**Depends on:** [60 Magic Overhaul](60_MAGIC_OVERHAUL.md), [63 Content Support v2](63_CONTENT_SUPPORT_V2.md)
§4, whose three new skills and six reworks are folded into the roster below. This document
supersedes doc 63 §4.
**Amends:** S06, S09.

---

## 1. The problem

Twenty-one skills, six slots per hero. That is a 29% sample and it should produce enormous build
variance — but it does not, because most of the pool is interchangeable. Count the skills whose
three ranks are *only* larger numbers: Logistics, Wayfaring, Command, Peddler, Ransomer, Forager,
Attunement, Provisioner. Eight of twenty-one, and several more are numbers with a condition.

S01 already states the standard: *"every skill rank must add behavior or a decision, except where a
tempo or economy number is itself the behavior."* The exception is legitimate — +30% movement really
is the behaviour, and Logistics does not need a verb at rank 1. But rank 3 of every skill should be
a **verb**: something you can now *do* that you could not do before. Today, eleven of twenty-one
rank-3s are just a bigger number.

Two changes follow: nine new skills that are verbs from rank 1, and a rank-3 audit of the existing
pool.

**The cap stays at six.** With thirty skills, a hero samples 20% of the pool. Two heroes in the same
run will rarely share more than two skills. That is the variance the brief asks for and it comes
free from widening the pool rather than from loosening the cap.

---

## 2. The thirty-skill roster

| # | Skill | Family | Status |
|---:|---|---|---|
| 1 | Logistics | movement | rank-3 rework |
| 2 | Scouting | information | unchanged |
| 3 | Wayfaring | movement | rank-3 rework |
| 4 | Diplomacy | neutral interaction | unchanged |
| 5 | Forager | economy | unchanged |
| 6 | Peddler | economy | rank-3 rework |
| 7 | Ransomer | economy | rank-3 rework |
| 8 | Attunement | magic | reworked *(doc 63)* |
| 9 | Spellthief | magic | reworked *(doc 63)* |
| 10 | Palimpsest | magic | minor extension |
| 11 | Twicetold | magic | reworked *(doc 63)* |
| 12 | Curse-Eater | magic | reworked *(doc 63)* |
| 13 | Ritualist | magic | unchanged |
| 14 | Alchemist | items | reworked *(doc 63)* |
| 15 | Chronicler | drafting | unchanged |
| 16 | Provisioner | items | unchanged |
| 17 | Command | army | unchanged |
| 18 | Warden | army | unchanged |
| 19 | Beastmaster | army | unchanged |
| 20 | Vanguard | army | unchanged |
| 21 | Siegewright | siege | reworked *(doc 63)* |
| 22 | **Evoker** | magic | **new** *(doc 63)* |
| 23 | **Tallykeeper** | magic | **new** *(doc 63)* |
| 24 | **Reliquarian** | items | **new** *(doc 63)* |
| 25 | **Tactician** | army | **new** |
| 26 | **Reaper** | army | **new** |
| 27 | **Quartermaster** | army | **new** |
| 28 | **Beguiler** | control | **new** |
| 29 | **Loremaster** | drafting | **new** |
| 30 | **Duelist** | hero combat | **new** |

Family spread after the change: movement 2, information 1, economy 4, magic 7, items 3, drafting 2,
army 6, control 1, siege 1, hero combat 1. The magic and army clusters are the deepest, which is
correct — those are the two axes the brief wants differentiated.

---

## 3. The six new skills

### Tactician — army
1. Your companies deploy one column further forward.
2. Designate one company on the hero screen; it deploys anywhere on your half of the field.
3. Your designated company takes the first turn of round one regardless of speed.

*Fluidity note (S01).* This must **not** introduce a pre-battle deployment screen — that is
explicitly forbidden. The rank-2 designation is made on the adventure-map hero screen and persists
until changed, exactly like equipping an artifact. Battle setup reads it and applies it silently.
The same rule governs the Odd Boot artifact in doc 65 §5.

### Reaper — army
1. After a victory, recover 10% of your casualties.
2. 20%.
3. After a victory, raise 15% of the **enemy's** casualties as your faction's tier-1 unit.

Rank 3 is necromancy as a skill and is deliberately one of the strongest things in the pool: it
converts a war of attrition into a snowball. It stacks with the Wound-Wright `spare_parts` passive
and with Mirele's `masterMender` specialty, which is fine — that combination is a build, and a
player who assembles it has earned it.

### Quartermaster — army
1. +1 army slot.
2. Your army suffers no mixed-faction morale penalty.
3. Once per week, recruit from any owned city without visiting it.

Rank 2 is the enabler for cross-faction rosters: it makes neutral combo creatures (doc 64) and
captured-city recruitment genuinely playable rather than a morale tax. **Cap total army slots at 9**
so Quartermaster R1 plus The Long Table (doc 65 §5) is the ceiling.

### Beguiler — control
1. One enemy company of your choice begins each battle at Chill 2.
2. Before any battle, you see the enemy hero's spellbook, mana, and equipped artifacts.
3. Once per battle, take control of one enemy company for one round. This does not consume the hero
   act and is eligible only against a company whose current total HP is at most `25 × your level`.

Rank 3 hands a mind-control verb to a hero who never learned Puppet Strings — a martial hero with a
magic trick. Its eligibility scales with hero *level* rather than Spell Power precisely so that a
Banneret or Ashrider can use it.

### Loremaster — drafting
1. +25% experience.
2. Shrines, Mage Guilds, Palimpsest, and The Stacks each offer one additional choice.
3. When you learn a tier 1–3 spell, you learn its Upgraded rules as well.

Rank 3 is quietly enormous: it retroactively upgrades most of your book and makes Consecrated Ground
and Seamstone redundant for low tiers, freeing them for tier 4–5. It is the "wide book" build's
payoff.

### Duelist — hero combat
1. +2 Attack and +2 Defense in any battle against another hero.
2. Enemy heroes cannot retreat or surrender against you.
3. On defeating an enemy hero, take one artifact of your choice from them — including on surrender,
   which normally protects the loser's equipment.

Completely dead in a peaceful exploration run and match-defining in an aggressive one. That is the
correct kind of variance, and it gives players a reason to draft toward the game they are actually
in rather than the game they planned.

---

## 4. Rank-3 rework audit

Four existing skills whose rank 3 is only a number get a verb. All other ranks are unchanged.

| Skill | Rank 3 now | Rank 3 becomes |
|---|---|---|
| **Logistics** | +30% movement; carry up to 300 unspent | +30% movement; carry up to 300 unspent; **once per week this hero's movement refreshes in full mid-turn** |
| **Wayfaring** | All terrain 90; no diagonal surcharge | As now, **and once per day this hero may enter one guardian aggro tile without triggering combat** |
| **Peddler** | Rates ×0.5; Trade Goods +50% | As now, **and once per week you may buy any Marketplace's scroll stock remotely, without a visiting hero** |
| **Ransomer** | Their re-hire cost doubles | As now, **and a hero you defeat cannot be re-hired by anyone for seven days** |

Ransomer R3 is the sharpest of these: removing an enemy hero from the game for a week is a real
strategic effect, where doubling a gold cost the AI can afford is not.

**Palimpsest** gains one line rather than a rework: rank 3 also functions at The Stacks (doc 60 §8),
so a Palimpsest hero draws four and keeps one there.

---

## 5. Level gating

Four skills are strong enough that finding them at level 2 would flatten the early game. Gate them
out of the draft pool until the hero reaches **level 5**:

- Reaper
- Beguiler
- Duelist
- Quartermaster

This creates a deliberate mid-game inflection: around level 5 the draft pool visibly widens and the
character you have been building can suddenly acquire a defining verb. It parallels Inscribe
(level 4) and the new Adept and Grimoire cards (level 6) from doc 60 §8, so the level-up draft has
three distinct escalation points rather than one.

Gating is on the *offer*, not on the rank. A hero who somehow holds a gated skill below level 5
keeps it.

---

## 6. Class weights

Every skill needs a `classWeight` entry for the six hero classes so drafts feel like the class you
picked. Pencilled emphasis:

| Class | Faction | Weighted toward |
|---|---|---|
| Banneret | Hearthguard | Command, Vanguard, Warden, Tactician, Duelist |
| Guildmaster | Wound-Wrights | Attunement, Palimpsest, Twicetold, Evoker, Reliquarian |
| Chandler | Unfinished | Reaper, Curse-Eater, Tallykeeper, Loremaster |
| Broodspeaker | Vespiary | Quartermaster, Beastmaster, Forager, Siegewright |
| Crone | Hagwood | Beguiler, Tallykeeper, Ritualist, Curse-Eater |
| Ashrider | Wildergrass | Logistics, Wayfaring, Vanguard, Duelist, Beastmaster |

Weights bias offers; they never force outcomes (S06). A Crone can still draft Siegewright.

---

## 7. Validation impact

| Area | Change |
|---|---|
| Counts | 21 → 30 skills. Update S06's pinned count, S09's invariants, and every draft-pool assertion |
| Draft pool | The ordinary pool becomes 4 stat cards + 30 skills + Inscribe (level 4) + Adept and Grimoire (level 6), with four skills gated to level 5 |
| Rarity accounting | S06 records Chronicler R3 and Twicetold R3 as rare for exposure purposes. Add Reaper R3, Beguiler R3, Duelist R3, and Loremaster R3 to that list |
| Army slots | Quartermaster R1 makes `MAX_ARMY_SLOTS` per-hero rather than a constant, capped at 9. Shared task with The Long Table (doc 65) |
| Battle setup | Tactician R1–R3 read a persisted adventure-map designation; **no pre-battle phase may be added** |
| Post-battle | Reaper R1–R3 hook the existing recovery handler alongside `spare_parts` and `masterMender` |
| Pre-battle info | Beguiler R2 extends the Scouting information surface rather than creating a second one |
| Icons | Nine new 32×32 skill icons per doc 46, or the split gate proposed in doc 65 §9 |
| Flavor | Nine new skill flavor lines to the S01 register in `flavor.ts` |
