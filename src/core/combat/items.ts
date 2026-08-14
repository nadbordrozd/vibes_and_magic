import { ITEMS } from '../../content/items';
import { SPELLS } from '../../content/spells';
import type {
  Action, BattleHero, BattleSide, BattleState, Coord, SpellId,
} from '../types';
import {
  addBattleCounter, addTimedEffect, clearCounters, grantMeter,
} from './magicEffects';
import { stackUnitHp } from './damage';
import { UNITS } from '../../content/units';
import { legalTwistEffectIds } from './spellTargets';
import { castStoredSpell } from './spells';
import { isP1PlacementCastLegal, legalSpellCasts } from './spells';
import { skillRank } from '../heroBehaviors';
import { stacksAdjacent } from './footprint';
import { consumeHeroAct, heroActAvailability } from './heroActs';
import { artifactEffectTotal, hasArtifactEffect } from '../artifacts';
import {
  activateGrantedCompanyAction, addManaClamped, scheduleGrantedCompanyActions, teleportCompany,
} from './primitives';
import { cloneBattle } from './battleClone';
import type { SpellSchool } from '../types';
import { BATTLE_COLS, BATTLE_ROWS } from '../../content/constants';

type UseItem = Extract<Action, { type: 'BATTLE_USE_ITEM' }>;
type Cast = Extract<Action, { type: 'BATTLE_CAST' }>;

const V2_ITEM_BEHAVIORS = new Set([
  'extraAction', 'wildfire', 'graveDustResurrection', 'upgradeSchool',
  'protectEnchantment', 'countersToBurn', 'teleportAlly', 'destructionMana',
]);

const ITEM_CHOICE_KEYS = [
  'targetId', 'secondaryTargetId', 'effectId', 'school', 'counterId',
  'replaceEnchantment', 'skipRound', 'actImmediately',
] as const;

function sameItemChoice(candidate: UseItem, action: UseItem): boolean {
  return ITEM_CHOICE_KEYS.every((key) => candidate[key] === action[key]);
}

const ALLY_SPELLS = new Set<SpellId>([
  'rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
  'ward', 'quicksilver', 'mournersVeil', 'remembrance',
  'clarion', 'bloom', 'shedSkin', 'loyalUntoDeath',
]);
const ENEMY_SPELLS = new Set<SpellId>([
  'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge', 'quiet',
  'oathbind', 'brittle', 'gale',
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
    replaceEnchantment: action.replaceEnchantment, skipRound: action.skipRound,
    actImmediately: action.actImmediately, counterId: action.counterId,
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
      if (spellId === 'reflect') {
        const targets = battle.stacks.filter((stack) => stack.count > 0);
        if (!plus) return targets.map((target) => make({ effectId, targetId: target.id }));
        return targets.flatMap((target) => targets
          .filter((secondary) => secondary.id !== target.id)
          .map((secondary) => make({
            effectId, targetId: target.id, secondaryTargetId: secondary.id,
          })));
      }
      if (spellId === 'overgrow' && plus) {
        const source = battle.stacks.find((stack) => stack.id === effectId.split(':')[1]);
        const exclusions = source ? battle.stacks.filter((stack) => stack.count > 0
          && stack.id !== source.id && stacksAdjacent(stack, source)) : [];
        return exclusions.length
          ? exclusions.map((stack) => make({ effectId, secondaryTargetId: stack.id }))
          : [make({ effectId })];
      }
      return [make({ effectId })];
    });
  }
  if (ALLY_SPELLS.has(spellId)) {
    const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0);
    if (spellId === 'rally' && plus) {
      return allies.flatMap((target) => allies
        .filter((secondary) => secondary.id !== target.id)
        .map((secondary) => make({
          targetId: target.id, secondaryTargetId: secondary.id,
        })));
    }
    return allies.map((target) => make({ targetId: target.id }));
  }
  if (ENEMY_SPELLS.has(spellId)) {
    return battle.stacks.filter((stack) => stack.side !== side && stack.count > 0
      && !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
      .map((target) => make({ targetId: target.id }));
  }
  if (spellId === 'wallOfTheMaker' || spellId === 'thicket') {
    return [make({})];
  }
  if (spellId === 'borrowShape') {
    return battle.stacks.filter((target) => target.side === side && target.count > 0)
      .flatMap((target) => battle.stacks.filter((source) => source.side !== side
        && source.count > 0 && (plus || stacksAdjacent(target, source))).map((source) => make({
        targetId: target.id, secondaryTargetId: source.id,
      })));
  }
  if (spellId === 'hourglassCrack') {
    return battle.stacks.filter((stack) => stack.count > 0).flatMap((stack) =>
      (plus ? [battle.round + 1, battle.round + 2, battle.round + 3] : [undefined])
        .map((skipRound) => make({
          targetId: stack.id, ...(skipRound === undefined ? {} : { skipRound }),
        })));
  }
  if (SPELLS[spellId].kind === 'enchantment' && battle.enchantments[side].length >= 2) {
    return battle.enchantments[side].map((_, replaceEnchantment) =>
      make({ replaceEnchantment }));
  }
  return [make({})];
}

