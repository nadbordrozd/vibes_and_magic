# 50 — In-game map editor and portable authored maps

Status: implemented and browser-accepted 2026-08-10. This work
order defines one JSON authoring format shared by the in-game editor, local maps, built-in-map
clones, test play, and promoted built-in maps. It does not make editor UI state part of game state
or permit maps to define new rules. Work order 51 supersedes its player-facing Castle terminology,
3×2 settlement default, and neutral-garrison omission semantics; the serialized `castles` field may
remain a version-1 compatibility name.

## Authority boundary

The editor is an authoring client. It may create, select, paint, move, copy, and delete authoring
records, maintain undo/redo and selection state, and show diagnostics. It must not calculate a
second version of movement, occupancy, ownership, rewards, combat, or setup legality. Catalog IDs,
object behavior, footprints, entrances, faction defaults, army limits, and all other rules remain
owned by the canonical catalogs and headless core described by S00–S09.

The portable document owns initial authored facts: metadata, dimensions, tiles, overlays, player
slots, starting cities and heroes, objects, guardians, rewards, and objectives. The deterministic
map codec applies catalog defaults and converts those facts into a fresh runtime map/setup. Runtime
fields such as `collected`, `visitedBy`, current movement, growth history, and battle state are not
authoring fields. A test play or campaign receives a converted snapshot and thereafter changes only
through ordinary core actions; continuing to edit the source document cannot mutate that game.

Version 1 may reference only installed canonical terrain, prop, object, faction, hero, creature,
artifact, item, spell, building, and objective behavior. It cannot carry scripts, executable
expressions, custom unit statistics, custom effects, or editor-only rule tags. Unsupported ideas are
validation errors rather than inert JSON that a renderer quietly interprets.

## Portable JSON document

The exported file suffix is `.vam-map.json`. Its top-level shape is:

```json
{
  "documentType": "vibes-and-magic-map",
  "schemaVersion": 1,
  "id": "the-ash-road",
  "revision": 1,
  "metadata": {
    "name": "The Ash Road",
    "description": "A short two-player crossing.",
    "author": "Map maker",
    "style": "Two-player conquest campaign"
  },
  "compatibility": { "catalogHash": "00000000" },
  "dimensions": { "width": 36, "height": 28 },
  "tiles": [[{ "terrain": "meadow" }]],
  "overlays": { "roads": [], "seams": [] },
  "players": [],
  "castles": [],
  "heroes": [],
  "objects": [],
  "guardians": [],
  "rewards": [],
  "victory": { "type": "conquest", "flavor": "...", "mechanics": "..." },
  "defeat": null,
  "source": null
}
```

The example abbreviates the rectangular `tiles` matrix and discriminated entity records; it is not
a second schema. The checked implementation must expose a single TypeScript schema/validator and
derive the importer, exporter, defaults, and tests from it.

- `id` is a stable lowercase slug suitable for a future built-in `MapId`. `revision` is a positive
  integer. Saving a changed playable snapshot creates the next revision; it never changes bytes
  behind a revision already referenced by a campaign.
- `metadata.name` and the visible objective texts are required before test play. A new in-game map
  receives usable description, author, style, conquest flavor, and conquest-rule defaults. These
  advanced map details are collapsed by default and remain editable through **Edit map details**.
  Description, author, and style are portable presentation metadata. Local timestamps, selection, zoom, camera,
  tool settings, and undo history live only in a local envelope and are never exported.
- `compatibility.catalogHash` identifies the canonical catalogs against which references were
  authored. A mismatch is a visible compatibility warning, while missing or invalid referenced IDs
  are errors. The map's own bytes are hashed separately after canonical normalization.
- `tiles` is exactly `height` rows of exactly `width` `{terrain, skin?}` cells. Generated
  decorations are absent. Roads and seams are unique in-bounds coordinate sets.
- All entity IDs are unique across cities (`castles` in schema version 1), heroes, objects, guardians, and rewards. Coordinates
  are integer top-left anchors. Optional footprints and entrances use the ordinary canonical
  semantics and may be authored only where the referenced kind permits an override.
- `source` is either null or provenance such as `{ "kind": "builtIn", "mapId":
  "border-marches" }`. It has no runtime effect.

