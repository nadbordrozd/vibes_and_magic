import { useEffect, useMemo, useState } from 'react';
import { incomeForPlayer } from '../../core/game';
import { HERO_MOVE_POINTS } from '../../content/constants';
import {
  animatedAdventurePath, previewPath, reachableAdventureTiles, visitingCastle,
} from '../../core/selectors';
import type {
  Action, Coord, GameState, MapObject, ResourceId,
} from '../../core/types';
import { ArmySlots } from './ArmySlots';
import {
  ANIMATION_TIMINGS, type AnimationSpeed,
} from '../animation';

const TILE = 32;
const TERRAIN_COLOR = {
  grass: '#769c45', forest: '#365f3c', mountain: '#777a78', water: '#397b91',
};
const RESOURCE_MARK: Record<ResourceId, string> = {
  gold: 'G', timber: 'T', iron: 'I', essence: 'E',
};

interface Props {
  state: GameState;
  dispatch: (action: Action) => void;
  onOpenCastle: (castleId: string) => void;
  onMenu: () => void;
  onSave: () => void;
  animationSpeed: AnimationSpeed;
  onAnimationSpeedChange: (speed: AnimationSpeed) => void;
  onMovementStateChange: (moving: boolean) => void;
}

function objectTitle(object: MapObject): string {
  if (object.kind === 'pile') return `${object.amount} ${object.resource}`;
  if (object.kind === 'chest') return object.cleared ? 'Treasure chest' : 'Guarded treasure chest';
  return `${object.resource} mine · ${object.owner ?? 'neutral'}`;
}

function MapObjectGlyph({ object }: { object: MapObject }) {
  const x = object.position.x * TILE;
  const y = object.position.y * TILE;
  const guardCount = object.kind !== 'pile' && object.guard && !object.cleared
    ? object.guard.army.reduce((sum, stack) => sum + stack.count, 0) : 0;
  if (object.kind === 'pile') {
    return (
      <g className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{objectTitle(object)}</title>
        <path className={`pile ${object.resource}`} d="M0 -8 L8 0 L0 8 L-8 0 Z" />
        <text y="3">{RESOURCE_MARK[object.resource]}</text>
      </g>
    );
  }
  if (object.kind === 'chest') {
    return (
      <g className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{objectTitle(object)}</title>
        <rect className="chest" x="-9" y="-6" width="18" height="13" rx="2" />
        <path d="M-9 -2 H9" className="glyph-line" />
        {guardCount > 0 && <text className="guard-count" x="10" y="-9">{guardCount}</text>}
      </g>
    );
  }
  return (
    <g className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
      <title>{objectTitle(object)}</title>
      <circle className={`mine-ring ${object.owner ?? 'neutral'}`} r="11" />
      <text y="4">{RESOURCE_MARK[object.resource]}</text>
      {guardCount > 0 && <text className="guard-count" x="10" y="-9">{guardCount}</text>}
    </g>
  );
}

