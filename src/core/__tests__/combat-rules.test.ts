import { describe, expect, it } from 'vitest';
import {
  applyDamage, attackDefenseMultiplier, canUseRanged, computeDamage,
  luckPosition,
} from '../combat/damage';
import {
  hexDistance, hexNeighbors, isAdjacent, reachableHexes,
} from '../combat/hex';
import type { BattleStack } from '../types';

function stack(overrides: Partial<BattleStack> = {}): BattleStack {
  return {
    id: 'a', side: 'attacker', slot: 0, unitId: 'militia',
    count: 10, topHp: 6, position: { x: 0, y: 4 }, shots: 0,
    morale: 0, retaliated: false, defended: false, waited: false,
    bonusActions: 0, ...overrides,
  };
}

describe('combat rules', () => {
  it('positions luck zero at the midpoint', () => {
    expect(luckPosition(2, 8, 0)).toBe(5);
  });

  it('moves positive luck toward maximum', () => {
    expect(luckPosition(0, 10, 3)).toBe(8);
  });

  it('moves negative luck toward minimum', () => {
    expect(luckPosition(0, 10, -3)).toBe(2);
  });

  it('caps luck at five points', () => {
    expect(luckPosition(0, 10, 99)).toBe(10);
  });

  it('adds five percent damage per attack advantage', () => {
    expect(attackDefenseMultiplier(12, 10)).toBe(1.1);
  });

  it('caps attack advantage at +300%', () => {
    expect(attackDefenseMultiplier(100, 0)).toBe(4);
  });

  it('subtracts 2.5 percent per defense advantage', () => {
    expect(attackDefenseMultiplier(10, 12)).toBe(0.95);
  });

  it('caps defense reduction at 70%', () => {
    expect(attackDefenseMultiplier(0, 100)).toBeCloseTo(0.3);
  });

  it('applies damage across creature hit points', () => {
    const target = stack({ count: 3, topHp: 6 });
    expect(applyDamage(target, 7)).toBe(1);
    expect(target.count).toBe(2);
    expect(target.topHp).toBe(5);
  });

  it('removes a stack at lethal damage', () => {
    const target = stack({ count: 2 });
    expect(applyDamage(target, 99)).toBe(2);
    expect(target.count).toBe(0);
  });

  it('recognizes ranged stacks with shots', () => {
    expect(canUseRanged(stack({ unitId: 'slinger', shots: 3 }))).toBe(true);
    expect(canUseRanged(stack({ unitId: 'slinger', shots: 0 }))).toBe(false);
  });

  it('halves long-range damage', () => {
    const attacker = stack({ unitId: 'slinger', shots: 12, position: { x: 0, y: 0 } });
    const defender = stack({ id: 'd', side: 'defender', position: { x: 12, y: 8 } });
    const damage = computeDamage({
      attacker, defender, attackerHeroAttack: 0, defenderHeroDefense: 0,
      luck: 0, ranged: true, adjacentEnemy: false, wallsPenalty: false,
    });
    expect(damage).toBe(11);
  });

  it('applies castle walls to attacker ranged damage', () => {
    const attacker = stack({ unitId: 'slinger', shots: 12 });
    const defender = stack({ id: 'd', side: 'defender', position: { x: 4, y: 4 } });
    const normal = computeDamage({
      attacker, defender, attackerHeroAttack: 0, defenderHeroDefense: 0,
      luck: 0, ranged: true, adjacentEnemy: false, wallsPenalty: false,
    });
    const walled = computeDamage({
      attacker, defender, attackerHeroAttack: 0, defenderHeroDefense: 0,
      luck: 0, ranged: true, adjacentEnemy: false, wallsPenalty: true,
    });
    expect(walled).toBeLessThan(normal);
  });

  it('finds six neighbors away from board edges', () => {
    expect(hexNeighbors({ x: 5, y: 5 })).toHaveLength(6);
  });

  it('detects adjacent hexes', () => {
    expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 2 })).toBe(true);
  });

  it('computes symmetric hex distance', () => {
    expect(hexDistance({ x: 1, y: 1 }, { x: 8, y: 7 }))
      .toBe(hexDistance({ x: 8, y: 7 }, { x: 1, y: 1 }));
  });

  it('does not let walkers cross occupied cells', () => {
    const cells = reachableHexes(
      { x: 0, y: 0 }, 1, [{ x: 1, y: 0 }], [], false,
    );
    expect(cells).not.toContainEqual({ x: 1, y: 0 });
  });

  it('lets flyers cross blockers but not land on them', () => {
    const cells = reachableHexes(
      { x: 0, y: 0 }, 3, [{ x: 1, y: 0 }], [], true,
    );
    expect(cells).toContainEqual({ x: 2, y: 0 });
    expect(cells).not.toContainEqual({ x: 1, y: 0 });
  });
});
