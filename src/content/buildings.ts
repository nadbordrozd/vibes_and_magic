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
    cost: { gold: 1500, timber: 5 },
  },
  dwelling3: {
    id: 'dwelling3', name: 'Tier 3 Dwelling',
    cost: { gold: 3000, timber: 5, iron: 3 }, prerequisite: 'dwelling2',
  },
  treasury: {
    id: 'treasury', name: 'Treasury', cost: { gold: 2000, timber: 5 },
  },
  walls: {
    id: 'walls', name: 'Walls', cost: { gold: 1500, iron: 3 },
  },
};

export const AI_BUILD_ORDER: readonly BuildingId[] = [
  'treasury', 'dwelling2', 'walls', 'dwelling3',
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
