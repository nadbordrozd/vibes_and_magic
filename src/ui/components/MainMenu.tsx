import { useState } from 'react';
import type { Difficulty, MapId, NewGameOptions } from '../../core/types';
import type { FactionId } from '../../core/types';
import { FACTIONS } from '../../content/factions';
import { FACTION_PASSIVES } from '../../content/factionPresentation';
import { DIFFICULTY_MODIFIERS } from '../../content/constants';
import type { SaveSlot, SaveSummary } from '../persistence';

interface Props {
  onStart: (options: NewGameOptions) => void;
  savedGame: SaveSummary | null;
  manualSaves: Array<SaveSummary | null>;
  autoSaves: Array<SaveSummary | null>;
  onLoad: (slot?: SaveSlot) => void;
  onImport: () => void;
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

function resolveFaction(choice: FactionChoice, seed: number, slot: number): FactionId {
  if (choice !== 'random') return choice;
  const index = (Math.imul(seed ^ (slot * 0x9e3779b9), 2654435761) >>> 0)
    % factionChoices.length;
  return factionChoices[index].id;
}

export function MainMenu({
  onStart, savedGame, manualSaves, autoSaves, onLoad, onImport,
}: Props) {
  const [seed, setSeed] = useState(() => freshSeed());
  const [p1, setP1] = useState<'human' | 'ai' | 'dormant'>('human');
  const [p2, setP2] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p1Faction, setP1Faction] = useState<FactionChoice>('hearthguard');
  const [p2Faction, setP2Faction] = useState<FactionChoice>('woundWrights');
  const [p3, setP3] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p4, setP4] = useState<'human' | 'ai' | 'dormant'>('ai');
  const [p3Faction, setP3Faction] = useState<FactionChoice>('unfinished');
  const [p4Faction, setP4Faction] = useState<FactionChoice>('vespiary');
  const [mapId, setMapId] = useState<MapId>('border-marches');
  const [playerCount, setPlayerCount] = useState<1 | 2 | 3 | 4>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  return (
    <main className="menu-shell">
      <section className="menu-card">
        <div className="kicker">A deterministic strategy experiment</div>
        <h1>{mapId === 'border-marches' ? <>Border<br /><span>Marches</span></>
          : mapId === 'torn-sound' ? <>Torn<br /><span>Sound</span></>
            : mapId === 'manywhere' ? <>Many<br /><span>where</span></>
              : mapId === 'grand-muster' ? <>Grand<br /><span>Muster</span></>
            : <>Cross<br /><span>stitch</span></>}</h1>
        <p className="menu-copy">
          {mapId === 'border-marches'
            ? 'Raise an army, seize the mountain passes, and take your rival’s castle.'
            : mapId === 'torn-sound'
              ? 'Two island keeps, one broken sea, and more routes than roads.'
              : mapId === 'manywhere'
                ? 'One long road, four empty thrones, and nearly everything else.'
                : mapId === 'grand-muster'
                  ? 'Six allied castles, six complete armies, and a continent-sized creature showcase.'
              : 'Four corners, two crossing seams, and one old pattern waiting to be found.'}
        </p>
        <div className="menu-fields">
          <label>
            Map
            <select value={mapId} onChange={(event) => {
              const next = event.target.value as MapId; setMapId(next);
              if (next === 'manywhere') setPlayerCount(1);
              else if (next === 'grand-muster') setPlayerCount(2);
              else if (playerCount === 1) setPlayerCount(2);
            }}>
              <option value="border-marches">Border Marches · 2 players</option>
              <option value="crosstitch">Crosstitch · 2–4 players</option>
              <option value="crosstitch-kit">Crosstitch: The Kit · 2–4 players</option>
              <option value="torn-sound">The Torn Sound · 2 players</option>
              <option value="manywhere">Manywhere · showcase · 1–3 players</option>
              <option value="grand-muster">The Grand Muster · oversized demo</option>
            </select>
          </label>
          {(mapId === 'crosstitch' || mapId === 'crosstitch-kit' || mapId === 'manywhere') && (
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
            <small className="menu-field-help">Starting resources ×{DIFFICULTY_MODIFIERS[difficulty].humanStartingResources}; guardian strength ×{DIFFICULTY_MODIFIERS[difficulty].guardianStrength}; computer income and growth ×{DIFFICULTY_MODIFIERS[difficulty].aiIncome}.</small>
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
              <small className="menu-field-help">{factionSummary(p1Faction)}</small>
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
              <small className="menu-field-help">{factionSummary(p2Faction)}</small>
            </label>
            <button title={controllerHelp[p2]} onClick={() => setP2(p2 === 'human' ? 'ai' : p2 === 'ai' ? 'dormant' : 'human')}>
              {p2 === 'human' ? 'Human' : p2 === 'ai' ? 'Standard' : 'Dormant'}
            </button>
          </div>}
          {(mapId === 'crosstitch' || mapId === 'crosstitch-kit' || mapId === 'manywhere') && playerCount >= 3 && (
            <div className="slot-row verdant">
              <label><b>03</b><select value={p3Faction} onChange={(event) =>
                setP3Faction(event.target.value as FactionChoice)}>
                <option value="random">Random faction</option>
                {Object.values(FACTIONS).map((faction) => (
                  <option key={faction.id} value={faction.id}>{faction.name}</option>
                ))}
              </select><small className="menu-field-help">{factionSummary(p3Faction)}</small></label>
              <button title={controllerHelp[p3]} onClick={() => setP3(p3 === 'human' ? 'ai' : p3 === 'ai' ? 'dormant' : 'human')}>
                {p3 === 'human' ? 'Human' : p3 === 'ai' ? 'Standard' : 'Dormant'}
              </button>
            </div>
          )}
          {(mapId === 'crosstitch' || mapId === 'crosstitch-kit') && playerCount >= 4 && (
            <div className="slot-row amber">
              <label><b>04</b><select value={p4Faction} onChange={(event) =>
                setP4Faction(event.target.value as FactionChoice)}>
                <option value="random">Random faction</option>
                {Object.values(FACTIONS).map((faction) => (
                  <option key={faction.id} value={faction.id}>{faction.name}</option>
                ))}
              </select><small className="menu-field-help">{factionSummary(p4Faction)}</small></label>
              <button title={controllerHelp[p4]} onClick={() => setP4(p4 === 'human' ? 'ai' : p4 === 'ai' ? 'dormant' : 'human')}>
                {p4 === 'human' ? 'Human' : p4 === 'ai' ? 'Standard' : 'Dormant'}
              </button>
            </div>
          )}
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
            <small className="menu-field-help">Use the same seed and setup to reproduce random offers and outcomes.</small>
          </label>
        </div>
        <button className="primary start-button" onClick={() => onStart({
          seed, p1: mapId === 'grand-muster' ? 'human' : p1,
          p2: mapId === 'grand-muster' ? 'dormant' : p2,
          p1Faction: mapId === 'grand-muster' ? 'hearthguard'
            : resolveFaction(p1Faction, seed, 1),
          p2Faction: mapId === 'grand-muster' ? 'woundWrights'
            : resolveFaction(p2Faction, seed, 2), mapId,
          playerCount: mapId === 'crosstitch' || mapId === 'crosstitch-kit' || mapId === 'manywhere'
            ? playerCount : 2,
          difficulty,
          p3, p4,
          p3Faction: resolveFaction(p3Faction, seed, 3),
          p4Faction: resolveFaction(p4Faction, seed, 4),
        })}>
          Begin campaign <span>→</span>
        </button>
        {savedGame && (
          <button className="load-button" onClick={() => onLoad()}>
            <span>
              <b>Continue saved game</b>
              <small>
                Week {savedGame.week} · Day {savedGame.day} · {savedGame.activePlayer}
              </small>
            </span>
            <i>↗</i>
          </button>
        )}
        {manualSaves.map((summary, index) => summary && (
          <button className="load-button" key={index} onClick={() => onLoad(index + 1)}>
            <span><b>Load manual slot {index + 1}</b>
              <small>Week {summary.week} · Day {summary.day} · {summary.activePlayer}</small>
            </span><i>↗</i>
          </button>
        ))}
        {autoSaves.map((summary, index) => summary && (
          <button className="load-button" key={`auto-${index}`}
            onClick={() => onLoad(`auto-${index}`)}>
            <span><b>Recover autosave {index + 1}</b>
              <small>Week {summary.week} · Day {summary.day} · {summary.activePlayer}</small>
            </span><i>↗</i>
          </button>
        ))}
        <button className="load-button" onClick={onImport}><span><b>Import save file</b>
          <small>Replay a deterministic campaign export.</small></span><i>⇧</i></button>
        <a className="load-button terrain-showcase-link" href="?terrain-showcase=1">
          <span><b>Open terrain showcase</b>
            <small>Inspect nine native 32×32 terrain families and their transition grammar.</small>
          </span><i>↗</i>
        </a>
        <footer>Seed {seed} · deterministic replay enabled</footer>
      </section>
    </main>
  );
}
