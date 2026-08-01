import {
  ARTIFACTS, EQUIPMENT_SLOTS, slotAccepts,
} from '../../content/artifacts';
import { kitBonuses } from '../../core/artifacts';
import { debtCountdown } from '../../core/debts';
import type {
  Action, GameState, Hero,
} from '../../core/types';

export function ArtifactPaperDoll({
  state, hero, dispatch, onUnstitch,
}: {
  state: GameState;
  hero: Hero;
  dispatch: (action: Action) => void;
  onUnstitch?: () => void;
}) {
  const kit = kitBonuses(hero);
  return (
    <section className="artifact-paper-doll">
      <h4>Artifacts · {kit.pieces}/4 Tailor&apos;s Kit</h4>
      <div className="equipment-grid">
        {EQUIPMENT_SLOTS.map((slot) => {
          const item = hero.artifacts.equipment[slot];
          return (
            <button
              key={slot}
              className={item ? 'equipped' : ''}
              disabled={!item}
              title={item ? ARTIFACTS[item.id].description : `Empty ${slot} slot`}
              onClick={() => item && dispatch({
                type: 'UNEQUIP_ARTIFACT', heroId: hero.id, equipmentSlot: slot,
              })}
              data-inspect-kind={item ? 'artifact' : undefined}
              data-inspect-id={item?.id}
            >
              <small>{slot}</small>
              <b>{item ? ARTIFACTS[item.id].name : '—'}</b>
            </button>
          );
        })}
      </div>
      <h4>Backpack · unlimited</h4>
      <div className="artifact-backpack">
        {hero.artifacts.backpack.map((item, index) => {
          const definition = ARTIFACTS[item.id];
          const slot = EQUIPMENT_SLOTS.find((candidate) =>
            slotAccepts(candidate, definition.slot)
            && !hero.artifacts.equipment[candidate])
            ?? EQUIPMENT_SLOTS.find((candidate) =>
              slotAccepts(candidate, definition.slot));
          if (item.id === 'seamstone') {
            return (
              <article key={`${item.id}-${index}`} title={definition.description}
                data-inspect-kind="artifact" data-inspect-id={item.id}>
                <b>{definition.name}</b><small>Choose resonance</small>
                <div>
                  {(['rite', 'craft', 'grave', 'wild'] as const).map((school) => (
                    <button
                      key={school}
                      disabled={!slot}
                      onClick={() => slot && dispatch({
                        type: 'EQUIP_ARTIFACT', heroId: hero.id,
                        backpackIndex: index, equipmentSlot: slot,
                        chosenSchool: school,
                      })}
                    >{school}</button>
                  ))}
                </div>
              </article>
            );
          }
          return (
            <button
              key={`${item.id}-${index}`}
              disabled={!slot}
              title={definition.description}
              data-inspect-kind="artifact" data-inspect-id={item.id}
              onClick={() => slot && dispatch({
                type: 'EQUIP_ARTIFACT', heroId: hero.id,
                backpackIndex: index, equipmentSlot: slot,
              })}
            >
              <b>{definition.name}</b><small>{definition.slot}</small>
            </button>
          );
        })}
        {hero.artifacts.backpack.length === 0 && <small>No carried artifacts.</small>}
      </div>
      {kit.pieces >= 2 && (
        <p className="kit-bonus">
          {kit.pieces >= 4 ? 'All stats +2 · all spells + · all resonances · Unstitch'
            : kit.pieces === 3 ? 'All stats +2 · all spells resolve as +'
              : 'All stats +2 · essence and seams revealed'}
        </p>
      )}
      {kit.canUnstitch && (
        <button
          className="secondary wide"
          disabled={hero.unstitchUsedWeek === state.week}
          onClick={onUnstitch}
        >Unstitch to an explored tile</button>
      )}
      <div className="debt-list">
        <h4>Debts · {hero.debts.length}/2</h4>
        {hero.debts.map((debt) => (
          <article key={debt.id}>
            <b>{debt.name}</b>
            <span>{debt.description}</span>
            <small>Triggers in {debtCountdown(debt, state)}</small>
          </article>
        ))}
        {hero.debts.length === 0 && <small>No promises are waiting to be called.</small>}
      </div>
    </section>
  );
}
