# 61 — Spell Catalog v2

**Status:** implemented 2026-08-13. Runtime/catalog and native-asset completion are tracked in S05
and S09; all 56 added spell IDs own distinct accepted native icons and provenance.
**Depends on:** [60 Magic Overhaul](60_MAGIC_OVERHAUL.md) for tiers, impact scaling, mass targeting,
and the effect primitives referenced below.

124 spells: 31 per school, distributed 8/8/7/5/3 across tiers 1–5. 68 existing entries are retiered
(fourteen of them retuned), 56 are new. The four provenance rares stay excluded from guild pools.

**Legend.** `°` existing, unchanged rules · `~` existing, **retuned** · `+` **new** ·
**P1/P2** implementation phase · SP = the caster's effective Spell Power.

**Scaling shape** follows doc 60 §4.2.1 and is not repeated per entry: every tier-1 impact spell is
**capped** at 40 damage; tier-2 impact scales at half rate above SP 10; tier 3–5 are **open**. The
four cantrips are **fixed** — no Spell Power scaling whatsoever. This is deliberate obsolescence:
your first damage spell should stop being the answer somewhere around the second Mage Guild.

All damage figures are pencilled per S01's balance posture. The *shape* of each spell — what
decision it creates and what it combos with — is the deliverable; the numbers are a tuning pass.

Every new spell needs an in-world flavor line authored to the S01 writing register and added to
`flavor.ts`. None are supplied here on purpose: mechanics and flavor are separate passes and flavor
must never carry a rule.

---

## RITE — action economy, protection, resurrection, oaths

Rite wins by acting more often than it should and by refusing to lose companies. Its combo shape is
**setup → many payoffs**: bank morale and extra actions, then spend them all in one round.

| Tier | Spells |
|---:|---|
| 1 | Rally° · Blessing~ · Consecrate° · Census~ (adv) · **Kindle+** (cantrip) · **Sunlance+** · **Steady Hands+** · **Wellspring+** (adv) |
| 2 | Sanctuary° · Oath of Iron° · Clarion° · Standard of Dawn~ (ench) · Amplify° (twister) · Wayside Shrine° (adv) · **Second Wind+** · **Scrying+** (adv) |
| 3 | Hymn of the Host° · Vigil of the Host° (ench) · Trial~ · Feast Day° (adv) · **Litany of Dawn+** · **Bell, Book, and Candle+** (ench) · **Procession of Lamps+** (adv) |
| 4 | Oathbind° · Beacon° (topology) · **Hold the Line+** (ench) · **Consecrated Ground+** · **Reprise+** |
| 5 | **Dayspring+** · **The Long Oath+** (ench) · Echo° (provenance) |

### Tier 1

**Kindle** — 2 mana, cantrip, **fixed**. **P1**
- *Standard:* Deal 12 damage to one enemy company. This spell does not scale with Spell Power.
- *Upgraded:* 16 damage, and the target loses 10 morale.
- *Combo:* The day-three spell. Twelve damage is two Yeomen or a Tin Soldier and a half — decisive
  in a week-one guardian fight and nearly irrelevant by week six, which is the point. At two mana a
  Knowledge-1 hero casts it five times.

**Sunlance** — 4 mana, impact, **capped at 40**. **P1**
- *Standard:* Deal `8 + 4×SP` impact damage to one enemy company. If that company has destroyed an
  allied company this battle, the damage is increased by half.
- *Upgraded:* As Standard, and the nearest allied company gains 10 morale.
- *Combo:* Rite's answer to "the hero does nothing on turn one." The vengeance clause makes it the
  natural follow-up to a bad exchange and pairs with Standard of Dawn's morale engine.

**Steady Hands** — 3 mana, staple. **P1**
- *Standard:* One allied company's next attack cannot be retaliated against, and it gains +1 speed
  until the end of the round.
- *Upgraded:* Two different allied companies instead of one.
- *Combo:* Cheap enabler for glass-cannon stacks (Marionette, Ashmane Wolves) and the standard
  opener for any charge build. Stacks with Quiet from the other direction.

**Wellspring** — 5 mana, adventure. **P1**
- *Standard:* Restore `10 + 2×SP` mana to one owned hero anywhere on the map. Once per day.
- *Upgraded:* `16 + 3×SP` mana, and the target hero also gains 150 movement.
- *Combo:* Makes a stay-at-home Knowledge hero a real support build — one hero exists to refuel the
  hero who is fighting. Also the counter to the tier-5 mana cliff.

**Blessing** ~ — 3 mana, staple. **P1**
- *Standard:* unchanged (one ally's next attack rolls maximum damage).
- *Upgraded (retuned):* Every allied company's next attack rolls maximum damage. *(Was: one company
  and 10 morale.)*
- *Why:* the Upgraded version becomes a genuine mass payoff, which is what makes Consecrated
  Ground and resonance worth building around.

**Census** ~ — 4 mana, adventure. **P1**
- Currently has no gameplay effect (logged in doc 55). Give it one.
- *Standard:* Until the end of today, every enemy hero and city within your explored area shows its
  exact army composition and hero level.
