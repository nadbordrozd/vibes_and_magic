# Implementation Decisions

## 2026-08-11 — City geometry and neutral defense have one canonical boundary (doc 51)

- Internal `Castle`/`castles` identifiers remain save and API compatibility names, while every
  player-facing surface says City. One shared 5×2 top-left contact and `(2,1)` gate drives setup,
  occupancy, navigation, fog, rendering, lint, editor placement, conversion, and migration.
- Neutral ownership is not a player slot. Omitted neutral garrisons derive three ordered stacks from
  the faction's tier-1–3 unit IDs at exactly three times base growth; `[]` and legal nonempty armies
  are explicit whole replacements. Runtime records retain inherited/explicit provenance so an
  editor adapter cannot turn battle casualties into a fresh default defense.
- Legacy local maps are recognized by the exact former catalog hash and require an explicit
  gate-preserving migration. Built-in gates remain fixed while widened terrain, entity, guard, and
  road collisions are re-authored and linted. Four scenario visual variants are validated aliases
  of their faction's canonical 160×160 city art; their gameplay metadata remains independent.

## 2026-08-10 — Entered movement tiles own incremental fog (doc 48)

- Each coordinate a hero actually occupies during `MOVE_HERO` is a deterministic exploration event.
  The player's serialized `explored` array retains the union of every such vision circle, including
  the last tile before movement exhaustion, siren/diplomacy choice, guardian aggro, object entry,
  boat/whirlpool transition, battle, or hero defeat. An unentered guarded destination is added only
  if its later flee, bargain, or battle result legally completes occupancy.
- Non-instant movement remains one canonical action committed after animation. Presentation applies
  the same pure reveal projection to the current animated path prefix and never writes rules state;
  Off mode commits the action immediately. Player ownership, replay/save/compressed-link hashes,
  other heroes, castles, skills, artifacts, and explicit reveal effects remain authoritative.
- Doc 47 painter order is retained: partially mounted mountain compositions are still covered by
  the final opaque fog layer, now using the current prefix projection rather than final-route vision.

## 2026-08-10 — Adventure sprites overhang north only (doc 47)

- An adventure obstacle sprite may overhang only north of its authored ground contact. Mountain
  role PNGs remain at native resolution; a narrower composition takes a centered pixel slice and an
  SVG clip forbids paint left, right, or south of the declared contact.
- The clipped visual rectangle, not the anchor or complete footprint, owns viewport intersection.
  A single explored contact mounts a composition, and late fog occludes every unseen cell after
  world sprites so this correction cannot disclose hidden terrain.
- The Crooked Crown's authored Mountain cells, legal NW–SW route, collision, pathfinding, save/replay
  authority, deterministic topology selection, manifest, and PixelLab source assets are unchanged.

## 2026-08-07 — Adventure showcase and subordinate decoration density

- The exhaustive adventure visual review is a standalone, deterministic browser fixture generated
  from the terrain catalog, authored maps, asset worklist, and manifest. It uses the production
  terrain adapter and mountain compositor, while its object layout is review transport only.
- The ordinary-map decoration attempt rate is 4%, superseding the earlier 16% rate. The exhaustive
  mixed-context native-scale capture showed repeated canopies, deadfalls, banners, letter-stones,
  candles, and frozen ponds occupying the same visual tier as pickups and services at 16%. Four
  percent preserves regional texture while restoring the binding decoration/interactable hierarchy.
  Manywhere remains at 1.5%. This is deterministic presentation only and does not enter saves,
  occupancy, pathfinding, map authoring, or gameplay state.
- No sprite is replaced for this correction. Manifest geometry, native dimensions, anchors,
  entrances, footprints, painter ordering, ownership flags, and mechanics remain unchanged.

## 2026-08-04 — Temporary H2 transition grammar is presentation-only

- Implementation state, generated assets, and continuation instructions are consolidated in
  `docs/36_TERRAIN_TRANSITIONS.md`.
- The supplied H2 terrain composition is a temporary visual reference/placeholder, not a new
  canonical gameplay catalog. Existing terrain IDs and all mechanics remain authoritative.
- Transition composition uses shared bridge materials instead of generating every terrain pair:
  Beach between water and non-beach land, Dirt between otherwise incompatible land families, and
  direct joins when Beach or Dirt is already authored. This rule is deterministic and replaceable
  independently from the source textures.
- The global adventure-map scale is ×1. Native 32×32 terrain is displayed at 32×32; review tooling
  may enlarge a screenshot with nearest-neighbour scaling, but production does not.
- Terrain transition ownership is emitted as nine crisp SVG paths over PNG patterns. Runtime canvas
  composition is rejected under doc 31's renderer law, including for the standalone showcase.
- Approved grassy mountains are not regenerated or recomposed for this change. Their existing
  native bitmaps and `deriveMountainRanges` output render at the new global scale like every other
  adventure-map sprite.

- The PoC uses a compact hand-authored object layout over a deterministic mirrored terrain generator; both are data-only and produce the specified 28×20 map.
- AI vision is unrestricted, as explicitly accepted by the PoC specification.
- A hero entering a guarded objective remains on the adjacent tile until combat resolves, then occupies and claims the destination on victory.
- Treasure and mine guards use the locally themed faction units named by the specification; guardians have no hero bonuses.
- Hero-versus-hero combat is supported when heroes meet outside castles, although the supplied AI primarily targets castles.
- The permanent-reveal fog model records explored coordinates as string keys so game state remains JSON serializable.
- A deterministic battle seed derived from the game PRNG chooses obstacle coordinates; obstacles affect movement but never deployment columns.
- Combat movement and a following melee strike are represented as one explicit action when an enemy is reachable this turn, matching the PoC combat AI requirement.
- Castle recruitment adds units to a visiting hero first and otherwise to the garrison; same-type stacks merge automatically.
- For static hosting, random new-game seeds use browser crypto in the UI and are passed into the pure core; the core itself performs no I/O or ambient randomness.
- To prevent deterministic mine-recapture loops, strategy AI switches to an aggressive enemy-hero/castle objective after day 14; this is an AI-aggression tuning rule, not a game-rule change.
- Local saves use a versioned, optional `localStorage` adapter in the UI layer; the saved payload is the unchanged JSON-serializable core state.
- Adventure movement is committed after its legal path animation; combat actions are queued until movement, bump, and damage feedback finish, preventing animation timing from affecting deterministic rules.
- One shared UI motion setting controls both adventure and combat timing and defaults to Fast; Off commits actions immediately.
## 2026-07-30 — Real factions and magic milestone

- Faction balance baseline (seeds 1–200): Hearthguard 0.5%, Wound-Wrights
  99.5%, zero crashes. Following document 06's tuning order, final tuning is
  Yeoman growth 14→17, Tin Soldier growth 16→12, and (only after testing growth)
  Hobby Knight damage 3–5→3–4. The post-tuning gate (same seeds) is Hearthguard
  49.5%, Wound-Wrights 50.5%, zero crashes.
- `charge` uses the hex distance of the immediately preceding move action as its
  straight-line distance because the current combat action records a destination,
  not individual path nodes.
- Initial magic diagnostic (seeds 1–20) produced Wound-Wrights 100%, zero
  matched winner flips, median battle length 3, and 80 casts. Unit stats remain
  locked; Rally was raised 30→50 meter so Rite can generate an action within the
  observed short battles. Further spell-only tuning and its accepted run follow.
- Strategy AI intercepts an enemy hero that is within one day’s movement of its
  home castle when the defender can reach that hero this turn. Matched diagnostics
  were otherwise decided by empty-castle races with no final battle, making the
  required spell-decisive battle metric meaningless.
## 2026-07-30 — Hero layer milestone

- `Player.heroes` plus `activeHeroId` is authoritative; the existing `Player.hero`
  field remains a synchronized selected-hero compatibility view for Milestone-10
  callers while old single-hero saves are rejected rather than guessed into a roster.
