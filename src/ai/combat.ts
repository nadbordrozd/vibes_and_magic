import { UNITS } from '../content/units';
import {
  activeBattleStack, applyBattleAction, battleReachableHexes,
  closestEnemy, legalBattleActions,
} from '../core/combat/battle';
import { canUseRanged, hasAdjacentEnemy } from '../core/combat/damage';
import { hexDistance, nearestReachableToTarget } from '../core/combat/hex';
import type { Action, BattleStack, BattleState } from '../core/types';

function targetValue(stack: BattleStack): number {
  const unit = UNITS[stack.unitId];
  const damageOutput = stack.count * ((unit.damage[0] + unit.damage[1]) / 2);
  const hpRemaining = (stack.count - 1) * unit.hp + stack.topHp;
  return damageOutput / Math.max(1, hpRemaining);
}

export function chooseCombatAction(battle: BattleState): Action {
  const actor = activeBattleStack(battle);
  if (!actor) throw new Error('Combat AI has no active stack');
  const enemies = battle.stacks.filter(
    (stack) => stack.count > 0 && stack.side !== actor.side,
  );
  const legal = legalBattleActions(battle);

  if (canUseRanged(actor) && !hasAdjacentEnemy(actor, battle.stacks)) {
    const target = [...enemies].sort(
      (a, b) => targetValue(b) - targetValue(a) || a.id.localeCompare(b.id),
    )[0];
    const action = legal.find(
      (candidate) => candidate.type === 'BATTLE_ATTACK'
        && candidate.targetId === target?.id,
    );
    if (action) return action;
  }

  const nearest = closestEnemy(battle, actor);
  if (nearest) {
    const moveAttack = legal.filter(
      (candidate): candidate is Extract<Action, { type: 'BATTLE_MOVE_ATTACK' }> =>
        candidate.type === 'BATTLE_MOVE_ATTACK' && candidate.targetId === nearest.id,
    ).sort((a, b) => hexDistance(a.destination, nearest.position)
      - hexDistance(b.destination, nearest.position)
      || a.destination.y - b.destination.y || a.destination.x - b.destination.x)[0];
    if (moveAttack) return moveAttack;

    const direct = legal.find(
      (candidate) => candidate.type === 'BATTLE_ATTACK'
        && candidate.targetId === nearest.id,
    );
    if (direct) return direct;

    const reachable = battleReachableHexes(battle, actor);
    const destination = nearestReachableToTarget(reachable, nearest.position);
    if (destination
        && hexDistance(destination, nearest.position)
          < hexDistance(actor.position, nearest.position)) {
      const move = legal.find(
        (candidate) => candidate.type === 'BATTLE_MOVE'
          && candidate.destination.x === destination.x
          && candidate.destination.y === destination.y,
      );
      if (move) return move;
    }
  }
  return { type: 'BATTLE_DEFEND' };
}

export function autoResolveBattle(initial: BattleState, maxActions = 2000): BattleState {
  let battle = initial;
  for (let step = 0; step < maxActions && !battle.winner; step += 1) {
    battle = applyBattleAction(battle, chooseCombatAction(battle));
  }
  if (!battle.winner) throw new Error(`Combat exceeded ${maxActions} actions`);
  return battle;
}
