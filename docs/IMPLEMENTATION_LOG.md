# Implementation Handoff Log

Brief checkpoints for continuing the full-spec implementation. This is not a substitute for
`DECISIONS.md`. Entries through 2026-08-05 are historical handoffs. Live status, dependencies, and
next concrete work moved to Beads on 2026-08-05; use `bd prime`, `bd ready`, and `bd show <id>`.
New implementation checkpoints may still be recorded here when they preserve useful technical
provenance, but this file is no longer the task tracker.

The authoritative continuation guide for the 2026-08-04/05 terrain entries is
`docs/36_TERRAIN_TRANSITIONS.md`. It distinguishes current production wiring from the approved Wang
vocabulary that remains to be selected directly at runtime. Live terrain work is tracked under
Beads epic `vibes_and_magic-6sf`.

## 2026-08-05 — HoMM2 image boundary and original terrain replacement

- Inventoried raw HoMM2 screenshots, exact crops, mixed generation guides, shipped placeholder
  fields, transition strips, and stale review screenshots by provenance, path, and content hash.
- Added precise ignore coverage and an automated non-ignored-image fingerprint scan; textual design
  references and original PixelLab jobs/prompts/provenance remain commit-visible.
- Generated and promoted eighteen native original PixelLab terrain cells for all nine base/bridge
  materials. Production, tests, and browser review now use `NativeTerrainSurface` and original
  generated patterns without changing the SVG transition grammar or gameplay terrain data.

## 2026-08-05 — Terrain variation and canonical-family showcase

- Expanded the H2 reference pass from quiet interiors alone to deterministic quiet variation,
  sparse map-scale decoration, and eight explicit native transition-variant rows. Transition cells
  remain temporary reference studies; the organic renderer continues to own geometry.
- Added a second empty 54×26 showcase for Deepwood, Mosswold, Ashsteppe, Barrowfield, Lacquer Flats,
  and Mire. Production display now retains these canonical visual identities while the rules-facing
  terrain grid remains unchanged. Dirt and Beach remain the shared intermediary materials.
- Added exact-native H2-derived generation guides and PixelLab job records for six Wang families
  plus twelve micro/macro detail studies. Prompts encode one human-sized cell, 1–5px incidental
  details, and 8–14px maximum flat ground marks. Live PixelLab generation selected and promoted 96
  Wang cells, six micro cells, and two larger ground marks without resampling; rejected oversized,
  erased, checkerboard, and palette-drift candidates remain review-only provenance.
- The new SVG surfaces mount no canvas. Focused terrain tests, the production build, browser smoke,
  native standalone reviews, and the unchanged mountain compositor review pass.

## 2026-08-04 — Native terrain-transition showcase and compositor

- Returned the global adventure-map renderer from ×2 to native ×1: 32×32 terrain cells now occupy
  32×32 display pixels. The existing mountain family, compositor, collision footprints, painter
  order, and native PNGs were not changed.
- Reverse-engineered `docs/h2_terrain.png` as a two-bridge composition grammar rather than a giant
  pairwise transition table: Beach mediates water/land and Dirt mediates incompatible land/land.
  The adapter maps canonical game terrain to nine temporary visual families without altering game
  terrain IDs, movement, resonance, skins, authoring data, or save state.
- The production compositor remains DOM/SVG: it converts deterministic native-pixel ownership into
  nine horizontal-run paths filled by 288×288 PNG patterns. An initial offscreen-canvas prototype
  was removed after the doc-31 compliance audit; browser reviews assert that no canvas is mounted.
- Added a selectable standalone 60×42 empty terrain showcase and a reproducible native screenshot
  command. Its fixture exercises corners, concavities, islands, one-cell channels, peninsulas,
  holes, direct Dirt/Beach joins, and crowded multi-terrain junctions.
- Focused terrain and unchanged-mountain tests pass, the production build and browser smoke pass,
  and Grand Muster native sections r1c3/r2c3 show coherent transitions beneath production props and
  mountain ranges with no in-scope glyph fallback.

## 2026-08-03 — Lance Knight footprint and Unfinished combat roster

- Lance Knights now occupy two horizontal combat hexes like Oriflamme Wyverns. Their existing
  192×128 sprite is centred over both cells; deployment, movement, collision, adjacency, and attack
  legality inherit the shared footprint rules.
