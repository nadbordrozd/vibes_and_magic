import type {
  ItemId, ItemInstance, SpellId,
} from '../../core/types';
import { SPELLS } from '../spells';
import { itemFlavor } from '../flavor';
import type { ItemContentKind } from '../v2/schema';
import type { ContentAssetRequirement } from '../v2/schema';
import { validateContentAssets } from '../v2/assets';

export type ItemUse = 'combat' | 'adventure' | 'automatic';
export type ItemBehavior =
  | 'scroll' | 'tome' | 'vigor' | 'iron' | 'cleanse' | 'echo'
  | 'speed' | 'burnWeapon' | 'enemyHex' | 'hornet' | 'disable'
  | 'walls' | 'seal' | 'unmakeEnchantment' | 'banner' | 'revive'
  | 'reveal' | 'movement' | 'remoteMovement' | 'rumour' | 'recall'
  | 'impassableStep' | 'militiaWrit' | 'draftBoost' | 'foundersTin'
  | 'cronesBundle' | 'charter' | 'tradeGoods'
  | 'extraAction' | 'wildfire' | 'counterfeit' | 'graveDustResurrection'
  | 'upgradeSchool' | 'protectEnchantment' | 'countersToBurn' | 'teleportAlly'
  | 'destructionMana' | 'ignoreAggroDay' | 'survey' | 'learnRandomSpell';

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
  target?: 'ally' | 'enemy' | 'enchantment' | 'global' | 'positions' | 'school';
  /** Explicit for v2 content; legacy entries are inferred by validation during the transition. */
  kind?: ItemContentKind;
  teachesSpellId?: SpellId;
  /** Literal worklist subject for docs-60-67 typed item placeholder validation. */
  visualSubject?: string;
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
  spellTome: {
    id: 'spellTome', name: 'Spell Tome', use: 'automatic', behavior: 'tome',
    kind: 'spell-tome',
    description: 'On pickup, permanently learn the named setup-seeded spell.',
    visualSubject: 'A compact closed indigo spell tome with four colored page tabs, one plain brass clasp, and no readable writing.',
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
    description: 'One allied company gains 40 morale.',
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
    amount: 10, target: 'global', description: 'Every allied company gains 10 morale.',
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
    description: 'Return to the nearest owned city.',
  },
  ferrymansCoin: {
    id: 'ferrymansCoin', name: "Ferryman's Coin", use: 'adventure',
    behavior: 'impassableStep', amount: 3,
    description: 'Step across up to three impassable tiles in a straight line.',
  },
  militiaWrit: {
    id: 'militiaWrit', name: 'Militia Writ', use: 'adventure', behavior: 'militiaWrit',
    description: 'Recruit a city’s available tier-one growth remotely at double gold cost.',
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
    description: 'Sold at a friendly city for 300 gold plus 25 per straight-line tile.',
  },
  vialBorrowedHours: {
    id: 'vialBorrowedHours', name: 'Vial of Borrowed Hours', use: 'combat',
    behavior: 'extraAction', target: 'ally', kind: 'consumable',
    description: 'One allied company immediately takes one granted extra action.',
    visualSubject: 'A narrow blue-violet glass vial holding two tiny brass clock hands suspended in clear liquid.',
  },
  wildfireFlask: {
    id: 'wildfireFlask', name: 'Wildfire Flask', use: 'combat',
    behavior: 'wildfire', target: 'enemy', kind: 'consumable',
    description: 'Apply Burn 5 to one enemy and Burn 2 to every adjacent company.',
    visualSubject: 'A round soot-dark flask wrapped in thorny copper wire and filled with vivid orange-red oil, tightly corked.',
  },
  counterfeitCoin: {
    id: 'counterfeitCoin', name: 'Counterfeit Coin', use: 'combat',
    behavior: 'counterfeit', kind: 'consumable',
    description: 'Cast a free copy of the last spell the enemy hero cast, using this hero’s Spell Power.',
    visualSubject: 'A bright false gold coin whose two stamped faces visibly disagree, with a thin flaking edge.',
  },
  graveDustSachet: {
    id: 'graveDustSachet', name: 'Grave-Dust Sachet', use: 'combat',
    behavior: 'graveDustResurrection', target: 'global', kind: 'consumable',
    description: 'The next company destroyed on either side returns on your side at 25% of its starting count.',
    visualSubject: 'A charcoal funeral-cloth sachet tied with bone-white thread and leaking one restrained pinch of pale dust.',
  },
  tuningFork: {
    id: 'tuningFork', name: 'Tuning Fork', use: 'combat', behavior: 'upgradeSchool',
    target: 'school', kind: 'consumable',
    description: 'Choose a school; your spells of that school use Upgraded rules for this battle.',
    visualSubject: 'A clean silver tuning fork with four small colored thread knots around its handle.',
  },
  sealingWaxCord: {
    id: 'sealingWaxCord', name: 'Sealing Wax Cord', use: 'combat',
    behavior: 'protectEnchantment', target: 'enchantment', kind: 'consumable',
    description: 'Protect one of your battle enchantments for the rest of this battle.',
    visualSubject: 'A coiled cream cord threaded through three plain deep-red sealing-wax wafers.',
  },
  ironFilings: {
    id: 'ironFilings', name: 'Iron Filings', use: 'combat', behavior: 'countersToBurn',
    target: 'enemy', kind: 'consumable',
    description: 'Convert every counter on one enemy company to Burn, one for one.',
    visualSubject: 'A folded white paper packet spilling a compact fan of dark magnetic iron filings.',
  },
  looseThread: {
    id: 'looseThread', name: 'Loose Thread', use: 'combat', behavior: 'teleportAlly',
    target: 'ally', kind: 'consumable',
    description: 'Teleport one allied company to any legal empty hex its footprint fits.',
    visualSubject: 'One long red thread looped impossibly through a small brass needle without a knot.',
  },
  ledgerPage: {
    id: 'ledgerPage', name: 'Ledger Page', use: 'combat', behavior: 'destructionMana',
    target: 'global', kind: 'consumable',
    description: 'Gain 3 mana for every company destroyed this battle, up to maximum mana.',
    visualSubject: 'A single cream ledger leaf ruled in charcoal lines with three blank red tally boxes and no writing.',
  },
  nightjarFeather: {
    id: 'nightjarFeather', name: 'Nightjar Feather', use: 'adventure',
    behavior: 'ignoreAggroDay', kind: 'consumable',
    description: 'This hero ignores all guardian aggro for the rest of today.',
    visualSubject: 'A broad mottled brown nightjar feather bound at the quill with one dark-blue thread.',
  },
  surveyorsTwine: {
    id: 'surveyorsTwine', name: "Surveyor's Twine", use: 'adventure', behavior: 'survey',
    radius: 8, kind: 'consumable',
    description: 'Reveal a radius-8 circle anywhere and show exact guardian counts inside it today.',
    visualSubject: 'A compact wooden survey reel wound with cream twine beside one small brass plumb bob.',
  },
  spellbookPage: {
    id: 'spellbookPage', name: 'Spellbook Page', use: 'adventure',
    behavior: 'learnRandomSpell', kind: 'consumable',
    description: 'Learn one seeded random unknown tier-1–3 spell from a school already in this spellbook.',
    visualSubject: 'A loose vellum spellbook leaf with four colored edge tabs and blank diagram circles, no readable writing.',
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
  'spellScroll', 'vialBorrowedHours', 'wildfireFlask', 'counterfeitCoin',
  'graveDustSachet', 'tuningFork', 'sealingWaxCord', 'ironFilings', 'looseThread',
  'ledgerPage', 'nightjarFeather', 'surveyorsTwine', 'spellbookPage',
] as const satisfies readonly ItemId[];

