import { UNITS } from '../../content/units';
import type { AbilityId } from '../../content/units';
import type { BattleStack, UnitId } from '../types';

export interface AbilityHandler {
  id: AbilityId;
  canRangedAttack?: (stack: BattleStack) => boolean;
  ignoresMovementBlockers?: () => boolean;
  attackMultiplier?: (stack: BattleStack) => number;
  pinsIncomingRollToMinimum?: () => boolean;
  preventsRetaliation?: () => boolean;
  targetPriority?: number;
}

export const ABILITY_REGISTRY: Record<AbilityId, AbilityHandler> = {
  ranged: {
    id: 'ranged',
    canRangedAttack: (stack) => stack.shots > 0,
  },
  banner: { id: 'banner', targetPriority: 1.5 },
  charge: {
    id: 'charge',
    attackMultiplier: (stack) => 1 + Math.min(0.5, stack.movedHexes * 0.05),
  },
  oriflamme: { id: 'oriflamme', targetPriority: 1.5 },
  springloaded: {
    id: 'springloaded',
    attackMultiplier: (stack) => stack.attacksMade === 0 ? 1.5 : 1,
  },
  no_retaliation: { id: 'no_retaliation', preventsRetaliation: () => true },
  soft_body: { id: 'soft_body', pinsIncomingRollToMinimum: () => true },
  overwind: { id: 'overwind' },
};

export function abilityHandlers(unitId: UnitId): AbilityHandler[] {
  return UNITS[unitId].abilities.map((abilityId) => {
    const handler = ABILITY_REGISTRY[abilityId];
    if (!handler) throw new Error(`Unknown ability handler: ${abilityId}`);
    return handler;
  });
}

export function hasAbility(unitId: UnitId, ability: AbilityId): boolean {
  return UNITS[unitId].abilities.includes(ability);
}

export function ignoresMovementBlockers(unitId: UnitId): boolean {
  return abilityHandlers(unitId).some(
    (handler) => handler.ignoresMovementBlockers?.() === true,
  );
}

export function attackAbilityMultiplier(stack: BattleStack): number {
  return abilityHandlers(stack.unitId).reduce(
    (value, handler) => value * (handler.attackMultiplier?.(stack) ?? 1),
    1,
  );
}

export function pinsIncomingRollToMinimum(stack: BattleStack): boolean {
  return abilityHandlers(stack.unitId).some(
    (handler) => handler.pinsIncomingRollToMinimum?.() === true,
  );
}

export function preventsRetaliation(stack: BattleStack): boolean {
  return abilityHandlers(stack.unitId).some(
    (handler) => handler.preventsRetaliation?.() === true,
  );
}

export function targetPriority(stack: BattleStack): number {
  return abilityHandlers(stack.unitId).reduce(
    (value, handler) => value * (handler.targetPriority ?? 1),
    1,
  );
}
