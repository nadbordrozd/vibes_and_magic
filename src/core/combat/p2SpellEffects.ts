import { BATTLE_COLS, BATTLE_ROWS } from '../../content/constants';
import { UNITS } from '../../content/units';
import type {
  Action, BattleHero, BattleSide, BattleStack, BattleState, Coord, SpellId, UnitId,
} from '../types';
import { stackUnitHp } from './damage';
import { hexNeighbors } from './hex';
import {
  addSpellCounter, addTimedEffect, clearCounters, grantMeter, totalStackHp,
} from './magicEffects';
import {
  addManaClamped, applySpellDamage, applySpellImpactDamage, canResurrectCompany, resurrectCompany,
  forcedMovementDistance, ownerDeathTriggerCount,
} from './primitives';
import { footprintFits, occupiedByStacks, stackHexes } from './footprint';
import { createBattleTile, placeBattleTile, tileBlocksMovement } from './tiles';
import { stackHasAbility } from './abilities';
import { hasArtifactEffect } from '../artifacts';
import { runExternalDeathPipeline } from './pipeline';
import { spellRecipientAllowed } from './creatureTraits';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;
const enemySide = (side: BattleSide): BattleSide => side === 'attacker' ? 'defender' : 'attacker';
const stack = (battle: BattleState, id?: string) => battle.stacks.find((entry) => entry.id === id);

function compositeRecipientAllowed(battle: BattleState, target: BattleStack): boolean {
  if (!spellRecipientAllowed(battle, target)) return false;
  const ward = target.effects.find((effect) => effect.spellId === 'ward');
  if (!ward) return true;
  target.effects = target.effects.filter((effect) => effect.id !== ward.id);
  battle.log.push(`${UNITS[target.unitId].name}: Ward consumes the whole composite spell instance.`);
  return false;
}

function enchant(
  battle: BattleState, side: BattleSide, spellId: SpellId, plus: boolean, replace?: number,
): void {
  const row = battle.enchantments[side];
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const slots = hero && hasArtifactEffect(hero, 'enchantment_slots') ? 3 : 2;
  const effect = { id: `${spellId}-${side}-${battle.round}`, spellId, side,
    multiplier: 1, upgraded: plus };
  if (row.length < slots) row.push(effect);
  else row.splice(replace ?? 0, 1, effect);
}

function restoreCompany(battle: BattleState, target: BattleStack, hp: number): number {
  const legal = canResurrectCompany(battle, target.id, hp);
  if (!legal.ok) return 0;
  const restored = resurrectCompany(battle, target.id, hp);
  return restored.ok ? restored.value.hpRestored : 0;
}

function legalEmptyHexes(battle: BattleState, candidate: BattleStack): Coord[] {
  const blockers = new Set([...battle.obstacles,
    ...battle.tiles.filter(tileBlocksMovement).map((tile) => tile.position)]
    .map((coord) => `${coord.x},${coord.y}`));
  const occupied = occupiedByStacks(battle.stacks);
  return Array.from({ length: BATTLE_ROWS }, (_, y) =>
    Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y }))).flat()
    .filter((position) => footprintFits(candidate, position, occupied, blockers));
}

function summonFromOssuary(
  battle: BattleState, side: BattleSide, destroyed: BattleStack, plus: boolean,
): void {
  const unitId: UnitId = plus ? 'boneChoir' : 'candleWisps';
  const sourceHp = (battle.initialCounts[destroyed.id] ?? 1) * stackUnitHp(destroyed);
  const base = Math.max(1, Math.ceil(sourceHp / (stackUnitHp({ unitId } as BattleStack) * 2)));
  const count = plus ? Math.max(1, Math.ceil(base / 2)) : base;
  const candidate: BattleStack = {
    id: `ossuary-${side}-${battle.round}-${battle.stacks.length}`, side,
    slot: 70 + battle.stacks.length, unitId, count, topHp: UNITS[unitId].hp,
    position: { x: 0, y: 0 }, shots: UNITS[unitId].shots ?? 0, morale: 0,
    retaliated: false, defended: false, waited: false, bonusActions: 0,
    attacksMade: 0, movedHexes: 0, overwindPrimed: false, overwindUsed: false,
    skipRound: null, summoned: true,
    counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [], abilityUses: {},
    countAtTurnStart: count, temporaryAbilities: [], damageDealt: 0,
    damageTaken: 0, extraActionsTaken: 0,
  };
  const position = legalEmptyHexes(battle, candidate)
    .sort((a, b) => (side === 'attacker' ? a.x - b.x : b.x - a.x)
      || Math.abs(a.y - 4) - Math.abs(b.y - 4) || a.y - b.y)[0];
  if (!position) {
    battle.log.push('Ossuary has no legal empty footprint for its summon.');
    return;
  }
  candidate.position = position;
  battle.stacks.push(candidate);
  battle.initialCounts[candidate.id] = count;
}

