import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { manifestEntry } from '../../../assets/manifest';
import { FACTIONS } from '../../content/factions';
import { FACTION_HEROES, HEROES } from '../../content/heroes';
import { UNITS } from '../../content/units';
import {
  convertEditorMapDocument, createBlankEditorMap, createDefaultEditorPlayer,
  EDITOR_NON_ROSTER_UNIT_IDS,
  parseEditorMapDocument, serializeEditorMapDocument, validateEditorMapDocument,
  type EditorMapDocument,
} from '../../core/mapEditor';
import type { FactionId, PlayerId } from '../../core/types';
import { EditorHeroInspector } from '../components/EditorHeroControls';
import { EditorTerrainCanvas } from '../components/EditorTerrainCanvas';
import { CAMPAIGN_PRESENTATIONS } from '../campaignPresentation';
import { cloneBuiltInMapForEditor } from '../mapEditorLibrary';
import {
  EDITOR_PLAYER_FLAGS, createCastleMoveEdit, createCastlePlacementEdit,
  createCastleUpdateEdit,
} from '../mapEditorCastles';
import {
  EDITOR_HERO_FOOTPRINT, canPlaceEditorHero, createHeroDeleteEdit,
  createHeroMoveEdit, createHeroPlacementEdit, createHeroUpdateEdit,
  editorHeroCanvasGeometry, editorHeroDefinitions, editorHeroFlagAnchor,
  editorHeroSpriteId, editorHeroUnitChoices, safeEditorHeroArmy,
} from '../mapEditorHeroes';
import {
  EMPTY_TERRAIN_HISTORY, commitTerrainEdit, redoTerrainEdit, undoTerrainEdit,
} from '../mapEditorTerrain';

const factions = Object.keys(FACTIONS) as FactionId[];

function document(players = 2): EditorMapDocument {
  const map = createBlankEditorMap({
    id: 'hero-workbench', name: 'Hero Workbench', width: 18, height: 12,
    terrain: 'meadow', skin: 'default',
  });
  map.victory = { type: 'conquest', flavor: 'Stand.', mechanics: 'Outlast every rival.' };
  map.players = Array.from({ length: players }, (_, index) => createDefaultEditorPlayer(
    `p${index + 1}` as PlayerId, factions[index], index ? 'ai' : 'human',
  ));
  return map;
}

const codes = (map: unknown) => validateEditorMapDocument(map).map((item) => item.code);

describe('editor hero catalog choices and defaults', () => {
  it('exposes every canonical faction and all six compatible named heroes', () => {
    expect(factions).toHaveLength(6);
    for (const faction of factions) {
      expect(editorHeroDefinitions(faction).map((hero) => hero.id)).toEqual(FACTION_HEROES[faction]);
      expect(editorHeroDefinitions(faction)).toHaveLength(6);
      expect(editorHeroDefinitions(faction).every((hero) => hero.faction === faction)).toBe(true);
    }
    expect(new Set(factions.flatMap((faction) => editorHeroDefinitions(faction).map((hero) => hero.id))))
      .toEqual(new Set(Object.keys(HEROES)));
  });

  it('places every faction through the core default path with its exact small hire army', () => {
    for (const faction of factions) {
      const map = document();
      const result = createHeroPlacementEdit(
        map, { x: 2, y: 2 }, 'p1', faction, FACTION_HEROES[faction][2],
      );
      expect(result).toMatchObject({ ok: true, hero: {
        owner: 'p1', faction, definitionId: FACTION_HEROES[faction][2],
        position: { x: 2, y: 2 }, army: FACTIONS[faction].hireArmy,
      } });
      if (!result.ok) continue;
      expect(result.hero!.army).not.toBe(FACTIONS[faction].hireArmy);
      expect(result.hero!.army.length).toBeGreaterThan(0);
      expect(result.hero!.army.length).toBeLessThanOrEqual(7);
      expect(result.hero!.army.every((stack) => stack.count > 0)).toBe(true);
    }
  });

  it('keeps owner color, slot faction, hero faction, and definition independent', () => {
    const map = document();
    map.players[0].faction = 'woundWrights';
    const result = createHeroPlacementEdit(map, { x: 4, y: 3 }, 'p1', 'hagwood', 'oldMarta');
    expect(result).toMatchObject({ ok: true, hero: {
      owner: 'p1', faction: 'hagwood', definitionId: 'oldMarta',
    } });
    expect(map.players[0].faction).toBe('woundWrights');
    expect(EDITOR_PLAYER_FLAGS.p1.label).toBe('Crimson');
  });

  it('does not impose a noncanonical unique named-start rule', () => {
    let map = document();
    const first = createHeroPlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hearthguard', 'aldith');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, first.edit).document;
    const second = createHeroPlacementEdit(map, { x: 3, y: 2 }, 'p2', 'hearthguard', 'aldith');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, second.edit).document;
    expect(map.heroes.map((hero) => hero.definitionId)).toEqual(['aldith', 'aldith']);
    expect(codes(map)).not.toContain('hero.definition.duplicate');
  });
});

