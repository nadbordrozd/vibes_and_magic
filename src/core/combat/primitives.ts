import { BATTLE_COLS, BATTLE_ROWS } from '../../content/constants';
import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import {
  EFFECT_PRIMITIVE_CONTRACTS,
  effectPrimitiveHandler,
  registerEffectPrimitiveHandler,
} from '../../content/v2/registries';
import type {
  EffectPrimitiveHandler, EffectPrimitiveId,
} from '../../content/v2/schema';
import type {
  AbilityId, BattleDelayedEffect, BattleHero, BattleSide, BattleStack, BattleState,
  CounterId, Coord, HazardHexEffect, ItemId, SpellId, SpellSchool,
} from '../types';
import { sameCoord } from '../map/pathfinding';
import { stackUnitHp } from './damage';
import { footprintFits, occupiedByStacks, stackHexes, stackIsOnField } from './footprint';
import { hexDistance } from './hex';
import { addBattleCounter, addSpellCounter, clearCounterPile, totalStackHp } from './magicEffects';
import { createBattleTile, placeBattleTile } from './tiles';
import { applyRoutedCombatDamage } from './damageRouting';
import { runExternalDeathPipeline } from './pipeline';
import { skillRank } from '../heroBehaviors';
import { stackHasAbility } from './abilities';
import { spellDamageMultiplier, spellRecipientAllowed } from './creatureTraits';
import { artifactEffectTotal, forcedMoveDistance, hasArtifactEffect, preventArtifactTeleport } from '../artifacts';
import { recordP2ExtraAction } from './p2SpellEffects';

export const COMBAT_PRIMITIVE_REASON_TEXT = {
  'target-not-found': 'The chosen company is not present.',
  'target-defeated': 'A defeated company is not eligible.',
  'target-spell-immune': 'That company ignores this low-tier spell.',
  'mind-control-ally': 'Mind control requires a living enemy company.',
  'target-summoned': 'Summoned companies cannot be resurrected or copied.',
  'starting-count-cap': 'Resurrection cannot exceed the company’s starting count.',
  'control-hp-cap': 'That company is too large to control.',
  'already-controlled': 'A company may be controlled only once per battle.',
  'control-third-party': 'A controlled company cannot be given to a third party.',
  'control-extension': 'Control cannot be extended by recasting it.',
  'already-linked': 'A company may carry only one damage link.',
  'link-target-linked': 'The other company already carries a damage link.',
  'link-self': 'A company cannot be linked to itself.',
  'illegal-destination': 'The destination does not fit the company’s footprint.',
  'clone-source-cloned': 'A summoned or cloned company cannot be cloned.',
  'spellbound-source': 'Spellbound companies cannot lend an ability.',
  'copied-ability-source': 'A copied ability cannot be copied again.',
  'copy-forbidden': 'That spell cannot be copied by this effect.',
  'mana-copy-forbidden': 'A spell that grants mana cannot be copied.',
  'extra-action-cap': 'A company may receive at most two granted extra actions per round.',
  'last-allied-company': 'The last allied company cannot be sacrificed.',
  'counter-empty': 'The chosen counter pile is empty.',
  'counter-cap': 'Counters cannot exceed the visible cap.',
  'hazard-occupied': 'A persistent tile already occupies that hex.',
  'invalid-value': 'The requested magnitude or duration is invalid.',
  'resurrection-event-claimed': 'Another save already claimed this destruction event.',
  'resurrection-footprint-blocked': 'The fallen company’s original footprint is occupied or blocked.',
} as const;

export type CombatPrimitiveReasonCode = keyof typeof COMBAT_PRIMITIVE_REASON_TEXT;
export type PrimitiveResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; reason: { code: CombatPrimitiveReasonCode; text: string } };

const ok = <T>(value: T): PrimitiveResult<T> => ({ ok: true, value });
const blocked = <T = undefined>(code: CombatPrimitiveReasonCode): PrimitiveResult<T> => ({
  ok: false, reason: { code, text: COMBAT_PRIMITIVE_REASON_TEXT[code] },
});
const stackById = (battle: BattleState, id: string): BattleStack | undefined =>
  battle.stacks.find((stack) => stack.id === id);
const heroFor = (battle: BattleState, side: BattleSide): BattleHero | null =>
  side === 'attacker' ? battle.attackerHero : battle.defenderHero;

/** Shared death-trigger ownership: opposing Silence suppresses before an owner's upgrade doubles. */
export function ownerDeathTriggerCount(battle: BattleState, ownerSide: BattleSide): number {
  const opposingSide = ownerSide === 'attacker' ? 'defender' : 'attacker';
  if (battle.enchantments[opposingSide].some((effect) =>
    effect.spellId === 'silenceThePassing')) return 0;
  const ownUpgrade = battle.enchantments[ownerSide].some((effect) =>
    effect.spellId === 'silenceThePassing' && effect.upgraded) ? 2 : 1;
  return ownUpgrade * battle.deathTriggerMultiplier[ownerSide];
}

export interface ImpactDamagePayload {
  targetId: string;
  sourceSide: BattleSide;
  base: number;
  coefficient: number;
  spellPower: number;
  cap?: number;
  halfRateAbovePower?: number;
  modifier?: number;
  sourceStackId?: string;
  /** Linked damage calls set this; it is never routed through another link. */
  fromLink?: boolean;
}

