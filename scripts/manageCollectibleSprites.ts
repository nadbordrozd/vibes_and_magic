import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  ARTIFACT_SPRITE_SUBJECTS, ITEM_SPRITE_SUBJECTS,
} from '../assets/adventureSpriteInventory';
import { ARTIFACTS } from '../src/content/artifacts';
import { ITEMS } from '../src/content/items';

type CollectibleFamily = 'item' | 'artifact';
interface CollectibleInput {
  catalogKey: string;
  subject: string;
  group: string;
  chromaKey: '#00FF00' | '#FF00FF';
  builtInOutput: string;
}

const root = resolve(import.meta.dirname, '..');
const session = '/home/nadbor/.codex/generated_images/019fee78-b5f1-7191-9aa2-6a8e0029a0aa';
const itemCalls: Record<string, string> = {
  spellScroll: 'exec-c0c119f8-0181-467e-85ae-7368e978f219.png', scrollRally: 'exec-4af99732-c50c-49f2-8f5a-976cc76c472c.png',
  scrollBlessing: 'exec-d1e5c96b-5f94-4271-ac7b-30dd5af1b10a.png', scrollForgeSpark: 'exec-6d0b3998-a0bf-4c03-982a-231d3ad4236a.png',
  scrollWard: 'exec-4b516789-3ed2-4430-b46f-5f636caf65c1.png', scrollWither: 'exec-2753e94e-2914-4d09-aa52-2a8561938f49.png',
  scrollQuiet: 'exec-e2a26bd7-9091-46b7-a746-2f55730f5121.png', scrollDirge: 'exec-f23a8359-bfcb-4d38-b0fe-4bd438447e24.png',
  scrollSour: 'exec-13912ded-ae06-45b1-9d20-bc7874714bbe.png', scrollAmplify: 'exec-b24ac50b-c50c-4d8b-93d0-c4a48d53b472.png',
  scrollReflect: 'exec-76064e13-9152-4b49-825d-bec987d4690b.png', potionOfVigor: 'exec-d261b2de-ab4c-4853-9cff-1a5ffc9bb916.png',
  draughtOfIron: 'exec-7b1db363-d57d-4aa6-84c0-f35b2b49ba28.png', smellingSalts: 'exec-d28f117c-2410-438d-854e-70442d023f21.png',
  haresHeel: 'exec-e7a647fa-cb03-4582-82f7-96e01e8a20c4.png', blackfireOil: 'exec-cddfe24d-2c6d-4fe6-ae96-0d08bc3f76ca.png',
  graveDust: 'exec-c625fd2f-0f12-4738-ac4e-f6ff3164c166.png', hornetJar: 'exec-784402ee-b477-4c75-929d-2a79e04929b7.png',
  milkOfTheMoon: 'exec-55150628-16e6-41a4-8019-456bdc02d495.png', chalkOfWalls: 'exec-04e81cae-4d30-408c-94ae-bf56ea49c410.png',
  waxSeal: 'exec-c1d47bd0-2746-4055-9c81-9af6b872d877.png', powderOfUnmaking: 'exec-6699b285-d99b-456a-a1d1-e57aa8ca1d97.png',
  bannerWhistle: 'exec-29704680-1b68-4ecb-9666-95d37e236399.png', secondCandle: 'exec-234ee16e-72a8-4b36-8bad-bf0b7feb4241.png',
  bottledEcho: 'exec-e3d78a34-7cd3-4c61-9ac1-12102668df72.png', cartographersCase: 'exec-d007c3c7-cf70-4980-b41c-ea549de69df3.png',
  waybread: 'exec-17e3e644-fbba-47e4-a378-77b0c9191e2d.png', saltedMeat: 'exec-8680fe54-b7e4-4f67-9d08-d30b844df449.png',
  tavernTales: 'exec-bcb967c1-a637-4466-836b-ab9c498a2c51.png', hearthstone: 'exec-69296aaf-ff00-4335-9761-cf3b2934010a.png',
  ferrymansCoin: 'exec-3098f906-8db8-48de-9e47-a9cfc4695156.png', militiaWrit: 'exec-f0aa5533-bf4d-4439-967e-c5121757e6a8.png',
  beggarsCoin: 'exec-cedb05d2-234a-43be-a2d1-8ee87772d7af.png', foundersTin: 'exec-cc8034b6-9bed-4344-8144-593030f8c863.png',
  cronesBundle: 'exec-6d95bb9e-0d25-419e-8ea6-46bf341ebd1c.png', overseersCharter: 'exec-94acc4b9-c846-450b-8e9b-37a48dc5a896.png',
  tradeGoods: 'exec-9a5f821e-6c7b-41cb-8f10-06f5ad757e3a.png',
};

