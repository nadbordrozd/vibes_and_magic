# Implementation Decisions

## 2026-08-14 — Docs 60–67 release acceptance is native, replay-stable, and UI-complete

- The final release profile resolves all docs-60–67 presentation by canonical ID: 192/192 v2 jobs
  and provenance records pass, the shipped manifest contains 808 entries with 804 unique byte
  payloads and four explicit aliases, and artifact/item coverage is 148/148 and 50/50. The
  development placeholder mechanism remains available for future migrations, but no current release
  surface may count a placeholder or fallback as installed coverage.
- Generic combat targeting must render every target-draft field produced by legal actions. In
  particular, creature `caster` actions expose their `spellId` choices as named, native-icon,
  inspectable buttons, and item school choices use the same visible choice group. This closes the
  acceptance-found gap where the reducer generated legal creature casts but the combat screen could
  not advance beyond the spell-choice stage.
- The canonical built-in content hash is `03e209e7`. A seed-424242 two-turn human/human proof retains
  the five-field action save, three logged actions, byte-identical strict replay, and matching state
  hashes `97dc3c06`. Schema v4 remains unchanged.
- Release acceptance excludes only the separately tracked adventure Knacks in
  `vibes_and_magic-0yv` and the user-deferred seed-1/day-56 no-winner regression in
  `vibes_and_magic-xm5.1`. The former remains intentionally outside the combat-Knack release; the
  latter is the sole expected full-suite failure and is not weakened or reclassified by this gate.

## 2026-08-13 — Docs 63–64 recalibrate only stable-direction strategic strength

- The docs 63 and 64 adjustment lists are exhaustive. Their nineteen stable-direction entries join
  the eight existing doc-39 roles at the printed values; matchup-, terrain-, casualty-, spellbook-,
  and player-choice-dependent traits remain outside the scalar. Additive ability value is still
  clamped to `[0.85,1.35]`, now through exported named bounds covered by exact catalog and clamp
  tests.
- The deterministic paired-seat calibration now reaches 13.6% median break-even count error versus
  24.6% for the legacy estimator and orders 6/6 decisive mixed matchups correctly. The existing
  guarded-object, assault, Siren, Gatherer, Diplomacy, artifact, skill, and bargain ratios remain
  unchanged; no consumer received a private strength formula.
- The generated report now derives its stable-adjustment table and both authored showcase rosters
  from executable authority. Crooked Crown pins twenty derived counts at strength 90.79–350.79 with
  median 181.57. Sixfold Trial pins eighteen derived counts and retains its published band thresholds,
  populated 4/4/5/4 across skirmish/field/elite/ordeal. Map lint, focused tests, and report drift
  checks fail if those progression fixtures move without an explicit recalibration.

## 2026-08-13 — Doc-62 combos, loop bounds, exposure, and stalls are executable

- All twenty numbered combo examples now own deterministic integration fixtures. Each complete
  JSON-safe operation log records setup transformations, loadout, round advances, casts, and attacks.
  A fresh fixture interprets the captured log through public battle/game reducers, asserts a
  qualitative state outcome rather than balance parity, and reaches byte-stable canonical state.
- Every one of doc 62's seventeen numbered loop rules has a direct executable rejection or bounded
  resolution. Stable public reason codes cover illegal copy/control/link/action/resurrection cases;
  legal finite effects expose their serialized cap, ownership, expiry, or consumption state.
- Quiet Yard, Standing Cold, and Attrition Wall first construct their relevant state through Wall of
  the Maker; Grave-Chill/Overgrow/Amplify/Ashen Pall; and Second Grave/Mourner's Veil/Hold the Line,
  respectively. Ordinary Defend actions then cross multiple complete rounds and resolve with the
  visible `round-limit` reason. No new tuning value or hidden anti-combo clamp was introduced.
- Two acceptance-found runtime gaps are resolved at their generic ownership boundaries. Upgraded
  Silence the Passing doubles each owning-side destruction trigger, including Ossuary, while the
  Bellows preserves Burn according to the pile's recorded source side rather than the afflicted
  company's side. Because a company stores one magnitude per counter, the latest successful
  positive application that increases the pile deterministically owns a mixed-source pile for
  source-side effects until another increasing application replaces that attribution or the pile is
  consumed/decays to zero. An application against an already-capped pile does not steal ownership;
  zero piles clear source and delayed-decay provenance. Unrelated opposing Burn still decays normally.
  Enemy Silence suppresses all of the owner's death triggers before any own Upgraded Silence
  doubling is considered, including Ossuary summons.
- Standard mind-control snapshots counter source and delayed-decay provenance with its existing
  magnitude/effect snapshot. Expiry restores that provenance when it clamps controller-era counter
  gains, preventing temporary control from changing later Bellows or decay ownership.
- Doc 62's global 124-spell denominator was arithmetically impossible for two 14-slot guilds and is
  corrected by S01/S09's authoritative “each relevant pool” rule. Two same-faction cities therefore
  measure their shared two-school pool of 62 spells. Across deterministic seeds 0–199, two complete
  Hearthguard guilds surface a mean 20.125 distinct Rite/Craft spells, or 32.46%. The authoritative
  4/3/3/2/2 deal remains unchanged.

## 2026-08-12 — Combat primitives share one typed boundary and stalls resolve at the fixed limit

- The eighteen doc-60 combat primitive contracts now each own exactly one executable handler at the
  contract's named stage in `src/core/combat/primitives.ts`. Catalog content composes these handlers;
  spell IDs do not define alternate copies of their rules.
- Invalid primitive requests return a stable code and inspectable English reason. Control history,
  links, clone provenance, granted-action counts, delayed triggers, resonance, hazards, destruction
  save claims, and termination reasons are serialized state rather than ambient resolver memory.
