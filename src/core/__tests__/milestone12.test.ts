import { describe, expect, it } from 'vitest';
import { createBorderMarches } from '../../content/maps/borderMarches';
import { runStrategyTurn } from '../../ai/strategy';
import { makeArmy } from '../army';
import {
  applyBattleAction, createBattle,
} from '../combat/battle';
import { runAttackPipeline, runTurnAdvancePipeline } from '../combat/pipeline';
import { canCastSpell, castSpell } from '../combat/spells';
import { apply, createGame, incomeForPlayer } from '../game';
import { tradeGoodsPrice } from '../game/items';
import { offerChestChoice } from '../game/chests';
import type {
  BattleState, GameState, Hero, MapObject,
} from '../types';
import { objectEntranceTile } from '../map/occupancy';
import { terrainIdAt } from '../../content/terrain';

function battle(
  attackerUnit: 'marionette' | 'longbowman' = 'marionette',
  defenderUnit: 'tinSoldier' | 'sleeper' | 'mirrorBound' = 'tinSoldier',
): BattleState {
  const game = createGame({ seed: 120, p1: 'human', p2: 'human' });
  const result = createBattle(
    makeArmy([{ unitId: attackerUnit, count: 10 }]),
    makeArmy([{ unitId: defenderUnit, count: 10 }]),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'target', destination: { x: 4, y: 4 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    },
    120,
  )[0];
  result.stacks[0].position = { x: 5, y: 4 };
  result.stacks[1].position = { x: 6, y: 4 };
  result.currentStackId = 'attacker-0';
  result.order = ['attacker-0', 'defender-0'];
  return result;
}

function activeHero(state: GameState): Hero {
  return state.players[state.activePlayer].hero!;
}

