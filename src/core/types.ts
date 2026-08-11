import type {
  AbilityId, ArtifactInstance, HeroArtifacts, ItemInstance, ItemSlot,
} from './contentTypes';
import type { PortableBuiltInMapId } from '../content/maps/authored';
import type { Action } from './actionTypes';
export type {
  AbilityId, ArtifactId, ArtifactInstance, ArtifactSlot, EquipmentSlotId,
  HeroArtifacts, ItemId, ItemInstance, ItemSlot,
} from './contentTypes';
export type { Action } from './actionTypes';

export const PLAYER_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const;
export type PlayerId = typeof PLAYER_IDS[number];
export const LEGACY_BUILT_IN_MAP_IDS = [
  'border-marches', 'crosstitch', 'crosstitch-kit', 'torn-sound',
  'manywhere', 'grand-muster', 'crooked-crown', 'sixfold-trial',
] as const;
export type LegacyBuiltInMapId = typeof LEGACY_BUILT_IN_MAP_IDS[number];
export type BuiltInMapId = LegacyBuiltInMapId | PortableBuiltInMapId;
/** Runtime validation further constrains every segment; this type keeps the namespace explicit. */
export type LocalMapId = `local:v1:${string}:r${number}:h${string}`;
export type MapId = BuiltInMapId | LocalMapId;
export type Difficulty = 'easy' | 'normal' | 'hard' | 'brutal';
export type FactionId =
  | 'hearthguard' | 'woundWrights' | 'unfinished'
  | 'vespiary' | 'hagwood' | 'wildergrass';
export type UnitId =
  | 'yeoman' | 'longbowman' | 'bannerman' | 'lanceKnight' | 'oriflammeWarden'
  | 'oriflammeWyvern'
  | 'tinSoldier' | 'hobbyKnight' | 'marionette' | 'stuffedSentinel'
  | 'woodenColossus' | 'reliquaryArk'
  | 'candleWisps' | 'couriers' | 'sentries' | 'boneChoir' | 'brides' | 'ferry'
  | 'larvalTide' | 'paperWaspLancers' | 'silkSpinners' | 'amberCarriers'
  | 'dragonflyCavalry' | 'halfWokenQueen'
  | 'crowChorus' | 'fencePostFamiliars' | 'besomRiders' | 'rusalka'
  | 'leshy' | 'walkingHut'
  | 'outriders' | 'drumCallers' | 'ashmaneWolves' | 'aurochsHerd'
  | 'grassSerpent' | 'thunderbird'
  | 'sleeper' | 'mirrorBound' | 'maskedDuelist' | 'hearthHound' | 'waxServitor'
  | 'sirens' | 'drownedCrew' | 'hullTurtle' | 'lanternAngler'
  | 'siegeWall' | 'siegeRam' | 'watchtower' | 'standingMirror' | 'makerWall';
export type ResourceId = 'gold' | 'timber' | 'iron' | 'essence';
export type TerrainId =
  | 'meadow' | 'deepwood' | 'mosswold' | 'ashsteppe' | 'barrowfield'
  | 'lacquerFlats' | 'hush' | 'mire' | 'mountain' | 'water';
export type TerrainSkinId =
  | 'default' | 'mossy' | 'granite' | 'snowcap' | 'mossgrown' | 'amber'
  | 'north' | 'south' | 'coastal';
export type LegacyTerrainId = 'grass' | 'forest' | 'barrow';
export type TerrainTile = TerrainId | LegacyTerrainId | {
  terrain: TerrainId; skin?: TerrainSkinId;
};
export type BuildingId =
  | 'villageHall' | 'townHall' | 'cityHall'
  | 'dwelling1' | 'dwelling2' | 'dwelling3' | 'dwelling4' | 'dwelling5' | 'dwelling6'
  | 'walls' | 'keep' | 'chapelOfTheBanner' | 'musterField' | 'guildWorkshop'
  | 'foundersVault' | 'chapelOfCandles' | 'lychgate' | 'rendery' | 'deepTunnels'
  | 'bargainPost' | 'henLeggedFence' | 'greatKraal' | 'pyreOfTheFallen'
  | 'mageGuild1' | 'mageGuild2' | 'mageGuild3' | 'tavern' | 'marketplace' | 'shipyard';
