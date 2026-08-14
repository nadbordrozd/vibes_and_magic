import { unitStrength } from '../army';
import { UNITS } from '../../content/units';
import type {
  Action, BattleHero, BattleSide, BattleStack, BattleState, CounterId, Coord, UnitId,
} from '../types';
import {
  destructionProportionality, runExternalDeathPipeline, runSacrificeDeathPipeline,
} from './pipeline';
import { hexNeighbors } from './hex';
import { occupiedByStacks, stackHexes, stacksAdjacent } from './footprint';
import {
  addManaClamped, applySpellImpactDamage, linkCompanies, massTargets, mindControlCompany,
  sacrificeCompany,
} from './primitives';
import {
  addSpellCounter, addTimedEffect, clearCounterPile, grantMeter, loseMeter, scaledCounter,
  scaledDuration, scaledPercent, totalStackHp,
} from './magicEffects';
import { createBattleTile, placeBattleTile, tileBlocksMovement } from './tiles';
import { applyRoutedCombatDamage } from './damageRouting';
import { stackHasAbility } from './abilities';
import { hasArtifactEffect } from '../artifacts';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;
const stack = (battle: BattleState, id?: string) =>
  battle.stacks.find((candidate) => candidate.id === id);
const fail = (code: string, text: string): never => { throw new Error(`${code}: ${text}`); };

function requireResult<T>(result: { ok: true; value: T } | { ok: false; reason: { code: string; text: string } }): T {
  return result.ok ? result.value : fail(result.reason.code, result.reason.text);
}