- Damage links are duration-bound serialized pairs between living companies. Every current combat
  damage path uses the shared one-hop router; already-computed damage routes once, never recursively,
  and either endpoint's destruction clears both directions. Impact damage consumes Ward as the next
  damage instance and applies its Upgraded rider when a source company is available.
  Counter copy/spread/convert/detonate similarly preserves or consumes resolved magnitude without a
  second Spell Power/application pass; detonation clears its pile before computing the payoff.
- Round 100 remains the last playable round. A still-live battle that would enter round 101 resolves
  by surviving original-owner non-summoned HP proportion (`originalSide ?? side`, including active
  mind control), with defender winning an exact tie, and records
  the visible `round-limit` reason. This makes the existing fixed simulation limit an engine rule for
  Quiet Yard, Standing Cold, and Attrition Wall stalls rather than introducing a new tuning value.
- `BattleStack.side` is tactical allegiance and therefore governs targeting, actions, friendly
  effects, and Grave Bargain eligibility during control. `originalSide ?? side` is persistent army
  ownership and governs elimination, surrender value, casualties, owner saves, metrics, and campaign
  army reconstruction; temporary control can neither eliminate nor transfer its original company.
- Executable primitive semantics advance `CONTENT_SCHEMA_VERSION`; the built-in content hash moves
  from the magic-foundation `f9402dc2` to `9d5eaa94`. The canonical five-field action-log save and
  local schema v4 do not change, and the seed-424242 two-turn state hash remains `8518cf35`.

## 2026-08-12 — Current magic uses a playable five-tier transition

- The binding starting-spell contract is one deterministic tier-1 spell from each faction school,
  not exactly two total known spells. Authored entries are retained and de-duplicated first. Corwin's
  Rally and Silas's Wither satisfy their matching tier-1 slot, while an authored spell never
  suppresses the other faction school. Above-tier identity spells such as Maud's Trial remain bonus
  entries beside both required tier-1 starts.
- Existing mana values are clamped into the doc-60 tier bands so all 68 current definitions are
  immediately valid and playable. The band invariant wins over doc 61's stale Trial prose: Trial is
  8 mana in this transition, because tier 3 cannot legally cost 6.
- Mage Guild dealing uses a dedicated seed/key stream and does not consume campaign RNG. Each slot
  rolls tier and school weighting explicitly. Because the current eligible catalog contains no
  ordinary tier-5 spell, setup emits a complete guaranteed 12-card level-1–4 prefix and Mage Guild
  5 construction fails with a concrete catalog message. It does not silently substitute a lower
  tier or weaken the level-5 own-tier guarantee; the generic dealer supports the full 14-card
  contract when eligible entries arrive.
- Default spell counter scaling is centralized at +1 magnitude per five Spell Power. Non-spell
  counter sources retain fixed behavior, and future catalog exceptions call the spell helper with
  an explicit opt-out rather than relying on an omitted scaler. Existing counter magnitude is
  already resolved state: Sour conversion, Reflect copying, Overgrow spreading, Shed Skin transfer,
  and future detonations use the raw counter path and do not receive Spell Power a second time.
- Daily and weekly use ledgers are ordinary JSON state on each hero and each player. The action-log
  save remains its exact five-field format and local schema v4: setup recreates empty ledgers and
  later explicit casts will replay their writes, so no parallel save envelope or migration is added.
- The complete current magic metadata, tier-aware pools, guild buildings, and seeded setup deal join
  replay authority through the existing catalog hash. At this phase boundary the built-in content
  hash is `f9402dc2` and the checked-in seed-424242 two-turn state hash is `8518cf35`.

## 2026-08-12 — Docs 60–67 use later explicit supersessions and a split asset gate

- The S-files remain the current authority under S00. Docs 60–67 are accepted implementation work
  orders, not a second specification layer: each rule becomes current only when its owning phase
  updates the affected S-file, executable catalog or handler, and this decision log in the same
  change. Until then, the existing S-file and executable data continue to describe shipped behavior.
- The final magic contract is exactly **124 spells**: 31 per school, with each school's tiers
  distributed 8/8/7/5/3. The final skill contract is exactly **30 skills** with the six-skill hero
  cap unchanged. Doc 66 supersedes doc 63 §4: it retains doc 63's three new skills and six reworks,
  then adds the six further skills and rank-three audit in doc 66. Doc 60's and doc 63's earlier
  24-skill amendment language is therefore an intermediate proposal, not the final count.
- Doc 65 extends rather than replaces doc 63 §2. The artifact catalog may pass through doc 63's
  110-definition intermediate state, but the final contract is exactly **148 definitions**:
  36 Vanilla, 44 Charm, 45 Relic, 13 Burden, 4 Kit, and 6 Trinket. No existing definition is
  removed to reach that composition.
- Docs 63 and 64 add exactly **thirteen** neutral/showcase creatures: the eight in doc 63 plus the
  five in doc 64. Doc 64's generic `caster` block governs creature casting; `hedge_caster` remains
  only its one-spell, one-charge case. Doc 64 also amends doc 62 §4: a hidden universal magic-
  resistance stat remains forbidden, while rationed deterministic resistance and immunity are
  permitted as printed, inspectable per-creature abilities.
- The current Knack scope is exactly **six combat Knacks**, one per playable faction. Doc 67 §6's
  six adventure Knacks remain deferred pending combat-Knack playtest and are tracked separately in
  `vibes_and_magic-0yv`; they do not enter this epic's schemas, catalogs, asset counts, or release
  acceptance.

### Development and release asset gates

- Development, automated-test, and playtest builds may resolve missing art for new docs 60–67
  content through deterministic typed placeholders. A placeholder is selected from semantic type
  metadata, never from ambient randomness or UI inference; artifacts use class and slot, and the
  other families use their declared content family/type. Placeholder identity is presentation-only
  and cannot supply or alter a content ID, rule, target, value, rarity, or accessibility name.