export type UnitTier = 1 | 2 | 3 | 4 | 5 | 6;
export type PrimaryStat = 'attack' | 'defense' | 'spellPower' | 'knowledge';
export type SecondarySkillId =
  | 'logistics' | 'scouting' | 'wayfaring' | 'diplomacy'
  | 'attunement' | 'command' | 'forager' | 'spellthief'
  | 'alchemist' | 'chronicler' | 'palimpsest' | 'twicetold'
  | 'curseEater' | 'ritualist' | 'peddler' | 'warden' | 'ransomer'
  | 'beastmaster' | 'vanguard' | 'provisioner' | 'siegewright';
export type SkillRank = 1 | 2 | 3;
export type HeroDefinitionId =
  | 'aldith' | 'corwin' | 'berta' | 'osric'
  | 'petra' | 'silas' | 'grigor' | 'mirele'
  | 'maren' | 'elgiva' | 'tobiah' | 'brotherHollis'
  | 'vess' | 'oszra' | 'kettl' | 'humm'
  | 'babaZima' | 'yagaOlen' | 'oldMarta' | 'vasilisa'
  | 'temir' | 'saiga' | 'anai' | 'bataar'
  | 'edwin' | 'maud' | 'ansel' | 'rivka' | 'cerys' | 'dunstan'
  | 'szet' | 'ollo' | 'agata' | 'bogdan' | 'qara' | 'erdem';
export type SpecialtyId =
  | 'steadyAim' | 'brightRally' | 'roadwise' | 'highBanner'
  | 'tinCaptain' | 'brightWither' | 'masterForager' | 'masterMender'
  | 'deepLastLight' | 'brightRemembrance' | 'watchfulRetaliation'
  | 'heavyUnfinishedBusiness' | 'nurturingBrood' | 'masterRenderer'
  | 'swiftPaperWasps' | 'brightBloom' | 'gentleDebts' | 'brightSour'
  | 'vengefulCrows' | 'farSweep' | 'dearerBloodPrice' | 'hungryPack'
  | 'brightGale' | 'unhinderedSkirmish'
  | 'kennelMuster' | 'brightTrial' | 'brightEscort' | 'swiftMarionettes'
  | 'doubleFerry' | 'deepDirge' | 'lastingResin' | 'greaterBroodCall'
  | 'diagonalFenceSlow' | 'loopholeBargains' | 'burningStormWake' | 'costlySurrender';
export type SpellSchool = 'rite' | 'craft' | 'grave' | 'wild';
export type BargainId =
  | 'firstHarvest' | 'borrowedLegion' | 'cuckoosDeal' | 'milkTeeth'
  | 'longNap' | 'neverByIron' | 'thirdChild' | 'whatWasPromised';
export type OmenId =
  | 'quiet' | 'embers' | 'veil' | 'plenty' | 'stillAir'
  | 'openRoad' | 'loudSky';
export type CounterId = 'burn' | 'chill' | 'hex' | 'bloom';
export type SpellId =
  | 'rally' | 'blessing' | 'standardOfDawn' | 'amplify' | 'sanctuary'
  | 'oathOfIron' | 'consecrate' | 'hymnOfTheHost' | 'trial'
  | 'forgeSpark' | 'ward' | 'reflect' | 'forgefire' | 'clockworkEscort'
  | 'wallOfTheMaker' | 'quicksilver' | 'unmake' | 'ironclad'
  | 'wither' | 'graveChill' | 'mournersVeil' | 'dirge' | 'lastCandle'
  | 'sour' | 'remembrance' | 'reckoning' | 'quiet'
  | 'beacon' | 'census' | 'feastDay' | 'clarion' | 'vigilOfTheHost'
  | 'oathbind' | 'waysideShrine'
  | 'gate' | 'saltTheVein' | 'falseColors' | 'clockworkCourier'
  | 'brittle' | 'standingMirror' | 'summonSkiff'
  | 'coldRoad' | 'borrowedTime' | 'paleProcession' | 'silenceThePassing'
  | 'theToll' | 'deathsLedger' | 'graveSpeech'
  | 'gale' | 'bloom' | 'overgrow' | 'thicket' | 'rains'
  | 'beastTongue' | 'stampedeCall' | 'storm' | 'greenway' | 'wildGrowth'
  | 'murmuration' | 'greenTide' | 'rootAndRuin' | 'fickleWeather'
  | 'shedSkin' | 'hedgerowMarch'
  | 'hourglassCrack' | 'borrowShape' | 'echo' | 'loyalUntoDeath';

