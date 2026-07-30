import { guardianIntel } from '../../core/selectors';
import type {
  Coord, GameState, Hero, MapObject, ResourceId,
} from '../../core/types';

const TILE = 32;
const TERRAIN_COLOR = {
  grass: '#769c45', forest: '#365f3c', barrow: '#6f6674',
  mountain: '#777a78', water: '#397b91',
};
const RESOURCE_MARK: Record<ResourceId, string> = {
  gold: 'G', timber: 'T', iron: 'I', essence: 'E',
};

function objectTitle(object: MapObject): string {
  if (object.kind === 'pile') return `${object.amount} ${object.resource}`;
  if (object.kind === 'chest') {
    return object.cleared ? 'Treasure chest' : 'Guarded treasure chest';
  }
  if (object.kind === 'shrine') {
    return `${object.school} shrine · teaches ${object.teaches}`;
  }
  return `${object.resource} mine · ${object.owner ?? 'neutral'}`;
}

function MapObjectGlyph({ object, state }: { object: MapObject; state: GameState }) {
  const x = object.position.x * TILE;
  const y = object.position.y * TILE;
  const intel = guardianIntel(state, object);
  const guardLabel = intel?.label ?? '';
  const title = `${objectTitle(object)}${intel
    ? ` · Guard: ${intel.label}${intel.abilities.length
      ? ` · ${intel.abilities.join(', ')}` : ''}` : ''}`;
  const guard = guardLabel
    ? <text className="guard-count" x="10" y="-9">{guardLabel}</text> : null;
  if (object.kind === 'pile') {
    return (
      <g className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <path className={`pile ${object.resource}`} d="M0 -8 L8 0 L0 8 L-8 0 Z" />
        <text y="3">{RESOURCE_MARK[object.resource]}</text>
      </g>
    );
  }
  if (object.kind === 'chest') {
    return (
      <g className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <rect className="chest" x="-9" y="-6" width="18" height="13" rx="2" />
        <path d="M-9 -2 H9" className="glyph-line" />{guard}
      </g>
    );
  }
  if (object.kind === 'shrine') {
    return (
      <g className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <path className={`shrine-glyph ${object.school}`} d="M0 -12 L10 8 L-10 8 Z" />
        <text y="5">✦</text>{guard}
      </g>
    );
  }
  return (
    <g className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
      <title>{title}</title>
      <circle className={`mine-ring ${object.owner ?? 'neutral'}`} r="11" />
      <text y="4">{RESOURCE_MARK[object.resource]}</text>{guard}
    </g>
  );
}

interface Props {
  state: GameState;
  hero: Hero | null;
  reachable: Set<string>;
  path: Coord[];
  movement: { path: Coord[]; index: number } | null;
  mapStep: number;
  onTile: (coord: Coord) => void;
}

export function AdventureMap({
  state, hero, reachable, path, movement, mapStep, onTile,
}: Props) {
  const explored = new Set(state.players[state.activePlayer].explored);
  return (
    <section className="map-frame">
      <div className="map-caption">
        <span>Border Marches</span><small>Click a destination twice to travel</small>
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
            <g key={key} onClick={() => onTile({ x, y })}>
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
              {seen && terrain === 'barrow' && (
                <text className="terrain-glyph" x={x * TILE + 16} y={y * TILE + 21}>†</text>
              )}
            </g>
          );
        }))}
        {state.map.objects.filter((object) => {
          if (!explored.has(`${object.position.x},${object.position.y}`)) return false;
          if (object.kind === 'pile') return !object.collected;
          if (object.kind === 'chest') return !object.collected;
          return true;
        }).map((object) => (
          <MapObjectGlyph key={object.id} object={object} state={state} />
        ))}
        {state.castles.filter((castle) =>
          explored.has(`${castle.position.x},${castle.position.y}`)).map((castle) => (
          <g className="map-overlay-glyph" key={castle.id} transform={`translate(${castle.position.x * TILE + 16} ${castle.position.y * TILE + 16})`}>
            <title>{`${castle.faction} castle · ${castle.owner}`}</title>
            <rect className={`castle-glyph ${castle.owner}`} x="-12" y="-12" width="24" height="24" />
            <text y="5">♜</text>
          </g>
        ))}
        {Object.values(state.players).flatMap((mapPlayer) =>
          mapPlayer.heroes.filter((mapHero) => mapHero.alive
            && explored.has(`${mapHero.position.x},${mapHero.position.y}`))
            .map((mapHero) => (
              <g
                className="map-overlay-glyph"
                key={mapHero.id}
                style={{
                  transition: `transform ${mapStep}ms linear`,
                  transform: (() => {
                    const position = movement && mapHero.id === hero?.id
                      ? movement.path[movement.index] : mapHero.position;
                    return `translate(${position.x * TILE + 16}px, ${position.y * TILE + 16}px)`;
                  })(),
                }}
              >
                <title>{`${mapHero.name} · ${mapPlayer.name}${
                  mapPlayer.id !== state.activePlayer && hero?.skills.scouting === 2
                    ? ` · ${mapHero.army.filter(Boolean).map((stack) =>
                      `${stack!.count} ${stack!.unitId}`).join(', ')}`
                    : ''
                }`}</title>
                <circle className={`hero-glyph ${mapPlayer.id}`} r="9" />
                <text className="hero-initial" y="3">{mapHero.name[0]}</text>
                <path className="hero-flag" d="M0 -6 V5 M1 -6 L7 -3 L1 0" />
              </g>
            )))}
        {path.length > 1 && (
          <polyline
            className="path-preview" markerEnd="url(#path-arrow)"
            points={path.map((coord) =>
              `${coord.x * TILE + 16},${coord.y * TILE + 16}`).join(' ')}
          />
        )}
      </svg>
    </section>
  );
}