- This leniency applies only to the development readiness of new content. It does not turn a missing
  manifest subject, invalid content reference, unregistered handler, or missing semantic text into a
  warning, and it does not relax the accepted native assets of existing content.
- Release/shipping validation remains strict and fail-closed. Every shipped spell, skill, Knack,
  creature, artifact, item, site, and lexicon term must resolve by its own canonical ID to the
  required distinct native asset with the existing manifest, provenance, dimension, alpha, prompt,
  and uniqueness gates. A release build has no placeholder/fallback resolver; any unresolved ID or
  placeholder use fails the build. Completing those per-ID assets remains a release prerequisite,
  not a mechanics-development prerequisite.

### Implementation-phase amendment matrix

The rows below assign ownership of the required canonical amendments. A phase updates only rules
that its executable work has actually made true; later rows extend the same S-file rather than
pre-announcing unimplemented behavior.

| S-file | Owning implementation phase(s) | Required amendment when that phase lands |
|---|---|---|
| **S01** | magic foundation (`98f.3`); combo acceptance (`98f.20`) | Split target scaling into target-derived Toll effects and army-curve-bounded SP-scaled impact damage; record high finite draw/combo variance as intentional while loops, strictly-correct openings, and stalls remain degeneracy. |
| **S04** | combat primitives (`98f.4`); creature traits (`98f.11`); combat Knacks (`98f.9`); strength/termination acceptance (`98f.19`, `98f.20`) | Add impact-damage routing, control/link/copy/resurrection/action bounds, multi-hex retaliation and proportionality ordering, the shared Knack hero act, and the verified strategic-strength/termination rules. |
| **S05** | magic/acquisition foundation (`98f.3`–`98f.5`); spell batches (`98f.6`, `98f.7`, `98f.17`); Knacks and creature casting (`98f.9`, `98f.11`); items/sites and loop acceptance (`98f.16`, `98f.20`) | Add five tiers, mana/counter scaling, mass/time gates, generic primitives, five-level guild/acquisition rules, creature spell sources and printed resistance vocabulary, the non-spell Knack boundary, final spell behavior, and all visible loop bounds. |
| **S06** | hero/magic foundation (`98f.3`); Skills v2 (`98f.8`); combat Knacks (`98f.9`); artifacts/items and derived capacity (`98f.13`–`98f.16`) | Add two seeded tier-1 starting spells, the final 30-skill roster and draft gates, derived Knack/rank thresholds, 148-artifact and new-item ownership rules, and per-hero army capacity capped at nine. |
| **S07** | guild foundation (`98f.3`); adventure/economy artifacts (`98f.15`) | Extend the common Mage Guild chain through levels 4 and 5 with its costs/deal reveal, then record printed artifact exceptions to build, market, growth, debt, and income rules. |
| **S08** | combat Knacks (`98f.9`); thirteen creatures (`98f.12`); final presentation/assets (`98f.18`) | Add each faction's combat-Knack name/voice, place all thirteen creatures in their documented neutral cultures, and keep every new flavor, silhouette, and native-art subject within the existing faction/canon laws. |
| **S09** | schema and split-gate infrastructure (`98f.2`); every catalog/content batch (`98f.3`, `98f.6`–`98f.18`); final release acceptance (`98f.21`) | First define typed schemas, handler coverage, and distinct development/release asset validation; then update catalog-derived counts and invariants only as each batch becomes executable; finally pin 124 spells, 30 skills, 148 artifacts with 36/44/45/13/4/6 classes, thirteen new creatures, six combat Knacks, and strict per-ID release art. |

S02 and S03 still receive the deterministic action/state and adventure amendments named by their
own implementation issues; their omission from this ruling's required seven-file matrix does not
waive S00's same-change rule. Every implementation phase appends its concrete resolver or
compatibility rulings here rather than treating this prospective ownership map as evidence that the
code already conforms.

## 2026-08-12 — V2 schemas are phase-aware and schema contracts join replay authority

- The shared schema exposes all later docs 60–67 fields now, while executable catalogs migrate in
  dependency order. In the transition profile, a legacy definition may omit v2 fields completely;
  once any spell v2 field appears its tier/scaling/targeting core is atomic and all applicable mana,
  cantrip, time-gate, and handler checks apply. Final-mode count and distribution assertions are
  callable but are not run against the still-current 68-spell, 21-skill, and 90-artifact catalogs.
- Primitive contracts and executable handlers are deliberately separate registries. A known name or
  correct stage descriptor does not count as implemented behavior: a referencing definition fails
  coverage until exactly one concrete handler is registered at the contract's canonical stage.
  This prevents later content batches from making unimplemented mechanics valid through metadata
  alone and leaves the behavior work to their owning phases.
- Artifact-effect metadata, Knack definitions, and acquisition-site definitions also consult typed
  live executable registries; a nonempty handler string is never coverage. Their validators reject
  missing functions and stage mismatches, while registration rejects unknown and duplicate IDs.
  Final Knack validation compares against the exact six playable faction IDs, not a count of six
  arbitrary unique strings.
- Creature `caster` charges and cast power are represented only at company-definition scope; there
  is no unit-count multiplier field. Resistance rationing is catalog-derived (`resistant × 5 <=
  catalog size`), with the two-per-faction low-tier/school and three-global `spellbound` ceilings.
  Artifact-set membership is reciprocal and set thresholds strictly increase; skill offer gates are
  positive whole hero levels; Knack rank is derived from level at 1/6/12 rather than serialized.
- Development placeholder resolution accepts only entries explicitly marked as new docs 60–67
  content and derives a stable key solely from typed semantic metadata. Existing accepted content
  is fail-closed in every mode. Release mode accepts only distinct canonical native asset IDs and
  never returns a placeholder.
- `CONTENT_SCHEMA_VERSION`, the complete primitive contract table, and the typed artifact/Knack/site
  handler-ID catalogs now participate in the content hash. The built-in hash deliberately changes
  from `06c84a97` to `7fbf1d23`; the save remains the
  exact five-field payload and the local envelope remains schema v4. Old local saves use the
  existing visible content-mismatch warning, while URL/replay strict mode refuses them. No action or
  state migration is guessed.

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