const artifactCalls: Record<string, string> = {
  skirmishersBlade: 'exec-91863a33-35bd-4150-8e68-0d73847ab1d0.png',
  marchwardensSword: 'exec-d8972436-e611-476f-9079-9d212d390131.png',
  swordOfTheFirstField: 'exec-c0e5c102-ee49-408e-a11c-1fbb8ed84fea.png',
  yeomansBuckler: 'exec-ff37deb5-9c60-4811-8743-fd06e2409de9.png',
  kiteOfTheOldWall: 'exec-4e95e179-7cae-4d3a-9d26-f2bd9497d234.png',
  aegisOfTheKeptOath: 'exec-8613af98-7138-4e27-8b73-c9955d291b2b.png',
  circletOfSmallRites: 'exec-4d1b391c-114d-42db-bf7b-95c38fb9dc77.png',
  hoodOfTheHedgeMage: 'exec-ea616157-9c7f-4996-8af9-7f6291736ec5.png',
  crownOfThePatternedSky: 'exec-3c6d10cf-0284-4723-b416-c38ede5e759a.png',
  chapbookLocket: 'exec-f6b0cfce-c0fb-4be9-b3b5-b96c15ce476c.png',
  reliquaryPendant: 'exec-08929d2b-8fc8-4c7c-a1fd-162dad0f2718.png',
  deepWellAmulet: 'exec-9705e7fe-db80-45d9-b48d-7b91d227a5a7.png',
  quiltedCoat: 'exec-0ea36dba-d7c8-4aee-9c40-cd5f5a187a18.png',
  lamellarOfTheMarches: 'exec-80fbed0d-1831-469b-8ab4-f7ef3ebfc414.png',
  panoplyOfTheGreyKeep: 'exec-f292bc46-8d2e-434f-85e6-dc69e864ca99.png',
  travelersCloak: 'exec-2a648af4-df50-4404-b60c-aecd94b34ccb.png',
  wayfarersMantle: 'exec-682b168a-2d3c-4371-9f2b-b6936eaba059.png',
  cloakOfTheOpenRoad: 'exec-7c72d308-b3be-4888-b1ae-0d6bbf17527b.png',
  cobblersPride: 'exec-a6dfe1d6-ce65-4585-9ba9-ba76b3a870ec.png',
  bootsOfTheDrover: 'exec-2314222b-1fec-408d-802f-ed206b8f0eee.png',
  sevenLeagueBoots: 'exec-40daea75-b00a-4cbd-ab89-603a0090e992.png',
  ringOfSmallMendings: 'exec-44839189-7fb6-4551-945f-2eb5063e6057.png',
  ringOfTheSteadyHand: 'exec-d363eaaa-b3cc-4443-953d-55d6be703bb6.png',
  ringOfTheLongVigil: 'exec-e6a1a50b-91eb-478e-8741-a1e974aa6997.png',
  sashOfTheLeviedMile: 'exec-4bc9d611-632d-4cb2-9a04-d02484723148.png',
  scribesCuff: 'exec-ce8cde60-ed85-4a9a-aa0d-49e0c74be0b1.png',
  captainsWeathercoat: 'exec-f6f51248-bc11-4590-a257-dd72cc18d8cc.png',
  lanternScholarsCap: 'exec-1cccd900-fb3c-4898-9be5-c953e8b07e95.png',
  pilgrimsBelt: 'exec-81fb0c54-ee4b-4f30-b6c5-a2b9fdff9bc3.png',
  surveyorsBoots: 'exec-ed29e6db-bf91-442f-aaef-b4a2d50b24d3.png',
  fieldClerksSeal: 'exec-8bccaf81-d585-4db1-b537-479e4ad13e00.png',
  ashwoodBracer: 'exec-30a452ee-f489-4ed2-8b78-619162e52d14.png',
  quietWard: 'exec-ad200e2e-d29c-4c69-82e6-71f411560d23.png',
  marchGlass: 'exec-310b5f7e-5a75-46c5-b625-d189d6593817.png',
  keepersHalfCloak: 'exec-8ba029dd-fceb-4d70-afc7-afa634c967e5.png',
  mendersGorget: 'exec-1d05eadd-1735-4e96-bdeb-07072c712876.png',
  falconersGlove: 'exec-4f442688-aa5e-4008-be91-2634bb53aa3c.png',
  whetstoneOfTheClans: 'exec-1252d9fe-d3ed-4a0a-b0a1-c335faa71d2a.png',
  tinkersSpectacles: 'exec-e70011cb-919a-46c3-a718-a7bad24a316e.png',
  quietHorseshoe: 'exec-45beb9c9-0669-4873-9b28-a2f30e9fb3bf.png',
  standardBearersBaldric: 'exec-c3c5bf07-d087-4c61-aacd-2c6d1f6db2b2.png',
  saltCrustedCompass: 'exec-113eff37-74ac-4a42-8551-363a980cc82a.png',
  gravebindersSash: 'exec-08a26d66-01c6-43a7-9471-a29e180bc5bf.png',
  forgeAshGauntlets: 'exec-3a0b3f16-f960-4d1a-9e91-49cf49ba7f65.png',
  beeCharmersVeil: 'exec-77492b44-dc1b-429d-bdc8-6bfb5e4eceac.png',
  purseOfThePrudentToad: 'exec-20bc826e-a87f-4bce-8bee-b6c469703951.png',
  chalkmastersRing: 'exec-1ec91f9a-7b27-45e9-ad73-bf022cc28601.png',
  secondQuiver: 'exec-ceccce58-8fd4-40c4-9237-3cf1cd1a4fc1.png',
  gauntletSecondThrow: 'exec-50668362-d377-4f0e-81ad-c5503e5fb930.png',
  candleSnuffersRing: 'exec-e7c601fa-753e-4f59-9383-0401ea8a88f0.png',
  fairScale: 'exec-8e9cd14f-42ff-40a5-bb27-93fad85d676d.png',
  droversCrook: 'exec-fed7e6a5-7422-450a-9794-57d786761f4e.png',
  hexKeepersLocket: 'exec-f238250d-97e8-4165-a765-acf9a4b13e8a.png',
  thirdBoot: 'exec-11b4a31c-7fe2-471f-b29c-3c3468abd4fc.png',
  bellMetalTorque: 'exec-80322090-ccdd-4abb-8c94-77637d88c767.png',
  unsentLetter: 'exec-5c4ca09b-15c2-4571-9eec-30932925910d.png',
  mothEatenMap: 'exec-946d6243-87a6-4ef2-aaf9-b0e9d1a6ab6f.png',
  spareFace: 'exec-f837110a-d7ee-40e2-aa08-729b8dd03fae.png',
  sunderedHourglass: 'exec-76be7e45-f5ed-43fd-8f2c-36e56302977c.png',
  longestCandle: 'exec-3bb463ff-7c4c-4fac-8b88-93d554cd1930.png',
  crookedDistaff: 'exec-6e2a0463-d27c-4280-a375-6ccf4c11ec6b.png',
  bannerOfTheFirstField: 'exec-602289fa-8c51-47df-a1e6-6a61a63d19e5.png',
  patchworkStandard: 'exec-43990b3a-64a1-464f-9c7b-a306ce6fd5e0.png',
  seamstone: 'exec-8e99c33f-f5f9-4c1d-b001-fbccdcb9ef9f.png',
  mirrorshardPendant: 'exec-acfeb4cd-161a-45db-929f-f31289b26e41.png',
  bellsClapper: 'exec-03e37a1b-34e5-45d3-b500-8f704fe8b692.png',
  queensAmber: 'exec-09d92b19-aa6a-4b7f-93d8-5deb8e45e42d.png',
  wolfMothersTorc: 'exec-16159dcf-120e-47e3-a9f8-de9304eb7c4a.png',
  hornOfTheBroadWorld: 'exec-23ce09b8-dd9c-46b2-9e48-70c96ac9827c.png',
  toyKnightsHeart: 'exec-79cb9e91-859d-43a4-bd5b-ea816d422f86.png',
  longSpoon: 'exec-931d5fbe-24a9-4274-8f97-a1bc8f8b046a.png',
  firstDrum: 'exec-54dea506-3a69-44d4-96a1-232b07beb1f1.png',
  crownHollowTown: 'exec-d104dbe7-11d7-463b-8784-1fa156b5fe56.png',
  weathercockIllOmen: 'exec-dd78dcb2-ec33-441b-a5fc-16950da17544.png',
  seamRipper: 'exec-998ce101-46be-47f3-9e35-f0bf19edc365.png',
  lastToy: 'exec-a877679b-6922-41b8-8d99-78a45cceaaf4.png',
};

