# Pixel Art Batch Log

Each batch records its in-game composition check, failures, corrections, and prompt lessons inherited
by the next batch. Terrain batches must include a 3×3 self-tile seam/banding inspection.

The current terrain implementation, asset inventory, reproduction commands, and continuation point
are consolidated in `docs/36_TERRAIN_TRANSITIONS.md`. The entries below remain the chronological
reflection record.

## 2026-08-09 — Complete spell and secondary-skill icon catalog

- **Contract before generation:** all 68 spells and 21 skills use native 32×32 transparent RGBA,
  one centered 25px-class silhouette, a selective dark outline, compact four-to-six-colour clusters,
  lower-right light, upper-left shadow, and no frame, scenery, text, letters, numbers, logo, or
  watermark. Spell schools share a palette family without sharing the central metaphor. UI display
  is native ×1 or exact nearest-neighbour ×2; promotion copies provider bytes without resampling.
- **Endpoint learning:** one seeded PixelLab `generate-image-v2` background job returned 64 unique
  still images (64 byte hashes and 64 RGBA pixel arrays), not a sprite animation or tile family.
  The first Rally audit is `.pixel-work/review/spell-skill-icons/rally-variation-audit.png`.
  Jobs and validators now state this honest one-receipt/64-variation response instead of pretending
  that the set came from multiple provider calls.
- **What read well:** most selected first variations favored the prompt's central metaphor:
  Rally's trumpet, Blessing's crowned light, Standard of Dawn's sun banner, Hymn's lyre,
  Forgefire's anvil, Reckoning's hourglass, and the equally literal skill tools remain recognizable
  at 32px. Compact silhouettes, real alpha, dark outlines, and limited palette clusters compose
  cleanly on both dark panels and the warmer school accents.
- **What was rejected:** later alternatives in the same response often drifted from the exact
  mechanic into generic swords, torches, crowns, shields, or praying hands. The complete sheet
  therefore keeps 87 first variations, but replaces Mourners' Veil v1's near-empty dark shield
  with v24's readable veil/face and Wayside Shrine v1's text-like stone mark with v13's flame/slab.
  No candidate was patched, combined, recolored, or cleaned after generation.
- **Composition review:** `.pixel-work/review/spell-skill-icons/complete-selected-icon-sheet.png`
  compares all selected files at exact ×2 with names; the browser-native manifest and representative
  spellbook/Hero Details captures live beside it. No duplicate content, baked text, weak alpha,
  horizontal overflow, or missing surface integration remained after review.
- **Reproduction:** literal jobs are `assets/jobs/e1-spell-icons-*.json` and
  `assets/jobs/e2-skill-icons-*.json`; accepted selection and receipt provenance are
  `assets/iconSelections.json` and `assets/provenance/spell-skill-icon-jobs.json`. Work order 46
  documents regeneration, review, promotion, and validation commands.

## 2026-08-05 — Original terrain materials and HoMM2 image retirement

- **Generation:** three scripted PixelLab jobs produced two independent native variants for each of
  Grass, Snow, Water, Dirt, Beach, Plains, Swamp, Volcanic, and Desert. Every request used an
  existing original project terrain tile only as a palette/composition lock; no HoMM2 image was a
  generation input for this replacement batch.
- **First repeat review:** the first 3×3 sheet rejected flower/bright-dot Grass and Plains, green or
  shell-row Beach, lavender or icon-speckled Dirt, stamped plants in Swamp, and bright repeated
  Volcanic fissures. Snow, Water, and Desert already had quiet candidates. Seeds, negative prompts,
  palette references, detail, and guide strength were changed only for the rejected requests.
- **Second correction:** Beach still returned diagonal or horizontal bands after the first retry.
  A final high-strength same-size palette lock produced two uniform quiet sand candidates. Nothing
  with a tile-scale object, repeated row, or directional field was promoted.
- **Selections:** Grass 1/1, Snow 2/2, Water 2/1, Dirt 1/2, Beach 1/1, Plains 2/1, Swamp 2/2,
  Volcanic 1/2, and Desert 2/2. `scripts/promoteOriginalTerrain.py` copies all eighteen selected
  cells at 32×32 without resampling. The first browser composition exposed visible 32px value
  checkerboards between some otherwise-valid variant pairs. Derived 288×288 fields now broad-value
  match variant two to variant one, following the existing game-family rule; promoted native PNGs
  remain byte-for-byte selected.
- **Composition review:** `.pixel-work/review/original-terrain-selections-native.png` shows all nine
  final fields at native scale. Grass, Snow, Water, bridge Dirt/Beach, and the four showcase-only
  families remain materially distinct without seams, gradients, focal objects, or interaction-like
  decorations. The production and review SVG compositor now reads only original generated fields.
- **Boundary:** raw screenshots, exact crops, mixed H2 guides, extracted placeholder/transition
  fields, and stale rendered screenshots are precisely gitignored. A path-plus-SHA-256 gate scans
  every non-ignored image and prevents a renamed known source or derivative from shipping.

## 2026-08-05 — Terrain variants and game-family generation batch

- **Reference variation:** `scripts/buildH2TerrainPlaceholder` now catalogs several native interior
  cells per supplied family and uses quiet variants throughout each material field. Tiny source
  decorations are admitted at roughly one cell in twenty-nine; the first review rejected cells
  that were actually transition fragments and a snow cell whose rock cluster became tile-sized
  repetition. Eight labelled 12-cell native strips expose alternate coast, dirt, snow, swamp,
  volcanic, desert, and plains joins directly in the standalone showcase.
- **Scale law:** all extracted and generated cells remain 32×32 with no resampling. Fresh PixelLab
  prompts state that one cell is roughly human-sized: insects/caps/flecks are constrained to 1–5
  pixels, while a branch, ridge, ripple, or crack may span 8–14 pixels only when narrow, flat, and
  subordinate. Giant specimen/icon/focal-object readings are explicitly negative-prompted.
- **New family scope:** Deepwood, Mosswold, Ashsteppe, Barrowfield, Lacquer Flats, and Mire have no
  exact counterpart in the supplied H2 set. `scripts/buildGameTerrainGuides` builds one 96×96
  palette/material/transition guide plus native micro/macro scale guides per family from untouched
  H2 cells and existing approved PixelLab tiles. The renderer now displays these canonical visual
  families instead of mapping them back to generic Grass/Swamp/Desert/Dirt/Plains placeholders.
- **PixelLab requests and selections:** the first six two-candidate Wang families exposed excess H2
  colour influence. Deepwood 2, Mosswold 2, Barrowfield 2, and Mire 2 were retained; palette-dominant
  v2 guides corrected Ashsteppe 2 and Lacquer Flats 2. The selected sets promote 96 exact native
  Wang cells. The first detail protocol enlarged mushrooms/branches and recoloured fields, so it was
  rejected. Same-size game-palette composition locks at strength 330 produced six accepted 2–5px
  micro cells plus Mosswold 2 and Lacquer Flats 2 as the two accepted 8–14px larger marks. Failed
  candidates remain only in `.pixel-work`.
- **Credential propagation:** the key store was sourced only by interactive `.zshrc`, and its
  PixelLab assignment was not exported, so child Python processes could not inherit it. A private
  mode-600 `~/.zshenv` now sources the existing store and exports only `PIXELLAB_API_KEY` or its
  supported fallback; `.zshrc` no longer sources it twice. `scripts/pixelgen --check-auth` verifies
  plain, login, interactive, and child-process visibility without making a request or printing the
  value.
- **Review:** `.pixel-work/review/terrain-transition-showcase-native.png`,
  `.pixel-work/review/terrain-transition-variants-native.png`, and
  `.pixel-work/review/game-terrain-transition-showcase-native.png` pass native-scale visual review.
  The latter includes all six selected 16-cell Wang rows and native detail swatches. Source variants
  with mismatched broad value are average-matched only in derived 288×288 showcase patterns; source
  PNGs are neither resized nor overwritten. Browser smoke, production build, and the unchanged
  mountain review pass.

## 2026-08-04 — Native terrain-transition placeholder

- **Reference boundary:** `docs/h2_terrain.png` is treated only as a user-provided 16×27 composition
  reference and temporary texture source. `scripts/buildH2TerrainPlaceholder` extracts three quiet
  native 32×32 interiors for each of Water, Grass, Snow, Swamp, Volcanic, Desert, Dirt, Plains, and
  Beach into one reproducible placeholder atlas. No transition tile is copied into the compositor.
- **Reverse-engineered grammar:** water reaches any non-beach terrain through a narrow Beach band;
  unrelated land families reach one another through Dirt. Beach and Dirt join their neighbours
  directly, preventing recursive borders. Bilinear cell-corner ownership, coarse deterministic
  edge noise, and symmetric four-pixel bridge probes produce convex/concave corners, islands,
  one-cell channels, peninsulas, and three-way junctions without a pairwise transition catalog.
- **Renderer correction:** the first working pass rasterized that ownership field through an
  offscreen browser canvas. Visual review passed, but doc 31's no-canvas renderer law did not. The
  shipped compositor instead coalesces horizontal pixel runs into nine native SVG paths filled by
  reproducible 288×288 PNG patterns. The standalone showcase uses the same component. Browser
  reviews now fail if any runtime canvas is mounted.
