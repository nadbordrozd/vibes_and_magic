import {
  Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { guardianIntel } from '../../core/selectors';
import type {
  Coord, GameState, Hero, MapObject, ResourceId,
} from '../../core/types';
import { itemName } from '../../content/items';
import { ARTIFACTS } from '../../content/artifacts';
import { UNITS } from '../../content/units';
import { SPELLS } from '../../content/spells';
import { hasEquippedArtifact, kitBonuses } from '../../core/artifacts';
import {
  castleEntrance, guardianAggroTiles, guardiansCovering, objectEntranceTile,
  objectFootprint,
} from '../../core/map/occupancy';
import { skillRank } from '../../core/heroBehaviors';
import { SKILLS } from '../../content/skills';
import { RANGED_PICKUP_MOVE_COST } from '../../content/constants';
import {
  DEFAULT_TERRAIN_DECORATION_DENSITY, LARGE_MAP_TERRAIN_DECORATION_DENSITY,
  deriveTerrainDecorations, TERRAIN, terrainId,
} from '../../content/terrain';
import { PIXEL_SCALE, assetId, manifestEntry } from '../../../assets/manifest';
import {
  OwnerFlag, PixelSprite, castleSpriteId, heroSpriteId, mapObjectSpriteId,
  guardianUnitSpriteId, painterOrder,
} from '../assets';
import {
  canopyShouldFade, deriveForestReviewCanopies, forestExperimentMode,
} from '../forestExperiment';
import {
  deriveMountainRanges, mountainRangeGeometry, mountainRangeHasExploredContact,
  mountainRangeIntersectsViewport,
} from '../mountainRanges';
import { CASTLE_NAMES } from '../../content/factionPresentation';
import { SPELL_SCHOOL_NAMES } from '../../content/spellPresentation';
import { gameMapTerrainGrid } from '../terrainTransitions';
import { NativeTerrainSurface } from './NativeTerrainSurface';
import { friendlyHeroMeetingPlan } from '../../core/game/navigation';
import { revealForMovementPath } from '../../core/map/visibility';

const TILE = 32 * PIXEL_SCALE;
const HALF_TILE = TILE / 2;
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
  if (object.kind === 'shrine') return `${SPELL_SCHOOL_NAMES[object.school]} Shrine`;
  if (object.kind === 'mine') return object.resource === 'gold' ? 'Gold Mine'
    : object.resource === 'timber' ? 'Timber Camp'
      : object.resource === 'iron' ? 'Iron Mine' : 'Essence Spring';
  if (object.kind === 'item') return itemName(object.item);
  if (object.kind === 'rewardPickup') return 'Reward Pickup';
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
  onEnter, onPreview, forceGlyph = false, suppressOverlays = false,
}: {
  object: MapObject; state: GameState; pickup: boolean;
  onPickup: (id: string) => void; onEnter: (coord: Coord) => void;
  onPreview: (coord: Coord | null) => void;
  forceGlyph?: boolean; suppressOverlays?: boolean;
}) {
  const footprint = objectFootprint(object);
  const x = object.position.x * TILE + (footprint.w - 1) * TILE / 2;
  const y = object.position.y * TILE + (footprint.h - 1) * TILE / 2;
  const intel = object.kind === 'guardian' ? guardianIntel(state, object) : null;
  const title = intel?.label ?? objectTitle(object);
  const inspect = {
    'data-inspect-kind': 'object', 'data-inspect-id': object.id,
    onClick: pickup ? (event: React.MouseEvent) => {
      event.stopPropagation(); onPickup(object.id);
    } : undefined,
  };
  if (object.kind === 'guardian') {
    const representative = object.army[0]?.unitId;
    return (
      <g {...inspect} className="map-object-glyph guardian-object"
        data-guardian-unit={representative}
        onClick={() => onEnter(object.position)}
        onMouseEnter={() => onPreview(object.position)}>
        <title>{title}</title>
        {!suppressOverlays && guardianAggroTiles(object, state.map).map((tile) => (
          <rect key={`${tile.x},${tile.y}`} className="guardian-aggro"
            x={tile.x * TILE} y={tile.y * TILE} width={TILE} height={TILE} />
        ))}
        {representative && <PixelSprite id={guardianUnitSpriteId(representative)}
          x={object.position.x * TILE + HALF_TILE}
          y={object.position.y * TILE + HALF_TILE}
          className="guardian-unit-pixel" fallback={<g
            transform={`translate(${object.position.x * TILE + HALF_TILE} ${object.position.y * TILE + HALF_TILE})`}>
            <path className="guardian-shield"
              d="M0 -12 L10 -7 L8 7 L0 13 L-8 7 L-10 -7 Z" />
            <text y="4">⚔</text>
          </g>} />}
        <rect className="sprite-hitbox" x={object.position.x * TILE}
          y={object.position.y * TILE} width={TILE} height={TILE} />
      </g>
    );
  }
  const spriteId = mapObjectSpriteId(object);
  if (!forceGlyph && manifestEntry(spriteId)) {
    const activeClass = pickup ? 'pickup-eligible' : '';
    const click = pickup ? (event: React.MouseEvent) => {
      event.stopPropagation(); onPickup(object.id);
    } : () => onEnter(objectEntranceTile(object));
    return (
      <g className={`map-object-glyph map-object-sprite ${activeClass}`}
        data-inspect-kind="object" data-inspect-id={object.id} onClick={click}
        onMouseEnter={() => onPreview(objectEntranceTile(object))}>
        <title>{title}</title>
        <PixelSprite id={spriteId} x={object.position.x * TILE} y={object.position.y * TILE}
          className="map-object-pixel"
          fallback={<MapObjectGlyph object={object} state={state} pickup={pickup}
            onPickup={onPickup} onEnter={onEnter} onPreview={onPreview}
            forceGlyph suppressOverlays />} />
        <OwnerFlag id={spriteId} x={object.position.x * TILE} y={object.position.y * TILE}
          owner={'owner' in object ? object.owner : null} />
        {(footprint.w > 1 || footprint.h > 1) && (() => {
          const entrance = objectEntranceTile(object);
          return <g className="entrance-marker"
            transform={`translate(${entrance.x * TILE + HALF_TILE} ${entrance.y * TILE + TILE - 3})`}>
            <path d="M-7 0 H7 M-4 -3 L0 1 L4 -3" />
          </g>;
        })()}
        <rect className="sprite-hitbox" x={object.position.x * TILE}
          y={object.position.y * TILE} width={footprint.w * TILE} height={footprint.h * TILE} />
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
        <path d="M-9 -2 H9" className="glyph-line" />
      </g>
    );
  }
  if (object.kind === 'shrine') {
    return (
      <g {...inspect} className={`map-object-glyph ${pickup ? 'pickup-eligible' : ''}`} transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <path className={`shrine-glyph ${object.school}`} d="M0 -12 L10 8 L-10 8 Z" />
        <text y="5">✦</text>
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
  if (object.kind === 'rewardPickup') {
    const resource = (Object.keys(object.reward)
      .find((key) => ['gold', 'timber', 'iron', 'essence'].includes(key)) ?? null) as ResourceId | null;
    const mark = object.reward.artifacts?.length ? '◆'
      : object.reward.items?.length ? '◇'
        : resource ? RESOURCE_MARK[resource] : object.reward.teachesSpell ? '✦' : '?';
    return (
      <g {...inspect} className={`map-object-glyph ${pickup ? 'pickup-eligible' : ''}`}
        transform={`translate(${x + 16} ${y + 16})`}>
        <title>{title}</title>
        <path className={`pile ${resource ?? 'essence'}`} d="M0 -10 L10 0 L0 10 L-10 0 Z" />
        <text y="4">{mark}</text>
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
        <text y="4">{object.id === 'the-sleeper' ? '⌁' : '◈'}</text>
      </g>
    );
  }
  if (object.kind === 'mine') return (
    <g {...inspect} className="map-object-glyph" transform={`translate(${x + 16} ${y + 16})`}>
      <title>{title}</title>
      <circle className={`mine-ring ${object.owner ?? 'neutral'}`} r="11" />
      <text y="4">{RESOURCE_MARK[object.resource]}</text>
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
      <text y="4">{marks[object.kind] ?? '?'}</text>
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
  onSelectHero: (heroId: string) => void;
  onMeetHero: (heroId: string) => void;
  onPreviewHero: (heroId: string | null) => void;
  onPreview: (coord: Coord | null) => void;
  onPickup: (objectId: string) => void;
  targetTiles?: Set<string>;
  selectedTargetTiles?: Coord[];
  minimapHost?: HTMLElement | null;
}

export function AdventureMap({
  state, hero, reachable, path, movement, mapStep, onTile, onSelectHero, onMeetHero,
  onPreviewHero, onPreview, onPickup, targetTiles, selectedTargetTiles = [], minimapHost,
}: Props) {
  const frameRef = useRef<HTMLElement>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const meadowField = manifestEntry(assetId.terrainField('meadow'));
  const composedTerrain = useMemo(() => gameMapTerrainGrid(state.map), [state.map.terrain]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const [pickupFlight, setPickupFlight] = useState<{
    key: number; position: Coord; mark: string; resource?: ResourceId;
  } | null>(null);
  const [heroFacings, setHeroFacings] = useState<Record<string, string>>({});
  const [meetingTargetId, setMeetingTargetId] = useState<string | null>(null);
  const previewMapCoord = (position: Coord | null) => {
    setMeetingTargetId(null); onPreviewHero(null); onPreview(position);
  };
  const activePlayer = state.players[state.activePlayer];
  const enteredAnimatedPrefix = movement && hero
    ? movement.path.slice(1, movement.index + 1).filter((position) =>
      !guardianAtPath(state, position)) : [];
  const exploredList = movement && hero ? revealForMovementPath(
    activePlayer.explored, state.map, activePlayer.heroes,
    state.castles.filter((castle) => castle.owner === hero.owner),
    hero, enteredAnimatedPrefix,
  ) : activePlayer.explored;
  const explored = useMemo(() => new Set(exploredList), [exploredList]);
  const decorations = useMemo(() => deriveTerrainDecorations(
    state.map, state.map.name.startsWith('Manywhere') || state.map.id === 'crooked-crown'
      ? LARGE_MAP_TERRAIN_DECORATION_DENSITY : DEFAULT_TERRAIN_DECORATION_DENSITY,
  ), [state.map]);
  const revealKit = hero ? kitBonuses(hero) : null;
  const pathDestination = path.at(-1);
  const pathInRange = Boolean(pathDestination
    && reachable.has(`${pathDestination.x},${pathDestination.y}`));
  const aggroIndex = hero ? path.findIndex((coord, index) => index > 0
    && (Boolean(guardianAtPath(state, coord))
      || guardiansCovering(state.map, coord, hero.id).length > 0)) : -1;
  const previewIntent = destinationIntent(
    state, hero, pathDestination, aggroIndex, pathInRange, meetingTargetId,
  );
  const pickupRange = hero ? skillRank(hero, 'forager') >= 3
    ? SKILLS.forager.values.rank3Range : skillRank(hero, 'forager') >= 2
      ? SKILLS.forager.values.rank2Range : 1 : 0;
  const handlePickup = (objectId: string) => {
    const object = state.map.objects.find((candidate) => candidate.id === objectId);
    onPickup(objectId);
    if (!object) return;
    const mark = object.kind === 'pile' ? RESOURCE_MARK[object.resource]
      : object.kind === 'item' ? '◇'
        : object.kind === 'rewardPickup' && object.reward.artifacts?.length ? '◆'
          : object.kind === 'rewardPickup' && object.reward.items?.length ? '◇' : '✦';
    setPickupFlight({
      key: Date.now(), position: objectEntranceTile(object), mark,
      resource: object.kind === 'pile' ? object.resource : undefined,
    });
  };
  useEffect(() => {
    if (!movement || movement.index < 1) return;
    const previous = movement.path[movement.index - 1];
    const current = movement.path[movement.index];
    if (!previous || !current || !hero) return;
    const dx = Math.sign(current.x - previous.x);
    const dy = Math.sign(current.y - previous.y);
    const direction = ({
      '0,-1': 'n', '1,-1': 'ne', '1,0': 'e', '1,1': 'se',
      '0,1': 's', '-1,1': 'sw', '-1,0': 'w', '-1,-1': 'nw',
    } as Record<string, string>)[`${dx},${dy}`];
    if (direction) setHeroFacings((currentFacings) => ({
      ...currentFacings, [hero.id]: direction,
    }));
  }, [hero, movement]);
  const visibleObjects = state.map.objects.filter((object) => {
    if (object.kind === 'cache' && object.hidden) return false;
    const visibleKit = object.kind === 'lock'
      && object.reward.artifacts?.some((artifact) => ARTIFACTS[artifact.id].class === 'kit');
    const visibleEssence = revealKit?.revealEssenceAndSeams
      && ((object.kind === 'pile' && object.resource === 'essence')
        || (object.kind === 'mine' && object.resource === 'essence')
        || object.kind === 'richVein');
    if (!explored.has(`${object.position.x},${object.position.y}`)
        && !visibleKit && !visibleEssence) return false;
    if (object.kind === 'pile' || object.kind === 'chest' || object.kind === 'item'
        || 'collected' in object) return !object.collected;
    if (object.kind === 'lock') return !object.cleared;
    return true;
  });
  const visibleCastles = state.castles.filter((castle) =>
    explored.has(`${castleEntrance(castle).x},${castleEntrance(castle).y}`)
    || Boolean(hero && castle.owner === 'neutral'
      && hasEquippedArtifact(hero, 'crownHollowTown')));
  const visibleHeroes = Object.values(state.players).flatMap((mapPlayer) =>
    mapPlayer.heroes.filter((mapHero) => mapHero.alive
      && explored.has(`${mapHero.position.x},${mapHero.position.y}`)).map((mapHero) => ({
      mapHero, mapPlayer,
      position: movement && mapHero.id === hero?.id
        ? movement.path[movement.index] : mapHero.position,
    })));
  const focusedHeroPosition = hero ? movement && movement.path[movement.index]
    ? movement.path[movement.index] : hero.position : null;
  const updateViewport = () => {
    const frame = frameRef.current;
    const map = mapRef.current;
    if (!frame || !map) return;
    const frameBounds = frame.getBoundingClientRect();
    const mapBounds = map.getBoundingClientRect();
    if (mapBounds.width <= 0 || mapBounds.height <= 0) return;
    const width = state.map.width * TILE;
    const height = state.map.height * TILE;
    const scaleX = width / mapBounds.width;
    const scaleY = height / mapBounds.height;
    const next = {
      x: Math.max(0, frameBounds.left - mapBounds.left) * scaleX / width,
      y: Math.max(0, frameBounds.top - mapBounds.top) * scaleY / height,
      w: Math.min(1, frame.clientWidth * scaleX / width),
      h: Math.min(1, frame.clientHeight * scaleY / height),
    };
    setViewport((current) => Object.keys(next).every((key) =>
      Math.abs(current[key as keyof typeof current] - next[key as keyof typeof next]) < 0.00001)
      ? current : next);
  };
  useLayoutEffect(() => {
    updateViewport();
    const frame = frameRef.current;
    const map = mapRef.current;
    if (!frame || !map || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateViewport);
    observer.observe(frame);
    observer.observe(map);
    return () => observer.disconnect();
  }, [state.map.width, state.map.height]);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const map = mapRef.current;
    if (!frame || !map || !focusedHeroPosition) return;
    const frameBounds = frame.getBoundingClientRect();
    const mapBounds = map.getBoundingClientRect();
    const mapLeft = frame.scrollLeft + mapBounds.left - frameBounds.left;
    const mapTop = frame.scrollTop + mapBounds.top - frameBounds.top;
    frame.scrollTo({
      left: mapLeft + (focusedHeroPosition.x + 0.5) * TILE - frame.clientWidth / 2,
      top: mapTop + (focusedHeroPosition.y + 0.5) * TILE - frame.clientHeight / 2,
    });
  }, [focusedHeroPosition?.x, focusedHeroPosition?.y, hero?.id]);
  const forestMode = forestExperimentMode(typeof window === 'undefined' ? '' : window.location.search);
  const forestCanopies = forestMode
    ? deriveForestReviewCanopies(state.map, decorations, forestMode) : [];
  const renderedDecorations = forestMode
    ? decorations.filter((decoration) => decoration.kind !== 'canopy-clump') : decorations;
  const mountainRanges = useMemo(() => deriveMountainRanges(state.map), [state.map]);
  const viewportWorld = {
    x: viewport.x * state.map.width * TILE,
    y: viewport.y * state.map.height * TILE,
    width: viewport.w * state.map.width * TILE,
    height: viewport.h * state.map.height * TILE,
  };
  const roadKeys = useMemo(() => new Set(
    (state.map.roads ?? []).map((position) => `${position.x},${position.y}`),
  ), [state.map.roads]);
  const minimapTerrain = useMemo(
    () => minimapTerrainPaths(state.map, explored), [state.map, explored],
  );
  const canopySubjects = [
    ...visibleHeroes.map(({ position }) => position),
    ...visibleObjects.map((object) => objectEntranceTile(object)),
  ];
  const painterItems = painterOrder([
    ...mountainRanges.filter((range) => mountainRangeHasExploredContact(range, explored)
      && mountainRangeIntersectsViewport(range, viewportWorld, TILE)).map((range) => ({
      ...range, row: range.position.y, col: range.position.x, kind: 'mountain-range' as const,
    })),
    ...forestCanopies.filter((canopy) =>
      explored.has(`${canopy.position.x},${canopy.position.y}`)).map((canopy) => ({
      ...canopy, row: canopy.position.y, col: canopy.position.x, kind: 'canopy' as const,
    })),
    ...renderedDecorations.filter((decoration) =>
      explored.has(`${decoration.position.x},${decoration.position.y}`)).map((decoration) => ({
      key: `decoration:${decoration.id}`, row: decoration.position.y,
      col: decoration.position.x, kind: 'decoration' as const, decoration,
    })),
    ...visibleObjects.map((object) => {
      const footprint = objectFootprint(object);
      return {
        key: `object:${object.id}`, row: object.position.y + footprint.h - 1,
        col: object.position.x, kind: 'object' as const, object,
      };
    }),
    ...visibleCastles.map((castle) => ({
      key: `castle:${castle.id}`, row: castle.position.y + castle.footprint.h - 1,
      col: castle.position.x, kind: 'castle' as const, castle,
    })),
    ...visibleHeroes.map(({ mapHero, mapPlayer, position }) => ({
      key: `hero:${mapHero.id}`, row: position.y, col: position.x,
      kind: 'hero' as const, mapHero, mapPlayer, position,
    })),
  ]);
  const minimap = <svg className="minimap"
    aria-label="Minimap · choose a region to center the adventure map"
    viewBox={`0 0 ${state.map.width} ${state.map.height}`}
    onClick={(event) => {
      const box = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      frameRef.current?.scrollTo({
        left: x * state.map.width * TILE - frameRef.current.clientWidth / 2,
        top: y * state.map.height * TILE - frameRef.current.clientHeight / 2,
      });
    }}>
    {minimapTerrain.map(({ color, path: terrainPath }) => (
      <path key={color} d={terrainPath} fill={color} />
    ))}
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
  </svg>;
  return (
    <section className="map-frame" ref={frameRef} tabIndex={-1}
      aria-label="Adventure map viewport" onScroll={updateViewport}>
      <div className="map-caption">
        <span>{state.map.name}</span>
        <small className={`destination-intent ${previewIntent.kind}`}
          data-preview-kind={previewIntent.kind} aria-live="polite">
          <b>{previewIntent.label}</b>{previewIntent.detail && <> · {previewIntent.detail}</>}
        </small>
      </div>
      <svg
        ref={mapRef}
        className="adventure-map"
        data-moving={movement ? 'true' : 'false'}
        data-movement-index={movement?.index ?? undefined}
        data-movement-path-length={movement?.path.length ?? undefined}
        data-presented-explored-count={explored.size}
        width={state.map.width * TILE}
        height={state.map.height * TILE}
        viewBox={`0 0 ${state.map.width * TILE} ${state.map.height * TILE}`}
        aria-label="Adventure map"
      >
        <defs>
          <pattern id="meadow-landscape" patternUnits="userSpaceOnUse"
            width={(meadowField?.w ?? 256) * PIXEL_SCALE}
            height={(meadowField?.h ?? 256) * PIXEL_SCALE}>
            <image className="terrain-pixel" href={meadowField?.file}
              width={(meadowField?.w ?? 256) * PIXEL_SCALE}
              height={(meadowField?.h ?? 256) * PIXEL_SCALE}
              preserveAspectRatio="none" />
          </pattern>
          <marker id="path-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 Z" fill="#f4d875" />
          </marker>
          <marker id="path-arrow-far" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 Z" fill="#dc6a58" />
          </marker>
        </defs>
        <rect className="landscape-ground" x="0" y="0"
          width={state.map.width * TILE} height={state.map.height * TILE}
          fill="url(#meadow-landscape)" />
        <NativeTerrainSurface grid={composedTerrain} />
        {state.map.terrain.flatMap((row, y) => row.map((tileData, x) => {
          const terrain = terrainId(tileData);
          const key = `${x},${y}`;
          const seen = explored.has(key);
          return (
            <Fragment key={key}>
              <rect key={key} className={`terrain-cell terrain-hitbox terrain-${terrain} ${seen
              ? 'terrain-seen' : 'terrain-unseen'} ${reachable.has(key)
              ? 'terrain-reachable' : ''} ${seen && hero
                && (guardianAtPath(state, { x, y })
                  || guardiansCovering(state.map, { x, y }, hero.id).length > 0)
                ? 'fight-destination' : ''} ${targetTiles?.has(key) ? 'spell-legal-target' : ''} ${
                  selectedTargetTiles.some((target) => target.x === x && target.y === y)
                    ? 'spell-selected-target' : ''}`} onClick={() => onTile({ x, y })}
              onMouseEnter={() => previewMapCoord({ x, y })}
              data-inspect-kind={seen ? 'terrain' : undefined}
              data-inspect-id={seen ? terrain : undefined}
              aria-label={seen ? `${TERRAIN[terrain].label} terrain` : 'Unexplored terrain'}
              data-explored={seen ? 'true' : 'false'}
              data-map-x={x} data-map-y={y} x={x * TILE} y={y * TILE}
              width={TILE} height={TILE} fill={seen ? 'transparent' : '#0a0d0b'} />
            </Fragment>
          );
        }))}
        {(state.map.seams ?? []).filter((position) =>
          revealKit?.revealEssenceAndSeams
          || explored.has(`${position.x},${position.y}`)).map((position, index) => (
          <PixelSprite key={`seam-${index}`} id={assetId.overlay('seam', 'default')}
            x={position.x * TILE} y={position.y * TILE} className="seam-pixel"
            fallback={<path className="seam-mark"
              d={`M${position.x * TILE + 3} ${position.y * TILE + 3} L${position.x * TILE + 29} ${position.y * TILE + 29}`} />} />
        ))}
        {(state.map.roads ?? []).filter((position) =>
          explored.has(`${position.x},${position.y}`)).map((position) => (
          <PixelSprite key={`road-${position.x}-${position.y}`}
            id={assetId.overlay('road', roadConnectionMask(state.map, position, roadKeys))}
            x={position.x * TILE} y={position.y * TILE} className="road-pixel"
            fallback={<path className="road-overlay"
              d={`M${position.x * TILE} ${position.y * TILE + TILE / 2} H${(position.x + 1) * TILE}`} />} />
        ))}
        {state.mapEffects.flatMap((effect) => {
          if (effect.kind === 'thicket') return effect.positions.map((position, index) => (
            <g key={`${effect.id}-${index}`} className="map-effect thicket-effect">
              <rect x={position.x * TILE + 2} y={position.y * TILE + 2} width={TILE - 4} height={TILE - 4} rx="6" />
              <text x={position.x * TILE + HALF_TILE}
                y={position.y * TILE + 21 * PIXEL_SCALE}>♣</text>
            </g>
          ));
          if (effect.kind === 'passage') return effect.entrances.map((position, index) => (
            <g key={`${effect.id}-${index}`} className="map-effect passage-effect">
              <circle cx={position.x * TILE + HALF_TILE} cy={position.y * TILE + HALF_TILE}
                r={11 * PIXEL_SCALE} />
              <text x={position.x * TILE + HALF_TILE}
                y={position.y * TILE + 21 * PIXEL_SCALE}>⌘</text>
            </g>
          ));
          return (
            <g key={effect.id} className={`map-effect resonance-effect ${effect.school}`}>
              <circle cx={effect.position.x * TILE + HALF_TILE}
                cy={effect.position.y * TILE + HALF_TILE} r={10 * PIXEL_SCALE} />
              <text x={effect.position.x * TILE + HALF_TILE}
                y={effect.position.y * TILE + 20 * PIXEL_SCALE}>✦</text>
            </g>
          );
        })}
        {painterItems.map((item) => {
          if (item.kind === 'mountain-range') {
            const geometry = mountainRangeGeometry(item, TILE);
            return <g key={item.key} className="mountain-range-decoration"
              data-inspect-kind="decoration" data-inspect-id={item.key}
              data-footprint-x={geometry.footprint.x} data-footprint-y={geometry.footprint.y}
              data-footprint-width={geometry.footprint.width}
              data-footprint-height={geometry.footprint.height}
              data-visual-x={geometry.visual.x} data-visual-y={geometry.visual.y}
              data-visual-width={geometry.visual.width} data-visual-height={geometry.visual.height}>
              <title>Impassable mountain range.</title>
              <svg className="mountain-footprint-clip"
                x={geometry.visual.x} y={geometry.visual.y}
                width={geometry.visual.width} height={geometry.visual.height}
                viewBox={`${geometry.visual.x} ${geometry.visual.y} ${geometry.visual.width} ${geometry.visual.height}`}
                preserveAspectRatio="none" overflow="hidden">
                <PixelSprite id={assetId.decoration('mountain', item.variant)}
                  x={geometry.spriteAnchor.x} y={geometry.spriteAnchor.y}
                  className="decoration-pixel" fallback={null} />
              </svg>
            </g>;
          }
          if (item.kind === 'canopy') {
            const faded = item.mode === 'scattered'
              && canopyShouldFade(item.position, canopySubjects);
            const file = item.mode === 'scattered'
              ? 'assets/review/deepwood-scattered-canopy.png'
              : 'assets/review/deepwood-border-tree.png';
            return <image key={item.key} className="forest-review-canopy" href={file}
              x={item.position.x * TILE} y={item.position.y * TILE - TILE}
              width={TILE} height={TILE * 2} opacity={faded ? 0.4 : 1} />;
          }
          if (item.kind === 'decoration') {
            const { decoration } = item;
            const terrain = terrainId(
              state.map.terrain[decoration.position.y][decoration.position.x],
            );
            const faded = decoration.kind === 'canopy-clump'
              && canopyShouldFade(decoration.position, canopySubjects);
            return <g key={item.key} data-inspect-kind="decoration"
              data-inspect-id={decoration.id} className={decoration.kind === 'canopy-clump'
                ? 'canopy-decoration' : undefined} opacity={faded ? 0.4 : 1}>
              <title>{decoration.label}</title>
              <PixelSprite id={assetId.decoration(terrain, decoration.kind)}
                x={decoration.position.x * TILE} y={decoration.position.y * TILE}
                className="decoration-pixel" fallback={<circle className="terrain-decoration"
                  cx={decoration.position.x * TILE + 24} cy={decoration.position.y * TILE + 9}
                  r="2.2" />} />
            </g>;
          }
          if (item.kind === 'object') {
            const { object } = item;
            const footprint = objectFootprint(object);
            return <g key={item.key}>
              <MapObjectGlyph object={object} state={state} onPickup={handlePickup} onEnter={onTile}
                onPreview={previewMapCoord}
                pickup={Boolean(hero && ['pile', 'item', 'chest', 'flotsam', 'sealedCask',
                  'castaway', 'messageBottle'].includes(object.kind)
                  && hero.movement >= RANGED_PICKUP_MOVE_COST
                  && Math.max(Math.abs(objectEntranceTile(object).x - hero.position.x),
                    Math.abs(objectEntranceTile(object).y - hero.position.y)) <= pickupRange)} />
            </g>;
          }
          if (item.kind === 'castle') {
            const { castle } = item;
            const entrance = castleEntrance(castle);
            return <g className="map-overlay-glyph castle-map-object" key={item.key}
              data-inspect-kind="castle" data-inspect-id={castle.id}
              onClick={(event) => { event.stopPropagation(); onTile(entrance); }}
              onMouseEnter={() => previewMapCoord(entrance)}>
              <title>{`${CASTLE_NAMES[castle.faction]} · ${castle.owner === 'neutral'
                ? 'Neutral' : state.players[castle.owner].name}${castle.flavor ? ` · ${castle.flavor}` : ''}${
                hero && castle.owner === 'neutral' && hasEquippedArtifact(hero, 'crownHollowTown')
                  ? ` · garrison ${castle.garrison.flatMap((stack) => stack ? [stack.count] : []).join('/') || 'empty'}`
                  : ''}`}</title>
              <PixelSprite id={castleSpriteId(castle)} x={castle.position.x * TILE}
                y={castle.position.y * TILE} className="castle-pixel" fallback={<g
                  transform={`translate(${castle.position.x * TILE + 48} ${castle.position.y * TILE + 32})`}>
                  <rect className={`castle-glyph ${castle.owner}`} x="-46" y="-30" width="92" height="60" />
                  <text y="5">♜</text>
                </g>} />
              <OwnerFlag id={castleSpriteId(castle)} x={castle.position.x * TILE}
                y={castle.position.y * TILE} owner={castle.owner} />
              <rect className="sprite-hitbox castle-hitbox" x={castle.position.x * TILE}
                y={castle.position.y * TILE} width={castle.footprint.w * TILE}
                height={castle.footprint.h * TILE} />
              <g className="entrance-marker"
                transform={`translate(${entrance.x * TILE + HALF_TILE} ${entrance.y * TILE + TILE - 3})`}>
                <path d="M-7 0 H7 M-4 -3 L0 1 L4 -3" />
              </g>
            </g>;
          }
          const { mapHero, mapPlayer, position } = item;
          const selected = mapHero.id === hero?.id;
          const friendlyTarget = Boolean(hero && !selected && mapHero.owner === hero.owner);
          const enemyTarget = Boolean(hero && mapHero.owner !== hero.owner);
          const intent = friendlyTarget ? 'exchange' : enemyTarget ? 'attack' : 'select';
          const accessibleLabel = friendlyTarget
            ? `Exchange with ${mapHero.name}. Move to a safe adjacent tile first if needed.`
            : enemyTarget ? `Attack ${mapHero.name}.` : `Select ${mapHero.name}.`;
          const previewHero = () => {
            if (friendlyTarget) {
              setMeetingTargetId(mapHero.id); onPreviewHero(mapHero.id);
            } else {
              previewMapCoord(position);
            }
          };
          const activate = () => {
            if (friendlyTarget) onMeetHero(mapHero.id);
            else if (mapPlayer.id === state.activePlayer) onSelectHero(mapHero.id);
            else onTile(position);
          };
          return <g className={`map-overlay-glyph map-hero ${selected ? 'selected-hero' : ''} ${
            friendlyTarget ? 'friendly-exchange-target' : enemyTarget ? 'enemy-attack-target' : ''}`}
            key={item.key}
            data-inspect-kind="hero" data-inspect-id={mapHero.id}
            data-selected={selected ? 'true' : 'false'}
            data-map-intent={intent}
            role="button" tabIndex={0} aria-label={accessibleLabel}
            onClick={(event) => {
              event.stopPropagation();
              activate();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault(); event.stopPropagation(); activate();
            }}
            onMouseEnter={previewHero}
            onFocus={previewHero}
            style={{
              transition: `transform ${mapStep}ms linear`,
              transform: `translate(${position.x * TILE + HALF_TILE}px, ${position.y * TILE + HALF_TILE}px)`,
            }}>
            <title>{`${mapHero.name} · ${mapPlayer.name}${
              mapPlayer.id !== state.activePlayer && (hero?.skills.scouting ?? 0) >= 2
                ? ` · ${mapHero.army.filter(Boolean).map((stack) =>
                  `${stack!.count} ${UNITS[stack!.unitId].name}`).join(', ')}${
                  hero?.skills.scouting === 3
                    ? ` · mana ${mapHero.mana} · spells ${
                      mapHero.knownSpells.map((id) => SPELLS[id].name).join(', ') || 'none'
                    } · items ${
                      mapHero.inventory.filter(Boolean).map(itemName).join(', ') || 'none'
                    } · artifacts ${
                      Object.values(mapHero.artifacts.equipment)
                        .flatMap((artifact) => artifact ? [ARTIFACTS[artifact.id].name] : [])
                        .join(', ') || 'none'
                    }`
                    : ''
                }`
                : ''
            }`}</title>
            {selected && <>
              <ellipse className="selected-hero-ring" cx="0" cy="7" rx="12" ry="6" />
              <path className="selected-hero-arrow" d="M0 -28 L-5 -36 H5 Z" />
            </>}
            <PixelSprite id={heroSpriteId(mapHero.faction, heroFacings[mapHero.id] ?? 's')}
              x={0} y={0} className="hero-pixel" fallback={<>
                <circle className={`hero-glyph ${mapPlayer.id}`} r="9" />
                <text className="hero-initial" y="3">{mapHero.name[0]}</text>
                <path className="hero-flag" d="M0 -6 V5 M1 -6 L7 -3 L1 0" />
              </>} />
            <circle className="sprite-hitbox hero-hitbox" cx="0" cy="0" r={HALF_TILE} />
          </g>;
        })}
        <g className="fog-occlusion" aria-hidden="true" pointerEvents="none">
          {state.map.terrain.flatMap((row, y) => row.map((_tile, x) => {
            const key = `${x},${y}`;
            return explored.has(key) ? null : <rect key={`fog-${key}`}
              data-fog-key={key}
              x={x * TILE} y={y * TILE} width={TILE} height={TILE} fill="#0a0d0b" />;
          }))}
        </g>
        {pickupFlight && (
          <g key={pickupFlight.key}
            transform={`translate(${pickupFlight.position.x * TILE + HALF_TILE} ${pickupFlight.position.y * TILE + HALF_TILE})`}>
            <g className="pickup-flight" onAnimationEnd={() => setPickupFlight(null)}>
              {pickupFlight.resource ? (() => {
                const entry = manifestEntry(assetId.mapObject('pile', pickupFlight.resource));
                return entry ? <image href={entry.file} x="-16" y="-16" width="32" height="32"
                  preserveAspectRatio="xMidYMid meet" /> : <text y="4">{pickupFlight.mark}</text>;
              })() : <><circle r="11" /><text y="4">{pickupFlight.mark}</text></>}
            </g>
          </g>
        )}
        {path.length > 1 && aggroIndex < 1 && (
          <polyline
            className={`path-preview ${pathInRange ? 'in-range' : 'out-of-range'}`}
            markerEnd={`url(#${pathInRange ? 'path-arrow' : 'path-arrow-far'})`}
            points={path.map((coord) =>
              `${coord.x * TILE + HALF_TILE},${coord.y * TILE + HALF_TILE}`).join(' ')}
          />
        )}
        {path.length > 1 && aggroIndex >= 1 && (
          <>
            <polyline className="path-preview in-range"
              points={path.slice(0, aggroIndex + 1).map((coord) =>
                `${coord.x * TILE + HALF_TILE},${coord.y * TILE + HALF_TILE}`).join(' ')} />
            <polyline className="path-preview aggro-path" markerEnd="url(#path-arrow-far)"
              points={path.slice(Math.max(0, aggroIndex - 1)).map((coord) =>
                `${coord.x * TILE + HALF_TILE},${coord.y * TILE + HALF_TILE}`).join(' ')} />
            <text className="aggro-swords" x={path[aggroIndex].x * TILE + HALF_TILE}
              y={path[aggroIndex].y * TILE + 12 * PIXEL_SCALE}>⚔</text>
          </>
        )}
        {pathDestination && path.length > 1 && (
          <g className={`destination-marker ${previewIntent.kind}`} aria-hidden="true"
            transform={`translate(${pathDestination.x * TILE + HALF_TILE} ${pathDestination.y * TILE + HALF_TILE})`}>
            <circle r={11} />
            {previewIntent.kind === 'interaction' && <path d="M0 -7 L7 0 L0 7 L-7 0 Z" />}
            {previewIntent.kind === 'exchange'
              && <path d="M-8 -4 H6 L3 -7 M6 -4 L3 -1 M8 4 H-6 L-3 1 M-6 4 L-3 7" />}
          </g>
        )}
      </svg>
      {minimapHost ? createPortal(minimap, minimapHost) : minimap}
    </section>
  );
}

interface DestinationIntent {
  kind: 'idle' | 'safe' | 'interaction' | 'exchange' | 'fight';
  label: string;
  detail?: string;
}

function destinationIntent(
  state: GameState,
  hero: Hero | null,
  destination: Coord | undefined,
  aggroIndex: number,
  inRange: boolean,
  meetingTargetId: string | null = null,
): DestinationIntent {
  if (!hero) {
    return { kind: 'idle', label: 'Hover for a safe route', detail: 'click once to travel' };
  }
  if (meetingTargetId) {
    const target = Object.values(state.players).flatMap((player) => player.heroes)
      .find((candidate) => candidate.id === meetingTargetId);
    const meeting = friendlyHeroMeetingPlan(state, meetingTargetId);
    if (!target || !meeting.ok) return {
      kind: 'exchange', label: target ? `Cannot meet ${target.name}` : 'Meeting unavailable',
      detail: meeting.ok ? undefined : meeting.reason,
    };
    return {
      kind: 'exchange', label: `Exchange with ${target.name}`,
      detail: meeting.plan.adjacent ? 'already adjacent · open now'
        : `${meeting.plan.cost} movement to a free adjacent tile · ${
          meeting.plan.cost <= hero.movement ? 'within today’s movement'
            : 'travel continues as far as today allows'}`,
    };
  }
  if (!destination) {
    return { kind: 'idle', label: 'Hover for a safe route', detail: 'click once to travel' };
  }
  const rangeDetail = inRange
    ? 'within today’s movement'
    : 'travel continues as far as today allows';
  const guardian = state.map.objects.find((object) => object.kind === 'guardian'
    && (object.position.x === destination.x && object.position.y === destination.y
      || guardianAggroTiles(object, state.map).some((tile) =>
        tile.x === destination.x && tile.y === destination.y)));
  if (aggroIndex >= 1 || guardian) {
    return {
      kind: 'fight',
      label: `Fight ${guardian ? guardianIntel(state, guardian)?.label ?? 'guardian company' : 'guardian company'}`,
      detail: 'crossed swords mark the engagement tile',
    };
  }
  const targetHero = Object.values(state.players).flatMap((player) => player.heroes)
    .find((candidate) => candidate.alive
      && candidate.position.x === destination.x && candidate.position.y === destination.y
      && candidate.id !== hero.id);
  if (targetHero) {
    return targetHero.owner === hero.owner
      ? { kind: 'interaction', label: `Meet ${targetHero.name}`, detail: rangeDetail }
      : { kind: 'fight', label: `Fight ${targetHero.name}`, detail: rangeDetail };
  }
  const castle = state.castles.find((candidate) => {
    const entrance = castleEntrance(candidate);
    return entrance.x === destination.x && entrance.y === destination.y;
  });
  if (castle) {
    const hostile = castle.owner !== hero.owner;
    return {
      kind: hostile ? 'fight' : 'interaction',
      label: `${hostile ? 'Assault' : 'Enter'} ${CASTLE_NAMES[castle.faction]}`,
      detail: `${castle.owner === 'neutral' ? 'neutral' : state.players[castle.owner].name} · ${rangeDetail}`,
    };
  }
  const object = state.map.objects.find((candidate) => {
    const entrance = objectEntranceTile(candidate);
    return entrance.x === destination.x && entrance.y === destination.y;
  });
  if (object) {
    const pickup = ['pile', 'item', 'rewardPickup', 'chest', 'flotsam', 'sealedCask', 'castaway', 'messageBottle']
      .includes(object.kind);
    const capture = 'owner' in object && object.owner !== hero.owner;
    return {
      kind: 'interaction',
      label: `${pickup ? 'Collect' : capture ? 'Capture' : 'Visit'} ${objectTitle(object)}`,
      detail: rangeDetail,
    };
  }
  const explored = state.players[state.activePlayer].explored
    .includes(`${destination.x},${destination.y}`);
  if (!explored) {
    return { kind: 'safe', label: 'Explore unexplored terrain', detail: rangeDetail };
  }
  const terrain = terrainId(state.map.terrain[destination.y][destination.x]);
  return { kind: 'safe', label: `Travel over ${TERRAIN[terrain].label}`, detail: rangeDetail };
}

function guardianAtPath(state: GameState, coord: Coord): boolean {
  return state.map.objects.some((object) => object.kind === 'guardian'
    && object.position.x === coord.x && object.position.y === coord.y);
}

function roadConnectionMask(
  map: GameState['map'], position: Coord, roads?: ReadonlySet<string>,
): string {
  const roadSet = roads ?? new Set((map.roads ?? []).map((coord) => `${coord.x},${coord.y}`));
  const mask = [
    roadSet.has(`${position.x},${position.y - 1}`) ? 'n' : '',
    roadSet.has(`${position.x + 1},${position.y}`) ? 'e' : '',
    roadSet.has(`${position.x},${position.y + 1}`) ? 's' : '',
    roadSet.has(`${position.x - 1},${position.y}`) ? 'w' : '',
  ].join('');
  return mask || 'isolated';
}

function minimapTerrainPaths(
  map: GameState['map'], explored: ReadonlySet<string>,
): Array<{ color: string; path: string }> {
  const paths = new Map<string, string[]>();
  for (let y = 0; y < map.height; y += 1) for (let x = 0; x < map.width; x += 1) {
    const color = explored.has(`${x},${y}`)
      ? TERRAIN_COLOR[terrainId(map.terrain[y][x])] : '#080a09';
    const commands = paths.get(color) ?? [];
    commands.push(`M${x} ${y}h1v1h-1z`);
    paths.set(color, commands);
  }
  return [...paths].map(([color, commands]) => ({ color, path: commands.join('') }));
}
