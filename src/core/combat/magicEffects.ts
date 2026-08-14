import { UNITS } from '../../content/units';
import { SKILLS } from '../../content/skills';
import type {
  BattleSide, BattleStack, BattleState, CounterId, SpellId, TimedEffect,
} from '../types';
import { stackUnitHp } from './damage';
import { MORALE_THRESHOLD } from '../../content/constants';
import { artifactEffectTotal, hasArtifactEffect, hasArtifactSetBonus } from '../artifacts';
import { skillRank, specialtyHandler } from '../heroBehaviors';
import { burnApplicationBonus } from '../omens';
import { runTileHooks } from './tiles';
import { applyRoutedCombatDamage } from './damageRouting';
import { stackHexes, stacksAdjacent } from './footprint';
import { stackHasAbility } from './abilities';
import { counterImmunity, spellCounterBonus, spellRecipientAllowed } from './creatureTraits';

export const scaledDuration = (base: number, spellPower: number) =>
  base + Math.floor(spellPower / 6);
export const scaledCounter = (base: number, spellPower: number, divisor = 5) =>
  base + Math.floor(spellPower / divisor);
export const scaledPercent = (base: number, spellPower: number) =>
  base + Math.floor(spellPower / 2);

export function totalStackHp(stack: BattleStack): number {
  return stack.count <= 0 ? 0
    : (stack.count - 1) * stackUnitHp(stack) + stack.topHp;
}

export function addCounter(
  stack: BattleStack,
  counter: CounterId,
  amount: number,
  cap = 9,
): void {
  stack.counters[counter] = Math.min(cap, stack.counters[counter] + amount);
}

export function clearCounterPile(stack: BattleStack, counter: CounterId): void {
  stack.counters[counter] = 0;
  if (stack.counterSources) delete stack.counterSources[counter];
  if (stack.counterDecayDelayed) delete stack.counterDecayDelayed[counter];
}

export function addBattleCounter(
  battle: BattleState,
  stack: BattleStack,
  counter: CounterId,
  amount: number,
  sourceSide?: BattleSide,
  options: { fixedAmount?: boolean } = {},
): void {
  if (!spellRecipientAllowed(battle, stack)) return;
  if (effectOn(stack, 'oathbind')) return;
  if (counterImmunity(stack, counter)) {
    clearCounterPile(stack, counter);
    return;
  }
  if (counter === 'burn' && battle.stacks.some((other) => other.count > 0
      && stackHasAbility(other, 'quench') && stacksAdjacent(other, stack))) return;
  const source = battle.spellResolutionSource?.kind === 'creature' ? null
    : sourceSide === 'attacker' ? battle.attackerHero
    : sourceSide === 'defender' ? battle.defenderHero : null;
  const artifactBonus = source && !options.fixedAmount
    ? counter === 'burn' ? artifactEffectTotal(source, 'burn_application')
      : counter === 'hex' ? artifactEffectTotal(source, 'hex_application')
        + artifactEffectTotal(source, 'hex_duration') : 0
    : 0;
  const omenBonus = !options.fixedAmount && counter === 'burn' ? burnApplicationBonus(battle.omen) : 0;
  const tallyRank = source ? skillRank(source, 'tallykeeper') : 0;
  const enemyApplication = Boolean(sourceSide && sourceSide !== stack.side);
  const tallyBonus = !options.fixedAmount && tallyRank >= 1
    ? SKILLS.tallykeeper.values.application : 0;
  const frailBonus = !options.fixedAmount && battle.spellResolutionSource
    ? spellCounterBonus(stack) : 0;
  const artifactHexCap = source && counter === 'hex' && enemyApplication
    ? artifactEffectTotal(source, 'hex_cap') : 0;
  const cap = Math.min(15, Math.max(9,
    enemyApplication && tallyRank >= 3 ? SKILLS.tallykeeper.values.cap : 9,
    artifactHexCap));
  const afflictedHero = stack.side === 'attacker'
    ? battle.attackerHero : battle.defenderHero;
  const redirectId = battle.counterRedirectTarget[stack.side];
  const redirect = redirectId
    ? battle.stacks.find((candidate) => candidate.id === redirectId && candidate.count > 0)
    : null;
  if ((counter === 'burn' || counter === 'hex') && afflictedHero
      && skillRank(afflictedHero, 'curseEater') === 3
      && !battle.counterRedirectUsed[stack.side] && redirect) {
    battle.counterRedirectUsed[stack.side] = true;
    const before = redirect.counters[counter];
    addCounter(redirect, counter, amount + artifactBonus + omenBonus + tallyBonus + frailBonus, cap);
    const increased = redirect.counters[counter] > before;
    if (increased) {
      redirect.counterSources ??= {};
      if (sourceSide) redirect.counterSources[counter] = sourceSide;
      else delete redirect.counterSources[counter];
    }
    if (increased && sourceSide && sourceSide !== redirect.side && tallyRank >= 2) {
      redirect.counterDecayDelayed ??= {};
      redirect.counterDecayDelayed[counter] = true;
    }
    battle.log.push(`${counter} is redirected from ${stack.id} to ${redirect.id}.`);
    return;
  }
  const before = stack.counters[counter];
  addCounter(stack, counter, amount + artifactBonus + omenBonus + tallyBonus + frailBonus, cap);
  const increased = stack.counters[counter] > before;
  if (increased) {
    stack.counterSources ??= {};
    if (sourceSide) stack.counterSources[counter] = sourceSide;
    else delete stack.counterSources[counter];
  }
  if (increased && enemyApplication && tallyRank >= 2) {
    stack.counterDecayDelayed ??= {};
    stack.counterDecayDelayed[counter] = true;
  }
}

