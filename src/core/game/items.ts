import { ITEMS } from '../../content/items';
import { findOwnedHero } from '../heroes';
import { inBounds, sameCoord } from '../map/pathfinding';
import { revealArea } from '../map/visibility';
import type {
  GameState, Hero, ItemInstance, MapObject,
} from '../types';

export function addItem(hero: Hero, item: ItemInstance): boolean {
  const slot = hero.inventory.findIndex((candidate) => candidate === null);
  if (slot < 0) return false;
  hero.inventory[slot] = {
    ...item,
    origin: item.origin ? { ...item.origin } : undefined,
  };
  return true;
}

export function tradeGoodsPrice(item: ItemInstance, castlePosition: {
  x: number; y: number;
}): number {
  if (item.id !== 'tradeGoods' || !item.origin) {
    throw new Error('Trade Goods have no recorded origin');
  }
  const distance = Math.floor(Math.hypot(
    castlePosition.x - item.origin.x,
    castlePosition.y - item.origin.y,
  ));
  const definition = ITEMS.tradeGoods;
  return (definition.baseGold ?? 0) + (definition.amount ?? 0) * distance;
}

export function sellTradeGoods(
  state: GameState,
  hero: Hero,
  castlePosition: { x: number; y: number },
): number {
  let total = 0;
  hero.inventory = hero.inventory.map((item) => {
    if (!item || typeof item === 'string' || item.id !== 'tradeGoods') return item;
    total += tradeGoodsPrice(item, castlePosition);
    return null;
  });
  state.players[hero.owner].resources.gold += total;
  return total;
}

function canCenterMap(
  explored: string[],
  target: { x: number; y: number },
  allowance: number,
): boolean {
  return explored.some((key) => {
    const [x, y] = key.split(',').map(Number);
    return Math.max(Math.abs(x - target.x), Math.abs(y - target.y)) <= allowance;
  });
}

export function useAdventureItem(
  state: GameState,
  inventorySlot: number,
  target?: { x: number; y: number },
): void {
  const player = state.players[state.activePlayer];
  const hero = player.activeHeroId
    ? findOwnedHero(state, player.id, player.activeHeroId) : null;
  const item = hero?.inventory[inventorySlot];
  if (!hero || inventorySlot < 0 || inventorySlot >= hero.inventory.length
      || !item || typeof item === 'string') throw new Error('Adventure item missing');
  const definition = ITEMS[item.id];
  if (definition.use !== 'adventure') throw new Error('Item cannot be used on the map');
  if (definition.behavior === 'movement') {
    hero.movement += definition.amount ?? 0;
  } else if (definition.behavior === 'reveal') {
    if (!target || !inBounds(state.map, target)
        || !canCenterMap(player.explored, target, definition.amount ?? 0)) {
      throw new Error('Map center must be within three tiles of explored land');
    }
    player.explored = revealArea(
      player.explored, state.map, target, definition.radius ?? 0,
    );
  } else if (definition.behavior === 'charter') {
    const mine = state.map.objects.find(
      (object): object is Extract<MapObject, { kind: 'mine' }> =>
        object.kind === 'mine' && sameCoord(object.position, hero.position),
    );
    if (!mine || mine.owner !== hero.owner) {
      throw new Error('Stand on an owned mine to use the Charter');
    }
    if (mine.chartered) throw new Error('This mine already has a Charter');
    mine.chartered = true;
  } else throw new Error('Item cannot be used on the map');
  hero.inventory[inventorySlot] = null;
  state.lastMessage = `${definition.name} used.`;
}
