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
- [`../../src/core/army.ts`](../../src/core/army.ts): centralized, pure unit/army strategic-strength
  derivation from the unit catalog and stack counts.
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

Every legal unit must produce a finite positive strategic strength. Army strength is additive and
strictly linear in positive count. Deterministic calibration evidence is committed in
[`../reports/GUARDIAN_STRENGTH_CALIBRATION.md`](../reports/GUARDIAN_STRENGTH_CALIBRATION.md).

Every hero has nonempty 50–90-word story, faction/class, starting state, and one behaviorally backed
specialty. Six heroes belong to each playable faction. A specialty with only prose and no rule hook
is invalid.

## Magic

- [`../../src/content/spells/index.ts`](../../src/content/spells/index.ts): merged 68-spell registry,
  base catalog, rarity assignment, source filters, scroll eligibility, and guild pools.
- [`../../src/content/spells/expansion.ts`](../../src/content/spells/expansion.ts): Wild and expanded
  authored spell definitions.
- [`../../src/content/spells/rulePresentation.ts`](../../src/content/spells/rulePresentation.ts):
  canonical structured Standard/Upgraded rules and complete presentation records for all 68 spells.
- [`../../src/content/spellLexicon.ts`](../../src/content/spellLexicon.ts): typed reusable
  player-mechanic definitions, structured term tokens, literal future-art subjects, explicit
  ordinary-term dispositions, and all-68 runtime/term coverage.
- [`../../src/content/bargains.ts`](../../src/content/bargains.ts): eight benefits and visible Debts.
- [`../../src/core/combat/spells.ts`](../../src/core/combat/spells.ts) and
  [`../../src/core/combat/expansionSpellEffects.ts`](../../src/core/combat/expansionSpellEffects.ts):
  generic combat spell handlers.
- [`../../src/core/game/adventureSpells.ts`](../../src/core/game/adventureSpells.ts): adventure and
  topology spell actions.

Every spell has ID, name, flavor, school, mana or X, behavioral kind, rarity, standard rules,
upgraded rules, AI target/timing hints, and any effect-operation tag. Upgrades are designed to change
behavior, but descriptions state current resolver truth: Standard of Dawn, Unmake, Standing Mirror,
Shed Skin, and Hedgerow March currently have no additional Upgraded gameplay behavior. Internal `base`/`plus` field names remain a
compatibility detail and are not player-facing copy. Provenance rares and Summon Skiff are excluded
from ordinary guild/scroll pools as specified. The catalog count is 16 per school plus four
provenance rares: 68 total.

Every reusable spell term has a stable ID, player name, concise rule, literal visual subject,
aliases, and search tokens. Every spell is mapped to its actual combat/adventure resolver domain and
has at least one reusable or explicitly ordinary term disposition; every disposition is used. Rule
presentation tokens preserve term IDs for semantic UI and have a deterministic plain-text
projection. The lexicon does not change resolver behavior. For all 68 spells, structured authored
rules project exactly to the catalog's Standard/Upgraded strings; see
[work order 55](../55_RITE_CRAFT_SPELL_RULES.md) and
[work order 56](../56_GRAVE_WILD_SPELL_RULES.md). Its 30 literal
subjects have exact distinct native shared-icon coverage
derived through the manifest/worklist, immutable generation batches, retained selections and
hash-audited provenance; the renderer has no fallback path. See [work order 53](../53_SPELL_EFFECT_LEXICON.md)
and [work order 54](../54_SPELL_EFFECT_ICONS.md).

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
- [`../../assets/adventureSpriteInventory.ts`](../../assets/adventureSpriteInventory.ts): exhaustive
  literal physical subjects for all artifact/item sprites, six faction cities, and four resource
  pickups/mines; inventory presence does not claim a generated or installed bitmap.

Every skill has three nonempty ranks and positive draft weight; every rank changes behavior or an
economy/tempo decision. Every item/artifact has nonempty flavor and mechanics description, legal
rarity/class, and a registered handler for each effect tag. Items with stored spell version, position, spend,
or other per-instance state use instances. Artifact count validation distinguishes 80 ordinary from
the ten special definitions. Burdens always include an inspectable removal condition.

