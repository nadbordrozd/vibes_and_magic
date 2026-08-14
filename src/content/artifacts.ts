import type {
  ArtifactId, ArtifactSlot, EquipmentSlotId, PrimaryStat,
} from '../core/types';
import { artifactFlavor } from './flavor';
import type { ArtifactEffectMetadata, V2ArtifactEffectTag } from './v2/schema';
import type { ArtifactSetDefinition } from './v2/schema';
import { validateArtifactV2Schemas } from './v2/validation';
import { ensureArtifactEffectHandlersRegistered } from './v2/artifactEffectHandlers';
import { validateContentAssets } from './v2/assets';
import type { ContentAssetRequirement, ContentAssetMode } from './v2/schema';
import { ARTIFACT_SPRITE_SUBJECTS } from '../../assets/adventureSpriteInventory';

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
  | 'price_penalty' | 'spell_plus_block' | 'post_battle_stack_loss'
  | V2ArtifactEffectTag;

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
  burdenRemovalTrigger?:
    | 'hedge-school-spell' | 'own-city-battle' | 'no-cast-win' | 'mage-guild-5'
    | 'flawless-battle' | 'seven-city-days' | 'marketplace-payment'
    | 'equal-level-hero' | 'tier-five-spell';
  setId?: string;
  effectMetadata?: Partial<Record<ArtifactEffectTag, ArtifactEffectMetadata>>;
}

const artifact = (
  id: ArtifactId, name: string, slot: ArtifactSlot, artifactClass: ArtifactClass,
  description: string, effects: ArtifactEffectTag[] = [],
  values?: ArtifactDefinition['values'],
): ArtifactDefinition => ({
  id, name, flavor: artifactFlavor(name), slot, class: artifactClass, description, effects, values,
});

const V2_EFFECT_STAGES: Readonly<Partial<Record<V2ArtifactEffectTag, string>>> = {
  burn_no_decay: 'turn-advance', counter_scaling: 'apply', impact_bonus: 'damage-computation',
  hex_cap: 'apply', created_hex_bonus: 'tile-registry', heal_bonus: 'apply',
  control_duration: 'ownership-resolution', death_mana: 'death-triggers', summon_bonus: 'apply',
  store_spell: 'hero-act', extra_spell_target: 'target-selection', free_first_spell: 'declare',
  round_one_double_cast: 'hero-act', owner_only_resonance: 'declare',
  random_counter_double: 'turn-advance', enchantment_protection: 'apply',
  enchantment_slots: 'declare', no_consumables: 'hero-act', visible_position: 'adventure-apply',
  mana_cost_reduction: 'declare', no_round_one_cast: 'declare', always_upgraded: 'declare',
  max_mana_penalty: 'declare',
  mountain_step: 'adventure-apply', water_strait: 'adventure-apply',
  return_to_day_start: 'adventure-apply', weekly_marker_teleport: 'adventure-apply',
  movement_carry: 'adventure-apply', object_compass: 'adventure-apply',
  guarded_reward_skip: 'adventure-apply', remote_transfer: 'adventure-apply',
  direct_exchange: 'adventure-apply', weekly_double_build: 'adventure-apply',
  gold_debt: 'adventure-apply', spend_refund: 'adventure-apply',
  dwelling_growth_choice: 'adventure-apply', lost_mine_income: 'adventure-apply',
  least_resource_income: 'adventure-apply', borrow_nearby_spell: 'declare',
  low_tier_free_casting: 'declare', seeded_prebattle_spell: 'declare',
  double_first_summon: 'apply', spell_deflect: 'target-selection',
  enemy_round_one_silence: 'declare', friendly_counter_no_decay: 'turn-advance',
  army_slot_bonus: 'adventure-apply', free_deployment: 'declare',
  inherit_destroyed_stats: 'death-triggers', proportionality_size: 'death-triggers',
  chill_retaliation_block: 'retaliation', faction_grudge_damage: 'damage-computation',
  forced_move_ward: 'apply', exact_hero_count_stats: 'declare',
  weekly_backpack_copy: 'adventure-apply', primary_stat_move: 'declare',
  debt_slot_bonus: 'adventure-apply', income_multiplier: 'adventure-apply',
  odd_day_build_block: 'adventure-apply', city_entry_block: 'adventure-apply',
  knack_block: 'hero-act', artifact_set_bonus: 'declare',
};