export function computeImpactDamage(payload: Omit<ImpactDamagePayload, 'targetId' | 'sourceSide'>): number {
  const threshold = payload.halfRateAbovePower;
  const scaledPower = threshold === undefined || payload.spellPower <= threshold
    ? payload.spellPower
    : threshold + (payload.spellPower - threshold) / 2;
  const raw = (payload.base + payload.coefficient * scaledPower) * (payload.modifier ?? 1);
  return Math.max(0, Math.round(payload.cap === undefined ? raw : Math.min(payload.cap, raw)));
}

function routeImpactReducers(
  battle: BattleState, target: BattleStack,
): number {
  let multiplier = 1 + target.counters.hex * 0.05;
  multiplier *= spellDamageMultiplier(target, true);
  const veil = target.effects.find((effect) => effect.spellId === 'mournersVeil');
  if (veil) multiplier *= 1 - veil.magnitude / 100;
  const ironclad = battle.enchantments[target.side].find(
    (effect) => effect.spellId === 'ironclad',
  );
  if (ironclad) {
    const hero = heroFor(battle, target.side);
    const defense = UNITS[target.unitId].defense + (hero?.defense ?? 0);
    if (defense >= (ironclad.upgraded ? 10 : 12)) multiplier *= 0.5 ** ironclad.multiplier;
  }
  return multiplier;
}

function applyImpactDamageInternal(
  battle: BattleState, payload: ImpactDamagePayload, deferDeathSettlement: boolean,
): PrimitiveResult<{
  damage: number; kills: number; linkedDamage: number;
  primary: import('./damageRouting').AppliedDamage;
  linked: import('./damageRouting').AppliedDamage | null;
}> {
  const target = stackById(battle, payload.targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!spellRecipientAllowed(battle, target)) return blocked('target-spell-immune');
  const hero = heroFor(battle, payload.sourceSide);
  const evoker = hero ? skillRank(hero, 'evoker') : 0;
  const evokerMultiplier = evoker ? 1 + [0, 0.25, 0.5, 0.75][evoker] : 1;
  const artifactImpact = hero && battle.spellResolutionSource
    ? artifactEffectTotal(hero, 'impact_bonus') * payload.spellPower : 0;
  const amount = computeImpactDamage({ ...payload, base: payload.base + artifactImpact,
    modifier: (payload.modifier ?? 1) * evokerMultiplier })
    * (battle.spellResolutionSource?.magnitudeMultiplier ?? 1)
    * routeImpactReducers(battle, target);
  const sourceStack = payload.sourceStackId ? stackById(battle, payload.sourceStackId) : undefined;
  const routed = applyRoutedCombatDamage(battle, target, amount, {
    routeLink: !payload.fromLink,
    recordDestruction: !deferDeathSettlement,
    sourceStack,
    onUpgradedWard: (source, ward) => addBattleCounter(
      battle, source, 'burn', 2, ward.sourceSide,
    ),
  });
  if (!deferDeathSettlement) {
    if (routed.primary.destroyed) queueDestroyedCompanyTriggers(battle, target.id);
    if (routed.linked?.destroyed) queueDestroyedCompanyTriggers(battle, routed.linked.target.id);
  }
  battle.log.push(`Impact damage deals ${routed.primary.damage} to ${UNITS[target.unitId].name}.`);
  if (hero && evoker >= 2 && routed.primary.damage > 0 && target.count > 0) {
    addBattleCounter(battle, target, 'burn', 1, payload.sourceSide);
  }
  return ok({
    damage: routed.primary.damage,
    kills: routed.primary.kills,
    linkedDamage: routed.linked?.damage ?? 0,
    primary: routed.primary,
    linked: routed.linked,
  });
}

export function applyImpactDamage(battle: BattleState, payload: ImpactDamagePayload) {
  return applyImpactDamageInternal(battle, payload, false);
}

/** Safe spell-impact transaction: routes damage and immediately settles every resulting death. */
export function applySpellImpactDamage(battle: BattleState, payload: ImpactDamagePayload) {
  const result = applyImpactDamageInternal(battle, payload, true);
  if (!result.ok) return result;
  for (const death of [result.value.primary, result.value.linked]) {
    if (death?.destroyed) runExternalDeathPipeline(
      battle, death.target, death.hpBefore, death.countBefore,
      'spell-impact', payload.sourceSide,
    );
  }
  return result;
}

/** Routes non-impact spell damage through the shared immunity and resistance boundary. */
export function applySpellDamage(
  battle: BattleState, target: BattleStack, amount: number,
  options: { recordDestruction?: boolean; sourceSide: BattleSide },
) {
  if (!spellRecipientAllowed(battle, target)) return null;
  const routed = applyRoutedCombatDamage(
    battle, target, Math.max(0, amount * (battle.spellResolutionSource?.magnitudeMultiplier ?? 1)
      * spellDamageMultiplier(target, false)),
    { recordDestruction: false },
  );
  if (options.recordDestruction !== false) for (const death of [routed.primary, routed.linked]) {
    if (death?.destroyed) runExternalDeathPipeline(
      battle, death.target, death.hpBefore, death.countBefore,
      'spell-impact', options.sourceSide,
    );
  }
  return routed;
}

export function massTargets(
  battle: BattleState,
  sourceSide: BattleSide,
  mode: 'mass-enemy' | 'mass-ally' | 'mass-all',
  source: 'spell' | 'other' = 'spell',
): BattleStack[] {
  return battle.stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack)
    && (mode === 'mass-all' || (mode === 'mass-ally' ? stack.side === sourceSide
      : stack.side !== sourceSide))
    && (source !== 'spell' || !isSpellImmune(stack)))
    .sort((a, b) => a.side.localeCompare(b.side) || a.slot - b.slot || a.id.localeCompare(b.id));
}

