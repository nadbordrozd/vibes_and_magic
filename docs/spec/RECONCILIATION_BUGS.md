# Reconciliation Bugs

Doc 30 defines an unlogged code divergence from a binding document as a bug. This list records only
such divergence; logged implementation choices belong in [`../DECISIONS.md`](../DECISIONS.md).
The canonical S-files follow the intended document rule until each divergence is resolved.

This document preserves the intended rules and audit evidence. Live ownership, status, dependencies,
and implementation notes are tracked in Beads under epic `vibes_and_magic-cyi`; use `bd show <id>`
for current state rather than adding a second status ledger here.

## Triage

| ID | Severity | Bead | Intended rule | Evidence / affected implementation | Required resolution |
|---|---|---|---|---|---|
| RB-004 | Medium | `vibes_and_magic-cyi.4` | Bogdan’s bargains all have visible loopholes whose apparent benefit is part of the trap. | `loopholeBargains` is an empty specialty handler in [`heroBehaviors.ts`](../../src/core/heroBehaviors.ts); offers are behaviorally identical to other heroes. | Specify deterministic per-card loophole/trap terms in a numbered decision/doc, show them before acceptance, then implement and test. Do not invent hidden costs. |
| RB-005 | High | `vibes_and_magic-cyi.5` | Every map, including Manywhere, supports the canonical save/load/file/link contract. | `MapId` and content hash include `manywhere`, but `validSave` in [`persistence.ts`](../../src/ui/persistence.ts) omits it from accepted map IDs. | Include Manywhere in validation and add local/file/game-link round-trip tests. |

## Audit notes

- RB-001, RB-002, and RB-003 were reconciled by doc-63 artifact dispatch: generic effect-tag
  consumers now own the first-push spent credit, counter/morale death-trigger magnitude floor, and
  explicit once-per-battle counter-eating action respectively. Their serialized state, AI-visible
  legal actions, UI affordances, and both-side tests are executable rather than catalog-only tags.

- The Moth-Eaten Map, Third Boot, Spare Face, Weathercock, Seam-Ripper, Last Toy, Burden removal,
  and other doc-29 artifacts use some direct artifact-ID consumers rather than effect-tag lookups.
  They have observable implementations and are not classified as divergences here. A later cleanup
  may normalize those dispatch paths without changing behavior.
- The historical 80-ordinary-plus-ten-special artifact contract remains recorded in the decision
  log; doc 63 deliberately supersedes that shipped stage with 100 ordinary definitions plus ten
  special Kit/trinket definitions at the 110-definition intermediate gate.
- The decision log explicitly supplies the two missing Wild spell entries, terrain save migration,
  fixed obstacle/omen details, and Manywhere’s default `victory: none`; those are reconciled choices,
  not bugs.
- Balance and exposure leagues were intentionally skipped by user direction and recorded. Missing
  simulation evidence is not itself a rule divergence.
