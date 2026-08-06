import { UNITS } from '../../content/units';
import type {
  Action, Army, BattleSide, BattleStack, BattleState, Coord,
} from '../types';
import { sameCoord } from '../map/pathfinding';
import {
  canLandOnObstacles, stackHasAbility, stackIgnoresMovementBlockers,
} from './abilities';
import { canUseRanged } from './damage';
import { hexDistance, reachableHexes } from './hex';
import {
  footprintFits, occupiedByStacks, stackHexes, stacksAdjacent,
  stackDistance,
} from './footprint';
import {
  beginStackTurn, effectOn, effectiveSpeed, endStackTurn,
} from './magicEffects';
import {
  canBeginSpellCast, canCastSpell, castSpell, legalSpellCasts,
} from './spells';
import { isSpellTargetLegal } from './spellTargets';
import { runAttackPipeline, runTurnAdvancePipeline } from './pipeline';
import { applyRoundMorale, turnOrder } from './round';
import {
  canUseCombatItem, legalCombatItemUses, useCombatItem,
} from './items';
import {
  advanceBattleTiles, createBattleTile, placeBattleTile, runTileHooks, tileBlocksMovement,
} from './tiles';
import { cloneBattle } from './battleClone';
import { artifactEffectTotal, hasEquippedArtifact } from '../artifacts';
import { specialtyHandler } from '../heroBehaviors';
import {
  applyActivatedAbility, legalActivatedAbilityActions,
} from './activatedAbilities';
export { createBattle, splitGuardianArmy } from './setup';

export function activeBattleStack(battle: BattleState): BattleStack | null {
  return battle.stacks.find(
    (stack) => stack.id === battle.currentStackId && stack.count > 0,
  ) ?? null;
}

export function battleReachableHexes(battle: BattleState, stack: BattleStack): Coord[] {
  if (stackHasAbility(stack, 'immobile')) return [];
  const unit = UNITS[stack.unitId];
  const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const ignoresNaturalTiles = Boolean(hero
    && artifactEffectTotal(hero, 'ignore_natural_tiles') > 0);
  const inShallows = stackHexes(stack).some((hex) =>
    (battle.context.battlefield === 'sea' && hex.x >= 3 && hex.x <= 9)
    || battle.shallowHexes.some((shallow) => sameCoord(shallow, hex)));
  const aquatic = stackHasAbility(stack, 'aquatic');
  return reachableHexes(
    stack.position,
    stack.postAttackMovePoints ?? effectiveSpeed(stack)
      + ((battle.context.battlefield === 'sea' || battle.context.battlefield === 'mire')
        && aquatic && inShallows ? 1 : 0),
    [...occupiedByStacks(battle.stacks, stack.id)].map((key) => {
      const [x, y] = key.split(',').map(Number); return { x, y };
    }),
    [
      ...battle.obstacles,
      ...battle.tiles.filter((tile) => tileBlocksMovement(tile)
        && !(ignoresNaturalTiles && tile.type === 'thicket')).map((tile) => tile.position),
    ],
    stackIgnoresMovementBlockers(stack) || Boolean(effectOn(stack, 'quicksilver')),
    canLandOnObstacles(stack),
    (position) => {
      const undergrowth = !ignoresNaturalTiles && battle.tiles.some((tile) =>
        tile.type === 'undergrowth' && sameCoord(tile.position, position)) ? 2 : 0;
      const shallow = (battle.context.battlefield === 'sea'
        && position.x >= 3 && position.x <= 9
        || battle.shallowHexes.some((hex) => sameCoord(hex, position))) && !aquatic
        && !stackHasAbility(stack, 'flying') ? 1 : 0;
      return undergrowth + shallow;
    },
    unit.hexSize,
  );
}

