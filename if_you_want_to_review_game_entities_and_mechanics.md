# If You Want to Review Game Entities and Mechanics

You do not need to read the whole codebase. Start with the canonical specifications, then use the
content index to find the exact catalogs and behavior implementations relevant to the entities you
are reviewing.

## Documentation authority

Read [docs/spec/S00_OVERVIEW.md](docs/spec/S00_OVERVIEW.md) first. It defines the authority order:

1. `docs/spec/S00-S09` for current rules and invariants.
2. The executable content catalogs linked from `docs/spec/S09_CONTENT_INDEX.md` for current names,
   prose, costs, statistics, weights, and other authored values.
3. `docs/DECISIONS.md` for implementation rulings and reconciliations.
4. Code as the implementation of those sources.
5. `docs/archive/01-29` for historical provenance only.

## Canonical rules to read

- [docs/spec/S01_RATIONALE.md](docs/spec/S01_RATIONALE.md): general design constraints and content
  principles.
- [docs/spec/S02_ENGINE.md](docs/spec/S02_ENGINE.md): deterministic state, actions, replay, resolution
  pipeline, and validation boundaries.
- [docs/spec/S04_COMBAT.md](docs/spec/S04_COMBAT.md): combat sequence, damage, morale, retaliation,
  stack footprints, strategic army strength, sieges, and battle results.
- [docs/spec/S05_MAGIC.md](docs/spec/S05_MAGIC.md): spell schools, casting, counters, enchantments,
  spell versions, resonance, acquisition, Bargains, and Debts.
- [docs/spec/S06_HEROES.md](docs/spec/S06_HEROES.md): hero progression, secondary skills, armies,
  consumables, scrolls, and artifact equipment.
- [docs/spec/S07_ECONOMY.md](docs/spec/S07_ECONOMY.md): resources, recruitment, creature growth,
  buildings, difficulty, and AI economy constraints.
- [docs/spec/S08_CANON.md](docs/spec/S08_CANON.md): factions, cultures, setting, naming, and faction
  identities.
- [docs/spec/S09_CONTENT_INDEX.md](docs/spec/S09_CONTENT_INDEX.md): the authoritative directory of
  content catalogs, behavior registries, maps, and validation requirements.

## Exact entity catalogs

### Spells

- [src/content/spells/index.ts](src/content/spells/index.ts): merged spell registry, base catalog,
  rarity, source filters, scroll eligibility, and guild pools.
- [src/content/spells/expansion.ts](src/content/spells/expansion.ts): Wild and expanded authored spell
  definitions.
- [src/content/bargains.ts](src/content/bargains.ts): Bargain benefits and their visible Debts.

### Secondary skills

- [src/content/skills.ts](src/content/skills.ts): all secondary skills, their three ranks, class
  weights, descriptions, and handler values.

### Artifacts

- [src/content/artifacts.ts](src/content/artifacts.ts): artifact slots, classes, descriptions, values,
  effect tags, Tailor's Kit pieces, trinkets, and Burdens.

### Creatures and factions

- [src/content/units.ts](src/content/units.ts): the combined unit registry, initial factions, and
  neutral creatures.
- [src/content/unitsExpansion.ts](src/content/unitsExpansion.ts): expanded faction, tier-six, and sea
  creature definitions.
- [src/content/factions.ts](src/content/factions.ts): faction identities, passives, magic pairs,
  starting armies, class statistics, and weights.
- [src/content/heroes/index.ts](src/content/heroes/index.ts): hero rosters, classes, specialties,
  starting skills, starting spells, and weights.

## Behavior implementations

Consult these when a catalog entry does not fully establish how an effect behaves in play:

- [src/core/combat/pipeline.ts](src/core/combat/pipeline.ts): ordered combat-resolution stages.
- [src/core/combat/spells.ts](src/core/combat/spells.ts): generic combat spell handlers.
- [src/core/combat/expansionSpellEffects.ts](src/core/combat/expansionSpellEffects.ts): expanded combat
  spell effects.
- [src/core/game/adventureSpells.ts](src/core/game/adventureSpells.ts): adventure and topology spell
  actions.
- [src/core/combat/abilities.ts](src/core/combat/abilities.ts): passive creature ability registry.
- [src/core/combat/activatedAbilities.ts](src/core/combat/activatedAbilities.ts): activated creature
  abilities and their legal actions.
- [src/core/artifacts.ts](src/core/artifacts.ts): artifact equipment, slots, pricing, Tailor's Kit,
  and effect-query rules.
- [src/core/heroBehaviors.ts](src/core/heroBehaviors.ts): hero specialty behavior registry.
- [src/core/army.ts](src/core/army.ts): unit and army strategic-strength calculation.

## Supporting balance and implementation records

- [docs/39_GUARDIAN_STRENGTH.md](docs/39_GUARDIAN_STRENGTH.md): the strategic unit and army strength
  formula and its consumer audit.
- [docs/reports/GUARDIAN_STRENGTH_CALIBRATION.md](docs/reports/GUARDIAN_STRENGTH_CALIBRATION.md):
  committed creature-strength calibration evidence.
- [docs/spec/RECONCILIATION_BUGS.md](docs/spec/RECONCILIATION_BUGS.md): known discrepancies between the
  canonical specifications and implementation, with live status tracked in Beads.
- [docs/DECISIONS.md](docs/DECISIONS.md): append-only implementation decisions.
- [docs/IMPLEMENTATION_LOG.md](docs/IMPLEMENTATION_LOG.md): implementation and validation history.

## Historical sources

The archived numbered documents contain the original detailed content proposals, but they are not
the current authority. Use them only when historical intent is useful:

- [docs/archive/13_CONTENT_POLICY.md](docs/archive/13_CONTENT_POLICY.md)
- [docs/archive/14_UNITS.md](docs/archive/14_UNITS.md)
- [docs/archive/15_SPELLS_COMPLETE.md](docs/archive/15_SPELLS_COMPLETE.md)
- [docs/archive/16_SKILLS.md](docs/archive/16_SKILLS.md)
- [docs/archive/18_ARTIFACTS.md](docs/archive/18_ARTIFACTS.md)
- [docs/archive/29_DISCOVERY.md](docs/archive/29_DISCOVERY.md)

When an archived document conflicts with an S-file, executable catalog, or recorded decision, use
the current authoritative source.
