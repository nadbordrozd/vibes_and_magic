import type {
  ArmyStack, Coord, FactionId, PrimaryStat,
} from '../core/types';

export interface FactionDefinition {
  id: FactionId;
  name: string;
  flavor: string;
  heroStart: Coord;
  heroStats: Record<PrimaryStat, number>;
  luck: number;
  moraleBonus: number;
  classWeights: Record<PrimaryStat, number>;
  startingArmy: ArmyStack[];
  hireArmy: ArmyStack[];
  schools: readonly [
    'rite' | 'craft' | 'wild' | 'grave',
    'rite' | 'craft' | 'wild' | 'grave',
  ];
  passive: 'steadfast' | 'spare_parts' | 'unfinished_business'
    | 'render_down' | 'crooked_luck' | 'blood_price';
}

export const FACTIONS: Record<FactionId, FactionDefinition> = {
  hearthguard: {
    id: 'hearthguard',
    name: 'The Hearthguard',
    flavor: 'The old banner still means home, and home still answers.',
    heroStart: { x: 3, y: 10 },
    heroStats: { attack: 2, defense: 2, spellPower: 1, knowledge: 1 },
    luck: 0,
    moraleBonus: 5,
    classWeights: { attack: 35, defense: 35, spellPower: 10, knowledge: 20 },
    startingArmy: [
      { unitId: 'yeoman', count: 25 },
      { unitId: 'longbowman', count: 6 },
    ],
    hireArmy: [{ unitId: 'yeoman', count: 8 }],
    schools: ['rite', 'craft'], passive: 'steadfast',
  },
  woundWrights: {
    id: 'woundWrights',
    name: 'The Wound-Wrights',
    flavor: 'The sacred molds are kept, repaired, and never questioned.',
    heroStart: { x: 24, y: 10 },
    heroStats: { attack: 1, defense: 2, spellPower: 1, knowledge: 2 },
    luck: 0,
    moraleBonus: 0,
    classWeights: { attack: 20, defense: 35, spellPower: 15, knowledge: 30 },
    startingArmy: [
      { unitId: 'tinSoldier', count: 30 },
      { unitId: 'hobbyKnight', count: 4 },
    ],
    hireArmy: [{ unitId: 'tinSoldier', count: 10 }],
    schools: ['craft', 'grave'], passive: 'spare_parts',
  },
  unfinished: {
    id: 'unfinished', name: 'The Unfinished', heroStart: { x: 3, y: 10 },
    flavor: 'They remain because something gentle remains undone.',
    heroStats: { attack: 1, defense: 2, spellPower: 2, knowledge: 1 },
    luck: 0, moraleBonus: 0,
    classWeights: { attack: 15, defense: 25, spellPower: 30, knowledge: 30 },
    startingArmy: [
      { unitId: 'candleWisps', count: 32 }, { unitId: 'couriers', count: 5 },
    ],
    hireArmy: [{ unitId: 'candleWisps', count: 10 }],
    schools: ['rite', 'grave'], passive: 'unfinished_business',
  },
  vespiary: {
    id: 'vespiary', name: 'The Vespiary', heroStart: { x: 24, y: 10 },
    flavor: 'The Hive extends its courtesy to everything it can gather.',
    heroStats: { attack: 2, defense: 2, spellPower: 1, knowledge: 1 },
    luck: 0, moraleBonus: 0,
    classWeights: { attack: 25, defense: 30, spellPower: 25, knowledge: 20 },
    startingArmy: [
      { unitId: 'larvalTide', count: 36 }, { unitId: 'paperWaspLancers', count: 5 },
    ],
    hireArmy: [{ unitId: 'larvalTide', count: 12 }],
    schools: ['craft', 'wild'], passive: 'render_down',
  },
  hagwood: {
    id: 'hagwood', name: 'The Hagwood', heroStart: { x: 3, y: 10 },
    flavor: 'The wood is generous, provided the terms are remembered.',
    heroStats: { attack: 1, defense: 1, spellPower: 2, knowledge: 2 },
    luck: 0, moraleBonus: 0,
    classWeights: { attack: 10, defense: 15, spellPower: 40, knowledge: 35 },
    startingArmy: [
      { unitId: 'crowChorus', count: 28 }, { unitId: 'fencePostFamiliars', count: 6 },
    ],
    hireArmy: [{ unitId: 'crowChorus', count: 9 }],
    schools: ['wild', 'grave'], passive: 'crooked_luck',
  },
  wildergrass: {
    id: 'wildergrass', name: 'The Wildergrass Clans', heroStart: { x: 24, y: 10 },
    flavor: 'Hooves, ash, wind. Ride before the road decides.',
    heroStats: { attack: 2, defense: 1, spellPower: 1, knowledge: 1 },
    luck: 0, moraleBonus: 0,
    classWeights: { attack: 40, defense: 20, spellPower: 20, knowledge: 20 },
    startingArmy: [
      { unitId: 'outriders', count: 28 }, { unitId: 'drumCallers', count: 6 },
    ],
    hireArmy: [{ unitId: 'outriders', count: 9 }],
    schools: ['rite', 'wild'], passive: 'blood_price',
  },
};

export function validateFactions(): void {
  for (const faction of Object.values(FACTIONS)) {
    if (!faction.name || !faction.flavor.trim() || faction.startingArmy.length > 7) {
      throw new Error(`Invalid faction definition: ${faction.id}`);
    }
    if (Object.values(faction.classWeights).some((weight) => weight <= 0)) {
      throw new Error(`Invalid class weights: ${faction.id}`);
    }
  }
}
