import { describe, expect, it } from 'vitest';
import { SPELL_IDS, SPELLS } from '../../content/spells';
import { makeArmy } from '../army';
import {
  armyAfterBattle, battleReachableHexes, createBattle,
} from '../combat/battle';
import { runAttackPipeline } from '../combat/pipeline';
import {
  addCounter, addSpellCounter, addTimedEffect, beginStackTurn, endStackTurn,
  scaledCounter, scaledDuration, scaledPercent,
} from '../combat/magicEffects';
import { castSpell, legalSpellCasts } from '../combat/spells';
import { P2_SPELL_AUDIT_IDS } from '../../content/spells/p2';
import { createBattleTile, placeBattleTile } from '../combat/tiles';
import { applyEffectTwister } from '../combat/twisters';
import { createGame } from '../game';
import { recoverSpareParts } from '../game/outcomes';
import type {
  Action, BattleState, SpellId,
} from '../types';

type Cast = Extract<Action, { type: 'BATTLE_CAST' }>;
const COMBAT_SPELL_IDS = SPELL_IDS.filter((id) =>
  !['adventure', 'topology'].includes(SPELLS[id].kind));

function magicBattle(): BattleState {
  const game = createGame({ seed: 91, p1: 'human', p2: 'ai' });
  const state = createBattle(
    makeArmy([
      { unitId: 'yeoman', count: 2 },
      { unitId: 'longbowman', count: 2 },
    ]),
    makeArmy([
      { unitId: 'stuffedSentinel', count: 10 },
      { unitId: 'tinSoldier', count: 5 },
    ]),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'p2-hero', destination: { x: 6, y: 6 },
      attackerHeroId: 'p1-hero', defenderHeroId: 'p2-hero',
      defenderPlayerId: 'p2',
    },
    91,
  )[0];
  state.attackerHero.knownSpells = [...SPELL_IDS];
  state.attackerHero.mana = 100;
  return state;
}