## 2026-08-12 — Spell-mechanic help is semantic, shared, and non-authoritative (doc 57)

- Every reusable player-facing spell term opens one shared accessible glossary detail containing
  its native effect icon, canonical name, and single lexicon rule. Popovers are body-portaled and
  viewport-clamped; hover, focus, click/tap, Escape, close, outside input, and focus restoration are
  one component contract rather than surface-specific title text.
- The Spellbook consumes the authored Standard and Upgraded token sequences directly. Legacy
  catalog prose uses deterministic longest-match alias tokenization with word boundaries; ordinary
  language remains ordinary.
- Existing action buttons never contain glossary buttons. Their adjacent semantic copy or existing
  inspection route supplies the same definitions while selection, targeting, and confirmation
  behavior remains unchanged.

## 2026-08-12 — Spell rules pass a bounded independent player-readability gate (doc 58)

- A complete spell version is normally limited to 45 words, four sentences, and two strong clause
  separators. Only five named multi-effect records may reach 50 words, with the reason kept beside
  the executable exception rather than allowing an unbounded “complex spell” category.
- Resolver-identical upgrades repeat the same clean rule. The accepted equality set is exactly
  Standard of Dawn, Unmake, Standing Mirror, Shed Skin, and Hedgerow March; every other Upgraded
  projection must differ.
- Runtime truth includes material limitations even when they are subtle: split-stack reward
  proportionality, surviving-top-unit healing, all-or-nothing Guardian recruitment, copied-spell
  exclusions, and ownership-preserving boat movement all belong in concise player rules.
- Inline aliasing favors precision over maximal linking. Ordinary `barrow`, `forest`, `status`, and
  abbreviation `sp` no longer create glossary controls; canonical names and unambiguous phrases do.
- The browser acceptance pair must exercise a minimal spell (Bloom) and a complex effect spell
  (Standing Mirror), not only prove that one popover can open.

## 2026-08-12 — Hero management is one dashboard; equipment uniformity is visual (doc 59)

- Hero Details has one DOM reading order and no tabs: individual identity, primary stats and vitals,
  army, learned skills, equipped artifacts, backpack, consumables, and contextual special/status
  controls are present together. The supplied Heroes II screen informs the hierarchy and uniform
  artifact grid; the Heroes III screen informs density and selection/detail only. No external art,
  ornament, measurement, paper doll, or exact layout is copied.
- Ordinary click, touch tap, Enter, or Space opens concise details for a graphical entry before any
  consequential action. Equip, unequip, use, split, resonance, omen choice, Dig, and Unstitch remain
  separate explicit actions with the existing confirmation/targeting and reducer authority.
- All eleven artifact positions use identical presentation frames, but retain `head`, `cloak`,
  `amulet`, `weapon`, `shield`, `armor`, `ring1`, `ring2`, `boots`, `misc1`, and `misc2` under the
  hood. Typed catalog slots, `slotAccepts`, Burden locks, Seamstone, Kit rules, displacement,
  unlimited backpack, save schema, and replay are unchanged.
- Exact reusable native coverage is 21 skills, 90 artifacts, 37 items, 50 battle-unit portraits,
  and four resources. The true new gap is 79 assets: 36 distinct 96×96 hero portraits and 43 native
  32×32 icons (36 specialties, Attack/Defense/Knowledge, and Experience/Movement/Mana/Luck). Spell
  Power reuses the installed lexicon icon; the six faction movement sets do not count as distinct
  portraits.

## 2026-08-12 — Hero-dashboard identity art is catalog-owned and exact (doc 59)

- Each of the 36 canonical hero definitions owns one distinct 96×96 portrait whose generation
  brief includes its name, full story, class, faction, and specialty. The six faction movement
  sprites remain adventure locomotion art and are never a portrait fallback.
- Each of the 36 distinct specialty IDs owns one literal 32×32 physical-subject icon. Attack,
  Defense, Knowledge, Experience, Movement, Mana, and Luck own seven more; Spell Power deliberately
  resolves through the byte-stable installed spell-effect icon.
- Exactly one built-in generation call produced each of the 79 new sources. All were accepted after
  source, native, and exact-nearest 3× contact-sheet inspection; there were no rejected attempts or
  retries. The rejection ledger remains mandatory and fail-closed for any future regeneration.
- Deterministic local chroma removal, content fitting, restrained palette, and hard-alpha baking own
  production bytes. Manifest-backed shared renderers expose no fallback. This installs the asset
  family only and does not claim one-screen dashboard UI integration.

## 2026-08-12 — Adventure magic uses registered primitives and authored acquisition (docs 60–63)

- Seven generic adventure handlers own teleport, same-day terrain traversal, remote mana,
  production redirection, movement denial, prebattle conditions, and guardian intelligence. They
  return stable visible failure reasons, reject malformed replay payloads before mutation, and
  store every lasting result in replay/save state. Terrain-ignore movement crosses declared
  Mountain/Water domains through `MOVE_HERO` without a boat but cannot end there; it and radius
  teleport leave an embarked boat unoccupied at the hero's departure tile.
- Every shipped tier-4/5 adventure spell is time-gated. Beacon and Summon Skiff use per-hero daily
  ledgers; the player-wide Fickle Weather effect uses the player's weekly ledger. Death's Ledger is
  the only current spell mapped to a new primitive, and only its Upgraded guardian-intelligence rule
  uses that mapping; future spell IDs are not predeclared.
- Spell Tomes store one setup-seeded named spell. Chest and Reliquary Cairn sources cap at tier 3;
  tier-4/5 generic Tomes require locks or barrows; Reliquary of Pages is exactly tier 4. Generic
  pools fail closed for provenance spells and Summon Skiff. The Cairn Tome is globally consumed on
  first claim while the Cairn's artifact exchange remains repeatable.
