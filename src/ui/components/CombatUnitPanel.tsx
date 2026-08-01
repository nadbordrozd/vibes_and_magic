import { UNITS } from '../../content/units';
import type {
  Action, BattleStack,
} from '../../core/types';

interface Props {
  active: BattleStack | null;
  selected: BattleStack | null;
  actions: Action[];
  humanControl: boolean;
  onAttack: () => void;
}

export function CombatUnitPanel({
  active, selected, actions, humanControl, onAttack,
}: Props) {
  const shown = selected ?? active;
  const unit = shown ? UNITS[shown.unitId] : null;
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
            <span>Attack <b>{unit.attack}</b></span>
            <span>Defense <b>{unit.defense}</b></span>
            <span>Speed <b>{unit.speed}</b></span>
            <span>Morale <b>{shown.morale}</b></span>
            <span>Shots <b>{unit.abilities.includes('ranged') ? shown.shots : '—'}</b></span>
            <span>Footprint <b>{unit.hexSize} hex{unit.hexSize === 1 ? '' : 'es'}</b></span>
          </div>
          <div className="ability-list">
            {unit.abilities.length
              ? unit.abilities.map((ability) => <i key={ability}>{ability}</i>)
              : <i>no special abilities</i>}
          </div>
          <div className="ability-list counters">
            {Object.entries(shown.counters).filter(([, count]) => count > 0)
              .map(([counter, count]) => <i key={counter} data-inspect-kind="counter"
                data-inspect-id={counter}>{counter} {count}</i>)}
            {shown.effects.map((effect) => (
              <i key={effect.id} data-inspect-kind="enchantment"
                data-inspect-id={effect.spellId}>{effect.spellId} · {effect.duration} turns</i>
            ))}
          </div>
          {selected && (
            <div className={`inspection-side ${selected.side}`}>
              {selected.side} · slot {selected.slot + 1}
            </div>
          )}
          {attackAvailable && (
            <button
              className="attack-selected"
              disabled={!humanControl}
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
