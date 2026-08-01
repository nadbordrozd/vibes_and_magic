import { autoResolveBattle } from '../ai/combat';
import { applyBattleAction } from './combat/battle';
import { surrenderCost } from './combat/battle';
import { bestLevelOption } from './progression';
import type {
  Action, GameState,
} from './types';
import {
  build, buildBoat, firstAffordableBuilding, recruit, splitArmy, swapArmy, transferArmy, transferItem,
} from './game/economy';
import { chooseDiplomacy, chooseSiren, chooseToll, moveHero, pickupObject } from './game/exploration';
import {
  chooseChest, chooseStolenSpell, finalizeBattle,
} from './game/outcomes';
import {
  chooseLevel, rerollLevel, skipLevel,
} from './game/levelUps';
import { chooseSpellUpgrade, guildInscribe } from './game/magic';
import {
  createGame, endTurn, incomeForPlayer,
} from './game/setup';
import { hireHero } from './game/tavern';
import { useAdventureItem } from './game/items';
import {
  buyMarketScroll, marketTrade, sellMarketArtifact, sellMarketItem,
} from './game/marketplace';
import { choosePalimpsest, palimpsestForget } from './game/palimpsest';
import {
  findOwnedHero, nextHero, selectHero, syncAllHeroViews, syncLegacyHeroIntoRoster,
} from './heroes';
import { equipArtifact, unequipArtifact, unstitchHero } from './artifacts';
import { castAdventureSpell } from './game/adventureSpells';
import { chooseBargain } from './game/bargains';
import { relocateCastle, tunnelTravel } from './game/castleAbilities';
import {
  attendHedgeSchool, buyTimingBlessing, buyTinkerItem, completeBridge,
  buyMercenary, buyWagonItem, chooseSiteStat, digCache, payTithe,
  depositGloamingArtifact, depositGloamingItem, recruitDwelling,
  useChrysalis, useReliquaryCairn,
} from './game/mapObjects';
import { armyPower, makeArmy } from './army';

export { createGame, firstAffordableBuilding, incomeForPlayer };

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function legalActions(state: GameState): Action[] {
  if (state.phase === 'gameOver') return [];
  if (state.pendingChoice?.kind === 'chest') {
    const hero = findOwnedHero(
      state, state.pendingChoice.playerId, state.pendingChoice.heroId,
    );
    return [
      { type: 'CHOOSE_CHEST', choice: 'gold' },
      { type: 'CHOOSE_CHEST', choice: 'xp' },
      ...(state.pendingChoice.artifact || hero?.inventory.includes(null)
        ? [{ type: 'CHOOSE_CHEST', choice: 'item' } as const] : []),
    ];
  }
  if (state.pendingChoice?.kind === 'siteStat') {
    return state.pendingChoice.options.map((choice) => ({ type: 'CHOOSE_SITE_STAT', choice }));
  }
  if (state.pendingChoice?.kind === 'level') {
    return [
      ...state.pendingChoice.options.map((stat) => ({ type: 'CHOOSE_LEVEL', stat } as const)),
      ...(state.pendingChoice.canSkip ? [{ type: 'SKIP_LEVEL' } as const] : []),
      ...(state.pendingChoice.canReroll ? [{ type: 'REROLL_LEVEL' } as const] : []),
    ];
  }
  if (state.pendingChoice?.kind === 'shrine' || state.pendingChoice?.kind === 'inscribe') {
    return state.pendingChoice.options.map((spellId) => ({
      type: 'CHOOSE_SPELL_UPGRADE', spellId,
    }));
  }
  if (state.pendingChoice?.kind === 'diplomacy') {
    return [
      { type: 'CHOOSE_DIPLOMACY', choice: 'fight' },
      { type: 'CHOOSE_DIPLOMACY', choice: 'disband' },
      ...(state.pendingChoice.recruitCost !== null
        ? [{ type: 'CHOOSE_DIPLOMACY', choice: 'recruit' } as const] : []),
      ...(state.pendingChoice.canStandAside
        ? [{ type: 'CHOOSE_DIPLOMACY', choice: 'standAside' } as const] : []),
    ];
  }
  if (state.pendingChoice?.kind === 'spellthief') {
    return state.pendingChoice.options.map((spellId) => ({
      type: 'CHOOSE_STOLEN_SPELL', spellId,
    }));
  }
  if (state.pendingChoice?.kind === 'palimpsest') {
    return state.pendingChoice.options.map((spellId) => ({
      type: 'CHOOSE_PALIMPSEST', spellId,
    }));
  }
  if (state.pendingChoice?.kind === 'bargain') {
    return state.pendingChoice.options.map((bargainId) => ({
      type: 'CHOOSE_BARGAIN', bargainId,
    }));
  }
  if (state.pendingChoice?.kind === 'toll') {
    return [{ type: 'CHOOSE_TOLL', choice: 'pay' }, { type: 'CHOOSE_TOLL', choice: 'fight' }];
  }
  if (state.pendingChoice?.kind === 'siren') {
    return [{ type: 'CHOOSE_SIREN', choice: 'listen' }, { type: 'CHOOSE_SIREN', choice: 'rowPast' }];
  }
  if (state.phase === 'combat' && state.battle) return [{ type: 'AUTO_COMBAT' }];
  return [{ type: 'END_TURN' }];
}

