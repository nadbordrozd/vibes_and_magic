import { beforeEach, describe, expect, it } from 'vitest';
import { EFFECT_PRIMITIVE_CONTRACTS, clearEffectPrimitiveHandlersForTest,
  registeredEffectPrimitiveHandlers } from '../../content/v2/registries';
import { makeArmy } from '../army';
import {
  applyBattleAction, armyAfterBattle, createBattle, recoverInactiveBattleTurn, surrenderCost,
} from '../combat/battle';
import { cloneBattle } from '../combat/battleClone';
import { runAttackPipeline } from '../combat/pipeline';
import {
  COMBAT_PRIMITIVE_HANDLERS, addManaClamped, applyImpactDamage,
  applyBerserk, borrowAbilityEligibility, cloneCompany, convertCounter, createHazardHex,
  detonateCounter, drainMana, ensureCombatPrimitiveHandlersRegistered,
  expireDamageLinks, expireMindControl,
  grantExtraAction, grantMidBattleResonance, grantShots, grantSpellImmunity,
  isSpellImmune, linkCompanies, massTargets, mindControlCompany,
  resurrectCompany, sacrificeCompany, scheduleDelayedTrigger, spellCopyEligibility,
  stunCompany, teleportCompany, claimDestructionSave,
} from '../combat/primitives';
import { effectiveResonances } from '../combat/spellModifiers';
import { castStoredSpell, legalSpellCasts } from '../combat/spells';
import { beginStackTurn } from '../combat/magicEffects';
import { createBattleTile, placeBattleTile, runTileHooks } from '../combat/tiles';
import { createGame } from '../game';
import { finalizeBattle } from '../game/outcomes';
import { stateHash } from '../../ui/persistence';
import type { BattleStack, BattleState } from '../types';

function fixture(): BattleState {
  const game = createGame({ seed: 604, p1: 'human', p2: 'ai' });
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 10 }, { unitId: 'longbowman', count: 4 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 10 }, { unitId: 'stuffedSentinel', count: 2 }]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: 'p2-hero', destination: { x: 6, y: 6 },
      attackerHeroId: 'p1-hero', defenderHeroId: 'p2-hero', defenderPlayerId: 'p2',
    }, 604,
  );
  battle.obstacles = [];
  return battle;
}

const stack = (battle: BattleState, id: string): BattleStack =>
  battle.stacks.find((candidate) => candidate.id === id)!;

