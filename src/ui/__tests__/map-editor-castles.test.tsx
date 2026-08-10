import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { manifestEntry } from '../../../assets/manifest';
import { BUILDINGS, buildingBelongsToFaction } from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import { SPELLS } from '../../content/spells';
import {
  EDITOR_CASTLE_VARIANTS_BY_FACTION, convertEditorMapDocument, createBlankEditorMap,
  createDefaultEditorPlayer, normalizeEditorMapDocument, serializeEditorMapDocument,
  validateEditorMapDocument, type EditorMapCastle, type EditorMapDocument,
} from '../../core/mapEditor';
import { PLAYER_IDS, type FactionId } from '../../core/types';
import { EditorCastleInspector } from '../components/EditorCastleControls';
import { EditorTerrainCanvas } from '../components/EditorTerrainCanvas';
import {
  EDITOR_CASTLE_ENTRANCE, EDITOR_CASTLE_FOOTPRINT, EDITOR_PLAYER_FLAGS,
  addEditorPlayerSlot, canPlaceEditorCastle, createCastleDeleteEdit,
  boundedEditorGuildDeck, editorGarrisonUnitChoices,
  createCastleMoveEdit, createCastlePlacementEdit, createCastleUpdateEdit,
  editorCastleCanvasGeometry, editorCastleFlagAnchor, editorCastleSpriteId,
  editorCastleVariants, nextEditorGarrisonUnit, reconcileCastleBuildingOverrides,
  removeEditorPlayerSlot, updateEditorPlayerSlot,
} from '../mapEditorCastles';
import {
  EMPTY_TERRAIN_HISTORY, commitTerrainEdit, redoTerrainEdit, undoTerrainEdit,
} from '../mapEditorTerrain';

function document(): EditorMapDocument {
  const map = createBlankEditorMap({
    id: 'castle-workbench', name: 'Castle Workbench', width: 18, height: 12,
    terrain: 'meadow', skin: 'default',
  });
  map.victory = { type: 'conquest', flavor: 'Stand.', mechanics: 'Remain standing.' };
  map.players = [createDefaultEditorPlayer('p1', 'hearthguard')];
  return map;
}

const diagnosticCodes = (map: unknown) =>
  validateEditorMapDocument(map).map((diagnostic) => diagnostic.code);

describe('editor player color slots', () => {
  it('adds, updates, serializes, undoes, and redoes all six slots in canonical order', () => {
    let current = document();
    let history = EMPTY_TERRAIN_HISTORY;
    for (let index = 1; index < 6; index += 1) {
      const added = addEditorPlayerSlot(current);
      expect(added.ok).toBe(true);
      if (!added.ok) return;
      ({ document: current, history } = commitTerrainEdit(current, history, added.edit));
    }
    expect(current.players.map((player) => player.id)).toEqual(PLAYER_IDS);
    const update = updateEditorPlayerSlot(current, 'p6', {
      controller: 'dormant', faction: 'hearthguard', name: 'Sixth banner',
    });
    expect(update).toMatchObject({ ok: true, player: { id: 'p6', controller: 'dormant',
      faction: 'hearthguard', name: 'Sixth banner' } });
    if (!update.ok) return;
    ({ document: current, history } = commitTerrainEdit(current, history, update.edit));
    const portable = JSON.parse(serializeEditorMapDocument(current));
    expect(portable.players.map((player: { id: string }) => player.id)).toEqual(PLAYER_IDS);
    expect(portable.players[5]).toMatchObject({ id: 'p6', faction: 'hearthguard' });
    const undone = undoTerrainEdit(current, history);
    expect(undone.document.players[5].faction).toBe('wildergrass');
    expect(redoTerrainEdit(undone.document, undone.history).document.players[5].name)
      .toBe('Sixth banner');
  });

  it('removes only the trailing slot, refuses dangling owners, and permits a zero-player draft', () => {
    let map = document();
    const added = addEditorPlayerSlot(map);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, added.edit).document;
    const castle = createCastlePlacementEdit(map, { x: 2, y: 2 }, 'p2', 'hagwood');
    expect(castle.ok).toBe(true);
    if (!castle.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, castle.edit).document;
    expect(removeEditorPlayerSlot(map, 'p1')).toEqual({ ok: false, reason: 'not-last' });
    expect(removeEditorPlayerSlot(map, 'p2')).toMatchObject({
      ok: false, reason: 'referenced', references: ['castle p2-hagwood-castle'],
    });
    const neutral = createCastleUpdateEdit(map, castle.castle!.id, { owner: 'neutral' });
    expect(neutral.ok).toBe(true);
    if (!neutral.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, neutral.edit).document;
    const removeP2 = removeEditorPlayerSlot(map, 'p2');
    expect(removeP2.ok).toBe(true);
    if (!removeP2.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, removeP2.edit).document;
    const removeP1 = removeEditorPlayerSlot(map, 'p1');
    expect(removeP1.ok).toBe(true);
    if (!removeP1.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, removeP1.edit).document;
    expect(map.players).toEqual([]);
    expect(diagnosticCodes(map)).toContain('playable.active_player.required');
  });

  it('never couples player faction, castle faction, or owner flag', () => {
    let map = document();
    const placed = createCastlePlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hagwood');
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placed.edit).document;
    const player = updateEditorPlayerSlot(map, 'p1', { faction: 'woundWrights' });
    expect(player.ok).toBe(true);
    if (!player.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, player.edit).document;
    expect(map.castles[0]).toMatchObject({ owner: 'p1', faction: 'hagwood' });
    const owner = createCastleUpdateEdit(map, map.castles[0].id, { owner: 'neutral' });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, owner.edit).document;
    expect(map.players[0].faction).toBe('woundWrights');
    expect(map.castles[0]).toMatchObject({ owner: 'neutral', faction: 'hagwood' });
  });
});

