# Missing battle rosters — built-in image generation

Generated 2026-08-03 with the built-in image-generation tool in create mode. Each asset was a
separate request so that its silhouette could be accepted or rejected independently. The source
PNGs are retained under `assets/sources/{gloaming-court-roster,seamborn-roster,driftfolk-roster}/`.

## Shared rendering contract

Every request asked for one isolated, complete combat sprite in authentic late-1990s storybook
pixel art: crisp deliberate pixel clusters, restrained detail, strong readable silhouette, oblique
side view facing right, warm lower-right light, no antialiasing, no smooth painting, no 3D render,
no text, no UI, no frame, no scenery, no ground patch, no platform, and no cast shadow. Subjects
were centered with generous clear space and a horizontal bottom contact. Gloaming Court used a flat
solid `#00ff00` chroma background; Seamborn and Driftfolk used flat solid `#ff00ff`. The chroma
colour was forbidden inside the subject.

## Gloaming Court

- `mirror-bound-source.png`: The Mirror-Bound, exactly three elegant masked courtiers clustered
  around one tall oval standing mirror; plum, cream, amber and silver court dress, one courtier with
  a slender blade, the dark opaque mirror and the group forming a single broad readable silhouette.
- `masked-duelist-source.png`: one nimble courtier in a smiling half-mask and plum-and-cream coat,
  lunging toward the right with a long thin rapier, swept cape and amber trim; human scale and fast,
  not armoured like a knight.
- `hearth-hound-source.png`: one heraldic amber mastiff running low and fast toward the right, broad
  chest, dark muzzle, plum ribbon and small brass collar; compact sign-painting silhouette, clearly
  an animal rather than a wolf monster.
- `wax-servitor-source.png`: one humanoid household attendant made from cream candle wax, several
  lit candle stubs melting from shoulders and head, dark formal apron, brass snuffer and small
  serving tray; solemn and useful, not horrific.
- `standing-mirror-source.png`: one tall immobile oval standing mirror with dark opaque glass, an
  ornate but restrained plum, amber and silver masque-style frame, tiny amber eye-like glint in the
  glass and stable narrow feet; an object, no reflected person.

## Seamborn and siege pieces

- `sleeper-source.png`: The Sleeper as one enormous broad, low living-masonry hill viewed from a
  high oblique combat angle, roughly three times wider than tall; pale fitted stone courses,
  regular seams, survey pins and measuring marks, with one subtle closed fissure suggesting a
  sleeping eye; no face, limbs, castle or landscape.
- `siege-wall-source.png`: one battered ordinary crenellated defensive wall section, grey stone
  blocks, iron braces, cracks and rubble chips; broad stable base and an unmistakably conventional
  fortification silhouette.
- `siege-ram-source.png`: one broad covered oak battering ram facing right, pitched plank roof,
  four stout wheels, heavy iron ram head and workmanlike braces; a low two-hex siege machine with no
  crew.
- `watchtower-source.png`: one compact timber-and-masonry watchtower, open roofed lookout, ladders
  and iron bracing, with one tiny anonymous crossbow silhouette inside; tall but stable and readable
  at combat scale.
- `maker-wall-source.png`: one precise asymmetrical wall assembled from interlocking pale stone
  slabs, clean regular seams, inset brass measuring arcs, pins and straightedges; visibly designed
  and constructed, no crenellations, no tower and no ordinary battered-castle shape.

## Driftfolk

- `sirens-source.png`: exactly three amphibious travelling singers perched together on a carried
  fragment of broken ship rail, blue-grey skin, wet dark clothing, shells and rope, each using a
  small brass speaking horn; one compact plural ranged-unit silhouette, eerie but not monstrous.
- `drowned-crew-source.png`: exactly three drowned maintenance sailors advancing together, blue-grey
  skin, patched sea clothes, rope and barnacles; one carries a plank, one a mallet, one a rope hook;
  practical working crew rather than pirates or zombies.
- `hull-turtle-source.png`: one huge calm turtle walking toward the right, its broad shell built like
  an overturned wooden boat hull with ribs, barnacles, rope and one hanging lantern; low, sturdy,
  gentle and wide enough to read as a two-hex creature.
- `lantern-angler-source.png`: one broad deep-sea anglerfish walking toward the right on strong fin
  limbs, blue-grey body, shell plates and rope harness, with its lure replaced by a glowing brass
  ship lantern; strange, practical and readable, not a horror illustration.

## Deterministic processing

The installed chroma-key helper produced review intermediates under
`.pixel-work/missing-rosters-keyed/`. `scripts/buildMissingBattleRosters.py` then hardens alpha,
crops once, fits to a 120-pixel bottom baseline, maps each family through a fixed palette, and writes
128×128 one-hex, 192×128 two-hex, or 256×128 three-hex canvases. It also builds the three standalone
contact sheets under `.pixel-work/review/`.
