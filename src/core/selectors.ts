import {
  BUILDINGS, COMMON_BUILDING_SLOT_ROOTS, FACTION_BUILDING_SLOTS, buildingPresentation,
} from '../content/buildings';
import { FACTION_UNITS, UNITS } from '../content/units';
import { canAfford } from './army';
import { battleReachableHexes, legalBattleActions } from './combat/battle';
import { sameCoord } from './map/pathfinding';
import { reachablePathPrefix } from './map/pathfinding';
import { castleEntrance } from './map/occupancy';
import { adventurePath } from './game/exploration';
import { reachableAdventureTileKeys } from './game/navigation';
import type {
  AbilityId, BattleStack, BuildingId, Castle, Coord, GameState, Hero, MapObject, PlayerId,
  UnitId, UnitTier,
} from './types';
import { selectedHero } from './heroes';
import { skillRank } from './heroBehaviors';
import { SKILLS } from '../content/skills';
import { artifactEffectTotal } from './artifacts';
import { itemName } from '../content/items';
import { buildingIsActive } from './game/buildingStatus';
import { guardianAt, guardiansCovering } from './map/occupancy';
import { castleSupportsBuilding } from './game/economy';

export interface BuildingStatus {
  state: 'built' | 'available' | 'locked' | 'unavailable';
  color: 'gold' | 'green' | 'red' | 'grey';
  reason: string;
  reasons: string[];
}

export function buildingStatus(
  state: GameState,
  castle: Castle,
  buildingId: BuildingId,
): BuildingStatus {
  if (castle.buildings.includes(buildingId)) return {
    color: 'gold',
    state: 'built', reason: castle.dormantBuildings[buildingId]
      ? 'Dormant — Debt unpaid.' : 'Built.',
    reasons: [castle.dormantBuildings[buildingId] ? 'Dormant — Debt unpaid.' : 'Built.'],
  };
  if (castle.owner === 'neutral') return {
    state: 'unavailable', color: 'grey', reason: 'Cannot be built in this city.',
    reasons: ['Cannot be built in this city.'],
  };
  const definition = BUILDINGS[buildingId];
  if (!castleSupportsBuilding(state, castle, buildingId)) return {
    state: 'unavailable', color: 'grey', reason: 'Cannot be built in this city.',
    reasons: ['Cannot be built in this city.'],
  };
  const reasons: string[] = [];
  if (definition.prerequisite && !castle.buildings.includes(definition.prerequisite)) {
    reasons.push(`Requires ${buildingPresentation(
      definition.prerequisite, castle.faction,
    ).name}.`);
  }
  if (castle.builtOnDay === state.day) {
    reasons.push('Already built today.');
  }
  if (!canAfford(state.players[castle.owner].resources, definition.cost)) {
    reasons.push('Not enough resources.');
  }
  if (reasons.length) return {
    state: 'locked', color: 'red', reason: reasons.join(' '), reasons,
  };
  return {
    state: 'available', color: 'green', reason: 'Available to build.', reasons: [],
  };
}

export function visibleUpgradeStage(castle: Castle, root: BuildingId): BuildingId {
  let stage = root;
  while (castle.buildings.includes(stage) && BUILDINGS[stage].upgrades) {
    stage = BUILDINGS[stage].upgrades!;
  }
  return stage;
}

export function castleBuildingSlots(castle: Castle): BuildingId[] {
  return [...COMMON_BUILDING_SLOT_ROOTS, ...FACTION_BUILDING_SLOTS[castle.faction]]
    .map((root) => visibleUpgradeStage(castle, root));
}

export function maxRecruitable(
  state: GameState,
  castle: Castle,
  tier: UnitTier,
): number {
  if (castle.owner === 'neutral') return 0;
  if (!buildingIsActive(castle, `dwelling${tier}` as BuildingId)) return 0;
  const unit = UNITS[FACTION_UNITS[castle.faction][tier - 1]];
  let count = castle.available[tier - 1];
  while (count > 0 && !canAfford(state.players[castle.owner].resources, unit.cost, count)) {
    count -= 1;
  }
  return count;
}

export function visitingCastle(state: GameState): Castle | null {
  const hero = selectedHero(state.players[state.activePlayer]);
  if (!hero) return null;
  return state.castles.find(
    (castle) => castle.owner === state.activePlayer
      && sameCoord(castleEntrance(castle), hero.position),
  ) ?? null;
}

export function reachableAdventureTiles(state: GameState): Set<string> {
  const hero = selectedHero(state.players[state.activePlayer]);
  return hero ? reachableAdventureTileKeys(state, hero) : new Set<string>();
}

export function previewPath(state: GameState, destination: Coord): Coord[] {
  return selectedHero(state.players[state.activePlayer])
    ? adventurePath(state, destination) ?? [] : [];
}

export function animatedAdventurePath(state: GameState, destination: Coord): Coord[] {
  const hero = selectedHero(state.players[state.activePlayer]);
  const path = hero ? adventurePath(state, destination) : null;
  const passage = hero && state.mapEffects.some((effect) => effect.kind === 'passage'
    && effect.owner === hero.owner && effect.expiresDay >= state.day
    && effect.entrances.some((entry) => sameCoord(entry, hero.position))
    && effect.entrances.some((entry) => sameCoord(entry, destination)));
  const freeForest = hero
    ? state.players[hero.owner].adventureEffects.greenTideUntilWeek >= state.week : false;
  const reachable = path ? passage ? path : reachablePathPrefix(
    state.map, path, hero!.movement, hero!, state.omen, freeForest,
  ) : [];
  return hero ? truncateAtMovementInterruption(state, reachable, hero) : reachable;
}

