import { describe, expect, it } from 'vitest';
import { manifestEntry } from '../../../assets/manifest';
import { FACTIONS } from '../../content/factions';
import { apply, createGame } from '../game';
import { finalizeBattle } from '../game/outcomes';
import { neutralCityDefaultGarrison } from '../game/setup';
import {
  CITY_ENTRANCE, CITY_FOOTPRINT, castleEntrance, castleFootprintTiles,
} from '../map/occupancy';
import { revealForPlayer } from '../map/visibility';
import {
  EDITOR_CATALOG_HASH, LEGACY_3X2_EDITOR_CATALOG_HASH,
  adaptRuntimeMapToEditorDocument, convertEditorMapDocument, createBlankEditorMap,
  createDefaultEditorCastle, migrateEditorMapCitiesTo5x2, validateEditorMapDocument,
  type EditorMapDocument,
} from '../mapEditor';
import { adventurePath } from '../game/navigation';
import type { Army, FactionId } from '../types';

const compact = (army: Army) => army.filter((stack) => stack !== null);

const DEFAULT_GARRISONS = {
  hearthguard: [
    { unitId: 'yeoman', count: 51 },
    { unitId: 'longbowman', count: 27 },
    { unitId: 'bannerman', count: 18 },
  ],
  woundWrights: [
    { unitId: 'tinSoldier', count: 36 },
    { unitId: 'hobbyKnight', count: 27 },
    { unitId: 'marionette', count: 18 },
  ],
  unfinished: [
    { unitId: 'candleWisps', count: 54 },
    { unitId: 'couriers', count: 27 },
    { unitId: 'sentries', count: 18 },
  ],
  vespiary: [
    { unitId: 'larvalTide', count: 60 },
    { unitId: 'paperWaspLancers', count: 30 },
    { unitId: 'silkSpinners', count: 21 },
  ],
  hagwood: [
    { unitId: 'crowChorus', count: 48 },
    { unitId: 'fencePostFamiliars', count: 27 },
    { unitId: 'besomRiders', count: 18 },
  ],
  wildergrass: [
    { unitId: 'outriders', count: 45 },
    { unitId: 'drumCallers', count: 27 },
    { unitId: 'ashmaneWolves', count: 21 },
  ],
} as const;

function neutralCityDocument(): EditorMapDocument {
  const document = createBlankEditorMap({
    id: 'neutral-city-contract', name: 'Neutral City Contract', width: 22, height: 6,
    terrain: 'meadow', skin: 'default',
  });
  document.castles = [
    createDefaultEditorCastle('inherited', { x: 0, y: 1 }, 'neutral', 'hearthguard'),
    { ...createDefaultEditorCastle('empty', { x: 6, y: 1 }, 'neutral', 'unfinished'),
      garrison: [] },
    { ...createDefaultEditorCastle('explicit', { x: 12, y: 1 }, 'neutral', 'vespiary'),
      garrison: [{ unitId: 'larvalTide', count: 7 }] },
  ];
  return document;
}

function neutralizeEnemyCity(defended: boolean) {
  const state = createGame({ seed: 0x15c17, p1: 'human', p2: 'human' });
  const city = state.castles.find((candidate) => candidate.owner === 'p2')!;
  const hero = state.players.p1.hero!;
  state.players.p2.heroes.forEach((candidate) => { candidate.alive = false; });
  city.owner = 'neutral';
  city.garrison = defended ? neutralCityDefaultGarrison(city.faction) : Array(7).fill(null);
  city.garrisonSource = defended ? 'inherited' : 'explicit';
  const entrance = castleEntrance(city);
  hero.position = { x: entrance.x, y: entrance.y + 1 };
  hero.movement = 10_000;
  return { state, city, hero, entrance };
}

describe('neutral city defense authoring contract', () => {
  it.each(Object.entries(DEFAULT_GARRISONS) as Array<[
    FactionId, (typeof DEFAULT_GARRISONS)[FactionId],
  ]>)('derives the exact three-week %s tier 1–3 defense', (faction, expected) => {
    expect(compact(neutralCityDefaultGarrison(faction))).toEqual(expected);
  });

  it('round-trips omitted, explicit empty, and explicit nonempty defenses distinctly', () => {
    const document = neutralCityDocument();
    const converted = convertEditorMapDocument(document, 41, { requirePlayable: false });
    expect(compact(converted.setup.castles[0].garrison)).toEqual(DEFAULT_GARRISONS.hearthguard);
    expect(converted.setup.castles[0].garrisonSource).toBe('inherited');
    expect(compact(converted.setup.castles[1].garrison)).toEqual([]);
    expect(converted.setup.castles[1].garrisonSource).toBe('explicit');
    expect(compact(converted.setup.castles[2].garrison)).toEqual([
      { unitId: 'larvalTide', count: 7 },
    ]);
    expect(converted.setup.castles[2].garrisonSource).toBe('explicit');

    const adapted = adaptRuntimeMapToEditorDocument(converted.map, {
      castles: converted.setup.castles,
    });
    expect(adapted.castles[0]).not.toHaveProperty('garrison');
    expect(adapted.castles[1].garrison).toEqual([]);
    expect(adapted.castles[2].garrison).toEqual([{ unitId: 'larvalTide', count: 7 }]);
  });

  it('rejects null, partial, random, and additive city-defense encodings', () => {
    const cases = [
      { garrison: null, code: 'army.invalid' },
      { garrison: [{ unitId: 'yeoman' }], code: 'army.stack.count' },
      { garrison: [{ randomTier: 1, count: 3 }], code: 'army.stack.field.unsupported' },
      { garrison: [{ unitId: 'yeoman', count: 3, additive: true }],
        code: 'army.stack.field.unsupported' },
    ] as const;
    for (const entry of cases) {
      const document = neutralCityDocument() as unknown as Record<string, unknown>;
      const castles = document.castles as Array<Record<string, unknown>>;
      castles[0].garrison = entry.garrison;
      expect(validateEditorMapDocument(document).map((item) => item.code)).toContain(entry.code);
    }
  });
});

