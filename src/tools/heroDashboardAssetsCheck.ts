import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { HEROES } from '../content/heroes';
import { HERO_DASHBOARD_MANIFEST } from '../../assets/heroDashboardManifest';
import { heroDashboardWorklist } from '../../assets/heroDashboardWorklist';
import {
  HERO_PRIMARY_STAT_VISUAL_SUBJECTS, HERO_SPECIALTY_VISUAL_SUBJECTS,
  HERO_VITAL_VISUAL_SUBJECTS,
} from '../../assets/heroDashboardSubjects';

const root = process.cwd(); const errors: string[] = [];
const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

function pngAudit(bytes: Buffer) {
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('invalid PNG');
  let offset = 8; let width = 0; let height = 0; const compressed: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset); const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('not 8-bit RGBA');
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
  let transparent = 0; let opaque = 0; let partial = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] === 0) transparent += 1;
    else if (pixels[index] === 255) opaque += 1;
    else partial += 1;
  }
  return { width, height, transparent, opaque, partial };
}

interface RecordEntry {
  id: string; request_id: string; accepted: boolean; built_in_output: string;
  discarded_outputs: Array<{ source: string; reason: string; source_sha256: string }>;
  source: string; final: string; literal_subject: string; prompt: string;
  prompt_sha256: string; source_sha256: string; final_sha256: string;
  source_dimensions: [number, number]; final_dimensions: [number, number];
}
const provenance = JSON.parse(readFileSync(resolve(root,
  'assets/provenance/hero-dashboard-generation.json'), 'utf8')) as {
  version: number; generator: string; selections: RecordEntry[];
};
if (provenance.version !== 1 || provenance.generator !== 'built-in-imagegen') errors.push('provenance header drift');
const records = new Map(provenance.selections.map((entry) => [entry.id, entry]));
if (records.size !== provenance.selections.length) errors.push('duplicate provenance ids');
const requests = new Map<string, {
  id: string; assets: string[]; output: string; final: string; prompt: string;
  literal_subject: string; candidates: number; built_in_output: string;
}>();
for (let number = 1; number <= 8; number += 1) {
  const job = JSON.parse(readFileSync(resolve(root,
    `assets/jobs/hero-dashboard-${number}-built-in.json`), 'utf8')) as {
    generator: string; status: string; requests: Array<{
      id: string; assets: string[]; output: string; final: string; prompt: string;
      literal_subject: string; candidates: number; built_in_output: string;
    }>;
  };
  if (job.generator !== 'built-in-imagegen' || job.status !== 'ready'
      || job.requests.length !== (number === 8 ? 9 : 10)) errors.push(`job ${number}: batch contract drift`);
  for (const request of job.requests) {
    if (requests.has(request.id)) errors.push(`${request.id}: duplicate request`);
    requests.set(request.id, request);
  }
}

const worklist = heroDashboardWorklist();
const paths = new Set<string>(); const sourcePaths = new Set<string>();
const hashes = new Set<string>(); const sourceHashes = new Set<string>(); const prompts = new Set<string>();
for (const item of worklist) {
  const manifest = HERO_DASHBOARD_MANIFEST[item.id]; const record = records.get(item.id);
  if (!manifest || manifest.w !== item.w || manifest.h !== item.h) { errors.push(`${item.id}: manifest/worklist drift`); continue; }
  if (!record?.accepted) { errors.push(`${item.id}: accepted provenance missing`); continue; }
  const request = requests.get(record.request_id);
  if (!request || request.assets.length !== 1 || request.assets[0] !== item.id
      || request.candidates !== 1 || request.output !== record.source || request.final !== record.final
      || request.prompt !== record.prompt || request.literal_subject !== record.literal_subject
      || request.built_in_output !== record.built_in_output) errors.push(`${item.id}: one-call job/provenance drift`);
  if (record.final !== `public/${manifest.file}`) errors.push(`${item.id}: final path drift`);
  if (!record.prompt.includes('warm bright cartoony storybook fantasy pixel art')
      || !record.prompt.includes('screen lower-right') || !record.prompt.includes('Avoid: text')) {
    errors.push(`${item.id}: prompt style/avoid contract drift`);
  }
  if (sha(record.prompt) !== record.prompt_sha256) errors.push(`${item.id}: prompt hash drift`);
  if (!record.built_in_output.includes('/.codex/generated_images/')
      || !record.built_in_output.endsWith('.png')) errors.push(`${item.id}: provider source is not retained`);
  try {
    const source = readFileSync(resolve(root, record.source)); const final = readFileSync(resolve(root, record.final));
    if (sha(source) !== record.source_sha256 || sha(final) !== record.final_sha256) errors.push(`${item.id}: byte hash drift`);
    const audit = pngAudit(final);
    if (audit.width !== item.w || audit.height !== item.h || !audit.transparent || !audit.opaque || audit.partial) {
      errors.push(`${item.id}: final must be visible hard-alpha ${item.w}x${item.h} RGBA`);
    }
  } catch (error) { errors.push(`${item.id}: source/final unreadable`); }
  paths.add(record.final); sourcePaths.add(record.source); hashes.add(record.final_sha256);
  sourceHashes.add(record.source_sha256); prompts.add(record.prompt_sha256);
  for (const rejected of record.discarded_outputs) {
    if (!rejected.reason.startsWith('Rejected:') || !existsSync(resolve(root, rejected.source))
        || sha(readFileSync(resolve(root, rejected.source))) !== rejected.source_sha256) {
      errors.push(`${item.id}: rejected output is not honestly retained`);
    }
  }
}

const heroIds = Object.keys(HEROES); const specialtyIds = Object.values(HEROES).map((hero) => hero.specialty.id);
if (heroIds.length !== 36 || new Set(specialtyIds).size !== 36) errors.push('canonical hero/specialty catalog is not 36/36');
if (Object.keys(HERO_SPECIALTY_VISUAL_SUBJECTS).length !== 36
    || Object.keys(HERO_PRIMARY_STAT_VISUAL_SUBJECTS).length !== 3
    || Object.keys(HERO_VITAL_VISUAL_SUBJECTS).length !== 4) errors.push('literal icon subject catalog drift');
for (const [label, set] of [['manifest ids', new Set(Object.keys(HERO_DASHBOARD_MANIFEST))],
  ['worklist ids', new Set(worklist.map((item) => item.id))], ['records', new Set(records.keys())],
  ['requests', new Set([...requests.values()].map((request) => request.assets[0]))],
  ['final paths', paths], ['source paths', sourcePaths], ['final hashes', hashes],
  ['source hashes', sourceHashes], ['prompt hashes', prompts]] as const) {
  if (set.size !== 79) errors.push(`${label}: expected 79 unique values, found ${set.size}`);
}
const renderer = readFileSync(resolve(root, 'src/ui/components/HeroDashboardAssets.tsx'), 'utf8');
if (/fallbackSrc|fallbackIcon|onError/.test(renderer) || !renderer.includes('heroPrimaryStatAsset(stat)')) {
  errors.push('shared dashboard renderer must be manifest-backed with no fallback');
}
const spellPower = readFileSync(resolve(root, 'public/assets/icons/effects/spell-power.png'));
if (sha(spellPower) !== '83d8ab913d52631b94ab146ea92acab4a8772e17ae51fb5b18499890d0e5a00f') {
  errors.push('reused Spell Power bytes changed');
}

console.log(`Hero dashboard: ${hashes.size}/79 unique hard-alpha finals · ${records.size}/79 accepted records`);
if (errors.length) {
  console.error('\nHero-dashboard validation failed:'); errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