- The Stacks, Wild Shrine, and Reliquary of Pages are registered map objects with explicit actions,
  inspection and editor routes. Manywhere and Border Marches each contain all three, and each Pages
  site is guarded. Their missing new art uses typed docs-60–67 development placeholders backed by
  staged production worklist requests, never an untracked asset omission.

## 2026-08-12 — Doc-61 P1 Rite/Craft is a complete executable 24-row batch

- The current transition adds eighteen spells and retunes Blessing, Census, Standard of Dawn,
  Trial, Forge-Spark, and Unmake, producing 86 total spells: 26 Rite, 26 Craft, 17 Grave, and 17
  Wild. Trial remains 8 mana because the already accepted tier-3 band supersedes doc 61's stale
  6-mana line; its 30%/45% effect is the retune. The eighteen additions are guild-eligible and use
  ordinary-scroll eligibility only where the tier/kind rule permits it.
- Wellspring and Dimension Door compose the registered remote-mana and explored-radius teleport
  adventure primitives. A failed primitive request precedes all debit/gate mutation. The existing
  per-hero daily ledger gains a JSON-safe count map so Upgraded Dimension Door permits exactly two
  uses per day without weakening one-use gates. Census's existing same-day record is now consumed
  by the adventure map: Standard shows exact explored enemy armies/levels and Upgraded additionally
  shows mana, known spells, and equipped artifacts; inventory items remain Scouting-rank-3 intel.
- Combat spells compose the shared registered primitives and attack/damage pipelines. Extra actions
  retain the global two-grants-per-company-per-round cap; delayed Reprise/Overclock state is explicit
  and serialized. Rivet's Defense, doubled-retaliation rider, and upgraded additional retaliation
  use separate timed records, as do Whetstone's two-round Attack bonus and its upgraded one-shot
  retaliation suppression, so consuming a rider cannot erase the continuing statistic bonus.
  Standard Clockwork Double clears counters/timed effects and Upgraded inherits them; neither form
  can copy a summoned/clone source or produce a persistent army member.
- Targeting and timing are executable rather than inferred: Wellspring requires an explicit living
  owned hero; Dimension Door uses the legal map-target draft for both upgraded daily casts; and
  Clockwork Double/Blink use staged source/branch/destination choices with lazy footprint legality.
  Reprise, Overclock, and Blink write serialized immediate, round-end, or pre-order company actions,
  and the battle scheduler resolves each at the printed boundary before returning to normal order.
  Forged branches and the two-granted-actions cap fail before mutation or debit.
- Second Wind may restore a count-zero original company only if its original footprint is empty and
  unblocked. Hold the Line's upgraded base Bloom 3 goes through `addSpellCounter`, including the
  universal +1 per 5 SP and application hooks. Standard Clockwork Double clears temporary/copied
  ability state as well as counters/effects; Upgraded inherits all active temporary ability state
  together so downstream borrow guards still see its copied provenance.
- Consecrated Ground Standard deliberately writes symmetric Rite resonance and Upgraded writes only
  the caster-side mid-battle resonance. Hold the Line's first lethal allied damage each round routes
  through the shared damage layer, leaves one unit at 1 HP, and adds Bloom 3 only when upgraded.
  Upgraded Unmake's choice is exclusive: a protected enchantment can be removed despite its seal,
  or an ordinary selected effect can also cleanse a second distinct company. Enchantment removal
  applies Chill 2 to the removed enchantment's owner.
- The eighteen new spell icons and eight new reusable lexicon icons have complete typed subjects and
  deterministic school/tier or category development placeholders. Existing 68 spell icons and 30
  lexicon icons remain native and hash/provenance gated. Release resolution rejects every new
  placeholder until distinct native art lands. The built-in content hash after this batch and the
  preceding docs-60–63 foundation is `c7a64245`; the seed-424242 two-turn state hash is `1b312b47`.

## 2026-08-12 — Doc-61 P1 Grave/Wild is a cause-aware executable 16-row batch

- This decision supersedes doc 56's historical equal-face gap for Shed Skin and Hedgerow March.
- Thirteen additions and three retunes bring the catalog to 99 spells: 26 Rite, 26 Craft, 23 Grave,
  and 24 Wild. Grave Bargain's named 0-mana rule is the sole narrow exception to the catalog's
  non-X tier-band invariant; the validator rejects any other exception and rejects a nonzero Bargain.
- Tithe's exact spell face supersedes doc 62's stale generalized resource-loop sentence: it grants
  flat 4/6 mana after the 2-mana debit and loses a 10%/8% current-HP base amount. That percentage
  follows the binding `+1 percentage point per 2 SP` rule. Grave Bargain alone derives this batch's
  mana return from starting maximum HP.
- Destruction settlement records its cause. Attacks, deliberate sacrifice, and spell impact share
  casualty attribution, destruction metrics, delayed destroyed-company triggers, proportionality,
  and original-owner saves. Spell impact grants ordinary side-wide morale without inventing a
  company killer or triggering attack-only Standard of Dawn; Tithe and Grave Bargain explicitly
  opt into the sacrifice interactions named by their catalog entries.
- Standard Puppet Strings removes state gained during control by delta: gained counter magnitude is
  discarded, newly added effects and links are removed reciprocally, and effects/links removed while
  controlled are not time-travelled back. Upgraded retains gained state. Upgraded Shed Skin transfers
  a Standard Yoke only when it can construct a valid reciprocal link to the selected adjacent enemy;
  the former link is removed atomically and protection cannot be transferred because protected Yoke
  is not removable.
- Grudge, Yoke, Puppet Strings, and Sap and Sinew apply the global `+1 round per 6 SP` rule to their
  printed base durations; their explicit round records do not imply a fixed-scaling opt-out.
  Hedgerow March and Wildcall speed are battle-aware rather than per-turn residue; Sap and Sinew's
  upgraded Beast rider inherits the extra retaliation and applies Bloom once at actual round start.
  Grudge/Yoke/Sap records use round expiry, unaffected by extra actions.
