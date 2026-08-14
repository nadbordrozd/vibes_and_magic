import { describe, expect, it } from 'vitest';
import { ARTIFACTS } from '../../content/artifacts';
import { HEROES } from '../../content/heroes';
import { createManywhere, MANYWHERE_CASTLE_POSITIONS, MANYWHERE_NEUTRAL_TOWNS } from '../../content/maps/manywhere';
import { MAP_OBJECT_KINDS, RUNTIME_ONLY_MAP_OBJECT_KINDS } from '../../content/mapObjectRegistry';
import {
  DEFAULT_TERRAIN_DECORATION_DENSITY, deriveTerrainDecorations, TERRAIN, tile,
} from '../../content/terrain';
import { runStrategyTurn } from '../../ai/strategy';
import { makeArmy } from '../army';
import { createBattle } from '../combat/battle';
import { createGame } from '../game';
import { digCache } from '../game/mapObjects';
import { incomeForPlayer } from '../game/setup';
import { adventurePath } from '../game/navigation';
import { movementCost } from '../map/pathfinding';
import type { FactionId, GameMap, TerrainId } from '../types';
import { lintMapWarnings } from '../../tools/mapLint';

describe('terrain and discovery expansions', () => {
  it('applies the terrain cost matrix, native movement, aquatic Mire, roads, and seams', () => {
    const ids = Object.keys(TERRAIN) as TerrainId[];
    const map: GameMap = {
      id: 'border-marches', name: 'fixture', seed: 7, width: ids.length, height: 1,
      terrain: [ids.map((id) => tile(id))], objects: [], roads: [], seams: [],
      victory: { type: 'none', flavor: '', mechanics: '' },
    };
    const game = createGame({ seed: 7, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    ids.forEach((id, index) => {
      const expected = TERRAIN[id].moveCost;
      expect(movementCost(map, { x: Math.max(0, index - 1), y: 0 }, { x: index, y: 0 }, hero))
        .toBe(expected);
    });
    for (const [terrain, faction] of Object.entries(TERRAIN)
      .flatMap(([id, definition]) => definition.nativeFaction
        ? [[id as TerrainId, definition.nativeFaction] as const] : [])) {
      hero.faction = faction as FactionId;
      const index = ids.indexOf(terrain);
      expect(movementCost(map, { x: Math.max(0, index - 1), y: 0 }, { x: index, y: 0 }, hero))
        .toBe(100);
    }
    const mire = ids.indexOf('mire');
    hero.faction = 'hearthguard';
    hero.army = makeArmy([{ unitId: 'rusalka', count: 1 }]);
    expect(movementCost(map, { x: mire - 1, y: 0 }, { x: mire, y: 0 }, hero)).toBe(125);
    map.roads = [{ x: mire, y: 0 }];
    expect(movementCost(map, { x: mire - 1, y: 0 }, { x: mire, y: 0 }, hero)).toBe(65);
    map.roads = []; map.seams = [{ x: mire, y: 0 }];
    expect(movementCost(map, { x: mire - 1, y: 0 }, { x: mire, y: 0 }, hero)).toBe(100);
  });

  it('derives seam resonance, persistent native speed, and Mire shallows', () => {
    const game = createGame({ seed: 28, p1: 'human', p2: 'human', p2Faction: 'hearthguard' });
    const [seam] = createBattle(
      game.players.p1.hero!.army, game.players.p2.hero!.army,
      game.players.p1.hero!, game.players.p2.hero!,
      { kind: 'hero', targetId: 'x', destination: { x: 4, y: 4 }, attackerHeroId: 'a', terrain: 'meadow', onSeam: true },
      28,
    );
    expect(seam.terrainResonances).toEqual(['rite', 'craft', 'grave', 'wild']);
    expect(seam.stacks.every((stack) => stack.terrainSpeedBonus === 1)).toBe(true);
    const [mire] = createBattle(
      game.players.p1.hero!.army, game.players.p2.hero!.army,
      game.players.p1.hero!, game.players.p2.hero!,
      { kind: 'hero', targetId: 'x', destination: { x: 4, y: 4 }, attackerHeroId: 'a', terrain: 'mire', battlefield: 'mire' },
      29,
    );
    expect(mire.battlefieldTemplate).toBe('mire');
    expect(mire.shallowHexes).toHaveLength(3);
  });

  it('regenerates decoration deterministically without save data', () => {
    const map = createManywhere(88);
    const first = deriveTerrainDecorations(map);
    expect(deriveTerrainDecorations(map)).toEqual(first);
    expect(deriveTerrainDecorations(JSON.parse(JSON.stringify(map)) as GameMap)).toEqual(first);
    expect(JSON.stringify(map)).not.toContain('decoration-');
    expect(DEFAULT_TERRAIN_DECORATION_DENSITY).toBe(0.04);
  });

  it('warns about native-heavy starts and keeps Manywhere registry-complete', () => {
    const fixture: GameMap = {
      id: 'border-marches', name: 'fixture', seed: 1, width: 13, height: 13,
      terrain: Array.from({ length: 13 }, () => Array.from({ length: 13 }, () => tile('deepwood'))),
      objects: [], victory: { type: 'none', flavor: '', mechanics: '' },
    };
    expect(lintMapWarnings(fixture, [{ x: 6, y: 6 }]).some((issue) =>
      issue.code === 'start-native-terrain')).toBe(true);
    const manywhere = createManywhere(1);
    expect(MANYWHERE_CASTLE_POSITIONS).toHaveLength(3);
    expect(MANYWHERE_NEUTRAL_TOWNS).toHaveLength(4);
    expect(new Set(manywhere.objects.map((object) => object.kind)))
      .toEqual(new Set(MAP_OBJECT_KINDS.filter((kind) =>
        !RUNTIME_ONLY_MAP_OBJECT_KINDS.includes(kind as never))));
  });

  it('ships 138 regular artifacts, 36 heroes, four neutral towns, and sandbox retirement', () => {
    expect(Object.values(ARTIFACTS).filter((artifact) =>
      artifact.class !== 'kit' && artifact.class !== 'trinket')).toHaveLength(138);
    expect(Object.keys(HEROES)).toHaveLength(36);
    const game = createGame({ seed: 29, mapId: 'manywhere', p1: 'human', p2: 'dormant', playerCount: 2 });
    expect(game.map.victory.type).toBe('none');
    expect(game.castles.filter((castle) => castle.owner === 'neutral')).toHaveLength(4);
    expect(incomeForPlayer(game, 'p2')).toEqual({ gold: 0, timber: 0, iron: 0, essence: 0 });
  });

  it('keeps dormant players still, lets hidden Cache tiles pass, and blocks obstacles', () => {
    let game = createGame({ seed: 30, mapId: 'manywhere', p1: 'human', p2: 'dormant', playerCount: 2 });
    game.activePlayer = 'p2';
    const day = game.day;
    game = runStrategyTurn(game);
    expect(game.activePlayer).toBe('p1');
    expect(game.day).toBe(day + 1);
    const hero = game.players.p1.hero!;
    const cache = game.map.objects.find((object) => object.kind === 'cache')!;
    const obstacle = game.map.objects.find((object) => object.kind === 'obstacle')!;
    if (cache.kind !== 'cache' || obstacle.kind !== 'obstacle') return;
    expect(adventurePath(game, obstacle.position)).toBeNull();
    hero.position = { ...cache.position }; hero.movement = 777;
    digCache(game, cache.position);
    expect(cache.dug).toBe(true);
    expect(hero.movement).toBe(0);
  });
});
