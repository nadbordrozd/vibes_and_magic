import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../../content/buildings';
import { makeArmy } from '../army';
import { createBattle } from '../combat/battle';
import { runAttackPipeline } from '../combat/pipeline';
import { castSpell } from '../combat/spells';
import { createGame, incomeForPlayer } from '../game';
import { relocateCastle, tunnelTravel } from '../game/castleAbilities';
import { transferArmy } from '../game/economy';
import { moveHero } from '../game/exploration';
import { castleEntrance } from '../map/occupancy';

describe('phase D castles and siege-lite', () => {
  it('uses the Village/Town/City income tree and defines every special building', () => {
    const state = createGame({ seed: 701, p1: 'human', p2: 'human' });
    expect(state.castles[0].buildings).toContain('villageHall');
    expect(state.castles[0].buildings).not.toContain('townHall');
    expect(incomeForPlayer(state, 'p1').gold).toBe(500);
    state.castles[0].buildings.push('townHall', 'cityHall');
    expect(incomeForPlayer(state, 'p1').gold).toBe(2_000);
    for (const id of [
      'musterField', 'foundersVault', 'chapelOfCandles', 'lychgate',
      'rendery', 'deepTunnels', 'bargainPost', 'henLeggedFence',
      'greatKraal', 'pyreOfTheFallen', 'keep',
    ] as const) expect(BUILDINGS[id]).toBeDefined();
  });

  it('creates six attackable walls, a Ram, and a Keep Watchtower', () => {
    const state = createGame({ seed: 702, p1: 'human', p2: 'human' });
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 20 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 20 }]),
      state.players.p1.hero!, state.players.p2.hero!,
      {
        kind: 'castle', targetId: 'p2-castle', destination: { x: 24, y: 10 },
        attackerHeroId: state.players.p1.hero!.id,
        defenderHeroId: state.players.p2.hero!.id, defenderPlayerId: 'p2',
      }, 702, true, 'quiet', true, 3,
    );
    expect(battle.stacks.filter((stack) => stack.unitId === 'siegeWall')).toHaveLength(6);
    expect(battle.stacks.find((stack) => stack.unitId === 'siegeRam')?.topHp).toBe(80);
    expect(battle.stacks.find((stack) => stack.unitId === 'watchtower')?.count).toBe(16);
  });

  it('lets a Ram strike walls at double damage and Siegewright breach one section', () => {
    const state = createGame({ seed: 703, p1: 'human', p2: 'human' });
    state.players.p1.hero!.skills.siegewright = 3;
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 1 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 1 }]),
      state.players.p1.hero!, state.players.p2.hero!,
      {
        kind: 'castle', targetId: 'castle', destination: { x: 2, y: 2 },
        attackerHeroId: state.players.p1.hero!.id,
        defenderHeroId: state.players.p2.hero!.id, defenderPlayerId: 'p2',
      }, 703, true,
    );
    const ram = battle.stacks.find((stack) => stack.unitId === 'siegeRam')!;
    const wall = battle.stacks.find((stack) => stack.unitId === 'siegeWall')!;
    expect(battle.stacks.filter((stack) => stack.unitId === 'siegeWall')).toHaveLength(5);
    ram.position = { x: wall.position.x - 1, y: wall.position.y };
    runAttackPipeline(battle, ram.id, wall.id);
    expect(wall.topHp).toBeLessThanOrEqual(10);
  });

  it('travels through Deep Tunnels and relocates the Hen-Legged castle weekly', () => {
    const state = createGame({ seed: 704, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    state.castles[0].buildings.push('deepTunnels', 'henLeggedFence');
    state.castles[1].owner = 'p1';
    state.castles[1].buildings.push('deepTunnels');
    tunnelTravel(state, state.castles[1].id);
    expect(hero.position).toEqual(castleEntrance(state.castles[1]));
    hero.position = castleEntrance(state.castles[0]);
    const destination = { x: 2, y: 10 };
    state.players.p1.explored.push('2,10');
    relocateCastle(state, state.castles[0].id, destination);
    expect(state.castles[0].position).toEqual(destination);
    expect(hero.position).toEqual(castleEntrance(state.castles[0]));
  });

  it('uses an installed remote Warden as the garrison commander', () => {
    const state = createGame({ seed: 705, p1: 'human', p2: 'human' });
    const warden = state.players.p1.hero!;
    const attacker = state.players.p2.hero!;
    const castle = state.castles[0];
    warden.skills.warden = 3;
    warden.skills.command = 2;
    warden.attack = 11;
    const entrance = castleEntrance(castle);
    warden.position = { x: entrance.x + 1, y: entrance.y };
    transferArmy(state, {
      type: 'TRANSFER_ARMY', source: { kind: 'hero', id: warden.id }, sourceSlot: 0,
      destination: { kind: 'garrison', id: castle.id }, destinationSlot: 0, count: 1,
    });
    expect(castle.wardenHeroId).toBe(warden.id);
    warden.position = { x: entrance.x + 5, y: entrance.y };
    attacker.position = { x: entrance.x + 1, y: entrance.y };
    attacker.movement = 1_000;
    state.activePlayer = 'p2';
    moveHero(state, entrance);
    expect(state.battle?.context.remoteDefenderHeroId).toBe(warden.id);
    expect(state.battle?.defenderHero).toMatchObject({
      attack: 11, skills: { warden: 3, command: 2 },
    });
    expect(state.battle?.defenderHero?.knownSpells).toEqual(warden.knownSpells);
  });

  it('turns Siegewright R2 Maker walls into attackable 40-HP stacks', () => {
    const state = createGame({ seed: 706, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    hero.skills.siegewright = 2;
    hero.knownSpells.push('wallOfTheMaker');
    hero.mana = 99;
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
      hero, state.players.p2.hero!, {
        kind: 'hero', targetId: state.players.p2.hero!.id, destination: { x: 3, y: 3 },
        attackerHeroId: hero.id, defenderHeroId: state.players.p2.hero!.id,
        defenderPlayerId: 'p2',
      }, 706,
    );
    castSpell(battle, {
      type: 'BATTLE_CAST', spellId: 'wallOfTheMaker',
      positions: [{ x: 5, y: 1 }, { x: 5, y: 3 }, { x: 5, y: 5 }],
    });
    expect(battle.stacks.filter((stack) => stack.unitId === 'makerWall'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ count: 1, topHp: 40 }),
      ]));
    expect(battle.stacks.filter((stack) => stack.unitId === 'makerWall')).toHaveLength(3);
  });
});
