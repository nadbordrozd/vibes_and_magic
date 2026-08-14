import { describe, expect, it } from 'vitest';
import { ITEMS, V2_ITEM_ASSET_REQUIREMENTS, validateItems } from '../../content/items';
import { SPELLS } from '../../content/spells';
import { createBorderMarches, validateMap } from '../../content/maps/borderMarches';
import { createCrosstitch } from '../../content/maps/crosstitch';
import { createManywhere } from '../../content/maps/manywhere';
import { makeArmy } from '../army';
import { applyBattleAction, createBattle } from '../combat/battle';
import {
  completeCombatItemUse, legalCombatItemUses, useCombatItem,
} from '../combat/items';
import { applyRoutedCombatDamage } from '../combat/damageRouting';
import { runExternalDeathPipeline } from '../combat/pipeline';
import { castStoredSpell, isUpgraded } from '../combat/spells';
import { createGame } from '../game';
import { useAdventureItem } from '../game/items';
import { guardianIntel } from '../selectors';
import type { BattleState, GameState, Hero, ItemId } from '../types';

const IDS = [
  'vialBorrowedHours', 'wildfireFlask', 'counterfeitCoin', 'graveDustSachet',
  'tuningFork', 'sealingWaxCord', 'ironFilings', 'looseThread', 'ledgerPage',
  'nightjarFeather', 'surveyorsTwine', 'spellbookPage',
] as const satisfies readonly ItemId[];

function fixture(): BattleState {
  const game = createGame({ seed: 98616, p1: 'human', p2: 'human' });
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 12 }, { unitId: 'longbowman', count: 8 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 10 }, { unitId: 'hobbyKnight', count: 6 }]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 98616,
  );
  battle.currentStackId = 'attacker-0';
  battle.obstacles = [];
  battle.tiles = [];
  return battle;
}

function equip(battle: BattleState, id: ItemId): void {
  battle.attackerHero.inventory[0] = { id };
}

function game(): [GameState, Hero] {
  const state = createGame({ seed: 98617, p1: 'human', p2: 'human' });
  return [state, state.players.p1.hero!];
}

