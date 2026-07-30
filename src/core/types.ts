import type {
  AbilityId, ItemInstance, ItemSlot,
} from './contentTypes';
import type { Action } from './actionTypes';
export type {
  AbilityId, ItemId, ItemInstance, ItemSlot,
} from './contentTypes';
export type { Action } from './actionTypes';

export type PlayerId = 'p1' | 'p2';
export type FactionId = 'hearthguard' | 'woundWrights';
export type UnitId =
  | 'yeoman' | 'longbowman' | 'bannerman' | 'lanceKnight' | 'oriflammeWarden'
  | 'tinSoldier' | 'hobbyKnight' | 'marionette' | 'stuffedSentinel'
  | 'woodenColossus' | 'sleeper' | 'mirrorBound';
export type ResourceId = 'gold' | 'timber' | 'iron' | 'essence';
export type TerrainId = 'grass' | 'forest' | 'barrow' | 'mountain' | 'water';
export type BuildingId =
  | 'townHall' | 'dwelling1' | 'dwelling2' | 'dwelling3' | 'dwelling4' | 'dwelling5'
  | 'treasury' | 'walls' | 'chapelOfTheBanner' | 'guildWorkshop'
  | 'mageGuild1' | 'mageGuild2' | 'mageGuild3' | 'tavern' | 'marketplace';
export type UnitTier = 1 | 2 | 3 | 4 | 5;
export type PrimaryStat = 'attack' | 'defense' | 'spellPower' | 'knowledge';
export type SecondarySkillId =
  | 'logistics' | 'scouting' | 'wayfaring' | 'diplomacy'
  | 'attunement' | 'command' | 'forager' | 'spellthief';
export type SkillRank = 1 | 2;
export type HeroDefinitionId =
  | 'aldith' | 'corwin' | 'berta' | 'osric'
  | 'petra' | 'silas' | 'grigor' | 'mirele';
export type SpecialtyId =
  | 'steadyAim' | 'brightRally' | 'roadwise' | 'highBanner'
  | 'tinCaptain' | 'brightWither' | 'masterForager' | 'masterMender';
export type SpellSchool = 'rite' | 'craft' | 'grave' | 'wild';
export type CounterId = 'burn' | 'chill' | 'hex' | 'bloom';
export type SpellId =
  | 'rally' | 'blessing' | 'standardOfDawn' | 'amplify' | 'sanctuary'
  | 'oathOfIron' | 'consecrate' | 'hymnOfTheHost' | 'trial'
  | 'forgeSpark' | 'ward' | 'reflect' | 'forgefire' | 'clockworkEscort'
  | 'wallOfTheMaker' | 'quicksilver' | 'unmake' | 'ironclad'
  | 'wither' | 'graveChill' | 'mournersVeil' | 'dirge' | 'lastCandle'
  | 'sour' | 'remembrance' | 'reckoning' | 'quiet';

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
}

export interface Player {
  id: PlayerId;
  name: string;
  faction: FactionId;
  controller: 'human' | 'ai';
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
}

export interface Castle {
  id: string;
  owner: PlayerId;
  faction: FactionId;
  position: Coord;
  buildings: BuildingId[];
  available: [number, number, number, number, number];
  garrison: Army;
  builtOnDay: number | null;
  guildDeck: SpellId[];
}

export interface Guardian {
  army: ArmyStack[];
  split?: boolean;
  drop?: ItemInstance;
}

export interface GuardianReward {
  gold?: number;
  essence?: number;
  items?: ItemInstance[];
}

export type MapObject =
  | {
    id: string; kind: 'mine'; position: Coord; resource: ResourceId; income: number;
    owner: PlayerId | null; guard?: Guardian; cleared: boolean; chartered: boolean;
  }
  | { id: string; kind: 'pile'; position: Coord; resource: ResourceId; amount: number; collected: boolean }
  | { id: string; kind: 'chest'; position: Coord; guard?: Guardian; cleared: boolean; collected: boolean }
  | {
    id: string; kind: 'shrine'; position: Coord; school: SpellSchool;
    teaches: SpellId; guard: Guardian; cleared: boolean; visitedBy: string[];
  }
  | { id: string; kind: 'item'; position: Coord; item: ItemInstance; collected: boolean }
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
    guard: Guardian; reward: GuardianReward; cleared: boolean;
  };

export interface GameMap {
  id: 'border-marches';
  name: string;
  width: number;
  height: number;
  terrain: TerrainId[][];
  objects: MapObject[];
}

export type BattleSide = 'attacker' | 'defender';
export interface BattleStack {
  id: string;
  side: BattleSide;
  slot: number;
  unitId: UnitId;
  count: number;
  topHp: number;
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
}

export interface BattleHero {
  id: string;
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
}

export interface BattleContext {
  kind: 'guardian' | 'castle' | 'hero';
  targetId: string;
  destination: Coord;
  attackerHeroId: string;
  defenderHeroId?: string;
  defenderPlayerId?: PlayerId;
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
  destroyedStacks: number;
  extraActions: Record<BattleSide, number>;
  spellWalls: Coord[];
  spellCasts: number;
  lastSpellCast: { spellId: SpellId; plus: boolean; manaSpent: number } | null;
  winner: BattleSide | null;
}

export type LevelChoice = PrimaryStat | SecondarySkillId | 'inscribe';
export type PendingChoice =
  | {
    kind: 'chest'; objectId: string; playerId: PlayerId; heroId: string;
    item: ItemInstance;
  }
  | { kind: 'level'; playerId: PlayerId; heroId: string; options: LevelChoice[] }
  | {
    kind: 'shrine'; objectId: string; playerId: PlayerId; heroId: string;
    options: SpellId[]; choicesRemaining: number;
  }
  | { kind: 'inscribe'; playerId: PlayerId; heroId: string; options: SpellId[] }
  | {
    kind: 'diplomacy'; objectId: string; playerId: PlayerId; heroId: string;
    disbandCost: number; recruitCost: number | null;
  }
  | {
    kind: 'spellthief'; playerId: PlayerId; heroId: string;
    options: SpellId[]; upgradeOptions: SpellId[];
  };

export type ArmyHolder =
  | { kind: 'hero'; id: string }
  | { kind: 'garrison'; id: string };

export interface GameState {
  version: 1;
  seed: number;
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
  };
  magicDisabled: boolean;
  lastMessage: string;
  lastBattleRecovered: Partial<Record<UnitId, number>>;
}

export interface NewGameOptions {
  seed: number;
  p1: 'human' | 'ai';
  p2: 'human' | 'ai';
}
