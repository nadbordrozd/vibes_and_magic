import { LEVEL_THRESHOLD } from '../content/constants';
import { FACTIONS } from '../content/factions';
import { HEROES } from '../content/heroes';
import { SKILL_IDS, skillWeight } from '../content/skills';
import type {
  Hero, LevelChoice, PrimaryStat, SecondarySkillId,
} from './types';
import { nextRandom } from './rng';

const STATS: PrimaryStat[] = ['attack', 'defense', 'spellPower', 'knowledge'];

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
  const available: LevelChoice[] = [
    ...STATS,
    ...SKILL_IDS.filter((skillId) => (hero.skills[skillId] ?? 0) < 2),
    ...(hero.level >= 4 && hero.knownSpells.some((id) =>
      !hero.upgradedSpells.includes(id)) ? ['inscribe' as const] : []),
  ];
  const result: LevelChoice[] = [];
  let rng = rngState;
  while (result.length < 3) {
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
  if (isPrimary(option)) return FACTIONS[hero.faction].classWeights[option] / 2;
  return skillWeight(option, HEROES[hero.definitionId].heroClass);
}

function aiOptionScore(hero: Hero, option: LevelChoice): number {
  if ((option === 'logistics' || option === 'scouting') && !hero.skills[option]) return 100;
  if (option === 'diplomacy' || option === 'spellthief') return -1;
  if (isPrimary(option)) return FACTIONS[hero.faction].classWeights[option];
  if (option === 'inscribe') return 10;
  return optionWeight(hero, option as SecondarySkillId);
}