- *Upgraded:* As Standard, and also shows enemy hero mana, known spells, and equipped artifacts.
- *Why:* an information spell that pays for itself in a hot-seat or AI war, and the natural partner
  to Scrying.

### Tier 2

**Second Wind** — 6 mana, staple. **P1**
- *Standard:* `resurrect` — restore `20 × SP` HP to one allied non-summoned company, reviving units
  up to its starting count.
- *Upgraded:* `30 × SP` HP.
- *Combo:* The first rung of the resurrection ladder and the spine of the attrition build. With
  Hold the Line and the Loom of Small Repairs relic, a single tier-4 company can absorb an entire
  army. With Grave's Second Grave it becomes very hard to kill anything.

**Scrying** — 6 mana, adventure. **P2**
- *Standard:* Reveal a radius-6 circle around any owned hero, owned city, or explored map object,
  and show exact guardian counts inside it for the rest of today.
- *Upgraded:* Radius 9, and also reveals the reward each guardian protects.
- *Combo:* Turns Diplomacy, Beastmaster, and the Quiet Horseshoe from gambles into plans.

**Standard of Dawn** ~ — 5 mana, enchantment. **P1**
- *Standard:* unchanged.
- *Upgraded (retuned):* As Standard, and the company that landed the killing blow immediately gains
  +2 speed and one extra action if this is the first kill of the round.
- *Why:* closes one of the five identical-upgrade gaps recorded in doc 58, and turns Rite's
  signature enchantment into an action-economy engine rather than a morale trickle.

### Tier 3

**Litany of Dawn** — 10 mana, mass-ally. **P1**
- *Standard:* Every allied company gains 25 morale and its next attack rolls maximum damage.
- *Upgraded:* 40 morale, and each company also ignores the adjacent-enemy ranged penalty this round.
- *Combo:* The Rite alpha-strike button. With Command R3, Vanguard, and a banked Vigil of the Host,
  a whole army can act twice in the round it fires.

**Bell, Book, and Candle** — 11 mana, enchantment. **P2**
- *Standard:* While this stands, the first time each round an allied company takes an extra action,
  your hero gains 2 mana and that company gains +1 Attack for the round.
- *Upgraded:* 3 mana, and the bonus applies to the first two extra actions each round.
- *Combo:* Converts Rite's action economy into a mana economy. The enabler that lets a Rite hero
  actually afford a tier-5 spell in a long fight.

**Procession of Lamps** — 9 mana, adventure. **P2**
- *Standard:* Restore this hero's movement to full. Once per week.
- *Upgraded:* Restore this hero's movement to full and grant one adjacent owned hero half of theirs.
- *Combo:* The Rite tempo spell. Pairs with Beacon for a same-day return-and-strike, and with
  Logistics for absurd single-day reach.

**Trial** ~ — 6 mana, build-around. **P1**
- *Standard (retuned):* 25% → **30%** of current HP.
- *Upgraded (retuned):* 35% → **45%**.
- *Why:* Trial's targeting restriction (only companies larger than your largest) already limits it
  severely. At 25% it is not worth a tier-3 slot.

### Tier 4

**Hold the Line** — 15 mana, enchantment. **P1**
- *Standard:* While this stands, once per round the first allied company that would be destroyed
  survives at one unit instead.
- *Upgraded:* As Standard, and that company also gains Bloom 3.
- *Combo:* The defining Rite relic-spell. Combined with Second Wind, the Longest Candle, and the
  Last Toy, a Rite hero can lose the same company four times in one battle.

**Consecrated Ground** — 13 mana, staple. **P1**
- *Standard:* The battlefield becomes Rite-resonant for the rest of the battle. Both sides' Rite
  spells use their Upgraded rules.
- *Upgraded:* Only **your** side's Rite spells gain the resonance.
- *Combo:* This is the single biggest build-around in the catalog. Cast it in round one and every
  Rite spell you own is upgraded for the rest of the fight. It is deliberately Rite-only — the
  other schools reach the same place through Seamstone, Seam-Ripper, the Tailor's Kit, or terrain.

**Reprise** — 13 mana, staple. **P1**
- *Standard:* One allied company immediately takes an extra action; at the start of the next round
  it takes another before the round order resolves.
- *Upgraded:* The second action instead occurs immediately after the first.
- *Combo:* The purest action-economy card. Upgraded Reprise on a Lance Knight with Blessing active
  is a two-hit alpha strike that ends a fight in round two.

### Tier 5

**Dayspring** — 24 mana, mass-ally. **P2**
- *Standard:* Every allied company is cleansed of all counters, healed `20 × SP` HP with
  resurrection up to its starting count, and gains 30 morale.
- *Upgraded:* `30 × SP` HP, and all allied timed effects gain 2 rounds of duration.
- *Combo:* The Rite haymaker. Reverses an entire round of losses.

**The Long Oath** — 21 mana, enchantment. **P2**
- *Standard:* While this stands, allied companies never lose morale, gain 15 morale at each round
  start, and your hero may cast one additional spell each round costing 5 mana or less.
