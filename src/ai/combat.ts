import { UNITS } from '../content/units';
import {
  activeBattleStack, applyBattleAction, battleReachableHexes,
  closestEnemy, estimateDamageRange, legalBattleActions, recoverInactiveBattleTurn,
  surrenderCost,
} from '../core/combat/battle';
import { targetPriority } from '../core/combat/abilities';
import { canUseRanged, hasAdjacentEnemy } from '../core/combat/damage';
import { hexDistance, nearestReachableToTarget } from '../core/combat/hex';
import type { Action, BattleStack, BattleState } from '../core/types';
import {
  canCastSpell, isP1PlacementCastLegal, isUpgraded, legalSpellCasts,
} from '../core/combat/spells';
import { legalTwistEffectIds } from '../core/combat/spellTargets';
import { SPELLS } from '../content/spells';
import { stackDistance } from '../core/combat/footprint';
import { unitStrength } from '../core/army';
import { BATTLE_COLS, BATTLE_ROWS } from '../content/constants';
import {
  currentKnack, legalKnackActions, legalKnackPlacements, requiredKnackPositions,
} from '../core/combat/knacks';
import { totalStackHp } from '../core/combat/magicEffects';
import { ARTIFACTS } from '../content/artifacts';
import { completeCombatItemUse } from '../core/combat/items';

function firstLegalPlacementCast(
  battle: BattleState, spellId: 'clockworkDouble' | 'blink' | 'wildcall' | 'bramblelash',
): Extract<Action, { type: 'BATTLE_CAST' }> | null {
  const positions = Array.from({ length: BATTLE_ROWS }, (_, y) =>
    Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y }))).flat();
  for (const option of legalSpellCasts(battle).filter((action) => action.spellId === spellId)) {
    if (spellId === 'bramblelash' && isP1PlacementCastLegal(battle, option)) return option;
    for (const position of positions) {
      const action = { ...option, positions: [position] };
      if (isP1PlacementCastLegal(battle, action)) return action;
    }
  }
  return null;
}

function stackStrength(stack: BattleStack): number {
  return stack.count * unitStrength(stack.unitId);
}