export interface Coord { x: number; y: number }
export interface Resources { gold: number; timber: number; iron: number; essence: number }
export type ResourceCost = Partial<Resources>;
export interface ArmyStack { unitId: UnitId; count: number }
export type Army = Array<ArmyStack | null>;

export interface Hero {
  id: string;
  definitionId: HeroDefinitionId;
  name: string;
  specialtyId: SpecialtyId;
  owner: PlayerId;
  faction: FactionId;
  position: Coord;
  attack: number;
  defense: number;
  spellPower: number;
  knowledge: number;
  luck: number;
  moraleBonus: number;
  mana: number;
  movement: number;
  level: number;
  xp: number;
  army: Army;
  alive: boolean;
  knownSpells: SpellId[];
  upgradedSpells: SpellId[];
  visitedShrines: string[];
  shrineChoices: Record<string, number>;
  skills: Partial<Record<SecondarySkillId, SkillRank>>;
  pathMemory: Coord[];
  defeated: boolean;
  inventory: ItemSlot[];
  artifacts: HeroArtifacts;
  debts: DebtEntry[];
  logisticsCarry: number;
  declaredResonance: { day: number; school: SpellSchool } | null;
  attunementResonanceUsedDay: number | null;
  rehireMultiplier: number;
  ritualistOmenChosen: boolean;
  draftBonusCards: number;
  unstitchUsedWeek: number;
  beastClaimedWeek: number | null;
  embarkedBoatId: string | null;
  tavernArmyRetained: boolean;
  adventureEffects: HeroAdventureEffects;
}

export interface HeroAdventureEffects {
  borrowedTimePenaltyDay: number | null;
  borrowedTimeMultiplier: number;
  falseColors: { band: string; castDay: number } | null;
  noRetaliationBattles: number;
  sleepEvery: number | null;
  temporaryStacks: Array<{ unitId: UnitId; slot: number; departDay: number; takesSmallest: boolean }>;
  nextBattleMeterBonus: number;
  nextBattleLuckBonus: number;
  timingBlessingUntilDay: number;
  ignoredAggroDay: number | null;
  spareFaceUsedWeek: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  faction: FactionId;
  controller: 'human' | 'ai' | 'dormant';
  resources: Resources;
  heroes: Hero[];
  activeHeroId: string | null;
  /** Compatibility view of the selected hero. Core rules use heroes + activeHeroId. */
  hero: Hero | null;
  tavernPool: Hero[];
  tavernOffers: string[];
  tavernOfferWeek: number;
  castlelessDays: number;
  explored: string[];
  discoveredObjectKinds: MapObject['kind'][];
  adventureEffects: PlayerAdventureEffects;
  active: boolean;
}

export interface PlayerAdventureEffects {
  censusUntilDay: number;
  censusShowsMovement: boolean;
  guardianIntelUntilDay: number;
  greenTideUntilWeek: number;
  tierOneGrowth: Array<{ multiplier: number; startWeek: number; endWeek: number }>;
  ironSuppressedUntilDay: number;
  exposedHeroOwner: PlayerId | null;
  spiedCastles: string[];
}

