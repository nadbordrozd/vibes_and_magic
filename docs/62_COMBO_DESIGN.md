# 62 — Combo Design: Intended Cheese, Build Archetypes, and Loop Bounds

**Status:** design work order. No code in this document.
**Depends on:** [60 Magic Overhaul](60_MAGIC_OVERHAUL.md), [61 Spell Catalog v2](61_SPELL_CATALOG_V2.md),
[63 Content Support v2](63_CONTENT_SUPPORT_V2.md).

This document is the *point* of the overhaul. Docs 60 and 61 add parts; this one names the machines
those parts are for. It has three jobs:

1. Prove the new content actually combines, rather than being 52 unrelated spells.
2. Give the coding agent an integration-test list. Every numbered combo below is an acceptance case:
   it must be reachable, it must resolve deterministically, and it must produce roughly the stated
   outcome.
3. Draw the line between *intended blowouts* (the product) and *loops* (bugs).

---

## 1. The intended cheeses

Each entry names its pieces, the outcome, and the bound that stops it becoming infinite. "Bound" is
the honest answer to "why isn't this always correct?" — usually acquisition cost, the one-cast-per-
round rule, or a printed eligibility cap.

### 1.1 The Bonfire — Burn detonation

**Pieces:** Forge-Spark (Craft T1) · Amplify (Rite T2) · Forgefire (Craft T3, ench) · Detonate
(Craft T3) · optional: Forge-Ash Gauntlets, the Bellows relic, Gravebinder's Sash.

**Play:** Round 1 Forge-Spark for Burn 4 (+SP scaling). Round 2 Amplify doubles the pile to 8–9.
Round 3 establish Forgefire, then round 4 Detonate consumes the pile for `9 × (8 + 3×SP)` — at SP
6 that is 234 damage to a single company from a school whose tier-1 spell costs four mana. Forgefire
doubles the Burn tick before detonation; the Bellows stops the caster's enemy Burn pile decaying
while the four-cast setup resolves.

**Bound:** four rounds and four casts, during which you have cast nothing defensive. The pile caps
at 9. Requires two tier-3 spells from two different guild levels plus a Rite twister, so it is a
Hearthguard-pair or a lucky cross-school draw.

**Engine needs:** `counter-detonate` removes the pile *before* computing damage, so Amplify cannot be
cast in response to the detonation.

### 1.2 The Martyr's Knot — control and redirect

**Pieces:** Puppet Strings (Grave T3) · Yoke (Grave T2) · any damage.

**Play:** Puppet Strings a mid-sized enemy company. Yoke it to the enemy's *largest* company at 50%
(75% Upgraded). Now spend two rounds beating the puppet to death with your whole army: every point
lands on the doomstack as well. When control expires, the puppet returns to its owner ruined.

**Variant — the sacrifice:** Puppet Strings, then **Grave Bargain** the controlled company. You
destroy an enemy stack outright, gain mana equal to 10% of its starting max HP, and every one of
your companies gains 25 morale and Bloom 3. This is the closest analogue to the H4 Hypnotize+Martyr
cheese and it is explicitly permitted.

**Bound:** Puppet Strings is eligible only against a company whose current total HP is at most
`40 × SP` — the target-scaling law doing its job. A company may be controlled only once per battle
by either side. Yoke is one link per company. Two casts across two rounds. Grave Bargain cannot
target the last surviving allied company; a controlled company counts as allied for that check, so
you cannot sacrifice a puppet as your final body.

### 1.3 The Quiet Yard — wall and shoot

**Pieces:** Wall of the Maker (Craft T2) or Bulwark (Craft T4) · Ammunition Cart (Craft T2) ·
Shrapnel (Craft T1) · a ranged company · optional: Chalkmaster's Ring, Sapper's Chalk, Siegewright
R2, the `sniper` ability.

**Play:** Seal the approach lanes with wall hexes, refresh ammunition, and shoot from behind them.
Upgraded Ammunition Cart removes the beyond-seven-hexes penalty, so the whole board is in range.
Shrapnel makes each shot an area attack. A pure-melee enemy army loses without touching you.