describe('Milestone 12 tricks', () => {
  it('uses the same once-per-round gate for a combat item and a spell', () => {
    let state = battle();
    state.attackerHero.inventory[0] = { id: 'potionOfVigor' };
    state.attackerHero.knownSpells = ['rally'];
    state = applyBattleAction(state, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    });
    expect(canCastSpell(state, 'rally')).toBe(false);
    expect(() => applyBattleAction(state, {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0',
    })).toThrow('Illegal battle action');

    state = battle();
    state.attackerHero.inventory[0] = { id: 'potionOfVigor' };
    state.attackerHero.knownSpells = ['rally'];
    state = applyBattleAction(state, {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0',
    });
    expect(() => applyBattleAction(state, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    })).toThrow('Illegal battle action');
  });

  it('recomputes Bottled Echo using its user Spell Power', () => {
    let state = battle();
    state.attackerHero.knownSpells = ['wither'];
    state.attackerHero.spellPower = 0;
    castSpell(state, {
      type: 'BATTLE_CAST', spellId: 'wither', targetId: 'defender-0',
    });
    expect(state.stacks[1].counters.hex).toBe(6);
    state.currentStackId = 'defender-0';
    state.order = ['defender-0'];
    state.defenderHero!.spellPower = 10;
    state.defenderHero!.inventory[0] = { id: 'bottledEcho' };
    state = applyBattleAction(state, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    });
    expect(state.stacks[0].counters.hex).toBe(8);
  });

  it('casts unknown off-school scrolls for no mana and resolves potion data', () => {
    let state = battle();
    state.attackerHero.knownSpells = [];
    state.attackerHero.mana = 0;
    state.attackerHero.inventory[0] = { id: 'scrollWither' };
    state = applyBattleAction(state, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'defender-0',
    });
    expect(state.stacks[1].counters.hex).toBe(6);
    expect(state.attackerHero.mana).toBe(0);

    state.round += 1;
    state.attackerHero.inventory[0] = { id: 'draughtOfIron' };
    state = applyBattleAction(state, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    });
    expect(state.stacks[0].effects).toContainEqual(expect.objectContaining({
      spellId: 'oathOfIron', duration: 2, magnitude: 1,
    }));
    state.round += 1;
    state.stacks[0].counters = { burn: 3, chill: 2, hex: 1, bloom: 1 };
    state.attackerHero.inventory[0] = { id: 'smellingSalts' };
    state = applyBattleAction(state, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    });
    expect(state.stacks[0].counters).toEqual({
      burn: 0, chill: 0, hex: 0, bloom: 0,
    });
  });

  it('sources all authored barrow scroll pickups with their plus face', () => {
    const map = createBorderMarches(12);
    const barrowItems = map.objects.filter((object) =>
      object.kind === 'item'
      && terrainIdAt(map, object.position) === 'barrowfield');
    expect(barrowItems).toHaveLength(4);
    expect(barrowItems.every((object) =>
      object.kind === 'item' && object.item.plus === true)).toBe(true);
    const centralDrops = ['north-gap-gold', 'south-gap-gold'].map((id) =>
      map.objects.find((object) => object.kind === 'guardian'
        && object.protects === id)).map((object) =>
      object?.kind === 'guardian' ? object.drop : null);
    expect(centralDrops.every((item) => item?.id === 'spellScroll'
      && Boolean(item.storedSpellId))).toBe(true);
    const sleeper = map.objects.find((object) => object.id === 'the-sleeper');
    expect(sleeper?.kind === 'lock' ? sleeper.reward : null).toMatchObject({
      gold: 6000, essence: 12,
    });
  });

  it('adds a seeded item as the third chest reward option', () => {
    let state = createGame({ seed: 121, p1: 'human', p2: 'human' });
    const hero = activeHero(state);
    offerChestChoice(state, 'west-chest-1', hero);
    const offered = state.pendingChoice?.kind === 'chest'
      ? state.pendingChoice.item : null;
    expect(offered).not.toBeNull();
    state = apply(state, { type: 'CHOOSE_CHEST', choice: 'item' });
    expect(activeHero(state).inventory).toContainEqual(offered);
  });

  it('persists an Overseer Charter through JSON save and action replay', () => {
    const before = createGame({ seed: 13, p1: 'human', p2: 'human' });
    const hero = activeHero(before);
    const mine = before.map.objects.find((object): object is Extract<
      MapObject, { kind: 'mine' }
    > => object.id === 'west-timber')!;
    mine.owner = 'p1';
    hero.position = objectEntranceTile(mine);
    hero.inventory[0] = { id: 'overseersCharter' };
    const action = { type: 'USE_ADVENTURE_ITEM', inventorySlot: 0 } as const;
    const saved = JSON.parse(JSON.stringify(apply(before, action))) as GameState;
    expect((saved.map.objects.find((object) => object.id === mine.id) as typeof mine)
      .chartered).toBe(true);
    expect(incomeForPlayer(saved, 'p1').timber).toBe(3);
    const replayBase = JSON.parse(JSON.stringify(before)) as GameState;
    expect(apply(replayBase, action)).toEqual(saved);
  });

  it('pays a Rich Vein for exactly ten daily income dates', () => {
    const state = createGame({ seed: 14, p1: 'human', p2: 'human' });
    const vein = state.map.objects.find((object): object is Extract<
      MapObject, { kind: 'richVein' }
    > => object.kind === 'richVein')!;
    vein.owner = 'p1';
    vein.flaggedOnDay = 1;
    for (let day = 2; day <= 11; day += 1) {
      state.day = day;
      expect(incomeForPlayer(state, 'p1').essence).toBe(3);
    }
    state.day = 12;
    expect(incomeForPlayer(state, 'p1').essence).toBe(0);
  });

  it('prices Trade Goods by floored straight-line tile distance', () => {
    expect(tradeGoodsPrice(
      { id: 'tradeGoods', origin: { x: 3, y: 4 } }, { x: 3, y: 10 },
    )).toBe(450);
    expect(tradeGoodsPrice(
      { id: 'tradeGoods', origin: { x: 0, y: 0 } }, { x: 3, y: 4 },
    )).toBe(425);
  });

  it('automatically sells Trade Goods on entering a friendly castle', () => {
    let state = createGame({ seed: 16, p1: 'human', p2: 'human' });
    state = apply(state, { type: 'MOVE_HERO', destination: { x: 3, y: 11 } });
    const hero = activeHero(state);
    hero.inventory[0] = { id: 'tradeGoods', origin: { x: 9, y: 10 } };
    const before = state.players.p1.resources.gold;
    state = apply(state, { type: 'MOVE_HERO', destination: { x: 3, y: 10 } });
    expect(state.players.p1.resources.gold).toBe(before + 450);
    expect(activeHero(state).inventory[0]).toBeNull();
  });

  it('uses the Marketplace exact buy and sell rates', () => {
    let state = createGame({ seed: 17, p1: 'human', p2: 'human' });
    state.castles[0].buildings.push('marketplace');
    const start = { ...state.players.p1.resources };
    state = apply(state, {
      type: 'MARKET_TRADE', castleId: 'p1-castle',
      direction: 'sell', resource: 'timber', amount: 1,
    });
    expect(state.players.p1.resources).toMatchObject({
      gold: start.gold + 150, timber: start.timber - 1,
    });
    state = apply(state, {
      type: 'MARKET_TRADE', castleId: 'p1-castle',
      direction: 'buy', resource: 'iron', amount: 1,
    });
    expect(state.players.p1.resources).toMatchObject({
      gold: start.gold - 450, iron: start.iron + 1,
    });
  });

  it('lets AI sell only surplus for gold and buy a final shortfall', () => {
    let state = createGame({ seed: 20, p1: 'ai', p2: 'ai' });
    state.castles[0].buildings.push('marketplace');
    state.players.p1.resources = {
      gold: 0, timber: 16, iron: 3, essence: 3,
    };
    state = runStrategyTurn(state);
    expect(state.replay).toContainEqual({
      type: 'MARKET_TRADE', castleId: 'p1-castle',
      direction: 'sell', resource: 'timber', amount: 1,
    });

    state = createGame({ seed: 21, p1: 'ai', p2: 'ai' });
    state.castles[0].buildings.push('marketplace', 'townHall');
    state.players.p1.resources.essence = 1;
    state.players.p1.resources.gold = 5000;
    state = runStrategyTurn(state);
    expect(state.replay).toContainEqual({
      type: 'MARKET_TRADE', castleId: 'p1-castle',
      direction: 'buy', resource: 'essence', amount: 1,
    });
  });

  it('restores Waystation movement only once per hero per day', () => {
    let state = createGame({ seed: 18, p1: 'human', p2: 'human' });
    const station = state.map.objects.find((object): object is Extract<
      MapObject, { kind: 'waystation' }
    > => object.kind === 'waystation')!;
    const hero = activeHero(state);
    hero.position = { x: station.position.x - 1, y: station.position.y };
    hero.movement = 500;
    state = apply(state, { type: 'MOVE_HERO', destination: station.position });
    const restored = activeHero(state).movement;
    expect(restored).toBeGreaterThan(500);
    activeHero(state).position = { x: station.position.x - 1, y: station.position.y };
    activeHero(state).movement = 400;
    state = apply(state, { type: 'MOVE_HERO', destination: station.position });
    expect(activeHero(state).movement).toBeLessThan(restored);
  });

  it('uses Waybread for movement and the Case for a radius-seven reveal', () => {
    let state = createGame({ seed: 19, p1: 'human', p2: 'human' });
    activeHero(state).inventory[0] = { id: 'waybread' };
    const movement = activeHero(state).movement;
    state = apply(state, { type: 'USE_ADVENTURE_ITEM', inventorySlot: 0 });
    expect(activeHero(state).movement).toBe(movement + 600);
    activeHero(state).inventory[0] = { id: 'cartographersCase' };
    const target = { x: 9, y: 10 };
    state = apply(state, {
      type: 'USE_ADVENTURE_ITEM', inventorySlot: 0, target,
    });
    expect(state.players.p1.explored).toContain('16,10');
  });

  it('runs full_heal at turn-advance and restores the Sleeper to full', () => {
    const state = battle('marionette', 'sleeper');
    const sleeper = state.stacks[1];
    sleeper.count = 4;
    sleeper.topHp = 19;
    runTurnAdvancePipeline(state);
    expect(sleeper.count).toBe(10);
    expect(sleeper.topHp).toBe(250);
  });

  it('routes melee into a Mirror-Bound attacker but lets ranged and spells through', () => {
    let state = battle('marionette', 'mirrorBound');
    const attackerHp = state.stacks[0].topHp;
    const defenderHp = state.stacks[1].topHp;
    runAttackPipeline(state, 'attacker-0', 'defender-0');
    expect(state.stacks[1].topHp).toBe(defenderHp);
    expect(state.stacks[0].topHp).toBeLessThan(attackerHp);

    state = battle('longbowman', 'mirrorBound');
    state.stacks[0].position = { x: 0, y: 4 };
    state.stacks[1].position = { x: 12, y: 4 };
    const rangedHp = state.stacks[0].topHp;
    runAttackPipeline(state, 'attacker-0', 'defender-0');
    expect(state.stacks[1].topHp).toBeLessThan(150);
    expect(state.stacks[0].topHp).toBe(rangedHp);

    state = battle('marionette', 'mirrorBound');
    state.attackerHero.knownSpells = ['trial'];
    state.stacks[0].count = 1;
    state.stacks[1].count = 2;
    castSpell(state, {
      type: 'BATTLE_CAST', spellId: 'trial', targetId: 'defender-0',
    });
    expect(state.stacks[1].topHp).toBeLessThan(150);
  });

  it('applies the Mask passive without replacing incoming melee damage', () => {
    const game = createGame({ seed: 15, p1: 'human', p2: 'human' });
    game.players.p2.hero!.artifacts.equipment.misc1 = { id: 'mirrorMask' };
    const state = createBattle(
      makeArmy([{ unitId: 'marionette', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 20 }]),
      game.players.p1.hero!, game.players.p2.hero!,
      {
        kind: 'hero', targetId: 'p2', destination: { x: 4, y: 4 },
        attackerHeroId: game.players.p1.hero!.id,
        defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
      },
      15,
    )[0];
    state.stacks[0].position = { x: 5, y: 4 };
    state.stacks[1].position = { x: 6, y: 4 };
    const attackerHp = state.stacks[0].topHp;
    const defenderCount = state.stacks[1].count;
    runAttackPipeline(state, 'attacker-0', 'defender-0');
    expect(state.stacks[1].count).toBeLessThan(defenderCount);
    expect(state.stacks[0].topHp).toBeLessThan(attackerHp);
  });
});