- Added combat art for Candle-Wisps, Couriers, Sentries, Bone Choir, The Brides, and The Ferry.
  Their fixed per-unit presentation scales preserve the intended tier progression, with the Ferry
  remaining the faction's dominant two-hex silhouette.
- Generalized the combat review to accept a faction argument and added
  `npm run review:combat:unfinished`. Both Hearthguard and Unfinished mirror battles reject missing
  sprites, incomplete rosters, clipped hexes, and clipped sprite canvases.
- Verification: 418 tests pass, production build passes, both faction review captures pass, and the
  browser smoke completes through animated combat damage and the result dialog.

## 2026-08-03 — Combat framing and Hearthguard scale pass

- Reframed the 13×9 SVG battlefield independently of the adventure-map pixel scale. The complete
  field now fits beside the combat sidebar, with enough top and side overscan for mounted and wide
  creatures on the outer deployment rows.
- Moved creature contact points from hex centres to the lower horizontal edge. Two- and three-hex
  creature art is centred over the whole occupied footprint rather than the leftmost rules anchor.
- Added per-creature presentation scale for the Hearthguard roster, using the opaque image bounds
  and tier silhouette rather than treating every 128×128 or 192×128 source canvas as equal-sized.
  The Yeoman is compact, the Bannerman reads taller, mounted units carry more mass, and the
  Oriflamme Wyvern is the roster's largest silhouette.
- Added `npm run review:combat`, which renders all six Hearthguard types on both sides and rejects
  glyph fallbacks, incomplete rosters, clipped hexes, or clipped sprite canvases before capturing
  `.pixel-work/review/combat/hearthguard-lineup.png`.

## 2026-08-03 — DOM adventure-map performance pass

- Replaced the adventure screen's per-tile pathfinding loop with one bounded, deterministic
  priority-queue traversal that respects terrain costs, boats, passages, occupied endpoints, and
  guardian interception.
- Replaced sorted-open-set path searches with a deterministic binary heap and cached road/seam
  coordinate membership during a map state's lifetime.
- Removed redundant SVG groups around every terrain hitbox and collapsed the minimap's per-tile
  rectangles into one SVG path per visible terrain color. The renderer remains DOM/SVG; no canvas
  dependency was introduced.
- Added structural sharing for hero-selection actions so selecting one of Grand Muster's six heroes
  does not clone immutable map and castle content.
- Headless browser baseline on the same machine: Grand Muster reaches an interactive frame in about
  0.7 seconds, ordinary map clicks take about 50 ms, and adventure-map DOM size fell from roughly
  7,100 to 3,150 nodes.

## 2026-08-03 — Grand Muster showcase map

- Added the 56×44 Grand Muster sandbox, now the largest authored map. Its fixed setup gives the
  human all six faction castles and one matching full-roster hero per castle. Every castle has all
  six dwellings prebuilt, and the player receives showcase resources.
- Added six linked static sparring guardians just beyond safe castle entrances, 21 resource piles,
  four mines, all-school shrines, all-faction dwellings, and broad rows of visit, economy, reward,
  recruitment, and scavenging structures. Discontinuous mountain chains, mixed terrain regions,
  roads, and a lake exercise the adventure composition at scale.
- The remote second player is forced to the established Dormant controller and starts at the far
  southeast castle. Added fixed-setup, full-roster, distance, dormancy, and clean-map tests; extended
  save hashing/validation, menu selection, worklist derivation, lint, and documentation.

## 2026-07-31 — Expansion continuation

- Audited the worktree and confirmed Expansion Phase A was already implemented. Baseline:
  258 tests and production build green.
- Began Phase B. Added all 36 six-tier faction units from doc 14, all unit tags/ability IDs,
  T6 dwellings/recruitment, the four new faction definitions, selectable factions on the title
  screen, and four seedable tavern heroes for each newly playable faction.
- Added generic/core behavior for the new factions: Unfinished death backlash/last-light/
  recursion/free-move choice/unlimited retaliation/dirge scaling; Vespiary repair, brood,
  Web, resin, skim, post-battle rendering, and return movement; Hagwood luck, Hex, boundary,
  push/beckon, thickets, Walking Hut relocation, and spell discount; Wildergrass blood-price,
  drums, pack bonus, trample, skirmish movement, undergrass, and storm splash. Added Ark
  recovery and Wyvern meter hooks.
