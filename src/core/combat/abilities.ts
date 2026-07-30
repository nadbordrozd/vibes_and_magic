import { UNITS } from '../../content/units';
import type { AbilityId } from '../../content/units';
import type { BattleStack, UnitId } from '../types';

export interface AbilityHandler {
  id: AbilityId;
  canRangedAttack?: (stack: BattleStack) => boolean;
  ignoresMovementBlockers?: () => boolean;
}

export const ABILITY_REGISTRY: Record<AbilityId, AbilityHandler> = {
  ranged: {
    id: 'ranged',
    canRangedAttack: (stack) => stack.shots > 0,
  },
  flying: {
    id: 'flying',
    ignoresMovementBlockers: () => true,
  },
};

export function abilityHandlers(unitId: UnitId): AbilityHandler[] {
  return UNITS[unitId].abilities.map((abilityId) => {
    const handler = ABILITY_REGISTRY[abilityId];
    if (!handler) throw new Error(`Unknown ability handler: ${abilityId}`);
    return handler;
  });
}

export function ignoresMovementBlockers(unitId: UnitId): boolean {
  return abilityHandlers(unitId).some(
    (handler) => handler.ignoresMovementBlockers?.() === true,
  );
}
