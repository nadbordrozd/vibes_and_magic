import { describe, expect, it } from 'vitest';
import { createBorderMarches } from '../../content/maps/borderMarches';
import { createManywhere } from '../../content/maps/manywhere';
import { createCrookedCrown, CROOKED_CROWN_STARTS } from '../../content/maps/crookedCrown';
import { terrainIdAt } from '../../content/terrain';
import type { GameMap } from '../types';
import {
  deriveMountainRanges, mountainRangeGeometry, mountainRangeHasExploredContact,
  mountainRangeIntersectsViewport, mountainRectangleIntersects,
  type MountainRangeDecoration,
} from '../../ui/mountainRanges';
import { manifestEntry } from '../../../assets/manifest';

function mapWithMountainShape(rows: string[]): GameMap {
  const map = createManywhere(777);
  map.width = rows[0].length;
  map.height = rows.length;
  map.terrain = rows.map((row) => [...row].map((cell) => cell === '#'
    ? { terrain: 'mountain' as const, skin: 'granite' as const }
    : { terrain: 'meadow' as const, skin: 'default' as const }));
  return map;
}

describe('mountain range decorations', () => {
  it.each([
    ['one-tile knoll', 'rocky-knoll-1', 1],
    ['narrow ridge', 'rocky-ridge-2', 2],
    ['massif', 'rocky-massif-1', 5],
    ['short backbone', 'rocky-boundary-3', 4],
  ] as const)('clips representative %s paint to its footprint sides and south edge', (
    _name, variant, contactWidth,
  ) => {
    const range: MountainRangeDecoration = {
      key: variant, position: { x: 7, y: 9 }, variant, contactWidth,
    };
    const geometry = mountainRangeGeometry(range);
    expect(geometry.visual.x).toBe(geometry.footprint.x);
    expect(geometry.visual.width).toBe(geometry.footprint.width);
    expect(geometry.visual.y).toBeLessThan(geometry.footprint.y);
    expect(geometry.visual.y + geometry.visual.height)
      .toBeLessThanOrEqual(geometry.footprint.y + geometry.footprint.height);
    expect(geometry.sprite.width).toBe(manifestEntry(
      `decoration:mountain:${variant}`,
    )!.w);
    expect(geometry.sprite.x - geometry.visual.x)
      .toBeCloseTo(-(geometry.sprite.x + geometry.sprite.width
        - geometry.visual.x - geometry.visual.width));
  });

  it('culls against the complete clipped visual rectangle at every viewport edge', () => {
    const range: MountainRangeDecoration = {
      key: 'edge', position: { x: 10, y: 10 }, variant: 'rocky-ridge-1', contactWidth: 1,
    };
    const { footprint, visual } = mountainRangeGeometry(range);
    expect(mountainRangeIntersectsViewport(range, {
      x: visual.x, y: visual.y, width: visual.width, height: 1,
    })).toBe(true); // northern overhang visible while the anchor/footprint is below the viewport
    expect(mountainRangeIntersectsViewport(range, {
      x: visual.x - 1, y: visual.y, width: 1, height: visual.height,
    })).toBe(false);
    expect(mountainRangeIntersectsViewport(range, {
      x: visual.x + visual.width - 1, y: visual.y, width: 1, height: visual.height,
    })).toBe(true);
    expect(mountainRangeIntersectsViewport(range, {
      x: visual.x, y: visual.y + visual.height - 1, width: visual.width, height: 1,
    })).toBe(true);
    expect(footprint.y).toBeGreaterThan(visual.y + 1);

    const mapEdge = { ...range, position: { x: 0, y: 0 } };
    expect(mountainRangeIntersectsViewport(mapEdge, {
      x: 0, y: 0, width: 1, height: 1,
    })).toBe(true);
  });

  it('mounts a partly explored mid-south composition while keeping unseen contacts fog-owned', () => {
    const map = createCrookedCrown(4040);
    const range = deriveMountainRanges(map).find(({ position, contactWidth }) =>
      position.x === 38 && position.y === 48 && contactWidth === 6);
    expect(range).toBeDefined();
    const explored = new Set(['38,48']);
    expect(mountainRangeHasExploredContact(range!, explored)).toBe(true);
    expect(Array.from({ length: range!.contactWidth }, (_, offset) =>
      explored.has(`${range!.position.x + offset},${range!.position.y}`)).every(Boolean)).toBe(false);
    expect(['39,48', '40,48', '41,48', '42,48', '43,48'].every(
      (key) => !explored.has(key),
    )).toBe(true);
  });

  it('keeps the exact Crooked Crown north-west to south-west route clear in every same-row contact', () => {
    const map = createCrookedCrown(4040);
    const start = CROOKED_CROWN_STARTS[0];
    const goal = CROOKED_CROWN_STARTS[2];
    const queue = [start];
    const previous = new Map<string, string | null>([[`${start.x},${start.y}`, null]]);
    const steps = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ dx, dy })))
      .filter(({ dx, dy }) => dx !== 0 || dy !== 0);
    while (queue.length) {
      const current = queue.shift()!;
      if (current.x === goal.x && current.y === goal.y) break;
      for (const { dx, dy } of steps) {
        const next = { x: current.x + dx, y: current.y + dy };
        const key = `${next.x},${next.y}`;
        if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height
            || previous.has(key) || ['mountain', 'water'].includes(terrainIdAt(map, next))) continue;
        previous.set(key, `${current.x},${current.y}`);
        queue.push(next);
      }
    }
    const route = [];
    for (let key: string | null = `${goal.x},${goal.y}`; key; key = previous.get(key) ?? null) {
      const [x, y] = key.split(',').map(Number);
      route.push({ x, y });
    }
    expect(route).toHaveLength(54);
    for (const range of deriveMountainRanges(map)) {
      const { visual } = mountainRangeGeometry(range);
      for (const tile of route.filter(({ y }) => y === range.position.y)) {
        expect(mountainRectangleIntersects(visual, {
          x: tile.x * 32, y: tile.y * 32, width: 32, height: 32,
        }), `${range.key} paints route tile ${tile.x},${tile.y}`).toBe(false);
      }
    }
  });

  it('is deterministic and confines every contact band to authored mountain terrain', () => {
    const map = createBorderMarches(1);
    const first = deriveMountainRanges(map);
    expect(first).toEqual(deriveMountainRanges(map));
    expect(first.length).toBeGreaterThan(0);
    for (const range of first) {
      for (let offset = 0; offset < range.contactWidth; offset += 1) {
        const position = { x: range.position.x + offset, y: range.position.y };
        expect(terrainIdAt(map, position)).toBe('mountain');
      expect(range.variant.startsWith('rocky-')).toBe(true);
      }
      expect(range.variant).toMatch(/^rocky-(?:scatter|knoll|ridge|massif|backbone|boundary)-/);
    }
  });

  it('uses connected boundary spines as the staple for exposed long mountain runs', () => {
    const ranges = deriveMountainRanges(mapWithMountainShape(['##################']));
    const spines = ranges.filter(({ variant }) => variant.includes('boundary'));
    expect(spines.length).toBeGreaterThanOrEqual(3);
    expect(spines.every(({ contactWidth }) => contactWidth >= 4)).toBe(true);
    expect(new Set(spines.map(({ variant }) => variant)).size).toBe(spines.length);
  });

  it('uses tall overlapping ridges for one-cell-wide north-south spines', () => {
    const ranges = deriveMountainRanges(mapWithMountainShape(['#', '#', '#', '#', '#']));
    expect(ranges).toHaveLength(5);
    expect(ranges.every(({ variant, contactWidth }) =>
      variant.includes('ridge') && contactWidth === 1)).toBe(true);
  });

  it('layers back rows as well as the southern edge so ranges have visual depth', () => {
    const map = createManywhere(1);
    const ranges = deriveMountainRanges(map);
    expect(ranges.some(({ position }) => {
      const below = map.terrain[position.y + 1]?.[position.x];
      return below && terrainIdAt(map, { x: position.x, y: position.y + 1 }) === 'mountain';
    })).toBe(true);
  });

  it('authors every Manywhere mountain cell inside at least a 2-by-2 mass', () => {
    const map = createManywhere(1);
    for (let y = 0; y < map.height; y += 1) for (let x = 0; x < map.width; x += 1) {
      if (terrainIdAt(map, { x, y }) !== 'mountain') continue;
      const mountainAt = (nextX: number, nextY: number) => nextX >= 0 && nextY >= 0
        && nextX < map.width && nextY < map.height
        && terrainIdAt(map, { x: nextX, y: nextY }) === 'mountain';
      const horizontal = [-1, 1].some((dx) => mountainAt(x + dx, y));
      const vertical = [-1, 1].some((dy) => mountainAt(x, y + dy));
      expect(horizontal && vertical, `mountain ${x},${y}`).toBe(true);
    }
  });

  it('composes ranges from multiple independently authored variants and size classes', () => {
    const ranges = deriveMountainRanges(mapWithMountainShape([
      '#.##.###.##################',
    ]));
    const variants = new Set(ranges.filter(({ variant }) => variant.startsWith('rocky-'))
      .map(({ variant }) => variant));
    expect([...variants].filter((variant) => variant.includes('knoll')).length)
      .toBeGreaterThanOrEqual(1);
    expect([...variants].filter((variant) => variant.includes('ridge')).length)
      .toBeGreaterThanOrEqual(1);
    expect([...variants].filter((variant) => variant.includes('boundary')).length)
      .toBeGreaterThanOrEqual(4);
    expect(ranges.every(({ variant }) => variant.startsWith('rocky-'))).toBe(true);
  });

  it.each([
    ['block', ['######', '######', '######']],
    ['elbow', ['##....', '##....', '######', '######']],
    ['stair', ['##....', '####..', '..####', '....##']],
    ['enclosure', ['######', '##..##', '##..##', '######']],
    ['one-cell-wide hook', ['#....', '#....', '###..', '..#..', '..#..']],
    ['bottleneck', ['..###..', '.#####.', '...#...', '.#####.', '#######']],
    ['irregular crescent', ['.####..', '##.....', '##.....', '##.....', '.####..']],
  ])('covers an arbitrary %s topology with varied whole landforms', (_name, rows) => {
    const map = mapWithMountainShape(rows);
    const ranges = deriveMountainRanges(map);
    const covered = new Set(ranges.flatMap((piece) =>
      Array.from({ length: piece.contactWidth }, (_, offset) =>
        `${piece.position.x + offset},${piece.position.y}`)));
    for (let y = 0; y < map.height; y += 1) for (let x = 0; x < map.width; x += 1) {
      if (terrainIdAt(map, { x, y }) === 'mountain') {
        expect(covered.has(`${x},${y}`), `uncovered mountain ${x},${y}`).toBe(true);
      }
    }
    expect(new Set(ranges.map(({ variant }) => variant)).size).toBeGreaterThan(1);
  });

  it('rotates overlapping spine variants inside each long row', () => {
    const ranges = deriveMountainRanges(mapWithMountainShape([
      '##################',
      '##################',
    ])).filter(({ variant }) => variant.includes('backbone') || variant.includes('boundary'));
    for (const y of [0, 1]) {
      const row = ranges.filter(({ position }) => position.y === y)
        .sort((a, b) => a.position.x - b.position.x);
      for (let index = 1; index < row.length; index += 1) {
        expect(row[index].variant).not.toBe(row[index - 1].variant);
      }
    }
  });

  it('reserves solid backbones for interior segments and uses boundaries against flat terrain', () => {
    const map = mapWithMountainShape([
      '##################',
      '##################',
      '##################',
    ]);
    const ranges = deriveMountainRanges(map);
    const roles = new Set(ranges.map(({ variant }) => variant.split('-')[1]));
    expect(roles).toContain('backbone');
    expect(roles).toContain('boundary');
    for (const piece of ranges.filter(({ variant }) => variant.includes('backbone'))) {
      expect(piece.position.x).toBeGreaterThan(0);
      expect(piece.position.x + piece.contactWidth).toBeLessThan(18);
      for (let offset = 0; offset < piece.contactWidth; offset += 1) {
        expect(terrainIdAt(map, { x: piece.position.x + offset, y: piece.position.y + 1 }))
          .toBe('mountain');
      }
    }
  });

  it('covers every impassable mountain cell with a substantial contact band', () => {
    for (const map of [createBorderMarches(1), createManywhere(1)]) {
      const covered = new Set(deriveMountainRanges(map).flatMap((piece) =>
        Array.from({ length: piece.contactWidth }, (_, offset) =>
          `${piece.position.x + offset},${piece.position.y}`)));
      for (let y = 0; y < map.height; y += 1) for (let x = 0; x < map.width; x += 1) {
        if (terrainIdAt(map, { x, y }) === 'mountain') {
          expect(covered.has(`${x},${y}`), `uncovered mountain ${x},${y}`).toBe(true);
        }
      }
    }
  });

  it('covers every possible 3-by-3 mask and longer one-cell-wide runs', () => {
    const assertCovered = (rows: string[]) => {
      const map = mapWithMountainShape(rows);
      const covered = new Set(deriveMountainRanges(map).flatMap((piece) =>
        Array.from({ length: piece.contactWidth }, (_, offset) =>
          `${piece.position.x + offset},${piece.position.y}`)));
      for (let y = 0; y < rows.length; y += 1) for (let x = 0; x < rows[0].length; x += 1) {
        if (rows[y][x] === '#') expect(covered.has(`${x},${y}`), `${rows.join('/')} @ ${x},${y}`).toBe(true);
      }
    };

    for (let mask = 1; mask < 2 ** 9; mask += 1) {
      assertCovered(Array.from({ length: 3 }, (_, y) =>
        Array.from({ length: 3 }, (_, x) => mask & (1 << (y * 3 + x)) ? '#' : '.').join('')));
    }
    for (let length = 2; length <= 12; length += 1) {
      assertCovered(['#'.repeat(length)]);
      assertCovered(Array.from({ length }, () => '#'));
    }
  });

  it('gives every skin a complete native-canvas family instead of resizing one landmark', () => {
    const roles = [
      ['scatter', 6, 32, 48],
      ['knoll', 4, 64, 64],
      ['ridge', 4, 96, 96],
      ['massif', 2, 160, 112],
    ] as const;
    for (const skin of ['rocky', 'granite', 'snowcap'] as const) {
      for (const [role, count, w, h] of roles) {
        if (skin === 'rocky' && role === 'scatter') continue;
        for (let index = 1; index <= count; index += 1) {
          const entry = manifestEntry(`decoration:mountain:${skin}-${role}-${index}`);
          expect(entry, `${skin} ${role} ${index}`).toMatchObject({ w, h });
        }
      }
      if (skin === 'rocky') for (const role of ['backbone', 'boundary'] as const) {
        for (let index = 1; index <= 8; index += 1) {
          const entry = manifestEntry(`decoration:mountain:${skin}-${role}-${index}`);
          expect(entry, `${skin} ${role} ${index}`).toMatchObject({ w: 192, h: 128 });
        }
      }
    }
  });
});
