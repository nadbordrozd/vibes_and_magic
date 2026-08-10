# Focused Non-Adventure Screens

Status: implemented and verified 2026-08-09. This is a presentation companion to
`docs/34_UX_COMPLETENESS.md`; canonical rules and actions remain owned by S00–S09 and the core.

## 1. Outcome

Every bounded screen outside the adventure-map shell now presents one primary job, the state needed
to complete it, and its ordinary action before reference prose. Long explanations, historical data,
comparisons, and flavor remain reachable through inspection, contextual help, or a local disclosure.
The AdventureScreen/map shell is deliberately unchanged by this work order.

The linked Heroes of Might and Magic II gallery was reviewed only for information hierarchy: a
single focal task, compact current-state rows, visible costs and selections, and a clearly weighted
action. No external art, text, layout measurements, or assets were copied. Existing project imagery
continues to supply portraits, resources, towns, units, and spell presentation; the spell and skill
icon catalog remains separate work.

## 2. Executable surface inventory

`src/ui/nonAdventureSurfaceCoverage.ts` is the binding presentation inventory. Its validator rejects
duplicate or incomplete rows and requires representatives for setup, hero, castle, combat,
spellbook, choice, result, and save/import.

| Surface | Primary job | Essential state | Primary action / reference |
|---|---|---|---|
| Title setup | Configure one deterministic campaign | map, objective, difficulty, players, factions, seed | Begin; Help |
| Title load/import | Resume one compatible campaign | save identity, compatibility, turn | Load/import; metadata disclosure |
| Hot-seat pass | Hand control to the named player | player and faction | Reveal; Help |
| Hero details | Understand one hero | identity, specialty, stats, skills, army, loadout | Close; inspection |
| Hero equipment | Equip one artifact | artifact, legal slots, resulting loadout | Confirm; inspection |
| Hero exchange | Transfer a company or consumable | both holders, source, projected destination | Review/confirm; inspection |
| Castle | Complete one development task | owner, visitor, resources, selected task | Build/recruit/transfer/service; inspection |
| Combat | Resolve the active company action | round, sides, active stack, targets, latest event | act/cast/item/withdraw/auto; Help |
| Combat targeting | Choose legal targets | source, stage, cost, prediction, choices | Confirm/cancel; inline detail |
| Combat spellbook | Choose a legal combat spell | mana, active face, cost, availability | Cast/close; inspection |
| Adventure spellbook | Choose a legal map spell | mana, movement, active face, availability | Cast/close; inspection |
| Pending choice | Commit one canonical outcome | source, outcomes, costs, disabled reasons | Choose; inspection |
| Battle result | Understand consequences | winner, losses, rewards, persistent changes | Continue; statistics disclosure |
| Campaign result | Understand the authored outcome | objective, actor, day, battles | Return to title; record disclosure |
| Structure service | Complete one visited service | structure, offer, cost, availability | Review/close; inspection |
| Item target | Choose one legal item use | item, target, cost, effect | Review/cancel; inspection |
| Action confirmation | Confirm one irreversible action | actor, target, cost, effect | Confirm/cancel; inline detail |
| Building detail | Inspect or build one improvement | function, cost, prerequisites, availability | Build/close; inspection |

## 3. Screen decisions

- Setup and save/import are explicit sibling tasks. Setup uses one selected map/objective summary;
  faction identity, controller definitions, save metadata, and presentation showcases are disclosed
  on demand. A save row always provides a named Load action or its exact incompatibility reason.
- Castle work is split into Town, Recruit, Army, and Services tabs. Only the selected task is
  rendered. Ownership and visiting state remain above the tabs. Army reuses the reducer-projected
  direct transfer from doc 42; remote views truthfully expose only the garrison. Hero meetings and
  adjacent exchange from doc 43 remain unchanged.
- Both spellbooks lead with resources, the current face, Cast, and a visible disabled reason.
  Debts, flavor, and base/upgrade comparison use local disclosures. Existing imagery remains in
  place and every card has a clean inspection/icon position without inventing the deferred catalog.
- Combat keeps the current board and actions ahead of supporting detail on narrow layouts. The
  latest log event remains visible; older history and controls prose are disclosed. Targeting,
  confirmation, action availability, and reducer behavior are unchanged.
- Choice and result dialogs retain their canonical outcomes. Battle statistics and final campaign
  records are disclosed; consequence and continuation remain primary. Narrow dialogs own one
  bounded scroller, reserve the persistent help/inspection rail, and keep the result action rail
  visible.
- Root scrolling is locked whenever a modal, spellbook, inspection, or help surface is active, so
  a bounded overlay never creates a second page scroller.

## 4. Acceptance evidence

Static and component evidence:

- `npm run ux-check` validates the screen inventory, action routes, disabled-state catalog, and
  inspection catalog.
- `src/ui/__tests__/non-adventure-surface-coverage.test.ts` pins all required representative jobs.
- Setup, choices, results, and castle transfer retain focused component coverage.

Browser evidence is generated, not hand-authored:

- `.pixel-work/review/setup-save/` contains empty, populated, and 390px setup/save/import captures.
- `.pixel-work/review/ux/` contains desktop and narrow menu, hero inspection, castle task tabs,
  combat, spellbook, complete pending-choice and battle-result matrices, and campaign-result captures.
- The UX runner audits visible control names, every visible disabled reason, viewport bounds, and
  horizontal overflow. The smoke runner now checks the focused castle task tabs and 390px viewport.

Production build, focused tests, the full UX review, browser smoke, and the full test suite are the
completion gates. Evidence commands and results are recorded in `docs/IMPLEMENTATION_LOG.md`.
