import { apply } from '../core/game';
import type {
  Action, GameState, ResourceId, Resources,
} from '../core/types';

export interface ActionPreview {
  legal: boolean;
  reason: string | null;
  feedback: string;
  cost: Partial<Resources>;
  gain: Partial<Resources>;
}

const FRIENDLY_REASONS: Record<string, string> = {
  'Cannot afford': 'Current resources do not cover the complete cost.',
  'Cannot afford recruits': 'Current resources do not cover these recruits.',
  'Cannot hire this company': 'The hero needs enough gold and a matching or empty army slot.',
  'Cannot buy this item': 'The hero needs enough gold and an empty consumable slot.',
  'Cannot buy this wagon item': 'The hero needs enough gold and an empty consumable slot.',
  'Cannot afford molting': 'Current gold does not cover this transformation.',
  'The Writ cannot be paid': 'That castle has no tier-one stock or its doubled cost cannot be paid.',
  'No army slot for the militia': 'That castle garrison has no matching or empty company slot.',
  'Hedge School is unavailable': 'This hero already attended or the player has fewer than 1,500 gold.',
  'The Tithe Barn is unavailable': 'The tithe was paid this week or current gold is insufficient.',
  'This site has no new spell offers': 'This site has no unknown spell to offer after the chosen spell is forgotten.',
  'Inventory full': 'The visiting hero has no empty consumable slot.',
  'No adjacent water tile for a boat': 'Every adjacent water tile already holds a boat.',
  'Cannot afford boat': 'Current resources do not cover 1,000 gold and 3 timber.',
};

function sentence(message: string): string {
  const friendly = FRIENDLY_REASONS[message] ?? message;
  return /[.!?]$/.test(friendly) ? friendly : `${friendly}.`;
}

/**
 * Project an action through the real reducer without mutating the supplied state. Presentation
 * therefore follows authoritative prices, artifact modifiers, visit limits, capacity, and targets.
 */
export function previewAction(state: GameState, action: Action): ActionPreview {
  const before = state.players[state.activePlayer].resources;
  try {
    const next = apply(state, action);
    const after = next.players[state.activePlayer].resources;
    const cost: Partial<Resources> = {};
    const gain: Partial<Resources> = {};
    for (const resource of Object.keys(before) as ResourceId[]) {
      const delta = after[resource] - before[resource];
      if (delta < 0) cost[resource] = -delta;
      if (delta > 0) gain[resource] = delta;
    }
    return {
      legal: true, reason: null, feedback: next.lastMessage, cost, gain,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    let cost: Partial<Resources> = {};
    try {
      const funded = structuredClone(state);
      const fundedBefore = funded.players[funded.activePlayer].resources;
      for (const resource of Object.keys(fundedBefore) as ResourceId[]) {
        fundedBefore[resource] = 1_000_000_000;
      }
      const fundedAfter = apply(funded, action).players[funded.activePlayer].resources;
      for (const resource of Object.keys(fundedBefore) as ResourceId[]) {
        const delta = fundedAfter[resource] - fundedBefore[resource];
        if (delta < 0) cost[resource] = -delta;
      }
    } catch {
      cost = {};
    }
    return {
      legal: false, reason: sentence(message), feedback: '', cost, gain: {},
    };
  }
}
