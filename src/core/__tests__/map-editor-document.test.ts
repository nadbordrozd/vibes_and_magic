import { describe, expect, it } from 'vitest';
import { createBorderMarches } from '../../content/maps/borderMarches';
import { createCrookedCrown } from '../../content/maps/crookedCrown';
import { createCrosstitch, createCrosstitchKit } from '../../content/maps/crosstitch';
import { createGrandMuster } from '../../content/maps/grandMuster';
import { createManywhere } from '../../content/maps/manywhere';
import { createSixfoldTrial } from '../../content/maps/sixfoldTrial';
import { createTornSound } from '../../content/maps/tornSound';
import { FACTIONS } from '../../content/factions';
import { TERRAIN } from '../../content/terrain';
import type { GameMap } from '../types';
import {
  EDITOR_CATALOG_HASH,
  adaptRuntimeMapToEditorDocument,
  cloneEditorMapDocument,
  convertEditorMapDocument,
  createBlankEditorMap,
  createDefaultEditorCastle,
  createDefaultEditorGuardian,
  createDefaultEditorHero,
  createDefaultEditorPlayer,
  hashEditorMapDocument,
  parseEditorMapDocument,
  serializeEditorMapDocument,
  stableEntityId,
  validateEditorMapDocument,
} from '../mapEditor';
import type { EditorMapDocument } from '../mapEditor';

function playableDocument(): EditorMapDocument {
  const document = createBlankEditorMap({
    id: 'small-crossing', name: 'Small Crossing', width: 8, height: 6,
    terrain: 'meadow', author: 'Test author', style: 'Duel',
  });
  document.victory = {
    type: 'conquest', flavor: 'Keep one banner flying.', mechanics: 'Defeat every rival.',
  };
  document.players = [createDefaultEditorPlayer('p1', 'hearthguard')];
  document.castles = [createDefaultEditorCastle(
    'p1-castle', { x: 1, y: 1 }, 'p1', 'hearthguard',
  )];
  document.heroes = [createDefaultEditorHero(
    'p1-aldith', { x: 3, y: 2 }, 'p1', 'hearthguard', 'aldith',
  )];
  return document;
}

const codes = (document: unknown) =>
  validateEditorMapDocument(document).map((diagnostic) => diagnostic.code);

const BUILT_IN_MAP_VARIANTS: ReadonlyArray<readonly [string, (seed?: number) => GameMap]> = [
  ['Border Marches', createBorderMarches],
  ['Crosstitch', createCrosstitch],
  ['Crosstitch — Tailor\'s Kit', createCrosstitchKit],
  ['Torn Sound', createTornSound],
  ['Manywhere', createManywhere],
  ['Grand Muster', createGrandMuster],
  ['Crooked Crown', createCrookedCrown],
  ['Sixfold Trial', createSixfoldTrial],
];

