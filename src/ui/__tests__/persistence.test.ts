import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../../core/game';
import { legalBattleActions } from '../../core/combat/battle';
import {
  actionSave, autoSaveGame, CONTENT_HASH, loadGame, replayBattleSave, replaySave,
  saveGame, savedGameSummary, stateHash,
  type StorageLike,
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
    state.players.p1.discoveredObjectKinds.push('mine', 'shrine');
    expect(saveGame(state, storage)).not.toBeNull();
    expect(loadGame(storage)).toEqual(state);
  });

  it('round-trips a four-player Crosstitch state', () => {
    const storage = new MemoryStorage();
    const state = createGame({
      seed: 84, mapId: 'crosstitch', playerCount: 4,
      p1: 'human', p2: 'ai', p3: 'human', p4: 'ai',
    });
    saveGame(state, storage);
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

  it('rotates three recoverable turn-end autosave slots', () => {
    const storage = new MemoryStorage();
    let state = createGame({ seed: 51, p1: 'human', p2: 'human' });
    const snapshots = [];
    for (let index = 0; index < 4; index += 1) {
      state = apply(state, { type: 'END_TURN' });
      snapshots.push(state);
      autoSaveGame(state, storage);
    }
    expect(loadGame(storage, 'auto-0')).toEqual(snapshots[3]);
    expect(loadGame(storage, 'auto-1')).toEqual(snapshots[1]);
    expect(loadGame(storage, 'auto-2')).toEqual(snapshots[2]);
  });

  it('rejects malformed save JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('border-marches.save.v3', '{not valid json');
    expect(loadGame(storage)).toBeNull();
  });

  it('rejects saves from unknown formats', () => {
    const storage = new MemoryStorage();
    storage.setItem('border-marches.save.v3', JSON.stringify({
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
    storage.setItem('border-marches.save.v3', JSON.stringify({
      format: 1, savedAt: Date.now(), state: legacy,
    }));
    expect(loadGame(storage)).toBeNull();
  });

  it('rejects format-2 saves that predate the discovery journal', () => {
    const storage = new MemoryStorage();
    storage.setItem('border-marches.save.v3', JSON.stringify({
      format: 2, savedAt: Date.now(),
      state: { ...createGame({ seed: 1, p1: 'human', p2: 'ai' }), version: 2 },
    }));
    expect(loadGame(storage)).toBeNull();
  });

  it('reconstructs the latest battle as a step-by-step spectator replay', () => {
    let state = createGame({ seed: 99, p1: 'human', p2: 'human' });
    state = apply(state, { type: 'MOVE_HERO', destination: { x: 7, y: 12 } });
    const defend = legalBattleActions(state.battle!).find((action) =>
      action.type === 'BATTLE_DEFEND')!;
    state = apply(state, defend);
    const replay = replayBattleSave(actionSave(state));
    expect(replay.state.phase).toBe('combat');
    expect(replay.actions).toEqual([defend]);
    expect(stateHash(apply(replay.state, replay.actions[0]))).toBe(stateHash(state));
  });

  it('keeps the checked-in golden action save deterministic', () => {
    const golden = {
      contentHash: CONTENT_HASH, mapId: 'border-marches' as const,
      difficulty: 'normal' as const, seed: 424242,
      actionLog: [
        {
          type: 'CAMPAIGN_SETUP' as const,
          options: {
            seed: 424242, p1: 'human' as const, p2: 'human' as const,
            mapId: 'border-marches' as const, difficulty: 'normal' as const,
          },
        },
        { type: 'END_TURN' as const }, { type: 'END_TURN' as const },
      ],
    };
    expect(stateHash(replaySave(golden))).toBe('86da8c2d');
  });
});
