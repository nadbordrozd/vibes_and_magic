import { ITEMS } from '../../content/items';
import { SKILLS } from '../../content/skills';
import { findOwnedHero } from '../heroes';
import { inBounds, sameCoord } from '../map/pathfinding';
import { castleEntrance, objectEntranceTile } from '../map/occupancy';
import { revealArea } from '../map/visibility';
import type {
  GameState, Hero, ItemInstance, MapObject,
} from '../types';
import { artifactEffectTotal } from '../artifacts';
import { skillRank } from '../heroBehaviors';
import { addUnits } from '../army';
import { FACTION_UNITS, UNITS } from '../../content/units';
import { canAfford, pay } from '../army';
import { randomInt } from '../rng';
import { terrainIdAt } from '../../content/terrain';
import type { SpellId } from '../types';

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
    const artifactBonus = artifactEffectTotal(hero, 'trade_goods') / 100;
    const peddlerBonus = skillRank(hero, 'peddler') === 3
      ? SKILLS.peddler.values.goodsBonus : 0;
    total += Math.floor(
      tradeGoodsPrice(item, castlePosition) * (1 + artifactBonus + peddlerBonus),
    );
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
  targetHeroId?: string,
  castleId?: string,
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
  } else if (definition.behavior === 'remoteMovement') {
    const recipient = targetHeroId
      ? findOwnedHero(state, player.id, targetHeroId) : hero;
    if (!recipient) throw new Error('Movement recipient missing');
    recipient.movement += definition.amount ?? 0;
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
        object.kind === 'mine' && sameCoord(objectEntranceTile(object), hero.position),
    );
    if (!mine || mine.owner !== hero.owner) {
      throw new Error('Stand on an owned mine to use the Charter');
    }
    if (mine.chartered) throw new Error('This mine already has a Charter');
    mine.chartered = true;
  } else if (definition.behavior === 'rumour') {
    const site = state.map.objects.find((object) =>
      (object.kind === 'shrine' || object.kind === 'lock')
      && !player.explored.includes(`${object.position.x},${object.position.y}`));
    if (site) {
      player.explored = revealArea(player.explored, state.map, site.position, 2);
      state.lastMessage = site.kind === 'lock'
        ? `Tavern tale: ${site.tell}`
        : site.kind === 'shrine'
          ? `Tavern tale: a ${site.school} shrine was marked.` : 'A place was marked.';
    }
  } else if (definition.behavior === 'recall') {
    const castle = state.castles.filter((candidate) => candidate.owner === hero.owner)
      .sort((a, b) => Math.hypot(a.position.x - hero.position.x, a.position.y - hero.position.y)
        - Math.hypot(b.position.x - hero.position.x, b.position.y - hero.position.y))[0];
    if (!castle) throw new Error('No friendly castle answers the Hearthstone');
    hero.position = castleEntrance(castle);
  } else if (definition.behavior === 'impassableStep') {
    if (!target || !inBounds(state.map, target)) throw new Error('Choose a landing tile');
    const dx = target.x - hero.position.x;
    const dy = target.y - hero.position.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps < 2 || steps > (definition.amount ?? 3) + 1
        || (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy))) {
      throw new Error('The crossing must be a straight line over one to three tiles');
    }
    const stepX = Math.sign(dx); const stepY = Math.sign(dy);
    const crossed = Array.from({ length: steps - 1 }, (_, index) => ({
      x: hero.position.x + stepX * (index + 1),
      y: hero.position.y + stepY * (index + 1),
    }));
    const passable = (position: { x: number; y: number }) => !['mountain', 'water']
      .includes(terrainIdAt(state.map, position));
    if (crossed.some(passable) || !passable(target)) {
      throw new Error('Ferryman’s Coin must cross only impassable tiles');
    }
    hero.position = { ...target };
  } else if (definition.behavior === 'militiaWrit') {
    const castle = state.castles.find((candidate) =>
      candidate.id === castleId && candidate.owner === hero.owner);
    if (!castle) throw new Error('Choose an owned castle');
    const count = castle.available[0];
    const unitId = FACTION_UNITS[castle.faction][0];
    const doubled = Object.fromEntries(Object.entries(UNITS[unitId].cost).map(
      ([resource, amount]) => [resource, (amount ?? 0) * 2],
    ));
    if (count <= 0 || !canAfford(player.resources, doubled, count)) {
      throw new Error('The Writ cannot be paid');
    }
    const army = addUnits(castle.garrison, unitId, count);
    if (!army) throw new Error('No army slot for the militia');
    castle.garrison = army;
    player.resources = pay(player.resources, doubled, count);
    castle.available[0] = 0;
  } else if (definition.behavior === 'draftBoost') {
    hero.draftBonusCards += definition.amount ?? 1;
  } else if (definition.behavior === 'foundersTin') {
    const army = addUnits(hero.army, 'tinSoldier', definition.amount ?? 10);
    if (!army) throw new Error('No army slot for the Founders’ Tin');
    hero.army = army;
  } else if (definition.behavior === 'cronesBundle') {
    hero.inventory[inventorySlot] = null;
    let outcome: number;
    [outcome, state.rng] = randomInt(state.rng, 3);
    if (outcome === 0) {
      const uncommon = [
        'blackfireOil', 'graveDust', 'hornetJar', 'milkOfTheMoon',
        'chalkOfWalls', 'waxSeal', 'powderOfUnmaking', 'bannerWhistle',
      ] as const;
      let first: number; let second: number;
      [first, state.rng] = randomInt(state.rng, uncommon.length);
      [second, state.rng] = randomInt(state.rng, uncommon.length - 1);
      if (second >= first) second += 1;
      addItem(hero, { id: uncommon[first] });
      addItem(hero, { id: uncommon[second] });
    } else if (outcome === 1) {
      const spells: SpellId[] = ['blessing', 'ward', 'quiet', 'bloom'];
      let spell: number;
      [spell, state.rng] = randomInt(state.rng, spells.length);
      addItem(hero, { id: 'spellScroll', storedSpellId: spells[spell], plus: true });
    } else player.resources.essence += 6;
    state.lastMessage = `${definition.name} opened.`;
    return;
  } else throw new Error('Item cannot be used on the map');
  hero.inventory[inventorySlot] = null;
  state.lastMessage = `${definition.name} used.`;
}
