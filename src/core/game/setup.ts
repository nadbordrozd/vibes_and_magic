import { DAYS_PER_WEEK, HERO_MOVE_POINTS } from '../../content/constants';
import {
  BASE_CASTLE_GOLD_INCOME, FIELD_MANA_REGEN, TREASURY_GOLD_INCOME,
  STARTING_RESOURCES,
} from '../../content/constants';
import { FACTIONS, validateFactions } from '../../content/factions';
import { validateBuildings } from '../../content/buildings';
import { FACTION_HEROES, HEROES, validateHeroes } from '../../content/heroes';
import { validateSkills } from '../../content/skills';
import { SKILLS } from '../../content/skills';
import {
  createBorderMarches, validateMap,
} from '../../content/maps/borderMarches';
import { FACTION_UNITS, UNITS, validateUnits } from '../../content/units';
import { SCHOOL_SPELLS } from '../../content/spells';
import { emptyArmy, makeArmy } from '../army';
import { logisticsRate, skillRank } from '../heroBehaviors';
import { syncHeroView } from '../heroes';
import { sameCoord } from '../map/pathfinding';
import { revealForPlayer } from '../map/visibility';
import { randomInt, shuffle } from '../rng';
import type {
  BuildingId, Castle, GameState, Hero, NewGameOptions, Player, PlayerId, Resources, SpellId,
} from '../types';
import { checkVictory, updateCastlelessCountdowns } from './outcomes';
import { refreshAllTaverns } from './tavern';

function makeHero(playerId: PlayerId, definitionId: Hero['definitionId']): Hero {
  const faction = FACTIONS[playerId === 'p1' ? 'hearthguard' : 'woundWrights'];
  const definition = HEROES[definitionId];
  const factionStaple: SpellId = faction.id === 'hearthguard' ? 'rally' : 'wither';
  const knownSpells: SpellId[] = [factionStaple, ...definition.startingSpells]
    .filter((spell, index, spells) => spells.indexOf(spell) === index);
  return {
    id: `${playerId}-${definition.id}`, definitionId, name: definition.name,
    specialtyId: definition.specialty.id, owner: playerId,
    faction: faction.id,
    position: { ...faction.heroStart },
    ...faction.heroStats,
    luck: faction.luck, moraleBonus: faction.moraleBonus,
    mana: faction.heroStats.knowledge * 10, movement: HERO_MOVE_POINTS,
    level: 1, xp: 0, alive: true, defeated: false,
    knownSpells,
    upgradedSpells: [], visitedShrines: [],
    shrineChoices: {}, skills: { ...definition.startingSkills }, pathMemory: [],
    inventory: Array(6).fill(null),
    army: emptyArmy(),
  };
}

function makePlayer(
  id: PlayerId,
  controller: 'human' | 'ai',
  rngState: number,
): [Player, number] {
  const hearthguard = id === 'p1';
  const factionId = hearthguard ? 'hearthguard' : 'woundWrights';
  let startIndex: number;
  let rng: number;
  [startIndex, rng] = randomInt(rngState, FACTION_HEROES[factionId].length);
  const definitions = FACTION_HEROES[factionId];
  const starting = makeHero(id, definitions[startIndex]);
  starting.army = makeArmy(FACTIONS[factionId].startingArmy);
  starting.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(starting)));
  let pool = definitions.filter((_, index) => index !== startIndex)
    .map((definitionId) => makeHero(id, definitionId));
  for (const candidate of pool) {
    candidate.alive = false;
    candidate.movement = 0;
  }
  [pool, rng] = shuffle(pool, rng);
  const offers = pool.slice(0, 2).map((hero) => hero.id);
  const player: Player = {
    id, name: hearthguard ? 'Player 1' : 'Player 2',
    faction: factionId, controller,
    resources: { ...STARTING_RESOURCES },
    heroes: [starting], activeHeroId: starting.id, hero: starting,
    tavernPool: pool, tavernOffers: offers, tavernOfferWeek: 1,
    castlelessDays: 0, explored: [],
  };
  return [player, rng];
}

