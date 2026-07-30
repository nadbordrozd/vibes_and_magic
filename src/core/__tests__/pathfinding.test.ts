import { describe, expect, it } from 'vitest';
import { createBorderMarches } from '../../content/maps/borderMarches';
import {
  coordKey, findPath, inBounds, movementCost, pathCost,
  reachablePathPrefix, sameCoord,
} from '../map/pathfinding';
import type { GameMap, TerrainId } from '../types';
import { createGame } from '../game';
import { animatedAdventurePath } from '../selectors';

const map = createBorderMarches();
const tinyMap = (terrain: TerrainId[][]): GameMap => ({
  ...map, terrain, width: terrain[0].length, height: terrain.length, objects: [],
});

describe('adventure map pathfinding', () => {
  it('keys coordinates stably', () => {
    expect(coordKey({ x: 4, y: 7 })).toBe('4,7');
  });

  it('compares coordinates by value', () => {
    expect(sameCoord({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(sameCoord({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });

  it('checks map bounds', () => {
    expect(inBounds(map, { x: 0, y: 0 })).toBe(true);
    expect(inBounds(map, { x: 28, y: 0 })).toBe(false);
  });

  it('charges 100 for orthogonal grass movement', () => {
    const tiny = tinyMap([['grass', 'grass']]);
    expect(movementCost(tiny, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(100);
  });

  it('charges 141 for diagonal grass movement', () => {
    const tiny = tinyMap([['grass', 'grass'], ['grass', 'grass']]);
    expect(movementCost(tiny, { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(141);
  });

  it('charges 150 for orthogonal forest movement', () => {
    const tiny = tinyMap([['grass', 'forest']]);
    expect(movementCost(tiny, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(150);
  });

  it('rejects mountains', () => {
    const tiny = tinyMap([['grass', 'mountain']]);
    expect(findPath(tiny, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });

  it('finds a route through the north mountain gap', () => {
    const path = findPath(map, { x: 3, y: 10 }, { x: 24, y: 10 });
    expect(path).not.toBeNull();
    expect(path!.some((coord) => coord.x === 13 && [3, 4, 14, 15].includes(coord.y))).toBe(true);
  });

  it('honors blocked coordinates', () => {
    const tiny = tinyMap([['grass', 'grass', 'grass']]);
    expect(findPath(tiny, { x: 0, y: 0 }, { x: 2, y: 0 }, new Set(['1,0']))).toBeNull();
  });

  it('calculates a complete path cost', () => {
    const tiny = tinyMap([['grass', 'grass', 'forest']]);
    expect(pathCost(tiny, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])).toBe(250);
  });

  it('truncates a route to a movement budget', () => {
    const tiny = tinyMap([['grass', 'grass', 'grass']]);
    expect(reachablePathPrefix(
      tiny,
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      100,
    )).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  });

  it('provides the legal prefix used by map movement animation', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    game.players.p1.hero!.movement = 100;
    const path = animatedAdventurePath(game, { x: 10, y: 10 });
    expect(path[0]).toEqual({ x: 3, y: 10 });
    expect(path).toHaveLength(2);
  });
});
