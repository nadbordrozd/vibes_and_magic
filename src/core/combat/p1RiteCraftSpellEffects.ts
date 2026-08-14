import { UNITS } from '../../content/units';
import type { Action, BattleHero, BattleSide, BattleStack, BattleState } from '../types';
import { stacksAdjacent } from './footprint';
import { hexDistance } from './hex';
import { addTimedEffect, grantMeter, loseMeter } from './magicEffects';
import { applyRoutedCombatDamage } from './damageRouting';
import { stackHasAbility } from './abilities';
import {
  applyImpactDamage, cloneCompany, detonateCounter, grantMidBattleResonance,
  grantShots, resurrectCompany, scheduleGrantedCompanyActions, stunCompany, teleportCompany,
  type PrimitiveResult,
} from './primitives';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;

const stack = (battle: BattleState, id?: string) =>
  battle.stacks.find((candidate) => candidate.id === id);

function requireResult<T>(result: PrimitiveResult<T>): T {
  if (!result.ok) throw new Error(`${result.reason.code}: ${result.reason.text}`);
  return result.value;
}

function effect(
  battle: BattleState, target: BattleStack, spellId: CastAction['spellId'], magnitude: number,
  side: BattleSide, expiresRound?: number,
) {
  const applied = addTimedEffect(target, spellId, 99, magnitude, true, side, battle);
  applied.expiresRound = expiresRound;
  return applied;
}

function nearestAlly(battle: BattleState, target: BattleStack, side: BattleSide) {
  return battle.stacks.filter((candidate) => candidate.side === side && candidate.count > 0)
    .sort((a, b) => hexDistance(a.position, target.position) - hexDistance(b.position, target.position)
      || a.slot - b.slot || a.id.localeCompare(b.id))[0];
}

