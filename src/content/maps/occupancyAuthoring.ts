import type { Coord, GameMap, Guardian, MapObject } from '../../core/types';
import { coordKey, inBounds } from '../../core/map/pathfinding';
import { objectEntranceTile, objectFootprintTiles } from '../../core/map/occupancy';
import { terrainIdAt } from '../terrain';

export interface AuthoredGuardian extends Guardian {
  targetId: string;
  id?: string;
  position?: Coord;
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
