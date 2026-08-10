# Spell and Secondary-Skill Icons

Status: implemented and verified 2026-08-09. This is a presentation and asset-pipeline companion to
docs 31, 34, 44, and 45. Spell and skill rules remain owned by S05, S06, and the executable catalogs.

## 1. Final-resolution contract

Every one of the 68 canonical spells and 21 canonical secondary skills owns one distinct PixelLab
bitmap at exactly 32×32 RGBA. Generation happens at that final size. Ordinary UI uses the native
32px bitmap; the review sheet and large choice cards use only exact ×2 display enlargement with
`image-rendering: pixelated`. Production never crops, redraws, or resamples the selected output.

The common prompt contract requires a transparent canvas, one centered 25px-class silhouette,
crisp selective two-pixel dark outline, compact painterly clusters, four to six restrained colours,
lower-right key light with upper-left shadow, and no frame, badge, background, scenery, text, letters,
numbers, logo, or watermark. Spell schools provide coherent palette families while each spell keeps
its own central metaphor. Skills use warm brass and parchment plus one concept-specific accent.

The linked Heroes II pages supplied only the high-level lesson that spellbooks, skill choices, and
hero screens benefit from small repeated visual anchors. No external image, icon, crop, palette
sample, text, or layout asset entered generation or production.

## 2. Generation and provenance

`scripts/buildSpellSkillIconJobs.ts` derives ten ready jobs from `SPELL_IDS` and `SKILL_IDS`. Each
request uses PixelLab `generate-image-v2`, a stable seed, the literal contract and catalog-backed
mechanics prompt, a native 32×32 size, and `no_background: true`. The current endpoint returns a set
of 64 unique still-image variations for one asynchronous receipt. Jobs therefore declare one honest
submission plus `variations_from_single_request: 64`; the runner rejects any other response count.
This replaces the general two-or-three independent-submission convention only for this documented
endpoint response shape.

`assets/iconSelections.json` records the exact accepted variation. Promotion copies those bytes to
`public/assets/icons/` without transformation. `assets/provenance/spell-skill-icon-jobs.json`
retains, for every icon, its request and job, PixelLab background-job ID, seed, returned count,
selected variation, candidate and target paths, asset SHA-256, prompt SHA-256, review state, and
acceptance note. Literal prompts remain in the job files rather than being duplicated into prose.

## 3. Manifest and failure contract

`assets/iconWorklist.ts` is derived only from the canonical content catalogs.
`assets/iconManifest.ts` maps every canonical ID to one safe production path and pins the final
dimensions and PixelLab generator. `npm run assets-check` fails on:

- missing or extra worklist, manifest, provenance, or promoted entries;
- shared paths or duplicate PNG content;
- a non-32×32, non-RGBA, fully opaque, or fully transparent bitmap;
- missing/unaccepted provenance, absent background-job ID, wrong endpoint/variation count, or a
  staged/non-ready production job;
- drift in the selected asset bytes, target path, literal prompt hash, or icon-contract clauses.

The ordinary PixelLab job gate also covers all 89 icon work items, dimensions, prompts, unique
outputs, request state, and complete production paths.

## 4. Shared UI integration

`ContentIcon` is the only runtime bitmap component. It supplies the manifest path, exact integer
display size, pixelated rendering, and an accessible name. The executable surface inventory covers:

- combat and adventure spellbooks;
- map and combat targeting, enchantment slots, and stack effects;
- Mage Guild inscription and Palimpsest choices;
- learned, stolen, replacement, and upgraded spell choices;
- level-up skill choices and Hero Details skill inspection;
- full spell and skill rules inspection.

Text names never disappear. Mana, school/category, current and upgrade faces, ranks, full rules,
keyboard actions, disabled reasons, targeting consequences, and inspection remain ordinary semantic
HTML. The icon accelerates scanning; it is never the only statement of identity or state.

## 5. Review and reproduction

The complete selected-candidate review is
`.pixel-work/review/spell-skill-icons/complete-selected-icon-sheet.png`. The browser-native manifest
sheet is `.pixel-work/review/spell-skill-icons/manifest-icon-sheet.png`. Representative desktop and
390px captures are written beside it by `npm run review:content-icons`; the review asserts all 89
images load at their declared intrinsic size, have unique sources, and remain in bounds.

Regenerate job metadata without spending provider work:

```bash
npx tsx scripts/buildSpellSkillIconJobs.ts
scripts/pixelgen assets/jobs/e1-spell-icons-1.json --dry-run
npm run pixel-jobs-check
```

Live regeneration spends PixelLab work and should be run one small job at a time. After visual
selection, rebuild the candidate sheet and promote exactly the reviewed variation:

```bash
npx tsx scripts/manageSpellSkillIcons.ts init
uv run --quiet --with pillow python scripts/buildSpellSkillIconSheet.py
npx tsx scripts/manageSpellSkillIcons.ts accept
npx tsx scripts/manageSpellSkillIcons.ts promote
npm run assets-check
```

## 6. Acceptance results

- `npm run assets-check`: 366/366 ordinary manifest assets and 89/89 unique native content icons;
  all 89 content icons have accepted PixelLab provenance.
- `npm run pixel-jobs-check`: 74 ready and 17 staged jobs, 545 requests, and 455/455 production
  paths covered.
- Focused UI tests: 10/10 passed across manifest coverage, shared-component accessibility,
  executable surface inventory, spell/skill choices, map-first UI, and non-adventure surfaces.
- `npm run build`, `npm run spec-link-check`, the dedicated content-icon browser review, and browser
  smoke passed. The browser review loaded 89 unique sources and found zero desktop or 390px
  overflows in its representative spellbook and Hero Details captures.
- The complete suite passed 545/546 tests in 58/59 files. The sole failure remains the previously
  documented, unrelated seed-1/day-56 AI-winner assertion at
  `src/core/__tests__/mechanics-regression.test.ts:231`; this work did not change or weaken it.
