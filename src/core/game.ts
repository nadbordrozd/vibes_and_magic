import { autoResolveBattle } from '../ai/combat';
import { applyBattleAction } from './combat/battle';
import { bestLevelOption } from './progression';
import type {
  Action, GameState,
} from './types';
import {
  build, firstAffordableBuilding, recruit, swapArmy,
} from './game/economy';
import { moveHero } from './game/exploration';
import {
  chooseChest, chooseLevel, finalizeBattle,
} from './game/outcomes';
import { chooseSpellUpgrade, guildInscribe } from './game/magic';
import {
  createGame, endTurn, incomeForPlayer,
} from './game/setup';

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
  if (state.phase === 'combat' && state.battle) return [{ type: 'AUTO_COMBAT' }];
  return [{ type: 'END_TURN' }];
}

export function apply(state: GameState, action: Action): GameState {
  const next = cloneState(state);
  next.replay.push(action);
  if (next.pendingChoice
      && !['CHOOSE_CHEST', 'CHOOSE_LEVEL', 'CHOOSE_SPELL_UPGRADE'].includes(action.type)) {
    throw new Error('A choice is pending');
  }
  if (action.type === 'MOVE_HERO') moveHero(next, action.destination);
  else if (action.type === 'END_TURN') endTurn(next);
  else if (action.type === 'BUILD') build(next, action.castleId, action.buildingId);
  else if (action.type === 'RECRUIT') recruit(next, action.castleId, action.tier, action.count);
  else if (action.type === 'SWAP_ARMY') {
    swapArmy(next, action.castleId, action.heroSlot, action.garrisonSlot);
  } else if (action.type === 'CHOOSE_CHEST') chooseChest(next, action.choice);
  else if (action.type === 'CHOOSE_LEVEL') chooseLevel(next, action.stat);
  else if (action.type === 'CHOOSE_SPELL_UPGRADE') chooseSpellUpgrade(next, action.spellId);
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
  return next;
}

export function applyAutomaticChoice(state: GameState): GameState {
  if (state.pendingChoice?.kind === 'chest') {
    return apply(state, { type: 'CHOOSE_CHEST', choice: 'xp' });
  }
  if (state.pendingChoice?.kind === 'level') {
    const hero = state.players[state.pendingChoice.playerId].hero!;
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
  return state;
}
