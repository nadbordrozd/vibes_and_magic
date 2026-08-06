# Adventure guardian roster — built-in generation

Generated 2026-08-03 with one built-in image-generation request per creature. Each request supplied
only that creature's original combat PNG as its reference. The generated files are project sources,
not runtime-sized assets:

```text
assets/sources/guardian-roster/{unitId}-source.png
```

Every request used this shared prompt contract:

```text
Use case: stylized-concept
Asset type: source for one native adventure-map guardian creature sprite in a 1990s fantasy turn-based strategy game
Reference use: use the supplied combat sprite only for the creature's identity, construction, equipment, material palette, and pixel-art language; redraw the subject as a new map-scale composition and do not resize or trace the reference
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, uniform edge to edge
Style/medium: authentic hand-placed HoMM2-era storybook pixel art, deliberately simplified for a final 32x48 sprite, crisp square pixel clusters, strong readable silhouette, restrained selective outline, never smooth illustration
Composition/framing: compact high-oblique adventure-map view with more top surface visible than the side-view combat reference; centered with generous padding; complete silhouette visible; narrow stable ground contact; readable around 24x38 pixels
Lighting/mood: consistent upper-left light; cute, practical, wondrous, never grimdark
Constraints: preserve the reference's creature count, identity, equipment, construction, and dominant colors; one isolated encounter subject only; no scenery, terrain plate, floor, cast shadow, text, UI, frame, logo, watermark, glow, or #ff00ff inside the subject
Avoid: scaled-down battle sprite, strict side view, front-facing portrait, photorealism, glossy 3D, anime, anti-aliased painting, tiny unreadable details
```

The subject clause appended to each independent request was:

| Unit ID | Subject clause |
|---|---|
| `yeoman` | One sturdy ordinary levy spearman with round shield, short spear, practical cap, cream tunic and muted brick-red wool. |
| `bannerman` | One marching armored foot bannerman with a compact upright red-and-cream swallowtail standard and modest round shield. |
| `oriflammeWarden` | One imposing planted veteran in heavy practical plate with broad shield and compact flame-shaped cloth standard. |
| `tinSoldier` | One small painted tin toy infantryman with simple musket, stiff limbs, bright nursery-red coat and dark metal. |
| `marionette` | One lacquered jointed wooden marionette fighter with clearly readable articulated limbs, crossbar, and restrained strings. |
| `woodenColossus` | One broad towering wooden toy colossus built from chunky joined blocks, painted panels, pegs, and worn nursery colors. |
| `boneChoir` | One compact gentle cluster of several small ash-white draped skeleton choristers carrying candles and grave goods. |
| `silkSpinners` | One compact plural cluster of pale paper-and-chitin spiders with distinct legs and small silk spindles. |
| `ashmaneWolves` | One low compact plural pack of lean ochre-grey wolves with dark ash manes, overlapping in depth without merging. |
| `maskedDuelist` | One elegant masked duelist in dark wine cloth with a slim blade, theatrical posture, and readable pale mask. |
| `mirrorBound` | One tall uncanny but gentle figure bound into an ornate standing mirror, with glass, frame, cloth, and reflected face readable. |
| `waxServitor` | One stooped practical candle-wax servant figure with warm cream wax, dark wick details, and a simple carried implement. |
| `hearthHound` | One stocky ember-colored domestic hound with a dark muzzle and warm hearth-red hide; no literal fire effects. |
| `sleeper` | One low broad sleeping mound-creature under layered cloth and masonry-like plates, unmistakably dormant and very compact. |
| `sirens` | One small plural group of sea sirens with blue-green tails, pale faces, flowing hair, and overlapping high-oblique silhouettes. |
| `drownedCrew` | One compact plural knot of weathered drowned sailors with rope, oar, muted sea-cloth, and readable separate heads. |
| `hullTurtle` | One broad ship-hulled sea turtle with shell planking, stout flippers, rope, and a strong oval top surface. |
| `lanternAngler` | One compact deep-sea angler creature with large head, small fins, warm lantern lure, and restrained blue-green body. |

`scripts/buildGuardianRoster.py` keys the sources, reduces them against their matching combat
palette, fits each into a native 32×48 canvas, and writes `public/assets/guardian-units/`.
