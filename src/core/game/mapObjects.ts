import { ARTIFACTS } from '../../content/artifacts';
import { CHEST_ITEM_POOL, ITEMS } from '../../content/items';
import { FACTION_UNITS, UNITS } from '../../content/units';
import { addUnits, canAfford, pay } from '../army';
import {
  addArtifact, consumeEquippedArtifact, hasEquippedArtifact, priceMultiplier,
} from '../artifacts';
import { skillRank } from '../heroBehaviors';
import { activeHero, findOwnedHero } from '../heroes';
import { sameCoord } from '../map/pathfinding';
import { drawLevelOptions } from '../progression';
import { randomInt } from '../rng';
import type {
  ArtifactId, FactionId, GameState, GuardianReward, Hero, ItemId, ItemInstance, MapObject,
} from '../types';
import { addItem } from './items';
import { dealBargains } from './bargains';
import { tile } from '../../content/terrain';
import { checkLevel } from './levelUps';
import { levelThreshold } from '../progression';

const TINKER_ITEMS = CHEST_ITEM_POOL.filter((id) => ![
  'secondCandle', 'bottledEcho', 'foundersTin', 'cronesBundle',
].includes(id));
const UNCOMMON_ITEMS: ItemId[] = [
  'blackfireOil', 'graveDust', 'hornetJar', 'milkOfTheMoon', 'chalkOfWalls',
  'waxSeal', 'powderOfUnmaking', 'bannerWhistle', 'cartographersCase',
  'tavernTales', 'hearthstone', 'ferrymansCoin', 'militiaWrit', 'beggarsCoin',
];
const RARE_ITEMS: ItemId[] = ['secondCandle', 'bottledEcho', 'foundersTin', 'cronesBundle'];

function requireStanding<T extends MapObject['kind']>(
  state: GameState, objectId: string, kind: T,
): [Extract<MapObject, { kind: T }>, Hero] {
  const hero = activeHero(state);
  const object = state.map.objects.find((candidate): candidate is Extract<MapObject, { kind: T }> =>
    candidate.id === objectId && candidate.kind === kind);
  if (!object || !sameCoord(object.position, hero.position)) {
    throw new Error(`Stand at the ${kind} to use it`);
  }
  return [object, hero];
}

export function recruitDwelling(state: GameState, objectId: string, count: number): void {
  const [dwelling, hero] = requireStanding(state, objectId, 'dwelling');
  if (!Number.isInteger(count) || count <= 0 || count > dwelling.available) {
    throw new Error('Invalid dwelling recruitment');
  }
  const unit = UNITS[dwelling.unitId];
  const beastDiscount = unit.abilities.includes('beast') && skillRank(hero, 'beastmaster') >= 1
    ? 0.75 : 1;
  const cost = Object.fromEntries(Object.entries(unit.cost).map(([resource, amount]) =>
    [resource, Math.ceil((amount ?? 0) * beastDiscount)]));
  const player = state.players[hero.owner];
  if (!canAfford(player.resources, cost, count)) throw new Error('Cannot afford recruits');
  const army = addUnits(hero.army, dwelling.unitId, count);
  if (!army) throw new Error('No free army slot');
  hero.army = army;
  player.resources = pay(player.resources, cost, count);
  dwelling.available -= count;
  state.lastMessage = `${count} ${unit.name} recruited in the field.`;
}

export function buyTinkerItem(state: GameState, objectId: string): void {
  const [cart, hero] = requireStanding(state, objectId, 'tinkersCart');
  if (!cart.stock) throw new Error("The Tinker's Cart is sold out");
  const rare = RARE_ITEMS.includes(cart.stock.id);
  const common = ['potionOfVigor', 'draughtOfIron', 'smellingSalts', 'haresHeel',
    'waybread', 'saltedMeat'].includes(cart.stock.id);
  const price = Math.floor((rare ? 2_000 : common ? 500 : 1_000) * 1.5
    * priceMultiplier(hero));
  const player = state.players[hero.owner];
  if (player.resources.gold < price || !addItem(hero, cart.stock)) {
    throw new Error('Cannot buy this item');
  }
  player.resources.gold -= price;
  state.lastMessage = `${ITEMS[cart.stock.id].name} bought for ${price} gold.`;
  cart.stock = null;
}