- *Upgraded:* The additional spell may cost up to 9 mana.
- *Combo:* Explicitly breaks the one-cast rule. The mana ceiling means the second cast is a tier-1
  or tier-2 spell, so it multiplies a cheap-spell build rather than doubling haymakers.

---

## CRAFT — burn, walls, machines, copies, ammunition

Craft wins by controlling where the fight happens and by having two of everything. Its combo shape
is **denial plus duplication**: seal the board, then double whatever you already have.

| Tier | Spells |
|---:|---|
| 1 | Forge-Spark~ · Ward° · False Colors~ (adv) · Salt the Vein° (adv) · **Rivet+** (cantrip) · **Whetstone+** · **Shrapnel+** · **Prospect+** (adv) |
| 2 | Quicksilver° · Wall of the Maker° · Reflect° (twister) · Unmake~ (twister) · Clockwork Escort° · Clockwork Courier° (adv) · **Ammunition Cart+** · **Counterweight+** |
| 3 | Forgefire° (ench) · Ironclad° (ench) · Brittle° · Gate° (topology) · **Detonate+** · **Clockwork Double+** · **Blink+** |
| 4 | Standing Mirror~ · Summon Skiff° (topology) · **Bulwark+** · **Overclock+** · **Dimension Door+** (adv) |
| 5 | **The Unmaking Engine+** · **Mirror Hall+** (ench) · Hourglass Crack° (provenance) |

### Tier 1

**Rivet** — 2 mana, cantrip, **fixed**. **P1**
- *Standard:* One allied company gains +2 Defense until its next turn, and its next retaliation this
  round deals double damage. Does not scale with Spell Power.
- *Upgraded:* +3 Defense, and it may retaliate one additional time this round.
- *Combo:* The defensive cantrip. Cast on the company about to be charged. Unlike Kindle it ages
  reasonably well because doubling a retaliation is proportional to the company doing it — a fine
  illustration of why the fixed-scaling rule is about *magnitude*, not about *usefulness*.

**Forge-Spark** ~ — 4 mana, impact + counter, **capped at 40**. **P1**
- *Standard (retuned):* Deal `8 + 4×SP` impact damage to one enemy and give it Burn 3.
- *Upgraded (retuned):* Deal `8 + 4×SP` impact damage and Burn 4, and give every adjacent enemy
  Burn 2.
- *Why:* the current spell applies Burn 3 and nothing else, which at three mana is a rounding error.
  Making the school's iconic tier-1 spell both a nuke and the seed of the Burn engine is the single
  highest-value retune in this document.

**Whetstone** — 3 mana, staple. **P1**
- *Standard:* One allied company gains +3 Attack for 2 rounds.
- *Upgraded:* +3 Attack for 2 rounds, and its first attack this round also removes one retaliation
  from the target.
- *Combo:* +3 Attack is +15% damage in the S04 formula. Cheap, always castable, stacks additively
  with hero Attack and multiplicatively with Hex.

**Shrapnel** — 4 mana, staple. **P1**
- *Standard:* One allied ranged company's next shot also hits every company adjacent to the target
  for half damage.
- *Upgraded:* As Standard, and the shot does not consume ammunition.
- *Combo:* Turns a Longbowman or Bone Choir into artillery. With Ammunition Cart and a wall line it
  is the whole siege archetype.

**Prospect** — 6 mana, adventure. **P2**
- *Standard:* Reveal every mine and resource pile within 12 tiles. The next pile this hero collects
  this week yields double.
- *Upgraded:* Radius 18, and also reveals essence deposits and seams.
- *Combo:* Economic scouting that stacks with Forager. Makes an early Craft hero an expansion engine.

**False Colors** ~ — 4 mana, adventure. **P2**
- Currently has no gameplay effect (logged in doc 55). Give it one.
- *Standard:* Until an enemy hero comes adjacent, this hero's army displays a chosen guardian band
  and AI power evaluation uses the displayed band rather than the true strength.
- *Upgraded:* As Standard, and enemy heroes whose displayed evaluation is unfavourable will not
  initiate an attack this turn.
- *Why:* an actual bluff spell, and the only tool in the game that manipulates AI threat assessment.

### Tier 2

**Ammunition Cart** — 6 mana, staple. **P1**
- *Standard:* Every allied ranged company regains full ammunition.
- *Upgraded:* As Standard, and for the rest of the battle allied ranged companies ignore the
  beyond-seven-hexes damage penalty.
- *Combo:* Removes the ammunition clock that currently ends every ranged plan by round six.
  With a wall line, this is the wall-and-shoot cheese (doc 62 §1.3).

**Counterweight** — 7 mana, staple. **P2**
- *Standard:* For 3 rounds one allied company cannot be pushed, pulled, teleported, or beckoned, and
  its retaliations deal double damage.
- *Upgraded:* As Standard, and it retaliates without limit.
- *Combo:* The retaliation build's core, and the answer to Gale/Wind Shear/Blink control decks.
  With Still on Watch (Sentries) or the Wolf-Mother's Torc it becomes a meat grinder.

