import { useId, useMemo } from 'react';
import {
  BASE_TERRAIN_VISUALS, TERRAIN_VISUALS, terrainGridPaths, type TerrainVisualGrid,
  type TerrainVisualId,
} from '../terrainTransitions';

const PATTERN_SIZE = 288;

export function NativeTerrainSurface({
  grid, className = '',
}: {
  grid: TerrainVisualGrid;
  className?: string;
}) {
  const instanceId = useId().replaceAll(':', '');
  const paths = useMemo(() => terrainGridPaths(grid), [grid]);
  const patternId = (terrain: string) => `native-terrain-${terrain}-${instanceId}`;
  const textureUrl = (terrain: TerrainVisualId) => BASE_TERRAIN_VISUALS.includes(terrain as never)
    ? `assets/terrain/original-showcase-${terrain}.png`
    : `assets/terrain/game-showcase-${terrain === 'lacquerFlats' ? 'lacquer-flats' : terrain}.png`;

  return <g className={`terrain-composite ${className}`} shapeRendering="crispEdges">
    <defs>
      {TERRAIN_VISUALS.map((terrain) => <pattern key={terrain} id={patternId(terrain)}
        patternUnits="userSpaceOnUse" width={PATTERN_SIZE} height={PATTERN_SIZE}>
        <image className="terrain-pixel" href={textureUrl(terrain)}
          width={PATTERN_SIZE} height={PATTERN_SIZE} preserveAspectRatio="none" />
      </pattern>)}
    </defs>
    {paths.map(({ terrain, d }) => <path key={terrain} className={`terrain-fill ${terrain}`}
      d={d} fill={`url(#${patternId(terrain)})`} />)}
  </g>;
}
