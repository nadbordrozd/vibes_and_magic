import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import type {
  Action, BattleHero, BattleSide, BattleStack, BattleState, CounterId, Coord,
} from '../types';
import { stackHasAbility, stackIgnoresMovementBlockers } from './abilities';
import { applyDamage } from './damage';
import { hexNeighbors, nearestReachableToTarget, reachableHexes } from './hex';
import {
  addBattleCounter, addTimedEffect, clearCounters, grantMeter, scaledDuration,
  totalStackHp,
} from './magicEffects';
import { applyEffectTwister } from './twisters';
import { createBattleTile, placeBattleTile, tileBlocksMovement } from './tiles';
import {
  footprintFits, occupiedByStacks, stackDistance, stackHexes, stacksAdjacent,
} from './footprint';
import { coordKey } from '../map/pathfinding';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;
const stackById = (battle: BattleState, id?: string) =>
  battle.stacks.find((stack) => stack.id === id);

function enchant(
  battle: BattleState, side: BattleSide, action: CastAction,
  upgraded: boolean, duration?: number,
): void {
  const row = battle.enchantments[side];
  const effect = {
    id: `${action.spellId}-${side}-${battle.round}`, spellId: action.spellId,
    side, multiplier: 1, upgraded, duration,
  };
  if (row.length < 2) row.push(effect);
  else row.splice(action.replaceEnchantment ?? 0, 1, effect);
}

function percentDamage(battle: BattleState, stack: BattleStack, percent: number): void {
  const damage = Math.max(1, Math.ceil(totalStackHp(stack) * percent / 100));
  const kills = applyDamage(stack, damage);
  battle.casualties[stack.side][stack.unitId] =
    (battle.casualties[stack.side][stack.unitId] ?? 0) + kills;
  if (stack.count === 0) battle.destroyedStacks += 1;
}

function freeHexes(battle: BattleState, mover: BattleStack): Coord[] {
  return reachableHexes(
    mover.position, UNITS[mover.unitId].speed,
    [...occupiedByStacks(battle.stacks, mover.id)].map((key) => {
      const [x, y] = key.split(',').map(Number); return { x, y };
    }),
    [...battle.obstacles, ...battle.tiles.filter(tileBlocksMovement).map((tile) => tile.position)],
    stackIgnoresMovementBlockers(mover),
    false, () => 0, UNITS[mover.unitId].hexSize,
  );
}

function push(
  battle: BattleState, target: BattleStack, source: BattleStack | undefined,
  distance: number, collisionPercent: number, chill: boolean,
): void {
  if (!source) return;
  let moved = 0;
  for (let step = 0; step < distance; step += 1) {
    const occupied = occupiedByStacks(battle.stacks, target.id);
    const blockers = new Set([...battle.obstacles,
      ...battle.tiles.filter(tileBlocksMovement).map((tile) => tile.position)].map(coordKey));
    const options = stackHexes(target).flatMap(hexNeighbors)
      .filter((coord) => footprintFits(target, coord, occupied, blockers));
    const next = options.sort((a, b) => {
      const da = Math.abs(a.x - source.position.x) + Math.abs(a.y - source.position.y);
      const db = Math.abs(b.x - source.position.x) + Math.abs(b.y - source.position.y);
      return db - da;
    })[0];
    if (!next) break;
    target.position = { ...next };
    moved += 1;
  }
  if (moved < distance) {
    percentDamage(battle, target, collisionPercent);
    if (chill && target.count > 0) addBattleCounter(battle, target, 'chill', 1, source.side);
  }
}

function resolveWild(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): boolean {
  const target = stackById(battle, action.targetId);
  if (action.spellId === 'gale') {
    const source = battle.stacks.find((stack) => stack.id === battle.currentStackId);
    push(battle, target!, source, plus ? 3 : 2, plus ? 6 : 3, plus);
  } else if (action.spellId === 'bloom') {
    addBattleCounter(battle, target!, 'bloom', plus ? 4 : 3, side);
    if (plus) battle.stacks.filter((stack) => stack.count > 0 && stack.side === side
      && stack.id !== target!.id
      && stacksAdjacent(target!, stack))
      .forEach((stack) => addBattleCounter(battle, stack, 'bloom', 1, side));
  } else if (action.spellId === 'overgrow') {
    applyEffectTwister(battle, side, action, 'overgrow', plus);
  } else if (action.spellId === 'thicket') {
    if (action.positions?.length !== 3) throw new Error('Choose three undergrowth hexes');
    action.positions.forEach((position) => placeBattleTile(
      battle, createBattleTile(battle, 'undergrowth', position, -1, side, plus),
    ));
  } else if (action.spellId === 'rains') {
    battle.stacks.filter((stack) => stack.count > 0).forEach((stack) => {
      stack.counters.burn = 0;
      if (stack.side === side) addBattleCounter(battle, stack, 'bloom', 1, side);
      else if (plus) addBattleCounter(battle, stack, 'chill', 1, side);
    });
  } else if (action.spellId === 'stampedeCall') {
    battle.stacks.filter((stack) => stack.count > 0 && stack.side === side
      && stackHasAbility(stack, 'beast')).forEach((stack) => {
      const enemy = battle.stacks.filter((candidate) => candidate.count > 0
        && candidate.side !== side).sort((a, b) =>
        stackDistance(a, stack) - stackDistance(b, stack))[0];
      const destination = enemy && nearestReachableToTarget(freeHexes(battle, stack), enemy.position);
      if (destination) stack.position = { ...destination };
      if (plus) stack.roundSpeedBonus = (stack.roundSpeedBonus ?? 0) + 2;
    });
  } else if (action.spellId === 'storm') {
    battle.stacks.filter((stack) => stack.count > 0).forEach((stack) =>
      percentDamage(battle, stack, stackHasAbility(stack, 'flying') ? (plus ? 18 : 12) : 6));
  } else if (action.spellId === 'shedSkin') {
    const effect = target!.effects.shift();
    let magnitude = effect?.magnitude ?? 0;
    if (!effect) {
      const counter = (Object.keys(target!.counters) as CounterId[])
        .find((id) => target!.counters[id] > 0);
      if (counter) {
        magnitude = target!.counters[counter];
        target!.counters[counter] = 0;
      }
    }
    addBattleCounter(battle, target!, 'bloom', Math.max(1, magnitude), side);
  } else if (action.spellId === 'hedgerowMarch') {
    enchant(battle, side, action, plus);
  } else return false;
  return true;
}

