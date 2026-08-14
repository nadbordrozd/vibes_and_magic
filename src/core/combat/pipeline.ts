import { UNITS } from '../../content/units';
import {
  MORALE_ALLY_KILL_GAIN, MORALE_ALLY_LOSS,
  MORALE_KILLING_STACK_GAIN,
} from '../../content/constants';
import type { BattleSide, BattleState, BattleStack } from '../types';
import {
  attackAbilityMultiplier, battleAbilityHandlers, hasUnlimitedRetaliations,
  pinsIncomingRollToMinimum, preventsRetaliation, stackHasAbility,
} from './abilities';
import {
  canUseRanged, computeDamage, hasAdjacentEnemy, stackUnitHp,
} from './damage';
import { hexNeighbors } from './hex';
import {
  footprintFits, occupiedByStacks, stackContains, stackHexes, stacksAdjacent,
} from './footprint';

/** Guard against one-unit split stacks multiplying flat destruction rewards. */
export function destructionProportionality(
  battle: BattleState,
  destroyed: BattleStack,
): number {
  const destroyedMaxHp = (battle.initialCounts[destroyed.id] ?? destroyed.count)
    * stackUnitHp(destroyed);
  const owner = originalOwnerSide(destroyed);
  const hero = owner === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const smallest = battle.stacks.filter((stack) => isOriginallyOwnedBy(stack, owner)
    && !stack.summoned).sort((a, b) =>
    (battle.initialCounts[a.id] ?? a.count) - (battle.initialCounts[b.id] ?? b.count)
      || a.slot - b.slot || a.id.localeCompare(b.id))[0];
  const effectiveDestroyedMaxHp = hero && smallest?.id === destroyed.id
    && hasArtifactEffect(hero, 'proportionality_size')
    ? destroyedMaxHp * Math.max(1, artifactEffectTotal(hero, 'proportionality_size'))
    : destroyedMaxHp;
  const armyTotalMaxHp = battle.stacks.filter((stack) =>
    isOriginallyOwnedBy(stack, owner) && !stack.summoned).reduce((sum, stack) => sum
      + (battle.initialCounts[stack.id] ?? stack.count) * stackUnitHp(stack), 0);
  return armyTotalMaxHp <= 0 ? 1 : Math.min(1, effectiveDestroyedMaxHp / (armyTotalMaxHp * 0.1));
}

export function doc63TargetDamageMultiplier(attacker: BattleStack, defender: BattleStack,
  feederActive = stackHasAbility(attacker, 'hex_feeder')): number {
  return 1 + defender.counters.hex
    * (feederActive ? 0.15 : 0.05);
}

export function doc63PersistentAttackBonus(stack: BattleStack): number {
  return (stack.abilityUses?.counter_eater ?? 0) + (stack.abilityUses?.soul_tithe ?? 0);
}

export function corneredAttackBonus(battle: BattleState, stack: BattleStack): number {
  if (!stackHasAbility(stack, 'cornered')) return 0;
  const initial = battle.initialCounts[stack.id] ?? stack.count;
  return Math.floor((initial - stack.count) * 5 / initial);
}

/** Applies the opposing hero's bounded reduction to a flat counter/morale death trigger. */
export function enemyDeathTriggerMagnitude(
  battle: BattleState,
  sourceSide: BattleSide,
  magnitude: number,
): number {
  const opposingHero = sourceSide === 'attacker' ? battle.defenderHero : battle.attackerHero;
  if (!opposingHero) return Math.max(0, magnitude);
  const reduction = artifactEffectTotal(opposingHero, 'reduce_enemy_death')
    || (hasArtifactEffect(opposingHero, 'reduce_enemy_death') ? 1 : 0);
  return Math.max(0, magnitude - reduction);
}
import { coordKey } from '../map/pathfinding';
import {
  addBattleCounter, addSpellCounter, effectOn, effectiveSpeed, enchantmentMultiplier,
  grantSystemMeter,
  loseMeter,
  scaledCounter, totalStackHp,
} from './magicEffects';
import { specialtyHandler } from '../heroBehaviors';
import {
  artifactEffectTotal, consumeEquippedArtifact, hasArtifactEffect, hasArtifactSetBonus,
  hasEquippedArtifact,
} from '../artifacts';
import { wallsDefenseMultiplier } from '../skills/expansionHooks';
import {
  addManaClamped, claimDestructionSave, grantExtraAction, isBerserk, ownerDeathTriggerCount,
  queueDestroyedCompanyTriggers,
} from './primitives';
import {
  applyRoutedCombatDamage, routeWardDamage, type AppliedDamage,
} from './damageRouting';
import { isOriginallyOwnedBy, originalOwnerSide } from './ownership';
import {
  applyP1AttackModifiers, consumeP1AttackEffects, recordP1CompanyDestruction,
  resolveShrapnelSplash,
} from './p1RiteCraftSpellEffects';
import {
  applyGrudgeAfterAttack, p1GraveWildAttackModifiers,
  p1GraveWildRetaliationLimit,
} from './p1GraveWildSpellEffects';
import { attackPatternPlan } from './attackPatterns';
import { cloneBattle } from './battleClone';
import {
  claimSecondGrave, p2CombatModifiers, p2FogActive, p2RetaliationMultiplier,
  settleP2Destruction, settleP2HalfThreshold,
} from './p2SpellEffects';

export const RESOLUTION_STAGES = [
  'declare',
  'target-selection',
  'ownership-resolution',
  'damage-computation',
  'damage-routing',
  'apply',
  'death-triggers',
  'retaliation',
  'turn-advance',
] as const;
export type ResolutionStage = typeof RESOLUTION_STAGES[number];

interface AttackResolution {
  battle: BattleState;
  actorId: string;
  targetId: string;
  isRetaliation: boolean;
  abilitySecondary: boolean;
  attacker?: BattleStack;
  defender?: BattleStack;
  ranged: boolean;
  damage: number;
  actualDamage: number;
  kills: number;
  reflectedDamage: number;
  reflectedKills: number;
  linkedTarget?: BattleStack;
  linkedDamage: number;
  linkedKills: number;
  linkedHpBefore: number;
  linkedCountBefore: number;
  secondaryDeaths: Array<{ damage: AppliedDamage; attacker: BattleStack }>;
  defenderHpBefore: number;
  defenderCountBefore: number;
  ignoreRetaliation: boolean;
  deathCause?: 'attack' | 'sacrifice' | 'spell-impact';
  damageScale: number;
  friendlyFire: boolean;
  firstStrikeResolved: boolean;
  suppressRetaliation: boolean;
}

type StageHook = (resolution: AttackResolution) => void;

