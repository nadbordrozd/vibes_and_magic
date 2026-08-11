import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { apply, createGame } from '../../core/game';
import { castleEntrance } from '../../core/map/occupancy';
import type { Hero } from '../../core/types';
import {
  armyTransferDescription, type ArmyExchangeSide,
} from '../components/ArmyExchange';
import {
  ArtifactPaperDoll, compatibleEquipmentSlots, equipmentResultPreview,
} from '../components/ArtifactPaperDoll';
import { ExchangeScreen, itemTransferAction } from '../components/ExchangeScreen';

function heroes(): [ReturnType<typeof createGame>, Hero, Hero] {
  const state = createGame({
    seed: 5202, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
  });
  const [left, right] = state.players.p1.heroes;
  if (!left || !right) throw new Error('Grand Muster must provide two player heroes');
  return [state, left, right];
}

describe('explicit exchange and equipment UI', () => {
  it('builds exact move, merge, and whole-company swap actions in both directions', () => {
    const [, left, right] = heroes();
    left.army = [{ unitId: 'yeoman', count: 10 }, null, null, null, null, null, null];
    right.army = [null, { unitId: 'yeoman', count: 4 },
      { unitId: 'bannerman', count: 3 }, null, null, null, null];
    const leftSide: ArmyExchangeSide = {
      label: `${left.name} (hero)`, holder: { kind: 'hero', id: left.id }, army: left.army,
    };
    const rightSide: ArmyExchangeSide = {
      label: `${right.name} (hero)`, holder: { kind: 'hero', id: right.id }, army: right.army,
    };
    const partial = armyTransferDescription({ source: leftSide, sourceSlot: 0,
      destination: rightSide, destinationSlot: 1, count: 6 });
    expect(partial).toMatchObject({ mode: 'merge', sourceAfter: '4 Yeoman',
      destinationAfter: '10 Yeoman' });
    expect(partial.action).toMatchObject({ source: { id: left.id }, destination: { id: right.id },
      sourceSlot: 0, destinationSlot: 1, count: 6 });
    const reverse = armyTransferDescription({ source: rightSide, sourceSlot: 2,
      destination: leftSide, destinationSlot: 0, count: 1 });
    expect(reverse).toMatchObject({ mode: 'swap', countLockedReason: expect.stringContaining('whole') });
    expect(reverse.action).toMatchObject({ source: { id: right.id }, destination: { id: left.id },
      count: 3 });
  });

  it('keeps consumable direction and occupied destination explicit until dispatch', () => {
    const [, left, right] = heroes();
    expect(itemTransferAction(left, right, { side: 'left', slot: 2 }, 4)).toEqual({
      type: 'TRANSFER_ITEM', sourceHeroId: left.id, destinationHeroId: right.id,
      sourceSlot: 2, destinationSlot: 4,
    });
    expect(itemTransferAction(left, right, { side: 'right', slot: 5 }, 1)).toEqual({
      type: 'TRANSFER_ITEM', sourceHeroId: right.id, destinationHeroId: left.id,
      sourceSlot: 5, destinationSlot: 1,
    });
    left.inventory[0] = { id: 'waybread' };
    right.inventory[1] = { id: 'saltedMeat' };
    const before = JSON.stringify([left.inventory, right.inventory]);
    const html = renderToStaticMarkup(<ExchangeScreen source={left} destination={right}
      dispatch={() => undefined} onClose={() => undefined} />);
    expect(html).toContain(`${left.name} ⇄ ${right.name}`);
    expect(html).toContain('both directions');
    expect(html).toContain('Every company or item waits for a final confirmation');
    expect(html).toContain('standard hero-to-hero artifact transfer is not');
    expect(JSON.stringify([left.inventory, right.inventory])).toBe(before);
  });

  it('builds and applies the existing garrison-to-hero direction without changing rules', () => {
    const [state, hero] = heroes();
    const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
    hero.position = castleEntrance(castle);
    hero.army = [null, null, null, null, null, null, null];
    castle.garrison = [{ unitId: 'bannerman', count: 9 }, null, null, null, null, null, null];
    const garrison: ArmyExchangeSide = {
      label: 'City garrison', holder: { kind: 'garrison', id: castle.id },
      army: castle.garrison,
    };
    const visitingHero: ArmyExchangeSide = {
      label: `${hero.name} (visiting hero)`, holder: { kind: 'hero', id: hero.id },
      army: hero.army,
    };
    const preview = armyTransferDescription({ source: garrison, sourceSlot: 0,
      destination: visitingHero, destinationSlot: 4, count: 3 });
    expect(preview).toMatchObject({ mode: 'move', sourceAfter: '6 Bannerman',
      destinationAfter: '3 Bannerman', sourceSlotsAfter: 1, destinationSlotsAfter: 1 });
    const next = apply(state, preview.action);
    expect(next.castles.find((candidate) => candidate.id === castle.id)!.garrison[0])
      .toEqual({ unitId: 'bannerman', count: 6 });
    expect(next.players.p1.heroes.find((candidate) => candidate.id === hero.id)!.army[4])
      .toEqual({ unitId: 'bannerman', count: 3 });
  });

  it('exposes both ring and both misc destinations and previews displacement', () => {
    const [state, hero] = heroes();
    hero.artifacts.backpack = [{ id: 'queensAmber' }, { id: 'patternbook' }];
    hero.artifacts.equipment.ring1 = { id: 'beggarsRing' };
    hero.artifacts.equipment.misc2 = { id: 'mirrorMask' };
    expect(compatibleEquipmentSlots(hero, 0)).toEqual(['ring1', 'ring2']);
    expect(compatibleEquipmentSlots(hero, 1)).toEqual(['misc1', 'misc2']);
    expect(equipmentResultPreview(hero, 0, 'ring1'))
      .toContain("Beggar's Ring is displaced to the backpack");
    expect(equipmentResultPreview(hero, 1, 'misc1')).toContain('nothing is displaced');
    const before = JSON.stringify(hero.artifacts);
    const html = renderToStaticMarkup(<ArtifactPaperDoll state={state} hero={hero}
      dispatch={() => undefined} />);
    expect(html).toContain('Ring 1');
    expect(html).toContain('Ring 2');
    expect(html).toContain('Misc 1');
    expect(html).toContain('Misc 2');
    expect(html).toContain('Burden · locked');
    expect(html).toContain('Throw 5000 gold into a Wishing Well');
    expect(html).toContain('choose 2 compatible slots');
    expect(JSON.stringify(hero.artifacts)).toBe(before);
  });
});