function moveAway(
  battle: BattleState, target: BattleStack, origin: Coord, distance: number,
  sourceSide: BattleSide,
): number {
  distance = forcedMovementDistance(battle, target, sourceSide, distance);
  if (distance <= 0) return 0;
  let moved = 0;
  for (let step = 0; step < distance; step += 1) {
    const occupied = occupiedByStacks(battle.stacks, target.id);
    const blockers = new Set([...battle.obstacles,
      ...battle.tiles.filter(tileBlocksMovement).map((tile) => tile.position)]
      .map((coord) => `${coord.x},${coord.y}`));
    const before = Math.min(...stackHexes(target).map((hex) =>
      Math.abs(hex.x - origin.x) + Math.abs(hex.y - origin.y)));
    const next = stackHexes(target).flatMap(hexNeighbors)
      .filter((coord) => footprintFits(target, coord, occupied, blockers))
      .map((coord) => ({ coord, score: Math.abs(coord.x - origin.x) + Math.abs(coord.y - origin.y) }))
      .filter((entry) => entry.score > before)
      .sort((a, b) => b.score - a.score || a.coord.y - b.coord.y || a.coord.x - b.coord.x)[0];
    if (!next) break;
    target.position = { ...next.coord }; moved += 1;
  }
  return moved;
}

function createBulwark(
  battle: BattleState, side: BattleSide, hero: BattleHero, action: CastAction, plus: boolean,
): void {
  const anchor = action.positions?.[0];
  const wallCount = plus ? 6 : 5;
  if (!anchor || action.positions?.length !== 1 || anchor.y !== 0
      || anchor.x < 0 || anchor.x >= BATTLE_COLS) {
    throw new Error('illegal-destination: Choose one battlefield column.');
  }
  const positions = Array.from({ length: wallCount }, (_, y) => ({ x: anchor.x, y }));
  const towerPosition = { x: anchor.x, y: wallCount + 1 };
  const occupied = occupiedByStacks(battle.stacks);
  const blocked = (position: Coord) => occupied.has(`${position.x},${position.y}`)
    || battle.obstacles.some((entry) => entry.x === position.x && entry.y === position.y)
    || battle.tiles.some((tile) => tile.position.x === position.x && tile.position.y === position.y);
  if ([...positions, towerPosition].some(blocked)) {
    throw new Error('illegal-destination: Bulwark needs one clear column.');
  }
  positions.forEach((position) => placeBattleTile(
    battle, createBattleTile(battle, 'wall', position, -1, side, plus),
  ));
  const count = 5 + 2 * hero.spellPower;
  const tower: BattleStack = {
    id: `bulwark-tower-${side}-${battle.round}`, side, slot: 80 + battle.stacks.length,
    unitId: 'watchtower', count, topHp: UNITS.watchtower.hp, position: towerPosition,
    shots: plus ? 999 : UNITS.watchtower.shots ?? 0, morale: 0,
    retaliated: false, defended: false, waited: false, bonusActions: 0,
    attacksMade: 0, movedHexes: 0, overwindPrimed: false, overwindUsed: false,
    skipRound: null, summoned: true,
    counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [],
    artifactAttackBonus: plus ? 2 : 0, abilityUses: {}, countAtTurnStart: count,
    temporaryAbilities: [], damageDealt: 0, damageTaken: 0, extraActionsTaken: 0,
  };
  battle.stacks.push(tower); battle.initialCounts[tower.id] = count;
}