function retaliationAllowance(
  battle: BattleState, attacker: BattleStack, defender: BattleStack,
): { allowed: boolean; unlimited: boolean } {
  if (battle.retaliationSuppressed[attacker.side] || preventsRetaliation(attacker)
      || effectOn(defender, 'quiet') || attacker.count <= 0 || defender.count <= 0) {
    return { allowed: false, unlimited: false };
  }
  const attackingHero = attacker.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (attackingHero && hasArtifactEffect(attackingHero, 'chill_retaliation_block')
      && defender.counters.chill >= Math.max(1,
        artifactEffectTotal(attackingHero, 'chill_retaliation_block'))) {
    return { allowed: false, unlimited: false };
  }
  const unlimited = hasUnlimitedRetaliations(defender)
    || p2CombatModifiers(battle, defender).unlimitedRetaliations
    || (stackHasAbility(defender, 'last_stand')
      && !battle.stacks.some((stack) => stack.count > 0 && !stack.summoned
        && stack.side === defender.side && stack.id !== defender.id))
    || (effectOn(defender, 'oathOfIron')?.magnitude ?? 0) >= 2;
  const defenderHero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const torc = Boolean(defenderHero && stackHasAbility(defender, 'beast')
    && hasEquippedArtifact(defenderHero, 'wolfMothersTorc')) ? 2 : 1;
  const rivet = defender.effects.some((effect) =>
    effect.spellId === 'rivet' && effect.id.includes(':plus-extra-retaliation')) ? 2 : 1;
  const limit = Math.max(torc, rivet, p1GraveWildRetaliationLimit(defender));
  return { allowed: unlimited || (defender.retaliationsMade ?? 0) < limit, unlimited };
}

function consumeRetaliation(defender: BattleStack, unlimited: boolean): void {
  if (!unlimited) {
    defender.retaliated = true;
    defender.retaliationsMade = (defender.retaliationsMade ?? 0) + 1;
  }
}

const hooks: Record<ResolutionStage, StageHook[]> = {
  declare: [],
  'target-selection': [],
  'ownership-resolution': [],
  'damage-computation': [],
  'damage-routing': [],
  apply: [],
  'death-triggers': [],
  retaliation: [],
  'turn-advance': [],
};

hooks.declare.push((resolution) => {
  resolution.attacker = resolution.battle.stacks.find(
    (stack) => stack.id === resolution.actorId && stack.count > 0,
  );
});

hooks['target-selection'].push((resolution) => {
  resolution.defender = resolution.battle.stacks.find(
    (stack) => stack.id === resolution.targetId && stack.count > 0,
  );
});

hooks['ownership-resolution'].push((resolution) => {
  if (!resolution.attacker || !resolution.defender
      || (resolution.attacker.side === resolution.defender.side
        && !isBerserk(resolution.attacker)
        && !(resolution.isRetaliation && isBerserk(resolution.defender))
        && !resolution.friendlyFire)) {
    throw new Error('Attack must have living stacks on opposing sides');
  }
  resolution.ranged = !resolution.isRetaliation && canUseRanged(resolution.attacker);
  if (!resolution.ranged && !resolution.abilitySecondary
      && !stacksAdjacent(resolution.attacker, resolution.defender)) {
    throw new Error('Melee target is not adjacent');
  }
});

hooks['damage-computation'].push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (!attacker || !defender) return;
  const attackerHero = attacker.side === 'attacker'
    ? battle.attackerHero : battle.defenderHero;
  const defenderHero = defender.side === 'attacker'
    ? battle.attackerHero : battle.defenderHero;
  const attackerSpecialty = attackerHero ? specialtyHandler(attackerHero) : null;
  const defenderSpecialty = defenderHero ? specialtyHandler(defenderHero) : null;
  const p1 = applyP1AttackModifiers(battle, attacker, defender, resolution.isRetaliation);
  const graveWild = p1GraveWildAttackModifiers(battle, attacker, defender);
  resolution.ignoreRetaliation = p1.ignoreRetaliation;
  let abilityMultiplier = attackAbilityMultiplier(attacker);
  if (attackerHero && hasArtifactEffect(attackerHero, 'faction_grudge_damage')) {
    const prior = attacker.side === 'attacker'
      ? battle.context.attackerPriorFactionBattles ?? 0
      : battle.context.defenderPriorFactionBattles ?? 0;
    const perBattle = Math.max(0, artifactEffectTotal(attackerHero, 'faction_grudge_damage'));
    const cap = Math.max(0,
      artifactEffectTotal(attackerHero, 'faction_grudge_damage', 'percent'));
    abilityMultiplier *= 1 + Math.min(cap, prior * perBattle) / 100;
  }
  let hexFeederActive = stackHasAbility(attacker, 'hex_feeder');
  if (attacker.doubleNextAttack) {
    abilityMultiplier *= 2;
    attacker.doubleNextAttack = false;
  }
  if (stackHasAbility(attacker, 'swelling_dirge')) {
    abilityMultiplier *= 1 + battle.destroyedStacks * 0.05;
  }
  const corneredAttack = corneredAttackBonus(battle, attacker);
  if (stackHasAbility(attacker, 'first_blood') && attacker.attacksMade === 0) {
    abilityMultiplier *= 2;
  }
  if (stackHasAbility(attacker, 'pack_hunger')
      && defender.count < (battle.initialCounts[defender.id] ?? defender.count)) {
    abilityMultiplier *= attackerSpecialty?.packHungerMultiplier?.() ?? 1.15;
  }
  if (resolution.isRetaliation) {
    abilityMultiplier *= attackerSpecialty?.retaliationMultiplier?.(attacker.unitId) ?? 1;
    abilityMultiplier *= p2RetaliationMultiplier(attacker);
  }
  if ((abilityMultiplier !== 1 || hexFeederActive) && defenderHero
      && !battle.ironNailSpent[defender.side]
      && hasEquippedArtifact(defenderHero, 'ironNail')) {
    consumeEquippedArtifact(defenderHero, 'ironNail');
    battle.ironNailSpent[defender.side] = true;
    abilityMultiplier = 1;
    hexFeederActive = false;
    battle.log.push('The Iron Nail catches an enemy ability and is spent.');
  }
  const p2Attacker = p2CombatModifiers(battle, attacker);
  const p2Defender = p2CombatModifiers(battle, defender);
  resolution.damage = computeDamage({
    attacker,
    defender,
    attackerHeroAttack: (attackerHero?.attack ?? 0) + corneredAttack
      + p1.attack + graveWild.attack
      + p2Attacker.attack
      + (attacker.knackAttackBonus ?? 0)
      + (attacker.artifactAttackBonus ?? 0)
      + doc63PersistentAttackBonus(attacker)
      + (attackerSpecialty?.unitAttackBonus?.(attacker.unitId) ?? 0)
      + (attackerHero && UNITS[attacker.unitId].faction === 'unfinished'
        ? artifactEffectTotal(attackerHero, 'unfinished_stats') : 0),
    defenderHeroDefense: (defenderHero?.defense ?? 0) + p1.defense
      + p2Defender.defense
      + (defender.artifactDefenseBonus ?? 0)
      + (defenderSpecialty?.unitDefenseBonus?.(defender.unitId) ?? 0)
      + (defenderHero && UNITS[defender.unitId].faction === 'unfinished'
        ? artifactEffectTotal(defenderHero, 'unfinished_stats') : 0)
      + (battle.defenderWalls && defender.side === 'defender'
        ? 2 * (attackerHero ? wallsDefenseMultiplier(attackerHero) : 1) : 0)
      + (battle.defenderKeep && defender.side === 'defender' ? 2 : 0),
    luck: (attackerHero?.luck ?? 0)
      - (defenderHero?.faction === 'hagwood' ? 1 : 0),
    ranged: resolution.ranged,
    adjacentEnemy: hasAdjacentEnemy(attacker, battle.stacks),
    ignoreAdjacentRangedPenalty:
      (attackerSpecialty?.rangedAdjacentPenalty?.(attackerHero!, attacker.unitId) ?? false)
      || attacker.effects.some((effect) => effect.spellId === 'litanyOfDawn'),
    ignoreLongRangePenalty: p1.ignoreLongRange || stackHasAbility(attacker, 'sniper'),
    wallsPenalty: battle.defenderWalls
      && attacker.side === 'attacker' && defender.side === 'defender',
    rollPosition: (pinsIncomingRollToMinimum(defender)
        || (resolution.ranged && stackHasAbility(defender, 'shellback')))
        || Boolean(effectOn(defender, 'oathOfIron'))
      ? 'minimum'
      : effectOn(attacker, 'blessing') ? 'maximum' : 'luck',
    abilityMultiplier: abilityMultiplier * p1.multiplier * graveWild.multiplier
      * resolution.damageScale
      * (stackHasAbility(attacker, 'siege_ram') && stackHasAbility(defender, 'siege_wall')
        ? 2 : 1)
      * doc63TargetDamageMultiplier(attacker, defender, hexFeederActive),
  });
  if (resolution.ranged && p2FogActive(battle)) resolution.damage = Math.ceil(resolution.damage / 2);
});

