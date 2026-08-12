# 59 — One-screen hero dashboard

Status: contract, audited inventory, and exact 79-asset production catalog complete 2026-08-12;
dashboard UI implementation, browser evidence, and final UI acceptance remain follow-up work. This is a presentation and
asset-pipeline companion to docs 34, 44–46, and 51. It extends S02, S06–S09 without changing hero,
army, item, artifact, equipment, save, replay, or action rules.

## 1. Outcome and non-goals

Hero Details becomes one coherent, scrollable dashboard. It has **no tabs, segmented modes, or
hidden content families**. Portrait and identity, four primary stats, hero vitals, seven army slots,
up to six secondary skills, eleven equipped-artifact positions, the unlimited artifact backpack,
six to eight consumable positions, specialty, and current special/status controls all exist in one
DOM reading order and one visual composition. Every occupied graphical entry opens concise details
on ordinary click, touch tap, Enter, or Space.

The supplied [Heroes II hero screen](https://i.ibb.co/Cznhbcf/homm2.png) is the primary hierarchy
reference: identity and primary stats first, a full-width army row, icon-led secondary skills, and a
uniform artifact grid. The supplied
[Heroes III hero screen](http://www.thegimcrackmiscellany.com/wp-content/uploads/2008/07/homm32.gif)
was reviewed as a secondary density and selection/detail reference. No external bitmap, crop,
palette, frame, ornament, typography, measurement, slot silhouette, or paper-doll layout enters the
repository, generation prompts, or production UI.

This work does **not**:

- change `Hero`, `HeroArtifacts`, `ItemInstance`, `Army`, or save/replay serialization;
- add, remove, rename, or generalize any equipment slot;
- make artifacts freely interchangeable among the eleven positions;
- add artifact transfer to friendly-hero exchange;
- change item timing, stack splitting, Burden locks, Seamstone choice, Kit bonuses, Debts, or any
  special-skill action;
- generate assets or implement the dashboard in this contract task.

## 2. Audited implementation boundary

The current `AdventureHeroDetails` is a five-tab dialog: Overview, Army, Equipment, Items, and
Special skills. It routes army splitting through `SPLIT_ARMY`, artifact changes through
`EQUIP_ARTIFACT`/`UNEQUIP_ARTIFACT`, item use through its existing target/confirmation flow, and
Attunement, Ritualist, Cache, and Unstitch through their current explicit actions. Those routes stay
intact. `ArtifactPaperDoll` currently renders two-column named slot cards and requires a separate
destination confirmation; `ArmySlots` and the shared inspection layer already expose unit details;
`ContentIcon`, `ArtifactSprite`, `ItemSprite`, `UnitPortrait`, and `ResourceIcon` are the existing
semantic bitmap boundaries.

The implementation pass replaces the tab state and tab navigation, not the reducers. It may split
`ArtifactPaperDoll` into dashboard-oriented presentation components, but compatibility helpers and
action construction must remain selector/reducer-projected rather than becoming a parallel rules
table. Existing UI defects discovered while composing the dashboard—such as a raw rather than
effective displayed stat—must be fixed through pure shared selectors, never by changing stored
state in a component.

## 3. One reading order

The binding DOM and narrow-screen order is:

1. **Dialog header:** dashboard title, hero name, and one visible Close control.
2. **Identity:** distinct hero portrait, faction, class, level, XP progress, specialty icon/name,
   and a concise story/rules detail route.
3. **Primary stats:** Attack, Defense, Spell Power, and Knowledge as four graphical value tiles.
4. **Vitals and current status:** movement/current maximum, mana/current maximum, luck, experience,
   and only the non-default status chips relevant to this hero.
5. **Army:** seven stable company positions in slot order.
6. **Secondary skills:** zero to six learned skills in stable catalog/hero record order, with rank.
7. **Equipped artifacts:** eleven stable, uniformly drawn positions in canonical
   `EQUIPMENT_SLOTS` order.
8. **Artifact backpack:** every carried artifact in array order; the region, not the whole dialog,
   may grow or scroll for exceptional inventories.
9. **Consumables:** every actual inventory position—six base, up to eight with Provisioner—with
   stored spell/version and other instance state retained in details.
10. **Special controls and obligations:** spellbook, Attunement resonance, Ritualist forecast and
    choice, Patient Stone/Cache progress and Dig, Kit progress and Unstitch, and active Debts. A
    control is omitted only when its existing eligibility condition says the feature is irrelevant;
    it is disabled with the exact reason when relevant but presently illegal.
11. **Footer:** Close/return to map. There is no next/previous section control because there are no
    sections that replace one another.

Desktop CSS may place 2–4 beside one another and may compose 6–10 into columns, but it must not use
CSS ordering that differs from this DOM order. Screen-reader and 390 px reading order are therefore
identical to the visual narrow order.

### Desktop hierarchy

At **1440×1000 CSS px**, the dashboard uses a viewport-bounded dialog no wider than 1180 px and no
taller than `100dvh - 32px`. Its useful composition is:

- top band: 260 px identity column; flexible primary/vitals area; up to 260 px specialty/status and
  ordinary hero actions;
- second band: one full-width seven-company row;
- lower band: secondary skills on the left, equipped artifacts plus backpack in the center, and
  consumables plus contextual special controls on the right;
- one vertical `.hero-dashboard-body` scroller when content genuinely exceeds the viewport. The
  header and footer remain outside it. No region creates a horizontal scroller.

With the deterministic ordinary fixture (six skills, seven companies, eleven equipment positions,
up to eight item positions, two Debts, and a modest backpack), the title and heading of every region
must be present at once without changing mode. Large backpack contents may extend the single body
scroll; they never create tabs or a second page.

### 390 px hierarchy

At **390×844 CSS px**, the dialog is `calc(100vw - 16px)` wide and at most
`calc(100dvh - 16px)` high. The header/Close control stays visible and the body is the only scroller.
All regions follow the numbered single-column order above. Army uses four cells then three;
secondary skills use three columns; equipped artifacts, backpack, and consumables use four columns
where 44 px targets and labels still fit, otherwise three through one shared breakpoint. No content
uses fixed desktop widths, clipped labels, viewport-wide transforms, or horizontal overflow.

## 4. Graphical region contract

### Identity, stats, and vitals

The portrait is the hero definition’s identity, not the faction’s shared south-facing adventure
sprite. Name, faction, class, level, and XP remain real text. The specialty is one focusable icon
button with its visible name; details contain the complete specialty rule and story context.

Each primary-stat tile shows icon, unabbreviated visible name, and current effective value. Details
show the stored/base value and the exact equipped-artifact/Kit contribution when nonzero. The UI
uses the core’s existing artifact-stat derivation; it does not reproduce it. Knowledge and mana
details must not disagree about the authoritative current maximum.

Movement, mana, experience, and luck use graphical vital tiles with visible numeric/text values.
Meters supplement rather than replace `current / maximum` text. Level remains a text/badge value,
not a fifth primary stat. Faction passive remains visible semantic identity text in the specialty
detail; it does not require a decorative crest.

### Army

All seven company positions remain visible. An occupied cell is a focusable button containing the
shared unit portrait and count; its accessible name is, for example, “Army slot 2, 18 Bannermen,
occupied.” Activation opens unit/company details: name, count, tier, footprint, current catalog
stats, abilities, and the separate Split action when the existing adventure rules permit it.
Selection never splits or moves a company. Empty positions use one quiet frame plus “Empty” and are
not repeated as seven verbose cards or added to the tab order.

### Secondary skills

Every learned skill uses its installed native icon, visible name, and Rank 1/2/3 text. Activation
opens all three rank rules with the current rank clearly marked. Zero skills produces one compact
“No secondary skills learned” line; it does not manufacture six empty focus targets. Attunement and
Ritualist actions appear in Special controls while their learned skill icons remain ordinary detail
entries here.

### Uniform equipped-artifact grid

The eleven positions are **presentation-uniform**: same rectangular frame, same bitmap area, same
focus ring, same label placement, and a regular 6+5 desktop / 4+4+3 narrow grid. There is no body
silhouette, helmet outline, hand, boot shape, jewelry-shaped cell, or positional paper doll.

Uniform presentation does not mean uniform legality. Each position retains its exact serialized ID
and acceptance rule:

`head`, `cloak`, `amulet`, `weapon`, `shield`, `armor`, `ring1`, `ring2`, `boots`, `misc1`, `misc2`.

The small visible slot label remains Head, Cloak, Amulet, Weapon, Shield, Armor, Ring 1, Ring 2,
Boots, Misc 1, or Misc 2 so compatibility is understandable without color or memory. Empty slots
are focusable because their details explain accepted artifact class and can begin choosing a legal
backpack artifact. Occupied activation opens artifact details first; it never immediately equips or
unequips.

From an artifact detail, **Equip…** opens the current explicit destination review. Every one of the
eleven destinations remains keyboard reachable. Compatible destinations state whether empty or
which artifact would be displaced; incompatible destinations expose `aria-disabled="true"` and the
exact accepted/current class reason rather than disappearing. Confirm dispatches the existing
`EQUIP_ARTIFACT` action. Seamstone still requires an explicit school. From an equipped detail,
**Unequip to backpack…** previews and confirms `UNEQUIP_ARTIFACT`; a Burden keeps the control visible
but unavailable with its removal condition. Replacement returns the displaced instance to the
unlimited backpack exactly as today.

### Backpack and consumables

Backpack entries are compact graphical buttons, not prose cards. Visible identity is bitmap plus
name; detail owns class, legal slot, complete mechanics, flavor, chosen school, Kit/Burden state,
and Equip. An empty backpack is one compact line. The backpack remains unlimited and ordered; no
pagination or artificial capacity is introduced.

Consumables render actual inventory positions, including Provisioner’s seventh/eighth positions.
Occupied activation opens detail first. An adventure item’s detail offers a separate Use action,
which closes the dashboard only when handing off to its existing target/confirmation flow. Combat
and automatic items remain inspectable and explain their timing; their detail never fabricates an
adventure Use action. Empty positions use a quiet nonfocusable frame. Item quantity/version,
`storedSpellId`, `plus`, origin, X spend, and any future instance fields remain semantic data.

## 5. Detail, focus, keyboard, and touch

The dashboard owns one shared local detail dialog for hero, primary stat, vital, company, skill,
artifact, item, specialty, status, and empty equipment-position details. This is a click-for-detail
contract, not a tooltip contract.

- Ordinary pointer click and touch tap on an occupied graphical cell open the same detail. Right
  click and long press may remain aliases but are never the only route. Hover may show a short name
  but never unique rules or actions.
- Every graphical control is a native `button` with an accessible name containing category, name,
  state/rank/count, and slot position where relevant. Decorative images have empty alt text because
  the button supplies the complete name; standalone informative images keep useful alt text.
- Enter and Space activate the focused cell. Tab follows DOM order. Arrow-key roving is optional,
  but if added it supplements rather than replaces Tab and follows physical grid direction.
- Opening detail records the invoking element, moves focus to the detail heading or Close control,
  traps focus inside the topmost modal, and locks map input. Escape closes only the topmost detail or
  confirmation and restores focus to the exact invoking cell. A second Escape closes the dashboard
  and restores the original map control. Backdrop activation never commits an action.
- Detail actions are distinct labeled buttons. Merely opening, closing, or changing selection is
  render-pure and adds no action-log entry. Equip, unequip, use, split, resonance, omen choice, Dig,
  and Unstitch keep their existing explicit confirmation/targeting behavior.
- Interactive targets are at least **44×44 CSS px** at desktop and 390 px. Focus, selected, locked,
  upgraded, empty, and unavailable states use text/shape/border in addition to color.
- Nested glossary references remain valid semantic controls without nesting buttons. Detail prose
  may use the existing glossary renderer; grid buttons never contain another interactive element.

## 6. Native and display sizes

No bitmap is stretched through a CSS transform. Transparent native pixels remain separate from the
larger button/frame hit area.

| Family | Native source | Dashboard bitmap display | Detail display | Frame / boundary |
|---|---:|---:|---:|---|
| Distinct hero portraits | 96×96 new RGBA | 96×96 | 96×96 | at least 104×104; native size at both breakpoints |
| Primary stat, specialty, and vital icons | 32×32 RGBA | 32×32 | exact ×2, 64×64 | at least 52×52 graphical control |
| Secondary skills | existing 32×32 RGBA | 32×32 | exact ×2, 64×64 | at least 52×52 graphical control |
| Artifacts | existing 32×32 hard-alpha | 32×32 | exact ×2, 64×64 | uniform equipped/backpack cell, at least 52×52 |
| Items/consumables | existing 32×32 hard-alpha | 32×32 | exact ×2, 64×64 | at least 52×52 occupied cell |
| Resources | existing 32×32 | 24×24 inline or 32×32 tile | optional exact ×2 | name and amount remain text |
| Army/unit portrait | existing 128/192/256×128 battle canvas | contained in 64×64 desktop or 48×48 narrow visual box | contained in 96×72 | 76×84 desktop; responsive ≥72×76 narrow |
| Reused spell/effect/status icon | existing 32×32 | 24×24 chip or 32×32 tile | exact ×2 when detailed | label always visible |

`image-rendering: pixelated`, intrinsic aspect ratio, and `object-fit: contain` are mandatory for
these pixel assets. The unit family is intentionally a large native combat canvas reused as a
portrait; no lossy derivative or incomplete 18-creature guardian subset is introduced merely to
make a smaller icon family.

## 7. Exact asset audit and generation gap

The audit derives from `HEROES`, `SKILL_IDS`, `ARTIFACTS`, `ITEMS`, `UNITS`,
`EQUIPMENT_SLOTS`, `assets/manifest.ts`, `assets/worklist.ts`, the three icon
manifest/worklist families, `assets/adventureSpriteInventory.ts`, accepted selections, and the
artifact/item/spell-skill provenance records. A literal subject record is not counted as installed
coverage; a reusable installed asset requires the promoted bitmap and manifest/provenance gate.

| Dashboard family | Catalog target | Installed/reusable | Generation gap | Disposition |
|---|---:|---:|---:|---|
| Primary stats | 4 | 1 | **3** | Reuse `spell-effect-icon:spell-power`; generate Attack, Defense, Knowledge |
| Secondary skills | 21 | 21 | **0** | Reuse `ContentIcon` native 32×32; larger frame/detail renderer only |
| Equipped/backpack artifacts | 90 | 90 | **0** | Reuse `ArtifactSprite`; uniform-grid/UI work only |
| Items/consumables | 37 | 37 | **0** | Reuse `ItemSprite`; dashboard/detail wiring only |
| Army creatures | 50 | 50 battle portraits | **0** | Reuse `UnitPortrait`; enlarge visual frame only |
| Distinct hero portraits | 36 | 0 | **36** | Generate one 96×96 portrait per hero definition |
| Distinct specialties | 36 | 0 | **36** | Generate one native 32×32 icon per specialty ID |
| Hero vitals | 4 | 0 | **4** | Generate Experience, Movement, Mana, Luck native 32×32 icons |
| Strategic resources | 4 | 4 | **0** | Reuse Gold, Timber, Iron, Essence pickup icons through `ResourceIcon` |

The exact new production total is therefore **79 assets**: 36 portraits plus 43 icons (36
specialties, 3 primary stats, 4 vitals). The installed Spell Power lexicon icon is deliberately
shared rather than duplicated. The new fixed icon family must style-lock to that 32×32 effect family
and the existing skill/collectible art laws: transparent canvas, one literal central subject,
selective outline, restrained clusters, south-east/lower-right light, no text, frame, scenery,
rarity, slot, or faction/player badge. Portraits are original transparent head-and-shoulders or
compact bust subjects derived from each canonical story, class, faction materials, and specialty;
they contain no baked frame or player color.

The production pass added the catalog-derived `heroDashboardWorklist` and declarative manifest,
eight immutable literal built-in jobs, accepted selection/provenance with prompt and source/output
hashes, dimension/alpha/uniqueness gates, source/native/exact-nearest-3× contact sheets, deterministic
build/promote tooling, and no-fallback shared renderers. Installed coverage is **79/79**. All 79
provider sources remain retained; no generated attempt required rejection or retry. Spell Power
continues to resolve to the pre-existing effect icon and was not duplicated or rewritten.

This completion is asset infrastructure only. It does not claim that `AdventureHeroDetails` has
adopted the one-screen dashboard, that browser acceptance exists, or that the old faction movement
portrait consumer has already been replaced.

### Exhaustive secondary-skill reuse set — 21/21

`logistics`, `scouting`, `wayfaring`, `diplomacy`, `attunement`, `command`, `forager`,
`spellthief`, `alchemist`, `chronicler`, `palimpsest`, `twicetold`, `curseEater`, `ritualist`,
`peddler`, `warden`, `ransomer`, `beastmaster`, `vanguard`, `provisioner`, `siegewright`.

### Exhaustive artifact reuse set — 90/90

- Vanilla (36): `skirmishersBlade`, `marchwardensSword`, `swordOfTheFirstField`,
  `yeomansBuckler`, `kiteOfTheOldWall`, `aegisOfTheKeptOath`, `circletOfSmallRites`,
  `hoodOfTheHedgeMage`, `crownOfThePatternedSky`, `chapbookLocket`, `reliquaryPendant`,
  `deepWellAmulet`, `quiltedCoat`, `lamellarOfTheMarches`, `panoplyOfTheGreyKeep`,
  `travelersCloak`, `wayfarersMantle`, `cloakOfTheOpenRoad`, `cobblersPride`,
  `bootsOfTheDrover`, `sevenLeagueBoots`, `ringOfSmallMendings`, `ringOfTheSteadyHand`,
  `ringOfTheLongVigil`, `sashOfTheLeviedMile`, `scribesCuff`, `captainsWeathercoat`,
  `lanternScholarsCap`, `pilgrimsBelt`, `surveyorsBoots`, `fieldClerksSeal`, `ashwoodBracer`,
  `quietWard`, `marchGlass`, `keepersHalfCloak`, `mendersGorget`.
- Charm (22): `falconersGlove`, `whetstoneOfTheClans`, `tinkersSpectacles`, `quietHorseshoe`,
  `standardBearersBaldric`, `saltCrustedCompass`, `gravebindersSash`, `forgeAshGauntlets`,
  `beeCharmersVeil`, `purseOfThePrudentToad`, `chalkmastersRing`, `secondQuiver`,
  `gauntletSecondThrow`, `candleSnuffersRing`, `fairScale`, `droversCrook`,
  `hexKeepersLocket`, `thirdBoot`, `bellMetalTorque`, `unsentLetter`, `mothEatenMap`, `spareFace`.
- Relic (18): `sunderedHourglass`, `longestCandle`, `crookedDistaff`,
  `bannerOfTheFirstField`, `patchworkStandard`, `seamstone`, `mirrorshardPendant`,
  `bellsClapper`, `queensAmber`, `wolfMothersTorc`, `hornOfTheBroadWorld`, `toyKnightsHeart`,
  `longSpoon`, `firstDrum`, `crownHollowTown`, `weathercockIllOmen`, `seamRipper`, `lastToy`.
- Burden (4): `leadenCrown`, `hungryBlade`, `beggarsRing`, `patternlessCoat`.
- Tailor's Kit (4): `tailorsNeedle`, `goldenThread`, `tailorsThimble`, `patternbook`.
- Migrated Trinket (6): `knucklebonesOfTheSaint`, `drumOfTheDeepGrass`,
  `censerOfStillness`, `pocketSundial`, `ironNail`, `mirrorMask`.

### Exhaustive item reuse set — 37/37

- Combat (25): `spellScroll`, `scrollRally`, `scrollBlessing`, `scrollForgeSpark`,
  `scrollWard`, `scrollWither`, `scrollQuiet`, `scrollDirge`, `scrollSour`, `scrollAmplify`,
  `scrollReflect`, `potionOfVigor`, `draughtOfIron`, `smellingSalts`, `haresHeel`,
  `blackfireOil`, `graveDust`, `hornetJar`, `milkOfTheMoon`, `chalkOfWalls`, `waxSeal`,
  `powderOfUnmaking`, `bannerWhistle`, `secondCandle`, `bottledEcho`.
- Adventure (11): `cartographersCase`, `waybread`, `saltedMeat`, `tavernTales`, `hearthstone`,
  `ferrymansCoin`, `militiaWrit`, `beggarsCoin`, `foundersTin`, `cronesBundle`,
  `overseersCharter`.
- Automatic (1): `tradeGoods`.

### Exhaustive army portrait reuse set — 50/50

- Hearthguard: `yeoman`, `longbowman`, `bannerman`, `lanceKnight`, `oriflammeWarden`,
  `oriflammeWyvern`.
- Wound-Wrights: `tinSoldier`, `hobbyKnight`, `marionette`, `stuffedSentinel`,
  `woodenColossus`, `reliquaryArk`.
- Unfinished: `candleWisps`, `couriers`, `sentries`, `boneChoir`, `brides`, `ferry`.
- Vespiary: `larvalTide`, `paperWaspLancers`, `silkSpinners`, `amberCarriers`,
  `dragonflyCavalry`, `halfWokenQueen`.
- Hagwood: `crowChorus`, `fencePostFamiliars`, `besomRiders`, `rusalka`, `leshy`,
  `walkingHut`.
- Wildergrass: `outriders`, `drumCallers`, `ashmaneWolves`, `aurochsHerd`, `grassSerpent`,
  `thunderbird`.
- Seamborn: `sleeper`, `siegeWall`, `siegeRam`, `watchtower`, `makerWall`.
- Gloaming Court: `mirrorBound`, `maskedDuelist`, `hearthHound`, `waxServitor`,
  `standingMirror`.
- Driftfolk: `sirens`, `drownedCrew`, `hullTurtle`, `lanternAngler`.

All 50 have a manifest-backed battle canvas: the 37 one-hex definitions use 128×128, the twelve
two-hex definitions use 192×128, and the three-hex Sleeper uses 256×128. The 18 native 32×48
guardian sprites are an adventure-map subset, not full dashboard coverage.

### Exact portrait and specialty generation set — 36 + 36

- Hearthguard: `aldith:steadyAim`, `corwin:brightRally`, `berta:roadwise`,
  `osric:highBanner`, `edwin:kennelMuster`, `maud:brightTrial`.
- Wound-Wrights: `petra:tinCaptain`, `silas:brightWither`, `grigor:masterForager`,
  `mirele:masterMender`, `ansel:brightEscort`, `rivka:swiftMarionettes`.
- Unfinished: `maren:deepLastLight`, `elgiva:brightRemembrance`,
  `tobiah:watchfulRetaliation`, `brotherHollis:heavyUnfinishedBusiness`, `cerys:doubleFerry`,
  `dunstan:deepDirge`.
- Vespiary: `vess:nurturingBrood`, `oszra:masterRenderer`, `kettl:swiftPaperWasps`,
  `humm:brightBloom`, `szet:lastingResin`, `ollo:greaterBroodCall`.
- Hagwood: `babaZima:gentleDebts`, `yagaOlen:brightSour`, `oldMarta:vengefulCrows`,
  `vasilisa:farSweep`, `agata:diagonalFenceSlow`, `bogdan:loopholeBargains`.
- Wildergrass: `temir:dearerBloodPrice`, `saiga:hungryPack`, `anai:brightGale`,
  `bataar:unhinderedSkirmish`, `qara:burningStormWake`, `erdem:costlySurrender`.

The existing 48 adventure hero sprites are six faction/class locomotion identities × eight
directions. They remain correct for the map and may remain an interim semantic fallback, but they
are **0/36 distinct portrait coverage** and must never be reported as the new portrait family.

### Status and resource disposition

- Generate fixed vital icons for `experience`, `movement`, `mana`, and `luck`.
- Reuse the installed Attunement skill icon and `spell-effect-icon:resonance` for declared/used
  resonance state; reuse Ritualist and `spell-effect-icon:omen` for the seven-omen forecast/choice.
- Reuse the four Kit artifact sprites and ordinary artifact detail for Kit progress/Unstitch.
- Reuse `map-object:patientStone:default` and `map-object:cache:default` for sketch/Dig state.
- Reuse the corresponding spell icon for `borrowedTime` and `falseColors`, a unit portrait for
  temporary companies, the Morale effect icon for next-battle meter, and the new Luck icon for
  next-battle luck. Other non-default `HeroAdventureEffects` use the shared Active effect/Timed
  effect icon plus visible source and expiry; they do not create one bitmap per runtime instance.
- Active Debts are dynamic instances of the eight bargain rules. Use one consistent CSS/text Debt
  marker with name and countdown; no eight-icon bitmap family is required. Details remain complete.
- Gold, Timber, Iron, and Essence reuse their four installed native 32×32 pickup images. The four
  64×96 mines are production-site art and do not belong in a hero status tile.

## 8. Deterministic verification and browser acceptance

Implementation must add a catalog-derived hero-dashboard contract test and one dedicated browser
review route/runner. The fixture is created from a fixed built-in map and seed, then populated by
explicit deterministic fixture data rather than ambient time or random selection. It must cover:

- all four primary stats with base/equipment breakdown;
- one distinct portrait/specialty from each faction across the review matrix;
- seven occupied army slots including one-, two-, and three-hex unit art;
- zero-skill and six-rank-three-skill states;
- all eleven equipped positions, both ring and both Misc destinations, a locked Burden, Seamstone,
  all four Kit pieces, empty and populated backpack states, and the full 90-artifact sprite sheet;
- six- and eight-position item inventories, combat/adventure/automatic timing, stored Standard and
  Upgraded scrolls, empty slots, and the full 37-item sprite sheet;
- Attunement, Ritualist, Cache, Unstitch, two Debts, and representative non-default adventure status;
- action-log/state byte equality after all pure open/select/close detail journeys.

Required captures are **1440×1000** and **390×844** for the ordinary dashboard, primary-stat detail,
company detail/split entry, skill detail, equipped/backpack artifact detail and destination review,
item detail/use handoff, special controls, empty states, and long backpack. The runner must assert:

- zero `.hero-details-tabs`, tab buttons, `role="tab"`, or hidden category panels;
- one visible heading for every required region in the same rendered dashboard;
- all expected 4 stats, 7 army positions, learned skills, 11 equipment positions, every backpack
  instance, and 6–8 inventory positions are in the DOM with unique stable keys and accessible names;
- every image loads, has the declared intrinsic native dimensions, preserves aspect ratio, and has
  no renderer fallback after the 79-asset family is installed;
- `document.documentElement.scrollWidth === document.documentElement.clientWidth`, dialog and every
  visible control rectangle stay inside the viewport, and no region has horizontal scroll;
- exactly one dashboard body scroller when needed, locked page/map scroll, no nested vertical
  scrolling except the explicitly bounded long-backpack grid;
- every visible enabled and unavailable action has a nonempty accessible name/reason; every target
  is at least 44×44 px;
- mouse click, touch-like tap, Enter, Space, Tab order, Escape layering, exact focus return, and
  outer-dialog focus containment all pass;
- opening details and destination previews does not mutate state or append an action; confirmed
  actions reproduce the same reducer outcomes and replay state as the pre-dashboard components.

Proportional gates are the focused hero-dashboard/UI suites, catalog/asset/job/provenance checks,
`npm run ux-check`, `npm run spec-link-check`, `npm run build`, the dedicated desktop/390 browser
journey, browser smoke, and the full serial suite. The currently accepted unrelated deterministic-AI
termination failure may remain documented; no new failure is accepted.

## 9. Completion boundary

The feature is complete only when:

- one Hero Details dashboard contains every named region and no tab/mode replacement;
- click/tap and keyboard details are the first activation for all occupied graphical categories;
- the uniform artifact grid retains all eleven typed slot IDs and every existing legality/save rule;
- current actions and exact disabled reasons remain reachable without direct component mutation;
- the 21 skills, 90 artifacts, 37 items, 50 units, and four resources reuse their audited assets;
- all 36 portraits and 43 missing icons have generated, unique, native, manifest-backed,
  provenance-audited coverage;
- desktop and 390 px deterministic browser evidence passes without clipping, overflow, inaccessible
  content, hover-only rules, or state drift.
