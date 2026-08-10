import { terrainId } from '../../content/terrain';
import type { TerrainTile } from '../types';
import { EDITOR_CATALOG_HASH, editorMapHash } from './catalog';
import type {
  BlankEditorMapOptions, EditorMapDecodeResult, EditorMapDiagnostic, EditorMapDocument,
  EditorMapObject, EditorMapReward, JsonValue,
} from './types';
import {
  EDITOR_MAP_DOCUMENT_TYPE, EDITOR_MAP_SCHEMA_VERSION,
} from './types';
import { validateEditorMapDocument } from './validation';

const coordinateOrder = (left: { x: number; y: number }, right: { x: number; y: number }) =>
  left.y - right.y || left.x - right.x;
const textOrder = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

function normalizedCoordinateSet(values: Array<{ x: number; y: number }>) {
  return [...new Map(values.map((coord) => [
    `${coord.x},${coord.y}`, { x: coord.x, y: coord.y },
  ])).values()].sort(coordinateOrder);
}

const entityOrder = (
  left: { id: string; position?: { x: number; y: number } },
  right: { id: string; position?: { x: number; y: number } },
) => coordinateOrder(
  left.position ?? { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
  right.position ?? { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
) || textOrder(left.id, right.id);

function rewardPosition(reward: EditorMapReward) {
  return reward.delivery.kind === 'pickup' ? reward.delivery.position : undefined;
}

function canonicalValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) =>
      [key, canonicalValue(value[key])])) as JsonValue;
  }
  return value;
}

/** Stable JSON for hashing and portable files. Object keys are lexicographic at every depth. */
export function stableJson(value: JsonValue): string {
  return JSON.stringify(canonicalValue(value), null, 2);
}

function normalizedTile(value: TerrainTile) {
  if (typeof value === 'object') {
    return { terrain: terrainId(value), ...(value.skin ? { skin: value.skin } : {}) };
  }
  return { terrain: terrainId(value) };
}

/**
 * Returns a detached, canonical document. Validation intentionally remains a separate operation so
 * incomplete editor drafts can be normalized and saved.
 */
export function normalizeEditorMapDocument(document: EditorMapDocument): EditorMapDocument {
  return {
    documentType: EDITOR_MAP_DOCUMENT_TYPE,
    schemaVersion: EDITOR_MAP_SCHEMA_VERSION,
    id: document.id,
    revision: document.revision,
    metadata: {
      name: document.metadata.name,
      description: document.metadata.description ?? '',
      author: document.metadata.author ?? '',
      style: document.metadata.style ?? '',
    },
    compatibility: { catalogHash: document.compatibility.catalogHash },
    dimensions: { ...document.dimensions },
    tiles: document.tiles.map((row) => row.map((tile) => normalizedTile(tile))),
    overlays: {
      roads: normalizedCoordinateSet(document.overlays.roads),
      seams: normalizedCoordinateSet(document.overlays.seams),
    },
    players: document.players.map((player) => ({ ...player }))
      .sort((left, right) => textOrder(left.id, right.id)),
    castles: document.castles.map((castle) => ({
      ...castle,
      position: { ...castle.position },
      ...(castle.footprint ? { footprint: { ...castle.footprint } } : {}),
      ...(castle.entrance ? { entrance: { ...castle.entrance } } : {}),
      ...(castle.buildings ? { buildings: [...castle.buildings].sort(textOrder) } : {}),
      ...(castle.bannedBuildings
        ? { bannedBuildings: [...castle.bannedBuildings].sort(textOrder) } : {}),
      ...(castle.available ? { available: [...castle.available] } : {}),
      ...(castle.garrison ? { garrison: castle.garrison.map((stack) => ({ ...stack })) } : {}),
      ...(castle.guildDeck ? { guildDeck: [...castle.guildDeck] } : {}),
      ...(castle.vault ? { vault: { ...castle.vault } } : {}),
    })).sort(entityOrder),
    heroes: document.heroes.map((hero) => ({
      ...hero, position: { ...hero.position }, army: hero.army.map((stack) => ({ ...stack })),
      ...(hero.stats ? { stats: { ...hero.stats } } : {}),
      ...(hero.skills ? { skills: { ...hero.skills } } : {}),
      ...(hero.knownSpells ? { knownSpells: [...hero.knownSpells] } : {}),
      ...(hero.upgradedSpells ? { upgradedSpells: [...hero.upgradedSpells] } : {}),
    })).sort(entityOrder),
    objects: document.objects.map((object): EditorMapObject => ({
      ...object,
      position: { ...object.position },
      ...(object.footprint ? { footprint: { ...object.footprint } } : {}),
      ...(object.entrance ? { entrance: { ...object.entrance } } : {}),
      properties: canonicalValue(object.properties) as EditorMapObject['properties'],
    })).sort(entityOrder),
    guardians: document.guardians.map((guardian) => ({
      ...guardian,
      position: { ...guardian.position },
      army: guardian.army.map((stack) => ({ ...stack })),
      drop: guardian.drop ? { ...guardian.drop } : null,
    })).sort(entityOrder),
    rewards: document.rewards.map((reward): EditorMapReward => ({
      id: reward.id,
      delivery: reward.delivery.kind === 'pickup'
        ? { kind: 'pickup', position: { ...reward.delivery.position } }
        : { kind: 'site', objectId: reward.delivery.objectId },
      bundle: {
        artifacts: reward.bundle.artifacts.map((artifact) => ({ ...artifact })),
        items: reward.bundle.items.map((item) => ({ ...item })),
        resources: Object.fromEntries(Object.entries(reward.bundle.resources)
          .sort(([left], [right]) => textOrder(left, right))),
        teachesSpell: reward.bundle.teachesSpell,
      },
    })).sort((left, right) => entityOrder(
      { id: left.id, position: rewardPosition(left) },
      { id: right.id, position: rewardPosition(right) },
    )),
    victory: structuredClone(document.victory),
    defeat: document.defeat ? structuredClone(document.defeat) : null,
    source: document.source ? structuredClone(document.source) : null,
  };
}