/** Resolver for every docs-61 P1 Rite/Craft combat spell. */
export function resolveP1RiteCraftSpell(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): boolean {
  const target = stack(battle, action.targetId);
  const allies = battle.stacks.filter((candidate) => candidate.side === side && candidate.count > 0);
  if (action.spellId === 'kindle') {
    requireResult(applyImpactDamage(battle, {
      targetId: target!.id, sourceSide: side, base: plus ? 16 : 12,
      coefficient: 0, spellPower: 0, cap: plus ? 16 : 12,
    }));
    if (plus && target!.count > 0 && !stackHasAbility(target!, 'mindless')) {
      loseMeter(target!, 10, battle);
    }
  } else if (action.spellId === 'sunlance') {
    const vengeance = target!.destroyedCompanyForSides?.includes(side) ? 1.5 : 1;
    requireResult(applyImpactDamage(battle, {
      targetId: target!.id, sourceSide: side, base: 8, coefficient: 4,
      spellPower: hero.spellPower, cap: 40, modifier: vengeance,
    }));
    if (plus) {
      const recipient = nearestAlly(battle, target!, side);
      if (recipient) grantMeter(recipient, 10, battle);
    }
  } else if (action.spellId === 'steadyHands') {
    const targets = [target, plus ? stack(battle, action.secondaryTargetId) : undefined]
      .filter((candidate): candidate is BattleStack => Boolean(candidate));
    if (targets.length !== (plus ? 2 : 1) || new Set(targets.map((candidate) => candidate.id)).size !== targets.length) {
      throw new Error(plus ? 'Steady Hands requires two different allied companies' : 'Steady Hands requires one allied company');
    }
    targets.forEach((candidate) => {
      effect(battle, candidate, action.spellId, 1, side, battle.round);
      effect(battle, candidate, action.spellId, 2, side);
    });
  } else if (action.spellId === 'secondWind') {
    requireResult(resurrectCompany(battle, target!.id, (plus ? 30 : 20) * hero.spellPower));
  } else if (action.spellId === 'litanyOfDawn') {
    allies.forEach((candidate) => {
      grantMeter(candidate, plus ? 40 : 25, battle);
      effect(battle, candidate, 'blessing', 1, side);
      if (plus) effect(battle, candidate, action.spellId, 1, side, battle.round);
    });
  } else if (action.spellId === 'holdTheLine') {
    return false; // ordinary enchantment insertion is owned by the main resolver
  } else if (action.spellId === 'consecratedGround') {
    if (plus) requireResult(grantMidBattleResonance(battle, side, 'rite'));
    else battle.resonance = 'rite';
  } else if (action.spellId === 'reprise') {
    requireResult(scheduleGrantedCompanyActions(
      battle, target!.id, action.spellId, 'immediate', battle.round, plus ? 2 : 1,
    ));
    if (!plus) requireResult(scheduleGrantedCompanyActions(
      battle, target!.id, action.spellId, 'pre-order', battle.round + 1,
    ));
  } else if (action.spellId === 'rivet') {
    const defense = effect(battle, target!, action.spellId, plus ? 3 : 2, side);
    defense.duration = target!.id === battle.currentStackId ? 2 : 1;
    defense.id += ':defense';
    const retaliation = effect(battle, target!, action.spellId, 0, side);
    retaliation.duration = 99;
    retaliation.expiresRound = battle.round;
    retaliation.id += ':double-retaliation';
    if (plus) {
      const additional = effect(battle, target!, action.spellId, 0, side);
      additional.duration = 99;
      additional.expiresRound = battle.round;
      additional.id += ':plus-extra-retaliation';
    }
  } else if (action.spellId === 'whetstone') {
    const attack = effect(battle, target!, action.spellId, 3, side, battle.round + 1);
    attack.id += ':attack';
    if (plus) {
      const rider = effect(battle, target!, action.spellId, 0, side, battle.round);
      rider.id += ':no-retaliation';
    }
  } else if (action.spellId === 'shrapnel') {
    const applied = effect(battle, target!, action.spellId, plus ? 2 : 1, side);
    applied.id += plus ? ':free-shot' : '';
  } else if (action.spellId === 'ammunitionCart') {
    allies.filter((candidate) => UNITS[candidate.unitId].abilities.includes('ranged'))
      .forEach((candidate) => {
        const printed = UNITS[candidate.unitId].shots ?? 0;
        if (printed > candidate.shots) requireResult(grantShots(battle, candidate.id, printed - candidate.shots));
        if (plus) effect(battle, candidate, action.spellId, 1, side);
      });
  } else if (action.spellId === 'detonate') {
    const outcome = requireResult(detonateCounter(
      battle, target!.id, 'burn', 8, 3, hero.spellPower, side,
    ));
    if (plus) battle.stacks.filter((candidate) => candidate.count > 0
      && candidate.id !== target!.id && stacksAdjacent(candidate, target!))
      .sort((a, b) => a.side.localeCompare(b.side) || a.slot - b.slot || a.id.localeCompare(b.id))
      .forEach((candidate) => requireResult(applyImpactDamage(battle, {
        targetId: candidate.id, sourceSide: side,
        base: Math.round(outcome.consumed * (8 + 3 * hero.spellPower) / 2),
        coefficient: 0, spellPower: 0,
      })));
  } else if (action.spellId === 'clockworkDouble') {
    const destination = action.positions?.[0];
    if (!destination) throw new Error('Clockwork Double requires a legal destination');
    const percent = Math.min(1, 0.25 + 0.05 * hero.spellPower);
    const count = Math.max(1, Math.ceil(target!.count * percent));
    requireResult(cloneCompany(battle, target!.id, count, destination, plus));
  } else if (action.spellId === 'blink') {
    const destination = action.positions?.[0];
    if (!destination) throw new Error('Blink requires a legal destination');
    requireResult(teleportCompany(battle, target!.id, destination));
    if (plus && action.secondaryTargetId) {
      const second = action.positions?.[1];
      if (!second || action.secondaryTargetId === target!.id) {
        throw new Error('Upgraded Blink needs two different companies and destinations');
      }
      requireResult(teleportCompany(battle, action.secondaryTargetId, second));
    } else if (plus && action.actImmediately) {
      requireResult(scheduleGrantedCompanyActions(
        battle, target!.id, action.spellId, 'immediate', battle.round,
      ));
    }
  } else if (action.spellId === 'overclock') {
    const pendingStart = battle.pendingGrantedActions?.length ?? 0;
    requireResult(scheduleGrantedCompanyActions(
      battle, target!.id, action.spellId, 'immediate', battle.round, 2,
    ));
    battle.pendingGrantedActions![pendingStart + 1].timing = 'round-end';
    const delayedRound = battle.round + (plus ? 2 : 1);
    // The stun primitive owns forfeiture; its counter is queued now and consumed on the named round.
    target!.effects.push({
      id: `overclock-stun:${delayedRound}`, spellId: 'overclock', duration: 99,
      magnitude: delayedRound, beneficial: false, sourceSide: side,
    });
  } else return false;
  return true;
}