- **Rejected samples:** the first composed review exposed a volcanic interior with a baked
  tile-scale gradient, a desert cell containing a brown transition fragment, a snow cell with a
  repeated rock motif, and a strongly diagonal Plains cell. Those variants remain in the source
  atlas for provenance but are excluded by `QUIET_VARIANTS`; the second review removed the visible
  checkerboard and transition fragments. Desert and Plains were narrowed once more to their least
  conspicuous quiet variants after a third full-size inspection.
- **Review:** `.pixel-work/review/terrain-transition-showcase-native.png` is an empty 60×42 field at
  native/displayed 32×32. It includes broad masses, acute elbows, holes, multiple islands, narrow
  channels, authored Beach/Dirt, and busy multi-biome contacts. Grand Muster native sections r1c3
  and r2c3 confirm the same compositor beneath real mountains and map props with no glyph fallback.
- **Scale:** the adventure renderer now uses global integer ×1, so a native 32×32 map tile occupies
  32×32 display pixels. Mountain source files and `deriveMountainRanges` are unchanged; their
  accepted ×2 proof remains historical evidence from before this scale correction.

## 2026-08-02 — Live regeneration A1 style lock

- **API/runtime correction:** the restarted shell exposed `PIXELLAB_API_KEY`, and the fresh pass ran
  against PixelLab v2. The installed 1.0.5 SDK still supplies credential/header configuration, but
  its missing `access_token()` method and stale USD-only response model required the quiet runner to
  decode current v2 JSON itself. Async receipts are written at submission time, completed resource
  IDs can be recovered, and signed image downloads use explicit image request headers.
- **Rejected protocols:** six fresh Wang/tileset probes returned flat 1–3-colour masks rather than
  playable terrain. Free Pixflux made flower/plant clumps, Pixen made hard borders and checker-like
  berry patterns, and PixelLab's map-object worker could not decode either supported reference-image
  representation. Production map-object jobs therefore use prompt-only generation; terrain uses
  native opaque composition guides with guided Pixflux.
- **Accepted 3×3 repeat review:** every retained 32×32 base tile was repeated 3×3 at integer scale.
  Meadow uses candidates 1/2/2, Deepwood 2/1/2, granite ground 1/1/1, and water 2/1/2 for variants
  0/1/2. Rejected alternatives contained visible grids, large plants, flowers, bright roots, or
  horizontal water bands. The accepted twelve remain opaque, quiet, and seam-free.
- **Forest experiment verdict:** same-state screenshots are
  `.pixel-work/review/forest-scattered-ingame.png` and
  `.pixel-work/review/forest-border-ingame.png`. Border-only trees became a loud picket around every
  fragmented forest edge and obscured roads and objects. Seeded scattered canopy clumps won; they
  share painter order with heroes/objects and fade to 40% when a subject is within one tile behind.
- **Mountain treatment:** three prompt-only mountain batches were rejected because all readable
  candidates became snow-capped alpine peaks. A fresh transparent 64×96 guide plus guided Pixflux
  produced squat bare granite; candidate 2 was selected. Rendering derives non-overlapping 2×1
  placements only from horizontal mountain pairs and leaves occupancy untouched. The full-map check
  at `.pixel-work/review/mountain-ranges-ingame.png` confirms that the props compose into an
  impassable spine without covering passable cells.
- **Current live coverage:** 26/287 manifest assets are fresh: twelve core terrain tiles, the 32×64
  Deepwood canopy clump, the 64×96 mountain range clump, and all twelve overlays. All 287 worklist assets retain a
  production job; no pre-restart image was promoted.

## 2026-08-02 — Live regeneration A2 overlays

- **Road protocol:** eleven fresh 32×32 transparent topology guides reserve the exact authored edge
  masks and six-pixel road width; guided Pixflux supplies the packed-earth pixels. Blank, hollow,
  one-pixel, and wrong-width candidates were rejected. East and east–west were isolated and rerun
  with fresh constraints/seeds instead of accepting a broken family member.
- **Selections:** candidate sequence is e/1, es/2, esw/1, ew/2, n/1, ne/2, ns/2, nw/2, s/1,
  sw/2, w/2. The family was judged on fully revealed Border Marches and Crosstitch, where all
  branches join and dead ends cap without covering adjacent tiles.
- **Seam correction:** guided Pixflux returned fully transparent output twice; the first Bitforge
  retry turned the mark into an object. A same-size high-strength broken-line style guide yielded a
  valid generated result; seed 13520 candidate 2 is the selected quiet plum stitch. The fully
  revealed Crosstitch composition is `.pixel-work/review/crosstitch-overlays-ingame.png`.

## 2026-08-02 — Live regeneration A3 terrain families

- **Protocol correction:** the ten remaining terrain/skin families no longer use the rejected Wang
  endpoint. Each of 30 variants has its own native 32×32 guided Pixflux request and fresh opaque
  family guide. Literal prompts, seeds, and overrides live in the three `a3-terrain` jobs.
- **3×3 review:** `.pixel-work/review/a3-terrain-selections-repeat.png` is rebuilt directly from
  `assets/selections.json`. The first review revoked six apparent winners for flowers, bright-dot
  grids, brick/polygon motifs, swirls, or horizontal bands. Fresh seed/strength retries flattened
  Ashsteppe 1, mossy Deepwood 0, Hush 1, Lacquer 1, and coastal water 1/2.
- **In-game composition:** fully revealed Crosstitch and Torn Sound were rerendered after promotion.
  Hush, Ashsteppe, mossy forest, and the central Seam remain distinct in Crosstitch; coastal water
  is now a continuous quiet sea in Torn Sound without the first pass's bright checker-ripple field.
- **Coverage:** all 42 terrain variants and all 12 overlays are fresh and manifest-backed. Total
  post-restart coverage is 56/287; every ungenerated asset still uses its procedural fallback.

## 2026-08-01 — Regeneration reset and Batch 0 correction

- **Prior art status:** every earlier generated PNG remains recoverable on disk, but the active
  manifest now contains none of them. They were produced before doc 32 landed, without committed
  production job files, and the user requested a fresh generation pass. The renderer therefore
  uses its complete procedural fallbacks until a new native-resolution candidate is reviewed and
  explicitly promoted through `REGENERATED_ASSET_IDS`.
- **What reads well in the fresh reference:** the regenerated A1 reference has a cohesive warm
  storybook palette, consistent upper-left light, strong forest/mountain mass, and clear terrain
  separation. It is saved only as a style input, never sliced or resized into game art.
- **What fails in the fresh reference:** its meadow, mountain, and water are much too detailed for
  32px play; the meadow also contains object-like flowers and rocks, and water contains rocks. The
  native PixelLab prompts explicitly suppress those motifs and must still pass 3×3 repeat review.
- **Batch-0 correction:** castles and mines now use 3×2 and 2×1 ground-contact anchors, respectively;
  tall canvases overhang upward. Decorations, objects, castles, and heroes share painter ordering.
  Ownable worklist entries require in-canvas `flagAnchor`s; the renderer uses the documented SVG
  pennant fallback until a fresh keyed pennant is generated. Broken/missing images retain glyphs.
- **Generation status:** `assets/jobs/a1-regenerate.json` validates and records two native 32px Wang
  probes for each core pairing. The production run cannot start because neither
  `PIXELLAB_API_KEY` nor `PIXELLAB_SECRET` is present. No old candidate is accepted as a substitute.

## 2026-08-02 — Fresh phase references and complete production catalog

- **Built-in reference pass:** regenerated three non-shipped sheets for adventure structures,
  eight-direction hero classes, and side-view battle silhouettes. The structure sheet establishes
  the high-oblique roof/entrance read; the hero sheet makes all six locomotion laws unmistakable;
  the battle sheet gives the six playable factions materially distinct black-silhouette profiles.
- **What reads well:** the structure castle has one strong centred foreground gate and vertical
  tower mass; the mine and timber camp are self-contained; hero mounts range cleanly from horse to
  construct, drift, chitin, besom, and steppe horse; the six flagship units remain attributable
  without labels. Upper-left light and warm storybook rendering are consistent across all sheets.
- **What must not leak into native output:** all three references carry far more micro-detail than
  32–128px sprites can support and sit on warm paper rather than alpha. The mine includes loose rail
  context, and the structure subjects are not exact ground-contact diagrams. Native prompts therefore
  restate alpha, canvas, baseline, footprint, gate/mouth, no-ground, and no-scenery laws literally;
  the sheets are palette/material/camera guidance only and are never sliced or resized.
- **Catalog status:** the data-derived 285-item worklist is covered by 216 requests in 40 committed
  jobs. Twenty-nine are ready; eleven battle jobs are intentionally staged behind the mandatory
  Hearthguard and Wound-Wrights prompt-only versus fresh-flagship-reference comparisons. Catalog
  validation checks every asset mapping, native size, output collision, reference, candidate count,
  and batch size. PixelLab submission remains blocked by the absent local credential.
