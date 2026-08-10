import {
  DAYS_PER_WEEK, DIFFICULTY_MODIFIERS, GUARDIAN_GROWTH_CAP,
  GUARDIAN_WEEKLY_GROWTH, HERO_MOVE_POINTS,
} from '../../content/constants';
import {
  BASE_CASTLE_GOLD_INCOME, FIELD_MANA_REGEN,
  STARTING_RESOURCES,
} from '../../content/constants';
import { FACTIONS, validateFactions } from '../../content/factions';
import { validateBuildings } from '../../content/buildings';
import { FACTION_HEROES, HEROES, validateHeroes } from '../../content/heroes';
import { validateSkills } from '../../content/skills';
import { ITEMS, validateItems } from '../../content/items';
import { validateArtifacts } from '../../content/artifacts';
import { validateOmens } from '../../content/omens';
import { SKILLS } from '../../content/skills';
import {
  createBorderMarches, validateMap,
} from '../../content/maps/borderMarches';
import {
  createCrosstitch, createCrosstitchKit, CROSSTITCH_CASTLE_POSITIONS,
} from '../../content/maps/crosstitch';
import {
  createManywhere, MANYWHERE_CASTLE_POSITIONS, MANYWHERE_NEUTRAL_TOWNS,
} from '../../content/maps/manywhere';
import {
  createGrandMuster, GRAND_MUSTER_CASTLES, GRAND_MUSTER_ENEMY_CASTLE,
} from '../../content/maps/grandMuster';
import {
  createCrookedCrown, CROOKED_CROWN_STARTS,
} from '../../content/maps/crookedCrown';
import { validateMapObjectRegistry } from '../../content/mapObjectRegistry';
import { createTornSound, TORN_SOUND_CASTLE_POSITIONS } from '../../content/maps/tornSound';
import { FACTION_UNITS, UNITS, validateUnits } from '../../content/units';
import { validateSpells } from '../../content/spells';
import { validateBargains } from '../../content/bargains';
import { validateBattleTiles } from '../../content/battleTiles';
import { ACQUIRABLE_SCHOOL_SPELLS } from '../../content/spells';
import { emptyArmy, makeArmy } from '../army';
import {
  consumableSlotCount, dailyGoldArtifactBonus, dailyManaArtifactBonus,
  dailyMoveArtifactBonus, logisticsRate, skillRank,
} from '../heroBehaviors';
import { effectivePrimaryStat, emptyArtifacts, hasEquippedArtifact } from '../artifacts';
import { artifactEffectTotal } from '../artifacts';
import { beginWeekOmen, growthWithOmen, omenAnnouncement, rollOmen } from '../omens';
import { resolveDebtEvent } from '../debts';
import { syncHeroView } from '../heroes';
import { sameCoord } from '../map/pathfinding';
import { revealForPlayer } from '../map/visibility';
import { castleEntrance } from '../map/occupancy';
import { randomInt, shuffle } from '../rng';
import type {
  BuildingId, Castle, FactionId, GameState, Hero, NewGameOptions, Player, PlayerId,
  Resources, SpellId,
} from '../types';
import { checkVictory, updateCastlelessCountdowns } from './outcomes';
import { refreshAllTaverns } from './tavern';
import { addItem } from './items';
import { refreshMarketScrolls } from './marketplace';
import { advanceCreativeObjects } from './mapObjects';
import { buildingIsActive } from './buildingStatus';

