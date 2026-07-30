export const MAP_WIDTH = 28;
export const MAP_HEIGHT = 20;
export const HERO_MOVE_POINTS = 2000;
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
  grass: 100,
  forest: 150,
  mountain: Number.POSITIVE_INFINITY,
  water: Number.POSITIVE_INFINITY,
} as const;

export const LEVEL_THRESHOLD = (level: number): number =>
  Math.round(1000 * 1.4 ** (level - 2));
