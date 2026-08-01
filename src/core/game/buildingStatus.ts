import type { BuildingId, Castle } from '../types';

export function buildingIsActive(castle: Castle, buildingId: BuildingId): boolean {
  return castle.buildings.includes(buildingId) && !castle.dormantBuildings[buildingId];
}