function stableHash(seed: number, value: string): number {
  let hash = seed >>> 0;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

export function wildcallSummonPlan(
  battle: Pick<BattleState, 'seed'>, hero: BattleHero, plus: boolean,
): { unitId: UnitId; count: number } | null {
  const budget = (plus ? 18 : 12) * hero.spellPower;
  const beasts = (Object.keys(UNITS) as UnitId[]).filter((id) =>
    UNITS[id].abilities.includes('beast') && unitStrength(id) <= budget)
    .sort((a, b) => stableHash(battle.seed ?? 0, a) - stableHash(battle.seed ?? 0, b)
      || a.localeCompare(b));
  const unitId = beasts[0];
  return unitId ? { unitId, count: Math.max(1, Math.floor(budget / unitStrength(unitId))) } : null;
}

function summonBeast(
  battle: BattleState, side: BattleSide, hero: BattleHero, position: Coord, plus: boolean,
): void {
  const plan = wildcallSummonPlan(battle, hero, plus);
  const { unitId, count } = plan
    ?? fail('summon-budget-empty', 'No Beast fits the Wildcall budget.');
  const occupied = occupiedByStacks(battle.stacks);
  const blocked = new Set([...battle.obstacles,
    ...battle.tiles.filter(tileBlocksMovement).map((tile) => tile.position)]
    .map((coord) => `${coord.x},${coord.y}`));
  for (let offset = 0; offset < UNITS[unitId].hexSize; offset += 1) {
    const key = `${position.x + offset},${position.y}`;
    if (position.x + offset >= 13 || position.y < 0 || position.y >= 9
        || occupied.has(key) || blocked.has(key)) {
      fail('illegal-destination', 'Wildcall requires a legal empty destination.');
    }
  }
  battle.stacks.push({
    id: `wildcall-${side}-${battle.round}-${battle.stacks.length}`, side,
    slot: 60 + battle.stacks.length, unitId, count, topHp: UNITS[unitId].hp,
    position: { ...position }, shots: UNITS[unitId].shots ?? 0, morale: 0,
    retaliated: false, defended: false, waited: false, bonusActions: 0,
    attacksMade: 0, movedHexes: 0, overwindPrimed: false, overwindUsed: false,
    skipRound: null, summoned: true,
    counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [],
    roundSpeedBonus: undefined, summonSpeedBonus: plus ? 2 : undefined,
    abilityUses: {}, countAtTurnStart: count,
    temporaryAbilities: [], damageDealt: 0, damageTaken: 0, extraActionsTaken: 0,
  });
}

function createUndergrowth(battle: BattleState, side: BattleSide, positions: Coord[]): void {
  const occupied = occupiedByStacks(battle.stacks);
  const used = new Set<string>();
  for (const position of positions) {
    const key = `${position.x},${position.y}`;
    if (!Number.isInteger(position.x) || !Number.isInteger(position.y)
        || position.x < 0 || position.x >= 13 || position.y < 0 || position.y >= 9
        || occupied.has(key) || used.has(key) || battle.obstacles.some((coord) =>
          coord.x === position.x && coord.y === position.y)
        || battle.tiles.some((tile) => tile.position.x === position.x
          && tile.position.y === position.y)) fail('illegal-destination', 'Undergrowth needs empty hexes.');
    used.add(key);
  }
  positions.forEach((position) => placeBattleTile(
    battle, createBattleTile(battle, 'undergrowth', position, -1, side, false),
  ));
}

function addRoundEffect(
  battle: BattleState, target: BattleStack, spellId: 'grudge' | 'yoke' | 'sapAndSinew',
  rounds: number, magnitude: number, beneficial: boolean, side: BattleSide,
) {
  const effect = addTimedEffect(target, spellId, rounds, magnitude, beneficial, side, battle);
  effect.expiresRound = battle.round + rounds - 1;
  effect.id += ':round-duration';
  return effect;
}

export function resolveP1GraveWildSpell(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): boolean {
  const target = stack(battle, action.targetId);
  if (action.spellId === 'pinchOfAsh') {
    addSpellCounter(battle, target!, 'hex', plus ? 3 : 2, side, { scalesWithSpellPower: false });
    if (!stackHasAbility(target!, 'mindless')) {
      loseMeter(target!, plus ? 20 : 10, battle);
    }
  } else if (action.spellId === 'tithe') {
    const hp = totalStackHp(target!);
    const routed = applyRoutedCombatDamage(
      battle, target!, Math.max(1, Math.floor(
        hp * scaledPercent(plus ? 8 : 10, hero.spellPower) / 100,
      )),
      { recordDestruction: false },
    );
    if (routed.primary.destroyed) runSacrificeDeathPipeline(
      battle, routed.primary.target, routed.primary.hpBefore, routed.primary.countBefore,
    );
    if (routed.linked?.destroyed) runExternalDeathPipeline(
      battle, routed.linked.target, routed.linked.hpBefore, routed.linked.countBefore,
      'spell-impact', side,
    );
    addManaClamped(hero, plus ? 6 : 4);
    if (plus && target!.count > 0) addSpellCounter(battle, target!, 'bloom', 2, side);
  } else if (action.spellId === 'grudge') {
    const effect = addRoundEffect(
      battle, target!, action.spellId, scaledDuration(3, hero.spellPower),
      plus ? 15 : 10, false, side,
    );
    effect.id += plus ? ':hex-2' : ':hex-1';
  } else if (action.spellId === 'wither') {
    requireResult(applySpellImpactDamage(battle, {
      targetId: target!.id, sourceSide: side, base: 6, coefficient: 3,
      spellPower: hero.spellPower, cap: 40,
    }));
    if (target!.count > 0) {
      addSpellCounter(battle, target!, 'hex', plus ? 8 : 6, side);
      if (plus) addSpellCounter(battle, target!, 'chill', 2, side);
    }
  } else if (action.spellId === 'yoke') {
    const other = stack(battle, action.secondaryTargetId);
    const rounds = scaledDuration(3, hero.spellPower);
    requireResult(linkCompanies(
      battle, target!.id, other!.id, plus ? 0.75 : 0.5, rounds, plus,
    ));
    for (const linked of [target!, other!]) {
      const marker = addRoundEffect(
        battle, linked, action.spellId, rounds, plus ? 2 : 1, false, side,
      );
      marker.id += ':damage-link';
    }
  } else if (action.spellId === 'graveBargain') {
    const scale = destructionProportionality(battle, target!);
    const hpBefore = totalStackHp(target!);
    const countBefore = target!.count;
    const outcome = requireResult(sacrificeCompany(battle, target!.id));
    runSacrificeDeathPipeline(battle, target!, hpBefore, countBefore);
    addManaClamped(hero, Math.min(20, Math.floor(outcome.startingMaxHp * 0.1)));
    battle.stacks.filter((candidate) => candidate.side === side && candidate.count > 0)
      .forEach((candidate) => {
        grantMeter(candidate, Math.round(25 * scale), battle);
        addSpellCounter(battle, candidate, 'bloom',
          Math.round(scaledCounter(3, hero.spellPower) * scale), side,
          { scalesWithSpellPower: false });
      });
    if (plus) battle.stacks.filter((candidate) => candidate.side !== side && candidate.count > 0)
      .forEach((candidate) => addSpellCounter(
        battle, candidate, 'hex', Math.round(scaledCounter(3, hero.spellPower) * scale), side,
        { scalesWithSpellPower: false },
      ));
  } else if (action.spellId === 'puppetStrings') {
    requireResult(mindControlCompany(
      battle, target!.id, side, scaledDuration(plus ? 3 : 2, hero.spellPower),
      40 * hero.spellPower, plus,
    ));
  } else if (action.spellId === 'nettle') {
    requireResult(applySpellImpactDamage(battle, {
      targetId: target!.id, sourceSide: side, base: 10, coefficient: 0,
      spellPower: 0, cap: 10,
    }));
    if (target!.count > 0) {
      addSpellCounter(battle, target!, 'chill', plus ? 2 : 1, side,
        { scalesWithSpellPower: false });
      if (plus) {
        const marker = addTimedEffect(target!, action.spellId, 1, 1, false, side, battle);
        marker.id += ':no-speed-bonus';
      }
    }
  } else if (action.spellId === 'bramblelash') {
    requireResult(applySpellImpactDamage(battle, {
      targetId: target!.id, sourceSide: side, base: 8, coefficient: 4,
      spellPower: hero.spellPower, cap: 40,
    }));
    const emptyAdjacent = [...new Map(stackHexes(target!).flatMap(hexNeighbors)
      .map((position) => [`${position.x},${position.y}`, position] as const)).values()]
      .filter((position) => {
      const key = `${position.x},${position.y}`;
      return position.x >= 0 && position.x < 13 && position.y >= 0 && position.y < 9
        && !occupiedByStacks(battle.stacks).has(key)
        && !battle.obstacles.some((coord) => coord.x === position.x && coord.y === position.y)
        && !battle.tiles.some((tile) => tile.position.x === position.x && tile.position.y === position.y);
      });
    const positions = plus ? emptyAdjacent : action.positions ?? [];
    if (!plus && (positions.length !== 1 || !emptyAdjacent.some((position) =>
      position.x === positions[0].x && position.y === positions[0].y))) {
      fail('illegal-destination', 'Choose one empty hex adjacent to the target.');
    }
    createUndergrowth(battle, side, positions);
  } else if (action.spellId === 'wildcall') {
    const destination = action.positions?.[0];
    if (!destination || action.positions?.length !== 1) {
      throw new Error('illegal-destination: Choose one summon hex.');
    }
    summonBeast(battle, side, hero, destination, plus);
  } else if (action.spellId === 'sapAndSinew') {
    const effect = addRoundEffect(
      battle, target!, action.spellId, scaledDuration(3, hero.spellPower),
      plus ? 3 : 2, true, side,
    );
    effect.id += `:attack:speed-${plus ? 4 : 3}:extra-retaliation${plus ? ':plus' : ':standard'}`;
  } else if (action.spellId === 'shedSkin') {
    const parts = action.effectId?.split(':') ?? [];
    const adjacent = plus ? stack(battle, action.secondaryTargetId) : undefined;
    let magnitude = 0;
    if (parts[0] === 'counter' && parts[1] === target!.id) {
      const counter = parts[2] as CounterId;
      magnitude = target!.counters[counter] ?? 0;
      if (magnitude <= 0) fail('counter-empty', 'The chosen counter pile is empty.');
      clearCounterPile(target!, counter);
      if (plus) addSpellCounter(battle, adjacent!, counter, magnitude, side,
        { scalesWithSpellPower: false });
    } else if (parts[0] === 'timed' && parts[1] === target!.id) {
      const id = parts.slice(2).join(':');
      const effect = target!.effects.find((candidate) => candidate.id === id);
      if (!effect) throw new Error('invalid-value: The chosen effect cannot be removed.');
      if (effect.spellId === 'yoke' && target!.damageLink?.protected) {
        fail('invalid-value', 'The chosen effect cannot be removed.');
      }
      magnitude = effect.magnitude;
      const formerLink = effect.spellId === 'yoke' ? target!.damageLink && {
        other: stack(battle, target!.damageLink.targetId),
        share: target!.damageLink.share,
        duration: Math.max(1, target!.damageLink.expiresRound - battle.round),
      } : undefined;
      target!.effects = target!.effects.filter((candidate) => candidate.id !== id);
      if (effect.spellId === 'yoke') removeYokeFromEffect(battle, target!);
      if (plus && effect.spellId === 'yoke' && formerLink?.other) {
        requireResult(linkCompanies(
          battle, adjacent!.id, formerLink.other.id, formerLink.share, formerLink.duration, false,
        ));
        for (const linked of [adjacent!, formerLink.other]) {
          const marker = addTimedEffect(
            linked, 'yoke', formerLink.duration, effect.magnitude, false, side, battle,
          );
          marker.expiresRound = battle.round + formerLink.duration - 1;
          marker.id += ':round-duration:damage-link:shed';
        }
      } else if (plus) {
        adjacent!.effects.push({ ...effect, id: `${effect.id}:shed:${adjacent!.id}` });
      }
    } else fail('invalid-value', 'Choose one counter pile or timed effect on the ally.');
    addSpellCounter(battle, target!, 'bloom', Math.max(1, magnitude), side,
      { scalesWithSpellPower: false });
  } else if (action.spellId === 'hedgerowMarch') {
    const row = battle.enchantments[side];
    const enchantment = {
      id: `hedgerowMarch-${side}-${battle.round}`, spellId: action.spellId,
      side, multiplier: 1, upgraded: plus,
    };
    const slots = hasArtifactEffect(hero, 'enchantment_slots') ? 3 : 2;
    if (row.length < slots) row.push(enchantment);
    else row.splice(action.replaceEnchantment ?? 0, 1, enchantment);
  } else if (action.spellId === 'verdantSurge') {
    massTargets(battle, side, 'mass-all').forEach((candidate) => {
      addSpellCounter(battle, candidate, candidate.side === side ? 'bloom' : 'chill',
        plus ? (candidate.side === side ? 4 : 3) : (candidate.side === side ? 3 : 2), side);
      if (plus && candidate.side === side) {
        const marker = addTimedEffect(candidate, action.spellId, 1, 1, true, side, battle);
        marker.id += ':no-bloom-decay';
      }
    });
  } else if (action.spellId === 'theTurningYear') {
    const chosen = action.counterId;
    if (!chosen || !(['burn', 'chill', 'hex', 'bloom'] as CounterId[]).includes(chosen)) {
      throw new Error('invalid-value: Choose Burn, Chill, Hex, or Bloom.');
    }
    const chosenCounter: CounterId = chosen;
    massTargets(battle, side, 'mass-all').forEach((candidate) => {
      let converted = 0;
      for (const counter of ['burn', 'chill', 'hex', 'bloom'] as CounterId[]) {
        if (counter === chosenCounter) continue;
        converted += candidate.counters[counter]; clearCounterPile(candidate, counter);
      }
      if (plus && candidate.side === side) converted *= 2;
      candidate.counters[chosenCounter] = Math.min(
        9, candidate.counters[chosenCounter] + converted,
      );
    });
  } else return false;
  return true;
}

export function removeYokeFromEffect(battle: BattleState, target: BattleStack): boolean {
  if (!target.damageLink || target.damageLink.protected) return false;
  const other = stack(battle, target.damageLink.targetId);
  target.damageLink = undefined;
  if (other?.damageLink?.targetId === target.id) other.damageLink = undefined;
  target.effects = target.effects.filter((effect) => effect.spellId !== 'yoke');
  if (other) other.effects = other.effects.filter((effect) => effect.spellId !== 'yoke');
  return true;
}

export function p1GraveWildAttackModifiers(
  battle: BattleState, attacker: BattleStack, defender: BattleStack,
): { multiplier: number; attack: number } {
  const grudge = defender.effects.find((effect) => effect.spellId === 'grudge'
    && effect.sourceSide === attacker.side);
  const sap = attacker.effects.find((effect) => effect.spellId === 'sapAndSinew');
  return { multiplier: grudge ? 1 + grudge.magnitude / 100 : 1, attack: sap?.magnitude ?? 0 };
}

export function p1GraveWildRetaliationLimit(stack: BattleStack): number {
  const sap = stack.effects.some((effect) => effect.spellId === 'sapAndSinew'
    && effect.id.includes(':extra-retaliation'));
  return sap && stackHasAbility(stack, 'beast') ? 2 : 1;
}

/** Applies Sap+'s Beast rider once at the actual round-start boundary. */
export function applyP1GraveWildRoundStart(battle: BattleState): void {
  for (const target of battle.stacks.filter((candidate) => candidate.count > 0
    && stackHasAbility(candidate, 'beast'))) {
    const sap = target.effects.find((effect) => effect.spellId === 'sapAndSinew'
      && effect.id.includes(':plus'));
    if (sap) addSpellCounter(battle, target, 'bloom', 2, sap.sourceSide);
  }
}

export function applyGrudgeAfterAttack(
  battle: BattleState, attacker: BattleStack, defender: BattleStack,
): void {
  const grudge = defender.effects.find((effect) => effect.spellId === 'grudge'
    && effect.sourceSide === attacker.side);
  if (grudge && defender.count > 0) addSpellCounter(
    battle, defender, 'hex', grudge.id.includes(':hex-2') ? 2 : 1, attacker.side,
  );
}