hooks['damage-routing'].push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (!attacker || !defender) return;
  resolution.damage = routeWardDamage(defender, resolution.damage, {
    sourceStack: attacker,
    onUpgradedWard: (source, ward) => addBattleCounter(
      battle, source, 'burn', 2, ward.sourceSide,
    ),
  });
  const veil = effectOn(defender, 'mournersVeil');
  if (veil) resolution.damage *= 1 - veil.magnitude / 100;
  const ironclad = battle.enchantments[defender.side].find(
    (effect) => effect.spellId === 'ironclad',
  );
  if (ironclad) {
    const hero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    const defense = UNITS[defender.unitId].defense + (hero?.defense ?? 0);
    if (defense >= (ironclad.upgraded ? 10 : 12)) {
      resolution.damage *= 0.5 ** ironclad.multiplier;
    }
  }
  if (!resolution.ranged) {
    if (stackHasAbility(defender, 'brittle_bones')) resolution.damage *= 1.25;
    for (const handler of battleAbilityHandlers(battle, defender)) {
      if (handler.stage !== 'damage-routing' || !handler.meleeReflection) continue;
      resolution.reflectedDamage += resolution.damage * handler.meleeReflection;
      if (handler.replacesMeleeDamage) resolution.damage = 0;
    }
  }
  const lastStand = stackHasAbility(defender, 'last_stand')
    && !battle.stacks.some((stack) => stack.count > 0 && !stack.summoned
      && stack.side === defender.side && stack.id !== defender.id);
  if (lastStand) resolution.damage *= 0.5;
  resolution.damage = Math.max(0, Math.round(resolution.damage));
  resolution.reflectedDamage = Math.max(0, Math.round(resolution.reflectedDamage));
});

