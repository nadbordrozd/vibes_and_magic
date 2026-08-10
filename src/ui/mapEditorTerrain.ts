import { TERRAIN } from '../content/terrain';
import type { TerrainId, TerrainSkinId } from '../core/types';
import type {
  EditorMapCastle, EditorMapDocument, EditorMapGuardian, EditorMapHero, EditorMapPlayer,
  EditorMapReward, EditorTerrainTile,
} from '../core/mapEditor';
import { editorEntityIds, stableEntityId, type EditorMapObject } from '../core/mapEditor';
import {
  adventurePropByName, type AdventurePropDefinition,
} from '../content/adventureProps';

export interface EditorCell { x: number; y: number }
export interface EditorMapSize { width: number; height: number }
export type TerrainBrushShape = 'square' | 'round';
export type TerrainPaintTool =
  | 'pencil' | 'brush' | 'rectangle' | 'ellipse' | 'polygon' | 'pan'
  | 'prop' | 'structure' | 'castle' | 'hero' | 'guardian' | 'reward'
  | 'road' | 'seam' | 'select' | 'erase';

export interface TerrainTileChange {
  cell: EditorCell;
  before: EditorTerrainTile;
  after: EditorTerrainTile;
}

export interface TerrainEdit {
  kind?: 'terrain';
  changes: TerrainTileChange[];
}

export interface ObjectEdit {
  kind: 'objects';
  changes: [];
  before: EditorMapObject[];
  after: EditorMapObject[];
  beforeReferences?: Pick<EditorMapDocument, 'guardians' | 'rewards' | 'victory' | 'defeat'>;
  afterReferences?: Pick<EditorMapDocument, 'guardians' | 'rewards' | 'victory' | 'defeat'>;
}

export interface CastleEdit {
  kind: 'castles';
  changes: [];
  before: EditorMapCastle[];
  after: EditorMapCastle[];
}

export interface PlayerEdit {
  kind: 'players';
  changes: [];
  before: EditorMapPlayer[];
  after: EditorMapPlayer[];
}

export interface HeroEdit {
  kind: 'heroes';
  changes: [];
  before: EditorMapHero[];
  after: EditorMapHero[];
}

export interface GuardianEdit {
  kind: 'guardians';
  changes: [];
  before: EditorMapGuardian[];
  after: EditorMapGuardian[];
  beforeReferences?: Pick<EditorMapDocument, 'victory' | 'defeat'>;
  afterReferences?: Pick<EditorMapDocument, 'victory' | 'defeat'>;
}

export interface RewardEdit {
  kind: 'rewards';
  changes: [];
  before: EditorMapReward[];
  after: EditorMapReward[];
  beforeReferences?: Pick<EditorMapDocument, 'guardians'>;
  afterReferences?: Pick<EditorMapDocument, 'guardians'>;
}

export interface OverlayEdit {
  kind: 'overlays';
  changes: [];
  before: EditorMapDocument['overlays'];
  after: EditorMapDocument['overlays'];
}

export type EditorDocumentEdit = TerrainEdit | ObjectEdit | CastleEdit | HeroEdit | GuardianEdit
  | RewardEdit | OverlayEdit | PlayerEdit;

export interface TerrainHistory {
  past: EditorDocumentEdit[];
  future: EditorDocumentEdit[];
}

export const EMPTY_TERRAIN_HISTORY: TerrainHistory = { past: [], future: [] };
export const EDITOR_ZOOM_MIN = 0.5;
export const EDITOR_ZOOM_MAX = 3;
export const EDITOR_ZOOM_STEP = 0.25;

const cellKey = ({ x, y }: EditorCell) => `${x},${y}`;
const sameCell = (left: EditorCell, right: EditorCell) =>
  left.x === right.x && left.y === right.y;

export function clipEditorCells(cells: Iterable<EditorCell>, size: EditorMapSize): EditorCell[] {
  const unique = new Map<string, EditorCell>();
  for (const cell of cells) {
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)
        || cell.x < 0 || cell.y < 0 || cell.x >= size.width || cell.y >= size.height) continue;
    unique.set(cellKey(cell), { x: cell.x, y: cell.y });
  }
  return [...unique.values()].sort((left, right) => left.y - right.y || left.x - right.x);
}

