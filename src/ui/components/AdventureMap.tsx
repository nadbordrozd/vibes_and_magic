import { useRef, useState } from 'react';
import { guardianIntel } from '../../core/selectors';
import type {
  Coord, GameState, Hero, MapObject, ResourceId,
} from '../../core/types';
import { itemName } from '../../content/items';
import { ARTIFACTS } from '../../content/artifacts';
import { UNITS } from '../../content/units';
import { hasEquippedArtifact, kitBonuses } from '../../core/artifacts';
import {
  castleEntrance, guardianAggroTiles, guardiansCovering, objectEntranceTile,
  objectFootprint,
} from '../../core/map/occupancy';
import { skillRank } from '../../core/heroBehaviors';
import { SKILLS } from '../../content/skills';
import { RANGED_PICKUP_MOVE_COST } from '../../content/constants';
import { deriveTerrainDecorations, terrainId } from '../../content/terrain';

const TILE = 32;
const TERRAIN_COLOR = {
  meadow: '#769c45', deepwood: '#365f3c', mosswold: '#587b48',
  ashsteppe: '#8a7650', barrowfield: '#6f6674', lacquerFlats: '#8b7d72',
  hush: '#c6d1d0', mire: '#536b58', mountain: '#777a78', water: '#397b91',
};
const RESOURCE_MARK: Record<ResourceId, string> = {
  gold: 'G', timber: 'T', iron: 'I', essence: 'E',
};

function objectTitle(object: MapObject): string {
  if (object.kind === 'pile') return 'Resource Pile';
  if (object.kind === 'chest') return 'Treasure Chest';
  if (object.kind === 'shrine') return `${object.school} shrine`;
  if (object.kind === 'mine') return object.resource === 'gold' ? 'Gold Mine'
    : object.resource === 'timber' ? 'Timber Camp'
      : object.resource === 'iron' ? 'Iron Mine' : 'Essence Spring';
  if (object.kind === 'item') return itemName(object.item);
  if (object.kind === 'richVein') {
    return 'Rich Vein';
  }
  if (object.kind === 'waystation') return 'Waystation';
  if (object.kind === 'lock') return object.name;
  if (object.kind === 'dwelling') return `${UNITS[object.unitId].name} Dwelling`;
  if (object.kind === 'guardian') return 'Guardian Company';
  if (object.kind === 'tinkersCart') return "Wandering Tinker's Cart";
  if (object.kind === 'monastery') return 'The Unstruck Bell Monastery';
  if (object.kind === 'gloamingRing') return 'The Gloaming Ring';
  if (object.kind === 'storyteller') return "Storyteller's Fire";
  if (object.kind === 'chrysalis') return 'The Chrysalis Pool';
  if (object.kind === 'bridge') return object.completed ? 'Completed Bridge' : 'Half-Built Bridge';
  if (object.kind === 'hedgeSchool') return 'Hedge School';
  if (object.kind === 'reliquaryCairn') return 'Reliquary Cairn';
  if (object.kind === 'tollGate') return 'Toll Gate';
  if (object.kind === 'omenStone') return 'Omen Stone';
  if (object.kind === 'crone') return 'A Wayward Crone';
  const seaNames: Partial<Record<MapObject['kind'], string>> = {
    boat: 'Boat', manaSpring: 'Mana Spring', flotsam: 'Flotsam',
    sealedCask: 'Sealed Cask', castaway: 'Castaway', messageBottle: 'Message in a Bottle',
    whirlpool: 'Whirlpool', shipwreck: 'Shipwreck', drownedBell: 'The Drowned Bell',
    sirenRocks: 'Siren Rocks', lighthouse: 'Lighthouse',
  };
  if (seaNames[object.kind]) return seaNames[object.kind]!;
  const discoveryNames: Partial<Record<MapObject['kind'], string>> = {
    watermill: 'Watermill', windmill: 'Windmill', tradingCamp: 'Trading Camp',
    sparringStone: 'The Sparring Stone', listeningStones: 'The Listening Stones',
    longDraught: 'The Long Draught', grinningIdol: 'The Grinning Idol',
    hutOnTheHill: 'The Hut on the Hill', treeSecondThoughts: 'Tree of Second Thoughts',
    warmTable: 'The Warm Table', coldSpring: 'The Cold Spring',
    idolOfSomebody: 'The Idol of Somebody', wishingWell: 'Wishing Well',
    ruinedWatchtower: 'Ruined Watchtower', oldBearsCave: "The Old Bear's Cave",
    wolfHollow: 'Wolf Hollow', unquietYard: 'The Unquiet Yard',
    moltingCourt: 'The Molting Court', spoolHoard: 'The Spool-Hoard',
    mercenaryCamp: 'Mercenary Camp', wagonCamp: 'Wagon Camp', titheBarn: 'The Tithe Barn',
    skeletonGrass: 'The Skeleton in the Grass', coldCampfire: 'Cold Campfire',
    shepherdsLeanTo: "Shepherd's Lean-to", overgrownCart: 'The Overgrown Cart',
    patientStone: 'Patient Stone', cache: 'Cache', obstacle: object.kind === 'obstacle' ? object.prop : 'Obstacle',
  };
  return discoveryNames[object.kind] ?? 'Barrow-Field';
}

