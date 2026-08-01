import { runStrategyTurn } from '../ai/strategy';
import { autoResolveBattle } from '../ai/combat';
import { createGame } from '../core/game';
import { makeArmy } from '../core/army';
import { createBattle, splitGuardianArmy } from '../core/combat/battle';
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

export interface LockAssaultResult {
  seed: number;
  lockId: string;
  attackerLost: boolean;
  crashed?: string;
}

export function simulateLockAssaults(seed: number): LockAssaultResult[] {
  const game = createGame({ seed, p1: 'ai', p2: 'ai' });
  const hero = game.players.p1.hero!;
  hero.army = makeArmy([
    { unitId: 'yeoman', count: 110 },
    { unitId: 'longbowman', count: 45 },
    { unitId: 'bannerman', count: 28 },
    { unitId: 'lanceKnight', count: 18 },
    { unitId: 'oriflammeWarden', count: 8 },
  ]);
  return game.map.objects.filter((object) => object.kind === 'lock').map((lock) => {
    try {
      const guardian = game.map.objects.find((object) =>
        object.kind === 'guardian' && object.protects === lock.id);
      if (!guardian || guardian.kind !== 'guardian') {
        throw new Error(`Guardian missing for ${lock.id}`);
      }
      const battle = createBattle(
        hero.army, splitGuardianArmy(guardian.army, guardian.split),
        hero, null,
        {
          kind: 'guardian', targetId: guardian.id, destination: guardian.position,
          attackerHeroId: hero.id,
        },
        seed ^ lock.position.x ^ (lock.position.y << 8),
      )[0];
      const result = autoResolveBattle(battle);
      return {
        seed, lockId: lock.id, attackerLost: result.winner === 'defender',
      };
    } catch (error) {
      return {
        seed, lockId: lock.id, attackerLost: false,
        crashed: error instanceof Error ? error.stack ?? error.message : String(error),
      };
    }
  });
}

export function simulateGame(
  seed: number, maxDays = 70, noMagic = false, opponent: 'ai' | 'dormant' = 'ai',
): SimResult {
  let state = createGame({ seed, p1: 'ai', p2: opponent });
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
