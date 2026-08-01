# Magic, Effects, Bargains, and Debts

## Schools and faction pairs

There are exactly four schools: Rite, Craft, Grave, and Wild. Every playable faction owns one unique
unordered pair, covering all six combinations:

| Faction | Pair |
|---|---|
| Hearthguard | Rite + Craft |
| Wound-Wrights | Craft + Grave |
| The Unfinished | Rite + Grave |
| The Vespiary | Craft + Wild |
| The Hagwood | Wild + Grave |
| Wildergrass Clans | Rite + Wild |

Rite and Grave are thematic opposites; Craft and Wild are thematic opposites. Opposition guides
acquisition weighting and voice, not a universal damage-resistance rule. Faction abilities are not
spells and do not consume spellbook or casting resources.

## Mana and casting

Maximum mana is `10 × Knowledge`. Field regeneration is +1 per day plus explicit modifiers; entering
a friendly town restores the pool fully. A neutral army has no hero and never casts.

In combat, a hero may cast once per round at the start of any allied stack’s turn, before that stack
acts. Casting does not consume the stack action, but does consume the hero act shared with item use.
Skills and artifacts may explicitly waive or add a hero act. Targets and spend are explicit actions.

Unless a spell says otherwise, values printed for SP 0 scale as follows, rounded down:

- duration: +1 round per 6 Spell Power;
- counter magnitude: +1 per 5 Spell Power;
- percentage-of-HP effect: +1 percentage point per 2 Spell Power.

The target-scaling law in [`S01_RATIONALE.md`](S01_RATIONALE.md) governs exceptions. X-cost spells
spend all remaining mana and record the amount spent. Scaling spells expose their battle statistic
in the tooltip. Topology and adventure spells still use explicit actions.

## Four counters, exactly

Counters are visible pips on a stack, capped at 9. They persist within a battle and never between
battles. Every counter type on a stack decreases by 1 at that stack’s turn end, subject to explicit
skill modifiers.

| Counter | School | Rule |
|---|---|---|
| Burn | Craft | At turn start, take `N%` of current total HP, minimum `N` HP. |
| Chill | Grave | Passive speed `−N`, minimum speed 1. |
| Hex | Grave | Passive damage taken `+5%` per point. |
| Bloom | Wild | At turn start, heal `N%` of max HP; never resurrect dead units. |

No fifth generic counter may be added. A distinct persistent behavior uses a timed effect,
enchantment, tile, Debt, or specific stack field instead.

## Battle enchantments

Each side has exactly two visible enchantment slots. An enchantment persists for the battle and is a
targetable object. Casting a third requires choosing one of the caster’s existing enchantments to
replace. Sour, Amplify, Reflect, and Unmake may target valid friendly or hostile enchantments.
Persistent physical pseudo-stacks/tiles such as Standing Mirror and Wall+ do not consume these slots.

## Twisters

Each school owns one effect-targeting-effect verb:

- **Amplify / Rite:** double a counter pile (cap 9), enchantment numbers, or timed magnitude; + face
  also extends applicable duration/decay.
- **Reflect / Craft:** copy a valid active effect to another legal target; + face copies to two.
- **Sour / Grave:** Bloom becomes equal Hex; a beneficial timed effect is removed and leaves Hex 2;
  an enemy enchantment is destroyed. The + face adds its catalog rider.
- **Overgrow / Wild:** spread an effect at its current magnitude to every adjacent stack, friend or
  foe; + face may exclude one adjacent stack.

Twisters operate through target-selection and effect-operation registries rather than spell-specific
UI assumptions.

## Base and + faces

Every spell has one base face and one + face. A + face changes behavior through targets, riders,
triggers, topology, or interaction; permanent per-hero upgrades record which face is known.
Temporary resonance causes eligible spells to resolve as + without changing learned state.

Upgrade channels are:

1. school shrines teach their staple when unknown and offer an upgrade to a known school spell;
2. guild inscription at a friendly guild costs 4 essence;
3. the rare Inscribe level card appears from level 4;
4. terrain/site resonance upgrades that school for both sides during that battle;
5. explicit specialties, skills, artifacts, scroll faces, or the complete Tailor’s Kit.

A stored base-face scroll stays base even on resonant terrain; an authored + scroll stays +. Bottled
Echo repeats the recorded face and X spend while recalculating scaling from its user’s SP.

## Resonance

A battle can be resonant in zero or more schools. Deepwood supplies Wild, Barrowfield Grave,
Lacquer Flats Craft, and castles/consecration Rite. A Seam supplies all four. Point barrows and mines
may retain authored Grave/Craft resonance on another terrain. Still Air suppresses tile resonance;
the Veil supplies Grave globally.

Resonance applies equally to both sides unless an explicit artifact changes ownership. Seamstone
replaces tile choice with its equipped school. The complete Tailor’s Kit supplies all schools.
Resolver ownership rules remain explicit when effects collide.

## Spell acquisition

Mage Guilds have three sequential levels. Their deals are seeded at map setup: about 80% from the
castle faction’s pair, about 20% from adjacent schools, and effectively none from the school(s)
excluded by the pair/opposition rules. A visiting friendly hero learns all dealt spells. Costs,
deal sizes, spell IDs, rarity, source exclusions, and AI hints live in
[`../../src/content/spells/index.ts`](../../src/content/spells/index.ts) and
[`../../src/content/spells/expansion.ts`](../../src/content/spells/expansion.ts).

Common staples can be reliable. Uncommon and rare acquisition obeys offer-shaped anti-planning.
Provenance spells never appear in guilds and come only from their named sites. Summon Skiff is live
only on maps where a shore/boat target exists.

## Adventure magic

Adventure spells are explicit map actions. The standard cost is printed mana plus 300 movement;
Provisioner rank 2 reduces only the movement surcharge by 150. They compete with battle mana and
route tempo and therefore are not free daily rituals. Once-per-day/week restrictions, visible target
requirements, created topology, delayed costs, and destination legality are serialized in state.

Permanent or temporary map changes—Gate pairs, thickets, consecrated sites, bridge completion,
boat placement—must be explicit data. A future renderer cannot infer them from logs or flavor.

## Bargains and Debts

Bargains are offer cards whose immediate benefit and exact Debt are both visible before acceptance.
The current eight definitions live in
[`../../src/content/bargains.ts`](../../src/content/bargains.ts). Hagwood heroes can receive one in
level drafts from level 3 by replacing one skill card; others encounter them at a Bargain Post or
rare Crone site. A hero at the two-Debt cap receives no offer.

Debts are spellbook-visible scheduled state. They cannot be targeted, dispelled, Soured, traded,
sealed, or voluntarily waived. Scheduled obligations fire deterministically. An unpaid What Was
Promised installment keeps the named building dormant until a later payment; dormancy suppresses
income, growth, services, travel, defense, and faction hooks.

The binding future-content law is repeated because it is an acceptance spot-check: every Debt is
**concrete, scheduled, and visible—never random, hidden, or waivable.** Altered non-Hagwood or hero-
specialty terms must be printed on the offered card.

## Catalog boundary

The catalog supplies spell names, school, mana, kind, rarity, base/+ text, AI hints, effect operation,
and provenance eligibility. Rules code supplies generic operation handlers. See
[`S09_CONTENT_INDEX.md`](S09_CONTENT_INDEX.md) for validation invariants and data ownership.
