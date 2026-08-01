import { BATTLE_COLS, BATTLE_ROWS } from '../../content/constants';
import { UNITS } from '../../content/units';
import type { BattleStack, Coord, UnitId } from '../types';
import { coordKey, sameCoord } from '../map/pathfinding';
import { hexDistance, isAdjacent } from './hex';

export function unitHexes(unitId: UnitId, anchor: Coord): Coord[] {
  return Array.from({ length: UNITS[unitId].hexSize }, (_unused, index) => ({
    x: anchor.x + index, y: anchor.y,
  }));
}

export function stackHexes(stack: Pick<BattleStack, 'unitId' | 'position'>, anchor = stack.position): Coord[] {
  return unitHexes(stack.unitId, anchor);
}

export function stackContains(stack: Pick<BattleStack, 'unitId' | 'position'>, coord: Coord): boolean {
  return stackHexes(stack).some((hex) => sameCoord(hex, coord));
}

export function stacksAdjacent(
  first: Pick<BattleStack, 'id' | 'unitId' | 'position'>,
  second: Pick<BattleStack, 'id' | 'unitId' | 'position'>,
): boolean {
  if (first.id === second.id) return false;
  return stackHexes(first).some((a) => stackHexes(second).some((b) => isAdjacent(a, b)));
}

export function stackDistance(
  first: Pick<BattleStack, 'unitId' | 'position'>,
  second: Pick<BattleStack, 'unitId' | 'position'>,
): number {
  return Math.min(...stackHexes(first).flatMap((a) => stackHexes(second).map((b) => hexDistance(a, b))));
}

export function footprintFits(
  stack: Pick<BattleStack, 'unitId' | 'position'>,
  anchor: Coord,
  occupied: ReadonlySet<string>,
  blockers: ReadonlySet<string>,
  canLandOnBlockers = false,
): boolean {
  return stackHexes(stack, anchor).every((hex) =>
    hex.x >= 0 && hex.y >= 0 && hex.x < BATTLE_COLS && hex.y < BATTLE_ROWS
    && !occupied.has(coordKey(hex)) && (canLandOnBlockers || !blockers.has(coordKey(hex))));
}

export function occupiedByStacks(stacks: BattleStack[], excluding?: string): Set<string> {
  return new Set(stacks.filter((stack) => stack.count > 0 && stack.id !== excluding)
    .flatMap((stack) => stackHexes(stack)).map(coordKey));
}