hooks.apply.push((resolution) => {
  const { attacker, defender } = resolution;
  if (!attacker || !defender) return;
  resolution.defenderHpBefore = totalStackHp(defender);
  resolution.defenderCountBefore = defender.count;
  attacker.lastAttackOrigin ??= { ...attacker.position };
  const direct = applyRoutedCombatDamage(resolution.battle, defender, resolution.damage, {
    recordDestruction: false,
    consumeWard: false,
  });
  resolution.kills = direct.primary.kills;
  resolution.actualDamage = direct.primary.damage;
  settleP2HalfThreshold(resolution.battle, defender, resolution.defenderCountBefore);
  if (direct.linked) {
    resolution.linkedTarget = direct.linked.target;
    resolution.linkedDamage = direct.linked.damage;
    resolution.linkedKills = direct.linked.kills;
    resolution.linkedHpBefore = direct.linked.hpBefore;
    resolution.linkedCountBefore = direct.linked.countBefore;
    resolution.battle.log.push(
      `Damage link routes ${resolution.linkedDamage} damage to ${UNITS[resolution.linkedTarget.unitId].name}.`,
    );
    if (direct.linked.destroyed) {
      resolution.secondaryDeaths.push({ damage: direct.linked, attacker });
    }
  }
  const reflected = applyRoutedCombatDamage(resolution.battle, attacker, resolution.reflectedDamage, {
    recordDestruction: false,
    sourceStack: defender,
    onUpgradedWard: (source, ward) => addSpellCounter(
      resolution.battle, source, 'burn', 2, ward.sourceSide,
    ),
  });
  resolution.reflectedKills = reflected.primary.kills;
  if (reflected.primary.destroyed) {
    resolution.secondaryDeaths.push({ damage: reflected.primary, attacker: defender });
  }
  if (reflected.linked?.destroyed) {
    resolution.secondaryDeaths.push({ damage: reflected.linked, attacker: defender });
  }
  attacker.damageDealt = (attacker.damageDealt ?? 0) + resolution.damage;
  if (!resolution.abilitySecondary && !resolution.suppressRetaliation) attacker.attacksMade += 1;
  if (!resolution.abilitySecondary) applyGrudgeAfterAttack(resolution.battle, attacker, defender);
  if (!resolution.abilitySecondary) attacker.movedHexes = 0;
  const blessing = effectOn(attacker, 'blessing');
  if (blessing && !resolution.abilitySecondary && !resolution.suppressRetaliation) {
    attacker.effects = attacker.effects.filter((effect) => effect.id !== blessing.id);
  }
  const veil = effectOn(defender, 'mournersVeil');
  if (veil?.id.endsWith(':plus')) {
    addBattleCounter(resolution.battle, attacker, 'hex', 1, veil.sourceSide);
  }
  if (resolution.ranged && !resolution.abilitySecondary) attacker.shots -= 1;
  if (!resolution.isRetaliation && !resolution.abilitySecondary
      && !resolution.suppressRetaliation) consumeP1AttackEffects(attacker);
  if (!resolution.abilitySecondary && resolution.ranged && resolution.damage > 0) {
    resolveShrapnelSplash(resolution.battle, attacker, defender, resolution.damage);
  }
  if (!resolution.abilitySecondary && resolution.ranged
      && stackHasAbility(attacker, 'web') && defender.count > 0) {
    addBattleCounter(resolution.battle, defender, 'chill', 2, attacker.side);
  }
  if (!resolution.abilitySecondary && defender.count > 0
      && stackHasAbility(attacker, 'burn_conduit')) {
    const moved = Math.min(2, attacker.counters.burn);
    if (moved > 0) attacker.counters.burn -= moved;
    addBattleCounter(resolution.battle, defender, 'burn', moved || 1, attacker.side,
      { fixedAmount: true });
  }
  if (resolution.actualDamage > 0 && defender.side !== attacker.side
      && stackHasAbility(attacker, 'mana_leech')
      && attacker.abilityUses?.mana_leech !== resolution.battle.round) {
    const ownHero = attacker.side === 'attacker'
      ? resolution.battle.attackerHero : resolution.battle.defenderHero;
    const enemyHero = defender.side === 'attacker'
      ? resolution.battle.attackerHero : resolution.battle.defenderHero;
    const transfer = Math.min(1, enemyHero?.mana ?? 0);
    if (ownHero && enemyHero && transfer > 0) {
      enemyHero.mana -= transfer;
      addManaClamped(ownHero, transfer);
    }
    attacker.abilityUses = { ...attacker.abilityUses, mana_leech: resolution.battle.round };
  }
  if (!resolution.abilitySecondary && resolution.actualDamage > 0
      && stackHasAbility(attacker, 'siphon')) {
    const recipient = resolution.battle.stacks.filter((stack) => stack.count > 0
      && stack.side === attacker.side).sort((a, b) => totalStackHp(a) - totalStackHp(b)
      || a.slot - b.slot || a.id.localeCompare(b.id))[0];
    if (recipient) {
      const hp = stackUnitHp(recipient);
      recipient.topHp = Math.min(hp, recipient.topHp + Math.floor(resolution.actualDamage / 2));
    }
  }
  if (!resolution.abilitySecondary && resolution.ranged
      && stackHasAbility(attacker, 'chain_shot')) {
    const secondary = resolution.battle.stacks.filter((stack) => stack.count > 0
      && stack.id !== defender.id && stack.id !== attacker.id && stacksAdjacent(stack, defender))
      .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))[0];
    if (secondary) runAttackPipeline(
      resolution.battle, attacker.id, secondary.id, false, true, 0.5, true,
    );
  }
  if (!resolution.abilitySecondary && resolution.ranged
      && stackHasAbility(attacker, 'the_song') && defender.count > 0) {
    if (!stackHasAbility(defender, 'mindless')) loseMeter(defender, 10, resolution.battle);
  }
  if (!resolution.abilitySecondary && effectOn(attacker, 'forgeSpark') && defender.count > 0) {
    addBattleCounter(resolution.battle, defender, 'burn', 1, attacker.side);
  }
  const attackerHero = attacker.side === 'attacker'
    ? resolution.battle.attackerHero : resolution.battle.defenderHero;
  if (!resolution.abilitySecondary && stackHasAbility(attacker, 'pecking_order') && defender.count > 0
      && (!resolution.isRetaliation
        || (attackerHero
          && specialtyHandler(attackerHero).retaliationAppliesHex?.(attacker.unitId)))) {
    addBattleCounter(resolution.battle, defender, 'hex', 1, attacker.side);
  }
  if (!resolution.abilitySecondary && stackHasAbility(attacker, 'storm_wake')) {
    const burn = attackerHero?.specialtyId === 'burningStormWake'
      ? specialtyHandler(attackerHero).stormWakeBurn?.() ?? 3 : 2;
    resolution.battle.stacks.filter((stack) => stack.count > 0
      && stack.side === defender.side && stack.id !== defender.id
      && stacksAdjacent(stack, defender))
      .forEach((stack) => addBattleCounter(
        resolution.battle, stack, 'burn', burn, attacker.side,
      ));
  }
  const verb = resolution.ranged ? 'shoot' : 'attack';
  resolution.battle.log.push(
    `${attacker.count} ${UNITS[attacker.unitId].name} ${verb} `
    + `${UNITS[defender.unitId].name}: ${resolution.damage} damage, `
    + `${resolution.kills} fall`,
  );
  if (resolution.reflectedDamage > 0) {
    resolution.battle.log.push(
      `${UNITS[attacker.unitId].name} suffers ${resolution.reflectedDamage} reflected damage.`,
    );
  }
});