export function chooseKnackAction(battle: BattleState): Action | null {
  const actor = activeBattleStack(battle);
  const current = currentKnack(battle);
  const options = legalKnackActions(battle);
  if (!actor || !current || !options.length) return null;
  const side = actor.side;
  const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0);
  const enemies = battle.stacks.filter((stack) => stack.side !== side && stack.count > 0);
  const pick = (targetId: string) => options.find((option) => option.targetId === targetId) ?? null;
  if (current.definition.handlerId === 'hearten') {
    return [...options].sort((a, b) => {
      const firstA = battle.stacks.find((stack) => stack.id === a.targetId)!;
      const firstB = battle.stacks.find((stack) => stack.id === b.targetId)!;
      return firstB.morale - firstA.morale || firstA.slot - firstB.slot
        || (a.secondaryTargetId ?? '').localeCompare(b.secondaryTargetId ?? '');
    })[0];
  }
  if (current.definition.handlerId === 'patch') {
    const target = [...allies].sort((a, b) => {
      const deficit = (stack: BattleStack) => (battle.initialCounts[stack.id] ?? stack.count)
        * UNITS[stack.unitId].hp - totalStackHp(stack);
      return deficit(b) - deficit(a) || a.slot - b.slot;
    })[0];
    return target ? pick(target.id) : null;
  }
  if (current.definition.handlerId === 'errand-remembered') {
    return [...options].sort((a, b) => {
      const deficit = (id?: string) => {
        const stack = battle.stacks.find((candidate) => candidate.id === id)!;
        return (battle.initialCounts[stack.id] ?? stack.count) - stack.count;
      };
      return deficit(b.targetId) - deficit(a.targetId)
        || (a.targetId ?? '').localeCompare(b.targetId ?? '');
    })[0];
  }
  if (current.definition.handlerId === 'lay-resin') {
    const weak = [...allies].sort((a, b) => stackStrength(a) - stackStrength(b)
      || a.slot - b.slot)[0];
    const enemy = weak ? [...enemies].sort((a, b) => stackDistance(a, weak)
      - stackDistance(b, weak) || a.slot - b.slot)[0] : null;
    if (!weak || !enemy) return null;
    const positions = legalKnackPlacements(battle).sort((a, b) =>
      hexDistance(a, enemy.position) + hexDistance(a, weak.position)
      - hexDistance(b, enemy.position) - hexDistance(b, weak.position)
      || a.y - b.y || a.x - b.x).slice(0, requiredKnackPositions(battle));
    return positions.length === requiredKnackPositions(battle)
      ? { type: 'BATTLE_USE_KNACK', positions } : null;
  }
  if (current.definition.handlerId === 'ill-wish') {
    const target = [...enemies].sort((a, b) => stackStrength(b) - stackStrength(a)
      || a.slot - b.slot)[0];
    return target ? pick(target.id) : null;
  }
  if (allies.length < 2) return null;
  const payer = [...allies].sort((a, b) => totalStackHp(b) - totalStackHp(a)
    || a.slot - b.slot)[0];
  return payer ? pick(payer.id) : null;
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
    if (spell.effectOperation) {
      const legalCast = legalBattleActions(battle).find((action) =>
        action.type === 'BATTLE_CAST' && action.spellId === spellId);
      if (legalCast) return legalCast;
      const effectId = legalTwistEffectIds(battle, spellId)[0];
      if (!effectId) continue;
      if (spell.effectOperation === 'reflect') {
        return { type: 'BATTLE_CAST', spellId, effectId, targetId: allies.at(-1)?.id };
      }
      return { type: 'BATTLE_CAST', spellId, effectId };
    }
    // The catalog explicitly permits the AI to avoid purely combinatorial casts it cannot plan.
    if (spellId === 'yoke' || spellId === 'graveBargain' || spellId === 'theTurningYear') continue;
    if (spellId === 'shedSkin' || spellId === 'puppetStrings') {
      const exact = legalSpellCasts(battle).find((action) => action.spellId === spellId);
      if (exact) return exact;
      continue;
    }
    const target = spellId === 'wither'
      ? enemies.find((stack) => stack.counters.hex < 9) ?? enemies[0]
      : spell.aiHints.target === 'strongestAlly' ? allies[0]
      : spell.aiHints.target === 'weakestAlly' ? allies.at(-1)
        : enemies[0];
    if (!target) continue;
    if (['secondWind', 'shrapnel', 'detonate', 'clockworkDouble', 'blink', 'wildcall', 'bramblelash']
      .includes(spellId)) {
      if (spellId === 'clockworkDouble' || spellId === 'blink'
          || spellId === 'wildcall' || spellId === 'bramblelash') {
        const placement = firstLegalPlacementCast(battle, spellId);
        if (placement) return placement;
        continue;
      }
      const legalCast = legalBattleActions(battle).find((action) =>
        action.type === 'BATTLE_CAST' && action.spellId === spellId);
      if (legalCast) return legalCast;
      continue;
    }
    if (spellId === 'trial') {
      const ownMax = Math.max(...allies.map((stack) => stack.count));
      const valid = enemies.find((stack) => stack.count > ownMax);
      if (!valid) continue;
      return { type: 'BATTLE_CAST', spellId, targetId: valid.id };
    }
    return {
      type: 'BATTLE_CAST', spellId, targetId: target.id,
      secondaryTargetId: (spellId === 'rally' || spellId === 'steadyHands')
        && isUpgraded(battle, hero, spellId)
        ? allies.find((stack) => stack.id !== target.id)?.id : undefined,
    };
  }
  return null;
}

function targetValue(stack: BattleStack): number {
  const unit = UNITS[stack.unitId];
  const damageOutput = stack.count * ((unit.damage[0] + unit.damage[1]) / 2);
  const hpRemaining = (stack.count - 1) * unit.hp + stack.topHp;
  return damageOutput / Math.max(1, hpRemaining) * targetPriority(stack);
}

