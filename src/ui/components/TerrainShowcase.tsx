import { useMemo } from 'react';
import {
  createGameTerrainShowcaseGrid, createTerrainShowcaseGrid,
} from '../terrainShowcase';
import {
  BASE_TERRAIN_VISUALS, GAME_TERRAIN_VISUALS, NATIVE_TERRAIN_TILE,
} from '../terrainTransitions';
import { NativeTerrainSurface } from './NativeTerrainSurface';

const LABELS = {
  water: 'Water', grass: 'Grass', snow: 'Snow', swamp: 'Swamp', volcanic: 'Volcanic',
  desert: 'Desert', dirt: 'Dirt', plains: 'Plains', beach: 'Beach',
} as const;

const GAME_LABELS = {
  deepwood: 'Deepwood', mosswold: 'Mosswold', ashsteppe: 'Ashsteppe',
  barrowfield: 'Barrowfield', lacquerFlats: 'Lacquer Flats', mire: 'Mire',
} as const;

const GENERATED_GAME_FAMILIES = [
  ['deepwood', 'Deepwood', ['micro']],
  ['mosswold', 'Mosswold', ['micro', 'macro']],
  ['ashsteppe', 'Ashsteppe', ['micro']],
  ['barrowfield', 'Barrowfield', ['micro']],
  ['lacquer-flats', 'Lacquer Flats', ['micro', 'macro']],
  ['mire', 'Mire', ['micro']],
] as const;

export function TerrainShowcase() {
  const grid = useMemo(createTerrainShowcaseGrid, []);
  const gameGrid = useMemo(createGameTerrainShowcaseGrid, []);
  const width = grid[0].length * NATIVE_TERRAIN_TILE;
  const height = grid.length * NATIVE_TERRAIN_TILE;
  const gameWidth = gameGrid[0].length * NATIVE_TERRAIN_TILE;
  const gameHeight = gameGrid.length * NATIVE_TERRAIN_TILE;

  return (
    <main className="terrain-showcase-shell" data-ready="true">
      <header>
        <div>
          <div className="kicker">Native terrain transition study</div>
          <h1>Terrain showcase</h1>
          <p>Every logical tile and displayed tile is {NATIVE_TERRAIN_TILE}×{NATIVE_TERRAIN_TILE}. Sand mediates coastlines; dirt mediates incompatible land.</p>
        </div>
        <a href="./">Back to game</a>
      </header>
      <nav aria-label="Terrain families">
        {BASE_TERRAIN_VISUALS.map((terrain) => <span key={terrain} className={`terrain-key ${terrain}`}>
          <i />{LABELS[terrain]}
        </span>)}
      </nav>
      <section className="terrain-showcase-frame">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
          aria-label="Empty terrain transition showcase">
          <NativeTerrainSurface grid={grid} />
        </svg>
      </section>
      <section className="game-terrain-study" aria-labelledby="game-terrain-heading">
        <div className="game-terrain-study-copy">
          <div className="kicker">Canonical game terrain</div>
          <h2 id="game-terrain-heading">Canonical generated families</h2>
          <p>Selected native PixelLab variants establish each family; the generated Wang cells and scale-controlled details are shown below. Dirt mediates incompatible land; beach mediates the Mire coast.</p>
          <nav aria-label="Game terrain families">
            {GAME_TERRAIN_VISUALS.map((terrain) => <span key={terrain}>{GAME_LABELS[terrain]}</span>)}
          </nav>
        </div>
        <div className="terrain-showcase-frame">
          <svg width={gameWidth} height={gameHeight} viewBox={`0 0 ${gameWidth} ${gameHeight}`}
            aria-label="Game-specific terrain transition showcase">
            <NativeTerrainSurface grid={gameGrid} className="game-terrain-composite" />
          </svg>
        </div>
        <div className="generated-game-terrain-study">
          <div>
            <div className="kicker">Selected native PixelLab output</div>
            <h3>Generated Wang and detail vocabulary</h3>
            <p>Each long row contains sixteen selected 32×32 Wang cells. Detail swatches remain displayed at native size: tiny marks are 2–5 pixels; the two larger accepted marks remain narrow and below half a cell.</p>
          </div>
          <div className="generated-game-terrain-rows">
            {GENERATED_GAME_FAMILIES.map(([slug, label, details]) => <figure key={slug}>
              <figcaption>{label}</figcaption>
              <img className="wang-strip" src={`assets/terrain/game-native/${slug}/wang-strip.png`}
                width={512} height={32} alt={`Sixteen selected native ${label} Wang cells`} />
              <span className="generated-detail-swatches">
                {details.map((detail) => <img key={detail}
                  src={`assets/terrain/game-native/${slug}/detail-${detail}.png`}
                  width={32} height={32} alt={`${label} ${detail} detail at native scale`} />)}
              </span>
            </figure>)}
          </div>
        </div>
      </section>
    </main>
  );
}