- Added `phase-b-factions.test.ts`; current verification is 270 tests passing and `npm run build`
  green. Balance simulations intentionally not run per request.
- Phase B still needs a final requirement audit and any interaction refinements. Phase C
  (complete spells, bargains, and item catalog) has not started. Phases D/E and the broad UI
  polish pass remain after that.

## 2026-07-31 — Phase C checkpoint

- Added the 68-spell catalog, Wild school, provenance spells, new combat resolvers, generic scrolls,
  all fourteen combat and ten adventure consumables, and the six migrated trinkets remain wired as
  artifacts. Added map casting with mana/movement costs, persistent gates/thickets/resonance,
  battle-site records, weekly effects, mine suppression, and a dedicated adventure spellbook.
- Added all eight bargains, two-Debt cap, concrete scheduled handlers, Hagwood level-draft access,
  Debt UI, no-retaliation battle charges, Peddler scroll stock/sales, and deterministic offers.
- Verification at this checkpoint: 335 tests pass and the production build is green. Balance
  simulations were intentionally skipped. Next: finish the remaining Phase C sourcing/UI audit,
  then Phase D castle trees and siege-lite.

## 2026-07-31 — Full expansion handoff

- Completed Phases B–E: six factions and T6 rosters, 68 spells, 21 three-rank skills, full
  consumable/artifact catalogs, omens, eight bargains and persistent Debts, common/faction castle
  trees, siege-lite, Crosstitch four-player map, creative objects, provenance rewards, and the
  Tailor's Kit. Added installed-Warden, Beastmaster join, Maker-wall, Walking-Hut choice, rare
  chest artifact, dormant-building, and Wayward-Crone integration during the final audit.
- Completed the UI pass: map/player/faction setup, faction-colored heroes and castles, paper doll,
  Kit bonuses/Unstitch, Debt countdowns, omen and resonance displays, creative-site services,
  combat buff/debuff pips, attack/damage/death feedback, and red out-of-range route previews.
- Final verification: 354 tests in 26 files pass, `npm run build` passes, and `npm run smoke`
  passes save/load → castle → adventure movement → combat animation/inspection → result.
  Balance and exposure simulations were skipped as requested. See `DECISIONS.md` for the small
  deterministic-choice and reserved-Skiff judgments; no implementation work is queued.

## 2026-07-31 — Flavor and inspection follow-up (docs 22–23)

- Replaced the four provisional expansion-faction rosters with the sixteen authored Chandler,
  Broodspeaker, Crone, and Ashrider heroes. Added all 24 story paragraphs, corrected Vespiary,
  Hagwood, and Wildergrass class stats/weights, and wired all sixteen specialties through the
  shared combat, spell, debt, rendering, and stack-setup rule paths.
- Added authoritative flavor to units, spells, buildings, artifacts, consumables, skills,
  factions, bargains, battle tiles, map-object presentations, terrain labels, and hero stories.
  Content validators now reject empty flavor/story fields. Building cards also draw function,
  cost, and prerequisite lines from building data.
- Added a reusable inspection layer: desktop hover/right-click and Inspect mode, mobile tap/
  long-press, terrain name phrases without cards, and data-generated mechanics cards across map,
  army, recruitment, castle, spellbook, inventory, equipment, hero, combat counter/effect, and
  omen surfaces.
- Added a persistent per-player map-object discovery journal. Unvisited object types show only
  their honest flavor hint; visiting one permanently unlocks the type's mechanics for that player.
  Save format 3 records the journal and deliberately rejects older envelopes.
- Added eight focused content/journal/specialty tests plus save-format journal coverage. Final verification is 363 tests in 27
  files passing, production build passing, and browser smoke passing flavor-only map inspection
  plus a generated combat-unit mechanics card. Balance simulations were not run.

## 2026-07-31 — Map occupancy and big things (doc 24)

