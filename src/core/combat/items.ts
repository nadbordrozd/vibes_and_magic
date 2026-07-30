import { ITEMS } from '../../content/items';
import { SPELLS } from '../../content/spells';
import type {
  Action, BattleHero, BattleSide, BattleState, SpellId,
} from '../types';
import {
  addTimedEffect, clearCounters, grantMeter,
} from './magicEffects';
import { legalTwistEffectIds } from './spellTargets';
import { castStoredSpell } from './spells';

type UseItem = Extract<Action, { type: 'BATTLE_USE_ITEM' }>;
type Cast = Extract<Action, { type: 'BATTLE_CAST' }>;

const ALLY_SPELLS = new Set<SpellId>([
  'rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
  'ward', 'quicksilver', 'mournersVeil', 'remembrance',
]);
const ENEMY_SPELLS = new Set<SpellId>([
  'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge', 'quiet',
]);

function actingSide(battle: BattleState): BattleSide | null {
  return battle.stacks.find((stack) => stack.id === battle.currentStackId)?.side ?? null;
}

function heroFor(battle: BattleState, side: BattleSide): BattleHero | null {
  return side === 'attacker' ? battle.attackerHero : battle.defenderHero;
}

function castAction(action: UseItem, spellId: SpellId): Cast {
  return {
    type: 'BATTLE_CAST', spellId,
    targetId: action.targetId, secondaryTargetId: action.secondaryTargetId,
    effectId: action.effectId, positions: action.positions,
    replaceEnchantment: action.replaceEnchantment,
  };
}

function actionsForSpell(
  battle: BattleState,
  side: BattleSide,
  inventorySlot: number,
  spellId: SpellId,
  plus: boolean,
): UseItem[] {
  const make = (cast: Omit<UseItem, 'type' | 'inventorySlot'>): UseItem => ({
    type: 'BATTLE_USE_ITEM', inventorySlot, ...cast,
  });
  if (SPELLS[spellId].effectOperation) {
    return legalTwistEffectIds(battle, spellId).flatMap((effectId) => {
      if (spellId !== 'reflect') return [make({ effectId })];
      const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0);
      return allies.map((target, index) => make({
        effectId, targetId: target.id,
        secondaryTargetId: plus ? allies[index + 1]?.id : undefined,
      }));
    });
  }
  if (ALLY_SPELLS.has(spellId)) {
    const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0);
    return allies.map((target, index) => make({
      targetId: target.id,
      secondaryTargetId: spellId === 'rally' && plus
        ? allies[index + 1]?.id ?? allies[index - 1]?.id : undefined,
    }));
  }
  if (ENEMY_SPELLS.has(spellId)) {
    return battle.stacks.filter((stack) => stack.side !== side && stack.count > 0
      && !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
      .map((target) => make({ targetId: target.id }));
  }
  if (spellId === 'wallOfTheMaker') return [];
  return [make({ replaceEnchantment: 0 })];
}

export function canUseCombatItem(battle: BattleState, inventorySlot: number): boolean {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  const item = hero?.inventory[inventorySlot];
  return Boolean(side && hero && battle.castRound[side] !== battle.round
    && item && typeof item !== 'string' && ITEMS[item.id].use === 'combat');
}

export function legalCombatItemUses(battle: BattleState): UseItem[] {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || battle.castRound[side] === battle.round) return [];
  return hero.inventory.flatMap((item, inventorySlot): UseItem[] => {
    if (!item || typeof item === 'string') return [];
    const definition = ITEMS[item.id];
    if (definition.use !== 'combat') return [];
    if (definition.behavior === 'scroll') {
      return actionsForSpell(battle, side, inventorySlot, definition.spellId!, Boolean(item.plus));
    }
    if (definition.behavior === 'echo') {
      const last = battle.lastSpellCast;
      return last
        ? actionsForSpell(battle, side, inventorySlot, last.spellId, last.plus) : [];
    }
    return battle.stacks.filter((stack) => stack.side === side && stack.count > 0)
      .map((stack) => ({
        type: 'BATTLE_USE_ITEM', inventorySlot, targetId: stack.id,
      }));
  });
}

export function useCombatItem(battle: BattleState, action: UseItem): void {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || !canUseCombatItem(battle, action.inventorySlot)) {
    throw new Error('Item cannot be used now');
  }
  const item = hero.inventory[action.inventorySlot];
  if (!item || typeof item === 'string') throw new Error('Unknown combat item');
  const definition = ITEMS[item.id];
  const target = battle.stacks.find((stack) => stack.id === action.targetId);
  if (definition.behavior === 'scroll') {
    castStoredSpell(
      battle, side, castAction(action, definition.spellId!), Boolean(item.plus),
    );
  } else if (definition.behavior === 'echo') {
    if (!battle.lastSpellCast) throw new Error('No spell has been cast this battle');
    const last = { ...battle.lastSpellCast };
    castStoredSpell(
      battle, side, castAction(action, last.spellId), last.plus, false, last.manaSpent,
    );
  } else {
    if (!target || target.side !== side || target.count <= 0) {
      throw new Error('An allied target is required');
    }
    if (definition.behavior === 'vigor') grantMeter(target, definition.amount ?? 0);
    else if (definition.behavior === 'iron') {
      addTimedEffect(
        target, 'oathOfIron', definition.duration ?? 2, 1, true, side,
      );
    } else if (definition.behavior === 'cleanse') clearCounters(target);
    else throw new Error('Item is not usable in combat');
  }
  hero.inventory[action.inventorySlot] = null;
  battle.castRound[side] = battle.round;
  battle.log.push(`${definition.name} used.`);
}