function withV2Metadata(definition: ArtifactDefinition): ArtifactDefinition {
  const metadata = Object.fromEntries(definition.effects.flatMap((effect) => {
    const stage = V2_EFFECT_STAGES[effect as V2ArtifactEffectTag];
    return stage ? [[effect, { handlerId: effect as V2ArtifactEffectTag, stage }]] : [];
  }));
  return Object.keys(metadata).length ? { ...definition, effectMetadata: metadata } : definition;
}

const v2Artifact = (
  id: ArtifactId, name: string, slot: ArtifactSlot, artifactClass: ArtifactClass,
  description: string, effects: ArtifactEffectTag[], values?: ArtifactDefinition['values'],
  burdenRemoval?: string,
  burdenRemovalTrigger?: ArtifactDefinition['burdenRemovalTrigger'],
): ArtifactDefinition => ({
  ...withV2Metadata(artifact(id, name, slot, artifactClass, description, effects, values)),
  ...(burdenRemoval ? { burdenRemoval } : {}),
  ...(burdenRemovalTrigger ? { burdenRemovalTrigger } : {}),
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

  bellows: v2Artifact('bellows', 'The Bellows', 'misc', 'charm',
    'Your Burn counters do not decay at turn end.', ['burn_no_decay']),
  ninePipCord: v2Artifact('ninePipCord', 'The Nine-Pip Cord', 'amulet', 'charm',
    'Counter magnitude scaling is +1 per 3 Spell Power instead of per 5.', ['counter_scaling'], { amount: 3 }),
  ashCenser: v2Artifact('ashCenser', 'Ash Censer', 'misc', 'charm',
    'Your impact spells deal +4 damage per point of Spell Power.', ['impact_bonus'], { amount: 4 }),
  sappersChalk: v2Artifact('sappersChalk', "Sapper's Chalk", 'ring', 'charm',
    'Wall and undergrowth hexes you create are +2 in number and last the whole battle.', ['created_hex_bonus'], { amount: 2 }),
  loomSmallRepairs: v2Artifact('loomSmallRepairs', 'Loom of Small Repairs', 'misc', 'charm',
    'Healing and resurrection you cast restore 50% more.', ['heal_bonus'], { percent: 50 }),
  puppeteersThimble: v2Artifact('puppeteersThimble', "Puppeteer's Thimble", 'ring', 'charm',
    'Mind control you cast lasts one extra round, and the returned company keeps its counters.', ['control_duration'], { amount: 1 }),
  quietLedger: v2Artifact('quietLedger', 'The Quiet Ledger', 'cloak', 'charm',
    'The first time each battle one of your companies is destroyed, your hero gains 6 mana.', ['death_mana'], { amount: 6 }),
  beastCallersCord: v2Artifact('beastCallersCord', "Beast-Caller's Cord", 'misc', 'charm',
    'Companies you summon arrive with +1 speed and Bloom 2.', ['summon_bonus'], { amount: 1 }),

  emptyReliquary: v2Artifact('emptyReliquary', 'Empty Reliquary', 'misc', 'relic',
    'Spend a hero act to store one spell you cast; release it later without consuming a hero act.', ['store_spell']),
  crackedPrism: v2Artifact('crackedPrism', 'The Cracked Prism', 'head', 'relic',
    'Single-target spells may choose a second legal target at half magnitude.', ['extra_spell_target'], { percent: 50 }),
  secondSunrise: v2Artifact('secondSunrise', 'The Second Sunrise', 'amulet', 'relic',
    'The first spell you cast each battle costs no mana.', ['free_first_spell']),
  hexwrightsTally: v2Artifact('hexwrightsTally', "Hexwright's Tally", 'ring', 'relic',
    'Hex counters you apply to enemies cap at 15 instead of 9.', ['hex_cap'], { amount: 15 }),
  graftedHand: v2Artifact('graftedHand', 'The Grafted Hand', 'weapon', 'relic',
    'You may cast twice in round one.', ['round_one_double_cast']),
  discordantFork: v2Artifact('discordantFork', 'Discordant Fork', 'amulet', 'relic',
    'On a resonant battlefield, resonance applies only to your side.', ['owner_only_resonance']),
  whistlingKettle: v2Artifact('whistlingKettle', 'The Whistling Kettle', 'misc', 'relic',
    'At each round start, one enemy counter pile doubles, chosen deterministically.', ['random_counter_double']),
  tuningPeg: v2Artifact('tuningPeg', 'The Tuning Peg', 'boots', 'relic',
    'Your enchantments resist Sour and Standard Unmake, and you may hold three.',
    ['enchantment_protection', 'enchantment_slots'], { amount: 3 }),

  greedyGrimoire: v2Artifact('greedyGrimoire', 'The Greedy Grimoire', 'misc', 'burden',
    '+6 Spell Power. Your hero cannot use consumables.', ['primary_stat', 'no_consumables'],
    { spellPower: 6 }, 'Teach a spell at a Hedge School.', 'hedge-school-spell'),
  loudBell: v2Artifact('loudBell', 'The Loud Bell', 'cloak', 'burden',
    '+4 Knowledge. Every enemy player permanently sees this hero\'s position.', ['primary_stat', 'visible_position'],
    { knowledge: 4 }, 'Fight a battle inside one of your own cities.', 'own-city-battle'),
  ironTongue: v2Artifact('ironTongue', 'The Iron Tongue', 'amulet', 'burden',
    'Your spells cost 2 less mana. You cannot cast in round one.', ['mana_cost_reduction', 'no_round_one_cast'],
    { amount: 2 }, 'Win a battle without casting a spell.', 'no-cast-win'),
  splitReed: v2Artifact('splitReed', 'The Split Reed', 'weapon', 'burden',
    'Your spells always use Upgraded rules. Your maximum mana is halved.', ['always_upgraded', 'max_mana_penalty'],
    { percent: 50 }, 'Complete a Mage Guild 5.', 'mage-guild-5'),

  longLadder: v2Artifact('longLadder', 'The Long Ladder', 'boots', 'relic',
    'Once per day, cross one Mountain tile as if it were Meadow.', ['mountain_step']),
  ferrymansLantern: v2Artifact('ferrymansLantern', "Ferryman's Lantern", 'misc', 'relic',
    'Cross up to three consecutive Water tiles without a boat; a fourth is illegal.', ['water_strait'], { amount: 3 }),
  backwardBoot: v2Artifact('backwardBoot', 'The Backward Boot', 'boots', 'charm',
    'Once per day, return freely to this hero\'s day-start tile.', ['return_to_day_start']),
  milestoneStone: v2Artifact('milestoneStone', 'Milestone Stone', 'misc', 'relic',
    'Plant a marker on your tile; once per week teleport to it from anywhere.', ['weekly_marker_teleport']),
  cartwrightsWheel: v2Artifact('cartwrightsWheel', "Cartwright's Wheel", 'misc', 'relic',
    'Unspent movement carries into tomorrow, up to one full daily pool.', ['movement_carry']),
  patientCompass: v2Artifact('patientCompass', 'The Patient Compass', 'amulet', 'charm',
    'Choose an object kind when equipped; reveal and point to its nearest unvisited instance.', ['object_compass']),
  hollowKey: v2Artifact('hollowKey', 'The Hollow Key', 'ring', 'relic',
    'Once per week, collect one guarded reward without fighting; the guardian remains.', ['guarded_reward_skip']),
  crowsErrand: v2Artifact('crowsErrand', "Crow's Errand", 'cloak', 'charm',
    'Once per day, send one artifact or one army company to another owned hero.', ['remote_transfer']),

  misersThumb: v2Artifact('misersThumb', "Miser's Thumb", 'ring', 'relic',
    'Exchange one resource directly for another at 2:1 at a Marketplace.', ['direct_exchange']),
  foundersTrowel: v2Artifact('foundersTrowel', "The Founder's Trowel", 'misc', 'relic',
    'On week day 1, one owned city may construct a second building.', ['weekly_double_build']),
  borrowedPurse: v2Artifact('borrowedPurse', 'The Borrowed Purse', 'misc', 'charm',
    'Gold may fall to -2000; at week start repay the debt with 25% interest before income.', ['gold_debt'], { amount: 2000, percent: 25 }),
  titheBox: v2Artifact('titheBox', 'Tithe Box', 'misc', 'charm',
    'Refund 10% of all gold spent at week end.', ['spend_refund'], { percent: 10 }),
  growingLedger: v2Artifact('growingLedger', 'The Growing Ledger', 'amulet', 'relic',
    'Choose a dwelling tier when equipped; it grows 50% faster in every owned city.', ['dwelling_growth_choice'], { percent: 50 }),
  saltSack: v2Artifact('saltSack', 'The Salt Sack', 'cloak', 'charm',
    'A mine you lose keeps paying you for three more days.', ['lost_mine_income'], { amount: 3 }),
  tallystick: v2Artifact('tallystick', 'The Tallystick', 'misc', 'charm',
    'Each day gain 1 of the resource you currently hold least of.', ['least_resource_income'], { amount: 1 }),

  spareTongue: v2Artifact('spareTongue', 'The Spare Tongue', 'head', 'relic',
    'Cast spells known by another owned hero within five tiles at half Spell Power.', ['borrow_nearby_spell'], { amount: 5, percent: 50 }),
  paupersGrimoire: v2Artifact('paupersGrimoire', "The Pauper's Grimoire", 'misc', 'relic',
    'Spells cost no mana, but only tier 1 and tier 2 spells may be cast.', ['low_tier_free_casting'], { amount: 2 }),
  waxSealedEnvelope: v2Artifact('waxSealedEnvelope', 'Wax-Sealed Envelope', 'misc', 'relic',
    'At battle start, one spell from your book is cast free, derived from the battle seed.', ['seeded_prebattle_spell']),
  nestingDoll: v2Artifact('nestingDoll', 'The Nesting Doll', 'misc', 'relic',
    'The first company you summon each battle summons a second at half count.', ['double_first_summon'], { percent: 50 }),
  mirrorbackCloak: v2Artifact('mirrorbackCloak', 'Mirrorback Cloak', 'cloak', 'relic',
    'The first hostile targeted spell each battle is deflected to a legal company on its caster\'s side.', ['spell_deflect']),
  quietBell: v2Artifact('quietBell', 'The Quiet Bell', 'amulet', 'charm',
    'Enemy heroes cannot cast in round one.', ['enemy_round_one_silence']),
  ninthPip: v2Artifact('ninthPip', 'The Ninth Pip', 'ring', 'relic',
    'Counters on your companies do not decay at turn end.', ['friendly_counter_no_decay']),

  longTable: v2Artifact('longTable', 'The Long Table', 'misc', 'relic',
    'This hero fields one additional army company, to the shared maximum of nine.', ['army_slot_bonus'], { amount: 1 }),
  oddBoot: v2Artifact('oddBoot', 'The Odd Boot', 'boots', 'charm',
    'Choose one company to deploy anywhere on your half of the battlefield.', ['free_deployment']),
  handMeDownArmor: v2Artifact('handMeDownArmor', 'Hand-Me-Down Armor', 'armor', 'relic',
    'After an allied company is destroyed, the next allied company to act inherits its Attack and Defense.', ['inherit_destroyed_stats']),
  regimentalColors: v2Artifact('regimentalColors', 'The Regimental Colors', 'cloak', 'charm',
    'Your smallest company counts triple for morale and destruction proportionality only.', ['proportionality_size'], { amount: 3 }),
  crackedWhistle: v2Artifact('crackedWhistle', 'The Cracked Whistle', 'misc', 'charm',
    'Enemy companies with Chill 3 or more cannot retaliate.', ['chill_retaliation_block'], { amount: 3 }),
  grudgeBook: v2Artifact('grudgeBook', 'The Grudge Book', 'misc', 'charm',
    'Deal 2% more damage per prior battle against that faction, to a maximum of 30%.', ['faction_grudge_damage'], { amount: 2, percent: 30 }),
  deadmansWedge: v2Artifact('deadmansWedge', "Deadman's Wedge", 'shield', 'charm',
    'The first forced move of one of your companies each battle is prevented.', ['forced_move_ward']),

  twinCoin: v2Artifact('twinCoin', 'The Twin Coin', 'amulet', 'relic',
    'Exactly two owned heroes gives each +2 all primary stats; three or more gives each -1.', ['exact_hero_count_stats']),
  emptyFrame: v2Artifact('emptyFrame', 'The Empty Frame', 'misc', 'relic',
    'At week start, become a seed-derived copy of a random artifact in this hero\'s backpack.', ['weekly_backpack_copy']),
  secondFace: v2Artifact('secondFace', 'The Second Face', 'head', 'charm',
    'Once per week, permanently move one primary-stat point to another.', ['primary_stat_move']),
  debtLedger: v2Artifact('debtLedger', 'The Debt Ledger', 'misc', 'relic',
    'This hero may carry a third Debt; each active Debt grants +2 to every primary stat.', ['debt_slot_bonus'], { amount: 2 }),

  gluttonsBit: v2Artifact('gluttonsBit', "The Glutton's Bit", 'weapon', 'burden',
    '+5 Attack. After every battle, the largest company loses 10% of its units.', ['primary_stat', 'post_battle_stack_loss'],
    { attack: 5, percent: 10 }, 'Win a battle without losing a single unit.', 'flawless-battle'),
  sleeplessCrown: v2Artifact('sleeplessCrown', 'The Sleepless Crown', 'head', 'burden',
    '+4 Knowledge and +4 Spell Power. Daily movement is halved.', ['primary_stat', 'daily_move'],
    { knowledge: 4, spellPower: 4, percent: -50 }, 'Spend seven consecutive days inside one city.', 'seven-city-days'),
  openPurse: v2Artifact('openPurse', 'The Open Purse', 'misc', 'burden',
    'All income is doubled. No city may build on odd-numbered days.', ['income_multiplier', 'odd_day_build_block'],
    { amount: 2 }, 'Pay 10,000 gold at a Marketplace.', 'marketplace-payment'),
  faithfulHound: v2Artifact('faithfulHound', 'The Faithful Hound', 'misc', 'burden',
    '+3 to every primary stat. This hero cannot enter a city.', ['primary_stat', 'city_entry_block'],
    { attack: 3, defense: 3, spellPower: 3, knowledge: 3 }, 'Defeat an enemy hero of equal or higher level.', 'equal-level-hero'),
  rustedTongue: v2Artifact('rustedTongue', 'The Rusted Tongue', 'amulet', 'burden',
    'Spells cost 3 less mana. This hero cannot use a Faction Knack.', ['mana_cost_reduction', 'knack_block'],
    { amount: 3 }, 'Learn a tier-5 spell.', 'tier-five-spell'),
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

export const BURDEN_ARTIFACT_IDS = (Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'burden')
  .map((artifact) => artifact.id)) as readonly ArtifactId[];

export const KIT_ARTIFACT_IDS = (Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'kit')
  .map((artifact) => artifact.id)) as readonly ArtifactId[];

