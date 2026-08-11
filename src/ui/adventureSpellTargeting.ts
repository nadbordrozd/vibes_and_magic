import { SPELLS } from '../content/spells';
import { UNITS } from '../content/units';
import { terrainIdAt } from '../content/terrain';
import { coordKey, inBounds, sameCoord } from '../core/map/pathfinding';
import { castleFootprintTiles, objectFootprintTiles } from '../core/map/occupancy';
import type { Action, Coord, GameState, Hero, SpellId } from '../core/types';

export type AdventureCastAction = Extract<Action, { type: 'CAST_ADVENTURE_SPELL' }>;

export const MAP_TARGET_SPELLS: SpellId[] = [
  'gate', 'coldRoad', 'greenway', 'murmuration', 'rootAndRuin',
];

export function isMapTargetSpell(spellId: SpellId): boolean {
  return MAP_TARGET_SPELLS.includes(spellId);
}

function distance(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function forestConnected(state: GameState, from: Coord, to: Coord): boolean {
  const queue = [from];
  const seen = new Set([coordKey(from)]);
  while (queue.length) {
    const current = queue.shift()!;
    if (sameCoord(current, to)) return true;
    for (let y = current.y - 1; y <= current.y + 1; y += 1) {
      for (let x = current.x - 1; x <= current.x + 1; x += 1) {
        const next = { x, y };
        const key = coordKey(next);
        if ((x === current.x && y === current.y) || seen.has(key)
            || terrainIdAt(state.map, next) !== 'deepwood') continue;
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return false;
}

export function mapTargetReason(
  state: GameState, hero: Hero, spellId: SpellId, target: Coord, chosen: Coord[],
): string | null {
  if (!inBounds(state.map, target)) return 'Outside the map.';
  if (chosen.some((position) => sameCoord(position, target))) return 'Choose a different tile.';
  const explored = state.players[hero.owner].explored.includes(coordKey(target));
  if (spellId === 'gate') return explored ? null : 'Gate entrances must be explored.';
  if (spellId === 'coldRoad') {
    if (terrainIdAt(state.map, hero.position) !== 'barrowfield') {
      return 'The caster must stand on Barrow-field.';
    }
    if (!explored || terrainIdAt(state.map, target) !== 'barrowfield') {
      return 'Choose an explored Barrow-field tile.';
    }
    return sameCoord(hero.position, target) ? 'Choose another Barrow-field tile.' : null;
  }
  if (spellId === 'greenway') {
    const range = hero.upgradedSpells.includes(spellId) ? 25 : 15;
    if (terrainIdAt(state.map, hero.position) !== 'deepwood') {
      return 'The caster must stand in Deepwood.';
    }
    if (!explored || terrainIdAt(state.map, target) !== 'deepwood') {
      return 'Choose an explored Deepwood tile.';
    }
    if (distance(hero.position, target) > range) return `Choose a tile within ${range} tiles.`;
    return forestConnected(state, hero.position, target)
      ? null : 'The destination is not connected through Deepwood.';
  }
  if (spellId === 'rootAndRuin') {
    const occupied = state.castles.some((castle) => castleFootprintTiles(castle)
      .some((tile) => sameCoord(tile, target))) || state.map.objects.some((object) =>
      objectFootprintTiles(object).some((tile) => sameCoord(tile, target)));
    return occupied ? 'Choose an empty tile without a city or map object.' : null;
  }
  return null;
}

export function legalMapTargets(
  state: GameState, hero: Hero, spellId: SpellId, chosen: Coord[],
): Set<string> {
  const legal = new Set<string>();
  state.map.terrain.forEach((row, y) => row.forEach((_terrain, x) => {
    const target = { x, y };
    if (!mapTargetReason(state, hero, spellId, target, chosen)) legal.add(coordKey(target));
  }));
  return legal;
}

export function requiredMapTargets(hero: Hero, spellId: SpellId): number | null {
  if (spellId === 'gate') return 2;
  if (spellId === 'rootAndRuin') return hero.upgradedSpells.includes(spellId) ? 5 : 3;
  if (spellId === 'murmuration') return null;
  return 1;
}

export function mapDraftAction(
  spellId: SpellId, hero: Hero, positions: Coord[],
): AdventureCastAction {
  const action: AdventureCastAction = { type: 'CAST_ADVENTURE_SPELL', spellId };
  if (spellId === 'gate') {
    action.target = positions[0];
    action.secondaryTarget = positions[1];
  } else if (spellId === 'rootAndRuin') action.positions = positions;
  else if (spellId === 'murmuration') action.positions = [{ ...hero.position }, ...positions];
  else action.target = positions[0];
  return action;
}

export function beastGuardianGold(state: GameState, targetId?: string): number | null {
  const target = state.map.objects.find((object) => object.id === targetId);
  const guardian = target?.kind === 'guardian' ? target : state.map.objects.find((object) =>
    object.kind === 'guardian' && object.protects === targetId);
  if (!guardian || guardian.kind !== 'guardian'
      || !guardian.army.every((stack) => UNITS[stack.unitId].abilities.includes('beast'))) return null;
  return guardian.army.reduce((sum, stack) =>
    sum + (UNITS[stack.unitId].cost.gold ?? 0) * stack.count, 0);
}

export function adventureDraftIncompleteReason(
  state: GameState, action: AdventureCastAction,
): string | null {
  const hero = state.players[state.activePlayer].hero!;
  const plus = hero.upgradedSpells.includes(action.spellId);
  const ownedCastles = state.castles.filter((castle) => castle.owner === hero.owner);
  if (action.spellId === 'beacon' && !ownedCastles.length) return 'No friendly city can receive the hero.';
  if (action.spellId === 'beacon' && plus && !action.castleId) return 'Choose a friendly city.';
  if (action.spellId === 'feastDay' && ownedCastles.some((castle) =>
    castle.growthEffects.some((effect) => effect.id === `feast-${state.week}`))) {
    return 'Feast Day was already cast this week.';
  }
  if (action.spellId === 'waysideShrine' && plus && !action.school) return 'Choose a resonance school.';
  if (action.spellId === 'saltTheVein' && !action.targetId) {
    return state.map.objects.some((object) => object.kind === 'mine' && object.owner
      && object.owner !== hero.owner
      && state.players[hero.owner].explored.includes(coordKey(object.position)))
      ? 'Choose a visible enemy mine.' : 'No visible enemy mine is currently eligible.';
  }
  if (action.spellId === 'falseColors' && plus && !action.displayedBand) return 'Choose a displayed army band.';
  if (action.spellId === 'clockworkCourier') {
    if (!action.courierKind || action.sourceSlot === undefined) {
      return hero.inventory.some(Boolean) || hero.army.some(Boolean)
        ? 'Choose an item or army company to send.' : 'This hero has no item or army company to send.';
    }
    if (action.destinationSlot === undefined || (!action.targetHeroId && !action.castleId)) {
      return 'Choose an exact hero or garrison destination slot.';
    }
  }
  if (action.spellId === 'coldRoad' && !action.target) return 'Choose an explored Barrow-field destination.';
  if (action.spellId === 'greenway' && !action.target) return 'Choose a connected Deepwood destination.';
  if (action.spellId === 'gate' && (!action.target || !action.secondaryTarget)) return 'Choose both Gate entrances.';
  if (action.spellId === 'rootAndRuin' && !action.positions?.length) return 'Choose every thicket tile.';
  if (action.spellId === 'murmuration' && (action.positions?.length ?? 0) < 2) return 'Draw at least one scouting step.';
  if (action.spellId === 'paleProcession') {
    const record = [...state.battleRecords].reverse().find((entry) =>
      sameCoord(entry.position, hero.position) && entry.casualties >= 100);
    if (!record) return 'At least 100 units must have died on this tile.';
    if (!hero.army.some((stack) => !stack || stack.unitId === 'candleWisps')) {
      return 'No free army slot can receive the Candle-Wisps.';
    }
  }
  if (action.spellId === 'graveSpeech' && ![...state.battleRecords].reverse().some((entry) =>
    sameCoord(entry.position, hero.position))) return 'No battle was fought on this tile.';
  if (action.spellId === 'wildGrowth' && !action.castleId) return ownedCastles.length
    ? 'Choose an owned city.' : 'No owned city is currently eligible.';
  if (action.spellId === 'beastTongue') {
    const value = beastGuardianGold(state, action.targetId);
    if (value === null) return state.map.objects.some((object) => object.kind === 'guardian'
      && object.army.every((stack) => UNITS[stack.unitId].abilities.includes('beast')))
      ? 'Choose a beast guardian or its protected object.' : 'No beast guardian is currently eligible.';
    const cost = value * (plus && action.recruit ? 3 : 2);
    if (state.players[hero.owner].resources.gold < cost) return `Requires ${cost} gold.`;
    if (plus && action.recruit) {
      const guardian = state.map.objects.find((object) => object.kind === 'guardian'
        && (object.id === action.targetId || object.protects === action.targetId));
      const freeSlots = hero.army.filter((stack) => !stack).length;
      const newTypes = guardian?.kind === 'guardian' ? guardian.army.filter((stack) =>
        !hero.army.some((existing) => existing?.unitId === stack.unitId)).length : 0;
      if (newTypes > freeSlots) return `Recruiting needs ${newTypes} free army slots; ${freeSlots} available.`;
    }
    if (plus && action.recruit === undefined) return 'Choose whether to disperse or recruit the guardians.';
  }
  if (action.spellId === 'graveSpeech' && plus) {
    const record = [...state.battleRecords].reverse().find((entry) =>
      sameCoord(entry.position, hero.position));
    if (record?.spells.length && !action.learnSpellId && !action.skipLearnSpell) {
      return 'Choose a remembered spell to learn, or explicitly continue without learning one.';
    }
  }
  if (action.spellId === 'fickleWeather' && !action.omen) return 'Choose one of the dealt omens.';
  if (!SPELLS[action.spellId]) return 'Unknown adventure spell.';
  return null;
}