export function AdventureScreen({
  state, dispatch, onOpenCastle, onMenu, onSave,
  animationSpeed, onAnimationSpeedChange, onMovementStateChange,
}: Props) {
  const [preview, setPreview] = useState<Coord | null>(null);
  const [movement, setMovement] = useState<{
    path: Coord[];
    index: number;
    destination: Coord;
  } | null>(null);
  const player = state.players[state.activePlayer];
  const hero = player.hero;
  const explored = new Set(player.explored);
  const reachable = useMemo(() => reachableAdventureTiles(state), [state]);
  const path = useMemo(
    () => preview ? previewPath(state, preview) : [],
    [state, preview],
  );
  const castleHere = visitingCastle(state);
  const ownedCastles = state.castles.filter((castle) => castle.owner === state.activePlayer);
  const income = incomeForPlayer(state, state.activePlayer);
  const timing = ANIMATION_TIMINGS[animationSpeed];

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

  const clickTile = (destination: Coord) => {
    if (!hero || player.controller !== 'human' || movement) return;
    if (preview && preview.x === destination.x && preview.y === destination.y) {
      const movingPath = animatedAdventurePath(state, destination);
      if (timing.mapStep === 0 || movingPath.length < 2) {
        dispatch({ type: 'MOVE_HERO', destination });
      } else {
        onMovementStateChange(true);
        setMovement({ path: movingPath, index: 0, destination });
      }
      setPreview(null);
    } else {
      setPreview(destination);
    }
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <button className="wordmark" onClick={onMenu}>BM</button>
        <div className="turn-badge">
          <span>Week {state.week}</span>
          <b>Day {((state.day - 1) % 7) + 1}</b>
        </div>
        <div className="resource-bar">
          {(Object.keys(player.resources) as ResourceId[]).map((resource) => (
            <div key={resource} title={`Daily income: +${income[resource]}`}>
              <span>{RESOURCE_MARK[resource]}</span>
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
        <button className="topbar-action" disabled={Boolean(movement)} onClick={onSave}>Save</button>
      </header>

      <div className="adventure-layout">
        <section className="map-frame">
          <div className="map-caption">
            <span>Border Marches</span>
            <small>Click a destination twice to travel</small>
          </div>
          <svg
            className="adventure-map"
            viewBox={`0 0 ${state.map.width * TILE} ${state.map.height * TILE}`}
            aria-label="Adventure map"
          >
            <defs>
              <marker id="path-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 Z" fill="#f4d875" />
              </marker>
            </defs>
            {state.map.terrain.flatMap((row, y) => row.map((terrain, x) => {
              const key = `${x},${y}`;
              const seen = explored.has(key);
              return (
                <g key={key} onClick={() => clickTile({ x, y })}>
                  <rect
                    x={x * TILE} y={y * TILE} width={TILE} height={TILE}
                    fill={seen ? TERRAIN_COLOR[terrain] : '#0a0d0b'}
                    className={seen && reachable.has(key) ? 'reachable-map-tile' : ''}
                  />
                  {seen && terrain === 'forest' && (
                    <text className="terrain-glyph" x={x * TILE + 16} y={y * TILE + 21}>♠</text>
                  )}
                  {seen && terrain === 'mountain' && (
                    <path className="mountain-glyph" d={`M${x * TILE + 4} ${y * TILE + 27} L${x * TILE + 16} ${y * TILE + 5} L${x * TILE + 29} ${y * TILE + 27} Z`} />
                  )}
                </g>
              );
            }))}
            {state.map.objects.filter((object) => {
              if (!explored.has(`${object.position.x},${object.position.y}`)) return false;
              if (object.kind === 'pile') return !object.collected;
              if (object.kind === 'chest') return !object.collected;
              return true;
            }).map((object) => <MapObjectGlyph key={object.id} object={object} />)}
            {state.castles.filter((castle) =>
              explored.has(`${castle.position.x},${castle.position.y}`)).map((castle) => (
              <g className="map-overlay-glyph" key={castle.id} transform={`translate(${castle.position.x * TILE + 16} ${castle.position.y * TILE + 16})`}>
                <title>{`${castle.faction} castle · ${castle.owner}`}</title>
                <rect className={`castle-glyph ${castle.owner}`} x="-12" y="-12" width="24" height="24" />
                <text y="5">♜</text>
              </g>
            ))}
            {Object.values(state.players).map((mapPlayer) => mapPlayer.hero?.alive
              && explored.has(`${mapPlayer.hero.position.x},${mapPlayer.hero.position.y}`)
              ? (
                <g
                  className="map-overlay-glyph"
                  key={mapPlayer.hero.id}
                  style={{
                    transition: `transform ${timing.mapStep}ms linear`,
                    transform: (() => {
                      const position = movement && mapPlayer.id === state.activePlayer
                        ? movement.path[movement.index] : mapPlayer.hero.position;
                      return `translate(${position.x * TILE + 16}px, ${position.y * TILE + 16}px)`;
                    })(),
                  }}
                >
                  <title>{`${mapPlayer.name}'s hero`}</title>
                  <circle className={`hero-glyph ${mapPlayer.id}`} r="9" />
                  <path className="hero-flag" d="M0 -6 V5 M1 -6 L7 -3 L1 0" />
                </g>
              ) : null)}
            {path.length > 1 && (
              <polyline
                className="path-preview"
                markerEnd="url(#path-arrow)"
                points={path.map((coord) => `${coord.x * TILE + 16},${coord.y * TILE + 16}`).join(' ')}
              />
            )}
          </svg>
        </section>

        <aside className="hero-panel">
          <div className="panel-heading">
            <span>Field command</span>
            <b>{hero ? 'Hero' : 'No living hero'}</b>
          </div>
          {hero && (
            <>
              <div className="hero-portrait">
                <div className={hero.faction}>{hero.faction === 'crimson' ? 'C' : 'A'}</div>
                <span><b>Level {hero.level}</b><small>{hero.xp} XP</small></span>
              </div>
              <div className="stat-grid">
                <span>Attack <b>{hero.attack}</b></span>
                <span>Defense <b>{hero.defense}</b></span>
                <span>Spell power <b>{hero.spellPower}</b></span>
                <span>Knowledge <b>{hero.knowledge}</b></span>
              </div>
              <div className="meter-label"><span>Movement</span><b>{hero.movement} / {HERO_MOVE_POINTS}</b></div>
              <div className="meter"><i style={{ width: `${hero.movement / HERO_MOVE_POINTS * 100}%` }} /></div>
              <div className="meter-label"><span>Mana</span><b>{hero.mana} / {hero.knowledge * 10}</b></div>
              <ArmySlots army={hero.army} title="Army" />
            </>
          )}
          <div className="castle-shortcuts">
            <h4>Castles</h4>
            {ownedCastles.map((castle) => (
              <button
                className={`secondary wide ${castleHere?.id === castle.id ? 'hero-present' : ''}`}
                key={castle.id}
                disabled={Boolean(movement)}
                onClick={() => onOpenCastle(castle.id)}
              >
                {castleHere?.id === castle.id ? 'Enter' : 'View'} {
                  castle.faction === 'crimson' ? 'Westwatch' : 'Eastwatch'
                }
              </button>
            ))}
          </div>
          <button className="secondary wide" disabled>Next hero · 1/1</button>
          <button
            className="primary wide end-turn"
            disabled={player.controller !== 'human' || Boolean(movement)}
            onClick={() => dispatch({ type: 'END_TURN' })}
          >
            End turn <kbd>Space</kbd>
          </button>
          <div className="message-strip">{state.lastMessage}</div>
        </aside>
      </div>
    </main>
  );
}