export function canResurrectCompany(
  battle: BattleState, targetId: string, hp: number,
): PrimitiveResult<BattleStack> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.summoned || target.cloneOf) return blocked('target-summoned');
  if (!(hp > 0)) return blocked('invalid-value');
  if (target.count <= 0) {
    const blockers = new Set([...battle.obstacles, ...battle.tiles.map((tile) => tile.position)]
      .map((coord) => `${coord.x},${coord.y}`));
    if (!footprintFits(
      target, target.position, occupiedByStacks(battle.stacks, target.id), blockers,
    )) return blocked('resurrection-footprint-blocked');
  }
  const initial = battle.initialCounts[target.id] ?? target.count;
  const beforeHp = target.count > 0 ? (target.count - 1) * stackUnitHp(target) + target.topHp : 0;
  if (Math.min(initial * stackUnitHp(target), beforeHp + Math.floor(hp)) <= beforeHp) {
    return blocked('starting-count-cap');
  }
  return ok(target);
}

export function resurrectCompany(
  battle: BattleState, targetId: string, hp: number,
): PrimitiveResult<{ hpRestored: number; countRevived: number }> {
  const eligible = canResurrectCompany(battle, targetId, hp);
  if (!eligible.ok) return eligible;
  const target = eligible.value;
  if (!spellRecipientAllowed(battle, target)) return blocked('target-spell-immune');
  const initial = battle.initialCounts[target.id] ?? target.count;
  const beforeCount = target.count;
  const beforeHp = target.count > 0 ? (target.count - 1) * stackUnitHp(target) + target.topHp : 0;
  const sourceSide = battle.spellResolutionSource
    ? battle.stacks.find((stack) => stack.id === battle.currentStackId)?.side : undefined;
  const sourceHero = sourceSide === 'attacker' ? battle.attackerHero
    : sourceSide === 'defender' ? battle.defenderHero : null;
  let adjustedHp = sourceHero && hasArtifactEffect(sourceHero, 'heal_bonus')
    ? hp * (1 + artifactEffectTotal(sourceHero, 'heal_bonus', 'percent') / 100) : hp;
  adjustedHp *= battle.spellResolutionSource?.magnitudeMultiplier ?? 1;
  const cappedHp = Math.min(initial * stackUnitHp(target), beforeHp + Math.floor(adjustedHp));
  if (cappedHp <= beforeHp) return blocked('starting-count-cap');
  target.count = Math.ceil(cappedHp / stackUnitHp(target));
  target.topHp = cappedHp - (target.count - 1) * stackUnitHp(target);
  return ok({ hpRestored: cappedHp - beforeHp, countRevived: target.count - beforeCount });
}

export function mindControlCompany(
  battle: BattleState, targetId: string, controller: BattleSide, duration: number, hpCap: number,
  retainControlEffects = false,
): PrimitiveResult<BattleStack> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!(duration > 0) || !(hpCap >= 0)) return blocked('invalid-value');
  if (target.side === controller && !target.originalSide) return blocked('mind-control-ally');
  if (target.originalSide && target.side !== target.originalSide) {
    return blocked(target.side === controller ? 'control-extension' : 'control-third-party');
  }
  if (target.controlledOnce) return blocked('already-controlled');
  if (totalStackHp(target) > hpCap) return blocked('control-hp-cap');
  target.originalSide = target.side;
  target.controlSnapshot = {
    counters: { ...target.counters }, effects: target.effects.map((effect) => ({ ...effect })),
    counterSources: { ...target.counterSources },
    counterDecayDelayed: { ...target.counterDecayDelayed },
    damageLinkTargetId: target.damageLink?.targetId,
  };
  const controllerHero = heroFor(battle, controller);
  const artifactDuration = controllerHero ? artifactEffectTotal(controllerHero, 'control_duration') : 0;
  target.controlRetainsEffects = retainControlEffects
    || Boolean(controllerHero && hasArtifactEffect(controllerHero, 'control_duration'));
  target.side = controller;
  target.controlExpiresRound = battle.round + Math.max(1, Math.floor(
    (duration + artifactDuration) * (battle.spellResolutionSource?.magnitudeMultiplier ?? 1)));
  target.controlledOnce = true;
  return ok(target);
}

export function expireMindControl(battle: BattleState): void {
  for (const stack of battle.stacks) {
    if (stack.controlExpiresRound !== undefined && stack.controlExpiresRound <= battle.round) {
      const controller = stack.side;
      if (!stack.controlRetainsEffects && stack.controlSnapshot) {
        const snapshot = stack.controlSnapshot;
        for (const counter of Object.keys(stack.counters) as CounterId[]) {
          stack.counters[counter] = Math.min(stack.counters[counter], snapshot.counters[counter]);
          if (stack.counters[counter] <= 0) clearCounterPile(stack, counter);
          else if (stack.counters[counter] === snapshot.counters[counter]) {
            stack.counterSources ??= {};
            stack.counterDecayDelayed ??= {};
            if (snapshot.counterSources[counter]) {
              stack.counterSources[counter] = snapshot.counterSources[counter];
            } else delete stack.counterSources[counter];
            if (snapshot.counterDecayDelayed[counter]) {
              stack.counterDecayDelayed[counter] = true;
            } else delete stack.counterDecayDelayed[counter];
          }
        }
        const originalEffectIds = new Set(snapshot.effects.map((effect) => effect.id));
        stack.effects = stack.effects.filter((effect) => originalEffectIds.has(effect.id));
        if (stack.damageLink && stack.damageLink.targetId !== snapshot.damageLinkTargetId) {
          const gainedPartnerId = stack.damageLink.targetId;
          unlinkCompany(battle, stack.id);
          const gainedPartner = stackById(battle, gainedPartnerId);
          if (gainedPartner) {
            gainedPartner.effects = gainedPartner.effects.filter((effect) =>
              effect.spellId !== 'yoke');
          }
        }
      }
      stack.side = stack.originalSide ?? stack.side;
      stack.originalSide = undefined;
      stack.controlExpiresRound = undefined;
      stack.controlSnapshot = undefined;
      stack.controlRetainsEffects = undefined;
      addSpellCounter(battle, stack, 'hex', 3, controller);
      battle.log.push(`${UNITS[stack.unitId].name} is no longer controlled.`);
    }
  }
}

