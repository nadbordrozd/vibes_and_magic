import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { SPELLS, SPELL_IDS } from '../../content/spells';
import {
  SPELL_KIND_NAMES, SPELL_SCHOOL_NAMES, SPELL_SCHOOL_ORDER,
} from '../../content/spellPresentation';
import type { DebtEntry, SpellId, SpellSchool } from '../../core/types';
import { ContentIcon } from './ContentIcon';

export type SpellUpgradePresentation = {
  active: 'standard' | 'upgraded';
  learned: boolean;
  reason?: string;
};

export type SpellbookEntry = {
  id: SpellId;
  manaCost: string;
  movementCost?: string;
  disabledReason?: string;
  targetSummary: string;
  currentValues: string[];
  legalConsequences: string;
  upgrade: SpellUpgradePresentation;
};

interface Props {
  className?: string;
  context: 'Combat magic' | 'Map magic';
  title: string;
  heroName: string;
  mana: number;
  maxMana: number;
  spellPower: number;
  movement?: number;
  debts: DebtEntry[];
  entries: SpellbookEntry[];
  onClose: () => void;
  onCast: (spellId: SpellId) => void;
}

export function orderedSpellbookEntries(entries: SpellbookEntry[]): SpellbookEntry[] {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  return SPELL_IDS.flatMap((spellId) => {
    const entry = entriesById.get(spellId);
    return entry ? [entry] : [];
  });
}

function debtDue(debt: DebtEntry): string {
  if (debt.trigger.kind === 'day-start') return `Due day ${debt.trigger.dueDay}`;
  if (debt.trigger.kind === 'week-start') return `Due week ${debt.trigger.dueWeek}`;
  if (debt.trigger.kind === 'battle-complete') return `Due after battle ${debt.trigger.dueBattle}`;
  return `Due at level ${debt.trigger.dueLevel}`;
}

