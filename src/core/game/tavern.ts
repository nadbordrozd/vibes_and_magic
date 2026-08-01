import {
  HERO_HIRE_COST, HERO_MOVE_POINTS, HERO_REHIRE_COST, MAX_HEROES_PER_PLAYER,
} from '../../content/constants';
import { FACTIONS } from '../../content/factions';
import { canAfford, makeArmy, pay } from '../army';
import { logisticsRate } from '../heroBehaviors';
import { syncHeroView } from '../heroes';
import { randomInt } from '../rng';
import { castleEntrance } from '../map/occupancy';
import type {
  GameState, Hero, Player,
} from '../types';
import { buildingIsActive } from './buildingStatus';

function drawOffers(
  pool: Hero[],
  previous: string[],
  rngState: number,
): [string[], number] {
  const available = pool.map((hero) => hero.id);
  const offers: string[] = [];
  let rng = rngState;
  while (offers.length < Math.min(2, available.length)) {
    let index: number;
    [index, rng] = randomInt(rng, available.length);
    if (!offers.includes(available[index])) offers.push(available[index]);
  }
  if (available.length > 2 && offers.every((id) => previous.includes(id))) {
    const replacement = available.find((id) => !previous.includes(id));
    if (replacement) offers[offers.length - 1] = replacement;
  }
  return [offers, rng];
}

export function refreshTavernOffers(state: GameState, player: Player): void {
  [player.tavernOffers, state.rng] = drawOffers(
    player.tavernPool, player.tavernOffers, state.rng,
  );
  player.tavernOfferWeek = state.week;
}

export function refreshAllTaverns(state: GameState): void {
  for (const player of Object.values(state.players)) refreshTavernOffers(state, player);
}

export function heroHireCost(hero: Hero): number {
  return hero.defeated ? HERO_REHIRE_COST * hero.rehireMultiplier : HERO_HIRE_COST;
}

export function hireHero(
  state: GameState,
  castleId: string,
  heroId: string,
): void {
  const player = state.players[state.activePlayer];
  const castle = state.castles.find((candidate) => candidate.id === castleId);
  if (!castle || castle.owner !== player.id || !buildingIsActive(castle, 'tavern')) {
    throw new Error('Tavern unavailable');
  }
  if (player.heroes.filter((hero) => hero.alive).length >= MAX_HEROES_PER_PLAYER) {
    throw new Error('Hero limit reached');
  }
  if (!player.tavernOffers.includes(heroId)) throw new Error('Hero is not offered');
  const index = player.tavernPool.findIndex((hero) => hero.id === heroId);
  if (index < 0) throw new Error('Hero is not in the tavern pool');
  const hero = player.tavernPool[index];
  const cost = heroHireCost(hero);
  if (!canAfford(player.resources, { gold: cost })) throw new Error('Cannot afford hero');
  player.resources = pay(player.resources, { gold: cost });
  player.tavernPool.splice(index, 1);
  player.tavernOffers = player.tavernOffers.filter((id) => id !== heroId);
  const returning = hero.defeated;
  hero.alive = true;
  hero.position = castleEntrance(castle);
  hero.mana = hero.knowledge * 10;
  hero.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero)));
  hero.pathMemory = [];
  hero.army = returning
    ? (hero.tavernArmyRetained ? hero.army : makeArmy([]))
    : makeArmy(FACTIONS[player.faction].hireArmy);
  hero.tavernArmyRetained = false;
  hero.defeated = false;
  hero.rehireMultiplier = 1;
  if (state.castles.some((owned) => owned.owner === player.id
      && buildingIsActive(owned, 'chapelOfTheBanner'))) {
    hero.moraleBonus = FACTIONS[player.faction].moraleBonus + 5;
  }
  player.heroes.push(hero);
  if (!player.activeHeroId) player.activeHeroId = hero.id;
  syncHeroView(player);
  state.lastMessage = returning
    ? `${hero.name} was ransomed and returned.` : `${hero.name} joined the company.`;
}
