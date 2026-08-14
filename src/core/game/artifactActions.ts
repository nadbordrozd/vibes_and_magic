import { ARTIFACTS } from '../../content/artifacts';
import { addUnits } from '../army';
import {
  addArtifact, artifactEffectTotal, equippedArtifactWithEffect, hasArtifactEffect,
  canPlayerAfford, markBurdenRemovalReady, payPlayer,
} from '../artifacts';
import { findOwnedHero } from '../heroes';
import { inBounds, sameCoord } from '../map/pathfinding';
import { castleEntrance } from '../map/occupancy';
import type { Action, GameState, PrimaryStat } from '../types';
import { terrainIdAt } from '../../content/terrain';
import { claimGuardianReward } from './mapObjects';
import { legalAdventurePlacement } from './navigation';

function heroFor(state: GameState, heroId: string) {
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  if (!hero) throw new Error('Hero not owned');
  return hero;
}

function useDaily(state: GameState, heroId: string, tag: keyof ReturnType<typeof heroFor>['artifactState']['dailyUses']) {
  const hero = heroFor(state, heroId);
  if (hero.artifactState.dailyUses[tag] === state.day) throw new Error('Artifact effect used today');
  hero.artifactState.dailyUses[tag] = state.day;
  return hero;
}

function useWeekly(state: GameState, heroId: string, tag: keyof ReturnType<typeof heroFor>['artifactState']['weeklyUses']) {
  const hero = heroFor(state, heroId);
  if (hero.artifactState.weeklyUses[tag] === state.week) throw new Error('Artifact effect used this week');
  hero.artifactState.weeklyUses[tag] = state.week;
  return hero;
}

export function artifactCrossTerrain(
  state: GameState, action: Extract<Action, { type: 'ARTIFACT_CROSS_TERRAIN' }>,
): void {
  const hero = heroFor(state, action.heroId);
  if (!inBounds(state.map, action.destination)
      || Math.max(Math.abs(hero.position.x - action.destination.x),
        Math.abs(hero.position.y - action.destination.y)) !== 1) throw new Error('Crossing must enter one adjacent tile');
  const terrain = terrainIdAt(state.map, action.destination);
  const occupied = Object.values(state.players).flatMap((player) => player.heroes)
    .some((candidate) => candidate.alive && candidate.id !== hero.id
      && sameCoord(candidate.position, action.destination));
  if (occupied) throw new Error('Crossing destination is occupied');
  if (action.mode === 'mountain-step') {
    if (!hasArtifactEffect(hero, 'mountain_step') || terrain !== 'mountain') {
      throw new Error('The Long Ladder crosses one Mountain tile');
    }
    useDaily(state, hero.id, 'mountain_step');
  } else {
    if (!hasArtifactEffect(hero, 'water_strait') || terrain !== 'water'
        || hero.artifactState.waterStraitSteps >= Math.max(1, artifactEffectTotal(hero, 'water_strait'))) {
      throw new Error("Ferryman's Lantern crosses at most three consecutive Water tiles");
    }
    hero.artifactState.waterStraitSteps += 1;
  }
  if (hero.movement < 100) throw new Error('Not enough movement');
  hero.movement -= 100;
  hero.position = { ...action.destination };
  state.lastMessage = action.mode === 'mountain-step'
    ? 'The Long Ladder finds one impossible foothold.' : `The lantern carries step ${hero.artifactState.waterStraitSteps} of 3.`;
}

export function artifactReturnToStart(state: GameState, heroId: string): void {
  const hero = heroFor(state, heroId);
  if (!hasArtifactEffect(hero, 'return_to_day_start')) throw new Error('The Backward Boot is not equipped');
  if (!legalAdventurePlacement(state, hero, hero.artifactState.dayStartPosition)) {
    throw new Error('The morning tile is now occupied');
  }
  useDaily(state, heroId, 'return_to_day_start');
  hero.position = { ...hero.artifactState.dayStartPosition };
  hero.pathMemory = [];
  state.lastMessage = 'The Backward Boot returns to morning.';
}

export function artifactMarker(
  state: GameState, action: Extract<Action, { type: 'ARTIFACT_MARKER' }>,
): void {
  const hero = heroFor(state, action.heroId);
  if (!hasArtifactEffect(hero, 'weekly_marker_teleport')) throw new Error('Milestone Stone is not equipped');
  if (action.mode === 'plant') {
    hero.artifactState.marker = { ...hero.position };
    state.lastMessage = 'The Milestone Stone is planted.';
    return;
  }
  if (!hero.artifactState.marker) throw new Error('No Milestone marker is planted');
  if (!legalAdventurePlacement(state, hero, hero.artifactState.marker)) {
    throw new Error('The Milestone marker is now occupied');
  }
  useWeekly(state, hero.id, 'weekly_marker_teleport');
  hero.position = { ...hero.artifactState.marker };
  hero.pathMemory = [];
  state.lastMessage = 'The Milestone Stone draws the road together.';
}

