import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import { OMEN_IDS } from '../../content/omens';
import { addUnits } from '../army';
import { skillRank } from '../heroBehaviors';
import { activeHero, findOwnedHero } from '../heroes';
import { coordKey, inBounds, sameCoord } from '../map/pathfinding';
import { castleEntrance, castleFootprintTiles, objectFootprintTiles } from '../map/occupancy';
import type {
  Action, Coord, GameState, Hero, MapObject, OmenId, SpellId, SpellSchool,
} from '../types';
import { terrainId, terrainIdAt } from '../../content/terrain';
import { hasEquippedArtifact } from '../artifacts';

type AdventureCast = Extract<Action, { type: 'CAST_ADVENTURE_SPELL' }>;
type GuardedObject = Extract<MapObject, { kind: 'guardian' }>;

export const ADVENTURE_SPELL_MOVE_COST = 300;

export function adventureSpellMoveCost(hero: Hero): number {
  return Math.max(0, ADVENTURE_SPELL_MOVE_COST
    - (skillRank(hero, 'provisioner') >= 2 ? 150 : 0));
}

export function isAdventureSpell(spellId: SpellId): boolean {
  return ['adventure', 'topology'].includes(SPELLS[spellId].kind);
}

export function canCastAdventureSpell(state: GameState, spellId: SpellId): boolean {
  if (state.phase !== 'adventure' || state.pendingChoice || state.magicDisabled
      || !isAdventureSpell(spellId)) return false;
  const hero = activeHero(state);
  const mana = SPELLS[spellId].mana;
  const freeFace = spellId === 'falseColors' && hasEquippedArtifact(hero, 'spareFace')
    && hero.adventureEffects.spareFaceUsedWeek !== state.week;
  return hero.knownSpells.includes(spellId) && typeof mana === 'number'
    && (freeFace || (hero.mana >= mana && hero.movement >= adventureSpellMoveCost(hero)));
}

function upgraded(hero: Hero, spellId: SpellId): boolean {
  return hero.upgradedSpells.includes(spellId);
}

function explored(state: GameState, hero: Hero, coord: Coord): boolean {
  return state.players[hero.owner].explored.includes(coordKey(coord));
}

