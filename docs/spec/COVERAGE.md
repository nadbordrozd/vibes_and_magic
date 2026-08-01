# Normative Coverage for Archived Docs 01–29

This is the reconciliation ledger required by doc 30. A row covers every rule, default number,
pinned ordering, and always/never statement in the named source section. Catalog rows route authored
values/strings to the executable data manifest rather than duplicating them. Superseded values route
to the later rule or current data; they are not treated as silently dropped.

## 01–05: thesis, architecture, mechanics, prototype, canon

| Source section | Canonical destination |
|---|---|
| 01 What this is; design thesis | [`S00`](S00_OVERVIEW.md), [`S01`](S01_RATIONALE.md#design-thesis-leverage-through-attrition-and-tempo) |
| 01 Hard constraints | [`S01`](S01_RATIONALE.md#fluidity), [`S02`](S02_ENGINE.md#reference-stack-and-portability) |
| 01 Scope philosophy | [`S01`](S01_RATIONALE.md#randomness-and-anti-planning), [`S01`](S01_RATIONALE.md#content-filter-and-volume) |
| 02 Stack | [`S02`](S02_ENGINE.md#reference-stack-and-portability) |
| 02 Headless core | [`S02`](S02_ENGINE.md#headless-core-boundary), [`S02`](S02_ENGINE.md#state-and-action-requirements) |
| 02 Determinism/RNG | [`S02`](S02_ENGINE.md#seeded-determinism), [`S02`](S02_ENGINE.md#replay-is-save) |
| 02 Simulation harness | [`S02`](S02_ENGINE.md#verification-posture), [`S01`](S01_RATIONALE.md#balance-posture) |
| 02 Resolution pipeline | [`S02`](S02_ENGINE.md#resolution-pipeline), [`S04`](S04_COMBAT.md) |
| 02 Data-driven content | [`S09`](S09_CONTENT_INDEX.md) |
| 02 Code hygiene; exclusions | [`S02`](S02_ENGINE.md#headless-core-boundary), [`S02`](S02_ENGINE.md#reference-stack-and-portability) |
| 03 HoMM3 confirmations | [`S00`](S00_OVERVIEW.md#the-game), [`S03`](S03_ADVENTURE.md#time-turns-and-loss), [`S04`](S04_COMBAT.md) |
| 03 Combat frame | [`S04`](S04_COMBAT.md#battlefield-and-armies), [`S01`](S01_RATIONALE.md#target-scaling-law) |
| 03 Luck | [`S04`](S04_COMBAT.md#deterministic-damage) |
| 03 Morale meter | [`S04`](S04_COMBAT.md#meter-deterministic-morale) |
| 03 Four resources | [`S07`](S07_ECONOMY.md#resources) |
| 03 Primary skills | [`S04`](S04_COMBAT.md#deterministic-damage), [`S05`](S05_MAGIC.md#mana-and-casting), [`S06`](S06_HEROES.md#hero-model) |
| 03 Draft | [`S06`](S06_HEROES.md#leveling-and-drafts) |
| 03 later content directions | Implemented families route to [`S03`](S03_ADVENTURE.md), [`S04`](S04_COMBAT.md), [`S05`](S05_MAGIC.md), [`S06`](S06_HEROES.md); remaining resistance direction is preserved in [`backlog`](backlog/UNIMPLEMENTED_CONTENT.md). |
| 04 setup/map/turn/heroes | [`S03`](S03_ADVENTURE.md), [`S06`](S06_HEROES.md); authored defaults in [`S09`](S09_CONTENT_INDEX.md#authored-maps) |
| 04 placeholder factions/units | Superseded by docs 06/14 and current [`unit/faction data`](S09_CONTENT_INDEX.md#factions-units-and-heroes). |
| 04 castles/buildings | [`S07`](S07_ECONOMY.md#common-castle-tree) |
| 04 guardians/combat | [`S03`](S03_ADVENTURE.md#guardians-and-authored-encounters), [`S04`](S04_COMBAT.md) |
| 04 AI/UI behavioral rules | [`S02`](S02_ENGINE.md#headless-core-boundary), [`S03`](S03_ADVENTURE.md), [`S07`](S07_ECONOMY.md#ai-economy-constraints) |
| 05 premise/tone | [`S08`](S08_CANON.md#premise) |
| 05 Assimilation Laws/visual laws | [`S01`](S01_RATIONALE.md#assimilation-laws), [`S01`](S01_RATIONALE.md#visual-identity-laws) |
| 05 six factions/rivalries | [`S08`](S08_CANON.md#playable-factions) |
| 05 Seamborn/neutral cultures | [`S08`](S08_CANON.md#the-hidden-seventh-seamborn), [`S08`](S08_CANON.md#neutral-cultures), future roster in [`backlog`](backlog/UNIMPLEMENTED_CONTENT.md) |
| 05 naming | [`S08`](S08_CANON.md#naming) |

## 06–10: factions and first magic system

| Source section | Canonical destination |
|---|---|
| 06 Hearthguard/Wound-Wrights rosters, passives, heroes | Current catalogs in [`S09`](S09_CONTENT_INDEX.md#factions-units-and-heroes); faction identity in [`S08`](S08_CANON.md#playable-factions). Later tiers/heroes supersede old roster limits. |
| 06 faction buildings | [`S07`](S07_ECONOMY.md#faction-buildings), current [`building data`](S09_CONTENT_INDEX.md#castles-economy-terrain-omens-and-flavor) |
| 06 map/AI behavior | [`S03`](S03_ADVENTURE.md), [`S07`](S07_ECONOMY.md#ai-economy-constraints) |
| 06 normative test assertions | Rule targets map above; completed milestone gate itself is in the dropped-process list below. |
| 07 four schools/six pairs | [`S05`](S05_MAGIC.md#schools-and-faction-pairs) |
| 07 acquisition, identity, no prerequisites, pairing weights | [`S05`](S05_MAGIC.md#spell-acquisition), [`S01`](S01_RATIONALE.md#randomness-and-anti-planning) |
| 07 budget/twisters/topology/target scaling | [`S05`](S05_MAGIC.md), [`S01`](S01_RATIONALE.md#target-scaling-law) |
| 08 casting/SP scaling | [`S05`](S05_MAGIC.md#mana-and-casting) |
| 08 counters/enchantments/twisters | [`S05`](S05_MAGIC.md#four-counters-exactly), [`S05`](S05_MAGIC.md#battle-enchantments), [`S05`](S05_MAGIC.md#twisters) |
| 08 upgrades/channels/resonance | [`S05`](S05_MAGIC.md#base-and--faces), [`S05`](S05_MAGIC.md#resonance) |
| 08 special classes/Bargains | [`S05`](S05_MAGIC.md#mana-and-casting), [`S05`](S05_MAGIC.md#bargains-and-debts) |
| 08 pinned precedence | [`S04`](S04_COMBAT.md#pinned-positioning-precedence), [`S02`](S02_ENGINE.md#resolution-pipeline) |
| 08 guild costs/deals | Rules in [`S05`](S05_MAGIC.md#spell-acquisition), values in [`building/spell data`](S09_CONTENT_INDEX.md#magic). |
| 09 Rite/Craft/Grave catalog | Current [`spell data`](S09_CONTENT_INDEX.md#magic); changed Rally/Wither values follow DECISIONS and data. |
| 09 Wild pencil | Superseded by doc 15 and current [`spell data`](S09_CONTENT_INDEX.md#magic). |
| 09 AI hints | [`S05`](S05_MAGIC.md#catalog-boundary), current [`spell data`](S09_CONTENT_INDEX.md#magic). |
| 10 binding build architecture | End-state invariants in [`S02`](S02_ENGINE.md), [`S05`](S05_MAGIC.md), [`S09`](S09_CONTENT_INDEX.md). |

## 11–15: heroes, tricks, content policy, units, complete spells

| Source section | Canonical destination |
|---|---|
| 11 Tavern/hiring/loss | [`S06`](S06_HEROES.md#tavern-hiring-defeat-and-ransom), [`S03`](S03_ADVENTURE.md#time-turns-and-loss); Tavern build timing superseded by doc 27. |
| 11 named first heroes | Current [`hero data`](S09_CONTENT_INDEX.md#factions-units-and-heroes). |
| 11 two-rank skills | Superseded by doc 16 and doc 24 Forager ranks; current [`S06`](S06_HEROES.md#secondary-skills). |
| 11 multi-hero play/AI | [`S06`](S06_HEROES.md#multiple-heroes-and-transfers), [`S07`](S07_ECONOMY.md#ai-economy-constraints) |
| 12 consumable timing/catalog | Timing in [`S06`](S06_HEROES.md#consumables-and-scrolls); expanded catalog in [`S09`](S09_CONTENT_INDEX.md#skills-items-and-artifacts). |
| 12 pickup shapes | [`S03`](S03_ADVENTURE.md#object-taxonomy), [`S07`](S07_ECONOMY.md#income-and-pickups) |
| 12 puzzle locks/pipeline | [`S03`](S03_ADVENTURE.md#guardians-and-authored-encounters), unit/ability data in [`S09`](S09_CONTENT_INDEX.md#factions-units-and-heroes) |
| 12 Marketplace | [`S07`](S07_ECONOMY.md#marketplace) |
| 12 explicitly deferred | Implemented items route above; recruitable Seamborn remains in [`backlog`](backlog/UNIMPLEMENTED_CONTENT.md). |
| 13 balance posture | [`S01`](S01_RATIONALE.md#balance-posture) |
| 13 volume/behavior filter | [`S01`](S01_RATIONALE.md#content-filter-and-volume) |
| 13 rarity/exposure/provenance | [`S01`](S01_RATIONALE.md#content-filter-and-volume), [`S09`](S09_CONTENT_INDEX.md#acquisition-invariants) |
| 13 anti-planning | [`S01`](S01_RATIONALE.md#randomness-and-anti-planning) |
| 13 omen pencil | Superseded by doc 19; [`S03`](S03_ADVENTURE.md#weekly-omens). |
| 13 adventure magic | [`S05`](S05_MAGIC.md#adventure-magic) |
| 13 pencil lists | Implemented definitions route to data in [`S09`](S09_CONTENT_INDEX.md); unimplemented Cartwright’s Wheel preserved in [`backlog`](backlog/UNIMPLEMENTED_CONTENT.md). |
| 14 all six unit rosters/passives/costs | Current [`unit/faction/building data`](S09_CONTENT_INDEX.md#factions-units-and-heroes); generic behavior laws in [`S04`](S04_COMBAT.md). |
| 14 verb coverage/roster constraints | [`S01`](S01_RATIONALE.md#content-filter-and-volume), [`S01`](S01_RATIONALE.md#visual-identity-laws) |
| 15 complete spell additions/provenance/totals | [`S05`](S05_MAGIC.md), current [`spell data`](S09_CONTENT_INDEX.md#magic); two Wild fill-ins follow DECISIONS. |

## 16–20: complete catalogs, map objects, castles, debts

| Source section | Canonical destination |
|---|---|
| 16 skills 1–21 and ranks | [`S06`](S06_HEROES.md#secondary-skills), current [`skill data`](S09_CONTENT_INDEX.md#skills-items-and-artifacts); Forager ranges superseded by doc 24. |
| 16 draft integration/cap | [`S06`](S06_HEROES.md#leveling-and-drafts) |
| 17 scroll rule | [`S06`](S06_HEROES.md#consumables-and-scrolls) |
| 17 combat/adventure item catalogs | Current [`item data`](S09_CONTENT_INDEX.md#skills-items-and-artifacts). |
| 17 trinkets | Migrated unchanged to artifacts; [`S06`](S06_HEROES.md#artifact-equipment). |
| 17 sourcing/counts/exposure | [`S09`](S09_CONTENT_INDEX.md#acquisition-invariants), current [`item data`](S09_CONTENT_INDEX.md#skills-items-and-artifacts). |
| 18 equipment/system/sourcing | [`S06`](S06_HEROES.md#artifact-equipment), [`S09`](S09_CONTENT_INDEX.md#skills-items-and-artifacts) |
| 18 Vanilla/Charm/Relic catalogs | Current [`artifact data`](S09_CONTENT_INDEX.md#skills-items-and-artifacts); doc 29 extends counts. |
| 18 Tailor’s Kit | [`S06`](S06_HEROES.md#artifact-equipment), victory distinction in [`S03`](S03_ADVENTURE.md#victory-and-defeat) |
| 19 map dwellings/creative locations | [`S03`](S03_ADVENTURE.md#object-taxonomy), current [`object/map data`](S09_CONTENT_INDEX.md#authored-maps) |
| 19 implemented omens | [`S03`](S03_ADVENTURE.md#weekly-omens), current [`omen data`](S09_CONTENT_INDEX.md#castles-economy-terrain-omens-and-flavor) |
| 20 common tree/City Hall replacement | [`S07`](S07_ECONOMY.md#common-castle-tree) |
| 20 faction specials | [`S07`](S07_ECONOMY.md#faction-buildings) |
| 20 siege-lite | [`S04`](S04_COMBAT.md#sieges) |
| 20 bargains/Debts and future law | [`S05`](S05_MAGIC.md#bargains-and-debts), [`S01`](S01_RATIONALE.md#bargain-and-debt-law) |

## 21–25: expansion, flavor, occupancy, ship-shape

| Source section | Canonical destination |
|---|---|
| 21 Phase A engine prerequisites | End-state [`S02`](S02_ENGINE.md), [`S05`](S05_MAGIC.md), [`S06`](S06_HEROES.md). |
| 21 Phases B–E content/rules | [`S03`](S03_ADVENTURE.md), [`S04`](S04_COMBAT.md), [`S05`](S05_MAGIC.md), [`S07`](S07_ECONOMY.md), catalogs in [`S09`](S09_CONTENT_INDEX.md). |
| 21 deferred systems | [`backlog`](backlog/UNIMPLEMENTED_CONTENT.md). |
| 22 inspection UI/discovery exception | [`S01`](S01_RATIONALE.md#inspection-and-honest-information) |
| 22 flavor/story/terrain schema | [`S09`](S09_CONTENT_INDEX.md#castles-economy-terrain-omens-and-flavor) |
| 22 writing register | [`S01`](S01_RATIONALE.md#writing-register) |
| 22 four-faction heroes | Current [`hero data`](S09_CONTENT_INDEX.md#factions-units-and-heroes). |
| 23 all flavor strings | Current [`flavor and catalog data`](S09_CONTENT_INDEX.md#castles-economy-terrain-omens-and-flavor); register in [`S01`](S01_RATIONALE.md#writing-register). |
| 24 occupancy/capture | [`S03`](S03_ADVENTURE.md#occupancy-footprints-and-entrances) |
| 24 guardian aggro | [`S03`](S03_ADVENTURE.md#guardian-aggro) |
| 24 ranged pickup/Forager revision | [`S03`](S03_ADVENTURE.md#ranged-pickup), [`S06`](S06_HEROES.md#secondary-skills) |
| 24 map lint/AI/UI | [`S02`](S02_ENGINE.md#map-lint-and-content-validation), [`S03`](S03_ADVENTURE.md#guardian-aggro) |
| 24 map footprints | [`S02`](S02_ENGINE.md#adventure-footprints) |
| 24 combat footprints/assignments | [`S02`](S02_ENGINE.md#combat-footprints), [`S04`](S04_COMBAT.md#wide-units-and-terrain-reach), data in [`S09`](S09_CONTENT_INDEX.md#factions-units-and-heroes) |
| 25 retreat/surrender | [`S04`](S04_COMBAT.md#retreat-and-surrender-matrix) |
| 25 splitting/proportionality | [`S06`](S06_HEROES.md#multiple-heroes-and-transfers), [`S04`](S04_COMBAT.md#destruction-proportionality-guard) |
| 25 guardian growth | [`S03`](S03_ADVENTURE.md#guardians-and-authored-encounters) |
| 25 difficulty | [`S07`](S07_ECONOMY.md#difficulty) |
| 25 save/load/replay | [`S02`](S02_ENGINE.md#replay-is-save) |
| 25 minimap/world view | [`S02`](S02_ENGINE.md#performance-and-presentation-isolation), [`S03`](S03_ADVENTURE.md#movement-and-exploration) |
| 25 victory/defeat | [`S03`](S03_ADVENTURE.md#victory-and-defeat) |
| 25 roads/Mana Spring/statistics | [`S03`](S03_ADVENTURE.md#terrain-three-strictly-separate-layers), [`S03`](S03_ADVENTURE.md#object-taxonomy), [`S04`](S04_COMBAT.md#result-accounting) |

## 26–29: water, castle UI, terrain, discovery

| Source section | Canonical destination |
|---|---|
| 26 boats/travel/Summon Skiff | [`S03`](S03_ADVENTURE.md#boats-and-water), [`S05`](S05_MAGIC.md#adventure-magic) |
| 26 sea combat/amphibious rules | [`S04`](S04_COMBAT.md#sea-and-mire-battlefields) |
| 26 water pickups/locations | [`S03`](S03_ADVENTURE.md#object-taxonomy), [`S03`](S03_ADVENTURE.md#boats-and-water) |
| 26 sea creatures | Current [`unit data`](S09_CONTENT_INDEX.md#factions-units-and-heroes). |
| 26 Torn Sound/map/AI | [`S09`](S09_CONTENT_INDEX.md#authored-maps), [`S03`](S03_ADVENTURE.md#boats-and-water) |
| 26 deferred systems | [`backlog`](backlog/UNIMPLEMENTED_CONTENT.md). |
| 27 named dwellings | [`S07`](S07_ECONOMY.md#building-card-ui-contract), current [`building data`](S09_CONTENT_INDEX.md#castles-economy-terrain-omens-and-flavor) |
| 27 upgrade chains | [`S07`](S07_ECONOMY.md#common-castle-tree), [`S07`](S07_ECONOMY.md#building-card-ui-contract) |
| 27 cards/states/dialog | [`S07`](S07_ECONOMY.md#building-card-ui-contract) |
| 27 Tavern prebuilt | [`S06`](S06_HEROES.md#tavern-hiring-defeat-and-ransom), [`S07`](S07_ECONOMY.md#common-castle-tree) |
| 28 three terrain layers/catalog/overlays | [`S03`](S03_ADVENTURE.md#terrain-three-strictly-separate-layers), current [`terrain data`](S09_CONTENT_INDEX.md#castles-economy-terrain-omens-and-flavor) |
| 28 native ground | [`S03`](S03_ADVENTURE.md#terrain-three-strictly-separate-layers) |
| 28 battlefield derivation | [`S04`](S04_COMBAT.md#sea-and-mire-battlefields), [`S03`](S03_ADVENTURE.md#terrain-three-strictly-separate-layers) |
| 28 decoration system | [`S03`](S03_ADVENTURE.md#authoredseeded-boundary), [`S02`](S02_ENGINE.md#seeded-determinism) |
| 28 obstacle props/boundary | [`S03`](S03_ADVENTURE.md#authoredseeded-boundary), [`../MAPS`](../MAPS.md) |
| 28 authoring/migration | End-state authoring in [`../MAPS`](../MAPS.md), map manifest in [`S09`](S09_CONTENT_INDEX.md#authored-maps). |
| 29 neutral towns | [`S03`](S03_ADVENTURE.md#town-ownership-and-neutral-towns) |
| 29 28 object types/Cache-Mark | [`S03`](S03_ADVENTURE.md#object-taxonomy), current [`object/map data`](S09_CONTENT_INDEX.md#authored-maps) |
| 29 80 artifacts/Burdens | [`S06`](S06_HEROES.md#artifact-equipment), current [`artifact data`](S09_CONTENT_INDEX.md#skills-items-and-artifacts); missing handlers in [`bugs`](RECONCILIATION_BUGS.md). |
| 29 36 heroes | [`S06`](S06_HEROES.md), current [`hero data`](S09_CONTENT_INDEX.md#factions-units-and-heroes); Bogdan gap in [`bugs`](RECONCILIATION_BUGS.md). |
| 29 Manywhere/victory none | [`S03`](S03_ADVENTURE.md#victory-and-defeat), [`S09`](S09_CONTENT_INDEX.md#authored-maps); save gap in [`bugs`](RECONCILIATION_BUGS.md). |
| 29 Dormant AI | [`S03`](S03_ADVENTURE.md#time-turns-and-loss), [`S07`](S07_ECONOMY.md#ai-economy-constraints) |

## Deliberately dropped process material

No gameplay rule, default, pinned ruling, invariant, catalog entry, or writing/visual law is dropped.
Only these non-rule project-history categories were omitted from the canonical S-files:

- Completed milestone phase ordering and “build this first/commit per phase” instructions: these
  describe a finished implementation sequence, not game behavior.
- Completed acceptance counts, historical simulator sample sizes, and milestone pass/fail gates:
  preserved in the archive and implementation log; current verification invariants remain in S02.
- Migration commands whose end state is already represented (placeholder faction replacement,
  Treasury→City Hall, trinkets→artifacts, old terrain strings→objects): keeping the command would
  instruct a new port to perform a migration it does not need.
- Abandoned drafting phrases and self-corrections (“no—…”) where a later sentence/document supplies
  the binding outcome: the outcome is mapped above.
- Historical rationale and implementation debate that does not constrain behavior: provenance
  remains in the unchanged archive and DECISIONS.