function counterfeitSpell(battle: BattleState, side: BattleSide) {
  const enemy = side === 'attacker' ? 'defender' : 'attacker';
  const last = battle.lastHeroSpellAction[enemy];
  if (!last || last.action.spellId === 'echo') return null;
  return last;
}

function counterfeitUses(
  battle: BattleState, side: BattleSide, inventorySlot: number,
): UseItem[] {
  const last = counterfeitSpell(battle, side);
  if (!last) return [];
  return legalSpellCasts(battle, { spellId: last.action.spellId, plus: last.plus })
    .map(({ type: _type, spellId: _spellId, artifactSecondTargetId: _second, ...action }) => ({
      type: 'BATTLE_USE_ITEM', inventorySlot, ...action,
    }));
}

function counterfeitActionIsLegal(
  battle: BattleState, side: BattleSide, action: UseItem,
): boolean {
  const last = counterfeitSpell(battle, side);
  if (!last) return false;
  const legal = counterfeitUses(battle, side, action.inventorySlot);
  const cast = castAction(action, last.action.spellId);
  const placement = isP1PlacementCastLegal(battle, cast, last.plus);
  const candidateMatches = legal.some((candidate) => {
    if (!ITEM_CHOICE_KEYS.every((key) => candidate[key] === action[key])) return false;
    if (placement !== null || last.action.spellId === 'wallOfTheMaker') return true;
    return JSON.stringify(candidate.positions ?? []) === JSON.stringify(action.positions ?? []);
  });
  if (!candidateMatches || placement === false) return false;
  try {
    castStoredSpell(cloneBattle(battle), side, cast, last.plus, false, 0, false);
    return true;
  } catch {
    return false;
  }
}