- A defeated hero replaces one current Tavern offer immediately, making the
  documented 2500g re-hire available without waiting for the next weekly refresh.
- Diplomacy recruitment is offered only when every guardian stack can merge into
  or occupy the hero's seven army slots; a partly recruitable guardian cannot be bought.
- Attunement R2's two shrine choices resolve consecutively on the first visit, with
  the first chosen upgrade removed from the second offer.
- Spellthief R2 copies the alphabetically first still-unowned upgrade known by the
  defeated hero after the player chooses which spell to learn.
- When several allied heroes occupy a defending castle, the first roster hero is
  the field commander; other heroes do not merge additional armies into that siege.
- Six empty consumable slots are present on heroes so Milestone-11 exchanges
  conserve items before Milestone 12 supplies the item catalog and acquisition rules.
- Strategy AI intentionally ignores Diplomacy and Spellthief draft cards, continues
  to read exact hidden state, and uses straight-line threat reach for Gatherer flight.

## 2026-07-30 — Tricks on the map milestone

- Item inventory entries are JSON item instances rather than bare IDs so a scroll can
  retain its stored face and Trade Goods can retain their pickup coordinate; legacy
  string slots remain transferable for Milestone-11 replay/test compatibility.
- A Standard scroll uses its stored Standard rules even under terrain resonance; a barrow
  scroll uses its stored Upgraded rules. Bottled Echo repeats the recorded version and, for
  an X-cost spell, its recorded spend, while recomputing scaling from the user’s SP.
- Trade Goods use floored Euclidean distance for “straight-line tile distance,” so
  prices remain whole multiples of 25 gold.
- Rich Vein income begins at the owner’s next daily income, pays on ten dates, and
  does not refresh when captured by another side.
- Cartographer’s Case accepts a center within Chebyshev distance 3 of any explored
  tile and reveals a true Euclidean radius-7 circle.
- Marketplace exchange requires a visiting hero, matching other hero-mediated town
  services; direct resource-to-resource exchange is two explicit trades through gold.
- Puzzle-lock neutral stats were authored at roughly four times the supplied forced
  week-six army power. The assault harness uses that fixed mixed Hearthguard army so
  it measures puzzle resistance rather than strategy routing.
- M12 item and Rich Vein objectives are assigned to Gatherers, not the Main. Giving
  them Main priority displaced every guarded expansion fight in short simulations
  and collapsed play into premature faction combat.
- The Mask remains an inventory passive copied into battle-side ability tags; no
  artifact slots or equipment rules were introduced.
- Sieges beyond Walls, the artifact/equipment system proper, Hagwood/Wild/bargains,
  the ultimate artifact, and recruitable Seamborn remain deferred as specified.

## 2026-07-30 — Expansion milestone, Phase A

- Persistent battlefield tiles use `duration: -1` for battle-long tiles; positive
  durations decrement at round transitions. Wall of the Maker now creates `wall`
  tile instances, and the former `spellWalls` coordinate list was removed.
- Wall+ heat is carried by each wall tile rather than by a placeholder battle
  enchantment. It therefore no longer consumes one of the two enchantment slots;
  adjacent enemy stacks still receive only one Burn application per turn.
- Artifact equipment introduces save format 2 and intentionally rejects format-1
  saves. The six proto-artifact trinkets are artifact definitions in Misc slots;
  The Mirror Mask lock reward now enters the unlimited artifact backpack.
- Tailor's Kit thresholds count equipped pieces, not pieces merely carried in the
  backpack. Dropped equipment is unequipped and transferred into the victor's
  backpack so no slot collision can destroy loot.
- Berta's Logistics specialty extends to R3 at +45%, and Grigor's Forager specialty
  extends to R3 at +125%, continuing their established per-rank progressions.
- Omens use a dedicated seeded RNG stream and pre-roll the next omen. This keeps
  omen forecasting stable when unrelated random draws occur and prevents omens
  from perturbing established battle/chest RNG sequences. Fractional growth is
  rounded down to whole recruits.
- Quiet Week is weighted 45; the six named omens use weights 9/9/9/9/9/10, the
  exact integer distribution closest to the specified “about 9% each.”
- Seed 1 deterministically rolls Week of Plenty for week 2. The dwelling
  regression fixture therefore changes from 34 to 38 T1 recruits
  (17 existing + floor(17 × 1.25)); no unrelated golden data was regenerated.
- Debt handler `announce` is the content-free scheduled-trigger proof. Bargain
  costs and their handler tags remain Phase C content.
- Skill ranks whose subjects do not exist yet expose content-free rule hooks now:
  Beastmaster recruitment/speed/weekly-join checks, Warden garrison stat/Command/
  five-tile cast checks, and Siegewright wall reduction/HP/breach checks. Their
  concrete beast, installed-garrison, and siege consumers still wait for Phases
  B/D/E. Warden's five-tile check uses the map's existing Chebyshev proximity.
  Peddler/Provisioner hooks that require the expanded item/adventure-spell
  catalogs wait for Phase C.
- Phase A does not add the four factions, Wild spells, bargains, expanded
  consumables, castle trees/sieges, new maps or map objects. Tier-7 units,
  recruitable Seamborn, and random maps remain explicitly deferred.

## 2026-07-31 — Expansion milestone, Phase B

- The four new factions receive four lightweight named tavern heroes each so faction-select
  games satisfy the existing seeded roster/hiring machinery. Their specialties are flavor-only
  until a later hero-specialty catalog specifies behavioral identities.
- Choice-triggered unit abilities use ordinary deterministic battle actions. The Courier pauses
  resolution for a free-move choice; multi-target activated abilities enumerate legal targets and
  destinations through the same `legalBattleActions` surface used by UI and AI.

## 2026-07-31 — Expansion milestone, Phase C

- Doc 15 states 68 spells and 16 per school plus four provenance rares, but its written Wild list
  contains only fourteen non-provenance entries. `Shed Skin` and `Hedgerow March` fill the two
  missing Wild slots with a cleanse/Bloom staple and a forced-movement enchantment; both use the
  document's existing Wild mechanics rather than introducing a fifth subsystem.
- Adventure spells are explicit replayable actions costing their printed mana plus 300 movement
  (150 with Provisioner R2). Persistent topology is JSON state: paired Gate entrances, temporary
  thicket coordinates, and one-use resonance sites. Gate travel is activated by stepping from one
  entrance to the other; this keeps paths serializable without a hidden teleport edge format.
- Standing Mirror is an attackable, immobile 30-HP pseudo-stack and does not consume an
  enchantment slot. Its base reflection preserves target allegiance by choosing the first stable
  legal counterpart. The Upgraded rules use the same deterministic choice in AI and headless play; a
  separate interrupt-time target dialog was not added to the already-resolving enemy cast.
- Peddler sale values use 500/1000/2000 gold for common/uncommon/rare consumables because the
  catalog specifies a 60% sale rate but no base prices. A stocked generic scroll costs 1000 gold.
- Non-Hagwood Debt surcharge calls scheduled obligations one interval earlier where possible;
  ongoing or economic obligations use the explicitly harder value shown by their handler.

## 2026-07-31 — Expansion milestone, Phases D–F

- Siegewright R2's Maker walls are 40-HP immobile pseudo-stacks. This lets the existing attack,
  damage, death-animation, AI targeting, and path-blocking machinery handle them consistently;
  ordinary Wall of the Maker casts remain persistent battlefield tiles.
- A Warden is installed when that hero transfers troops into a garrison. The castle records the
  installer; remote defense uses that hero's primary stats, adds Command at R2, and exposes their
  spellbook/mana only from the documented five-tile range at R3. Capture clears the appointment.
- Walking Hut relocation pauses at round end for a legal any-free-hex choice. AI chooses the
  destination minimizing distance to an enemy; this keeps the unusual movement replayable.
