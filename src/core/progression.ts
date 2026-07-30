import { LEVEL_THRESHOLD } from '../content/constants';
import { FACTIONS } from '../content/factions';
import type { Hero, LevelChoice, PrimaryStat } from './types';
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
    ...STATS, ...(hero.level >= 4 && hero.knownSpells.some((id) =>
      !hero.upgradedSpells.includes(id)) ? ['inscribe' as const] : []),
  ];
  const result: LevelChoice[] = [];
  let rng = rngState;
  while (result.length < 3) {
    const total = available.reduce(
      (sum, stat) => sum + (stat === 'inscribe'
        ? 10 : FACTIONS[hero.faction].classWeights[stat]),
      0,
    );
    let random: number;
    [random, rng] = nextRandom(rng);
    let cursor = random * total;
    let chosen = available[0];
    for (const stat of available) {
      cursor -= stat === 'inscribe' ? 10 : FACTIONS[hero.faction].classWeights[stat];
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
    (a, b) => (b === 'inscribe' ? 10 : FACTIONS[hero.faction].classWeights[b])
      - (a === 'inscribe' ? 10 : FACTIONS[hero.faction].classWeights[a])
      || a.localeCompare(b),
  )[0];
}
