import {
  EFFECT_PRIMITIVE_CONTRACTS, effectPrimitiveHandler, registerEffectPrimitiveHandler,
} from '../../content/v2/registries';
import type { EffectPrimitiveHandler, EffectPrimitiveId } from '../../content/v2/schema';
import { maximumMana } from '../heroBehaviors';
import { coordKey, inBounds, movementCost, sameCoord } from '../map/pathfinding';
import { castleFootprintTiles, objectFootprintTiles } from '../map/occupancy';
import { terrainIdAt } from '../../content/terrain';
import type {
  AdventurePrebattleCondition, BattleState, Coord, CounterId, GameState, Hero, PlayerId,
} from '../types';
import { UNITS } from '../../content/units';

export const ADVENTURE_PRIMITIVE_REASON_TEXT = {
  'caster-not-found': 'The casting hero is not present.',
  'target-not-found': 'The chosen target is not present.',
  'target-not-owned': 'Choose a living hero you own.',
  'target-not-enemy': 'Choose a living enemy hero or enemy player.',
  'target-not-explored': 'The target must be in explored territory.',
  'destination-out-of-range': 'The destination is outside the spell’s radius.',
  'destination-occupied': 'The destination is occupied.',
  'destination-illegal': 'The destination is not a legal stopping tile.',
  'mine-not-enemy': 'Choose an explored enemy-owned mine.',
  'invalid-value': 'The requested magnitude or duration is invalid.',
  'no-guardians': 'No neutral guardians are in range.',
} as const;

export type AdventurePrimitiveReasonCode = keyof typeof ADVENTURE_PRIMITIVE_REASON_TEXT;
export type AdventurePrimitiveResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; reason: { code: AdventurePrimitiveReasonCode; text: string } };

const ok = <T>(value: T): AdventurePrimitiveResult<T> => ({ ok: true, value });
const blocked = <T = undefined>(code: AdventurePrimitiveReasonCode): AdventurePrimitiveResult<T> => ({
  ok: false, reason: { code, text: ADVENTURE_PRIMITIVE_REASON_TEXT[code] },
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isCoord = (value: unknown): value is Coord => isRecord(value)
  && Number.isInteger(value.x) && Number.isFinite(value.x)
  && Number.isInteger(value.y) && Number.isFinite(value.y);
const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
  value === undefined || typeof value === 'boolean';
const COUNTERS = new Set<CounterId>(['burn', 'chill', 'hex', 'bloom']);

function heroById(state: GameState, id: string): Hero | undefined {
  return Object.values(state.players).flatMap((player) => player.heroes)
    .find((hero) => hero.id === id && hero.alive);
}

function distance(first: Coord, second: Coord): number {
  return Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y));
}

function destinationOccupied(state: GameState, caster: Hero, destination: Coord): boolean {
  return Object.values(state.players).flatMap((player) => player.heroes)
    .some((hero) => hero.alive && hero.id !== caster.id && sameCoord(hero.position, destination))
    || state.castles.some((castle) => castleFootprintTiles(castle)
      .some((tile) => sameCoord(tile, destination)))
    || state.map.objects.some((object) => objectFootprintTiles(object)
      .some((tile) => sameCoord(tile, destination)))
    || state.mapEffects.some((effect) => effect.kind === 'thicket'
      && effect.expiresDay >= state.day
      && effect.positions.some((tile) => sameCoord(tile, destination)));
}

export function heroTeleportInRadiusReason(
  state: GameState, casterId: string, destination: Coord, radius: number,
): AdventurePrimitiveResult<Coord> {
  const caster = heroById(state, casterId);
  if (!caster) return blocked('caster-not-found');
  if (!isCoord(destination)) return blocked('destination-illegal');
  if (!Number.isInteger(radius) || radius < 0) return blocked('invalid-value');
  const destinationTerrain = inBounds(state.map, destination)
    ? terrainIdAt(state.map, destination) : undefined;
  if (!destinationTerrain || destinationTerrain === 'mountain' || destinationTerrain === 'water'
      || !Number.isFinite(movementCost(state.map, caster.position, destination, caster, state.omen))) {
    return blocked('destination-illegal');
  }
  if (!state.players[caster.owner].explored.includes(coordKey(destination))) {
    return blocked('target-not-explored');
  }
  if (distance(caster.position, destination) > radius) return blocked('destination-out-of-range');
  if (destinationOccupied(state, caster, destination)) return blocked('destination-occupied');
  return ok({ ...destination });
}

