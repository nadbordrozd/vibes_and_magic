import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { assetWorklist } from '../../assets/worklist';
import { contentIconWorklist } from '../../assets/iconWorklist';

interface PixelReference {
  file: string;
  parameter: string;
  deferred?: boolean;
}

interface PixelRequest {
  id: string;
  assets: string[];
  output: string;
  prompt: string;
  endpoint: string;
  size: [number, number];
  candidates: number;
  variations_from_single_request?: number;
  resource_ids?: string[];
  review_only?: boolean;
  references?: PixelReference[];
}

interface PixelJob {
  version: number;
  status?: 'ready' | 'staged';
  blocked_by?: string;
  contact_sheet: string;
  requests: PixelRequest[];
}

const root = process.cwd();
const jobsDir = resolve(root, 'assets/jobs');
const worklist = [...assetWorklist(), ...contentIconWorklist()];
const byId = new Map(worklist.map((item) => [item.id, item]));
const errors: string[] = [];
const covered = new Map<string, string[]>();
const outputs = new Map<string, string>();
let ready = 0;
let staged = 0;
let requests = 0;

const DOC33_FIXED_PROMPT_CLAUSES = [
  'oblique front-on view with a slight overhead tilt',
  'light from the lower right with shadows falling to the upper left',
  'flat horizontal ground contact',
  'HoMM2-era storybook pixel art',
] as const;
const DOC33_BANNED_PROMPT_WORDS = /\b(?:unfinished|draft|rough|wip|placeholder|first pass|simple|basic|quick|test|temporary|sprite|asset|sprite sheet|variant|version|tileable|png|beautiful|epic|masterpiece|highly detailed|4k)\b/i;
const DOC33_SCALE_CLAUSE = /\b\d+(?:\.\d+)? tiles? wide and about \d+(?:\.\d+)? tiles? tall\b/;

for (const filename of readdirSync(jobsDir).filter((name) => name.endsWith('.json')).sort()) {
  let job: PixelJob;
  try {
    job = JSON.parse(readFileSync(resolve(jobsDir, filename), 'utf8')) as PixelJob;
  } catch (error) {
    errors.push(`${filename}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  const status = job.status ?? 'ready';
  if (job.version !== 1 || !['ready', 'staged'].includes(status)) {
    errors.push(`${filename}: expected version 1 and ready/staged status`);
  }
  if (status === 'staged') {
    staged += 1;
    if (!job.blocked_by) errors.push(`${filename}: staged job must explain blocked_by`);
  } else ready += 1;
  if (!Array.isArray(job.requests) || !job.requests.length || job.requests.length > 10) {
    errors.push(`${filename}: requests must contain 1–10 entries`);
    continue;
  }
  requests += job.requests.length;
  if (!job.contact_sheet?.startsWith('assets/jobs/') || !job.contact_sheet.endsWith('.html')) {
    errors.push(`${filename}: invalid contact_sheet path`);
  }
  const requestIds = new Set<string>();
  for (const request of job.requests) {
    const label = `${filename}:${request.id}`;
    if (requestIds.has(request.id)) errors.push(`${label}: duplicate request id`);
    requestIds.add(request.id);
    if (!request.prompt?.trim()) errors.push(`${label}: missing literal prompt`);
    if (filename.startsWith('doc33-')) {
      for (const clause of DOC33_FIXED_PROMPT_CLAUSES) {
        if (!request.prompt.includes(clause)) errors.push(`${label}: missing doc-33 clause "${clause}"`);
      }
      if (!DOC33_SCALE_CLAUSE.test(request.prompt)) {
        errors.push(`${label}: missing doc-33 visual tile scale clause`);
      }
      const banned = request.prompt.match(DOC33_BANNED_PROMPT_WORDS)?.[0];
      if (banned) errors.push(`${label}: banned doc-33 prompt vocabulary "${banned}"`);
    }
    if (!Array.isArray(request.size) || request.size.length !== 2
        || request.size.some((value) => !Number.isInteger(value) || value <= 0)) {
      errors.push(`${label}: invalid native size`);
    }
    const singleVariationRequest = request.endpoint === 'generate-image-v2'
      && request.candidates === 1
      && Number.isInteger(request.variations_from_single_request)
      && (request.variations_from_single_request ?? 0) >= 2;
    if (!singleVariationRequest && (request.candidates < 2 || request.candidates > 3)) {
      errors.push(`${label}: candidate count must be 2–3, or one generate-image-v2 request must declare its expected variation set`);
    }
    if (request.resource_ids && (request.resource_ids.length !== request.candidates
        || request.resource_ids.some((value) => !value))) {
      errors.push(`${label}: resource_ids must match candidate count`);
    }
    if (!request.output?.startsWith('.pixel-work/pixelgen/')) {
      errors.push(`${label}: output must stay below .pixel-work/pixelgen/`);
    }
    const previous = outputs.get(request.output);
    if (previous) errors.push(`${label}: output collides with ${previous}`);
    outputs.set(request.output, label);
    if (!Array.isArray(request.assets) || !request.assets.length) {
      errors.push(`${label}: no manifest asset ids declared`);
      continue;
    }
    for (const assetId of request.assets) {
      if (request.review_only) {
        if (!assetId.startsWith('review:')) {
          errors.push(`${label}: review-only asset ids must start with review:`);
        }
        continue;
      }
      const item = byId.get(assetId);
      if (!item) {
        errors.push(`${label}: ${assetId} is not in the data-derived worklist`);
        continue;
      }
      covered.set(assetId, [...covered.get(assetId) ?? [], label]);
      const [width, height] = request.size;
      if ('groundContact' in item && item.groundContact) {
        if (width % 32 || width < item.w || height < item.h) {
          errors.push(`${label}: ${assetId} canvas ${width}x${height} cannot cover ${item.w}x${item.h}`);
        }
      } else if (width !== item.w || height !== item.h) {
        errors.push(`${label}: ${assetId} requires exact native size ${item.w}x${item.h}`);
      }
    }
    for (const reference of request.references ?? []) {
      if (!reference.parameter || !reference.file) errors.push(`${label}: malformed reference`);
      const localThirdPartyReference = /^assets\/guides\/[^/]*h2[^/]*\.png$/i.test(reference.file);
      if (!existsSync(resolve(root, reference.file)) && !(status === 'staged' && reference.deferred)
          && !localThirdPartyReference) {
        errors.push(`${label}: missing reference ${reference.file}`);
      }
    }
  }
}

for (const item of worklist) {
  if (!covered.has(item.id)) errors.push(`${item.id}: no production job covers this work item`);
}

console.log(`PixelLab jobs: ${ready} ready · ${staged} staged · ${requests} requests`);
console.log(`PixelLab worklist coverage: ${covered.size}/${worklist.length} assets have a production path`);
if (errors.length) {
  console.error('\nPixelLab job validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