function makeHero(
  playerId: PlayerId,
  factionId: FactionId,
  definitionId: Hero['definitionId'],
  position: { x: number; y: number },
): Hero {
  const faction = FACTIONS[factionId];
  const definition = HEROES[definitionId];
  const factionStaple: SpellId = faction.id === 'woundWrights'
    || faction.id === 'hagwood' ? 'wither'
    : faction.id === 'vespiary' ? 'forgeSpark' : 'rally';
  const knownSpells: SpellId[] = [factionStaple, ...definition.startingSpells]
    .filter((spell, index, spells) => spells.indexOf(spell) === index);
  return {
    id: `${playerId}-${definition.id}`, definitionId, name: definition.name,
    specialtyId: definition.specialty.id, owner: playerId,
    faction: faction.id,
    position: { ...position },
    ...faction.heroStats,
    luck: faction.luck, moraleBonus: faction.moraleBonus,
    mana: faction.heroStats.knowledge * 10, movement: HERO_MOVE_POINTS,
    level: 1, xp: 0, alive: true, defeated: false,
    knownSpells,
    upgradedSpells: [], visitedShrines: [],
    shrineChoices: {}, skills: { ...definition.startingSkills }, pathMemory: [],
    inventory: Array(6).fill(null),
    artifacts: emptyArtifacts(), debts: [], logisticsCarry: 0,
    declaredResonance: null, attunementResonanceUsedDay: null,
    rehireMultiplier: 1,
    ritualistOmenChosen: false,
    draftBonusCards: 0, unstitchUsedWeek: 0, beastClaimedWeek: null,
    embarkedBoatId: null, tavernArmyRetained: false,
    adventureEffects: {
      borrowedTimePenaltyDay: null, borrowedTimeMultiplier: 0,
      falseColors: null, noRetaliationBattles: 0, sleepEvery: null,
      temporaryStacks: [],
      nextBattleMeterBonus: 0, nextBattleLuckBonus: 0, timingBlessingUntilDay: 0,
      ignoredAggroDay: null,
      spareFaceUsedWeek: 0,
    },
    army: emptyArmy(),
  };
}

function makePlayer(
  id: PlayerId,
  controller: Player['controller'],
  factionId: FactionId,
  rngState: number,
  position: { x: number; y: number },
): [Player, number] {
  let startIndex: number;
  let rng: number;
  [startIndex, rng] = randomInt(rngState, FACTION_HEROES[factionId].length);
  const definitions = FACTION_HEROES[factionId];
  const starting = makeHero(id, factionId, definitions[startIndex], position);
  starting.army = makeArmy(FACTIONS[factionId].startingArmy);
  starting.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(starting)));
  let pool = definitions.filter((_, index) => index !== startIndex)
    .map((definitionId) => makeHero(id, factionId, definitionId, position));
  for (const candidate of pool) {
    candidate.alive = false;
    candidate.movement = 0;
  }
  [pool, rng] = shuffle(pool, rng);
  const offers = pool.slice(0, 2).map((hero) => hero.id);
  const player: Player = {
    id, name: `Player ${id.slice(1)}`,
    faction: factionId, controller,
    resources: { ...STARTING_RESOURCES },
    heroes: [starting], activeHeroId: starting.id, hero: starting,
    tavernPool: pool, tavernOffers: offers, tavernOfferWeek: 1,
    castlelessDays: 0, explored: [],
    discoveredObjectKinds: [],
    adventureEffects: {
      censusUntilDay: 0, censusShowsMovement: false,
      guardianIntelUntilDay: 0, greenTideUntilWeek: 0,
      tierOneGrowth: [], ironSuppressedUntilDay: 0,
      exposedHeroOwner: null, spiedCastles: [],
    },
    active: true,
  };
  return [player, rng];
}

function guildDeck(owner: PlayerId | 'neutral', factionId: FactionId, seed: number): Castle['guildDeck'] {
  const schools = FACTIONS[factionId].schools;
  const primary = schools.flatMap((school) => ACQUIRABLE_SCHOOL_SPELLS(school));
  const offPair = (['rite', 'craft', 'wild', 'grave'] as const)
    .filter((school) => !schools.includes(school))
    .flatMap((school) => ACQUIRABLE_SCHOOL_SPELLS(school));
  const order = (ids: typeof primary, salt: number) => [...ids].sort((a, b) => {
    const hash = (value: string) => [...value].reduce(
      (total, char) => Math.imul(total ^ char.charCodeAt(0), 16777619), seed ^ salt,
    ) >>> 0;
    return hash(a) - hash(b) || a.localeCompare(b);
  });
  return [...order(primary, owner === 'p1' ? 11 : 17).slice(0, 6),
    ...order(offPair, owner === 'p1' ? 23 : 29).slice(0, 2)];
}

