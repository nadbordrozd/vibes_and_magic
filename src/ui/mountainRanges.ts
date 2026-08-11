import { terrainIdAt } from '../content/terrain';
import type { Coord, GameMap } from '../core/types';
import { PIXEL_SCALE, assetId, manifestEntry } from '../../assets/manifest';

export type MountainFamilySkin = 'rocky' | 'granite' | 'snowcap';

export type MountainFamilyVariant =
  | `${MountainFamilySkin}-scatter-${1 | 2 | 3 | 4 | 5 | 6}`
  | `rocky-column-${1 | 2 | 3 | 4}`
  | `rocky-shoulder-${1 | 2 | 3 | 4}`
  | `${MountainFamilySkin}-knoll-${1 | 2 | 3 | 4}`
  | `${MountainFamilySkin}-ridge-${1 | 2 | 3 | 4}`
  | `${MountainFamilySkin}-massif-${1 | 2}`
  | `${MountainFamilySkin}-backbone-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `${MountainFamilySkin}-boundary-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export interface MountainRangeDecoration {
  key: string;
  position: Coord;
  variant: MountainFamilyVariant;
  contactWidth: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface MountainRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MountainRangeGeometry {
  /** Authored blocking contact. Mountain paint may not leave this rectangle except northward. */
  footprint: MountainRectangle;
  /** Complete native bitmap rectangle before the footprint clip is applied. */
  sprite: MountainRectangle;
  /** The only rectangle which may contribute visible mountain pixels. */
  visual: MountainRectangle;
  /** World point passed to PixelSprite for its manifest anchor. */
  spriteAnchor: Coord;
}

/**
 * Converts one compositor result into executable render geometry. Every topology result uses a
 * whole native sprite whose width equals its authored contact. This prevents the renderer from
 * exposing a straight internal crop through opaque mountain pixels. The visual rectangle retains
 * legal northern overhang while the authored contact remains the only gameplay footprint.
 */
export function mountainRangeGeometry(
  range: MountainRangeDecoration,
  tileSize = 32 * PIXEL_SCALE,
): MountainRangeGeometry {
  const entry = manifestEntry(assetId.decoration('mountain', range.variant));
  if (!entry) throw new Error(`Missing mountain asset geometry for ${range.variant}`);
  const scale = tileSize / 32;
  const footprint: MountainRectangle = {
    x: range.position.x * tileSize,
    y: range.position.y * tileSize,
    width: range.contactWidth * tileSize,
    height: tileSize,
  };
  const spriteWidth = entry.w * scale;
  const spriteHeight = entry.h * scale;
  if (spriteWidth !== footprint.width) {
    throw new Error(`Mountain ${range.variant} is ${spriteWidth}px wide for a ${footprint.width}px contact`);
  }
  const spriteX = footprint.x + (footprint.width - spriteWidth) / 2;
  const spriteY = footprint.y - entry.anchor.y * scale;
  const sprite: MountainRectangle = {
    x: spriteX, y: spriteY, width: spriteWidth, height: spriteHeight,
  };
  const visualTop = Math.min(sprite.y, footprint.y);
  const visualBottom = Math.min(sprite.y + sprite.height, footprint.y + footprint.height);
  const visual: MountainRectangle = {
    x: footprint.x,
    y: visualTop,
    width: footprint.width,
    height: Math.max(0, visualBottom - visualTop),
  };
  return {
    footprint,
    sprite,
    visual,
    spriteAnchor: {
      x: sprite.x + entry.anchor.x * scale,
      y: footprint.y,
    },
  };
}

export function mountainRectangleIntersects(
  first: MountainRectangle, second: MountainRectangle,
): boolean {
  return first.x < second.x + second.width && first.x + first.width > second.x
    && first.y < second.y + second.height && first.y + first.height > second.y;
}

/** Culling follows the clipped visual rectangle, never just the anchor or complete footprint. */
export function mountainRangeIntersectsViewport(
  range: MountainRangeDecoration,
  viewport: MountainRectangle,
  tileSize = 32 * PIXEL_SCALE,
): boolean {
  return mountainRectangleIntersects(mountainRangeGeometry(range, tileSize).visual, viewport);
}

/** A revealed contact is enough to paint its clipped range; late fog occludes all unseen cells. */
export function mountainRangeHasExploredContact(
  range: MountainRangeDecoration,
  explored: ReadonlySet<string>,
): boolean {
  return Array.from({ length: range.contactWidth }, (_, offset) =>
    explored.has(`${range.position.x + offset},${range.position.y}`)).some(Boolean);
}

function coordinateHash(seed: number, x: number, y: number, salt = 0): number {
  let value = (seed ^ salt ^ Math.imul(x + 1, 0x9e3779b1)
    ^ Math.imul(y + 1, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}

function mountainSkinAt(map: GameMap, position: Coord): MountainFamilySkin | null {
  const value = map.terrain[position.y]?.[position.x];
  if (!value || terrainIdAt(map, position) !== 'mountain') return null;
  // The first reusable obstacle vocabulary is deliberately climate-neutral rocky stone. Authored
  // mountain skins remain useful map metadata; future terrain-specific families can select from
  // that metadata once they satisfy the same complete-family and shape-showcase contract.
  return 'rocky';
}

function hasSkin(map: GameMap, position: Coord, skin: MountainFamilySkin): boolean {
  return mountainSkinAt(map, position) === skin;
}

function addPiece(
  pieces: MountainRangeDecoration[],
  position: Coord,
  variant: MountainFamilyVariant,
  contactWidth: MountainRangeDecoration['contactWidth'],
): void {
  const match = /^(rocky|granite|snowcap)-(scatter|column|shoulder|knoll|ridge|massif|backbone|boundary)-(\d)$/.exec(variant);
  if (match) {
    const [, skin, role, rawIndex] = match;
    const count = role === 'scatter' ? 6
      : role === 'backbone' || role === 'boundary' ? 8
        : role === 'massif' ? 2 : 4;
    let index = Number(rawIndex);
    for (let attempt = 0; attempt < count; attempt += 1) {
      const candidate = `${skin}-${role}-${index}` as MountainFamilyVariant;
      const repeatsNearby = pieces.some((piece) => piece.variant === candidate
        && position.y - piece.position.y >= 0 && position.y - piece.position.y <= 1
        && Math.abs(position.x - piece.position.x) <= 2);
      if (!repeatsNearby) {
        variant = candidate;
        break;
      }
      index = index % count + 1;
    }
  }
  pieces.push({
    key: `mountain-range-${position.x}-${position.y}-${variant}`,
    position,
    variant,
    contactWidth,
  });
}

/** Derives overlapping connected spines from authored impassable cells. Gameplay occupancy stays
 * in map terrain; a sprite's contact band only records which cells its visual mass covers. */
export function deriveMountainRanges(map: GameMap): MountainRangeDecoration[] {
  const pieces: MountainRangeDecoration[] = [];
  for (const skin of ['rocky'] as const) for (let y = 0; y < map.height; y += 1) {
    const occupied = Array.from({ length: map.width }, (_, x) => hasSkin(map, { x, y }, skin));
    for (let start = 0; start < map.width;) {
      if (!occupied[start]) {
        start += 1;
        continue;
      }
      let end = start;
      while (end + 1 < map.width && occupied[end + 1]) end += 1;
      const length = end - start + 1;
      const seed = map.seed ?? 0;
      const continuesVertically = Array.from({ length }, (_, offset) => {
        const x = start + offset;
        return hasSkin(map, { x, y: y - 1 }, skin) || hasSkin(map, { x, y: y + 1 }, skin);
      }).some(Boolean);

      // Every selected bitmap spans its complete authored contact. Narrow vertical pieces are
      // purpose-built; wider rows overlap whole 2/3/6-cell landforms instead of slicing through
      // the middle of a larger silhouette.
      if (length === 1) {
        const variant = 1 + coordinateHash(seed, start, y, 17) % 4;
        addPiece(pieces, { x: start, y },
          `${skin}-column-${variant}` as MountainFamilyVariant, 1);
        start = end + 1;
        continue;
      }
      if (length === 2) {
        const variant = 1 + coordinateHash(seed, start, y, continuesVertically ? 23 : 29) % 4;
        addPiece(pieces, { x: start, y },
          `${skin}-${continuesVertically ? 'shoulder' : 'knoll'}-${variant}` as MountainFamilyVariant,
          2);
        start = end + 1;
        continue;
      }
      if (length === 3) {
        const variant = 1 + coordinateHash(seed, start, y, 19) % 4;
        addPiece(pieces, { x: start, y },
          `${skin}-ridge-${variant}` as MountainFamilyVariant, 3);
        start = end + 1;
        continue;
      }

      const addSpine = (x: number, variant: number): void => {
        const terrainFacing = x === start || x + 5 === end
          || Array.from({ length: 6 }, (_, offset) =>
            !hasSkin(map, { x: x + offset, y: y + 1 }, skin)).some(Boolean);
        const role = terrainFacing ? 'boundary' : 'backbone';
        addPiece(pieces, { x, y },
          `${skin}-${role}-${variant}` as MountainFamilyVariant, 6);
      };

      const addSmall = (x: number, width: 2 | 3, salt: number): void => {
        const variant = 1 + coordinateHash(seed, x, y, salt) % 4;
        addPiece(pieces, { x, y },
          `${skin}-${width === 2 ? 'knoll' : 'ridge'}-${variant}` as MountainFamilyVariant,
          width);
      };

      if (length === 4) {
        addSmall(start, 2, 67);
        addSmall(start + 1, 3, 71);
        start = end + 1;
        continue;
      }
      if (length === 5) {
        addSmall(start, 3, 73);
        addSmall(start + 2, 3, 79);
        start = end + 1;
        continue;
      }

      let cursor = start;
      let backboneIndex = 0;
      const backboneOffset = coordinateHash(seed, start, y, 47) % 8;
      while (end - cursor + 1 > 9) {
        const variant = 1 + (backboneOffset + backboneIndex * 3) % 8;
        addSpine(cursor, variant);
        cursor += 4; // two contact cells overlap, joining successive six-tile spines
        backboneIndex += 1;
      }

      const remaining = end - cursor + 1;
      const variant = 1 + (backboneOffset + backboneIndex * 3) % 8;
      addSpine(cursor, variant);
      if (remaining === 7) addSmall(cursor + 5, 2, 83);
      if (remaining === 8) addSmall(cursor + 5, 3, 89);
      if (remaining === 9) {
        addSmall(cursor + 5, 3, 97);
        addSmall(cursor + 7, 2, 101);
      }
      start = end + 1;
    }
  }
  return pieces;
}
