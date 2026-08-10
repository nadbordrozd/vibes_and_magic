import type {
  ArtifactId, FactionId, ItemId, ResourceId,
} from '../src/core/types';

/**
 * Visual subjects for the next adventure-sprite production pass. These are prompt inputs, not
 * renderer registrations: adding this inventory does not claim that a bitmap exists.
 *
 * Every subject inherits the same production clause: bright cartoony storybook pixel art on a
 * transparent canvas, high-oblique non-isometric adventure camera, clear silhouette at native
 * size, light from screen lower-right/map south-east, shadow toward upper-left/north-west, no text,
 * badge, frame, scenery, terrain plate, owner colour, logo, or watermark.
 */
export const ADVENTURE_SPRITE_STYLE =
  'Bright cartoony storybook pixel art; transparent canvas; high-oblique non-isometric adventure camera; south-east key light and north-west shadow; crisp readable silhouette; no text, frame, scenery, terrain plate, owner colour, logo, or watermark.' as const;

export const CITY_SPRITE_SUBJECTS = {
  hearthguard: 'A broad cream-limestone gatehouse city with warm red tile roofs, two sturdy square towers, wrought-iron braces, gold heraldic trim, and one large central arched gate.',
  woundWrights: 'A cheerful painted-timber workshop city of rounded toy-like towers, lacquered red-blue-yellow panels, brass hinges, porcelain insets, visible repair seams, and one central double workshop door.',
  unfinished: 'A complete and carefully tended pale memorial city of bone-white stone, funeral-linen awnings, candlelit niches, grave-gold fittings, slender hollow arches, and one central processional doorway; never ruined or sinister.',
  vespiary: 'A low amber-resin hive city with black chitin buttresses, layered paper-nest roofs, honeycomb openings, asymmetrical papery wings, and one generous central resin arch.',
  hagwood: 'A grown city of crooked white-birch halls, wicker galleries, bone-fence finials, crow-feather weather vanes, berry-red cloth knots, and one central red door beneath a bent living bough; no masonry castle towers.',
  wildergrass: 'A long low steppe city of ochre hide halls, ashwood palisades, horn roof-ridges, grey felt canopies, blood-red woven bands, herd totems, and one central drum-framed gate; no generic stone keep.',
} satisfies Record<FactionId, string>;

export const RESOURCE_PICKUP_SUBJECTS = {
  gold: 'A small practical pile of dull gold coins with visible oval tops and shaded rims, wealth rather than a treasure mountain.',
  timber: 'Four short cut logs stacked two over two, with warm bark, long upper surfaces, and circular cut ends.',
  iron: 'Four rough charcoal iron billets crossed in a compact pile, with cool metal planes and restrained pale edge glints.',
  essence: 'Three translucent blue-violet mineral shards rising from one dark stitched knot, ordinary mineral first and impossible seam-light second, with no aura or sparkles.',
} satisfies Record<ResourceId, string>;

export const RESOURCE_MINE_SUBJECTS = {
  gold: 'A compact timber-braced adit in pale quarried rock, with a hand winch and a few restrained gold-bearing chips; open entrance on the left and working rock mass on the right.',
  timber: 'A compact logging camp with an open left work yard, shingled saw shelter, sawbench, and round-ended log stacks physically filling the right half.',
  iron: 'A compact dark-timber headframe over a charcoal-rock adit, with pulley, short rails, and rough iron-bearing stone; open entrance on the left and hoist mass on the right.',
  essence: 'A purpose-built stitchwell: an old stone-lined extraction basin over a hairline world-seam, with a crooked copper pump, glass collecting flask, pale blue-violet threadlike mineral in the water, an open left flagstone step, and the basin blocking the right half; rural utility first, uncanny resource second, never a generic crystal mine or magical fountain.',
} satisfies Record<ResourceId, string>;