export function linkCompanies(
  battle: BattleState, firstId: string, secondId: string, share: number, duration = 3,
  protectedLink = false,
): PrimitiveResult<undefined> {
  const first = stackById(battle, firstId);
  const second = stackById(battle, secondId);
  if (!first || !second) return blocked('target-not-found');
  if (first.count <= 0 || second.count <= 0) return blocked('target-defeated');
  if (first.id === second.id) return blocked('link-self');
  if (first.damageLink) return blocked('already-linked');
  if (second.damageLink) return blocked('link-target-linked');
  if (!(share > 0 && share <= 1) || !(duration > 0 && Number.isInteger(duration))) {
    return blocked('invalid-value');
  }
  const expiresRound = battle.round + duration;
  first.damageLink = { targetId: second.id, share, expiresRound, protected: protectedLink };
  second.damageLink = { targetId: first.id, share, expiresRound, protected: protectedLink };
  return ok(undefined);
}

export function unlinkCompany(battle: BattleState, targetId: string): void {
  const target = stackById(battle, targetId);
  const linked = target?.damageLink && stackById(battle, target.damageLink.targetId);
  if (linked?.damageLink?.targetId === targetId) linked.damageLink = undefined;
  if (linked) linked.effects = linked.effects.filter((effect) => effect.spellId !== 'yoke');
  if (target) {
    target.damageLink = undefined;
    target.effects = target.effects.filter((effect) => effect.spellId !== 'yoke');
  }
}

export function expireDamageLinks(battle: BattleState): void {
  const expired = battle.stacks.filter((stack) =>
    stack.damageLink && (stack.damageLink.expiresRound <= battle.round || stack.count <= 0
      || !battle.stacks.some((endpoint) => endpoint.id === stack.damageLink!.targetId
        && endpoint.count > 0))).map((stack) => stack.id);
  expired.forEach((id) => unlinkCompany(battle, id));
}

export function linkedDamageFor(
  battle: BattleState, target: BattleStack, damage: number,
): { target: BattleStack; damage: number } | null {
  if (!target.damageLink) return null;
  const linked = stackById(battle, target.damageLink.targetId);
  return linked && linked.count > 0
    ? { target: linked, damage: Math.max(0, Math.round(damage * target.damageLink.share)) }
    : null;
}

export function teleportCompany(
  battle: BattleState, targetId: string, destination: Coord,
): PrimitiveResult<BattleStack> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!Number.isInteger(destination.x) || !Number.isInteger(destination.y)
      || destination.x < 0 || destination.x >= BATTLE_COLS
      || destination.y < 0 || destination.y >= BATTLE_ROWS) {
    return blocked('illegal-destination');
  }
  const blockers = new Set([
    ...battle.obstacles,
    ...battle.tiles.map((tile) => tile.position),
  ].map((coord) => `${coord.x},${coord.y}`));
  if (!footprintFits(target, destination, occupiedByStacks(battle.stacks, target.id), blockers)) {
    return blocked('illegal-destination');
  }
  if (target.effects.some((effect) => effect.spellId === 'counterweight')) return ok(target);
  if (preventArtifactTeleport(battle, target.side)) return ok(target);
  target.position = { ...destination };
  return ok(target);
}

/** Shared forced-movement boundary for pushes, pulls, beckons, and similar repositioning. */
export function forcedMovementDistance(
  battle: BattleState, target: BattleStack, sourceSide: BattleSide, printedDistance: number,
): number {
  if (target.effects.some((effect) => effect.spellId === 'counterweight')) return 0;
  return forcedMoveDistance(battle, sourceSide, printedDistance, target.side);
}

export function stunCompany(
  battle: BattleState, targetId: string, actions: number,
): PrimitiveResult<number> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!(actions > 0 && Number.isInteger(actions))) return blocked('invalid-value');
  target.stunnedActions = (target.stunnedActions ?? 0) + actions;
  return ok(target.stunnedActions);
}

export function consumeStunnedTurn(stack: BattleStack): boolean {
  if (!stack.stunnedActions) return false;
  stack.stunnedActions -= 1;
  return true;
}

export function applyBerserk(
  battle: BattleState, targetId: string, duration: number, sourceSide: BattleSide,
): PrimitiveResult<BattleStack> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!(duration > 0)) return blocked('invalid-value');
  target.effects.push({
    id: `berserk:${target.id}:${battle.round}`, spellId: 'quiet', duration,
    magnitude: 1, beneficial: false, sourceSide,
  });
  return ok(target);
}

