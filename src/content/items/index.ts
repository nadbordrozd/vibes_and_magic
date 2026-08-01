import type {
  ItemId, ItemInstance, SpellId,
} from '../../core/types';
import { SPELLS } from '../spells';
import { itemFlavor } from '../flavor';

export type ItemUse = 'combat' | 'adventure' | 'automatic';
export type ItemBehavior =
  | 'scroll' | 'vigor' | 'iron' | 'cleanse' | 'echo'
  | 'speed' | 'burnWeapon' | 'enemyHex' | 'hornet' | 'disable'
  | 'walls' | 'seal' | 'unmakeEnchantment' | 'banner' | 'revive'
  | 'reveal' | 'movement' | 'remoteMovement' | 'rumour' | 'recall'
  | 'impassableStep' | 'militiaWrit' | 'draftBoost' | 'foundersTin'
  | 'cronesBundle' | 'charter' | 'tradeGoods';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  flavor: string;
  use: ItemUse;
  behavior: ItemBehavior;
  description: string;
  spellId?: SpellId;
  amount?: number;
  duration?: number;
  radius?: number;
  baseGold?: number;
  target?: 'ally' | 'enemy' | 'enchantment' | 'global' | 'positions';
}

const scroll = (
  id: ItemId, name: string, spellId: SpellId,
): ItemDefinition => ({
  id, name: `Scroll of ${name}`, flavor: itemFlavor(`Scroll of ${name}`),
  use: 'combat', behavior: 'scroll', spellId,
  description: `Cast ${name}'s stored face without spending mana.`,
});

const RAW_ITEMS = {
  spellScroll: {
    id: 'spellScroll', name: 'Spell Scroll', use: 'combat', behavior: 'scroll',
    description: 'Cast the spell stored on this scroll without spending mana.',
  },
  scrollRally: scroll('scrollRally', 'Rally', 'rally'),
  scrollBlessing: scroll('scrollBlessing', 'Blessing', 'blessing'),
  scrollForgeSpark: scroll('scrollForgeSpark', 'Forge-Spark', 'forgeSpark'),
  scrollWard: scroll('scrollWard', 'Ward', 'ward'),
  scrollWither: scroll('scrollWither', 'Wither', 'wither'),
  scrollQuiet: scroll('scrollQuiet', 'Quiet', 'quiet'),
  scrollDirge: scroll('scrollDirge', 'Dirge', 'dirge'),
  scrollSour: scroll('scrollSour', 'Sour', 'sour'),
  scrollAmplify: scroll('scrollAmplify', 'Amplify', 'amplify'),
  scrollReflect: scroll('scrollReflect', 'Reflect', 'reflect'),
  potionOfVigor: {
    id: 'potionOfVigor', name: 'Potion of Vigor', use: 'combat',
    behavior: 'vigor', amount: 40,
    description: 'One allied company gains 40 meter.',
  },
  draughtOfIron: {
    id: 'draughtOfIron', name: 'Draught of Iron', use: 'combat',
    behavior: 'iron', duration: 2,
    description: 'One allied company gains Oath of Iron for two rounds.',
  },
  smellingSalts: {
    id: 'smellingSalts', name: 'Smelling Salts', use: 'combat',
    behavior: 'cleanse',
    description: 'Remove every counter from one allied company.',
  },
  haresHeel: {
    id: 'haresHeel', name: "Hare's Heel", use: 'combat', behavior: 'speed',
    amount: 3, duration: 2, target: 'ally', description: '+3 speed for two rounds.',
  },
  blackfireOil: {
    id: 'blackfireOil', name: 'Blackfire Oil', use: 'combat', behavior: 'burnWeapon',
    duration: 3, target: 'ally', description: 'Attacks apply Burn 1 for three rounds.',
  },
  graveDust: {
    id: 'graveDust', name: 'Grave Dust', use: 'combat', behavior: 'enemyHex',
    amount: 3, target: 'enemy', description: 'One enemy gains Hex 3.',
  },
  hornetJar: {
    id: 'hornetJar', name: 'Hornet Jar', use: 'combat', behavior: 'hornet',
    duration: 1, target: 'enemy', description: 'Enemy cannot retaliate this round and gains Chill 1.',
  },
  milkOfTheMoon: {
    id: 'milkOfTheMoon', name: 'Milk of the Moon', use: 'combat', behavior: 'disable',
    duration: 2, target: 'enemy', description: 'Disable an enemy company’s abilities for two rounds.',
  },
  chalkOfWalls: {
    id: 'chalkOfWalls', name: 'Chalk of Walls', use: 'combat', behavior: 'walls',
    target: 'positions', description: 'Create three Wall of the Maker hexes.',
  },
  waxSeal: {
    id: 'waxSeal', name: 'Wax Seal', use: 'combat', behavior: 'seal',
    target: 'enchantment', description: 'Protect one enchantment from effect manipulation.',
  },
  powderOfUnmaking: {
    id: 'powderOfUnmaking', name: 'Powder of Unmaking', use: 'combat',
    behavior: 'unmakeEnchantment', target: 'enchantment',
    description: 'Destroy one enchantment.',
  },
  bannerWhistle: {
    id: 'bannerWhistle', name: 'Banner Whistle', use: 'combat', behavior: 'banner',
    amount: 10, target: 'global', description: 'Every allied company gains 10 meter.',
  },
  secondCandle: {
    id: 'secondCandle', name: 'Second Candle', use: 'combat', behavior: 'revive',
    amount: 10, target: 'ally', description: 'Revive 10% of a company’s battle losses.',
  },
  bottledEcho: {
    id: 'bottledEcho', name: 'Bottled Echo', use: 'combat',
    behavior: 'echo',
    description: "Repeat the battle's last spell, recomputed with this hero's Spell Power.",
  },
  cartographersCase: {
    id: 'cartographersCase', name: "Cartographer's Case", use: 'adventure',
    behavior: 'reveal', radius: 7, amount: 3,
    description: 'Reveal a seven-tile circle centered within three tiles of explored land.',
  },
  waybread: {
    id: 'waybread', name: 'Waybread', use: 'adventure',
    behavior: 'movement', amount: 600,
    description: 'Gain 600 movement points today.',
  },
  saltedMeat: {
    id: 'saltedMeat', name: 'Salted Meat', use: 'adventure', behavior: 'remoteMovement',
    amount: 300, description: 'Give any allied hero 300 movement points today.',
  },
  tavernTales: {
    id: 'tavernTales', name: 'Tavern Tales', use: 'adventure', behavior: 'rumour',
    description: 'Reveal a seeded shrine, lock hint, or barrow content.',
  },
  hearthstone: {
    id: 'hearthstone', name: 'Hearthstone', use: 'adventure', behavior: 'recall',
    description: 'Return to the nearest owned castle.',
  },
  ferrymansCoin: {
    id: 'ferrymansCoin', name: "Ferryman's Coin", use: 'adventure',
    behavior: 'impassableStep', amount: 3,
    description: 'Step across up to three impassable tiles in a straight line.',
  },
  militiaWrit: {
    id: 'militiaWrit', name: 'Militia Writ', use: 'adventure', behavior: 'militiaWrit',
    description: 'Recruit a castle’s available tier-one growth remotely at double gold cost.',
  },
  beggarsCoin: {
    id: 'beggarsCoin', name: "Beggar's Coin", use: 'adventure', behavior: 'draftBoost',
    amount: 1, description: 'Your next level-up draft deals one additional card.',
  },
  foundersTin: {
    id: 'foundersTin', name: "Founders' Tin", use: 'adventure', behavior: 'foundersTin',
    amount: 10, description: 'Ten Tin Soldiers join this hero.',
  },
  cronesBundle: {
    id: 'cronesBundle', name: "Crone's Bundle", use: 'adventure', behavior: 'cronesBundle',
    description: 'Open one of three seed-determined rare bundles.',
  },
  overseersCharter: {
    id: 'overseersCharter', name: "Overseer's Charter", use: 'adventure',
    behavior: 'charter', amount: 50,
    description: 'Permanently increase the yield of the owned mine underfoot by 50%.',
  },
  tradeGoods: {
    id: 'tradeGoods', name: 'Trade Goods', use: 'automatic',
    behavior: 'tradeGoods', amount: 25, baseGold: 300,
    description: 'Sold at a friendly castle for 300 gold plus 25 per straight-line tile.',
  },
} satisfies Record<ItemId, Omit<ItemDefinition, 'flavor'> | ItemDefinition>;