function chooseCreatureCast(
  battle: BattleState, actor: BattleStack, legal: readonly Action[],
): Action | null {
  const casts = legal.filter((action): action is Extract<Action, { type: 'BATTLE_USE_ABILITY' }> =>
    action.type === 'BATTLE_USE_ABILITY'
      && (action.abilityId === 'hedge_caster' || action.abilityId === 'caster')
      && Boolean(action.spellId));
  const repertoire = UNITS[actor.unitId].caster?.repertoire ?? [];
  if (!casts.length || !repertoire.length) return null;
  const allies = battle.stacks.filter((stack) => stack.count > 0 && stack.side === actor.side)
    .sort((a, b) => stackStrength(b) - stackStrength(a) || a.slot - b.slot
      || a.id.localeCompare(b.id));
  const enemies = battle.stacks.filter((stack) => stack.count > 0 && stack.side !== actor.side)
    .sort((a, b) => stackStrength(b) - stackStrength(a) || a.slot - b.slot
      || a.id.localeCompare(b.id));
  const alliedStrength = allies.reduce((sum, stack) => sum + stackStrength(stack), 0);
  const enemyStrength = enemies.reduce((sum, stack) => sum + stackStrength(stack), 0);
  const losing = alliedStrength < enemyStrength;
  const eligible = casts.filter((action) => {
    const hint = SPELLS[action.spellId!].aiHints.castWhen;
    return hint === 'always'
      || (hint === 'round1' && battle.round === 1)
      || (hint === 'losing' && losing)
      || (hint === 'winning' && !losing);
  });
  const targetRank = (action: typeof eligible[number]): number => {
    const hint = SPELLS[action.spellId!].aiHints.target;
    const ordered = hint === 'strongestEnemy' ? enemies
      : hint === 'strongestAlly' ? allies
        : hint === 'weakestAlly' ? [...allies].reverse() : [];
    if (hint === 'self') return action.targetId === actor.id || action.targetId === undefined ? 0 : 1;
    const index = ordered.findIndex((stack) => stack.id === action.targetId);
    return index < 0 ? ordered.length : index;
  };
  return [...eligible].sort((a, b) => repertoire.indexOf(a.spellId!)
    - repertoire.indexOf(b.spellId!)
    || targetRank(a) - targetRank(b)
    || (a.targetId ?? '').localeCompare(b.targetId ?? '')
    || JSON.stringify(a).localeCompare(JSON.stringify(b)))[0] ?? null;
}