/** Shared selection-first spellbook used by both adventure and combat. */
export function Spellbook({
  className, context, title, heroName, mana, maxMana, spellPower, movement, debts,
  entries, onClose, onCast,
}: Props) {
  const id = useId().replace(/:/g, '');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const orderedEntries = useMemo(() => orderedSpellbookEntries(entries), [entries]);
  const firstSchool = SPELL_SCHOOL_ORDER.find((school) =>
    orderedEntries.some((entry) => SPELLS[entry.id].school === school)) ?? 'rite';
  const [school, setSchool] = useState<SpellSchool>(firstSchool);
  const [selectedId, setSelectedId] = useState<SpellId | null>(null);
  const selected = selectedId ? entriesById.get(selectedId) ?? null : null;
  const selectedSpell = selected ? SPELLS[selected.id] : null;
  const visible = orderedEntries.filter((entry) => SPELLS[entry.id].school === school);

  const selectSchool = (next: SpellSchool) => {
    setSchool(next);
    setSelectedId(null);
  };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % SPELL_SCHOOL_ORDER.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + SPELL_SCHOOL_ORDER.length)
      % SPELL_SCHOOL_ORDER.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = SPELL_SCHOOL_ORDER.length - 1;
    if (next === null) return;
    event.preventDefault();
    selectSchool(SPELL_SCHOOL_ORDER[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="spellbook-backdrop" onClick={onClose}>
      <section className={`spellbook stitched-spellbook ${className ?? ''}`} aria-labelledby={`${id}-title`}
        data-detail-open={selected ? 'true' : 'false'} onClick={(event) => event.stopPropagation()}>
        <header className="spellbook-header">
          <div className="spellbook-title">
            <span>{context}</span>
            <h2 id={`${id}-title`}>{title}</h2>
          </div>
          <dl className="spellbook-vitals" aria-label={`${heroName} magic status`}>
            <div><dt>Hero</dt><dd>{heroName}</dd></div>
            <div><dt>Mana</dt><dd>{mana}/{maxMana}</dd></div>
            <div><dt>Power</dt><dd>{spellPower}</dd></div>
            {movement !== undefined && <div><dt>Move</dt><dd>{movement}</dd></div>}
          </dl>
          <button className="spellbook-close" aria-label="Close spellbook"
            title="Close spellbook" onClick={onClose}>Close <span aria-hidden="true">×</span></button>
        </header>

        <div className="spellbook-school-tabs" role="tablist" aria-label="Spell schools">
          {SPELL_SCHOOL_ORDER.map((schoolId, index) => {
            const count = orderedEntries.filter((entry) =>
              SPELLS[entry.id].school === schoolId).length;
            const active = school === schoolId;
            return <button key={schoolId} ref={(node) => { tabRefs.current[index] = node; }}
              id={`${id}-${schoolId}-tab`} role="tab" aria-selected={active}
              aria-controls={`${id}-${schoolId}-panel`} tabIndex={active ? 0 : -1}
              className={`spell-school-tab ${schoolId}`}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              onClick={() => selectSchool(schoolId)}>
              <span className="school-stitch" aria-hidden="true" />
              <b>{SPELL_SCHOOL_NAMES[schoolId]}</b><small>{count} learned</small>
            </button>;
          })}
        </div>

        <div className="spellbook-pages">
          <section className="spellbook-list-page" id={`${id}-${school}-panel`}
            role="tabpanel" aria-labelledby={`${id}-${school}-tab`}>
            <div className="spellbook-page-heading">
              <div><span>{SPELL_SCHOOL_NAMES[school]} school</span>
                <h3>Learned spells</h3></div>
              <small>Select a spell to read it. Selection never casts.</small>
            </div>
            <div className="spell-icon-grid" aria-label={`${SPELL_SCHOOL_NAMES[school]} learned spells`}>
              {visible.map((entry) => {
                const spell = SPELLS[entry.id];
                const active = selectedId === entry.id;
                const upgradeLabel = entry.upgrade.learned ? 'Upgraded'
                  : entry.upgrade.active === 'upgraded' ? 'Upgraded here' : null;
                return <button key={entry.id} type="button"
                  className={`spell-grid-cell ${spell.school}`}
                  data-spell-id={entry.id}
                  data-upgrade-state={entry.upgrade.learned ? 'learned'
                    : entry.upgrade.active === 'upgraded' ? 'temporary' : 'standard'}
                  aria-pressed={active} aria-describedby={entry.disabledReason
                    ? `${id}-${entry.id}-disabled` : undefined}
                  onClick={() => setSelectedId(entry.id)}>
                  <span className="spell-grid-art">
                    <ContentIcon kind="spell" id={entry.id} large />
                    {upgradeLabel && <span className="spell-upgrade-stitch" aria-hidden="true">⌃</span>}
                  </span>
                  <b>{spell.name}</b>
                  <span className="spell-grid-cost">{entry.manaCost}</span>
                  {upgradeLabel && <span className={`spell-upgrade-label ${entry.upgrade.learned ? 'learned' : 'temporary'}`}>
                    {upgradeLabel}</span>}
                  {entry.disabledReason && <small className="spell-grid-disabled"
                    id={`${id}-${entry.id}-disabled`}>Unavailable · {entry.disabledReason}</small>}
                </button>;
              })}
              {visible.length === 0 && <p className="spellbook-empty">
                {heroName} has not learned a {SPELL_SCHOOL_NAMES[school]} spell yet.
              </p>}
            </div>
            <details className="spellbook-debts">
              <summary>Debts · {debts.length}/2</summary>
              {debts.map((debt) => <article key={debt.id}>
                <b>{debt.name}</b><span>{debt.description}</span><small>{debtDue(debt)}</small>
              </article>)}
              {debts.length === 0 && <p>No active Debts.</p>}
            </details>
          </section>

          <aside className="spellbook-detail-page" aria-live="polite">
            {selected && selectedSpell ? <>
              <button className="spellbook-back" onClick={() => setSelectedId(null)}>
                ← Back to {SPELL_SCHOOL_NAMES[school]} list
              </button>
              <div className="spell-detail-heading">
                <ContentIcon kind="spell" id={selected.id} large />
                <div><span>{SPELL_SCHOOL_NAMES[selectedSpell.school]} · {
                  SPELL_KIND_NAMES[selectedSpell.kind]}</span><h3>{selectedSpell.name}</h3></div>
              </div>
              <div className="spell-detail-costs" aria-label="Casting costs">
                <span><b>Mana</b>{selected.manaCost}</span>
                {selected.movementCost && <span><b>Movement</b>{selected.movementCost}</span>}
              </div>
              <p className="spell-detail-flavor">{selectedSpell.flavor}</p>
              <section className="spell-detail-facts">
                <h4>Target and current values</h4>
                <p><b>Target</b>{selected.targetSummary}</p>
                {selected.currentValues.map((value) => <p key={value}><b>Current</b>{value}</p>)}
                <p><b>After Cast</b>{selected.legalConsequences}</p>
              </section>
              <div className="spell-version-comparison">
                <article className={selected.upgrade.active === 'standard' ? 'active' : ''}>
                  <h4>{selected.upgrade.active === 'standard' && <span aria-hidden="true">◆</span>} Standard</h4>
                  <p>{selectedSpell.base}</p>
                </article>
                <article className={selected.upgrade.active === 'upgraded' ? 'active' : ''}>
                  <h4>{selected.upgrade.active === 'upgraded' && <span aria-hidden="true">◆</span>} Upgraded</h4>
                  <p>{selectedSpell.plus}</p>
                </article>
              </div>
              <p className={`spell-upgrade-reason ${selected.upgrade.learned ? 'learned' : ''}`}>
                {selected.upgrade.learned
                  ? <><span className="gold-chevron" aria-hidden="true">⌃</span><b>Upgraded</b> · Permanently learned.</>
                  : selected.upgrade.active === 'upgraded'
                    ? <><b>Upgraded here</b> · {selected.upgrade.reason}</>
                    : <><b>Standard</b> · No upgrade is active.</>}
              </p>
              {selected.disabledReason && <p className="spell-detail-disabled" role="status">
                <b>Unavailable</b>{selected.disabledReason}
              </p>}
              <footer className="spellbook-detail-actions">
                <button onClick={() => setSelectedId(null)}>Back to list</button>
                <button className="primary" disabled={Boolean(selected.disabledReason)}
                  data-cast-spell-id={selected.id}
                  title={selected.disabledReason ?? `Cast ${selectedSpell.name}`}
                  onClick={() => onCast(selected.id)}>Cast {selectedSpell.name}</button>
                <button onClick={onClose}>Close</button>
              </footer>
            </> : <div className="spellbook-detail-placeholder">
              <span aria-hidden="true">✦</span>
              <h3>Choose a spell</h3>
              <p>Select one stitched icon to see its complete Standard and Upgraded rules,
                current values, targets, costs, and Cast action.</p>
            </div>}
          </aside>
        </div>
      </section>
    </div>
  );
}
