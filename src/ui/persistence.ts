import type { GameState } from '../core/types';

const SAVE_KEY = 'border-marches.save.v1';

export interface SaveSummary {
  savedAt: number;
  day: number;
  week: number;
  activePlayer: string;
}

interface SaveEnvelope {
  format: 1;
  savedAt: number;
  state: GameState;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parseEnvelope(raw: string | null): SaveEnvelope | null {
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as Partial<SaveEnvelope>;
    const state = envelope.state as Partial<GameState> | undefined;
    if (envelope.format !== 1 || typeof envelope.savedAt !== 'number'
        || state?.version !== 1 || state.map?.id !== 'border-marches'
        || !state.players || !state.castles || !state.replay) {
      return null;
    }
    if (!state.players.p1?.heroes || !state.players.p2?.heroes) return null;
    return envelope as SaveEnvelope;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, storage = browserStorage()): SaveSummary | null {
  if (!storage) return null;
  const envelope: SaveEnvelope = {
    format: 1,
    savedAt: Date.now(),
    state,
  };
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    return summary(envelope);
  } catch {
    return null;
  }
}

export function loadGame(storage = browserStorage()): GameState | null {
  if (!storage) return null;
  try {
    return parseEnvelope(storage.getItem(SAVE_KEY))?.state ?? null;
  } catch {
    return null;
  }
}

export function savedGameSummary(storage = browserStorage()): SaveSummary | null {
  if (!storage) return null;
  try {
    const envelope = parseEnvelope(storage.getItem(SAVE_KEY));
    return envelope ? summary(envelope) : null;
  } catch {
    return null;
  }
}

function summary(envelope: SaveEnvelope): SaveSummary {
  return {
    savedAt: envelope.savedAt,
    day: envelope.state.day,
    week: envelope.state.week,
    activePlayer: envelope.state.players[envelope.state.activePlayer].name,
  };
}
