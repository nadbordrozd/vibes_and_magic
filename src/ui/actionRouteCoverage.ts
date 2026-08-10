import type { Action } from '../core/types';

export type HumanActionRoute = {
  surface: string;
  handling: 'visible-control' | 'visible-target-mode' | 'pending-choice' | 'deliberate-internal';
};

/**
 * Exhaustive compile-time inventory of every executable action. The static UX gate imports this
 * table, so adding an action to the union cannot silently omit its human presentation decision.
 */
export const HUMAN_ACTION_ROUTES = {
  CAMPAIGN_SETUP: { surface: 'MainMenu', handling: 'visible-control' },
  MOVE_HERO: { surface: 'AdventureMap', handling: 'visible-target-mode' },
  PICKUP_OBJECT: { surface: 'AdventureMap', handling: 'visible-control' },
  SELECT_HERO: { surface: 'AdventureScreen', handling: 'visible-control' },
  NEXT_HERO: { surface: 'AdventureScreen', handling: 'visible-control' },
  END_TURN: { surface: 'AdventureScreen', handling: 'visible-control' },
  BUILD: { surface: 'CastleScreen building detail', handling: 'visible-control' },
  RECRUIT: { surface: 'CastleScreen recruitment', handling: 'visible-control' },
  SWAP_ARMY: { surface: 'ArmyExchange uses TRANSFER_ARMY', handling: 'deliberate-internal' },
  TRANSFER_ARMY: { surface: 'ArmyExchange', handling: 'visible-control' },
  SPLIT_ARMY: { surface: 'ArmySlots and ArmyExchange', handling: 'visible-control' },
  TRANSFER_ITEM: { surface: 'ExchangeScreen', handling: 'visible-control' },
  EQUIP_ARTIFACT: { surface: 'ArtifactPaperDoll', handling: 'visible-control' },
  UNEQUIP_ARTIFACT: { surface: 'ArtifactPaperDoll', handling: 'visible-control' },
  UNSTITCH: { surface: 'AdventureMap', handling: 'visible-target-mode' },
  HIRE_HERO: { surface: 'CastleScreen Tavern', handling: 'visible-control' },
  CHOOSE_CHEST: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  CHOOSE_SITE_STAT: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  DIG_CACHE: { surface: 'AdventureScreen cache sketch', handling: 'visible-control' },
  BUY_MERCENARY: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  BUY_WAGON_ITEM: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  PAY_TITHE: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  RETIRE: { surface: 'AdventureScreen sandbox action', handling: 'visible-control' },
  CHOOSE_LEVEL: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  SKIP_LEVEL: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  REROLL_LEVEL: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  CHOOSE_DIPLOMACY: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  CHOOSE_STOLEN_SPELL: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  CHOOSE_SPELL_UPGRADE: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  GUILD_INSCRIBE: { surface: 'CastleScreen Mage Guild', handling: 'visible-control' },
  PALIMPSEST_FORGET: { surface: 'AdventureScreen Palimpsest service', handling: 'visible-control' },
  CHOOSE_PALIMPSEST: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  CHOOSE_BARGAIN: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  CAST_ADVENTURE_SPELL: { surface: 'AdventureSpellbook and target dialog', handling: 'visible-target-mode' },
  DECLARE_RESONANCE: { surface: 'AdventureScreen Attunement service', handling: 'visible-control' },
  CHOOSE_NEXT_OMEN: { surface: 'AdventureScreen Ritualist forecast', handling: 'visible-control' },
  USE_ADVENTURE_ITEM: { surface: 'AdventureItemDialog and AdventureMap', handling: 'visible-target-mode' },
  MARKET_TRADE: { surface: 'CastleScreen Marketplace', handling: 'visible-control' },
  BUY_MARKET_SCROLL: { surface: 'CastleScreen Marketplace', handling: 'visible-control' },
  SELL_MARKET_ITEM: { surface: 'CastleScreen Marketplace', handling: 'visible-control' },
  SELL_MARKET_ARTIFACT: { surface: 'CastleScreen Marketplace', handling: 'visible-control' },
  TUNNEL_TRAVEL: { surface: 'CastleScreen Deep Tunnels', handling: 'visible-control' },
  RELOCATE_CASTLE: { surface: 'CastleScreen Hen-Legged Fence', handling: 'visible-control' },
  RECRUIT_DWELLING: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  BUY_TINKER_ITEM: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  BUY_TIMING_BLESSING: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  DEPOSIT_GLOAMING_ITEM: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  DEPOSIT_GLOAMING_ARTIFACT: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  USE_CHRYSALIS: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  COMPLETE_BRIDGE: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  ATTEND_HEDGE_SCHOOL: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  USE_RELIQUARY_CAIRN: { surface: 'AdventureStructureDialog', handling: 'visible-control' },
  CHOOSE_TOLL: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  CHOOSE_SIREN: { surface: 'ChoiceDialog', handling: 'pending-choice' },
  BUILD_BOAT: { surface: 'CastleScreen Shipyard', handling: 'visible-control' },
  BATTLE_MOVE: { surface: 'CombatScreen battlefield', handling: 'visible-target-mode' },
  BATTLE_ATTACK: { surface: 'CombatScreen battlefield', handling: 'visible-target-mode' },
  BATTLE_MOVE_ATTACK: { surface: 'CombatScreen battlefield', handling: 'visible-target-mode' },
  BATTLE_WAIT: { surface: 'CombatScreen actions', handling: 'visible-control' },
  BATTLE_DEFEND: { surface: 'CombatScreen actions', handling: 'visible-control' },
  BATTLE_RETREAT: { surface: 'CombatScreen actions', handling: 'visible-control' },
  BATTLE_SURRENDER: { surface: 'CombatScreen actions', handling: 'visible-control' },
  BATTLE_OVERWIND: { surface: 'CombatScreen actions', handling: 'visible-control' },
  BATTLE_USE_ARTIFACT: { surface: 'CombatScreen artifacts', handling: 'visible-control' },
  BATTLE_USE_ABILITY: { surface: 'CombatScreen abilities', handling: 'visible-target-mode' },
  BATTLE_FREE_MOVE: { surface: 'CombatScreen free-move mode', handling: 'visible-target-mode' },
  BATTLE_CAST: { surface: 'SpellbookPanel and battlefield', handling: 'visible-target-mode' },
  BATTLE_USE_ITEM: { surface: 'CombatScreen items and battlefield', handling: 'visible-target-mode' },
  AUTO_COMBAT: { surface: 'CombatScreen actions', handling: 'visible-control' },
} as const satisfies Record<Action['type'], HumanActionRoute>;

export function validateHumanActionRoutes(): void {
  for (const [type, route] of Object.entries(HUMAN_ACTION_ROUTES)) {
    if (!type || !route.surface.trim()) throw new Error(`Action ${type} has no UI route`);
    if (route.handling === 'deliberate-internal' && !route.surface.includes('uses')) {
      throw new Error(`Internal action ${type} needs a documented replacement route`);
    }
  }
}
