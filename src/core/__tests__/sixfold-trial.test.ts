import { describe, expect, it } from 'vitest';
import { runStrategyTurn } from '../../ai/strategy';
import { ARTIFACTS } from '../../content/artifacts';
import { FACTION_BUILDING_SLOTS } from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import {
  createSixfoldTrial, SIXFOLD_ARTIFACTS, SIXFOLD_GUARDIAN_BANDS,
  SIXFOLD_PLAYER_SETUP, SIXFOLD_RECRUIT_WEEKS, sixfoldMetrics,
} from '../../content/maps/sixfoldTrial';
import { SCHOOL_SPELLS } from '../../content/spells';
import { FACTION_UNITS, UNITS } from '../../content/units';
import { lintMap, lintSixfoldTrial } from '../../tools/mapLint';
import {
  actionSave, createGameLink, loadGameLink, replaySave, stateHash,
} from '../../ui/persistence';
import { createBattle, legalBattleActions } from '../combat/battle';
import { apply, createGame } from '../game';
import { moveHero } from '../game/exploration';
import { castleEntrance } from '../map/occupancy';
import { PLAYER_IDS } from '../types';

const COMPLETE_COMMON_BUILDINGS = [
  'villageHall', 'townHall', 'cityHall', 'tavern', 'marketplace',
  'walls', 'keep', 'mageGuild1', 'mageGuild2', 'mageGuild3',
  'dwelling1', 'dwelling2', 'dwelling3', 'dwelling4', 'dwelling5', 'dwelling6',
] as const;

