# Adventure Structure Dialogs

Status: implemented and verified 2026-08-09. This work order changes presentation only. Canonical
actions, costs, outcomes, seeded selection, visit limits, replay data, and object behavior remain
governed by the S-files and executable catalogs.

## 1. Outcome

The adventure map remains the primary surface while a visited actionable structure receives the
player's attention. Recruitment, purchase, upgrade, transformation, deposit, exchange, bridge,
lesson, and tithe controls no longer accumulate in the hero rail. They open in one contextual dialog
that identifies and describes the structure, previews the exact reducer-derived cost and outcome,
states availability in plain language, exposes inspection metadata, and blocks the map until closed.

## 2. Routing contract

`src/ui/adventureStructureInteractions.ts` is the exhaustive presentation catalog for every kind in
`MAP_OBJECT_KINDS`. Each object declares one of six deliberate routes:

- `contextual-dialog` for an explicit service action;
- `rules-choice-dialog` for an existing non-cancellable pending choice;
- `transient-result` for an automatic visit resolved through the notice and activity log;
- `map-control` for pickups and Cache digging;
- `combat-or-navigation` for guarded sites, boats, and topology;
- `non-actionable` for authored obstacles.

The UX static gate compares the catalog to the object registry. A new object kind cannot enter the
game without an explicit presentation decision.

## 3. Shared dialog behavior

The contextual dialog opens when the selected human hero arrives at one of these structures:
dwelling, Tinker's Cart, Unstruck Bell monastery, Gloaming Ring, Chrysalis Pool, Half-Built Bridge,
Hedge School, Reliquary Cairn, Mercenary Camp, Wagon Camp, or Tithe Barn. Palimpsest service at a
visited shrine or Mage Guild uses the same frame.

The frame:

1. carries `role="dialog"` and `aria-modal="true"` with labelled identity and flavor;
2. moves keyboard focus to its visible Close control and traps Tab within the surface;
3. closes safely with Escape, the Close control, Cancel, or the backdrop;
4. returns focus to the prior control or adventure-map viewport;
5. suppresses map clicks, hero selection, pickups, and the world-view shortcut while open;
6. closes before opening an irreversible action confirmation, then stays closed after cancellation
   or resolution so the compact map returns unchanged.

Hedge School now uses the same review confirmation before its canonical `ATTEND_HEDGE_SCHOOL`
dispatch. The following seeded permanent lesson remains the existing non-cancellable choice dialog.
Every other irreversible explicit structure action continues through the shared action confirmation.

## 4. Availability and exact terms

Buttons project the real action through `previewAction`; artifact price modifiers, resource
shortages, visit limits, inventory/army capacity, sold stock, and already-completed state therefore
share reducer authority. Enabled controls show exact resource costs. Disabled controls show the
projected reason both visibly and through `title`/`data-disabled-reason`. Empty eligible sets—such as
no company to molt or no artifact to exchange—receive an explicit unavailable explanation.

## 5. Verification

- `src/ui/__tests__/adventure-service-actions.test.tsx` checks exhaustive object routing, all eleven
  structure variants, inspection/modal metadata, state purity, and removal of the rail switchboard.
- `npm run review:service-actions` records desktop, narrow, confirmation, unavailable, focus, Escape,
  and map-shortcut evidence under `.pixel-work/review/service-actions/`.
- `npm run review:ux`, `npm run review:walkthrough`, `npm run smoke`, `npm run build`, the static UX
  gate, and the relevant/full Vitest suites remain the acceptance gates.