function distance(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function reveal(state: GameState, hero: Hero, positions: Coord[], radius = 0): void {
  const known = new Set(state.players[hero.owner].explored);
  for (const position of positions) {
    for (let y = position.y - radius; y <= position.y + radius; y += 1) {
      for (let x = position.x - radius; x <= position.x + radius; x += 1) {
        const coord = { x, y };
        if (inBounds(state.map, coord) && distance(position, coord) <= radius) {
          known.add(coordKey(coord));
        }
      }
    }
  }
  state.players[hero.owner].explored = [...known];
}

function guardianObject(state: GameState, id?: string): GuardedObject {
  const selected = state.map.objects.find((candidate) => candidate.id === id);
  const object = selected?.kind === 'guardian' ? selected : state.map.objects.find((candidate) =>
    candidate.kind === 'guardian' && candidate.protects === selected?.id);
  if (!object || object.kind !== 'guardian') {
    throw new Error('A guarded map object is required');
  }
  return object;
}

function guardianGoldValue(object: ReturnType<typeof guardianObject>): number {
  return object.army.reduce((sum, stack) =>
    sum + (UNITS[stack.unitId].cost.gold ?? 0) * stack.count, 0);
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

function moveToCastle(state: GameState, hero: Hero, action: AdventureCast, plus: boolean): void {
  const castles = state.castles.filter((castle) => castle.owner === hero.owner);
  const chosen = plus && action.castleId
    ? castles.find((castle) => castle.id === action.castleId)
    : [...castles].sort((a, b) => distance(hero.position, a.position)
      - distance(hero.position, b.position) || a.id.localeCompare(b.id))[0];
  if (!chosen) throw new Error('No eligible friendly castle');
  hero.position = castleEntrance(chosen);
  hero.pathMemory = [];
}

function castTopology(
  state: GameState, hero: Hero, action: AdventureCast, plus: boolean,
): boolean {
  if (action.spellId === 'beacon') {
    moveToCastle(state, hero, action, plus);
  } else if (action.spellId === 'gate') {
    const first = action.target ?? hero.position;
    const second = action.secondaryTarget;
    if (!second || sameCoord(first, second) || !explored(state, hero, first)
        || !explored(state, hero, second)) throw new Error('Gate needs two explored points');
    state.mapEffects.push({
      id: `gate-${hero.id}-${state.day}-${state.mapEffects.length}`,
      kind: 'passage', entrances: [{ ...first }, { ...second }], owner: hero.owner,
      expiresDay: plus ? state.week * 7 : state.day + 1,
    });
  } else if (action.spellId === 'coldRoad') {
    const target = action.target;
    if (!target || terrainIdAt(state.map, hero.position) !== 'barrowfield'
        || terrainIdAt(state.map, target) !== 'barrowfield'
        || !explored(state, hero, target)) throw new Error('Cold Road joins explored barrows');
    const origin = { ...hero.position };
    hero.position = { ...target };
    if (plus && action.targetHeroId) {
      const companion = findOwnedHero(state, hero.owner, action.targetHeroId);
      if (!companion || distance(companion.position, origin) > 1) {
        throw new Error('The companion must be adjacent');
      }
      companion.position = { ...target };
    }
  } else if (action.spellId === 'greenway') {
    const target = action.target;
    const range = plus ? 25 : 15;
    if (!target || distance(hero.position, target) > range
        || terrainIdAt(state.map, hero.position) !== 'deepwood'
        || terrainIdAt(state.map, target) !== 'deepwood'
        || !explored(state, hero, target) || !forestConnected(state, hero.position, target)) {
      throw new Error('Greenway needs a connected explored forest tile in range');
    }
    hero.position = { ...target };
    hero.pathMemory = [];
  } else if (action.spellId === 'summonSkiff') {
    const shores = state.map.terrain.flatMap((row, y) => row.flatMap((terrain, x) => {
      if (terrainId(terrain) !== 'water') return [];
      const position = { x, y };
      const touchesLand = [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) =>
        (dx || dy) && state.map.terrain[y + dy]?.[x + dx]
          && terrainIdAt(state.map, { x: x + dx, y: y + dy }) !== 'water'
          && terrainIdAt(state.map, { x: x + dx, y: y + dy }) !== 'mountain'));
      const occupied = state.map.objects.some((object) => object.kind === 'boat'
        && sameCoord(object.position, position));
      return touchesLand && !occupied ? [position] : [];
    })).sort((a, b) => distance(hero.position, a) - distance(hero.position, b)
      || a.y - b.y || a.x - b.x);
    const shore = shores[0];
    if (!shore) throw new Error('No open shore can receive a skiff');
    const existing = plus ? state.map.objects.filter((object) => object.kind === 'boat'
      && !object.occupiedBy).sort((a, b) => distance(hero.position, a.position)
      - distance(hero.position, b.position) || a.id.localeCompare(b.id))[0] : undefined;
    if (existing?.kind === 'boat') existing.position = { ...shore };
    else state.map.objects.push({
      id: `summoned-skiff-${hero.id}-${state.day}-${state.map.objects.length}`,
      kind: 'boat', position: { ...shore }, owner: hero.owner, occupiedBy: null,
    });
  } else return false;
  return true;
}

function transferCourier(
  state: GameState, hero: Hero, action: AdventureCast, plus: boolean,
): void {
  const target = action.targetHeroId
    ? findOwnedHero(state, hero.owner, action.targetHeroId) : null;
  const sourceSlot = action.sourceSlot ?? -1;
  const destinationSlot = action.destinationSlot ?? -1;
  if (target) {
    if (sourceSlot >= 0 && sourceSlot < hero.inventory.length
        && destinationSlot >= 0 && destinationSlot < target.inventory.length) {
      const item = hero.inventory[sourceSlot];
      hero.inventory[sourceSlot] = target.inventory[destinationSlot];
      target.inventory[destinationSlot] = item;
      return;
    }
    if (sourceSlot >= 0 && sourceSlot < hero.army.length
        && destinationSlot >= 0 && destinationSlot < target.army.length) {
      const stack = hero.army[sourceSlot];
      hero.army[sourceSlot] = target.army[destinationSlot];
      target.army[destinationSlot] = stack;
      return;
    }
  }
  const castle = plus && action.castleId
    ? state.castles.find((candidate) => candidate.id === action.castleId
      && candidate.owner === hero.owner) : null;
  if (!castle || sourceSlot < 0 || destinationSlot < 0
      || sourceSlot >= hero.army.length || destinationSlot >= castle.garrison.length) {
    throw new Error('Clockwork Courier needs valid transfer slots');
  }
  const stack = hero.army[sourceSlot];
  hero.army[sourceSlot] = castle.garrison[destinationSlot];
  castle.garrison[destinationSlot] = stack;
}