- What Was Promised auto-pays each visible weekly instalment when possible. A missed instalment
  keeps the Debt scheduled and the named building dormant until a later week can pay it, including
  after the nominal third due date. Dormancy suppresses income, growth, services, travel, castle
  defenses, and faction-building hooks.
- Chest artifacts use a deterministic 10% roll and exclude trinkets and Kit pieces. Peddler R2
  values carried artifacts at 1000g (Vanilla), 2000g (Charm/trinket), or 4000g (Relic), then pays
  the documented 60%; Kit pieces cannot be sold.
- Toy Knight's Heart designates the largest equipped hero's construct deterministically at battle
  setup. Likewise, adventure spell choices without a dedicated map picker use stable first-legal
  targets; their core actions still accept explicit targets for replay, tests, and future UI work.
- Crosstitch has fixed impassable water seams rather than a navigable water/boat layer, so Summon
  Skiff remains the catalog's explicitly reserved spell. Gate, Cold Road, Greenway, the bridge,
  thickets, and Unstitch provide the implemented topology verbs.
- Border Marches deliberately contains no Tailor's Kit pieces. Crosstitch holds all four in
  visible corner locks, and adds the rare Wayward Crone encounter as the non-Hagwood bargain path.
- Balance/exposure simulations were intentionally not run at the user's request. Acceptance used
  deterministic unit/integration tests, production compilation, and the browser interaction smoke
  path; no content stats were tuned in this pass.

## 2026-07-31 — Flavor and inspection system

- Flavor lives on the authoritative content definition, while inspection mechanics are derived
  from that definition at render time. Map objects use a standard kind-based catalog with an
  optional per-instance `flavorHint`; this avoids duplicating the same prose across authored map
  instances while preserving the documented override point.
- Discovery is keyed by map-object kind and stored on each player, not on the object or hero.
  Visiting any instance therefore teaches every instance of that type permanently for exactly
  that player, including after save/load. This requires save format 3; format-2 saves are rejected
  under the project's existing strict-version policy.
- Vess's Larvae HP is a battle-stack override rather than a mutation of the global Larval Tide
  definition. Damage, healing, revival, repair, and summoned broods read that override, preserving
  ordinary Larvae for other heroes. Kettl's speed uses the parallel per-stack specialty bonus.
- Ordinary Crow Chorus now applies Pecking Order only on its attack; Old Marta opts retaliation
  into the same hook. Ordinary Outrider skirmish uses effective speed after slows, while Bataar's
  uses base speed, making the documented exception behavioral rather than descriptive.
- Baba Zima's scheduled Debts move one trigger step later. Never By Iron instead shortens the
  income suppression by one day, the stated lighter alternative. Every bargain offer appends her
  exact altered term before acceptance.
- Terrain and battle terrain use the same inspection gesture infrastructure but resolve only to
  the short label/phrase overlay. They never open the full card, even via right-click, Inspect
  mode, or long-press.

## 2026-07-31 — Map occupancy and wide footprints

- `AGGRO_ADJACENCY` starts at 4 and is the sole switch between orthogonal and eight-neighbor
  guardian coverage. Eight-neighbor aggro remains a playtest option; no balance tuning was done.
- Maps author targets and guardian specs as separate lists. The placement helper materializes
  independent guardian objects and their `guardedBy`/`protects` relationship; `MapObject` no
  longer permits embedded `guard` fields. Guarding remains entirely emergent at runtime.
- Guard efficacy is deliberately strict for ranged loot: a guarded pile, item, or chest must cover
  its own tile and every otherwise-enterable tile in its eight-neighbor click ring. Border Marches
  keeps two mirrored, terrain-secured guarded chests; other chests that could not honestly meet
  that rule are authored as unguarded instead of retaining a scripted lock.
- A map object's position is its footprint's top-left anchor. Castle positions supplied by legacy
  setup content were entrance coordinates, so setup converts them to 3x3 anchors; all services and
  hero spawns use the derived bottom-center entrance thereafter.
- A wide battle stack's position is its leftmost hex. Footprints extend horizontally to the right,
  remain axis-locked, and never rotate. Defender deployment therefore offsets anchors leftward;
  overflow uses the documented inner columns while preserving every occupied hex in bounds.
- The doc-24 balance league and deterministic balance-game regression were not run because the
  user explicitly excluded balance simulations. Acceptance used deterministic mechanics tests,
  map lint, compilation, and browser smoke instead.

## 2026-08-01 — Ship-Shape and Water

- Difficulty remains one global campaign setting. Percentage resource and growth modifiers round
  down; surrender's 25% remaining gold value rounds up so accepting a surrender never loses a
  fractional payment.
- The canonical save/file/link payload is exactly the five documented action-log fields. Local
  storage keeps setup and pristine-state compatibility sidecars beside that payload so existing
  hot-seat controller/faction choices survive, without changing exported or linked save data.
- Mixed-domain pathfinding carries an embarked boolean as part of each search node. A boat is
  claimed on the land-to-water edge, moves with its hero on sea edges, and remains on the final
  water tile after a water-to-land edge. Diagonal adjacency follows the adventure map's existing
  eight-direction convention.
- Sea guardians may author posts on water when their protected site is on water. Map lint treats
  water as a traversable domain for whole-map reachability while retaining terrain, overlap,
  guardian-link, and sea/land guard-efficacy checks.
- The sea battlefield uses the existing 13×9 board: columns 0–2 and 10–12 are deck, columns 3–9
  are shallows. It has no random obstacles; ordinary land stacks pay the shallow step surcharge,
  aquatic stacks gain their speed bonus while anchored in shallows, and flying stacks are exempt.
- Ship-Shape and Water balance leagues, including the sacrificer and Torn Sound leagues, were not
  run per the user's standing request. No unit or economy numbers were tuned from simulations.
- Battle replay links locate the latest battle in the canonical campaign action log, reconstruct
  its initial combat state, and expose the remaining logged actions to Step/Play controls. This
  keeps the link payload within the exact five-field save format and also permits sharing from the
  result screen after a battle has concluded.
- Whirlpool edges add a route-selection penalty of 100 movement-score points per unit projected
  lost (minimum 100), while the crossing itself consumes no extra movement beyond entering the
  whirlpool. The actual deterministic 25% weakest-stack loss remains authoritative on traversal.
- An AI at Siren Rocks listens only when its army is at least 120% of the authored Siren guard's
  power; otherwise it rows past. This reuses the strategy layer's normal safety margin.

## 2026-08-01 — Castle picture cards (doc 27)

- The six mechanical dwelling IDs remain shared across factions, while their 36 names and flavor
  entries live in a faction-indexed dwelling catalog. `buildingPresentation` joins that content to
  the faction's unit and growth data so cards, recruitment, logs, and prerequisites use one source.
- Upgrade links point from the lower stage to the next stage. Slot resolution walks that link only
  while the current stage is built, leaving the final built stage visible in gold.
- Building availability, faction ownership, bans, and coastal Shipyard eligibility are core rules.
  The castle component consumes the resulting four-state model and owns no construction logic.
- Inland Shipyards use the grey unavailable state, matching the document's future-consumer example.
  Taverns are prebuilt in every generated castle and removed from the AI build order; hiring prices
  and offer refresh behavior are unchanged.

## 2026-08-01 — Terrain and discovery expansion (docs 28–29)

- Authored terrain is normalized to `{ terrain, skin? }`; legacy string tiles remain accepted only
  at core boundaries so existing saves/tests can be replayed while every shipped map uses the new
  representation. Decorations are a pure seed/map derivation and never enter state or save data.
- A 12x12 coordinate bucket is the concrete meaning of a decoration/prop “region.” Generated
  Mosswold anomalies and authored `anomaly` obstacles are rationed independently, because the doc
  explicitly assigns the latter responsibility to authors and lint.
