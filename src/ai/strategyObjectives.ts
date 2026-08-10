import {
  AI_ASSAULT_STRENGTH_RATIO, AI_GATHERER_THREAT_RATIO, AI_GATHERER_THREAT_TURNS,
  AI_GUARDIAN_SAFETY_RATIO, HERO_MOVE_POINTS,
} from '../content/constants';
import { armyPower, makeArmy } from '../core/army';
import {
  findPath, pathCost, sameCoord,
} from '../core/map/pathfinding';
import { adventurePath } from '../core/game/navigation';
import { castleEntrance, objectEntranceTile } from '../core/map/occupancy';
import type {
  Coord, GameState, Hero, MapObject, PlayerId,
} from '../core/types';

export interface StrategyObjective {
  id: string;
  position: Coord;
  priority: number;
  power: number;
  value: number;
  guardianId?: string;
}

function guarding(state: GameState, object: MapObject) {
  return state.map.objects.find((candidate) => candidate.kind === 'guardian'
    && (candidate.protects === object.id || object.guardedBy?.includes(candidate.id)));
}

function guardedPower(state: GameState, object: MapObject): number {
  const guard = guarding(state, object);
  return guard?.kind === 'guardian' ? armyPower(makeArmy(guard.army)) : 0;
}

function distance(state: GameState, hero: Hero, position: Coord): number {
  const selected = state.activePlayer === hero.owner
    && state.players[hero.owner].activeHeroId === hero.id;
  const path = selected ? adventurePath(state, position, { avoidAggro: false }) : findPath(
    state.map, hero.position, position, new Set(), hero, state.omen);
  return path
    ? selected ? path.length * 100 : pathCost(state.map, path, hero, state.omen)
    : Number.POSITIVE_INFINITY;
}

function safeObjectiveDistance(
  state: GameState, hero: Hero, objective: StrategyObjective,
): number {
  const selected = state.activePlayer === hero.owner
    && state.players[hero.owner].activeHeroId === hero.id;
  if (!selected) return distance(state, hero, objective.position);
  const path = adventurePath(state, objective.position, {
    avoidAggro: true, fightGuardianId: objective.guardianId,
  });
  return path ? pathCost(state.map, path, hero, state.omen) : Number.POSITIVE_INFINITY;
}

function objectiveDistance(
  state: GameState, hero: Hero, objective: StrategyObjective,
): number {
  const safe = safeObjectiveDistance(state, hero, objective);
  return Number.isFinite(safe) ? safe : distance(state, hero, objective.position);
}

function playerPower(state: GameState, playerId: PlayerId): number {
  return state.players[playerId].heroes.reduce(
    (sum, hero) => sum + armyPower(hero.army), 0,
  ) + state.castles.filter((castle) => castle.owner === playerId)
    .reduce((sum, castle) => sum + armyPower(castle.garrison), 0);
}

function objectValue(object: MapObject): number {
  if (object.kind === 'pile') {
    const multiplier = object.resource === 'gold' ? 1
      : object.resource === 'timber' ? 250 : 500;
    return object.amount * multiplier;
  }
  if (object.kind === 'chest') return 1500;
  if (object.kind === 'mine') {
    return object.income * 7 * (object.resource === 'gold' ? 1 : 500);
  }
  if (object.kind === 'item') return 1200;
  if (object.kind === 'flotsam') return object.gold + object.timber * 250;
  if (object.kind === 'sealedCask') return 1500;
  if (object.kind === 'castaway') return 1000;
  if (object.kind === 'messageBottle') return 300;
  if (object.kind === 'lighthouse') return 2500;
  if (object.kind === 'richVein') return object.income * object.days * 500;
  if (object.kind === 'lock') {
    return (object.reward.gold ?? 0) + (object.reward.essence ?? 0) * 500;
  }
  return object.kind === 'waystation' ? 300 : 1000;
}

function gathererThreat(state: GameState, hero: Hero): StrategyObjective | null {
  const enemyHeroes = Object.values(state.players)
    .filter((player) => player.id !== hero.owner)
    .flatMap((player) => player.heroes)
    .filter((enemy) => enemy.alive
      && armyPower(enemy.army) >= armyPower(hero.army) * AI_GATHERER_THREAT_RATIO);
  const threatened = enemyHeroes.some((enemy) => Math.max(
    Math.abs(enemy.position.x - hero.position.x),
    Math.abs(enemy.position.y - hero.position.y),
  ) * 100 <= HERO_MOVE_POINTS * AI_GATHERER_THREAT_TURNS);
  if (!threatened) return null;
  const castle = state.castles.filter((candidate) => candidate.owner === hero.owner)
    .sort((a, b) => distance(state, hero, castleEntrance(a))
      - distance(state, hero, castleEntrance(b)))[0];
  return castle ? {
    id: `${hero.id}-flee`, position: castleEntrance(castle),
    priority: -10, power: 0, value: 0,
  } : null;
}

