import { assetId, type AssetManifestEntry } from '../../assets/manifest';
import { buildingBelongsToFaction } from '../content/buildings';
import { FACTIONS } from '../content/factions';
import { FACTION_UNITS } from '../content/units';
import { createInitialCastle } from '../core/game/setup';
import type { BuildingId, Castle, FactionId, PlayerId, SpellId, UnitId } from '../core/types';
import { PLAYER_IDS } from '../core/types';
import {
  createDefaultEditorCastle, createDefaultEditorPlayer, EDITOR_CASTLE_VARIANTS_BY_FACTION,
  EDITOR_ARMY_UNIT_IDS, editorEntityIds, stableEntityId,
  type EditorMapCastle, type EditorMapDocument, type EditorMapPlayer,
} from '../core/mapEditor';
import {
  canPlaceEditorEntity, editorFootprintCells, type CastleEdit, type EditorCell, type PlayerEdit,
  type PropMutationFailure,
} from './mapEditorTerrain';

export const EDITOR_CASTLE_FOOTPRINT = { w: 3, h: 2 } as const;
export const EDITOR_CASTLE_ENTRANCE = { dx: 1, dy: 1 } as const;
export const EDITOR_PLAYER_FLAGS: Readonly<Record<PlayerId, {
  label: string; color: string;
}>> = {
  p1: { label: 'Crimson', color: '#d24c3f' },
  p2: { label: 'Azure', color: '#3c8fb2' },
  p3: { label: 'Verdant', color: '#4d9b63' },
  p4: { label: 'Amber', color: '#be7d34' },
  p5: { label: 'Violet', color: '#8750ad' },
  p6: { label: 'Teal', color: '#278d85' },
};

export function editorCastleSpriteId(castle: Pick<EditorMapCastle, 'faction' | 'variant'>) {
  return assetId.castle(castle.faction, castle.variant ?? 'castle');
}

export function editorCastleVariants(faction: FactionId) {
  return EDITOR_CASTLE_VARIANTS_BY_FACTION[faction];
}

export function editorCastleFootprint(_castle?: Pick<EditorMapCastle, 'footprint'>) {
  return { ...EDITOR_CASTLE_FOOTPRINT };
}

export function editorCastleEntrance(_castle?: Pick<EditorMapCastle, 'entrance'>) {
  return { ...EDITOR_CASTLE_ENTRANCE };
}

export function editorCastleCanvasGeometry(position: EditorCell, entry: AssetManifestEntry) {
  return {
    x: position.x * 32 - entry.anchor.x,
    y: position.y * 32 - entry.anchor.y,
    width: entry.w,
    height: entry.h,
  };
}

export function editorCastleFlagAnchor(position: EditorCell, entry: AssetManifestEntry) {
  if (!entry.flagAnchor) return null;
  return {
    x: position.x * 32 + entry.flagAnchor.x - entry.anchor.x,
    y: position.y * 32 + entry.flagAnchor.y - entry.anchor.y,
  };
}

/** The exact canonical state conversion will start from before explicit portable overrides apply. */
export function inheritedEditorCastleState(castle: EditorMapCastle, seed = 0): Castle {
  const entrance = {
    x: castle.position.x + EDITOR_CASTLE_ENTRANCE.dx,
    y: castle.position.y + EDITOR_CASTLE_ENTRANCE.dy,
  };
  return createInitialCastle(castle.owner, castle.faction, seed >>> 0, entrance, castle.id);
}

export type CastleMutationResult =
  | { ok: true; edit: CastleEdit; castle: EditorMapCastle | null }
  | { ok: false; reason: PropMutationFailure };

const castleEdit = (
  document: EditorMapDocument, after: EditorMapCastle[], castle: EditorMapCastle | null,
): CastleMutationResult => ({
  ok: true,
  castle,
  edit: {
    kind: 'castles', changes: [], before: structuredClone(document.castles),
    after: structuredClone(after),
  },
});