**Unmake** ~ — 4 mana, twister. **P1**
- *Standard:* unchanged.
- *Upgraded (retuned):* As Standard, and additionally either remove a **protected** enchantment or
  cleanse a second company. Removing an enchantment this way gives its owner's companies Chill 2.
- *Why:* closes an identical-upgrade gap from doc 58 and makes Unmake the designated answer to
  enchantment-based builds, including Wax Seal protection.

### Tier 3

**Detonate** — 9 mana, counter-detonate. **P1**
- *Standard:* Choose a company with Burn. Remove all its Burn and deal `pile × (8 + 3×SP)` impact
  damage to it.
- *Upgraded:* As Standard, and deal half that amount to every company adjacent to it.
- *Combo:* The Burn engine's payoff card and one of the most important new spells in the catalog.
  Forge-Spark → Amplify (double the pile) → Detonate is a three-round, three-cast kill on a stack
  five times your size. Forgefire, Gravebinder's Sash, Forge-Ash Gauntlets, and the Bellows all feed
  it. See doc 62 §1.1.

**Clockwork Double** — 11 mana, clone. **P1**
- *Standard:* Summon a copy of one allied non-summoned company at `25% + 5%×SP` of its current
  count, to a maximum of 100%. The copy is summoned: it cannot be resurrected, cannot be cloned, and
  does not survive the battle.
- *Upgraded:* The copy also inherits the original's current counters and timed effects.
- *Combo:* Doubling your best stack is the classic HoMM cheese. Upgraded, it copies your buffs too,
  which makes it a payoff for Blessing/Whetstone/Quicksilver stacking rather than a raw body.

**Blink** — 10 mana, teleport-stack. **P1**
- *Standard:* Teleport one company on either side to any legal empty hex.
- *Upgraded:* Teleport two different companies, or one company and then it may act immediately if
  it has not acted this round.
- *Combo:* The most flexible enabler in the catalog. Pull an enemy shooter out of its wall pocket
  into your melee; drop a Marionette behind the line; rescue a stack from a Yoke; put a beast in
  range for Stampede Call. Positional cheese lives here.

### Tier 4

**Bulwark** — 14 mana, staple. **P2**
- *Standard:* Create a line of five wall hexes across a chosen column, plus one immobile Watchtower
  company using your tier-2 unit's ranged profile at `5 + 2×SP` units.
- *Upgraded:* Six wall hexes and the Watchtower gains +2 Attack and unlimited ammunition.
- *Combo:* Portable siege. Combined with Chalkmaster's Ring and Siegewright R2 (40 HP wall stacks)
  it seals half the board.

**Overclock** — 13 mana, staple. **P1**
- *Standard:* One allied company acts immediately, then again at the end of this round, then is
  stunned for the following round.
- *Upgraded:* The stun is one round later, so it acts normally in the following round first.
- *Combo:* Three actions in two rounds, with a real cost. The stunned round is why Ward, Sanctuary,
  Mourner's Veil, and Hold the Line matter — protecting the downswing is the skill expression.

**Dimension Door** — 16 mana, adventure. **P1**
- *Standard:* Teleport this hero to any explored tile within `6 + SP` tiles, ignoring terrain,
  water, mountains, and blockers. The destination must be legal and unoccupied. Once per day.
- *Upgraded:* Range `10 + SP`, and it may be cast twice per day.
- *Combo:* The requested spell, and the strongest adventure effect in the game. It converts a
  Knowledge hero into a raiding threat that cannot be intercepted: jump a mountain range, take an
  undefended city, jump back. Bounded by the once-per-day flag, 300 movement, and the mana cost —
  at Knowledge 3 an Upgraded double-jump consumes the entire pool.

**Standing Mirror** ~ — 7 mana, build-around. **P2**
- *Standard:* unchanged.
- *Upgraded (retuned):* As Standard, and **you** choose the copy's target rather than the first
  stable legal counterpart; the Mirror also copies enemy twisters.
- *Why:* closes the third identical-upgrade gap from doc 58 and turns the Mirror from a curiosity
  into a control piece.

### Tier 5

**The Unmaking Engine** — 24 mana, mass-enemy. **P2**
- *Standard:* Deal `25 + 9×SP` impact damage to every enemy company and remove all their timed
  effects.
- *Upgraded:* Also destroys both enemy enchantments, including protected ones.
- *Combo:* The mass nuke and the designated answer to a fully assembled enemy engine.

**Mirror Hall** — 22 mana, enchantment. **P2**
- *Standard:* While this stands, each spell your hero casts is copied once to a second legal target
  of your choice. The copy may not generate mana or extra actions, and cannot copy Echo, Mirror
  Hall, Standing Mirror, twisters, or any tier-5 spell.
- *Upgraded:* The copy may target a tier-5 spell's alternate target, but the copy's magnitude is
  halved.
- *Combo:* The Craft haymaker: doubling every subsequent cast for the rest of the fight. The
  exclusions in the printed rule are what keep it finite; they are player-facing, not hidden.

