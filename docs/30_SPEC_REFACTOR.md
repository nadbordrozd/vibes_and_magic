# 30 — Spec Refactor Work Order

Task: refactor docs 01–29 into a canonical, portable specification. This is a reorganization with reconciliation, NOT summarization. The output must let (a) a fresh agent session orient in one read, and (b) a future re-port to a different stack reproduce the game from spec + data files alone.

## Output structure

Create `docs/spec/`:
- **S00_OVERVIEW.md** — what the game is in two pages; pointers to the rest.
- **S01_RATIONALE.md** — decision generators, preserved near-verbatim: the design thesis (attrition/tempo leverage), the fluidity rule ("no mechanic an optimizer would use before every fight"), the balance posture (degeneracy-only until content-complete), the target-scaling law, the anti-planning/offer-shaped-acquisition rules, the behavior-not-numbers content filter, the exposure budget, the Assimilation Laws, visual identity laws, writing register.
- **S02_ENGINE.md** — architecture invariants: headless core, apply/legalActions, seeded determinism, replay-as-save, pipeline stages and precedence rules, persistent tiles, footprints, performance requirements.
- **S03_ADVENTURE.md** — map rules: turn/day/week structure, movement, terrain system (3 layers), occupancy/aggro/ranged pickup, objects taxonomy, omens, neutral towns, guardian growth, victory conditions, water/boats.
- **S04_COMBAT.md** — battlefield rules: rounds, speed, meter, luck, damage math, retaliation, wide units, sea/mire templates, sieges, retreat/surrender, proportionality guard.
- **S05_MAGIC.md** — schools/pairs, casting, counters, enchantments, twisters, upgrades and channels, resonance, bargains/Debts, adventure magic.
- **S06_HEROES.md** — stats, drafting, skills system (ranks, cap), specialties, hiring/ransom, equipment slots.
- **S07_ECONOMY.md** — resources, income, castles/buildings, marketplace, recruitment, difficulty levers.
- **S08_CANON.md** — setting, tone, factions (identity + verb + pair + visual law compliance), neutral cultures, Seamborn, naming.
- **S09_CONTENT_INDEX.md** — NOT the catalogs themselves: a manifest pointing at data files as the single source of truth for unit stats, spells, items, artifacts, skills, flavor strings, maps, plus the invariants each catalog must satisfy (schema, rarity tags, pipeline-stage declarations, flavor-required).

## Binding rules for the refactor

1. **Reconciliation order:** where docs, DECISIONS.md, and code disagree — a decision logged in DECISIONS.md wins over the doc; an unlogged code divergence is a BUG: spec follows the doc and the divergence goes on a produced bug list (`docs/spec/RECONCILIATION_BUGS.md`).
2. **Coverage report required:** produce `docs/spec/COVERAGE.md` mapping every normative statement (rules, numbers-as-defaults, pinned decisions, "always/never" sentences) in docs 01–29 to its new spec location OR to an explicit "deliberately dropped" list with one-line reasons. Milestone sequencing, sim gates for completed milestones, migration notes for migrations already performed, and design-debate prose are droppable by default. Pinned rulings are never droppable, wherever they appear.
3. **Spec/data boundary:** the spec states rules and invariants; numbers and strings live in data files. Where a doc table duplicates data now in the repo, the spec references the data file. Where a doc table was never implemented (penciled future content), move it to `docs/spec/backlog/` intact.
4. **Do not touch the originals:** move docs 01–29 unmodified to `docs/archive/` and add a line at the top of INDEX.md pointing readers to `docs/spec/` as current. INDEX.md itself stays and gains a spec section.
5. Keep DECISIONS.md live and append-only, as before. Future milestones get new numbered docs per the index rule; the spec files are updated in the same commit as any rule change ("spec is truth" from here on).
6. Size discipline: each S-file ≤ ~400 lines. If it doesn't fit, it's duplicating data or retaining prose.

## Acceptance

- A fresh agent given only `docs/spec/` + data files + the codebase answers correctly (spot-check): the damage precedence rule, the aggro adjacency setting and its status, the proportionality guard formula, the Debt design law, the authored/seeded boundary, the exposure budget, the retreat-vs-surrender consequence matrix.
- COVERAGE.md exists and its dropped-list contains no rules.
- RECONCILIATION_BUGS.md triaged (may be empty; probably isn't).
- CI: add a link-check that spec references to data files resolve.