function homeIntercept(state: GameState, hero: Hero): StrategyObjective | null {
  const home = state.castles.find((castle) => castle.owner === hero.owner);
  if (!home) return null;
  const enemies = Object.values(state.players)
    .filter((player) => player.id !== hero.owner)
    .flatMap((player) => player.heroes).filter((enemy) => enemy.alive);
  for (const enemy of enemies) {
    const threatPath = findPath(
      state.map, enemy.position, castleEntrance(home), new Set(), enemy, state.omen,
    );
    const interceptPath = findPath(
      state.map, hero.position, enemy.position, new Set(), hero, state.omen,
    );
    if (threatPath
        && pathCost(state.map, threatPath, enemy, state.omen)
          <= HERO_MOVE_POINTS * 0.25
        && interceptPath
        && pathCost(state.map, interceptPath, hero, state.omen) <= hero.movement) {
      return {
        id: enemy.id, position: enemy.position,
        priority: -2, power: armyPower(enemy.army), value: 6000,
      };
    }
  }
  return null;
}

function addEnemyObjectives(
  state: GameState,
  hero: Hero,
  objectives: StrategyObjective[],
): void {
  for (const castle of state.castles.filter((item) => item.owner !== hero.owner)) {
    objectives.push({
      id: castle.id, position: castleEntrance(castle),
      priority: state.day >= 15 ? -1 : 3,
      power: castle.owner === 'neutral' ? armyPower(castle.garrison)
        : playerPower(state, castle.owner), value: 5000,
    });
  }
  for (const enemy of Object.values(state.players)
    .filter((player) => player.id !== hero.owner).flatMap((player) => player.heroes)) {
    if (!enemy.alive || state.castles.some((castle) =>
      castle.owner === enemy.owner && sameCoord(castleEntrance(castle), enemy.position))) continue;
    objectives.push({
      id: enemy.id, position: enemy.position,
      priority: state.day >= 15 ? -1 : 3,
      power: armyPower(enemy.army), value: 4000,
    });
  }
}

