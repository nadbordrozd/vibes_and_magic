import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ARTIFACTS } from '../../content/artifacts';
import { ITEMS } from '../../content/items';
import { MAP_OBJECT_KINDS, RUNTIME_ONLY_MAP_OBJECT_KINDS } from '../../content/mapObjectRegistry';
import { SCROLL_SPELL_IDS, SPELLS } from '../../content/spells';
import {
  adaptRuntimeMapToEditorDocument, convertEditorMapDocument, createBlankEditorMap,
  createDefaultEditorGuardian, validateEditorMapDocument, type EditorMapDocument,
} from '../../core/mapEditor';
import { REWARD_SITE_KINDS } from '../../core/mapEditor/validation';
import { EditorTerrainCanvas } from '../components/EditorTerrainCanvas';
import {
  EDITOR_ARTIFACT_CATALOG, EDITOR_ARTIFACT_GROUPS, EDITOR_ITEM_CATALOG,
  EDITOR_ITEM_GROUPS, EDITOR_RESOURCE_IDS, EDITOR_TAUGHT_SPELL_GROUPS,
  artifactRewardBundle, createDefaultEditorArtifactInstance,
  createDefaultEditorItemInstance, createDirectRewardPlacementEdit,
  createOverlayStrokeEdit, createRewardCarrierPlacementEdit, createRewardDeleteEdit,
  createRewardMoveEdit, createRewardUpdateEdit, itemRewardBundle, resourceRewardBundle,
  spellRewardBundle,
} from '../mapEditorRewards';
import {
  EMPTY_TERRAIN_HISTORY, commitTerrainEdit, redoTerrainEdit, undoTerrainEdit,
} from '../mapEditorTerrain';
import {
  EDITOR_DEDICATED_REWARD_KINDS, EDITOR_DIRECT_REWARD_OBJECT_KINDS,
  EDITOR_REWARD_CARRIER_KINDS, EDITOR_STRUCTURE_KINDS,
} from '../mapEditorStructures';

function document(): EditorMapDocument {
  const map = createBlankEditorMap({
    id: 'reward-workbench', name: 'Reward Workbench', width: 20, height: 16,
    terrain: 'meadow', skin: 'default',
  });
  map.victory = { type: 'conquest', flavor: 'Remain.', mechanics: 'Outlast every rival.' };
  return map;
}

