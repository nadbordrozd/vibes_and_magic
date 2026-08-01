# Reconciliation Bugs

Doc 30 defines an unlogged code divergence from a binding document as a bug. This list records only
such divergence; logged implementation choices belong in [`../DECISIONS.md`](../DECISIONS.md).
The canonical S-files follow the intended document rule even while these are open.

## Triage

| ID | Severity | Status | Intended rule | Evidence / affected implementation | Required resolution |
|---|---|---|---|---|---|
| RB-001 | High | Open | Gauntlet of the Second Throw adds one hex to the first Gale or push each battle. | Artifact has `push_bonus` in [`artifacts.ts`](../../src/content/artifacts.ts), but no non-catalog consumer or per-battle spent state exists. | Add a generic first-push modifier and serialized/spent battle-side state; cover spell and unit forced movement. |
| RB-002 | High | Open | Candle-Snuffer’s Ring reduces enemy death-trigger magnitude by one. | Artifact has `reduce_enemy_death`, but the death-trigger pipeline never queries it. | Define magnitude-floor semantics for counter/meter triggers without weakening percent-of-self triggers, implement at `death-triggers`, and test both sides. |
| RB-003 | High | Open | The Long Spoon provides a once-per-battle action that consumes any counter pile and grants `5×N` meter. | Artifact has `eat_counter`, but no combat action, legal target, or usage state exists. | Add an explicit replayable artifact action, counter-pile targets, once-per-battle state, AI hint, and UI affordance. |
| RB-004 | Medium | Open | Bogdan’s bargains all have visible loopholes whose apparent benefit is part of the trap. | `loopholeBargains` is an empty specialty handler in [`heroBehaviors.ts`](../../src/core/heroBehaviors.ts); offers are behaviorally identical to other heroes. | Specify deterministic per-card loophole/trap terms in a numbered decision/doc, show them before acceptance, then implement and test. Do not invent hidden costs. |
| RB-005 | High | Open | Every map, including Manywhere, supports the canonical save/load/file/link contract. | `MapId` and content hash include `manywhere`, but `validSave` in [`persistence.ts`](../../src/ui/persistence.ts) omits it from accepted map IDs. | Include Manywhere in validation and add local/file/game-link round-trip tests. |

## Audit notes

- The Moth-Eaten Map, Third Boot, Spare Face, Weathercock, Seam-Ripper, Last Toy, Burden removal,
  and other doc-29 artifacts use some direct artifact-ID consumers rather than effect-tag lookups.
  They have observable implementations and are not classified as divergences here. A later cleanup
  may normalize those dispatch paths without changing behavior.
- The decision log explicitly resolves the artifact count as 80 ordinary definitions plus ten
  special Kit/trinket definitions; 90 total is therefore not a conflict.
- The decision log explicitly supplies the two missing Wild spell entries, terrain save migration,
  fixed obstacle/omen details, and Manywhere’s default `victory: none`; those are reconciled choices,
  not bugs.
- Balance and exposure leagues were intentionally skipped by user direction and recorded. Missing
  simulation evidence is not itself a rule divergence.