export function buyTimingBlessing(state: GameState, objectId: string): void {
  const [monastery, hero] = requireStanding(state, objectId, 'monastery');
  const player = state.players[hero.owner];
  const price = Math.ceil(3 * priceMultiplier(hero));
  if (player.resources.essence < price) throw new Error(`The blessing costs ${price} essence`);
  player.resources.essence -= price;
  hero.adventureEffects.timingBlessingUntilDay = state.day + 2;
  monastery.blessings[hero.id] = state.day + 2;
  state.lastMessage = 'The Unstruck Bell lends three days of perfect timing.';
}

export function depositGloamingItem(
  state: GameState, objectId: string, inventorySlot: number,
): void {
  const [ring, hero] = requireStanding(state, objectId, 'gloamingRing');
  if (ring.deposit) throw new Error('The Ring already holds a gift');
  const item = hero.inventory[inventorySlot];
  if (!item || typeof item === 'string') throw new Error('Choose an item to deposit');
  hero.inventory[inventorySlot] = null;
  ring.deposit = {
    kind: 'item', item: { ...item }, heroId: hero.id, dueWeek: state.week + 1,
  };
  state.lastMessage = 'The Gloaming Ring accepts the gift.';
}

export function depositGloamingArtifact(
  state: GameState, objectId: string, backpackIndex: number,
): void {
  const [ring, hero] = requireStanding(state, objectId, 'gloamingRing');
  if (ring.deposit) throw new Error('The Ring already holds a gift');
  const artifact = hero.artifacts.backpack[backpackIndex];
  if (!artifact || ARTIFACTS[artifact.id].class !== 'relic') {
    throw new Error('Only a carried Relic may be offered here');
  }
  hero.artifacts.backpack.splice(backpackIndex, 1);
  ring.deposit = {
    kind: 'artifact', artifact: { ...artifact }, heroId: hero.id,
    dueWeek: state.week + 1,
  };
  state.lastMessage = 'The Ring accepts the Relic, with suspicious courtesy.';
}

function itemTier(item: ItemInstance): 1 | 2 | 3 {
  if (RARE_ITEMS.includes(item.id)) return 3;
  if (UNCOMMON_ITEMS.includes(item.id)) return 2;
  return 1;
}

function higherTierItem(state: GameState, item: ItemInstance): ItemInstance {
  const pool = itemTier(item) === 1 ? UNCOMMON_ITEMS : itemTier(item) === 2 ? RARE_ITEMS : [];
  if (!pool.length) return { ...item };
  let index: number;
  [index, state.rng] = randomInt(state.rng, pool.length);
  return { id: pool[index] };
}

export function useChrysalis(state: GameState, objectId: string, armySlot: number): void {
  const [pool, hero] = requireStanding(state, objectId, 'chrysalis');
  if (pool.visitedWeek[hero.id] === state.week) throw new Error('The Pool rests this week');
  const stack = hero.army[armySlot];
  if (!stack) throw new Error('Choose a stack');
  const unit = UNITS[stack.unitId];
  if (unit.tier >= 4 || !Object.hasOwn(state.players, hero.owner)
      || !['hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass']
        .includes(unit.faction)) throw new Error('Only faction tier 1–3 units may molt');
  const faction = unit.faction as FactionId;
  const nextUnitId = FACTION_UNITS[faction][unit.tier];
  const nextCount = Math.max(1, Math.floor(stack.count / 2));
  const oldValue = (unit.cost.gold ?? 0) * stack.count;
  const newValue = (UNITS[nextUnitId].cost.gold ?? 0) * nextCount;
  const cost = Math.max(0, Math.ceil((newValue - oldValue) * 1.5));
  if (state.players[hero.owner].resources.gold < cost) throw new Error('Cannot afford molting');
  state.players[hero.owner].resources.gold -= cost;
  hero.army[armySlot] = { unitId: nextUnitId, count: nextCount };
  pool.visitedWeek[hero.id] = state.week;
  state.lastMessage = `${unit.name} emerge as ${UNITS[nextUnitId].name}.`;
}