export const ITEM_SPRITE_SUBJECTS = {
  spellScroll: 'A rolled cream parchment tied with a plain blue cord and one blank wax seal, leaving a clear center for no written glyph.',
  scrollRally: 'A cream scroll tied red-gold around a tiny brass trumpet-shaped clasp.',
  scrollBlessing: 'A cream scroll tied ivory-gold around a small sunburst seal.',
  scrollForgeSpark: 'A soot-edged scroll tied copper-orange around a miniature anvil seal.',
  scrollWard: 'A cream scroll tied blue-brass around a small upright shield seal.',
  scrollWither: 'A dry grey scroll tied plum around a single curled dead leaf seal.',
  scrollQuiet: 'A pale scroll tied blue-grey around a closed bell without a clapper.',
  scrollDirge: 'A pale mourning scroll tied charcoal-violet around a tiny lyre seal.',
  scrollSour: 'A dark-edged scroll tied green-violet around a split droplet seal.',
  scrollAmplify: 'A cream scroll tied gold around two nested brass rings.',
  scrollReflect: 'A blue-white scroll tied copper around a small angled hand mirror.',
  potionOfVigor: 'A squat red glass tonic bottle with a broad cork and a tiny brass heart tag.',
  draughtOfIron: 'A square smoke-grey bottle in a simple iron cage, filled with dark metallic tonic.',
  smellingSalts: 'A tiny white ceramic jar with a blue stopper and a few sharp salt crystals at its lip.',
  haresHeel: 'A clean lucky hare-foot charm bound in green cord with a small brass cap.',
  blackfireOil: 'A narrow black-glass oil flask wrapped in copper wire, with one orange reflection and no flame.',
  graveDust: 'A stitched ash-grey sachet spilling a pinch of pale grave dust.',
  hornetJar: 'A corked amber glass jar containing one bold black-and-gold hornet silhouette.',
  milkOfTheMoon: 'A round pearl-white bottle with a crescent-shaped silver handle and cool blue liquid.',
  chalkOfWalls: 'Three thick white masonry chalk sticks bound by a red string.',
  waxSeal: 'A short brass seal stamp beside one unmarked deep-red wax wafer.',
  powderOfUnmaking: 'A stoppered violet powder vial whose lower glass edge appears neatly missing, with no glow.',
  bannerWhistle: 'A small brass whistle on a red-and-cream banner cord.',
  secondCandle: 'Two short ivory candles sharing one brass holder, one newly relit.',
  bottledEcho: 'A round blue glass bottle with two concentric cork rings visible through it.',
  cartographersCase: 'A compact brown leather map case with brass dividers, compass clasp, and one rolled blank chart.',
  waybread: 'A round scored travel loaf wrapped halfway in a green cloth.',
  saltedMeat: 'Three red-brown cured meat strips tied in butcher paper and twine.',
  tavernTales: 'A dog-eared little chapbook beside a clay drinking cup, with blank cover and pages.',
  hearthstone: 'A smooth warm-grey palm stone carved only with a simple house-shaped groove and ember-red inset.',
  ferrymansCoin: 'A large worn dark-silver coin pierced for a black cord, showing a tiny boat silhouette but no letters.',
  militiaWrit: 'A tightly rolled official parchment crossed by a small wooden practice spear and plain red seal.',
  beggarsCoin: 'A thin copper coin sewn into a visibly patched little cloth square.',
  foundersTin: 'A dented blue-and-red toy tin with its lid ajar and one tiny tin helmet visible.',
  cronesBundle: 'A lumpy birch-bark parcel tied with berry-red thread, crow feather, and one small bone toggle.',
  overseersCharter: 'A broad rolled parchment clipped to a small wooden tally board with a brass mine token.',
  tradeGoods: 'A compact rope-bound bale containing folded cloth, a tiny crock, and one tool handle, with no merchant stall.',
} satisfies Record<ItemId, string>;

