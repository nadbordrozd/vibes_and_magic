import {
  useEffect, useRef, type ReactNode,
} from 'react';
import { ARTIFACTS } from '../../content/artifacts';
import { CASTLE_NAMES } from '../../content/factionPresentation';
import { itemName } from '../../content/items';
import { FACTION_UNITS, UNITS } from '../../content/units';
import type {
  Action, ArtifactId, Castle, FactionId, GameState, Hero, ItemId, MapObject,
} from '../../core/types';
import { previewAction } from '../actionPreview';
import {
  type ContextualStructure,
} from '../adventureStructureInteractions';
import { inspectTarget, mapObjectName } from '../inspection';
import type { ActionDraft } from './ActionConfirmationDialog';
import { PalimpsestService } from './PalimpsestService';
import { ResourceAmount, ResourceCost } from './ResourceToken';
import { ArtifactSprite, ItemSprite } from '../assets';

function ContextualDialogFrame({
  title, flavor, inspect, children, onClose,
}: {
  title: string;
  flavor: string;
  inspect?: { kind: 'object' | 'castle'; id: string };
  children: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>('.structure-dialog-close')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hidden);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('keydown', key, true);
      const replacement = document.querySelector<HTMLElement>(
        '.modal-backdrop:not(.structure-dialog-backdrop) button:not(:disabled)',
      );
      if (replacement) replacement.focus();
      else if (previous?.isConnected && previous !== document.body) previous.focus();
      else document.querySelector<HTMLElement>('.map-frame')?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop structure-dialog-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="choice-dialog structure-dialog" role="dialog"
        aria-modal="true" aria-labelledby="structure-dialog-title"
        aria-describedby="structure-dialog-flavor">
        <button className="structure-dialog-close" onClick={onClose}
          aria-label="Close structure interaction" title="Close and return to the adventure map">×</button>
        <span className="dialog-kicker" data-inspect-kind={inspect?.kind} data-inspect-id={inspect?.id}>
          Adventure structure · inspect for complete rules
        </span>
        <h2 id="structure-dialog-title">{title}</h2>
        <p id="structure-dialog-flavor" className="structure-dialog-flavor">
          {flavor}
        </p>
        <div className="structure-dialog-content">{children}</div>
        <div className="dialog-actions structure-dialog-footer">
          <button onClick={onClose}>Cancel · return to map</button>
        </div>
      </section>
    </div>
  );
}

function StructureAction({
  state, action, label, title, actor, target, effect, onDraft, inspect,
}: {
  state: GameState;
  action: Action;
  label: string;
  title: string;
  actor: string;
  target: string;
  effect: string;
  onDraft: (draft: ActionDraft) => void;
  inspect?: { kind: 'item' | 'artifact' | 'unit'; id: string };
}) {
  const projected = previewAction(state, action);
  const reason = projected.reason ?? 'This action is unavailable.';
  return (
    <div className="structure-action">
      <button className={projected.legal ? 'primary' : undefined}
        disabled={!projected.legal} title={projected.legal ? `Review ${title}.` : reason}
        data-disabled-reason={!projected.legal ? reason : undefined}
        data-inspect-kind={inspect?.kind} data-inspect-id={inspect?.id}
        onClick={() => onDraft({ action, title, actor, target, effect })}>
        {inspect?.kind === 'artifact' && <ArtifactSprite artifactId={inspect.id as ArtifactId} />}
        {inspect?.kind === 'item' && <ItemSprite itemId={inspect.id as ItemId} />}
        <b>{label}</b>
        <span>{Object.keys(projected.cost).length
          ? <><span>Exact cost</span> <ResourceCost cost={projected.cost} compact /></>
          : 'No resource cost'}</span>
      </button>
      {!projected.legal && <small>Unavailable · {reason}</small>}
    </div>
  );
}

function EmptyOffer({ children }: { children: ReactNode }) {
  return <p className="structure-empty-offer">Unavailable · {children}</p>;
}