describe('portable map rewards and remaining palettes', () => {
  it('routes every canonical catalog entry exactly once with explicit rendering disposition', () => {
    expect(new Set(EDITOR_ARTIFACT_CATALOG.map((entry) => entry.artifact.id)))
      .toEqual(new Set(Object.keys(ARTIFACTS)));
    expect(EDITOR_ARTIFACT_CATALOG).toHaveLength(Object.keys(ARTIFACTS).length);
    expect(EDITOR_ARTIFACT_GROUPS.flatMap((group) => group.entries))
      .toHaveLength(Object.keys(ARTIFACTS).length);
    expect(EDITOR_ARTIFACT_CATALOG.every((entry) =>
      entry.rendering === 'native' || entry.rendering === 'fallback')).toBe(true);
    expect(EDITOR_ARTIFACT_CATALOG.every((entry) => Boolean(entry.renderingReason))).toBe(true);

    expect(new Set(EDITOR_ITEM_CATALOG.map((entry) => entry.item.id)))
      .toEqual(new Set(Object.keys(ITEMS)));
    expect(EDITOR_ITEM_CATALOG).toHaveLength(Object.keys(ITEMS).length);
    expect(EDITOR_ITEM_GROUPS.flatMap((group) => group.entries))
      .toHaveLength(Object.keys(ITEMS).length);
    expect(new Set(EDITOR_TAUGHT_SPELL_GROUPS.flatMap((group) =>
      group.entries.map((spell) => spell.id)))).toEqual(new Set(Object.keys(SPELLS)));
    expect(EDITOR_RESOURCE_IDS).toEqual(['gold', 'timber', 'iron', 'essence']);
    expect([...EDITOR_REWARD_CARRIER_KINDS]).toEqual(REWARD_SITE_KINDS);
    expect(EDITOR_DEDICATED_REWARD_KINDS).toEqual(new Set([
      ...REWARD_SITE_KINDS, ...EDITOR_DIRECT_REWARD_OBJECT_KINDS,
    ]));
    expect(EDITOR_STRUCTURE_KINDS).toEqual(MAP_OBJECT_KINDS.filter((kind) =>
      kind !== 'guardian' && kind !== 'obstacle'
      && !RUNTIME_ONLY_MAP_OBJECT_KINDS.includes(kind as never)));
  });

  it('constructs safe special artifact/item instances from one shared helper', () => {
    expect(createDefaultEditorArtifactInstance('seamstone'))
      .toEqual({ id: 'seamstone', chosenSchool: 'rite' });
    expect(createDefaultEditorArtifactInstance('travelersCloak'))
      .toEqual({ id: 'travelersCloak' });
    expect(createDefaultEditorItemInstance('spellScroll', { x: 3, y: 4 }))
      .toEqual({ id: 'spellScroll', plus: false, storedSpellId: SCROLL_SPELL_IDS[0] });
    expect(createDefaultEditorItemInstance('scrollRally')).toEqual({ id: 'scrollRally', plus: false });
    expect(createDefaultEditorItemInstance('tradeGoods', { x: 3, y: 4 }))
      .toEqual({ id: 'tradeGoods', origin: { x: 3, y: 4 } });
    for (const item of Object.values(ITEMS)) {
      const instance = createDefaultEditorItemInstance(item.id, { x: 2, y: 1 });
      if (item.behavior === 'scroll') expect(instance.plus, item.id).toBe(false);
      if (item.id === 'spellScroll') expect(instance.storedSpellId).toBeTruthy();
      if (item.id === 'tradeGoods') expect(instance.origin).toEqual({ x: 2, y: 1 });
    }
  });

  it('rejects malformed instance-specific state before an edit can enter history', () => {
    const invalidBundles = [
      { ...artifactRewardBundle('seamstone'), artifacts: [{ id: 'seamstone', chosenSchool: 'wrong' }] },
      { ...artifactRewardBundle('travelersCloak'), artifacts: [{ id: 'travelersCloak', chosenSchool: 'rite' }] },
      { ...itemRewardBundle('waybread', { x: 0, y: 0 }), items: [{ id: 'waybread', plus: true }] },
      { ...itemRewardBundle('scrollRally', { x: 0, y: 0 }), items: [{ id: 'scrollRally', storedSpellId: 'ward' }] },
      { ...itemRewardBundle('waybread', { x: 0, y: 0 }), items: [{ id: 'waybread', origin: { x: 1, y: 1 } }] },
      { ...itemRewardBundle('spellScroll', { x: 0, y: 0 }), items: [{ id: 'spellScroll', plus: false }] },
    ];
    for (const [index, bundle] of invalidBundles.entries()) {
      const map = document();
      expect(createDirectRewardPlacementEdit(
        map, { x: 4, y: 4 }, bundle as never, `Invalid ${index}`,
      )).toEqual({ ok: false, reason: 'invalid-bundle' });
      expect(map.rewards).toEqual([]);
    }
    const map = document();
    const valid = createDirectRewardPlacementEdit(
      map, { x: 4, y: 4 }, itemRewardBundle('spellScroll', { x: 4, y: 4 }), 'Scroll',
    );
    expect(valid.ok).toBe(true);
    if (!valid.ok || !valid.reward) return;
    const changed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, valid.edit).document;
    expect(createRewardUpdateEdit(changed, valid.reward.id, {
      bundle: { ...valid.reward.bundle, items: [{ id: 'spellScroll', plus: false,
        storedSpellId: 'missing-spell' }] },
    })).toEqual({ ok: false, reason: 'invalid-bundle' });
  });

  it('preserves legitimate imported instance state on unrelated reward edits', () => {
    const map = document();
    map.rewards = [{
      id: 'imported-state', delivery: { kind: 'pickup', position: { x: 3, y: 3 } },
      bundle: {
        artifacts: [{ id: 'seamstone', chosenSchool: 'grave' }],
        items: [{ id: 'spellScroll', storedSpellId: 'graveSpeech', plus: true },
          { id: 'tradeGoods', origin: { x: 11, y: 12 } }],
        resources: {}, teachesSpell: null,
      },
    }];
    const result = createRewardUpdateEdit(map, 'imported-state', { id: 'renamed-import' });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.reward) return;
    expect(result.reward.bundle).toEqual(map.rewards[0].bundle);
  });

  it('lowers a mixed direct bundle to one runtime pickup and re-adapts losslessly', () => {
    const map = document();
    map.rewards = [{
      id: 'mixed-reward', delivery: { kind: 'pickup', position: { x: 10, y: 8 } },
      bundle: {
        artifacts: [{ id: 'seamstone', chosenSchool: 'wild' }],
        items: [{ id: 'spellScroll', storedSpellId: SCROLL_SPELL_IDS[1], plus: true },
          { id: 'tradeGoods', origin: { x: 10, y: 8 } }],
        resources: { gold: 333, timber: 4, iron: 5, essence: 6 },
        teachesSpell: 'rally',
      },
    }];
    map.guardians = [{
      ...createDefaultEditorGuardian('mixed-guard', { x: 9, y: 8 }, 'yeoman'),
      protects: 'mixed-reward',
    }];
    expect(validateEditorMapDocument(map).filter((diagnostic) =>
      diagnostic.stage !== 'playable')).toEqual([]);
    const runtime = convertEditorMapDocument(map, 41, { requirePlayable: false }).map;
    expect(runtime.objects.find((object) => object.id === 'mixed-reward')).toMatchObject({
      kind: 'rewardPickup', position: { x: 10, y: 8 }, collected: false,
      reward: { gold: 333, timber: 4, iron: 5, essence: 6, teachesSpell: 'rally' },
      guardedBy: ['mixed-guard'],
    });
    expect(runtime.objects.find((object) => object.id === 'mixed-guard'))
      .toMatchObject({ kind: 'guardian', protects: 'mixed-reward' });
    expect(adaptRuntimeMapToEditorDocument(runtime, { source: map.source })).toEqual(map);
  });

  it('round-trips site bundles while preserving authoring reward links through runtime carriers', () => {
    const map = document();
    const carrier = createRewardCarrierPlacementEdit(map, 'lock', { x: 8, y: 7 });
    expect(carrier.ok).toBe(true);
    if (!carrier.ok) return;
    let committed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, carrier.edit);
    const rewardId = carrier.reward.id;
    committed.document.guardians = [{
      ...createDefaultEditorGuardian('site-guard', { x: 7, y: 7 }, 'yeoman'),
      protects: rewardId,
    }];
    const updated = createRewardUpdateEdit(committed.document, rewardId, {
      bundle: {
        artifacts: [{ id: 'travelersCloak' }], items: [{ id: 'waybread' }],
        resources: { timber: 3, iron: 2 }, teachesSpell: 'ward',
      },
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    committed = commitTerrainEdit(committed.document, committed.history, updated.edit);
    const runtime = convertEditorMapDocument(
      committed.document, 42, { requirePlayable: false },
    ).map;
    expect(runtime.objects.find((object) => object.id === carrier.object.id)).toMatchObject({
      reward: { timber: 3, iron: 2, teachesSpell: 'ward' }, guardedBy: ['site-guard'],
    });
    expect(runtime.objects.find((object) => object.id === 'site-guard'))
      .toMatchObject({ protects: carrier.object.id });
    expect(adaptRuntimeMapToEditorDocument(runtime, { source: committed.document.source }))
      .toEqual(committed.document);
  });

  it('creates every carrier with a valid reward atomically, including a complete Cache workflow', () => {
    for (const [index, kind] of REWARD_SITE_KINDS.entries()) {
      const map = document();
      const result = createRewardCarrierPlacementEdit(map, kind, { x: 10, y: 8 });
      expect(result.ok, kind).toBe(true);
      if (!result.ok) continue;
      const changed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, result.edit).document;
      expect(changed.rewards).toContainEqual(result.reward);
      expect(changed.objects).toContainEqual(result.object);
      if (kind === 'cache') expect(changed.objects.filter((object) =>
        object.kind === 'patientStone' && object.properties.cacheId === result.object.id)).toHaveLength(3);
      expect(validateEditorMapDocument(changed).filter((diagnostic) =>
        diagnostic.stage !== 'playable'), `${index}:${kind}`).toEqual([]);
    }
  });

  it('moves, renames, deletes, undoes, and redoes direct rewards with guardian cascades', () => {
    const map = document();
    const placement = createDirectRewardPlacementEdit(
      map, { x: 4, y: 5 }, itemRewardBundle('tradeGoods', { x: 0, y: 0 }), 'Goods',
    );
    expect(placement.ok).toBe(true);
    if (!placement.ok || !placement.reward) return;
    let committed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placement.edit);
    expect(committed.document.rewards[0].bundle.items[0].origin).toEqual({ x: 4, y: 5 });
    committed.document.guardians = [{
      ...createDefaultEditorGuardian('reward-guard', { x: 3, y: 5 }, 'yeoman'),
      protects: placement.reward.id,
    }];
    const renamed = createRewardUpdateEdit(committed.document, placement.reward.id, { id: 'renamed-goods' });
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    committed = commitTerrainEdit(committed.document, committed.history, renamed.edit);
    expect(committed.document.guardians[0].protects).toBe('renamed-goods');
    const moved = createRewardMoveEdit(committed.document, 'renamed-goods', { x: 6, y: 6 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    committed = commitTerrainEdit(committed.document, committed.history, moved.edit);
    expect(committed.document.rewards[0].delivery).toEqual({ kind: 'pickup', position: { x: 6, y: 6 } });
    const undone = undoTerrainEdit(committed.document, committed.history);
    expect(undone.document.rewards[0].delivery).toEqual({ kind: 'pickup', position: { x: 4, y: 5 } });
    expect(redoTerrainEdit(undone.document, undone.history).document.rewards[0].delivery)
      .toEqual({ kind: 'pickup', position: { x: 6, y: 6 } });
    const removed = createRewardDeleteEdit(committed.document, 'renamed-goods');
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    const deleted = commitTerrainEdit(committed.document, committed.history, removed.edit);
    expect(deleted.document.rewards).toEqual([]);
    expect(deleted.document.guardians[0].protects).toBeNull();
  });

  it('edits overlays transactionally without changing terrain', () => {
    const map = document();
    const tiles = structuredClone(map.tiles);
    let committed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY,
      createOverlayStrokeEdit(map, 'roads', [{ x: 1, y: 1 }, { x: 2, y: 1 }]));
    expect(committed.document.overlays.roads).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }]);
    expect(committed.document.tiles).toEqual(tiles);
    committed = commitTerrainEdit(committed.document, committed.history,
      createOverlayStrokeEdit(committed.document, 'seams', [{ x: 3, y: 2 }]));
    expect(committed.document.overlays.seams).toEqual([{ x: 3, y: 2 }]);
    expect(undoTerrainEdit(committed.document, committed.history).document.overlays.seams).toEqual([]);
  });

  it('renders ordered searchable accessible palettes and clear dedicated-workflow reasons', () => {
    const html = renderToStaticMarkup(<EditorTerrainCanvas document={document()}
      onDocumentChange={() => undefined} />);
    for (let order = 6; order < 9; order += 1) {
      expect(html.indexOf(`data-palette-order="${order}"`))
        .toBeLessThan(html.indexOf(`data-palette-order="${order + 1}"`));
    }
    expect(html).toContain('aria-label="Search artifacts"');
    expect(html).toContain('aria-label="Search consumables and items"');
    expect(html).toContain('Canonical artifacts');
    expect(html).toContain('Canonical consumables and items');
    expect(html).toContain('class="editor-artifact-icon');
    expect(html).toContain('assets/items/waybread.png');
    expect(html).toContain('assets/map-objects/pile-gold.png');
    expect(html).toContain('assets/icons/spells/rally.png');
    expect(html).toContain('aria-label="Road overlay"');
  });

  it('constructs each shortcut bundle as nonempty portable data', () => {
    expect(artifactRewardBundle('travelersCloak').artifacts).toHaveLength(1);
    expect(resourceRewardBundle('essence', 7).resources).toEqual({ essence: 7 });
    expect(spellRewardBundle('rally').teachesSpell).toBe('rally');
  });
});
