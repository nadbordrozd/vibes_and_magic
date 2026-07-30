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
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    heroStart: { x: 3, y: 10 },
    heroStats: { attack: 2, defense: 2, spellPower: 1, knowledge: 1 },
    luck: 0,
    moraleBonus: 0,
    classWeights: { attack: 40, defense: 30, spellPower: 15, knowledge: 15 },
    startingArmy: [
      { unitId: 'militia', count: 20 },
      { unitId: 'berserker', count: 4 },
    ],
  },
  azure: {
    id: 'azure',
    name: 'Azure',
    heroStart: { x: 24, y: 10 },
    heroStats: { attack: 1, defense: 1, spellPower: 2, knowledge: 2 },
    luck: 0,
    moraleBonus: 0,
    classWeights: { attack: 15, defense: 15, spellPower: 40, knowledge: 30 },
    startingArmy: [
      { unitId: 'slinger', count: 20 },
      { unitId: 'frostAdept', count: 4 },
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
