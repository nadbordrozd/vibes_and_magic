import { describe, expect, it } from 'vitest';
import { UNITS } from '../../content/units';
import {
  AI_ASSAULT_STRENGTH_RATIO, AI_GATHERER_THREAT_RATIO, AI_GUARDIAN_SAFETY_RATIO,
  SIREN_LISTEN_STRENGTH_RATIO,
} from '../../content/constants';
import {
  armyPower, makeArmy, unitStrength,
} from '../army';
import { createGame } from '../game';
import { chooseBargain } from '../game/bargains';
import { moveHero } from '../game/exploration';
import { guardianAggroTiles } from '../map/occupancy';

describe('guardian and army strength rating', () => {
  it('is finite and positive for every legal catalog unit', () => {
    for (const unit of Object.values(UNITS)) {
      expect(Number.isFinite(unitStrength(unit.id)), unit.id).toBe(true);
      expect(unitStrength(unit.id), unit.id).toBeGreaterThan(0);
    }
  });

  it('is linear in count for an otherwise identical stack', () => {
    for (const unit of Object.values(UNITS)) {
      const one = armyPower(makeArmy([{ unitId: unit.id, count: 1 }]));
      const seven = armyPower(makeArmy([{ unitId: unit.id, count: 7 }]));
      expect(seven, unit.id).toBeCloseTo(one * 7, 10);
    }
  });

  it('is additive across stacks and independent of slot arrangement', () => {
    const mixed = makeArmy([
      { unitId: 'yeoman', count: 12 },
      { unitId: 'longbowman', count: 5 },
      { unitId: 'lanceKnight', count: 2 },
    ]);
    const separated = armyPower(makeArmy([{ unitId: 'yeoman', count: 12 }]))
      + armyPower(makeArmy([{ unitId: 'longbowman', count: 5 }]))
      + armyPower(makeArmy([{ unitId: 'lanceKnight', count: 2 }]));
    expect(armyPower(mixed)).toBeCloseTo(separated, 10);
    expect(armyPower([null, mixed[2], null, mixed[0], mixed[1], null, null]))
      .toBeCloseTo(separated, 10);
  });

  it('accounts for attack, defense, speed, ranged reach, and bounded ability roles', () => {
    expect(unitStrength('longbowman')).toBeGreaterThan(unitStrength('yeoman'));
    expect(unitStrength('hobbyKnight')).toBeGreaterThan(unitStrength('longbowman'));
    expect(unitStrength('thunderbird')).toBeGreaterThan(unitStrength('hullTurtle'));
    expect(unitStrength('siegeWall')).toBeGreaterThan(0);
  });

  it('pins the deliberately recalibrated AI and Siren safety margins', () => {
    expect(AI_GUARDIAN_SAFETY_RATIO).toBe(0.8);
    expect(AI_ASSAULT_STRENGTH_RATIO).toBe(1.25);
    expect(SIREN_LISTEN_STRENGTH_RATIO).toBe(1.25);
    expect(AI_GATHERER_THREAT_RATIO).toBe(1.5);
  });

  it('sizes Borrowed Legion through the same per-unit rating', () => {
    const state = createGame({
      seed: 3901, p1: 'human', p2: 'human', p1Faction: 'hagwood',
    });
    const hero = state.players.p1.hero!;
    hero.army = makeArmy([{ unitId: 'oriflammeWarden', count: 4 }]);
    state.pendingChoice = {
      kind: 'bargain', playerId: 'p1', heroId: hero.id,
      options: ['borrowedLegion'], source: 'post',
    };
    const expected = Math.round(armyPower(hero.army) * 0.8 / unitStrength('candleWisps'));
    chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: 'borrowedLegion' });
    expect(hero.army.find((stack) => stack?.unitId === 'candleWisps')?.count).toBe(expected);
  });

  it('applies the Quiet Horseshoe boundary through centralized army strength', () => {
    const encounter = (guardianCount: number) => {
      const state = createGame({ seed: 3902 + guardianCount, p1: 'human', p2: 'human' });
      const hero = state.players.p1.hero!;
      const guardian = state.map.objects.find((object) => object.kind === 'guardian')!;
      if (guardian.kind !== 'guardian') throw new Error('guardian fixture missing');
      hero.army = makeArmy([{ unitId: 'yeoman', count: 20 }]);
      hero.artifacts.equipment.misc1 = { id: 'quietHorseshoe' };
      guardian.army = [{ unitId: 'yeoman', count: guardianCount }];
      hero.position = guardianAggroTiles(guardian, state.map)[0];
      hero.movement = 2_000;
      moveHero(state, guardian.position);
      return { state, guardian };
    };
    const atThreshold = encounter(5);
    expect(atThreshold.state.map.objects.some((object) =>
      object.id === atThreshold.guardian.id)).toBe(false);
    expect(atThreshold.state.battle).toBeNull();
    const aboveThreshold = encounter(6);
    expect(aboveThreshold.state.map.objects.some((object) =>
      object.id === aboveThreshold.guardian.id)).toBe(true);
    expect(aboveThreshold.state.battle?.context.targetId).toBe(aboveThreshold.guardian.id);
  });
});
