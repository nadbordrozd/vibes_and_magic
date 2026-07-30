import type {
  AbilityId, ItemId, ItemInstance, SpellId,
} from '../../core/types';

export type ItemUse = 'combat' | 'adventure' | 'passive' | 'automatic';
export type ItemBehavior =
  | 'scroll' | 'vigor' | 'iron' | 'cleanse' | 'echo'
  | 'reveal' | 'movement' | 'charter' | 'tradeGoods' | 'passiveAbility';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  use: ItemUse;
  behavior: ItemBehavior;
  description: string;
  spellId?: SpellId;
  amount?: number;
  duration?: number;
  radius?: number;
  ability?: AbilityId;
  baseGold?: number;
}

const scroll = (
  id: ItemId, name: string, spellId: SpellId,
): ItemDefinition => ({
  id, name: `Scroll of ${name}`, use: 'combat', behavior: 'scroll', spellId,
  description: `Cast ${name}'s stored face without spending mana.`,
});

export const ITEMS: Record<ItemId, ItemDefinition> = {
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
  mirrorMask: {
    id: 'mirrorMask', name: 'The Mirror-Bound Mask', use: 'passive',
    behavior: 'passiveAbility', ability: 'mask_reflect', amount: 20,
    description: 'Enemy melee attackers suffer 20% of the damage they deal.',
  },
};

export const SCROLL_ITEM_IDS = [
  'scrollRally', 'scrollBlessing', 'scrollForgeSpark', 'scrollWard',
  'scrollWither', 'scrollQuiet', 'scrollDirge', 'scrollSour',
  'scrollAmplify', 'scrollReflect',
] as const satisfies readonly ItemId[];

export const CHEST_ITEM_POOL = [
  'potionOfVigor', 'draughtOfIron', 'smellingSalts', 'bottledEcho',
  'cartographersCase', 'waybread',
  ...SCROLL_ITEM_IDS,
] as const satisfies readonly ItemId[];

export function itemName(item: ItemInstance | string | null): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return `${ITEMS[item.id].name}${item.plus ? '+' : ''}`;
}

export function validateItems(): void {
  for (const definition of Object.values(ITEMS)) {
    if (!definition.name || !definition.description) {
      throw new Error(`Invalid item definition: ${definition.id}`);
    }
    if (definition.behavior === 'scroll' && !definition.spellId) {
      throw new Error(`Scroll has no spell: ${definition.id}`);
    }
  }
}
