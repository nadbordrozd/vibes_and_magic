export type PlayerId = 'p1' | 'p2';
export type FactionId = 'crimson' | 'azure';
export type UnitId =
  | 'militia' | 'berserker' | 'drake'
  | 'slinger' | 'frostAdept' | 'golem';
export type ResourceId = 'gold' | 'timber' | 'iron' | 'essence';
export type TerrainId = 'grass' | 'forest' | 'mountain' | 'water';
export type BuildingId =
  | 'townHall' | 'dwelling1' | 'dwelling2' | 'dwelling3'
  | 'treasury' | 'walls';
export type PrimaryStat = 'attack' | 'defense' | 'spellPower' | 'knowledge';

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
  available: [number, number, number];
  garrison: Army;
  builtOnDay: number | null;
}

export interface Guardian {
  army: ArmyStack[];
}

export type MapObject =
  | { id: string; kind: 'mine'; position: Coord; resource: ResourceId; income: number; owner: PlayerId | null; guard?: Guardian; cleared: boolean }
  | { id: string; kind: 'pile'; position: Coord; resource: ResourceId; amount: number; collected: boolean }
  | { id: string; kind: 'chest'; position: Coord; guard?: Guardian; cleared: boolean; collected: boolean };

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
  attackerHero: Pick<Hero, 'attack' | 'defense' | 'luck' | 'moraleBonus'>;
  defenderHero: Pick<Hero, 'attack' | 'defense' | 'luck' | 'moraleBonus'> | null;
  defenderWalls: boolean;
  context: BattleContext;
  log: string[];
  casualties: Record<BattleSide, Partial<Record<UnitId, number>>>;
  winner: BattleSide | null;
}

export type PendingChoice =
  | { kind: 'chest'; objectId: string; playerId: PlayerId }
  | { kind: 'level'; playerId: PlayerId; options: PrimaryStat[] };

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
  };
  lastMessage: string;
}

export type Action =
  | { type: 'MOVE_HERO'; destination: Coord }
  | { type: 'END_TURN' }
  | { type: 'BUILD'; castleId: string; buildingId: BuildingId }
  | { type: 'RECRUIT'; castleId: string; tier: 1 | 2 | 3; count: number }
  | { type: 'SWAP_ARMY'; castleId: string; heroSlot: number; garrisonSlot: number }
  | { type: 'CHOOSE_CHEST'; choice: 'gold' | 'xp' }
  | { type: 'CHOOSE_LEVEL'; stat: PrimaryStat }
  | { type: 'BATTLE_MOVE'; destination: Coord }
  | { type: 'BATTLE_ATTACK'; targetId: string }
  | { type: 'BATTLE_MOVE_ATTACK'; destination: Coord; targetId: string }
  | { type: 'BATTLE_WAIT' }
  | { type: 'BATTLE_DEFEND' }
  | { type: 'AUTO_COMBAT' };

export interface NewGameOptions {
  seed: number;
  p1: 'human' | 'ai';
  p2: 'human' | 'ai';
}