- The artifact target is interpreted as 80 ordinary discoverable artifacts. The four Tailor's Kit
  pieces and six migrated trinkets remain special catalogs, making 90 definitions in code: 80
  Vanilla/Charm/Relic/Burden plus 10 special pieces.
- Cache fragments are tracked per visiting hero, matching the Patient Stone's `revealedBy` model.
  The Moth-Eaten Map contributes one virtual fragment; the exact tile is printed only when the
  effective fragment count completes the sketch. Digging remains legal anywhere and always spends
  the hero's remaining movement.
- Burden removal is immediate when its stated location and payment/achievement are satisfied. A
  shrine or Wishing Well leaves the burden in place if its price cannot be paid; the Reliquary
  Cairn exposes a dedicated Patternless Coat trade.
- Weekly Mercenary and Wagon stock is deterministic from campaign RNG. The Hut on the Hill moves
  one authored route step at each week start, keeping its movement replayable and lintable.
- Manywhere uses `victory: none` by default as the requested wander sandbox; conquest remains an
  available authored objective elsewhere. Retire deliberately routes through the existing game-over
  statistics screen.
- The documented Manywhere stress league and all balance/exposure simulations were not run, per the
  user's standing request. Verification uses focused mechanics tests, map lint, compilation/build,
  and browser smoke.

## 2026-08-01 — Canonical specification refactor (doc 30)

- The S-files own behavior and invariants; executable content files own current catalog values and
  strings. Archived docs remain provenance, while a future rule change must update its numbered doc,
  affected S-file, data, and decision entry together.
- Coverage is reconciled at source-section granularity: every normative statement in a section is
  routed to an S-file or executable catalog. The deliberately dropped list contains process history
  only, never game rules.
- The remaining doc-03 resistance direction, the Cartwright's Wheel pencil, reserve tier-seven
  creatures, recruitable Seamborn, and the explicit doc-21/doc-26 deferrals remain backlog rather
  than being presented as current rules.
- Unlogged implementation gaps discovered during reconciliation remain bugs instead of being
  normalized into the spec: three missing artifact behaviors, Bogdan's empty specialty behavior,
  and Manywhere's omission from save validation are triaged in `docs/spec/RECONCILIATION_BUGS.md`.

## 2026-08-01 — Pixel art manifest and first terrain batch (doc 31)

- Native PNGs live below `public/assets/`, while `assets/manifest.ts` is the only renderer-facing
  registry. A manifest anchor is the pixel inside the bitmap aligned to the world coordinate passed
  by the renderer; terrain and footprint-sized objects therefore use `{x: 0, y: 0}`.
- The data-derived worklist groups genuinely shared presentations (resource/school/kind), but keeps
  dwelling units, authored locks, obstacle props, town variants, hero facings, and battle units
  distinct. Runtime bridge completion is included even though authored maps begin incomplete.
- `PIXEL_SCALE` starts at 1. Adventure and combat SVG canvases now render at explicit world-pixel
  dimensions rather than stretching to their panels, so native pixels are never fractionally scaled.
  Larger presentation scales must change the one integer constant rather than CSS-fit the sprites.
- PixelLab Tiles Pro returned four candidates per requested terrain family rather than exactly the
  numbered twelve. Candidate indices and shipped selections are recorded in `assets/prompts.md`;
  rejected or visibly repeating candidates are not retained as project assets.
- Road work uses PixelLab's edge-mask path vocabulary because freeform generation did not preserve
  authored N/E/S/W topology. The generated seed-3250 road pixels remain authoritative; the local
  extraction tool only makes the deliberately requested magenta guide hue transparent after the
  service's own edit endpoint failed to preserve geometry.
- Seam selection is judged over the full authored Crosstitch, not as an isolated tile. The shipped
  seed-3310 derivative retains only generated pixels inside a one-pixel diagonal band, preventing
  candidate noise from repeating into an effect while preserving the mundane surveying-mark read.
- The pixel-art camera is the high-oblique adventure-map view associated with HoMM and Warcraft
  I–II. The underlying 32px square grid, footprints, pathing, and rules do not become a diamond
  isometric grid. Terrain expresses perspective inside crowns, crags, tufts, ripples, and surface
  shading; the tile itself has zero extrusion so it cannot create a repeated horizon band.
- PixelLab's 65° square template left three fully transparent horizontal rows. The checked-in repair
  tool makes only that technical edge correction from generated edge colors; the prompt ledger
  records the source jobs and exact selection so the shipped PNGs remain reproducible.
- All authored terrain/skin pairs use three coordinate-selected variants under that same camera
  law. Variant art can change palette and microtexture, but never traversal, tile geometry, skin
  semantics, or decoration placement; those remain owned by terrain data and map rules.
- Asset validation decodes terrain alpha rather than trusting the PNG color-type flag. A terrain
  entry is invalid if even one pixel is non-opaque; transparent content is reserved for overlays,
  decorations, and object sprites.
- Tiny terrain decorations are constrained with native-resolution transparent layout guides when
  prose-only generation changes their occupied footprint or invents a plaque/ground tile. PixelLab
  remains the authored-pixel source; guides constrain composition and are recorded verbatim beside
  the prompt and job ID.
- Raised props must expose upper surfaces and lower-right near faces in the same high-oblique camera
  as terrain. Flat marks such as tracks and stone grain instead use foreshortened diagonal geometry
  inside that ground plane; they are not exempted into a straight-overhead icon camera.
- Multi-cell object acceptance is based on the authored footprint, not the PNG canvas. The Spool and
  Block therefore use 64x32 silhouettes that visibly span two cells, while all traversal, anchors,
  and square-grid rules remain unchanged.
- A generated site is rejected if it bakes a terrain plinth or if its visible mass collapses below
  the authored footprint, even when the architecture is otherwise stronger. Mines use transparent
  native 64px guides to reserve the bottom-left entrance and block the lower-right footprint cell.
- Castle style references copy outline, detail, and shading but not color. Each S08 faction palette
  remains authoritative, and neutral-town variants reuse construction language rather than player
  ownership colors. Castle acceptance also checks the authored bottom-middle interaction entrance
  in screen space; PixelLab's default lower-side gate is corrected without changing the 3x3 rules.

## 2026-08-01 — Ground-contact footprints (doc 32)

- Existing mine and castle entrance coordinates remain fixed in world space. Shrinking removes the
  old top row, so authored mine anchors and generated castle anchors move down one row while heroes,
  services, captures, and garrison interactions continue to use the same entrance tiles.
- Castles now occupy 3×2 with bottom-center entrance `(1,1)`; mines occupy 2×1 with bottom-left
  entrance `(0,0)`. Lint constructs those same footprints around authored castle entrances, keeping
  overlap, reachability, guardian-cage, and start-aggro checks aligned with runtime occupancy.

## 2026-08-02 — Fresh A1 terrain-height decisions (doc 31)

- The active manifest accepts only assets selected from the post-restart PixelLab runs in
  `assets/selections.json`. Earlier generated PNGs remain dormant evidence and cannot become visible
  merely by sharing a target filename.
- Core 32×32 terrain is generated as quiet opaque ground from fresh deterministic composition
  guides. Wang tiles were rejected as colour masks, while unguided Pixflux/Pixen outputs made
  per-cell motifs. Guides are generation inputs, never renderer assets.
- Deepwood uses the seeded scattered-canopy experiment. Border-only trees failed the same-state
  composition check; canonical canopy clumps are y-sorted and fade to 40% when a hero or interactive
  object is in the same or immediately preceding row within one column. This is visual-only.
- Mountain height uses deterministic rendering-only 64×96 props on non-overlapping horizontal 2×1
  mountain pairs. The prop's 64×32 ground contact and `{x:0,y:64}` anchor do not add occupancy,
  change traversal, or alter saved state. Two rows of headroom prevent SVG-edge clipping.