export const TRINKET_ARTIFACT_IDS = (Object.values(ARTIFACTS)
  .filter((artifact) => artifact.class === 'trinket')
  .map((artifact) => artifact.id)) as readonly ArtifactId[];

/** Catalog-derived complete native sprite coverage in published batch order. */
export const ARTIFACT_CATALOG_IDS = [
  ...VANILLA_ARTIFACT_IDS, ...CHARM_ARTIFACT_IDS, ...RELIC_ARTIFACT_IDS,
  ...BURDEN_ARTIFACT_IDS, ...KIT_ARTIFACT_IDS, ...TRINKET_ARTIFACT_IDS,
] as readonly ArtifactId[];

export const DOC63_ARTIFACT_IDS = [
  'bellows', 'ninePipCord', 'ashCenser', 'sappersChalk', 'loomSmallRepairs',
  'puppeteersThimble', 'quietLedger', 'beastCallersCord', 'emptyReliquary',
  'crackedPrism', 'secondSunrise', 'hexwrightsTally', 'graftedHand',
  'discordantFork', 'whistlingKettle', 'tuningPeg', 'greedyGrimoire',
  'loudBell', 'ironTongue', 'splitReed',
] as const satisfies readonly ArtifactId[];

export const DOC65_ARTIFACT_IDS = [
  'longLadder', 'ferrymansLantern', 'backwardBoot', 'milestoneStone', 'cartwrightsWheel',
  'patientCompass', 'hollowKey', 'crowsErrand', 'misersThumb', 'foundersTrowel',
  'borrowedPurse', 'titheBox', 'growingLedger', 'saltSack', 'tallystick', 'spareTongue',
  'paupersGrimoire', 'waxSealedEnvelope', 'nestingDoll', 'mirrorbackCloak', 'quietBell',
  'ninthPip', 'longTable', 'oddBoot', 'handMeDownArmor', 'regimentalColors',
  'crackedWhistle', 'grudgeBook', 'deadmansWedge', 'twinCoin', 'emptyFrame', 'secondFace',
  'debtLedger', 'gluttonsBit', 'sleeplessCrown', 'openPurse', 'faithfulHound', 'rustedTongue',
] as const satisfies readonly ArtifactId[];