function makeCastle(
  owner: PlayerId | 'neutral', factionId: FactionId, seed: number,
  entrancePosition: { x: number; y: number }, id = `${owner}-castle`,
): Castle {
  return {
    id, owner,
    faction: factionId,
    position: { x: entrancePosition.x - 1, y: entrancePosition.y - 1 },
    footprint: { w: 3, h: 2 }, entrance: { dx: 1, dy: 1 },
    buildings: ['villageHall', 'dwelling1', 'tavern'], bannedBuildings: [],
    available: [UNITS[FACTION_UNITS[factionId][0]].growth,
      0, 0, 0, 0, 0], garrison: emptyArmy(), builtOnDay: null,
    guildDeck: guildDeck(owner, factionId, seed),
    growthEffects: [], dormantBuildings: {},
    marketScroll: null, marketScrollWeek: 0,
    accruedCandleWisps: 0, returningDefenders: emptyArmy(),
    relocatedWeek: 0, bargainOfferWeek: 0,
    wardenHeroId: null,
  };
}

function inactivePlayer(id: PlayerId, faction: FactionId): Player {
  return {
    id, name: `Player ${id.slice(1)}`, faction, controller: 'ai', active: false,
    resources: { ...STARTING_RESOURCES }, heroes: [], activeHeroId: null, hero: null,
    tavernPool: [], tavernOffers: [], tavernOfferWeek: 1, castlelessDays: 0,
    explored: [], discoveredObjectKinds: [], adventureEffects: {
      censusUntilDay: 0, censusShowsMovement: false, guardianIntelUntilDay: 0,
      greenTideUntilWeek: 0, tierOneGrowth: [], ironSuppressedUntilDay: 0,
      exposedHeroOwner: null, spiedCastles: [],
    },
  };
}

function grandMusterArmy(faction: FactionId) {
  return makeArmy(FACTION_UNITS[faction].map((unitId) => ({
    unitId, count: Math.max(1, UNITS[unitId].growth * 2),
  })));
}