export interface Castle {
  id: string;
  owner: PlayerId | 'neutral';
  faction: FactionId;
  position: Coord;
  footprint: { w: number; h: number };
  entrance: { dx: number; dy: number };
  buildings: BuildingId[];
  bannedBuildings: BuildingId[];
  available: number[];
  garrison: Army;
  /** Preserves the portable neutral-city omission boundary through runtime/editor adapters. */
  garrisonSource?: 'inherited' | 'explicit';
  builtOnDay: number | null;
  guildDeck: SpellId[];
  growthEffects: Array<{ id: string; multiplier: number; expiresWeek: number; tier?: UnitTier }>;
  dormantBuildings: Partial<Record<BuildingId, boolean>>;
  marketScroll: ItemInstance | null;
  marketScrollWeek: number;
  accruedCandleWisps: number;
  returningDefenders: Army;
  relocatedWeek: number;
  bargainOfferWeek: number;
  wardenHeroId: string | null;
  variant?: 'freeTown' | 'oldSeat' | 'hollowTown' | 'coastal';
  vault?: Resources;
  flavor?: string;
}

export interface Guardian {
  army: ArmyStack[];
  split?: boolean;
  drop?: ItemInstance;
  stoodAsideFor?: string[];
  static?: boolean;
}

export interface GuardianReward {
  gold?: number;
  timber?: number;
  iron?: number;
  essence?: number;
  items?: ItemInstance[];
  artifacts?: ArtifactInstance[];
  teachesSpell?: SpellId;
}

