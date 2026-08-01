import {
  MARKET_BUY_GOLD, MARKET_SELL_GOLD,
} from '../../content/marketplace';
import { sameCoord } from '../map/pathfinding';
import { castleEntrance } from '../map/occupancy';
import type {
  GameState, ResourceId,
} from '../types';
import { skillRank } from '../heroBehaviors';
import { SKILLS } from '../../content/skills';
import { ITEMS } from '../../content/items';
import { SCROLL_SPELL_IDS } from '../../content/spells';
import { addItem } from './items';
import { randomInt } from '../rng';
import { ARTIFACTS } from '../../content/artifacts';
import type { ArtifactInstance } from '../types';
import { buildingIsActive } from './buildingStatus';
import { artifactEffectTotal, priceMultiplier } from '../artifacts';

type MarketResource = Exclude<ResourceId, 'gold'>;
export const MARKET_SCROLL_PRICE = 1_000;

const COMMON_ITEMS = new Set([
  'potionOfVigor', 'draughtOfIron', 'smellingSalts', 'haresHeel',
  'waybread', 'saltedMeat',
]);
const RARE_ITEMS = new Set([
  'secondCandle', 'bottledEcho', 'foundersTin', 'cronesBundle',
]);

export function itemMarketValue(item: NonNullable<import('../types').ItemSlot>): number {
  const id = typeof item === 'string' ? item : item.id;
  return COMMON_ITEMS.has(id) ? 500 : RARE_ITEMS.has(id) ? 2_000 : 1_000;
}

export function refreshMarketScrolls(state: GameState): void {
  for (const castle of state.castles) {
    if (castle.owner === 'neutral') { castle.marketScroll = null; continue; }
    const stocked = buildingIsActive(castle, 'marketplace')
      && state.players[castle.owner].heroes.some((hero) =>
        hero.alive && skillRank(hero, 'peddler') >= 2);
    if (!stocked) { castle.marketScroll = null; continue; }
    let index: number;
    [index, state.rng] = randomInt(state.rng, SCROLL_SPELL_IDS.length);
    castle.marketScroll = {
      id: 'spellScroll', storedSpellId: SCROLL_SPELL_IDS[index],
    };
    castle.marketScrollWeek = state.week;
  }
}

function visitingPeddler(state: GameState, castleId: string) {
  const castle = state.castles.find((candidate) => candidate.id === castleId);
  const hero = castle && state.players[state.activePlayer].heroes.find((candidate) =>
    candidate.alive && sameCoord(candidate.position, castleEntrance(castle))
    && skillRank(candidate, 'peddler') >= 2);
  if (!castle || castle.owner !== state.activePlayer
      || !buildingIsActive(castle, 'marketplace') || !hero) {
    throw new Error('A rank-2 Peddler must visit this Marketplace');
  }
  return { castle, hero, player: state.players[state.activePlayer] };
}

export function buyMarketScroll(state: GameState, castleId: string): void {
  const { castle, hero, player } = visitingPeddler(state, castleId);
  const price = Math.ceil(MARKET_SCROLL_PRICE * priceMultiplier(hero));
  if (!castle.marketScroll || player.resources.gold < price) {
    throw new Error('The weekly scroll is unavailable');
  }
  if (!addItem(hero, castle.marketScroll)) throw new Error('Inventory full');
  player.resources.gold -= price;
  state.lastMessage = `${ITEMS.spellScroll.name} bought for ${price} gold.`;
  castle.marketScroll = null;
}

export function sellMarketItem(
  state: GameState, castleId: string, inventorySlot: number,
): void {
  const { hero, player } = visitingPeddler(state, castleId);
  const item = hero.inventory[inventorySlot];
  if (!item || typeof item === 'string' || ITEMS[item.id].use === 'automatic') {
    throw new Error('This item cannot be sold');
  }
  const price = Math.floor(itemMarketValue(item) * 0.6 / priceMultiplier(hero));
  hero.inventory[inventorySlot] = null;
  player.resources.gold += price;
  state.lastMessage = `${ITEMS[item.id].name} sold for ${price} gold.`;
}

export function artifactMarketValue(artifact: ArtifactInstance): number {
  const artifactClass = ARTIFACTS[artifact.id].class;
  return artifactClass === 'vanilla' ? 1_000
    : artifactClass === 'charm' || artifactClass === 'trinket' ? 2_000
      : artifactClass === 'relic' ? 4_000 : 0;
}

export function sellMarketArtifact(
  state: GameState, castleId: string, backpackIndex: number,
): void {
  const { hero, player } = visitingPeddler(state, castleId);
  const artifact = hero.artifacts.backpack[backpackIndex];
  const value = artifact ? artifactMarketValue(artifact) : 0;
  if (!artifact || value <= 0) throw new Error('This artifact cannot be sold');
  const price = Math.floor(value * 0.6 / priceMultiplier(hero));
  hero.artifacts.backpack.splice(backpackIndex, 1);
  player.resources.gold += price;
  state.lastMessage = `${ARTIFACTS[artifact.id].name} sold for ${price} gold.`;
}

export function marketTrade(
  state: GameState,
  castleId: string,
  direction: 'buy' | 'sell',
  resource: MarketResource,
  amount: number,
): void {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Invalid trade amount');
  const castle = state.castles.find((candidate) => candidate.id === castleId);
  const player = state.players[state.activePlayer];
  const remote = state.map.objects.some((object) => object.kind === 'tradingCamp'
    && object.owner === player.id);
  const hero = player.heroes.find((candidate) =>
    candidate.alive && sameCoord(candidate.position,
      castle ? castleEntrance(castle) : { x: -1, y: -1 })) ?? (remote ? player.hero : null);
  if (!castle || castle.owner !== player.id || !buildingIsActive(castle, 'marketplace')) {
    throw new Error('Marketplace unavailable');
  }
  if (!hero) throw new Error('A hero must visit the Marketplace');
  const peddler = artifactEffectTotal(hero, 'peddler_rates') > 0
    ? Math.max(1, skillRank(hero, 'peddler')) : skillRank(hero, 'peddler');
  const rate = peddler === 1 || peddler === 2
    ? SKILLS.peddler.values.rank1Rate
    : peddler === 3 ? SKILLS.peddler.values.rank3Rate : 1;
  if (direction === 'sell') {
    if (player.resources[resource] < amount) throw new Error('Not enough resources');
    player.resources[resource] -= amount;
    player.resources.gold += Math.floor(MARKET_SELL_GOLD * amount / priceMultiplier(hero));
  } else {
    const price = Math.floor(MARKET_BUY_GOLD[resource] * amount * rate
      * priceMultiplier(hero));
    if (player.resources.gold < price) throw new Error('Not enough gold');
    player.resources.gold -= price;
    player.resources[resource] += amount;
  }
  state.lastMessage = direction === 'sell'
    ? `Sold ${amount} ${resource} for ${Math.floor(
      MARKET_SELL_GOLD * amount / priceMultiplier(hero),
    )} gold.`
    : `Bought ${amount} ${resource} for ${
      Math.floor(MARKET_BUY_GOLD[resource] * amount * rate * priceMultiplier(hero))
    } gold.`;
}