export interface SpellCounterOptions {
  /** Counter spells scale by default; set false only where the catalog explicitly opts out. */
  scalesWithSpellPower?: boolean;
}

export function addSpellCounter(
  battle: BattleState,
  stack: BattleStack,
  counter: CounterId,
  baseAmount: number,
  sourceSide: BattleSide,
  options: SpellCounterOptions = {},
): void {
  const hero = sourceSide === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const effectiveSpellPower = battle.spellResolutionSource?.spellPower ?? hero?.spellPower ?? 0;
  const divisor = hero && hasArtifactEffect(hero, 'counter_scaling')
    ? Math.max(1, artifactEffectTotal(hero, 'counter_scaling')) : 5;
  const amount = options.scalesWithSpellPower === false
    ? baseAmount : scaledCounter(baseAmount, effectiveSpellPower, divisor);
  addBattleCounter(battle, stack, counter,
    Math.floor(amount * (battle.spellResolutionSource?.magnitudeMultiplier ?? 1)), sourceSide);
}

export function chooseCounterRedirect(
  battle: BattleState,
  side: BattleSide,
  targetId: string,
): void {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const target = battle.stacks.find((stack) => stack.id === targetId && stack.count > 0);
  if (!hero || skillRank(hero, 'curseEater') !== 3 || !target
      || battle.counterRedirectUsed[side]) {
    throw new Error('Curse-Eater redirect is unavailable');
  }
  battle.counterRedirectTarget[side] = targetId;
}

function applyMeter(stack: BattleStack, amount: number, battle?: BattleState): void {
  if (stackHasAbility(stack, 'mindless')) return;
  if (amount < 0 && battle?.enchantments[stack.side].some((effect) =>
    effect.spellId === 'theLongOath')) return;
  stack.morale = Math.max(0, stack.morale + amount);
  const threshold = stack.meterThreshold ?? MORALE_THRESHOLD;
  while (stack.morale >= threshold) {
    stack.morale -= threshold;
    stack.bonusActions += 1;
  }
}

export function grantMeter(stack: BattleStack, amount: number, battle?: BattleState): void {
  if (battle && !spellRecipientAllowed(battle, stack)) return;
  applyMeter(stack, amount * (battle?.spellResolutionSource?.magnitudeMultiplier ?? 1), battle);
}