export function resolveP2CombatSpell(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): boolean {
  const target = stack(battle, action.targetId);
  if (action.spellId === 'bellBookAndCandle' || action.spellId === 'theLongOath'
      || action.spellId === 'mirrorHall' || action.spellId === 'ossuary'
      || action.spellId === 'theLongSilence' || action.spellId === 'beastSovereign'
      || action.spellId === 'theWeatherItself') {
    enchant(battle, side, action.spellId, plus, action.replaceEnchantment);
  } else if (action.spellId === 'dayspring') {
    battle.stacks.filter((candidate) => candidate.side === side && !candidate.summoned
      && !candidate.cloneOf).sort((a, b) => a.slot - b.slot).forEach((candidate) => {
      clearCounters(candidate, battle);
      restoreCompany(battle, candidate, (plus ? 30 : 20) * hero.spellPower);
      if (candidate.count > 0) {
        grantMeter(candidate, 30, battle);
        if (plus) candidate.effects.forEach((effect) => { effect.duration += 2; });
      }
    });
  } else if (action.spellId === 'counterweight') {
    const effect = addTimedEffect(target!, action.spellId, 3, plus ? 2 : 1, true, side, battle);
    effect.expiresRound = battle.round + 2; effect.id += ':immovable:double-retaliation';
  } else if (action.spellId === 'bulwark') {
    createBulwark(battle, side, hero, action, plus);
  } else if (action.spellId === 'theUnmakingEngine') {
    battle.stacks.filter((candidate) => candidate.count > 0 && candidate.side !== side)
      .sort((a, b) => a.slot - b.slot).forEach((candidate) => {
        if (!compositeRecipientAllowed(battle, candidate)) return;
        applySpellImpactDamage(battle, { targetId: candidate.id, sourceSide: side,
          base: 25, coefficient: 9, spellPower: hero.spellPower });
        candidate.effects = [];
      });
    if (plus) battle.enchantments[enemySide(side)] = [];
  } else if (action.spellId === 'secondGrave') {
    const effect = addTimedEffect(target!, action.spellId, 99, plus ? 50 : 30, true, side, battle);
    effect.id += plus ? ':return:bloom' : ':return';
  } else if (action.spellId === 'ashenPall') {
    battle.stacks.filter((candidate) => candidate.count > 0 && candidate.side !== side)
      .forEach((candidate) => {
        addSpellCounter(battle, candidate, 'hex', plus ? 4 : 3, side);
        addSpellCounter(battle, candidate, 'chill', plus ? 3 : 2, side);
        if (plus) {
          const marker = addTimedEffect(candidate, action.spellId, 1, 1, false, side, battle);
          marker.id += ':no-next-decay';
        }
      });
  } else if (action.spellId === 'theLedgerBalanced') {
    const effect = addTimedEffect(target!, action.spellId, 99, plus ? 2 : 1, false, side, battle);
    effect.id += ':ledger-mark';
  } else if (action.spellId === 'harvest') {
    let pool = 0;
    battle.stacks.filter((candidate) => candidate.count > 0 && candidate.side !== side)
      .sort((a, b) => a.slot - b.slot).forEach((candidate) => {
        const before = totalStackHp(candidate);
        applySpellDamage(battle, candidate, Math.ceil(before * (plus ? 0.3 : 0.2)), { sourceSide: side });
        pool += before - totalStackHp(candidate);
      });
    battle.stacks.filter((candidate) => candidate.side === side && !candidate.summoned
      && !candidate.cloneOf).sort((a, b) => totalStackHp(a) - totalStackHp(b)
        || a.slot - b.slot).forEach((candidate) => {
        if (pool <= 0) return;
        const before = totalStackHp(candidate);
        const restored = restoreCompany(battle, candidate, pool);
        pool -= Math.max(restored, totalStackHp(candidate) - before);
      });
  } else if (action.spellId === 'rootTheSky') {
    battle.stacks.filter((candidate) => candidate.count > 0 && candidate.side !== side)
      .sort((a, b) => a.slot - b.slot).forEach((candidate) => {
        if (!compositeRecipientAllowed(battle, candidate)) return;
        const wasFlying = stackHasAbility(candidate, 'flying');
        applySpellImpactDamage(battle, { targetId: candidate.id, sourceSide: side,
          base: 10, coefficient: 4, spellPower: hero.spellPower });
        if (candidate.count > 0 && wasFlying) {
          const grounded = addTimedEffect(candidate, action.spellId, plus ? 4 : 3, 1, false, side, battle);
          grounded.id += ':grounded';
          moveAway(battle, candidate, {
            x: Math.floor(BATTLE_COLS / 2), y: Math.floor(BATTLE_ROWS / 2),
          }, 1, side);
          if (plus) addSpellCounter(battle, candidate, 'chill', 2, side);
        }
      });
  } else if (action.spellId === 'windShear') {
    const origin = action.positions?.[0];
    if (!origin || action.positions?.length !== 1 || origin.x < 0 || origin.x >= BATTLE_COLS
        || origin.y < 0 || origin.y >= BATTLE_ROWS) throw new Error('Choose one battlefield hex.');
    battle.stacks.filter((candidate) => candidate.count > 0 && candidate.side !== side)
      .sort((a, b) => a.slot - b.slot).forEach((candidate) => {
        if (!compositeRecipientAllowed(battle, candidate)) return;
        const distance = plus ? 3 : 2;
        if (moveAway(battle, candidate, origin, distance, side) < distance) {
          applySpellDamage(battle, candidate, Math.ceil(totalStackHp(candidate)
            * (plus ? 0.1 : 0.06)), { sourceSide: side });
          if (plus && candidate.count > 0) addSpellCounter(battle, candidate, 'chill', 1, side);
        }
      });
  } else if (action.spellId === 'theLongGreen') {
    battle.stacks.filter((candidate) => candidate.side === side && !candidate.summoned
      && !candidate.cloneOf).sort((a, b) => a.slot - b.slot).forEach((candidate) => {
      restoreCompany(battle, candidate, (plus ? 26 : 18) * hero.spellPower);
      if (candidate.count > 0) addSpellCounter(battle, candidate, 'bloom', plus ? 6 : 5, side);
    });
    battle.stacks.filter((candidate) => candidate.count > 0 && candidate.side !== side)
      .forEach((candidate) => {
        addSpellCounter(battle, candidate, 'chill', plus ? 4 : 3, side);
        addSpellCounter(battle, candidate, 'hex', plus ? 4 : 3, side);
      });
  } else return false;
  return true;
}