export function createGame(options: NewGameOptions): GameState {
  validateUnits();
  validateBuildings();
  validateFactions();
  validateHeroes();
  validateSkills();
  validateItems();
  validateArtifacts();
  validateOmens();
  validateSpells();
  validateBargains();
  validateBattleTiles();
  validateMapObjectRegistry();
  const mapId = options.mapId ?? 'border-marches';
  const difficulty = options.difficulty ?? 'normal';
  const map = mapId === 'crosstitch' ? createCrosstitch(options.seed)
    : mapId === 'crosstitch-kit' ? createCrosstitchKit(options.seed)
      : mapId === 'torn-sound' ? createTornSound(options.seed)
        : mapId === 'manywhere' ? createManywhere(options.seed)
          : mapId === 'grand-muster' ? createGrandMuster(options.seed)
            : mapId === 'crooked-crown' ? createCrookedCrown(options.seed)
        : createBorderMarches(options.seed);
  validateMap(map);
  const p1Faction = mapId === 'grand-muster' ? 'hearthguard'
    : options.p1Faction ?? 'hearthguard';
  const p2Faction = mapId === 'grand-muster' ? GRAND_MUSTER_ENEMY_CASTLE.faction
    : options.p2Faction ?? 'woundWrights';
  const playerCount = mapId === 'crosstitch' || mapId === 'crosstitch-kit'
    || mapId === 'crooked-crown'
    ? options.playerCount ?? 4 : mapId === 'manywhere' ? options.playerCount ?? 1 : 2;
  const ids: PlayerId[] = ['p1', 'p2', 'p3', 'p4'];
  const factions: Record<PlayerId, FactionId> = {
    p1: p1Faction, p2: p2Faction,
    p3: options.p3Faction ?? 'unfinished', p4: options.p4Faction ?? 'vespiary',
  };
  const positions = mapId === 'crosstitch' || mapId === 'crosstitch-kit'
    ? CROSSTITCH_CASTLE_POSITIONS : mapId === 'torn-sound'
      ? TORN_SOUND_CASTLE_POSITIONS : mapId === 'grand-muster'
        ? [GRAND_MUSTER_CASTLES[0].entrance, GRAND_MUSTER_ENEMY_CASTLE.entrance]
        : mapId === 'crooked-crown' ? [...CROOKED_CROWN_STARTS]
        : [{ x: 3, y: 10 }, { x: 24, y: 10 }];
  const startPositions = mapId === 'manywhere' ? MANYWHERE_CASTLE_POSITIONS : positions;
  const castles = mapId === 'grand-muster'
    ? [
      ...GRAND_MUSTER_CASTLES.map(({ faction, entrance }) => {
        const castle = makeCastle('p1', faction, options.seed, entrance, `muster-${faction}-castle`);
        castle.buildings = [
          'villageHall', 'tavern', 'dwelling1', 'dwelling2', 'dwelling3',
          'dwelling4', 'dwelling5', 'dwelling6',
        ];
        castle.available = FACTION_UNITS[faction].map((unitId) => UNITS[unitId].growth);
        return castle;
      }),
      makeCastle('p2', GRAND_MUSTER_ENEMY_CASTLE.faction, options.seed,
        GRAND_MUSTER_ENEMY_CASTLE.entrance, 'muster-distant-castle'),
    ]
    : ids.slice(0, playerCount).map((id, index) =>
      makeCastle(id, factions[id], options.seed, startPositions[index]));
  if (mapId === 'manywhere') for (const town of MANYWHERE_NEUTRAL_TOWNS) {
    const castle = makeCastle('neutral', town.faction, options.seed, town.entrance, town.id);
    castle.variant = town.variant;
    if (town.variant === 'hollowTown') {
      castle.flavor = 'The gates are open. The tables are set. Nobody minds.';
    }
    castle.vault = town.variant === 'oldSeat'
      ? { gold: 4_000, timber: 8, iron: 5, essence: 3 }
      : town.variant === 'hollowTown' ? { gold: 1_000, timber: 2, iron: 0, essence: 1 }
        : { gold: 2_000, timber: 4, iron: 2, essence: 1 };
    if (town.variant === 'freeTown') castle.buildings = ['villageHall', 'dwelling1', 'tavern'];
    if (town.variant === 'oldSeat') {
      castle.buildings = ['villageHall', 'townHall', 'dwelling1', 'dwelling2', 'dwelling3', 'dwelling4', 'tavern', 'walls'];
      castle.garrison = makeArmy([{ unitId: FACTION_UNITS[town.faction][3], count: 12 }]);
    } else if (town.variant === 'hollowTown') castle.garrison = emptyArmy();
    else castle.garrison = makeArmy([{ unitId: FACTION_UNITS[town.faction][1], count: 25 }]);
    castles.push(castle);
  }
  let rng = options.seed >>> 0;
  const controllers: Record<PlayerId, Player['controller']> = {
    p1: mapId === 'grand-muster' ? 'human' : options.p1,
    p2: mapId === 'grand-muster' ? 'dormant' : options.p2,
    p3: options.p3 ?? 'ai', p4: options.p4 ?? 'ai',
  };
  const players = {} as Record<PlayerId, Player>;
  for (const [index, id] of ids.entries()) {
    if (index >= playerCount) { players[id] = inactivePlayer(id, factions[id]); continue; }
    const playerCastle = mapId === 'grand-muster' && id === 'p2'
      ? castles[castles.length - 1] : castles[index];
    [players[id], rng] = makePlayer(
      id, controllers[id], factions[id], rng, castleEntrance(playerCastle),
    );
  }
  const { p1, p2, p3, p4 } = players;
  if (mapId === 'grand-muster') {
    p1.name = 'The Muster';
    p1.resources = { gold: 50_000, timber: 50, iron: 50, essence: 50 };
    p1.heroes[0].army = grandMusterArmy('hearthguard');
    p1.heroes[0].position.y += 1;
    for (const castle of castles.slice(1, GRAND_MUSTER_CASTLES.length)) {
      const definitionId = FACTION_HEROES[castle.faction][0];
      const entrance = castleEntrance(castle);
      const hero = makeHero('p1', castle.faction, definitionId, { x: entrance.x, y: entrance.y + 1 });
      hero.army = grandMusterArmy(castle.faction);
      p1.heroes.push(hero);
    }
    p1.activeHeroId = p1.heroes[0].id;
    p1.hero = p1.heroes[0];
    p2.name = 'The Distant Observer';
    p2.heroes.forEach((hero) => { hero.movement = 0; });
  }
  const difficultyRules = DIFFICULTY_MODIFIERS[difficulty];
  for (const guardian of map.objects.filter((object) => object.kind === 'guardian')) {
    guardian.army = guardian.army.map((stack) => ({
      ...stack, count: Math.max(1, Math.floor(stack.count * difficultyRules.guardianStrength)),
    }));
    guardian.originalArmy = guardian.army.map((stack) => ({ ...stack }));
  }
  for (const player of Object.values(players).filter((candidate) => candidate.active)) {
    const multiplier = player.controller === 'human'
      ? difficultyRules.humanStartingResources : 1;
    for (const resource of Object.keys(player.resources) as Array<keyof Resources>) {
      player.resources[resource] = Math.floor(player.resources[resource] * multiplier);
    }
  }
  p1.resources.gold += BASE_CASTLE_GOLD_INCOME;
  for (const player of Object.values(players).filter((candidate) => candidate.active)) {
    player.explored = revealForPlayer(
      [], map, player.heroes, castles.filter((castle) => castle.owner === player.id),
    );
  }
  let omen: GameState['omen'];
  let nextOmen: GameState['omen'];
  let omenRng = (options.seed ^ 0x6d2b79f5) >>> 0;
  [omen, omenRng] = rollOmen(omenRng);
  [nextOmen, omenRng] = rollOmen(omenRng);
  if (omen === 'plenty') {
    for (const castle of castles) {
      castle.available[0] = growthWithOmen(castle.available[0], omen);
    }
  }
  const announcement = omenAnnouncement(omen, 1);
  return {
    version: 4, seed: options.seed >>> 0, difficulty,
    setup: { ...options, difficulty, mapId }, rng,
    day: 1, week: 1, activePlayer: 'p1', phase: 'adventure',
    players: { p1, p2, p3, p4 }, castles, map, battle: null,
    pendingChoice: null, winner: null, replay: [],
    metrics: {
      battles: 0, casualties: { p1: 0, p2: 0, p3: 0, p4: 0, neutral: 0 },
      battleRounds: [], spellCasts: 0, battleOutcomes: [],
      playerTotals: Object.fromEntries(['p1', 'p2', 'p3', 'p4'].map((id) => [id, {
        damageDealt: 0, damageTaken: 0, spellsCast: 0, extraActions: 0, casualtyValue: 0,
      }])) as GameState['metrics']['playerTotals'],
    },
    magicDisabled: false,
    omen, nextOmen, omenRng,
    omenAnnouncement: announcement,
    eventLog: [`${announcement.title}: ${announcement.flavor}`],
    lastBattleRecovered: {},
    mapEffects: [], battleRecords: [],
    objectiveProgress: { p1: 0, p2: 0, p3: 0, p4: 0 }, objectiveClaims: {},
    objectiveLastDay: { p1: 0, p2: 0, p3: 0, p4: 0 },
    lastBattleStats: null,
    lastMessage: 'Day 1 — Player 1 begins.',
  };
}

