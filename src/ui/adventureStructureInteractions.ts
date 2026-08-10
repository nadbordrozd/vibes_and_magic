import { MAP_OBJECT_KINDS } from '../content/mapObjectRegistry';
import type { MapObject } from '../core/types';

export type AdventureObjectInteractionRoute =
  | 'contextual-dialog'
  | 'rules-choice-dialog'
  | 'transient-result'
  | 'map-control'
  | 'combat-or-navigation'
  | 'non-actionable';

export const CONTEXTUAL_STRUCTURE_KINDS = [
  'dwelling', 'tinkersCart', 'monastery', 'gloamingRing', 'chrysalis', 'bridge',
  'hedgeSchool', 'reliquaryCairn', 'mercenaryCamp', 'wagonCamp', 'titheBarn',
] as const satisfies readonly MapObject['kind'][];

export type ContextualStructureKind = typeof CONTEXTUAL_STRUCTURE_KINDS[number];
export type ContextualStructure = Extract<MapObject, { kind: ContextualStructureKind }>;

/**
 * Exhaustive presentation decision for every registered adventure object. The routing describes
 * the first focused or deliberate result surface reached through the canonical map interaction;
 * it does not duplicate rules or dispatch alternate actions.
 */
export const ADVENTURE_OBJECT_INTERACTION_ROUTES = {
  mine: 'transient-result',
  pile: 'map-control',
  chest: 'rules-choice-dialog',
  shrine: 'rules-choice-dialog',
  item: 'map-control',
  richVein: 'transient-result',
  waystation: 'transient-result',
  lock: 'combat-or-navigation',
  dwelling: 'contextual-dialog',
  tinkersCart: 'contextual-dialog',
  monastery: 'contextual-dialog',
  gloamingRing: 'contextual-dialog',
  storyteller: 'transient-result',
  chrysalis: 'contextual-dialog',
  bridge: 'contextual-dialog',
  hedgeSchool: 'contextual-dialog',
  reliquaryCairn: 'contextual-dialog',
  tollGate: 'rules-choice-dialog',
  omenStone: 'transient-result',
  crone: 'rules-choice-dialog',
  barrowField: 'transient-result',
  guardian: 'combat-or-navigation',
  boat: 'combat-or-navigation',
  manaSpring: 'transient-result',
  flotsam: 'map-control',
  sealedCask: 'rules-choice-dialog',
  castaway: 'map-control',
  messageBottle: 'map-control',
  whirlpool: 'combat-or-navigation',
  shipwreck: 'combat-or-navigation',
  drownedBell: 'transient-result',
  sirenRocks: 'rules-choice-dialog',
  lighthouse: 'transient-result',
  watermill: 'transient-result',
  windmill: 'transient-result',
  tradingCamp: 'transient-result',
  sparringStone: 'rules-choice-dialog',
  listeningStones: 'transient-result',
  longDraught: 'transient-result',
  grinningIdol: 'transient-result',
  hutOnTheHill: 'transient-result',
  treeSecondThoughts: 'rules-choice-dialog',
  warmTable: 'transient-result',
  coldSpring: 'transient-result',
  idolOfSomebody: 'transient-result',
  wishingWell: 'transient-result',
  ruinedWatchtower: 'combat-or-navigation',
  oldBearsCave: 'combat-or-navigation',
  wolfHollow: 'combat-or-navigation',
  unquietYard: 'combat-or-navigation',
  moltingCourt: 'combat-or-navigation',
  spoolHoard: 'combat-or-navigation',
  mercenaryCamp: 'contextual-dialog',
  wagonCamp: 'contextual-dialog',
  titheBarn: 'contextual-dialog',
  skeletonGrass: 'transient-result',
  coldCampfire: 'transient-result',
  shepherdsLeanTo: 'transient-result',
  overgrownCart: 'transient-result',
  patientStone: 'transient-result',
  cache: 'map-control',
  obstacle: 'non-actionable',
} as const satisfies Record<MapObject['kind'], AdventureObjectInteractionRoute>;

export function isContextualStructure(object: MapObject): object is ContextualStructure {
  return ADVENTURE_OBJECT_INTERACTION_ROUTES[object.kind] === 'contextual-dialog';
}

export function validateAdventureObjectInteractionRoutes(): void {
  const routed = Object.keys(ADVENTURE_OBJECT_INTERACTION_ROUTES).sort();
  const registered = [...MAP_OBJECT_KINDS].sort();
  if (JSON.stringify(routed) !== JSON.stringify(registered)) {
    throw new Error('Adventure object interaction routes do not match the map-object registry');
  }
}
