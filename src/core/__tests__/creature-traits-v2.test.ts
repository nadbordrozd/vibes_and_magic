import { describe, expect, it } from 'vitest';
import { UNITS, DOC64_CASTER_RETUNES, DOC64_PATTERN_RETUNES, validateUnits } from '../../content/units';
import { ABILITY_PRESENTATION } from '../../content/abilityPresentation';
import { makeArmy } from '../army';
import { apply, createGame } from '../game';
import { applyBattleAction, createBattle, legalBattleActions } from '../combat/battle';
import { corneredAttackBonus, runAttackPipeline } from '../combat/pipeline';
import { attackPatternPlan } from '../combat/attackPatterns';
import { battleReachableHexes } from '../combat/battle';
import { legalAmbushDeployments } from '../combat/setup';
import { addBattleCounter } from '../combat/magicEffects';
import { totalStackHp } from '../combat/magicEffects';
import { DOC64_SHORTCUT_RISKS } from '../combat/doc64Audit';
import { resolveTargetResistance, spellDamageMultiplier } from '../combat/creatureTraits';
import { applySpellDamage, applySpellImpactDamage } from '../combat/primitives';
import { applyRoundMorale } from '../combat/round';
import { castStoredSpell } from '../combat/spells';
import { turnOrder } from '../combat/round';
import { creatureRevealBonus } from '../map/visibility';
import { creatureShoreCost } from '../game/navigation';
import { movementCost } from '../map/pathfinding';
import { terrainIdAt } from '../../content/terrain';
import { carrionSenseRewards } from '../game/setup';
import { chooseCombatAction } from '../../ai/combat';
import { validateCreatureV2Schemas } from '../../content/v2/validation';
import { SPELL_IDS } from '../../content/spells';
import type { AbilityId, Action, BattleStack, BattleState } from '../types';

function fixture(attacker: Parameters<typeof makeArmy>[0], defender: Parameters<typeof makeArmy>[0]): BattleState {
  const game = createGame({ seed: 6411, p1: 'human', p2: 'ai' });
  const [battle] = createBattle(makeArmy(attacker), makeArmy(defender),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: 'p2-hero', destination: { x: 4, y: 4 },
      attackerHeroId: game.players.p1.hero!.id, defenderHeroId: game.players.p2.hero!.id,
      defenderPlayerId: 'p2',
    }, 6411);
  battle.obstacles = []; return battle;
}
const stack = (battle: BattleState, id: string) => battle.stacks.find((item) => item.id === id)!;