export function completeBridge(state: GameState, objectId: string): void {
  const [bridge, hero] = requireStanding(state, objectId, 'bridge');
  const player = state.players[hero.owner];
  if (bridge.completed || player.resources.timber < 10 || player.resources.iron < 5) {
    throw new Error('The bridge needs 10 timber and 5 iron');
  }
  player.resources.timber -= 10; player.resources.iron -= 5;
  bridge.completed = true;
  for (const position of bridge.opens ?? [bridge.position]) {
    state.map.terrain[position.y][position.x] = tile('meadow');
  }
  state.lastMessage = 'The crossing is permanently open to everyone.';
}

export function attendHedgeSchool(state: GameState, objectId: string): void {
  const [school, hero] = requireStanding(state, objectId, 'hedgeSchool');
  if (school.visitedBy.includes(hero.id) || state.players[hero.owner].resources.gold < 1_500) {
    throw new Error('Hedge School is unavailable');
  }
  state.players[hero.owner].resources.gold -= 1_500;
  let options; [options, state.rng] = drawLevelOptions(hero, state.rng);
  options = options.filter((option) => option !== 'inscribe' && option !== 'bargain').slice(0, 3);
  const fallback = ['attack', 'defense', 'spellPower', 'knowledge'] as const;
  for (const option of fallback) {
    if (options.length >= 3) break;
    if (!options.includes(option)) options.push(option);
  }
  state.pendingChoice = {
    kind: 'level', playerId: hero.owner, heroId: hero.id, options,
    canSkip: false, canReroll: false, source: 'hedgeSchool',
  };
  school.visitedBy.push(hero.id);
}

export function useReliquaryCairn(
  state: GameState, objectId: string, backpackIndex: number,
): void {
  const [, hero] = requireStanding(state, objectId, 'reliquaryCairn');
  if (backpackIndex < 0 && consumeEquippedArtifact(hero, 'patternlessCoat')) {
    state.lastMessage = 'The Cairn accepts the Patternless Coat, smugly.';
    return;
  }
  const offered = hero.artifacts.backpack[backpackIndex];
  if (!offered) throw new Error('Choose an artifact');
  const definition = ARTIFACTS[offered.id];
  const pool = Object.values(ARTIFACTS).filter((artifact) =>
    artifact.class === definition.class && artifact.id !== offered.id);
  if (!pool.length) throw new Error('No matching artifact favor exists');
  let index: number; [index, state.rng] = randomInt(state.rng, pool.length);
  hero.artifacts.backpack.splice(backpackIndex, 1);
  addArtifact(hero, { id: pool[index].id as ArtifactId });
  state.lastMessage = 'The Cairn returns another shape of the same old power.';
}

export function claimGuardianReward(state: GameState, hero: Hero, reward: GuardianReward): void {
  state.players[hero.owner].resources.gold += reward.gold ?? 0;
  state.players[hero.owner].resources.timber += reward.timber ?? 0;
  state.players[hero.owner].resources.iron += reward.iron ?? 0;
  state.players[hero.owner].resources.essence += reward.essence ?? 0;
  for (const item of reward.items ?? []) addItem(hero, item);
  for (const artifact of reward.artifacts ?? []) addArtifact(hero, artifact);
  if (reward.teachesSpell && !hero.knownSpells.includes(reward.teachesSpell as never)) {
    hero.knownSpells.push(reward.teachesSpell as never);
  }
}

export function chooseSiteStat(state: GameState, choice: 'attack' | 'defense'): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'siteStat' || !pending.options.includes(choice)) {
    throw new Error('No Sparring Stone choice is pending');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId)!;
  const stone = state.map.objects.find((object) => object.id === pending.objectId);
  if (!stone || stone.kind !== 'sparringStone') throw new Error('Sparring Stone missing');
  hero[choice] += 1;
  stone.visitedBy.push(hero.id);
  state.pendingChoice = null;
  state.lastMessage = `The Sparring Stone teaches +1 ${choice}.`;
}

