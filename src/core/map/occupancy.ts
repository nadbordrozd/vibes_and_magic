import { AGGRO_ADJACENCY } from '../../content/constants';
import type { Castle, Coord, GameMap, MapObject } from '../types';
import { coordKey, inBounds, sameCoord } from './pathfinding';

export const DEFAULT_FOOTPRINT = { w: 1, h: 1 } as const;
export const MINE_FOOTPRINT = { w: 2, h: 1 } as const;
export const DEFAULT_ENTRANCE = { dx: 0, dy: 0 } as const;

export function objectFootprint(object: MapObject): { w: number; h: number } {
  return object.footprint ?? (object.kind === 'mine' ? MINE_FOOTPRINT : DEFAULT_FOOTPRINT);
}

export function objectEntrance(object: MapObject): { dx: number; dy: number } {
  return object.entrance ?? (object.kind === 'mine' ? { dx: 0, dy: 1 } : DEFAULT_ENTRANCE);
}

export function footprintTiles(
  position: Coord, footprint: { w: number; h: number },
): Coord[] {
  return Array.from({ length: footprint.h }, (_, dy) =>
    Array.from({ length: footprint.w }, (_unused, dx) => ({
      x: position.x + dx, y: position.y + dy,
    }))).flat();
}

export function objectFootprintTiles(object: MapObject): Coord[] {
  return footprintTiles(object.position, objectFootprint(object));
}

export function objectEntranceTile(object: MapObject): Coord {
  const entrance = objectEntrance(object);
  return { x: object.position.x + entrance.dx, y: object.position.y + entrance.dy };
}

export function castleFootprintTiles(castle: Pick<Castle, 'position' | 'footprint'>): Coord[] {
  return footprintTiles(castle.position, castle.footprint);
}

export function castleEntrance(castle: Pick<Castle, 'position' | 'entrance'>): Coord {
  return { x: castle.position.x + castle.entrance.dx, y: castle.position.y + castle.entrance.dy };
}

export function guardianAggroTiles(
  guardian: Extract<MapObject, { kind: 'guardian' }>, map?: GameMap,
): Coord[] {
  const cardinal = [
    { x: guardian.position.x + 1, y: guardian.position.y },
    { x: guardian.position.x - 1, y: guardian.position.y },
    { x: guardian.position.x, y: guardian.position.y + 1 },
    { x: guardian.position.x, y: guardian.position.y - 1 },
  ];
  const diagonal = [
    { x: guardian.position.x + 1, y: guardian.position.y + 1 },
    { x: guardian.position.x - 1, y: guardian.position.y - 1 },
    { x: guardian.position.x + 1, y: guardian.position.y - 1 },
    { x: guardian.position.x - 1, y: guardian.position.y + 1 },
  ];
  return [...cardinal, ...(AGGRO_ADJACENCY === 8 ? diagonal : [])]
    .filter((coord) => !map || inBounds(map, coord));
}

export function guardianAt(map: GameMap, position: Coord) {
  return map.objects.find((object): object is Extract<MapObject, { kind: 'guardian' }> =>
    object.kind === 'guardian' && sameCoord(object.position, position));
}

export function guardiansCovering(map: GameMap, position: Coord, heroId?: string) {
  return map.objects.filter((object): object is Extract<MapObject, { kind: 'guardian' }> =>
    object.kind === 'guardian'
    && !object.stoodAsideFor?.includes(heroId ?? '')
    && guardianAggroTiles(object, map).some((tile) => sameCoord(tile, position)));
}

export function isObjectActive(object: MapObject): boolean {
  // A Cache is an authored secret tile, not a physical map blocker. It is found
  // by the dig action rather than by collision/entrance handling.
  if (object.kind === 'cache') return false;
  if (object.kind === 'pile' || object.kind === 'item' || object.kind === 'barrowField') return !object.collected;
  if (object.kind === 'chest') return !object.collected;
  if (object.kind === 'flotsam' || object.kind === 'sealedCask'
      || object.kind === 'castaway' || object.kind === 'messageBottle') return !object.collected;
  if (object.kind === 'shipwreck' || object.kind === 'sirenRocks') return !object.cleared;
  if (object.kind === 'lock' || object.kind === 'tollGate') return !object.cleared;
  if (object.kind === 'richVein') return !object.depleted;
  return true;
}

export function mapOccupiedTiles(map: GameMap, castles: Castle[] = []): Set<string> {
  const occupied = new Set<string>();
  for (const object of map.objects.filter(isObjectActive)) {
    objectFootprintTiles(object).forEach((tile) => occupied.add(coordKey(tile)));
  }
  for (const castle of castles) castleFootprintTiles(castle).forEach((tile) => occupied.add(coordKey(tile)));
  return occupied;
}

export function objectAtFootprint(map: GameMap, position: Coord): MapObject | undefined {
  return map.objects.find((object) => isObjectActive(object)
    && objectFootprintTiles(object).some((tile) => sameCoord(tile, position)));
}
