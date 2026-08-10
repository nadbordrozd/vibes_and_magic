import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { manifestEntry } from '../../../assets/manifest';
import { ITEMS } from '../../content/items';
import { UNITS } from '../../content/units';
import {
  EDITOR_GUARDIAN_BASE_COUNTS, EDITOR_GUARDIAN_TIERS, EDITOR_NON_ROSTER_UNIT_IDS,
  EDITOR_RANDOM_GUARDIAN_UNITS, convertEditorMapDocument, createBlankEditorMap,
  defaultEditorGuardianCount,
  parseEditorMapDocument, serializeEditorMapDocument, validateEditorMapDocument,
  type EditorMapDocument,
} from '../../core/mapEditor';
import { unitStrength } from '../../core/army';
import type { UnitId } from '../../core/types';
import { EditorGuardianInspector } from '../components/EditorGuardianControls';
import { EditorTerrainCanvas } from '../components/EditorTerrainCanvas';
import {
  EDITOR_AUTHORABLE_GUARDIAN_CATALOG, EDITOR_EXCLUDED_GUARDIAN_CATALOG,
  EDITOR_GUARDIAN_CATALOG, EDITOR_GUARDIAN_FOOTPRINT, canPlaceEditorGuardian,
  createGuardianDeleteEdit, createGuardianMoveEdit, createGuardianPlacementEdit,
  createGuardianUpdateEdit, editorGuardianCanvasGeometry, editorGuardianProtectChoices,
  editorGuardianSpriteEntry, editorGuardianUnitChoices, safeEditorGuardianArmy,
} from '../mapEditorGuardians';
import {
  EMPTY_TERRAIN_HISTORY, commitTerrainEdit, editorMoveAnchor, redoTerrainEdit, undoTerrainEdit,
} from '../mapEditorTerrain';

function document(): EditorMapDocument {
  const map = createBlankEditorMap({
    id: 'guardian-workbench', name: 'Guardian Workbench', width: 20, height: 14,
    terrain: 'meadow', skin: 'default',
  });
  map.victory = { type: 'none', flavor: 'Test the field.', mechanics: 'Retire when finished.' };
  return map;
}

const codes = (map: unknown) => validateEditorMapDocument(map).map((item) => item.code);

describe('editor guardian canonical catalog and rendering disposition', () => {
  it('accounts for and exposes every canonical unit ID exactly once', () => {
    const canonical = Object.keys(UNITS).sort();
    expect(EDITOR_GUARDIAN_CATALOG.map((entry) => entry.unit.id).sort()).toEqual(canonical);
    expect(EDITOR_AUTHORABLE_GUARDIAN_CATALOG.map((entry) => entry.unit.id).sort())
      .toEqual(canonical);
    expect(EDITOR_EXCLUDED_GUARDIAN_CATALOG).toEqual([]);
    expect(EDITOR_GUARDIAN_CATALOG).toHaveLength(50);
    expect(new Set(EDITOR_GUARDIAN_CATALOG.map((entry) => entry.unit.id)).size).toBe(50);
  });

  it('explicitly marks all five special constructs while keeping them selectable and static by default', () => {
    const special = EDITOR_GUARDIAN_CATALOG.filter((entry) =>
      entry.authoringDisposition === 'special-battlefield-construct');
    expect(special.map((entry) => entry.unit.id).sort())
      .toEqual([...EDITOR_NON_ROSTER_UNIT_IDS].sort());
    for (const unitId of EDITOR_NON_ROSTER_UNIT_IDS) {
      const placed = createGuardianPlacementEdit(document(), { x: 2, y: 2 }, unitId);
      expect(placed).toMatchObject({ ok: true, guardian: {
        army: [{ unitId, count: 1 }], static: true,
      } });
    }
  });

  it('derives an exhaustive 18-native/32-fallback disposition from the installed manifest', () => {
    const native = EDITOR_GUARDIAN_CATALOG.filter((entry) => entry.rendering === 'native');
    const fallback = EDITOR_GUARDIAN_CATALOG.filter((entry) => entry.rendering === 'fallback');
    expect(native).toHaveLength(18);
    expect(fallback).toHaveLength(32);
    for (const entry of EDITOR_GUARDIAN_CATALOG) {
      expect(Boolean(manifestEntry(entry.spriteId))).toBe(entry.rendering === 'native');
    }
    const asset = editorGuardianSpriteEntry('yeoman')!;
    expect(editorGuardianCanvasGeometry({ x: 2, y: 3 }, asset)).toEqual({
      x: 80 - asset.anchor.x, y: 112 - asset.anchor.y,
      width: asset.w, height: asset.h,
    });
    expect(EDITOR_GUARDIAN_FOOTPRINT).toEqual({ w: 1, h: 1 });
  });
});