/** Completes lazy item placements deterministically for auto-combat and fixture generation. */
export function completeCombatItemUse(
  battle: BattleState, action: UseItem,
): UseItem | null {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  const item = hero?.inventory[action.inventorySlot];
  if (!side || !item || typeof item === 'string') return null;
  const behavior = ITEMS[item.id].behavior;
  const positions = Array.from({ length: BATTLE_ROWS }, (_, y) =>
    Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y }))).flat();
  if (behavior === 'teleportAlly') {
    const probe = cloneBattle(battle);
    const destinations: Coord[] = [];
    for (const targetId of [action.targetId, action.secondaryTargetId].filter(
      (id): id is string => Boolean(id),
    )) {
      const destination = positions.find((position) =>
        teleportCompany(cloneBattle(probe), targetId, position).ok);
      if (!destination || !teleportCompany(probe, targetId, destination).ok) return null;
      destinations.push(destination);
    }
    return { ...action, positions: destinations };
  }
  if (behavior === 'walls') {
    const expected = 3 + artifactEffectTotal(hero, 'extra_wall')
      + artifactEffectTotal(hero, 'created_hex_bonus');
    const occupied = new Set([
      ...battle.obstacles, ...battle.tiles.map((tile) => tile.position),
      ...battle.stacks.filter((stack) => stack.count > 0).flatMap((stack) =>
        Array.from({ length: UNITS[stack.unitId].hexSize }, (_, offset) => ({
          x: stack.position.x + offset, y: stack.position.y,
        }))),
    ].map((position) => `${position.x},${position.y}`));
    const wall = positions.filter((position) => !occupied.has(`${position.x},${position.y}`))
      .slice(0, expected);
    return wall.length === expected ? { ...action, positions: wall } : null;
  }
  if (behavior !== 'counterfeit') return action;
  if (counterfeitActionIsLegal(battle, side, action)) return action;
  const last = counterfeitSpell(battle, side);
  if (!last) return null;
  const expected = last.action.spellId === 'blink' && last.plus
      && action.actImmediately === false ? 2
    : last.action.spellId === 'wallOfTheMaker'
      ? 3 + artifactEffectTotal(hero, 'extra_wall')
        + artifactEffectTotal(hero, 'created_hex_bonus')
      : 1;
  if (expected === 1) {
    return positions.map((position) => ({ ...action, positions: [position] }))
      .find((candidate) => counterfeitActionIsLegal(battle, side, candidate)) ?? null;
  }
  if (expected === 2) {
    for (const first of positions) for (const second of positions) {
      const candidate = { ...action, positions: [first, second] };
      if (counterfeitActionIsLegal(battle, side, candidate)) return candidate;
    }
    return null;
  }
  const occupied = new Set([
    ...battle.obstacles, ...battle.tiles.map((tile) => tile.position),
    ...battle.stacks.filter((stack) => stack.count > 0).flatMap((stack) =>
      Array.from({ length: UNITS[stack.unitId].hexSize }, (_, offset) => ({
        x: stack.position.x + offset, y: stack.position.y,
      }))),
  ].map((position) => `${position.x},${position.y}`));
  const wall = positions.filter((position) => !occupied.has(`${position.x},${position.y}`))
    .slice(0, expected);
  const candidate = { ...action, positions: wall };
  return counterfeitActionIsLegal(battle, side, candidate) ? candidate : null;
}

export function canUseCombatItem(battle: BattleState, inventorySlot: number): boolean {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  const item = hero?.inventory[inventorySlot];
  const silenced = side && battle.enchantments[side === 'attacker' ? 'defender' : 'attacker']
    .some((effect) => effect.spellId === 'theLongSilence' && effect.upgraded);
  return Boolean(side && hero && !silenced && !battle.activeGrantedAction
    && heroActAvailability(battle, side, 'item').available
    && item && typeof item !== 'string' && ITEMS[item.id].use === 'combat');
}

