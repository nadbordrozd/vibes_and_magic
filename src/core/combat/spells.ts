import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import type {
  Action, BattleHero, BattleSide, BattleStack, BattleState,
  CounterId, SpellId,
} from '../types';
import { occupiedByStacks, stacksAdjacent } from './footprint';
import {
  addBattleCounter, addSpellCounter, addTimedEffect, clearCounters, healWithoutResurrection,
  grantMeter, loseMeter, scaledDuration, scaledPercent, totalStackHp,
} from './magicEffects';
import { stackUnitHp } from './damage';
import { skillRank, specialtyHandler } from '../heroBehaviors';
import { artifactEffectTotal, hasArtifactEffect, hasEquippedArtifact } from '../artifacts';
import { createBattleTile, placeBattleTile } from './tiles';
import {
  isSpellTargetLegal, legalTwistEffectIds,
} from './spellTargets';
import { applyEffectTwister } from './twisters';
import {
  creatureResonances, effectiveResonances, isUpgraded, spellManaCost,
} from './spellModifiers';
import { resolveExpansionCombatSpell } from './expansionSpellEffects';
import { stackHasAbility } from './abilities';
import {
  activateGrantedCompanyAction, applyImpactDamage, applySpellDamage, canResurrectCompany,
  eligibleBorrowAbilities, isSpellTargetBlocked,
  resurrectCompany, spellCopyEligibility,
} from './primitives';
import { BATTLE_COLS, BATTLE_ROWS } from '../../content/constants';
import { footprintFits } from './footprint';
import { resolveP1RiteCraftSpell } from './p1RiteCraftSpellEffects';
import { resolveP1GraveWildSpell, wildcallSummonPlan } from './p1GraveWildSpellEffects';
import { P1_GRAVE_WILD_AUDIT_IDS } from '../../content/spells/p1GraveWild';
import { P2_SPELL_AUDIT_IDS } from '../../content/spells/p2';
import { resolveP2CombatSpell } from './p2SpellEffects';
import { canUseSpellAct, consumeHeroAct } from './heroActs';
import { emptyArtifacts } from '../artifacts';
import { cloneBattle } from './battleClone';
import {
  pendingDeflectTargets, resolveTargetResistance, stackResistances,
} from './creatureTraits';
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
  'steadyHands', 'secondWind', 'rivet', 'whetstone', 'shrapnel',
  'clockworkDouble', 'reprise', 'overclock',
  'tithe', 'graveBargain', 'sapAndSinew',
  'counterweight', 'secondGrave',
]);
const ENEMY_TARGETS = new Set<SpellId>([
  'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge', 'quiet',
  'oathbind', 'brittle', 'gale',
  'kindle', 'sunlance', 'detonate',
  'pinchOfAsh', 'grudge', 'puppetStrings', 'nettle', 'bramblelash',
  'theLedgerBalanced',
]);

export function canBeginSpellCast(battle: BattleState, spellId: SpellId): boolean {
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || battle.activeGrantedAction
      || !hero.knownSpells.includes(spellId)) return false;
  if (battle.round === 1 && hasArtifactEffect(hero, 'no_round_one_cast')) return false;
  const opponent = side === 'attacker' ? battle.defenderHero : battle.attackerHero;
  if (battle.round === 1 && opponent
      && hasArtifactEffect(opponent, 'enemy_round_one_silence')) return false;
  if (battle.enchantments[enemySide(side)].some((effect) =>
    effect.spellId === 'theLongSilence')) return false;
  if (!canUseSpellAct(battle, side, spellId).available) return false;
  const definition = SPELLS[spellId];
  if (hasArtifactEffect(hero, 'low_tier_free_casting') && definition.tier! > 2) return false;
  if (definition.kind === 'adventure' || definition.kind === 'topology') return false;
  return definition.mana === 'X'
    ? hero.mana > 0 : hero.mana >= spellManaCost(battle, side, hero, spellId);
}

export function canCastSpell(battle: BattleState, spellId: SpellId): boolean {
  return canBeginSpellCast(battle, spellId)
    && legalSpellCasts(battle).some((action) => action.spellId === spellId);
}

