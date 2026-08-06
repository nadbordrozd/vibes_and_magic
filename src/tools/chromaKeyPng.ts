import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const diagonalDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= diagonalDistance) return left;
  return aboveDistance <= diagonalDistance ? above : upperLeft;
}

function decodeRgbaPng(file: string): { width: number; height: number; pixels: Buffer } {
  const png = readFileSync(file);
  const signature = '89504e470d0a1a0a';
  if (png.subarray(0, 8).toString('hex') !== signature) throw new Error(`${file}: invalid PNG`);
  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error(`${file}: expected non-interlaced 8-bit RGBA PNG`);
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
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? above
            : filter === 3 ? Math.floor((left + above) / 2)
              : filter === 4 ? paeth(left, above, upperLeft)
                : (() => { throw new Error(`${file}: unknown PNG filter ${filter}`); })();
      pixels[y * stride + x] = (raw + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function encodeRgbaPng(width: number, height: number, pixels: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    pixels.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const [input, output, mode = 'magenta'] = process.argv.slice(2);
if (!input || !output) {
  throw new Error('usage: tsx src/tools/chromaKeyPng.ts INPUT OUTPUT '
    + '[magenta|seam-diagonal|terrain-seamless|mirror-horizontal|mountain-rock-clean|flower-single|flower-yellow|flower-blue|'
    + 'cart-ruts|mushroom-ring|green-base]');
}
const { width, height, pixels } = decodeRgbaPng(input);
if (mode === 'mirror-horizontal') {
  for (let y = 0; y < height; y += 1) for (let x = 0; x < Math.floor(width / 2); x += 1) {
    const opposite = width - 1 - x;
    const left = (y * width + x) * 4;
    const right = (y * width + opposite) * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      const value = pixels[left + channel];
      pixels[left + channel] = pixels[right + channel];
      pixels[right + channel] = value;
    }
  }
  writeFileSync(output, encodeRgbaPng(width, height, pixels));
  console.log(`${input} -> ${output}: mirrored horizontally without resampling`);
  process.exit(0);
}
if (mode === 'mountain-rock-clean') {
  let normalized = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    if (pixels[offset + 3] && red > 225 && green > 170 && blue < 120) {
      pixels[offset] = 210;
      pixels[offset + 1] = 169;
      pixels[offset + 2] = 119;
      normalized += 1;
    }
  }
  if (!normalized) throw new Error(`${input}: mountain cleanup found no saturated marker pixels`);
  writeFileSync(output, encodeRgbaPng(width, height, pixels));
  console.log(`${input} -> ${output}: normalized ${normalized} saturated mountain pixels`);
  process.exit(0);
}
if (mode === 'inspect') {
  const rows = Array.from({ length: height }, (_, y) => {
    let transparent = 0;
    let dark = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (pixels[offset + 3] < 255) transparent += 1;
      if (pixels[offset] + pixels[offset + 1] + pixels[offset + 2] < 90) dark += 1;
    }
    return { y, transparent, dark };
  });
  console.log(JSON.stringify(rows));
  process.exit(0);
}
if (mode === 'terrain-seamless') {
  if (width !== height || width < 4) {
    throw new Error(`${input}: terrain edge repair expects a square tile at least 4px wide`);
  }
  const source = Buffer.from(pixels);
  const averagePixel = (targetX: number, targetY: number, samples: Array<[number, number]>) => {
    const target = (targetY * width + targetX) * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[target + channel] = Math.round(samples.reduce((sum, [sampleX, sampleY]) =>
        sum + source[(sampleY * width + sampleX) * 4 + channel], 0) / samples.length);
    }
    pixels[target + 3] = 255;
  };
  const farX = width - 2;
  const farY = height - 2;
  for (let x = 1; x < width - 1; x += 1) {
    averagePixel(x, 0, [[x, 1], [x, farY]]);
    averagePixel(x, height - 1, [[x, 1], [x, farY]]);
  }
  for (let y = 1; y < height - 1; y += 1) {
    averagePixel(0, y, [[1, y], [farX, y]]);
    averagePixel(width - 1, y, [[1, y], [farX, y]]);
  }
  for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1],
    [width - 1, height - 1]] as const) {
    averagePixel(x, y, [[1, 1], [farX, 1], [1, farY], [farX, farY]]);
  }
  writeFileSync(output, encodeRgbaPng(width, height, pixels));
  console.log(`${input} -> ${output}: matched opposite terrain edges for seamless tiling`);
  process.exit(0);
}
if (mode === 'flower-yellow' || mode === 'flower-blue') {
  const target = mode === 'flower-yellow' ? [239, 190, 55] : [91, 146, 211];
  let recolored = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const light = Math.max(red, green, blue);
    const neutral = Math.max(red, green, blue) - Math.min(red, green, blue) < 75;
    if (pixels[offset + 3] && light > 135 && neutral) {
      const shade = Math.max(0.55, light / 255);
      pixels[offset] = Math.round(target[0] * shade);
      pixels[offset + 1] = Math.round(target[1] * shade);
      pixels[offset + 2] = Math.round(target[2] * shade);
      recolored += 1;
    }
  }
  if (!recolored) throw new Error(`${input}: flower palette transform found no blossom pixels`);
  writeFileSync(output, encodeRgbaPng(width, height, pixels));
  console.log(`${input} -> ${output}: ${mode} recolored ${recolored} generated blossom pixels`);
  process.exit(0);
}
let removed = 0;
const mushroomSeeds = mode === 'mushroom-ring'
  ? Array.from({ length: width * height }, (_, index) => {
    const offset = index * 4;
    return pixels[offset + 3] > 0
      && pixels[offset] > pixels[offset + 1] * 1.08
      && pixels[offset] > pixels[offset + 2] * 1.18;
  }) : [];
