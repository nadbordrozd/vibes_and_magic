import { useState } from 'react';
import type { BuiltInMapId, Difficulty, LocalMapId, NewGameOptions } from '../../core/types';
import { encodeLocalMapReference } from '../../core/mapReference';
import type { FactionId } from '../../core/types';
import { FACTIONS } from '../../content/factions';
import { FACTION_PASSIVES } from '../../content/factionPresentation';
import { DIFFICULTY_MODIFIERS } from '../../content/constants';
import type { SaveSlot, SaveSummary } from '../persistence';
import { CAMPAIGN_PRESENTATION, CAMPAIGN_PRESENTATIONS } from '../campaignPresentation';
import {
  duplicateEditorMap, listEditorMaps, type EditorMapSummary,
} from '../mapPersistence';

interface Props {
  onStart: (options: NewGameOptions) => void;
  savedGame: SaveSummary | null;
  manualSaves: Array<SaveSummary | null>;
  autoSaves: Array<SaveSummary | null>;
  onLoad: (slot?: SaveSlot) => void;
  onImport: () => void;
  onOpenEditor: (documentId?: string) => void;
  onPlayLocal?: (mapId: LocalMapId) => void;
  localMaps?: EditorMapSummary[];
}

function freshSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

type FactionChoice = FactionId | 'random';
const factionChoices = Object.values(FACTIONS);

function factionSummary(choice: FactionChoice): string {
  if (choice === 'random') return 'A faction will be chosen reproducibly from the world seed.';
  const faction = FACTIONS[choice];
  const passive = FACTION_PASSIVES[choice];
  return `${faction.flavor} ${passive.name}: ${passive.description}`;
}

const controllerHelp = {
  human: 'You make every decision for this player.',
  ai: 'The computer explores, builds, recruits, and fights for this player.',
  dormant: 'This player keeps its starting position but takes no economic actions.',
} as const;

const controllerNames = { human: 'Human', ai: 'Standard', dormant: 'Dormant' } as const;