/** Applies a battle-system meter change without treating the stack as a spell recipient. */
export function grantSystemMeter(stack: BattleStack, amount: number, battle: BattleState): void {
  applyMeter(stack, amount, battle);
}

/** Shared morale-loss boundary. Long Oath prevents losses, but never blocks gains or spending a
 * completed morale threshold for its earned action. */
export function loseMeter(stack: BattleStack, amount: number, battle: BattleState): void {
  grantSystemMeter(stack, -Math.max(0, amount), battle);
}

export function moraleLossPrevented(battle: BattleState, stack: BattleStack): boolean {
  return battle.enchantments[stack.side].some((effect) => effect.spellId === 'theLongOath');
}

export function clearCounters(
  stack: BattleStack,
  battle?: BattleState,
): number {
  if (battle && !spellRecipientAllowed(battle, stack)) return 0;
  const removed = Object.values(stack.counters).reduce((sum, count) => sum + count, 0);
  stack.counters = { burn: 0, chill: 0, hex: 0, bloom: 0 };
  stack.counterSources = {};
  stack.counterDecayDelayed = {};
  const hero = battle
    ? stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero
    : null;
  if (hero && skillRank(hero, 'curseEater') >= 2 && removed > 0) {
    grantMeter(stack, removed * SKILLS.curseEater.values.meterPerCounter);
  }
  return removed;
}

export function healWithoutResurrection(
  stack: BattleStack, percent: number, battle?: BattleState,
): number {
  if (battle && !spellRecipientAllowed(battle, stack)) return 0;
  if (stack.count <= 0) return 0;
  const hp = stackUnitHp(stack);
  const before = stack.topHp;
  const hero = battle ? (stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero) : null;
  let adjusted = hero && battle?.spellResolutionSource && hasArtifactEffect(hero, 'heal_bonus')
    ? percent * (1 + artifactEffectTotal(hero, 'heal_bonus', 'percent') / 100) : percent;
  adjusted *= battle?.spellResolutionSource?.magnitudeMultiplier ?? 1;
  stack.topHp = Math.min(hp, stack.topHp + Math.ceil(stack.count * hp * adjusted / 100));
  return stack.topHp - before;
}

export function addTimedEffect(
  stack: BattleStack,
  spellId: SpellId,
  duration: number,
  magnitude: number,
  beneficial: boolean,
  sourceSide: BattleSide,
  battle?: BattleState,
): TimedEffect {
  const effect: TimedEffect = {
    id: `${spellId}-${sourceSide}-${stack.id}-${stack.effects.length}`,
    spellId, duration, magnitude: magnitude * (battle?.spellResolutionSource?.magnitudeMultiplier ?? 1),
    beneficial, sourceSide,
  };
  if (battle && !spellRecipientAllowed(battle, stack)) return effect;
  if (spellId !== 'oathbind' && effectOn(stack, 'oathbind')) return effect;
  stack.effects.push(effect);
  return effect;
}

export function effectOn(stack: BattleStack, spellId: SpellId): TimedEffect | undefined {
  return stack.effects.find((effect) => effect.spellId === spellId && effect.duration > 0);
}

export function enchantmentMultiplier(
  battle: BattleState,
  side: BattleSide,
  spellId: SpellId,
): number {
  return battle.enchantments[side].find((effect) => effect.spellId === spellId)
    ?.multiplier ?? 0;
}

