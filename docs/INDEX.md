> **Current documentation:** start with [`docs/spec/S00_OVERVIEW.md`](spec/S00_OVERVIEW.md).
> Numbered docs 01–29 are unchanged design history in [`docs/archive/`](archive/).

# docs/INDEX.md — Documentation Index

One line per doc. **Maintenance rule (binding, for humans and agents):** every new doc gets the next free number and a line here in the same commit. Before creating any doc, check this index for the next number. If a doc supersedes another (fully or partially), record it in the Supersedes column — superseded docs are never deleted or renumbered.

## Canonical specification

The S-files are current rules and must be updated in the same commit as a future rule change.
Catalog values and strings live in the data files linked by S09.

| Spec | Subject |
|---|---|
| [S00](spec/S00_OVERVIEW.md) | Game overview, authority order, and reading map |
| [S01](spec/S01_RATIONALE.md) | Decision generators, creative laws, and balance posture |
| [S02](spec/S02_ENGINE.md) | Headless deterministic engine, replay, pipeline, footprints, validation |
| [S03](spec/S03_ADVENTURE.md) | Time, movement, terrain, occupancy, objects, towns, water, victory |
| [S04](spec/S04_COMBAT.md) | Battle sequence, damage, morale, sieges, retreat/surrender |
| [S05](spec/S05_MAGIC.md) | Schools, casting, effects, upgrades, resonance, Bargains and Debts |
| [S06](spec/S06_HEROES.md) | Progression, skills, hiring, armies, items, equipment |
| [S07](spec/S07_ECONOMY.md) | Resources, income, recruitment, castles, buildings, difficulty |
| [S08](spec/S08_CANON.md) | Setting, factions, cultures, visual and naming canon |
| [S09](spec/S09_CONTENT_INDEX.md) | Data-file manifest and catalog invariants |
| [Coverage](spec/COVERAGE.md) | Normative mapping for archived docs 01–29 |
| [Reconciliation bugs](spec/RECONCILIATION_BUGS.md) | Intended rules and evidence for drift; live status in Beads |
| [Backlog](spec/backlog/UNIMPLEMENTED_CONTENT.md) | Preserved future-content provenance; live status in Beads |

## Numbered design history

Rows 01–29 below refer to files in `docs/archive/`. Doc 30 and future numbered work orders remain
live in `docs/` until superseded by their implementation.

