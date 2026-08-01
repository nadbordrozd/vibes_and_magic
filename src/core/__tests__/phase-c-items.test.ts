import { describe, expect, it } from 'vitest';
import { ITEMS, validateItems } from '../../content/items';
import { makeArmy } from '../army';
import { createBattle } from '../combat/battle';
import { useCombatItem } from '../combat/items';
import { createGame } from '../game';
import { useAdventureItem } from '../game/items';
import { buyMarketScroll, refreshMarketScrolls, sellMarketItem } from '../game/marketplace';
import { castleEntrance } from '../map/occupancy';

function battle() {
  const game = createGame({ seed: 601, p1: 'human', p2: 'human' });
  const state = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 10 }, { unitId: 'longbowman', count: 5 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'hero', destination: { x: 2, y: 2 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 601,
  )[0];
  state.currentStackId = 'attacker-0';
  return state;
}

describe('Phase C complete consumable catalog', () => {
  it('defines fourteen combat and ten adventure consumables plus the scroll rule', () => {
    const definitions = Object.values(ITEMS);
    expect(definitions.filter((item) => item.use === 'combat'
      && item.behavior !== 'scroll')).toHaveLength(14);
    expect(definitions.filter((item) => item.use === 'adventure'
      && item.id !== 'overseersCharter')).toHaveLength(10);
    expect(ITEMS.spellScroll.behavior).toBe('scroll');
    expect(() => validateItems()).not.toThrow();
  });

  it('casts any stored spell from a generic scroll', () => {
    const state = battle();
    state.attackerHero.inventory[0] = {
      id: 'spellScroll', storedSpellId: 'bloom', plus: true,
    };
    useCombatItem(state, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    });
    expect(state.stacks[0].counters.bloom).toBe(4);
    expect(state.attackerHero.inventory[0]).toBeNull();
  });

  it('uses speed, hostile, global, and resurrection combat items', () => {
    const speed = battle();
    speed.attackerHero.inventory[0] = { id: 'haresHeel' };
    useCombatItem(speed, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    });
    expect(speed.stacks[0].effects.some((effect) =>
      effect.spellId === 'quicksilver')).toBe(true);

    const dust = battle();
    dust.attackerHero.inventory[0] = { id: 'graveDust' };
    useCombatItem(dust, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'defender-0',
    });
    expect(dust.stacks[2].counters.hex).toBe(3);

    const whistle = battle();
    whistle.attackerHero.inventory[0] = { id: 'bannerWhistle' };
    useCombatItem(whistle, { type: 'BATTLE_USE_ITEM', inventorySlot: 0 });
    expect(whistle.stacks[0].morale).toBe(15);
    expect(whistle.stacks[1].morale).toBe(15);

    const candle = battle();
    candle.stacks[0].count = 5;
    candle.attackerHero.inventory[0] = { id: 'secondCandle' };
    useCombatItem(candle, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    });
    expect(candle.stacks[0].count).toBe(6);
  });

  it('uses movement, recall, draft, reinforcement, and militia adventure items', () => {
    const state = createGame({ seed: 602, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    hero.inventory[0] = { id: 'saltedMeat' };
    const movement = hero.movement;
    useAdventureItem(state, 0, undefined, hero.id);
    expect(hero.movement).toBe(movement + 300);

    hero.position = { x: 12, y: 10 };
    hero.inventory[0] = { id: 'hearthstone' };
    useAdventureItem(state, 0);
    expect(hero.position).toEqual(castleEntrance(state.castles[0]));

    hero.inventory[0] = { id: 'beggarsCoin' };
    useAdventureItem(state, 0);
    expect(hero.draftBonusCards).toBe(1);

    hero.inventory[0] = { id: 'foundersTin' };
    useAdventureItem(state, 0);
    expect(hero.army.some((stack) => stack?.unitId === 'tinSoldier')).toBe(true);

    state.players.p1.resources.gold = 1_000_000;
    state.castles[0].available[0] = 3;
    hero.inventory[0] = { id: 'militiaWrit' };
    useAdventureItem(state, 0, undefined, undefined, state.castles[0].id);
    expect(state.castles[0].available[0]).toBe(0);
    expect(state.castles[0].garrison.some((stack) => stack?.count === 3)).toBe(true);
  });

  it('stocks and trades a generic weekly scroll for a rank-two Peddler', () => {
    const state = createGame({ seed: 603, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    hero.skills.peddler = 2;
    state.castles[0].buildings.push('marketplace');
    refreshMarketScrolls(state);
    expect(state.castles[0].marketScroll).toMatchObject({ id: 'spellScroll' });
    buyMarketScroll(state, state.castles[0].id);
    const slot = hero.inventory.findIndex(Boolean);
    const gold = state.players.p1.resources.gold;
    sellMarketItem(state, state.castles[0].id, slot);
    expect(state.players.p1.resources.gold).toBe(gold + 600);
  });
});
