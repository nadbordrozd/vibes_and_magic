import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { legalBattleActions } from '../../core/combat/battle';
import { createBattle } from '../../core/combat/battle';
import { makeArmy } from '../../core/army';
import { createGame } from '../../core/game';
import { isP1PlacementCastLegal, legalSpellCasts } from '../../core/combat/spells';
import type { Action } from '../../core/types';
import { combatAbilityFixtures } from '../../sim/combat-action-fixtures';
import {
  beginAbilityTargeting, beginSpellTargeting, chooseCombatTarget, combatTargetChoices,
  combatTargetStage, confirmedCombatTargetAction, type CombatTargetDraft,
  legalCombatPlacements, toggleCombatPosition, type CombatTargetField,
  unsupportedCombatTargetFields,
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

  it('keeps lazy Clockwork Double and both Blink branch drafts executable without a cross-product', () => {
    const game = createGame({ seed: 7441, p1: 'human', p2: 'human' });
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 8 }, { unitId: 'longbowman', count: 5 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 8 }, { unitId: 'hobbyKnight', count: 5 }]),
      game.players.p1.hero!, game.players.p2.hero!, {
        kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
        attackerHeroId: game.players.p1.hero!.id, defenderHeroId: game.players.p2.hero!.id,
        defenderPlayerId: 'p2',
      }, 7441,
    );
    battle.obstacles = [];
    battle.currentStackId = battle.stacks[0].id;
    battle.attackerHero.knownSpells = ['clockworkDouble', 'blink'];
    battle.attackerHero.upgradedSpells = ['blink'];
    battle.attackerHero.mana = 100;
    const options = legalSpellCasts(battle);
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThan(500);
    for (const option of [
      options.find((action) => action.spellId === 'clockworkDouble')!,
      options.find((action) => action.spellId === 'blink' && action.actImmediately === true)!,
      options.find((action) => action.spellId === 'blink' && action.actImmediately === false)!,
    ]) {
      let draft = beginSpellTargeting(battle, option.spellId)!;
      for (const field of ['actImmediately', 'targetId', 'secondaryTargetId'] as const) {
        if (Object.hasOwn(option, field)) {
          draft = chooseCombatTarget(draft, field, option[field]!);
        }
      }
      while (combatTargetStage(battle, draft) === 'positions') {
        draft = toggleCombatPosition(battle, draft, legalCombatPlacements(battle, draft)[0]);
      }
      const action = confirmedCombatTargetAction(battle, draft);
      expect(action).toMatchObject(option);
      expect(isP1PlacementCastLegal(battle, action as never)).toBe(true);
    }
  });
});
