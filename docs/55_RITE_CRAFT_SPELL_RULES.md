# Work order 55 — Resolver-true Rite and Craft spell rules

Status: implemented 2026-08-12. All 34 Rite and Craft spells now have complete Standard and
Upgraded player rules derived from their current combat or adventure behavior. This work changes
descriptions and their semantic representation only; it does not change spell IDs, costs,
acquisition, targeting, saves, or executable mechanics.

## Outcome and authority

[`../src/content/spells/rulePresentation.ts`](../src/content/spells/rulePresentation.ts) is the
single authored rule source for the 17 Rite and 17 Craft spells. Each version is a
`SpellRulePresentation`: ordinary text interleaved with stable `SpellLexiconId` references from
[`../src/content/spellLexicon.ts`](../src/content/spellLexicon.ts). The existing catalog `base` and
`plus` strings are deterministic plain-text projections of those tokens, so current save, AI, test,
and UI consumers keep their compatibility fields without a second copy of the prose.

The combined `SPELL_RULE_PRESENTATIONS` record is deliberately a partial 68-spell record. Grave and
Wild can add parallel school records through the same version/token/projection contract without
editing the Rite/Craft data. Interactive term help is deferred; this work preserves the semantic
IDs needed by that later surface.

Executable resolvers remain the final authority when old catalog prose and runtime disagree. A
description must tell the player what the game does today. Resolver-identical versions repeat the
same complete rule; presentation must not invent a rider or narrate the implementation gap.

## Writing contract

Each Standard and Upgraded rule stands alone. It leads with the affected company, hero, City, map
object, tile, or battle state and states the amount, duration or trigger, limit, and material
restriction needed to understand the result. Upgraded copy repeats the complete rule rather than
depending on a terse “instead” delta.

Rule text may name a target where the target defines the mechanic, but it does not narrate cast
confirmation, legal-action plumbing, state fields, resolver names, or generic scaling formulas.
Spell Power is named only beside a value that the spell actually scales. Shared opaque terms such
as Burn, counter, timed effect, battle enchantment, summon, phase, resonance, and extra action are
term tokens rather than unstructured lookalike prose.

## Material corrections and clarifications

The rewrite preserves many old outcomes while making their actual bounds explicit. The following
are the material semantic changes from the prior compact catalog strings:

| Spell | Resolver-true player rule now captured |
|---|---|
| Rally | Upgraded requires two different allied companies and gives each 50 Morale. |
| Standard of Dawn | Both versions grant 10 Morale to every surviving ally after an allied kill; Upgraded does not prevent Morale drain. |
| Amplify | It accepts counters, timed effects, or battle enchantments; Upgraded adds 1 to a doubled counter or 1 round to a timed effect. |
| Sanctuary / Oath of Iron | Their minimum two-round duration and Spell Power extension are now stated. |
| Consecrate | Healing cannot revive lost units; Upgraded grants 5 Morale per counter removed. |
| Hymn of the Host | The multiplier is extra actions already taken by the caster's side in this battle. |
| Trial | The enemy must outnumber the largest surviving allied company; its current-HP loss can scale with Spell Power. |
| Census | The duration records exist, but no current screen reveals enemy inspection or movement information. |
| Feast Day | It affects Cities owned at cast time, lasts for the current week, is once per week, and Upgraded grants 500 gold per affected City. |
| Oathbind | It blocks only new counters and timed effects; existing effects remain, and Upgraded also disables abilities. |
| Wayside Shrine | The shrine persists on the tile until the next battle there, then is consumed. |
| Echo | It repeats the recorded version and X-mana spend with the current caster's Spell Power; Upgraded forces the repeated spell's Upgraded rules. |
| Forge-Spark | Its primary Burn scales with Spell Power and Burn bonuses; the adjacent Upgraded Burn is fixed at 1. |
| Reflect | It copies only a counter or timed effect, leaves the original unchanged, and may copy onto any living company, including the source. |
| Clockwork Escort | Standard summons `5 × (Spell Power + 1)` Tin Soldiers; Upgraded summons `2 × (Spell Power + 1)` Marionettes. |
| Wall of the Maker | The three walls use distinct empty hexes and last for battle; Upgraded applies Burn 1 once at each adjacent enemy's turn start. |
| Unmake | Either one chosen enchantment is removed or every counter on one chosen company is cleansed. Upgraded currently has no additional removal. |
| Gate | Only the owner's heroes can use the passage; Standard lasts through tomorrow and Upgraded through the current week. |
| Salt the Vein | Suppression lasts 5 or 8 days including today. Upgraded does not currently reveal lost production. |
| False Colors | Its duration and chosen display size are recorded, but it currently changes neither presentation nor enemy behavior. |
| Clockwork Courier | It swaps exact item or army slots between owned heroes; Upgraded may use a City garrison only for army slots. |
| Brittle | Standard starts at two rounds, Upgraded at three, and Spell Power can extend either; Upgraded also gives Burn 2. |
| Standing Mirror | It is a replaceable 30-HP immobile summon whose eligible copies choose opposing targets automatically. Upgraded currently has no additional effect. |
| Summon Skiff | Upgraded moves the nearest unoccupied boat regardless of owner, preserves its owner, and summons a new boat only when none is available. |
| Hourglass Crack | It grants one extra action and one skipped round; Upgraded chooses that skipped round from the next three. |

Blessing, Beacon, Clarion, Vigil of the Host, Ward, Forgefire, Quicksilver, Ironclad, and the core
target/outcome portions of the other entries retain their prior semantics, but now state their full
Standard and Upgraded rules rather than a cryptic delta.

## Recorded runtime/catalog discrepancies

This description pass intentionally does not repair mechanics. The currently observable gaps are:

- Standard of Dawn's Upgraded flag has no Morale-drain prevention behavior.
- Unmake's Upgraded cast has no second target/effect operation, so it cannot perform the formerly
  promised combined enchantment-and-counter removal.
- Standing Mirror does not store or use its own upgraded state and never gives the caster manual
  target choice for copied spells.
- Census records duration and movement flags, but no current gameplay or inspection consumer reads
  them.
- False Colors records a guardian-band display choice until enemy adjacency, but no renderer,
  observer, or AI behavior consumes it.
- Salt the Vein stores the suppressing caster, but no consumer reveals the promised lost production.
- Upgraded Summon Skiff selects any unoccupied boat rather than only an enemy boat and does not
  transfer ownership when moving it.

Missing-consumer spells state their blunt gameplay outcome; resolver-identical upgrades repeat the
same complete effect. The detailed discrepancies remain here rather than in player prose, and stay
mechanics decisions for separate work.

## Exhaustive gates

[`../src/content/__tests__/rite-craft-spell-rules.test.ts`](../src/content/__tests__/rite-craft-spell-rules.test.ts)
pins all 34 IDs, exact Rite-then-Craft catalog order, both versions, semantic token validity, exact
plain-text projection, and prose bans. Resolver-backed fixtures cover identical upgrades, Unmake,
Oathbind, Gate duration, mine suppression, Census records, and owner-neutral Skiff selection.

Acceptance commands:

```sh
npx vitest run src/content/__tests__/rite-craft-spell-rules.test.ts \
  src/content/__tests__/spell-lexicon.test.ts src/core/__tests__/spell-engine.test.ts \
  src/core/__tests__/phase-c-spells.test.ts \
  src/core/__tests__/phase-c-adventure-spells.test.ts \
  src/ui/__tests__/spellbook-contract.test.tsx --maxWorkers=1
npm run build
npm run spec-link-check
npm run ux-check
git diff --check
```
