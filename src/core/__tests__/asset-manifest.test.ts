import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ASSET_MANIFEST, NON_SPRITE_REPRESENTATIONS, canonicalAssetAnchor,
} from '../../../assets/manifest';
import { AUTHORED_MAPS, assetWorklist } from '../../../assets/worklist';
import { FACTIONS } from '../../content/factions';
import { MAP_OBJECT_KINDS, RUNTIME_ONLY_MAP_OBJECT_KINDS } from '../../content/mapObjectRegistry';
import { UNITS } from '../../content/units';
import { painterOrder } from '../../ui/assets';

describe('pixel-art manifest worklist', () => {
  it('derives all render categories from content and authored maps', () => {
    const worklist = assetWorklist();
    const categories = new Set(worklist.map((item) => item.category));
    expect(categories).toEqual(new Set([
      'terrain', 'overlay', 'decoration', 'map-object', 'castle', 'hero', 'battle-unit',
      'guardian-unit',
    ]));
    expect(AUTHORED_MAPS.map((map) => map.id)).toEqual([
      'border-marches', 'crosstitch', 'torn-sound', 'manywhere', 'grand-muster',
      'crooked-crown',
      'sixfold-trial',
    ]);
    expect(worklist.filter((item) => item.category === 'battle-unit')).toHaveLength(
      Object.keys(UNITS).length,
    );
    expect(worklist.filter((item) => item.category === 'hero')).toHaveLength(
      Object.keys(FACTIONS).length * 8,
    );
    for (const kind of MAP_OBJECT_KINDS.filter((candidate) => candidate !== 'guardian'
      && !RUNTIME_ONLY_MAP_OBJECT_KINDS.includes(candidate as never))) {
      expect(worklist.some((item) => item.id.startsWith(`map-object:${kind}:`)), kind).toBe(true);
    }
  });

  it('keeps every manifest entry on the data-derived worklist', () => {
    const ids = new Set(assetWorklist().map((item) => item.id));
    for (const id of Object.keys(ASSET_MANIFEST)) expect(ids.has(id), id).toBe(true);
  });

  it('gives every data-derived renderable a deliberate presentation', () => {
    for (const item of assetWorklist()) {
      expect(Boolean(ASSET_MANIFEST[item.id] || NON_SPRITE_REPRESENTATIONS[item.id]), item.id)
        .toBe(true);
    }
  });

  it('keeps runtime-only reward lowering out of the authored native-art worklist', () => {
    expect(RUNTIME_ONLY_MAP_OBJECT_KINDS).toEqual(['rewardPickup']);
    expect(assetWorklist().some((item) => item.id.startsWith('map-object:rewardPickup:')))
      .toBe(false);
  });

  it('bottom-anchors ground-contact canvases and requires ownership flag anchors', () => {
    const worklist = new Map(assetWorklist().map((item) => [item.id, item]));
    for (const [id, entry] of Object.entries(ASSET_MANIFEST)) {
      const item = worklist.get(id)!;
      if (item.groundContact) {
        expect(entry.anchor.y, id).toBe(entry.h - item.h);
        expect(entry.anchor.x, id).toBeGreaterThanOrEqual(0);
        expect(entry.anchor.x + item.w, id).toBeLessThanOrEqual(entry.w);
      }
      if (item.ownable) expect(entry.flagAnchor, id).toBeDefined();
    }
    expect(ASSET_MANIFEST['decoration:mountain:granite-massif-1'].anchor).toEqual({ x: 48, y: 80 });
  });

  it('anchors heroes and battle units on their centered eight-pixel baseline', () => {
    expect(canonicalAssetAnchor('hero:hearthguard:s', 32, 48)).toEqual({ x: 16, y: 40 });
    expect(canonicalAssetAnchor('battle-unit:bannerman', 128, 128)).toEqual({ x: 64, y: 120 });
    expect(canonicalAssetAnchor('battle-unit:wide', 192, 128)).toEqual({ x: 96, y: 120 });
  });

  it('orders adventure sprites by anchor row, then column', () => {
    expect(painterOrder([
      { key: 'hero', row: 4, col: 2 },
      { key: 'castle', row: 5, col: 1 },
      { key: 'tree', row: 4, col: 1 },
    ]).map((item) => item.key)).toEqual(['tree', 'hero', 'castle']);
  });

  it('keeps accepted guardians native and the thirteen docs 63–64 silhouettes explicitly staged', () => {
    const guardianUnits = new Set(AUTHORED_MAPS.flatMap((map) => map.objects
      .filter((object) => object.kind === 'guardian')
      .flatMap((guardian) => guardian.kind === 'guardian'
        ? guardian.army.map((stack) => stack.unitId) : [])));
    expect(guardianUnits.size).toBe(31);
    for (const unitId of guardianUnits) {
      const entry = ASSET_MANIFEST[`guardian-unit:${unitId}`];
      if (entry) expect(existsSync(resolve('public', entry.file)), unitId).toBe(true);
      else expect(NON_SPRITE_REPRESENTATIONS[`guardian-unit:${unitId}`], unitId)
        .toContain('typed creature placeholder');
    }
  });
});
