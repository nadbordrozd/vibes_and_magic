import { writeFileSync } from 'node:fs';
import { simulateGame } from './run';

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
const results = Array.from(
  { length: games },
  (_, index) => simulateGame(seed + index, maxDays),
);
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

console.log(`Games: ${games} | seed range: ${seed}–${seed + games - 1}`);
console.log(`Crashes: ${crashes.length}`);
console.log(`Wins: Crimson ${wins.p1} (${(wins.p1 / games * 100).toFixed(1)}%) | Azure ${wins.p2} (${(wins.p2 / games * 100).toFixed(1)}%) | unresolved ${wins.unresolved}`);
console.log(`Length days: min ${lengths[0]} | median ${percentile(0.5)} | p90 ${percentile(0.9)} | max ${lengths.at(-1)}`);
console.log(`Finished within 8 weeks: ${withinEightWeeks}/${games} (${(withinEightWeeks / games * 100).toFixed(1)}%)`);
console.log(`Casualties: Crimson ${casualtyTotal.p1} | Azure ${casualtyTotal.p2} | neutral ${casualtyTotal.neutral}`);
for (const result of results.filter((item) => !item.winner).slice(0, 5)) {
  console.log(`Unresolved seed ${result.seed}: ${result.summary}`);
}

if (crashes.length > 0) process.exitCode = 1;
