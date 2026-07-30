import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import type {
  Action, BattleHero, BattleSide, BattleStack, BattleState, CounterId,
  SpellId,
} from '../types';
import { applyDamage } from './damage';
import { isAdjacent } from './hex';
import {
  addCounter, addTimedEffect, clearCounters, healWithoutResurrection,
  grantMeter, scaledCounter, scaledDuration, scaledPercent, totalStackHp,
} from './magicEffects';
import { specialtyHandler } from '../heroBehaviors';
import {
  isSpellTargetLegal, legalTwistEffectIds,
} from './spellTargets';

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
]);
const ENEMY_TARGETS = new Set<SpellId>([
  'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge', 'quiet',
]);

export function isUpgraded(
  battle: BattleState,
  hero: BattleHero,
  spellId: SpellId,
): boolean {
  return hero.upgradedSpells.includes(spellId)
    || specialtyHandler(hero).spellAlwaysUpgraded?.(spellId) === true
    || battle.resonance === SPELLS[spellId].school;
}

export function canBeginSpellCast(battle: BattleState, spellId: SpellId): boolean {
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || battle.castRound[side] === battle.round
      || !hero.knownSpells.includes(spellId)) return false;
  const definition = SPELLS[spellId];
  return definition.mana === 'X' ? hero.mana > 0 : hero.mana >= definition.mana;
}

export function canCastSpell(battle: BattleState, spellId: SpellId): boolean {
  const definition = SPELLS[spellId];
  return canBeginSpellCast(battle, spellId) && (!definition.effectOperation
    || legalTwistEffectIds(battle, spellId).length > 0);
}

export function legalSpellCasts(battle: BattleState): CastAction[] {
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!hero || !side) return [];
  return hero.knownSpells.filter((id) => canCastSpell(battle, id)).flatMap((spellId) => {
    if (SPELLS[spellId].effectOperation) {
      return legalTwistEffectIds(battle, spellId).map((effectId): CastAction => ({
        type: 'BATTLE_CAST', spellId, effectId,
      }));
    }
    if (ALLY_TARGETS.has(spellId)) {
      return battle.stacks.filter((stack) => stack.side === side && stack.count > 0)
        .map((stack): CastAction => ({
          type: 'BATTLE_CAST', spellId, targetId: stack.id,
        }));
    }
    if (ENEMY_TARGETS.has(spellId)) {
      return battle.stacks.filter((stack) => stack.side !== side && stack.count > 0
        && !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
        .map((stack): CastAction => ({
          type: 'BATTLE_CAST', spellId, targetId: stack.id,
        }));
    }
    return [{ type: 'BATTLE_CAST', spellId }];
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

function applyEffectTwister(
  battle: BattleState,
  side: BattleSide,
  action: CastAction,
  mode: 'amplify' | 'sour' | 'unmake' | 'reflect',
  upgraded: boolean,
): void {
  const parts = action.effectId?.split(':') ?? [];
  if (parts[0] === 'counter') {
    const source = stackById(battle, parts[1]);
    const counter = parts[2] as CounterId;
    if (!source || !counter) throw new Error('Invalid counter effect target');
    if (mode === 'amplify') {
      source.counters[counter] = Math.min(9, source.counters[counter] * 2 + (upgraded ? 1 : 0));
    } else if (mode === 'sour' && counter === 'bloom') {
      const amount = source.counters.bloom;
      source.counters.bloom = 0;
      addCounter(source, 'hex', amount);
    } else if (mode === 'unmake') {
      clearCounters(source);
    } else if (mode === 'reflect') {
      const targets = [action.targetId, action.secondaryTargetId]
        .filter(Boolean).slice(0, upgraded ? 2 : 1);
      for (const id of targets) addCounter(stackById(battle, id)!, counter, source.counters[counter]);
    } else throw new Error('Effect cannot be twisted');
    return;
  }
  if (parts[0] === 'timed') {
    const source = stackById(battle, parts[1]);
    const effect = source?.effects.find((item) => item.id === parts.slice(2).join(':'));
    if (!source || !effect) throw new Error('Invalid timed effect target');
    if (mode === 'amplify') {
      effect.magnitude *= 2;
      if (upgraded) effect.duration += 1;
    } else if (mode === 'sour' && effect.beneficial) {
      source.effects = source.effects.filter((item) => item.id !== effect.id);
      addCounter(source, 'hex', 2);
    } else if (mode === 'reflect') {
      for (const id of [action.targetId, action.secondaryTargetId]
        .filter(Boolean).slice(0, upgraded ? 2 : 1)) {
        const target = stackById(battle, id)!;
        target.effects.push({ ...effect, id: `${effect.id}-${target.id}` });
      }
    } else throw new Error('Effect cannot be twisted');
    return;
  }
  if (parts[0] === 'enchantment') {
    const targetSide = parts[1] as BattleSide;
    const row = battle.enchantments[targetSide];
    const index = row.findIndex((item) => item.id === parts.slice(2).join(':'));
    if (index < 0) throw new Error('Invalid enchantment target');
    if (mode === 'amplify') row[index].multiplier *= 2;
    else if (mode === 'sour' || mode === 'unmake') {
      row.splice(index, 1);
      if (mode === 'sour' && upgraded) {
        battle.stacks.filter((stack) => stack.side === enemySide(side) && stack.count > 0)
          .forEach((stack) => addCounter(stack, 'hex', 3));
      }
    } else throw new Error('Enchantment cannot be reflected');
    return;
  }
  throw new Error('An active effect target is required');
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
    if (plus) clearCounters(target!);
  } else if (action.spellId === 'oathOfIron') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), plus ? 2 : 1, true, side);
  } else if (action.spellId === 'consecrate') {
    const removed = clearCounters(target!);
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
    addCounter(target!, 'burn', scaledCounter(plus ? 4 : 3, sp));
    if (plus) battle.stacks.filter((stack) =>
      stack.side === target!.side && isAdjacent(stack.position, target!.position))
      .forEach((stack) => addCounter(stack, 'burn', 1));
  } else if (action.spellId === 'ward') {
    addTimedEffect(target!, action.spellId, 99, plus ? 2 : 1, true, side);
  } else if (action.spellId === 'reflect') {
    applyEffectTwister(battle, side, action, 'reflect', plus);
  } else if (action.spellId === 'forgefire' || action.spellId === 'ironclad') {
    addEnchantment(battle, side, action.spellId, plus, action.replaceEnchantment);
  } else if (action.spellId === 'clockworkEscort') {
    const unitId = plus ? 'marionette' : 'tinSoldier';
    const count = (plus ? 2 : 5) * (sp + 1);
    const used = new Set(battle.stacks.map((stack) => `${stack.position.x},${stack.position.y}`));
    const x = side === 'attacker' ? 0 : 12;
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
    if (action.positions?.length !== 3) throw new Error('Choose three wall hexes');
    battle.spellWalls.push(...action.positions.map((position) => ({ ...position })));
    if (plus) addEnchantment(battle, side, action.spellId, true);
  } else if (action.spellId === 'quicksilver') {
    addTimedEffect(target!, action.spellId, plus ? 99 : scaledDuration(2, sp), 3, true, side);
  } else if (action.spellId === 'unmake') {
    applyEffectTwister(battle, side, action, 'unmake', plus);
    if (plus && target) clearCounters(target);
  }
}

