import { LEVEL_THRESHOLD } from '../content/constants';
import { FACTIONS } from '../content/factions';
import { HEROES } from '../content/heroes';
import { SKILLS, SKILL_IDS, skillWeight } from '../content/skills';
import type {
  Hero, LevelChoice, PrimaryStat, SecondarySkillId,
} from './types';
import { nextRandom } from './rng';

const STATS: PrimaryStat[] = ['attack', 'defense', 'spellPower', 'knowledge'];
export const MAX_SECONDARY_SKILLS = 6;

export function levelThreshold(level: number): number {
  return LEVEL_THRESHOLD(level);
}

export function needsLevel(hero: Hero): boolean {
  return hero.xp >= levelThreshold(hero.level + 1);
}

export function drawLevelOptions(
  hero: Hero,
  rngState: number,
): [LevelChoice[], number] {
  const distinctSkills = Object.keys(hero.skills).filter(
    (id) => (hero.skills[id as SecondarySkillId] ?? 0) > 0,
  ).length;
  const available: LevelChoice[] = [
    ...STATS,
    ...SKILL_IDS.filter((skillId) => {
      const rank = hero.skills[skillId] ?? 0;
      return rank < 3 && (rank > 0 || distinctSkills < MAX_SECONDARY_SKILLS);
    }),
    ...(hero.level >= 4 && hero.knownSpells.some((id) =>
      !hero.upgradedSpells.includes(id)) ? ['inscribe' as const] : []),
    ...(hero.faction === 'hagwood' && hero.level >= 3 && hero.debts.length < 2
      ? ['bargain' as const] : []),
  ];
  const result: LevelChoice[] = [];
  let rng = rngState;
  const cards = (hero.skills.chronicler ? SKILLS.chronicler.values.cards : 3)
    + (hero.draftBonusCards ?? 0);
  while (result.length < Math.min(cards, available.length)) {
    const total = available.reduce(
      (sum, option) => sum + optionWeight(hero, option),
      0,
    );
    let random: number;
    [random, rng] = nextRandom(rng);
    let cursor = random * total;
    let chosen = available[0];
    for (const stat of available) {
      cursor -= optionWeight(hero, stat);
      if (cursor <= 0) {
        chosen = stat;
        break;
      }
    }
    result.push(chosen);
    available.splice(available.indexOf(chosen), 1);
  }
  return [result, rng];
}

export function bestLevelOption(hero: Hero, options: LevelChoice[]): LevelChoice {
  return [...options].sort(
    (a, b) => aiOptionScore(hero, b) - aiOptionScore(hero, a)
      || a.localeCompare(b),
  )[0];
}

function isPrimary(option: LevelChoice): option is PrimaryStat {
  return STATS.includes(option as PrimaryStat);
}

function optionWeight(hero: Hero, option: LevelChoice): number {
  if (option === 'inscribe') return 10;
  if (option === 'bargain') return 6;
  if (isPrimary(option)) return FACTIONS[hero.faction].classWeights[option] / 2;
  return skillWeight(option, HEROES[hero.definitionId].heroClass);
}

function aiOptionScore(hero: Hero, option: LevelChoice): number {
  if ((option === 'logistics' || option === 'scouting') && !hero.skills[option]) return 100;
  if (option === 'diplomacy' || option === 'spellthief' || option === 'palimpsest') return -1;
  if (option === 'alchemist' && !hero.skills.alchemist) {
    return hero.inventory.filter(Boolean).length >= 2 ? 90 : 0;
  }
  if (isPrimary(option)) return FACTIONS[hero.faction].classWeights[option];
  if (option === 'inscribe') return 10;
  if (option === 'bargain') return 25;
  return optionWeight(hero, option as SecondarySkillId);
}
