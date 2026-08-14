import { describe, expect, it } from 'vitest';
import { ABILITY_PRESENTATION } from '../../content/abilityPresentation';
import { UNITS } from '../../content/units';
import { inspectTarget } from '../../ui/inspection';
import { ABILITY_REGISTRY } from '../combat/abilities';
import { applyBattleAction, createBattle, legalBattleActions } from '../combat/battle';
import { cloneBattle } from '../combat/battleClone';
import { beginStackTurn, totalStackHp } from '../combat/magicEffects';
import { applySpellImpactDamage, eligibleBorrowAbilities, massTargets } from '../combat/primitives';
import {
  doc63PersistentAttackBonus, doc63TargetDamageMultiplier, runAttackPipeline,
} from '../combat/pipeline';
import { castCreatureSpell, castStoredSpell } from '../combat/spells';
import { creatureResonances, spellManaCost } from '../combat/spellModifiers';
import { makeArmy, STRENGTH_ABILITY_ADJUSTMENTS } from '../army';
import { createGame } from '../game';
import type { AbilityId, BattleState, UnitId } from '../types';

const ROWS: Array<[AbilityId, string]> = [
  ['hex_feeder', 'damage-computation'], ['counter_eater', 'turn-start'],
  ['burn_conduit', 'apply'], ['bloomshare', 'turn-start'], ['echoing', 'apply'],
  ['spell_battery', 'hero-cost'], ['mana_leech', 'apply'], ['spell_shrug', 'damage-routing'],
  ['spellbound', 'target-selection'], ['sniper', 'damage-computation'],
  ['chain_shot', 'apply'], ['first_strike', 'retaliation'], ['phalanx', 'damage-routing'],
  ['unstable', 'death-triggers'], ['soul_tithe', 'death-triggers'],
  ['blink_step', 'activated'], ['altar', 'activated'], ['hedge_caster', 'activated'],
  ['ward_bearer', 'target-selection'], ['siphon', 'apply'],
];

const RETUNES: Array<[UnitId, AbilityId]> = [
  ['yeoman', 'phalanx'], ['tinSoldier', 'counter_eater'], ['larvalTide', 'altar'],
  ['waxServitor', 'ward_bearer'], ['longbowman', 'sniper'], ['silkSpinners', 'chain_shot'],
  ['boneChoir', 'caster'], ['sentries', 'first_strike'],
  ['fencePostFamiliars', 'echoing'], ['candleWisps', 'unstable'],
  ['crowChorus', 'hex_feeder'], ['marionette', 'blink_step'],
  ['drumCallers', 'soul_tithe'], ['amberCarriers', 'bloomshare'],
  ['rusalka', 'siphon'], ['grassSerpent', 'burn_conduit'],
];

function battle(attacker: UnitId[], defender: UnitId[], defenderHero = true): BattleState {
  const game = createGame({ seed: 6310, p1: 'human', p2: 'human' });
  const [state] = createBattle(makeArmy(attacker.map((unitId) => ({ unitId, count: 10 }))),
    makeArmy(defender.map((unitId) => ({ unitId, count: 10 }))), game.players.p1.hero!,
    defenderHero ? game.players.p2.hero! : null, {
      kind: 'hero', targetId: 'target', destination: { x: 4, y: 4 },
      attackerHeroId: game.players.p1.hero!.id,
    }, 6310);
  state.obstacles = []; state.tiles = []; state.currentStackId = state.stacks[0].id;
  return state;
}

