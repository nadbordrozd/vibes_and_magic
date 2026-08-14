import type {
  AbilityId, ArtifactId, ArtifactInstance, HeroArtifacts, ItemId, ItemInstance, ItemSlot,
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
  | 'seamMoth' | 'chalkWight' | 'emberToad' | 'glassHound' | 'tallyman'
  | 'lanternBearer' | 'boneOrchard' | 'stitchOx' | 'nineMouthedWell'
  | 'kilnDrake' | 'whistlingNan' | 'unbaptized' | 'bellfounder'
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
  | 'mageGuild1' | 'mageGuild2' | 'mageGuild3' | 'mageGuild4' | 'mageGuild5'
  | 'tavern' | 'marketplace' | 'shipyard';
export type UnitTier = 1 | 2 | 3 | 4 | 5 | 6;
export type PrimaryStat = 'attack' | 'defense' | 'spellPower' | 'knowledge';
export type SecondarySkillId =
  | 'logistics' | 'scouting' | 'wayfaring' | 'diplomacy'
  | 'attunement' | 'command' | 'forager' | 'spellthief'
  | 'alchemist' | 'chronicler' | 'palimpsest' | 'twicetold'
  | 'curseEater' | 'ritualist' | 'peddler' | 'warden' | 'ransomer'
  | 'beastmaster' | 'vanguard' | 'provisioner' | 'siegewright'
  | 'evoker' | 'tallykeeper' | 'reliquarian' | 'tactician' | 'reaper'
  | 'quartermaster' | 'beguiler' | 'loremaster' | 'duelist';
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
  | 'hourglassCrack' | 'borrowShape' | 'echo' | 'loyalUntoDeath'
  | 'kindle' | 'sunlance' | 'steadyHands' | 'wellspring' | 'secondWind'
  | 'litanyOfDawn' | 'holdTheLine' | 'consecratedGround' | 'reprise'
  | 'rivet' | 'whetstone' | 'shrapnel' | 'ammunitionCart' | 'detonate'
  | 'clockworkDouble' | 'blink' | 'overclock' | 'dimensionDoor'
  | 'pinchOfAsh' | 'tithe' | 'grudge' | 'yoke' | 'graveBargain' | 'puppetStrings'
  | 'nettle' | 'bramblelash' | 'wildcall' | 'sapAndSinew' | 'verdantSurge'
  | 'theTurningYear' | 'fly'
  | 'scrying' | 'bellBookAndCandle' | 'processionOfLamps' | 'dayspring' | 'theLongOath'
  | 'prospect' | 'counterweight' | 'bulwark' | 'theUnmakingEngine' | 'mirrorHall'
  | 'secondGrave' | 'ashenPall' | 'theLedgerBalanced' | 'ossuary' | 'stealAway'
  | 'theLongSilence' | 'harvest' | 'theDebtCalled'
  | 'beastSense' | 'illWind' | 'rootTheSky' | 'beastSovereign' | 'windShear'
  | 'theLongGreen' | 'theWeatherItself';

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
  dailyMovementMaximum: number;
  level: number;
  xp: number;
  army: Army;
  alive: boolean;
  knownSpells: SpellId[];
  upgradedSpells: SpellId[];
  spellManaReductions: Partial<Record<SpellId, number>>;
  visitedShrines: string[];
  shrineChoices: Record<string, number>;
  skills: Partial<Record<SecondarySkillId, SkillRank>>;
  pathMemory: Coord[];
  defeated: boolean;
  inventory: ItemSlot[];
  artifacts: HeroArtifacts;
  removableBurdens?: ArtifactId[];
  artifactState: HeroArtifactState;
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
  spellUses: SpellUseLedger;
  adventureEffects: HeroAdventureEffects;
  tacticianSlot: number | null;
  skillUses: {
    daily: Partial<Record<SecondarySkillId, number>>;
    weekly: Partial<Record<SecondarySkillId, number>>;
    game: Partial<Record<SecondarySkillId, boolean>>;
  };
  rehireBlockedUntilDay: number;
}

