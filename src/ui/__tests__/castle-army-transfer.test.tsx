import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { apply, createGame } from '../../core/game';
import { castleEntrance } from '../../core/map/occupancy';
import type { Army, GameState } from '../../core/types';
import {
  projectArmyTransfer, splitEvenlyCount, type ArmyExchangeSide,
} from '../components/ArmyExchange';
import { CastleScreen } from '../components/CastleScreen';

function counts(armies: Army[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const stack of armies.flat()) {
    if (stack) result[stack.unitId] = (result[stack.unitId] ?? 0) + stack.count;
  }
  return result;
}

function fixture(): {
  state: GameState; hero: ArmyExchangeSide; garrison: ArmyExchangeSide;
} {
  const state = createGame({ seed: 7051, p1: 'human', p2: 'dormant' });
  const hero = state.players.p1.hero!;
  const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
  hero.position = castleEntrance(castle);
  hero.army = makeArmy([
    { unitId: 'yeoman', count: 9 }, { unitId: 'longbowman', count: 4 },
  ]);
  castle.garrison = makeArmy([
    { unitId: 'yeoman', count: 2 }, { unitId: 'bannerman', count: 6 },
  ]);
  return {
    state,
    hero: { label: hero.name, holder: { kind: 'hero', id: hero.id }, army: hero.army },
    garrison: {
      label: 'City garrison', holder: { kind: 'garrison', id: castle.id },
      army: castle.garrison,
    },
  };
}

describe('direct castle army transfer', () => {
  it('projects legal full moves, merges, and swaps through the real reducer', () => {
    const { state, hero, garrison } = fixture();
    const before = JSON.stringify(state);
    const move = projectArmyTransfer(state, {
      source: hero, sourceSlot: 1, destination: garrison, destinationSlot: 6, count: 4,
    });
    const merge = projectArmyTransfer(state, {
      source: hero, sourceSlot: 0, destination: garrison, destinationSlot: 0, count: 9,
    });
    const swap = projectArmyTransfer(state, {
      source: hero, sourceSlot: 1, destination: garrison, destinationSlot: 1, count: 4,
    });
    expect(move).toMatchObject({ legal: true, mode: 'move', sourceAfter: 'empty',
      destinationAfter: '4 Longbowman' });
    expect(merge).toMatchObject({ legal: true, mode: 'merge', destinationAfter: '11 Yeoman' });
    expect(swap).toMatchObject({ legal: true, mode: 'swap', sourceAfter: '6 Bannerman',
      destinationAfter: '4 Longbowman' });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('supports exact and even partial transfers while explaining illegal partial swaps', () => {
    const { state, hero, garrison } = fixture();
    expect(splitEvenlyCount(9)).toBe(4);
    const exact = projectArmyTransfer(state, {
      source: hero, sourceSlot: 0, destination: garrison, destinationSlot: 6, count: 3,
    });
    const evenly = projectArmyTransfer(state, {
      source: hero, sourceSlot: 0, destination: garrison, destinationSlot: 6,
      count: splitEvenlyCount(9),
    });
    const illegal = projectArmyTransfer(state, {
      source: hero, sourceSlot: 0, destination: garrison, destinationSlot: 1, count: 3,
    });
    expect(exact).toMatchObject({ legal: true, mode: 'move', sourceAfter: '6 Yeoman',
      destinationAfter: '3 Yeoman' });
    expect(evenly).toMatchObject({ legal: true, sourceAfter: '5 Yeoman',
      destinationAfter: '4 Yeoman' });
    expect(illegal).toMatchObject({ legal: false, mode: 'swap' });
    expect(illegal.reason).toContain('Partial stacks cannot be swapped');
  });

  it('conserves identities and counts and installs a Warden only through TRANSFER_ARMY', () => {
    const { state, hero, garrison } = fixture();
    const heroState = state.players.p1.hero!;
    const castle = state.castles.find((candidate) => candidate.id === garrison.holder.id)!;
    heroState.skills.warden = 1;
    const before = counts([heroState.army, castle.garrison]);
    const projected = projectArmyTransfer(state, {
      source: hero, sourceSlot: 0, destination: garrison, destinationSlot: 6, count: 3,
    });
    const next = apply(state, projected.action);
    const nextHero = next.players.p1.hero!;
    const nextCastle = next.castles.find((candidate) => candidate.id === castle.id)!;
    expect(counts([nextHero.army, nextCastle.garrison])).toEqual(before);
    expect(nextHero.army[0]).toEqual({ unitId: 'yeoman', count: 6 });
    expect(nextCastle.garrison[6]).toEqual({ unitId: 'yeoman', count: 3 });
    expect(nextCastle.wardenHeroId).toBe(heroState.id);
  });

  it('shows a truthful read-only garrison instead of transfer controls for a remote castle', () => {
    const { state } = fixture();
    const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
    state.players.p1.hero!.position = { x: 10, y: 10 };
    const before = JSON.stringify(state);
    const html = renderToStaticMarkup(<CastleScreen state={state} castle={castle}
      dispatch={() => undefined} onClose={() => undefined} />);
    expect(html).toContain('Company transfer requires a visiting hero');
    expect(html).toContain('no remote transfer actions are available');
    expect(html).toContain('City garrison');
    expect(html).not.toContain('direct-exchange');
    expect(html).not.toContain('split-stack');
    expect(html).not.toContain('Split this company');
    expect(JSON.stringify(state)).toBe(before);
  });
});