describe('editor guardian transactions and structured inspector', () => {
  it('places with a tier-scaled count, offset-moves, deletes, undoes, and redoes transactionally', () => {
    const map = document();
    const placed = createGuardianPlacementEdit(map, { x: 3, y: 4 }, 'yeoman');
    const expectedCount = defaultEditorGuardianCount(
      1, 'yeoman-guardians:3:4:yeoman',
    );
    expect(placed).toMatchObject({ ok: true, guardian: {
      position: { x: 3, y: 4 }, army: [{ unitId: 'yeoman', count: expectedCount }],
      split: false, static: false, protects: null, drop: null,
    } });
    if (!placed.ok) return;
    let committed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placed.edit);
    expect(editorMoveAnchor({ x: 10, y: 8 }, { x: 0, y: 0 })).toEqual({ x: 10, y: 8 });
    const moved = createGuardianMoveEdit(committed.document, placed.guardian!.id, { x: 10, y: 8 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    committed = commitTerrainEdit(committed.document, committed.history, moved.edit);
    const deleted = createGuardianDeleteEdit(committed.document, placed.guardian!.id);
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    const removed = commitTerrainEdit(committed.document, committed.history, deleted.edit);
    expect(removed.document.guardians).toEqual([]);
    const restored = undoTerrainEdit(removed.document, removed.history);
    expect(restored.document.guardians[0].position).toEqual({ x: 10, y: 8 });
    expect(redoTerrainEdit(restored.document, restored.history).document.guardians).toEqual([]);
  });

  it('uses decreasing tier counts, increasing catalog-average power, and stable ±20% variation', () => {
    const baseCounts = EDITOR_GUARDIAN_TIERS.map((tier) => EDITOR_GUARDIAN_BASE_COUNTS[tier]);
    expect(baseCounts.every((count, index) => index === 0 || count < baseCounts[index - 1]))
      .toBe(true);
    const averagePowers = EDITOR_GUARDIAN_TIERS.map((tier) => {
      const powers = EDITOR_RANDOM_GUARDIAN_UNITS[tier].map((unitId) =>
        unitStrength(unitId) * EDITOR_GUARDIAN_BASE_COUNTS[tier]);
      return powers.reduce((sum, power) => sum + power, 0) / powers.length;
    });
    expect(averagePowers.every((power, index) => index === 0
      || power > averagePowers[index - 1])).toBe(true);
    for (const tier of EDITOR_GUARDIAN_TIERS) {
      const counts = Array.from({ length: 40 }, (_unused, index) =>
        defaultEditorGuardianCount(tier, `sample-${index}`));
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(
        Math.round(EDITOR_GUARDIAN_BASE_COUNTS[tier] * .8),
      );
      expect(Math.max(...counts)).toBeLessThanOrEqual(
        Math.round(EDITOR_GUARDIAN_BASE_COUNTS[tier] * 1.2),
      );
      expect(new Set(counts).size).toBeGreaterThan(1);
      expect(defaultEditorGuardianCount(tier, 'stable'))
        .toBe(defaultEditorGuardianCount(tier, 'stable'));
    }
  });

  it('round-trips six random-tier placeholders and resolves them only from the game seed', () => {
    const map = document();
    for (const [index, tier] of EDITOR_GUARDIAN_TIERS.entries()) {
      const placed = createGuardianPlacementEdit(
        map, { x: 2 + index * 2, y: 8 }, { randomTier: tier },
      );
      expect(placed.ok).toBe(true);
      if (placed.ok && placed.guardian) map.guardians.push(placed.guardian);
    }
    const serialized = serializeEditorMapDocument(map);
    expect(serialized).toMatch(/"randomTier":\s*1/);
    expect(parseEditorMapDocument(serialized).document?.guardians).toEqual(map.guardians);
    expect(codes(map)).not.toContain('catalog.unit.unknown');
    expect(codes(map)).not.toContain('guardian.army.random_tier.invalid');
    const resolve = (seed: number) => convertEditorMapDocument(
      map, seed, { requirePlayable: false },
    ).map.objects.filter((object) => object.kind === 'guardian')
      .map((guardian) => guardian.army[0].unitId);
    expect(resolve(77)).toEqual(resolve(77));
    const samples = Array.from({ length: 32 }, (_unused, seed) => resolve(seed));
    EDITOR_GUARDIAN_TIERS.forEach((tier, index) => {
      const choices = new Set(EDITOR_RANDOM_GUARDIAN_UNITS[tier]);
      expect(samples.every((sample) => choices.has(sample[index]))).toBe(true);
      expect(new Set(samples.map((sample) => sample[index])).size).toBeGreaterThan(1);
    });
  });

  it('uses shared bounds and occupancy against every authored entity class', () => {
    const base = document();
    base.castles.push({ id: 'castle', position: { x: 1, y: 1 }, owner: 'neutral', faction: 'hearthguard' });
    base.heroes.push({ id: 'hero', definitionId: 'aldith', owner: 'p1', faction: 'hearthguard',
      position: { x: 5, y: 1 }, army: [{ unitId: 'yeoman', count: 1 }] });
    base.objects.push({ id: 'site', kind: 'waystation', position: { x: 7, y: 1 }, properties: {} });
    base.guardians.push({ id: 'guard', position: { x: 9, y: 1 },
      army: [{ unitId: 'yeoman', count: 1 }], split: false, static: false,
      protects: null, drop: null });
    base.rewards.push({ id: 'pickup', delivery: { kind: 'pickup', position: { x: 11, y: 1 } },
      bundle: { artifacts: [], items: [], resources: { gold: 1 }, teachesSpell: null } });
    for (const position of [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 7, y: 1 },
      { x: 9, y: 1 }, { x: 11, y: 1 }]) {
      expect(canPlaceEditorGuardian(base, position)).toEqual({ ok: false, reason: 'overlap' });
    }
    expect(canPlaceEditorGuardian(base, { x: -1, y: 1 }))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(canPlaceEditorGuardian(base, { x: 20, y: 1 }))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
  });

  it('edits 1–7 unique stacks/counts and preserves imported fields on unrelated updates', () => {
    expect(safeEditorGuardianArmy([
      { unitId: 'yeoman', count: 12 }, { unitId: 'siegeWall', count: 1 },
    ])).toEqual([{ unitId: 'yeoman', count: 12 }, { unitId: 'siegeWall', count: 1 }]);
    expect(safeEditorGuardianArmy([])).toBeNull();
    expect(safeEditorGuardianArmy([{ unitId: 'yeoman', count: 0 }])).toBeNull();
    expect(safeEditorGuardianArmy([
      { unitId: 'yeoman', count: 1 }, { unitId: 'yeoman', count: 2 },
    ])).toBeNull();
    expect(safeEditorGuardianArmy([
      { randomTier: 2, count: 30 }, { randomTier: 2, count: 12 },
    ])).toBeNull();
    expect(safeEditorGuardianArmy([{ randomTier: 4, count: 11 }]))
      .toEqual([{ randomTier: 4, count: 11 }]);
    expect(safeEditorGuardianArmy(Object.keys(UNITS).slice(0, 8).map((unitId) => ({
      unitId: unitId as UnitId, count: 1,
    })))).toBeNull();

    const map = document();
    map.guardians.push({ id: 'guard', position: { x: 4, y: 4 },
      army: [{ unitId: 'yeoman', count: 2 }], split: false, static: false,
      protects: null, drop: { id: 'spellScroll', storedSpellId: 'rally', plus: true } });
    const changed = createGuardianUpdateEdit(map, 'guard', {
      army: [{ unitId: 'yeoman', count: 33 }, { unitId: 'siegeWall', count: 1 }], split: true,
    });
    expect(changed).toMatchObject({ ok: true, guardian: {
      army: [{ unitId: 'yeoman', count: 33 }, { unitId: 'siegeWall', count: 1 }],
      split: true, static: false,
      drop: { id: 'spellScroll', storedSpellId: 'rally', plus: true },
    } });
    if (!changed.ok || !changed.guardian) return;
    expect(editorGuardianUnitChoices(changed.guardian, 0)).not.toContain('siegeWall');
    expect(createGuardianUpdateEdit(map, 'guard', { army: [] }))
      .toEqual({ ok: false, reason: 'invalid-army' });
    expect(createGuardianUpdateEdit(map, 'guard', { drop: { id: 'waybread', plus: true } }))
      .toEqual({ ok: false, reason: 'invalid-drop' });
    expect(createGuardianUpdateEdit(map, 'guard', {
      drop: { id: 'scrollRally', storedSpellId: 'ward' },
    })).toEqual({ ok: false, reason: 'invalid-drop' });
    expect(createGuardianUpdateEdit(map, 'guard', {
      drop: { id: 'waybread', origin: { x: 1, y: 1 } },
    })).toEqual({ ok: false, reason: 'invalid-drop' });
  });

  it('offers object/reward protection links, supports standalone, and rejects missing/incompatible links', () => {
    const map = document();
    map.objects.push({ id: 'site', kind: 'waystation', position: { x: 6, y: 5 }, properties: {} });
    map.rewards.push({ id: 'reward', delivery: { kind: 'pickup', position: { x: 8, y: 5 } },
      bundle: { artifacts: [], items: [], resources: { gold: 1 }, teachesSpell: null } });
    map.guardians.push({ id: 'guard', position: { x: 4, y: 5 },
      army: [{ unitId: 'yeoman', count: 1 }], split: false, static: false,
      protects: null, drop: null });
    expect(editorGuardianProtectChoices(map)).toEqual([
      { id: 'site', kind: 'object', label: 'waystation' },
      { id: 'reward', kind: 'reward', label: 'pickup reward at 8,5' },
    ]);
    expect(createGuardianUpdateEdit(map, 'guard', { protects: 'site' }))
      .toMatchObject({ ok: true, guardian: { protects: 'site' } });
    expect(createGuardianUpdateEdit(map, 'guard', { protects: null }))
      .toMatchObject({ ok: true, guardian: { protects: null } });
    expect(createGuardianUpdateEdit(map, 'guard', { protects: 'reward' }))
      .toMatchObject({ ok: true, guardian: { protects: 'reward' } });
    map.guardians[0].protects = 'reward';
    expect(codes(map)).not.toContain('reference.guard_target.incompatible');
    expect(createGuardianUpdateEdit(map, 'guard', { split: true }))
      .toMatchObject({ ok: true, guardian: { protects: 'reward', split: true } });
    const parsed = parseEditorMapDocument(serializeEditorMapDocument(map)).document!;
    expect(parsed.guardians[0].protects).toBe('reward');
    map.guardians[0].protects = 'unknown';
    expect(codes(map)).toContain('reference.guard_target.missing');
    map.heroes.push({ id: 'hero-target', definitionId: 'aldith', owner: 'p1',
      faction: 'hearthguard', position: { x: 12, y: 5 }, army: [{ unitId: 'yeoman', count: 1 }] });
    map.castles.push({ id: 'castle-target', owner: 'neutral', faction: 'hearthguard',
      position: { x: 14, y: 5 } });
    map.guardians[0].protects = 'hero-target';
    expect(codes(map)).toContain('reference.guard_target.incompatible');
    map.guardians[0].protects = 'castle-target';
    expect(codes(map)).toContain('reference.guard_target.incompatible');
    expect(createGuardianUpdateEdit(map, 'guard', { split: true }))
      .toEqual({ ok: false, reason: 'invalid-protects' });
  });

  it('cascades objective references on ID rename and refuses dangling objective deletion', () => {
    const map = document();
    map.guardians.push({ id: 'guard', position: { x: 4, y: 5 },
      army: [{ unitId: 'yeoman', count: 1 }], split: false, static: false,
      protects: null, drop: null });
    map.victory = { type: 'slay', objectId: 'guard', flavor: 'Break them.', mechanics: 'Slay guard.' };
    expect(codes(map)).not.toContain('reference.objective_target.missing');
    const renamed = createGuardianUpdateEdit(map, 'guard', { id: 'gate-guard' });
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    const changed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, renamed.edit);
    expect(changed.document.victory).toMatchObject({ objectId: 'gate-guard' });
    expect(codes(changed.document)).not.toContain('reference.objective_target.missing');
    expect(undoTerrainEdit(changed.document, changed.history).document.victory)
      .toMatchObject({ objectId: 'guard' });
    expect(createGuardianDeleteEdit(changed.document, 'gate-guard'))
      .toEqual({ ok: false, reason: 'referenced-objective' });
  });

  it('renders a structured safe inspector with disabled-state reasons and no raw JSON editor', () => {
    const map = document();
    const guardian = { id: 'guard', position: { x: 4, y: 5 },
      army: [{ unitId: 'yeoman' as const, count: 7 }], split: true, static: false,
      protects: null, drop: { id: 'waybread' as const } };
    const html = renderToStaticMarkup(<EditorGuardianInspector guardian={guardian} document={map}
      onUpdate={() => true} onDelete={() => undefined} onPolicyMessage={() => undefined} />);
    for (const label of ['Selected guardian', 'Stable ID', 'Protects', 'Standalone',
      'Direct item drop', 'Split deployment', 'Static guardian', 'Guardian army',
      'positive whole troop count', 'Add guardian stack', '1 / 7 stacks']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('A guardian must keep at least one stack.');
    expect(html).not.toContain('textarea');
    expect(html).not.toContain('originalArmy');
    expect(Object.keys(ITEMS)).toContain('waybread');
  });
});