- Replaced reward-embedded guards with independent guardian map objects and orthogonal aggro
  zones. Movement now stops and starts combat on zone entry, deliberate guardian attacks finish
  their move only after victory, overlapping zones resolve deterministically, and unspent movement
  survives a win. Piles, items, and chests support stationary 100-movement ranged pickup, including
  the intended no-aggro loophole; Forager R2/R3 extend that range to two/three tiles.
- Added footprint/entrance semantics throughout adventure movement, interactions, visibility,
  castle services, AI objectives, and rendering. Castles are 3x3 with a bottom-center entrance;
  mines are 2x2 with a bottom-left entrance. Border Marches and Crosstitch were re-authored with
  separate guardians and collision-free footprints.
- Added `npm run map-lint` and wired it into `npm test` through `pretest`. It checks bounds,
  footprint collisions, all-start entrance reachability, guard efficacy, and castle/start aggro.
  Both authored maps pass.
- Added horizontal 1/2/3-hex combat footprints, the specified size assignments, footprint-aware
  deployment, movement, combat AI, attacks/retaliation, range, auras and area effects, persistent
  tiles, forced movement, collision, and the named wide-unit ability paths. Combat renders wide
  stacks as spanning pills and exposes their slot consumption.
- UI now shades hovered guardian zones, marks aggro-crossing route segments and their trigger tile,
  highlights legal ranged pickups, outlines map footprints, and scales object visuals.
- Verification: map lint, production build, browser smoke, and 376 non-simulation tests pass. The
  deterministic balance-game test and balance league were deliberately not run per request.

## 2026-08-01 — Ship-Shape and Water (docs 25–26)

- Added retreat/surrender with payment, loot exclusions, tavern army retention and Ransomer hooks;
  adventure-only stack splitting with a slider/even dialog; proportional destruction scaling;
  neutral weekly growth/static caps; four global difficulty modes; roads, Mana Springs,
  per-map objectives, objective UI, and per-battle/campaign statistics.
- Replaced snapshot saves with deterministic five-field action saves, three-slot rotating
  autosave, numbered manual slots, file import/export, content hashing, mismatch policy, stable
  state hashing, and deflate/base64url game and battle links with size warnings.
- Added the minimap, two minimap sizes, fog/object/hero layers, click-to-pan viewport, and `M`
  low-detail world view.
- Added boats, coastal Shipyards, embark/sea/disembark path states, working Summon Skiff,
  amphibious/sea battle selection, deck/shallows movement, aquatic retrofits, four Driftfolk
  neutral units and their abilities, all water pickups/locations, naval AI plumbing, and the
  32×24 Torn Sound archipelago.
- Added focused Ship-Shape/Water mechanics tests and extended map lint to Torn Sound. Balance
  simulations remain intentionally excluded from verification. Final verification: map lint,
  387 non-simulation tests, production build, browser smoke, and whitespace validation pass; the
  legacy eight-week simulation test and the documented balance leagues were deliberately skipped.

## 2026-08-01 — Castle screen (doc 27)

- Added all 36 faction dwelling names and flavor lines, generated recruitment functions, canonical
  hall/guild/wall upgrade links, fixed grouped slot resolution, per-castle building bans, and
  prebuilt Taverns. AI and bargain building selection use the same faction/availability rules.
- Replaced the inline build list with uniform faction-palette SVG picture cards in gold, green,
  red, and grey states. Every card opens one detail dialog with flavor, generated function, live
  resource/prerequisite tinting, upgrade-line context, exact blocking reasons, and the build action.
  Building inspection gestures route to that dialog.
- Added focused content, Tavern/hiring, upgrade-chain, four-state, reason-string, and Treasury
  regression coverage, plus browser-smoke coverage for the card/detail/build interaction.
- Final verification: map lint, 391 non-simulation tests, production build, fresh-server browser
  smoke, and whitespace validation pass. The legacy eight-week balance simulation was skipped.

## 2026-08-01 — Terrain and discovery (docs 28–29)

- Added the ten-type gameplay terrain catalog, authored skins, deterministic unsaved decorations,
  native movement and battle speed, Mire/aquatic movement, road/seam precedence, all-school seam
  resonance, terrain-derived battle palettes/props/shallows, and authored adventure obstacles.
  Migrated Border Marches, Crosstitch, and Torn Sound and added future-map guidance in `MAPS.md`.
