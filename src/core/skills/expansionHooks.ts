import { SKILLS } from '../../content/skills';
import { skillRank } from '../heroBehaviors';
import type {
  Coord, Hero, PrimaryStat,
} from '../types';

type SkillHero = Pick<Hero, 'skills'>;

export function beastRecruitmentMultiplier(hero: SkillHero): number {
  return skillRank(hero, 'beastmaster') >= 1
    ? 1 - SKILLS.beastmaster.values.discount : 1;
}

export function beastSpeedBonus(hero: SkillHero): number {
  return skillRank(hero, 'beastmaster') >= 2
    ? SKILLS.beastmaster.values.speed : 0;
}

export function canClaimWeeklyBeast(
  hero: SkillHero,
  heroPower: number,
  neutralPower: number,
  currentWeek: number,
  lastClaimedWeek: number | null,
): boolean {
  return skillRank(hero, 'beastmaster') >= 3
    && lastClaimedWeek !== currentWeek
    && neutralPower <= heroPower * SKILLS.beastmaster.values.joinThreshold;
}

export function wardenGarrisonStats(
  hero: Pick<Hero, 'skills' | PrimaryStat>,
): Record<PrimaryStat, number> | null {
  if (skillRank(hero, 'warden') < 1) return null;
  return {
    attack: hero.attack,
    defense: hero.defense,
    spellPower: hero.spellPower,
    knowledge: hero.knowledge,
  };
}

export function wardenGarrisonCommand(hero: SkillHero): number {
  return skillRank(hero, 'warden') >= 2
    ? skillRank(hero, 'command') : 0;
}

export function canCastIntoGarrison(
  hero: SkillHero,
  heroPosition: Coord,
  garrisonPosition: Coord,
): boolean {
  const distance = Math.max(
    Math.abs(heroPosition.x - garrisonPosition.x),
    Math.abs(heroPosition.y - garrisonPosition.y),
  );
  return skillRank(hero, 'warden') >= 3
    && distance <= SKILLS.warden.values.castRange;
}

export function wallsDefenseMultiplier(attacker: SkillHero): number {
  return skillRank(attacker, 'siegewright') >= 1
    ? SKILLS.siegewright.values.wallsMultiplier : 1;
}

export function makerWallHitPoints(hero: SkillHero): number | null {
  return skillRank(hero, 'siegewright') >= 2
    ? SKILLS.siegewright.values.wallHp : null;
}

export function preAssaultWallBreaches(hero: SkillHero): number {
  return skillRank(hero, 'siegewright') >= 3
    ? SKILLS.siegewright.values.breach : 0;
}