**Bound:** the board is 13×9 and flying, phased, and `thicket_walk` companies ignore walls entirely.
Any enemy ranged company or hero spell answers it directly. Wall hexes are attackable. This is a
matchup-dependent hard counter — the correct kind, because the enemy's roster is visible before the
fight.

### 1.4 The Shared Grave — enemy-to-enemy linking

**Pieces:** Yoke (Grave T2) · any mass effect — Storm, Reckoning, Ashen Pall, The Unmaking Engine,
Harvest, Wind Shear.

**Play:** Yoke the enemy's two largest companies to each other, then cast a mass effect. Each company
takes its own share plus 50–75% of the other's. Against an army of two big stacks this is close to
doubling your nuke.

**Bound:** one Yoke per company, three rounds, and it is symmetric — an enemy Unmake or Sour removes
the Standard version. Mass effects are tier 3+.

### 1.5 The Standing Cold — chill lock

**Pieces:** Grave-Chill (Grave T1) · Overgrow (Wild T2) · Ashen Pall Upgraded (Grave T3) ·
Amplify (Rite T2) · optional: Tallykeeper R2, Hexwright's Tally.

**Play:** Chill 3 on a central enemy company, Overgrow spreads it to every adjacent company at the
same magnitude, Amplify doubles the pile, Upgraded Ashen Pall stops enemy counters decaying for a
turn. An enemy melee line at speed 1 crosses the board in nine rounds and never reaches you.

**Bound:** Chill can never reduce speed below 1, so a fast army still functions. Flying and ranged
companies are unaffected in practice. Requires three schools' worth of draws.

### 1.6 The Reprise Chain — action economy

**Pieces:** Reprise (Rite T4) · Litany of Dawn (Rite T3) · Command R3 · Banner of the First Field
(morale threshold 80) · Standard of Dawn Upgraded · Vanguard R3.

**Play:** Litany of Dawn sets every company to maximum-damage next attack and floods 40 morale.
Command R3 starts companies at 20 and adds 10 per round. With the threshold at 80, several companies
break threshold in the same round. Upgraded Standard of Dawn grants a further extra action on the
first kill. Reprise adds two more. A single round can contain eight to ten company actions.

**Bound:** morale is spent when consumed and drains hard when an ally dies; the whole chain is one
round of setup that does nothing if the enemy kills your key company first. It is a Hearthguard-pair
Rite build that costs three drafts and two guild levels.

### 1.7 The Second Sunrise — Consecrated Ground

**Pieces:** Consecrated Ground (Rite T4) · every other Rite spell you own.

**Play:** In round one, make the field Rite-resonant. Every Rite spell you cast for the rest of the
battle uses its Upgraded rules without your having learned a single upgrade. Blessing becomes mass.
Rally hits two. Consecrate grants morale per counter. Hold the Line adds Bloom.

**Bound:** Standard resonance is symmetric — the enemy's Rite spells upgrade too, which is why the
Upgraded version (your side only) is the real prize and sits behind an Inscribe, a shrine, or a
Mage Guild 4 draw. Fifteen mana in round one is most of an early hero's pool.

**Cross-school equivalents:** Seamstone (choose a school permanently), the Seam-Ripper (seams
resonate only for you), the complete Tailor's Kit (all schools), Wayside Shrine Upgraded (pick a
school, one battle), and standing on the right terrain. Every school reaches "my spells are
upgraded" through a different acquisition channel — that is deliberate.

### 1.8 The Double Blessing — clone the buffed stack

**Pieces:** Whetstone (Craft T1) · Blessing (Rite T1) · Quicksilver (Craft T2) · Clockwork Double
Upgraded (Craft T3).

**Play:** Spend two rounds loading one company with +3 Attack, maximum-damage next attack, +3 speed
and phase. Then Upgraded Clockwork Double copies the company *including its counters and timed
effects*. Two fully buffed Lance Knight companies charge in the same round.

**Bound:** the copy is summoned — it cannot be resurrected, cannot be cloned, does not survive the
battle, and does not count toward the destruction-proportionality denominator. Three rounds of
setup. The count is `25% + 5%×SP`, so a low-Spell-Power hero gets a token.