Serialization is canonical after validation: defaulted records are explicit, object keys use the
codec's stable order, coordinate sets and entity lists use stable coordinate/ID ordering, and no
`undefined`, non-finite number, function, or platform object is permitted. Import followed by export
therefore preserves the normalized document and its map hash.

## Blank maps, cloning, and revisions

The main menu has a first-class **Map Editor** action. Its landing surface offers **New map**,
**Edit local map**, **Clone built-in map**, and **Import map**.

New map asks for ID, name, dimensions, and a fill terrain/skin, then creates a saveable draft with a
complete rectangular tile matrix and no entities. Drafts may be incomplete or currently unplayable;
the editor preserves them and reports diagnostics instead of discarding work.

Built-in maps are read-only. **Clone** runs the same built-in-to-portable adapter used by validation,
materializes all authored terrain, overlays, start slots, cities, heroes, structures, guardians,
rewards, and objectives, assigns a new local ID at revision 1, and records `source`. Special setup
data must become ordinary portable records or declared catalog-derived defaults during cloning; no
city, hero, army, guardian, or reward may require manual reconstruction afterward.

Editing a local map opens its newest draft. Test play and starting a campaign first freeze a
normalized playable revision. Later edits fork the next revision, leaving frozen revisions
available while a local campaign references them. Deleting a referenced revision requires an
explicit warning; existing campaign saves are never silently rebound to a newer draft.

## Player slots and starting entities

`players` declares one to six stable slots from `p1` through `p6`, without gaps. Each record stores
its default controller (`human`, `ai`, or `dormant`), default faction, and optional display name.
The player ID selects the canonical flag color; arbitrary RGB colors are not map rules.

Cities and heroes store ownership and faction independently:

- a city record has `owner: PlayerId | "neutral"` and a separate `faction: FactionId`;
- a starting hero has `owner: PlayerId` and a separate `faction: FactionId`;
- a hero definition, when selected, must be a legal definition for the hero's faction, but the
  owner slot's default faction need not match either the hero or city faction;
- changing an owner changes the flag only, and changing a faction changes the roster/identity only;
  neither control silently rewrites the other field.

A newly placed owned city uses the canonical basic-city defaults: its exact 5×2 footprint and
centered entrance `(2,1)`, starting buildings, empty garrison, recruit availability, guild derivation, and other
initial state come from the core/catalog rather than duplicated editor numbers. Advanced inspectors
may author legal building, ban, garrison, and variant fields supported by the portable schema.

A newly placed neutral city also selects a faction. If its `garrison` field is omitted, conversion
derives exactly the faction's tier-1, tier-2, and tier-3 units at three times their canonical weekly
growth. A present empty array explicitly authors a free capture; a present nonempty legal army
wholly replaces the default. The editor must preserve this presence distinction and reject `null`,
nonpositive counts, random-tier placeholders, partial defaults, and additive overrides. It may offer
**Use three-week default**, **Empty**, and **Custom army** as mutually exclusive authoring controls;
it must not materialize the omitted default merely by opening an inspector.

A newly placed hero selects owner color and faction separately, chooses a faction-valid hero
definition, and receives one small nonempty default company derived from that faction's canonical
`hireArmy`. The resulting army is written into the document. Hero armies contain at most seven
slots; every stack references a canonical creature and has a positive integer count. An inspector
may change a legal army, but no placed hero may be saved as a playable start with an empty army.

Setup conversion creates exactly the declared slots and authored starting entities. It does not
infer ownership from nearby cities, sprite color, array position, or faction. A playable map needs
at least one active slot and every non-dormant active slot needs at least one owned starting hero or
city; objective-specific lint may impose stronger requirements.

## Objects, guardians, and rewards

Structures and other objects reference the canonical map-object registry and expose only fields
allowed by that kind. The authoring schema stores initial facts and the codec supplies ordinary
untouched runtime defaults. Paired/topological objects, Cache marks, variants, stock definitions,
and other catalog-supported parameters remain explicit and linted.

