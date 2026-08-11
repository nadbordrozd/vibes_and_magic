import type {
  SecondarySkillId, SkillRank,
} from '../core/types';
import { skillFlavor } from './flavor';

export interface SkillDefinition {
  id: SecondarySkillId;
  name: string;
  flavor: string;
  weight: number;
  classWeight?: Partial<Record<
    'banneret' | 'guildmaster' | 'chandler' | 'broodspeaker' | 'crone' | 'ashrider',
    number
  >>;
  ranks: Record<SkillRank, string>;
  values: Record<string, number>;
}

const skill = (
  id: SecondarySkillId,
  name: string,
  ranks: [string, string, string],
  values: Record<string, number> = {},
  classWeight?: SkillDefinition['classWeight'],
): SkillDefinition => ({
  id, name, flavor: skillFlavor(name), weight: 3, classWeight,
  ranks: { 1: ranks[0], 2: ranks[1], 3: ranks[2] },
  values,
});

export const SKILLS: Record<SecondarySkillId, SkillDefinition> = {
  logistics: skill('logistics', 'Logistics', [
    '+10% daily movement.',
    '+20% daily movement.',
    '+30% daily movement; carry up to 300 unspent move.',
  ], { rank1: 0.1, rank2: 0.2, rank3: 0.3, carry: 300 }),
  scouting: skill('scouting', 'Scouting', [
    'Inspect nearby guardians exactly.',
    'Reveal farther and inspect enemy armies.',
    'Also inspect enemy spells, items, and mana.',
  ], { inspectRange: 3, revealBonus: 2 }),
  wayfaring: skill('wayfaring', 'Wayfaring', [
    'Forest terrain costs 100.',
    'All passable terrain costs 100.',
    'All passable terrain costs 90; diagonals have no surcharge.',
  ], { terrainCost: 100, rank3TerrainCost: 90 }),
  diplomacy: skill('diplomacy', 'Diplomacy', [
    'Pay guardians up to 50% power to disperse.',
    'Threshold 80%; may recruit for 3× value.',
    'Guardians up to 120% may stand aside.',
  ], {
    rank1Threshold: 0.5, rank2Threshold: 0.8, rank3Threshold: 1.2,
    disbandCost: 2, recruitCost: 3,
  }),
  attunement: skill('attunement', 'Attunement', [
    '+2 field mana per day.',
    '+4 field mana and a second shrine choice.',
    '+6 field mana; declare one resonant battle per day.',
  ], {
    rank1Regen: 2, rank2Regen: 4, rank3Regen: 6, rank2ShrineChoices: 2,
  }, { guildmaster: 6 }),
  command: skill('command', 'Command', [
    '+3 allied morale each round.',
    '+6 allied morale each round.',
    '+10 allied morale each round; companies start at 20.',
  ], { rank1Meter: 3, rank2Meter: 6, rank3Meter: 10, startingMeter: 20 }, {
    banneret: 6,
  }),
  forager: skill('forager', 'Forager', [
    'Resource piles yield +50%.',
    'Also collect pickups from range two.',
    'Collect at range three; piles yield +100%.',
  ], { rank1Yield: 0.5, rank3Yield: 1, rank2Range: 2, rank3Range: 3 }),
  spellthief: skill('spellthief', 'Spellthief', [
    'Steal a spell from defeated heroes.',
    'Also copy one spell upgrade.',
    'After battle, learn unknown enemy spells cast against you.',
  ], { spellsPerVictory: 1, rank2UpgradesPerVictory: 1 }),
  alchemist: skill('alchemist', 'Alchemist', [
    'First item each battle does not consume the hero-act.',
    'Once per battle, a used item is not expended.',
    'Potions affect one additional valid target.',
  ]),
  chronicler: skill('chronicler', 'Chronicler', [
    'Level-up drafts deal four cards.',
    'May skip a draft for +300 XP.',
    'May reroll a level-up draft once.',
  ], { cards: 4, skipXp: 300 }),
  palimpsest: skill('palimpsest', 'Palimpsest', [
    'At a friendly guild, forget one spell to draw two and keep one.',
    'Draw three offers.',
    'Also usable at shrines.',
  ], { rank1Draw: 2, rank2Draw: 3 }, { guildmaster: 6 }),
  twicetold: skill('twicetold', 'Twicetold', [
    'First twister each battle costs no mana.',
    'Twisters use their Upgraded rules.',
    'Once per battle, a twister does not consume the hero-act.',
  ], {}, { guildmaster: 6 }),
  curseEater: skill('curseEater', 'Curse-Eater', [
    'Counters on your stacks decay by two.',
    'Removed counters grant +5 morale each.',
    'Redirect the first Hex or Burn applied to your army.',
  ], { decay: 2, meterPerCounter: 5 }),
  ritualist: skill('ritualist', 'Ritualist', [
    'Shrines are usable twice per hero.',
    "See next week's omen.",
    'Once per game, choose an upcoming omen.',
  ]),
  peddler: skill('peddler', 'Peddler', [
    'Marketplace rates ×0.75.',
    'Sell items at 60%; marketplaces stock a scroll.',
    'Marketplace rates ×0.5; Trade Goods +50%.',
  ], { rank1Rate: 0.75, sellRate: 0.6, rank3Rate: 0.5, goodsBonus: 0.5 }),
  warden: skill('warden', 'Warden', [
    'Installed garrisons use your primary stats.',
    'They also receive your Command bonus.',
    'Cast into a garrison battle from five tiles away.',
  ], { castRange: 5 }, { banneret: 6 }),
  ransomer: skill('ransomer', 'Ransomer', [
    'Defeated heroes pay their 1500g hire cost.',
    'Also take one random carried item.',
    'Their ransom re-hire cost doubles.',
  ], { ransom: 1500, rehireMultiplier: 2 }),
  beastmaster: skill('beastmaster', 'Beastmaster', [
    'Beast dwelling recruitment costs 25% less.',
    'Beast stacks gain +1 speed.',
    'Once weekly, a weak neutral beast stack joins free.',
  ], { discount: 0.25, speed: 1, joinThreshold: 0.3 }),
  vanguard: skill('vanguard', 'Vanguard', [
    'Fastest stack gains +2 speed in round one.',
    'All stacks gain +1 speed in round one.',
    'Designate one stack to act first.',
  ], { rank1Speed: 2, rank2Speed: 1 }, { banneret: 6 }),
  provisioner: skill('provisioner', 'Provisioner', [
    '+1 consumable slot.',
    '+2 slots; adventure spells cost 150 less move.',
    'Gain a random common consumable each week.',
  ], { rank1Slots: 1, rank2Slots: 2, moveDiscount: 150 }),
  siegewright: skill('siegewright', 'Siegewright', [
    'Enemy Walls bonuses are halved.',
    'Wall of the Maker hexes become 40-HP barriers.',
    'Breach one wall hex before a city assault.',
  ], { wallsMultiplier: 0.5, wallHp: 40, breach: 1 }),
};

export const SKILL_IDS = Object.keys(SKILLS) as SecondarySkillId[];

export function skillWeight(
  skillId: SecondarySkillId,
  heroClass: 'banneret' | 'guildmaster' | 'chandler' | 'broodspeaker'
    | 'crone' | 'ashrider',
): number {
  return SKILLS[skillId].classWeight?.[heroClass] ?? SKILLS[skillId].weight;
}

export function validateSkills(): void {
  for (const definition of Object.values(SKILLS)) {
    if (!definition.name || !definition.flavor.trim() || definition.weight <= 0
        || !definition.ranks[1] || !definition.ranks[2] || !definition.ranks[3]) {
      throw new Error(`Invalid skill definition: ${definition.id}`);
    }
  }
}
