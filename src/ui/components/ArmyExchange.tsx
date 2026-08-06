import { useState } from 'react';
import { UNITS } from '../../content/units';
import type {
  Action, Army, ArmyHolder,
} from '../../core/types';
import { ArmySlots } from './ArmySlots';

export interface ArmyExchangeSide {
  label: string;
  holder: ArmyHolder;
  army: Army;
}

export interface ArmyTransferDraft {
  source: ArmyExchangeSide;
  sourceSlot: number;
  destination: ArmyExchangeSide;
  destinationSlot: number;
  count: number;
}

export function armyTransferDescription(draft: ArmyTransferDraft): {
  action: Action;
  mode: 'move' | 'merge' | 'swap';
  sourceAfter: string;
  destinationAfter: string;
  countLockedReason: string | null;
  sourceSlotsAfter: number;
  destinationSlotsAfter: number;
} {
  const source = draft.source.army[draft.sourceSlot];
  if (!source) throw new Error('Choose a source company');
  const destination = draft.destination.army[draft.destinationSlot];
  const different = destination && destination.unitId !== source.unitId;
  const count = different ? source.count : Math.max(1, Math.min(source.count, draft.count));
  const mode = different ? 'swap' : destination ? 'merge' : 'move';
  return {
    action: {
      type: 'TRANSFER_ARMY',
      source: draft.source.holder,
      sourceSlot: draft.sourceSlot,
      destination: draft.destination.holder,
      destinationSlot: draft.destinationSlot,
      count,
    },
    mode,
    sourceAfter: different
      ? `${destination.count} ${UNITS[destination.unitId].name}`
      : count === source.count ? 'empty' : `${source.count - count} ${UNITS[source.unitId].name}`,
    destinationAfter: different
      ? `${source.count} ${UNITS[source.unitId].name}`
      : `${(destination?.count ?? 0) + count} ${UNITS[source.unitId].name}`,
    countLockedReason: different
      ? 'Different companies can only swap as whole companies.' : null,
    sourceSlotsAfter: usedSlots(draft.source.army)
      - (!different && count === source.count ? 1 : 0),
    destinationSlotsAfter: usedSlots(draft.destination.army)
      + (!destination ? 1 : 0),
  };
}

function usedSlots(army: Army): number {
  return army.filter(Boolean).length;
}

