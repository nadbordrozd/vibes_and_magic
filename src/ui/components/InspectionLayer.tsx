import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../core/types';
import { inspectTarget, type InspectionKind, type InspectionTarget } from '../inspection';

function targetFrom(element: EventTarget | null): InspectionTarget | null {
  if (!(element instanceof Element)) return null;
  const node = element.closest<HTMLElement>('[data-inspect-kind][data-inspect-id]');
  if (!node) return null;
  return { kind: node.dataset.inspectKind as InspectionKind, id: node.dataset.inspectId! };
}

export function InspectionLayer({ state }: { state: GameState }) {
  const [inspectMode, setInspectMode] = useState(false);
  const [target, setTarget] = useState<InspectionTarget | null>(null);
  const [label, setLabel] = useState<{ target: InspectionTarget; x: number; y: number } | null>(null);
  const hold = useRef<number | null>(null);

  useEffect(() => {
    const open = (next: InspectionTarget) => {
      if (next.kind === 'building') {
        const [id] = next.id.split('@');
        window.dispatchEvent(new CustomEvent('castle-building-inspect', { detail: { id } }));
        setTarget(null);
      } else setTarget(next);
    };
    const hover = (event: MouseEvent) => {
      const next = targetFrom(event.target);
      setLabel(next ? { target: next, x: event.clientX, y: event.clientY } : null);
    };
    const context = (event: MouseEvent) => {
      const next = targetFrom(event.target); if (!next) return;
      event.preventDefault();
      if (next.kind === 'terrain' || next.kind === 'battleTile' || next.kind === 'decoration') {
        setLabel({ target: next, x: event.clientX, y: event.clientY });
      } else open(next);
    };
    const click = (event: MouseEvent) => {
      if (!inspectMode) return;
      const next = targetFrom(event.target); if (!next) return;
      event.preventDefault(); event.stopPropagation();
      if (next.kind === 'terrain' || next.kind === 'battleTile' || next.kind === 'decoration') {
        setLabel({ target: next, x: event.clientX, y: event.clientY });
      } else open(next);
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      const next = targetFrom(event.target); if (!next) return;
      hold.current = window.setTimeout(() => {
        if (next.kind === 'terrain' || next.kind === 'battleTile' || next.kind === 'decoration') {
          setLabel({ target: next, x: event.clientX, y: event.clientY });
        } else open(next);
        hold.current = null;
      }, 550);
    };
    const up = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      if (hold.current !== null) {
        window.clearTimeout(hold.current); hold.current = null;
        const next = targetFrom(event.target);
        if (next) setLabel({ target: next, x: event.clientX, y: event.clientY });
      }
    };
    document.addEventListener('mousemove', hover);
    document.addEventListener('contextmenu', context);
    document.addEventListener('click', click, true);
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    return () => {
      document.removeEventListener('mousemove', hover);
      document.removeEventListener('contextmenu', context);
      document.removeEventListener('click', click, true);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (hold.current !== null) window.clearTimeout(hold.current);
    };
  }, [inspectMode]);

  const card = target ? inspectTarget(state, target) : null;
  const hoverCard = label ? inspectTarget(state, label.target) : null;
  useEffect(() => { if (target && !card) setTarget(null); }, [card, target]);

  return (
    <>
      <button
        type="button" className={`inspect-toggle ${inspectMode ? 'active' : ''}`}
        aria-pressed={inspectMode} onClick={() => setInspectMode((current) => !current)}
      >Inspect</button>
      {hoverCard && !target && (
        <div className="inspect-label" style={{ left: label!.x + 12, top: label!.y + 12 }}>
          <b>{hoverCard.name}</b>{hoverCard.terrain && <span>{hoverCard.flavor}</span>}
        </div>
      )}
      {card && !card.terrain && (
        <div className="inspection-backdrop" onClick={() => setTarget(null)}>
          <article className="inspection-card" role="dialog" aria-label={`Inspect ${card.name}`} onClick={(event) => event.stopPropagation()}>
            <button className="inspection-close" onClick={() => setTarget(null)}>×</button>
            <h2>{card.name}</h2>
            <p className="inspection-flavor">{card.flavor}</p>
            {target?.kind === 'object' && <small className={`journal-state ${card.learned ? 'learned' : ''}`}>{card.learned ? 'Learned' : 'Undiscovered'}</small>}
            {card.mechanics.length > 0 && <section className="inspection-mechanics"><h3>Mechanics</h3>{card.mechanics.map((line) => <p key={line}>{line}</p>)}</section>}
          </article>
        </div>
      )}
    </>
  );
}
