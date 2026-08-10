# 48 — Incremental Adventure Fog

Status: implemented and verified 2026-08-10. This work extends S03's movement/exploration rule and
preserves S02's deterministic action, replay, save, compressed-link, and hash authority. It also
retains work order 47's late fog ordering for partially mounted mountain art.

## Report and diagnosis

AdventureScreen previously animated a legal movement prefix against the unchanged pre-action state,
then dispatched one `MOVE_HERO` only after the final animation delay. AdventureMap consequently read
the same `players[activePlayer].explored` array at every path index. The reducer independently called
`revealForPlayer` only at ordinary route completion or immediately before one guardian encounter; a
siren interruption could return without revealing its entered tile. The visible result was no fog
change during travel followed by destination vision appearing all at once.

## Reducer contract

Every coordinate the moving hero actually occupies is an exploration event for that hero's owner.
The serialized explored array retains the sorted union of vision from all entered coordinates plus
all existing contributors. This applies to orthogonal and diagonal travel, partial movement-budget
prefixes, pickups and visits, boat movement, paired whirlpools/passages, siren and guardian aggro,
and any later interruption or hero defeat. Direct guardian attacks do not reveal from the guarded
tile while the attacker remains adjacent; the tile contributes only when flee/recruit/diplomacy or
an attacker battle victory completes the deferred move.

The rule adds no action, timing field, random draw, or UI-owned state. `MOVE_HERO` remains the one
logged action. Replaying content hash, map, difficulty, seed, setup, and the same action log rebuilds
the identical explored union and canonical state hash. Save files and compressed links remain the
same five-field payload. Exploration remains isolated by player in hot-seat games.

## Animation contract

With motion enabled, AdventureMap derives presentation exploration by applying the shared pure reveal
projection to `movement.path.slice(1, movement.index + 1)`. It starts with the active player's
persisted explored set, other living allied heroes, owned castles, and existing explicit reveal
effects. The animated path is truncated at both guardian and siren interruptions before it begins;
a direct guardian coordinate is omitted until the reducer later confirms occupancy. Thus
the displayed hero, current index, newly visible cells, and still-hidden future cells advance
together. The projection never mutates GameState and Off mode continues to dispatch immediately.

World sprites still paint before `.fog-occlusion`. A mountain composition may mount when one contact
is visible, but its unseen contacts and northward overhang remain covered by per-cell opaque fog.
There is no movement-cancel command in the current UI; unmounting an uncommitted animation performs
no core movement and therefore no permanent reveal.

## Verification and evidence

Focused coverage pins normal and diagonal unions, edge clipping, exhaustion, siren and guardian
interruptions, direct-guardian victory, object entry, boat/whirlpool topology, hot-seat isolation,
animation-prefix purity/no-future-leak, mountain late-fog order, action replay, five-field saves,
compressed links, and canonical state hashes.

Run the dedicated browser review against Vite with:

```sh
npm run review:incremental-fog
```

It drives the real UI over a six-entry route at `1440×1000` and `390×844`. For every animated index
it asserts the hero transform, exact prefix-derived explored set, at least one newly visible tile,
still-hidden final-route tiles until the last step, and absence of dialogs, inspection overlays,
notices, and errors. It then compares final visible coordinates and hero position with an independent
core reduction. The harness stretches Slow-mode presentation timers only so screenshot I/O cannot
skip an index; no reducer input or action timing changes. Twelve original-resolution captures and
`audit.json` are written under
`.pixel-work/review/incremental-fog/`.