export type MapObject = {
  flavorHint?: string;
  footprint?: { w: number; h: number };
  entrance?: { dx: number; dy: number };
  guardedBy?: string[];
} & (
  {
    id: string; kind: 'mine'; position: Coord; resource: ResourceId; income: number;
    owner: PlayerId | null; cleared: boolean; chartered: boolean;
    suppressedUntilDay?: number; suppressionCaster?: PlayerId;
  }
  | { id: string; kind: 'pile'; position: Coord; resource: ResourceId; amount: number; collected: boolean }
  | { id: string; kind: 'chest'; position: Coord; cleared: boolean; collected: boolean }
  | {
    id: string; kind: 'shrine'; position: Coord; school: SpellSchool;
    teaches: SpellId; cleared: boolean; visitedBy: string[];
  }
  | { id: string; kind: 'item'; position: Coord; item: ItemInstance; collected: boolean }
  | {
    /** Lossless runtime carrier for one portable direct reward bundle. */
    id: string; kind: 'rewardPickup'; position: Coord;
    reward: GuardianReward; collected: boolean;
  }
  | {
    id: string; kind: 'richVein'; position: Coord; owner: PlayerId | null;
    flaggedOnDay: number | null; depleted: boolean; income: number; days: number;
  }
  | {
    id: string; kind: 'waystation'; position: Coord;
    visitedOnDay: Record<string, number>;
  }
  | {
    id: string; kind: 'lock'; position: Coord; name: string; tell: string;
    reward: GuardianReward; cleared: boolean;
  }
  | {
    id: string; kind: 'dwelling'; position: Coord; unitId: UnitId;
    available: number; lastGrowthWeek: number;
  }
  | {
    id: string; kind: 'tinkersCart'; position: Coord; route: Coord[];
    routeIndex: number; stock: ItemInstance | null; stockWeek: number;
  }
  | {
    id: string; kind: 'monastery'; position: Coord; firstVisitorId: string | null;
    blessings: Record<string, number>;
  }
  | {
    id: string; kind: 'gloamingRing'; position: Coord;
    deposit: (
      | { kind: 'item'; item: ItemInstance; heroId: string; dueWeek: number }
      | { kind: 'artifact'; artifact: ArtifactInstance; heroId: string; dueWeek: number }
    ) | null;
  }
  | {
    id: string; kind: 'storyteller'; position: Coord;
    visitedWeek: Record<string, number>;
  }
  | {
    id: string; kind: 'chrysalis'; position: Coord;
    visitedWeek: Record<string, number>;
  }
  | { id: string; kind: 'bridge'; position: Coord; completed: boolean; opens?: Coord[] }
  | { id: string; kind: 'hedgeSchool'; position: Coord; visitedBy: string[] }
  | { id: string; kind: 'reliquaryCairn'; position: Coord }
  | {
    id: string; kind: 'tollGate'; position: Coord;
    paidBy: string[]; cleared: boolean;
  }
  | { id: string; kind: 'omenStone'; position: Coord; visitedBy: string[] }
  | { id: string; kind: 'crone'; position: Coord; visitedWeek: Record<string, number> }
  | {
    id: string; kind: 'barrowField'; position: Coord; scroll: ItemInstance;
    collected: boolean;
  }
  | {
    id: string; kind: 'guardian'; position: Coord; army: ArmyStack[];
    split?: boolean; drop?: ItemInstance; stoodAsideFor?: string[];
    protects?: string; static?: boolean; originalArmy?: ArmyStack[];
  }
  | { id: string; kind: 'boat'; position: Coord; owner: PlayerId | null; occupiedBy: string | null }
  | { id: string; kind: 'manaSpring'; position: Coord; visitedWeek: Record<string, number> }
  | { id: string; kind: 'flotsam'; position: Coord; timber: number; gold: number; collected: boolean }
  | { id: string; kind: 'sealedCask'; position: Coord; collected: boolean }
  | {
    id: string; kind: 'castaway'; position: Coord; collected: boolean;
    item?: ItemInstance; story: string;
  }
  | { id: string; kind: 'messageBottle'; position: Coord; collected: boolean; rumour: string }
  | { id: string; kind: 'whirlpool'; position: Coord; pairedId: string }
  | {
    id: string; kind: 'shipwreck'; position: Coord; cleared: boolean;
    reward: GuardianReward;
  }
  | { id: string; kind: 'drownedBell'; position: Coord; visitedBy: string[] }
  | {
    id: string; kind: 'sirenRocks'; position: Coord; cleared: boolean;
    reward: GuardianReward; approachedBy?: string[];
  }
  | { id: string; kind: 'lighthouse'; position: Coord; owner: PlayerId | null }
  | {
    id: string; kind: 'watermill' | 'windmill' | 'tradingCamp'; position: Coord;
    owner: PlayerId | null; rareResource?: Exclude<ResourceId, 'gold'>;
  }
  | {
    id: string; kind: 'sparringStone'; position: Coord; visitedBy: string[];
  }
  | {
    id: string; kind: 'listeningStones' | 'longDraught' | 'grinningIdol';
    position: Coord; visitedBy: string[];
  }
  | {
    id: string; kind: 'hutOnTheHill'; position: Coord; visitedBy: string[];
    skill: SecondarySkillId; route?: Coord[]; routeIndex?: number;
  }
  | { id: string; kind: 'treeSecondThoughts'; position: Coord; visitedBy: string[] }
  | {
    id: string; kind: 'warmTable' | 'coldSpring' | 'idolOfSomebody' | 'wishingWell';
    position: Coord; visitedWeek: Record<string, number>;
  }
  | {
    id: string; kind: 'ruinedWatchtower' | 'oldBearsCave' | 'wolfHollow'
      | 'unquietYard' | 'moltingCourt' | 'spoolHoard';
    position: Coord; cleared: boolean; reward: GuardianReward; recruitUnitId?: UnitId;
  }
  | {
    id: string; kind: 'mercenaryCamp'; position: Coord; stockWeek: number;
    roster: ArmyStack[];
  }
  | {
    id: string; kind: 'wagonCamp'; position: Coord; stockWeek: number;
    stock: ItemInstance | null;
  }
  | { id: string; kind: 'titheBarn'; position: Coord; usedWeek: Record<PlayerId, number> }
  | {
    id: string; kind: 'skeletonGrass' | 'coldCampfire' | 'shepherdsLeanTo'
      | 'overgrownCart';
    position: Coord; searched: boolean; reward: GuardianReward;
  }
  | { id: string; kind: 'patientStone'; position: Coord; cacheId: string; revealedBy: string[] }
  | {
    id: string; kind: 'cache'; position: Coord; hidden: boolean;
    dug: boolean; reward: GuardianReward;
  }
  | {
    id: string; kind: 'obstacle'; position: Coord; prop: string; anomaly?: boolean;
  });

export type VictoryCondition =
  | { type: 'conquest'; flavor: string; mechanics: string }
  | { type: 'hold'; objectId: string; days: number; flavor: string; mechanics: string }
  | { type: 'assemble'; setId: string; flavor: string; mechanics: string }
  | { type: 'slay'; objectId: string; flavor: string; mechanics: string }
  | { type: 'none'; flavor: string; mechanics: string };

