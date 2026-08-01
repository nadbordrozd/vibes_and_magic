import {
  MIXED_FACTION_MORALE_PENALTY, MORALE_THRESHOLD,
} from '../../content/constants';
import { UNITS } from '../../content/units';
import { SKILLS } from '../../content/skills';
import type { BattleStack, BattleState } from '../types';
import { stackHasAbility } from './abilities';
import { isAdjacent } from './hex';
import { stacksAdjacent } from './footprint';
import { effectiveSpeed } from './magicEffects';
import { commandMeter, specialtyHandler } from '../heroBehaviors';
import { skillRank } from '../heroBehaviors';
import { artifactEffectTotal } from '../artifacts';
import { roundMeterBonus } from '../omens';

export function turnOrder(stacks: BattleStack[]): string[] {
  return stacks.filter((stack) => stack.count > 0
    && !stackHasAbility(stack, 'siege_wall')
    && !stackHasAbility(stack, 'mirror_hex')).sort((a, b) => {
    if (Boolean(a.actsFirst) !== Boolean(b.actsFirst)) return a.actsFirst ? -1 : 1;
    const speed = effectiveSpeed(b) - effectiveSpeed(a);
    if (speed) return speed;
    if (a.side !== b.side) return a.side === 'attacker' ? -1 : 1;
    return a.slot - b.slot;
  }).map((stack) => stack.id);
}

export function applyRoundMorale(battle: BattleState): void {
  const bonusBefore = new Map(battle.stacks.map((stack) => [stack.id, stack.bonusActions]));
  for (const stack of battle.stacks) {
    stack.roundSpeedBonus = 0;
    stack.actsFirst = false;
    stack.postAttackMovePoints = undefined;
    stack.retaliationsMade = 0;
  }
  if (battle.round === 1) {
    for (const side of ['attacker', 'defender'] as const) {
      const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
      const allies = battle.stacks.filter((stack) => stack.side === side && stack.count > 0);
      const timingBonus = battle.timingSpeedBonus[side];
      if (timingBonus) {
        allies.forEach((stack) => {
          stack.roundSpeedBonus = (stack.roundSpeedBonus ?? 0) + timingBonus;
        });
      }
      const rank = hero ? skillRank(hero, 'vanguard') : 0;
      if (rank === 1) {
        const fastest = [...allies].sort((a, b) =>
          effectiveSpeed(b) - effectiveSpeed(a) || a.slot - b.slot)[0];
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
            effectiveSpeed(b) - effectiveSpeed(a) || a.slot - b.slot)[0];
        if (chosen) chosen.actsFirst = true;
      }
    }
  }
  for (const stack of battle.stacks) {
    if (stack.count <= 0) continue;
    const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    const factions = new Set(
      battle.stacks.filter((other) => other.side === stack.side && other.count > 0)
        .map((other) => UNITS[other.unitId].faction),
    );
    const allies = battle.stacks.filter(
      (other) => other.side === stack.side && other.count > 0,
    );
    const bannerCount = allies.filter(
      (other) => stackHasAbility(other, 'banner')
        && stacksAdjacent(other, stack),
    ).length;
    const bannerAmount = hero
      ? specialtyHandler(hero).bannerMeter?.() ?? 10 : 10;
    const bannerGain = bannerCount * bannerAmount;
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
    stack.morale = Math.max(
      0,
      stack.morale + roundGain * earlyDrum
        - (factions.size > 1 && (!hero
          || artifactEffectTotal(hero, 'mixed_faction_meter') === 0)
          ? MIXED_FACTION_MORALE_PENALTY : 0),
    );
    const threshold = stack.meterThreshold ?? MORALE_THRESHOLD;
    while (stack.morale >= threshold) {
      stack.morale -= threshold;
      stack.bonusActions += 1;
    }
    stack.countAtTurnStart = stack.count;
  }
  const triggered = battle.stacks.reduce(
    (sum, stack) => sum + Math.max(0, stack.bonusActions - (bonusBefore.get(stack.id) ?? 0)), 0,
  );
  if (triggered > 0) {
    battle.stacks.filter((stack) => stack.count > 0 && stackHasAbility(stack, 'rampant'))
      .forEach((stack) => {
        stack.morale += triggered * 15;
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
        stack.morale += 15 * vigil.multiplier;
      });
  }
  battle.recentDestructionScale = { attacker: 1, defender: 1 };
}