- PixelLab's current map-object worker rejected reference-image payloads in both raw and data-URL
  forms. Until that service behavior changes, production map-object requests are prompt-only;
  guided Pixflux remains the constrained fallback for assets that repeatedly violate silhouette or
  palette requirements.

## 2026-08-02 — Adventure landscape composition reset (doc 31)

- The adventure map renders at integer ×2. The selected hero is the camera focus; a symmetric
  horizontal gutter lets edge starts center without altering world coordinates or map bounds.
- Reachable-tile outlines and multi-cell footprint rectangles are no longer persistent map art.
  Legal movement remains visible through destination/path feedback, hover interactions, and the
  unchanged rules state.
- Meadow uses a native 128×128 support texture sampled in world coordinates beneath the 32px
  gameplay cells. Terrain remains a square rules grid, but its base material is not required to
  restart at every cell. Other terrain families are deliberately not converted until this small
  proof establishes the extension protocol.
- Native-ground integration means irregular contact pixels that visually dissolve into the local
  material. It does not authorize rectangular baked terrain plinths, change an object's footprint,
  or make a sprite terrain-specific without a future explicit decision.
- Broad production pauses after the five-type proof (meadow, hero, one building, mountain, castle).
  Battle-unit roster generation remains staged until the composed adventure-map language is
  accepted and can be extended without returning to icon-on-grid presentation.

## 2026-08-02 — Oblique camera lock supersedes the first landscape proof

- PixelLab adventure structures use Bitforge with `view: low top-down`, `direction: south`,
  `isometric: false`, and `oblique_projection: true`. The map-object endpoint's default
  `high top-down` camera is no longer accepted for this visual language.
- Meadow support is a native 256×256 world-space material. Its size is deliberately larger than a
  gameplay cell and is read from the manifest rather than hard-coded by the renderer.
- Mountain visual canvas is 128×160 over unchanged two-tile-derived placement. A 32px horizontal
  overhang on each side and 128px vertical overhang are visual only; mountain occupancy and saves
  remain map-derived. Two alternating files build ranges; the second is a lossless mirror.
- PixelLab character endpoint padding may be stripped and repacked without resizing visible pixels.
  Generated art may not be shrunk merely to compensate for transport/animation padding.
- The earlier `landscape-proof` selections are review-only rejected evidence. Only the
  `landscape-camera-lock` batch may promote the current meadow, hero, timber, range, and castle.

## 2026-08-02 — Cute-style probe and southeast light

- Adventure sprites use screen lower-right / map southeast illumination and cast toward screen
  upper-left / map northwest. Prompting names both the compass direction and the visible bright/dark
  faces so endpoint camera conventions cannot silently invert the result.
- HoMM2 screenshot crops are useful for human judgment but are not automatic style inputs. Bitforge
  copied their composition and background fragments even at exact native size, so screenshot-led
  probes are prompt-only unless a later endpoint demonstrates true style-only transfer.
- Larger flagship structures evaluate `generate-image-v2` before the dedicated map-object endpoint.
  In the three-sprite probe it was the only tested endpoint to return a clean plateless, flagless
  castle without an init mask or post-generation pixel deletion.
- The selected castle, mountain, and one-facing hero are review assets, not manifest replacements.
  Production promotion waits for an eight-direction hero family and a deliberate renderer decision
  about the mountain's wider 160×112 visual canvas; gameplay footprints remain unchanged.

## 2026-08-02 — Visual-description prompts supersede proper names

- Content IDs and faction names are metadata, not visual instructions. Production prompts describe
  the intended silhouette, materials, construction, color, and mood directly; a proper name is
  omitted whenever its ordinary-language meaning can pull generation toward the wrong subject.
- The castle stored under the Unfinished content ID is visually a complete medieval toy-making
  workshop with restrained clockwork details. It must not look ruined, abandoned, scaffolded, or
  partially constructed merely because of that internal ID.
- The visual description is now the manifested production sprite, not only a lineup experiment;
  the internal faction/content ID remains unchanged because it is game data rather than art
  direction.

## 2026-08-02 — Doc 33 obstacle-family contracts

- Wider visual canvases may centre a narrower ground-contact footprint. The manifest anchor's x
  coordinate identifies that contact inside the bitmap; validation requires the footprint to fit
  and keeps its y coordinate bottom-anchored. Forcing x to zero is rejected because it prevents the
  symmetric canvas overhang needed for overlap composition.
- The authored granite spines are two cells wide. Doc 31's unchanged-footprint rule therefore wins
  over doc 33's 5×2 massif guide: a 160px massif canvas may be centred on rendering-only 2×1 granite
  contact, but may not widen mountain traversal or rewrite authored terrain.
- The old mirrored mountain pair is superseded. Horizontal mirroring is not a source of variants
  under southeast light. Until a complete generated family exists, only the accepted broad granite
  massif is renderer-visible, once per compatible connected region; this is an interim improvement,
  not family approval.
- Large authored-map reviews may crop a review-only initial-state envelope into bounded sections
  when Chromium cannot mount the full native-×2 SVG. Every source tile and object stays verbatim,
  coordinates are translated uniformly, and every section must pass the same runtime glyph check.
  This is review transport only; production map dimensions and renderer behavior stay unchanged.
- Job validation treats every `doc33-*` positive prompt as source code: the four fixed
  camera/light/contact/style strings and a visual tile-scale clause are mandatory, while doc 33's
  process, asset-management and quality-booster vocabulary is rejected. IDs and negative API
  parameters remain metadata and are intentionally outside that prose check.

## 2026-08-03 — Manywhere showcase and approved mountain concept promotion

- Manywhere remains a selectable sandbox and is labelled as the showcase in the map menu. Its
  48×40 rules grid is unchanged, but its rectangular biome quadrants are replaced by deterministic
  organic regions and authored granite ranges at the north road, interior passes, and coast.
  Border Marches remains the lightweight default because mounting the full showcase exceeds the
  headless first-interaction budget. Blocking remains map-authored.
- The renderer derives only the visible southern edge of authored granite cells and composes four
  scatter pieces, two knolls, a ridge, and a rare massif there. The large piece may overlap but is
  never the staple; small pieces outnumber massifs by more than two to one.
- PixelLab production generation remained unavailable after the recorded quota/credential failures.
  At the user's direction, the already user-approved built-in image-generation concept sheet from
  the standalone prototype is promoted as an explicit interim exception to doc 31's provider rule.
  Promotion is reproducible: the checked-in script removes the chroma key, reduces with nearest
  neighbour, normalizes to an audited fixed palette, tapers only the outer contact columns, and
  writes bottom-anchored native game canvases. No runtime canvas is introduced.
- Manywhere's cosmetic micro-decoration density is 1.5%; other maps retain 16%. This is rendering-only
  and keeps its large structure catalogue legible instead of turning biomes into repeated icon fields.

## 2026-08-03 — Hearthguard uses the cute gatehouse

- The thin grey three-spire Hearthguard castle is rejected after its live r1c1 review. The approved
  seed-94120 cream-stone, red-roofed cute gatehouse from the v2 lineup replaces it in the manifest.
- This is an art-only substitution: the 96×128 canvas, 3×2 gameplay footprint, bottom-centre
  entrance, painter order, and runtime owner pennant remain unchanged.

## 2026-08-03 — Role-specific mountain family replaces landmark scaling

- The interim eight-piece family is superseded by 32 final sprites: six scatter, four knolls, four
  ridges, and two rare massifs for each of granite and snowcap. Each role was generated on its own
  source sheet; a massif is never the source for a smaller role or scaled into a map cell at runtime.
- Final canvases are fixed at 32×48, 64×64, 96×96, and 160×112 by role. The renderer displays the
  manifest dimensions at the global integer pixel scale and overlaps whole sprites. Authored
  mountain terrain remains the sole gameplay footprint.
