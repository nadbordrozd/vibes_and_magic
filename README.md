# Border Marches

A deterministic, browser-based proof of concept inspired by *Heroes of Might and
Magic III*. It includes the complete two-player Border Marches scenario, hot-seat
and scripted-AI play, strategic map exploration, castle building and recruitment,
and stack combat on a 13×9 SVG hex battlefield.

Games can be saved locally and continued from the title screen. Any owned castle
can be managed remotely. Adventure and combat motion use a shared speed selector
with Fast, Normal, Slow, and Off settings; clicking a combat stack opens its full
unit statistics.

## Run it

Requirements: Node.js 24 or newer.

```sh
npm install
npm run dev
```

Then open the URL printed by Vite. The production site is fully static:

```sh
npm run build
```

## Verify it

```sh
npm test
npm run sim -- --games 100 --seed 1
```

`npm run smoke` runs a Chromium interaction check against a development server.
It uses the installed Chrome executable and can be pointed elsewhere with
`BM_URL`.

The core under `src/core/` is pure and serializable. A game can be reproduced
from its initial seed and recorded action list; failed simulations write that
replay to `replay-crash-<seed>.json`.

The binding design and PoC specifications are in [`docs/`](docs/).

## Track work

This solo project uses [Beads](https://github.com/gastownhall/beads) for live task tracking and
cross-session agent memory. The docs remain authoritative for game rules, design decisions, and
implementation provenance; issue status and next work live in Beads.

```sh
bd prime
bd ready
bd list --status=open,in_progress
```
