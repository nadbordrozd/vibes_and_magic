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
  footprintFits, occupiedByStacks, stackHexes, stackIsOnField, stacksAdjacent,
  stackDistance,
} from './footprint';
import {
  beginStackTurn, clearCounterPile, effectOn, effectiveSpeed, endStackTurn, grantSystemMeter,
} from './magicEffects';
import {
  canBeginSpellCast, canCastSpell, castSpell, castStoredSpell, isP1BoundedCastLegal, legalSpellCasts,
  resolvePendingMirrorCopy, resolvePendingSpellDeflection,
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
import {
  artifactEffectTotal, equippedArtifactWithEffect, hasArtifactEffect, hasEquippedArtifact,
} from '../artifacts';
import { ARTIFACTS } from '../../content/artifacts';
import { skillRank, specialtyHandler } from '../heroBehaviors';
import {
  applyActivatedAbility, legalActivatedAbilityActions,
} from './activatedAbilities';
import { legalAmbushDeployments } from './setup';
import {
  activateGrantedCompanyAction, consumeStunnedTurn, expireDamageLinks, expireMindControl,
  isBerserk, mindControlCompany, nearestBerserkTargets, resetGrantedActionCaps,
  resolveRoundDelayedTriggers,
} from './primitives';
import { isOriginallyOwnedBy } from './ownership';
import { applyOverclockRoundStuns } from './p1RiteCraftSpellEffects';
import { applyP1GraveWildRoundStart } from './p1GraveWildSpellEffects';
import { applyP2RoundStart, recordP2ExtraAction } from './p2SpellEffects';
import { addBattleCounter, addSpellCounter, chooseCounterRedirect } from './magicEffects';
import { isKnackActionLegal, legalKnackActions, useKnack } from './knacks';
import { consumeHeroAct, heroActAvailability } from './heroActs';
import { MAX_ARMY_SLOTS } from '../../content/constants';
import { heroArmyCapacity } from '../army';
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
  const hedgerow = battle.enchantments[stack.side].find((effect) =>
    effect.spellId === 'hedgerowMarch');
  return reachableHexes(
    stack.position,
    stack.postAttackMovePoints ?? effectiveSpeed(stack, battle)
      + ((battle.context.battlefield === 'sea' || battle.context.battlefield === 'mire')
        && aquatic && inShallows ? 1 : 0),
    [...occupiedByStacks(battle.stacks.filter((other) => !stackHasAbility(stack, 'wall_walker')
      || !stackHasAbility(other, 'siege_wall')), stack.id)].map((key) => {
      const [x, y] = key.split(',').map(Number); return { x, y };
    }),
    [
      ...battle.obstacles,
      ...battle.tiles.filter((tile) => tileBlocksMovement(tile)
        && !(stackHasAbility(stack, 'wall_walker') && tile.type === 'wall')
        && !(ignoresNaturalTiles && tile.type === 'thicket')).map((tile) => tile.position),
    ],
    stackIgnoresMovementBlockers(stack) || Boolean(effectOn(stack, 'quicksilver'))
      || Boolean(hedgerow?.upgraded),
    canLandOnObstacles(stack),
    (position) => {
      const undergrowth = !ignoresNaturalTiles && !hedgerow && battle.tiles.some((tile) =>
        tile.type === 'undergrowth' && sameCoord(tile.position, position)) ? 2 : 0;
      const shallow = (battle.context.battlefield === 'sea'
        && position.x >= 3 && position.x <= 9
        || battle.shallowHexes.some((hex) => sameCoord(hex, position))) && !aquatic
        && !stackHasAbility(stack, 'flying') ? 1 : 0;
      const resin = battle.tiles.some((tile) => tile.type === 'resin' && tile.upgraded
        && sameCoord(tile.position, position)) ? 2 : 0;
      return undergrowth + shallow + resin;
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
      stack.position, effectiveSpeed(stack, battle),
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
  const pendingSave = (side: BattleSide) => Object.values(battle.longestCandlePending)
    .some((id) => id && battle.stacks.some((stack) =>
      stack.id === id && isOriginallyOwnedBy(stack, side)));
  const attackerAlive = battle.stacks.some(
    (stack) => isOriginallyOwnedBy(stack, 'attacker') && stack.count > 0
      && !stackHasAbility(stack, 'mirror_hex'),
  ) || pendingSave('attacker');
  const defenderAlive = battle.stacks.some(
    (stack) => isOriginallyOwnedBy(stack, 'defender') && stack.count > 0
      && !stackHasAbility(stack, 'siege_wall')
      && !stackHasAbility(stack, 'mirror_hex'),
  ) || pendingSave('defender');
  if (!attackerAlive) battle.winner = 'defender';
  else if (!defenderAlive) battle.winner = 'attacker';
  if (battle.winner) battle.terminationReason = 'elimination';
  return battle.winner;
}

function resolveRoundOrder(battle: BattleState): void {
  battle.roundOrderPending = false;
  battle.order = turnOrder(battle.stacks, battle);
  battle.order = battle.order.filter((id) => {
    const stack = battle.stacks.find((candidate) => candidate.id === id);
    if (!stack || !consumeStunnedTurn(stack)) return true;
    battle.log.push(`${UNITS[stack.unitId].name} is stunned and forfeits its action.`);
    return false;
  });
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

function startNextRound(battle: BattleState): void {
  runTurnAdvancePipeline(battle);
  battle.round += 1;
  if (battle.round > 100) {
    const ratio = (side: BattleSide) => {
      const initial = battle.stacks.filter((stack) => isOriginallyOwnedBy(stack, side)
        && !stack.summoned)
        .reduce((sum, stack) => sum
          + (battle.initialCounts[stack.id] ?? stack.count) * UNITS[stack.unitId].hp, 0);
      const remaining = battle.stacks.filter((stack) => isOriginallyOwnedBy(stack, side)
        && !stack.summoned)
        .reduce((sum, stack) => sum + Math.max(0,
          (stack.count - 1) * UNITS[stack.unitId].hp + stack.topHp), 0);
      return initial > 0 ? remaining / initial : 0;
    };
    battle.winner = ratio('attacker') > ratio('defender') ? 'attacker' : 'defender';
    battle.terminationReason = 'round-limit';
    battle.currentStackId = null;
    battle.log.push(`Round limit reached; ${battle.winner} wins by remaining army proportion.`);
    return;
  }
  resetGrantedActionCaps(battle);
  expireDamageLinks(battle);
  expireMindControl(battle);
  resolveRoundDelayedTriggers(battle);
  applyOverclockRoundStuns(battle);
  for (const side of ['attacker', 'defender'] as const) {
    battle.enchantments[side].forEach((effect) => {
      if (effect.duration !== undefined) effect.duration -= 1;
    });
    battle.enchantments[side] = battle.enchantments[side].filter(
      (effect) => effect.duration === undefined || effect.duration > 0,
    );
  }
  for (const stack of battle.stacks) {
    stack.effects = stack.effects.filter((effect) =>
      effect.expiresRound === undefined || effect.expiresRound >= battle.round);
    for (const effect of stack.effects.filter((candidate) =>
      candidate.id.includes(':round-duration') && candidate.expiresRound !== undefined)) {
      effect.duration = effect.expiresRound! - battle.round + 1;
    }
  }
  applyP1GraveWildRoundStart(battle);
  applyP2RoundStart(battle);
  advanceBattleTiles(battle);
  for (const stack of battle.stacks) {
    stack.retaliated = false;
    stack.retaliationsMade = 0;
    stack.defended = false;
    stack.waited = false;
  }
  applyRoundMorale(battle);
  battle.roundOrderPending = true;
  if (!activateGrantedCompanyAction(battle, 'pre-order', battle.round, null)) {
    resolveRoundOrder(battle);
  }
}

function advanceTurn(battle: BattleState, actorId: string, waited = false): void {
  const granted = battle.activeGrantedAction;
  if (granted?.targetId === actorId) {
    battle.activeGrantedAction = null;
    checkWinner(battle);
    if (battle.winner) {
      battle.currentStackId = null;
      battle.log.push(`${battle.winner === 'attacker' ? 'Attacker' : 'Defender'} wins.`);
      return;
    }
    if (activateGrantedCompanyAction(
      battle, granted.timing, granted.round, granted.resumeStackId,
    )) return;
    const resume = granted.resumeStackId && battle.stacks.find((stack) =>
      stack.id === granted.resumeStackId && stack.count > 0);
    if (resume) {
      battle.currentStackId = resume.id;
      battle.log.push(`${UNITS[resume.unitId].name} resumes its normal action.`);
      return;
    }
    if (battle.roundOrderPending) {
      resolveRoundOrder(battle);
      return;
    }
    if (granted.timing === 'round-end') {
      if (!activateGrantedCompanyAction(battle, 'round-end', battle.round, null)) {
        startNextRound(battle);
      }
      return;
    }
    if (granted.timing === 'immediate') {
      if (granted.resumeStackId) {
        battle.order = battle.order.filter((id) => id !== granted.resumeStackId);
      }
      const nextId = battle.order.find((id) => battle.stacks.some((stack) =>
        stack.id === id && stack.count > 0));
      if (nextId) {
        battle.currentStackId = nextId;
        const next = activeBattleStack(battle);
        if (next) beginStackTurn(battle, next);
      } else startNextRound(battle);
      return;
    }
  }
  const endingActor = battle.stacks.find((stack) => stack.id === actorId);
  if (endingActor?.postAttackMovePoints && !waited) {
    battle.currentStackId = endingActor.id;
    battle.log.push(`${UNITS[endingActor.unitId].name} may finish its move.`);
    return;
  }
  if (endingActor && !waited) {
    const enemySide = endingActor.side === 'attacker' ? 'defender' : 'attacker';
    const enemyHedge = battle.enchantments[enemySide].some((effect) =>
      effect.spellId === 'hedgerowMarch');
    if (enemyHedge && battle.tiles.some((tile) => tile.type === 'undergrowth'
      && stackHexes(endingActor).some((hex) => sameCoord(hex, tile.position)))) {
      addSpellCounter(battle, endingActor, 'chill', 1, enemySide);
    }
    runTileHooks(battle, 'on-turn-end', endingActor);
    endStackTurn(battle, endingActor);
    endingActor.lastNormalActionRound = battle.round;
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
    recordP2ExtraAction(battle, actor);
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
  if (!activateGrantedCompanyAction(battle, 'round-end', battle.round, null)) {
    startNextRound(battle);
  }
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

export function beguilerOpeningSide(battle: BattleState): BattleSide | null {
  return (['attacker', 'defender'] as const).find((side) => {
    const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    return Boolean(hero && !battle.beguilerOpeningResolved[side]);
  }) ?? null;
}

export function counterRedirectOpeningSide(battle: BattleState): BattleSide | null {
  return (['attacker', 'defender'] as const).find((side) => {
    const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    return Boolean(hero && skillRank(hero, 'curseEater') >= 3
      && battle.counterRedirectTarget[side] === null);
  }) ?? null;
}

export function legalBattleActions(battle: BattleState): Action[] {
  if (battle.pendingArtifactDeploymentSide) {
    return battle.stacks.filter((stack) => stack.side === battle.pendingArtifactDeploymentSide
      && stack.count > 0).flatMap((stack) => legalAmbushDeployments(battle, {
        ...stack, temporaryAbilities: [...(stack.temporaryAbilities ?? []), 'ambush'],
      }).map((destination) => ({
        type: 'BATTLE_DEPLOY_AMBUSH' as const, stackId: stack.id, destination,
      })));
  }
  if (battle.pendingAmbushStackId) {
    const stack = battle.stacks.find((item) => item.id === battle.pendingAmbushStackId);
    return stack ? legalAmbushDeployments(battle, stack).map((destination) => ({
      type: 'BATTLE_DEPLOY_AMBUSH', stackId: stack.id, destination,
    })) : [];
  }
  if (battle.pendingSpellDeflection) return battle.pendingSpellDeflection.legalTargetIds
    .map((targetId) => ({ type: 'BATTLE_CHOOSE_SPELL_DEFLECT',
      side: battle.pendingSpellDeflection!.defenderSide, targetId }));
  if (battle.pendingMirrorCopy) return battle.pendingMirrorCopy.legalTargetIds
    .map((targetId) => ({ type: 'BATTLE_CHOOSE_MIRROR_COPY',
      side: battle.pendingMirrorCopy!.chooserSide, targetId }));
  if (battle.pendingFreeMove) return legalPendingFreeMoves(battle);
  const active = activeBattleStack(battle);
  if (!active || battle.winner) return [];
  const redirectSide = counterRedirectOpeningSide(battle);
  if (redirectSide) return battle.stacks.filter((stack) => stack.count > 0
    && stack.side !== redirectSide).sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))
    .map((stack) => ({ type: 'BATTLE_CHOOSE_COUNTER_REDIRECT', side: redirectSide,
      targetId: stack.id } as const));
  const openingSide = beguilerOpeningSide(battle);
  if (openingSide) {
    const side = openingSide;
    return battle.stacks.filter((stack) => stack.count > 0 && stack.side !== side)
      .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))
      .map((stack) => ({ type: 'BATTLE_USE_SKILL', skillId: 'beguiler',
        mode: 'chill', targetId: stack.id, side } as const));
  }
  const feral = stackHasAbility(active, 'feral') && !battle.stacks.some((stack) =>
    stack.count > 0 && stack.side === active.side && stack.id !== active.id
      && stacksAdjacent(stack, active));
  const enemies = battle.stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack)
    && stack.id !== active.id && (isBerserk(active) || feral || stack.side !== active.side))
    .filter((target) => canUseRanged(active) || !stackHasAbility(target, 'rear_guard')
      || !battle.stacks.some((ally) => ally.count > 0 && ally.side === target.side
        && ally.id !== target.id && stacksAdjacent(ally, active)));
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
  const opposingHero = active.side === 'attacker' ? battle.defenderHero : battle.attackerHero;
  if (opposingHero && skillRank(opposingHero, 'duelist') >= 2) {
    for (let index = actions.length - 1; index >= 0; index -= 1) {
      if (actions[index].type === 'BATTLE_RETREAT' || actions[index].type === 'BATTLE_SURRENDER') {
        actions.splice(index, 1);
      }
    }
  }
  if (activeHero && skillRank(activeHero, 'beguiler') >= 3
      && !battle.beguilerControlUsed[active.side]) {
    const hpCap = 25 * (activeHero.level ?? 1);
    actions.push(...battle.stacks.filter((stack) => stack.count > 0
      && stack.side !== active.side
      && (stack.count - 1) * UNITS[stack.unitId].hp + stack.topHp <= hpCap)
      .map((stack) => ({ type: 'BATTLE_USE_SKILL', skillId: 'beguiler',
        mode: 'control', targetId: stack.id, side: active.side } as const)));
  }
  actions.push(...legalSpellCasts(battle));
  actions.push(...legalCombatItemUses(battle));
  actions.push(...legalKnackActions(battle));
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
  const counterEater = hero && equippedArtifactWithEffect(hero, 'eat_counter');
  if (counterEater && !battle.artifactEffectUses[active.side].eat_counter) {
    for (const target of battle.stacks.filter((stack) => stack.count > 0)) {
      for (const counterId of ['burn', 'chill', 'hex', 'bloom'] as const) {
        if (target.counters[counterId] > 0) actions.push({
          type: 'BATTLE_USE_ARTIFACT', artifactId: counterEater.id,
          targetId: target.id, counterId,
        });
      }
    }
  }
  const reliquary = hero && equippedArtifactWithEffect(hero, 'store_spell');
  if (reliquary) {
    if (battle.artifactStoredSpell[active.side]) actions.push({
      type: 'BATTLE_USE_ARTIFACT', artifactId: reliquary.id, mode: 'release',
    });
    else if (battle.lastHeroSpellAction[active.side]
        && heroActAvailability(battle, active.side, 'artifact').available) actions.push({
      type: 'BATTLE_USE_ARTIFACT', artifactId: reliquary.id, mode: 'store',
    });
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
  if (!isBerserk(active) && !feral) return actions;
  const nearest = new Set(nearestBerserkTargets(battle, active).map((stack) => stack.id));
  const forcedAttacks = actions.filter((action) => (action.type === 'BATTLE_ATTACK'
      || action.type === 'BATTLE_MOVE_ATTACK') && nearest.has(action.targetId));
  if (forcedAttacks.length || !feral) return forcedAttacks;
  const targets = battle.stacks.filter((stack) => nearest.has(stack.id));
  const moves = actions.filter((action): action is Extract<Action, { type: 'BATTLE_MOVE' }> =>
    action.type === 'BATTLE_MOVE').sort((a, b) => Math.min(...targets.map((target) =>
      stackDistance({ ...active, position: a.destination }, target)))
      - Math.min(...targets.map((target) => stackDistance({ ...active, position: b.destination }, target)))
      || a.destination.y - b.destination.y || a.destination.x - b.destination.x);
  return moves.length ? [moves[0]] : [{ type: 'BATTLE_DEFEND' }];
}

