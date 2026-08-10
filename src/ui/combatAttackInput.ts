import type { Coord } from '../core/types';
import type { AttackAction } from './attackPrediction';

export interface AimedAttack {
  targetId: string;
  hoveredHex: Coord;
  action: AttackAction;
}

function sameAction(left: AttackAction, right: AttackAction): boolean {
  if (left.type !== right.type || left.targetId !== right.targetId) return false;
  return left.type === 'BATTLE_ATTACK' || (right.type === 'BATTLE_MOVE_ATTACK'
    && left.destination.x === right.destination.x
    && left.destination.y === right.destination.y);
}

/** Resolve the action owned by an attackable-hex activation.
 *
 * The aimed action wins only while it still belongs to the legal options for this target and hex.
 * This keeps the click boundary explicit and prevents a cursor from dispatching a stale approach.
 */
export function attackActionForActivation(
  targetId: string,
  hoveredHex: Coord,
  options: AttackAction[],
  aimed: AimedAttack | null,
): AttackAction | null {
  if (aimed?.targetId === targetId
      && aimed.hoveredHex.x === hoveredHex.x
      && aimed.hoveredHex.y === hoveredHex.y) {
    const legalAimedAction = options.find((option) => sameAction(option, aimed.action));
    if (legalAimedAction) return legalAimedAction;
  }
  return options[0] ?? null;
}
