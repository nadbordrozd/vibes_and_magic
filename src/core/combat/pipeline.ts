import { UNITS } from '../../content/units';
import {
  MORALE_ALLY_KILL_GAIN, MORALE_ALLY_LOSS,
  MORALE_KILLING_STACK_GAIN, MORALE_THRESHOLD,
} from '../../content/constants';
import type { BattleState, BattleStack } from '../types';
import {
  attackAbilityMultiplier, battleAbilityHandlers, hasUnlimitedRetaliations,
  pinsIncomingRollToMinimum, preventsRetaliation, stackHasAbility,
} from './abilities';
import {
  applyDamage, canUseRanged, computeDamage, hasAdjacentEnemy, stackUnitHp,
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
  const armyTotalMaxHp = battle.stacks.filter((stack) => stack.side === destroyed.side
    && !stack.summoned).reduce((sum, stack) => sum
      + (battle.initialCounts[stack.id] ?? stack.count) * stackUnitHp(stack), 0);
  return armyTotalMaxHp <= 0 ? 1 : Math.min(1, destroyedMaxHp / (armyTotalMaxHp * 0.1));
}
import { coordKey } from '../map/pathfinding';
import {
  addBattleCounter, effectOn, effectiveSpeed, enchantmentMultiplier, grantMeter,
} from './magicEffects';
import { specialtyHandler } from '../heroBehaviors';
import { artifactEffectTotal, consumeEquippedArtifact, hasEquippedArtifact } from '../artifacts';
import { wallsDefenseMultiplier } from '../skills/expansionHooks';

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
  kills: number;
  reflectedDamage: number;
  reflectedKills: number;
  defenderHpBefore: number;
  defenderCountBefore: number;
}

type StageHook = (resolution: AttackResolution) => void;

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
      || resolution.attacker.side === resolution.defender.side) {
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
  let abilityMultiplier = attackAbilityMultiplier(attacker);
  if (attacker.doubleNextAttack) {
    abilityMultiplier *= 2;
    attacker.doubleNextAttack = false;
  }
  if (stackHasAbility(attacker, 'swelling_dirge')) {
    abilityMultiplier *= 1 + battle.destroyedStacks * 0.05;
  }
  if (stackHasAbility(attacker, 'pack_hunger')
      && defender.count < (battle.initialCounts[defender.id] ?? defender.count)) {
    abilityMultiplier *= attackerSpecialty?.packHungerMultiplier?.() ?? 1.15;
  }
  if (resolution.isRetaliation) {
    abilityMultiplier *= attackerSpecialty?.retaliationMultiplier?.(attacker.unitId) ?? 1;
  }
  if (abilityMultiplier !== 1 && defenderHero
      && !battle.ironNailSpent[defender.side]
      && hasEquippedArtifact(defenderHero, 'ironNail')) {
    consumeEquippedArtifact(defenderHero, 'ironNail');
    battle.ironNailSpent[defender.side] = true;
    abilityMultiplier = 1;
    battle.log.push('The Iron Nail catches an enemy ability and is spent.');
  }
  resolution.damage = computeDamage({
    attacker,
    defender,
    attackerHeroAttack: (attackerHero?.attack ?? 0)
      + (attackerSpecialty?.unitAttackBonus?.(attacker.unitId) ?? 0)
      + (attackerHero && UNITS[attacker.unitId].faction === 'unfinished'
        ? artifactEffectTotal(attackerHero, 'unfinished_stats') : 0),
    defenderHeroDefense: (defenderHero?.defense ?? 0)
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
      attackerSpecialty?.rangedAdjacentPenalty?.(attackerHero!, attacker.unitId) ?? false,
    wallsPenalty: battle.defenderWalls
      && attacker.side === 'attacker' && defender.side === 'defender',
    rollPosition: (pinsIncomingRollToMinimum(defender)
        || (resolution.ranged && stackHasAbility(defender, 'shellback')))
        || Boolean(effectOn(defender, 'oathOfIron'))
      ? 'minimum'
      : effectOn(attacker, 'blessing') ? 'maximum' : 'luck',
    abilityMultiplier: abilityMultiplier
      * (stackHasAbility(attacker, 'siege_ram') && stackHasAbility(defender, 'siege_wall')
        ? 2 : 1)
      * (1 + defender.counters.hex * 0.05),
  });
});

