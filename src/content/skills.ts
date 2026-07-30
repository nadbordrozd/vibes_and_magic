import type {
  SecondarySkillId, SkillRank,
} from '../core/types';

export interface SkillDefinition {
  id: SecondarySkillId;
  name: string;
  weight: number;
  classWeight?: Partial<Record<'banneret' | 'guildmaster', number>>;
  ranks: Record<SkillRank, string>;
  values: Record<string, number>;
}

export const SKILLS: Record<SecondarySkillId, SkillDefinition> = {
  logistics: {
    id: 'logistics', name: 'Logistics', weight: 4,
    ranks: { 1: '+10% daily movement.', 2: '+20% daily movement.' },
    values: { rank1: 0.1, rank2: 0.2 },
  },
  scouting: {
    id: 'scouting', name: 'Scouting', weight: 4,
    ranks: {
      1: 'Inspect nearby guardians exactly.',
      2: 'Also reveal farther and inspect enemy armies.',
    },
    values: { inspectRange: 3, revealBonus: 2 },
  },
  wayfaring: {
    id: 'wayfaring', name: 'Wayfaring', weight: 4,
    ranks: {
      1: 'Forest terrain costs 100.',
      2: 'All passable terrain costs 100.',
    },
    values: { terrainCost: 100 },
  },
  diplomacy: {
    id: 'diplomacy', name: 'Diplomacy', weight: 4,
    ranks: {
      1: 'Pay weak guardians to disband.',
      2: 'A higher threshold and recruitment option.',
    },
    values: { rank1Threshold: 0.5, rank2Threshold: 0.8, disbandCost: 2, recruitCost: 3 },
  },
  attunement: {
    id: 'attunement', name: 'Attunement', weight: 4,
    classWeight: { guildmaster: 8 },
    ranks: {
      1: '+2 field mana per day.',
      2: '+4 field mana and a second shrine choice.',
    },
    values: { rank1Regen: 2, rank2Regen: 4, rank2ShrineChoices: 2 },
  },
  command: {
    id: 'command', name: 'Command', weight: 4,
    classWeight: { banneret: 8 },
    ranks: {
      1: '+3 allied meter each round.',
      2: '+6 allied meter each round.',
    },
    values: { rank1Meter: 3, rank2Meter: 6 },
  },
  forager: {
    id: 'forager', name: 'Forager', weight: 4,
    ranks: {
      1: 'Resource piles yield +50%.',
      2: 'Also collect piles from adjacent tiles.',
    },
    values: { yieldBonus: 0.5, adjacentRange: 1 },
  },
  spellthief: {
    id: 'spellthief', name: 'Spellthief', weight: 4,
    classWeight: { guildmaster: 8 },
    ranks: {
      1: 'Steal a spell from defeated heroes.',
      2: 'Also copy one of their spell upgrades.',
    },
    values: { spellsPerVictory: 1, rank2UpgradesPerVictory: 1 },
  },
};

export const SKILL_IDS = Object.keys(SKILLS) as SecondarySkillId[];

export function skillWeight(
  skillId: SecondarySkillId,
  heroClass: 'banneret' | 'guildmaster',
): number {
  return SKILLS[skillId].classWeight?.[heroClass] ?? SKILLS[skillId].weight;
}

export function validateSkills(): void {
  for (const skill of Object.values(SKILLS)) {
    if (!skill.name || skill.weight <= 0 || !skill.ranks[1] || !skill.ranks[2]) {
      throw new Error(`Invalid skill definition: ${skill.id}`);
    }
  }
}
