import { describe, expect, it } from 'vitest';
import { makeArmy } from '../army';
import {
  applyBattleAction, createBattle, legalBattleActions,
} from '../combat/battle';
import {
  applyActivatedAbility, legalActivatedAbilityActions,
} from '../combat/activatedAbilities';
import { stackHexes } from '../combat/footprint';
import { totalStackHp } from '../combat/magicEffects';
import { runAttackPipeline, runTurnAdvancePipeline } from '../combat/pipeline';
import { castStoredSpell } from '../combat/spells';
import { createGame } from '../game';
import type { BattleState, Coord, UnitId } from '../types';

function battle(
  attacker: Array<{ unitId: UnitId; count: number }>,
  defender: Array<{ unitId: UnitId; count: number }>,
): BattleState {
  const game = createGame({ seed: 240, p1: 'human', p2: 'human' });
  return createBattle(
    makeArmy(attacker), makeArmy(defender),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: 'target', destination: { x: 4, y: 4 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    },
    240,
  )[0];
}

const key = (coord: Coord) => `${coord.x},${coord.y}`;

describe('wide-footprint ability audit', () => {
  it('skim reaches a second enemy adjacent to the first target', () => {
    const state = battle(
      [{ unitId: 'dragonflyCavalry', count: 1 }],
      [{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 20 }],
    );
    const actor = state.stacks[0];
    const first = state.stacks[1];
    const second = state.stacks[2];
    actor.position = { x: 2, y: 4 };
    first.position = { x: 3, y: 4 };
    second.position = { x: 4, y: 4 };
    const before = totalStackHp(second);
    runAttackPipeline(state, actor.id, first.id);
    expect(totalStackHp(second)).toBeLessThan(before);
  });

  it('does not continue a skim after retaliation kills the cavalry', () => {
    const state = battle(
      [{ unitId: 'yeoman', count: 1 }],
      [{ unitId: 'woodenColossus', count: 10 }, { unitId: 'longbowman', count: 20 }],
    );
    const actor = state.stacks[0];
    actor.temporaryAbilities = ['skim'];
    const first = state.stacks[1];
    const second = state.stacks[2];
    actor.position = { x: 2, y: 4 };
    first.position = { x: 3, y: 4 };
    second.position = { x: 5, y: 4 };
    const before = totalStackHp(second);
    expect(() => runAttackPipeline(state, actor.id, first.id)).not.toThrow();
    expect(actor.count).toBe(0);
    expect(totalStackHp(second)).toBe(before);
  });

  it('trample damages every enemy in its swept footprint and cannot land through blockers', () => {
    const state = battle(
      [{ unitId: 'aurochsHerd', count: 4 }],
      [{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 20 }],
    );
    const actor = state.stacks[0];
    const first = state.stacks[1];
    const second = state.stacks[2];
    actor.position = { x: 1, y: 4 };
    first.position = { x: 3, y: 4 };
    second.position = { x: 5, y: 4 };
    state.obstacles = [];
    const before = [totalStackHp(first), totalStackHp(second)];
    const trample = legalActivatedAbilityActions(state, actor).find((action) =>
      action.abilityId === 'trample' && action.destination?.x === 7
      && action.destination.y === 4)!;
    expect(trample).toBeTruthy();
    applyActivatedAbility(state, actor, trample);
    expect(actor.position).toEqual({ x: 7, y: 4 });
    expect(totalStackHp(first)).toBeLessThan(before[0]);
    expect(totalStackHp(second)).toBeLessThan(before[1]);

    actor.position = { x: 1, y: 4 };
    state.obstacles = [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }];
    const blocked = new Set(state.obstacles.map(key));
    const actions = legalActivatedAbilityActions(state, actor)
      .filter((action) => action.abilityId === 'trample');
    expect(actions.every((action) => action.destination
      && stackHexes(actor, action.destination).every((hex) => !blocked.has(key(hex))))).toBe(true);
  });

  it('fowl legs requires both destination hexes to be free', () => {
    const state = battle(
      [{ unitId: 'walkingHut', count: 1 }],
      [{ unitId: 'yeoman', count: 20 }],
    );
    const hut = state.stacks[0];
    hut.position = { x: 1, y: 4 };
    state.obstacles = [{ x: 6, y: 4 }];
    runTurnAdvancePipeline(state);
    const actions = legalBattleActions(state).filter((action) =>
      action.type === 'BATTLE_FREE_MOVE');
    expect(actions.some((action) => action.destination.x === 5
      && action.destination.y === 4)).toBe(false);
    const choice = actions.find((action) => action.destination.x === 7
      && action.destination.y === 4)!;
    const moved = applyBattleAction(state, choice);
    expect(stackHexes(moved.stacks[0])).toEqual([{ x: 7, y: 4 }, { x: 8, y: 4 }]);
  });

  it('the Ferry can collect an ally adjacent to either occupied hex', () => {
    const state = battle(
      [{ unitId: 'ferry', count: 1 }, { unitId: 'yeoman', count: 10 }],
      [{ unitId: 'longbowman', count: 10 }],
    );
    const ferry = state.stacks[0];
    const ally = state.stacks[1];
    ferry.position = { x: 2, y: 4 };
    ally.position = { x: 4, y: 4 };
    const action = legalActivatedAbilityActions(state, ferry).find((candidate) =>
      candidate.abilityId === 'crossing' && candidate.targetId === ally.id
      && candidate.destination?.x === 7 && candidate.destination.y === 4)!;
    expect(action).toBeTruthy();
    applyActivatedAbility(state, ferry, action);
    expect(ally.position).toEqual({ x: 7, y: 4 });
  });

  it('Gale, Sweep, and Wall of the Maker respect complete footprints', () => {
    const gale = battle(
      [{ unitId: 'yeoman', count: 10 }],
      [{ unitId: 'woodenColossus', count: 10 }],
    );
    gale.stacks[0].position = { x: 2, y: 4 };
    gale.stacks[1].position = { x: 4, y: 4 };
    gale.currentStackId = gale.stacks[0].id;
    gale.obstacles = [{ x: 7, y: 4 }];
    castStoredSpell(gale, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'gale', targetId: gale.stacks[1].id,
    }, false);
    expect(stackHexes(gale.stacks[1]).some((hex) => key(hex) === '7,4')).toBe(false);

    const sweep = battle(
      [{ unitId: 'besomRiders', count: 10 }],
      [{ unitId: 'woodenColossus', count: 10 }],
    );
    sweep.stacks[0].position = { x: 2, y: 4 };
    sweep.stacks[1].position = { x: 3, y: 4 };
    sweep.obstacles = [{ x: 5, y: 4 }];
    runAttackPipeline(sweep, sweep.stacks[0].id, sweep.stacks[1].id);
    expect(stackHexes(sweep.stacks[1]).some((hex) => key(hex) === '5,4')).toBe(false);

    const wall = battle(
      [{ unitId: 'woodenColossus', count: 10 }],
      [{ unitId: 'yeoman', count: 10 }],
    );
    wall.stacks[0].position = { x: 2, y: 4 };
    expect(() => castStoredSpell(wall, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'wallOfTheMaker',
      positions: [{ x: 3, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 4 }],
    }, false)).toThrow('distinct empty hexes');
  });
});
