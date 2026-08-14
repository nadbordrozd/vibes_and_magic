# Engine Architecture and Determinism

## Reference stack and portability

The reference client is strict TypeScript, Vite, React, Vitest, DOM, and SVG, with no backend. A
port may replace that stack if it preserves this document’s observable contracts. The production
client must build to static assets and remain playable without accounts, cloud services, network
calls, sound, localization machinery, or an editor.

## Headless core boundary

The rules core consumes JSON-serializable state plus explicit actions and returns a new state. Its
primary surface is conceptually:

```text
legalActions(state) -> Action[]
apply(state, action) -> state'
```

Combat may expose an equivalent `legalBattleActions`/`applyBattleAction` pair internally. Public
application is pure: callers retain an unchanged prior state. The core must not read the DOM,
React, wall-clock time, browser storage, network, animation state, ambient randomness, or other I/O.
The UI may obtain a seed from platform crypto, but it passes that seed into the core explicitly.

Rules do not live in components. UI code chooses among legal actions, displays selectors, animates
already-committed transitions, and uses adapters for storage and share links. AI uses the same legal
action surface as a human player.

## State and action requirements

- State, actions, pending choices, map content, and battle state are JSON serializable.
- Every consequential choice has an explicit action. Stable automatic choices are permitted only
  where a UI picker has not yet been built and the core action can already accept an explicit
  target.
- A pending choice blocks unrelated actions until resolved.
- A hero’s roster representation is authoritative; compatibility views must stay synchronized and
  cannot invent data for obsolete save formats.
- A living hero's army array has exactly that hero's derived capacity: seven base, +1 with
  Quartermaster R1+, +1 per equipped `army_slot_bonus`, capped at nine. The capacity is recomputed
  from serialized skills and equipment rather than stored as a second authority. Fixed garrisons
  and heroless armies retain seven slots. Any action that would reduce capacity below an occupied
  slot rejects before changing skills, equipment, companies, resources, choices, or the action log.
- Animations never decide timing. Adventure movement commits after its legal path animation and
  combat queues actions until feedback completes; motion-off commits immediately.
- Rules that need durable topology—paired gates, thickets, resonance sites, boats, debts—are stored
  explicitly in JSON state, not inferred from UI or hidden runtime objects.

## Seeded determinism

All game randomness comes from explicit seeded streams. Given the same content hash, map, difficulty,
setup, seed, and action log, a run must produce the same final state. Resolve ties with documented
stable keys, normally distance and then object/stack ID. Iteration order must not depend on hash-map
implementation details.

Use independent deterministic streams when a subsystem must not perturb another. Weekly omens use
their own stream and pre-roll the next omen. Battle obstacles derive from the battle seed. Visual
decorations derive from map seed and region but are not stored in saves. Never use `Date`,
`Math.random`, or UI event timing inside rules.

Portable map-editor random-tier guardian placeholders follow the same rule: conversion hashes the
explicit campaign seed with stable guardian ID, stack index, and tier to select a concrete canonical
creature. Placeholder resolution never consumes ambient randomness and the runtime/save contains the
resolved creature stack.

Content schema contracts that can change legal actions or resolution are replay authority even
before their corresponding catalog batch is populated. The stable v2 schema/version and primitive
contract registry therefore participate in `contentHash`; presentation-only development placeholder
selection does not. Registering a primitive name is not executable coverage: its handler must be
registered separately at the contract's named pipeline stage before any catalog entry may reference
it. Artifact-effect metadata, nonempty Knack catalogs, and nonempty acquisition-site catalogs obey
the same rule through their own typed live registries. Duplicate handlers, unknown IDs, missing
functions, and stage mismatches are validation errors.

## Replay is save

The canonical save payload has exactly:

```text
{ contentHash, mapId, difficulty, seed, actionLog }
```

Loading reconstructs initial state and applies the log. A campaign-setup action in the log header
preserves player count, controllers, and factions. Local storage may keep compatibility sidecars,
but exported files and links use only the canonical payload. Autosave rotates three turn-end slots;
manual slots and file export/import use the same payload.