describe('docs 60/62 generic combat primitives', () => {
  beforeEach(() => {
    clearEffectPrimitiveHandlersForTest();
    ensureCombatPrimitiveHandlersRegistered();
  });

  it('registers exactly one executable handler for every combat primitive at its named stage', () => {
    const registered = registeredEffectPrimitiveHandlers();
    expect(COMBAT_PRIMITIVE_HANDLERS).toHaveLength(18);
    for (const handler of COMBAT_PRIMITIVE_HANDLERS) {
      expect(registered.get(handler.id)).toBe(handler);
      expect(handler.stage).toBe(EFFECT_PRIMITIVE_CONTRACTS[handler.id].stage);
      expect(typeof handler.apply).toBe('function');
    }
    const battle = fixture();
    const target = stack(battle, 'defender-0');
    const result = registered.get('impact-damage')!.apply({ battle }, {
      targetId: target.id, sourceSide: 'attacker', base: 3,
      coefficient: 0, spellPower: 0,
    });
    expect(result).toMatchObject({ ok: true, value: { damage: 3 } });
    expect(() => ensureCombatPrimitiveHandlersRegistered()).not.toThrow();
  });

  it('resolves impact independently of Attack/Defense and luck, then applies Hex and reducers', () => {
    const low = fixture();
    const high = fixture();
    low.attackerHero.attack = -20; low.attackerHero.luck = -5;
    high.attackerHero.attack = 99; high.attackerHero.luck = 5;
    const lowTarget = stack(low, 'defender-0');
    const highTarget = stack(high, 'defender-0');
    lowTarget.counters.hex = 2; highTarget.counters.hex = 2;
    const a = applyImpactDamage(low, {
      targetId: lowTarget.id, sourceSide: 'attacker', base: 8,
      coefficient: 4, spellPower: 2,
    });
    const b = applyImpactDamage(high, {
      targetId: highTarget.id, sourceSide: 'attacker', base: 8,
      coefficient: 4, spellPower: 2,
    });
    expect(a).toEqual(b);
    expect(a).toMatchObject({ ok: true, value: { damage: 18 } });
    highTarget.effects.push({ id: 'veil', spellId: 'mournersVeil', duration: 2,
      magnitude: 20, beneficial: true, sourceSide: 'defender' });
    expect(applyImpactDamage(high, {
      targetId: highTarget.id, sourceSide: 'attacker', base: 10,
      coefficient: 0, spellPower: 0,
    })).toMatchObject({ ok: true, value: { damage: 9 } });
  });

  it('shares mass targeting and excludes all-spell-immune companies', () => {
    const battle = fixture();
    const ally = stack(battle, 'attacker-0');
    expect(grantSpellImmunity(battle, ally.id, 2, 'attacker').ok).toBe(true);
    expect(isSpellImmune(ally)).toBe(true);
    expect(massTargets(battle, 'attacker', 'mass-ally').map((entry) => entry.id))
      .toEqual(['attacker-1']);
    expect(massTargets(battle, 'attacker', 'mass-all', 'other')).toHaveLength(4);
  });

  it('resurrects only original companies and never beyond starting count', () => {
    const battle = fixture();
    const ally = stack(battle, 'attacker-0');
    ally.count = 4; ally.topHp = 1;
    expect(resurrectCompany(battle, ally.id, 9999)).toMatchObject({
      ok: true, value: { countRevived: 6 },
    });
    expect(ally.count).toBe(10);
    expect(resurrectCompany(battle, ally.id, 1)).toMatchObject({
      ok: false, reason: { code: 'starting-count-cap' },
    });
    ally.summoned = true;
    expect(resurrectCompany(battle, ally.id, 10)).toMatchObject({
      ok: false, reason: { code: 'target-summoned' },
    });
  });

  it('bounds mind control by HP, once per battle, no extension, and deterministic reversion', () => {
    const battle = fixture();
    const enemy = stack(battle, 'defender-1');
    expect(mindControlCompany(battle, enemy.id, 'attacker', 2, 1)).toMatchObject({
      ok: false, reason: { code: 'control-hp-cap' },
    });
    expect(mindControlCompany(battle, enemy.id, 'attacker', 2, 9999).ok).toBe(true);
    expect(enemy.side).toBe('attacker');
    expect(mindControlCompany(battle, enemy.id, 'attacker', 3, 9999)).toMatchObject({
      ok: false, reason: { code: 'control-extension' },
    });
    expect(JSON.parse(JSON.stringify(battle)).stacks.find(
      (entry: BattleStack) => entry.id === enemy.id).controlExpiresRound).toBe(3);
  });

  it('routes one link once, and rejects a second link on either company', () => {
    const battle = fixture();
    const first = stack(battle, 'defender-0');
    const second = stack(battle, 'defender-1');
    expect(linkCompanies(battle, first.id, second.id, 0.5).ok).toBe(true);
    expect(linkCompanies(battle, first.id, 'attacker-0', 0.5)).toMatchObject({
      ok: false, reason: { code: 'already-linked' },
    });
    const before = second.topHp;
    applyImpactDamage(battle, { targetId: first.id, sourceSide: 'attacker', base: 10,
      coefficient: 0, spellPower: 0 });
    expect(second.topHp).toBe(before - 5);
  });

  it('keeps direct and Rite impact destruction accounting at the primitive boundary', () => {
    const direct = fixture(); const directTarget = stack(direct, 'defender-0');
    directTarget.count = 1; directTarget.topHp = 1;
    applyImpactDamage(direct, { targetId: directTarget.id, sourceSide: 'attacker',
      base: 10, coefficient: 0, spellPower: 0 });
    expect(direct.destroyedStacks).toBe(1);

    const forged = fixture(); const forgedTarget = stack(forged, 'defender-0');
    forgedTarget.count = 1; forgedTarget.topHp = 1;
    const impact = registeredEffectPrimitiveHandlers().get('impact-damage')!;
    impact.apply({ battle: forged }, {
      targetId: forgedTarget.id, sourceSide: 'attacker', base: 10,
      coefficient: 0, spellPower: 0, deferDeathSettlement: true,
    } as never);
    expect(forged.destroyedStacks).toBe(1);

    const rite = fixture(); const riteTarget = stack(rite, 'defender-0');
    riteTarget.count = 1; riteTarget.topHp = 1;
    castStoredSpell(rite, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'kindle', targetId: riteTarget.id,
    }, false);
    expect(rite.destroyedStacks).toBe(1);
  });

  it('consumes Ward before impact and routes no linked damage from the zeroed instance', () => {
    const battle = fixture();
    const source = stack(battle, 'attacker-0');
    const first = stack(battle, 'defender-0');
    const second = stack(battle, 'defender-1');
    linkCompanies(battle, first.id, second.id, 0.5, 3);
    first.effects.push({ id: 'ward:plus', spellId: 'ward', duration: 99,
      magnitude: 2, beneficial: true, sourceSide: 'defender' });
    const secondBefore = second.topHp;
    expect(applyImpactDamage(battle, {
      targetId: first.id, sourceSide: 'attacker', sourceStackId: source.id,
      base: 20, coefficient: 0, spellPower: 0,
    })).toMatchObject({ ok: true, value: { damage: 0, linkedDamage: 0 } });
    expect(first.effects.some((effect) => effect.spellId === 'ward')).toBe(false);
    expect(source.counters.burn).toBe(2);
    expect(second.topHp).toBe(secondBefore);
  });

  it('routes direct spell, turn-effect, hazard, reflection, and death-backlash damage one hop', () => {
    const direct = fixture();
    const directTarget = stack(direct, 'defender-0');
    const directLink = stack(direct, 'defender-1');
    stack(direct, 'attacker-0').count = 1;
    stack(direct, 'attacker-1').count = 1;
    linkCompanies(direct, directTarget.id, directLink.id, 0.5, 3);
    const directBefore = directLink.topHp;
    castStoredSpell(direct, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'trial', targetId: directTarget.id,
    }, false);
    expect(directLink.topHp).toBeLessThan(directBefore);

    const turn = fixture();
    const turnTarget = stack(turn, 'defender-0');
    const turnLink = stack(turn, 'defender-1');
    linkCompanies(turn, turnTarget.id, turnLink.id, 1, 3);
    turnTarget.counters.burn = 2;
    const turnBefore = turnLink.topHp;
    beginStackTurn(turn, turnTarget);
    expect(turnLink.topHp).toBeLessThan(turnBefore);

    const hazard = fixture();
    const hazardTarget = stack(hazard, 'defender-0');
    const hazardLink = stack(hazard, 'defender-1');
    linkCompanies(hazard, hazardTarget.id, hazardLink.id, 1, 3);
    createHazardHex(hazard, hazardTarget.position, -1, 'attacker', {
      kind: 'damage', amount: 3,
    });
    hazardTarget.effects.push({ id: 'hazard-ward', spellId: 'ward', duration: 99,
      magnitude: 1, beneficial: true, sourceSide: 'defender' });
    const hazardTargetBefore = hazardTarget.topHp;
    const hazardBefore = hazardLink.topHp;
    runTileHooks(hazard, 'on-turn-start', hazardTarget);
    expect(hazardTarget.topHp).toBe(hazardTargetBefore);
    expect(hazardLink.topHp).toBe(hazardBefore);
    expect(hazardTarget.effects.some((effect) => effect.spellId === 'ward')).toBe(false);
    runTileHooks(hazard, 'on-turn-start', hazardTarget);
    expect(hazardLink.topHp).toBe(hazardBefore - 3);

    const reflectionGame = createGame({ seed: 605, p1: 'human', p2: 'ai' });
    const [reflection] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }, { unitId: 'longbowman', count: 4 }]),
      makeArmy([{ unitId: 'mirrorBound', count: 1 }]),
      reflectionGame.players.p1.hero!, reflectionGame.players.p2.hero!, {
        kind: 'hero', targetId: 'p2-hero', destination: { x: 6, y: 6 },
        attackerHeroId: 'p1-hero', defenderHeroId: 'p2-hero', defenderPlayerId: 'p2',
      }, 605,
    );
    stack(reflection, 'attacker-0').position = { x: 4, y: 4 };
    stack(reflection, 'defender-0').position = { x: 5, y: 4 };
    linkCompanies(reflection, 'attacker-0', 'attacker-1', 0.5, 3);
    const reflectionBefore = stack(reflection, 'attacker-1').topHp;
    runAttackPipeline(reflection, 'attacker-0', 'defender-0');
    expect(stack(reflection, 'attacker-1').topHp).toBeLessThan(reflectionBefore);

    const backlashGame = createGame({ seed: 606, p1: 'human', p2: 'ai' });
    const [backlash] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 100 }, { unitId: 'longbowman', count: 4 }]),
      makeArmy([{ unitId: 'drownedCrew', count: 1 }]),
      backlashGame.players.p1.hero!, backlashGame.players.p2.hero!, {
        kind: 'hero', targetId: 'p2-hero', destination: { x: 6, y: 6 },
        attackerHeroId: 'p1-hero', defenderHeroId: 'p2-hero', defenderPlayerId: 'p2',
      }, 606,
    );
    stack(backlash, 'attacker-0').position = { x: 4, y: 4 };
    stack(backlash, 'defender-0').position = { x: 5, y: 4 };
    linkCompanies(backlash, 'attacker-0', 'attacker-1', 1, 3);
    const backlashBefore = stack(backlash, 'attacker-1').topHp;
    runAttackPipeline(backlash, 'attacker-0', 'defender-0');
    expect(stack(backlash, 'attacker-1').topHp).toBeLessThan(backlashBefore);
  });

  it('rejects defeated primitive recipients and invalid hazard geometry with visible reasons', () => {
    const battle = fixture();
    const dead = stack(battle, 'defender-0');
    dead.count = 0; dead.topHp = 0;
    const defeated = { ok: false, reason: { code: 'target-defeated', text: expect.any(String) } };
    expect(mindControlCompany(battle, dead.id, 'attacker', 1, 99)).toMatchObject(defeated);
    expect(teleportCompany(battle, dead.id, { x: 4, y: 4 })).toMatchObject(defeated);
    expect(stunCompany(battle, dead.id, 1)).toMatchObject(defeated);
    expect(applyBerserk(battle, dead.id, 1, 'attacker')).toMatchObject(defeated);
    expect(cloneCompany(battle, dead.id, 1, { x: 4, y: 4 })).toMatchObject(defeated);
    expect(grantSpellImmunity(battle, dead.id, 1, 'attacker')).toMatchObject(defeated);
    expect(sacrificeCompany(battle, dead.id)).toMatchObject(defeated);
    expect(grantShots(battle, dead.id, 1)).toMatchObject(defeated);
    expect(grantExtraAction(battle, dead.id)).toMatchObject(defeated);
    expect(linkCompanies(battle, dead.id, 'defender-1', 0.5)).toMatchObject(defeated);
    expect(cloneCompany(battle, 'attacker-0', 0, { x: 4, y: 4 })).toMatchObject({
      ok: false, reason: { code: 'invalid-value' },
    });
    expect(mindControlCompany(battle, 'attacker-0', 'attacker', 1, 999)).toMatchObject({
      ok: false, reason: { code: 'mind-control-ally' },
    });
    expect(createHazardHex(battle, { x: 4, y: 4 }, 2, 'attacker', {
      kind: 'damage', amount: -1,
    })).toMatchObject({ ok: false, reason: { code: 'invalid-value' } });
    expect(createHazardHex(battle, { x: 4, y: 4 }, 2, 'attacker', {
      kind: 'teleport', destination: { x: 99, y: 4 },
    })).toMatchObject({ ok: false, reason: { code: 'illegal-destination' } });
  });

  it('teleports wide footprints only to legal empty anchors and clones only originals', () => {
    const battle = fixture();
    const ally = stack(battle, 'attacker-0');
    expect(teleportCompany(battle, ally.id, { x: 5, y: 4 }).ok).toBe(true);
    expect(teleportCompany(battle, ally.id, { x: 12, y: 9 })).toMatchObject({
      ok: false, reason: { code: 'illegal-destination' },
    });
    const clone = cloneCompany(battle, ally.id, 2, { x: 4, y: 1 });
    expect(clone).toMatchObject({ ok: true, value: { summoned: true, cloneOf: ally.id } });
    if (clone.ok) expect(cloneCompany(battle, clone.value.id, 1, { x: 5, y: 2 }))
      .toMatchObject({ ok: false, reason: { code: 'clone-source-cloned' } });
  });

  it('preserves counter magnitudes on conversion and removes a pile before detonation', () => {
    const battle = fixture();
    const enemy = stack(battle, 'defender-0');
    enemy.counters.chill = 7;
    expect(convertCounter(battle, enemy.id, 'chill', 'burn')).toEqual({
      ok: true, value: { converted: 7, discarded: 0 },
    });
    expect(enemy.counters).toMatchObject({ chill: 0, burn: 7 });
    const result = detonateCounter(battle, enemy.id, 'burn', 2, 0, 99, 'attacker');
    expect(result).toMatchObject({ ok: true, value: { consumed: 7, damage: 14 } });
    expect(enemy.counters.burn).toBe(0);
  });

  it('enforces sacrifice, shots, granted-action, mana, and copy bounds with stable reasons', () => {
    const battle = fixture();
    const ally = stack(battle, 'attacker-0');
    expect(grantShots(battle, ally.id, 3)).toMatchObject({ ok: true });
    expect(grantExtraAction(battle, ally.id, 2)).toMatchObject({ ok: true, value: 2 });
    expect(grantExtraAction(battle, ally.id)).toMatchObject({
      ok: false, reason: { code: 'extra-action-cap', text: expect.any(String) },
    });
    stack(battle, 'attacker-1').count = 0;
    expect(sacrificeCompany(battle, ally.id)).toMatchObject({
      ok: false, reason: { code: 'last-allied-company' },
    });
    battle.attackerHero.mana = 10; battle.attackerHero.manaMaximum = 12;
    expect(addManaClamped(battle.attackerHero, 20)).toBe(12);
    battle.defenderHero!.mana = 5; battle.defenderHero!.manaMaximum = 6;
    expect(drainMana(battle, 'attacker', 'defender', 4)).toMatchObject({ ok: true, value: 6 });
    expect(spellCopyEligibility('theToll', 'standing-mirror')).toMatchObject({
      ok: false, reason: { code: 'mana-copy-forbidden' },
    });
    expect(spellCopyEligibility('echo', 'mirror-hall')).toMatchObject({
      ok: false, reason: { code: 'copy-forbidden' },
    });
    expect(borrowAbilityEligibility(ally, 'ranged')).toMatchObject({ ok: true });
  });

  it('serializes stun, delayed triggers, side resonance, and all four hazard effects', () => {
    const battle = fixture();
    const ally = stack(battle, 'attacker-0');
    expect(stunCompany(battle, ally.id, 1).ok).toBe(true);
    expect(scheduleDelayedTrigger(battle, 'attacker',
      { kind: 'round-start', round: 2 },
      { kind: 'counter', targetId: 'defender-0', counter: 'hex', amount: 3 }).ok).toBe(true);
    grantMidBattleResonance(battle, 'attacker', 'wild');
    expect(effectiveResonances(battle, battle.attackerHero)).toContain('wild');
    expect(createHazardHex(battle, { x: 4, y: 4 }, -1, 'attacker',
      { kind: 'damage', amount: 3 }).ok).toBe(true);
    expect(createHazardHex(battle, { x: 4, y: 5 }, 2, 'attacker',
      { kind: 'heal', amount: 3 }).ok).toBe(true);
    expect(createHazardHex(battle, { x: 4, y: 6 }, 2, 'attacker',
      { kind: 'chill', amount: 2 }).ok).toBe(true);
    expect(createHazardHex(battle, { x: 4, y: 7 }, 2, 'attacker',
      { kind: 'teleport', destination: { x: 5, y: 7 } }).ok).toBe(true);
    ally.position = { x: 4, y: 4 };
    const before = ally.topHp;
    runTileHooks(battle, 'on-turn-start', ally);
    expect(ally.topHp).toBe(before - 3);
    const json = JSON.stringify(battle);
    expect(JSON.stringify(JSON.parse(json))).toBe(json);
    const cloned = cloneBattle(battle);
    const clonedTeleport = cloned.tiles.find((tile) => tile.hazard?.kind === 'teleport')!;
    if (clonedTeleport.hazard?.kind === 'teleport') clonedTeleport.hazard.destination.x = 6;
    const originalTeleport = battle.tiles.find((tile) => tile.hazard?.kind === 'teleport')!;
    expect(originalTeleport.hazard?.kind === 'teleport'
      ? originalTeleport.hazard.destination.x : -1).toBe(5);
    expect(linkCompanies(battle, ally.id, 'attacker-1', 0.5, 2).ok).toBe(true);
    const state = createGame({ seed: 607, p1: 'human', p2: 'ai' });
    state.phase = 'combat'; state.battle = battle;
    const saved = JSON.stringify(state);
    const restored = JSON.parse(saved);
    const restoredAgain = JSON.parse(saved);
    expect(stateHash(restoredAgain)).toBe(stateHash(restored));
    restoredAgain.battle.stacks.find((entry: BattleStack) => entry.id === ally.id)
      .damageLink.expiresRound += 1;
    expect(stateHash(restoredAgain)).not.toBe(stateHash(restored));
  });

  it('lets berserk target the nearest company of either side through the ordinary attack pipeline', () => {
    const battle = fixture();
    const actor = stack(battle, 'attacker-0');
    const ally = stack(battle, 'attacker-1');
    actor.position = { x: 4, y: 4 }; ally.position = { x: 5, y: 4 };
    const before = ally.topHp;
    actor.effects.push({ id: `berserk:${actor.id}:1`, spellId: 'quiet', duration: 1,
      magnitude: 1, beneficial: false, sourceSide: 'defender' });
    runAttackPipeline(battle, actor.id, ally.id);
    expect(ally.topHp).toBeLessThan(before);
  });

  it('settles a lethal on-enter hazard before a move-attack can continue', () => {
    let battle = fixture();
    const actor = stack(battle, 'attacker-0');
    const target = stack(battle, 'defender-0');
    stack(battle, 'attacker-1').count = 0;
    stack(battle, 'defender-1').count = 0;
    actor.position = { x: 0, y: 4 };
    target.position = { x: 2, y: 4 };
    createHazardHex(battle, { x: 1, y: 4 }, -1, 'defender', {
      kind: 'damage', amount: 9999, trigger: 'on-enter',
    });
    const action = { type: 'BATTLE_MOVE_ATTACK' as const,
      destination: { x: 1, y: 4 }, targetId: target.id };
    const targetBefore = target.topHp;
    battle = applyBattleAction(battle, action);
    expect(stack(battle, actor.id).count).toBe(0);
    expect(stack(battle, target.id).topHp).toBe(targetBefore);
    expect(battle.casualties.attacker.yeoman).toBe(10);
    expect(battle.destroyedStacks).toBe(1);
    expect(battle.winner).toBe('defender');
  });
});

