import { UNITS } from '../../content/units';
import { ABILITY_PRESENTATION } from '../../content/abilityPresentation';
import { SPELLS } from '../../content/spells';
import type {
  Action, BattleStack, BattleState,
} from '../../core/types';
import { effectiveSpeed } from '../../core/combat/magicEffects';
import { FACTION_PASSIVES } from '../../content/factionPresentation';
import {
  formatFootprint, type AttackPrediction,
} from '../attackPrediction';
import { ContentIcon } from './ContentIcon';
import { SemanticSpellText, SpellGlossaryReference } from './SpellGlossary';
import type { SpellLexiconId } from '../../content/spellLexicon';

interface Props {
  active: BattleStack | null;
  selected: BattleStack | null;
  battle: BattleState;
  actions: Action[];
  humanControl: boolean;
  onAttack: () => void;
  attackPrediction: AttackPrediction | null;
}

export function CombatUnitPanel({
  active, selected, battle, actions, humanControl, onAttack, attackPrediction,
}: Props) {
  const shown = selected ?? active;
  const unit = shown ? UNITS[shown.unitId] : null;
  const shownHero = shown?.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const attackAvailable = Boolean(
    selected && active && selected.side !== active.side
    && actions.some((action) =>
      (action.type === 'BATTLE_ATTACK' || action.type === 'BATTLE_MOVE_ATTACK')
      && action.targetId === selected.id),
  );
  return (
    <div className="active-unit" data-inspect-kind={unit ? 'unit' : undefined}
      data-inspect-id={unit?.id}>
      <span>{selected ? 'Inspected unit' : 'Active stack'}</span>
      <h3>{unit?.name ?? 'Resolving'}</h3>
      {attackPrediction && (
        <section className="attack-prediction" role="status" aria-live="polite"
          data-attack-mode={attackPrediction.mode.toLowerCase()}
          data-attack-target={attackPrediction.targetId}>
          <span>Visible attack prediction</span>
          <h4>{attackPrediction.mode} strike · {UNITS[
            battle.stacks.find((stack) => stack.id === attackPrediction.targetId)!.unitId
          ].name}</h4>
          <div className="prediction-ranges">
            <b>Damage <strong>{attackPrediction.damageRange[0]}–{attackPrediction.damageRange[1]}</strong></b>
            <b>Casualties <strong>{attackPrediction.casualtyRange[0]}–{attackPrediction.casualtyRange[1]}</strong></b>
          </div>
          <ul>
            <li><b>Ranged / range</b>{attackPrediction.rangeModifier}</li>
            <li><b>Adjacency</b>{attackPrediction.adjacencyModifier}</li>
            <li><b>Walls</b>{attackPrediction.wallModifier}</li>
            <li><b>Retaliation</b>{attackPrediction.retaliation}</li>
            <li><b>Origin / direction</b>({attackPrediction.origin.x},{attackPrediction.origin.y}) · {attackPrediction.direction}</li>
            <li><b>Origin footprint</b>{formatFootprint(attackPrediction.originFootprint)}</li>
            <li><b>Target footprint</b>{formatFootprint(attackPrediction.targetFootprint)}</li>
          </ul>
          <small>Deterministic combat has one exact outcome, so each range has identical bounds.</small>
        </section>
      )}
      {shown && unit && (
        <>
          <div className="combat-stats detailed">
            <span>Count <b>{shown.count}</b></span>
            <span>Top HP <b>{shown.topHp}/{unit.hp}</b></span>
            <span>Damage <b>{unit.damage[0]}–{unit.damage[1]}</b></span>
            <span>Attack <b>{unit.attack} unit + {shownHero?.attack ?? 0} hero</b></span>
            <span>Defense <b>{unit.defense} unit + {shownHero?.defense ?? 0} hero</b></span>
            <span>Speed <b>{effectiveSpeed(shown)} now · {unit.speed} base</b></span>
            <span>
              <SpellGlossaryReference termId="morale" /> <b>{shown.morale}/{shown.meterThreshold ?? 100}</b>
            </span>
            <span>Shots <b>{unit.abilities.includes('ranged') ? shown.shots : '—'}</b></span>
            <span>Footprint <b>{unit.hexSize} hex{unit.hexSize === 1 ? '' : 'es'}</b></span>
          </div>
          <div className="ability-list">
            {unit.abilities.length
              ? unit.abilities.map((ability) => <i key={ability}
                data-inspect-kind="ability" data-inspect-id={ability}
                title={ABILITY_PRESENTATION[ability].description}>
                {ABILITY_PRESENTATION[ability].name}
              </i>)
              : <i>no special abilities</i>}
          </div>
          {shownHero && <p className="combat-faction-rule">
            <b>{FACTION_PASSIVES[shownHero.faction].name}</b>
            <span><SemanticSpellText>{FACTION_PASSIVES[shownHero.faction].description}</SemanticSpellText></span>
          </p>}
          <div className="ability-list counters">
            {Object.entries(shown.counters).filter(([, count]) => count > 0)
              .map(([counter, count]) => <i key={counter} data-inspect-kind="counter"
                data-inspect-id={counter}><SpellGlossaryReference
                  termId={counter as SpellLexiconId}
                  label={`${counter[0].toUpperCase() + counter.slice(1)} ${count}`} /></i>)}
            {shown.effects.map((effect) => (
              <i key={effect.id} data-inspect-kind="enchantment"
                data-inspect-id={effect.spellId}><ContentIcon kind="spell"
                  id={effect.spellId} /><SemanticSpellText>{`${SPELLS[effect.spellId].name} · ${effect.duration} turns`}</SemanticSpellText></i>
            ))}
          </div>
          {selected && (
            <div className={`inspection-side ${selected.side}`}>
              {selected.side === 'attacker' ? 'Attacker' : 'Defender'} · formation slot {selected.slot + 1}
            </div>
          )}
          {attackAvailable && (
            <button
              className="attack-selected"
              disabled={!humanControl}
              title={!humanControl ? 'Wait for a human-controlled company to act.' : 'Attack this company now.'}
              onClick={onAttack}
            >
              Attack selected unit
            </button>
          )}
        </>
      )}
    </div>
  );
}