export function teleportHeroInRadius(
  state: GameState, casterId: string, destination: Coord, radius: number,
): AdventurePrimitiveResult<Coord> {
  const caster = heroById(state, casterId);
  const legal = heroTeleportInRadiusReason(state, casterId, destination, radius);
  if (!legal.ok || !caster) return legal;
  if (caster.embarkedBoatId) {
    const boat = state.map.objects.find((object) => object.kind === 'boat'
      && object.id === caster.embarkedBoatId);
    if (boat?.kind === 'boat') {
      boat.position = { ...caster.position };
      boat.occupiedBy = null;
    }
    caster.embarkedBoatId = null;
  }
  caster.position = { ...destination };
  caster.pathMemory = [];
  return ok({ ...destination });
}

export function grantTerrainIgnoreDay(
  state: GameState, casterId: string, movementCostPerTile: number,
  domains: Array<'mountain' | 'water'> = ['mountain', 'water'],
  ignoreGuardianAggro = false,
): AdventurePrimitiveResult<Hero['adventureEffects']['terrainIgnore']> {
  const caster = heroById(state, casterId);
  if (!caster) return blocked('caster-not-found');
  if (!Number.isInteger(movementCostPerTile) || movementCostPerTile <= 0 || !domains.length) {
    return blocked('invalid-value');
  }
  if (domains.some((domain) => domain !== 'mountain' && domain !== 'water')
      || typeof ignoreGuardianAggro !== 'boolean') return blocked('invalid-value');
  caster.adventureEffects.terrainIgnore = {
    day: state.day, movementCost: movementCostPerTile,
    domains: [...new Set(domains)], ignoreGuardianAggro,
  };
  return ok(caster.adventureEffects.terrainIgnore);
}

export function restoreRemoteMana(
  state: GameState, casterId: string, targetHeroId: string, amount: number,
  movement = 0,
): AdventurePrimitiveResult<{ mana: number; movement: number }> {
  const caster = heroById(state, casterId);
  if (!caster) return blocked('caster-not-found');
  const target = heroById(state, targetHeroId);
  if (!target) return blocked('target-not-found');
  if (target.owner !== caster.owner) return blocked('target-not-owned');
  if (!Number.isInteger(amount) || amount <= 0
      || !Number.isInteger(movement) || movement < 0) {
    return blocked('invalid-value');
  }
  target.mana = Math.min(maximumMana(target, state.players[target.owner]), target.mana + amount);
  target.movement += movement;
  return ok({ mana: target.mana, movement: target.movement });
}

export function stealMineProduction(
  state: GameState, casterId: string, mineId: string, futureDays: number, hidden = false,
): AdventurePrimitiveResult<string> {
  const caster = heroById(state, casterId);
  if (!caster) return blocked('caster-not-found');
  if (!Number.isInteger(futureDays) || futureDays <= 0) return blocked('invalid-value');
  if (typeof hidden !== 'boolean') return blocked('invalid-value');
  const mine = state.map.objects.find((object) => object.id === mineId && object.kind === 'mine');
  if (!mine || mine.kind !== 'mine' || !mine.owner || mine.owner === caster.owner
      || !state.players[caster.owner].explored.includes(coordKey(mine.position))) {
    return blocked('mine-not-enemy');
  }
  mine.productionRedirect = {
    recipient: caster.owner, originalOwner: mine.owner,
    // Casting happens after today's income. `futureDays` therefore starts tomorrow.
    startsDay: state.day + 1, throughDay: state.day + futureDays, hidden,
  };
  return ok(mine.id);
}

export function denyEnemyMovement(
  state: GameState, casterId: string, targetHeroId: string, followingDays: number,
  denyManaRegeneration = false,
): AdventurePrimitiveResult<number> {
  const caster = heroById(state, casterId);
  if (!caster) return blocked('caster-not-found');
  const target = heroById(state, targetHeroId);
  if (!target) return blocked('target-not-found');
  if (target.owner === caster.owner) return blocked('target-not-enemy');
  if (!Number.isInteger(followingDays) || followingDays <= 0) return blocked('invalid-value');
  if (typeof denyManaRegeneration !== 'boolean') return blocked('invalid-value');
  // The cast zeros the remainder of today; this boundary names complete following days.
  const throughDay = state.day + followingDays;
  target.movement = 0;
  target.adventureEffects.movementDeniedThroughDay = Math.max(
    throughDay, target.adventureEffects.movementDeniedThroughDay ?? 0,
  );
  if (denyManaRegeneration) target.adventureEffects.manaRegenDeniedThroughDay = Math.max(
    throughDay, target.adventureEffects.manaRegenDeniedThroughDay ?? 0,
  );
  return ok(throughDay);
}