Guardians are independent records, never embedded armies on a reward. A guardian contains one to
seven stacks. A stack either selects a canonical creature with a positive integer `count`, or stores
an authoring-only `{ "randomTier": 1..6, "count": positiveInteger }` placeholder. Ordinary
placement derives a tier count from the decreasing base sequence 48, 30, 20, 12, 6, 5 and applies
a stable integer variation from 80% through 120%; the inspector always permits direct count editing.
The tier bases are tested against the centralized strength rating so catalog-average encounter
power increases at every tier even as troop count falls. Battlefield constructs remain explicit
static singletons. `static`, splitting, and an
optional `protects` target are explicit. The codec initializes growth provenance from the authored
counts and materializes the reciprocal `guardedBy` link. Deleting or relinking either end updates the
authoring relationship atomically.

Random-tier placeholders are not fake creature IDs. During conversion, the explicit campaign seed,
stable guardian ID, stack index, and tier choose one non-battlefield canonical creature of that
tier. The same inputs reproduce the same creature for save/replay; a fresh play seed may choose a
different creature without changing the portable document.

Rewards are likewise independent authoring records. A reward bundle may contain canonical
artifacts, item instances/consumables, resources, or a taught spell and has one explicit delivery
kind supported by the rules (direct pickup or a selected canonical reward-bearing site). A guardian
may protect the reward record or its carrier by ID. The codec lowers the bundle to the ordinary
runtime pickup/site representation; the editor never grants it directly. Direct portable rewards
obey the normal pickup and ranged-pickup rules, including guardian-efficacy lint.

## Canvas tools and palette order

Terrain editing uses tile-canvas gestures familiar from a paint program. The selected terrain and
skin can be smeared continuously while the primary mouse/pointer button is held. Filled rectangle,
ellipse, and polygon tools change every cell whose center lies inside the shape; their rasterization
and drag direction are deterministic. A one-cell pencil is the minimum brush, and larger square or
round brush sizes use the same cell-center rule.

Mountains use the same smear and filled-shape tools, but appear as a separate palette section.
Painting a mountain writes canonical Mountain gameplay terrain plus the chosen legal mountain skin;
it does not invent an additional collision layer. Erasing or repainting restores the currently
selected ordinary terrain/skin. Obstacle and prop stamps remain explicit authored objects.

The palette is ordered and labeled as follows:

1. terrain and skins;
2. mountains, obstacles, and decorative/shape props;
3. structures and other registered map objects;
4. cities;
5. heroes;
6. guardians, exposing every canonical creature;
7. artifacts;
8. consumables and other items;
9. resources, overlays, rewards, and remaining supported authoring tools.

Search and filters may exist inside a section but must not flatten this order. Entity placement uses
a stamp/cursor and then an inspector; painting gestures never dispatch game actions. Placement
choices use compact icon buttons with accessible names and hover titles. The city section exposes
six direct faction stamps, structure and reward sections reuse native map sprites, guardians reuse
all canonical battle portraits, and text detail moves to the selected inspector rather than filling
the palette.

## Local persistence and portable files

Editor storage uses the same injected `StorageLike`/browser-storage boundary as game saves, so both
work offline and degrade cleanly when storage is unavailable. It uses a distinct versioned key
namespace and separate local envelope. Map drafts and immutable map revisions never occupy, rotate,
overwrite, or count as quick, manual, or autosave slots. Campaign deletion does not delete maps,
and map deletion does not delete campaign bytes.

**Export map** downloads the normalized portable document as `<id>.vam-map.json`. Structurally valid
drafts may be exported for backup even when playable lint has errors; the UI labels them as drafts.
**Test play**, **Start game**, and **Export playable map** require zero validation errors. Import is
non-destructive: malformed JSON, the wrong `documentType`, unsupported newer schema versions, or
unsafe values are refused before storage changes; a structurally valid draft imports with its lint
diagnostics. ID/revision collisions require an explicit replace, import-as-copy, or cancel choice.

The five-field campaign save remains `{ contentHash, mapId, difficulty, seed, actionLog }`. A local
campaign's `mapId` is a canonical reference containing local document ID, revision, and normalized
map hash. Replay resolution loads that exact immutable map revision through the map repository before
creating initial state. Missing or hash-mismatched maps refuse reconstruction with an instruction to
import the required `.vam-map.json`; they never fall back to a built-in map or the latest draft. The
resolved map hash participates in `contentHash`. Campaign export does not embed or mutate the map
document, and the UI offers the matching map export alongside a local-map campaign save.

## Validation, lint, and deterministic conversion