export function p2CombatModifiers(
  battle: BattleState, stack: BattleStack,
): { attack: number; defense: number; speed: number; unlimitedRetaliations: boolean } {
  const sovereign = battle.enchantments[stack.side].some((effect) =>
    effect.spellId === 'beastSovereign');
  const beast = sovereign && stackHasAbility(stack, 'beast');
  const upgraded = beast && battle.enchantments[stack.side].some((effect) =>
    effect.spellId === 'beastSovereign' && effect.upgraded);
  const bellAttack = stack.effects.some((effect) => effect.spellId === 'bellBookAndCandle'
    && effect.id.includes(':attack')) ? 1 : 0;
  return { attack: (beast ? 2 : 0) + bellAttack, defense: beast ? 2 : 0, speed: beast ? 2 : 0,
    unlimitedRetaliations: Boolean(upgraded
      || stack.effects.some((effect) => effect.spellId === 'counterweight'
        && effect.magnitude >= 2)) };
}

export function p2RetaliationMultiplier(stack: BattleStack): number {
  return stack.effects.some((effect) => effect.spellId === 'counterweight') ? 2 : 1;
}

/** Settles the single bounded Bell, Book, and Candle payoff at action activation. */
export function recordP2ExtraAction(battle: BattleState, acting: BattleStack): void {
  const bell = battle.enchantments[acting.side].find((effect) =>
    effect.spellId === 'bellBookAndCandle');
  if (!bell) return;
  battle.p2ExtraActionUses ??= {};
  const current = battle.p2ExtraActionUses[acting.side];
  const count = current?.round === battle.round ? current.count : 0;
  if (count >= (bell.upgraded ? 2 : 1)) return;
  battle.p2ExtraActionUses[acting.side] = { round: battle.round, count: count + 1 };
  const hero = acting.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (hero) addManaClamped(hero, bell.upgraded ? 3 : 2);
  const marker = addTimedEffect(acting, 'bellBookAndCandle', 1, 1, true, acting.side, battle);
  marker.id += ':round-duration:attack'; marker.expiresRound = battle.round;
}