export function legalSpellCasts(
  battle: BattleState,
  storedFace?: { spellId: SpellId; plus: boolean },
): CastAction[] {
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
        if (definition.effectOperation === 'unmake' && plus) {
          if (effectId.startsWith('enchantment:')) {
            const enchantmentId = effectId.split(':').slice(2).join(':');
            if (battle.sealedEnchantments.includes(enchantmentId)) {
              return [make({ effectId })];
            }
          }
          const sourceId = effectId.startsWith('counter:') ? effectId.split(':')[1] : null;
          return battle.stacks.filter((stack) => stack.count > 0)
            .filter((stack) => stack.id !== sourceId)
            .map((stack) => make({ effectId, targetId: stack.id }));
        }
        return [make({ effectId })];
      });
    }
    if (resolvedSpellId === 'blink' || resolvedSpellId === 'clockworkDouble') {
      const candidates = resolvedSpellId === 'clockworkDouble'
        ? battle.stacks.filter((candidate) => candidate.side === side && candidate.count > 0
          && !candidate.summoned && !candidate.cloneOf && !isSpellTargetBlocked(candidate))
        : battle.stacks.filter((candidate) => candidate.count > 0 && !isSpellTargetBlocked(candidate));
      if (resolvedSpellId === 'clockworkDouble' || !plus) {
        return candidates.map((candidate) => make({ targetId: candidate.id }));
      }
      const immediate = candidates.filter((candidate) =>
        candidate.lastNormalActionRound !== battle.round)
        .map((candidate) => make({ targetId: candidate.id, actImmediately: true }));
      const paired = candidates.flatMap((candidate) => candidates
        .filter((secondary) => secondary.id !== candidate.id)
        .map((secondary) => make({
          targetId: candidate.id, secondaryTargetId: secondary.id, actImmediately: false,
        })));
      return [...immediate, ...paired];
    }
    if (resolvedSpellId === 'yoke') {
      const living = battle.stacks.filter((candidate) => candidate.count > 0
        && !isSpellTargetBlocked(candidate)
        && (candidate.side === side
          || !candidate.effects.some((effect) => effect.spellId === 'sanctuary')));
      return living.flatMap((target, index) => living.slice(index + 1).filter((other) => other.id !== target.id
        && !target.damageLink && !other.damageLink)
        .map((other) => make({ targetId: target.id, secondaryTargetId: other.id })));
    }
    if (resolvedSpellId === 'theTurningYear') {
      return (['burn', 'chill', 'hex', 'bloom'] as const).map((counterId) => make({ counterId }));
    }
    if (resolvedSpellId === 'wildcall') {
      return wildcallSummonPlan(battle, hero, plus) ? [make({})] : [];
    }
    if (resolvedSpellId === 'bulwark') {
      const wallCount = plus ? 6 : 5;
      const occupied = new Set([
        ...occupiedByStacks(battle.stacks),
        ...battle.obstacles.map((position) => `${position.x},${position.y}`),
        ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
      ]);
      return Array.from({ length: BATTLE_COLS }, (_, x) => x)
        .filter((x) => [...Array.from({ length: wallCount }, (_, y) => ({ x, y })),
          { x, y: wallCount + 1 }].every((position) =>
          !occupied.has(`${position.x},${position.y}`)))
        .map((x) => make({ positions: [{ x, y: 0 }] }));
    }
    if (resolvedSpellId === 'windShear') {
      return Array.from({ length: BATTLE_ROWS }, (_, y) =>
        Array.from({ length: BATTLE_COLS }, (_, x) => make({ positions: [{ x, y }] }))).flat();
    }
    if (resolvedSpellId === 'thicket') {
      const occupied = new Set([
        ...occupiedByStacks(battle.stacks),
        ...battle.obstacles.map((position) => `${position.x},${position.y}`),
        ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
      ]);
      const expected = 3 + artifactEffectTotal(hero, 'created_hex_bonus');
      const positions = Array.from({ length: BATTLE_ROWS }, (_, y) =>
        Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y }))).flat()
        .filter((position) => !occupied.has(`${position.x},${position.y}`)).slice(0, expected);
      return positions.length === expected ? [make({ positions })] : [];
    }
    if (resolvedSpellId === 'shedSkin') {
      const allies = battle.stacks.filter((candidate) => candidate.side === side
        && candidate.count > 0 && !isSpellTargetBlocked(candidate));
      return allies.flatMap((target) => {
        const effects = [
          ...(Object.keys(target.counters) as CounterId[]).filter((counter) =>
            target.counters[counter] > 0).map((counter) => `counter:${target.id}:${counter}`),
          ...target.effects.filter((effect) => effect.spellId !== 'yoke'
            || !target.damageLink?.protected).map((effect) => `timed:${target.id}:${effect.id}`),
        ];
        if (!plus) return effects.map((effectId) => make({ targetId: target.id, effectId }));
        return effects.flatMap((effectId) => battle.stacks.filter((enemy) => enemy.count > 0
          && enemy.side !== side && stacksAdjacent(target, enemy) && !isSpellTargetBlocked(enemy)
          && !enemy.effects.some((effect) => effect.spellId === 'sanctuary')
          && (!effectId.includes(`timed:${target.id}:`) || (() => {
            const selected = target.effects.find((effect) =>
              effect.id === effectId.split(':').slice(2).join(':'));
            if (selected?.spellId !== 'yoke') return true;
            return !enemy.damageLink && target.damageLink?.targetId !== enemy.id;
          })()))
          .map((enemy) => make({
            targetId: target.id, secondaryTargetId: enemy.id, effectId,
          })));
      });
    }
    if (resolvedSpellId === 'borrowShape') {
      return battle.stacks.filter((stack) => stack.side === side && stack.count > 0
        && !isSpellTargetBlocked(stack))
        .flatMap((target) => battle.stacks.filter((source) => source.side !== side
          && source.count > 0 && eligibleBorrowAbilities(source).length > 0
          && (plus || stacksAdjacent(target, source)))
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
    if (resolvedSpellId === 'secondWind') {
      return battle.stacks.filter((candidate) => candidate.side === side
        && !candidate.summoned && !candidate.cloneOf
        && totalStackHp(candidate) < (battle.initialCounts[candidate.id] ?? candidate.count)
          * stackUnitHp(candidate))
        .filter((candidate) => canResurrectCompany(battle, candidate.id, 1).ok)
        .map((candidate) => make({ targetId: candidate.id }));
    }
    if (ALLY_TARGETS.has(resolvedSpellId)) {
      const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0
        && !isSpellTargetBlocked(stack)
        && (resolvedSpellId !== 'remembrance' || (!stack.summoned && !stack.cloneOf))
        && (resolvedSpellId !== 'graveBargain' || (!stack.summoned
          && battle.stacks.some((other) => other.side === side && other.count > 0
            && !other.summoned && other.id !== stack.id))));
      if (resolvedSpellId === 'rally' && plus) {
        return allies.flatMap((target) => allies
          .filter((secondary) => secondary.id !== target.id)
          .map((secondary) => make({
            targetId: target.id, secondaryTargetId: secondary.id,
          })));
      }
      if (resolvedSpellId === 'steadyHands' && plus) {
        return allies.flatMap((target) => allies.filter((secondary) => secondary.id !== target.id)
          .map((secondary) => make({ targetId: target.id, secondaryTargetId: secondary.id })));
      }
      if (resolvedSpellId === 'shrapnel') {
        return allies.filter((candidate) => UNITS[candidate.unitId].abilities.includes('ranged'))
          .map((candidate) => make({ targetId: candidate.id }));
      }
      const actionGrant = resolvedSpellId === 'reprise' || resolvedSpellId === 'overclock';
      return allies.filter((stack) => !actionGrant || (stack.grantedActionsThisRound ?? 0)
        + (resolvedSpellId === 'overclock' || plus ? 2 : 1) <= 2)
        .map((stack) => make({ targetId: stack.id }));
    }
    if (resolvedSpellId === 'trial') {
      const largestOwn = Math.max(...battle.stacks.filter((stack) =>
        stack.side === side && stack.count > 0).map((stack) => stack.count));
      return battle.stacks.filter((stack) => stack.side !== side && stack.count > largestOwn
        && !isSpellTargetBlocked(stack)
        && !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
        .map((stack) => make({ targetId: stack.id }));
    }
    if (ENEMY_TARGETS.has(resolvedSpellId)) {
      return battle.stacks.filter((stack) => stack.side !== side && stack.count > 0
        && (resolvedSpellId !== 'detonate' || stack.counters.burn > 0)
        && (resolvedSpellId !== 'puppetStrings' || (!stack.controlledOnce
          && !stack.originalSide && totalStackHp(stack) <= 40 * hero.spellPower))
        && !isSpellTargetBlocked(stack)
        && !stack.effects.some((effect) => effect.spellId === 'sanctuary'))
        .map((stack) => make({ targetId: stack.id }));
    }
    const enchantmentSlots = hasArtifactEffect(hero, 'enchantment_slots') ? 3 : 2;
    if (definition.kind === 'enchantment' && battle.enchantments[side].length >= enchantmentSlots) {
      return battle.enchantments[side].map((_, replaceEnchantment) =>
        make({ replaceEnchantment }));
    }
    return [make({})];
  };
  if (storedFace) {
    return enumerate(storedFace.spellId, storedFace.spellId, storedFace.plus);
  }
  return hero.knownSpells.filter((id) => canBeginSpellCast(battle, id)).flatMap((spellId) => {
    if (spellId === 'echo') {
      const last = battle.lastSpellCast;
      if (!last || !spellCopyEligibility(last.spellId, 'echo').ok) return [];
      return enumerate(spellId, last.spellId,
        isUpgraded(battle, hero, spellId) ? true : last.plus);
    }
    const actions = enumerate(spellId, spellId, isUpgraded(battle, hero, spellId)
      || (SPELLS[spellId].kind === 'twister' && skillRank(hero, 'twicetold') >= 2));
    let expanded = actions;
    const hall = battle.enchantments[side].find((effect) => effect.spellId === 'mirrorHall');
    if (hall && SPELLS[spellId].targeting?.startsWith('single-')
        && spellCopyEligibility(spellId, 'mirror-hall', { allowTier5: hall.upgraded }).ok) {
      expanded = actions.flatMap((action) => {
        if (!action.targetId) return [action];
        const originalRecipients = new Set([action.targetId, action.secondaryTargetId].filter(Boolean));
        const alternatives = actions.filter((copy) => copy.targetId
          && !originalRecipients.has(copy.targetId)
          && (!copy.secondaryTargetId || !originalRecipients.has(copy.secondaryTargetId)));
        return alternatives.length ? alternatives.map((copy) => ({
            ...action, mirrorTargetId: copy.targetId,
            ...(copy.secondaryTargetId
              ? { mirrorSecondaryTargetId: copy.secondaryTargetId } : {}),
          })) : [action];
      });
    }
    if (!hasArtifactEffect(hero, 'extra_spell_target')
        || !SPELLS[spellId].targeting?.startsWith('single-')) return expanded;
    const targetIds = [...new Set(expanded.map((action) => action.targetId).filter(Boolean))] as string[];
    return expanded.flatMap((action) => action.targetId
      ? targetIds.filter((id) => id !== action.targetId).map((artifactSecondTargetId) => ({
        ...action, artifactSecondTargetId,
      })) : [action]);
  });
}