describe('The Sixfold Trial advanced combat showcase', () => {
  it('is deterministic, reachable, dense, calibrated, and fully guarded', () => {
    const map = createSixfoldTrial(4901);
    expect(createSixfoldTrial(4901)).toEqual(map);
    expect(map).toMatchObject({ id: 'sixfold-trial', width: 54, height: 42 });
    expect(lintMap(map, SIXFOLD_PLAYER_SETUP.map((slot) => slot.entrance))).toEqual([]);
    expect(lintSixfoldTrial(map)).toEqual([]);
    expect(sixfoldMetrics(map)).toMatchObject({
      chests: 36, artifacts: 18, guardians: 18, roads: 226,
    });
    expect(new Set(SIXFOLD_ARTIFACTS).size).toBe(18);
    expect(SIXFOLD_ARTIFACTS.every((id) =>
      ['vanilla', 'charm', 'relic', 'burden'].includes(ARTIFACTS[id].class))).toBe(true);
    const strengths = sixfoldMetrics(map).guardianStrengths;
    for (const band of SIXFOLD_GUARDIAN_BANDS) {
      expect(strengths.filter((strength) =>
        strength >= band.minimum && strength <= band.maximum).length).toBeGreaterThanOrEqual(4);
    }
    expect(SIXFOLD_GUARDIAN_BANDS.map((band) => strengths.filter((strength) =>
      strength >= band.minimum && strength <= band.maximum).length)).toEqual([4, 4, 5, 4]);
    expect(map.objects.filter((object) => object.kind === 'guardian').map((guardian) =>
      guardian.kind === 'guardian'
        ? [guardian.id, guardian.army[0].unitId, guardian.army[0].count] : null)).toEqual([
      ['sixfold-guardian-1', 'maskedDuelist', 7],
      ['sixfold-guardian-2', 'waxServitor', 10],
      ['sixfold-guardian-3', 'hearthHound', 17],
      ['sixfold-guardian-4', 'sirens', 24],
      ['sixfold-guardian-5', 'mirrorBound', 2],
      ['sixfold-guardian-6', 'sleeper', 2],
      ['sixfold-guardian-7', 'lanternAngler', 10],
      ['sixfold-guardian-8', 'drownedCrew', 46],
      ['sixfold-guardian-9', 'hullTurtle', 12],
      ['sixfold-guardian-10', 'marionette', 64],
      ['sixfold-guardian-11', 'boneChoir', 33],
      ['sixfold-guardian-12', 'silkSpinners', 105],
      ['sixfold-guardian-13', 'woodenColossus', 2],
      ['sixfold-guardian-14', 'oriflammeWarden', 3],
      ['sixfold-guardian-15', 'bannerman', 37],
      ['sixfold-guardian-16', 'ashmaneWolves', 78],
      ['sixfold-guardian-17', 'tinSoldier', 202],
      ['sixfold-guardian-18', 'yeoman', 98],
    ]);
    expect(map.objects.filter((object) => object.id.startsWith('sixfold-reward-')).every((object) =>
      object.guardedBy?.length === 1)).toBe(true);
  });

  it('creates six real configurable factions with developed castles and derived armies/spells', () => {
    const state = createGame({
      seed: 4902, mapId: 'sixfold-trial', playerCount: 6,
      p1: 'human', p2: 'ai', p3: 'dormant', p4: 'human', p5: 'dormant', p6: 'ai',
      p5Faction: 'wildergrass', p6Faction: 'hagwood',
    });
    expect(Object.values(state.players).filter((player) => player.active)).toHaveLength(6);
    expect(state.castles).toHaveLength(6);
    expect(new Set(Object.values(state.players).map((player) => player.faction)).size).toBe(6);
    expect(PLAYER_IDS.map((id) => state.players[id].controller))
      .toEqual(['human', 'ai', 'dormant', 'human', 'dormant', 'ai']);
    expect([state.players.p5.faction, state.players.p6.faction])
      .toEqual(['wildergrass', 'hagwood']);

    for (const slot of SIXFOLD_PLAYER_SETUP) {
      const player = state.players[slot.id];
      const hero = player.hero!;
      const castle = state.castles.find((candidate) => candidate.owner === slot.id)!;
      expect(castleEntrance(castle)).toEqual(slot.entrance);
      expect(hero.position).toEqual(slot.entrance);
      expect(hero.level).toBe(slot.level);
      expect(Object.values(hero.skills)).toEqual(Array(6).fill(3));
      expect(hero.mana).toBe(hero.knowledge * (hero.skills.attunement === 3 ? 12 : 10));
      expect(hero.movement).toBeGreaterThan(2_000);
      expect(hero.army).toHaveLength(7);
      expect(hero.army.filter(Boolean)).toHaveLength(6);
      expect(hero.army.flatMap((stack) => stack ? [stack] : [])).toEqual(
        FACTION_UNITS[player.faction].map((unitId) => ({
          unitId, count: UNITS[unitId].growth * SIXFOLD_RECRUIT_WEEKS,
        })),
      );
      const expectedSpells = [...new Set(FACTIONS[player.faction].schools.flatMap(SCHOOL_SPELLS))];
      expect(new Set(hero.knownSpells)).toEqual(new Set(expectedSpells));
      expect(new Set(hero.upgradedSpells)).toEqual(new Set(expectedSpells));
      expect(new Set(castle.guildDeck)).toEqual(new Set(expectedSpells));
      expect(castle.available).toEqual(Array(6).fill(0));
      expect(castle.dormantBuildings).toEqual({});
      for (const building of [...COMPLETE_COMMON_BUILDINGS,
        ...FACTION_BUILDING_SLOTS[player.faction]]) expect(castle.buildings).toContain(building);
    }
  });

  it('enters an authored advanced fight and exposes spell, ability, hero, and siege paths', () => {
    const state = createGame({
      seed: 4903, mapId: 'sixfold-trial', playerCount: 6,
      p1: 'human', p2: 'dormant', p3: 'dormant', p4: 'dormant', p5: 'dormant', p6: 'dormant',
    });
    const hero = state.players.p1.hero!;
    hero.position = { x: 4, y: 20 };
    hero.movement = 3_000;
    moveHero(state, { x: 4, y: 19 });
    expect(state.phase).toBe('combat');
    expect(state.battle?.context.targetId).toBe('sixfold-guardian-1');
    expect(state.battle?.attackerHero?.knownSpells.length).toBe(62);
    expect(legalBattleActions(state.battle!).some((action) => action.type === 'BATTLE_CAST')).toBe(true);

    const attacker = state.players.p1.hero!;
    const defender = state.players.p2.hero!;
    const defenderCastle = state.castles.find((castle) => castle.owner === 'p2')!;
    const [siege] = createBattle(attacker.army, defender.army, attacker, defender, {
      kind: 'castle', targetId: defenderCastle.id, destination: castleEntrance(defenderCastle),
      attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2',
    }, 4903, true, 'quiet', true, state.week);
    expect(siege.stacks.some((stack) => stack.unitId === 'siegeRam')).toBe(true);
    expect(siege.stacks.some((stack) => stack.unitId === 'watchtower')).toBe(true);
    expect(siege.stacks.filter((stack) => stack.unitId === 'siegeWall')).toHaveLength(5);
    expect(siege.stacks.filter((stack) => stack.slot < 7).some((stack) =>
      UNITS[stack.unitId].abilities.length > 0)).toBe(true);
    expect(legalBattleActions(siege).some((action) => action.type === 'BATTLE_CAST')).toBe(true);
  });

  it('round-trips six-slot setup through canonical saves, hashes, replay, and links', async () => {
    const state = createGame({
      seed: 4904, mapId: 'sixfold-trial', playerCount: 6,
      p1: 'human', p2: 'human', p3: 'ai', p4: 'dormant', p5: 'ai', p6: 'human',
    });
    const save = actionSave(state);
    expect(Object.keys(save).sort()).toEqual(
      ['actionLog', 'contentHash', 'difficulty', 'mapId', 'seed'],
    );
    expect(save.actionLog[0]).toMatchObject({
      type: 'CAMPAIGN_SETUP', options: { playerCount: 6, p5: 'ai', p6: 'human' },
    });
    expect(stateHash(replaySave(save, true))).toBe(stateHash(state));
    const link = await createGameLink(state);
    expect(stateHash(await loadGameLink(link.fragment))).toBe(stateHash(state));
  });

  it('returns from the first strategy turn after its Mage Guild reveal', () => {
    const options = {
      seed: 4900, mapId: 'sixfold-trial' as const, playerCount: 6 as const,
      p1: 'human' as const, p2: 'ai' as const, p3: 'ai' as const,
      p4: 'ai' as const, p5: 'ai' as const, p6: 'ai' as const,
    };
    const state = runStrategyTurn(apply(createGame(options), { type: 'END_TURN' }));
    expect(state).toMatchObject({
      phase: 'adventure', day: 1, activePlayer: 'p3',
      guildReveal: null, pendingChoice: null,
    });
    expect(state.replay.filter((action) => action.type === 'DISMISS_GUILD_REVEAL'))
      .toHaveLength(1);
    expect(state.replay.filter((action) => action.type === 'END_TURN')).toHaveLength(2);
    expect(stateHash(replaySave(actionSave(state), true))).toBe(stateHash(state));
  }, 10_000);
});