function resolveRite(state: GameState, hero: Hero, action: AdventureCast, plus: boolean): boolean {
  const player = state.players[hero.owner];
  if (action.spellId === 'census') {
    player.adventureEffects.censusUntilDay = state.day + (plus ? 2 : 1) - 1;
    player.adventureEffects.censusShowsMovement = plus;
  } else if (action.spellId === 'feastDay') {
    const owned = state.castles.filter((castle) => castle.owner === hero.owner);
    if (owned.some((castle) => castle.growthEffects.some((effect) =>
      effect.id === `feast-${state.week}`))) throw new Error('Feast Day was already cast this week');
    owned.forEach((castle) => castle.growthEffects.push({
      id: `feast-${state.week}`, multiplier: 1.25, expiresWeek: state.week,
    }));
    if (plus) player.resources.gold += owned.length * 500;
  } else if (action.spellId === 'waysideShrine') {
    const school: SpellSchool = plus ? (action.school ?? 'rite') : 'rite';
    state.mapEffects.push({
      id: `shrine-${hero.id}-${state.day}-${state.mapEffects.length}`,
      kind: 'resonance', position: { ...hero.position }, school,
      owner: hero.owner, expiresAfterBattle: true,
    });
  } else return false;
  return true;
}

function resolveCraft(state: GameState, hero: Hero, action: AdventureCast, plus: boolean): boolean {
  if (action.spellId === 'saltTheVein') {
    const mine = state.map.objects.find((object): object is Extract<MapObject, { kind: 'mine' }> =>
      object.id === action.targetId && object.kind === 'mine');
    if (!mine || mine.owner === null || mine.owner === hero.owner
        || !explored(state, hero, mine.position)) throw new Error('Choose a visible enemy mine');
    mine.suppressedUntilDay = state.day + (plus ? 8 : 5) - 1;
    mine.suppressionCaster = hero.owner;
  } else if (action.spellId === 'falseColors') {
    hero.adventureEffects.falseColors = {
      band: plus ? (action.displayedBand ?? 'great host') : 'neutral band',
      castDay: state.day,
    };
  } else if (action.spellId === 'clockworkCourier') {
    transferCourier(state, hero, action, plus);
  } else return false;
  return true;
}

function resolveGrave(state: GameState, hero: Hero, action: AdventureCast, plus: boolean): boolean {
  const player = state.players[hero.owner];
  if (action.spellId === 'borrowedTime') {
    hero.movement *= 2;
    hero.adventureEffects.borrowedTimePenaltyDay = state.day + 1;
    hero.adventureEffects.borrowedTimeMultiplier = plus ? 0.5 : 0;
  } else if (action.spellId === 'paleProcession') {
    const record = [...state.battleRecords].reverse().find((entry) =>
      sameCoord(entry.position, hero.position) && entry.casualties >= 100);
    if (!record) throw new Error('At least 100 units must have died on this tile');
    const count = (plus ? 8 : 5) * hero.spellPower;
    const army = addUnits(hero.army, 'candleWisps', count);
    if (!army) throw new Error('No free army slot for the Procession');
    hero.army = army;
    const slot = hero.army.findIndex((stack) => stack?.unitId === 'candleWisps');
    hero.adventureEffects.temporaryStacks.push({
      unitId: 'candleWisps', slot, departDay: state.day + (plus ? 7 : 3),
      takesSmallest: false,
    });
  } else if (action.spellId === 'deathsLedger') {
    const barrows = state.map.objects.filter((object) =>
      terrainIdAt(state.map, object.position) === 'barrowfield');
    reveal(state, hero, barrows.map((object) => object.position));
    if (plus) player.adventureEffects.guardianIntelUntilDay = state.day;
  } else if (action.spellId === 'graveSpeech') {
    const record = [...state.battleRecords].reverse().find((entry) =>
      sameCoord(entry.position, hero.position));
    if (!record) throw new Error('No battle was fought on this tile');
    state.lastMessage = record.summary;
    if (plus && record.spells.length) {
      const spell = action.learnSpellId && record.spells.includes(action.learnSpellId)
        ? action.learnSpellId : record.spells.find((id) => !hero.knownSpells.includes(id));
      if (spell && !hero.knownSpells.includes(spell)) hero.knownSpells.push(spell);
    }
  } else return false;
  return true;
}

