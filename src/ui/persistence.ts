import { apply, createGame } from '../core/game';
import type { Action, Difficulty, GameState, MapId, NewGameOptions } from '../core/types';
import { UNITS } from '../content/units';
import { BUILDINGS, DWELLINGS } from '../content/buildings';
import { SPELLS } from '../content/spells';
import { FACTIONS } from '../content/factions';
import { ARTIFACTS } from '../content/artifacts';
import { ITEMS } from '../content/items';
import { SKILLS } from '../content/skills';
import { OMENS } from '../content/omens';
import { HEROES, FACTION_HEROES } from '../content/heroes';
import { BARGAINS } from '../content/bargains';
import { BATTLE_TILE_TYPES } from '../content/battleTiles';
import * as CONSTANTS from '../content/constants';
import * as MARKETPLACE from '../content/marketplace';
import {
  BATTLE_TILE_PRESENTATION, BUILDING_FLAVOR, MAP_OBJECT_FLAVOR, TERRAIN_PRESENTATION,
} from '../content/flavor';
import { createBorderMarches } from '../content/maps/borderMarches';
import { createCrosstitch, createCrosstitchKit } from '../content/maps/crosstitch';
import { createTornSound } from '../content/maps/tornSound';
import { createManywhere } from '../content/maps/manywhere';
import { TERRAIN } from '../content/terrain';
import { MAP_OBJECT_KINDS } from '../content/mapObjectRegistry';

const SAVE_KEY = 'border-marches.save.v4';
const META_SUFFIX = '.meta';
function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export const CONTENT_HASH = hashText(stableStringify({
  UNITS, BUILDINGS, DWELLINGS, SPELLS, FACTIONS, ARTIFACTS, ITEMS, SKILLS, OMENS,
  HEROES, FACTION_HEROES, BARGAINS, BATTLE_TILE_TYPES, CONSTANTS, MARKETPLACE,
  TERRAIN, MAP_OBJECT_KINDS,
  BATTLE_TILE_PRESENTATION, BUILDING_FLAVOR, MAP_OBJECT_FLAVOR, TERRAIN_PRESENTATION,
  maps: {
    borderMarches: createBorderMarches(1),
    crosstitch: createCrosstitch(1),
    crosstitchKit: createCrosstitchKit(1),
    tornSound: createTornSound(1),
    manywhere: createManywhere(1),
  },
}));

export interface ActionSave {
  contentHash: string;
  mapId: MapId;
  difficulty: Difficulty;
  seed: number;
  actionLog: Action[];
}

export interface BattleReplay {
  state: GameState;
  actions: Action[];
}