export function isBerserk(stack: BattleStack): boolean {
  return stack.effects.some((effect) => effect.id.startsWith('berserk:'));
}

export function nearestBerserkTargets(battle: BattleState, actor: BattleStack): BattleStack[] {
  const candidates = battle.stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack)
    && stack.id !== actor.id);
  const distance = Math.min(...candidates.map((stack) => hexDistance(actor.position, stack.position)));
  return candidates.filter((stack) => hexDistance(actor.position, stack.position) === distance)
    .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id));
}

export function cloneCompany(
  battle: BattleState, sourceId: string, count: number, destination: Coord,
  inheritEffects = false,
): PrimitiveResult<BattleStack> {
  const source = stackById(battle, sourceId);
  if (!source) return blocked('target-not-found');
  if (source.count <= 0) return blocked('target-defeated');
  if (source.summoned || source.cloneOf) return blocked('clone-source-cloned');
  if (!(count > 0 && Number.isInteger(count))) return blocked('invalid-value');
  const inheritedTemporary = new Set(inheritEffects ? source.temporaryAbilities ?? [] : []);
  const candidate: BattleStack = {
    ...source,
    id: `clone-${source.id}-${battle.round}-${battle.stacks.length}`,
    position: { ...destination }, count: Math.min(source.count, count),
    topHp: stackUnitHp(source), summoned: true, cloneOf: source.id,
    shots: UNITS[source.unitId].shots ?? 0, morale: 0,
    damageLink: undefined, originalSide: undefined, controlExpiresRound: undefined,
    controlledOnce: false, bonusActions: 0, grantedActionsThisRound: 0,
    retaliated: false, waited: false, defended: false, attacksMade: 0, movedHexes: 0,
    overwindPrimed: false, overwindUsed: false, skipRound: null,
    roundSpeedBonus: undefined, actsFirst: undefined,
    counters: inheritEffects ? { ...source.counters } : { burn: 0, chill: 0, hex: 0, bloom: 0 },
    effects: inheritEffects ? source.effects.map((effect) => ({ ...effect })) : [],
    abilityUses: inheritEffects ? Object.fromEntries(Object.entries(source.abilityUses ?? {})
      .filter(([id]) => inheritedTemporary.has(id as AbilityId))) : {},
    countAtTurnStart: Math.min(source.count, count),
    lastAttackOrigin: undefined, postAttackMovePoints: undefined,
    temporaryAbilities: inheritEffects ? [...(source.temporaryAbilities ?? [])] : [],
    copiedAbilityIds: inheritEffects ? [...(source.copiedAbilityIds ?? [])] : [],
    retaliationsMade: 0, doubleNextAttack: false,
    damageDealt: 0, damageTaken: 0, extraActionsTaken: 0,
    stunnedActions: undefined, lastNormalActionRound: undefined,
    destroyedCompanyForSides: [], destructionEvents: 0,
    claimedDestructionSaveEvent: undefined,
  };
  const blockers = new Set([...battle.obstacles, ...battle.tiles.map((tile) => tile.position)]
    .map((coord) => `${coord.x},${coord.y}`));
  if (!footprintFits(candidate, destination, occupiedByStacks(battle.stacks), blockers)) {
    return blocked('illegal-destination');
  }
  battle.stacks.push(candidate);
  return ok(candidate);
}

export function grantSpellImmunity(
  battle: BattleState, targetId: string, duration: number, sourceSide: BattleSide,
): PrimitiveResult<BattleStack> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!(duration > 0)) return blocked('invalid-value');
  target.effects.push({
    id: `spell-immune:${target.id}:${battle.round}`, spellId: 'sanctuary', duration,
    magnitude: 1, beneficial: true, sourceSide,
  });
  return ok(target);
}

export function isSpellImmune(stack: BattleStack): boolean {
  return stack.effects.some((effect) => effect.id.startsWith('spell-immune:'));
}

export function isSpellTargetBlocked(stack: BattleStack): boolean {
  return !stackIsOnField(stack) || isSpellImmune(stack) || stackHasAbility(stack, 'spellbound');
}

export function detonateCounter(
  battle: BattleState, targetId: string, counter: CounterId,
  perCounter: number, coefficient: number, spellPower: number, sourceSide: BattleSide,
): PrimitiveResult<{ consumed: number; damage: number }> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  const consumed = target.counters[counter];
  if (consumed <= 0) return blocked('counter-empty');
  clearCounterPile(target, counter); // removal is deliberately before computation
  const result = applyImpactDamage(battle, {
    targetId, sourceSide, base: consumed * perCounter,
    coefficient: consumed * coefficient, spellPower,
  });
  return result.ok ? ok({ consumed, damage: result.value.damage }) : result;
}

export function convertCounter(
  battle: BattleState, targetId: string, from: CounterId, to: CounterId,
  cap = 9,
): PrimitiveResult<{ converted: number; discarded: number }> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  const amount = target.counters[from];
  if (amount <= 0) return blocked('counter-empty');
  clearCounterPile(target, from);
  const room = Math.max(0, Math.min(15, cap) - target.counters[to]);
  const converted = Math.min(room, amount);
  target.counters[to] += converted;
  return ok({ converted, discarded: amount - converted });
}

