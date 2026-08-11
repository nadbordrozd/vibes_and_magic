import { BARGAIN_IDS, BARGAINS } from '../../content/bargains';
import { AI_BUILD_ORDER, BUILDINGS, buildingBelongsToFaction } from '../../content/buildings';
import { UNITS } from '../../content/units';
import { addUnits, armyPower, unitStrength } from '../army';
import { MAX_ACTIVE_DEBTS, scheduleDebt } from '../debts';
import { findOwnedHero } from '../heroes';
import { specialtyHandler } from '../heroBehaviors';
import { castleEntrance } from '../map/occupancy';
import { sameCoord } from '../map/pathfinding';
import type {
  Action, BargainId, BuildingId, GameState, Hero, ResourceId,
} from '../types';
import { castleSupportsBuilding } from './economy';

type BargainAction = Extract<Action, { type: 'CHOOSE_BARGAIN' }>;

export interface BargainChoiceAvailability {
  available: boolean;
  reason: string;
  castleId?: string;
}

function hash(seed: number, value: string): number {
  return [...value].reduce(
    (result, char) => Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0,
    seed >>> 0,
  );
}

export function dealBargains(
  state: GameState, hero: Hero, count: 1 | 2, source: 'level' | 'post' | 'crone',
): void {
  if (hero.debts.length >= MAX_ACTIVE_DEBTS) return;
  const options = [...BARGAIN_IDS].sort((a, b) =>
    hash(state.seed ^ state.day ^ hero.level, a)
    - hash(state.seed ^ state.day ^ hero.level, b) || a.localeCompare(b)).slice(0, count);
  state.pendingChoice = {
    kind: 'bargain', playerId: hero.owner, heroId: hero.id, options, source,
  };
  state.lastMessage = count === 1 ? 'A bargain is offered.' : 'Choose one bargain.';
}

function dueSooner(hero: Hero, value: number, minimum: number): number {
  const normal = hero.faction === 'hagwood' ? value : Math.max(minimum, value - 1);
  return normal + (specialtyHandler(hero).debtDelay?.() ?? 0);
}

function addDebt(
  state: GameState, hero: Hero, bargainId: BargainId,
  debt: Omit<Parameters<typeof scheduleDebt>[1], 'id' | 'name' | 'description'>,
): void {
  scheduleDebt(hero, {
    ...debt,
    id: `${bargainId}-${state.day}-${hero.debts.length}`,
    name: BARGAINS[bargainId].name,
    description: `${BARGAINS[bargainId].debt}${hero.faction === 'hagwood'
      ? '' : ' Non-Hagwood surcharge applies.'}`,
    data: { ...(debt.data ?? {}), surcharge: hero.faction !== 'hagwood' },
  });
}

function borrowedLegion(state: GameState, hero: Hero): void {
  const power = Math.max(1, armyPower(hero.army) * 0.8);
  const count = Math.max(1, Math.round(power / unitStrength('candleWisps')));
  const army = addUnits(hero.army, 'candleWisps', count);
  if (!army) throw new Error('Borrowed Legion needs a free army slot');
  hero.army = army;
  const slot = hero.army.findIndex((stack) => stack?.unitId === 'candleWisps');
  hero.adventureEffects.temporaryStacks.push({
    unitId: 'candleWisps', slot, departDay: state.day + 7, takesSmallest: true,
  });
  addDebt(state, hero, 'borrowedLegion', {
    trigger: { kind: 'day-start', dueDay: dueSooner(hero, state.day + 7, state.day + 1) },
    handlerTag: 'borrowed-legion-departs', remainingTriggers: 1,
  });
}

function nextPromisedBuilding(state: GameState, hero: Hero, requested?: string) {
  const castle = state.castles.find((candidate) => candidate.owner === hero.owner
    && (candidate.id === requested || sameCoord(candidate.position, hero.position)));
  if (!castle) throw new Error('What Was Promised requires a current city');
  const buildingId = AI_BUILD_ORDER.find((id) => !castle.buildings.includes(id)
    && buildingBelongsToFaction(id, castle.faction)
    && castleSupportsBuilding(state, castle, id)
    && (!BUILDINGS[id].prerequisite
      || castle.buildings.includes(BUILDINGS[id].prerequisite!)));
  if (!buildingId) throw new Error('No building remains in this city queue');
  return { castle, buildingId };
}

