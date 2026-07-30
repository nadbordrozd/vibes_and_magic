import {
  MARKET_BUY_GOLD, MARKET_SELL_GOLD,
} from '../../content/marketplace';
import { sameCoord } from '../map/pathfinding';
import type {
  GameState, ResourceId,
} from '../types';

type MarketResource = Exclude<ResourceId, 'gold'>;

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
  const hero = player.heroes.find((candidate) =>
    candidate.alive && sameCoord(candidate.position, castle?.position ?? { x: -1, y: -1 }));
  if (!castle || castle.owner !== player.id || !castle.buildings.includes('marketplace')) {
    throw new Error('Marketplace unavailable');
  }
  if (!hero) throw new Error('A hero must visit the Marketplace');
  if (direction === 'sell') {
    if (player.resources[resource] < amount) throw new Error('Not enough resources');
    player.resources[resource] -= amount;
    player.resources.gold += MARKET_SELL_GOLD * amount;
  } else {
    const price = MARKET_BUY_GOLD[resource] * amount;
    if (player.resources.gold < price) throw new Error('Not enough gold');
    player.resources.gold -= price;
    player.resources[resource] += amount;
  }
  state.lastMessage = direction === 'sell'
    ? `Sold ${amount} ${resource} for ${MARKET_SELL_GOLD * amount} gold.`
    : `Bought ${amount} ${resource} for ${MARKET_BUY_GOLD[resource] * amount} gold.`;
}
