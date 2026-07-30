import { useEffect, useMemo, useState } from 'react';
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
  const [exchangeHeroId, setExchangeHeroId] = useState<string | null>(null);
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
  const maxMovement = hero
    ? Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero))) : HERO_MOVE_POINTS;

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
        <AdventureMap
          state={state} hero={hero} reachable={reachable} path={path}
          movement={movement} mapStep={timing.mapStep} onTile={clickTile}
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
                className={candidate.id === hero?.id ? 'selected' : ''}
                disabled={Boolean(movement)}
                onClick={() => dispatch({ type: 'SELECT_HERO', heroId: candidate.id })}
              >
                <i className={candidate.faction}>{candidate.name[0]}</i>
                <span><b>{candidate.name}</b><small>Move {candidate.movement}</small></span>
              </button>
            ))}
          </div>
          {hero && (
            <>
              <div className="hero-portrait">
                <div className={hero.faction}>{hero.faction === 'hearthguard' ? 'H' : 'W'}</div>
                <span><b>{hero.name} · Level {hero.level}</b><small>{hero.xp} XP</small></span>
              </div>
              <div className="stat-grid">
                <span>Attack <b>{hero.attack}</b></span>
                <span>Defense <b>{hero.defense}</b></span>
                <span>Spell power <b>{hero.spellPower}</b></span>
                <span>Knowledge <b>{hero.knowledge}</b></span>
              </div>
              <div className="meter-label"><span>Movement</span><b>{hero.movement} / {maxMovement}</b></div>
              <div className="meter"><i style={{ width: `${hero.movement / maxMovement * 100}%` }} /></div>
              <div className="meter-label"><span>Mana</span><b>{hero.mana} / {hero.knowledge * 10}</b></div>
              <ArmySlots army={hero.army} title="Army" />
              {Object.entries(hero.skills).length > 0 && (
                <div className="skill-summary">
                  {Object.entries(hero.skills).map(([skill, rank]) => (
                    <span key={skill}>{skill} R{rank}</span>
                  ))}
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
                onClick={() => onOpenCastle(castle.id)}
              >
                {castleHere?.id === castle.id ? 'Enter' : 'View'} {
                  castle.faction === 'hearthguard' ? 'Westwatch' : 'Eastwatch'
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
            onClick={() => dispatch({ type: 'END_TURN' })}
          >
            End turn <kbd>Space</kbd>
          </button>
          <div className="message-strip">{state.lastMessage}</div>
        </aside>
      </div>
      {hero && exchangeHeroId && (
        <ExchangeScreen
          source={hero}
          destination={player.heroes.find((candidate) => candidate.id === exchangeHeroId)!}
          dispatch={dispatch}
          onClose={() => setExchangeHeroId(null)}
        />
      )}
    </main>
  );
}