- **Renderer contract check:** promoted hero and battle sprites are now required to place their
  centered feet/baseline eight pixels above the native canvas bottom; wide units use the same rule.
  The documented SVG-pennant fallback remains in use and now has explicit colors for p1–p4, so a
  future ownable sprite cannot silently lose its flag on a three- or four-player map.

## 2026-08-03 — Hearthguard battle roster

- The live native PixelLab route was unavailable because neither accepted credential variable was
  present. The six-unit batch therefore used the documented built-in chroma-source path followed by
  deterministic alpha removal, native-canvas fitting, and a shared restrained Hearthguard palette.
- The old native Longbowman and Bannerman probes were rejected after a full roster sheet exposed
  their weak reads: the archer's bow disappeared and the alleged Bannerman carried no banner. The
  replacements make the bow, standard, lance, ceremonial standard, and wide Wyvern silhouette the
  primary reads at native scale.
- The original 64×64 exports proved suitable only for adventure-map tokens: fitting the full bow,
  standards, lance, horse, and Wyvern into those boxes miniaturized the combatants. Combat now has a
  separate visual-canvas contract: 128×128 for foot units, 192×128 for the mounted Lance Knight and
  two-hex Oriflamme Wyvern, rendered with deliberate battlefield overhang while tactical footprints
  remain unchanged. The two standard-bearer sources were recomposed with compact standards so the
  whole emblem remains visible without sacrificing fighter scale. All six keep the centered baseline
  eight pixels above the canvas bottom and ship through the normal manifest fallback path.
- Review sheet: `.pixel-work/review/hearthguard-roster.png`. Reproducible extraction and sheet
  assembly: `scripts/buildHearthguardRoster.py`. Coverage is now 6/50 battle units.

## Batch 0 — Manifest and fallback wiring

- The 56×44 Grand Muster introduced one previously unused road topology, NSW. Its shipped tile is a
  lossless 90° clockwise rotation of the approved ESW junction, preserving the exact road palette,
  width, transparency, and oblique camera while restoring 13/13 overlay coverage.

- Added the data-derived asset worklist, manifest schema, resilient preload/render fallback, native
  dimension validation, and per-category coverage reporting.
- No visual assets are part of Batch 0, so composition reflection begins with Batch A1.

## Batch A1 — Border Marches terrain style lock (superseded camera pass)

This pass established palette and tiling lessons, but its straight-overhead camera was rejected after
composition. The replacement pass below reuses the useful seam/banding findings in an explicitly
oblique HoMM/Warcraft camera.

- **What reads well:** Deepwood has an immediately legible canopy silhouette at native scale, while
  the three coordinate-selected variants prevent a mechanical checker pattern. Granite mountain is
  clearly harder and sharper than traversable ground. Meadow stays quiet enough for objects and
  route overlays to dominate. Water reads as a single calm field instead of a row of effects.
- **3×3 self-tile check:** all shipped candidates were repeated in 3×3 fields at integer scale before
  selection. The retained tiles have continuous edges and uniform whole-tile illumination. No
  vertical water banding, edge seams, or per-tile top-to-bottom gradient remains.
- **What failed:** seed 3101's meadow options formed obvious circular pools when repeated. Its water
  candidates 13–15 exposed horizontal rows or bands. Seed 3103's Deepwood tile 6 made tree rows and
  tile 7 left conspicuous repeated clearings. Orange mountain seams and snowy high-contrast crags
  drifted outside the Border Marches granite palette. Seed 3102 produced no candidates because the
  service rejected the run.
- **In-game composition:** Border Marches was inspected at native scale after wiring. Terrain, fog,
  reachable outlines, map glyph fallbacks, roads, and the minimap remained legible together. The
  selected variants did not introduce visible seams or checkerboarding; hard terrain boundaries are
  retained as the milestone explicitly allows. Browser smoke passed across adventure, castle, and
  combat flows.
- **Inherited prompt change:** ask for low-contrast microtexture rather than large tonal patches,
  explicitly forbid rows/repeated clearings as well as gradients, and keep adjacent variant palettes
  within a narrow value range. Flatness is preferable to a beautiful motif that tiles visibly.

## Batch A2 — Roads and Seam (superseded camera pass)

This topology/extraction pass remains useful process evidence, but its road surface was generated
against the superseded overhead terrain camera. It is not the final A2 acceptance.

- **What reads well:** the selected road family has one stable width, warm packed-earth values, and
  small cream pebble highlights. All eleven connection masks derived from the authored maps share
  exact edge positions. Straight runs, corners, dead ends, and Crosstitch's four long branches read
  continuously over meadow, pale ground, Deepwood, mountain, and water at native scale. The road
  remains subordinate to castles, heroes, and interaction glyphs.
- **What failed:** four freeform road candidates became decorative medallions instead of edge-bound
  paths. Path seed 3252 returned invalid repeated mask metadata, while seed 3251 was topologically
  correct but too pale and flat. PixelLab's background-removal edit rewrote the road geometry and
  was rejected; a deterministic alpha-only chroma extraction retained the selected seed-3250 art.
  The first Seam composition was the most important failure: scattered pixels looked quiet alone
  but repeated as a loud blue-purple cross across Crosstitch. Layout-guided PixelLab retries
  collapsed to blank output. Removing seed 3310's excess marks outside a one-pixel diagonal band
  produced the restrained surveying-hairline read requested by the prompt without adding pixels.
- **In-game composition:** Border Marches and a fully revealed Crosstitch were composed in the real
  adventure renderer. Roads remained transparent and joined cleanly at every visible topology.
  The corrected Seam stays visible across changing terrain but reads as fine wrong-colored ground
  hatching rather than a glow or particle effect. Fog, terrain variation, objects, route outlines,
  and the minimap remain legible. The temporary full-reveal inspection was removed afterward.
- **Integer-scale check:** all eleven road masks were composited over the shipped meadow at ×1, ×2,
  and ×3 with `image-rendering: pixelated`. Edges remain crisp and widths stay integral; no blur,
  checkerboarding, seams, or scaling gaps appeared. Hard terrain boundaries remain intentionally in
  scope per the milestone acceptance rule.
- **Inherited prompt change:** use topology-aware generators for connected vocabularies, validate
  the returned placement metadata before visual selection, and judge sparse overlays in their full
  authored repetition pattern—not as a single transparent tile. Treat service edits as candidates;
  reject them whenever a preservation request changes geometry.

## Batch A1R/A2R — Oblique-isometric camera correction

- **What reads well:** Deepwood crowns and granite crags now expose upper-left surfaces and
  lower-right near faces in the classic HoMM/Warcraft adventure-map camera. Meadow tufts and water
  marks use the same foreshortened diagonal language without pretending that a flat square map cell
  is a diamond. The narrower corrected road has shallow near-edge shade and sits on that surface
  instead of reading as a straight-overhead diagram.
- **What failed:** both 45° candidate sets rendered each cell as a side-on slab with a dark bottom
  band. They were rejected. The 65° zero-extrusion candidates fixed the camera geometry, but the
  PixelLab square template still returned transparent rows 0, 30, and 31; their first 3×3 fields
  therefore showed black horizontal seams. A deterministic edge repair fills only those template
  rows from generated row-1/row-29 pixels and their midpoint. No interior art is repainted.
- **3×3 and scale checks:** every shipped terrain candidate was repeated in a 3×3 field after the
  technical edge repair. No transparent row, horizontal band, or open seam remains. Forest and
  mountain silhouettes retain visible height; meadow and water remain quiet enough for overlays.
  All eleven corrected road masks remain crisp and terrain-transparent at ×1, ×2, and ×3.
- **In-game composition:** Border Marches was rerun through the real adventure, save/load, castle,
  and combat smoke flow. Oblique crags, raised forest crowns, meadow microtufts, water, roads, fog,
  interaction glyphs, and reachable outlines remain legible together. The rendering still uses the
  original square grid and gameplay coordinates; this is a camera/style correction only.
- **Inherited prompt change:** future terrain uses the 65° high-oblique, zero-cell-extrusion law.
  Perspective belongs inside material forms; never ask the tile template itself to provide depth.
  Always inspect raw alpha edges because a visually plausible isolated candidate can contain
  transparent template rows.

## Batch A3 — Remaining terrain families

- **What reads well:** all authored terrain/skin pairs now share the A1R camera law. Mossy
  Deepwood and snowcap Mountain carry the strongest height cues through rounded crowns and
  upper-left snow ridges with darker lower-right near faces. Mosswold reads as living moss first,
  with its cloth-like regularity arriving second. Lacquer Flats remains quiet polished stone;
  Barrowfield, coastal Meadow, and The Hush leave visual room for objects. Coastal water uses
  foreshortened diagonal wavelets without a shoreline baked into the ground.
- **What failed:** seed 3621 painted large pale diamond/clearing shapes through forest, meadow,
  and mountain candidates. They became dominant bands in a 3×3 repeat and were rejected even
  where the isolated tile looked dramatic. Several Mosswold candidates became literal maze or
  woven patterns. The first Ashsteppe selection looked scorched rather than like dry grass over
  old ash; it was replaced by the quieter pale-grey/tawny frames. The first Mire trio repeated as
  decorative blue-brown scallops; two quieter peat frames replaced it.