### 1.9 The Overclocked Colossus — three actions, one nap

**Pieces:** Overclock (Craft T4) · Sanctuary (Rite T2) or Mourner's Veil (Grave T1) or Hold the Line
(Rite T4) · a slow, hard-hitting company.

**Play:** Overclock a Wooden Colossus or Oriflamme Warden: it acts immediately and again at round
end, then is stunned. Cover the stunned round with Sanctuary (untargetable by enemy spells) plus
Mourner's Veil (20% less damage) or Hold the Line (survives destruction once).

**Bound:** the stun is real and one cast per round means you cannot both Overclock and protect in
the same round. Getting this right is the skill expression; getting it wrong loses your best stack.

### 1.10 The Blink Assassination

**Pieces:** Blink (Craft T3) · Marionette / Masked Duelist / Ashmane Wolves (no-retaliation or
high-damage glass) · Steady Hands (Rite T1).

**Play:** Blink your no-retaliation company directly onto the enemy's ranged line in round one,
before it has shot. Steady Hands removes the retaliation of whatever it hits. Upgraded Blink lets the
teleported company act immediately.

**Reverse play:** Blink *their* shooter out from behind their wall and into your melee. Blink is the
answer to the Quiet Yard (§1.3) and to any turtle.

**Bound:** the teleported company is now alone in the enemy's half of the board. Ten mana in round
one.

### 1.11 The Harvest Engine — corpses into bodies

**Pieces:** Ossuary (Grave T4, ench) · Reckoning (Grave T4, X-cost) or The Unmaking Engine
(Craft T5) · Silence the Passing Upgraded (Grave T3).

**Play:** Establish Ossuary. Then fire a mass percentage effect that destroys several companies on
both sides at once. Every destroyed company — yours *and* theirs — summons a Candle-Wisp or Bone
Choir company for you. Upgraded Silence the Passing makes your own death triggers fire twice.

**Bound:** enchantment slots. Reckoning spends your entire pool. The summoned companies are summoned:
no post-battle survival, no resurrection.

### 1.12 The Turning Year, both directions

**Pieces:** The Turning Year (Wild T4) plus either half of the counter game.

**Bloom mode:** Rains (removes all Burn, gives allies Bloom 1) → Verdant Surge (Bloom 3 allies, Chill
2 enemies) → The Turning Year choosing Bloom, Upgraded, doubling your side's converted counters.
Your army heals 9% of maximum HP at every turn start for the rest of the fight.

**Burn mode:** Ashen Pall (mass Hex 3 + Chill 2 on enemies) → The Turning Year choosing Burn. Every
enemy company now has Burn 5 taking 5% of current HP per turn. Add Forgefire to double it, or
Detonate the biggest pile.

