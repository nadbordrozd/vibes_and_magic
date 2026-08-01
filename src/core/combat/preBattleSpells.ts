import { hasEquippedArtifact } from '../artifacts';
import type {
  Action, BattleSide, BattleState, SpellId,
} from '../types';
import {
  canBeginSpellCast, castSpell,
} from './spells';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;

export function canCastPreBattleSpell(
  battle: BattleState,
  side: BattleSide,
  spellId: SpellId,
): boolean {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (!hero || battle.round !== 1 || battle.spellCasts !== 0
      || !hasEquippedArtifact(hero, 'pocketSundial')) return false;
  const prior = battle.currentStackId;
  const proxy = battle.stacks.find((stack) =>
    stack.side === side && stack.count > 0);
  if (!proxy) return false;
  battle.currentStackId = proxy.id;
  const result = canBeginSpellCast(battle, spellId);
  battle.currentStackId = prior;
  return result;
}

export function castPreBattleSpell(
  battle: BattleState,
  side: BattleSide,
  action: CastAction,
): void {
  if (!canCastPreBattleSpell(battle, side, action.spellId)) {
    throw new Error('Pocket Sundial cast is unavailable');
  }
  const prior = battle.currentStackId;
  battle.currentStackId = battle.stacks.find((stack) =>
    stack.side === side && stack.count > 0)!.id;
  castSpell(battle, action);
  battle.currentStackId = prior;
  battle.log.push('The Pocket Sundial permits a spell before the first stack acts.');
}