export function digCache(state: GameState, position: { x: number; y: number }): void {
  const hero = activeHero(state);
  if (!sameCoord(hero.position, position)) throw new Error('Dig where the hero stands');
  if (hero.movement <= 0) throw new Error('Digging takes the full day');
  hero.movement = 0;
  const cache = state.map.objects.find((object) => object.kind === 'cache'
    && sameCoord(object.position, position));
  if (!cache || cache.kind !== 'cache' || cache.dug) {
    state.lastMessage = 'Dry earth. The day objects, but too late.';
    return;
  }
  cache.dug = true; cache.hidden = false;
  claimGuardianReward(state, hero, cache.reward);
  state.lastMessage = 'The buried Cache is opened.';
}

export function buyMercenary(state: GameState, objectId: string, rosterIndex: number): void {
  const [camp, hero] = requireStanding(state, objectId, 'mercenaryCamp');
  const stack = camp.roster[rosterIndex];
  if (!stack) throw new Error('That company is unavailable');
  const price = Math.ceil((UNITS[stack.unitId].cost.gold ?? 0) * stack.count * 1.5
    * priceMultiplier(hero));
  const player = state.players[hero.owner];
  const army = addUnits(hero.army, stack.unitId, stack.count);
  if (!army || player.resources.gold < price) throw new Error('Cannot hire this company');
  player.resources.gold -= price; hero.army = army; camp.roster.splice(rosterIndex, 1);
  state.lastMessage = `${stack.count} ${UNITS[stack.unitId].name} hired for ${price} gold.`;
}

export function buyWagonItem(state: GameState, objectId: string): void {
  const [camp, hero] = requireStanding(state, objectId, 'wagonCamp');
  const price = Math.ceil(1_000 * priceMultiplier(hero));
  if (!camp.stock || state.players[hero.owner].resources.gold < price || !addItem(hero, camp.stock)) {
    throw new Error('Cannot buy this wagon item');
  }
  state.players[hero.owner].resources.gold -= price;
  state.lastMessage = `${ITEMS[camp.stock.id].name} bought for ${price} gold.`;
  camp.stock = null;
}

export function payTithe(state: GameState, objectId: string): void {
  const [barn, hero] = requireStanding(state, objectId, 'titheBarn');
  const player = state.players[hero.owner];
  const price = Math.ceil(1_000 * priceMultiplier(hero));
  if (barn.usedWeek[hero.owner] === state.week || player.resources.gold < price) {
    throw new Error('The Tithe Barn is unavailable');
  }
  player.resources.gold -= price; barn.usedWeek[hero.owner] = state.week;
  state.castles.filter((castle) => castle.owner === hero.owner).forEach((castle) =>
    castle.growthEffects.push({
      id: `tithe-${hero.owner}-${state.week}`, multiplier: 1.1, expiresWeek: state.week,
    }));
  state.lastMessage = `The ${price}-gold tithe grants every owned castle +10% growth this week.`;
}

