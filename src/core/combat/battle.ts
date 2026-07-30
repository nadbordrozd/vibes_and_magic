import { UNITS } from '../../content/units';
import type {
  Action, Army, BattleSide, BattleStack, BattleState, Coord,
} from '../types';
import { sameCoord } from '../map/pathfinding';
import { ignoresMovementBlockers } from './abilities';
import { canUseRanged } from './damage';
import { hexDistance, isAdjacent, reachableHexes } from './hex';
import { runAttackPipeline } from './pipeline';
import { applyRoundMorale, turnOrder } from './round';
export { createBattle, splitGuardianArmy } from './setup';

function cloneBattle(battle: BattleState): BattleState {
  return {
    ...battle,
    stacks: battle.stacks.map((stack) => ({ ...stack, position: { ...stack.position } })),
    obstacles: battle.obstacles.map((coord) => ({ ...coord })),
    order: [...battle.order],
    waiting: [...battle.waiting],
    attackerHero: { ...battle.attackerHero },
    defenderHero: battle.defenderHero ? { ...battle.defenderHero } : null,
    context: { ...battle.context, destination: { ...battle.context.destination } },
    log: [...battle.log],
    casualties: {
      attacker: { ...battle.casualties.attacker },
      defender: { ...battle.casualties.defender },
    },
  };
}


export function activeBattleStack(battle: BattleState): BattleStack | null {
  return battle.stacks.find(
    (stack) => stack.id === battle.currentStackId && stack.count > 0,
  ) ?? null;
}

export function battleReachableHexes(battle: BattleState, stack: BattleStack): Coord[] {
  const unit = UNITS[stack.unitId];
  return reachableHexes(
    stack.position,
    unit.speed,
    battle.stacks.filter((other) => other.count > 0 && other.id !== stack.id)
      .map((other) => other.position),
    battle.obstacles,
    ignoresMovementBlockers(stack.unitId),
  );
}

function checkWinner(battle: BattleState): void {
  const attackerAlive = battle.stacks.some(
    (stack) => stack.side === 'attacker' && stack.count > 0,
  );
  const defenderAlive = battle.stacks.some(
    (stack) => stack.side === 'defender' && stack.count > 0,
  );
  if (!attackerAlive) battle.winner = 'defender';
  else if (!defenderAlive) battle.winner = 'attacker';
}

function startNextRound(battle: BattleState): void {
  battle.round += 1;
  for (const stack of battle.stacks) {
    stack.retaliated = false;
    stack.defended = false;
    stack.waited = false;
  }
  applyRoundMorale(battle);
  battle.order = turnOrder(battle.stacks);
  battle.waiting = [];
  battle.currentStackId = battle.order[0] ?? null;
  battle.log.push(`Round ${battle.round}.`);
}

function advanceTurn(battle: BattleState, actorId: string, waited = false): void {
  checkWinner(battle);
  if (battle.winner) {
    battle.currentStackId = null;
    battle.log.push(`${battle.winner === 'attacker' ? 'Attacker' : 'Defender'} wins.`);
    return;
  }
  const actor = battle.stacks.find((stack) => stack.id === actorId);
  if (actor && actor.count > 0 && actor.bonusActions > 0 && !waited) {
    actor.bonusActions -= 1;
    battle.currentStackId = actor.id;
    battle.log.push(`${UNITS[actor.unitId].name} gains a morale action.`);
    return;
  }
  battle.order = battle.order.filter((id) => id !== actorId);
  if (waited && actor?.count) battle.waiting.push(actorId);
  const nextNormal = battle.order.find(
    (id) => battle.stacks.some((stack) => stack.id === id && stack.count > 0),
  );
  if (nextNormal) {
    battle.currentStackId = nextNormal;
    return;
  }
  const nextWaiting = battle.waiting.find(
    (id) => battle.stacks.some((stack) => stack.id === id && stack.count > 0),
  );
  if (nextWaiting) {
    battle.waiting = battle.waiting.filter((id) => id !== nextWaiting);
    battle.currentStackId = nextWaiting;
    return;
  }
  startNextRound(battle);
}

export function legalBattleActions(battle: BattleState): Action[] {
  const active = activeBattleStack(battle);
  if (!active || battle.winner) return [];
  const enemies = battle.stacks.filter(
    (stack) => stack.count > 0 && stack.side !== active.side,
  );
  const reachable = battleReachableHexes(battle, active);
  const actions: Action[] = [
    { type: 'BATTLE_DEFEND' },
    ...(!active.waited ? [{ type: 'BATTLE_WAIT' } as const] : []),
    ...reachable.map((destination) => ({ type: 'BATTLE_MOVE', destination } as const)),
  ];
  for (const enemy of enemies) {
    if (canUseRanged(active) || isAdjacent(active.position, enemy.position)) {
      actions.push({ type: 'BATTLE_ATTACK', targetId: enemy.id });
    }
    for (const destination of reachable) {
      if (isAdjacent(destination, enemy.position)) {
        actions.push({ type: 'BATTLE_MOVE_ATTACK', destination, targetId: enemy.id });
      }
    }
  }
  return actions;
}

export function applyBattleAction(battle: BattleState, action: Action): BattleState {
  const next = cloneBattle(battle);
  const active = activeBattleStack(next);
  if (!active) throw new Error('No active battle stack');
  const legal = legalBattleActions(next);
  const serialized = JSON.stringify(action);
  if (!legal.some((candidate) => JSON.stringify(candidate) === serialized)) {
    throw new Error(`Illegal battle action: ${action.type}`);
  }

  if (action.type === 'BATTLE_MOVE') {
    active.position = { ...action.destination };
    next.log.push(`${UNITS[active.unitId].name} moves.`);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_ATTACK') {
    runAttackPipeline(next, active.id, action.targetId);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_MOVE_ATTACK') {
    active.position = { ...action.destination };
    runAttackPipeline(next, active.id, action.targetId);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_WAIT') {
    active.waited = true;
    next.log.push(`${UNITS[active.unitId].name} waits.`);
    advanceTurn(next, active.id, true);
  } else if (action.type === 'BATTLE_DEFEND') {
    active.defended = true;
    next.log.push(`${UNITS[active.unitId].name} defends.`);
    advanceTurn(next, active.id);
  }
  return next;
}

export function armyAfterBattle(battle: BattleState, side: BattleSide): Army {
  const army: Army = Array(7).fill(null);
  for (const stack of battle.stacks) {
    if (stack.side === side && stack.count > 0) {
      const existing = army[stack.slot];
      if (existing?.unitId === stack.unitId) existing.count += stack.count;
      else army[stack.slot] = { unitId: stack.unitId, count: stack.count };
    }
  }
  return army;
}

export function estimateDamageRange(
  battle: BattleState,
  actor: BattleStack,
  target: BattleStack,
): [number, number] {
  const unit = UNITS[actor.unitId];
  const averageKills = Math.max(0, Math.floor(
    actor.count * ((unit.damage[0] + unit.damage[1]) / 2) / UNITS[target.unitId].hp,
  ));
  return [Math.max(0, averageKills - 1), averageKills + 1];
}

export function closestEnemy(battle: BattleState, actor: BattleStack): BattleStack | null {
  return battle.stacks.filter((stack) => stack.count > 0 && stack.side !== actor.side)
    .sort((a, b) => hexDistance(actor.position, a.position)
      - hexDistance(actor.position, b.position))[0] ?? null;
}

export function isObstacle(battle: BattleState, coord: Coord): boolean {
  return battle.obstacles.some((obstacle) => sameCoord(obstacle, coord));
}
