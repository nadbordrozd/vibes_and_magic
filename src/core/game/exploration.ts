import {
  addUnits, armyAlive, canAfford, pay,
} from '../army';
import { SKILLS } from '../../content/skills';
import {
  createBattle, splitGuardianArmy,
} from '../combat/battle';
import {
  coordKey, findPath, pathCost, reachablePathPrefix, sameCoord,
} from '../map/pathfinding';
import { revealForPlayer } from '../map/visibility';
import { foragerRate, skillRank } from '../heroBehaviors';
import { activeHero as selectedActiveHero, findOwnedHero } from '../heroes';
import type {
  Army, Castle, GameState, Hero, MapObject,
} from '../types';
import { checkVictory } from './outcomes';
import { learnGuildSpells, visitShrine } from './magic';
import { diplomacyTerms } from '../skills/diplomacy';
export { diplomacyTerms } from '../skills/diplomacy';

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
  const hero = selectedActiveHero(state);
  const [battle, nextRng] = createBattle(
    hero.army, defenderArmy, hero, defenderHero, context, state.rng, walls,
  );
  state.rng = nextRng;
  state.battle = battle;
  const terrain = state.map.terrain[context.destination.y][context.destination.x];
  const object = state.map.objects.find((item) =>
    sameCoord(item.position, context.destination));
  battle.resonance = context.kind === 'castle' ? 'rite'
    : object?.kind === 'mine' ? 'craft'
      : terrain === 'barrow' ? 'grave'
        : terrain === 'forest' ? 'wild' : null;
  if (state.magicDisabled) {
    battle.attackerHero.knownSpells = [];
    if (battle.defenderHero) battle.defenderHero.knownSpells = [];
  }
  state.phase = 'combat';
}

function enterMapObject(state: GameState, object: MapObject, hero: Hero): void {
  if (object.kind === 'pile') {
    const amount = Math.floor(object.amount * (1 + foragerRate(hero)));
    state.players[hero.owner].resources[object.resource] += amount;
    object.collected = true;
    state.lastMessage = `Collected ${amount} ${object.resource}.`;
    return;
  }
  if (object.kind === 'mine') {
    if (object.guard && !object.cleared) {
      if (!offerDiplomacy(state, object, hero)) beginGuardianBattle(state, object, hero);
    } else {
      object.owner = hero.owner;
      object.cleared = true;
      state.lastMessage = `${object.resource} mine claimed.`;
    }
    return;
  }
  if (object.kind === 'shrine') {
    if (!object.cleared) {
      if (!offerDiplomacy(state, object, hero)) beginGuardianBattle(state, object, hero);
    } else visitShrine(state, object.id, hero);
    return;
  }
  if (object.guard && !object.cleared) {
    if (!offerDiplomacy(state, object, hero)) beginGuardianBattle(state, object, hero);
  } else {
    state.pendingChoice = {
      kind: 'chest', objectId: object.id, playerId: hero.owner, heroId: hero.id,
    };
  }
}

function beginGuardianBattle(state: GameState, object: Exclude<MapObject, { kind: 'pile' }>, hero: Hero): void {
  if (!object.guard) throw new Error('Guardian missing');
  beginBattle(state, splitGuardianArmy(object.guard.army), {
    kind: 'guardian', targetId: object.id,
    destination: object.position, attackerHeroId: hero.id,
  });
}

function offerDiplomacy(
  state: GameState,
  object: Exclude<MapObject, { kind: 'pile' }>,
  hero: Hero,
): boolean {
  const terms = diplomacyTerms(hero, object);
  if (!terms) return false;
  state.pendingChoice = {
    kind: 'diplomacy', objectId: object.id, playerId: hero.owner, heroId: hero.id,
    ...terms,
  };
  state.lastMessage = 'The guardians are willing to bargain.';
  return true;
}

function clearGuardianObject(state: GameState, object: Exclude<MapObject, { kind: 'pile' }>, hero: Hero): void {
  object.cleared = true;
  if (object.kind === 'mine') {
    object.owner = hero.owner;
    state.lastMessage = `${object.resource} mine claimed.`;
  } else if (object.kind === 'chest') {
    state.pendingChoice = {
      kind: 'chest', objectId: object.id, playerId: hero.owner, heroId: hero.id,
    };
  } else {
    visitShrine(state, object.id, hero);
  }
}