const magenta = new Set(['scrollSour', 'haresHeel', 'waybread']);
const opaqueGlass: Record<string, string> = {
  potionOfVigor: 'Render the glass as opaque stylized red pixel clusters and crisp highlights, not see-through green.',
  draughtOfIron: 'Render the bottle and tonic as opaque stylized grey pixel clusters and crisp highlights, not see-through green.',
  blackfireOil: 'Render the black glass as opaque stylized near-black pixel clusters and one orange highlight, not see-through green.',
  hornetJar: 'Render the amber glass as opaque stylized amber pixel clusters with the hornet clearly inside, not see-through green.',
  milkOfTheMoon: 'Render the bottle and blue liquid as opaque stylized pixel clusters and crisp highlights, not see-through green.',
  powderOfUnmaking: 'Render the vial and powder as opaque stylized violet pixel clusters with crisp highlights; preserve the deliberately missing lower edge without any see-through green inside the remaining glass.',
  bottledEcho: 'Render the blue glass and visible cork rings as opaque stylized blue pixel clusters and crisp highlights, not see-through green.',
  secondCandle: 'Show a tiny ordinary flame only on the newly relit candle, with no aura or glow.',
};

const firstTen = new Set(Object.keys(itemCalls).slice(0, 10));
const secondTen = new Set(Object.keys(itemCalls).slice(10, 20));

