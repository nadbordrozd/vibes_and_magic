import type {
  FactionId, HeroDefinitionId, SecondarySkillId, SkillRank,
  SpecialtyId, SpellId,
} from '../../core/types';

export interface SpecialtyDefinition {
  id: SpecialtyId;
  description: string;
  values: Record<string, number>;
}

export interface HeroDefinition {
  id: HeroDefinitionId;
  name: string;
  faction: FactionId;
  heroClass: 'banneret' | 'guildmaster';
  specialty: SpecialtyDefinition;
  startingSpells: SpellId[];
  startingSkills: Partial<Record<SecondarySkillId, SkillRank>>;
}

const hero = (
  id: HeroDefinitionId,
  name: string,
  faction: FactionId,
  heroClass: HeroDefinition['heroClass'],
  specialty: SpecialtyDefinition,
  startingSpells: SpellId[] = [],
  startingSkills: Partial<Record<SecondarySkillId, SkillRank>> = {},
): HeroDefinition => ({
  id, name, faction, heroClass, specialty, startingSpells, startingSkills,
});

export const HEROES: Record<HeroDefinitionId, HeroDefinition> = {
  aldith: hero('aldith', 'Aldith', 'hearthguard', 'banneret', {
    id: 'steadyAim',
    description: 'Longbowmen ignore the adjacent-enemy ranged penalty.',
    values: {},
  }),
  corwin: hero('corwin', 'Corwin', 'hearthguard', 'banneret', {
    id: 'brightRally',
    description: 'Rally always resolves as its + face.',
    values: {},
  }, ['rally']),
  berta: hero('berta', 'Berta', 'hearthguard', 'banneret', {
    id: 'roadwise',
    description: 'Logistics grants +15%/+30%.',
    values: { rank1: 0.15, rank2: 0.3 },
  }, [], { logistics: 1 }),
  osric: hero('osric', 'Osric', 'hearthguard', 'banneret', {
    id: 'highBanner',
    description: 'Bannerman auras grant +15 meter.',
    values: { meter: 15 },
  }),
  petra: hero('petra', 'Petra', 'woundWrights', 'guildmaster', {
    id: 'tinCaptain',
    description: 'Tin Soldiers gain +1 Attack and Defense.',
    values: { attack: 1, defense: 1 },
  }),
  silas: hero('silas', 'Silas', 'woundWrights', 'guildmaster', {
    id: 'brightWither',
    description: 'Wither always resolves as its + face.',
    values: {},
  }, ['wither']),
  grigor: hero('grigor', 'Grigor', 'woundWrights', 'guildmaster', {
    id: 'masterForager',
    description: 'Forager grants +75%/+100% pile yield.',
    values: { rank1: 0.75, rank2: 1 },
  }, [], { forager: 1 }),
  mirele: hero('mirele', 'Mirele', 'woundWrights', 'guildmaster', {
    id: 'masterMender',
    description: 'Victories recover 10 percentage points more losses.',
    values: { recovery: 0.1 },
  }),
};

export const FACTION_HEROES: Record<FactionId, HeroDefinitionId[]> = {
  hearthguard: ['aldith', 'corwin', 'berta', 'osric'],
  woundWrights: ['petra', 'silas', 'grigor', 'mirele'],
};

export function validateHeroes(): void {
  for (const definition of Object.values(HEROES)) {
    if (!definition.name || !FACTION_HEROES[definition.faction].includes(definition.id)) {
      throw new Error(`Invalid hero definition: ${definition.id}`);
    }
  }
}
