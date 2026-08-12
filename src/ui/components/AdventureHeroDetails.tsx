import {
  useEffect, useRef, useState, type ReactNode,
} from 'react';
import { ARTIFACTS, EQUIPMENT_SLOTS, slotAccepts } from '../../content/artifacts';
import { HERO_MOVE_POINTS, LEVEL_THRESHOLD } from '../../content/constants';
import { FACTION_PASSIVES } from '../../content/factionPresentation';
import { HEROES } from '../../content/heroes';
import { ITEMS, itemName } from '../../content/items';
import { OMENS } from '../../content/omens';
import { SKILLS } from '../../content/skills';
import { UNITS } from '../../content/units';
import {
  artifactEffectTotal, artifactStatBonus, effectivePrimaryStat, kitBonuses,
} from '../../core/artifacts';
import { debtCountdown } from '../../core/debts';
import { consumableSlotCount, logisticsRate } from '../../core/heroBehaviors';
import type {
  Action, EquipmentSlotId, GameState, Hero, PrimaryStat, SpellSchool,
} from '../../core/types';
import { ArtifactSprite, ItemSprite, UnitPortrait } from '../assets';
import { ContentIcon } from './ContentIcon';
import {
  HeroIdentityPortrait, HeroPrimaryStatIcon, HeroSpecialtyIcon, HeroVitalIcon,
} from './HeroDashboardAssets';
import { SemanticSpellText, SpellGlossaryReference } from './SpellGlossary';
import { SpellEffectIcon } from './SpellEffectIcon';

export const HERO_DASHBOARD_SLOT_NAMES: Record<EquipmentSlotId, string> = {
  head: 'Head', cloak: 'Cloak', amulet: 'Amulet', weapon: 'Weapon',
  shield: 'Shield', armor: 'Armor', ring1: 'Ring 1', ring2: 'Ring 2',
  boots: 'Boots', misc1: 'Misc 1', misc2: 'Misc 2',
};

type Detail =
  | { kind: 'identity' }
  | { kind: 'specialty' }
  | { kind: 'primary'; stat: PrimaryStat }
  | { kind: 'vital'; vital: 'movement' | 'mana' | 'experience' | 'luck' }
  | { kind: 'company'; slot: number }
  | { kind: 'skill'; id: keyof Hero['skills'] }
  | { kind: 'equipment'; slot: EquipmentSlotId }
  | { kind: 'backpack'; index: number }
  | { kind: 'item'; slot: number }
  | { kind: 'status'; id: string };

type EquipmentDraft =
  | { kind: 'equip'; backpackIndex: number; equipmentSlot: EquipmentSlotId | null;
    chosenSchool?: SpellSchool }
  | { kind: 'unequip'; equipmentSlot: EquipmentSlotId };

interface SplitDraft { sourceSlot: number; destinationSlot: number | null; count: number }

const PRIMARY_STATS: Array<{ id: PrimaryStat; label: string }> = [
  { id: 'attack', label: 'Attack' }, { id: 'defense', label: 'Defense' },
  { id: 'spellPower', label: 'Spell Power' }, { id: 'knowledge', label: 'Knowledge' },
];

function titleCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function focusableWithin(element: HTMLElement): HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>(
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )].filter((control) => !control.hidden && control.getAttribute('aria-hidden') !== 'true');
}

function DashboardNestedDialog({
  labelId, className = '', onClose, children,
}: { labelId: string; className?: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.querySelector('.spell-glossary-popover')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = focusableWithin(dialog);
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
    return () => document.removeEventListener('keydown', key, true);
  }, []);
  return <div className="modal-backdrop choice-backdrop hero-dashboard-nested-backdrop"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className={`choice-dialog hero-dashboard-detail ${className}`}
      role="dialog" aria-modal="true" aria-labelledby={labelId}
      onMouseDown={(event) => event.stopPropagation()}>
      <button data-dialog-initial-focus className="hero-dashboard-detail-close"
        aria-label="Close dashboard detail or action" title="Close and return to the dashboard"
        onClick={onClose}>×</button>
      {children}
    </section>
  </div>;
}

export function compatibleDashboardSlots(hero: Hero, backpackIndex: number): EquipmentSlotId[] {
  const item = hero.artifacts.backpack[backpackIndex];
  if (!item) return [];
  return EQUIPMENT_SLOTS.filter((slot) => slotAccepts(slot, ARTIFACTS[item.id].slot));
}

export function dashboardEquipmentPreview(
  hero: Hero, backpackIndex: number, equipmentSlot: EquipmentSlotId,
): string {
  const item = hero.artifacts.backpack[backpackIndex];
  if (!item) return 'The backpack artifact is no longer available.';
  const displaced = hero.artifacts.equipment[equipmentSlot];
  return `${ARTIFACTS[item.id].name} equips to ${HERO_DASHBOARD_SLOT_NAMES[equipmentSlot]}. ${displaced
    ? `${ARTIFACTS[displaced.id].name} is displaced to the backpack.`
    : 'The slot is currently empty; nothing is displaced.'}`;
}

