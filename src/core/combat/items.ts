import { ITEMS } from '../../content/items';
import { SPELLS } from '../../content/spells';
import type {
  Action, BattleHero, BattleSide, BattleState, SpellId,
} from '../types';
import {
  addBattleCounter, addTimedEffect, clearCounters, grantMeter,
} from './magicEffects';
import { stackUnitHp } from './damage';
import { UNITS } from '../../content/units';
import { legalTwistEffectIds } from './spellTargets';
import { castStoredSpell } from './spells';
import { skillRank } from '../heroBehaviors';
import { occupiedByStacks, stacksAdjacent } from './footprint';

type UseItem = Extract<Action, { type: 'BATTLE_USE_ITEM' }>;
type Cast = Extract<Action, { type: 'BATTLE_CAST' }>;

const ALLY_SPELLS = new Set<SpellId>([
  'rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
  'ward', 'quicksilver', 'mournersVeil', 'remembrance',
  'clarion', 'bloom', 'shedSkin', 'loyalUntoDeath',
]);
const ENEMY_SPELLS = new Set<SpellId>([
  'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge', 'quiet',
  'oathbind', 'brittle', 'gale',
]);

function openPositions(battle: BattleState, count: number): Array<{ x: number; y: number }> {
  const occupied = new Set([
    ...occupiedByStacks(battle.stacks),
    ...battle.obstacles.map((coord) => `${coord.x},${coord.y}`),
    ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
  ]);
  return Array.from({ length: 9 }, (_, y) => ({ x: 6, y }))
    .filter((position) => !occupied.has(`${position.x},${position.y}`)).slice(0, count);
}

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
  if (spellId === 'wallOfTheMaker' || spellId === 'thicket') {
    return [make({ positions: openPositions(battle, 3) })];
  }
  if (spellId === 'borrowShape') {
    return battle.stacks.filter((target) => target.side === side && target.count > 0)
      .flatMap((target) => battle.stacks.filter((source) => source.side !== side
        && source.count > 0 && (plus || stacksAdjacent(target, source))).map((source) => make({
        targetId: target.id, secondaryTargetId: source.id,
      })));
  }
  if (spellId === 'hourglassCrack') {
    return battle.stacks.filter((stack) => stack.count > 0)
      .map((stack) => make({ targetId: stack.id }));
  }
  return [make({ replaceEnchantment: 0 })];
}

export function canUseCombatItem(battle: BattleState, inventorySlot: number): boolean {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  const item = hero?.inventory[inventorySlot];
  const alchemistFree = Boolean(hero && side
    && skillRank(hero, 'alchemist') >= 1 && battle.itemUses[side] === 0);
  return Boolean(side && hero
    && (battle.castRound[side] !== battle.round || alchemistFree)
    && item && typeof item !== 'string' && ITEMS[item.id].use === 'combat');
}