describe('editor hero transactions and safe inspector edits', () => {
  it('disables/refuses placement without player slots and gives a clear UI reason', () => {
    const map = document(0);
    expect(createHeroPlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hearthguard', 'aldith'))
      .toEqual({ ok: false, reason: 'no-player' });
    const html = renderToStaticMarkup(<EditorTerrainCanvas document={map}
      onDocumentChange={() => undefined} />);
    expect(html).toContain('Placement disabled: add at least one player slot in Cities first.');
    expect(html).toContain('No player slots available');
    expect(html).toContain('Add at least one player slot before placing a starting hero.');
  });

  it('places, offset-moves, deletes, undoes, redoes, and rejects bounds/occupancy', () => {
    let map = document();
    map.objects.push({ id: 'occupied', kind: 'waystation', position: { x: 4, y: 4 }, properties: {} });
    expect(createHeroPlacementEdit(map, { x: 4, y: 4 }, 'p1', 'hearthguard', 'aldith'))
      .toEqual({ ok: false, reason: 'overlap' });
    expect(createHeroPlacementEdit(map, { x: 18, y: 4 }, 'p1', 'hearthguard', 'aldith'))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    const placed = createHeroPlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hearthguard', 'aldith');
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    let committed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placed.edit);
    const moved = createHeroMoveEdit(committed.document, placed.hero!.id, { x: 9, y: 7 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    committed = commitTerrainEdit(committed.document, committed.history, moved.edit);
    expect(committed.document.heroes[0].position).toEqual({ x: 9, y: 7 });
    const deleted = createHeroDeleteEdit(committed.document, placed.hero!.id);
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    const removed = commitTerrainEdit(committed.document, committed.history, deleted.edit);
    expect(removed.document.heroes).toEqual([]);
    const restored = undoTerrainEdit(removed.document, removed.history);
    expect(restored.document.heroes[0].position).toEqual({ x: 9, y: 7 });
    expect(redoTerrainEdit(restored.document, restored.history).document.heroes).toEqual([]);
  });

  it('allows only the canonical same-owner castle entrance sharing exception', () => {
    const map = document();
    map.castles = [{ id: 'p1-castle', position: { x: 2, y: 2 }, owner: 'p1',
      faction: 'hearthguard' }];
    const entrance = { x: 4, y: 3 };
    expect(canPlaceEditorHero(map, entrance, 'p1')).toEqual({ ok: true });
    expect(canPlaceEditorHero(map, entrance, 'p2')).toEqual({ ok: false, reason: 'overlap' });
    expect(canPlaceEditorHero(map, { x: 2, y: 2 }, 'p1'))
      .toEqual({ ok: false, reason: 'overlap' });
    const noncanonicalEntrance = structuredClone(map);
    noncanonicalEntrance.castles[0].entrance = { dx: 0, dy: 0 };
    expect(canPlaceEditorHero(noncanonicalEntrance, { x: 2, y: 2 }, 'p1'))
      .toEqual({ ok: false, reason: 'overlap' });
    expect(canPlaceEditorHero(noncanonicalEntrance, entrance, 'p1')).toEqual({ ok: true });

    const owned = createHeroPlacementEdit(map, entrance, 'p1', 'hearthguard', 'aldith');
    expect(owned.ok).toBe(true);
    if (!owned.ok) return;
    const withHero = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, owned.edit).document;
    expect(canPlaceEditorHero(withHero, entrance, 'p1')).toEqual({ ok: false, reason: 'overlap' });
    expect(codes(withHero)).not.toContain('entity.overlap');

    const otherOwner = structuredClone(withHero);
    otherOwner.heroes[0].owner = 'p2';
    expect(codes(otherOwner)).toContain('entity.overlap');
    const neutral = structuredClone(withHero);
    neutral.castles[0].owner = 'neutral';
    expect(codes(neutral)).toContain('entity.overlap');

    const occupiedEntrance = structuredClone(map);
    occupiedEntrance.guardians.push({ id: 'entrance-guard', position: entrance,
      army: [{ unitId: 'yeoman', count: 1 }], split: false, static: true,
      protects: null, drop: null });
    expect(canPlaceEditorHero(occupiedEntrance, entrance, 'p1'))
      .toEqual({ ok: false, reason: 'overlap' });
    const objectEntrance = structuredClone(map);
    objectEntrance.objects.push({ id: 'entrance-site', kind: 'waystation',
      position: entrance, properties: {} });
    expect(canPlaceEditorHero(objectEntrance, entrance, 'p1'))
      .toEqual({ ok: false, reason: 'overlap' });
    const pickupEntrance = structuredClone(map);
    pickupEntrance.rewards.push({ id: 'entrance-pickup', delivery: { kind: 'pickup', position: entrance },
      bundle: { artifacts: [], items: [], resources: { gold: 1 }, teachesSpell: null } });
    expect(canPlaceEditorHero(pickupEntrance, entrance, 'p1'))
      .toEqual({ ok: false, reason: 'overlap' });

    expect(createHeroUpdateEdit(withHero, withHero.heroes[0].id, { owner: 'p2' }))
      .toEqual({ ok: false, reason: 'overlap' });
  });

  it('prefers the visibly topmost hero over its shared castle entrance for select/erase', () => {
    const source = readFileSync(resolve('src/ui/components/EditorTerrainCanvas.tsx'), 'utf8');
    expect(source).toMatch(/if \(tool === 'erase'\)[\s\S]*?if \(hero\)[\s\S]*?else if \(castle\)/);
    expect(source).toMatch(/if \(tool === 'select'\)[\s\S]*?const hero[\s\S]*?const castle = hero \? undefined/);
  });

  it('applies the entrance exception symmetrically to castle stamps, moves, and owner edits', () => {
    let map = document();
    const hero = createHeroPlacementEdit(map, { x: 4, y: 3 }, 'p1', 'hearthguard', 'aldith');
    expect(hero.ok).toBe(true);
    if (!hero.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, hero.edit).document;
    expect(createCastlePlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hagwood'))
      .toMatchObject({ ok: true });
    expect(createCastlePlacementEdit(map, { x: 2, y: 2 }, 'p2', 'hagwood'))
      .toEqual({ ok: false, reason: 'overlap' });
    expect(createCastlePlacementEdit(map, { x: 4, y: 3 }, 'p1', 'hagwood'))
      .toEqual({ ok: false, reason: 'overlap' });

    const castle = createCastlePlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hagwood');
    if (!castle.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, castle.edit).document;
    expect(codes(map)).not.toContain('entity.overlap');
    expect(createCastleUpdateEdit(map, castle.castle!.id, { owner: 'p2' }))
      .toEqual({ ok: false, reason: 'overlap' });

    const secondHero = createHeroPlacementEdit(
      map, { x: 12, y: 7 }, 'p1', 'hearthguard', 'berta',
    );
    expect(secondHero.ok).toBe(true);
    if (!secondHero.ok) return;
    map = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, secondHero.edit).document;
    expect(createCastleMoveEdit(map, castle.castle!.id, { x: 10, y: 6 }))
      .toMatchObject({ ok: true });
    map.heroes.push({ ...secondHero.hero!, id: 'second-at-entrance' });
    expect(createCastleMoveEdit(map, castle.castle!.id, { x: 10, y: 6 }))
      .toEqual({ ok: false, reason: 'overlap' });
  });

  it('combines duplicate stacks and rejects empty, invalid, or oversized armies', () => {
    expect(safeEditorHeroArmy([
      { unitId: 'yeoman', count: 2 }, { unitId: 'tinSoldier', count: 1 },
      { unitId: 'yeoman', count: 3 },
    ])).toEqual([{ unitId: 'yeoman', count: 5 }, { unitId: 'tinSoldier', count: 1 }]);
    expect(safeEditorHeroArmy([])).toBeNull();
    expect(safeEditorHeroArmy([{ unitId: 'yeoman', count: 0 }])).toBeNull();
    for (const unitId of EDITOR_NON_ROSTER_UNIT_IDS) {
      expect(safeEditorHeroArmy([{ unitId, count: 1 }]), unitId).toBeNull();
    }
    expect(safeEditorHeroArmy(Object.keys(UNITS).slice(0, 8).map((unitId) => ({
      unitId: unitId as keyof typeof UNITS, count: 1,
    })))).toBeNull();

    const map = document();
    const placed = createHeroPlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hearthguard', 'aldith');
    if (!placed.ok) return;
    const changed = commitTerrainEdit(map, EMPTY_TERRAIN_HISTORY, placed.edit).document;
    expect(editorHeroUnitChoices(changed.heroes[0])).not.toEqual(
      expect.arrayContaining([...EDITOR_NON_ROSTER_UNIT_IDS]),
    );
    const combined = createHeroUpdateEdit(changed, placed.hero!.id, { army: [
      { unitId: 'yeoman', count: 2 }, { unitId: 'yeoman', count: 4 },
    ] });
    expect(combined).toMatchObject({ ok: true, hero: { army: [{ unitId: 'yeoman', count: 6 }] } });
    expect(createHeroUpdateEdit(changed, placed.hero!.id, { army: [] }))
      .toEqual({ ok: false, reason: 'invalid-army' });
  });

  it('changes faction atomically while preserving owner, edited army, and imported progression', () => {
    const map = document();
    const placed = createHeroPlacementEdit(map, { x: 2, y: 2 }, 'p2', 'hearthguard', 'berta');
    if (!placed.ok) return;
    map.heroes = [{ ...placed.hero!, army: [{ unitId: 'maskedDuelist', count: 7 }],
      level: 8, xp: 1234, stats: { attack: 9 }, skills: { logistics: 3 },
      knownSpells: ['rally'], upgradedSpells: ['rally'] }];
    const result = createHeroUpdateEdit(map, placed.hero!.id, { faction: 'vespiary' });
    expect(result).toMatchObject({ ok: true, hero: {
      owner: 'p2', faction: 'vespiary', definitionId: FACTION_HEROES.vespiary[0],
      army: [{ unitId: 'maskedDuelist', count: 7 }], level: 8, xp: 1234,
      stats: { attack: 9 }, skills: { logistics: 3 }, knownSpells: ['rally'],
      upgradedSpells: ['rally'],
    } });
    expect(createHeroUpdateEdit(map, placed.hero!.id, { definitionId: 'petra' }))
      .toEqual({ ok: false, reason: 'invalid-definition' });
  });

  it('rejects global ID collisions and keeps player-slot removal references safe', async () => {
    const map = document();
    map.objects.push({ id: 'taken-id', kind: 'waystation', position: { x: 8, y: 8 }, properties: {} });
    const placed = createHeroPlacementEdit(map, { x: 2, y: 2 }, 'p2', 'hearthguard', 'aldith');
    if (!placed.ok) return;
    map.heroes.push(placed.hero!);
    expect(createHeroUpdateEdit(map, placed.hero!.id, { id: 'taken-id' }))
      .toEqual({ ok: false, reason: 'invalid-id' });
    const { removeEditorPlayerSlot } = await import('../mapEditorCastles');
    expect(removeEditorPlayerSlot(map, 'p2')).toMatchObject({
      ok: false, reason: 'referenced', references: [expect.stringContaining(placed.hero!.id)],
    });
  });

  it('offers unique unit selectors and renders a structured non-destructive inspector', () => {
    const map = document();
    const placed = createHeroPlacementEdit(map, { x: 2, y: 2 }, 'p1', 'hearthguard', 'berta');
    if (!placed.ok) return;
    const hero = { ...placed.hero!, army: [
      { unitId: 'yeoman' as const, count: 3 }, { unitId: 'tinSoldier' as const, count: 2 },
    ], level: 4, xp: 99 };
    expect(editorHeroUnitChoices(hero, 0)).not.toContain('tinSoldier');
    expect(editorHeroUnitChoices(hero, 1)).not.toContain('yeoman');
    const html = renderToStaticMarkup(<EditorHeroInspector hero={hero} document={map}
      onUpdate={() => true} onDelete={() => undefined} onPolicyMessage={() => undefined} />);
    for (const label of ['Selected hero', 'Stable ID', 'Owner flag', 'Hero faction', 'Named hero',
      'Starting army', '1 / 7', 'positive', 'Add army stack', 'Imported level, XP, stats, skills']) {
      if (label === '1 / 7') continue;
      expect(html).toContain(label);
    }
    expect(html).toContain('2 / 7 stacks');
    expect(html).not.toContain('mana');
    expect(html).not.toContain('movement');
  });
});

describe('hero validation, rendering, and portable conversion', () => {
  it('validates duplicate stacks plus hero 1x1 overlap and bounds', () => {
    const map = document();
    const placed = createHeroPlacementEdit(map, { x: 3, y: 3 }, 'p1', 'hearthguard', 'aldith');
    if (!placed.ok) return;
    map.heroes = [placed.hero!, { ...placed.hero!, id: 'second-hero', owner: 'p2',
      army: [{ unitId: 'yeoman', count: 1 }, { unitId: 'yeoman', count: 2 }] }];
    expect(codes(map)).toEqual(expect.arrayContaining(['hero.army.duplicate_unit', 'entity.overlap']));
    map.heroes[0].army = [{ unitId: 'siegeWall', count: 1 }];
    expect(codes(map)).toContain('hero.army.unit_not_authorable');
    map.heroes[1].position = { x: 18, y: 1 };
    expect(codes(map)).toContain('map.coordinate.out_of_bounds');
  });

  it('matches the runtime native south anchor and exposes all canonical flag colors', () => {
    expect(EDITOR_HERO_FOOTPRINT).toEqual({ w: 1, h: 1 });
    for (const faction of factions) {
      const id = editorHeroSpriteId({ faction });
      const entry = manifestEntry(id);
      expect(entry, id).toBeDefined();
      expect(id).toBe(`hero:${faction}:s`);
      expect(editorHeroCanvasGeometry({ x: 2, y: 3 }, entry!)).toEqual({
        x: 80 - entry!.anchor.x, y: 112 - entry!.anchor.y,
        width: entry!.w, height: entry!.h,
      });
    }
    expect(editorHeroFlagAnchor({ x: 2, y: 3 })).toEqual({ x: 86, y: 111 });
    expect(Object.values(EDITOR_PLAYER_FLAGS).map((flag) => flag.color))
      .toEqual(['#d24c3f', '#3c8fb2', '#4d9b63', '#be7d34', '#8750ad', '#278d85']);
    const source = readFileSync(resolve('src/ui/components/AdventureMap.tsx'), 'utf8');
    expect(source).toContain("heroSpriteId(mapHero.faction, heroFacings[mapHero.id] ?? 's')");
  });

  it('serializes and converts edited heroes without runtime-only authoring state', () => {
    const map = document();
    const placed = createHeroPlacementEdit(map, { x: 5, y: 5 }, 'p2', 'hagwood', 'vasilisa');
    if (!placed.ok) return;
    map.heroes = [{ ...placed.hero!, level: 3, xp: 200,
      stats: { knowledge: 7 }, skills: { scouting: 2 }, knownSpells: ['sour'] }];
    const serialized = serializeEditorMapDocument(map);
    const parsed = parseEditorMapDocument(serialized);
    expect(parsed.document?.heroes).toEqual(map.heroes);
    expect(serialized).not.toContain('"movement"');
    expect(serialized).not.toContain('"mana"');
    expect(serialized).not.toContain('"alive"');
    const runtime = convertEditorMapDocument(
      parsed.document!, 31, { requirePlayable: false },
    ).setup.heroes[0];
    expect(runtime).toMatchObject({ id: placed.hero!.id, owner: 'p2', faction: 'hagwood',
      definitionId: 'vasilisa', position: { x: 5, y: 5 }, level: 3, xp: 200,
      knowledge: 7, skills: { scouting: 2 } });
    expect(runtime.army.filter(Boolean)).toEqual([{ unitId: 'crowChorus', count: 9 }]);
  });

  it('keeps built-in clone heroes faction-compatible and runtime-round-trippable', () => {
    for (const { id: mapId } of CAMPAIGN_PRESENTATIONS) {
      const map = cloneBuiltInMapForEditor(mapId, `${mapId}-hero-clone`, 'Hero Clone');
      expect(map.heroes.length).toBeGreaterThan(0);
      expect(map.heroes.every((hero) => HEROES[hero.definitionId].faction === hero.faction
        && hero.army.length > 0 && hero.army.length <= 7)).toBe(true);
      const serialized = serializeEditorMapDocument(map);
      const parsed = parseEditorMapDocument(serialized).document!;
      expect(convertEditorMapDocument(parsed, 1).setup.heroes.map((hero) => ({
        id: hero.id, owner: hero.owner, faction: hero.faction, definitionId: hero.definitionId,
        army: hero.army.filter(Boolean),
      }))).toEqual(parsed.heroes.map((hero) => ({
        id: hero.id, owner: hero.owner, faction: hero.faction,
        definitionId: hero.definitionId, army: hero.army,
      })));
    }
  });

  it('renders accessible ordered section 05 after castles with three explicit choices', () => {
    const map = document(6);
    const html = renderToStaticMarkup(<EditorTerrainCanvas document={map}
      onDocumentChange={() => undefined} />);
    expect(html.indexOf('data-palette-order="4"')).toBeLessThan(
      html.indexOf('data-palette-order="5"'),
    );
    for (const label of ['05', 'Heroes', 'Hero owner flag', 'Hero faction',
      'Named hero definition', 'Crimson']) expect(html).toContain(label);
    expect(html).toContain('aria-label="Place Aldith"');
    expect(html).toContain('aria-label="Hero owner flag"');
    expect(html).toContain('aria-label="Hero faction"');
    expect(html).toContain('aria-label="Named hero definition"');
  });
});