function legalPlacement(
  battle: BattleState, target: BattleStack, destination: { x: number; y: number },
  excluding: string[], extraOccupied: Array<{ stack: BattleStack; position: { x: number; y: number } }> = [],
): boolean {
  const occupied = occupiedByStacks(battle.stacks.filter((candidate) =>
    !excluding.includes(candidate.id)));
  for (const entry of extraOccupied) {
    for (let offset = 0; offset < UNITS[entry.stack.unitId].hexSize; offset += 1) {
      occupied.add(`${entry.position.x + offset},${entry.position.y}`);
    }
  }
  const blockers = new Set([...battle.obstacles, ...battle.tiles.map((tile) => tile.position)]
    .map((coord) => `${coord.x},${coord.y}`));
  return footprintFits(target, destination, occupied, blockers);
}

/** Lazy legality for placement spells whose destination cross-product is intentionally not enumerated. */
export function isP1PlacementCastLegal(
  battle: BattleState, action: CastAction, storedPlus?: boolean,
): boolean | null {
  if (!['clockworkDouble', 'blink', 'wildcall', 'bramblelash'].includes(action.spellId)) return null;
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (!side || !hero || (storedPlus === undefined && !canBeginSpellCast(battle, action.spellId))) {
    return false;
  }
  const plus = storedPlus ?? isUpgraded(battle, hero, action.spellId);
  const target = stackById(battle, action.targetId);
  const positions = action.positions ?? [];
  if (action.spellId === 'wildcall') {
    if (action.targetId !== undefined || action.secondaryTargetId !== undefined
        || positions.length !== 1) return false;
    const dummy = battle.stacks.find((candidate) => candidate.side === side && candidate.count > 0);
    const plan = wildcallSummonPlan(battle, hero, plus);
    if (!dummy || !plan) return false;
    return legalPlacement(battle, { ...dummy, unitId: plan.unitId }, positions[0], []);
  }
  if (!target || target.count <= 0 || isSpellTargetBlocked(target)) return false;
  if (action.spellId === 'bramblelash') {
    if (!target || target.side === side || action.secondaryTargetId !== undefined) return false;
    if (plus) return positions.length === 0;
    return positions.length === 1 && stacksAdjacent(target, {
      id: 'placement', unitId: 'yeoman', position: positions[0],
    }) && !occupiedByStacks(battle.stacks).has(`${positions[0].x},${positions[0].y}`)
      && !battle.obstacles.some((coord) => coord.x === positions[0].x && coord.y === positions[0].y)
      && !battle.tiles.some((tile) => tile.position.x === positions[0].x
        && tile.position.y === positions[0].y);
  }
  if (action.spellId === 'clockworkDouble') {
    return target.side === side && !target.summoned && !target.cloneOf
      && action.secondaryTargetId === undefined && action.actImmediately === undefined
      && positions.length === 1 && legalPlacement(battle, target, positions[0], []);
  }
  if (!plus) {
    return action.secondaryTargetId === undefined && action.actImmediately === undefined
      && positions.length === 1 && legalPlacement(battle, target, positions[0], [target.id]);
  }
  if (action.actImmediately === true) {
    return action.secondaryTargetId === undefined && target.lastNormalActionRound !== battle.round
      && (target.grantedActionsThisRound ?? 0) < 2
      && positions.length === 1 && legalPlacement(battle, target, positions[0], [target.id]);
  }
  const secondary = stackById(battle, action.secondaryTargetId);
  return action.actImmediately === false && Boolean(secondary && secondary.count > 0
    && secondary.id !== target.id && !isSpellTargetBlocked(secondary)) && positions.length === 2
    && legalPlacement(battle, target, positions[0], [target.id])
    && legalPlacement(
      battle, secondary!, positions[1], [target.id, secondary!.id],
      [{ stack: target, position: positions[0] }],
    );
}

export function isP1BoundedCastLegal(battle: BattleState, action: CastAction): boolean | null {
  const placement = isP1PlacementCastLegal(battle, action);
  if (placement !== null) return placement;
  const bounded = action.spellId === 'reprise' || action.spellId === 'overclock'
    || (P1_GRAVE_WILD_AUDIT_IDS as readonly SpellId[]).includes(action.spellId)
    || (P2_SPELL_AUDIT_IDS as readonly SpellId[]).includes(action.spellId);
  if (!bounded) return null;
  const keys = [
    'targetId', 'secondaryTargetId', 'effectId', 'counterId', 'replaceEnchantment',
    'skipRound', 'actImmediately',
    'artifactSecondTargetId',
    'mirrorTargetId', 'mirrorSecondaryTargetId',
  ] as const;
  if (action.positions !== undefined) {
    return legalSpellCasts(battle).some((candidate) => candidate.spellId === action.spellId
      && JSON.stringify(candidate.positions) === JSON.stringify(action.positions)
      && keys.every((key) => candidate[key] === action[key]));
  }
  return legalSpellCasts(battle).some((candidate) => candidate.spellId === action.spellId
    && keys.every((key) => candidate[key] === action[key]));
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
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const slots = hero && hasArtifactEffect(hero, 'enchantment_slots') ? 3 : 2;
  if (row.length < slots) row.push(effect);
  else row.splice(replace ?? 0, 1, effect);
}

function spellDamage(
  battle: BattleState, stack: BattleStack, percent: number, sourceSide: BattleSide,
): void {
  if (stack.count <= 0) return;
  const damage = Math.max(1, Math.ceil(totalStackHp(stack) * percent / 100));
  applySpellDamage(battle, stack, damage, { sourceSide });
}

