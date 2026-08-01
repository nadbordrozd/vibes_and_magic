# Implementation Handoff Log

Brief checkpoints for continuing the full-spec implementation. This is not a substitute for
`DECISIONS.md`; it records progress and the next concrete work only.

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
