import type {
  SecondarySkillId, SkillRank,
} from '../core/types';
import { skillFlavor } from './flavor';
import type { SkillOfferGate } from './v2/schema';
import type { ContentAssetRequirement } from './v2/schema';
import { validateSkillOfferGates } from './v2/validation';

export interface SkillDefinition {
  id: SecondarySkillId;
  name: string;
  flavor: string;
  weight: number;
  family: 'movement' | 'information' | 'economy' | 'neutral-interaction' | 'magic' | 'items'
    | 'drafting' | 'army' | 'control' | 'siege' | 'hero-combat';
  classWeight: Record<
    'banneret' | 'guildmaster' | 'chandler' | 'broodspeaker' | 'crone' | 'ashrider',
    number
  >;
  ranks: Record<SkillRank, string>;
  values: Record<string, number>;
  offerGate?: SkillOfferGate;
}

const skill = (
  id: SecondarySkillId,
  name: string,
  family: SkillDefinition['family'],
  ranks: [string, string, string],
  values: Record<string, number> = {},
  classWeight: Partial<SkillDefinition['classWeight']> = {},
  minimumHeroLevel?: number,
): SkillDefinition => ({
  id, name, family, flavor: skillFlavor(name), weight: 3,
  classWeight: {
    banneret: 3, guildmaster: 3, chandler: 3,
    broodspeaker: 3, crone: 3, ashrider: 3, ...classWeight,
  },
  ranks: { 1: ranks[0], 2: ranks[1], 3: ranks[2] },
  values,
  ...(minimumHeroLevel ? { offerGate: { minimumHeroLevel } } : {}),
});