export function chooseDiplomacy(
  state: GameState,
  choice: 'fight' | 'disband' | 'recruit',
): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'diplomacy') throw new Error('No diplomacy choice pending');
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  const object = state.map.objects.find((candidate) => candidate.id === pending.objectId);
  if (!hero || !object || object.kind === 'pile' || !object.guard) {
    throw new Error('Diplomacy encounter missing');
  }
  state.pendingChoice = null;
  if (choice === 'fight') {
    beginGuardianBattle(state, object, hero);
    return;
  }
  const cost = choice === 'recruit' ? pending.recruitCost : pending.disbandCost;
  if (cost === null || !canAfford(state.players[pending.playerId].resources, { gold: cost })) {
    throw new Error('Cannot afford diplomacy');
  }
  state.players[pending.playerId].resources =
    pay(state.players[pending.playerId].resources, { gold: cost });
  if (choice === 'recruit') {
    for (const stack of object.guard.army) {
      hero.army = addUnits(hero.army, stack.unitId, stack.count)!;
    }
  }
  clearGuardianObject(state, object, hero);
}

function enterCastle(state: GameState, castle: Castle, hero: Hero): void {
  if (castle.owner === hero.owner) {
    hero.mana = hero.knowledge * 10;
    const learned = learnGuildSpells(hero, castle);
    state.lastMessage = learned.length
      ? `Hero learned ${learned.length} Mage Guild spell${learned.length === 1 ? '' : 's'}.`
      : 'Hero entered the castle.';
    return;
  }
  const defenderPlayer = state.players[castle.owner];
  const defenderHero = defenderPlayer.heroes.find((candidate) =>
    candidate.alive && sameCoord(candidate.position, castle.position)) ?? null;
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
      player.heroes.filter((candidate) => candidate.alive && candidate.id !== hero.id)
        .map((candidate) => coordKey(candidate.position)),
    ),
  );
  for (const object of state.map.objects) {
    const active = object.kind === 'pile'
      ? !object.collected
      : object.kind === 'chest'
        ? !object.collected
        : object.kind === 'shrine'
          ? !object.cleared
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
  const hero = selectedActiveHero(state);
  return findPath(
    state.map, hero.position, destination, blockedMapTiles(state, hero), hero,
  );
}

export function moveHero(
  state: GameState,
  destination: { x: number; y: number },
): void {
  const hero = selectedActiveHero(state);
  const path = adventurePath(state, destination);
  if (!path || path.length < 2) throw new Error('No path to destination');
  const prefix = reachablePathPrefix(state.map, path, hero.movement, hero);
  if (prefix.length < 2) throw new Error('Not enough movement');
  const reached = prefix[prefix.length - 1];
  hero.movement -= pathCost(state.map, prefix, hero);
  hero.position = { ...reached };
  const reachedIndex = path.findIndex((coord) => sameCoord(coord, reached));
  hero.pathMemory = path.slice(Math.max(0, reachedIndex))
    .map((coord) => ({ ...coord }));
  state.players[hero.owner].explored = revealForPlayer(
    state.players[hero.owner].explored, state.map, state.players[hero.owner].heroes,
    state.castles.filter((castle) => castle.owner === hero.owner),
  );
  if (!sameCoord(reached, destination)) {
    state.lastMessage = 'Hero moved as far as possible.';
    return;
  }

  const enemyHero = Object.values(state.players).flatMap((player) => player.heroes)
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
  if (skillRank(hero, 'forager') === 2 && state.phase === 'adventure'
      && !state.pendingChoice) {
    for (const object of state.map.objects) {
      if (object.kind === 'pile' && !object.collected
          && Math.max(Math.abs(object.position.x - hero.position.x),
            Math.abs(object.position.y - hero.position.y))
            <= SKILLS.forager.values.adjacentRange) {
        enterMapObject(state, object, hero);
      }
    }
  }
}