/** Integer supercover line: every grid cell crossed between sampled pointer cells is returned. */
export function rasterizeEditorLine(start: EditorCell, end: EditorCell): EditorCell[] {
  const cells: EditorCell[] = [{ ...start }];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const nx = Math.abs(dx);
  const ny = Math.abs(dy);
  const signX = Math.sign(dx);
  const signY = Math.sign(dy);
  let x = start.x;
  let y = start.y;
  let ix = 0;
  let iy = 0;
  while (ix < nx || iy < ny) {
    const xProgress = (1 + 2 * ix) * ny;
    const yProgress = (1 + 2 * iy) * nx;
    if (xProgress === yProgress) {
      x += signX; y += signY; ix += 1; iy += 1;
    } else if (xProgress < yProgress) {
      x += signX; ix += 1;
    } else {
      y += signY; iy += 1;
    }
    cells.push({ x, y });
  }
  return cells;
}

export function terrainBrushFootprint(
  center: EditorCell,
  size: number,
  shape: TerrainBrushShape,
): EditorCell[] {
  const diameter = Math.max(1, Math.min(15, Math.round(size)));
  const low = -Math.floor((diameter - 1) / 2);
  const high = low + diameter - 1;
  const cells: EditorCell[] = [];
  const radius = diameter / 2;
  for (let y = low; y <= high; y += 1) for (let x = low; x <= high; x += 1) {
    if (shape === 'round' && Math.hypot(x, y) > radius) continue;
    cells.push({ x: center.x + x, y: center.y + y });
  }
  return cells;
}

export function rasterizeEditorBrushLine(
  start: EditorCell,
  end: EditorCell,
  size: number,
  shape: TerrainBrushShape,
  bounds: EditorMapSize,
): EditorCell[] {
  return clipEditorCells(rasterizeEditorLine(start, end)
    .flatMap((cell) => terrainBrushFootprint(cell, size, shape)), bounds);
}

export function rasterizeEditorRectangle(
  start: EditorCell,
  end: EditorCell,
  bounds: EditorMapSize,
): EditorCell[] {
  const cells: EditorCell[] = [];
  for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y += 1) {
    for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x += 1) {
      cells.push({ x, y });
    }
  }
  return clipEditorCells(cells, bounds);
}

/** Ellipse bounds pass through the centers of the drag endpoints, per work order 50. */
export function rasterizeEditorEllipse(
  start: EditorCell,
  end: EditorCell,
  bounds: EditorMapSize,
): EditorCell[] {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  if (minX === maxX || minY === maxY) {
    return rasterizeEditorRectangle(start, end, bounds);
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const radiusX = (maxX - minX) / 2;
  const radiusY = (maxY - minY) / 2;
  const cells: EditorCell[] = [];
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    const distance = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2;
    if (distance <= 1 + Number.EPSILON * 8) cells.push({ x, y });
  }
  return clipEditorCells(cells, bounds);
}

function pointOnSegment(point: EditorCell, start: EditorCell, end: EditorCell): boolean {
  const cross = (point.x - start.x) * (end.y - start.y)
    - (point.y - start.y) * (end.x - start.x);
  if (cross !== 0) return false;
  return point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x)
    && point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y);
}

