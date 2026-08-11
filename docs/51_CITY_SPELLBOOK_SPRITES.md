# 51 — Cities, spellbook, and complete collectible sprites

Status: city mechanics, presentation, editor compatibility, built-in-map migration, shared
combat/adventure spellbook, the complete 37-item collectible bitmap family, and the 36-sprite
Vanilla artifact batch implemented 2026-08-11; later artifact classes remain in production. This
document extends S02, S03, S05, S07, S08, and S09 and
supersedes the 3×2 castle ground-contact clauses in docs 31, 32, 37, and 50. It also supersedes the
spell-upgrade presentation wording in docs 34, 44, and 46 and the player-facing settlement word
“Castle” wherever it remains in an earlier live work order. Existing internal `Castle` and `plus`
identifiers may remain compatibility names; they are not player-facing terminology.

## 1. City contract

**City** is the canonical player-facing word for a faction settlement, whether owned or neutral.
Use City, neutral city, city screen, city garrison, city entrance, and city capture in interface
copy. “Castle” remains permitted only in archived quotations, implementation identifiers, migration
notes, and a specific building or siege feature whose proper name requires it.

Every city has exactly a **5×2 ground-contact footprint**. Its anchor is the top-left cell and its
only entrance is the centered bottom cell at offset **`(2,1)`**. The other nine cells are
impassable. No map, preset, faction, neutral variant, or editor record may override that footprint
or entrance. The sprite may rise north above the contact but may not imply a second gate. The drawn
gate, hero arrival point, capture interaction, services, garrison battle, fog distance, flag, lint,
and pathfinding all use the same centered entrance.

The 5×2 migration re-anchors every built-in city around its prior world-space entrance. Wider-contact
terrain, object, guard, road, and start-clearance collisions are explicitly re-authored and linted.
The runtime, editor, map adapter, renderer hit target, fog, and pathfinder share one geometry
constant. Legacy 3×2 local documents receive an explicit migration action keyed by their former
catalog hash; they are never silently interpreted using the new geometry. All six canonical city
sprites are native 160×160 assets rather than stretched 96-pixel art.

### Neutral capture and deterministic default garrison

A neutral city always has a faction and is captured only through its centered entrance. If its
portable/authored record **omits** `garrison`, runtime conversion creates exactly three stacks: the
city faction’s tier-1, tier-2, and tier-3 city units, in ascending tier order, each with count
`3 × that unit's canonical weekly growth`. This is three weeks of each tier’s base catalog growth,
not the current game week and not three weeks of accumulated recruit availability.

The derivation reads the faction roster and unit-growth catalog once during deterministic setup. It
does not apply difficulty, omens, buildings, artifacts, owner bonuses, elapsed time, or rounding,
and the resulting three positive integer stacks become ordinary save/replay state. With the current
catalog the defaults are:

| Faction | Tier 1 | Tier 2 | Tier 3 |
|---|---:|---:|---:|
| Hearthguard | 51 Yeoman | 27 Longbowman | 18 Bannerman |
| Wound-Wrights | 36 Tin Soldier | 27 Hobby Knight | 18 Marionette |
| The Unfinished | 54 Candle-Wisps | 27 Couriers | 18 Sentries |
| The Vespiary | 60 Larval Tide | 30 Paper-Wasp Lancers | 21 Silk-Spinners |
| The Hagwood | 48 Crow Chorus | 27 Fence-Post Familiars | 18 Besom Riders |
| Wildergrass Clans | 45 Outriders | 27 Drum-Callers | 21 Ashmane Wolves |

The override boundary is presence-based and deliberately explicit:

- omitted `garrison` means derive the three-stack default above;
- present `garrison: []` means an intentionally empty, free-to-capture neutral city;
- present nonempty `garrison` means use exactly the authored legal one-to-seven stacks and counts;
- `null`, zero/negative counts, random-tier placeholders, and a partially specified “add to default”
  shape are invalid for a city garrison.

