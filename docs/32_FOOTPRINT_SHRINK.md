# 32 — Footprint = Ground Contact

Small work order, sequenced BEFORE doc 31's Phase B (Phase A terrain is unaffected). Rationale: with doc 31's visual-canvas rule, sprites carry an object's visual mass — footprints only need to cover what the building physically sits on and blocks. Extra blocked rows are map-space tax. This matches the H2 pattern (castles look 4×3, block ~2 rows; mines look 2×2, block ~2×1).

## Changes

- **Castles: 3×3 → 3×2.** Entrance remains bottom-center (middle tile of the bottom row). All castle services, hero spawns, and garrison interactions unchanged — only the footprint shrinks by the top row.
- **Mines: 2×2 → 2×1.** Entrance is the left tile unless a map explicitly authors otherwise. Timber camp, gold/iron mine, essence spring all follow.
- Everything else keeps its current footprint (Monastery / Half-Built Bridge 2×1 discretion per S03 stands; 1×1 objects untouched).
- This is a rules-adjacent change: footprints drive pathing, aggro verification, fog-from-footprint-edge, and lint. **Update S03 in the same commit** (spec-is-truth per doc 30), re-author all authored maps to the new footprints (keep mirror fairness; guardian cages re-verified by lint), update lint fixtures and any footprint-dependent tests, and log judgment calls in DECISIONS.md.

## Acceptance

- `npm run map-lint` green on all authored maps; full test suite and browser smoke green.
- Human check: enter a castle through its gate, capture a mine via its entrance tile, and confirm a guardian cage still blocks the approach it blocked before.
- Sim: quick league smoke (a few games per map), zero crashes; no AI pathing stalls around the shrunk footprints.
