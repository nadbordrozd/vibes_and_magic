import type { ResourceId } from '../core/types';

export const MARKET_SELL_GOLD = 150;
export const MARKET_BUY_GOLD: Record<Exclude<ResourceId, 'gold'>, number> = {
  timber: 400,
  iron: 600,
  essence: 800,
};

export const MARKET_SURPLUS_RESERVE = 15;
export const MARKET_AI_MAX_SHORTFALL = 2;