export function artifactSkipGuard(
  state: GameState, action: Extract<Action, { type: 'ARTIFACT_SKIP_GUARD' }>,
): void {
  const hero = heroFor(state, action.heroId);
  if (!hasArtifactEffect(hero, 'guarded_reward_skip')) throw new Error('The Hollow Key is not equipped');
  const reward = state.map.objects.find((object) => object.id === action.objectId);
  if (!reward || reward.kind !== 'rewardPickup' || reward.collected
      || !(reward.guardedBy?.length)) throw new Error('Choose an uncollected guarded reward');
  useWeekly(state, hero.id, 'guarded_reward_skip');
  claimGuardianReward(state, hero, reward.reward);
  reward.collected = true;
  state.lastMessage = 'The Hollow Key opens the reward; its guardian remains.';
}

export function artifactRemoteTransfer(
  state: GameState, action: Extract<Action, { type: 'ARTIFACT_REMOTE_TRANSFER' }>,
): void {
  const source = heroFor(state, action.sourceHeroId);
  const destination = heroFor(state, action.destinationHeroId);
  if (source.id === destination.id || !hasArtifactEffect(source, 'remote_transfer')) {
    throw new Error("Crow's Errand needs two owned heroes");
  }
  if (action.kind === 'artifact') {
    const item = source.artifacts.backpack[action.sourceSlot];
    if (!item) throw new Error('Backpack artifact missing');
    useDaily(state, source.id, 'remote_transfer');
    source.artifacts.backpack.splice(action.sourceSlot, 1);
    addArtifact(destination, item);
  } else {
    const stack = source.army[action.sourceSlot];
    const count = action.count ?? stack?.count ?? 0;
    if (!stack || !Number.isInteger(count) || count <= 0 || count > stack.count) {
      throw new Error('Invalid company transfer');
    }
    const joined = addUnits(destination.army, stack.unitId, count);
    if (!joined) throw new Error('Destination has no army slot');
    useDaily(state, source.id, 'remote_transfer');
    destination.army = joined;
    stack.count -= count;
    if (!stack.count) source.army[action.sourceSlot] = null;
  }
  state.lastMessage = "Crow's Errand is delivered.";
}

export function artifactMoveStat(
  state: GameState, action: Extract<Action, { type: 'ARTIFACT_MOVE_STAT' }>,
): void {
  const hero = heroFor(state, action.heroId);
  if (action.from === action.to || !hasArtifactEffect(hero, 'primary_stat_move')) {
    throw new Error('The Second Face needs two different stats');
  }
  useWeekly(state, hero.id, 'primary_stat_move');
  if (hero[action.from] <= 0) throw new Error('A primary stat cannot fall below zero');
  hero[action.from] -= 1; hero[action.to] += 1;
  state.lastMessage = `One ${action.from} moved permanently to ${action.to}.`;
}

export function artifactPayRemoval(
  state: GameState, action: Extract<Action, { type: 'ARTIFACT_PAY_REMOVAL' }>,
): void {
  const hero = heroFor(state, action.heroId);
  const item = Object.values(hero.artifacts.equipment).find((entry) => entry?.id === action.artifactId);
  const definition = item ? ARTIFACTS[item.id] : undefined;
  if (!definition || definition.class !== 'burden'
      || definition.burdenRemovalTrigger !== 'marketplace-payment') {
    throw new Error('No payable Burden is equipped');
  }
  const castle = state.castles.find((candidate) => candidate.owner === hero.owner
    && candidate.buildings.includes('marketplace') && sameCoord(castleEntrance(candidate), hero.position));
  if (!castle || !canPlayerAfford(state.players[hero.owner], { gold: 10_000 })) {
    throw new Error('Pay 10,000 gold while visiting a Marketplace');
  }
  payPlayer(state.players[hero.owner], { gold: 10_000 });
  markBurdenRemovalReady(hero, 'marketplace-payment');
  state.lastMessage = `${ARTIFACTS[action.artifactId].name} may now be removed.`;
}

export function resetWaterStraitOnLand(state: GameState): void {
  for (const hero of Object.values(state.players).flatMap((player) => player.heroes)) {
    if (terrainIdAt(state.map, hero.position) !== 'water') hero.artifactState.waterStraitSteps = 0;
  }
}

export const PRIMARY_STATS: readonly PrimaryStat[] = ['attack', 'defense', 'spellPower', 'knowledge'];