export function applyOverclockRoundStuns(battle: BattleState): void {
  for (const candidate of battle.stacks) {
    const marker = candidate.effects.find((entry) => entry.id === `overclock-stun:${battle.round}`);
    if (!marker) continue;
    candidate.effects = candidate.effects.filter((entry) => entry.id !== marker.id);
    requireResult(stunCompany(battle, candidate.id, 1));
  }
}

export function applyP1AttackModifiers(
  battle: BattleState, attacker: BattleStack, defender: BattleStack,
  isRetaliation: boolean,
): { attack: number; defense: number; multiplier: number; ignoreRetaliation: boolean; ignoreLongRange: boolean } {
  const whetstone = attacker.effects.find((entry) =>
    entry.spellId === 'whetstone' && entry.id.includes(':attack'));
  const rivet = defender.effects.find((entry) =>
    entry.spellId === 'rivet' && entry.id.includes(':defense'));
  const retaliationRivet = isRetaliation
    ? attacker.effects.find((entry) =>
      entry.spellId === 'rivet' && entry.id.includes(':double-retaliation'))
    : undefined;
  if (retaliationRivet) {
    attacker.effects = attacker.effects.filter((entry) => entry.id !== retaliationRivet.id);
  }
  return {
    attack: whetstone?.magnitude ?? 0,
    defense: rivet?.magnitude ?? 0,
    multiplier: retaliationRivet ? 2 : 1,
    ignoreRetaliation: Boolean(attacker.effects.some((entry) =>
      entry.spellId === 'whetstone' && entry.id.includes(':no-retaliation'))
      || attacker.effects.some((entry) => entry.spellId === 'steadyHands' && entry.magnitude === 2)),
    ignoreLongRange: attacker.effects.some((entry) => entry.spellId === 'ammunitionCart'),
  };
}

export function consumeP1AttackEffects(attacker: BattleStack): void {
  const oneShot = attacker.effects.filter((entry) =>
    (entry.spellId === 'whetstone' && entry.id.includes(':no-retaliation'))
    || (entry.spellId === 'steadyHands' && entry.magnitude === 2));
  attacker.effects = attacker.effects.filter((entry) => !oneShot.includes(entry));
}

export function resolveShrapnelSplash(
  battle: BattleState, attacker: BattleStack, primary: BattleStack, damage: number,
): void {
  const shrapnel = attacker.effects.find((entry) => entry.spellId === 'shrapnel');
  if (!shrapnel) return;
  attacker.effects = attacker.effects.filter((entry) => entry.id !== shrapnel.id);
  if (shrapnel.id.includes(':free-shot')) attacker.shots += 1;
  battle.stacks.filter((candidate) => candidate.count > 0 && candidate.id !== primary.id
    && stacksAdjacent(candidate, primary))
    .sort((a, b) => a.side.localeCompare(b.side) || a.slot - b.slot || a.id.localeCompare(b.id))
    .forEach((candidate) => applyRoutedCombatDamage(
      battle, candidate, Math.round(damage / 2), { sourceStack: attacker },
    ));
}

export function recordP1CompanyDestruction(killer: BattleStack, destroyed: BattleStack): void {
  killer.destroyedCompanyForSides ??= [];
  if (!killer.destroyedCompanyForSides.includes(destroyed.side)) {
    killer.destroyedCompanyForSides.push(destroyed.side);
  }
}