describe('doc 62 §5 numbered loop bounds', () => {
  it('§5.1 clamps every mana gain to the captured maximum', () => {
    const battle = fixture();
    battle.attackerHero.mana = 1; battle.attackerHero.manaMaximum = 7;
    expect(addManaClamped(battle.attackerHero, 99)).toBe(7);
  });

  it('§5.2 blocks mirror copying of mana-granting spells but permits Echo', () => {
    expect(spellCopyEligibility('theToll', 'standing-mirror')).toMatchObject({
      ok: false, reason: { code: 'mana-copy-forbidden' },
    });
    expect(spellCopyEligibility('theToll', 'echo')).toMatchObject({ ok: true });
  });

  it('§5.3 derives sacrifice return from starting maximum HP after splitting', () => {
    const battle = fixture();
    const target = stack(battle, 'attacker-0');
    target.count = 1; target.topHp = 1;
    const result = sacrificeCompany(battle, target.id);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.value.startingMaxHp).toBeGreaterThan(result.value.lostHp);
  });

  it('§5.4 caps granted non-morale actions at two per company per round', () => {
    const battle = fixture();
    expect(grantExtraAction(battle, 'attacker-0', 2)).toMatchObject({ ok: true });
    expect(grantExtraAction(battle, 'attacker-0')).toMatchObject({
      ok: false, reason: { code: 'extra-action-cap' },
    });
  });

  it('§5.5 granting a company action never grants another hero cast', () => {
    const battle = fixture();
    battle.castRound.attacker = battle.round;
    grantExtraAction(battle, 'attacker-0');
    expect(battle.castRound.attacker).toBe(battle.round);
  });

  it('§5.6 Mirror Hall rejects every extra-action-granting spell', () => {
    for (const id of ['hourglassCrack', 'reprise', 'overclock', 'theLongOath',
      'bellBookAndCandle'] as const) {
      expect(spellCopyEligibility(id, 'mirror-hall'), id).toMatchObject({
        ok: false, reason: { code: 'copy-forbidden' },
      });
    }
  });

  it('§5.7 blocks Echo recursion, mirrors, twisters, and tier-five mirror copies', () => {
    expect(spellCopyEligibility('echo', 'echo').ok).toBe(false);
    expect(spellCopyEligibility('standingMirror', 'mirror-hall').ok).toBe(false);
    expect(spellCopyEligibility('reflect', 'mirror-hall').ok).toBe(false);
    expect(spellCopyEligibility('hourglassCrack', 'mirror-hall').ok).toBe(false);
    expect(spellCopyEligibility('echo', 'standing-mirror').ok).toBe(false);
    expect(spellCopyEligibility('reflect', 'standing-mirror').ok).toBe(false);
    for (const id of ['theToll', 'tithe', 'graveBargain'] as const) {
      expect(spellCopyEligibility(id, 'mirror-hall'), id).toMatchObject({
        ok: false, reason: { code: 'mana-copy-forbidden' },
      });
    }
    expect(spellCopyEligibility('dayspring', 'mirror-hall').ok).toBe(false);
    expect(spellCopyEligibility('dayspring', 'mirror-hall', { allowTier5: true }).ok).toBe(true);
  });

  it('§5.8 prevents cloning or resurrecting summoned clones', () => {
    const battle = fixture();
    const clone = cloneCompany(battle, 'attacker-0', 1, { x: 4, y: 1 });
    expect(clone).toMatchObject({ ok: true });
    if (!clone.ok) return;
    expect(cloneCompany(battle, clone.value.id, 1, { x: 5, y: 1 }).ok).toBe(false);
    expect(resurrectCompany(battle, clone.value.id, 10).ok).toBe(false);
  });

  it('§5.9 blocks copying a copied ability and hides a source with no eligible ability', () => {
    const battle = fixture();
    const target = stack(battle, 'attacker-0');
    const source = stack(battle, 'defender-1');
    target.position = { x: 4, y: 4 };
    source.position = { x: 5, y: 4 };
    source.copiedAbilityIds = ['soft_body'];
    expect(borrowAbilityEligibility(source, 'soft_body')).toMatchObject({
      ok: false, reason: { code: 'copied-ability-source' },
    });
    battle.attackerHero.knownSpells.push('borrowShape');
    battle.attackerHero.mana = battle.attackerHero.manaMaximum ?? 99;
    expect(legalSpellCasts(battle).some((action) => action.spellId === 'borrowShape'
      && action.secondaryTargetId === source.id)).toBe(false);
  });

  it('§5.10 permits control only once even after deterministic expiry', () => {
    const battle = fixture();
    const controlled = stack(battle, 'defender-1');
    controlled.counters.burn = 2;
    controlled.counterSources = { burn: 'defender' };
    controlled.counterDecayDelayed = { burn: true };
    expect(mindControlCompany(battle, 'defender-1', 'attacker', 1, 9999).ok).toBe(true);
    controlled.counters.burn = 4;
    controlled.counterSources.burn = 'attacker';
    controlled.counterDecayDelayed.burn = false;
    battle.round += 1; expireMindControl(battle);
    expect(controlled.counters.burn).toBe(2);
    expect(controlled.counterSources.burn).toBe('defender');
    expect(controlled.counterDecayDelayed.burn).toBe(true);
    expect(mindControlCompany(battle, 'defender-1', 'attacker', 1, 9999)).toMatchObject({
      ok: false, reason: { code: 'already-controlled' },
    });
  });

  it('§5.11 permits one duration-bound link and routes its share only once', () => {
    const battle = fixture();
    const first = stack(battle, 'defender-0');
    const second = stack(battle, 'defender-1');
    expect(linkCompanies(battle, first.id, second.id, 1, 2).ok).toBe(true);
    const before = first.topHp + second.topHp;
    applyImpactDamage(battle, { targetId: first.id, sourceSide: 'attacker',
      base: 3, coefficient: 0, spellPower: 0 });
    expect(first.topHp + second.topHp).toBe(before - 6);
    battle.round = 3; expireDamageLinks(battle);
    expect(first.damageLink).toBeUndefined();
    expect(second.damageLink).toBeUndefined();
  });

  it('§5.12 blocks both control extension and transfer to a third party', () => {
    const battle = fixture();
    mindControlCompany(battle, 'defender-1', 'attacker', 2, 9999);
    expect(mindControlCompany(battle, 'defender-1', 'attacker', 2, 9999))
      .toMatchObject({ ok: false, reason: { code: 'control-extension' } });
    expect(mindControlCompany(battle, 'defender-1', 'defender', 2, 9999))
      .toMatchObject({ ok: false, reason: { code: 'control-third-party' } });
  });

  it('§5.13 keeps the default cap at 9 and printed raised caps at no more than 15', () => {
    const battle = fixture();
    const target = stack(battle, 'defender-0');
    target.counters.chill = 9; target.counters.hex = 9;
    expect(convertCounter(battle, target.id, 'chill', 'hex', 15)).toEqual({
      ok: true, value: { converted: 6, discarded: 3 },
    });
    expect(target.counters.hex).toBe(15);
  });

  it('§5.14 conversion bypasses SP and artifact application bonuses', () => {
    const battle = fixture();
    battle.attackerHero.spellPower = 25;
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'forgeAshGauntlets' };
    const target = stack(battle, 'defender-0');
    target.counters.chill = 2;
    convertCounter(battle, target.id, 'chill', 'burn');
    expect(target.counters.burn).toBe(2);
  });

  it('§5.15 removes a detonation pile before its damage resolves', () => {
    const battle = fixture();
    const target = stack(battle, 'defender-0');
    target.counters.burn = 4;
    detonateCounter(battle, target.id, 'burn', 2, 0, 0, 'attacker');
    expect(target.counters.burn).toBe(0);
  });

  it('§5.16 allows only one destruction save to claim the same event', () => {
    const target = stack(fixture(), 'attacker-0');
    expect(claimDestructionSave(target, 1)).toMatchObject({ ok: true });
    expect(claimDestructionSave(target, 1)).toMatchObject({
      ok: false, reason: { code: 'resurrection-event-claimed' },
    });
  });
});