describe('guardian validation, portability, and palette accessibility', () => {
  it('validates empty/duplicate/oversized/count/ID/link safety without rejecting constructs', () => {
    const map = document();
    map.guardians = [{ id: 'guard', position: { x: 2, y: 2 }, army: [],
      split: false, static: false, protects: null, drop: null }];
    expect(codes(map)).toContain('guardian.army.empty');
    map.guardians[0].army = [
      { unitId: 'siegeWall', count: 1 }, { unitId: 'siegeWall', count: 2 },
      ...Array.from({ length: 6 }, () => ({ unitId: 'yeoman' as const, count: 1 })),
    ];
    expect(codes(map)).toEqual(expect.arrayContaining([
      'army.too_many_stacks', 'guardian.army.duplicate_unit',
    ]));
    expect(codes(map)).not.toContain('guardian.army.unit_not_authorable');
    map.guardians[0].army = [{ unitId: 'watchtower', count: -1 }];
    expect(codes(map)).toContain('army.stack.count');
    const malformed = structuredClone(map) as unknown as Record<string, unknown>;
    (malformed.guardians as Array<Record<string, unknown>>)[0].army = [
      { unitId: 'yeoman', randomTier: 2, count: 1 },
    ];
    expect(codes(malformed)).toContain('guardian.army.random_tier.invalid');
  });

  it('serializes, parses, and runtime-converts all five special encounters', () => {
    let map = document();
    let history = EMPTY_TERRAIN_HISTORY;
    EDITOR_NON_ROSTER_UNIT_IDS.forEach((unitId, index) => {
      const placed = createGuardianPlacementEdit(map, { x: 2 + index * 2, y: 4 }, unitId);
      expect(placed.ok).toBe(true);
      if (!placed.ok) return;
      const committed = commitTerrainEdit(map, history, placed.edit);
      map = committed.document; history = committed.history;
    });
    const serialized = serializeEditorMapDocument(map);
    const parsed = parseEditorMapDocument(serialized).document!;
    expect(parsed.guardians.map((guardian) => {
      const stack = guardian.army[0];
      return 'unitId' in stack ? stack.unitId : '';
    }).sort())
      .toEqual([...EDITOR_NON_ROSTER_UNIT_IDS].sort());
    expect(parsed.guardians.every((guardian) => guardian.static)).toBe(true);
    const runtime = convertEditorMapDocument(parsed, 17, { requirePlayable: false }).map;
    const guardians = runtime.objects.filter((object) => object.kind === 'guardian');
    expect(guardians.map((guardian) => guardian.army[0].unitId).sort())
      .toEqual([...EDITOR_NON_ROSTER_UNIT_IDS].sort());
    expect(guardians.every((guardian) => guardian.kind === 'guardian'
      && guardian.static && guardian.originalArmy?.[0].count === 1)).toBe(true);
  });

  it('renders ordered accessible icon-only section 06 with all battle sprites', () => {
    const html = renderToStaticMarkup(<EditorTerrainCanvas document={document()}
      onDocumentChange={() => undefined} />);
    expect(html.indexOf('data-palette-order="5"')).toBeLessThan(
      html.indexOf('data-palette-order="6"'),
    );
    for (const label of ['06', 'Guardians', 'Search creatures']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-label="Search guardian creatures"');
    for (const tier of EDITOR_GUARDIAN_TIERS) {
      expect(html).toContain(`aria-label="Random tier ${tier} creature"`);
    }
    expect((html.match(/class="editor-guardian-choice/g) ?? [])).toHaveLength(50);
    expect((html.match(/<img src="assets\/battle-units\//g) ?? [])).toHaveLength(50);
    expect(html).not.toContain('default count 1');
    expect(html).not.toContain('explicit fallbacks');
    const source = readFileSync(resolve('src/ui/components/EditorTerrainCanvas.tsx'), 'utf8');
    expect(source).toMatch(/if \(tool === 'erase'\)[\s\S]*?if \(hero\)[\s\S]*?else if \(guardian\)/);
    expect(source).toMatch(/if \(tool === 'select'\)[\s\S]*?const hero[\s\S]*?const guardian/);
  });

  it('keeps long selected-guardian controls inside a vertically scrollable canvas column', () => {
    const css = readFileSync(resolve('src/ui/styles/map-editor.css'), 'utf8');
    expect(css).toMatch(/\.editor-canvas-column\s*\{[\s\S]*display:\s*flex[\s\S]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.editor-canvas-viewport\s*\{[\s\S]*flex:\s*1 0 320px/);
    expect(css).toMatch(/\.editor-object-inspector\s*\{[\s\S]*flex:\s*none/);
  });
});
