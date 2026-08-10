import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../../core/game';
import { friendlyHeroMeetingPlan } from '../../core/game/navigation';
import { reachableAdventureTiles } from '../../core/selectors';
import { actionSave, replaySave, stateHash } from '../persistence';
import { AdventureMap } from '../components/AdventureMap';

function fixture() {
  const state = createGame({
    seed: 8064, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
  });
  const [source, target] = state.players.p1.heroes;
  source.position = { x: 8, y: 8 };
  source.movement = 2_000;
  target.position = { x: 12, y: 8 };
  state.players.p1.explored = Array.from({ length: state.map.height }, (_, y) =>
    Array.from({ length: state.map.width }, (_, x) => `${x},${y}`)).flat();
  state.map.objects = state.map.objects.filter((object) =>
    Math.max(Math.abs(object.position.x - 10), Math.abs(object.position.y - 8)) > 4);
  state.castles = state.castles.filter((castle) =>
    Math.max(Math.abs(castle.position.x - 10), Math.abs(castle.position.y - 8)) > 5);
  return { state, source, target };
}

describe('friendly hero meeting map presentation', () => {
  it('exposes exchange and attack as distinct accessible map intents', () => {
    const { state, source, target } = fixture();
    const enemy = state.players.p2.heroes[0];
    enemy.position = { x: 14, y: 8 };
    enemy.alive = true;
    state.players.p2.explored = [...state.players.p1.explored];
    const meeting = friendlyHeroMeetingPlan(state, target.id);
    if (!meeting.ok) throw new Error(meeting.reason);
    const before = JSON.stringify(state);
    const html = renderToStaticMarkup(<AdventureMap state={state} hero={source}
      reachable={reachableAdventureTiles(state)} path={meeting.plan.path}
      movement={null} mapStep={0} onTile={() => undefined}
      onSelectHero={() => undefined} onMeetHero={() => undefined}
      onPreviewHero={() => undefined} onPreview={() => undefined}
      onPickup={() => undefined} />);
    expect(html).toContain(`data-inspect-id="${target.id}"`);
    expect(html).toContain('data-map-intent="exchange"');
    expect(html).toContain(`aria-label="Exchange with ${target.name}. Move to a safe adjacent tile first if needed."`);
    expect(html).toContain('friendly-exchange-target');
    expect(html).toContain('data-map-intent="attack"');
    expect(html).toContain(`aria-label="Attack ${enemy.name}."`);
    expect(html).toContain('enemy-attack-target');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('applies both-direction transfer actions deterministically without UI mutation', () => {
    const { state: fixtureState, source, target } = fixture();
    let state = fixtureState;
    source.army[0] = { unitId: 'yeoman', count: 9 };
    target.army[6] = null;
    source.inventory[0] = { id: 'waybread' };
    target.inventory[1] = { id: 'saltedMeat' };
    const meeting = friendlyHeroMeetingPlan(fixtureState, target.id);
    if (!meeting.ok) throw new Error(meeting.reason);
    const actions = [{ type: 'MOVE_HERO', destination: meeting.plan.destination }, {
      type: 'TRANSFER_ARMY', source: { kind: 'hero', id: source.id }, sourceSlot: 0,
      destination: { kind: 'hero', id: target.id }, destinationSlot: 6, count: 3,
    }, {
      type: 'TRANSFER_ARMY', source: { kind: 'hero', id: target.id }, sourceSlot: 6,
      destination: { kind: 'hero', id: source.id }, destinationSlot: 0, count: 1,
    }, {
      type: 'TRANSFER_ITEM', sourceHeroId: target.id, destinationHeroId: source.id,
      sourceSlot: 1, destinationSlot: 0,
    }] as const;
    for (const action of actions) state = apply(state, action);
    let replayed = structuredClone(fixtureState);
    for (const action of actions) replayed = apply(replayed, action);
    expect(stateHash(replayed)).toBe(stateHash(state));
    const replaySource = replayed.players.p1.heroes.find((hero) => hero.id === source.id)!;
    const replayTarget = replayed.players.p1.heroes.find((hero) => hero.id === target.id)!;
    expect(replaySource.army[0]).toEqual({ unitId: 'yeoman', count: 7 });
    expect(replayTarget.army[6]).toEqual({ unitId: 'yeoman', count: 2 });
    expect(replaySource.inventory[0]).toEqual({ id: 'saltedMeat' });
    expect(replayTarget.inventory[1]).toEqual({ id: 'waybread' });
  });

  it('round-trips a real meeting move through the canonical action save', () => {
    let state = createGame({
      seed: 8065, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
    });
    const [source, target] = state.players.p1.heroes;
    const meeting = friendlyHeroMeetingPlan(state, target.id);
    if (!meeting.ok) throw new Error(meeting.reason);
    expect(meeting.plan.cost).toBeLessThanOrEqual(source.movement);
    state = apply(state, { type: 'MOVE_HERO', destination: meeting.plan.destination });
    const save = actionSave(state);
    expect(save.actionLog.at(-1)).toEqual({
      type: 'MOVE_HERO', destination: meeting.plan.destination,
    });
    expect(stateHash(replaySave(save, true))).toBe(stateHash(state));
  });
});
