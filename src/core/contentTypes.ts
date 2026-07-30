export type AbilityId =
  | 'ranged' | 'banner' | 'charge' | 'oriflamme'
  | 'springloaded' | 'no_retaliation' | 'soft_body' | 'overwind'
  | 'full_heal' | 'melee_reflect' | 'mask_reflect';

export type ItemId =
  | 'scrollRally' | 'scrollBlessing' | 'scrollForgeSpark' | 'scrollWard'
  | 'scrollWither' | 'scrollQuiet' | 'scrollDirge' | 'scrollSour'
  | 'scrollAmplify' | 'scrollReflect'
  | 'potionOfVigor' | 'draughtOfIron' | 'smellingSalts' | 'bottledEcho'
  | 'cartographersCase' | 'waybread' | 'overseersCharter'
  | 'tradeGoods' | 'mirrorMask';

export interface ItemInstance {
  id: ItemId;
  plus?: boolean;
  origin?: { x: number; y: number };
}

export type ItemSlot = ItemInstance | string | null;
