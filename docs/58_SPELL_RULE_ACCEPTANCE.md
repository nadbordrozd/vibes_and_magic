# Work order 58 — All-spell rules and glossary acceptance

Status: implemented and independently reviewed 2026-08-12. This acceptance pass audited every one
of the 136 Standard/Upgraded player rules, all 30 glossary definitions and native icons, alias
tokenization, semantic consumers, and real desktop/390 casting journeys. It corrects descriptions
and glossary wording only; no resolver, target, cost, save, replay, acquisition, or AI behavior
changed.

This document is the final acceptance companion to work orders 53–57. Where it refines wording, it
supersedes only those work orders' copied prose examples, not their mechanics findings or authority
boundaries.

## Independent comprehension contract

The audit reads each version as a player would rather than accepting nonempty catalog strings. Each
rule must identify its meaningful actor or target, concrete amount, duration or trigger, limit, and
restriction without narrating data fields, resolver order, target plumbing, or implementation state.
Shared named mechanics stay short in spell rules and delegate their reusable lifecycle to glossary
references.

The executable gate applies these bounds to all 136 rules:

- at least five words, terminal punctuation, one to four sentences, and no more than two colon or
  semicolon clause separators;
- at most 45 words by default;
- an explicit maximum of 50 words for only five justified complex records: Upgraded Last Candle,
  Upgraded Reckoning, Upgraded Overgrow, and both Standing Mirror versions;
- no developer/debug, cast-path, confirmation, generic scaling-row, or storage narration;
- exact deterministic catalog projection and valid semantic term IDs;
- exact equality only for the five resolver-identical upgrades: Standard of Dawn, Unmake, Standing
  Mirror, Shed Skin, and Hedgerow March.

Glossary definitions are six to 36 words and no more than three sentences. Every alias must tokenize
to exactly its own term. Longest-match behavior remains deterministic, but broad ordinary words are
not aliases merely because they sometimes appear in a mechanic phrase.

## Defects found and corrected

The independent pass found these honest defects:

- **Standard of Dawn** omitted that only attack destruction triggers it and that split-stack rewards
  scale down using the destroyed company's starting share of army HP.
- **Consecrate** implied broad company healing; it can repair only the surviving top unit and never
  restores a lost unit.
- **Last Candle** described its proportionality guard as a fraction of “starting army” rather than
  the destroyed company's starting share of its side's army HP.
- **Standing Mirror** hid its exclusions and failed-copy behavior. It cannot copy itself, Echo, or a
  Twister, and a copy without a valid opposing target does nothing.
- **Summon Skiff+** did not explicitly say that moving another owner's boat preserves its owner.
- **Remembrance** did not say that the allied target must still survive.
- **Beast Tongue+** could be read as partial recruitment; recruitment is all-or-nothing and every
  Guardian company must fit.
- **Overgrow** described internal application order. It now states the player-visible result: the
  chosen company gains the Counter first, which may increase the amount copied to nearby companies.
- **Grave-Speech**, **Echo**, **Clockwork Courier**, and **Fickle Weather** used storage, slot, or
  card-deal language where direct player action is clearer.
- The **Deepwood**, **Extra action**, **Summon**, and **Undergrowth** glossary rules overgeneralized
  their behavior. They now distinguish connected Greenway travel from all-Deepwood Green Tide,
  Morale from other extra-action sources, battle summons from persistent created objects, and
  battlefield slowing from impassable adventure undergrowth.
- Aliases `barrow`, `forest`, `status`, and `sp` created false positives in ordinary prose. They
  remain search tokens where useful but no longer generate inline glossary controls.

## Bloom spot-check

Bloom's Spellbook page contains only its concrete application:

- Standard: one allied company gains Bloom 3;
- Upgraded: one allied company gains Bloom 4 and every adjacent allied company gains Bloom 1.

It contains no generic Spell Power row, legal-target count, cast path, or confirmation narration.
The Bloom glossary supplies the shared lifecycle: at turn start Bloom N heals N% of company maximum
HP, never restores a dead unit, is capped at 9, and normally falls by 1 at turn end. The acceptance
test pins both halves separately.

## Browser evidence

[`../src/sim/spellbook-review.ts`](../src/sim/spellbook-review.ts) runs the real game at 1440×1000
and 390×844. The journey verifies:

- Bloom's exact clean Standard/Upgraded page and native-icon tooltip;
- Standing Mirror as a second complex spell, with its Twister reference opened by keyboard focus;
- help glossary and a live Bloom counter/status reference;
- mouse click, touch-like pointer/click, keyboard focus, Escape, close control, outside input, and
  focus restoration;
- selection does not spend resources;
- actual Beacon and Forge-Spark casts still enter explicit target/confirmation flows and spend mana
  only after confirmation;
- viewport and book bounds, action visibility, responsive 64px spell icons, loaded effect icons,
  and absence of overflow, clipping, global-toggle collisions, or fallback art.

The reviewed screenshots are under `.pixel-work/review/spellbook/`, including
`glossary-spell-rule-{desktop,390}.png`, `glossary-complex-spell-{desktop,390}.png`,
`glossary-help-*`, `glossary-counter-status-*`, and both adventure/combat confirmation pairs.

## Automated acceptance

[`../src/content/__tests__/spell-rules-acceptance.test.ts`](../src/content/__tests__/spell-rules-acceptance.test.ts)
owns the exhaustive 68/136/readability/identity/Bloom/30-definition/alias/icon/surface contract.
The existing resolver, school-specific rules, lexicon, icon-provenance, glossary, and Spellbook
suites remain required rather than being replaced by this aggregate gate.

Acceptance commands:

```sh
npx vitest run src/content/__tests__/spell-rules-acceptance.test.ts \
  src/content/__tests__/spell-lexicon.test.ts \
  src/content/__tests__/spell-effect-icons.test.ts \
  src/content/__tests__/rite-craft-spell-rules.test.ts \
  src/content/__tests__/grave-wild-spell-rules.test.ts \
  src/ui/__tests__/spell-glossary.test.tsx \
  src/ui/__tests__/spellbook-contract.test.tsx --maxWorkers=1
npm run review:spellbook
npm run pretest
npm run build
npm test
git diff --check
```

The complete serial suite may retain only the known unrelated seed-1/day-56 no-winner failure at
`src/core/__tests__/mechanics-regression.test.ts:231`.

Observed acceptance results on 2026-08-12:

- focused spell resolver, presentation, lexicon, icon, glossary, and Spellbook coverage passed
  159/159 tests in 10 files;
- the acceptance contract plus glossary-aware Guardian inspector regression passed 26/26 tests;
- pretest, production build, spec-link, and diff gates passed;
- the real browser journey passed at 1440×1000 and 390×844, and its Bloom and Standing Mirror
  screenshots were inspected at original resolution;
- the complete serial suite passed 788/789 tests in 84/85 files. Its sole failure was the accepted
  unrelated assertion at `src/core/__tests__/mechanics-regression.test.ts:231`.

The full-suite run initially found one stale map-editor test that required the words “Selected
guardian” to be adjacent in raw HTML. The glossary reference correctly places an accessible button
between those visible words. The test now checks the visible phrase and the semantic Guardian term
reference separately; the focused regression passes without changing the component.
