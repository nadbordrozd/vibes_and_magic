# 33 — Adventure Map Props: Generation Playbook

Operational companion to doc 31. Doc 31 defines the laws (sizes, camera, light, batch discipline, manifest wiring); this doc is the **how**: how to phrase prompts, how to build obstacle families that compose into believable landforms, how to inspect what came back, and when to stop iterating.

Nothing here overrides 31 or S08. Where this doc and 31 disagree, 31 wins — report the conflict in `ASSETS_LOG.md`.

## 0. Scope

**In scope:** everything that stands *on top of* terrain on the adventure map — mountains and obstacle props (31 §3 A4), resource piles, mines, shrines, dwellings, landmarks (31 §4 B1–B6). Work until every authored map renders with no glyph fallback for these kinds.

**Out of scope, do not touch:**

- Battle units and any creature sprite (31 Phase D) — deferred entirely.
- Hero sprites (31 Phase C).
- Terrain base tiles themselves, and terrain-to-terrain transition tiles. They were out of scope for
  this prop work order; the later implementation and acceptance state live in doc 36.
- **Castles (B3) are done and frozen.** They read acceptably; regenerating them mid-milestone would re-open the style lock for no gain. Revisit only in the final pass (§5).

## 1. Prompt hygiene (binding, all future generations)

The single largest source of wasted generations so far. The root cause is simple and worth stating plainly:

> **The generator has no access to your intent. Every word in the prompt is a request for pixels.**

"Unfinished castle" does not mean *a castle asset I haven't finished working on*. It means *a castle that is unfinished* — and you get scaffolding and half-built walls. The model is doing exactly what was asked.

### 1.1 Words that leak into the picture

- **Process and status vocabulary.** `unfinished`, `draft`, `rough`, `WIP`, `placeholder`, `first pass`, `simple`, `basic`, `quick`, `test`, `temporary`. All of these describe a *subject* to the model. Delete them; they never belong in a prompt.
- **Asset-management vocabulary.** `sprite`, `asset`, `sprite sheet`, `variant 2`, `version 3`, `tileable`, `32x32`, `PNG`, `transparent background`. Pixel dimensions and background handling are **API parameters**, not prose. Naming them in the prompt at best wastes tokens and at worst gets a checkerboard transparency pattern drawn as literal art.
- **Quality boosters.** `beautiful`, `epic`, `masterpiece`, `highly detailed`, `4k`. These pull toward rendered illustration and away from a legible 32px grid. Style is fixed by the style clause; do not stack adjectives on it.
- **Narrative and mood words, unless you mean them.** `abandoned`, `cursed`, `haunted`, `ancient`, `ruined` are legitimate when S08 canon actually calls for that read. They are a bug when used as filler.

### 1.2 Negations

Some negations are documented as working against this API and 31 §2 mandates them (`no flags, no banners`, `no base, no ground`). Keep those. But treat every negation as unreliable, and **pair it with a positive description of the desired state** — positive phrasing is what actually steers the model:

- `no flags` → **`bare stone battlements, empty iron flagpole`**
- `no base, no ground` → **`walls meeting a flat horizontal edge at the bottom`**

If a negation fails twice in a row, drop it and rely on the positive phrasing alone. Log the finding.

### 1.3 Template

Every prop prompt is built from these clauses, in this order, and contains nothing else:

```
<subject noun phrase>, <material and colour>, <one or two distinguishing features>,
oblique front-on view with a slight overhead tilt, light from the lower right with
shadows falling to the upper left, flat horizontal ground contact,
<N> tiles wide and about <M> tiles tall, HoMM2-era storybook pixel art
```

Camera, light, ground contact and the style clause are **fixed strings** — copy them verbatim every time, per 31 §0. Only the subject, material, features and scale change.

### 1.4 Rewrites

| Don't | Do |
|---|---|
| unfinished castle | a necromancer's tower of dark basalt, narrow lancet windows |
| simple boulder sprite | a granite boulder, moss on its shaded face |
| placeholder mine entrance | a timber-framed mine mouth cut into grey rock, ore cart rails at the threshold |
| mountain variant 2 | a low twin-peaked ridge of grey stone, wider than it is tall |
| basic shrine, no decoration | a small stone shrine with a slate roof and a votive bowl on its step |
| rough draft of a dwelling | a thatched longhouse with a carved gable and a low turf wall |
| epic detailed massive mountain | a granite massif with three uneven peaks and scree spilling from its base |

**To get a variant, change the subject — never the metadata.** "Another version of the mountain" is not a description of anything. "A lower, broader ridge with a saddle between two peaks" is.

### 1.5 Record

31 §1 already requires the literal prompt in `assets/prompts.md`. Extend it: when a prompt is revised, keep the **failed version and the reason** alongside the winner. The catalogue of what didn't work is worth as much as the catalogue of what did.

## 2. Mountains and obstacle families

