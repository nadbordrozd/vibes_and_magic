import { useState } from 'react';
import type { NewGameOptions } from '../../core/types';
import type { SaveSummary } from '../persistence';

interface Props {
  onStart: (options: NewGameOptions) => void;
  savedGame: SaveSummary | null;
  onLoad: () => void;
}

function freshSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function MainMenu({ onStart, savedGame, onLoad }: Props) {
  const [seed, setSeed] = useState(() => freshSeed());
  const [p1, setP1] = useState<'human' | 'ai'>('human');
  const [p2, setP2] = useState<'human' | 'ai'>('ai');

  return (
    <main className="menu-shell">
      <section className="menu-card">
        <div className="kicker">A deterministic strategy experiment</div>
        <h1>Border<br /><span>Marches</span></h1>
        <p className="menu-copy">
          Raise an army, seize the mountain passes, and take your rival’s castle.
        </p>
        <div className="menu-fields">
          <label>
            Map
            <select disabled value="border-marches">
              <option value="border-marches">Border Marches · 2 players</option>
            </select>
          </label>
          <div className="slot-row crimson">
            <span><b>01</b> Crimson</span>
            <button onClick={() => setP1(p1 === 'human' ? 'ai' : 'human')}>
              {p1 === 'human' ? 'Human' : 'AI'}
            </button>
          </div>
          <div className="slot-row azure">
            <span><b>02</b> Azure</span>
            <button onClick={() => setP2(p2 === 'human' ? 'ai' : 'human')}>
              {p2 === 'human' ? 'Human' : 'AI'}
            </button>
          </div>
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
          </label>
        </div>
        <button className="primary start-button" onClick={() => onStart({ seed, p1, p2 })}>
          Begin campaign <span>→</span>
        </button>
        {savedGame && (
          <button className="load-button" onClick={onLoad}>
            <span>
              <b>Continue saved game</b>
              <small>
                Week {savedGame.week} · Day {savedGame.day} · {savedGame.activePlayer}
              </small>
            </span>
            <i>↗</i>
          </button>
        )}
        <footer>Seed {seed} · deterministic replay enabled</footer>
      </section>
    </main>
  );
}
