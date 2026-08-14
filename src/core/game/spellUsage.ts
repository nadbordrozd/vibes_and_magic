import { SPELLS } from '../../content/spells';
import type { GameState, Hero, Player, SpellId, SpellUseLedger } from '../types';

export type SpellUseOwner = Pick<Hero | Player, 'spellUses'>;

export function spellUseLedger(): SpellUseLedger {
  return { daily: {}, weekly: {}, dailyCounts: {} };
}

/** Selects the serialized scope required by an adventure spell's effect. */
export function spellUseOwner(
  state: GameState, hero: Hero, playerWide: boolean,
): SpellUseOwner {
  return playerWide ? state.players[hero.owner] : hero;
}

export function canUseTimeGatedSpell(
  owner: SpellUseOwner, spellId: SpellId, day: number, week: number, dailyLimit = 1,
): boolean {
  const gate = SPELLS[spellId].timeGate;
  if (gate === 'once-per-day') {
    const entry = owner.spellUses.dailyCounts?.[spellId];
    if (!entry) return owner.spellUses.daily[spellId] !== day;
    return entry.day !== day || entry.count < dailyLimit;
  }
  if (gate === 'once-per-week') return owner.spellUses.weekly[spellId] !== week;
  return true;
}

export function recordTimeGatedSpellUse(
  owner: SpellUseOwner, spellId: SpellId, day: number, week: number,
): void {
  const gate = SPELLS[spellId].timeGate;
  if (gate === 'once-per-day') {
    owner.spellUses.daily[spellId] = day;
    owner.spellUses.dailyCounts ??= {};
    const entry = owner.spellUses.dailyCounts[spellId];
    owner.spellUses.dailyCounts[spellId] = {
      day, count: entry?.day === day ? entry.count + 1 : 1,
    };
  }
  else if (gate === 'once-per-week') owner.spellUses.weekly[spellId] = week;
}