---

## GRAVE — hex, chill, death, debt, redirection

Grave wins by making everything cost something and then choosing who pays. Its combo shape is
**redirection and sacrifice**: turn your own losses into resources, and turn the enemy's body into
your weapon.

| Tier | Spells |
|---:|---|
| 1 | Wither~ · Grave-Chill° · Mourner's Veil° · Borrowed Time° (adv) · Grave-Speech° (adv) · **Pinch of Ash+** (cantrip) · **Tithe+** · **Grudge+** |
| 2 | Quiet° · Remembrance° · Sour° (twister) · The Toll° · Cold Road° (topology) · Death's Ledger° (adv) · **Yoke+** · **Second Grave+** |
| 3 | Dirge° · Last Candle° (ench) · Silence the Passing° (ench) · Pale Procession° (adv) · **Grave Bargain+** · **Puppet Strings+** · **Ashen Pall+** |
| 4 | Reckoning° · Loyal Unto Death° (provenance) · **The Ledger Balanced+** · **Ossuary+** (ench) · **Steal Away+** (adv) |
| 5 | **The Long Silence+** (ench) · **Harvest+** · **The Debt Called+** (adv) |

### Tier 1

**Pinch of Ash** — 2 mana, cantrip, **fixed**. **P1**
- *Standard:* One enemy company gains Hex 2 and loses 10 morale. Does not scale with Spell Power.
- *Upgraded:* Hex 3 and 20 morale.
- *Combo:* Grave's cantrip is a debuff rather than a nuke, so it never truly falls off — Hex 2 is
  +10% damage taken whether it is week one or week twelve. It is the cheapest possible entry into
  the Hex archetype and the correct round-one play for a hero saving mana for something larger.

**Tithe** — 2 mana, staple. **P1**
- *Standard:* Your hero gains 4 mana. One allied company loses 10% of its current HP.
- *Upgraded:* Gain 6 mana; the company instead loses 8% and gains Bloom 2.
- *Combo:* Net +2 mana per cast, paid in blood. The reason a Grave hero can reach a tier-4 spell in
  round three. Feeds Blood Price (Wildergrass), Unfinished Business, Loyal Unto Death, and Last
  Candle — every one of which pays you back for the HP you just spent. Mana can never exceed
  maximum, so it cannot bank.

**Grudge** — 3 mana, staple. **P1**
- *Standard:* Mark one enemy for 3 rounds. Your companies deal +10% damage to it, and it gains
  Hex 1 each time it is attacked.
- *Upgraded:* +15% damage, and Hex 2 per attack.
- *Combo:* A self-building Hex pile. Point it at the enemy's biggest stack in round one and by round
  four it is at Hex 9 taking +45% from everything, including impact damage. Wither's cheaper cousin
  for armies that attack a lot.

**Wither** ~ — 3 mana, impact + counter, **capped at 40**. **P1**
- *Standard (retuned):* Deal `6 + 3×SP` impact damage to one enemy and give it Hex 6.
- *Upgraded (retuned):* Deal `6 + 3×SP` impact damage, Hex 8, and Chill 2.
- *Why:* parallel to the Forge-Spark retune. Grave's iconic tier-1 spell should threaten a small
  stack outright, not merely tag it.

### Tier 2

**Yoke** — 7 mana, damage-link. **P1**
- *Standard:* Link two companies on any sides for 3 rounds. Whenever either takes damage, the other
  takes 50% of the same amount. Linked damage never re-triggers the link, and a company may carry
  only one Yoke.
- *Upgraded:* 75%, and the link cannot be removed by Unmake, Sour, or Shed Skin.
- *Combo:* The most combinatorially productive spell in the catalog. Link two enemy stacks and use
  any area effect. Link your indestructible Stuffed Sentinel to their best stack and let them break
  themselves on it. Link a Puppet-Strung company to its own army and beat it with your whole line.
  See doc 62 §1.2 and §1.4.

**Second Grave** — 7 mana, staple. **P2**
- *Standard:* Choose an allied company. The first time it is destroyed this battle, it immediately
  returns at 30% of its starting count.
- *Upgraded:* 50%, and it returns with Bloom 3.
- *Combo:* Proactive Longest Candle. With Loyal Unto Death and Last Candle, the destruction of your
  own company becomes a strictly positive event. Deliberately synergises with Grave Bargain.

### Tier 3

**Grave Bargain** — 0 mana, sacrifice. **P1**
- *Standard:* Destroy one of your own companies. Your hero gains mana equal to 10% of that company's
  starting maximum HP, to a maximum of 20. Every surviving allied company gains 25 morale and
  Bloom 3.
- *Upgraded:* Also gives every surviving enemy company Hex 3.
- *Combo:* Costs no mana on purpose — it *is* the mana. The engine of the sacrifice build:
  Grave Bargain on a company carrying Loyal Unto Death, under a Last Candle, with Wildergrass Blood
  Price, converts one splinter into mana, morale, Hex, and direct damage in a single act. The S04
  destruction-proportionality guard already prevents one-unit splinters from paying full flat
  rewards, and the mana return uses starting maximum HP so it cannot be farmed by splitting.