Mountains come first. They are the largest continuous mass on the map, they are what currently fails hardest, and the pattern they establish — *a family of self-terminating pieces composed by overlap* — is reused verbatim for Deepwood tree clumps, Hush ice shelves, Mosswold knolls and every other obstacle family.

### 2.1 The composition model: overlap, not edge-matching

There are two ways to build large landforms from small pieces:

- **Edge-matched modularity** — pieces join along a shared, pixel-exact edge profile (Wang tiles, cliff autotiling). Real technique, wrong tool here: **an image generator cannot hold a pixel-exact edge profile across a family.** Do not attempt it, and do not accept a plan that proposes canonical left/right edge profiles, interchangeable "ridge middles", or end-caps.
- **Overlap composition** — pieces are whole, self-contained landforms with per-tile alpha. Ranges are built by placing several of them so their canvases overlap, drawn back-to-front. **This is what HoMM2 does, and it is what we do.**

Why overlap works without any edge precision: the meeting point between two pieces is never a seam, it is an **occlusion**. The nearer piece's silhouette covers the join completely, and the eye reads one continuous landform. The only things pieces must share are **palette, light direction and projection** — all of which a generator *can* hold, via the reference-image mechanism.

**Mechanically, in our engine:** footprints never overlap (one object per tile), but *canvases* do. 31 §0 permits a canvas wider than its footprint and taller without limit, bottom-anchored. So a range is authored as pieces on **adjacent or near-adjacent footprints** whose taller, wider canvases overlap visually; 31 §1's painter's algorithm (sort by anchor row, then column) already produces the correct draw order. No renderer change is needed. If a map format limitation prevents authoring pieces this closely, that is a **finding to log**, not something to work around by baking a range into one giant sprite.

### 2.2 The self-termination rule

This is the one hard geometric constraint on the whole family, and unlike a shared edge profile it is **checkable by script rather than authored by hand**:

> Every piece's silhouette must descend to near ground level at its left and right extremes.
> **Check:** the opaque height of the leftmost and rightmost opaque column must be ≤ 20% of the sprite's own maximum opaque height. Reject or re-crop otherwise.

A piece that terminates high has a cliff face at its edge, and that cliff will read as a cut no matter what you overlap against it. A self-terminating piece only ever meets *terrain*, never another piece's rock face — which is precisely why arbitrary combinations work.

### 2.3 Size distribution

Per family. Footprint is ground contact only (doc 32); the canvas carries the visual mass.

| Role | Footprint | Canvas guide | Count |
|---|---|---|---|
| Scatter — boulders, outcrops | 1×1 | 32×32 – 32×48 | 6–8 |
| Knoll — small standalone peak | 2×1 | 64×64 | 4–5 |
| Ridge — the workhorse mass | 3×1 or 3×2 | 96×96 – 96×128 | 4 |
| Massif — region centrepiece | 5×2 | 160×128 – 160×160 | 2–3 |

Roughly 2:1 at each step down in size. Two observations that matter more than the exact numbers:

- **Build the scatter first.** The 1×1 pieces are the cheapest to generate, they de-risk the palette before you spend candidates on a massif, and they do more for the finished look than any large piece (§2.5).
- **The current map has the distribution inverted** — one large symmetric mountain alone on flat green. That is the failure this table exists to correct.

### 2.4 Family consistency

Generate the **scatter pieces first**, approve one as the family's canonical anchor, then pass it as a reference image (31 §1) on every subsequent piece in the family. That is the mechanism 31 already has for holding palette and light across a batch — use it rather than hoping independent generations agree.

If reference images demonstrably fail to hold the palette, probe the alternative once: a single generation containing several separated mountains on a flat keyed background, cut apart by connected-component labelling. Record the verdict in `ASSETS_LOG.md` and use the winner for every later family. Do not run both paths in production.

**No horizontal mirroring for free variants.** 31 §0 fixes light at lower-right; a mirrored piece lights from the lower left and reads as broken immediately. Variation comes from more subjects, not from flips.

### 2.5 The transition zone does most of the work

Look at any HoMM2 range: it never meets the grass along a clean line. There are boulders scattered ahead of it, small outcrops trailing into the plain, tree clumps gathered at its feet. **Those 1×1 pieces are doing as much work as the massifs.**

Authoring guidance for every range:

1. Anchor with one large piece.
2. Add 2–4 mediums on adjacent footprints so canvases overlap by roughly a third to a half of their width; jitter the baselines by a row where the map allows.
3. Scatter 1×1 pieces around the perimeter with density falling off as distance from the mass increases.
4. On Deepwood borders, cluster tree decorations at the feet.

A massif with ten boulders around it beats three massifs with none. **Until the scatter exists, a range is not finished** — do not accept a cluster screenshot without it.

## 3. Inspection protocol

31 §2 mandates a reflection step; this is the concrete method. **Results are inspected by looking at images, never by reading API payloads** (31 §1).

### 3.1 Four views, all required