/** Every canonical artifact has a distinct promoted native sprite. */
export const INSTALLED_ARTIFACT_IDS = ARTIFACT_CATALOG_IDS;
export const NATIVE_ARTIFACT_IDS = INSTALLED_ARTIFACT_IDS;

export const ARTIFACT_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] =
  [...DOC63_ARTIFACT_IDS, ...DOC65_ARTIFACT_IDS].map((id) => ({
    canonicalId: `artifact:${id}`, nativeAssetId: `map-object:artifact:${id}`,
    introducedBy: 'docs-60-67', accessibleName: ARTIFACTS[id].name,
    visualSubject: ARTIFACT_SPRITE_SUBJECTS[id],
    semantics: { family: 'artifact', artifactClass: ARTIFACTS[id].class,
      slot: ARTIFACTS[id].slot },
  }));

export function validateArtifactAssets(mode: ContentAssetMode): void {
  validateContentAssets(ARTIFACT_ASSET_REQUIREMENTS,
    new Set(ARTIFACT_ASSET_REQUIREMENTS.map((row) => row.nativeAssetId)), mode);
}

export const EQUIPMENT_SLOTS: readonly EquipmentSlotId[] = [
  'head', 'cloak', 'amulet', 'weapon', 'shield', 'armor',
  'ring1', 'ring2', 'boots', 'misc1', 'misc2', 'misc3',
];

