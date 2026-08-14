import type {
  AbilityId, ArmyHolder, BargainId, BuildingId, Coord, EquipmentSlotId, LevelChoice, OmenId,
  ResourceId, SpellId, SpellSchool, UnitTier,
  NewGameOptions,
} from './types';

export type Action =
  | { type: 'CAMPAIGN_SETUP'; options: NewGameOptions }
  | { type: 'MOVE_HERO'; destination: Coord; heroId?: string; avoidAggro?: boolean;
    useWayfaring?: boolean }
  | { type: 'ARTIFACT_CROSS_TERRAIN'; heroId: string; destination: Coord;
    mode: 'mountain-step' | 'water-strait' }
  | { type: 'ARTIFACT_RETURN_TO_START'; heroId: string }
  | { type: 'ARTIFACT_MARKER'; heroId: string; mode: 'plant' | 'teleport' }
  | { type: 'ARTIFACT_SKIP_GUARD'; heroId: string; objectId: string }
  | { type: 'ARTIFACT_REMOTE_TRANSFER'; sourceHeroId: string; destinationHeroId: string;
    kind: 'artifact' | 'army'; sourceSlot: number; count?: number }
  | { type: 'ARTIFACT_MOVE_STAT'; heroId: string;
    from: import('./types').PrimaryStat; to: import('./types').PrimaryStat }
  | { type: 'ARTIFACT_PAY_REMOVAL'; heroId: string; artifactId: import('./types').ArtifactId }
  | { type: 'PICKUP_OBJECT'; objectId: string }
  | { type: 'SELECT_HERO'; heroId: string }
  | { type: 'NEXT_HERO' }
  | { type: 'END_TURN' }
  | { type: 'BUILD'; castleId: string; buildingId: BuildingId }
  | { type: 'DISMISS_GUILD_REVEAL' }
  | { type: 'RECRUIT'; castleId: string; tier: UnitTier; count: number }
  | { type: 'SWAP_ARMY'; castleId: string; heroSlot: number; garrisonSlot: number }
  | {
    type: 'TRANSFER_ARMY'; source: ArmyHolder; sourceSlot: number;
    destination: ArmyHolder; destinationSlot: number; count: number;
  }
  | {
    type: 'SPLIT_ARMY'; holder: ArmyHolder; sourceSlot: number;
    destinationSlot: number; count: number;
  }
  | {
    type: 'TRANSFER_ITEM'; sourceHeroId: string; destinationHeroId: string;
    sourceSlot: number; destinationSlot: number;
  }
  | {
    type: 'EQUIP_ARTIFACT'; heroId: string; backpackIndex: number;
    equipmentSlot: EquipmentSlotId; chosenSchool?: SpellSchool;
    chosenObjectKind?: string; chosenDwellingTier?: UnitTier;
  }
  | {
    type: 'UNEQUIP_ARTIFACT'; heroId: string; equipmentSlot: EquipmentSlotId;
  }
  | { type: 'UNSTITCH'; heroId: string; destination: Coord }
  | { type: 'HIRE_HERO'; castleId: string; heroId: string }
  | { type: 'CHOOSE_CHEST'; choice: 'gold' | 'xp' | 'item' }
  | { type: 'CHOOSE_SITE_STAT'; choice: 'attack' | 'defense' }
  | { type: 'DIG_CACHE'; position: Coord }
  | { type: 'BUY_MERCENARY'; objectId: string; rosterIndex: number }
  | { type: 'BUY_WAGON_ITEM'; objectId: string }
  | { type: 'PAY_TITHE'; objectId: string }
  | { type: 'RETIRE' }
  | { type: 'CHOOSE_LEVEL'; stat: LevelChoice }
  | { type: 'CHOOSE_ADEPT_SPELL'; spellId: SpellId }
  | { type: 'SKIP_LEVEL' }
  | { type: 'REROLL_LEVEL' }
  | {
    type: 'CHOOSE_DIPLOMACY';
    choice: 'fight' | 'disband' | 'recruit' | 'standAside';
  }
  | { type: 'CHOOSE_STOLEN_SPELL'; spellId: SpellId }
  | { type: 'CHOOSE_SPELL_UPGRADE'; spellId: SpellId }
  | { type: 'GUILD_INSCRIBE'; castleId: string; spellId: SpellId }
  | { type: 'PALIMPSEST_FORGET'; siteId: string; spellId: SpellId }
  | { type: 'CHOOSE_PALIMPSEST'; spellId: SpellId }
  | { type: 'CHOOSE_BARGAIN'; bargainId: BargainId; castleId?: string }
  | {
    type: 'CAST_ADVENTURE_SPELL'; spellId: SpellId;
    target?: Coord; secondaryTarget?: Coord; targetId?: string;
    targetHeroId?: string; secondaryHeroId?: string; castleId?: string;
    secondaryCastleId?: string; school?: SpellSchool; omen?: OmenId;
    positions?: Coord[]; sourceSlot?: number; destinationSlot?: number;
    courierKind?: 'item' | 'army'; recruit?: boolean;
    displayedBand?: string; learnSpellId?: SpellId; skipLearnSpell?: boolean;
  }
  | { type: 'DECLARE_RESONANCE'; heroId: string; school: SpellSchool }
  | { type: 'CHOOSE_NEXT_OMEN'; heroId: string; omen: OmenId }
  | {
    type: 'USE_ADVENTURE_ITEM'; inventorySlot: number; target?: Coord;
    targetHeroId?: string; castleId?: string;
  }
  | {
    type: 'MARKET_TRADE'; castleId: string; direction: 'buy' | 'sell';
    resource: Exclude<ResourceId, 'gold'>; amount: number;
  }
  | { type: 'MARKET_DIRECT_EXCHANGE'; castleId: string;
    from: Exclude<ResourceId, 'gold'>; to: Exclude<ResourceId, 'gold'>; amount: number }
  | { type: 'BUY_MARKET_SCROLL'; castleId: string; heroId?: string }
  | { type: 'REFRESH_LOGISTICS'; heroId: string }
  | { type: 'DESIGNATE_TACTICIAN'; heroId: string; armySlot: number }
  | { type: 'REMOTE_RECRUIT'; heroId: string; castleId: string; tier: UnitTier; count: number }
  | { type: 'CHOOSE_DUELIST_ARTIFACT'; artifactId: import('./types').ArtifactId }
  | { type: 'SELL_MARKET_ITEM'; castleId: string; inventorySlot: number }
  | { type: 'SELL_MARKET_ARTIFACT'; castleId: string; backpackIndex: number }
  | { type: 'TUNNEL_TRAVEL'; destinationCastleId: string }
  | { type: 'RELOCATE_CASTLE'; castleId: string; destination: Coord }
  | { type: 'RECRUIT_DWELLING'; objectId: string; count: number }
  | { type: 'BUY_TINKER_ITEM'; objectId: string }
  | { type: 'BUY_TIMING_BLESSING'; objectId: string }
  | { type: 'DEPOSIT_GLOAMING_ITEM'; objectId: string; inventorySlot: number }
  | { type: 'DEPOSIT_GLOAMING_ARTIFACT'; objectId: string; backpackIndex: number }
  | { type: 'USE_CHRYSALIS'; objectId: string; armySlot: number }
  | { type: 'COMPLETE_BRIDGE'; objectId: string }
  | { type: 'ATTEND_HEDGE_SCHOOL'; objectId: string }
  | { type: 'USE_RELIQUARY_CAIRN'; objectId: string; backpackIndex: number }
  | { type: 'USE_ACQUISITION_SITE'; objectId: string }
  | { type: 'CHOOSE_ACQUISITION_SPELL'; spellId: SpellId }
  | { type: 'CHOOSE_TOLL'; choice: 'pay' | 'fight' }
  | { type: 'CHOOSE_SIREN'; choice: 'listen' | 'rowPast' }
  | { type: 'BUILD_BOAT'; castleId: string }
  | { type: 'BATTLE_MOVE'; destination: Coord }
  | { type: 'BATTLE_ATTACK'; targetId: string }
  | { type: 'BATTLE_MOVE_ATTACK'; destination: Coord; targetId: string }
  | { type: 'BATTLE_WAIT' }
  | { type: 'BATTLE_DEFEND' }
  | { type: 'BATTLE_RETREAT' }
  | { type: 'BATTLE_SURRENDER' }
  | { type: 'BATTLE_OVERWIND' }
  | { type: 'BATTLE_USE_ARTIFACT'; artifactId: import('./types').ArtifactId;
    targetId?: string; counterId?: import('./types').CounterId; mode?: 'store' | 'release' }
  | {
    type: 'BATTLE_USE_ABILITY'; abilityId: AbilityId;
    targetId?: string; destination?: Coord; spellId?: SpellId;
    secondaryTargetId?: string; effectId?: string; positions?: Coord[];
    replaceEnchantment?: number; skipRound?: number; actImmediately?: boolean;
    counterId?: import('./types').CounterId; deflectTargetId?: string;
  }
  | {
    type: 'BATTLE_USE_SKILL'; skillId: 'beguiler'; targetId: string;
    mode: 'chill' | 'control'; side: import('./types').BattleSide;
  }
  | {
    type: 'BATTLE_USE_KNACK'; targetId?: string; secondaryTargetId?: string; positions?: Coord[];
  }
  | { type: 'BATTLE_CHOOSE_COUNTER_REDIRECT'; side: import('./types').BattleSide; targetId: string }
  | { type: 'BATTLE_CHOOSE_SPELL_DEFLECT'; side: import('./types').BattleSide; targetId: string }
  | { type: 'BATTLE_CHOOSE_MIRROR_COPY'; side: import('./types').BattleSide; targetId: string }
  | { type: 'BATTLE_DEPLOY_AMBUSH'; stackId: string; destination: Coord }
  | { type: 'BATTLE_FREE_MOVE'; targetId: string; destination: Coord }
  | {
    type: 'BATTLE_CAST'; spellId: SpellId; targetId?: string;
    secondaryTargetId?: string; artifactSecondTargetId?: string; mirrorTargetId?: string;
    mirrorSecondaryTargetId?: string; effectId?: string; positions?: Coord[];
    deflectTargetId?: string;
    replaceEnchantment?: number; skipRound?: number;
    actImmediately?: boolean; counterId?: import('./types').CounterId;
  }
  | {
    type: 'BATTLE_USE_ITEM'; inventorySlot: number; targetId?: string;
    secondaryTargetId?: string; effectId?: string; positions?: Coord[];
    replaceEnchantment?: number; skipRound?: number; school?: SpellSchool;
    actImmediately?: boolean; counterId?: import('./types').CounterId;
  }
  | { type: 'AUTO_COMBAT' };
