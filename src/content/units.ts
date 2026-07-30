import type {
  FactionId, ResourceCost, UnitId, UnitTier,
} from '../core/types';

export type AbilityId =
  | 'ranged' | 'banner' | 'charge' | 'oriflamme'
  | 'springloaded' | 'no_retaliation' | 'soft_body' | 'overwind';

export interface UnitDefinition {
  id: UnitId;
  name: string;
  faction: FactionId;
  tier: UnitTier;
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
  yeoman: {
    id: 'yeoman', name: 'Yeoman', faction: 'hearthguard', tier: 1,
    hp: 7, damage: [1, 2], attack: 2, defense: 3, speed: 5,
    growth: 17, cost: { gold: 70 }, abilities: [],
  },
  longbowman: {
    id: 'longbowman', name: 'Longbowman', faction: 'hearthguard', tier: 2,
    hp: 11, damage: [2, 4], attack: 5, defense: 3, speed: 4,
    growth: 9, cost: { gold: 180 }, abilities: ['ranged'], shots: 12,
  },
  bannerman: {
    id: 'bannerman', name: 'Bannerman', faction: 'hearthguard', tier: 3,
    hp: 26, damage: [4, 7], attack: 7, defense: 7, speed: 5,
    growth: 6, cost: { gold: 320, iron: 1 }, abilities: ['banner'],
  },
  lanceKnight: {
    id: 'lanceKnight', name: 'Lance Knight', faction: 'hearthguard', tier: 4,
    hp: 45, damage: [8, 13], attack: 10, defense: 9, speed: 8,
    growth: 4, cost: { gold: 650, iron: 1 }, abilities: ['charge'],
  },
  oriflammeWarden: {
    id: 'oriflammeWarden', name: 'Oriflamme Warden', faction: 'hearthguard', tier: 5,
    hp: 130, damage: [18, 28], attack: 14, defense: 14, speed: 6,
    growth: 2, cost: { gold: 1600, iron: 3 }, abilities: ['oriflamme'],
  },
  tinSoldier: {
    id: 'tinSoldier', name: 'Tin Soldier', faction: 'woundWrights', tier: 1,
    hp: 5, damage: [1, 3], attack: 3, defense: 2, speed: 5,
    growth: 12, cost: { gold: 55 }, abilities: [],
  },
  hobbyKnight: {
    id: 'hobbyKnight', name: 'Hobby Knight', faction: 'woundWrights', tier: 2,
    hp: 15, damage: [3, 4], attack: 5, defense: 4, speed: 7,
    growth: 9, cost: { gold: 210 }, abilities: ['springloaded'],
  },
  marionette: {
    id: 'marionette', name: 'Marionette', faction: 'woundWrights', tier: 3,
    hp: 12, damage: [6, 10], attack: 9, defense: 2, speed: 6,
    growth: 6, cost: { gold: 340, essence: 1 }, abilities: ['no_retaliation'],
  },
  stuffedSentinel: {
    id: 'stuffedSentinel', name: 'Stuffed Sentinel', faction: 'woundWrights', tier: 4,
    hp: 70, damage: [6, 9], attack: 7, defense: 13, speed: 4,
    growth: 4, cost: { gold: 600, iron: 1 }, abilities: ['soft_body'],
  },
  woodenColossus: {
    id: 'woodenColossus', name: 'Wooden Colossus', faction: 'woundWrights', tier: 5,
    hp: 150, damage: [15, 25], attack: 13, defense: 12, speed: 5,
    growth: 2, cost: { gold: 1500, iron: 2, essence: 1 }, abilities: ['overwind'],
  },
};

export const FACTION_UNITS: Record<FactionId, readonly UnitId[]> = {
  hearthguard: ['yeoman', 'longbowman', 'bannerman', 'lanceKnight', 'oriflammeWarden'],
  woundWrights: [
    'tinSoldier', 'hobbyKnight', 'marionette', 'stuffedSentinel', 'woodenColossus',
  ],
};

export function validateUnits(): void {
  for (const unit of Object.values(UNITS)) {
    if (!unit.name || unit.hp <= 0 || unit.speed <= 0 || unit.growth <= 0) {
      throw new Error(`Invalid unit definition: ${unit.id}`);
    }
    if (unit.damage[0] > unit.damage[1]) throw new Error(`Invalid damage range: ${unit.id}`);
  }
}
