import { SPELLS } from '../../content/spells';
import type { Action, BattleHero, BattleSide, BattleState, SpellId } from '../types';
import { hasArtifactEffect, hasEquippedArtifact } from '../artifacts';
import { skillRank } from '../heroBehaviors';

export type HeroActKind = 'spell' | 'item' | 'knack' | 'artifact';
export type HeroActSource = 'base' | 'sundered-hourglass' | 'grafted-hand' | 'twicetold' | 'evoker' | 'alchemist' | 'long-oath';

export interface HeroActAvailability {
  available: boolean;
  source: HeroActSource | null;
  reason: string;
}

const heroFor = (battle: BattleState, side: BattleSide): BattleHero | null =>
  side === 'attacker' ? battle.attackerHero : battle.defenderHero;

function spellDefinition(action?: Extract<Action, { type: 'BATTLE_CAST' }>) {
  return action ? SPELLS[action.spellId] : null;
}

/**
 * One bounded source owns every hero action. `castRound` remains the stable serialized baseline;
 * printed exceptions are named credits and can never turn into an unbounded generic allowance.
 */
export function heroActAvailability(
  battle: BattleState, side: BattleSide, kind: HeroActKind,
  action?: Extract<Action, { type: 'BATTLE_CAST' }>,
): HeroActAvailability {
  const hero = heroFor(battle, side);
  if (!hero) return { available: false, source: null, reason: 'This side has no hero.' };
  if (kind === 'knack' && hero.knackEnabled === false) {
    return { available: false, source: null, reason: 'This remote commander cannot use a Knack here.' };
  }
  if (kind === 'knack' && battle.knackUseRound[side] === battle.round) {
    return { available: false, source: null, reason: 'The Knack was already used this round.' };
  }
  if (kind === 'item' && skillRank(hero, 'alchemist') >= 1 && battle.itemUses[side] === 0) {
    return { available: true, source: 'alchemist', reason: 'Alchemist waives the first item act.' };
  }
  const definition = spellDefinition(action);
  if (kind === 'spell' && definition && skillRank(hero, 'twicetold') >= 3
      && definition.tier! <= 2 && !battle.twisterActSaved[side]) {
    return { available: true, source: 'twicetold', reason: 'Twicetold grants its bounded extra act.' };
  }
  if (kind === 'spell' && definition && skillRank(hero, 'evoker') >= 3
      && definition.primitives?.includes('impact-damage') && !battle.evokerActUsed[side]) {
    return { available: true, source: 'evoker', reason: 'Evoker grants its impact-spell act.' };
  }
  if (kind === 'knack' && skillRank(hero, 'twicetold') >= 3 && !battle.twisterActSaved[side]) {
    return { available: true, source: 'twicetold', reason: 'Twicetold may be spent on the faction Knack.' };
  }
  if (battle.castRound[side] !== battle.round) {
    return { available: true, source: 'base', reason: 'The shared hero act is ready.' };
  }
  if ((kind === 'spell' || kind === 'knack') && battle.round % 2 === 0
      && battle.doubleCastUsedRound[side] !== battle.round
      && hasEquippedArtifact(hero, 'sunderedHourglass')) {
    return { available: true, source: 'sundered-hourglass', reason: 'The Sundered Hourglass grants a second hero act.' };
  }
  if (kind === 'spell' && battle.round === 1
      && battle.doubleCastUsedRound[side] !== battle.round
      && hasArtifactEffect(hero, 'round_one_double_cast')) {
    return { available: true, source: 'grafted-hand', reason: 'The artifact grants a bounded second round-one cast.' };
  }
  const oath = battle.enchantments[side].find((effect) => effect.spellId === 'theLongOath');
  if (oath && battle.p2LongOathUseRound?.[side] !== battle.round
      && kind === 'spell' && definition && definition.mana !== 'X'
      && definition.mana <= (oath.upgraded ? 9 : 5)) {
    return { available: true, source: 'long-oath', reason: 'The Long Oath grants its bounded additional spell.' };
  }
  return { available: false, source: null, reason: 'The shared hero act was already spent this round.' };
}

export function consumeHeroAct(
  battle: BattleState, side: BattleSide, availability: HeroActAvailability,
): void {
  if (!availability.available || !availability.source) throw new Error(availability.reason);
  if (availability.source === 'base') battle.castRound[side] = battle.round;
  else if (availability.source === 'sundered-hourglass' || availability.source === 'grafted-hand') {
    battle.doubleCastUsedRound[side] = battle.round;
  } else if (availability.source === 'twicetold') battle.twisterActSaved[side] = true;
  else if (availability.source === 'evoker') battle.evokerActUsed[side] = true;
  else if (availability.source === 'alchemist') battle.itemFreeActUsed[side] = true;
  else if (availability.source === 'long-oath') {
    battle.p2LongOathUseRound ??= {};
    battle.p2LongOathUseRound[side] = battle.round;
  }
}

export function canUseKnackAct(battle: BattleState, side: BattleSide): HeroActAvailability {
  return heroActAvailability(battle, side, 'knack');
}

export function canUseSpellAct(
  battle: BattleState, side: BattleSide, spellId: SpellId,
): HeroActAvailability {
  return heroActAvailability(battle, side, 'spell', { type: 'BATTLE_CAST', spellId });
}
