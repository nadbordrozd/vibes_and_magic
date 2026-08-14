import type { BattleSide, BattleStack } from '../types';

/**
 * Persistent army ownership does not change during temporary mind control. Tactical targeting,
 * acting, and allied checks continue to read `stack.side` directly.
 */
export function originalOwnerSide(stack: BattleStack): BattleSide {
  return stack.originalSide ?? stack.side;
}

export function isOriginallyOwnedBy(stack: BattleStack, side: BattleSide): boolean {
  return originalOwnerSide(stack) === side;
}