export const SKILLS: Record<SecondarySkillId, SkillDefinition> = {
  logistics: skill('logistics', 'Logistics', 'movement', [
    '+10% daily movement.',
    '+20% daily movement.',
    '+30% daily movement; carry up to 300 unspent move; once per week refresh movement in full.',
  ], { rank1: 0.1, rank2: 0.2, rank3: 0.3, carry: 300, refreshes: 1 }, { ashrider: 6 }),
  scouting: skill('scouting', 'Scouting', 'information', [
    'Inspect nearby guardians exactly.',
    'Reveal farther and inspect enemy armies.',
    'Also inspect enemy spells, items, and mana.',
  ], { inspectRange: 3, revealBonus: 2 }),
  wayfaring: skill('wayfaring', 'Wayfaring', 'movement', [
    'Forest terrain costs 100.',
    'All passable terrain costs 100.',
    'All passable terrain costs 90; diagonals have no surcharge; once per day enter one guardian aggro tile without combat.',
  ], { terrainCost: 100, rank3TerrainCost: 90 }, { ashrider: 6 }),
  diplomacy: skill('diplomacy', 'Diplomacy', 'neutral-interaction', [
    'Pay guardians up to 50% power to disperse.',
    'Threshold 80%; may recruit for 3× value.',
    'Guardians up to 120% may stand aside.',
  ], {
    rank1Threshold: 0.5, rank2Threshold: 0.8, rank3Threshold: 1.2,
    disbandCost: 2, recruitCost: 3,
  }),
  attunement: skill('attunement', 'Attunement', 'magic', [
    '+2 field mana per day.',
    '+4 field mana; all spells cost 1 less mana.',
    '+6 field mana; maximum mana is 12 times Knowledge.',
  ], {
    rank1Regen: 2, rank2Regen: 4, rank3Regen: 6, manaDiscount: 1,
  }, { guildmaster: 6 }),
  command: skill('command', 'Command', 'army', [
    '+3 allied morale each round.',
    '+6 allied morale each round.',
    '+10 allied morale each round; companies start at 20.',
  ], { rank1Meter: 3, rank2Meter: 6, rank3Meter: 10, startingMeter: 20 }, {
    banneret: 6,
  }),
  forager: skill('forager', 'Forager', 'economy', [
    'Resource piles yield +50%.',
    'Also collect pickups from range two.',
    'Collect at range three; piles yield +100%.',
  ], { rank1Yield: 0.5, rank3Yield: 1, rank2Range: 2, rank3Range: 3 }),
  spellthief: skill('spellthief', 'Spellthief', 'magic', [
    'Steal a spell from defeated heroes.',
    'Also copy one spell upgrade.',
    'After battle, learn every unknown enemy spell cast against you, including tier 4–5.',
  ], { spellsPerVictory: 1, rank2UpgradesPerVictory: 1 }),
  alchemist: skill('alchemist', 'Alchemist', 'items', [
    'First item each battle does not consume the hero-act.',
    'Once per battle, a used item is not expended.',
    'Potions affect one additional valid target; consumables may target any legal company regardless of range.',
  ]),
  chronicler: skill('chronicler', 'Chronicler', 'drafting', [
    'Level-up drafts deal four cards.',
    'May skip a draft for +300 XP.',
    'May reroll a level-up draft once.',
  ], { cards: 4, skipXp: 300 }),
  palimpsest: skill('palimpsest', 'Palimpsest', 'magic', [
    'At a friendly guild, forget one spell to draw two and keep one.',
    'Draw three offers.',
    'Also usable at shrines and The Stacks; draw four there.',
  ], { rank1Draw: 2, rank2Draw: 3 }, { guildmaster: 6 }),
  twicetold: skill('twicetold', 'Twicetold', 'magic', [
    'The first spell each battle costs half mana.',
    'Twisters use their Upgraded rules.',
    'Once per battle, a tier 1–2 spell does not consume the hero act.',
  ], {}, { guildmaster: 6 }),
  curseEater: skill('curseEater', 'Curse-Eater', 'magic', [
    'Counters on your stacks decay by two.',
    'Removed counters grant +5 morale each.',
    'Redirect the first Hex or Burn applied to your army.',
  ], { decay: 2, meterPerCounter: 5 }),
  ritualist: skill('ritualist', 'Ritualist', 'magic', [
    'Shrines are usable twice per hero.',
    "See next week's omen.",
    'Once per game, choose an upcoming omen.',
  ], {}, { crone: 6 }),
  peddler: skill('peddler', 'Peddler', 'economy', [
    'Marketplace rates ×0.75.',
    'Sell items at 60%; marketplaces stock a scroll.',
    'Marketplace rates ×0.5; Trade Goods +50%; once per week buy any owned Marketplace scroll remotely.',
  ], { rank1Rate: 0.75, sellRate: 0.6, rank3Rate: 0.5, goodsBonus: 0.5 }),
  warden: skill('warden', 'Warden', 'army', [
    'Installed garrisons use your primary stats.',
    'They also receive your Command bonus.',
    'Cast into a garrison battle from five tiles away.',
  ], { castRange: 5 }, { banneret: 6 }),
  ransomer: skill('ransomer', 'Ransomer', 'economy', [
    'Defeated heroes pay their 1500g hire cost.',
    'Also take one random carried item.',
    'Their ransom re-hire cost doubles; defeated heroes cannot be re-hired for seven days.',
  ], { ransom: 1500, rehireMultiplier: 2, lockDays: 7 }),
  beastmaster: skill('beastmaster', 'Beastmaster', 'army', [
    'Beast dwelling recruitment costs 25% less.',
    'Beast stacks gain +1 speed.',
    'Once weekly, a weak neutral beast stack joins free.',
  ], { discount: 0.25, speed: 1, joinThreshold: 0.3 }, { broodspeaker: 6, ashrider: 6 }),
  vanguard: skill('vanguard', 'Vanguard', 'army', [
    'Fastest stack gains +2 speed in round one.',
    'All stacks gain +1 speed in round one.',
    'Designate one stack to act first.',
  ], { rank1Speed: 2, rank2Speed: 1 }, { banneret: 6, ashrider: 6 }),
  provisioner: skill('provisioner', 'Provisioner', 'items', [
    '+1 consumable slot.',
    '+2 slots; adventure spells cost 150 less move.',
    'Gain a random common consumable each week.',
  ], { rank1Slots: 1, rank2Slots: 2, moveDiscount: 150 }),
  siegewright: skill('siegewright', 'Siegewright', 'siege', [
    'Enemy Walls bonuses are halved.',
    'Wall of the Maker hexes become 40-HP barriers; every hex you create gains +10 HP.',
    'Breach one wall before an assault; hexes you create last the whole battle.',
  ], { wallsMultiplier: 0.5, wallHp: 40, createdHexHp: 10, breach: 1 }, { broodspeaker: 6 }),
  evoker: skill('evoker', 'Evoker', 'magic', [
    'Impact spells deal +25% damage.',
    'Impact spells deal +50% damage and apply Burn 1.',
    'Impact spells deal +75% damage; once per battle one does not consume the hero act.',
  ], { rank1: 0.25, rank2: 0.5, rank3: 0.75, burn: 1 }, { guildmaster: 6 }),
  tallykeeper: skill('tallykeeper', 'Tallykeeper', 'magic', [
    'Counters you apply gain +1.',
    'Enemy counters you applied decay one round later.',
    'Counters you apply to enemies cap at 12.',
  ], { application: 1, cap: 12 }, { chandler: 6, crone: 6 }),
  reliquarian: skill('reliquarian', 'Reliquarian', 'items', [
    '+1 Misc equipment slot.',
    'Charm artifacts give 50% more of their numeric values.',
    'Once per game, unequip one Burden without satisfying its removal condition.',
  ], { charmMultiplier: 1.5 }, { guildmaster: 6 }),
  tactician: skill('tactician', 'Tactician', 'army', [
    'Your companies deploy one column further forward.',
    'Designate one company; it deploys at the furthest legal point on your half.',
    'The designated company takes the first turn of round one regardless of speed.',
  ], {}, { banneret: 6 }),
  reaper: skill('reaper', 'Reaper', 'army', [
    'After victory, recover 10% of your casualties.',
    'After victory, recover 20% of your casualties.',
    "After victory, also raise 15% of the enemy's casualties as your faction's tier-1 unit.",
  ], { rank1: 0.1, rank2: 0.2, enemyRaise: 0.15 }, { chandler: 6 }, 5),
  quartermaster: skill('quartermaster', 'Quartermaster', 'army', [
    '+1 army slot.',
    'Your army suffers no mixed-faction morale penalty.',
    'Once per week, recruit from any owned city without visiting it.',
  ], { armySlots: 1, maximumArmySlots: 9 }, { broodspeaker: 6 }, 5),
  beguiler: skill('beguiler', 'Beguiler', 'control', [
    'Choose one enemy company to begin each battle at Chill 2.',
    "Before battle, see the enemy hero's spellbook, mana, and equipped artifacts.",
    'Once per battle, control one enemy company for one round without consuming the hero act; maximum HP is 25 × your level.',
  ], { chill: 2, hpPerLevel: 25 }, { crone: 6 }, 5),
  loremaster: skill('loremaster', 'Loremaster', 'drafting', [
    '+25% experience.',
    'Shrines, Mage Guilds, Palimpsest, and The Stacks each offer one additional choice.',
    'When you learn a tier 1–3 spell, learn its Upgraded rules too.',
  ], { experience: 0.25, choices: 1 }, { chandler: 6 }),
  duelist: skill('duelist', 'Duelist', 'hero-combat', [
    '+2 Attack and +2 Defense in battles against another hero.',
    'Enemy heroes cannot retreat or surrender against you.',
    'On defeating an enemy hero, choose one of their artifacts to take, including on surrender.',
  ], { attack: 2, defense: 2 }, { banneret: 6, ashrider: 6 }, 5),
};