- PixelLab was still unavailable after the recorded quota and credential failures, so this batch
  uses the built-in image generator as the existing explicit provider exception. Its enlarged
  chroma-keyed concept sheets are reduced once during the deterministic production bake, then
  alpha-hardened and quantized to the audited granite or snowcap palette. This offline reduction is
  a documented exception to doc 31's no-downscale rule; runtime resampling remains prohibited.
- The range composer derives visible southern edges independently per skin. It uses overlapping
  scatter, knoll, and ridge variants as the staple, avoids immediate repeated medium variants, and
  admits massifs only on long compatible edges. This is deterministic presentation-only state.

## 2026-08-03 — Mountains are obstacles on biome ground

- HoMM2's mountain regions do not expose a special grey mountain substrate. The rules grid still
  stores impassable mountain terrain, but mountain cells now render the continuous meadow field
  beneath their transparent sprites. The mountain review fails if a mountain terrain image or glyph
  is mounted, making “no grey mountain ground” an automated browser assertion.
- Every authored mountain row contributes sprites and is painter-sorted back-to-front. Interior
  rows use densely overlapping broad ridges; the southern row retains knolls and scatter as a soft
  transition. Long diagonal hogbacks remain available at exposed fronts but are excluded from dense
  repeated rows, where they read as rails.
- Manywhere mountain bands are solid two- or three-row obstacle masses rather than dotted masks.
  This accepts the user's 2×2 minimum, removes grid-shaped lanes, and preserves their existing role
  as barriers. The Rich Vein moved one cell east so the expanded northern pass remains map-valid.
- Workhorse granite and snowcap ridges use new higher-angle source sheets with broad visible upper
  planes and roughly 3×2 visual footprints. Their final contracts remain 96×96 with unchanged
  gameplay contact; this is an art and showcase-authoring change, not a general occupancy rule.

## 2026-08-05 — Game terrain stays canonical in the transition renderer

- Implementation state, selected PixelLab assets, and the direct-Wang integration boundary are
  consolidated in `docs/36_TERRAIN_TRANSITIONS.md`.
- Deepwood, Mosswold, Ashsteppe, Barrowfield, Lacquer Flats, and Mire are now distinct rendering
  families rather than aliases for generic H2 materials. This remains presentation-only: gameplay
  terrain IDs, movement, resonance, saves, authoring, collision, and mountain composition do not
  change.
- Incompatible canonical land families still meet through Dirt, so each new PixelLab Wang family
  needs one terrain-to-Dirt edge vocabulary instead of a quadratic catalog of every terrain pair.
  Water still reaches land through Beach. The showcase includes crowded junctions to audit both.
- Alternate source cells are not automatically safe interior variants. A candidate containing an
  edge fragment, tile-sized rock, gradient, or broad value shift is rejected after full-field
  composition even if it looks attractive alone. Tiny details are sparse by construction; larger
  marks must remain flat ground features and below half a cell in span.

## 2026-08-07 — UX acceptance uses one authored journey plus exhaustive fixtures

- The binding new-player journey is Grand Muster seed 18, driven from the real title UI through
  save/load, castle development, exploration, services, manual guardian combat, reward acceptance,
  replay validation, and the authored retirement outcome. Direct state injection is forbidden in
  this continuous path.
- A single campaign is not distorted to manufacture every modal variant. Exhaustive pending-choice,
  targeting, result, setup/save, transfer, ability, and hot-seat states remain synthetic fixtures,
  indexed by one compile-time coverage manifest and exercised by the acceptance review runners.
- Desktop and 390px evidence is required for all ten screen-matrix rows and eight walkthrough steps.
  Evidence may be reused when the same honest UI state satisfies multiple requirements; every
  reference must resolve to a generated pair.
- The adventure and combat headers may wrap at narrow widths. This is a presentation-only response
  to measured overflow and does not change their actions, availability, or deterministic results.

## 2026-08-09 — Guardian strength uses a bounded geometric stat rating (doc 39)

- The old `count × HP × average damage` heuristic is replaced by an additive per-unit rating based
  on `sqrt(HP × average damage)`, a small Attack/Defense term, a bounded Speed term, and a bounded
  list of stable ability-role adjustments. Matchup-specific abilities, hero state, and battlefield
  state remain outside the scalar rather than turning it into an opaque battle predictor.
- Deterministic paired-seat simulations set a ≤20% median break-even count error target and ≥80%
  decisive mixed-ordering target. The chosen expression reaches 14.5% versus 26.6% legacy error and
  orders 5/5 decisive mixed cases correctly. The simulation report is a checked offline artifact,
  never runtime behavior.
- Ordinary guarded-object routing keeps its 0.80 ratio. Immediate assaults and Siren listening move
  from 1.20 to 1.25 so their cushion matches the estimator evidence. Gatherer, Diplomacy, Quiet
  Horseshoe, Beastmaster, and Borrowed Legion ratios retain their explicit content contracts; the
  latter now derives Candle-Wisp count from the same centralized per-unit rating.

## 2026-08-09 — Dense maps are measured topology, not larger open fields (doc 40)

- The Crooked Crown establishes 72×72 as the largest current authored-map contract and remains a
  normal four-player selectable conquest scenario. Its four corner starts, twelve shaped chambers,
  dogleg corridors, perimeter and central loops, oblique links, blind reward pockets, and guarded
  shortcuts are committed deterministic data.
- Dense-map acceptance pins start-route divergence and opening pickups, guarded reward and intended
  gate coverage, at least 100 interactive objects, at least 5% interactions per passable tile, at
  least 68% shaped/decorative terrain, at least 450 road tiles, and no unbroken passable square
  larger than 10×10. The accepted map reaches 109, 6.34%, 74.0%, 575, and 9×9 respectively.
- Guardian stack counts derive from authored target strengths through doc 39's centralized
  `unitStrength` function. The accepted normal-difficulty armies span 89.00–350.79 rating with a
  178.01 median; no map-local combat heuristic is introduced.
- The linked Country Lords overview is a composition reference only. No external art, text,
  scenario fiction, object coordinates, or exact route geometry is copied. Existing original
  terrain, mountain, object, hero, castle, and guardian assets render the new authored data.

## 2026-08-09 — Adventure structures use one contextual dialog (doc 41)

- Explicit adventure-structure services leave the hero rail and open one shared modal frame on
  arrival. The frame owns identity, flavor, exact reducer-projected terms, unavailable reasons,
  inspection, focus containment, safe Escape/cancellation, and map-input blocking; structure kinds
  supply only their catalog-backed content and canonical actions.
- Every registered map-object kind has an exhaustive presentation route: contextual dialog,
  existing rules-choice dialog, transient notice/log result, map control, combat/navigation, or
  deliberately non-actionable. This catalog is a static UX gate, not a second behavior registry.
- Hedge School payment now receives the same explicit confirmation as the other irreversible
  structure actions before dispatch. Its seeded permanent lesson remains non-cancellable after the
  canonical payment action creates the pending choice. Passive visits keep their existing immediate
  reducer outcome and transient feedback; no replay or rules schema changes.

## 2026-08-09 — Castle army transfer is direct and reducer-projected (doc 42)

- A visiting hero and the castle garrison use two opposing seven-slot rows. Selecting a company and
  then a legal target immediately dispatches a full move, merge, or whole-company swap. Partial
  transfer is an explicit compact mode because the exact count is the only additional decision.
- Every candidate target is projected through the real `TRANSFER_ARMY` reducer path. Illegal
  targets remain focusable and expose the reducer reason; presentation does not maintain a parallel
  transfer-rules table. Same-holder splitting continues to dispatch `SPLIT_ARMY`.
- Warden installation, ownership/adjacency/visiting checks, count and identity conservation, and
  seven-slot bounds remain core-owned. Remote castle inspection shows the true garrison but no
  unusable transfer form. Adjacent-hero exchange keeps its existing confirmation flow.