- Added neutral capturable towns and the Free Town, Old Seat, Hollow Town, and coastal variants;
  neutral vaults/garrisons, no growth/economy turns, AI valuation, the Hollow Town hesitation line,
  and Crown map-wide garrison intelligence/capture payout are integrated.
- Added all 28 discovery object kinds, recurring income/services, one-off and weekly visits, six
  guarded reward sites, scavenging, Cache/Patient Stone progression and dig action/UI, service UI,
  weekly stock, object flavor/inspection, registry validation, and coverage lint.
- Added 32 artifacts (including four non-unequippable Burdens and their removal conditions), twelve
  heroes and stories, specialty hooks, expanded sourcing/count validators, inspection details, and
  the major adventure/combat/market behavior hooks for the new artifact catalog.
- Added the committed 48x40 Manywhere sandbox with all terrains and registered object kinds, four
  neutral towns, six faction dwellings, six puzzle locks and the full Tailor's Kit, five Patient
  Stones, water content, dense linked guardians, 1–3 player setup, Dormant slots, `victory: none`,
  Retire, and simulator `--ai dormant` reproduction support.
- Added focused terrain/discovery tests and updated earlier catalog/golden expectations for the
  expanded authored content. Balance and exposure simulations remain intentionally excluded.
- Final verification: map lint, 397 non-simulation tests, production build, browser smoke, and
  whitespace validation pass. The eight-week regression and Manywhere stress league were skipped.

## 2026-08-01 — Doc 30 canonical spec refactor

- Reconciled docs 01–29 and the append-only decisions into nine system-oriented S-files under
  `docs/spec/`, with executable data catalogs as the numeric/string source of truth.
- Added section-granular normative coverage, a preserved future-content backlog, and a triaged list
  of unlogged code divergences. Archived docs 01–29 were moved byte-for-byte to `docs/archive/`.
- Added a local-link checker to test preflight so every spec reference to a data/code file must
  continue to resolve.

## 2026-08-01 — Ground-contact footprints (doc 32)

- Shrunk castles from 3×3 to 3×2 and mines from 2×2 to 2×1 while preserving every authored
  entrance coordinate. Castle and mine anchors move down one row, so only the former blocked top
  row is released; capture, spawning, services, garrisons, and guardian approaches are unchanged.
- Re-authored all four maps, updated runtime defaults, canonical S02/S03 rules, lint geometry, and
  footprint assertions. Map lint verifies the resulting non-overlap, reachability, and guard cages.
- Aligned strategy-objective scoring with guardian-safe execution, with an unrestricted fallback
  only when every safe route is blocked. This removes the deterministic chokepoint stall exposed by
  the freed rows without preventing the AI from fighting through a fully guarded crossing.
- Final verification: 402 tests in 33 files, production build, browser smoke, whitespace checks,
  and map/spec/asset lint pass. An eight-game, four-map, two-seed day-28 league reports zero crashes;
  the deterministic eight-week AI regression resolves normally.

## 2026-08-02 — Pixel-art regeneration catalog (doc 31 continuation)

- Regenerated fresh non-shipped style references for adventure objects/castles, all six hero-class
  locomotion laws, and the six playable-faction battle silhouettes. Exact built-in prompts and paths
  are recorded in `assets/prompts.md`; none of the sheets is resized or manifested as native art.
- Extended the SDK-based quiet PixelLab runner with explicit per-request output directories,
  worklist asset mappings, complete-catalog validation, and honest staged-job refusal. Generated
  40 small A1–D job files: 216 requests cover all 285 data-derived manifest assets.
- Phase D preserves the required empirical ordering: Hearthguard and Wound-Wrights flagship and
  prompt-only probes are ready, while reference probes and roster jobs remain staged until fresh
  flagship winners exist and the comparison verdict is logged. Production API submission is still
  unavailable because no PixelLab credential is present in the environment.
- Manifest normalization and asset lint now enforce centered eight-pixel baselines for hero and
  battle-unit canvases, including wide units. The documented SVG ownership fallback covers all four
  player colors while fresh keyed-pennant generation remains pending.

## 2026-08-02 — Live A1 regeneration and height experiment