export class EditorMapCodecError extends Error {
  constructor(public readonly diagnostics: EditorMapDiagnostic[]) {
    super(diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join('\n'));
    this.name = 'EditorMapCodecError';
  }
}

export function serializeEditorMapDocument(document: EditorMapDocument): string {
  const normalized = normalizeEditorMapDocument(document);
  const diagnostics = validateEditorMapDocument(normalized).filter((diagnostic) =>
    diagnostic.severity === 'error'
    && (diagnostic.stage === 'schema' || diagnostic.stage === 'structure'));
  if (diagnostics.length) throw new EditorMapCodecError(diagnostics);
  return `${stableJson(normalized as unknown as JsonValue)}\n`;
}

export function parseEditorMapDocument(source: string): EditorMapDecodeResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    return {
      document: null,
      diagnostics: [{
        code: 'schema.json.invalid', severity: 'error', stage: 'schema',
        target: { kind: 'document' },
        message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      }],
    };
  }
  return decodeEditorMapDocument(value);
}

export function decodeEditorMapDocument(value: unknown): EditorMapDecodeResult {
  const diagnostics = validateEditorMapDocument(value);
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error'
    && (diagnostic.stage === 'schema' || diagnostic.stage === 'structure'))) {
    return { document: null, diagnostics };
  }
  const document = normalizeEditorMapDocument(value as EditorMapDocument);
  return { document, diagnostics: validateEditorMapDocument(document) };
}

export function cloneEditorMapDocument(document: EditorMapDocument): EditorMapDocument {
  const decoded = parseEditorMapDocument(serializeEditorMapDocument(document));
  if (!decoded.document) throw new EditorMapCodecError(decoded.diagnostics);
  return decoded.document;
}

export function hashEditorMapDocument(document: EditorMapDocument): string {
  return editorMapHash(serializeEditorMapDocument(document));
}

export function slugifyEditorId(value: string): string {
  return value.normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

export function stableEntityId(label: string, existingIds: Iterable<string>): string {
  const used = new Set(existingIds);
  const base = slugifyEditorId(label) || 'entity';
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function editorEntityIds(document: EditorMapDocument): string[] {
  return [
    ...document.castles, ...document.heroes, ...document.objects,
    ...document.guardians, ...document.rewards,
  ].map((entity) => entity.id);
}

export function createBlankEditorMap(options: BlankEditorMapOptions): EditorMapDocument {
  const fill = {
    terrain: options.terrain,
    ...(options.skin ? { skin: options.skin } : {}),
  };
  return normalizeEditorMapDocument({
    documentType: EDITOR_MAP_DOCUMENT_TYPE,
    schemaVersion: EDITOR_MAP_SCHEMA_VERSION,
    id: options.id,
    revision: 1,
    metadata: {
      name: options.name,
      description: options.description ?? '',
      author: options.author ?? '',
      style: options.style ?? '',
    },
    compatibility: { catalogHash: options.catalogHash ?? EDITOR_CATALOG_HASH },
    dimensions: { width: options.width, height: options.height },
    tiles: Array.from({ length: options.height }, () =>
      Array.from({ length: options.width }, () => ({ ...fill }))),
    overlays: { roads: [], seams: [] },
    players: [], castles: [], heroes: [], objects: [], guardians: [], rewards: [],
    victory: { type: 'conquest', flavor: '', mechanics: '' },
    defeat: null,
    source: null,
  });
}
