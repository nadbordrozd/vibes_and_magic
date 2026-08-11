import type {
  ArtifactId, ArtifactSlot, EquipmentSlotId, PrimaryStat,
} from '../core/types';
import { artifactFlavor } from './flavor';

export type ArtifactClass = 'vanilla' | 'charm' | 'relic' | 'burden' | 'kit' | 'trinket';
export type ArtifactEffectTag =
  | 'primary_stat' | 'daily_move' | 'daily_mana' | 'luck'
  | 'scouting' | 'beast_speed' | 'reveal_drops' | 'weak_guardians_flee'
  | 'round_meter' | 'trade_goods' | 'hex_application' | 'burn_application'
  | 'ignore_natural_tiles' | 'daily_gold' | 'extra_wall' | 'extra_shots'
  | 'double_cast_even_rounds' | 'revive_first_stack' | 'enemy_luck'
  | 'meter_threshold' | 'mixed_faction_meter' | 'chosen_resonance'
  | 'reflect_first_spell' | 'reset_meters' | 'tier_one_growth'
  | 'double_beast_retaliation' | 'double_largest_attack' | 'unfinished_vow'
  | 'kit_piece' | 'first_spell_tax' | 'prebattle_cast'
  | 'negate_first_ability' | 'melee_reflect'
  | 'push_bonus' | 'reduce_enemy_death' | 'peddler_rates' | 'low_tier_speed'
  | 'hex_duration' | 'ignore_first_aggro' | 'reduced_meter_drain'
  | 'unfinished_stats' | 'patient_fragment' | 'free_false_colors'
  | 'eat_counter' | 'early_double_meter' | 'neutral_town_intel'
  | 'choose_fickle_omen' | 'owner_only_seam' | 'last_stack_survives'
  | 'price_penalty' | 'spell_plus_block' | 'post_battle_stack_loss';

export interface ArtifactDefinition {
  id: ArtifactId;
  name: string;
  flavor: string;
  slot: ArtifactSlot;
  class: ArtifactClass;
  description: string;
  effects: ArtifactEffectTag[];
  values?: Partial<Record<PrimaryStat | 'amount' | 'percent', number>>;
  burdenRemoval?: string;
}

const artifact = (
  id: ArtifactId, name: string, slot: ArtifactSlot, artifactClass: ArtifactClass,
  description: string, effects: ArtifactEffectTag[] = [],
  values?: ArtifactDefinition['values'],
): ArtifactDefinition => ({
  id, name, flavor: artifactFlavor(name), slot, class: artifactClass, description, effects, values,
});

const stat = (
  id: ArtifactId, name: string, slot: ArtifactSlot,
  primary: PrimaryStat, amount: number,
) => artifact(
  id, name, slot, 'vanilla', `+${amount} ${primary}.`,
  ['primary_stat'], { [primary]: amount },
);

