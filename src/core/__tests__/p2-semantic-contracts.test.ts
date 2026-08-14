import { describe, expect, it } from 'vitest';
import { UNITS } from '../../content/units';
import { makeArmy } from '../army';
import { createBattle } from '../combat/battle';
import { applyActivatedAbility } from '../combat/activatedAbilities';
import { heroActAvailability } from '../combat/heroActs';
import { endStackTurn, grantMeter } from '../combat/magicEffects';
import {
  applyP2RoundStart, p2WeatherForRound, p2WeatherForecastForSide,
  settleP2Destruction, settleP2HalfThreshold,
} from '../combat/p2SpellEffects';
import { forcedMovementDistance, teleportCompany } from '../combat/primitives';
import { runAttackPipeline } from '../combat/pipeline';
import { castStoredSpell, legalSpellCasts } from '../combat/spells';
import { createGame } from '../game';
import { endTurn } from '../game/setup';
import { castAdventureSpell } from '../game/adventureSpells';
import type { BattleState, GameState, Hero, SpellId } from '../types';

function battle(allies = 2, enemies = 2): BattleState {
  const state = createGame({ seed: 9817, p1: 'human', p2: 'human' });
  const army = (count: number, unitId: 'yeoman' | 'tinSoldier') => makeArmy(
    Array.from({ length: count }, (_, index) => ({ unitId, count: 20 + index })),
  );
  return createBattle(army(allies, 'yeoman'), army(enemies, 'tinSoldier'),
    state.players.p1.hero!, state.players.p2.hero!, {
      kind: 'hero', targetId: state.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: state.players.p1.hero!.id,
      defenderHeroId: state.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 9817)[0];
}

function enchant(state: BattleState, side: 'attacker' | 'defender', id: SpellId, plus = false) {
  castStoredSpell(state, side, { type: 'BATTLE_CAST', spellId: id }, plus);
}

function adventure(...ids: SpellId[]): [GameState, Hero] {
  const state = createGame({ seed: 9818, p1: 'human', p2: 'human' });
  const hero = state.players.p1.hero!;
  hero.knownSpells = ids; hero.mana = 200; hero.movement = 10_000;
  return [state, hero];
}

describe('P2 semantic boundaries', () => {
  it('makes Long Oath prevent spell, attack, death, and round losses without blocking gains', () => {
    const state = battle(2, 2);
    enchant(state, 'attacker', 'theLongOath');
    const protectedStack = state.stacks[0];
    protectedStack.morale = 90;
    grantMeter(protectedStack, -30, state);
    expect(protectedStack.morale).toBe(90);

    castStoredSpell(state, 'defender', {
      type: 'BATTLE_CAST', spellId: 'pinchOfAsh', targetId: protectedStack.id,
    }, true);
    expect(protectedStack.morale).toBe(90);

    const doomed = state.stacks[1];
    const attacker = state.stacks.find((stack) => stack.side === 'defender')!;
    attacker.temporaryAbilities = ['ranged', 'the_song']; attacker.shots = 5;
    runAttackPipeline(state, attacker.id, protectedStack.id);
    expect(protectedStack.morale).toBe(90);

    doomed.count = 1; doomed.topHp = 1; attacker.count = 500;
    attacker.position = { x: doomed.position.x + 1, y: doomed.position.y };
    runAttackPipeline(state, attacker.id, doomed.id);
    expect(doomed.count).toBe(0);
    expect(protectedStack.morale).toBe(90);

    applyP2RoundStart(state);
    expect(protectedStack.morale).toBe(5);
    expect(protectedStack.bonusActions).toBe(1);
  });

  it('limits the Long Oath extra hero act to a qualifying spell only', () => {
    const state = battle();
    state.attackerHero.skills = {};
    for (const slot of Object.keys(state.attackerHero.artifacts.equipment) as Array<keyof typeof state.attackerHero.artifacts.equipment>) {
      state.attackerHero.artifacts.equipment[slot] = null;
    }
    state.castRound.attacker = state.round;
    state.enchantments.attacker.push({
      id: 'oath', spellId: 'theLongOath', side: 'attacker', multiplier: 1, upgraded: false,
    });
    expect(heroActAvailability(state, 'attacker', 'spell', {
      type: 'BATTLE_CAST', spellId: 'forgeSpark',
    }).source).toBe('long-oath');
    expect(heroActAvailability(state, 'attacker', 'knack').available).toBe(false);
    expect(heroActAvailability(state, 'attacker', 'item').available).toBe(false);
    expect(heroActAvailability(state, 'attacker', 'artifact').available).toBe(false);
    expect(heroActAvailability(state, 'attacker', 'spell', {
      type: 'BATTLE_CAST', spellId: 'secondWind',
    }).available).toBe(false);
    expect(heroActAvailability(state, 'attacker', 'spell', {
      type: 'BATTLE_CAST', spellId: 'reckoning',
    }).available).toBe(false);
    state.enchantments.attacker[0].upgraded = true;
    expect(heroActAvailability(state, 'attacker', 'spell', {
      type: 'BATTLE_CAST', spellId: 'secondWind',
    }).source).toBe('long-oath');
  });

  it('blocks push, teleport, and beckon for exactly Counterweight’s three turns', () => {
    const state = battle();
    const target = state.stacks[0]; const source = state.stacks.find((s) => s.side === 'defender')!;
    castStoredSpell(state, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'counterweight', targetId: target.id,
    }, false);
    const original = { ...target.position };
    expect(forcedMovementDistance(state, target, source.side, 2)).toBe(0);
    expect(teleportCompany(state, target.id, { x: 6, y: 4 })).toMatchObject({ ok: true });
    expect(target.position).toEqual(original);
    source.temporaryAbilities = ['beckoning_song']; source.abilityUses = {};
    applyActivatedAbility(state, source, {
      type: 'BATTLE_USE_ABILITY', abilityId: 'beckoning_song', targetId: target.id,
    });
    expect(target.position).toEqual(original);
    endStackTurn(state, target); endStackTurn(state, target);
    expect(forcedMovementDistance(state, target, source.side, 2)).toBe(0);
    endStackTurn(state, target);
    expect(forcedMovementDistance(state, target, source.side, 2)).toBe(2);
    teleportCompany(state, target.id, { x: 6, y: 4 });
    expect(target.position).toEqual({ x: 6, y: 4 });
  });

  it('consumes Deadman’s Wedge once across P2 and ordinary forced movement', () => {
    const state = battle(); const target = state.stacks[0];
    state.attackerHero.artifacts.equipment.shield = { id: 'deadmansWedge' };
    expect(forcedMovementDistance(state, target, 'defender', 3)).toBe(0);
    expect(forcedMovementDistance(state, target, 'defender', 2)).toBe(2);
  });

  it('uses only the crossing-hit unit delta for the Upgraded Ledger half threshold', () => {
    const state = battle(); const ally = state.stacks[0]; const marked = state.stacks[2];
    state.initialCounts[ally.id] = 100; ally.count = 49;
    marked.count = 80;
    marked.effects.push({
      id: 'ledger', spellId: 'theLedgerBalanced', duration: 99, magnitude: 2,
      beneficial: false, sourceSide: 'attacker',
    });
    settleP2HalfThreshold(state, ally, 60);
    expect(marked.count).toBe(69);
    settleP2HalfThreshold(state, ally, 60);
    expect(marked.count).toBe(69);
  });

  it('suppresses Ossuary with enemy Silence before applying owner Silence+ doubling', () => {
    const state = battle();
    const destroyed = state.stacks.find((stack) => stack.side === 'defender')!;
    state.enchantments.attacker.push({
      id: 'ossuary', spellId: 'ossuary', side: 'attacker', multiplier: 1, upgraded: false,
    });
    state.enchantments.defender.push({
      id: 'enemy-silence', spellId: 'silenceThePassing', side: 'defender',
      multiplier: 1, upgraded: false,
    });
    settleP2Destruction(state, destroyed, destroyed.count);
    expect(state.stacks.filter((stack) => stack.summoned && stack.side === 'attacker')).toHaveLength(0);

    state.enchantments.defender = [];
    state.enchantments.attacker.push({
      id: 'own-silence-plus', spellId: 'silenceThePassing', side: 'attacker',
      multiplier: 1, upgraded: true,
    });
    settleP2Destruction(state, destroyed, destroyed.count);
    expect(state.stacks.filter((stack) => stack.summoned && stack.side === 'attacker')).toHaveLength(2);

    state.enchantments.defender.push({
      id: 'competing-silence', spellId: 'silenceThePassing', side: 'defender',
      multiplier: 1, upgraded: false,
    });
    settleP2Destruction(state, destroyed, destroyed.count);
    expect(state.stacks.filter((stack) => stack.summoned && stack.side === 'attacker')).toHaveLength(2);
  });

  it('applies one global weather event with deterministic dual-owner recipient policy', () => {
    const state = battle();
    let seed = 0;
    while (p2WeatherForRound(seed, state.round) !== 'sun') seed += 1;
    state.seed = seed;
    state.stacks.forEach((stack) => { stack.morale = 0; });
    state.enchantments.attacker.push({
      id: 'weather-a', spellId: 'theWeatherItself', side: 'attacker', multiplier: 1, upgraded: true,
    });
    state.enchantments.defender.push({
      id: 'weather-d', spellId: 'theWeatherItself', side: 'defender', multiplier: 1, upgraded: true,
    });
    applyP2RoundStart(state);
    expect(state.stacks.every((stack) => stack.morale === 15)).toBe(true);
    expect(state.log.filter((line) => line.includes('The Weather Itself brings'))).toHaveLength(1);
    expect(p2WeatherForecastForSide(state, 'attacker'))
      .toBe(p2WeatherForRound(seed, state.round + 1));
    state.enchantments.defender[0].upgraded = false;
    expect(p2WeatherForecastForSide(state, 'defender')).toBeNull();
  });

  it('copies a complete Upgraded two-recipient face through Mirror Hall and degrades safely', () => {
    const state = battle(4, 1);
    state.attackerHero.knownSpells = ['rally']; state.attackerHero.upgradedSpells = ['rally'];
    state.enchantments.attacker.push({
      id: 'hall', spellId: 'mirrorHall', side: 'attacker', multiplier: 1, upgraded: false,
    });
    const before = new Map(state.stacks.map((stack) => [stack.id, stack.morale]));
    const action = legalSpellCasts(state).find((candidate) => candidate.spellId === 'rally'
      && candidate.mirrorSecondaryTargetId
      && new Set([candidate.targetId, candidate.secondaryTargetId, candidate.mirrorTargetId,
        candidate.mirrorSecondaryTargetId]).size === 4)!;
    expect(action).toBeDefined();
    castStoredSpell(state, 'attacker', action, true);
    expect(state.stacks.filter((stack) => stack.side === 'attacker')
      .every((stack) => stack.morale === (before.get(stack.id) ?? 0) + 50)).toBe(true);

    const noAlternate = battle(2, 1);
    noAlternate.attackerHero.knownSpells = ['rally']; noAlternate.attackerHero.upgradedSpells = ['rally'];
    noAlternate.enchantments.attacker.push({
      id: 'hall', spellId: 'mirrorHall', side: 'attacker', multiplier: 1, upgraded: false,
    });
    const fallback = legalSpellCasts(noAlternate).find((candidate) => candidate.spellId === 'rally')!;
    expect(fallback.mirrorTargetId).toBeUndefined();
    const noAlternateBefore = noAlternate.stacks.map((stack) => stack.morale);
    castStoredSpell(noAlternate, 'attacker', fallback, true);
    expect(noAlternate.stacks.filter((stack) => stack.side === 'attacker')
      .every((stack, index) => stack.morale === noAlternateBefore[index] + 50)).toBe(true);
  });

  it('reveals Prospect deposits and Beast Sense positions with exact scoped intel', () => {
    const [prospect, hero] = adventure('prospect');
    const vein = prospect.map.objects.find((object) => object.kind === 'richVein')!;
    hero.position = { ...vein.position }; prospect.players.p1.explored = [];
    castAdventureSpell(prospect, { type: 'CAST_ADVENTURE_SPELL', spellId: 'prospect' });
    expect(prospect.players.p1.explored).not.toContain(`${vein.position.x},${vein.position.y}`);
    const [prospectPlus, plusHero] = adventure('prospect');
    plusHero.upgradedSpells = ['prospect'];
    const plusVein = prospectPlus.map.objects.find((object) => object.kind === 'richVein')!;
    plusHero.position = { ...plusVein.position }; prospectPlus.players.p1.explored = [];
    castAdventureSpell(prospectPlus, { type: 'CAST_ADVENTURE_SPELL', spellId: 'prospect' });
    expect(prospectPlus.players.p1.explored).toContain(`${plusVein.position.x},${plusVein.position.y}`);

    const [sense, senseHero] = adventure('beastSense');
    const guardian = sense.map.objects.find((object) => object.kind === 'guardian')!;
    if (guardian.kind !== 'guardian') throw new Error('fixture');
    guardian.position = { x: senseHero.position.x + 2, y: senseHero.position.y };
    guardian.army = [{ unitId: 'ashmaneWolves', count: 17 }];
    sense.players.p1.explored = [];
    castAdventureSpell(sense, { type: 'CAST_ADVENTURE_SPELL', spellId: 'beastSense' });
    expect(sense.players.p1.explored).toContain(`${guardian.position.x},${guardian.position.y}`);
    expect(sense.players.p1.adventureEffects.guardianIntel?.[guardian.id]).toBe(sense.day);
    expect(senseHero.adventureEffects.beastGuardianIgnore?.guardianIds).toContain(guardian.id);
    expect(sense.players.p1.adventureEffects.beastGuardianIgnore).toBeUndefined();
  });

  it('pins future-day Debt Called and Steal Away calendar boundaries', () => {
    for (const plus of [false, true]) {
      const [state, hero] = adventure('theDebtCalled'); const target = state.players.p2.hero!;
      if (plus) hero.upgradedSpells = ['theDebtCalled'];
      target.mana = 0;
      castAdventureSpell(state, {
        type: 'CAST_ADVENTURE_SPELL', spellId: 'theDebtCalled', targetHeroId: target.id,
      });
      expect(target.adventureEffects.movementDeniedThroughDay).toBe(state.day + (plus ? 2 : 1));
      expect(target.adventureEffects.manaRegenDeniedThroughDay ?? 0)
        .toBe(plus ? state.day + 2 : 0);
      const through = target.adventureEffects.movementDeniedThroughDay!;
      while (state.day <= through) {
        endTurn(state);
        expect(state.activePlayer).toBe('p2');
        expect(target.movement).toBe(0);
        if (plus) expect(target.mana).toBe(0);
        endTurn(state);
      }
      endTurn(state);
      expect(state.activePlayer).toBe('p2');
      expect(target.movement).toBeGreaterThan(0);
      if (plus) expect(target.mana).toBeGreaterThan(0);
    }

    for (const plus of [false, true]) {
      const [state, hero] = adventure('stealAway');
      if (plus) hero.upgradedSpells = ['stealAway'];
      const mine = state.map.objects.find((object) => object.kind === 'mine')!;
      if (mine.kind !== 'mine') throw new Error('fixture');
      state.castles.forEach((castle) => { castle.owner = 'neutral'; });
      state.map.objects.forEach((object) => {
        if (object.kind === 'mine') object.owner = object.id === mine.id ? 'p2' : null;
      });
      mine.owner = 'p2'; state.players.p1.explored.push(`${mine.position.x},${mine.position.y}`);
      castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'stealAway', targetId: mine.id });
      const futureDays = plus ? 5 : 3;
      expect(mine.productionRedirect).toMatchObject({
        recipient: 'p1', originalOwner: 'p2', hidden: plus,
        startsDay: state.day + 1, throughDay: state.day + futureDays,
      });
      const resource = mine.resource;
      state.players.p1.resources[resource] = 0; state.players.p2.resources[resource] = 0;
      endTurn(state);
      expect(state.players.p2.resources[resource]).toBe(mine.income);
      endTurn(state);
      for (let tick = 1; tick <= futureDays; tick += 1) {
        expect(state.day).toBe(1 + tick);
        expect(state.players.p1.resources[resource]).toBe(mine.income * tick);
        endTurn(state);
        expect(state.players.p2.resources[resource]).toBe(mine.income);
        endTurn(state);
      }
      expect(state.day).toBe(2 + futureDays);
      endTurn(state);
      expect(state.players.p2.resources[resource]).toBe(mine.income * 2);
    }
  });

  it('blocks every recipient rider when a composite mass spell recipient resists', () => {
    const original = UNITS.tinSoldier.resistances;
    const originalAbilities = UNITS.tinSoldier.abilities;
    const unmaking = battle(); const target = unmaking.stacks[2];
    (UNITS.tinSoldier as unknown as { resistances: NonNullable<typeof original> }).resistances = [
      { kind: 'spell-ward', charges: 1 },
    ];
    (UNITS.tinSoldier as unknown as { abilities: typeof originalAbilities }).abilities = [
      ...originalAbilities, 'spell_ward',
    ];
    try {
      target.effects.push({
        id: 'buff', spellId: 'blessing', duration: 2, magnitude: 1,
        beneficial: true, sourceSide: 'defender',
      });
      const before = { count: target.count, topHp: target.topHp };
      castStoredSpell(unmaking, 'attacker', {
        type: 'BATTLE_CAST', spellId: 'theUnmakingEngine',
      }, false);
      expect({ count: target.count, topHp: target.topHp }).toEqual(before);
      expect(target.effects.map((effect) => effect.id)).toContain('buff');
      expect(target.abilityUses?.spell_ward).toBe(1);
    } finally {
      (UNITS.tinSoldier as unknown as { resistances?: typeof original }).resistances = original;
      (UNITS.tinSoldier as unknown as { abilities: typeof originalAbilities }).abilities = originalAbilities;
    }

    const rooted = battle(); const rootedTarget = rooted.stacks[2];
    const shear = battle(); const shearTarget = shear.stacks[2];
    rootedTarget.temporaryAbilities = ['flying']; rootedTarget.effects.push({
      id: `spell-immune:${rootedTarget.id}:1`, spellId: 'sanctuary', duration: 2,
      magnitude: 1, beneficial: true, sourceSide: 'defender',
    });
    const beforeRoot = { ...rootedTarget.position };
    castStoredSpell(rooted, 'attacker', { type: 'BATTLE_CAST', spellId: 'rootTheSky' }, true);
    expect(rootedTarget.position).toEqual(beforeRoot);
    expect(rootedTarget.effects.some((effect) => effect.spellId === 'rootTheSky')).toBe(false);
    expect(rootedTarget.counters.chill).toBe(0);

    shearTarget.effects.push({
      id: 'ward', spellId: 'ward', duration: 99, magnitude: 1,
      beneficial: true, sourceSide: 'defender',
    });
    const shearBefore = { ...shearTarget.position };
    castStoredSpell(shear, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'windShear', positions: [{ x: 0, y: 0 }],
    }, true);
    expect(shearTarget.position).toEqual(shearBefore);
    expect(shearTarget.effects.some((effect) => effect.spellId === 'ward')).toBe(false);
    expect(shearTarget.counters.chill).toBe(0);
  });
});