function castRite(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): void {
  const target = stackById(battle, action.targetId);
  const sp = hero.spellPower;
  if (action.spellId === 'rally') {
    [target, plus ? stackById(battle, action.secondaryTargetId) : undefined]
      .filter(Boolean).forEach((stack) => grantMeter(stack!, 50, battle));
  } else if (action.spellId === 'blessing') {
    const recipients = plus
      ? battle.stacks.filter((stack) => stack.side === side && stack.count > 0) : [target!];
    recipients.forEach((stack) => addTimedEffect(stack, 'blessing', 99, 1, true, side, battle));
  } else if (action.spellId === 'standardOfDawn') {
    addEnchantment(battle, side, action.spellId, plus, action.replaceEnchantment);
  } else if (action.spellId === 'amplify') {
    applyEffectTwister(battle, side, action, 'amplify', plus);
  } else if (action.spellId === 'sanctuary') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), 1, true, side, battle);
    if (plus) clearCounters(target!, battle);
  } else if (action.spellId === 'oathOfIron') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), plus ? 2 : 1, true, side, battle);
  } else if (action.spellId === 'consecrate') {
    const removed = clearCounters(target!, battle);
    healWithoutResurrection(target!, scaledPercent(plus ? 15 : 8, sp), battle);
    if (plus) grantMeter(target!, removed * 5, battle);
  } else if (action.spellId === 'hymnOfTheHost') {
    const amount = Math.ceil(battle.extraActions[side] * 8 * (plus ? 1.5 : 1));
    battle.stacks.filter((stack) => stack.side === side && stack.count > 0)
      .forEach((stack) => grantMeter(stack, amount, battle));
  } else if (action.spellId === 'trial') {
    const largestOwn = Math.max(...battle.stacks.filter((stack) =>
      stack.side === side && stack.count > 0).map((stack) => stack.count));
    if (!target || target.side === side || target.count <= largestOwn) throw new Error('Illegal Trial target');
    spellDamage(battle, target, scaledPercent(plus ? 45 : 30, sp), side);
  } else if (action.spellId === 'holdTheLine') {
    addEnchantment(battle, side, action.spellId, plus, action.replaceEnchantment);
  }
}

function castCraft(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  action: CastAction, plus: boolean,
): void {
  const target = stackById(battle, action.targetId);
  const sp = hero.spellPower;
  if (action.spellId === 'forgeSpark') {
    applyImpactDamage(battle, {
      targetId: target!.id, sourceSide: side, base: 8, coefficient: 4,
      spellPower: sp, cap: 40,
    });
    addSpellCounter(battle, target!, 'burn', plus ? 4 : 3, side);
    if (plus) battle.stacks.filter((stack) =>
      stack.side === target!.side && stacksAdjacent(stack, target!))
      .forEach((stack) => addSpellCounter(battle, stack, 'burn', 2, side));
  } else if (action.spellId === 'ward') {
    addTimedEffect(target!, action.spellId, 99, plus ? 2 : 1, true, side, battle);
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
    const expected = 3 + artifactEffectTotal(hero, 'extra_wall')
      + artifactEffectTotal(hero, 'created_hex_bonus');
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
      position.x < 0 || position.x >= BATTLE_COLS || position.y < 0 || position.y >= BATTLE_ROWS
      || occupied.some((coord) => coord.x === position.x && coord.y === position.y)
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
    addTimedEffect(target!, action.spellId, plus ? 99 : scaledDuration(2, sp), 3, true, side, battle);
  } else if (action.spellId === 'unmake') {
    const counterSource = action.effectId?.startsWith('counter:')
      ? action.effectId.split(':')[1] : null;
    if (plus && target && counterSource === target.id) {
      throw new Error('Upgraded Unmake must cleanse two different companies');
    }
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
    addSpellCounter(battle, target!, 'hex', plus ? 8 : 6, side);
    if (plus) addSpellCounter(battle, target!, 'chill', 2, side);
  } else if (action.spellId === 'graveChill') {
    addSpellCounter(battle, target!, 'chill', 3, side);
    if (plus && !stackHasAbility(target!, 'mindless')) {
      loseMeter(target!, 20, battle);
    }
  } else if (action.spellId === 'mournersVeil') {
    const effect = addTimedEffect(
      target!, action.spellId, scaledDuration(plus ? 3 : 2, sp), 20, true, side, battle,
    );
    if (plus) effect.id += ':plus';
  } else if (action.spellId === 'dirge') {
    const multiplier = specialtyHandler(hero).dirgeMultiplier?.() ?? 1;
    spellDamage(battle, target!, scaledPercent(plus ? 5 : 3, sp)
      * battle.destroyedStacks * multiplier, side);
  } else if (action.spellId === 'lastCandle') {
    addEnchantment(battle, side, action.spellId, plus, action.replaceEnchantment);
  } else if (action.spellId === 'sour') {
    applyEffectTwister(battle, side, action, 'sour', plus);
  } else if (action.spellId === 'remembrance') {
    if (!target || target.side !== side || target.summoned || target.cloneOf) {
      throw new Error('Illegal Remembrance target');
    }
    const initial = battle.initialCounts[target.id] ?? 0;
    const losses = Math.max(0, initial - target.count);
    const revive = Math.min(losses, Math.ceil(losses * scaledPercent(plus ? 35 : 20, sp) / 100));
    resurrectCompany(battle, target.id, revive * stackUnitHp(target));
  } else if (action.spellId === 'reckoning') {
    for (const stack of battle.stacks.filter((item) => item.count > 0)) {
      const percent = Math.min(60, manaSpent * scaledPercent(2, sp))
        * (plus && stack.side === side ? 0.5 : 1);
      spellDamage(battle, stack, percent, side);
    }
  } else if (action.spellId === 'quiet') {
    addTimedEffect(target!, action.spellId, scaledDuration(2, sp), 1, false, side, battle);
    if (plus) addSpellCounter(battle, target!, 'chill', 2, side);
  }
}

function redirectWardBearer(
  battle: BattleState, side: BattleSide, action: CastAction,
): { action: CastAction; bearer?: BattleStack } {
  const mode = SPELLS[action.spellId].targeting;
  if (!['single-enemy', 'single-any'].includes(mode ?? '') || !action.targetId
      || action.secondaryTargetId) return { action };
  const target = stackById(battle, action.targetId);
  if (!target || target.side === side) return { action };
  const hero = heroFor(battle, side);
  const bearer = battle.stacks.filter((stack) => stack.count > 0
    && stack.side === target.side && stack.id !== target.id
    && stackHasAbility(stack, 'ward_bearer')
    && (stack.abilityUses?.ward_bearer ?? 0) === 0
    && !isSpellTargetBlocked(stack)
    && !stack.effects.some((effect) => effect.spellId === 'sanctuary')
    && stacksAdjacent(stack, target)
    && (action.spellId !== 'puppetStrings'
      || totalStackHp(stack) <= 40 * (battle.spellResolutionSource?.spellPower
        ?? hero?.spellPower ?? 0)))
    .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))[0];
  if (!bearer) return { action };
  return { action: { ...action, targetId: bearer.id }, bearer };
}