describe('neutral city capture and determinism', () => {
  it('captures an explicitly empty neutral city immediately at its sole gate', () => {
    const { state, city, entrance } = neutralizeEnemyCity(false);
    const captured = apply(state, { type: 'MOVE_HERO', destination: entrance });
    expect(captured.battle).toBeNull();
    expect(captured.phase).not.toBe('combat');
    expect(captured.castles.find((candidate) => candidate.id === city.id)).toMatchObject({
      owner: 'p1', garrisonSource: 'explicit',
    });
  });

  it('starts the ordinary garrison battle and assigns the city after victory', () => {
    const { state, city, entrance } = neutralizeEnemyCity(true);
    const attacked = apply(state, { type: 'MOVE_HERO', destination: entrance });
    expect(attacked.battle?.context).toMatchObject({
      kind: 'castle', targetId: city.id, destination: entrance,
    });
    expect(attacked.battle?.context.defenderPlayerId).toBeUndefined();
    attacked.battle!.stacks.filter((stack) => stack.side === 'defender').forEach((stack) => {
      stack.count = 0;
      stack.topHp = 0;
    });
    attacked.battle!.winner = 'attacker';
    finalizeBattle(attacked);
    expect(attacked.castles.find((candidate) => candidate.id === city.id)).toMatchObject({
      owner: 'p1', garrisonSource: 'explicit',
    });
    expect(compact(attacked.castles.find((candidate) => candidate.id === city.id)!.garrison))
      .toEqual([]);
  });

  it('keeps JSON saves and action replay deterministic across empty neutral capture', () => {
    const firstSetup = neutralizeEnemyCity(false);
    const first = apply(firstSetup.state, { type: 'MOVE_HERO', destination: firstSetup.entrance });
    const replaySetup = neutralizeEnemyCity(false);
    const replayed = first.replay.reduce(apply, replaySetup.state);
    expect(replayed).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});

describe('canonical city geometry and presentation', () => {
  it('uses ten occupied cells, one passable gate, and the full footprint for fog', () => {
    const state = createGame({ seed: 61, p1: 'human', p2: 'human' });
    const city = state.castles[0];
    const hero = state.players.p1.hero!;
    const footprint = castleFootprintTiles(city);
    expect(city).toMatchObject({ footprint: CITY_FOOTPRINT, entrance: CITY_ENTRANCE });
    expect(footprint).toHaveLength(10);
    const blockedCell = footprint.find((cell) =>
      cell.x === city.position.x && cell.y === city.position.y)!;
    expect(adventurePath(state, blockedCell)).toBeNull();
    expect(adventurePath(state, castleEntrance(city))).toEqual([castleEntrance(city)]);
    const explored = revealForPlayer([], state.map, null, [city]);
    expect(footprint.every((cell) => explored.includes(`${cell.x},${cell.y}`))).toBe(true);
    expect(hero.position).toEqual(castleEntrance(city));
  });

  it('routes every legacy variant to exact canonical faction art aliases', () => {
    for (const [faction, variant] of [
      ['hearthguard', 'freeTown'], ['unfinished', 'hollowTown'],
      ['vespiary', 'coastal'], ['woundWrights', 'oldSeat'],
    ] as const) {
      const canonicalId = `castle:${faction}:castle`;
      const alias = manifestEntry(`castle:${faction}:${variant}`)!;
      const canonical = manifestEntry(canonicalId)!;
      expect(alias.aliasOf).toBe(canonicalId);
      expect(alias).toMatchObject({
        file: canonical.file, w: 160, h: 160, anchor: canonical.anchor,
        contact: { w: 5, h: 2, entrance: { x: 2, y: 1 } },
      });
    }
    expect(Object.keys(FACTIONS)).toHaveLength(6);
  });

  it('migrates legacy anchors west while preserving world-space gates', () => {
    const document = neutralCityDocument();
    document.compatibility.catalogHash = LEGACY_3X2_EDITOR_CATALOG_HASH;
    const oldGate = { x: document.castles[0].position.x + 1,
      y: document.castles[0].position.y + 1 };
    expect(validateEditorMapDocument(document).map((item) => item.code))
      .toContain('compatibility.city_geometry.migration_required');
    const migrated = migrateEditorMapCitiesTo5x2(document);
    expect(migrated.compatibility.catalogHash).toBe(EDITOR_CATALOG_HASH);
    expect({ x: migrated.castles[0].position.x + CITY_ENTRANCE.dx,
      y: migrated.castles[0].position.y + CITY_ENTRANCE.dy }).toEqual(oldGate);
    expect(migrated.castles[0]).not.toHaveProperty('footprint');
    expect(migrated.castles[0]).not.toHaveProperty('entrance');
  });
});