export const ARTIFACTS: Record<ArtifactId, ArtifactDefinition> = {
  skirmishersBlade: stat('skirmishersBlade', "Skirmisher's Blade", 'weapon', 'attack', 1),
  marchwardensSword: stat('marchwardensSword', "Marchwarden's Sword", 'weapon', 'attack', 2),
  swordOfTheFirstField: stat('swordOfTheFirstField', 'Sword of the First Field', 'weapon', 'attack', 3),
  yeomansBuckler: stat('yeomansBuckler', "Yeoman's Buckler", 'shield', 'defense', 1),
  kiteOfTheOldWall: stat('kiteOfTheOldWall', 'Kite of the Old Wall', 'shield', 'defense', 2),
  aegisOfTheKeptOath: stat('aegisOfTheKeptOath', 'Aegis of the Kept Oath', 'shield', 'defense', 3),
  circletOfSmallRites: stat('circletOfSmallRites', 'Circlet of Small Rites', 'head', 'spellPower', 1),
  hoodOfTheHedgeMage: stat('hoodOfTheHedgeMage', 'Hood of the Hedge-Mage', 'head', 'spellPower', 2),
  crownOfThePatternedSky: stat('crownOfThePatternedSky', 'Crown of the Patterned Sky', 'head', 'spellPower', 3),
  chapbookLocket: stat('chapbookLocket', 'Chapbook Locket', 'amulet', 'knowledge', 1),
  reliquaryPendant: stat('reliquaryPendant', 'Reliquary Pendant', 'amulet', 'knowledge', 2),
  deepWellAmulet: stat('deepWellAmulet', 'The Deep Well Amulet', 'amulet', 'knowledge', 3),
  quiltedCoat: stat('quiltedCoat', 'Quilted Coat', 'armor', 'defense', 1),
  lamellarOfTheMarches: artifact(
    'lamellarOfTheMarches', 'Lamellar of the Marches', 'armor', 'vanilla',
    '+1 attack and +1 defense.', ['primary_stat'], { attack: 1, defense: 1 },
  ),
  panoplyOfTheGreyKeep: artifact(
    'panoplyOfTheGreyKeep', 'Panoply of the Grey Keep', 'armor', 'vanilla',
    '+2 attack and +2 defense.', ['primary_stat'], { attack: 2, defense: 2 },
  ),
  travelersCloak: artifact('travelersCloak', "Traveler's Cloak", 'cloak', 'vanilla', '+150 move/day.', ['daily_move'], { amount: 150 }),
  wayfarersMantle: artifact('wayfarersMantle', "Wayfarer's Mantle", 'cloak', 'vanilla', '+300 move/day.', ['daily_move'], { amount: 300 }),
  cloakOfTheOpenRoad: artifact('cloakOfTheOpenRoad', 'Cloak of the Open Road', 'cloak', 'vanilla', '+500 move/day.', ['daily_move'], { amount: 500 }),
  cobblersPride: artifact('cobblersPride', "Cobbler's Pride", 'boots', 'vanilla', '+150 move/day.', ['daily_move'], { amount: 150 }),
  bootsOfTheDrover: artifact('bootsOfTheDrover', 'Boots of the Drover', 'boots', 'vanilla', '+300 move/day.', ['daily_move'], { amount: 300 }),
  sevenLeagueBoots: artifact('sevenLeagueBoots', 'Seven-League Boots', 'boots', 'vanilla', '+600 move/day.', ['daily_move'], { amount: 600 }),
  ringOfSmallMendings: artifact('ringOfSmallMendings', 'Ring of Small Mendings', 'ring', 'vanilla', '+2 mana/day.', ['daily_mana'], { amount: 2 }),
  ringOfTheSteadyHand: artifact('ringOfTheSteadyHand', 'Ring of the Steady Hand', 'ring', 'vanilla', '+1 luck.', ['luck'], { amount: 1 }),
  ringOfTheLongVigil: artifact('ringOfTheLongVigil', 'Ring of the Long Vigil', 'ring', 'vanilla', '+4 mana/day.', ['daily_mana'], { amount: 4 }),

  falconersGlove: artifact('falconersGlove', "Falconer's Glove", 'misc', 'charm', 'Exact guardian counts at two tiles.', ['scouting'], { amount: 2 }),
  whetstoneOfTheClans: artifact('whetstoneOfTheClans', "Whetstone of the Clans", 'misc', 'charm', 'Beast stacks gain +1 speed.', ['beast_speed'], { amount: 1 }),
  tinkersSpectacles: artifact('tinkersSpectacles', "Tinker's Spectacles", 'head', 'charm', 'See guardian drops before battle.', ['reveal_drops']),
  quietHorseshoe: artifact('quietHorseshoe', 'The Quiet Horseshoe', 'misc', 'charm', 'Guardians at 25% power flee.', ['weak_guardians_flee'], { percent: 25 }),
  standardBearersBaldric: artifact('standardBearersBaldric', "Standard-Bearer's Baldric", 'cloak', 'charm', '+3 morale each round.', ['round_meter'], { amount: 3 }),
  saltCrustedCompass: artifact('saltCrustedCompass', 'Salt-Crusted Compass', 'amulet', 'charm', 'See Trade Goods values; goods are worth +25%.', ['trade_goods'], { percent: 25 }),
  gravebindersSash: artifact('gravebindersSash', "Gravebinder's Sash", 'cloak', 'charm', 'Hex applications gain +1.', ['hex_application'], { amount: 1 }),
  forgeAshGauntlets: artifact('forgeAshGauntlets', 'Forge-Ash Gauntlets', 'misc', 'charm', 'Burn applications gain +1.', ['burn_application'], { amount: 1 }),
  beeCharmersVeil: artifact('beeCharmersVeil', "The Bee-Charmer's Veil", 'head', 'charm', 'Natural battlefield tiles cost nothing.', ['ignore_natural_tiles']),
  purseOfThePrudentToad: artifact('purseOfThePrudentToad', 'Purse of the Prudent Toad', 'misc', 'charm', '+200 gold/day.', ['daily_gold'], { amount: 200 }),
  chalkmastersRing: artifact('chalkmastersRing', "Chalkmaster's Ring", 'ring', 'charm', 'Wall of the Maker creates one extra hex.', ['extra_wall'], { amount: 1 }),
  secondQuiver: artifact('secondQuiver', 'The Second Quiver', 'misc', 'charm', 'Ranged stacks gain +6 shots.', ['extra_shots'], { amount: 6 }),

  sunderedHourglass: artifact('sunderedHourglass', 'The Sundered Hourglass', 'amulet', 'relic', 'Cast twice on even rounds.', ['double_cast_even_rounds']),
  longestCandle: artifact('longestCandle', 'The Longest Candle', 'misc', 'relic', 'First destroyed ally returns at 25%.', ['revive_first_stack'], { percent: 25 }),
  crookedDistaff: artifact('crookedDistaff', 'The Crooked Distaff', 'weapon', 'relic', 'Enemy luck −2.', ['enemy_luck'], { amount: 2 }),
  bannerOfTheFirstField: artifact('bannerOfTheFirstField', 'Banner of the First Field', 'cloak', 'relic', 'Morale triggers at 80.', ['meter_threshold'], { amount: 80 }),
  patchworkStandard: artifact('patchworkStandard', 'The Patchwork Standard', 'cloak', 'relic', 'No mixed-faction penalty; +5 morale per faction.', ['mixed_faction_meter'], { amount: 5 }),
  seamstone: artifact('seamstone', 'Seamstone', 'amulet', 'relic', 'Battles use the school chosen when equipped.', ['chosen_resonance']),
  mirrorshardPendant: artifact('mirrorshardPendant', 'Mirrorshard Pendant', 'amulet', 'relic', 'Reflect the first enemy spell.', ['reflect_first_spell']),
  bellsClapper: artifact('bellsClapper', "The Bell's Clapper", 'weapon', 'relic', 'Once per battle set every company’s morale to zero.', ['reset_meters']),
  queensAmber: artifact('queensAmber', "Queen's Amber", 'ring', 'relic', 'Tier-one dwelling growth +50%.', ['tier_one_growth'], { percent: 50 }),
  wolfMothersTorc: artifact('wolfMothersTorc', "Wolf-Mother's Torc", 'amulet', 'relic', 'Beasts retaliate twice.', ['double_beast_retaliation']),
  hornOfTheBroadWorld: artifact('hornOfTheBroadWorld', 'Horn of the Broad World', 'misc', 'relic', 'Largest stack doubles size for one attack.', ['double_largest_attack']),
  toyKnightsHeart: artifact('toyKnightsHeart', "The Toy Knight's Heart", 'misc', 'relic', 'One construct returns once at 50%.', ['unfinished_vow']),

  tailorsNeedle: artifact('tailorsNeedle', 'The Needle', 'weapon', 'kit', '+2 attack.', ['primary_stat', 'kit_piece'], { attack: 2 }),
  goldenThread: artifact('goldenThread', 'The Golden Thread', 'amulet', 'kit', '+2 spell power.', ['primary_stat', 'kit_piece'], { spellPower: 2 }),
  tailorsThimble: artifact('tailorsThimble', 'The Thimble', 'ring', 'kit', '+2 defense.', ['primary_stat', 'kit_piece'], { defense: 2 }),
  patternbook: artifact('patternbook', 'The Patternbook', 'misc', 'kit', '+2 knowledge.', ['primary_stat', 'kit_piece'], { knowledge: 2 }),

  knucklebonesOfTheSaint: artifact('knucklebonesOfTheSaint', 'Knucklebones of the Saint', 'misc', 'trinket', '+1 luck.', ['luck'], { amount: 1 }),
  drumOfTheDeepGrass: artifact('drumOfTheDeepGrass', 'Drum of the Deep Grass', 'misc', 'trinket', '+5 morale each round.', ['round_meter'], { amount: 5 }),
  censerOfStillness: artifact('censerOfStillness', 'Censer of Stillness', 'misc', 'trinket', "Enemy hero's first spell costs +3 mana.", ['first_spell_tax'], { amount: 3 }),
  pocketSundial: artifact('pocketSundial', 'Pocket Sundial', 'misc', 'trinket', 'May cast before the first stack acts.', ['prebattle_cast']),
  ironNail: artifact('ironNail', 'Iron Nail', 'misc', 'trinket', 'The first enemy ability application fizzles; then spent.', ['negate_first_ability']),
  mirrorMask: artifact('mirrorMask', 'The Mirror Mask', 'misc', 'trinket', 'Enemy melee attackers take 20% of dealt damage.', ['melee_reflect'], { percent: 20 }),

  sashOfTheLeviedMile: artifact('sashOfTheLeviedMile', 'Sash of the Levied Mile', 'misc', 'vanilla', '+1 attack and +150 move/day.', ['primary_stat', 'daily_move'], { attack: 1, amount: 150 }),
  scribesCuff: artifact('scribesCuff', "Scribe's Cuff", 'misc', 'vanilla', '+1 spell power and +1 knowledge.', ['primary_stat'], { spellPower: 1, knowledge: 1 }),
  captainsWeathercoat: artifact('captainsWeathercoat', "Captain's Weathercoat", 'cloak', 'vanilla', '+1 attack and +1 defense.', ['primary_stat'], { attack: 1, defense: 1 }),
  lanternScholarsCap: artifact('lanternScholarsCap', "Lantern-Scholar's Cap", 'head', 'vanilla', '+1 spell power and +2 mana/day.', ['primary_stat', 'daily_mana'], { spellPower: 1, amount: 2 }),
  pilgrimsBelt: artifact('pilgrimsBelt', "Pilgrim's Belt", 'misc', 'vanilla', '+1 defense and +150 move/day.', ['primary_stat', 'daily_move'], { defense: 1, amount: 150 }),
  surveyorsBoots: artifact('surveyorsBoots', "Surveyor's Boots", 'boots', 'vanilla', '+1 knowledge and +150 move/day.', ['primary_stat', 'daily_move'], { knowledge: 1, amount: 150 }),
  fieldClerksSeal: artifact('fieldClerksSeal', "Field-Clerk's Seal", 'ring', 'vanilla', '+1 attack and +1 knowledge.', ['primary_stat'], { attack: 1, knowledge: 1 }),
  ashwoodBracer: artifact('ashwoodBracer', 'Ashwood Bracer', 'shield', 'vanilla', '+1 defense and +1 spell power.', ['primary_stat'], { defense: 1, spellPower: 1 }),
  quietWard: artifact('quietWard', 'The Quiet Ward', 'amulet', 'vanilla', '+2 defense and +1 knowledge.', ['primary_stat'], { defense: 2, knowledge: 1 }),
  marchGlass: artifact('marchGlass', 'The March Glass', 'amulet', 'vanilla', '+2 spell power and +1 attack.', ['primary_stat'], { spellPower: 2, attack: 1 }),
  keepersHalfCloak: artifact('keepersHalfCloak', "Keeper's Half-Cloak", 'cloak', 'vanilla', '+2 defense and +300 move/day.', ['primary_stat', 'daily_move'], { defense: 2, amount: 300 }),
  mendersGorget: artifact('mendersGorget', "Mender's Gorget", 'armor', 'vanilla', '+1 to all primary stats.', ['primary_stat'], { attack: 1, defense: 1, spellPower: 1, knowledge: 1 }),

  gauntletSecondThrow: artifact('gauntletSecondThrow', 'Gauntlet of the Second Throw', 'misc', 'charm', 'The first Gale or push each battle moves +1 hex.', ['push_bonus']),
  candleSnuffersRing: artifact('candleSnuffersRing', "Candle-Snuffer's Ring", 'ring', 'charm', 'Enemy death triggers have −1 magnitude.', ['reduce_enemy_death']),
  fairScale: artifact('fairScale', 'The Fair Scale', 'misc', 'charm', 'Marketplace rates match Peddler rank 1.', ['peddler_rates']),
  droversCrook: artifact('droversCrook', "Drover's Crook", 'weapon', 'charm', 'Tier 1–2 stacks gain +1 speed.', ['low_tier_speed'], { amount: 1 }),
  hexKeepersLocket: artifact('hexKeepersLocket', "Hex-Keeper's Locket", 'amulet', 'charm', 'Your Hex effects last +1 turn.', ['hex_duration'], { amount: 1 }),
  thirdBoot: artifact('thirdBoot', 'The Third Boot', 'boots', 'charm', 'Ignore the first guardian aggro trigger each day.', ['ignore_first_aggro']),
  bellMetalTorque: artifact('bellMetalTorque', 'Bell-Metal Torque', 'amulet', 'charm', 'Your morale drains 50% less.', ['reduced_meter_drain'], { percent: 50 }),
  unsentLetter: artifact('unsentLetter', 'The Unsent Letter', 'misc', 'charm', 'Unfinished units in your army gain +2 attack and defense.', ['unfinished_stats'], { amount: 2 }),
  mothEatenMap: artifact('mothEatenMap', 'Moth-Eaten Map', 'misc', 'charm', 'Patient Stones reveal one extra fragment.', ['patient_fragment']),
  spareFace: artifact('spareFace', 'The Spare Face', 'head', 'charm', 'Cast False Colors free once per week.', ['free_false_colors']),

  longSpoon: artifact('longSpoon', 'The Long Spoon', 'weapon', 'relic', 'Once per battle, consume one counter pile and gain five morale per counter.', ['eat_counter']),
  firstDrum: artifact('firstDrum', 'The First Drum', 'misc', 'relic', 'Round-start morale gains double in rounds 1–2.', ['early_double_meter'], { amount: 1 }),
  crownHollowTown: artifact('crownHollowTown', 'Crown of the Hollow Town', 'head', 'relic', 'See neutral garrisons map-wide; captured vaults are doubled.', ['neutral_town_intel']),
  weathercockIllOmen: artifact('weathercockIllOmen', 'Weathercock of Ill Omen', 'misc', 'relic', 'Choose which omen Fickle Weather offers.', ['choose_fickle_omen']),
  seamRipper: artifact('seamRipper', 'The Seam-Ripper', 'weapon', 'relic', 'On seams, only your spells receive all-school resonance.', ['owner_only_seam']),
  lastToy: artifact('lastToy', 'The Last Toy', 'misc', 'relic', 'Your last stack survives destruction at one unit once per battle.', ['last_stack_survives']),

  leadenCrown: { ...artifact('leadenCrown', 'Leaden Crown', 'head', 'burden', '+3 spell power; −25% movement.', ['primary_stat', 'daily_move'], { spellPower: 3, percent: -25 }), burdenRemoval: 'Visit any shrine and pay 5 essence.' },
  hungryBlade: { ...artifact('hungryBlade', 'The Hungry Blade', 'weapon', 'burden', '+4 attack; after each battle it eats 5% of your largest stack.', ['primary_stat', 'post_battle_stack_loss'], { attack: 4, percent: 5 }), burdenRemoval: 'Defeat any puzzle-lock while wielding it.' },
  beggarsRing: { ...artifact('beggarsRing', "Beggar's Ring", 'ring', 'burden', 'Luck +2; all prices against you ×1.5.', ['luck', 'price_penalty'], { amount: 2, percent: 50 }), burdenRemoval: 'Throw 5000 gold into a Wishing Well.' },
  patternlessCoat: { ...artifact('patternlessCoat', 'The Patternless Coat', 'armor', 'burden', '+3 defense; your spells always use their Standard rules.', ['primary_stat', 'spell_plus_block'], { defense: 3 }), burdenRemoval: 'Trade it at the Reliquary Cairn.' },
};

