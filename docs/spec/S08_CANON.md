# Setting and Canon

## Premise

**Author truth, never stated in game:** long ago, many dying worlds were stitched into one to save
what could be saved. The stitching held; the memory of who did it and why did not.

**Player surface:** a warm storybook medieval-fantasy land of meadows, cities, marshes, market
towns, old roads, and stranger local customs. Centuries have weathered the seams. Every faction
carries a fragment of a lost world without understanding it, and the cultures tell contradictory
stories of the Judgment, Skyfall, Great Mending, Night the Bells Stopped, and other local endings.
No game text adjudicates them. Lore arrives through objects, buildings, rumors, unit detail, terrain,
and encounter tells—never a lore dump.

The tone is **warm, wondrous, wistful**. Melancholy belongs in the premise, not a grim palette.
Humor is dry and in-world, never ironic or directed at the player. The Assimilation Laws, visual
laws, and writing register in [`S01_RATIONALE.md`](S01_RATIONALE.md) are canon.

## Playable factions

### The Hearthguard

- **Place:** native host-world kingdom and its parishes.
- **Verb:** morale manipulation—banners, extra actions, steadiness.
- **Magic:** Rite + Craft.
- **Look:** wool, wrought iron, heraldry; warm red, cream, gold; upright shields and pennants.
- **Anomaly:** the old banner’s cloth is not from this world, and heraldic beasts step from it as
  flat, bold emblem-creatures.
- **Roster silhouette:** levy, bow, banner, lance, then heraldry made flesh.

### The Wound-Wrights

- **Place:** a devout artisans’ guild built around a fallen reliquary-hoard—author-side, a toybox.
- **Verb:** duplication and repair; broken is not dead.
- **Magic:** Craft + Grave.
- **Look:** lacquered wood, tin, porcelain, stitched cloth; nursery primaries and brass; jointed,
  round-headed silhouettes with seams.
- **Law:** constructs are built and ritually copied, never grown. The Guild never recognizes the
  original purpose of its sacred forms.

### The Unfinished

- **Place:** people of every lost world who died mid-purpose and continue unfinished lives.
- **Verb:** death triggers and recursion.
- **Magic:** Rite + Grave.
- **Look:** bone, funeral linen, candlelight, grave goods; white, ash, candle-gold, never green-black;
  draped hollow silhouettes carrying the object of an obligation.
- **Law:** they are unresolved, not evil. Voice stays gentle, present, and precise.

### The Vespiary

- **Place:** a fragment of the Broad World, where its insects were ordinary scale at home.
- **Verb:** consumption and terrain—casualties into biomass, resin, living topology.
- **Magic:** Craft + Wild.
- **Look:** chitin, amber, paper nest; honey-gold, black, resin; segmented asymmetric silhouettes and
  papery wings.
- **Law:** Queens half-woke into speech at the Mending and negotiate with formal, sincere courtesy.
  Broad-World domestic debris is rationed to one landmark anomaly per region.

### The Hagwood

- **Place:** stitched wildernesses that answered dislocation by making contracts.
- **Verb:** bargains and curse-twisting; ownership is debt.
- **Magic:** Wild + Grave.
- **Look:** birch, wicker, bone fence, crow feather; white, black, berry red; crooked asymmetry.
- **Law:** heroes are Crones; everything is grown or bargained, never built. Folkloric names belong
  here more freely than elsewhere.

### The Wildergrass Clans

- **Place:** steppe riders from a burned world, carrying herds, ash, and drum memory.
- **Verb:** blood price—the morale inverse of Hearthguard, gaining momentum from allied loss.
- **Magic:** Rite + Wild.
- **Look:** hide, horn, ash; ochre, ash-grey, blood; low, fast, horned, plural/herd silhouettes.
- **Voice:** terse and rhythmic. Grief is neither gothic nor abstract; it is spent forward.

The canonical no-shared-school rivalries are Hearthguard↔Hagwood, Unfinished↔Vespiary, and
Wildergrass↔Wound-Wrights. They guide authored maps and flavor, not automatic combat modifiers.

## City and adventure-object visual identity