export function bargainChoiceAvailability(
  state: GameState, hero: Hero, bargainId: BargainId,
): BargainChoiceAvailability {
  if (hero.debts.length >= MAX_ACTIVE_DEBTS) {
    return { available: false, reason: 'This hero already carries the maximum of two Debts.' };
  }
  if (bargainId === 'borrowedLegion' && !addUnits(hero.army, 'candleWisps', 1)) {
    return {
      available: false,
      reason: 'The borrowed company needs an empty army slot or an existing Candle Wisps company.',
    };
  }
  if (bargainId === 'cuckoosDeal') {
    const castle = state.castles.find((candidate) =>
      candidate.owner !== hero.owner && candidate.owner !== 'neutral');
    return castle
      ? { available: true, reason: 'An enemy city is available to watch.', castleId: castle.id }
      : { available: false, reason: 'No enemy-owned city exists for this bargain to watch.' };
  }
  if (bargainId === 'whatWasPromised') {
    const castle = state.castles.find((candidate) => candidate.owner === hero.owner
      && sameCoord(castleEntrance(candidate), hero.position));
    if (!castle) {
      return { available: false, reason: 'This bargain must be accepted at an owned city entrance.' };
    }
    try {
      nextPromisedBuilding(state, hero, castle.id);
    } catch {
      return {
        available: false,
        reason: 'This city has no supported building left whose prerequisites are complete.',
        castleId: castle.id,
      };
    }
    return {
      available: true, reason: 'This city has an eligible next building.', castleId: castle.id,
    };
  }
  return { available: true, reason: 'This bargain can be accepted now.' };
}

function grantMissingResources(
  state: GameState, hero: Hero, castleId?: string,
): { castleId: string; buildingId: BuildingId } {
  const { castle, buildingId } = nextPromisedBuilding(state, hero, castleId);
  const resources = state.players[hero.owner].resources;
  for (const [resource, amount] of Object.entries(BUILDINGS[buildingId].cost)) {
    const id = resource as ResourceId;
    resources[id] += Math.max(0, (amount ?? 0) - resources[id]);
  }
  return { castleId: castle.id, buildingId };
}

export function chooseBargain(state: GameState, action: BargainAction): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'bargain' || !pending.options.includes(action.bargainId)) {
    throw new Error('This bargain was not offered');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero || hero.debts.length >= MAX_ACTIVE_DEBTS) throw new Error('Debt limit reached');
  const player = state.players[hero.owner];
  const id = action.bargainId;
  if (id === 'firstHarvest') {
    player.resources.gold += 4_000;
    const dueWeek = state.week < 4 ? 4 : state.week + 1;
    addDebt(state, hero, id, {
      trigger: { kind: 'week-start', dueWeek: dueSooner(hero, dueWeek, state.week + 1) },
      handlerTag: 'first-harvest', remainingTriggers: 1,
    });
  } else if (id === 'borrowedLegion') {
    borrowedLegion(state, hero);
  } else if (id === 'cuckoosDeal') {
    const castle = state.castles.find((candidate) => candidate.id === action.castleId
      && candidate.owner !== hero.owner);
    if (!castle) throw new Error('Choose an enemy city');
    player.adventureEffects.spiedCastles.push(castle.id);
    if (castle.owner === 'neutral') throw new Error('Neutral towns keep no rival correspondence');
    state.players[castle.owner].adventureEffects.exposedHeroOwner = hero.owner;
    addDebt(state, hero, id, {
      trigger: { kind: 'day-start', dueDay: state.day + 1
        + (specialtyHandler(hero).debtDelay?.() ?? 0) },
      handlerTag: 'persistent-cuckoo', remainingTriggers: 999, interval: 1,
      data: { castleId: castle.id },
    });
  } else if (id === 'milkTeeth') {
    player.adventureEffects.tierOneGrowth.push({
      multiplier: 2, startWeek: state.week + 1, endWeek: state.week + 2,
    });
    addDebt(state, hero, id, {
      trigger: { kind: 'week-start', dueWeek: dueSooner(hero, state.week + 3, state.week + 2) },
      handlerTag: 'milk-teeth', remainingTriggers: 1,
    });
  } else if (id === 'longNap') {
    hero.attack += 3; hero.defense += 3; hero.spellPower += 3; hero.knowledge += 3;
    hero.adventureEffects.sleepEvery = 7;
    addDebt(state, hero, id, {
      trigger: { kind: 'day-start', dueDay: dueSooner(hero, 7, state.day + 1) },
      handlerTag: 'long-nap', remainingTriggers: 999, interval: 7,
    });
  } else if (id === 'neverByIron') {
    hero.adventureEffects.noRetaliationBattles = 3;
    player.adventureEffects.ironSuppressedUntilDay = state.day
      + (hero.faction === 'hagwood' ? 9 : 10)
      - (specialtyHandler(hero).debtDelay?.() ?? 0);
    addDebt(state, hero, id, {
      trigger: { kind: 'day-start', dueDay: player.adventureEffects.ironSuppressedUntilDay + 1 },
      handlerTag: 'never-by-iron', remainingTriggers: 1,
    });
  } else if (id === 'thirdChild') {
    hero.draftBonusCards = 3;
    addDebt(state, hero, id, {
      trigger: { kind: 'level-up', dueLevel: dueSooner(hero, hero.level + 2, hero.level + 1) },
      handlerTag: 'third-child', remainingTriggers: 1,
    });
  } else {
    const promised = grantMissingResources(state, hero, action.castleId);
    addDebt(state, hero, id, {
      trigger: { kind: 'week-start', dueWeek: dueSooner(hero, state.week + 1, state.week + 1) },
      handlerTag: 'what-was-promised', remainingTriggers: 3, interval: 1,
      data: promised,
    });
  }
  state.pendingChoice = null;
  state.lastMessage = `${BARGAINS[id].name} accepted. Its Debt is now due.`;
}
