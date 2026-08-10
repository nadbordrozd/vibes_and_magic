# 43 — Map-driven friendly hero meetings

## Scope

This work completes adjacent-hero exchange as an adventure-map interaction. It changes no transfer,
movement, occupancy, terrain, guardian, fog, save, or replay rule. The map now expresses the existing
S03/S06 rule directly: point at a visible friendly hero, travel to a safe adjacent tile when needed,
then use the existing exchange surface and explicit reducers.

The castle exchange from work order 42 remains a separate compact presentation. Visiting-hero and
garrison transfers still use its reducer-projected direct controls; this work does not generalize or
replace them.

## Interaction contract

- A visible friendly hero has an exchange-arrow cursor, `data-map-intent="exchange"`, a keyboard-
  activatable map target, and an accessible “Exchange with …” label. Enemy heroes retain the crossed-
  swords attack cursor, `data-map-intent="attack"`, and an “Attack …” label.
- If the selected and target heroes already occupy separate adjacent squares, activation opens the
  existing exchange dialog immediately and spends no movement.
- Otherwise the preview ends on the least-cost reachable legal square adjacent to the target. Equal-
  cost destinations resolve north-to-south and then west-to-east. The target square is never a route
  destination and the heroes never overlap.
- Candidate meeting squares must be in bounds, passable in the selected hero's movement domain, and
  free of living heroes, active object footprints, castle footprints, thickets, guardians, and active
  guardian aggro. Route search retains normal terrain/road/seam/native costs, diagonal surcharge,
  embark/disembark/sea costs, reusable boats, whirlpools, fog-independent rules authority, and all
  ordinary blockers.
- A click dispatches only canonical `MOVE_HERO`. Exchange opens only after the reducer result confirms
  the travelling hero reached the planned square and both living heroes are still friendly, distinct,
  and adjacent in adventure phase with no pending interruption.
- Insufficient movement may advance along the ordinary safe prefix but does not open exchange.
  Unreachable, newly blocked, interrupted, defeated, or no-longer-friendly meetings retain the map and
  expose a specific status reason.
- The contextual structure dialog from work order 41 continues to block map input. Programmatic or
  pointer activation behind that modal cannot begin a meeting.

## Exchange and determinism boundary

The hero exchange dialog continues to submit `TRANSFER_ARMY`, `SPLIT_ARMY`, and `TRANSFER_ITEM`.
Companies move, merge, swap whole, or transfer exact partial counts under the core reducer. Consumable
instance slots move or swap in either direction. Counts and item instances are conserved; the UI never
mutates either hero. Artifact transfer is not exposed because the current action catalog has no
hero-to-hero artifact-transfer action; presentation does not invent one.

The chosen adjacent coordinate is recorded by the ordinary `MOVE_HERO` action. Transfer actions already
record holder IDs, slots, and counts/instances. Opening or closing the dialog is presentation-only, so
the canonical action save remains content hash, map, difficulty, seed, setup, and explicit action log.

## Verification

Focused engine coverage owns adjacent opening, deterministic endpoint selection and tie-breaking,
occupancy, blocker and guardian avoidance, unreachable routes, post-move interruption/death/friendship
revalidation, reducer conservation, and action replay. Focused UI coverage owns exchange-versus-attack
metadata, accessible labels, cursor classes, both-direction dispatch, and canonical save reconstruction.

`npm run review:hero-meeting` drives the real browser through friendly and enemy hover, a routed meeting,
both-direction company and consumable transfer, adjacent immediate reopening, and an unreachable reason.
It writes desktop evidence under `.pixel-work/review/hero-meeting/`. Production build, ordinary browser
smoke, relevant focused suites, and the full test suite remain the integration gates.