export interface GameMap {
  id: MapId;
  name: string;
  width: number;
  height: number;
  seed?: number;
  terrain: TerrainTile[][];
  objects: MapObject[];
  seams?: Coord[];
  roads?: Coord[];
  victory: VictoryCondition;
  defeat?: VictoryCondition;
}

export type BattleSide = 'attacker' | 'defender';
export interface BattleStack {
  id: string;
  side: BattleSide;
  slot: number;
  unitId: UnitId;
  count: number;
  topHp: number;
  hpOverride?: number;
  position: Coord;
  shots: number;
  morale: number;
  retaliated: boolean;
  defended: boolean;
  waited: boolean;
  bonusActions: number;
  attacksMade: number;
  movedHexes: number;
  overwindPrimed: boolean;
  overwindUsed: boolean;
  skipRound: number | null;
  summoned: boolean;
  counters: Record<CounterId, number>;
  effects: TimedEffect[];
  roundSpeedBonus?: number;
  artifactSpeedBonus?: number;
  specialtySpeedBonus?: number;
  terrainSpeedBonus?: number;
  actsFirst?: boolean;
  meterThreshold?: number;
  abilityUses?: Partial<Record<AbilityId, number>>;
  countAtTurnStart?: number;
  lastAttackOrigin?: Coord;
  postAttackMovePoints?: number;
  temporaryAbilities?: AbilityId[];
  retaliationsMade?: number;
  doubleNextAttack?: boolean;
  damageDealt?: number;
  damageTaken?: number;
  extraActionsTaken?: number;
}

export interface TimedEffect {
  id: string;
  spellId: SpellId;
  duration: number;
  magnitude: number;
  beneficial: boolean;
  sourceSide: BattleSide;
}

export interface BattleEnchantment {
  id: string;
  spellId: SpellId;
  side: BattleSide;
  multiplier: number;
  upgraded: boolean;
  duration?: number;
}

export interface BattleHero {
  id: string;
  level?: number;
  withdrawalGold?: number;
  faction: FactionId;
  definitionId: HeroDefinitionId;
  specialtyId: SpecialtyId;
  attack: number;
  defense: number;
  luck: number;
  moraleBonus: number;
  spellPower: number;
  mana: number;
  knownSpells: SpellId[];
  upgradedSpells: SpellId[];
  skills: Partial<Record<SecondarySkillId, SkillRank>>;
  inventory: ItemSlot[];
  artifacts: HeroArtifacts;
  debts: DebtEntry[];
}

export interface BattleContext {
  kind: 'guardian' | 'castle' | 'hero';
  targetId: string;
  destination: Coord;
  attackerHeroId: string;
  defenderHeroId?: string;
  defenderPlayerId?: PlayerId;
  remoteDefenderHeroId?: string;
  /** A deliberate guardian attack completes onto this tile only after victory. */
  completeMoveTo?: Coord;
  battlefield?: 'land' | 'sea' | 'mire';
  terrain?: TerrainId;
  onSeam?: boolean;
}

