# Faction Implementation: The Hearthguard & The Wound-Wrights

Replaces the placeholder Crimson/Azure factions from `04_POC_SPEC.md`. Everything not specified here inherits from the PoC spec and `03_MECHANICS.md`. All content goes in data files under `src/content/factions/`; all new abilities go through the ability registry and hook named pipeline stages. Log judgment calls in `docs/DECISIONS.md`; do not ask.

Scope note: 5 unit tiers per faction for this milestone (roster expands to 7 later — leave tier numbering room). No spells yet. Both factions' identities are built entirely on existing engine systems: the morale meter, luck-based damage positioning, casualty accounting, and the resolution pipeline.

---

## 1. The Hearthguard (replaces Crimson; Player 1 / west)

Identity: the host-world kingdom. Steady lines, banners, discipline. Mechanical verb: **morale-meter manipulation** — they generate extra actions and resist meter drain.

**Faction passive — `steadfast`** (hook: death-triggers stage): when an allied stack is destroyed, other Hearthguard stacks lose 15 meter instead of the standard 30.

**Hero:** the Banneret. Starting stats A2 D2 SP1 K1. Class draft weights: Attack 35 / Defense 35 / Spell Power 10 / Knowledge 20. Hero morale bonus: +5 meter to all allied stacks per round start (this uses the existing hero-morale-bonus hook; Hearthguard is the faction where it's nonzero).

**Units** (HP / dmg min–max / A / D / spd / growth / cost / abilities):

| Tier | Unit | HP | Dmg | A | D | Spd | Growth | Cost | Abilities |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Yeoman | 7 | 1–2 | 2 | 3 | 5 | 14 | 70g | — |
| 2 | Longbowman | 11 | 2–4 | 5 | 3 | 4 | 9 | 180g | `ranged` (12 shots) |
| 3 | Bannerman | 26 | 4–7 | 7 | 7 | 5 | 6 | 320g + 1 iron | `banner` |
| 4 | Lance Knight | 45 | 8–13 | 10 | 9 | 8 | 4 | 650g + 1 iron | `charge` |
| 5 | Oriflamme Warden | 130 | 18–28 | 14 | 14 | 6 | 2 | 1600g + 3 iron | `oriflamme` |

**Ability definitions:**
- `banner` (hook: turn-advance / round-start): allied stacks adjacent to this stack at round start gain +10 meter.
- `charge` (hook: damage-computation): +5% damage per hex moved in a straight line immediately before this attack, cap +50%.
- `oriflamme` (hooks: turn-advance + death-triggers): all allied stacks gain +5 meter at round start (stacks with hero bonus); allied stacks lose 0 meter (instead of 15/30) when an allied stack is destroyed. Does not stack with itself (multiple Wardens grant it once).

**Flavor register** (one line each, for tooltips): plain, warm, proud. e.g. Yeoman: "He was at the harvest last month. He will be at the next one." Oriflamme Warden: "The banner's cloth predates the kingdom. Nobody weaves like that now."

**Visual (SVG tokens):** palette warm red `#b03a2e` + cream `#f5ead6`; unit glyphs use upright rectangles/shield outlines; faction letter set: Y, L, B, K, W.

## 2. The Wound-Wrights (replaces Azure; Player 2 / east)

Identity: a pious construct-guild fielding "saints' bodies" — lacquered, jointed, bright, and quietly uncanny. Mechanical verb: **duplication & repair** — cheap mass production and losses that come back. They trade weaker per-gold stats for loss forgiveness: the attrition-tempo faction.

**Faction passive — `spare_parts`** (hook: post-battle resolution, victories only): for each Wound-Wright stack that ends a won battle with ≥1 unit alive, 30% (round down) of that stack's losses in the battle are restored. Fully destroyed stacks are not restored. UI: battle-result screen shows "recovered" count per stack.

**Hero:** the Guildmaster. Starting stats A1 D2 SP1 K2. Class draft weights: Attack 20 / Defense 35 / Spell Power 15 / Knowledge 30. Hero morale bonus: 0.

**Units:**

| Tier | Unit | HP | Dmg | A | D | Spd | Growth | Cost | Abilities |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Tin Soldier | 5 | 1–3 | 3 | 2 | 5 | 16 | 55g | — |
| 2 | Hobby Knight | 15 | 3–5 | 5 | 4 | 7 | 9 | 210g | `springloaded` |
| 3 | Marionette | 12 | 6–10 | 9 | 2 | 6 | 6 | 340g + 1 essence | `no_retaliation` |
| 4 | Stuffed Sentinel | 70 | 6–9 | 7 | 13 | 4 | 4 | 600g + 1 iron | `soft_body` |
| 5 | Wooden Colossus | 150 | 15–25 | 13 | 12 | 5 | 2 | 1500g + 2 iron + 1 essence | `overwind` |

**Ability definitions:**
- `springloaded` (hook: damage-computation): this stack's first attack each battle deals +50% damage.
- `no_retaliation` (hook: retaliation stage): melee attacks by this stack are never retaliated.
- `soft_body` (hook: damage-computation): damage dealt TO this stack always resolves at the minimum of the attacker's damage range, overriding attacker luck positioning. (This is the first effect that overrides the luck system — implement it as a pipeline modifier, not a special case in the damage function.)
- `overwind` (hooks: declare + turn-advance): activated option on the stack's turn — take one extra full action immediately after this one; the stack then skips its entire next round. AI use: only when it can destroy a stack with the extra action.

**Flavor register:** reverent guild-speak that never quite sees what we see. Tin Soldier: "Cast from the holy molds, rank upon rank, as the Founders intended." Stuffed Sentinel: "It has taken a thousand blows and complained of none. The stitching is ritual." Wooden Colossus: "Its joints are original. The Guild only winds it."

**Visual (SVG tokens):** palette lacquer blue `#2e5fb0` + tin `#c9ced6` + accents of nursery red/yellow on tier badges; unit glyphs use circles with visible joint-lines (a chord across the circle); faction letter set: T, H, M, S, C.

## 3. Faction buildings (add to castle build tree, both castles)

- Hearthguard — **Chapel of the Banner**: 1000g + 2 essence, requires T3 dwelling. Effect: hero morale bonus +5 (total +10/round).
- Wound-Wrights — **Guild Workshop**: 1200g + 2 essence, requires T3 dwelling. Effect: `spare_parts` recovery 30% → 50%.
- Dwelling tree (both factions): T1 prebuilt; T2 1200g + 3 timber; T3 2000g + 4 timber + 1 iron (req T2); T4 3200g + 4 timber + 3 iron (req T3); T5 5500g + 6 timber + 5 iron (req T4). Treasury and Walls unchanged from PoC spec.

## 4. Map & AI updates

- Starting armies: Hearthguard hero 25 Yeomen + 6 Longbowmen; Wound-Wrights hero 30 Tin Soldiers + 4 Hobby Knights.
- Guardians (mirrored as before, swap analogues): gold mines 35 Yeomen (west) / 40 Tin Soldiers (east); iron mines 10 Bannermen / 10 Marionettes; essence springs 8 Bannermen / 8 Marionettes; central neutral gold mines 2 Oriflamme Wardens / 2 Wooden Colossi; chests 18 Yeomen / 20 Tin Soldiers.
- Combat AI additions: understands `overwind` (rule above), values `banner`/`oriflamme` carriers at 1.5× in target selection (kill the banner first), and never counts on `spare_parts` when computing whether to take a fight.
- Sim acceptance addition: `npm run sim -- --games 200` Hearthguard-vs-Wound-Wrights win rate within 35–65%. If outside, tune unit stats (growth and cost first, HP/damage second); log every tuning change in DECISIONS.md with before/after win rates.

## 5. Tests (minimum new coverage)

- Each ability: one unit test per pipeline hook, plus one interaction test: `soft_body` vs `charge` (charge bonus applies to the multiplier, soft_body pins the base roll to range-min — expected damage asserted numerically), `banner` + hero bonus + `oriflamme` stacking to a known meter value, `overwind` skip-next-round bookkeeping across round boundaries, `spare_parts` rounding at 1, 2, 3 losses.
- Replay regression: one scripted full battle per faction pair checked against a golden result file.
