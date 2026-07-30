export type PlayerId = 'p1' | 'p2';
export type FactionId = 'hearthguard' | 'woundWrights';
export type UnitId =
  | 'yeoman' | 'longbowman' | 'bannerman' | 'lanceKnight' | 'oriflammeWarden'
  | 'tinSoldier' | 'hobbyKnight' | 'marionette' | 'stuffedSentinel'
  | 'woodenColossus';
export type ResourceId = 'gold' | 'timber' | 'iron' | 'essence';
export type TerrainId = 'grass' | 'forest' | 'barrow' | 'mountain' | 'water';
export type BuildingId =
  | 'townHall' | 'dwelling1' | 'dwelling2' | 'dwelling3' | 'dwelling4' | 'dwelling5'
  | 'treasury' | 'walls' | 'chapelOfTheBanner' | 'guildWorkshop'
  | 'mageGuild1' | 'mageGuild2' | 'mageGuild3';
export type UnitTier = 1 | 2 | 3 | 4 | 5;
export type PrimaryStat = 'attack' | 'defense' | 'spellPower' | 'knowledge';
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
}

export interface Player {
  id: PlayerId;
  name: string;
  faction: FactionId;
  controller: 'human' | 'ai';
  resources: Resources;
  hero: Hero | null;
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
}

export type MapObject =
  | { id: string; kind: 'mine'; position: Coord; resource: ResourceId; income: number; owner: PlayerId | null; guard?: Guardian; cleared: boolean }
  | { id: string; kind: 'pile'; position: Coord; resource: ResourceId; amount: number; collected: boolean }
  | { id: string; kind: 'chest'; position: Coord; guard?: Guardian; cleared: boolean; collected: boolean }
  | {
    id: string; kind: 'shrine'; position: Coord; school: SpellSchool;
    teaches: SpellId; guard: Guardian; cleared: boolean; visitedBy: string[];
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
  attack: number;
  defense: number;
  luck: number;
  moraleBonus: number;
  spellPower: number;
  mana: number;
  knownSpells: SpellId[];
  upgradedSpells: SpellId[];
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
  resonance: SpellSchool | null;
  destroyedStacks: number;
  extraActions: Record<BattleSide, number>;
  spellWalls: Coord[];
  spellCasts: number;
  winner: BattleSide | null;
}

export type LevelChoice = PrimaryStat | 'inscribe';
export type PendingChoice =
  | { kind: 'chest'; objectId: string; playerId: PlayerId }
  | { kind: 'level'; playerId: PlayerId; options: LevelChoice[] }
  | { kind: 'shrine'; objectId: string; playerId: PlayerId; options: SpellId[] }
  | { kind: 'inscribe'; playerId: PlayerId; options: SpellId[] };

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

export type Action =
  | { type: 'MOVE_HERO'; destination: Coord }
  | { type: 'END_TURN' }
  | { type: 'BUILD'; castleId: string; buildingId: BuildingId }
  | { type: 'RECRUIT'; castleId: string; tier: UnitTier; count: number }
  | { type: 'SWAP_ARMY'; castleId: string; heroSlot: number; garrisonSlot: number }
  | { type: 'CHOOSE_CHEST'; choice: 'gold' | 'xp' }
  | { type: 'CHOOSE_LEVEL'; stat: LevelChoice }
  | { type: 'CHOOSE_SPELL_UPGRADE'; spellId: SpellId }
  | { type: 'GUILD_INSCRIBE'; castleId: string; spellId: SpellId }
  | { type: 'BATTLE_MOVE'; destination: Coord }
  | { type: 'BATTLE_ATTACK'; targetId: string }
  | { type: 'BATTLE_MOVE_ATTACK'; destination: Coord; targetId: string }
  | { type: 'BATTLE_WAIT' }
  | { type: 'BATTLE_DEFEND' }
  | { type: 'BATTLE_OVERWIND' }
  | {
    type: 'BATTLE_CAST';
    spellId: SpellId;
    targetId?: string;
    secondaryTargetId?: string;
    effectId?: string;
    positions?: Coord[];
    replaceEnchantment?: number;
  }
  | { type: 'AUTO_COMBAT' };

export interface NewGameOptions {
  seed: number;
  p1: 'human' | 'ai';
  p2: 'human' | 'ai';
}
