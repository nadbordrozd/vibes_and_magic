import { describe, expect, it } from 'vitest';
import { chooseCombatAction } from '../../ai/combat';
import { runStrategyTurn } from '../../ai/strategy';
import {
  CREATURE_ASSET_REQUIREMENTS, DOC63_64_CREATURE_IDS, NEUTRAL_CREATURE_ACQUISITION,
  UNITS, validateUnits,
} from '../../content/units';
import { createManywhere } from '../../content/maps/manywhere';
import { validateContentAssets } from '../../content/v2/assets';
import { makeArmy } from '../army';
import { createBattle, legalBattleActions } from '../combat/battle';
import { applyRoundMorale } from '../combat/round';
import { createGame } from '../game';
import { inspectTarget, mapObjectName } from '../../ui/inspection';

const EXPECTED = [
  'seamMoth', 'chalkWight', 'emberToad', 'glassHound', 'tallyman',
  'lanternBearer', 'boneOrchard', 'stitchOx', 'nineMouthedWell', 'kilnDrake',
  'whistlingNan', 'unbaptized', 'bellfounder',
] as const;

describe('docs 63–64 neutral and showcase creature content', () => {
  it('ships the exact thirteen unique, complete, balanced authored rows', () => {
    expect(DOC63_64_CREATURE_IDS).toEqual(EXPECTED);
    expect(Object.keys(UNITS)).toHaveLength(63);
    expect(() => validateUnits()).not.toThrow();
    expect(new Set(EXPECTED.map((id) => UNITS[id].name))).toHaveLength(13);
    for (const id of EXPECTED) {
      const unit = UNITS[id];
      expect(unit).toMatchObject({ id, hexSize: expect.any(Number) });
      expect(unit.hp).toBeGreaterThan(0);
      expect(unit.damage[1]).toBeGreaterThanOrEqual(unit.damage[0]);
      expect(unit.attack).toBeGreaterThan(0); expect(unit.defense).toBeGreaterThan(0);
      expect(unit.speed).toBeGreaterThan(0); expect(unit.growth).toBeGreaterThan(0);
      expect(Object.values(unit.cost).some((amount) => (amount ?? 0) > 0)).toBe(true);
      expect(unit.flavor).not.toContain('keeps its own old customs');
      expect(unit.abilities.length).toBeGreaterThanOrEqual(2);
    }
    expect(UNITS.stitchOx.hexSize).toBe(2);
    expect(UNITS.nineMouthedWell.hexSize).toBe(3);
  });

  it('preserves every printed ability, caster repertoire, pattern, resistance, and drawback', () => {
    expect(UNITS.seamMoth).toMatchObject({
      abilities: ['flying', 'spellbound', 'mana_leech'],
      resistances: [{ kind: 'spellbound' }],
    });
    expect(UNITS.lanternBearer.caster).toEqual({
      repertoire: ['kindle', 'blessing'], charges: 3, castPower: 3,
    });
    expect(UNITS.whistlingNan.caster).toEqual({
      repertoire: ['wither', 'quiet'], charges: 3, castPower: 4,
    });
    expect(UNITS.bellfounder.caster).toEqual({
      repertoire: ['steadyHands', 'clarion'], charges: 2, castPower: 3,
    });
    expect(UNITS.kilnDrake).toMatchObject({
      hexSize: 1, attackPattern: { kind: 'breath' },
      resistances: [{ kind: 'counter-immune', counter: 'burn' }],
      abilities: ['flying', 'beast', 'breath', 'unburnable', 'hungry'],
    });
    expect(UNITS.nineMouthedWell).toMatchObject({
      attackPattern: { kind: 'all-adjacent' },
      abilities: ['all_adjacent', 'unstable', 'slow_witted'],
    });
    expect(UNITS.unbaptized).toMatchObject({
      abilities: ['spellbound', 'mindless', 'cornered'],
      resistances: [{ kind: 'spellbound' }],
    });
    expect(UNITS.bellfounder.resistances).toEqual([{ kind: 'low-magic-immune' }]);
  });

  it('authors one named dwelling/acquisition row each and covers all thirteen on Manywhere', () => {
    expect(NEUTRAL_CREATURE_ACQUISITION).toHaveLength(13);
    expect(new Set(NEUTRAL_CREATURE_ACQUISITION.map((row) => row.dwellingName))).toHaveLength(13);
    const map = createManywhere(12013);
    for (const row of NEUTRAL_CREATURE_ACQUISITION) {
      expect(row.channels).toContain('field-dwelling');
      expect(row.channels).toContain('diplomacy');
      expect(row.mapIds).toContain('manywhere');
      const dwelling = map.objects.find((object) => object.kind === 'dwelling'
        && object.unitId === row.unitId);
      expect(dwelling, row.unitId).toBeDefined();
      expect(mapObjectName(dwelling!)).toBe(row.dwellingName);
      expect(map.objects.some((object) => object.kind === 'guardian'
        && object.protects === dwelling!.id
        && object.army.some((stack) => stack.unitId === row.unitId)), row.unitId).toBe(true);
    }
    for (const id of ['emberToad', 'glassHound', 'kilnDrake'] as const) {
      expect(NEUTRAL_CREATURE_ACQUISITION.find((row) => row.unitId === id)?.channels)
        .toEqual(expect.arrayContaining(['beast-tongue', 'beastmaster']));
    }
  });

  it('uses honest distinct development placeholders and fails all release art gates', () => {
    expect(CREATURE_ASSET_REQUIREMENTS).toHaveLength(26);
    expect(new Set(CREATURE_ASSET_REQUIREMENTS.map((row) => row.canonicalId))).toHaveLength(26);
    expect(new Set(CREATURE_ASSET_REQUIREMENTS.map((row) => row.nativeAssetId))).toHaveLength(26);
    expect(new Set(CREATURE_ASSET_REQUIREMENTS.map((row) => row.visualSubject))).toHaveLength(26);
    expect(validateContentAssets(CREATURE_ASSET_REQUIREMENTS, new Set(), 'development'))
      .toHaveLength(26);
    expect(() => validateContentAssets(CREATURE_ASSET_REQUIREMENTS, new Set(), 'release'))
      .toThrow(/Release asset missing/);
  });

  it('shows culture, footprint, caster details, acquisition, drawbacks, and morale cost before hire', () => {
    const game = createGame({ seed: 1213, p1: 'human', p2: 'human' });
    const nan = inspectTarget(game, { kind: 'unit', id: 'whistlingNan' })!;
    expect(nan.mechanics).toEqual(expect.arrayContaining([
      expect.stringContaining('Hagwood Neutral culture'),
      'Footprint 1 hex',
      expect.stringContaining('Caster repertoire: Wither, Quiet · 3 company charges'),
      expect.stringContaining("Field dwelling: Nan's Bent Gate"),
      expect.stringContaining('mixed-culture armies take the ordinary morale penalty'),
      expect.stringContaining('Dread:'),
    ]));
    const drake = inspectTarget(game, { kind: 'unit', id: 'kilnDrake' })!;
    expect(drake.mechanics).toEqual(expect.arrayContaining([
      expect.stringContaining('Hungry:'), expect.stringContaining('Breath:'),
      expect.stringContaining('Unburnable:'),
    ]));
  });

  it('enumerates deterministic legal creature casts and combat AI chooses one without an ID branch', () => {
    const game = createGame({ seed: 6412, p1: 'human', p2: 'ai' });
    const [battle] = createBattle(makeArmy([{ unitId: 'bellfounder', count: 3 }]),
      makeArmy([{ unitId: 'yeoman', count: 12 }]), game.players.p1.hero!,
      game.players.p2.hero!, {
        kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 4, y: 4 },
        attackerHeroId: game.players.p1.hero!.id,
        defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
      }, 6412);
    battle.obstacles = []; battle.currentStackId = 'attacker-0';
    const legal = legalBattleActions(battle).filter((action) => action.type === 'BATTLE_USE_ABILITY'
      && action.abilityId === 'caster');
    expect(legal.some((action) => 'spellId' in action && action.spellId === 'steadyHands')).toBe(true);
    expect(legal.some((action) => 'spellId' in action && action.spellId === 'clarion')).toBe(true);
    battle.castRound.attacker = battle.round;
    expect(chooseCombatAction(battle)).toEqual(expect.objectContaining({
      type: 'BATTLE_USE_ABILITY', abilityId: 'caster',
    }));
  });

  it('applies the ordinary mixed-culture morale penalty to recruited neutral bodies', () => {
    const game = createGame({ seed: 6312, p1: 'human', p2: 'human' });
    const [battle] = createBattle(makeArmy([
      { unitId: 'yeoman', count: 10 }, { unitId: 'seamMoth', count: 5 },
    ]), makeArmy([{ unitId: 'tinSoldier', count: 10 }]), game.players.p1.hero!,
    game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 4, y: 4 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 6312);
    battle.attackerHero.moraleBonus = 20;
    applyRoundMorale(battle);
    expect(battle.stacks.filter((stack) => stack.side === 'attacker')
      .every((stack) => stack.morale === 15)).toBe(true);
  });

  it('lets strategy AI buy the maximum legal affordable field-dwelling company deterministically', () => {
    const game = createGame({ seed: 1313, mapId: 'manywhere', p1: 'ai', p2: 'dormant' });
    const dwelling = game.map.objects.find((object) => object.kind === 'dwelling'
      && object.unitId === 'seamMoth')!;
    if (dwelling.kind !== 'dwelling') throw new Error('fixture dwelling missing');
    game.map.objects = game.map.objects.filter((object) => object.kind !== 'guardian'
      || object.protects !== dwelling.id);
    const hero = game.players.p1.hero!; hero.position = { ...dwelling.position };
    game.players.p1.resources = { gold: 100_000, timber: 100, iron: 100, essence: 100 };
    const before = dwelling.available;
    const next = runStrategyTurn(game);
    const recruited = next.players.p1.heroes.flatMap((candidate) => candidate.army)
      .find((stack) => stack?.unitId === 'seamMoth');
    expect(recruited?.count).toBe(before);
    expect(next.replay.some((action) => action.type === 'RECRUIT_DWELLING'
      && action.objectId === dwelling.id && action.count === before)).toBe(true);
  });
});