function MapObjectGlyph({
  object, state, pickup, onPickup,
  onEnter,
}: {
  object: MapObject; state: GameState; pickup: boolean;
  onPickup: (id: string) => void; onEnter: (coord: Coord) => void;
}) {
  const footprint = objectFootprint(object);
  const x = object.position.x * TILE + (footprint.w - 1) * TILE / 2;
  const y = object.position.y * TILE + (footprint.h - 1) * TILE / 2;
  const intel = object.kind === 'guardian' ? guardianIntel(state, object) : null;
  const guardLabel = intel?.label ?? '';
  const title = objectTitle(object);
  const guard = guardLabel
    ? <text className="guard-count" x="10" y="-9">{guardLabel}</text> : null;
  const inspect = {
    'data-inspect-kind': 'object', 'data-inspect-id': object.id,
    onClick: pickup ? (event: React.MouseEvent) => {
      event.stopPropagation(); onPickup(object.id);
    } : undefined,
  };
  if (object.kind === 'guardian') {
    return (
      <g {...inspect} className="map-object-glyph guardian-object"
        onClick={() => onEnter(object.position)}
        transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        {guardianAggroTiles(object, state.map).map((tile) => (
          <rect key={`${tile.x},${tile.y}`} className="guardian-aggro"
            x={(tile.x - object.position.x) * TILE - 16}
            y={(tile.y - object.position.y) * TILE - 16}
            width={TILE} height={TILE} />
        ))}
        <path className="guardian-shield" d="M0 -12 L10 -7 L8 7 L0 13 L-8 7 L-10 -7 Z" />
        <text y="4">⚔</text>
      </g>
    );
  }
  if (object.kind === 'pile') {
    return (
      <g {...inspect} className={`map-object-glyph ${pickup ? 'pickup-eligible' : ''}`} transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <path className={`pile ${object.resource}`} d="M0 -8 L8 0 L0 8 L-8 0 Z" />
        <text y="3">{RESOURCE_MARK[object.resource]}</text>
      </g>
    );
  }
  if (object.kind === 'chest') {
    return (
      <g {...inspect} className={`map-object-glyph ${pickup ? 'pickup-eligible' : ''}`} transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <rect className="chest" x="-9" y="-6" width="18" height="13" rx="2" />
        <path d="M-9 -2 H9" className="glyph-line" />{guard}
      </g>
    );
  }
  if (object.kind === 'shrine') {
    return (
      <g {...inspect} className={`map-object-glyph ${pickup ? 'pickup-eligible' : ''}`} transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <path className={`shrine-glyph ${object.school}`} d="M0 -12 L10 8 L-10 8 Z" />
        <text y="5">✦</text>{guard}
      </g>
    );
  }
  if (object.kind === 'item') {
    return (
      <g {...inspect} className={`map-object-glyph ${pickup ? 'pickup-eligible' : ''}`} transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <path className="pile essence" d="M0 -9 L9 0 L0 9 L-9 0 Z" />
        <text y="4">◇</text>
      </g>
    );
  }
  if (object.kind === 'richVein') {
    return (
      <g {...inspect} className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <circle className={`mine-ring ${object.owner ?? 'neutral'}`} r="11" />
        <text y="4">{object.depleted ? '×' : 'E'}</text>
      </g>
    );
  }
  if (object.kind === 'waystation') {
    return (
      <g {...inspect} className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <rect className="chest" x="-10" y="-9" width="20" height="18" rx="4" />
        <text y="4">↟</text>
      </g>
    );
  }
  if (object.kind === 'lock') {
    return (
      <g {...inspect} className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <circle className="mine-ring neutral" r="13" />
        <text y="4">{object.id === 'the-sleeper' ? '⌁' : '◈'}</text>{guard}
      </g>
    );
  }
  if (object.kind === 'mine') return (
    <g {...inspect} className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
      <title>{title}</title>
      <circle className={`mine-ring ${object.owner ?? 'neutral'}`} r="11" />
      <text y="4">{RESOURCE_MARK[object.resource]}</text>{guard}
    </g>
  );
  const marks: Partial<Record<MapObject['kind'], string>> = {
    dwelling: '⌂', tinkersCart: '♧', monastery: '♩', gloamingRing: '○',
    storyteller: '♨', chrysalis: '◉', bridge: '═', hedgeSchool: '⌁',
    reliquaryCairn: '◇', tollGate: '▥', omenStone: '☼', crone: '☾', barrowField: '†',
    boat: '⛵', manaSpring: '✦', flotsam: '▤', sealedCask: '▣', castaway: '♙',
    messageBottle: '!', whirlpool: '◌', shipwreck: '⌁', drownedBell: '♩',
    sirenRocks: '♪', lighthouse: '☼',
    watermill: '≋', windmill: '✣', tradingCamp: '¤', sparringStone: 'A',
    listeningStones: '◌', longDraught: '∪', grinningIdol: '☻', hutOnTheHill: '⌂',
    treeSecondThoughts: '♣', warmTable: '♨', coldSpring: '≋', idolOfSomebody: '♙',
    wishingWell: '○', ruinedWatchtower: '▥', oldBearsCave: '▲', wolfHollow: '⋔',
    unquietYard: '†', moltingCourt: '◉', spoolHoard: '◎', mercenaryCamp: '⚑',
    wagonCamp: '▤', titheBarn: '⌂', skeletonGrass: '†', coldCampfire: '♨',
    shepherdsLeanTo: '⌂', overgrownCart: '▤', patientStone: '◈', cache: '◆', obstacle: '▲',
  };
  return (
    <g {...inspect} className="map-object-glyph creative-object" transform={`translate(${x + 16} ${y + 16})`}>
      <title>{title}</title><circle className="mine-ring neutral" r="11" />
      <text y="4">{marks[object.kind] ?? '?'}</text>{guard}
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
  onPickup: (objectId: string) => void;
}

export function AdventureMap({
  state, hero, reachable, path, movement, mapStep, onTile, onPickup,
}: Props) {
  const frameRef = useRef<HTMLElement>(null);
  const [largeMinimap, setLargeMinimap] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const [pickupFlight, setPickupFlight] = useState<{
    key: number; position: Coord; mark: string;
  } | null>(null);
  const explored = new Set(state.players[state.activePlayer].explored);
  const decorations = deriveTerrainDecorations(state.map);
  const revealKit = hero ? kitBonuses(hero) : null;
  const pathDestination = path.at(-1);
  const pathInRange = Boolean(pathDestination
    && reachable.has(`${pathDestination.x},${pathDestination.y}`));
  const aggroIndex = hero ? path.findIndex((coord, index) => index > 0
    && (Boolean(guardianAtPath(state, coord))
      || guardiansCovering(state.map, coord, hero.id).length > 0)) : -1;
  const pickupRange = hero ? skillRank(hero, 'forager') >= 3
    ? SKILLS.forager.values.rank3Range : skillRank(hero, 'forager') >= 2
      ? SKILLS.forager.values.rank2Range : 1 : 0;
  const handlePickup = (objectId: string) => {
    const object = state.map.objects.find((candidate) => candidate.id === objectId);
    onPickup(objectId);
    if (!object) return;
    const mark = object.kind === 'pile' ? RESOURCE_MARK[object.resource]
      : object.kind === 'item' ? '◇' : '✦';
    setPickupFlight({
      key: Date.now(), position: objectEntranceTile(object), mark,
    });
  };
  return (
    <section className="map-frame" ref={frameRef} onScroll={(event) => {
      const element = event.currentTarget;
      setViewport({
        x: element.scrollLeft / (state.map.width * TILE),
        y: element.scrollTop / (state.map.height * TILE),
        w: Math.min(1, element.clientWidth / (state.map.width * TILE)),
        h: Math.min(1, element.clientHeight / (state.map.height * TILE)),
      });
    }}>
      <div className="map-caption">
        <span>{state.map.name}</span><small>{path.length > 1
          ? pathInRange ? 'Destination in range · click again to travel'
            : 'Beyond today’s movement · travel continues as far as possible'
          : 'Click a destination twice to travel'}</small>
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
          <marker id="path-arrow-far" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 Z" fill="#dc6a58" />
          </marker>
        </defs>
        {state.map.terrain.flatMap((row, y) => row.map((tileData, x) => {
          const terrain = terrainId(tileData);
          const key = `${x},${y}`;
          const seen = explored.has(key);
          return (
            <g key={key} onClick={() => onTile({ x, y })}
              data-inspect-kind="terrain" data-inspect-id={terrain}>
              <rect
                x={x * TILE} y={y * TILE} width={TILE} height={TILE}
                fill={seen ? TERRAIN_COLOR[terrain] : '#0a0d0b'}
                className={seen && reachable.has(key) ? 'reachable-map-tile' : ''}
              />
              {seen && terrain === 'deepwood' && (
                <text className="terrain-glyph" x={x * TILE + 16} y={y * TILE + 21}>♠</text>
              )}
              {seen && terrain === 'mountain' && (
                <path className="mountain-glyph" d={`M${x * TILE + 4} ${y * TILE + 27} L${x * TILE + 16} ${y * TILE + 5} L${x * TILE + 29} ${y * TILE + 27} Z`} />
              )}
              {seen && terrain === 'barrowfield' && (
                <text className="terrain-glyph" x={x * TILE + 16} y={y * TILE + 21}>†</text>
              )}
            </g>
          );
        }))}
        {decorations.filter((decoration) => explored.has(`${decoration.position.x},${decoration.position.y}`))
          .map((decoration) => <circle key={decoration.id} className="terrain-decoration"
            data-inspect-kind="decoration" data-inspect-id={decoration.id}
            cx={decoration.position.x * TILE + 24} cy={decoration.position.y * TILE + 9}
            r="2.2"><title>{decoration.label}</title></circle>)}
        {(state.map.seams ?? []).filter((position) =>
          revealKit?.revealEssenceAndSeams
          || explored.has(`${position.x},${position.y}`)).map((position, index) => (
          <path
            key={`seam-${index}`} className="seam-mark"
            d={`M${position.x * TILE + 3} ${position.y * TILE + 3} L${position.x * TILE + 29} ${position.y * TILE + 29}`}
          />
        ))}
        {(state.map.roads ?? []).filter((position) =>
          explored.has(`${position.x},${position.y}`)).map((position) => (
          <path key={`road-${position.x}-${position.y}`} className="road-overlay"
            d={`M${position.x * TILE} ${position.y * TILE + TILE / 2} H${(position.x + 1) * TILE}`} />
        ))}
        {state.map.objects.filter((object) => {
          if (object.kind === 'cache' && object.hidden) return false;
          const visibleKit = object.kind === 'lock'
            && object.reward.artifacts?.some((artifact) => ARTIFACTS[artifact.id].class === 'kit');
          const visibleEssence = revealKit?.revealEssenceAndSeams
            && ((object.kind === 'pile' && object.resource === 'essence')
              || (object.kind === 'mine' && object.resource === 'essence')
              || object.kind === 'richVein');
          if (!explored.has(`${object.position.x},${object.position.y}`)
              && !visibleKit && !visibleEssence) return false;
          if (object.kind === 'pile') return !object.collected;
          if (object.kind === 'chest') return !object.collected;
          if (object.kind === 'item') return !object.collected;
          if ('collected' in object) return !object.collected;
          if (object.kind === 'lock') return !object.cleared;
          return true;
        }).map((object) => (
          <g key={object.id}>
            {(() => { const footprint = objectFootprint(object); return footprint.w > 1 || footprint.h > 1 ? (
              <rect className="object-footprint" x={object.position.x * TILE + 2}
                y={object.position.y * TILE + 2} width={footprint.w * TILE - 4}
                height={footprint.h * TILE - 4} rx="4" />
            ) : null; })()}
            <MapObjectGlyph object={object} state={state} onPickup={handlePickup} onEnter={onTile}
              pickup={Boolean(hero && ['pile', 'item', 'chest', 'flotsam', 'sealedCask',
                'castaway', 'messageBottle'].includes(object.kind)
                && hero.movement >= RANGED_PICKUP_MOVE_COST
                && Math.max(Math.abs(objectEntranceTile(object).x - hero.position.x),
                  Math.abs(objectEntranceTile(object).y - hero.position.y)) <= pickupRange)} />
          </g>
        ))}
        {state.mapEffects.flatMap((effect) => {
          if (effect.kind === 'thicket') return effect.positions.map((position, index) => (
            <g key={`${effect.id}-${index}`} className="map-effect thicket-effect">
              <rect x={position.x * TILE + 2} y={position.y * TILE + 2} width={TILE - 4} height={TILE - 4} rx="6" />
              <text x={position.x * TILE + 16} y={position.y * TILE + 21}>♣</text>
            </g>
          ));
          if (effect.kind === 'passage') return effect.entrances.map((position, index) => (
            <g key={`${effect.id}-${index}`} className="map-effect passage-effect">
              <circle cx={position.x * TILE + 16} cy={position.y * TILE + 16} r="11" />
              <text x={position.x * TILE + 16} y={position.y * TILE + 21}>⌘</text>
            </g>
          ));
          return (
            <g key={effect.id} className={`map-effect resonance-effect ${effect.school}`}>
              <circle cx={effect.position.x * TILE + 16} cy={effect.position.y * TILE + 16} r="10" />
              <text x={effect.position.x * TILE + 16} y={effect.position.y * TILE + 20}>✦</text>
            </g>
          );
        })}
        {state.castles.filter((castle) =>
          explored.has(`${castleEntrance(castle).x},${castleEntrance(castle).y}`)
          || Boolean(hero && castle.owner === 'neutral'
            && hasEquippedArtifact(hero, 'crownHollowTown'))).map((castle) => (
          <g className="map-overlay-glyph" key={castle.id} transform={`translate(${castle.position.x * TILE + 48} ${castle.position.y * TILE + 48})`}>
            <title>{castle.flavor ?? `${castle.variant ?? castle.faction} castle · ${castle.owner}`}{
              hero && castle.owner === 'neutral' && hasEquippedArtifact(hero, 'crownHollowTown')
                ? ` · garrison ${castle.garrison.flatMap((stack) => stack ? [stack.count] : []).join('/') || 'empty'}`
                : ''
            }</title>
            <rect className={`castle-glyph ${castle.owner}`} x="-46" y="-46" width="92" height="92" />
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
                data-inspect-kind="hero" data-inspect-id={mapHero.id}
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
                  mapPlayer.id !== state.activePlayer
                    && (hero?.skills.scouting ?? 0) >= 2
                    ? ` · ${mapHero.army.filter(Boolean).map((stack) =>
                      `${stack!.count} ${stack!.unitId}`).join(', ')}${
                      hero?.skills.scouting === 3
                        ? ` · mana ${mapHero.mana} · spells ${
                          mapHero.knownSpells.join(', ') || 'none'
                        } · items ${
                          mapHero.inventory.filter(Boolean).map(itemName).join(', ') || 'none'
                        } · artifacts ${
                          Object.values(mapHero.artifacts.equipment)
                            .flatMap((item) => item ? [ARTIFACTS[item.id].name] : [])
                            .join(', ') || 'none'
                        }`
                        : ''
                    }`
                    : ''
                }`}</title>
                <circle className={`hero-glyph ${mapPlayer.id}`} r="9" />
                <text className="hero-initial" y="3">{mapHero.name[0]}</text>
                <path className="hero-flag" d="M0 -6 V5 M1 -6 L7 -3 L1 0" />
              </g>
            )))}
        {pickupFlight && (
          <g key={pickupFlight.key}
            transform={`translate(${pickupFlight.position.x * TILE + 16} ${pickupFlight.position.y * TILE + 16})`}>
            <g className="pickup-flight" onAnimationEnd={() => setPickupFlight(null)}>
              <circle r="11" />
              <text y="4">{pickupFlight.mark}</text>
            </g>
          </g>
        )}
        {path.length > 1 && aggroIndex < 1 && (
          <polyline
            className={`path-preview ${pathInRange ? 'in-range' : 'out-of-range'}`}
            markerEnd={`url(#${pathInRange ? 'path-arrow' : 'path-arrow-far'})`}
            points={path.map((coord) =>
              `${coord.x * TILE + 16},${coord.y * TILE + 16}`).join(' ')}
          />
        )}
        {path.length > 1 && aggroIndex >= 1 && (
          <>
            <polyline className="path-preview in-range"
              points={path.slice(0, aggroIndex + 1).map((coord) =>
                `${coord.x * TILE + 16},${coord.y * TILE + 16}`).join(' ')} />
            <polyline className="path-preview aggro-path" markerEnd="url(#path-arrow-far)"
              points={path.slice(Math.max(0, aggroIndex - 1)).map((coord) =>
                `${coord.x * TILE + 16},${coord.y * TILE + 16}`).join(' ')} />
            <text className="aggro-swords" x={path[aggroIndex].x * TILE + 16}
              y={path[aggroIndex].y * TILE + 12}>⚔</text>
          </>
        )}
      </svg>
      <svg className={`minimap ${largeMinimap ? 'large' : ''}`}
        viewBox={`0 0 ${state.map.width} ${state.map.height}`}
        onDoubleClick={() => setLargeMinimap((value) => !value)}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - box.left) / box.width;
          const y = (event.clientY - box.top) / box.height;
          frameRef.current?.scrollTo({
            left: x * state.map.width * TILE - frameRef.current.clientWidth / 2,
            top: y * state.map.height * TILE - frameRef.current.clientHeight / 2,
          });
        }}>
        {state.map.terrain.flatMap((row, y) => row.map((tileData, x) => (
          <rect key={`mini-${x}-${y}`} x={x} y={y} width="1" height="1"
            fill={explored.has(`${x},${y}`) ? TERRAIN_COLOR[terrainId(tileData)] : '#080a09'} />
        )))}
        {state.map.objects.filter((object) => explored.has(`${object.position.x},${object.position.y}`))
          .map((object) => <circle key={`mini-object-${object.id}`} cx={object.position.x + .5}
            cy={object.position.y + .5} r=".28" fill={'owner' in object && object.owner
              ? `var(--${object.owner})` : '#aaa'} />)}
        {Object.values(state.players).flatMap((owner) => owner.heroes.filter((unit) => unit.alive
          && explored.has(`${unit.position.x},${unit.position.y}`)).map((unit) => (
          <circle key={`mini-hero-${unit.id}`} cx={unit.position.x + .5} cy={unit.position.y + .5}
            r=".42" className={owner.id} />
        )))}
        <rect className="minimap-viewport" x={viewport.x * state.map.width}
          y={viewport.y * state.map.height} width={viewport.w * state.map.width}
          height={viewport.h * state.map.height} />
      </svg>
    </section>
  );
}

function guardianAtPath(state: GameState, coord: Coord): boolean {
  return state.map.objects.some((object) => object.kind === 'guardian'
    && object.position.x === coord.x && object.position.y === coord.y);
}
