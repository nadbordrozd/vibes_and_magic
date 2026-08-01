import { describe, expect, it } from 'vitest';
import { makeArmy } from '../army';
import { unstitchHero } from '../artifacts';
import {
  applyBattleAction, createBattle, legalBattleActions,
} from '../combat/battle';
import { runAttackPipeline, runTurnAdvancePipeline } from '../combat/pipeline';
import { createGame } from '../game';

function heroes(seed = 901) {
  const game = createGame({ seed, p1: 'human', p2: 'human' });
  return { game, attacker: game.players.p1.hero!, defender: game.players.p2.hero! };
}

describe('artifact catalog behaviors', () => {
  it('makes Standing Mirror an attackable 30-HP battlefield company', () => {
    const { attacker, defender } = heroes();
    attacker.knownSpells = ['standingMirror'];
    attacker.mana = 20;
    let [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
      attacker, defender,
      { kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' },
      901,
    );
    battle = applyBattleAction(battle, { type: 'BATTLE_CAST', spellId: 'standingMirror' });
    const mirror = battle.stacks.find((stack) => stack.unitId === 'standingMirror');
    expect(mirror).toMatchObject({ count: 1, topHp: 30, summoned: true });
    expect(battle.enchantments.attacker).toHaveLength(0);
  });

  it('lets the Sundered Hourglass cast twice, but not three times, on even rounds', () => {
    const { attacker, defender } = heroes(902);
    attacker.artifacts.equipment.amulet = { id: 'sunderedHourglass' };
    attacker.knownSpells = ['rally']; attacker.mana = 30;
    let [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]), attacker, defender,
      { kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' }, 902,
    );
    battle.round = 2;
    battle = applyBattleAction(battle, { type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0' });
    battle = applyBattleAction(battle, { type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0' });
    expect(battle.doubleCastUsedRound.attacker).toBe(2);
    expect(() => applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0',
    })).toThrow();
  });

  it('returns the first destroyed stack with the Longest Candle at round end', () => {
    const { attacker, defender } = heroes(903);
    defender.artifacts.equipment.misc1 = { id: 'longestCandle' };
    const [battle] = createBattle(
      makeArmy([{ unitId: 'woodenColossus', count: 1 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 4 }]), attacker, defender,
      { kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' }, 903,
    );
    const source = battle.stacks.find((stack) => stack.id === 'attacker-0')!;
    const target = battle.stacks.find((stack) => stack.id === 'defender-0')!;
    source.position = { x: 4, y: 4 }; target.position = { x: 5, y: 4 };
    runAttackPipeline(battle, source.id, target.id);
    expect(target.count).toBe(0);
    expect(battle.longestCandlePending.defender).toBe(target.id);
    runTurnAdvancePipeline(battle);
    expect(target.count).toBe(1);
  });

  it('exposes the Clapper and Horn as once-per-battle tactical controls', () => {
    const { attacker, defender } = heroes(904);
    attacker.artifacts.equipment.weapon = { id: 'bellsClapper' };
    attacker.artifacts.equipment.misc1 = { id: 'hornOfTheBroadWorld' };
    let [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 20 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]), attacker, defender,
      { kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' }, 904,
    );
    expect(legalBattleActions(battle).filter((action) => action.type === 'BATTLE_USE_ARTIFACT'))
      .toHaveLength(2);
    battle.stacks.forEach((stack) => { stack.morale = 70; });
    battle = applyBattleAction(battle, {
      type: 'BATTLE_USE_ARTIFACT', artifactId: 'bellsClapper',
    });
    expect(battle.stacks.every((stack) => stack.morale === 0)).toBe(true);
    battle = applyBattleAction(battle, {
      type: 'BATTLE_USE_ARTIFACT', artifactId: 'hornOfTheBroadWorld',
    });
    expect(battle.stacks.find((stack) => stack.id === 'attacker-0')?.doubleNextAttack).toBe(true);
  });

  it('Unstitches a completed Kit to an explored tile once per week', () => {
    const { game, attacker } = heroes(905);
    attacker.artifacts.equipment.weapon = { id: 'tailorsNeedle' };
    attacker.artifacts.equipment.amulet = { id: 'goldenThread' };
    attacker.artifacts.equipment.ring1 = { id: 'tailorsThimble' };
    attacker.artifacts.equipment.misc1 = { id: 'patternbook' };
    const destination = { x: 4, y: 10 };
    game.players.p1.explored.push('4,10');
    unstitchHero(game, attacker.id, destination);
    expect(attacker.position).toEqual(destination);
    expect(() => unstitchHero(game, attacker.id, { x: 5, y: 10 })).toThrow();
  });
});
