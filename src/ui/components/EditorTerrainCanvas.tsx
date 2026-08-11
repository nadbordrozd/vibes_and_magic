import {
  useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent,
} from 'react';
import { assetId, manifestEntry } from '../../../assets/manifest';
import { ADVENTURE_PROP_CATALOG, adventurePropById, adventurePropByName,
  type AdventurePropId } from '../../content/adventureProps';
import { ARTIFACTS } from '../../content/artifacts';
import { ITEMS } from '../../content/items';
import { FACTIONS } from '../../content/factions';
import { FACTION_HEROES, HEROES } from '../../content/heroes';
import { TERRAIN } from '../../content/terrain';
import type {
  ArtifactId, FactionId, GameMap, HeroDefinitionId, ItemId, PlayerId, ResourceId,
  SpellId, TerrainId, TerrainSkinId, UnitId, UnitTier,
} from '../../core/types';
import type {
  EditorGuardianCreature, EditorMapDocument, EditorMapGuardian, EditorMapHero, EditorMapObject,
  EditorMapReward, EditorRewardBundle, JsonValue,
} from '../../core/mapEditor';
import { createDefaultEditorGuardian, EDITOR_GUARDIAN_TIERS } from '../../core/mapEditor';
import { ArtifactSprite, ItemSprite, mapObjectSpriteId } from '../assets';
import {
  EMPTY_TERRAIN_HISTORY, appendUniqueEditorCells, canPlaceEditorProp, clampEditorZoom,
  commitTerrainEdit, createPropEraseEdit, createPropMoveEdit, createPropPlacementEdit,
  createTerrainEdit, editorFootprintCells, editorMoveAnchor, editorPropFootprint,
  lastDifferentVertex, legalEditorTerrainTile, pointerStartsPaint,
  pointerStartsPan, rasterizeEditorBrushLine, rasterizeEditorEllipse,
  rasterizeEditorPolygon, rasterizeEditorRectangle, redoTerrainEdit, undoTerrainEdit,
  type EditorCell, type TerrainBrushShape, type TerrainHistory, type TerrainPaintTool,
} from '../mapEditorTerrain';
import { deriveMountainRanges, mountainRangeGeometry } from '../mountainRanges';
import {
  EDITOR_ITEM_CHOICES, EDITOR_RESOURCE_CHOICES, EDITOR_SCHOOL_CHOICES,
  EDITOR_SKILL_CHOICES, EDITOR_SPELL_CHOICES, EDITOR_STRUCTURE_CATALOG,
  EDITOR_UNIT_CHOICES, EDITOR_DEDICATED_REWARD_KINDS, EDITOR_REWARD_CARRIER_KINDS,
  createStructureDeleteEdit, createStructureMoveEdit,
  createStructurePlacementEdit, createStructureUpdateEdit,
  createWhirlpoolPairPlacementEdit, editorStructureByKind,
  editorStructureEntrance, editorStructureFootprint, editorStructurePresentationObject,
  canPlaceEditorStructure, defaultEditorMineProperties, defaultEditorStructureProperties,
  editorItemInstance, ownerChoices,
  type EditorStructureKind, type StructureFieldDefinition,
} from '../mapEditorStructures';
import {
  EDITOR_CASTLE_ENTRANCE, EDITOR_CASTLE_FOOTPRINT, EDITOR_PLAYER_FLAGS,
  canPlaceEditorCastle, createCastleDeleteEdit, createCastleMoveEdit,
  createCastlePlacementEdit, createCastleUpdateEdit,
  editorCastleCanvasGeometry, editorCastleFlagAnchor, editorCastleSpriteId,
  type CastleMutationResult,
} from '../mapEditorCastles';
import { EditorCastleInspector, EditorPlayerSlots } from './EditorCastleControls';
import {
  EDITOR_HERO_FOOTPRINT, canPlaceEditorHero, createHeroDeleteEdit, createHeroMoveEdit,
  createHeroPlacementEdit, createHeroUpdateEdit, editorHeroCanvasGeometry,
  editorHeroDefinitions, editorHeroFlagAnchor, editorHeroSpriteId, type HeroMutationResult,
} from '../mapEditorHeroes';
import { EditorHeroInspector } from './EditorHeroControls';
import {
  EDITOR_AUTHORABLE_GUARDIAN_CATALOG,
  EDITOR_GUARDIAN_FOOTPRINT, EDITOR_GUARDIAN_GROUPS, canPlaceEditorGuardian,
  createGuardianDeleteEdit, createGuardianMoveEdit, createGuardianPlacementEdit,
  createGuardianUpdateEdit, editorGuardianCanvasGeometry,
  editorGuardianCatalogEntry, editorGuardianSpriteEntry, type GuardianMutationResult,
} from '../mapEditorGuardians';
import { EditorGuardianInspector } from './EditorGuardianControls';
import {
  EDITOR_ARTIFACT_CATALOG, EDITOR_ARTIFACT_GROUPS, EDITOR_ITEM_CATALOG,
  EDITOR_ITEM_GROUPS, EDITOR_RESOURCE_IDS, EDITOR_TAUGHT_SPELL_GROUPS,
  artifactRewardBundle, canPlaceEditorReward, createDirectRewardPlacementEdit,
  createOverlayStrokeEdit, createRewardCarrierPlacementEdit, createRewardDeleteEdit,
  createRewardMoveEdit, createRewardUpdateEdit, itemRewardBundle, resourceRewardBundle,
  rewardPrimaryKind, spellRewardBundle, type RewardMutationResult,
} from '../mapEditorRewards';
import { EditorRewardInspector } from './EditorRewardControls';
import { ContentIcon } from './ContentIcon';

const TILE = 32;
const TERRAIN_TOOLS: Array<{ id: TerrainPaintTool; label: string; shortcut?: string }> = [
  { id: 'pencil', label: 'Pencil', shortcut: 'P' },
  { id: 'brush', label: 'Brush', shortcut: 'B' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'E' },
  { id: 'polygon', label: 'Polygon / area', shortcut: 'G' },
  { id: 'pan', label: 'Pan', shortcut: 'H' },
];

const OBJECT_TOOLS: Array<{ id: TerrainPaintTool; label: string; shortcut: string }> = [
  { id: 'select', label: 'Select / move', shortcut: 'V' },
  { id: 'erase', label: 'Delete object', shortcut: 'X' },
];

type PointerGesture = {
  pointerId: number;
  kind: 'paint' | 'shape' | 'pan' | 'move';
  start: EditorCell;
  last: EditorCell;
  startClient: { x: number; y: number };
  startScroll: { left: number; top: number };
  cells: EditorCell[];
  objectId?: string;
  entityKind?: 'object' | 'castle' | 'hero' | 'guardian' | 'reward';
  grabOffset?: EditorCell;
};

function drawEditorFlag(
  context: CanvasRenderingContext2D, position: EditorCell,
  entry: NonNullable<ReturnType<typeof manifestEntry>>, owner: PlayerId | 'neutral', alpha = 1,
) {
  if (owner === 'neutral') return;
  const anchor = editorCastleFlagAnchor(position, entry);
  if (!anchor) return;
  context.save(); context.globalAlpha = alpha;
  context.strokeStyle = '#34291d'; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(anchor.x, anchor.y); context.lineTo(anchor.x, anchor.y - 15);
  context.stroke();
  context.fillStyle = EDITOR_PLAYER_FLAGS[owner].color; context.strokeStyle = '#302015';
  context.beginPath(); context.moveTo(anchor.x + 1, anchor.y - 15);
  context.lineTo(anchor.x + 9, anchor.y - 12); context.lineTo(anchor.x + 1, anchor.y - 8);
  context.closePath(); context.fill(); context.stroke(); context.restore();
}

type RewardStamp =
  | { kind: 'bundle'; label: string; bundle: EditorRewardBundle }
  | { kind: 'carrier'; carrierKind: typeof import('../../core/mapEditor/validation').REWARD_SITE_KINDS[number] };

export type EditorMutationSelectionIntent = 'inspect-result' | 'leave-unselected';

export interface EditorCanvasSelection {
  objectId: string | null;
  castleId: string | null;
  heroId: string | null;
  guardianId: string | null;
  rewardId: string | null;
}

export const EMPTY_EDITOR_CANVAS_SELECTION: EditorCanvasSelection = {
  objectId: null,
  castleId: null,
  heroId: null,
  guardianId: null,
  rewardId: null,
};

interface ObjectMutationSelectionResult {
  object?: EditorMapObject | null;
  castle?: { id: string } | null;
  hero?: { id: string } | null;
  guardian?: { id: string } | null;
  reward?: EditorMapReward | null;
}

/** Placement is authoring, not selection. Only an explicit inspect intent may open details. */
export function editorSelectionAfterObjectMutation(
  result: ObjectMutationSelectionResult,
  document: EditorMapDocument,
  intent: EditorMutationSelectionIntent,
): EditorCanvasSelection {
  if (intent === 'leave-unselected') return EMPTY_EDITOR_CANVAS_SELECTION;
  if (result.guardian !== undefined) return {
    ...EMPTY_EDITOR_CANVAS_SELECTION, guardianId: result.guardian?.id ?? null,
  };
  if (result.hero !== undefined) return {
    ...EMPTY_EDITOR_CANVAS_SELECTION, heroId: result.hero?.id ?? null,
  };
  if (result.castle !== undefined) return {
    ...EMPTY_EDITOR_CANVAS_SELECTION, castleId: result.castle?.id ?? null,
  };
  if (result.object !== undefined) return {
    ...EMPTY_EDITOR_CANVAS_SELECTION,
    objectId: result.object?.id ?? null,
    rewardId: result.reward?.id ?? (result.object ? document.rewards.find((reward) =>
      reward.delivery.kind === 'site' && reward.delivery.objectId === result.object!.id)?.id ?? null
      : null),
  };
  return EMPTY_EDITOR_CANVAS_SELECTION;
}

function drawEditorHeroFlag(
  context: CanvasRenderingContext2D, position: EditorCell, owner: PlayerId, alpha = 1,
) {
  const anchor = editorHeroFlagAnchor(position);
  context.save(); context.globalAlpha = alpha;
  context.strokeStyle = '#34291d'; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(anchor.x, anchor.y); context.lineTo(anchor.x, anchor.y - 15);
  context.stroke();
  context.fillStyle = EDITOR_PLAYER_FLAGS[owner].color; context.strokeStyle = '#302015';
  context.beginPath(); context.moveTo(anchor.x + 1, anchor.y - 15);
  context.lineTo(anchor.x + 9, anchor.y - 12); context.lineTo(anchor.x + 1, anchor.y - 8);
  context.closePath(); context.fill(); context.stroke(); context.restore();
}

/** Mirrors AdventureMap's deliberate crossed-swords shield fallback at the same world anchor. */
function drawEditorGuardianFallback(
  context: CanvasRenderingContext2D, position: EditorCell, alpha = 1, glyph = '⚔',
) {
  const x = position.x * TILE + TILE / 2;
  const y = position.y * TILE + TILE / 2;
  context.save(); context.globalAlpha = alpha; context.translate(x, y);
  context.fillStyle = '#743d35'; context.strokeStyle = '#f0d49a'; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(0, -12); context.lineTo(10, -7);
  context.lineTo(8, 7); context.lineTo(0, 13); context.lineTo(-8, 7);
  context.lineTo(-10, -7); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = '#fff1c2'; context.font = '15px serif';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(glyph, 0, 1);
  context.restore();
}

const tileKey = ({ x, y }: EditorCell) => `${x},${y}`;
export const EDITOR_TERRAIN_RASTER_MAX_PIXELS = 4096 * 4096;

export function editorTerrainRasterCanCache(width: number, height: number): boolean {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
    && width <= EDITOR_TERRAIN_RASTER_MAX_PIXELS / height;
}

/** Immutable editor edits share untouched rows; value comparison also keeps imports/clones safe. */
export function changedEditorTerrainCells(
  before: EditorMapDocument['tiles'], after: EditorMapDocument['tiles'],
): EditorCell[] {
  const changed: EditorCell[] = [];
  for (let y = 0; y < after.length; y += 1) {
    if (before[y] === after[y]) continue;
    for (let x = 0; x < after[y].length; x += 1) {
      const previous = before[y]?.[x];
      const next = after[y][x];
      if (previous && previous.terrain === next.terrain && previous.skin === next.skin) continue;
      changed.push({ x, y });
    }
  }
  return changed;
}

export function editorPreviewChangesMountainTopology(
  tiles: EditorMapDocument['tiles'], preview: readonly EditorCell[],
  selectedTile: EditorMapDocument['tiles'][number][number],
): boolean {
  return selectedTile.terrain === 'mountain'
    || preview.some((cell) => tiles[cell.y]?.[cell.x]?.terrain === 'mountain');
}

export function ensureEditorCanvasImage(
  cache: Map<string, HTMLImageElement>, file: string, onLoad: () => void,
): HTMLImageElement | null {
  let image = cache.get(file);
  if (!image && typeof Image !== 'undefined') {
    image = new Image();
    image.onload = onLoad;
    image.src = file;
    cache.set(file, image);
  }
  return image ?? null;
}

