# Content Manifest and Data Invariants

This file is the catalog map, not a duplicate catalog. In a port, transcribe these data sources or
export their values; do not mine old prose tables after a data source is listed here.

## Rules constants and shared types

- [`../../src/content/constants.ts`](../../src/content/constants.ts): board sizes, movement costs,
  aggro mode, growth, difficulty, caps, core economy defaults, combat formula coefficients.
- [`../../src/core/contentTypes.ts`](../../src/core/contentTypes.ts): stable content IDs.
- [`../../src/core/types.ts`](../../src/core/types.ts): serialized state/action/content shapes.
- [`../../src/core/combat/pipeline.ts`](../../src/core/combat/pipeline.ts): named stage order and
  cross-content combat hook execution.

Changing a pinned rule constant requires a numbered document, an S-file update, and a decision entry
when implementation interpretation is involved. Pure content tuning changes data and logs evidence;
it does not require rewriting mechanics prose unless behavior changes.

## Factions, units, and heroes

- [`../../src/content/factions.ts`](../../src/content/factions.ts): six faction identities, colors,
  passive IDs, magic pairs, start armies, class stats/weights.
- [`../../src/content/units.ts`](../../src/content/units.ts): complete combined unit registry,
  including initial factions and neutrals.
- [`../../src/content/unitsExpansion.ts`](../../src/content/unitsExpansion.ts): four-faction, tier-6,
  and sea-unit authored definitions merged by the registry.
- [`../../src/core/combat/abilities.ts`](../../src/core/combat/abilities.ts): passive ability registry.
- [`../../src/core/combat/activatedAbilities.ts`](../../src/core/combat/activatedAbilities.ts):
  choice-driven unit ability handlers and legal actions.
- [`../../src/content/heroes/index.ts`](../../src/content/heroes/index.ts): 36 heroes, classes,
  faction membership, specialties, starting skills/spells, and weights.
- [`../../src/content/heroStories.ts`](../../src/content/heroStories.ts): hero stories.
- [`../../src/core/heroBehaviors.ts`](../../src/core/heroBehaviors.ts): specialty behavior registry.

Every unit has unique ID/name, faction/culture, tier, HP, damage range, Attack, Defense, speed,
`hexSize`, growth, cost, nonempty flavor, and ability IDs. Every ability declares behavior at a named
pipeline or turn/movement hook. At least one flyer and no more than two human silhouettes per
playable faction remain visual/content checks, not engine tags.

Every hero has nonempty 50–90-word story, faction/class, starting state, and one behaviorally backed
specialty. Six heroes belong to each playable faction. A specialty with only prose and no rule hook
is invalid.

## Magic

- [`../../src/content/spells/index.ts`](../../src/content/spells/index.ts): merged 68-spell registry,
  base catalog, rarity assignment, source filters, scroll eligibility, and guild pools.
- [`../../src/content/spells/expansion.ts`](../../src/content/spells/expansion.ts): Wild and expanded
  authored spell definitions.
- [`../../src/content/bargains.ts`](../../src/content/bargains.ts): eight benefits and visible Debts.
- [`../../src/core/combat/spells.ts`](../../src/core/combat/spells.ts) and
  [`../../src/core/combat/expansionSpellEffects.ts`](../../src/core/combat/expansionSpellEffects.ts):
  generic combat spell handlers.
- [`../../src/core/game/adventureSpells.ts`](../../src/core/game/adventureSpells.ts): adventure and
  topology spell actions.

Every spell has ID, name, flavor, school, mana or X, behavioral kind, rarity, base face, + face, AI
target/timing hints, and any effect-operation tag. The + face changes behavior. Provenance rares and
Summon Skiff are excluded from ordinary guild/scroll pools as specified. The catalog count is 16 per
school plus four provenance rares: 68 total.

Every bargain has nonempty flavor, immediate benefit, exact Debt, handler, and visible altered terms
where applicable. Debt effects obey the law in [`S01_RATIONALE.md`](S01_RATIONALE.md).

## Skills, items, and artifacts

- [`../../src/content/skills.ts`](../../src/content/skills.ts): 21 skills × three ranks, class
  weights, descriptions, and handler values.
- [`../../src/content/items/index.ts`](../../src/content/items/index.ts): consumables, adventure
  items, scroll instances/rules, rarity, targeting, and descriptions.