describe('doc 63 creature support audit', () => {
  it('catalog audit: registers/presents 20 rows and inspects 16 retunes with retained flavor', () => {
    expect(ROWS).toHaveLength(20); expect(RETUNES).toHaveLength(16);
    const game = createGame({ seed: 63, p1: 'human', p2: 'human' });
    for (const [id, stage] of ROWS) {
      expect(ABILITY_REGISTRY[id].stage, id).toBe(stage);
      expect(ABILITY_PRESENTATION[id].description.length, id).toBeGreaterThan(12);
    }
    for (const [unitId, ability] of RETUNES) {
      expect(UNITS[unitId].abilities, unitId).toContain(ability);
      expect(UNITS[unitId].flavor.trim().length, unitId).toBeGreaterThan(12);
      const card = inspectTarget(game, { kind: 'unit', id: unitId })!;
      expect(card.flavor, unitId).toBe(UNITS[unitId].flavor);
      expect(card.mechanics.some((line) => line === `${ABILITY_PRESENTATION[ability].name}: ${ABILITY_PRESENTATION[ability].description}`), unitId).toBe(true);
    }
    expect(UNITS.boneChoir.caster).toEqual({
      repertoire: ['wither', 'graveChill'], charges: 2, castPower: 3,
    });
  });

  it('strength audit: only four printed stable directions enter the scalar', () => {
    expect(STRENGTH_ABILITY_ADJUSTMENTS.sniper).toBe(0.08);
    expect(STRENGTH_ABILITY_ADJUSTMENTS.first_strike).toBe(0.10);
    expect(STRENGTH_ABILITY_ADJUSTMENTS.phalanx).toBe(0.06);
    expect(STRENGTH_ABILITY_ADJUSTMENTS.spell_shrug).toBe(0.05);
    ROWS.map(([id]) => id).filter((id) => !['sniper', 'first_strike', 'phalanx', 'spell_shrug',
      'spellbound'].includes(id))
      .forEach((id) => expect(STRENGTH_ABILITY_ADJUSTMENTS[id], id).toBeUndefined());
  });

  it('hex_feeder: adds 10% per target Hex alongside, not compounded with, ordinary 5%', () => {
    const state = battle(['crowChorus'], ['tinSoldier']);
    const [feeder, target] = state.stacks; target.counters.hex = 2;
    expect(doc63TargetDamageMultiplier(feeder, target, false)).toBe(1.1);
    expect(doc63TargetDamageMultiplier(feeder, target)).toBe(1.3);
  });

  it('counter_eater: consumes each present pile and replaces the next-turn Attack bonus', () => {
    const state = battle(['tinSoldier'], ['yeoman']); const eater = state.stacks[0];
    eater.counters = { burn: 2, chill: 1, hex: 0, bloom: 3 }; beginStackTurn(state, eater);
    expect(eater.counters).toEqual({ burn: 1, chill: 0, hex: 0, bloom: 2 });
    expect(doc63PersistentAttackBonus(eater)).toBe(3);
    eater.counters = { burn: 0, chill: 0, hex: 1, bloom: 0 }; beginStackTurn(state, eater);
    expect(doc63PersistentAttackBonus(eater)).toBe(1);
    eater.temporaryAbilities = []; eater.unitId = 'yeoman'; beginStackTurn(state, eater);
    expect(doc63PersistentAttackBonus(eater)).toBe(0);
  });

  it('burn_conduit: moves exactly 2 resolved Burn, or creates fixed Burn 1', () => {
    const move = battle(['grassSerpent'], ['tinSoldier']); const [snake, target] = move.stacks;
    snake.count = 1; snake.position = { x: 0, y: 4 }; target.position = { x: 1, y: 4 };
    snake.counters.burn = 4; move.attackerHero.skills.tallykeeper = 3;
    runAttackPipeline(move, snake.id, target.id); expect(snake.counters.burn).toBe(2);
    expect(target.counters.burn).toBe(2);
    const create = battle(['grassSerpent'], ['tinSoldier']); create.stacks[0].count = 1; create.stacks[0].position = { x: 0, y: 4 };
    create.stacks[1].position = { x: 1, y: 4 }; create.attackerHero.skills.tallykeeper = 3;
    runAttackPipeline(create, create.stacks[0].id, create.stacks[1].id);
    expect(create.stacks[1].counters.burn).toBe(1);
  });

  it('bloomshare: mirrors half the actual top-unit healing to every adjacent ally only', () => {
    const state = battle(['amberCarriers', 'tinSoldier', 'tinSoldier'], ['yeoman']);
    const [carrier, adjacent, far] = state.stacks; carrier.count = 1; carrier.topHp = 1;
    adjacent.count = 1; adjacent.topHp = 1; far.count = 1; far.topHp = 1;
    carrier.position = { x: 0, y: 4 }; adjacent.position = { x: 1, y: 4 }; far.position = { x: 5, y: 4 };
    carrier.counters.bloom = 5; beginStackTurn(state, carrier);
    expect(carrier.topHp).toBe(4); expect(adjacent.topHp).toBe(3); expect(far.topHp).toBe(1);
  });

  it('echoing: enhances each explicit allied hero target once, not hostile/mass/creature/copy recipients', () => {
    const state = battle(['fencePostFamiliars', 'fencePostFamiliars'], ['fencePostFamiliars']);
    const [a, b, enemy] = state.stacks; state.attackerHero.knownSpells.push('bloom', 'yoke', 'rains');
    castStoredSpell(state, 'attacker', { type: 'BATTLE_CAST', spellId: 'bloom', targetId: a.id }, false);
    expect(a.counters.bloom).toBe(4);
    castStoredSpell(state, 'attacker', { type: 'BATTLE_CAST', spellId: 'yoke', targetId: a.id,
      secondaryTargetId: b.id }, false);
    expect(a.effects.find((e) => e.spellId === 'yoke')?.duration).toBe(4);
    expect(b.effects.find((e) => e.spellId === 'yoke')?.duration).toBe(4);
    castStoredSpell(state, 'attacker', { type: 'BATTLE_CAST', spellId: 'wither', targetId: enemy.id }, false);
    expect(enemy.counters.hex).toBe(6);
    const before = a.counters.bloom; castStoredSpell(state, 'attacker', { type: 'BATTLE_CAST', spellId: 'rains' }, false);
    expect(a.counters.bloom - before).toBe(1);
    const copy = battle(['fencePostFamiliars'], ['yeoman']);
    castStoredSpell(copy, 'attacker', { type: 'BATTLE_CAST', spellId: 'bloom',
      targetId: copy.stacks[0].id }, false, false, 0, false);
    expect(copy.stacks[0].counters.bloom).toBe(3);
    const creature = battle(['boneChoir'], ['fencePostFamiliars']);
    castCreatureSpell(creature, creature.stacks[0], 'wither', creature.stacks[1].id);
    expect(creature.stacks[1].counters.hex).toBe(6);
  });

  it('spell_battery: stacks per living company, minimum cost 1, split stacks each count', () => {
    const state = battle(['tinSoldier', 'tinSoldier'], ['yeoman']);
    delete state.attackerHero.skills.twicetold;
    state.attackerHero.knownSpells = ['holdTheLine'];
    const zero = spellManaCost(state, 'attacker', state.attackerHero, 'holdTheLine');
    state.stacks[0].temporaryAbilities = ['spell_battery'];
    expect(spellManaCost(state, 'attacker', state.attackerHero, 'holdTheLine')).toBe(zero - 1);
    state.stacks[1].temporaryAbilities = ['spell_battery'];
    expect(spellManaCost(state, 'attacker', state.attackerHero, 'holdTheLine')).toBe(zero - 2);
    state.stacks[1].count = 0;
    expect(spellManaCost(state, 'attacker', state.attackerHero, 'holdTheLine')).toBe(zero - 1);
    state.attackerHero.spellManaReductions.holdTheLine = 99;
    expect(spellManaCost(state, 'attacker', state.attackerHero, 'holdTheLine')).toBe(1);
  });

  it('mana_leech: transfers one enemy mana once per round and creates none from zero', () => {
    const state = battle(['longbowman'], ['yeoman', 'yeoman']); const [leech, one, two] = state.stacks;
    leech.temporaryAbilities = ['mana_leech']; state.attackerHero.mana = 0; state.defenderHero!.mana = 1;
    leech.position = { x: 0, y: 4 }; one.position = { x: 6, y: 4 }; two.position = { x: 6, y: 6 };
    runAttackPipeline(state, leech.id, one.id); expect(state.attackerHero.mana).toBe(1);
    expect(state.defenderHero!.mana).toBe(0); runAttackPipeline(state, leech.id, two.id);
    expect(state.attackerHero.mana).toBe(1); state.round += 1; runAttackPipeline(state, leech.id, two.id);
    expect(state.attackerHero.mana).toBe(1);
    const saved = battle(['longbowman'], ['yeoman']); saved.stacks[0].temporaryAbilities = ['mana_leech'];
    saved.stacks[1].count = 1; saved.stacks[1].topHp = 1; saved.defenderHero!.mana = 1; saved.attackerHero.mana = 0;
    saved.enchantments.defender.push({ id: 'hold', spellId: 'holdTheLine', upgraded: false, multiplier: 1, side: 'defender' });
    runAttackPipeline(saved, saved.stacks[0].id, saved.stacks[1].id);
    expect(saved.attackerHero.mana).toBe(0); expect(saved.defenderHero!.mana).toBe(1);
  });

  it('spell_shrug and spellbound: half impact; reject direct/Borrow but still take mass effects', () => {
    const state = battle(['tinSoldier'], ['yeoman']); const target = state.stacks[1];
    target.temporaryAbilities = ['spell_shrug', 'spellbound']; const hp = totalStackHp(target);
    expect(massTargets(state, 'attacker', 'mass-enemy')).toContain(target);
    applySpellImpactDamage(state, { targetId: target.id, sourceSide: 'attacker', base: 20,
      coefficient: 0, spellPower: 0 }); expect(hp - totalStackHp(target)).toBe(10);
    expect(() => castStoredSpell(state, 'attacker', { type: 'BATTLE_CAST', spellId: 'wither',
      targetId: target.id }, false)).toThrow();
    expect(eligibleBorrowAbilities(target)).toEqual([]);
  });

  it('sniper: exactly removes the beyond-seven-hex ranged penalty', () => {
    const near = battle(['longbowman'], ['tinSoldier']); near.stacks[0].position = { x: 0, y: 4 };
    near.stacks[1].position = { x: 6, y: 4 }; const nearHp = totalStackHp(near.stacks[1]);
    runAttackPipeline(near, near.stacks[0].id, near.stacks[1].id); const nearDamage = nearHp - totalStackHp(near.stacks[1]);
    const far = battle(['longbowman'], ['tinSoldier']); far.stacks[0].position = { x: 0, y: 4 };
    far.stacks[1].position = { x: 10, y: 4 }; const farHp = totalStackHp(far.stacks[1]);
    runAttackPipeline(far, far.stacks[0].id, far.stacks[1].id);
    expect(farHp - totalStackHp(far.stacks[1])).toBe(nearDamage);
  });

  it('chain_shot: spends one shot, picks a stable adjacent friendly, and never recursively chains', () => {
    const state = battle(['silkSpinners', 'tinSoldier'], ['yeoman', 'tinSoldier']);
    const [shooter, friendly, primary, enemy] = state.stacks; shooter.position = { x: 0, y: 4 };
    primary.position = { x: 8, y: 4 }; friendly.position = { x: 7, y: 4 }; enemy.position = { x: 8, y: 5 };
    const shot = shooter.shots; const friendlyHp = totalStackHp(friendly); const enemyHp = totalStackHp(enemy);
    runAttackPipeline(state, shooter.id, primary.id);
    expect(shooter.shots).toBe(shot - 1); expect(totalStackHp(friendly)).toBeLessThan(friendlyHp);
    expect(totalStackHp(enemy)).toBe(enemyHp);
  });

  it('first_strike: retaliates before melee and cancels a dead attacker', () => {
    const state = battle(['tinSoldier'], ['sentries']); const [attacker, sentry] = state.stacks;
    attacker.count = 1; attacker.topHp = 1; attacker.position = { x: 0, y: 4 }; sentry.position = { x: 1, y: 4 };
    runAttackPipeline(state, attacker.id, sentry.id); expect(attacker.count).toBe(0); expect(sentry.count).toBe(10);
  });

  it('phalanx: two adjacent sources still apply one nonstacking 15% reducer', () => {
    const state = battle(['tinSoldier'], ['yeoman', 'yeoman', 'yeoman']); const victim = state.stacks[1];
    state.stacks[2].position = { x: victim.position.x - 1, y: victim.position.y };
    state.stacks[3].position = { x: victim.position.x, y: victim.position.y - 1 };
    const before = totalStackHp(victim);
    applySpellImpactDamage(state, { targetId: victim.id, sourceSide: 'attacker', base: 50,
      coefficient: 0, spellPower: 0 }); expect(before - totalStackHp(victim)).toBe(43);
  });

  it('unstable: deals exact starting-max 20% to both sides and finite stable chains settle once', () => {
    const state = battle(['longbowman'], ['candleWisps', 'candleWisps']);
    const [ally, first, second] = state.stacks; first.temporaryAbilities = ['unstable'];
    first.unitId = 'tinSoldier'; first.count = 1; first.topHp = 1; second.count = 1; second.topHp = 1;
    ally.temporaryAbilities = ['no_retaliation'];
    first.position = { x: 1, y: 4 }; ally.position = { x: 0, y: 4 }; second.position = { x: 2, y: 4 };
    state.initialCounts[first.id] = 10;
    const expected = Math.ceil(10 * UNITS.tinSoldier.hp * 0.2);
    const allyHp = totalStackHp(ally); runAttackPipeline(state, ally.id, first.id);
    expect(allyHp - totalStackHp(ally)).toBe(expected);
    expect(first.destructionEvents).toBe(1); expect(second.destructionEvents).toBe(1);
  });

  it('soul_tithe: persistent Attack grows per enemy death and Silence suppresses/doubles', () => {
    const state = battle(['drumCallers', 'tinSoldier'], ['candleWisps']); const [tithe, killer, victim] = state.stacks;
    victim.count = 1; victim.topHp = 1; killer.position = { x: 0, y: 4 }; victim.position = { x: 1, y: 4 };
    runAttackPipeline(state, killer.id, victim.id); expect(doc63PersistentAttackBonus(tithe)).toBe(1);
    beginStackTurn(state, tithe); expect(doc63PersistentAttackBonus(tithe)).toBe(1);
    const suppressed = battle(['drumCallers', 'tinSoldier'], ['candleWisps']); suppressed.stacks[2].count = 1;
    suppressed.stacks[2].topHp = 1; suppressed.stacks[1].position = { x: 0, y: 4 }; suppressed.stacks[2].position = { x: 1, y: 4 };
    suppressed.enchantments.attacker.push({ id: 'silence', spellId: 'silenceThePassing', upgraded: false, multiplier: 1, side: 'attacker' });
    runAttackPipeline(suppressed, suppressed.stacks[1].id, suppressed.stacks[2].id);
    expect(suppressed.stacks[0].abilityUses?.soul_tithe).toBeUndefined();
    const doubled = battle(['drumCallers', 'tinSoldier'], ['candleWisps']); doubled.stacks[2].count = 1;
    doubled.stacks[2].topHp = 1; doubled.stacks[1].position = { x: 0, y: 4 }; doubled.stacks[2].position = { x: 1, y: 4 };
    doubled.enchantments.defender.push({ id: 'silence+', spellId: 'silenceThePassing', upgraded: true, multiplier: 1, side: 'defender' });
    runAttackPipeline(doubled, doubled.stacks[1].id, doubled.stacks[2].id);
    expect(doubled.stacks[0].abilityUses?.soul_tithe).toBe(2);
  });

  it('blink_step: lists exact legal noncurrent destinations and rejects forged blocked moves', () => {
    const state = battle(['marionette'], ['yeoman']); const actor = state.stacks[0];
    const actions = legalBattleActions(state).filter((a): a is Extract<typeof a, { type: 'BATTLE_USE_ABILITY' }> =>
      a.type === 'BATTLE_USE_ABILITY' && a.abilityId === 'blink_step');
    expect(actions.length).toBeGreaterThan(1); expect(actions.every((a) => a.destination?.x !== actor.position.x || a.destination?.y !== actor.position.y)).toBe(true);
    expect(() => applyBattleAction(state, { type: 'BATTLE_USE_ABILITY', abilityId: 'blink_step', destination: state.stacks[1].position })).toThrow();
  });

  it('altar: summoned sacrifice settles death once, full-heals without resurrection, and grants 2 mana', () => {
    const state = battle(['larvalTide', 'tinSoldier'], ['yeoman']); const [altar, offering] = state.stacks;
    offering.summoned = true; offering.position = { x: 1, y: altar.position.y }; altar.topHp = 1;
    state.attackerHero.mana = 0; const action = legalBattleActions(state).find((a) => a.type === 'BATTLE_USE_ABILITY' && a.abilityId === 'altar')!;
    const next = applyBattleAction(state, action); expect(next.stacks[1].count).toBe(0);
    expect(next.stacks[1].destructionEvents).toBe(1); expect(next.stacks[0].count).toBe(10);
    expect(next.stacks[0].topHp).toBe(UNITS.larvalTide.hp);
    expect(next.attackerHero.mana).toBe(2);
    expect(next.casualties.attacker.tinSoldier ?? 0).toBe(0);
  });

  it('caster: fixed SP3 works heroless, uses side resonance, preserves hero act, clones state', () => {
    let state = battle(['boneChoir'], ['yeoman']); state.attackerHero.spellPower = 99;
    const round = state.castRound.attacker; castCreatureSpell(state, state.stacks[0], 'wither', state.stacks[1].id);
    expect(state.stacks[1].counters.hex).toBe(6); expect(state.castRound.attacker).toBe(round);
    state = battle(['tinSoldier'], ['boneChoir'], false); state.stacks[1].side = 'defender';
    state.chosenResonance.defender = 'grave'; expect(creatureResonances(state, 'defender')).toContain('grave');
    castCreatureSpell(state, state.stacks[1], 'wither', state.stacks[0].id);
    expect(state.stacks[0].counters.hex).toBe(8); expect(cloneBattle(state).lastSpellCast).toEqual(state.lastSpellCast);
    const acted = battle(['boneChoir'], ['yeoman']); const action = legalBattleActions(acted)
      .find((a) => a.type === 'BATTLE_USE_ABILITY' && a.abilityId === 'caster')!;
    const next = applyBattleAction(acted, action); expect(next.stacks[0].abilityUses?.caster).toBe(1);
    const mirror = battle(['boneChoir'], ['yeoman', 'tinSoldier']);
    mirror.stacks[2].temporaryAbilities = ['mirror_hex']; mirror.defenderHero!.skills.tallykeeper = 3;
    castCreatureSpell(mirror, mirror.stacks[0], 'wither', mirror.stacks[1].id);
    expect(mirror.stacks[0].counters.hex).toBe(6);
    const sanctuary = battle(['boneChoir'], ['yeoman']); sanctuary.stacks[1].effects.push({
      id: 'sanctuary', spellId: 'sanctuary', duration: 2, magnitude: 1,
      beneficial: true, sourceSide: 'defender',
    });
    expect(() => castCreatureSpell(sanctuary, sanctuary.stacks[0], 'wither', sanctuary.stacks[1].id)).toThrow();
    const curse = battle(['tinSoldier', 'yeoman'], ['boneChoir']); curse.attackerHero.skills.curseEater = 3;
    curse.counterRedirectTarget.attacker = curse.stacks[2].id;
    castCreatureSpell(curse, curse.stacks[2], 'wither', curse.stacks[0].id);
    expect(curse.stacks[0].counters.hex).toBe(0); expect(curse.stacks[2].counters.hex).toBe(6);
  });

  it('ward_bearer: stable first eligible bearer redirects once and forged failures do not consume', () => {
    const state = battle(['longbowman'], ['yeoman', 'waxServitor', 'waxServitor']); const [, ally, a, b] = state.stacks;
    a.position = { x: ally.position.x - 1, y: ally.position.y }; b.position = { x: ally.position.x, y: ally.position.y - 1 };
    castStoredSpell(state, 'attacker', { type: 'BATTLE_CAST', spellId: 'wither', targetId: ally.id }, false);
    const chosen = [a, b].sort((x, y) => x.slot - y.slot || x.id.localeCompare(y.id))[0];
    expect(chosen.counters.hex).toBe(6); expect(chosen.abilityUses?.ward_bearer).toBe(1);
    castStoredSpell(state, 'attacker', { type: 'BATTLE_CAST', spellId: 'wither', targetId: ally.id }, false);
    expect([a, b].reduce((sum, x) => sum + (x.abilityUses?.ward_bearer ?? 0), 0)).toBe(2);
    const forged = battle(['longbowman'], ['yeoman', 'waxServitor']); const protectedAlly = forged.stacks[1];
    const protectedBearer = forged.stacks[2]; protectedBearer.position = { x: protectedAlly.position.x - 1, y: protectedAlly.position.y };
    protectedAlly.effects.push({ id: 'sanctuary', spellId: 'sanctuary', duration: 2,
      magnitude: 1, beneficial: true, sourceSide: 'defender' });
    const mana = forged.attackerHero.mana;
    expect(() => castStoredSpell(forged, 'attacker', { type: 'BATTLE_CAST', spellId: 'wither', targetId: protectedAlly.id }, false)).toThrow();
    expect(protectedBearer.abilityUses?.ward_bearer).toBeUndefined(); expect(forged.attackerHero.mana).toBe(mana);
  });

  it('siphon: heals half actual non-overkill damage to stable lowest-current-HP ally', () => {
    const state = battle(['rusalka', 'tinSoldier', 'tinSoldier'], ['yeoman']); const [siphon, ally, tied, target] = state.stacks;
    siphon.count = 1; siphon.topHp = UNITS.rusalka.hp; ally.count = 1; ally.topHp = 1; tied.count = 1; tied.topHp = 1;
    target.count = 1; target.topHp = 5; siphon.position = { x: 0, y: 4 }; target.position = { x: 1, y: 4 };
    runAttackPipeline(state, siphon.id, target.id); expect(ally.topHp).toBe(3); expect(tied.topHp).toBe(1);
  });
});