- *Constraint:* cannot target the last surviving allied company, and cannot target a summoned one.

**Puppet Strings** — 11 mana, mind-control. **P1**
- *Standard:* Take control of one enemy company for 2 rounds. It acts on your side and counts as
  allied for targeting. When control ends it returns to its owner with Hex 3. Eligible only if the
  target's current total HP is at most `40 × SP`.
- *Upgraded:* 3 rounds, and it keeps any counters and effects it gained while controlled.
- *Combo:* The requested Hypnotize. Obeys the S01 target-scaling law through its HP eligibility cap:
  a low-power hero controls a levy, a high-power hero controls a knight company, and nobody controls
  a doomstack. See doc 62 §1.2 for the Puppet Strings + Yoke and Puppet Strings + Grave Bargain
  cheeses, both of which are intended.
- *Constraint:* a company may be controlled only once per battle, by either side.

**Ashen Pall** — 10 mana, mass-enemy. **P2**
- *Standard:* Every enemy company gains Hex 3 and Chill 2.
- *Upgraded:* Hex 4 and Chill 3, and enemy counters do not decay at the end of their next turn.
- *Combo:* Grave's board-wide setup. The Upgraded decay clause is the Chill lock's keystone —
  see doc 62 §1.5.

### Tier 4

**The Ledger Balanced** — 15 mana, build-around. **P2**
- *Standard:* Choose an enemy company. For the rest of the battle, whenever any allied company is
  destroyed, that enemy loses the same number of units, up to its current count.
- *Upgraded:* Also applies when an allied company is reduced below half its starting count, once per
  company.
- *Combo:* Debt made literal, and the sacrifice build's finisher. Pair with Grave Bargain and a row
  of cheap splinter companies. Bounded by unit *count*, not HP, so sacrificing tier-1 chaff to kill
  tier-6 units is deliberately possible and deliberately expensive in bodies.

**Ossuary** — 14 mana, enchantment. **P2**
- *Standard:* While this stands, whenever any company on either side is destroyed, summon an allied
  Candle-Wisp company whose count is derived from that company's starting maximum HP.
- *Upgraded:* Summons Bone Choir instead, at half the count.
- *Combo:* Necromancy as an engine. With Reckoning or The Unmaking Engine, one cast rebuilds your
  army from the corpses of both sides.

**Steal Away** — 13 mana, adventure. **P2**
- *Standard:* Choose an explored enemy-owned mine. Its next 3 days of production are paid to you
  instead. Once per week.
- *Upgraded:* 5 days, and the mine's owner is not told which player took it.
- *Combo:* Economic warfare that does not require a hero to walk there. The Grave answer to a
  turtling opponent, and the natural partner to Salt the Vein.

### Tier 5

**The Long Silence** — 22 mana, enchantment. **P2**
- *Standard:* While this stands, the enemy hero cannot cast spells. At the start of each round your
  hero loses 3 mana; if they cannot pay, the enchantment ends.
- *Upgraded:* The upkeep is 2 mana, and the enemy hero also cannot use items.
- *Combo:* Total denial with an honest, visible upkeep. It costs an enchantment slot, most of your
  pool, and your ability to cast anything else for several rounds — a real trade, not a lockout.

**Harvest** — 25 mana, mass. **P2**
- *Standard:* Every enemy company loses 20% of its current HP. Distribute that much total HP among
  your companies as healing and resurrection, up to each one's starting count.
- *Upgraded:* 30%.
- *Combo:* The attrition inversion. Grave's answer to Dayspring: instead of undoing your losses, it
  moves theirs onto your side.

**The Debt Called** — 20 mana, adventure. **P2**
- *Standard:* Choose any enemy hero on the map. That hero's remaining movement today becomes zero
  and they receive no movement tomorrow. Once per week.
- *Upgraded:* Two consecutive days after today, and that hero gains no mana regeneration during
  them.
- *Combo:* Map-scale tempo denial. Strands a raider away from home, or freezes a defender while your
  army arrives. The strongest non-teleport adventure spell in the game and correctly gated to once
  per week.

---

## WILD — bloom, weather, terrain, beasts, spread

Wild wins by making one effect into many and by rewriting the ground. Its combo shape is
**spread and convert**: build a single large effect, then propagate it across the field.

| Tier | Spells |
|---:|---|
| 1 | Bloom° · Gale° · Rains° · Thicket° · Murmuration° (adv) · **Nettle+** (cantrip) · **Bramblelash+** · **Beast Sense+** (adv) |
| 2 | Overgrow° (twister) · Shed Skin~ · Hedgerow March~ (ench) · Green Tide° (adv) · Wild Growth° (adv) · **Wildcall+** · **Sap and Sinew+** · **Ill Wind+** (adv) |
| 3 | Storm° · Stampede Call° · Greenway° (topology) · Root and Ruin° (adv) · Beast Tongue° (adv) · **Verdant Surge+** · **Root the Sky+** |
| 4 | Borrow Shape° (provenance) · Fickle Weather° (adv) · **The Turning Year+** · **Beast Sovereign+** (ench) · **Wind Shear+** |
| 5 | **The Long Green+** · **The Weather Itself+** (ench) · **Fly+** (adv) |