export const KIT_PIECES: readonly ArtifactId[] = [
  'tailorsNeedle', 'goldenThread', 'tailorsThimble', 'patternbook',
];

export const ARTIFACT_SETS: Readonly<Record<string, ArtifactSetDefinition>> = Object.freeze({
  tinkersRounds: {
    id: 'tinkersRounds', name: "The Tinker's Rounds",
    memberIds: ['tinkersSpectacles', 'misersThumb', 'foundersTrowel'],
    bonuses: [
      { pieces: 2, effectTags: ['artifact_set_bonus'], description: 'Mage Guild inscription costs 2 essence instead of 4.' },
      { pieces: 3, effectTags: ['artifact_set_bonus'], description: 'Marketplace rates ×0.5 and the double-build exception applies every week day 1.' },
    ],
  },
  mournersSuit: {
    id: 'mournersSuit', name: "The Mourner's Suit",
    memberIds: ['gravebindersSash', 'candleSnuffersRing', 'longestCandle'],
    bonuses: [
      { pieces: 2, effectTags: ['artifact_set_bonus'], description: 'Your Hex counters do not decay.' },
      { pieces: 3, effectTags: ['artifact_set_bonus'], description: 'The first allied company destroyed returns at 50% instead of 25%.' },
    ],
  },
  droversKit: {
    id: 'droversKit', name: "The Drover's Kit",
    memberIds: ['droversCrook', 'whetstoneOfTheClans'],
    bonuses: [
      { pieces: 2, effectTags: ['artifact_set_bonus'], description: 'Beast companies gain +2 speed and the hero gains +200 movement per day.' },
    ],
  },
});

