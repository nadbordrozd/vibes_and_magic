import { describe, expect, it } from 'vitest';
import { FACTIONS } from '../../content/factions';
import { HEROES } from '../../content/heroes';
import { UNITS } from '../../content/units';
import {
  apply, createGame,
} from '../game';
import { defeatHero } from '../heroes';
import { createBattle } from '../combat/setup';
import { applyBattleAction } from '../combat/battle';
import { runAttackPipeline } from '../combat/pipeline';
import { applyRoundMorale } from '../combat/round';
import { logisticsRate, foragerRate, specialtyHandler } from '../heroBehaviors';
import { makeArmy } from '../army';
import type {
  GameState, Hero, HeroDefinitionId, PlayerId,
} from '../types';
import { recoverSpareParts, checkVictory } from '../game/outcomes';

function useHero(
  state: GameState,
  playerId: PlayerId,
  definitionId: HeroDefinitionId,
): Hero {
  const player = state.players[playerId];
  const current = player.hero ?? player.heroes[0];
  const template = [...player.heroes, ...player.tavernPool]
    .find((candidate) => candidate.definitionId === definitionId);
  if (!current || !template) throw new Error(`Missing hero fixture: ${definitionId}`);
  return {
    ...template,
    alive: true,
    defeated: false,
    position: { ...current.position },
    army: current.army.map((stack) => stack ? { ...stack } : null),
    knownSpells: [...template.knownSpells],
    upgradedSpells: [...template.upgradedSpells],
    visitedShrines: [...template.visitedShrines],
    shrineChoices: { ...template.shrineChoices },
    skills: { ...template.skills },
    pathMemory: template.pathMemory.map((coord) => ({ ...coord })),
    inventory: [...template.inventory],
  };
}

function damageBy(
  attacker: Hero,
  defender: Hero,
  attackerArmy = makeArmy([{ unitId: 'longbowman', count: 10 }]),
  defenderArmy = makeArmy([{ unitId: 'tinSoldier', count: 20 }]),
): number {
  const [battle] = createBattle(
    attackerArmy, defenderArmy, attacker, defender,
    {
      kind: 'hero', targetId: defender.id, destination: defender.position,
      attackerHeroId: attacker.id, defenderHeroId: defender.id,
      defenderPlayerId: defender.owner,
    },
    1,
  );
  const actor = battle.stacks.find((stack) => stack.side === 'attacker')!;
  const target = battle.stacks.find((stack) => stack.side === 'defender')!;
  actor.position = { x: 1, y: 1 };
  target.position = { x: 2, y: 1 };
  const hp = UNITS[target.unitId].hp;
  const before = (target.count - 1) * hp + target.topHp;
  runAttackPipeline(battle, actor.id, target.id);
  return before - ((target.count - 1) * hp + target.topHp);
}

