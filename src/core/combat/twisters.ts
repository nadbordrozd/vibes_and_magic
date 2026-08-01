import type {
  Action, BattleSide, BattleState, CounterId,
} from '../types';
import { stacksAdjacent } from './footprint';
import {
  addBattleCounter, clearCounters,
} from './magicEffects';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;
export type TwisterMode = 'amplify' | 'sour' | 'unmake' | 'reflect' | 'overgrow';

const stackById = (battle: BattleState, id?: string) =>
  battle.stacks.find((stack) => stack.id === id);
const enemySide = (side: BattleSide): BattleSide =>
  side === 'attacker' ? 'defender' : 'attacker';

export function applyEffectTwister(
  battle: BattleState,
  side: BattleSide,
  action: CastAction,
  mode: TwisterMode,
  upgraded: boolean,
): void {
  const parts = action.effectId?.split(':') ?? [];
  if (parts[0] === 'counter') {
    const source = stackById(battle, parts[1]);
    const counter = parts[2] as CounterId;
    if (!source || !counter) throw new Error('Invalid counter effect target');
    if (mode === 'amplify') {
      source.counters[counter] = Math.min(
        9, source.counters[counter] * 2 + (upgraded ? 1 : 0),
      );
    } else if (mode === 'sour' && counter === 'bloom') {
      const amount = source.counters.bloom;
      source.counters.bloom = 0;
      addBattleCounter(battle, source, 'hex', amount, side);
    } else if (mode === 'unmake') {
      clearCounters(source, battle);
    } else if (mode === 'reflect') {
      const targets = [action.targetId, action.secondaryTargetId]
        .filter(Boolean).slice(0, upgraded ? 2 : 1);
      for (const id of targets) {
        addBattleCounter(
          battle, stackById(battle, id)!, counter, source.counters[counter], side,
        );
      }
    } else if (mode === 'overgrow') {
      battle.stacks.filter((stack) => stack.count > 0
        && stack.id !== action.secondaryTargetId
        && (stack.id === source.id || stacksAdjacent(stack, source)))
        .forEach((stack) => addBattleCounter(
          battle, stack, counter, source.counters[counter], side,
        ));
    } else throw new Error('Effect cannot be twisted');
    return;
  }
  if (parts[0] === 'timed') {
    const source = stackById(battle, parts[1]);
    const effect = source?.effects.find((item) =>
      item.id === parts.slice(2).join(':'));
    if (!source || !effect) throw new Error('Invalid timed effect target');
    if (mode === 'amplify') {
      effect.magnitude *= 2;
      if (upgraded) effect.duration += 1;
    } else if (mode === 'sour' && effect.beneficial) {
      source.effects = source.effects.filter((item) => item.id !== effect.id);
      addBattleCounter(battle, source, 'hex', 2, side);
    } else if (mode === 'reflect') {
      for (const id of [action.targetId, action.secondaryTargetId]
        .filter(Boolean).slice(0, upgraded ? 2 : 1)) {
        const target = stackById(battle, id)!;
        target.effects.push({ ...effect, id: `${effect.id}-${target.id}` });
      }
    } else if (mode === 'overgrow') {
      battle.stacks.filter((stack) => stack.count > 0
        && stack.id !== action.secondaryTargetId
        && (stack.id === source.id || stacksAdjacent(stack, source)))
        .forEach((stack) => stack.effects.push({
          ...effect, id: `${effect.id}-${stack.id}`,
        }));
    } else throw new Error('Effect cannot be twisted');
    return;
  }
  if (parts[0] === 'enchantment') {
    const targetSide = parts[1] as BattleSide;
    const row = battle.enchantments[targetSide];
    const index = row.findIndex((item) =>
      item.id === parts.slice(2).join(':'));
    if (index < 0) throw new Error('Invalid enchantment target');
    if (battle.sealedEnchantments.includes(row[index].id)) {
      throw new Error('The enchantment is protected by a Wax Seal');
    }
    if (mode === 'amplify') row[index].multiplier *= 2;
    else if (mode === 'sour' || mode === 'unmake') {
      row.splice(index, 1);
      if (mode === 'sour' && upgraded) {
        battle.stacks.filter((stack) =>
          stack.side === enemySide(side) && stack.count > 0)
          .forEach((stack) =>
            addBattleCounter(battle, stack, 'hex', 3, side));
      }
    } else throw new Error('Enchantment cannot be reflected');
    return;
  }
  throw new Error('An active effect target is required');
}
