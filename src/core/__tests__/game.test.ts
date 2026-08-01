import { describe, expect, it } from 'vitest';
import { createBorderMarches, validateMap } from '../../content/maps/borderMarches';
import { UNITS, validateUnits } from '../../content/units';
import {
  addUnits, armyPower, canAfford, compactArmy, makeArmy, pay,
} from '../army';
import { apply, createGame, incomeForPlayer } from '../game';
import { revealForPlayer } from '../map/visibility';
import { terrainId } from '../../content/terrain';

describe('game state and economy', () => {
  it('validates content data', () => {
    expect(() => validateUnits()).not.toThrow();
    expect(() => validateMap(createBorderMarches())).not.toThrow();
  });

  it('creates the required map size', () => {
    const map = createBorderMarches();
    expect([map.width, map.height]).toEqual([28, 20]);
  });

  it('authors terrain with left-right mirror fairness', () => {
    const map = createBorderMarches();
    expect(map.terrain.every((row) => row.every(
      (terrain, x) => terrainId(terrain) === terrainId(row[map.width - 1 - x]),
    ))).toBe(true);
  });

  it('creates twenty resource piles', () => {
    expect(createBorderMarches().objects.filter((object) => object.kind === 'pile')).toHaveLength(20);
  });

  it('creates two chests per side', () => {
    expect(createBorderMarches().objects.filter((object) => object.kind === 'chest')).toHaveLength(4);
  });

  it('starts with fixed factions and resources', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    expect(game.players.p1.faction).toBe('hearthguard');
    expect(game.players.p2.faction).toBe('woundWrights');
    expect(game.players.p1.resources.timber).toBe(10);
  });

  it('starts heroes with specified armies', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    expect(game.players.p1.hero!.army[0]).toEqual({ unitId: 'yeoman', count: 25 });
    expect(game.players.p2.hero!.army[1]).toEqual({ unitId: 'hobbyKnight', count: 4 });
  });

  it('starts with full mana', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    expect(game.players.p1.hero!.mana).toBe(10);
    expect(game.players.p2.hero!.mana).toBe(20);
  });

  it('provides castle base income', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    expect(incomeForPlayer(game, 'p1').gold).toBe(500);
  });

  it('advances from player one to player two without advancing day', () => {
    const game = apply(
      createGame({ seed: 1, p1: 'human', p2: 'ai' }),
      { type: 'END_TURN' },
    );
    expect(game.activePlayer).toBe('p2');
    expect(game.day).toBe(1);
  });

  it('advances a day after player two', () => {
    let game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    game = apply(game, { type: 'END_TURN' });
    game = apply(game, { type: 'END_TURN' });
    expect(game.activePlayer).toBe('p1');
    expect(game.day).toBe(2);
  });

  it('builds at most once per castle each day', () => {
    let game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'townHall',
    });
    expect(() => apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'dwelling2',
    })).toThrow('Already built today');
  });

  it('enforces building prerequisites', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    expect(() => apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'dwelling3',
    })).toThrow('Missing prerequisite');
  });

  it('recruits available tier one units into a visiting hero', () => {
    const game = apply(
      createGame({ seed: 1, p1: 'human', p2: 'ai' }),
      { type: 'RECRUIT', castleId: 'p1-castle', tier: 1, count: 2 },
    );
    expect(game.players.p1.hero!.army[0]!.count).toBe(27);
    expect(game.castles[0].available[0]).toBe(15);
  });

  it('recruits into a remote castle garrison when the hero is away', () => {
    let game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    game = apply(game, { type: 'MOVE_HERO', destination: { x: 4, y: 10 } });
    game = apply(game, {
      type: 'RECRUIT', castleId: 'p1-castle', tier: 1, count: 2,
    });
    expect(game.castles[0].garrison[0]).toEqual({ unitId: 'yeoman', count: 2 });
    expect(game.players.p1.hero!.army[0]!.count).toBe(25);
  });

  it('moves a hero and pays movement points', () => {
    const initial = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    const movement = initial.players.p1.hero!.movement;
    const game = apply(
      initial,
      { type: 'MOVE_HERO', destination: { x: 4, y: 10 } },
    );
    expect(game.players.p1.hero!.position).toEqual({ x: 4, y: 10 });
    expect(game.players.p1.hero!.movement).toBeLessThan(movement);
  });

  it('collects a resource pile deterministically', () => {
    let game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    const pile = game.map.objects.find((object) => object.id === 'west-pile-0')!;
    const before = game.players.p1.resources.gold;
    game = apply(game, { type: 'MOVE_HERO', destination: pile.position });
    expect(game.players.p1.resources.gold).toBe(before + 750);
  });

  it('records actions for replay', () => {
    const game = apply(
      createGame({ seed: 1, p1: 'human', p2: 'ai' }),
      { type: 'END_TURN' },
    );
    expect(game.replay).toEqual([{ type: 'END_TURN' }]);
  });

  it('serializes and restores game state as JSON', () => {
    const game = createGame({ seed: 123, p1: 'human', p2: 'ai' });
    expect(JSON.parse(JSON.stringify(game))).toEqual(game);
  });

  it('merges identical army stacks', () => {
    const army = compactArmy(makeArmy([
      { unitId: 'yeoman', count: 3 },
      { unitId: 'yeoman', count: 4 },
    ]));
    expect(army[0]).toEqual({ unitId: 'yeoman', count: 7 });
  });

  it('adds new units to a free slot', () => {
    expect(addUnits(makeArmy([]), 'lanceKnight', 2)?.[0]).toEqual({ unitId: 'lanceKnight', count: 2 });
  });

  it('calculates army power from hp and average damage', () => {
    expect(armyPower(makeArmy([{ unitId: 'yeoman', count: 1 }])))
      .toBe(UNITS.yeoman.hp * 1.5);
  });

  it('checks and pays resource costs', () => {
    const resources = { gold: 100, timber: 3, iron: 0, essence: 0 };
    expect(canAfford(resources, { gold: 60, timber: 2 })).toBe(true);
    expect(pay(resources, { gold: 60, timber: 2 })).toEqual({
      gold: 40, timber: 1, iron: 0, essence: 0,
    });
  });

  it('reveals around a hero permanently', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    const before = game.players.p1.explored;
    const after = revealForPlayer(before, game.map, game.players.p1.hero, []);
    expect(after.length).toBeGreaterThanOrEqual(before.length);
  });
});
