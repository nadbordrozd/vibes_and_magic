import { writeFileSync } from 'node:fs';
import { simulateGame, simulateLockAssaults } from './run';
import type { MapId } from '../core/types';

function argument(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value)) throw new Error(`Invalid --${name} value`);
  return value;
}

const games = Math.max(1, Math.floor(argument('games', 1)));
const seed = argument('seed', 1) >>> 0;
const maxDays = Math.max(1, Math.floor(argument('days', 70)));
const noMagic = process.argv.includes('--no-magic');
const compareMagic = process.argv.includes('--compare-magic');
const assaultLocks = process.argv.includes('--assault-locks');
const aiIndex = process.argv.indexOf('--ai');
const ai = aiIndex === -1 ? 'ai' : process.argv[aiIndex + 1];
if (ai !== 'ai' && ai !== 'standard' && ai !== 'dormant') {
  throw new Error('Invalid --ai value; use standard or dormant');
}
const opponent = ai === 'dormant' ? 'dormant' : 'ai';
const mapIndex = process.argv.indexOf('--map');
const mapArgument = mapIndex === -1 ? 'border-marches' : process.argv[mapIndex + 1];
const knownMaps: MapId[] = [
  'border-marches', 'crosstitch', 'crosstitch-kit', 'torn-sound', 'manywhere', 'grand-muster',
  'crooked-crown',
  'sixfold-trial',
];
if (mapArgument !== 'all' && !knownMaps.includes(mapArgument as MapId)) {
  throw new Error(`Invalid --map value; use all or ${knownMaps.join(', ')}`);
}
const maps = mapArgument === 'all' ? knownMaps.filter((map) => map !== 'crosstitch-kit')
  : [mapArgument as MapId];
const cases = maps.flatMap((mapId) => Array.from({ length: games }, (_, index) => ({
  mapId, seed: seed + index,
})));
const results = cases.map((entry) =>
  simulateGame(entry.seed, maxDays, noMagic, opponent, entry.mapId));
const crashes = results.filter((result) => result.crashed);
for (const crash of crashes) {
  const filename = `replay-crash-${crash.seed}.json`;
  writeFileSync(filename, JSON.stringify({
    seed: crash.seed, actions: crash.replay, error: crash.crashed,
  }, null, 2));
  console.error(`Crash seed ${crash.seed}; replay written to ${filename}`);
}

const wins = {
  p1: results.filter((result) => result.winner === 'p1').length,
  p2: results.filter((result) => result.winner === 'p2').length,
  unresolved: results.filter((result) => !result.winner).length,
};
const lengths = results.map((result) => result.days).sort((a, b) => a - b);
const percentile = (fraction: number) =>
  lengths[Math.min(lengths.length - 1, Math.floor(lengths.length * fraction))];
const casualtyTotal = results.reduce(
  (total, result) => ({
    p1: total.p1 + result.casualties.p1,
    p2: total.p2 + result.casualties.p2,
    neutral: total.neutral + result.casualties.neutral,
  }),
  { p1: 0, p2: 0, neutral: 0 },
);
const withinEightWeeks = results.filter((result) => result.winner && result.days <= 56).length;

console.log(`Games: ${games} per map (${results.length} total) | seed range: ${seed}–${seed + games - 1}`);
console.log(`Maps: ${maps.join(', ')}`);
console.log(`Magic: ${noMagic ? 'off' : 'on'}`);
console.log(`Opponent AI: ${opponent === 'dormant' ? 'dormant' : 'standard'}`);
console.log(`Crashes: ${crashes.length}`);
console.log(`Wins: Hearthguard ${wins.p1} (${(wins.p1 / results.length * 100).toFixed(1)}%) | Wound-Wrights ${wins.p2} (${(wins.p2 / results.length * 100).toFixed(1)}%) | unresolved ${wins.unresolved}`);
console.log(`Length days: min ${lengths[0]} | median ${percentile(0.5)} | p90 ${percentile(0.9)} | max ${lengths.at(-1)}`);
console.log(`Finished within 8 weeks: ${withinEightWeeks}/${results.length} (${(withinEightWeeks / results.length * 100).toFixed(1)}%)`);
console.log(`Casualties: Hearthguard ${casualtyTotal.p1} | Wound-Wrights ${casualtyTotal.p2} | neutral ${casualtyTotal.neutral}`);
const rounds = results.flatMap((result) => result.battleRounds).sort((a, b) => a - b);
console.log(`Battle rounds: median ${rounds.length ? rounds[Math.floor(rounds.length / 2)] : 0} | spell casts ${results.reduce((sum, result) => sum + result.spellCasts, 0)}`);
for (const result of results.filter((item) => !item.winner).slice(0, 5)) {
  console.log(`Unresolved seed ${result.seed}: ${result.summary}`);
}

if (crashes.length > 0) process.exitCode = 1;

if (compareMagic) {
  const opposite = cases.map((entry) =>
    simulateGame(entry.seed, maxDays, !noMagic, opponent, entry.mapId));
  const pairedFlips = results.filter((result, index) =>
    result.winner !== opposite[index].winner).length;
  const casualty = (result: typeof results[number]) =>
    result.casualties.p1 + result.casualties.p2 + result.casualties.neutral;
  const casualtyDelta = results.reduce(
    (sum, result, index) => sum + casualty(result) - casualty(opposite[index]),
    0,
  ) / results.length;
  console.log(`Matched comparison: winner flips ${pairedFlips}/${results.length} (${(pairedFlips / results.length * 100).toFixed(1)}%) | average casualty delta ${casualtyDelta.toFixed(1)}`);
}

if (assaultLocks) {
  const assaults = Array.from(
    { length: games },
    (_, index) => simulateLockAssaults(seed + index),
  ).flat();
  const lockCrashes = assaults.filter((result) => result.crashed);
  const losses = assaults.filter((result) => result.attackerLost).length;
  console.log(`Forced lock assaults: ${assaults.length} | crashes ${lockCrashes.length}`);
  console.log(`Naive AI lock losses: ${losses}/${assaults.length} (${(
    losses / assaults.length * 100
  ).toFixed(1)}%)`);
  for (const lockId of ['the-sleeper', 'the-mirror-bound']) {
    const attempts = assaults.filter((result) => result.lockId === lockId);
    const lost = attempts.filter((result) => result.attackerLost).length;
    console.log(`${lockId}: ${lost}/${attempts.length} losses (${(
      lost / attempts.length * 100
    ).toFixed(1)}%)`);
  }
  if (lockCrashes.length > 0) process.exitCode = 1;
}
