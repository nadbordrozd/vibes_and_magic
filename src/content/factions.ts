import type {
  ArmyStack, Coord, FactionId, PrimaryStat,
} from '../core/types';

export interface FactionDefinition {
  id: FactionId;
  name: string;
  heroStart: Coord;
  heroStats: Record<PrimaryStat, number>;
  luck: number;
  moraleBonus: number;
  classWeights: Record<PrimaryStat, number>;
  startingArmy: ArmyStack[];
}

export const FACTIONS: Record<FactionId, FactionDefinition> = {
  hearthguard: {
    id: 'hearthguard',
    name: 'The Hearthguard',
    heroStart: { x: 3, y: 10 },
    heroStats: { attack: 2, defense: 2, spellPower: 1, knowledge: 1 },
    luck: 0,
    moraleBonus: 5,
    classWeights: { attack: 35, defense: 35, spellPower: 10, knowledge: 20 },
    startingArmy: [
      { unitId: 'yeoman', count: 25 },
      { unitId: 'longbowman', count: 6 },
    ],
  },
  woundWrights: {
    id: 'woundWrights',
    name: 'The Wound-Wrights',
    heroStart: { x: 24, y: 10 },
    heroStats: { attack: 1, defense: 2, spellPower: 1, knowledge: 2 },
    luck: 0,
    moraleBonus: 0,
    classWeights: { attack: 20, defense: 35, spellPower: 15, knowledge: 30 },
    startingArmy: [
      { unitId: 'tinSoldier', count: 30 },
      { unitId: 'hobbyKnight', count: 4 },
    ],
  },
};

export function validateFactions(): void {
  for (const faction of Object.values(FACTIONS)) {
    if (!faction.name || faction.startingArmy.length > 7) {
      throw new Error(`Invalid faction definition: ${faction.id}`);
    }
    if (Object.values(faction.classWeights).some((weight) => weight <= 0)) {
      throw new Error(`Invalid class weights: ${faction.id}`);
    }
  }
}