export function visitCreativeObject(state: GameState, object: MapObject, hero: Hero): void {
  if (object.kind === 'monastery') {
    if (!object.firstVisitorId) {
      object.firstVisitorId = hero.id;
      if (!hero.knownSpells.includes('hourglassCrack')) hero.knownSpells.push('hourglassCrack');
      state.lastMessage = 'The Unstruck Bell teaches Hourglass Crack.';
    }
  } else if (object.kind === 'storyteller') {
    if (object.visitedWeek[hero.id] !== state.week) {
      object.visitedWeek[hero.id] = state.week;
      hero.adventureEffects.nextBattleMeterBonus = 10;
      const hidden = state.map.objects.find((candidate) =>
        !state.players[hero.owner].explored.includes(`${candidate.position.x},${candidate.position.y}`));
      if (hidden) state.players[hero.owner].explored.push(`${hidden.position.x},${hidden.position.y}`);
      state.lastMessage = 'A story marks a place and puts ten beats into the next battle.';
    }
  } else if (object.kind === 'omenStone') {
    if (!object.visitedBy.includes(hero.id)) object.visitedBy.push(hero.id);
    state.lastMessage = `The stone foretells ${state.nextOmen}.`;
  } else if (object.kind === 'crone') {
    if (object.visitedWeek[hero.id] !== state.week && hero.debts.length < 2) {
      object.visitedWeek[hero.id] = state.week;
      dealBargains(state, hero, 1, 'crone');
    } else {
      state.lastMessage = hero.debts.length >= 2
        ? 'The Crone finds both hands already full of promises.'
        : 'The Crone has said all she will this week.';
    }
  } else if (['watermill', 'windmill', 'tradingCamp'].includes(object.kind)) {
    if ('owner' in object) object.owner = hero.owner;
    state.lastMessage = `${object.kind} flagged.`;
  } else if (object.kind === 'sparringStone') {
    if (!object.visitedBy.includes(hero.id)) state.pendingChoice = {
      kind: 'siteStat', objectId: object.id, playerId: hero.owner, heroId: hero.id,
      options: ['attack', 'defense'],
    };
  } else if (['listeningStones', 'longDraught', 'grinningIdol'].includes(object.kind)
      && 'visitedBy' in object && !object.visitedBy.includes(hero.id)) {
    object.visitedBy.push(hero.id);
    if (object.kind === 'listeningStones') hero.spellPower += 1;
    if (object.kind === 'longDraught') { hero.knowledge += 1; hero.mana += 10; }
    if (object.kind === 'grinningIdol') hero.luck += 1;
    state.lastMessage = 'The lesson stays with the hero.';
  } else if (object.kind === 'hutOnTheHill') {
    if (!object.visitedBy.includes(hero.id)) {
      object.visitedBy.push(hero.id);
      hero.skills[object.skill] = Math.max(1, hero.skills[object.skill] ?? 0) as 1 | 2 | 3;
    }
  } else if (object.kind === 'treeSecondThoughts') {
    const price = Math.ceil(1_500 * hero.level * priceMultiplier(hero));
    if (!object.visitedBy.includes(hero.id) && state.players[hero.owner].resources.gold >= price) {
      state.players[hero.owner].resources.gold -= price; object.visitedBy.push(hero.id);
      hero.xp = Math.max(hero.xp, levelThreshold(hero.level + 1));
      checkLevel(state, hero.owner, hero.id);
    }
  } else if (['warmTable', 'coldSpring', 'idolOfSomebody', 'wishingWell'].includes(object.kind)
      && 'visitedWeek' in object && object.visitedWeek[hero.id] !== state.week) {
    object.visitedWeek[hero.id] = state.week;
    if (object.kind === 'warmTable') hero.adventureEffects.nextBattleMeterBonus += 10;
    if (object.kind === 'coldSpring') hero.movement += 400;
    if (object.kind === 'idolOfSomebody') hero.adventureEffects.nextBattleLuckBonus = 1;
    if (object.kind === 'wishingWell') {
      const player = state.players[hero.owner];
      if (hasEquippedArtifact(hero, 'beggarsRing') && player.resources.gold >= 5_000) {
        player.resources.gold -= 5_000;
        consumeEquippedArtifact(hero, 'beggarsRing');
        state.lastMessage = "Five thousand gold answers the Beggar's Ring at last.";
        return;
      }
      if (player.resources.gold < 1) throw new Error('The well insists on one gold');
      player.resources.gold -= 1;
      let boon; [boon, state.rng] = randomInt(state.rng, 4);
      if (boon === 0) hero.movement += 100;
      else if (boon === 1) hero.adventureEffects.nextBattleMeterBonus += 5;
      else if (boon === 2) player.resources.gold += 25;
      state.lastMessage = boon === 3 ? 'Splash.' : 'The well returns a tiny favor.';
    }
  } else if (['skeletonGrass', 'coldCampfire', 'shepherdsLeanTo', 'overgrownCart']
      .includes(object.kind) && 'searched' in object && !object.searched) {
    object.searched = true; claimGuardianReward(state, hero, object.reward);
  } else if (object.kind === 'patientStone') {
    if (!object.revealedBy.includes(hero.id)) object.revealedBy.push(hero.id);
    state.lastMessage = 'The Patient Stone adds another piece to the sketch.';
  } else if (object.kind === 'barrowField') {
    if (!object.collected && addItem(hero, object.scroll)) object.collected = true;
    if (!state.battleRecords.some((record) => sameCoord(record.position, object.position)
        && record.summary.startsWith('The Barrow-Field'))) {
      state.battleRecords.push({
        day: 0, position: { ...object.position }, casualties: 200, spells: [],
        winner: 'attacker', summary: 'The Barrow-Field remembers at least two hundred dead.',
      });
    }
  } else if (object.kind === 'dwelling' && object.id === 'masque-ring') {
    if (!hero.knownSpells.includes('borrowShape')) hero.knownSpells.push('borrowShape');
  } else if (object.kind === 'gloamingRing' && object.deposit
      && object.deposit.heroId === hero.id && object.deposit.dueWeek <= state.week) {
    if (object.deposit.kind === 'item') {
      if (addItem(hero, object.deposit.item)) object.deposit = null;
    } else {
      addArtifact(hero, object.deposit.artifact);
      object.deposit = null;
      state.lastMessage = 'The Relic returns unchanged, with a polite note declining it.';
    }
  } else if (object.kind === 'tollGate' && !object.cleared
      && !object.paidBy.includes(hero.id)) {
    state.pendingChoice = {
      kind: 'toll', playerId: hero.owner, heroId: hero.id, objectId: object.id, cost: 500,
    };
  } else {
    state.lastMessage = `${object.kind} reached.`;
  }
}

