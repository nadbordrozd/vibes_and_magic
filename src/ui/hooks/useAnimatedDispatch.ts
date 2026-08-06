import {
  useCallback, useRef, useState,
} from 'react';
import { activeBattleStack, applyBattleAction } from '../../core/combat/battle';
import { hexDistance } from '../../core/combat/hex';
import { canUseRanged } from '../../core/combat/damage';
import type {
  Action, GameState,
} from '../../core/types';
import {
  ANIMATION_TIMINGS, type AnimationSpeed, type CombatAnimation,
} from '../animation';

export function useAnimatedDispatch(
  game: GameState | null,
  speed: AnimationSpeed,
  commitAction: (action: Action) => void,
) {
  const [animation, setAnimation] = useState<CombatAnimation | null>(null);
  const sequenceRef = useRef(0);

  const cancel = useCallback(() => {
    sequenceRef.current += 1;
    setAnimation(null);
  }, []);

  const dispatch = useCallback((action: Action) => {
    const battle = game?.battle;
    const timing = ANIMATION_TIMINGS[speed];
    const animated = action.type === 'BATTLE_MOVE'
      || action.type === 'BATTLE_ATTACK'
      || action.type === 'BATTLE_MOVE_ATTACK';
    if (!battle) {
      commitAction(action);
      return;
    }
    if (animation) return;
    const actor = activeBattleStack(battle);
    if (!actor) {
      commitAction(action);
      return;
    }
    let projected = battle;
    try {
      projected = applyBattleAction(battle, action);
    } catch {
      projected = battle;
    }
    const projectedActor = projected.stacks.find((stack) => stack.id === actor.id);
    const moraleTriggered = Boolean(projectedActor
      && (projectedActor.extraActionsTaken ?? 0) > (actor.extraActionsTaken ?? 0)
      && projected.currentStackId === actor.id);
    const targetId = action.type === 'BATTLE_ATTACK'
      || action.type === 'BATTLE_MOVE_ATTACK' ? action.targetId : undefined;
    const target = targetId
      ? battle.stacks.find((stack) => stack.id === targetId) : undefined;
    const rangedAttack = action.type === 'BATTLE_ATTACK' && canUseRanged(actor);
    let targetDies = false;
    if (target) {
      targetDies = (projected.stacks.find((stack) => stack.id === target.id)?.count ?? 0) <= 0;
    }
    const displayPosition = action.type === 'BATTLE_MOVE'
      || action.type === 'BATTLE_MOVE_ATTACK'
      ? action.destination : actor.position;
    const moveDuration = hexDistance(actor.position, displayPosition)
      * timing.combatMoveStep;
    const sequence = ++sequenceRef.current;
    const valid = () => sequenceRef.current === sequence;
    const later = (callback: () => void, delay: number) => {
      window.setTimeout(() => {
        if (valid()) callback();
      }, delay);
    };
    const showMorale = () => {
      if (!valid()) return;
      if (!moraleTriggered || timing.morale === 0) {
        setAnimation(null);
        return;
      }
      setAnimation({
        phase: 'morale', actorId: actor.id,
        displayPosition: projectedActor?.position ?? displayPosition,
        duration: timing.morale,
      });
      later(() => setAnimation(null), timing.morale);
    };
    const finish = () => {
      if (!valid()) return;
      commitAction(action);
      showMorale();
    };
    const showDeath = () => {
      if (!target || !targetDies) {
        finish();
        return;
      }
      setAnimation({
        phase: 'death', actorId: actor.id, targetId: target.id,
        displayPosition, targetPosition: target.position, duration: timing.death,
      });
      later(finish, timing.death);
    };
    const showDamage = () => {
      if (!target) {
        finish();
        return;
      }
      setAnimation({
        phase: 'damage', actorId: actor.id, targetId: target.id,
        displayPosition, targetPosition: target.position, duration: timing.damage,
      });
      later(showDeath, timing.damage);
    };
    const showAttack = () => {
      if (!target) {
        finish();
        return;
      }
      setAnimation({
        phase: rangedAttack ? 'projectile' : 'attack', actorId: actor.id, targetId: target.id,
        displayPosition, targetPosition: target.position, duration: timing.attack,
      });
      later(showDamage, timing.attack);
    };
    if (!animated || timing.combatMoveStep === 0) {
      finish();
    } else if (moveDuration > 0) {
      setAnimation({
        phase: 'move', actorId: actor.id, targetId,
        displayPosition, targetPosition: target?.position, duration: moveDuration,
      });
      later(action.type === 'BATTLE_MOVE' ? finish : showAttack, moveDuration);
    } else {
      showAttack();
    }
  }, [animation, commitAction, game, speed]);

  return { animation, cancel, dispatch };
}