- **3×3 self-tile check:** all 30 shipped candidates were repeated at integer scale after edge
  repair. PixelLab again left template rows 0, 30, and 31 transparent. The deterministic repair
  fills only those rows from generated row-1/row-29 colors and their midpoint. The validator now
  checks RGBA data and rejects any non-opaque terrain pixel. No transparent bands remain; three
  coordinate-selected variants per family break up the remaining microtexture repetition.
- **In-game composition:** fully revealed Crosstitch and Torn Sound were captured through the real
  adventure renderer at native scale. Crosstitch keeps its four roads and central Seam legible over
  Hush, Ashsteppe, Mosswold, raised Deepwood, mountain, and water; Torn Sound keeps islands,
  coastal Meadow/Mire, objects, and the large coastal-water field distinct. A fully revealed
  Manywhere exceeded the headless browser's practical image-node limit, so its unique Lacquer and
  snowcap candidates retain their 3×3 field review rather than disguising a browser failure as an
  art failure. The normal explored-area browser smoke remains the runtime gate.
- **Composition judgment:** family value ranges are intentionally tiered: pale Barrowfield/Hush,
  mid-value Meadow/Ashsteppe/Lacquer, dark raised forests and moss, high-contrast impassable
  mountains, and cool water. This keeps terrain identities readable beneath roads, fog, reachable
  outlines, decorations, and map objects while preserving the HoMM/Warcraft oblique camera.
- **Inherited prompt change:** reject large light voids and literal geometric regularity at the
  contact-sheet stage, not only seams. “Mundane first read” needs selection discipline as much as
  prompt wording. For future terrain-like ground, keep the 65° internal-form camera, zero cell
  extrusion, narrow family palettes, and explicit exclusion of decoration-layer motifs.

## Batch A4a — Meadow decorations and old oak

- **What reads well:** the six Meadow sprites remain transparent, centered, and subordinate to the
  32px terrain. White/yellow/blue flower groups now share one silhouette scale, the butterfly is
  readable without becoming a map object, and the straw skep has a clear lower-right near face.
  The old oak fills its authored obstacle cell with a raised crown and grounded trunk, so it reads
  as impassable in the same high-oblique camera as Deepwood rather than as a flat tree icon.
- **What failed:** small-sprite text generation consistently tried to turn flower scatters into
  bouquets, planters, or bordered emblems; one candidate literally baked a checkerboard. The first
  cart-rut image became a grassy isometric slab, while the retry expanded into a path scene with
  trees. The rejected oak retry was a tiny windswept sapling. Prompted pixel dimensions helped but
  did not reliably control occupied footprint.
- **Composition and correction:** candidates were first composited over a 3×3 field cycling all
  three shipped Meadow variants at ×2/×3, then a fully revealed Crosstitch exposed a second failure:
  three-flower groups, the butterfly, and the skep were individually clear but collectively too
  loud at native map scale. The final flower sprites retain one generated blossom/stem cluster;
  yellow and blue reuse it through deterministic blossom-only palette transforms. Native 32px
  layout-guide retries reduced the butterfly and skep footprint without resizing. Cart ruts retain
  only generated earth pixels inside two narrow parallel bands and discard the candidate's baked
  grass context; their muted-brown result reads as compressed earth rather than a second road. The
  corrected Crosstitch field leaves roads, objects, terrain identity, and interaction glyphs in
  visual control.
- **Inherited prompt change:** for tiny scatter art, candidate footprint must be judged over terrain
  immediately; “transparent background” alone does not prevent a generated base or emblem.
  Prefer one approved silhouette plus a documented palette family when separately generated color
  variants drift in scale. Standalone obstacles should name their cell occupancy and visible
  near-face structure explicitly.

## Batch A4b — Deepwood/Mosswold decorations and the Spool

- **What reads well:** the selected deadfall stays legible against dense Deepwood crowns without
  filling the cell. The small mushroom ring has six warm points but no magical glow or ground base.
  Patterned moss nearly disappears into Mosswold until inspected, while the rationed stitched ridge
  is a quiet diagonal rise with a regular near shadow. The 2×1 Spool reads as one solid mossy,
  ridged earth cylinder in the same high-oblique camera as the terrain.
- **What failed:** direct mushroom candidates added a green pedestal or a literal checkerboard.
  Direct stitched ridges became bright zippers and jeweled bars. The first patterned moss glowed
  like a pickup. Most importantly, both text-only Spools were unmistakable manufactured thread
  spools with flanges and hollow cores—the opposite of mundane-first assimilation.
- **Composition and correction:** all four decorations were composited over their actual Deepwood
  or Mosswold tile families at ×2/×3. Native layout guides constrained the mushroom and ridge
  footprint after prose dimensions failed. A 64×32 guide made the Spool a low two-cell hillside
  mass with sediment-like winding ridges; no resize or baked terrain context was introduced.
- **Inherited prompt change:** anomaly art needs shape constraints more than stronger surreal
  wording. State the ordinary silhouette in the guide, then let texture carry the second read.
  Reject literal object-category matches even when they are technically polished.

## Batch A4c — Ashsteppe/Barrowfield/Lacquer decorations and the Block

- **What reads well:** the paired skull fragments expose small brow tops and lower-right face
  planes without becoming a resource pile. The short banner is unmistakably upright; the pale
  letter-stone is a compact solid with a broad lit top. Grain-lines and paint-flecks stay embedded
  in Lacquer Flats as sparse foreshortened marks. The Block occupies its full 2x1 footprint as a
  broad masonry prism, with the painted geometry subordinate to its stone mass.
- **What failed:** text-only small art repeatedly became a bordered inventory icon or a complete
  ground tile. Three candle prompts produced flames despite explicit “unlit” wording. Grain became
  floorboards, paint became a medallion, and the first skulls became mask emblems. A technically
  attractive Block candidate was rejected because it occupied only about one cell rather than its
  authored two-cell footprint.
- **Composition and correction:** every selected sprite was composed over its actual three-variant
  terrain family at native scale and at 3x. Native layout guides fixed the occupied footprint for
  the five unreliable shapes; PixelLab refined those guides without resizing. The selected banner
  and letter-stone were the only text candidates whose transparent silhouettes and high-oblique
  near planes survived that review.
- **Inherited prompt change:** for surface microdetails, use a sparse native guide immediately.
  For multi-cell objects, the guide must express the full authored footprint and visible near faces;
  “64x32 canvas” alone does not make the generated subject fill 64x32.

## Batch A4d — Hush and Mire decorations

- **What reads well:** fox tracks form a quiet lower-left-to-upper-right trail rather than a symbol.
  The frozen pond is a foreshortened ice surface with a restrained lower-right lip, and the reeds
  have upright stems plus shaded seed-head sides. All three remain subordinate to terrain at native
  scale and retain genuine transparent pixels.
- **What failed:** no text-only pass was spent here. The A4a–A4c evidence already showed that tiny
  scatters and flat patches drift into emblems or full terrain cells without a silhouette guide.
- **Composition and correction:** the guides were rendered at the final 32x32 resolution, refined
  by PixelLab, and composed over all three Hush or Mire variants before promotion. Tracks and pond
  are perspective marks inside the oblique ground plane; reeds use the same upper-left light and
  lower-right side shading as raised terrain forms.
- **Phase-A result:** terrain is now complete at 42/42 base tiles, 12/12 overlays, and 19/19
  decorations, plus all three authored anomaly/obstacle props. The renderer remains a 32px square
  grid; only the art camera is high-oblique.

## Batch B1 — Resource piles and treasure chest

- **What reads well:** the four pickups have distinct silhouettes and material laws: coin cylinders,
  long timber with round cut ends, irregular charcoal iron, and faceted blue-violet Essence. The
  closed coffer is larger than the piles and exposes its lid, front, and right face clearly.
- **Composition:** all five first candidates were composed over Meadow, dense Deepwood, and Hush.
  Their selective outlines provide enough contrast at both value extremes, while the transparent
  footprint keeps them valid on any terrain. No candidate depends on a baked ground patch.
- **Camera check:** coin tops, log lengths, ingot/ore planes, crystal facets, and the chest lid all
  use the same upper-left-lit, lower-right-shaded high-oblique view as the terrain. None reads as a
  straight-overhead inventory icon.
- **Inherited prompt change:** pickups can tolerate stronger contrast than passive decorations, but
  must still name their occupied pixel footprint and forbid a pedestal. Review on the darkest and
  palest terrain families before promotion.

## Batch B2 — Mines and Rich Vein

- **What reads well:** each 2x2 site now reserves a visibly open bottom-left entrance while the
  lower-right cell remains occupied. Gold uses warm braces and pale quarried rock, Iron uses a dark
  headframe and cool stone, Timber exposes logs and a shelter, and Essence is a low wrong-water
  basin. Rich Vein is a compact high-oblique outcrop rather than a flat crack decal.