function collectObjectives(
  state: GameState,
  hero: Hero,
  role: 'main' | 'gatherer',
  claims: Set<string>,
): StrategyObjective[] {
  const power = armyPower(hero.army);
  const objectives: StrategyObjective[] = [];
  for (const object of state.map.objects) {
    if (object.kind === 'guardian') continue;
    if (claims.has(object.id)) continue;
    const cleared = 'cleared' in object ? object.cleared : false;
    const guardian = cleared ? undefined : guarding(state, object);
    const guard = guardian?.kind === 'guardian' ? guardedPower(state, object) : 0;
    const targetId = object.id;
    const targetPosition = guardian?.kind === 'guardian'
      ? guardian.position : objectEntranceTile(object);
    if (role === 'gatherer') {
      const valid = object.kind === 'pile' ? !object.collected
        : object.kind === 'chest' ? !object.collected && guard === 0
          : object.kind === 'mine' ? object.owner !== hero.owner && guard === 0
            : object.kind === 'item' ? !object.collected && hero.inventory.includes(null)
              : object.kind === 'richVein' ? !object.depleted && object.owner !== hero.owner
                : ['flotsam', 'sealedCask', 'castaway', 'messageBottle'].includes(object.kind)
                  ? !('collected' in object) || !object.collected : false;
      if (valid) {
        objectives.push({
          id: targetId, position: targetPosition,
          priority: 0, power: 0, value: objectValue(object),
          guardianId: guardian?.id,
        });
      }
      continue;
    }
    if ((object.kind === 'pile' || object.kind === 'flotsam'
        || object.kind === 'sealedCask' || object.kind === 'castaway'
        || object.kind === 'messageBottle') && !object.collected) {
      objectives.push({
        id: targetId, position: targetPosition, priority: 0, power: 0,
        guardianId: guardian?.id,
        value: objectValue(object),
      });
    } else if (object.kind === 'chest' && !object.collected
        && (guard === 0 || guard <= power * AI_GUARDIAN_SAFETY_RATIO)) {
      objectives.push({
        id: targetId, position: targetPosition, priority: guard ? 2 : 0,
        power: guard, value: objectValue(object), guardianId: guardian?.id,
      });
    } else if (object.kind === 'mine' && object.owner !== hero.owner
        && (guard === 0 || guard <= power * AI_GUARDIAN_SAFETY_RATIO)) {
      objectives.push({
        id: targetId, position: targetPosition, priority: guard ? 2 : 1,
        power: guard, value: objectValue(object), guardianId: guardian?.id,
      });
    } else if (object.kind === 'shrine' && !object.visitedBy.includes(hero.id)
        && guard <= power * AI_GUARDIAN_SAFETY_RATIO) {
      objectives.push({
        id: targetId, position: targetPosition, priority: 0,
        power: guard, value: 1000, guardianId: guardian?.id,
      });
    } else if (object.kind === 'lock' && !object.cleared
        && guard <= power * AI_GUARDIAN_SAFETY_RATIO) {
      objectives.push({
        id: targetId, position: targetPosition, priority: 2,
        power: guard, value: objectValue(object), guardianId: guardian?.id,
      });
    } else if (object.kind === 'lighthouse' && object.owner !== hero.owner
        && guard <= power * AI_GUARDIAN_SAFETY_RATIO) {
      objectives.push({
        id: targetId, position: targetPosition, priority: 1,
        power: guard, value: objectValue(object), guardianId: guardian?.id,
      });
    } else if ((object.kind === 'shipwreck' || object.kind === 'sirenRocks')
        && !object.cleared && guard <= power * AI_GUARDIAN_SAFETY_RATIO) {
      objectives.push({
        id: targetId, position: targetPosition, priority: 2,
        power: guard, value: objectValue(object), guardianId: guardian?.id,
      });
    } else if (object.kind === 'drownedBell' && !object.visitedBy.includes(hero.id)) {
      objectives.push({
        id: targetId, position: targetPosition, priority: 0,
        power: 0, value: 1200,
      });
    }
  }
  if (role === 'main' && state.map.victory.type !== 'conquest'
      && state.map.victory.type !== 'none') {
    const objectiveId = state.map.victory.type === 'assemble' ? undefined
      : state.map.victory.objectId;
    const object = objectiveId ? state.map.objects.find((candidate) =>
      candidate.id === objectiveId) : undefined;
    if (object && !objectives.some((candidate) => candidate.id === object.id)) {
      const guardian = guarding(state, object);
      const guard = guardedPower(state, object);
      objectives.push({
        id: object.id,
        position: guardian?.kind === 'guardian' ? guardian.position : objectEntranceTile(object),
        priority: 1, power: guard, value: 3000, guardianId: guardian?.id,
      });
    }
  }
  if (role === 'main') addEnemyObjectives(state, hero, objectives);
  return objectives.filter((objective) =>
    Number.isFinite(distance(state, hero, objective.position)));
}

export function chooseStrategyObjective(
  state: GameState,
  hero: Hero,
  role: 'main' | 'gatherer',
  claims: Set<string>,
): StrategyObjective | null {
  if (role === 'gatherer') {
    const flee = gathererThreat(state, hero);
    if (flee) return flee;
  } else {
    const intercept = homeIntercept(state, hero);
    if (intercept) return intercept;
  }
  const allObjectives = collectObjectives(state, hero, role, claims);
  const safeObjectives = allObjectives.filter((objective) =>
    Number.isFinite(safeObjectiveDistance(state, hero, objective)));
  const objectives = safeObjectives.length ? safeObjectives : allObjectives;
  const ownPower = armyPower(hero.army);
  const immediate = objectives.filter((objective) =>
    objective.priority === 3 && objective.power * AI_ASSAULT_STRENGTH_RATIO <= ownPower
      && objectiveDistance(state, hero, objective) <= hero.movement)
    .sort((a, b) => objectiveDistance(state, hero, a)
      - objectiveDistance(state, hero, b))[0];
  if (immediate) return immediate;
  return objectives.sort((a, b) => role === 'gatherer'
    ? b.value - a.value || objectiveDistance(state, hero, a)
      - objectiveDistance(state, hero, b) || a.id.localeCompare(b.id)
    : a.priority - b.priority || objectiveDistance(state, hero, a)
      - objectiveDistance(state, hero, b) || b.value - a.value
      || a.id.localeCompare(b.id))[0] ?? null;
}
