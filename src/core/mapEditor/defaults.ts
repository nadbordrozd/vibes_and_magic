import { FACTIONS } from '../../content/factions';
import { FACTION_HEROES } from '../../content/heroes';
import { UNITS } from '../../content/units';
import type {
  ArmyStack, Castle, Coord, FactionId, HeroDefinitionId, PlayerId, UnitId, UnitTier,
} from '../types';
import type {
  EditorGuardianCreature, EditorGuardianStack, EditorMapCastle, EditorMapGuardian,
  EditorMapHero, EditorMapPlayer,
} from './types';

/** Battlefield-only constructs are UnitIds for combat, but never legal authored army creatures. */
export const EDITOR_NON_ROSTER_UNIT_IDS = [
  'siegeWall', 'siegeRam', 'watchtower', 'standingMirror', 'makerWall',
] as const satisfies readonly UnitId[];
const EDITOR_NON_ROSTER_UNIT_ID_SET = new Set<UnitId>(EDITOR_NON_ROSTER_UNIT_IDS);
export const EDITOR_ARMY_UNIT_IDS = (Object.keys(UNITS) as UnitId[])
  .filter((unitId) => !EDITOR_NON_ROSTER_UNIT_ID_SET.has(unitId));
export const isEditorArmyUnitId = (unitId: unknown): unitId is UnitId =>
  typeof unitId === 'string' && Object.hasOwn(UNITS, unitId)
  && !EDITOR_NON_ROSTER_UNIT_ID_SET.has(unitId as UnitId);

export const EDITOR_GUARDIAN_TIERS = [1, 2, 3, 4, 5, 6] as const satisfies readonly UnitTier[];

/** Counts fall by tier while catalog-average strategic power rises at each step. */
export const EDITOR_GUARDIAN_BASE_COUNTS: Readonly<Record<UnitTier, number>> = {
  1: 48, 2: 30, 3: 20, 4: 12, 5: 6, 6: 5,
};

export function editorStableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function defaultEditorGuardianCount(tier: UnitTier, identity: string): number {
  const percent = 80 + editorStableHash(identity) % 41;
  return Math.max(1, Math.round(EDITOR_GUARDIAN_BASE_COUNTS[tier] * percent / 100));
}

const editorGuardianUnitsAtTier = (tier: UnitTier) =>
  EDITOR_ARMY_UNIT_IDS.filter((unitId) => UNITS[unitId].tier === tier);
export const EDITOR_RANDOM_GUARDIAN_UNITS: Readonly<Record<UnitTier, readonly UnitId[]>> = {
  1: editorGuardianUnitsAtTier(1), 2: editorGuardianUnitsAtTier(2),
  3: editorGuardianUnitsAtTier(3), 4: editorGuardianUnitsAtTier(4),
  5: editorGuardianUnitsAtTier(5), 6: editorGuardianUnitsAtTier(6),
};

export function resolveEditorRandomGuardianUnit(
  tier: UnitTier, seed: number, guardianId: string, stackIndex: number,
): UnitId {
  const choices = EDITOR_RANDOM_GUARDIAN_UNITS[tier];
  return choices[editorStableHash(`${seed >>> 0}:${guardianId}:${stackIndex}:${tier}`)
    % choices.length];
}

export function resolveEditorGuardianStack(
  stack: EditorGuardianStack, seed: number, guardianId: string, stackIndex: number,
): ArmyStack {
  return 'unitId' in stack ? { ...stack } : {
    unitId: resolveEditorRandomGuardianUnit(stack.randomTier, seed, guardianId, stackIndex),
    count: stack.count,
  };
}

/** Catalog-compatible architectural variants; the basic `castle` variant is implicit. */
export const EDITOR_CASTLE_VARIANTS_BY_FACTION = {
  hearthguard: ['freeTown'], woundWrights: ['oldSeat'], unfinished: ['hollowTown'],
  vespiary: ['coastal'], hagwood: [], wildergrass: [],
} as const satisfies Record<FactionId, readonly NonNullable<Castle['variant']>[]>;

export function createDefaultEditorPlayer(
  id: PlayerId,
  faction: FactionId,
  controller: EditorMapPlayer['controller'] = id === 'p1' ? 'human' : 'ai',
): EditorMapPlayer {
  return { id, faction, controller };
}

export function createDefaultEditorCastle(
  id: string,
  position: Coord,
  owner: PlayerId | 'neutral',
  faction: FactionId,
): EditorMapCastle {
  // Buildings, recruitment, guild, garrison, footprint, and entrance are deliberately catalog/core
  // defaults applied by conversion rather than a second copy of those values in editor code.
  return { id, position: { ...position }, owner, faction };
}

export function createDefaultEditorHero(
  id: string,
  position: Coord,
  owner: PlayerId,
  faction: FactionId,
  definitionId: HeroDefinitionId = FACTION_HEROES[faction][0],
): EditorMapHero {
  return {
    id,
    position: { ...position },
    owner,
    faction,
    definitionId,
    army: FACTIONS[faction].hireArmy.map((stack) => ({ ...stack })),
  };
}

export function createDefaultEditorGuardian(
  id: string,
  position: Coord,
  creature: EditorGuardianCreature | UnitId,
): EditorMapGuardian {
  const source: EditorGuardianCreature = typeof creature === 'string'
    ? { unitId: creature } : creature;
  const tier = 'unitId' in source ? UNITS[source.unitId].tier : source.randomTier;
  const construct = 'unitId' in source && EDITOR_NON_ROSTER_UNIT_ID_SET.has(source.unitId);
  const count = construct ? 1 : defaultEditorGuardianCount(
    tier, `${id}:${position.x}:${position.y}:${'unitId' in source
      ? source.unitId : `random-tier-${source.randomTier}`}`,
  );
  return {
    id,
    position: { ...position },
    army: [{ ...source, count }],
    split: false,
    // Battlefield constructs are valid authored special encounters, but never biologically grow.
    static: construct,
    protects: null,
    drop: null,
  };
}