- **What failed:** the first freeform 64px candidates were the most detailed, but every one baked in
  a square grass/soil plinth; Iron and Timber also added a miniature landscape. The dedicated map-
  object endpoint returned clean alpha but ignored footprint scale and entrance placement: Gold
  and Timber shrank to one-cell props, Iron became a cliff cave, and Essence acquired a beige path
  and shed. The first strength-330 guide pass preserved footprint but was too diagrammatic.
- **Composition and correction:** native 64px transparent guides encode the irregular object mass
  and entrance. A strength-220 PixelLab refinement adds modest material detail while preserving
  alpha and the gameplay opening. Candidates were reviewed over Meadow, Deepwood, and Hush; the
  Rich Vein remained legible on all three without glow.
- **Inherited prompt change:** use the dedicated object endpoint as a candidate, not an exemption
  from footprint law. Multi-cell visitable sites need a layout guide that reserves the exact
  entrance before style refinement; reject terrain context even when it makes a prettier vignette.

## Batch B3 — Castles and neutral town variants

- **What reads well:** all six canonical factions now have distinct 3x3 silhouettes under one
  high-oblique camera. Hearthguard is upright cream/red masonry, Hagwood is crooked black wicker
  and birch, the Unfinished is a pale draped hollow, Vespiary is paper/amber/chitin, Wildergrass is
  a low horned stockyard, and Wound-Wrights is articulated lacquer and tin. The four neutral-town
  variants retain their parent construction language without ownership colors.
- **What failed:** the native Hearthguard layout guide stayed diagrammatic at two strengths, the
  dedicated map-object endpoint returned a polished straight-on facade, and a freeform candidate
  baked in a grass plinth. Pro consistently solved the roof/courtyard camera, but usually placed its
  most obvious gate on a lower side wall even when the prompt requested the foreground center.
- **Composition and correction:** all candidates were compared at native size and 3x over Meadow,
  dense Deepwood, and pale Hush. A final batched PixelLab edit retained each selected Pro
  silhouette and faction material law while strengthening a dark foreground entrance aligned with
  the authored bottom-middle entrance cell. No sprite contains terrain context.
- **Inherited prompt change:** for large visitable structures, name the screen-space entrance and
  verify it over the actual square-grid footprint after generation; a convincing isometric wall
  can still imply the wrong interaction cell. Use style references for outline/detail/shading only,
  never palette, when faction material laws need to diverge.

## Batch B4 — Shrines, Barrow Field, Waystation, and Mana Spring

- **What reads well:** Craft and Rite remain compact, high-contrast visits; Grave is now pale and
  quiet rather than purple-necromantic, Wild is a crooked listening arch rather than a magic ring,
  Barrow has one dark foreground mouth, Waystation exposes its roof and doorway, and Mana Spring is
  an ordinary stone basin before it reads as strange water.
- **What failed:** text-only generation repeated the small-site icon failure: Grave acquired purple
  magical framing, Wild became a green circular emblem, and both Barrow and Waystation baked in
  terrain-colored bases.
- **Composition and correction:** five native transparent guides constrained structure and alpha;
  PixelLab refined them at final resolution without resizing. All seven sites were compared over
  Meadow, dense Deepwood, and pale Hush, where their selective outlines remain legible without
  overpowering castles or pickups.
- **Inherited prompt change:** a 1x1 visitable site needs a recognizable raised silhouette, but any
  encircling color reads as a UI emblem or baked ground. Use asymmetric open silhouettes and reserve
  visual effects for runtime UI.

## Batch B5 — Authored dwellings

- **What reads well:** all six factions now have three authored recruitment sites whose roofs and
  near walls share the adventure camera. Hearthguard is cream/red and upright, Wound-Wrights is
  lacquer/tin, the Unfinished is pale and hollow, Vespiary is paper/amber/chitin, Hagwood is crooked
  wicker/birch, and Wildergrass is low hide/horn. The Masque Ring is a separate plum pavilion.
- **What failed:** the first Sentries candidate introduced a dark green roof, and the first Larval
  Tide candidate was a bowl rather than architecture. Pixen also added narrow green contact fringes
  to many small buildings despite explicit transparency and no-ground wording.
- **Composition and correction:** Sentries and Larval Tide were regenerated with stricter material
  and building-shape language. For palettes containing no green material, a deterministic
  lower-canvas hue extraction removes only the generated green fringe; it does not resize, repaint,
  or replace the selected architecture. Every dwelling was compared over Meadow and Hush.
- **Inherited prompt change:** name a dwelling as a building more than once when the unit concept
  tempts an icon or vessel. At 32px, faction attribution comes primarily from roof material, height,
  and silhouette; unit-specific props should remain one small secondary cue.

## Landscape proof — hero, one building, mountain, castle

- **What reads well:** the adventure camera is now an integer ×2 and follows the selected hero.
  A single 128×128 meadow field is applied in world coordinates beneath the hidden gameplay cells,
  so grass reads as one continuous landscape instead of a 32px checkerboard. The existing timber
  camp's irregular vegetation skirt blends into that field. The selected low mountain candidate
  uses an uneven grass-and-scree base, while the Hearthguard castle's overhang, gate, and planted
  edge now read at the same scale as the hero.
- **What failed:** cycling three full-square meadow variants exposed every cell even after grid
  strokes were removed. Matching the opposite edges of one 32px candidate still repeated too
  often. The first two unguided 128px prompts became complete scenes with trees, paths, and flowers.
  The first mountain pass and its first retry both favored isolated alpine triangles; only the
  second retry's low broad escarpment avoided the icon read.
- **Composition:** the reproducible `review:landscape` browser pass captures four cumulative states:
  hero on meadow; timber camp added; the selected broad mountain added; then the starting castle.
  It intentionally hides unrelated terrain and objects. The proof uses five logical sprite types,
  well below ten, and no battle-unit expansion was attempted after the visual reset.
- **Inherited prompt/render change:** terrain material may span multiple gameplay cells when it is
  sampled in world coordinates; interaction geometry must not dictate texture repetition. Large
  objects need irregular native-ground contact pixels, not rectangular terrain plinths. Do not
  resume broad roster generation until a similarly small composed scene passes review.

## Landscape camera-lock correction — accepted six-type proof

- **Rejected from the prior proof:** the 128px olive meadow, high-top-down/isometric timber and
  castle, grass skirts, baked castle flags, the isolated 64×96 mountain island, and all relative
  scale claims attached to them. Historical candidates remain review-only and can no longer
  overwrite production during batch promotion.
- **What now reads:** the selected hero is centered and fills more of its 32×48 canvas. A 256×256
  emerald meadow removes both the visible rules grid and the substitute pattern of 128px circular
  lawn islands. The timber camp is a south-facing elevation with a horizontal wall contact and no
  ground. Two 128×160 mountain files alternate and overlap into a broad five-tile-tall massif.
  The 96×128 castle is frontal, gate-centered, flagless, and receives ownership only from the
  existing runtime flag overlay.
- **Failures during correction:** the first rich meadow guide produced square patches; the second
  produced circular islands. Full-size character generation returned padded 48×68 canvases, and a
  meadow color reference turned the whole rider green. Bitforge demanded exact-size style images.
  Low H2 style strength made buildings diagrammatic; high strength copied paths and vegetation.
  Narrow 64×160 mountain guides became sail-like spires; the broad 128×160 canvas fixed the mass.
  Flowered mountain candidates and castle candidates containing scenery were rejected.
- **Post-processing boundary:** no selected pixel is resized. Character processing removes only
  transparent endpoint padding. Meadow repair touches only opposite one-pixel borders. Mountain
  cleanup normalizes 51 saturated reference-marker pixels to an existing rock highlight, then the
  alternate is mirrored without resampling.
- **Inherited rule:** lock terrain first; use exact-size isolated style references; state camera and
  tile coverage in every prompt; compare all candidates in the cumulative map scene. Do not expand
  beyond this six-type vocabulary until new art matches these camera/ground/scale constraints.

## Landscape cute-style probe — endpoint and prompt reset

- **What reads well:** the selected 96×128 three-tower manor is frontal, cute, flagless, and fully
  plateless. The 160×112 mountain is one connected asymmetric five-tile-wide mass rather than a
  repeated 1×1 icon. The 32×48 mounted hero remains legible between them at integer ×2. In the
  cumulative map capture, all three read as one small H2-like vocabulary rather than board pieces.
- **What failed:** exact-size HoMM2 screenshot crops used as Bitforge style images were treated as
  composition and copied paths, grass, UI fragments, and duplicate structures. Prompt-only
  Bitforge lost subject semantics. Pixflux understood all three subjects, but its castle prior
  ignored repeated no-ground/no-flag wording and produced lawns and pennants. Early mountain prompts
  produced mushrooms, scattered rocks, snowy alpine islands, and planted miniature bases.
- **Endpoint verdict:** short subject prompts work better than coordinate-heavy prompt programs.
  Pixflux is the current choice for broad natural formations and the one-facing hero probe.
  `generate-image-v2` is the castle choice: its automatic background removal produced eight clean
  native candidates from two seeds without an init mask or style crop.