function truncateAtMovementInterruption(state: GameState, path: Coord[], hero: Hero): Coord[] {
  const index = path.findIndex((coord, step) => step > 0
    && (Boolean(guardianAt(state.map, coord))
      || guardiansCovering(state.map, coord, hero.id).length > 0
      || state.map.objects.some((object) => object.kind === 'sirenRocks'
        && !object.cleared && !(object.approachedBy ?? []).includes(hero.id)
        && Math.max(Math.abs(object.position.x - coord.x),
          Math.abs(object.position.y - coord.y)) === 2)));
  return index < 0 ? path : path.slice(0, index + 1);
}

export function battleStackController(
  state: GameState,
  stack: BattleStack,
): 'human' | 'ai' {
  if (stack.side === 'attacker') {
    return state.players[state.activePlayer].controller === 'human' ? 'human' : 'ai';
  }
  const defenderId = state.battle?.context.defenderPlayerId;
  return defenderId && state.players[defenderId].controller === 'human' ? 'human' : 'ai';
}

export function activeBattleOptions(state: GameState) {
  if (!state.battle) return { actions: [], reachable: [] as Coord[] };
  const actions = legalBattleActions(state.battle);
  if (state.battle.pendingFreeMove) return {
    actions,
    reachable: actions.flatMap((action) => action.type === 'BATTLE_FREE_MOVE'
      ? [action.destination] : []),
  };
  const stack = state.battle.stacks.find(
    (item) => item.id === state.battle!.currentStackId && item.count > 0,
  );
  return {
    actions,
    reachable: stack ? battleReachableHexes(state.battle, stack) : [],
  };
}

export function opponent(playerId: PlayerId): PlayerId {
  return playerId === 'p1' ? 'p2' : 'p1';
}

export type GuardianSizeBand = 'Few' | 'Several' | 'Pack' | 'Lots' | 'Horde'
  | 'Throng' | 'Swarm' | 'Zounds' | 'Legion';

export function guardianSizeBand(count: number): GuardianSizeBand {
  if (count <= 4) return 'Few';
  if (count <= 9) return 'Several';
  if (count <= 19) return 'Pack';
  if (count <= 49) return 'Lots';
  if (count <= 99) return 'Horde';
  if (count <= 249) return 'Throng';
  if (count <= 499) return 'Swarm';
  if (count <= 999) return 'Zounds';
  return 'Legion';
}

export interface GuardianIntel {
  exact: boolean;
  label: string;
  count: number | null;
  abilities: AbilityId[];
  units: Array<{ unitId: UnitId; name: string; label: string; count: number | null }>;
  tell?: string;
  drop?: string;
}

export interface EnemyHeroIntel {
  army: Hero['army'] | null;
  spells: Hero['knownSpells'] | null;
  items: Hero['inventory'] | null;
  mana: number | null;
}

export function enemyHeroIntel(viewer: Hero, target: Hero): EnemyHeroIntel {
  const rank = skillRank(viewer, 'scouting');
  return {
    army: rank >= 2 ? target.army.map((stack) => stack && { ...stack }) : null,
    spells: rank >= 3 ? [...target.knownSpells] : null,
    items: rank >= 3 ? target.inventory.map((item) =>
      item && typeof item !== 'string' ? { ...item } : item) : null,
    mana: rank >= 3 ? target.mana : null,
  };
}

export function guardianIntel(
  state: GameState,
  object: MapObject,
  hero = selectedHero(state.players[state.activePlayer]),
): GuardianIntel | null {
  const guardian = object.kind === 'guardian' ? object : state.map.objects.find((candidate) =>
    candidate.kind === 'guardian'
    && (candidate.protects === object.id || object.guardedBy?.includes(candidate.id)));
  if (!guardian || guardian.kind !== 'guardian') return null;
  const count = guardian.army.reduce((sum, stack) => sum + stack.count, 0);
  const distance = hero
    ? Math.max(Math.abs(hero.position.x - guardian.position.x),
      Math.abs(hero.position.y - guardian.position.y))
    : Number.POSITIVE_INFINITY;
  const exact = distance <= 1 || Boolean(hero
    && skillRank(hero, 'scouting') >= 1
    && distance <= SKILLS.scouting.values.inspectRange)
    || Boolean(hero && artifactEffectTotal(hero, 'scouting') >= distance);
  const abilities = exact
    ? [...new Set(guardian.army.flatMap((stack) => UNITS[stack.unitId].abilities))]
    : [];
  return {
    exact,
    label: guardian.army.map((stack) => `${exact ? stack.count : guardianSizeBand(stack.count)} ${
      UNITS[stack.unitId].name
    }`).join(' · '),
    count: exact ? count : null, abilities,
    units: guardian.army.map((stack) => ({
      unitId: stack.unitId,
      name: UNITS[stack.unitId].name,
      label: exact ? String(stack.count) : guardianSizeBand(stack.count),
      count: exact ? stack.count : null,
    })),
    ...(exact && object.kind === 'lock' ? { tell: object.tell } : {}),
    ...(hero && artifactEffectTotal(hero, 'reveal_drops') > 0 && guardian.drop
      ? { drop: itemName(guardian.drop) } : {}),
  };
}
