# Mountain side-edge repair — built-in generation record

The eight literal prompts, inspected reference images, selected provider outputs, transparent
intermediates, final sizes, and target IDs are recorded in
`assets/jobs/mountain-edge-repair-built-in.json`. Each variant used one separate built-in
`image_gen` call. Eight first-call results entered native review; `rocky-column-3` was then
rejected because its repeated wraparound ledges read as a conspicuous corkscrew in production-map
composition. One corrective edit call replaced it with broken crag geology. The rejected keyed,
transparent, and native-baked review sources remain checked in with the exact original prompt,
hashes, and rejection reason; nine calls were made in total.

Four 32×96 `rocky-column` sprites cover one-cell north/south spines. Four 64×96
`rocky-shoulder` sprites cover two-cell runs that continue vertically. Existing whole native
ridge and six-cell spine art covers wider contacts, with topology-aware overlap used for four- and
five-cell runs. Production never exposes an internal crop of a wider bitmap.

The built-in outputs used flat `#ff00ff` chroma. The installed imagegen helper produced each
transparent intermediate with border auto-keying, soft matte, thresholds 12/220, and despill.
`scripts/promoteMountainEdgeRepair` then performs one deterministic offline LANCZOS fit to the
declared native canvas, hardens alpha at 128, maps the fixed rocky palette, retains the largest
connected silhouette, and bottom-anchors it. Runtime never rescales or stretches the PNGs.

Exact SHA-256 hashes for every prompt, provider output, transparent source, reference, and final
are generated in `assets/provenance/mountain-edge-repair.json` by the promoter.