export interface SaveSummary {
  savedAt: number;
  day: number;
  week: number;
  activePlayer: string;
  warning?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveSlot = number | 'primary' | `auto-${number}`;

function browserStorage(): StorageLike | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

export function actionSave(state: GameState): ActionSave {
  return {
    contentHash: CONTENT_HASH, mapId: state.map.id,
    difficulty: state.difficulty ?? 'normal', seed: state.seed,
    actionLog: [
      { type: 'CAMPAIGN_SETUP', options: { ...state.setup } },
      ...state.replay.filter((action) => action.type !== 'CAMPAIGN_SETUP')
        .map((action) => ({ ...action })),
    ],
  };
}

function validSave(value: unknown): value is ActionSave {
  if (!value || typeof value !== 'object') return false;
  const save = value as Partial<ActionSave>;
  return typeof save.contentHash === 'string'
    && ['border-marches', 'crosstitch', 'crosstitch-kit', 'torn-sound'].includes(save.mapId ?? '')
    && ['easy', 'normal', 'hard', 'brutal'].includes(save.difficulty ?? '')
    && Number.isInteger(save.seed) && Array.isArray(save.actionLog);
}

function initialStateForSave(save: ActionSave, setupOverride?: NewGameOptions): GameState {
  const header = save.actionLog[0]?.type === 'CAMPAIGN_SETUP'
    ? save.actionLog[0].options : undefined;
  const setup = setupOverride ?? header;
  return createGame({
    ...setup,
    seed: save.seed, mapId: save.mapId, difficulty: save.difficulty,
    p1: setup?.p1 ?? 'human', p2: setup?.p2 ?? 'ai',
    ...(!setup && (save.mapId === 'crosstitch' || save.mapId === 'crosstitch-kit')
      ? { playerCount: 4 as const } : {}),
  });
}

function assertContentMatch(save: ActionSave, refuseMismatch: boolean): void {
  if (save.contentHash !== CONTENT_HASH && refuseMismatch) {
    throw new Error('This replay uses different content data and cannot be opened safely.');
  }
}

export function replaySave(
  save: ActionSave, refuseMismatch = false, setupOverride?: NewGameOptions,
): GameState {
  assertContentMatch(save, refuseMismatch);
  let state = initialStateForSave(save, setupOverride);
  for (const action of save.actionLog) {
    if (action.type !== 'CAMPAIGN_SETUP') state = apply(state, action);
  }
  if (save.contentHash !== CONTENT_HASH) {
    state.eventLog.push('Warning: this local save was made with different content data.');
  }
  return state;
}

/** Reconstruct the start of the latest battle and retain its logged actions for a spectator. */
export function replayBattleSave(save: ActionSave, refuseMismatch = false): BattleReplay {
  assertContentMatch(save, refuseMismatch);
  let state = initialStateForSave(save);
  let current: BattleReplay | null = null;
  let latest: BattleReplay | null = null;
  for (const action of save.actionLog) {
    if (action.type === 'CAMPAIGN_SETUP') continue;
    const wasInBattle = state.phase === 'combat';
    const next = apply(state, action);
    if (!wasInBattle && next.phase === 'combat') {
      current = { state: next, actions: [] };
    } else if (wasInBattle && current) {
      current.actions.push({ ...action });
      if (next.phase !== 'combat') {
        latest = current;
        current = null;
      }
    }
    state = next;
  }
  const result = current ?? latest;
  if (!result) throw new Error('This link does not contain a battle replay.');
  return result;
}

function keyFor(slot: SaveSlot): string {
  return slot === 'primary' ? SAVE_KEY : `${SAVE_KEY}.${slot}`;
}

function writeSlot(state: GameState, key: string, storage: StorageLike): SaveSummary {
  const savedAt = Date.now();
  storage.setItem(key, JSON.stringify(actionSave(state)));
  storage.setItem(`${key}.setup`, JSON.stringify(state.setup));
  // Compatibility for untouched setup screens: the canonical save remains the exact
  // five-field action save, while this sidecar preserves custom hot-seat setup choices.
  if (state.replay.length === 0) storage.setItem(`${key}.initial`, JSON.stringify(state));
  else storage.removeItem(`${key}.initial`);
  const result = summaryFor(state, savedAt);
  storage.setItem(`${key}${META_SUFFIX}`, JSON.stringify(result));
  return result;
}

export function saveGame(
  state: GameState, storage = browserStorage(), slot: number | 'primary' = 'primary',
): SaveSummary | null {
  if (!storage) return null;
  try { return writeSlot(state, keyFor(slot), storage); } catch { return null; }
}

export function autoSaveGame(state: GameState, storage = browserStorage()): SaveSummary | null {
  if (!storage) return null;
  try {
    const cursorKey = `${SAVE_KEY}.auto-cursor`;
    const cursor = (Number(storage.getItem(cursorKey) ?? '-1') + 1) % 3;
    storage.setItem(cursorKey, String(cursor));
    return writeSlot(state, keyFor(`auto-${cursor}`), storage);
  } catch { return null; }
}

export function loadGame(
  storage = browserStorage(), slot: SaveSlot = 'primary',
): GameState | null {
  if (!storage) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(keyFor(slot)) ?? 'null');
    if (!validSave(parsed)) return null;
    const initial = storage.getItem(`${keyFor(slot)}.initial`);
    const gameplayActions = parsed.actionLog.filter((action) => action.type !== 'CAMPAIGN_SETUP');
    if (gameplayActions.length === 0 && initial) {
      const state = JSON.parse(initial) as Partial<GameState>;
      if (state.version === 4 && state.seed === parsed.seed && state.map?.id === parsed.mapId) {
        return state as GameState;
      }
    }
    const setupRaw = storage.getItem(`${keyFor(slot)}.setup`);
    const setup = setupRaw ? JSON.parse(setupRaw) as NewGameOptions : undefined;
    return replaySave(parsed, false, setup);
  } catch { return null; }
}

export function savedGameSummary(
  storage = browserStorage(), slot: SaveSlot = 'primary',
): SaveSummary | null {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(`${keyFor(slot)}${META_SUFFIX}`) ?? 'null');
    return value && typeof value.savedAt === 'number' ? value as SaveSummary : null;
  } catch { return null; }
}

function summaryFor(state: GameState, savedAt: number): SaveSummary {
  return {
    savedAt, day: state.day, week: state.week,
    activePlayer: state.players[state.activePlayer].name,
  };
}

export function exportSaveFile(state: GameState): string {
  return JSON.stringify(actionSave(state), null, 2);
}

export function importSaveFile(contents: string): GameState {
  const parsed: unknown = JSON.parse(contents);
  if (!validSave(parsed)) throw new Error('Invalid save file');
  return replaySave(parsed);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function transform(bytes: Uint8Array, kind: 'compress' | 'decompress'): Promise<Uint8Array> {
  const stream = kind === 'compress'
    ? new CompressionStream('deflate-raw') : new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  await writer.write(bytes as unknown as BufferSource); await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function createLink(
  state: GameState, type: 'game' | 'battle',
): Promise<{ fragment: string; warning?: string }> {
  const compressed = await transform(new TextEncoder().encode(JSON.stringify(actionSave(state))), 'compress');
  const fragment = `#${type}=${bytesToBase64Url(compressed)}`;
  return { fragment, ...(compressed.byteLength > 50 * 1024
    ? { warning: 'This link exceeds 50KB; export a save file instead.' } : {}) };
}

export const createGameLink = (state: GameState) => createLink(state, 'game');

/** A battle link replays the campaign log into its current battle for spectator stepping/play. */
export function createBattleReplayLink(state: GameState) {
  replayBattleSave(actionSave(state));
  return createLink(state, 'battle');
}

async function decodeLink(fragment: string): Promise<ActionSave> {
  const encoded = fragment.replace(/^#?(?:game|battle)=/, '');
  const decoded = await transform(base64UrlToBytes(encoded), 'decompress');
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decoded));
  if (!validSave(parsed)) throw new Error('Invalid replay link');
  return parsed;
}

export async function loadGameLink(fragment: string): Promise<GameState> {
  return replaySave(await decodeLink(fragment), true);
}

export async function loadBattleReplayLink(fragment: string): Promise<BattleReplay> {
  return replayBattleSave(await decodeLink(fragment), true);
}

export function stateHash(state: GameState): string {
  return hashText(stableStringify(state));
}
