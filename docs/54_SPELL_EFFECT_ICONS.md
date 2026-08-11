# Work order 54 — Shared spell-effect icons

Status: implemented 2026-08-12. This is an assets/presentation companion to work order 53. It does
not change spell mechanics, lexicon rules, or the 68 Standard/Upgraded spell descriptions.

## Outcome

Every one of the 30 canonical `SPELL_LEXICON` entries owns one distinct native 32×32 transparent
icon. These icons illustrate reusable mechanics such as counters, timed effects, resonance, phase,
terrain terms, and created wall hexes; they are not replacements for the 68 individual spell-card
icons.

The catalog-to-bitmap authority is deliberately one-way:

- [`../src/content/spellLexicon.ts`](../src/content/spellLexicon.ts) owns IDs, names, player rules,
  and exact literal `visualSubject` inventories;
- [`../assets/iconManifest.ts`](../assets/iconManifest.ts) derives the installed paths;
- [`../assets/iconWorklist.ts`](../assets/iconWorklist.ts) derives production coverage;
- [`../assets/jobs/spell-effect-icons-1-built-in.json`](../assets/jobs/spell-effect-icons-1-built-in.json),
  batches 2 and 3, and
  [`../assets/provenance/spell-effect-icon-generation.json`](../assets/provenance/spell-effect-icon-generation.json)
  retain every literal prompt, provider output, source/final path and hash, selection, and rejection;
- [`../assets/spellEffectIconSelections.json`](../assets/spellEffectIconSelections.json) is the
  accepted selection ledger.

## Art and generation contract

Each icon is one separate built-in image-generation call. The exact lexicon `visualSubject` is the
semantic inventory. Style is the installed bright cartoony storybook pixel-art family: tactile
physical miniatures, high-oblique non-isometric camera where depth applies, southeast/screen-lower-
right light, northwest self-shadow, strong 32px silhouette, and generous padding.

Sources use a subject-safe flat green or magenta chroma field. Prompts reject text, surrounding UI,
frames/panels, aura/glow, baked rarity, amount, duration, and upgrade markers, background shadows,
and unrequested objects. Requested counting pips, beads, meter segments, and measuring marks remain
physical parts of the literal subject rather than UI overlays.

The 30 selected provider outputs are retained under `assets/sources/spell-effects/`. The initial
`wall-hex` call omitted its enclosing battlefield hex, so that source remains under `rejected/` with
its reason and exact prompt/hash; one stricter retry is selected. No other call warranted a retry.

## Deterministic production bake

The installed image-generation chroma helper performs a soft matte with thresholds 12/220 and
despill. [`../scripts/buildSpellEffectIcons.py`](../scripts/buildSpellEffectIcons.py) then crops the
subject, nearest-neighbour fits it inside 28×28, reduces to an adaptive 40-colour palette, hardens
alpha at 128, and centers the result on a transparent 32×32 canvas. The bake emits:

- installed finals under `public/assets/icons/effects/`;
- a native contact sheet at `.pixel-work/review/spell-effect-icons/native-contact-sheet.png`;
- an exact-nearest 3× sheet at `.pixel-work/review/spell-effect-icons/3x-contact-sheet.png`.

[`../src/tools/spellEffectIconsCheck.ts`](../src/tools/spellEffectIconsCheck.ts) fails closed on exact
catalog/manifest/provenance coverage, source/final path and hash drift, prompt drift, uniqueness,
retained provider/rejected outputs, 32×32 RGBA dimensions, hard alpha, and the shared renderer's
no-fallback rule. The ordinary PixelLab job gate also covers all 30 work items through the three
immutable built-in batches.

## Consumer boundary

[`../src/ui/components/SpellEffectIcon.tsx`](../src/ui/components/SpellEffectIcon.tsx) is the shared
manifest-backed renderer for later glossary, inspection, and spell-rule surfaces. Work order 54 adds
the renderer and catalog showcase only. It does not yet wire interactive tooltips across the game,
and it does not rewrite spell descriptions.

## Acceptance

```bash
npx tsx scripts/manageSpellEffectIcons.ts records
.venv/bin/python scripts/buildSpellEffectIcons.py
npx tsx scripts/manageSpellEffectIcons.ts provenance
npx vitest run src/content/__tests__/spell-lexicon.test.ts src/ui/__tests__/content-icons.test.tsx
npm run assets-check
npm run pixel-jobs-check
npm run build
npm run spec-link-check
git diff --check
```