function driveToAttackerTurn(initial: BattleState): BattleState {
  let battle = initial;
  const round = battle.round;
  for (let guard = 0; guard < 20; guard += 1) {
    const actor = battle.stacks.find((entry) => entry.id === battle.currentStackId);
    if (actor?.side === 'attacker') return battle;
    battle = applyBattleAction(battle, { type: 'BATTLE_DEFEND' });
    if (battle.round !== round) throw new Error('No attacker turn remained for the fixture cast');
  }
  throw new Error('Attacker turn drive exceeded its finite guard');
}

function castAndCompleteRound(
  initial: BattleState, action: Extract<Parameters<typeof applyBattleAction>[1], { type: 'BATTLE_CAST' }>,
  plus = false,
): BattleState {
  let battle = driveToAttackerTurn(initial);
  battle.attackerHero.knownSpells = [...new Set([...battle.attackerHero.knownSpells, action.spellId])];
  battle.attackerHero.mana = 999; battle.attackerHero.manaMaximum = 999;
  if (plus) battle.attackerHero.upgradedSpells = [
    ...new Set([...battle.attackerHero.upgradedSpells, action.spellId]),
  ];
  battle = applyBattleAction(battle, action);
  const round = battle.round;
  for (let guard = 0; guard < 40 && battle.round === round && !battle.winner; guard += 1) {
    battle = applyBattleAction(battle, { type: 'BATTLE_DEFEND' });
  }
  if (!battle.winner && battle.round === round) throw new Error('Fixture cast round did not terminate');
  return battle;
}

