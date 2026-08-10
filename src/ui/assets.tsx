import {
  useEffect, useState, type ReactNode,
} from 'react';
import {
  ASSET_MANIFEST, PIXEL_SCALE, assetId, manifestEntry,
} from '../../assets/manifest';
import { TERRAIN, terrainId } from '../content/terrain';
import type {
  Castle, GameMap, MapObject, TerrainSkinId, TerrainTile,
} from '../core/types';

type LoadState = 'loading' | 'loaded' | 'failed';
const loadStates = new Map<string, LoadState>();
const warned = new Set<string>();

function publicAssetUrl(file: string): string {
  if (typeof document === 'undefined') return file;
  return new URL(file, document.baseURI).toString();
}

function warnFailure(id: string, file: string): void {
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`[assets] Failed to load ${id} (${file}); using SVG fallback.`);
}

export function preloadAssetManifest(): void {
  if (typeof Image === 'undefined') return;
  for (const [id, entry] of Object.entries(ASSET_MANIFEST)) {
    if (loadStates.has(id)) continue;
    loadStates.set(id, 'loading');
    const image = new Image();
    image.onload = () => loadStates.set(id, 'loaded');
    image.onerror = () => {
      loadStates.set(id, 'failed');
      warnFailure(id, entry.file);
    };
    image.src = publicAssetUrl(entry.file);
  }
}

export function PixelSprite({
  id, x, y, fallback, className, renderScale = PIXEL_SCALE,
}: {
  id: string;
  x: number;
  y: number;
  fallback: ReactNode;
  className?: string;
  /** Combat art may use a larger native canvas without inheriting the adventure-map scale. */
  renderScale?: number;
}) {
  const entry = manifestEntry(id);
  const [state, setState] = useState<LoadState>(() => loadStates.get(id) ?? 'loading');

  useEffect(() => {
    setState(loadStates.get(id) ?? 'loading');
  }, [id]);

  if (!entry || state === 'failed') return fallback;
  const url = publicAssetUrl(entry.file);
  return (
    <>
      {state !== 'loaded' && fallback}
      <image
        className={`pixel-sprite ${className ?? ''}`}
        href={url}
        x={x - entry.anchor.x * renderScale}
        y={y - entry.anchor.y * renderScale}
        width={entry.w * renderScale}
        height={entry.h * renderScale}
        opacity={state === 'loaded' ? 1 : 0}
        preserveAspectRatio="none"
        onLoad={() => {
          loadStates.set(id, 'loaded');
          setState('loaded');
        }}
        onError={() => {
          loadStates.set(id, 'failed');
          setState('failed');
          warnFailure(id, entry.file);
        }}
      />
    </>
  );
}

export function OwnerFlag({
  id, x, y, owner,
}: {
  id: string;
  x: number;
  y: number;
  owner: string | null;
}) {
  const entry = manifestEntry(id);
  if (!entry?.flagAnchor || !owner || owner === 'neutral') return null;
  const poleX = x + (entry.flagAnchor.x - entry.anchor.x) * PIXEL_SCALE;
  const poleY = y + (entry.flagAnchor.y - entry.anchor.y) * PIXEL_SCALE;
  return (
    <g className={`owner-pennant ${owner}`}
      transform={`translate(${poleX} ${poleY}) scale(${PIXEL_SCALE})`}>
      <path className="pennant-pole" d="M0 0 V-15" />
      <path className="pennant-cloth" d="M1 -15 L9 -12 L1 -8 Z" />
    </g>
  );
}

export interface PainterOrderItem { row: number; col: number; key: string }

export function painterOrder<T extends PainterOrderItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.row - b.row || a.col - b.col || a.key.localeCompare(b.key));
}

function terrainSkin(tile: TerrainTile): TerrainSkinId {
  if (typeof tile === 'object' && tile.skin) return tile.skin;
  return TERRAIN[terrainId(tile)].skins[0];
}

function coordinateHash(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}

export function terrainSpriteId(map: GameMap, tile: TerrainTile, x: number, y: number): string {
  const terrain = terrainId(tile);
  const skin = terrainSkin(tile);
  const available = [0, 1, 2].map((variant) => assetId.terrain(terrain, skin, variant))
    .filter((id) => Boolean(manifestEntry(id)));
  if (!available.length) return assetId.terrain(terrain, skin, 0);
  // Grass is the visual bed of the landscape. Full-tile color variants make the authored grid
  // visible as a checkerboard, so meadow variation comes from transparent decorations instead.
  if (terrain === 'meadow') {
    const quietBase = assetId.terrain(terrain, skin, 1);
    if (available.includes(quietBase)) return quietBase;
  }
  return available[coordinateHash(map.seed ?? 0, x, y) % available.length];
}

function objectVariant(object: MapObject): string {
  if (object.kind === 'pile' || object.kind === 'mine') return object.resource;
  if (object.kind === 'shrine') return object.school;
  if (object.kind === 'item') return object.item.id;
  if (object.kind === 'rewardPickup') return 'default';
  if (object.kind === 'dwelling') return object.unitId;
  if (object.kind === 'lock') return object.id;
  if (object.kind === 'obstacle') return object.prop;
  if (object.kind === 'bridge') return object.completed ? 'complete' : 'incomplete';
  return 'default';
}

export function mapObjectSpriteId(object: MapObject): string {
  return assetId.mapObject(object.kind, objectVariant(object));
}

export function castleSpriteId(castle: Castle): string {
  return assetId.castle(castle.faction, castle.variant ?? 'castle');
}

export function battleUnitSpriteId(unitId: string): string {
  return assetId.battleUnit(unitId);
}

export function guardianUnitSpriteId(unitId: string): string {
  return assetId.guardianUnit(unitId);
}

function ManifestPortrait({
  id, className, fallback,
}: { id: string; className: string; fallback: ReactNode }) {
  const entry = manifestEntry(id);
  const [failed, setFailed] = useState(() => loadStates.get(id) === 'failed');

  useEffect(() => {
    setFailed(loadStates.get(id) === 'failed');
  }, [id]);

  if (!entry || failed) return fallback;
  return <img className={className} src={publicAssetUrl(entry.file)} alt="" aria-hidden="true"
    onError={() => {
      loadStates.set(id, 'failed');
      setFailed(true);
      warnFailure(id, entry.file);
    }} />;
}

/** HTML-sized portrait using the same authored combat art as the battlefield. */
export function UnitPortrait({ unitId, className }: { unitId: string; className?: string }) {
  const id = battleUnitSpriteId(unitId);
  return <ManifestPortrait id={id} className={`unit-portrait ${className ?? ''}`}
    fallback={<span className={`unit-portrait-fallback ${className ?? ''}`}>?</span>} />;
}

export function heroSpriteId(faction: string, direction: string): string {
  return assetId.hero(faction, direction);
}

export function HeroPortrait({
  faction, direction = 's', className,
}: { faction: string; direction?: string; className?: string }) {
  const id = heroSpriteId(faction, direction);
  return <ManifestPortrait id={id} className={`hero-sprite-portrait ${className ?? ''}`}
    fallback={<span className={`hero-portrait-fallback ${className ?? ''}`}>?</span>} />;
}