export function legalCombatItemUses(battle: BattleState): UseItem[] {
  const side = actingSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || battle.activeGrantedAction) return [];
  if (battle.enchantments[side === 'attacker' ? 'defender' : 'attacker']
    .some((effect) => effect.spellId === 'theLongSilence' && effect.upgraded)) return [];
  if (hasArtifactEffect(hero, 'no_consumables')) return [];
  if (!heroActAvailability(battle, side, 'item').available) return [];
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
    if (definition.behavior === 'counterfeit') return counterfeitUses(
      battle, side, inventorySlot,
    );
    if (definition.behavior === 'upgradeSchool') return (['rite', 'craft', 'grave', 'wild'] as const)
      .filter((school) => !battle.itemUpgradedSchools[side].includes(school))
      .map((school) => ({ type: 'BATTLE_USE_ITEM', inventorySlot, school }));
    if (definition.behavior === 'protectEnchantment') {
      return battle.enchantments[side].filter((effect) =>
        !battle.sealedEnchantments.includes(effect.id)).map((effect) => ({
        type: 'BATTLE_USE_ITEM', inventorySlot, effectId: effect.id,
      }));
    }
    if (definition.behavior === 'graveDustResurrection' && battle.pendingGraveDust) return [];
    if (definition.target === 'global') {
      return [{ type: 'BATTLE_USE_ITEM', inventorySlot }];
    }
    if (definition.target === 'enchantment') {
      return (['attacker', 'defender'] as const).flatMap((targetSide) =>
        battle.enchantments[targetSide].filter((effect) =>
          definition.behavior !== 'unmakeEnchantment'
          || !battle.sealedEnchantments.includes(effect.id)).map((effect) => ({
          type: 'BATTLE_USE_ITEM' as const, inventorySlot, effectId: effect.id,
        })));
    }
    if (definition.target === 'positions') {
      return [{ type: 'BATTLE_USE_ITEM', inventorySlot }];
    }
    const validTargets = battle.stacks.filter((stack) => stack.count > 0
      && (definition.target === 'enemy' ? stack.side !== side : stack.side === side)
      && (definition.behavior !== 'extraAction' || (stack.grantedActionsThisRound ?? 0) < 2));
    if (skillRank(hero, 'alchemist') === 3) {
      const paired = validTargets.flatMap((target) => validTargets
        .filter((secondary) => secondary.id !== target.id)
        .map((secondary) => ({
          type: 'BATTLE_USE_ITEM' as const, inventorySlot,
          targetId: target.id, secondaryTargetId: secondary.id,
        })));
      return paired.length ? paired : validTargets.map((stack) => ({
        type: 'BATTLE_USE_ITEM', inventorySlot, targetId: stack.id,
      }));
    }
    return validTargets.map((stack) => ({
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
  if (hasArtifactEffect(hero, 'no_consumables')) {
    throw new Error('An equipped Burden prevents consumable use');
  }
  const item = hero.inventory[action.inventorySlot];
  if (!item || typeof item === 'string') throw new Error('Unknown combat item');
  const definition = ITEMS[item.id];
  if (V2_ITEM_BEHAVIORS.has(definition.behavior)) {
    const candidates = legalCombatItemUses(battle).filter((candidate) =>
      candidate.inventorySlot === action.inventorySlot);
    const choice = candidates.some((candidate) => sameItemChoice(candidate, action));
    const positionsLegalShape = definition.behavior === 'teleportAlly'
      ? Array.isArray(action.positions) : action.positions === undefined;
    if (!choice || !positionsLegalShape) throw new Error('The consumable target is not legal');
  }
  const heroAct = heroActAvailability(battle, side, 'item');
  const targets = [action.targetId, action.secondaryTargetId]
    .filter((id): id is string => Boolean(id))
    .map((id) => battle.stacks.find((stack) => stack.id === id))
    .filter((stack): stack is NonNullable<typeof stack> => Boolean(stack));
  if (definition.behavior === 'counterfeit') {
    const last = counterfeitSpell(battle, side);
    const cast = last ? castAction(action, last.action.spellId) : null;
    if (!last || !cast || !counterfeitActionIsLegal(battle, side, action)) {
      throw new Error('The Counterfeit Coin target is not legal');
    }
    castStoredSpell(
      battle, side, cast!, last.plus, false, 0, false,
    );
  } else if (definition.behavior === 'scroll') {
    const storedId = definition.spellId ?? item.storedSpellId as SpellId | undefined;
    if (!storedId) throw new Error('This scroll has no stored spell');
    castStoredSpell(
      battle, side, castAction(action, storedId), Boolean(item.plus),
    );
  } else if (definition.behavior === 'echo') {
    if (!battle.lastSpellCast) throw new Error('No spell has been cast this battle');
    const last = { ...battle.lastSpellCast };
    castStoredSpell(
      battle, side, castAction(action, last.spellId), last.plus, false, last.manaSpent, false,
    );
  } else {
    const valid = targets.slice(0, skillRank(hero, 'alchemist') === 3 ? 2 : 1);
    if (!valid.length && !['banner', 'walls', 'seal', 'unmakeEnchantment',
      'graveDustResurrection', 'upgradeSchool', 'protectEnchantment', 'destructionMana'].includes(
      definition.behavior,
    )) {
      throw new Error('A target is required');
    }
    if (valid.some((target) => target.count <= 0
      || (definition.target === 'enemy' ? target.side === side : target.side !== side))) {
      throw new Error('The item target is invalid');
    }
    if (definition.behavior === 'extraAction') {
      const probe = cloneBattle(battle);
      for (const target of valid) {
        const result = scheduleGrantedCompanyActions(
          probe, target.id, 'vialBorrowedHours', 'immediate', probe.round,
        );
        if (!result.ok) throw new Error(result.reason.text);
      }
      for (const target of valid) {
        const result = scheduleGrantedCompanyActions(
          battle, target.id, 'vialBorrowedHours', 'immediate', battle.round,
        );
        if (!result.ok) throw new Error(result.reason.text);
      }
    } else if (definition.behavior === 'wildfire') {
      for (const target of valid) {
        addBattleCounter(battle, target, 'burn', 5, side, { fixedAmount: true });
        battle.stacks.filter((stack) => stack.count > 0 && stack.id !== target.id
          && stacksAdjacent(stack, target)).forEach((stack) =>
          addBattleCounter(battle, stack, 'burn', 2, side, { fixedAmount: true }));
      }
    } else if (definition.behavior === 'graveDustResurrection') {
      if (battle.pendingGraveDust) throw new Error('Grave-Dust is already waiting for a destruction');
      battle.pendingGraveDust = { side };
    } else if (definition.behavior === 'upgradeSchool') {
      const school = action.school;
      if (!school || !(['rite', 'craft', 'grave', 'wild'] as SpellSchool[]).includes(school)
          || battle.itemUpgradedSchools[side].includes(school)) {
        throw new Error('Choose a school not already tuned by this item');
      }
      battle.itemUpgradedSchools[side].push(school);
    } else if (definition.behavior === 'protectEnchantment') {
      const own = battle.enchantments[side].find((effect) => effect.id === action.effectId);
      if (!own || battle.sealedEnchantments.includes(own.id)) {
        throw new Error('Choose one unprotected enchantment you own');
      }
      battle.sealedEnchantments.push(own.id);
    } else if (definition.behavior === 'countersToBurn') {
      valid.forEach((target) => {
        const total = target.counters.burn + target.counters.chill
          + target.counters.hex + target.counters.bloom;
        target.counters = { burn: 0, chill: 0, hex: 0, bloom: 0 };
        target.counterSources = {};
        target.counterDecayDelayed = {};
        addBattleCounter(battle, target, 'burn', total, side, { fixedAmount: true });
      });
    } else if (definition.behavior === 'teleportAlly') {
      if ((action.positions?.length ?? 0) !== valid.length) {
        throw new Error('Choose one legal destination per selected company');
      }
      const probe = cloneBattle(battle);
      valid.forEach((target, index) => {
        const result = teleportCompany(probe, target.id, action.positions![index]);
        if (!result.ok) throw new Error(result.reason.text);
      });
      valid.forEach((target, index) => {
        const result = teleportCompany(battle, target.id, action.positions![index]);
        if (!result.ok) throw new Error(result.reason.text);
      });
    } else if (definition.behavior === 'destructionMana') {
      addManaClamped(hero, battle.destroyedStacks * 3);
    } else if (definition.behavior === 'vigor') {
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
  consumeHeroAct(battle, side, heroAct);
  if (definition.behavior === 'extraAction') {
    activateGrantedCompanyAction(battle, 'immediate', battle.round, battle.currentStackId);
  }
  battle.log.push(`${definition.name} used.`);
}