function assertSpellTargetLegal(
  battle: BattleState, side: BattleSide, action: CastAction, deflected = false,
): void {
  const target = stackById(battle, action.targetId);
  if (!isSpellTargetLegal(battle, action)) throw new Error('Invalid active effect target');
  if (!deflected && ALLY_TARGETS.has(action.spellId)
      && (!target || target.side !== side)) throw new Error('An allied target is required');
  if (!deflected && ENEMY_TARGETS.has(action.spellId)
      && (!target || target.side === side)) throw new Error('An enemy target is required');
  if (target && target.side !== side && target.effects.some(
    (effect) => effect.spellId === 'sanctuary',
  )) throw new Error('Target is protected by Sanctuary');
  if (target && isSpellTargetBlocked(target)) throw new Error('Target is immune to all spells');
  if (target && target.side === side && stackHasAbility(target, 'unruly')) {
    throw new Error('Unruly companies cannot be targeted by allied spells');
  }
  if (action.spellId === 'yoke') {
    const other = stackById(battle, action.secondaryTargetId);
    if (!other || isSpellTargetBlocked(other)
        || other.effects.some((effect) => effect.spellId === 'sanctuary')) {
      throw new Error('The secondary Yoke target is protected from spells');
    }
  }
}

function resolveSpellFaceRaw(
  battle: BattleState,
  side: BattleSide,
  hero: BattleHero,
  action: CastAction,
  plus: boolean,
  manaSpent: number, heroCast: boolean,
): void {
  const target = stackById(battle, action.targetId);
  assertSpellTargetLegal(battle, side, action, Boolean(action.deflectTargetId));
  const definition = SPELLS[action.spellId];
  if (resolveP1RiteCraftSpell(battle, side, hero, action, plus)) return;
  if (resolveP1GraveWildSpell(battle, side, hero, action, plus)) return;
  if (resolveP2CombatSpell(battle, side, hero, action, plus)) return;
  if (resolveExpansionCombatSpell(battle, side, hero, action, plus)) return;
  if (action.spellId === 'echo') {
    const last = battle.lastSpellCast;
    if (!last || !spellCopyEligibility(last.spellId, 'echo').ok) {
      throw new Error('There is no eligible spell to Echo');
    }
    resolveSpellFace(
      battle, side, hero, { ...action, spellId: last.spellId },
      plus ? true : last.plus, last.manaSpent, false,
    );
    return;
  }
  if (definition.school === 'rite') castRite(battle, side, hero, action, plus);
  else if (definition.school === 'craft') castCraft(battle, side, hero, action, plus);
  else castGrave(battle, side, hero, action, plus, manaSpent);
}

function resolveSpellFace(
  battle: BattleState, side: BattleSide, hero: BattleHero,
  originalAction: CastAction, plus: boolean, manaSpent: number, heroCast = true,
): void {
  assertSpellTargetLegal(battle, side, originalAction, Boolean(originalAction.deflectTargetId));
  const redirected = redirectWardBearer(battle, side, originalAction);
  let action = redirected.action;
  const resistanceTarget = stackById(battle, action.targetId);
  if (resistanceTarget) {
    const defendingHero = resistanceTarget.side === 'attacker'
      ? battle.attackerHero : battle.defenderHero;
    const creatureDeflect = stackResistances(resistanceTarget)
      .some((entry) => entry.kind === 'spell-deflect')
      && (resistanceTarget.abilityUses?.spell_deflect ?? 0) === 0;
    const artifactDeflect = Boolean(defendingHero
      && hasArtifactEffect(defendingHero, 'spell_deflect')
      && !battle.artifactEffectUses[resistanceTarget.side].spell_deflect);
    const deflectPending = resistanceTarget.side !== side
      && !action.deflectTargetId
      && (creatureDeflect || artifactDeflect)
      && (SPELLS[action.spellId].targeting?.startsWith('single-') ?? false);
    if (deflectPending) {
      const legalTargetIds = pendingDeflectTargets(battle, side).filter((candidate) => {
        const redirectedAction = { ...action, targetId: candidate.id, deflectTargetId: candidate.id };
        try {
          const probe = cloneBattle(battle);
          const probeHero = heroFor(probe, side) ?? hero;
          resolveSpellFace(probe, side, probeHero, redirectedAction, plus, manaSpent, false);
          return !probe.pendingSpellDeflection;
        } catch { return false; }
      }).map((stack) => stack.id);
      if (legalTargetIds.length) {
        if (artifactDeflect && !creatureDeflect) {
          battle.artifactEffectUses[resistanceTarget.side].spell_deflect = 1;
        }
        battle.pendingSpellDeflection = {
          defenderSide: resistanceTarget.side, sourceSide: side,
          sourceKind: battle.spellResolutionSource?.kind ?? (heroCast ? 'hero' : 'copy'),
          spellPower: hero.spellPower, action, plus, manaSpent, legalTargetIds,
          casterStackId: battle.spellResolutionSource?.kind === 'creature'
            ? battle.currentStackId ?? undefined : undefined,
        };
        battle.log.push(`${artifactDeflect && !creatureDeflect ? 'Mirrorback Cloak' : UNITS[resistanceTarget.unitId].name} must choose where to deflect ${SPELLS[action.spellId].name}.`);
        return;
      }
      // With nowhere legal to redirect, the printed defense cannot alter this cast.
      action = { ...action, deflectTargetId: '__no-legal-redirect__' };
    }
    const resistance = resolveTargetResistance(
      battle, side, action.spellId, resistanceTarget, action.deflectTargetId,
    );
    if (resistance.target.id !== resistanceTarget.id) {
      action = { ...action, targetId: resistance.target.id };
    }
    if (resistance.blocked) {
      battle.log.push(`${UNITS[resistanceTarget.unitId].name}: ${resistance.reason}; ${SPELLS[action.spellId].name} has no effect.`);
      return;
    }
  }
  const echoTargets = [...new Set([action.targetId, action.secondaryTargetId])]
    .map((id) => stackById(battle, id))
    .filter((target): target is BattleStack => Boolean(target && target.side === side
      && stackHasAbility(target, 'echoing')));
  const before = new Map(echoTargets.map((target) => [target.id, {
    counters: { ...target.counters },
    effects: new Set(target.effects.map((effect) => effect.id)),
  }]));
  const priorSource = battle.spellResolutionSource;
  const priorStackIds = new Set(battle.stacks.map((stack) => stack.id));
  battle.spellResolutionSource = {
    kind: heroCast ? 'hero' : priorSource?.kind ?? 'copy', spellPower: hero.spellPower,
    spellId: action.spellId, skippedRecipientIds: [],
  };
  try {
    resolveSpellFaceRaw(battle, side, hero, action, plus, manaSpent, heroCast);
    if (heroCast && action.artifactSecondTargetId) {
      const source = battle.spellResolutionSource;
      battle.spellResolutionSource = source && { ...source, magnitudeMultiplier: 0.5 };
      try {
        resolveSpellFaceRaw(battle, side, hero, {
          ...action, targetId: action.artifactSecondTargetId,
          secondaryTargetId: undefined, artifactSecondTargetId: undefined,
          mirrorTargetId: undefined, mirrorSecondaryTargetId: undefined,
        }, plus, manaSpent, false);
      } finally { battle.spellResolutionSource = source; }
      battle.log.push('The Cracked Prism applies the spell to a second target at half magnitude.');
    }
    const hall = heroCast && battle.enchantments[side].find((effect) =>
      effect.spellId === 'mirrorHall');
    if (hall && action.mirrorTargetId
        && spellCopyEligibility(action.spellId, 'mirror-hall', { allowTier5: hall.upgraded }).ok) {
      const source = battle.spellResolutionSource;
      battle.spellResolutionSource = source && {
        ...source, magnitudeMultiplier: hall.upgraded && SPELLS[action.spellId].tier === 5 ? 0.5 : 1,
      };
      try {
        resolveSpellFaceRaw(battle, side, hero, {
          ...action, targetId: action.mirrorTargetId,
          secondaryTargetId: action.mirrorSecondaryTargetId,
          artifactSecondTargetId: undefined, mirrorTargetId: undefined,
          mirrorSecondaryTargetId: undefined,
        }, plus, manaSpent, false);
      } finally { battle.spellResolutionSource = source; }
      battle.log.push(`Mirror Hall copies ${SPELLS[action.spellId].name} to its chosen second target.`);
    }
  } finally {
    battle.spellResolutionSource = priorSource;
  }
  if (heroCast && hasArtifactEffect(hero, 'summon_bonus')) {
    battle.stacks.filter((stack) => !priorStackIds.has(stack.id) && stack.summoned
      && stack.side === side).forEach((stack) => {
      stack.summonSpeedBonus = (stack.summonSpeedBonus ?? 0)
        + artifactEffectTotal(hero, 'summon_bonus');
      addBattleCounter(battle, stack, 'bloom', 2, side, { fixedAmount: true });
    });
  }
  if (heroCast && hasArtifactEffect(hero, 'double_first_summon')
      && !battle.artifactEffectUses[side].double_first_summon) {
    const summoned = battle.stacks.filter((stack) => !priorStackIds.has(stack.id)
      && stack.summoned && stack.side === side)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (summoned) {
      const blockers = new Set([
        ...battle.obstacles, ...battle.tiles.map((tile) => tile.position),
      ].map((coord) => `${coord.x},${coord.y}`));
      const destination = Array.from({ length: BATTLE_ROWS }, (_, y) =>
        Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y }))).flat()
        .filter((position) => footprintFits(summoned, position,
          occupiedByStacks(battle.stacks), blockers))
        .sort((a, b) => Math.abs(a.x - summoned.position.x) + Math.abs(a.y - summoned.position.y)
          - Math.abs(b.x - summoned.position.x) - Math.abs(b.y - summoned.position.y)
          || a.y - b.y || a.x - b.x)[0];
      if (destination) {
        const copy: BattleStack = {
          ...summoned,
          id: `${summoned.id}:nesting-doll`,
          slot: Math.max(...battle.stacks.map((stack) => stack.slot), 6) + 1,
          count: Math.max(1, Math.ceil(summoned.count
            * Math.max(1, artifactEffectTotal(hero, 'double_first_summon', 'percent')) / 100)),
          topHp: stackUnitHp(summoned),
          position: destination,
          counters: { burn: 0, chill: 0, hex: 0, bloom: 0 },
          effects: [], abilityUses: {}, damageDealt: 0, damageTaken: 0,
        };
        battle.stacks.push(copy);
        battle.initialCounts[copy.id] = copy.count;
        battle.artifactEffectUses[side].double_first_summon = 1;
        battle.log.push(`The Nesting Doll summons ${copy.count} more ${UNITS[copy.unitId].name}.`);
      }
    }
  }
  if (redirected.bearer) {
    redirected.bearer.abilityUses = { ...redirected.bearer.abilityUses, ward_bearer: 1 };
    const original = stackById(battle, originalAction.targetId);
    battle.log.push(`${UNITS[redirected.bearer.unitId].name} bears the spell meant for ${original ? UNITS[original.unitId].name : 'an ally'}.`);
  }
  if (!heroCast) return;
  for (const echoTarget of echoTargets) {
    const snapshot = before.get(echoTarget.id)!;
    for (const counter of Object.keys(echoTarget.counters) as CounterId[]) {
      if (echoTarget.counters[counter] > snapshot.counters[counter]) {
        const cap = echoTarget.side !== side && skillRank(hero, 'tallykeeper') >= 3 ? 12 : 9;
        echoTarget.counters[counter] = Math.min(cap, echoTarget.counters[counter] + 1);
      }
    }
    echoTarget.effects.filter((effect) => !snapshot.effects.has(effect.id))
      .forEach((effect) => { effect.duration += 1; });
  }
}

