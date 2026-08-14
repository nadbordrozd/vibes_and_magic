# 65 — Artifacts v2: Relics That Change Rules

**Status:** design work order. No code in this document.
**Depends on:** [60 Magic Overhaul](60_MAGIC_OVERHAUL.md), [63 Content Support v2](63_CONTENT_SUPPORT_V2.md)
§2, which this extends rather than replaces.
**Amends:** S06, S09.

---

## 1. The problem

Of 90 artifact definitions, **36 are `class: 'vanilla'` and do nothing but add a number** — and
twelve of those are the same effect three times (`+1/+2/+3 attack` weapons, `+1/+2/+3 defense`
shields, `+1/+2/+3 spell power` heads, `+150/+300/+500` cloaks). A further 22 charms are mostly
small numbers with a condition. Finding an artifact is currently an accounting event, not a
discovery.

Stat sticks should exist — they are the reliable floor that makes the rare stuff feel rare. They
should not be 40% of the catalog. The fix is not to delete them; it is to bury them under enough
rule-warping artifacts that the *expected* find is interesting.

### 1.1 The design law for artifacts, going forward

> **An artifact should name a mechanic and change its rules.** If it can be fully described as
> "+N to a number," it is a vanilla staple and the catalog already has enough. Every new charm,
> relic, and burden must change *what is possible*, not *how much*.

Corollary: an artifact is allowed to be situational, conditional, or actively bad in the wrong
build. That is what makes the loot table interesting. A relic that is useless to four of six
factions and build-defining to the fifth is a good relic.

### 1.2 Target composition

| Class | Now | Doc 63 | This doc | Target | Share |
|---|---:|---:|---:|---:|---:|
| Vanilla | 36 | — | — | 36 | 24% |
| Charm | 22 | +8 | +14 | 44 | 30% |
| Relic | 18 | +8 | +19 | 45 | 30% |
| Burden | 4 | +4 | +5 | 13 | 9% |
| Kit | 4 | — | — | 4 | 3% |
| Trinket | 6 | — | — | 6 | 4% |
| **Total** | **90** | **+20** | **+38** | **148** | |

The named rows in this document total 38: Spare Tongue is part of the Magic batch. The executable
catalog therefore closes at 148, not the earlier draft arithmetic of 147.

Nothing is removed, so no save or map reference breaks. The vanilla share falls from 40% to 24%
purely by dilution.

---

## 2. Adventure and topology (8)

The adventure map is where an artifact can feel most transformative, because it changes the shape of
your whole turn rather than one damage number. This axis is currently almost empty — six movement
artifacts, all of them "+N move/day."

| Artifact | Slot | Class | Effect |
|---|---|---|---|
| **The Long Ladder** | boots | relic | Once per day, cross one Mountain tile as if it were Meadow |
| **Ferryman's Lantern** | misc | relic | Your hero may cross up to three consecutive Water tiles without a boat. A fourth is illegal, so it opens straits, not oceans |
| **The Backward Boot** | boots | charm | Once per day, return instantly and freely to the tile where this hero began the day |
| **Milestone Stone** | misc | relic | Plant a marker on any tile you occupy. Once per week, teleport to it from anywhere. Re-planting is free |
| **Cartwright's Wheel** | misc | relic | Unspent movement carries into the next day, up to one full day's worth *(activates the doc-30 backlog pencil)* |
| **The Patient Compass** | amulet | charm | Choose an object kind when equipping. Permanently points at the nearest unvisited object of that kind, revealing its tile |
| **The Hollow Key** | ring | relic | Once per week, collect one guarded reward without fighting. The guardian remains in place |
| **Crow's Errand** | cloak | charm | Once per day, send one artifact or one army company to any other owned hero on the map |

The Backward Boot deserves a note: it turns every exploration turn into a free scouting run. Combined
with Cartwright's Wheel it is the single strongest early-game economy artifact in the catalog, and
neither of them touches a combat number.

---

## 3. Economy (7)

Also nearly empty today: one +200 gold/day purse, one trade-goods charm, and a price penalty.

| Artifact | Slot | Class | Effect |
|---|---|---|---|
| **Miser's Thumb** | ring | relic | Marketplace exchanges resource for resource directly at 2:1, bypassing the gold round-trip in S07 |
| **The Founder's Trowel** | misc | relic | On the first day of each week, one owned city may build twice |
| **The Borrowed Purse** | misc | charm | Your gold may fall to −2000. At each week start the debt is repaid with 25% interest, taken from income before anything else |
| **Tithe Box** | misc | charm | 10% of all gold you spend is refunded at week end |
| **The Growing Ledger** | amulet | relic | Choose a dwelling tier when equipping. That tier grows +50% in every owned city |
| **The Salt Sack** | cloak | charm | A mine you lose keeps paying you for three more days |
| **The Tallystick** | misc | charm | Each day, gain 1 of whichever resource you currently hold least of |