City is the canonical player-facing settlement term. Every faction city must express its culture as
architecture, not rely on a label, palette swap, flag, or opaque faction ID: Hearthguard builds a
cream-stone red-tile civic gatehouse; Wound-Wrights a lacquered toy-workshop city; the Unfinished a
complete pale memorial city of linen, candles, and grave-gold; the Vespiary an amber-resin,
paper-nest, black-chitin hive city; Hagwood a grown crooked-birch and wicker settlement; and the
Wildergrass Clans a long low hide, horn, felt, and ashwood steppe city. The literal physical subjects
for production live in
[`../../assets/adventureSpriteInventory.ts`](../../assets/adventureSpriteInventory.ts).

Cities, mines, resource pickups, items, and artifacts share bright cartoony storybook pixel art on
true transparency, with a high-oblique non-isometric camera. Light comes from screen lower-right/map
south-east and shadow travels toward upper-left/north-west. Each subject needs a readable physical
silhouette at native size; a catalog name or faction ID is never a sufficient generation prompt.
Terrain plates, scenery, text, frames, rarity badges, owner colors, and baked flags are forbidden.
Resources remain recognizable by matter and shape rather than color alone. In particular, Essence
uses restrained blue-violet mineral caught in a stitched geological knot, and its production site is
an old rural extraction basin and copper pump over a hairline world-seam—the stitchwell—not a
generic glowing crystal mine or magic fountain. See [work order 51](../51_CITY_SPELLBOOK_SPRITES.md).

Exact faction passives, starting armies, stats, palettes, and magic pairs live in
[`../../src/content/factions.ts`](../../src/content/factions.ts). Unit and hero rosters are linked in
[`S09_CONTENT_INDEX.md`](S09_CONTENT_INDEX.md).

Hero-dashboard portraits are individual identities, not six repeated faction locomotion sprites.
Each of the 36 hero definitions ultimately owns one original native portrait derived from its story,
class, faction materials, and specialty. Dashboard primary-stat, vital, and specialty icons obey the
same transparent storybook-pixel hierarchy as the installed skill/effect families: one literal
subject, selective outline, restrained clusters, screen-lower-right/south-east light, no text,
frame, scenery, rarity, equipment slot, or player-color badge. Names, ranks, counts, values, and
rules remain semantic text. The supplied Heroes II/III images inform hierarchy only; no external
art, measurements, ornament, or imitation enters the assets. See
[work order 59](../59_HERO_DASHBOARD.md).

## The hidden seventh: Seamborn

Seamborn are creatures of the stitching itself, native to no contributing world. They have no
city or town and are not a playable faction. They appear around essence springs, seams,
anomalies, provenance encounters, and puzzle locks. Encountering them is the quiet delivery channel
for the world’s true shape. The faction ID remains reserved. Any future recruitable catalog belongs
in the backlog until a numbered document makes it current.

## Neutral cultures

The world has more cultures than city factions.

- **Gloaming Court:** masked courtiers transformed by glamour into what locals call elves. They
  supply masked duelists, hounds, stolen faces, ring dwellings, and Borrow Shape provenance.
- **Order of the Unstruck Bell:** monks tending the place where time broke and mechanisms they did
  not make. Their monastery supplies timing blessings and Hourglass Crack; the Hour-Beasts remain
  legendary lock guardians.
- **Driftfolk/sea cultures:** current sea creatures and drowned sites are advance traces, not yet a
  playable faction.

Neutral cultures may be promoted only by a future numbered rule document; present sites and units
must not imply a functioning hidden city tree.

## Geography and seams

A Seam is a visible boundary where landscapes that were never neighbors meet. It clusters essence
and Seamborn encounters, costs a flat 100 movement, and makes battle all-school resonant. It remains
rare. Mosswold regularity, Lacquer grain, impossible scale, and domestic silhouettes are clues that
obey mundane-first and anomaly-ration laws.

Different seas also came from different worlds; their water color-lines and creatures can meet at
seams. No authoritative narrator explains this. Terrain names and phrases are in
[`../../src/content/terrain.ts`](../../src/content/terrain.ts) and
[`../../src/content/flavor.ts`](../../src/content/flavor.ts).

## Naming

Use homely English with a crack in it: Wound-Wrights, the Unstruck Bell, Dead Letter Office. Avoid
apostrophe-fantasy and Latin/Greek constructions. Folkloric proper names are reserved for Hagwood
and the neutral pool. The cataclysm has no canonical name. Resource names are Gold, Timber, Iron,
and Essence.
