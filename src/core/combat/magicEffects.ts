import { UNITS } from '../../content/units';
import type {
  BattleSide, BattleStack, BattleState, CounterId, SpellId, TimedEffect,
} from '../types';
import { applyDamage } from './damage';
import { isAdjacent } from './hex';
import { MORALE_THRESHOLD } from '../../content/constants';

export const scaledDuration = (base: number, spellPower: number) =>
  base + Math.floor(spellPower / 6);
export const scaledCounter = (base: number, spellPower: number) =>
  base + Math.floor(spellPower / 5);
export const scaledPercent = (base: number, spellPower: number) =>
  base + Math.floor(spellPower / 2);

export function totalStackHp(stack: BattleStack): number {
  return stack.count <= 0 ? 0
    : (stack.count - 1) * UNITS[stack.unitId].hp + stack.topHp;
}

export function addCounter(
  stack: BattleStack,
  counter: CounterId,
  amount: number,
): void {
  stack.counters[counter] = Math.min(9, stack.counters[counter] + amount);
}

export function grantMeter(stack: BattleStack, amount: number): void {
  stack.morale = Math.max(0, stack.morale + amount);
  while (stack.morale >= MORALE_THRESHOLD) {
    stack.morale -= MORALE_THRESHOLD;
    stack.bonusActions += 1;
  }
}

export function clearCounters(stack: BattleStack): number {
  const removed = Object.values(stack.counters).reduce((sum, count) => sum + count, 0);
  stack.counters = { burn: 0, chill: 0, hex: 0, bloom: 0 };
  return removed;
}

export function healWithoutResurrection(stack: BattleStack, percent: number): number {
  if (stack.count <= 0) return 0;
  const hp = UNITS[stack.unitId].hp;
  const before = stack.topHp;
  stack.topHp = Math.min(hp, stack.topHp + Math.ceil(stack.count * hp * percent / 100));
  return stack.topHp - before;
}

export function addTimedEffect(
  stack: BattleStack,
  spellId: SpellId,
  duration: number,
  magnitude: number,
  beneficial: boolean,
  sourceSide: BattleSide,
): TimedEffect {
  const effect: TimedEffect = {
    id: `${spellId}-${sourceSide}-${stack.id}-${stack.effects.length}`,
    spellId, duration, magnitude, beneficial, sourceSide,
  };
  stack.effects.push(effect);
  return effect;
}

export function effectOn(stack: BattleStack, spellId: SpellId): TimedEffect | undefined {
  return stack.effects.find((effect) => effect.spellId === spellId && effect.duration > 0);
}

export function enchantmentMultiplier(
  battle: BattleState,
  side: BattleSide,
  spellId: SpellId,
): number {
  return battle.enchantments[side].find((effect) => effect.spellId === spellId)
    ?.multiplier ?? 0;
}

export function effectiveSpeed(stack: BattleStack): number {
  const quicksilver = effectOn(stack, 'quicksilver')?.magnitude ?? 0;
  return Math.max(1, UNITS[stack.unitId].speed + quicksilver - stack.counters.chill);
}

export function beginStackTurn(battle: BattleState, stack: BattleStack): void {
  if (stack.count <= 0) return;
  const burn = stack.counters.burn;
  if (burn > 0) {
    const forgefire = enchantmentMultiplier(
      battle, stack.side === 'attacker' ? 'defender' : 'attacker', 'forgefire',
    );
    const damage = Math.max(burn, Math.ceil(totalStackHp(stack) * burn / 100))
      * (forgefire ? 2 * forgefire : 1);
    const kills = applyDamage(stack, damage);
    battle.casualties[stack.side][stack.unitId] =
      (battle.casualties[stack.side][stack.unitId] ?? 0) + kills;
    battle.log.push(`${UNITS[stack.unitId].name} suffers ${damage} Burn damage.`);
  }
  const bloom = stack.counters.bloom;
  if (bloom > 0) {
    const healed = healWithoutResurrection(stack, bloom);
    battle.log.push(`${UNITS[stack.unitId].name} Blooms for ${healed} HP.`);
  }
  if (battle.spellWalls.some((wall) => isAdjacent(wall, stack.position))) {
    const enemy = stack.side === 'attacker' ? 'defender' : 'attacker';
    const upgradedWall = battle.enchantments[enemy].some(
      (effect) => effect.spellId === 'wallOfTheMaker',
    );
    if (upgradedWall) addCounter(stack, 'burn', 1);
  }
}

export function endStackTurn(battle: BattleState, stack: BattleStack): void {
  const enemy = stack.side === 'attacker' ? 'defender' : 'attacker';
  const noBurnDecay = battle.enchantments[enemy].some(
    (effect) => effect.spellId === 'forgefire' && effect.upgraded,
  );
  for (const counter of ['burn', 'chill', 'hex', 'bloom'] as CounterId[]) {
    if (counter === 'burn' && noBurnDecay) continue;
    stack.counters[counter] = Math.max(0, stack.counters[counter] - 1);
  }
  for (const effect of stack.effects) effect.duration -= 1;
  stack.effects = stack.effects.filter((effect) => effect.duration > 0);
}