export interface BattleState {
  round: number;
  stacks: BattleStack[];
  obstacles: Coord[];
  order: string[];
  waiting: string[];
  currentStackId: string | null;
  attackerHero: BattleHero;
  defenderHero: BattleHero | null;
  defenderWalls: boolean;
  context: BattleContext;
  log: string[];
  casualties: Record<BattleSide, Partial<Record<UnitId, number>>>;
  initialCounts: Record<string, number>;
  recovered: Record<BattleSide, Partial<Record<UnitId, number>>>;
  enchantments: Record<BattleSide, BattleEnchantment[]>;
  castRound: Record<BattleSide, number>;
  sideAbilities: Record<BattleSide, AbilityId[]>;
  resonance: SpellSchool | null;
  terrainResonances: SpellSchool[];
  battlefieldTemplate: string;
  shallowHexes: Coord[];
  obstacleProps: Array<{ position: Coord; footprint: { w: number; h: number }; kind: string }>;
  chosenResonance: Record<BattleSide, SpellSchool | null>;
  omen: OmenId;
  destroyedStacks: number;
  extraActions: Record<BattleSide, number>;
  tiles: BattleTile[];
  spellCasts: number;
  lastSpellCast: { spellId: SpellId; plus: boolean; manaSpent: number } | null;
  spellsCastAgainst: Record<BattleSide, SpellId[]>;
  itemUses: Record<BattleSide, number>;
  itemFreeActUsed: Record<BattleSide, boolean>;
  itemPreserved: Record<BattleSide, boolean>;
  twisterFreeUsed: Record<BattleSide, boolean>;
  twisterActSaved: Record<BattleSide, boolean>;
  vanguardStack: Record<BattleSide, string | null>;
  firstSpellTaxPaid: Record<BattleSide, boolean>;
  ironNailSpent: Record<BattleSide, boolean>;
  counterRedirectTarget: Record<BattleSide, string | null>;
  counterRedirectUsed: Record<BattleSide, boolean>;
  sealedEnchantments: string[];
  pendingFreeMove: {
    side: BattleSide; sourceId: string; targetId?: string;
    anywhere?: boolean; label?: string;
  } | null;
  retaliationSuppressed: Record<BattleSide, boolean>;
  deathTriggerMultiplier: Record<BattleSide, number>;
  recentDestructionScale: Record<BattleSide, number>;
  bloodPriceBonus: Record<BattleSide, number>;
  timingSpeedBonus: Record<BattleSide, number>;
  doubleCastUsedRound: Record<BattleSide, number>;
  mirrorArtifactUsed: Record<BattleSide, boolean>;
  longestCandleUsed: Record<BattleSide, boolean>;
  longestCandlePending: Record<BattleSide, string | null>;
  lastToyUsed: Record<BattleSide, boolean>;
  clapperUsed: Record<BattleSide, boolean>;
  hornUsed: Record<BattleSide, boolean>;
  defenderKeep: boolean;
  spellCastsBySide: Record<BattleSide, number>;
  withdrawal: { side: BattleSide; kind: 'retreat' | 'surrender'; cost: number } | null;
  winner: BattleSide | null;
}

export type BattleTileTypeId = 'wall' | 'resin' | 'thicket' | 'undergrowth' | 'mirror' | 'test';
export type BattleTileHookStage =
  | 'movement-query' | 'on-enter' | 'on-turn-start' | 'on-turn-end' | 'turn-advance';
export interface BattleTile {
  id: string;
  type: BattleTileTypeId;
  position: Coord;
  duration: number;
  sourceSide: BattleSide;
  upgraded: boolean;
  createdRound: number;
}

export type DebtTrigger =
  | { kind: 'day-start'; dueDay: number }
  | { kind: 'week-start'; dueWeek: number }
  | { kind: 'battle-complete'; dueBattle: number }
  | { kind: 'level-up'; dueLevel: number };
export interface DebtEntry {
  id: string;
  name: string;
  description: string;
  trigger: DebtTrigger;
  handlerTag: string;
  remainingTriggers: number;
  interval?: number;
  data?: Record<string, string | number | boolean>;
}

export interface OmenAnnouncement {
  week: number;
  omen: OmenId;
  title: string;
  flavor: string;
}

export type LevelChoice = PrimaryStat | SecondarySkillId | 'inscribe' | 'bargain';
export type PendingChoice =
  | {
    kind: 'siteStat'; objectId: string; playerId: PlayerId; heroId: string;
    options: Array<'attack' | 'defense'>;
  }
  | {
    kind: 'chest'; objectId: string; playerId: PlayerId; heroId: string;
    item: ItemInstance;
    artifact?: ArtifactInstance;
  }
  | {
    kind: 'level'; playerId: PlayerId; heroId: string; options: LevelChoice[];
    canSkip: boolean; canReroll: boolean; source?: 'levelUp' | 'hedgeSchool';
  }
  | {
    kind: 'shrine'; objectId: string; playerId: PlayerId; heroId: string;
    options: SpellId[]; choicesRemaining: number;
  }
  | { kind: 'inscribe'; playerId: PlayerId; heroId: string; options: SpellId[] }
  | {
    kind: 'diplomacy'; objectId: string; playerId: PlayerId; heroId: string;
    disbandCost: number; recruitCost: number | null; canStandAside: boolean;
    completeMoveTo?: Coord;
  }
  | {
    kind: 'spellthief'; playerId: PlayerId; heroId: string;
    options: SpellId[]; upgradeOptions: SpellId[];
  }
  | {
    kind: 'palimpsest'; playerId: PlayerId; heroId: string; options: SpellId[];
  }
  | {
    kind: 'bargain'; playerId: PlayerId; heroId: string; options: BargainId[];
    source: 'level' | 'post' | 'crone';
  }
  | {
    kind: 'toll'; playerId: PlayerId; heroId: string; objectId: string;
    cost: number;
  }
  | { kind: 'siren'; playerId: PlayerId; heroId: string; objectId: string };

