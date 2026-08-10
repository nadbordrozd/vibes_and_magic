import { MAX_ARMY_SLOTS } from '../content/constants';
import { UNITS } from '../content/units';
import type {
  AbilityId, Army, ArmyStack, ResourceCost, Resources, UnitId,
} from './types';

const STRENGTH_STAT_DIVISOR = 40;
const STRENGTH_SPEED_STEP = 0.04;
const STRENGTH_MIN_SPEED_DELTA = -3;
const STRENGTH_MAX_SPEED_DELTA = 6;

/**
 * Only abilities with a stable, broadly applicable combat-value direction belong here. The sum is
 * deliberately bounded so an ability tag can refine the stat estimate without dominating it.
 */
const STRENGTH_ABILITY_ADJUSTMENTS: Partial<Record<AbilityId, number>> = {
  ranged: 0.15,
  flying: 0.05,
  no_retaliation: 0.08,
  soft_body: 0.06,
  still_on_watch: 0.08,
  full_heal: 0.25,
  melee_reflect: 0.25,
  immobile: -0.15,
};

function abilityStrengthMultiplier(abilities: readonly AbilityId[]): number {
  const adjustment = abilities.reduce(
    (sum, ability) => sum + (STRENGTH_ABILITY_ADJUSTMENTS[ability] ?? 0), 0,
  );
  return Math.max(0.85, Math.min(1.35, 1 + adjustment));
}

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

export function unitStrength(unitId: UnitId): number {
  const unit = UNITS[unitId];
  const averageDamage = Math.max(1, (unit.damage[0] + unit.damage[1]) / 2);
  const statMultiplier = 1 + (unit.attack + unit.defense) / STRENGTH_STAT_DIVISOR;
  const speedDelta = Math.max(
    STRENGTH_MIN_SPEED_DELTA,
    Math.min(STRENGTH_MAX_SPEED_DELTA, unit.speed - 5),
  );
  const speedMultiplier = 1 + speedDelta * STRENGTH_SPEED_STEP;
  return Math.sqrt(unit.hp * averageDamage)
    * statMultiplier * speedMultiplier * abilityStrengthMultiplier(unit.abilities);
}

export function armyPower(army: Army): number {
  return army.reduce(
    (sum, stack) => sum + (stack ? stack.count * unitStrength(stack.unitId) : 0), 0,
  );
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
