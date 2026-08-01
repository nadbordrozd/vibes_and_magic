import { describe, expect, it } from 'vitest';
import { MARKET_BUY_GOLD } from '../../content/marketplace';
import { skillWeight } from '../../content/skills';
import { makeArmy } from '../army';
import { createBattle } from '../combat/battle';
import { legalCombatItemUses } from '../combat/items';
import {
  addBattleCounter, chooseCounterRedirect, clearCounters,
} from '../combat/magicEffects';
import { applyRoundMorale } from '../combat/round';
import { castSpell } from '../combat/spells';
import { apply, createGame } from '../game';
import { checkLevel } from '../game/levelUps';
import { palimpsestForget } from '../game/palimpsest';
import {
  applyRansomer, learnCastSpells,
} from '../game/outcomes';
import { commandMeter } from '../heroBehaviors';
import { movementCost } from '../map/pathfinding';
import { bestLevelOption, drawLevelOptions } from '../progression';
import { enemyHeroIntel } from '../selectors';
import { diplomacyTerms } from '../skills/diplomacy';
import {
  beastRecruitmentMultiplier, beastSpeedBonus, canCastIntoGarrison,
  canClaimWeeklyBeast, makerWallHitPoints, preAssaultWallBreaches,
  wallsDefenseMultiplier, wardenGarrisonCommand, wardenGarrisonStats,
} from '../skills/expansionHooks';
import type {
  GameState, Hero, MapObject,
} from '../types';

function owner(state: GameState): Hero {
  return state.players.p1.hero!;
}

function combatWith(
  attacker: Hero,
  defender: Hero,
  attackerArmy = makeArmy([
    { unitId: 'yeoman', count: 10 },
    { unitId: 'longbowman', count: 10 },
  ]),
) {
  return createBattle(
    attackerArmy,
    makeArmy([{ unitId: 'tinSoldier', count: 20 }]),
    attacker, defender,
    {
      kind: 'hero', targetId: defender.id,
      destination: { x: 4, y: 4 }, attackerHeroId: attacker.id,
      defenderHeroId: defender.id, defenderPlayerId: 'p2',
    },
    900,
  )[0];
}