export const ITEMS = Object.fromEntries(Object.entries(RAW_ITEMS).map(([id, item]) => [
  id, { ...item, flavor: 'flavor' in item ? item.flavor : itemFlavor(item.name) },
])) as Record<ItemId, ItemDefinition>;

export const SCROLL_ITEM_IDS = [
  'scrollRally', 'scrollBlessing', 'scrollForgeSpark', 'scrollWard',
  'scrollWither', 'scrollQuiet', 'scrollDirge', 'scrollSour',
  'scrollAmplify', 'scrollReflect',
] as const satisfies readonly ItemId[];

export const CHEST_ITEM_POOL = [
  'potionOfVigor', 'draughtOfIron', 'smellingSalts', 'haresHeel',
  'blackfireOil', 'graveDust', 'hornetJar', 'milkOfTheMoon', 'chalkOfWalls',
  'waxSeal', 'powderOfUnmaking', 'bannerWhistle', 'secondCandle', 'bottledEcho',
  'cartographersCase', 'waybread', 'saltedMeat', 'tavernTales', 'hearthstone',
  'ferrymansCoin', 'militiaWrit', 'beggarsCoin', 'foundersTin', 'cronesBundle',
  'spellScroll',
] as const satisfies readonly ItemId[];

export function itemName(item: ItemInstance | string | null): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const stored = item.id === 'spellScroll' && item.storedSpellId
    ? ` of ${SPELLS[item.storedSpellId as SpellId]?.name ?? item.storedSpellId}` : '';
  return `${ITEMS[item.id].name}${stored}${item.plus ? '+' : ''}`;
}

export function validateItems(): void {
  for (const definition of Object.values(ITEMS)) {
    if (!definition.name || !definition.flavor.trim() || !definition.description) {
      throw new Error(`Invalid item definition: ${definition.id}`);
    }
    if (definition.behavior === 'scroll' && !definition.spellId
        && definition.id !== 'spellScroll') {
      throw new Error(`Scroll has no spell: ${definition.id}`);
    }
  }
}
