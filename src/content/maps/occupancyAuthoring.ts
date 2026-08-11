import type { Coord, GameMap, Guardian, MapObject } from '../../core/types';
import { coordKey, inBounds } from '../../core/map/pathfinding';
import {
  CITY_ENTRANCE, CITY_FOOTPRINT, footprintTiles, objectEntranceTile, objectFootprintTiles,
} from '../../core/map/occupancy';
import { terrainIdAt } from '../terrain';

export interface AuthoredGuardian extends Guardian {
  targetId: string;
  id?: string;
  position?: Coord;
}

/** Roads may meet a City only at its centered gate, never continue beneath blocked contact. */
export function trimRoadsForCities(roads: Coord[], entrances: readonly Coord[]): Coord[] {
  const original = new Set(roads.map(coordKey));
  const blocked = new Set(entrances.flatMap((entrance) => footprintTiles({
    x: entrance.x - CITY_ENTRANCE.dx, y: entrance.y - CITY_ENTRANCE.dy,
  }, CITY_FOOTPRINT).filter((cell) => cell.x !== entrance.x || cell.y !== entrance.y)
    .map(coordKey)));
  const kept = new Map(roads.filter((road) => !blocked.has(coordKey(road)))
    .map((road) => [coordKey(road), road]));
  for (const entrance of entrances) if (original.has(coordKey(entrance))) {
    const approach = { x: entrance.x, y: entrance.y + 1 };
    kept.set(coordKey(approach), approach);
  }
  const gateKeys = new Set(entrances.map(coordKey));
  let removed = true;
  while (removed) {
    removed = false;
    for (const [key, road] of kept) {
      if (gateKeys.has(key)) continue;
      const connected = [
        { x: road.x + 1, y: road.y }, { x: road.x - 1, y: road.y },
        { x: road.x, y: road.y + 1 }, { x: road.x, y: road.y - 1 },
      ].some((neighbor) => kept.has(coordKey(neighbor)));
      if (!connected) { kept.delete(key); removed = true; }
    }
  }
  return [...kept.values()];
}

/** Place separately-authored guardians beside their targets and link both objects. */
export function materializeGuardians(
  map: GameMap,
  authored: AuthoredGuardian[],
): GameMap {
  const occupied = new Set(map.objects.flatMap(objectFootprintTiles).map(coordKey));
  const guardedBy = new Map<string, string[]>();
  const guardians: MapObject[] = authored.map((spec) => {
    const target = map.objects.find((object) => object.id === spec.targetId);
    if (!target) throw new Error(`Guardian target ${spec.targetId} is missing`);
    const entrance = objectEntranceTile(target);
    const candidates: Coord[] = spec.position ? [spec.position] : [
      { x: entrance.x, y: entrance.y + 1 },
      { x: entrance.x + 1, y: entrance.y },
      { x: entrance.x - 1, y: entrance.y },
      { x: entrance.x, y: entrance.y - 1 },
    ];
    const targetOnWater = terrainIdAt(map, target.position) === 'water';
    const position = candidates.find((candidate) => inBounds(map, candidate)
      && !occupied.has(coordKey(candidate))
      && terrainIdAt(map, candidate) !== 'mountain'
      && (targetOnWater || terrainIdAt(map, candidate) !== 'water'));
    if (!position) throw new Error(`No guardian post available for ${target.id}`);
    const id = spec.id ?? `${target.id}-guardian`;
    guardedBy.set(target.id, [...(guardedBy.get(target.id) ?? []), id]);
    occupied.add(coordKey(position));
    return {
      id, kind: 'guardian', position,
      army: spec.army.map((stack) => ({ ...stack })),
      originalArmy: spec.army.map((stack) => ({ ...stack })),
      split: spec.split, drop: spec.drop ? { ...spec.drop } : undefined,
      stoodAsideFor: [...(spec.stoodAsideFor ?? [])], protects: target.id,
      static: spec.static,
    };
  });
  return {
    ...map,
    objects: [
      ...map.objects.map((object) => ({
        ...object,
        ...(guardedBy.has(object.id) ? { guardedBy: guardedBy.get(object.id) } : {}),
      })),
      ...guardians,
    ],
  };
}
