import {
  CHEST_XP, DAYS_PER_WEEK, DIFFICULTY_MODIFIERS, GUARDIAN_GROWTH_CAP,
  GUARDIAN_WEEKLY_GROWTH, HERO_MOVE_POINTS, LEVEL_THRESHOLD,
} from '../../content/constants';
import {
  BASE_CASTLE_GOLD_INCOME, FIELD_MANA_REGEN,
  STARTING_RESOURCES,
} from '../../content/constants';
import { FACTIONS, validateFactions } from '../../content/factions';
import { FACTION_BUILDING_SLOTS, validateBuildings } from '../../content/buildings';
import { FACTION_HEROES, HEROES, validateHeroes } from '../../content/heroes';
import { validateSkills } from '../../content/skills';
import { ITEMS, validateItems } from '../../content/items';
import { ARTIFACTS, validateArtifacts } from '../../content/artifacts';
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
import {
  createSixfoldTrial, SIXFOLD_PLAYER_SETUP, SIXFOLD_RECRUIT_WEEKS,
} from '../../content/maps/sixfoldTrial';
import { validateMapObjectRegistry } from '../../content/mapObjectRegistry';
import { createTornSound, TORN_SOUND_CASTLE_POSITIONS } from '../../content/maps/tornSound';
import { FACTION_UNITS, UNITS, validateUnits } from '../../content/units';
import { validateSpells } from '../../content/spells';
import { validateBargains } from '../../content/bargains';
import { validateBattleTiles } from '../../content/battleTiles';
import { SCHOOL_SPELLS, SPELLS } from '../../content/spells';
import {
  emptyArmy, heroArmyCapacity, makeArmy, synchronizeHeroArmyCapacity,
} from '../army';
import {
  consumableSlotCount, dailyGoldArtifactBonus, dailyManaArtifactBonus,
  dailyMoveArtifactBonus, logisticsRate, maximumMana, skillRank,
} from '../heroBehaviors';
import {
  artifactEffectTotal, canPlayerAfford, effectivePrimaryStat, emptyArtifacts,
  equippedArtifactWithEffect, hasArtifactEffect, hasArtifactSetBonus, hasEquippedArtifact,
  markBurdenRemovalReady, payPlayer,
  resolveWeeklyArtifactInstances,
} from '../artifacts';
import { beginWeekOmen, growthWithOmen, omenAnnouncement, rollOmen } from '../omens';
import { resolveDebtEvent } from '../debts';
import { syncHeroView } from '../heroes';
import { sameCoord } from '../map/pathfinding';
import { revealForPlayer } from '../map/visibility';
import { castleEntrance, CITY_ENTRANCE, CITY_FOOTPRINT } from '../map/occupancy';
import { randomInt, shuffle } from '../rng';
import type {
  BuildingId, Castle, FactionId, GameState, Hero, NewGameOptions, Player, PlayerId,
  Resources, SpellId,
} from '../types';
import { PLAYER_IDS } from '../types';
import type { GameMapRepository } from '../mapRepository';
import { builtInMapRepository } from '../../content/maps/catalog';
import { checkVictory, updateCastlelessCountdowns } from './outcomes';
import { refreshAllTaverns } from './tavern';
import { addItem } from './items';
import { refreshMarketScrolls } from './marketplace';
import { advanceCreativeObjects } from './mapObjects';
import { buildingIsActive } from './buildingStatus';
import { dealCurrentMageGuild } from './guildDeals';
import { ensureAdventurePrimitiveHandlersRegistered } from './adventurePrimitives';
import { ensureCombatPrimitiveHandlersRegistered } from '../combat/primitives';

