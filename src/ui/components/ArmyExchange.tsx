import { useEffect, useState, type ReactNode } from 'react';
import { UNITS } from '../../content/units';
import type {
  Action, Army, ArmyHolder, GameState,
} from '../../core/types';
import { previewAction } from '../actionPreview';
import { ArmySlots } from './ArmySlots';

export interface ArmyExchangeSide {
  label: string;
  holder: ArmyHolder;
  army: Army;
  identity?: ReactNode;
  kindLabel?: string;
}

export interface ArmyTransferDraft {
  source: ArmyExchangeSide;
  sourceSlot: number;
  destination: ArmyExchangeSide;
  destinationSlot: number;
  count: number;
}

export interface ArmyTransferProjection extends ReturnType<typeof armyTransferDescription> {
  legal: boolean;
  reason: string | null;
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

/** Project the exact slot action through the authoritative reducer without mutating UI state. */
export function projectArmyTransfer(
  state: GameState, draft: ArmyTransferDraft,
): ArmyTransferProjection {
  const source = draft.source.army[draft.sourceSlot];
  if (!source) throw new Error('Choose a source company');
  const destination = draft.destination.army[draft.destinationSlot];
  const count = Math.max(1, Math.min(source.count, draft.count));
  const different = Boolean(destination && destination.unitId !== source.unitId);
  const mode = different ? 'swap' : destination ? 'merge' : 'move';
  const action: Action = {
    type: 'TRANSFER_ARMY', source: draft.source.holder, sourceSlot: draft.sourceSlot,
    destination: draft.destination.holder, destinationSlot: draft.destinationSlot, count,
  };
  const projection = previewAction(state, action);
  return {
    action,
    mode,
    sourceAfter: different && destination
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
    legal: projection.legal,
    reason: projection.reason,
  };
}

function usedSlots(army: Army): number {
  return army.filter(Boolean).length;
}

export function splitEvenlyCount(count: number): number {
  return Math.max(1, Math.floor(count / 2));
}

interface ArmyExchangeProps {
  left: ArmyExchangeSide;
  right: ArmyExchangeSide;
  dispatch: (action: Action) => void;
  state?: GameState;
  direct?: boolean;
}

export function ArmyExchange(props: ArmyExchangeProps) {
  if (props.direct) {
    if (!props.state) throw new Error('Direct army exchange requires game state');
    return <DirectArmyExchange {...props} state={props.state} />;
  }
  return <ConfirmedArmyExchange {...props} />;
}

function DirectArmyExchange({
  left, right, dispatch, state,
}: ArmyExchangeProps & { state: GameState }) {
  const [source, setSource] = useState<{ side: 'left' | 'right'; slot: number } | null>(null);
  const [partial, setPartial] = useState(false);
  const [count, setCount] = useState(1);
  const [reason, setReason] = useState<string | null>(null);
  const sides = { left, right } as const;
  const sourceSide = source ? sides[source.side] : null;
  const destinationSide = source ? sides[source.side === 'left' ? 'right' : 'left'] : null;
  const stack = source && sourceSide ? sourceSide.army[source.slot] : null;

  const cancel = () => {
    setSource(null);
    setPartial(false);
    setReason(null);
  };

  useEffect(() => {
    if (!source) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [source]);

  const projectionFor = (slot: number): ArmyTransferProjection | null => {
    if (!source || !sourceSide || !destinationSide || !stack) return null;
    return projectArmyTransfer(state, {
      source: sourceSide, sourceSlot: source.slot, destination: destinationSide,
      destinationSlot: slot, count: partial ? count : stack.count,
    });
  };

  const select = (side: 'left' | 'right', slot: number) => {
    const selectedSide = sides[side];
    if (!source || source.side === side) {
      const selectedStack = selectedSide.army[slot];
      if (!selectedStack) return;
      setSource({ side, slot });
      setPartial(false);
      setCount(splitEvenlyCount(selectedStack.count));
      setReason(null);
      return;
    }
    const projection = projectionFor(slot);
    if (!projection) return;
    if (!projection.legal) {
      setReason(projection.reason ?? 'That destination is not legal.');
      return;
    }
    dispatch(projection.action);
    cancel();
  };

  const renderSide = (side: 'left' | 'right', value: ArmyExchangeSide) => {
    const isSourceSide = source?.side === side;
    const isDestinationSide = Boolean(source && !isSourceSide);
    return <div className={`direct-transfer-side ${isSourceSide ? 'source-side' : ''}`}>
      <div className="transfer-identity">
        {value.identity}
        <span><small>{value.kindLabel ?? 'Army'}</small><strong>{value.label}</strong></span>
        <b>{usedSlots(value.army)}/{value.army.length}</b>
      </div>
      <ArmySlots army={value.army}
        title={`${value.label} companies`}
        selected={isSourceSide ? source.slot : null}
        onSelect={(slot) => select(side, slot)}
        slotDisabled={(slot) => !isDestinationSide && !value.army[slot]}
        slotAriaDisabled={(slot) => Boolean(isDestinationSide && !projectionFor(slot)?.legal)}
        slotClass={(slot) => {
          if (!isDestinationSide) return '';
          const projection = projectionFor(slot);
          return projection?.legal
            ? `valid-destination target-${projection.mode}` : 'invalid-destination';
        }}
        slotTitle={(slot) => {
          const candidate = value.army[slot];
          if (isDestinationSide) {
            const projection = projectionFor(slot);
            if (!projection) return 'Choose a source company first.';
            if (!projection.legal) return `Not legal · ${projection.reason}`;
            return `${projection.mode[0].toUpperCase()}${projection.mode.slice(1)} here · result: ${
              projection.sourceAfter} at source; ${projection.destinationAfter} here. Activate to transfer now.`;
          }
          return candidate
            ? `${candidate.count} ${UNITS[candidate.unitId].name} · choose as the source company.`
            : `Empty slot ${slot + 1} cannot be a source.`;
        }}
        onSplit={(sourceSlot, destinationSlot, splitCount) => dispatch({
          type: 'SPLIT_ARMY', holder: value.holder,
          sourceSlot, destinationSlot, count: splitCount,
        })} />
    </div>;
  };

  return (
    <section className="explicit-exchange direct-exchange" aria-label="Visiting hero and city company transfer">
      <div className="transfer-area">
        {renderSide('left', left)}
        <div className="transfer-arrow" aria-label="Transfers work in both directions">⇄</div>
        {renderSide('right', right)}
      </div>
      <div className="direct-transfer-controls" aria-live="polite">
        {source && sourceSide && destinationSide && stack ? (
          <>
            <p><b>{stack.count} {UNITS[stack.unitId].name}</b> selected from {sourceSide.label}.
              Choose a highlighted {destinationSide.label} slot to {
                partial ? `transfer exactly ${count}` : 'move, merge, or swap the full company'}.</p>
            <div className="direct-transfer-actions">
              {stack.count > 1 && <button className={partial ? 'selected' : ''}
                aria-pressed={partial}
                onClick={() => {
                  setPartial((value) => !value);
                  setCount(splitEvenlyCount(stack.count));
                  setReason(null);
                }}>Partial…</button>}
              {partial && <>
                <label>Exact amount
                  <input type="number" min="1" max={stack.count - 1} value={count}
                    onChange={(event) => {
                      setCount(Math.max(1, Math.min(stack.count - 1, Number(event.target.value))));
                      setReason(null);
                    }} />
                </label>
                <input type="range" aria-label="Exact partial transfer amount"
                  min="1" max={stack.count - 1} value={count}
                  onChange={(event) => {
                    setCount(Number(event.target.value)); setReason(null);
                  }} />
                <button onClick={() => {
                  setCount(splitEvenlyCount(stack.count)); setReason(null);
                }}>Split evenly</button>
              </>}
              <button onClick={cancel}>Cancel <kbd>Esc</kbd></button>
            </div>
            {reason && <p className="disabled-reason" role="alert">Not legal · {reason}</p>}
          </>
        ) : (
          <p>Select a company, then its destination. Full companies transfer immediately;
            use <b>Partial…</b> only when an exact count is needed.</p>
        )}
      </div>
      <div className="transfer-legend" aria-label="Transfer target legend">
        <span className="move">Empty · move</span><span className="merge">Same · merge</span>
        <span className="swap">Different · swap whole</span>
      </div>
    </section>
  );
}

function ConfirmedArmyExchange({
  left, right, dispatch,
}: ArmyExchangeProps) {
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
      title={`${value.label} · ${usedSlots(value.army)}/${value.army.length} companies`}
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
                draft.source.label} {usedSlots(draft.source.army)}/{draft.source.army.length} → {
                preview.sourceSlotsAfter}/{draft.source.army.length}; {draft.destination.label} {
                usedSlots(draft.destination.army)}/{draft.destination.army.length} → {
                preview.destinationSlotsAfter}/{draft.destination.army.length}.
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
