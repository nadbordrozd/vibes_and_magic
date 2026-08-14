import { MIXED_FACTION_MORALE_PENALTY } from '../../content/constants';
import { UNITS } from '../../content/units';
import { SKILLS } from '../../content/skills';
import type { BattleStack, BattleState } from '../types';
import { stackHasAbility } from './abilities';
import { isAdjacent } from './hex';
import { stackIsOnField, stacksAdjacent } from './footprint';
import { effectiveSpeed } from './magicEffects';
import { addBattleCounter, grantSystemMeter, moraleLossPrevented } from './magicEffects';
import { commandMeter, specialtyHandler } from '../heroBehaviors';
import { skillRank } from '../heroBehaviors';
import { artifactEffectTotal, hasArtifactEffect } from '../artifacts';
import { roundMeterBonus } from '../omens';

export function turnOrder(stacks: BattleStack[], battle?: BattleState): string[] {
  return stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack)
    && !stackHasAbility(stack, 'siege_wall')
    && !stackHasAbility(stack, 'mirror_hex')).sort((a, b) => {
    if (stackHasAbility(a, 'slow_witted') !== stackHasAbility(b, 'slow_witted')) {
      return stackHasAbility(a, 'slow_witted') ? 1 : -1;
    }
    if (Boolean(a.actsFirst) !== Boolean(b.actsFirst)) return a.actsFirst ? -1 : 1;
    const speed = effectiveSpeed(b, battle) - effectiveSpeed(a, battle);
    if (speed) return speed;
    if (a.side !== b.side) return a.side === 'attacker' ? -1 : 1;
    return a.slot - b.slot;
  }).map((stack) => stack.id);
}

