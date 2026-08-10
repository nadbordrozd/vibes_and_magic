import {
  useEffect, useMemo, useState,
} from 'react';
import { incomeForPlayer } from '../../core/game';
import { HERO_MOVE_POINTS } from '../../content/constants';
import {
  animatedAdventurePath, previewPath, reachableAdventureTiles, visitingCastle,
} from '../../core/selectors';
import type {
  Action, Coord, GameState, Hero, MapObject, ResourceId,
} from '../../core/types';
import { ArmySlots } from './ArmySlots';
import {
  ANIMATION_TIMINGS, type AnimationSpeed,
} from '../animation';
import { ExchangeScreen } from './ExchangeScreen';
import { AdventureMap } from './AdventureMap';
import { logisticsRate } from '../../core/heroBehaviors';
import { ITEMS, itemName } from '../../content/items';
import { OMENS, omenEffectSummary } from '../../content/omens';
import { SPELLS } from '../../content/spells';
import { CASTLE_NAMES } from '../../content/factionPresentation';
import { adventureSpellMoveCost } from '../../core/game/adventureSpells';
import type { SpellId } from '../../core/types';
import { AdventureSpellbook } from './AdventureSpellbook';
import { AdventureSpellTargetDialog } from './AdventureSpellTargetDialog';
import {
  type AdventureCastAction, isMapTargetSpell, legalMapTargets, mapDraftAction,
  mapTargetReason, requiredMapTargets,
} from '../adventureSpellTargeting';
import { objectEntranceTile } from '../../core/map/occupancy';
import { ResourceIcon, ResourceRichText } from './ResourceToken';
import { HeroPortrait } from '../assets';
import { AdventureItemDialog } from './AdventureItemDialog';
import {
  adventureItemDraft, legalAdventureItemMapTargets,
} from '../adventureItemPresentation';
import {
  ActionConfirmationDialog, type ActionDraft,
} from './ActionConfirmationDialog';
import { guildSpellCount } from '../../core/game/magic';
import {
  AdventurePalimpsestDialog, AdventureStructureDialog,
} from './AdventureStructureDialog';
import { isContextualStructure } from '../adventureStructureInteractions';
import type { ContextualStructure } from '../adventureStructureInteractions';
import {
  friendlyHeroMeetingCompletion, friendlyHeroMeetingPlan,
} from '../../core/game/navigation';
import { ContentIcon } from './ContentIcon';
import { sameCoord } from '../../core/map/pathfinding';
import { AdventureHeroDetails } from './AdventureHeroDetails';
interface Props {
  state: GameState;
  dispatch: (action: Action) => void;
  onOpenCastle: (castleId: string) => void;
  onMenu: () => void;
  onSave: (slot?: number) => void;
  onExport: () => void;
  onImport: () => void;
  onShare: () => void;
  animationSpeed: AnimationSpeed;
  onAnimationSpeedChange: (speed: AnimationSpeed) => void;
  onMovementStateChange: (moving: boolean) => void;
}