function preparedCast(id: SpellId, upgraded: boolean): [BattleState, Cast] {
  const state = magicBattle();
  if (upgraded) state.attackerHero.upgradedSpells = [id];
  const ally = state.stacks.find((stack) => stack.side === 'attacker')!;
  const ally2 = state.stacks.find((stack) =>
    stack.side === 'attacker' && stack.id !== ally.id)!;
  const enemy = state.stacks.find((stack) => stack.side === 'defender')!;
  const action: Cast = { type: 'BATTLE_CAST', spellId: id, targetId: enemy.id };
  if (['rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
    'ward', 'quicksilver', 'mournersVeil', 'remembrance', 'clarion',
    'bloom', 'shedSkin', 'hourglassCrack', 'loyalUntoDeath', 'steadyHands',
    'secondWind', 'reprise', 'rivet', 'whetstone', 'shrapnel', 'clockworkDouble',
    'overclock'].includes(id)) {
    action.targetId = ally.id;
  }
  if (id === 'rally') action.secondaryTargetId = ally2.id;
  if (id === 'steadyHands' && upgraded) action.secondaryTargetId = ally2.id;
  if (id === 'secondWind') {
    state.initialCounts[ally.id] = 10;
    ally.count = 1;
  }
  if (id === 'amplify') {
    addCounter(enemy, 'hex', 2);
    action.effectId = `counter:${enemy.id}:hex`;
  }
  if (id === 'reflect') {
    const effect = addTimedEffect(ally, 'mournersVeil', 2, 20, true, 'attacker');
    action.effectId = `timed:${ally.id}:${effect.id}`;
    action.targetId = ally2.id;
    action.secondaryTargetId = ally.id;
  }
  if (id === 'sour') {
    addCounter(enemy, 'bloom', 3);
    action.effectId = `counter:${enemy.id}:bloom`;
  }
  if (id === 'unmake') {
    addCounter(enemy, 'burn', 3);
    action.effectId = `counter:${enemy.id}:burn`;
    if (upgraded) action.targetId = ally.id;
  }
  if (id === 'overgrow') {
    addCounter(enemy, 'hex', 2);
    action.effectId = `counter:${enemy.id}:hex`;
  }
  if (id === 'wallOfTheMaker') {
    action.positions = [{ x: 5, y: 1 }, { x: 5, y: 3 }, { x: 5, y: 4 }];
  }
  if (id === 'detonate') addCounter(enemy, 'burn', 3);
  if (id === 'clockworkDouble') action.positions = [{ x: 3, y: 3 }];
  if (id === 'blink') {
    action.positions = [{ x: 8, y: 3 }];
    if (upgraded) action.actImmediately = true;
  }
  if (id === 'thicket') {
    action.positions = [{ x: 4, y: 1 }, { x: 4, y: 3 }, { x: 4, y: 5 }];
  }
  if (id === 'shedSkin') addCounter(ally, 'burn', 2);
  if (id === 'borrowShape') {
    enemy.position = { x: ally.position.x + 1, y: ally.position.y };
    action.targetId = ally.id;
    action.secondaryTargetId = enemy.id;
  }
  if (id === 'echo') {
    state.lastSpellCast = { spellId: 'forgeSpark', plus: false, manaSpent: 3 };
  }
  if (id === 'remembrance') {
    state.initialCounts[ally.id] = 10;
    ally.count = 5;
  }
  if (['tithe', 'graveBargain', 'sapAndSinew'].includes(id)) action.targetId = ally.id;
  if (id === 'puppetStrings') {
    enemy.count = 1; enemy.topHp = 1;
  }
  if (id === 'shedSkin') {
    const burnId = `counter:${ally.id}:burn`;
    action.targetId = ally.id; action.effectId = burnId;
    if (upgraded) {
      enemy.position = { x: ally.position.x + 1, y: ally.position.y };
      action.secondaryTargetId = enemy.id;
    }
  }
  const canonicalP1 = [
    'tithe', 'yoke', 'graveBargain', 'puppetStrings', 'bramblelash', 'wildcall',
    'sapAndSinew', 'verdantSurge', 'theTurningYear', 'shedSkin', 'hedgerowMarch',
  ].includes(id) || (P2_SPELL_AUDIT_IDS as readonly SpellId[]).includes(id)
    ? legalSpellCasts(state).find((candidate) => candidate.spellId === id) : undefined;
  if (canonicalP1) {
    delete action.targetId; delete action.secondaryTargetId; delete action.effectId;
    delete action.counterId; delete action.replaceEnchantment; delete action.positions;
    Object.assign(action, canonicalP1);
  }
  if (id === 'bramblelash' && !upgraded) action.positions = [{ x: enemy.position.x - 1, y: enemy.position.y }];
  if (id === 'wildcall') action.positions = [{ x: 5, y: 4 }];
  return [state, action];
}