- Restored live PixelLab generation after the environment restart and hardened `scripts/pixelgen`
  for current v2 synchronous/async responses, recoverable receipts, signed downloads, isolated
  `--only` runs, and current SDK authentication behavior.
- Added fresh native composition guides and selected twelve opaque 32×32 PixelLab terrain winners
  after 3×3 integer-repeat review. Promotion is machine-recorded in `assets/selections.json` and
  validates candidate location, dimensions, worklist identity, and ground contact before copying.
- Implemented the mandatory Deepwood comparison and retained seeded scattered 32×64 canopies with
  subject-proximity fading. Added deterministic non-overlapping 2×1 mountain-range placement and a
  selected transparent 64×96 bare-granite prop; both features are rendering-only.
- Added reproducible forest and mountain screenshot tools. Focused manifest/forest/mountain tests
  (11 tests), asset/job validation, production build, and the normal end-to-end browser smoke pass.
  A2 then added eleven topology-guided road masks and a regenerated Seam after real-map review.
  A3 replaced the failed Wang protocol with 30 per-variant guided Pixflux jobs and added a
  reproducible labelled 3×3 review sheet plus full-map Crosstitch/Torn Sound captures. Current
  fresh renderer coverage is 56/287; the remaining catalog still uses SVG fallbacks.

## 2026-08-02 — HoMM2-scale landscape proof

- Paused broad battle-roster generation and reduced the adventure-map visual review to five logical
  sprite types: continuous meadow field, hero, timber building, low mountain range, and castle.
- Raised the single integer pixel scale from ×1 to ×2, centered the scroll camera on the selected
  hero (including near map edges), removed reachable-cell and footprint lattices, and kept pathing,
  hit targets, fog, footprints, and serialized rules unchanged.
- Replaced per-cell Meadow texture selection with one native 128×128 PixelLab material field sampled
  continuously in world coordinates beneath the gameplay cells. Added a low broad 64×96 granite
  range whose irregular meadow/scree contact replaces the rejected isolated-triangle range.
- Added `npm run review:landscape`, which captures the cumulative hero → building → mountain → castle
  proof while hiding unrelated content. Final validation: 409 tests, asset/job/map/spec preflight,
  production build, landscape review, and the updated end-to-end browser smoke pass.

## 2026-08-02 — Landscape camera-lock correction

- Verified the live PixelLab OpenAPI camera controls and moved the proof structures to explicit
  low-top-down south-facing oblique Bitforge requests with isometric disabled.
- Replaced the rejected 128×128 olive field with a 256×256 rich meadow; regenerated the Hearthguard
  eight-direction rider to occupy more of its legal canvas; replaced the timber camp, mountain
  range, and Hearthguard castle with horizontal-contact, no-base candidates.
- Added transparent-padding repacking to `pixelgen`, exact-size H2 style-reference guides, a second
  deterministic range sprite, lossless mirroring, and saturated-reference-marker normalization.
  Mountain visuals are now 128×160 and alternate over unchanged map-derived occupancy.
- Updated the cumulative landscape review to wait for injected range images and show the accepted
  six-type progression at integer ×2. Broad battle-unit work remains staged.
- Verification: asset/job/map/spec preflight, 409 tests in 35 files, production build, cumulative
  landscape capture, browser smoke, and whitespace validation all pass.

## 2026-08-03 — Mountain composition handoff and map affordances

- The successful mountain treatment comes from separating gameplay occupancy from illustration:
  authored mountain cells remain the pathing truth, while deterministic multi-cell ridge sprites
  overlap those cells above the continuous meadow field. That removes grey tile seams without
  scaling one distinctive peak into every square.
- Small, low-top-down ridge modules compose better than isolated front-facing mountains. A useful
  set needs varied widths, heights, silhouettes, contacts, and overlaps; every range should share
  the map's grassy ground contact and avoid opaque rectangular backing pixels.
- Rendering a terrain as `null` is visually correct over a continuous field, but an empty SVG group
  has no pointer hit area. Every logical tile therefore needs a transparent full-cell hit rectangle
  so inspection, route preview, and destination selection remain independent from painted art.
- Resource piles now provide the canonical UI icon vocabulary as well as map art. Costs, balances,
  trades, choices, and pickup feedback use the same readable sprites instead of letter badges.