function promptFor(input: CollectibleInput): string {
  if (input.catalogKey === 'scrollQuiet') return `Use case: stylized-concept
Asset type: production collectible item sprite for a storybook strategy game
Primary request: Create exactly one isolated item: A pale parchment scroll tied with a blue-grey cord around a tiny closed bell clasp without a clapper. The rolled parchment must be the dominant silhouette; the bell is only a miniature cord clasp, never a full-size bell.
Scene/backdrop: perfectly flat solid #00FF00 chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines and compact painterly pixel clusters.
Composition/framing: one complete isolated scroll, centered high-oblique non-isometric object view with visible rolled upper surfaces, generous padding, and a strong readable parchment silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes and any tiny object shadow point screen upper-left/map north-west.
Constraints: perfectly uniform #00FF00 background with no gradient, texture, floor plane, or lighting variation; do not use #00FF00 in the subject; opaque crisp-edged object suitable for chroma removal; visibly a scroll first and a tiny bell clasp second.
Avoid: full-size bell, bell-shaped scroll, scarf, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, glow, aura, watermark, reflection, cast shadow on the background, contact shadow on the background, extra objects.`;
  const unified = firstTen.has(input.catalogKey) || secondTen.has(input.catalogKey)
    ? 'one complete isolated object' : 'one complete isolated object or tightly unified described set';
  const reflection = firstTen.has(input.catalogKey) ? 'reflection'
    : 'reflection on the background';
  const magical = Object.keys(itemCalls).slice(20, 30).includes(input.catalogKey) ? 'magical glow' : 'glow';
  return `Use case: stylized-concept
Asset type: production collectible item sprite for a storybook strategy game
Primary request: Create exactly one isolated item: ${input.subject}
Scene/backdrop: perfectly flat solid ${input.chromaKey} chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines and compact painterly pixel clusters.
Composition/framing: ${unified}, centered high-oblique non-isometric object view with visible upper surfaces, generous padding, and a strong readable silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes and any tiny object shadow point screen upper-left/map north-west.
Constraints: perfectly uniform ${input.chromaKey} background with no gradient, texture, floor plane, or lighting variation; do not use ${input.chromaKey} in the subject; opaque crisp-edged object suitable for chroma removal.${opaqueGlass[input.catalogKey] ? ` ${opaqueGlass[input.catalogKey]}` : ''}
Avoid: text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, ${magical}, aura, watermark, ${reflection}, cast shadow on the background, contact shadow on the background, extra objects.`;
}

