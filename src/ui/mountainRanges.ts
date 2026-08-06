import { terrainIdAt } from '../content/terrain';
import type { Coord, GameMap } from '../core/types';

export type MountainFamilySkin = 'rocky' | 'granite' | 'snowcap';

export type MountainFamilyVariant =
  | `${MountainFamilySkin}-scatter-${1 | 2 | 3 | 4 | 5 | 6}`
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
  const match = /^(rocky|granite|snowcap)-(scatter|knoll|ridge|massif|backbone|boundary)-(\d)$/.exec(variant);
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

      // One- to three-cell runs use the approved small vocabulary. Every longer row starts with
      // a single continuous six-tile PixelLab backbone, so the staple can never regress to a
      // necklace of self-terminating 2x1 formations.
      if (length <= 2) {
        const variant = 1 + coordinateHash(seed, start, y, 17) % 4;
        addPiece(pieces, { x: start, y },
          `${skin}-${continuesVertically ? 'ridge' : 'knoll'}-${variant}` as MountainFamilyVariant,
          length as 1 | 2);
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

      const addSpine = (
        x: number, contactWidth: 4 | 5 | 6, variant: number,
      ): void => {
        const terrainFacing = x === start || x + contactWidth - 1 === end
          || Array.from({ length: contactWidth }, (_, offset) =>
            !hasSkin(map, { x: x + offset, y: y + 1 }, skin)).some(Boolean);
        const role = terrainFacing ? 'boundary' : 'backbone';
        addPiece(pieces, { x, y },
          `${skin}-${role}-${variant}` as MountainFamilyVariant, contactWidth);
      };

      let cursor = start;
      let backboneIndex = 0;
      const backboneOffset = coordinateHash(seed, start, y, 47) % 8;
      while (end - cursor + 1 > 6) {
        const variant = 1 + (backboneOffset + backboneIndex * 3) % 8;
        addSpine(cursor, 6, variant);
        cursor += 4; // two contact cells overlap, joining successive six-tile spines
        backboneIndex += 1;
      }

      const remaining = end - cursor + 1;
      if (remaining >= 4) {
        const variant = 1 + (backboneOffset + backboneIndex * 3) % 8;
        addSpine(cursor, remaining as 4 | 5 | 6, variant);
      } else if (remaining === 3) {
        const variant = 1 + coordinateHash(seed, cursor, y, 59) % 4;
        addPiece(pieces, { x: cursor, y },
          `${skin}-ridge-${variant}` as MountainFamilyVariant, 3);
      } else if (remaining > 0) {
        const variant = 1 + coordinateHash(seed, cursor, y, 61) % 4;
        addPiece(pieces, { x: cursor, y },
          `${skin}-knoll-${variant}` as MountainFamilyVariant, remaining as 1 | 2);
      }
      start = end + 1;
    }
  }
  return pieces;
}
