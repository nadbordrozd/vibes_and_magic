import { SPELLS } from '../../content/spells';
import {
  canCastSpell,
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

const TWISTERS = new Set<SpellId>(['amplify', 'reflect', 'sour', 'unmake']);

function activeEffects(battle: BattleState): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];
  for (const stack of battle.stacks) {
    for (const counter of ['burn', 'chill', 'hex', 'bloom'] as CounterId[]) {
      if (stack.counters[counter] > 0) {
        result.push({
          id: `counter:${stack.id}:${counter}`,
          label: `${counter} ${stack.counters[counter]} · ${stack.id}`,
        });
      }
    }
    for (const effect of stack.effects) {
      result.push({
        id: `timed:${stack.id}:${effect.id}`,
        label: `${SPELLS[effect.spellId].name} · ${stack.id}`,
      });
    }
  }
  for (const side of ['attacker', 'defender'] as BattleSide[]) {
    for (const effect of battle.enchantments[side]) {
      result.push({
        id: `enchantment:${side}:${effect.id}`,
        label: `${SPELLS[effect.spellId].name} · ${side}`,
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
        <div className="spell-card-grid">
          {hero.knownSpells.map((spellId) => {
            const spell = SPELLS[spellId];
            const plus = hero.upgradedSpells.includes(spellId)
              || battle.resonance === spell.school;
            const castable = canCastSpell(battle, spellId);
            return (
              <article className={`spell-card ${spell.school} ${plus ? 'plus' : ''}`} key={spellId}>
                <div>
                  <b>{spell.name}{plus ? '+' : ''}</b>
                  <em>{spell.mana} mana · {spell.school}</em>
                </div>
                <p>{plus ? spell.plus : spell.base}</p>
                {TWISTERS.has(spellId) ? (
                  <div className="effect-targets">
                    {effects.map((effect) => (
                      <button
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