hooks['damage-routing'].push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (!attacker || !defender) return;
  const ward = effectOn(defender, 'ward');
  if (ward) {
    resolution.damage = 0;
    defender.effects = defender.effects.filter((effect) => effect.id !== ward.id);
    if (ward.magnitude >= 2) {
      addBattleCounter(battle, attacker, 'burn', 2, ward.sourceSide);
    }
  }
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
    for (const handler of battleAbilityHandlers(battle, defender)) {
      if (handler.stage !== 'damage-routing' || !handler.meleeReflection) continue;
      resolution.reflectedDamage += resolution.damage * handler.meleeReflection;
      if (handler.replacesMeleeDamage) resolution.damage = 0;
    }
  }
  resolution.damage = Math.max(0, Math.round(resolution.damage));
  resolution.reflectedDamage = Math.max(0, Math.round(resolution.reflectedDamage));
});

hooks.apply.push((resolution) => {
  const { attacker, defender } = resolution;
  if (!attacker || !defender) return;
  resolution.defenderHpBefore = (defender.count - 1)
    * stackUnitHp(defender)
    + defender.topHp;
  resolution.defenderCountBefore = defender.count;
  attacker.lastAttackOrigin ??= { ...attacker.position };
  resolution.kills = applyDamage(defender, resolution.damage);
  resolution.reflectedKills = applyDamage(attacker, resolution.reflectedDamage);
  attacker.damageDealt = (attacker.damageDealt ?? 0) + resolution.damage;
  defender.damageTaken = (defender.damageTaken ?? 0) + resolution.damage;
  attacker.attacksMade += 1;
  attacker.movedHexes = 0;
  const blessing = effectOn(attacker, 'blessing');
  if (blessing) {
    attacker.effects = attacker.effects.filter((effect) => effect.id !== blessing.id);
  }
  const veil = effectOn(defender, 'mournersVeil');
  if (veil?.id.endsWith(':plus')) {
    addBattleCounter(resolution.battle, attacker, 'hex', 1, veil.sourceSide);
  }
  if (resolution.ranged) attacker.shots -= 1;
  if (resolution.ranged && stackHasAbility(attacker, 'web') && defender.count > 0) {
    addBattleCounter(resolution.battle, defender, 'chill', 2, attacker.side);
  }
  if (resolution.ranged && stackHasAbility(attacker, 'the_song') && defender.count > 0) {
    defender.morale = Math.max(0, defender.morale - 10);
  }
  if (effectOn(attacker, 'forgeSpark') && defender.count > 0) {
    addBattleCounter(resolution.battle, defender, 'burn', 1, attacker.side);
  }
  const attackerHero = attacker.side === 'attacker'
    ? resolution.battle.attackerHero : resolution.battle.defenderHero;
  if (stackHasAbility(attacker, 'pecking_order') && defender.count > 0
      && (!resolution.isRetaliation
        || (attackerHero
          && specialtyHandler(attackerHero).retaliationAppliesHex?.(attacker.unitId)))) {
    addBattleCounter(resolution.battle, defender, 'hex', 1, attacker.side);
  }
  if (stackHasAbility(attacker, 'storm_wake')) {
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
  const losses = resolution.battle.casualties[defender.side];
  losses[defender.unitId] = (losses[defender.unitId] ?? 0) + resolution.kills;
  if (resolution.reflectedDamage > 0) {
    resolution.battle.log.push(
      `${UNITS[attacker.unitId].name} suffers ${resolution.reflectedDamage} reflected damage.`,
    );
    const reflectedLosses = resolution.battle.casualties[attacker.side];
    reflectedLosses[attacker.unitId] =
      (reflectedLosses[attacker.unitId] ?? 0) + resolution.reflectedKills;
  }
});

hooks['death-triggers'].push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (!attacker || !defender || defender.count > 0) return;
  if (stackHasAbility(defender, 'siege_wall') || stackHasAbility(defender, 'mirror_hex')) return;
  battle.destroyedStacks += 1;
  const proportionality = destructionProportionality(battle, defender);
  battle.recentDestructionScale[defender.side] = proportionality;
  const triggerSilenced = battle.enchantments[attacker.side].some(
    (effect) => effect.spellId === 'silenceThePassing',
  );
  const ownSilence = battle.enchantments[defender.side].find(
    (effect) => effect.spellId === 'silenceThePassing',
  );
  const triggerCount = (triggerSilenced ? 0 : ownSilence?.upgraded ? 2 : 1)
    * battle.deathTriggerMultiplier[defender.side];
  for (let trigger = 0; trigger < triggerCount; trigger += 1) {
    if (UNITS[defender.unitId].faction === 'unfinished'
        || stackHasAbility(defender, 'still_aboard')) {
      const defenderHero = defender.side === 'attacker'
        ? battle.attackerHero : battle.defenderHero;
      const rate = stackHasAbility(defender, 'still_aboard') ? 0.1
        : defenderHero
          ? specialtyHandler(defenderHero).unfinishedBusinessRate?.() ?? 0.15 : 0.15;
      const backlash = Math.ceil(resolution.defenderHpBefore * rate);
      const backlashKills = applyDamage(attacker, backlash);
      battle.casualties[attacker.side][attacker.unitId] =
        (battle.casualties[attacker.side][attacker.unitId] ?? 0) + backlashKills;
      battle.log.push(`Unfinished business deals ${backlash} damage to its killer.`);
    }
    if (stackHasAbility(defender, 'last_light')) {
      const defenderHero = defender.side === 'attacker'
        ? battle.attackerHero : battle.defenderHero;
      const hex = Math.round((defenderHero
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
  if (loyal && attacker.count > 0) {
    const unit = UNITS[defender.unitId];
    const damage = Math.round(
      resolution.defenderCountBefore * (unit.damage[0] + unit.damage[1]) / 2,
    );
    const kills = applyDamage(attacker, damage);
    battle.casualties[attacker.side][attacker.unitId] =
      (battle.casualties[attacker.side][attacker.unitId] ?? 0) + kills;
    if (loyal.magnitude >= 2) {
      const hero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      if (hero) hero.mana += 3;
    }
  }
  const bonusBefore = new Map(battle.stacks.map((stack) => [stack.id, stack.bonusActions]));
  for (const stack of battle.stacks) {
    if (stack.count <= 0) continue;
    const bloodPrice = (stack.side === 'attacker'
      ? battle.attackerHero?.faction : battle.defenderHero?.faction) === 'wildergrass';
    if (stack.side === attacker.side) {
      stack.morale += (bloodPrice ? 5 : stack.id === attacker.id
        ? MORALE_KILLING_STACK_GAIN : MORALE_ALLY_KILL_GAIN) * proportionality;
    } else if (stack.id !== defender.id) {
      if (loyal?.magnitude && loyal.magnitude >= 2) continue;
      if (bloodPrice) {
        const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
        stack.morale += ((hero
          ? specialtyHandler(hero).bloodPriceMeter?.() ?? 20 : 20)
          + battle.bloodPriceBonus[stack.side]) * proportionality;
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
      stack.morale = Math.max(0, stack.morale - loss);
    }
    while (stack.morale >= MORALE_THRESHOLD) {
      stack.morale -= MORALE_THRESHOLD;
      stack.bonusActions += 1;
    }
  }
  const triggered = battle.stacks.reduce(
    (sum, stack) => sum + Math.max(0, stack.bonusActions - (bonusBefore.get(stack.id) ?? 0)), 0,
  );
  if (triggered > 0) {
    battle.stacks.filter((stack) => stack.count > 0 && stackHasAbility(stack, 'rampant'))
      .forEach((stack) => grantMeter(stack, triggered * 15));
  }
  if (stackHasAbility(defender, 'unfinished_vow')
      && (defender.abilityUses?.unfinished_vow ?? 0) === 0) {
    defender.abilityUses = { ...defender.abilityUses, unfinished_vow: 1 };
    defender.count = Math.max(1, Math.ceil((battle.initialCounts[defender.id] ?? 1) / 2));
    defender.topHp = UNITS[defender.unitId].hp;
    battle.log.push(`${UNITS[defender.unitId].name} returns to finish its vow.`);
  }
  const fallenHero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const lastAlliedStack = !battle.stacks.some((stack) => stack.side === defender.side
    && stack.id !== defender.id && stack.count > 0 && !stack.summoned);
  if (defender.count <= 0 && lastAlliedStack && !battle.lastToyUsed[defender.side]
      && fallenHero && hasEquippedArtifact(fallenHero, 'lastToy')) {
    battle.lastToyUsed[defender.side] = true;
    defender.count = 1; defender.topHp = 1;
    const losses = battle.casualties[defender.side];
    losses[defender.unitId] = Math.max(0, (losses[defender.unitId] ?? 0) - 1);
    battle.log.push('The Last Toy leaves one figure standing.');
  }
  if (defender.count <= 0 && !battle.longestCandleUsed[defender.side] && fallenHero
      && hasEquippedArtifact(fallenHero, 'longestCandle')) {
    battle.longestCandleUsed[defender.side] = true;
    battle.longestCandlePending[defender.side] = defender.id;
    battle.log.push('The Longest Candle keeps a fallen company for round end.');
  }
  const standard = enchantmentMultiplier(battle, attacker.side, 'standardOfDawn');
  if (standard) {
    battle.stacks.filter((stack) => stack.side === attacker.side && stack.count > 0)
      .forEach((stack) => grantMeter(stack, 10 * standard * proportionality));
  }
  const candle = triggerCount > 0 ? battle.enchantments[defender.side].find(
    (effect) => effect.spellId === 'lastCandle',
  ) : undefined;
  if (candle) {
    battle.stacks.filter((stack) => stack.count > 0).forEach((stack) => {
      if (stack.side === defender.side) {
        grantMeter(stack, 20 * candle.multiplier * proportionality);
      }
      else addBattleCounter(
        battle, stack, 'hex', Math.round(2 * candle.multiplier * proportionality), defender.side,
      );
    });
    if (candle.upgraded) {
      const hero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      if (hero) hero.mana += Math.round(2 * proportionality);
    }
  }
});

hooks.retaliation.push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (resolution.isRetaliation || resolution.abilitySecondary
      || resolution.ranged || !attacker || !defender) return;
  if (battle.retaliationSuppressed[attacker.side]) return;
  if (preventsRetaliation(attacker)) return;
  if (effectOn(defender, 'quiet')) return;
  const unlimited = hasUnlimitedRetaliations(defender)
    || (effectOn(defender, 'oathOfIron')?.magnitude ?? 0) >= 2;
  const defenderHero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const torcRetaliations = Boolean(defenderHero && stackHasAbility(defender, 'beast')
    && hasEquippedArtifact(defenderHero, 'wolfMothersTorc')) ? 2 : 1;
  if (defender.count <= 0 || (!unlimited
      && (defender.retaliationsMade ?? 0) >= torcRetaliations) || attacker.count <= 0) return;
  if (!unlimited) {
    defender.retaliated = true;
    defender.retaliationsMade = (defender.retaliationsMade ?? 0) + 1;
  }
  runAttackPipeline(battle, defender.id, attacker.id, true);
});

export function runAttackPipeline(
  battle: BattleState,
  actorId: string,
  targetId: string,
  isRetaliation = false,
  abilitySecondary = false,
): void {
  const resolution: AttackResolution = {
    battle, actorId, targetId, isRetaliation, abilitySecondary, ranged: false,
    damage: 0, kills: 0, reflectedDamage: 0, reflectedKills: 0,
    defenderHpBefore: 0, defenderCountBefore: 0,
  };
  for (const stage of RESOLUTION_STAGES) {
    for (const hook of hooks[stage]) hook(resolution);
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
    if (!abilitySecondary && stackHasAbility(attacker, 'skim')) {
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
        (ignoreSlows ? UNITS[attacker.unitId].speed : effectiveSpeed(attacker))
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
      stack.count = Math.max(1, Math.ceil((battle.initialCounts[stack.id] ?? 1) * 0.25));
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