function artifactLiteralPromptFor(input: CollectibleInput): string {
  const opaqueGlass = input.catalogKey === 'hexKeepersLocket'
    ? ' render the glass as opaque stylized pale pixel clusters and crisp highlights, not see-through green;'
    : '';
  return `Use case: stylized-concept
Asset type: production collectible ${input.group === 'charm' ? 'Charm' : 'Vanilla'} artifact sprite for a storybook strategy game
Primary request: Create exactly one isolated artifact: ${input.subject}
Scene/backdrop: perfectly flat solid ${input.chromaKey} chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines and compact painterly pixel clusters.
Composition/framing: one complete isolated object or tightly unified described set, centered in a high-oblique non-isometric object view with visible upper surfaces, generous padding, and a strong readable silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes point screen upper-left/map north-west.
Constraints: perfectly uniform flat chroma background with no gradient, texture, floor plane, or lighting variation; do not use the chroma color in the subject;${opaqueGlass} opaque crisp-edged object suitable for chroma removal.
Avoid: text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.`;
}

function artifactPromptFor(input: CollectibleInput): string {
  if (input.group === 'relic') {
    const subjectConstraints: Record<string, string> = {
      seamstone: ' the four mineral seams are intrinsic physical detail only and do not encode or select any gameplay school;',
      mirrorshardPendant: ' render the mirror as opaque stylized silver-blue pixel clusters with one sharp blue-white wedge, never see-through green;',
      queensAmber: ' render amber as opaque stylized honey-gold pixel clusters with the insect silhouette clearly inside, never see-through green;',
      hornOfTheBroadWorld: ' the insect horn is an instrument body with a clearly fitted blowing mouthpiece;',
      crownHollowTown: ' the house fronts form the crown itself and are not a town scene;',
      lastToy: ' the wheel belongs to the toy horse and the repaired broken leg remains visible;',
    };
    const avoid: Record<string, string> = {
      longestCandle: 'flame, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      bannerOfTheFirstField: 'text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, ownership flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      patchworkStandard: 'text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, ownership flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      seamstone: 'chosen-school marker, school icon, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      mirrorshardPendant: 'reflected scene, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      bellsClapper: 'bell, full bell body, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      queensAmber: 'loose insect outside the amber, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      wolfMothersTorc: 'living wolves, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      hornOfTheBroadWorld: 'living insect, ordinary mammal horn, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      toyKnightsHeart: 'anatomical flesh heart, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      longSpoon: 'food, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      firstDrum: 'drumsticks, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      crownHollowTown: 'ruined town, terrain, streets, text, letters, writing, glyphs, UI, frame, badge, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      weathercockIllOmen: 'roof, building, compass letters, cardinal direction labels, text, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      seamRipper: 'fabric panel, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
      lastToy: 'living horse, rider, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.',
    };
    const defaultAvoid = 'text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.';
    const readable = input.catalogKey === 'crownHollowTown'
      ? 'strong readable crown silhouette' : 'strong readable silhouette';
    return `Use case: stylized-concept
Asset type: production collectible Relic artifact sprite for a storybook strategy game
Primary request: Create exactly one isolated artifact: ${input.subject}
Scene/backdrop: perfectly flat solid ${input.chromaKey} chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines and compact flat-color pixel clusters.
Composition/framing: one complete isolated object, centered in a high-oblique non-isometric object view with visible upper surfaces, generous padding, and a ${readable} when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes point screen upper-left/map north-west.
Constraints: preserve the exact literal artifact subject;${subjectConstraints[input.catalogKey] ?? ''} perfectly uniform flat chroma background with no gradient, texture, floor plane, or lighting variation; do not use ${input.chromaKey} in the subject; opaque crisp-edged object suitable for chroma removal.
Avoid: ${avoid[input.catalogKey] ?? defaultAvoid}`;
  }
  if (input.catalogKey === 'skirmishersBlade') return `Use case: stylized-concept
Asset type: production collectible Vanilla artifact sprite for a storybook strategy game
Primary request: Create exactly one isolated artifact: A short practical polished steel sword whose blade has a leaf-shaped outline only, with a leather grip, a clear small metal crossguard, and one nick near the tip. The blade material must unmistakably read as steel or iron, never as a botanical leaf.
Scene/backdrop: perfectly flat solid #00FF00 chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines and compact painterly pixel clusters.
Composition/framing: one complete isolated object, centered in a high-oblique non-isometric object view with visible upper blade planes, generous padding, and a strong readable sword silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes point screen upper-left/map north-west.
Constraints: perfectly uniform flat chroma background with no gradient, texture, floor plane, or lighting variation; do not use #00FF00 in the subject; opaque crisp-edged object suitable for chroma removal; polished silver-grey metal blade with restrained highlight.
Avoid: botanical leaf, leaf veins, green blade, plant material, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, rarity marker, slot marker, glow, aura, watermark, reflection on the background, cast shadow on the background, contact shadow on the background, extra objects.`;
  return artifactLiteralPromptFor(input);
}

