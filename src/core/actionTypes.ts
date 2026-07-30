import type {
  ArmyHolder, BuildingId, Coord, LevelChoice, ResourceId,
  SpellId, UnitTier,
} from './types';

export type Action =
  | { type: 'MOVE_HERO'; destination: Coord; heroId?: string }
  | { type: 'SELECT_HERO'; heroId: string }
  | { type: 'NEXT_HERO' }
  | { type: 'END_TURN' }
  | { type: 'BUILD'; castleId: string; buildingId: BuildingId }
  | { type: 'RECRUIT'; castleId: string; tier: UnitTier; count: number }
  | { type: 'SWAP_ARMY'; castleId: string; heroSlot: number; garrisonSlot: number }
  | {
    type: 'TRANSFER_ARMY'; source: ArmyHolder; sourceSlot: number;
    destination: ArmyHolder; destinationSlot: number; count: number;
  }
  | {
    type: 'TRANSFER_ITEM'; sourceHeroId: string; destinationHeroId: string;
    sourceSlot: number; destinationSlot: number;
  }
  | { type: 'HIRE_HERO'; castleId: string; heroId: string }
  | { type: 'CHOOSE_CHEST'; choice: 'gold' | 'xp' | 'item' }
  | { type: 'CHOOSE_LEVEL'; stat: LevelChoice }
  | { type: 'CHOOSE_DIPLOMACY'; choice: 'fight' | 'disband' | 'recruit' }
  | { type: 'CHOOSE_STOLEN_SPELL'; spellId: SpellId }
  | { type: 'CHOOSE_SPELL_UPGRADE'; spellId: SpellId }
  | { type: 'GUILD_INSCRIBE'; castleId: string; spellId: SpellId }
  | { type: 'USE_ADVENTURE_ITEM'; inventorySlot: number; target?: Coord }
  | {
    type: 'MARKET_TRADE'; castleId: string; direction: 'buy' | 'sell';
    resource: Exclude<ResourceId, 'gold'>; amount: number;
  }
  | { type: 'BATTLE_MOVE'; destination: Coord }
  | { type: 'BATTLE_ATTACK'; targetId: string }
  | { type: 'BATTLE_MOVE_ATTACK'; destination: Coord; targetId: string }
  | { type: 'BATTLE_WAIT' }
  | { type: 'BATTLE_DEFEND' }
  | { type: 'BATTLE_OVERWIND' }
  | {
    type: 'BATTLE_CAST'; spellId: SpellId; targetId?: string;
    secondaryTargetId?: string; effectId?: string; positions?: Coord[];
    replaceEnchantment?: number;
  }
  | {
    type: 'BATTLE_USE_ITEM'; inventorySlot: number; targetId?: string;
    secondaryTargetId?: string; effectId?: string; positions?: Coord[];
    replaceEnchantment?: number;
  }
  | { type: 'AUTO_COMBAT' };