/** Cell centers on a polygon edge count as inside. */
export function editorCellCenterInPolygon(point: EditorCell, vertices: readonly EditorCell[]): boolean {
  let inside = false;
  for (let index = 0, prior = vertices.length - 1; index < vertices.length; prior = index++) {
    const start = vertices[prior];
    const end = vertices[index];
    if (pointOnSegment(point, start, end)) return true;
    if ((start.y > point.y) !== (end.y > point.y)
        && point.x < (end.x - start.x) * (point.y - start.y) / (end.y - start.y) + start.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function rasterizeEditorPolygon(
  vertices: readonly EditorCell[],
  bounds: EditorMapSize,
): EditorCell[] {
  if (vertices.length < 3) return [];
  const minX = Math.min(...vertices.map(({ x }) => x));
  const maxX = Math.max(...vertices.map(({ x }) => x));
  const minY = Math.min(...vertices.map(({ y }) => y));
  const maxY = Math.max(...vertices.map(({ y }) => y));
  const cells: EditorCell[] = [];
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    const cell = { x, y };
    if (editorCellCenterInPolygon(cell, vertices)) cells.push(cell);
  }
  return clipEditorCells(cells, bounds);
}

export function legalEditorTerrainTile(
  terrain: TerrainId,
  skin: TerrainSkinId,
): EditorTerrainTile {
  const legalSkin = TERRAIN[terrain].skins.includes(skin) ? skin : TERRAIN[terrain].skins[0];
  return { terrain, skin: legalSkin };
}

export function createTerrainEdit(
  document: EditorMapDocument,
  cells: Iterable<EditorCell>,
  tile: EditorTerrainTile,
): TerrainEdit {
  const changes: TerrainTileChange[] = [];
  for (const cell of clipEditorCells(cells, document.dimensions)) {
    const before = document.tiles[cell.y][cell.x];
    if (before.terrain === tile.terrain && before.skin === tile.skin) continue;
    changes.push({ cell, before: { ...before }, after: { ...tile } });
  }
  return { changes };
}

export function applyTerrainEdit(
  document: EditorMapDocument,
  edit: EditorDocumentEdit,
  direction: 'forward' | 'backward' = 'forward',
): EditorMapDocument {
  if (edit.kind === 'players') {
    return {
      ...document,
      players: structuredClone(direction === 'forward' ? edit.after : edit.before),
    };
  }
  if (edit.kind === 'castles') {
    return {
      ...document,
      castles: structuredClone(direction === 'forward' ? edit.after : edit.before),
    };
  }
  if (edit.kind === 'heroes') {
    return {
      ...document,
      heroes: structuredClone(direction === 'forward' ? edit.after : edit.before),
    };
  }
  if (edit.kind === 'guardians') {
    const references = direction === 'forward' ? edit.afterReferences : edit.beforeReferences;
    return {
      ...document,
      guardians: structuredClone(direction === 'forward' ? edit.after : edit.before),
      ...(references ? structuredClone(references) : {}),
    };
  }
  if (edit.kind === 'rewards') {
    const references = direction === 'forward' ? edit.afterReferences : edit.beforeReferences;
    return {
      ...document,
      rewards: structuredClone(direction === 'forward' ? edit.after : edit.before),
      ...(references ? structuredClone(references) : {}),
    };
  }
  if (edit.kind === 'overlays') return {
    ...document,
    overlays: structuredClone(direction === 'forward' ? edit.after : edit.before),
  };
  if (edit.kind === 'objects') {
    const references = direction === 'forward' ? edit.afterReferences : edit.beforeReferences;
    return {
      ...document,
      objects: (direction === 'forward' ? edit.after : edit.before).map((object) => ({
        ...object,
        position: { ...object.position },
        ...(object.footprint ? { footprint: { ...object.footprint } } : {}),
        ...(object.entrance ? { entrance: { ...object.entrance } } : {}),
        properties: structuredClone(object.properties),
      })),
      ...(references ? structuredClone(references) : {}),
    };
  }
  if (!edit.changes.length) return document;
  const tiles = [...document.tiles];
  const copiedRows = new Set<number>();
  for (const change of edit.changes) {
    if (!copiedRows.has(change.cell.y)) {
      tiles[change.cell.y] = [...tiles[change.cell.y]];
      copiedRows.add(change.cell.y);
    }
    tiles[change.cell.y][change.cell.x] = {
      ...(direction === 'forward' ? change.after : change.before),
    };
  }
  return { ...document, tiles };
}

export function commitTerrainEdit(
  document: EditorMapDocument,
  history: TerrainHistory,
  edit: EditorDocumentEdit,
): { document: EditorMapDocument; history: TerrainHistory } {
  if (!edit.kind && !edit.changes.length) return { document, history };
  if ((edit.kind === 'objects' || edit.kind === 'castles' || edit.kind === 'heroes'
      || edit.kind === 'guardians'
      || edit.kind === 'rewards' || edit.kind === 'overlays'
      || edit.kind === 'players')
      && JSON.stringify(edit.before) === JSON.stringify(edit.after)) {
    return { document, history };
  }
  return {
    document: applyTerrainEdit(document, edit),
    history: { past: [...history.past, edit], future: [] },
  };
}

export type PropMutationFailure =
  | 'out-of-bounds' | 'overlap' | 'not-found' | 'missing-link' | 'invalid-id'
  | 'requires-linked-reward' | 'requires-dedicated-reward' | 'referenced-objective';
export type PropMutationResult =
  | { ok: true; edit: ObjectEdit; object: EditorMapObject | null }
  | { ok: false; reason: PropMutationFailure };

function cloneObjects(objects: readonly EditorMapObject[]): EditorMapObject[] {
  return objects.map((object) => ({
    ...object,
    position: { ...object.position },
    ...(object.footprint ? { footprint: { ...object.footprint } } : {}),
    ...(object.entrance ? { entrance: { ...object.entrance } } : {}),
    properties: structuredClone(object.properties),
  }));
}

export function editorPropFootprint(object: EditorMapObject): { w: number; h: number } {
  return object.footprint ?? adventurePropByName(String(object.properties.prop))?.footprint
    ?? { w: 1, h: 1 };
}

export function editorFootprintCells(
  position: EditorCell, footprint: { w: number; h: number },
): EditorCell[] {
  return Array.from({ length: footprint.h }, (_, dy) =>
    Array.from({ length: footprint.w }, (_unused, dx) => ({
      x: position.x + dx, y: position.y + dy,
    }))).flat();
}

/** Keeps the grabbed footprint cell beneath the pointer while moving a multi-cell prop. */
export function editorMoveAnchor(pointer: EditorCell, grabOffset: EditorCell): EditorCell {
  return { x: pointer.x - grabOffset.x, y: pointer.y - grabOffset.y };
}

export function editorPropAtCell(
  document: EditorMapDocument, cell: EditorCell,
): EditorMapObject | undefined {
  return [...document.objects].reverse().find((object) => object.kind === 'obstacle'
    && adventurePropByName(String(object.properties.prop))
    && editorFootprintCells(object.position, editorPropFootprint(object))
      .some((occupied) => sameCell(occupied, cell)));
}

function occupiedEntityCells(document: EditorMapDocument, exceptEntityId?: string): Set<string> {
  const cells = new Set<string>();
  const add = (position: EditorCell, footprint: { w: number; h: number }) => {
    editorFootprintCells(position, footprint).forEach((cell) => cells.add(cellKey(cell)));
  };
  document.castles.forEach((castle) => {
    if (castle.id !== exceptEntityId) add(castle.position, castle.footprint ?? { w: 3, h: 2 });
  });
  document.heroes.forEach((hero) => {
    if (hero.id !== exceptEntityId) add(hero.position, { w: 1, h: 1 });
  });
  document.objects.forEach((object) => {
    if (object.id !== exceptEntityId && object.kind !== 'cache') {
      add(object.position, object.footprint ?? (object.kind === 'mine' ? { w: 2, h: 1 } : { w: 1, h: 1 }));
    }
  });
  document.guardians.forEach((guardian) => {
    if (guardian.id !== exceptEntityId) add(guardian.position, { w: 1, h: 1 });
  });
  document.rewards.forEach((reward) => {
    if (reward.id !== exceptEntityId && reward.delivery.kind === 'pickup') {
      add(reward.delivery.position, { w: 1, h: 1 });
    }
  });
  return cells;
}

export function canPlaceEditorProp(
  document: EditorMapDocument,
  position: EditorCell,
  footprint: { w: number; h: number },
  exceptEntityId?: string,
): { ok: true } | { ok: false; reason: Exclude<PropMutationFailure, 'not-found'> } {
  const cells = editorFootprintCells(position, footprint);
  if (cells.some((cell) => cell.x < 0 || cell.y < 0
    || cell.x >= document.dimensions.width || cell.y >= document.dimensions.height)) {
    return { ok: false, reason: 'out-of-bounds' };
  }
  const occupied = occupiedEntityCells(document, exceptEntityId);
  return cells.some((cell) => occupied.has(cellKey(cell)))
    ? { ok: false, reason: 'overlap' } : { ok: true };
}

/** Shared bounds/occupancy preflight for every editor entity placement workflow. */
export const canPlaceEditorEntity = canPlaceEditorProp;

export function createPropPlacementEdit(
  document: EditorMapDocument,
  definition: AdventurePropDefinition,
  position: EditorCell,
): PropMutationResult {
  const legal = canPlaceEditorProp(document, position, definition.footprint);
  if (!legal.ok) return legal;
  const object: EditorMapObject = {
    id: stableEntityId(definition.id, editorEntityIds(document)),
    kind: 'obstacle',
    position: { ...position },
    ...(definition.footprint.w === 1 && definition.footprint.h === 1
      ? {} : { footprint: { ...definition.footprint } }),
    properties: {
      prop: definition.prop,
      ...(definition.anomaly ? { anomaly: true } : {}),
    },
  };
  return {
    ok: true,
    object,
    edit: { kind: 'objects', changes: [], before: cloneObjects(document.objects),
      after: cloneObjects([...document.objects, object]) },
  };
}

export function createPropMoveEdit(
  document: EditorMapDocument, objectId: string, position: EditorCell,
): PropMutationResult {
  const object = document.objects.find((candidate) => candidate.id === objectId
    && candidate.kind === 'obstacle'
    && adventurePropByName(String(candidate.properties.prop)));
  if (!object) return { ok: false, reason: 'not-found' };
  if (sameCell(object.position, position)) return { ok: true, object, edit: {
    kind: 'objects', changes: [], before: cloneObjects(document.objects),
    after: cloneObjects(document.objects),
  } };
  const legal = canPlaceEditorProp(document, position, editorPropFootprint(object), object.id);
  if (!legal.ok) return legal;
  const moved = { ...object, position: { ...position } };
  return {
    ok: true,
    object: moved,
    edit: {
      kind: 'objects', changes: [], before: cloneObjects(document.objects),
      after: cloneObjects(document.objects.map((candidate) =>
        candidate.id === object.id ? moved : candidate)),
    },
  };
}

export function createPropEraseEdit(
  document: EditorMapDocument, objectId: string,
): PropMutationResult {
  const object = document.objects.find((candidate) => candidate.id === objectId
    && candidate.kind === 'obstacle'
    && adventurePropByName(String(candidate.properties.prop)));
  if (!object) return { ok: false, reason: 'not-found' };
  return {
    ok: true,
    object: null,
    edit: {
      kind: 'objects', changes: [], before: cloneObjects(document.objects),
      after: cloneObjects(document.objects.filter((candidate) => candidate.id !== objectId)),
    },
  };
}

export function undoTerrainEdit(
  document: EditorMapDocument,
  history: TerrainHistory,
): { document: EditorMapDocument; history: TerrainHistory } {
  const edit = history.past.at(-1);
  if (!edit) return { document, history };
  return {
    document: applyTerrainEdit(document, edit, 'backward'),
    history: { past: history.past.slice(0, -1), future: [edit, ...history.future] },
  };
}

export function redoTerrainEdit(
  document: EditorMapDocument,
  history: TerrainHistory,
): { document: EditorMapDocument; history: TerrainHistory } {
  const edit = history.future[0];
  if (!edit) return { document, history };
  return {
    document: applyTerrainEdit(document, edit),
    history: { past: [...history.past, edit], future: history.future.slice(1) },
  };
}

export function clampEditorZoom(value: number): number {
  const stepped = Math.round(value / EDITOR_ZOOM_STEP) * EDITOR_ZOOM_STEP;
  return Math.max(EDITOR_ZOOM_MIN, Math.min(EDITOR_ZOOM_MAX, stepped));
}

export function pointerStartsPan(button: number, tool: TerrainPaintTool, spaceHeld: boolean): boolean {
  return button === 1 || (button === 0 && (tool === 'pan' || spaceHeld));
}

export function pointerStartsPaint(button: number, tool: TerrainPaintTool, spaceHeld: boolean): boolean {
  return button === 0 && ['pencil', 'brush', 'rectangle', 'ellipse', 'polygon', 'road', 'seam'].includes(tool)
    && !spaceHeld;
}

export function appendUniqueEditorCells(
  current: readonly EditorCell[], additions: Iterable<EditorCell>, bounds: EditorMapSize,
): EditorCell[] {
  return clipEditorCells([...current, ...additions], bounds);
}

export function lastDifferentVertex(vertices: readonly EditorCell[], next: EditorCell): EditorCell[] {
  return vertices.length && sameCell(vertices.at(-1)!, next) ? [...vertices] : [...vertices, next];
}
