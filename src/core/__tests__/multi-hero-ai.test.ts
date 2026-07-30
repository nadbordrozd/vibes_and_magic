import { describe, expect, it } from 'vitest';
import { runStrategyTurn } from '../../ai/strategy';
import { apply, createGame } from '../game';
import type { GameState } from '../types';

function tavernGame(gold: number): GameState {
  let state = createGame({ seed: 70, p1: 'ai', p2: 'ai' });
  state.players.p1.resources = {
    gold: 10000, timber: 20, iron: 3, essence: 10,
  };
  state = apply(state, {
    type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild1',
  });
  state.castles[0].builtOnDay = null;
  state = apply(state, {
    type: 'BUILD', castleId: 'p1-castle', buildingId: 'tavern',
  });
  state.players.p1.resources.gold = gold;
  state.castles[0].builtOnDay = state.day;
  state.castles[0].available = [0, 0, 0, 0, 0];
  return state;
}

describe('multi-hero strategy AI', () => {
  it('hires a second hero only above 3500 gold', () => {
    const held = runStrategyTurn(tavernGame(3500));
    const hired = runStrategyTurn(tavernGame(3501));
    expect(held.players.p1.heroes).toHaveLength(1);
    expect(hired.players.p1.heroes).toHaveLength(2);
  });

  it('hires a third hero only above 8000 gold', () => {
    let held = tavernGame(10000);
    held = apply(held, {
      type: 'HIRE_HERO', castleId: 'p1-castle',
      heroId: held.players.p1.tavernOffers[0],
    });
    const eligible = structuredClone(held);
    held.players.p1.resources.gold = 8000;
    eligible.players.p1.resources.gold = 8001;
    expect(runStrategyTurn(held).players.p1.heroes).toHaveLength(2);
    expect(runStrategyTurn(eligible).players.p1.heroes).toHaveLength(3);
  });

  it('assigns the strongest army Main and delivers Gatherer surplus when adjacent', () => {
    let state = tavernGame(10000);
    state = apply(state, {
      type: 'HIRE_HERO', castleId: 'p1-castle',
      heroId: state.players.p1.tavernOffers[0],
    });
    const [main, gatherer] = state.players.p1.heroes;
    gatherer.army[0] = { unitId: 'yeoman', count: 18 };
    state.players.p1.resources.gold = 0;
    const mainBefore = main.army[0]!.count;
    state = runStrategyTurn(state);
    const finalMain = state.players.p1.heroes.find((hero) => hero.id === main.id)!;
    const finalGatherer = state.players.p1.heroes.find((hero) => hero.id === gatherer.id)!;
    expect(finalMain.army[0]!.count).toBe(mainBefore + 10);
    expect(finalGatherer.army[0]!.count).toBe(8);
  });
});
