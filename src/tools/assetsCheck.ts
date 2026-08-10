import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import {
  ASSET_MANIFEST, NON_SPRITE_REPRESENTATIONS, type AssetManifestEntry,
} from '../../assets/manifest';
import { assetWorklist, type AssetWorkItem } from '../../assets/worklist';
import { validateAdventureSpriteInventory } from '../../assets/adventureSpriteInventory';
import { ARTIFACTS } from '../content/artifacts';
import { FACTIONS } from '../content/factions';
import { ITEMS } from '../content/items';

function pngMetadata(path: string): { w: number; h: number; hasAlpha: boolean } {
  const bytes = readFileSync(path);
  const signature = '89504e470d0a1a0a';
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== signature
      || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('not a PNG with a valid IHDR header');
  }
  const colorType = bytes[25];
  const hasTransparencyChunk = bytes.includes(Buffer.from('tRNS'));
  return {
    w: bytes.readUInt32BE(16),
    h: bytes.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6 || hasTransparencyChunk,
  };
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const distances = [Math.abs(estimate - left), Math.abs(estimate - above),
    Math.abs(estimate - upperLeft)];
  if (distances[0] <= distances[1] && distances[0] <= distances[2]) return left;
  return distances[1] <= distances[2] ? above : upperLeft;
}

interface RgbaStats {
  nonOpaque: number;
  opaque: number;
  partial: number;
  bbox: { left: number; top: number; right: number; bottom: number } | null;
  edgeRatio: number;
  bottomEdgeRatio: number;
  canvasSidePixels: number;
  symmetry: number;
  paletteOutlierRatio: number;
}

function rgbaStats(
  path: string,
  palette?: readonly (readonly [number, number, number])[],
  paletteTolerance = 0,
): RgbaStats {
  const png = readFileSync(path);
  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error('alpha inspection requires a non-interlaced 8-bit RGBA PNG');
      }
    } else if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
  }
  const filtered = inflateSync(Buffer.concat(compressed));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = filtered[rowStart];
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[rowStart + 1 + x];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const above = y ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above
        : filter === 3 ? Math.floor((left + above) / 2) : filter === 4
          ? paeth(left, above, upperLeft)
          : (() => { throw new Error(`unknown PNG filter ${filter}`); })();
      pixels[y * stride + x] = (raw + predictor) & 0xff;
    }
  }
  let nonOpaque = 0;
  let opaque = 0;
  let partial = 0;
  let paletteOutliers = 0;
  let bottomEdgePixels = 0;
  let canvasSidePixels = 0;
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let alpha = 3; alpha < pixels.length; alpha += 4) {
    const value = pixels[alpha];
    if (value < 255) nonOpaque += 1;
    if (value > 0) {
      opaque += 1;
      const pixel = Math.floor(alpha / 4);
      const x = pixel % width; const y = Math.floor(pixel / width);
      if (y === height - 1) bottomEdgePixels += 1;
      if (x === 0 || x === width - 1) canvasSidePixels += 1;
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
      if (palette?.length) {
        const red = pixels[alpha - 3]; const green = pixels[alpha - 2];
        const blue = pixels[alpha - 1];
        const withinRamp = palette.some(([r, g, b]) =>
          (red - r) ** 2 + (green - g) ** 2 + (blue - b) ** 2 <= paletteTolerance ** 2);
        if (!withinRamp) paletteOutliers += 1;
      }
    }
    if (value > 0 && value < 255) partial += 1;
  }
  if (right < left || bottom < top) {
    return {
      nonOpaque, opaque, partial, bbox: null, edgeRatio: 1, symmetry: 1,
      bottomEdgeRatio: 1, canvasSidePixels, paletteOutlierRatio: 1,
    };
  }
  const bboxWidth = right - left + 1;
  const bboxHeight = bottom - top + 1;
  const columnHeights = Array<number>(bboxWidth).fill(0);
  let overlap = 0; let union = 0;
  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
    const visible = pixels[(y * width + x) * 4 + 3] > 0;
    const mirrored = pixels[(y * width + (right - (x - left))) * 4 + 3] > 0;
    if (visible) columnHeights[x - left] += 1;
    if (visible && mirrored) overlap += 1;
    if (visible || mirrored) union += 1;
  }
  const maxHeight = Math.max(...columnHeights);
  return {
    nonOpaque, opaque, partial,
    bbox: { left, top, right, bottom },
    edgeRatio: Math.max(columnHeights[0], columnHeights[columnHeights.length - 1]) / maxHeight,
    bottomEdgeRatio: bottomEdgePixels / width,
    canvasSidePixels,
    symmetry: union ? overlap / union : 1,
    paletteOutlierRatio: palette?.length ? paletteOutliers / opaque : 0,
  };
}