An authored override replaces the entire default; it never merges with it. Before capture a neutral
city does not grow, build, recruit, or alter the initialized garrison. An empty override captures
without combat; otherwise entering begins the ordinary garrison battle. Victory changes ownership
through the normal outcome handler and clears the defeated garrison. Diplomacy never bypasses it.

## 2. Six city identities

Faction IDs and names are metadata, not adequate image prompts. The executable visual subjects are
[`../assets/adventureSpriteInventory.ts`](../assets/adventureSpriteInventory.ts); every production
job must include the relevant physical description plus the shared style clause rather than sending
an opaque ID or faction name to a generator.

- **Hearthguard:** broad cream-limestone civic gatehouse, warm red tile, sturdy square towers,
  wrought iron, gold heraldic trim, and one generous central arch. It reads welcoming and defended,
  not cathedral-like or imperial.
- **Wound-Wrights:** cheerful painted-timber workshop city with rounded toy-like towers, lacquered
  nursery-primary panels, brass hinges, porcelain insets, repair seams, and a central workshop door.
  It is complete and maintained, not a toy shop sign or abandoned factory.
- **The Unfinished:** carefully tended bone-white memorial city with funeral-linen awnings,
  candlelit niches, grave-gold fittings, and hollow processional arches. It is gentle, complete, and
  inhabited—never ruined, scaffolded, green-black, or villainous.
- **The Vespiary:** low amber-resin hive city with black chitin buttresses, layered paper-nest roofs,
  honeycomb openings, papery asymmetry, and one broad resin arch. It is civic architecture at
  insect scale, not a single wasp or a naturalistic beehive icon.
- **The Hagwood:** grown settlement of crooked white-birch halls, wicker galleries, bone-fence
  finials, crow-feather vanes, berry-red cloth knots, and a central red door under a bent living
  bough. It has no conventional masonry keep or regular towers.
- **Wildergrass Clans:** long low steppe city of ochre hide halls, ashwood palisades, horn roof
  ridges, ash-grey felt, blood-red weaving, herd totems, and a central drum-framed gate. It reads as
  a durable moving culture, not generic tents behind a stone castle.

The six selected 160x160 RGBA city canvases live under `public/assets/cities/`. Their compatibility
manifest IDs retain the internal `castle:` prefix, but each entry declares a 5x2 contact, entrance
`(2,1)`, and anchor `{x:0,y:96}`. Exact built-in requests, retained chroma sources, selected hashes,
alpha statistics, and visual review are recorded in `assets/jobs/city-sprites-built-in.json` and
`assets/provenance/city-sprite-generation.json`; `scripts/buildCitySprites.py` reproduces the final
native canvases after the documented local chroma-removal step.

Earlier 96×128 City requests remain historical provenance with explicit `superseded_by` markers.
They neither satisfy current coverage nor inherit the 160×160 contract; the job gate requires the
built-in City job to be the sole active production claim for all six Cities and four visual aliases.

Neutral cities retain their authored faction’s material language and silhouette without an owner
color. Ownership is always the separate runtime pennant overlay. No sprite bakes a player flag.

## 3. Original school-grouped spellbook

The supplied Heroes III spellbook reference contributes only high-level information hierarchy: an
open book, a scan-friendly icon grid, school navigation, compact costs, and details after selection.
No artwork, ornament, typography, measurements, cell composition, or exact tab design is copied.
This game uses its own bright stitched-storybook parchment, school palettes, icons, and control
grammar.

On wide screens the combat and adventure spellbooks use an original open two-page parchment
composition; on narrow screens the same reading order collapses without shrinking icons or text.
Both share one responsive structure:

1. a shallow header shows the hero, current/max mana, spell power, context, and Close;
2. four real button-tabs in canonical order Rite, Craft, Grave, Wild show school color, name, learned
   count, selected state, keyboard focus, and accessible tab relationships;
3. the selected school shows learned spells in a large-icon grid, ordered by catalog level/rank if
   present and then catalog/name order; sections remain visibly grouped rather than flattening all
   schools into one undifferentiated list;
4. every cell keeps the distinct 32×32 spell icon, full spell name, and mana cost (or clearly named
   X cost) visible without hover; disabled state preserves all three and gives its exact reason;
