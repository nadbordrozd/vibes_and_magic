import { describe, expect, it } from 'vitest';
import { makeArmy } from '../army';
import { applyBattleAction, createBattle } from '../combat/battle';
import { applyRoutedCombatDamage } from '../combat/damageRouting';
import { totalStackHp } from '../combat/magicEffects';
import { endStackTurn } from '../combat/magicEffects';
import { isP1PlacementCastLegal, legalSpellCasts, castStoredSpell } from '../combat/spells';
import {
  applyP1AttackModifiers, consumeP1AttackEffects,
} from '../combat/p1RiteCraftSpellEffects';
import { runAttackPipeline } from '../combat/pipeline';
import { cloneBattle } from '../combat/battleClone';
import { createGame } from '../game';
import { castAdventureSpell, canCastAdventureSpell } from '../game/adventureSpells';
import { terrainIdAt } from '../../content/terrain';
import { SPELLS } from '../../content/spells';
import {
  P1_RITE_CRAFT_AUDIT_IDS, P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS,
  P1_RITE_CRAFT_SPELL_IDS,
} from '../../content/spells/p1RiteCraft';
import { DOCS_60_67_SPELL_LEXICON_ASSET_REQUIREMENTS } from '../../content/spellLexicon';
import { resolveContentAsset } from '../../content/v2/assets';
import type { Action, BattleState, Coord, SpellId } from '../types';
import { castleFootprintTiles, objectFootprintTiles } from '../map/occupancy';

type BattleCast = Extract<Action, { type: 'BATTLE_CAST' }>;

function fixture(): BattleState {
  const game = createGame({ seed: 98601, p1: 'human', p2: 'human' });
  game.players.p1.hero!.spellPower = 4;
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 10 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 10 }]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 98601,
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