describe('portable editor map document', () => {
  it('constructs a complete independent rectangular blank map', () => {
    const document = createBlankEditorMap({
      id: 'blank-map', name: 'Blank Map', width: 4, height: 3,
      terrain: 'deepwood', skin: 'mossy',
    });
    expect(document.documentType).toBe('vibes-and-magic-map');
    expect(document.schemaVersion).toBe(1);
    expect(document.compatibility.catalogHash).toBe(EDITOR_CATALOG_HASH);
    expect(document.tiles).toHaveLength(3);
    expect(document.tiles.every((row) => row.length === 4)).toBe(true);
    expect(document.tiles[0][0]).toEqual({ terrain: 'deepwood', skin: 'mossy' });
    document.tiles[0][0].terrain = 'meadow';
    expect(document.tiles[0][1].terrain).toBe('deepwood');
  });

  it('serializes, parses, hashes, and clones deterministically', () => {
    const document = playableDocument();
    document.overlays.roads = [{ x: 4, y: 3 }, { x: 0, y: 0 }];
    document.guardians = [createDefaultEditorGuardian(
      'road-guard', { x: 5, y: 3 }, 'maskedDuelist',
    )];
    const first = serializeEditorMapDocument(document);
    const parsed = parseEditorMapDocument(first);
    expect(parsed.document).not.toBeNull();
    expect(serializeEditorMapDocument(parsed.document!)).toBe(first);
    expect(hashEditorMapDocument(parsed.document!)).toBe(hashEditorMapDocument(document));
    const cloned = cloneEditorMapDocument(document);
    cloned.tiles[0][0].terrain = 'water';
    expect(document.tiles[0][0].terrain).toBe('meadow');
    expect(stableEntityId('Road Guard', ['road-guard', 'road-guard-2']))
      .toBe('road-guard-3');
  });

  it('refuses malformed JSON, wrong document kinds, and unsupported versions', () => {
    expect(parseEditorMapDocument('{').diagnostics[0].code).toBe('schema.json.invalid');
    const document = playableDocument() as unknown as Record<string, unknown>;
    expect(parseEditorMapDocument(JSON.stringify({ ...document, documentType: 'save' }))
      .diagnostics.map((diagnostic) => diagnostic.code))
      .toContain('schema.document_type.invalid');
    const newer = parseEditorMapDocument(JSON.stringify({ ...document, schemaVersion: 2 }));
    expect(newer.document).toBeNull();
    expect(newer.diagnostics.map((diagnostic) => diagnostic.code))
      .toContain('schema.version.unsupported');
    expect(codes({ ...document, script: 'grantEverything()' }))
      .toContain('schema.field.unknown');
    expect(codes({ ...document, revision: Number.POSITIVE_INFINITY }))
      .toContain('schema.json.unsafe');
  });

  it('diagnoses dimensions, tile shapes, terrain skins, coordinates, and overlays', () => {
    const document = playableDocument();
    document.tiles.pop();
    document.tiles[0].pop();
    document.tiles[1][1] = { terrain: 'mountain', skin: 'coastal' };
    document.overlays.roads = [{ x: 99, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 }];
    expect(codes(document)).toEqual(expect.arrayContaining([
      'map.tiles.height', 'map.tiles.width', 'catalog.terrain.skin_invalid',
      'map.coordinate.out_of_bounds', 'map.overlay.duplicate',
    ]));
  });

  it('diagnoses global IDs, footprints, references, ownership, and factions', () => {
    const document = playableDocument();
    document.players.push(createDefaultEditorPlayer('p3', 'unfinished'));
    document.castles.push({
      ...createDefaultEditorCastle('p1-aldith', { x: 7, y: 5 }, 'p2', 'not-a-faction' as never),
      footprint: { w: 3, h: 2 }, entrance: { dx: 4, dy: 0 },
    });
    expect(codes(document)).toEqual(expect.arrayContaining([
      'player.slots.noncontiguous', 'entity.id.duplicate', 'reference.owner.unknown',
      'catalog.faction.unknown', 'entity.entrance.invalid', 'entity.footprint.out_of_bounds',
    ]));
  });

  it('validates hero definitions and explicit armies', () => {
    const document = playableDocument();
    document.heroes[0].faction = 'unfinished';
    document.heroes[0].army = [];
    expect(codes(document)).toEqual(expect.arrayContaining([
      'hero.definition.faction_mismatch', 'hero.army.empty',
    ]));
    document.heroes[0].army = [
      { unitId: 'unknown' as never, count: 0 },
      ...Array.from({ length: 7 }, () => ({ unitId: 'yeoman' as const, count: 1 })),
    ];
    expect(codes(document)).toEqual(expect.arrayContaining([
      'army.too_many_stacks', 'catalog.unit.unknown', 'army.stack.count',
    ]));
    expect(createDefaultEditorHero(
      'vespiary-hero', { x: 0, y: 0 }, 'p1', 'vespiary',
    ).army).toEqual(FACTIONS.vespiary.hireArmy);
  });

  it('validates guardian counts, targets, reward contents, and reward sites', () => {
    const document = playableDocument();
    document.objects = [{
      id: 'road-pile', kind: 'pile', position: { x: 5, y: 3 },
      properties: { resource: 'gold', amount: 100 },
    }];
    document.guardians = [{
      ...createDefaultEditorGuardian('road-guard', { x: 6, y: 3 }, 'yeoman'),
      army: [{ unitId: 'yeoman', count: -1 }], protects: 'missing-reward',
    }];
    document.rewards = [{
      id: 'road-reward', delivery: { kind: 'site', objectId: 'road-pile' },
      bundle: { artifacts: [{ id: 'missing' as never }], items: [], resources: {}, teachesSpell: null },
    }];
    expect(codes(document)).toEqual(expect.arrayContaining([
      'army.stack.count', 'reference.guard_target.missing', 'catalog.artifact.unknown',
      'reward.site.unsupported',
    ]));
    document.rewards[0].bundle.artifacts = [];
    expect(codes(document)).toContain('reward.bundle.empty');
    document.objects[0].properties.collected = false;
    expect(codes(document)).toContain('object.property.unsupported');
  });

  it('accepts only canonical authored prop names and footprints', () => {
    const document = playableDocument();
    document.objects = [{
      id: 'shape-prop', kind: 'obstacle', position: { x: 5, y: 4 },
      footprint: { w: 2, h: 1 }, properties: { prop: 'the Spool', anomaly: true },
    }];
    expect(codes(document)).not.toContain('catalog.adventure_prop.unknown');
    expect(codes(document)).not.toContain('object.prop.footprint_mismatch');
    document.objects[0].footprint = { w: 1, h: 1 };
    expect(codes(document)).toContain('object.prop.footprint_mismatch');
    document.objects[0].properties.prop = 'generated scenery';
    expect(codes(document)).toContain('catalog.adventure_prop.unknown');
  });

  it('converts starts through canonical defaults without sharing authoring data', () => {
    const document = playableDocument();
    const converted = convertEditorMapDocument(document, 19);
    expect(converted.map.width).toBe(8);
    expect(converted.setup.castles[0].footprint).toEqual({ w: 5, h: 2 });
    expect(converted.setup.castles[0].buildings)
      .toEqual(['villageHall', 'dwelling1', 'tavern']);
    expect(converted.setup.heroes[0].army[0]).toEqual({ unitId: 'yeoman', count: 8 });
    document.rewards = [{
      id: 'starting-supplies', delivery: { kind: 'pickup', position: { x: 7, y: 5 } },
      bundle: {
        artifacts: [{ id: 'travelersCloak' }], items: [{ id: 'waybread' }],
        resources: { timber: 2 }, teachesSpell: null,
      },
    }];
    const rewardConversion = convertEditorMapDocument(document, 19);
    expect(rewardConversion.setup.rewards[0]).toEqual(document.rewards[0]);
    expect(rewardConversion.map.objects.at(-1)).toMatchObject({
      id: 'starting-supplies', kind: 'rewardPickup', position: { x: 7, y: 5 },
      reward: { timber: 2, items: [{ id: 'waybread' }],
        artifacts: [{ id: 'travelersCloak' }] },
      collected: false,
    });
    converted.setup.heroes[0].army[0]!.count = 999;
    expect(document.heroes[0].army[0].count).toBe(8);
  });

  it('validates portable item/artifact instance state and duplicate site rewards', () => {
    const document = playableDocument();
    document.objects = [{
      id: 'reward-lock', kind: 'lock', position: { x: 6, y: 4 },
      properties: { name: 'Reward lock', tell: 'A visible latch.' },
    }];
    document.rewards = [{
      id: 'bad-instances', delivery: { kind: 'site', objectId: 'reward-lock' },
      bundle: {
        artifacts: [{ id: 'travelersCloak', chosenSchool: 'rite' }],
        items: [
          { id: 'spellScroll' },
          { id: 'tradeGoods' },
          { id: 'waybread', plus: true, origin: { x: 1, y: 1 }, storedSpellId: 'rally' },
        ],
        resources: { gold: 0 }, teachesSpell: null,
      },
    }, {
      id: 'second-site-reward', delivery: { kind: 'site', objectId: 'reward-lock' },
      bundle: { artifacts: [], items: [], resources: { iron: 1 }, teachesSpell: null },
    }];
    expect(codes(document)).toEqual(expect.arrayContaining([
      'artifact.instance.school.unsupported', 'item.instance.stored_spell.required',
      'item.instance.origin.required', 'item.instance.plus.unsupported',
      'item.instance.origin.unsupported', 'item.instance.stored_spell.unsupported',
      'reward.resource.amount', 'reward.site.duplicate',
    ]));
  });

  it('adapts an existing authored map with separate guardians and rewards', () => {
    const runtime = createBorderMarches(7);
    const document = adaptRuntimeMapToEditorDocument(runtime);
    expect(document.source).toEqual({ kind: 'builtIn', mapId: 'border-marches' });
    expect(document.guardians).toHaveLength(
      runtime.objects.filter((object) => object.kind === 'guardian').length,
    );
    expect(document.objects.every((object) => object.kind !== ('guardian' as never))).toBe(true);
    expect(document.rewards).toHaveLength(2);
    expect(codes(document).filter((code) => code !== 'playable.active_player.required')).toEqual([]);
    const restored = convertEditorMapDocument(document, 7, { requirePlayable: false }).map;
    expect(restored.objects).toHaveLength(runtime.objects.length);
    expect(restored.terrain).toEqual(runtime.terrain);
    expect(restored.victory).toEqual(runtime.victory);
    const guard = restored.objects.find((object) => object.kind === 'guardian'
      && object.protects === 'the-sleeper');
    const originalGuard = runtime.objects.find((object) => object.id === guard?.id);
    expect(guard?.kind === 'guardian' ? guard.army : null)
      .toEqual(originalGuard?.kind === 'guardian' ? originalGuard.army : null);
  });

  it('recognizes Torn Sound salt-faded island ground as coastal Meadow', () => {
    const runtime = createTornSound(1);
    const coastalMeadow = runtime.terrain.flat().filter((cell) => typeof cell === 'object'
      && cell.terrain === 'meadow' && cell.skin === 'coastal');
    expect(coastalMeadow).toHaveLength(191);
    expect(TERRAIN.meadow.skins).toContain('coastal');
  });

  it.each(BUILT_IN_MAP_VARIANTS)(
    'losslessly round-trips the map-only %s variant through portable JSON',
    (_name, createMap) => {
      const seed = 0x5eed1234;
      const runtime = createMap(seed);
      const document = adaptRuntimeMapToEditorDocument(runtime);

      // This adapter intentionally receives map data only. Starts are supplied separately by
      // campaign setup, so its sole expected diagnostic is the playable-start reminder.
      expect(validateEditorMapDocument(document).map((diagnostic) => ({
        code: diagnostic.code, severity: diagnostic.severity,
      }))).toEqual([{
        code: 'playable.active_player.required', severity: 'error',
      }]);

      const serialized = serializeEditorMapDocument(document);
      const parsed = parseEditorMapDocument(serialized);
      expect(parsed.document).not.toBeNull();
      expect(parsed.diagnostics.map((diagnostic) => diagnostic.code))
        .toEqual(['playable.active_player.required']);
      expect(serializeEditorMapDocument(parsed.document!)).toBe(serialized);

      const restored = convertEditorMapDocument(
        parsed.document!, seed, { requirePlayable: false },
      );
      const repeated = convertEditorMapDocument(
        parsed.document!, seed, { requirePlayable: false },
      );
      expect(repeated).toEqual(restored);
      expect(restored.map.terrain).toEqual(runtime.terrain);
      expect(restored.map.roads ?? []).toEqual(document.overlays.roads);
      expect(restored.map.seams ?? []).toEqual(document.overlays.seams);
      expect(new Set((restored.map.roads ?? []).map(({ x, y }) => `${x},${y}`)))
        .toEqual(new Set((runtime.roads ?? []).map(({ x, y }) => `${x},${y}`)));
      expect(new Set((restored.map.seams ?? []).map(({ x, y }) => `${x},${y}`)))
        .toEqual(new Set((runtime.seams ?? []).map(({ x, y }) => `${x},${y}`)));
      expect(restored.map.width).toBe(runtime.width);
      expect(restored.map.height).toBe(runtime.height);
      expect(restored.map.victory).toEqual(runtime.victory);
      expect(restored.map.defeat ?? null).toEqual(runtime.defeat ?? null);

      // Re-adapting proves all map objects, separated guardians, and lowered rewards that the
      // portable schema represents return to the identical canonical authoring document.
      expect(adaptRuntimeMapToEditorDocument(restored.map)).toEqual(parsed.document);
    },
  );
});
