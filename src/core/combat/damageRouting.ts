import type { BattleStack, BattleState } from '../types';
import { applyDamage, stackUnitHp } from './damage';
import { originalOwnerSide } from './ownership';
import { addSpellCounter } from './magicEffects';
import { stackHasAbility } from './abilities';
import { stacksAdjacent } from './footprint';

export interface AppliedDamage {
  target: BattleStack;
  damage: number;
  kills: number;
  destroyed: boolean;
  hpBefore: number;
  countBefore: number;
}

export interface RoutedDamageResult {
  primary: AppliedDamage;
  linked: AppliedDamage | null;
}

interface WardRoutingOptions {
  sourceStack?: BattleStack;
  onUpgradedWard?: (source: BattleStack, ward: BattleStack['effects'][number]) => void;
}

/** Resolves the next-damage Ward reducer at the shared damage-routing boundary. */
export function routeWardDamage(
  target: BattleStack, amount: number, options: WardRoutingOptions = {},
): number {
  const ward = target.effects.find((effect) => effect.spellId === 'ward');
  if (!ward) return amount;
  target.effects = target.effects.filter((effect) => effect.id !== ward.id);
  if (ward.magnitude >= 2 && options.sourceStack?.count) {
    options.onUpgradedWard?.(options.sourceStack, ward);
  }
  return 0;
}

function applyOne(
  battle: BattleState,
  target: BattleStack,
  amount: number,
  recordDestruction: boolean,
): AppliedDamage {
  const wasAlive = target.count > 0;
  const countBefore = target.count;
  const hpBefore = target.count <= 0 ? 0
    : (target.count - 1) * stackUnitHp(target) + target.topHp;
  const hpAvailable = hpBefore;
  const requested = Math.min(hpAvailable, Math.max(0, Math.round(amount)));
  const hold = battle.enchantments[target.side].find((entry) => entry.spellId === 'holdTheLine');
  const saved = requested >= hpBefore && hpBefore > 0 && hold
    && battle.holdLineUsedRound?.[target.side] !== battle.round;
  const damage = saved ? Math.max(0, hpBefore - 1) : requested;
  const kills = applyDamage(target, damage);
  if (saved) {
    battle.holdLineUsedRound ??= {};
    battle.holdLineUsedRound[target.side] = battle.round;
    if (hold.upgraded) addSpellCounter(battle, target, 'bloom', 3, hold.side);
    battle.log.push('Hold the Line leaves one unit standing.');
  }
  target.damageTaken = (target.damageTaken ?? 0) + damage;
  const owner = originalOwnerSide(target);
  battle.casualties[owner][target.unitId] =
    (battle.casualties[owner][target.unitId] ?? 0) + kills;
  const destroyed = wasAlive && target.count <= 0;
  if (destroyed) target.destroyedRound = battle.round;
  if (destroyed && recordDestruction) battle.destroyedStacks += 1;
  return { target, damage, kills, destroyed, hpBefore, countBefore };
}

/**
 * Applies one damage instance and its optional one-hop link share. The linked instance deliberately
 * does not inspect the recipient's link, so links can never recurse or bounce.
 */
export function applyRoutedCombatDamage(
  battle: BattleState,
  target: BattleStack,
  amount: number,
  options: {
    routeLink?: boolean;
    recordDestruction?: boolean;
    consumeWard?: boolean;
    applyAbilityReducers?: boolean;
    sourceStack?: BattleStack;
    onUpgradedWard?: (source: BattleStack, ward: BattleStack['effects'][number]) => void;
  } = {},
): RoutedDamageResult {
  const recordDestruction = options.recordDestruction ?? true;
  const protectedByPhalanx = options.applyAbilityReducers !== false
    && battle.stacks.some((stack) => stack.count > 0
    && stack.side === target.side && stack.id !== target.id
    && stackHasAbility(stack, 'phalanx') && stacksAdjacent(stack, target));
  const reducedAmount = protectedByPhalanx ? amount * 0.85 : amount;
  const routedAmount = options.consumeWard === false
    ? reducedAmount : routeWardDamage(target, reducedAmount, options);
  const primary = applyOne(battle, target, routedAmount, recordDestruction);
  let linked: AppliedDamage | null = null;
  if (options.routeLink !== false && target.damageLink) {
    const endpoint = battle.stacks.find((stack) =>
      stack.id === target.damageLink!.targetId && stack.count > 0);
    if (endpoint) {
      linked = applyOne(
        battle, endpoint, primary.damage * target.damageLink.share, recordDestruction,
      );
    }
  }
  // A link is active only while both serialized endpoints are alive. Route the current instance
  // first, then clear both directions if that instance destroyed either endpoint.
  if (!target.count || (linked && !linked.target.count)) {
    const endpointId = target.damageLink?.targetId;
    target.damageLink = undefined;
    target.effects = target.effects.filter((effect) => effect.spellId !== 'yoke');
    const endpoint = battle.stacks.find((stack) => stack.id === endpointId);
    if (endpoint?.damageLink?.targetId === target.id) endpoint.damageLink = undefined;
    if (endpoint) endpoint.effects = endpoint.effects.filter((effect) => effect.spellId !== 'yoke');
  } else if (target.damageLink && !battle.stacks.some((stack) =>
    stack.id === target.damageLink!.targetId && stack.count > 0)) {
    const endpointId = target.damageLink.targetId;
    target.damageLink = undefined;
    target.effects = target.effects.filter((effect) => effect.spellId !== 'yoke');
    const endpoint = battle.stacks.find((stack) => stack.id === endpointId);
    if (endpoint?.damageLink?.targetId === target.id) endpoint.damageLink = undefined;
    if (endpoint) endpoint.effects = endpoint.effects.filter((effect) => effect.spellId !== 'yoke');
  }
  return { primary, linked };
}