export function editorPropCanvasGeometry(
  position: EditorCell,
  entry: { w: number; h: number; anchor: { x: number; y: number } },
) {
  return {
    x: position.x * TILE - entry.anchor.x,
    y: position.y * TILE - entry.anchor.y,
    width: entry.w,
    height: entry.h,
  };
}

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function variantFor(x: number, y: number): number {
  let value = (Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16;
  return value % 3;
}

function terrainAssetFile(
  terrain: TerrainId, skin: TerrainSkinId, x: number, y: number,
): string | null {
  const variants = [variantFor(x, y), 1, 0, 2];
  for (const variant of variants) {
    const entry = manifestEntry(assetId.terrain(terrain, skin, variant));
    if (entry) return entry.file;
  }
  return null;
}

function fallbackTerrainColor(terrain: TerrainId): string {
  return ({
    meadow: '#587848', deepwood: '#183f2b', mosswold: '#476a45', ashsteppe: '#80634a',
    barrowfield: '#656b4e', lacquerFlats: '#956a61', hush: '#b9c9c9', mire: '#425b4c',
    mountain: '#77746b', water: '#315b78',
  } satisfies Record<TerrainId, string>)[terrain];
}

function editorRoadMask(position: EditorCell, roadKeys: ReadonlySet<string>): string {
  const mask = [
    roadKeys.has(`${position.x},${position.y - 1}`) ? 'n' : '',
    roadKeys.has(`${position.x + 1},${position.y}`) ? 'e' : '',
    roadKeys.has(`${position.x},${position.y + 1}`) ? 's' : '',
    roadKeys.has(`${position.x - 1},${position.y}`) ? 'w' : '',
  ].join('');
  return mask || 'isolated';
}

export function editorRewardSpriteId(reward: EditorMapReward): string | null {
  if (reward.bundle.artifacts[0]) return assetId.mapObject('artifact', reward.bundle.artifacts[0].id);
  if (reward.bundle.items[0]) return assetId.mapObject('item', reward.bundle.items[0].id);
  const resource = Object.keys(reward.bundle.resources)[0];
  if (resource) return assetId.mapObject('pile', resource);
  return null;
}

function drawRewardFallback(
  context: CanvasRenderingContext2D, reward: EditorMapReward, position: EditorCell, alpha = 1,
) {
  const kind = rewardPrimaryKind(reward);
  const glyph = kind === 'artifact' ? '◆' : kind === 'item' ? '◇'
    : kind === 'resource' ? '●' : '✦';
  context.save(); context.globalAlpha = alpha;
  context.fillStyle = kind === 'artifact' ? '#d8b95d' : kind === 'item' ? '#8fd6d0'
    : kind === 'resource' ? '#ead18a' : '#c7a9ff';
  context.strokeStyle = '#2d251b'; context.lineWidth = 2;
  context.font = 'bold 21px serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.strokeText(glyph, position.x * TILE + 16, position.y * TILE + 16);
  context.fillText(glyph, position.x * TILE + 16, position.y * TILE + 16);
  context.restore();
}

const ARTIFACT_SLOT_GLYPHS = {
  head: '♛', cloak: '◢', amulet: '◉', weapon: '⚔', shield: '⬟', armor: '♜',
  ring: '○', boots: '♞', misc: '✦',
} as const;

export function EditorTerrainCanvas({
  document, onDocumentChange,
}: {
  document: EditorMapDocument;
  onDocumentChange: (document: EditorMapDocument) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<PointerGesture | null>(null);
  const spaceHeld = useRef(false);
  const images = useRef(new Map<string, HTMLImageElement>());
  const redrawLatest = useRef<() => void>(() => undefined);
  const terrainRaster = useRef<{
    documentId: string; tiles: EditorMapDocument['tiles']; canvas: HTMLCanvasElement;
    loading: boolean;
  } | null>(null);
  const [tool, setTool] = useState<TerrainPaintTool>('pencil');
  const [terrain, setTerrain] = useState<TerrainId>('meadow');
  const [skin, setSkin] = useState<TerrainSkinId>(TERRAIN.meadow.skins[0]);
  const [ordinaryTile, setOrdinaryTile] = useState(() => ({
    terrain: 'meadow' as TerrainId, skin: TERRAIN.meadow.skins[0],
  }));
  const [mountainSkin, setMountainSkin] = useState<TerrainSkinId>(TERRAIN.mountain.skins[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [brushShape, setBrushShape] = useState<TerrainBrushShape>('round');
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState<EditorCell[]>([]);
  const [hovered, setHovered] = useState<EditorCell | null>(null);
  const [polygon, setPolygon] = useState<EditorCell[]>([]);
  const [history, setHistory] = useState<TerrainHistory>(EMPTY_TERRAIN_HISTORY);
  const [selectedPropId, setSelectedPropId] = useState<AdventurePropId>('old-oak');
  const [selectedStructureKind, setSelectedStructureKind] = useState<EditorStructureKind>('mine');
  const [selectedMineResource, setSelectedMineResource] = useState<ResourceId>('gold');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedCastleId, setSelectedCastleId] = useState<string | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [castleOwner, setCastleOwner] = useState<PlayerId | 'neutral'>('p1');
  const [castleFaction, setCastleFaction] = useState<FactionId>('hearthguard');
  const [heroOwner, setHeroOwner] = useState<PlayerId>('p1');
  const [heroFaction, setHeroFaction] = useState<FactionId>('hearthguard');
  const [heroDefinitionId, setHeroDefinitionId] = useState<HeroDefinitionId>('aldith');
  const [guardianStamp, setGuardianStamp] = useState<EditorGuardianCreature>({
    unitId: EDITOR_AUTHORABLE_GUARDIAN_CATALOG[0].unit.id,
  });
  const [guardianSearch, setGuardianSearch] = useState('');
  const [artifactSearch, setArtifactSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [rewardStamp, setRewardStamp] = useState<RewardStamp>({
    kind: 'bundle', label: 'Artifact reward', bundle: artifactRewardBundle('skirmishersBlade'),
  });
  const [overlayMode, setOverlayMode] = useState<'paint' | 'erase'>('paint');
  const [resourceAmount, setResourceAmount] = useState(500);
  const [taughtSpellId, setTaughtSpellId] = useState<SpellId>('rally');
  const [pendingWhirlpool, setPendingWhirlpool] = useState<EditorCell | null>(null);
  const [mutationMessage, setMutationMessage] = useState('');

  const size = document.dimensions;
  const selectedTile = useMemo(() => legalEditorTerrainTile(terrain, skin), [skin, terrain]);
  const documentMountainRanges = useMemo(() => deriveMountainRanges({
    id: document.id, name: document.metadata.name, width: size.width, height: size.height,
    seed: 0, terrain: document.tiles, objects: [], victory: document.victory,
  } as GameMap), [document.id, document.metadata.name, document.tiles, document.victory,
    size.height, size.width]);
  const terrainChoices = useMemo(
    () => Object.values(TERRAIN).filter((entry) => entry.id !== 'mountain'),
    [],
  );
  const selectedProp = adventurePropById(selectedPropId)!;
  const selectedObject = document.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedCastle = document.castles.find((castle) => castle.id === selectedCastleId) ?? null;
  const selectedHero = document.heroes.find((hero) => hero.id === selectedHeroId) ?? null;
  const selectedGuardian = document.guardians.find((guardian) =>
    guardian.id === selectedGuardianId) ?? null;
  const selectedReward = document.rewards.find((reward) => reward.id === selectedRewardId) ?? null;
  const effectiveCastleOwner = castleOwner === 'neutral'
    || document.players.some((player) => player.id === castleOwner) ? castleOwner : 'neutral';
  const effectiveHeroOwner = document.players.some((player) => player.id === heroOwner)
    ? heroOwner : document.players[0]?.id ?? null;

  const clearGesture = useCallback(() => {
    gesture.current = null;
    setPreview([]);
  }, []);

  const cancel = useCallback(() => {
    clearGesture();
    setPolygon([]);
    setPendingWhirlpool(null);
  }, [clearGesture]);

  const applyCells = useCallback((cells: Iterable<EditorCell>) => {
    const edit = tool === 'road' || tool === 'seam'
      ? createOverlayStrokeEdit(document, tool === 'road' ? 'roads' : 'seams', cells, overlayMode)
      : createTerrainEdit(document, cells, selectedTile);
    const result = commitTerrainEdit(document, history, edit);
    if (result.document !== document) {
      setHistory(result.history);
      onDocumentChange(result.document);
    }
    setPreview([]);
    setMutationMessage('');
  }, [document, history, onDocumentChange, overlayMode, selectedTile, tool]);

  const applySelection = useCallback((selection: EditorCanvasSelection) => {
    setSelectedObjectId(selection.objectId);
    setSelectedCastleId(selection.castleId);
    setSelectedHeroId(selection.heroId);
    setSelectedGuardianId(selection.guardianId);
    setSelectedRewardId(selection.rewardId);
  }, []);

  const commitObjectMutation = useCallback((
    result: ReturnType<typeof createPropPlacementEdit> | CastleMutationResult | HeroMutationResult
      | GuardianMutationResult,
    selectionIntent: EditorMutationSelectionIntent,
  ) => {
    if (!result.ok) {
      const messages: Record<string, string> = {
        overlap: 'Cannot place here: the footprint overlaps another authored entity.',
        'out-of-bounds': 'Cannot place here: the footprint leaves the map.',
        'missing-link': 'Place a Cache first, then link this Patient Stone to it.',
        'invalid-id': 'IDs must be unique and begin with a letter.',
        'requires-linked-reward': 'This carrier requires a linked portable reward. Place it from the later Rewards workflow; existing imported carriers remain editable here.',
        'requires-dedicated-reward': 'Place new direct pickups from Artifacts, Items, or Resources & rewards. Existing imported pickups remain editable here.',
        'referenced-objective': 'This entity is an active victory or defeat target. Relink the objective before deleting it.',
        'no-player': 'Add at least one player slot before placing a starting hero.',
        'invalid-owner': 'Choose an existing player slot for this hero owner.',
        'invalid-definition': 'Choose a named hero from the selected faction.',
        'invalid-army': 'An army needs 1–7 unique canonical creatures with positive whole counts.',
        'invalid-unit': 'Choose a canonical creature for this guardian encounter.',
        'invalid-protects': 'Choose an existing compatible map object, or leave this guardian standalone.',
        'invalid-drop': 'Choose a supported canonical direct item drop.',
      };
      setMutationMessage(messages[result.reason] ?? 'That authored entity is no longer available.');
      return false;
    }
    const committed = commitTerrainEdit(document, history, result.edit);
    if (committed.document !== document) {
      setHistory(committed.history);
      onDocumentChange(committed.document);
    }
    applySelection(editorSelectionAfterObjectMutation(result, document, selectionIntent));
    setMutationMessage('');
    return true;
  }, [applySelection, document, history, onDocumentChange]);

  const commitRewardMutation = useCallback((result: RewardMutationResult) => {
    if (!result.ok) {
      const messages: Record<string, string> = {
        overlap: 'Cannot place here: the pickup overlaps another authored entity.',
        'out-of-bounds': 'Cannot place here: the pickup leaves the map.',
        'invalid-id': 'Reward IDs must be globally unique and begin with a letter.',
        'empty-bundle': 'A reward must contain at least one artifact, item, resource, or taught spell.',
        'invalid-bundle': 'The reward contains invalid catalog state or a nonpositive amount.',
        'site-reward-requires-carrier': 'Edit or delete this site reward through its carrier transaction.',
        'not-found': 'That reward no longer exists.',
      };
      setMutationMessage(messages[result.reason] ?? 'Reward edit was refused.');
      return false;
    }
    const committed = commitTerrainEdit(document, history, result.edit);
    if (committed.document !== document) {
      setHistory(committed.history); onDocumentChange(committed.document);
    }
    setSelectedRewardId(result.reward?.id ?? null);
    setSelectedObjectId(null); setSelectedCastleId(null); setSelectedHeroId(null);
    setSelectedGuardianId(null); setMutationMessage('');
    return true;
  }, [document, history, onDocumentChange]);

  const commitPlayerEdit = useCallback((edit: import('../mapEditorTerrain').PlayerEdit) => {
    const committed = commitTerrainEdit(document, history, edit);
    if (committed.document !== document) {
      setHistory(committed.history); onDocumentChange(committed.document);
    }
  }, [document, history, onDocumentChange]);

  const undo = useCallback(() => {
    const result = undoTerrainEdit(document, history);
    if (result.document !== document) onDocumentChange(result.document);
    setHistory(result.history);
    cancel();
  }, [cancel, document, history, onDocumentChange]);

  const redo = useCallback(() => {
    const result = redoTerrainEdit(document, history);
    if (result.document !== document) onDocumentChange(result.document);
    setHistory(result.history);
    cancel();
  }, [cancel, document, history, onDocumentChange]);

  const finishPolygon = useCallback(() => {
    if (polygon.length >= 3) applyCells(rasterizeEditorPolygon(polygon, size));
    setPolygon([]);
    setPreview([]);
  }, [applyCells, polygon, size]);

  useEffect(() => {
    setHistory(EMPTY_TERRAIN_HISTORY);
    cancel();
    setSelectedObjectId(null);
    setSelectedCastleId(null);
    setSelectedHeroId(null);
    setSelectedGuardianId(null);
    setSelectedRewardId(null);
  }, [cancel, document.id, document.dimensions.height, document.dimensions.width]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return;
      if (event.code === 'Space') {
        spaceHeld.current = true;
        event.preventDefault();
      }
      if (event.key === 'Escape') { cancel(); return; }
      if (event.key === 'Enter' && polygon.length) { event.preventDefault(); finishPolygon(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault(); redo(); return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const selected = [...TERRAIN_TOOLS, ...OBJECT_TOOLS].find((candidate) =>
        candidate.shortcut?.toLowerCase() === event.key.toLowerCase());
      if (selected) { setTool(selected.id); cancel(); }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') spaceHeld.current = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', cancel);
    };
  }, [cancel, finishPolygon, polygon.length, redo, undo]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    let loading = false;
    const previewSet = new Set(preview.map(tileKey));
    const drawTerrainTile = (
      target: CanvasRenderingContext2D,
      tile: EditorMapDocument['tiles'][number][number], x: number, y: number,
      onImageLoad: () => void,
    ): boolean => {
      const legalSkin = TERRAIN[tile.terrain].skins.includes(tile.skin as TerrainSkinId)
        ? tile.skin! : TERRAIN[tile.terrain].skins[0];
      target.fillStyle = fallbackTerrainColor(tile.terrain);
      target.fillRect(x * TILE, y * TILE, TILE, TILE);
      const file = terrainAssetFile(tile.terrain, legalSkin, x, y);
      if (file && typeof Image !== 'undefined') {
        const image = ensureEditorCanvasImage(images.current, file, onImageLoad);
        if (image?.complete && image.naturalWidth) {
          target.drawImage(image, x * TILE, y * TILE, TILE, TILE);
          return true;
        }
        return false;
      }
      return true;
    };
    if (!editorTerrainRasterCanCache(canvas.width, canvas.height)) {
      // A 256×256 map already owns one 8192² visible canvas (~256 MiB RGBA). Do not silently
      // double that browser allocation; oversized maps retain the direct single-canvas path.
      terrainRaster.current = null;
      for (let y = 0; y < size.height; y += 1) for (let x = 0; x < size.width; x += 1) {
        if (!drawTerrainTile(context, document.tiles[y][x], x, y,
          () => redrawLatest.current())) {
          loading = true;
        }
      }
    } else {
      let raster = terrainRaster.current;
      const newRaster = !raster || raster.documentId !== document.id
        || raster.canvas.width !== canvas.width || raster.canvas.height !== canvas.height;
      if (newRaster) {
        const rasterCanvas = canvas.ownerDocument.createElement('canvas');
        rasterCanvas.width = canvas.width;
        rasterCanvas.height = canvas.height;
        const rasterContext = rasterCanvas.getContext('2d');
        if (!rasterContext) return;
        rasterContext.imageSmoothingEnabled = false;
        let rasterLoading = false;
        const invalidateRaster = () => {
          terrainRaster.current = null;
          redrawLatest.current();
        };
        for (let y = 0; y < size.height; y += 1) for (let x = 0; x < size.width; x += 1) {
          if (!drawTerrainTile(rasterContext, document.tiles[y][x], x, y, invalidateRaster)) {
            rasterLoading = true;
          }
        }
        raster = {
          documentId: document.id, tiles: document.tiles, canvas: rasterCanvas,
          loading: rasterLoading,
        };
        // A fallback-backed raster is transient. Existing in-flight images may own an earlier
        // onload callback, so only retain the raster once every terrain image is actually ready.
        terrainRaster.current = rasterLoading ? null : raster;
      } else if (raster && raster.tiles !== document.tiles) {
        const rasterContext = raster.canvas.getContext('2d');
        if (!rasterContext) return;
        rasterContext.imageSmoothingEnabled = false;
        let rasterLoading = false;
        const invalidateRaster = () => {
          terrainRaster.current = null;
          redrawLatest.current();
        };
        for (const { x, y } of changedEditorTerrainCells(raster.tiles, document.tiles)) {
          if (!drawTerrainTile(rasterContext, document.tiles[y][x], x, y, invalidateRaster)) {
            rasterLoading = true;
          }
        }
        raster = { ...raster, tiles: document.tiles, loading: rasterLoading };
        terrainRaster.current = rasterLoading ? null : raster;
      }
      if (!raster) return;
      context.drawImage(raster.canvas, 0, 0);
      loading = raster.loading;
    }

    const paintsTerrainPreview = previewSet.size > 0 && pointerStartsPaint(0, tool, false);
    if (paintsTerrainPreview) for (const cell of preview) {
      if (!drawTerrainTile(context, selectedTile, cell.x, cell.y, () => {
        terrainRaster.current = null;
        redrawLatest.current();
      })) loading = true;
    }
    const roadKeys = new Set(document.overlays.roads.map((cell) => tileKey(cell)));
    for (const position of document.overlays.seams) {
      const entry = manifestEntry(assetId.overlay('seam', 'default'));
      const image = entry ? ensureEditorCanvasImage(images.current, entry.file,
        () => redrawLatest.current()) : null;
      if (entry && image?.complete && image.naturalWidth) {
        context.drawImage(image, position.x * TILE, position.y * TILE, entry.w, entry.h);
      } else {
        context.strokeStyle = '#d6b4ff'; context.lineWidth = 2;
        context.beginPath(); context.moveTo(position.x * TILE + 3, position.y * TILE + 3);
        context.lineTo(position.x * TILE + 29, position.y * TILE + 29); context.stroke();
      }
    }
    for (const position of document.overlays.roads) {
      const entry = manifestEntry(assetId.overlay('road', editorRoadMask(position, roadKeys)));
      const image = entry ? ensureEditorCanvasImage(images.current, entry.file,
        () => redrawLatest.current()) : null;
      if (entry && image?.complete && image.naturalWidth) {
        context.drawImage(image, position.x * TILE, position.y * TILE, entry.w, entry.h);
      } else {
        context.strokeStyle = '#b7915e'; context.lineWidth = 4;
        context.beginPath(); context.moveTo(position.x * TILE, position.y * TILE + 16);
        context.lineTo(position.x * TILE + 32, position.y * TILE + 16); context.stroke();
      }
    }
    const previewChangesMountains = paintsTerrainPreview
      && editorPreviewChangesMountainTopology(document.tiles, preview, selectedTile);
    let ranges = documentMountainRanges;
    if (previewChangesMountains) {
      const displayTiles = document.tiles.map((row) => [...row]);
      for (const cell of preview) displayTiles[cell.y][cell.x] = selectedTile;
      ranges = deriveMountainRanges({
        id: document.id, name: document.metadata.name, width: size.width, height: size.height,
        seed: 0, terrain: displayTiles, objects: [], victory: document.victory,
      } as GameMap);
    }
    const objectItems = document.objects.flatMap((object) => {
      if (object.kind === 'obstacle' && !adventurePropByName(String(object.properties.prop))) return [];
      const footprint = object.kind === 'obstacle'
        ? editorPropFootprint(object) : editorStructureFootprint(object);
      return [{ kind: 'object' as const, row: object.position.y + footprint.h - 1,
        col: object.position.x, key: `object:${object.id}`, object }];
    });
    const castleItems = document.castles.map((castle) => ({
      kind: 'castle' as const, row: castle.position.y + EDITOR_CASTLE_FOOTPRINT.h - 1,
      col: castle.position.x, key: `castle:${castle.id}`, castle,
    }));
    const heroItems = document.heroes.map((hero) => ({
      kind: 'hero' as const, row: hero.position.y, col: hero.position.x,
      key: `hero:${hero.id}`, hero,
    }));
    const guardianItems = document.guardians.map((guardian) => ({
      kind: 'guardian' as const, row: guardian.position.y, col: guardian.position.x,
      key: `guardian:${guardian.id}`, guardian,
    }));
    const rewardItems = document.rewards.flatMap((reward) => reward.delivery.kind === 'pickup'
      ? [{ kind: 'reward' as const, row: reward.delivery.position.y,
        col: reward.delivery.position.x, key: `reward:${reward.id}`, reward }] : []);
    const painterItems = [
      ...ranges.map((range) => ({ kind: 'mountain' as const, row: range.position.y,
        col: range.position.x, key: range.key, range })),
      ...objectItems,
      ...castleItems,
      ...guardianItems,
      ...rewardItems,
      ...heroItems,
    ].sort((left, right) => left.row - right.row || left.col - right.col
      || left.key.localeCompare(right.key));
    for (const item of painterItems) {
      if (item.kind === 'mountain') {
        const geometry = mountainRangeGeometry(item.range, TILE);
        const entry = manifestEntry(assetId.decoration('mountain', item.range.variant));
        if (!entry) continue;
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          context.save();
          context.beginPath();
          context.rect(geometry.visual.x, geometry.visual.y,
            geometry.visual.width, geometry.visual.height);
          context.clip();
          context.drawImage(image, geometry.sprite.x, geometry.sprite.y,
            geometry.sprite.width, geometry.sprite.height);
          context.restore();
        } else loading = true;
      } else if (item.kind === 'object') {
        const spriteId = item.object.kind === 'obstacle'
          ? assetId.mapObject('obstacle', String(item.object.properties.prop))
          : mapObjectSpriteId(editorStructurePresentationObject(item.object));
        const entry = manifestEntry(spriteId);
        if (!entry) continue;
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          const geometry = editorPropCanvasGeometry(item.object.position, entry);
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
        }
        else loading = true;
      } else if (item.kind === 'castle') {
        const spriteId = editorCastleSpriteId(item.castle);
        const entry = manifestEntry(spriteId);
        if (!entry) continue;
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          const geometry = editorCastleCanvasGeometry(item.castle.position, entry);
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
          drawEditorFlag(context, item.castle.position, entry, item.castle.owner);
        } else loading = true;
      } else if (item.kind === 'hero') {
        const entry = manifestEntry(editorHeroSpriteId(item.hero));
        if (!entry) continue;
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          const geometry = editorHeroCanvasGeometry(item.hero.position, entry);
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
          drawEditorHeroFlag(context, item.hero.position, item.hero.owner);
        } else loading = true;
      } else if (item.kind === 'guardian') {
        const firstStack = item.guardian.army[0];
        const representative = firstStack && 'unitId' in firstStack ? firstStack.unitId : undefined;
        const entry = representative ? editorGuardianSpriteEntry(representative) : undefined;
        if (entry) {
          const image = ensureEditorCanvasImage(images.current, entry.file,
            () => redrawLatest.current());
          if (image?.complete && image.naturalWidth) {
            const geometry = editorGuardianCanvasGeometry(item.guardian.position, entry);
            context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
          } else loading = true;
        } else drawEditorGuardianFallback(context, item.guardian.position, 1,
          firstStack && 'randomTier' in firstStack ? `T${firstStack.randomTier}` : '⚔');
      } else {
        const position = item.reward.delivery.kind === 'pickup'
          ? item.reward.delivery.position : { x: 0, y: 0 };
        const spriteId = editorRewardSpriteId(item.reward);
        const entry = spriteId ? manifestEntry(spriteId) : undefined;
        const image = entry ? ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current()) : null;
        if (entry && image?.complete && image.naturalWidth) {
          const geometry = editorPropCanvasGeometry(position, entry);
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
        } else drawRewardFallback(context, item.reward, position);
      }
    }

    context.strokeStyle = zoom >= 0.75 ? '#e7e1cf24' : 'transparent';
    context.lineWidth = 1;
    if (zoom >= 0.75) {
      context.beginPath();
      for (let x = 0; x <= size.width; x += 1) {
        context.moveTo(x * TILE + .5, 0); context.lineTo(x * TILE + .5, size.height * TILE);
      }
      for (let y = 0; y <= size.height; y += 1) {
        context.moveTo(0, y * TILE + .5); context.lineTo(size.width * TILE, y * TILE + .5);
      }
      context.stroke();
    }
    if (previewSet.size) {
      context.fillStyle = selectedTile.terrain === 'mountain' ? '#8f8a7d3d' : '#f2d36f44';
      context.strokeStyle = '#f7e8a8';
      for (const key of previewSet) {
        const [x, y] = key.split(',').map(Number);
        context.fillRect(x * TILE, y * TILE, TILE, TILE);
        context.strokeRect(x * TILE + .75, y * TILE + .75, TILE - 1.5, TILE - 1.5);
      }
    }
    const propPreviewObject: EditorMapObject | null = tool === 'prop' && hovered ? {
      id: 'editor-prop-preview', kind: 'obstacle', position: hovered,
      ...(selectedProp.footprint.w === 1 && selectedProp.footprint.h === 1
        ? {} : { footprint: { ...selectedProp.footprint } }),
      properties: { prop: selectedProp.prop, ...(selectedProp.anomaly ? { anomaly: true } : {}) },
    } : tool === 'structure' && hovered && selectedStructureKind !== 'whirlpool' ? {
      id: 'editor-structure-preview', kind: selectedStructureKind, position: hovered,
      properties: selectedStructureKind === 'mine'
        ? defaultEditorMineProperties(selectedMineResource)
        : defaultEditorStructureProperties(selectedStructureKind, hovered, document),
    } : tool === 'select' && gesture.current?.kind === 'move' && selectedObject
      ? { ...selectedObject, position: { ...gesture.current.last } } : null;
    const castlePreview = tool === 'castle' && hovered ? {
      id: 'editor-castle-preview', position: hovered, owner: effectiveCastleOwner,
      faction: castleFaction,
    } : tool === 'select' && gesture.current?.kind === 'move'
      && gesture.current.entityKind === 'castle' && selectedCastle
      ? { ...selectedCastle, position: { ...gesture.current.last } } : null;
    const heroPreview: EditorMapHero | null = tool === 'hero' && hovered && effectiveHeroOwner ? {
      id: 'editor-hero-preview', position: hovered, owner: effectiveHeroOwner,
      faction: heroFaction, definitionId: heroDefinitionId, army: [],
    } : tool === 'select' && gesture.current?.kind === 'move'
      && gesture.current.entityKind === 'hero' && selectedHero
      ? { ...selectedHero, position: { ...gesture.current.last } } : null;
    const guardianPreview: EditorMapGuardian | null = tool === 'guardian' && hovered
      ? createDefaultEditorGuardian('editor-guardian-preview', hovered, guardianStamp)
      : tool === 'select' && gesture.current?.kind === 'move'
      && gesture.current.entityKind === 'guardian' && selectedGuardian
      ? { ...selectedGuardian, position: { ...gesture.current.last } } : null;
    const rewardPreview: EditorMapReward | null = tool === 'reward' && hovered
      && rewardStamp.kind === 'bundle' ? {
        id: 'editor-reward-preview', delivery: { kind: 'pickup', position: hovered },
        bundle: rewardStamp.bundle,
      } : tool === 'select' && gesture.current?.kind === 'move'
        && gesture.current.entityKind === 'reward' && selectedReward?.delivery.kind === 'pickup'
        ? { ...selectedReward, delivery: { kind: 'pickup', position: { ...gesture.current.last } } }
        : null;
    if (propPreviewObject) {
      const footprint = propPreviewObject.kind === 'obstacle'
        ? editorPropFootprint(propPreviewObject) : editorStructureFootprint(propPreviewObject);
      const legal = propPreviewObject.kind === 'obstacle'
        ? canPlaceEditorProp(document, propPreviewObject.position, footprint,
          selectedObject?.id === propPreviewObject.id ? selectedObject.id
            : gesture.current?.kind === 'move' ? selectedObject?.id : undefined)
        : canPlaceEditorStructure(document, propPreviewObject.kind, propPreviewObject.position,
          gesture.current?.kind === 'move' ? selectedObject?.id : undefined, footprint);
      const entry = manifestEntry(propPreviewObject.kind === 'obstacle'
        ? assetId.mapObject('obstacle', String(propPreviewObject.properties.prop))
        : mapObjectSpriteId(editorStructurePresentationObject(propPreviewObject)));
      if (entry) {
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          const geometry = editorPropCanvasGeometry(propPreviewObject.position, entry);
          context.save(); context.globalAlpha = legal.ok ? .68 : .28;
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
          context.restore();
        }
      }
      context.fillStyle = legal.ok ? '#84d89438' : '#e35f5548';
      context.strokeStyle = legal.ok ? '#a6efaf' : '#ff8c82';
      for (const cell of editorFootprintCells(propPreviewObject.position, footprint)) {
        context.fillRect(cell.x * TILE, cell.y * TILE, TILE, TILE);
        context.strokeRect(cell.x * TILE + 1, cell.y * TILE + 1, TILE - 2, TILE - 2);
      }
      if (propPreviewObject.kind !== 'obstacle') {
        const entrance = editorStructureEntrance(propPreviewObject);
        context.fillStyle = legal.ok ? '#63d7ffcc' : '#ff8c82cc';
        context.fillRect((propPreviewObject.position.x + entrance.dx) * TILE + 10,
          (propPreviewObject.position.y + entrance.dy) * TILE + 10, 12, 12);
      }
    }
    if (castlePreview) {
      const legal = canPlaceEditorCastle(document, castlePreview.position,
        gesture.current?.entityKind === 'castle' ? selectedCastle?.id : undefined,
        castlePreview.owner);
      const entry = manifestEntry(editorCastleSpriteId(castlePreview));
      if (entry) {
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          const geometry = editorCastleCanvasGeometry(castlePreview.position, entry);
          context.save(); context.globalAlpha = legal.ok ? .68 : .28;
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
          context.restore();
          drawEditorFlag(context, castlePreview.position, entry, castlePreview.owner,
            legal.ok ? .8 : .32);
        }
      }
      context.fillStyle = legal.ok ? '#84d89438' : '#e35f5548';
      context.strokeStyle = legal.ok ? '#a6efaf' : '#ff8c82';
      for (const cell of editorFootprintCells(castlePreview.position, EDITOR_CASTLE_FOOTPRINT)) {
        context.fillRect(cell.x * TILE, cell.y * TILE, TILE, TILE);
        context.strokeRect(cell.x * TILE + 1, cell.y * TILE + 1, TILE - 2, TILE - 2);
      }
      context.fillStyle = legal.ok ? '#63d7ffcc' : '#ff8c82cc';
      context.fillRect((castlePreview.position.x + EDITOR_CASTLE_ENTRANCE.dx) * TILE + 10,
        (castlePreview.position.y + EDITOR_CASTLE_ENTRANCE.dy) * TILE + 10, 12, 12);
    }
    if (heroPreview) {
      const legal = canPlaceEditorHero(document, heroPreview.position, heroPreview.owner,
        gesture.current?.entityKind === 'hero' ? selectedHero?.id : undefined);
      const entry = manifestEntry(editorHeroSpriteId(heroPreview));
      if (entry) {
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          const geometry = editorHeroCanvasGeometry(heroPreview.position, entry);
          context.save(); context.globalAlpha = legal.ok ? .72 : .3;
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
          context.restore();
          drawEditorHeroFlag(context, heroPreview.position, heroPreview.owner,
            legal.ok ? .9 : .35);
        }
      }
      context.fillStyle = legal.ok ? '#84d89438' : '#e35f5548';
      context.strokeStyle = legal.ok ? '#a6efaf' : '#ff8c82';
      context.fillRect(heroPreview.position.x * TILE, heroPreview.position.y * TILE, TILE, TILE);
      context.strokeRect(heroPreview.position.x * TILE + 1,
        heroPreview.position.y * TILE + 1, TILE - 2, TILE - 2);
    }
    if (guardianPreview) {
      const legal = canPlaceEditorGuardian(document, guardianPreview.position,
        gesture.current?.entityKind === 'guardian' ? selectedGuardian?.id : undefined);
      const firstStack = guardianPreview.army[0];
      const representative = firstStack && 'unitId' in firstStack ? firstStack.unitId : undefined;
      const entry = representative ? editorGuardianSpriteEntry(representative) : undefined;
      if (entry) {
        const image = ensureEditorCanvasImage(images.current, entry.file,
          () => redrawLatest.current());
        if (image?.complete && image.naturalWidth) {
          const geometry = editorGuardianCanvasGeometry(guardianPreview.position, entry);
          context.save(); context.globalAlpha = legal.ok ? .72 : .3;
          context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
          context.restore();
        }
      } else drawEditorGuardianFallback(context, guardianPreview.position, legal.ok ? .72 : .3,
        firstStack && 'randomTier' in firstStack ? `T${firstStack.randomTier}` : '⚔');
      context.fillStyle = legal.ok ? '#84d89438' : '#e35f5548';
      context.strokeStyle = legal.ok ? '#a6efaf' : '#ff8c82';
      context.fillRect(guardianPreview.position.x * TILE,
        guardianPreview.position.y * TILE, TILE, TILE);
      context.strokeRect(guardianPreview.position.x * TILE + 1,
        guardianPreview.position.y * TILE + 1, TILE - 2, TILE - 2);
    }
    if (rewardPreview?.delivery.kind === 'pickup') {
      const legal = canPlaceEditorReward(document, rewardPreview.delivery.position,
        gesture.current?.entityKind === 'reward' ? selectedReward?.id : undefined);
      drawRewardFallback(context, rewardPreview, rewardPreview.delivery.position,
        legal.ok ? .72 : .3);
      context.fillStyle = legal.ok ? '#84d89438' : '#e35f5548';
      context.strokeStyle = legal.ok ? '#a6efaf' : '#ff8c82';
      context.fillRect(rewardPreview.delivery.position.x * TILE,
        rewardPreview.delivery.position.y * TILE, TILE, TILE);
      context.strokeRect(rewardPreview.delivery.position.x * TILE + 1,
        rewardPreview.delivery.position.y * TILE + 1, TILE - 2, TILE - 2);
    }
    if (selectedObject) {
      context.strokeStyle = '#fff0a2'; context.lineWidth = 2;
      const footprint = selectedObject.kind === 'obstacle'
        ? editorPropFootprint(selectedObject) : editorStructureFootprint(selectedObject);
      context.strokeRect(selectedObject.position.x * TILE + 1,
        selectedObject.position.y * TILE + 1,
        footprint.w * TILE - 2, footprint.h * TILE - 2);
      if (selectedObject.kind !== 'obstacle') {
        const entrance = editorStructureEntrance(selectedObject);
        context.fillStyle = '#63d7ff99';
        context.fillRect((selectedObject.position.x + entrance.dx) * TILE + 10,
          (selectedObject.position.y + entrance.dy) * TILE + 10, 12, 12);
      }
    }
    if (selectedCastle) {
      context.strokeStyle = '#fff0a2'; context.lineWidth = 2;
      context.strokeRect(selectedCastle.position.x * TILE + 1,
        selectedCastle.position.y * TILE + 1,
        EDITOR_CASTLE_FOOTPRINT.w * TILE - 2, EDITOR_CASTLE_FOOTPRINT.h * TILE - 2);
      context.fillStyle = '#63d7ff99';
      context.fillRect((selectedCastle.position.x + EDITOR_CASTLE_ENTRANCE.dx) * TILE + 10,
        (selectedCastle.position.y + EDITOR_CASTLE_ENTRANCE.dy) * TILE + 10, 12, 12);
    }
    if (selectedHero) {
      context.strokeStyle = '#fff0a2'; context.lineWidth = 2;
      context.strokeRect(selectedHero.position.x * TILE + 1,
        selectedHero.position.y * TILE + 1, TILE - 2, TILE - 2);
    }
    if (selectedGuardian) {
      context.strokeStyle = '#fff0a2'; context.lineWidth = 2;
      context.strokeRect(selectedGuardian.position.x * TILE + 1,
        selectedGuardian.position.y * TILE + 1, TILE - 2, TILE - 2);
    }
    if (selectedReward?.delivery.kind === 'pickup') {
      context.strokeStyle = '#fff0a2'; context.lineWidth = 2;
      context.strokeRect(selectedReward.delivery.position.x * TILE + 1,
        selectedReward.delivery.position.y * TILE + 1, TILE - 2, TILE - 2);
    }
    if (polygon.length) {
      context.strokeStyle = '#fff0a2';
      context.fillStyle = '#fff0a2';
      context.lineWidth = 2;
      context.beginPath();
      polygon.forEach((cell, index) => {
        const x = (cell.x + .5) * TILE;
        const y = (cell.y + .5) * TILE;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      if (hovered) context.lineTo((hovered.x + .5) * TILE, (hovered.y + .5) * TILE);
      context.stroke();
      for (const cell of polygon) {
        context.beginPath();
        context.arc((cell.x + .5) * TILE, (cell.y + .5) * TILE, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
    if (loading) canvas.dataset.loadingTerrain = 'true';
    else delete canvas.dataset.loadingTerrain;
  }, [castleFaction, document, documentMountainRanges, effectiveCastleOwner, effectiveHeroOwner, guardianStamp,
    heroDefinitionId, heroFaction, hovered, polygon, preview, selectedCastle, selectedGuardian,
    rewardStamp, selectedHero, selectedObject, selectedReward,
    selectedMineResource, selectedProp, selectedStructureKind, selectedTile,
    size.height, size.width, tool, zoom]);

  redrawLatest.current = draw;
  useEffect(draw, [draw]);

  const eventCell = (event: ReactPointerEvent<HTMLCanvasElement>): EditorCell | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const cell = {
      x: Math.floor((event.clientX - box.left) / box.width * size.width),
      y: Math.floor((event.clientY - box.top) / box.height * size.height),
    };
    return cell.x >= 0 && cell.y >= 0 && cell.x < size.width && cell.y < size.height
      ? cell : null;
  };

  const cellsForLine = (start: EditorCell, end: EditorCell) => ['pencil', 'road', 'seam'].includes(tool)
    ? rasterizeEditorBrushLine(start, end, 1, 'square', size)
    : rasterizeEditorBrushLine(start, end, brushSize, brushShape, size);

  /** Select/erase uses the same ground-contact painter key as the visible canvas. */
  const topEntityAtCell = (cell: EditorCell) => {
    const candidates = [
      ...document.objects.flatMap((object) => {
        const footprint = object.kind === 'obstacle'
          ? editorPropFootprint(object) : editorStructureFootprint(object);
        return editorFootprintCells(object.position, footprint).some((occupied) =>
          occupied.x === cell.x && occupied.y === cell.y)
          ? [{ entityKind: 'object' as const, entity: object,
            row: object.position.y + footprint.h - 1, col: object.position.x,
            key: `object:${object.id}` }] : [];
      }),
      ...document.castles.flatMap((castle) => editorFootprintCells(
        castle.position, EDITOR_CASTLE_FOOTPRINT,
      ).some((occupied) => occupied.x === cell.x && occupied.y === cell.y)
        ? [{ entityKind: 'castle' as const, entity: castle,
          row: castle.position.y + EDITOR_CASTLE_FOOTPRINT.h - 1,
          col: castle.position.x, key: `castle:${castle.id}` }] : []),
      ...document.guardians.flatMap((guardian) => guardian.position.x === cell.x
        && guardian.position.y === cell.y
        ? [{ entityKind: 'guardian' as const, entity: guardian,
          row: guardian.position.y, col: guardian.position.x,
          key: `guardian:${guardian.id}` }] : []),
      ...document.heroes.flatMap((hero) => hero.position.x === cell.x
        && hero.position.y === cell.y
        ? [{ entityKind: 'hero' as const, entity: hero,
          row: hero.position.y, col: hero.position.x, key: `hero:${hero.id}` }] : []),
      ...document.rewards.flatMap((reward) => reward.delivery.kind === 'pickup'
        && reward.delivery.position.x === cell.x && reward.delivery.position.y === cell.y
        ? [{ entityKind: 'reward' as const, entity: reward,
          row: reward.delivery.position.y, col: reward.delivery.position.x,
          key: `reward:${reward.id}` }] : []),
    ].sort((left, right) => left.row - right.row || left.col - right.col
      || left.key.localeCompare(right.key));
    return candidates.at(-1);
  };

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const cell = eventCell(event);
    if (!cell || (!pointerStartsPan(event.button, tool, spaceHeld.current)
      && !pointerStartsPaint(event.button, tool, spaceHeld.current)
      && !(event.button === 0 && ['prop', 'structure', 'castle', 'hero', 'guardian', 'reward', 'select', 'erase'].includes(tool)))) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const viewport = viewportRef.current!;
    if (pointerStartsPan(event.button, tool, spaceHeld.current)) {
      gesture.current = {
        pointerId: event.pointerId, kind: 'pan', start: cell, last: cell,
        startClient: { x: event.clientX, y: event.clientY },
        startScroll: { left: viewport.scrollLeft, top: viewport.scrollTop },
        cells: [],
      };
      return;
    }
    if (tool === 'prop') {
      commitObjectMutation(createPropPlacementEdit(document, selectedProp, cell), 'inspect-result');
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'structure') {
      if (selectedStructureKind === 'whirlpool') {
        if (!pendingWhirlpool) {
          const legal = canPlaceEditorProp(document, cell, { w: 1, h: 1 });
          if (!legal.ok) commitObjectMutation(
            legal as ReturnType<typeof createPropPlacementEdit>, 'leave-unselected',
          );
          else {
            setPendingWhirlpool(cell);
            setMutationMessage('Whirlpool entrance set. Choose a different free cell for its reciprocal exit.');
          }
        } else {
          if (commitObjectMutation(
            createWhirlpoolPairPlacementEdit(document, pendingWhirlpool, cell),
            'leave-unselected',
          )) {
            setPendingWhirlpool(null);
          }
        }
      } else commitObjectMutation(
        createStructurePlacementEdit(document, selectedStructureKind, cell,
          selectedStructureKind === 'mine' ? { mineResource: selectedMineResource } : undefined),
        'leave-unselected',
      );
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'castle') {
      commitObjectMutation(createCastlePlacementEdit(
        document, cell, effectiveCastleOwner, castleFaction,
      ), 'inspect-result');
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'hero') {
      if (effectiveHeroOwner) commitObjectMutation(createHeroPlacementEdit(
        document, cell, effectiveHeroOwner, heroFaction, heroDefinitionId,
      ), 'inspect-result');
      else setMutationMessage('Add at least one player slot before placing a starting hero.');
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'guardian') {
      commitObjectMutation(
        createGuardianPlacementEdit(document, cell, guardianStamp), 'inspect-result',
      );
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'reward') {
      if (rewardStamp.kind === 'bundle') {
        commitRewardMutation(createDirectRewardPlacementEdit(
          document, cell, rewardStamp.bundle, rewardStamp.label,
        ));
      } else {
        const result = createRewardCarrierPlacementEdit(document, rewardStamp.carrierKind, cell);
        if (result.ok) {
          commitObjectMutation(result, 'leave-unselected');
        } else commitObjectMutation(
          result as ReturnType<typeof createPropPlacementEdit>, 'leave-unselected',
        );
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'erase') {
      const top = topEntityAtCell(cell);
      const hero = top?.entityKind === 'hero' ? top.entity : undefined;
      const guardian = top?.entityKind === 'guardian' ? top.entity : undefined;
      const castle = top?.entityKind === 'castle' ? top.entity : undefined;
      const object = top?.entityKind === 'object' ? top.entity : undefined;
      const reward = top?.entityKind === 'reward' ? top.entity : undefined;
      if (hero) commitObjectMutation(createHeroDeleteEdit(document, hero.id), 'inspect-result');
      else if (guardian) commitObjectMutation(
        createGuardianDeleteEdit(document, guardian.id), 'inspect-result',
      );
      else if (castle) commitObjectMutation(
        createCastleDeleteEdit(document, castle.id), 'inspect-result',
      );
      else if (object) commitObjectMutation(object.kind === 'obstacle'
        ? createPropEraseEdit(document, object.id) : createStructureDeleteEdit(document, object.id),
      'inspect-result');
      else if (reward) commitRewardMutation(createRewardDeleteEdit(document, reward.id));
      else setMutationMessage('No authored object, city, hero, guardian, or reward occupies that cell.');
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'select') {
      const top = topEntityAtCell(cell);
      const hero = top?.entityKind === 'hero' ? top.entity : undefined;
      const castle = hero ? undefined : top?.entityKind === 'castle' ? top.entity : undefined;
      const guardian = top?.entityKind === 'guardian' ? top.entity : undefined;
      const object = top?.entityKind === 'object' ? top.entity : undefined;
      const reward = top?.entityKind === 'reward' ? top.entity : undefined;
      setSelectedCastleId(castle?.id ?? null);
      setSelectedHeroId(castle || guardian ? null : hero?.id ?? null);
      setSelectedGuardianId(hero || castle ? null : guardian?.id ?? null);
      setSelectedObjectId(castle || hero || guardian || reward ? null : object?.id ?? null);
      setSelectedRewardId(castle || hero || guardian ? null : reward?.id
        ?? (object ? document.rewards.find((candidate) => candidate.delivery.kind === 'site'
          && candidate.delivery.objectId === object.id)?.id ?? null : null));
      setMutationMessage(castle || hero || guardian || object || reward
        ? '' : 'No authored object, city, hero, guardian, or reward occupies that cell.');
      const entity = hero ?? guardian ?? castle ?? object ?? reward;
      if (entity) {
        const entityPosition = 'position' in entity ? entity.position
          : entity.delivery.kind === 'pickup' ? entity.delivery.position : cell;
        gesture.current = {
          pointerId: event.pointerId, kind: 'move', objectId: entity.id,
          entityKind: castle ? 'castle' : hero ? 'hero' : guardian ? 'guardian'
            : reward ? 'reward' : 'object',
          start: entityPosition, last: entityPosition,
          grabOffset: { x: cell.x - entityPosition.x, y: cell.y - entityPosition.y },
          startClient: { x: event.clientX, y: event.clientY },
          startScroll: { left: viewport.scrollLeft, top: viewport.scrollTop },
          cells: editorFootprintCells(entityPosition, castle ? EDITOR_CASTLE_FOOTPRINT
            : hero ? EDITOR_HERO_FOOTPRINT
              : guardian ? EDITOR_GUARDIAN_FOOTPRINT
                : reward ? { w: 1, h: 1 }
            : object!.kind === 'obstacle'
              ? editorPropFootprint(object!) : editorStructureFootprint(object!)),
        };
      } else event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (tool === 'polygon') {
      const vertices = lastDifferentVertex(polygon, cell);
      setPolygon(vertices);
      setPreview(vertices.length >= 3 ? rasterizeEditorPolygon(vertices, size) : []);
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    const kind = ['pencil', 'brush', 'road', 'seam'].includes(tool) ? 'paint' : 'shape';
    gesture.current = {
      pointerId: event.pointerId, kind, start: cell, last: cell,
      startClient: { x: event.clientX, y: event.clientY },
      startScroll: { left: viewport.scrollLeft, top: viewport.scrollTop },
      cells: kind === 'paint' ? cellsForLine(cell, cell) : [cell],
    };
    setPreview(gesture.current.cells);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const cell = eventCell(event);
    setHovered(cell);
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) {
      if (tool === 'polygon' && polygon.length >= 2 && cell) {
        setPreview(rasterizeEditorPolygon([...polygon, cell], size));
      }
      return;
    }
    event.preventDefault();
    if (active.kind === 'pan') {
      const viewport = viewportRef.current!;
      viewport.scrollLeft = active.startScroll.left - (event.clientX - active.startClient.x);
      viewport.scrollTop = active.startScroll.top - (event.clientY - active.startClient.y);
      return;
    }
    if (!cell) return;
    if (active.kind === 'move') {
      active.last = editorMoveAnchor(cell, active.grabOffset ?? { x: 0, y: 0 });
      if (active.entityKind === 'castle') {
        setPreview(editorFootprintCells(active.last, EDITOR_CASTLE_FOOTPRINT));
        return;
      }
      if (active.entityKind === 'hero') {
        setPreview(editorFootprintCells(active.last, EDITOR_HERO_FOOTPRINT));
        return;
      }
      if (active.entityKind === 'guardian') {
        setPreview(editorFootprintCells(active.last, EDITOR_GUARDIAN_FOOTPRINT));
        return;
      }
      if (active.entityKind === 'reward') {
        setPreview(editorFootprintCells(active.last, { w: 1, h: 1 }));
        return;
      }
      const object = document.objects.find((candidate) => candidate.id === active.objectId);
      if (object) setPreview(editorFootprintCells(active.last, object.kind === 'obstacle'
        ? editorPropFootprint(object) : editorStructureFootprint(object)));
      return;
    }
    if (active.kind === 'paint') {
      active.cells = appendUniqueEditorCells(
        active.cells, cellsForLine(active.last, cell), size,
      );
      setPreview(active.cells);
      active.last = cell;
    } else {
      active.last = cell;
      active.cells = tool === 'ellipse'
        ? rasterizeEditorEllipse(active.start, cell, size)
        : rasterizeEditorRectangle(active.start, cell, size);
      setPreview(active.cells);
    }
  };

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (active.kind === 'move' && active.objectId) {
      if (active.entityKind === 'castle') {
        commitObjectMutation(
          createCastleMoveEdit(document, active.objectId, active.last), 'inspect-result',
        );
      } else if (active.entityKind === 'hero') {
        commitObjectMutation(
          createHeroMoveEdit(document, active.objectId, active.last), 'inspect-result',
        );
      } else if (active.entityKind === 'guardian') {
        commitObjectMutation(
          createGuardianMoveEdit(document, active.objectId, active.last), 'inspect-result',
        );
      } else if (active.entityKind === 'reward') {
        commitRewardMutation(createRewardMoveEdit(document, active.objectId, active.last));
      } else {
        const object = document.objects.find((candidate) => candidate.id === active.objectId);
        commitObjectMutation(object?.kind === 'obstacle'
          ? createPropMoveEdit(document, active.objectId, active.last)
          : createStructureMoveEdit(document, active.objectId, active.last), 'inspect-result');
      }
      setPreview([]);
    } else if (active.kind !== 'pan') applyCells(active.cells);
    else setPreview([]);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const pointerCancelled = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return;
    clearGesture();
  };

  const setSelectedTerrain = (next: TerrainId) => {
    setTerrain(next);
    setSkin(TERRAIN[next].skins[0]);
    setOrdinaryTile({ terrain: next, skin: TERRAIN[next].skins[0] });
    if (['prop', 'structure', 'castle', 'hero', 'guardian', 'reward', 'road', 'seam', 'select', 'erase'].includes(tool)) setTool('pencil');
    setMutationMessage('');
  };

  const selectMountain = () => {
    setTerrain('mountain');
    setSkin(mountainSkin);
    if (['prop', 'structure', 'castle', 'hero', 'guardian', 'reward', 'road', 'seam', 'select', 'erase'].includes(tool)) setTool('pencil');
    setMutationMessage('');
  };

  const selectProp = (id: AdventurePropId) => {
    setSelectedPropId(id);
    setTool('prop');
    setPolygon([]);
    setSelectedObjectId(null);
    setSelectedCastleId(null);
    setSelectedHeroId(null);
    setSelectedGuardianId(null);
    setSelectedRewardId(null);
    setMutationMessage('');
  };

  const selectStructure = (kind: EditorStructureKind) => {
    setSelectedStructureKind(kind);
    setTool(EDITOR_DEDICATED_REWARD_KINDS.has(kind) ? 'select' : 'structure');
    setPolygon([]);
    setSelectedObjectId(null);
    setSelectedCastleId(null);
    setSelectedHeroId(null);
    setSelectedGuardianId(null);
    setSelectedRewardId(null);
    setPendingWhirlpool(null);
    setMutationMessage(kind === 'whirlpool'
      ? 'Choose two free cells; the editor will author reciprocal pair links atomically.'
      : kind === 'patientStone' && !document.objects.some((object) => object.kind === 'cache')
        ? 'Patient Stones require a linked Cache. Place a Cache first.'
        : kind === 'cache'
          ? 'A playable Cache sketch needs three to six linked Patient Stones.' : '');
  };

  const selectMine = (resource: ResourceId) => {
    setSelectedMineResource(resource);
    selectStructure('mine');
    setMutationMessage(`Stamp a ${resource} mine. Select it later to edit income, owner, or resource.`);
  };

  const updateSelectedStructure = (properties: EditorMapObject['properties']) => {
    if (!selectedObject || selectedObject.kind === 'obstacle') return;
    commitObjectMutation(
      createStructureUpdateEdit(document, selectedObject.id, { properties }), 'inspect-result',
    );
  };

  const updateStructureField = (definition: StructureFieldDefinition, raw: string) => {
    if (!selectedObject || selectedObject.kind === 'obstacle') return;
    let value: JsonValue;
    if (definition.kind === 'number') value = Number(raw);
    else if (definition.kind === 'owner') value = raw || null;
    else if (definition.kind === 'item') value = raw
      ? editorItemInstance(raw as ItemId, selectedObject.position) : null;
    else if (definition.kind === 'unit' && definition.key === 'roster') value = [{ unitId: raw, count: 1 }];
    else value = raw;
    const next = { ...selectedObject.properties, [definition.key]: value };
    if (definition.key === 'school') {
      const sameSchool = EDITOR_SPELL_CHOICES.find((spell) => spell.school === raw);
      if (sameSchool) next.teaches = sameSchool.id;
    }
    updateSelectedStructure(next);
  };

  const selectCastlePlacement = () => {
    setTool('castle'); setPolygon([]); setSelectedObjectId(null); setSelectedCastleId(null);
    setSelectedHeroId(null);
    setSelectedGuardianId(null);
    setSelectedRewardId(null);
    setPendingWhirlpool(null); setMutationMessage(
      'Stamp the 5×2 top-left city footprint. The blue square marks entrance +2,+1.',
    );
  };
  const selectHeroPlacement = () => {
    if (!effectiveHeroOwner) {
      setTool('select');
      setMutationMessage('Add at least one player slot before placing a starting hero.');
      return;
    }
    setTool('hero'); setPolygon([]); setSelectedObjectId(null); setSelectedCastleId(null);
    setSelectedHeroId(null); setSelectedGuardianId(null); setPendingWhirlpool(null);
    setSelectedRewardId(null);
    setMutationMessage('Stamp a free 1×1 cell. Owner flag, faction, and named hero remain independent choices.');
  };
  const heroAsset = manifestEntry(editorHeroSpriteId({ faction: heroFaction }));
  const selectGuardianPlacement = (unitId: UnitId) => {
    setGuardianStamp({ unitId }); setTool('guardian'); setPolygon([]);
    setSelectedObjectId(null); setSelectedCastleId(null); setSelectedHeroId(null);
    setSelectedGuardianId(null); setPendingWhirlpool(null);
    setSelectedRewardId(null);
    const entry = editorGuardianCatalogEntry(unitId);
    setMutationMessage(entry.authoringDisposition === 'special-battlefield-construct'
      ? `Stamp a free 1×1 post. ${entry.unit.name} is a special static battlefield-construct encounter.`
      : `Stamp a free 1×1 post for ${entry.unit.name}.`);
  };
  const selectRandomGuardianPlacement = (randomTier: UnitTier) => {
    setGuardianStamp({ randomTier }); setTool('guardian'); setPolygon([]);
    setSelectedObjectId(null); setSelectedCastleId(null); setSelectedHeroId(null);
    setSelectedGuardianId(null); setPendingWhirlpool(null); setSelectedRewardId(null);
    setMutationMessage(`Stamp a random tier ${randomTier} guardian. Its concrete creature is chosen from the game seed.`);
  };
  const normalizedGuardianSearch = guardianSearch.trim().toLocaleLowerCase();
  const visibleGuardianGroups = EDITOR_GUARDIAN_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => !normalizedGuardianSearch
      || `${entry.unit.name} ${entry.unit.id} tier ${entry.unit.tier} ${entry.groupLabel}`
        .toLocaleLowerCase().includes(normalizedGuardianSearch)),
  })).filter((group) => group.entries.length);
  const normalizedArtifactSearch = artifactSearch.trim().toLocaleLowerCase();
  const visibleArtifactGroups = EDITOR_ARTIFACT_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => !normalizedArtifactSearch
      || `${entry.artifact.name} ${entry.artifact.id} ${entry.artifact.slot} ${entry.groupLabel}`
        .toLocaleLowerCase().includes(normalizedArtifactSearch)),
  })).filter((group) => group.entries.length);
  const normalizedItemSearch = itemSearch.trim().toLocaleLowerCase();
  const visibleItemGroups = EDITOR_ITEM_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => !normalizedItemSearch
      || `${entry.item.name} ${entry.item.id} ${entry.item.behavior} ${entry.groupLabel}`
        .toLocaleLowerCase().includes(normalizedItemSearch)),
  })).filter((group) => group.entries.length);
  const selectBundleStamp = (label: string, bundle: EditorRewardBundle) => {
    setRewardStamp({ kind: 'bundle', label, bundle }); setTool('reward'); setPolygon([]);
    setSelectedObjectId(null); setSelectedCastleId(null); setSelectedHeroId(null);
    setSelectedGuardianId(null); setSelectedRewardId(null); setPendingWhirlpool(null);
    setMutationMessage('Stamp a free 1×1 direct pickup. Its portable reward record lowers to one lossless runtime interaction.');
  };
  const selectCarrierStamp = (carrierKind: RewardStamp & { kind: 'carrier' }) => {
    setRewardStamp(carrierKind); setTool('reward'); setPolygon([]);
    setSelectedObjectId(null); setSelectedCastleId(null); setSelectedHeroId(null);
    setSelectedGuardianId(null); setSelectedRewardId(null); setPendingWhirlpool(null);
    setMutationMessage('Stamp a free 1×1 carrier. A valid linked 500-gold reward is created atomically.');
  };

  return (
    <section className="editor-canvas-panel" aria-labelledby="editor-canvas-title">
      <header className="editor-canvas-heading">
        <div><span className="kicker">Canvas and palette</span>
          <h2 id="editor-canvas-title">Map canvas</h2></div>
        <div className="editor-history-controls" aria-label="Edit history">
          <button onClick={undo} disabled={!history.past.length} title="Undo (Ctrl+Z)">↶ Undo</button>
          <button onClick={redo} disabled={!history.future.length} title="Redo (Ctrl+Y)">↷ Redo</button>
        </div>
      </header>
      <div className="editor-tool-layout">
        <aside className="editor-palette" aria-label="Map palette">
          <section className="editor-palette-section" data-palette-order="1"
            aria-labelledby="terrain-palette-title">
            <span className="editor-palette-number">01</span>
            <h3 id="terrain-palette-title">Terrain</h3>
            <p>Painting replaces gameplay terrain and its presentation skin together.</p>
            <div className="editor-terrain-choices" role="radiogroup" aria-label="Terrain type">
              {terrainChoices.map((entry) => <button key={entry.id} role="radio"
                aria-checked={terrain === entry.id} className={terrain === entry.id ? 'selected' : ''}
                aria-label={entry.label} onClick={() => setSelectedTerrain(entry.id)}
                title={`${entry.label} — ${entry.flavor}`}>
                {terrainAssetFile(entry.id, entry.skins[0], 0, 0)
                  ? <img src={terrainAssetFile(entry.id, entry.skins[0], 0, 0)!} alt="" aria-hidden="true" />
                  : <i style={{ backgroundColor: fallbackTerrainColor(entry.id) }} />}
              </button>)}
            </div>
            <label>Terrain skin<select value={ordinaryTile.skin} onChange={(event) => {
              const next = event.target.value as TerrainSkinId;
              setOrdinaryTile({ ...ordinaryTile, skin: next });
              if (terrain !== 'mountain') setSkin(next);
            }}>
              {TERRAIN[ordinaryTile.terrain].skins.map((value) =>
                <option key={value} value={value}>{value}</option>)}
            </select></label>
            <small>Terrain has no empty state: repaint a cell to replace it.</small>
          </section>
          <section className="editor-palette-section editor-prop-palette"
            data-palette-order="2" aria-labelledby="mountain-prop-palette-title">
            <span className="editor-palette-number">02</span>
            <h3 id="mountain-prop-palette-title">Mountains &amp; props</h3>
            <p>Mountains paint impassable gameplay terrain. Props are explicit blocking records.</p>
            <button className={`editor-mountain-choice ${terrain === 'mountain'
              && tool !== 'prop' ? 'selected' : ''}`} aria-pressed={terrain === 'mountain'
                && tool !== 'prop'} aria-label="Mountain terrain" title="Paint mountain terrain"
              onClick={selectMountain}>
              {terrainAssetFile('mountain', mountainSkin, 0, 0)
                ? <img src={terrainAssetFile('mountain', mountainSkin, 0, 0)!} alt="" aria-hidden="true" />
                : <i style={{ backgroundColor: fallbackTerrainColor('mountain') }} />}
            </button>
            <label>Mountain skin<select value={mountainSkin}
              onChange={(event) => {
                const next = event.target.value as TerrainSkinId;
                setTerrain('mountain'); setSkin(next); setMountainSkin(next);
                if (['prop', 'structure', 'castle', 'hero', 'guardian', 'reward', 'road', 'seam', 'select', 'erase'].includes(tool)) setTool('pencil');
              }}>
              {TERRAIN.mountain.skins.map((value) =>
                <option key={value} value={value}>{value}</option>)}
            </select></label>
            <button className="editor-mountain-erase" onClick={() => {
              setTerrain(ordinaryTile.terrain); setSkin(ordinaryTile.skin);
              if (['prop', 'structure', 'castle', 'hero', 'guardian', 'reward', 'road', 'seam', 'select', 'erase'].includes(tool)) setTool('pencil');
              setMutationMessage('Mountain erase uses the selected ordinary terrain and skin.');
            }}>Erase mountains to {TERRAIN[ordinaryTile.terrain].label} · {ordinaryTile.skin}</button>
            {(['obstacles', 'shape-props'] as const).map((group) => <div key={group}
              className="editor-prop-group" role="group"
              aria-label={group === 'obstacles' ? 'Obstacles' : 'Decorative and shape props'}>
              <b>{group === 'obstacles' ? 'Obstacles' : 'Decorative / shape props'}</b>
              {ADVENTURE_PROP_CATALOG.filter((entry) => entry.group === group).map((entry) => {
                const asset = manifestEntry(assetId.mapObject('obstacle', entry.prop));
                return <button key={entry.id} className={tool === 'prop'
                  && selectedPropId === entry.id ? 'selected' : ''}
                  aria-pressed={tool === 'prop' && selectedPropId === entry.id}
                  aria-label={entry.label}
                  title={`${entry.label} · ${entry.footprint.w}×${entry.footprint.h}${
                    asset && asset.h > entry.footprint.h * TILE ? ' · north overhang' : ''}`}
                  onClick={() => selectProp(entry.id)}>
                  {asset && <img src={asset.file} alt="" aria-hidden="true" />}
                </button>;
              })}
            </div>)}
            <small>Stamp to place. Select / move drags an existing prop; Erase prop removes it.</small>
          </section>
          <section className="editor-palette-section editor-structure-palette"
            data-palette-order="3" aria-labelledby="structure-palette-title">
            <span className="editor-palette-number">03</span>
            <h3 id="structure-palette-title">Structures &amp; map objects</h3>
            <div className="editor-icon-groups" role="list" aria-label="Registered map objects">
              {[...new Set(EDITOR_STRUCTURE_CATALOG.map((entry) => entry.group))].map((group) =>
                <details key={group} open><summary>{group}</summary>
                  <div className="editor-icon-grid">
                    {EDITOR_STRUCTURE_CATALOG.filter((entry) => entry.group === group).map((entry) => {
                      if (entry.kind === 'mine') return EDITOR_RESOURCE_CHOICES.map((resource) => {
                        const label = `${resource[0].toUpperCase()}${resource.slice(1)} mine`;
                        const sprite = manifestEntry(assetId.mapObject('mine', resource));
                        const selected = tool === 'structure' && selectedStructureKind === 'mine'
                          && selectedMineResource === resource;
                        return <button key={`mine-${resource}`} role="listitem"
                          className={`editor-icon-button editor-mine-stamp ${selected ? 'selected' : ''}`}
                          aria-label={label} aria-pressed={selected}
                          title={`${label} — stamp its native 2×1 resource operation.`}
                          onClick={() => selectMine(resource)}>
                          {sprite ? <img src={sprite.file} alt="" aria-hidden="true" />
                            : <span className="editor-icon-fallback" aria-hidden="true">⌂</span>}
                        </button>;
                      });
                      const previewObject: EditorMapObject = {
                        id: 'palette-object', kind: entry.kind, position: { x: 0, y: 0 },
                        properties: defaultEditorStructureProperties(entry.kind, { x: 0, y: 0 }, document),
                      };
                      const sprite = manifestEntry(mapObjectSpriteId(
                        editorStructurePresentationObject(previewObject),
                      )) ?? manifestEntry(assetId.mapObject(entry.kind));
                      const disabled = EDITOR_DEDICATED_REWARD_KINDS.has(entry.kind);
                      const reason = EDITOR_REWARD_CARRIER_KINDS.has(entry.kind as never)
                        ? 'Place from Resources & rewards so its linked reward is created atomically.'
                        : disabled ? 'Place from the dedicated reward section.' : `Place ${entry.label}.`;
                      return <button key={entry.kind} role="listitem"
                        className={`editor-icon-button ${tool === 'structure'
                          && selectedStructureKind === entry.kind ? 'selected' : ''}`}
                        aria-label={entry.label} aria-pressed={tool === 'structure'
                          && selectedStructureKind === entry.kind}
                        disabled={disabled} data-disabled-reason={disabled ? reason : undefined}
                        title={`${entry.label} — ${reason}`}
                        onClick={() => selectStructure(entry.kind)}>
                        {sprite ? <img src={sprite.file} alt="" aria-hidden="true" />
                          : <span className="editor-icon-fallback" aria-hidden="true">⌂</span>}
                      </button>;
                    })}
                  </div>
                </details>)}
            </div>
            {EDITOR_REWARD_CARRIER_KINDS.has(selectedStructureKind as never) && <small className="editor-workflow-note">
              Visible here, placed atomically with a linked reward from section 09. Imported instances remain editable.
            </small>}
            {EDITOR_DEDICATED_REWARD_KINDS.has(selectedStructureKind)
              && !EDITOR_REWARD_CARRIER_KINDS.has(selectedStructureKind as never)
              && <small className="editor-workflow-note">Visible here, but new direct pickups use the single portable reward workflow below.</small>}
            {selectedStructureKind === 'whirlpool' && <small className="editor-workflow-note">
              Pair workflow: choose two free cells; reciprocal IDs are created in one undoable edit.
            </small>}
            {selectedStructureKind === 'patientStone' && <small className="editor-workflow-note">
              Linked workflow: select an existing Cache in the inspector. Place a rewarded Cache through the Rewards section first.
            </small>}
          </section>
          <section className="editor-palette-section editor-castle-palette"
            data-palette-order="4" aria-labelledby="castle-palette-title">
            <span className="editor-palette-number">04</span>
            <h3 id="castle-palette-title">Cities</h3>
            <p>Player color, player faction, and city faction are independent authored facts.</p>
            <EditorPlayerSlots document={document} onEdit={commitPlayerEdit}
              onMessage={setMutationMessage} />
            <label>Owner flag<select aria-label="City owner flag" value={effectiveCastleOwner}
              onChange={(event) => setCastleOwner(event.target.value as PlayerId | 'neutral')}>
              <option value="neutral">Neutral · no flag</option>
              {document.players.map((player) => <option key={player.id} value={player.id}>
                {player.id.toUpperCase()} · {EDITOR_PLAYER_FLAGS[player.id].label}
              </option>)}
            </select></label>
            <div className="editor-castle-grid" role="radiogroup" aria-label="City faction stamps">
              {Object.values(FACTIONS).map((faction) => {
                const sprite = manifestEntry(editorCastleSpriteId({ faction: faction.id }));
                const selected = tool === 'castle' && castleFaction === faction.id;
                return <button key={faction.id} role="radio" aria-checked={selected}
                  className={`editor-icon-button editor-castle-stamp ${selected ? 'selected' : ''}`}
                  aria-label={`${faction.name} city`}
                  title={`Place ${faction.name} city · 5×2 · entrance +2,+1`}
                  onClick={() => { setCastleFaction(faction.id); selectCastlePlacement(); }}>
                  {sprite && <span className="editor-castle-thumbnail">
                    <img src={sprite.file} alt="" aria-hidden="true" />
                    {effectiveCastleOwner !== 'neutral' && <i className="editor-player-flag"
                      style={{ '--flag-color': EDITOR_PLAYER_FLAGS[effectiveCastleOwner].color } as React.CSSProperties} />}
                  </span>}
                </button>;
              })}
            </div>
            <small>New owned cities inherit an empty garrison. Neutral cities inherit their faction’s three-week tier 1–3 defense until explicitly set empty or custom.</small>
          </section>
          <section className="editor-palette-section editor-hero-palette"
            data-palette-order="5" aria-labelledby="hero-palette-title">
            <span className="editor-palette-number">05</span>
            <h3 id="hero-palette-title">Heroes</h3>
            <p>Choose owner color, hero faction, and a faction-valid named hero separately.</p>
            <label>Hero owner flag<select aria-label="Hero owner flag"
              value={effectiveHeroOwner ?? ''} disabled={!effectiveHeroOwner}
              onChange={(event) => setHeroOwner(event.target.value as PlayerId)}>
              {!effectiveHeroOwner && <option value="">No player slots available</option>}
              {document.players.map((player) => <option key={player.id} value={player.id}>
                {player.id.toUpperCase()} · {EDITOR_PLAYER_FLAGS[player.id].label}
                {player.name ? ` · ${player.name}` : ''}
              </option>)}
            </select></label>
            <label>Hero faction<select aria-label="Hero faction" value={heroFaction}
              onChange={(event) => {
                const faction = event.target.value as FactionId;
                setHeroFaction(faction);
                if (!FACTION_HEROES[faction].includes(heroDefinitionId)) {
                  setHeroDefinitionId(FACTION_HEROES[faction][0]);
                }
              }}>
              {Object.values(FACTIONS).map((faction) =>
                <option key={faction.id} value={faction.id}>{faction.name}</option>)}
            </select></label>
            <label>Named hero definition<select aria-label="Named hero definition"
              value={heroDefinitionId} onChange={(event) =>
                setHeroDefinitionId(event.target.value as HeroDefinitionId)}>
              {editorHeroDefinitions(heroFaction).map((definition) =>
                <option key={definition.id} value={definition.id}>{definition.name}</option>)}
            </select></label>
            <button className={`editor-hero-choice ${tool === 'hero' ? 'selected' : ''}`}
              aria-pressed={tool === 'hero'} disabled={!effectiveHeroOwner}
              aria-label={`Place ${HEROES[heroDefinitionId].name}`}
              data-disabled-reason={!effectiveHeroOwner
                ? 'Add at least one player slot before placing a starting hero.' : undefined}
              title={effectiveHeroOwner
                ? `Place ${HEROES[heroDefinitionId].name} with a canonical ${FACTIONS[heroFaction].name} hire company.`
                : 'Add at least one player slot before placing a starting hero.'}
              onClick={selectHeroPlacement}>
              {heroAsset && <span className="editor-hero-thumbnail">
                <img src={heroAsset.file} alt="" aria-hidden="true" />
                {effectiveHeroOwner && <i className="editor-player-flag"
                  style={{ '--flag-color': EDITOR_PLAYER_FLAGS[effectiveHeroOwner].color } as React.CSSProperties} />}
              </span>}
            </button>
            {!effectiveHeroOwner && <small className="editor-workflow-note" role="status">
              Placement disabled: add at least one player slot in Cities first.
            </small>}
            <small>New heroes use the core default constructor and serialize the selected faction’s small nonempty hire army.</small>
          </section>
          <section className="editor-palette-section editor-guardian-palette"
            data-palette-order="6" aria-labelledby="guardian-palette-title">
            <span className="editor-palette-number">06</span>
            <h3 id="guardian-palette-title">Guardians</h3>
            <label>Search creatures<input type="search" aria-label="Search guardian creatures"
              value={guardianSearch} placeholder="Name, ID, faction, or tier"
              onChange={(event) => setGuardianSearch(event.target.value)} /></label>
            <div className="editor-random-guardian-grid" role="group"
              aria-label="Random creature tier placeholders">
              {EDITOR_GUARDIAN_TIERS.map((tier) => {
                const selected = tool === 'guardian' && 'randomTier' in guardianStamp
                  && guardianStamp.randomTier === tier;
                return <button key={tier} className={`editor-random-guardian ${selected ? 'selected' : ''}`}
                  aria-label={`Random tier ${tier} creature`} aria-pressed={selected}
                  title={`Random tier ${tier} creature · resolves from the game seed`}
                  onClick={() => selectRandomGuardianPlacement(tier)}>
                  <span aria-hidden="true">?</span><b aria-hidden="true">T{tier}</b>
                </button>;
              })}
            </div>
            <div className="editor-guardian-catalog" role="list" aria-label="Canonical guardian creatures">
              {visibleGuardianGroups.map((group) => <fieldset key={group.id}>
                <legend>{group.label} · {group.entries.length}</legend>
                {group.entries.map((entry) => {
                  const sprite = manifestEntry(assetId.battleUnit(entry.unit.id))
                    ?? editorGuardianSpriteEntry(entry.unit.id);
                  const selected = tool === 'guardian' && 'unitId' in guardianStamp
                    && guardianStamp.unitId === entry.unit.id;
                  return <button key={entry.unit.id} role="listitem"
                    className={`editor-guardian-choice ${selected ? 'selected' : ''}`}
                    aria-pressed={selected}
                    aria-label={entry.unit.name}
                    title={`${entry.unit.name} · tier ${entry.unit.tier}. ${entry.authoringReason}`}
                    onClick={() => selectGuardianPlacement(entry.unit.id)}>
                    {sprite ? <img src={sprite.file} alt="" aria-hidden="true" />
                      : <span className="editor-guardian-fallback" aria-hidden="true">⚔</span>}
                  </button>;
                })}
              </fieldset>)}
              {!visibleGuardianGroups.length && <p role="status">No canonical creatures match this search.</p>}
            </div>
          </section>
          <section className="editor-palette-section editor-artifact-palette"
            data-palette-order="7" aria-labelledby="artifact-palette-title">
            <span className="editor-palette-number">07</span>
            <h3 id="artifact-palette-title">Artifacts</h3>
            <label>Search artifacts<input type="search" aria-label="Search artifacts"
              value={artifactSearch} placeholder="Name, ID, class, or slot"
              onChange={(event) => setArtifactSearch(event.target.value)} /></label>
            <div className="editor-reward-catalog" role="list" aria-label="Canonical artifacts">
              {visibleArtifactGroups.map((group) => <details key={group.id} open>
                <summary>{group.label} · {group.entries.length}</summary>
                <div className="editor-icon-grid">{group.entries.map((entry) => <button
                  key={entry.artifact.id} role="listitem" className="editor-icon-button"
                  aria-label={entry.artifact.name}
                  title={`${entry.artifact.name} · ${entry.artifact.slot} · ${entry.artifact.description}`}
                  onClick={() => selectBundleStamp(
                    `${entry.artifact.name} reward`, artifactRewardBundle(entry.artifact.id),
                  )}>
                  <ArtifactSprite artifactId={entry.artifact.id} />
                  <span className={`editor-artifact-icon artifact-${entry.artifact.class}`}
                    aria-hidden="true">{ARTIFACT_SLOT_GLYPHS[entry.artifact.slot]}</span>
                </button>)}</div>
              </details>)}
              {!visibleArtifactGroups.length && <p role="status">No canonical artifacts match this search.</p>}
            </div>
          </section>
          <section className="editor-palette-section editor-item-palette"
            data-palette-order="8" aria-labelledby="item-palette-title">
            <span className="editor-palette-number">08</span>
            <h3 id="item-palette-title">Consumables &amp; items</h3>
            <label>Search items<input type="search" aria-label="Search consumables and items"
              value={itemSearch} placeholder="Name, ID, use, or behavior"
              onChange={(event) => setItemSearch(event.target.value)} /></label>
            <div className="editor-reward-catalog" role="list" aria-label="Canonical consumables and items">
              {visibleItemGroups.map((group) => <details key={group.id} open>
                <summary>{group.label} · {group.entries.length}</summary>
                <div className="editor-icon-grid">{group.entries.map((entry) => (
                  <button key={entry.item.id} role="listitem" className="editor-icon-button"
                    aria-label={entry.item.name} title={`${entry.item.name} · ${entry.item.description}`}
                    onClick={() => selectBundleStamp(
                      `${entry.item.name} reward`, itemRewardBundle(entry.item.id, hovered ?? { x: 0, y: 0 }),
                    )}>
                    <ItemSprite itemId={entry.item.id} />
                  </button>
                ))}</div>
              </details>)}
              {!visibleItemGroups.length && <p role="status">No canonical items match this search.</p>}
            </div>
          </section>
          <section className="editor-palette-section editor-rewards-palette"
            data-palette-order="9" aria-labelledby="rewards-palette-title">
            <span className="editor-palette-number">09</span>
            <h3 id="rewards-palette-title">Resources, rewards &amp; overlays</h3>
            <label>Resource amount<input type="number" min="1" step="1" value={resourceAmount}
              onChange={(event) => setResourceAmount(Number(event.target.value))} /></label>
            <div className="editor-resource-shortcuts" role="group" aria-label="Resource pickups">
              {EDITOR_RESOURCE_IDS.map((resource) => <button key={resource}
                disabled={!Number.isInteger(resourceAmount) || resourceAmount <= 0}
                data-disabled-reason={!Number.isInteger(resourceAmount) || resourceAmount <= 0
                  ? 'Enter a positive whole resource amount.' : undefined}
                aria-label={`${resource} reward`}
                title={`Place a positive ${resource} direct reward pickup.`}
                onClick={() => selectBundleStamp(
                  `${resource} reward`, resourceRewardBundle(resource as ResourceId, resourceAmount),
                )}>{manifestEntry(assetId.mapObject('pile', resource))
                  ? <img src={manifestEntry(assetId.mapObject('pile', resource))!.file}
                    alt="" aria-hidden="true" />
                  : <span className="editor-icon-fallback" aria-hidden="true">●</span>}</button>)}
            </div>
            <label>Taught spell<select aria-label="Direct taught spell" value={taughtSpellId}
              onChange={(event) => setTaughtSpellId(event.target.value as SpellId)}>
              {EDITOR_TAUGHT_SPELL_GROUPS.map((group) => <optgroup key={group.id} label={group.label}>
                {group.entries.map((spell) => <option key={spell.id} value={spell.id}>{spell.name}</option>)}
              </optgroup>)}
            </select></label>
            <button className="editor-spell-stamp" aria-label="Place taught-spell reward"
              title={`Place ${EDITOR_SPELL_CHOICES.find((spell) => spell.id === taughtSpellId)?.name
                ?? taughtSpellId} taught-spell reward`}
              onClick={() => selectBundleStamp(
              `${EDITOR_SPELL_CHOICES.find((spell) => spell.id === taughtSpellId)?.name ?? taughtSpellId} lesson`,
              spellRewardBundle(taughtSpellId),
            )}><ContentIcon kind="spell" id={taughtSpellId} /></button>
            <details open><summary>Reward carriers · {EDITOR_REWARD_CARRIER_KINDS.size}</summary>
              <div className="editor-carrier-grid">
                {[...EDITOR_REWARD_CARRIER_KINDS].map((kind) => {
                  const sprite = manifestEntry(assetId.mapObject(kind));
                  const label = editorStructureByKind(kind).label;
                  return <button key={kind} className="editor-icon-button" aria-label={label}
                    title={`${label} · carrier plus linked reward`}
                    onClick={() => selectCarrierStamp({ kind: 'carrier', carrierKind: kind })}>
                    {sprite ? <img src={sprite.file} alt="" aria-hidden="true" />
                      : <span className="editor-icon-fallback" aria-hidden="true">⌂</span>}
                  </button>;
                })}
              </div>
            </details>
            <div className="editor-workflow-shortcuts" role="group" aria-label="Remaining placeable shortcuts">
              {(['chest', 'shrine', 'boat', 'whirlpool', 'flotsam', 'sealedCask', 'castaway',
                'messageBottle', 'lighthouse', 'drownedBell'] as EditorStructureKind[]).map((kind) => {
                const sprite = manifestEntry(assetId.mapObject(kind));
                const label = editorStructureByKind(kind).label;
                return <button key={kind} className="editor-icon-button" aria-label={label}
                  title={label} onClick={() => selectStructure(kind)}>
                  {sprite ? <img src={sprite.file} alt="" aria-hidden="true" />
                    : <span className="editor-icon-fallback" aria-hidden="true">⌂</span>}
                </button>;
              })}
            </div>
            <fieldset><legend>Overlay brush</legend>
              <label><input type="radio" name="overlay-mode" checked={overlayMode === 'paint'}
                onChange={() => setOverlayMode('paint')} /> Paint</label>
              <label><input type="radio" name="overlay-mode" checked={overlayMode === 'erase'}
                onChange={() => setOverlayMode('erase')} /> Erase</label>
              <button className="editor-icon-button" aria-label="Road overlay" title="Road overlay"
                aria-pressed={tool === 'road'} onClick={() => { setTool('road'); cancel(); }}>
                {manifestEntry(assetId.overlay('road', 'ew'))
                  ? <img src={manifestEntry(assetId.overlay('road', 'ew'))!.file} alt="" aria-hidden="true" />
                  : <span aria-hidden="true">═</span>}</button>
              <button className="editor-icon-button" aria-label="Seam overlay" title="Seam overlay"
                aria-pressed={tool === 'seam'} onClick={() => { setTool('seam'); cancel(); }}>
                {manifestEntry(assetId.overlay('seam', 'default'))
                  ? <img src={manifestEntry(assetId.overlay('seam', 'default'))!.file} alt="" aria-hidden="true" />
                  : <span aria-hidden="true">⌁</span>}</button>
              <small>One-cell drag uses deterministic rasterization and never changes gameplay terrain.</small>
            </fieldset>
          </section>
        </aside>
        <div className="editor-canvas-column">
          <div className="editor-toolstrip" role="toolbar" aria-label="Map drawing and object tools">
            {TERRAIN_TOOLS.map((entry) => <button key={entry.id}
              aria-pressed={tool === entry.id} className={tool === entry.id ? 'selected' : ''}
              onClick={() => { setTool(entry.id); cancel(); }}
              title={`${entry.label}${entry.shortcut ? ` (${entry.shortcut})` : ''}`}>
              {entry.label}
            </button>)}
            {OBJECT_TOOLS.map((entry) => <button key={entry.id}
              aria-pressed={tool === entry.id} className={tool === entry.id ? 'selected' : ''}
              onClick={() => { setTool(entry.id); cancel(); setMutationMessage(''); }}
              title={`${entry.label} (${entry.shortcut})`}>
              {entry.label}
            </button>)}
            <label>Size<input type="range" min="1" max="15" step="1" value={brushSize}
              disabled={tool !== 'brush'} onChange={(event) => setBrushSize(Number(event.target.value))} />
              <output>{brushSize}</output></label>
            <label>Shape<select value={brushShape} disabled={tool !== 'brush'}
              onChange={(event) => setBrushShape(event.target.value as TerrainBrushShape)}>
              <option value="round">Round</option><option value="square">Square</option>
            </select></label>
          </div>
          <div className="editor-viewport-bar">
            <span aria-live="polite">{hovered ? `Cell ${hovered.x}, ${hovered.y}` : 'Point at a cell'}</span>
            {tool === 'polygon' && polygon.length > 0 && <span>{polygon.length} vertices
              <button onClick={finishPolygon} disabled={polygon.length < 3}
                title={polygon.length < 3 ? 'Place at least three polygon vertices.' : 'Fill this polygon'}>
                Fill area
              </button>
              <button onClick={cancel}>Cancel</button></span>}
            <div aria-label="Canvas zoom">
              <button aria-label="Zoom out" onClick={() => setZoom((value) => clampEditorZoom(value - .25))}>−</button>
              <output>{Math.round(zoom * 100)}%</output>
              <button aria-label="Zoom in" onClick={() => setZoom((value) => clampEditorZoom(value + .25))}>+</button>
              <button onClick={() => setZoom(1)}>100%</button>
            </div>
          </div>
          {mutationMessage && <p className="editor-canvas-message" role="status">{mutationMessage}</p>}
          {selectedObject && selectedObject.kind !== 'obstacle' && <section className="editor-object-inspector"
            aria-labelledby="editor-object-inspector-title">
            <header><div><span className="kicker">Selected map object</span>
              <h3 id="editor-object-inspector-title">{editorStructureByKind(selectedObject.kind).label}</h3></div>
              <button className="danger" onClick={() => commitObjectMutation(
                createStructureDeleteEdit(document, selectedObject.id), 'inspect-result',
              )}>Delete</button></header>
            <div className="editor-object-form">
              <label>Stable ID<input defaultValue={selectedObject.id} key={selectedObject.id}
                onBlur={(event) => {
                  if (event.target.value === selectedObject.id) return;
                  if (!commitObjectMutation(createStructureUpdateEdit(document, selectedObject.id,
                    { id: event.target.value }), 'inspect-result')) {
                    event.currentTarget.value = selectedObject.id;
                  }
                }} /></label>
              {editorStructureByKind(selectedObject.kind).fields.map((definition) => {
                const stored = selectedObject.properties[definition.key];
                if (definition.kind === 'route') return <div className="editor-route-field" key={definition.key}>
                  <b>{definition.label}</b><span>{Array.isArray(stored) ? stored.length : 0} linked cells</span>
                  <button disabled={!hovered}
                    title={hovered ? 'Append the hovered map cell.' : 'Point at a map cell first.'}
                    onClick={() => {
                    if (!hovered) return;
                    const route = Array.isArray(stored) ? stored : [];
                    updateSelectedStructure({ ...selectedObject.properties,
                      [definition.key]: [...route, { ...hovered }] });
                  }}>Add hovered cell</button>
                  <button onClick={() => updateSelectedStructure({ ...selectedObject.properties,
                    [definition.key]: [{ ...selectedObject.position }] })}>Reset to anchor</button>
                </div>;
                const value = definition.kind === 'item'
                  ? stored && typeof stored === 'object' && !Array.isArray(stored) ? String(stored.id ?? '') : ''
                  : definition.kind === 'unit' && definition.key === 'roster'
                    ? Array.isArray(stored) && stored[0] && typeof stored[0] === 'object'
                      && !Array.isArray(stored[0]) ? String(stored[0].unitId ?? '') : ''
                    : stored === null || stored === undefined ? '' : String(stored);
                const choices = definition.kind === 'resource'
                  ? EDITOR_RESOURCE_CHOICES.filter((id) => definition.key !== 'rareResource' || id !== 'gold')
                    .map((id) => ({ id, name: id }))
                  : definition.kind === 'owner' ? ownerChoices(document).map((entry) => ({ id: entry.value ?? '', name: entry.label }))
                    : definition.kind === 'school' ? EDITOR_SCHOOL_CHOICES.map((id) => ({ id, name: id }))
                      : definition.kind === 'spell' ? EDITOR_SPELL_CHOICES
                        .filter((spell) => definition.key !== 'teaches' || spell.school === selectedObject.properties.school)
                      : definition.kind === 'item' ? EDITOR_ITEM_CHOICES
                        : definition.kind === 'unit' ? EDITOR_UNIT_CHOICES
                          : definition.kind === 'skill' ? EDITOR_SKILL_CHOICES
                            : definition.kind === 'cache' ? document.objects.filter((object) => object.kind === 'cache')
                              .map((object) => ({ id: object.id, name: object.id })) : null;
                return <label key={definition.key}>{definition.label}
                  {choices ? <select value={value} onChange={(event) => updateStructureField(definition, event.target.value)}>
                    {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
                  </select> : <input type={definition.kind === 'number' ? 'number' : 'text'}
                    min={definition.min} value={value}
                    onChange={(event) => updateStructureField(definition, event.target.value)} />}
                  {definition.help && <small>{definition.help}</small>}
                </label>;
              })}
            </div>
            <p className="editor-footprint-summary">Footprint {editorStructureFootprint(selectedObject).w}×{editorStructureFootprint(selectedObject).h}
              {' · '}entrance +{editorStructureEntrance(selectedObject).dx},+{editorStructureEntrance(selectedObject).dy}</p>
          </section>}
          {selectedCastle && <EditorCastleInspector castle={selectedCastle} document={document}
            onDelete={() => commitObjectMutation(
              createCastleDeleteEdit(document, selectedCastle.id), 'inspect-result',
            )}
            onUpdate={(update) => {
              const resetVariant = update.faction !== undefined && selectedCastle.variant !== undefined;
              if (commitObjectMutation(
                createCastleUpdateEdit(document, selectedCastle.id, update), 'inspect-result',
              )
                  && resetVariant) setMutationMessage(
                'Faction changed. Any incompatible explicit architectural variant was reset to the faction city.',
              );
            }} />}
          {selectedHero && <EditorHeroInspector hero={selectedHero} document={document}
            onDelete={() => {
              commitObjectMutation(createHeroDeleteEdit(document, selectedHero.id), 'inspect-result');
            }}
            onPolicyMessage={setMutationMessage}
            onUpdate={(update) => commitObjectMutation(
              createHeroUpdateEdit(document, selectedHero.id, update), 'inspect-result',
            )} />}
          {selectedGuardian && <EditorGuardianInspector guardian={selectedGuardian}
            document={document}
            onDelete={() => commitObjectMutation(
              createGuardianDeleteEdit(document, selectedGuardian.id), 'inspect-result',
            )}
            onPolicyMessage={setMutationMessage}
            onUpdate={(update) => commitObjectMutation(
              createGuardianUpdateEdit(document, selectedGuardian.id, update), 'inspect-result',
            )} />}
          {selectedReward && <EditorRewardInspector reward={selectedReward}
            onDelete={() => commitRewardMutation(createRewardDeleteEdit(document, selectedReward.id))}
            onPolicyMessage={setMutationMessage}
            onUpdate={(update) => commitRewardMutation(
              createRewardUpdateEdit(document, selectedReward.id, update),
            )} />}
          <div ref={viewportRef} className="editor-canvas-viewport" data-tool={tool}
            onWheel={(event) => {
              if (!event.ctrlKey && !event.metaKey) return;
              event.preventDefault();
              setZoom((value) => clampEditorZoom(value + (event.deltaY < 0 ? .25 : -.25)));
            }}>
            <div className="editor-canvas-stage" style={{
              width: size.width * TILE * zoom, height: size.height * TILE * zoom,
            }}>
              <canvas ref={canvasRef} width={size.width * TILE} height={size.height * TILE}
                style={{ width: size.width * TILE * zoom, height: size.height * TILE * zoom }}
                role="application" tabIndex={0}
                aria-label={`Editable ${size.width} by ${size.height} terrain map with authored objects and guardians. ${tool} tool selected.`}
                onContextMenu={(event) => event.preventDefault()}
                onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
                onPointerCancel={pointerCancelled} onLostPointerCapture={pointerCancelled}
                onPointerLeave={() => setHovered(null)} />
            </div>
          </div>
          <p className="editor-canvas-help">Drag to paint, fill, or move a selected object. Middle-drag, Space-drag, or Pan moves the canvas.
            Ctrl/⌘+Z undoes, Ctrl/⌘+Y redoes, and Escape cancels the active gesture.</p>
        </div>
      </div>
    </section>
  );
}