export interface HeroArtifactState {
  dayStartPosition: Coord;
  dailyUses: Partial<Record<import('../content/v2/schema').V2ArtifactEffectTag, number>>;
  weeklyUses: Partial<Record<import('../content/v2/schema').V2ArtifactEffectTag, number>>;
  marker: Coord | null;
  movementCarry: number;
  waterStraitSteps: number;
  consecutiveCityDays: number;
  consecutiveCityId: string | null;
  compassTargetId: string | null;
  compassVisitedIds: string[];
  goldSpentThisWeek: number;
}

export interface SpellUseLedger {
  /** Last day/week used by spell ID; absence means never used. */
  daily: Partial<Record<SpellId, number>>;
  weekly: Partial<Record<SpellId, number>>;
  /** Per-day counts exist only for printed multi-use daily gates such as Upgraded Dimension Door. */
  dailyCounts?: Partial<Record<SpellId, { day: number; count: number }>>;
}

export interface HeroAdventureEffects {
  borrowedTimePenaltyDay: number | null;
  borrowedTimeMultiplier: number;
  falseColors: { band: string; castDay: number; detersAttack?: boolean } | null;
  noRetaliationBattles: number;
  sleepEvery: number | null;
  temporaryStacks: Array<{ unitId: UnitId; slot: number; departDay: number; takesSmallest: boolean }>;
  nextBattleMeterBonus: number;
  nextBattleLuckBonus: number;
  timingBlessingUntilDay: number;
  ignoredAggroDay: number | null;
  /** Printed all-aggro exemption from Nightjar Feather, bounded to one campaign day. */
  ignoreGuardianAggroThroughDay?: number;
  spareFaceUsedWeek: number;
  hungryUnpaid?: boolean;
  terrainIgnore?: {
    day: number; movementCost: number;
    domains: Array<'mountain' | 'water'>; ignoreGuardianAggro: boolean;
  };
  movementDeniedThroughDay?: number;
  manaRegenDeniedThroughDay?: number;
  prebattleConditions?: AdventurePrebattleCondition[];
  prospectDoublePileWeek?: number;
  beastGuardianIgnore?: { throughDay: number; guardianIds: string[] };
}

export interface AdventurePrebattleCondition {
  id: string;
  expiresWeek: number;
  remainingBattles: number;
  counters?: Partial<Record<CounterId, number>>;
  rangedShotsMultiplier?: number;
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
  spellUses: SpellUseLedger;
  active: boolean;
  artifactState: {
    weeklyRefundGold: number;
    goldSpentThisWeek: number;
    weeklyRefundPercent: number;
    priorBattlesByFaction: Partial<Record<string, number>>;
  };
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
  /** Guardian ID to last day of exact-count-and-ability visibility. */
  guardianIntel?: Record<string, number>;
  guardianRewardIntel?: Record<string, number>;
  beastGuardianIgnore?: { throughDay: number; guardianIds: string[] };
  prebattleConditions?: AdventurePrebattleCondition[];
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
    productionRedirect?: {
      recipient: PlayerId; originalOwner: PlayerId; startsDay?: number;
      throughDay: number; hidden: boolean;
    };
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
  | {
    id: string; kind: 'reliquaryCairn'; position: Coord;
    tomeSpellId?: SpellId; tomeClaimed?: boolean;
  }
  | {
    id: string; kind: 'stacks' | 'wildShrine'; position: Coord;
    visitedBy: string[];
  }
  | {
    id: string; kind: 'reliquaryOfPages'; position: Coord;
    claimed: boolean; tomeSpellId: SpellId;
  }
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
  counterSources?: Partial<Record<CounterId, BattleSide>>;
  counterDecayDelayed?: Partial<Record<CounterId, boolean>>;
  effects: TimedEffect[];
  roundSpeedBonus?: number;
  /** Battle-duration summon modifier; unlike roundSpeedBonus this is not reset by round setup. */
  summonSpeedBonus?: number;
  artifactSpeedBonus?: number;
  /** Battle-long company stats inherited through a generic artifact death trigger. */
  artifactAttackBonus?: number;
  artifactDefenseBonus?: number;
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
  /** Generic docs-60 control/copy/action state. All fields are replay/save data. */
  originalSide?: BattleSide;
  controlExpiresRound?: number;
  controlledOnce?: boolean;
  damageLink?: { targetId: string; share: number; expiresRound: number; protected?: boolean };
  controlRetainsEffects?: boolean;
  controlSnapshot?: {
    counters: Record<CounterId, number>;
    counterSources: Partial<Record<CounterId, BattleSide>>;
    counterDecayDelayed: Partial<Record<CounterId, boolean>>;
    /** IDs present before control; Standard keeps surviving originals and drops later additions. */
    effects: TimedEffect[];
    damageLinkTargetId?: string;
  };
  stunnedActions?: number;
  grantedActionsThisRound?: number;
  lastNormalActionRound?: number;
  /** Spell-specific combat modifiers remain explicit replay state, never hidden closures. */
  destroyedCompanyForSides?: BattleSide[];
  cloneOf?: string;
  copiedAbilityIds?: AbilityId[];
  destructionEvents?: number;
  claimedDestructionSaveEvent?: number;
  /** The most recent round this original company reached zero, for bounded same-round recursion. */
  destroyedRound?: number;
  /** Knack-only round-scoped Attack rider; reset with the other round modifiers. */
  knackAttackBonus?: number;
  burrowReturnRound?: number;
}

