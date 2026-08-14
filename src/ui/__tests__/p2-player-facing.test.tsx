import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { createBattle } from '../../core/combat/battle';
import { p2WeatherForecastForSide, p2WeatherForRound } from '../../core/combat/p2SpellEffects';
import { createGame } from '../../core/game';
import { castAdventureSpell } from '../../core/game/adventureSpells';
import { CombatScreen } from '../components/CombatScreen';
import { inspectTarget } from '../inspection';

function combatState() {
  const state = createGame({ seed: 9820, p1: 'human', p2: 'human' });
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 10 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 10 }]),
    state.players.p1.hero!, state.players.p2.hero!, {
      kind: 'hero', targetId: state.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: state.players.p1.hero!.id,
      defenderHeroId: state.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 9820,
  );
  state.phase = 'combat'; state.battle = battle;
  return state;
}

function render(state: ReturnType<typeof combatState>) {
  return renderToStaticMarkup(<CombatScreen state={state} dispatch={() => undefined}
    humanControl onSave={() => undefined} onShare={() => undefined} animation={null}
    animationSpeed="instant" onAnimationSpeedChange={() => undefined} />);
}

describe('P2 player-facing intelligence', () => {
  it('shows Scrying+ protected rewards only through the cast day', () => {
    const state = createGame({ seed: 9821, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    hero.knownSpells = ['scrying']; hero.upgradedSpells = ['scrying'];
    hero.mana = 100; hero.movement = 10_000;
    const guardian = state.map.objects.find((object) => object.kind === 'guardian')!;
    const reward = state.map.objects.find((object) => object.kind === 'mine')!;
    if (guardian.kind !== 'guardian') throw new Error('fixture');
    guardian.position = { x: hero.position.x + 2, y: hero.position.y };
    guardian.protects = reward.id;
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'scrying', targetHeroId: hero.id,
    });
    expect(inspectTarget(state, { kind: 'object', id: guardian.id })?.mechanics)
      .toContain(`Protected reward: ${reward.kind === 'mine' && reward.resource === 'gold'
        ? 'Gold Quarry' : reward.kind === 'mine' ? reward.resource === 'timber'
          ? 'Timber Saw Yard' : reward.resource === 'iron' ? 'Iron Headframe Mine'
            : 'Essence Stitchwell' : 'Reward'}.`);
    state.day += 1;
    expect(inspectTarget(state, { kind: 'object', id: guardian.id })?.mechanics
      .some((line) => line.startsWith('Protected reward:'))).toBe(false);
  });

  it('conceals the Steal Away+ recipient from the mine owner', () => {
    const state = createGame({ seed: 9822, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    hero.knownSpells = ['stealAway']; hero.upgradedSpells = ['stealAway'];
    hero.mana = 100; hero.movement = 10_000;
    const mine = state.map.objects.find((object) => object.kind === 'mine')!;
    if (mine.kind !== 'mine') throw new Error('fixture');
    mine.owner = 'p2'; state.players.p1.explored.push(`${mine.position.x},${mine.position.y}`);
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'stealAway', targetId: mine.id });
    state.activePlayer = 'p2'; state.players.p2.discoveredObjectKinds.push('mine');
    const mechanics = inspectTarget(state, { kind: 'object', id: mine.id })?.mechanics ?? [];
    expect(mechanics).toContain(`Production is redirected through day ${state.day + 5}; the recipient is concealed.`);
    expect(mechanics.join(' ')).not.toContain(state.players.p1.name);
  });

  it('renders current weather and only the active upgraded owner’s forecast', () => {
    const state = combatState(); const battle = state.battle!;
    battle.p2Weather = { round: battle.round, kind: 'fog' };
    battle.enchantments.defender.push({
      id: 'weather', spellId: 'theWeatherItself', side: 'defender', multiplier: 1, upgraded: true,
    });
    battle.currentStackId = battle.stacks.find((stack) => stack.side === 'attacker')!.id;
    expect(render(state)).toContain('aria-label="Current weather"');
    expect(render(state)).not.toContain('aria-label="Next weather forecast"');
    battle.currentStackId = battle.stacks.find((stack) => stack.side === 'defender')!.id;
    expect(p2WeatherForecastForSide(battle, 'defender')).not.toBeNull();
    expect(battle.enchantments.defender[0].upgraded).toBe(true);
    const html = render(state);
    expect(html).toContain('aria-label="Next weather forecast"');
    expect(html).toContain(p2WeatherForRound(battle.seed ?? 0, battle.round + 1));
  });
});