export function applyP2RoundStart(battle: BattleState): void {
  for (const side of ['attacker', 'defender'] as const) {
    const oath = battle.enchantments[side].find((effect) => effect.spellId === 'theLongOath');
    if (oath) battle.stacks.filter((candidate) => candidate.count > 0 && candidate.side === side)
      .forEach((candidate) => grantMeter(candidate, 15, battle));
    const silence = battle.enchantments[side].find((effect) => effect.spellId === 'theLongSilence');
    const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    if (silence && hero) {
      const upkeep = silence.upgraded ? 2 : 3;
      if (hero.mana >= upkeep) hero.mana -= upkeep;
      else battle.enchantments[side] = battle.enchantments[side].filter((entry) => entry.id !== silence.id);
    }
    const sovereign = battle.enchantments[side].some((effect) =>
      effect.spellId === 'beastSovereign');
    if (sovereign) battle.stacks.filter((candidate) => candidate.count > 0
      && candidate.side === side && stackHasAbility(candidate, 'beast'))
      .forEach((candidate) => addSpellCounter(battle, candidate, 'bloom', 1, side));
  }
  applyWeather(battle);
}

export type P2Weather = 'hail' | 'fog' | 'squall' | 'sun' | 'frost';
const WEATHER: readonly P2Weather[] = ['hail', 'fog', 'squall', 'sun', 'frost'];
export function p2WeatherForRound(seed: number, round: number): P2Weather {
  let hash = (seed ^ Math.imul(round, 0x9e3779b1)) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash = (hash ^ (hash >>> 13)) >>> 0;
  return WEATHER[hash % WEATHER.length];
}

export function p2WeatherForecastForSide(
  battle: BattleState, side: BattleSide,
): P2Weather | null {
  const ownsUpgraded = battle.enchantments[side].some((effect) =>
    effect.spellId === 'theWeatherItself' && effect.upgraded);
  return ownsUpgraded ? p2WeatherForRound(battle.seed ?? 0, battle.round + 1) : null;
}

function applyWeather(battle: BattleState): void {
  const owners = (['attacker', 'defender'] as const).filter((side) =>
    battle.enchantments[side].some((effect) => effect.spellId === 'theWeatherItself'));
  if (!owners.length) return;
  // Weather is one global event, even when both sides maintain the enchantment. Standard makes
  // Sun/Frost global; otherwise each Upgraded owner contributes only its printed side slice.
  const sourceSide = owners[0];
  const hasStandard = owners.some((side) => battle.enchantments[side].some((effect) =>
    effect.spellId === 'theWeatherItself' && !effect.upgraded));
  const weather = p2WeatherForRound(battle.seed ?? 0, battle.round);
  const living = battle.stacks.filter((candidate) => candidate.count > 0);
  if (weather === 'hail') living.forEach((candidate) => applySpellDamage(
    battle, candidate, Math.max(1, Math.ceil(totalStackHp(candidate) * 0.04)), { sourceSide },
  ));
  else if (weather === 'sun') living.filter((candidate) => hasStandard
      || owners.includes(candidate.side))
    .forEach((candidate) => grantMeter(candidate, 15, battle));
  else if (weather === 'frost') living.filter((candidate) => hasStandard
      || owners.some((owner) => candidate.side !== owner))
    .forEach((candidate) => addSpellCounter(battle, candidate, 'chill', 1, sourceSide));
  else if (weather === 'squall') living.forEach((candidate) => moveAway(
    battle, candidate, {
      x: Math.floor(BATTLE_COLS / 2), y: Math.floor(BATTLE_ROWS / 2),
    }, 1, sourceSide,
  ));
  battle.p2Weather = { round: battle.round, kind: weather };
  battle.log.push(`The Weather Itself brings ${weather}.`);
}

