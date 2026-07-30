import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/game';
import {
  loadGame, saveGame, savedGameSummary, type StorageLike,
} from '../persistence';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('local game persistence', () => {
  it('round-trips a complete serializable game state', () => {
    const storage = new MemoryStorage();
    const state = createGame({ seed: 83, p1: 'human', p2: 'ai' });
    expect(saveGame(state, storage)).not.toBeNull();
    expect(loadGame(storage)).toEqual(state);
  });

  it('reports useful menu metadata', () => {
    const storage = new MemoryStorage();
    const state = createGame({ seed: 5, p1: 'human', p2: 'ai' });
    saveGame(state, storage);
    expect(savedGameSummary(storage)).toMatchObject({
      day: 1,
      week: 1,
      activePlayer: 'Player 1',
    });
  });

  it('rejects malformed save JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('border-marches.save.v1', '{not valid json');
    expect(loadGame(storage)).toBeNull();
  });

  it('rejects saves from unknown formats', () => {
    const storage = new MemoryStorage();
    storage.setItem('border-marches.save.v1', JSON.stringify({
      format: 99,
      savedAt: Date.now(),
      state: createGame({ seed: 1, p1: 'human', p2: 'ai' }),
    }));
    expect(loadGame(storage)).toBeNull();
  });

  it('rejects pre-roster single-hero saves instead of guessing a migration', () => {
    const storage = new MemoryStorage();
    const state = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    const legacy = JSON.parse(JSON.stringify(state));
    delete legacy.players.p1.heroes;
    storage.setItem('border-marches.save.v1', JSON.stringify({
      format: 1, savedAt: Date.now(), state: legacy,
    }));
    expect(loadGame(storage)).toBeNull();
  });
});