export function AdventureScreen({
  state, dispatch, onOpenCastle, onMenu, onSave, onExport, onImport, onShare,
  animationSpeed, onAnimationSpeedChange, onMovementStateChange,
}: Props) {
  const [preview, setPreview] = useState<Coord | null>(null);
  const [movement, setMovement] = useState<{
    path: Coord[];
    index: number;
    destination: Coord;
  } | null>(null);
  const [previewMeetingHeroId, setPreviewMeetingHeroId] = useState<string | null>(null);
  const [meetingIntent, setMeetingIntent] = useState<{
    sourceHeroId: string;
    targetHeroId: string;
    destination: Coord;
    expectedReplayLength: number;
    status: 'moving' | 'resolving';
  } | null>(null);
  const [meetingNotice, setMeetingNotice] = useState<string | null>(null);
  const [exchangeHeroId, setExchangeHeroId] = useState<string | null>(null);
  const [usingItemSlot, setUsingItemSlot] = useState<number | null>(null);
  const [choosingItemSlot, setChoosingItemSlot] = useState<number | null>(null);
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null);
  const [spellbookOpen, setSpellbookOpen] = useState(false);
  const [castingSpell, setCastingSpell] = useState<{
    spellId: SpellId; positions: Coord[];
  } | null>(null);
  const [spellDraft, setSpellDraft] = useState<AdventureCastAction | null>(null);
  const [castingError, setCastingError] = useState<string | null>(null);
  const [unstitching, setUnstitching] = useState(false);
  const [worldView, setWorldView] = useState(false);
  const [heroDetailsOpen, setHeroDetailsOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [minimapHost, setMinimapHost] = useState<HTMLDivElement | null>(null);
  const [confirmTitleExit, setConfirmTitleExit] = useState(false);
  const [dismissedStructureVisit, setDismissedStructureVisit] = useState<string | null>(null);
  const [objectiveOpen, setObjectiveOpen] = useState(state.day === 1 && state.replay.length === 0);
  const player = state.players[state.activePlayer];
  const hero = player.hero;
  const reachable = useMemo(() => reachableAdventureTiles(state), [state]);
  const meetingPreview = useMemo(() => previewMeetingHeroId
    ? friendlyHeroMeetingPlan(state, previewMeetingHeroId) : null,
  [state, previewMeetingHeroId]);
  const path = useMemo(
    () => meetingPreview ? meetingPreview.ok ? meetingPreview.plan.path : []
      : preview ? previewPath(state, preview) : hero?.pathMemory ?? [],
    [state, preview, hero, meetingPreview],
  );
  const castleHere = visitingCastle(state);
  const ownedCastles = state.castles.filter((castle) => castle.owner === state.activePlayer);
  const income = incomeForPlayer(state, state.activePlayer);
  const timing = ANIMATION_TIMINGS[animationSpeed];
  const legalSpellTargets = useMemo(() => hero && castingSpell
    ? legalMapTargets(state, hero, castingSpell.spellId, castingSpell.positions)
    : undefined, [state, hero, castingSpell]);
  const legalItemTargets = useMemo(() => hero && usingItemSlot !== null
    ? legalAdventureItemMapTargets(state, hero, usingItemSlot) : undefined,
  [state, hero, usingItemSlot]);
  const maxMovement = hero
    ? Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero))) : HERO_MOVE_POINTS;
  const serviceObject = hero ? state.map.objects.find((object): object is ContextualStructure =>
    objectEntranceTile(object).x === hero.position.x
    && objectEntranceTile(object).y === hero.position.y
    && isContextualStructure(object)) : undefined;
  const palimpsestSite = hero && (hero.skills.palimpsest ?? 0) > 0
    ? castleHere && guildSpellCount(castleHere) > 0 ? castleHere
      : (hero.skills.palimpsest ?? 0) >= 3
        ? state.map.objects.find((object): object is Extract<MapObject, { kind: 'shrine' }> => object.kind === 'shrine' && object.cleared
          && objectEntranceTile(object).x === hero.position.x
          && objectEntranceTile(object).y === hero.position.y)
        : undefined
    : undefined;
  const structureVisitKey = hero && serviceObject ? `${hero.id}:structure:${serviceObject.id}`
    : hero && palimpsestSite ? `${hero.id}:palimpsest:${palimpsestSite.id}` : null;
  const structureDialogOpen = Boolean(structureVisitKey
    && dismissedStructureVisit !== structureVisitKey
    && !objectiveOpen && !state.pendingChoice && !actionDraft
    && !heroDetailsOpen && !commandMenuOpen);
  const endTurn = () => {
    if (movement || player.controller !== 'human') return;
    dispatch({ type: 'END_TURN' });
  };
  const closeStructureDialog = () => setDismissedStructureVisit(structureVisitKey);
  const restoreContextFocus = () => requestAnimationFrame(() => {
    const nextDialogControl = document.querySelector<HTMLButtonElement>(
      '.modal-backdrop button:not(:disabled)',
    );
    (nextDialogControl ?? document.querySelector<HTMLElement>('.map-frame'))?.focus();
  });

  useEffect(() => {
    if (!structureVisitKey) setDismissedStructureVisit(null);
  }, [structureVisitKey]);

  useEffect(() => {
    if (!movement) return;
    if (movement.index < movement.path.length - 1) {
      const delay = movement.index === 0 ? 20 : timing.mapStep;
      const timer = setTimeout(() => setMovement((current) => current && ({
        ...current,
        index: current.index + 1,
      })), delay);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      const destination = movement.destination;
      setMovement(null);
      onMovementStateChange(false);
      setMeetingIntent((current) => current ? { ...current, status: 'resolving' } : current);
      dispatch({ type: 'MOVE_HERO', destination });
    }, timing.mapStep);
    return () => clearTimeout(timer);
  }, [movement, timing.mapStep, dispatch, onMovementStateChange]);

  useEffect(() => {
    if (!meetingIntent || meetingIntent.status !== 'resolving'
        || state.replay.length < meetingIntent.expectedReplayLength) return;
    const target = Object.values(state.players).flatMap((owner) => owner.heroes)
      .find((candidate) => candidate.id === meetingIntent.targetHeroId);
    const completion = friendlyHeroMeetingCompletion(
      state, meetingIntent.sourceHeroId, meetingIntent.targetHeroId, meetingIntent.destination,
    );
    if (!completion.ok) {
      setMeetingNotice(`Meeting did not complete · ${completion.reason}`);
      setMeetingIntent(null);
      return;
    }
    const sourceName = Object.values(state.players).flatMap((owner) => owner.heroes)
      .find((candidate) => candidate.id === meetingIntent.sourceHeroId)?.name ?? 'The hero';
    setMeetingNotice(`${sourceName} reached ${target?.name ?? 'the other hero'}; exchange is ready.`);
    setMeetingIntent(null);
    setExchangeHeroId(meetingIntent.targetHeroId);
  }, [meetingIntent, state]);

  const exchangeHero = exchangeHeroId
    ? player.heroes.find((candidate) => candidate.id === exchangeHeroId && candidate.alive) : null;
  useEffect(() => {
    if (!exchangeHeroId) return;
    const valid = Boolean(hero && exchangeHero && hero.owner === exchangeHero.owner
      && !sameCoord(hero.position, exchangeHero.position)
      && Math.max(Math.abs(hero.position.x - exchangeHero.position.x),
        Math.abs(hero.position.y - exchangeHero.position.y)) <= 1);
    if (!valid) {
      setExchangeHeroId(null);
      setMeetingNotice('Exchange closed · the heroes are no longer friendly and adjacent.');
    }
  }, [exchangeHeroId, exchangeHero, hero]);

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'm'
          && !document.querySelector('.modal-backdrop, .inspection-backdrop, .help-backdrop')) {
        setWorldView((value) => !value);
      }
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

  useEffect(() => {
    if (!commandMenuOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.querySelector<HTMLButtonElement>('.command-menu-dialog .structure-dialog-close')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setCommandMenuOpen(false);
      requestAnimationFrame(() => previous?.focus());
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [commandMenuOpen]);

  useEffect(() => {
    const endTurnKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || state.pendingChoice || objectiveOpen || spellbookOpen
          || document.querySelector('.help-dialog, .inspection-card, .modal-backdrop')) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, input, select, textarea, [contenteditable="true"]')) return;
      event.preventDefault();
      endTurn();
    };
    window.addEventListener('keydown', endTurnKey);
    return () => window.removeEventListener('keydown', endTurnKey);
  }, [objectiveOpen, spellbookOpen, state.pendingChoice, movement, player.controller]);

  const clickTile = (destination: Coord) => {
    if (!hero || player.controller !== 'human' || movement || structureDialogOpen
        || heroDetailsOpen || commandMenuOpen) return;
    if (unstitching) {
      dispatch({ type: 'UNSTITCH', heroId: hero.id, destination });
      setUnstitching(false);
      return;
    }
    if (castingSpell) {
      const { spellId } = castingSpell;
      const invalid = mapTargetReason(state, hero, spellId, destination, castingSpell.positions);
      if (invalid) { setCastingError(invalid); return; }
      setCastingError(null);
      const positions = [...castingSpell.positions, destination];
      const needed = requiredMapTargets(hero, spellId);
      if (needed !== null && positions.length >= needed) {
        setSpellDraft(mapDraftAction(spellId, hero, positions));
        setCastingSpell(null);
      } else setCastingSpell({ spellId, positions });
      return;
    }
    if (usingItemSlot !== null) {
      setActionDraft(adventureItemDraft(state, hero, usingItemSlot, destination));
      setUsingItemSlot(null);
      return;
    }
    setPreviewMeetingHeroId(null);
    const movingPath = animatedAdventurePath(state, destination);
    if (timing.mapStep === 0 || movingPath.length < 2) {
      dispatch({ type: 'MOVE_HERO', destination });
    } else {
      onMovementStateChange(true);
      setMovement({ path: movingPath, index: 0, destination });
    }
    setPreview(null);
  };

  const meetHero = (targetHeroId: string) => {
    if (!hero || player.controller !== 'human' || movement || structureDialogOpen
        || objectiveOpen || state.pendingChoice || actionDraft || exchangeHeroId
        || heroDetailsOpen || commandMenuOpen) return;
    const result = friendlyHeroMeetingPlan(state, targetHeroId);
    if (!result.ok) {
      setMeetingNotice(`Meeting unavailable · ${result.reason}`);
      return;
    }
    const { plan } = result;
    setPreviewMeetingHeroId(null);
    setPreview(null);
    if (plan.adjacent) {
      setMeetingNotice(`${hero.name} and ${player.heroes.find((candidate) =>
        candidate.id === targetHeroId)?.name ?? 'the other hero'} are already adjacent.`);
      setExchangeHeroId(targetHeroId);
      return;
    }
    const movingPath = animatedAdventurePath(state, plan.destination);
    if (movingPath.length < 2) {
      setMeetingNotice('Meeting unavailable · not enough movement to take the first safe step.');
      return;
    }
    const intent = {
      sourceHeroId: hero.id, targetHeroId, destination: plan.destination,
      expectedReplayLength: state.replay.length + 1,
      status: timing.mapStep === 0 ? 'resolving' as const : 'moving' as const,
    };
    setMeetingIntent(intent);
    setMeetingNotice(plan.cost <= hero.movement
      ? `Meeting ${player.heroes.find((candidate) => candidate.id === targetHeroId)?.name}…`
      : `Route set, but ${hero.name} cannot reach the meeting tile today.`);
    if (timing.mapStep === 0) dispatch({ type: 'MOVE_HERO', destination: plan.destination });
    else {
      onMovementStateChange(true);
      setMovement({ path: movingPath, index: 0, destination: plan.destination });
    }
  };

  const chooseAdventureSpell = (spellId: SpellId) => {
    if (!hero) return;
    setSpellbookOpen(false);
    setCastingError(null);
    if (isMapTargetSpell(spellId)) {
      setCastingSpell({ spellId, positions: [] });
      return;
    }
    const action: Extract<Action, { type: 'CAST_ADVENTURE_SPELL' }> = {
      type: 'CAST_ADVENTURE_SPELL', spellId,
    };
    if (spellId === 'beastTongue' && !hero.upgradedSpells.includes(spellId)) action.recruit = false;
    setSpellDraft(action);
  };

  useEffect(() => {
    if (!castingSpell && !spellDraft) return;
    const cancelCasting = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setCastingSpell(null);
      setSpellDraft(null);
      setCastingError(null);
    };
    window.addEventListener('keydown', cancelCasting);
    return () => window.removeEventListener('keydown', cancelCasting);
  }, [castingSpell, spellDraft]);

  return (
    <main className="game-shell">
      <header className="adventure-status-strip">
        <div className="turn-badge">
          <span>Week {state.week}</span>
          <b>Day {((state.day - 1) % 7) + 1}</b>
        </div>
        <div className="resource-bar">
          {(Object.keys(player.resources) as ResourceId[]).map((resource) => (
            <div key={resource} title={`Daily income: +${income[resource]}`}>
              <ResourceIcon resource={resource} />
              <b>{player.resources[resource].toLocaleString()}</b>
              <small>+{income[resource]}</small>
            </div>
          ))}
        </div>
        <div className={`player-chip ${player.faction}`}>
          <i /> {player.name}
        </div>
        <button className={`omen-chip ${state.omen}`} data-inspect-kind="omen"
          data-inspect-id={state.omen} title={`${state.omenAnnouncement.flavor} ${
            omenEffectSummary(OMENS[state.omen]).join(' ')}`}>
          <span>Omen</span><b>{state.omenAnnouncement.title}</b>
        </button>
      </header>

      <div className={`adventure-layout ${worldView ? 'world-view' : ''}`}>
        <AdventureMap
          state={state} hero={hero} reachable={reachable} path={path}
          movement={movement} mapStep={timing.mapStep} onTile={clickTile}
          targetTiles={legalSpellTargets ?? legalItemTargets}
          selectedTargetTiles={castingSpell?.positions}
          minimapHost={minimapHost}
          onSelectHero={(heroId) => {
            if (!movement && !structureDialogOpen && player.controller === 'human') {
              dispatch({ type: 'SELECT_HERO', heroId });
            }
          }}
          onMeetHero={meetHero}
          onPreviewHero={setPreviewMeetingHeroId}
          onPreview={(destination) => {
            setPreviewMeetingHeroId(null); setPreview(destination);
          }}
          onPickup={(objectId) => {
            if (!structureDialogOpen) dispatch({ type: 'PICKUP_OBJECT', objectId });
          }}
        />

        {hero && (castingSpell || usingItemSlot !== null || unstitching) && <div
          className="map-context-card" role="status" aria-live="polite">
          {castingSpell && <div className="map-cast-prompt">
            <b className="content-icon-label"><ContentIcon kind="spell"
              id={castingSpell.spellId} />{SPELLS[castingSpell.spellId].name} · choose targets</b>
            <span>{SPELLS[castingSpell.spellId][hero.upgradedSpells.includes(castingSpell.spellId)
              ? 'plus' : 'base']}</span>
            <span>{SPELLS[castingSpell.spellId].mana} mana · {adventureSpellMoveCost(hero)} movement
              · nothing is spent until confirmation.</span>
            <span>Chosen {castingSpell.positions.length}{requiredMapTargets(hero, castingSpell.spellId)
              !== null ? ` of ${requiredMapTargets(hero, castingSpell.spellId)}` : ''}</span>
            {legalSpellTargets?.size === 0 && <small className="spell-target-reason">
              No legal target is currently available.</small>}
            {castingError && <small className="spell-target-reason">Not a legal target · {
              castingError}</small>}
            <div>
              <button disabled={!castingSpell.positions.length}
                title={!castingSpell.positions.length ? 'No selected tile to remove.'
                  : 'Remove the latest selected tile.'}
                onClick={() => setCastingSpell({ ...castingSpell,
                  positions: castingSpell.positions.slice(0, -1) })}>Undo last</button>
              {castingSpell.spellId === 'murmuration' && <button className="primary"
                disabled={!castingSpell.positions.length}
                title={!castingSpell.positions.length ? 'Choose at least one scouting step.'
                  : 'Review the drawn path before casting.'} onClick={() => {
                  setSpellDraft(mapDraftAction(castingSpell.spellId, hero, castingSpell.positions));
                  setCastingSpell(null);
                }}>Review path</button>}
              <button onClick={() => { setCastingSpell(null); setSpellbookOpen(true); }}>
                Spellbook</button>
              <button onClick={() => setCastingSpell(null)}>Cancel</button>
            </div>
          </div>}
          {usingItemSlot !== null && (() => {
            const selected = hero.inventory[usingItemSlot];
            const selectedDefinition = selected && typeof selected !== 'string'
              ? ITEMS[selected.id] : null;
            return <div className="map-item-target-prompt">
              <b>{selected ? itemName(selected) : 'Adventure item'} · choose a target</b>
              <span>{selectedDefinition?.behavior === 'impassableStep'
                ? 'Highlighted landings cross one to three impassable tiles.'
                : 'Highlighted map centers are within three tiles of explored land.'}</span>
              <span>Nothing is consumed until review and confirmation.</span>
              {legalItemTargets?.size === 0 && <small>Unavailable · no legal target is visible.</small>}
              <button onClick={() => setUsingItemSlot(null)}>Cancel · keep item</button>
            </div>;
          })()}
          {unstitching && <div className="map-cast-prompt">
            <b>Unstitching the road</b><span>Select any explored, passable tile.</span>
            <button onClick={() => setUnstitching(false)}>Cancel</button>
          </div>}
        </div>}

        <aside className="hero-panel">
          <div className="rail-minimap" ref={setMinimapHost}>
            <span>World map</span>
          </div>
          <section className="rail-navigation" aria-label="Hero and town navigation">
            <div className="panel-heading"><span>Heroes</span>
              <button disabled={!hero || Boolean(movement)}
                title={movement ? 'Wait for movement to finish.' : 'Select the next living hero.'}
                onClick={() => dispatch({ type: 'NEXT_HERO' })}>Next</button>
            </div>
            <div className="hero-list">
            {player.heroes.filter((candidate) => candidate.alive).map((candidate) => (
              <button
                key={candidate.id}
                data-inspect-kind="hero" data-inspect-id={candidate.id}
                className={candidate.id === hero?.id ? 'selected' : ''}
                disabled={Boolean(movement)}
                title={movement ? 'Wait for the current hero to finish moving.' : `Select ${candidate.name}.`}
                onClick={() => dispatch({ type: 'SELECT_HERO', heroId: candidate.id })}
              >
                <HeroPortrait faction={candidate.faction} className="hero-list-portrait" />
                <span><b>{candidate.name}</b><small>{candidate.movement} move</small></span>
              </button>
            ))}
            </div>
            <div className="town-list" aria-label="Owned towns">
              {ownedCastles.map((castle) => <button key={castle.id}
                className={castleHere?.id === castle.id ? 'hero-present' : ''}
                disabled={Boolean(movement)} title={`${castleHere?.id === castle.id ? 'Enter' : 'View'} ${
                  CASTLE_NAMES[castle.faction]}.`} onClick={() => onOpenCastle(castle.id)}>
                <span>{castleHere?.id === castle.id ? 'Enter' : 'Town'}</span>
                <b>{CASTLE_NAMES[castle.faction]}</b>
              </button>)}
            </div>
          </section>
          {hero && (
            <section className="rail-hero-summary">
              <div className="hero-portrait" data-inspect-kind="hero" data-inspect-id={hero.id}>
                <div className={hero.faction}><HeroPortrait faction={hero.faction}
                  className="hero-sheet-portrait" /></div>
                <span><b>{hero.name}</b><small>Level {hero.level}</small></span>
              </div>
              <div className="meter-label"><span>Move</span><b>{hero.movement}/{maxMovement}</b></div>
              <div className="meter"><i style={{ width: `${Math.min(100,
                hero.movement / maxMovement * 100)}%` }} /></div>
              <div className="meter-label"><span>Mana</span><b>{hero.mana}/{hero.knowledge * 10}</b></div>
              <div className="meter mana"><i style={{ width: `${Math.min(100, hero.mana / Math.max(1,
                hero.knowledge * 10) * 100)}%` }} /></div>
              <ArmySlots army={hero.army} title="Army" />
            </section>
          )}
          <div className="rail-commands" aria-label="Primary adventure commands">
            <button disabled={!hero} title={!hero ? 'There is no living hero to inspect.'
              : 'Open detailed hero management.'}
              onClick={() => setHeroDetailsOpen(true)}>Hero details</button>
            <button className="adventure-spell-button" disabled={!hero
              || !hero.knownSpells.some((id) => ['adventure', 'topology'].includes(SPELLS[id].kind))}
              title={!hero ? 'No living hero.'
                : !hero.knownSpells.some((id) => ['adventure', 'topology'].includes(SPELLS[id].kind))
                  ? 'This hero knows no adventure spells.' : 'Open this hero’s map spells.'}
              onClick={() => setSpellbookOpen(true)}>Spellbook</button>
            <button onClick={() => setWorldView((value) => !value)}>
              {worldView ? 'Close world view' : 'World view'}</button>
            <button onClick={() => setObjectiveOpen(true)}>Objective</button>
            <button onClick={() => setCommandMenuOpen(true)}>Menu &amp; saves</button>
            {hero && player.heroes.filter((candidate) => candidate.id !== hero.id && candidate.alive
              && Math.max(Math.abs(candidate.position.x - hero.position.x),
                Math.abs(candidate.position.y - hero.position.y)) <= 1)
              .map((candidate) => <button key={`exchange-${candidate.id}`}
                onClick={() => setExchangeHeroId(candidate.id)}>Exchange · {candidate.name}</button>)}
          </div>
          {player.castlelessDays > 0 && (
            <div className="loss-countdown">
              No castle: {7 - player.castlelessDays} day{
                7 - player.castlelessDays === 1 ? '' : 's'
              } remaining
            </div>
          )}
          <button
            className="primary wide end-turn"
            disabled={player.controller !== 'human' || Boolean(movement)}
            title={player.controller !== 'human' ? 'Only a human player can end the turn manually.'
              : movement ? 'Wait for the hero to finish moving.' : 'End this player’s day.'}
            onClick={endTurn}
          >
            End turn <kbd>Space</kbd>
          </button>
          {state.map.victory.type === 'none' && (
            <button className="secondary wide" onClick={() => dispatch({ type: 'RETIRE' })}>
              Retire · end expedition
            </button>
          )}
          {meetingNotice && <div className="meeting-status" role="status" aria-live="polite">
            {meetingNotice}
          </div>}
          <div className="message-strip" aria-live="polite"><ResourceRichText>{state.lastMessage}</ResourceRichText></div>
        </aside>
      </div>
      {objectiveOpen && (
        <div className="modal-backdrop choice-backdrop"><section className="choice-dialog">
          <span className="dialog-kicker">{state.map.name}</span>
          <h2>Your objective</h2><p>{state.map.victory.flavor}</p>
          <b>{state.map.victory.mechanics}</b>
          <div className="objective-primer">
            <span>Click a hero, hover a destination to preview the route, then click once to travel.</span>
            <span>Crossed swords mean a fight. Right-click anything for its complete rules.</span>
            <span>Use <b>? Help</b> at any time for the current screen and glossary.</span>
          </div>
          <button className="primary" onClick={() => setObjectiveOpen(false)}>Take the field</button>
        </section></div>
      )}
      {hero && heroDetailsOpen && <AdventureHeroDetails state={state} hero={hero}
        dispatch={dispatch} onClose={() => setHeroDetailsOpen(false)}
        onOpenSpellbook={() => setSpellbookOpen(true)}
        onUnstitch={() => setUnstitching(true)}
        onUseItem={(index) => {
          const item = hero.inventory[index];
          const definition = item && typeof item !== 'string' ? ITEMS[item.id] : null;
          if (!definition) return;
          if (['reveal', 'impassableStep'].includes(definition.behavior)) setUsingItemSlot(index);
          else if (['remoteMovement', 'militiaWrit'].includes(definition.behavior)) {
            setChoosingItemSlot(index);
          } else setActionDraft(adventureItemDraft(state, hero, index));
        }} />}
      {commandMenuOpen && <div className="modal-backdrop command-menu-backdrop"
        onMouseDown={(event) => event.target === event.currentTarget && setCommandMenuOpen(false)}>
        <section className="command-menu-dialog" role="dialog" aria-modal="true"
          aria-labelledby="command-menu-heading">
          <header><div><span className="dialog-kicker">Adventure commands</span>
            <h2 id="command-menu-heading">Menu &amp; saves</h2></div>
            <button className="structure-dialog-close" aria-label="Close command menu"
              onClick={() => setCommandMenuOpen(false)}>×</button></header>
          <div className="command-menu-grid">
            <section><h3>Save campaign</h3>
              <button className="primary" disabled={Boolean(movement)}
                title={movement ? 'Wait for the hero to finish moving.' : 'Save to the quick-save slot.'}
                onClick={() => onSave()}>
                Quick save</button>
              <div className="manual-save-grid">{[1, 2, 3].map((slot) => <button key={slot}
                disabled={Boolean(movement)} title={movement ? 'Wait for the hero to finish moving.'
                  : `Save to manual slot ${slot}.`}
                onClick={() => onSave(slot)}>Save slot {slot}</button>)}</div>
            </section>
            <section><h3>Campaign file</h3>
              <button onClick={onExport}>Export save</button>
              <button onClick={onImport}>Import save</button>
              <button onClick={onShare}>Copy share link</button>
            </section>
            <section><h3>Presentation</h3>
              <label>Movement speed<select value={animationSpeed}
                onChange={(event) => onAnimationSpeedChange(event.target.value as AnimationSpeed)}>
                <option value="instant">Off</option><option value="fast">Fast</option>
                <option value="normal">Normal</option><option value="slow">Slow</option>
              </select></label>
              <button onClick={() => { setCommandMenuOpen(false); setConfirmTitleExit(true); }}>
                Return to title…</button>
            </section>
          </div>
          <details className="activity-log"><summary>Activity log · {state.eventLog.length} entries</summary>
            <div>{state.eventLog.slice(-12).reverse().map((entry, index) => <p
              key={`${entry}-${index}`}><ResourceRichText>{entry}</ResourceRichText></p>)}</div>
          </details>
          <footer className="dialog-actions"><button onClick={() => setCommandMenuOpen(false)}>
            Close · return to map</button></footer>
        </section>
      </div>}
      {hero && exchangeHero && (
        <ExchangeScreen
          source={hero}
          destination={exchangeHero}
          dispatch={dispatch}
          onClose={() => setExchangeHeroId(null)}
        />
      )}
      {hero && spellbookOpen && (
        <AdventureSpellbook
          state={state} onClose={() => setSpellbookOpen(false)}
          onCast={chooseAdventureSpell}
        />
      )}
      {hero && spellDraft && (
        <AdventureSpellTargetDialog state={state} action={spellDraft}
          onChange={setSpellDraft}
          onConfirm={() => {
            dispatch(spellDraft);
            setSpellDraft(null);
          }}
          onBack={() => { setSpellDraft(null); setSpellbookOpen(true); }}
          onCancel={() => setSpellDraft(null)} />
      )}
      {hero && choosingItemSlot !== null && hero.inventory[choosingItemSlot]
        && typeof hero.inventory[choosingItemSlot] !== 'string' && (
        <AdventureItemDialog state={state} hero={hero} inventorySlot={choosingItemSlot}
          onDraft={(draft) => { setChoosingItemSlot(null); setActionDraft(draft); }}
          onCancel={() => setChoosingItemSlot(null)} />
      )}
      {actionDraft && (
        <ActionConfirmationDialog state={state} draft={actionDraft}
          onCancel={() => { setActionDraft(null); restoreContextFocus(); }}
          onConfirm={() => {
            dispatch(actionDraft.action); setActionDraft(null); restoreContextFocus();
          }} />
      )}
      {hero && serviceObject && structureDialogOpen && (
        <AdventureStructureDialog state={state} hero={hero} object={serviceObject}
          onClose={closeStructureDialog}
          onDraft={(draft) => { closeStructureDialog(); setActionDraft(draft); }} />
      )}
      {hero && !serviceObject && palimpsestSite && structureDialogOpen && (
        <AdventurePalimpsestDialog state={state} hero={hero} site={palimpsestSite}
          onClose={closeStructureDialog}
          onDraft={(draft) => { closeStructureDialog(); setActionDraft(draft); }} />
      )}
      {confirmTitleExit && <div className="modal-backdrop title-exit-backdrop">
        <section className="choice-dialog title-exit-dialog" role="alertdialog"
          aria-modal="true" aria-labelledby="title-exit-heading">
          <span className="dialog-kicker">Leave active campaign?</span>
          <h2 id="title-exit-heading">Return to title</h2>
          <p>Only saved progress can be recovered. Progress since your latest quick, manual,
            or turn-end autosave — or the entire campaign if no save exists — will be discarded.</p>
          <div className="dialog-actions">
            <button onClick={() => setConfirmTitleExit(false)}>Cancel — keep playing</button>
            <button className="primary" onClick={onMenu}>Leave and return to title</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