function legalPendingFreeMoves(battle: BattleState): Action[] {
  const pending = battle.pendingFreeMove;
  if (!pending) return [];
  const movers = battle.stacks.filter((stack) => stack.count > 0
    && stack.side === pending.side && (!pending.targetId || stack.id === pending.targetId));
  return movers.flatMap((stack) => {
    const occupiedKeys = occupiedByStacks(battle.stacks, stack.id);
    const occupied = [...occupiedKeys].map((key) => {
      const [x, y] = key.split(',').map(Number); return { x, y };
    });
    const blockers = [
      ...battle.obstacles,
      ...battle.tiles.filter(tileBlocksMovement).map((tile) => tile.position),
    ];
    const destinations = pending.anywhere
      ? Array.from({ length: 9 }, (_, y) => Array.from({ length: 13 }, (_unused, x) => ({ x, y })))
        .flat().filter((destination) => !sameCoord(destination, stack.position)
          && footprintFits(
            stack, destination, occupiedKeys,
            new Set(blockers.map((position) => `${position.x},${position.y}`)),
            canLandOnObstacles(stack),
          ))
      : reachableHexes(
      stack.position, effectiveSpeed(stack),
      occupied, blockers,
      stackIgnoresMovementBlockers(stack), canLandOnObstacles(stack),
      () => 0, UNITS[stack.unitId].hexSize,
    );
    return destinations.map((destination): Action => ({
      type: 'BATTLE_FREE_MOVE', targetId: stack.id, destination,
    }));
  });
}

function checkWinner(battle: BattleState): BattleSide | null {
  const attackerAlive = battle.stacks.some(
    (stack) => stack.side === 'attacker' && stack.count > 0
      && !stackHasAbility(stack, 'mirror_hex'),
  ) || Boolean(battle.longestCandlePending.attacker);
  const defenderAlive = battle.stacks.some(
    (stack) => stack.side === 'defender' && stack.count > 0
      && !stackHasAbility(stack, 'siege_wall')
      && !stackHasAbility(stack, 'mirror_hex'),
  ) || Boolean(battle.longestCandlePending.defender);
  if (!attackerAlive) battle.winner = 'defender';
  else if (!defenderAlive) battle.winner = 'attacker';
  return battle.winner;
}

