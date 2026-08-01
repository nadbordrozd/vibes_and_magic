import { SPELLS } from '../../content/spells';
import {
  canCastSpell, isUpgraded,
} from '../../core/combat/spells';
import type {
  BattleSide, BattleState, CounterId, SpellId,
} from '../../core/types';

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
          label: `${counter} ${stack.counters[counter]} · ${stack.id}`,
          inspectKind: 'counter', inspectId: counter,
        });
      }
    }
    for (const effect of stack.effects) {
      result.push({
          id: `timed:${stack.id}:${effect.id}`,
          label: `${SPELLS[effect.spellId].name} · ${stack.id}`,
          inspectKind: 'enchantment', inspectId: effect.spellId,
      });
    }
  }
  for (const side of ['attacker', 'defender'] as BattleSide[]) {
    for (const effect of battle.enchantments[side]) {
      result.push({
        id: `enchantment:${side}:${effect.id}`,
        label: `${SPELLS[effect.spellId].name} · ${side}`,
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
          <button onClick={onClose}>×</button>
        </header>
        <p className="spell-scaling">
          SP {hero.spellPower}: duration +{durationBonus}, counters +{counterBonus},
          percentages +{percentBonus}.
        </p>
        <div className="spellbook-debts">
          <b>Debts · {hero.debts.length}/2</b>
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
        </div>
        <div className="spell-card-grid">
          {hero.knownSpells.map((spellId) => {
            const spell = SPELLS[spellId];
            const plus = isUpgraded(battle, hero, spellId);
            const castable = canCastSpell(battle, spellId);
            return (
              <article className={`spell-card ${spell.school} ${plus ? 'plus' : ''}`} key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}>
                <div>
                  <b>{spell.name}{plus ? '+' : ''}</b>
                  <em>{spell.mana} mana · {spell.school}</em>
                </div>
                <p>{plus ? spell.plus : spell.base}</p>
                {TWISTERS.has(spellId) ? (
                  <div className="effect-targets">
                    {effects.map((effect) => (
                      <button data-inspect-kind={effect.inspectKind}
                        data-inspect-id={effect.inspectId}
                        key={effect.id}
                        disabled={!castable}
                        onClick={() => onSelect(spellId, effect.id)}
                      >{effect.label}</button>
                    ))}
                    {effects.length === 0 && <small>No active effects to target.</small>}
                  </div>
                ) : (
                  <button disabled={!castable} onClick={() => onSelect(spellId)}>
                    Cast
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