Every canonical spell and secondary-skill ID also derives exactly one 32×32 transparent PixelLab
presentation from [`../../assets/iconWorklist.ts`](../../assets/iconWorklist.ts), mapped through
[`../../assets/iconManifest.ts`](../../assets/iconManifest.ts). The bitmap is presentation only:
names, schools, mana, ranks, and complete mechanics remain catalog and semantic-UI text. Asset,
generation-job, accepted-provenance, uniqueness, dimension, alpha, and prompt-drift gates are part
of the validation contract; see [work order 46](../46_SPELL_SKILL_ICONS.md).

There are exactly 90 artifact definitions and 37 item definitions. Each owns one distinct 32×32
transparent sprite subject and ultimately one unique native PNG/manifest path; specific scroll IDs
remain visually distinct even though they share a parchment family. Catalog-keyed names, class/use,
rules, quantities, stored spell/version state, and accessibility remain semantic text. Asset coverage
is zero artifacts and four items at the work-order-51 baseline; literal subject inventory is not
misreported as installed coverage. City/resource/item/artifact prompts include the physical subject
from the inventory plus its shared bright cartoony transparent south-east-light style clause, never
only an opaque ID or name. See [work order 51](../51_CITY_SPELLBOOK_SPRITES.md).

The one-screen hero dashboard derives its presentation inventory from these same catalogs rather
than a hand-maintained JSX list. Audited reusable coverage is 21/21 secondary-skill icons, 90/90
artifact sprites, 37/37 item sprites, 50/50 battle-unit portraits, and 4/4 resource-pickup icons.
The 18 guardian portraits are a map subset and do not replace the complete battle-unit family. The
48 adventure hero images are six faction/class locomotion sets × eight directions and count as
0/36 distinct hero portraits.

The dashboard production catalog now installs exactly 79 new assets: one distinct 96×96 portrait for
each of the 36 hero definitions; one 32×32 icon for each of their 36 distinct specialty IDs; 32×32
Attack, Defense, and Knowledge icons; and 32×32 Experience, Movement, Mana, and Luck icons. The
installed 32×32 `spell-power` lexicon icon remains the fourth primary-stat image and is reused rather
than duplicated. The catalog-derived dashboard worklist/manifest, eight immutable built-in jobs,
selection/provenance ledgers, deterministic build/promote, shared no-fallback renderers, and checks
gate missing/extra IDs, unique paths/content, exact dimensions, hard alpha, prompt/source/output
hashes, retained rejected attempts, and exact consumer coverage. Source, native, and exact-nearest
3× contact sheets are retained as review evidence. This is installed asset infrastructure, not a
claim that the one-screen dashboard UI is integrated; see [work order 59](../59_HERO_DASHBOARD.md).

## Cities, economy, terrain, omens, and flavor

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
- [`../../src/content/spellLexicon.ts`](../../src/content/spellLexicon.ts): stable reusable spell
  terms, authoritative player rules, aliases, deterministic longest-match tokenization, and the
  all-spell mechanics coverage table.
- [`../../src/content/spells/rulePresentation.ts`](../../src/content/spells/rulePresentation.ts):
  complete structured Standard/Upgraded rule presentations for all 68 spells.

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
- [`../../src/content/maps/grandMuster.ts`](../../src/content/maps/grandMuster.ts): 56×44 fixed
  showcase sandbox with six allied faction cities/full-roster heroes, six neutral sparring fights,
  scattered resources and structures, and a distant Dormant opponent.
- [`../../src/content/maps/crookedCrown.ts`](../../src/content/maps/crookedCrown.ts): 72×72,
  four-player dense labyrinth conquest with twelve shaped chambers, looped corridors, four distinct
  starts, 109 interactive objects, 20 calibrated guardians, 12 landmarks, and map-specific topology
  and density metrics.
- [`../../src/content/maps/sixfoldTrial.ts`](../../src/content/maps/sixfoldTrial.ts): 54×42,
  six-player advanced-combat proving ground with executable setup authority, six distinct default
  factions, 36 chests, 18 ordinary artifact rewards, 18 calibrated guardians, and 258 road tiles.
