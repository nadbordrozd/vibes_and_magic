import { UNITS } from '../../content/units';
import {
  MORALE_ALLY_KILL_GAIN, MORALE_ALLY_LOSS,
  MORALE_KILLING_STACK_GAIN, MORALE_THRESHOLD,
} from '../../content/constants';
import type { BattleState, BattleStack } from '../types';
import {
  applyDamage, canUseRanged, computeDamage, hasAdjacentEnemy,
} from './damage';
import { isAdjacent } from './hex';

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
  resolution.damage = computeDamage({
    attacker,
    defender,
    attackerHeroAttack: attackerHero?.attack ?? 0,
    defenderHeroDefense: (defenderHero?.defense ?? 0)
      + (battle.defenderWalls && defender.side === 'defender' ? 2 : 0),
    luck: attackerHero?.luck ?? 0,
    ranged: resolution.ranged,
    adjacentEnemy: hasAdjacentEnemy(attacker, battle.stacks),
    wallsPenalty: battle.defenderWalls
      && attacker.side === 'attacker' && defender.side === 'defender',
  });
});

hooks.apply.push((resolution) => {
  const { attacker, defender } = resolution;
  if (!attacker || !defender) return;
  resolution.kills = applyDamage(defender, resolution.damage);
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
  for (const stack of battle.stacks) {
    if (stack.count <= 0) continue;
    if (stack.side === attacker.side) {
      stack.morale += stack.id === attacker.id
        ? MORALE_KILLING_STACK_GAIN : MORALE_ALLY_KILL_GAIN;
    } else if (stack.id !== defender.id) {
      stack.morale = Math.max(0, stack.morale - MORALE_ALLY_LOSS);
    }
    while (stack.morale >= MORALE_THRESHOLD) {
      stack.morale -= MORALE_THRESHOLD;
      stack.bonusActions += 1;
    }
  }
});

hooks.retaliation.push((resolution) => {
  const { battle, attacker, defender } = resolution;
  if (resolution.isRetaliation || resolution.ranged || !attacker || !defender) return;
  if (defender.count <= 0 || defender.retaliated || attacker.count <= 0) return;
  defender.retaliated = true;
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
