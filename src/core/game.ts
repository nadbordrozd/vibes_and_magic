import { autoResolveBattle } from '../ai/combat';
import { applyBattleAction } from './combat/battle';
import { bestLevelOption } from './progression';
import type {
  Action, GameState,
} from './types';
import {
  build, firstAffordableBuilding, recruit, swapArmy, transferArmy, transferItem,
} from './game/economy';
import { chooseDiplomacy, moveHero } from './game/exploration';
import {
  chooseChest, chooseLevel, chooseStolenSpell, finalizeBattle,
} from './game/outcomes';
import { chooseSpellUpgrade, guildInscribe } from './game/magic';
import {
  createGame, endTurn, incomeForPlayer,
} from './game/setup';
import { hireHero } from './game/tavern';
import {
  findOwnedHero, nextHero, selectHero, syncAllHeroViews, syncLegacyHeroIntoRoster,
} from './heroes';

export { createGame, firstAffordableBuilding, incomeForPlayer };

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function legalActions(state: GameState): Action[] {
  if (state.phase === 'gameOver') return [];
  if (state.pendingChoice?.kind === 'chest') {
    return [
      { type: 'CHOOSE_CHEST', choice: 'gold' },
      { type: 'CHOOSE_CHEST', choice: 'xp' },
    ];
  }
  if (state.pendingChoice?.kind === 'level') {
    return state.pendingChoice.options.map((stat) => ({ type: 'CHOOSE_LEVEL', stat }));
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
    ];
  }
  if (state.pendingChoice?.kind === 'spellthief') {
    return state.pendingChoice.options.map((spellId) => ({
      type: 'CHOOSE_STOLEN_SPELL', spellId,
    }));
  }
  if (state.phase === 'combat' && state.battle) return [{ type: 'AUTO_COMBAT' }];
  return [{ type: 'END_TURN' }];
}

export function apply(state: GameState, action: Action): GameState {
  const next = cloneState(state);
  for (const player of Object.values(next.players)) syncLegacyHeroIntoRoster(player);
  next.replay.push(action);
  if (next.pendingChoice
      && ![
        'CHOOSE_CHEST', 'CHOOSE_LEVEL', 'CHOOSE_SPELL_UPGRADE',
        'CHOOSE_DIPLOMACY', 'CHOOSE_STOLEN_SPELL',
      ].includes(action.type)) {
    throw new Error('A choice is pending');
  }
  if (action.type === 'MOVE_HERO') {
    if (action.heroId) selectHero(next, action.heroId);
    moveHero(next, action.destination);
  }
  else if (action.type === 'SELECT_HERO') selectHero(next, action.heroId);
  else if (action.type === 'NEXT_HERO') nextHero(next);
  else if (action.type === 'END_TURN') endTurn(next);
  else if (action.type === 'BUILD') build(next, action.castleId, action.buildingId);
  else if (action.type === 'RECRUIT') recruit(next, action.castleId, action.tier, action.count);
  else if (action.type === 'SWAP_ARMY') {
    swapArmy(next, action.castleId, action.heroSlot, action.garrisonSlot);
  } else if (action.type === 'CHOOSE_CHEST') chooseChest(next, action.choice);
  else if (action.type === 'CHOOSE_LEVEL') chooseLevel(next, action.stat);
  else if (action.type === 'CHOOSE_DIPLOMACY') chooseDiplomacy(next, action.choice);
  else if (action.type === 'CHOOSE_STOLEN_SPELL') {
    chooseStolenSpell(next, action.spellId);
  }
  else if (action.type === 'CHOOSE_SPELL_UPGRADE') chooseSpellUpgrade(next, action.spellId);
  else if (action.type === 'TRANSFER_ARMY') transferArmy(next, action);
  else if (action.type === 'TRANSFER_ITEM') transferItem(next, action);
  else if (action.type === 'HIRE_HERO') hireHero(next, action.castleId, action.heroId);
  else if (action.type === 'GUILD_INSCRIBE') {
    guildInscribe(next, action.castleId, action.spellId);
  }
  else if (action.type === 'AUTO_COMBAT') {
    if (!next.battle) throw new Error('No battle to resolve');
    next.battle = autoResolveBattle(next.battle);
    finalizeBattle(next);
  } else if (action.type.startsWith('BATTLE_')) {
    if (!next.battle) throw new Error('No active battle');
    next.battle = applyBattleAction(next.battle, action);
    if (next.battle.winner) finalizeBattle(next);
  }
  syncAllHeroViews(next);
  return next;
}

export function applyAutomaticChoice(state: GameState): GameState {
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
    const choice = state.pendingChoice.recruitCost !== null
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
  return state;
}
