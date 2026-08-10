import { describe, expect, it } from 'vitest';
import { tile } from '../../content/terrain';
import { apply, createGame } from '../game';
import { finalizeBattle } from '../game/outcomes';
import { revealForMovementPath, revealForPlayer } from '../map/visibility';
import { animatedAdventurePath } from '../selectors';
import type { Coord, GameState, MapObject } from '../types';
import {
  actionSave, createGameLink, loadGameLink, replaySave, stateHash,
} from '../../ui/persistence';

function fixture(width = 16, height = 15): GameState {
  const state = createGame({ seed: 4801, p1: 'human', p2: 'dormant' });
  state.map = {
    ...state.map, width, height,
    terrain: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => tile('meadow'))),
    objects: [], roads: [], seams: [],
  };
  state.castles = [];
  state.mapEffects = [];
  const hero = state.players.p1.hero!;
  hero.position = { x: 1, y: Math.floor(height / 2) };
  hero.movement = 5_000;
  state.players.p1.heroes = [hero];
  state.players.p1.activeHeroId = hero.id;
  state.players.p1.hero = hero;
  state.players.p1.explored = revealForPlayer([], state.map, hero, []);
  state.players.p2.explored = ['0,0'];
  state.players.p2.heroes.forEach((candidate) => { candidate.alive = false; });
  state.replay = [];
  state.pendingChoice = null;
  return state;
}

function moved(state: GameState, destination: Coord): GameState {
  return apply(state, { type: 'MOVE_HERO', destination });
}

describe('incremental adventure exploration', () => {
  it('persists the union from every entered orthogonal step, not only both endpoints', () => {
    const state = fixture();
    const before = new Set(state.players.p1.explored);
    const result = moved(state, { x: 13, y: 7 });
    expect(result.players.p1.hero!.position).toEqual({ x: 13, y: 7 });
    expect(result.players.p1.explored).toContain('7,2');
    expect(before.has('7,2')).toBe(false);
    expect(revealForPlayer([], state.map, { ...state.players.p1.hero!, position: { x: 13, y: 7 } }, []))
      .not.toContain('7,2');
  });

  it('projects diagonal prefixes and clips edge-of-map vision without leaking a later step', () => {
    const state = fixture(10, 10);
    const hero = state.players.p1.hero!;
    hero.position = { x: 1, y: 1 };
    state.players.p1.explored = revealForPlayer([], state.map, hero, []);
    const path = [hero.position, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }];
    const first = revealForMovementPath(
      state.players.p1.explored, state.map, [hero], [], hero, path.slice(1, 2),
    );
    const second = revealForMovementPath(
      state.players.p1.explored, state.map, [hero], [], hero, path.slice(1, 3),
    );
    expect(first).toContain('2,7');
    expect(first).not.toContain('3,8');
    expect(second).toContain('3,8');
    expect(first.every((key) => {
      const [x, y] = key.split(',').map(Number);
      return x >= 0 && y >= 0 && x < state.map.width && y < state.map.height;
    })).toBe(true);
  });

  it('retains only the traversed prefix when daily movement is exhausted', () => {
    const state = fixture();
    state.players.p1.hero!.movement = 300;
    const result = moved(state, { x: 13, y: 7 });
    expect(result.players.p1.hero!.position).toEqual({ x: 4, y: 7 });
    expect(result.players.p1.explored).toContain('4,2');
    expect(result.players.p1.explored).not.toContain('10,7');
    expect(result.lastMessage).toBe('Hero moved as far as possible.');
    expect(result.players.p1.hero!.pathMemory.at(-1)).toEqual({ x: 13, y: 7 });
  });

  it('reveals the entered siren-interruption tile before returning a pending choice', () => {
    const state = fixture();
    const sirens: MapObject = {
      id: 'fog-sirens', kind: 'sirenRocks', position: { x: 8, y: 7 },
      cleared: false, reward: { gold: 500 },
    };
    state.map.objects.push(sirens);
    expect(animatedAdventurePath(state, { x: 13, y: 7 }).at(-1)).toEqual({ x: 6, y: 7 });
    const result = moved(state, { x: 13, y: 7 });
    expect(result.pendingChoice?.kind).toBe('siren');
    expect(result.players.p1.hero!.position).toEqual({ x: 6, y: 7 });
    expect(result.players.p1.explored).toContain('6,2');
    expect(result.players.p1.explored).not.toContain('12,7');
    expect(result.players.p1.hero!.pathMemory.at(-1)).toEqual({ x: 13, y: 7 });
  });

  it('stops and reveals at guardian aggro while keeping other hot-seat fog isolated', () => {
    const state = fixture();
    state.players.p1.hero!.army = Array(7).fill(null);
    state.map.objects.push({
      id: 'fog-guard', kind: 'guardian', position: { x: 8, y: 7 },
      army: [{ unitId: 'yeoman', count: 20 }], static: true,
    });
    const otherBefore = [...state.players.p2.explored];
    const result = moved(state, { x: 7, y: 7 });
    expect(result.phase).toBe('combat');
    expect(result.players.p1.hero!.position).toEqual({ x: 7, y: 7 });
    expect(result.players.p1.explored).toContain('7,2');
    expect(result.players.p1.explored).not.toContain('13,7');
    expect(result.players.p2.explored).toEqual(otherBefore);
    const visionAtInterruption = [...result.players.p1.explored];
    result.battle!.stacks.filter((stack) => stack.side === 'attacker')
      .forEach((stack) => { stack.count = 0; stack.topHp = 0; });
    result.battle!.winner = 'defender';
    finalizeBattle(result);
    expect(result.players.p1.explored).toEqual(visionAtInterruption);
    expect(result.players.p1.tavernPool.some((hero) => hero.id === state.players.p1.hero!.id))
      .toBe(true);
  });

  it('keeps object-entry trail exploration through replay, save, link, and canonical hash', async () => {
    const state = fixture();
    state.map.objects.push({
      id: 'fog-pile', kind: 'pile', position: { x: 13, y: 7 },
      resource: 'gold', amount: 100, collected: false,
    });
    const interacted = moved(state, { x: 13, y: 7 });
    expect(interacted.map.objects.find((object) => object.id === 'fog-pile'))
      .toMatchObject({ collected: true });
    expect(interacted.players.p1.explored).toContain('7,2');
    // Canonical save reconstruction starts from authored content, so exercise persistence on an
    // authored campaign while the reducer-focused fixtures above own exact trail coordinates.
    let authored = createGame({ seed: 48, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
    authored = moved(authored, { x: 10, y: 6 });
    const save = actionSave(authored);
    const replayed = replaySave(save, true);
    const linked = await loadGameLink((await createGameLink(authored)).fragment);
    expect(save.actionLog.at(-1)).toEqual({
      type: 'MOVE_HERO', destination: { x: 10, y: 6 },
    });
    expect(stateHash(replayed)).toBe(stateHash(authored));
    expect(stateHash(linked)).toBe(stateHash(authored));
    expect(replayed.players.p1.explored).toEqual(authored.players.p1.explored);
  });
});