## 2026-08-03 — Six playable combat rosters complete

- Added and manifested 24 native battle sprites for Wound-Wrights, Vespiary, Hagwood and
  Wildergrass, completing sprite coverage for all 36 playable-faction creatures. A deterministic
  builder owns chroma cleanup, fixed-palette reduction, canvas fitting and bottom anchoring.
- Added faction-selectable mirror-battle review commands and accepted four 1440×1000 captures after
  checking all twelve rendered stacks per faction for complete roster coverage, clipping and glyph
  fallback. Combat stack sprites now paint in battlefield-depth order.
- Fixed two mechanics failures surfaced by these full-roster reviews: Skim no longer chains after
  retaliation kills its actor, and opposing Home Ground units reserve separate persistent-tile
  positions. Both cases are covered by focused tests.

## 2026-08-03 — Complete battle-sprite catalog

- Added the 14 remaining native battle sprites: five Gloaming Court, five Seamborn/siege, and four
  Driftfolk units. This closes the renderer catalog at 50/50 unit sprites and the full asset
  manifest at 322/322 entries.
- Added `scripts/buildMissingBattleRosters.py` for deterministic alpha cleanup, culture palette
  normalization, native-canvas fitting and contact-sheet output. Keyed project sources and literal
  generation prompts are retained alongside the earlier playable-faction pipelines.
- Extended combat visual review to accept special culture rosters and added dedicated npm commands.
  Reviews assert roster completeness, loaded PNGs, and screen bounds before writing captures.
- Tuned per-unit render scale without resampling final PNGs. The Sleeper occupies three hexes; the
  siege ram and hull-turtle occupy two; small plural groups and narrow objects stay legible at the
  shared lower-hex baseline.

## 2026-08-03 — Guardian-safe routes and combat pointing

- Adventure route selection now avoids every guardian footprint and aggro tile by default, while
  deliberately selecting a guardian or its aggro region admits only that encounter. Empty terrain
  and objects both travel on the first click; no double-click interaction remains.
- Guardians now expose creature identity plus the canonical Few/Several/Pack/Lots/Horde/Throng/
  Swarm/Zounds/Legion quantity bands. Eighteen authored-map creature types use dedicated 32×48
  adventure sprites and crossed-swords cursors replace the generic shield affordance.
- Combat hit testing moved to the complete occupied-hex polygons, including every cell of wide
  units. One left click attacks; right-click selects stats. Edge-sensitive sword aiming selects and
  displays the legal melee approach direction.
- Ranged attacks now animate a simple arrow before the existing damage/death sequence. The focused
  browser review proves full-hex right-click selection, ranged projectile → damage timing, and two
  distinct top/bottom melee origins; the full browser smoke still reaches and resolves combat.
- Both spellbooks now show flavor plus Base and Upgrade mechanics for every spell rather than only
  the currently active face.

## 2026-08-05 — Composable rocky mountain ranges

- Generated and promoted ten native-resolution PixelLab rocky mountain assets across knoll, ridge,
  and massif roles. The reproducible job, literal prompts, selected candidates, and deterministic
  no-resize promotion path are retained under `assets/` and `scripts/promoteRockyMountains*`.
- The initial small-piece compositor was visually rejected because it produced a necklace of
  separate 2×1 rock formations. Added two native 192×128 PixelLab backbone variants built around
  the corrected 45-degree south-looking camera and southeast light/western-shadow contract.
- Long rows now use overlapping six-cell continuous spines; north/south short slices use taller
  ridges so one-cell-wide arms connect. Authored terrain remains the sole collision/pathing truth.
- The dedicated eight-shape production-compositor screenshot now demonstrates compact, long,
  crescent, elbow, staircase, saddle, thin-hook, and bottleneck topologies without selecting
  individual sprites. Focused coverage includes every possible 3×3 mask and long one-cell runs.
- Follow-up visual review found the connected backbones still filled their complete bottom and side
  boundaries. Expanded the PixelLab base set from two to eight, derived eight matching no-resize
  transparent boundary forms, and made composition terrain-aware. Exposed segments now have low
  tapered ends and irregular bottoms; solid strip-filling forms are reserved for occluded interiors.
