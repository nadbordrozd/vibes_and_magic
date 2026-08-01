import { UNITS } from '../../content/units';
import { SKILLS } from '../../content/skills';
import type {
  BattleSide, BattleStack, BattleState, CounterId, SpellId, TimedEffect,
} from '../types';
import { applyDamage, stackUnitHp } from './damage';
import { MORALE_THRESHOLD } from '../../content/constants';
import { artifactEffectTotal } from '../artifacts';
import { skillRank, specialtyHandler } from '../heroBehaviors';
import { burnApplicationBonus } from '../omens';
import { runTileHooks } from './tiles';
import { stackHexes, stacksAdjacent } from './footprint';

export const scaledDuration = (base: number, spellPower: number) =>
  base + Math.floor(spellPower / 6);
export const scaledCounter = (base: number, spellPower: number) =>
  base + Math.floor(spellPower / 5);
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
): void {
  stack.counters[counter] = Math.min(9, stack.counters[counter] + amount);
}

export function addBattleCounter(
  battle: BattleState,
  stack: BattleStack,
  counter: CounterId,
  amount: number,
  sourceSide?: BattleSide,
): void {
  if (effectOn(stack, 'oathbind')) return;
  const source = sourceSide === 'attacker' ? battle.attackerHero
    : sourceSide === 'defender' ? battle.defenderHero : null;
  const artifactBonus = source
    ? counter === 'burn' ? artifactEffectTotal(source, 'burn_application')
      : counter === 'hex' ? artifactEffectTotal(source, 'hex_application')
        + artifactEffectTotal(source, 'hex_duration') : 0
    : 0;
  const omenBonus = counter === 'burn' ? burnApplicationBonus(battle.omen) : 0;
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
    addCounter(redirect, counter, amount + artifactBonus + omenBonus);
    battle.log.push(`${counter} is redirected from ${stack.id} to ${redirect.id}.`);
    return;
  }
  addCounter(stack, counter, amount + artifactBonus + omenBonus);
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

export function grantMeter(stack: BattleStack, amount: number): void {
  stack.morale = Math.max(0, stack.morale + amount);
  const threshold = stack.meterThreshold ?? MORALE_THRESHOLD;
  while (stack.morale >= threshold) {
    stack.morale -= threshold;
    stack.bonusActions += 1;
  }
}

export function clearCounters(
  stack: BattleStack,
  battle?: BattleState,
): number {
  const removed = Object.values(stack.counters).reduce((sum, count) => sum + count, 0);
  stack.counters = { burn: 0, chill: 0, hex: 0, bloom: 0 };
  const hero = battle
    ? stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero
    : null;
  if (hero && skillRank(hero, 'curseEater') >= 2 && removed > 0) {
    grantMeter(stack, removed * SKILLS.curseEater.values.meterPerCounter);
  }
  return removed;
}

export function healWithoutResurrection(stack: BattleStack, percent: number): number {
  if (stack.count <= 0) return 0;
  const hp = stackUnitHp(stack);
  const before = stack.topHp;
  stack.topHp = Math.min(hp, stack.topHp + Math.ceil(stack.count * hp * percent / 100));
  return stack.topHp - before;
}

export function addTimedEffect(
  stack: BattleStack,
  spellId: SpellId,
  duration: number,
  magnitude: number,
  beneficial: boolean,
  sourceSide: BattleSide,
): TimedEffect {
  const effect: TimedEffect = {
    id: `${spellId}-${sourceSide}-${stack.id}-${stack.effects.length}`,
    spellId, duration, magnitude, beneficial, sourceSide,
  };
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

export function effectiveSpeed(stack: BattleStack): number {
  const quicksilver = effectOn(stack, 'quicksilver')?.magnitude ?? 0;
  return Math.max(
    1,
    UNITS[stack.unitId].speed + quicksilver
      + (stack.roundSpeedBonus ?? 0) + (stack.artifactSpeedBonus ?? 0)
      + (stack.specialtySpeedBonus ?? 0)
      + (stack.terrainSpeedBonus ?? 0)
      - stack.counters.chill,
  );
}

export function beginStackTurn(battle: BattleState, stack: BattleStack): void {
  if (stack.count <= 0) return;
  stack.countAtTurnStart = stack.count;
  const bounded = battle.stacks.some((enemy) => enemy.count > 0
    && enemy.side !== stack.side && UNITS[enemy.unitId].abilities.includes('boundary')
    && (stacksAdjacent(enemy, stack) || (() => {
      const enemyHero = enemy.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      return Boolean(enemyHero && specialtyHandler(enemyHero).diagonalBoundary?.()
        && stackHexes(enemy).some((a) => stackHexes(stack).some((b) =>
          Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1)));
    })()));
  if (bounded) stack.roundSpeedBonus = -(Math.ceil(effectiveSpeed(stack) / 2));
  const heatedMakerWall = battle.stacks.some((wall) => wall.count > 0
    && wall.side !== stack.side && UNITS[wall.unitId].abilities.includes('siege_wall')
    && wall.effects.some((effect) => effect.spellId === 'wallOfTheMaker'
      && effect.magnitude >= 2)
    && stacksAdjacent(wall, stack));
  if (heatedMakerWall) addBattleCounter(battle, stack, 'burn', 1,
    stack.side === 'attacker' ? 'defender' : 'attacker');
  const burn = stack.counters.burn;
  if (burn > 0) {
    const forgefire = enchantmentMultiplier(
      battle, stack.side === 'attacker' ? 'defender' : 'attacker', 'forgefire',
    );
    const damage = Math.max(burn, Math.ceil(totalStackHp(stack) * burn / 100))
      * (forgefire ? 2 * forgefire : 1);
    const kills = applyDamage(stack, damage);
    battle.casualties[stack.side][stack.unitId] =
      (battle.casualties[stack.side][stack.unitId] ?? 0) + kills;
    battle.log.push(`${UNITS[stack.unitId].name} suffers ${damage} Burn damage.`);
  }
  const bloom = stack.counters.bloom;
  if (bloom > 0) {
    const healed = healWithoutResurrection(stack, bloom);
    battle.log.push(`${UNITS[stack.unitId].name} Blooms for ${healed} HP.`);
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
  for (const counter of ['burn', 'chill', 'hex', 'bloom'] as CounterId[]) {
    if (counter === 'burn' && noBurnDecay) continue;
    const before = stack.counters[counter];
    stack.counters[counter] = Math.max(0, before - decay);
    removed += before - stack.counters[counter];
  }
  if (curseEater >= 2 && removed > 0) {
    grantMeter(stack, removed * SKILLS.curseEater.values.meterPerCounter);
  }
  for (const effect of stack.effects) effect.duration -= 1;
  stack.effects = stack.effects.filter((effect) => effect.duration > 0);
}