export function advanceCreativeObjects(state: GameState, weekly: boolean): void {
  for (const object of state.map.objects) {
    if (object.kind === 'tinkersCart') {
      for (let step = 0; step < 2; step += 1) {
        const target = object.route[(object.routeIndex + 1) % object.route.length];
        if (sameCoord(object.position, target)) object.routeIndex = (object.routeIndex + 1) % object.route.length;
        const next = object.route[(object.routeIndex + 1) % object.route.length];
        object.position.x += Math.sign(next.x - object.position.x);
        object.position.y += Math.sign(next.y - object.position.y);
      }
      if (weekly) {
        let index: number; [index, state.rng] = randomInt(state.rng, TINKER_ITEMS.length);
        const id = TINKER_ITEMS[index];
        object.stock = id === 'spellScroll' ? { id, storedSpellId: 'bloom' } : { id };
        object.stockWeek = state.week;
      }
    } else if (weekly && object.kind === 'dwelling') {
      object.available += Math.max(1, Math.floor(UNITS[object.unitId].growth / 2));
      object.lastGrowthWeek = state.week;
    } else if (weekly && object.kind === 'mercenaryCamp') {
      const pool = ['yeoman', 'tinSoldier', 'candleWisps', 'larvalTide',
        'fencePostFamiliars', 'ashmaneWolves'] as const;
      let first; [first, state.rng] = randomInt(state.rng, pool.length);
      let second; [second, state.rng] = randomInt(state.rng, pool.length);
      object.roster = [
        { unitId: pool[first], count: Math.max(4, Math.floor(UNITS[pool[first]].growth / 2)) },
        { unitId: pool[second], count: Math.max(4, Math.floor(UNITS[pool[second]].growth / 2)) },
      ];
      object.stockWeek = state.week;
    } else if (weekly && object.kind === 'wagonCamp') {
      let index; [index, state.rng] = randomInt(state.rng, TINKER_ITEMS.length);
      const id = TINKER_ITEMS[index];
      object.stock = id === 'spellScroll' ? { id, storedSpellId: 'trial' } : { id };
      object.stockWeek = state.week;
    } else if (weekly && object.kind === 'hutOnTheHill' && (object.route?.length ?? 0) > 0) {
      const route = object.route!;
      object.routeIndex = ((object.routeIndex ?? 0) + 1) % route.length;
      object.position = { ...route[object.routeIndex] };
    } else if (weekly && object.kind === 'gloamingRing' && object.deposit
        && object.deposit.kind === 'item' && object.deposit.dueWeek <= state.week) {
      object.deposit.item = higherTierItem(state, object.deposit.item);
    }
  }
}