export function canPlaceEditorCastle(
  document: EditorMapDocument, position: EditorCell, exceptCastleId?: string,
  owner?: PlayerId | 'neutral',
) {
  const entrance = {
    x: position.x + EDITOR_CASTLE_ENTRANCE.dx,
    y: position.y + EDITOR_CASTLE_ENTRANCE.dy,
  };
  const stationedHero = owner === undefined || owner === 'neutral' ? undefined
    : document.heroes.find((hero) => hero.owner === owner
      && hero.position.x === entrance.x && hero.position.y === entrance.y);
  // Symmetric with hero placement: ignore exactly one same-owner hero at the entrance only.
  const preflightDocument = stationedHero ? {
    ...document, heroes: document.heroes.filter((hero) => hero.id !== stationedHero.id),
  } : document;
  return canPlaceEditorEntity(
    preflightDocument, position, EDITOR_CASTLE_FOOTPRINT, exceptCastleId,
  );
}

export function createCastlePlacementEdit(
  document: EditorMapDocument, position: EditorCell,
  owner: PlayerId | 'neutral', faction: FactionId,
): CastleMutationResult {
  const legal = canPlaceEditorCastle(document, position, undefined, owner);
  if (!legal.ok) return legal;
  const castle = createDefaultEditorCastle(
    stableEntityId(`${owner}-${faction}-castle`, editorEntityIds(document)),
    position, owner, faction,
  );
  return castleEdit(document, [...document.castles, castle], castle);
}

export function createCastleMoveEdit(
  document: EditorMapDocument, castleId: string, position: EditorCell,
): CastleMutationResult {
  const castle = document.castles.find((candidate) => candidate.id === castleId);
  if (!castle) return { ok: false, reason: 'not-found' };
  const legal = canPlaceEditorCastle(document, position, castleId, castle.owner);
  if (!legal.ok) return legal;
  const moved = { ...castle, position: { ...position } };
  return castleEdit(document, document.castles.map((candidate) =>
    candidate.id === castleId ? moved : candidate), moved);
}

export function createCastleDeleteEdit(
  document: EditorMapDocument, castleId: string,
): CastleMutationResult {
  if (!document.castles.some((candidate) => candidate.id === castleId)) {
    return { ok: false, reason: 'not-found' };
  }
  return castleEdit(document, document.castles.filter((candidate) => candidate.id !== castleId), null);
}

export type EditorCastleUpdate = Partial<Omit<EditorMapCastle, 'position' | 'footprint' | 'entrance'>>;

export function createCastleUpdateEdit(
  document: EditorMapDocument, castleId: string, update: EditorCastleUpdate,
): CastleMutationResult {
  const castle = document.castles.find((candidate) => candidate.id === castleId);
  if (!castle) return { ok: false, reason: 'not-found' };
  const nextId = update.id ?? castle.id;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(nextId)
      || editorEntityIds(document).some((id) => id === nextId && id !== castle.id)) {
    return { ok: false, reason: 'invalid-id' };
  }
  const next = structuredClone(castle) as EditorMapCastle;
  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) delete (next as unknown as Record<string, unknown>)[key];
    else (next as unknown as Record<string, unknown>)[key] = structuredClone(value);
  }
  if (!canPlaceEditorCastle(document, next.position, castle.id, next.owner).ok) {
    return { ok: false, reason: 'overlap' };
  }
  if (update.faction !== undefined && next.variant !== undefined
      && !EDITOR_CASTLE_VARIANTS_BY_FACTION[next.faction].includes(next.variant as never)) {
    delete next.variant;
  }
  if (update.faction !== undefined) {
    if (next.buildings) next.buildings = next.buildings.filter((building) =>
      buildingBelongsToFaction(building, next.faction));
    if (next.bannedBuildings) next.bannedBuildings = next.bannedBuildings.filter((building) =>
      buildingBelongsToFaction(building, next.faction));
  }
  const after = document.castles.map((candidate) => candidate.id === castleId ? next : candidate);
  return castleEdit(document, after, next);
}

export function editorCastleAtCell(document: EditorMapDocument, cell: EditorCell) {
  return [...document.castles].reverse().find((castle) =>
    editorFootprintCells(castle.position, EDITOR_CASTLE_FOOTPRINT)
      .some((occupied) => occupied.x === cell.x && occupied.y === cell.y));
}

