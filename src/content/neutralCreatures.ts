import type { UnitId } from '../core/types';
import type { UnitDefinition } from './units';
import type { ContentAssetRequirement, CreatureAssetCulture } from './v2/schema';

export const DOC63_NEUTRAL_CREATURE_IDS = [
  'seamMoth', 'chalkWight', 'emberToad', 'glassHound', 'tallyman',
  'lanternBearer', 'boneOrchard', 'stitchOx',
] as const satisfies readonly UnitId[];

export const DOC64_SHOWCASE_CREATURE_IDS = [
  'nineMouthedWell', 'kilnDrake', 'whistlingNan', 'unbaptized', 'bellfounder',
] as const satisfies readonly UnitId[];

export const DOC63_64_CREATURE_IDS = [
  ...DOC63_NEUTRAL_CREATURE_IDS, ...DOC64_SHOWCASE_CREATURE_IDS,
] as const satisfies readonly UnitId[];

/** Authored values deliberately sit beside comparable faction tiers; their combo traits cost morale. */
export const DOC63_64_CREATURES = {
  seamMoth: {
    id: 'seamMoth', name: 'Seam Moth', faction: 'seamborn', tier: 2,
    hp: 12, damage: [2, 4], attack: 5, defense: 3, speed: 8,
    growth: 9, cost: { gold: 190, essence: 1 },
    abilities: ['flying', 'spellbound', 'mana_leech'],
    resistances: [{ kind: 'spellbound' }],
  },
  chalkWight: {
    id: 'chalkWight', name: 'Chalk Wight', faction: 'seamborn', tier: 3,
    hp: 30, damage: [4, 7], attack: 7, defense: 8, speed: 5,
    growth: 5, cost: { gold: 420, essence: 1 }, abilities: ['echoing', 'spirit'],
  },
  emberToad: {
    id: 'emberToad', name: 'Ember Toad', faction: 'neutralBeast', tier: 2,
    hp: 18, damage: [2, 5], attack: 4, defense: 5, speed: 4,
    growth: 8, cost: { gold: 210 }, abilities: ['beast', 'burn_conduit', 'spell_shrug'],
    resistances: [{ kind: 'spell-shrug' }],
  },
  glassHound: {
    id: 'glassHound', name: 'Glass Hound', faction: 'gloamingCourt', tier: 3,
    hp: 25, damage: [6, 9], attack: 9, defense: 5, speed: 9,
    growth: 5, cost: { gold: 440, essence: 1 },
    abilities: ['beast', 'blink_step', 'no_retaliation'],
  },
  tallyman: {
    id: 'tallyman', name: 'The Tallyman', faction: 'gloamingCourt', tier: 4,
    hp: 65, damage: [8, 13], attack: 10, defense: 11, speed: 5,
    growth: 3, cost: { gold: 800, essence: 1 }, abilities: ['soul_tithe', 'first_strike'],
  },
  lanternBearer: {
    id: 'lanternBearer', name: 'Lantern Bearer', faction: 'unstruckBell', tier: 3,
    hp: 32, damage: [4, 7], attack: 6, defense: 9, speed: 5,
    growth: 5, cost: { gold: 430, essence: 1 },
    abilities: ['caster', 'ward_bearer'],
    caster: { repertoire: ['kindle', 'blessing'], charges: 3, castPower: 3 },
  },
  boneOrchard: {
    id: 'boneOrchard', name: 'Bone Orchard', faction: 'seamborn', tier: 4,
    hp: 85, damage: [8, 12], attack: 10, defense: 13, speed: 1,
    growth: 3, cost: { gold: 850, timber: 1, essence: 1 },
    abilities: ['immobile', 'ranged', 'altar', 'construct'], shots: 8,
  },
  stitchOx: {
    id: 'stitchOx', name: 'Stitch-Ox', faction: 'seamborn', tier: 5,
    hp: 165, damage: [15, 22], attack: 13, defense: 16, speed: 4,
    growth: 2, cost: { gold: 1650, iron: 2 }, abilities: ['phalanx', 'siphon'],
  },
  nineMouthedWell: {
    id: 'nineMouthedWell', name: 'The Nine-Mouthed Well', faction: 'seamborn', tier: 5,
    hp: 190, damage: [18, 28], attack: 14, defense: 17, speed: 3,
    growth: 1, cost: { gold: 2000, essence: 2 },
    abilities: ['all_adjacent', 'unstable', 'slow_witted'],
    attackPattern: { kind: 'all-adjacent' },
  },
  kilnDrake: {
    id: 'kilnDrake', name: 'Kiln Drake', faction: 'neutralBeast', tier: 5,
    hp: 150, damage: [20, 30], attack: 16, defense: 12, speed: 8,
    growth: 1, cost: { gold: 2100, iron: 1, essence: 1 },
    abilities: ['flying', 'beast', 'breath', 'unburnable', 'hungry'],
    attackPattern: { kind: 'breath' },
    resistances: [{ kind: 'counter-immune', counter: 'burn' }],
  },
  whistlingNan: {
    id: 'whistlingNan', name: 'Whistling Nan', faction: 'hagwoodNeutral', tier: 4,
    hp: 55, damage: [7, 11], attack: 9, defense: 10, speed: 5,
    growth: 3, cost: { gold: 850, essence: 2 },
    abilities: ['caster', 'hex_feeder', 'dread'],
    caster: { repertoire: ['wither', 'quiet'], charges: 3, castPower: 4 },
  },
  unbaptized: {
    id: 'unbaptized', name: 'The Unbaptized', faction: 'unfinished', tier: 3,
    hp: 42, damage: [4, 7], attack: 6, defense: 11, speed: 4,
    growth: 6, cost: { gold: 330 }, abilities: ['spellbound', 'mindless', 'cornered'],
    resistances: [{ kind: 'spellbound' }],
  },
  bellfounder: {
    id: 'bellfounder', name: 'Bellfounder', faction: 'unstruckBell', tier: 4,
    hp: 70, damage: [7, 12], attack: 8, defense: 13, speed: 4,
    growth: 3, cost: { gold: 800, essence: 2 }, abilities: ['caster', 'low_magic_immune'],
    caster: { repertoire: ['steadyHands', 'clarion'], charges: 2, castPower: 3 },
    resistances: [{ kind: 'low-magic-immune' }],
  },
} satisfies Partial<Record<UnitId, Omit<UnitDefinition, 'flavor' | 'hexSize'>>>;