describe('docs-61 P1 Rite and Craft catalog', () => {
  it('audits all 24 P1 rows, including six retunes, against exact v2 catalog metadata', () => {
    const expected = [
      ['kindle', 'rite', 1, 2, 'fixed', 'single-enemy'],
      ['sunlance', 'rite', 1, 4, 'capped', 'single-enemy'],
      ['steadyHands', 'rite', 1, 3, 'fixed', 'single-ally'],
      ['wellspring', 'rite', 1, 5, 'open', 'owned-hero'],
      ['blessing', 'rite', 1, 3, 'fixed', 'single-ally'],
      ['census', 'rite', 1, 4, 'fixed', 'self'],
      ['secondWind', 'rite', 2, 6, 'open', 'single-ally'],
      ['standardOfDawn', 'rite', 2, 5, 'fixed', 'enchantment'],
      ['litanyOfDawn', 'rite', 3, 10, 'fixed', 'mass-ally'],
      ['trial', 'rite', 3, 8, 'open', 'single-enemy'],
      ['holdTheLine', 'rite', 4, 15, 'fixed', 'enchantment'],
      ['consecratedGround', 'rite', 4, 13, 'fixed', 'mass-all'],
      ['reprise', 'rite', 4, 13, 'fixed', 'single-ally'],
      ['rivet', 'craft', 1, 2, 'fixed', 'single-ally'],
      ['forgeSpark', 'craft', 1, 4, 'capped', 'single-enemy'],
      ['whetstone', 'craft', 1, 3, 'fixed', 'single-ally'],
      ['shrapnel', 'craft', 1, 4, 'fixed', 'single-ally'],
      ['ammunitionCart', 'craft', 2, 6, 'fixed', 'mass-ally'],
      ['unmake', 'craft', 2, 5, 'fixed', 'counter-pile'],
      ['detonate', 'craft', 3, 9, 'open', 'single-enemy'],
      ['clockworkDouble', 'craft', 3, 11, 'open', 'single-ally'],
      ['blink', 'craft', 3, 10, 'fixed', 'single-any'],
      ['overclock', 'craft', 4, 13, 'fixed', 'single-ally'],
      ['dimensionDoor', 'craft', 4, 16, 'open', 'position'],
    ] as const;
    expect(P1_RITE_CRAFT_AUDIT_IDS).toEqual(expected.map(([id]) => id));
    for (const [id, school, tier, mana, scaling, targeting] of expected) {
      expect(SPELLS[id], id).toMatchObject({ school, tier, mana, scaling, targeting });
    }
  });

  it('ships all 18 new rows with structured rules, flavor, and typed art placeholders', () => {
    expect(P1_RITE_CRAFT_SPELL_IDS).toHaveLength(18);
    for (const id of P1_RITE_CRAFT_SPELL_IDS) {
      const spell = SPELLS[id];
      expect(spell.rulePresentation?.standard.length, id).toBeGreaterThan(0);
      expect(spell.rulePresentation?.upgraded.length, id).toBeGreaterThan(0);
      expect(spell.base, id).not.toBe(spell.plus);
      expect(spell.flavor, id).not.toBe('The words remember what to do.');
      expect(spell.tier, id).toBeGreaterThanOrEqual(1);
      expect(spell.targeting, id).toBeTruthy();
      expect(spell.acquisition?.guild, id).toBe(true);
    }
    expect(P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS).toHaveLength(18);
    for (const requirement of P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS) {
      expect(resolveContentAsset(requirement, new Set(), 'development').kind).toBe('placeholder');
      expect(() => resolveContentAsset(requirement, new Set(), 'release')).toThrow(/Release asset missing/);
    }
    expect(DOCS_60_67_SPELL_LEXICON_ASSET_REQUIREMENTS).toHaveLength(8);
    for (const requirement of DOCS_60_67_SPELL_LEXICON_ASSET_REQUIREMENTS) {
      expect(resolveContentAsset(requirement, new Set(), 'development').kind).toBe('placeholder');
      expect(() => resolveContentAsset(requirement, new Set(), 'release'))
        .toThrow(/Release asset missing/);
    }
  });

  it('resolves the fixed/capped impact retunes and repaired Rite faces', () => {
    const kindle = fixture();
    const enemy = kindle.stacks.find((stack) => stack.side === 'defender')!;
    const before = totalStackHp(enemy);
    cast(kindle, 'kindle', true, { targetId: enemy.id });
    expect(before - totalStackHp(enemy)).toBe(16);

    const spark = fixture();
    const sparkTarget = spark.stacks.find((stack) => stack.side === 'defender')!;
    const sparkBefore = totalStackHp(sparkTarget);
    cast(spark, 'forgeSpark', true, { targetId: sparkTarget.id });
    expect(sparkBefore - totalStackHp(sparkTarget)).toBe(24);
    expect(sparkTarget.counters.burn).toBeGreaterThanOrEqual(4);

    const blessing = fixture();
    cast(blessing, 'blessing', true, { targetId: blessing.stacks[0].id });
    expect(blessing.stacks.filter((stack) => stack.side === 'attacker')
      .every((stack) => stack.effects.some((effect) => effect.spellId === 'blessing'))).toBe(true);

    const litany = fixture();
    cast(litany, 'litanyOfDawn', true);
    expect(litany.stacks.filter((stack) => stack.side === 'attacker')
      .every((stack) => stack.effects.some((effect) => effect.spellId === 'blessing'))).toBe(true);
  });

  it('uses shared resurrection, save, action, counter-detonate, clone, and teleport primitives', () => {
    const battle = fixture();
    const ally = battle.stacks[0];
    ally.count = 10;
    ally.topHp = 6;
    cast(battle, 'secondWind', false, { targetId: ally.id });
    expect(ally.count).toBeGreaterThan(10);

    cast(battle, 'holdTheLine', true);
    applyRoutedCombatDamage(battle, ally, 99999);
    expect(ally).toMatchObject({ count: 1, topHp: 1 });
    expect(ally.counters.bloom).toBe(3);

    const enemy = battle.stacks.find((stack) => stack.side === 'defender' && stack.count > 0)!;
    enemy.counters.burn = 4;
    const hp = totalStackHp(enemy);
    cast(battle, 'detonate', false, { targetId: enemy.id });
    expect(enemy.counters.burn).toBe(0);
    expect(totalStackHp(enemy)).toBeLessThan(hp);

    cast(battle, 'clockworkDouble', true, {
      targetId: battle.stacks[1].id, positions: [{ x: 3, y: 3 }],
    });
    const clone = battle.stacks.find((stack) => stack.cloneOf === battle.stacks[1].id)!;
    expect(clone).toMatchObject({ summoned: true });

    cast(battle, 'blink', false, { targetId: enemy.id, positions: [{ x: 8, y: 2 }] });
    expect(enemy.position).toEqual({ x: 8, y: 2 });

    cast(battle, 'reprise', true, { targetId: battle.stacks[1].id });
    expect(battle.pendingGrantedActions?.filter((entry) =>
      entry.sourceSpellId === 'reprise')).toHaveLength(2);
    expect(battle.stacks[1].grantedActionsThisRound).toBe(2);
  });

  it('makes dead-company Second Wind reachable only while its original footprint is free', () => {
    const battle = fixture();
    const fallen = battle.stacks[1];
    fallen.count = 0;
    fallen.topHp = 0;
    battle.currentStackId = battle.stacks[0].id;
    battle.attackerHero.knownSpells = ['secondWind'];
    battle.attackerHero.mana = 20;
    expect(legalSpellCasts(battle)).toContainEqual({
      type: 'BATTLE_CAST', spellId: 'secondWind', targetId: fallen.id,
    });
    const revived = applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'secondWind', targetId: fallen.id,
    });
    expect(revived.stacks.find((stack) => stack.id === fallen.id)!.count).toBeGreaterThan(0);

    const blocked = cloneBattle(battle);
    const blockedFallen = blocked.stacks.find((stack) => stack.id === fallen.id)!;
    blocked.stacks.find((stack) => stack.id === blocked.currentStackId)!.position = {
      ...blockedFallen.position,
    };
    expect(legalSpellCasts(blocked).some((action) => action.spellId === 'secondWind'
      && action.targetId === blockedFallen.id)).toBe(false);
  });

  it('keeps Rivet and Whetstone statistic records after their one-shot riders are consumed', () => {
    const battle = fixture();
    const ally = battle.stacks[1];
    const enemy = battle.stacks.find((stack) => stack.side === 'defender')!;
    cast(battle, 'rivet', true, { targetId: ally.id });
    cast(battle, 'whetstone', true, { targetId: ally.id });

    const defense = applyP1AttackModifiers(battle, enemy, ally, false);
    expect(defense.defense).toBe(3);
    const firstRetaliation = applyP1AttackModifiers(battle, ally, enemy, true);
    const secondRetaliation = applyP1AttackModifiers(battle, ally, enemy, true);
    expect([firstRetaliation.multiplier, secondRetaliation.multiplier]).toEqual([2, 1]);
    const firstAttack = applyP1AttackModifiers(battle, ally, enemy, false);
    expect(firstAttack).toMatchObject({ attack: 3, ignoreRetaliation: true });
    consumeP1AttackEffects(ally);
    expect(applyP1AttackModifiers(battle, ally, enemy, false)).toMatchObject({
      attack: 3, ignoreRetaliation: false,
    });
    expect(ally.effects.some((entry) => entry.id.includes(':attack')
      && entry.expiresRound === battle.round + 1)).toBe(true);

    ally.position = { x: 5, y: 4 };
    enemy.position = { x: 6, y: 4 };
    ally.count = 100;
    enemy.count = 1;
    runAttackPipeline(battle, enemy.id, ally.id);
    enemy.count = 1; enemy.topHp = 1;
    runAttackPipeline(battle, enemy.id, ally.id);
    enemy.count = 1; enemy.topHp = 1;
    runAttackPipeline(battle, enemy.id, ally.id);
    expect(ally.retaliationsMade).toBe(2);
    expect(applyP1AttackModifiers(battle, enemy, ally, false).defense).toBe(3);
    endStackTurn(battle, ally);
    expect(applyP1AttackModifiers(battle, enemy, ally, false).defense).toBe(0);
    battle.round += 1;
    expect(applyP1AttackModifiers(battle, ally, enemy, false).attack).toBe(3);
  });

  it('scales upgraded Hold the Line Bloom through the universal spell-counter hook', () => {
    const battle = fixture();
    battle.attackerHero.spellPower = 12;
    const ally = battle.stacks[0];
    cast(battle, 'holdTheLine', true);
    applyRoutedCombatDamage(battle, ally, 99999);
    expect(ally.counters.bloom).toBe(5);
  });

  it('copies no temporary state in Standard Clockwork Double and all active state in Upgraded', () => {
    const battle = fixture();
    const source = battle.stacks[1];
    source.counters.bloom = 4;
    source.effects.push({
      id: 'borrowed-test', spellId: 'whetstone', duration: 2, magnitude: 3,
      beneficial: true, sourceSide: 'attacker',
    });
    source.temporaryAbilities = ['beckoning_song'];
    source.copiedAbilityIds = ['beckoning_song'];
    source.abilityUses = { beckoning_song: 1 };
    source.morale = 70;
    source.roundSpeedBonus = 4;
    source.stunnedActions = 1;
    source.attacksMade = 2;
    source.damageDealt = 99;
    cast(battle, 'clockworkDouble', false, {
      targetId: source.id, positions: [{ x: 3, y: 3 }],
    });
    const standard = battle.stacks.find((stack) => stack.cloneOf === source.id)!;
    expect(standard).toMatchObject({ counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [] });
    expect(standard.temporaryAbilities).toEqual([]);
    expect(standard.copiedAbilityIds).toEqual([]);
    expect(standard.abilityUses).toEqual({});
    expect(standard).toMatchObject({
      morale: 0, attacksMade: 0, damageDealt: 0, stunnedActions: undefined,
      roundSpeedBonus: undefined,
    });

    const upgradedBattle = fixture();
    const upgradedSource = upgradedBattle.stacks[1];
    upgradedSource.counters.bloom = 4;
    upgradedSource.effects = source.effects.map((entry) => ({ ...entry }));
    upgradedSource.temporaryAbilities = [...source.temporaryAbilities];
    upgradedSource.copiedAbilityIds = [...source.copiedAbilityIds];
    upgradedSource.abilityUses = { ...source.abilityUses };
    cast(upgradedBattle, 'clockworkDouble', true, {
      targetId: upgradedSource.id, positions: [{ x: 3, y: 3 }],
    });
    const upgraded = upgradedBattle.stacks.find((stack) => stack.cloneOf === upgradedSource.id)!;
    expect(upgraded.counters.bloom).toBe(4);
    expect(upgraded.effects).toEqual(upgradedSource.effects);
    expect(upgraded.temporaryAbilities).toEqual(['beckoning_song']);
    expect(upgraded.copiedAbilityIds).toEqual(['beckoning_song']);
    expect(upgraded.abilityUses).toEqual({ beckoning_song: 1 });
  });

  it('rejects malformed placement branches before mutation or mana debit', () => {
    const battle = fixture();
    battle.currentStackId = battle.stacks[0].id;
    battle.attackerHero.knownSpells = ['blink'];
    battle.attackerHero.upgradedSpells = ['blink'];
    battle.attackerHero.mana = 30;
    const forged: BattleCast = {
      type: 'BATTLE_CAST', spellId: 'blink', targetId: battle.stacks[1].id,
      secondaryTargetId: battle.stacks[1].id, actImmediately: false,
      positions: [{ x: 4, y: 4 }, { x: 5, y: 4 }],
    };
    expect(isP1PlacementCastLegal(battle, forged)).toBe(false);
    const before = structuredClone(battle);
    expect(() => applyBattleAction(battle, forged)).toThrow(/Illegal P1 spell/);
    expect(battle).toEqual(before);
  });

  it('executes Reprise and Overclock at immediate, round-end, and pre-order boundaries', () => {
    const castThroughReducer = (spellId: 'reprise' | 'overclock', plus: boolean) => {
      const battle = fixture();
      battle.currentStackId = battle.stacks[0].id;
      battle.order = [battle.stacks[0].id, ...battle.order.filter((id) => id !== battle.stacks[0].id)];
      battle.attackerHero.knownSpells = [spellId];
      battle.attackerHero.upgradedSpells = plus ? [spellId] : [];
      battle.attackerHero.mana = 40;
      return applyBattleAction(battle, {
        type: 'BATTLE_CAST', spellId, targetId: battle.stacks[1].id,
      });
    };
    const finishActionsUntil = (
      initial: BattleState, predicate: (battle: BattleState) => boolean,
    ) => {
      let battle = initial;
      for (let guard = 0; guard < 30 && !predicate(battle); guard += 1) {
        battle = applyBattleAction(battle, { type: 'BATTLE_DEFEND' });
      }
      return battle;
    };

    let reprise = castThroughReducer('reprise', false);
    const repriseCaster = reprise.stacks[0].id;
    const repriseTarget = reprise.stacks[1].id;
    expect(reprise.activeGrantedAction).toMatchObject({
      targetId: repriseTarget, timing: 'immediate', resumeStackId: repriseCaster,
    });
    expect(cloneBattle(reprise).activeGrantedAction).toEqual(reprise.activeGrantedAction);
    expect(JSON.parse(JSON.stringify(reprise)).activeGrantedAction).toEqual(reprise.activeGrantedAction);
    const castRound = reprise.castRound.attacker;
    reprise.castRound.attacker = -1;
    expect(legalSpellCasts(reprise)).toEqual([]);
    reprise.castRound.attacker = castRound;
    reprise = applyBattleAction(reprise, { type: 'BATTLE_DEFEND' });
    expect(reprise.currentStackId).toBe(repriseCaster);
    reprise = finishActionsUntil(reprise, (battle) =>
      battle.activeGrantedAction?.timing === 'pre-order');
    expect(reprise).toMatchObject({ round: 2, currentStackId: repriseTarget, roundOrderPending: true });
    reprise = applyBattleAction(reprise, { type: 'BATTLE_DEFEND' });
    expect(reprise.activeGrantedAction).toBeNull();
    expect(reprise.roundOrderPending).toBe(false);

    let upgradedReprise = castThroughReducer('reprise', true);
    expect(upgradedReprise.activeGrantedAction?.timing).toBe('immediate');
    upgradedReprise = applyBattleAction(upgradedReprise, { type: 'BATTLE_DEFEND' });
    expect(upgradedReprise.activeGrantedAction?.timing).toBe('immediate');
    expect(upgradedReprise.currentStackId).toBe(upgradedReprise.stacks[1].id);
    upgradedReprise = applyBattleAction(upgradedReprise, { type: 'BATTLE_DEFEND' });
    expect(upgradedReprise.currentStackId).toBe(upgradedReprise.stacks[0].id);

    let overclock = castThroughReducer('overclock', false);
    expect(overclock.activeGrantedAction?.timing).toBe('immediate');
    overclock = applyBattleAction(overclock, { type: 'BATTLE_DEFEND' });
    overclock = finishActionsUntil(overclock, (battle) =>
      battle.activeGrantedAction?.timing === 'round-end');
    expect(overclock).toMatchObject({ round: 1, currentStackId: overclock.stacks[1].id });
    overclock = applyBattleAction(overclock, { type: 'BATTLE_DEFEND' });
    expect(overclock.round).toBe(2);
    expect(overclock.order).not.toContain(overclock.stacks[1].id);

    let upgradedOverclock = castThroughReducer('overclock', true);
    upgradedOverclock = applyBattleAction(upgradedOverclock, { type: 'BATTLE_DEFEND' });
    upgradedOverclock = finishActionsUntil(upgradedOverclock, (battle) =>
      battle.activeGrantedAction?.timing === 'round-end');
    upgradedOverclock = applyBattleAction(upgradedOverclock, { type: 'BATTLE_DEFEND' });
    expect(upgradedOverclock.round).toBe(2);
    expect(upgradedOverclock.order).toContain(upgradedOverclock.stacks[1].id);
  });

  it('rejects a spell-granted action above the per-round cap before debit', () => {
    const battle = fixture();
    battle.currentStackId = battle.stacks[0].id;
    battle.attackerHero.knownSpells = ['reprise'];
    battle.attackerHero.upgradedSpells = ['reprise'];
    battle.attackerHero.mana = 40;
    battle.stacks[1].grantedActionsThisRound = 1;
    const before = structuredClone(battle);
    expect(() => applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'reprise', targetId: battle.stacks[1].id,
    })).toThrow(/granted-action cap/);
    expect(battle).toEqual(before);
  });

  it('teleports first and then interrupts with the explicit Upgraded Blink action branch', () => {
    const battle = fixture();
    battle.currentStackId = battle.stacks[0].id;
    battle.attackerHero.knownSpells = ['blink'];
    battle.attackerHero.upgradedSpells = ['blink'];
    battle.attackerHero.mana = 30;
    const target = battle.stacks[1];
    const destination = Array.from({ length: 9 }, (_, y) =>
      Array.from({ length: 13 }, (_, x) => ({ x, y }))).flat().find((position) =>
      isP1PlacementCastLegal(battle, {
        type: 'BATTLE_CAST', spellId: 'blink', targetId: target.id,
        actImmediately: true, positions: [position],
      }))!;
    const casterId = battle.currentStackId;
    let resolved = applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'blink', targetId: target.id,
      actImmediately: true, positions: [destination],
    });
    expect(resolved.stacks.find((stack) => stack.id === target.id)!.position).toEqual(destination);
    expect(resolved.activeGrantedAction).toMatchObject({
      sourceSpellId: 'blink', timing: 'immediate', resumeStackId: casterId,
    });
    resolved = applyBattleAction(resolved, { type: 'BATTLE_DEFEND' });
    expect(resolved.currentStackId).toBe(casterId);
  });

  it('stores visible combat modifiers and owner-only versus symmetric resonance distinctly', () => {
    const battle = fixture();
    const ally = battle.stacks[0];
    cast(battle, 'steadyHands', false, { targetId: ally.id });
    cast(battle, 'rivet', true, { targetId: ally.id });
    cast(battle, 'whetstone', true, { targetId: ally.id });
    expect(ally.effects.map((effect) => effect.spellId)).toEqual(
      expect.arrayContaining(['steadyHands', 'rivet', 'whetstone']),
    );

    cast(battle, 'consecratedGround', true);
    expect(battle.midBattleResonance?.attacker).toContain('rite');
    expect(battle.midBattleResonance?.defender).not.toContain('rite');

    const symmetric = fixture();
    cast(symmetric, 'consecratedGround', false);
    expect(symmetric.resonance).toBe('rite');
  });
});

