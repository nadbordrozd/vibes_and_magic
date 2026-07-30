import { UNITS } from '../../content/units';
import {
  MORALE_ALLY_KILL_GAIN, MORALE_ALLY_LOSS,
  MORALE_KILLING_STACK_GAIN, MORALE_THRESHOLD,
} from '../../content/constants';
import type { BattleState, BattleStack } from '../types';
import {
  attackAbilityMultiplier, hasAbility, pinsIncomingRollToMinimum,
  preventsRetaliation,
} from './abilities';
import {
  applyDamage, canUseRanged, computeDamage, hasAdjacentEnemy,
} from './damage';
import { isAdjacent } from './hex';
import {
  addCounter, effectOn, enchantmentMultiplier, grantMeter,
} from './magicEffects';
import { specialtyHandler } from '../heroBehaviors';

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
  attacker?: BattleStack;
  defender?: BattleStack;
  ranged: boolean;
  damage: number;
  kills: number;
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
  if (!resolution.ranged
      && !isAdjacent(resolution.attacker.position, resolution.defender.position)) {
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
  resolution.damage = computeDamage({
    attacker,
    defender,
    attackerHeroAttack: (attackerHero?.attack ?? 0)
      + (attackerSpecialty?.unitAttackBonus?.(attacker.unitId) ?? 0),
    defenderHeroDefense: (defenderHero?.defense ?? 0)
      + (defenderSpecialty?.unitDefenseBonus?.(defender.unitId) ?? 0)
      + (battle.defenderWalls && defender.side === 'defender' ? 2 : 0),
    luck: attackerHero?.luck ?? 0,
    ranged: resolution.ranged,
    adjacentEnemy: hasAdjacentEnemy(attacker, battle.stacks),
    ignoreAdjacentRangedPenalty:
      attackerSpecialty?.rangedAdjacentPenalty?.(attackerHero!, attacker.unitId) ?? false,
    wallsPenalty: battle.defenderWalls
      && attacker.side === 'attacker' && defender.side === 'defender',
    rollPosition: pinsIncomingRollToMinimum(defender)
        || Boolean(effectOn(defender, 'oathOfIron'))
      ? 'minimum'
      : effectOn(attacker, 'blessing') ? 'maximum' : 'luck',
    abilityMultiplier: attackAbilityMultiplier(attacker)
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
    if (ward.magnitude >= 2) addCounter(attacker, 'burn', 2);
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
  resolution.damage = Math.max(0, Math.round(resolution.damage));
});

hooks.apply.push((resolution) => {
  const { attacker, defender } = resolution;
  if (!attacker || !defender) return;
  resolution.kills = applyDamage(defender, resolution.damage);
  attacker.attacksMade += 1;
  attacker.movedHexes = 0;
  const blessing = effectOn(attacker, 'blessing');
  if (blessing) {
    attacker.effects = attacker.effects.filter((effect) => effect.id !== blessing.id);
  }
  const veil = effectOn(defender, 'mournersVeil');
  if (veil?.id.endsWith(':plus')) addCounter(attacker, 'hex', 1);
  if (resolution.ranged) attacker.shots -= 1;
  const verb = resolution.ranged ? 'shoot' : 'attack';
  resolution.battle.log.push(
    `${attacker.count} ${UNITS[attacker.unitId].name} ${verb} `
    + `${UNITS[defender.unitId].name}: ${resolution.damage} damage, `
    + `${resolution.kills} fall`,
  );
  const losses = resolution.battle.casualties[defender.side];
  losses[defender.unitId] = (losses[defender.unitId] ?? 0) + resolution.kills;
});

hooks['death-triggers'].push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (!attacker || !defender || defender.count > 0) return;
  battle.destroyedStacks += 1;
  for (const stack of battle.stacks) {
    if (stack.count <= 0) continue;
    if (stack.side === attacker.side) {
      stack.morale += stack.id === attacker.id
        ? MORALE_KILLING_STACK_GAIN : MORALE_ALLY_KILL_GAIN;
    } else if (stack.id !== defender.id) {
      const allies = battle.stacks.filter(
        (other) => other.side === stack.side && other.count > 0,
      );
      const hasOriflamme = allies.some((other) => hasAbility(other.unitId, 'oriflamme'));
      const steadfast = UNITS[stack.unitId].faction === 'hearthguard';
      const loss = hasOriflamme ? 0 : steadfast ? 15 : MORALE_ALLY_LOSS;
      stack.morale = Math.max(0, stack.morale - loss);
    }
    while (stack.morale >= MORALE_THRESHOLD) {
      stack.morale -= MORALE_THRESHOLD;
      stack.bonusActions += 1;
    }
  }
  const standard = enchantmentMultiplier(battle, attacker.side, 'standardOfDawn');
  if (standard) {
    battle.stacks.filter((stack) => stack.side === attacker.side && stack.count > 0)
      .forEach((stack) => grantMeter(stack, 10 * standard));
  }
  const candle = battle.enchantments[defender.side].find(
    (effect) => effect.spellId === 'lastCandle',
  );
  if (candle) {
    battle.stacks.filter((stack) => stack.count > 0).forEach((stack) => {
      if (stack.side === defender.side) grantMeter(stack, 20 * candle.multiplier);
      else addCounter(stack, 'hex', 2 * candle.multiplier);
    });
    if (candle.upgraded) {
      const hero = defender.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      if (hero) hero.mana += 2;
    }
  }
});

hooks.retaliation.push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (resolution.isRetaliation || resolution.ranged || !attacker || !defender) return;
  if (preventsRetaliation(attacker)) return;
  if (effectOn(defender, 'quiet')) return;
  const unlimited = (effectOn(defender, 'oathOfIron')?.magnitude ?? 0) >= 2;
  if (defender.count <= 0 || (defender.retaliated && !unlimited) || attacker.count <= 0) return;
  if (!unlimited) defender.retaliated = true;
  runAttackPipeline(battle, defender.id, attacker.id, true);
});

export function runAttackPipeline(
  battle: BattleState,
  actorId: string,
  targetId: string,
  isRetaliation = false,
): void {
  const resolution: AttackResolution = {
    battle, actorId, targetId, isRetaliation, ranged: false, damage: 0, kills: 0,
  };
  for (const stage of RESOLUTION_STAGES) {
    for (const hook of hooks[stage]) hook(resolution);
  }
}