## 2026-08-09 — Friendly hero meetings route to verified adjacent tiles (doc 43)

- Friendly and enemy hero targets are distinct map verbs: exchange arrows and an accessible Exchange
  label for friends, crossed swords and Attack for enemies. Activating another friendly hero no longer
  changes selection.
- Non-adjacent meetings choose the least-cost safe legal adjacent destination, with y then x as the
  stable equal-cost tie-break. Heroes, active footprints, castles, thickets, guardians, and active
  aggro are excluded from meeting endpoints; ordinary mixed-domain pathfinding owns the route.
- The UI records only `MOVE_HERO` and existing transfer actions. It opens exchange after post-reducer
  validation of completion, adjacency, life, ownership, phase, pending choices, and endpoint legality;
  invalidated or interrupted intents end with a visible reason.
- Work order 41's structure modal continues to block map activation. Work order 42's castle-specific
  direct-transfer mode is unchanged. Hero exchange retains confirmation and currently exposes armies
  and consumables only because no explicit hero artifact-transfer action exists.

## 2026-08-09 — Non-adventure screens are task surfaces, not reference pages (doc 44)

- Every bounded non-adventure surface has one executable inventory row naming its job, essential
  state, primary action, and reference route. Static validation requires representatives for setup,
  hero, castle, combat, spellbook, choice, result, and save/import rather than treating a screenshot
  list as the coverage contract.
- Current state, cost, availability, disabled reason, confirmation, and ordinary action stay visible.
  Flavor, comparisons, historical statistics, and rules prose move to inspection, contextual Help,
  or local disclosures. On narrow screens a bounded overlay owns one scroll region while the page is
  locked, and persistent help controls receive reserved space instead of covering task controls.
- Castle uses Town, Recruit, Army, and Services task tabs while retaining doc 42 direct transfer and
  doc 43 hero-meeting behavior. Spellbooks reuse existing imagery and reserve clean content slots;
  the full spell/skill icon catalog remains separate work. No adventure shell, reducer, save schema,
  deterministic action, or canonical rule changes are introduced.

## 2026-08-09 — Adventure chrome is for routine turn decisions (doc 45)

- The map owns the desktop viewport. Persistent adventure chrome is limited to a compact resource,
  date, turn, and omen strip plus a narrow minimap/navigation/selected-hero/army/command/status rail.
  The linked Heroes III image supplied information hierarchy only; no art or ornament was copied.
- Hero stats and prose, company splitting, equipment/backpack/Debts, consumables and cache tools,
  expanded skills and special controls, save/import/export/share, motion, and activity history move
  to explicit Hero Details, Menu & Saves, spellbook, and contextual target surfaces. Removal from the
  rail never means removal of a legal action.
- Docs 41–44 remain composed rather than replaced: structures stay contextual, castle transfer stays
  in Castle · Army, friendly meetings retain post-move exchange, and bounded non-adventure screens
  retain their focused task hierarchy. Core actions, deterministic state, saves, and replay do not
  change; full PixelLab spell/skill icon work remains deferred.

## 2026-08-09 — Spell and skill icons are final-resolution catalog assets (doc 46)

- Every canonical spell and secondary skill owns one distinct 32×32 transparent PixelLab bitmap.
  Native 32px and exact ×2 review/choice presentation are the only supported display scales; the
  selected provider bytes are never resampled, redrawn, or used as rules data.
- PixelLab `generate-image-v2` currently returns 64 unique still-image alternatives for one seeded
  asynchronous request. Icon jobs therefore record one receipt and its 64-variation response rather
  than falsely claiming two independent provider submissions. Runner and catalog gates confine this
  exception to that endpoint, require the declared response count, and retain the background-job ID.
- A data-derived icon worklist and separate declarative manifest follow the canonical 68-spell and
  21-skill registries. Accepted selections, literal job prompts, receipt provenance, prompt/asset
  hashes, dimensions, alpha, unique paths, and unique image content are all executable gates.
- One shared semantic image component supplies the asset across spellbooks, choices, targeting,
  enchantments, guild/Palimpsest services, Hero Details, and inspection. Names and full school,
  mana, active version, rank, rules, keyboard, focus, and disabled-reason text remain independently available.
  The linked Heroes II material informed icon-led scanning only; no supplied art was copied.

## 2026-08-10 — Advanced combat uses six real slots and derived setup authority (doc 49)

- The Sixfold Trial extends the canonical configurable pipeline to `p1`–`p6`. Each slot owns its
  castle and hero and participates independently in controllers, factions, turns, fog, outcomes,
  saves, replays, links, hashes, and battle ownership. Grand Muster's allied-castle shortcut remains
  specific to that older visual sandbox.
- Older maps retain their historic four-player serialized state shape so golden saves and hashes do
  not drift merely because two IDs became available. Six-slot records are present only when the map
  actually declares six players.
- Showcase armies derive every tier count as two weeks of canonical unit growth. Spellbooks derive
  every member of both configured faction schools through the spell catalog, including provenance
  entries. Developed castles derive their two faction-special buildings from the building catalog;
  the showcase does not keep parallel hand-authored recruit or spell-number tables.
- Heroes begin advanced but one chest below their next level, making the 36 canonical chests useful
  for progression without inventing a special chest reward rule. Guardian counts use doc 39's
  strategic strength function and populate four executable bands; premium artifacts remain behind
  ordinary linked guardian interactions.

## 2026-08-10 — Local and built-in maps share one portable authoring document (doc 50)

- The in-game editor authors a versioned, JSON-only `.vam-map.json`; it owns initial map facts but
  never movement, occupancy, setup, reward, or combat rules. One pure schema/codec/validator supplies
  editor diagnostics, import/export, test play, runtime conversion, map lint, and promotion.
- Player ID is the canonical flag color. Castles and starting heroes store owner and faction
  independently. Newly placed heroes derive a small nonempty company from catalog `hireArmy`, while
  guardian stacks accept any catalog creature and explicit positive counts. Guardians and rewards
  remain separate linked records.
- Editor drafts and immutable revisions use the campaign storage adapter but a separate namespace.
  The five-field campaign save remains unchanged; a local `mapId` resolves an exact document ID,
  revision, and map hash, and reconstruction refuses a missing or mismatched map instead of silently
  choosing another revision.
- Built-ins are cloned into ordinary portable records, including their start setup. Promotion checks
  the validated exported JSON into the authored-map catalog and registers it without repainting or
  transcribing the map into TypeScript.
- New map metadata and conquest objective text receive usable defaults; the advanced details editor
  is collapsed by default. Palette choices are icon-first and retain accessible names/tooltips, with
  six direct faction castle stamps and selected-entity inspectors owning detailed text controls.
- Guardian placement uses decreasing tier base counts 48/30/20/12/6/5 plus stable ±20% variation.
  Random-tier guardian stacks are authoring discriminants, never fake `UnitId`s: conversion hashes
  campaign seed, guardian ID, stack index, and tier into a concrete non-battlefield creature. Saves
  and replays therefore retain ordinary resolved stacks without ambient randomness.

## 2026-08-10 — Cities, spellbook hierarchy, and exhaustive collectible art (doc 51)

- City is the canonical player-facing settlement term. Internal `Castle`, `castles`, and related
  serialized identifiers may remain compatibility names. Every city changes to exact 5×2 ground
  contact with its only entrance at centered offset `(2,1)`; maps and neutral variants cannot
  override either value. Existing 3×2 sprites and authored placements require a later explicit
  migration and may not be stretched or silently treated as conforming.
- A neutral city with omitted `garrison` deterministically receives the faction's tier-1, tier-2,
  and tier-3 city units, in tier order, each at exactly three times canonical base weekly growth.
  Difficulty, omens, buildings, elapsed weeks, and recruit state do not modify this initialization.
  Presence is the override boundary: `[]` is intentionally empty, a legal nonempty army wholly
  replaces the default, and null/partial/additive/random-tier forms are invalid.