export function apply(state: GameState, action: Action): GameState {
  if (action.type === 'CAMPAIGN_SETUP') throw new Error('Campaign setup is replay-header only');
  const next = cloneState(state);
  for (const player of Object.values(next.players)) syncLegacyHeroIntoRoster(player);
  next.replay.push(action);
  if (next.pendingChoice
      && ![
        'CHOOSE_CHEST', 'CHOOSE_SITE_STAT', 'CHOOSE_LEVEL', 'SKIP_LEVEL', 'REROLL_LEVEL',
        'CHOOSE_SPELL_UPGRADE',
        'CHOOSE_DIPLOMACY', 'CHOOSE_STOLEN_SPELL', 'CHOOSE_PALIMPSEST',
        'CHOOSE_BARGAIN',
        'CHOOSE_TOLL',
        'CHOOSE_SIREN',
      ].includes(action.type)) {
    throw new Error('A choice is pending');
  }
  if (action.type === 'MOVE_HERO') {
    if (action.heroId) selectHero(next, action.heroId);
    moveHero(next, action.destination);
  }
  else if (action.type === 'PICKUP_OBJECT') pickupObject(next, action.objectId);
  else if (action.type === 'SELECT_HERO') selectHero(next, action.heroId);
  else if (action.type === 'NEXT_HERO') nextHero(next);
  else if (action.type === 'END_TURN') endTurn(next);
  else if (action.type === 'BUILD') build(next, action.castleId, action.buildingId);
  else if (action.type === 'BUILD_BOAT') buildBoat(next, action.castleId);
  else if (action.type === 'RECRUIT') recruit(next, action.castleId, action.tier, action.count);
  else if (action.type === 'SWAP_ARMY') {
    swapArmy(next, action.castleId, action.heroSlot, action.garrisonSlot);
  } else if (action.type === 'CHOOSE_CHEST') chooseChest(next, action.choice);
  else if (action.type === 'CHOOSE_SITE_STAT') chooseSiteStat(next, action.choice);
  else if (action.type === 'DIG_CACHE') digCache(next, action.position);
  else if (action.type === 'BUY_MERCENARY') buyMercenary(next, action.objectId, action.rosterIndex);
  else if (action.type === 'BUY_WAGON_ITEM') buyWagonItem(next, action.objectId);
  else if (action.type === 'PAY_TITHE') payTithe(next, action.objectId);
  else if (action.type === 'RETIRE') {
    next.winner = next.activePlayer; next.phase = 'gameOver';
    next.lastMessage = `${next.players[next.activePlayer].name} retires from Manywhere.`;
  }
  else if (action.type === 'CHOOSE_LEVEL') chooseLevel(next, action.stat);
  else if (action.type === 'SKIP_LEVEL') skipLevel(next);
  else if (action.type === 'REROLL_LEVEL') rerollLevel(next);
  else if (action.type === 'CHOOSE_DIPLOMACY') chooseDiplomacy(next, action.choice);
  else if (action.type === 'CHOOSE_STOLEN_SPELL') {
    chooseStolenSpell(next, action.spellId);
  }
  else if (action.type === 'CHOOSE_SPELL_UPGRADE') chooseSpellUpgrade(next, action.spellId);
  else if (action.type === 'TRANSFER_ARMY') transferArmy(next, action);
  else if (action.type === 'SPLIT_ARMY') {
    if (next.phase !== 'adventure') throw new Error('Armies can only split during adventure');
    splitArmy(next, action);
  }
  else if (action.type === 'TRANSFER_ITEM') transferItem(next, action);
  else if (action.type === 'EQUIP_ARTIFACT') {
    equipArtifact(
      next, action.heroId, action.backpackIndex,
      action.equipmentSlot, action.chosenSchool,
    );
  }
  else if (action.type === 'UNEQUIP_ARTIFACT') {
    unequipArtifact(next, action.heroId, action.equipmentSlot);
  }
  else if (action.type === 'UNSTITCH') unstitchHero(next, action.heroId, action.destination);
  else if (action.type === 'HIRE_HERO') hireHero(next, action.castleId, action.heroId);
  else if (action.type === 'GUILD_INSCRIBE') {
    guildInscribe(next, action.castleId, action.spellId);
  }
  else if (action.type === 'PALIMPSEST_FORGET') {
    palimpsestForget(next, action.siteId, action.spellId);
  }
  else if (action.type === 'CHOOSE_PALIMPSEST') {
    choosePalimpsest(next, action.spellId);
  }
  else if (action.type === 'CHOOSE_BARGAIN') chooseBargain(next, action);
  else if (action.type === 'CAST_ADVENTURE_SPELL') {
    castAdventureSpell(next, action);
  }
  else if (action.type === 'DECLARE_RESONANCE') {
    const hero = findOwnedHero(next, next.activePlayer, action.heroId);
    if (!hero || hero.skills.attunement !== 3) {
      throw new Error('Attunement rank 3 is required');
    }
    if (hero.declaredResonance?.day === next.day
        || hero.attunementResonanceUsedDay === next.day) {
      throw new Error('A resonant battle was already declared today');
    }
    hero.declaredResonance = { day: next.day, school: action.school };
    next.lastMessage = `${action.school} resonance declared for the next battle.`;
  }
  else if (action.type === 'CHOOSE_NEXT_OMEN') {
    const hero = findOwnedHero(next, next.activePlayer, action.heroId);
    if (!hero || hero.skills.ritualist !== 3 || hero.ritualistOmenChosen) {
      throw new Error('Ritualist omen choice is unavailable');
    }
    next.nextOmen = action.omen;
    hero.ritualistOmenChosen = true;
    next.lastMessage = 'The next omen has been chosen.';
  }
  else if (action.type === 'USE_ADVENTURE_ITEM') {
    useAdventureItem(
      next, action.inventorySlot, action.target, action.targetHeroId, action.castleId,
    );
  }
  else if (action.type === 'MARKET_TRADE') {
    marketTrade(
      next, action.castleId, action.direction, action.resource, action.amount,
    );
  }
  else if (action.type === 'BUY_MARKET_SCROLL') buyMarketScroll(next, action.castleId);
  else if (action.type === 'SELL_MARKET_ITEM') {
    sellMarketItem(next, action.castleId, action.inventorySlot);
  }
  else if (action.type === 'SELL_MARKET_ARTIFACT') {
    sellMarketArtifact(next, action.castleId, action.backpackIndex);
  }
  else if (action.type === 'TUNNEL_TRAVEL') tunnelTravel(next, action.destinationCastleId);
  else if (action.type === 'RELOCATE_CASTLE') {
    relocateCastle(next, action.castleId, action.destination);
  }
  else if (action.type === 'RECRUIT_DWELLING') {
    recruitDwelling(next, action.objectId, action.count);
  }
  else if (action.type === 'BUY_TINKER_ITEM') buyTinkerItem(next, action.objectId);
  else if (action.type === 'BUY_TIMING_BLESSING') buyTimingBlessing(next, action.objectId);
  else if (action.type === 'DEPOSIT_GLOAMING_ITEM') {
    depositGloamingItem(next, action.objectId, action.inventorySlot);
  }
  else if (action.type === 'DEPOSIT_GLOAMING_ARTIFACT') {
    depositGloamingArtifact(next, action.objectId, action.backpackIndex);
  }
  else if (action.type === 'USE_CHRYSALIS') useChrysalis(next, action.objectId, action.armySlot);
  else if (action.type === 'COMPLETE_BRIDGE') completeBridge(next, action.objectId);
  else if (action.type === 'ATTEND_HEDGE_SCHOOL') attendHedgeSchool(next, action.objectId);
  else if (action.type === 'USE_RELIQUARY_CAIRN') {
    useReliquaryCairn(next, action.objectId, action.backpackIndex);
  }
  else if (action.type === 'CHOOSE_TOLL') chooseToll(next, action.choice);
  else if (action.type === 'CHOOSE_SIREN') chooseSiren(next, action.choice);
  else if (action.type === 'AUTO_COMBAT') {
    if (!next.battle) throw new Error('No battle to resolve');
    next.battle = autoResolveBattle(next.battle);
    if (next.battle.withdrawal?.kind === 'surrender') {
      const side = next.battle.withdrawal.side;
      const loserId = side === 'attacker' ? next.battle.context.attackerHeroId
        : next.battle.context.defenderHeroId;
      const winnerId = side === 'attacker' ? next.battle.context.defenderHeroId
        : next.battle.context.attackerHeroId;
      const loser = loserId ? Object.values(next.players).flatMap((player) => player.heroes)
        .find((hero) => hero.id === loserId) : undefined;
      const winner = winnerId ? Object.values(next.players).flatMap((player) => player.heroes)
        .find((hero) => hero.id === winnerId) : undefined;
      if (loser && winner) {
        next.players[loser.owner].resources.gold -= next.battle.withdrawal.cost;
        next.players[winner.owner].resources.gold += next.battle.withdrawal.cost;
      }
    }
    finalizeBattle(next);
  } else if (action.type.startsWith('BATTLE_')) {
    if (!next.battle) throw new Error('No active battle');
    if (action.type === 'BATTLE_SURRENDER') {
      const active = next.battle.stacks.find((stack) => stack.id === next.battle!.currentStackId);
      if (!active) throw new Error('No active company');
      const heroId = active.side === 'attacker'
        ? next.battle.context.attackerHeroId : next.battle.context.defenderHeroId;
      const hero = heroId ? findOwnedHero(next,
        active.side === 'attacker' ? next.activePlayer : next.battle.context.defenderPlayerId!,
        heroId) : null;
      const cost = surrenderCost(next.battle, active.side);
      if (!hero || next.players[hero.owner].resources.gold < cost) {
        throw new Error('Cannot afford surrender');
      }
      next.players[hero.owner].resources.gold -= cost;
      const opposingHeroId = active.side === 'attacker'
        ? next.battle.context.defenderHeroId : next.battle.context.attackerHeroId;
      const opposingHero = opposingHeroId ? Object.values(next.players)
        .flatMap((player) => player.heroes).find((candidate) => candidate.id === opposingHeroId)
        : undefined;
      if (opposingHero) next.players[opposingHero.owner].resources.gold += cost;
    }
    next.battle = applyBattleAction(next.battle, action);
    if (next.battle.winner) finalizeBattle(next);
  }
  syncAllHeroViews(next);
  return next;
}