hooks['death-triggers'].push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (!attacker || !defender || defender.count > 0) return;
  defender.destructionEvents = (defender.destructionEvents ?? 0) + 1;
  if ((resolution.deathCause ?? 'attack') === 'attack') {
    recordP1CompanyDestruction(attacker, defender);
  }
  const destructionEvent = defender.destructionEvents;
  queueDestroyedCompanyTriggers(battle, defender.id);
  if (stackHasAbility(defender, 'siege_wall') || stackHasAbility(defender, 'mirror_hex')) return;
  battle.destroyedStacks += 1;
  claimSecondGrave(battle, defender, destructionEvent);
  settleP2Destruction(battle, defender, resolution.defenderCountBefore);
  const graveDust = battle.pendingGraveDust;
  let graveDustReturn: { side: BattleSide; owner: BattleSide; restored: number } | null = null;
  if (graveDust) {
    battle.pendingGraveDust = null;
    if (!defender.summoned && !defender.cloneOf
        && defender.claimedDestructionSaveEvent !== destructionEvent) {
      claimDestructionSave(defender, destructionEvent);
      const owner = originalOwnerSide(defender);
      const initial = battle.initialCounts[defender.id] ?? resolution.defenderCountBefore;
      const restored = Math.max(1, Math.ceil(initial * 0.25));
      graveDustReturn = { side: graveDust.side, owner, restored };
    } else {
      battle.log.push('Grave-Dust cannot return a summoned or already-saved company.');
    }
  }
  const fallenHeroForArtifact = defender.side === 'attacker'
    ? battle.attackerHero : battle.defenderHero;
  if (fallenHeroForArtifact && hasArtifactEffect(fallenHeroForArtifact, 'inherit_destroyed_stats')) {
    battle.inheritedArtifactStats[defender.side] = {
      attack: UNITS[defender.unitId].attack,
      defense: UNITS[defender.unitId].defense,
    };
    battle.log.push('Hand-Me-Down Armor holds the fallen company\'s Attack and Defense.');
  }
  if (fallenHeroForArtifact && hasArtifactEffect(fallenHeroForArtifact, 'death_mana')
      && !battle.artifactEffectUses[defender.side].death_mana) {
    addManaClamped(fallenHeroForArtifact,
      artifactEffectTotal(fallenHeroForArtifact, 'death_mana'));
    battle.artifactEffectUses[defender.side].death_mana = 1;
  }
  const proportionality = destructionProportionality(battle, defender);
  battle.recentDestructionScale[defender.side] = proportionality;
  const cause = resolution.deathCause ?? 'attack';
  const sacrificePayoffs = cause === 'sacrifice';
  const attackPayoffs = cause === 'attack';
  const spellImpact = cause === 'spell-impact';
  const triggerCount = ownerDeathTriggerCount(battle, defender.side);
  for (let trigger = 0; trigger < triggerCount; trigger += 1) {
    battle.stacks.filter((stack) => stack.count > 0 && stack.side !== defender.side
      && stackHasAbility(stack, 'soul_tithe')).sort((a, b) => a.slot - b.slot
      || a.id.localeCompare(b.id)).forEach((stack) => {
        stack.abilityUses = {
          ...stack.abilityUses, soul_tithe: (stack.abilityUses?.soul_tithe ?? 0) + 1,
        };
      });
  }
  for (let trigger = 0; trigger < triggerCount && stackHasAbility(defender, 'unstable'); trigger += 1) {
    const blast = Math.ceil((battle.initialCounts[defender.id] ?? resolution.defenderCountBefore)
      * stackUnitHp(defender) * 0.20);
    const adjacent = battle.stacks.filter((stack) => stack.count > 0
      && stack.id !== defender.id && stacksAdjacent(stack, defender))
      .sort((a, b) => a.id.localeCompare(b.id));
    const deaths: Array<{ target: BattleStack; hpBefore: number; countBefore: number }> = [];
    for (const target of adjacent) {
      const result = applyRoutedCombatDamage(battle, target, blast, { recordDestruction: false });
      for (const death of [result.primary, result.linked]) if (death?.destroyed) {
        deaths.push(death);
      }
    }
    runExternalDeathPipelines(battle, deaths, 'spell-impact', defender.side);
  }
  for (let trigger = 0; trigger < triggerCount; trigger += 1) {
    if ((attackPayoffs || sacrificePayoffs) && (UNITS[defender.unitId].faction === 'unfinished'
        || stackHasAbility(defender, 'still_aboard'))) {
      const defenderHero = defender.side === 'attacker'
        ? battle.attackerHero : battle.defenderHero;
      const rate = stackHasAbility(defender, 'still_aboard') ? 0.1
        : defenderHero
          ? specialtyHandler(defenderHero).unfinishedBusinessRate?.() ?? 0.15 : 0.15;
      const backlash = Math.ceil(resolution.defenderHpBefore * rate);
      applyRoutedCombatDamage(battle, attacker, backlash);
      battle.log.push(`Unfinished business deals ${backlash} damage to its killer.`);
    }
    if (stackHasAbility(defender, 'last_light')) {
      const defenderHero = defender.side === 'attacker'
        ? battle.attackerHero : battle.defenderHero;
      const hex = Math.round(enemyDeathTriggerMagnitude(battle, defender.side, defenderHero
        ? specialtyHandler(defenderHero).lastLightHex?.() ?? 2 : 2)
        * proportionality);
      battle.stacks.filter((stack) => stack.count > 0 && stack.side !== defender.side
        && stacksAdjacent(stack, defender))
        .forEach((stack) => addBattleCounter(battle, stack, 'hex', hex, defender.side));
    }
    if (stackHasAbility(defender, 'the_errand_passes')) {
      battle.pendingFreeMove = { side: defender.side, sourceId: defender.id };
    }
  }
  const loyal = effectOn(defender, 'loyalUntoDeath');
  if (loyal && attacker.count > 0 && (attackPayoffs || sacrificePayoffs)) {
    const unit = UNITS[defender.unitId];
    const damage = Math.round(
      resolution.defenderCountBefore * (unit.damage[0] + unit.damage[1]) / 2,
    );
    applyRoutedCombatDamage(battle, attacker, damage);
    if (loyal.magnitude >= 2) {
      const hero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      if (hero) addManaClamped(hero, 3);
    }
  }
  const bonusBefore = new Map(battle.stacks.map((stack) => [stack.id, stack.bonusActions]));
  for (const stack of battle.stacks) {
    if (stack.count <= 0) continue;
    if (stackHasAbility(stack, 'mindless')) continue;
    const bloodPrice = (stack.side === 'attacker'
      ? battle.attackerHero?.faction : battle.defenderHero?.faction) === 'wildergrass';
    if (sacrificePayoffs) {
      // A self-destruction has no killer: enemies receive no kill credit or morale. Surviving
      // tactical allies still see the loss, including Blood Price and Loyal's loss prevention.
      if (stack.side !== defender.side || stack.id === defender.id) continue;
      if (loyal?.magnitude && loyal.magnitude >= 2) continue;
      if (bloodPrice) {
        const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
        grantSystemMeter(stack, ((hero
          ? specialtyHandler(hero).bloodPriceMeter?.() ?? 20 : 20)
          + battle.bloodPriceBonus[stack.side]) * proportionality, battle);
      } else {
        const allies = battle.stacks.filter(
          (other) => other.side === stack.side && other.count > 0,
        );
        const hasOriflamme = allies.some((other) => stackHasAbility(other, 'oriflamme'));
        const steadfast = UNITS[stack.unitId].faction === 'hearthguard';
        const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
        const drainMultiplier = hero
          ? 1 - artifactEffectTotal(hero, 'reduced_meter_drain', 'percent') / 100 : 1;
        loseMeter(stack, (hasOriflamme ? 0 : steadfast ? 15 : MORALE_ALLY_LOSS)
          * proportionality * drainMultiplier, battle);
      }
      continue;
    }
    if (spellImpact) {
      if (stack.side === attacker.side) {
        grantSystemMeter(stack, (bloodPrice ? 5 : MORALE_ALLY_KILL_GAIN) * proportionality, battle);
      } else if (stack.id !== defender.id) {
        if (bloodPrice) {
          const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
          grantSystemMeter(stack, ((hero
            ? specialtyHandler(hero).bloodPriceMeter?.() ?? 20 : 20)
            + battle.bloodPriceBonus[stack.side]) * proportionality, battle);
          continue;
        }
        const allies = battle.stacks.filter(
          (other) => other.side === stack.side && other.count > 0,
        );
        const hasOriflamme = allies.some((other) => stackHasAbility(other, 'oriflamme'));
        const steadfast = UNITS[stack.unitId].faction === 'hearthguard';
        const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
        const drainMultiplier = hero
          ? 1 - artifactEffectTotal(hero, 'reduced_meter_drain', 'percent') / 100 : 1;
        loseMeter(stack, (hasOriflamme ? 0 : steadfast ? 15 : MORALE_ALLY_LOSS)
          * proportionality * drainMultiplier, battle);
      }
      continue;
    }
    if (!attackPayoffs) continue;
    if (stack.side === attacker.side) {
      grantSystemMeter(stack, (bloodPrice ? 5 : stack.id === attacker.id
        ? MORALE_KILLING_STACK_GAIN : MORALE_ALLY_KILL_GAIN) * proportionality, battle);
    } else if (stack.id !== defender.id) {
      if (loyal?.magnitude && loyal.magnitude >= 2) continue;
      if (bloodPrice) {
        const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
        grantSystemMeter(stack, ((hero
          ? specialtyHandler(hero).bloodPriceMeter?.() ?? 20 : 20)
          + battle.bloodPriceBonus[stack.side]) * proportionality, battle);
        continue;
      }
      const allies = battle.stacks.filter(
        (other) => other.side === stack.side && other.count > 0,
      );
      const hasOriflamme = allies.some((other) => stackHasAbility(other, 'oriflamme'));
      const steadfast = UNITS[stack.unitId].faction === 'hearthguard';
      const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      const drainMultiplier = hero
        ? 1 - artifactEffectTotal(hero, 'reduced_meter_drain', 'percent') / 100 : 1;
      const loss = (hasOriflamme ? 0 : steadfast ? 15 : MORALE_ALLY_LOSS)
        * proportionality * drainMultiplier;
      loseMeter(stack, loss, battle);
    }
  }
  const triggered = battle.stacks.reduce(
    (sum, stack) => sum + Math.max(0, stack.bonusActions - (bonusBefore.get(stack.id) ?? 0)), 0,
  );
  if (triggered > 0) {
    battle.stacks.filter((stack) => stack.count > 0 && stackHasAbility(stack, 'rampant'))
      .forEach((stack) => grantSystemMeter(stack, triggered * 15, battle));
  }
  if (stackHasAbility(defender, 'unfinished_vow') && defender.count <= 0
      && defender.claimedDestructionSaveEvent !== destructionEvent
      && (defender.abilityUses?.unfinished_vow ?? 0) === 0) {
    claimDestructionSave(defender, destructionEvent);
    defender.abilityUses = { ...defender.abilityUses, unfinished_vow: 1 };
    defender.count = Math.max(1, Math.ceil((battle.initialCounts[defender.id] ?? 1) / 2));
    defender.topHp = UNITS[defender.unitId].hp;
    battle.log.push(`${UNITS[defender.unitId].name} returns to finish its vow.`);
  }
  const defenderOwner = originalOwnerSide(defender);
  const fallenHero = defenderOwner === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const lastAlliedStack = !battle.stacks.some((stack) => isOriginallyOwnedBy(stack, defenderOwner)
    && stack.id !== defender.id && stack.count > 0 && !stack.summoned);
  if (defender.count <= 0 && lastAlliedStack && !battle.lastToyUsed[defenderOwner]
      && defender.claimedDestructionSaveEvent !== destructionEvent
      && fallenHero && hasEquippedArtifact(fallenHero, 'lastToy')) {
    claimDestructionSave(defender, destructionEvent);
    battle.lastToyUsed[defenderOwner] = true;
    defender.count = 1; defender.topHp = 1;
    const losses = battle.casualties[defenderOwner];
    losses[defender.unitId] = Math.max(0, (losses[defender.unitId] ?? 0) - 1);
    battle.log.push('The Last Toy leaves one figure standing.');
  }
  if (defender.count <= 0 && !battle.longestCandleUsed[defenderOwner] && fallenHero
      && defender.claimedDestructionSaveEvent !== destructionEvent
      && hasEquippedArtifact(fallenHero, 'longestCandle')) {
    claimDestructionSave(defender, destructionEvent);
    battle.longestCandleUsed[defenderOwner] = true;
    battle.longestCandlePending[defenderOwner] = defender.id;
    battle.log.push('The Longest Candle keeps a fallen company for round end.');
  }
  const standard = attackPayoffs
    ? enchantmentMultiplier(battle, attacker.side, 'standardOfDawn') : 0;
  if (standard) {
    battle.stacks.filter((stack) => stack.side === attacker.side && stack.count > 0)
      .forEach((stack) => grantSystemMeter(stack,
        enemyDeathTriggerMagnitude(battle, attacker.side, 10 * standard) * proportionality, battle));
  }
  const dawn = attackPayoffs && battle.enchantments[attacker.side].find(
    (effect) => effect.spellId === 'standardOfDawn' && effect.upgraded,
  );
  if (dawn && battle.standardDawnKillRound?.[attacker.side] !== battle.round) {
    battle.standardDawnKillRound ??= {};
    battle.standardDawnKillRound[attacker.side] = battle.round;
    attacker.roundSpeedBonus = (attacker.roundSpeedBonus ?? 0) + 2;
    grantExtraAction(battle, attacker.id);
  }
  const candle = triggerCount > 0 && (attackPayoffs || sacrificePayoffs)
    ? battle.enchantments[defender.side].find(
    (effect) => effect.spellId === 'lastCandle',
  ) : undefined;
  if (candle) {
    battle.stacks.filter((stack) => stack.count > 0).forEach((stack) => {
      if (stack.side === defender.side) {
        grantSystemMeter(stack, enemyDeathTriggerMagnitude(battle, defender.side, 20 * candle.multiplier)
          * proportionality, battle);
      }
      else addSpellCounter(battle, stack, 'hex', Math.round(
        scaledCounter(enemyDeathTriggerMagnitude(battle, defender.side, 2 * candle.multiplier),
          (defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero)
            ?.spellPower ?? 0) * proportionality,
      ), defender.side, { scalesWithSpellPower: false });
    });
    if (candle.upgraded) {
      const hero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      if (hero) addManaClamped(hero, Math.round(2 * proportionality));
    }
  }
  if (graveDustReturn && defender.count <= 0) {
    const { side, owner, restored } = graveDustReturn;
    defender.originalSide = owner === side ? undefined : owner;
    defender.side = side;
    defender.count = restored;
    defender.topHp = stackUnitHp(defender);
    battle.casualties[owner][defender.unitId] = Math.max(0,
      (battle.casualties[owner][defender.unitId] ?? 0) - restored);
    battle.log.push(`Grave-Dust returns ${restored} ${UNITS[defender.unitId].name} on the ${side} side.`);
  }
});