- **Lighting and composition:** prompts now state visible screen-space lighting—bright right faces,
  dark left faces, shadow up-left—corresponding to southeast light and northwest shadow. The selected
  files were reviewed together over the shipped meadow at native integer ×2. The review applies a
  northwest runtime alpha-silhouette shadow to the two structures, keeping their source PNGs plateless
  and terrain-agnostic. They remain review-only until a future pass supplies a complete directional
  hero set and map placement rules for the wider mountain canvas.

## Cute faction castles v2

- **What reads well:** all six castles share the approved frontal oblique camera, transparent
  architecture-only contact, central gate, warm storybook clusters, and 96×128 canvas. Their
  silhouettes separate cleanly: Hearthguard is upright cream masonry; Wound-Wrights is lacquered
  and jointed; Unfinished is pale, hollow, and linen-draped; Vespiary is segmented paper-and-resin;
  Hagwood is crooked birch-and-wicker; Wildergrass is low, horn-framed hide architecture.
- **What failed:** the first Hagwood set made black wicker dominate and several candidates read as
  nearly black scaffolds. A white-birch-dominant retry was submitted but PixelLab rejected it before
  generation because the account had only 9 generation units left. The selected existing Hagwood
  candidate is the lightest complete birch-centered option. Initial Vespiary and Wildergrass picks
  left too much transparent canvas, so larger candidates from their completed sets replaced them.
- **Composition:** `review:landscape` renders all six at integer ×2 over the shipped meadow with the
  same northwest runtime alpha shadow. No sprite contains a flag, lawn, path, platform, or terrain
  pixels. The lineup remains in the versioned `public/assets/castles-v2/` review directory; the
  accepted toy-factory design is also promoted to the manifested
  `public/assets/castles/unfinished-castle.png` production path.
- **Inherited rule:** keep the shared castle prompt short and vary only canonical materials and
  silhouette. Judge occupied visual bounds across the full lineup before selection; equal PNG
  dimensions alone do not enforce equal perceived scale.
- **Toy-factory replacement:** the pale hollow castle was rejected because its proper-name prompt
  made the renderer illustrate incomplete construction instead of the intended design. The
  replacement is a complete medieval gatehouse crossed with a toy workshop: oversized brass gear
  windows, copper wall pipes, winding hardware, cream stone, and red workshop roofs. Prompt text now
  describes visible architecture and materials without using the faction name. Pixflux established
  the native silhouette; a constrained image edit removed the repeatedly invented flags and plants
  and strengthened the machinery. The final 96×128 RGBA sprite has a clean transparent contact edge
  and no ground plate. It replaces the former partially built-looking sprite on the live adventure
  map without changing its content ID, dimensions, footprint, entrance, or runtime flag anchor.

## Doc 33 mountain-family migration — active, not approved

- **Audit finding:** the live mountain treatment contradicted doc 33. It had two 128×160 clumps,
  one produced by horizontal mirroring, with no scatter or size distribution. The archive review at
  `.pixel-work/review/doc33-mountain-archive-contact.png` shows the old clumps failing one or more of
  edge termination, silhouette symmetry, and width-to-height checks. Several other archive
  candidates also contain grass skirts, trees, flowers, or clipped rock walls and remain rejected.
- **Existing keeper:** the previously accepted seed-94222 broad grey massif is the only archived
  mountain that reads correctly in the new contact/silhouette audit. Its authored pixels were not
  resized or repainted; eight rows of transport padding were moved below-to-above so its visible
  base is bottom-anchored. It now ships as `mountain-granite-massif-1.png`. The single-object review
  is `.pixel-work/review/doc33-maps/border-marches-mountain-single-x2.png` and the composed map view
  is `.pixel-work/review/doc33-maps/border-marches-full-x2.png`.
- **What still fails:** one massif on a flat mountain strip remains a placed object, not a range.
  The family has no six-piece scatter transition, knolls, workhorse ridges, second massif, or
  snowcap counterparts. It therefore has **no approved cluster screenshot** and does not meet doc
  33 acceptance. Crosstitch and Torn Sound screenshots contain no compatible massif anchor;
  Manywhere's large SVG stalled the Chrome capture, so that authored-map visual remains unverified.
- **Generation failures:** Bitforge first rejected the 160×112 style reference because style inputs
  must exactly match the requested 32×48 size. Exact-size style and terrain-color guides fixed that
  protocol error, but the first generated scatter became a thin vertical smear and was rejected.
  Before candidate two, PixelLab returned HTTP 402: the account is at 2,000/2,000 generations with
  zero credits. The remaining five requests were not submitted. No alternate generator is promoted
  because doc 31 requires production pixels to come through the scripted PixelLab workflow.

### 2026-08-02 continuation audit

- **Manywhere evidence is no longer missing.** Chromium stalled while mounting the complete 48×40
  map as one 3072×2560 native-×2 SVG, before screenshot capture began. The review harness now crops
  only its review-state envelope into six verbatim 16×20 authored sections; production map data,
  assets, renderer code paths, and ×2 scale are unchanged. All six files
  (`manywhere-r1c1-full-x2.png` through `manywhere-r2c3-full-x2.png`) report zero in-scope glyph
  fallbacks. Both the snowcap boundary in row one and granite boundary in row two report zero massif
  anchors, so this is evidence of an art gap, not an approval.
- **Nominal coverage is not visual approval.** New light/dark/silhouette sheets audit the shipped
  B1/B2/B4 set at `.pixel-work/review/doc33-b1-b2-b4-contact.png` and all B5 dwellings at
  `.pixel-work/review/doc33-b5-dwellings-contact.png`; all archived alternatives are shown in the
  corresponding `*-all-candidates.png` sheets. Gold and iron resource piles, Rich Vein, several
  mines/shrines, and most dwellings carry a grass/pebble skirt. Several ownable dwellings also bake
  red pennants into the architecture. Those are doc-33 hard rejects even though a manifest PNG
  exists, so B1/B2/B4/B5 remain queued for selective replacement after mountains. Clean assets such
  as timber, the chest, essence pile/basin, waystation, and mana-spring are not queued merely for
  stylistic novelty.
- **Current generation blocker:** the scripted PixelLab retry could not reach the service because
  `PIXELLAB_API_KEY`/`PIXELLAB_SECRET` is absent from both the WSL process environment and the
  Windows environment visible to this agent. This is distinct from the prior HTTP 402 quota result:
  the current attempt stopped locally before submission. No alternate production generator was
  used.
- **Family contract is now explicit:** the data-derived worklist contains 6 scatter, 4 knolls,
  4 ridges and 2 massifs for each authored mountain skin (`granite` and `snowcap`). Granite scatter
  remains the only ready batch. Granite medium, snowcap scatter and snowcap medium jobs are staged
  behind approval of their preceding canonical scatter and exact-size references. Consequently the
  coverage report honestly shows 31 missing mountain-family PNGs instead of counting only the one
  previously manifested massif and hiding the rest of the acceptance scope.
- **A4 retention/replacement split:** `.pixel-work/review/doc33-a4-current-contact.png` confirms the
  Block, Spool, deadfall and the small terrain marks can stay. The live old oak and tall Deepwood
  canopy both carry a distinct blue-green ground pad and are queued together in
  `doc33-a4-plateless-replacements.json`; this is a cleanup batch, not approval of the still-missing
  multi-piece forest overlap family.
- **B6 is visually audited, not blanket-regenerated.** The three sheets
  `.pixel-work/review/doc33-b6-current-{1,2,3}.png` retain clean silhouettes such as the bridges,
  chrysalis, chest-like pickups, shipwreck, camps, carts and gates. They also expose later selective
  work: several water objects bake water patches, some landmarks sit on green or purple plates, and
  ownable camps/mills must be checked for authored pennants. Those failures remain behind the
  mountain/core-site/dwelling order rather than triggering an indiscriminate B6 reroll.
- **Ready retry batches:** seven core hard rejects (gold/iron piles, gold/iron mines, Rich Vein,
  Craft shrine and Wild shrine) are isolated in `doc33-core-prop-replacements.json`. All nineteen
  older dwelling candidates are replaced in three `doc33-dwelling-replacements-*` jobs because the
  defect is systematic: nearly every candidate has a grass skirt, and several have a baked pennant.
  Each new positive prompt describes a concrete building design instead of repeating its content
  name, and uses the fixed doc-33 camera/light/contact clauses. No requests were submitted while the
  credential is absent.
- **Doc 31 precedence:** doc 33's 5×2 massif footprint cannot fit the authored two-cell-wide granite
  spines without changing traversal terrain. The accepted doc-31 rule remains authoritative: the
  160px visual canvas is centred over an unchanged rendering-only 2×1 mountain contact. Manifest
  validation now permits such centred horizontal overhang while still fixing the contact to the
  canvas bottom and requiring the gameplay footprint to fit inside it.
- **Checks inherited by the rest of the family:** `assets-check` now enforces self-terminating edge
  columns, non-pyramid silhouettes, width-to-height, near-zero partial alpha, opaque footprint
  coverage, bottom anchoring, and conformance to the approved granite ramp for every work item
  marked as an obstacle-family member.

## 2026-08-03 — Manywhere mountain-family composition