function guildDeck(owner: PlayerId, seed: number): Castle['guildDeck'] {
  const primary = owner === 'p1'
    ? [...SCHOOL_SPELLS('rite'), ...SCHOOL_SPELLS('craft')]
    : [...SCHOOL_SPELLS('craft'), ...SCHOOL_SPELLS('grave')];
  const offPair = owner === 'p1' ? SCHOOL_SPELLS('grave') : SCHOOL_SPELLS('rite');
  const order = (ids: typeof primary, salt: number) => [...ids].sort((a, b) => {
    const hash = (value: string) => [...value].reduce(
      (total, char) => Math.imul(total ^ char.charCodeAt(0), 16777619), seed ^ salt,
    ) >>> 0;
    return hash(a) - hash(b) || a.localeCompare(b);
  });
  return [...order(primary, owner === 'p1' ? 11 : 17).slice(0, 6),
    ...order(offPair, owner === 'p1' ? 23 : 29).slice(0, 2)];
}

function makeCastle(owner: PlayerId, seed: number): Castle {
  const hearthguard = owner === 'p1';
  return {
    id: `${owner}-castle`, owner,
    faction: hearthguard ? 'hearthguard' : 'woundWrights',
    position: hearthguard ? { x: 3, y: 10 } : { x: 24, y: 10 },
    buildings: ['townHall', 'dwelling1'],
    available: [UNITS[FACTION_UNITS[hearthguard ? 'hearthguard' : 'woundWrights'][0]].growth,
      0, 0, 0, 0], garrison: emptyArmy(), builtOnDay: null,
    guildDeck: guildDeck(owner, seed),
  };
}

export function createGame(options: NewGameOptions): GameState {
  validateUnits();
  validateBuildings();
  validateFactions();
  validateHeroes();
  validateSkills();
  const map = createBorderMarches();
  validateMap(map);
  const castles = [makeCastle('p1', options.seed), makeCastle('p2', options.seed)];
  let rng = options.seed >>> 0;
  let p1: Player;
  let p2: Player;
  [p1, rng] = makePlayer('p1', options.p1, rng);
  [p2, rng] = makePlayer('p2', options.p2, rng);
  p1.resources.gold += BASE_CASTLE_GOLD_INCOME;
  p1.explored = revealForPlayer([], map, p1.heroes, castles.filter((c) => c.owner === 'p1'));
  p2.explored = revealForPlayer([], map, p2.heroes, castles.filter((c) => c.owner === 'p2'));
  return {
    version: 1, seed: options.seed >>> 0, rng,
    day: 1, week: 1, activePlayer: 'p1', phase: 'adventure',
    players: { p1, p2 }, castles, map, battle: null,
    pendingChoice: null, winner: null, replay: [],
    metrics: {
      battles: 0, casualties: { p1: 0, p2: 0, neutral: 0 },
      battleRounds: [], spellCasts: 0, battleOutcomes: [],
    },
    magicDisabled: false,
    lastBattleRecovered: {},
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
  for (const hero of player.heroes.filter((candidate) => candidate.alive)) {
    hero.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero)));
    const inCastle = state.castles.some(
      (castle) => castle.owner === playerId
        && sameCoord(castle.position, hero.position),
    );
    const attunement = skillRank(hero, 'attunement');
    const bonus = attunement === 1 ? SKILLS.attunement.values.rank1Regen
      : attunement === 2 ? SKILLS.attunement.values.rank2Regen : 0;
    hero.mana = inCastle
      ? hero.knowledge * 10
      : Math.min(hero.knowledge * 10, hero.mana + FIELD_MANA_REGEN + bonus);
  }
  syncHeroView(player);
  player.explored = revealForPlayer(
    player.explored, state.map, player.heroes,
    state.castles.filter((castle) => castle.owner === playerId),
  );
  state.lastMessage = `Day ${state.day} — ${player.name}'s turn.`;
}

function replenishDwellings(state: GameState): void {
  for (const castle of state.castles) {
    const units = FACTION_UNITS[castle.faction];
    castle.available[0] += UNITS[units[0]].growth;
    if (castle.buildings.includes('dwelling2')) castle.available[1] += UNITS[units[1]].growth;
    for (const tier of [2, 3, 4, 5] as const) {
      if (castle.buildings.includes(`dwelling${tier}` as BuildingId)) {
        castle.available[tier - 1] += UNITS[units[tier - 1]].growth;
      }
    }
  }
}

export function endTurn(state: GameState): void {
  if (state.activePlayer === 'p1') {
    startTurn(state, 'p2');
    return;
  }
  state.day += 1;
  state.week = Math.floor((state.day - 1) / DAYS_PER_WEEK) + 1;
  if ((state.day - 1) % DAYS_PER_WEEK === 0) {
    replenishDwellings(state);
    refreshAllTaverns(state);
  }
  updateCastlelessCountdowns(state);
  checkVictory(state);
  if (state.phase === 'gameOver') return;
  startTurn(state, 'p1');
}
