# 67 — Faction Knacks: What a Hero Does With No Mana

**Status:** design work order. No code in this document.
**Depends on:** [60 Magic Overhaul](60_MAGIC_OVERHAUL.md) §5 (casting economy).
**Amends:** S04, S05, S06, S08, S09.

---

## 1. The gap

A hero with no mana currently does nothing. They stand off-board and watch. That is true on day one
before any spell is learned, true in round four of every early battle once a 10-mana pool is spent,
and true for any martial hero who drafted Attack cards instead of Knowledge.

Docs 60–61 fix the *ceiling* of hero power. This document fixes the **floor**: a free, at-will
action every hero always has, different for each faction, so that "my hero is out of mana" changes
what you do rather than whether you do anything.

It also does something the game currently does not do at all: **make faction choice visible in the
first battle**. S08 gives every faction a verb, but those verbs live in unit abilities and passives
that take several battles to notice. A Knack puts the faction's verb in the player's hands on turn
one of the first fight.

---

## 2. The system

> Every hero has one **Knack**, determined by their faction. Using it consumes the hero act, costs no
> mana, and is available in every battle from level 1.

| Rule | Value |
|---|---|
| Cost | The hero act — the same act shared by casting and item use |
| Mana | None |
| Frequency | Once per round, because the hero act is once per round |
| Availability | Every battle, from hero level 1, forever |
| Ranks | Three. Rank 1 at hero level 1, rank 2 at level 6, rank 3 at level 12 |
| Scaling | **Hero level only** — not Spell Power, not Attack, not Knowledge |
| Determined by | Faction. Not by hero, class, or specialty |

**Why it scales on level and nothing else.** The Knack must remain a floor, never a build. If it
scaled on Spell Power it would compete with the spell catalog; if it scaled on Attack it would make
Knowledge heroes worse at their fallback. Level-only scaling means two heroes of the same level have
identical Knacks and the difference between them lives entirely in their spells, skills, and
artifacts — where it belongs.

**Why it costs the hero act.** This is the whole balance of the feature. A Knack is what you do
*instead* of casting, never *as well as*. A hero with a good spell and full mana will rarely use it;
a hero at zero mana always will. Anything that grants an extra hero act (Sundered Hourglass, Pocket
Sundial, The Long Oath, Twicetold R3) may spend that act on a Knack, which is consistent and needs
no special case.

### 2.1 Boundaries

- Neutral guardian armies have no hero and therefore no Knack. Unchanged from S05.
- A Warden-installed garrison uses its installer's Knack **only** when Warden rank 3's five-tile
  remote-casting range applies, matching the existing rule for spells.
- A hero's Knack is theirs regardless of the army they command. A Hagwood Crone leading a captured
  Hearthguard army still uses Ill-Wish.
- Knacks are **not spells**. They cannot be Echoed, copied by Standing Mirror or Mirror Hall,
  reflected by the Mirrorshard Pendant, blocked by Sanctuary, or upgraded by resonance. They are
  the hero equivalent of a faction passive that happens to be active.
- The Rusted Tongue burden (doc 65 §7) is the one printed thing that disables a Knack, and it pays
  for that with −3 mana on every spell.

### 2.2 Knacks do not make cantrips redundant

The two-mana cantrips in doc 61 cost the same hero act and are still worth casting, because a spell
is a spell: it benefits from resonance, from Spell Power on its upgraded rules, from The Cracked
Prism, from Mirror Hall, from Echo, and from every artifact that keys on casting. The Knack is the
floor when you have nothing; the cantrip is the floor when you have two mana. Both exist so the hero
act is never wasted at any point on the curve.

---

## 3. The six Knacks

Each is the faction's S08 verb, made active. In-world names follow the S08 voice for that culture.

### Hearthguard — **Hearten** *(morale)*
> Plain and proud. A word down the line before the charge.

| Rank | Effect |
|---:|---|
| 1 | One allied company gains 20 morale |
| 2 | 30 morale |
| 3 | 40 morale, and a second allied company gains 20 |

The most straightforwardly strong Knack, and correctly so — Hearthguard's whole identity is morale
manipulation, and morale converts to extra actions. It also means a Hearthguard hero with no
spellbook at all still drives the action-economy archetype from doc 62 §1.6.

### Wound-Wrights — **Patch** *(repair)*
> Guild-speech, reverent and matter-of-fact. Nothing is broken; things are merely between repairs.

| Rank | Effect |
|---:|---|
| 1 | Heal one allied company for 5% of its maximum HP. No resurrection |
| 2 | 8% |
| 3 | 12%, and constructs are healed for double |

Percentage-of-maximum obeys the S01 target-scaling law, so Patch is worth the same relative amount
at every army size. The construct clause makes it the free half of the Wound-Wright attrition build
and pairs with the Reliquary Ark's `procession_of_repair`.

### The Unfinished — **The Errand Remembered** *(recursion)*
> Gentle, present tense, unresolved. *You had not finished. Go on.*

| Rank | Effect |
|---:|---|
| 1 | Return units to one allied company, up to `10 + 3 × level` HP worth, never above its starting count |
| 2 | `10 + 5 × level` |
| 3 | `10 + 7 × level`, and it may target a company destroyed earlier this round, returning it at a minimum of one unit |

Free at-will resurrection, tiny at first and meaningful by level 12. Rank 3's ability to reach a
company destroyed *this round* is the Unfinished identity in one line, and it is a genuine reason to
play them without ever drafting a resurrection spell.

### The Vespiary — **Lay Resin** *(terrain)*
> Formally courteous and alien. The Hive extends the courtesy of a difficult floor.

| Rank | Effect |
|---:|---|
| 1 | Place one resin tile on an empty hex adjacent to an enemy company. Entering costs 2 extra movement; a company ending its turn there gains Chill 1 |
| 2 | Place it on any empty hex |
| 3 | Place two |

