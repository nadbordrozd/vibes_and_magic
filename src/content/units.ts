import type { FactionId, ResourceCost, UnitId } from '../core/types';

export type AbilityId = 'ranged' | 'flying';

export interface UnitDefinition {
  id: UnitId;
  name: string;
  faction: FactionId;
  tier: 1 | 2 | 3;
  hp: number;
  damage: readonly [number, number];
  attack: number;
  defense: number;
  speed: number;
  growth: number;
  cost: ResourceCost;
  abilities: readonly AbilityId[];
  shots?: number;
}

export const UNITS: Record<UnitId, UnitDefinition> = {
  militia: {
    id: 'militia', name: 'Militia', faction: 'crimson', tier: 1,
    hp: 6, damage: [1, 2], attack: 2, defense: 2, speed: 5,
    growth: 14, cost: { gold: 60 }, abilities: [],
  },
  berserker: {
    id: 'berserker', name: 'Berserker', faction: 'crimson', tier: 2,
    hp: 18, damage: [3, 5], attack: 6, defense: 4, speed: 6,
    growth: 8, cost: { gold: 200, iron: 1 }, abilities: [],
  },
  drake: {
    id: 'drake', name: 'Drake', faction: 'crimson', tier: 3,
    hp: 60, damage: [9, 14], attack: 11, defense: 10, speed: 8,
    growth: 3, cost: { gold: 700, iron: 2 }, abilities: ['flying'],
  },
  slinger: {
    id: 'slinger', name: 'Slinger', faction: 'azure', tier: 1,
    hp: 5, damage: [1, 3], attack: 3, defense: 1, speed: 4,
    growth: 14, cost: { gold: 70 }, abilities: ['ranged'], shots: 12,
  },
  frostAdept: {
    id: 'frostAdept', name: 'Frost Adept', faction: 'azure', tier: 2,
    hp: 14, damage: [3, 6], attack: 5, defense: 3, speed: 5,
    growth: 8, cost: { gold: 220, essence: 1 }, abilities: ['ranged'], shots: 10,
  },
  golem: {
    id: 'golem', name: 'Golem', faction: 'azure', tier: 3,
    hp: 70, damage: [8, 12], attack: 9, defense: 12, speed: 4,
    growth: 3, cost: { gold: 650, iron: 2 }, abilities: [],
  },
};

export const FACTION_UNITS: Record<FactionId, readonly UnitId[]> = {
  crimson: ['militia', 'berserker', 'drake'],
  azure: ['slinger', 'frostAdept', 'golem'],
};

export function validateUnits(): void {
  for (const unit of Object.values(UNITS)) {
    if (!unit.name || unit.hp <= 0 || unit.speed <= 0 || unit.growth <= 0) {
      throw new Error(`Invalid unit definition: ${unit.id}`);
    }
    if (unit.damage[0] > unit.damage[1]) {
      throw new Error(`Invalid damage range: ${unit.id}`);
    }
  }
}