export function sacrificeCompany(
  battle: BattleState, targetId: string,
): PrimitiveResult<{ lostHp: number; startingMaxHp: number }> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (target.summoned) return blocked('target-summoned');
  const allies = battle.stacks.filter((stack) => stack.side === target.side
    && stack.count > 0 && !stack.summoned);
  if (allies.length <= 1 && !target.summoned) return blocked('last-allied-company');
  const lostHp = totalStackHp(target);
  const startingMaxHp = (battle.initialCounts[target.id] ?? target.count) * stackUnitHp(target);
  const lostCount = target.count;
  unlinkCompany(battle, target.id);
  target.count = 0;
  target.topHp = 0;
  const owner = target.originalSide ?? target.side;
  battle.casualties[owner][target.unitId] =
    (battle.casualties[owner][target.unitId] ?? 0) + lostCount;
  return ok({ lostHp, startingMaxHp });
}

export function grantShots(
  battle: BattleState, targetId: string, shots: number,
): PrimitiveResult<number> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!(shots > 0 && Number.isInteger(shots))) return blocked('invalid-value');
  target.shots += shots;
  return ok(target.shots);
}

export function grantExtraAction(
  battle: BattleState, targetId: string, amount = 1,
): PrimitiveResult<number> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!(amount > 0 && Number.isInteger(amount))) return blocked('invalid-value');
  const current = target.grantedActionsThisRound ?? 0;
  if (current + amount > 2) return blocked('extra-action-cap');
  target.grantedActionsThisRound = current + amount;
  target.bonusActions += amount;
  return ok(target.grantedActionsThisRound);
}

export function scheduleGrantedCompanyActions(
  battle: BattleState, targetId: string, sourceSpellId: SpellId | ItemId,
  timing: 'immediate' | 'round-end' | 'pre-order', round: number, amount = 1,
): PrimitiveResult<number> {
  const target = stackById(battle, targetId);
  if (!target) return blocked('target-not-found');
  if (target.count <= 0) return blocked('target-defeated');
  if (!(amount > 0 && Number.isInteger(amount)) || round < battle.round
      || (timing !== 'pre-order' && round !== battle.round)
      || (timing === 'pre-order' && round <= battle.round)) return blocked('invalid-value');
  battle.pendingGrantedActions ??= [];
  const alreadyReserved = round === battle.round
    ? target.grantedActionsThisRound ?? 0
    : battle.pendingGrantedActions.filter((entry) =>
      entry.targetId === targetId && entry.round === round).length;
  if (alreadyReserved + amount > 2) return blocked('extra-action-cap');
  if (round === battle.round) target.grantedActionsThisRound = alreadyReserved + amount;
  for (let index = 0; index < amount; index += 1) {
    battle.pendingGrantedActions.push({
      id: `granted:${battle.round}:${battle.pendingGrantedActions.length}`,
      targetId, sourceSpellId, timing, round,
    });
  }
  return ok(alreadyReserved + amount);
}

export function activateGrantedCompanyAction(
  battle: BattleState, timing: 'immediate' | 'round-end' | 'pre-order',
  round: number, resumeStackId: string | null,
): boolean {
  battle.pendingGrantedActions ??= [];
  while (true) {
    const index = battle.pendingGrantedActions.findIndex((entry) =>
      entry.timing === timing && entry.round === round);
    if (index < 0) return false;
    const [entry] = battle.pendingGrantedActions.splice(index, 1);
    const target = stackById(battle, entry.targetId);
    if (!target || target.count <= 0) continue;
    battle.activeGrantedAction = { ...entry, resumeStackId };
    battle.currentStackId = target.id;
    battle.extraActions[target.side] += 1;
    target.extraActionsTaken = (target.extraActionsTaken ?? 0) + 1;
    recordP2ExtraAction(battle, target);
    battle.log.push(`${UNITS[target.unitId].name} takes a ${timing.replace('-', ' ')} granted action.`);
    return true;
  }
}

export function resetGrantedActionCaps(battle: BattleState): void {
  battle.stacks.forEach((stack) => {
    stack.grantedActionsThisRound = battle.pendingGrantedActions?.filter((entry) =>
      entry.targetId === stack.id && entry.round === battle.round).length ?? 0;
  });
}

export function scheduleDelayedTrigger(
  battle: BattleState, sourceSide: BattleSide,
  trigger: { kind: 'round-start'; round: number } | { kind: 'company-destroyed'; stackId: string },
  effect: BattleDelayedEffect,
): PrimitiveResult<string> {
  if (trigger.kind === 'round-start' && trigger.round <= battle.round) return blocked('invalid-value');
  battle.delayedTriggers ??= [];
  const id = `delayed:${battle.round}:${battle.delayedTriggers.length}`;
  battle.delayedTriggers.push({ id, sourceSide, trigger: { ...trigger }, effect: { ...effect } });
  return ok(id);
}

function resolveDelayedEffect(
  battle: BattleState, sourceSide: BattleSide, effect: BattleDelayedEffect,
): void {
  const target = stackById(battle, effect.targetId);
  if (!target) return;
  if (effect.kind === 'counter') addBattleCounter(battle, target, effect.counter, effect.amount, sourceSide);
  else if (effect.kind === 'heal' && target.count > 0) {
    const max = target.count * stackUnitHp(target);
    const current = totalStackHp(target);
    const next = Math.min(max, current + effect.hp);
    target.topHp = next - (target.count - 1) * stackUnitHp(target);
  } else if (effect.kind === 'impact-damage') {
    applyImpactDamage(battle, {
      targetId: target.id, sourceSide, base: effect.amount,
      coefficient: 0, spellPower: 0,
    });
  } else if (effect.kind === 'extra-action') {
    grantExtraAction(battle, target.id, effect.amount);
  }
}