| # | Doc | Contents | Supersedes / notes |
|---|---|---|---|
| 01 | MOTIVATION | What the game is, design thesis (attrition/tempo leverage, StS drafting), hard constraints | |
| 02 | DESIGN_PRINCIPLES | Stack, headless core, seeded RNG, sim harness, resolution pipeline, data-driven content, code hygiene | |
| 03 | MECHANICS | Baseline deviations from HoMM3: combat frame, deterministic luck, deterministic morale, 4 resources, primary skills, level-up draft | |
| 04 | POC_SPEC | Original PoC: placeholder factions, Border Marches, engine milestones | placeholder factions superseded by 06 |
| 05 | SETTING | Canon v2: premise, tone, Assimilation Laws, visual identity laws, six factions + rosters, hidden Seamborn, neutral cultures, naming | supersedes its own v1 |
| 06 | FACTIONS_HEARTHGUARD_WOUNDWRIGHTS | Implementation spec: first two factions, tiers 1–5, heroes, buildings | tier 6 added by 14; skills section of 11 superseded by 16 |
| 07 | MAGIC | Four schools, six unique pairs, opposition structure, acquisition weights | |
| 08 | SPELL_SYSTEM | Casting, counters, enchantment slots, twisters, upgrades (+faces), resonance, precedence rule, guilds | |
| 09 | SPELLS_V1 | Rite/Craft/Grave 1–10 fully specced; Wild penciled | Wild superseded by 15 |
| 10 | MILESTONE_MAGIC | Build order: faction swap + spell engine + acquisition + UI + AI + sim gates | balance gates relaxed per 13 |
| 11 | MILESTONE_HEROES | Tavern, named heroes, secondary skills, multi-hero AI, loss conditions | §3 skills superseded by 16 |
| 12 | MILESTONE_TRICKS | Consumables, pickup shapes, first puzzle-locks, marketplace | item catalog extended by 17 |
| 13 | CONTENT_POLICY | Balance posture, rarity tiers, exposure budget, anti-planning rules, omens (pencil), weird-spell pencil list | omens implemented per 19 |
| 14 | UNITS | Complete unit catalog: all six factions × 6 tiers, faction passives, T6 dwellings | extends 06 |
| 15 | SPELLS_COMPLETE | Wild full spec, +6 per school, provenance rares; catalog totals | extends 09 |
| 16 | SKILLS | 21 skills × 3 ranks, draft integration, 6-skill cap | supersedes 11 §3 |
| 17 | CONSUMABLES | Scroll rule, potions, adventure items, trinkets, sourcing tables | extends 12 §1; trinkets migrated to artifacts by 18 |
| 18 | ARTIFACTS | 11 slots, vanilla/charm/relic catalogs, the Tailor's Kit | absorbs 17's trinkets as Misc artifacts |
| 19 | MAP_OBJECTS | Dwellings, creative locations, week omens (implemented spec) | implements 13's omen pencil |
| 20 | CASTLES_SIEGES_BARGAINS | Common building tree, faction specials, siege-lite, bargains & Debts | City Hall replaces PoC Treasury |
| 21 | MILESTONE_EXPANSION | Phased build: engine prereqs, four new factions, full content, castles, Crosstitch, acceptance | hero rosters gap filled by 22 |
| 22 | FLAVOR_SYSTEM | Inspection UI, discovery rule, writing register, data schema; hero rosters for the four new factions | fills 21 Phase B gap |
| 23 | FLAVOR_TEXT | All flavor strings: terrain, objects, units, buildings, spells, artifacts, items, skills, hero stories | terrain additions in 28 |
| 24 | MILESTONE_OCCUPANCY | Guardian aggro, non-overlap, ranged pickup, map-lint, multi-tile footprints, multi-hex creatures | Forager ranks adjusted vs 16 |
| 25 | MILESTONE_SHIPSHAPE | Retreat/surrender, splitting + proportionality guard, guardian growth, difficulty, save/replay links, minimap, victory conditions, roads, mana spring, battle stats | |
| 26 | WATER | Boats, sea combat, water pickups/locations, sea creatures, the Torn Sound, naval AI | activates Summon Skiff (15) |
| 27 | CASTLE_UI | Picture-card castle screen, grouped build slots, detail dialogs, and four availability states | implements the castle UI layer from 20/21 |
| 28 | TERRAIN | Three-layer terrain system, catalog, native ground, combat derivation, obstacle props, decorations | extends 23 flavor; lint additions to 24's tool |
| 29 | DISCOVERY | Neutral towns, +28 map objects, Cache-Marks, +32 artifacts (incl. Burdens), +12 heroes, "Manywhere" wander map, Dormant AI, victory:none | extends 18/19/22/23; lint additions |
| 30 | SPEC_REFACTOR | Work order: reorganize 01–29 into docs/spec/ by system, with reconciliation, coverage report, and spec/data boundary | archives 01–29; docs/spec/ becomes current |
| 31 | PIXEL_ART | PixelLab asset generation + wiring: manifest/fallback, batch discipline with reflection, terrain layers, map objects, 8-direction heroes, battle units | rendering-only; art laws per S08; defers icons/portraits/battle terrain |
| 32 | FOOTPRINT_SHRINK | Footprint = ground contact: castles 3×2, mines 2×1, maps re-authored, S03 updated | rules-adjacent; sequenced before 31 Phase B |
| 33 | MAP_PROPS | Prop generation playbook: prompt hygiene, overlap-composed obstacle families, inspection protocol, iteration caps, work order | operational companion to 31; 31 wins on conflict; its terrain-transition deferral is continued by 36 |
| 34 | UX_COMPLETENESS | UX-only audit contract, shared interaction grammar, screen coverage matrix, automated gates, and new-player acceptance walkthrough | presentation work order; mechanics remain governed by S00–S09 |
| 35 | MOUNTAIN_HANDOFF | Accepted grassy family, connectivity-first rocky backbone pipeline, arbitrary-shape compositor rules, showcase reproduction, pitfalls, and continuation guide | continuation note for 31/33; no mechanics changes |
| 36 | TERRAIN_TRANSITIONS | Native terrain-transition compositor, H2 reference boundary, generated game-family assets, regeneration/review steps, and direct-Wang integration handoff | consolidates terrain entries in ASSETS_LOG/IMPLEMENTATION_LOG and extends 31; no mechanics changes |
| 37 | ADVENTURE_VISUAL_SHOWCASE | Catalog-derived native-scale acceptance fixture for terrain, mountains, decorations, objects, castles, heroes, and guardians | presentation verification companion to 31/34/35/36; no mechanics changes |
| 38 | NEW_PLAYER_WALKTHROUGH | Continuous title-to-authored-outcome browser journey, paired screen/step evidence, replay assertions, and exhaustive synthetic-coverage manifest | implemented acceptance companion to 34; no mechanics changes |
| 39 | GUARDIAN_STRENGTH | Central stat/count army rating, deterministic battle calibration, consumer audit, and threshold recalibration | replaces the HP × average-damage strategic estimate; updates S04/S06/S09 |
| 40 | CROOKED_CROWN | Selectable deterministic 72×72 dense labyrinth map, calibrated progression, topology lint, and browser evidence | extends S02/S03/S09 and the authored-map catalog |
| 41 | ADVENTURE_STRUCTURE_DIALOGS | Shared contextual adventure-structure dialog, exhaustive object routing, focus/input safety, and browser evidence | presentation companion to 34/38; no mechanics changes |
| 42 | CASTLE_ARMY_TRANSFER | Compact reducer-projected visiting-hero/garrison slot transfer, partial controls, remote-state honesty, and responsive evidence | presentation companion to 34; preserves S02/S06 actions and rules |
| 43 | FRIENDLY_HERO_MEETINGS | Distinct map exchange intent, deterministic safe adjacent routing, verified post-move opening, and browser evidence | presentation/routing companion to 34/41/42; preserves S02/S03/S06 actions and rules |
| 44 | FOCUSED_NON_ADVENTURE_SCREENS | Executable surface/job inventory and focused setup, hero, castle, combat, spellbook, choice, result, and save/import layouts | presentation companion to 34/38/41/42/43; preserves S00–S09 actions and rules |
| 45 | ADVENTURE_MAP_FIRST_UI | Dominant adventure map, narrow routine-command rail, and dedicated hero/save/contextual secondary surfaces | presentation companion to 34/41/42/43/44; preserves S00–S09 actions and rules |
| 46 | SPELL_SKILL_ICONS | Complete final-resolution PixelLab spell/skill icon contract, provenance, manifest gates, shared UI integration, and review evidence | presentation/assets companion to 31/34/44/45; preserves S05/S06 rules |
| 47 | MOUNTAIN_RENDER_BOUNDS | Executable north-only adventure-sprite overhang, clipped mountain footprints, full-visual-rectangle culling, and Crooked Crown evidence | presentation correction to 35/37/40; preserves authored terrain, collision, pathfinding, and native mountain assets |
| 48 | INCREMENTAL_ADVENTURE_FOG | Rules-owned exploration union for every entered movement tile plus animation-prefix presentation and responsive frame evidence | extends S03 movement/exploration; preserves replay/save/link authority and doc 47 late fog |
| 49 | SIXFOLD_TRIAL | Six real configurable player slots and a deterministic advanced-combat proving ground with developed castles, derived two-week armies, complete faction-school spellbooks, calibrated guardians, rewards, and browser evidence | extends S02/S03/S04/S09 and the authored-map/setup catalogs |
| 50 | MAP_EDITOR | Versioned portable authored-map contract, in-game paint/shape editor, local revision storage, deterministic runtime conversion, import/export, lint, and promotion into the built-in catalog | extends S02/S03/S09; editor state remains outside rules and campaign saves |

Next free number: **51**.