function resolveWild(state: GameState, hero: Hero, action: AdventureCast, plus: boolean): boolean {
  const player = state.players[hero.owner];
  if (action.spellId === 'beastTongue') {
    const object = guardianObject(state, action.targetId);
    if (!object.army.every((stack) => UNITS[stack.unitId].abilities.includes('beast'))) {
      throw new Error('Beast Tongue only affects beast guardians');
    }
    const multiplier = plus && action.recruit ? 3 : 2;
    const cost = guardianGoldValue(object) * multiplier;
    if (player.resources.gold < cost) throw new Error('Cannot afford the parley');
    if (plus && action.recruit) {
      let army = hero.army;
      for (const stack of object.army) {
        const next = addUnits(army, stack.unitId, stack.count);
        if (!next) throw new Error('No free army slots');
        army = next;
      }
      hero.army = army;
    }
    player.resources.gold -= cost;
    state.map.objects = state.map.objects.filter((candidate) => candidate.id !== object.id);
  } else if (action.spellId === 'wildGrowth') {
    const castle = state.castles.find((candidate) => candidate.id === action.castleId
      && candidate.owner === hero.owner);
    if (!castle) throw new Error('Choose an owned castle or dwelling');
    castle.growthEffects.push({
      id: `wild-growth-${hero.id}-${state.week}-${castle.id}`,
      multiplier: plus ? 1.75 : 1.5, expiresWeek: state.week,
    });
  } else if (action.spellId === 'murmuration') {
    const positions = action.positions ?? (action.target ? [action.target] : []);
    if (!positions.length || !positions.every((position) => inBounds(state.map, position))) {
      throw new Error('Draw a scouting path');
    }
    reveal(state, hero, positions, plus ? 1 : 0);
  } else if (action.spellId === 'greenTide') {
    player.adventureEffects.greenTideUntilWeek = state.week;
    if (plus) {
      reveal(state, hero, state.map.terrain.flatMap((row, y) => row.flatMap((terrain, x) =>
        terrainId(terrain) === 'deepwood' ? [{ x, y }] : [])));
    }
  } else if (action.spellId === 'rootAndRuin') {
    const count = plus ? 5 : 3;
    if (action.positions?.length !== count || action.positions.some((position) =>
      !inBounds(state.map, position) || state.castles.some((castle) =>
        castleFootprintTiles(castle).some((tile) => sameCoord(tile, position)))
      || state.map.objects.some((object) => objectFootprintTiles(object)
        .some((tile) => sameCoord(tile, position))))) {
      throw new Error(`Choose ${count} empty map tiles`);
    }
    state.mapEffects.push({
      id: `thicket-${hero.id}-${state.day}-${state.mapEffects.length}`,
      kind: 'thicket', positions: action.positions.map((position) => ({ ...position })),
      owner: hero.owner, expiresDay: state.day + (plus ? 5 : 3) - 1,
    });
  } else if (action.spellId === 'fickleWeather') {
    const offers = fickleWeatherOffers(state, plus);
    if (!action.omen || !offers.includes(action.omen)) throw new Error('Choose a dealt omen');
    state.omen = action.omen;
  } else return false;
  return true;
}

export function fickleWeatherOffers(state: GameState, plus: boolean): OmenId[] {
  const hero = activeHero(state);
  if (hasEquippedArtifact(hero, 'weathercockIllOmen')) {
    return OMEN_IDS.filter((id) => id !== state.omen);
  }
  return OMEN_IDS.filter((id) => id !== state.omen)
    .sort((a, b) => {
      const hash = (id: string) => [...id].reduce(
        (value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0,
        (state.seed ^ state.week) >>> 0,
      );
      return hash(a) - hash(b) || a.localeCompare(b);
    }).slice(0, plus ? 3 : 2);
}

export function castAdventureSpell(state: GameState, action: AdventureCast): void {
  if (!canCastAdventureSpell(state, action.spellId)) {
    throw new Error('Adventure spell cannot be cast now');
  }
  const hero = activeHero(state);
  const definition = SPELLS[action.spellId];
  const plus = upgraded(hero, action.spellId);
  const handled = castTopology(state, hero, action, plus)
    || resolveRite(state, hero, action, plus)
    || resolveCraft(state, hero, action, plus)
    || resolveGrave(state, hero, action, plus)
    || resolveWild(state, hero, action, plus);
  if (!handled) throw new Error('Adventure spell has no resolver');
  const freeFace = action.spellId === 'falseColors' && hasEquippedArtifact(hero, 'spareFace')
    && hero.adventureEffects.spareFaceUsedWeek !== state.week;
  if (freeFace) hero.adventureEffects.spareFaceUsedWeek = state.week;
  else {
    hero.mana -= definition.mana as number;
    hero.movement -= adventureSpellMoveCost(hero);
  }
  state.lastMessage = freeFace
    ? `${definition.name}${plus ? '+' : ''} cast freely through the Spare Face.`
    : `${definition.name}${plus ? '+' : ''} cast for ${definition.mana} mana.`;
  state.eventLog.push(`${hero.name}: ${state.lastMessage}`);
}