- The resulting built-in content hash is `eea6c5b4`; the seed-424242 two-turn state hash is
  `4aa4417b`.

## 2026-08-13 — Skills v2 is a thirty-skill, choice-complete system (docs 63/66)

- The catalog is exactly thirty three-rank skills with all six positive class weights. Reaper,
  Beguiler, Duelist, and Quartermaster are absent from new offers below level 5, while already-held
  copies remain upgradeable; the six-distinct-skill cap is unchanged. Rare exposure accounting is
  Chronicler R3, Twicetold R3, Reaper R3, Beguiler R3, Duelist R3, and Loremaster R3.
- Adept and Grimoire enter the ordinary offer from level 6. Adept is an explicit replayed known-spell
  choice and clamps at one mana. Grimoire consumes the campaign RNG for an unknown guild-eligible
  outcome from a known school within `ceil(resulting level / 3)` and is not offered with an empty
  legal pool. AI resolves both deterministic choice boundaries.
- Tactician persists only the adventure-map slot designation. Setup silently chooses the
  furthest-forward footprint-legal anchor on that side, breaking center-row ties by row number;
  this is not a prebattle deployment phase. Beguiler R1 and Curse-Eater R3 instead use serialized
  opening target choices that gate normal battle actions; AI chooses the stable first legal target.
- Duelist R3 always pauses hero-defeat settlement for a replayed trophy choice. On surrender it is
  the explicit exception to equipment protection; on ordinary defeat it resolves before mandatory
  transfer. Reaper reconstructs casualties by original owner and raises the winner faction's tier-1
  unit. Loremaster R3 upgrades existing tier-1–3 spells immediately and all later acquisitions.
- Nine new skill icons use typed deterministic development placeholders with literal physical
  subjects. Development permits them; release validation remains fail-closed until distinct native
  production assets and provenance replace every placeholder.
- Logistics records the complete day-start movement pool after Lighthouse, movement-denial,
  dormancy, Borrowed Time, Leaden Crown, artifact, carry, and skill modifiers; its weekly refresh
  restores that snapshot and clears carry rather than recomputing a divergent formula. Wayfaring's
  explicit daily opt-in passes at most the first non-direct aggro entry on its route. Quartermaster's
  remote verb accepts a player-selected positive count bounded by stock, affordability, and army
  capacity rather than an implicit one-unit purchase.
- The seed-424242 two-turn state hash after the Skills-v2 serialized hero fields is `f5060329`.

## 2026-08-13 — Doc-67 combat Knacks are derived, bounded non-spell hero acts

- The executable catalog contains exactly six faction Knacks and no adventure variants: Hearten,
  Patch, The Errand Remembered, Lay Resin, Ill-Wish, and Blood Drum. Their three ranks derive from
  hero level at 1/6/12 and are never persisted on the hero. Their action and per-round use ledger are
  explicit and replayable; a zero-mana level-1 hero retains the faction's legal fallback.
- Knacks consume the shared bounded hero-act ledger used by spells and combat items. Named waivers
  are consumed before the ordinary act, preventing Twicetold, Evoker, or Alchemist from erasing the
  base act; Sundered Hourglass may spend its even-round second act on a Knack. Pocket Sundial's more
  precise doc-60 contract wins doc 67's broad parenthetical: it is a pre-first-stack spell cast that
  replaces the normal round-1 cast, not a prebattle Knack phase. The Long Oath remains doc-61 P2;
  its eventual second-act credit must enter the shared ledger and accept a Knack.
- Knacks are not spell casts and do not touch mana, Spell Power, copy/Echo/reflection, Sanctuary, or
  resonance state. Ill-Wish deliberately uses the raw counter boundary so universal application
  hooks still apply. Blood Drum uses cause-aware sacrifice/destruction settlement, bypassing Ward
  and damage links without inventing a spell source. The Rusted Tongue's typed `knack_block` is the
  sole printed disable.
- Knack Resin is an upgraded persistent Resin marker: entering costs two extra movement for either
  side and any company ending there gains Chill 1. Existing creature-placed Resin retains its prior
  behavior. The broad every-round floor is necessarily target-conditional: a saturated battlefield
  with fewer legal empty Resin hexes than the rank requires offers no executable Resin action, and
  the permanent control states that exact placement reason instead of exposing a generic incomplete
  draft. Rank-3 Errand exposes only same-round fallen originals whose original footprint is free;
  fatal last-company Blood Drum resolves winner/death accounting without throwing.
- A Warden garrison gets the installer's Knack only inside the exact rank-3 five-tile remote-casting
  boundary. Human controls remain permanently visible with exact rank/effect/disabled reason; AI
  uses the six stable doc-67 fallbacks only after declining spells and items.
- Six `knack:<faction>` icon identities carry distinct literal subjects and deterministic typed
  development placeholders. Release validation stays fail-closed until six distinct native icons
  and provenance land. The executable Knack and asset catalogs are content-hash authority.
- The resulting built-in content hash is `56207b86`; the seed-424242 two-turn state hash remains
  `f5060329` because Knack authority is derived and no battle exists in that replay.

## 2026-08-13 — Doc-63 existing-creature support uses provenance and stable event boundaries

- The twenty support abilities run at their printed pipeline boundaries. Hex Feeder's +10% and
  ordinary Hex +5% are additive (+15% per pip), not multiplicatively compounded. Chain Shot inherits
  ordinary light-shot friendly fire, spends one shot total, and makes one stable non-recursive
  secondary choice. Phalanx is a single nonstacking reducer.
