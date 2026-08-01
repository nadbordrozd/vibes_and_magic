# Implementation Decisions

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
- A base scroll uses its stored base face even under terrain resonance; a barrow
  scroll uses its stored plus face. Bottled Echo repeats the recorded face and, for
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
  legal counterpart. The + face uses the same deterministic choice in AI and headless play; a
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
