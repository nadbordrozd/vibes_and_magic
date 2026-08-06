import {
  useEffect, useMemo, useState,
} from 'react';
import { incomeForPlayer } from '../../core/game';
import { HERO_MOVE_POINTS } from '../../content/constants';
import {
  animatedAdventurePath, previewPath, reachableAdventureTiles, visitingCastle,
} from '../../core/selectors';
import type {
  Action, Coord, GameState, Hero, ResourceId,
} from '../../core/types';
import { ArmySlots } from './ArmySlots';
import {
  ANIMATION_TIMINGS, type AnimationSpeed,
} from '../animation';
import { ExchangeScreen } from './ExchangeScreen';
import { AdventureMap } from './AdventureMap';
import { logisticsRate } from '../../core/heroBehaviors';
import { ITEMS, itemName } from '../../content/items';
import { ArtifactPaperDoll } from './ArtifactPaperDoll';
import { OMENS, omenEffectSummary } from '../../content/omens';
import { SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import { ARTIFACTS } from '../../content/artifacts';
import { HEROES } from '../../content/heroes';
import { SKILLS } from '../../content/skills';
import { CASTLE_NAMES, FACTION_PASSIVES } from '../../content/factionPresentation';
import { adventureSpellMoveCost } from '../../core/game/adventureSpells';
import type { SpellId } from '../../core/types';
import { AdventureSpellbook } from './AdventureSpellbook';
import { AdventureSpellTargetDialog } from './AdventureSpellTargetDialog';
import {
  type AdventureCastAction, isMapTargetSpell, legalMapTargets, mapDraftAction,
  mapTargetReason, requiredMapTargets,
} from '../adventureSpellTargeting';
import { objectEntranceTile } from '../../core/map/occupancy';
import {
  ResourceAmount, ResourceCost, ResourceIcon, ResourceRichText,
} from './ResourceToken';
import { HeroPortrait } from '../assets';
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
  const [exchangeHeroId, setExchangeHeroId] = useState<string | null>(null);
  const [usingItemSlot, setUsingItemSlot] = useState<number | null>(null);
  const [spellbookOpen, setSpellbookOpen] = useState(false);
  const [castingSpell, setCastingSpell] = useState<{
    spellId: SpellId; positions: Coord[];
  } | null>(null);
  const [spellDraft, setSpellDraft] = useState<AdventureCastAction | null>(null);
  const [castingError, setCastingError] = useState<string | null>(null);
  const [unstitching, setUnstitching] = useState(false);
  const [worldView, setWorldView] = useState(false);
  const [confirmTitleExit, setConfirmTitleExit] = useState(false);
  const [objectiveOpen, setObjectiveOpen] = useState(state.day === 1 && state.replay.length === 0);
  const player = state.players[state.activePlayer];
  const hero = player.hero;
  const reachable = useMemo(() => reachableAdventureTiles(state), [state]);
  const path = useMemo(
    () => preview ? previewPath(state, preview) : hero?.pathMemory ?? [],
    [state, preview, hero],
  );
  const castleHere = visitingCastle(state);
  const ownedCastles = state.castles.filter((castle) => castle.owner === state.activePlayer);
  const income = incomeForPlayer(state, state.activePlayer);
  const timing = ANIMATION_TIMINGS[animationSpeed];
  const legalSpellTargets = useMemo(() => hero && castingSpell
    ? legalMapTargets(state, hero, castingSpell.spellId, castingSpell.positions)
    : undefined, [state, hero, castingSpell]);
  const maxMovement = hero
    ? Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero))) : HERO_MOVE_POINTS;
  const serviceObject = hero ? state.map.objects.find((object) =>
    objectEntranceTile(object).x === hero.position.x
    && objectEntranceTile(object).y === hero.position.y
    && ['dwelling', 'tinkersCart', 'monastery', 'gloamingRing', 'chrysalis',
      'bridge', 'hedgeSchool', 'reliquaryCairn', 'mercenaryCamp', 'wagonCamp',
      'titheBarn'].includes(object.kind)) : undefined;
  const cache = state.map.objects.find((object) => object.kind === 'cache');
  const patientStones = state.map.objects.filter((object) => object.kind === 'patientStone'
    && object.cacheId === cache?.id);
  const stoneFragments = hero ? patientStones.filter((stone) =>
    stone.kind === 'patientStone' && stone.revealedBy.includes(hero.id)).length : 0;
  const mapBonusFragment = hero && Object.values(hero.artifacts.equipment)
    .some((artifact) => artifact?.id === 'mothEatenMap') ? 1 : 0;
  const cacheFragments = Math.min(patientStones.length, stoneFragments + mapBonusFragment);
  const heroDefinition = hero ? HEROES[hero.definitionId] : null;
  const endTurn = () => {
    if (movement || player.controller !== 'human') return;
    dispatch({ type: 'END_TURN' });
  };

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
      dispatch({ type: 'MOVE_HERO', destination });
    }, timing.mapStep);
    return () => clearTimeout(timer);
  }, [movement, timing.mapStep, dispatch, onMovementStateChange]);

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'm') setWorldView((value) => !value);
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

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
    if (!hero || player.controller !== 'human' || movement) return;
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
      dispatch({
        type: 'USE_ADVENTURE_ITEM', inventorySlot: usingItemSlot,
        target: destination,
      });
      setUsingItemSlot(null);
      return;
    }
    const movingPath = animatedAdventurePath(state, destination);
    if (timing.mapStep === 0 || movingPath.length < 2) {
      dispatch({ type: 'MOVE_HERO', destination });
    } else {
      onMovementStateChange(true);
      setMovement({ path: movingPath, index: 0, destination });
    }
    setPreview(null);
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
      <header className="topbar">
        <button className="wordmark" title="Return to title"
          onClick={() => setConfirmTitleExit(true)}>BM</button>
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
        <label className="animation-speed">
          Motion
          <select
            value={animationSpeed}
            onChange={(event) => onAnimationSpeedChange(event.target.value as AnimationSpeed)}
          >
            <option value="instant">Off</option>
            <option value="fast">Fast</option>
            <option value="normal">Normal</option>
            <option value="slow">Slow</option>
          </select>
        </label>
        <button className="topbar-action" disabled={Boolean(movement)}
          title={movement ? 'Wait for the hero to finish moving.' : 'Save to the quick-save slot.'}
          onClick={() => onSave()}>Save</button>
        {[1, 2, 3].map((slot) => <button key={slot} className="topbar-action save-slot"
          disabled={Boolean(movement)} title={movement ? 'Wait for the hero to finish moving.' : `Save to manual slot ${slot}.`}
          onClick={() => onSave(slot)}>S{slot}</button>)}
        <button className="topbar-action" onClick={onExport}>Export</button>
        <button className="topbar-action" onClick={onImport}>Import</button>
        <button className="topbar-action" onClick={onShare}>Share</button>
      </header>
      <div className={`omen-banner ${state.omen}`} data-inspect-kind="omen" data-inspect-id={state.omen}>
        <b>{state.omenAnnouncement.title}</b>
        <span>{state.omenAnnouncement.flavor} · {omenEffectSummary(OMENS[state.omen]).join(' ')}</span>
      </div>
      <div className="objective-banner">
        <b>{state.map.victory.flavor}</b><span>{state.map.victory.mechanics}</span>
        <button onClick={() => setWorldView((value) => !value)}>M · World view</button>
      </div>

      <div className={`adventure-layout ${worldView ? 'world-view' : ''}`}>
        <AdventureMap
          state={state} hero={hero} reachable={reachable} path={path}
          movement={movement} mapStep={timing.mapStep} onTile={clickTile}
          targetTiles={legalSpellTargets}
          selectedTargetTiles={castingSpell?.positions}
          onSelectHero={(heroId) => {
            if (!movement && player.controller === 'human') {
              dispatch({ type: 'SELECT_HERO', heroId });
            }
          }}
          onPreview={setPreview}
          onPickup={(objectId) => dispatch({ type: 'PICKUP_OBJECT', objectId })}
        />

        <aside className="hero-panel">
          <div className="panel-heading">
            <span>Field command</span>
            <b>{hero ? hero.name : 'No living hero'}</b>
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
                <span><b>{candidate.name}</b><small>Move {candidate.movement}</small></span>
              </button>
            ))}
          </div>
          {hero && (
            <>
              <div className="hero-portrait" data-inspect-kind="hero" data-inspect-id={hero.id}>
                <div className={hero.faction}><HeroPortrait faction={hero.faction}
                  className="hero-sheet-portrait" /></div>
                <span><b>{hero.name} · Level {hero.level}</b><small>{hero.xp} XP</small></span>
              </div>
              {heroDefinition && <section className="hero-identity-summary">
                <span>{heroDefinition.heroClass.replace(/([A-Z])/g, ' $1')} · specialty</span>
                <b>{heroDefinition.specialty.description}</b>
                <small><strong>{FACTION_PASSIVES[hero.faction].name}:</strong> {FACTION_PASSIVES[hero.faction].description}</small>
                <small>Right-click the portrait for this hero’s story and complete rules.</small>
              </section>}
              <div className="stat-grid">
                <span>Attack <b>{hero.attack}</b></span>
                <span>Defense <b>{hero.defense}</b></span>
                <span>Spell power <b>{hero.spellPower}</b></span>
                <span>Knowledge <b>{hero.knowledge}</b></span>
              </div>
              <div className="meter-label"><span>Movement</span><b>{hero.movement} / {maxMovement}</b></div>
              <div className="meter"><i style={{ width: `${hero.movement / maxMovement * 100}%` }} /></div>
              <div className="meter-label"><span>Mana</span><b>{hero.mana} / {hero.knowledge * 10}</b></div>
              <ArmySlots army={hero.army} title="Army" onSplit={(sourceSlot, destinationSlot, count) =>
                dispatch({ type: 'SPLIT_ARMY', holder: { kind: 'hero', id: hero.id },
                  sourceSlot, destinationSlot, count })} />
              <button
                className="secondary wide adventure-spell-button"
                disabled={!hero.knownSpells.some((id) => ['adventure', 'topology']
                  .includes(SPELLS[id].kind))}
                title={!hero.knownSpells.some((id) => ['adventure', 'topology'].includes(SPELLS[id].kind))
                  ? 'This hero knows no adventure spells.' : 'Open this hero’s map spells.'}
                onClick={() => setSpellbookOpen(true)}
              >Adventure spellbook</button>
              {castingSpell && (
                <div className="map-cast-prompt">
                  <b>{SPELLS[castingSpell.spellId].name} · choose targets</b>
                  <span>{SPELLS[castingSpell.spellId][hero.upgradedSpells.includes(castingSpell.spellId) ? 'plus' : 'base']}</span>
                  <span>{SPELLS[castingSpell.spellId].mana} mana · {adventureSpellMoveCost(hero)} movement · nothing is spent until confirmation.</span>
                  <span>Stage 1 of 2 · chosen {castingSpell.positions.length}{requiredMapTargets(hero, castingSpell.spellId) !== null
                    ? ` of ${requiredMapTargets(hero, castingSpell.spellId)}` : ''} · highlighted tiles are legal.</span>
                  {legalSpellTargets?.size === 0 && <small className="spell-target-reason">
                    No legal target is currently available. Check the terrain, exploration, range, and occupied tiles.
                  </small>}
                  {castingError && <small className="spell-target-reason">Not a legal target · {castingError}</small>}
                  <div>
                    <button disabled={!castingSpell.positions.length}
                      title={!castingSpell.positions.length ? 'No selected tile to remove.' : 'Remove the latest selected tile.'}
                      onClick={() => setCastingSpell({ ...castingSpell, positions: castingSpell.positions.slice(0, -1) })}>Undo last</button>
                    {castingSpell.spellId === 'murmuration' && <button className="primary"
                      disabled={!castingSpell.positions.length}
                      title={!castingSpell.positions.length ? 'Choose at least one scouting step.' : 'Review the drawn path before casting.'}
                      onClick={() => {
                        setSpellDraft(mapDraftAction(castingSpell.spellId, hero, castingSpell.positions));
                        setCastingSpell(null);
                      }}>Review path</button>}
                    <button onClick={() => { setCastingSpell(null); setSpellbookOpen(true); }}>Back to spellbook</button>
                    <button onClick={() => setCastingSpell(null)}>Cancel · spend nothing</button>
                  </div>
                </div>
              )}
              <div className="item-inventory">
                <h4>Consumables</h4>
                <div className="army-slots">
                  {hero.inventory.map((item, index) => {
                    const definition = item && typeof item !== 'string'
                      ? ITEMS[item.id] : null;
                    const canUse = definition?.use === 'adventure';
                    return (
                      <button
                        key={`item-${index}`}
                        className={`army-slot ${usingItemSlot === index ? 'selected' : ''}`}
                        disabled={!canUse}
                        title={!definition ? 'Empty item slot.' : canUse ? definition.description
                          : `${definition.description} This item is used during combat.`}
                        data-inspect-kind={definition ? 'item' : undefined}
                        data-inspect-id={definition?.id}
                        onClick={() => {
                          if (!definition) return;
                          if (definition.behavior === 'reveal') setUsingItemSlot(index);
                          else dispatch({ type: 'USE_ADVENTURE_ITEM', inventorySlot: index });
                        }}
                      >
                        {item ? itemName(item) : '+'}
                      </button>
                    );
                  })}
                </div>
                {usingItemSlot !== null && <small>Select a map center for the Case.</small>}
              </div>
              {serviceObject && (
                <section className="map-service-card">
                  <h4>At this location</h4>
                  {serviceObject.kind === 'dwelling' && (
                    <>
                      <b>{UNITS[serviceObject.unitId].name} dwelling</b>
                      <small>{serviceObject.available} waiting · anyone may recruit</small>
                      <div>
                        <button
                          disabled={serviceObject.available < 1}
                          title={serviceObject.available < 1 ? 'No creatures are waiting here.' : 'Recruit one creature.'}
                          onClick={() => dispatch({
                            type: 'RECRUIT_DWELLING', objectId: serviceObject.id, count: 1,
                          })}
                        >Recruit 1</button>
                        <button
                          disabled={serviceObject.available < 1}
                          title={serviceObject.available < 1 ? 'No creatures are waiting here.' : `Recruit all ${serviceObject.available}.`}
                          onClick={() => dispatch({
                            type: 'RECRUIT_DWELLING', objectId: serviceObject.id,
                            count: serviceObject.available,
                          })}
                        >Recruit all</button>
                      </div>
                    </>
                  )}
                  {serviceObject.kind === 'tinkersCart' && (
                    <>
                      <b>Wandering Tinker&apos;s Cart</b>
                      <small>{serviceObject.stock
                        ? `${itemName(serviceObject.stock)} · 150% market value`
                        : 'Sold out until next week'}</small>
                      <button
                        disabled={!serviceObject.stock}
                        title={!serviceObject.stock ? 'Sold out until next week.' : 'Buy the displayed item.'}
                        data-inspect-kind={serviceObject.stock ? 'item' : undefined}
                        data-inspect-id={serviceObject.stock?.id}
                        onClick={() => dispatch({
                          type: 'BUY_TINKER_ITEM', objectId: serviceObject.id,
                        })}
                      >Buy the cart&apos;s item</button>
                    </>
                  )}
                  {serviceObject.kind === 'monastery' && (
                    <>
                      <b>The Unstruck Bell</b>
                      <small><ResourceAmount resource="essence" amount={3} compact /> · +1 speed in round one for three days</small>
                      <button onClick={() => dispatch({
                        type: 'BUY_TIMING_BLESSING', objectId: serviceObject.id,
                      })}>Take Timing Blessing</button>
                    </>
                  )}
                  {serviceObject.kind === 'gloamingRing' && (
                    <>
                      <b>The Gloaming Ring</b>
                      {serviceObject.deposit ? (
                        <small>Gift held for {serviceObject.deposit.heroId}; due week {
                          serviceObject.deposit.dueWeek
                        }.</small>
                      ) : (
                        <>
                          <small>Leave a consumable; it returns one tier higher next week.</small>
                          <div className="service-options">
                            {hero.inventory.map((item, index) => item && typeof item !== 'string' && (
                              <button key={`gift-${index}`} data-inspect-kind="item" data-inspect-id={item.id} onClick={() => dispatch({
                                type: 'DEPOSIT_GLOAMING_ITEM', objectId: serviceObject.id,
                                inventorySlot: index,
                              })}>{itemName(item)}</button>
                            ))}
                            {hero.artifacts.backpack.map((artifact, index) =>
                              ARTIFACTS[artifact.id].class === 'relic' && (
                                <button key={`relic-${index}`} data-inspect-kind="artifact" data-inspect-id={artifact.id} onClick={() => dispatch({
                                  type: 'DEPOSIT_GLOAMING_ARTIFACT', objectId: serviceObject.id,
                                  backpackIndex: index,
                                })}>{ARTIFACTS[artifact.id].name}</button>
                              ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {serviceObject.kind === 'chrysalis' && (
                    <>
                      <b>The Chrysalis Pool</b>
                      <small>Convert a T1–T3 stack to half as many of its next tier.</small>
                      <div className="service-options">
                        {hero.army.map((stack, index) => stack && UNITS[stack.unitId].tier <= 3 && (
                          <button key={`molt-${index}`} data-inspect-kind="unit" data-inspect-id={stack.unitId} onClick={() => dispatch({
                            type: 'USE_CHRYSALIS', objectId: serviceObject.id, armySlot: index,
                          })}>Molt {stack.count} {UNITS[stack.unitId].name}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {serviceObject.kind === 'bridge' && (
                    <>
                      <b>The Half-Built Bridge</b>
                      <small>{serviceObject.completed
                        ? 'The crossing is complete.' : <>Finish it for <ResourceCost
                          cost={{ timber: 10, iron: 5 }} compact />.</>}</small>
                      <button
                        disabled={serviceObject.completed}
                        title={serviceObject.completed ? 'The bridge is already complete.' : 'Requires 10 timber and 5 iron.'}
                        onClick={() => dispatch({
                          type: 'COMPLETE_BRIDGE', objectId: serviceObject.id,
                        })}
                      >Complete crossing</button>
                    </>
                  )}
                  {serviceObject.kind === 'hedgeSchool' && (
                    <>
                      <b>Hedge School</b>
                      <small><ResourceAmount resource="gold" amount={1500} compact /> · draft three stats or skills · once per hero</small>
                      <button
                        disabled={serviceObject.visitedBy.includes(hero.id)}
                        title={serviceObject.visitedBy.includes(hero.id)
                          ? 'This hero has already attended.' : 'Costs 1500 gold and offers a draft.'}
                        onClick={() => dispatch({
                          type: 'ATTEND_HEDGE_SCHOOL', objectId: serviceObject.id,
                        })}
                      >Attend a lesson</button>
                    </>
                  )}
                  {serviceObject.kind === 'reliquaryCairn' && (
                    <>
                      <b>The Reliquary Cairn</b>
                      <small>Trade a carried artifact for another of the same class.</small>
                      <div className="service-options">
                        {Object.values(hero.artifacts.equipment).some((artifact) =>
                          artifact?.id === 'patternlessCoat') && (
                          <button onClick={() => dispatch({
                            type: 'USE_RELIQUARY_CAIRN', objectId: serviceObject.id,
                            backpackIndex: -1,
                          })}>Trade the Patternless Coat</button>
                        )}
                        {hero.artifacts.backpack.map((artifact, index) => (
                          <button key={`cairn-${index}`} data-inspect-kind="artifact" data-inspect-id={artifact.id} onClick={() => dispatch({
                            type: 'USE_RELIQUARY_CAIRN', objectId: serviceObject.id,
                            backpackIndex: index,
                          })}>{ARTIFACTS[artifact.id].name}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {serviceObject.kind === 'mercenaryCamp' && (
                    <>
                      <b>Mercenary Camp</b>
                      <small>Loyalty by the week, invoiced in advance.</small>
                      <div className="service-options">
                        {serviceObject.roster.map((stack, index) => (
                          <button key={`${stack.unitId}-${index}`} onClick={() => dispatch({
                            type: 'BUY_MERCENARY', objectId: serviceObject.id, rosterIndex: index,
                          })}>Hire {stack.count} {UNITS[stack.unitId].name}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {serviceObject.kind === 'wagonCamp' && (
                    <>
                      <b>Wagon Camp</b>
                      <small>{serviceObject.stock
                        ? <>{itemName(serviceObject.stock)} · <ResourceAmount
                          resource="gold" amount={1000} compact /></>
                        : 'Sold out until next week'}</small>
                      <button disabled={!serviceObject.stock}
                        title={!serviceObject.stock ? 'Sold out until next week.' : 'Costs 1000 gold.'}
                        onClick={() => dispatch({
                        type: 'BUY_WAGON_ITEM', objectId: serviceObject.id,
                      })}>Buy wagon item</button>
                    </>
                  )}
                  {serviceObject.kind === 'titheBarn' && (
                    <>
                      <b>The Tithe Barn</b>
                      <small><ResourceAmount resource="gold" amount={1000} compact /> · all your towns gain +10% growth this week.</small>
                      <button disabled={serviceObject.usedWeek[hero.owner] === state.week}
                        title={serviceObject.usedWeek[hero.owner] === state.week
                          ? 'This player already paid the tithe this week.' : 'Costs 1000 gold.'}
                        onClick={() => dispatch({ type: 'PAY_TITHE', objectId: serviceObject.id })}>
                        Pay the tithe
                      </button>
                    </>
                  )}
                </section>
              )}
              {cache && !cache.dug && patientStones.length > 0 && (
                <section className="map-service-card cache-sketch">
                  <h4>Patient Stone sketch</h4>
                  <b>{cacheFragments} / {patientStones.length} fragments</b>
                  <small>{cacheFragments === 0
                    ? 'The page is blank.'
                    : cacheFragments >= patientStones.length
                      ? 'The complete sketch pinpoints the buried tile.'
                      : `The search region narrows to roughly ${Math.max(3, 15 - cacheFragments * 2)} tiles across.`}</small>
                  {cacheFragments >= patientStones.length && (
                    <small>Mark: {cache.position.x}, {cache.position.y}</small>
                  )}
                  <button onClick={() => dispatch({
                    type: 'DIG_CACHE', position: { ...hero.position },
                  })}>Dig here · spend all movement</button>
                </section>
              )}
              {unstitching && (
                <div className="map-cast-prompt">
                  <b>Unstitching the road</b>
                  <span>Select any explored, passable tile.</span>
                  <button onClick={() => setUnstitching(false)}>Cancel</button>
                </div>
              )}
              <ArtifactPaperDoll
                state={state} hero={hero} dispatch={dispatch}
                onUnstitch={() => setUnstitching(true)}
              />
              {hero.skills.attunement === 3 && (
                <div className="resonance-picker">
                  <h4>Declare next battle resonance</h4>
                  {(['rite', 'craft', 'grave', 'wild'] as const).map((school) => (
                    <button
                      key={school}
                      disabled={hero.attunementResonanceUsedDay === state.day
                        || hero.declaredResonance?.day === state.day}
                      title={hero.attunementResonanceUsedDay === state.day
                        || hero.declaredResonance?.day === state.day
                        ? 'A resonance has already been declared or used today.'
                        : `Make the next battle resonate with ${school} magic.`}
                      onClick={() => dispatch({
                        type: 'DECLARE_RESONANCE', heroId: hero.id, school,
                      })}
                    >{school}</button>
                  ))}
                </div>
              )}
              {(hero.skills.ritualist ?? 0) >= 2 && (
                <div className="omen-preview">
                  <h4>Ritualist&apos;s forecast</h4>
                  <b>{OMENS[state.nextOmen].title}</b>
                  {hero.skills.ritualist === 3 && !hero.ritualistOmenChosen && (
                    <div>
                      {(Object.keys(OMENS) as Array<keyof typeof OMENS>).map((omen) => (
                        <button
                          key={omen}
                          onClick={() => dispatch({
                            type: 'CHOOSE_NEXT_OMEN', heroId: hero.id, omen,
                          })}
                        >{OMENS[omen].title}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {Object.entries(hero.skills).length > 0 && (
                <div className="skill-summary">
                  <h4>Secondary skills <small>· right-click for all ranks</small></h4>
                  {Object.entries(hero.skills).map(([skill, rank]) => {
                    const definition = SKILLS[skill as keyof typeof SKILLS];
                    return <article key={skill} data-inspect-kind="skill" data-inspect-id={skill}>
                      <b>{definition.name} · Rank {rank}</b>
                      <span>{definition.ranks[rank as 1 | 2 | 3]}</span>
                    </article>;
                  })}
                </div>
              )}
            </>
          )}
          <div className="castle-shortcuts">
            <h4>Castles</h4>
            {ownedCastles.map((castle) => (
              <button
                className={`secondary wide ${castleHere?.id === castle.id ? 'hero-present' : ''}`}
                key={castle.id}
                disabled={Boolean(movement)}
                title={movement ? 'Wait for the hero to finish moving.'
                  : `${castleHere?.id === castle.id ? 'Enter' : 'View'} ${CASTLE_NAMES[castle.faction]}.`}
                onClick={() => onOpenCastle(castle.id)}
              >
                {castleHere?.id === castle.id ? 'Enter' : 'View'} {
                  CASTLE_NAMES[castle.faction]
                }
              </button>
            ))}
          </div>
          {hero && player.heroes.filter((candidate) => candidate.id !== hero.id
            && candidate.alive
            && Math.max(Math.abs(candidate.position.x - hero.position.x),
              Math.abs(candidate.position.y - hero.position.y)) <= 1)
            .map((candidate) => (
              <button
                className="secondary wide"
                key={`exchange-${candidate.id}`}
                onClick={() => setExchangeHeroId(candidate.id)}
              >
                Exchange with {candidate.name}
              </button>
            ))}
          <button
            className="secondary wide"
            disabled={!hero || Boolean(movement)}
            title={!hero ? 'There is no living hero to select.'
              : movement ? 'Wait for the current hero to finish moving.' : 'Select the next living hero.'}
            onClick={() => dispatch({ type: 'NEXT_HERO' })}
          >
            Next hero · {player.heroes.indexOf(hero as Hero) + 1}/{player.heroes.length}
          </button>
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
          <div className="message-strip" aria-live="polite"><ResourceRichText>{state.lastMessage}</ResourceRichText></div>
          <details className="activity-log">
            <summary>Activity log · {state.eventLog.length} entries</summary>
            <div>{state.eventLog.slice(-12).reverse().map((entry, index) => (
              <p key={`${entry}-${index}`}><ResourceRichText>{entry}</ResourceRichText></p>
            ))}</div>
          </details>
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
      {hero && exchangeHeroId && (
        <ExchangeScreen
          source={hero}
          destination={player.heroes.find((candidate) => candidate.id === exchangeHeroId)!}
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
