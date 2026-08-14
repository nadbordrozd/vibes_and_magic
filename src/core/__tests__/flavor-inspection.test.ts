import { describe, expect, it } from 'vitest';
import { ARTIFACTS, validateArtifacts } from '../../content/artifacts';
import { validateBargains } from '../../content/bargains';
import { validateBattleTiles } from '../../content/battleTiles';
import { validateBuildings } from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import { HEROES, validateHeroes } from '../../content/heroes';
import { validateItems } from '../../content/items';
import { validateSkills } from '../../content/skills';
import { validateSpells } from '../../content/spells';
import { UNITS, validateUnits } from '../../content/units';
import { makeArmy } from '../army';
import { createBattle } from '../combat/setup';
import { runAttackPipeline } from '../combat/pipeline';
import { discoverMapObject } from '../discovery';
import { createGame } from '../game';
import { specialtyHandler } from '../heroBehaviors';
import type { Hero, HeroDefinitionId, PlayerId, SpecialtyId } from '../types';
import { inspectTarget } from '../../ui/inspection';

function heroFrom(game: ReturnType<typeof createGame>, owner: PlayerId, id: HeroDefinitionId): Hero {
  const player = game.players[owner];
  const found = [...player.heroes, ...player.tavernPool].find((hero) => hero.definitionId === id);
  if (!found) throw new Error(`Missing ${id}`);
  return { ...found, alive: true, position: { ...player.hero!.position } };
}

describe('flavor catalog and inspection journal', () => {
  it('validates every authored content family and every hero story', () => {
    expect(() => {
      validateUnits(); validateSpells(); validateBuildings(); validateHeroes();
      validateSkills(); validateItems(); validateArtifacts(); validateBargains();
      validateBattleTiles();
    }).not.toThrow();
    expect(Object.values(HEROES).every((hero) => hero.story.trim().split(/\s+/).length >= 35)).toBe(true);
    expect(Object.values(UNITS).every((unit) => unit.flavor.trim())).toBe(true);
    expect(Object.values(ARTIFACTS).every((artifact) => artifact.flavor.trim())).toBe(true);
  });

  it('ships the four named rosters with their specified class stats and weights', () => {
    expect(Object.keys(HEROES)).toHaveLength(36);
    expect(FACTIONS.unfinished).toMatchObject({
      heroStats: { attack: 1, defense: 2, spellPower: 2, knowledge: 1 },
      classWeights: { attack: 15, defense: 25, spellPower: 30, knowledge: 30 },
    });
    expect(FACTIONS.vespiary).toMatchObject({
      heroStats: { attack: 2, defense: 2, spellPower: 1, knowledge: 1 },
      classWeights: { attack: 25, defense: 30, spellPower: 25, knowledge: 20 },
    });
    expect(FACTIONS.hagwood.classWeights).toEqual({ attack: 10, defense: 15, spellPower: 40, knowledge: 35 });
    expect(FACTIONS.wildergrass).toMatchObject({
      heroStats: { attack: 2, defense: 1, spellPower: 1, knowledge: 1 },
      classWeights: { attack: 40, defense: 20, spellPower: 20, knowledge: 20 },
    });
  });

  it('keeps object rules hidden until that player learns the object type', () => {
    const game = createGame({ seed: 231, p1: 'human', p2: 'human' });
    const object = game.map.objects.find((entry) => entry.kind === 'mine')!;
    const hidden = inspectTarget(game, { kind: 'object', id: object.id })!;
    expect(hidden.flavor).toBeTruthy();
    expect(hidden.mechanics).toEqual([]);
    expect(hidden.learned).toBe(false);
    discoverMapObject(game.players.p1, object);
    expect(inspectTarget(game, { kind: 'object', id: object.id })).toMatchObject({ learned: true });
    expect(inspectTarget(game, { kind: 'object', id: object.id })!.mechanics.length).toBeGreaterThan(0);
    expect(game.players.p2.discoveredObjectKinds).toEqual([]);
  });

  it('exposes generated mechanics beside flavor for every reusable card family', () => {
    const game = createGame({ seed: 232, p1: 'human', p2: 'human' });
    for (const target of [
      { kind: 'unit', id: 'yeoman' }, { kind: 'spell', id: 'rally' },
      { kind: 'building', id: 'townHall' }, { kind: 'artifact', id: 'sevenLeagueBoots' },
      { kind: 'item', id: 'potionOfVigor' }, { kind: 'skill', id: 'logistics' },
      { kind: 'hero', id: game.players.p1.hero!.id }, { kind: 'counter', id: 'hex' },
      { kind: 'omen', id: game.omen },
    ] as const) {
      const card = inspectTarget(game, target)!;
      expect(card.name).toBeTruthy(); expect(card.flavor).toBeTruthy();
      expect(card.mechanics.length, `${target.kind}:${target.id}`).toBeGreaterThan(0);
    }
  });
});