function sha(fileOrText: string | Buffer): string {
  return createHash('sha256').update(fileOrText).digest('hex');
}

function pngDimensions(path: string): [number, number] {
  const bytes = readFileSync(path);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function upsertSelectionBatch(
  contents: string,
  batch: string,
  entries: Array<Record<string, unknown>>,
): string {
  const compactObject = (entry: Record<string, unknown>) =>
    `{${Object.entries(entry).map(([key, item]) =>
      `${JSON.stringify(key)}: ${JSON.stringify(item)}`).join(', ')}}`;
  const lines = entries.map((entry, index) =>
    `      ${compactObject(entry)}${index === entries.length - 1 ? '' : ','}`);
  const block = [`    ${JSON.stringify(batch)}: [`, ...lines, '    ]'].join('\n');
  const escapedBatch = batch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = new RegExp(`    "${escapedBatch}": \\[\\n[\\s\\S]*?\\n    \\]`);
  if (existing.test(contents)) return contents.replace(existing, block);
  return contents.replace(/\n  }\n}\s*$/, `,\n${block}\n  }\n}\n`);
}

function writeCollectibleJob(
  family: CollectibleFamily,
  inputs: CollectibleInput[],
  promptFactory: (input: CollectibleInput) => string,
  incremental = false,
): void {
  const batchRequests = inputs.map((input) => ({
    id: `collectible:${family}:${input.catalogKey}:built-in`,
    collectible_family: family,
    catalog_key: input.catalogKey,
    catalog_group: input.group,
    assets: [`map-object:${family}:${input.catalogKey}`],
    output: `assets/sources/${family}s/${input.catalogKey}-source.png`,
    final: `public/assets/${family}s/${input.catalogKey}.png`,
    size: [32, 32], candidates: 1, chroma_key: input.chromaKey,
    prompt: promptFactory(input),
  }));
  const jobPath = `assets/jobs/${family}-sprites-built-in.json`;
  const existingJob = incremental && existsSync(resolve(root, jobPath))
    ? JSON.parse(readFileSync(resolve(root, jobPath), 'utf8')) as { requests: typeof batchRequests }
    : null;
  const incomingKeys = new Set(batchRequests.map((request) => request.catalog_key));
  const requests = [
    ...(existingJob?.requests ?? []).filter((request) => !incomingKeys.has(request.catalog_key)),
    ...batchRequests,
  ];
  const job = { version: 1, status: 'ready', generator: 'built-in-imagegen',
    collectible_family: family,
    contact_sheet: `.pixel-work/review/collectibles/${family}`,
    requests };
  writeFileSync(resolve(root, jobPath), `${JSON.stringify(job, null, 2)}\n`);

  const batchSelections = batchRequests.map((request) => {
    const input = inputs.find((candidate) => candidate.catalogKey === request.catalog_key)!;
    const sourcePath = resolve(root, request.output);
    const finalPath = resolve(root, request.final);
    return {
      id: request.assets[0], request_id: request.id,
      collectible_family: family, catalog_key: request.catalog_key,
      accepted: existsSync(sourcePath) && existsSync(finalPath),
      built_in_output: input.builtInOutput,
      discarded_outputs: request.catalog_key === 'scrollQuiet' ? [{
        built_in_output: `${session}/exec-52fc5e1d-d2aa-4a35-8815-5780297a4e05.png`,
        source: 'assets/sources/items/discarded/scrollQuiet-full-bell-source.png',
        reason: 'Rejected in contact review: full-size bell dominated and the parchment scroll was not readable.',
      }] : request.catalog_key === 'skirmishersBlade' ? [{
        built_in_output: `${artifactSession}/exec-2aa25f80-c309-40d1-ac00-3022b19398d7.png`,
        source: 'assets/sources/artifacts/discarded/skirmishersBlade-botanical-leaf-source.png',
        prompt: artifactLiteralPromptFor(input),
        prompt_sha256: sha(artifactLiteralPromptFor(input)),
        source_sha256: sha(readFileSync(resolve(root,
          'assets/sources/artifacts/discarded/skirmishersBlade-botanical-leaf-source.png'))),
        reason: 'Rejected in contact review: the green veined blade read as a literal botanical leaf with a tiny handle, not a steel leaf-shaped sword.',
      }] : [], source: request.output, final: request.final,
      prompt_sha256: sha(request.prompt),
      source_sha256: existsSync(sourcePath) ? sha(readFileSync(sourcePath)) : null,
      final_sha256: existsSync(finalPath) ? sha(readFileSync(finalPath)) : null,
      source_dimensions: existsSync(sourcePath) ? pngDimensions(sourcePath) : null,
      final_dimensions: existsSync(finalPath) ? pngDimensions(finalPath) : null,
      alpha: { hard: true, transparent_corners_required: 4 },
      visual_review: family === 'artifact' && artifactVisualReviews[request.catalog_key]
        ? artifactVisualReviews[request.catalog_key]
        : `Literal ${request.catalog_key} subject selected; high-oblique silhouette, south-east light, generous padding, no baked label or terrain.`,
    };
  });
  const provenancePath = resolve(root, `assets/provenance/${family}-sprite-generation.json`);
  const existingProvenance = incremental && existsSync(provenancePath)
    ? JSON.parse(readFileSync(provenancePath, 'utf8')) as { selections: typeof batchSelections }
    : null;
  const selections = [
    ...(existingProvenance?.selections ?? [])
      .filter((selection) => !incomingKeys.has(selection.catalog_key)),
    ...batchSelections,
  ];
  mkdirSync(dirname(provenancePath), { recursive: true });
  writeFileSync(provenancePath, `${JSON.stringify({
    version: 1, generator: 'built-in-imagegen', generated_on: '2026-08-11', job: jobPath,
    workflow: { source: 'one separate built-in image_gen call per catalog key',
      bake: `uv run --no-project --with pillow python scripts/buildCollectibleSprites.py --job ${jobPath}`,
      resampling: 'nearest-neighbour reduction, adaptive 40-colour palette, hard alpha',
      review: `.pixel-work/review/collectibles/${family}/{catalog_group}-contact-sheet.png` },
    selections,
  }, null, 2)}\n`);
}

