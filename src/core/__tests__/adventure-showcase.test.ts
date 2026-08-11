import { describe, expect, it } from 'vitest';
import { MAP_OBJECT_KINDS, RUNTIME_ONLY_MAP_OBJECT_KINDS } from '../../content/mapObjectRegistry';
import {
  DEFAULT_TERRAIN_DECORATION_DENSITY, LARGE_MAP_TERRAIN_DECORATION_DENSITY,
  TERRAIN, TERRAIN_DECORATIONS, terrainIdAt,
} from '../../content/terrain';
import {
  ADVENTURE_SHOWCASE_CATEGORIES, adventureShowcaseInventory,
  createInteractionHierarchyFixture, createMountainTopologyFixture,
  decorationDensityFixtures, representativeMapObjects,
  terrainSkinCoverage,
} from '../../ui/adventureShowcase';

describe('adventure visual showcase', () => {
  it('covers every manifest-backed adventure renderable from the executable worklist', () => {
    const inventory = adventureShowcaseInventory();
    expect(inventory).toHaveLength(425);
    expect(new Set(inventory.map(({ id }) => id)).size).toBe(inventory.length);
    expect(new Set(inventory.map(({ category }) => category)))
      .toEqual(new Set(ADVENTURE_SHOWCASE_CATEGORIES));
    expect(Object.fromEntries(ADVENTURE_SHOWCASE_CATEGORIES.map((category) => [
      category, inventory.filter((item) => item.category === category).length,
    ]))).toEqual({
      terrain: 43, overlay: 13, decoration: 80, 'map-object': 213,
      castle: 10, hero: 48, 'guardian-unit': 18,
    });
  });

  it('derives all gameplay terrain/skin pairs from the terrain catalog', () => {
    const coverage = terrainSkinCoverage();
    expect(coverage).toHaveLength(Object.values(TERRAIN)
      .reduce((total, terrain) => total + terrain.skins.length, 0));
    for (const terrain of Object.values(TERRAIN)) for (const skin of terrain.skins) {
      expect(coverage.some((item) => item.terrain === terrain.id && item.skin === skin),
        `${terrain.id}:${skin}`).toBe(true);
    }
  });

  it('derives every map-object variant from maps plus installed collectible catalog batches', () => {
    const inventory = adventureShowcaseInventory()
      .filter((item) => item.category === 'map-object');
    const representatives = representativeMapObjects();
    expect(representatives.size).toBe(inventory.length);
    inventory.forEach((item) => expect(representatives.has(item.id), item.id).toBe(true));
    for (const kind of MAP_OBJECT_KINDS.filter((kind) => kind !== 'guardian'
      && !RUNTIME_ONLY_MAP_OBJECT_KINDS.includes(kind as never))) {
      expect([...representatives.values()].some((object) => object.kind === kind), kind).toBe(true);
    }
  });

  it('uses deterministic shipped-density derivation and covers each decoration family', () => {
    const first = decorationDensityFixtures();
    const second = decorationDensityFixtures();
    expect(second).toEqual(first);
    expect(first).toHaveLength(Object.keys(TERRAIN_DECORATIONS).length * 2);
    for (const fixture of first.filter(({ density }) =>
      density === DEFAULT_TERRAIN_DECORATION_DENSITY)) {
      const present = new Set(fixture.decorations.map(({ kind }) => kind));
      fixture.expectedKinds.forEach((kind) => expect(present.has(kind), kind).toBe(true));
      expect(fixture.decorations.length).toBeGreaterThan(10);
    }
    for (const terrain of Object.keys(TERRAIN_DECORATIONS)) {
      const standard = first.find((fixture) => terrainIdAt(fixture.map, { x: 0, y: 0 }) === terrain
        && fixture.density === DEFAULT_TERRAIN_DECORATION_DENSITY)!;
      const quiet = first.find((fixture) => terrainIdAt(fixture.map, { x: 0, y: 0 }) === terrain
        && fixture.density === LARGE_MAP_TERRAIN_DECORATION_DENSITY)!;
      expect(quiet.decorations.length / (quiet.map.width * quiet.map.height)).toBeLessThan(
        standard.decorations.length / (standard.map.width * standard.map.height),
      );
    }
  });

  it('exercises named mountain topologies through the production compositor', () => {
    const fixture = createMountainTopologyFixture();
    expect(fixture.labels.map(({ name }) => name)).toEqual([
      'runs 1/2/3/4/6/10', 'corner + branch', 'deep blob + interior',
      'lobes + bottleneck', 'stair + hook', 'crescent + channels',
    ]);
    const roles = new Set(fixture.pieces.map(({ variant }) => variant.split('-')[1]));
    expect(roles).toEqual(new Set(['knoll', 'ridge', 'backbone', 'boundary']));
    const covered = new Set(fixture.pieces.flatMap((piece) =>
      Array.from({ length: piece.contactWidth }, (_, offset) =>
        `${piece.position.x + offset},${piece.position.y}`)));
    fixture.map.terrain.forEach((row, y) => row.forEach((_tile, x) => {
      if (terrainIdAt(fixture.map, { x, y }) === 'mountain') {
        expect(covered.has(`${x},${y}`), `uncovered mountain ${x},${y}`).toBe(true);
      }
    }));
  });

  it('composes every interactive adventure presentation into an ordinary-density context', () => {
    const fixture = createInteractionHierarchyFixture();
    const expected = adventureShowcaseInventory().filter(({ category }) =>
      ['map-object', 'castle', 'guardian-unit'].includes(category)).length + 6;
    expect(fixture.items).toHaveLength(expected);
    expect(new Set(fixture.items.map(({ id }) => id)).size).toBe(expected);
    expect(fixture.decorations.length).toBeGreaterThan(100);
    expect(fixture.map.width).toBe(60);
  });
});
