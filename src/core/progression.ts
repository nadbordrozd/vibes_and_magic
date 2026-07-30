import { LEVEL_THRESHOLD } from '../content/constants';
import { FACTIONS } from '../content/factions';
import type { Hero, PrimaryStat } from './types';
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
): [PrimaryStat[], number] {
  const available = [...STATS];
  const result: PrimaryStat[] = [];
  let rng = rngState;
  while (result.length < 3) {
    const total = available.reduce(
      (sum, stat) => sum + FACTIONS[hero.faction].classWeights[stat],
      0,
    );
    let random: number;
    [random, rng] = nextRandom(rng);
    let cursor = random * total;
    let chosen = available[0];
    for (const stat of available) {
      cursor -= FACTIONS[hero.faction].classWeights[stat];
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

export function bestLevelOption(hero: Hero, options: PrimaryStat[]): PrimaryStat {
  return [...options].sort(
    (a, b) => FACTIONS[hero.faction].classWeights[b]
      - FACTIONS[hero.faction].classWeights[a]
      || a.localeCompare(b),
  )[0];
}
