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
  battleRounds: number[];
  spellCasts: number;
  battleOutcomes: GameState['metrics']['battleOutcomes'];
}

export function simulateGame(seed: number, maxDays = 70, noMagic = false): SimResult {
  let state = createGame({ seed, p1: 'ai', p2: 'ai' });
  state.magicDisabled = noMagic;
  try {
    while (!state.winner && state.day <= maxDays) {
      state = runStrategyTurn(state);
    }
    return {
      seed, winner: state.winner, days: state.day,
      battles: state.metrics.battles,
      casualties: state.metrics.casualties,
      replay: state.replay,
      battleRounds: state.metrics.battleRounds,
      spellCasts: state.metrics.spellCasts,
      battleOutcomes: state.metrics.battleOutcomes,
      summary: `heroes p1=${state.players.p1.heroes.map((hero) =>
        `${hero.name}@${hero.position.x},${hero.position.y}`).join('|') || 'none'} `
        + `p2=${state.players.p2.heroes.map((hero) =>
          `${hero.name}@${hero.position.x},${hero.position.y}`).join('|') || 'none'}; `
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
      battleRounds: state.metrics.battleRounds,
      spellCasts: state.metrics.spellCasts,
      battleOutcomes: state.metrics.battleOutcomes,
      summary: `active=${state.activePlayer}`,
      crashed: error instanceof Error ? error.stack ?? error.message : String(error),
    };
  }
}
