import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { createBattle } from '../../core/combat/setup';
import { apply, createGame } from '../../core/game';
import type { Action, GameState, PlayerId } from '../../core/types';
import { buildBattleResult } from '../battleResult';
import { BattleResult } from '../components/Dialogs';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';

type Controller = GameState['players'][PlayerId]['controller'];

function heroBattle({
  attacker = 'human', defender = 'ai', attackerWins = true,
}: { attacker?: Controller; defender?: Controller; attackerWins?: boolean } = {}): GameState {
  const state = createGame({ seed: 6201, p1: attacker, p2: defender, difficulty: 'normal' });
  const attackerHero = state.players.p1.hero!;
  const defenderHero = state.players.p2.hero!;
  attackerHero.army = attackerWins
    ? makeArmy([{ unitId: 'oriflammeWyvern', count: 40 }])
    : makeArmy([{ unitId: 'yeoman', count: 1 }]);
  defenderHero.army = attackerWins
    ? makeArmy([{ unitId: 'tinSoldier', count: 1 }])
    : makeArmy([{ unitId: 'ferry', count: 40 }]);
  const [battle] = createBattle(
    attackerHero.army, defenderHero.army, attackerHero, defenderHero,
    {
      kind: 'hero', targetId: defenderHero.id, destination: defenderHero.position,
      attackerHeroId: attackerHero.id, defenderHeroId: defenderHero.id,
      defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = [];
  battle.obstacleProps = [];
  state.phase = 'combat';
  state.battle = battle;
  state.pendingChoice = null;
  state.replay = [];
  return state;
}

function resolve(state: GameState, action: Action = { type: 'AUTO_COMBAT' }) {
  const before = structuredClone(state);
  const next = apply(state, action);
  const resolutionSnapshot = JSON.stringify(next);
  const result = buildBattleResult(before, next, action, null)!;
  expect(JSON.stringify(next)).toBe(resolutionSnapshot);
  return { before, next, result };
}

describe('player-relative battle results', () => {
  it.each([
    ['human attacker win', 'human', 'ai', true, 'victory', 'Victory'],
    ['human attacker loss', 'human', 'ai', false, 'defeat', 'Defeat'],
    ['human defender win', 'ai', 'human', false, 'victory', 'Victory'],
    ['human defender loss', 'ai', 'human', true, 'defeat', 'Defeat'],
  ] as const)('%s uses the viewing human perspective', (
    _name, attacker, defender, attackerWins, perspective, heading,
  ) => {
    const { result } = resolve(heroBattle({ attacker, defender, attackerWins }));
    expect(result.perspective).toBe(perspective);
    expect(result.heading).toBe(heading);
    expect(result.humanSide).toContain(attacker === 'human' ? 'Attacker' : 'Defender');
    expect(result.actualWinner).toContain(attackerWins ? 'attacker' : 'defender');
  });

  it.each([true, false])('names the winner rather than claiming shared hot-seat %s', (attackerWins) => {
    const { result } = resolve(heroBattle({
      attacker: 'human', defender: 'human', attackerWins,
    }));
    expect(result.perspective).toBe('hotseat');
    expect(result.heading).toBe(`${attackerWins ? result.attacker.player : result.defender.player} wins`);
    expect(result.humanSide).toContain('Both sides');
    expect(result.humanSide).toContain('hot seat');
  });

  it('renders actors, encounter, actual winner, casualties, loot, Tavern result, and destination', () => {
    const state = heroBattle({ attackerWins: true });
    const defender = state.players.p2.hero!;
    defender.artifacts.backpack.push({ id: 'saltCrustedCompass' });
    state.battle!.defenderHero!.artifacts.backpack.push({ id: 'saltCrustedCompass' });
    const { result } = resolve(state);
    const html = renderToStaticMarkup(<BattleResult
      result={result} onClose={() => undefined} />);
    expect(html).toContain('Hero engagement');
    expect(html).toContain('Human-controlled side');
    expect(html).toContain('Actual winner');
    expect(html).toContain('Attacker losses');
    expect(html).toContain('Defender losses');
    expect(html).toContain('Salt-Crusted Compass');
    expect(html).toContain(ASSET_MANIFEST[
      assetId.mapObject('artifact', 'saltCrustedCompass')
    ].file);
    expect(html).toContain('Tavern return');
    expect(html).toContain('Re-hire costs');
    expect(html).toContain('Continue to adventure map');
  });
});

describe('consequence-complete battle contexts', () => {
  it('reports guardian removal, protected objective, loot, XP, recovery, and pending choice', () => {
    const state = createGame({ seed: 6202, p1: 'human', p2: 'ai' });
    const attacker = state.players.p1.hero!;
    attacker.army = makeArmy([{ unitId: 'oriflammeWyvern', count: 40 }]);
    const guardian = state.map.objects.find((object) => object.kind === 'guardian'
      && object.protects)!;
    if (guardian.kind !== 'guardian') throw new Error('Guardian fixture missing');
    guardian.army = [{ unitId: 'tinSoldier', count: 1 }];
    guardian.drop = { id: 'potionOfVigor' };
    const [battle] = createBattle(
      attacker.army, guardian.army, attacker, null,
      {
        kind: 'guardian', targetId: guardian.id, destination: guardian.position,
        attackerHeroId: attacker.id, completeMoveTo: guardian.position,
        battlefield: 'land', terrain: 'meadow',
      }, state.rng,
    );
    state.battle = battle; state.phase = 'combat'; state.pendingChoice = null;
    const before = structuredClone(state);
    const next = apply(state, { type: 'AUTO_COMBAT' });
    next.lastBattleRecovered = { oriflammeWyvern: 2 };
    next.pendingChoice = {
      kind: 'level', playerId: 'p1', heroId: attacker.id,
      options: ['attack', 'defense', 'knowledge'], canSkip: false, canReroll: false,
    };
    const result = buildBattleResult(before, next, { type: 'AUTO_COMBAT' }, null)!;
    expect(result.encounter).toContain('protecting');
    expect(result.xp?.amount).toBeGreaterThan(0);
    expect(result.recovered).toEqual([{ unit: 'Oriflamme Wyvern', count: 2 }]);
    expect(result.consequences).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Guardian', detail: expect.stringContaining('removed') }),
      expect.objectContaining({ label: 'Loot', detail: expect.stringContaining('Potion of Vigor') }),
      expect.objectContaining({ label: 'Recovery', detail: expect.stringContaining('Oriflamme Wyvern') }),
    ]));
    expect(result.continuation.label).toBe('Continue to level-up choice');
    const html = renderToStaticMarkup(<BattleResult result={result} onClose={() => undefined} />);
    expect(html).toContain(ASSET_MANIFEST[assetId.mapObject('item', 'potionOfVigor')].file);
  });

  it('reports castle capture and preserved defender ownership on opposite outcomes', () => {
    const castleFight = (attackerWins: boolean) => {
      const state = createGame({ seed: attackerWins ? 6203 : 6204, p1: 'human', p2: 'ai' });
      const attacker = state.players.p1.hero!;
      const castle = state.castles.find((candidate) => candidate.owner === 'p2')!;
      attacker.army = attackerWins
        ? makeArmy([{ unitId: 'oriflammeWyvern', count: 40 }])
        : makeArmy([{ unitId: 'yeoman', count: 1 }]);
      castle.garrison = attackerWins
        ? makeArmy([{ unitId: 'tinSoldier', count: 1 }])
        : makeArmy([{ unitId: 'ferry', count: 40 }]);
      const [battle] = createBattle(
        attacker.army, castle.garrison, attacker, null,
        {
          kind: 'castle', targetId: castle.id, destination: castle.position,
          attackerHeroId: attacker.id, defenderPlayerId: 'p2',
          battlefield: 'land', terrain: 'meadow',
        }, state.rng,
      );
      state.battle = battle; state.phase = 'combat'; state.pendingChoice = null;
      return resolve(state).result;
    };
    expect(castleFight(true).consequences).toContainEqual(expect.objectContaining({
      label: 'City ownership', detail: expect.stringContaining('captured'),
    }));
    expect(castleFight(false).consequences).toContainEqual(expect.objectContaining({
      label: 'City ownership', detail: expect.stringContaining('remains'),
    }));
  });

  it.each([
    ['BATTLE_RETREAT', 'Retreat', 'army was lost'],
    ['BATTLE_SURRENDER', 'Surrender', 'retained the surviving army'],
  ] as const)('reports %s and its complete Tavern consequence', (type, label, detail) => {
    const state = heroBattle({ attacker: 'human', defender: 'human' });
    const battle = state.battle!;
    battle.currentStackId = battle.stacks.find((stack) => stack.side === 'attacker')!.id;
    state.players.p1.resources.gold = 100_000;
    const action = { type } as Action;
    const { result } = resolve(state, action);
    expect(result.winner).toBe('defender');
    expect(result.consequences).toEqual(expect.arrayContaining([
      expect.objectContaining({ label, detail: expect.stringContaining(detail) }),
      expect.objectContaining({ label: 'Tavern return', detail: expect.stringContaining('Tavern pool') }),
    ]));
  });

  it('reports an AI retreat produced inside auto-resolution', () => {
    const state = heroBattle({ attacker: 'human', defender: 'ai', attackerWins: false });
    state.battle!.attackerHero.level = 4;
    state.battle!.attackerHero.withdrawalGold = 0;
    const { next, result } = resolve(state);
    expect(next.lastMessage).toBe('The attacker retreated.');
    expect(result.consequences).toContainEqual(expect.objectContaining({
      label: 'Retreat', detail: expect.stringContaining('army was lost'),
    }));
  });
});
