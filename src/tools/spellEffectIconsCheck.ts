import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { SPELL_EFFECT_ICON_MANIFEST } from '../../assets/iconManifest';
import { spellEffectIconWorklist } from '../../assets/iconWorklist';
import { SPELL_LEXICON } from '../content/spellLexicon';

const root = process.cwd();
const errors: string[] = [];
const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

function pngAudit(bytes: Buffer) {
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('invalid PNG');
  let offset = 8; let width = 0; let height = 0; const compressed: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
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

interface Selection {
  id: string; request_id: string; accepted: boolean; built_in_output: string;
  discarded_outputs: Array<{ source: string; reason: string; source_sha256: string }>;
  source: string; final: string; literal_subject: string; prompt: string;
  prompt_sha256: string; source_sha256: string; final_sha256: string;
  source_dimensions: [number, number]; final_dimensions: [number, number];
}

let selections: Selection[] = [];
try {
  const provenance = JSON.parse(readFileSync(resolve(root,
    'assets/provenance/spell-effect-icon-generation.json'), 'utf8')) as {
    version: number; generator: string; selections: Selection[];
  };
  if (provenance.version !== 1 || provenance.generator !== 'built-in-imagegen') {
    errors.push('provenance header drift');
  }
  selections = provenance.selections;
} catch (error) {
  errors.push(`provenance: ${error instanceof Error ? error.message : String(error)}`);
}

const byId = new Map(selections.map((entry) => [entry.id, entry]));
if (byId.size !== selections.length) errors.push('duplicate provenance ids');
const jobRequests = new Map<string, {
  assets: string[]; output: string; final: string; prompt: string; literal_subject: string;
}>();
try {
  for (const number of [1, 2, 3]) {
    const job = JSON.parse(readFileSync(resolve(root,
      `assets/jobs/spell-effect-icons-${number}-built-in.json`), 'utf8')) as {
      generator: string; requests: Array<{
        id: string; assets: string[]; output: string; final: string; prompt: string;
        literal_subject: string;
      }>;
    };
    if (job.generator !== 'built-in-imagegen' || job.requests.length !== 10) {
      errors.push(`job batch ${number}: expected ten built-in requests`);
    }
    for (const request of job.requests) jobRequests.set(request.id, request);
  }
} catch (error) {
  errors.push(`job records: ${error instanceof Error ? error.message : String(error)}`);
}
if (jobRequests.size !== 30) errors.push(`job records: expected 30 unique requests, found ${jobRequests.size}`);
const finals = new Set<string>(); const finalHashes = new Set<string>();
const sources = new Set<string>(); const sourceHashes = new Set<string>();
const prompts = new Set<string>();
for (const item of spellEffectIconWorklist()) {
  const id = item.id.replace('spell-effect-icon:', '') as keyof typeof SPELL_LEXICON;
  const manifest = SPELL_EFFECT_ICON_MANIFEST[id]; const record = byId.get(item.id);
  if (!manifest || manifest.generator !== 'built-in-imagegen') {
    errors.push(`${item.id}: missing built-in manifest entry`); continue;
  }
  if (!record?.accepted) { errors.push(`${item.id}: missing accepted provenance`); continue; }
  const request = jobRequests.get(record.request_id);
  if (!request || request.assets[0] !== item.id || request.output !== record.source
      || request.final !== record.final || request.prompt !== record.prompt
      || request.literal_subject !== record.literal_subject) {
    errors.push(`${item.id}: job/provenance drift`);
  }
  if (record.literal_subject !== SPELL_LEXICON[id].visualSubject) {
    errors.push(`${item.id}: literal subject drift`);
  }
  if (record.final !== `public/${manifest.file}` || record.source !== `assets/sources/spell-effects/${id}-source.png`) {
    errors.push(`${item.id}: source/final path drift`);
  }
  if (sha(record.prompt) !== record.prompt_sha256) errors.push(`${item.id}: prompt hash drift`);
  for (const clause of ['bright cartoony storybook pixel art', 'screen lower-right/map south-east',
    'generous empty padding', 'no cropping', 'text, letters, numerals', 'aura, glow']) {
    if (!record.prompt.includes(clause)) errors.push(`${item.id}: missing prompt clause ${clause}`);
  }
  for (const [kind, file, expected] of [
    ['source', record.source, record.source_sha256], ['final', record.final, record.final_sha256],
  ] as const) {
    try {
      const bytes = readFileSync(resolve(root, file));
      if (sha(bytes) !== expected) errors.push(`${item.id}: ${kind} hash drift`);
      if (kind === 'final') {
        const audit = pngAudit(bytes);
        if (audit.width !== 32 || audit.height !== 32 || !audit.transparent || !audit.opaque || audit.partial) {
          errors.push(`${item.id}: final is not visible hard-alpha 32x32 RGBA`);
        }
      }
    } catch (error) { errors.push(`${item.id}: ${kind} missing or unreadable`); }
  }
  if (!record.built_in_output.includes('/.codex/generated_images/')
      || !record.built_in_output.endsWith('.png')) {
    errors.push(`${item.id}: provider output path is not retained`);
  }
  finals.add(record.final); finalHashes.add(record.final_sha256);
  sources.add(record.source); sourceHashes.add(record.source_sha256); prompts.add(record.prompt_sha256);
  for (const rejected of record.discarded_outputs) {
    if (!rejected.reason.startsWith('Rejected:') || !existsSync(resolve(root, rejected.source))
        || sha(readFileSync(resolve(root, rejected.source))) !== rejected.source_sha256) {
      errors.push(`${item.id}: rejected-output provenance drift`);
    }
  }
}

for (const [label, set] of [['final paths', finals], ['final hashes', finalHashes],
  ['source paths', sources], ['source hashes', sourceHashes], ['prompts', prompts]] as const) {
  if (set.size !== 30) errors.push(`${label}: expected 30 unique values, found ${set.size}`);
}
if (Object.keys(SPELL_EFFECT_ICON_MANIFEST).length !== 30 || byId.size !== 30) {
  errors.push('catalog/manifest/provenance coverage must be exactly 30');
}
const renderer = readFileSync(resolve(root, 'src/ui/components/SpellEffectIcon.tsx'), 'utf8');
if (/fallback(?:Src|Icon|Path)|onError/.test(renderer) || !renderer.includes('spellEffectIcon(id)')) {
  errors.push('shared renderer must be manifest-backed with no fallback path');
}

console.log(`Spell-effect icons: ${finalHashes.size}/30 unique hard-alpha finals · ${byId.size}/30 accepted records`);
if (errors.length) {
  console.error('\nSpell-effect icon validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