export function chooseCombatAction(battle: BattleState): Action {
  const actor = activeBattleStack(battle);
  if (!actor) throw new Error('Combat AI has no active stack');
  const enemies = battle.stacks.filter(
    (stack) => stack.count > 0 && stack.side !== actor.side,
  );
  const legal = legalBattleActions(battle);
  const ambush = legal.filter((action): action is Extract<Action, { type: 'BATTLE_DEPLOY_AMBUSH' }> =>
    action.type === 'BATTLE_DEPLOY_AMBUSH').sort((a, b) => a.destination.y - b.destination.y
      || a.destination.x - b.destination.x)[0];
  if (ambush) return ambush;
  const deflectAction = legal.filter((action): action is Extract<Action, { type: 'BATTLE_CHOOSE_SPELL_DEFLECT' }> =>
    action.type === 'BATTLE_CHOOSE_SPELL_DEFLECT')
    .sort((a, b) => a.targetId.localeCompare(b.targetId))[0];
  if (deflectAction) return deflectAction;
  const mirrorAction = legal.filter((action): action is Extract<Action, { type: 'BATTLE_CHOOSE_MIRROR_COPY' }> =>
    action.type === 'BATTLE_CHOOSE_MIRROR_COPY')
    .sort((a, b) => a.targetId.localeCompare(b.targetId))[0];
  if (mirrorAction) return mirrorAction;
  const redirectAction = legal.filter((action): action is Extract<Action, { type: 'BATTLE_CHOOSE_COUNTER_REDIRECT' }> =>
    action.type === 'BATTLE_CHOOSE_COUNTER_REDIRECT')
    .sort((a, b) => a.targetId.localeCompare(b.targetId))[0];
  if (redirectAction) return redirectAction;
  const skillAction = legal.filter((action): action is Extract<Action, { type: 'BATTLE_USE_SKILL' }> =>
    action.type === 'BATTLE_USE_SKILL').sort((a, b) => a.targetId.localeCompare(b.targetId))[0];
  if (skillAction) return skillAction;
  const alliesForWithdrawal = battle.stacks.filter((stack) =>
    stack.count > 0 && stack.side === actor.side);
  const projectedLosing = alliesForWithdrawal.reduce(
    (sum, stack) => sum + stackStrength(stack), 0,
  ) < enemies.reduce((sum, stack) => sum + stackStrength(stack), 0);
  const withdrawingHero = actor.side === 'attacker'
    ? battle.attackerHero : battle.defenderHero;
  if (projectedLosing && (withdrawingHero?.level ?? 0) >= 4) {
    const cost = surrenderCost(battle, actor.side);
    if (cost * 4 > 3000 && (withdrawingHero?.withdrawalGold ?? 0) >= cost
        && legal.some((action) => action.type === 'BATTLE_SURRENDER')) {
      return { type: 'BATTLE_SURRENDER' };
    }
    if (legal.some((action) => action.type === 'BATTLE_RETREAT')) {
      return { type: 'BATTLE_RETREAT' };
    }
  }
  const freeMoves = legal.filter(
    (action): action is Extract<Action, { type: 'BATTLE_FREE_MOVE' }> =>
      action.type === 'BATTLE_FREE_MOVE',
  );
  if (freeMoves.length) {
    return [...freeMoves].sort((a, b) => {
      const enemyDistance = (action: typeof a) => {
        const mover = battle.stacks.find((stack) => stack.id === action.targetId)!;
        return Math.min(...battle.stacks.filter((stack) => stack.count > 0
          && stack.side !== mover.side).map((stack) =>
          stackDistance({ ...mover, position: action.destination }, stack)));
      };
      return enemyDistance(a) - enemyDistance(b);
    })[0];
  }
  const spell = chooseSpellCast(battle);
  if (spell) return spell;
  const horn = legal.find((action) => action.type === 'BATTLE_USE_ARTIFACT'
    && action.artifactId === 'hornOfTheBroadWorld');
  if (horn) return horn;
  const clapper = legal.find((action) => action.type === 'BATTLE_USE_ARTIFACT'
    && action.artifactId === 'bellsClapper');
  if (clapper && enemies.some((enemy) => enemy.morale >= 60)) return clapper;
  const artifact = legal.filter((action): action is Extract<Action, { type: 'BATTLE_USE_ARTIFACT' }> =>
    action.type === 'BATTLE_USE_ARTIFACT'
      && (ARTIFACTS[action.artifactId].effects.includes('eat_counter')
        || (ARTIFACTS[action.artifactId].effects.includes('store_spell')
          && action.mode === 'release'))).sort((a, b) => {
    const magnitude = (action: typeof a) => {
      const target = battle.stacks.find((stack) => stack.id === action.targetId);
      return target && action.counterId ? target.counters[action.counterId] : 0;
    };
    return magnitude(b) - magnitude(a) || a.artifactId.localeCompare(b.artifactId);
  })[0];
  if (artifact) return artifact;
  const item = legal.filter((action): action is Extract<Action, { type: 'BATTLE_USE_ITEM' }> =>
    action.type === 'BATTLE_USE_ITEM').sort((a, b) => a.inventorySlot - b.inventorySlot
      || (a.targetId ?? '').localeCompare(b.targetId ?? '')
      || (a.secondaryTargetId ?? '').localeCompare(b.secondaryTargetId ?? ''))[0];
  if (item) {
    const completed = completeCombatItemUse(battle, item);
    if (completed) return completed;
  }
  const knack = chooseKnackAction(battle);
  if (knack) return knack;
  const overwind = legal.find((action) => action.type === 'BATTLE_OVERWIND');
  if (overwind && enemies.some((enemy) => {
    const canReach = legal.some((action) =>
      (action.type === 'BATTLE_ATTACK' || action.type === 'BATTLE_MOVE_ATTACK')
      && action.targetId === enemy.id);
    return canReach && estimateDamageRange(battle, actor, enemy)[1] >= enemy.count;
  })) return overwind;
  const hedgeCast = chooseCreatureCast(battle, actor, legal);
  if (hedgeCast) return hedgeCast;
  const altar = legal.find((action) => action.type === 'BATTLE_USE_ABILITY'
    && action.abilityId === 'altar'
    && totalStackHp(actor) < (battle.initialCounts[actor.id] ?? actor.count) * UNITS[actor.unitId].hp);
  if (altar) return altar;
  const blink = legal.filter((action): action is Extract<Action, { type: 'BATTLE_USE_ABILITY' }> =>
    action.type === 'BATTLE_USE_ABILITY' && action.abilityId === 'blink_step'
      && Boolean(action.destination)).sort((a, b) => {
        const distance = (action: typeof a) => Math.min(...enemies.map((enemy) =>
          stackDistance({ ...actor, position: action.destination! }, enemy)));
        return distance(a) - distance(b) || a.destination!.y - b.destination!.y
          || a.destination!.x - b.destination!.x;
      })[0];
  if (blink) return blink;
  const activated = legal.find((action) => action.type === 'BATTLE_USE_ABILITY'
    && (action.abilityId === 'brood_call' || action.abilityId === 'beckoning_song'))
    ?? legal.find((action) => action.type === 'BATTLE_USE_ABILITY'
      && action.abilityId === 'procession_of_repair'
      && battle.stacks.some((stack) => stack.side === actor.side && stack.count > 0
        && stack.count < (battle.initialCounts[stack.id] ?? stack.count)));
  if (activated) return activated;

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
    ).sort((a, b) => stackDistance({ ...actor, position: a.destination }, nearest)
      - stackDistance({ ...actor, position: b.destination }, nearest)
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
        && stackDistance({ ...actor, position: destination }, nearest)
          < stackDistance(actor, nearest)) {
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
    battle = recoverInactiveBattleTurn(battle);
    if (battle.winner) break;
    battle = applyBattleAction(battle, chooseCombatAction(battle));
  }
  if (!battle.winner) throw new Error(`Combat exceeded ${maxActions} actions`);
  return battle;
}