- Burn moved by Burn Conduit is already-resolved state and receives no application bonuses; its
  empty branch is fixed non-spell Burn 1. Mana Leech and Siphon key on actual HP removed, not routed
  request or overkill. Unstable deaths use a stable finite settlement queue; Silence the Passing
  suppresses or doubles both Unstable and Soul Tithe as ordinary death triggers.
- Spellbound blocks explicit spell selection and Borrow Shape but not untargeted mass effects.
  Echoing requires an explicitly selected allied company and direct hero/hero-scroll provenance;
  mass/incidental recipients, hostile targets, creature sources, and copies do not qualify. Ward
  validates the original target before a stable legal redirection and spends its use only on success.
- Bone Choir's transitional Hedge Caster row is superseded by doc 64; its general Caster repertoire
  is Wither/Grave-Chill with two company-action charges at fixed Spell Power 3. Battlefield/side
  resonance applies, while commander-personal Spell Power,
  Kit, specialty, Tallykeeper, and artifact bonuses do not leak into the cast or a mirror copy.
  Company casting works for heroless guardians and otherwise uses the ordinary spell legality,
  Sanctuary, current target legality, copy, statistics, clone, replay, and persistence boundaries.

## 2026-08-13 — Doc-64 creature traits use printed metadata and shared deterministic boundaries

- Doc 64 supersedes Bone Choir's transitional Hedge row. The five existing caster repertoires and
  twelve pattern rows are exact; the named table's three Wildergrass patterns override the stale
  “no more than two” prose without weakening the one-pattern-per-unit rule. The explicit Familiar
  carrying example assigns Ley-Touched; no other §4 assignment is invented.
- Reliquary Ark's printed Blast Shot implies Ranged but supplies no ammunition count. It receives
  six shots, matching the existing tier-three Silk-Spinners baseline; every blast spends one.
- Spell Deflect is a serialized defender-owned pause after commitment, not a caster-authored target
  field. Resistance-blocked casts still consume their act/mana or company charge/action.
- Creature-cast enumeration resolves the same resonance face as execution and includes every
  required serialized placement. Combat AI applies each repertoire spell's existing timing and
  target hints; it does not choose by spell ID or bypass ordinary legality.
- Cornered adds one point to the Attack statistic per complete 20% of starting count lost. It is
  not a separate flat damage multiplier.
- Adventure traits evaluate live army presence. Hungry pays 100 gold daily when possible; an unpaid
  stack remains until the next week start, then leaves before that day's other creature benefits.
- The executable content schema advances to `docs-60-67-v2-creature-traits.2`; resistance, caster,
  and six shared-pattern metadata are bidirectional with their printed vocabulary.

## 2026-08-13 — Doc-63 artifacts dispatch by tag and expose every bounded cost

- The intermediate artifact catalog is exactly 110 definitions: 36 Vanilla, 30 Charm, 26 Relic,
  eight Burden, four Kit, and six migrated Trinket. The twenty doc-63 additions each own authored
  flavor, inspection copy, a literal sprite subject, and a typed class/slot development placeholder;
  release mode remains fail-closed until twenty distinct native sprites and provenance exist.
- The twenty-three doc-63 effect tags register at their actual pipeline stage and runtime consumers
  query equipped effect tags, never artifact IDs. The three prior orphan tags follow the same rule:
  `push_bonus` spends one serialized side credit, `reduce_enemy_death` floors counter/morale trigger
  magnitude without weakening proportional damage, and `eat_counter` is a target-bearing replay
  action with one serialized use per battle.
- Empty Reliquary stores the last explicit hero spell action by spending the shared hero act and
  releases that recorded action later without consuming an act. Cracked Prism records a distinct
  second legal target and resolves the second application with half Spell Power. The Second Sunrise,
  Grafted Hand, and other action/mana artifacts use finite per-side ledgers; no artifact grants an
  unbounded cast or company action.
- Counter caps remain nine except printed Hex application cap increases, with a global ceiling of
  fifteen. Existing-pile doubling is not an application. Summoned-company, control-once,
  resurrection-starting-count, two-granted-action, two/three-enchantment-slot, and maximum-mana
  bounds remain authoritative under artifact modifiers.
- Each Burden definition owns a visible removal trigger. Equip confirmation repeats its upside,
  downside, lock, and removal condition. Satisfying Hedge-School spell teaching, own-city battle,
  no-cast victory, or Mage Guild 5 completion records removal eligibility; Reliquarian rank 3 remains
  the single game-long waiver.

## 2026-08-13 — Hero army capacity is derived, capped, and lossless

- A commanded hero has seven base army positions, +1 once Quartermaster reaches rank 1, and +1 per
  equipped `army_slot_bonus` amount, capped at nine. The Long Table uses that generic artifact effect;
  no consumer branches on its artifact ID. Higher Quartermaster ranks do not add more positions.
  Garrisons, guardians, and other heroless armies remain fixed at seven.
- The rules core derives capacity from serialized skills and equipment and synchronizes the hero's
  army array to exactly that size. Capacity is not another stored field, so setup, selectors, AI,
  canonical five-field saves, and action-log replay share one authority and prior seven-position
  states remain valid.
- Recruitment and joining, splitting and merging, friendly-hero/garrison exchange, authored setup,
  battle setup and results, casualties, retreat, and surrender all preserve the destination hero's
  derived shape. Battle reconstruction reads the serialized hero snapshots rather than inferring
  capacity from the highest occupied company.
- Any skill or equipment mutation that would shrink below an occupied tail position rejects before
  changing state. This includes equipment replacement and forced Duelist trophies. Multi-company
  joins preflight the complete result before spending, clearing the source, or changing a pending
  choice; no partial success may strand or delete a company.

## 2026-08-13 — Doc-63 consumables share bounded action, copy, and destruction seams

- The verified authored item total is 50: the pre-v2 37 native items, Spell Tome, and twelve
  doc-63 consumables. Spell Tome and those twelve items have literal subjects and typed development
  placeholders. They do not masquerade as native manifest entries; release validation remains
  fail-closed until thirteen distinct PNGs and provenance records are promoted.