const STALL_FIXTURES = [
  {
    name: 'Quiet Yard',
    setup: () => {
      const battle = fixture(); battle.round = 97;
      return castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'wallOfTheMaker',
        positions: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 6 }],
      });
    },
    verify: (battle: BattleState) => {
      expect(battle.tiles.filter((tile) => tile.type === 'wall')).toHaveLength(3);
    },
  },
  {
    name: 'Standing Cold',
    setup: () => {
      let battle = fixture(); battle.round = 94;
      const first = stack(battle, 'defender-0');
      stack(battle, 'defender-1').position = { x: first.position.x, y: first.position.y + 1 };
      battle = castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'graveChill', targetId: first.id,
      });
      battle = castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'overgrow', effectId: `counter:${first.id}:chill`,
      });
      battle = castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'amplify', effectId: `counter:${first.id}:chill`,
      });
      return castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'ashenPall',
      }, true);
    },
    verify: (battle: BattleState) => {
      expect(stack(battle, 'defender-0').counters.chill).toBeGreaterThan(0);
      expect(stack(battle, 'defender-1').counters.chill).toBeGreaterThan(0);
    },
  },
  {
    name: 'Attrition Wall',
    setup: () => {
      let battle = fixture(); battle.round = 95;
      battle = castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'secondGrave', targetId: 'attacker-0',
      });
      battle = castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'mournersVeil', targetId: 'attacker-0',
      }, true);
      return castAndCompleteRound(battle, {
        type: 'BATTLE_CAST', spellId: 'holdTheLine',
      }, true);
    },
    verify: (battle: BattleState) => {
      expect(stack(battle, 'attacker-0').effects.map((effect) => effect.spellId))
        .toEqual(expect.arrayContaining(['secondGrave', 'mournersVeil']));
      expect(battle.enchantments.attacker.some((effect) => effect.spellId === 'holdTheLine')).toBe(true);
    },
  },
] as const;