- **Source and exception:** PixelLab was still blocked by the recorded quota/credential state. The
  user had explicitly approved the cute eight-piece concept sheet produced with built-in image
  generation during the standalone prototype. That sheet is now the source for an interim shipped
  granite family; the provider exception is recorded in `docs/DECISIONS.md` rather than hidden.
- **Promotion:** `scripts/buildCuteMountainFamily.mjs` deterministically extracts the 4×2 sheet,
  removes magenta, uses nearest-neighbour reduction, normalizes a fixed rock/grass ramp, removes the
  warm keyed-base fringe, and writes four 32×48 scatter canvases, two 64×64 knolls, one 96×96 ridge,
  and one 160×112 massif. All eight pass the obstacle-family alpha, self-termination, symmetry,
  aspect, palette, and bottom-anchor checks.
- **In-game composition:** six native-×2 Manywhere sections use the real SVG renderer and report no
  in-scope glyph fallbacks. Long northern ranges, two interior passes, and broken coastal ridges
  show materially different combinations. Small pieces are the workhorse; the massif appears only
  inside a run of at least eight authored mountain cells.
- **Iteration:** the first composition exposed a rusty underline inherited from the keyed source and
  too much deterministic biome scatter. Recoloring only the lowest four opaque rows into the grass
  ramp removed the underline. Manywhere scatter density moved from 16% to 8%, 4%, then 1.5%; structures
  now remain the first read while other maps are unchanged.
- **Superseded scope note:** snowcap overlap sprites were still queued at this checkpoint; the
  complete-family entry below records their later generation and promotion. The staged plateless
  structure replacements remain separate work.

## 2026-08-03 — Hearthguard castle replacement

- **Rejected live sprite:** the narrow grey three-spire Hearthguard castle was disproportionately
  tall and visually weak in Manywhere section r1c1.
- **Replacement:** `castle:hearthguard:castle` now uses the already-approved cute-v2 seed-94120
  candidate: a compact cream-stone gatehouse with three red conical roofs and a central arched gate.
  Its native 96×128 canvas, 3×2 contact footprint, entrance, and runtime ownership pennant contract
  are unchanged. No other castle or map asset was changed.

## 2026-08-03 — Complete role-specific mountain family

- **Why the interim failed:** its eight pieces came from one mixed concept sheet, with too few
  medium variants. The old production script resized those cells to unrelated contracts, so a
  distinctive large mountain remained the visual vocabulary even when squeezed into a small map
  square.
- **New source set:** built-in image generation produced separate granite and snowcap sheets for
  scatter, knoll, ridge, and massif roles. This yields 32 distinct subjects: 6/4/4/2 per skin.
  Keyed and locally chroma-removed RGBA sources live in
  `assets/sources/mountain-family-v2/`; all eight literal prompts are in
  `assets/prompts/mountain-family-v2.md`.
- **Deterministic bake:** `scripts/buildCuteMountainFamily.mjs` extracts only the matching role
  sheet, fits it once to that role's final canvas, hardens alpha, normalizes the skin palette, and
  bottom-anchors the contact. It writes 32 final files under `public/assets/decorations/` and the
  light/dark/silhouette audit at `.pixel-work/review/doc33-mountain-family-v2-contact.png`.
- **Renderer composition:** granite and snowcap edges use the same deterministic whole-sprite
  composer. Workhorse pieces overlap by one map cell, immediately adjacent medium variants cannot
  repeat, and a massif is rare. The browser never stretches the old massif into a cell; `PixelSprite`
  renders each manifest canvas only at the global integer ×2 scale.
- **Visual iterations:** an initial non-overlapping pass read as beads on a line; one-cell occlusion
  closed the gaps. A second pass repeated sawtooth ridges; adjacent-variant avoidance removed that
  copy-paste rhythm. All six Manywhere captures now pass with zero in-scope glyph fallbacks; granite
  long ranges read continuously and the short northeast snowcap edge terminates cleanly.
- **Validation:** manifest coverage is 54/54 decorations. Tests assert deterministic same-skin
  contact, small-piece dominance, multiple independent variants, both skins, and all 32 role-sized
  manifest contracts.

## 2026-08-03 — HoMM-style mountain ground and top-down ridge iteration

- **Reference finding:** the HoMM2 screenshot composes mountains as opaque obstacle sprites on the
  ordinary grassy biome. It uses several rows of broad upper planes, drawn back-to-front. There is
  no grey mountain terrain tile to expose between silhouettes.
- **Composition iteration 1:** removing the mountain terrain bitmap eliminated every grey square,
  but the old dotted Manywhere terrain mask exposed one-cell grass lanes. Rendering every dotted
  row also produced isolated pebble stickers.
- **Composition iteration 2:** short runs promoted to knolls and solid 3-row northern / 2-row
  interior masks removed the dotted rhythm. Dense back rows improved depth, but the frontal ridge
  sprites repeated as triangular façades.
- **Asset iteration 3:** built-in image generation produced four new granite and four new snowcap
  ridges from a higher oblique top-down camera. They have broad irregular footprints and visible
  upper rock planes. The exact prompts are in
  `assets/prompts/mountain-ridges-topdown-v3.md`; keyed and transparent sources are in
  `assets/sources/mountain-family-v3/`.
- **Selection correction:** the first snow capture placed the diagonal hogback in a dense front row
  and read as two white rails. Dense-row selection now uses the three area-filling silhouettes for
  both skins; the diagonal remains available only outside that repeated role.
- **Acceptance:** all six Manywhere sections and the Border Marches/Crosstitch reviews mount zero
  grey mountain-ground layers and report no in-scope glyph fallback. The approved comparison is
  `.pixel-work/review/doc33-maps/manywhere-r1c2-full-x2.png`.

## 2026-08-03 — Unfinished combat roster

- **Faction read:** each unit now carries its obligation as the primary silhouette: reaching candle
  lights, sealed letter, watch shield and bell, hymnbook choir, wedding ring and bouquet, and the
  Ferry's bier. Bone, ash-white linen, old wood and candle gold keep the roster mournful and gentle;
  green-black necromancer color and grimdark horror were explicitly excluded.
- **Built-in generation path:** six independent flat-magenta sources were made with the built-in
  image tool, then passed through the installed chroma-key helper. Exact prompts and source paths
  are recorded in `assets/prompts/unfinished-combat-built-in.md`.
- **Native bake:** `scripts/buildUnfinishedRoster.py` fits the five one-hex sources to 128×128 and
  the two-hex Ferry to 192×128, hardens the alpha edge, and maps every source through one restrained
  bone/linen/candle palette. The standalone review is `.pixel-work/review/unfinished-roster.png`.
- **Combat composition:** the tier-scale pass keeps Wisps smallest, Couriers and Sentries human
  sized, the three-person Choir compact, the Bride broad and imposing, and the Ferry the largest
  two-hex silhouette. The mirror-battle capture
  `.pixel-work/review/combat/unfinished-lineup.png` contains all six on both sides and reports no
  clipped hexes, clipped sprites, or glyph fallbacks.

## 2026-08-03 — Remaining playable-faction combat rosters

- **Complete batch:** Wound-Wrights, Vespiary, Hagwood and Wildergrass now have six native combat
  sprites each. Compact units use 128×128 canvases; broad two-hex constructs, queens, huts, herds
  and thunderbirds use 192×128. Together with Hearthguard and The Unfinished, all 36
  playable-faction units now render from sprites.
- **Faction shape language:** Wound-Wrights use lacquer, wood, tin and cloth toy construction;
  Vespiary uses six distinct insect body plans in chitin/amber/paper; Hagwood uses birch, wicker,
  crows and crooked folktale silhouettes; Wildergrass stays low, fast and animal-heavy in ochre,
  ash and red. Each roster was reviewed first as a standalone contact sheet, then in a mirror battle.
- **Iteration:** the first Larval Tide source read as a row of stones. A focused replacement made
  exactly four segmented grubs and is preserved as `larval-tide-source-v2.png`; the rejected source
  remains beside it. No other source needed regeneration after contact-sheet inspection.
- **Deterministic bake:** `scripts/buildRemainingFactionRosters.py` hardens the alpha edge, crops and
  bottom-anchors each subject, maps it through a fixed faction palette, and writes the 24 final files
  under `public/assets/battle-units/`. Prompts and sources are recorded in
  `assets/prompts/remaining-faction-combat-built-in.md`.
- **Combat pass:** per-unit native render scales preserve tier progression without resizing the PNGs.
  Stacks now paint back-to-front by battlefield row, so a large rear unit cannot cover a smaller
  unit standing in front. All four mirror captures contain six types on both sides with no clipped
  hexes, clipped sprites or glyph fallbacks.
- **Mechanics found by visual review:** the complete Vespiary battle exposed Skim continuing after
  its Dragonfly died to retaliation; the complete Hagwood battle exposed both Leshies choosing the
  same Home Ground hex. Both setup/attack defects now have regression coverage.

## 2026-08-03 — Missing special-culture and siege combat sprites

- **Coverage closed:** added five Gloaming Court sprites, five Seamborn/siege sprites, and four
  Driftfolk sprites. The battle-unit manifest now resolves all 50 known unit IDs to PNG art.
