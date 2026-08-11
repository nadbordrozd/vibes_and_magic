# 53 — Authoritative Spell Effect Lexicon

Status: implemented and verified on 2026-08-11. This work order adds semantic content and
presentation contracts only. It does not change spell mechanics, generate art, or replace the 68
Standard and Upgraded catalog descriptions.

## Problem and authority

The spell catalog is complete, but compact rules use terms such as Bloom, counter, active effect,
battle enchantment, resonance, and phase without one reusable player definition. Repeating those
definitions in every spell would invite drift, while deriving definitions from UI text would put
rules authority in presentation code.

[`../src/content/spellLexicon.ts`](../src/content/spellLexicon.ts) is now the canonical semantic
boundary between spell rules and future help, inspection, status, and description presentation. It
contains:

- 30 typed reusable lexicon entries with stable IDs, player names, concise rules, literal physical
  subject briefs, aliases, and search tokens;
- a text/term token union that retains the referenced term ID for interactive presentation and has
  a deterministic plain-text projection for noninteractive surfaces;
- an all-68 coverage table that names each spell's actual combat or adventure resolver branch and
  the reusable terms its rules depend on;
- 19 explicit ordinary-language disposition buckets. Actor words, quantities, visible resources,
  time, ordinary HP language, map destinations, ownership, and similar terms remain prose for a
  stated reason rather than disappearing from the audit.

The catalog continues to own each spell's name, school, cost, kind, rarity, Standard/Upgraded text,
and AI hints. Core resolvers continue to own executable behavior. The lexicon explains shared
player concepts and references behavior; it cannot create or change behavior.

## Entry and token contract

Every reusable entry has these required fields:

| Field | Contract |
|---|---|
| `id` | Stable typed semantic ID; UI labels and wording may change without changing references. |
| `name` | Player-facing term name. |
| `rule` | Concise plain-English rule with no source names, state fields, or developer diagnostics. |
| `visualSubject` | Literal physical subject inventory for later image generation, not a style prompt or claim that art exists. |
| `aliases` | Lower-case player-facing phrases recognized in rules and inspection copy. |
| `tokens` | Lower-case search/index terms including useful inflections. |

`SpellRuleToken` is either literal text or a `termId` reference with an optional contextual label.
Thus a future description may say “Give the ally ” + term `bloom` labeled “Bloom 3” without copying
Bloom's definition. Semantic UI may attach the definition to that reference; plain-text UI projects
the same tokens to the exact readable sentence. The current catalog descriptions are deliberately
unchanged until a later writing and UI work order adopts the tokens across all surfaces.

Counter inspection and the matching help glossary entries consume the lexicon immediately. This
removes an old Bloom inspector sentence that incorrectly said “1 HP per counter”; spellbook and
targeting descriptions remain on the unchanged 68-entry catalog until the later token migration.

## Lexicon scope

The 30 reusable concepts cover:

- the four counters and their shared lifecycle: Burn, Chill, Hex, Bloom, Counter, and Cleanse;
- effect structure: Active effect, Company status, Beneficial effect/buff, Harmful effect/debuff,
  Timed effect, Battle enchantment, and Twister;
- battle mechanics: Ability, Morale, Extra action, Forced movement, Phase, Summon, Death trigger,
  Undergrowth, and Wall hex;
- adventure and cross-context mechanics: Beast, Guardian, Growth, Omen, Resonance, Spell Power,
  Barrowfield, and Deepwood.

Company, ally/enemy, adjacency, exact amounts, combat/map time, mana, visible combat statistics,
ordinary HP verbs, positions, items, exploration verbs, learning, movement, ownership, replacement,
targets, and travel are exhaustively assigned to the 19 ordinary buckets. They remain ordinary only
while their spell usage is literal and fully quantified; a later special rule must promote the
concept to a lexicon entry rather than hide it in an untracked exception.

## Bloom runtime reconciliation