export function p2FogActive(battle: BattleState): boolean {
  return battle.p2Weather?.round === battle.round && battle.p2Weather.kind === 'fog';
}

/** Returns true when Second Grave claims the current destruction save. */
export function claimSecondGrave(battle: BattleState, target: BattleStack, event: number): boolean {
  const effect = target.effects.find((entry) => entry.spellId === 'secondGrave');
  if (!effect || target.claimedDestructionSaveEvent === event) return false;
  target.claimedDestructionSaveEvent = event;
  target.effects = target.effects.filter((entry) => entry.id !== effect.id);
  const initial = battle.initialCounts[target.id] ?? 1;
  target.count = Math.max(1, Math.ceil(initial * effect.magnitude / 100));
  target.topHp = stackUnitHp(target);
  battle.casualties[target.originalSide ?? target.side][target.unitId] = Math.max(0,
    (battle.casualties[target.originalSide ?? target.side][target.unitId] ?? 0) - target.count);
  if (effect.id.includes(':bloom')) addSpellCounter(battle, target, 'bloom', 3, effect.sourceSide);
  battle.log.push(`Second Grave returns ${target.count} ${UNITS[target.unitId].name}.`);
  return true;
}

export function settleP2Destruction(
  battle: BattleState, destroyed: BattleStack, destroyedCount: number,
): void {
  for (const side of ['attacker', 'defender'] as const) {
    const marker = battle.stacks.find((candidate) => candidate.count > 0
      && candidate.side !== side && candidate.effects.some((effect) =>
        effect.spellId === 'theLedgerBalanced' && effect.sourceSide === side));
    if (destroyed.side === side && marker) removeUnitsByLedger(battle, marker, destroyedCount, side);
    const ossuary = battle.enchantments[side].find((effect) => effect.spellId === 'ossuary');
    if (ossuary) {
      const triggerCount = ownerDeathTriggerCount(battle, side);
      for (let trigger = 0; trigger < triggerCount; trigger += 1) {
        summonFromOssuary(battle, side, destroyed, ossuary.upgraded);
      }
    }
  }
}

function removeUnitsByLedger(
  battle: BattleState, target: BattleStack, amount: number, sourceSide: BattleSide,
): void {
  if (target.count <= 0 || amount <= 0) return;
  const hpBefore = totalStackHp(target); const countBefore = target.count;
  const lost = Math.min(target.count, amount);
  target.count -= lost;
  if (target.count <= 0) {
    target.count = 0; target.topHp = 0;
    const owner = target.originalSide ?? target.side;
    battle.casualties[owner][target.unitId] = (battle.casualties[owner][target.unitId] ?? 0) + countBefore;
    runExternalDeathPipeline(battle, target, hpBefore, countBefore, 'spell-impact', sourceSide);
  }
  battle.log.push(`The Ledger Balanced removes ${lost} ${UNITS[target.unitId].name}.`);
}

export function settleP2HalfThreshold(
  battle: BattleState, target: BattleStack, countBefore: number,
): void {
  if (target.count <= 0 || target.count >= (battle.initialCounts[target.id] ?? target.count) / 2
      || countBefore < (battle.initialCounts[target.id] ?? countBefore) / 2) return;
  battle.p2LedgerHalfTriggers ??= [];
  for (const side of ['attacker', 'defender'] as const) {
    const key = `${side}:${target.id}`;
    const marker = battle.stacks.find((candidate) => candidate.count > 0 && candidate.side !== side
      && candidate.effects.some((effect) => effect.spellId === 'theLedgerBalanced'
        && effect.sourceSide === side && effect.magnitude >= 2));
    if (target.side === side && marker && !battle.p2LedgerHalfTriggers.includes(key)) {
      battle.p2LedgerHalfTriggers.push(key);
      removeUnitsByLedger(battle, marker, Math.max(1, countBefore - target.count), side);
    }
  }
}