describe('doc 64 creature traits v2', () => {
  it('audits every shortcut risk and exact authored assignment', () => {
    expect(DOC64_SHORTCUT_RISKS).toHaveLength(13);
    expect(Object.keys(DOC64_CASTER_RETUNES)).toHaveLength(5);
    expect(Object.keys(DOC64_PATTERN_RETUNES)).toHaveLength(12);
    expect(UNITS.fencePostFamiliars.abilities).toContain('ley_touched');
    expect(UNITS.boneChoir.abilities).toContain('caster');
    expect(UNITS.boneChoir.abilities).not.toContain('hedge_caster');
    expect(UNITS.reliquaryArk).toMatchObject({ shots: 6, attackPattern: { kind: 'blast-shot' } });
    expect(() => validateUnits()).not.toThrow();
  });

  it('prints every resistance, pattern, trait family, and drawback', () => {
    const ids: AbilityId[] = ['warded_hide', 'low_magic_immune', 'school_resistant',
      'unburnable', 'unchillable', 'unhexable', 'spell_ward', 'spell_deflect', 'spell_frail',
      'all_adjacent', 'breath', 'cleave', 'line_strike', 'blast_shot', 'arc_shot',
      'dread', 'hearth', 'standard_bearer', 'quench', 'cornered', 'first_blood', 'last_stand',
      'ambush', 'burrow', 'rear_guard', 'wall_walker', 'pathfinder', 'beast_of_burden',
      'ley_touched', 'tithe_bearer', 'far_sighted', 'carrion_sense', 'sea_legs',
      'mindless', 'feral', 'hungry', 'slow_witted', 'brittle_bones', 'unruly'];
    ids.forEach((id) => expect(ABILITY_PRESENTATION[id].description.length).toBeGreaterThan(20));
  });

  it('keeps caster charges per company independent of count and spends the company action only', () => {
    const battle = fixture([{ unitId: 'fencePostFamiliars', count: 40 }],
      [{ unitId: 'yeoman', count: 10 }]);
    const actor = stack(battle, 'attacker-0'); battle.currentStackId = actor.id;
    battle.attackerHero.knownSpells = []; const mana = battle.attackerHero.mana;
    const heroCastRound = battle.castRound.attacker;
    const casts = legalBattleActions(battle).filter((a) => a.type === 'BATTLE_USE_ABILITY'
      && a.abilityId === 'caster');
    expect(casts.length).toBeGreaterThan(0);
    let next = applyBattleAction(battle, casts[0]);
    expect(next.attackerHero.mana).toBe(mana);
    expect(stack(next, actor.id).abilityUses?.caster).toBe(1);
    stack(next, actor.id).count = 3; next.currentStackId = actor.id;
    const nextCasts = legalBattleActions(next).filter((a) => a.type === 'BATTLE_USE_ABILITY'
      && a.abilityId === 'caster');
    expect(nextCasts.length).toBeGreaterThan(0);
    next.currentStackId = actor.id;
    next = applyBattleAction(next, nextCasts[0]);
    next.currentStackId = actor.id;
    const finalCast = legalBattleActions(next).find((a) => a.type === 'BATTLE_USE_ABILITY'
      && a.abilityId === 'caster')!;
    next = applyBattleAction(next, finalCast);
    next.currentStackId = actor.id;
    expect(legalBattleActions(next).some((a) => a.type === 'BATTLE_USE_ABILITY'
      && a.abilityId === 'caster')).toBe(false);
    expect(next.castRound.attacker).toBe(heroCastRound);

    const placement = fixture([{ unitId: 'leshy', count: 4 }],
      [{ unitId: 'yeoman', count: 5 }]);
    placement.currentStackId = 'attacker-0';
    const thicket = legalBattleActions(placement).find((action) => action.type === 'BATTLE_USE_ABILITY'
      && action.abilityId === 'caster' && action.spellId === 'thicket'
      && action.positions?.length === 3);
    expect(thicket).toBeDefined();
    expect(applyBattleAction(placement, thicket!).tiles.filter((tile) =>
      tile.type === 'undergrowth')).toHaveLength(3);

    placement.resonance = null; placement.terrainResonances = [];
    placement.chosenResonance.attacker = null;
    placement.midBattleResonance ??= { attacker: [], defender: [] };
    placement.midBattleResonance.attacker = [];
    const bramble = legalBattleActions(placement).find((action): action is Extract<Action, {
      type: 'BATTLE_USE_ABILITY'
    }> =>
      action.type === 'BATTLE_USE_ABILITY' && action.abilityId === 'caster'
      && action.spellId === 'bramblelash');
    expect(bramble?.positions).toHaveLength(1);
    expect(() => applyBattleAction(placement, bramble!)).not.toThrow();
  });

  it('uses each creature spell existing AI timing and target hints', () => {
    const winning = fixture([{ unitId: 'brides', count: 1 }, { unitId: 'yeoman', count: 100 }],
      [{ unitId: 'tinSoldier', count: 1 }]);
    winning.currentStackId = 'attacker-0'; winning.attackerHero.knownSpells = [];
    winning.knackUseRound.attacker = winning.round;
    expect(chooseCombatAction(winning)).toMatchObject({
      type: 'BATTLE_USE_ABILITY', abilityId: 'caster', spellId: 'mournersVeil',
      targetId: 'attacker-1',
    });

    const losing = fixture([{ unitId: 'brides', count: 1 }],
      [{ unitId: 'tinSoldier', count: 100 }]);
    losing.currentStackId = 'attacker-0'; losing.attackerHero.knownSpells = [];
    losing.knackUseRound.attacker = losing.round;
    losing.initialCounts['attacker-0'] = 2;
    expect(chooseCombatAction(losing)).toMatchObject({
      type: 'BATTLE_USE_ABILITY', abilityId: 'caster', spellId: 'secondWind',
    });
  });

  it('plans exact odd/even axes and wide-footprint union victims', () => {
    const battle = fixture([{ unitId: 'oriflammeWyvern', count: 1 }],
      [{ unitId: 'yeoman', count: 1 }, { unitId: 'tinSoldier', count: 1 }]);
    const actor = stack(battle, 'attacker-0'); const primary = stack(battle, 'defender-0');
    actor.position = { x: 3, y: 4 }; primary.position = { x: 5, y: 4 };
    stack(battle, 'defender-1').position = { x: 6, y: 4 };
    expect(attackPatternPlan(battle, actor, primary)?.victims.map((v) => v.stack.id))
      .toEqual(['defender-0', 'defender-1']);
    actor.position = { x: 3, y: 3 }; primary.position = { x: 5, y: 3 };
    stack(battle, 'defender-1').position = { x: 6, y: 3 };
    expect(attackPatternPlan(battle, actor, primary)?.victims).toHaveLength(2);
    const wide = fixture([{ unitId: 'sleeper', count: 1 }], [{ unitId: 'yeoman', count: 1 }]);
    const wideActor = stack(wide, 'attacker-0'); const edge = stack(wide, 'defender-0');
    wideActor.position = { x: 3, y: 4 }; edge.position = { x: 6, y: 4 };
    expect(attackPatternPlan(wide, wideActor, edge)?.victims.map((v) => v.stack.id))
      .toContain(edge.id);
  });

  it('builds all six shared shapes with their printed scales and friendly-fire policy', () => {
    const battle = fixture([{ unitId: 'lanceKnight', count: 1 }, { unitId: 'yeoman', count: 1 }],
      [{ unitId: 'tinSoldier', count: 1 }, { unitId: 'hobbyKnight', count: 1 }]);
    const actor = stack(battle, 'attacker-0'); const primary = stack(battle, 'defender-0');
    const extra = stack(battle, 'defender-1'); const ally = stack(battle, 'attacker-1');
    actor.position = { x: 3, y: 4 }; primary.position = { x: 5, y: 4 };
    extra.position = { x: 6, y: 4 }; ally.position = { x: 4, y: 3 };
    const original = UNITS.lanceKnight.attackPattern;
    const plans = [
      { kind: 'all-adjacent' as const }, { kind: 'breath' as const },
      { kind: 'cleave' as const }, { kind: 'line-strike' as const, range: 3 },
      { kind: 'blast-shot' as const }, { kind: 'arc-shot' as const },
    ].map((pattern) => {
      (UNITS.lanceKnight as unknown as { attackPattern: typeof pattern }).attackPattern = pattern;
      return attackPatternPlan(battle, actor, primary)!;
    });
    (UNITS.lanceKnight as unknown as { attackPattern: typeof original }).attackPattern = original;
    expect(plans).toHaveLength(6);
    expect(plans[1].victims.map((v) => v.scale)).toEqual([1, 1]);
    expect(plans[2].victims.some((v) => v.scale === 0.5 && v.friendlyFire)).toBe(true);
    expect(plans[3].victims.map((v) => v.scale)).toEqual([1, 0.75]);
    expect(plans[4].victims.some((v) => v.friendlyFire)).toBe(true);
    expect(plans[5].victims.every((v) => !v.friendlyFire)).toBe(true);
  });

  it('applies pattern victims primary then ID order, spends one shot, and permits printed friendly fire', () => {
    const battle = fixture([{ unitId: 'reliquaryArk', count: 2 }, { unitId: 'yeoman', count: 5 }],
      [{ unitId: 'tinSoldier', count: 5 }, { unitId: 'hobbyKnight', count: 5 }]);
    const actor = stack(battle, 'attacker-0'); const primary = stack(battle, 'defender-0');
    actor.position = { x: 1, y: 4 }; primary.position = { x: 6, y: 4 };
    stack(battle, 'defender-1').position = { x: 6, y: 3 };
    stack(battle, 'attacker-1').position = { x: 6, y: 5 };
    const shot = actor.shots; const allyHp = stack(battle, 'attacker-1').topHp;
    runAttackPipeline(battle, actor.id, primary.id);
    expect(actor.shots).toBe(shot - 1);
    expect(stack(battle, 'attacker-1').topHp).toBeLessThan(allyHp);
    const logs = battle.log.filter((line) => line.includes(' attack ') || line.includes(' shoot '));
    expect(logs[0]).toContain('Tin Soldier');
  });

  it('enforces counter immunities and schema rationing with printed counterplay', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 1 }], [{ unitId: 'tinSoldier', count: 1 }]);
    const target = stack(battle, 'defender-0');
    const abilities = UNITS.tinSoldier.abilities;
    (UNITS.tinSoldier as unknown as { abilities: AbilityId[] }).abilities = [...abilities, 'unburnable'];
    try { addBattleCounter(battle, target, 'burn', 5, 'attacker'); expect(target.counters.burn).toBe(0); }
    finally { (UNITS.tinSoldier as unknown as { abilities: readonly AbilityId[] }).abilities = abilities; }
    const plain = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, faction: 'hearthguard' }));
    expect(() => validateCreatureV2Schemas([{ ...plain[0], abilities: ['spellbound'],
      resistances: [{ kind: 'spellbound' }] }, ...plain.slice(1)], new Set(SPELL_IDS))).not.toThrow();
    expect(() => validateCreatureV2Schemas(plain.slice(0, 4).map((u) => ({ ...u,
      abilities: ['spellbound'] as AbilityId[], resistances: [{ kind: 'spellbound' as const }] })),
    new Set(SPELL_IDS))).toThrow(/Resistance ration|three catalog/);
  });

  it('runtime-validates resistance values and bidirectional printed metadata', () => {
    const fill = (row: object) => [row, ...Array.from({ length: 5 }, (_, i) => ({
      id: `plain-${i}`, faction: 'hearthguard',
    }))];
    expect(() => validateCreatureV2Schemas(fill({ id: 'bad', faction: 'hearthguard',
      abilities: ['warded_hide'], resistances: [{ kind: 'warded-hide', percent: 30 }] }) as never,
    new Set(SPELL_IDS))).toThrow(/warded-hide/);
    expect(() => validateCreatureV2Schemas(fill({ id: 'bad', faction: 'hearthguard',
      abilities: ['caster'] }) as never, new Set(SPELL_IDS))).toThrow(/without caster metadata/);
    expect(() => validateCreatureV2Schemas(fill({ id: 'bad', faction: 'hearthguard',
      abilities: ['cleave'] }) as never, new Set(SPELL_IDS))).toThrow(/without matching/);
    expect(() => validateCreatureV2Schemas(fill({ id: 'bad', faction: 'hearthguard',
      attackPattern: { kind: 'splash-everything' } }) as never,
    new Set(SPELL_IDS))).toThrow(/invalid attack-pattern kind/);
  });

  it('gates each low-tier spell recipient before lethal accounting and composes spell damage reducers', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }],
      [{ unitId: 'tinSoldier', count: 1 }, { unitId: 'hobbyKnight', count: 2 }]);
    const immune = stack(battle, 'defender-0'); const ordinary = stack(battle, 'defender-1');
    const original = UNITS.tinSoldier.resistances;
    (UNITS.tinSoldier as unknown as { resistances: unknown[] }).resistances = [
      { kind: 'low-magic-immune' }, { kind: 'warded-hide', percent: 40 },
    ];
    battle.spellResolutionSource = {
      kind: 'hero', spellPower: 3, spellId: 'wither', skippedRecipientIds: [],
    };
    try {
      const before = { count: immune.count, casualties: battle.casualties.defender.tinSoldier ?? 0,
        destroyed: battle.destroyedStacks };
      expect(applySpellImpactDamage(battle, { targetId: immune.id, sourceSide: 'attacker',
        base: 999, coefficient: 0, spellPower: 0 }).ok).toBe(false);
      applySpellImpactDamage(battle, { targetId: ordinary.id, sourceSide: 'attacker',
        base: 999, coefficient: 0, spellPower: 0 });
      expect(immune.count).toBe(before.count);
      expect(battle.casualties.defender.tinSoldier ?? 0).toBe(before.casualties);
      expect(battle.destroyedStacks).toBe(before.destroyed + 1);
      battle.spellResolutionSource = {
        kind: 'hero', spellPower: 3, spellId: 'puppetStrings', skippedRecipientIds: [],
      };
      const hp = totalStackHp(immune); applySpellDamage(battle, immune, 10,
        { sourceSide: 'attacker' });
      expect(hp - totalStackHp(immune)).toBe(5);
    } finally { (UNITS.tinSoldier as unknown as { resistances?: typeof original }).resistances = original; }
  });

  it('executes every deterministic resistance shape and its counterplay', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }], [{ unitId: 'tinSoldier', count: 5 }]);
    const target = stack(battle, 'defender-0'); const original = UNITS.tinSoldier.resistances;
    const set = (resistances: NonNullable<typeof UNITS.tinSoldier.resistances>) => {
      (UNITS.tinSoldier as unknown as { resistances: typeof resistances }).resistances = resistances;
    };
    try {
      set([{ kind: 'low-magic-immune' }]);
      expect(resolveTargetResistance(battle, 'attacker', 'wither', target).blocked).toBe(true);
      expect(resolveTargetResistance(battle, 'attacker', 'puppetStrings', target).blocked).toBe(false);
      set([{ kind: 'school-resistant', school: 'grave' }]);
      expect(resolveTargetResistance(battle, 'attacker', 'wither', target).blocked).toBe(true);
      expect(resolveTargetResistance(battle, 'attacker', 'kindle', target).blocked).toBe(false);
      set([{ kind: 'spell-ward', charges: 2 }]); target.abilityUses = {};
      expect(resolveTargetResistance(battle, 'attacker', 'wither', target).blocked).toBe(true);
      expect(resolveTargetResistance(battle, 'attacker', 'wither', target).blocked).toBe(true);
      expect(resolveTargetResistance(battle, 'attacker', 'wither', target).blocked).toBe(false);
      set([{ kind: 'warded-hide', percent: 40 }]);
      expect(spellDamageMultiplier(target, false)).toBeCloseTo(0.6);
      set([{ kind: 'spell-frail' }]);
      expect(spellDamageMultiplier(target, true)).toBeCloseTo(1.5);
    } finally { (UNITS.tinSoldier as unknown as { resistances?: typeof original }).resistances = original; }
  });

  it('consumes a creature charge/action when resistance blocks its paid cast', () => {
    const battle = fixture([{ unitId: 'fencePostFamiliars', count: 40 }],
      [{ unitId: 'tinSoldier', count: 5 }]);
    const original = UNITS.tinSoldier.resistances;
    (UNITS.tinSoldier as unknown as { resistances: unknown[] }).resistances = [{ kind: 'low-magic-immune' }];
    battle.currentStackId = 'attacker-0';
    try {
      const action = legalBattleActions(battle).find((a) => a.type === 'BATTLE_USE_ABILITY'
        && a.abilityId === 'caster' && a.spellId === 'pinchOfAsh')!;
      const next = applyBattleAction(battle, action);
      expect(stack(next, 'attacker-0').abilityUses?.caster).toBe(1);
      expect(next.log.some((line) => line.includes('Low Magic Immunity'))).toBe(true);
      expect(next.currentStackId).not.toBe('attacker-0');
    } finally { (UNITS.tinSoldier as unknown as { resistances?: typeof original }).resistances = original; }
  });

  it('keeps Spellbound two-sided while untargeted mass effects remain counterplay', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }], [{ unitId: 'tinSoldier', count: 5 }]);
    const target = stack(battle, 'defender-0'); const abilities = UNITS.tinSoldier.abilities;
    (UNITS.tinSoldier as unknown as { abilities: AbilityId[] }).abilities = [...abilities, 'spellbound'];
    try {
      battle.attackerHero.knownSpells = ['wither']; battle.currentStackId = 'attacker-0';
      expect(legalBattleActions(battle).some((a) => a.type === 'BATTLE_CAST'
        && a.targetId === target.id)).toBe(false);
      battle.currentStackId = target.id; battle.defenderHero!.knownSpells = ['blessing'];
      expect(legalBattleActions(battle).some((a) => a.type === 'BATTLE_CAST'
        && a.targetId === target.id)).toBe(false);
    } finally { (UNITS.tinSoldier as unknown as { abilities: readonly AbilityId[] }).abilities = abilities; }
  });

  it('pays a blocked ward cast and gives Spell Deflect only to the defender as serialized choice', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }],
      [{ unitId: 'tinSoldier', count: 5 }]);
    battle.currentStackId = 'attacker-0'; battle.attackerHero.knownSpells = ['wither'];
    const original = UNITS.tinSoldier.resistances;
    (UNITS.tinSoldier as unknown as { resistances: unknown[] }).resistances = [{ kind: 'spell-deflect' }];
    try {
      const cast = legalBattleActions(battle).find((a) => a.type === 'BATTLE_CAST'
        && a.spellId === 'wither')!;
      const mana = battle.attackerHero.mana;
      const pending = applyBattleAction(battle, cast);
      expect(pending.attackerHero.mana).toBeLessThan(mana);
      expect(pending.pendingSpellDeflection).toMatchObject({ defenderSide: 'defender' });
      expect(legalBattleActions(pending).every((a) =>
        a.type === 'BATTLE_CHOOSE_SPELL_DEFLECT' && a.side === 'defender')).toBe(true);
      expect(() => applyBattleAction(pending, {
        type: 'BATTLE_CHOOSE_SPELL_DEFLECT', side: 'attacker', targetId: 'attacker-0',
      })).toThrow(/Illegal Spell Deflect/);
      const resolved = applyBattleAction(pending, legalBattleActions(pending)[0]);
      expect(resolved.pendingSpellDeflection).toBeUndefined();
      expect(resolved.lastSpellCast?.spellId).toBe('wither');
      expect(() => applyBattleAction(battle, {
        ...(cast as Extract<Action, { type: 'BATTLE_CAST' }>), deflectTargetId: 'attacker-0',
      }))
        .toThrow(/Spell cannot be cast|Illegal battle action/);
    } finally { (UNITS.tinSoldier as unknown as { resistances?: typeof original }).resistances = original; }
  });

  it('defers creature-cast finalization through defender choice and then mirrors without a second debit', () => {
    const battle = fixture([{ unitId: 'fencePostFamiliars', count: 10 }],
      [{ unitId: 'tinSoldier', count: 5 }, { unitId: 'yeoman', count: 5 }]);
    const caster = stack(battle, 'attacker-0'); const target = stack(battle, 'defender-0');
    stack(battle, 'defender-1').temporaryAbilities = ['mirror_hex'];
    const original = UNITS.tinSoldier.resistances;
    (UNITS.tinSoldier as unknown as { resistances: unknown[] }).resistances = [{ kind: 'spell-deflect' }];
    battle.currentStackId = caster.id;
    try {
      const cast = legalBattleActions(battle).find((action) => action.type === 'BATTLE_USE_ABILITY'
        && action.abilityId === 'caster' && action.spellId === 'pinchOfAsh')!;
      const pending = applyBattleAction(battle, cast);
      expect(stack(pending, caster.id).abilityUses?.caster).toBe(1);
      expect(pending.pendingSpellDeflection?.sourceKind).toBe('creature');
      const resolved = applyBattleAction(pending, legalBattleActions(pending)[0]);
      expect(stack(resolved, caster.id).abilityUses?.caster).toBe(1);
      expect(resolved.spellCasts).toBe(1);
      expect(resolved.log.some((line) => line.includes('Standing Mirror')
        || line.includes('Mirror') && line.includes('copies'))).toBe(true);
    } finally { (UNITS.tinSoldier as unknown as { resistances?: typeof original }).resistances = original; }
  });

  it('falls through Spell Deflect deterministically when no legal redirect exists', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 1 }], [{ unitId: 'tinSoldier', count: 5 }]);
    const target = stack(battle, 'defender-0'); const original = UNITS.tinSoldier.resistances;
    (UNITS.tinSoldier as unknown as { resistances: unknown[] }).resistances = [{ kind: 'spell-deflect' }];
    battle.currentStackId = 'attacker-0'; battle.attackerHero.knownSpells = ['wither'];
    stack(battle, 'attacker-0').temporaryAbilities = ['spellbound'];
    try {
      const cast = legalBattleActions(battle).find((action) => action.type === 'BATTLE_CAST'
        && action.spellId === 'wither' && action.targetId === target.id)!;
      const resolved = applyBattleAction(battle, cast);
      expect(resolved.pendingSpellDeflection).toBeUndefined();
      expect(stack(resolved, target.id).counters.hex).toBeGreaterThan(0);
    } finally { (UNITS.tinSoldier as unknown as { resistances?: typeof original }).resistances = original; }
  });

  it('keeps one-attack First Blood across independently recomputed pattern victims', () => {
    const battle = fixture([{ unitId: 'grassSerpent', count: 5 }],
      [{ unitId: 'yeoman', count: 10 }, { unitId: 'tinSoldier', count: 10 }]);
    const actor = stack(battle, 'attacker-0'); const primary = stack(battle, 'defender-0');
    const abilities = UNITS.grassSerpent.abilities;
    (UNITS.grassSerpent as unknown as { abilities: AbilityId[] }).abilities = [...abilities, 'first_blood'];
    actor.position = { x: 4, y: 4 }; primary.position = { x: 5, y: 4 };
    stack(battle, 'defender-1').position = { x: 4, y: 3 };
    try {
      runAttackPipeline(battle, actor.id, primary.id);
      expect(actor.attacksMade).toBe(1);
      expect(stack(battle, 'defender-1').count).toBeLessThan(10);
    } finally { (UNITS.grassSerpent as unknown as { abilities: readonly AbilityId[] }).abilities = abilities; }
  });

  it('applies attack riders only to the primary pattern victim and never grants secondary retaliation', () => {
    const battle = fixture([{ unitId: 'grassSerpent', count: 2 }],
      [{ unitId: 'yeoman', count: 20 }, { unitId: 'tinSoldier', count: 20 }]);
    const actor = stack(battle, 'attacker-0'); const primary = stack(battle, 'defender-0');
    actor.position = { x: 4, y: 4 }; primary.position = { x: 5, y: 4 };
    const secondary = stack(battle, 'defender-1'); secondary.position = { x: 4, y: 3 };
    runAttackPipeline(battle, actor.id, primary.id);
    expect(primary.counters.burn).toBe(1);
    expect(secondary.counters.burn).toBe(0);
    expect(primary.attacksMade).toBe(0);
    expect(secondary.attacksMade).toBe(0);
  });

  it('allows exactly primary retaliation after simultaneous Breath victims resolve', () => {
    const battle = fixture([{ unitId: 'oriflammeWyvern', count: 1 }],
      [{ unitId: 'yeoman', count: 20 }, { unitId: 'tinSoldier', count: 20 }]);
    const actor = stack(battle, 'attacker-0'); const primary = stack(battle, 'defender-0');
    const secondary = stack(battle, 'defender-1');
    actor.position = { x: 3, y: 4 }; primary.position = { x: 5, y: 4 };
    secondary.position = { x: 6, y: 4 };
    runAttackPipeline(battle, actor.id, primary.id);
    expect(primary.attacksMade).toBe(1);
    expect(secondary.attacksMade).toBe(0);
    expect(primary.count).toBeLessThan(20); expect(secondary.count).toBeLessThan(20);
  });

  it('lands every precomputed victim even when primary reflection kills the source', () => {
    const battle = fixture([{ unitId: 'sleeper', count: 1 }],
      [{ unitId: 'mirrorBound', count: 1 }, { unitId: 'yeoman', count: 10 }]);
    const actor = stack(battle, 'attacker-0'); const mirror = stack(battle, 'defender-0');
    const secondary = stack(battle, 'defender-1');
    actor.position = { x: 4, y: 4 }; actor.topHp = 1;
    mirror.position = { x: 6, y: 4 }; secondary.position = { x: 4, y: 3 };
    const before = totalStackHp(secondary);
    runAttackPipeline(battle, actor.id, mirror.id);
    expect(actor.count).toBe(0);
    expect(totalStackHp(secondary)).toBeLessThan(before);
  });

  it('recomputes secondary reducers independently and logs primary then secondary IDs', () => {
    const battle = fixture([{ unitId: 'reliquaryArk', count: 4 }],
      [{ unitId: 'yeoman', count: 20 }, { unitId: 'yeoman', count: 20 },
        { unitId: 'yeoman', count: 20 }]);
    const actor = stack(battle, 'attacker-0'); const primary = stack(battle, 'defender-0');
    const reduced = stack(battle, 'defender-1'); const phalanx = stack(battle, 'defender-2');
    actor.position = { x: 1, y: 4 }; primary.position = { x: 6, y: 4 };
    reduced.position = { x: 6, y: 3 }; phalanx.position = { x: 7, y: 2 };
    const abilities = UNITS.yeoman.abilities;
    // Only the stable-ID third company supplies Phalanx to the secondary.
    const beforePrimary = totalStackHp(primary); const beforeReduced = totalStackHp(reduced);
    runAttackPipeline(battle, actor.id, primary.id);
    const primaryLoss = beforePrimary - totalStackHp(primary);
    const reducedLoss = beforeReduced - totalStackHp(reduced);
    expect(reducedLoss).toBeLessThanOrEqual(Math.ceil(primaryLoss * 0.5));
    const logs = battle.log.filter((line) => line.includes('Reliquary Ark shoot'));
    expect(logs[0]).toContain('Yeoman');
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(UNITS.yeoman.abilities).toBe(abilities);
  });

  it('evaluates daily adventure traits once from live army presence', () => {
    let game = createGame({ seed: 6412, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    hero.army = makeArmy([{ unitId: 'fencePostFamiliars', count: 1 }]); hero.mana = 0;
    hero.position = { x: 0, y: 0 };
    game = apply(apply(game, { type: 'END_TURN' }), { type: 'END_TURN' });
    expect(game.players.p1.hero!.mana).toBe(3);
    game.players.p1.hero!.army = makeArmy([{ unitId: 'yeoman', count: 1 }]);
    game = apply(apply(game, { type: 'END_TURN' }), { type: 'END_TURN' });
    expect(game.players.p1.hero!.mana).toBe(5);
  });

  it('executes every live-army adventure hook once per documented daily boundary', () => {
    const familiarAbilities = UNITS.fencePostFamiliars.abilities;
    (UNITS.fencePostFamiliars as unknown as { abilities: AbilityId[] }).abilities = [
      ...familiarAbilities, 'pathfinder', 'beast_of_burden', 'tithe_bearer',
      'far_sighted', 'carrion_sense', 'sea_legs',
    ];
    try {
      let game = createGame({ seed: 6413, p1: 'human', p2: 'human' });
      const hero = game.players.p1.hero!;
      hero.army = makeArmy([{ unitId: 'fencePostFamiliars', count: 1 },
        { unitId: 'fencePostFamiliars', count: 1 }]);
      expect(creatureRevealBonus(hero)).toBe(2);
      expect(creatureShoreCost(hero)).toBe(150);
      const costly = Array.from({ length: game.map.width * game.map.height }, (_, index) => ({
        x: index % game.map.width, y: Math.floor(index / game.map.width),
      })).find((coord) => ['deepwood', 'mosswold', 'hush'].includes(terrainIdAt(game.map, coord))
        && movementCost(game.map, hero.position, coord, { skills: {}, faction: hero.faction,
          army: makeArmy([{ unitId: 'yeoman', count: 1 }]) }) > 100)!;
      expect(movementCost(game.map, hero.position, costly, hero)).toBe(100);
      hero.mana = 0; hero.position = { x: 4, y: 4 };
      const guarded = game.map.objects[0]; guarded.position = { x: 5, y: 4 };
      guarded.guardedBy = ['guarded-company'];
      const unguarded = game.map.objects[1]; unguarded.position = { x: 6, y: 4 };
      unguarded.guardedBy = [];
      const gold = game.players.p1.resources.gold;
      game = apply(apply(game, { type: 'END_TURN' }), { type: 'END_TURN' });
      const after = game.players.p1.hero!;
      expect(after.movement).toBe(2150);
      expect(after.mana).toBe(3);
      expect(game.players.p1.resources.gold).toBe(gold + 550);
      expect(game.players.p1.explored).toContain('5,4');
      expect(carrionSenseRewards(game, after).map((object) => object.id)).toContain(guarded.id);
      expect(carrionSenseRewards(game, after).map((object) => object.id)).not.toContain(unguarded.id);
      // Presence is boolean, and removing both companies immediately removes every hook.
      after.army = makeArmy([{ unitId: 'yeoman', count: 1 }]);
      expect(creatureRevealBonus(after)).toBe(0); expect(creatureShoreCost(after)).toBeNull();
    } finally {
      (UNITS.fencePostFamiliars as unknown as { abilities: readonly AbilityId[] }).abilities = familiarAbilities;
    }
  });

  it('charges Hungry daily and removes every unpaid company stably at week start', () => {
    const abilities = UNITS.yeoman.abilities;
    (UNITS.yeoman as unknown as { abilities: AbilityId[] }).abilities = [...abilities, 'hungry'];
    try {
      let paid = createGame({ seed: 6414, p1: 'human', p2: 'human' });
      let baseline = createGame({ seed: 6414, p1: 'human', p2: 'human' });
      paid.players.p1.hero!.army = makeArmy([{ unitId: 'yeoman', count: 1 }]);
      baseline.players.p1.hero!.army = makeArmy([{ unitId: 'tinSoldier', count: 1 }]);
      paid.players.p1.resources.gold = 100;
      baseline.players.p1.resources.gold = 100;
      paid = apply(apply(paid, { type: 'END_TURN' }), { type: 'END_TURN' });
      baseline = apply(apply(baseline, { type: 'END_TURN' }), { type: 'END_TURN' });
      expect(baseline.players.p1.resources.gold - paid.players.p1.resources.gold).toBe(100);
      expect(paid.players.p1.hero!.army.some(Boolean)).toBe(true);
      let unpaid = createGame({ seed: 6415, p1: 'human', p2: 'human' });
      unpaid.players.p1.hero!.army = makeArmy([{ unitId: 'yeoman', count: 1 },
        { unitId: 'yeoman', count: 1 }]); unpaid.players.p1.resources.gold = 0;
      for (let i = 0; i < 14; i += 1) unpaid = apply(unpaid, { type: 'END_TURN' });
      expect(unpaid.players.p1.hero!.army.every((slot) => slot === null)).toBe(true);
    } finally { (UNITS.yeoman as unknown as { abilities: readonly AbilityId[] }).abilities = abilities; }
  });

  it('keeps Burrow off-field, resumes through a serialized placement, and keeps ownership alive', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }], [{ unitId: 'tinSoldier', count: 5 }]);
    const actor = stack(battle, 'attacker-0'); actor.temporaryAbilities = ['burrow'];
    battle.currentStackId = actor.id;
    const action = legalBattleActions(battle).find((a) => a.type === 'BATTLE_USE_ABILITY'
      && a.abilityId === 'burrow')!;
    const next = applyBattleAction(battle, action);
    const buried = stack(next, actor.id);
    expect(buried.count).toBe(5); expect(buried.burrowReturnRound).toBeDefined();
    expect(legalBattleActions(next).some((a) => 'targetId' in a && a.targetId === buried.id)).toBe(false);
  });

  it('exposes Ambush as a legal own-half serialized deployment and rejects forgery', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }], [{ unitId: 'tinSoldier', count: 5 }]);
    const actor = stack(battle, 'attacker-0'); actor.temporaryAbilities = ['ambush'];
    battle.pendingAmbushStackId = actor.id;
    const options = legalBattleActions(battle);
    expect(options.length).toBeGreaterThan(1);
    expect(options.every((a) => a.type === 'BATTLE_DEPLOY_AMBUSH'
      && a.destination.x < 6)).toBe(true);
    expect(() => applyBattleAction(battle, {
      type: 'BATTLE_DEPLOY_AMBUSH', stackId: actor.id, destination: { x: 12, y: 8 },
    })).toThrow(/Illegal Ambush/);
    expect(legalAmbushDeployments(battle, actor)).toHaveLength(options.length);
  });

  it('makes Wall Walker ignore walls only, not companies or natural obstacles', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }, { unitId: 'longbowman', count: 5 }],
      [{ unitId: 'tinSoldier', count: 5 }]);
    const actor = stack(battle, 'attacker-0'); actor.temporaryAbilities = ['wall_walker'];
    actor.position = { x: 1, y: 4 }; stack(battle, 'attacker-1').position = { x: 2, y: 4 };
    battle.obstacles = [{ x: 2, y: 3 }];
    battle.tiles.push({ id: 'wall', type: 'wall', position: { x: 2, y: 5 }, duration: 9,
      sourceSide: 'defender', upgraded: false, createdRound: 1 });
    const reachable = battleReachableHexes(battle, actor);
    expect(reachable).toContainEqual({ x: 2, y: 5 });
    expect(reachable).not.toContainEqual({ x: 2, y: 4 });
    expect(reachable).not.toContainEqual({ x: 2, y: 3 });
  });

  it('keeps Feral deterministic and Mindless immune to direct round morale changes', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }], [{ unitId: 'tinSoldier', count: 5 }]);
    const actor = stack(battle, 'attacker-0'); actor.temporaryAbilities = ['feral', 'mindless'];
    actor.morale = 40; battle.currentStackId = actor.id;
    expect(legalBattleActions(battle)).toHaveLength(1);
    expect(['BATTLE_MOVE', 'BATTLE_MOVE_ATTACK', 'BATTLE_ATTACK', 'BATTLE_DEFEND'])
      .toContain(legalBattleActions(battle)[0].type);
  });

  it('keeps Mindless morale and extra actions unchanged across round, death, and spell drains', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 20 }],
      [{ unitId: 'tinSoldier', count: 5 }, { unitId: 'hobbyKnight', count: 1 }]);
    const mindless = stack(battle, 'defender-0'); const casualty = stack(battle, 'defender-1');
    mindless.temporaryAbilities = ['mindless']; mindless.morale = 37; mindless.bonusActions = 0;
    battle.defenderHero!.moraleBonus = 200;
    applyRoundMorale(battle);
    expect({ morale: mindless.morale, acts: mindless.bonusActions }).toEqual({ morale: 37, acts: 0 });
    const attacker = stack(battle, 'attacker-0'); attacker.position = { x: 4, y: 4 };
    casualty.position = { x: 5, y: 4 }; casualty.topHp = 1;
    runAttackPipeline(battle, attacker.id, casualty.id);
    expect({ morale: mindless.morale, acts: mindless.bonusActions }).toEqual({ morale: 37, acts: 0 });
    castStoredSpell(battle, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'kindle', targetId: mindless.id,
    }, true, false);
    castStoredSpell(battle, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'graveChill', targetId: mindless.id,
    }, true, false);
    expect({ morale: mindless.morale, acts: mindless.bonusActions }).toEqual({ morale: 37, acts: 0 });
  });

  it('executes adjacency auras and stops them immediately after removal from adjacency', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }, { unitId: 'tinSoldier', count: 5 }],
      [{ unitId: 'hobbyKnight', count: 5 }, { unitId: 'longbowman', count: 5 }]);
    const ally = stack(battle, 'attacker-0'); const hearth = stack(battle, 'attacker-1');
    const enemy = stack(battle, 'defender-0');
    ally.position = { x: 4, y: 4 }; hearth.position = { x: 3, y: 4 }; enemy.position = { x: 5, y: 4 };
    hearth.temporaryAbilities = ['hearth', 'standard_bearer', 'quench'];
    enemy.temporaryAbilities = ['dread']; ally.morale = 50;
    addBattleCounter(battle, ally, 'burn', 2, 'defender');
    expect(ally.counters.burn).toBe(0);
    applyRoundMorale(battle);
    expect(ally.counters.bloom).toBe(1);
    expect(ally.morale).toBeLessThan(50);
    hearth.position = { x: 0, y: 0 }; enemy.position = { x: 12, y: 8 };
    const bloom = ally.counters.bloom; addBattleCounter(battle, ally, 'burn', 2, 'defender');
    applyRoundMorale(battle);
    expect(ally.counters.bloom).toBe(bloom);
    expect(ally.counters.burn).toBe(2);
  });

  it('executes threshold, protection, ordering, melee drawback, and allied-target gates', () => {
    const corner = fixture([{ unitId: 'yeoman', count: 10 }], [{ unitId: 'tinSoldier', count: 20 }]);
    const actor = stack(corner, 'attacker-0'); actor.temporaryAbilities = ['cornered'];
    corner.initialCounts[actor.id] = 20;
    expect(corneredAttackBonus(corner, actor)).toBe(2);
    actor.position = { x: 4, y: 4 }; stack(corner, 'defender-0').position = { x: 5, y: 4 };
    const cornerHp = totalStackHp(stack(corner, 'defender-0'));
    runAttackPipeline(corner, actor.id, 'defender-0');
    expect(totalStackHp(stack(corner, 'defender-0'))).toBeLessThan(cornerHp);
    expect(turnOrder(corner.stacks, corner).at(-1)).not.toBe(actor.id);
    actor.temporaryAbilities = ['slow_witted'];
    expect(turnOrder(corner.stacks, corner).at(-1)).toBe(actor.id);

    const rear = fixture([{ unitId: 'yeoman', count: 5 }],
      [{ unitId: 'hobbyKnight', count: 5 }, { unitId: 'tinSoldier', count: 5 }]);
    const front = stack(rear, 'attacker-0'); const screen = stack(rear, 'defender-1');
    const protectedStack = stack(rear, 'defender-0'); protectedStack.temporaryAbilities = ['rear_guard'];
    front.position = { x: 4, y: 4 }; screen.position = { x: 4, y: 3 };
    protectedStack.position = { x: 5, y: 4 }; rear.currentStackId = front.id;
    expect(legalBattleActions(rear).some((action) => 'targetId' in action
      && action.targetId === protectedStack.id && action.type.includes('ATTACK'))).toBe(false);

    const brittle = fixture([{ unitId: 'yeoman', count: 5 }], [{ unitId: 'tinSoldier', count: 20 }]);
    const bActor = stack(brittle, 'attacker-0'); const bTarget = stack(brittle, 'defender-0');
    bActor.position = { x: 4, y: 4 }; bTarget.position = { x: 5, y: 4 };
    bTarget.temporaryAbilities = ['brittle_bones', 'unruly', 'last_stand'];
    const before = totalStackHp(bTarget); runAttackPipeline(brittle, bActor.id, bTarget.id);
    expect(totalStackHp(bTarget)).toBeLessThan(before);
    brittle.currentStackId = bActor.id; brittle.attackerHero.knownSpells = ['blessing'];
    expect(legalBattleActions(brittle).some((action) => action.type === 'BATTLE_CAST'
      && action.targetId === bTarget.id)).toBe(false);
  });

  it('clears existing counter piles when fixed counter immunities are acquired', () => {
    const battle = fixture([{ unitId: 'yeoman', count: 5 }], [{ unitId: 'tinSoldier', count: 5 }]);
    const target = stack(battle, 'attacker-0'); const source = stack(battle, 'defender-0');
    target.counters = { burn: 4, chill: 5, hex: 6, bloom: 0 };
    const abilities = UNITS.tinSoldier.abilities;
    (UNITS.tinSoldier as unknown as { abilities: AbilityId[] }).abilities = [
      ...abilities, 'unburnable', 'unchillable', 'unhexable',
    ];
    try {
      castStoredSpell(battle, 'attacker', {
        type: 'BATTLE_CAST', spellId: 'borrowShape', targetId: target.id,
        secondaryTargetId: source.id,
      }, true, false);
      expect(target.counters).toEqual({ burn: 0, chill: 0, hex: 0, bloom: 0 });
    } finally { (UNITS.tinSoldier as unknown as { abilities: readonly AbilityId[] }).abilities = abilities; }
  });
});
