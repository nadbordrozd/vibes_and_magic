import { useEffect } from 'react';
import type { Action, GameState, ResourceId } from '../../core/types';
import { previewAction } from '../actionPreview';
import { ResourceAmount } from './ResourceToken';
import { SemanticSpellText } from './SpellGlossary';

export interface ActionDraft {
  action: Action;
  title: string;
  actor: string;
  target: string;
  effect: string;
}
export function ActionConfirmationDialog({
  state, draft, onConfirm, onCancel,
}: {
  state: GameState;
  draft: ActionDraft;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const preview = previewAction(state, draft.action);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [onCancel]);
  return <div className="modal-backdrop choice-backdrop action-confirm-backdrop">
    <section className="choice-dialog action-confirm-dialog" role="dialog" aria-modal="true"
      aria-labelledby="action-confirm-title">
      <span className="dialog-kicker">Review service action</span>
      <h2 id="action-confirm-title">{draft.title}</h2>
      <dl className="action-preview-facts">
        <div><dt>Actor</dt><dd>{draft.actor}</dd></div>
        <div><dt>Target</dt><dd>{draft.target}</dd></div>
        <div><dt>Effect</dt><dd><SemanticSpellText>{draft.effect}</SemanticSpellText></dd></div>
        <div><dt>Cost</dt><dd>{Object.keys(preview.cost).length
          ? (Object.entries(preview.cost) as Array<[ResourceId, number]>).map(
            ([resource, amount]) => <ResourceAmount key={resource}
              resource={resource} amount={amount} compact />,
          ) : 'No resources'}</dd></div>
        {Object.keys(preview.gain).length > 0 && <div><dt>Gain</dt><dd>{(
          Object.entries(preview.gain) as Array<[ResourceId, number]>
        ).map(([resource, amount]) => <ResourceAmount key={resource}
          resource={resource} amount={amount} compact />)}</dd></div>}
      </dl>
      {preview.legal
        ? <p className="action-preview-result">Expected feedback: <SemanticSpellText>{preview.feedback}</SemanticSpellText></p>
        : <p className="action-preview-error">Unavailable · <SemanticSpellText>{preview.reason ?? ''}</SemanticSpellText></p>}
      <div className="dialog-actions">
        <button autoFocus onClick={onCancel}>Cancel · change nothing</button>
        <button className="primary" disabled={!preview.legal}
          title={!preview.legal ? preview.reason ?? 'This action is unavailable.'
            : `Confirm ${draft.title}.`}
          onClick={onConfirm}>Confirm {draft.title}</button>
      </div>
    </section>
  </div>;
}
