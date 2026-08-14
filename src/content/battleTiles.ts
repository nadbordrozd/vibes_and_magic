import type {
  BattleTileHookStage, BattleTileTypeId,
} from '../core/types';
import { BATTLE_TILE_PRESENTATION } from './flavor';

export type BattleTileAbilityTag =
  | 'blocks_movement' | 'heated_wall' | 'resin_chill' | 'undergrowth_slow'
  | 'knack_resin_chill'
  | 'undergrowth_chill'
  | 'hazard_enter' | 'hazard_turn_start'
  | 'test_enter_meter' | 'test_turn_burn';

export interface BattleTileType {
  id: BattleTileTypeId;
  name: string;
  flavor: string;
  abilities: BattleTileAbilityTag[];
  values?: {
    adjacentBurn?: number;
    enterMeter?: number;
    turnBurn?: number;
  };
}

export const BATTLE_TILE_TYPES: Record<BattleTileTypeId, BattleTileType> = {
  wall: {
    id: 'wall', name: 'Wall of the Maker', flavor: BATTLE_TILE_PRESENTATION.wall.phrase,
    abilities: ['blocks_movement', 'heated_wall'],
    values: { adjacentBurn: 1 },
  },
  resin: {
    id: 'resin', name: 'Resin', flavor: BATTLE_TILE_PRESENTATION.resin.phrase,
    abilities: ['resin_chill', 'knack_resin_chill'],
  },
  thicket: {
    id: 'thicket', name: 'Thicket', flavor: 'The ground develops opinions.', abilities: ['blocks_movement'],
  },
  undergrowth: {
    id: 'undergrowth', name: 'Undergrowth', flavor: BATTLE_TILE_PRESENTATION.undergrowth.phrase,
    abilities: ['undergrowth_slow', 'undergrowth_chill'],
  },
  mirror: {
    id: 'mirror', name: 'Standing Mirror', flavor: 'The glass is listening.', abilities: ['blocks_movement'],
  },
  hazard: {
    id: 'hazard', name: 'Hazard', flavor: 'The hex keeps the rule laid upon it.',
    abilities: ['hazard_enter', 'hazard_turn_start'],
  },
  test: {
    id: 'test', name: 'Pipeline Test Tile', flavor: 'A chalk mark for careful proving.',
    abilities: ['test_enter_meter', 'test_turn_burn'],
    values: { enterMeter: 7, turnBurn: 1 },
  },
};

export const BATTLE_TILE_ABILITY_STAGES: Record<
  BattleTileAbilityTag, BattleTileHookStage
> = {
  blocks_movement: 'movement-query',
  heated_wall: 'on-turn-start',
  resin_chill: 'on-turn-start',
  knack_resin_chill: 'on-turn-end',
  undergrowth_slow: 'movement-query',
  undergrowth_chill: 'on-turn-end',
  hazard_enter: 'on-enter',
  hazard_turn_start: 'on-turn-start',
  test_enter_meter: 'on-enter',
  test_turn_burn: 'on-turn-start',
};

const BATTLE_TILE_RULES: Record<BattleTileAbilityTag, string> = {
  blocks_movement: 'Blocks ordinary movement.',
  heated_wall: 'When upgraded, an adjacent enemy gains Burn 1 at turn start.',
  resin_chill: 'An enemy company starting its turn here gains Chill 1.',
  knack_resin_chill: 'Knack-laid resin gives any company ending its turn there Chill 1.',
  undergrowth_slow: 'Entering this hex costs 2 additional movement.',
  undergrowth_chill: 'When upgraded, an enemy ending its turn here gains Chill 1.',
  hazard_enter: 'A declared damage, healing, Chill, or teleport effect resolves on entry.',
  hazard_turn_start: 'A declared damage, healing, or Chill effect resolves at turn start.',
  test_enter_meter: 'A company entering gains the test tile’s listed morale.',
  test_turn_burn: 'A company starting its turn here gains the test tile’s listed Burn.',
};

export function battleTileRuleSummary(tile: BattleTileType): string[] {
  return tile.abilities.map((tag) => BATTLE_TILE_RULES[tag]);
}

export function validateBattleTiles(): void {
  if (Object.values(BATTLE_TILE_TYPES).some((entry) => !entry.name || !entry.flavor.trim())) {
    throw new Error('Battle tile catalog contains an incomplete definition');
  }
}