export function reconcileCastleBuildingOverrides(
  changed: 'buildings' | 'bannedBuildings', values: BuildingId[], castle: EditorMapCastle,
): Pick<EditorCastleUpdate, 'buildings' | 'bannedBuildings'> {
  const selected = [...new Set(values)];
  const conflicts = new Set(selected);
  return changed === 'buildings' ? {
    buildings: selected,
    ...(castle.bannedBuildings !== undefined
      ? { bannedBuildings: castle.bannedBuildings.filter((id) => !conflicts.has(id)) } : {}),
  } : {
    bannedBuildings: selected,
    ...(castle.buildings !== undefined
      ? { buildings: castle.buildings.filter((id) => !conflicts.has(id)) } : {}),
  };
}

export function editorGarrisonUnitChoices(
  castle: EditorMapCastle, stackIndex?: number,
): UnitId[] {
  const current = stackIndex === undefined ? undefined : castle.garrison?.[stackIndex]?.unitId;
  const occupied = new Set((castle.garrison ?? []).flatMap((stack, index) =>
    index === stackIndex ? [] : [stack.unitId]));
  return EDITOR_ARMY_UNIT_IDS.filter((unitId) => unitId === current || !occupied.has(unitId));
}

export function nextEditorGarrisonUnit(castle: EditorMapCastle): UnitId | null {
  const choices = editorGarrisonUnitChoices(castle);
  return FACTION_UNITS[castle.faction].find((unitId) => choices.includes(unitId))
    ?? choices[0] ?? null;
}

export function boundedEditorGuildDeck(values: SpellId[], maximum = 8): SpellId[] {
  return [...new Set(values)].slice(0, maximum);
}

export type PlayerSlotMutationResult =
  | { ok: true; edit: PlayerEdit; player: EditorMapPlayer | null }
  | { ok: false; reason: 'limit' | 'not-last' | 'referenced'; references?: string[] };

const playerEdit = (
  document: EditorMapDocument, after: EditorMapPlayer[], player: EditorMapPlayer | null,
): PlayerSlotMutationResult => ({
  ok: true, player,
  edit: { kind: 'players', changes: [], before: structuredClone(document.players),
    after: structuredClone(after) },
});

export function addEditorPlayerSlot(document: EditorMapDocument): PlayerSlotMutationResult {
  if (document.players.length >= PLAYER_IDS.length) return { ok: false, reason: 'limit' };
  const id = PLAYER_IDS[document.players.length];
  const factions = Object.keys(FACTIONS) as FactionId[];
  const player = createDefaultEditorPlayer(id, factions[document.players.length % factions.length]);
  return playerEdit(document, [...document.players, player], player);
}

export function playerSlotReferences(document: EditorMapDocument, playerId: PlayerId): string[] {
  return [
    ...document.castles.filter((castle) => castle.owner === playerId)
      .map((castle) => `castle ${castle.id}`),
    ...document.heroes.filter((hero) => hero.owner === playerId)
      .map((hero) => `hero ${hero.id}`),
    ...document.objects.filter((object) => object.properties.owner === playerId)
      .map((object) => `${String(object.kind)} ${object.id}`),
  ].sort();
}

/** Only the trailing slot can be removed, preserving the p1…p6 contiguous-slot invariant. */
export function removeEditorPlayerSlot(
  document: EditorMapDocument, playerId: PlayerId,
): PlayerSlotMutationResult {
  if (document.players.at(-1)?.id !== playerId) return { ok: false, reason: 'not-last' };
  const references = playerSlotReferences(document, playerId);
  if (references.length) return { ok: false, reason: 'referenced', references };
  return playerEdit(document, document.players.slice(0, -1), null);
}

export function updateEditorPlayerSlot(
  document: EditorMapDocument, playerId: PlayerId,
  update: Partial<Pick<EditorMapPlayer, 'controller' | 'faction' | 'name'>>,
): PlayerSlotMutationResult {
  if (!document.players.some((player) => player.id === playerId)) {
    return { ok: false, reason: 'not-last' };
  }
  const players = document.players.map((player) => player.id === playerId
      ? { ...player, ...update, ...(update.name === '' ? { name: undefined } : {}) }
      : player);
  return playerEdit(document, players, players.find((player) => player.id === playerId) ?? null);
}
