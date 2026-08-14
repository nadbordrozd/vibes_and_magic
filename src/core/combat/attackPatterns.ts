import { UNITS } from '../../content/units';
import type { BattleStack, BattleState, Coord } from '../types';
import { hexDistance, hexNeighbors } from './hex';
import { stackContains, stackHexes, stackIsOnField, stacksAdjacent } from './footprint';

export interface PatternVictim { stack: BattleStack; scale: number; friendlyFire: boolean }
export interface PatternPlan { victims: PatternVictim[]; suppressPrimaryRetaliation: boolean }

const stable = (a: BattleStack, b: BattleStack) => a.id.localeCompare(b.id);
const cube = (coord: Coord): [number, number, number] => {
  const q = coord.x - (coord.y - (coord.y & 1)) / 2;
  return [q, -q - coord.y, coord.y];
};
const offset = ([q, _s, r]: [number, number, number]): Coord => ({
  x: q + (r - (r & 1)) / 2, y: r,
});
const occupant = (battle: BattleState, hex: Coord, attacker: BattleStack, primary: BattleStack) =>
  battle.stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack) && stack.id !== attacker.id
    && stack.id !== primary.id && stackContains(stack, hex)).sort(stable)[0];

function attackAxis(attacker: BattleStack, target: BattleStack): { from: Coord; at: Coord } {
  const pairs = stackHexes(attacker).flatMap((from) => stackHexes(target).map((at) => ({ from, at })));
  return pairs.sort((a, b) => hexDistance(a.from, a.at) - hexDistance(b.from, b.at)
    || a.from.y - b.from.y || a.from.x - b.from.x || a.at.y - b.at.y || a.at.x - b.at.x)[0];
}

function directlyBeyond(from: Coord, at: Coord): Coord | null {
  const a = cube(from); const b = cube(at);
  const delta = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as [number, number, number];
  const directions: Array<[number, number, number]> = [
    [1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1],
  ];
  const direction = directions.sort((left, right) =>
    (right[0] * delta[0] + right[1] * delta[1] + right[2] * delta[2])
    - (left[0] * delta[0] + left[1] * delta[1] + left[2] * delta[2]))[0];
  const next = offset([b[0] + direction[0], b[1] + direction[1], b[2] + direction[2]]);
  return hexNeighbors(at).some((candidate) => candidate.x === next.x && candidate.y === next.y)
    ? next : null;
}

function uniqueVictims(entries: PatternVictim[]): PatternVictim[] {
  const seen = new Set<string>();
  return entries.filter((entry) => !seen.has(entry.stack.id) && Boolean(seen.add(entry.stack.id)));
}

export function attackPatternPlan(
  battle: BattleState, attacker: BattleStack, primary: BattleStack,
): PatternPlan | null {
  const pattern = UNITS[attacker.unitId].attackPattern;
  if (!pattern) return null;
  const primaryEntry = { stack: primary, scale: 1, friendlyFire: false };
  if (pattern.kind === 'all-adjacent') {
    const secondaries = battle.stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack)
      && stack.id !== primary.id && stack.side !== attacker.side && stacksAdjacent(attacker, stack))
      .sort(stable).map((stack) => ({ stack, scale: 1, friendlyFire: false }));
    return { victims: [primaryEntry, ...secondaries], suppressPrimaryRetaliation: true };
  }
  const axis = attackAxis(attacker, primary);
  if (pattern.kind === 'breath') {
    const beyond = directlyBeyond(axis.from, axis.at);
    const secondary = beyond ? occupant(battle, beyond, attacker, primary) : undefined;
    return { victims: [primaryEntry, ...(secondary
      ? [{ stack: secondary, scale: 1, friendlyFire: secondary.side === attacker.side }] : [])],
    suppressPrimaryRetaliation: false };
  }
  if (pattern.kind === 'cleave') {
    const flanks = hexNeighbors(axis.at).filter((hex) => hexNeighbors(axis.from)
      .some((neighbor) => neighbor.x === hex.x && neighbor.y === hex.y))
      .map((hex) => occupant(battle, hex, attacker, primary)).filter((stack): stack is BattleStack => Boolean(stack))
      .sort(stable).slice(0, 2).map((stack) => ({
        stack, scale: 0.5, friendlyFire: stack.side === attacker.side,
      }));
    return { victims: uniqueVictims([primaryEntry, ...flanks]), suppressPrimaryRetaliation: false };
  }
  if (pattern.kind === 'line-strike') {
    const victims: PatternVictim[] = [primaryEntry];
    let from = axis.from; let at = axis.at;
    for (let index = 1; index < pattern.range; index += 1) {
      const next = directlyBeyond(from, at); if (!next) break;
      const stack = occupant(battle, next, attacker, primary);
      if (stack) victims.push({ stack, scale: index === 1 ? 0.75 : 0.5,
        friendlyFire: stack.side === attacker.side });
      from = at; at = next;
    }
    return { victims: uniqueVictims(victims), suppressPrimaryRetaliation: true };
  }
  if (pattern.kind === 'blast-shot') {
    const secondaries = battle.stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack)
      && stack.id !== attacker.id && stack.id !== primary.id && stacksAdjacent(stack, primary))
      .sort(stable).map((stack) => ({ stack, scale: 0.5,
        friendlyFire: stack.side === attacker.side }));
    return { victims: [primaryEntry, ...secondaries], suppressPrimaryRetaliation: true };
  }
  if (pattern.kind === 'arc-shot') {
    const victims: PatternVictim[] = [primaryEntry];
    let current = primary;
    for (const scale of [0.7, 0.5]) {
      const distance = (left: BattleStack, right: BattleStack) => Math.min(...stackHexes(left)
        .flatMap((a) => stackHexes(right).map((b) => hexDistance(a, b))));
      const next = battle.stacks.filter((stack) => stack.count > 0 && stackIsOnField(stack)
        && stack.side !== attacker.side
        && !victims.some((entry) => entry.stack.id === stack.id))
        .sort((a, b) => distance(current, a) - distance(current, b) || stable(a, b))[0];
      if (!next) break;
      victims.push({ stack: next, scale, friendlyFire: false }); current = next;
    }
    return { victims, suppressPrimaryRetaliation: true };
  }
  return null;
}