const itemInputs = Object.values(ITEMS).map((item): CollectibleInput => ({
  catalogKey: item.id, subject: ITEM_SPRITE_SUBJECTS[item.id], group: item.use,
  chromaKey: magenta.has(item.id) ? '#FF00FF' : '#00FF00',
  builtInOutput: `${session}/${itemCalls[item.id]}`,
}));
const artifactSession = '/home/nadbor/.codex/generated_images/019feeaf-656d-7ea1-8ff8-478ad803e451';
const charmArtifactSession = '/home/nadbor/.codex/generated_images/019feee5-192d-74e2-a4e3-04f90de86942';
const relicArtifactSession = '/home/nadbor/.codex/generated_images/019fef27-6dba-7d31-88fb-5b1abaa8342c';
const artifactMagenta = new Set([
  'hoodOfTheHedgeMage', 'wayfarersMantle', 'bootsOfTheDrover', 'surveyorsBoots',
  'ashwoodBracer', 'quietHorseshoe', 'saltCrustedCompass', 'purseOfThePrudentToad',
  'droversCrook',
]);
const artifactVisualReviews: Record<string, string> = {
  skirmishersBlade: 'Accepted targeted retry after source and 3x-final review: polished steel leaf-shaped outline, crossguard, leather grip, and nick read clearly as a sword; the rejected botanical source remains retained and documented.',
  circletOfSmallRites: 'Accepted after source and 3x-final review. Borderline: the three candle-shaped studs reduce to pale points at 32x32, while the narrow open circlet remains distinct from the two Vanilla crowns.',
  fieldClerksSeal: 'Accepted after source and 3x-final review. Borderline: the sheaf/tally relief becomes fine texture at 32x32, but the paired brass signet and plain red wax impression remain unmistakable and contain no text.',
  keepersHalfCloak: 'Accepted after source and 3x-final review. Borderline: the key clasp is small at native size, but the asymmetric one-shoulder cream cloak silhouette remains unique.',
  standardBearersBaldric: 'Accepted after source and 3x-final review. Borderline: the miniature banner socket reduces to fine brass detail at 32x32, while the broad red leather shoulder-loop silhouette remains distinct.',
  chalkmastersRing: 'Accepted after source and 3x-final review. Borderline: the crenellated setting reads as a compact circular wall at 32x32, but its central opening and white-stone construction keep it identifiable as the wall-shaped ring subject.',
  candleSnuffersRing: 'Accepted after source and 3x-final review. Borderline: the crossed candle-snuffer setting is tiny at native size, while the blackened silver ring silhouette and paired conical cups remain readable.',
  hexKeepersLocket: 'Accepted after source and 3x-final review. Borderline: the chain under glass becomes a dark linked stripe at 32x32, while the plum enamel locket silhouette stays unmistakable.',
  mothEatenMap: 'Accepted after source and 3x-final review. Borderline: the stitched red route fragment is only a few pixels at native size, while the folded parchment and moth holes remain strongly distinct.',
  longestCandle: 'Accepted after source and 3x-final review. Borderline: the many colored wax repairs reduce to tiny varied pixels at native size, while the improbably tall candle and tiny iron socket remain unmistakable.',
  seamstone: 'Accepted after source and 3x-final review: four colored mineral seams meet off-center in one smooth grey stone. The bitmap is intentionally instance-neutral; chosenSchool remains data/UI state and is not baked into the art.',
  queensAmber: 'Accepted after source and 3x-final review. Borderline: the tiny insect crown is fine detail at native size, while the trapped dark insect silhouette and large honey-amber cabochon remain strongly readable.',
  weathercockIllOmen: 'Accepted after source and 3x-final review. Borderline: the four colored wind vanes become small busy accents at native size, while the crooked black weathercock and red eye bead keep a distinctive silhouette.',
  lastToy: 'Accepted after source and 3x-final review. Borderline: the lovingly repaired leg becomes a few banded pixels at native size, while the worn wooden horse, cream paint, red saddle, and single wheel remain clear.',
};
const vanillaArtifactInputs = Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'vanilla')
  .map((artifact): CollectibleInput => ({
    catalogKey: artifact.id,
    subject: ARTIFACT_SPRITE_SUBJECTS[artifact.id],
    group: artifact.class,
    chromaKey: artifactMagenta.has(artifact.id) ? '#FF00FF' : '#00FF00',
    builtInOutput: `${artifactSession}/${artifactCalls[artifact.id]}`,
  }));