function makeHero(
  playerId: PlayerId,
  factionId: FactionId,
  definitionId: Hero['definitionId'],
  position: { x: number; y: number },
  campaignSeed = 0,
): Hero {
  const faction = FACTIONS[factionId];
  const definition = HEROES[definitionId];
  const knownSpells = startingSpellbook(definitionId, campaignSeed);
  const hero: Hero = {
    id: `${playerId}-${definition.id}`, definitionId, name: definition.name,
    specialtyId: definition.specialty.id, owner: playerId,
    faction: faction.id,
    position: { ...position },
    ...faction.heroStats,
    luck: faction.luck, moraleBonus: faction.moraleBonus,
    mana: faction.heroStats.knowledge * 10, movement: HERO_MOVE_POINTS,
    dailyMovementMaximum: HERO_MOVE_POINTS,
    level: 1, xp: 0, alive: true, defeated: false,
    knownSpells,
    upgradedSpells: [], spellManaReductions: {}, visitedShrines: [],
    shrineChoices: {}, skills: { ...definition.startingSkills }, pathMemory: [],
    inventory: Array(6).fill(null),
    artifacts: emptyArtifacts(), debts: [], logisticsCarry: 0,
    artifactState: {
      dayStartPosition: { ...position }, dailyUses: {}, weeklyUses: {}, marker: null,
      movementCarry: 0, waterStraitSteps: 0, consecutiveCityDays: 0,
      consecutiveCityId: null, compassTargetId: null, compassVisitedIds: [], goldSpentThisWeek: 0,
    },
    declaredResonance: null, attunementResonanceUsedDay: null,
    rehireMultiplier: 1,
    ritualistOmenChosen: false,
    draftBonusCards: 0, unstitchUsedWeek: 0, beastClaimedWeek: null,
    embarkedBoatId: null, tavernArmyRetained: false,
    spellUses: { daily: {}, weekly: {} },
    tacticianSlot: null,
    skillUses: { daily: {}, weekly: {}, game: {} },
    rehireBlockedUntilDay: 0,
    adventureEffects: {
      borrowedTimePenaltyDay: null, borrowedTimeMultiplier: 0,
      falseColors: null, noRetaliationBattles: 0, sleepEvery: null,
      temporaryStacks: [],
      nextBattleMeterBonus: 0, nextBattleLuckBonus: 0, timingBlessingUntilDay: 0,
      ignoredAggroDay: null,
      ignoreGuardianAggroThroughDay: 0,
      spareFaceUsedWeek: 0,
      terrainIgnore: undefined,
      movementDeniedThroughDay: 0, manaRegenDeniedThroughDay: 0,
      prebattleConditions: [],
    },
    army: emptyArmy(),
  };
  synchronizeHeroArmyCapacity(hero);
  return hero;
}

function makePlayer(
  id: PlayerId,
  controller: Player['controller'],
  factionId: FactionId,
  rngState: number,
  position: { x: number; y: number },
  campaignSeed: number,
): [Player, number] {
  let startIndex: number;
  let rng: number;
  [startIndex, rng] = randomInt(rngState, FACTION_HEROES[factionId].length);
  const definitions = FACTION_HEROES[factionId];
  const starting = makeHero(id, factionId, definitions[startIndex], position, campaignSeed);
  starting.army = makeArmy(FACTIONS[factionId].startingArmy, heroArmyCapacity(starting));
  starting.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(starting)));
  starting.dailyMovementMaximum = starting.movement;
  let pool = definitions.filter((_, index) => index !== startIndex)
    .map((definitionId) => makeHero(id, factionId, definitionId, position, campaignSeed));
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
      guardianIntel: {}, prebattleConditions: [],
    },
    spellUses: { daily: {}, weekly: {} },
    active: true,
    artifactState: { weeklyRefundGold: 0, goldSpentThisWeek: 0,
      weeklyRefundPercent: 0, priorBattlesByFaction: {} },
  };
  return [player, rng];
}

