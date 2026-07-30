import {
  MIXED_FACTION_MORALE_PENALTY, MORALE_THRESHOLD,
} from '../../content/constants';
import { UNITS } from '../../content/units';
import type { BattleStack, BattleState } from '../types';

export function turnOrder(stacks: BattleStack[]): string[] {
  return stacks.filter((stack) => stack.count > 0).sort((a, b) => {
    const speed = UNITS[b.unitId].speed - UNITS[a.unitId].speed;
    if (speed) return speed;
    if (a.side !== b.side) return a.side === 'attacker' ? -1 : 1;
    return a.slot - b.slot;
  }).map((stack) => stack.id);
}

export function applyRoundMorale(battle: BattleState): void {
  for (const stack of battle.stacks) {
    if (stack.count <= 0) continue;
    const hero = stack.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    const factions = new Set(
      battle.stacks.filter((other) => other.side === stack.side && other.count > 0)
        .map((other) => UNITS[other.unitId].faction),
    );
    stack.morale = Math.max(
      0,
      stack.morale + (hero?.moraleBonus ?? 0)
        - (factions.size > 1 ? MIXED_FACTION_MORALE_PENALTY : 0),
    );
    while (stack.morale >= MORALE_THRESHOLD) {
      stack.morale -= MORALE_THRESHOLD;
      stack.bonusActions += 1;
    }
  }
}
