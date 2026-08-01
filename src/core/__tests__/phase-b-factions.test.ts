import { describe, expect, it } from 'vitest';
import { FACTIONS } from '../../content/factions';
import { FACTION_UNITS, UNITS, validateUnits } from '../../content/units';
import { makeArmy } from '../army';
import { createBattle, applyBattleAction, legalBattleActions } from '../combat/battle';
import { applyActivatedAbility } from '../combat/activatedAbilities';
import {
  destructionProportionality, runAttackPipeline, runTurnAdvancePipeline,
} from '../combat/pipeline';
import { spellManaCost } from '../combat/spellModifiers';
import { createGame } from '../game';
import { recoverSpareParts } from '../game/outcomes';
import type { BattleState, UnitId } from '../types';

function battle(
  attacker: Array<{ unitId: UnitId; count: number }>,
  defender: Array<{ unitId: UnitId; count: number }>,
): BattleState {
  const game = createGame({ seed: 91, p1: 'human', p2: 'ai' });
  return createBattle(
    makeArmy(attacker), makeArmy(defender),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'target', destination: { x: 4, y: 4 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    },
    91,
  )[0];
}

function engage(state: BattleState, attackerIndex = 0, defenderIndex = 0) {
  const attacker = state.stacks.filter((stack) => stack.side === 'attacker')[attackerIndex];
  const defender = state.stacks.filter((stack) => stack.side === 'defender')[defenderIndex];
  defender.position = { x: 1, y: attacker.position.y };
  return { attacker, defender };
}

