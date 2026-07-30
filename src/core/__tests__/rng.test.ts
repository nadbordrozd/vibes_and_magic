import { describe, expect, it } from 'vitest';
import { nextRandom, randomInt, shuffle } from '../rng';
import { drawLevelOptions } from '../progression';
import { createGame } from '../game';

describe('seeded random number generator', () => {
  it('is deterministic', () => {
    expect(nextRandom(1)).toEqual(nextRandom(1));
  });

  it('advances its state', () => {
    const [, state] = nextRandom(10);
    expect(state).not.toBe(10);
  });

  it('returns values in [0, 1)', () => {
    let state = 1;
    for (let index = 0; index < 100; index += 1) {
      const [value, next] = nextRandom(state);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      state = next;
    }
  });

  it('returns bounded integers', () => {
    const [value] = randomInt(23, 4);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(4);
  });

  it('shuffles without losing values', () => {
    const [values] = shuffle([1, 2, 3, 4], 3);
    expect([...values].sort()).toEqual([1, 2, 3, 4]);
  });

  it('repeats shuffles for the same seed', () => {
    expect(shuffle(['a', 'b', 'c'], 99)[0]).toEqual(shuffle(['a', 'b', 'c'], 99)[0]);
  });

  it('draws three distinct level options', () => {
    const hero = createGame({ seed: 1, p1: 'human', p2: 'ai' }).players.p1.hero!;
    const [options] = drawLevelOptions(hero, 1);
    expect(options).toHaveLength(3);
    expect(new Set(options).size).toBe(3);
  });
});