export interface TimedEffect {
  id: string;
  spellId: SpellId;
  duration: number;
  magnitude: number;
  beneficial: boolean;
  sourceSide: BattleSide;
  /** Optional absolute round expiry for effects whose printed timing is battlefield-wide. */
  expiresRound?: number;
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
  /** Effective cap captured at battle setup so every combat mana gain can clamp deterministically. */
  manaMaximum?: number;
  knownSpells: SpellId[];
  /** Nearby-hero spell loans fixed at the serialized battle boundary. */
  borrowedSpellIds?: SpellId[];
  upgradedSpells: SpellId[];
  spellManaReductions: Partial<Record<SpellId, number>>;
  skills: Partial<Record<SecondarySkillId, SkillRank>>;
  tacticianSlot: number | null;
  inventory: ItemSlot[];
  artifacts: HeroArtifacts;
  debts: DebtEntry[];
  /** False only for a remote Warden outside the printed rank-3 casting/Knack range. */
  knackEnabled?: boolean;
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
  /** Serialized campaign inputs used by conditional artifact rules at battle setup. */
  attackerOwnedHeroCount?: number;
  defenderOwnedHeroCount?: number;
  attackerRosterHasHeroCountStats?: boolean;
  defenderRosterHasHeroCountStats?: boolean;
  attackerPriorFactionBattles?: number;
  defenderPriorFactionBattles?: number;
  attackerOpponentFaction?: string;
  defenderOpponentFaction?: string;
}

export interface BattleState {
  /** Setup RNG at battle creation; deterministic summon/weather choices derive from this. */
  seed?: number;
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
  /** Knacks remain once per round even when another printed source grants a hero act. */
  knackUseRound: Record<BattleSide, number>;
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
  /** Per-side, per-effect bounded artifact credits; behavior dispatch keys are effect tags. */
  artifactEffectUses: Record<BattleSide, Partial<Record<import('../content/artifacts').ArtifactEffectTag, number>>>;
  /** Attack/Defense waiting for the next living allied company to begin an action. */
  inheritedArtifactStats: Record<BattleSide, { attack: number; defense: number } | null>;
  artifactStoredSpell: Record<BattleSide, {
    action: Extract<Action, { type: 'BATTLE_CAST' }>; plus: boolean; manaSpent: number;
  } | null>;
  lastHeroSpellAction: Record<BattleSide, {
    action: Extract<Action, { type: 'BATTLE_CAST' }>; plus: boolean; manaSpent: number;
  } | null>;
  defenderKeep: boolean;
  spellCastsBySide: Record<BattleSide, number>;
  withdrawal: { side: BattleSide; kind: 'retreat' | 'surrender'; cost: number } | null;
  winner: BattleSide | null;
  delayedTriggers?: BattleDelayedTrigger[];
  midBattleResonance?: Record<BattleSide, SpellSchool[]>;
  /** Consumable-granted upgraded rules, scoped to this battle and side. */
  itemUpgradedSchools: Record<BattleSide, SpellSchool[]>;
  /** The next destruction event claims this single Grave-Dust resurrection. */
  pendingGraveDust: { side: BattleSide } | null;
  terminationReason?: 'elimination' | 'round-limit';
  holdLineUsedRound?: Partial<Record<BattleSide, number>>;
  standardDawnKillRound?: Partial<Record<BattleSide, number>>;
  pendingGrantedActions?: BattleGrantedAction[];
  activeGrantedAction?: (BattleGrantedAction & { resumeStackId: string | null }) | null;
  roundOrderPending?: boolean;
  beguilerOpeningResolved: Record<BattleSide, boolean>;
  beguilerControlUsed: Record<BattleSide, boolean>;
  evokerActUsed: Record<BattleSide, boolean>;
  duelistTrophyResolved: boolean;
  /** Active spell provenance is serialized so nested copy/creature resolution cannot infer source. */
  spellResolutionSource?: {
    kind: 'hero' | 'creature' | 'copy'; spellPower: number; spellId: SpellId;
    magnitudeMultiplier?: number;
    /** A cast logs each immune company at most once, even when several primitives touch it. */
    skippedRecipientIds: string[];
  };
  pendingSpellDeflection?: {
    defenderSide: BattleSide; sourceSide: BattleSide; sourceKind: 'hero' | 'creature' | 'copy';
    spellPower: number; action: Extract<Action, { type: 'BATTLE_CAST' }>;
    plus: boolean; manaSpent: number; legalTargetIds: string[];
    casterStackId?: string;
  };
  pendingMirrorCopy?: {
    chooserSide: BattleSide; sourceSide: BattleSide; spellPower: number;
    action: Extract<Action, { type: 'BATTLE_CAST' }>;
    plus: boolean; manaSpent: number; legalTargetIds: string[];
  };
  /** Deterministic P2 spell state; optional for backwards-compatible saves and fixtures. */
  p2Weather?: { round: number; kind: 'hail' | 'fog' | 'squall' | 'sun' | 'frost' };
  p2LedgerHalfTriggers?: string[];
  p2LongOathUseRound?: Partial<Record<BattleSide, number>>;
  p2ExtraActionUses?: Partial<Record<BattleSide, { round: number; count: number }>>;
  pendingAmbushStackId?: string;
  pendingArtifactDeploymentSide?: BattleSide;
}

