import type { BuildingId, ResourceCost } from '../core/types';

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  cost: ResourceCost;
  prerequisite?: BuildingId;
}

export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  townHall: { id: 'townHall', name: 'Town Hall', cost: {} },
  dwelling1: { id: 'dwelling1', name: 'Tier 1 Dwelling', cost: {} },
  dwelling2: {
    id: 'dwelling2', name: 'Tier 2 Dwelling',
    cost: { gold: 1200, timber: 3 },
  },
  dwelling3: {
    id: 'dwelling3', name: 'Tier 3 Dwelling',
    cost: { gold: 2000, timber: 4, iron: 1 }, prerequisite: 'dwelling2',
  },
  dwelling4: {
    id: 'dwelling4', name: 'Tier 4 Dwelling',
    cost: { gold: 3200, timber: 4, iron: 3 }, prerequisite: 'dwelling3',
  },
  dwelling5: {
    id: 'dwelling5', name: 'Tier 5 Dwelling',
    cost: { gold: 5500, timber: 6, iron: 5 }, prerequisite: 'dwelling4',
  },
  treasury: {
    id: 'treasury', name: 'Treasury', cost: { gold: 2000, timber: 5 },
  },
  walls: {
    id: 'walls', name: 'Walls', cost: { gold: 1500, iron: 3 },
  },
  chapelOfTheBanner: {
    id: 'chapelOfTheBanner', name: 'Chapel of the Banner',
    cost: { gold: 1000, essence: 2 }, prerequisite: 'dwelling3',
  },
  guildWorkshop: {
    id: 'guildWorkshop', name: 'Guild Workshop',
    cost: { gold: 1200, essence: 2 }, prerequisite: 'dwelling3',
  },
  mageGuild1: {
    id: 'mageGuild1', name: 'Mage Guild I',
    cost: { gold: 1000, essence: 2 },
  },
  mageGuild2: {
    id: 'mageGuild2', name: 'Mage Guild II',
    cost: { gold: 1500, essence: 3 }, prerequisite: 'mageGuild1',
  },
  mageGuild3: {
    id: 'mageGuild3', name: 'Mage Guild III',
    cost: { gold: 2500, essence: 5 }, prerequisite: 'mageGuild2',
  },
};

export const AI_BUILD_ORDER: readonly BuildingId[] = [
  'treasury', 'mageGuild1', 'dwelling2', 'walls', 'dwelling3',
  'chapelOfTheBanner', 'guildWorkshop', 'dwelling4', 'dwelling5',
];

export function validateBuildings(): void {
  for (const building of Object.values(BUILDINGS)) {
    if (!building.name || Object.values(building.cost).some((amount) => amount! < 0)) {
      throw new Error(`Invalid building definition: ${building.id}`);
    }
    if (building.prerequisite && !BUILDINGS[building.prerequisite]) {
      throw new Error(`Unknown prerequisite: ${building.id}`);
    }
  }
}
