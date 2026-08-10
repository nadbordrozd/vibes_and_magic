import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { CONTENT_ICON_MANIFEST, CONTENT_ICON_SIZE } from '../../assets/iconManifest';
import { contentIconWorklist } from '../../assets/iconWorklist';

interface ProvenanceEntry {
  id: string;
  generator: string;
  jobFile: string;
  requestId: string;
  endpoint: string;
  seed: number;
  backgroundJobId: string;
  returnedVariations: number;
  selectedVariation: number;
  target: string;
  sha256: string;
  promptSha256: string;
  accepted: boolean;
}

function sha(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function alphaCounts(bytes: Buffer): { width: number; height: number; visible: number; transparent: number } {
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('invalid PNG signature');
  let offset = 8; let width = 0; let height = 0; const compressed: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error('must be non-interlaced 8-bit RGBA');
      }
    } else if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
  }
  const stride = width * 4; const filtered = inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(stride * height);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < stride; x += 1) {
    const start = y * (stride + 1); const filter = filtered[start];
    const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
    const above = y ? pixels[(y - 1) * stride + x] : 0;
    const upperLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
    const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above
      : filter === 3 ? Math.floor((left + above) / 2) : filter === 4
        ? paeth(left, above, upperLeft) : (() => { throw new Error(`unknown PNG filter ${filter}`); })();
    pixels[y * stride + x] = (filtered[start + 1 + x] + predictor) & 0xff;
  }
  let visible = 0; let transparent = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index]) visible += 1;
    if (pixels[index] < 255) transparent += 1;
  }
  return { width, height, visible, transparent };
}

const root = process.cwd();
const errors: string[] = [];
const worklist = contentIconWorklist();
let provenanceEntries: ProvenanceEntry[] = [];
try {
  const provenance = JSON.parse(readFileSync(resolve(root,
    'assets/provenance/spell-skill-icon-jobs.json'), 'utf8')) as { entries: ProvenanceEntry[] };
  provenanceEntries = provenance.entries;
} catch (error) {
  errors.push(`provenance: ${error instanceof Error ? error.message : String(error)}`);
}
const provenance = new Map(provenanceEntries.map((entry) => [entry.id, entry]));
if (provenance.size !== provenanceEntries.length) errors.push('provenance contains duplicate ids');
const files = new Set<string>(); const hashes = new Map<string, string>();

for (const item of worklist) {
  const manifest = CONTENT_ICON_MANIFEST[item.id];
  const record = provenance.get(item.id);
  if (!manifest) { errors.push(`${item.id}: missing manifest mapping`); continue; }
  if (manifest.w !== CONTENT_ICON_SIZE || manifest.h !== CONTENT_ICON_SIZE) {
    errors.push(`${item.id}: manifest must declare native 32x32`);
  }
  if (files.has(manifest.file)) errors.push(`${item.id}: duplicate manifest file ${manifest.file}`);
  files.add(manifest.file);
  let bytes: Buffer | undefined;
  try {
    bytes = readFileSync(resolve(root, 'public', manifest.file));
    const png = alphaCounts(bytes);
    if (png.width !== 32 || png.height !== 32) errors.push(`${item.id}: PNG is ${png.width}x${png.height}`);
    if (!png.visible || !png.transparent) errors.push(`${item.id}: PNG needs visible pixels and alpha transparency`);
    const fingerprint = sha(bytes); const previous = hashes.get(fingerprint);
    if (previous) errors.push(`${item.id}: duplicates PNG content from ${previous}`);
    hashes.set(fingerprint, item.id);
  } catch (error) {
    errors.push(`${item.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!record) { errors.push(`${item.id}: missing PixelLab provenance`); continue; }
  if (record.generator !== 'pixellab' || record.endpoint !== 'generate-image-v2'
      || !record.backgroundJobId || record.returnedVariations !== 64
      || record.selectedVariation < 1 || record.selectedVariation > 64 || !record.accepted) {
    errors.push(`${item.id}: provenance is not an accepted 64-variation PixelLab job selection`);
  }
  try {
    const job = JSON.parse(readFileSync(resolve(root, record.jobFile), 'utf8')) as {
      status: string; requests: Array<{ id: string; prompt: string; candidates: number; variations_from_single_request: number }>;
    };
    const request = job.requests.find((candidate) => candidate.id === record.requestId);
    if (job.status !== 'ready' || !request || request.candidates !== 1
        || request.variations_from_single_request !== 64) {
      errors.push(`${item.id}: production job is missing or not in the accepted ready state`);
    } else {
      if (sha(request.prompt) !== record.promptSha256) errors.push(`${item.id}: prompt provenance hash drift`);
      if (!request.prompt.includes('Native final-resolution 32x32 transparent UI icon')
          || !request.prompt.includes('No frame, border, badge, background')
          || !request.prompt.includes('text, letters, numbers, logo or watermark')) {
        errors.push(`${item.id}: prompt does not enforce the icon contract`);
      }
    }
    if (bytes && (sha(bytes) !== record.sha256 || record.target !== `public/${manifest.file}`)) {
      errors.push(`${item.id}: promoted bytes/path drift from provenance`);
    }
  } catch (error) {
    errors.push(`${item.id}: job validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const id of Object.keys(CONTENT_ICON_MANIFEST)) {
  if (!worklist.some((item) => item.id === id)) errors.push(`${id}: manifest entry is not canonical`);
}
for (const id of provenance.keys()) {
  if (!CONTENT_ICON_MANIFEST[id]) errors.push(`${id}: provenance entry is not canonical`);
}

console.log(`Content icons: ${hashes.size}/${worklist.length} unique native PNGs · ${provenance.size}/${worklist.length} accepted PixelLab records`);
if (errors.length) {
  console.error('\nContent icon validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
