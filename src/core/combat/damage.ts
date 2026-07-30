import { UNITS } from '../../content/units';
import {
  ATTACK_DAMAGE_PER_POINT, DEFENSE_REDUCTION_PER_POINT,
  LUCK_RANGE_SHIFT_PER_POINT, MAX_ATTACK_DAMAGE_BONUS,
  MAX_DEFENSE_REDUCTION, MAX_LUCK_MAGNITUDE,
} from '../../content/constants';
import type { BattleSide, BattleStack } from '../types';
import { abilityHandlers } from './abilities';
import { hexDistance, isAdjacent } from './hex';

export function luckPosition(min: number, max: number, luck: number): number {
  const midpoint = (min + max) / 2;
  const shift = (max - min) * LUCK_RANGE_SHIFT_PER_POINT
    * Math.max(-MAX_LUCK_MAGNITUDE, Math.min(MAX_LUCK_MAGNITUDE, luck));
  return Math.max(min, Math.min(max, midpoint + shift));
}

export function attackDefenseMultiplier(attack: number, defense: number): number {
  if (attack >= defense) {
    return 1 + Math.min(
      MAX_ATTACK_DAMAGE_BONUS,
      (attack - defense) * ATTACK_DAMAGE_PER_POINT,
    );
  }
  return 1 - Math.min(
    MAX_DEFENSE_REDUCTION,
    (defense - attack) * DEFENSE_REDUCTION_PER_POINT,
  );
}

export interface DamageContext {
  attacker: BattleStack;
  defender: BattleStack;
  attackerHeroAttack: number;
  defenderHeroDefense: number;
  luck: number;
  ranged: boolean;
  adjacentEnemy: boolean;
  wallsPenalty: boolean;
  rollPosition?: 'luck' | 'minimum' | 'maximum';
  abilityMultiplier?: number;
}

export function computeDamage(context: DamageContext): number {
  const attackerUnit = UNITS[context.attacker.unitId];
  const defenderUnit = UNITS[context.defender.unitId];
  const positioned = context.rollPosition === 'minimum'
    ? attackerUnit.damage[0]
    : context.rollPosition === 'maximum'
      ? attackerUnit.damage[1]
      : luckPosition(attackerUnit.damage[0], attackerUnit.damage[1], context.luck);
  const attack = attackerUnit.attack + context.attackerHeroAttack;
  const defense = defenderUnit.defense + context.defenderHeroDefense
    + (context.defender.defended ? 2 : 0);
  let damage = context.attacker.count * positioned
    * attackDefenseMultiplier(attack, defense);
  damage *= context.abilityMultiplier ?? 1;
  if (context.ranged && (context.adjacentEnemy
      || hexDistance(context.attacker.position, context.defender.position) > 7)) {
    damage *= 0.5;
  }
  if (context.ranged && context.wallsPenalty) damage *= 0.7;
  return Math.max(1, Math.round(damage));
}

export function applyDamage(stack: BattleStack, damage: number): number {
  const hp = UNITS[stack.unitId].hp;
  const before = stack.count;
  const totalHp = (stack.count - 1) * hp + stack.topHp;
  const remaining = Math.max(0, totalHp - damage);
  stack.count = Math.ceil(remaining / hp);
  stack.topHp = remaining === 0 ? 0 : ((remaining - 1) % hp) + 1;
  return before - stack.count;
}

export function sideOfEnemy(side: BattleSide): BattleSide {
  return side === 'attacker' ? 'defender' : 'attacker';
}

export function canUseRanged(stack: BattleStack): boolean {
  return abilityHandlers(stack.unitId).some(
    (handler) => handler.canRangedAttack?.(stack) === true,
  );
}

export function hasAdjacentEnemy(stack: BattleStack, stacks: BattleStack[]): boolean {
  return stacks.some(
    (other) => other.count > 0 && other.side !== stack.side
      && isAdjacent(stack.position, other.position),
  );
}