function castGrave(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean, manaSpent: number,
): void {
  const target = stackById(battle, action.targetId);
  const sp = hero.spellPower;
  if (action.spellId === 'wither') {
    addCounter(target!, 'hex', scaledCounter(plus ? 8 : 6, sp));
    if (plus) addCounter(target!, 'chill', scaledCounter(2, sp));
  } else if (action.spellId === 'graveChill') {
    addCounter(target!, 'chill', scaledCounter(3, sp));
    if (plus) target!.morale = Math.max(0, target!.morale - 20);
  } else if (action.spellId === 'mournersVeil') {
    const effect = addTimedEffect(
      target!, action.spellId, scaledDuration(plus ? 3 : 2, sp), 20, true, side,
    );
    if (plus) effect.id += ':plus';
  } else if (action.spellId === 'dirge') {
    spellDamage(battle, target!, scaledPercent(plus ? 5 : 3, sp) * battle.destroyedStacks);
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
    if (target.count > 0 && target.topHp === 0) target.topHp = UNITS[target.unitId].hp;
  } else if (action.spellId === 'reckoning') {
    for (const stack of battle.stacks.filter((item) => item.count > 0)) {
      const percent = Math.min(60, manaSpent * scaledPercent(2, sp))
        * (plus && stack.side === side ? 0.5 : 1);
      spellDamage(battle, stack, percent);
    }
  } else if (action.spellId === 'quiet') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), 1, false, side);
    if (plus) addCounter(target!, 'chill', scaledCounter(2, sp));
  }
}

export function castSpell(battle: BattleState, action: CastAction): void {
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || !canBeginSpellCast(battle, action.spellId)) {
    throw new Error('Spell cannot be cast now');
  }
  if (!isSpellTargetLegal(battle, action)) return;
  const definition = SPELLS[action.spellId];
  const target = stackById(battle, action.targetId);
  if (ALLY_TARGETS.has(action.spellId)
      && (!target || target.side !== side)) throw new Error('An allied target is required');
  if (ENEMY_TARGETS.has(action.spellId)
      && (!target || target.side === side)) throw new Error('An enemy target is required');
  if (target?.side !== side && target?.effects.some(
    (effect) => effect.spellId === 'sanctuary',
  )) throw new Error('Target is protected by Sanctuary');
  const manaSpent = definition.mana === 'X' ? hero.mana : definition.mana;
  const plus = isUpgraded(battle, hero, action.spellId);
  if (definition.school === 'rite') castRite(battle, side, hero, action, plus);
  else if (definition.school === 'craft') castCraft(battle, side, hero, action, plus);
  else castGrave(battle, side, hero, action, plus, manaSpent);
  hero.mana -= manaSpent;
  battle.castRound[side] = battle.round;
  battle.spellCasts += 1;
  battle.log.push(`${definition.name}${plus ? '+' : ''} cast for ${manaSpent} mana.`);
}
