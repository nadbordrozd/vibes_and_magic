import { describe, expect, it } from 'vitest';
import { runStrategyTurn } from '../../ai/strategy';
import {
  GRAND_MUSTER_CASTLES, GRAND_MUSTER_ENEMY_CASTLE,
  createGrandMuster,
} from '../../content/maps/grandMuster';
import { FACTION_UNITS } from '../../content/units';
import { lintMap } from '../../tools/mapLint';
import { createGame } from '../game';
import { moveHero } from '../game/exploration';
import { castleEntrance, guardianAggroTiles } from '../map/occupancy';

describe('Grand Muster showcase', () => {
  it('authors a larger clean sandbox with six nearby neutral fights', () => {
    const map = createGrandMuster(77);
    const starts = [
      ...GRAND_MUSTER_CASTLES.map((castle) => castle.entrance),
      GRAND_MUSTER_ENEMY_CASTLE.entrance,
    ];
    expect(map.width).toBeGreaterThan(48);
    expect(map.height).toBeGreaterThan(40);
    expect(lintMap(map, starts)).toEqual([]);
    expect(map.victory.type).toBe('none');
    expect(map.objects.filter((object) => object.kind === 'guardian')).toHaveLength(6);
    expect(map.objects.filter((object) => object.kind === 'pile').length).toBeGreaterThanOrEqual(20);
    expect(new Set(map.objects.map((object) => object.kind)).size).toBeGreaterThanOrEqual(25);
    for (const [index, castle] of GRAND_MUSTER_CASTLES.entries()) {
      const guardian = map.objects.find((object) => object.kind === 'guardian'
        && object.id === `muster-guardian-${castle.faction}`)!;
      if (guardian.kind !== 'guardian') throw new Error('showcase guardian missing');
      expect(guardianAggroTiles(guardian, map)).not.toContainEqual(starts[index]);
      expect(guardian.protects).toBe(`muster-sparring-${castle.faction}`);
    }
  }, 15_000);

  it('starts the human with every faction castle and a complete matching roster', () => {
    const game = createGame({
      seed: 77, mapId: 'grand-muster', p1: 'ai', p2: 'ai', difficulty: 'normal',
    });
    const owned = game.castles.filter((castle) => castle.owner === 'p1');
    expect(game.players.p1.controller).toBe('human');
    expect(game.players.p2.controller).toBe('dormant');
    expect(owned).toHaveLength(6);
    expect(new Set(owned.map((castle) => castle.faction))).toEqual(
      new Set(GRAND_MUSTER_CASTLES.map((castle) => castle.faction)),
    );
    expect(game.players.p1.heroes).toHaveLength(6);
    for (const hero of game.players.p1.heroes) {
      const castle = owned.find((candidate) => candidate.faction === hero.faction)!;
      const entrance = castleEntrance(castle);
      expect(hero.position).toEqual({ x: entrance.x, y: entrance.y + 1 });
      expect(hero.army.flatMap((stack) => stack ? [stack.unitId] : []))
        .toEqual([...FACTION_UNITS[hero.faction]]);
      expect(hero.army.filter(Boolean)).toHaveLength(6);
    }
    const enemyCastle = game.castles.find((castle) => castle.owner === 'p2')!;
    expect(castleEntrance(enemyCastle)).toEqual(GRAND_MUSTER_ENEMY_CASTLE.entrance);
    expect(Math.abs(GRAND_MUSTER_ENEMY_CASTLE.entrance.x
      - GRAND_MUSTER_CASTLES[0].entrance.x)).toBeGreaterThan(40);

    const active = game.players.p1.hero!;
    active.movement = 1_000;
    moveHero(game, { x: active.position.x, y: active.position.y + 1 });
    expect(game.phase).toBe('combat');
    expect(game.battle?.context.targetId).toBe('muster-guardian-hearthguard');
  });

  it('keeps the distant opponent completely dormant', () => {
    let game = createGame({ seed: 78, mapId: 'grand-muster', p1: 'human', p2: 'ai' });
    const before = game.players.p2.heroes.map((hero) => ({ ...hero.position }));
    game.activePlayer = 'p2';
    game = runStrategyTurn(game);
    expect(game.players.p2.heroes.map((hero) => hero.position)).toEqual(before);
    expect(game.players.p2.heroes.every((hero) => hero.movement === 0)).toBe(true);
    expect(game.activePlayer).toBe('p1');
  });

});