- [`../../src/content/maps/occupancyAuthoring.ts`](../../src/content/maps/occupancyAuthoring.ts):
  guardian/target materialization and authoring helpers.
- [`../MAPS.md`](../MAPS.md): current map-authoring guidance.
- [Work order 50](../50_MAP_EDITOR.md): the versioned portable editor-map schema, authoring/runtime
  boundary, local revision repository, import/export rules, validation, and built-in promotion path.
- [`../../src/content/maps/authored/index.ts`](../../src/content/maps/authored/index.ts): generated
  portable built-in registry; `npm run promote-map -- <export.vam-map.json>` is its only normal
  authoring path and the registered JSON bytes feed setup, presentation, hashing, and map lint.

Maps are committed authored data: dimensions, normalized terrain tiles/skins, overlays, objects,
guardians, cities/starts, victory/defeat, routes, Cache links, and optional bans. Generated
decorations are not map data. Every map passes map lint. Manywhere additionally contains every
registered object type, its four neutral-town variants/slots, all faction dwellings, the full water
kit, puzzle locks, Cache sketch, Kit pieces, and required unique sites.

The Crooked Crown additionally pins its 72×72 dimensions, four starts, two regional routes and two
opening pickups per start, reward guardian coverage, named gate guardians, object/decor/road density,
and maximum open-square size. Its guardian counts are derived at authoring time from the centralized
`unitStrength` rating in `src/core/army.ts`.

The Sixfold Trial additionally pins six configurable player slots, distinct default factions,
complete developed cities, level/stat/skill packages, two-week faction armies derived from unit
growth, complete configured-school spellbooks derived from `SCHOOL_SPELLS`, start exits, chest and
ordinary-artifact totals, and at least four guardians in each of four named strength bands.

Local maps, built-in clones, and newly promoted built-ins share the work-order-50 portable JSON
contract. The document owns metadata, rectangular terrain/skin tiles, overlays, one-to-six player
slots, independently owned/factioned cities and starting heroes, objects, guardian stacks and
counts (including authoring-only random tier 1–6 creature placeholders), separate rewards, and
victory/defeat. It references these catalogs by stable IDs and cannot
define executable behavior or custom stats. One pure codec/validator supplies import, export,
editor diagnostics, deterministic runtime conversion, promotion, and map lint. Every city normalizes
to exact 5×2 contact and entrance `(2,1)`. Neutral-city garrison presence is preserved: omission
derives three times base growth for faction tiers 1–3, an explicit empty array remains empty, and a
nonempty legal army wholly replaces the default.

The editor palette keeps the canonical nine-section order but uses compact accessible icon stamps.
Six city faction sprites are direct choices; structures use their map sprites, guardians use all
50 battle portraits, and artifact/item/resource/spell/overlay choices use native art or declared
compact emblems. New guardian counts use tier bases 48/30/20/12/6/5 with stable ±20% variation;
catalog-average `unitStrength × count` increases across tiers.

Editor drafts and immutable revisions use the same injected browser-storage boundary as game saves
but a distinct versioned namespace and envelope. The portable `.vam-map.json` contains no local
timestamps or editor UI state. Promotion checks the exported JSON unchanged into the authored-map
directory and registers it in the built-in manifest; no TypeScript map reconstruction is allowed.

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

Portable-map validation also rejects unsupported schema versions, unsafe/non-JSON values, malformed
tile matrices, non-finite/out-of-bounds coordinates, invalid slots or independent owner/faction
references, empty or oversized hero armies, nonpositive guardian counts, missing reward contents,
broken links, and any ordinary S02/S03 lint failure. Structurally valid drafts may remain local or be
exported with diagnostics; test play, campaign start, and built-in promotion require zero errors.

Semantic-presentation tests additionally require every structured term token to resolve to one
lexicon definition and one manifest-backed native effect icon. The shared UI renderer has no icon or
definition fallback; legacy catalog text uses deterministic longest-match aliases and word
boundaries so ordinary-language substrings remain ordinary. See
[work order 57](../57_INTERACTIVE_SPELL_GLOSSARY.md).