describe('named hero specialties', () => {
  it('Aldith removes the adjacent-enemy Longbowman penalty', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'human' });
    const aldith = useHero(game, 'p1', 'aldith');
    const defender = useHero(game, 'p2', 'silas');
    const aldithDamage = damageBy(aldith, defender);
    const ordinary = useHero(game, 'p1', 'berta');
    expect([aldithDamage, damageBy(ordinary, defender)]).toEqual([35, 17]);
  });

  it('Corwin resolves Rally as the plus face', () => {
    const game = createGame({ seed: 2, p1: 'human', p2: 'human' });
    const corwin = useHero(game, 'p1', 'corwin');
    const defender = useHero(game, 'p2', 'petra');
    corwin.mana = 20;
    const [battle] = createBattle(
      makeArmy([
        { unitId: 'yeoman', count: 10 },
        { unitId: 'longbowman', count: 2 },
      ]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
      corwin, defender,
      {
        kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: corwin.id, defenderHeroId: defender.id,
        defenderPlayerId: defender.owner,
      },
      2,
    );
    const allies = battle.stacks.filter((stack) => stack.side === 'attacker');
    const next = applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'rally',
      targetId: allies[0].id, secondaryTargetId: allies[1].id,
    });
    expect(next.stacks.filter((stack) => stack.side === 'attacker')
      .map((stack) => stack.morale)).toEqual([55, 55]);
  });

  it('Berta uses 15% and 30% Logistics rates', () => {
    const game = createGame({ seed: 3, p1: 'human', p2: 'human' });
    const berta = useHero(game, 'p1', 'berta');
    expect(logisticsRate(berta)).toBe(0.15);
    berta.skills.logistics = 2;
    expect(logisticsRate(berta)).toBe(0.3);
  });

  it('Osric raises each adjacent banner aura from 10 to 15 meter', () => {
    const game = createGame({ seed: 4, p1: 'human', p2: 'human' });
    const osric = useHero(game, 'p1', 'osric');
    const defender = useHero(game, 'p2', 'grigor');
    const [battle] = createBattle(
      makeArmy([
        { unitId: 'bannerman', count: 2 },
        { unitId: 'yeoman', count: 5 },
      ]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
      osric, defender,
      {
        kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: osric.id, defenderHeroId: defender.id,
        defenderPlayerId: defender.owner,
      },
      4,
    );
    const allies = battle.stacks.filter((stack) => stack.side === 'attacker');
    allies[0].position = { x: 1, y: 1 };
    allies[1].position = { x: 2, y: 1 };
    allies.forEach((stack) => { stack.morale = 0; });
    applyRoundMorale(battle);
    expect(allies[1].morale).toBe(20);
  });

  it('Petra grants Tin Soldiers one attack and one defense', () => {
    const game = createGame({ seed: 5, p1: 'human', p2: 'human' });
    const target = useHero(game, 'p1', 'aldith');
    const petra = useHero(game, 'p2', 'petra');
    const silas = useHero(game, 'p2', 'silas');
    const tinArmy = makeArmy([{ unitId: 'tinSoldier', count: 20 }]);
    const yeomen = makeArmy([{ unitId: 'yeoman', count: 20 }]);
    expect([
      damageBy(petra, target, tinArmy, yeomen),
      damageBy(silas, target, tinArmy, yeomen),
    ]).toEqual([40, 39]);
    expect([
      damageBy(target, petra, yeomen, tinArmy),
      damageBy(target, silas, yeomen, tinArmy),
    ]).toEqual([29, 30]);
  });

  it('Silas resolves Wither as the plus face', () => {
    const game = createGame({ seed: 6, p1: 'human', p2: 'human' });
    const attacker = useHero(game, 'p1', 'aldith');
    const silas = useHero(game, 'p2', 'silas');
    silas.mana = 20;
    const [battle] = createBattle(
      silas.army, attacker.army, silas, attacker,
      {
        kind: 'hero', targetId: attacker.id, destination: attacker.position,
        attackerHeroId: silas.id, defenderHeroId: attacker.id,
        defenderPlayerId: attacker.owner,
      },
      6,
    );
    const target = battle.stacks.find((stack) => stack.side === 'defender')!;
    const next = applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'wither', targetId: target.id,
    });
    const affected = next.stacks.find((stack) => stack.id === target.id)!;
    expect(affected.counters).toMatchObject({ hex: 8, chill: 2 });
  });

  it('Grigor uses 75% and 100% Forager rates', () => {
    const game = createGame({ seed: 7, p1: 'human', p2: 'human' });
    const grigor = useHero(game, 'p2', 'grigor');
    expect(foragerRate(grigor)).toBe(0.75);
    grigor.skills.forager = 2;
    expect(foragerRate(grigor)).toBe(1);
  });

  it('Mirele recovers ten percentage points more losses', () => {
    const game = createGame({ seed: 8, p1: 'human', p2: 'human' });
    const mirele = useHero(game, 'p2', 'mirele');
    const enemy = useHero(game, 'p1', 'aldith');
    const [base] = createBattle(
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]), enemy.army,
      mirele, enemy,
      {
        kind: 'hero', targetId: enemy.id, destination: enemy.position,
        attackerHeroId: mirele.id, defenderHeroId: enemy.id,
        defenderPlayerId: enemy.owner,
      },
      8,
    );
    base.stacks.find((stack) => stack.side === 'attacker')!.count = 5;
    const improved = structuredClone(base);
    expect(recoverSpareParts(base, 'attacker', 0.3).tinSoldier).toBe(1);
    const bonus = specialtyHandler(mirele).recoveryBonus?.() ?? 0;
    expect(recoverSpareParts(improved, 'attacker', 0.3 + bonus).tinSoldier).toBe(2);
  });
});