export const V2_ITEM_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] =
  Object.values(ITEMS).filter((item) => item.visualSubject).map((item) => ({
    canonicalId: `item:${item.id}`, nativeAssetId: `map-object:item:${item.id}`,
    introducedBy: 'docs-60-67', accessibleName: item.name,
    visualSubject: item.visualSubject!,
    semantics: { family: 'item', itemKind: item.kind ?? 'consumable' },
  }));

export function itemName(item: ItemInstance | string | null): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const stored = item.id === 'spellScroll' && item.storedSpellId
    ? ` of ${SPELLS[item.storedSpellId as SpellId]?.name ?? item.storedSpellId}`
    : item.id === 'spellTome' && item.storedSpellId
      ? `: ${SPELLS[item.storedSpellId as SpellId]?.name ?? item.storedSpellId}` : '';
  return `${ITEMS[item.id].name}${stored}${item.plus ? ' · Upgraded' : ''}`;
}

export function validateSpellTomeInstance(item: ItemInstance): void {
  if (item.id !== 'spellTome') return;
  const spell = item.storedSpellId ? SPELLS[item.storedSpellId as SpellId] : undefined;
  if (!spell || !item.tomeSource) throw new Error('Spell Tome needs a named spell and source');
  if (spell.acquisition?.provenance || item.storedSpellId === 'summonSkiff') {
    throw new Error('Generic Spell Tomes cannot contain provenance-only spells');
  }
  const tier = spell.tier ?? 1;
  if ((item.tomeSource === 'chest' || item.tomeSource === 'reliquary-cairn') && tier > 3) {
    throw new Error(`${item.tomeSource} Spell Tomes are limited to tiers 1–3`);
  }
  if (item.tomeSource === 'reliquary-pages' && tier !== 4) {
    throw new Error('Reliquary of Pages Spell Tomes must contain exactly tier 4');
  }
  if (tier >= 4 && !['lock', 'barrow', 'reliquary-pages'].includes(item.tomeSource)) {
    throw new Error('Tier-4/5 Spell Tomes are limited to locks and barrow rewards');
  }
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
    if (definition.kind === 'spell-tome' && !definition.teachesSpellId
        && definition.id !== 'spellTome') {
      throw new Error(`Spell Tome has no spell: ${definition.id}`);
    }
    if (definition.teachesSpellId && !SPELLS[definition.teachesSpellId]) {
      throw new Error(`Item references unknown spell: ${definition.id}`);
    }
  }
  validateContentAssets(V2_ITEM_ASSET_REQUIREMENTS,
    new Set(V2_ITEM_ASSET_REQUIREMENTS.map((row) => row.nativeAssetId)), 'release');
}
