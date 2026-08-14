import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { createBattle, legalBattleActions } from '../../core/combat/battle';
import { createGame } from '../../core/game';
import type { Action, FactionId } from '../../core/types';
import { KNACKS } from '../../content/knacks';
import { knackDisabledReason, legalKnackPlacements } from '../../core/combat/knacks';
import { CombatScreen } from '../components/CombatScreen';
import { inspectTarget } from '../inspection';

function stateFor(faction: FactionId) {
  const state = createGame({ seed: 67100, p1: 'human', p2: 'human',
    p1Faction: faction, p2Faction: 'hearthguard' });
  const attacker = state.players.p1.hero!; const defender = state.players.p2.hero!;
  attacker.level = 12;
  const [battle] = createBattle(
    makeArmy([{ unitId: faction === 'woundWrights' ? 'tinSoldier' : 'yeoman', count: 10 },
      { unitId: 'longbowman', count: 6 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 10 }]), attacker, defender, {
      kind: 'hero', targetId: defender.id, destination: { x: 5, y: 5 },
      attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2',
    }, 67100,
  );
  battle.obstacles = [];
  battle.currentStackId = battle.stacks.find((stack) => stack.side === 'attacker')!.id;
  state.phase = 'combat'; state.battle = battle;
  return state;
}

const render = (state: ReturnType<typeof stateFor>) => renderToStaticMarkup(<CombatScreen
  state={state} dispatch={() => undefined} humanControl onSave={() => undefined}
  onShare={() => undefined} animation={null} animationSpeed="instant"
  onAnimationSpeedChange={() => undefined}
/>);

describe('faction Knack combat UI', () => {
  it('renders the permanent named, ranked, inspectable control for all six factions', () => {
    for (const faction of Object.keys(KNACKS) as FactionId[]) {
      const state = stateFor(faction); const html = render(state);
      expect(html, faction).toContain(`data-knack-control="${faction}"`);
      expect(html, faction).toContain(`data-inspect-kind="knack" data-inspect-id="${faction}"`);
      expect(html, faction).toContain(`${KNACKS[faction].name} · Rank 3`);
      const card = inspectTarget(state, { kind: 'knack', id: faction });
      expect(card?.name).toBe(KNACKS[faction].name);
      expect(card?.mechanics).toHaveLength(3);
    }
  });

  it('stays visible while disabled and prints the exact spent-act and Rusted Tongue reasons', () => {
    const spent = stateFor('hearthguard');
    spent.battle!.castRound.attacker = spent.battle!.round;
    const spentButton = render(spent).match(/<button class="knack-button"[^>]*>/)?.[0];
    expect(spentButton).toContain('data-knack-control="hearthguard"');
    expect(spentButton).toContain('disabled=""');
    expect(spentButton).toContain('title="The shared hero act was already spent this round."');

    const rusted = stateFor('hearthguard');
    rusted.battle!.attackerHero.artifacts.equipment.amulet = { id: 'rustedTongue' as never };
    expect(knackDisabledReason(rusted.battle!))
      .toBe('An equipped Burden disables this Knack.');

    const saturated = stateFor('vespiary');
    saturated.battle!.attackerHero.level = 1;
    saturated.battle!.obstacles.push(...legalKnackPlacements(saturated.battle!));
    const saturatedButton = render(saturated)
      .match(/<button class="knack-button"[^>]*>/)?.[0];
    expect(saturatedButton).toContain('data-knack-control="vespiary"');
    expect(saturatedButton).toContain('disabled=""');
    expect(saturatedButton)
      .toContain('title="Lay Resin has no legal empty hex for this rank."');
  });

  it('exposes the full staged Lay Resin target draft without mutating battle state', () => {
    const state = stateFor('vespiary');
    const before = JSON.stringify(state.battle);
    expect(render(state)).toContain('Lay Resin · Rank 3');
    const legal = legalBattleActions(state.battle!).filter((action): action is Extract<
      Action, { type: 'BATTLE_USE_KNACK' }
    > => action.type === 'BATTLE_USE_KNACK');
    expect(legal).toEqual([{ type: 'BATTLE_USE_KNACK' }]);
    expect(JSON.stringify(state.battle)).toBe(before);
  });
});