describe('tavern, defeat pool, and loss conditions', () => {
  it('hires, refreshes weekly, and re-hires with progression intact', () => {
    let game = createGame({ seed: 20, p1: 'human', p2: 'human' });
    const firstOffers = [...game.players.p1.tavernOffers];
    for (let turn = 0; turn < 14; turn += 1) game = apply(game, { type: 'END_TURN' });
    expect(game.players.p1.tavernOffers).not.toEqual(firstOffers);
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'tavern',
    });
    const offer = game.players.p1.tavernOffers[0];
    game = apply(game, { type: 'HIRE_HERO', castleId: 'p1-castle', heroId: offer });
    const hired = game.players.p1.heroes.find((hero) => hero.id === offer)!;
    expect(hired.army[0]).toEqual({ unitId: 'yeoman', count: 8 });
    hired.level = 4;
    hired.skills.scouting = 2;
    hired.knownSpells.push('ward');
    hired.upgradedSpells.push('ward');
    hired.mana = 0;
    defeatHero(game, hired.id);
    game.players.p1.resources.gold = 3000;
    game = apply(game, { type: 'HIRE_HERO', castleId: 'p1-castle', heroId: hired.id });
    const returned = game.players.p1.heroes.find((hero) => hero.id === hired.id)!;
    expect(returned).toMatchObject({ level: 4, skills: { scouting: 2 } });
    expect(returned.knownSpells).toContain('ward');
    expect(returned.upgradedSpells).toContain('ward');
    expect(returned.mana).toBe(returned.knowledge * 10);
    expect(returned.army.every((stack) => stack === null)).toBe(true);
    expect(game.players.p1.tavernOfferWeek).toBe(2);
  });

  it('limits each player to three heroes', () => {
    let game = createGame({ seed: 21, p1: 'human', p2: 'human' });
    game.players.p1.resources.gold = 10000;
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'tavern',
    });
    for (const heroId of [...game.players.p1.tavernOffers]) {
      game = apply(game, { type: 'HIRE_HERO', castleId: 'p1-castle', heroId });
    }
    expect(game.players.p1.heroes).toHaveLength(3);
  });

  it('loses immediately with no heroes and castles, or after seven castle-less days', () => {
    const immediate = createGame({ seed: 22, p1: 'human', p2: 'human' });
    immediate.players.p1.heroes = [];
    immediate.players.p1.hero = null;
    immediate.castles.forEach((castle) => { castle.owner = 'p2'; });
    checkVictory(immediate);
    expect(immediate.winner).toBe('p2');

    let countdown = createGame({ seed: 23, p1: 'human', p2: 'human' });
    countdown.castles.forEach((castle) => { castle.owner = 'p2'; });
    for (let day = 0; day < 6; day += 1) {
      countdown = apply(countdown, { type: 'END_TURN' });
      countdown = apply(countdown, { type: 'END_TURN' });
    }
    expect(countdown.players.p1.castlelessDays).toBe(6);
    expect(countdown.winner).toBeNull();
    countdown = apply(countdown, { type: 'END_TURN' });
    countdown = apply(countdown, { type: 'END_TURN' });
    expect(countdown.winner).toBe('p2');
  });

  it('defines all eight heroes in four-per-faction rosters', () => {
    expect(Object.values(HEROES).filter((hero) => hero.faction === 'hearthguard')).toHaveLength(4);
    expect(Object.values(HEROES).filter((hero) => hero.faction === 'woundWrights')).toHaveLength(4);
    expect(FACTIONS.hearthguard.hireArmy).toEqual([{ unitId: 'yeoman', count: 8 }]);
  });
});
