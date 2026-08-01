import {
  BATTLE_TILE_ABILITY_STAGES, BATTLE_TILE_TYPES,
  type BattleTileAbilityTag,
} from '../../content/battleTiles';
import { sameCoord } from '../map/pathfinding';
import type {
  BattleSide, BattleStack, BattleState, BattleTile, BattleTileHookStage,
  BattleTileTypeId, Coord,
} from '../types';
import { isAdjacent } from './hex';
import { stackHexes } from './footprint';
import { addBattleCounter, grantMeter } from './magicEffects';

interface TileHookContext {
  battle: BattleState;
  tile: BattleTile;
  stack?: BattleStack;
}

interface TileAbilityHandler {
  tag: BattleTileAbilityTag;
  stage: BattleTileHookStage;
  apply?: (context: TileHookContext) => void;
}

export const BATTLE_TILE_ABILITY_REGISTRY: Record<
  BattleTileAbilityTag, TileAbilityHandler
> = {
  blocks_movement: {
    tag: 'blocks_movement', stage: BATTLE_TILE_ABILITY_STAGES.blocks_movement,
  },
  heated_wall: {
    tag: 'heated_wall', stage: BATTLE_TILE_ABILITY_STAGES.heated_wall,
    apply: ({ battle, tile, stack }) => {
      if (!stack) return;
      const first = battle.tiles.find((candidate) =>
        candidate.type === 'wall' && candidate.upgraded
        && stack.side !== candidate.sourceSide
        && stackHexes(stack).some((hex) => isAdjacent(candidate.position, hex)));
      if (first?.id === tile.id) {
        addBattleCounter(
          battle, stack, 'burn',
          BATTLE_TILE_TYPES[tile.type].values?.adjacentBurn ?? 0,
          tile.sourceSide,
        );
      }
    },
  },
  resin_chill: {
    tag: 'resin_chill', stage: BATTLE_TILE_ABILITY_STAGES.resin_chill,
    apply: ({ battle, tile, stack }) => {
      if (stack && stack.side !== tile.sourceSide
          && stackHexes(stack).some((hex) => sameCoord(tile.position, hex))) {
        addBattleCounter(battle, stack, 'chill', 1, tile.sourceSide);
      }
    },
  },
  undergrowth_slow: {
    tag: 'undergrowth_slow', stage: BATTLE_TILE_ABILITY_STAGES.undergrowth_slow,
  },
  undergrowth_chill: {
    tag: 'undergrowth_chill', stage: BATTLE_TILE_ABILITY_STAGES.undergrowth_chill,
    apply: ({ battle, tile, stack }) => {
      if (stack && tile.upgraded && stack.side !== tile.sourceSide
          && stackHexes(stack).some((hex) => sameCoord(tile.position, hex))) {
        addBattleCounter(battle, stack, 'chill', 1, tile.sourceSide);
      }
    },
  },
  test_enter_meter: {
    tag: 'test_enter_meter', stage: BATTLE_TILE_ABILITY_STAGES.test_enter_meter,
    apply: ({ tile, stack }) => {
      if (stack && stackHexes(stack).some((hex) => sameCoord(tile.position, hex))) {
        grantMeter(
          stack, BATTLE_TILE_TYPES[tile.type].values?.enterMeter ?? 0,
        );
      }
    },
  },
  test_turn_burn: {
    tag: 'test_turn_burn', stage: BATTLE_TILE_ABILITY_STAGES.test_turn_burn,
    apply: ({ battle, tile, stack }) => {
      if (stack && stackHexes(stack).some((hex) => sameCoord(tile.position, hex))) {
        addBattleCounter(
          battle, stack, 'burn',
          BATTLE_TILE_TYPES[tile.type].values?.turnBurn ?? 0,
          tile.sourceSide,
        );
      }
    },
  },
};

export function createBattleTile(
  battle: Pick<BattleState, 'tiles' | 'round'>,
  type: BattleTileTypeId,
  position: Coord,
  duration: number,
  sourceSide: BattleSide,
  upgraded = false,
): BattleTile {
  if (duration === 0 || duration < -1) throw new Error('Invalid tile duration');
  return {
    id: `${type}-${sourceSide}-${battle.round}-${battle.tiles.length}`,
    type, position: { ...position }, duration, sourceSide, upgraded,
    createdRound: battle.round,
  };
}

export function placeBattleTile(battle: BattleState, tile: BattleTile): void {
  if (battle.tiles.some((candidate) => sameCoord(candidate.position, tile.position))) {
    throw new Error('A persistent tile already occupies that hex');
  }
  battle.tiles.push({ ...tile, position: { ...tile.position } });
}

function handlers(tile: BattleTile, stage: BattleTileHookStage): TileAbilityHandler[] {
  return BATTLE_TILE_TYPES[tile.type].abilities
    .map((tag) => BATTLE_TILE_ABILITY_REGISTRY[tag])
    .filter((handler) => handler.stage === stage);
}

export function tileBlocksMovement(tile: BattleTile): boolean {
  return BATTLE_TILE_TYPES[tile.type].abilities.includes('blocks_movement');
}

export function runTileHooks(
  battle: BattleState,
  stage: 'on-enter' | 'on-turn-start' | 'on-turn-end',
  stack: BattleStack,
): void {
  for (const tile of battle.tiles) {
    for (const handler of handlers(tile, stage)) {
      handler.apply?.({ battle, tile, stack });
    }
  }
}

export function advanceBattleTiles(battle: BattleState): void {
  for (const tile of battle.tiles) {
    if (tile.duration > 0 && tile.createdRound < battle.round) tile.duration -= 1;
  }
  battle.tiles = battle.tiles.filter((tile) => tile.duration !== 0);
}
