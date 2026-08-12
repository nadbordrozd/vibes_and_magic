import { useState } from 'react';
import {
  ARTIFACTS, EQUIPMENT_SLOTS, slotAccepts,
} from '../../content/artifacts';
import { kitBonuses } from '../../core/artifacts';
import { debtCountdown } from '../../core/debts';
import type {
  Action, EquipmentSlotId, GameState, Hero, SpellSchool,
} from '../../core/types';
import { ArtifactSprite } from '../assets';
import { SemanticSpellText } from './SpellGlossary';

const SLOT_NAMES: Record<EquipmentSlotId, string> = {
  head: 'Head', cloak: 'Cloak', amulet: 'Amulet', weapon: 'Weapon',
  shield: 'Shield', armor: 'Armor', ring1: 'Ring 1', ring2: 'Ring 2',
  boots: 'Boots', misc1: 'Misc 1', misc2: 'Misc 2',
};

type EquipmentDraft =
  | { kind: 'equip'; backpackIndex: number; equipmentSlot: EquipmentSlotId | null;
    chosenSchool?: SpellSchool }
  | { kind: 'unequip'; equipmentSlot: EquipmentSlotId };

export function compatibleEquipmentSlots(hero: Hero, backpackIndex: number): EquipmentSlotId[] {
  const item = hero.artifacts.backpack[backpackIndex];
  if (!item) return [];
  return EQUIPMENT_SLOTS.filter((slot) => slotAccepts(slot, ARTIFACTS[item.id].slot));
}

export function equipmentResultPreview(
  hero: Hero, backpackIndex: number, equipmentSlot: EquipmentSlotId,
): string {
  const item = hero.artifacts.backpack[backpackIndex];
  if (!item) return 'The backpack artifact is no longer available.';
  const displaced = hero.artifacts.equipment[equipmentSlot];
  return `${ARTIFACTS[item.id].name} equips to ${SLOT_NAMES[equipmentSlot]}. ${displaced
    ? `${ARTIFACTS[displaced.id].name} is displaced to the backpack.`
    : 'The slot is currently empty; nothing is displaced.'}`;
}

