import type {
  Army, GameState, Hero, Player, PlayerId,
} from './types';
import { heroArmyCapacity, makeArmy, synchronizeHeroArmyCapacity } from './army';

export function selectedHero(player: Player): Hero | null {
  return player.heroes.find((hero) => hero.id === player.activeHeroId && hero.alive)
    ?? player.heroes.find((hero) => hero.alive)
    ?? null;
}

export function activeHero(state: GameState): Hero {
  const hero = selectedHero(state.players[state.activePlayer]);
  if (!hero) throw new Error('Active player has no living hero');
  return hero;
}

export function findHero(state: GameState, heroId: string): Hero | null {
  for (const player of Object.values(state.players)) {
    const hero = player.heroes.find((candidate) => candidate.id === heroId);
    if (hero) return hero;
  }
  return null;
}

export function findOwnedHero(
  state: GameState,
  playerId: PlayerId,
  heroId: string,
): Hero | null {
  return state.players[playerId].heroes.find(
    (hero) => hero.id === heroId && hero.alive,
  ) ?? null;
}

export function syncHeroView(player: Player): void {
  const selected = selectedHero(player);
  player.activeHeroId = selected?.id ?? null;
  player.hero = selected;
}

export function syncLegacyHeroIntoRoster(player: Player): void {
  if (!player.hero) return;
  const index = player.heroes.findIndex((hero) => hero.id === player.hero!.id);
  if (index >= 0) player.heroes[index] = player.hero;
}

export function syncAllHeroViews(state: GameState): void {
  for (const player of Object.values(state.players)) syncHeroView(player);
}

export function selectHero(state: GameState, heroId: string): void {
  const player = state.players[state.activePlayer];
  const hero = player.heroes.find((candidate) => candidate.id === heroId && candidate.alive);
  if (!hero) throw new Error('Hero is not available');
  player.activeHeroId = hero.id;
  syncHeroView(player);
  state.lastMessage = `${hero.name} selected.`;
}

export function nextHero(state: GameState): void {
  const player = state.players[state.activePlayer];
  const living = player.heroes.filter((hero) => hero.alive);
  if (!living.length) throw new Error('No living hero');
  const current = living.findIndex((hero) => hero.id === player.activeHeroId);
  const unmoved = living.filter((hero) => hero.movement > 0);
  const candidates = unmoved.length ? unmoved : living;
  const next = candidates.find((hero) =>
    living.indexOf(hero) > Math.max(-1, current)) ?? candidates[0];
  player.activeHeroId = next.id;
  syncHeroView(player);
  state.lastMessage = `${next.name} selected.`;
}

export function defeatHero(state: GameState, heroId: string, retainedArmy?: Army): Hero | null {
  for (const player of Object.values(state.players)) {
    const index = player.heroes.findIndex((hero) => hero.id === heroId);
    if (index < 0) continue;
    const [hero] = player.heroes.splice(index, 1);
    hero.alive = false;
    hero.defeated = true;
    hero.army = retainedArmy ?? (hero.tavernArmyRetained ? hero.army
      : makeArmy([], heroArmyCapacity(hero)));
    synchronizeHeroArmyCapacity(hero);
    hero.tavernArmyRetained = Boolean(retainedArmy) || hero.tavernArmyRetained;
    hero.movement = 0;
    hero.dailyMovementMaximum = 0;
    hero.pathMemory = [];
    player.tavernPool.push(hero);
    player.tavernOffers = [
      hero.id, ...player.tavernOffers.filter((id) => id !== hero.id),
    ].slice(0, 2);
    if (player.activeHeroId === heroId) {
      player.activeHeroId = player.heroes.find((candidate) => candidate.alive)?.id ?? null;
    }
    syncHeroView(player);
    return hero;
  }
  return null;
}
