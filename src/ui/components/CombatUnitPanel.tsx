import { UNITS } from '../../content/units';
import { ABILITY_PRESENTATION } from '../../content/abilityPresentation';
import { SPELLS } from '../../content/spells';
import type {
  Action, BattleStack, BattleState,
} from '../../core/types';
import { effectiveSpeed } from '../../core/combat/magicEffects';
import { FACTION_PASSIVES } from '../../content/factionPresentation';

interface Props {
  active: BattleStack | null;
  selected: BattleStack | null;
  battle: BattleState;
  actions: Action[];
  humanControl: boolean;
  onAttack: () => void;
}

export function CombatUnitPanel({
  active, selected, battle, actions, humanControl, onAttack,
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
      {shown && unit && (
        <>
          <div className="combat-stats detailed">
            <span>Count <b>{shown.count}</b></span>
            <span>Top HP <b>{shown.topHp}/{unit.hp}</b></span>
            <span>Damage <b>{unit.damage[0]}–{unit.damage[1]}</b></span>
            <span>Attack <b>{unit.attack} unit + {shownHero?.attack ?? 0} hero</b></span>
            <span>Defense <b>{unit.defense} unit + {shownHero?.defense ?? 0} hero</b></span>
            <span>Speed <b>{effectiveSpeed(shown)} now · {unit.speed} base</b></span>
            <span title={`At ${shown.meterThreshold ?? 100}, this company acts again after its current action.`}>
              Morale <b>{shown.morale}/{shown.meterThreshold ?? 100}</b>
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
            <span>{FACTION_PASSIVES[shownHero.faction].description}</span>
          </p>}
          <div className="ability-list counters">
            {Object.entries(shown.counters).filter(([, count]) => count > 0)
              .map(([counter, count]) => <i key={counter} data-inspect-kind="counter"
                data-inspect-id={counter}>{counter[0].toUpperCase() + counter.slice(1)} {count}</i>)}
            {shown.effects.map((effect) => (
              <i key={effect.id} data-inspect-kind="enchantment"
                data-inspect-id={effect.spellId}>{SPELLS[effect.spellId].name} · {effect.duration} turns</i>
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
