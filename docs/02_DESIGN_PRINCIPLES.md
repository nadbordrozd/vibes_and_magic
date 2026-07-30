# Implementation Design Principles

These are binding rules for all code in this project. When in doubt, follow these rather than asking.

## Stack

- **TypeScript, strict mode.** Vite for build/dev. React for UI. Vitest for tests.
- **Rendering: DOM + SVG.** No Canvas, no Pixi, no WebGL. SVG elements for the map and battlefield.
- **State:** plain `useReducer`/Zustand in the UI layer only. Game state itself lives in the core (below).
- **Deployment target:** fully static site (GitHub Pages / Cloudflare Pages compatible). No backend, no server code, no external services. Persistence, if any, via `localStorage` behind a small adapter (note: not available inside claude.ai artifacts, so keep it optional and injected).
- No ECS frameworks, no game engines, no state-machine libraries. Plain data + functions.

## Architecture: headless core

The single most important rule. The game rules live in `src/core/` as a pure TypeScript module:

- `core/` imports **nothing** from React, the DOM, or the UI. No `Math.random`, no `Date.now`, no I/O.
- The entire game is `apply(state: GameState, action: Action) => GameState`. State is a plain JSON-serializable object. `apply` is pure: same inputs, same output. Return new objects; never mutate inputs.
- A `legalActions(state): Action[]` function (or per-phase equivalents) so AI and UI both know what's possible without duplicating rules.
- The React app is a dumb renderer over core state plus a dispatcher of actions. **Any** rules logic found in a component is a bug.

## Determinism and RNG

- All randomness flows through a seeded PRNG stored **in the game state** (e.g. mulberry32 state as a number field). Any rule that needs randomness draws from it via a helper that returns `[value, nextRngState]`.
- Consequence: a full game is a pure function of `(initial seed, action list)`. Build a replay format (seed + actions as JSON) from day one and use it for bug repros and regression tests.

## Simulation harness

- `npm run sim -- --games N --seed S [--ai a,b]` plays N complete headless games between scripted AIs and prints: crashes (with replay dumps), game length distribution, win rate by side/faction, casualty stats.
- The harness must exist before the UI does. It is the primary test of engine health and, later, of balance.
- Any uncaught exception during sim writes the replay JSON to disk so the failure is reproducible.

## Combat resolution pipeline

Combat effects are implemented as hooks on an **explicit, ordered resolution pipeline**. Canonical stages:

1. `declare` (actor + intended action chosen)
2. `target-selection`
3. `ownership-resolution` (who controls what, this instant)
4. `damage-computation`
5. `damage-routing` (who actually receives it)
6. `apply`
7. `death-triggers`
8. `retaliation`
9. `turn-advance`

Every effect/ability/spell declares which stage(s) it hooks. No effect may special-case another effect by name; interactions must emerge from pipeline order. This is the mechanism that makes future combo content cheap and testable. Implement the pipeline in the PoC even though the PoC has almost no effects — plain attacks should already flow through it.

## Data-driven content

- Units, buildings, factions, terrain, pickups are **data**, in typed TS files under `src/content/`, validated by a schema at load. No stats in logic files.
- Behaviours are referenced by tag (e.g. `abilities: ['ranged']`) resolving to handlers in a registry. Adding content must never require touching rules code.
- Tunable global numbers (movement points per day, damage formula constants, growth rates) live in one `src/content/constants.ts`.

## Code hygiene for agent development

- **Hard cap ~300 lines per file.** Split rather than grow.
- Small modules, named by domain: `core/combat/damage.ts`, `core/map/movement.ts`, `content/factions/crimson.ts`.
- Every core rule gets a unit test. Tests are specification: when a design doc statement and code disagree, write the test from the doc.
- No cleverness. Boring, explicit, greppable code. Prefer duplication over abstraction until the third occurrence.
- Keep a `docs/DECISIONS.md` log: one line per non-obvious implementation decision made without human input.

## What NOT to build (ever, unless instructed)

- Networked multiplayer, accounts, saves-in-cloud
- Animations beyond trivial CSS/SVG transitions
- Sound
- Map editor UI (maps are data files)
- Localization