export const ARTIFACT_SPRITE_SUBJECTS = {
  skirmishersBlade: 'A short practical leaf-shaped sword with a leather grip and one nick near the tip.',
  marchwardensSword: 'A straight patrol sword with a broad brass crossguard and road-brown scabbard strap.',
  swordOfTheFirstField: 'A polished long sword with a wheat-sheaf pommel and restrained sunrise-gold fuller.',
  yeomansBuckler: 'A small round cream-painted wooden buckler with an iron boss and two honest repairs.',
  kiteOfTheOldWall: 'A tall weathered kite shield of grey wood and iron rim, painted with one cream wall block.',
  aegisOfTheKeptOath: 'A broad gold-rimmed heater shield with an upright closed-gate emblem and red leather lining.',
  circletOfSmallRites: 'A narrow brass circlet set with three candle-shaped cream studs.',
  hoodOfTheHedgeMage: 'A soft moss-green pointed hood with patched cream lining and one rowan pin.',
  crownOfThePatternedSky: 'A low gold crown whose blue enamel points form interlocking clouds and stars without text.',
  chapbookLocket: 'A tiny brass book-shaped locket on a cream cord, cover blank and clasp open.',
  reliquaryPendant: 'A small arched brass-and-glass pendant holding one folded white cloth relic.',
  deepWellAmulet: 'A dark-blue teardrop stone suspended in a deep silver ring like a bucket over a well.',
  quiltedCoat: 'A folded cream gambeson with red stitching, brass toggles, and thick diamond quilting.',
  lamellarOfTheMarches: 'Overlapping brown iron-and-leather lamellar plates bound with warm red cord.',
  panoplyOfTheGreyKeep: 'A compact suit of pale steel plate with squared pauldrons and a cream-red waist sash.',
  travelersCloak: 'A rolled russet travelling cloak with a plain wooden clasp and dust-dark hem.',
  wayfarersMantle: 'A green-grey shoulder mantle fastened by a brass road-wheel brooch.',
  cloakOfTheOpenRoad: 'A wind-swept ochre cloak with a blue lining and an open brass gate clasp.',
  cobblersPride: 'One immaculate brown ankle boot with bright hobnails, thick sole, and red pull loop.',
  bootsOfTheDrover: 'A sturdy pair of mud-brown riding boots with brass heel guards and green straps.',
  sevenLeagueBoots: 'Long crimson travelling boots with wing-shaped cream cuffs and oversized golden buckles.',
  ringOfSmallMendings: 'A slim silver ring closed by a visible golden repair staple.',
  ringOfTheSteadyHand: 'A broad brass ring shaped like two clasped steady hands.',
  ringOfTheLongVigil: 'A dark silver ring set with a tiny upright candle of pale amber.',
  falconersGlove: 'A thick tan leather glove with red cuff, brass jesses, and one small feather.',
  whetstoneOfTheClans: 'A long grey whetstone in an ochre hide sling marked by two horn beads.',
  tinkersSpectacles: 'Round brass spectacles with one blue lens, one clear lens, and a tiny screwdriver hinge.',
  quietHorseshoe: 'A small black iron horseshoe wrapped at both ends in muted green cloth.',
  standardBearersBaldric: 'A broad red leather shoulder belt with cream piping and a miniature banner socket.',
  saltCrustedCompass: 'A green-brass compass crusted with white sea salt, its blue needle plainly visible.',
  gravebindersSash: 'A folded ash-white funeral sash fastened with a plum knot and small bone toggle.',
  forgeAshGauntlets: 'A pair of dark leather work gauntlets dusted with pale forge ash and copper fingertips.',
  beeCharmersVeil: 'A cream mesh beekeeper veil with honey-gold rim, black tie, and one small bee brooch.',
  purseOfThePrudentToad: 'A squat green leather coin purse with brass toad clasp and tightly drawn cord.',
  chalkmastersRing: 'A chunky white-stone ring shaped like one crenellated wall segment.',
  secondQuiver: 'A compact blue leather quiver holding six red-fletched arrows in a neat fan.',
  sunderedHourglass: 'A brass hourglass broken cleanly through its waist while gold sand hangs in both bulbs.',
  longestCandle: 'An improbably tall ivory candle in a tiny iron socket, with many colored wax repairs.',
  crookedDistaff: 'A bent black-birch spinning distaff wound with berry-red and white thread.',
  bannerOfTheFirstField: 'A folded cream battle banner on a short brass pole, bearing a bold red rising field emblem.',
  patchworkStandard: 'A small standard sewn from six differently colored cloth patches around one brass boss.',
  seamstone: 'A smooth grey stone split by four thin colored mineral seams meeting off-center.',
  mirrorshardPendant: 'A triangular mirror shard in a copper wire pendant, reflecting one sharp blue-white wedge.',
  bellsClapper: 'A heavy dark-brass bell clapper on a frayed cream rope, without the bell.',
  queensAmber: 'A large honey-amber cabochon containing the clear silhouette of a tiny crowned insect.',
  wolfMothersTorc: 'A thick ash-silver neck torc ending in two stylized ochre wolf heads.',
  hornOfTheBroadWorld: 'A huge curled black-and-gold insect horn fitted with a small leather blowing mouthpiece.',
  toyKnightsHeart: 'A red enamel clockwork heart with brass wind-up key, seam, and tiny shield plate.',
  tailorsNeedle: 'An elegant long silver sewing needle with a gold thread loop and weapon-like red grip.',
  goldenThread: 'A bright gold thread wound around a small dark wooden bobbin with one loose looping strand.',
  tailorsThimble: 'A polished gold thimble punched with a precise spiral of dark dimples.',
  patternbook: 'A thick cream tailoring book with red binding, brass corner pieces, and blank geometric paper patterns peeking out.',
  knucklebonesOfTheSaint: 'Four small ivory knucklebones in a red drawstring pouch, one bone showing a gold repair.',
  drumOfTheDeepGrass: 'A low ochre hide hand drum with ashwood rim and red zigzag binding.',
  censerOfStillness: 'A small closed silver censer on a short chain, with no smoke and one blue enamel vent.',
  pocketSundial: 'A hinged brass pocket sundial opened to show a triangular gnomon and blank dial.',
  ironNail: 'One heavy hand-forged black iron nail bound once with cream thread.',
  mirrorMask: 'A small smooth silver half-mask with dark eye holes and one visibly cracked reflected edge.',
  sashOfTheLeviedMile: 'A rolled cream-red military sash pinned with a tiny brass milestone.',
  scribesCuff: 'A blue leather wrist cuff holding a cut quill, small chalk, and blank parchment slip.',
  captainsWeathercoat: 'A folded storm-blue waxed coat with brass toggles, red collar, and rain-beaded shoulders.',
  lanternScholarsCap: 'A soft dark-blue scholar cap pinned with a tiny warm brass lantern.',
  pilgrimsBelt: 'A broad worn brown belt carrying a cream cord, plain cup, and small road token.',
  surveyorsBoots: 'A pair of short green-grey boots with brass measuring ticks on their reinforced sides.',
  fieldClerksSeal: 'A brass signet ring beside a plain red wax impression shaped like a sheaf and tally mark.',
  ashwoodBracer: 'A curved ashwood forearm guard with black leather ties and one pale carved leaf.',
  quietWard: 'A small white padded amulet shield wrapped in blue thread, its central bell tied silent.',
  marchGlass: 'A thick brass monocular containing a pale blue lens and one red route needle.',
  keepersHalfCloak: 'A short one-shoulder cream cloak with grey lining and a large key-shaped clasp.',
  mendersGorget: 'A riveted brass neck guard visibly repaired with porcelain and red thread.',
  gauntletSecondThrow: 'A fingerless brown throwing glove with a second small stone tucked beneath its brass cuff.',
  candleSnuffersRing: 'A blackened silver ring whose raised setting is a tiny crossed pair of candle snuffers.',
  fairScale: 'A miniature balanced brass merchant scale with equal blue and red pans.',
  droversCrook: 'A short ashwood shepherd crook wrapped with green cord and capped in horn.',
  hexKeepersLocket: 'A plum enamel locket with a tiny black chain pattern trapped beneath clear glass.',
  thirdBoot: 'One small mismatched berry-red boot strapped atop a practical brown boot.',
  bellMetalTorque: 'A thick dull-gold neck torque made from hammered bell metal with squared ends.',
  unsentLetter: 'A sealed cream letter with no address, bound by a faded blue ribbon and dry flower stem.',
  mothEatenMap: 'A folded blank-edged map riddled with moth holes, with one stitched red route fragment.',
  spareFace: 'A palm-sized blank porcelain mask with rosy cheeks, simple joint holes, and a visible repair seam.',
  longSpoon: 'An absurdly long dark-silver spoon curled around itself, with a deep black bowl.',
  firstDrum: 'An ancient hide war drum with one original ochre panel amid many red stitched repairs.',
  crownHollowTown: 'A thin pale crown shaped from empty house fronts and dark vacant windows, still clean and ceremonial.',
  weathercockIllOmen: 'A crooked black iron weathercock with four tiny colored wind vanes and one red eye bead.',
  seamRipper: 'A heavy silver seam-ripping hook with four colored threads caught beneath its forked tip.',
  lastToy: 'A tiny worn wooden horse with one wheel, cream paint, red saddle, and a lovingly repaired broken leg.',
  leadenCrown: 'A low brutally heavy grey lead crown with four blunt points and a strained red inner band.',
  hungryBlade: 'A broad dark iron sword whose edge resembles restrained teeth, with a red leather grip and empty brass ration hook.',
  beggarsRing: 'A thin battered copper ring set with a surprisingly bright blue glass pebble.',
  patternlessCoat: 'A folded charcoal coat whose panels, buttons, and hems deliberately fail to align, lined in pale cream.',
} satisfies Record<ArtifactId, string>;

function assertComplete(
  label: string, expected: readonly string[], subjects: Readonly<Record<string, string>>,
): void {
  const actual = Object.keys(subjects);
  const missing = expected.filter((id) => !Object.hasOwn(subjects, id));
  const extra = actual.filter((id) => !expected.includes(id));
  const empty = actual.filter((id) => !subjects[id].trim());
  if (missing.length || extra.length || empty.length) {
    throw new Error(`${label} sprite inventory mismatch: missing=${missing.join(',')}; extra=${extra.join(',')}; empty=${empty.join(',')}`);
  }
}

export function validateAdventureSpriteInventory(catalogs: {
  factions: readonly string[];
  resources: readonly string[];
  items: readonly string[];
  artifacts: readonly string[];
}): void {
  assertComplete('city', catalogs.factions, CITY_SPRITE_SUBJECTS);
  assertComplete('resource pickup', catalogs.resources, RESOURCE_PICKUP_SUBJECTS);
  assertComplete('resource mine', catalogs.resources, RESOURCE_MINE_SUBJECTS);
  assertComplete('item', catalogs.items, ITEM_SPRITE_SUBJECTS);
  assertComplete('artifact', catalogs.artifacts, ARTIFACT_SPRITE_SUBJECTS);
}
