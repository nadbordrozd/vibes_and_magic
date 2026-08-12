# Work order 56 — Resolver-true Grave and Wild spell rules

Status: implemented 2026-08-12. All 34 Grave and Wild spells now have complete Standard and
Upgraded player rules derived from their current combat, adventure, topology, targeting, scaling,
effect-operation, and trigger behavior. This is a content/presentation correction only: spell IDs,
costs, acquisition, actions, targets, saves, and executable mechanics are unchanged.

## Outcome and authority

[`../src/content/spells/rulePresentation.ts`](../src/content/spells/rulePresentation.ts) now owns
structured rules for all 68 spells. `GRAVE_WILD_SPELL_RULES` adds the 17 Grave and 17 Wild records
without changing the accepted Rite/Craft records from work order 55. Each version is ordinary text
interleaved with stable `SpellLexiconId` references; catalog `base` and `plus` remain exact,
deterministic plain-text projections for compatible consumers.

The combined `SPELL_RULE_PRESENTATIONS` value is now a complete `Record<SpellId,
SpellRuleVersions>`. A missing spell is therefore a type or exhaustive-test failure rather than a
runtime fallback. Descriptions name reusable mechanics through lexicon tokens without repeating the
glossary definitions. Interactive help and term icons remain later presentation work.

Executable behavior is authoritative when earlier catalog or spec prose disagrees. Every version
stands alone and reports actor, target, amount, duration or trigger, limit, and material restriction.
Runtime-identical upgrades repeat the same complete rule; discrepancy detail stays below rather
than appearing as developer diagnostics in player copy.

## Resolver-true findings

| Spell | Player behavior now captured |
|---|---|
| Wither / Grave-Chill | Their primary counter amounts scale with Spell Power; Wither also receives Hex bonuses, while Upgraded Grave-Chill floors its 20 Morale reduction at zero. |
| Mourner's Veil | Standard starts at two rounds and Upgraded at three; Spell Power extends either, and each Upgraded attacker gains Hex 1 after attacking. |
| Dirge | Current-HP loss is per company already destroyed in the battle, with a Spell-Power-scaled 3% or 5% rate. |
| Last Candle | It triggers only on an allied company destroyed by an attack. Morale, Hex, and Upgraded mana amounts are proportionally reduced for a company below 10% of its starting army. |
| Sour | It removes Bloom, a beneficial timed effect, or either side's unprotected battle enchantment. Bloom becomes equal Hex, a timed effect leaves Hex 2, and only Upgraded enchantment removal gives all living enemies Hex 3. |
| Remembrance | It targets an allied non-summoned company, rounds revived losses up, respects the initial-count ceiling, and scales its 20%/35% rate with Spell Power. |
| Reckoning | It spends all remaining mana, scales its per-mana current-HP percentage, caps enemy loss at 60%, and caps Upgraded allied loss at 30%. |
| Quiet | Retaliation suppression starts at two rounds and scales in duration; Upgraded also applies scaling Chill 2. |
| Cold Road | The caster must stand on Barrowfield and chooses another explored Barrowfield tile, but distance and terrain connectivity are unrestricted. Upgraded may carry one adjacent owned hero. |
| Borrowed Time | Remaining movement doubles before the ordinary adventure-spell movement charge; tomorrow's normal movement becomes zero or half. |
| Pale Procession | It needs a local battle record with at least 100 casualties, adds `5 × Spell Power` or `8 × Spell Power` Candle-Wisps, and removes the resulting company on the third or seventh day after casting. |
| Silence the Passing / The Toll | Silence is a scaling-duration enchantment that suppresses enemy death triggers and, Upgraded, doubles allied ones. The Toll reads companies already destroyed and immediately grants 2/3 mana each. |
| Death's Ledger | It reveals map objects standing on Barrowfield, not terrain tiles or paired scrolls. Upgraded guardian counts last through today. |
| Grave-Speech | It displays the latest local battle record's stored summary rather than replaying combat; Upgraded may permanently learn one unknown spell from that record. |
| Loyal Unto Death | Destruction by an attack damages a surviving killer from pre-attack unit count and average base damage. Upgraded also prevents ordinary allied Morale loss and grants 3 mana. |
| Gale | The push is away from the acting company. Collision damage occurs only when the full 2/3-space push is blocked; Upgraded Chill follows only if the target survives that collision. |
| Bloom | Standard and Upgraded apply fixed Bloom 3/4 regardless of Spell Power; Upgraded adjacent allies receive fixed Bloom 1. The lexicon owns healing, cap, decay, and no-resurrection semantics. |
| Overgrow | The selected counter or timed effect is reapplied to its own company as well as adjacent living companies. Counter copying reads the selected company's changing magnitude in battlefield order, so its self-copy can increase later adjacent copies. Upgraded excludes one adjacent company only. |
| Thicket / Rains | Thicket creates three persistent empty battlefield undergrowth spaces; Upgraded Chill occurs when an enemy ends there. Rains clears Burn from every living company, then gives fixed Bloom 1 to allies and, Upgraded, fixed Chill 1 to enemies. |
| Beast Tongue | Every guardian company must be a Beast. Dispersal costs twice base gold value; Upgraded recruitment costs three times and needs room for every company. |
| Stampede Call / Storm | Beasts move toward their nearest enemy within printed base speed before the Upgraded round-speed bonus. Storm deals current-HP loss to every living company, with 12%/18% for Flying and a minimum of 1 HP. |
| Greenway / Green Tide | Greenway requires explored connected Deepwood within 15/25 tiles. Green Tide makes Deepwood entry free for the week and Upgraded reveals every Deepwood tile, not only the connected region. |
| Wild Growth | It affects an owned City, not a dwelling, lasts for the current week, and repeated +50%/+75% casts stack. |
| Murmuration | It reveals every chosen in-bounds tile, plus radius one when Upgraded; the chosen route is not required to be contiguous. |
| Root and Ruin | It places 3/5 map undergrowth tiles without a City or map object and lasts 3/5 days including today. |
| Fickle Weather | It omits the current Omen from 2/3 deterministic offers; Weathercock of Ill Omen instead offers every other Omen. |
| Shed Skin | Both versions target an ally, remove the oldest timed effect or the first nonzero Burn/Chill/Hex/Bloom pile in that order, then grant Bloom equal to removed magnitude with a minimum of 1. |
| Hedgerow March | Both versions create an enchantment record and occupy a slot, but no combat hook consumes that record, so it has no gameplay effect. |
| Borrow Shape | Standard copies abilities from an adjacent enemy; Upgraded accepts any living enemy. Existing abilities remain and copied abilities last for battle. |