5. clicking or keyboard-activating a cell selects it and opens an adjacent detail page on wide
   screens or a bounded detail sheet on narrow screens; selection alone never casts;
6. details show school, kind, mana and adventure-movement cost, flavor, target summary, scaled
   current values, standard rules, upgraded rules, why the upgraded rules currently apply, legal
   targets/disabled reason, and the explicit Cast action; Debts remain a separate visible section;
7. bottom controls provide context-appropriate Cast, Back/list, and Close actions. They are ordinary
   semantic buttons, remain visible with keyboard and at 390 px, and never depend on icon color.

School color and tabs accelerate navigation but never carry the only school label. Icon, name, mana,
selected state, upgrade state, disabled reason, focus, and Cast are independently accessible. A
screen reader can traverse tabs, spell cells, and details without encountering a grid of unnamed
images. The detail surface preserves inspection and never hides the target consequences behind a
tooltip.

### Spell-upgrade language and indication

Player-facing copy uses **standard** and **upgraded**, never “base face,” “+ face,” “current face,”
or “compare faces.” A permanently learned upgrade shows a small gold upward stitch/chevron plus the
visible text **Upgraded**. Temporary resonance or another effect that makes the upgraded rules active
shows **Upgraded here** and the reason (for example, “Rite resonance”), without falsely marking the
upgrade as learned. The detail comparison headings are **Standard** and **Upgraded**; the active
heading has a clear text-and-shape marker in addition to color. A compact `+` may remain beside a
spell name only as a secondary shorthand when the word Upgraded is present in the same card or its
accessible name.

Internal catalog fields such as `base`, `plus`, `upgradedSpells`, and item-instance `plus` may remain
serialized compatibility names. They must map to the standard/upgraded copy at the presentation
boundary. Physical masks, mirrored surfaces, and the artifact named Spare Face may still use the
ordinary noun “face”; the prohibition is specifically spell-version terminology.

## 4. Complete collectible-sprite inventory

Every one of the **90 artifact definitions** and **37 item definitions** owns one distinct native
32×32 transparent sprite subject. Specific scroll definitions are distinct items: each keeps a
recognizable parchment silhouette but uses a different cord, palette, and physical clasp derived
from its spell metaphor. The generic `spellScroll` remains its own neutral blank-seal sprite.
The artifact inventory is 36 Vanilla, 22 Charm, 18 Relic, 4 Burden, 4 Kit, and 6 migrated Trinket;
the item inventory is 25 combat, 11 adventure, and 1 automatic definition.

The target is therefore **127 catalog-keyed collectible sprites**, with unique paths and no duplicate
bitmap content. The same canonical sprite is reused in pickups/rewards, map editor palettes,
inventory, equipment/backpack, choices, markets, inspection, and result surfaces; layout may enlarge
it only by an exact integer with pixelated rendering. Names, class/use, mechanics, quantities,
stored-spell state, upgrade state, restrictions, and accessible controls remain semantic text rather
than baked pixels.

[`../assets/adventureSpriteInventory.ts`](../assets/adventureSpriteInventory.ts) is exhaustive over
`ArtifactId` and `ItemId` and gives each ID a literal physical subject. It also owns six city
subjects and both pickup and mine subjects for all four resources. The inventory is a generation
input only: a record does not count as sprite coverage until a native PNG, manifest entry, accepted
selection/provenance, and required surface integration all pass their gates.
`npm run assets-check` validates the inventory keys against the live faction, item, and artifact
catalogs and reports installed artifact/item counts separately from this planned inventory.

Current audited coverage at contract time is:

| Family | Catalog target | Installed native sprite | Gap |
|---|---:|---:|---:|
| Artifacts | 90 | 36 Vanilla | 54 |
| Items/consumables | 37 | 37 | 0 |
| Faction city designs conforming to 5×2 | 6 | 6 | 0 |
| Resource pickups | 4 | 4 | 0 |
| Resource mines/sites | 4 | 4 | 0 |