A campaign on a local authored map preserves that same five-field payload. Its `mapId` is a canonical
local reference containing portable document ID, immutable revision, and normalized map hash. Before
initial-state construction, the map repository must resolve that exact revision; missing or
hash-mismatched local map content refuses reconstruction rather than substituting the newest draft
or a built-in map. The resolved map hash participates in `contentHash`. The portable map document is
a separate import/export artifact and is never embedded in or mutated by a campaign save. See
[work order 50](../50_MAP_EDITOR.md).

Game and battle links deflate the payload, encode it as base64url, and put it in the URL fragment.
Warn above roughly 50 KB compressed and offer file export. Local saves with a mismatched content
hash may load with a visible warning; URL replays must refuse a mismatch. Golden replay fixtures in
CI must reach identical final-state hashes.

The docs 60–67 schema foundation deliberately changes the built-in content hash without changing
the canonical five-field save payload or local schema envelope. Saves at the immediately preceding
`06c84a97` hash follow the ordinary mismatch policy above; no state migration is guessed because
the action log remains the authority and later content phases may change its outcomes.

The configurable player pipeline supports up to six real player IDs. Maps with at most four slots
retain their historical four-player serialized shape; a six-player map serializes all six
controller, faction, turn-order, metric, objective, and exploration records. Extra faction cities
must not be disguised as one player's allies when ownership, combat, sieges, or hot-seat control is
the setup under test.

## Resolution pipeline

Every attack and ability hook belongs to one of these ordered stages:

1. `declare`
2. `target-selection`
3. `ownership-resolution`
4. `damage-computation`
5. `damage-routing`
6. `apply`
7. `death-triggers`
8. `retaliation`
9. `turn-advance`

New behavior registers a hook at a named stage; it does not add a one-off branch to an unrelated
consumer. Ordering within a stage is stable and covered by focused tests. Spells and items that
modify an effect use the same staged model.

The eighteen combat effect-primitive contracts declared by the docs-60 schema each resolve to
exactly one live handler at their declared stage. Their shared dispatch and typed implementations
live in [`../../src/core/combat/primitives.ts`](../../src/core/combat/primitives.ts); content names
the primitive rather than adding a spell-ID branch. A blocked primitive returns a stable reason code
and matching player-readable sentence. Control history, links, clone provenance, stun/action counts,
delayed triggers, mid-battle resonance, hazards, destruction-save claims, and round-limit outcomes
are ordinary JSON state and therefore survive cloning, replay reconstruction, and inspection.
For controlled companies, `side` is temporary tactical allegiance while `originalSide ?? side` is
the stable ownership key used by elimination, casualties, owner-bound saves, metrics, surrender,
and campaign army reconstruction.
All combat damage applications use the one-hop router in
[`../../src/core/combat/damageRouting.ts`](../../src/core/combat/damageRouting.ts), so attacks,
impact and percentage spells, turn effects, hazards, abilities, reflection, and backlash share the
same non-recursive damage-link and casualty semantics.

The pinned damage-position precedence is: determine the base luck position, then apply attacker
overrides such as “roll maximum,” then defender overrides such as “incoming roll minimum” **last**.
A defender minimum therefore beats an attacker maximum. Other damage multipliers apply at
`damage-computation`; routing such as wards or reflection follows afterward.

## Persistent battlefield tiles

Battlefield tiles are generic instances with a type, coordinate, duration, and registry-driven
hooks such as enter, turn-start, turn-end, blocking, or damage. `duration: -1` means battle-long;
positive durations decrement at round transitions. Resin, thicket, undergrowth, spell walls,
Standing Mirrors, siege walls, and terrain-derived shallow hexes use shared machinery where their
behavior overlaps. Tile state is serializable. Presentation metadata is data, not a rule hook.

## Adventure footprints

Every map object has an anchor at its top-left, a footprint defaulting to 1×1, and an entrance
offset defaulting to `(0,0)`. All footprint cells except an entrance are impassable. Interaction,
fog distance, guardian coverage, pathfinding, and lint work on the full footprint. Cities are
exactly 5×2 with their only entrance at centered offset `(2,1)`; neither field is author-overridable.
Mines are 2×1 with bottom-left entrance. Other authored object kinds may state a permitted footprint
exception. Internal `Castle` names are compatibility identifiers; City is the player-facing term.

Objects never overlap. Guardians and rewards are separate objects linked by `protects`/`guardedBy`;
embedded guardian reward data is invalid.

