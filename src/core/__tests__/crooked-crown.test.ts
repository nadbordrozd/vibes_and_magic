import { describe, expect, it } from 'vitest';
import { runStrategyTurn } from '../../ai/strategy';
import {
  createCrookedCrown, CROOKED_CROWN_GATE_IDS, CROOKED_CROWN_STARTS,
  crookedCrownMetrics,
} from '../../content/maps/crookedCrown';
import { lintCrookedCrown, lintMap } from '../../tools/mapLint';
import {
  actionSave, createGameLink, loadGameLink, replaySave, stateHash,
} from '../../ui/persistence';
import { createGame } from '../game';
import { castleEntrance } from '../map/occupancy';

describe('The Crooked Crown dense adventure map', () => {
  it('is an exact deterministic 72x72 authored labyrinth with enforced density', () => {
    const map = createCrookedCrown(4040);
    expect(createCrookedCrown(4040)).toEqual(map);
    expect(map.width).toBe(72);
    expect(map.height).toBe(72);
    expect(map.terrain).toHaveLength(72);
    expect(map.terrain.every((row) => row.length === 72)).toBe(true);
    expect(lintMap(map, [...CROOKED_CROWN_STARTS])).toEqual([]);
    expect(lintCrookedCrown(map)).toEqual([]);

    const metrics = crookedCrownMetrics(map);
    expect(metrics).toMatchObject({
      interactiveObjects: 109, guardians: 20, authoredLandmarks: 12,
      roads: 575, maxOpenSquare: 9,
    });
    expect(metrics.decorationBlockerRatio).toBeGreaterThanOrEqual(0.68);
    expect(metrics.interactionPerPassableTile).toBeGreaterThanOrEqual(0.05);
    expect(metrics.guardianStrength.minimum).toBeGreaterThan(70);
    expect(metrics.guardianStrength.maximum).toBeLessThan(400);
    for (const id of CROOKED_CROWN_GATE_IDS) {
      expect(map.objects.find((object) => object.id === id)).toMatchObject({
        kind: 'guardian', protects: expect.any(String),
      });
    }
  }, 20_000);

  it('creates four selectable players at distinct viable starts', () => {
    const game = createGame({
      seed: 4041, mapId: 'crooked-crown', playerCount: 4,
      p1: 'human', p2: 'ai', p3: 'human', p4: 'dormant',
      p1Faction: 'hagwood', p2Faction: 'vespiary',
      p3Faction: 'unfinished', p4Faction: 'wildergrass',
    });
    expect(game.castles).toHaveLength(4);
    expect(game.castles.map(castleEntrance)).toEqual(CROOKED_CROWN_STARTS);
    expect(Object.values(game.players).map((player) => player.controller))
      .toEqual(['human', 'ai', 'human', 'dormant']);
    expect(Object.values(game.players).map((player) => player.faction))
      .toEqual(['hagwood', 'vespiary', 'unfinished', 'wildergrass']);
    for (const [index, player] of Object.values(game.players).entries()) {
      expect(player.hero?.position).toEqual(CROOKED_CROWN_STARTS[index]);
      expect(game.map.objects.filter((object) => object.id.startsWith(
        `crooked-crown-pile-${[1, 4, 9, 12][index]}-`,
      ))).toHaveLength(2);
    }
  });

  it('keeps AI actions, canonical replay, and compressed game links deterministic', async () => {
    let game = createGame({
      seed: 4042, mapId: 'crooked-crown', playerCount: 4,
      p1: 'ai', p2: 'ai', p3: 'ai', p4: 'ai',
    });
    game = runStrategyTurn(game);
    expect(game.replay.length).toBeGreaterThan(0);
    expect(game.map.id).toBe('crooked-crown');
    const save = actionSave(game);
    expect(Object.keys(save).sort()).toEqual(
      ['actionLog', 'contentHash', 'difficulty', 'mapId', 'seed'],
    );
    expect(save.mapId).toBe('crooked-crown');
    expect(stateHash(replaySave(save, true))).toBe(stateHash(game));
    const link = await createGameLink(game);
    expect(link.fragment).toMatch(/^#game=/);
    expect(stateHash(await loadGameLink(link.fragment))).toBe(stateHash(game));
  }, 30_000);
});