describe('spell engine', () => {
  it('applies the default Spell Power scaling rules', () => {
    expect(scaledDuration(2, 12)).toBe(4);
    expect(scaledCounter(3, 10)).toBe(5);
    expect(scaledPercent(8, 5)).toBe(10);
  });

  it('scales spell counters by default and permits an explicit catalog opt-out', () => {
    const state = magicBattle();
    const stack = state.stacks.find((candidate) => candidate.side === 'defender')!;
    state.attackerHero.spellPower = 10;
    addSpellCounter(state, stack, 'burn', 3, 'attacker');
    expect(stack.counters.burn).toBe(5);
    stack.counters.burn = 0;
    addSpellCounter(state, stack, 'burn', 3, 'attacker', { scalesWithSpellPower: false });
    expect(stack.counters.burn).toBe(3);
  });

  it('ticks and uniformly decays counters at stack turn boundaries', () => {
    const state = magicBattle();
    const stack = state.stacks[0];
    stack.counters = { burn: 3, chill: 2, hex: 1, bloom: 0 };
    const hp = stack.topHp;
    beginStackTurn(state, stack);
    expect(stack.topHp).toBeLessThan(hp);
    endStackTurn(state, stack);
    expect(stack.counters).toEqual({ burn: 2, chill: 1, hex: 0, bloom: 0 });
  });

  it('allows only one cast per side per round without consuming the unit action', () => {
    const state = magicBattle();
    castSpell(state, { type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0' });
    expect(state.currentStackId).toBe('attacker-0');
    expect(() => castSpell(state, {
      type: 'BATTLE_CAST', spellId: 'blessing', targetId: 'attacker-0',
    })).toThrow('cannot be cast');
  });

  it('resonance temporarily resolves a Standard spell with its Upgraded rules', () => {
    const state = magicBattle();
    state.resonance = 'craft';
    castSpell(state, {
      type: 'BATTLE_CAST', spellId: 'forgeSpark', targetId: 'defender-0',
    });
    expect(state.stacks.find((stack) => stack.id === 'defender-0')!.counters.burn).toBe(4);
  });

  it.each(COMBAT_SPELL_IDS)('%s Standard rules resolve', (id) => {
    const [state, action] = preparedCast(id, false);
    expect(() => castSpell(state, action)).not.toThrow();
    expect(state.log.at(-1)).toContain(SPELLS[id].name);
  });

  it.each(COMBAT_SPELL_IDS)('%s Upgraded rules resolve', (id) => {
    const [state, action] = preparedCast(id, true);
    expect(() => castSpell(state, action)).not.toThrow();
    expect(state.log.at(-1)).toContain(`${SPELLS[id].name}+`);
  });

  it('defender-side soft_body beats Blessing range positioning', () => {
    const state = magicBattle();
    const attacker = state.stacks[0];
    const defender = state.stacks.find((stack) => stack.unitId === 'stuffedSentinel')!;
    attacker.unitId = 'lanceKnight';
    attacker.count = 1;
    attacker.topHp = 45;
    defender.count = 1;
    defender.topHp = 70;
    state.attackerHero.attack = 0;
    state.defenderHero = null;
    addTimedEffect(attacker, 'blessing', 99, 1, true, 'attacker');
    defender.position = { x: 1, y: attacker.position.y };
    runAttackPipeline(state, attacker.id, defender.id);
    expect(defender.topHp).toBe(63);
  });

  it('Amplify doubles a Hex pile and Sour inverts Bloom', () => {
    const state = magicBattle();
    const enemy = state.stacks.find((stack) => stack.side === 'defender')!;
    addCounter(enemy, 'hex', 3);
    castSpell(state, {
      type: 'BATTLE_CAST', spellId: 'amplify',
      effectId: `counter:${enemy.id}:hex`,
    });
    expect(enemy.counters.hex).toBe(6);
    state.castRound.attacker = 0;
    addCounter(enemy, 'bloom', 2);
    castSpell(state, {
      type: 'BATTLE_CAST', spellId: 'sour',
      effectId: `counter:${enemy.id}:bloom`,
    });
    expect(enemy.counters.bloom).toBe(0);
    expect(enemy.counters.hex).toBe(8);
  });

  it('does not apply Spell Power a second time when twisters move existing counter magnitude', () => {
    const sour = magicBattle();
    sour.attackerHero.spellPower = 50;
    const sourSource = sour.stacks.find((stack) => stack.side === 'defender')!;
    sourSource.counters.bloom = 3;
    applyEffectTwister(sour, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'sour',
      effectId: `counter:${sourSource.id}:bloom`,
    }, 'sour', false);
    expect(sourSource.counters).toMatchObject({ bloom: 0, hex: 3 });

    const reflect = magicBattle();
    reflect.attackerHero.spellPower = 50;
    const reflectSource = reflect.stacks.find((stack) => stack.side === 'defender')!;
    const reflectTarget = reflect.stacks.find((stack) => stack.side === 'attacker')!;
    reflectSource.counters.chill = 4;
    applyEffectTwister(reflect, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'reflect', targetId: reflectTarget.id,
      effectId: `counter:${reflectSource.id}:chill`,
    }, 'reflect', false);
    expect(reflectTarget.counters.chill).toBe(4);

    const overgrow = magicBattle();
    overgrow.attackerHero.spellPower = 50;
    const overgrowSource = overgrow.stacks.find((stack) => stack.side === 'attacker')!;
    const overgrowTarget = overgrow.stacks.find((stack) =>
      stack.side === 'attacker' && stack.id !== overgrowSource.id)!;
    overgrowTarget.position = {
      x: overgrowSource.position.x + 1, y: overgrowSource.position.y,
    };
    overgrowSource.counters.hex = 2;
    applyEffectTwister(overgrow, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'overgrow',
      effectId: `counter:${overgrowSource.id}:hex`,
    }, 'overgrow', false);
    expect(overgrowTarget.counters.hex).toBe(2);
  });

  it('Sour+ destroys Forgefire and Hexes every enemy stack', () => {
    const state = magicBattle();
    state.enchantments.defender.push({
      id: 'forge', spellId: 'forgefire', side: 'defender',
      multiplier: 1, upgraded: false,
    });
    state.attackerHero.upgradedSpells = ['sour'];
    castSpell(state, {
      type: 'BATTLE_CAST', spellId: 'sour',
      effectId: 'enchantment:defender:forge',
    });
    expect(state.enchantments.defender).toHaveLength(0);
    expect(state.stacks.filter((stack) => stack.side === 'defender')
      .every((stack) => stack.counters.hex === 3)).toBe(true);
  });

  it('Forgefire doubles Burn damage and its Upgraded rules stop decay', () => {
    const state = magicBattle();
    const target = state.stacks.find((stack) => stack.side === 'defender')!;
    target.count = 1;
    target.topHp = 70;
    target.counters.burn = 5;
    state.enchantments.attacker.push({
      id: 'fire', spellId: 'forgefire', side: 'attacker',
      multiplier: 1, upgraded: true,
    });
    beginStackTurn(state, target);
    expect(target.topHp).toBe(60);
    endStackTurn(state, target);
    expect(target.counters.burn).toBe(5);
  });

  it('Wall hexes block pathing and summons never enter persistent armies', () => {
    const state = magicBattle();
    placeBattleTile(
      state,
      createBattleTile(state, 'wall', { x: 1, y: 4 }, -1, 'attacker'),
    );
    expect(battleReachableHexes(state, state.stacks[0])).not.toContainEqual({ x: 1, y: 4 });
    state.stacks.push({
      ...state.stacks[0], id: 'summoned', slot: 6, summoned: true, count: 4,
    });
    expect(armyAfterBattle(state, 'attacker').some((stack) =>
      stack?.count === 4 && stack.unitId === state.stacks[0].unitId)).toBe(false);
  });

  it('Reckoning caps at 60% and Remembrance cannot exceed battle losses', () => {
    let [state, action] = preparedCast('reckoning', false);
    state.attackerHero.mana = 100;
    const before = state.stacks[0].count;
    castSpell(state, action);
    expect(state.stacks[0].count).toBeGreaterThanOrEqual(Math.floor(before * 0.4));
    [state, action] = preparedCast('remembrance', true);
    castSpell(state, action);
    expect(state.stacks[0].count).toBeLessThanOrEqual(state.initialCounts[state.stacks[0].id]);
  });

  it('spare_parts counts post-Remembrance dead units and excludes summons', () => {
    const state = magicBattle();
    const stack = state.stacks[0];
    state.initialCounts[stack.id] = 10;
    stack.unitId = 'tinSoldier';
    stack.count = 7;
    state.stacks.push({ ...stack, id: 'summon', summoned: true, count: 2 });
    const result = recoverSpareParts(state, 'attacker', 0.5);
    expect(result.tinSoldier).toBe(1);
  });
});