export function resolvePendingSpellDeflection(
  battle: BattleState, defenderSide: BattleSide, targetId: string,
): void {
  const pending = battle.pendingSpellDeflection;
  if (!pending || pending.defenderSide !== defenderSide
      || !pending.legalTargetIds.includes(targetId)) throw new Error('Illegal Spell Deflect choice');
  const template = heroFor(battle, pending.sourceSide) ?? battle.attackerHero;
  const source: BattleHero = { ...template, spellPower: pending.spellPower };
  battle.pendingSpellDeflection = undefined;
  const prior = battle.spellResolutionSource;
  battle.spellResolutionSource = {
    kind: pending.sourceKind, spellPower: pending.spellPower,
    spellId: pending.action.spellId, skippedRecipientIds: [],
  };
  try {
    resolveSpellFace(battle, pending.sourceSide, source,
      { ...pending.action, deflectTargetId: targetId }, pending.plus, pending.manaSpent,
      pending.sourceKind === 'hero');
  } finally { battle.spellResolutionSource = prior; }
  const mirrorSide = enemySide(pending.sourceSide);
  const mirror = battle.stacks.find((stack) => stack.side === mirrorSide
    && stack.count > 0 && stackHasAbility(stack, 'mirror_hex'));
  const upgradedStandingMirror = Boolean(mirror?.effects.some((effect) =>
    effect.spellId === 'standingMirror' && effect.magnitude >= 2));
  const mirrorHero = heroFor(battle, mirrorSide);
  const artifactMirror = Boolean(mirrorHero && !battle.mirrorArtifactUsed[mirrorSide]
    && hasEquippedArtifact(mirrorHero, 'mirrorshardPendant'));
  const eligibility = spellCopyEligibility(pending.action.spellId,
    mirror ? 'standing-mirror' : 'mirrorshard');
  if ((mirror || artifactMirror) && eligibility.ok) {
    const originalTarget = stackById(battle, targetId);
    const mirroredTarget = originalTarget ? battle.stacks.filter((stack) => stack.count > 0
      && stack.side === (originalTarget.side === pending.sourceSide ? mirrorSide : pending.sourceSide))
      .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))[0] : undefined;
    const mirrorSource = mirrorHero ?? source;
    try {
      resolveSpellFace(battle, mirrorSide, mirrorSource, {
        ...pending.action, targetId: mirroredTarget?.id, secondaryTargetId: undefined,
        deflectTargetId: undefined,
      }, pending.plus, pending.manaSpent, false);
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} copies ${SPELLS[pending.action.spellId].name}.`);
    } catch {
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} finds no legal reflection for ${SPELLS[pending.action.spellId].name}.`);
    }
    if (artifactMirror) battle.mirrorArtifactUsed[mirrorSide] = true;
  }
  if (pending.sourceKind !== 'copy') {
    battle.spellCasts += 1;
    battle.spellCastsBySide[pending.sourceSide] =
      (battle.spellCastsBySide[pending.sourceSide] ?? 0) + 1;
    battle.spellsCastAgainst[enemySide(pending.sourceSide)].push(pending.action.spellId);
    battle.lastSpellCast = {
      spellId: pending.action.spellId, plus: pending.plus, manaSpent: pending.manaSpent,
    };
    battle.log.push(`${SPELLS[pending.action.spellId].name}${pending.plus ? '+' : ''} resolves after Spell Deflect.`);
  }
}

