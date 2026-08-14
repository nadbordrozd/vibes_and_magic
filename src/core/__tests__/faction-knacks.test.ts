import { describe, expect, it } from 'vitest';
import { chooseCombatAction, chooseKnackAction } from '../../ai/combat';
import {
  KNACKS, KNACK_ASSET_REQUIREMENTS, ensureKnackHandlersRegistered,
  knackRankForLevel, validateKnacks,
} from '../../content/knacks';
import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import { resolveContentAsset, validateContentAssets } from '../../content/v2/assets';
import { registeredKnackHandlers } from '../../content/v2/registries';
import { makeArmy } from '../army';
import {
  applyBattleAction, battleReachableHexes, createBattle, legalBattleActions,
} from '../combat/battle';
import { legalKnackPlacements } from '../combat/knacks';
import { runTileHooks } from '../combat/tiles';
import { totalStackHp } from '../combat/magicEffects';
import { addTimedEffect } from '../combat/magicEffects';
import type { Action, BattleState, FactionId, Hero } from '../types';
import { createGame } from '../game';
import { cloneBattle } from '../combat/battleClone';
import { castPreBattleSpell } from '../combat/preBattleSpells';

type KnackAction = Extract<Action, { type: 'BATTLE_USE_KNACK' }>;

function fixture(faction: FactionId, level = 1, secondAlly = true): BattleState {
  const game = createGame({ seed: 67009, p1: 'human', p2: 'human',
    p1Faction: faction, p2Faction: 'hearthguard' });
  const attacker = game.players.p1.hero!; const defender = game.players.p2.hero!;
  attacker.level = level;
  const [battle] = createBattle(
    makeArmy([{ unitId: faction === 'woundWrights' ? 'tinSoldier' : 'yeoman', count: 20 },
      ...(secondAlly ? [{ unitId: 'longbowman' as const, count: 10 }] : [])]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 10 }]),
    attacker, defender, { kind: 'hero', targetId: defender.id, destination: { x: 5, y: 5 },
      attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' }, 67009,
  );
  battle.obstacles = [];
  battle.currentStackId = battle.stacks.find((stack) => stack.side === 'attacker')!.id;
  return battle;
}

function useFirst(battle: BattleState, match?: (action: KnackAction) => boolean): BattleState {
  const action = legalBattleActions(battle).find((candidate): candidate is KnackAction =>
    candidate.type === 'BATTLE_USE_KNACK' && (!match || match(candidate)));
  if (!action) throw new Error('Expected a legal Knack action');
  return applyBattleAction(battle, action);
}