export function resolveRoundDelayedTriggers(battle: BattleState): void {
  const due = (battle.delayedTriggers ?? []).filter((entry) =>
    entry.trigger.kind === 'round-start' && entry.trigger.round <= battle.round);
  battle.delayedTriggers = (battle.delayedTriggers ?? []).filter((entry) => !due.includes(entry));
  due.forEach((entry) => resolveDelayedEffect(battle, entry.sourceSide, entry.effect));
}

export function queueDestroyedCompanyTriggers(battle: BattleState, stackId: string): void {
  const due = (battle.delayedTriggers ?? []).filter((entry) =>
    entry.trigger.kind === 'company-destroyed' && entry.trigger.stackId === stackId);
  battle.delayedTriggers = (battle.delayedTriggers ?? []).filter((entry) => !due.includes(entry));
  due.forEach((entry) => resolveDelayedEffect(battle, entry.sourceSide, entry.effect));
}

export function grantMidBattleResonance(
  battle: BattleState, side: BattleSide, school: SpellSchool,
): PrimitiveResult<readonly SpellSchool[]> {
  battle.midBattleResonance ??= { attacker: [], defender: [] };
  if (!battle.midBattleResonance[side].includes(school)) battle.midBattleResonance[side].push(school);
  return ok(battle.midBattleResonance[side]);
}

export function createHazardHex(
  battle: BattleState, position: Coord, duration: number,
  sourceSide: BattleSide, hazard: HazardHexEffect,
): PrimitiveResult<string> {
  if (battle.tiles.some((tile) => sameCoord(tile.position, position))) return blocked('hazard-occupied');
  if (!Number.isInteger(position.x) || !Number.isInteger(position.y)
      || position.x < 0 || position.x >= BATTLE_COLS
      || position.y < 0 || position.y >= BATTLE_ROWS
      || !Number.isInteger(duration) || duration === 0 || duration < -1) {
    return blocked('invalid-value');
  }
  if (hazard.kind !== 'teleport' && (!(hazard.amount > 0) || !Number.isFinite(hazard.amount))) {
    return blocked('invalid-value');
  }
  if (hazard.kind === 'teleport' && (!Number.isInteger(hazard.destination.x)
      || !Number.isInteger(hazard.destination.y) || hazard.destination.x < 0
      || hazard.destination.x >= BATTLE_COLS || hazard.destination.y < 0
      || hazard.destination.y >= BATTLE_ROWS)) return blocked('illegal-destination');
  const tile = createBattleTile(battle, 'hazard', position, duration, sourceSide);
  tile.hazard = hazard.kind === 'teleport'
    ? { ...hazard, destination: { ...hazard.destination } } : { ...hazard };
  placeBattleTile(battle, tile);
  return ok(tile.id);
}

export function drainMana(
  battle: BattleState, from: BattleSide, to: BattleSide, amount: number,
): PrimitiveResult<number> {
  const source = heroFor(battle, from);
  const destination = heroFor(battle, to);
  if (!source || !destination) return blocked('target-not-found');
  if (!(amount > 0)) return blocked('invalid-value');
  const capacity = Math.max(0,
    (destination.manaMaximum ?? Number.MAX_SAFE_INTEGER) - destination.mana);
  const moved = Math.min(source.mana, Math.floor(amount), capacity);
  source.mana -= moved;
  destination.mana = Math.min(destination.manaMaximum ?? Number.MAX_SAFE_INTEGER,
    destination.mana + moved);
  return ok(destination.mana);
}

export function addManaClamped(hero: BattleHero, amount: number): number {
  hero.mana = Math.max(0, Math.min(hero.manaMaximum ?? Number.MAX_SAFE_INTEGER,
    hero.mana + amount));
  return hero.mana;
}

export type SpellCopyChannel = 'echo' | 'mirror-hall' | 'standing-mirror' | 'mirrorshard';
const NEVER_COPY = new Set<string>(['echo', 'standingMirror', 'mirrorHall']);
const MANA_GRANTING = new Set<string>(['theToll', 'tithe', 'graveBargain']);
const EXTRA_ACTION_GRANTING = new Set<string>(['hourglassCrack', 'reprise', 'overclock']);

export function spellCopyEligibility(
  spellId: SpellId, channel: SpellCopyChannel,
  options: { allowTier5?: boolean; allowTwisters?: boolean } = {},
): PrimitiveResult<undefined> {
  const spell = SPELLS[spellId];
  if (channel === 'echo') return spellId === 'echo' ? blocked('copy-forbidden') : ok(undefined);
  if (MANA_GRANTING.has(spellId)) return blocked('mana-copy-forbidden');
  if (NEVER_COPY.has(spellId) || (spell.effectOperation
      && !(channel === 'standing-mirror' && options.allowTwisters))
      || (channel === 'mirror-hall' && ((!options.allowTier5 && spell.tier === 5)
        || EXTRA_ACTION_GRANTING.has(spellId)
        || spell.primitives?.includes('grant-extra-action')))) return blocked('copy-forbidden');
  return ok(undefined);
}

export function borrowAbilityEligibility(
  source: BattleStack, ability: AbilityId,
): PrimitiveResult<undefined> {
  if (stackHasAbility(source, 'spellbound')) {
    return blocked('spellbound-source');
  }
  if (source.copiedAbilityIds?.includes(ability)) return blocked('copied-ability-source');
  if ((['warded_hide', 'low_magic_immune', 'school_resistant', 'spell_ward',
    'spell_deflect', 'spell_frail'] as AbilityId[]).includes(ability)) return blocked('copy-forbidden');
  return ok(undefined);
}

