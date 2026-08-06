import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/game';
import {
  actionSave, CONTENT_HASH, importSaveFile, LOCAL_SAVE_SCHEMA, loadGame,
  saveGame, savedGameSummary, type StorageLike,
} from '../persistence';

const SAVE_KEY = 'border-marches.save.v4';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();

  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe('self-identifying setup and save shell', () => {
  it('keeps the canonical payload at exactly five fields while enriching local metadata', () => {
    const storage = new MemoryStorage();
    const state = createGame({
      seed: 31415, mapId: 'crosstitch-kit', difficulty: 'hard', playerCount: 3,
      p1: 'human', p2: 'ai', p3: 'dormant',
      p1Faction: 'hagwood', p2Faction: 'vespiary', p3Faction: 'wildergrass',
    });
    saveGame(state, storage);

    expect(Object.keys(JSON.parse(storage.getItem(SAVE_KEY)!)).sort()).toEqual([
      'actionLog', 'contentHash', 'difficulty', 'mapId', 'seed',
    ]);
    expect(savedGameSummary(storage)).toMatchObject({
      mapId: 'crosstitch-kit', mapName: 'Crosstitch: The Kit', difficulty: 'hard',
      seed: 31415, objective: "Equip or carry Tailor's Needle, Golden Thread, Tailor's Thimble, and Patternbook.",
      schemaVersion: LOCAL_SAVE_SCHEMA, contentHash: CONTENT_HASH,
      compatibility: 'compatible', activePlayer: 'Player 1',
      players: [
        { name: 'Player 1', faction: 'The Hagwood', controller: 'human' },
        { name: 'Player 2', faction: 'The Vespiary', controller: 'ai' },
        { name: 'Player 3', faction: 'The Wildergrass Clans', controller: 'dormant' },
      ],
    });
  });

  it('reconstructs a missing legacy summary sidecar from the canonical replay', () => {
    const storage = new MemoryStorage();
    const state = createGame({ seed: 77, mapId: 'torn-sound', p1: 'human', p2: 'ai' });
    storage.setItem(SAVE_KEY, JSON.stringify(actionSave(state)));

    expect(savedGameSummary(storage)).toMatchObject({
      mapName: 'The Torn Sound', seed: 77, compatibility: 'compatible',
      schemaVersion: LOCAL_SAVE_SCHEMA,
    });
    storage.setItem(`${SAVE_KEY}.meta`, '{broken metadata');
    expect(savedGameSummary(storage)).toMatchObject({
      mapName: 'The Torn Sound', seed: 77, compatibility: 'compatible',
    });
  });

  it('labels content and schema mismatches before a player chooses a slot', () => {
    const storage = new MemoryStorage();
    const state = createGame({ seed: 88, p1: 'human', p2: 'ai' });
    saveGame(state, storage);
    const save = JSON.parse(storage.getItem(SAVE_KEY)!);
    save.contentHash = 'different-content';
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    expect(savedGameSummary(storage)).toMatchObject({
      compatibility: 'content-mismatch', contentHash: 'different-content',
    });
    expect(loadGame(storage)?.eventLog.at(-1)).toContain('different content data');

    const meta = JSON.parse(storage.getItem(`${SAVE_KEY}.meta`)!);
    meta.schemaVersion = LOCAL_SAVE_SCHEMA + 1;
    storage.setItem(`${SAVE_KEY}.meta`, JSON.stringify(meta));
    expect(savedGameSummary(storage)).toMatchObject({
      compatibility: 'schema-mismatch', schemaVersion: LOCAL_SAVE_SCHEMA + 1,
    });
  });

  it('keeps corrupt slots visible and imports valid files without mutating their payload', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{broken json');
    expect(savedGameSummary(storage)).toMatchObject({
      compatibility: 'corrupt', mapName: 'Unreadable save',
    });
    expect(loadGame(storage)).toBeNull();

    const state = createGame({ seed: 99, mapId: 'manywhere', p1: 'human', p2: 'dormant' });
    const payload = JSON.stringify(actionSave(state));
    expect(importSaveFile(payload)).toEqual(state);
    expect(() => importSaveFile('{broken json')).toThrow();
    expect(payload).toBe(JSON.stringify(actionSave(state)));
  });
});