/** Runs a deliberate sacrifice through the same destruction/save/trigger boundary as an attack. */
type ExternalDeath = { target: BattleStack; hpBefore: number; countBefore: number };
const externalDeathQueues = new WeakMap<BattleState, Array<ExternalDeath & {
  cause: 'sacrifice' | 'spell-impact'; sourceSide: BattleSide;
}>>();
const settlingExternalDeaths = new WeakSet<BattleState>();

function runExternalDeathPipelines(
  battle: BattleState, deaths: ExternalDeath[], cause: 'sacrifice' | 'spell-impact',
  sourceSide: BattleSide,
): void {
  const queue = externalDeathQueues.get(battle) ?? [];
  externalDeathQueues.set(battle, queue);
  const known = new Set(queue.map((entry) => entry.target.id));
  deaths.sort((a, b) => a.target.id.localeCompare(b.target.id)).forEach((death) => {
    if (!known.has(death.target.id) && (death.target.destructionEvents ?? 0) === 0) {
      queue.push({ ...death, cause, sourceSide }); known.add(death.target.id);
    }
  });
  if (settlingExternalDeaths.has(battle)) return;
  settlingExternalDeaths.add(battle);
  try {
    while (queue.length) {
      const entry = queue.shift()!;
      settleExternalDeath(battle, entry.target, entry.hpBefore, entry.countBefore,
        entry.cause, entry.sourceSide);
    }
  } finally {
    settlingExternalDeaths.delete(battle);
    externalDeathQueues.delete(battle);
  }
}