export function eligibleBorrowAbilities(source: BattleStack): AbilityId[] {
  return UNITS[source.unitId].abilities.filter((ability) =>
    borrowAbilityEligibility(source, ability).ok);
}

export function claimDestructionSave(
  stack: BattleStack, destructionEvent: number,
): PrimitiveResult<undefined> {
  if (stack.claimedDestructionSaveEvent === destructionEvent) {
    return blocked('resurrection-event-claimed');
  }
  stack.claimedDestructionSaveEvent = destructionEvent;
  return ok(undefined);
}

type PrimitiveApply = (battle: BattleState, payload: never) => unknown;
const APPLY: Record<Extract<EffectPrimitiveId,
  'impact-damage' | 'resurrect' | 'mind-control' | 'damage-link' | 'teleport-stack'
  | 'stun' | 'berserk' | 'clone' | 'spell-immune' | 'counter-detonate'
  | 'counter-convert' | 'sacrifice' | 'grant-shots' | 'grant-extra-action'
  | 'delayed-trigger' | 'mid-battle-resonance' | 'hazard-hex' | 'mana-drain'>, PrimitiveApply> = {
  'impact-damage': (battle, payload: ImpactDamagePayload) => applyImpactDamage(battle, payload),
  resurrect: (battle, payload: { targetId: string; hp: number }) =>
    resurrectCompany(battle, payload.targetId, payload.hp),
  'mind-control': (battle, payload: { targetId: string; controller: BattleSide; duration: number; hpCap: number }) =>
    mindControlCompany(battle, payload.targetId, payload.controller, payload.duration, payload.hpCap),
  'damage-link': (battle, payload: {
    firstId: string; secondId: string; share: number; duration?: number;
  }) => linkCompanies(battle, payload.firstId, payload.secondId, payload.share, payload.duration),
  'teleport-stack': (battle, payload: { targetId: string; destination: Coord }) =>
    teleportCompany(battle, payload.targetId, payload.destination),
  stun: (battle, payload: { targetId: string; actions: number }) =>
    stunCompany(battle, payload.targetId, payload.actions),
  berserk: (battle, payload: { targetId: string; duration: number; sourceSide: BattleSide }) =>
    applyBerserk(battle, payload.targetId, payload.duration, payload.sourceSide),
  clone: (battle, payload: { sourceId: string; count: number; destination: Coord; inheritEffects?: boolean }) =>
    cloneCompany(battle, payload.sourceId, payload.count, payload.destination,
      payload.inheritEffects ?? false),
  'spell-immune': (battle, payload: { targetId: string; duration: number; sourceSide: BattleSide }) =>
    grantSpellImmunity(battle, payload.targetId, payload.duration, payload.sourceSide),
  'counter-detonate': (battle, payload: {
    targetId: string; counter: CounterId; perCounter: number; coefficient: number;
    spellPower: number; sourceSide: BattleSide;
  }) => detonateCounter(
    battle, payload.targetId, payload.counter, payload.perCounter,
    payload.coefficient, payload.spellPower, payload.sourceSide,
  ),
  'counter-convert': (battle, payload: { targetId: string; from: CounterId; to: CounterId; cap?: number }) =>
    convertCounter(battle, payload.targetId, payload.from, payload.to, payload.cap),
  sacrifice: (battle, payload: { targetId: string }) => sacrificeCompany(battle, payload.targetId),
  'grant-shots': (battle, payload: { targetId: string; shots: number }) =>
    grantShots(battle, payload.targetId, payload.shots),
  'grant-extra-action': (battle, payload: { targetId: string; amount?: number }) =>
    grantExtraAction(battle, payload.targetId, payload.amount),
  'delayed-trigger': (battle, payload: {
    sourceSide: BattleSide;
    trigger: { kind: 'round-start'; round: number }
      | { kind: 'company-destroyed'; stackId: string };
    effect: BattleDelayedEffect;
  }) => scheduleDelayedTrigger(battle, payload.sourceSide, payload.trigger, payload.effect),
  'mid-battle-resonance': (battle, payload: { side: BattleSide; school: SpellSchool }) =>
    grantMidBattleResonance(battle, payload.side, payload.school),
  'hazard-hex': (battle, payload: { position: Coord; duration: number; sourceSide: BattleSide; hazard: HazardHexEffect }) =>
    createHazardHex(battle, payload.position, payload.duration, payload.sourceSide, payload.hazard),
  'mana-drain': (battle, payload: { from: BattleSide; to: BattleSide; amount: number }) =>
    drainMana(battle, payload.from, payload.to, payload.amount),
};

export const COMBAT_PRIMITIVE_HANDLERS: readonly EffectPrimitiveHandler[] =
  (Object.keys(APPLY) as Array<keyof typeof APPLY>).map((id) => ({
    id,
    stage: EFFECT_PRIMITIVE_CONTRACTS[id].stage,
    apply: (context, payload) => APPLY[id]((context as { battle: BattleState }).battle, payload as never),
  }));

/** Register the canonical singleton handlers; foreign duplicates remain a hard error. */
export function ensureCombatPrimitiveHandlersRegistered(): void {
  for (const handler of COMBAT_PRIMITIVE_HANDLERS) {
    const current = effectPrimitiveHandler(handler.id);
    if (!current) registerEffectPrimitiveHandler(handler);
    else if (current !== handler) throw new Error(`Duplicate effect primitive handler: ${handler.id}`);
  }
}

ensureCombatPrimitiveHandlersRegistered();
