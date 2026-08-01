export const MAP_WIDTH = 28;
export const MAP_HEIGHT = 20;
export const HERO_MOVE_POINTS = 2000;
/** Orthogonal guardian zone; change to 8 to include diagonals in one place. */
export const AGGRO_ADJACENCY: 4 | 8 = 4;
export const RANGED_PICKUP_MOVE_COST = 100;
export const ROAD_MOVE_COST = 65;
export const SEA_MOVE_COST = 65;
export const EMBARK_MOVE_COST = 300;
export const DISEMBARK_MOVE_COST = 300;
export const BOAT_COST = { gold: 1000, timber: 3 } as const;
export const GUARDIAN_WEEKLY_GROWTH = 0.1;
export const GUARDIAN_GROWTH_CAP = 5;
export const DIFFICULTY_MODIFIERS = {
  easy: { humanStartingResources: 2, aiIncome: 0.75, aiGrowth: 0.75, guardianStrength: 0.75 },
  normal: { humanStartingResources: 1, aiIncome: 1, aiGrowth: 1, guardianStrength: 1 },
  hard: { humanStartingResources: 1, aiIncome: 1.25, aiGrowth: 1.25, guardianStrength: 1 },
  brutal: { humanStartingResources: 0.75, aiIncome: 1.5, aiGrowth: 1.5, guardianStrength: 1.25 },
} as const;
export const MAX_HEROES_PER_PLAYER = 3;
export const HERO_HIRE_COST = 1500;
export const HERO_REHIRE_COST = 2500;
export const CASTLELESS_LOSS_DAYS = 7;
export const AI_SECOND_HERO_GOLD = 3500;
export const AI_THIRD_HERO_GOLD = 8000;
export const AI_GATHERER_THREAT_RATIO = 1.5;
export const AI_GATHERER_THREAT_TURNS = 1.5;
export const HERO_REVEAL_RADIUS = 5;
export const CASTLE_REVEAL_RADIUS = 7;
export const BATTLE_COLS = 13;
export const BATTLE_ROWS = 9;
export const MAX_ARMY_SLOTS = 7;
export const DAYS_PER_WEEK = 7;
export const BASE_CASTLE_GOLD_INCOME = 500;
export const TREASURY_GOLD_INCOME = 1000;
export const FIELD_MANA_REGEN = 1;
export const ATTACK_DAMAGE_PER_POINT = 0.05;
export const MAX_ATTACK_DAMAGE_BONUS = 3;
export const DEFENSE_REDUCTION_PER_POINT = 0.025;
export const MAX_DEFENSE_REDUCTION = 0.7;
export const LUCK_RANGE_SHIFT_PER_POINT = 0.1;
export const MAX_LUCK_MAGNITUDE = 5;
export const MORALE_THRESHOLD = 100;
export const MORALE_KILLING_STACK_GAIN = 25;
export const MORALE_ALLY_KILL_GAIN = 10;
export const MORALE_ALLY_LOSS = 30;
export const MIXED_FACTION_MORALE_PENALTY = 5;
export const GUARDIAN_VICTORY_XP = 500;
export const CHEST_GOLD = 1500;
export const CHEST_XP = 1000;
export const STARTING_RESOURCES = {
  gold: 5000,
  timber: 10,
  iron: 3,
  essence: 3,
} as const;

export const TERRAIN_COST = {
  meadow: 100,
  deepwood: 150,
  mosswold: 150,
  ashsteppe: 125,
  barrowfield: 125,
  lacquerFlats: 100,
  hush: 150,
  mire: 175,
  mountain: Number.POSITIVE_INFINITY,
  water: Number.POSITIVE_INFINITY,
} as const;

export const LEVEL_THRESHOLD = (level: number): number =>
  Math.round(1000 * 1.4 ** (level - 2));
