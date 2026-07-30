import { runStrategyTurn } from '../ai/strategy';
import { createGame } from '../core/game';
import type { Action, GameState, PlayerId } from '../core/types';

export interface SimResult {
  seed: number;
  winner: PlayerId | null;
  days: number;
  battles: number;
  casualties: GameState['metrics']['casualties'];
  replay: Action[];
  summary: string;
  crashed?: string;
}

export function simulateGame(seed: number, maxDays = 70): SimResult {
  let state = createGame({ seed, p1: 'ai', p2: 'ai' });
  try {
    while (!state.winner && state.day <= maxDays) {
      state = runStrategyTurn(state);
    }
    return {
      seed, winner: state.winner, days: state.day,
      battles: state.metrics.battles,
      casualties: state.metrics.casualties,
      replay: state.replay,
      summary: `heroes p1=${state.players.p1.hero
        ? `${state.players.p1.hero.position.x},${state.players.p1.hero.position.y}` : 'dead'} `
        + `p2=${state.players.p2.hero
          ? `${state.players.p2.hero.position.x},${state.players.p2.hero.position.y}` : 'dead'}; `
        + `castles=${state.castles.map((castle) => castle.owner).join(',')}; `
        + `remaining piles=${state.map.objects.filter((object) =>
          object.kind === 'pile' && !object.collected).length} `
        + `chests=${state.map.objects.filter((object) =>
          object.kind === 'chest' && !object.collected).length} `
        + `mines=${state.map.objects.filter((object) =>
          object.kind === 'mine' && object.owner === null).length}; `
        + `moves=${state.replay.filter((action) => action.type === 'MOVE_HERO')
          .slice(-6).map((action) => `${action.destination.x},${action.destination.y}`).join('|')}; `
        + `actions=${Object.entries(state.replay.reduce<Record<string, number>>(
          (counts, action) => ({ ...counts, [action.type]: (counts[action.type] ?? 0) + 1 }),
          {},
        )).map(([type, count]) => `${type}:${count}`).join(',')}`,
    };
  } catch (error) {
    return {
      seed, winner: null, days: state.day, battles: state.metrics.battles,
      casualties: state.metrics.casualties, replay: state.replay,
      summary: `active=${state.activePlayer}`,
      crashed: error instanceof Error ? error.stack ?? error.message : String(error),
    };
  }
}