export function attachPrebattleCondition(
  state: GameState, casterId: string,
  target: { heroId?: string; playerId?: PlayerId },
  condition: Omit<AdventurePrebattleCondition, 'id'>,
): AdventurePrimitiveResult<string> {
  const caster = heroById(state, casterId);
  if (!caster) return blocked('caster-not-found');
  const heroTarget = isRecord(target) && typeof target.heroId === 'string'
    && target.playerId === undefined;
  const playerTarget = isRecord(target) && typeof target.playerId === 'string'
    && target.heroId === undefined;
  if (!heroTarget && !playerTarget) {
    return blocked('invalid-value');
  }
  if (!isRecord(condition) || (condition.counters !== undefined
      && (!isRecord(condition.counters) || Object.keys(condition.counters)
        .some((counter) => !COUNTERS.has(counter as CounterId))))) return blocked('invalid-value');
  if (!Number.isInteger(condition.expiresWeek) || condition.expiresWeek < state.week
      || !Number.isInteger(condition.remainingBattles) || condition.remainingBattles <= 0
      || (condition.rangedShotsMultiplier !== undefined
        && !(condition.rangedShotsMultiplier >= 0 && condition.rangedShotsMultiplier <= 1))
      || Object.values(condition.counters ?? {}).some((amount) =>
        amount === undefined || !Number.isInteger(amount) || amount < 0)) {
    return blocked('invalid-value');
  }
  const id = `prebattle:${caster.id}:${state.day}:${target.heroId ?? target.playerId}:`;
  const entry: AdventurePrebattleCondition = { id, ...condition };
  if (target.heroId) {
    const hero = heroById(state, target.heroId);
    if (!hero) return blocked('target-not-found');
    if (hero.owner === caster.owner) return blocked('target-not-enemy');
    hero.adventureEffects.prebattleConditions ??= [];
    entry.id += hero.adventureEffects.prebattleConditions.length;
    hero.adventureEffects.prebattleConditions.push(entry);
  } else if (target.playerId && state.players[target.playerId]?.active) {
    if (target.playerId === caster.owner) return blocked('target-not-enemy');
    const effects = state.players[target.playerId].adventureEffects;
    effects.prebattleConditions ??= [];
    entry.id += effects.prebattleConditions.length;
    effects.prebattleConditions.push(entry);
  } else return blocked('target-not-found');
  return ok(entry.id);
}

export function revealGuardianIntel(
  state: GameState, casterId: string, radius: number, throughDay = state.day,
): AdventurePrimitiveResult<string[]> {
  const caster = heroById(state, casterId);
  if (!caster) return blocked('caster-not-found');
  if (!Number.isInteger(radius) || radius < 0 || !Number.isInteger(throughDay)
      || throughDay < state.day) {
    return blocked('invalid-value');
  }
  const guardians = state.map.objects.filter((object) => object.kind === 'guardian'
    && distance(caster.position, object.position) <= radius)
    .sort((first, second) => first.id.localeCompare(second.id));
  if (!guardians.length) return blocked('no-guardians');
  const player = state.players[caster.owner];
  player.adventureEffects.guardianIntel ??= {};
  for (const guardian of guardians) {
    player.adventureEffects.guardianIntel[guardian.id] = Math.max(
      throughDay, player.adventureEffects.guardianIntel[guardian.id] ?? 0,
    );
    if (!player.explored.includes(coordKey(guardian.position))) {
      player.explored.push(coordKey(guardian.position));
    }
  }
  return ok(guardians.map((guardian) => guardian.id));
}

export function applyPrebattleConditions(
  state: GameState, battle: BattleState, hero: Hero, side: 'attacker' | 'defender',
): void {
  const playerEffects = state.players[hero.owner].adventureEffects;
  const playerConditions = playerEffects.prebattleConditions ?? [];
  const heroConditions = hero.adventureEffects.prebattleConditions ?? [];
  const applicable = [...heroConditions, ...playerConditions]
    .filter((condition) => condition.expiresWeek >= state.week && condition.remainingBattles > 0);
  for (const condition of applicable) {
    for (const stack of battle.stacks.filter((candidate) => candidate.side === side)) {
      for (const [counter, amount] of Object.entries(condition.counters ?? {}) as Array<[
        CounterId, number
      ]>) stack.counters[counter] = Math.min(9, stack.counters[counter] + amount);
      if (condition.rangedShotsMultiplier !== undefined
          && UNITS[stack.unitId].abilities.includes('ranged')) {
        stack.shots = Math.floor(stack.shots * condition.rangedShotsMultiplier);
      }
    }
    condition.remainingBattles -= 1;
  }
  hero.adventureEffects.prebattleConditions = heroConditions.filter((condition) =>
    condition.expiresWeek >= state.week && condition.remainingBattles > 0);
  playerEffects.prebattleConditions = playerConditions.filter((condition) =>
    condition.expiresWeek >= state.week && condition.remainingBattles > 0);
}

