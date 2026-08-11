import { useState } from 'react';
import { itemName } from '../../content/items';
import type {
  Action, Hero,
} from '../../core/types';
import { ArmyExchange } from './ArmyExchange';
import { ItemSprite } from '../assets';

interface Props {
  source: Hero;
  destination: Hero;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

interface ItemSource {
  side: 'left' | 'right';
  slot: number;
}

export function itemTransferAction(
  left: Hero, right: Hero, source: ItemSource, destinationSlot: number,
): Extract<Action, { type: 'TRANSFER_ITEM' }> {
  const sourceHero = source.side === 'left' ? left : right;
  const destinationHero = source.side === 'left' ? right : left;
  return {
    type: 'TRANSFER_ITEM',
    sourceHeroId: sourceHero.id,
    destinationHeroId: destinationHero.id,
    sourceSlot: source.slot,
    destinationSlot,
  };
}

export function ExchangeScreen({
  source: left, destination: right, dispatch, onClose,
}: Props) {
  const [itemSource, setItemSource] = useState<ItemSource | null>(null);
  const [itemDestination, setItemDestination] = useState<number | null>(null);
  const sourceHero = itemSource?.side === 'left' ? left : itemSource ? right : null;
  const destinationHero = itemSource?.side === 'left' ? right : itemSource ? left : null;
  const selectedItem = itemSource && sourceHero ? sourceHero.inventory[itemSource.slot] : null;
  const destinationItem = itemDestination !== null && destinationHero
    ? destinationHero.inventory[itemDestination] : null;

  const selectItem = (side: 'left' | 'right', slot: number) => {
    const hero = side === 'left' ? left : right;
    if (!itemSource || itemSource.side === side) {
      if (!hero.inventory[slot]) return;
      setItemSource({ side, slot });
      setItemDestination(null);
      return;
    }
    setItemDestination(slot);
  };

  const renderInventory = (side: 'left' | 'right', hero: Hero) => {
    const isSourceSide = itemSource?.side === side;
    const isDestinationSide = itemSource && !isSourceSide;
    return <div className="item-transfer-side">
      <h4>{hero.name} · {hero.inventory.filter(Boolean).length}/{hero.inventory.length} items</h4>
      <div className="army-slots">
        {hero.inventory.map((item, index) => (
          <button key={`${side}-item-${index}`}
            className={`army-slot ${isSourceSide && itemSource.slot === index ? 'selected' : ''} ${isDestinationSide ? 'valid-destination' : ''}`}
            disabled={!isDestinationSide && !item}
            aria-pressed={isSourceSide && itemSource.slot === index}
            title={isDestinationSide
              ? `${item ? `Occupied by ${itemName(item)}; items will swap` : 'Empty'} · valid destination slot ${index + 1}.`
              : item ? `${itemName(item)} · choose as the source item.`
                : `Empty slot ${index + 1} cannot be a source.`}
            data-inspect-kind={item && typeof item !== 'string' ? 'item' : undefined}
            data-inspect-id={item && typeof item !== 'string' ? item.id : undefined}
            onClick={() => selectItem(side, index)}
          >{item && typeof item !== 'string' && <ItemSprite item={item} />}
            {item ? <span>{itemName(item)}</span> : <span className="empty-mark">+</span>}</button>
        ))}
      </div>
    </div>;
  };

  return (
    <div className="modal-backdrop">
      <section className="exchange-screen" role="dialog" aria-modal="true"
        aria-labelledby="exchange-heading">
        <header>
          <div>
            <span>Adjacent heroes</span>
            <h2 id="exchange-heading">{left.name} ⇄ {right.name}</h2>
          </div>
          <button className="close-button" aria-label="Close exchange"
            title="Close exchange without making another transfer" onClick={onClose}>×</button>
        </header>
        <p>Choose either hero as the source, then choose an exact destination on the other hero.
          Every company or item waits for a final confirmation.</p>
        <ArmyExchange
          left={{ label: `${left.name} (hero)`, holder: { kind: 'hero', id: left.id }, army: left.army }}
          right={{ label: `${right.name} (hero)`, holder: { kind: 'hero', id: right.id }, army: right.army }}
          dispatch={dispatch} />
        <section className="item-exchange">
          <h3>Consumable items · both directions</h3>
          <p className="transfer-instruction">{itemSource && sourceHero && destinationHero && selectedItem
            ? `Source: ${sourceHero.name}, item slot ${itemSource.slot + 1} — ${itemName(selectedItem)}. Choose a highlighted destination in ${destinationHero.name}.`
            : `Choose a carried item from ${left.name} or ${right.name}. Empty source slots are unavailable.`}</p>
          <div className="item-transfer-area">
            {renderInventory('left', left)}
            <span className="transfer-arrow" aria-label="Transfers work in both directions">⇄</span>
            {renderInventory('right', right)}
          </div>
        </section>
        <p className="deferred-mechanic"><b>Artifacts:</b> standard hero-to-hero artifact transfer is not
          available in the current rules. Equipment and backpack choices remain with their hero.</p>
        {itemSource && itemDestination !== null && sourceHero && destinationHero && selectedItem && (
          <div className="modal-backdrop choice-backdrop">
            <section className="choice-dialog transfer-dialog" role="dialog" aria-modal="true"
              aria-labelledby="item-transfer-heading">
              <span className="dialog-kicker">Confirm item {destinationItem ? 'swap' : 'move'}</span>
              <h2 id="item-transfer-heading">{sourceHero.name} → {destinationHero.name}</h2>
              <p>{itemName(selectedItem)} moves from item slot {itemSource.slot + 1} to slot {
                itemDestination + 1}. {destinationItem
                ? `${itemName(destinationItem)} returns to ${sourceHero.name}'s source slot.`
                : `${sourceHero.name}'s source slot becomes empty.`}</p>
              <p className="transfer-preview">Result · {sourceHero.name} slot {itemSource.slot + 1}: {
                destinationItem ? itemName(destinationItem) : 'empty'}; {destinationHero.name} slot {
                itemDestination + 1}: {itemName(selectedItem)}. Occupied capacity: {sourceHero.name} {
                sourceHero.inventory.filter(Boolean).length}/{sourceHero.inventory.length} → {
                sourceHero.inventory.filter(Boolean).length - (destinationItem ? 0 : 1)}/{sourceHero.inventory.length}; {
                destinationHero.name} {destinationHero.inventory.filter(Boolean).length}/{destinationHero.inventory.length} → {
                destinationHero.inventory.filter(Boolean).length + (destinationItem ? 0 : 1)}/{destinationHero.inventory.length}.</p>
              <div className="dialog-actions">
                <button onClick={() => setItemDestination(null)}>Cancel · move nothing</button>
                <button className="primary" onClick={() => {
                  dispatch(itemTransferAction(left, right, itemSource, itemDestination));
                  setItemSource(null);
                  setItemDestination(null);
                }}>Confirm {destinationItem ? 'swap' : 'move'}</button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
