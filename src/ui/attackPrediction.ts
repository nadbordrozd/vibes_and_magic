import { applyBattleAction } from '../core/combat/battle';
import { canUseRanged, hasAdjacentEnemy } from '../core/combat/damage';
import { stackDistance, stackHexes } from '../core/combat/footprint';
import { totalStackHp } from '../core/combat/magicEffects';
import { specialtyHandler } from '../core/heroBehaviors';
import type { Action, BattleStack, BattleState, Coord } from '../core/types';

export type AttackAction = Extract<
  Action, { type: 'BATTLE_ATTACK' | 'BATTLE_MOVE_ATTACK' }
>;

export interface AttackPrediction {
  action: AttackAction;
  attackerId: string;
  targetId: string;
  mode: 'Ranged' | 'Melee';
  damageRange: [number, number];
  casualtyRange: [number, number];
  adjacencyModifier: string;
  rangeModifier: string;
  wallModifier: string;
  retaliation: string;
  origin: Coord;
  originFootprint: Coord[];
  targetFootprint: Coord[];
  direction: string;
}

function visualPosition(coord: Coord): { x: number; y: number } {
  return { x: coord.x + (coord.y % 2 ? 0.5 : 0), y: coord.y * 0.866 };
}

function direction(originFootprint: Coord[], targetFootprint: Coord[]): string {
  const pair = originFootprint.flatMap((origin) => targetFootprint.map((target) => {
    const from = visualPosition(origin);
    const to = visualPosition(target);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return { dx, dy, distance: dx * dx + dy * dy };
  })).sort((left, right) => left.distance - right.distance)[0];
  const dx = pair?.dx ?? 0;
  const dy = pair?.dy ?? 0;
  if (Math.abs(dx) > Math.abs(dy) * 1.5) return dx > 0 ? 'east' : 'west';
  if (dy < 0) return dx >= 0 ? 'north-east' : 'north-west';
  return dx >= 0 ? 'south-east' : 'south-west';
}

function stackAfter(battle: BattleState, id: string): BattleStack | undefined {
  return battle.stacks.find((stack) => stack.id === id);
}

/**
 * Runs the already-legal action against the core's cloned battle state. This keeps the prediction
 * presentation-only while ensuring every registered damage, routing, death, and retaliation hook
 * is reflected in the visible numbers.
 */
export function predictAttack(
  battle: BattleState,
  action: AttackAction,
): AttackPrediction | null {
  const attacker = stackAfter(battle, battle.currentStackId ?? '');
  const target = stackAfter(battle, action.targetId);
  if (!attacker || !target) return null;
  const ranged = action.type === 'BATTLE_ATTACK' && canUseRanged(attacker);
  const origin = action.type === 'BATTLE_MOVE_ATTACK'
    ? action.destination : attacker.position;
  const aimedAttacker = { ...attacker, position: origin };
  const adjacentEnemy = hasAdjacentEnemy(aimedAttacker, battle.stacks.filter(
    (stack) => stack.id !== attacker.id,
  ));
  const attackerHero = attacker.side === 'attacker'
    ? battle.attackerHero : battle.defenderHero;
  const ignoresAdjacentPenalty = Boolean(attackerHero
    && specialtyHandler(attackerHero).rangedAdjacentPenalty?.(
      attackerHero, attacker.unitId,
    ));
  const distance = stackDistance(aimedAttacker, target);
  let next: BattleState;
  try {
    next = applyBattleAction(battle, action);
  } catch {
    return null;
  }
  const targetAfter = stackAfter(next, target.id);
  const attackerAfter = stackAfter(next, attacker.id);
  const damage = Math.max(0, totalStackHp(target) - (targetAfter ? totalStackHp(targetAfter) : 0));
  const casualties = Math.max(0, target.count - (targetAfter?.count ?? 0));
  const retaliated = (targetAfter?.attacksMade ?? target.attacksMade) > target.attacksMade;
  const retaliationDamage = Math.max(
    0, totalStackHp(attacker) - (attackerAfter ? totalStackHp(attackerAfter) : 0),
  );
  const originFootprint = stackHexes(attacker, origin);
  const targetFootprint = stackHexes(target);
  return {
    action,
    attackerId: attacker.id,
    targetId: target.id,
    mode: ranged ? 'Ranged' : 'Melee',
    damageRange: [damage, damage],
    casualtyRange: [casualties, casualties],
    adjacencyModifier: ranged
      ? adjacentEnemy && ignoresAdjacentPenalty ? 'Adjacent enemy: penalty ignored by specialty'
        : adjacentEnemy ? 'Adjacent enemy: ×0.5 ranged penalty'
        : 'No adjacent-enemy penalty'
      : 'Adjacent approach required; chosen origin is legal',
    rangeModifier: ranged
      ? distance > 7 ? `Range ${distance} hexes: ×0.5 ranged penalty${
        adjacentEnemy && !ignoresAdjacentPenalty ? ' (shared with adjacency; not cumulative)' : ''
      }`
        : `Range ${distance} hexes: no long-range penalty`
      : 'Ranged modifier does not apply to this melee strike',
    wallModifier: ranged && battle.defenderWalls
      && attacker.side === 'attacker' && target.side === 'defender'
      ? 'Defending wall: ×0.7 ranged damage'
      : ranged ? 'No defending-wall ranged penalty' : 'Wall shooting modifier does not apply',
    retaliation: retaliated
      ? `Expected: yes · projected ${retaliationDamage} damage back`
      : ranged ? 'Expected: no · ranged attacks are not retaliated'
        : targetAfter?.count === 0 ? 'Expected: no · target is projected to fall'
          : 'Expected: no · suppressed, exhausted, or prevented by an effect',
    origin: { ...origin },
    originFootprint,
    targetFootprint,
    direction: ranged ? 'projectile to the full target footprint'
      : `${direction(originFootprint, targetFootprint)} from the chosen melee origin`,
  };
}

export function formatFootprint(coords: Coord[]): string {
  return coords.map((coord) => `(${coord.x},${coord.y})`).join(' · ');
}
