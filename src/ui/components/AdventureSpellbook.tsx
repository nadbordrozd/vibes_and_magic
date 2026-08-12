import { SPELLS } from '../../content/spells';
import { spellTargetSummary } from '../../content/spellPresentation';
import {
  adventureSpellMoveCost, canCastAdventureSpell, isAdventureSpell,
} from '../../core/game/adventureSpells';
import type { GameState, SpellId } from '../../core/types';
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
  if (typeof spell.mana !== 'number') return 'This X-cost spell is not available on the adventure map.';
  if (hero.mana < spell.mana) return `Requires ${spell.mana} mana; ${hero.mana} remains.`;
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
      manaCost: spell.mana === 'X' ? 'X mana · all remaining' : `${spell.mana} mana`,
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
    heroName={hero.name} mana={hero.mana} maxMana={hero.knowledge * 10}
    movement={hero.movement} debts={hero.debts}
    entries={entries} onClose={onClose} onCast={onCast} />;
}