for (const set of Object.values(ARTIFACT_SETS)) for (const memberId of set.memberIds) {
  ARTIFACTS[memberId as ArtifactId].setId = set.id;
  const definition = ARTIFACTS[memberId as ArtifactId];
  if (!definition.effects.includes('artifact_set_bonus')) {
    definition.effects.push('artifact_set_bonus');
    definition.effectMetadata = { ...(definition.effectMetadata ?? {}), artifact_set_bonus: {
      handlerId: 'artifact_set_bonus', stage: 'declare',
    } };
  }
}

export function slotAccepts(slot: EquipmentSlotId, artifactSlot: ArtifactSlot): boolean {
  return slot === artifactSlot
    || (artifactSlot === 'ring' && (slot === 'ring1' || slot === 'ring2'))
    || (artifactSlot === 'misc' && (slot === 'misc1' || slot === 'misc2' || slot === 'misc3'));
}

export function validateArtifacts(): void {
  const definitions = Object.values(ARTIFACTS);
  const count = (artifactClass: ArtifactClass) =>
    definitions.filter((item) => item.class === artifactClass).length;
  if (definitions.some((item) => !item.name || !item.flavor.trim() || !item.description)) {
    throw new Error('Artifact catalog contains an incomplete definition');
  }
  if (definitions.some((item) => item.class === 'burden'
      && (!item.burdenRemoval?.trim() || (item.effectMetadata
        && !item.burdenRemovalTrigger)))) {
    throw new Error('Every v2 Burden needs a visible removal rule and executable trigger');
  }
  if (count('vanilla') !== 36 || count('charm') !== 44
      || count('relic') !== 45 || count('burden') !== 13
      || count('kit') !== 4 || count('trinket') !== 6
      || definitions.filter((item) => !['kit', 'trinket'].includes(item.class)).length !== 138
      || definitions.length !== 148) {
    throw new Error('Artifact catalog count mismatch');
  }
  ensureArtifactEffectHandlersRegistered();
  validateArtifactAssets('development');
  // Count/class finality is pinned above; transition metadata tolerance preserves authored test and
  // editor extensions which temporarily add a known tag before supplying production metadata.
  validateArtifactV2Schemas(definitions, ARTIFACT_SETS, 'transition');
}