export function startingSpellbook(
  definitionId: Hero['definitionId'], campaignSeed: number,
): SpellId[] {
  const definition = HEROES[definitionId];
  const authored = [...definition.startingSpells];
  const required: SpellId[] = [];
  for (const school of FACTIONS[definition.faction].schools) {
    const authoredTierOne = authored.find((id) =>
      SPELLS[id].school === school && SPELLS[id].tier === 1);
    if (authoredTierOne) {
      required.push(authoredTierOne);
      continue;
    }
    const pool = SCHOOL_SPELLS(school).filter((id) => SPELLS[id].tier === 1)
      .sort((a, b) => a.localeCompare(b));
    if (!pool.length) throw new Error(`No tier-1 ${school} spell exists for ${definition.name}`);
    const hash = [...`${definition.id}:${school}`].reduce(
      (value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0,
      campaignSeed >>> 0,
    );
    required.push(pool[hash % pool.length]);
  }
  return [...authored, ...required].filter((spell, index, spells) =>
    spells.indexOf(spell) === index);
}

function guildDeck(
  owner: PlayerId | 'neutral', factionId: FactionId, seed: number, castleId: string,
): Castle['guildDeck'] {
  return [...dealCurrentMageGuild(factionId, seed, `${owner}:${castleId}`).flat];
}

export function neutralCityDefaultGarrison(factionId: FactionId) {
  return makeArmy(FACTION_UNITS[factionId].slice(0, 3).map((unitId) => ({
    unitId, count: UNITS[unitId].growth * 3,
  })));
}

function makeCastle(
  owner: PlayerId | 'neutral', factionId: FactionId, seed: number,
  entrancePosition: { x: number; y: number }, id = `${owner}-castle`,
): Castle {
  return {
    id, owner,
    faction: factionId,
    position: {
      x: entrancePosition.x - CITY_ENTRANCE.dx,
      y: entrancePosition.y - CITY_ENTRANCE.dy,
    },
    footprint: { ...CITY_FOOTPRINT }, entrance: { ...CITY_ENTRANCE },
    buildings: ['villageHall', 'dwelling1', 'tavern'], bannedBuildings: [],
    available: [UNITS[FACTION_UNITS[factionId][0]].growth,
      0, 0, 0, 0, 0],
    garrison: owner === 'neutral' ? neutralCityDefaultGarrison(factionId) : emptyArmy(),
    garrisonSource: owner === 'neutral' ? 'inherited' : 'explicit',
    builtOnDay: null,
    guildDeck: guildDeck(owner, factionId, seed, id),
    growthEffects: [], dormantBuildings: {},
    marketScroll: null, marketScrollWeek: 0,
    accruedCandleWisps: 0, returningDefenders: emptyArmy(),
    relocatedWeek: 0, bargainOfferWeek: 0,
    wardenHeroId: null,
  };
}

// Portable-map conversion uses the exact same canonical setup defaults as built-in campaigns.
export { makeHero as createInitialHero, makeCastle as createInitialCastle };

function inactivePlayer(id: PlayerId, faction: FactionId): Player {
  return {
    id, name: `Player ${id.slice(1)}`, faction, controller: 'ai', active: false,
    resources: { ...STARTING_RESOURCES }, heroes: [], activeHeroId: null, hero: null,
    tavernPool: [], tavernOffers: [], tavernOfferWeek: 1, castlelessDays: 0,
    explored: [], discoveredObjectKinds: [], adventureEffects: {
      censusUntilDay: 0, censusShowsMovement: false, guardianIntelUntilDay: 0,
      greenTideUntilWeek: 0, tierOneGrowth: [], ironSuppressedUntilDay: 0,
      exposedHeroOwner: null, spiedCastles: [],
      guardianIntel: {}, prebattleConditions: [],
    },
    spellUses: { daily: {}, weekly: {} },
    artifactState: { weeklyRefundGold: 0, goldSpentThisWeek: 0,
      weeklyRefundPercent: 0, priorBattlesByFaction: {} },
  };
}

function grandMusterArmy(faction: FactionId) {
  return makeArmy(FACTION_UNITS[faction].map((unitId) => ({
    unitId, count: Math.max(1, UNITS[unitId].growth * 2),
  })));
}

function sixfoldArmy(faction: FactionId) {
  return makeArmy(FACTION_UNITS[faction].map((unitId) => ({
    unitId, count: Math.max(1, UNITS[unitId].growth * SIXFOLD_RECRUIT_WEEKS),
  })));
}

const SIXFOLD_COMMON_BUILDINGS: BuildingId[] = [
  'villageHall', 'townHall', 'cityHall', 'tavern', 'marketplace',
  'walls', 'keep', 'mageGuild1', 'mageGuild2', 'mageGuild3',
  'dwelling1', 'dwelling2', 'dwelling3', 'dwelling4', 'dwelling5', 'dwelling6',
];

export function createGame(
  options: NewGameOptions,
  mapRepository: GameMapRepository = builtInMapRepository,
): GameState {
  // The registry is intentionally clearable in tests and tooling. Re-establish the canonical
  // singleton handlers at each game boundary so module-cache order cannot change validation.
  ensureAdventurePrimitiveHandlersRegistered();
  ensureCombatPrimitiveHandlersRegistered();
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
  const resolvedMap = mapRepository.resolve(mapId, options.seed);
  const map = resolvedMap.map;
  map.id = mapId;
  validateMap(map);
  const portableSetup = resolvedMap.setup;
  const portablePlayers = new Map(portableSetup?.players.map((player) => [player.id, player]));
  const p1Faction = portablePlayers.get('p1')?.faction ?? (mapId === 'grand-muster' ? 'hearthguard'
    : options.p1Faction ?? 'hearthguard');
  const p2Faction = portablePlayers.get('p2')?.faction ?? (mapId === 'grand-muster'
    ? GRAND_MUSTER_ENEMY_CASTLE.faction : options.p2Faction ?? 'woundWrights');
  const playerCount = portableSetup ? portableSetup.players.length
    : mapId === 'crosstitch' || mapId === 'crosstitch-kit'
    || mapId === 'crooked-crown'
    ? options.playerCount ?? 4 : mapId === 'sixfold-trial' ? 6
      : mapId === 'manywhere' ? options.playerCount ?? 1 : 2;
  const ids: PlayerId[] = [...PLAYER_IDS];
  const stateIds = playerCount > 4 ? ids : ids.slice(0, 4);
  const factions: Record<PlayerId, FactionId> = {
    p1: p1Faction, p2: p2Faction,
    p3: portablePlayers.get('p3')?.faction ?? options.p3Faction ?? 'unfinished',
    p4: portablePlayers.get('p4')?.faction ?? options.p4Faction ?? 'vespiary',
    p5: portablePlayers.get('p5')?.faction ?? options.p5Faction ?? 'hagwood',
    p6: portablePlayers.get('p6')?.faction ?? options.p6Faction ?? 'wildergrass',
  };
  const positions = mapId === 'crosstitch' || mapId === 'crosstitch-kit'
    ? CROSSTITCH_CASTLE_POSITIONS : mapId === 'torn-sound'
      ? TORN_SOUND_CASTLE_POSITIONS : mapId === 'grand-muster'
        ? [GRAND_MUSTER_CASTLES[0].entrance, GRAND_MUSTER_ENEMY_CASTLE.entrance]
        : mapId === 'crooked-crown' ? [...CROOKED_CROWN_STARTS]
          : mapId === 'sixfold-trial' ? SIXFOLD_PLAYER_SETUP.map((slot) => slot.entrance)
        : [{ x: 3, y: 10 }, { x: 24, y: 10 }];
  const startPositions = mapId === 'manywhere' ? MANYWHERE_CASTLE_POSITIONS : positions;
  const castles = portableSetup ? structuredClone(portableSetup.castles) : mapId === 'grand-muster'
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
    castle.garrisonSource = 'explicit';
    castles.push(castle);
  }
  let rng = options.seed >>> 0;
  const controllers: Record<PlayerId, Player['controller']> = {
    p1: portablePlayers.get('p1')?.controller ?? (mapId === 'grand-muster' ? 'human' : options.p1),
    p2: portablePlayers.get('p2')?.controller ?? (mapId === 'grand-muster' ? 'dormant' : options.p2),
    p3: portablePlayers.get('p3')?.controller ?? options.p3 ?? 'ai',
    p4: portablePlayers.get('p4')?.controller ?? options.p4 ?? 'ai',
    p5: portablePlayers.get('p5')?.controller ?? options.p5 ?? 'ai',
    p6: portablePlayers.get('p6')?.controller ?? options.p6 ?? 'ai',
  };
  const players = {} as Record<PlayerId, Player>;
  for (const [index, id] of stateIds.entries()) {
    if (index >= playerCount) { players[id] = inactivePlayer(id, factions[id]); continue; }
    const playerCastle = mapId === 'grand-muster' && id === 'p2'
      ? castles[castles.length - 1] : castles.find((castle) => castle.owner === id);
    const authoredHeroes = portableSetup?.heroes.filter((hero) => hero.owner === id) ?? [];
    const startPosition = authoredHeroes[0]?.position ?? (playerCastle
      ? castleEntrance(playerCastle) : { x: 0, y: 0 });
    [players[id], rng] = makePlayer(
      id, controllers[id], factions[id], rng, startPosition, options.seed,
    );
    if (portableSetup) {
      players[id].name = portablePlayers.get(id)?.name ?? `Player ${id.slice(1)}`;
      players[id].heroes = structuredClone(authoredHeroes);
      players[id].activeHeroId = players[id].heroes[0]?.id ?? null;
      players[id].hero = players[id].heroes[0] ?? null;
    }
  }
  const { p1, p2, p3, p4, p5, p6 } = players;
  if (!portableSetup && mapId === 'grand-muster') {
    p1.name = 'The Muster';
    p1.resources = { gold: 50_000, timber: 50, iron: 50, essence: 50 };
    p1.heroes[0].army = grandMusterArmy('hearthguard');
    p1.heroes[0].position.y += 1;
    for (const castle of castles.slice(1, GRAND_MUSTER_CASTLES.length)) {
      const definitionId = FACTION_HEROES[castle.faction][0];
      const entrance = castleEntrance(castle);
      const hero = makeHero('p1', castle.faction, definitionId,
        { x: entrance.x, y: entrance.y + 1 }, options.seed);
      hero.army = grandMusterArmy(castle.faction);
      p1.heroes.push(hero);
    }
    p1.activeHeroId = p1.heroes[0].id;
    p1.hero = p1.heroes[0];
    p2.name = 'The Distant Observer';
    p2.heroes.forEach((hero) => { hero.movement = 0; });
  }
  if (!portableSetup && mapId === 'sixfold-trial') {
    for (const slot of SIXFOLD_PLAYER_SETUP) {
      const player = players[slot.id];
      const castle = castles.find((candidate) => candidate.owner === slot.id)!;
      const definitionId = SIXFOLD_PLAYER_SETUP.find((candidate) =>
        candidate.faction === player.faction)?.heroDefinitionId ?? FACTION_HEROES[player.faction][0];
      const template = SIXFOLD_PLAYER_SETUP.find((candidate) =>
        candidate.faction === player.faction) ?? slot;
      const hero = makeHero(
        slot.id, player.faction, definitionId, castleEntrance(castle), options.seed,
      );
      hero.level = template.level;
      hero.xp = LEVEL_THRESHOLD(template.level + 1) - CHEST_XP;
      hero.attack += template.statBonus;
      hero.defense += template.statBonus;
      hero.spellPower += template.statBonus;
      hero.knowledge += template.statBonus;
      hero.skills = { ...template.skills };
      hero.knownSpells = [...new Set(FACTIONS[player.faction].schools.flatMap(SCHOOL_SPELLS))];
      hero.upgradedSpells = [...hero.knownSpells];
      hero.mana = effectivePrimaryStat(hero, 'knowledge')
        * (skillRank(hero, 'attunement') === 3 ? 12 : 10);
      hero.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero)));
      hero.army = sixfoldArmy(player.faction);
      player.heroes = [hero];
      player.activeHeroId = hero.id;
      player.hero = hero;
      player.name = `Trial Banner ${slot.id.slice(1)}`;
      player.resources = { gold: 75_000, timber: 75, iron: 75, essence: 75 };
      castle.buildings = [...SIXFOLD_COMMON_BUILDINGS, ...FACTION_BUILDING_SLOTS[player.faction]];
      castle.available = FACTION_UNITS[player.faction].map(() => 0);
      castle.guildDeck = [...hero.knownSpells];
    }
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
    setup: {
      ...options, difficulty, mapId,
      ...(portableSetup ? {
        playerCount: portableSetup.players.length as NewGameOptions['playerCount'],
        ...Object.fromEntries(portableSetup.players.flatMap((player) => [[player.id, player.controller],
          [`${player.id}Faction`, player.faction]])),
      } : {}),
    }, rng,
    day: 1, week: 1, activePlayer: 'p1', phase: 'adventure',
    players, castles, map, battle: null,
    pendingChoice: null, winner: null, replay: [],
    metrics: {
      battles: 0, casualties: Object.fromEntries(
        [...stateIds.map((id) => [id, 0] as const), ['neutral', 0]],
      ) as GameState['metrics']['casualties'],
      battleRounds: [], spellCasts: 0, battleOutcomes: [],
      playerTotals: Object.fromEntries(stateIds.map((id) => [id, {
        damageDealt: 0, damageTaken: 0, spellsCast: 0, extraActions: 0, casualtyValue: 0,
      }])) as GameState['metrics']['playerTotals'],
    },
    magicDisabled: false,
    omen, nextOmen, omenRng,
    omenAnnouncement: announcement,
    eventLog: [`${announcement.title}: ${announcement.flavor}`],
    lastBattleRecovered: {},
    mapEffects: [], battleRecords: [],
    objectiveProgress: Object.fromEntries(stateIds.map((id) => [id, 0])) as Record<PlayerId, number>,
    objectiveClaims: {},
    objectiveLastDay: Object.fromEntries(stateIds.map((id) => [id, 0])) as Record<PlayerId, number>,
    lastBattleStats: null,
    lastMessage: 'Day 1 — Player 1 begins.',
    guildReveal: null,
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
    if (object.kind === 'mine' && object.owner) {
      const redirect = object.productionRedirect;
      const recipient = redirect && (redirect.startsDay ?? state.day) <= state.day
        && redirect.throughDay >= state.day
        && redirect.originalOwner === object.owner ? redirect.recipient : object.owner;
      if (recipient !== playerId) continue;
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
  if (state.players[playerId].heroes.some((hero) => hero.alive
      && hasArtifactEffect(hero, 'income_multiplier'))) {
    for (const resource of Object.keys(income) as Array<keyof Resources>) income[resource] *= 2;
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
    const hasArmyTrait = (ability: import('../types').AbilityId) => hero.army.some((stack) =>
      stack && UNITS[stack.unitId].abilities.includes(ability));
    const borrowedTime = hero.adventureEffects.borrowedTimePenaltyDay === state.day
      ? hero.adventureEffects.borrowedTimeMultiplier : 1;
    const sleeping = hero.adventureEffects.sleepEvery
      && state.day % hero.adventureEffects.sleepEvery === 0;
    const burdenMove = hasArtifactEffect(hero, 'daily_move')
      ? Math.max(0, 1 + artifactEffectTotal(hero, 'daily_move', 'percent') / 100) : 1;
    hero.movement = sleeping ? 0 : Math.round((HERO_MOVE_POINTS * (1 + logisticsRate(hero))
      + dailyMoveArtifactBonus(hero) + hero.logisticsCarry + hero.artifactState.movementCarry
      + (hasArtifactSetBonus(hero, 'droversKit', 2) ? 200 : 0)) * borrowedTime * burdenMove);
    if (hasArmyTrait('beast_of_burden')) hero.movement += 150;
    if (state.map.objects.some((object) => object.kind === 'lighthouse'
        && object.owner === playerId)) hero.movement += 500;
    if ((hero.adventureEffects.movementDeniedThroughDay ?? 0) >= state.day) hero.movement = 0;
    if (player.controller === 'dormant') hero.movement = 0;
    hero.dailyMovementMaximum = hero.movement;
    hero.artifactState.dayStartPosition = { ...hero.position };
    hero.artifactState.waterStraitSteps = 0;
    if (hero.adventureEffects.borrowedTimePenaltyDay === state.day) {
      hero.adventureEffects.borrowedTimePenaltyDay = null;
    }
    hero.logisticsCarry = 0;
    hero.artifactState.movementCarry = 0;
    const inCastle = state.castles.some(
      (castle) => castle.owner === playerId
        && sameCoord(castleEntrance(castle), hero.position),
    );
    const attunement = skillRank(hero, 'attunement');
    const bonus = attunement === 1 ? SKILLS.attunement.values.rank1Regen
      : attunement === 2 ? SKILLS.attunement.values.rank2Regen
        : attunement === 3 ? SKILLS.attunement.values.rank3Regen : 0;
    const maxMana = maximumMana(hero, player);
    const manaDenied = (hero.adventureEffects.manaRegenDeniedThroughDay ?? 0) >= state.day;
    hero.mana = inCastle && !manaDenied
      ? maxMana
      : manaDenied ? hero.mana : Math.min(maxMana, hero.mana + FIELD_MANA_REGEN + bonus
        + dailyManaArtifactBonus(hero) + (hasArmyTrait('ley_touched') ? 1 : 0));
    if (hasArmyTrait('tithe_bearer')) player.resources.gold += 50;
    if (hasArtifactEffect(hero, 'least_resource_income')) {
      const resource = [...(['gold', 'timber', 'iron', 'essence'] as const)]
        .sort((a, b) => player.resources[a] - player.resources[b] || a.localeCompare(b))[0];
      player.resources[resource] += Math.max(1, artifactEffectTotal(hero, 'least_resource_income'));
    }
    const desiredSlots = consumableSlotCount(hero);
    while (hero.inventory.length < desiredSlots) hero.inventory.push(null);
  }
  syncHeroView(player);
  for (const hero of player.heroes.filter((candidate) => candidate.alive
    && candidate.army.some((stack) => stack
      && UNITS[stack.unitId].abilities.includes('carrion_sense')))) {
    const guardedRewards = carrionSenseRewards(state, hero);
    player.explored = [...new Set([...player.explored,
      ...guardedRewards.map((object) => `${object.position.x},${object.position.y}`)])].sort();
  }
  player.explored = revealForPlayer(
    player.explored, state.map, player.heroes,
    state.castles.filter((castle) => castle.owner === playerId),
  );
  state.lastMessage = `Day ${state.day} — ${player.name}'s turn.`;
}