export function resolvePendingMirrorCopy(
  battle: BattleState, chooserSide: BattleSide, targetId: string,
): void {
  const pending = battle.pendingMirrorCopy;
  if (!pending || pending.chooserSide !== chooserSide
      || !pending.legalTargetIds.includes(targetId)) {
    throw new Error('Illegal Standing Mirror copy choice');
  }
  const hero = heroFor(battle, chooserSide);
  if (!hero) throw new Error('Standing Mirror has no controlling hero');
  battle.pendingMirrorCopy = undefined;
  const source: BattleHero = { ...hero, spellPower: pending.spellPower };
  const prior = battle.spellResolutionSource;
  battle.spellResolutionSource = {
    kind: 'copy', spellPower: pending.spellPower,
    spellId: pending.action.spellId, skippedRecipientIds: [],
  };
  try {
    resolveSpellFace(battle, chooserSide, source, {
      ...pending.action, targetId, secondaryTargetId: undefined,
      artifactSecondTargetId: undefined, mirrorTargetId: undefined,
      mirrorSecondaryTargetId: undefined,
    }, pending.plus, pending.manaSpent, false);
  } finally { battle.spellResolutionSource = prior; }
  battle.log.push(`Standing Mirror copies ${SPELLS[pending.action.spellId].name} to its chosen target.`);
}

export function castCreatureSpell(
  battle: BattleState, caster: BattleStack,
  creatureActionOrSpell: Omit<CastAction, 'type'> | SpellId,
  legacyTargetId?: string,
): void {
  const creatureAction: Omit<CastAction, 'type'> = typeof creatureActionOrSpell === 'string'
    ? { spellId: creatureActionOrSpell, targetId: legacyTargetId } : creatureActionOrSpell;
  const { spellId } = creatureAction;
  const metadata = UNITS[caster.unitId].caster;
  if (!metadata || !metadata.repertoire.includes(spellId)) throw new Error('Unknown creature spell');
  const side = caster.side;
  const baseHero = heroFor(battle, side);
  const template = baseHero ?? battle.attackerHero;
  const source: BattleHero = {
    ...template, id: baseHero?.id ?? `creature:${caster.id}`, spellPower: metadata.castPower,
    mana: 0, manaMaximum: 0, knownSpells: [...metadata.repertoire], upgradedSpells: [],
    spellManaReductions: {}, skills: {}, inventory: [], artifacts: emptyArtifacts(), debts: [],
  };
  const plus = creatureResonances(battle, side).includes(SPELLS[spellId].school);
  const priorSource = battle.spellResolutionSource;
  battle.spellResolutionSource = {
    kind: 'creature', spellPower: metadata.castPower, spellId, skippedRecipientIds: [],
  };
  try {
    resolveSpellFace(battle, side, source,
      { type: 'BATTLE_CAST', ...creatureAction }, plus, 0, false);
  } finally {
    battle.spellResolutionSource = priorSource;
  }
  if (battle.pendingSpellDeflection) return;
  const mirrorSide = enemySide(side);
  const mirror = battle.stacks.find((stack) => stack.side === mirrorSide
    && stack.count > 0 && stackHasAbility(stack, 'mirror_hex'));
  const upgradedStandingMirror = Boolean(mirror?.effects.some((effect) =>
    effect.spellId === 'standingMirror' && effect.magnitude >= 2));
  const mirrorHero = heroFor(battle, mirrorSide);
  const artifactMirror = Boolean(mirrorHero && !battle.mirrorArtifactUsed[mirrorSide]
    && hasEquippedArtifact(mirrorHero, 'mirrorshardPendant'));
  const eligibility = spellCopyEligibility(spellId,
    mirror ? 'standing-mirror' : 'mirrorshard');
  if ((mirror || artifactMirror) && eligibility.ok) {
    const mirrorTemplate = mirrorHero ?? source;
    const mirroredSource: BattleHero = {
      ...mirrorTemplate, id: mirrorHero?.id ?? `mirror:${mirror!.id}`,
      spellPower: metadata.castPower, mana: 0, manaMaximum: 0,
      skills: {}, spellManaReductions: {}, artifacts: emptyArtifacts(), inventory: [], debts: [],
    };
    const originalTarget = stackById(battle, creatureAction.targetId);
    const mirroredTarget = originalTarget
      ? battle.stacks.filter((stack) => stack.count > 0
        && stack.side === (originalTarget.side === side ? mirrorSide : side))
        .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))[0] : undefined;
    try {
      const copyPrior = battle.spellResolutionSource;
      battle.spellResolutionSource = {
        kind: 'creature', spellPower: metadata.castPower, spellId, skippedRecipientIds: [],
      };
      try {
        resolveSpellFace(battle, mirrorSide, mirroredSource, {
          type: 'BATTLE_CAST', spellId, targetId: mirroredTarget?.id,
        }, plus, 0, false);
      } finally {
        battle.spellResolutionSource = copyPrior;
      }
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} copies ${SPELLS[spellId].name}.`);
    } catch {
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} finds no legal reflection for ${SPELLS[spellId].name}.`);
    }
    if (artifactMirror) battle.mirrorArtifactUsed[mirrorSide] = true;
  }
  battle.spellCasts += 1;
  battle.spellCastsBySide[side] = (battle.spellCastsBySide[side] ?? 0) + 1;
  battle.spellsCastAgainst[enemySide(side)].push(spellId);
  battle.lastSpellCast = { spellId, plus, manaSpent: 0 };
  battle.log.push(`${UNITS[caster.unitId].name} casts ${SPELLS[spellId].name} at Spell Power ${metadata.castPower}.`);
}

export function legalCreatureSpellActions(
  battle: BattleState, caster: BattleStack, spellId: SpellId,
): Array<Omit<CastAction, 'type'>> {
  const metadata = UNITS[caster.unitId].caster;
  if (!metadata) return [];
  const copy = cloneBattle(battle);
  const copiedCaster = copy.stacks.find((stack) => stack.id === caster.id)!;
  const template = heroFor(copy, caster.side) ?? copy.attackerHero;
  const plus = creatureResonances(copy, caster.side).includes(SPELLS[spellId].school);
  const source: BattleHero = { ...template, id: `creature:${caster.id}`,
    spellPower: metadata.castPower, mana: 999, manaMaximum: 999,
    knownSpells: [spellId], upgradedSpells: plus ? [spellId] : [], spellManaReductions: {}, skills: {},
    inventory: [], artifacts: emptyArtifacts(), debts: [] };
  if (caster.side === 'attacker') copy.attackerHero = source;
  else copy.defenderHero = source;
  copy.currentStackId = copiedCaster.id;
  copy.castRound[caster.side] = -1;
  const actions = legalSpellCasts(copy).filter((action) => action.spellId === spellId);
  const executable = spellId === 'bramblelash' && !plus
    ? actions.flatMap((action) => Array.from({ length: BATTLE_ROWS }, (_, y) =>
      Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y }))).flat()
      .map((position) => ({ ...action, positions: [position] }))
      .filter((action) => isP1PlacementCastLegal(copy, action)))
    : actions;
  return executable.map(({ type: _type, ...action }) => action);
}

