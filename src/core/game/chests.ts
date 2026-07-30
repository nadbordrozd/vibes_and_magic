import { CHEST_ITEM_POOL } from '../../content/items';
import { randomInt } from '../rng';
import type { GameState, Hero, ItemInstance } from '../types';

export function drawChestItem(state: GameState): ItemInstance {
  let index: number;
  [index, state.rng] = randomInt(state.rng, CHEST_ITEM_POOL.length);
  return { id: CHEST_ITEM_POOL[index] };
}

export function offerChestChoice(
  state: GameState,
  objectId: string,
  hero: Hero,
): void {
  state.pendingChoice = {
    kind: 'chest', objectId, playerId: hero.owner, heroId: hero.id,
    item: drawChestItem(state),
  };
}