/** Catalog-derived installed batch; later collectible batches append their own class coverage. */
export const VANILLA_ARTIFACT_IDS = (Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'vanilla')
  .map((artifact) => artifact.id)) as readonly ArtifactId[];

export const CHARM_ARTIFACT_IDS = (Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'charm')
  .map((artifact) => artifact.id)) as readonly ArtifactId[];

export const RELIC_ARTIFACT_IDS = (Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'relic')
  .map((artifact) => artifact.id)) as readonly ArtifactId[];

/** Catalog-derived native sprite coverage; later classes append without changing earlier sets. */
export const INSTALLED_ARTIFACT_IDS = [
  ...VANILLA_ARTIFACT_IDS, ...CHARM_ARTIFACT_IDS, ...RELIC_ARTIFACT_IDS,
] as readonly ArtifactId[];

export const EQUIPMENT_SLOTS: readonly EquipmentSlotId[] = [
  'head', 'cloak', 'amulet', 'weapon', 'shield', 'armor',
  'ring1', 'ring2', 'boots', 'misc1', 'misc2',
];

export const KIT_PIECES: readonly ArtifactId[] = [
  'tailorsNeedle', 'goldenThread', 'tailorsThimble', 'patternbook',
];

export function slotAccepts(slot: EquipmentSlotId, artifactSlot: ArtifactSlot): boolean {
  return slot === artifactSlot
    || (artifactSlot === 'ring' && (slot === 'ring1' || slot === 'ring2'))
    || (artifactSlot === 'misc' && (slot === 'misc1' || slot === 'misc2'));
}

export function validateArtifacts(): void {
  const definitions = Object.values(ARTIFACTS);
  const count = (artifactClass: ArtifactClass) =>
    definitions.filter((item) => item.class === artifactClass).length;
  if (definitions.some((item) => !item.name || !item.flavor.trim() || !item.description)) {
    throw new Error('Artifact catalog contains an incomplete definition');
  }
  if (count('vanilla') !== 36 || count('charm') !== 22
      || count('relic') !== 18 || count('burden') !== 4
      || count('kit') !== 4 || count('trinket') !== 6
      || definitions.filter((item) => !['kit', 'trinket'].includes(item.class)).length !== 80) {
    throw new Error('Artifact catalog count mismatch');
  }
}
