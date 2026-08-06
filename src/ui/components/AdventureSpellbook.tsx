import { SPELLS } from '../../content/spells';
import { spellCategory } from '../../content/spellPresentation';
import {
  adventureSpellMoveCost, canCastAdventureSpell, isAdventureSpell,
} from '../../core/game/adventureSpells';
import type { GameState, SpellId } from '../../core/types';

interface Props {
  state: GameState;
  onClose: () => void;
  onCast: (spellId: SpellId) => void;
}

export function AdventureSpellbook({ state, onClose, onCast }: Props) {
  const hero = state.players[state.activePlayer].hero!;
  const spells = hero.knownSpells.filter(isAdventureSpell);
  return (
    <div className="spellbook-backdrop" onClick={onClose}>
      <section className="spellbook adventure-spellbook" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>Map magic</span><h2>Adventure spellbook</h2></div>
          <b>{hero.mana} mana · {hero.movement} move</b>
          <button aria-label="Close spellbook" title="Close spellbook" onClick={onClose}>×</button>
        </header>
        <p className="spell-scaling">
          Each cast also costs {adventureSpellMoveCost(hero)} movement.
          Targeted spells will ask you to choose on the map.
        </p>
        <div className="spellbook-debts">
          <b>Debts · {hero.debts.length}/2</b>
          {hero.debts.map((debt) => (
            <article key={debt.id}>
              <span>{debt.name}</span><small>{debt.description}</small>
            </article>
          ))}
          {!hero.debts.length && <small>No active Debts.</small>}
        </div>
        <div className="spell-card-grid">
          {spells.map((spellId) => {
            const spell = SPELLS[spellId];
            const plus = hero.upgradedSpells.includes(spellId);
            const castable = canCastAdventureSpell(state, spellId);
            const unavailable = state.magicDisabled
              ? 'Magic is disabled by the current scenario or effect.'
              : state.pendingChoice ? 'Resolve the current choice first.'
                : typeof spell.mana === 'number' && hero.mana < spell.mana
                  ? `Requires ${spell.mana} mana; ${hero.mana} remains.`
                  : hero.movement < adventureSpellMoveCost(hero)
                    ? `Requires ${adventureSpellMoveCost(hero)} movement; ${hero.movement} remains.`
                    : 'This spell cannot be cast in the current state.';
            return (
              <article className={`spell-card ${spell.school} ${plus ? 'plus' : ''}`} key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}>
                <div><b>{spell.name}{plus ? '+' : ''}</b><em>{spell.mana} mana · {spellCategory(spellId)}</em></div>
                <p className="spell-flavor">{spell.flavor}</p>
                <p className="spell-face"><strong>Base — </strong>{spell.base}</p>
                <p className="spell-face"><strong>Upgrade — </strong>{spell.plus}</p>
                <button
                  disabled={!castable}
                  title={!castable
                    ? unavailable
                    : `Cast ${spell.name}`}
                  onClick={() => onCast(spellId)}
                >Cast</button>
                {!castable && <small className="spell-unavailable">Unavailable · {unavailable}</small>}
              </article>
            );
          })}
          {!spells.length && <p>This hero knows no adventure spells.</p>}
        </div>
      </section>
    </div>
  );
}