1. **Contact sheet** — `candidates.html` at ×2 on light *and* dark ground. Catches background-removal halos, stray pixels, palette drift, obvious rejects. Cheapest filter; run it first.
2. **Silhouette** — the candidate's alpha mask rendered solid black. Borrowed from 31 §6's unit test. Catches "reads as a featureless blob" and the symmetric-pyramid failure, both of which hide behind pretty shading in a normal view.
3. **In-game, single** — on the actual terrain, in frame with a shipped reference object. The only view that catches scale errors and palette-versus-terrain mismatch.
4. **In-game, composed cluster** — **required for every obstacle family**, and the addition that matters most. A test map region with 5+ pieces placed as a range plus scatter. Single-piece review structurally cannot catch join failures, repetition tells, or a distribution skewed toward big pieces. A family is not approved until its cluster screenshot is approved.

### 3.2 Hard rejects

Any one of these fails a candidate outright:

- Isometric drift — corner-on view or a diamond ground base (31 §0; the most likely silent failure).
- Baked ground plate, grass skirt, pebbles or flowers beneath the object (31 §2).
- Baked environment — horizon, cast landscape, implied terrain behind.
- Baked flags, banners or player colour (the overlay owns these).
- Wrong light direction — anything other than lower-right with shadows to upper-left.
- Palette drift from the shipped terrain the object stands on.
- Scale wrong against the shipped reference.
- **Self-termination violation** (§2.2) on any range-family piece.
- **Symmetric silhouette** — a single centred pyramid. Reads as a placed object, not as terrain.
- **Aspect too tall** — obstacle masses read as terrain when they are wider than tall. A near-1:1 mountain is a sticker.
- Alpha fringe or halo pixels from background removal.

### 3.3 Cheap scripted checks

Add to `assets-check`, or a `pixelgen lint` subcommand. Each is a few lines and catches things the eye misses at ×1:

- **Edge-column ratio** — the §2.2 self-termination check.
- **Silhouette symmetry** — mirror the alpha mask and compare; high similarity flags the pyramid failure.
- **Palette conformance** — count colours outside the family's approved ramp.
- **Alpha fringe** — count pixels with `0 < alpha < 255`; should be approximately zero for pixel art.
- **Bounding box vs. declared footprint** — opaque width must be ≥ footprint width and the canvas bottom-anchored.

## 4. Iteration loop and stop conditions

The two failure modes are regenerating forever and accepting the first thing that arrives. Both are addressed by explicit limits.

**Per asset:**

1. Job file → `pixelgen`, 2–3 candidates.
2. Contact sheet → discard hard rejects (§3.2).
3. Compose in-game, single and cluster.
4. On failure, **revise the prompt, not the seed.** Re-rolling the same prompt against a systematic failure burns candidates for nothing.
5. **If two consecutive prompt revisions fail the same way, the prompt is not the problem.** Stop editing it. Try, in order: a different endpoint, a reference image, an explicitly different subject phrasing. Log what you tried.
6. **Hard cap: three prompt revisions per asset.** Then ship the best candidate, record the deficiency in `ASSETS_LOG.md`, and move on. A logged imperfect asset is worth more than an unshipped perfect one.

**Per family**, stop when the cluster screenshot reads as one landform and no piece trips a hard reject. The bar is *"does not break the frame,"* not *"could not be improved."*

**Budget:** mountains get the most iteration — they set the template every later family inherits. Families after mountains should converge in one or two rounds; if one does not, the deviation is itself worth logging.

**Do not regenerate approved assets** when a later family suggests a nicer style. Log the drift and batch a single revisit at the end (§5). Rolling improvements backwards through shipped work is how this milestone stops converging.

## 5. Order of work

1. **Mountains** — every skin the authored maps use. Style-setter; iterate hardest here.
2. **Remaining obstacle props and decorations** (31 §3 A4) for terrains in use — boulder, old oak, dolmen, the Spool, the Block, tree clumps. Same family method.
3. **B1** — resource piles and treasure chest.
4. **B2** — mines and Rich Vein. First capturables; the flag overlay must be visibly correct here before continuing.
5. **B4** — shrines, barrow-mound, waystation, Mana Spring.
6. **B5** — dwellings.
7. **B6** — creative landmarks, derived from map data rather than assumed.
8. **Final pass** — revisit the castles, plus any drift logged along the way, as one batch.

Derive every worklist from actual content data and authored maps (31 §1), not from this doc's prose.

## 6. Acceptance

- Every authored map screenshots at ×2 with no glyph fallback for any in-scope kind; guardian stacks and heroes may still be glyphs.
- Every obstacle family has an approved cluster screenshot in `ASSETS_LOG.md`, scatter included.
- `assets-check` green, including the §3.3 checks; map lint, test suite and browser smoke green per 31 §7.
- `prompts.md` records the literal winning prompt and the notable failures for every shipped asset.
- `ASSETS_LOG.md` records, per batch: what reads well, what fails, prompt changes inherited by the next batch, and every capped-at-three-revisions deficiency.
