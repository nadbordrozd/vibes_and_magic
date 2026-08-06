import { useEffect } from 'react';
import { ITEMS, itemName } from '../../content/items';
import { FACTION_UNITS, UNITS } from '../../content/units';
import type { GameState, Hero, ItemInstance } from '../../core/types';
import { CASTLE_NAMES } from '../../content/factionPresentation';
import { adventureItemDraft } from '../adventureItemPresentation';
import { previewAction } from '../actionPreview';
import type { ActionDraft } from './ActionConfirmationDialog';
import { ResourceCost } from './ResourceToken';

export function AdventureItemDialog({
  state, hero, inventorySlot, onDraft, onCancel,
}: {
  state: GameState;
  hero: Hero;
  inventorySlot: number;
  onDraft: (draft: ActionDraft) => void;
  onCancel: () => void;
}) {
  const item = hero.inventory[inventorySlot] as ItemInstance;
  const definition = ITEMS[item.id];
  const heroes = state.players[hero.owner].heroes.filter((candidate) => candidate.alive);
  const castles = state.castles.filter((castle) => castle.owner === hero.owner);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [onCancel]);
  return <div className="modal-backdrop choice-backdrop item-target-backdrop">
    <section className="choice-dialog item-target-dialog" role="dialog" aria-modal="true">
      <span className="dialog-kicker">Adventure consumable · target choice</span>
      <h2>{itemName(item)}</h2>
      <p>{definition.description} Nothing is consumed until the final confirmation.</p>
      <div className="choice-cards item-target-options">
        {definition.behavior === 'remoteMovement' && heroes.map((candidate) => {
          const draft = adventureItemDraft(state, hero, inventorySlot, undefined, candidate);
          const preview = previewAction(state, draft.action);
          return <button key={candidate.id} disabled={!preview.legal}
            title={!preview.legal ? preview.reason ?? 'This hero cannot receive the item.'
              : `Give 300 movement to ${candidate.name}.`}
            onClick={() => onDraft(draft)}>
            <b>{candidate.name}</b><small>{candidate.movement} movement now → {
              candidate.movement + (definition.amount ?? 0)} after use</small>
          </button>;
        })}
        {definition.behavior === 'militiaWrit' && castles.map((castle) => {
          const draft = adventureItemDraft(state, hero, inventorySlot, undefined, undefined, castle);
          const preview = previewAction(state, draft.action);
          const unit = UNITS[FACTION_UNITS[castle.faction][0]];
          const doubled = Object.fromEntries(Object.entries(unit.cost).map(
            ([resource, amount]) => [resource, (amount ?? 0) * 2 * castle.available[0]],
          ));
          return <button key={castle.id} disabled={!preview.legal}
            title={!preview.legal ? preview.reason ?? 'This castle cannot muster militia.'
              : `Send the Writ to ${castle.id}.`}
            onClick={() => onDraft(draft)}>
            <b>{CASTLE_NAMES[castle.faction]}</b>
            <small>{castle.available[0]} {unit.name} → garrison</small>
            <small>Exact cost: <ResourceCost cost={doubled} compact /></small>
            {!preview.legal && <em>Unavailable · {preview.reason}</em>}
          </button>;
        })}
      </div>
      {definition.behavior === 'militiaWrit' && castles.length === 0
        && <p className="action-preview-error">Unavailable · No owned castle can receive the Writ.</p>}
      <div className="dialog-actions"><button autoFocus onClick={onCancel}>
        Cancel · keep {itemName(item)}
      </button></div>
    </section>
  </div>;
}
