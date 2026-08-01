import type {
  BattleTileHookStage, BattleTileTypeId,
} from '../core/types';
import { BATTLE_TILE_PRESENTATION } from './flavor';

export type BattleTileAbilityTag =
  | 'blocks_movement' | 'heated_wall' | 'resin_chill' | 'undergrowth_slow'
  | 'undergrowth_chill'
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
    id: 'resin', name: 'Resin', flavor: BATTLE_TILE_PRESENTATION.resin.phrase, abilities: ['resin_chill'],
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
  undergrowth_slow: 'movement-query',
  undergrowth_chill: 'on-turn-end',
  test_enter_meter: 'on-enter',
  test_turn_burn: 'on-turn-start',
};

export function validateBattleTiles(): void {
  if (Object.values(BATTLE_TILE_TYPES).some((entry) => !entry.name || !entry.flavor.trim())) {
    throw new Error('Battle tile catalog contains an incomplete definition');
  }
}