export function effectiveSpeed(stack: BattleStack, battle?: BattleState): number {
  const quicksilver = effectOn(stack, 'quicksilver')?.magnitude ?? 0;
  const steadyHands = stack.effects.some((effect) =>
    effect.spellId === 'steadyHands' && effect.magnitude === 1) ? 1 : 0;
  const hedgerow = battle?.enchantments[stack.side].find((effect) =>
    effect.spellId === 'hedgerowMarch');
  const hedgerowSpeed = hedgerow ? (hedgerow.upgraded ? 2 : 1) : 0;
  const sap = stack.effects.find((effect) => effect.spellId === 'sapAndSinew');
  const sapSpeed = sap ? Number(sap.id.match(/:speed-(\d+)/)?.[1] ?? 0) : 0;
  const speedBonuses = stack.effects.some((effect) => effect.spellId === 'nettle'
    && effect.id.includes(':no-speed-bonus')) ? 0
    : quicksilver + steadyHands + hedgerowSpeed + sapSpeed
      + (stack.roundSpeedBonus ?? 0) + (stack.artifactSpeedBonus ?? 0)
      + (stack.specialtySpeedBonus ?? 0) + (stack.terrainSpeedBonus ?? 0)
      + (stack.summonSpeedBonus ?? 0);
  const artifactHero = battle && (stack.side === 'attacker'
    ? battle.attackerHero : battle.defenderHero);
  const setSpeed = artifactHero && hasArtifactSetBonus(artifactHero, 'droversKit', 2)
    && UNITS[stack.unitId].abilities.includes('beast') ? 2 : 0;
  const beastSovereignSpeed = battle && stackHasAbility(stack, 'beast')
    && battle.enchantments[stack.side].some((effect) => effect.spellId === 'beastSovereign')
    ? 2 : 0;
  return Math.max(
    1,
    UNITS[stack.unitId].speed + speedBonuses + setSpeed + beastSovereignSpeed - stack.counters.chill,
  );
}

export function beginStackTurn(battle: BattleState, stack: BattleStack): void {
  if (stack.count <= 0) return;
  const inheritance = battle.inheritedArtifactStats[stack.side];
  if (inheritance) {
    stack.artifactAttackBonus = (stack.artifactAttackBonus ?? 0) + inheritance.attack;
    stack.artifactDefenseBonus = (stack.artifactDefenseBonus ?? 0) + inheritance.defense;
    battle.inheritedArtifactStats[stack.side] = null;
    battle.log.push(`${UNITS[stack.unitId].name} inherits ${inheritance.attack} Attack and ${inheritance.defense} Defense.`);
  }
  if (stack.burrowReturnRound && battle.round >= stack.burrowReturnRound) {
    battle.pendingFreeMove = { side: stack.side, sourceId: stack.id, targetId: stack.id,
      anywhere: true, label: `${UNITS[stack.unitId].name} returns from below.` };
    stack.burrowReturnRound = undefined;
  }
  stack.countAtTurnStart = stack.count;
  if (stack.abilityUses?.counter_eater !== undefined) {
    stack.abilityUses = { ...stack.abilityUses, counter_eater: 0 };
  }
  if (stackHasAbility(stack, 'counter_eater')) {
    let consumed = 0;
    for (const counter of ['burn', 'chill', 'hex', 'bloom'] as CounterId[]) {
      if (stack.counters[counter] > 0) {
        stack.counters[counter] -= 1;
        consumed += 1;
      }
    }
    stack.abilityUses = { ...stack.abilityUses, counter_eater: consumed };
    if (consumed) battle.log.push(`${UNITS[stack.unitId].name} consumes ${consumed} counters.`);
  }
  const bounded = battle.stacks.some((enemy) => enemy.count > 0
    && enemy.side !== stack.side && UNITS[enemy.unitId].abilities.includes('boundary')
    && (stacksAdjacent(enemy, stack) || (() => {
      const enemyHero = enemy.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      return Boolean(enemyHero && specialtyHandler(enemyHero).diagonalBoundary?.()
        && stackHexes(enemy).some((a) => stackHexes(stack).some((b) =>
          Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1)));
    })()));
  if (bounded) stack.roundSpeedBonus = -(Math.ceil(effectiveSpeed(stack, battle) / 2));
  const heatedMakerWall = battle.stacks.some((wall) => wall.count > 0
    && wall.side !== stack.side && UNITS[wall.unitId].abilities.includes('siege_wall')
    && wall.effects.some((effect) => effect.spellId === 'wallOfTheMaker'
      && effect.magnitude >= 2)
    && stacksAdjacent(wall, stack));
  if (heatedMakerWall) addSpellCounter(battle, stack, 'burn', 1,
    stack.side === 'attacker' ? 'defender' : 'attacker');
  const burn = stack.counters.burn;
  if (burn > 0) {
    const forgefire = enchantmentMultiplier(
      battle, stack.side === 'attacker' ? 'defender' : 'attacker', 'forgefire',
    );
    const damage = Math.max(burn, Math.ceil(totalStackHp(stack) * burn / 100))
      * (forgefire ? 2 * forgefire : 1);
    applyRoutedCombatDamage(battle, stack, damage);
    battle.log.push(`${UNITS[stack.unitId].name} suffers ${damage} Burn damage.`);
  }
  const bloom = stack.counters.bloom;
  if (bloom > 0) {
    const healed = healWithoutResurrection(stack, bloom);
    battle.log.push(`${UNITS[stack.unitId].name} Blooms for ${healed} HP.`);
    if (healed > 0 && stackHasAbility(stack, 'bloomshare')) {
      battle.stacks.filter((ally) => ally.count > 0 && ally.side === stack.side
        && ally.id !== stack.id && stacksAdjacent(ally, stack))
        .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))
        .forEach((ally) => {
          const hp = stackUnitHp(ally);
          ally.topHp = Math.min(hp, ally.topHp + Math.ceil(healed / 2));
        });
    }
  }
  runTileHooks(battle, 'on-turn-start', stack);
}