for (let offset = 0; offset < pixels.length; offset += 4) {
  const red = pixels[offset];
  const green = pixels[offset + 1];
  const blue = pixels[offset + 2];
  const pixelIndex = offset / 4;
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  // The generated guide ground varies slightly around #ff00ff despite the flat-ground prompt.
  // Packed earth is red/yellow (blue-poor), so this hue test removes magenta without touching it.
  const removeMagenta = mode === 'magenta'
    && red >= 45 && blue >= 45 && red > green * 1.25 && blue > green * 1.2;
  // PixelLab's sparse Seam candidate became noisy when repeated across authored cells. This mask
  // removes only excess generated marks; retained visible pixels and their colors are unchanged.
  const removeOutsideSeam = mode === 'seam-diagonal' && Math.abs(y - (x + 2)) > 1;
  const inCartTrack = Math.abs(y - (x + 3)) <= 1 || Math.abs(y - (x - 4)) <= 1;
  const earthColor = red >= green * 0.9 && red > blue * 1.08;
  const removeOutsideCartRuts = mode === 'cart-ruts' && (!inCartTrack || !earthColor);
  const removeOutsideSingleFlower = mode === 'flower-single'
    && (x < 9 || x > 22 || y < 15 || y > 30);
  let nearMushroom = false;
  if (mode === 'mushroom-ring') {
    for (let dy = -2; dy <= 2 && !nearMushroom; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const sx = x + dx; const sy = y + dy;
      if (sx >= 0 && sx < width && sy >= 0 && sy < height
          && mushroomSeeds[sy * width + sx]) {
        nearMushroom = true;
        break;
      }
    }
  }
  const removeOutsideMushroom = mode === 'mushroom-ring' && !nearMushroom;
  // Some small standalone-building generations add a thin green terrain/contact plinth even
  // when transparency is requested. Faction architecture in batches using this mode contains no
  // green material, so remove only green-dominant pixels in the lower two-thirds of the canvas.
  const removeGreenBase = mode === 'green-base' && y >= Math.floor(height / 3)
    && green > red * 1.08 && green > blue * 1.05 && green - Math.min(red, blue) >= 12;
  if (removeMagenta || removeOutsideSeam || removeOutsideCartRuts
      || removeOutsideSingleFlower || removeOutsideMushroom || removeGreenBase) {
    pixels[offset + 3] = 0;
    removed += 1;
  } else if (mode === 'cart-ruts') {
    const shade = Math.max(0.65, Math.min(1.2, (red + green + blue) / (3 * 160)));
    pixels[offset] = Math.min(255, Math.round(126 * shade));
    pixels[offset + 1] = Math.min(255, Math.round(87 * shade));
    pixels[offset + 2] = Math.min(255, Math.round(48 * shade));
  }
}
if (!removed) throw new Error(`${input}: mask removed no pixels`);
writeFileSync(output, encodeRgbaPng(width, height, pixels));
console.log(`${input} -> ${output}: ${mode} removed ${removed} pixels`);
