import {
  addUnits, armyAlive,
} from '../army';
import {
  createBattle, splitGuardianArmy,
} from '../combat/battle';
import {
  coordKey, findPath, pathCost, reachablePathPrefix, sameCoord,
} from '../map/pathfinding';
import { revealForPlayer } from '../map/visibility';
import type {
  Army, Castle, GameState, Hero, MapObject,
} from '../types';
import { checkVictory } from './outcomes';

function activeHero(state: GameState): Hero {
  const hero = state.players[state.activePlayer].hero;
  if (!hero?.alive) throw new Error('Active player has no living hero');
  return hero;
}

function objectAt(
  state: GameState,
  position: { x: number; y: number },
): MapObject | undefined {
  return state.map.objects.find((object) => {
    if (!sameCoord(object.position, position)) return false;
    if (object.kind === 'pile') return !object.collected;
    if (object.kind === 'chest') return !object.collected;
    return true;
  });
}

function beginBattle(
  state: GameState,
  defenderArmy: Army,
  context: Parameters<typeof createBattle>[4],
  defenderHero: Hero | null = null,
  walls = false,
): void {
  const hero = activeHero(state);
  const [battle, nextRng] = createBattle(
    hero.army, defenderArmy, hero, defenderHero, context, state.rng, walls,
  );
  state.rng = nextRng;
  state.battle = battle;
  state.phase = 'combat';
}

function enterMapObject(state: GameState, object: MapObject, hero: Hero): void {
  if (object.kind === 'pile') {
    state.players[hero.owner].resources[object.resource] += object.amount;
    object.collected = true;
    state.lastMessage = `Collected ${object.amount} ${object.resource}.`;
    return;
  }
  if (object.kind === 'mine') {
    if (object.guard && !object.cleared) {
      beginBattle(state, splitGuardianArmy(object.guard.army), {
        kind: 'guardian', targetId: object.id,
        destination: object.position, attackerHeroId: hero.id,
      });
    } else {
      object.owner = hero.owner;
      object.cleared = true;
      state.lastMessage = `${object.resource} mine claimed.`;
    }
    return;
  }
  if (object.guard && !object.cleared) {
    beginBattle(state, splitGuardianArmy(object.guard.army), {
      kind: 'guardian', targetId: object.id,
      destination: object.position, attackerHeroId: hero.id,
    });
  } else {
    state.pendingChoice = { kind: 'chest', objectId: object.id, playerId: hero.owner };
  }
}

function enterCastle(state: GameState, castle: Castle, hero: Hero): void {
  if (castle.owner === hero.owner) {
    hero.mana = hero.knowledge * 10;
    state.lastMessage = 'Hero entered the castle.';
    return;
  }
  const defenderPlayer = state.players[castle.owner];
  const defenderHero = defenderPlayer.hero?.alive
    && sameCoord(defenderPlayer.hero.position, castle.position)
    ? defenderPlayer.hero : null;
  const combined = castle.garrison.map((stack) => stack ? { ...stack } : null);
  if (defenderHero) {
    for (const stack of defenderHero.army) {
      if (!stack) continue;
      const withUnits = addUnits(combined, stack.unitId, stack.count);
      if (withUnits) combined.splice(0, combined.length, ...withUnits);
    }
  }
  if (!armyAlive(combined)) {
    castle.owner = hero.owner;
    state.lastMessage = `${hero.owner} captured ${castle.id}.`;
    checkVictory(state);
    return;
  }
  beginBattle(state, combined, {
    kind: 'castle', targetId: castle.id, destination: castle.position,
    attackerHeroId: hero.id, defenderHeroId: defenderHero?.id,
    defenderPlayerId: castle.owner,
  }, defenderHero, castle.buildings.includes('walls'));
}

function blockedMapTiles(state: GameState, hero: Hero): Set<string> {
  const blocked = new Set(
    Object.values(state.players).flatMap((player) =>
      player.hero?.alive && player.hero.id !== hero.id
        ? [coordKey(player.hero.position)] : [],
    ),
  );
  for (const object of state.map.objects) {
    const active = object.kind === 'pile'
      ? !object.collected
      : object.kind === 'chest'
        ? !object.collected
        : object.owner !== hero.owner || !object.cleared;
    if (active) blocked.add(coordKey(object.position));
  }
  for (const castle of state.castles) {
    if (castle.owner !== hero.owner) blocked.add(coordKey(castle.position));
  }
  return blocked;
}

export function adventurePath(
  state: GameState,
  destination: { x: number; y: number },
): ReturnType<typeof findPath> {
  const hero = activeHero(state);
  return findPath(state.map, hero.position, destination, blockedMapTiles(state, hero));
}

export function moveHero(
  state: GameState,
  destination: { x: number; y: number },
): void {
  const hero = activeHero(state);
  const path = adventurePath(state, destination);
  if (!path || path.length < 2) throw new Error('No path to destination');
  const prefix = reachablePathPrefix(state.map, path, hero.movement);
  if (prefix.length < 2) throw new Error('Not enough movement');
  const reached = prefix[prefix.length - 1];
  hero.movement -= pathCost(state.map, prefix);
  hero.position = { ...reached };
  state.players[hero.owner].explored = revealForPlayer(
    state.players[hero.owner].explored, state.map, hero,
    state.castles.filter((castle) => castle.owner === hero.owner),
  );
  if (!sameCoord(reached, destination)) {
    state.lastMessage = 'Hero moved as far as possible.';
    return;
  }

  const enemyHero = Object.values(state.players).map((player) => player.hero)
    .find((other) => other?.alive && other.owner !== hero.owner
      && sameCoord(other.position, destination));
  const castle = state.castles.find((item) => sameCoord(item.position, destination));
  if (castle) {
    enterCastle(state, castle, hero);
  } else if (enemyHero) {
    beginBattle(state, enemyHero.army, {
      kind: 'hero', targetId: enemyHero.id, destination,
      attackerHeroId: hero.id, defenderHeroId: enemyHero.id,
      defenderPlayerId: enemyHero.owner,
    }, enemyHero);
  } else {
    const object = objectAt(state, destination);
    if (object) enterMapObject(state, object, hero);
  }
}