describe.each(STALL_FIXTURES)('$name termination fixture', ({ setup, verify }) => {
  it('§5.17 crosses complete normal rounds and resolves at the fixed limit', () => {
    let battle = setup();
    verify(battle);
    const startingRound = battle.round;
    let completedRounds = 0;
    while (!battle.winner) {
      const before = battle.round;
      battle = applyBattleAction(battle, { type: 'BATTLE_DEFEND' });
      if (battle.round !== before) completedRounds += 1;
    }
    expect(startingRound).toBeLessThan(100);
    expect(completedRounds).toBeGreaterThanOrEqual(2);
    expect(battle.terminationReason).toBe('round-limit');
    expect(battle.winner).toMatch(/attacker|defender/);
    expect(battle.log.at(-1)).toMatch(/Round limit reached/);
  });
});

describe('round-limit ownership attribution', () => {
  it('§5.17 scores a controlled company against its original army denominator', () => {
    let battle = fixture();
    const attacker = stack(battle, 'attacker-0');
    attacker.count = 3; attacker.topHp = 7;
    stack(battle, 'attacker-1').count = 0;
    const controlled = stack(battle, 'defender-0');
    const defender = stack(battle, 'defender-1');
    defender.count = 1; defender.topHp = 1;
    expect(mindControlCompany(battle, controlled.id, 'attacker', 3, 9999).ok).toBe(true);
    battle.round = 100;
    battle.order = battle.stacks.filter((entry) => entry.count > 0).map((entry) => entry.id);
    battle.currentStackId = battle.order[0];
    while (!battle.winner) battle = applyBattleAction(battle, { type: 'BATTLE_DEFEND' });
    expect(battle.terminationReason).toBe('round-limit');
    expect(battle.winner).toBe('defender');
  });
});

