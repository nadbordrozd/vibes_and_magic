import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/game';
import { MainMenu } from '../components/MainMenu';
import {
  actionSave, saveGame, savedGameSummary, type SaveSummary, type StorageLike,
} from '../persistence';

const SAVE_KEY = 'border-marches.save.v4';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function summaries(): [SaveSummary, SaveSummary, SaveSummary] {
  const compatibleStorage = new MemoryStorage();
  const state = createGame({
    seed: 1234, mapId: 'crosstitch-kit', difficulty: 'hard',
    p1: 'human', p2: 'ai', p1Faction: 'hearthguard', p2Faction: 'woundWrights',
  });
  saveGame(state, compatibleStorage);
  const compatible = savedGameSummary(compatibleStorage)!;

  const mismatchStorage = new MemoryStorage();
  const mismatch = actionSave(state);
  mismatch.contentHash = 'old-content';
  mismatchStorage.setItem(SAVE_KEY, JSON.stringify(mismatch));

  const corruptStorage = new MemoryStorage();
  corruptStorage.setItem(SAVE_KEY, '{broken');
  return [compatible, savedGameSummary(mismatchStorage)!, savedGameSummary(corruptStorage)!];
}

function render(savedGame: SaveSummary | null, manualSaves: Array<SaveSummary | null> = [],
  autoSaves: Array<SaveSummary | null> = []): string {
  return renderToStaticMarkup(<MainMenu onStart={() => undefined} savedGame={savedGame}
    manualSaves={manualSaves} autoSaves={autoSaves} onLoad={() => undefined}
    onImport={() => undefined} />);
}

describe('setup and save menu presentation', () => {
  it('shows every map style and exact objective before starting', () => {
    const html = render(null);
    for (const text of [
      'Two-player conquest campaign', 'Two-to-four-player conquest campaign',
      'artifact-assembly scenario', 'naval conquest campaign', 'exploration sandbox',
      'creature and structure showcase sandbox', 'Defeat all opposing players.',
      "Equip or carry Tailor&#x27;s Needle", 'Sandbox: retire when you are ready.',
      'Showcase sandbox: fight, explore, build, and retire when finished.',
    ]) expect(html).toContain(text);
    expect(html).toContain('You make every decision for this player.');
    expect(html).toContain('The computer explores, builds, recruits, and fights for this player.');
    expect(html).toContain('Starting resources ×1');
    expect(html).toContain('Use the same seed and setup to reproduce random offers and outcomes.');
    expect(html).not.toContain('save-row');
  });

  it('renders populated, mismatched, and corrupt slots with actionable identity', () => {
    const [compatible, mismatch, corrupt] = summaries();
    compatible.savedAt = Date.UTC(2026, 7, 6, 9, 30);
    const html = render(compatible, [mismatch], [corrupt]);
    for (const text of [
      'Continue quick save · Crosstitch: The Kit', 'Hard · seed 1234',
      'Player 1: The Hearthguard · Human', '2026-08-06 09:30 UTC',
      'schema v4', 'content matches this build', 'content mismatch',
      'Content differs from this build', 'Unreadable save', 'corrupt data',
      'choose another slot or overwrite this one in-game',
    ]) expect(html).toContain(text);
    expect(html).toMatch(/class="load-button save-row corrupt"[^>]*disabled/);
  });
});