describe('editor castle transactions and defaults', () => {
  it('places neutral and owned mixed-faction castles without authoring duplicated defaults', () => {
    let map = document();
    const neutral = createCastlePlacementEdit(map, { x: 1, y: 1 }, 'neutral', 'vespiary');
    expect(neutral).toMatchObject({ ok: true, castle: {
      owner: 'neutral', faction: 'vespiary', position: { x: 1, y: 1 },
    } });
    if (!neutral.ok) return;
    expect(neutral.castle).not.toHaveProperty('buildings');
    expect(neutral.castle).not.toHaveProperty('garrison');
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, neutral.edit).document;
    const mixed = createCastlePlacementEdit(map, { x: 8, y: 2 }, 'p1', 'hagwood');
    expect(mixed).toMatchObject({ ok: true, castle: { owner: 'p1', faction: 'hagwood' } });
    if (!mixed.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, mixed.edit).document;
    const runtime = convertEditorMapDocument(map, 29, { requirePlayable: false }).setup.castles;
    expect(runtime[0]).toMatchObject({ owner: 'neutral', faction: 'vespiary',
      footprint: EDITOR_CASTLE_FOOTPRINT, entrance: EDITOR_CASTLE_ENTRANCE,
      buildings: ['villageHall', 'dwelling1', 'tavern'] });
    expect(runtime[1]).toMatchObject({ owner: 'p1', faction: 'hagwood' });
    expect(map.players[0].faction).toBe('hearthguard');
  });

  it('rejects occupancy and bounds, then moves/deletes/undoes/redoes atomically', () => {
    let map = document();
    map.objects.push({ id: 'road-site', kind: 'waystation', position: { x: 5, y: 4 }, properties: {} });
    expect(createCastlePlacementEdit(map, { x: 4, y: 3 }, 'p1', 'hearthguard'))
      .toEqual({ ok: false, reason: 'overlap' });
    expect(createCastlePlacementEdit(map, { x: 16, y: 2 }, 'p1', 'hearthguard'))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    const placed = createCastlePlacementEdit(map, { x: 1, y: 1 }, 'p1', 'hearthguard');
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    let committed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placed.edit);
    const moved = createCastleMoveEdit(committed.document, placed.castle!.id, { x: 10, y: 7 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    committed = commitTerrainEdit(committed.document, committed.history, moved.edit);
    expect(committed.document.castles[0].position).toEqual({ x: 10, y: 7 });
    const deleted = createCastleDeleteEdit(committed.document, placed.castle!.id);
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    const removed = commitTerrainEdit(committed.document, committed.history, deleted.edit);
    expect(removed.document.castles).toEqual([]);
    const restored = undoTerrainEdit(removed.document, removed.history);
    expect(restored.document.castles[0].position).toEqual({ x: 10, y: 7 });
    expect(redoTerrainEdit(restored.document, restored.history).document.castles).toEqual([]);
  });

  it('applies explicit initial-state overrides and resets cleanly to inherited conversion', () => {
    const map = document();
    const placed = createCastlePlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hearthguard');
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    let current = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placed.edit).document;
    const update = createCastleUpdateEdit(current, placed.castle!.id, {
      buildings: ['villageHall', 'walls'], bannedBuildings: ['marketplace'],
      available: [4, 3, 2, 1, 0, 0], garrison: [{ unitId: 'yeoman', count: 9 }],
      guildDeck: ['rally'], vault: { gold: 500, timber: 1, iron: 2, essence: 3 },
      flavor: 'A deliberately prepared opening seat.',
    });
    expect(update.ok).toBe(true);
    if (!update.ok) return;
    current = commitTerrainEdit(current, EMPTY_TERRAIN_HISTORY, update.edit).document;
    expect(convertEditorMapDocument(current, 3).setup.castles[0]).toMatchObject({
      buildings: ['villageHall', 'walls'], available: [4, 3, 2, 1, 0, 0],
      vault: { gold: 500, timber: 1, iron: 2, essence: 3 },
    });
    const reset = createCastleUpdateEdit(current, placed.castle!.id, {
      buildings: undefined, bannedBuildings: undefined, available: undefined,
      garrison: undefined, guildDeck: undefined, vault: undefined, flavor: undefined,
    });
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    current = commitTerrainEdit(current, EMPTY_TERRAIN_HISTORY, reset.edit).document;
    expect(current.castles[0]).toEqual(placed.castle);
    expect(convertEditorMapDocument(current, 3).setup.castles[0].buildings)
      .toEqual(['villageHall', 'dwelling1', 'tavern']);
  });

  it('keeps structured building, garrison, and guild edits valid by construction', () => {
    const castle: EditorMapCastle = {
      id: 'safe-form', position: { x: 1, y: 1 }, owner: 'p1',
      faction: 'hearthguard', buildings: ['villageHall', 'walls'],
      bannedBuildings: ['marketplace'],
      garrison: [{ unitId: 'yeoman' as const, count: 2 }],
    };
    expect(reconcileCastleBuildingOverrides(
      'bannedBuildings', ['walls', 'marketplace'], castle,
    )).toEqual({ bannedBuildings: ['walls', 'marketplace'], buildings: ['villageHall'] });
    expect(nextEditorGarrisonUnit(castle)).not.toBe('yeoman');
    const second = nextEditorGarrisonUnit(castle)!;
    const twoStacks = { ...castle, garrison: [...castle.garrison!, { unitId: second, count: 1 }] };
    expect(editorGarrisonUnitChoices(twoStacks, 0)).not.toContain(second);
    expect(editorGarrisonUnitChoices(twoStacks, 1)).not.toContain('yeoman');
    expect(boundedEditorGuildDeck(Object.keys(SPELLS) as Array<keyof typeof SPELLS>))
      .toHaveLength(8);
  });

  it('normalizes set-like building overrides without changing ordered guild semantics', () => {
    const map = document();
    map.castles = [{ id: 'castle', position: { x: 1, y: 1 }, owner: 'p1', faction: 'hearthguard',
      buildings: ['walls', 'villageHall'], bannedBuildings: ['shipyard', 'marketplace'],
      guildDeck: ['wither', 'rally'] }];
    const normalized = normalizeEditorMapDocument(map).castles[0];
    expect(normalized.buildings).toEqual(['villageHall', 'walls']);
    expect(normalized.bannedBuildings).toEqual(['marketplace', 'shipyard']);
    expect(normalized.guildDeck).toEqual(['wither', 'rally']);
  });
});