export function ArmyExchange({
  left, right, dispatch,
}: {
  left: ArmyExchangeSide;
  right: ArmyExchangeSide;
  dispatch: (action: Action) => void;
}) {
  const [source, setSource] = useState<{ side: 'left' | 'right'; slot: number } | null>(null);
  const [destinationSlot, setDestinationSlot] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const sides = { left, right } as const;
  const sourceSide = source ? sides[source.side] : null;
  const destinationSide = source ? sides[source.side === 'left' ? 'right' : 'left'] : null;
  const stack = source && sourceSide ? sourceSide.army[source.slot] : null;
  const draft = source && sourceSide && destinationSide && destinationSlot !== null && stack
    ? { source: sourceSide, sourceSlot: source.slot, destination: destinationSide,
      destinationSlot, count } : null;
  const preview = draft ? armyTransferDescription(draft) : null;
  const destinationStack = draft?.destination.army[draft.destinationSlot] ?? null;
  const countLocked = Boolean(destinationStack && stack
    && destinationStack.unitId !== stack.unitId);

  const select = (side: 'left' | 'right', slot: number) => {
    const selectedSide = sides[side];
    if (!source || source.side === side) {
      const selectedStack = selectedSide.army[slot];
      if (!selectedStack) return;
      setSource({ side, slot });
      setDestinationSlot(null);
      setCount(selectedStack.count);
      return;
    }
    setDestinationSlot(slot);
    setCount(stack?.count ?? 1);
  };

  const renderSide = (side: 'left' | 'right', value: ArmyExchangeSide) => {
    const isSourceSide = source?.side === side;
    const isDestinationSide = source && !isSourceSide;
    return <ArmySlots army={value.army}
      title={`${value.label} · ${usedSlots(value.army)}/7 companies`}
      selected={isSourceSide ? source.slot : destinationSlot}
      onSelect={(slot) => select(side, slot)}
      slotDisabled={(slot) => !isDestinationSide && !value.army[slot]}
      slotClass={() => isDestinationSide ? 'valid-destination' : ''}
      slotTitle={(slot) => {
        const candidate = value.army[slot];
        if (isDestinationSide) return candidate
          ? `Valid destination · ${candidate.count} ${UNITS[candidate.unitId].name}. Select to preview ${candidate.unitId === stack?.unitId ? 'a merge' : 'a whole-company swap'}.`
          : 'Valid empty destination. Select to preview the result.';
        return candidate
          ? `${candidate.count} ${UNITS[candidate.unitId].name} · choose as the source company.`
          : `Empty slot ${slot + 1} cannot be a source.`;
      }}
      onSplit={(sourceSlot, splitSlot, splitCount) => dispatch({
        type: 'SPLIT_ARMY', holder: value.holder,
        sourceSlot, destinationSlot: splitSlot, count: splitCount,
      })} />;
  };

  return (
    <section className="explicit-exchange" aria-label="Company transfer">
      <p className="transfer-instruction">{
        source && sourceSide && destinationSide && stack
          ? `Source: ${sourceSide.label}, slot ${source.slot + 1} — ${stack.count} ${UNITS[stack.unitId].name}. Valid destinations are highlighted in ${destinationSide.label}.`
          : `Choose a company from either ${left.label} or ${right.label}. You will choose and confirm its destination next.`
      }</p>
      <div className="transfer-area">
        {renderSide('left', left)}
        <div className="transfer-arrow" aria-label="Transfers work in both directions">⇄</div>
        {renderSide('right', right)}
      </div>
      {draft && preview && stack && (
        <div className="modal-backdrop choice-backdrop">
          <section className="choice-dialog transfer-dialog" role="dialog" aria-modal="true"
            aria-labelledby="company-transfer-heading">
            <span className="dialog-kicker">Confirm company {preview.mode}</span>
            <h2 id="company-transfer-heading">{draft.source.label} → {draft.destination.label}</h2>
            <p>Slot {draft.sourceSlot + 1}: {stack.count} {UNITS[stack.unitId].name} → slot {draft.destinationSlot + 1}{
              destinationStack ? ` containing ${destinationStack.count} ${UNITS[destinationStack.unitId].name}` : ' (empty)'}.</p>
            <label>Exact transfer amount · {countLocked ? stack.count : count}
              <input type="number" min="1" max={stack.count}
                disabled={countLocked} value={countLocked ? stack.count : count}
                title={preview.countLockedReason ?? 'Enter an exact whole-unit amount.'}
                onChange={(event) => setCount(Math.max(1,
                  Math.min(stack.count, Number(event.target.value))))} />
            </label>
            {!countLocked && <input type="range" min="1" max={stack.count} value={count}
              aria-label="Exact transfer amount"
              onChange={(event) => setCount(Number(event.target.value))} />}
            {preview.countLockedReason && <p className="disabled-reason">{preview.countLockedReason}</p>}
            <p className="transfer-preview">
              Result · {draft.source.label} slot {draft.sourceSlot + 1}: {preview.sourceAfter}. {
                draft.destination.label} slot {draft.destinationSlot + 1}: {preview.destinationAfter}. Occupied capacity: {
                draft.source.label} {usedSlots(draft.source.army)}/7 → {preview.sourceSlotsAfter}/7; {
                draft.destination.label} {usedSlots(draft.destination.army)}/7 → {preview.destinationSlotsAfter}/7.
            </p>
            <div className="dialog-actions">
              <button onClick={() => setDestinationSlot(null)}>Cancel · move nothing</button>
              <button className="primary" onClick={() => {
                dispatch(preview.action);
                setSource(null);
                setDestinationSlot(null);
              }}>Confirm {preview.mode}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