The Founder's Trowel breaks the one-build-per-day rule in S07 in a printed, bounded way — once a
week, one city. That is the correct shape for an artifact that touches a core economic constraint.

---

## 4. Magic (7)

Doc 63 §2 already added eight magic charms and eight magic relics. These are the wilder ones.

| Artifact | Slot | Class | Effect |
|---|---|---|---|
| **The Spare Tongue** | head | relic | You may cast any spell known by another owned hero within five tiles, at half Spell Power |
| **The Pauper's Grimoire** | misc | relic | Your spells cost no mana, but you may only cast tier 1 and tier 2 spells |
| **Wax-Sealed Envelope** | misc | relic | At the start of each battle, one spell from your book is cast for free, chosen deterministically from the battle seed |
| **The Nesting Doll** | misc | relic | The first company you summon each battle immediately summons a second at half its count |
| **Mirrorback Cloak** | cloak | relic | The first enemy spell each battle that targets one of your companies instead targets a company on the caster's own side, chosen by you |
| **The Quiet Bell** | amulet | charm | Enemy heroes cannot cast in round one |
| **The Ninth Pip** | ring | relic | Counters on **your** companies do not decay at turn end |

The Pauper's Grimoire is the clearest example of the design law working: it is a strict downgrade
for an archmage and a complete build for a level-4 hero with a good tier-2 spell. Which of those you
are is decided by what the run has dealt you — exactly the variance the brief asks for.

The Ninth Pip cuts both ways: your Bloom never decays, and so does the enemy's Burn on you.

---

## 5. Combat rule-warping, non-magic (7)

| Artifact | Slot | Class | Effect |
|---|---|---|---|
| **The Long Table** | misc | relic | Your hero fields **eight** army slots instead of seven |
| **The Odd Boot** | boots | charm | One company of your choice deploys anywhere on your half of the field instead of in the deployment column |
| **Hand-Me-Down Armor** | armor | relic | When one of your companies is destroyed, the next of your companies to act gains its Attack and Defense for the rest of the battle |
| **The Regimental Colors** | cloak | charm | Your smallest company counts as three times its size for morale and destruction-proportionality purposes only |
| **The Cracked Whistle** | misc | charm | Enemy companies at Chill 3 or higher cannot retaliate |
| **The Grudge Book** | misc | charm | +2% damage per battle you have already fought against that faction this game, to a maximum of +30% |
| **Deadman's Wedge** | shield | charm | The first time each battle one of your companies would be pushed, teleported, or beckoned, it is not |

**The Long Table** is the single most desirable artifact in this document and should be weighted
accordingly — an eighth slot is a permanent army-composition upgrade that touches recruitment,
transfers, and every battle. It also makes the §4.4 adventure-trait creatures in doc 64 affordable,
because the eighth slot is where the `ley_touched` familiar lives.

**The Regimental Colors** deliberately inverts the S04 destruction-proportionality guard for one
company. It does not break the guard — a splinter still cannot pay full rewards — it just moves
where the threshold sits, which is a legitimate, printed, findable exception.

---

## 6. Conditional and build-shaping (4)

Artifacts whose value depends on how you are already playing. These are the strongest expression of
goal 3 in the whole content set, because they reward a commitment you made two hours ago.

| Artifact | Slot | Class | Effect |
|---|---|---|---|
| **The Twin Coin** | amulet | relic | If you control exactly two heroes, every hero you own gains +2 to all primary stats. With three or more, every hero loses 1 to all primary stats |
| **The Empty Frame** | misc | relic | At each week start, this becomes a copy of a random artifact in your backpack, chosen deterministically from the week's seed |
| **The Second Face** | head | charm | Once per week, permanently move one point from any of this hero's primary stats to another |
| **The Debt Ledger** | misc | relic | You may carry a third Debt. Each active Debt on this hero gives +2 to every primary stat |

The Debt Ledger is the Hagwood build's keystone and, in the right hands, +6 to every stat. It is also
a printed invitation to accept Debts you would otherwise refuse, which is exactly what a bargaining
faction's artifact should do. It does not waive, hide, or soften any Debt — S01's Bargain law is
untouched.

---

## 7. Burdens (5)

Burdens are the purest form of the requested design: outsized power, an inspectable cost, and a
stated removal condition. Doc 63 added four; five more, with removal conditions that are *goals*
rather than chores.