**Bound:** conversion is one-for-one and caps at 9. Converting is not an *application*, so
application bonuses (Gravebinder's Sash, Forge-Ash Gauntlets, Tallykeeper R1) do not compound into
it. Fifteen mana for a tier-4 spell that does nothing unless you have already built a counter board.

### 1.13 The Ledger — sacrifice as a win condition

**Pieces:** The Ledger Balanced (Grave T4) · Grave Bargain (Grave T3) · Second Grave (Grave T2) ·
Loyal Unto Death (provenance) · Last Candle (Grave T3, ench) · Wildergrass Blood Price passive ·
The Quiet Ledger relic · several cheap companies.

**Play:** Point The Ledger Balanced at the enemy's tier-6 company. Then deliberately destroy your own
companies with Grave Bargain. Each sacrifice pays mana, morale, Bloom, and Hex, fires Loyal Unto
Death's damage, fires Last Candle's morale and Hex, feeds Blood Price, and removes that many *units*
from the marked enemy company. Second Grave gives one of your sacrifices back.

**Bound:** the S04 destruction-proportionality guard scales every flat death reward by
`min(1, destroyedMaxHP / (0.10 × armyTotalMaxHP))`, so splinter-farming a one-unit stack pays almost
nothing. The Ledger removes *units*, so killing tier-6 creatures costs you real bodies. Grave Bargain
uses starting maximum HP, so splitting a stack does not multiply the mana return. You still have to
win the fight with what is left.

### 1.14 The Mirror Hall Turn

**Pieces:** Mirror Hall (Craft T5, ench) · any tier 1–4 spell you like.

**Play:** From the round Mirror Hall lands, every subsequent cast hits a second target of your
choice. Wither on two companies. Blessing on two. Detonate on two Burn piles. Second Wind on two
companies.

**Bound:** printed exclusions — the copy never generates mana or extra actions, and cannot copy Echo,
Mirror Hall, Standing Mirror, twisters, or tier-5 spells. It costs 22 mana and an enchantment slot,
so it lands in round three at the earliest and only for a Knowledge-3+ hero.

### 1.15 The Borrowed Shape — steal the best ability

**Pieces:** Borrow Shape (Wild T4, provenance) · a durable allied company · a strong enemy ability.

**Play:** Copy Full Heal from a Sleeper, Melee Reflection from a Mirror-Bound, Unlimited Retaliation
from Sentries, or Flying from a Wyvern onto your own front line. Upgraded, the source need not be
adjacent.

**Bound:** provenance-only acquisition, and the copy lasts the battle but not beyond. `spellbound`
creatures (doc 63) cannot be copied from.

### 1.16 Weather Abuse

**Pieces:** The Weather Itself Upgraded (Wild T5, ench) · an army built to profit from turbulence —
fliers, Counterweight, Bloom stacks, phased companies.

**Play:** Upgraded shows you next round's weather and makes Sun ally-only and Frost enemy-only. You
play around Hail and Squall, they do not.

**Bound:** Standard is symmetric chaos and can lose you the fight. The upgrade is a tier-5 draw.

### 1.17 Adventure: the Raider

**Pieces:** Dimension Door (Craft T4) · Beacon (Rite T4) · Fly (Wild T5) · Procession of Lamps
(Rite T3) · Logistics · Wellspring cast by a second hero.

**Play:** Dimension Door over a mountain range onto an undefended city, take it, Beacon home. Or
Fly for a day, ignore every terrain cost and guardian, and arrive somewhere no path exists. A second
Knowledge hero sitting in your capital casts Wellspring each day to refuel the raider remotely.

**Bound:** once-per-day flags, 300 movement per adventure cast, and a mana pool that a
Knowledge-3 hero exhausts on two jumps. The support hero is a whole hero slot spent on logistics —
out of a cap of three.

### 1.18 Adventure: the Siege that never arrives

**Pieces:** The Debt Called (Grave T5) · Steal Away (Grave T4) · Salt the Vein (Craft T1) ·
Ill Wind (Wild T2).

**Play:** Freeze the defending hero for two days, redirect their mine output to yourself, suppress
their other mines, and make sure that whenever they finally do fight this week their whole army
starts Chilled.

**Bound:** every one of these is once-per-week or multi-day, they come from three different schools,
and none of them wins a battle by itself.

### 1.19 The Grudge Stack

**Pieces:** Grudge (Grave T1) · a wide, fast, many-attacks army · impact spells.

**Play:** Grudge the enemy's key company in round one. Every attack you make on it adds Hex. By round
three it is at Hex 9 and taking +45% from everything — including your impact spells, which multiply
by Hex. Then Sunlance or Wither into it.

**Bound:** Hex caps at 9 and decays; the mark lasts 3 rounds. Three mana is why this is the
early-game combo that makes a level-2 hero feel like a hero.

### 1.20 Yoke the Indestructible

**Pieces:** Yoke (Grave T2) · Oath of Iron (Rite T2, incoming rolls minimum) or a Stuffed Sentinel
(`soft_body`) or Ironclad (Craft T3).

**Play:** Make one of your companies extremely hard to hurt, then Yoke it to the enemy's best
company. Everything they spend killing your tank is halved onto their own line.

**Bound:** the pinned positioning precedence in S02/S04 (defender minimum beats attacker maximum) is
what makes this work, and it is already the rule. Yoke's linked damage never re-triggers the link.

---

## 2. Build archetypes

Goal 3 is that two heroes should play differently. These are the shapes the catalog now supports.
None requires a specific rare — each is assembled from whatever the run deals within its family.

| Archetype | Core school(s) | Signature pieces | Wins by |
|---|---|---|---|
| **Bonfire** | Craft (+Rite) | Forge-Spark, Forgefire, Detonate, Amplify, Bellows | Converting three cheap casts into one enormous one |
| **Chill Lock** | Grave + Wild | Grave-Chill, Ashen Pall, Overgrow, Tallykeeper | The enemy never gets to fight |
| **Action Economy** | Rite | Litany, Reprise, Standard of Dawn, Command, Vanguard | Taking twice as many actions |
| **Attrition Wall** | Rite + Grave | Second Wind, Hold the Line, Mourner's Veil, Second Grave, Loom of Small Repairs | Never losing a company |
| **Sacrifice Ledger** | Grave (+Wildergrass) | Grave Bargain, The Ledger Balanced, Loyal Unto Death, Last Candle | Spending its own army as ammunition |
| **Siege / Denial** | Craft | Bulwark, Ammunition Cart, Shrapnel, Siegewright, walls | Never being reached |
| **Puppeteer** | Grave (+Craft) | Puppet Strings, Yoke, Blink, Wind Shear | Making the enemy fight itself |
| **Beast Sovereign** | Wild | Wildcall, Sap and Sinew, Beast Sovereign, Beastmaster, Beast Tongue | A cheap army that is secretly tier-5 |
| **Counter Alchemist** | Wild + any | The Turning Year, Verdant Surge, Rains, Overgrow, twisters | Rewriting the whole board's status in one cast |
| **Evoker** | any | Impact spells, Evoker skill, Ash Censer, Grudge, Hex stacking | Killing companies with the hero, directly |
| **Raider** | Craft/Wild adventure | Dimension Door, Fly, Beacon, Wellspring | Never fighting the army it cannot beat |
| **Duplicator** | Craft | Clockwork Double, Mirror Hall, Standing Mirror, Reflect, Echo | Having two of everything |

A run's job is to deal you enough of one column that you notice which column you are in. That
recognition moment is the Slay the Spire feeling the brief asks for.

---

## 3. What the AI must not do

The AI is allowed to read exact state (S06) but is allowed to be bad at combos — that is a
documented AI limitation, not a hidden player restriction. Concretely:

- AI heroes use single-spell heuristics from `aiHints` and do not plan multi-round combos.
- Give every new spell an honest `aiHints` entry so the AI at least casts it at a sane moment.
- Spells whose value is purely combinatorial (Yoke, The Turning Year, Grave Bargain, Mirror Hall,
  Ossuary) should be weighted low or excluded from AI casting rather than cast badly.
- The AI must never be given a special exemption from the anti-loop rules in §5.

This is an explicit accepted asymmetry: a human who assembles a combo beats an AI that cannot. That
is the point of the design, and the difficulty levers in S07 remain the compensation.

---

## 4. Things deliberately *not* added

- **A fifth counter.** S05 forbids it and the four-counter economy is already deep enough.
- **Magic resistance as a universal stat.** S05 says school opposition is not a damage-resistance
  rule. *(Amended by [doc 64](64_CREATURE_TRAITS_V2.md) §0: resistance now exists as rationed,
  deterministic, printed per-creature abilities. The prohibition on a universal stat stands.)* Counter-play to magic comes from Sanctuary, Unmake, Sour, Wax Seal, `spell_shrug` on a few
  rationed creatures, and killing the enemy fast — not from a percentage every unit carries.
- **Targeting the enemy hero.** Heroes are off-board and unattackable (S04). Mana drain is the only
  channel that touches them, and it is bounded.
- **Pre-battle preparation.** S01's fluidity law stands: no equipment shuffle, no buff phase, no
  deployment ceremony. Every combo above is executed inside the battle or on the adventure map at a
  real movement cost. Ill Wind and Wayside Shrine are the only cross-loop effects and both are
  cast days earlier at full price.
- **Permanent power growth from spells.** Nothing here makes a company permanently stronger between
  battles. Attrition and tempo remain the currency (S01).

---

## 5. Loop bounds — the only hard prohibitions

A finite blowout is the product. A non-terminating or unbounded loop is a bug. These rules exist to
separate them and must be implemented as printed, player-visible constraints, not silent clamps.

**Resource loops**

1. Mana can never exceed the hero's maximum. Tithe, The Toll, Grave Bargain, Bell Book and Candle,
   and The Quiet Ledger all clamp there.
2. A spell that grants mana cannot be copied by Mirror Hall, Standing Mirror, or the Mirrorshard
   Pendant. Echo may repeat it — Echo costs a full act and its own mana.
3. Grave Bargain and Tithe derive their return from a company's **starting** maximum HP, so stack
   splitting cannot multiply them. The S04 destruction-proportionality guard already covers all flat
   death-triggered rewards.

**Action loops**

4. A company may receive at most two *granted* extra actions per round from spells, items, and
   artifacts combined. Morale-threshold extra actions are separate and already bounded by the meter.
5. `grant-extra-action` never grants the hero another cast. The `extra-action` lexicon term already
   states this.
6. Mirror Hall's copy never grants extra actions.

**Copy loops**

7. Echo cannot Echo. Mirror Hall cannot copy Mirror Hall, Standing Mirror, Echo, twisters, or
   tier-5 spells. Standing Mirror keeps its existing exclusions.
8. A summoned or cloned company cannot be cloned, resurrected, or Remembranced.
9. Borrow Shape cannot copy from a `spellbound` company and cannot copy a copied ability.

**Control and link loops**

10. A company may be mind-controlled at most once per battle, by either side.
11. A company carries at most one Yoke. Damage dealt *by* a link never re-triggers any link.
12. A mind-controlled company cannot be given to a third party, and control cannot be extended by
    re-casting.

**Counter loops**

13. Counters cap at 9 (artifact-raised caps are printed and capped at 15).
14. `counter-convert` and `counter-detonate` are not counter *applications*: they do not fire
    application bonuses, twisters-on-application, or creature `apply` hooks.
15. Detonate removes the pile before computing damage.

**Resurrection loops**

16. Resurrection never exceeds a company's starting count. Hold the Line, Second Grave, the Longest
    Candle, the Last Toy, and Unfinished Vow each fire at most once per company per battle, and a
    company that has already been saved by one of them is ineligible for the others in the same
    destruction event.

**Battle termination**

17. Every battle must still terminate. The existing round-limit and stalemate detection must be
    verified against the Quiet Yard (§1.3), the Chill Lock (§1.5), and the Attrition Wall: a fight
    in which neither side can kill the other must resolve, not hang. This is the one place where a
    combo genuinely can break the game, and it needs an explicit test.

---

## 6. Acceptance list

Each of §1.1–§1.20 becomes a deterministic integration test: a fixed battle fixture, a fixed action
log, and an assertion on the resulting state. The test proves the combo is *reachable and resolves*,
not that it is balanced. Additionally:

- One test per rule in §5, asserting the loop terminates or the illegal action is rejected.
- A termination test for each of the three stalling archetypes named in §5.17.
- A guild-exposure simulation: over 200 seeds, a run with two same-faction cities at Mage Guild 5
  must surface a mean of 30–40% of that faction pair's relevant 62-spell school pool. The earlier
  124-spell denominator was an arithmetic typo: two complete guilds have only 28 slots and cannot
  expose 30% of 124. The verified 200-seed Hearthguard result is 20.125 distinct Rite/Craft spells,
  or **32.46%** of 62; the 4/3/3/2/2 guild deal is unchanged.

The executable acceptance is `src/core/__tests__/combo-acceptance.test.ts`: every §1 fixture owns a
complete JSON-safe fixed operation log, including setup mutations and round advances; a fresh
fixture interprets the captured log through the public battle/game reducers and reaches the same
canonical state and qualitative outcome. `src/core/__tests__/combat-primitives.test.ts` owns one
visible rejection or bound for every numbered §5 rule plus separate Quiet Yard, Standing Cold, and
Attrition Wall fixtures built through their named spells before ordinary actions cross multiple full
rounds into the round-limit result.
