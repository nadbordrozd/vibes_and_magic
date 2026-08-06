import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import type {
  Action, BattleHero, BattleSide, BattleStack, BattleState,
  SpellId,
} from '../types';
import { applyDamage } from './damage';
import { occupiedByStacks, stacksAdjacent } from './footprint';
import {
  addBattleCounter, addTimedEffect, clearCounters, healWithoutResurrection,
  grantMeter, scaledCounter, scaledDuration, scaledPercent, totalStackHp,
} from './magicEffects';
import { stackUnitHp } from './damage';
import { skillRank, specialtyHandler } from '../heroBehaviors';
import { artifactEffectTotal, hasEquippedArtifact } from '../artifacts';
import { createBattleTile, placeBattleTile } from './tiles';
import {
  isSpellTargetLegal, legalTwistEffectIds,
} from './spellTargets';
import { applyEffectTwister } from './twisters';
import {
  effectiveResonances, isUpgraded, spellManaCost,
} from './spellModifiers';
import { resolveExpansionCombatSpell } from './expansionSpellEffects';
import { stackHasAbility } from './abilities';
export { effectiveResonances, isUpgraded };

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;
const enemySide = (side: BattleSide): BattleSide =>
  side === 'attacker' ? 'defender' : 'attacker';
const heroFor = (battle: BattleState, side: BattleSide): BattleHero | null =>
  side === 'attacker' ? battle.attackerHero : battle.defenderHero;
const actorSide = (battle: BattleState): BattleSide | null =>
  battle.stacks.find((stack) => stack.id === battle.currentStackId)?.side ?? null;
const stackById = (battle: BattleState, id?: string) =>
  battle.stacks.find((stack) => stack.id === id);
const ALLY_TARGETS = new Set<SpellId>([
  'rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
  'ward', 'quicksilver', 'mournersVeil', 'remembrance',
  'clarion', 'bloom', 'shedSkin', 'loyalUntoDeath',
]);
const ENEMY_TARGETS = new Set<SpellId>([
  'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge', 'quiet',
  'oathbind', 'brittle', 'gale',
]);

export function canBeginSpellCast(battle: BattleState, spellId: SpellId): boolean {
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  const hourglassSecondCast = Boolean(side && hero && battle.round % 2 === 0
    && battle.castRound[side] === battle.round
    && battle.doubleCastUsedRound[side] !== battle.round
    && hasEquippedArtifact(hero, 'sunderedHourglass'));
  if (!side || !hero || (battle.castRound[side] === battle.round && !hourglassSecondCast)
      || !hero.knownSpells.includes(spellId)) return false;
  const definition = SPELLS[spellId];
  if (definition.kind === 'adventure' || definition.kind === 'topology') return false;
  return definition.mana === 'X'
    ? hero.mana > 0 : hero.mana >= spellManaCost(battle, side, hero, spellId);
}

export function canCastSpell(battle: BattleState, spellId: SpellId): boolean {
  return canBeginSpellCast(battle, spellId)
    && legalSpellCasts(battle).some((action) => action.spellId === spellId);
}

