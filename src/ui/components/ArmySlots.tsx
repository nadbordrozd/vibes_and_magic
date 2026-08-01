import { UNITS } from '../../content/units';
import type { Army } from '../../core/types';

interface Props {
  army: Army;
  title: string;
  selected?: number | null;
  onSelect?: (slot: number) => void;
  onSplit?: (sourceSlot: number, destinationSlot: number, count: number) => void;
}

export function ArmySlots({ army, title, selected, onSelect, onSplit }: Props) {
  const [splitting, setSplitting] = useState<number | null>(null);
  const source = splitting === null ? null : army[splitting];
  const [count, setCount] = useState(1);
  const emptySlot = army.findIndex((stack) => !stack);
  return (
    <div className="army-block">
      <h4>{title}</h4>
      <div className="army-slots">
        {army.map((stack, index) => (
          <span className="army-slot-wrap" key={index}>
          <button
            className={`army-slot ${selected === index ? 'selected' : ''}`}
            onClick={() => onSelect?.(index)}
            disabled={!onSelect}
            title={stack ? `${stack.count} ${UNITS[stack.unitId].name} · ${UNITS[stack.unitId].hexSize}-hex footprint` : 'Empty slot'}
            data-inspect-kind={stack ? 'unit' : undefined}
            data-inspect-id={stack?.unitId}
          >
            {stack ? (
              <>
                <span className="unit-mark">{UNITS[stack.unitId].name.slice(0, 2)}</span>
                <b>{stack.count}</b>
                {UNITS[stack.unitId].hexSize > 1 && <small>{UNITS[stack.unitId].hexSize}H</small>}
              </>
            ) : <span className="empty-mark">+</span>}
          </button>
          {onSplit && stack && stack.count > 1 && emptySlot >= 0 && (
            <button className="split-stack" title="Split this company"
              onClick={() => { setSplitting(index); setCount(Math.floor(stack.count / 2)); }}>½</button>
          )}
          </span>
        ))}
      </div>
      {source && splitting !== null && (
        <div className="modal-backdrop choice-backdrop"><section className="choice-dialog split-dialog">
          <span className="dialog-kicker">Split company</span>
          <h2>{UNITS[source.unitId].name}</h2>
          <p>Move {count} of {source.count} into empty slot {emptySlot + 1}.</p>
          <input type="range" min="1" max={source.count - 1} value={count}
            onChange={(event) => setCount(Number(event.target.value))} />
          <div className="draft-tools">
            <button onClick={() => setCount(Math.floor(source.count / 2))}>Split evenly</button>
            <button onClick={() => { onSplit?.(splitting, emptySlot, count); setSplitting(null); }}>Confirm</button>
            <button onClick={() => setSplitting(null)}>Cancel</button>
          </div>
        </section></div>
      )}
    </div>
  );
}
import { useState } from 'react';