function startNextRound(battle: BattleState): void {
  runTurnAdvancePipeline(battle);
  battle.round += 1;
  for (const side of ['attacker', 'defender'] as const) {
    battle.enchantments[side].forEach((effect) => {
      if (effect.duration !== undefined) effect.duration -= 1;
    });
    battle.enchantments[side] = battle.enchantments[side].filter(
      (effect) => effect.duration === undefined || effect.duration > 0,
    );
  }
  advanceBattleTiles(battle);
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
  if (endingActor?.postAttackMovePoints && !waited) {
    battle.currentStackId = endingActor.id;
    battle.log.push(`${UNITS[endingActor.unitId].name} may finish its move.`);
    return;
  }
  if (endingActor && !waited) {
    runTileHooks(battle, 'on-turn-end', endingActor);
    endStackTurn(battle, endingActor);
  }
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
    actor.extraActionsTaken = (actor.extraActionsTaken ?? 0) + 1;
    battle.currentStackId = actor.id;
    battle.log.push(`${UNITS[actor.unitId].name} has high morale and acts again.`);
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

function settleBattleState(battle: BattleState): void {
  if (battle.winner || activeBattleStack(battle)) return;
  const winner = checkWinner(battle);
  if (winner) {
    battle.currentStackId = null;
    battle.log.push(`${winner === 'attacker' ? 'Attacker' : 'Defender'} wins.`);
    return;
  }
  if (battle.currentStackId) advanceTurn(battle, battle.currentStackId);
  else startNextRound(battle);
}

export function recoverInactiveBattleTurn(battle: BattleState): BattleState {
  if (battle.winner || activeBattleStack(battle)) return battle;
  const next = cloneBattle(battle);
  settleBattleState(next);
  return next;
}

export function legalBattleActions(battle: BattleState): Action[] {
  if (battle.pendingFreeMove) return legalPendingFreeMoves(battle);
  const active = activeBattleStack(battle);
  if (!active || battle.winner) return [];
  const enemies = battle.stacks.filter(
    (stack) => stack.count > 0 && stack.side !== active.side,
  );
  if (active.postAttackMovePoints) {
    return [
      { type: 'BATTLE_DEFEND' },
      ...battleReachableHexes(battle, active).map((destination) => ({
        type: 'BATTLE_MOVE', destination,
      } as const)),
    ];
  }
  const reachable = battleReachableHexes(battle, active);
  const actions: Action[] = [
    { type: 'BATTLE_DEFEND' },
    ...(!active.waited ? [{ type: 'BATTLE_WAIT' } as const] : []),
    ...reachable.map((destination) => ({ type: 'BATTLE_MOVE', destination } as const)),
  ];
  const activeHero = active.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (activeHero) actions.push({ type: 'BATTLE_RETREAT' });
  if (activeHero && battle.attackerHero && battle.defenderHero) {
    actions.push({ type: 'BATTLE_SURRENDER' });
  }
  actions.push(...legalSpellCasts(battle));
  actions.push(...legalCombatItemUses(battle));
  actions.push(...legalActivatedAbilityActions(battle, active));
  const hero = active.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (hero && hasEquippedArtifact(hero, 'bellsClapper')
      && !battle.clapperUsed[active.side]) {
    actions.push({ type: 'BATTLE_USE_ARTIFACT', artifactId: 'bellsClapper' });
  }
  const largest = battle.stacks.filter((stack) => stack.side === active.side
    && stack.count > 0 && !stack.summoned)
    .sort((a, b) => b.count - a.count || a.slot - b.slot)[0];
  if (hero && largest?.id === active.id && hasEquippedArtifact(hero, 'hornOfTheBroadWorld')
      && !battle.hornUsed[active.side] && !active.doubleNextAttack) {
    actions.push({ type: 'BATTLE_USE_ARTIFACT', artifactId: 'hornOfTheBroadWorld' });
  }
  if (stackHasAbility(active, 'overwind')
      && !active.overwindUsed && !active.overwindPrimed) {
    actions.push({ type: 'BATTLE_OVERWIND' });
  }
  for (const enemy of enemies) {
    if (canUseRanged(active) || stacksAdjacent(active, enemy)) {
      actions.push({ type: 'BATTLE_ATTACK', targetId: enemy.id });
    }
    for (const destination of reachable) {
      if (stacksAdjacent({ ...active, position: destination }, enemy)) {
        actions.push({ type: 'BATTLE_MOVE_ATTACK', destination, targetId: enemy.id });
      }
    }
  }
  return actions;
}

export function applyBattleAction(battle: BattleState, action: Action): BattleState {
  const next = cloneBattle(battle);
  if (action.type === 'BATTLE_FREE_MOVE') {
    const legal = legalPendingFreeMoves(next).some((candidate) =>
      JSON.stringify(candidate) === JSON.stringify(action));
    if (!legal) throw new Error('Illegal free move');
    const target = next.stacks.find((stack) => stack.id === action.targetId)!;
    const label = next.pendingFreeMove?.label;
    target.position = { ...action.destination };
    next.log.push(label
      ?? `${UNITS[target.unitId].name} carries on the Courier's errand.`);
    next.pendingFreeMove = null;
    return next;
  }
  const active = activeBattleStack(next);
  if (!active) throw new Error('No active battle stack');
  if (action.type === 'BATTLE_CAST'
      && canBeginSpellCast(next, action.spellId)
      && !isSpellTargetLegal(next, action)) return next;
  const legal = legalBattleActions(next);
  const serialized = JSON.stringify(action);
  const legalCast = action.type === 'BATTLE_CAST'
    && canCastSpell(next, action.spellId);
  const legalItem = action.type === 'BATTLE_USE_ITEM'
    && canUseCombatItem(next, action.inventorySlot);
  if (!legalCast && !legalItem
      && !legal.some((candidate) => JSON.stringify(candidate) === serialized)) {
    throw new Error(`Illegal battle action: ${action.type}`);
  }

  if (action.type === 'BATTLE_RETREAT' || action.type === 'BATTLE_SURRENDER') {
    const cost = action.type === 'BATTLE_SURRENDER'
      ? surrenderCost(next, active.side) : 0;
    next.withdrawal = {
      side: active.side, kind: action.type === 'BATTLE_SURRENDER' ? 'surrender' : 'retreat', cost,
    };
    next.winner = active.side === 'attacker' ? 'defender' : 'attacker';
    next.currentStackId = null;
    next.log.push(`${active.side === 'attacker' ? 'Attacker' : 'Defender'} ${next.withdrawal.kind}s.`);
    return next;
  }

  if (action.type === 'BATTLE_MOVE') {
    const origin = { ...active.position };
    active.movedHexes = hexDistance(active.position, action.destination);
    active.position = { ...action.destination };
    if (stackHasAbility(active, 'resin_trail')) {
      const hero = active.side === 'attacker' ? next.attackerHero : next.defenderHero;
      const duration = 3 + (hero ? specialtyHandler(hero).resinDurationBonus?.() ?? 0 : 0);
      for (const hex of stackHexes(active, origin)) if (!next.tiles.some((tile) =>
        sameCoord(tile.position, hex))) {
        placeBattleTile(next, createBattleTile(next, 'resin', hex, duration, active.side));
      }
    }
    active.postAttackMovePoints = undefined;
    runTileHooks(next, 'on-enter', active);
    next.log.push(`${UNITS[active.unitId].name} moves.`);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_ATTACK') {
    runAttackPipeline(next, active.id, action.targetId);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_MOVE_ATTACK') {
    active.lastAttackOrigin = { ...active.position };
    const origin = { ...active.position };
    active.movedHexes = hexDistance(active.position, action.destination);
    active.position = { ...action.destination };
    if (stackHasAbility(active, 'resin_trail')) {
      const hero = active.side === 'attacker' ? next.attackerHero : next.defenderHero;
      const duration = 3 + (hero ? specialtyHandler(hero).resinDurationBonus?.() ?? 0 : 0);
      for (const hex of stackHexes(active, origin)) if (!next.tiles.some((tile) =>
        sameCoord(tile.position, hex))) {
        placeBattleTile(next, createBattleTile(next, 'resin', hex, duration, active.side));
      }
    }
    runTileHooks(next, 'on-enter', active);
    runAttackPipeline(next, active.id, action.targetId);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_WAIT') {
    active.waited = true;
    next.log.push(`${UNITS[active.unitId].name} waits.`);
    advanceTurn(next, active.id, true);
  } else if (action.type === 'BATTLE_DEFEND') {
    active.postAttackMovePoints = undefined;
    active.defended = true;
    next.log.push(`${UNITS[active.unitId].name} defends.`);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_OVERWIND') {
    active.overwindPrimed = true;
    active.overwindUsed = true;
    next.log.push(`${UNITS[active.unitId].name} is overwound.`);
  } else if (action.type === 'BATTLE_USE_ARTIFACT') {
    if (action.artifactId === 'bellsClapper') {
      next.stacks.forEach((stack) => { stack.morale = 0; });
      next.clapperUsed[active.side] = true;
      next.log.push("The Bell's Clapper stills every company’s morale.");
    } else {
      active.doubleNextAttack = true;
      next.hornUsed[active.side] = true;
      next.log.push('The Horn doubles the weight of the largest company for one attack.');
    }
  } else if (action.type === 'BATTLE_USE_ABILITY') {
    applyActivatedAbility(next, active, action);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_CAST') {
    castSpell(next, action);
  } else if (action.type === 'BATTLE_USE_ITEM') {
    useCombatItem(next, action);
  }
  settleBattleState(next);
  return next;
}

export function surrenderCost(battle: BattleState, side: BattleSide): number {
  const value = battle.stacks.filter((stack) => stack.side === side
    && stack.count > 0 && !stack.summoned).reduce(
    (sum, stack) => sum + (UNITS[stack.unitId].cost.gold ?? 0) * stack.count, 0,
  );
  const opponent = side === 'attacker' ? battle.defenderHero : battle.attackerHero;
  return Math.ceil(value * 0.25 * (opponent?.specialtyId === 'costlySurrender'
    ? specialtyHandler(opponent).surrenderMultiplier?.() ?? 2 : 1));
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
    .sort((a, b) => stackDistance(actor, a) - stackDistance(actor, b))[0] ?? null;
}

export function isObstacle(battle: BattleState, coord: Coord): boolean {
  return battle.obstacles.some((obstacle) => sameCoord(obstacle, coord))
    || battle.tiles.some((tile) =>
      tileBlocksMovement(tile) && sameCoord(tile.position, coord));
}