The acceptance test invokes the real battle creation, stored-spell resolver, counter application,
and stack turn-boundary functions. It pins the implemented behavior:

- the Standard Bloom spell adds Bloom 3 to one allied company;
- the Upgraded spell adds Bloom 4 to the target and Bloom 1 to each adjacent allied company;
- all counter addition is capped at 9;
- at turn start, Bloom N attempts to heal N% of the surviving company's full maximum HP, but the
  healing function can repair only the currently surviving top unit and cannot increase company
  count or restore a destroyed company;
- at that company's turn end, Bloom normally falls by 1 with the other counters.

One pre-existing mismatch is recorded without changing mechanics: S05's default law says counter
magnitude gains 1 per 5 Spell Power unless a spell says otherwise, while the Bloom resolver applies
fixed 3/4 amounts and never calls the generic counter-scaling helper. Forge-Spark, Wither,
Grave-Chill, and Quiet do call that helper for their relevant counter amounts. A future mechanics
decision must either make Bloom scale or explicitly exempt its printed amounts; this presentation
foundation does neither.

## Other catalog/runtime audit findings

The all-68 branch audit also exposed the following pre-existing differences. They are recorded here
so later description work does not present catalog prose as proven runtime behavior. This work order
does not choose or implement a correction:

- Upgraded Unmake promises to destroy the chosen enchantment and its applicable counter pile, but
  the active-effect model selects either one enchantment or one counter target. The resolver removes
  the selected enchantment or clears the selected company's counters; its Upgraded follow-up has no
  stack target and therefore does not perform the promised combined removal.
- Overgrow adds the copied counter or timed effect to the source as well as adjacent companies. That
  doubles a source counter and duplicates a source timed effect, while S05 and catalog copy say to
  spread the effect to adjacent companies at its current magnitude.
- Upgraded Shed Skin remains ally-only in legal targeting, removes only the first timed effect (or
  first nonzero counter), and gives Bloom only to that target. It does not accept an enemy target or
  spread Bloom nearby as its catalog rule says.
- Upgraded Summon Skiff chooses the nearest unoccupied boat without checking that it is enemy-owned;
  the catalog specifically promises the nearest enemy boat.
- Wild Growth resolves only against the city collection even though its catalog and error text also
  promise an owned dwelling target.
- Sanctuary, Oath of Iron, and Quiet use a Spell Power-scaled two-round timed effect in code, but
  their Standard and Upgraded catalog descriptions do not print that duration. Mourner's Veil has
  the same two-round Standard runtime duration while only its Upgraded copy prints three rounds.

Death's Ledger and Grave-Speech use intentionally compact stored evidence: the former reveals map
objects placed on Barrowfield rather than a separately typed barrow/scroll relationship, and the
latter presents the stored battle summary rather than replaying the action sequence. Their catalog
wording should be checked when the 68 descriptions are rewritten, but the current data model does
not establish enough contrary structure to classify either as a mechanics correction here.

## Exhaustive gates

[`../src/content/__tests__/spell-lexicon.test.ts`](../src/content/__tests__/spell-lexicon.test.ts)
fails if:

- the coverage keys differ from the 68 live spell IDs;
- a combat spell points at an adventure resolver domain or the reverse;
- a spell has no reusable or explicitly ordinary term disposition;
- a lexicon or ordinary disposition is orphaned;
- aliases/tokens are malformed or duplicated inside an entry;
- a visual subject becomes an art/style claim instead of a literal subject;
- token projection loses its semantic reference or readable output;
- Bloom application, adjacency, cap, healing, non-resurrection, or decay drifts from the actual
  resolver path.

## Acceptance commands

```sh
npx vitest run src/content/__tests__/spell-lexicon.test.ts \
  src/core/__tests__/spell-engine.test.ts src/core/__tests__/phase-c-spells.test.ts \
  src/core/__tests__/phase-c-adventure-spells.test.ts \
  src/ui/__tests__/spellbook-contract.test.tsx
npm run build
npm run spec-link-check
git diff --check
```
