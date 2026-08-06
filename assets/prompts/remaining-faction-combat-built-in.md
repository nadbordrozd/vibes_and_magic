# Remaining playable-faction combat rosters — built-in source prompts

This batch used the built-in image generator in generate mode, one isolated source per unit. Every
request combined one subject clause below with the shared rendering contract. The large keyed
outputs are under the named `assets/sources/*-roster/` directory. The installed chroma-key helper
made transparent intermediates under `.pixel-work/remaining-rosters-keyed/`, and
`scripts/buildRemainingFactionRosters.py` performs the deterministic native-canvas bake.

## Shared rendering contract

```text
Use case: stylized-concept.
Asset type: strict right-facing side-view combat-game unit source for later pixel-art reduction.
Style/medium: richly drawn warm 1990s storybook fantasy strategy-game character art, crisp selective dark outlines, compact painterly colour clusters, a strong readable silhouette, not modern concept art, not photorealism, not smooth 3D.
Composition/framing: the complete static unit is fully visible with generous padding and a clear low horizontal contact baseline. Preserve the requested body plan and tier scale; do not turn a troop into a single generic humanoid.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform colour, no floor plane. Do not use #ff00ff anywhere in the subject.
Constraints: no cast shadow, no contact shadow, no scenery, no terrain patch, no aura, no UI, no text, no logo, no watermark, no gore.
```

## Wound-Wrights

Palette contract: lacquered nursery red, blue and cream, warm brass, honey-coloured wood, stitched
cloth and porcelain. The constructs should feel cherished and sacred, never sinister.

- **Tin Soldier** — One small upright wind-up tin guardsman facing right, with a broad toy shako,
  cream-painted face, red coat, blue trousers, short harmless-looking toy musket, visible key, and
  slightly scuffed lacquer. Compact tier-one silhouette.
- **Hobby Knight** — One jaunty right-facing toy cavalry figure built around a carved horse head on
  a blue-and-cream spring body with little wheels; a red-coated rider carries a short brass lance.
- **Marionette** — One elegant wooden duelling puppet lunging right, suspended from a visible crossbar
  and strings, with jointed limbs, red-and-blue court clothes and a long thin rapier.
- **Stuffed Sentinel** — One broad two-hex stuffed guardian bear facing right, patched cream canvas
  body, blue brigandine, red shoulder patch, button eyes, protective round shield and wooden club.
- **Wooden Colossus** — One towering two-hex carved wooden automaton striding right, tall clockwork
  body, articulated timber limbs, brass joints, lacquered armour plates and a large winding key.
- **Reliquary Ark** — One long two-hex wheeled shrine-procession moving right: ornate blue lacquered
  chest-house with brass ribs, red cloth panels, many small wheels and a carved toy beast harness.

Sources: `assets/sources/wound-wrights-roster/{tin-soldier,hobby-knight,marionette,stuffed-sentinel,wooden-colossus,reliquary-ark}-source.png`.

## Vespiary

Palette contract: black-brown chitin, warm amber, cream paper and sparse honey gold. All creatures
are large insects with materially different body plans; the faction is formal and alien, not horror.

- **Larval Tide, rejected first request** — A compact right-facing crawling mass of pale larvae.
  This produced pebble-like blobs and was not promoted.
- **Larval Tide, accepted correction** — Exactly four large, unmistakable soft-bodied insect grubs
  crawling right in one low row; segmented cream bodies, small amber-brown heads, tiny dark legs and
  visible curled abdomens. No stones, eggs, cocoons or surrounding swarm.
- **Paper-Wasp Lancers** — Two lean giant paper wasps flying right in a close spearhead formation,
  black-and-amber banded abdomens, cream papery wings and straight stingers reading as lances.
- **Silk-Spinners** — One low broad silk-moth/spider artisan facing right, cream abdomen and dark
  jointed legs, carrying a large spool of white silk and feeding a taut strand from its spinnerets.
- **Amber-Carriers** — A compact pair of heavy ground beetles trudging right beneath large translucent
  amber resin vessels, low armoured bodies and cream harness straps.
- **Dragonfly Cavalry** — One long giant dragonfly flying right with a small formal insect rider,
  four clear cream wings, thin black body, amber armour and a forward lance.
- **The Half-Woken Queen** — One enormous two-hex queen insect facing right, swollen amber-banded
  abdomen, heavy black thorax, small cream wings, crown-like antennae and harness details.

Sources: `assets/sources/vespiary-roster/`. `larval-tide-source.png` is retained as the rejected
record; `larval-tide-source-v2.png` is the promoted source.

## Hagwood

Palette contract: white birch, black wicker, old bone, crow feathers, moss-grey cloth and tiny
berry-red accents. Crooked eastern-European folktale shapes, eerie and humorous rather than grim.

- **Crow Chorus** — A tight right-flying flock of five distinct black crows, staggered wings and
  open beaks forming one compact tier-one silhouette; one tiny berry-red ribbon accent.
- **Fence-Post Familiars** — Three crooked white-birch fence posts walking right on root feet,
  connected by black wicker rails, with little carved faces and bone charms.
- **Besom Riders** — One wiry old witch riding a long twig broom right at low altitude, black shawl,
  pale birch broom and berry-red sash, with a hooked folktale profile and streaming cloth.
- **Rusalka** — One tall river spirit drifting right, pale bone-white skin, long wet dark hair, torn
  grey dress becoming curling water-like ribbons, and a few red rowan berries.
- **Leshy** — One imposing antlered birch forest guardian striding right, trunk-like pale body, black
  wicker ribs, root feet, crow feathers and red berry charms.
- **The Walking Hut** — One large two-hex crooked timber cottage walking right on two enormous white
  chicken legs, sagging shingle roof, black wicker chimney, tiny red window and bone-fence details.

Sources: `assets/sources/hagwood-roster/{crow-chorus,fence-post-familiars,besom-riders,rusalka,leshy,walking-hut}-source.png`.

## Wildergrass Clans

Palette contract: ochre hide, horn and bone, ash-grey cloth, charcoal, dry grass gold and sparse
blood-red accents. Low, fast, animal-heavy steppe silhouettes; no polished knight armour.

- **Outriders** — One compact steppe scout galloping right on a small tough ochre horse, rider low in
  the saddle with ash-grey cloak, short recurved bow and blood-red sash.
- **Drum-Callers** — Two walking clan drummers facing right around one large hide war drum, curved
  horn frame, ash-grey wraps and red cords.
- **Ashmane Wolves** — A low running pair of large dark wolves facing right, ash-grey manes, ochre
  undersides and tiny red cord charms. Long, fast pack silhouette; no rider.
- **Aurochs Herd** — Three massive horned aurochs charging right as one broad two-hex herd, dark hides,
  ochre backs, pale sweeping horns and sparse red harness strips.
- **Grass-Serpent** — One enormous horned steppe serpent coiling then striking right, ochre and
  charcoal scales, dry-grass mane and blood-red throat accent.
- **Thunderbird** — One colossal two-hex eagle-like storm bird descending right, wings spread,
  charcoal and ash feathers, ochre-gold pinions, horn ornaments and red ribbons.

Sources: `assets/sources/wildergrass-roster/{outriders,drum-callers,ashmane-wolves,aurochs-herd,grass-serpent,thunderbird}-source.png`.