## Recorded runtime/catalog discrepancies

This work deliberately does not alter mechanics. Material gaps preserved as resolver truth are:

- Bloom ignores the general S05 counter-magnitude Spell Power default and applies fixed 3/4 plus
  fixed adjacent 1.
- Sour accepts a removable enchantment from either side, not only an enemy effect.
- Overgrow includes the selected company and counter copies observe its mutation in stack order,
  rather than spreading one frozen original magnitude only to adjacent companies.
- Cold Road has no distance or Barrowfield-connectivity requirement.
- Death's Ledger reveals all objects on Barrowfield rather than “every barrow and its scroll.”
- Wild Growth accepts owned Cities only, despite the former dwelling wording.
- Murmuration accepts noncontiguous chosen positions.
- Shed Skin's Upgraded resolver is identical to Standard: it remains ally-only and has no adjacent
  Bloom spread.
- Hedgerow March has no forced-movement, Morale, or Bloom consumer; its two versions differ only in
  stored metadata and have identical gameplay.

The copied spell records make these gaps visible without inventing promised behavior. Mechanics
repairs, if desired, require separate decisions and tests.

## Exhaustive gates

[`../src/content/__tests__/grave-wild-spell-rules.test.ts`](../src/content/__tests__/grave-wild-spell-rules.test.ts)
pins all 34 IDs in Grave-then-Wild catalog order, the final 68-record presentation map, exact
Standard/Upgraded projections, token validity, unstructured-term rejection, and player-prose bans.
Resolver fixtures cover fixed Bloom, Shed Skin target/removal/identical versions, Overgrow mutation,
Sour on the opposing enchantment row, City-only Wild Growth, distant Cold Road, and inert identical
Hedgerow March. The existing work-order-55 suite continues to pin the untouched Rite/Craft records.

Acceptance commands:

```sh
npx vitest run src/content/__tests__/grave-wild-spell-rules.test.ts \
  src/content/__tests__/rite-craft-spell-rules.test.ts \
  src/content/__tests__/spell-lexicon.test.ts src/core/__tests__/spell-engine.test.ts \
  src/core/__tests__/phase-c-spells.test.ts \
  src/core/__tests__/phase-c-adventure-spells.test.ts \
  src/ui/__tests__/spellbook-contract.test.tsx --maxWorkers=1
npm run build
npm run spec-link-check
npm run ux-check
git diff --check
```