Validation is layered and uses the same pure functions in editor diagnostics, import, test play,
promotion, tests, and `npm run map-lint`:

1. JSON/schema safety and supported version;
2. dimensions, rectangular tiles, finite integers, unique IDs, and in-bounds coordinates;
3. installed catalog references and kind-specific authoring fields;
4. player-slot order, owner/faction independence, hero definitions and nonempty legal armies,
   city defaults/overrides including neutral-garrison presence, positive guardian counts, reward contents, and guard links;
5. canonical footprint, overlap, entrance, terrain-domain, paired-object, Cache, start-aggro,
   guarded pickup, reachability, and objective checks from S02/S03;
6. optional authored-map profiles such as dense topology or showcase counts.

Diagnostics have stable codes, severity, entity/cell targets, and messages. Errors block playable
conversion; warnings do not. The editor may focus the named entity/cell but may not reinterpret the
result. Auto-fixes are explicit document edits and pass through validation again.

Runtime conversion is a pure function of normalized document, installed catalogs/rules content,
and explicit campaign seed/setup. It deep-copies authoring data, applies defaults in stable order,
resolves random-tier guardian placeholders, materializes reciprocal links and runtime initial fields,
and returns a fresh map plus setup. It does
not read editor selection, local time, browser storage, DOM state, or ambient randomness. Identical
document bytes, catalog hash, seed, and setup must produce identical initial state and replay/hash
results.

## Promotion into the built-in catalog

A promoted map is the same validated portable document, not a hand-transcribed TypeScript factory.
The promotion command accepts an exported `.vam-map.json`, requires a built-in-safe unique ID and
zero full-lint errors, verifies that it is already in the canonical form produced by export, copies
those bytes unchanged into the checked-in authored-map directory, and adds or verifies the single
built-in manifest entry consumed by campaign setup, content hashing, presentation, simulation,
assets, tests, and map lint.

Promotion must not require re-painting terrain, reconstructing player setup, rewriting cities or
heroes, copying guardian counts, recreating reward links, or translating JSON arrays into source
code. A built-in clone of the promoted entry must normalize back to the same portable authoring
content. Repository acceptance then adds any scenario-specific profile/tests and runs map lint,
spec-link check, TypeScript/build, deterministic replay coverage, and relevant browser review.

### Exact promotion workflow

Export the zero-error playable revision from Map Editor, then run:

```bash
npm run promote-map -- path/to/the-map.vam-map.json
npm run promote-map -- path/to/the-map.vam-map.json --check
npm run map-lint
```

The first command re-runs schema/catalog/playable validation and ordinary map lint, requires the
current `compatibility.catalogHash`, and requires byte-for-byte canonical export form. It refuses a
legacy or portable duplicate, copies those exact bytes to `src/content/maps/authored/`, and adds one
generated `{ id, document }` entry (plus its JSON import) to that directory's registry. That single
registry supplies the typed built-in ID union, runtime repository, title/editor presentation,
content hash, and map-lint enumeration. `--check` is non-mutating and verifies that an existing
registration and asset still match. Scenario-specific lint profiles remain an intentional follow-up
when the scenario claims additional density, topology, or showcase guarantees.

## Reproducible acceptance review

With the Vite application available at `BM_URL` (default `http://127.0.0.1:5173/`), run:

```bash
npm run review:map-editor
```

The deterministic real-browser journey starts at the title screen, creates a blank portable map,
authors the two required objective texts, and exercises terrain smear and filled shapes, mountain
smear and filled shapes, an obstacle prop, registered structure, independently owned/factioned
cities and heroes, a linked guardian with an edited troop count, artifact/item/resource rewards,
and a road overlay. It also checks keyboard shortcut ownership, undo/redo, cancelled pointer
gestures, local save and reopen, canonical download, non-destructive import collision handling,
test play and return-to-editor context, and the campaign menu's exact frozen-revision map download.

The command checks the canonical palette order, zero playable errors, 390 px horizontal overflow,
and a 128×128 creation/shape-paint performance budget. It then validates the exported bytes through
the real promotion adapter in an isolated temporary repository and verifies `--check` without
changing the working tree. Nine desktop/narrow captures and both intercepted portable downloads are
written deliberately under `.pixel-work/review/map-editor/`; no screenshots are written at the
repository root.
