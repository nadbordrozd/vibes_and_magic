import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import type { CreatureResistance } from '../../content/v2/schema';
import type { BattleSide, BattleStack, BattleState, CounterId, SpellId } from '../types';
import { stackHasAbility } from './abilities';

export function stackResistances(stack: BattleStack): readonly CreatureResistance[] {
  return UNITS[stack.unitId].resistances ?? [];
}

export function counterImmunity(stack: BattleStack, counter: CounterId): boolean {
  const kind = counter === 'burn' ? 'unburnable'
    : counter === 'chill' ? 'unchillable' : counter === 'hex' ? 'unhexable' : null;
  return Boolean(kind && (stackHasAbility(stack, kind)
    || stackResistances(stack).some((entry) => entry.kind === 'counter-immune'
      && entry.counter === counter)));
}

export function spellDamageMultiplier(stack: BattleStack, impact: boolean): number {
  let multiplier = 1;
  for (const resistance of stackResistances(stack)) {
    if (resistance.kind === 'warded-hide') multiplier *= 1 - resistance.percent / 100;
    if (resistance.kind === 'spell-frail') multiplier *= 1.5;
    if (impact && resistance.kind === 'spell-shrug') multiplier *= 0.5;
  }
  if (impact && stackHasAbility(stack, 'spell_shrug')) multiplier *= 0.5;
  if (stackHasAbility(stack, 'spell_frail')
      && !stackResistances(stack).some((entry) => entry.kind === 'spell-frail')) multiplier *= 1.5;
  return multiplier;
}

export function spellCounterBonus(stack: BattleStack): number {
  return stackHasAbility(stack, 'spell_frail')
    || stackResistances(stack).some((entry) => entry.kind === 'spell-frail') ? 1 : 0;
}

/** Shared recipient gate for every mutation made while resolving a spell face. */
export function spellRecipientAllowed(battle: BattleState, stack: BattleStack): boolean {
  const source = battle.spellResolutionSource;
  if (!source) return true;
  if (source.skippedRecipientIds.includes(stack.id)) return false;
  const spell = SPELLS[source.spellId];
  const resistances = stackResistances(stack);
  let reason: string | null = stack.effects.some((effect) =>
    effect.id.startsWith('spell-immune:'))
    ? 'Spell Immunity' : null;
  if (!reason && (spell.tier ?? 1) <= 2
      && resistances.some((entry) => entry.kind === 'low-magic-immune')) {
    reason = 'Low Magic Immunity';
  }
  const ward = resistances.find((entry) => entry.kind === 'spell-ward');
  if (!reason && ward?.kind === 'spell-ward') {
    const used = stack.abilityUses?.spell_ward ?? 0;
    if (used < ward.charges) {
      stack.abilityUses = { ...stack.abilityUses, spell_ward: used + 1 };
      reason = `Spell Ward ${used + 1}/${ward.charges}`;
    }
  }
  if (!reason) return true;
  source.skippedRecipientIds.push(stack.id);
  battle.log.push(`${UNITS[stack.unitId].name}: ${reason}; ${spell.name} has no effect.`);
  return false;
}

export interface ResistanceResolution {
  target: BattleStack;
  blocked: boolean;
  reason?: string;
}

export function pendingDeflectTargets(
  battle: BattleState, sourceSide: BattleSide,
): BattleStack[] {
  return battle.stacks.filter((stack) => stack.count > 0 && stack.side === sourceSide
    && !stackHasAbility(stack, 'spellbound'))
    .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id));
}

/** Deterministic per-company spell gate. Cast costs are deliberately paid by the caller. */
export function resolveTargetResistance(
  battle: BattleState, sourceSide: BattleSide, spellId: SpellId, target: BattleStack,
  deflectTargetId?: string,
): ResistanceResolution {
  const spell = SPELLS[spellId];
  const singleTarget = spell.targeting?.startsWith('single-') || spell.targeting === 'self';
  const hostile = target.side !== sourceSide;
  const resistances = stackResistances(target);
  if (singleTarget && resistances.some((entry) => entry.kind === 'low-magic-immune')
      && (spell.tier ?? 1) <= 2) {
    return { target, blocked: true, reason: 'Low Magic Immunity' };
  }
  if (singleTarget && resistances.some((entry) => entry.kind === 'school-resistant'
      && entry.school === spell.school)) {
    return { target, blocked: true, reason: `${spell.school} resistance` };
  }
  const ward = resistances.find((entry) => entry.kind === 'spell-ward');
  if (ward?.kind === 'spell-ward') {
    const used = target.abilityUses?.spell_ward ?? 0;
    if (used < ward.charges) {
      target.abilityUses = { ...target.abilityUses, spell_ward: used + 1 };
      return { target, blocked: true, reason: `Spell Ward ${used + 1}/${ward.charges}` };
    }
  }
  const deflect = hostile && singleTarget
    && resistances.some((entry) => entry.kind === 'spell-deflect')
    && (target.abilityUses?.spell_deflect ?? 0) === 0;
  if (deflect) {
    const legal = pendingDeflectTargets(battle, sourceSide);
    if (!deflectTargetId) return { target, blocked: true, reason: 'awaiting Spell Deflect choice' };
    const redirected = legal.find((stack) => stack.id === deflectTargetId);
    if (redirected) {
      target.abilityUses = { ...target.abilityUses, spell_deflect: 1 };
      battle.log.push(`${UNITS[target.unitId].name} deflects ${SPELLS[spellId].name} to ${UNITS[redirected.unitId].name}.`);
      return { target: redirected, blocked: false };
    }
  }
  return { target, blocked: false };
}
