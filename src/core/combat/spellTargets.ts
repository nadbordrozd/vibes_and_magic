import { SPELLS, type EffectOperation } from '../../content/spells';
import type {
  Action, BattleState, CounterId, SpellId,
} from '../types';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;
type EffectKind = 'counter' | 'timed' | 'enchantment';

interface EffectCandidate {
  id: string;
  kind: EffectKind;
  counter?: CounterId;
  beneficial?: boolean;
}

function activeEffects(battle: BattleState): EffectCandidate[] {
  const effects: EffectCandidate[] = [];
  for (const stack of battle.stacks.filter((candidate) => candidate.count > 0)) {
    for (const counter of Object.keys(stack.counters) as CounterId[]) {
      if (stack.counters[counter] > 0) {
        effects.push({
          id: `counter:${stack.id}:${counter}`, kind: 'counter', counter,
        });
      }
    }
    for (const effect of stack.effects) {
      effects.push({
        id: `timed:${stack.id}:${effect.id}`,
        kind: 'timed',
        beneficial: effect.beneficial,
      });
    }
  }
  for (const side of ['attacker', 'defender'] as const) {
    for (const effect of battle.enchantments[side]) {
      effects.push({
        id: `enchantment:${side}:${effect.id}`, kind: 'enchantment',
      });
    }
  }
  return effects;
}

function accepts(operation: EffectOperation, effect: EffectCandidate): boolean {
  if (operation === 'amplify') return true;
  if (operation === 'reflect') return effect.kind !== 'enchantment';
  if (operation === 'unmake') return effect.kind !== 'timed';
  return effect.kind === 'enchantment'
    || (effect.kind === 'timed' && effect.beneficial === true)
    || (effect.kind === 'counter' && effect.counter === 'bloom');
}

export function legalTwistEffectIds(battle: BattleState, spellId: SpellId): string[] {
  const operation = SPELLS[spellId].effectOperation;
  if (!operation) return [];
  return activeEffects(battle)
    .filter((effect) => accepts(operation, effect))
    .map((effect) => effect.id);
}

export function isSpellTargetLegal(battle: BattleState, action: CastAction): boolean {
  const operation = SPELLS[action.spellId].effectOperation;
  if (!operation) return true;
  if (!action.effectId
      || !legalTwistEffectIds(battle, action.spellId).includes(action.effectId)) return false;
  if (operation !== 'reflect') return true;
  const targets = [action.targetId, action.secondaryTargetId].filter(
    (id): id is string => Boolean(id),
  );
  return targets.length > 0 && targets.every((id) =>
    battle.stacks.some((stack) => stack.id === id && stack.count > 0));
}
