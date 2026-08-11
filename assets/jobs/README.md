# PixelLab production jobs

Every shipped pixel asset starts as a version-1 JSON job run through `scripts/pixelgen`. A request
names the manifest id, literal prompt, verified PixelLab v2 endpoint, native `[width,height]`, two or
three candidates, seed, endpoint parameters, manifest asset ids fulfilled by a family request, an
explicit output directory, and any project-relative reference images.

Built-in image-generation provenance jobs are the one explicit runner exception. They set
`"generator": "built-in-imagegen"`, record one source and one promoted final per request, and are
immutable audit/reproduction records rather than PixelLab submissions. `pixelgen --dry-run` and the
ordinary job gate validate them; a live `pixelgen` submission refuses them and directs regeneration
back through one built-in image-generation call per request plus the documented local bake.

Historical requests that once targeted a current manifest ID declare `superseded_by` with the
replacement job filename. They remain immutable prompt/candidate provenance, but do not count as
current worklist coverage and are not checked against the replacement asset's current dimensions.
The gate still validates their job structure and requires the named replacement job to actively
cover every superseded ID. City assets additionally require exactly one active production claim
from `city-sprites-built-in.json`, so reviving an old-size claim fails validation.

Reusable collectible jobs additionally declare `collectible_family` at job and request level plus
`catalog_key`, `catalog_group`, and `chroma_key` on every request. Their larger request arrays are
catalog batches, but each row still represents exactly one separate built-in call and one selected
source—never an `n`-variation sheet. `scripts/buildCollectibleSprites.py` accepts this generic family
shape so all six artifact classes use the same bake/provenance contract without an ItemId-only type.

```json
{
  "version": 1,
  "status": "ready",
  "contact_sheet": "assets/jobs/example-candidates.html",
  "requests": [{
    "id": "map-object:chest:default",
    "assets": ["map-object:chest:default"],
    "output": ".pixel-work/pixelgen/example/map-object-chest-default",
    "prompt": "literal production prompt",
    "endpoint": "map-objects",
    "size": [32, 32],
    "candidates": 3,
    "seed": 100,
    "parameters": {"view": "high top-down", "outline": "selective outline"},
    "references": [{"file": "assets/references/a1-style-lock.png", "parameter": "color_image"}]
  }]
}
```

Run `scripts/pixelgen assets/jobs/<job>.json`. The command polls async jobs, retries polling with
backoff, writes candidate PNGs predictably below each request's `output`, emits the HTML light/dark contact
sheet, prints one summary line per asset, and exits nonzero if any request fails. `--dry-run` validates
the job and references without credentials or network generation. `scripts/pixelgen assets/jobs
--dry-run` validates the complete catalog in one process.

Phase-D jobs marked `staged` are intentionally not submittable. The first Hearthguard and
Wound-Wrights jobs must run their prompt-only versus fresh-flagship-reference comparisons; after
the verdict is logged, regenerate or edit the staged roster jobs to use the winning protocol and
change their status to `ready`.