describe('Phase B six-faction content', () => {
  it('loads six factions with six tiers and registered unit data', () => {
    expect(Object.keys(FACTIONS)).toHaveLength(6);
    for (const ids of Object.values(FACTION_UNITS)) expect(ids).toHaveLength(6);
    expect(Object.values(UNITS).filter((unit) =>
      Object.hasOwn(FACTIONS, unit.faction))).toHaveLength(36);
    expect(() => validateUnits()).not.toThrow();
  });

  it('starts a normal game with any selected faction pair', () => {
    for (const faction of Object.keys(FACTIONS) as Array<keyof typeof FACTIONS>) {
      const game = createGame({
        seed: 12, p1: 'human', p2: 'ai',
        p1Faction: faction, p2Faction: 'hearthguard',
      });
      expect(game.players.p1.faction).toBe(faction);
      expect(game.players.p1.hero?.faction).toBe(faction);
      expect(game.players.p1.hero?.army[0]?.unitId).toBe(FACTION_UNITS[faction][0]);
      expect(game.castles[0].faction).toBe(faction);
    }
  });

  it('fires Unfinished damage and last-light death triggers', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 10 }],
      [{ unitId: 'candleWisps', count: 1 }],
    );
    const { attacker, defender } = engage(state);
    const before = attacker.topHp;
    runAttackPipeline(state, attacker.id, defender.id);
    expect(defender.count).toBe(0);
    expect(attacker.topHp).toBe(before - 1);
    expect(attacker.counters.hex).toBe(2);
  });

  it('returns the Brides once at half their pre-battle size', () => {
    const state = battle(
      [{ unitId: 'woodenColossus', count: 100 }],
      [{ unitId: 'brides', count: 6 }],
    );
    const { attacker, defender } = engage(state);
    runAttackPipeline(state, attacker.id, defender.id);
    expect(defender.count).toBe(3);
    expect(defender.abilityUses?.unfinished_vow).toBe(1);
  });

  it('pauses for the Courier owner to choose an immediate free move', () => {
    let state = battle(
      [{ unitId: 'woodenColossus', count: 10 }],
      [{ unitId: 'couriers', count: 1 }, { unitId: 'sentries', count: 2 }],
    );
    const attacker = state.stacks[0];
    const courier = state.stacks.find((stack) => stack.unitId === 'couriers')!;
    courier.position = { x: 1, y: attacker.position.y };
    runAttackPipeline(state, attacker.id, courier.id);
    expect(state.pendingFreeMove?.side).toBe('defender');
    const choice = legalBattleActions(state).find(
      (action) => action.type === 'BATTLE_FREE_MOVE',
    )!;
    state = applyBattleAction(state, choice);
    expect(state.pendingFreeMove).toBeNull();
  });

  it('allows Sentries to retaliate without a per-round limit', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 5 }, { unitId: 'tinSoldier', count: 5 }],
      [{ unitId: 'sentries', count: 20 }],
    );
    const sentry = state.stacks.find((stack) => stack.unitId === 'sentries')!;
    const attackers = state.stacks.filter((stack) => stack.side === 'attacker');
    for (const actor of attackers) {
      sentry.position = { x: 1, y: actor.position.y };
      runAttackPipeline(state, actor.id, sentry.id);
    }
    expect(sentry.retaliated).toBe(false);
    expect(attackers.every((stack) => stack.count < 5)).toBe(true);
  });

  it('adds Web Chill and Thunderbird splash Burn through the pipeline', () => {
    const web = battle(
      [{ unitId: 'silkSpinners', count: 5 }],
      [{ unitId: 'yeoman', count: 10 }],
    );
    runAttackPipeline(web, 'attacker-0', 'defender-0');
    expect(web.stacks[1].counters.chill).toBe(2);

    const storm = battle(
      [{ unitId: 'thunderbird', count: 2 }],
      [{ unitId: 'yeoman', count: 10 }, { unitId: 'longbowman', count: 10 }],
    );
    const { attacker, defender } = engage(storm);
    const splash = storm.stacks.find((stack) => stack.unitId === 'longbowman')!;
    splash.position = { x: defender.position.x, y: defender.position.y - 1 };
    runAttackPipeline(storm, attacker.id, defender.id);
    expect(splash.counters.burn).toBe(2);
  });

  it('uses proportionally guarded Wildergrass blood price instead of morale loss', () => {
    const state = battle(
      [{ unitId: 'woodenColossus', count: 4 }],
      [{ unitId: 'outriders', count: 1 }, { unitId: 'drumCallers', count: 5 }],
    );
    state.defenderHero!.faction = 'wildergrass';
    const attacker = state.stacks[0];
    const victim = state.stacks.find((stack) => stack.unitId === 'outriders')!;
    const survivor = state.stacks.find((stack) => stack.unitId === 'drumCallers')!;
    victim.position = { x: 1, y: attacker.position.y };
    const scale = destructionProportionality(state, victim);
    runAttackPipeline(state, attacker.id, victim.id);
    expect(survivor.morale).toBeCloseTo(20 * scale);
  });

  it('repairs adjacent stacks and calls the Vespiary brood', () => {
    const repair = battle(
      [{ unitId: 'reliquaryArk', count: 1 }, { unitId: 'yeoman', count: 10 }],
      [{ unitId: 'sentries', count: 1 }],
    );
    const ark = repair.stacks[0];
    const ally = repair.stacks[1];
    ally.position = { x: 1, y: ark.position.y };
    ally.count = 5;
    applyActivatedAbility(repair, ark, {
      type: 'BATTLE_USE_ABILITY', abilityId: 'procession_of_repair',
    });
    expect(ally.count).toBeGreaterThan(5);

    const brood = battle(
      [{ unitId: 'halfWokenQueen', count: 1 }],
      [{ unitId: 'yeoman', count: 5 }],
    );
    brood.casualties.attacker.yeoman = 8;
    applyActivatedAbility(brood, brood.stacks[0], {
      type: 'BATTLE_USE_ABILITY', abilityId: 'brood_call',
    });
    expect(brood.stacks.find((stack) => stack.unitId === 'larvalTide')?.count).toBe(4);
  });

  it('adds the surviving Reliquary Ark recovery bonus', () => {
    const state = battle(
      [{ unitId: 'tinSoldier', count: 10 }, { unitId: 'reliquaryArk', count: 1 }],
      [{ unitId: 'yeoman', count: 1 }],
    );
    state.stacks[0].count = 5;
    expect(recoverSpareParts(state, 'attacker', 0.3).tinSoldier).toBe(2);
  });

  it('leaves resin during movement and lets skirmishers finish their move', () => {
    let resin = battle(
      [{ unitId: 'amberCarriers', count: 2 }],
      [{ unitId: 'sentries', count: 2 }],
    );
    const move = resin.order[0] === 'attacker-0'
      ? { x: 1, y: 4 } : { x: 11, y: 4 };
    if (resin.order[0] !== 'attacker-0') {
      resin.currentStackId = 'attacker-0';
      resin.order = ['attacker-0', 'defender-0'];
    }
    resin = applyBattleAction(resin, { type: 'BATTLE_MOVE', destination: move });
    expect(resin.tiles.some((tile) => tile.type === 'resin')).toBe(true);

    const skirmish = battle(
      [{ unitId: 'outriders', count: 10 }],
      [{ unitId: 'sentries', count: 10 }],
    );
    const { attacker, defender } = engage(skirmish);
    runAttackPipeline(skirmish, attacker.id, defender.id);
    expect(attacker.postAttackMovePoints).toBeGreaterThan(0);
  });

  it('creates Hagwood thickets, moves the Hut, and discounts Grave magic', () => {
    const state = battle(
      [{ unitId: 'leshy', count: 1 }, { unitId: 'walkingHut', count: 1 }],
      [{ unitId: 'yeoman', count: 10 }],
    );
    expect(state.tiles.filter((tile) => tile.type === 'thicket')).toHaveLength(2);
    const hut = state.stacks.find((stack) => stack.unitId === 'walkingHut')!;
    const before = { ...hut.position };
    runTurnAdvancePipeline(state);
    expect(state.pendingFreeMove).toMatchObject({
      targetId: hut.id, anywhere: true,
    });
    const relocation = legalBattleActions(state).find((action) =>
      action.type === 'BATTLE_FREE_MOVE'
      && (action.destination.x !== before.x || action.destination.y !== before.y))!;
    const relocated = applyBattleAction(state, relocation);
    expect(relocated.stacks.find((stack) => stack.id === hut.id)?.position).not.toEqual(before);
    expect(spellManaCost(state, 'attacker', state.attackerHero, 'wither')).toBe(2);
  });
});
