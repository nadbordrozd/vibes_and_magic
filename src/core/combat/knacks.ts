import { KNACKS, derivedKnack, ensureKnackHandlersRegistered } from '../../content/knacks';
import { UNITS } from '../../content/units';
import { registeredKnackHandlers } from '../../content/v2/registries';
import type { KnackHandlerId, KnackRank } from '../../content/v2/schema';
import type { Action, BattleHero, BattleSide, BattleStack, BattleState, Coord } from '../types';
import { hasArtifactEffect } from '../artifacts';
import { stackHasAbility } from './abilities';
import { applyRoutedCombatDamage } from './damageRouting';
import { occupiedByStacks, stackHexes } from './footprint';
import { canUseKnackAct, consumeHeroAct } from './heroActs';
import { hexNeighbors } from './hex';
import { addBattleCounter, grantMeter, totalStackHp } from './magicEffects';
import { runExternalDeathPipeline } from './pipeline';
import { canResurrectCompany, resurrectCompany } from './primitives';
import { createBattleTile, placeBattleTile } from './tiles';

export type UseKnackAction = Extract<Action, { type: 'BATTLE_USE_KNACK' }>;

const activeSide = (battle: BattleState): BattleSide | null =>
  battle.stacks.find((stack) => stack.id === battle.currentStackId)?.side ?? null;
const heroFor = (battle: BattleState, side: BattleSide): BattleHero | null =>
  side === 'attacker' ? battle.attackerHero : battle.defenderHero;
const sameCoord = (a: Coord, b: Coord) => a.x === b.x && a.y === b.y;
const stable = (a: BattleStack, b: BattleStack) => a.slot - b.slot || a.id.localeCompare(b.id);

export function currentKnack(battle: BattleState, side = activeSide(battle)) {
  const hero = side ? heroFor(battle, side) : null;
  return hero ? derivedKnack(hero.faction, hero.level ?? 1) : null;
}

export function knackDisabledReason(battle: BattleState): string | null {
  const side = activeSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero) return 'This army has no hero.';
  if (hasArtifactEffect(hero, 'knack_block')) {
    return 'An equipped Burden disables this Knack.';
  }
  const availability = canUseKnackAct(battle, side);
  if (!availability.available) return availability.reason;
  const current = currentKnack(battle, side);
  if (current?.definition.handlerId === 'lay-resin'
      && legalKnackPlacements(battle).length < requiredKnackPositions(battle)) {
    return 'Lay Resin has no legal empty hex for this rank.';
  }
  return null;
}

function alliedTargets(battle: BattleState, side: BattleSide, rank: KnackRank): BattleStack[] {
  const living = battle.stacks.filter((stack) => stack.side === side && stack.count > 0);
  if (rank < 3) return living.sort(stable);
  const sameRoundFallen = battle.stacks.filter((stack) => stack.side === side && stack.count <= 0
    && !stack.summoned && !stack.cloneOf && stack.destroyedRound === battle.round);
  return [...living, ...sameRoundFallen.filter((stack) =>
    canResurrectCompany(battle, stack.id, 1).ok)].sort(stable);
}

export function legalKnackActions(battle: BattleState): UseKnackAction[] {
  const side = activeSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  const current = side ? currentKnack(battle, side) : null;
  if (!side || !hero || !current || battle.activeGrantedAction || knackDisabledReason(battle)) return [];
  const { definition, rank } = current;
  if (definition.handlerId === 'lay-resin') {
    return legalKnackPlacements(battle).length >= requiredKnackPositions(battle)
      ? [{ type: 'BATTLE_USE_KNACK' }] : [];
  }
  if (definition.handlerId === 'ill-wish') {
    return battle.stacks.filter((stack) => stack.side !== side && stack.count > 0)
      .sort(stable).map((stack) => ({ type: 'BATTLE_USE_KNACK', targetId: stack.id }));
  }
  const allies = definition.handlerId === 'errand-remembered'
    ? alliedTargets(battle, side, rank)
    : battle.stacks.filter((stack) => stack.side === side && stack.count > 0).sort(stable);
  if (definition.handlerId === 'hearten' && rank === 3 && allies.length > 1) {
    return allies.flatMap((target) => allies.filter((secondary) => secondary.id !== target.id)
      .map((secondary) => ({ type: 'BATTLE_USE_KNACK', targetId: target.id,
        secondaryTargetId: secondary.id })));
  }
  return allies.map((stack) => ({ type: 'BATTLE_USE_KNACK', targetId: stack.id }));
}

function emptyResinHexes(battle: BattleState, side: BattleSide, rank: KnackRank): Coord[] {
  const occupied = new Set([
    ...occupiedByStacks(battle.stacks),
    ...battle.obstacles.map((coord) => `${coord.x},${coord.y}`),
    ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
  ]);
  const enemyAdjacent = new Set(battle.stacks.filter((stack) => stack.side !== side && stack.count > 0)
    .flatMap((stack) => stackHexes(stack).flatMap(hexNeighbors))
    .map((coord) => `${coord.x},${coord.y}`));
  const result: Coord[] = [];
  for (let y = 0; y < 9; y += 1) for (let x = 0; x < 13; x += 1) {
    const key = `${x},${y}`;
    if (!occupied.has(key) && (rank >= 2 || enemyAdjacent.has(key))) result.push({ x, y });
  }
  return result;
}

export function legalKnackPlacements(battle: BattleState, chosen: readonly Coord[] = []): Coord[] {
  const side = activeSide(battle);
  const current = side ? currentKnack(battle, side) : null;
  if (!side || !current || current.definition.handlerId !== 'lay-resin') return [];
  return emptyResinHexes(battle, side, current.rank).filter((coord) =>
    !chosen.some((picked) => sameCoord(picked, coord)));
}