export function legalSpellCasts(battle: BattleState): CastAction[] {
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!hero || !side) return [];
  const enumerate = (
    actionSpellId: SpellId, resolvedSpellId: SpellId, plus: boolean,
  ): CastAction[] => {
    const make = (choice: Omit<CastAction, 'type' | 'spellId'>): CastAction => ({
      type: 'BATTLE_CAST', spellId: actionSpellId, ...choice,
    });
    const definition = SPELLS[resolvedSpellId];
    if (definition.effectOperation) {
      return legalTwistEffectIds(battle, resolvedSpellId).flatMap((effectId) => {
        if (definition.effectOperation === 'reflect') {
          const targets = battle.stacks.filter((stack) => stack.count > 0);
          if (!plus) return targets.map((target) => make({ effectId, targetId: target.id }));
          return targets.flatMap((target) => targets
            .filter((secondary) => secondary.id !== target.id)
            .map((secondary) => make({
              effectId, targetId: target.id, secondaryTargetId: secondary.id,
            })));
        }
        if (definition.effectOperation === 'overgrow' && plus) {
          const sourceId = effectId.split(':')[1];
          const source = stackById(battle, sourceId);
          const exclusions = source ? battle.stacks.filter((stack) => stack.count > 0
            && stack.id !== source.id && stacksAdjacent(stack, source)) : [];
          return exclusions.length > 0
            ? exclusions.map((stack) => make({ effectId, secondaryTargetId: stack.id }))
            : [make({ effectId })];
        }
        return [make({ effectId })];
      });
    }
    if (resolvedSpellId === 'borrowShape') {
      return battle.stacks.filter((stack) => stack.side === side && stack.count > 0)
        .flatMap((target) => battle.stacks.filter((source) => source.side !== side
          && source.count > 0 && (plus || stacksAdjacent(target, source)))
          .map((source) => make({
            targetId: target.id, secondaryTargetId: source.id,
          })));
    }
    if (resolvedSpellId === 'hourglassCrack') {
      return battle.stacks.filter((stack) => stack.count > 0).flatMap((stack) =>
        (plus ? [battle.round + 1, battle.round + 2, battle.round + 3] : [undefined])
          .map((skipRound) => make({
            targetId: stack.id, ...(skipRound === undefined ? {} : { skipRound }),
          })));
    }
    if (ALLY_TARGETS.has(resolvedSpellId)) {
      const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0
        && (resolvedSpellId !== 'remembrance' || !stack.summoned));
      if (resolvedSpellId === 'rally' && plus) {
        return allies.flatMap((target) => allies
          .filter((secondary) => secondary.id !== target.id)
          .map((secondary) => make({
            targetId: target.id, secondaryTargetId: secondary.id,
          })));
      }
      return allies.map((stack) => make({ targetId: stack.id }));
    }
    if (resolvedSpellId === 'trial') {
      const largestOwn = Math.max(...battle.stacks.filter((stack) =>
        stack.side === side && stack.count > 0).map((stack) => stack.count));
      return battle.stacks.filter((stack) => stack.side !== side && stack.count > largestOwn
        && !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
        .map((stack) => make({ targetId: stack.id }));
    }
    if (ENEMY_TARGETS.has(resolvedSpellId)) {
      return battle.stacks.filter((stack) => stack.side !== side && stack.count > 0
        && !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
        .map((stack) => make({ targetId: stack.id }));
    }
    if (definition.kind === 'enchantment' && battle.enchantments[side].length >= 2) {
      return battle.enchantments[side].map((_, replaceEnchantment) =>
        make({ replaceEnchantment }));
    }
    return [make({})];
  };
  return hero.knownSpells.filter((id) => canBeginSpellCast(battle, id)).flatMap((spellId) => {
    if (spellId === 'echo') {
      const last = battle.lastSpellCast;
      if (!last || last.spellId === 'echo') return [];
      return enumerate(spellId, last.spellId,
        isUpgraded(battle, hero, spellId) ? true : last.plus);
    }
    return enumerate(spellId, spellId, isUpgraded(battle, hero, spellId)
      || (SPELLS[spellId].kind === 'twister' && skillRank(hero, 'twicetold') >= 2));
  });
}

function addEnchantment(
  battle: BattleState,
  side: BattleSide,
  spellId: SpellId,
  upgraded: boolean,
  replace?: number,
): void {
  const row = battle.enchantments[side];
  const effect = {
    id: `${spellId}-${side}-${battle.round}`, spellId, side,
    multiplier: 1, upgraded,
  };
  if (row.length < 2) row.push(effect);
  else row.splice(replace ?? 0, 1, effect);
}

function spellDamage(battle: BattleState, stack: BattleStack, percent: number): void {
  if (stack.count <= 0) return;
  const wasAlive = stack.count > 0;
  const damage = Math.max(1, Math.ceil(totalStackHp(stack) * percent / 100));
  const kills = applyDamage(stack, damage);
  battle.casualties[stack.side][stack.unitId] =
    (battle.casualties[stack.side][stack.unitId] ?? 0) + kills;
  if (wasAlive && stack.count === 0) battle.destroyedStacks += 1;
}