- **Shape contracts:** ordinary subjects use 128×128 canvases; the ram and hull-turtle use 192×128
  two-hex canvases; the Sleeper uses a deliberately low 256×128 three-hex canvas. All share the
  established baseline at native y=120.
- **Generation:** each subject was generated separately with the built-in image tool, retained as a
  project source, chroma-keyed with the installed helper, and reduced through one fixed palette per
  culture. Exact prompts and paths are in
  `assets/prompts/missing-battle-rosters-built-in.md`.
- **Review:** standalone contact sheets were accepted before promotion. The three in-engine battle
  captures show every new sprite with no clipped hexes, clipped art, or procedural glyph fallback.
  Seamborn uses a large Thunderbird opponent because two mirrored full-healing Sleepers make the
  UI's no-magic outcome projection intentionally non-terminating.

## 2026-08-03 — Adventure guardian creature roster

- **Coverage:** added dedicated 32×48 adventure-map sprites for all 18 creature types used by
  authored guardian armies: Yeoman, Bannerman, Oriflamme Warden, Tin Soldier, Marionette, Wooden
  Colossus, Bone Choir, Silk Spinners, Ashmane Wolves, Masked Duelist, Mirror-Bound, Wax Servitor,
  Hearth-Hound, Sleeper, Sirens, Drowned Crew, Hull-Turtle, and Lantern-Angler.
- **Generation law:** every subject was generated independently from its original combat sprite as
  an identity, materials, and palette reference. Each was redrawn in a stronger top-down map camera
  with a compact contact point; no combat bitmap was scaled down into production.
- **Bake:** flat-magenta sources live under `assets/sources/guardian-roster/`. The installed
  chroma-key helper produced transparent intermediates, and `scripts/buildGuardianRoster.py`
  performs deterministic alpha hardening, 32×48 fitting, baseline alignment, and restrained
  reference-palette mapping. Exact prompts are in
  `assets/prompts/guardian-adventure-built-in.md`.
- **Review:** `.pixel-work/review/guardian-roster.png` shows the complete roster. The browser smoke
  additionally verifies that live guardians have a creature sprite, a named quantity label, no
  shield fallback, and a crossed-swords cursor.

## 2026-08-04 — Native PixelLab grassy mountains

- **Generation path:** after the PixelLab account was credited, the production family was generated
  through the PixelLab HTTP API with `scripts/pixelgen` and `PIXELLAB_API_KEY`. It does not use the
  built-in image service. The exact prompts, seeds, endpoint parameters, stable guide images, and
  output directories are recorded in `assets/jobs/mountain-grassy-native-ridges.json` and
  `assets/jobs/mountain-grassy-native-family.json`; selection notes are in
  `assets/prompts/mountain-grassy-native.md`.
- **Native canvases:** four knolls were requested at 64×64, four ridges at 96×96, and two rare
  massifs at 160×112. `scripts/promoteGrassyMountains` rejects a source with the wrong dimensions
  and performs no crop-to-fit or resize. Its deterministic art operations are alpha hardening,
  detached-speck removal, palette normalization, and downward translation inside the unchanged
  canvas. A later multi-shape showcase rejected an artificial full-width turf contact because it
  created dark horizontal seams; production sprites retain their natural generated ground edge.
  Obstacle validation consequently permits a self-terminating margin of at most ten percent while
  still requiring the sprite to cover almost all of its declared contact width.
- **Failed approaches:** prompt-only Bitforge probes produced circular garden/forest islands. The
  successful Pixflux requests use role-matched init images at the final dimensions and strength
  210. Three candidates were rejected for stray pixels or excessive symmetry rather than patched
  into production.
- **Composition learning:** HoMM-style ranges work because many complete landforms overlap on
  ordinary grass; they do not work when a large landmark is squeezed into each rules square.
  Every mountain contact is now covered by a knoll, ridge, or rare massif. Dense back rows mix
  broad knolls with area-filling ridges, front rows overlap by one cell, adjacent variants avoid
  immediate repetition, and the long diagonal hogback stays out of repeated back-row duty.
- **One climate for this pass:** authored snowcap metadata remains intact, but all mountain terrain
  currently selects the complete grassy family. This prevents old grey/white assets from appearing
  inside an otherwise grassy range; another climate should only be enabled after it has a complete
  native family of equal breadth.
- **Acceptance:** block, elbow, stair, and enclosure fixtures prove arbitrary topology coverage.
  Manywhere sections r1c2 and r1c3 show several independent range shapes at the real native ×2
  renderer scale, with no grey mountain-ground layers or glyph fallbacks. The principal comparison
  remains `.pixel-work/review/doc33-maps/manywhere-r1c2-full-x2.png`.
- **Dedicated shape showcase:** `src/sim/mountain-showcase.ts` feeds six grass-only footprints to
  the production compositor: compact oval, long shoulder, crescent, elbow, staircase, and twin-lobed
  saddle. The accepted native-×2 render uses 174 automatic placements across nine variants and is
  `.pixel-work/review/mountain-shape-showcase-x2.png`; there are no hand-placed sprites or unrelated
  map objects in the image.

## 2026-08-05 — Native PixelLab rocky mountains

- **Generation:** added one complete rocky obstacle vocabulary through PixelLab Pixflux: four
  64×64 knolls, four 96×96 ridges, and two 160×112 massifs, each requested as two candidates at its
  final production resolution. The literal batch is
  `assets/jobs/mountain-rocky-native-family.json`; prompts and selections are recorded in
  `assets/prompts/mountain-rocky-native.md`.
- **Reference learning:** the supplied HoMM2 mountain sheet and adventure-map screenshot confirmed
  that natural ranges come from overlapping whole landforms with low ends, irregular crowns, and
  visual overhang—not from repeating a centered peak in every rules cell. Role-matched native
  guides preserved useful knoll, saddle, hogback, ridge, and massif silhouettes during generation.
- **Promotion:** `scripts/promoteRockyMountains` rejects non-native dimensions, hardens alpha,
  removes detached specks, applies a deterministic slate/stone ramp with sparse moss, and
  bottom-anchors inside the unchanged canvas. It never crops or resizes production art.
- **Composition:** the production compositor now selects the `rocky` family, avoids conspicuous
  local repetitions, and continues to derive every contact solely from authored impassable cells.
  This initial row-of-small-landforms composition was rejected: the sprites looked good alone but
  the map still read as repeated 2×1 rock piles rather than joined geology.
- **Connectivity revision:** added two native 192×128 PixelLab backbones, each one uninterrupted
  six-tile mountain spine. `scripts/buildRockyBackboneGuide.py` constructs a transparent init guide
  by overlapping approved native sprites without resizing; the compact request in
  `assets/jobs/mountain-rocky-connected-backbones.json` redraws it at final size. Selected
  candidates 1 and 2 are promoted by `scripts/promoteRockyBackbones.py`. The literal camera,
  structure, and southeast-lighting contract is in
  `assets/prompts/mountain-rocky-connected-backbones.md`.
- **Composition revision:** rows of four or more cells now start with a backbone; successive
  six-cell spines overlap by two contact cells and alternate variants. Short horizontal slices
  that continue north/south use taller ridge pieces, so one-cell-wide hooks remain visually joined.
  Existing knolls, ridges, and massifs remain available as edge/detail vocabulary.
- **Acceptance evidence:** `.pixel-work/review/rocky-mountain-shape-showcase-native.png` shows eight
  automatic range shapes using 74 placements and six variants; no sprite is hand-picked. This
  dedicated varied-shape fixture supersedes the visually uninformative Border Marches line as the
  connectivity proof.
- **Terrain-edge revision:** user review correctly rejected the solid rectangular footprint edges:
  both original backbones had all 192 bottom-row pixels opaque and substantial opaque side columns.
  Added six more selected PixelLab silhouettes through
  `assets/jobs/mountain-rocky-backbone-variety.json`, for eight bases total. Promotion now writes a
  solid interior and irregular boundary counterpart for each base at the same native 192×128 size.
  Boundary forms taper into low left/right shoulders, expose terrain through a 2–7px irregular
  bottom contour, touch neither side canvas column, and keep only separated baseline contacts.
- **Boundary-aware composition:** a segment meeting flat terrain on its left, right, or south uses
  a boundary form; only an occluded middle segment may use the solid version. Two-cell overlaps
  preserve continuity. The refreshed eight-shape proof still uses 74 automatic placements but now
  exercises 17 variants and no longer presents rectangular side or bottom walls.

## 2026-08-09 — The Crooked Crown uses existing original assets

- The Country Lords full-map page at `https://vgmaps.de/maps/view?m=26522` was consulted only for
  broad classic-map composition: shaped regions, dense obstacle masses, corridor scale, loops, and
  contested connections. No bitmap, crop, palette sample, text, or exact placement entered the
  repository.
- The new 72×72 map is authored gameplay data rendered entirely through the existing original
  terrain-transition families, mountain compositor, decoration catalog, map-object sprites,
  castles, heroes, and guardian sprites. Placeholder reuse for landmark variants is intentional;
  there is no new generation job, provider output, source image, prompt, or license dependency.