- [`../../src/content/artifacts.ts`](../../src/content/artifacts.ts): slots, 80 ordinary artifacts,
  four Kit pieces, six trinkets, effect tags, values, and Burden removal text.
- [`../../src/core/artifacts.ts`](../../src/core/artifacts.ts): generic equipment, slot, Kit, pricing,
  and effect-query rules.

Every skill has three nonempty ranks and positive draft weight; every rank changes behavior or an
economy/tempo decision. Every item/artifact has nonempty flavor and mechanics description, legal
rarity/class, and a registered handler for each effect tag. Items with stored face, position, spend,
or other per-instance state use instances. Artifact count validation distinguishes 80 ordinary from
the ten special definitions. Burdens always include an inspectable removal condition.

## Castles, economy, terrain, omens, and flavor

- [`../../src/content/buildings.ts`](../../src/content/buildings.ts): common/faction buildings,
  costs, prerequisites, upgrade chains, generated functions, 36 dwelling names/flavors.
- [`../../src/content/marketplace.ts`](../../src/content/marketplace.ts): exchange values.
- [`../../src/content/terrain.ts`](../../src/content/terrain.ts): gameplay terrain, costs, nativity,
  resonance, templates, skins, decoration catalogs.
- [`../../src/content/battleTiles.ts`](../../src/content/battleTiles.ts): persistent battlefield tile
  definitions and hook IDs.
- [`../../src/content/omens.ts`](../../src/content/omens.ts): omen IDs, weights, flavor, effect tags.
- [`../../src/content/flavor.ts`](../../src/content/flavor.ts): reusable unit, spell, item, artifact,
  building, terrain, tile, and map-object strings.
- [`../../src/content/mapObjectRegistry.ts`](../../src/content/mapObjectRegistry.ts): complete
  adventure object-kind registry.

Buildings require ID/name/flavor/function/category, legal costs/prerequisites, and valid upgrade links.
Each faction has six ordered, named, flavored dwellings. Terrain definitions keep gameplay, skin,
and decoration fields separate. Battle tiles and omens must declare nonempty presentation plus
registered mechanics. Every reusable inspectable entry ships with flavor/story/label; flavor never
contains the only copy of a rule.

## Authored maps

- [`../../src/content/maps/borderMarches.ts`](../../src/content/maps/borderMarches.ts): 28×20
  two-player baseline.
- [`../../src/content/maps/crosstitch.ts`](../../src/content/maps/crosstitch.ts): 36×28, 2–4 player
  base and Tailor’s Kit objective variant.
- [`../../src/content/maps/tornSound.ts`](../../src/content/maps/tornSound.ts): 32×24 archipelago
  and complete water rules exercise.
- [`../../src/content/maps/manywhere.ts`](../../src/content/maps/manywhere.ts): 48×40, 1–3 player
  wander sandbox with registry coverage.
- [`../../src/content/maps/occupancyAuthoring.ts`](../../src/content/maps/occupancyAuthoring.ts):
  guardian/target materialization and authoring helpers.
- [`../MAPS.md`](../MAPS.md): current map-authoring guidance.

Maps are committed authored data: dimensions, normalized terrain tiles/skins, overlays, objects,
guardians, castles/starts, victory/defeat, routes, Cache links, and optional bans. Generated
decorations are not map data. Every map passes map lint. Manywhere additionally contains every
registered object type, its four neutral-town variants/slots, all faction dwellings, the full water
kit, puzzle locks, Cache sketch, Kit pieces, and required unique sites.

## Acquisition invariants

- Rarity is implicit in weights and source tables; the UI does not print Common/Uncommon/Rare.
- Commons may be dependable. No deterministic route to a specific uncommon or rare exists except a
  named provenance source.
- Artifacts are never bought in ordinary shops; Peddler may sell carried ones.
- Rare spells are places, never scroll litter.
- Puzzle-lock rewards and Kit guards are authored and static.
- A playthrough should encounter roughly 30–40% of each relevant pool.

## Validation contract

Catalog validators and tests fail on duplicate/missing IDs, invalid references, empty required prose,
illegal counts, missing behavior handlers, or malformed values. `npm run map-lint` validates authored
maps. `npm run spec-link-check` validates all relative links in this directory and runs in the test
preflight. A port must provide equivalent gates even if file layout changes.
