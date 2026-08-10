import type {
  ArmyStack, ArtifactInstance, BuildingId, Castle, Coord, FactionId, GameMap,
  Hero, HeroDefinitionId, ItemInstance, Player, PlayerId, Resources, SecondarySkillId,
  SkillRank, SpellId, TerrainId, TerrainSkinId, UnitId, UnitTier, VictoryCondition,
} from '../types';

export const EDITOR_MAP_DOCUMENT_TYPE = 'vibes-and-magic-map' as const;
export const EDITOR_MAP_SCHEMA_VERSION = 1 as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface EditorMapMetadata {
  name: string;
  description: string;
  author: string;
  style: string;
}

export interface EditorMapCompatibility {
  catalogHash: string;
}

export interface EditorTerrainTile {
  terrain: TerrainId;
  skin?: TerrainSkinId;
}

export interface EditorMapPlayer {
  id: PlayerId;
  controller: Player['controller'];
  faction: FactionId;
  name?: string;
}

export interface EditorMapCastle {
  id: string;
  position: Coord;
  owner: PlayerId | 'neutral';
  faction: FactionId;
  footprint?: { w: number; h: number };
  entrance?: { dx: number; dy: number };
  buildings?: BuildingId[];
  bannedBuildings?: BuildingId[];
  available?: number[];
  garrison?: ArmyStack[];
  guildDeck?: SpellId[];
  variant?: Castle['variant'];
  vault?: Resources;
  flavor?: string;
}

export interface EditorMapHero {
  id: string;
  definitionId: HeroDefinitionId;
  owner: PlayerId;
  faction: FactionId;
  position: Coord;
  army: ArmyStack[];
  level?: number;
  xp?: number;
  stats?: Partial<Pick<Hero,
    'attack' | 'defense' | 'spellPower' | 'knowledge' | 'luck' | 'moraleBonus'>>;
  skills?: Partial<Record<SecondarySkillId, SkillRank>>;
  knownSpells?: SpellId[];
  upgradedSpells?: SpellId[];
}

/**
 * Map-object behavior remains catalog-owned. `properties` is the JSON-only set of initial
 * parameters accepted by that registered kind; runtime visit/growth state is supplied by the
 * converter. Keeping it nested prevents object parameters from becoming an accidental second
 * top-level schema.
 */
export interface EditorMapObject {
  id: string;
  kind: Exclude<GameMap['objects'][number]['kind'], 'guardian' | 'rewardPickup'>;
  position: Coord;
  flavorHint?: string;
  footprint?: { w: number; h: number };
  entrance?: { dx: number; dy: number };
  properties: JsonObject;
}

export interface EditorMapGuardian {
  id: string;
  position: Coord;
  army: EditorGuardianStack[];
  split: boolean;
  static: boolean;
  protects: string | null;
  drop: ItemInstance | null;
}

/** Random-tier stacks are portable authoring intent, never counterfeit runtime UnitIds. */
export type EditorGuardianStack =
  | ArmyStack
  | { randomTier: UnitTier; count: number };

export type EditorGuardianCreature =
  | { unitId: UnitId }
  | { randomTier: UnitTier };

export interface EditorRewardBundle {
  artifacts: ArtifactInstance[];
  items: ItemInstance[];
  resources: Partial<Resources>;
  teachesSpell: SpellId | null;
}

export type EditorRewardDelivery =
  | { kind: 'pickup'; position: Coord }
  | { kind: 'site'; objectId: string };

export interface EditorMapReward {
  id: string;
  delivery: EditorRewardDelivery;
  bundle: EditorRewardBundle;
}

export type EditorMapSource =
  | { kind: 'builtIn'; mapId: string }
  | { kind: 'local'; documentId: string; revision: number }
  | null;

export interface EditorMapDocument {
  documentType: typeof EDITOR_MAP_DOCUMENT_TYPE;
  schemaVersion: typeof EDITOR_MAP_SCHEMA_VERSION;
  id: string;
  revision: number;
  metadata: EditorMapMetadata;
  compatibility: EditorMapCompatibility;
  dimensions: { width: number; height: number };
  tiles: EditorTerrainTile[][];
  overlays: { roads: Coord[]; seams: Coord[] };
  players: EditorMapPlayer[];
  castles: EditorMapCastle[];
  heroes: EditorMapHero[];
  objects: EditorMapObject[];
  guardians: EditorMapGuardian[];
  rewards: EditorMapReward[];
  victory: VictoryCondition;
  defeat: VictoryCondition | null;
  source: EditorMapSource;
}

export type EditorDiagnosticSeverity = 'error' | 'warning';
export type EditorDiagnosticStage =
  | 'schema' | 'structure' | 'catalog' | 'reference' | 'playable' | 'compatibility';

export type EditorDiagnosticTarget =
  | { kind: 'document'; path?: string }
  | { kind: 'cell'; x: number; y: number; path?: string }
  | { kind: 'entity'; entityId: string; path?: string };

export interface EditorMapDiagnostic {
  code: string;
  severity: EditorDiagnosticSeverity;
  stage: EditorDiagnosticStage;
  target: EditorDiagnosticTarget;
  message: string;
}

export interface EditorMapDecodeResult {
  document: EditorMapDocument | null;
  diagnostics: EditorMapDiagnostic[];
}

export interface BlankEditorMapOptions {
  id: string;
  name: string;
  width: number;
  height: number;
  terrain: TerrainId;
  skin?: TerrainSkinId;
  description?: string;
  author?: string;
  style?: string;
  catalogHash?: string;
}

export interface EditorRuntimeSetupInputs {
  players: EditorMapPlayer[];
  castles: Castle[];
  heroes: Hero[];
  /** Preserved for the later campaign integration; site rewards are also lowered onto objects. */
  rewards: EditorMapReward[];
}

export interface EditorRuntimeConversion {
  map: GameMap;
  setup: EditorRuntimeSetupInputs;
}
