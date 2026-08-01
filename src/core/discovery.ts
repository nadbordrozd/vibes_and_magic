import type { MapObject, Player } from './types';

export function discoverMapObject(player: Player, object: MapObject): void {
  if (!player.discoveredObjectKinds.includes(object.kind)) {
    player.discoveredObjectKinds.push(object.kind);
  }
}