describe('new named specialty registry', () => {
  const handler = (id: SpecialtyId) => specialtyHandler({ specialtyId: id });

  it('registers all sixteen specified behavior values', () => {
    expect(handler('deepLastLight').lastLightHex?.()).toBe(3);
    expect(handler('brightRemembrance').spellAlwaysUpgraded?.('remembrance')).toBe(true);
    expect(handler('watchfulRetaliation').retaliationMultiplier?.('sentries')).toBe(1.25);
    expect(handler('heavyUnfinishedBusiness').unfinishedBusinessRate?.()).toBe(0.2);
    expect(handler('nurturingBrood').unitHp?.('larvalTide')).toBe(5);
    expect(handler('masterRenderer').renderRate?.()).toBe(0.15);
    expect(handler('swiftPaperWasps').unitSpeedBonus?.('paperWaspLancers')).toBe(1);
    expect(handler('brightBloom').spellAlwaysUpgraded?.('bloom')).toBe(true);
    expect(handler('gentleDebts').debtDelay?.()).toBe(1);
    expect(handler('brightSour').spellAlwaysUpgraded?.('sour')).toBe(true);
    expect(handler('vengefulCrows').retaliationAppliesHex?.('crowChorus')).toBe(true);
    expect(handler('farSweep').sweepDistance?.('besomRiders')).toBe(2);
    expect(handler('dearerBloodPrice').bloodPriceMeter?.()).toBe(25);
    expect(handler('hungryPack').packHungerMultiplier?.()).toBe(1.25);
    expect(handler('brightGale').spellAlwaysUpgraded?.('gale')).toBe(true);
    expect(handler('unhinderedSkirmish').skirmishIgnoresSlows?.('outriders')).toBe(true);
  });

  it('applies Vess and Kettl unit overrides when battle stacks are created', () => {
    const game = createGame({ seed: 233, p1: 'human', p2: 'human', p1Faction: 'vespiary' });
    const defender = game.players.p2.hero!;
    const vess = heroFrom(game, 'p1', 'vess');
    const [vessBattle] = createBattle(makeArmy([{ unitId: 'larvalTide', count: 4 }]),
      makeArmy([{ unitId: 'yeoman', count: 4 }]), vess, defender,
      { kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: vess.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' }, 1);
    expect(vessBattle.stacks[0]).toMatchObject({ topHp: 5, hpOverride: 5 });

    const kettl = heroFrom(game, 'p1', 'kettl');
    const [kettlBattle] = createBattle(makeArmy([{ unitId: 'paperWaspLancers', count: 4 }]),
      makeArmy([{ unitId: 'yeoman', count: 4 }]), kettl, defender,
      { kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: kettl.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' }, 1);
    expect(kettlBattle.stacks[0].specialtySpeedBonus).toBe(1);
  });

  it('applies Maren and Hollis through the shared death-trigger pipeline', () => {
    const game = createGame({ seed: 234, p1: 'human', p2: 'human', p2Faction: 'unfinished' });
    const attacker = game.players.p1.hero!;
    const battleFor = (defender: Hero, unitId: 'candleWisps' | 'sentries') => createBattle(
      makeArmy([{ unitId: 'woodenColossus', count: 10 }]), makeArmy([{ unitId, count: 1 }]),
      attacker, defender, { kind: 'hero', targetId: defender.id, destination: defender.position,
        attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2' }, 2,
    )[0];
    const marenBattle = battleFor(heroFrom(game, 'p2', 'maren'), 'candleWisps');
    const marenActor = marenBattle.stacks[0]; const wisp = marenBattle.stacks[1];
    wisp.position = { x: 1, y: marenActor.position.y };
    runAttackPipeline(marenBattle, marenActor.id, wisp.id);
    expect(marenActor.counters.hex).toBe(3);

    const hollisBattle = battleFor(heroFrom(game, 'p2', 'brotherHollis'), 'sentries');
    const hollisActor = hollisBattle.stacks[0]; const sentry = hollisBattle.stacks[1];
    sentry.position = { x: 1, y: hollisActor.position.y };
    const before = hollisActor.topHp;
    runAttackPipeline(hollisBattle, hollisActor.id, sentry.id);
    expect(before - hollisActor.topHp).toBe(9);
  });

  it('applies retaliation and skirmish specialties inside combat resolution', () => {
    const unfinished = createGame({ seed: 235, p1: 'human', p2: 'human', p1Faction: 'unfinished' });
    const targetHero = unfinished.players.p2.hero!;
    const retaliationDamage = (hero: Hero) => {
      const [battle] = createBattle(makeArmy([{ unitId: 'sentries', count: 10 }]),
        makeArmy([{ unitId: 'stuffedSentinel', count: 10 }]), hero, targetHero,
        { kind: 'hero', targetId: targetHero.id, destination: targetHero.position,
          attackerHeroId: hero.id, defenderHeroId: targetHero.id, defenderPlayerId: 'p2' }, 3);
      const sentries = battle.stacks[0]; const target = battle.stacks[1];
      target.position = { x: 1, y: sentries.position.y };
      const before = (target.count - 1) * UNITS[target.unitId].hp + target.topHp;
      runAttackPipeline(battle, sentries.id, target.id, true);
      return before - ((target.count - 1) * UNITS[target.unitId].hp + target.topHp);
    };
    expect(retaliationDamage(heroFrom(unfinished, 'p1', 'tobiah')))
      .toBeGreaterThan(retaliationDamage(heroFrom(unfinished, 'p1', 'maren')));

    const clans = createGame({ seed: 236, p1: 'human', p2: 'human', p1Faction: 'wildergrass' });
    const bataar = heroFrom(clans, 'p1', 'bataar');
    const [battle] = createBattle(makeArmy([{ unitId: 'outriders', count: 20 }]),
      makeArmy([{ unitId: 'stuffedSentinel', count: 20 }]), bataar, clans.players.p2.hero!,
      { kind: 'hero', targetId: clans.players.p2.hero!.id, destination: clans.players.p2.hero!.position,
        attackerHeroId: bataar.id, defenderHeroId: clans.players.p2.hero!.id, defenderPlayerId: 'p2' }, 4);
    const outriders = battle.stacks[0]; const target = battle.stacks[1];
    target.position = { x: 1, y: outriders.position.y }; outriders.counters.chill = 3;
    runAttackPipeline(battle, outriders.id, target.id);
    expect(outriders.postAttackMovePoints).toBe(UNITS.outriders.speed);
  });
});