describe('Phase A original skill rank-three behavior', () => {
  it('exposes Scouting R3 enemy spellbook, items, and mana', () => {
    const state = createGame({ seed: 900, p1: 'human', p2: 'human' });
    const viewer = owner(state);
    const target = state.players.p2.hero!;
    viewer.skills.scouting = 3;
    target.inventory[0] = { id: 'waybread' };
    expect(enemyHeroIntel(viewer, target)).toMatchObject({
      mana: target.mana,
      spells: target.knownSpells,
      items: target.inventory,
    });
  });

  it('keeps Diplomacy R2 recruitment while adding the R3 stand-aside threshold', () => {
    const state = createGame({ seed: 901, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.diplomacy = 3;
    hero.army = makeArmy([{ unitId: 'yeoman', count: 100 }]);
    const guardian: Extract<MapObject, { kind: 'guardian' }> = {
      id: 'test-guardian', kind: 'guardian', position: { x: 1, y: 1 },
      army: [{ unitId: 'tinSoldier', count: 1 }],
    };
    expect(diplomacyTerms(hero, guardian)).toMatchObject({
      canStandAside: true,
      recruitCost: 165,
    });
  });

  it('declares Attunement R3 resonance once per day', () => {
    let state = createGame({ seed: 902, p1: 'human', p2: 'human' });
    owner(state).skills.attunement = 3;
    state = apply(state, {
      type: 'DECLARE_RESONANCE', heroId: owner(state).id, school: 'craft',
    });
    expect(owner(state).declaredResonance).toEqual({ day: 1, school: 'craft' });
    expect(() => apply(state, {
      type: 'DECLARE_RESONANCE', heroId: owner(state).id, school: 'grave',
    })).toThrow();
  });

  it('learns every unknown enemy cast through Spellthief R3', () => {
    const state = createGame({ seed: 903, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.spellthief = 3;
    learnCastSpells(hero, ['quiet', 'wither', 'quiet']);
    expect(hero.knownSpells).toEqual(expect.arrayContaining(['quiet', 'wither']));
    expect(hero.knownSpells.filter((spell) => spell === 'quiet')).toHaveLength(1);
  });

  it('keeps the remaining numeric R3 contracts cumulative', () => {
    const state = createGame({ seed: 904, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.wayfaring = 3;
    hero.skills.command = 3;
    state.map.terrain[1][1] = 'forest';
    expect(movementCost(
      state.map, { x: 0, y: 0 }, { x: 1, y: 1 }, hero,
    )).toBe(90);
    expect(commandMeter(hero)).toBe(10);
  });
});

describe('Phase A new skill rank-three behavior', () => {
  it('uses the documented class-flavor draft weights', () => {
    expect(skillWeight('command', 'banneret')).toBe(6);
    expect(skillWeight('vanguard', 'banneret')).toBe(6);
    expect(skillWeight('warden', 'banneret')).toBe(6);
    expect(skillWeight('attunement', 'guildmaster')).toBe(6);
    expect(skillWeight('twicetold', 'guildmaster')).toBe(6);
    expect(skillWeight('palimpsest', 'guildmaster')).toBe(6);
    expect(skillWeight('alchemist', 'banneret')).toBe(3);
    const state = createGame({ seed: 916, p1: 'human', p2: 'human' });
    expect(bestLevelOption(owner(state), ['diplomacy', 'attack'])).toBe('attack');
    expect(bestLevelOption(owner(state), ['spellthief', 'defense'])).toBe('defense');
    expect(bestLevelOption(owner(state), ['palimpsest', 'knowledge'])).toBe('knowledge');
  });

  it('Alchemist R3 offers a second potion target', () => {
    const state = createGame({ seed: 905, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.alchemist = 3;
    hero.inventory[0] = { id: 'potionOfVigor' };
    const battle = combatWith(hero, state.players.p2.hero!);
    expect(legalCombatItemUses(battle).some((action) =>
      action.inventorySlot === 0 && Boolean(action.secondaryTargetId))).toBe(true);
  });

  it('Chronicler R3 deals four and exposes its one-shot reroll', () => {
    const state = createGame({ seed: 906, p1: 'human', p2: 'human' });
    owner(state).skills.chronicler = 3;
    const [cards] = drawLevelOptions(owner(state), 4);
    expect(cards).toHaveLength(4);
    owner(state).xp = 100_000;
    checkLevel(state, 'p1');
    expect(state.pendingChoice?.kind === 'level'
      && state.pendingChoice.canReroll).toBe(true);
  });

  it('Palimpsest R3 can draw from a cleared shrine school', () => {
    const state = createGame({ seed: 907, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.palimpsest = 3;
    const shrine = state.map.objects.find(
      (object): object is Extract<MapObject, { kind: 'shrine' }> =>
        object.kind === 'shrine',
    )!;
    shrine.cleared = true;
    hero.position = { ...shrine.position };
    palimpsestForget(state, shrine.id, hero.knownSpells[0]);
    expect(state.pendingChoice).toMatchObject({ kind: 'palimpsest' });
  });

  it('Twicetold R3 upgrades and saves the first twister hero-act', () => {
    const state = createGame({ seed: 908, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.twicetold = 3;
    hero.knownSpells.push('amplify');
    const battle = combatWith(hero, state.players.p2.hero!);
    battle.stacks[1].counters.hex = 2;
    castSpell(battle, {
      type: 'BATTLE_CAST', spellId: 'amplify',
      effectId: `counter:${battle.stacks[1].id}:hex`,
    });
    expect(battle.stacks[1].counters.hex).toBe(5);
    expect(battle.twisterActSaved.attacker).toBe(true);
    expect(battle.castRound.attacker).toBe(0);
  });

  it('Curse-Eater R3 redirects the first hostile Hex or Burn', () => {
    const state = createGame({ seed: 909, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.curseEater = 3;
    const battle = combatWith(hero, state.players.p2.hero!);
    chooseCounterRedirect(battle, 'attacker', battle.stacks[1].id);
    addBattleCounter(battle, battle.stacks[0], 'hex', 3, 'defender');
    expect(battle.stacks[0].counters.hex).toBe(0);
    expect(battle.stacks[1].counters.hex).toBe(3);
    battle.stacks[0].morale = 0;
    battle.stacks[0].counters.chill = 2;
    clearCounters(battle.stacks[0], battle);
    expect(battle.stacks[0].morale).toBe(10);
  });

  it('Ritualist R3 replaces one pre-rolled omen once per game', () => {
    let state = createGame({ seed: 910, p1: 'human', p2: 'human' });
    owner(state).skills.ritualist = 3;
    state = apply(state, {
      type: 'CHOOSE_NEXT_OMEN', heroId: owner(state).id, omen: 'plenty',
    });
    expect(state.nextOmen).toBe('plenty');
    expect(owner(state).ritualistOmenChosen).toBe(true);
  });

  it('Peddler R3 halves marketplace buy rates', () => {
    const state = createGame({ seed: 911, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.peddler = 3;
    state.castles[0].buildings.push('marketplace');
    const before = state.players.p1.resources.gold;
    const next = apply(state, {
      type: 'MARKET_TRADE', castleId: state.castles[0].id,
      direction: 'buy', resource: 'timber', amount: 1,
    });
    expect(before - next.players.p1.resources.gold)
      .toBe(Math.floor(MARKET_BUY_GOLD.timber * 0.5));
  });

  it('Ransomer R3 doubles the defeated hero re-hire multiplier', () => {
    const state = createGame({ seed: 912, p1: 'human', p2: 'human' });
    const winner = owner(state);
    const loser = state.players.p2.hero!;
    winner.skills.ransomer = 3;
    applyRansomer(state, winner, loser);
    expect(loser.rehireMultiplier).toBe(2);
  });

  it('Vanguard R3 designates a stack to act first', () => {
    const state = createGame({ seed: 913, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.vanguard = 3;
    const battle = combatWith(hero, state.players.p2.hero!);
    battle.vanguardStack.attacker = 'attacker-1';
    applyRoundMorale(battle);
    expect(battle.stacks.find((stack) => stack.id === 'attacker-1')?.actsFirst)
      .toBe(true);
  });

  it('Provisioner R3 gains a seeded common item at week start', () => {
    let state = createGame({ seed: 914, p1: 'human', p2: 'human' });
    owner(state).skills.provisioner = 3;
    for (let turn = 0; turn < 14; turn += 1) {
      state = apply(state, { type: 'END_TURN' });
    }
    expect(owner(state).inventory.filter(Boolean)).toHaveLength(1);
  });

  it('keeps future-content Beastmaster, Warden, and Siegewright hooks live', () => {
    const state = createGame({ seed: 915, p1: 'human', p2: 'human' });
    const hero = owner(state);
    hero.skills.beastmaster = 3;
    expect(beastRecruitmentMultiplier(hero)).toBe(0.75);
    expect(beastSpeedBonus(hero)).toBe(1);
    expect(canClaimWeeklyBeast(hero, 100, 30, 2, 1)).toBe(true);
    hero.skills.warden = 3;
    hero.skills.command = 3;
    expect(wardenGarrisonStats(hero)).toMatchObject({
      attack: hero.attack, defense: hero.defense,
    });
    expect(wardenGarrisonCommand(hero)).toBe(3);
    expect(canCastIntoGarrison(hero, { x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
    hero.skills.siegewright = 3;
    expect(wallsDefenseMultiplier(hero)).toBe(0.5);
    expect(makerWallHitPoints(hero)).toBe(40);
    expect(preAssaultWallBreaches(hero)).toBe(1);
  });
});