export interface BattleGrantedAction {
  id: string;
  targetId: string;
  /** Spell or consumable which reserved the granted action. */
  sourceSpellId: SpellId | ItemId;
  timing: 'immediate' | 'round-end' | 'pre-order';
  round: number;
}

export type HazardHexTrigger = 'on-enter' | 'on-turn-start';
export type HazardHexEffect =
  | { kind: 'damage'; amount: number; trigger?: HazardHexTrigger }
  | { kind: 'heal'; amount: number; trigger?: HazardHexTrigger }
  | { kind: 'chill'; amount: number; trigger?: HazardHexTrigger }
  | { kind: 'teleport'; destination: Coord; trigger?: HazardHexTrigger };
export type BattleTileTypeId =
  | 'wall' | 'resin' | 'thicket' | 'undergrowth' | 'mirror' | 'hazard' | 'test';
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
  hp?: number;
  hazard?: HazardHexEffect;
}

export type BattleDelayedEffect =
  | { kind: 'counter'; targetId: string; counter: CounterId; amount: number }
  | { kind: 'heal'; targetId: string; hp: number }
  | { kind: 'impact-damage'; targetId: string; amount: number }
  | { kind: 'extra-action'; targetId: string; amount: number };
export interface BattleDelayedTrigger {
  id: string;
  sourceSide: BattleSide;
  trigger: { kind: 'round-start'; round: number }
    | { kind: 'company-destroyed'; stackId: string };
  effect: BattleDelayedEffect;
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

export type LevelChoice = PrimaryStat | SecondarySkillId
  | 'inscribe' | 'adept' | 'grimoire' | 'bargain';
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
  | { kind: 'adept'; playerId: PlayerId; heroId: string; options: SpellId[] }
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
    kind: 'acquisitionSite'; objectId: string; playerId: PlayerId; heroId: string;
    options: SpellId[];
  }
  | {
    kind: 'duelistArtifact'; playerId: PlayerId; heroId: string; loserHeroId: string;
    options: ArtifactId[]; transferOnChoice: boolean;
    spellthiefOptions?: SpellId[]; spellthiefUpgradeOptions?: SpellId[];
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
  /** One-shot, serializable face-up spell reveal for newly built Mage Guild 4/5. */
  guildReveal: { castleId: string; buildingId: 'mageGuild4' | 'mageGuild5'; spellIds: SpellId[] } | null;
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