export function resolveExpansionCombatSpell(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): boolean {
  const target = stackById(battle, action.targetId);
  if (SPELLS[action.spellId].school === 'wild'
      && resolveWild(battle, side, hero, action, plus)) return true;
  if (action.spellId === 'clarion') {
    target!.morale = plus ? 100 : 80;
    grantMeter(target!, 0);
  } else if (action.spellId === 'vigilOfTheHost') {
    enchant(battle, side, action, plus);
  } else if (action.spellId === 'oathbind') {
    addTimedEffect(target!, action.spellId, scaledDuration(plus ? 3 : 2, hero.spellPower),
      plus ? 2 : 1, false, side);
  } else if (action.spellId === 'brittle') {
    addTimedEffect(target!, action.spellId, scaledDuration(plus ? 3 : 2, hero.spellPower),
      1, false, side);
    if (plus) addBattleCounter(battle, target!, 'burn', 2, side);
  } else if (action.spellId === 'standingMirror') {
    const occupied = new Set([
      ...occupiedByStacks(battle.stacks),
      ...battle.obstacles.map((position) => `${position.x},${position.y}`),
      ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
    ]);
    const preferredX = side === 'attacker' ? 3 : 8;
    const position = Array.from({ length: 9 }, (_, offset) => ({
      x: preferredX, y: [4, 3, 5, 2, 6, 1, 7, 0, 8][offset],
    })).find((candidate) => !occupied.has(`${candidate.x},${candidate.y}`));
    if (!position) throw new Error('There is no free hex for the Standing Mirror');
    const prior = battle.stacks.find((stack) => stack.side === side
      && stackHasAbility(stack, 'mirror_hex') && stack.count > 0);
    if (prior) prior.count = 0;
    battle.stacks.push({
      id: `standing-mirror-${side}-${battle.round}`, side, slot: 40,
      unitId: 'standingMirror', count: 1, topHp: 30, position,
      shots: 0, morale: 0, retaliated: false, defended: false, waited: false,
      bonusActions: 0, attacksMade: 0, movedHexes: 0,
      overwindPrimed: false, overwindUsed: false, skipRound: null,
      summoned: true, counters: { burn: 0, chill: 0, hex: 0, bloom: 0 },
      effects: [], abilityUses: {}, countAtTurnStart: 1, temporaryAbilities: [],
    });
  } else if (action.spellId === 'silenceThePassing') {
    enchant(battle, side, action, plus, scaledDuration(3, hero.spellPower));
  } else if (action.spellId === 'theToll') {
    hero.mana += battle.destroyedStacks * (plus ? 3 : 2);
  } else if (action.spellId === 'hourglassCrack') {
    target!.bonusActions += 1;
    if (plus && action.skipRound !== undefined && action.skipRound <= battle.round) {
      throw new Error('Choose a future round to skip');
    }
    target!.skipRound = plus ? action.skipRound ?? battle.round + 1 : battle.round + 1;
  } else if (action.spellId === 'borrowShape') {
    const source = stackById(battle, action.secondaryTargetId);
    if (!source || source.side === side || (!plus && !stacksAdjacent(target!, source))) {
      throw new Error('Borrow Shape needs an eligible enemy source');
    }
    target!.temporaryAbilities = [...new Set([
      ...(target!.temporaryAbilities ?? []), ...UNITS[source.unitId].abilities,
    ])];
  } else if (action.spellId === 'loyalUntoDeath') {
    addTimedEffect(target!, action.spellId, 99, plus ? 2 : 1, true, side);
  } else return false;
  return true;
}