function validateEntry(item: AssetWorkItem, entry: AssetManifestEntry): string[] {
  const errors: string[] = [];
  if (!entry.file.startsWith('assets/') || entry.file.includes('..')) {
    errors.push('file must be a safe path below public/assets/');
  }
  if (!Number.isInteger(entry.w) || !Number.isInteger(entry.h) || entry.w <= 0 || entry.h <= 0) {
    errors.push('declared dimensions must be positive integers');
  }
  if (item.groundContact) {
    if (entry.w % 32 !== 0 || entry.w < item.w) {
      errors.push(`canvas width must be a multiple of 32 and at least footprint width ${item.w}`);
    }
    if (entry.h < item.h) errors.push(`canvas height must cover footprint height ${item.h}`);
  } else if (entry.w !== item.w || entry.h !== item.h) {
    errors.push(`owner requires ${item.w}x${item.h}, declared ${entry.w}x${entry.h}`);
  }
  if (!Number.isInteger(entry.anchor.x) || !Number.isInteger(entry.anchor.y)
      || entry.anchor.x < 0 || entry.anchor.x >= entry.w
      || entry.anchor.y < 0 || entry.anchor.y >= entry.h) {
    errors.push('anchor must be an integer point inside the native bitmap');
  }
  if (item.groundContact && (entry.anchor.x + item.w > entry.w
      || entry.anchor.y !== entry.h - item.h)) {
    errors.push(`ground-contact footprint must fit at anchor x and use y:${entry.h - item.h}`);
  }
  if (entry.contact) {
    const { w, h, entrance } = entry.contact;
    if (![w, h, entrance.x, entrance.y].every(Number.isInteger)
        || w <= 0 || h <= 0 || entrance.x < 0 || entrance.x >= w
        || entrance.y < 0 || entrance.y >= h) {
      errors.push('explicit contact and entrance must use positive whole-tile geometry');
    }
    if (entry.w !== w * 32 || entry.anchor.x !== 0
        || entry.anchor.y !== entry.h - h * 32) {
      errors.push(`explicit contact ${w}x${h} must span the ${entry.w}px canvas width and `
        + `begin at anchor {x:0,y:${entry.h - h * 32}}`);
    }
    if (item.category === 'castle'
        && (w !== 5 || h !== 2 || entrance.x !== 2 || entrance.y !== 1)) {
      errors.push('city contact must be 5x2 with its sole entrance at (2,1)');
    }
  }
  if ((item.category === 'hero' || item.category === 'guardian-unit'
      || item.category === 'battle-unit')
      && (entry.anchor.x !== Math.floor(entry.w / 2) || entry.anchor.y !== entry.h - 8)) {
    errors.push(`${item.category} anchor must place its center baseline at `
      + `{x:${Math.floor(entry.w / 2)},y:${entry.h - 8}}`);
  }
  if (item.ownable && !entry.flagAnchor) errors.push('ownable sprite requires flagAnchor');
  if (entry.flagAnchor && (!Number.isInteger(entry.flagAnchor.x)
      || !Number.isInteger(entry.flagAnchor.y)
      || entry.flagAnchor.x < 0 || entry.flagAnchor.x >= entry.w
      || entry.flagAnchor.y < 0 || entry.flagAnchor.y >= entry.h)) {
    errors.push('flagAnchor must be an integer point inside the native bitmap');
  }
  const path = resolve(process.cwd(), 'public', entry.file);
  try {
    if (!statSync(path).isFile()) errors.push('manifest path is not a file');
    else {
      const metadata = pngMetadata(path);
      if (metadata.w !== entry.w || metadata.h !== entry.h) {
        errors.push(`PNG is ${metadata.w}x${metadata.h}, declared ${entry.w}x${entry.h}`);
      }
      if (item.category !== 'terrain' && !metadata.hasAlpha) {
        errors.push(`${item.category} PNG must support transparency`);
      }
      if (item.category === 'terrain' || metadata.hasAlpha) {
        const alpha = rgbaStats(
          path, item.obstacleFamily?.palette, item.obstacleFamily?.paletteTolerance,
        );
        if (item.category === 'terrain' && alpha.nonOpaque) {
          errors.push(`terrain PNG has ${alpha.nonOpaque} non-opaque pixels`);
        }
        if (item.category !== 'terrain' && (!alpha.nonOpaque || !alpha.opaque)) {
          errors.push(`${item.category} PNG must contain both visible and transparent pixels`);
        }
        if (entry.contact) {
          if (alpha.partial) errors.push(`city PNG has ${alpha.partial} partial-alpha fringe pixels`);
          if (!alpha.bbox || alpha.bbox.bottom !== entry.h - 1) {
            errors.push('city silhouette must be bottom-anchored on the contact band');
          }
          if (alpha.canvasSidePixels) {
            errors.push(`city PNG has ${alpha.canvasSidePixels} visible canvas-side pixels`);
          }
        }
        if (item.obstacleFamily && alpha.bbox) {
          const bboxWidth = alpha.bbox.right - alpha.bbox.left + 1;
          const bboxHeight = alpha.bbox.bottom - alpha.bbox.top + 1;
          const maxPartial = Math.max(4, Math.floor(entry.w * entry.h * 0.001));
          if (alpha.partial > maxPartial) {
            errors.push(`obstacle-family PNG has ${alpha.partial} alpha-fringe pixels; max ${maxPartial}`);
          }
          // Small pieces must self-terminate. Backbones deliberately carry substantial stone
          // through both edge columns so adjacent six-tile spines overlap without visible ends.
          if (item.obstacleFamily.role !== 'backbone' && alpha.edgeRatio > 0.2) {
            errors.push(`obstacle-family silhouette edge-column ratio ${alpha.edgeRatio.toFixed(3)} exceeds 0.2`);
          }
          if (item.obstacleFamily.role === 'boundary' && alpha.bottomEdgeRatio > 0.25) {
            errors.push(`terrain-facing boundary has ${(alpha.bottomEdgeRatio * 100).toFixed(1)}% `
              + 'opaque bottom edge; max 25%');
          }
          if (item.obstacleFamily.role === 'boundary' && alpha.canvasSidePixels > 0) {
            errors.push(`terrain-facing boundary has ${alpha.canvasSidePixels} opaque side-edge pixels`);
          }
          if (alpha.symmetry >= 0.92) {
            errors.push(`obstacle-family silhouette symmetry ${alpha.symmetry.toFixed(3)} is pyramid-like`);
          }
          const minimumAspect = item.obstacleFamily.role === 'scatter' ? 0.75 : 1;
          if (bboxWidth / bboxHeight < minimumAspect) {
            errors.push(`obstacle-family visible aspect ${bboxWidth}x${bboxHeight} is too tall`);
          }
          // A natural mountain may taper a few pixels before the exact canvas edge. Requiring a
          // fully opaque-width bounding box encouraged artificial baseline pixels that became
          // visible seams when pieces overlapped. Ninety percent still makes the authored contact
          // read as blocked while preserving a self-terminating silhouette.
          const minimumOpaqueWidth = Math.ceil(item.w * 0.9);
          if (bboxWidth < minimumOpaqueWidth) {
            errors.push(`obstacle-family opaque width ${bboxWidth} must cover at least 90% of `
              + `footprint width ${item.w}`);
          }
          if (entry.h - alpha.bbox.bottom - 1 > 2) {
            errors.push(`obstacle-family silhouette is not bottom-anchored (${entry.h - alpha.bbox.bottom - 1}px gap)`);
          }
          if (alpha.paletteOutlierRatio > 0.05) {
            errors.push(`obstacle-family palette has ${(alpha.paletteOutlierRatio * 100).toFixed(1)}% outlier pixels`);
          }
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}

const worklist = assetWorklist();
const byId = new Map(worklist.map((item) => [item.id, item]));
const errors: string[] = [];
const seenFiles = new Map<string, string>();

try {
  validateAdventureSpriteInventory({
    factions: Object.keys(FACTIONS),
    resources: ['gold', 'timber', 'iron', 'essence'],
    items: Object.keys(ITEMS),
    artifacts: Object.keys(ARTIFACTS),
  });
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

for (const [id, entry] of Object.entries(ASSET_MANIFEST)) {
  const item = byId.get(id);
  if (!item) {
    errors.push(`${id}: not present in the data-derived worklist`);
    continue;
  }
  for (const detail of validateEntry(item, entry)) errors.push(`${id}: ${detail}`);
  const previous = seenFiles.get(entry.file);
  if (previous) errors.push(`${id}: shares ${entry.file} with ${previous}; each prompt-owned asset needs its own file`);
  seenFiles.set(entry.file, id);
}

for (const [id, reason] of Object.entries(NON_SPRITE_REPRESENTATIONS)) {
  if (!byId.has(id)) errors.push(`${id}: non-sprite declaration is not in the data-derived worklist`);
  if (!reason.trim()) errors.push(`${id}: non-sprite declaration requires a reason`);
  if (ASSET_MANIFEST[id]) errors.push(`${id}: cannot be both sprited and deliberately non-sprite`);
}

for (const item of worklist) {
  if (!ASSET_MANIFEST[item.id] && !NON_SPRITE_REPRESENTATIONS[item.id]) {
    errors.push(`${item.id}: no manifest sprite or deliberate non-sprite representation`);
  }
}

const categories = [...new Set(worklist.map((item) => item.category))];
console.log('Pixel asset coverage');
for (const category of categories) {
  const items = worklist.filter((item) => item.category === category);
  const sprited = items.filter((item) => Boolean(ASSET_MANIFEST[item.id])).length;
  const nonSprite = items.filter((item) => Boolean(NON_SPRITE_REPRESENTATIONS[item.id])).length;
  console.log(`  ${category.padEnd(14)} ${String(sprited).padStart(3)}/${String(items.length).padEnd(3)} sprited · ${nonSprite} deliberate non-sprite`);
}
console.log(`  ${'total'.padEnd(14)} ${String(Object.keys(ASSET_MANIFEST).length).padStart(3)}/${worklist.length} manifest entries`);
const artifactSprites = Object.keys(ARTIFACTS).filter((id) =>
  Boolean(ASSET_MANIFEST[`map-object:artifact:${id}`])).length;
const itemSprites = Object.keys(ITEMS).filter((id) =>
  Boolean(ASSET_MANIFEST[`map-object:item:${id}`])).length;
console.log(`Planned collectible inventory · artifacts ${artifactSprites}/${Object.keys(ARTIFACTS).length} installed · items ${itemSprites}/${Object.keys(ITEMS).length} installed`);

if (errors.length) {
  console.error('\nAsset validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