## Combat footprints

Units declare `hexSize: 1 | 2 | 3`, default 1. A wide stack’s position is its leftmost occupied
hex; the footprint extends horizontally right, is axis-locked, and never rotates. Adjacency, range,
targeting, retaliation, aura/AoE, terrain hooks, push, collision, and damage reach operate over the
union of occupied hexes. Each path destination must fit the whole footprint; forced movement
collides if any occupied hex is blocked. Trail effects cover every swept/occupied hex.

Deployment first uses the edge column and spills one column inward when a wide stack cannot fit.
Defender anchors are offset so every occupied hex stays in bounds. Wide pathfinding is BFS/A* over
valid anchor positions rather than a one-hex path with a late collision check.

## Map lint and content validation

`npm run map-lint` is a required CI gate. It verifies footprint bounds and non-overlap, entrances
reachable from starts across valid movement domains, linked guard efficacy including ranged-pickup
positions, no aggro over starts/city entrances, authored-only blocking obstacles, start-zone native
terrain warnings, anomaly ration warnings, Cache/Patient-Stone consistency, and Manywhere registry
coverage. A dense-map profile additionally pins exact dimensions, start exits and opening economy,
intended guardian gates, guarded reward coverage, interactive/decorative density, road coverage,
and the largest unbroken passable square.

Portable editor documents use the same pure schema validation, normalization, runtime conversion,
and lint functions in the editor, import, test play, promotion, tests, and this CI gate. Drafts may
retain playable-lint errors, but runtime conversion may not proceed with one. Validation additionally
covers document version and identity, rectangular tiles, unique entity IDs, player slots, independent
owner/faction references, legal nonempty starting-hero armies, city defaults/overrides including the
presence-based neutral-garrison boundary, positive
guardian stack counts, rewards, and reciprocal guard links. Diagnostics have stable codes, severity,
and entity/cell targets; editor UI does not own or reinterpret their legality.

Catalogs validate on load or in tests: complete identity, nonempty flavor/story, legal costs and
stats, count invariants where pinned, valid references, rarity and behavior metadata, and unique IDs.
The spec-link check verifies that every local data/code link under this directory resolves.

## Performance and presentation isolation

Core evaluation and simulation run headlessly without rendering. Normal UI actions must not block
on exhaustive AI or simulation. World view uses low level-of-detail: terrain and major objects only,
with decorations and tooltips disabled. Decorations are reproducible pure derivations and do not
inflate state or saves. Keep the DOM/SVG representation compact enough for the largest authored
72×72 map; animation queues are cancelable by the shared motion setting. Adventure reachability is
a single bounded traversal per selected hero, never one point-to-point search per destination tile.
The minimap batches terrain into color paths, and map tiles do not add wrapper elements solely for
event handling.

Hero management follows the same boundary. The one-screen Hero Details dashboard is a projection of
the serialized hero, catalogs, and existing legal actions; opening an icon, changing the local
detail selection, or previewing an equipment destination never mutates state or appends an action.
Its uniform artifact cells retain the eleven ordinary equipment-slot IDs; serialized hero state
also contains `misc3`, which is visible and equip-legal only with Reliquarian R1. They dispatch the existing
equip/unequip actions only after explicit review. Presentation may add pure selectors for effective
stats and disabled reasons, but it may not duplicate equipment, inventory, split, item-use, or
special-skill legality in React state. See [work order 59](../59_HERO_DASHBOARD.md).

## Verification posture

Every new rule receives deterministic unit or integration coverage at its boundary and interaction
points. Map changes run map lint. Production compilation and a browser smoke path cover integration.
Balance and exposure simulations are separate evidence: they never silently rewrite values and are
run only when the work order permits them.

## Artifact v2 action state

Doc-65 rule changes are ordinary serialized actions and fields, never UI-only shortcuts. Hero state
records day-start position, daily/weekly effect-use ledgers, marker position, carried movement,
consecutive water and city days, and authored instance choices. Player state records weekly gold
refund and prior battles by faction. Battle state records generic effect-use credits, deployment and
deflection choices, pending inherited stats, and seed-derived spell identity. Forged destinations,
targets, choices, costs, and timing are rejected before mutation. Save/replay reconstructs the same
state from the campaign seed and action stream without consuming ambient RNG.