export function AdventureHeroDetails({
  state, hero, dispatch, onClose, onOpenSpellbook, onUseItem, onUnstitch,
}: {
  state: GameState;
  hero: Hero;
  dispatch: (action: Action) => void;
  onClose: () => void;
  onOpenSpellbook: () => void;
  onUseItem: (slot: number) => void;
  onUnstitch: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft | null>(null);
  const [splitDraft, setSplitDraft] = useState<SplitDraft | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const priorFocus = useRef<HTMLElement | null>(null);
  const detailInvoker = useRef<HTMLElement | null>(null);
  const definition = HEROES[hero.definitionId];
  const kit = kitBonuses(hero);
  const maxMovement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero)));
  const maxMana = effectivePrimaryStat(hero, 'knowledge') * 10;
  const effectiveLuck = hero.luck + artifactEffectTotal(hero, 'luck');
  const expectedInventorySlots = consumableSlotCount(hero);
  const inventory = Array.from({ length: expectedInventorySlots }, (_, index) => hero.inventory[index] ?? null);
  const cache = state.map.objects.find((object) => object.kind === 'cache');
  const patientStones = state.map.objects.filter((object) => object.kind === 'patientStone'
    && object.cacheId === cache?.id);
  const stoneFragments = patientStones.filter((stone) => stone.kind === 'patientStone'
    && stone.revealedBy.includes(hero.id)).length;
  const mapBonusFragment = Object.values(hero.artifacts.equipment)
    .some((artifact) => artifact?.id === 'mothEatenMap') ? 1 : 0;
  const cacheFragments = Math.min(patientStones.length, stoneFragments + mapBonusFragment);
  const emptyArmySlots = hero.army.flatMap((stack, slot) => stack ? [] : [slot]);

  const statusEntries = [
    hero.declaredResonance?.day === state.day ? {
      id: 'declared-resonance', name: `${titleCase(hero.declaredResonance.school)} resonance declared`,
      detail: 'The next battle today resonates with this school. It clears when that battle begins.',
    } : null,
    hero.attunementResonanceUsedDay === state.day ? {
      id: 'resonance-used', name: 'Attunement used today',
      detail: 'This hero cannot declare another next-battle resonance until a later day.',
    } : null,
    hero.adventureEffects.borrowedTimePenaltyDay === state.day ? {
      id: 'borrowed-time', name: 'Borrowed Time payment due',
      detail: `Today’s movement multiplier is ${hero.adventureEffects.borrowedTimeMultiplier}.`,
    } : null,
    hero.adventureEffects.falseColors ? {
      id: 'false-colors', name: `False Colors · ${hero.adventureEffects.falseColors.band}`,
      detail: `Cast on day ${hero.adventureEffects.falseColors.castDay}; the displayed army band remains false until its rule clears it.`,
    } : null,
    hero.adventureEffects.noRetaliationBattles > 0 ? {
      id: 'no-retaliation', name: `No retaliation · ${hero.adventureEffects.noRetaliationBattles} battles`,
      detail: 'Enemy companies cannot retaliate in the listed number of future battles.',
    } : null,
    hero.adventureEffects.sleepEvery ? {
      id: 'sleep-cycle', name: `Sleeps every ${hero.adventureEffects.sleepEvery} days`,
      detail: 'On matching day numbers this hero begins with no movement.',
    } : null,
    hero.adventureEffects.nextBattleMeterBonus ? {
      id: 'next-meter', name: `Next battle morale +${hero.adventureEffects.nextBattleMeterBonus}`,
      detail: 'This one-battle bonus is applied when the next battle begins, then clears.',
    } : null,
    hero.adventureEffects.nextBattleLuckBonus ? {
      id: 'next-luck', name: `Next battle luck +${hero.adventureEffects.nextBattleLuckBonus}`,
      detail: 'This one-battle bonus is applied when the next battle begins, then clears.',
    } : null,
    hero.adventureEffects.timingBlessingUntilDay >= state.day ? {
      id: 'timing-blessing', name: `Timing blessing · through day ${hero.adventureEffects.timingBlessingUntilDay}`,
      detail: 'Companies gain the active timing speed bonus in battle through the shown day.',
    } : null,
    hero.adventureEffects.ignoredAggroDay === state.day ? {
      id: 'ignored-aggro', name: 'First guardian ignored today',
      detail: 'This hero has already used the effect that ignores the first guardian engagement today.',
    } : null,
    hero.adventureEffects.spareFaceUsedWeek === state.week ? {
      id: 'spare-face', name: 'Spare Face used this week',
      detail: 'The equipped Spare Face granted its free False Colors cast and cannot do so again this week.',
    } : null,
    hero.embarkedBoatId ? {
      id: 'embarked', name: 'Embarked',
      detail: 'This hero currently travels aboard a boat and follows water-movement rules.',
    } : null,
    ...hero.adventureEffects.temporaryStacks.map((stack, index) => ({
      id: `temporary-${index}`, name: `${UNITS[stack.unitId].name} departs day ${stack.departDay}`,
      detail: `Temporary company in army slot ${stack.slot + 1}${stack.takesSmallest ? '; it takes the smallest company when it leaves' : ''}.`,
    })),
  ].filter((entry): entry is { id: string; name: string; detail: string } => Boolean(entry));

  const close = () => {
    onClose();
    requestAnimationFrame(() => priorFocus.current?.isConnected && priorFocus.current.focus());
  };
  const handoff = (next: () => void) => { onClose(); next(); };
  const restoreDetailFocus = () => requestAnimationFrame(() => {
    if (detailInvoker.current?.isConnected) detailInvoker.current.focus();
    else closeRef.current?.focus();
  });
  const closeDetail = () => { setDetail(null); restoreDetailFocus(); };
  const openDetail = (next: Detail, invoker: HTMLElement) => {
    detailInvoker.current = invoker;
    setDetail(next);
  };
  const beginEquip = (backpackIndex: number) => {
    const item = hero.artifacts.backpack[backpackIndex];
    if (!item) return;
    setDetail(null);
    setEquipmentDraft({ kind: 'equip', backpackIndex, equipmentSlot: null,
      chosenSchool: item.chosenSchool });
  };
  const beginUnequip = (equipmentSlot: EquipmentSlotId) => {
    setDetail(null);
    setEquipmentDraft({ kind: 'unequip', equipmentSlot });
  };

  useEffect(() => {
    priorFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    closeRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.querySelector('.spell-glossary-popover, .hero-dashboard-nested-backdrop')) return;
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = focusableWithin(dialogRef.current);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const renderDetail = () => {
    if (!detail) return null;
    let kicker = 'Hero dashboard detail';
    let title = '';
    let image: ReactNode = null;
    let body: ReactNode = null;
    let actions: ReactNode = null;
    if (detail.kind === 'identity') {
      kicker = 'Hero identity'; title = hero.name;
      image = <HeroIdentityPortrait heroId={hero.definitionId} className="detail-portrait" />;
      body = <><p className="detail-flavor">{definition.story}</p><p>{titleCase(definition.heroClass)} of {
        titleCase(hero.faction)}. <strong>{FACTION_PASSIVES[hero.faction].name}:</strong> {
          <SemanticSpellText>{FACTION_PASSIVES[hero.faction].description}</SemanticSpellText>}</p></>;
    } else if (detail.kind === 'specialty') {
      kicker = 'Hero specialty'; title = titleCase(definition.specialty.id);
      image = <HeroSpecialtyIcon specialtyId={definition.specialty.id} className="detail-icon" />;
      body = <><p><SemanticSpellText>{definition.specialty.description}</SemanticSpellText></p>
        <p><strong>{FACTION_PASSIVES[hero.faction].name}:</strong> <SemanticSpellText>{
          FACTION_PASSIVES[hero.faction].description}</SemanticSpellText></p></>;
    } else if (detail.kind === 'primary') {
      const entry = PRIMARY_STATS.find((candidate) => candidate.id === detail.stat)!;
      const bonus = artifactStatBonus(hero, detail.stat);
      kicker = 'Primary stat'; title = entry.label;
      image = <HeroPrimaryStatIcon stat={detail.stat} className="detail-icon" />;
      body = <><p className="detail-value">Current effective value · {
        effectivePrimaryStat(hero, detail.stat)}</p><dl className="hero-detail-facts">
        <div><dt>Stored base</dt><dd>{hero[detail.stat]}</dd></div>
        <div><dt>Equipment and Kit</dt><dd>{bonus >= 0 ? '+' : ''}{bonus}</dd></div>
        {detail.stat === 'knowledge' && <div><dt>Maximum mana</dt><dd>{maxMana}</dd></div>}
      </dl></>;
    } else if (detail.kind === 'vital') {
      const values = {
        movement: [`${hero.movement} / ${maxMovement}`, 'Current movement and ordinary daily maximum after Logistics.'],
        mana: [`${hero.mana} / ${maxMana}`, 'Current mana and the authoritative maximum: ten times effective Knowledge.'],
        experience: [`${hero.xp} / ${LEVEL_THRESHOLD(hero.level + 1)}`, `Level ${hero.level}; progress toward level ${hero.level + 1}.`],
        luck: [`${effectiveLuck}`, `${hero.luck} stored luck${effectiveLuck !== hero.luck ? ` plus ${effectiveLuck - hero.luck} from equipped artifacts` : ''}.`],
      } as const;
      kicker = 'Hero vital'; title = titleCase(detail.vital);
      image = <HeroVitalIcon vital={detail.vital} className="detail-icon" />;
      body = <><p className="detail-value">{values[detail.vital][0]}</p><p>{values[detail.vital][1]}</p></>;
    } else if (detail.kind === 'company') {
      const stack = hero.army[detail.slot];
      if (!stack) return null;
      const unit = UNITS[stack.unitId];
      kicker = `Army slot ${detail.slot + 1}`; title = `${stack.count} ${unit.name}`;
      image = <UnitPortrait unitId={stack.unitId} className="detail-unit-portrait" />;
      body = <><p className="detail-flavor">{unit.flavor}</p><dl className="hero-detail-facts">
        <div><dt>Tier / footprint</dt><dd>{unit.tier} / {unit.hexSize} hex</dd></div>
        <div><dt>Attack / Defense</dt><dd>{unit.attack} / {unit.defense}</dd></div>
        <div><dt>Damage / HP</dt><dd>{unit.damage[0]}–{unit.damage[1]} / {unit.hp}</dd></div>
        <div><dt>Speed</dt><dd>{unit.speed}</dd></div>
        <div><dt>Abilities</dt><dd>{unit.abilities.length ? unit.abilities.map(titleCase).join(', ') : 'None'}</dd></div>
      </dl></>;
      if (stack.count > 1 && emptyArmySlots.length > 0) actions = <button className="primary"
        onClick={() => { setDetail(null); setSplitDraft({ sourceSlot: detail.slot,
          destinationSlot: null, count: Math.floor(stack.count / 2) }); }}>Split company…</button>;
    } else if (detail.kind === 'skill') {
      const skill = SKILLS[detail.id];
      const rank = hero.skills[detail.id]!;
      kicker = 'Secondary skill'; title = `${skill.name} · Rank ${rank}`;
      image = <ContentIcon kind="skill" id={detail.id} large />;
      body = <div className="hero-skill-ranks">{([1, 2, 3] as const).map((candidate) =>
        <p key={candidate} className={rank === candidate ? 'current' : ''}>
          <strong>Rank {candidate}{rank === candidate ? ' · current' : ''}</strong>
          <SemanticSpellText>{skill.ranks[candidate]}</SemanticSpellText>
        </p>)}</div>;
    } else if (detail.kind === 'equipment') {
      const item = hero.artifacts.equipment[detail.slot];
      kicker = `Equipped position · ${HERO_DASHBOARD_SLOT_NAMES[detail.slot]}`;
      if (!item) {
        const accepted = detail.slot.replace(/[12]$/, '');
        title = `Empty ${HERO_DASHBOARD_SLOT_NAMES[detail.slot]}`;
        const candidates = hero.artifacts.backpack.flatMap((candidate, index) =>
          slotAccepts(detail.slot, ARTIFACTS[candidate.id].slot) ? [{ candidate, index }] : []);
        body = <><p>This position accepts {accepted} artifacts.</p>{candidates.length
          ? <div className="detail-choice-list">{candidates.map(({ candidate, index }) =>
            <button key={`${candidate.id}-${index}`} onClick={() => beginEquip(index)}>
              <ArtifactSprite artifact={candidate} /><span>Equip {ARTIFACTS[candidate.id].name}…</span>
            </button>)}</div> : <p>No compatible artifact is currently in the backpack.</p>}</>;
      } else {
        const artifact = ARTIFACTS[item.id]; title = artifact.name;
        image = <ArtifactSprite artifact={item} className="detail-collectible" />;
        body = <><p className="detail-flavor">{artifact.flavor}</p><p>{artifact.class} · fits {
          artifact.slot}. <SemanticSpellText>{artifact.description}</SemanticSpellText></p>
          {item.chosenSchool && <p>Chosen school · {titleCase(item.chosenSchool)}</p>}
          {artifact.class === 'burden' && <p className="disabled-reason">Removal condition · {
            artifact.burdenRemoval}</p>}</>;
        actions = <button className="primary" disabled={artifact.class === 'burden'}
          data-disabled-reason={artifact.class === 'burden' ? artifact.burdenRemoval : undefined}
          title={artifact.class === 'burden'
            ? `Cannot unequip: ${artifact.burdenRemoval}` : 'Review unequipping to the backpack.'}
          onClick={() => beginUnequip(detail.slot)}>Unequip to backpack…</button>;
      }
    } else if (detail.kind === 'backpack') {
      const item = hero.artifacts.backpack[detail.index];
      if (!item) return null;
      const artifact = ARTIFACTS[item.id]; kicker = `Backpack position ${detail.index + 1}`;
      title = artifact.name; image = <ArtifactSprite artifact={item} className="detail-collectible" />;
      body = <><p className="detail-flavor">{artifact.flavor}</p><p>{artifact.class} · fits {
        artifact.slot}. <SemanticSpellText>{artifact.description}</SemanticSpellText></p>
        {item.chosenSchool && <p>Chosen school · {titleCase(item.chosenSchool)}</p>}
        {artifact.class === 'burden' && <p>Removal condition · {artifact.burdenRemoval}</p>}</>;
      actions = <button className="primary" onClick={() => beginEquip(detail.index)}>Equip…</button>;
    } else if (detail.kind === 'item') {
      const item = inventory[detail.slot];
      if (!item || typeof item === 'string') return null;
      const itemDefinition = ITEMS[item.id]; kicker = `Consumable position ${detail.slot + 1}`;
      title = itemName(item); image = <ItemSprite item={item} className="detail-collectible" />;
      const instanceFields = Object.entries(item).filter(([key]) => key !== 'id');
      body = <><p className="detail-flavor">{itemDefinition.flavor}</p><p>{titleCase(itemDefinition.use)} timing · {
        <SemanticSpellText>{itemDefinition.description}</SemanticSpellText>}</p>
        {instanceFields.length > 0 && <dl className="hero-detail-facts">{instanceFields.map(([key, value]) =>
          <div key={key}><dt>{titleCase(key)}</dt><dd>{typeof value === 'object'
            ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>}</>;
      if (itemDefinition.use === 'adventure') actions = <button className="primary" onClick={() => {
        setDetail(null); handoff(() => onUseItem(detail.slot));
      }}>Use item…</button>;
    } else if (detail.kind === 'status') {
      const status = statusEntries.find((candidate) => candidate.id === detail.id);
      if (!status) return null;
      kicker = 'Current hero status'; title = status.name; body = <p>{status.detail}</p>;
    }
    return <DashboardNestedDialog key="detail" labelId="hero-dashboard-detail-heading" onClose={closeDetail}>
      <span className="dialog-kicker">{kicker}</span>
      <h2 id="hero-dashboard-detail-heading">{image}{title}</h2>
      <div className="hero-dashboard-detail-body">{body}</div>
      <div className="dialog-actions">{actions}<button onClick={closeDetail}>Close details</button></div>
    </DashboardNestedDialog>;
  };

  const renderEquipmentDraft = () => {
    if (!equipmentDraft) return null;
    const cancel = () => { setEquipmentDraft(null); restoreDetailFocus(); };
    if (equipmentDraft.kind === 'equip') {
      const item = hero.artifacts.backpack[equipmentDraft.backpackIndex];
      if (!item) return null;
      const artifact = ARTIFACTS[item.id];
      return <DashboardNestedDialog key="equip" labelId="hero-dashboard-equip-heading" className="equipment-dialog"
        onClose={cancel}>
        <span className="dialog-kicker">Choose equipment destination</span>
        <h2 id="hero-dashboard-equip-heading"><ArtifactSprite artifact={item} />Equip {artifact.name}</h2>
        <p>Review all eleven canonical destinations. No equipment changes until confirmation.</p>
        <div className="equipment-destinations" role="group" aria-label="Equipment destinations">
          {EQUIPMENT_SLOTS.map((slot, index) => {
            const compatible = slotAccepts(slot, artifact.slot);
            const current = hero.artifacts.equipment[slot];
            const reason = `${HERO_DASHBOARD_SLOT_NAMES[slot]} accepts ${slot.replace(/[12]$/, '')}, not ${artifact.slot}.`;
            return <button key={slot} data-dialog-initial-focus={index === 0 || undefined}
              aria-disabled={!compatible || undefined}
              className={equipmentDraft.equipmentSlot === slot ? 'selected' : ''}
              title={compatible ? `${HERO_DASHBOARD_SLOT_NAMES[slot]} is compatible. ${current
                ? `${ARTIFACTS[current.id].name} will move to the backpack.` : 'It is empty.'}` : reason}
              onClick={() => compatible && setEquipmentDraft({ ...equipmentDraft, equipmentSlot: slot })}>
              <b>{HERO_DASHBOARD_SLOT_NAMES[slot]}</b>
              <small>{compatible ? current ? `Replace ${ARTIFACTS[current.id].name}`
                : 'Empty · compatible' : `Unavailable · ${reason}`}</small>
            </button>;
          })}
        </div>
        {item.id === 'seamstone' && <fieldset className="resonance-choice">
          <legend>Required Seamstone resonance</legend>
          {(['rite', 'craft', 'grave', 'wild'] as const).map((school) => <button key={school}
            className={equipmentDraft.chosenSchool === school ? 'selected' : ''}
            onClick={() => setEquipmentDraft({ ...equipmentDraft, chosenSchool: school })}>{school}</button>)}
        </fieldset>}
        <p className="transfer-preview">{equipmentDraft.equipmentSlot
          ? dashboardEquipmentPreview(hero, equipmentDraft.backpackIndex, equipmentDraft.equipmentSlot)
          : 'Choose one compatible destination. No slot is selected automatically.'}</p>
        <div className="dialog-actions"><button onClick={cancel}>Cancel · keep current loadout</button>
          <button className="primary" disabled={!equipmentDraft.equipmentSlot
            || (item.id === 'seamstone' && !equipmentDraft.chosenSchool)}
            title={!equipmentDraft.equipmentSlot ? 'Choose a compatible equipment slot.'
              : item.id === 'seamstone' && !equipmentDraft.chosenSchool
                ? 'Choose the Seamstone resonance school.' : 'Confirm this loadout change.'}
            onClick={() => {
              if (!equipmentDraft.equipmentSlot) return;
              dispatch({ type: 'EQUIP_ARTIFACT', heroId: hero.id,
                backpackIndex: equipmentDraft.backpackIndex,
                equipmentSlot: equipmentDraft.equipmentSlot,
                chosenSchool: equipmentDraft.chosenSchool });
              setEquipmentDraft(null); restoreDetailFocus();
            }}>Confirm equip</button></div>
      </DashboardNestedDialog>;
    }
    const item = hero.artifacts.equipment[equipmentDraft.equipmentSlot];
    if (!item) return null;
    const artifact = ARTIFACTS[item.id];
    return <DashboardNestedDialog key="unequip" labelId="hero-dashboard-unequip-heading" onClose={cancel}>
      <span className="dialog-kicker">Unequip to backpack</span>
      <h2 id="hero-dashboard-unequip-heading"><ArtifactSprite artifact={item} />{artifact.name} · {
        HERO_DASHBOARD_SLOT_NAMES[equipmentDraft.equipmentSlot]}</h2>
      {artifact.class === 'burden' ? <p className="disabled-reason"><b>Burden cannot be unequipped.</b> {
        `Removal condition: ${artifact.burdenRemoval}`}</p>
        : <p className="transfer-preview">Result · {HERO_DASHBOARD_SLOT_NAMES[equipmentDraft.equipmentSlot]} becomes empty; {
          artifact.name} moves to backpack position {hero.artifacts.backpack.length + 1}.</p>}
      <div className="dialog-actions"><button data-dialog-initial-focus onClick={cancel}>Cancel · keep equipped</button>
        <button className="primary" disabled={artifact.class === 'burden'}
          title={artifact.class === 'burden' ? `Cannot unequip: ${artifact.burdenRemoval}` : 'Confirm unequip to backpack.'}
          onClick={() => {
            dispatch({ type: 'UNEQUIP_ARTIFACT', heroId: hero.id,
              equipmentSlot: equipmentDraft.equipmentSlot });
            setEquipmentDraft(null); restoreDetailFocus();
          }}>Confirm unequip</button></div>
    </DashboardNestedDialog>;
  };

  const renderSplitDraft = () => {
    if (!splitDraft) return null;
    const source = hero.army[splitDraft.sourceSlot];
    if (!source) return null;
    const cancel = () => { setSplitDraft(null); restoreDetailFocus(); };
    return <DashboardNestedDialog key="split" labelId="hero-dashboard-split-heading" className="split-dialog" onClose={cancel}>
      <span className="dialog-kicker">Split company</span>
      <h2 id="hero-dashboard-split-heading">{UNITS[source.unitId].name}</h2>
      <p>Choose an exact empty destination and amount. Nothing moves until confirmation.</p>
      <div className="split-destinations" role="group" aria-label="Empty destination slots">
        {emptyArmySlots.map((slot, index) => <button key={slot} data-dialog-initial-focus={index === 0 || undefined}
          className={splitDraft.destinationSlot === slot ? 'selected' : ''}
          onClick={() => setSplitDraft({ ...splitDraft, destinationSlot: slot })}>Empty slot {slot + 1}</button>)}
      </div>
      <label>Amount · {splitDraft.count} of {source.count}
        <input type="number" min="1" max={source.count - 1} value={splitDraft.count}
          onChange={(event) => setSplitDraft({ ...splitDraft, count: Math.max(1,
            Math.min(source.count - 1, Number(event.target.value))) })} />
      </label>
      <input type="range" min="1" max={source.count - 1} value={splitDraft.count}
        onChange={(event) => setSplitDraft({ ...splitDraft, count: Number(event.target.value) })} />
      <p className="transfer-preview">Result · source slot {splitDraft.sourceSlot + 1}: {
        source.count - splitDraft.count}; {splitDraft.destinationSlot === null
        ? 'choose an empty destination' : `slot ${splitDraft.destinationSlot + 1}: ${splitDraft.count}`}.</p>
      <div className="dialog-actions"><button onClick={cancel}>Cancel</button>
        <button onClick={() => setSplitDraft({ ...splitDraft, count: Math.floor(source.count / 2) })}>Split evenly</button>
        <button className="primary" disabled={splitDraft.destinationSlot === null}
          title={splitDraft.destinationSlot === null ? 'Choose an empty destination slot.' : 'Confirm this split.'}
          onClick={() => {
            if (splitDraft.destinationSlot === null) return;
            dispatch({ type: 'SPLIT_ARMY', holder: { kind: 'hero', id: hero.id },
              sourceSlot: splitDraft.sourceSlot, destinationSlot: splitDraft.destinationSlot,
              count: splitDraft.count });
            setSplitDraft(null); restoreDetailFocus();
          }}>Confirm split</button></div>
    </DashboardNestedDialog>;
  };

  return <div className="modal-backdrop hero-details-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) close();
  }}>
    <section ref={dialogRef} className="hero-details-dialog hero-dashboard-dialog" role="dialog"
      aria-modal="true" aria-labelledby="hero-details-heading">
      <header>
        <div><span className="dialog-kicker">Hero dashboard · one-screen management</span>
          <h2 id="hero-details-heading">{hero.name}</h2>
          <small>Level {hero.level} · {hero.xp} XP</small></div>
        <button ref={closeRef} className="structure-dialog-close" aria-label="Close hero dashboard"
          title="Close hero dashboard" onClick={close}>×</button>
      </header>
      <div className="hero-details-body hero-dashboard-body">
        <section className="hero-dashboard-region hero-dashboard-identity" data-dashboard-region="identity">
          <h3>Identity</h3>
          <div className="hero-dashboard-identity-layout">
            <button className="hero-dashboard-portrait-button"
              aria-label={`${hero.name}, ${titleCase(definition.heroClass)}, ${titleCase(hero.faction)}: open identity details`}
              onClick={(event) => openDetail({ kind: 'identity' }, event.currentTarget)}>
              <HeroIdentityPortrait heroId={hero.definitionId} />
              <span><b>{hero.name}</b><small>{titleCase(hero.faction)} · {titleCase(definition.heroClass)}</small>
                <small>Level {hero.level} · {hero.xp} XP</small></span>
            </button>
            <button className="hero-dashboard-specialty-button"
              aria-label={`Specialty ${titleCase(definition.specialty.id)}: open details`}
              onClick={(event) => openDetail({ kind: 'specialty' }, event.currentTarget)}>
              <HeroSpecialtyIcon specialtyId={definition.specialty.id} />
              <span><small>Specialty</small><b>{titleCase(definition.specialty.id)}</b></span>
            </button>
          </div>
        </section>

        <section className="hero-dashboard-region hero-dashboard-primary" data-dashboard-region="primary-stats">
          <h3>Primary stats</h3><div className="hero-dashboard-stat-grid">{PRIMARY_STATS.map((stat) => {
            const value = effectivePrimaryStat(hero, stat.id);
            return <button key={stat.id} aria-label={`${stat.label}, ${value}: open stat details`}
              onClick={(event) => openDetail({ kind: 'primary', stat: stat.id }, event.currentTarget)}>
              <HeroPrimaryStatIcon stat={stat.id} /><span><small>{stat.label}</small><b>{value}</b></span>
            </button>;
          })}</div>
        </section>

        <section className="hero-dashboard-region hero-dashboard-vitals" data-dashboard-region="vitals-status">
          <h3>Vitals and current status</h3><div className="hero-dashboard-vital-grid">{([
            ['movement', 'Movement', `${hero.movement} / ${maxMovement}`],
            ['mana', 'Mana', `${hero.mana} / ${maxMana}`],
            ['experience', 'Experience', `${hero.xp} / ${LEVEL_THRESHOLD(hero.level + 1)}`],
            ['luck', 'Luck', String(effectiveLuck)],
          ] as const).map(([vital, label, value]) => <button key={vital}
            aria-label={`${label}, ${value}: open vital details`}
            onClick={(event) => openDetail({ kind: 'vital', vital }, event.currentTarget)}>
            <HeroVitalIcon vital={vital} /><span><small>{label}</small><b>{value}</b></span>
          </button>)}</div>
          {statusEntries.length > 0 && <div className="hero-dashboard-status-list" aria-label="Current non-default statuses">
            {statusEntries.map((status) => <button key={status.id}
              aria-label={`Status ${status.name}: open details`}
              onClick={(event) => openDetail({ kind: 'status', id: status.id }, event.currentTarget)}>
              {status.id === 'declared-resonance' || status.id === 'resonance-used'
                ? <SpellEffectIcon id="resonance" decorative />
                : status.id === 'borrowed-time' ? <ContentIcon kind="spell" id="borrowedTime" decorative />
                  : status.id === 'false-colors' ? <ContentIcon kind="spell" id="falseColors" decorative />
                    : status.id === 'next-meter' ? <SpellEffectIcon id="morale" decorative />
                      : status.id === 'next-luck' ? <HeroVitalIcon vital="luck" />
                        : status.id.startsWith('temporary-')
                          ? <UnitPortrait unitId={hero.adventureEffects.temporaryStacks[
                            Number(status.id.replace('temporary-', ''))].unitId} />
                          : <SpellEffectIcon id="active-effect" decorative />}
              {status.name}</button>)}</div>}
        </section>

        <section className="hero-dashboard-region hero-dashboard-army" data-dashboard-region="army">
          <h3>Army · seven company slots</h3>
          <div className="hero-dashboard-army-grid">{hero.army.map((stack, slot) => stack
            ? <button key={slot} aria-label={`Army slot ${slot + 1}, ${stack.count} ${UNITS[stack.unitId].name}, occupied: open company details`}
              onClick={(event) => openDetail({ kind: 'company', slot }, event.currentTarget)}>
              <UnitPortrait unitId={stack.unitId} /><b>{stack.count}</b><span>{UNITS[stack.unitId].name}</span>
              {UNITS[stack.unitId].hexSize > 1 && <small>{UNITS[stack.unitId].hexSize}-hex</small>}
            </button>
            : <div key={slot} className="hero-dashboard-empty-cell" aria-label={`Army slot ${slot + 1}, empty`}>
              <span>Empty</span><small>Slot {slot + 1}</small></div>)}</div>
        </section>

        <section className="hero-dashboard-region hero-dashboard-skills" data-dashboard-region="secondary-skills">
          <h3>Learned skills</h3>
          {Object.entries(hero.skills).length > 0 ? <div className="hero-dashboard-skill-grid">{
            Object.entries(hero.skills).map(([id, rank]) => {
              const skillId = id as keyof Hero['skills']; const skill = SKILLS[skillId];
              return <button key={id} aria-label={`Secondary skill ${skill.name}, Rank ${rank}: open all rank details`}
                onClick={(event) => openDetail({ kind: 'skill', id: skillId }, event.currentTarget)}>
                <ContentIcon kind="skill" id={skillId} decorative /><span><b>{skill.name}</b><small>Rank {rank}</small></span>
              </button>;
            })}</div> : <p className="hero-dashboard-empty-line">No secondary skills learned.</p>}
        </section>

        <section className="hero-dashboard-region hero-dashboard-equipment" data-dashboard-region="equipped-artifacts">
          <h3>Equipped artifacts · {kit.pieces}/4 Tailor&apos;s Kit</h3>
          <div className="hero-dashboard-equipment-grid">{EQUIPMENT_SLOTS.map((slot) => {
            const item = hero.artifacts.equipment[slot]; const artifact = item ? ARTIFACTS[item.id] : null;
            return <button key={slot} className={item ? 'occupied' : 'empty'}
              aria-label={item ? `Equipped ${HERO_DASHBOARD_SLOT_NAMES[slot]}, ${artifact!.name}${artifact!.class === 'burden' ? ', Burden locked' : ''}: open artifact details`
                : `Empty equipment slot ${HERO_DASHBOARD_SLOT_NAMES[slot]}, accepts ${slot.replace(/[12]$/, '')}: open slot details`}
              onClick={(event) => openDetail({ kind: 'equipment', slot }, event.currentTarget)}>
              <small>{HERO_DASHBOARD_SLOT_NAMES[slot]}</small>{item
                ? <ArtifactSprite artifact={item} /> : <span className="hero-dashboard-empty-artifact" aria-hidden="true">◇</span>}
              <b>{artifact?.name ?? 'Empty'}</b>{artifact?.class === 'burden'
                && <span className="burden-mark">Burden · locked</span>}
            </button>;
          })}</div>
        </section>

        <section className="hero-dashboard-region hero-dashboard-backpack" data-dashboard-region="artifact-backpack">
          <h3>Artifact backpack · unlimited · {hero.artifacts.backpack.length} carried</h3>
          {hero.artifacts.backpack.length > 0 ? <div className="hero-dashboard-backpack-grid">{
            hero.artifacts.backpack.map((item, index) => <button key={`${item.id}-${index}`}
              aria-label={`Backpack position ${index + 1}, ${ARTIFACTS[item.id].name}: open artifact details`}
              onClick={(event) => openDetail({ kind: 'backpack', index }, event.currentTarget)}>
              <ArtifactSprite artifact={item} /><span>{ARTIFACTS[item.id].name}</span>
            </button>)}</div> : <p className="hero-dashboard-empty-line">No carried artifacts.</p>}
        </section>

        <section className="hero-dashboard-region hero-dashboard-items" data-dashboard-region="consumables">
          <h3>Consumables · {inventory.filter(Boolean).length}/{inventory.length}</h3>
          <div className="hero-dashboard-item-grid">{inventory.map((item, slot) => item && typeof item !== 'string'
            ? <button key={slot} aria-label={`Consumable position ${slot + 1}, ${itemName(item)}, ${ITEMS[item.id].use} timing: open item details`}
              onClick={(event) => openDetail({ kind: 'item', slot }, event.currentTarget)}>
              <ItemSprite item={item} /><span>{itemName(item)}</span><small>{titleCase(ITEMS[item.id].use)}</small>
            </button>
            : <div key={slot} className="hero-dashboard-empty-cell" aria-label={`Consumable position ${slot + 1}, empty`}>
              <span>Empty</span><small>Slot {slot + 1}</small></div>)}</div>
        </section>

        <section className="hero-dashboard-region hero-dashboard-special" data-dashboard-region="special-controls">
          <h3>Special controls and obligations</h3>
          <div className="hero-dashboard-special-grid">
            <article><h4>Spellbook</h4><p>{hero.knownSpells.length} known · {hero.upgradedSpells.length} upgraded</p>
              <button className="primary" onClick={() => handoff(onOpenSpellbook)}>Open adventure spellbook</button></article>
            {hero.skills.attunement === 3 && <article className="resonance-picker">
              <h4>Attunement · next battle <SpellGlossaryReference termId="resonance" /></h4>
              <div>{(['rite', 'craft', 'grave', 'wild'] as const).map((school) => {
                const unavailable = hero.attunementResonanceUsedDay === state.day
                  || hero.declaredResonance?.day === state.day;
                const reason = 'A resonance has already been declared or used today.';
                return <button key={school} disabled={unavailable} title={unavailable ? reason
                  : `Make the next battle resonate with ${school} magic.`}
                  data-disabled-reason={unavailable ? reason : undefined}
                  onClick={() => dispatch({ type: 'DECLARE_RESONANCE', heroId: hero.id, school })}>{school}</button>;
              })}</div></article>}
            {(hero.skills.ritualist ?? 0) >= 2 && <article className="omen-preview"><h4>Ritualist&apos;s forecast</h4>
              <p><b>{OMENS[state.nextOmen].title}</b></p>{hero.skills.ritualist === 3
                && <div>{(Object.keys(OMENS) as Array<keyof typeof OMENS>).map((omen) => {
                  const reason = 'Ritualist omen choice is unavailable because this week’s choice was already made.';
                  return <button key={omen} disabled={hero.ritualistOmenChosen}
                    title={hero.ritualistOmenChosen ? reason : `Choose ${OMENS[omen].title} as the next omen.`}
                    data-disabled-reason={hero.ritualistOmenChosen ? reason : undefined}
                    onClick={() => dispatch({ type: 'CHOOSE_NEXT_OMEN', heroId: hero.id, omen })}>{OMENS[omen].title}</button>;
                })}</div>}</article>}
            {cache && !cache.dug && patientStones.length > 0 && <article className="cache-sketch"><h4>Patient Stone sketch</h4>
              <p><b>{cacheFragments} / {patientStones.length} fragments</b></p>
              <small>{cacheFragments === 0 ? 'The page is blank.' : cacheFragments >= patientStones.length
                ? `The complete sketch pinpoints ${cache.position.x}, ${cache.position.y}.`
                : `The search region narrows to roughly ${Math.max(3, 15 - cacheFragments * 2)} tiles across.`}</small>
              <button disabled={hero.movement <= 0} title={hero.movement <= 0 ? 'Digging takes the full day.'
                : 'Dig where this hero stands and spend all remaining movement.'}
                data-disabled-reason={hero.movement <= 0 ? 'Digging takes the full day.' : undefined}
                onClick={() => dispatch({ type: 'DIG_CACHE', position: { ...hero.position } })}>Dig here · spend all movement</button>
            </article>}
            {kit.pieces >= 2 && <article><h4>Tailor&apos;s Kit · {kit.pieces}/4</h4>
              <p><SemanticSpellText>{kit.pieces >= 4 ? 'All stats +2 · all spells Upgraded · all resonances · Unstitch'
                : kit.pieces === 3 ? 'All stats +2 · all spells use Upgraded rules'
                  : 'All stats +2 · essence and seams revealed'}</SemanticSpellText></p>
              {kit.canUnstitch && <button disabled={hero.unstitchUsedWeek === state.week}
                title={hero.unstitchUsedWeek === state.week ? 'Unstitch has already been used this week.'
                  : 'Choose an explored destination.'}
                data-disabled-reason={hero.unstitchUsedWeek === state.week
                  ? 'Unstitch has already been used this week.' : undefined}
                onClick={() => handoff(onUnstitch)}>Unstitch to an explored tile</button>}</article>}
            {hero.debts.map((debt) => <article className="hero-dashboard-debt" key={debt.id}>
              <h4>Debt · {debt.name}</h4><p><SemanticSpellText>{debt.description}</SemanticSpellText></p>
              <small>Triggers in {debtCountdown(debt, state)}</small></article>)}
            {hero.debts.length === 0 && <p className="hero-dashboard-empty-line">No active Debts.</p>}
          </div>
        </section>
      </div>
      <footer className="dialog-actions"><button onClick={close}>Close · return to map</button></footer>
      {renderDetail()}{renderEquipmentDraft()}{renderSplitDraft()}
    </section>
  </div>;
}
