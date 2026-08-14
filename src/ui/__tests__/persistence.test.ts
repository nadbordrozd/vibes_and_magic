import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../../core/game';
import { legalBattleActions } from '../../core/combat/battle';
import {
  actionSave, autoSaveGame, CONTENT_HASH, loadGame, PRE_V2_CONTENT_HASH,
  replayBattleSave, replaySave,
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
  it('makes the v2 schema part of replay authority while preserving mismatch policy', () => {
    expect(CONTENT_HASH).not.toBe(PRE_V2_CONTENT_HASH);
    const state = createGame({ seed: 82, p1: 'human', p2: 'ai' });
    const old = { ...actionSave(state), contentHash: PRE_V2_CONTENT_HASH };
    expect(replaySave(old).eventLog.at(-1)).toContain('different content data');
    expect(() => replaySave(old, true)).toThrow(/different content data/);
  });

  it('round-trips a complete serializable game state', () => {
    const storage = new MemoryStorage();
    const state = createGame({ seed: 83, p1: 'human', p2: 'ai' });
    state.players.p1.discoveredObjectKinds.push('mine', 'shrine');
    state.players.p1.hero!.spellUses.daily.beacon = 1;
    state.players.p1.spellUses.weekly.fickleWeather = 1;
    expect(saveGame(state, storage)).not.toBeNull();
    expect(loadGame(storage)).toEqual(state);
  });

  it('replays canonical setup with serialized hero and player spell-use ledgers', () => {
    let state = createGame({ seed: 8301, p1: 'human', p2: 'human' });
    state = apply(state, { type: 'END_TURN' });
    state = apply(state, { type: 'END_TURN' });
    const replayed = replaySave(actionSave(state), true);
    expect(replayed.players.p1.hero!.spellUses).toEqual({ daily: {}, weekly: {} });
    expect(replayed.players.p1.spellUses).toEqual({ daily: {}, weekly: {} });
    expect(replayed).toEqual(state);
  });

  it('round-trips doc-65 authored artifact choices and timing ledgers through a full save', () => {
    let state = createGame({ seed: 8302, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    hero.artifacts.backpack.push({ id: 'patientCompass' });
    state = apply(state, { type: 'EQUIP_ARTIFACT', heroId: hero.id,
      backpackIndex: 0, equipmentSlot: 'amulet', chosenObjectKind: 'mine' });
    state.players.p1.hero!.artifactState.marker = { ...state.players.p1.hero!.position };
    state.replay = state.replay.filter((action) => action.type === 'CAMPAIGN_SETUP');
    const storage = new MemoryStorage();
    saveGame(state, storage);
    const replayed = loadGame(storage)!;
    expect(replayed.players.p1.hero!.artifacts.equipment.amulet?.chosenObjectKind).toBe('mine');
    expect(replayed.players.p1.hero!.artifactState).toEqual(state.players.p1.hero!.artifactState);
    expect(replayed).toEqual(state);
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
    expect(stateHash(replaySave(golden))).toBe('97dc3c06');
  });
});