export function applyAutomaticChoice(state: GameState): GameState {
  if (state.pendingChoice?.kind === 'siteStat') {
    return apply(state, { type: 'CHOOSE_SITE_STAT', choice: state.pendingChoice.options[0] });
  }
  if (state.pendingChoice?.kind === 'chest') {
    return apply(state, { type: 'CHOOSE_CHEST', choice: 'xp' });
  }
  if (state.pendingChoice?.kind === 'level') {
    const hero = findOwnedHero(
      state, state.pendingChoice.playerId, state.pendingChoice.heroId,
    )!;
    return apply(state, {
      type: 'CHOOSE_LEVEL',
      stat: bestLevelOption(hero, state.pendingChoice.options),
    });
  }
  if (state.pendingChoice?.kind === 'shrine' || state.pendingChoice?.kind === 'inscribe') {
    return apply(state, {
      type: 'CHOOSE_SPELL_UPGRADE', spellId: state.pendingChoice.options[0],
    });
  }
  if (state.pendingChoice?.kind === 'diplomacy') {
    const player = state.players[state.pendingChoice.playerId];
    const choice = state.pendingChoice.canStandAside
      && player.resources.gold >= state.pendingChoice.disbandCost
      ? 'standAside'
      : state.pendingChoice.recruitCost !== null
      && player.resources.gold >= state.pendingChoice.recruitCost
      ? 'recruit'
      : player.resources.gold >= state.pendingChoice.disbandCost ? 'disband' : 'fight';
    return apply(state, { type: 'CHOOSE_DIPLOMACY', choice });
  }
  if (state.pendingChoice?.kind === 'spellthief') {
    return apply(state, {
      type: 'CHOOSE_STOLEN_SPELL', spellId: state.pendingChoice.options[0],
    });
  }
  if (state.pendingChoice?.kind === 'palimpsest') {
    return apply(state, {
      type: 'CHOOSE_PALIMPSEST', spellId: state.pendingChoice.options[0],
    });
  }
  if (state.pendingChoice?.kind === 'bargain') {
    const bargainId = state.pendingChoice.options[0];
    const hero = findOwnedHero(
      state, state.pendingChoice.playerId, state.pendingChoice.heroId,
    );
    const enemyCastle = state.castles.find((castle) => castle.owner !== hero?.owner);
    const ownCastle = state.castles.find((castle) => castle.owner === hero?.owner);
    return apply(state, {
      type: 'CHOOSE_BARGAIN', bargainId,
      castleId: bargainId === 'cuckoosDeal' ? enemyCastle?.id : ownCastle?.id,
    });
  }
  if (state.pendingChoice?.kind === 'toll') {
    const player = state.players[state.pendingChoice.playerId];
    return apply(state, {
      type: 'CHOOSE_TOLL', choice: player.resources.gold >= state.pendingChoice.cost
        ? 'pay' : 'fight',
    });
  }
  if (state.pendingChoice?.kind === 'siren') {
    const pending = state.pendingChoice;
    const hero = findOwnedHero(
      state, pending.playerId, pending.heroId,
    );
    const guardian = state.map.objects.find((object) => object.kind === 'guardian'
      && object.protects === pending.objectId);
    const safeToListen = Boolean(hero && guardian?.kind === 'guardian'
      && armyPower(hero.army) >= armyPower(makeArmy(guardian.army)) * 1.2);
    return apply(state, {
      type: 'CHOOSE_SIREN', choice: safeToListen ? 'listen' : 'rowPast',
    });
  }
  return state;
}
