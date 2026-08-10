import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../game';
import {
  friendlyHeroMeetingCompletion, friendlyHeroMeetingPlan,
} from '../game/navigation';
import { coordKey } from '../map/pathfinding';
import { guardianAggroTiles } from '../map/occupancy';
import type { GameState, Hero, MapObject, TerrainTile } from '../types';

function fixture(width = 8, height = 6): { state: GameState; source: Hero; target: Hero } {
  const state = createGame({
    seed: 8063, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
  });
  const [source, target] = state.players.p1.heroes;
  if (!source || !target) throw new Error('Grand Muster must provide two friendly heroes');
  state.map = {
    ...state.map, width, height, objects: [], roads: [], seams: [],
    terrain: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 'grass' as TerrainTile)),
  };
  state.castles = [];
  state.mapEffects = [];
  state.pendingChoice = null;
  source.position = { x: 0, y: Math.min(2, height - 1) };
  source.movement = 4_000;
  target.position = { x: Math.min(5, width - 1), y: Math.min(2, height - 1) };
  return { state, source, target };
}

function plan(state: GameState, target: Hero) {
  const result = friendlyHeroMeetingPlan(state, target.id);
  if (!result.ok) throw new Error(result.reason);
  return result.plan;
}

describe('map-driven friendly hero meetings', () => {
  it('opens adjacent meetings without movement and never overlaps heroes', () => {
    const { state, source, target } = fixture();
    source.position = { x: 2, y: 2 };
    target.position = { x: 3, y: 3 };
    const meeting = plan(state, target);
    expect(meeting).toMatchObject({ adjacent: true, cost: 0, destination: source.position });
    expect(meeting.path).toEqual([source.position]);
    expect(meeting.destination).not.toEqual(target.position);
  });

  it('chooses the deterministic least-cost empty adjacent tile and completes through MOVE_HERO', () => {
    const { state, source, target } = fixture();
    target.position = { x: 4, y: 2 };
    const meeting = plan(state, target);
    expect(meeting).toMatchObject({ adjacent: false, destination: { x: 3, y: 2 }, cost: 300 });
    expect(meeting.path[0]).toEqual(source.position);
    expect(meeting.path.at(-1)).toEqual(meeting.destination);
    expect(meeting.path).not.toContainEqual(target.position);
    const moved = apply(state, { type: 'MOVE_HERO', destination: meeting.destination });
    expect(moved.players.p1.heroes.find((hero) => hero.id === source.id)?.position)
      .toEqual({ x: 3, y: 2 });
    expect(moved.players.p1.heroes.find((hero) => hero.id === target.id)?.position)
      .toEqual({ x: 4, y: 2 });
    expect(friendlyHeroMeetingCompletion(
      moved, source.id, target.id, meeting.destination,
    )).toEqual({ ok: true });
  });

  it('breaks equal-cost meeting destinations by y then x', () => {
    const { state, source, target } = fixture(6, 7);
    source.position = { x: 2, y: 6 };
    target.position = { x: 2, y: 2 };
    state.map.objects = [{
      id: 'middle-block', kind: 'obstacle', prop: 'fallen-log', position: { x: 2, y: 3 },
    } as MapObject];
    expect(plan(state, target).destination).toEqual({ x: 1, y: 3 });
  });

  it('routes around guardians and never chooses an aggro or occupied endpoint', () => {
    const { state, source, target } = fixture(9, 7);
    source.position = { x: 0, y: 3 };
    target.position = { x: 7, y: 3 };
    const guardian = {
      id: 'meeting-guard', kind: 'guardian' as const, position: { x: 4, y: 3 },
      army: [{ unitId: 'yeoman' as const, count: 8 }], static: true,
    };
    state.map.objects = [guardian];
    const meeting = plan(state, target);
    const danger = new Set([
      coordKey(guardian.position),
      ...guardianAggroTiles(guardian, state.map).map(coordKey),
    ]);
    expect(meeting.path.every((position) => !danger.has(coordKey(position)))).toBe(true);
    expect(Math.max(Math.abs(meeting.destination.x - target.position.x),
      Math.abs(meeting.destination.y - target.position.y))).toBe(1);
    expect(meeting.destination).not.toEqual(target.position);
  });

  it('fails safely when every adjacent tile is occupied or blocked', () => {
    const { state, target } = fixture(7, 7);
    target.position = { x: 4, y: 3 };
    state.map.objects = Array.from({ length: 3 }, (_, dy) =>
      Array.from({ length: 3 }, (_, dx) => ({
        id: `block-${dx}-${dy}`, kind: 'obstacle' as const, prop: 'fallen-log' as const,
        position: { x: target.position.x + dx - 1, y: target.position.y + dy - 1 },
      }))).flat().filter((object) => object.position.x !== target.position.x
        || object.position.y !== target.position.y);
    expect(friendlyHeroMeetingPlan(state, target.id)).toEqual({
      ok: false, reason: 'No free legal tile is available beside that hero.',
    });
  });

  it('does not complete when ordinary movement budget stops the route early', () => {
    const { state, source, target } = fixture();
    target.position = { x: 4, y: 2 };
    const meeting = plan(state, target);
    source.movement = 100;
    const moved = apply(state, { type: 'MOVE_HERO', destination: meeting.destination });
    expect(moved.players.p1.heroes.find((hero) => hero.id === source.id)?.position)
      .toEqual({ x: 1, y: 2 });
    expect(friendlyHeroMeetingCompletion(moved, source.id, target.id, meeting.destination))
      .toEqual({ ok: false, reason: 'Hero moved as far as possible.' });
  });

  it('reports interrupted, dead, and no-longer-friendly completion without opening', () => {
    const { state, source, target } = fixture();
    const destination = { x: target.position.x - 1, y: target.position.y };
    state.pendingChoice = {
      kind: 'siren', playerId: 'p1', heroId: source.id, objectId: 'song',
    };
    state.lastMessage = 'The song is about you, specifically.';
    expect(friendlyHeroMeetingCompletion(state, source.id, target.id, destination))
      .toMatchObject({ ok: false, reason: expect.stringContaining('interrupted') });
    state.pendingChoice = null;
    target.alive = false;
    expect(friendlyHeroMeetingCompletion(state, source.id, target.id, destination))
      .toEqual({ ok: false, reason: 'the other hero is no longer available.' });
    target.alive = true;
    target.owner = 'p2';
    expect(friendlyHeroMeetingCompletion(state, source.id, target.id, destination))
      .toEqual({ ok: false, reason: 'the heroes are no longer friendly.' });
  });
});