export function requiredKnackPositions(battle: BattleState): number {
  const current = currentKnack(battle);
  return current?.definition.handlerId === 'lay-resin' && current.rank === 3 ? 2
    : current?.definition.handlerId === 'lay-resin' ? 1 : 0;
}

export function isKnackActionLegal(battle: BattleState, action: UseKnackAction): boolean {
  const options = legalKnackActions(battle);
  const current = currentKnack(battle);
  if (current?.definition.handlerId !== 'lay-resin') {
    return options.some((candidate) => JSON.stringify(candidate) === JSON.stringify(action));
  }
  if (!options.length || action.targetId !== undefined || action.secondaryTargetId !== undefined
      || !action.positions || action.positions.length !== requiredKnackPositions(battle)) return false;
  const legal = legalKnackPlacements(battle);
  return new Set(action.positions.map((position) => `${position.x},${position.y}`)).size
      === action.positions.length
    && action.positions.every((position) => legal.some((candidate) => sameCoord(candidate, position)));
}

function resolveHearten(battle: BattleState, rank: KnackRank, action: UseKnackAction): void {
  const first = battle.stacks.find((stack) => stack.id === action.targetId)!;
  grantMeter(first, rank === 1 ? 20 : rank === 2 ? 30 : 40);
  const second = battle.stacks.find((stack) => stack.id === action.secondaryTargetId);
  if (rank === 3 && second) grantMeter(second, 20);
}

function resolvePatch(battle: BattleState, rank: KnackRank, action: UseKnackAction): void {
  const target = battle.stacks.find((stack) => stack.id === action.targetId)!;
  const percent = rank === 1 ? 5 : rank === 2 ? 8 : 12;
  const doubled = rank === 3 && stackHasAbility(target, 'construct') ? 2 : 1;
  const amount = Math.ceil((battle.initialCounts[target.id] ?? target.count)
    * (target.hpOverride ?? UNITS[target.unitId].hp) * percent / 100) * doubled;
  target.topHp = Math.min(target.hpOverride ?? UNITS[target.unitId].hp, target.topHp + amount);
}

function resolveErrand(
  battle: BattleState, hero: BattleHero, rank: KnackRank, action: UseKnackAction,
): void {
  const budget = 10 + (rank === 1 ? 3 : rank === 2 ? 5 : 7) * (hero.level ?? 1);
  resurrectCompany(battle, action.targetId!, budget);
}

function resolveResin(battle: BattleState, side: BattleSide, action: UseKnackAction): void {
  action.positions!.forEach((position) => placeBattleTile(
    battle, createBattleTile(battle, 'resin', position, -1, side, true),
  ));
}

function resolveIllWish(
  battle: BattleState, side: BattleSide, rank: KnackRank, action: UseKnackAction,
): void {
  const target = battle.stacks.find((stack) => stack.id === action.targetId)!;
  addBattleCounter(battle, target, 'hex', rank, side);
  if (rank === 3) grantMeter(target, -10, battle);
}

function resolveBloodDrum(
  battle: BattleState, side: BattleSide, rank: KnackRank, action: UseKnackAction,
): void {
  const payer = battle.stacks.find((stack) => stack.id === action.targetId)!;
  const routed = applyRoutedCombatDamage(battle, payer,
    Math.max(1, Math.ceil(totalStackHp(payer) * 0.03)), {
      recordDestruction: false, routeLink: false, consumeWard: false,
      applyAbilityReducers: false,
    });
  for (const death of [routed.primary, routed.linked]) if (death?.destroyed) {
    death.target.destroyedRound = battle.round;
    runExternalDeathPipeline(battle, death.target, death.hpBefore, death.countBefore, 'sacrifice', side);
  }
  battle.stacks.filter((stack) => stack.side === side && stack.count > 0 && stack.id !== payer.id)
    .forEach((stack) => {
      grantMeter(stack, rank === 1 ? 10 : rank === 2 ? 15 : 20);
      if (rank >= 2) stack.roundSpeedBonus = (stack.roundSpeedBonus ?? 0) + 1;
    });
  if (rank === 3 && payer.count > 0) payer.knackAttackBonus = 2;
}

function resolveHandler(
  id: KnackHandlerId, battle: BattleState, side: BattleSide, hero: BattleHero,
  rank: KnackRank, action: UseKnackAction,
): void {
  if (id === 'hearten') resolveHearten(battle, rank, action);
  else if (id === 'patch') resolvePatch(battle, rank, action);
  else if (id === 'errand-remembered') resolveErrand(battle, hero, rank, action);
  else if (id === 'lay-resin') resolveResin(battle, side, action);
  else if (id === 'ill-wish') resolveIllWish(battle, side, rank, action);
  else resolveBloodDrum(battle, side, rank, action);
}

export function useKnack(battle: BattleState, action: UseKnackAction): void {
  const side = activeSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  const current = side ? currentKnack(battle, side) : null;
  if (!side || !hero || !current || !isKnackActionLegal(battle, action)) {
    throw new Error('Illegal faction Knack target or hero-act request');
  }
  const availability = canUseKnackAct(battle, side);
  ensureKnackHandlersRegistered();
  const handler = registeredKnackHandlers().get(current.definition.handlerId);
  if (!handler) throw new Error(`Missing Knack handler: ${current.definition.handlerId}`);
  handler.apply({ resolveKnackHandler: (id: KnackHandlerId) =>
    resolveHandler(id, battle, side, hero, current.rank, action) }, action);
  consumeHeroAct(battle, side, availability);
  battle.knackUseRound[side] = battle.round;
  battle.log.push(`${KNACKS[hero.faction].name} used at rank ${current.rank}.`);
}
