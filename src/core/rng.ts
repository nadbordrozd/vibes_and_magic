export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let value = next;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return [((value ^ (value >>> 14)) >>> 0) / 4294967296, next];
}

export function randomInt(state: number, maxExclusive: number): [number, number] {
  const [value, next] = nextRandom(state);
  return [Math.floor(value * maxExclusive), next];
}

export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const result = [...items];
  let rng = state;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const [pick, next] = randomInt(rng, index + 1);
    rng = next;
    [result[index], result[pick]] = [result[pick], result[index]];
  }
  return [result, rng];
}