The only Knack that changes the board rather than a company, and the only one whose value compounds
across a long fight. Reuses the existing persistent-tile machinery in `battleTiles.ts` and the
Amber-Carriers' `resin_trail`. At rank 3 a Vespiary hero can seal a lane without owning a single
Craft spell.

### The Hagwood — **Ill-Wish** *(curse)*
> Folktale cadence, shaped like a bargain. *It would be a shame if that went badly for you.*

| Rank | Effect |
|---:|---|
| 1 | One enemy company gains Hex 1 |
| 2 | Hex 2 |
| 3 | Hex 3, and the target loses 10 morale |

At-will Hex application from turn one, which makes every Hagwood hero a natural Hex-archetype player
(doc 62 §1.19) before they own Wither or Grudge. Three rounds of rank-3 Ill-Wish reaches Hex 9 —
+45% damage taken — at the cost of casting nothing else, which is exactly the trade the design
wants a player to weigh.

### Wildergrass Clans — **Blood Drum** *(blood price)*
> Terse and drum-rhythmic. Grief is neither gothic nor abstract; it is spent forward.

| Rank | Effect |
|---:|---|
| 1 | One allied company loses 3% of its current HP. Every **other** allied company gains 10 morale |
| 2 | 15 morale and +1 speed for the round |
| 3 | 20 morale and +1 speed, and the company that paid gains +2 Attack for the round |

The only Knack with a cost, and the most thematically exact of the six. It also has the deepest
combo profile in the set: it feeds the `blood_price` passive, Loyal Unto Death, Last Candle,
Unfinished Business on allied Unfinished companies, and the Sacrifice Ledger archetype — while
being free, at-will, and available at level 1.

---

## 4. Presentation

The Knack is a **permanent, always-visible button** in the combat hero bar, sitting beside Cast and
Use Item. It shows the Knack's name, its current rank, its exact effect text, and its targeting
requirement. It is disabled only when the hero act is already spent, and the disabled reason says
so.

This placement is the point. A new player's first battle presents three hero verbs — cast, use item,
and a named faction ability — instead of one greyed-out spellbook. The Knack is the tutorial for
"the hero acts every round," delivered without a tutorial.

Each Knack needs a 32×32 icon per doc 46 (six assets) and an in-world flavor line to the S01
register.

---

## 5. AI

The AI uses its Knack whenever it takes no other hero action that round. One heuristic per faction,
matching the existing `aiHints` vocabulary:

| Faction | AI target |
|---|---|
| Hearthguard | The allied company with the highest morale below threshold |
| Wound-Wrights | The allied company with the largest absolute HP deficit |
| Unfinished | The allied company with the largest unit deficit |
| Vespiary | The empty hex on the shortest path between the nearest enemy and the AI's weakest company |
| Hagwood | The strongest enemy company |
| Wildergrass | The allied company with the highest current HP, when at least two allies survive |

This is a genuine AI improvement independent of everything else in docs 60–67: today an AI hero out
of mana does nothing at all for the rest of the battle.

---

## 6. Optional: adventure Knacks — recommend deferring

The exploration loop is currently faction-blind. A hero's faction changes their native terrain cost
and nothing else. Six once-per-day adventure Knacks would fix that:

| Faction | Adventure Knack |
|---|---|
| Hearthguard | **Muster** — 100 movement, once per day: an adjacent owned city adds one tier-1 unit to your army |
| Wound-Wrights | **Make Do** — 200 movement, once per day: convert 2 timber into 1 iron |
| The Unfinished | **Ask the Road** — free, once per day: reveal the nearest unvisited map object |
| The Vespiary | **Render** — 100 movement, once per day: convert your last battle's casualties into 20 gold each |
| The Hagwood | **Small Bargain** — once per week: trade 300 gold for 1 essence |
| Wildergrass Clans | **Ride Light** — free, once per day: +200 movement today, −100 tomorrow |

**Recommendation: defer these to a later phase.** The combat Knacks solve the stated problem
("something to do when out of mana") on their own, and each adventure Knack touches a different
subsystem — recruitment, the marketplace, fog, post-battle accounting, resources, and the movement
budget. That is six integration surfaces for a feature that is flavour-first. Ship the combat
Knacks, play with them, and revisit.

---

## 7. Validation impact

| Area | Change |
|---|---|
| Hero model | A derived `knack` (from faction) and `knackRank` (from level) on every hero and battle hero. Derived, not stored, so no save-format change is required |
| Actions | One new `BATTLE_USE_KNACK` action with a target, enumerated through `legalBattleActions` like every other hero action. Explicit and replayable per S02 |
| Hero act | Shares `castRound` with casting and item use. Extra-act grants apply normally |
| Combat UI | A permanent third hero-bar control with rank, effect text, targeting, and disabled reason |
| Tiles | Lay Resin reuses the persistent battlefield tile registry; no new tile machinery |
| AI | Six fallback heuristics per §5 |
| S04 | Document the Knack as a hero act alongside casting and item use |
| S05 | State explicitly that a Knack is not a spell and cannot be copied, echoed, reflected, blocked by Sanctuary, or upgraded by resonance |
| S06 | Add the Knack to the hero model and its three level thresholds |
| S08 | Add each faction's Knack name and voice line to its identity section |
| S09 | Validator: exactly six Knacks, one per playable faction; each has three ranks with nonempty effect text, a registered handler, an icon, and flavor |

**Test priorities.** That a level-1 hero with an empty spellbook and zero mana has a legal hero
action in every round of every battle; that the Knack correctly consumes the shared hero act; and
that it is *not* copyable by Standing Mirror, Mirror Hall, Echo, or the Mirrorshard Pendant.