- Each faction city owns an explicit architectural subject derived from S08 materials and silhouette
  laws. Content IDs and faction names remain metadata, never adequate image prompts. The Unfinished
  city is complete and tended rather than ruined; Hagwood and Wildergrass settlements do not acquire
  generic stone keeps merely to read as cities.
- The supplied Heroes III spellbook image informs only open-book hierarchy, icon scanning, school
  navigation, compact mana display, and selection-to-detail flow. No supplied art, layout
  measurements, ornament, typography, cell design, or tabs are copied. This game's spellbook groups
  learned spells under accessible Rite/Craft/Grave/Wild tabs, keeps icon/name/mana visible, and uses
  a separate selected-spell detail and Cast action.
- Player spell-version copy is Standard, Upgraded, and Upgraded here; “face” is not a spell-upgrade
  term. Learned and temporarily active upgrades remain visibly distinct. Internal `base`, `plus`,
  `upgradedSpells`, and item `plus` fields stay compatible and map to clean copy at presentation.
- The catalog baseline is 90 artifacts and 37 items. All 127 require distinct 32×32 transparent
  native sprites and literal physical subjects. Current installed coverage is 0/90 artifacts and
  4/37 items; subject inventory is not bitmap coverage. Six replacement 5×2 city designs are also
  all pending. Four pickups and four resource sites are already native, but the Essence site is
  pinned as a rural stone-and-copper stitchwell over a hairline world-seam, never a generic glowing
  crystal mine or wizard fountain.
- Cities, resources, artifacts, and items share bright cartoony storybook pixels, true alpha, a
  high-oblique non-isometric camera, south-east/screen-lower-right key light, and north-west shadow.
  Physical subject descriptions live in `assets/adventureSpriteInventory.ts`; opaque names, terrain
  plates, scenery, text, frames, baked rarity, owner colors, and baked flags are rejected.

## 2026-08-11 — Combat and adventure share one selection-first stitched spellbook (doc 51)

- Both casting contexts adapt their rules into one catalog-ordered presentation component. The
  shared layer owns the open-book composition, canonical school tabs, large icon grid, selected
  detail, upgrade marker, Debts, and responsive navigation; it never owns or duplicates casting
  legality.
- A spell grid cell is a selection button only. The explicit detail-page Cast control is the sole
  route from the book into existing combat or map targeting, so inspection cannot spend mana or
  movement. Combat includes map-only spells and adventure includes combat-only spells as learned,
  disabled entries with an exact cross-context reason.
- Permanent upgrades use a gold upward stitch plus **Upgraded**. Temporary specialty, skill, Kit,
  or resonance activation uses **Upgraded here** and its reason. Internal `base` and `plus` values
  remain engine and save compatibility fields; all semantic copy at and beyond the catalog boundary
  uses Standard and Upgraded.
- Wide layouts keep the selected detail on the facing page. At narrow widths the same DOM reading
  order becomes a bounded list/detail sheet with 64px icons and persistent Back, Cast, and Close
  actions instead of compressing the desktop book.

## 2026-08-11 — Mountain topology may overlap whole sprites but never slice opaque sides (doc 52)

- Every composed mountain piece selects a native bitmap whose width exactly equals its horizontal
  contact. Four- and five-cell shapes and long tails overlap complete landforms instead of exposing
  an internal centered crop. Authored terrain remains the sole collision and pathfinding authority.
- Rocky one-cell columns and vertically joined two-cell shoulders are distinct native roles. The
  existing knolls, ridges, and six-cell boundary/backbone forms retain their native scale, anchor,
  painter order, deterministic selection, and legal northern overhang.
- Production, showcase, browser evidence, and static gates use the same geometry authority. A
  width/contact mismatch is an error over every built-in placement, not a CSS seam to hide.
- Generated candidates remain subject to composition review after alpha acceptance. The first
  column-3 was retained and rejected as a corkscrew; its corrective broken-crag edit is the selected
  source with complete prompt/output/source/final provenance.

## 2026-08-11 — Spell mechanics use stable semantic references (doc 53)

- Reusable spell concepts have stable lexicon IDs independent from their player wording. A
  structured rule token references an ID and may supply a contextual label; plain-text consumers
  deterministically render the same sequence without losing readable rules.
- The lexicon explains shared mechanics but never owns executable behavior. Each of the 68 spells is
  mapped to its real resolver branch, while ordinary language is retained through explicit audited
  disposition buckets rather than an implicit exclusion list.
- Literal visual subjects are inventory for a later image work order, not generated-icon coverage.
  This work does not generate art or rewrite the 68 Standard/Upgraded catalog descriptions.
- Bloom's implemented fixed spell amounts and shared counter lifecycle are documented and tested
  through real resolver functions. Its lack of default Spell Power counter scaling is recorded as a
  pre-existing S05/runtime mismatch; this no-mechanics work does not choose either correction.

## 2026-08-12 — Shared spell terms own exact native visual references (doc 54)

- Each of the 30 canonical spell-lexicon IDs owns one distinct shared 32×32 effect icon derived
  from its exact `visualSubject`. These are mechanic references, not substitutes for individual
  spell-card art.
- Generation uses one separate built-in call per asset, retained keyed sources, and one deterministic
  local hard-alpha bake. Exact prompts, provider outputs, sources, finals, hashes, selections, and
  rejected attempts are immutable provenance rather than reconstruction notes.
- The shared renderer is manifest-backed and has no glyph, emoji, or generic fallback. Later UI may
  consume it, but this work does not wire tooltips or rewrite spell descriptions.
- A generated attempt is retried only for a real semantic/style rejection. The first `wall-hex`
  omitted the required enclosing hex and is retained as rejected; its single corrective retry is the
  selected source.

## 2026-08-12 — Player spell rules report resolver truth (doc 55)

- Rite and Craft Standard/Upgraded descriptions are authored as structured lexicon-token sequences;
  legacy `base`/`plus` strings are exact projections rather than an independent prose source.
- Existing IDs, costs, kinds, targeting metadata, and mechanics remain unchanged. Description work
  follows observable resolver behavior when older prose promised more than the game performs.
- Standard of Dawn, Unmake, and Standing Mirror therefore use the same complete rule for Standard
  and Upgraded. Developer-facing mismatch detail stays in docs/tests rather than player prose; this
  does not waive the design law that every upgrade should eventually change behavior.
- Census and False Colors explicitly disclose that their stored duration/display records currently
  have no visible gameplay consumer. Salt the Vein omits its nonexistent lost-production reveal;
  Summon Skiff states its owner-neutral selection and ownership-preserving move.
- Grave and Wild remain on legacy strings until their own audit. The combined presentation record is
  intentionally partial so those schools can adopt the same contract without changing Rite/Craft.

## 2026-08-12 — Every spell rule is a resolver-true structured projection (doc 56)

- Grave and Wild now use the same structured term-token contract as Rite and Craft. The combined
  presentation map is a complete typed 68-spell record, while the accepted Rite/Craft data remains
  unchanged.
- Bloom states its implemented fixed 3/4 application and delegates healing, cap, decay, and
  no-resurrection semantics to its glossary token. Overgrow states that it includes the selected
  company and that counter mutation can affect later copies; Sour states its actual eligible effect
  kinds and either-side enchantment behavior.
- Runtime-identical Shed Skin and Hedgerow March versions repeat the same complete player rule.
  Shed Skin remains ally-only with priority removal and no spread; Hedgerow March discloses its inert
  enchantment. Missing mechanics stay documented rather than being invented in player copy.
- Cold Road's unrestricted distance/connectivity, Wild Growth's City-only stacking, Death's
  Ledger's Barrowfield-object reveal, noncontiguous Murmuration, and the other doc-56 findings are
  presentation corrections only. No resolver, target, cost, acquisition, or save behavior changes.