describe('castle validation and native editor presentation', () => {
  it('diagnoses slot, variant, state-list, resource, bounds, entrance, and overlap errors', () => {
    const map = document();
    map.players = [createDefaultEditorPlayer('p1', 'hearthguard'),
      createDefaultEditorPlayer('p1', 'woundWrights')];
    map.castles = [{
      id: 'bad-castle', position: { x: 16, y: 11 }, owner: 'p6', faction: 'hearthguard',
      footprint: { w: 2, h: 2 }, entrance: { dx: 0, dy: 0 }, variant: 'coastal',
      buildings: ['villageHall', 'villageHall', 'rendery'],
      bannedBuildings: ['villageHall'], available: [1],
      garrison: [{ unitId: 'yeoman', count: 1 }, { unitId: 'yeoman', count: 2 }],
      guildDeck: ['rally', 'rally', 'missing' as never],
      vault: { gold: -1, timber: 0, iron: 0, essence: 0 }, flavor: '',
    }, { id: 'other-castle', position: { x: 16, y: 11 }, owner: 'neutral', faction: 'hagwood' }];
    expect(diagnosticCodes(map)).toEqual(expect.arrayContaining([
      'player.slots.noncontiguous', 'player.slots.duplicate', 'reference.owner.unknown',
      'castle.footprint.noncanonical', 'castle.entrance.noncanonical',
      'entity.footprint.out_of_bounds', 'castle.variant.unknown',
      'castle.buildings.duplicate', 'castle.building.faction_mismatch',
      'castle.building.built_and_banned', 'castle.available.invalid',
      'castle.garrison.duplicate_unit', 'castle.guild.duplicate_spell',
      'catalog.spell.unknown', 'castle.vault.invalid', 'castle.flavor.invalid', 'entity.overlap',
    ]));
  });

  it('uses the canonical faction/variant table and has a native asset and flag anchor for each choice', () => {
    for (const faction of Object.keys(FACTIONS) as FactionId[]) {
      expect(editorCastleVariants(faction)).toEqual(EDITOR_CASTLE_VARIANTS_BY_FACTION[faction]);
      for (const variant of [undefined, ...editorCastleVariants(faction)]) {
        const id = editorCastleSpriteId({ faction, ...(variant ? { variant } : {}) });
        const entry = manifestEntry(id);
        expect(entry, id).toBeDefined();
        expect(entry!.flagAnchor, id).toBeDefined();
        expect(editorCastleCanvasGeometry({ x: 2, y: 3 }, entry!)).toEqual({
          x: 64 - entry!.anchor.x, y: 96 - entry!.anchor.y,
          width: entry!.w, height: entry!.h,
        });
        expect(editorCastleFlagAnchor({ x: 2, y: 3 }, entry!)).toEqual({
          x: 64 + entry!.flagAnchor!.x - entry!.anchor.x,
          y: 96 + entry!.flagAnchor!.y - entry!.anchor.y,
        });
      }
    }
    expect(Object.keys(EDITOR_PLAYER_FLAGS)).toEqual(PLAYER_IDS);
  });

  it('resets a now-incompatible explicit variant when faction changes', () => {
    const map = document();
    map.castles = [{ id: 'coast', position: { x: 1, y: 1 }, owner: 'neutral',
      faction: 'vespiary', variant: 'coastal', buildings: ['rendery', 'villageHall'],
      bannedBuildings: ['deepTunnels', 'marketplace'] }];
    const update = createCastleUpdateEdit(map, 'coast', { faction: 'hagwood' });
    expect(update).toMatchObject({ ok: true, castle: { faction: 'hagwood' } });
    if (!update.ok) return;
    expect(update.castle).not.toHaveProperty('variant');
    expect(update.castle?.buildings).toEqual(['villageHall']);
    expect(update.castle?.bannedBuildings).toEqual(['marketplace']);
    const changed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, update.edit).document;
    expect(diagnosticCodes(changed)).not.toContain('castle.variant.unknown');
    expect(manifestEntry(editorCastleSpriteId(changed.castles[0]))).toBeDefined();
  });

  it('renders ordered accessible section 04, six native color labels, and a structured inspector', () => {
    const map = document();
    for (let index = 1; index < 6; index += 1) {
      const added = addEditorPlayerSlot(map);
      if (added.ok) map.players = structuredClone(added.edit.after);
    }
    const html = renderToStaticMarkup(<EditorTerrainCanvas document={map}
      onDocumentChange={() => undefined} />);
    expect(html.indexOf('data-palette-order="3"')).toBeLessThan(
      html.indexOf('data-palette-order="4"'),
    );
    for (const label of ['Castles', 'Player color slots', 'Castle owner flag',
      'Crimson', 'Azure', 'Verdant', 'Amber', 'Violet', 'Teal', '3×2', 'entrance +1,+1']) {
      expect(html).toContain(label);
    }
    for (const faction of Object.values(FACTIONS)) {
      expect(html).toContain(`aria-label="${faction.name} castle"`);
    }
    expect((html.match(/class="editor-icon-button editor-castle-stamp/g) ?? [])).toHaveLength(6);
    const placed = createCastlePlacementEdit(map, { x: 2, y: 2 }, 'p3', 'hagwood');
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const inspector = renderToStaticMarkup(<EditorCastleInspector castle={{
      ...placed.castle!, buildings: ['villageHall'],
    }}
      document={map} onDelete={() => undefined} onUpdate={() => undefined} />);
    for (const label of ['Stable ID', 'Owner flag', 'Castle faction', 'Native variant',
      'Inherited from core', 'Buildings', 'Banned buildings', 'Available recruits', 'Garrison',
      'Guild deck', 'vault', 'Flavor', 'Reset to inherited']) expect(inspector).toContain(label);
    expect(inspector).not.toContain('{&quot;');
    expect(Object.keys(BUILDINGS).filter((id) => buildingBelongsToFaction(
      id as keyof typeof BUILDINGS, 'hagwood',
    )).every((id) => inspector.includes(`value="${id}"`))).toBe(true);
  });

  it('exposes the canonical 3×2 preflight and bottom-center entrance', () => {
    const map = document();
    expect(EDITOR_CASTLE_FOOTPRINT).toEqual({ w: 3, h: 2 });
    expect(EDITOR_CASTLE_ENTRANCE).toEqual({ dx: 1, dy: 1 });
    expect(canPlaceEditorCastle(map, { x: 15, y: 10 })).toEqual({ ok: true });
    expect(canPlaceEditorCastle(map, { x: 16, y: 10 })).toEqual({ ok: false, reason: 'out-of-bounds' });
  });
});