| Burden | Slot | Effect | Removal |
|---|---|---|---|
| **The Glutton's Bit** | weapon | +5 Attack. After every battle, your largest company loses 10% of its units | Win a battle without losing a single unit |
| **The Sleepless Crown** | head | +4 Knowledge and +4 Spell Power. This hero's daily movement is halved | Spend seven consecutive days inside one city |
| **The Open Purse** | misc | All income doubled. You may not build in any city on odd-numbered days | Pay 10,000 gold at a Marketplace |
| **The Faithful Hound** | misc | +3 to every primary stat. This hero can never enter a city — no Tavern, no guild, no recruitment, no mana refill | Defeat an enemy hero of equal or higher level |
| **The Rusted Tongue** | amulet | Your spells cost 3 less mana. Your hero cannot use the Faction Knack (doc 67) | Learn a tier-5 spell |

The Faithful Hound is the most interesting of these: it converts a hero into a permanent field
agent who can never refill mana normally, which makes Wellspring (doc 61) and the Ferryman's
Lantern suddenly load-bearing. A burden that reshapes your route is worth more than one that
subtracts a number.

---

## 8. Artifact sets

The Tailor's Kit is currently the only set, and it is a four-piece victory-adjacent macguffin. Small
sets are a much better lootbox driver: finding piece two of three creates a *goal* that persists
across the rest of the run.

Three sets, each reusing existing artifacts for most of its pieces so the content cost is near zero:

**The Tinker's Rounds** — Craft and economy
- Pieces: Tinker's Spectacles *(existing)* · Miser's Thumb *(§3)* · The Founder's Trowel *(§3)*
- 2 pieces: Mage Guild inscription costs 2 essence instead of 4
- 3 pieces: Marketplace rates ×0.5 and one owned city may build twice on **every** week day 1

**The Mourner's Suit** — Grave and death triggers
- Pieces: Gravebinder's Sash *(existing)* · Candle-Snuffer's Ring *(existing)* · The Longest Candle *(existing)*
- 2 pieces: your Hex counters do not decay
- 3 pieces: the first allied company destroyed each battle returns at 50% instead of 25%

**The Drover's Kit** — movement and beasts
- Pieces: Drover's Crook *(existing)* · Whetstone of the Clans *(existing)*
- 2 pieces: Beast companies gain +2 speed and the hero gains +200 movement per day

Set bonuses count **equipped distinct pieces**, exactly like the Tailor's Kit, and inspection must
show the full set membership and current progress on every piece's card.

---

## 9. The sprite problem, and a recommendation

S09 requires every one of the 90 artifacts to own a distinct 32×32 transparent native sprite, the
manifest has **no fallback path**, and current coverage is **0 of 90**. This document and doc 63
together propose 58 more, taking the requirement to 148 sprites for a catalog that today renders
zero of them.

That gate will stall content development completely if it is enforced as-is.

**Recommendation — split the gate in two:**

1. **Development gate (new, lenient).** Introduce a `class × slot` generic placeholder family —
   roughly 24 sprites covering vanilla/charm/relic/burden/kit/trinket against the main slot shapes
   (blade, shield, helm, cloak, ring, amulet, boot, armour, oddment). A new artifact resolves to its
placeholder and is legal in development, tests, and playtest builds. This unblocks all 58 new
   artifacts behind 24 new assets.
2. **Release gate (existing, strict).** Shipping a release still requires a distinct native sprite
   per artifact ID. The placeholder resolver is compiled out of production builds, so a missing
   sprite is a build failure exactly as it is now.

This preserves the intent of the no-fallback rule — no shipped artifact may share art — while
letting mechanics and art proceed on different schedules. It needs a DECISIONS entry and an S09
amendment, and it applies equally to the new spells, skills, creatures, and lexicon terms proposed
across docs 60–67.

If you would rather not split the gate, the alternative is to phase the artifact batches strictly
behind art generation, which roughly triples the wall-clock time to get any of this playable.

---

## 10. Validation impact

| Area | Change |
|---|---|
| Counts | 90 → 148 definitions (138 ordinary). Final classes: 36 Vanilla, 44 Charm, 45 Relic, 13 Burden, 4 Kit, and 6 Trinket |
| Effect tags | ~34 new tags across §2–§7. Every one must be a registered tag-based handler, not an artifact-ID branch — this is the standing complaint in RECONCILIATION_BUGS' audit notes |
| Slot rules | The Long Table changes `MAX_ARMY_SLOTS` from a constant to a per-hero derived value. This touches recruitment, transfers, splitting, garrison exchange, battle setup, and serialization; treat it as its own task |
| Sets | A new `setId` field on artifact definitions, a set registry with per-count bonuses, and set-progress display on every member's inspection card |
| Adventure hooks | §2 and §3 artifacts evaluate at day start, week start, movement, marketplace, and building actions |
| Determinism | Wax-Sealed Envelope and The Empty Frame derive from the battle seed and the week seed respectively; neither may consume ambient randomness |
| Sprites | §9. Either 58 new native assets or the split gate |