const charmArtifactInputs = Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'charm')
  .map((artifact): CollectibleInput => ({
    catalogKey: artifact.id,
    subject: ARTIFACT_SPRITE_SUBJECTS[artifact.id],
    group: artifact.class,
    chromaKey: artifactMagenta.has(artifact.id) ? '#FF00FF' : '#00FF00',
    builtInOutput: `${charmArtifactSession}/${artifactCalls[artifact.id]}`,
  }));
const relicArtifactInputs = Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'relic')
  .map((artifact): CollectibleInput => ({
    catalogKey: artifact.id,
    subject: ARTIFACT_SPRITE_SUBJECTS[artifact.id],
    group: artifact.class,
    chromaKey: ['patchworkStandard', 'seamstone', 'seamRipper'].includes(artifact.id)
      ? '#FF00FF' : '#00FF00',
    builtInOutput: `${relicArtifactSession}/${artifactCalls[artifact.id]}`,
  }));
const selectionsPath = resolve(root, 'assets/selections.json');
const family = process.argv.includes('--artifact') ? 'artifact' : 'item';
const artifactClass = process.argv.includes('--relic') ? 'relic'
  : process.argv.includes('--charm') ? 'charm' : 'vanilla';
const selectedInputs = family === 'artifact'
  ? artifactClass === 'relic' ? relicArtifactInputs
    : artifactClass === 'charm' ? charmArtifactInputs : vanillaArtifactInputs
  : itemInputs;
writeCollectibleJob(
  family, selectedInputs, family === 'artifact' ? artifactPromptFor : promptFor,
  family === 'artifact',
);
const catalogSelectionEntries = selectedInputs.map((input) => ({
  id: `map-object:${family}:${input.catalogKey}`,
  candidate: `assets/sources/${family}s/${input.catalogKey}-source.png`,
  target: `public/assets/${family}s/${input.catalogKey}.png`,
}));
writeFileSync(selectionsPath, upsertSelectionBatch(
  readFileSync(selectionsPath, 'utf8'),
  family === 'artifact' ? `artifact-sprites-${artifactClass}-built-in` : 'item-sprites-built-in',
  catalogSelectionEntries,
));
console.log(`Wrote generic collectible job/provenance for ${selectedInputs.length} ${family}s.`);