export function ArtifactPaperDoll({
  state, hero, dispatch, onUnstitch,
}: {
  state: GameState;
  hero: Hero;
  dispatch: (action: Action) => void;
  onUnstitch?: () => void;
}) {
  const kit = kitBonuses(hero);
  const [draft, setDraft] = useState<EquipmentDraft | null>(null);
  const equipItem = draft?.kind === 'equip'
    ? hero.artifacts.backpack[draft.backpackIndex] : null;
  const equipDefinition = equipItem ? ARTIFACTS[equipItem.id] : null;
  const unequipItem = draft?.kind === 'unequip'
    ? hero.artifacts.equipment[draft.equipmentSlot] : null;
  const unequipDefinition = unequipItem ? ARTIFACTS[unequipItem.id] : null;

  return (
    <section className="artifact-paper-doll">
      <h4>Artifacts · {kit.pieces}/4 Tailor&apos;s Kit</h4>
      <p className="section-instruction">Choose an artifact, review every compatible destination
        and its replacement result, then confirm. Right-click any artifact for its full rules.</p>
      <div className="equipment-grid">
        {EQUIPMENT_SLOTS.map((slot) => {
          const item = hero.artifacts.equipment[slot];
          const definition = item ? ARTIFACTS[item.id] : null;
          const burdenReason = definition?.class === 'burden'
            ? `Burden — cannot unequip: ${definition.burdenRemoval}` : null;
          return (
            <button key={slot} className={item ? 'equipped' : ''}
              disabled={!item}
              title={item
                ? `${definition?.name}. ${burdenReason ?? 'Choose to preview unequipping.'}`
                : `Empty ${SLOT_NAMES[slot]} slot · accepts ${slot.replace(/[12]$/, '')} artifacts.`}
              onClick={() => item && setDraft({ kind: 'unequip', equipmentSlot: slot })}
              data-inspect-kind={item ? 'artifact' : undefined} data-inspect-id={item?.id}>
              <small>{SLOT_NAMES[slot]}</small>
              {item && <ArtifactSprite artifact={item} />}
              <b>{definition?.name ?? '—'}</b>
              {burdenReason && <span className="burden-mark">Burden · locked</span>}
            </button>
          );
        })}
      </div>
      <h4>Backpack · unlimited · {hero.artifacts.backpack.length} carried</h4>
      <div className="artifact-backpack">
        {hero.artifacts.backpack.map((item, index) => {
          const definition = ARTIFACTS[item.id];
          const slots = compatibleEquipmentSlots(hero, index);
          return (
            <button key={`${item.id}-${index}`}
              title={`${definition.description} Choose among: ${slots.map((slot) => SLOT_NAMES[slot]).join(', ')}.`}
              data-inspect-kind="artifact" data-inspect-id={item.id}
              onClick={() => setDraft({ kind: 'equip', backpackIndex: index, equipmentSlot: null,
                chosenSchool: item.chosenSchool })}>
              <ArtifactSprite artifact={item} />
              <b>{definition.name}</b>
              <small>{definition.class} · {definition.slot} · choose {slots.length} compatible {
                slots.length === 1 ? 'slot' : 'slots'}</small>
            </button>
          );
        })}
        {hero.artifacts.backpack.length === 0 && <small>No carried artifacts.</small>}
      </div>
      {kit.pieces >= 2 && (
        <p className="kit-bonus">
          <SemanticSpellText>{kit.pieces >= 4 ? 'All stats +2 · all spells Upgraded · all resonances · Unstitch'
            : kit.pieces === 3 ? 'All stats +2 · all spells use Upgraded rules'
              : 'All stats +2 · essence and seams revealed'}</SemanticSpellText>
        </p>
      )}
      {kit.canUnstitch && (
        <button className="secondary wide" disabled={hero.unstitchUsedWeek === state.week}
          title={hero.unstitchUsedWeek === state.week
            ? 'Unstitch has already been used this week.' : 'Choose an explored destination.'}
          onClick={onUnstitch}>Unstitch to an explored tile</button>
      )}
      <div className="debt-list">
        <h4>Debts · {hero.debts.length}/2</h4>
        {hero.debts.map((debt) => (
          <article key={debt.id}>
            <b>{debt.name}</b><span><SemanticSpellText>{debt.description}</SemanticSpellText></span>
            <small>Triggers in {debtCountdown(debt, state)}</small>
          </article>
        ))}
        {hero.debts.length === 0 && <small>No promises are waiting to be called.</small>}
      </div>
      {draft?.kind === 'equip' && equipItem && equipDefinition && (
        <div className="modal-backdrop choice-backdrop">
          <section className="choice-dialog equipment-dialog" role="dialog" aria-modal="true"
            aria-labelledby="equip-heading">
            <span className="dialog-kicker">Choose equipment destination</span>
            <h2 id="equip-heading"><ArtifactSprite artifact={equipItem} />Equip {equipDefinition.name}</h2>
            <p>{equipDefinition.class} artifact · fits {equipDefinition.slot} slots. {
              <SemanticSpellText>{equipDefinition.description}</SemanticSpellText>}</p>
            <div className="equipment-destinations" role="group" aria-label="Equipment slots">
              {EQUIPMENT_SLOTS.map((slot) => {
                const compatible = slotAccepts(slot, equipDefinition.slot);
                const current = hero.artifacts.equipment[slot];
                return <button key={slot} disabled={!compatible}
                  className={draft.equipmentSlot === slot ? 'selected' : ''}
                  title={compatible
                    ? `${SLOT_NAMES[slot]} is compatible. ${current
                      ? `${ARTIFACTS[current.id].name} will move to the backpack.` : 'It is empty.'}`
                    : `${SLOT_NAMES[slot]} accepts ${slot.replace(/[12]$/, '')}, not ${equipDefinition.slot}.`}
                  onClick={() => setDraft({ ...draft, equipmentSlot: slot })}>
                  <b>{SLOT_NAMES[slot]}</b>
                  <small>{compatible
                    ? current ? `Replace ${ARTIFACTS[current.id].name}` : 'Empty · compatible'
                    : `Incompatible · accepts ${slot.replace(/[12]$/, '')}`}</small>
                </button>;
              })}
            </div>
            {equipItem.id === 'seamstone' && <fieldset className="resonance-choice">
              <legend>Required Seamstone resonance</legend>
              {(['rite', 'craft', 'grave', 'wild'] as const).map((school) => (
                <button key={school} className={draft.chosenSchool === school ? 'selected' : ''}
                  onClick={() => setDraft({ ...draft, chosenSchool: school })}>{school}</button>
              ))}
            </fieldset>}
            <p className="transfer-preview">{draft.equipmentSlot
              ? equipmentResultPreview(hero, draft.backpackIndex, draft.equipmentSlot)
              : 'Choose one compatible destination. No slot is selected automatically.'}</p>
            <div className="dialog-actions">
              <button onClick={() => setDraft(null)}>Cancel · keep current loadout</button>
              <button className="primary"
                disabled={!draft.equipmentSlot || (equipItem.id === 'seamstone' && !draft.chosenSchool)}
                title={!draft.equipmentSlot ? 'Choose a compatible equipment slot.'
                  : equipItem.id === 'seamstone' && !draft.chosenSchool
                    ? 'Choose the Seamstone resonance school.' : 'Confirm this loadout change.'}
                onClick={() => {
                  if (!draft.equipmentSlot) return;
                  dispatch({ type: 'EQUIP_ARTIFACT', heroId: hero.id,
                    backpackIndex: draft.backpackIndex, equipmentSlot: draft.equipmentSlot,
                    chosenSchool: draft.chosenSchool });
                  setDraft(null);
                }}>Confirm equip</button>
            </div>
          </section>
        </div>
      )}
      {draft?.kind === 'unequip' && unequipItem && unequipDefinition && (
        <div className="modal-backdrop choice-backdrop">
          <section className="choice-dialog equipment-dialog" role="dialog" aria-modal="true"
            aria-labelledby="unequip-heading">
            <span className="dialog-kicker">Unequip to backpack</span>
            <h2 id="unequip-heading"><ArtifactSprite artifact={unequipItem} />{unequipDefinition.name} · {SLOT_NAMES[draft.equipmentSlot]}</h2>
            {unequipDefinition.class === 'burden' ? (
              <p className="disabled-reason"><b>Burden cannot be unequipped.</b> Removal condition: {
                unequipDefinition.burdenRemoval}</p>
            ) : (
              <p className="transfer-preview">Result · {SLOT_NAMES[draft.equipmentSlot]} becomes empty;
                {unequipDefinition.name} moves to backpack position {hero.artifacts.backpack.length + 1}.</p>
            )}
            <div className="dialog-actions">
              <button onClick={() => setDraft(null)}>Cancel · keep equipped</button>
              <button className="primary" disabled={unequipDefinition.class === 'burden'}
                title={unequipDefinition.class === 'burden'
                  ? `Cannot unequip: ${unequipDefinition.burdenRemoval}` : 'Confirm unequip to backpack.'}
                onClick={() => {
                  dispatch({ type: 'UNEQUIP_ARTIFACT', heroId: hero.id,
                    equipmentSlot: draft.equipmentSlot });
                  setDraft(null);
                }}>Confirm unequip</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