export const SKILL_IDS = Object.keys(SKILLS) as SecondarySkillId[];
export const RARE_SKILL_RANKS = [
  'chronicler:3', 'twicetold:3', 'reaper:3',
  'beguiler:3', 'duelist:3', 'loremaster:3',
] as const;
export const DOCS_60_67_SKILL_IDS = [
  'evoker', 'tallykeeper', 'reliquarian', 'tactician', 'reaper',
  'quartermaster', 'beguiler', 'loremaster', 'duelist',
] as const satisfies readonly SecondarySkillId[];

const NEW_SKILL_ICON_SUBJECTS: Record<typeof DOCS_60_67_SKILL_IDS[number], string> = {
  evoker: 'a bright impact spark breaking a small iron plate',
  tallykeeper: 'a compact counting board with four colored tally rows',
  reliquarian: 'a careful gloved hand holding a tiny old reliquary',
  tactician: 'three company markers advanced across a folded field map',
  reaper: 'a curved harvest hook gathering pale battlefield ribbons',
  quartermaster: 'a labeled key ring beside a neatly tied supply ledger',
  beguiler: 'a half-smiling mask trailing one cool blue ribbon',
  loremaster: 'an open book with a second text visible beneath the page',
  duelist: 'two crossed practice blades beneath one bright glove',
};

export const SKILL_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] = SKILL_IDS.map((id) => ({
  canonicalId: `skill:${id}`,
  semantics: { family: 'skill', skillFamily: SKILLS[id].family },
  introducedBy: DOCS_60_67_SKILL_IDS.includes(id as typeof DOCS_60_67_SKILL_IDS[number])
    ? 'docs-60-67' : 'existing',
  nativeAssetId: `skill:${id}`,
  visualSubject: id in NEW_SKILL_ICON_SUBJECTS
    ? NEW_SKILL_ICON_SUBJECTS[id as keyof typeof NEW_SKILL_ICON_SUBJECTS]
    : `${SKILLS[id].name} canonical secondary-skill emblem`,
  accessibleName: `${SKILLS[id].name} skill icon`,
}));

export function skillWeight(
  skillId: SecondarySkillId,
  heroClass: 'banneret' | 'guildmaster' | 'chandler' | 'broodspeaker'
    | 'crone' | 'ashrider',
): number {
  return SKILLS[skillId].classWeight[heroClass];
}

export function validateSkills(): void {
  for (const definition of Object.values(SKILLS)) {
    if (!definition.name || !definition.flavor.trim() || definition.weight <= 0
        || !definition.ranks[1] || !definition.ranks[2] || !definition.ranks[3]) {
      throw new Error(`Invalid skill definition: ${definition.id}`);
    }
  }
  validateSkillOfferGates(Object.values(SKILLS));
  if (Object.values(SKILLS).length !== 30) throw new Error('Skill catalog needs exactly 30 skills');
  for (const definition of Object.values(SKILLS)) {
    if (Object.values(definition.classWeight).some((weight) => weight <= 0)) {
      throw new Error(`Skill ${definition.id} needs all six positive class weights`);
    }
  }
}
