import { useEffect, useRef, useState } from 'react';
import { HERO_MOVE_POINTS } from '../../content/constants';
import { FACTION_PASSIVES } from '../../content/factionPresentation';
import { HEROES } from '../../content/heroes';
import { ITEMS, itemName } from '../../content/items';
import { OMENS } from '../../content/omens';
import { SKILLS } from '../../content/skills';
import { logisticsRate } from '../../core/heroBehaviors';
import { objectEntranceTile } from '../../core/map/occupancy';
import type { Action, GameState, Hero } from '../../core/types';
import { HeroPortrait, ItemSprite } from '../assets';
import { ArmySlots } from './ArmySlots';
import { ArtifactPaperDoll } from './ArtifactPaperDoll';
import { ContentIcon } from './ContentIcon';
import { SemanticSpellText, SpellGlossaryReference } from './SpellGlossary';

type HeroDetailsTab = 'overview' | 'army' | 'equipment' | 'items' | 'skills';

const TABS: Array<{ id: HeroDetailsTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'army', label: 'Army' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'items', label: 'Items' },
  { id: 'skills', label: 'Special skills' },
];

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
  const [tab, setTab] = useState<HeroDetailsTab>('overview');
  const closeRef = useRef<HTMLButtonElement>(null);
  const priorFocus = useRef<HTMLElement | null>(null);
  const definition = HEROES[hero.definitionId];
  const maxMovement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero)));
  const cache = state.map.objects.find((object) => object.kind === 'cache');
  const patientStones = state.map.objects.filter((object) => object.kind === 'patientStone'
    && object.cacheId === cache?.id);
  const stoneFragments = patientStones.filter((stone) => stone.kind === 'patientStone'
    && stone.revealedBy.includes(hero.id)).length;
  const mapBonusFragment = Object.values(hero.artifacts.equipment)
    .some((artifact) => artifact?.id === 'mothEatenMap') ? 1 : 0;
  const cacheFragments = Math.min(patientStones.length, stoneFragments + mapBonusFragment);

  const close = () => {
    onClose();
    requestAnimationFrame(() => priorFocus.current?.focus());
  };

  useEffect(() => {
    priorFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    closeRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape'
          || document.querySelector('.hero-details-dialog .modal-backdrop')) return;
      event.preventDefault();
      close();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return (
    <div className="modal-backdrop hero-details-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="hero-details-dialog" role="dialog" aria-modal="true"
        aria-labelledby="hero-details-heading">
        <header>
          <div className={`hero-details-portrait ${hero.faction}`}>
            <HeroPortrait faction={hero.faction} className="hero-sheet-portrait" />
          </div>
          <div>
            <span className="dialog-kicker">Hero details · dedicated management</span>
            <h2 id="hero-details-heading">{hero.name}</h2>
            <small>Level {hero.level} · {hero.xp} XP</small>
          </div>
          <button ref={closeRef} className="structure-dialog-close" aria-label="Close hero details"
            title="Close hero details" onClick={close}>×</button>
        </header>
        <nav className="hero-details-tabs" aria-label="Hero detail sections">
          {TABS.map((candidate) => <button key={candidate.id}
            className={tab === candidate.id ? 'active' : ''}
            aria-pressed={tab === candidate.id}
            onClick={() => setTab(candidate.id)}>{candidate.label}</button>)}
        </nav>
        <div className="hero-details-body">
          {tab === 'overview' && <section className="hero-details-overview">
            <div className="hero-identity-summary" data-inspect-kind="hero" data-inspect-id={hero.id}>
              <span>{definition.heroClass.replace(/([A-Z])/g, ' $1')} · specialty</span>
              <b><SemanticSpellText>{definition.specialty.description}</SemanticSpellText></b>
              <small><strong>{FACTION_PASSIVES[hero.faction].name}:</strong> {
                <SemanticSpellText>{FACTION_PASSIVES[hero.faction].description}</SemanticSpellText>}</small>
              <small>Right-click the portrait for this hero’s story and complete rules.</small>
            </div>
            <div className="stat-grid">
              <span>Attack <b>{hero.attack}</b></span>
              <span>Defense <b>{hero.defense}</b></span>
              <span>Spell power <b>{hero.spellPower}</b></span>
              <span>Knowledge <b>{hero.knowledge}</b></span>
            </div>
            <div className="hero-details-resource-grid">
              <div><span>Movement</span><b>{hero.movement} / {maxMovement}</b></div>
              <div><span>Mana</span><b>{hero.mana} / {hero.knowledge * 10}</b></div>
            </div>
            <button className="primary" onClick={() => { close(); onOpenSpellbook(); }}>
              Open adventure spellbook
            </button>
          </section>}
          {tab === 'army' && <section>
            <p className="section-instruction">Review every company or split one into an empty slot.
              Transfers to towns and friendly heroes use their dedicated exchange surfaces.</p>
            <ArmySlots army={hero.army} title={`${hero.name} · seven company slots`}
              onSplit={(sourceSlot, destinationSlot, count) => dispatch({
                type: 'SPLIT_ARMY', holder: { kind: 'hero', id: hero.id },
                sourceSlot, destinationSlot, count,
              })} />
          </section>}
          {tab === 'equipment' && <ArtifactPaperDoll state={state} hero={hero}
            dispatch={dispatch} onUnstitch={() => { close(); onUnstitch(); }} />}
          {tab === 'items' && <section className="hero-details-items">
            <p className="section-instruction">Choose a carried item to begin its dedicated target
              or confirmation flow. Combat items remain available during combat.</p>
            <div className="item-inventory">
              <h4>Consumables · {hero.inventory.filter(Boolean).length}/{hero.inventory.length}</h4>
              <div className="army-slots">
                {hero.inventory.map((item, index) => {
                  const definition = item && typeof item !== 'string' ? ITEMS[item.id] : null;
                  const canUse = definition?.use === 'adventure';
                  return <button key={`detail-item-${index}`} className="army-slot"
                    disabled={!canUse}
                    title={!definition ? 'Empty item slot.' : canUse ? definition.description
                      : `${definition.description} This item is used during combat.`}
                    data-inspect-kind={definition ? 'item' : undefined}
                    data-inspect-id={definition?.id}
                    onClick={() => { close(); onUseItem(index); }}>
                    {item && typeof item !== 'string' && <ItemSprite item={item} />}
                    <span>{item ? itemName(item) : '+'}</span>
                  </button>;
                })}
              </div>
            </div>
            {cache && !cache.dug && patientStones.length > 0 && <section className="map-tool-card cache-sketch">
              <h4>Patient Stone sketch</h4>
              <b>{cacheFragments} / {patientStones.length} fragments</b>
              <small>{cacheFragments === 0 ? 'The page is blank.'
                : cacheFragments >= patientStones.length
                  ? 'The complete sketch pinpoints the buried tile.'
                  : `The search region narrows to roughly ${Math.max(3, 15 - cacheFragments * 2)} tiles across.`}</small>
              {cacheFragments >= patientStones.length
                && <small>Mark: {cache.position.x}, {cache.position.y}</small>}
              <button onClick={() => dispatch({
                type: 'DIG_CACHE', position: { ...hero.position },
              })}>Dig here · spend all movement</button>
            </section>}
          </section>}
          {tab === 'skills' && <section className="hero-details-skills">
            {hero.skills.attunement === 3 && <div className="resonance-picker">
              <h4>Declare next battle <SpellGlossaryReference termId="resonance" /></h4>
              {(['rite', 'craft', 'grave', 'wild'] as const).map((school) => <button key={school}
                disabled={hero.attunementResonanceUsedDay === state.day
                  || hero.declaredResonance?.day === state.day}
                title={hero.attunementResonanceUsedDay === state.day
                  || hero.declaredResonance?.day === state.day
                  ? 'A resonance has already been declared or used today.'
                  : `Make the next battle resonate with ${school} magic.`}
                onClick={() => dispatch({ type: 'DECLARE_RESONANCE', heroId: hero.id, school })}>
                {school}</button>)}
            </div>}
            {(hero.skills.ritualist ?? 0) >= 2 && <div className="omen-preview">
              <h4>Ritualist&apos;s forecast</h4>
              <b>{OMENS[state.nextOmen].title}</b>
              {hero.skills.ritualist === 3 && !hero.ritualistOmenChosen && <div>
                {(Object.keys(OMENS) as Array<keyof typeof OMENS>).map((omen) => <button key={omen}
                  onClick={() => dispatch({ type: 'CHOOSE_NEXT_OMEN', heroId: hero.id, omen })}>
                  {OMENS[omen].title}</button>)}
              </div>}
            </div>}
            <div className="skill-summary">
              <h4>Secondary skills <small>· right-click for all ranks</small></h4>
              {Object.entries(hero.skills).map(([skill, rank]) => {
                const skillDefinition = SKILLS[skill as keyof typeof SKILLS];
                return <article key={skill} data-inspect-kind="skill" data-inspect-id={skill}>
                  <div className="content-icon-label"><ContentIcon kind="skill"
                    id={skill as keyof typeof SKILLS} />
                    <b>{skillDefinition.name} · Rank {rank}</b></div>
                  <span><SemanticSpellText>{skillDefinition.ranks[rank as 1 | 2 | 3]}</SemanticSpellText></span>
                </article>;
              })}
              {Object.keys(hero.skills).length === 0 && <small>No secondary skills learned.</small>}
            </div>
          </section>}
        </div>
        <footer className="dialog-actions">
          <button onClick={close}>Close · return to map</button>
        </footer>
      </section>
    </div>
  );
}
