import { useState } from 'react';
import type {
  Action, Hero,
} from '../../core/types';
import { ArmySlots } from './ArmySlots';
import { itemName } from '../../content/items';

interface Props {
  source: Hero;
  destination: Hero;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

export function ExchangeScreen({
  source, destination, dispatch, onClose,
}: Props) {
  const [sourceSlot, setSourceSlot] = useState<number | null>(null);
  const [itemSlot, setItemSlot] = useState<number | null>(null);
  const transfer = (destinationSlot: number) => {
    if (sourceSlot === null) return;
    const stack = source.army[sourceSlot];
    if (!stack) return;
    dispatch({
      type: 'TRANSFER_ARMY',
      source: { kind: 'hero', id: source.id }, sourceSlot,
      destination: { kind: 'hero', id: destination.id }, destinationSlot,
      count: stack.count,
    });
    setSourceSlot(null);
  };
  return (
    <div className="modal-backdrop">
      <section className="exchange-screen">
        <header>
          <div>
            <span>Adjacent companies</span>
            <h2>Exchange</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </header>
        <p>Select a stack, then its destination. Matching stacks merge.</p>
        <div className="transfer-area">
          <ArmySlots
            army={source.army} title={source.name}
            selected={sourceSlot} onSelect={setSourceSlot}
          />
          <div className="transfer-arrow">⇄</div>
          <ArmySlots
            army={destination.army} title={destination.name}
            onSelect={transfer}
          />
        </div>
        <div className="item-exchange">
          <h3>Consumable items</h3>
          <div className="army-slots">
            {source.inventory.map((item, index) => (
              <button
                key={`source-item-${index}`}
                className={`army-slot ${itemSlot === index ? 'selected' : ''}`}
                onClick={() => setItemSlot(index)}
              >{item ? itemName(item) : '+'}</button>
            ))}
            <span className="transfer-arrow">⇄</span>
            {destination.inventory.map((item, index) => (
              <button
                key={`destination-item-${index}`}
                className="army-slot"
                disabled={itemSlot === null}
                onClick={() => {
                  if (itemSlot === null) return;
                  dispatch({
                    type: 'TRANSFER_ITEM',
                    sourceHeroId: source.id, destinationHeroId: destination.id,
                    sourceSlot: itemSlot, destinationSlot: index,
                  });
                  setItemSlot(null);
                }}
              >{item ? itemName(item) : '+'}</button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
