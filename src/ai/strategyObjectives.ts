import {
  AI_GATHERER_THREAT_RATIO, AI_GATHERER_THREAT_TURNS, HERO_MOVE_POINTS,
} from '../content/constants';
import { armyPower, makeArmy } from '../core/army';
import {
  findPath, pathCost, sameCoord,
} from '../core/map/pathfinding';
import type {
  Coord, GameState, Hero, MapObject, PlayerId,
} from '../core/types';

export interface StrategyObjective {
  id: string;
  position: Coord;
  priority: number;
  power: number;
  value: number;
}

function guardedPower(object: MapObject): number {
  if (object.kind === 'pile' || !object.guard) return 0;
  return armyPower(makeArmy(object.guard.army));
}

function distance(state: GameState, hero: Hero, position: Coord): number {
  const path = findPath(state.map, hero.position, position, new Set(), hero);
  return path ? pathCost(state.map, path, hero) : Number.POSITIVE_INFINITY;
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
  return 1000;
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
    .sort((a, b) => distance(state, hero, a.position)
      - distance(state, hero, b.position))[0];
  return castle ? {
    id: `${hero.id}-flee`, position: castle.position,
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
    const threatPath = findPath(state.map, enemy.position, home.position);
    const interceptPath = findPath(state.map, hero.position, enemy.position);
    if (threatPath && pathCost(state.map, threatPath) <= HERO_MOVE_POINTS * 0.25
        && interceptPath && pathCost(state.map, interceptPath, hero) <= hero.movement) {
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
      id: castle.id, position: castle.position,
      priority: state.day >= 15 ? -1 : 3,
      power: playerPower(state, castle.owner), value: 5000,
    });
  }
  for (const enemy of Object.values(state.players)
    .filter((player) => player.id !== hero.owner).flatMap((player) => player.heroes)) {
    if (!enemy.alive || state.castles.some((castle) =>
      castle.owner === enemy.owner && sameCoord(castle.position, enemy.position))) continue;
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
    if (claims.has(object.id)) continue;
    const guard = object.kind === 'pile' || object.cleared ? 0 : guardedPower(object);
    if (role === 'gatherer') {
      const valid = object.kind === 'pile' ? !object.collected
        : object.kind === 'chest' ? !object.collected && guard === 0
          : object.kind === 'mine' ? object.owner !== hero.owner && guard === 0
            : false;
      if (valid) {
        objectives.push({
          id: object.id, position: object.position,
          priority: 0, power: 0, value: objectValue(object),
        });
      }
      continue;
    }
    if (object.kind === 'pile' && !object.collected) {
      objectives.push({
        id: object.id, position: object.position, priority: 0, power: 0,
        value: objectValue(object),
      });
    } else if (object.kind === 'chest' && !object.collected
        && (guard === 0 || guard <= power * 0.8)) {
      objectives.push({
        id: object.id, position: object.position, priority: guard ? 2 : 0,
        power: guard, value: objectValue(object),
      });
    } else if (object.kind === 'mine' && object.owner !== hero.owner
        && (guard === 0 || guard <= power * 0.8)) {
      objectives.push({
        id: object.id, position: object.position, priority: guard ? 2 : 1,
        power: guard, value: objectValue(object),
      });
    } else if (object.kind === 'shrine' && !object.visitedBy.includes(hero.id)
        && guard <= power * 0.8) {
      objectives.push({
        id: object.id, position: object.position, priority: 0,
        power: guard, value: 1000,
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
  const objectives = collectObjectives(state, hero, role, claims);
  const ownPower = armyPower(hero.army);
  const immediate = objectives.filter((objective) =>
    objective.priority === 3 && objective.power * 1.2 <= ownPower
      && distance(state, hero, objective.position) <= hero.movement)
    .sort((a, b) => distance(state, hero, a.position)
      - distance(state, hero, b.position))[0];
  if (immediate) return immediate;
  return objectives.sort((a, b) => role === 'gatherer'
    ? b.value - a.value || distance(state, hero, a.position)
      - distance(state, hero, b.position) || a.id.localeCompare(b.id)
    : a.priority - b.priority || distance(state, hero, a.position)
      - distance(state, hero, b.position) || b.value - a.value
      || a.id.localeCompare(b.id))[0] ?? null;
}
