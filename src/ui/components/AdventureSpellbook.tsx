import { SPELLS } from '../../content/spells';
import { spellTargetSummary } from '../../content/spellPresentation';
import {
  adventureSpellManaCost, adventureSpellMoveCost, canCastAdventureSpell, isAdventureSpell,
} from '../../core/game/adventureSpells';
import { hasArtifactEffect } from '../../core/artifacts';
import type { GameState, SpellId } from '../../core/types';
import { maximumMana } from '../../core/heroBehaviors';
import { canUseTimeGatedSpell, spellUseOwner } from '../../core/game/spellUsage';
import { Spellbook, type SpellbookEntry } from './Spellbook';

interface Props {
  state: GameState;
  onClose: () => void;
  onCast: (spellId: SpellId) => void;
}

function adventureDisabledReason(state: GameState, spellId: SpellId): string | undefined {
  const hero = state.players[state.activePlayer].hero!;
  const spell = SPELLS[spellId];
  if (!isAdventureSpell(spellId)) return 'Combat-only spell. Cast it during a battle.';
  if (canCastAdventureSpell(state, spellId)) return undefined;
  if (state.magicDisabled) return 'Magic is disabled by the current scenario or effect.';
  if (state.pendingChoice) return 'Resolve the current choice first.';
  const useOwner = spellUseOwner(state, hero, spell.timeGateScope === 'player');
  if (!canUseTimeGatedSpell(useOwner, spellId, state.day, state.week)) {
    return spell.timeGate === 'once-per-week'
      ? 'Already cast by this time-gate owner this week.'
      : 'Already cast by this time-gate owner today.';
  }
  if (typeof spell.mana !== 'number') return 'This X-cost spell is not available on the adventure map.';
  if (hasArtifactEffect(hero, 'low_tier_free_casting')
      && (spell.tier ?? Number.POSITIVE_INFINITY) > 2) {
    return "The Pauper's Grimoire permits only tier 1 and tier 2 spells.";
  }
  const manaCost = adventureSpellManaCost(hero, spellId);
  if (hero.mana < manaCost) return `Requires ${manaCost} mana; ${hero.mana} remains.`;
  const moveCost = adventureSpellMoveCost(hero);
  if (hero.movement < moveCost) {
    return `Requires ${moveCost} movement; ${hero.movement} remains.`;
  }
  return 'No legal map target is available.';
}

export function adventureSpellbookEntries(state: GameState): SpellbookEntry[] {
  const hero = state.players[state.activePlayer].hero!;
  const moveCost = adventureSpellMoveCost(hero);
  return [...new Set(hero.knownSpells)].map((spellId) => {
    const spell = SPELLS[spellId];
    const adventure = isAdventureSpell(spellId);
    return {
      id: spellId,
      manaCost: spell.mana === 'X' ? 'X mana · all remaining'
        : `${adventureSpellManaCost(hero, spellId)} mana`,
      movementCost: adventure ? `${moveCost} movement` : undefined,
      disabledReason: adventureDisabledReason(state, spellId),
      targetSummary: spellTargetSummary(spellId),
      upgrade: hero.upgradedSpells.includes(spellId)
        ? { active: 'upgraded', learned: true }
        : { active: 'standard', learned: false },
    };
  });
}

export function AdventureSpellbook({ state, onClose, onCast }: Props) {
  const hero = state.players[state.activePlayer].hero!;
  const entries = adventureSpellbookEntries(state);
  return <Spellbook className="adventure-spellbook" context="Map magic" title="Adventure spellbook"
    heroName={hero.name} mana={hero.mana} maxMana={maximumMana(hero, state.players[hero.owner])}
    movement={hero.movement} debts={hero.debts}
    entries={entries} onClose={onClose} onCast={onCast} />;
}
