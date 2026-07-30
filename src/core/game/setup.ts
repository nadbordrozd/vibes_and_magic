import { DAYS_PER_WEEK, HERO_MOVE_POINTS } from '../../content/constants';
import {
  BASE_CASTLE_GOLD_INCOME, FIELD_MANA_REGEN, TREASURY_GOLD_INCOME,
  STARTING_RESOURCES,
} from '../../content/constants';
import { FACTIONS, validateFactions } from '../../content/factions';
import { validateBuildings } from '../../content/buildings';
import {
  createBorderMarches, validateMap,
} from '../../content/maps/borderMarches';
import { FACTION_UNITS, UNITS, validateUnits } from '../../content/units';
import { emptyArmy, makeArmy } from '../army';
import { sameCoord } from '../map/pathfinding';
import { revealForPlayer } from '../map/visibility';
import type {
  Castle, GameState, Hero, NewGameOptions, Player, PlayerId, Resources,
} from '../types';

function makeHero(playerId: PlayerId): Hero {
  const faction = FACTIONS[playerId === 'p1' ? 'crimson' : 'azure'];
  return {
    id: `${playerId}-hero`, owner: playerId,
    faction: faction.id,
    position: { ...faction.heroStart },
    ...faction.heroStats,
    luck: faction.luck, moraleBonus: faction.moraleBonus,
    mana: faction.heroStats.knowledge * 10, movement: HERO_MOVE_POINTS,
    level: 1, xp: 0, alive: true,
    army: makeArmy(faction.startingArmy),
  };
}

function makePlayer(id: PlayerId, controller: 'human' | 'ai'): Player {
  const crimson = id === 'p1';
  return {
    id, name: crimson ? 'Player 1' : 'Player 2',
    faction: crimson ? 'crimson' : 'azure', controller,
    resources: { ...STARTING_RESOURCES }, hero: makeHero(id), explored: [],
  };
}

function makeCastle(owner: PlayerId): Castle {
  const crimson = owner === 'p1';
  return {
    id: `${owner}-castle`, owner, faction: crimson ? 'crimson' : 'azure',
    position: crimson ? { x: 3, y: 10 } : { x: 24, y: 10 },
    buildings: ['townHall', 'dwelling1'],
    available: [14, 0, 0], garrison: emptyArmy(), builtOnDay: null,
  };
}

export function createGame(options: NewGameOptions): GameState {
  validateUnits();
  validateBuildings();
  validateFactions();
  const map = createBorderMarches();
  validateMap(map);
  const castles = [makeCastle('p1'), makeCastle('p2')];
  const p1 = makePlayer('p1', options.p1);
  const p2 = makePlayer('p2', options.p2);
  p1.resources.gold += BASE_CASTLE_GOLD_INCOME;
  p1.explored = revealForPlayer([], map, p1.hero, castles.filter((c) => c.owner === 'p1'));
  p2.explored = revealForPlayer([], map, p2.hero, castles.filter((c) => c.owner === 'p2'));
  return {
    version: 1, seed: options.seed >>> 0, rng: options.seed >>> 0,
    day: 1, week: 1, activePlayer: 'p1', phase: 'adventure',
    players: { p1, p2 }, castles, map, battle: null,
    pendingChoice: null, winner: null, replay: [],
    metrics: { battles: 0, casualties: { p1: 0, p2: 0, neutral: 0 } },
    lastMessage: 'Day 1 — Player 1 begins.',
  };
}

export function incomeForPlayer(state: GameState, playerId: PlayerId): Resources {
  const income: Resources = { gold: 0, timber: 0, iron: 0, essence: 0 };
  for (const castle of state.castles.filter((item) => item.owner === playerId)) {
    income.gold += BASE_CASTLE_GOLD_INCOME
      + (castle.buildings.includes('treasury') ? TREASURY_GOLD_INCOME : 0);
  }
  for (const object of state.map.objects) {
    if (object.kind === 'mine' && object.owner === playerId) {
      income[object.resource] += object.income;
    }
  }
  return income;
}

function startTurn(state: GameState, playerId: PlayerId): void {
  state.activePlayer = playerId;
  const player = state.players[playerId];
  const income = incomeForPlayer(state, playerId);
  for (const resource of Object.keys(income) as Array<keyof Resources>) {
    player.resources[resource] += income[resource];
  }
  if (player.hero?.alive) {
    player.hero.movement = HERO_MOVE_POINTS;
    const inCastle = state.castles.some(
      (castle) => castle.owner === playerId
        && sameCoord(castle.position, player.hero!.position),
    );
    player.hero.mana = inCastle
      ? player.hero.knowledge * 10
      : Math.min(player.hero.knowledge * 10, player.hero.mana + FIELD_MANA_REGEN);
  }
  player.explored = revealForPlayer(
    player.explored, state.map, player.hero,
    state.castles.filter((castle) => castle.owner === playerId),
  );
  state.lastMessage = `Day ${state.day} — ${player.name}'s turn.`;
}

function replenishDwellings(state: GameState): void {
  for (const castle of state.castles) {
    const units = FACTION_UNITS[castle.faction];
    castle.available[0] += UNITS[units[0]].growth;
    if (castle.buildings.includes('dwelling2')) castle.available[1] += UNITS[units[1]].growth;
    if (castle.buildings.includes('dwelling3')) castle.available[2] += UNITS[units[2]].growth;
  }
}

export function endTurn(state: GameState): void {
  if (state.activePlayer === 'p1') {
    startTurn(state, 'p2');
    return;
  }
  state.day += 1;
  state.week = Math.floor((state.day - 1) / DAYS_PER_WEEK) + 1;
  if ((state.day - 1) % DAYS_PER_WEEK === 0) replenishDwellings(state);
  startTurn(state, 'p1');
}