describe('temporary control ownership boundary', () => {
  it('keeps the last living enemy in elimination accounting until control expires and reverts', () => {
    let battle = fixture();
    const controlled = stack(battle, 'defender-0');
    stack(battle, 'defender-1').count = 0;
    expect(mindControlCompany(battle, controlled.id, 'attacker', 1, 9999).ok).toBe(true);
    battle.order = [];
    battle.currentStackId = null;

    battle = recoverInactiveBattleTurn(battle);

    expect(battle.winner).toBeNull();
    expect(battle.round).toBe(2);
    expect(stack(battle, controlled.id)).toMatchObject({ side: 'defender' });
    expect(stack(battle, controlled.id).originalSide).toBeUndefined();
  });

  it('cannot transfer a controlled original company during surrender or army settlement', () => {
    const battle = fixture();
    const attackerCost = surrenderCost(battle, 'attacker');
    const defenderCost = surrenderCost(battle, 'defender');
    const controlled = stack(battle, 'defender-1');
    expect(mindControlCompany(battle, controlled.id, 'attacker', 3, 9999).ok).toBe(true);

    expect(surrenderCost(battle, 'attacker')).toBe(attackerCost);
    expect(surrenderCost(battle, 'defender')).toBe(defenderCost);
    expect(armyAfterBattle(battle, 'attacker').some((entry) =>
      entry?.unitId === controlled.unitId)).toBe(false);
    expect(armyAfterBattle(battle, 'defender')[controlled.slot]).toEqual({
      unitId: controlled.unitId, count: controlled.count,
    });

    const game = createGame({ seed: 608, p1: 'human', p2: 'human' });
    const attacker = game.players.p1.hero!;
    const defender = game.players.p2.hero!;
    const [settling] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 7 }]),
      attacker, defender, {
        kind: 'hero', targetId: defender.id, destination: { ...defender.position },
        attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2',
      }, 608,
    );
    const settlingDefender = stack(settling, 'defender-0');
    expect(mindControlCompany(
      settling, settlingDefender.id, 'attacker', 3, 9999,
    ).ok).toBe(true);
    settling.winner = 'attacker';
    settling.withdrawal = { side: 'defender', kind: 'surrender', cost: 0 };
    game.battle = settling;
    game.phase = 'combat';

    finalizeBattle(game);

    expect(attacker.army.some((entry) => entry?.unitId === 'tinSoldier')).toBe(false);
    const surrenderedDefender = game.players.p2.tavernPool.find((hero) =>
      hero.id === defender.id)!;
    expect(surrenderedDefender.army.some((entry) =>
      entry?.unitId === 'tinSoldier' && entry.count === 7)).toBe(true);
  });

  it('attributes controlled casualties and pending owner saves to the original army', () => {
    const battle = fixture();
    battle.defenderHero!.artifacts.equipment.misc1 = { id: 'longestCandle' };
    const source = stack(battle, 'attacker-0');
    const controlled = stack(battle, 'defender-0');
    source.count = 100;
    source.position = { x: 4, y: 4 };
    controlled.position = { x: 5, y: 4 };
    expect(mindControlCompany(battle, controlled.id, 'attacker', 3, 9999).ok).toBe(true);
    source.effects.push({ id: `berserk:${source.id}:owner-test`, spellId: 'quiet', duration: 1,
      magnitude: 1, beneficial: false, sourceSide: 'defender' });

    runAttackPipeline(battle, source.id, controlled.id);

    expect(controlled.count).toBe(0);
    expect(battle.casualties.defender.tinSoldier).toBe(10);
    expect(battle.casualties.attacker.tinSoldier ?? 0).toBe(0);
    expect(battle.longestCandlePending.defender).toBe(controlled.id);
    expect(battle.longestCandlePending.attacker).toBeNull();
  });
});
