import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { manifestEntry } from '../../../assets/manifest';
import { MAP_OBJECT_KINDS } from '../../content/mapObjectRegistry';
import {
  cloneEditorMapDocument, convertEditorMapDocument, createBlankEditorMap,
  parseEditorMapDocument, serializeEditorMapDocument, validateEditorMapDocument,
  type EditorMapDocument, type EditorMapObject,
} from '../../core/mapEditor';
import { REWARD_SITE_KINDS } from '../../core/mapEditor/validation';
import { mapObjectSpriteId } from '../assets';
import {
  EditorTerrainCanvas, EMPTY_EDITOR_CANVAS_SELECTION, editorSelectionAfterObjectMutation,
} from '../components/EditorTerrainCanvas';
import { createRewardCarrierPlacementEdit } from '../mapEditorRewards';
import {
  EMPTY_TERRAIN_HISTORY, commitTerrainEdit, redoTerrainEdit, undoTerrainEdit,
} from '../mapEditorTerrain';
import {
  EDITOR_REWARD_CARRIER_KINDS, EDITOR_STRUCTURE_CATALOG, EDITOR_STRUCTURE_KINDS,
  EDITOR_DIRECT_REWARD_OBJECT_KINDS,
  createStructureDeleteEdit, createStructureMoveEdit, createStructurePlacementEdit,
  createStructureUpdateEdit, createWhirlpoolPairPlacementEdit,
  canPlaceEditorStructure, defaultEditorStructureProperties, editorItemInstance,
  editorStructureEntrance, editorStructureFootprint,
  editorStructurePresentationObject,
} from '../mapEditorStructures';

function document(): EditorMapDocument {
  const map = createBlankEditorMap({
    id: 'structure-workbench', name: 'Structure Workbench', width: 20, height: 16,
    terrain: 'meadow', skin: 'default',
  });
  map.victory = { type: 'conquest', flavor: 'Remain.', mechanics: 'Outlast every rival.' };
  return map;
}

const object = (id: string, kind: EditorMapObject['kind'], x: number, y: number,
  properties = defaultEditorStructureProperties(kind as never, { x, y })): EditorMapObject => ({
  id, kind, position: { x, y }, properties,
});

