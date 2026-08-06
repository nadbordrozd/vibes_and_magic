import { useState } from 'react';
import { UNITS } from '../../content/units';
import type { Army } from '../../core/types';
import { UnitPortrait } from '../assets';

interface Props {
  army: Army;
  title: string;
  selected?: number | null;
  onSelect?: (slot: number) => void;
  onSplit?: (sourceSlot: number, destinationSlot: number, count: number) => void;
  slotClass?: (slot: number) => string;
  slotDisabled?: (slot: number) => boolean;
  slotTitle?: (slot: number) => string | undefined;
}

export function ArmySlots({
  army, title, selected, onSelect, onSplit, slotClass, slotDisabled, slotTitle,
}: Props) {
  const [splitting, setSplitting] = useState<number | null>(null);
  const source = splitting === null ? null : army[splitting];
  const [count, setCount] = useState(1);
  const [splitDestination, setSplitDestination] = useState<number | null>(null);
  const emptySlots = army.flatMap((stack, index) => stack ? [] : [index]);
  return (
    <div className="army-block">
      <h4>{title}</h4>
      <div className="army-slots">
        {army.map((stack, index) => (
          <span className="army-slot-wrap" key={index}>
          <button
            className={`army-slot ${selected === index ? 'selected' : ''} ${slotClass?.(index) ?? ''}`}
            onClick={() => onSelect?.(index)}
            disabled={!onSelect || slotDisabled?.(index)}
            title={slotTitle?.(index) ?? `${stack ? `${stack.count} ${UNITS[stack.unitId].name} · ${UNITS[stack.unitId].hexSize}-hex footprint` : 'Empty slot'}${!onSelect ? ' · view only here' : ''}`}
            data-inspect-kind={stack ? 'unit' : undefined}
            data-inspect-id={stack?.unitId}
          >
            {stack ? (
              <>
                <UnitPortrait unitId={stack.unitId} />
                <b>{stack.count}</b>
                {UNITS[stack.unitId].hexSize > 1 && <small>{UNITS[stack.unitId].hexSize}H</small>}
              </>
            ) : <span className="empty-mark">+</span>}
          </button>
          {onSplit && stack && stack.count > 1 && emptySlots.length > 0 && (
            <button className="split-stack" title="Split this company"
              onClick={() => {
                setSplitting(index);
                setSplitDestination(null);
                setCount(Math.floor(stack.count / 2));
              }}>½</button>
          )}
          </span>
        ))}
      </div>
      {source && splitting !== null && (
        <div className="modal-backdrop choice-backdrop"><section className="choice-dialog split-dialog">
          <span className="dialog-kicker">Split company</span>
          <h2>{UNITS[source.unitId].name}</h2>
          <p>Choose the exact empty destination and amount. Nothing moves until you confirm.</p>
          <div className="split-destinations" role="group" aria-label="Empty destination slots">
            {emptySlots.map((slot) => (
              <button key={slot} className={splitDestination === slot ? 'selected' : ''}
                onClick={() => setSplitDestination(slot)}>Empty slot {slot + 1}</button>
            ))}
          </div>
          <label>Amount · {count} of {source.count}
            <input type="number" min="1" max={source.count - 1} value={count}
              onChange={(event) => setCount(Math.max(1,
                Math.min(source.count - 1, Number(event.target.value))))} />
          </label>
          <input type="range" min="1" max={source.count - 1} value={count}
            onChange={(event) => setCount(Number(event.target.value))} />
          <p className="transfer-preview">Result · source slot {splitting + 1}: {
            source.count - count}; {splitDestination === null
            ? 'choose an empty destination' : `slot ${splitDestination + 1}: ${count}`}.</p>
          <div className="draft-tools">
            <button onClick={() => setCount(Math.floor(source.count / 2))}>Split evenly</button>
            <button className="primary" disabled={splitDestination === null}
              title={splitDestination === null ? 'Choose an empty destination slot.' : 'Confirm this split.'}
              onClick={() => {
                if (splitDestination === null) return;
                onSplit?.(splitting, splitDestination, count);
                setSplitting(null);
              }}>Confirm split</button>
            <button onClick={() => setSplitting(null)}>Cancel</button>
          </div>
        </section></div>
      )}
    </div>
  );
}