export function carrionSenseRewards(state: GameState, hero: Hero) {
  return state.map.objects.filter((object) => (object.guardedBy?.length ?? 0) > 0
    && Math.max(Math.abs(object.position.x - hero.position.x),
      Math.abs(object.position.y - hero.position.y)) <= 5);
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
    const artifactTierMultiplier = (tier: number) => ownerHeroes.some((hero) =>
      hero.alive && equippedArtifactWithEffect(hero, 'dwelling_growth_choice')
        ?.chosenDwellingTier === tier) ? 1.5 : 1;
    if (buildingIsActive(castle, 'dwelling1')) {
      castle.available[0] += Math.floor(growthWithOmen(
        UNITS[units[0]].growth, state.omen,
      ) * tierOneBonus * muster * castleMultiplier(1) * playerMultiplier * artifactTierMultiplier(1))
        + (buildingIsActive(castle, 'foundersVault') ? 6 : 0)
        + (buildingIsActive(castle, 'greatKraal')
          && UNITS[units[0]].abilities.includes('beast') ? 2 : 0);
    }
    if (buildingIsActive(castle, 'dwelling2')) {
      castle.available[1] += Math.floor(
        growthWithOmen(UNITS[units[1]].growth, state.omen) * castleMultiplier(2) * muster
          * artifactTierMultiplier(2),
      );
      if (buildingIsActive(castle, 'greatKraal')
          && UNITS[units[1]].abilities.includes('beast')) castle.available[1] += 2;
    }
    for (const tier of [3, 4, 5, 6] as const) {
      if (buildingIsActive(castle, `dwelling${tier}` as BuildingId)) {
        castle.available[tier - 1] += Math.floor(growthWithOmen(
          UNITS[units[tier - 1]].growth, state.omen,
        ) * castleMultiplier(tier) * artifactTierMultiplier(tier));
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
    hero.artifactState.movementCarry = hasArtifactEffect(hero, 'movement_carry')
      ? Math.min(hero.dailyMovementMaximum, hero.movement) : 0;
  }
  const activeIds = ([...PLAYER_IDS] as PlayerId[])
    .filter((id) => state.players[id]?.active);
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
  for (const player of Object.values(state.players)) {
    if (newWeek) {
      player.resources.gold += player.artifactState.weeklyRefundGold;
      player.artifactState.weeklyRefundGold = 0;
      player.artifactState.goldSpentThisWeek = 0;
      player.artifactState.weeklyRefundPercent = 0;
      if (player.resources.gold < 0) player.resources.gold -= Math.ceil(-player.resources.gold * 0.25);
    }
  }
  updateBurdenCityStreaks(state);
  for (const player of Object.values(state.players)) for (const hero of player.heroes) {
    let hungrySlots = hero.army.flatMap((stack, slot) => stack
      && UNITS[stack.unitId].abilities.includes('hungry') ? [slot] : []);
    if (newWeek && hero.adventureEffects.hungryUnpaid) {
      hungrySlots.forEach((slot) => { hero.army[slot] = null; });
      hero.adventureEffects.hungryUnpaid = false;
      hungrySlots = [];
    }
    const upkeep = hungrySlots.length * 100;
    if (upkeep && canPlayerAfford(player, { gold: upkeep })) payPlayer(player, { gold: upkeep });
    else if (upkeep) hero.adventureEffects.hungryUnpaid = true;
  }
  advanceCreativeObjects(state, newWeek);
  if (newWeek) {
    resolveWeeklyArtifactInstances(state);
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

export function updateBurdenCityStreaks(state: GameState): void {
  for (const player of Object.values(state.players)) for (const hero of player.heroes) {
    const city = state.castles.find((castle) => castle.owner === hero.owner
      && sameCoord(castleEntrance(castle), hero.position));
    const movementBurden = equippedArtifactWithEffect(hero, 'daily_move');
    const contractActive = Boolean(movementBurden
      && ARTIFACTS[movementBurden.id].burdenRemovalTrigger === 'seven-city-days');
    if (!city || !contractActive) {
      hero.artifactState.consecutiveCityDays = 0;
      hero.artifactState.consecutiveCityId = null;
    } else if (hero.artifactState.consecutiveCityId === city.id) {
      hero.artifactState.consecutiveCityDays += 1;
    } else {
      hero.artifactState.consecutiveCityId = city.id;
      hero.artifactState.consecutiveCityDays = 1;
    }
    if (hero.artifactState.consecutiveCityDays >= 7) {
      markBurdenRemovalReady(hero, 'seven-city-days');
    }
  }
}