describe('registered structure authoring', () => {
  it('derives the complete non-obstacle/non-guardian inventory in registry order', () => {
    const expected = MAP_OBJECT_KINDS.filter((kind) =>
      !['guardian', 'obstacle', 'rewardPickup'].includes(kind));
    expect(EDITOR_STRUCTURE_KINDS).toEqual(expected);
    expect(EDITOR_STRUCTURE_CATALOG.map((entry) => entry.kind)).toEqual(expected);
    expect([...EDITOR_REWARD_CARRIER_KINDS]).toEqual(REWARD_SITE_KINDS);
    expect(new Set(EDITOR_STRUCTURE_CATALOG.map((entry) => entry.group))).toEqual(new Set([
      'Economy & capture', 'Learning & recruiting', 'Visits & services',
      'Guarded sites', 'Information & topology', 'Pickups & water',
    ]));
  });

  it('diagnoses missing rewards, nonreciprocal pairs, and Cache stone cardinality directly', () => {
    const map = document();
    map.objects = [
      object('unrewarded-site', 'lock', 2, 2, { name: 'Site', tell: 'Tell' }),
      object('pair-a', 'whirlpool', 4, 2, { pairedId: 'pair-b' }),
      object('pair-b', 'whirlpool', 5, 2, { pairedId: 'pair-b' }),
      object('cache', 'cache', 7, 2),
      object('stone-a', 'patientStone', 8, 2, { cacheId: 'cache' }),
      object('stone-b', 'patientStone', 9, 2, { cacheId: 'cache' }),
    ];
    const diagnostics = validateEditorMapDocument(map);
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'reference.reward_site.required',
        target: expect.objectContaining({ entityId: 'unrewarded-site' }) }),
      expect.objectContaining({ code: 'reference.whirlpool_pair.nonreciprocal' }),
      expect.objectContaining({ code: 'reference.cache.stone_count',
        message: expect.stringContaining('found 2') }),
    ]));
  });

  it('renders section 03 after terrain/props with accessible registry options', () => {
    const html = renderToStaticMarkup(<EditorTerrainCanvas document={document()}
      onDocumentChange={() => undefined} />);
    expect(html.indexOf('data-palette-order="1"')).toBeLessThan(html.indexOf('data-palette-order="2"'));
    expect(html.indexOf('data-palette-order="2"')).toBeLessThan(html.indexOf('data-palette-order="3"'));
    expect(html).toContain('aria-label="Registered map objects"');
    expect(html).toContain('Structures &amp; map objects');
    for (const entry of EDITOR_STRUCTURE_CATALOG) {
      if (entry.kind !== 'mine') {
        expect(html, entry.kind).toContain(`aria-label="${entry.label.replace('&', '&amp;')}"`);
      }
    }
    for (const resource of ['Gold', 'Timber', 'Iron', 'Essence']) {
      expect(html).toContain(`aria-label="${resource} mine"`);
    }
    expect((html.match(/class="editor-icon-button/g) ?? []).length)
      .toBeGreaterThanOrEqual(EDITOR_STRUCTURE_CATALOG.length + 3);
  });

  it('authors each direct mine stamp with its selected resource and canonical income', () => {
    const expected = { gold: 1_000, timber: 2, iron: 1, essence: 1 } as const;
    for (const [resource, income] of Object.entries(expected)) {
      const placed = createStructurePlacementEdit(
        document(), 'mine', { x: 2, y: 3 }, { mineResource: resource as keyof typeof expected },
      );
      expect(placed.ok, resource).toBe(true);
      if (!placed.ok || !placed.object) continue;
      expect(placed.object).toMatchObject({
        kind: 'mine', footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 },
        properties: { resource, income, owner: null },
      });
      expect(editorSelectionAfterObjectMutation(placed, document(), 'leave-unselected'))
        .toEqual(EMPTY_EDITOR_CANVAS_SELECTION);
    }
  });

  it('places every safe standalone kind with catalog-derived defaults and native runtime sprites', () => {
    const excluded = new Set([
      ...EDITOR_REWARD_CARRIER_KINDS, ...EDITOR_DIRECT_REWARD_OBJECT_KINDS,
      'whirlpool', 'patientStone',
    ]);
    for (const [index, kind] of EDITOR_STRUCTURE_KINDS.filter((entry) => !excluded.has(entry)).entries()) {
      const map = document();
      const position = { x: index % 15, y: Math.floor(index / 15) + 2 };
      const result = createStructurePlacementEdit(map, kind as Exclude<typeof kind, 'whirlpool'>, position);
      expect(result, kind).toMatchObject({ ok: true });
      if (!result.ok || !result.object) continue;
      expect(manifestEntry(mapObjectSpriteId(editorStructurePresentationObject(result.object))), kind)
        .toBeDefined();
      const changed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, result.edit).document;
      expect(validateEditorMapDocument(changed).filter((diagnostic) =>
        diagnostic.target.kind === 'entity' && diagnostic.target.entityId === result.object?.id), kind)
        .toEqual([]);
    }
  });

  it('keeps structure, mine, paired, and reward-carrier stamps unselected until inspection', () => {
    const map = document();
    const mine = createStructurePlacementEdit(map, 'mine', { x: 2, y: 3 });
    expect(mine.ok).toBe(true);
    if (!mine.ok || !mine.object) return;
    expect(editorSelectionAfterObjectMutation(mine, map, 'leave-unselected'))
      .toEqual(EMPTY_EDITOR_CANVAS_SELECTION);
    expect(editorSelectionAfterObjectMutation(mine, map, 'inspect-result')).toMatchObject({
      objectId: mine.object.id,
    });

    const pair = createWhirlpoolPairPlacementEdit(map, { x: 7, y: 3 }, { x: 12, y: 3 });
    expect(pair.ok).toBe(true);
    if (!pair.ok) return;
    expect(editorSelectionAfterObjectMutation(pair, map, 'leave-unselected'))
      .toEqual(EMPTY_EDITOR_CANVAS_SELECTION);

    const carrier = createRewardCarrierPlacementEdit(map, REWARD_SITE_KINDS[0], { x: 5, y: 8 });
    expect(carrier.ok).toBe(true);
    if (!carrier.ok) return;
    expect(editorSelectionAfterObjectMutation(carrier, map, 'leave-unselected'))
      .toEqual(EMPTY_EDITOR_CANVAS_SELECTION);
    expect(editorSelectionAfterObjectMutation(carrier, map, 'inspect-result')).toMatchObject({
      objectId: carrier.object.id,
      rewardId: carrier.reward.id,
    });
  });

  it('shows reward carriers but rejects unlinked creation without mutation', () => {
    for (const kind of EDITOR_REWARD_CARRIER_KINDS) {
      const map = document();
      const before = cloneEditorMapDocument(map);
      expect(createStructurePlacementEdit(map, kind as Exclude<typeof kind, 'whirlpool'>, { x: 4, y: 4 }))
        .toEqual({ ok: false, reason: 'requires-linked-reward' });
      expect(map).toEqual(before);
    }
  });

  it('routes new pile/item pickups through portable rewards instead of standalone objects', () => {
    for (const kind of EDITOR_DIRECT_REWARD_OBJECT_KINDS) {
      const map = document();
      const before = cloneEditorMapDocument(map);
      expect(createStructurePlacementEdit(map, kind, { x: 4, y: 4 }))
        .toEqual({ ok: false, reason: 'requires-dedicated-reward' });
      expect(map).toEqual(before);
    }
  });

  it('creates, moves, deletes, undoes, and redoes reciprocal whirlpools atomically', () => {
    const map = document();
    const placement = createWhirlpoolPairPlacementEdit(map, { x: 2, y: 3 }, { x: 12, y: 9 });
    expect(placement.ok).toBe(true);
    if (!placement.ok) return;
    let committed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placement.edit);
    expect(committed.document.objects).toHaveLength(2);
    const [a, b] = committed.document.objects;
    expect(a.properties.pairedId).toBe(b.id);
    expect(b.properties.pairedId).toBe(a.id);
    expect(validateEditorMapDocument(committed.document).map((item) => item.code))
      .not.toContain('reference.whirlpool_pair.nonreciprocal');

    const moved = createStructureMoveEdit(committed.document, a.id, { x: 5, y: 5 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    committed = commitTerrainEdit(committed.document, committed.history, moved.edit);
    expect(committed.document.objects.find((entry) => entry.id === a.id)?.position)
      .toEqual({ x: 5, y: 5 });

    const removed = createStructureDeleteEdit(committed.document, a.id);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    const deleted = commitTerrainEdit(committed.document, committed.history, removed.edit);
    expect(deleted.document.objects).toEqual([]);
    const undone = undoTerrainEdit(deleted.document, deleted.history);
    expect(undone.document.objects).toHaveLength(2);
    expect(redoTerrainEdit(undone.document, undone.history).document.objects).toEqual([]);
  });

  it('rejects overlap/out-of-bounds without mutation, including nonblocking Cache movement', () => {
    const map = document();
    map.objects = [object('existing', 'waystation', 3, 3), object('cache', 'cache', 7, 7)];
    map.objects.push({ ...object('wide-bridge', 'bridge', 15, 4, { opens: [{ x: 15, y: 4 }] }),
      footprint: { w: 2, h: 1 }, entrance: { dx: 1, dy: 0 } });
    const before = structuredClone(map);
    expect(createStructurePlacementEdit(map, 'mine', { x: 3, y: 3 }))
      .toEqual({ ok: false, reason: 'overlap' });
    expect(createStructurePlacementEdit(map, 'mine', { x: 19, y: 2 }))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(createStructureMoveEdit(map, 'cache', { x: -1, y: 3 }))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(createStructureMoveEdit(map, 'wide-bridge', { x: 19, y: 4 }))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(canPlaceEditorStructure(map, 'cache', { x: 3, y: 3 }, 'cache')).toEqual({ ok: true });
    expect(map).toEqual(before);
  });

  it('keeps generic Spell Scroll selections as complete canonical item instances', () => {
    expect(editorItemInstance('spellScroll')).toMatchObject({
      id: 'spellScroll', storedSpellId: expect.any(String), plus: false,
    });
  });

  it('requires an existing Cache for Patient Stones and exposes canonical footprint/entrance', () => {
    const map = document();
    expect(createStructurePlacementEdit(map, 'patientStone', { x: 4, y: 4 }))
      .toEqual({ ok: false, reason: 'missing-link' });
    map.objects.push(object('secret-cache', 'cache', 8, 8));
    const stone = createStructurePlacementEdit(map, 'patientStone', { x: 4, y: 4 });
    expect(stone).toMatchObject({ ok: true, object: { properties: { cacheId: 'secret-cache' } } });
    const mine = object('mine', 'mine', 1, 1, { resource: 'gold', income: 1000, owner: null });
    expect(editorStructureFootprint(mine)).toEqual({ w: 2, h: 1 });
    expect(editorStructureEntrance(mine)).toEqual({ dx: 0, dy: 0 });
  });

  it('renames references transactionally and rejects global ID collisions/objective deletion', () => {
    const map = document();
    map.objects = [
      object('site', 'lock', 5, 5, { name: 'Site', tell: 'Tell' }),
      object('pair-a', 'whirlpool', 8, 5, { pairedId: 'pair-b' }),
      object('pair-b', 'whirlpool', 9, 5, { pairedId: 'pair-a' }),
      object('cache', 'cache', 10, 5), object('stone', 'patientStone', 11, 5, { cacheId: 'cache' }),
    ];
    map.guardians = [{ id: 'guard', position: { x: 5, y: 4 }, army: [{ unitId: 'yeoman', count: 1 }],
      split: false, static: true, protects: 'site', drop: null },
    { id: 'reward-guard', position: { x: 6, y: 4 }, army: [{ unitId: 'tinSoldier', count: 1 }],
      split: false, static: true, protects: 'reward', drop: null }];
    map.rewards = [{ id: 'reward', delivery: { kind: 'site', objectId: 'site' },
      bundle: { artifacts: [], items: [], resources: { gold: 1 }, teachesSpell: null } }];
    map.victory = { type: 'hold', objectId: 'site', days: 2, flavor: 'Hold.', mechanics: 'Hold it.' };

    expect(createStructureUpdateEdit(map, 'site', { id: 'guard' }))
      .toEqual({ ok: false, reason: 'invalid-id' });
    const renamed = createStructureUpdateEdit(map, 'site', { id: 'new-site' });
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    const changed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, renamed.edit).document;
    expect(changed.guardians[0].protects).toBe('new-site');
    expect(changed.rewards[0].delivery).toEqual({ kind: 'site', objectId: 'new-site' });
    expect(changed.victory).toMatchObject({ objectId: 'new-site' });
    expect(createStructureDeleteEdit(changed, 'new-site'))
      .toEqual({ ok: false, reason: 'referenced-objective' });

    changed.victory = { type: 'conquest', flavor: 'Win.', mechanics: 'Conquer.' };
    const deletion = createStructureDeleteEdit(changed, 'new-site');
    expect(deletion.ok).toBe(true);
    if (!deletion.ok) return;
    const deleted = commitTerrainEdit(changed, EMPTY_TERRAIN_HISTORY, deletion.edit);
    expect(deleted.document.guardians[0].protects).toBeNull();
    expect(deleted.document.guardians[1].protects).toBeNull();
    expect(deleted.document.rewards).toEqual([]);
    const restored = undoTerrainEdit(deleted.document, deleted.history).document;
    expect(restored.guardians[0].protects).toBe('new-site');
    expect(restored.guardians[1].protects).toBe('reward');
    expect(restored.rewards[0].delivery).toEqual({ kind: 'site', objectId: 'new-site' });
  });

  it('survives portable serialization and runtime conversion with authored defaults only', () => {
    const map = document();
    const mine = createStructurePlacementEdit(map, 'mine', { x: 3, y: 4 });
    expect(mine.ok).toBe(true);
    if (!mine.ok) return;
    const pairMap = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, mine.edit).document;
    const pair = createWhirlpoolPairPlacementEdit(pairMap, { x: 8, y: 8 }, { x: 14, y: 8 });
    expect(pair.ok).toBe(true);
    if (!pair.ok) return;
    const authored = commitTerrainEdit(pairMap, EMPTY_TERRAIN_HISTORY, pair.edit).document;
    const serialized = serializeEditorMapDocument(authored);
    const parsed = parseEditorMapDocument(serialized);
    expect(parsed.document).not.toBeNull();
    expect(serializeEditorMapDocument(parsed.document!)).toBe(serialized);
    const runtime = convertEditorMapDocument(parsed.document!, 17, { requirePlayable: false }).map;
    expect(runtime.objects.find((entry) => entry.kind === 'mine')).toMatchObject({
      footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 },
      resource: 'gold', income: 1000, owner: null, cleared: false,
    });
    expect(runtime.objects.filter((entry) => entry.kind === 'whirlpool')).toHaveLength(2);
  });
});