function castRite(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): void {
  const target = stackById(battle, action.targetId);
  const sp = hero.spellPower;
  if (action.spellId === 'rally') {
    [target, plus ? stackById(battle, action.secondaryTargetId) : undefined]
      .filter(Boolean).forEach((stack) => grantMeter(stack!, 50));
  } else if (action.spellId === 'blessing') {
    addTimedEffect(target!, 'blessing', 99, 1, true, side);
    if (plus) grantMeter(target!, 10);
  } else if (action.spellId === 'standardOfDawn') {
    addEnchantment(battle, side, action.spellId, plus, action.replaceEnchantment);
  } else if (action.spellId === 'amplify') {
    applyEffectTwister(battle, side, action, 'amplify', plus);
  } else if (action.spellId === 'sanctuary') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), 1, true, side);
    if (plus) clearCounters(target!, battle);
  } else if (action.spellId === 'oathOfIron') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), plus ? 2 : 1, true, side);
  } else if (action.spellId === 'consecrate') {
    const removed = clearCounters(target!, battle);
    healWithoutResurrection(target!, scaledPercent(plus ? 15 : 8, sp));
    if (plus) grantMeter(target!, removed * 5);
  } else if (action.spellId === 'hymnOfTheHost') {
    const amount = Math.ceil(battle.extraActions[side] * 8 * (plus ? 1.5 : 1));
    battle.stacks.filter((stack) => stack.side === side && stack.count > 0)
      .forEach((stack) => grantMeter(stack, amount));
  } else if (action.spellId === 'trial') {
    const largestOwn = Math.max(...battle.stacks.filter((stack) =>
      stack.side === side && stack.count > 0).map((stack) => stack.count));
    if (!target || target.side === side || target.count <= largestOwn) throw new Error('Illegal Trial target');
    spellDamage(battle, target, scaledPercent(plus ? 35 : 25, sp));
  }
}

function castCraft(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): void {
  const target = stackById(battle, action.targetId);
  const sp = hero.spellPower;
  if (action.spellId === 'forgeSpark') {
    addBattleCounter(battle, target!, 'burn', scaledCounter(plus ? 4 : 3, sp), side);
    if (plus) battle.stacks.filter((stack) =>
      stack.side === target!.side && stacksAdjacent(stack, target!))
      .forEach((stack) => addBattleCounter(battle, stack, 'burn', 1, side));
  } else if (action.spellId === 'ward') {
    addTimedEffect(target!, action.spellId, 99, plus ? 2 : 1, true, side);
  } else if (action.spellId === 'reflect') {
    applyEffectTwister(battle, side, action, 'reflect', plus);
  } else if (action.spellId === 'forgefire' || action.spellId === 'ironclad') {
    addEnchantment(battle, side, action.spellId, plus, action.replaceEnchantment);
  } else if (action.spellId === 'clockworkEscort') {
    const unitId = plus ? 'marionette' : 'tinSoldier';
    const count = (plus ? 2 : 5) * (sp + 1);
    const used = occupiedByStacks(battle.stacks);
    const x = side === 'attacker' ? 0 : 13 - UNITS[unitId].hexSize;
    const y = Array.from({ length: 9 }, (_, index) => index)
      .find((row) => !used.has(`${x},${row}`));
    if (y === undefined) throw new Error('No summon hex');
    battle.stacks.push({
      id: `summon-${side}-${battle.round}`, side, slot: 7, unitId, count,
      topHp: UNITS[unitId].hp, position: { x, y }, shots: 0, morale: 0,
      retaliated: false, defended: false, waited: false, bonusActions: 0,
      attacksMade: 0, movedHexes: 0, overwindPrimed: false, overwindUsed: false,
      skipRound: null, summoned: true,
      counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [],
    });
  } else if (action.spellId === 'wallOfTheMaker') {
    const expected = 3 + artifactEffectTotal(hero, 'extra_wall');
    if (action.positions?.length !== expected) {
      throw new Error(`Choose ${expected} wall hexes`);
    }
    const occupied = [
      ...[...occupiedByStacks(battle.stacks)].map((key) => {
        const [x, y] = key.split(',').map(Number); return { x, y };
      }),
      ...battle.obstacles,
      ...battle.tiles.map((tile) => tile.position),
    ];
    if (action.positions.some((position, index) =>
      occupied.some((coord) => coord.x === position.x && coord.y === position.y)
      || action.positions!.some((other, otherIndex) =>
        otherIndex !== index && other.x === position.x && other.y === position.y))) {
      throw new Error('Wall tiles require distinct empty hexes');
    }
    for (const position of action.positions) {
      if (skillRank(hero, 'siegewright') >= 2) {
        battle.stacks.push({
          id: `maker-wall-${side}-${battle.round}-${battle.stacks.length}`,
          side, slot: 50 + battle.stacks.length, unitId: 'makerWall', count: 1,
          topHp: 40, position: { ...position }, shots: 0, morale: 0,
          retaliated: false, defended: false, waited: false, bonusActions: 0,
          attacksMade: 0, movedHexes: 0, overwindPrimed: false, overwindUsed: false,
          skipRound: null, summoned: true,
          counters: { burn: 0, chill: 0, hex: 0, bloom: 0 },
          effects: plus ? [{
            id: `heated-maker-wall-${battle.round}-${battle.stacks.length}`,
            spellId: 'wallOfTheMaker', duration: 99, magnitude: 2,
            beneficial: true, sourceSide: side,
          }] : [],
          abilityUses: {}, countAtTurnStart: 1, temporaryAbilities: [],
        });
      } else {
        placeBattleTile(
          battle,
          createBattleTile(battle, 'wall', position, -1, side, plus),
        );
      }
    }
  } else if (action.spellId === 'quicksilver') {
    addTimedEffect(target!, action.spellId, plus ? 99 : scaledDuration(2, sp), 3, true, side);
  } else if (action.spellId === 'unmake') {
    applyEffectTwister(battle, side, action, 'unmake', plus);
    if (plus && target) clearCounters(target, battle);
  }
}

