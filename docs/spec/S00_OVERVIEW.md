# Vibes and Magic — Canonical Specification

This directory is the current, portable specification for the game formerly developed under the
working title *Border Marches*. The numbered documents in [`../archive/`](../archive/) are the
unchanged design history; they are not the current rules. [`../DECISIONS.md`](../DECISIONS.md) is
the append-only record of implementation rulings. Where this specification and executable content
catalogs divide responsibility, this specification owns behavior and invariants while the linked
data files own names, prose, costs, stats, weights, and other authored values.

## The game

Vibes and Magic is a deterministic, turn-based fantasy strategy game in the Heroes tradition. A
player explores an authored map with heroes and armies, captures mines and cities, recruits weekly
creature growth, develops cities, discovers a fraction of a large content pool, and resolves
battles on a small hex field. HoMM3 is the baseline wherever this specification does not explicitly
depart from it.

The game is about being dealt unusual verbs and making a route from them. Spells, skills, items,
artifacts, faction mechanics, map sites, terrain, and omens create leverage primarily through
attrition and tempo. They should alter which fight is affordable, when an army arrives, or how a
battle unfolds—not produce runaway permanent power.

The experience has three connected loops:

1. **Adventure:** spend finite daily movement to explore, route around threats, collect or visit
   objects, acquire boats, capture income, and choose which fights to accept.
2. **Development:** recruit weekly growth, build one city improvement per day, hire and develop
   heroes through offer-shaped drafts, and assemble a spellbook and equipment loadout from what the
   seed exposes.
3. **Combat:** command a hero's derived seven-to-nine-stack army on a deterministic 13×9 hex field, using movement,
   attacks, one hero act per round, counters, enchantments, terrain, and deterministic morale that converts
   battlefield events into occasional extra actions.

## Non-negotiable identity

- The engine is deterministic and replayable from a seed and explicit action log.
- The rules core is headless; the UI renders state and submits actions but owns no game rules.
- Random content is dealt as offers. Specific uncommon and rare outcomes cannot be routed to on
  demand, except for explicitly authored provenance sites.
- A normal run surfaces roughly 30–40% of a catalog, leaving genuine discoveries for later runs.
- Content earns its place through a distinct behavior or decision, not a larger number.
- Preparation that an optimizer would repeat before every fight is either automated, made a real
  adventure-time cost, or removed.
- Balance work before content completion fixes degeneracy only; parity is not a target.
- The setting reads as ordinary folkloric fantasy before its stitched-world strangeness appears.
- Flavor never carries the only statement of a rule, and mechanics text never replaces flavor.

## What is authoritative

Use the sources in this order:

1. This specification for current rules and invariants.
2. The data manifests linked by [`S09_CONTENT_INDEX.md`](S09_CONTENT_INDEX.md) for current catalog
   entries, values, and strings.
3. [`../DECISIONS.md`](../DECISIONS.md) for append-only reconciliations and implementation choices.
4. Code as an implementation of those sources, not as permission to silently change them.
5. Archived numbered docs as provenance when the coverage report points there.

If code differs without a decision, the spec remains authoritative and the discrepancy belongs in
[`RECONCILIATION_BUGS.md`](RECONCILIATION_BUGS.md). Any future numbered rule-change document must
update the affected S-file and data in the same commit. New numbered documents use the next number
in [`../INDEX.md`](../INDEX.md).

## Reading map

- [`S01_RATIONALE.md`](S01_RATIONALE.md): the decision generators and creative constraints.
- [`S02_ENGINE.md`](S02_ENGINE.md): pure-core, determinism, action, pipeline, footprint, and
  performance invariants.
- [`S03_ADVENTURE.md`](S03_ADVENTURE.md): time, movement, terrain, occupancy, objects, towns,
  victory, boats, and water.
- [`S04_COMBAT.md`](S04_COMBAT.md): battle sequence, damage, luck, morale, wide stacks, sieges,
  retreat, surrender, and proportionality.
- [`S05_MAGIC.md`](S05_MAGIC.md): schools, casting, counters, enchantments, twisters, resonance,
  adventure magic, bargains, and Debts.
- [`S06_HEROES.md`](S06_HEROES.md): hero stats, leveling, skills, hiring, armies, items, and
  equipment.
- [`S07_ECONOMY.md`](S07_ECONOMY.md): resources, growth, income, markets, recruitment, buildings,
  and difficulty.
- [`S08_CANON.md`](S08_CANON.md): setting truth, tone, factions, cultures, visual identity, and
  naming.
- [`S09_CONTENT_INDEX.md`](S09_CONTENT_INDEX.md): executable catalog manifest and validation
  requirements.
- [`COVERAGE.md`](COVERAGE.md): source-to-spec reconciliation for docs 01–29.
- [`RECONCILIATION_BUGS.md`](RECONCILIATION_BUGS.md): known unlogged implementation divergence.
- [`backlog/`](backlog/): intact unimplemented content and explicitly deferred systems.

## Portability contract

A port may use another language, UI framework, renderer, storage API, or platform. It must preserve
the observable action model, deterministic ordering, content schemas, formulas, acquisition rules,
and state transitions described here. Rendering details can change only where the visual identity
laws permit. A port is conformant when identical content, seed, setup, and explicit actions produce
the same rule outcomes and final state, apart from presentation-only fields.

The present TypeScript/React implementation is a reference implementation. Its stack is not the
game; its deterministic contract is.