All 37 item sprites are now installed as a distinct native family. The earlier generic Spell Scroll,
Overseer’s Charter, Waybread, and Trade Goods images were explicitly style-reviewed and regenerated
because their earlier camera/light contract did not match this work order. Existing 3×2 city sprites
remain useful historical visual provenance; the six new 5×2 designs are the installed city family.

The first artifact batch installs all 36 catalog definitions whose class is `vanilla`. Each selected
source came from a separate built-in image-generation call and bakes through the same generic
collectible pipeline as items. The active incremental job is
`assets/jobs/artifact-sprites-built-in.json`, provenance is
`assets/provenance/artifact-sprite-generation.json`, retained keyed sources are under
`assets/sources/artifacts/`, and native hard-alpha finals are under `public/assets/artifacts/`.
The rejected first Skirmisher's Blade source remains in the `discarded/` source folder with its
prompt, output path, hashes, and semantic rejection reason; no other Vanilla source required a
retry. Later Charm, Relic, Burden, Kit, and Trinket batches append without replacing this batch.

## 5. Resource sites and shared art law

All adventure-map cities, mines, resource pickups, items, and artifacts share one bright cartoony
storybook pixel-art family on true transparency. The camera is high-oblique and non-isometric;
objects expose upper surfaces and screen-left/north-west shadowed planes consistently. The key light
comes from **screen lower-right / map south-east**, and cast/contact shadow travels toward **screen
upper-left / map north-west**. No generated subject may bake terrain, a rectangular plate, scenery,
text, labels, rarity frames, school tabs, ownership color, or a player flag.

Resources must be recognizable by physical material, not color alone:

- Gold is a small practical pile of dull coins; its mine is a timber-braced adit in pale quarried
  rock with a hand winch and restrained gold-bearing chips.
- Timber is a stack of round-ended cut logs; its production site is an open logging yard, shingled
  saw shelter, sawbench, and blocking log pile.
- Iron is crossed charcoal billets with cool edge glints; its mine is a dark headframe, pulley,
  short rails, and rough iron-bearing stone.
- Essence is a dark stitched knot holding three translucent blue-violet mineral shards. Its mine is
  explicitly the **stitchwell**: an old stone extraction basin over a hairline world-seam, crooked
  copper pump, glass collection flask, and restrained threadlike mineral in the water. It reads as a
  rural utility first and impossible geology second—never a generic glowing crystal cave, wizard
  fountain, aura, or particle effect.

Mines retain their canonical 2×1 contact and bottom-left entrance. Their left cell visibly admits a
hero; machinery, basin, rock, shelter, or stock physically occupies the right cell. City widening
does not change mine mechanics.

## 6. Acceptance boundary for later implementation

This contract is complete when later implementation can prove all of the following from catalogs,
manifests, validation, and browser evidence:

- every city uses exact 5×2 occupancy and `(2,1)` entrance in setup, saves, pathfinding, fog, capture,
  editor, lint, renderer hit targets, and every built-in map;
- omitted, empty, and explicit neutral-city garrisons exercise the three distinct deterministic
  boundaries above for all six factions;
- the two spellbooks group by school, show icon/name/mana before selection, expose full click/keyboard
  details, distinguish learned from temporarily active upgrades, and contain no spell-version
  “face” wording;
- the asset inventory matches all 90 artifact IDs, 37 item IDs, six faction IDs, and four resource
  IDs with no missing/extra/blank physical descriptions;
- all 127 collectible sprites and six replacement city designs have unique native PNGs, manifest
  paths, accepted provenance, correct dimensions/alpha, semantic fallbacks while incomplete, and
  representative wide/narrow composition evidence;
- the four mines and pickups remain materially distinct, and the stitchwell is recognizable without
  a label or color-only cue;
- no supplied reference artwork or generated imitation of it ships in the repository.

The city gates above landed on 2026-08-11. Remaining spellbook and collectible gates continue to
track their own implementation gaps. They do not weaken this specification or authorize silent
stretching, shared placeholder art, or
default-garrison inference in UI code.