- Counterfeit Coin copies the enemy side's last explicit hero action rather than the battle-global
  last spell. It preserves that action's Standard/Upgraded face, uses the Coin user's Spell Power,
  and spends zero mana. Echo is excluded to close direct copy recursion. Target and branch fields
  are enumerated from the recorded face, staged placement is dry-run before consumption, and AI uses
  the same deterministic first-legal completion.
- Vial of Borrowed Hours reserves through the shared two-granted-actions-per-company-per-round
  ledger before activating the first immediate action. Alchemist rank 3 may add one distinct legal
  company, but global, school, enchantment, and next-destruction items remain single/global effects.
- Grave-Dust Sachet consumes its pending claim on the next destruction event even when that company
  is summoned, cloned, or already claimed by another save; prohibited companies do not cause it to
  skip forward to a later death. A legal company returns on the claimant side at ceil(25% of its
  starting count), with casualties reduced for the restored units.
- Tome contents derive from seed plus stable authored source key rather than gameplay RNG. Chest and
  Reliquary Cairn pools stop at tier 3; only lock/barrow generic sources reach tiers 4–5; Reliquary
  of Pages is exactly tier 4 and map lint requires its guardian. Editor instances carry the same
  named spell and source fields and cannot author an invalid source/tier pair.

## 2026-08-13 — Docs 63–64 creatures are neutral discoveries, not a seventh city roster

- The executable unit catalog advances from 50 to 63 definitions: exactly the eight doc-63 neutrals
  and five doc-64 showcases. Where the work orders specify tier and traits but no numeric body,
  authored HP, damage, Attack, Defense, speed, growth, and costs are balanced against adjacent
  faction tiers; later strategic recalibration remains owned by `98f.19`.
- Every row owns one distinct named Manywhere field dwelling guarded by its own creature. The same
  ordinary explicit dwelling action governs recruitment for humans and AI; Diplomacy applies to
  the guardians, and only printed Beasts gain Beast Tongue/Beastmaster channels. Culture is unit
  data, so cross-culture companies produce the existing mixed-army morale penalty without a new
  exception or hidden neutral faction.
- Unit inspection is the recruitment-card authority and now prints culture, footprint, full stats
  and cost, caster repertoire/charges/power, every ability and drawback, named dwelling, channels,
  and the mixed-culture warning before purchase.
- Thirteen distinct battle subjects, thirteen adventure-guardian silhouettes, and thirteen
  dwelling subjects have staged production jobs. Only battle and guardian subjects enter the typed
  creature asset gate; development resolves deterministic culture/tier placeholders and release
  remains fail-closed. No staged entry is added to the native manifest or reported as installed.
- The replay/content schema advances to `docs-60-67-v2-creature-content.3`; the thirteen acquisition
  rows and 26 typed creature art requirements join hash authority alongside the unit/map catalogs.
  The resulting cumulative built-in content hash is `bf004a8b`.

## 2026-08-13 — Doc 65 ships all 38 named artifacts

- Spare Tongue is a named Magic row and is included. Doc 65 therefore adds 38 artifacts, not 37;
  the final catalog is 148 definitions with class totals 36 Vanilla, 44 Charm, 45 Relic, 13 Burden,
  4 Kit, and 6 Trinket. This arithmetic is authoritative for validators, UI, docs, and asset gates.
- Every adventure, economy, magic, combat, conditional, burden, and set rule dispatches through an
  effect/removal/set registry. Serialized action and instance state carries timing, choices, seeded
  results, faction history, and pending battle decisions; artifact IDs do not select runtime rules.
- The 38 doc-65 subjects join the 20 doc-63 subjects as typed staged artifact requirements. Native
  raster production remains owned by `98f.18`; development placeholders are honest and deterministic,
  and the release gate continues to fail closed for all 58 unresolved IDs.
- The replay/content schema advances to `docs-60-67-v2-artifact-content.4`; the resulting cumulative
  built-in content hash is `dac70e42`.
- Empty Frame copies the selected artifact's generic effect tags, values, and set membership; its
  physical slot, class, Burden contract, and legacy identity-only behavior remain those of the Frame.
  Hollow Key's guarded reward is the explicit serialized `rewardPickup`; guarded sites stay
  encounters, and the pickup's guardian reference remains in place.
- Tinker's Rounds halves the final Marketplace buy rate with floor rounding and doubles ordinary
  sell yield before flooring. Open Purse doubles scheduled daily income—cities, current or retained
  mines, mills, and daily artifact income—before difficulty/suppression. Tallystick balancing and
  Tithe refunds are grants/refunds, not scheduled income, and are not doubled.

## 2026-08-13 — Doc 61 P2 closes the 124-spell catalog

- Twenty-five new spells plus the False Colors and Standing Mirror retunes complete the catalog:
  31 spells per school and 8/8/7/5/3 tiers per school. Every Standard/Upgraded pair now differs.
- P2 combat rules use bounded state for hero-act credits, extra-action payoffs, weather, Ledger
  half-strength triggers, copying, destruction saves, and upkeep. Mirror Hall copies once and
  excludes mana/action generators, Echo, mirrors, and Twisters; only Upgraded may copy tier 5 at
  half magnitude. Standing Mirror+ alone admits enemy Twisters. Composite spell faces validate each
  recipient once, so Ward or immunity suppresses both impact and every rider for that recipient.
- P2 adventure casts use explicit serialized targets and existing generic adventure primitives.
  False Colors changes deterministic AI perception; other effects retain printed time scopes.
  “Next N days” production windows begin at `D+1` and end at `D+N`; movement denial through a
  following day includes that hero's start turn on the named day.
- The schema advances to `docs-60-67-v2-spell-catalog.5`. The 25 new spell icons have literal typed
  development requirements; release validation stays fail-closed until distinct native PNGs land.