function formatSaveTime(savedAt: number | null): string {
  if (savedAt === null) return 'time unavailable';
  return `${new Date(savedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function SaveRow({
  summary, title, onLoad,
}: { summary: SaveSummary; title: string; onLoad: () => void }) {
  const unavailable = summary.compatibility === 'corrupt'
    || summary.compatibility === 'schema-mismatch';
  const players = summary.players.map((player) =>
    `${player.name}: ${player.faction} · ${controllerNames[player.controller]}`).join(' | ');
  return (
    <article className={`save-row ${summary.compatibility}`}>
      <div className="save-row-primary">
        <span><b>{title} · {summary.mapName}</b>
          <small>Week {summary.week} / Day {summary.day} · {summary.activePlayer}</small></span>
        <button className="load-button" onClick={onLoad} disabled={unavailable}
          data-disabled-reason={unavailable ? summary.warning : undefined}
          title={unavailable ? summary.warning : `Load ${summary.mapName}`}>
          {unavailable ? 'Unavailable' : 'Load'} <i>{unavailable ? '!' : '↗'}</i>
        </button>
      </div>
      <details>
        <summary>Save details</summary>
        <small>{summary.objective}</small>
        <small>{summary.difficulty ? `${summary.difficulty[0].toUpperCase()}${summary.difficulty.slice(1)}` : 'Unknown difficulty'}
          {' · '}seed {summary.seed ?? 'unknown'}</small>
        <small>{players || 'Controller and faction data unavailable'}</small>
        <small>Saved {formatSaveTime(summary.savedAt)} · schema v{summary.schemaVersion ?? 'unknown'}
          {' · '}{summary.compatibility === 'compatible' ? 'content matches this build'
            : summary.compatibility === 'content-mismatch' ? 'content mismatch'
              : summary.compatibility === 'schema-mismatch' ? 'schema mismatch' : 'corrupt data'}</small>
        {summary.warning && <strong className="save-warning">{summary.warning}</strong>}
      </details>
    </article>
  );
}

function resolveFaction(choice: FactionChoice, seed: number, slot: number): FactionId {
  if (choice !== 'random') return choice;
  const index = (Math.imul(seed ^ (slot * 0x9e3779b9), 2654435761) >>> 0)
    % factionChoices.length;
  return factionChoices[index].id;
}

export function MainMenu({
  onStart, savedGame, manualSaves, autoSaves, onLoad, onImport, onOpenEditor, onPlayLocal,
  localMaps: suppliedLocalMaps,
}: Props) {
  const [seed, setSeed] = useState(() => freshSeed());
  const [p1, setP1] = useState<'human' | 'ai' | 'dormant'>('human');
  const [p2, setP2] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p1Faction, setP1Faction] = useState<FactionChoice>('hearthguard');
  const [p2Faction, setP2Faction] = useState<FactionChoice>('woundWrights');
  const [p3, setP3] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p4, setP4] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p5, setP5] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p6, setP6] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p3Faction, setP3Faction] = useState<FactionChoice>('unfinished');
  const [p4Faction, setP4Faction] = useState<FactionChoice>('vespiary');
  const [p5Faction, setP5Faction] = useState<FactionChoice>('hagwood');
  const [p6Faction, setP6Faction] = useState<FactionChoice>('wildergrass');
  const [mapId, setMapId] = useState<BuiltInMapId>('border-marches');
  const [playerCount, setPlayerCount] = useState<1 | 2 | 3 | 4 | 5 | 6>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const hasSaves = Boolean(savedGame || manualSaves.some(Boolean) || autoSaves.some(Boolean));
  const [mode, setMode] = useState<'new' | 'continue'>(hasSaves ? 'continue' : 'new');
  const [localMaps, setLocalMaps] = useState(() => {
    if (suppliedLocalMaps) return suppliedLocalMaps;
    const result = listEditorMaps();
    return result.ok ? result.value.maps : [];
  });
  const selectedMap = CAMPAIGN_PRESENTATION[mapId];

  return (
    <main className="menu-shell">
      <section className="menu-card">
        <header className="menu-title">
          <div><div className="kicker">A deterministic strategy experiment</div>
            <h1>Vibes <span>&amp; Magic</span></h1></div>
          <nav className="menu-modes" aria-label="Title screen task">
            <button className={mode === 'new' ? 'selected' : ''}
              aria-pressed={mode === 'new'} onClick={() => setMode('new')}>New campaign</button>
            <button className={mode === 'continue' ? 'selected' : ''}
              aria-pressed={mode === 'continue'} onClick={() => setMode('continue')}>
              Continue{hasSaves ? '' : ' / import'}
            </button>
            <button aria-pressed="false" onClick={() => onOpenEditor()}>Map Editor</button>
          </nav>
        </header>
        {mode === 'new' ? <>
        <section className="selected-map-identity" aria-live="polite">
          <span>{selectedMap.name} · {selectedMap.style}</span>
          <b>{selectedMap.objective}</b>
          <small>{selectedMap.flavor}</small>
        </section>
        <div className="menu-fields">
          <label>Campaign map
            <select value={mapId} onChange={(event) => {
              const next = event.target.value as BuiltInMapId; setMapId(next);
              if (next === 'manywhere') setPlayerCount(1);
              else if (next === 'grand-muster') setPlayerCount(2);
              else if (next === 'crooked-crown') setPlayerCount(4);
              else if (next === 'sixfold-trial') setPlayerCount(6);
              else if (playerCount === 1) setPlayerCount(2);
            }}>
              {CAMPAIGN_PRESENTATIONS.map((map) => (
                <option key={map.id} value={map.id}>{map.name} · {map.style} · {map.objective}</option>
              ))}
            </select>
          </label>
          {(mapId === 'crosstitch' || mapId === 'crosstitch-kit' || mapId === 'manywhere'
            || mapId === 'crooked-crown') && (
            <label>Players
              <select value={playerCount} onChange={(event) =>
                setPlayerCount(Number(event.target.value) as 1 | 2 | 3 | 4)}>
                {mapId === 'manywhere' && <option value={1}>1</option>}
                <option value={2}>2</option><option value={3}>3</option>
                {mapId !== 'manywhere' && <option value={4}>4</option>}
              </select>
            </label>
          )}
          <label>Difficulty
            <select value={difficulty} onChange={(event) =>
              setDifficulty(event.target.value as Difficulty)}>
              <option value="easy">Easy</option><option value="normal">Normal</option>
              <option value="hard">Hard</option><option value="brutal">Brutal</option>
            </select>
            <small className="menu-field-help">Resources ×{DIFFICULTY_MODIFIERS[difficulty].humanStartingResources} · guardians ×{DIFFICULTY_MODIFIERS[difficulty].guardianStrength} · computer economy ×{DIFFICULTY_MODIFIERS[difficulty].aiIncome}</small>
          </label>
          {mapId === 'grand-muster' && <div className="slot-row crimson">
            <b>Showcase setup</b>
            <span>Human: all six factions · Opponent: distant and dormant</span>
          </div>}
          {mapId !== 'grand-muster' && <div className="slot-row crimson">
            <label>
              <b>01</b>
              <select value={p1Faction} onChange={(event) =>
                setP1Faction(event.target.value as FactionChoice)}>
                <option value="random">Random faction</option>
                {Object.values(FACTIONS).map((faction) => (
                  <option key={faction.id} value={faction.id}>{faction.name}</option>
                ))}
              </select>
              <details className="menu-inline-help"><summary>Faction identity</summary><small>{factionSummary(p1Faction)}</small></details>
            </label>
            <button title={controllerHelp[p1]} onClick={() => setP1(p1 === 'human' ? 'ai' : p1 === 'ai' ? 'dormant' : 'human')}>
              {p1 === 'human' ? 'Human' : p1 === 'ai' ? 'Standard' : 'Dormant'}
            </button>
          </div>}
          {mapId !== 'grand-muster' && playerCount >= 2 && <div className="slot-row azure">
            <label>
              <b>02</b>
              <select value={p2Faction} onChange={(event) =>
                setP2Faction(event.target.value as FactionChoice)}>
                <option value="random">Random faction</option>
                {Object.values(FACTIONS).map((faction) => (
                  <option key={faction.id} value={faction.id}>{faction.name}</option>
                ))}
              </select>
              <details className="menu-inline-help"><summary>Faction identity</summary><small>{factionSummary(p2Faction)}</small></details>
            </label>
            <button title={controllerHelp[p2]} onClick={() => setP2(p2 === 'human' ? 'ai' : p2 === 'ai' ? 'dormant' : 'human')}>
              {p2 === 'human' ? 'Human' : p2 === 'ai' ? 'Standard' : 'Dormant'}
            </button>
          </div>}
          {(mapId === 'crosstitch' || mapId === 'crosstitch-kit' || mapId === 'manywhere'
            || mapId === 'crooked-crown' || mapId === 'sixfold-trial') && playerCount >= 3 && (
            <div className="slot-row verdant">
              <label><b>03</b><select value={p3Faction} onChange={(event) =>
                setP3Faction(event.target.value as FactionChoice)}>
                <option value="random">Random faction</option>
                {Object.values(FACTIONS).map((faction) => (
                  <option key={faction.id} value={faction.id}>{faction.name}</option>
                ))}
              </select><details className="menu-inline-help"><summary>Faction identity</summary><small>{factionSummary(p3Faction)}</small></details></label>
              <button title={controllerHelp[p3]} onClick={() => setP3(p3 === 'human' ? 'ai' : p3 === 'ai' ? 'dormant' : 'human')}>
                {p3 === 'human' ? 'Human' : p3 === 'ai' ? 'Standard' : 'Dormant'}
              </button>
            </div>
          )}
          {(mapId === 'crosstitch' || mapId === 'crosstitch-kit'
            || mapId === 'crooked-crown' || mapId === 'sixfold-trial') && playerCount >= 4 && (
            <div className="slot-row amber">
              <label><b>04</b><select value={p4Faction} onChange={(event) =>
                setP4Faction(event.target.value as FactionChoice)}>
                <option value="random">Random faction</option>
                {Object.values(FACTIONS).map((faction) => (
                  <option key={faction.id} value={faction.id}>{faction.name}</option>
                ))}
              </select><details className="menu-inline-help"><summary>Faction identity</summary><small>{factionSummary(p4Faction)}</small></details></label>
              <button title={controllerHelp[p4]} onClick={() => setP4(p4 === 'human' ? 'ai' : p4 === 'ai' ? 'dormant' : 'human')}>
                {p4 === 'human' ? 'Human' : p4 === 'ai' ? 'Standard' : 'Dormant'}
              </button>
            </div>
          )}
          {mapId === 'sixfold-trial' && <div className="slot-row violet">
            <label><b>05</b><select value={p5Faction} onChange={(event) =>
              setP5Faction(event.target.value as FactionChoice)}>
              <option value="random">Random faction</option>
              {Object.values(FACTIONS).map((faction) => (
                <option key={faction.id} value={faction.id}>{faction.name}</option>
              ))}
            </select><details className="menu-inline-help"><summary>Faction identity</summary><small>{factionSummary(p5Faction)}</small></details></label>
            <button title={controllerHelp[p5]} onClick={() => setP5(p5 === 'human' ? 'ai' : p5 === 'ai' ? 'dormant' : 'human')}>
              {p5 === 'human' ? 'Human' : p5 === 'ai' ? 'Standard' : 'Dormant'}
            </button>
          </div>}
          {mapId === 'sixfold-trial' && <div className="slot-row teal">
            <label><b>06</b><select value={p6Faction} onChange={(event) =>
              setP6Faction(event.target.value as FactionChoice)}>
              <option value="random">Random faction</option>
              {Object.values(FACTIONS).map((faction) => (
                <option key={faction.id} value={faction.id}>{faction.name}</option>
              ))}
            </select><details className="menu-inline-help"><summary>Faction identity</summary><small>{factionSummary(p6Faction)}</small></details></label>
            <button title={controllerHelp[p6]} onClick={() => setP6(p6 === 'human' ? 'ai' : p6 === 'ai' ? 'dormant' : 'human')}>
              {p6 === 'human' ? 'Human' : p6 === 'ai' ? 'Standard' : 'Dormant'}
            </button>
          </div>}
          <details className="controller-legend" aria-label="Controller meanings">
            <summary>Controller meanings</summary>
            <span><b>Human</b> — {controllerHelp.human}</span>
            <span><b>Standard</b> — {controllerHelp.ai}</span>
            <span><b>Dormant</b> — {controllerHelp.dormant}</span>
          </details>
          <label>
            World seed
            <div className="seed-row">
              <input
                value={seed}
                inputMode="numeric"
                onChange={(event) => setSeed(Number(event.target.value) >>> 0)}
              />
              <button aria-label="Generate new seed" onClick={() => setSeed(freshSeed())}>
                ↻
              </button>
            </div>
            <small className="menu-field-help">Same seed + setup reproduces offers and outcomes.</small>
          </label>
        </div>
        <button className="primary start-button" onClick={() => onStart({
          seed, p1: mapId === 'grand-muster' ? 'human' : p1,
          p2: mapId === 'grand-muster' ? 'dormant' : p2,
          p1Faction: mapId === 'grand-muster' ? 'hearthguard'
            : resolveFaction(p1Faction, seed, 1),
          p2Faction: mapId === 'grand-muster' ? 'woundWrights'
            : resolveFaction(p2Faction, seed, 2), mapId,
          playerCount: mapId === 'crosstitch' || mapId === 'crosstitch-kit'
            || mapId === 'manywhere' || mapId === 'crooked-crown' || mapId === 'sixfold-trial'
            ? playerCount : 2,
          difficulty,
          p3, p4, p5, p6,
          p3Faction: resolveFaction(p3Faction, seed, 3),
          p4Faction: resolveFaction(p4Faction, seed, 4),
          p5Faction: resolveFaction(p5Faction, seed, 5),
          p6Faction: resolveFaction(p6Faction, seed, 6),
        })}>
          Begin campaign <span>→</span>
        </button>
        <section className="title-local-maps" aria-labelledby="title-local-maps-heading">
          <div className="selected-map-identity"><span>Frozen local maps</span>
            <b id="title-local-maps-heading">Play an exact authored revision</b>
            <small>Campaign saves and replays pin the displayed revision and hash.</small></div>
          {localMaps.length === 0 ? <p>No local maps yet. Open Map Editor to create or import one.</p>
            : localMaps.map((map) => {
              const playable = map.latestPlayable;
              return <article className="save-row" key={map.id}>
                <div className="save-row-primary"><span><b>{playable?.name ?? map.name}</b>
                  <small>{map.id}{playable ? ` · frozen revision ${playable.revision} · ${playable.width}×${playable.height}` : ' · no playable revision'}</small>
                  {playable && <small>{playable.author || 'Unknown author'} · {playable.style || 'Unspecified style'} · hash {playable.mapHash}</small>}</span>
                  <div className="editor-library-actions"><button onClick={() => onOpenEditor(map.id)}
                    disabled={!map.mapHash}
                    data-disabled-reason={!map.mapHash ? 'This local draft is unreadable.' : undefined}
                    title={!map.mapHash ? 'This local draft is unreadable.' : `Edit ${map.name}`}>Edit draft</button>
                  <button disabled={!map.mapHash}
                    data-disabled-reason={!map.mapHash ? 'This local draft is unreadable.' : undefined}
                    title={!map.mapHash ? 'This local draft is unreadable.' : `Duplicate ${map.name}`}
                    onClick={() => {
                    const copied = duplicateEditorMap(map.id);
                    if (!copied.ok) return;
                    const refreshed = listEditorMaps();
                    if (refreshed.ok) setLocalMaps(refreshed.value.maps);
                    onOpenEditor(copied.value.document.id);
                  }}>Duplicate as draft</button>
                  <button className="primary" disabled={!playable || !onPlayLocal}
                    data-disabled-reason={!playable ? 'Freeze a zero-error revision in Map Editor first.'
                      : !onPlayLocal ? 'Local play is unavailable in this view.' : undefined}
                    title={!playable ? 'Freeze a zero-error revision in Map Editor first.'
                      : !onPlayLocal ? 'Local play is unavailable in this view.'
                      : `Play ${playable.name} revision ${playable.revision}`}
                    onClick={() => playable && onPlayLocal?.(encodeLocalMapReference({
                      documentId: map.id, revision: playable.revision, mapHash: playable.mapHash,
                    }))}>Play</button></div>
                </div>
              </article>;
            })}
        </section>
        </> : <section className="continue-panel">
        <div className="selected-map-identity">
          <span>{hasSaves ? 'Campaign saves' : 'No local campaigns'}</span>
          <b>{hasSaves ? 'Choose one campaign to resume.' : 'Import a campaign file or begin a new game.'}</b>
        </div>
        {savedGame && <SaveRow summary={savedGame} title="Continue quick save"
          onLoad={() => onLoad()} />}
        {manualSaves.map((summary, index) => summary && (
          <SaveRow key={index} summary={summary} title={`Manual slot ${index + 1}`}
            onLoad={() => onLoad(index + 1)} />
        ))}
        {autoSaves.map((summary, index) => summary && (
          <SaveRow key={`auto-${index}`} summary={summary} title={`Autosave ${index + 1}`}
            onLoad={() => onLoad(`auto-${index}`)} />
        ))}
        <button className="load-button" onClick={onImport}><span><b>Import save file</b>
          <small>Choose a deterministic campaign export.</small></span><i>⇧</i></button>
        {!hasSaves && <button className="primary new-from-empty" onClick={() => setMode('new')}>
          Set up a new campaign
        </button>}
        </section>}
        <details className="title-extras"><summary>Presentation showcases</summary>
          <a className="load-button terrain-showcase-link" href="?terrain-showcase=1">
            <span><b>Terrain showcase</b><small>Review native terrain families.</small></span><i>↗</i>
          </a>
          <a className="load-button terrain-showcase-link" href="?adventure-showcase=1">
            <span><b>Adventure visual showcase</b><small>Review map sprites and topology.</small></span><i>↗</i>
          </a>
        </details>
        <footer>Seed {seed} · deterministic replay enabled</footer>
      </section>
    </main>
  );
}
