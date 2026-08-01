import type { MapObject } from '../core/types';

export const MAP_OBJECT_KINDS = [
  'mine', 'pile', 'chest', 'shrine', 'item', 'richVein', 'waystation', 'lock',
  'dwelling', 'tinkersCart', 'monastery', 'gloamingRing', 'storyteller', 'chrysalis',
  'bridge', 'hedgeSchool', 'reliquaryCairn', 'tollGate', 'omenStone', 'crone',
  'barrowField', 'guardian', 'boat', 'manaSpring', 'flotsam', 'sealedCask',
  'castaway', 'messageBottle', 'whirlpool', 'shipwreck', 'drownedBell',
  'sirenRocks', 'lighthouse',
  'watermill', 'windmill', 'tradingCamp', 'sparringStone', 'listeningStones',
  'longDraught', 'grinningIdol', 'hutOnTheHill', 'treeSecondThoughts', 'warmTable',
  'coldSpring', 'idolOfSomebody', 'wishingWell', 'ruinedWatchtower', 'oldBearsCave',
  'wolfHollow', 'unquietYard', 'moltingCourt', 'spoolHoard', 'mercenaryCamp',
  'wagonCamp', 'titheBarn', 'skeletonGrass', 'coldCampfire', 'shepherdsLeanTo',
  'overgrownCart', 'patientStone', 'cache', 'obstacle',
] as const satisfies readonly MapObject['kind'][];

export function validateMapObjectRegistry(): void {
  if (new Set(MAP_OBJECT_KINDS).size !== MAP_OBJECT_KINDS.length) {
    throw new Error('Duplicate map-object registry entry');
  }
}
