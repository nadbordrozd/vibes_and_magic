# PixelLab production jobs

Every shipped pixel asset starts as a version-1 JSON job run through `scripts/pixelgen`. A request
names the manifest id, literal prompt, verified PixelLab v2 endpoint, native `[width,height]`, two or
three candidates, seed, endpoint parameters, manifest asset ids fulfilled by a family request, an
explicit output directory, and any project-relative reference images.

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
