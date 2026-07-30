import { UNITS } from '../content/units';
import {
  activeBattleStack, applyBattleAction, battleReachableHexes,
  closestEnemy, estimateDamageRange, legalBattleActions,
} from '../core/combat/battle';
import { targetPriority } from '../core/combat/abilities';
import { canUseRanged, hasAdjacentEnemy } from '../core/combat/damage';
import { hexDistance, nearestReachableToTarget } from '../core/combat/hex';
import type { Action, BattleStack, BattleState } from '../core/types';
import { canCastSpell } from '../core/combat/spells';
import { SPELLS } from '../content/spells';

function stackStrength(stack: BattleStack): number {
  const unit = UNITS[stack.unitId];
  return stack.count * unit.hp * ((unit.damage[0] + unit.damage[1]) / 2);
}

function largestCounterEffect(battle: BattleState): string | undefined {
  return battle.stacks.flatMap((stack) =>
    Object.entries(stack.counters).map(([counter, count]) => ({
      id: `counter:${stack.id}:${counter}`, count,
    }))).sort((a, b) => b.count - a.count)[0]?.id;
}

export function chooseSpellCast(battle: BattleState): Action | null {
  const actor = activeBattleStack(battle);
  if (!actor) return null;
  const hero = actor.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (!hero) return null;
  const allies = battle.stacks.filter((stack) => stack.side === actor.side && stack.count > 0)
    .sort((a, b) => stackStrength(b) - stackStrength(a));
  const enemies = battle.stacks.filter((stack) => stack.side !== actor.side && stack.count > 0)
    .filter((stack) => !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
    .sort((a, b) => stackStrength(b) - stackStrength(a));
  const losing = allies.reduce((sum, stack) => sum + stackStrength(stack), 0)
    < enemies.reduce((sum, stack) => sum + stackStrength(stack), 0);
  const spellOrder = [...hero.knownSpells].sort((a, b) => {
    const roundOneA = SPELLS[a].kind === 'enchantment' && battle.round === 1 ? 1 : 0;
    const roundOneB = SPELLS[b].kind === 'enchantment' && battle.round === 1 ? 1 : 0;
    return roundOneB - roundOneA;
  });
  for (const spellId of spellOrder) {
    if (!canCastSpell(battle, spellId)) continue;
    const spell = SPELLS[spellId];
    if (spell.aiHints.castWhen === 'round1' && battle.round !== 1) continue;
    if (spell.aiHints.castWhen === 'losing' && !losing) continue;
    if (spell.aiHints.manaAbove && hero.mana <= spell.aiHints.manaAbove) continue;
    if (spell.kind === 'enchantment') {
      return { type: 'BATTLE_CAST', spellId, replaceEnchantment: 0 };
    }
    if (spellId === 'reckoning' || spellId === 'hymnOfTheHost'
        || spellId === 'clockworkEscort') return { type: 'BATTLE_CAST', spellId };
    if (spellId === 'wallOfTheMaker') continue;
    if (['amplify', 'sour', 'reflect', 'unmake'].includes(spellId)) {
      const effectId = largestCounterEffect(battle);
      if (!effectId) continue;
      if (spellId === 'reflect') {
        return { type: 'BATTLE_CAST', spellId, effectId, targetId: allies.at(-1)?.id };
      }
      return { type: 'BATTLE_CAST', spellId, effectId };
    }
    const target = spellId === 'wither'
      ? enemies.find((stack) => stack.counters.hex < 9) ?? enemies[0]
      : spell.aiHints.target === 'strongestAlly' ? allies[0]
      : spell.aiHints.target === 'weakestAlly' ? allies.at(-1)
        : enemies[0];
    if (!target) continue;
    if (spellId === 'trial') {
      const ownMax = Math.max(...allies.map((stack) => stack.count));
      const valid = enemies.find((stack) => stack.count > ownMax);
      if (!valid) continue;
      return { type: 'BATTLE_CAST', spellId, targetId: valid.id };
    }
    return { type: 'BATTLE_CAST', spellId, targetId: target.id };
  }
  return null;
}

function targetValue(stack: BattleStack): number {
  const unit = UNITS[stack.unitId];
  const damageOutput = stack.count * ((unit.damage[0] + unit.damage[1]) / 2);
  const hpRemaining = (stack.count - 1) * unit.hp + stack.topHp;
  return damageOutput / Math.max(1, hpRemaining) * targetPriority(stack);
}

export function chooseCombatAction(battle: BattleState): Action {
  const actor = activeBattleStack(battle);
  if (!actor) throw new Error('Combat AI has no active stack');
  const enemies = battle.stacks.filter(
    (stack) => stack.count > 0 && stack.side !== actor.side,
  );
  const legal = legalBattleActions(battle);
  const spell = chooseSpellCast(battle);
  if (spell) return spell;
  const overwind = legal.find((action) => action.type === 'BATTLE_OVERWIND');
  if (overwind && enemies.some((enemy) => {
    const canReach = legal.some((action) =>
      (action.type === 'BATTLE_ATTACK' || action.type === 'BATTLE_MOVE_ATTACK')
      && action.targetId === enemy.id);
    return canReach && estimateDamageRange(battle, actor, enemy)[1] >= enemy.count;
  })) return overwind;

  if (canUseRanged(actor) && !hasAdjacentEnemy(actor, battle.stacks)) {
    const target = [...enemies].sort(
      (a, b) => targetValue(b) - targetValue(a) || a.id.localeCompare(b.id),
    )[0];
    const action = legal.find(
      (candidate) => candidate.type === 'BATTLE_ATTACK'
        && candidate.targetId === target?.id,
    );
    if (action) return action;
  }

  const nearest = closestEnemy(battle, actor);
  if (nearest) {
    const moveAttack = legal.filter(
      (candidate): candidate is Extract<Action, { type: 'BATTLE_MOVE_ATTACK' }> =>
        candidate.type === 'BATTLE_MOVE_ATTACK' && candidate.targetId === nearest.id,
    ).sort((a, b) => hexDistance(a.destination, nearest.position)
      - hexDistance(b.destination, nearest.position)
      || a.destination.y - b.destination.y || a.destination.x - b.destination.x)[0];
    if (moveAttack) return moveAttack;

    const direct = legal.find(
      (candidate) => candidate.type === 'BATTLE_ATTACK'
        && candidate.targetId === nearest.id,
    );
    if (direct) return direct;

    const reachable = battleReachableHexes(battle, actor);
    const destination = nearestReachableToTarget(reachable, nearest.position);
    if (destination
        && hexDistance(destination, nearest.position)
          < hexDistance(actor.position, nearest.position)) {
      const move = legal.find(
        (candidate) => candidate.type === 'BATTLE_MOVE'
          && candidate.destination.x === destination.x
          && candidate.destination.y === destination.y,
      );
      if (move) return move;
    }
  }
  return { type: 'BATTLE_DEFEND' };
}

export function autoResolveBattle(initial: BattleState, maxActions = 2000): BattleState {
  let battle = initial;
  for (let step = 0; step < maxActions && !battle.winner; step += 1) {
    battle = applyBattleAction(battle, chooseCombatAction(battle));
  }
  if (!battle.winner) throw new Error(`Combat exceeded ${maxActions} actions`);
  return battle;
}