function castGrave(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean, manaSpent: number,
): void {
  const target = stackById(battle, action.targetId);
  const sp = hero.spellPower;
  if (action.spellId === 'wither') {
    addBattleCounter(battle, target!, 'hex', scaledCounter(plus ? 8 : 6, sp), side);
    if (plus) addBattleCounter(battle, target!, 'chill', scaledCounter(2, sp), side);
  } else if (action.spellId === 'graveChill') {
    addBattleCounter(battle, target!, 'chill', scaledCounter(3, sp), side);
    if (plus) target!.morale = Math.max(0, target!.morale - 20);
  } else if (action.spellId === 'mournersVeil') {
    const effect = addTimedEffect(
      target!, action.spellId, scaledDuration(plus ? 3 : 2, sp), 20, true, side,
    );
    if (plus) effect.id += ':plus';
  } else if (action.spellId === 'dirge') {
    const multiplier = specialtyHandler(hero).dirgeMultiplier?.() ?? 1;
    spellDamage(battle, target!, scaledPercent(plus ? 5 : 3, sp)
      * battle.destroyedStacks * multiplier);
  } else if (action.spellId === 'lastCandle') {
    addEnchantment(battle, side, action.spellId, plus, action.replaceEnchantment);
  } else if (action.spellId === 'sour') {
    applyEffectTwister(battle, side, action, 'sour', plus);
  } else if (action.spellId === 'remembrance') {
    if (!target || target.side !== side || target.summoned) throw new Error('Illegal Remembrance target');
    const initial = battle.initialCounts[target.id] ?? 0;
    const losses = Math.max(0, initial - target.count);
    const revive = Math.min(losses, Math.ceil(losses * scaledPercent(plus ? 35 : 20, sp) / 100));
    target.count += revive;
    if (target.count > 0 && target.topHp === 0) target.topHp = stackUnitHp(target);
  } else if (action.spellId === 'reckoning') {
    for (const stack of battle.stacks.filter((item) => item.count > 0)) {
      const percent = Math.min(60, manaSpent * scaledPercent(2, sp))
        * (plus && stack.side === side ? 0.5 : 1);
      spellDamage(battle, stack, percent);
    }
  } else if (action.spellId === 'quiet') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), 1, false, side);
    if (plus) addBattleCounter(battle, target!, 'chill', scaledCounter(2, sp), side);
  }
}

function resolveSpellFace(
  battle: BattleState,
  side: BattleSide,
  hero: BattleHero,
  action: CastAction,
  plus: boolean,
  manaSpent: number,
): void {
  const target = stackById(battle, action.targetId);
  if (!isSpellTargetLegal(battle, action)) throw new Error('Invalid active effect target');
  if (ALLY_TARGETS.has(action.spellId)
      && (!target || target.side !== side)) throw new Error('An allied target is required');
  if (ENEMY_TARGETS.has(action.spellId)
      && (!target || target.side === side)) throw new Error('An enemy target is required');
  if (target && target.side !== side && target.effects.some(
    (effect) => effect.spellId === 'sanctuary',
  )) throw new Error('Target is protected by Sanctuary');
  const definition = SPELLS[action.spellId];
  if (resolveExpansionCombatSpell(battle, side, hero, action, plus)) return;
  if (action.spellId === 'echo') {
    const last = battle.lastSpellCast;
    if (!last || last.spellId === 'echo') throw new Error('There is no spell to Echo');
    resolveSpellFace(
      battle, side, hero, { ...action, spellId: last.spellId },
      plus ? true : last.plus, last.manaSpent,
    );
    return;
  }
  if (definition.school === 'rite') castRite(battle, side, hero, action, plus);
  else if (definition.school === 'craft') castCraft(battle, side, hero, action, plus);
  else castGrave(battle, side, hero, action, plus, manaSpent);
}

