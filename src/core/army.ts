import { MAX_ARMY_SLOTS } from '../content/constants';
import { UNITS } from '../content/units';
import type { Army, ArmyStack, ResourceCost, Resources, UnitId } from './types';

export function emptyArmy(): Army {
  return Array.from({ length: MAX_ARMY_SLOTS }, () => null);
}

export function makeArmy(stacks: ArmyStack[]): Army {
  const army = emptyArmy();
  stacks.slice(0, MAX_ARMY_SLOTS).forEach((stack, index) => {
    army[index] = { ...stack };
  });
  return army;
}

export function compactArmy(army: Army): Army {
  const merged = new Map<UnitId, number>();
  for (const stack of army) {
    if (stack && stack.count > 0) {
      merged.set(stack.unitId, (merged.get(stack.unitId) ?? 0) + stack.count);
    }
  }
  return makeArmy(
    [...merged.entries()].map(([unitId, count]) => ({ unitId, count })),
  );
}

export function addUnits(army: Army, unitId: UnitId, count: number): Army | null {
  if (count <= 0) return [...army];
  const copy = army.map((stack) => stack ? { ...stack } : null);
  const existing = copy.find((stack) => stack?.unitId === unitId);
  if (existing) {
    existing.count += count;
    return copy;
  }
  const empty = copy.findIndex((stack) => stack === null);
  if (empty === -1) return null;
  copy[empty] = { unitId, count };
  return copy;
}

export function armyAlive(army: Army): boolean {
  return army.some((stack) => stack !== null && stack.count > 0);
}

export function armyPower(army: Army): number {
  return army.reduce((sum, stack) => {
    if (!stack) return sum;
    const unit = UNITS[stack.unitId];
    return sum + stack.count * unit.hp * ((unit.damage[0] + unit.damage[1]) / 2);
  }, 0);
}

export function canAfford(resources: Resources, cost: ResourceCost, count = 1): boolean {
  return Object.entries(cost).every(
    ([resource, amount]) =>
      resources[resource as keyof Resources] >= (amount ?? 0) * count,
  );
}

export function pay(resources: Resources, cost: ResourceCost, count = 1): Resources {
  const next = { ...resources };
  for (const [resource, amount] of Object.entries(cost)) {
    next[resource as keyof Resources] -= (amount ?? 0) * count;
  }
  return next;
}

export function countArmyUnits(army: Army): number {
  return army.reduce((sum, stack) => sum + (stack?.count ?? 0), 0);
}