### Tier 1

**Nettle** — 2 mana, cantrip, **fixed**. **P1**
- *Standard:* Deal 10 damage to one enemy company and give it Chill 1. Does not scale with Spell
  Power.
- *Upgraded:* 10 damage and Chill 2, and the target cannot gain speed bonuses until its next turn.
- *Combo:* Slightly less damage than Kindle in exchange for the Chill, which is the whole reason
  the Wild cantrip stays in the book: it is the cheapest way to start the Chill Lock (doc 62 §1.5)
  and it is the only two-mana spell that touches turn order.

**Bramblelash** — 4 mana, impact, **capped at 40**. **P1**
- *Standard:* Deal `8 + 4×SP` impact damage to one enemy and create undergrowth on one hex adjacent
  to it.
- *Upgraded:* Create undergrowth on every empty hex adjacent to it instead.
- *Combo:* Wild's tier-1 nuke doubles as terrain creation. Upgraded, it can strand a melee company
  in a thorn pocket — with Leshy's Thicket Walk or Grass-Serpent's Undergrass on your side, the
  terrain is one-way.

**Beast Sense** — 3 mana, adventure. **P2**
- *Standard:* Reveal every neutral guardian within 10 tiles with exact counts. Beast-only guardians
  will not trigger aggro against this hero for the rest of today.
- *Upgraded:* Radius 16, and beast-only guardians within it will not aggro against any of your
  heroes today.
- *Combo:* An early-game route-opener. Walk straight through a wolf pack that would have cost you a
  week. Overlaps Scouting deliberately — a spell should be able to substitute for a skill you did
  not draft.

### Tier 2

**Wildcall** — 8 mana, summon. **P1**
- *Standard:* Summon a neutral beast company for this battle. Its creature is selected
  deterministically from the battle seed among beasts whose `unitStrength × count` fits a budget of
  `12 × SP`.
- *Upgraded:* Budget `18 × SP`, and the summoned company gains +2 speed.
- *Combo:* A different creature every battle, replay-safe from the battle seed. Serves the lootbox
  goal inside combat rather than outside it, and feeds every Beast payoff — Beastmaster,
  Whetstone of the Clans, Wolf-Mother's Torc, Stampede Call, Beast Sovereign.

**Sap and Sinew** — 6 mana, staple. **P1**
- *Standard:* One allied company gains +3 speed and +2 Attack for 3 rounds. If it is a Beast, it
  also gains one extra retaliation per round.
- *Upgraded:* +4 speed and +3 Attack, and a Beast also gains Bloom 2 at each round start.
- *Combo:* Wild's workhorse buff and the reason a mixed beast army is a build rather than a theme.

**Ill Wind** — 8 mana, adventure. **P2**
- *Standard:* For the rest of this week, the first battle each enemy hero fights begins with every
  one of their companies at Chill 2.
- *Upgraded:* Chill 3, and their ranged companies begin with half ammunition.
- *Combo:* Cross-loop magic — an adventure spell that reaches into combat. Cast it before a war week
  and every fight starts ahead. Pairs with any Chill-lock build.

**Shed Skin** ~ — 4 mana, staple. **P1**
- *Standard:* unchanged.
- *Upgraded (retuned):* As Standard, and the removed effect or counter pile is applied to one
  adjacent enemy company at the same magnitude.
- *Why:* closes the fourth identical-upgrade gap from doc 58 and turns a cleanse into a transfer,
  which is far more Wild.

**Hedgerow March** ~ — 5 mana, enchantment. **P1**
- Currently an enchantment with no gameplay effect (logged in doc 56). Give it one.
- *Standard:* While this stands, allied companies ignore undergrowth movement costs and gain
  +1 speed; enemy companies that end their turn on undergrowth gain Chill 1.
- *Upgraded:* +2 speed, and allied companies may move through enemy companies as if phased.
- *Why:* an inert enchantment occupying one of only two slots is the worst card in the game.
  Repairing it makes Thicket, Bramblelash, Root and Ruin, and undergrowth creatures a coherent
  archetype.

### Tier 3

**Verdant Surge** — 10 mana, mass. **P1**
- *Standard:* Every allied company gains Bloom 3; every enemy company gains Chill 2.
- *Upgraded:* Bloom 4 and Chill 3, and allied Bloom does not decay at the end of their next turn.
- *Combo:* The mass counter application that makes The Turning Year and Overgrow worth building
  toward.

**Root the Sky** — 11 mana, mass-enemy. **P2**
- *Standard:* Every enemy flying company loses Flying for 3 rounds and is pushed one hex. Every
  enemy company takes `10 + 4×SP` impact damage.