export function castStoredSpell(
  battle: BattleState,
  side: BattleSide,
  action: CastAction,
  plus: boolean,
  recordAsLastSpell = true,
  manaSpent = 0,
): void {
  const hero = heroFor(battle, side);
  if (!hero) throw new Error('This side has no hero');
  resolveSpellFace(battle, side, hero, action, plus, manaSpent);
  if (recordAsLastSpell) {
    battle.lastSpellCast = { spellId: action.spellId, plus, manaSpent };
  }
  battle.spellCasts += 1;
  battle.spellCastsBySide[side] = (battle.spellCastsBySide[side] ?? 0) + 1;
}

export function castSpell(battle: BattleState, action: CastAction): void {
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || !canBeginSpellCast(battle, action.spellId)) {
    throw new Error('Spell cannot be cast now');
  }
  const definition = SPELLS[action.spellId];
  if (!isSpellTargetLegal(battle, action)) return;
  const manaSpent = spellManaCost(battle, side, hero, action.spellId);
  const twister = definition.kind === 'twister';
  const freeTwister = twister && skillRank(hero, 'twicetold') >= 1
    && !battle.twisterFreeUsed[side];
  const plus = isUpgraded(battle, hero, action.spellId)
    || (twister && skillRank(hero, 'twicetold') >= 2);
  resolveSpellFace(battle, side, hero, action, plus, manaSpent);
  const wasSecondHourglassCast = battle.castRound[side] === battle.round;
  const mirrorSide = enemySide(side);
  const mirror = battle.stacks.find((stack) => stack.side === mirrorSide
    && stack.count > 0 && stackHasAbility(stack, 'mirror_hex'));
  const mirrorHero = heroFor(battle, mirrorSide);
  const artifactMirror = Boolean(mirrorHero && !battle.mirrorArtifactUsed[mirrorSide]
    && hasEquippedArtifact(mirrorHero, 'mirrorshardPendant'));
  if ((mirror || artifactMirror) && mirrorHero && action.spellId !== 'standingMirror'
      && action.spellId !== 'echo' && !definition.effectOperation) {
    const originalTarget = stackById(battle, action.targetId);
    const mirroredTarget = originalTarget
      ? battle.stacks.find((stack) => stack.count > 0
        && stack.side === (originalTarget.side === side ? mirrorSide : side))
      : undefined;
    const mirroredAction: CastAction = {
      ...action, targetId: mirroredTarget?.id, secondaryTargetId: undefined,
      replaceEnchantment: 0,
    };
    try {
      resolveSpellFace(battle, mirrorSide, mirrorHero, mirroredAction, plus, manaSpent);
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} copies ${definition.name}.`);
    } catch {
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} finds no legal reflection for ${definition.name}.`);
    }
    if (artifactMirror) {
      battle.mirrorArtifactUsed[mirrorSide] = true;
    }
  }
  hero.mana -= manaSpent;
  battle.firstSpellTaxPaid[side] = true;
  if (freeTwister) battle.twisterFreeUsed[side] = true;
  if (wasSecondHourglassCast) battle.doubleCastUsedRound[side] = battle.round;
  if (twister && skillRank(hero, 'twicetold') >= 3
      && !battle.twisterActSaved[side]) {
    battle.twisterActSaved[side] = true;
  } else {
    battle.castRound[side] = battle.round;
  }
  battle.spellCasts += 1;
  battle.spellCastsBySide[side] = (battle.spellCastsBySide[side] ?? 0) + 1;
  battle.spellsCastAgainst[enemySide(side)].push(action.spellId);
  battle.lastSpellCast = { spellId: action.spellId, plus, manaSpent };
  battle.log.push(`${definition.name}${plus ? '+' : ''} cast for ${manaSpent} mana.`);
}
