import { MAX_ARMY_SLOTS, MAX_HERO_ARMY_SLOTS } from '../content/constants';
import { ARTIFACTS } from '../content/artifacts';
import { UNITS } from '../content/units';
import type {
  AbilityId, Army, ArmyStack, Hero, HeroArtifacts, ResourceCost, Resources,
  SecondarySkillId, SkillRank, UnitId,
} from './types';

const STRENGTH_STAT_DIVISOR = 40;
const STRENGTH_SPEED_STEP = 0.04;
const STRENGTH_MIN_SPEED_DELTA = -3;
const STRENGTH_MAX_SPEED_DELTA = 6;
export const STRENGTH_ABILITY_MULTIPLIER_MIN = 0.85;
export const STRENGTH_ABILITY_MULTIPLIER_MAX = 1.35;

/**
 * Only abilities with a stable, broadly applicable combat-value direction belong here. The sum is
 * deliberately bounded so an ability tag can refine the stat estimate without dominating it.
 */
export const STRENGTH_ABILITY_ADJUSTMENTS: Readonly<Partial<Record<AbilityId, number>>> = {
  ranged: 0.15,
  flying: 0.05,
  no_retaliation: 0.08,
  soft_body: 0.06,
  still_on_watch: 0.08,
  full_heal: 0.25,
  melee_reflect: 0.25,
  immobile: -0.15,
  sniper: 0.08,
  first_strike: 0.10,
  phalanx: 0.06,
  spell_shrug: 0.05,
  all_adjacent: 0.20, breath: 0.12, line_strike: 0.10, cleave: 0.08,
  blast_shot: 0.12, arc_shot: 0.10, warded_hide: 0.06,
  low_magic_immune: 0.08, spellbound: 0.05, caster: 0.10,
  spell_frail: -0.06, slow_witted: -0.10, hungry: -0.05,
  mindless: -0.04, brittle_bones: -0.06,
};

export function abilityStrengthMultiplier(abilities: readonly AbilityId[]): number {
  const adjustment = abilities.reduce(
    (sum, ability) => sum + (STRENGTH_ABILITY_ADJUSTMENTS[ability] ?? 0), 0,
  );
  return Math.max(STRENGTH_ABILITY_MULTIPLIER_MIN,
    Math.min(STRENGTH_ABILITY_MULTIPLIER_MAX, 1 + adjustment));
}

export function emptyArmy(): Army {
  return Array.from({ length: MAX_ARMY_SLOTS }, () => null);
}

export interface HeroArmyCapacitySource {
  skills?: Partial<Record<SecondarySkillId, SkillRank>>;
  artifacts?: Pick<HeroArtifacts, 'equipment'>;
}

export function deriveHeroArmyCapacity({
  quartermasterRank = 0,
  artifactSlotBonus = 0,
}: {
  quartermasterRank?: number;
  artifactSlotBonus?: number;
} = {}): number {
  const quartermasterBonus = quartermasterRank >= 1 ? 1 : 0;
  const printedArtifactBonus = Number.isFinite(artifactSlotBonus)
    ? Math.max(0, Math.floor(artifactSlotBonus)) : 0;
  return Math.min(MAX_HERO_ARMY_SLOTS,
    MAX_ARMY_SLOTS + quartermasterBonus + printedArtifactBonus);
}

/** The single rules-owned capacity selector. Capacity is derived, never serialized separately. */
export function heroArmyCapacity(hero: HeroArmyCapacitySource): number {
  const artifactSlotBonus = hero.artifacts
    ? Object.values(hero.artifacts.equipment).reduce((sum, item) => {
      if (!item) return sum;
      const definition = ARTIFACTS[item.id];
      return sum + (definition?.effects.includes('army_slot_bonus')
        ? Math.max(1, Math.floor(definition.values?.amount ?? 1)) : 0);
    }, 0) : 0;
  return deriveHeroArmyCapacity({
    quartermasterRank: hero.skills?.quartermaster ?? 0,
    artifactSlotBonus,
  });
}

export function armyFitsCapacity(army: Army, capacity: number): boolean {
  return army.slice(capacity).every((stack) => !stack || stack.count <= 0);
}

export function assertHeroArmyFitsCapacity(
  army: Army, source: HeroArmyCapacitySource,
): void {
  const capacity = heroArmyCapacity(source);
  if (!armyFitsCapacity(army, capacity)) {
    throw new Error(`Army capacity cannot shrink to ${capacity} while higher slots are occupied`);
  }
}

/** Resizes only after overflow has been rejected, so no company can be truncated. */
export function synchronizeHeroArmyCapacity(hero: Pick<Hero,
  'army' | 'skills' | 'artifacts' | 'tacticianSlot'>): void {
  const capacity = heroArmyCapacity(hero);
  assertHeroArmyFitsCapacity(hero.army, hero);
  if (hero.army.length < capacity) {
    hero.army.push(...Array.from({ length: capacity - hero.army.length }, () => null));
  } else if (hero.army.length > capacity) {
    hero.army.length = capacity;
  }
  if (hero.tacticianSlot !== null && hero.tacticianSlot >= capacity) {
    hero.tacticianSlot = null;
  }
}

/** Safe mutation boundary for the only skill that changes army capacity. */
export function setQuartermasterRank(
  hero: Pick<Hero, 'army' | 'skills' | 'artifacts' | 'tacticianSlot'>,
  rank: SkillRank | undefined,
): void {
  const skills = { ...hero.skills, quartermaster: rank };
  assertHeroArmyFitsCapacity(hero.army, { ...hero, skills });
  if (rank === undefined) delete hero.skills.quartermaster;
  else hero.skills.quartermaster = rank;
  synchronizeHeroArmyCapacity(hero);
}

export function makeArmy(stacks: ArmyStack[], capacity = MAX_ARMY_SLOTS): Army {
  const safeCapacity = Math.max(MAX_ARMY_SLOTS, Math.min(MAX_HERO_ARMY_SLOTS, capacity));
  const army: Army = Array.from({ length: safeCapacity }, () => null);
  stacks.slice(0, safeCapacity).forEach((stack, index) => {
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
  const result = Array.from({
    length: Math.max(MAX_ARMY_SLOTS, Math.min(MAX_HERO_ARMY_SLOTS, army.length)),
  }, () => null) as Army;
  [...merged.entries()].forEach(([unitId, count], index) => { result[index] = { unitId, count }; });
  return result;
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