export interface NeutralCreatureAcquisition {
  unitId: typeof DOC63_64_CREATURE_IDS[number];
  dwellingName: string;
  dwellingFlavor: string;
  channels: readonly ('field-dwelling' | 'diplomacy' | 'beast-tongue' | 'beastmaster')[];
  mapIds: readonly string[];
}

const ACQUISITION_ROWS: ReadonlyArray<readonly [UnitId, string, string]> = [
  ['seamMoth', 'Mothlight Seam', 'Pale wings gather where two versions of moonlight overlap.'],
  ['chalkWight', 'The Chalk Verge', 'A white line circles the field. Something inside has begun correcting it.'],
  ['emberToad', 'Warmstone Pool', 'The stones stay warm after rain, and the toads stay warmer.'],
  ['glassHound', 'The Borrowed Kennel', 'Every hook holds a different collar. None bears the same name twice.'],
  ['tallyman', 'The Counting House', 'The shutters open only when a battle has left something to count.'],
  ['lanternBearer', 'Lantern Cloister', 'The lamps are trimmed on a schedule the sun has never understood.'],
  ['boneOrchard', 'The White Orchard', 'Its fruit has joints. The gardener carries a very small saw.'],
  ['stitchOx', 'Yoke at the Seam', 'A patient shape waits where the furrows fail to meet.'],
  ['nineMouthedWell', 'The Thirteen-Coped Well', 'Nine mouths drink. Four are sensibly kept under stone.'],
  ['kilnDrake', 'The Walking Kiln', 'Smoke leaves by the chimney. The chimney occasionally leaves too.'],
  ['whistlingNan', "Nan's Bent Gate", 'The tune arrives first. The old woman charges for the rest.'],
  ['unbaptized', 'The Dry Font', 'The basin is empty. The congregation is not.'],
  ['bellfounder', 'The Quiet Foundry', 'No bell is cast here, but every hammer waits for the proper second.'],
];