export function AdventureStructureDialog({
  state, hero, object, onDraft, onClose,
}: {
  state: GameState;
  hero: Hero;
  object: ContextualStructure;
  onDraft: (draft: ActionDraft) => void;
  onClose: () => void;
}) {
  const actor = hero.name;
  const description = inspectTarget(state, { kind: 'object', id: object.id });
  return (
    <ContextualDialogFrame title={mapObjectName(object)}
      flavor={description?.flavor ?? 'A useful place on the road.'}
      inspect={{ kind: 'object', id: object.id }} onClose={onClose}>
      {object.kind === 'dwelling' && (() => {
        const unit = UNITS[object.unitId];
        return <>
          <p><b>{object.available} {unit.name}</b> waiting. Recruits merge with a matching
            company or use one of {actor}’s empty army slots.</p>
          <div className="structure-options">
            <StructureAction state={state} action={{ type: 'RECRUIT_DWELLING', objectId: object.id, count: 1 }}
              label={`Recruit 1 ${unit.name}`} title={`Recruit 1 ${unit.name}`}
              actor={actor} target={actor} effect={`Add 1 ${unit.name} to this army.`}
              inspect={{ kind: 'unit', id: unit.id }} onDraft={onDraft} />
            <StructureAction state={state} action={{ type: 'RECRUIT_DWELLING', objectId: object.id, count: object.available }}
              label={`Recruit all ${object.available}`} title={`Recruit ${object.available} ${unit.name}`}
              actor={actor} target={actor} effect={`Add all ${object.available} waiting ${unit.name} to this army.`}
              inspect={{ kind: 'unit', id: unit.id }} onDraft={onDraft} />
          </div>
        </>;
      })()}
      {object.kind === 'tinkersCart' && <>
        <p>{object.stock ? <><b>{itemName(object.stock)}</b> is this week’s stock at 150% market value.
          It needs an empty consumable slot.</> : 'The cart is sold out until next week.'}</p>
        <StructureAction state={state} action={{ type: 'BUY_TINKER_ITEM', objectId: object.id }}
          label={object.stock ? `Buy ${itemName(object.stock)}` : 'Cart sold out'}
          title={`Buy ${itemName(object.stock)}`} actor={actor} target={actor}
          effect="Place the item in an empty consumable slot."
          inspect={object.stock ? { kind: 'item', id: object.stock.id } : undefined}
          onDraft={onDraft} />
      </>}
      {object.kind === 'monastery' && <>
        <p>The Unstruck Bell grants <b>+1 Speed in round one</b> of every battle through
          the next three days.</p>
        <StructureAction state={state} action={{ type: 'BUY_TIMING_BLESSING', objectId: object.id }}
          label="Take the Timing Blessing" title="Take Timing Blessing" actor={actor}
          target={actor} effect="Gain +1 Speed in round one of each battle through the next three days."
          onDraft={onDraft} />
      </>}
      {object.kind === 'gloamingRing' && (object.deposit ? <>
        <p><b>Gift already held.</b> It belongs to hero {object.deposit.heroId} and is due
          in week {object.deposit.dueWeek}.</p>
        <EmptyOffer>The Ring accepts only one gift at a time.</EmptyOffer>
      </> : <>
        <p>Leave one consumable until week {state.week + 1}; it returns one tier higher when
          possible. A Relic returns unchanged.</p>
        <div className="structure-options">
          {hero.inventory.map((item, index) => item && typeof item !== 'string' && (
            <StructureAction key={`gift-${index}`} state={state}
              action={{ type: 'DEPOSIT_GLOAMING_ITEM', objectId: object.id, inventorySlot: index }}
              label={`Leave ${itemName(item)}`} title={`Leave ${itemName(item)}`} actor={actor}
              target="The Gloaming Ring" effect={`Return in week ${state.week + 1}, one tier higher when possible.`}
              inspect={{ kind: 'item', id: item.id }} onDraft={onDraft} />
          ))}
          {hero.artifacts.backpack.map((artifact, index) => ARTIFACTS[artifact.id].class === 'relic' && (
            <StructureAction key={`relic-${index}`} state={state}
              action={{ type: 'DEPOSIT_GLOAMING_ARTIFACT', objectId: object.id, backpackIndex: index }}
              label={`Leave ${ARTIFACTS[artifact.id].name}`} title={`Leave ${ARTIFACTS[artifact.id].name}`}
              actor={actor} target="The Gloaming Ring"
              effect={`The Relic returns unchanged in week ${state.week + 1}.`}
              inspect={{ kind: 'artifact', id: artifact.id }} onDraft={onDraft} />
          ))}
        </div>
        {!hero.inventory.some((item) => item && typeof item !== 'string')
          && !hero.artifacts.backpack.some((artifact) => ARTIFACTS[artifact.id].class === 'relic')
          && <EmptyOffer>{actor} carries no consumable or backpack Relic to leave.</EmptyOffer>}
      </>)}
      {object.kind === 'chrysalis' && <>
        <p>Once per hero each week, replace one tier 1–3 company with half as many creatures
          of the next faction tier, rounded down to at least one.</p>
        <div className="structure-options">
          {hero.army.map((stack, index) => {
            if (!stack || UNITS[stack.unitId].tier > 3) return null;
            const unit = UNITS[stack.unitId];
            const next = FACTION_UNITS[unit.faction as FactionId][unit.tier];
            const count = Math.max(1, Math.floor(stack.count / 2));
            return <StructureAction key={`molt-${index}`} state={state}
              action={{ type: 'USE_CHRYSALIS', objectId: object.id, armySlot: index }}
              label={`Molt ${stack.count} ${unit.name}`} title={`Molt ${stack.count} ${unit.name}`}
              actor={actor} target={actor} effect={`Replace them with ${count} ${UNITS[next].name}.`}
              inspect={{ kind: 'unit', id: unit.id }} onDraft={onDraft} />;
          })}
        </div>
        {!hero.army.some((stack) => stack && UNITS[stack.unitId].tier <= 3)
          && <EmptyOffer>This army has no tier 1–3 company to transform.</EmptyOffer>}
      </>}
      {object.kind === 'bridge' && <>
        <p>{object.completed ? 'This crossing is already complete.' : <>Spend exactly
          {' '}<ResourceCost cost={{ timber: 10, iron: 5 }} compact /> to permanently open
          the authored crossing to every player.</>}</p>
        <StructureAction state={state} action={{ type: 'COMPLETE_BRIDGE', objectId: object.id }}
          label="Complete crossing" title="Complete crossing" actor={actor}
          target="The Half-Built Bridge" effect="Permanently open this crossing to every player."
          onDraft={onDraft} />
      </>}
      {object.kind === 'hedgeSchool' && <>
        <p>Pay exactly <ResourceAmount resource="gold" amount={1500} compact /> once for this hero,
          then choose one of three seeded permanent stat or secondary-skill lessons.</p>
        <StructureAction state={state} action={{ type: 'ATTEND_HEDGE_SCHOOL', objectId: object.id }}
          label="Attend a lesson" title="Attend Hedge School" actor={actor} target={actor}
          effect="Pay 1,500 gold, mark this hero as attended, then choose one of three permanent lessons."
          onDraft={onDraft} />
      </>}
      {object.kind === 'reliquaryCairn' && <>
        <p>Permanently exchange one carried artifact for a seeded artifact of the same class.
          The equipped Patternless Coat may instead be removed for no return.</p>
        <div className="structure-options">
          {Object.values(hero.artifacts.equipment).some((artifact) => artifact?.id === 'patternlessCoat') && (
            <StructureAction state={state}
              action={{ type: 'USE_RELIQUARY_CAIRN', objectId: object.id, backpackIndex: -1 }}
              label="Offer the Patternless Coat" title="Offer the Patternless Coat" actor={actor}
              target="The Reliquary Cairn" effect="Permanently remove the equipped Burden; receive nothing."
              inspect={{ kind: 'artifact', id: 'patternlessCoat' }} onDraft={onDraft} />
          )}
          {hero.artifacts.backpack.map((artifact, index) => (
            <StructureAction key={`cairn-${index}`} state={state}
              action={{ type: 'USE_RELIQUARY_CAIRN', objectId: object.id, backpackIndex: index }}
              label={`Trade ${ARTIFACTS[artifact.id].name}`} title={`Trade ${ARTIFACTS[artifact.id].name}`}
              actor={actor} target="The Reliquary Cairn"
              effect={`Permanently exchange it for a seeded ${ARTIFACTS[artifact.id].class}-class artifact.`}
              inspect={{ kind: 'artifact', id: artifact.id }} onDraft={onDraft} />
          ))}
        </div>
        {!Object.values(hero.artifacts.equipment).some((artifact) => artifact?.id === 'patternlessCoat')
          && hero.artifacts.backpack.length === 0
          && <EmptyOffer>{actor} carries no eligible artifact.</EmptyOffer>}
      </>}
      {object.kind === 'mercenaryCamp' && <>
        <p>Hire one displayed company at 150% of its normal gold cost. It must merge with
          a matching company or fit an empty army slot.</p>
        <div className="structure-options">
          {object.roster.map((stack, index) => (
            <StructureAction key={`${stack.unitId}-${index}`} state={state}
              action={{ type: 'BUY_MERCENARY', objectId: object.id, rosterIndex: index }}
              label={`Hire ${stack.count} ${UNITS[stack.unitId].name}`}
              title={`Hire ${stack.count} ${UNITS[stack.unitId].name}`} actor={actor} target={actor}
              effect={`Add ${stack.count} ${UNITS[stack.unitId].name} to this army.`}
              inspect={{ kind: 'unit', id: stack.unitId }} onDraft={onDraft} />
          ))}
        </div>
        {!object.roster.length && <EmptyOffer>No mercenary company remains this week.</EmptyOffer>}
      </>}
      {object.kind === 'wagonCamp' && <>
        <p>{object.stock ? <><b>{itemName(object.stock)}</b> is this week’s seeded stock.
          It needs an empty consumable slot.</> : 'The Wagon Camp is sold out until next week.'}</p>
        <StructureAction state={state} action={{ type: 'BUY_WAGON_ITEM', objectId: object.id }}
          label={object.stock ? `Buy ${itemName(object.stock)}` : 'Wagon sold out'}
          title={`Buy ${itemName(object.stock)}`} actor={actor} target={actor}
          effect="Place the wagon item in an empty consumable slot."
          inspect={object.stock ? { kind: 'item', id: object.stock.id } : undefined}
          onDraft={onDraft} />
      </>}
      {object.kind === 'titheBarn' && <>
        <p>Pay once per player each week. Every owned castle gains <b>+10% creature growth</b>
          for the current week.</p>
        <StructureAction state={state} action={{ type: 'PAY_TITHE', objectId: object.id }}
          label="Pay the tithe" title="Pay the tithe" actor={actor} target="Every owned city"
          effect="Grant every owned city +10% creature growth for this week."
          onDraft={onDraft} />
      </>}
    </ContextualDialogFrame>
  );
}

export function AdventurePalimpsestDialog({
  state, hero, site, onDraft, onClose,
}: {
  state: GameState;
  hero: Hero;
  site: Castle | Extract<MapObject, { kind: 'shrine' }>;
  onDraft: (draft: ActionDraft) => void;
  onClose: () => void;
}) {
  const castle = 'faction' in site;
  const title = castle ? `Mage Guild at ${CASTLE_NAMES[site.faction]}` : mapObjectName(site);
  const flavor = castle
    ? 'Old guild ink can be scraped away, but the blank remembers what was lost.'
    : inspectTarget(state, { kind: 'object', id: site.id })?.flavor
      ?? 'The old inscription can be written over once more.';
  return (
    <ContextualDialogFrame title={title} flavor={flavor}
      inspect={{ kind: castle ? 'castle' : 'object', id: site.id }} onClose={onClose}>
      <PalimpsestService state={state} hero={hero} site={site} onDraft={onDraft} />
    </ContextualDialogFrame>
  );
}