export function incomeForPlayer(state: GameState, playerId: PlayerId): Resources {
  const income: Resources = { gold: 0, timber: 0, iron: 0, essence: 0 };
  if (state.players[playerId].controller === 'dormant') return income;
  for (const castle of state.castles.filter((item) => item.owner === playerId)) {
    income.gold += BASE_CASTLE_GOLD_INCOME
      + (buildingIsActive(castle, 'townHall') ? 500 : 0)
      + (buildingIsActive(castle, 'cityHall') ? 1000 : 0);
  }
  for (const object of state.map.objects) {
    if (object.kind === 'mine' && object.owner === playerId) {
      if ((object.suppressedUntilDay ?? 0) >= state.day) continue;
      const charterBonus = (ITEMS.overseersCharter.amount ?? 0) / 100;
      income[object.resource] += object.income * (object.chartered ? 1 + charterBonus : 1);
    }
    if (object.kind === 'richVein' && object.owner === playerId
        && object.flaggedOnDay !== null && !object.depleted) {
      const elapsed = state.day - object.flaggedOnDay;
      if (elapsed >= 1 && elapsed <= object.days) income.essence += object.income;
    }
    if ((state.day - 1) % DAYS_PER_WEEK === 0 && object.kind === 'watermill'
        && object.owner === playerId) income.gold += 500;
    if ((state.day - 1) % DAYS_PER_WEEK === 0 && object.kind === 'windmill'
        && object.owner === playerId) income[object.rareResource ?? 'essence'] += 2;
  }
  for (const hero of state.players[playerId].heroes.filter((candidate) => candidate.alive)) {
    income.gold += dailyGoldArtifactBonus(hero);
  }
  if (state.players[playerId].adventureEffects.ironSuppressedUntilDay >= state.day) {
    income.iron = 0;
  }
  const player = state.players[playerId];
  if (player.controller === 'dormant') {
    player.heroes.forEach((hero) => { hero.movement = 0; });
  }
  if (player.controller === 'ai') {
    const multiplier = DIFFICULTY_MODIFIERS[state.difficulty ?? 'normal'].aiIncome;
    for (const resource of Object.keys(income) as Array<keyof Resources>) {
      income[resource] = Math.floor(income[resource] * multiplier);
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
    const borrowedTime = hero.adventureEffects.borrowedTimePenaltyDay === state.day
      ? hero.adventureEffects.borrowedTimeMultiplier : 1;
    const sleeping = hero.adventureEffects.sleepEvery
      && state.day % hero.adventureEffects.sleepEvery === 0;
    const burdenMove = hasEquippedArtifact(hero, 'leadenCrown') ? 0.75 : 1;
    hero.movement = sleeping ? 0 : Math.round((HERO_MOVE_POINTS * (1 + logisticsRate(hero))
      + dailyMoveArtifactBonus(hero) + hero.logisticsCarry) * borrowedTime * burdenMove);
    if (player.controller === 'dormant') hero.movement = 0;
    if (state.map.objects.some((object) => object.kind === 'lighthouse'
        && object.owner === playerId)) hero.movement += 500;
    if (hero.adventureEffects.borrowedTimePenaltyDay === state.day) {
      hero.adventureEffects.borrowedTimePenaltyDay = null;
    }
    hero.logisticsCarry = 0;
    const inCastle = state.castles.some(
      (castle) => castle.owner === playerId
        && sameCoord(castleEntrance(castle), hero.position),
    );
    const attunement = skillRank(hero, 'attunement');
    const bonus = attunement === 1 ? SKILLS.attunement.values.rank1Regen
      : attunement === 2 ? SKILLS.attunement.values.rank2Regen
        : attunement === 3 ? SKILLS.attunement.values.rank3Regen : 0;
    const maxMana = effectivePrimaryStat(hero, 'knowledge') * 10;
    hero.mana = inCastle
      ? maxMana
      : Math.min(maxMana, hero.mana + FIELD_MANA_REGEN + bonus
        + dailyManaArtifactBonus(hero));
    const desiredSlots = consumableSlotCount(hero);
    while (hero.inventory.length < desiredSlots) hero.inventory.push(null);
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
    if (castle.owner === 'neutral') continue;
    const units = FACTION_UNITS[castle.faction];
    const ownerHeroes = state.players[castle.owner].heroes;
    const tierOneBonus = ownerHeroes.some((hero) =>
      artifactEffectTotal(hero, 'tier_one_growth') > 0) ? 1.5 : 1;
    const muster = buildingIsActive(castle, 'musterField') ? 1.5 : 1;
    const aiGrowth = state.players[castle.owner].controller === 'ai'
      ? DIFFICULTY_MODIFIERS[state.difficulty ?? 'normal'].aiGrowth : 1;
    const castleMultiplier = (tier: number) => aiGrowth * castle.growthEffects
      .filter((effect) => effect.expiresWeek >= state.week
        && (effect.tier === undefined || effect.tier === tier))
      .reduce((total, effect) => total * effect.multiplier, 1);
    const playerMultiplier = state.players[castle.owner].adventureEffects.tierOneGrowth
      .filter((effect) => effect.startWeek <= state.week && effect.endWeek >= state.week)
      .reduce((total, effect) => total * effect.multiplier, 1);
    if (buildingIsActive(castle, 'dwelling1')) {
      castle.available[0] += Math.floor(growthWithOmen(
        UNITS[units[0]].growth, state.omen,
      ) * tierOneBonus * muster * castleMultiplier(1) * playerMultiplier)
        + (buildingIsActive(castle, 'foundersVault') ? 6 : 0)
        + (buildingIsActive(castle, 'greatKraal')
          && UNITS[units[0]].abilities.includes('beast') ? 2 : 0);
    }
    if (buildingIsActive(castle, 'dwelling2')) {
      castle.available[1] += Math.floor(
        growthWithOmen(UNITS[units[1]].growth, state.omen) * castleMultiplier(2) * muster,
      );
      if (buildingIsActive(castle, 'greatKraal')
          && UNITS[units[1]].abilities.includes('beast')) castle.available[1] += 2;
    }
    for (const tier of [3, 4, 5, 6] as const) {
      if (buildingIsActive(castle, `dwelling${tier}` as BuildingId)) {
        castle.available[tier - 1] += Math.floor(growthWithOmen(
          UNITS[units[tier - 1]].growth, state.omen,
        ) * castleMultiplier(tier));
        if (buildingIsActive(castle, 'greatKraal')
            && UNITS[units[tier - 1]].abilities.includes('beast')) {
          castle.available[tier - 1] += 2;
        }
      }
    }
    if (buildingIsActive(castle, 'chapelOfCandles') && castle.accruedCandleWisps > 0) {
      castle.available[0] += castle.accruedCandleWisps;
      castle.accruedCandleWisps = 0;
    }
    for (const stack of castle.returningDefenders) {
      if (!stack) continue;
      const tier = UNITS[stack.unitId].tier;
      if (FACTION_UNITS[castle.faction][tier - 1] === stack.unitId) {
        castle.available[tier - 1] += stack.count;
      }
    }
    castle.returningDefenders = emptyArmy();
  }
}

function grantWeeklyProvisionerItems(state: GameState): void {
  const common = [
    'potionOfVigor', 'draughtOfIron', 'smellingSalts', 'waybread',
  ] as const;
  for (const hero of Object.values(state.players).flatMap((player) =>
    player.heroes.filter((candidate) =>
      candidate.alive && skillRank(candidate, 'provisioner') === 3))) {
    let index: number;
    [index, state.rng] = randomInt(state.rng, common.length);
    addItem(hero, { id: common[index] });
  }
}

export function growGuardians(state: GameState): void {
  for (const guardian of state.map.objects) {
    if (guardian.kind !== 'guardian' || guardian.static) continue;
    const original = guardian.originalArmy ?? guardian.army;
    guardian.originalArmy ??= original.map((stack) => ({ ...stack }));
    guardian.army.forEach((stack, index) => {
      const cap = Math.max(1, (original[index]?.count ?? stack.count) * GUARDIAN_GROWTH_CAP);
      const growth = Math.max(1, Math.floor(stack.count * GUARDIAN_WEEKLY_GROWTH));
      stack.count = Math.min(cap, stack.count + growth);
    });
  }
}

function produceFoundersVaultItems(state: GameState): void {
  if (state.week % 2 !== 0) return;
  const common = ['potionOfVigor', 'draughtOfIron', 'smellingSalts', 'haresHeel'] as const;
  for (const castle of state.castles.filter((candidate) =>
    candidate.owner !== 'neutral' && buildingIsActive(candidate, 'foundersVault'))) {
    if (castle.owner === 'neutral') continue;
    const hero = state.players[castle.owner].heroes.find((candidate) => candidate.alive);
    if (!hero) continue;
    let index: number;
    [index, state.rng] = randomInt(state.rng, common.length);
    if (addItem(hero, { id: common[index] })) {
      state.eventLog.push(`${castle.id}'s Founder's Vault produced an item.`);
    }
  }
}

export function endTurn(state: GameState): void {
  for (const hero of state.players[state.activePlayer].heroes) {
    hero.logisticsCarry = skillRank(hero, 'logistics') === 3
      ? Math.min(SKILLS.logistics.values.carry, hero.movement) : 0;
  }
  const activeIds = (['p1', 'p2', 'p3', 'p4'] as PlayerId[])
    .filter((id) => state.players[id].active);
  const current = activeIds.indexOf(state.activePlayer);
  const nextPlayer = activeIds[(current + 1) % activeIds.length];
  if (nextPlayer !== activeIds[0]) {
    startTurn(state, nextPlayer);
    return;
  }
  state.day += 1;
  state.mapEffects = state.mapEffects.filter((effect) =>
    effect.kind === 'resonance' || effect.expiresDay >= state.day);
  for (const hero of Object.values(state.players).flatMap((player) => player.heroes)) {
    for (const temporary of hero.adventureEffects.temporaryStacks.filter((entry) =>
      entry.departDay <= state.day)) {
      const stack = hero.army[temporary.slot];
      if (stack?.unitId === temporary.unitId) hero.army[temporary.slot] = null;
    }
    hero.adventureEffects.temporaryStacks = hero.adventureEffects.temporaryStacks
      .filter((entry) => entry.departDay > state.day);
  }
  for (const object of state.map.objects) {
    if (object.kind === 'richVein' && object.flaggedOnDay !== null
        && state.day - object.flaggedOnDay > object.days) object.depleted = true;
  }
  state.week = Math.floor((state.day - 1) / DAYS_PER_WEEK) + 1;
  const newWeek = (state.day - 1) % DAYS_PER_WEEK === 0;
  advanceCreativeObjects(state, newWeek);
  if (newWeek) {
    beginWeekOmen(state);
    resolveDebtEvent(state, { kind: 'week-start', week: state.week });
    replenishDwellings(state);
    growGuardians(state);
    refreshAllTaverns(state);
    refreshMarketScrolls(state);
    grantWeeklyProvisionerItems(state);
    produceFoundersVaultItems(state);
  }
  resolveDebtEvent(state, { kind: 'day-start', day: state.day });
  updateCastlelessCountdowns(state);
  checkVictory(state);
  if (state.phase === 'gameOver') return;
  startTurn(state, nextPlayer);
}