- *Upgraded:* 4 rounds, and grounded companies also gain Chill 2.
- *Combo:* Deliberate hard tech against the tier-6 flyers (Oriflamme Wyvern, Thunderbird, The Ferry)
  and Dragonfly Cavalry. Drafting it is a read on the opponent — exactly the kind of decision the
  discovery layer should create.

### Tier 4

**The Turning Year** — 15 mana, counter-convert. **P1**
- *Standard:* Choose Burn, Chill, Hex, or Bloom. Every company on the field converts all counters of
  the other three types into the chosen type, one for one, capped at 9.
- *Upgraded:* Your companies' converted counters are doubled before the cap instead.
- *Combo:* Wild's signature and one of the most abusable spells in the catalog, intentionally.
  Rains + Verdant Surge + The Turning Year (Bloom) turns your whole army into a healing engine.
  Ashen Pall + The Turning Year (Burn) + Forgefire turns the enemy line into a bonfire. Converting
  is not a counter *application*, so it does not re-trigger application bonuses.

**Beast Sovereign** — 14 mana, enchantment. **P2**
- *Standard:* While this stands, allied Beast companies gain +2 Attack, +2 Defense, +2 speed, and
  Bloom 1 at each round start.
- *Upgraded:* They also retaliate without limit.
- *Combo:* The Beast build's payoff. With Wildcall, Beastmaster, Beast Tongue recruitment, and the
  Wolf-Mother's Torc, an all-beast army becomes a genuinely different game.

**Wind Shear** — 13 mana, mass. **P2**
- *Standard:* Push every enemy company 2 hexes away from a chosen hex. Any company blocked early
  loses 6% of its current HP.
- *Upgraded:* 3 hexes, 10%, and blocked companies gain Chill 1.
- *Combo:* Mass repositioning. Break a formation before Litany of Dawn, scatter a phalanx, or shove
  an entire melee line into your undergrowth field.

### Tier 5

**The Long Green** — 23 mana, mass. **P2**
- *Standard:* Every allied company is healed `18 × SP` HP with resurrection up to its starting count
  and gains Bloom 5. Every enemy company gains Chill 3 and Hex 3.
- *Upgraded:* `26 × SP`, Bloom 6, Chill 4, Hex 4.
- *Combo:* Wild's haymaker: the counter-flavoured mirror of Dayspring.

**The Weather Itself** — 21 mana, enchantment. **P2**
- *Standard:* While this stands, at the start of each round one weather effect fires, selected
  deterministically from the battle seed and the round number: **Hail** (all companies lose 4% of
  current HP), **Fog** (ranged damage halved this round), **Squall** (every company pushed one hex
  from the field's centre), **Sun** (all companies gain 15 morale), **Frost** (all companies gain
  Chill 1).
- *Upgraded:* You see next round's weather in advance, and Sun and Frost affect only your side and
  theirs respectively.
- *Multiple copies:* Weather is one global seeded event per round, not one event per enchantment.
  If either side maintains a Standard copy, Sun and Frost remain global. Otherwise each Upgraded
  owner contributes its own Sun-allies/Frost-enemies recipient slice; two Upgraded copies therefore
  cover both sides without doubling any damage, counter, movement, or morale magnitude.
- *Combo:* Deliberate chaos, deterministic under the hood so replays hold. It affects **both** sides
  — the skill is in building an army that profits from turbulence (fliers, phased companies,
  Counterweight, Bloom stacks) rather than one that merely survives it.

**Fly** — 18 mana, adventure. **P1**
- *Standard:* For the rest of today this hero pays 65 movement per tile and may cross Mountain and
  Water, but may not end their movement on Mountain or Water. Once per day.
- *Upgraded:* Also ignores guardian aggro for the day.
- *Combo:* The second half of the requested adventure-power pair. Dimension Door is a jump; Fly is a
  day of unrestricted travel. Upgraded Fly plus Logistics is a hero who ignores the map's topology
  entirely for one decisive day — and the once-per-day flag plus 300 movement means it is one day.

---

## Catalog invariants for the validator

- Exactly 124 spells; exactly 31 per school; tier distribution per school is 8/8/7/5/3.
- Every spell's mana is inside its tier's band (§60 3.1); X-cost spells (Reckoning) are exempt.
- Every spell declares a scaling shape — `fixed`, `capped`, or `open` — per doc 60 §4.2.1. Exactly
  one cantrip (`fixed`, 2 mana) exists per school. Every tier-1 impact spell is `capped`.
- Every spell has distinct Standard and Upgraded rules. The doc 58 equality set is **emptied** by
  this pass: all five formerly identical pairs are repaired here.
- Every spell maps to a registered effect-primitive handler and a `rulePresentation` record.
- Every guild tier pool is non-empty for every school after provenance exclusions.
- Provenance rares (Echo, Hourglass Crack, Borrow Shape, Loyal Unto Death) and Summon Skiff remain
  excluded from guild and scroll pools.
- Tier 4–5 spells are excluded from ordinary scroll generation; they appear as scrolls only from
  locks, barrows, and provenance sites.
- Every adventure spell of tier 4–5 carries `oncePerDay` or `oncePerWeek`.