export const NEUTRAL_CREATURE_ACQUISITION: readonly NeutralCreatureAcquisition[] =
  ACQUISITION_ROWS.map(([unitId, dwellingName, dwellingFlavor]) => {
    const unit = DOC63_64_CREATURES[unitId as keyof typeof DOC63_64_CREATURES];
    const beast = unit.abilities.includes('beast' as never);
    return {
      unitId: unitId as NeutralCreatureAcquisition['unitId'], dwellingName, dwellingFlavor,
      channels: ['field-dwelling', 'diplomacy', ...(beast
        ? ['beast-tongue', 'beastmaster'] as const : [])],
      mapIds: ['manywhere'],
    };
  });

const CULTURES: Readonly<Record<typeof DOC63_64_CREATURE_IDS[number], CreatureAssetCulture>> = {
  seamMoth: 'seamborn', chalkWight: 'seamborn', emberToad: 'neutralBeast',
  glassHound: 'gloamingCourt', tallyman: 'gloamingCourt', lanternBearer: 'unstruckBell',
  boneOrchard: 'seamborn', stitchOx: 'seamborn', nineMouthedWell: 'seamborn',
  kilnDrake: 'neutralBeast', whistlingNan: 'hagwoodNeutral', unbaptized: 'unfinished',
  bellfounder: 'unstruckBell',
};

const SUBJECTS: Readonly<Record<typeof DOC63_64_CREATURE_IDS[number], string>> = {
  seamMoth: 'a broad pale moth whose wings meet along one dark stitched seam',
  chalkWight: 'a stooped chalk-white spirit trailing one continuous boundary line',
  emberToad: 'a squat soot-black toad with a furnace-orange throat',
  glassHound: 'a long masked hunting hound made from plum and silver glass',
  tallyman: 'a narrow masked courtier carrying one hooked counting staff',
  lanternBearer: 'a humble tonsured monk carrying a tall hooded lantern',
  boneOrchard: 'a rooted orchard of white jointed boughs strung like a siege bow',
  stitchOx: 'a massive patched ox crossed by one luminous seam and broad yoke',
  nineMouthedWell: 'a three-hex walking stone well with nine snapping carved mouths',
  kilnDrake: 'a brick-red winged drake with a chimney back and kiln-bright chest',
  whistlingNan: 'a bent folkloric hedge-witch with whistle, shawl, and thorn staff',
  unbaptized: 'a broad unfinished clay penitent carrying an empty stone font',
  bellfounder: 'a sturdy tonsured monk with two timing hammers and an uncast bell frame',
};

export const CREATURE_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] =
  DOC63_64_CREATURE_IDS.flatMap((id) => {
    const unit = DOC63_64_CREATURES[id];
    const semantics = { family: 'creature' as const, culture: CULTURES[id], tier: unit.tier };
    return [{
      canonicalId: `creature:${id}:battle`, semantics, introducedBy: 'docs-60-67' as const,
      nativeAssetId: `battle-unit:${id}`, visualSubject: `battle company: ${SUBJECTS[id]}`,
      accessibleName: `${unit.name} battle company`,
    }, {
      canonicalId: `creature:${id}:guardian`, semantics, introducedBy: 'docs-60-67' as const,
      nativeAssetId: `guardian-unit:${id}`,
      visualSubject: `adventure-map guardian silhouette: ${SUBJECTS[id]}`,
      accessibleName: `${unit.name} map guardian`,
    }];
  });