export type ArmyHolder =
  | { kind: 'hero'; id: string }
  | { kind: 'garrison'; id: string };

export interface GameState {
  version: 4;
  seed: number;
  difficulty: Difficulty;
  setup: NewGameOptions;
  rng: number;
  day: number;
  week: number;
  activePlayer: PlayerId;
  phase: 'adventure' | 'combat' | 'gameOver';
  players: Record<PlayerId, Player>;
  castles: Castle[];
  map: GameMap;
  battle: BattleState | null;
  pendingChoice: PendingChoice | null;
  winner: PlayerId | null;
  replay: Action[];
  metrics: {
    battles: number;
    casualties: Record<PlayerId | 'neutral', number>;
    battleRounds: number[];
    spellCasts: number;
    battleOutcomes: Array<{ targetId: string; winner: BattleSide }>;
    playerTotals: Record<PlayerId, {
      damageDealt: number; damageTaken: number; spellsCast: number;
      extraActions: number; casualtyValue: number;
    }>;
  };
  magicDisabled: boolean;
  omen: OmenId;
  nextOmen: OmenId;
  omenRng: number;
  omenAnnouncement: OmenAnnouncement;
  eventLog: string[];
  lastMessage: string;
  lastBattleRecovered: Partial<Record<UnitId, number>>;
  mapEffects: MapEffect[];
  battleRecords: BattleRecord[];
  objectiveProgress: Record<PlayerId, number>;
  objectiveLastDay: Record<PlayerId, number>;
  objectiveClaims: Record<string, PlayerId>;
  lastBattleStats: BattleStatistics | null;
}

export type MapEffect =
  | {
    id: string; kind: 'resonance'; position: Coord; school: SpellSchool;
    owner: PlayerId; expiresAfterBattle: boolean;
  }
  | {
    id: string; kind: 'passage'; entrances: [Coord, Coord]; owner: PlayerId;
    expiresDay: number;
  }
  | {
    id: string; kind: 'thicket'; positions: Coord[]; owner: PlayerId;
    expiresDay: number;
  };

export interface BattleRecord {
  day: number;
  position: Coord;
  casualties: number;
  spells: SpellId[];
  winner: BattleSide;
  summary: string;
  statistics?: BattleStatistics;
}

export interface BattleStatistics {
  stacks: Array<{
    id: string; unitId: UnitId; side: BattleSide;
    damageDealt: number; damageTaken: number; extraActions: number;
  }>;
  spellsCast: Record<BattleSide, number>;
  casualtyValue: Record<BattleSide, number>;
}

export interface NewGameOptions {
  seed: number;
  p1: 'human' | 'ai' | 'dormant';
  p2: 'human' | 'ai' | 'dormant';
  p1Faction?: FactionId;
  p2Faction?: FactionId;
  mapId?: MapId;
  playerCount?: 1 | 2 | 3 | 4 | 5 | 6;
  p3?: 'human' | 'ai' | 'dormant';
  p4?: 'human' | 'ai' | 'dormant';
  p5?: 'human' | 'ai' | 'dormant';
  p6?: 'human' | 'ai' | 'dormant';
  p3Faction?: FactionId;
  p4Faction?: FactionId;
  p5Faction?: FactionId;
  p6Faction?: FactionId;
  difficulty?: Difficulty;
}