function settleExternalDeath(
  battle: BattleState, destroyed: BattleStack, hpBefore: number, countBefore: number,
  cause: 'sacrifice' | 'spell-impact', sourceSide = destroyed.side,
): void {
  const surrogateSide = cause === 'spell-impact' ? sourceSide
    : sourceSide === 'attacker' ? 'defender' : 'attacker';
  const surrogate = battle.stacks.filter((stack) => stack.count > 0
    && stack.side === surrogateSide).sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))[0]
    ?? battle.stacks.filter((stack) => stack.count > 0 && stack.id !== destroyed.id)
      .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))[0]
    ?? destroyed;
  const resolution: AttackResolution = {
    battle, actorId: surrogate.id, targetId: destroyed.id, attacker: surrogate,
    defender: destroyed, isRetaliation: false, abilitySecondary: false, ranged: false,
    damage: hpBefore, actualDamage: hpBefore, kills: countBefore, reflectedDamage: 0, reflectedKills: 0,
    linkedDamage: 0, linkedKills: 0, linkedHpBefore: 0, linkedCountBefore: 0,
    secondaryDeaths: [], defenderHpBefore: hpBefore, defenderCountBefore: countBefore,
    ignoreRetaliation: true, deathCause: cause,
    damageScale: 1, friendlyFire: false, firstStrikeResolved: false,
    suppressRetaliation: true,
  };
  hooks['death-triggers'].forEach((hook) => hook(resolution));
}

export function runExternalDeathPipeline(
  battle: BattleState, destroyed: BattleStack, hpBefore: number, countBefore: number,
  cause: 'sacrifice' | 'spell-impact', sourceSide = destroyed.side,
): void {
  runExternalDeathPipelines(battle, [{ target: destroyed, hpBefore, countBefore }],
    cause, sourceSide);
}

export function runSacrificeDeathPipeline(
  battle: BattleState, destroyed: BattleStack, hpBefore: number, countBefore: number,
): void {
  runExternalDeathPipeline(battle, destroyed, hpBefore, countBefore, 'sacrifice');
}

hooks.retaliation.push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (resolution.isRetaliation || resolution.abilitySecondary || resolution.firstStrikeResolved
      || resolution.suppressRetaliation || resolution.ranged || !attacker || !defender) return;
  if (resolution.ignoreRetaliation) return;
  const allowance = retaliationAllowance(battle, attacker, defender);
  if (!allowance.allowed) return;
  consumeRetaliation(defender, allowance.unlimited);
  runAttackPipeline(battle, defender.id, attacker.id, true);
});

