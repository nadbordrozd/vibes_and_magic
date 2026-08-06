import type { Coord } from '../core/types';

export type AnimationSpeed = 'instant' | 'fast' | 'normal' | 'slow';

export interface AnimationTiming {
  mapStep: number;
  combatMoveStep: number;
  attack: number;
  damage: number;
  death: number;
  morale: number;
}

export const ANIMATION_TIMINGS: Record<AnimationSpeed, AnimationTiming> = {
  instant: { mapStep: 0, combatMoveStep: 0, attack: 0, damage: 0, death: 0, morale: 0 },
  fast: { mapStep: 55, combatMoveStep: 45, attack: 160, damage: 210, death: 190, morale: 700 },
  normal: { mapStep: 140, combatMoveStep: 90, attack: 280, damage: 340, death: 280, morale: 950 },
  slow: { mapStep: 300, combatMoveStep: 180, attack: 480, damage: 520, death: 440, morale: 1250 },
};

export interface CombatAnimation {
  phase: 'move' | 'attack' | 'projectile' | 'damage' | 'death' | 'morale';
  actorId: string;
  targetId?: string;
  displayPosition: Coord;
  targetPosition?: Coord;
  duration: number;
}