describe('doc 67 combat faction Knacks', () => {
  it('ships exactly six derived, registered, three-rank definitions and strict typed assets', () => {
    ensureKnackHandlersRegistered();
    expect(Object.keys(KNACKS)).toHaveLength(6);
    expect(new Set(Object.values(KNACKS).map((entry) => entry.handlerId))).toHaveLength(6);
    expect(registeredKnackHandlers().size).toBe(6);
    expect([knackRankForLevel(1), knackRankForLevel(5), knackRankForLevel(6),
      knackRankForLevel(11), knackRankForLevel(12)]).toEqual([1, 1, 2, 2, 3]);
    expect(() => validateKnacks()).not.toThrow();
    expect(KNACK_ASSET_REQUIREMENTS.map((entry) => entry.canonicalId)).toEqual([
      'knack:hearthguard', 'knack:woundWrights', 'knack:unfinished',
      'knack:vespiary', 'knack:hagwood', 'knack:wildergrass',
    ]);
    expect(new Set(KNACK_ASSET_REQUIREMENTS.map((entry) => entry.visualSubject))).toHaveLength(6);
    expect(validateContentAssets(KNACK_ASSET_REQUIREMENTS, new Set(), 'development')
      .every((asset) => asset.kind === 'placeholder')).toBe(true);
    expect(() => validateContentAssets(KNACK_ASSET_REQUIREMENTS, new Set(), 'release'))
      .toThrow(/Release asset missing/);
    expect(resolveContentAsset(KNACK_ASSET_REQUIREMENTS[0], new Set(), 'development'))
      .toMatchObject({ placeholderId: 'content-placeholder:knack:hearthguard' });
  });

  it('always gives a zero-mana level-1 hero a bounded legal hero action each round', () => {
    for (const faction of Object.keys(KNACKS) as FactionId[]) {
      let battle = fixture(faction, 1);
      battle.attackerHero.mana = 0; battle.attackerHero.knownSpells = [];
      const actions = legalBattleActions(battle).filter((action) => action.type === 'BATTLE_USE_KNACK');
      expect(actions.length, faction).toBeGreaterThan(0);
      const action = faction === 'vespiary'
        ? { ...actions[0], positions: [legalKnackPlacements(battle)[0]] } as KnackAction : actions[0];
      battle = applyBattleAction(battle, action);
      expect(battle.knackUseRound.attacker).toBe(1);
      expect(legalBattleActions(battle).some((candidate) => candidate.type === 'BATTLE_USE_KNACK'))
        .toBe(false);
      battle.round = 2;
      expect(legalBattleActions(battle).some((candidate) => candidate.type === 'BATTLE_USE_KNACK'))
        .toBe(true);
    }
  });

  it('resolves Hearten ranks including the rank-3 second company', () => {
    let rank1 = fixture('hearthguard', 1);
    const first = rank1.stacks[0]; const moraleBefore = first.morale;
    rank1 = useFirst(rank1, (action) => action.targetId === first.id);
    expect(rank1.stacks[0].morale - moraleBefore).toBe(20);
    let rank3 = fixture('hearthguard', 12);
    const allies = rank3.stacks.filter((stack) => stack.side === 'attacker');
    const beforeFirst = allies[0].morale; const beforeSecond = allies[1].morale;
    rank3 = useFirst(rank3, (action) => action.targetId === allies[0].id
      && action.secondaryTargetId === allies[1].id);
    expect(rank3.stacks.find((stack) => stack.id === allies[0].id)!.morale - beforeFirst).toBe(40);
    expect(rank3.stacks.find((stack) => stack.id === allies[1].id)!.morale - beforeSecond).toBe(20);
  });

  it('Patch heals maximum-HP percentages without resurrection and doubles constructs at rank 3', () => {
    let rank1 = fixture('woundWrights', 1);
    const target = rank1.stacks[0]; target.topHp = 1;
    rank1 = useFirst(rank1, (action) => action.targetId === target.id);
    expect(rank1.stacks[0].topHp).toBe(Math.min(UNITS.tinSoldier.hp,
      1 + Math.ceil(20 * UNITS.tinSoldier.hp * 0.05)));
    let rank3 = fixture('woundWrights', 12); rank3.stacks[0].topHp = 1;
    rank3 = useFirst(rank3, (action) => action.targetId === rank3.stacks[0].id);
    expect(rank3.stacks[0].topHp).toBe(Math.min(UNITS.tinSoldier.hp,
      1 + Math.ceil(20 * UNITS.tinSoldier.hp * 0.12) * 2));
    rank3.stacks[0].count = 0; rank3.stacks[0].topHp = 0; rank3.round = 2;
    expect(legalBattleActions(rank3).some((action) => action.type === 'BATTLE_USE_KNACK'
      && action.targetId === rank3.stacks[0].id)).toBe(false);
  });

  it('The Errand Remembered restores bounded HP and rank 3 reaches only same-round fallen companies', () => {
    let living = fixture('unfinished', 6);
    const target = living.stacks[0]; target.count = 10; target.topHp = 1;
    const before = totalStackHp(target);
    living = useFirst(living, (action) => action.targetId === target.id);
    expect(totalStackHp(living.stacks[0]) - before).toBe(10 + 5 * 6);

    let fallen = fixture('unfinished', 12);
    const dead = fallen.stacks[0]; dead.count = 0; dead.topHp = 0; dead.destroyedRound = fallen.round;
    fallen.currentStackId = fallen.stacks.find((stack) => stack.side === 'attacker'
      && stack.id !== dead.id)!.id;
    fallen = useFirst(fallen, (action) => action.targetId === dead.id);
    expect(fallen.stacks[0].count).toBeGreaterThanOrEqual(1);
    const stale = fixture('unfinished', 12); stale.stacks[0].count = 0;
    stale.stacks[0].topHp = 0; stale.stacks[0].destroyedRound = stale.round - 1;
    stale.currentStackId = stale.stacks.find((stack) => stack.side === 'attacker'
      && stack.id !== stale.stacks[0].id)!.id;
    expect(legalBattleActions(stale).some((action) => action.type === 'BATTLE_USE_KNACK'
      && action.targetId === stale.stacks[0].id)).toBe(false);
    const blocked = fixture('unfinished', 12); blocked.stacks[0].count = 0;
    blocked.stacks[0].topHp = 0; blocked.stacks[0].destroyedRound = blocked.round;
    blocked.currentStackId = blocked.stacks.find((stack) => stack.side === 'attacker'
      && stack.id !== blocked.stacks[0].id)!.id;
    blocked.obstacles.push({ ...blocked.stacks[0].position });
    expect(legalBattleActions(blocked).some((action) => action.type === 'BATTLE_USE_KNACK'
      && action.targetId === blocked.stacks[0].id)).toBe(false);
  });

  it('Lay Resin enforces adjacency at rank 1, persists, taxes entry by two, chills on turn end, and places two at rank 3', () => {
    let rank1 = fixture('vespiary', 1);
    const enemy = rank1.stacks.find((stack) => stack.side === 'defender')!;
    const adjacent = { x: enemy.position.x - 1, y: enemy.position.y };
    rank1 = applyBattleAction(rank1, { type: 'BATTLE_USE_KNACK', positions: [adjacent] });
    const tile = rank1.tiles[0]; expect(tile).toMatchObject({ type: 'resin', duration: -1, upgraded: true });
    enemy.position = { ...tile.position }; runTileHooks(rank1, 'on-turn-start', enemy);
    expect(enemy.counters.chill).toBe(0);
    runTileHooks(rank1, 'on-turn-end', enemy); expect(enemy.counters.chill).toBe(1);

    for (const sourceSide of ['attacker', 'defender'] as const) {
      const path = fixture('vespiary', 6); const mover = path.stacks[0];
      path.tiles.push({ id: `knack-resin-${sourceSide}`, type: 'resin',
        position: { x: 1, y: mover.position.y }, duration: -1, sourceSide,
        upgraded: true, createdRound: 1 });
      expect(battleReachableHexes(path, mover).some((coord) => coord.x === 1
        && coord.y === mover.position.y)).toBe(UNITS[mover.unitId].speed >= 3);
      mover.position = { x: 1, y: mover.position.y };
      runTileHooks(path, 'on-turn-end', mover); expect(mover.counters.chill).toBe(1);
    }

    let rank3 = fixture('vespiary', 12);
    const places = [{ x: 5, y: 0 }, { x: 6, y: 0 }];
    rank3 = applyBattleAction(rank3, { type: 'BATTLE_USE_KNACK', positions: places });
    expect(rank3.tiles.filter((entry) => entry.type === 'resin')).toHaveLength(2);
    expect(() => applyBattleAction(fixture('vespiary', 12), {
      type: 'BATTLE_USE_KNACK', positions: [places[0], places[0]],
    })).toThrow(/Illegal/);

    const saturated = fixture('vespiary', 1);
    const formerlyLegal = legalKnackPlacements(saturated);
    expect(formerlyLegal.length).toBeGreaterThan(0);
    saturated.obstacles.push(...formerlyLegal);
    expect(legalKnackPlacements(saturated)).toEqual([]);
    expect(legalBattleActions(saturated).some((action) =>
      action.type === 'BATTLE_USE_KNACK')).toBe(false);
    expect(() => applyBattleAction(saturated, {
      type: 'BATTLE_USE_KNACK', positions: [formerlyLegal[0]],
    })).toThrow(/Illegal/);
  });

  it('Ill-Wish is a raw non-spell counter application with Tallykeeper but no Spell Power scaling', () => {
    let battle = fixture('hagwood', 12); battle.attackerHero.spellPower = 99;
    battle.attackerHero.skills.tallykeeper = 1;
    const enemy = battle.stacks.find((stack) => stack.side === 'defender')!; enemy.morale = 20;
    battle = useFirst(battle, (action) => action.targetId === enemy.id);
    const changed = battle.stacks.find((stack) => stack.id === enemy.id)!;
    expect(changed.counters.hex).toBe(4); expect(changed.morale).toBe(10);
    expect(battle.spellCasts).toBe(0); expect(battle.lastSpellCast).toBeNull();
  });

  it('Blood Drum pays current HP, bypasses Ward/link, buffs others, and keeps its rank-3 Attack round-scoped', () => {
    let battle = fixture('wildergrass', 12);
    const [payer, other] = battle.stacks.filter((stack) => stack.side === 'attacker');
    const linked = battle.stacks.find((stack) => stack.side === 'defender')!;
    payer.damageLink = { targetId: linked.id, share: 0.5, expiresRound: 3 };
    linked.damageLink = { targetId: payer.id, share: 0.5, expiresRound: 3 };
    addTimedEffect(payer, 'ward', 2, 1, true, 'attacker');
    const before = totalStackHp(payer); const linkedBefore = totalStackHp(linked);
    battle = useFirst(battle, (action) => action.targetId === payer.id);
    const paid = battle.stacks.find((stack) => stack.id === payer.id)!;
    expect(before - totalStackHp(paid)).toBe(Math.ceil(before * 0.03));
    expect(totalStackHp(battle.stacks.find((stack) => stack.id === linked.id)!)).toBe(linkedBefore);
    expect(paid.effects.some((effect) => effect.spellId === 'ward')).toBe(true);
    expect(battle.stacks.find((stack) => stack.id === other.id)).toMatchObject({ morale: 20, roundSpeedBonus: 1 });
    expect(paid.knackAttackBonus).toBe(2);

    let last = fixture('wildergrass', 1, false); last.stacks[0].count = 1;
    last.stacks[0].topHp = 1;
    last = useFirst(last, (action) => action.targetId === last.stacks[0].id);
    expect(last.stacks[0].count).toBe(0);
    expect(last.winner).toBe('defender');
  });

  it('shares the hero act with spells/items while consuming named waiver credits first', () => {
    let evoker = fixture('hearthguard', 12); evoker.attackerHero.skills.evoker = 3;
    evoker.attackerHero.knownSpells = ['forgeSpark']; evoker.attackerHero.mana = 99;
    const enemy = evoker.stacks.find((stack) => stack.side === 'defender')!;
    evoker = applyBattleAction(evoker, { type: 'BATTLE_CAST', spellId: 'forgeSpark', targetId: enemy.id });
    expect(evoker.castRound.attacker).not.toBe(evoker.round);
    evoker = useFirst(evoker); expect(evoker.castRound.attacker).toBe(evoker.round);

    let twice = fixture('hearthguard', 12); twice.attackerHero.skills.twicetold = 3;
    twice.attackerHero.knownSpells = ['rally']; twice.attackerHero.mana = 99;
    twice = useFirst(twice); expect(twice.twisterActSaved.attacker).toBe(true);
    expect(legalBattleActions(twice).some((action) => action.type === 'BATTLE_CAST')).toBe(true);

    let item = fixture('hearthguard', 1); item.attackerHero.skills.alchemist = 1;
    item.attackerHero.inventory[0] = { id: 'potionOfVigor' };
    const itemAction = legalBattleActions(item).find((action) => action.type === 'BATTLE_USE_ITEM')!;
    item = applyBattleAction(item, itemAction);
    expect(item.castRound.attacker).not.toBe(item.round);
    expect(legalBattleActions(item).some((action) => action.type === 'BATTLE_USE_KNACK')).toBe(true);

    let ordinary = fixture('hearthguard', 1); ordinary.attackerHero.knownSpells = ['rally'];
    ordinary.attackerHero.mana = Number(SPELLS.rally.mana);
    const ally = ordinary.stacks.find((stack) => stack.side === 'attacker')!;
    ordinary = applyBattleAction(ordinary, { type: 'BATTLE_CAST', spellId: 'rally', targetId: ally.id });
    expect(legalBattleActions(ordinary).some((action) => action.type === 'BATTLE_USE_KNACK')).toBe(false);

    let hourglass = fixture('hearthguard', 1); hourglass.round = 2;
    hourglass.attackerHero.artifacts.equipment.amulet = { id: 'sunderedHourglass' };
    hourglass.attackerHero.knownSpells = ['rally']; hourglass.attackerHero.mana = 99;
    hourglass = applyBattleAction(hourglass, {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: hourglass.stacks[0].id,
    });
    hourglass = useFirst(hourglass);
    expect(hourglass.doubleCastUsedRound.attacker).toBe(2);
    expect(legalBattleActions(hourglass).some((action) =>
      action.type === 'BATTLE_CAST' || action.type === 'BATTLE_USE_KNACK')).toBe(false);

    const sundial = fixture('hearthguard', 1);
    sundial.attackerHero.artifacts.equipment.misc1 = { id: 'pocketSundial' };
    sundial.attackerHero.knownSpells = ['rally']; sundial.attackerHero.mana = 99;
    castPreBattleSpell(sundial, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: sundial.stacks[0].id,
    });
    expect(sundial.castRound.attacker).toBe(1);
    expect(legalBattleActions(sundial).some((action) => action.type === 'BATTLE_USE_KNACK'))
      .toBe(false);
  });

  it('rejects forged ownership, placement, duplicate, and post-spend payloads', () => {
    const enemy = fixture('hearthguard', 1);
    const hostile = enemy.stacks.find((stack) => stack.side === 'defender')!;
    expect(() => applyBattleAction(enemy, { type: 'BATTLE_USE_KNACK', targetId: hostile.id }))
      .toThrow(/Illegal/);
    const resin = fixture('vespiary', 1);
    expect(() => applyBattleAction(resin, { type: 'BATTLE_USE_KNACK', positions: [{ x: 0, y: 0 }] }))
      .toThrow(/Illegal/);
    const used = useFirst(fixture('hagwood', 1));
    const target = used.stacks.find((stack) => stack.side === 'defender')!;
    expect(() => applyBattleAction(used, { type: 'BATTLE_USE_KNACK', targetId: target.id }))
      .toThrow(/Illegal/);
  });

  it('AI uses the six printed stable fallback heuristics', () => {
    for (const faction of Object.keys(KNACKS) as FactionId[]) {
      const battle = fixture(faction, 12);
      battle.attackerHero.knownSpells = []; battle.attackerHero.mana = 0;
      const action = chooseKnackAction(battle);
      expect(action?.type, faction).toBe('BATTLE_USE_KNACK');
      if (faction === 'vespiary') expect((action as KnackAction).positions).toHaveLength(2);
    }
    const itemFirst = fixture('hearthguard', 1);
    itemFirst.attackerHero.knownSpells = []; itemFirst.attackerHero.mana = 0;
    itemFirst.attackerHero.inventory[0] = { id: 'potionOfVigor' };
    expect(chooseKnackAction(itemFirst)?.type).toBe('BATTLE_USE_KNACK');
    expect(chooseCombatAction(itemFirst).type).toBe('BATTLE_USE_ITEM');
  });

  it('JSON-roundtrips and replays one explicit action for every faction identically', () => {
    for (const faction of Object.keys(KNACKS) as FactionId[]) {
      const battle = fixture(faction, 12);
      const chosen = chooseKnackAction(battle) as KnackAction;
      expect(chosen?.type, faction).toBe('BATTLE_USE_KNACK');
      const replayed = JSON.parse(JSON.stringify(chosen)) as KnackAction;
      expect(JSON.stringify(applyBattleAction(cloneBattle(battle), chosen)), faction)
        .toBe(JSON.stringify(applyBattleAction(cloneBattle(battle), replayed)));
    }
  });

  it('uses explicit remote-Warden authority and remains independent of spell-only systems', () => {
    const outOfRange = fixture('hearthguard', 12);
    outOfRange.attackerHero.knackEnabled = false;
    expect(legalBattleActions(outOfRange).some((action) => action.type === 'BATTLE_USE_KNACK'))
      .toBe(false);
    outOfRange.attackerHero.knackEnabled = true;
    expect(legalBattleActions(outOfRange).some((action) => action.type === 'BATTLE_USE_KNACK'))
      .toBe(true);

    let boundary = fixture('hagwood', 12);
    const target = boundary.stacks.find((stack) => stack.side === 'defender')!;
    target.effects.push({ id: 'sanctuary-boundary', spellId: 'sanctuary', duration: 2,
      magnitude: 1, beneficial: true, sourceSide: 'defender' });
    boundary.resonance = 'grave'; boundary.terrainResonances = ['wild'];
    boundary.stacks.push({ ...boundary.stacks.find((stack) => stack.side === 'defender')!,
      id: 'standing-mirror-test', slot: 25, unitId: 'standingMirror', position: { x: 10, y: 8 },
      count: 1, topHp: UNITS.standingMirror.hp, effects: [], counters: {
        burn: 0, chill: 0, hex: 0, bloom: 0,
      } });
    boundary = useFirst(boundary, (action) => action.targetId === target.id);
    expect(boundary.stacks.find((stack) => stack.id === target.id)!.counters.hex).toBe(3);
    expect(boundary.spellCasts).toBe(0);
    expect(boundary.spellsCastAgainst.defender).toEqual([]);
    expect(boundary.lastSpellCast).toBeNull();
    expect(boundary.mirrorArtifactUsed).toEqual({ attacker: false, defender: false });
  });
});