describe('docs-61 P1 Rite and Craft adventure spells', () => {
  function emptyDestination(state: ReturnType<typeof createGame>, origin: Coord): Coord {
    for (let radius = 1; radius <= 5; radius += 1) {
      for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
        for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
          const position = { x, y };
          const terrain = state.map.terrain[y]?.[x] && terrainIdAt(state.map, position);
          if (terrain && terrain !== 'water' && terrain !== 'mountain'
              && !state.map.objects.some((object) => objectFootprintTiles(object)
                .some((tile) => tile.x === x && tile.y === y))
              && !state.castles.some((castle) => castleFootprintTiles(castle)
                .some((tile) => tile.x === x && tile.y === y))) {
            return position;
          }
        }
      }
    }
    throw new Error('fixture lacks an empty destination');
  }

  it('routes Wellspring remotely and gives Upgraded Dimension Door exactly two daily uses', () => {
    const state = createGame({ seed: 98602, p1: 'human', p2: 'human' });
    const caster = state.players.p1.hero!;
    const target = state.players.p1.tavernPool[0];
    target.alive = true;
    target.mana = 0;
    state.players.p1.heroes.push(target);
    caster.knownSpells = ['wellspring', 'dimensionDoor'];
    caster.upgradedSpells = ['wellspring', 'dimensionDoor'];
    caster.spellPower = 4;
    caster.mana = 100;
    caster.movement = 10_000;
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'wellspring', targetHeroId: target.id,
    });
    expect(target.mana).toBeGreaterThan(0);
    expect(target.movement).toBe(150);

    let destination = emptyDestination(state, caster.position);
    state.players.p1.explored.push(`${destination.x},${destination.y}`);
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'dimensionDoor', target: destination });
    destination = emptyDestination(state, caster.position);
    state.players.p1.explored.push(`${destination.x},${destination.y}`);
    expect(canCastAdventureSpell(state, 'dimensionDoor')).toBe(true);
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'dimensionDoor', target: destination });
    expect(canCastAdventureSpell(state, 'dimensionDoor')).toBe(false);
    expect(caster.spellUses.dailyCounts?.dimensionDoor).toEqual({ day: state.day, count: 2 });
  });

  it('makes Census a same-day information effect instead of an inert record', () => {
    const state = createGame({ seed: 98603, p1: 'human', p2: 'human' });
    const caster = state.players.p1.hero!;
    caster.knownSpells = ['census'];
    caster.upgradedSpells = ['census'];
    caster.mana = 20;
    caster.movement = 1_000;
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'census' });
    expect(state.players.p1.adventureEffects).toMatchObject({
      censusUntilDay: state.day, censusShowsMovement: true,
    });
  });
});
