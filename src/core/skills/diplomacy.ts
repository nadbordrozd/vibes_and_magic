import { SKILLS } from '../../content/skills';
import { UNITS } from '../../content/units';
import {
  addUnits, armyPower, makeArmy,
} from '../army';
import { skillRank } from '../heroBehaviors';
import type {
  Hero, MapObject,
} from '../types';

type GuardedObject = Extract<
  MapObject, { kind: 'mine' | 'chest' | 'shrine' | 'lock' }
>;

export interface DiplomacyTerms {
  disbandCost: number;
  recruitCost: number | null;
}

function guardianGoldValue(object: GuardedObject): number {
  return object.guard?.army.reduce((sum, stack) =>
    sum + (UNITS[stack.unitId].cost.gold ?? 0) * stack.count, 0) ?? 0;
}

function guardianFits(hero: Hero, object: GuardedObject): boolean {
  let army = hero.army;
  for (const stack of object.guard?.army ?? []) {
    const next = addUnits(army, stack.unitId, stack.count);
    if (!next) return false;
    army = next;
  }
  return true;
}

export function diplomacyTerms(
  hero: Hero,
  object: GuardedObject,
): DiplomacyTerms | null {
  const rank = skillRank(hero, 'diplomacy');
  if (!rank || !object.guard) return null;
  const threshold = rank === 1
    ? SKILLS.diplomacy.values.rank1Threshold
    : SKILLS.diplomacy.values.rank2Threshold;
  if (armyPower(makeArmy(object.guard.army)) > armyPower(hero.army) * threshold) {
    return null;
  }
  const value = guardianGoldValue(object);
  return {
    disbandCost: value * SKILLS.diplomacy.values.disbandCost,
    recruitCost: rank === 2 && guardianFits(hero, object)
      ? value * SKILLS.diplomacy.values.recruitCost : null,
  };
}
