import { HEROES } from '../content/heroes';
import { SKILLS } from '../content/skills';
import type {
  BattleHero, Hero, SecondarySkillId, SkillRank, SpecialtyId,
} from './types';

interface SpecialtyHandler {
  rangedAdjacentPenalty?: (hero: BattleHero, unitId: string) => boolean;
  spellAlwaysUpgraded?: (spellId: string) => boolean;
  unitAttackBonus?: (unitId: string) => number;
  unitDefenseBonus?: (unitId: string) => number;
  bannerMeter?: () => number;
  logisticsRate?: (rank: SkillRank) => number;
  foragerRate?: (rank: SkillRank) => number;
  recoveryBonus?: () => number;
}

const value = (id: SpecialtyId, key: string): number =>
  Object.values(HEROES).find((hero) => hero.specialty.id === id)
    ?.specialty.values[key] ?? 0;

export const SPECIALTY_REGISTRY: Record<SpecialtyId, SpecialtyHandler> = {
  steadyAim: {
    rangedAdjacentPenalty: (_hero, unitId) => unitId === 'longbowman',
  },
  brightRally: { spellAlwaysUpgraded: (spellId) => spellId === 'rally' },
  roadwise: {
    logisticsRate: (rank) => value('roadwise', rank === 1 ? 'rank1' : 'rank2'),
  },
  highBanner: { bannerMeter: () => value('highBanner', 'meter') },
  tinCaptain: {
    unitAttackBonus: (unitId) => unitId === 'tinSoldier'
      ? value('tinCaptain', 'attack') : 0,
    unitDefenseBonus: (unitId) => unitId === 'tinSoldier'
      ? value('tinCaptain', 'defense') : 0,
  },
  brightWither: { spellAlwaysUpgraded: (spellId) => spellId === 'wither' },
  masterForager: {
    foragerRate: (rank) =>
      value('masterForager', rank === 1 ? 'rank1' : 'rank2'),
  },
  masterMender: { recoveryBonus: () => value('masterMender', 'recovery') },
};

export function specialtyHandler(
  hero: Pick<Hero | BattleHero, 'specialtyId'>,
): SpecialtyHandler {
  return SPECIALTY_REGISTRY[hero.specialtyId];
}

export function skillRank(
  hero: Pick<Hero | BattleHero, 'skills'>,
  skillId: SecondarySkillId,
): SkillRank | 0 {
  return hero.skills[skillId] ?? 0;
}

export function logisticsRate(hero: Hero): number {
  const rank = skillRank(hero, 'logistics');
  if (!rank) return 0;
  return specialtyHandler(hero).logisticsRate?.(rank)
    ?? SKILLS.logistics.values[rank === 1 ? 'rank1' : 'rank2'];
}

export function foragerRate(hero: Hero): number {
  const rank = skillRank(hero, 'forager');
  if (!rank) return 0;
  return specialtyHandler(hero).foragerRate?.(rank) ?? SKILLS.forager.values.yieldBonus;
}

export function commandMeter(hero: Hero | BattleHero): number {
  const rank = skillRank(hero, 'command');
  return rank === 1 ? SKILLS.command.values.rank1Meter
    : rank === 2 ? SKILLS.command.values.rank2Meter : 0;
}
