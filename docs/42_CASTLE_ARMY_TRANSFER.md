# Compact Castle Army Transfer

Status: implemented and verified 2026-08-09. This is a presentation work order for the visiting
hero/castle-garrison exchange. The army and Warden rules remain authoritative in
[`spec/S06_HEROES.md`](spec/S06_HEROES.md), and actions remain governed by the pure-core contract
in [`spec/S02_ENGINE.md`](spec/S02_ENGINE.md).

## Outcome

The castle screen presents the visiting hero and current garrison as two compact, opposing rows.
The hero row has that hero's derived seven-to-nine capacity; the garrison stays at seven. Their
identity, occupied capacity, and unit counts are visible together. This
keeps the useful information hierarchy of the Heroes II castle screen—town context, visiting hero,
and army rows in one frame—without copying its art or introducing a second rules surface.

Full-company manipulation is direct: choose a source slot, then activate a highlighted destination
slot. The reducer action dispatches immediately. An empty destination moves, a matching company
merges, and a different company swaps whole. Target badges, focus styling, accessible names, and
the persistent legend distinguish those outcomes before activation.

Partial transfer is the one deliberate extra mode. `Partial…` reveals an exact integer field,
range input, and `Split evenly`; the next legal destination activation dispatches that exact count.
Partial transfer onto a different company stays focusable but reducer-invalid, so its rule reason
is available in the slot description and appears visibly when activated. `Cancel` and Escape clear
the draft without dispatching.

## Rules boundary

- Target legality is projected by applying the proposed action to a clone through `previewAction`.
  Components do not duplicate adjacency, ownership, visiting, count, or swap rules.
- Cross-row moves, merges, swaps, and partial transfers use `TRANSFER_ARMY`. Splitting one company
  into another empty slot of the same holder continues to use `SPLIT_ARMY`.
- No component mutates an army. The existing reducer remains solely responsible for count and
  identity conservation, whole-company swaps, each destination's rules-owned bounds, and installing a qualifying
  Warden after hero-to-garrison transfer.
- The direct presentation is castle-specific. The adjacent-hero exchange retains its existing
  confirmation flow because changing that separate surface is outside this work order.
- A remotely opened castle shows its current read-only garrison and explicitly states that company
  transfer requires a visiting hero at that castle entrance. It exposes no inert exchange form.

## Responsive and keyboard contract

At desktop width the two rows oppose one another horizontally. At narrow width they stack within
the same transfer section, preserving the seven-slot garrison and all seven-to-nine hero positions
without horizontal overflow. Slot
buttons, `Partial…`, amount inputs, `Split evenly`, and `Cancel` use normal tab/Enter/Space access;
Escape cancels a selected source. Illegal targets remain keyboard-focusable so their exact reducer
reason is not hover-only.

## Acceptance evidence

- Focused tests cover move, merge, swap, exact partial, split-evenly calculation, illegal partial
  swap, preview immutability, count/identity conservation, Warden installation, and honest remote
  rendering.
- `npm run review:ux` and `npm run review:castle-transfer` exercise direct full and partial actions,
  keyboard source/destination activation,
  Escape cancellation,
  desktop/narrow seven-to-nine hero and seven-slot garrison fit, illegal-reason feedback,
  and conservation, with captures in `.pixel-work/review/ux/` and
  `.pixel-work/review/castle-transfer/`.
- The new-player walkthrough captures the selected direct targets at desktop and 390px, then
  commits a real `TRANSFER_ARMY` action without a confirmation modal.
- Production build, browser smoke, static UX checks, focused transfer tests, and the relevant full
  suite are the completion gates.