export function runAttackPipeline(
  battle: BattleState,
  actorId: string,
  targetId: string,
  isRetaliation = false,
  abilitySecondary = false, damageScale = 1, friendlyFire = false,
  patternResolved = false, suppressRetaliation = false,
  prepared?: AttackResolution,
): void {
  const initialAttacker = battle.stacks.find((stack) => stack.id === actorId
    && (Boolean(prepared) || stack.count > 0));
  const initialDefender = battle.stacks.find((stack) => stack.id === targetId && stack.count > 0);
  if (!isRetaliation && !abilitySecondary && !patternResolved && initialAttacker && initialDefender) {
    const plan = attackPatternPlan(battle, initialAttacker, initialDefender);
    if (plan) {
      let firstStrikeUsed = false;
      if (!plan.suppressPrimaryRetaliation && !canUseRanged(initialAttacker)
          && stackHasAbility(initialDefender, 'first_strike') && !effectOn(initialDefender, 'quiet')
          && !preventsRetaliation(initialAttacker)) {
        const allowance = retaliationAllowance(battle, initialAttacker, initialDefender);
        if (allowance.allowed) {
          consumeRetaliation(initialDefender, allowance.unlimited);
          runAttackPipeline(battle, initialDefender.id, initialAttacker.id, true, false, 1,
            false, true);
          firstStrikeUsed = true;
          if (initialAttacker.count <= 0) return;
        }
      }
      const ordered = [plan.victims[0], ...plan.victims.slice(1)
        .sort((a, b) => a.stack.id.localeCompare(b.stack.id))];
      const preparedVictims = ordered.map((victim, index) => {
        const snapshot = cloneBattle(battle);
        const draft: AttackResolution = {
          battle: snapshot, actorId, targetId: victim.stack.id, isRetaliation: false,
          abilitySecondary: index > 0, ranged: false, damage: 0, actualDamage: 0, kills: 0,
          reflectedDamage: 0, reflectedKills: 0, linkedDamage: 0, linkedKills: 0,
          linkedHpBefore: 0, linkedCountBefore: 0, secondaryDeaths: [], ignoreRetaliation: false,
          defenderHpBefore: 0, defenderCountBefore: 0, damageScale: victim.scale,
          friendlyFire: victim.friendlyFire, firstStrikeResolved: false, suppressRetaliation: true,
        };
        for (const stage of RESOLUTION_STAGES.slice(0, 5)) {
          for (const hook of hooks[stage]) hook(draft);
        }
        return draft;
      });
      ordered.forEach((victim, index) => runAttackPipeline(
        battle, actorId, victim.stack.id, false, index > 0, victim.scale,
        victim.friendlyFire, true, true, preparedVictims[index],
      ));
      initialAttacker.attacksMade += 1;
      const blessing = effectOn(initialAttacker, 'blessing');
      if (blessing) initialAttacker.effects = initialAttacker.effects.filter(
        (effect) => effect.id !== blessing.id,
      );
      consumeP1AttackEffects(initialAttacker);
      if (!plan.suppressPrimaryRetaliation && !firstStrikeUsed) {
        const attacker = battle.stacks.find((stack) => stack.id === actorId && stack.count > 0);
        const defender = battle.stacks.find((stack) => stack.id === targetId && stack.count > 0);
        if (attacker && defender && !battle.retaliationSuppressed[attacker.side]
            && !preventsRetaliation(attacker) && !effectOn(defender, 'quiet')) {
          const allowance = retaliationAllowance(battle, attacker, defender);
          if (allowance.allowed) {
            consumeRetaliation(defender, allowance.unlimited);
            runAttackPipeline(battle, defender.id, attacker.id, true, false, 1, false, true);
          }
        }
      }
      return;
    }
  }
  let firstStrikeResolved = false;
  if (!isRetaliation && !abilitySecondary && !suppressRetaliation && initialAttacker && initialDefender
      && !canUseRanged(initialAttacker) && stacksAdjacent(initialAttacker, initialDefender)
      && stackHasAbility(initialDefender, 'first_strike') && !effectOn(initialDefender, 'quiet')) {
    const allowance = retaliationAllowance(battle, initialAttacker, initialDefender);
    if (allowance.allowed) {
      consumeRetaliation(initialDefender, allowance.unlimited);
      runAttackPipeline(battle, initialDefender.id, initialAttacker.id, true);
      firstStrikeResolved = true;
      if (initialAttacker.count <= 0) return;
    }
  }
  const resolution: AttackResolution = prepared ? {
    ...prepared, battle, actorId, targetId, isRetaliation, abilitySecondary,
    attacker: initialAttacker, defender: initialDefender, linkedTarget: undefined,
    secondaryDeaths: [], damageScale, friendlyFire, suppressRetaliation,
  } : {
    battle, actorId, targetId, isRetaliation, abilitySecondary, ranged: false,
    damage: 0, actualDamage: 0, kills: 0, reflectedDamage: 0, reflectedKills: 0,
    linkedDamage: 0, linkedKills: 0, linkedHpBefore: 0, linkedCountBefore: 0,
    secondaryDeaths: [], ignoreRetaliation: false,
    defenderHpBefore: 0, defenderCountBefore: 0,
    damageScale, friendlyFire, firstStrikeResolved, suppressRetaliation,
  };
  if (prepared && initialDefender) {
    const ward = effectOn(initialDefender, 'ward');
    const preparedDefender = prepared.defender;
    if (ward && preparedDefender && !effectOn(preparedDefender, 'ward')) {
      initialDefender.effects = initialDefender.effects.filter((effect) => effect.id !== ward.id);
      if (ward.magnitude >= 2 && initialAttacker) {
        addBattleCounter(battle, initialAttacker, 'burn', 2, ward.sourceSide);
      }
    }
  }
  for (const stage of prepared ? RESOLUTION_STAGES.slice(5) : RESOLUTION_STAGES) {
    for (const hook of hooks[stage]) hook(resolution);
  }
  for (const secondary of resolution.secondaryDeaths) {
    const linkedResolution: AttackResolution = {
      ...resolution,
      actorId: secondary.attacker.id,
      attacker: secondary.attacker,
      targetId: secondary.damage.target.id,
      defender: secondary.damage.target,
      damage: secondary.damage.damage,
      actualDamage: secondary.damage.damage,
      kills: secondary.damage.kills,
      defenderHpBefore: secondary.damage.hpBefore,
      defenderCountBefore: secondary.damage.countBefore,
      linkedTarget: undefined,
      linkedDamage: 0,
      linkedKills: 0,
      linkedHpBefore: 0,
      linkedCountBefore: 0,
      reflectedDamage: 0,
      reflectedKills: 0,
      secondaryDeaths: [],
      damageScale: 1, friendlyFire: false, firstStrikeResolved: false,
      suppressRetaliation: true,
    };
    for (const hook of hooks['death-triggers']) hook(linkedResolution);
  }
  const attacker = resolution.attacker;
  const defender = resolution.defender;
  if (!isRetaliation && attacker && defender) {
    if (stackHasAbility(attacker, 'sting_and_circle') && attacker.lastAttackOrigin) {
      const occupied = occupiedByStacks(battle.stacks, attacker.id);
      const blockers = new Set([...battle.obstacles,
        ...battle.tiles.filter((tile) => tile.type === 'wall').map((tile) => tile.position)]
        .map(coordKey));
      if (footprintFits(attacker, attacker.lastAttackOrigin, occupied, blockers)) {
        attacker.position = { ...attacker.lastAttackOrigin };
      }
    }
    if (stackHasAbility(attacker, 'sweep') && defender.count > 0) {
      const occupied = occupiedByStacks(battle.stacks, defender.id);
      const blockers = new Set(battle.obstacles.map(coordKey));
      const attackerHero = attacker.side === 'attacker'
        ? battle.attackerHero : battle.defenderHero;
      const distance = attackerHero
        ? specialtyHandler(attackerHero).sweepDistance?.(attacker.unitId) ?? 1 : 1;
      let destination = stackHexes(defender).flatMap(hexNeighbors)
        .filter((coord, index, all) => all.findIndex((item) =>
          item.x === coord.x && item.y === coord.y) === index)
        .filter((coord) => footprintFits(defender, coord, occupied, blockers))
        .sort((a, b) => {
          const da = Math.abs(a.x - attacker.position.x) + Math.abs(a.y - attacker.position.y);
          const db = Math.abs(b.x - attacker.position.x) + Math.abs(b.y - attacker.position.y);
          return db - da;
        })[0];
      if (destination && distance > 1) {
        destination = hexNeighbors(destination)
          .filter((coord) => footprintFits(defender, coord, occupied, blockers))
          .sort((a, b) => {
            const da = Math.abs(a.x - attacker.position.x) + Math.abs(a.y - attacker.position.y);
            const db = Math.abs(b.x - attacker.position.x) + Math.abs(b.y - attacker.position.y);
            return db - da;
          })[0] ?? destination;
      }
      if (destination) defender.position = { ...destination };
    }
    if (!abilitySecondary && attacker.count > 0 && stackHasAbility(attacker, 'skim')) {
      const second = battle.stacks.find((stack) => stack.count > 0
        && stack.side === defender.side && stack.id !== defender.id
        && stacksAdjacent(stack, defender));
      if (second) runAttackPipeline(battle, attacker.id, second.id, false, true);
    }
    if (!abilitySecondary && stackHasAbility(attacker, 'skirmish')) {
      const attackerHero = attacker.side === 'attacker'
        ? battle.attackerHero : battle.defenderHero;
      const ignoreSlows = attackerHero
        ? specialtyHandler(attackerHero).skirmishIgnoresSlows?.(attacker.unitId) : false;
      const remaining = Math.max(0,
        (ignoreSlows ? UNITS[attacker.unitId].speed : effectiveSpeed(attacker, battle))
          - attacker.movedHexes,
      );
      if (remaining > 0) attacker.postAttackMovePoints = remaining;
    }
    attacker.lastAttackOrigin = undefined;
  }
}

export function runTurnAdvancePipeline(battle: BattleState): void {
  for (const side of ['attacker', 'defender'] as const) {
    const pending = battle.longestCandlePending[side];
    if (!pending) continue;
    const stack = battle.stacks.find((candidate) => candidate.id === pending);
    if (stack && stack.count <= 0) {
      const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      const returnShare = hero && hasArtifactSetBonus(hero, 'mournersSuit', 3) ? 0.5 : 0.25;
      stack.count = Math.max(1, Math.ceil((battle.initialCounts[stack.id] ?? 1) * returnShare));
      stack.topHp = stackUnitHp(stack);
      battle.log.push(`${UNITS[stack.unitId].name} return by the Longest Candle.`);
    }
    battle.longestCandlePending[side] = null;
  }
  for (const stack of battle.stacks.filter((candidate) => candidate.count > 0)) {
    for (const handler of battleAbilityHandlers(battle, stack)) {
      if (handler.stage !== 'turn-advance' || !handler.healsToInitialAtRoundEnd) continue;
      const initial = battle.initialCounts[stack.id] ?? stack.count;
      stack.count = initial;
      stack.topHp = stackUnitHp(stack);
      battle.log.push(`${UNITS[stack.unitId].name} mends to full.`);
    }
  }
  const hut = battle.stacks.find((stack) => stack.count > 0
    && stackHasAbility(stack, 'fowl_legs'));
  if (hut && !battle.pendingFreeMove) battle.pendingFreeMove = {
    side: hut.side, sourceId: hut.id, targetId: hut.id, anywhere: true,
    label: `${UNITS[hut.unitId].name} strides across the field.`,
  };
}
