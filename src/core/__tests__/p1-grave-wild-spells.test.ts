import { describe, expect, it } from 'vitest';
import { makeArmy } from '../army';
import { applyBattleAction, createBattle } from '../combat/battle';
import { cloneBattle } from '../combat/battleClone';
import { effectiveSpeed, endStackTurn, totalStackHp } from '../combat/magicEffects';
import { expireDamageLinks, expireMindControl, grantSpellImmunity } from '../combat/primitives';
import { canCastSpell, castSpell, castStoredSpell, legalSpellCasts } from '../combat/spells';
import { applyEffectTwister } from '../combat/twisters';
import { createGame } from '../game';
import { castAdventureSpell, canCastAdventureSpell } from '../game/adventureSpells';
import { SPELLS, validateSpells } from '../../content/spells';
import { UNITS } from '../../content/units';
import {
  P1_GRAVE_WILD_AUDIT_IDS, P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS,
  P1_GRAVE_WILD_SPELL_IDS,
} from '../../content/spells/p1GraveWild';
import { resolveContentAsset } from '../../content/v2/assets';
import type { Action, BattleState, SpellId } from '../types';
import { legalCombatPlacements, beginSpellTargeting } from '../../ui/combatTargeting';

type BattleCast = Extract<Action, { type: 'BATTLE_CAST' }>;

function fixture(): BattleState {
  const game = createGame({ seed: 98701, p1: 'human', p2: 'human' });
  game.players.p1.hero!.spellPower = 4;
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 10 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 10 }]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: game.players.p1.hero!.id, defenderHeroId: game.players.p2.hero!.id,
      defenderPlayerId: 'p2',
    }, 98701,
  );
  battle.obstacles = [];
  return battle;
}

function cast(
  battle: BattleState, spellId: SpellId, plus = false,
  extra: Omit<BattleCast, 'type' | 'spellId'> = {},
) {
  castStoredSpell(battle, 'attacker', { type: 'BATTLE_CAST', spellId, ...extra }, plus);
}