export function applyBattleAction(battle: BattleState, action: Action): BattleState {
  const next = cloneBattle(battle);
  if (action.type === 'BATTLE_DEPLOY_AMBUSH') {
    const legal = legalBattleActions(next).some((candidate) =>
      JSON.stringify(candidate) === JSON.stringify(action));
    if (!legal) throw new Error('Illegal Ambush deployment');
    const deployed = next.stacks.find((stack) => stack.id === action.stackId)!;
    deployed.position = { ...action.destination };
    if (next.pendingArtifactDeploymentSide) {
      const resolved = next.pendingArtifactDeploymentSide;
      next.artifactEffectUses[resolved].free_deployment = 1;
      next.pendingArtifactDeploymentSide = resolved === 'attacker'
        && next.defenderHero && hasArtifactEffect(next.defenderHero, 'free_deployment')
        ? 'defender' : undefined;
      next.log.push('The Odd Boot deploys one company freely on its own half.');
      return next;
    }
    deployed.abilityUses = { ...deployed.abilityUses, ambush: 1 };
    next.pendingAmbushStackId = next.stacks.filter((stack) => stackHasAbility(stack, 'ambush')
      && (stack.abilityUses?.ambush ?? 0) === 0).sort((a, b) => a.side.localeCompare(b.side)
        || a.slot - b.slot || a.id.localeCompare(b.id))[0]?.id;
    return next;
  }
  if (action.type === 'BATTLE_CHOOSE_SPELL_DEFLECT') {
    const legal = legalBattleActions(next).some((candidate) =>
      JSON.stringify(candidate) === JSON.stringify(action));
    if (!legal) throw new Error('Illegal Spell Deflect choice');
    resolvePendingSpellDeflection(next, action.side, action.targetId);
    return next;
  }
  if (action.type === 'BATTLE_CHOOSE_MIRROR_COPY') {
    const legal = legalBattleActions(next).some((candidate) =>
      JSON.stringify(candidate) === JSON.stringify(action));
    if (!legal) throw new Error('Illegal Standing Mirror copy choice');
    resolvePendingMirrorCopy(next, action.side, action.targetId);
    return next;
  }
  if (action.type === 'BATTLE_CHOOSE_COUNTER_REDIRECT') {
    const legal = legalBattleActions(next).some((candidate) =>
      JSON.stringify(candidate) === JSON.stringify(action));
    if (!legal) throw new Error('Illegal Curse-Eater redirect choice');
    chooseCounterRedirect(next, action.side, action.targetId);
    return next;
  }
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
  const placementLegality = action.type === 'BATTLE_CAST'
    ? isP1BoundedCastLegal(next, action) : null;
  if (placementLegality === false) {
    throw new Error('Illegal P1 spell target, branch, placement, or granted-action cap');
  }
  const legalCast = action.type === 'BATTLE_CAST'
    && (placementLegality ?? canCastSpell(next, action.spellId));
  const legalItem = action.type === 'BATTLE_USE_ITEM'
    && canUseCombatItem(next, action.inventorySlot);
  const legalKnack = action.type === 'BATTLE_USE_KNACK' && isKnackActionLegal(next, action);
  if (!legalCast && !legalItem && !legalKnack
      && !legal.some((candidate) => JSON.stringify(candidate) === serialized)) {
    throw new Error(`Illegal battle action: ${action.type}`);
  }

  if (action.type === 'BATTLE_USE_SKILL') {
    const side = action.side;
    const hero = side === 'attacker' ? next.attackerHero : next.defenderHero;
    const target = next.stacks.find((stack) => stack.id === action.targetId)!;
    if (action.mode === 'chill') {
      addBattleCounter(next, target, 'chill', 2, side);
      next.beguilerOpeningResolved[side] = true;
      next.log.push(`Beguiler chills ${UNITS[target.unitId].name} before battle.`);
    } else {
      const result = mindControlCompany(next, target.id, side, 1, 25 * (hero?.level ?? 1));
      if (!result.ok) throw new Error(result.reason.text);
      next.beguilerControlUsed[side] = true;
      next.log.push(`Beguiler controls ${UNITS[target.unitId].name} for one round.`);
    }
    return next;
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
    if (active.count <= 0) {
      next.log.push(`${UNITS[active.unitId].name} is destroyed by a battlefield hazard.`);
      advanceTurn(next, active.id);
      settleBattleState(next);
      return next;
    }
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
    const definition = ARTIFACTS[action.artifactId];
    if (definition.effects.includes('reset_meters')) {
      next.stacks.forEach((stack) => grantSystemMeter(stack, -stack.morale, next));
      next.clapperUsed[active.side] = true;
      next.log.push("The Bell's Clapper stills every company’s morale.");
    } else if (definition.effects.includes('double_largest_attack')) {
      active.doubleNextAttack = true;
      next.hornUsed[active.side] = true;
      next.log.push('The Horn doubles the weight of the largest company for one attack.');
    } else if (definition.effects.includes('eat_counter')) {
      const target = next.stacks.find((stack) => stack.id === action.targetId);
      const counter = action.counterId;
      if (!target || !counter || target.counters[counter] <= 0
          || next.artifactEffectUses[active.side].eat_counter) {
        throw new Error('The artifact needs an unused visible counter pile');
      }
      const amount = target.counters[counter];
      clearCounterPile(target, counter);
      grantSystemMeter(active, amount * 5, next);
      next.artifactEffectUses[active.side].eat_counter = 1;
      next.log.push(`${definition.name} consumes ${amount} ${counter} and grants ${amount * 5} morale.`);
    } else if (definition.effects.includes('store_spell')) {
      if (action.mode === 'store') {
        const spell = next.lastHeroSpellAction[active.side];
        const availability = heroActAvailability(next, active.side, 'artifact');
        if (!spell || next.artifactStoredSpell[active.side] || !availability.available) {
          throw new Error('There is no spell available to store');
        }
        next.artifactStoredSpell[active.side] = {
          ...spell, action: { ...spell.action },
        };
        consumeHeroAct(next, active.side, availability);
        next.log.push(`${definition.name} stores ${spell.action.spellId}.`);
      } else if (action.mode === 'release') {
        const spell = next.artifactStoredSpell[active.side];
        if (!spell) throw new Error('The reliquary is empty');
        castStoredSpell(next, active.side, spell.action, spell.plus, true, spell.manaSpent, false);
        next.artifactStoredSpell[active.side] = null;
        next.log.push(`${definition.name} releases ${spell.action.spellId} without consuming the hero act.`);
      } else throw new Error('Choose whether to store or release a spell');
    } else {
      throw new Error('That artifact has no activated battle effect');
    }
  } else if (action.type === 'BATTLE_USE_ABILITY') {
    applyActivatedAbility(next, active, action);
    advanceTurn(next, active.id);
  } else if (action.type === 'BATTLE_CAST') {
    castSpell(next, action);
    if (next.lastSpellCast) next.lastHeroSpellAction[active.side] = {
      action: { ...action }, plus: next.lastSpellCast.plus,
      manaSpent: next.lastSpellCast.manaSpent,
    };
  } else if (action.type === 'BATTLE_USE_ITEM') {
    useCombatItem(next, action);
  } else if (action.type === 'BATTLE_USE_KNACK') {
    useKnack(next, action);
  }
  settleBattleState(next);
  return next;
}

export function surrenderCost(battle: BattleState, side: BattleSide): number {
  const value = battle.stacks.filter((stack) => isOriginallyOwnedBy(stack, side)
    && stack.count > 0 && !stack.summoned).reduce(
    (sum, stack) => sum + (UNITS[stack.unitId].cost.gold ?? 0) * stack.count, 0,
  );
  const opponent = side === 'attacker' ? battle.defenderHero : battle.attackerHero;
  return Math.ceil(value * 0.25 * (opponent?.specialtyId === 'costlySurrender'
    ? specialtyHandler(opponent).surrenderMultiplier?.() ?? 2 : 1));
}

export function armyAfterBattle(battle: BattleState, side: BattleSide): Army {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const army: Army = Array(hero ? heroArmyCapacity(hero) : MAX_ARMY_SLOTS).fill(null);
  for (const stack of battle.stacks) {
    if (isOriginallyOwnedBy(stack, side) && stack.count > 0 && !stack.summoned) {
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
