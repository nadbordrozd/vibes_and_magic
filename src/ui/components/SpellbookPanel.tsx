import { SPELLS } from '../../content/spells';
import { spellCategory } from '../../content/spellPresentation';
import { UNITS } from '../../content/units';
import {
  canCastSpell, isUpgraded,
} from '../../core/combat/spells';
import type {
  BattleSide, BattleState, CounterId, SpellId,
} from '../../core/types';
import { ContentIcon } from './ContentIcon';

interface Props {
  battle: BattleState;
  side: BattleSide;
  onClose: () => void;
  onSelect: (spellId: SpellId, effectId?: string) => void;
}

const TWISTERS = new Set<SpellId>(['amplify', 'reflect', 'sour', 'unmake', 'overgrow']);

function activeEffects(battle: BattleState): Array<{
  id: string; label: string; inspectKind: 'counter' | 'enchantment'; inspectId: string;
}> {
  const result: Array<{
    id: string; label: string; inspectKind: 'counter' | 'enchantment'; inspectId: string;
  }> = [];
  for (const stack of battle.stacks) {
    for (const counter of ['burn', 'chill', 'hex', 'bloom'] as CounterId[]) {
      if (stack.counters[counter] > 0) {
        result.push({
          id: `counter:${stack.id}:${counter}`,
          label: `${counter[0].toUpperCase()}${counter.slice(1)} ${stack.counters[counter]} · ${UNITS[stack.unitId].name} (${stack.side === 'attacker' ? 'Attacker' : 'Defender'})`,
          inspectKind: 'counter', inspectId: counter,
        });
      }
    }
    for (const effect of stack.effects) {
      result.push({
          id: `timed:${stack.id}:${effect.id}`,
          label: `${SPELLS[effect.spellId].name} · ${UNITS[stack.unitId].name} (${stack.side === 'attacker' ? 'Attacker' : 'Defender'})`,
          inspectKind: 'enchantment', inspectId: effect.spellId,
      });
    }
  }
  for (const side of ['attacker', 'defender'] as BattleSide[]) {
    for (const effect of battle.enchantments[side]) {
      result.push({
        id: `enchantment:${side}:${effect.id}`,
        label: `${SPELLS[effect.spellId].name} · ${side === 'attacker' ? 'Attacker' : 'Defender'}`,
        inspectKind: 'enchantment', inspectId: effect.spellId,
      });
    }
  }
  return result;
}

export function SpellbookPanel({
  battle, side, onClose, onSelect,
}: Props) {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero!;
  const effects = activeEffects(battle);
  const durationBonus = Math.floor(hero.spellPower / 6);
  const counterBonus = Math.floor(hero.spellPower / 5);
  const percentBonus = Math.floor(hero.spellPower / 2);
  return (
    <div className="spellbook-backdrop" onClick={onClose}>
      <section className="spellbook" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>Combat magic</span><h2>Spellbook</h2></div>
          <b>{hero.mana} mana</b>
          <button aria-label="Close spellbook" title="Close spellbook" onClick={onClose}>×</button>
        </header>
        <div className="spellbook-summary">
          <span>Spell power <b>{hero.spellPower}</b></span>
          <span>Duration <b>+{durationBonus}</b></span>
          <span>Counters <b>+{counterBonus}</b></span>
          <span>Percentages <b>+{percentBonus}</b></span>
        </div>
        <details className="spellbook-debts">
          <summary>Debts · {hero.debts.length}/2</summary>
          {hero.debts.map((debt) => (
            <article key={debt.id}>
              <span>{debt.name}</span>
              <small>{debt.description} · {
                debt.trigger.kind === 'day-start' ? `day ${debt.trigger.dueDay}`
                  : debt.trigger.kind === 'week-start' ? `week ${debt.trigger.dueWeek}`
                    : debt.trigger.kind === 'battle-complete'
                      ? `battle ${debt.trigger.dueBattle}`
                      : `level ${debt.trigger.dueLevel}`
              }</small>
            </article>
          ))}
          {hero.debts.length === 0 && <small>No active Debts.</small>}
        </details>
        <div className="spell-card-grid">
          {hero.knownSpells.map((spellId) => {
            const spell = SPELLS[spellId];
            const plus = isUpgraded(battle, hero, spellId);
            const castable = canCastSpell(battle, spellId);
            let unavailable = '';
            if (!castable) {
              if (spell.kind === 'adventure' || spell.kind === 'topology') {
                unavailable = 'Adventure-only spell. Cast it from the adventure map.';
              } else if (TWISTERS.has(spellId) && effects.length === 0) {
                unavailable = 'Requires an active counter or enchantment to target.';
              } else if (battle.castRound[side] === battle.round) {
                unavailable = 'This hero has already cast a spell this round.';
              } else if (spell.mana === 'X' && hero.mana <= 0) {
                unavailable = 'Requires at least 1 mana.';
              } else if (typeof spell.mana === 'number' && hero.mana < spell.mana) {
                unavailable = `Requires ${spell.mana} mana; ${hero.mana} remains.`;
              } else unavailable = 'No legal target is currently available.';
            }
            return (
              <article className={`spell-card ${spell.school} ${plus ? 'plus' : ''}`} key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}>
                <div className="spell-card-heading">
                  <ContentIcon kind="spell" id={spellId} />
                  <span><b>{spell.name}{plus ? '+' : ''}</b>
                    <em>{spell.mana} mana · {spellCategory(spellId)}</em></span>
                </div>
                <p className="spell-face current"><strong>{plus ? 'Current + face — ' : 'Current face — '}</strong>{plus ? spell.plus : spell.base}</p>
                {TWISTERS.has(spellId) ? (
                  <div className="effect-targets">
                    {effects.map((effect) => (
                      <button data-inspect-kind={effect.inspectKind}
                        data-inspect-id={effect.inspectId}
                        key={effect.id}
                        disabled={!castable}
                        title={!castable ? unavailable : `Target ${effect.label}`}
                        onClick={() => onSelect(spellId, effect.id)}
                      >{effect.label}</button>
                    ))}
                    {effects.length === 0 && <small>No active effects to target.</small>}
                  </div>
                ) : (
                  <button disabled={!castable}
                    title={!castable ? unavailable : `Cast ${spell.name}`}
                    onClick={() => onSelect(spellId)}>
                    Cast
                  </button>
                )}
                {!castable && <small className="spell-unavailable">Unavailable · {unavailable}</small>}
                <details className="spell-card-reference">
                  <summary>Compare faces</summary>
                  <p className="spell-flavor">{spell.flavor}</p>
                  <p className="spell-face"><strong>Base — </strong>{spell.base}</p>
                  <p className="spell-face"><strong>Upgrade — </strong>{spell.plus}</p>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
