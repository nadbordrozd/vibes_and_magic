import { UNITS } from '../../content/units';
import type {
  Action, Army, BattleSide, BattleStack, BattleState, Coord,
} from '../types';
import { sameCoord } from '../map/pathfinding';
import { hasAbility, ignoresMovementBlockers } from './abilities';
import { canUseRanged } from './damage';
import { hexDistance, isAdjacent, reachableHexes } from './hex';
import {
  beginStackTurn, effectOn, effectiveSpeed, endStackTurn,
} from './magicEffects';
import { canCastSpell, castSpell, legalSpellCasts } from './spells';
import { runAttackPipeline } from './pipeline';
import { applyRoundMorale, turnOrder } from './round';
export { createBattle, splitGuardianArmy } from './setup';

function cloneBattle(battle: BattleState): BattleState {
  return {
    ...battle,
    stacks: battle.stacks.map((stack) => ({
      ...stack, position: { ...stack.position },
      counters: { ...stack.counters },
      effects: stack.effects.map((effect) => ({ ...effect })),
    })),
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
    initialCounts: { ...battle.initialCounts },
    recovered: {
      attacker: { ...battle.recovered.attacker },
      defender: { ...battle.recovered.defender },
    },
    enchantments: {
      attacker: battle.enchantments.attacker.map((effect) => ({ ...effect })),
      defender: battle.enchantments.defender.map((effect) => ({ ...effect })),
    },
    castRound: { ...battle.castRound },
    extraActions: { ...battle.extraActions },
    spellWalls: battle.spellWalls.map((coord) => ({ ...coord })),
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
    effectiveSpeed(stack),
    battle.stacks.filter((other) => other.count > 0 && other.id !== stack.id)
      .map((other) => other.position),
    [...battle.obstacles, ...battle.spellWalls],
    ignoresMovementBlockers(stack.unitId) || Boolean(effectOn(stack, 'quicksilver')),
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
  battle.order = battle.order.filter((id) => {
    const stack = battle.stacks.find((item) => item.id === id);
    return stack?.skipRound !== battle.round;
  });
  battle.waiting = [];
  battle.currentStackId = battle.order[0] ?? null;
  battle.log.push(`Round ${battle.round}.`);
  const first = activeBattleStack(battle);
  if (first) beginStackTurn(battle, first);
  if (first && first.count <= 0) advanceTurn(battle, first.id);
}

function advanceTurn(battle: BattleState, actorId: string, waited = false): void {
  const endingActor = battle.stacks.find((stack) => stack.id === actorId);
  if (endingActor && !waited) endStackTurn(battle, endingActor);
  checkWinner(battle);
  if (battle.winner) {
    battle.currentStackId = null;
    battle.log.push(`${battle.winner === 'attacker' ? 'Attacker' : 'Defender'} wins.`);
    return;
  }
  const actor = battle.stacks.find((stack) => stack.id === actorId);
  if (actor?.overwindPrimed && !waited) {
    actor.overwindPrimed = false;
    actor.skipRound = battle.round + 1;
    actor.bonusActions += 1;
  }
  if (actor && actor.count > 0 && actor.bonusActions > 0 && !waited) {
    actor.bonusActions -= 1;
    battle.extraActions[actor.side] += 1;
    battle.currentStackId = actor.id;
    battle.log.push(`${UNITS[actor.unitId].name} gains a morale action.`);
    return;
  }
  if (actor) actor.movedHexes = 0;
  battle.order = battle.order.filter((id) => id !== actorId);
  if (waited && actor?.count) battle.waiting.push(actorId);
  const nextNormal = battle.order.find(
    (id) => battle.stacks.some((stack) => stack.id === id && stack.count > 0),
  );
  if (nextNormal) {
    battle.currentStackId = nextNormal;
    const next = activeBattleStack(battle);
    if (next) beginStackTurn(battle, next);
    if (next && next.count <= 0) advanceTurn(battle, next.id);
    return;
  }
  const nextWaiting = battle.waiting.find(
    (id) => battle.stacks.some((stack) => stack.id === id && stack.count > 0),
  );
  if (nextWaiting) {
    battle.waiting = battle.waiting.filter((id) => id !== nextWaiting);
    battle.currentStackId = nextWaiting;
    const next = activeBattleStack(battle);
    if (next) beginStackTurn(battle, next);
    if (next && next.count <= 0) advanceTurn(battle, next.id);
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
  actions.push(...legalSpellCasts(battle));
  if (hasAbility(active.unitId, 'overwind')
      && !active.overwindUsed && !active.overwindPrimed) {
    actions.push({ type: 'BATTLE_OVERWIND' });
  }
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
  const legalCast = action.type === 'BATTLE_CAST'
    && canCastSpell(next, action.spellId);
  if (!legalCast && !legal.some((candidate) => JSON.stringify(candidate) === serialized)) {
    throw new Error(`Illegal battle action: ${action.type}`);
  }

  if (action.type === 'BATTLE_MOVE') {
    active.movedHexes = hexDistance(active.position, action.destination);
    active.position = { ...action.destination };
    next.log.push(`${UNITS[active.unitId].name} moves.`);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_ATTACK') {
    runAttackPipeline(next, active.id, action.targetId);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_MOVE_ATTACK') {
    active.movedHexes = hexDistance(active.position, action.destination);
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
  } else if (action.type === 'BATTLE_OVERWIND') {
    active.overwindPrimed = true;
    active.overwindUsed = true;
    next.log.push(`${UNITS[active.unitId].name} is overwound.`);
  } else if (action.type === 'BATTLE_CAST') {
    castSpell(next, action);
  }
  return next;
}

export function armyAfterBattle(battle: BattleState, side: BattleSide): Army {
  const army: Army = Array(7).fill(null);
  for (const stack of battle.stacks) {
    if (stack.side === side && stack.count > 0 && !stack.summoned) {
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
