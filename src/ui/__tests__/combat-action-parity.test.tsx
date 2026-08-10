import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { legalBattleActions } from '../../core/combat/battle';
import type { Action } from '../../core/types';
import { combatAbilityFixtures } from '../../sim/combat-action-fixtures';
import {
  beginAbilityTargeting, chooseCombatTarget, combatTargetChoices,
  combatTargetStage, confirmedCombatTargetAction, type CombatTargetDraft,
  type CombatTargetField, unsupportedCombatTargetFields,
} from '../combatTargeting';
import { CombatScreen } from '../components/CombatScreen';

type AbilityAction = Extract<Action, { type: 'BATTLE_USE_ABILITY' }>;

function enumerateAbilityActions(
  battle: NonNullable<ReturnType<typeof combatAbilityFixtures>[number]['state']['battle']>,
  draft: CombatTargetDraft,
): AbilityAction[] {
  const stage = combatTargetStage(battle, draft);
  if (stage === 'confirm') {
    const action = confirmedCombatTargetAction(battle, draft);
    return action?.type === 'BATTLE_USE_ABILITY' ? [action] : [];
  }
  if (stage === 'positions') throw new Error('Activated abilities do not use spell placement');
  return combatTargetChoices(draft, stage).flatMap((choice) =>
    enumerateAbilityActions(battle, chooseCombatTarget(
      draft, stage as CombatTargetField, choice,
    )));
}

function sortActions(actions: AbilityAction[]): string[] {
  return actions.map((action) => JSON.stringify(action)).sort();
}

describe('human combat action parity', () => {
  it('makes every generated activated-ability action reachable through generic targeting', () => {
    for (const { name, abilityId, state } of combatAbilityFixtures()) {
      const actions = legalBattleActions(state.battle!);
      const legal = actions.filter((action): action is AbilityAction =>
        action.type === 'BATTLE_USE_ABILITY' && action.abilityId === abilityId);
      expect(legal.length, name).toBeGreaterThan(0);
      expect(unsupportedCombatTargetFields(legal), name).toEqual([]);
      const before = structuredClone(state.battle!);
      const draft = beginAbilityTargeting(actions, abilityId);
      expect(draft, name).not.toBeNull();
      expect(sortActions(enumerateAbilityActions(state.battle!, draft!)), name)
        .toEqual(sortActions(legal));
      expect(state.battle, `${name} targeting must be cancellable without mutation`).toEqual(before);
    }
  });

  it('renders a named inspectable control for every legal activated ability family', () => {
    for (const { name, abilityId, state } of combatAbilityFixtures()) {
      const html = renderToStaticMarkup(<CombatScreen
        state={state} dispatch={() => undefined} humanControl
        onSave={() => undefined} onShare={() => undefined}
        animation={null} animationSpeed="instant"
        onAnimationSpeedChange={() => undefined}
      />);
      expect(html, name).toContain(`data-ability-control="${abilityId}"`);
      expect(html, name).toContain(`data-inspect-kind="ability" data-inspect-id="${abilityId}"`);
    }
  });
});
