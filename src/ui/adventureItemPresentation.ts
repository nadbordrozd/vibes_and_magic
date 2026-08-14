import { ITEMS, itemName } from '../content/items';
import { FACTION_UNITS, UNITS } from '../content/units';
import { CASTLE_NAMES } from '../content/factionPresentation';
import { ferrymansCoinTargetReason } from '../core/game/items';
import type {
  Action, Castle, Coord, GameState, Hero, ItemInstance,
} from '../core/types';
import type { ActionDraft } from './components/ActionConfirmationDialog';

export function adventureItemDraft(
  state: GameState,
  hero: Hero,
  inventorySlot: number,
  target?: Coord,
  targetHero?: Hero,
  castle?: Castle,
): ActionDraft {
  const item = hero.inventory[inventorySlot] as ItemInstance;
  const definition = ITEMS[item.id];
  const action: Extract<Action, { type: 'USE_ADVENTURE_ITEM' }> = {
    type: 'USE_ADVENTURE_ITEM', inventorySlot,
    ...(target ? { target } : {}),
    ...(targetHero ? { targetHeroId: targetHero.id } : {}),
    ...(castle ? { castleId: castle.id } : {}),
  };
  let targetName = hero.name;
  let effect = definition.description;
  if (definition.behavior === 'remoteMovement' && targetHero) targetName = targetHero.name;
  if (definition.behavior === 'reveal' && target) targetName = `map center ${target.x}, ${target.y}`;
  if (definition.behavior === 'survey' && target) targetName = `map center ${target.x}, ${target.y}`;
  if (definition.behavior === 'impassableStep' && target) {
    targetName = `landing tile ${target.x}, ${target.y}`;
    effect = `${hero.name} crosses the intervening impassable tiles and lands there.`;
  }
  if (definition.behavior === 'militiaWrit' && castle) {
    const unit = UNITS[FACTION_UNITS[castle.faction][0]];
    targetName = `${CASTLE_NAMES[castle.faction]} garrison`;
    effect = `Recruit all ${castle.available[0]} waiting ${unit.name} into that garrison at double unit cost.`;
  }
  return { action, title: `Use ${itemName(item)}`, actor: hero.name, target: targetName, effect };
}

export function legalAdventureItemMapTargets(
  state: GameState, hero: Hero, inventorySlot: number,
): Set<string> {
  const item = hero.inventory[inventorySlot];
  if (!item || typeof item === 'string') return new Set();
  const definition = ITEMS[item.id];
  if (definition.behavior === 'survey') {
    const targets = new Set<string>();
    for (let y = 0; y < state.map.height; y += 1) for (let x = 0; x < state.map.width; x += 1) {
      targets.add(`${x},${y}`);
    }
    return targets;
  }
  if (definition.behavior === 'reveal') {
    const allowance = definition.amount ?? 0;
    const targets = new Set<string>();
    for (const key of state.players[hero.owner].explored) {
      const [x, y] = key.split(',').map(Number);
      for (let dy = -allowance; dy <= allowance; dy += 1) {
        for (let dx = -allowance; dx <= allowance; dx += 1) {
          const tx = x + dx; const ty = y + dy;
          if (tx >= 0 && ty >= 0 && tx < state.map.width && ty < state.map.height) {
            targets.add(`${tx},${ty}`);
          }
        }
      }
    }
    return targets;
  }
  if (definition.behavior === 'impassableStep') {
    const targets = new Set<string>();
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      if (dx === 0 && dy === 0) continue;
      for (let distance = 2; distance <= (definition.amount ?? 3) + 1; distance += 1) {
        const target = { x: hero.position.x + dx * distance, y: hero.position.y + dy * distance };
        if (!ferrymansCoinTargetReason(state, hero, target, definition.amount ?? 3)) {
          targets.add(`${target.x},${target.y}`);
        }
      }
    }
    return targets;
  }
  return new Set();
}