export function endStackTurn(battle: BattleState, stack: BattleStack): void {
  const enemy = stack.side === 'attacker' ? 'defender' : 'attacker';
  const noBurnDecay = battle.enchantments[enemy].some(
    (effect) => effect.spellId === 'forgefire' && effect.upgraded,
  );
  const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const curseEater = hero ? skillRank(hero, 'curseEater') : 0;
  const decay = curseEater >= 1 ? SKILLS.curseEater.values.decay : 1;
  let removed = 0;
  const pall = stack.effects.find((effect) => effect.spellId === 'ashenPall'
    && effect.id.includes(':no-next-decay'));
  for (const counter of ['burn', 'chill', 'hex', 'bloom'] as CounterId[]) {
    if (stack.counters[counter] <= 0) {
      clearCounterPile(stack, counter);
      continue;
    }
    if (pall) continue;
    if (stack.counterDecayDelayed?.[counter]) {
      stack.counterDecayDelayed[counter] = false;
      continue;
    }
    if (counter === 'bloom' && stack.effects.some((effect) =>
      effect.spellId === 'verdantSurge' && effect.id.includes(':no-bloom-decay'))) continue;
    const sourceSide = stack.counterSources?.[counter];
    const sourceHero = sourceSide === 'attacker' ? battle.attackerHero
      : sourceSide === 'defender' ? battle.defenderHero : null;
    if (counter === 'burn' && (noBurnDecay || Boolean(sourceHero
      && hasArtifactEffect(sourceHero, 'burn_no_decay')))) continue;
    if (hero && (hasArtifactEffect(hero, 'friendly_counter_no_decay')
        || (counter === 'hex' && hasArtifactSetBonus(hero, 'mournersSuit', 2)))) continue;
    const before = stack.counters[counter];
    stack.counters[counter] = Math.max(0, before - decay);
    removed += before - stack.counters[counter];
    if (stack.counters[counter] === 0) clearCounterPile(stack, counter);
  }
  if (pall) stack.effects = stack.effects.filter((effect) => effect.id !== pall.id);
  if (curseEater >= 2 && removed > 0) {
    grantMeter(stack, removed * SKILLS.curseEater.values.meterPerCounter);
  }
  for (const effect of stack.effects) {
    if (!effect.id.includes(':round-duration')) effect.duration -= 1;
  }
  stack.effects = stack.effects.filter((effect) => effect.duration > 0);
}