export function legalCombatItemUses(battle: BattleState): UseItem[] {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero) return [];
  if (battle.castRound[side] === battle.round
      && !(skillRank(hero, 'alchemist') >= 1 && battle.itemUses[side] === 0)) return [];
  return hero.inventory.flatMap((item, inventorySlot): UseItem[] => {
    if (!item || typeof item === 'string') return [];
    const definition = ITEMS[item.id];
    if (definition.use !== 'combat') return [];
    if (definition.behavior === 'scroll') {
      const storedId = definition.spellId ?? item.storedSpellId as SpellId | undefined;
      return storedId
        ? actionsForSpell(battle, side, inventorySlot, storedId, Boolean(item.plus)) : [];
    }
    if (definition.behavior === 'echo') {
      const last = battle.lastSpellCast;
      return last
        ? actionsForSpell(battle, side, inventorySlot, last.spellId, last.plus) : [];
    }
    if (definition.target === 'global') {
      return [{ type: 'BATTLE_USE_ITEM', inventorySlot }];
    }
    if (definition.target === 'enchantment') {
      return (['attacker', 'defender'] as const).flatMap((targetSide) =>
        battle.enchantments[targetSide].map((effect) => ({
          type: 'BATTLE_USE_ITEM' as const, inventorySlot, effectId: effect.id,
        })));
    }
    if (definition.target === 'positions') {
      return [{ type: 'BATTLE_USE_ITEM', inventorySlot }];
    }
    const validTargets = battle.stacks.filter((stack) => stack.count > 0
      && (definition.target === 'enemy' ? stack.side !== side : stack.side === side));
    return validTargets.map((stack, index) => ({
      type: 'BATTLE_USE_ITEM', inventorySlot, targetId: stack.id,
      secondaryTargetId: skillRank(hero, 'alchemist') === 3
        ? validTargets[index + 1]?.id ?? validTargets[index - 1]?.id : undefined,
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
  const targets = [action.targetId, action.secondaryTargetId]
    .filter((id): id is string => Boolean(id))
    .map((id) => battle.stacks.find((stack) => stack.id === id))
    .filter((stack): stack is NonNullable<typeof stack> => Boolean(stack));
  if (definition.behavior === 'scroll') {
    const storedId = definition.spellId ?? item.storedSpellId as SpellId | undefined;
    if (!storedId) throw new Error('This scroll has no stored spell');
    castStoredSpell(
      battle, side, castAction(action, storedId), Boolean(item.plus),
    );
  } else if (definition.behavior === 'echo') {
    if (!battle.lastSpellCast) throw new Error('No spell has been cast this battle');
    const last = { ...battle.lastSpellCast };
    castStoredSpell(
      battle, side, castAction(action, last.spellId), last.plus, false, last.manaSpent,
    );
  } else {
    const valid = targets.slice(0, skillRank(hero, 'alchemist') === 3 ? 2 : 1);
    if (!valid.length && !['banner', 'walls', 'seal', 'unmakeEnchantment'].includes(
      definition.behavior,
    )) {
      throw new Error('A target is required');
    }
    if (valid.some((target) => target.count <= 0
      || (definition.target === 'enemy' ? target.side === side : target.side !== side))) {
      throw new Error('The item target is invalid');
    }
    if (definition.behavior === 'vigor') {
      valid.forEach((target) => grantMeter(target, definition.amount ?? 0));
    } else if (definition.behavior === 'iron') {
      valid.forEach((target) => addTimedEffect(
        target, 'oathOfIron', definition.duration ?? 2, 1, true, side,
      ));
    } else if (definition.behavior === 'cleanse') {
      valid.forEach((target) => clearCounters(target, battle));
    } else if (definition.behavior === 'speed') {
      valid.forEach((target) => addTimedEffect(
        target, 'quicksilver', definition.duration ?? 2,
        definition.amount ?? 3, true, side,
      ));
    } else if (definition.behavior === 'burnWeapon') {
      valid.forEach((target) => addTimedEffect(
        target, 'forgeSpark', definition.duration ?? 3, 1, true, side,
      ));
    } else if (definition.behavior === 'enemyHex') {
      valid.forEach((target) => addBattleCounter(
        battle, target, 'hex', definition.amount ?? 3, side,
      ));
    } else if (definition.behavior === 'hornet') {
      valid.forEach((target) => {
        addTimedEffect(target, 'quiet', definition.duration ?? 1, 1, false, side);
        addBattleCounter(battle, target, 'chill', 1, side);
      });
    } else if (definition.behavior === 'disable') {
      valid.forEach((target) => addTimedEffect(
        target, 'brittle', definition.duration ?? 2, 1, false, side,
      ));
    } else if (definition.behavior === 'walls') {
      castStoredSpell(battle, side, castAction(action, 'wallOfTheMaker'), false);
    } else if (definition.behavior === 'seal') {
      if (!action.effectId) throw new Error('Choose an enchantment to seal');
      battle.sealedEnchantments.push(action.effectId);
    } else if (definition.behavior === 'unmakeEnchantment') {
      if (!action.effectId || battle.sealedEnchantments.includes(action.effectId)) {
        throw new Error('That enchantment cannot be unmade');
      }
      for (const targetSide of ['attacker', 'defender'] as const) {
        battle.enchantments[targetSide] = battle.enchantments[targetSide]
          .filter((effect) => effect.id !== action.effectId);
      }
    } else if (definition.behavior === 'banner') {
      battle.stacks.filter((stack) => stack.side === side && stack.count > 0)
        .forEach((stack) => grantMeter(stack, definition.amount ?? 10));
    } else if (definition.behavior === 'revive') {
      valid.forEach((target) => {
        const losses = Math.max(0, (battle.initialCounts[target.id] ?? target.count) - target.count);
        const restored = Math.ceil(losses * (definition.amount ?? 10) / 100);
        target.count += Math.min(losses, restored);
        if (target.count > 0 && target.topHp === 0) target.topHp = stackUnitHp(target);
      });
    }
    else throw new Error('Item is not usable in combat');
  }
  const firstUse = battle.itemUses[side] === 0;
  battle.itemUses[side] += 1;
  if (skillRank(hero, 'alchemist') >= 2 && !battle.itemPreserved[side]) {
    battle.itemPreserved[side] = true;
  } else {
    hero.inventory[action.inventorySlot] = null;
  }
  if (firstUse && skillRank(hero, 'alchemist') >= 1) {
    battle.itemFreeActUsed[side] = true;
  } else {
    battle.castRound[side] = battle.round;
  }
  battle.log.push(`${definition.name} used.`);
}