describe('docs-61 P1 Grave and Wild catalog', () => {
  it('audits every P1 row, including the three repaired existing faces', () => {
    expect(P1_GRAVE_WILD_AUDIT_IDS).toEqual([
      'pinchOfAsh', 'tithe', 'grudge', 'wither', 'yoke', 'graveBargain',
      'puppetStrings', 'nettle', 'bramblelash', 'wildcall', 'sapAndSinew',
      'shedSkin', 'hedgerowMarch', 'verdantSurge', 'theTurningYear', 'fly',
    ]);
    expect(P1_GRAVE_WILD_SPELL_IDS).toHaveLength(13);
    expect(SPELLS.graveBargain).toMatchObject({ tier: 3, mana: 0, targeting: 'single-ally' });
    expect(SPELLS.pinchOfAsh).toMatchObject({ cantrip: true, scaling: 'fixed', mana: 2 });
    expect(SPELLS.nettle).toMatchObject({ cantrip: true, scaling: 'fixed', mana: 2 });
    expect(SPELLS.fly).toMatchObject({ tier: 5, mana: 18, timeGate: 'once-per-day' });
    expect(() => validateSpells()).not.toThrow();
    for (const id of P1_GRAVE_WILD_SPELL_IDS) {
      expect(SPELLS[id].base).not.toBe(SPELLS[id].plus);
      expect(SPELLS[id].flavor).not.toBe('The words remember what to do.');
    }
    expect(P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS).toHaveLength(13);
    for (const requirement of P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS) {
      expect(resolveContentAsset(requirement, new Set(), 'development').kind).toBe('placeholder');
      expect(() => resolveContentAsset(requirement, new Set(), 'release')).toThrow(/missing/i);
    }
  });

  it('keeps both fixed cantrips independent of Spell Power counter scaling', () => {
    const battle = fixture();
    battle.attackerHero.spellPower = 99;
    const enemy = battle.stacks.find((stack) => stack.side === 'defender')!;
    cast(battle, 'pinchOfAsh', false, { targetId: enemy.id });
    expect(enemy.counters.hex).toBe(2);
    const nettle = fixture();
    nettle.attackerHero.spellPower = 99;
    const nettleTarget = nettle.stacks.find((stack) => stack.side === 'defender')!;
    const before = totalStackHp(nettleTarget);
    cast(nettle, 'nettle', true, { targetId: nettleTarget.id });
    expect(before - totalStackHp(nettleTarget)).toBe(10);
    expect(nettleTarget.counters.chill).toBe(2);
  });

  it('makes Yoke one-hop and removable only in its Standard form', () => {
    const standard = fixture();
    const [first, second] = standard.stacks.filter((stack) => stack.side === 'defender');
    cast(standard, 'yoke', false, { targetId: first.id, secondaryTargetId: second.id });
    expect(first.damageLink).toMatchObject({ targetId: second.id, share: 0.5, protected: false });
    const marker = first.effects.find((effect) => effect.spellId === 'yoke')!;
    applyEffectTwister(standard, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'unmake', effectId: `timed:${first.id}:${marker.id}`,
    }, 'unmake', false);
    expect(first.damageLink).toBeUndefined();
    expect(second.damageLink).toBeUndefined();

    const upgraded = fixture();
    const [a, b] = upgraded.stacks.filter((stack) => stack.side === 'defender');
    cast(upgraded, 'yoke', true, { targetId: a.id, secondaryTargetId: b.id });
    expect(a.damageLink).toMatchObject({ share: 0.75, protected: true });
    const protectedMarker = a.effects.find((effect) => effect.spellId === 'yoke')!;
    expect(() => applyEffectTwister(upgraded, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'sour', effectId: `timed:${a.id}:${protectedMarker.id}`,
    }, 'sour', false)).toThrow(/protected/);

    endStackTurn(upgraded, a); endStackTurn(upgraded, a);
    expect(a.effects.find((effect) => effect.spellId === 'yoke')?.duration).toBe(3);
    upgraded.round = 4; expireDamageLinks(upgraded);
    expect(a.effects.some((effect) => effect.spellId === 'yoke')).toBe(false);
    expect(b.effects.some((effect) => effect.spellId === 'yoke')).toBe(false);

    const sanctuary = fixture();
    const ally = sanctuary.stacks[0];
    const hostile = sanctuary.stacks.find((entry) => entry.side === 'defender')!;
    ally.effects.push({ id: 'ally-sanctuary', spellId: 'sanctuary', duration: 2,
      magnitude: 1, beneficial: true, sourceSide: 'attacker' });
    hostile.effects.push({ id: 'enemy-sanctuary', spellId: 'sanctuary', duration: 2,
      magnitude: 1, beneficial: true, sourceSide: 'defender' });
    sanctuary.attackerHero.knownSpells = ['yoke']; sanctuary.attackerHero.mana = 20;
    sanctuary.currentStackId = ally.id;
    const options = legalSpellCasts(sanctuary).filter((entry) => entry.spellId === 'yoke');
    expect(options.some((entry) => entry.targetId === ally.id || entry.secondaryTargetId === ally.id)).toBe(true);
    expect(options.some((entry) => entry.targetId === hostile.id || entry.secondaryTargetId === hostile.id)).toBe(false);
  });

  it('bounds Puppet Strings by HP/once and restores Standard versus Upgraded state exactly', () => {
    const standard = fixture();
    const target = standard.stacks.find((stack) => stack.side === 'defender')!;
    target.count = 5; target.topHp = UNITS[target.unitId].hp;
    const originalCounters = { ...target.counters };
    cast(standard, 'puppetStrings', false, { targetId: target.id });
    expect(target).toMatchObject({ side: 'attacker', originalSide: 'defender', controlledOnce: true });
    target.counters.burn = 5;
    target.effects.push({ id: 'control-buff', spellId: 'blessing', duration: 2,
      magnitude: 1, beneficial: true, sourceSide: 'attacker' });
    standard.round = target.controlExpiresRound!;
    expireMindControl(standard);
    expect(target.side).toBe('defender');
    expect(target.counters).toMatchObject({ ...originalCounters, hex: 3 });
    expect(target.effects.some((effect) => effect.id === 'control-buff')).toBe(false);
    expect(() => cast(standard, 'puppetStrings', false, { targetId: target.id }))
      .toThrow(/controlled only once/);

    const linked = fixture();
    const controlled = linked.stacks.find((entry) => entry.side === 'defender')!;
    controlled.count = 3; controlled.topHp = UNITS[controlled.unitId].hp;
    const partner = linked.stacks.find((entry) => entry.side === 'attacker')!;
    cast(linked, 'puppetStrings', false, { targetId: controlled.id });
    cast(linked, 'yoke', true, { targetId: controlled.id, secondaryTargetId: partner.id });
    linked.round = controlled.controlExpiresRound!; expireMindControl(linked);
    expect(controlled.damageLink).toBeUndefined(); expect(partner.damageLink).toBeUndefined();
    expect(controlled.effects.some((effect) => effect.spellId === 'yoke')).toBe(false);
    expect(partner.effects.some((effect) => effect.spellId === 'yoke')).toBe(false);

    const upgraded = fixture();
    const kept = upgraded.stacks.find((stack) => stack.side === 'defender')!;
    kept.count = 5; kept.topHp = UNITS[kept.unitId].hp;
    cast(upgraded, 'puppetStrings', true, { targetId: kept.id });
    kept.counters.burn = 4;
    kept.effects.push({ id: 'kept', spellId: 'blessing', duration: 2,
      magnitude: 1, beneficial: true, sourceSide: 'attacker' });
    upgraded.round = kept.controlExpiresRound!;
    expireMindControl(upgraded);
    expect(kept.counters).toMatchObject({ burn: 4, hex: 3 });
    expect(kept.effects.some((effect) => effect.id === 'kept')).toBe(true);

    const capped = fixture();
    capped.attackerHero.spellPower = 0;
    capped.currentStackId = capped.stacks[0].id;
    capped.attackerHero.knownSpells = ['puppetStrings'];
    expect(legalSpellCasts(capped).some((action) => action.spellId === 'puppetStrings')).toBe(false);
  });

  it('routes Grave Bargain through casualty/death/save state and uses starting max HP', () => {
    const battle = fixture();
    const sacrifice = battle.stacks[0];
    sacrifice.count = 1;
    sacrifice.topHp = 1;
    battle.attackerHero.mana = 0;
    battle.attackerHero.manaMaximum = 100;
    cast(battle, 'lastCandle', false);
    const beforeDestroyed = battle.destroyedStacks;
    cast(battle, 'graveBargain', true, { targetId: sacrifice.id });
    expect(battle.destroyedStacks).toBe(beforeDestroyed + 1);
    expect(battle.casualties.attacker.yeoman).toBe(1);
    expect(battle.attackerHero.mana).toBe(14); // 20 starting Yeomen × 7 HP × 10%, not current HP.
    expect(battle.stacks.filter((stack) => stack.side === 'attacker' && stack.count > 0)
      .every((stack) => stack.counters.bloom > 0)).toBe(true);
    expect(battle.stacks.filter((stack) => stack.side === 'defender' && stack.count > 0)
      .every((stack) => stack.counters.hex > 0)).toBe(true);

    const last = fixture();
    last.stacks.filter((stack) => stack.side === 'attacker').slice(1)
      .forEach((stack) => { stack.count = 0; stack.topHp = 0; });
    expect(() => cast(last, 'graveBargain', false, { targetId: last.stacks[0].id }))
      .toThrow(/last allied/i);

    const controlled = fixture();
    const puppet = controlled.stacks.find((stack) => stack.side === 'defender')!;
    puppet.count = 5; puppet.topHp = UNITS[puppet.unitId].hp;
    cast(controlled, 'puppetStrings', false, { targetId: puppet.id });
    expect(() => cast(controlled, 'graveBargain', false, { targetId: puppet.id })).not.toThrow();
    expect(controlled.casualties.defender[puppet.unitId]).toBeGreaterThan(0);

    const splinter = fixture();
    splinter.attackerHero.spellPower = 99;
    const tiny = splinter.stacks[0];
    splinter.initialCounts[tiny.id] = 1; tiny.count = 1;
    splinter.stacks[1].count = 100; splinter.initialCounts[splinter.stacks[1].id] = 100;
    cast(splinter, 'lastCandle', false);
    cast(splinter, 'graveBargain', true, { targetId: tiny.id });
    expect(splinter.stacks[1].counters.bloom).toBeLessThan(9);
    expect(splinter.stacks.filter((entry) => entry.side === 'defender')
      .every((entry) => entry.counters.hex < 9)).toBe(true);
  });

  it('pays Tithe before clamping its flat gain and settles lethal current-HP damage', () => {
    for (const [plus, expected] of [[false, 20], [true, 20]] as const) {
      const battle = fixture(); const target = battle.stacks[0];
      battle.attackerHero.manaMaximum = 20; battle.attackerHero.mana = 19;
      battle.attackerHero.knownSpells = ['tithe'];
      battle.currentStackId = target.id;
      if (plus) battle.attackerHero.upgradedSpells = ['tithe'];
      const next = applyBattleAction(battle, { type: 'BATTLE_CAST', spellId: 'tithe', targetId: target.id });
      expect(next.attackerHero.mana).toBe(expected);
    }
    const lethal = fixture(); const target = lethal.stacks[0];
    target.count = 1; target.topHp = 1;
    const before = lethal.destroyedStacks;
    cast(lethal, 'tithe', false, { targetId: target.id });
    expect(lethal.destroyedStacks).toBe(before + 1);
    expect(lethal.casualties.attacker[target.unitId]).toBe(1);

    const atomic = fixture(); atomic.currentStackId = atomic.stacks[0].id;
    atomic.attackerHero.knownSpells = ['theTurningYear']; atomic.attackerHero.mana = 20;
    expect(() => castSpell(atomic, {
      type: 'BATTLE_CAST', spellId: 'theTurningYear', counterId: 'not-a-counter' as never,
    })).toThrow();
    expect(atomic.attackerHero.mana).toBe(20);
  });

  it('applies the global percentage and duration thresholds to P1 Grave/Wild faces', () => {
    const low = fixture(); const lowTarget = low.stacks[0];
    low.attackerHero.spellPower = 0;
    const lowHp = totalStackHp(lowTarget);
    cast(low, 'tithe', false, { targetId: lowTarget.id });
    expect(lowHp - totalStackHp(lowTarget)).toBe(Math.floor(lowHp * 0.10));

    const high = fixture(); const highTarget = high.stacks[0];
    high.attackerHero.spellPower = 2;
    const highHp = totalStackHp(highTarget);
    cast(high, 'tithe', false, { targetId: highTarget.id });
    expect(highHp - totalStackHp(highTarget)).toBe(Math.floor(highHp * 0.11));

    const durations = fixture(); durations.attackerHero.spellPower = 6;
    const ally = durations.stacks[0];
    const [enemy, otherEnemy] = durations.stacks.filter((entry) => entry.side === 'defender');
    enemy.count = 1; enemy.topHp = 1;
    cast(durations, 'grudge', false, { targetId: enemy.id });
    expect(enemy.effects.find((entry) => entry.spellId === 'grudge')?.duration).toBe(4);
    cast(durations, 'yoke', false, { targetId: enemy.id, secondaryTargetId: otherEnemy.id });
    expect(enemy.damageLink?.expiresRound).toBe(durations.round + 4);
    cast(durations, 'sapAndSinew', false, { targetId: ally.id });
    expect(ally.effects.find((entry) => entry.spellId === 'sapAndSinew')?.duration).toBe(4);

    const puppet = fixture(); puppet.attackerHero.spellPower = 6;
    const controlled = puppet.stacks.find((entry) => entry.side === 'defender')!;
    controlled.count = 1; controlled.topHp = 1;
    cast(puppet, 'puppetStrings', false, { targetId: controlled.id });
    expect(controlled.controlExpiresRound).toBe(puppet.round + 3);
  });

  it('converts counters directly without a second application-scaling pass', () => {
    const battle = fixture();
    battle.attackerHero.spellPower = 99;
    const ally = battle.stacks[0];
    const enemy = battle.stacks.find((stack) => stack.side === 'defender')!;
    ally.counters = { burn: 2, chill: 1, hex: 0, bloom: 1 };
    enemy.counters = { burn: 0, chill: 2, hex: 3, bloom: 0 };
    cast(battle, 'theTurningYear', true, { counterId: 'bloom' });
    expect(ally.counters).toEqual({ burn: 0, chill: 0, hex: 0, bloom: 7 });
    expect(enemy.counters).toEqual({ burn: 0, chill: 0, hex: 0, bloom: 5 });

    const immune = fixture();
    const allyImmune = immune.stacks[0]; const enemyImmune = immune.stacks.find((entry) => entry.side === 'defender')!;
    grantSpellImmunity(immune, allyImmune.id, 2, 'attacker');
    grantSpellImmunity(immune, enemyImmune.id, 2, 'defender');
    allyImmune.counters.burn = 2; enemyImmune.counters.hex = 2;
    cast(immune, 'theTurningYear', false, { counterId: 'bloom' });
    expect(allyImmune.counters.burn).toBe(2); expect(enemyImmune.counters.hex).toBe(2);
  });

  it('keeps Hedgerow and Sap benefits on their printed battle/round lifecycles', () => {
    const hedge = fixture(); const ally = hedge.stacks[0];
    const base = UNITS[ally.unitId].speed;
    cast(hedge, 'hedgerowMarch', true);
    expect(effectiveSpeed(ally, hedge)).toBe(base + 2);
    hedge.enchantments.attacker = [];
    expect(effectiveSpeed(ally, hedge)).toBe(base);
    expect(ally.effects.some((effect) => effect.spellId === 'hedgerowMarch')).toBe(false);

    const sap = fixture(); const beast = sap.stacks[0];
    beast.unitId = 'ashmaneWolves'; beast.topHp = UNITS.ashmaneWolves.hp;
    cast(sap, 'sapAndSinew', true, { targetId: beast.id });
    const effect = beast.effects.find((entry) => entry.spellId === 'sapAndSinew')!;
    endStackTurn(sap, beast); endStackTurn(sap, beast);
    expect(effect.duration).toBe(3);
    expect(effect.id).toContain(':extra-retaliation');
  });

  it('summons replay-stable temporary Beasts and rejects forged placement before debit', () => {
    const first = fixture();
    const second = cloneBattle(first);
    cast(first, 'wildcall', true, { positions: [{ x: 5, y: 4 }] });
    cast(second, 'wildcall', true, { positions: [{ x: 5, y: 4 }] });
    const summoned = first.stacks.find((stack) => stack.id.startsWith('wildcall-'))!;
    const replayed = second.stacks.find((stack) => stack.id.startsWith('wildcall-'))!;
    expect(summoned).toMatchObject({ unitId: replayed.unitId, count: replayed.count, summoned: true });
    expect(UNITS[summoned.unitId].abilities).toContain('beast');
    expect(effectiveSpeed(summoned, first)).toBe(UNITS[summoned.unitId].speed + 2);
    summoned.roundSpeedBonus = 0;
    expect(effectiveSpeed(summoned, first)).toBe(UNITS[summoned.unitId].speed + 2);

    const forged = fixture();
    forged.currentStackId = forged.stacks[0].id;
    forged.attackerHero.knownSpells = ['wildcall'];
    forged.attackerHero.mana = 20;
    const before = structuredClone(forged);
    expect(() => applyBattleAction(forged, {
      type: 'BATTLE_CAST', spellId: 'wildcall', positions: [{ x: -1, y: 0 }],
    })).toThrow(/Illegal P1 spell/);
    expect(forged).toEqual(before);

    const unavailable = fixture(); unavailable.attackerHero.spellPower = 0;
    unavailable.attackerHero.knownSpells = ['wildcall']; unavailable.attackerHero.mana = 20;
    expect(canCastSpell(unavailable, 'wildcall')).toBe(false);
    expect(beginSpellTargeting(unavailable, 'wildcall')).toBeNull();

    const wide = fixture(); wide.seed = 8; wide.attackerHero.spellPower = 20;
    wide.attackerHero.knownSpells = ['wildcall']; wide.attackerHero.mana = 20;
    wide.attackerHero.upgradedSpells = ['wildcall']; wide.currentStackId = wide.stacks[0].id;
    const draft = beginSpellTargeting(wide, 'wildcall')!;
    expect(legalCombatPlacements(wide, draft).some((entry) => entry.x === 12)).toBe(false);
  });

  it('uses the real once-daily terrain-ignore primitive for Fly', () => {
    const state = createGame({ seed: 98702, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    hero.knownSpells = ['fly']; hero.upgradedSpells = ['fly'];
    hero.mana = 40; hero.movement = 2000;
    expect(canCastAdventureSpell(state, 'fly')).toBe(true);
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'fly' });
    expect(hero.adventureEffects.terrainIgnore).toMatchObject({
      day: state.day, movementCost: 65, domains: ['mountain', 'water'],
      ignoreGuardianAggro: true,
    });
    expect(canCastAdventureSpell(state, 'fly')).toBe(false);
  });
});