export function applyRoundMorale(battle: BattleState): void {
  const bonusBefore = new Map(battle.stacks.map((stack) => [stack.id, stack.bonusActions]));
  const mindlessMorale = new Map(battle.stacks.filter((stack) => stackHasAbility(stack, 'mindless'))
    .map((stack) => [stack.id, stack.morale]));
  for (const stack of battle.stacks) {
    stack.roundSpeedBonus = 0;
    stack.knackAttackBonus = 0;
    stack.actsFirst = false;
    stack.postAttackMovePoints = undefined;
    stack.retaliationsMade = 0;
  }
  // Counter doubling is seeded and stable. It is an operation on an existing pile, not an
  // application, so it fires no apply hooks and obeys the ordinary visible cap.
  for (const side of ['attacker', 'defender'] as const) {
    const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    if (!hero || !hasArtifactEffect(hero, 'random_counter_double')) continue;
    const candidates = battle.stacks.flatMap((stack) => stack.count > 0 && stack.side !== side
      ? (Object.keys(stack.counters) as Array<keyof typeof stack.counters>)
        .filter((counter) => stack.counters[counter] > 0)
        .map((counter) => ({ stack, counter })) : []);
    if (!candidates.length) continue;
    const hash = (battle.seed ?? 0) * 1103515245 + battle.round * 12345
      + (side === 'defender' ? 1 : 0);
    const chosen = candidates.sort((a, b) => a.stack.id.localeCompare(b.stack.id)
      || a.counter.localeCompare(b.counter))[Math.abs(hash) % candidates.length];
    chosen.stack.counters[chosen.counter] = Math.min(9,
      chosen.stack.counters[chosen.counter] * 2);
    battle.log.push(`An enemy ${chosen.counter} pile doubles to ${chosen.stack.counters[chosen.counter]}.`);
  }
  if (battle.round === 1) {
    for (const side of ['attacker', 'defender'] as const) {
      const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0
        && stackIsOnField(stack));
      const timingBonus = battle.timingSpeedBonus[side];
      if (timingBonus) {
        allies.forEach((stack) => {
          stack.roundSpeedBonus = (stack.roundSpeedBonus ?? 0) + timingBonus;
        });
      }
      const rank = hero ? skillRank(hero, 'vanguard') : 0;
      if (rank === 1) {
        const fastest = [...allies].sort((a, b) =>
          effectiveSpeed(b, battle) - effectiveSpeed(a, battle) || a.slot - b.slot)[0];
        if (fastest) {
          fastest.roundSpeedBonus = (fastest.roundSpeedBonus ?? 0)
            + SKILLS.vanguard.values.rank1Speed;
        }
      } else if (rank >= 2) {
        allies.forEach((stack) => {
          stack.roundSpeedBonus = (stack.roundSpeedBonus ?? 0)
            + SKILLS.vanguard.values.rank2Speed;
        });
      }
      if (rank === 3) {
        const chosen = allies.find((stack) => stack.id === battle.vanguardStack[side])
          ?? [...allies].sort((a, b) =>
            effectiveSpeed(b, battle) - effectiveSpeed(a, battle) || a.slot - b.slot)[0];
        if (chosen) chosen.actsFirst = true;
      }
      if (hero && skillRank(hero, 'tactician') >= 3 && hero.tacticianSlot !== null) {
        const designated = allies.find((stack) => stack.slot === hero.tacticianSlot);
        if (designated) designated.actsFirst = true;
      }
    }
  }
  for (const stack of battle.stacks) {
    if (stack.count <= 0 || !stackIsOnField(stack)) continue;
    const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    const factions = new Set(
      battle.stacks.filter((other) => other.side === stack.side && other.count > 0
        && stackIsOnField(other))
        .map((other) => UNITS[other.unitId].faction),
    );
    const allies = battle.stacks.filter(
      (other) => other.side === stack.side && other.count > 0 && stackIsOnField(other),
    );
    const bannerCount = allies.filter(
      (other) => stackHasAbility(other, 'banner')
        && stacksAdjacent(other, stack),
    ).length;
    const bannerAmount = hero
      ? specialtyHandler(hero).bannerMeter?.() ?? 10 : 10;
    const bannerGain = bannerCount * bannerAmount;
    const dreadLoss = battle.stacks.filter((other) => other.count > 0 && stackIsOnField(other)
      && other.side !== stack.side && stackHasAbility(other, 'dread')
      && stacksAdjacent(other, stack)).length * 10;
    const hearths = allies.filter((other) => other.id !== stack.id
      && stackHasAbility(other, 'hearth') && stacksAdjacent(other, stack)).length;
    if (hearths) addBattleCounter(battle, stack, 'bloom', hearths, stack.side,
      { fixedAmount: true });
    const oriflammeGain = allies.some(
      (other) => stackHasAbility(other, 'oriflamme'),
    ) ? 5 : 0;
    const warDrumGain = allies.some((other) => stackHasAbility(other, 'war_drums'))
      && stack.count < (stack.countAtTurnStart ?? stack.count)
      ? 10 * battle.recentDestructionScale[stack.side] : 0;
    const roundGain = (hero?.moraleBonus ?? 0)
        + bannerGain + oriflammeGain + warDrumGain + (hero ? commandMeter(hero) : 0)
        + (stack.side === 'defender' && battle.context.kind === 'castle' && hero
          ? specialtyHandler(hero).garrisonMeter?.() ?? 0 : 0)
        + (hero ? artifactEffectTotal(hero, 'round_meter') : 0)
        + roundMeterBonus(battle.omen)
        + (hero && artifactEffectTotal(hero, 'mixed_faction_meter') > 0
          ? factions.size * artifactEffectTotal(hero, 'mixed_faction_meter') : 0);
    const earlyDrum = hero && battle.round <= 2
      && artifactEffectTotal(hero, 'early_double_meter') > 0 ? 2 : 1;
    const roundLoss = dreadLoss
      + (factions.size > 1 && (!hero
          || (artifactEffectTotal(hero, 'mixed_faction_meter') === 0
            && skillRank(hero, 'quartermaster') < 2)
          && !allies.some((other) => stackHasAbility(other, 'standard_bearer')
            && stacksAdjacent(other, stack)))
        ? MIXED_FACTION_MORALE_PENALTY : 0);
    const net = roundGain * earlyDrum - roundLoss;
    grantSystemMeter(stack, moraleLossPrevented(battle, stack) ? roundGain * earlyDrum : net, battle);
    stack.countAtTurnStart = stack.count;
  }
  const triggered = battle.stacks.reduce(
    (sum, stack) => sum + Math.max(0, stack.bonusActions - (bonusBefore.get(stack.id) ?? 0)), 0,
  );
  if (triggered > 0) {
    battle.stacks.filter((stack) => stack.count > 0 && stackHasAbility(stack, 'rampant'))
      .forEach((stack) => {
        grantSystemMeter(stack, triggered * 15, battle);
      });
  }
  for (const side of ['attacker', 'defender'] as const) {
    const vigil = battle.enchantments[side].find(
      (effect) => effect.spellId === 'vigilOfTheHost',
    );
    if (!vigil) continue;
    [...battle.stacks].filter((stack) => stack.count > 0 && stack.side === side)
      .sort((a, b) => a.morale - b.morale || a.slot - b.slot)
      .slice(0, vigil.upgraded ? 2 : 1)
      .forEach((stack) => {
        grantSystemMeter(stack, 15 * vigil.multiplier, battle);
      });
  }
  battle.recentDestructionScale = { attacker: 1, defender: 1 };
  for (const stack of battle.stacks.filter((item) => stackHasAbility(item, 'mindless'))) {
    stack.morale = mindlessMorale.get(stack.id) ?? 0;
    stack.bonusActions = bonusBefore.get(stack.id) ?? 0;
  }
}