describe('doc-63 consumables and Spell Tome support', () => {
  it('authors exactly twelve distinct consumables with flavor and typed staged art', () => {
    expect(new Set(IDS)).toHaveLength(12);
    expect(Object.keys(ITEMS)).toHaveLength(50);
    for (const id of IDS) {
      expect(ITEMS[id]).toMatchObject({ id, kind: 'consumable' });
      expect(ITEMS[id].description.length, id).toBeGreaterThan(20);
      expect(ITEMS[id].flavor.length, id).toBeGreaterThan(10);
      expect(V2_ITEM_ASSET_REQUIREMENTS.find((entry) => entry.canonicalId === `item:${id}`))
        .toMatchObject({ nativeAssetId: `map-object:item:${id}`, introducedBy: 'docs-60-67' });
    }
    expect(V2_ITEM_ASSET_REQUIREMENTS.find((entry) => entry.canonicalId === 'item:spellTome'))
      .toBeDefined();
    expect(() => validateItems()).not.toThrow();
  });

  it('applies Wildfire, counter conversion, school tuning, sealing, and destruction mana exactly', () => {
    const wildfire = fixture();
    equip(wildfire, 'wildfireFlask');
    const primary = wildfire.stacks.find((stack) => stack.id === 'defender-0')!;
    const adjacent = wildfire.stacks.find((stack) => stack.id === 'defender-1')!;
    adjacent.position = { x: primary.position.x - 1, y: primary.position.y };
    useCombatItem(wildfire, { type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: primary.id });
    expect(primary.counters.burn).toBe(5);
    expect(adjacent.counters.burn).toBe(2);

    const filings = fixture();
    equip(filings, 'ironFilings');
    const enemy = filings.stacks.find((stack) => stack.id === 'defender-0')!;
    enemy.counters = { burn: 1, chill: 2, hex: 3, bloom: 1 };
    useCombatItem(filings, { type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: enemy.id });
    expect(enemy.counters).toEqual({ burn: 7, chill: 0, hex: 0, bloom: 0 });

    const tuning = fixture();
    equip(tuning, 'tuningFork');
    useCombatItem(tuning, { type: 'BATTLE_USE_ITEM', inventorySlot: 0, school: 'grave' });
    expect(isUpgraded(tuning, tuning.attackerHero, 'wither')).toBe(true);

    const wax = fixture();
    castStoredSpell(wax, 'attacker', { type: 'BATTLE_CAST', spellId: 'forgefire' }, false);
    equip(wax, 'sealingWaxCord');
    const enchantment = wax.enchantments.attacker[0];
    useCombatItem(wax, { type: 'BATTLE_USE_ITEM', inventorySlot: 0, effectId: enchantment.id });
    expect(wax.sealedEnchantments).toContain(enchantment.id);

    const ledger = fixture();
    equip(ledger, 'ledgerPage');
    ledger.destroyedStacks = 4;
    ledger.attackerHero.mana = 1;
    ledger.attackerHero.manaMaximum = 10;
    useCombatItem(ledger, { type: 'BATTLE_USE_ITEM', inventorySlot: 0 });
    expect(ledger.attackerHero.mana).toBe(10);
  });

  it('bounds Vial grants across spells/items/artifacts and gives Alchemist R3 a second target', () => {
    const capped = fixture();
    equip(capped, 'vialBorrowedHours');
    capped.stacks[0].grantedActionsThisRound = 2;
    expect(legalCombatItemUses(capped).some((action) => action.inventorySlot === 0
      && action.targetId === capped.stacks[0].id)).toBe(false);
    expect(() => useCombatItem(capped, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: capped.stacks[0].id,
    })).toThrow(/not legal/);

    const alchemist = fixture();
    equip(alchemist, 'vialBorrowedHours');
    alchemist.attackerHero.skills.alchemist = 3;
    const action = legalCombatItemUses(alchemist).find((candidate) =>
      candidate.inventorySlot === 0 && candidate.targetId === 'attacker-0'
      && candidate.secondaryTargetId === 'attacker-1')!;
    useCombatItem(alchemist, action);
    expect(alchemist.activeGrantedAction?.sourceSpellId).toBe('vialBorrowedHours');
    expect(alchemist.pendingGrantedActions).toContainEqual(expect.objectContaining({
      targetId: 'attacker-1', sourceSpellId: 'vialBorrowedHours',
    }));
  });

  it('copies the enemy hero’s last face free at the user’s Spell Power and rejects forgery', () => {
    const battle = fixture();
    equip(battle, 'counterfeitCoin');
    battle.attackerHero.spellPower = 7;
    battle.lastHeroSpellAction.defender = {
      action: { type: 'BATTLE_CAST', spellId: 'forgeSpark', targetId: 'attacker-0' },
      plus: false, manaSpent: 4,
    };
    const before = battle.attackerHero.mana;
    useCombatItem(battle, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'defender-0',
    });
    expect(battle.attackerHero.mana).toBe(before);
    // Forge-Spark is Spell-Power-scaled but printed-capped at Burn 4.
    expect(battle.stacks.find((stack) => stack.id === 'defender-0')!.counters.burn).toBe(4);

    const forged = fixture();
    equip(forged, 'counterfeitCoin');
    forged.lastHeroSpellAction.defender = battle.lastHeroSpellAction.defender;
    expect(() => useCombatItem(forged, {
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, targetId: 'attacker-0',
    })).toThrow(/not legal/);
    expect(forged.attackerHero.inventory[0]).toMatchObject({ id: 'counterfeitCoin' });
  });

  it('completes Counterfeit and Loose Thread staged placements deterministically', () => {
    const coin = fixture();
    equip(coin, 'counterfeitCoin');
    coin.lastHeroSpellAction.defender = {
      action: { type: 'BATTLE_CAST', spellId: 'blink', targetId: 'attacker-0' },
      plus: false, manaSpent: 10,
    };
    const option = legalCombatItemUses(coin).find((action) => action.inventorySlot === 0)!;
    const first = completeCombatItemUse(coin, option);
    const second = completeCombatItemUse(coin, option);
    expect(first).toEqual(second);
    expect(first?.positions).toHaveLength(1);
    useCombatItem(coin, first!);

    const thread = fixture();
    equip(thread, 'looseThread');
    const threadOption = legalCombatItemUses(thread).find((action) =>
      action.inventorySlot === 0 && action.targetId === 'attacker-0')!;
    const completed = completeCombatItemUse(thread, threadOption)!;
    expect(completed.positions).toHaveLength(1);
    useCombatItem(thread, completed);
    expect(thread.stacks[0].position).toEqual(completed.positions![0]);

    const walls = fixture();
    equip(walls, 'chalkOfWalls');
    const wallAction = completeCombatItemUse(walls, legalCombatItemUses(walls)
      .find((action) => action.inventorySlot === 0)!)!;
    expect(wallAction.positions).toHaveLength(3);
    useCombatItem(walls, wallAction);
    expect(walls.tiles.filter((tile) => tile.type === 'wall')).toHaveLength(3);
  });

  it('resurrects the next ordinary destroyed company on the claimant side at 25%', () => {
    const battle = fixture();
    equip(battle, 'graveDustSachet');
    useCombatItem(battle, { type: 'BATTLE_USE_ITEM', inventorySlot: 0 });
    const target = battle.stacks.find((stack) => stack.id === 'defender-0')!;
    const countBefore = target.count;
    const hpBefore = (target.count - 1) * 5 + target.topHp;
    applyRoutedCombatDamage(battle, target, 99_999, { recordDestruction: false });
    runExternalDeathPipeline(battle, target, hpBefore, countBefore, 'spell-impact', 'attacker');
    expect(target).toMatchObject({ side: 'attacker', count: Math.ceil(countBefore * 0.25) });
    expect(target.originalSide).toBe('defender');
    expect(battle.pendingGraveDust).toBeNull();
  });

  it('round-trips a staged item action and battle state without replay drift', () => {
    const battle = fixture();
    equip(battle, 'looseThread');
    const draft = legalCombatItemUses(battle).find((action) =>
      action.inventorySlot === 0 && action.targetId === 'attacker-0')!;
    const action = completeCombatItemUse(battle, draft)!;
    const serializedBattle = JSON.parse(JSON.stringify(battle)) as BattleState;
    const serializedAction = JSON.parse(JSON.stringify(action)) as typeof action;
    expect(applyBattleAction(battle, action))
      .toEqual(applyBattleAction(serializedBattle, serializedAction));
  });

  it('uses all three adventure consumables deterministically and preserves their state in JSON', () => {
    const [night, hero] = game();
    hero.inventory[0] = { id: 'nightjarFeather' };
    useAdventureItem(night, 0);
    expect(hero.adventureEffects.ignoreGuardianAggroThroughDay).toBe(night.day);

    const [survey, surveyHero] = game();
    const guardian = survey.map.objects.find((object) => object.kind === 'guardian')!;
    surveyHero.inventory[0] = { id: 'surveyorsTwine' };
    useAdventureItem(survey, 0, guardian.position);
    expect(guardianIntel(survey, guardian)?.exact).toBe(true);
    expect(survey.players.p1.explored).toContain(`${guardian.position.x},${guardian.position.y}`);

    const [page, pageHero] = game();
    pageHero.knownSpells = ['rally'];
    pageHero.inventory[0] = { id: 'spellbookPage' };
    const before = [...pageHero.knownSpells];
    useAdventureItem(page, 0);
    expect(pageHero.knownSpells).toHaveLength(before.length + 1);
    expect(JSON.parse(JSON.stringify(page)).players.p1.hero.adventureEffects)
      .toEqual(pageHero.adventureEffects);

    const impossible = createGame({ seed: 98617, p1: 'human', p2: 'human' });
    const impossibleHero = impossible.players.p1.hero!;
    impossibleHero.knownSpells = Object.keys(SPELLS) as never;
    impossibleHero.inventory[0] = { id: 'spellbookPage' };
    const rng = impossible.rng;
    expect(() => useAdventureItem(impossible, 0)).toThrow(/No unknown/);
    expect(impossible.rng).toBe(rng);
    expect(impossibleHero.inventory[0]).toMatchObject({ id: 'spellbookPage' });
  });

  it('authors every Tome source, validates maps, and keeps source restrictions deterministic', () => {
    const maps = [createBorderMarches(42), createCrosstitch(42), createManywhere(42)];
    maps.forEach((map) => expect(() => validateMap(map)).not.toThrow());
    const unguarded = createManywhere(42);
    unguarded.objects = unguarded.objects.filter((object) =>
      object.kind !== 'guardian' || object.protects !== 'manywhere-pages');
    expect(() => validateMap(unguarded)).toThrow(/requires a guarding company/);
    const authored = maps.flatMap((map) => map.objects.flatMap((object) => {
      if (object.kind === 'item') return [object.item];
      if (object.kind === 'barrowField') return [object.scroll];
      if (object.kind === 'lock') return object.reward.items ?? [];
      return [];
    })).filter((item) => item.id === 'spellTome');
    expect(new Set(authored.map((item) => item.tomeSource)))
      .toEqual(new Set(['lock', 'barrow']));
    expect(maps.flatMap((map) => map.objects)
      .some((object) => object.kind === 'reliquaryCairn' && object.tomeSpellId)).toBe(true);
    expect(maps.flatMap((map) => map.objects)
      .some((object) => object.kind === 'reliquaryOfPages' && object.tomeSpellId)).toBe(true);
  });
});