export function castStoredSpell(
  battle: BattleState,
  side: BattleSide,
  action: CastAction,
  plus: boolean,
  recordAsLastSpell = true,
  manaSpent = 0, heroCast = true,
): void {
  const hero = heroFor(battle, side);
  if (!hero) throw new Error('This side has no hero');
  resolveSpellFace(battle, side, hero, action, plus, manaSpent, heroCast);
  if (recordAsLastSpell) {
    battle.lastSpellCast = { spellId: action.spellId, plus, manaSpent };
  }
  battle.spellCasts += 1;
  battle.spellCastsBySide[side] = (battle.spellCastsBySide[side] ?? 0) + 1;
}

export function castSpell(battle: BattleState, action: CastAction): void {
  const castingStackId = battle.currentStackId;
  const side = actorSide(battle);
  const hero = side ? heroFor(battle, side) : null;
  if (action.deflectTargetId || !side || !hero || !canBeginSpellCast(battle, action.spellId)) {
    throw new Error('Spell cannot be cast now');
  }
  const heroAct = canUseSpellAct(battle, side, action.spellId);
  if (isP1BoundedCastLegal(battle, action) === false) {
    throw new Error('Illegal P1 spell target, branch, placement, or granted-action cap');
  }
  const definition = SPELLS[action.spellId];
  if (!isSpellTargetLegal(battle, action)) return;
  const manaSpent = spellManaCost(battle, side, hero, action.spellId);
  const twister = definition.kind === 'twister';
  const firstTwicetold = skillRank(hero, 'twicetold') >= 1
    && !battle.twisterFreeUsed[side];
  const plus = isUpgraded(battle, hero, action.spellId)
    || (twister && skillRank(hero, 'twicetold') >= 2);
  const manaBefore = hero.mana;
  hero.mana -= manaSpent;
  const borrowed = hero.borrowedSpellIds?.includes(action.spellId) ?? false;
  const resolvingHero = borrowed
    ? { ...hero, spellPower: Math.floor(hero.spellPower / 2) } : hero;
  try {
    resolveSpellFace(battle, side, resolvingHero, action, plus, manaSpent);
  } catch (error) {
    hero.mana = manaBefore;
    throw error;
  }
  if (battle.pendingSpellDeflection) {
    battle.firstSpellTaxPaid[side] = true;
    if (firstTwicetold) battle.twisterFreeUsed[side] = true;
    consumeHeroAct(battle, side, heroAct);
    return;
  }
  const mirrorSide = enemySide(side);
  const mirror = battle.stacks.find((stack) => stack.side === mirrorSide
    && stack.count > 0 && stackHasAbility(stack, 'mirror_hex'));
  const upgradedStandingMirror = Boolean(mirror?.effects.some((effect) =>
    effect.spellId === 'standingMirror' && effect.magnitude >= 2));
  const mirrorHero = heroFor(battle, mirrorSide);
  const artifactMirror = Boolean(mirrorHero && !battle.mirrorArtifactUsed[mirrorSide]
    && hasEquippedArtifact(mirrorHero, 'mirrorshardPendant'));
  const mirrorEligibility = spellCopyEligibility(
    action.spellId, mirror ? 'standing-mirror' : 'mirrorshard',
    { allowTwisters: upgradedStandingMirror },
  );
  if ((mirror || artifactMirror) && mirrorHero && mirrorEligibility.ok) {
    const originalTarget = stackById(battle, action.targetId);
    if (mirror && upgradedStandingMirror && originalTarget) {
      const candidateSide = originalTarget.side === side ? mirrorSide : side;
      const legalTargetIds = battle.stacks.filter((candidate) => candidate.count > 0
        && candidate.side === candidateSide).sort((a, b) => a.slot - b.slot
          || a.id.localeCompare(b.id)).filter((candidate) => {
        try {
          const probe = cloneBattle(battle);
          const probeHero = heroFor(probe, mirrorSide)!;
          probe.spellResolutionSource = {
            kind: 'copy', spellPower: mirrorHero.spellPower,
            spellId: action.spellId, skippedRecipientIds: [],
          };
          resolveSpellFace(probe, mirrorSide, probeHero, {
            ...action, targetId: candidate.id, secondaryTargetId: undefined,
            artifactSecondTargetId: undefined, mirrorTargetId: undefined,
            mirrorSecondaryTargetId: undefined,
          }, plus, manaSpent, false);
          return !probe.pendingSpellDeflection;
        } catch { return false; }
      }).map((candidate) => candidate.id);
      if (legalTargetIds.length) {
        battle.pendingMirrorCopy = {
          chooserSide: mirrorSide, sourceSide: side, spellPower: mirrorHero.spellPower,
          action: { ...action }, plus, manaSpent, legalTargetIds,
        };
        battle.log.push(`Standing Mirror must choose where to copy ${definition.name}.`);
      }
    }
    if (!battle.pendingMirrorCopy) {
    const mirroredTarget = originalTarget
      ? battle.stacks.find((stack) => stack.count > 0
        && stack.side === (originalTarget.side === side ? mirrorSide : side))
      : undefined;
    const mirroredAction: CastAction = {
      ...action, targetId: mirroredTarget?.id, secondaryTargetId: undefined,
      replaceEnchantment: 0,
    };
    try {
      resolveSpellFace(battle, mirrorSide, mirrorHero, mirroredAction, plus, manaSpent, false);
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} copies ${definition.name}.`);
    } catch {
      battle.log.push(`${mirror ? 'Standing Mirror' : 'The Mirrorshard Pendant'} finds no legal reflection for ${definition.name}.`);
    }
    if (artifactMirror) {
      battle.mirrorArtifactUsed[mirrorSide] = true;
    }
    }
  }
  battle.firstSpellTaxPaid[side] = true;
  if (firstTwicetold) battle.twisterFreeUsed[side] = true;
  consumeHeroAct(battle, side, heroAct);
  battle.spellCasts += 1;
  battle.spellCastsBySide[side] = (battle.spellCastsBySide[side] ?? 0) + 1;
  battle.spellsCastAgainst[enemySide(side)].push(action.spellId);
  battle.lastSpellCast = { spellId: action.spellId, plus, manaSpent };
  activateGrantedCompanyAction(battle, 'immediate', battle.round, castingStackId);
  battle.log.push(`${definition.name}${plus ? '+' : ''} cast for ${manaSpent} mana.`);
}