type AdventurePrimitiveId = Extract<EffectPrimitiveId,
  'hero-teleport-radius' | 'terrain-ignore-day' | 'remote-mana' | 'production-steal'
  | 'enemy-movement-denial' | 'prebattle-condition' | 'guardian-intel'>;
function malformed(): AdventurePrimitiveResult { return blocked('invalid-value'); }

function applyPayload(
  id: AdventurePrimitiveId, state: GameState, casterId: string, payload: unknown,
): unknown {
  if (!isRecord(payload)) return malformed();
  switch (id) {
    case 'hero-teleport-radius':
      if (!isCoord(payload.destination)) return blocked('destination-illegal');
      return Number.isInteger(payload.radius)
        ? teleportHeroInRadius(state, casterId, payload.destination, payload.radius as number)
        : malformed();
    case 'terrain-ignore-day': {
      const domains = payload.domains === undefined ? ['mountain', 'water'] : payload.domains;
      if (!Number.isInteger(payload.movementCost) || !Array.isArray(domains) || !domains.length
          || domains.some((domain) => domain !== 'mountain' && domain !== 'water')
          || !isOptionalBoolean(payload.ignoreGuardianAggro)) return malformed();
      return grantTerrainIgnoreDay(state, casterId, payload.movementCost as number,
        domains as Array<'mountain' | 'water'>, payload.ignoreGuardianAggro ?? false);
    }
    case 'remote-mana':
      return typeof payload.targetHeroId === 'string' && Number.isInteger(payload.amount)
        && (payload.amount as number) > 0
        && (payload.movement === undefined
          || (Number.isInteger(payload.movement) && (payload.movement as number) >= 0))
        ? restoreRemoteMana(state, casterId, payload.targetHeroId, payload.amount as number,
          payload.movement as number | undefined)
        : malformed();
    case 'production-steal':
      return typeof payload.mineId === 'string' && Number.isInteger(payload.days)
        && isOptionalBoolean(payload.hidden)
        ? stealMineProduction(state, casterId, payload.mineId, payload.days as number,
          payload.hidden ?? false)
        : malformed();
    case 'enemy-movement-denial':
      return typeof payload.targetHeroId === 'string' && Number.isInteger(payload.days)
        && isOptionalBoolean(payload.denyManaRegeneration)
        ? denyEnemyMovement(state, casterId, payload.targetHeroId, payload.days as number,
          payload.denyManaRegeneration ?? false)
        : malformed();
    case 'prebattle-condition': {
      if (!isRecord(payload.target) || !isRecord(payload.condition)) return malformed();
      return attachPrebattleCondition(state, casterId,
        payload.target as { heroId?: string; playerId?: PlayerId },
        payload.condition as unknown as Omit<AdventurePrebattleCondition, 'id'>);
    }
    case 'guardian-intel':
      return Number.isInteger(payload.radius)
        && (payload.throughDay === undefined || Number.isInteger(payload.throughDay))
        ? revealGuardianIntel(state, casterId, payload.radius as number,
          payload.throughDay as number | undefined)
        : malformed();
  }
}

export const ADVENTURE_PRIMITIVE_HANDLERS: readonly EffectPrimitiveHandler[] =
  (['hero-teleport-radius', 'terrain-ignore-day', 'remote-mana', 'production-steal',
    'enemy-movement-denial', 'prebattle-condition', 'guardian-intel'] as AdventurePrimitiveId[])
    .map((id) => ({
    id, stage: EFFECT_PRIMITIVE_CONTRACTS[id].stage,
    apply: (context, payload) => {
      const { state, casterId } = context as { state: GameState; casterId: string };
      return applyPayload(id, state, casterId, payload);
    },
  }));

export function ensureAdventurePrimitiveHandlersRegistered(): void {
  for (const handler of ADVENTURE_PRIMITIVE_HANDLERS) {
    const current = effectPrimitiveHandler(handler.id);
    if (!current) registerEffectPrimitiveHandler(handler);
    else if (current !== handler) throw new Error(`Duplicate effect primitive handler: ${handler.id}`);
  }
}

export function applyAdventurePrimitive(
  state: GameState, casterId: string, id: AdventurePrimitiveId, payload: unknown,
): unknown {
  ensureAdventurePrimitiveHandlersRegistered();
  const handler = effectPrimitiveHandler(id);
  if (!handler) throw new Error(`Adventure primitive handler is missing: ${id}`);
  return handler.apply({ state, casterId }, payload);
}

ensureAdventurePrimitiveHandlersRegistered();
