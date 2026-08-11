import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { assetWorklist } from '../../assets/worklist';
import { contentIconWorklist } from '../../assets/iconWorklist';
import {
  ARTIFACT_SPRITE_SUBJECTS, ITEM_SPRITE_SUBJECTS, RESOURCE_MINE_SUBJECTS,
} from '../../assets/adventureSpriteInventory';
import { ARTIFACTS } from '../content/artifacts';
import { ITEMS } from '../content/items';

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
  endpoint?: string;
  size: [number, number];
  candidates: number;
  final?: string;
  variations_from_single_request?: number;
  resource_ids?: string[];
  review_only?: boolean;
  superseded_by?: string;
  references?: PixelReference[];
  collectible_family?: string;
  catalog_key?: string;
  catalog_group?: string;
  resource_id?: string;
  literal_subject?: string;
  chroma_key?: string;
}

interface PixelJob {
  version: number;
  status?: 'ready' | 'staged';
  generator?: 'built-in-imagegen';
  blocked_by?: string;
  contact_sheet: string;
  requests: PixelRequest[];
  collectible_family?: string;
}

const root = process.cwd();
const jobsDir = resolve(root, 'assets/jobs');
const worklist = [...assetWorklist(), ...contentIconWorklist()];
const byId = new Map(worklist.map((item) => [item.id, item]));
const errors: string[] = [];
const covered = new Map<string, string[]>();
const outputs = new Map<string, string>();
const supersededClaims: Array<{ assetId: string; label: string; replacement: string }> = [];
let ready = 0;
let staged = 0;
let requests = 0;
let builtInJobs = 0;

const DOC33_FIXED_PROMPT_CLAUSES = [
  'oblique front-on view with a slight overhead tilt',
  'light from the lower right with shadows falling to the upper left',
  'flat horizontal ground contact',
  'HoMM2-era storybook pixel art',
] as const;
const DOC33_BANNED_PROMPT_WORDS = /\b(?:unfinished|draft|rough|wip|placeholder|first pass|simple|basic|quick|test|temporary|sprite|asset|sprite sheet|variant|version|tileable|png|beautiful|epic|masterpiece|highly detailed|4k)\b/i;
const DOC33_SCALE_CLAUSE = /\b\d+(?:\.\d+)? tiles? wide and about \d+(?:\.\d+)? tiles? tall\b/;

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function safelyBelow(value: unknown, base: string): value is string {
  if (typeof value !== 'string' || !value) return false;
  const pathFromBase = relative(resolve(root, base), resolve(root, value));
  return pathFromBase !== '' && pathFromBase !== '..'
    && !pathFromBase.startsWith(`..${sep}`) && !isAbsolute(pathFromBase);
}

const jobFilenames = readdirSync(jobsDir).filter((name) => name.endsWith('.json')).sort();
const knownJobs = new Set(jobFilenames);
for (const filename of jobFilenames) {
  let job: PixelJob;
  try {
    job = JSON.parse(readFileSync(resolve(jobsDir, filename), 'utf8')) as PixelJob;
  } catch (error) {
    errors.push(`${filename}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  const status = job.status ?? 'ready';
  const builtIn = job.generator === 'built-in-imagegen';
  if (builtIn) builtInJobs += 1;
  if (job.version !== 1 || !['ready', 'staged'].includes(status)) {
    errors.push(`${filename}: expected version 1 and ready/staged status`);
  }
  if (status === 'staged') {
    staged += 1;
    if (!job.blocked_by) errors.push(`${filename}: staged job must explain blocked_by`);
  } else ready += 1;
  const requestLimit = builtIn && job.collectible_family ? 200 : 10;
  if (!Array.isArray(job.requests) || !job.requests.length || job.requests.length > requestLimit) {
    errors.push(`${filename}: requests must contain 1–${requestLimit} entries`);
    continue;
  }
  requests += job.requests.length;
  const validContactSheet = builtIn
    ? job.contact_sheet?.startsWith('.pixel-work/review/')
      && (job.contact_sheet.endsWith('.png') || Boolean(job.collectible_family))
    : job.contact_sheet?.startsWith('assets/jobs/') && job.contact_sheet.endsWith('.html');
  if (!validContactSheet) {
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
    const validNativeSize = Array.isArray(request.size) && request.size.length === 2
      && request.size.every((value) => Number.isInteger(value) && value > 0);
    if (!validNativeSize) {
      errors.push(`${label}: invalid native size`);
    }
    const singleVariationRequest = request.endpoint === 'generate-image-v2'
      && request.candidates === 1
      && Number.isInteger(request.variations_from_single_request)
      && (request.variations_from_single_request ?? 0) >= 2;
    if (builtIn && request.candidates !== 1) {
      errors.push(`${label}: built-in generation must record exactly one selected source`);
    } else if (!builtIn && !singleVariationRequest
        && (request.candidates < 2 || request.candidates > 3)) {
      errors.push(`${label}: candidate count must be 2–3, or one generate-image-v2 request must declare its expected variation set`);
    }
    if (request.resource_ids && (request.resource_ids.length !== request.candidates
        || request.resource_ids.some((value) => !value))) {
      errors.push(`${label}: resource_ids must match candidate count`);
    }
    const validOutput = builtIn
      ? safelyBelow(request.output, 'assets/sources')
      : request.output?.startsWith('.pixel-work/pixelgen/');
    if (!validOutput) {
      errors.push(`${label}: invalid generator output path`);
    }
    const previous = outputs.get(request.output);
    if (previous) errors.push(`${label}: output collides with ${previous}`);
    outputs.set(request.output, label);
    if (builtIn) {
      if (validOutput && !existsSync(resolve(root, request.output))) {
        errors.push(`${label}: missing built-in source`);
      }
      if (!safelyBelow(request.final, 'public/assets')
          || !existsSync(resolve(root, request.final ?? ''))) {
        errors.push(`${label}: missing or invalid promoted built-in final`);
      }
      if (job.collectible_family) {
        const family = job.collectible_family;
        if (request.collectible_family !== family || !request.catalog_key
            || !request.catalog_group || !/^#[0-9A-F]{6}$/.test(request.chroma_key ?? '')) {
          errors.push(`${label}: malformed reusable collectible metadata`);
        }
        if (!request.output.startsWith(`assets/sources/${family}s/`)
            || !request.final?.startsWith(`public/assets/${family}s/`)) {
          errors.push(`${label}: collectible source/final paths do not match family ${family}`);
        }
      }
    }
    if (!Array.isArray(request.assets) || !request.assets.length) {
      errors.push(`${label}: no manifest asset ids declared`);
      continue;
    }
    if (request.review_only && request.superseded_by) {
      errors.push(`${label}: request cannot be both review-only and superseded`);
    }
    if (request.superseded_by && (!knownJobs.has(request.superseded_by)
        || request.superseded_by === filename)) {
      errors.push(`${label}: superseded_by must name a different catalog job`);
    }
    for (const assetId of request.assets) {
      if (request.review_only) {
        if (!assetId.startsWith('review:')) {
          errors.push(`${label}: review-only asset ids must start with review:`);
        }
        continue;
      }
      if (request.superseded_by) {
        if (!byId.has(assetId)) {
          errors.push(`${label}: historical asset ${assetId} is not in the data-derived worklist`);
        } else {
          supersededClaims.push({ assetId, label, replacement: request.superseded_by });
        }
        continue;
      }
      const item = byId.get(assetId);
      if (!item) {
        errors.push(`${label}: ${assetId} is not in the data-derived worklist`);
        continue;
      }
      covered.set(assetId, [...covered.get(assetId) ?? [], label]);
      if (!validNativeSize) continue;
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
for (const claim of supersededClaims) {
  if (!(covered.get(claim.assetId) ?? []).some((label) =>
    label.startsWith(`${claim.replacement}:`))) {
    errors.push(`${claim.label}: ${claim.replacement} does not actively replace ${claim.assetId}`);
  }
}
for (const item of worklist.filter((candidate) => candidate.category === 'castle')) {
  const claims = covered.get(item.id) ?? [];
  if (claims.length !== 1 || !claims[0].startsWith('city-sprites-built-in.json:')) {
    errors.push(`${item.id}: expected exactly one active production claim from city-sprites-built-in.json, found ${claims.join(', ') || 'none'}`);
  }
}
for (const resource of Object.keys(RESOURCE_MINE_SUBJECTS)) {
  const id = `map-object:mine:${resource}`;
  const claims = covered.get(id) ?? [];
  if (claims.length !== 1 || !claims[0].startsWith('mine-sprites-built-in.json:')) {
    errors.push(`${id}: expected exactly one active production claim from mine-sprites-built-in.json, found ${claims.join(', ') || 'none'}`);
  }
}

try {
  const cityJob = JSON.parse(readFileSync(
    resolve(root, 'assets/jobs/city-sprites-built-in.json'), 'utf8',
  )) as PixelJob;
  const provenance = JSON.parse(readFileSync(
    resolve(root, 'assets/provenance/city-sprite-generation.json'), 'utf8',
  )) as {
    version: number;
    generator: string;
    selections: Array<{
      id: string;
      request_id: string;
      accepted: boolean;
      source: string;
      final: string;
      prompt_sha256: string;
      source_sha256: string;
      final_sha256: string;
    }>;
  };
  if (provenance.version !== 1 || provenance.generator !== 'built-in-imagegen'
      || provenance.selections.length !== 6) {
    errors.push('city sprite provenance must contain exactly six built-in selections');
  }
  const provenanceByRequest = new Map(
    provenance.selections.map((selection) => [selection.request_id, selection]),
  );
  for (const request of cityJob.requests) {
    const label = `city provenance:${request.id}`;
    const selection = provenanceByRequest.get(request.id);
    if (!selection || !selection.accepted) {
      errors.push(`${label}: missing accepted selection`);
      continue;
    }
    if (selection.id !== request.assets[0] || selection.source !== request.output
        || selection.final !== request.final) {
      errors.push(`${label}: selection path or compatibility id drift`);
    }
    if (!Array.isArray(request.size) || request.size[0] !== 160 || request.size[1] !== 160
        || !request.output.startsWith('assets/sources/cities/')
        || !request.final?.startsWith('public/assets/cities/')) {
      errors.push(`${label}: city job must retain 160x160 source/final city paths`);
    }
    if (selection.prompt_sha256 !== sha256(request.prompt)) {
      errors.push(`${label}: prompt hash drift`);
    }
    for (const [kind, file, expected] of [
      ['source', selection.source, selection.source_sha256],
      ['final', selection.final, selection.final_sha256],
    ] as const) {
      const path = resolve(root, file);
      if (!existsSync(path) || sha256(readFileSync(path)) !== expected) {
        errors.push(`${label}: ${kind} content hash drift`);
      }
    }
  }
} catch (error) {
  errors.push(`city sprite provenance: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const mineJob = JSON.parse(readFileSync(
    resolve(root, 'assets/jobs/mine-sprites-built-in.json'), 'utf8',
  )) as PixelJob;
  const provenance = JSON.parse(readFileSync(
    resolve(root, 'assets/provenance/mine-sprite-generation.json'), 'utf8',
  )) as { version: number; generator: string; job: string; selections: Array<{
    id: string; request_id: string; resource_id: string; accepted: boolean;
    built_in_output: string; discarded_outputs: unknown[]; source: string; final: string;
    prompt_sha256: string; source_sha256: string; final_sha256: string;
    source_dimensions: [number, number]; final_dimensions: [number, number];
    alpha: { transparent: number; opaque: number; partial: number;
      transparent_corners: number; chroma_fringe_pixels: number };
  }> };
  const resources = Object.keys(RESOURCE_MINE_SUBJECTS).sort();
  const jobResources = mineJob.requests.map((request) => request.resource_id ?? '').sort();
  const selectionResources = provenance.selections.map((selection) => selection.resource_id).sort();
  if (mineJob.generator !== 'built-in-imagegen' || mineJob.requests.length !== 4
      || provenance.version !== 1 || provenance.generator !== 'built-in-imagegen'
      || provenance.job !== 'assets/jobs/mine-sprites-built-in.json'
      || provenance.selections.length !== 4
      || JSON.stringify(jobResources) !== JSON.stringify(resources)
      || JSON.stringify(selectionResources) !== JSON.stringify(resources)) {
    errors.push('mine sprite job/provenance must contain exactly four catalog resource selections');
  }
  const byRequest = new Map(provenance.selections.map((entry) => [entry.request_id, entry]));
  const subjectTerms: Record<string, readonly string[]> = {
    gold: ['quarried-limestone', 'adit', 'hand-cranked wooden winch', 'gold-bearing chips'],
    iron: ['headframe', 'pulley wheel', 'iron rails', 'ore trolley', 'iron-bearing stone'],
    timber: ['logging yard', 'saw shelter', 'sawbench', 'crosscut saw', 'round-ended cut logs'],
    essence: ['stitchwell', 'stone-lined extraction basin', 'world seam', 'copper pump',
      'winding drum', 'glass collection vessel'],
  };
  const sourcePaths = new Set<string>(); const finalPaths = new Set<string>();
  const outputs = new Set<string>(); const sourceHashes = new Set<string>();
  const finalHashes = new Set<string>();
  for (const request of mineJob.requests) {
    const resource = request.resource_id ?? '';
    const selection = byRequest.get(request.id);
    const label = `mine provenance:${request.id}`;
    if (!selection?.accepted || selection.id !== request.assets[0]
        || selection.resource_id !== resource || selection.source !== request.output
        || selection.final !== request.final || selection.discarded_outputs.length) {
      errors.push(`${label}: missing or drifted accepted one-shot selection`); continue;
    }
    if (!request.output.startsWith(`assets/sources/mines/${resource}-source.png`)
        || request.final !== `public/assets/mines/${resource}.png`
        || request.size[0] !== 64 || request.size[1] !== 96 || request.candidates !== 1) {
      errors.push(`${label}: mine source/final/native geometry drift`);
    }
    if (request.literal_subject !== RESOURCE_MINE_SUBJECTS[
      resource as keyof typeof RESOURCE_MINE_SUBJECTS
    ]) errors.push(`${label}: canonical literal subject drift`);
    for (const clause of [
      'high-oblique non-isometric', 'screen lower-right/map south-east',
      'screen upper-left/map north-west', 'generous empty padding',
      'no pole or flag', 'terrain', 'text',
      ...(subjectTerms[resource] ?? []),
    ]) if (!request.prompt.includes(clause)) errors.push(`${label}: missing prompt clause "${clause}"`);
    if (resource === 'essence' && ![
      'generic crystals', 'gem cave', 'wizard tower', 'sci-fi machine',
    ].every((clause) => request.prompt.includes(clause))) {
      errors.push(`${label}: essence exclusions drift`);
    }
    if (selection.prompt_sha256 !== sha256(request.prompt)) {
      errors.push(`${label}: prompt hash drift`);
    }
    for (const [kind, file, expected] of [
      ['source', selection.source, selection.source_sha256],
      ['final', selection.final, selection.final_sha256],
    ] as const) {
      const path = resolve(root, file);
      if (!existsSync(path) || sha256(readFileSync(path)) !== expected) {
        errors.push(`${label}: ${kind} content hash drift`);
      }
    }
    if (selection.final_dimensions[0] !== 64 || selection.final_dimensions[1] !== 96
        || selection.source_dimensions[0] <= 64 || selection.source_dimensions[1] <= 96
        || selection.alpha.partial !== 0 || selection.alpha.transparent_corners !== 4
        || selection.alpha.chroma_fringe_pixels !== 0
        || selection.alpha.transparent + selection.alpha.opaque !== 64 * 96) {
      errors.push(`${label}: dimensions or hard-alpha audit drift`);
    }
    sourcePaths.add(selection.source); finalPaths.add(selection.final);
    outputs.add(selection.built_in_output); sourceHashes.add(selection.source_sha256);
    finalHashes.add(selection.final_sha256);
  }
  if ([sourcePaths, finalPaths, outputs, sourceHashes, finalHashes]
    .some((set) => set.size !== 4)) {
    errors.push('mine sprites must retain four distinct source/final/output/hash selections');
  }
} catch (error) {
  errors.push(`mine sprite provenance: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const itemJob = JSON.parse(readFileSync(
    resolve(root, 'assets/jobs/item-sprites-built-in.json'), 'utf8',
  )) as PixelJob;
  const provenance = JSON.parse(readFileSync(
    resolve(root, 'assets/provenance/item-sprite-generation.json'), 'utf8',
  )) as { version: number; generator: string; job: string; selections: Array<{
    id: string; request_id: string; collectible_family: string; catalog_key: string;
    accepted: boolean; built_in_output: string; discarded_outputs: Array<{
      built_in_output: string; source: string; reason: string; prompt?: string;
      prompt_sha256?: string; source_sha256?: string;
    }>; source: string; final: string; prompt_sha256: string;
    source_sha256: string; final_sha256: string; source_dimensions: [number, number];
    final_dimensions: [number, number]; alpha: {
      transparent: number; opaque: number; partial: number; transparent_corners: number;
    };
  }> };
  const installedIds = Object.keys(ITEMS).sort();
  const requestKeys = itemJob.requests.map((request) => request.catalog_key ?? '').sort();
  const requestGroups = new Map(['combat', 'adventure', 'automatic'].map((group) => [group,
    itemJob.requests.filter((request) => request.catalog_group === group)
      .map((request) => request.catalog_key ?? '').sort()]));
  if (itemJob.collectible_family !== 'item' || itemJob.requests.length !== 37
      || provenance.version !== 1 || provenance.generator !== 'built-in-imagegen'
      || provenance.job !== 'assets/jobs/item-sprites-built-in.json'
      || provenance.selections.length !== 37
      || JSON.stringify(requestKeys) !== JSON.stringify(installedIds)
      || JSON.stringify(requestGroups.get('combat')) !== JSON.stringify(Object.values(ITEMS)
        .filter((item) => item.use === 'combat').map((item) => item.id).sort())
      || JSON.stringify(requestGroups.get('adventure')) !== JSON.stringify(Object.values(ITEMS)
        .filter((item) => item.use === 'adventure').map((item) => item.id).sort())
      || JSON.stringify(requestGroups.get('automatic')) !== JSON.stringify(Object.values(ITEMS)
        .filter((item) => item.use === 'automatic').map((item) => item.id).sort())) {
    errors.push('item collectible job/provenance must contain exactly 25 combat, 11 adventure, and 1 automatic catalog selections');
  }
  const byRequest = new Map(provenance.selections.map((entry) => [entry.request_id, entry]));
  const sourcePaths = new Set<string>(); const finalPaths = new Set<string>();
  const sourceHashes = new Set<string>(); const finalHashes = new Set<string>();
  const outputs = new Set<string>(); const prompts = new Set<string>();
  for (const request of itemJob.requests) {
    const selection = byRequest.get(request.id);
    const label = `item provenance:${request.id}`;
    if (!selection?.accepted || selection.id !== request.assets[0]
        || selection.collectible_family !== 'item' || selection.catalog_key !== request.catalog_key
        || !['combat', 'adventure', 'automatic'].includes(request.catalog_group ?? '')
        || selection.source !== request.output || selection.final !== request.final) {
      errors.push(`${label}: missing or drifted accepted selection`); continue;
    }
    const subject = ITEM_SPRITE_SUBJECTS[
      selection.catalog_key as keyof typeof ITEM_SPRITE_SUBJECTS
    ];
    // Quiet's reviewed retry expands the inventory sentence to correct the clasp's scale and
    // dominance. This single immutable equivalent is intentionally narrower than a generic
    // "physical prompt exists" escape hatch so another ItemId cannot pass with the wrong subject.
    const quietAcceptedSubject = 'A pale parchment scroll tied with a blue-grey cord around a tiny closed bell clasp without a clapper. The rolled parchment must be the dominant silhouette; the bell is only a miniature cord clasp, never a full-size bell.';
    const literalPrompt = request.prompt.includes(subject)
      || (selection.catalog_key === 'scrollQuiet' && request.prompt.includes(quietAcceptedSubject))
      || selection.discarded_outputs.some((discarded) => discarded.prompt?.includes(subject));
    if (!subject || !literalPrompt) errors.push(`${label}: literal catalog subject drift`);
    if (selection.prompt_sha256 !== sha256(request.prompt)) errors.push(`${label}: prompt hash drift`);
    for (const [kind, file, expected] of [
      ['source', selection.source, selection.source_sha256],
      ['final', selection.final, selection.final_sha256],
    ] as const) {
      const path = resolve(root, file);
      if (!existsSync(path) || sha256(readFileSync(path)) !== expected) {
        errors.push(`${label}: ${kind} content hash drift`);
      }
    }
    if (selection.final_dimensions?.[0] !== 32 || selection.final_dimensions?.[1] !== 32
        || selection.alpha.partial !== 0 || selection.alpha.transparent_corners !== 4
        || selection.alpha.transparent + selection.alpha.opaque !== 1024) {
      errors.push(`${label}: final must be native 32x32 with hard alpha and transparent corners`);
    }
    if (sourcePaths.has(selection.source) || finalPaths.has(selection.final)
        || sourceHashes.has(selection.source_sha256) || finalHashes.has(selection.final_sha256)
        || outputs.has(selection.built_in_output) || prompts.has(selection.prompt_sha256)) {
      errors.push(`${label}: duplicate source/final path, bytes, prompt, or built-in output`);
    }
    sourcePaths.add(selection.source); finalPaths.add(selection.final);
    sourceHashes.add(selection.source_sha256);
    finalHashes.add(selection.final_sha256);
    outputs.add(selection.built_in_output); prompts.add(selection.prompt_sha256);
    for (const discarded of selection.discarded_outputs) {
      if (!discarded.reason.trim() || !existsSync(resolve(root, discarded.source))) {
        errors.push(`${label}: rejected source must remain retained with an honest reason`);
      }
      if (discarded.prompt && discarded.prompt_sha256 !== sha256(discarded.prompt)) {
        errors.push(`${label}: rejected prompt hash drift`);
      }
      if (discarded.source_sha256
          && sha256(readFileSync(resolve(root, discarded.source))) !== discarded.source_sha256) {
        errors.push(`${label}: rejected source content hash drift`);
      }
    }
  }
} catch (error) {
  errors.push(`item sprite provenance: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const artifactJob = JSON.parse(readFileSync(
    resolve(root, 'assets/jobs/artifact-sprites-built-in.json'), 'utf8',
  )) as PixelJob;
  const provenance = JSON.parse(readFileSync(
    resolve(root, 'assets/provenance/artifact-sprite-generation.json'), 'utf8',
  )) as { version: number; generator: string; job: string; selections: Array<{
    id: string; request_id: string; collectible_family: string; catalog_key: string;
    accepted: boolean; built_in_output: string; discarded_outputs: Array<{
      built_in_output: string; source: string; reason: string; prompt?: string;
      prompt_sha256?: string; source_sha256?: string;
    }>; source: string; final: string; prompt_sha256: string;
    source_sha256: string; final_sha256: string; source_dimensions: [number, number];
    final_dimensions: [number, number]; alpha: {
      transparent: number; opaque: number; partial: number; transparent_corners: number;
    };
  }> };
  const vanillaIds = Object.values(ARTIFACTS)
    .filter((artifact) => artifact.class === 'vanilla').map((artifact) => artifact.id).sort();
  const charmIds = Object.values(ARTIFACTS)
    .filter((artifact) => artifact.class === 'charm').map((artifact) => artifact.id).sort();
  const relicIds = Object.values(ARTIFACTS)
    .filter((artifact) => artifact.class === 'relic').map((artifact) => artifact.id).sort();
  const burdenIds = Object.values(ARTIFACTS)
    .filter((artifact) => artifact.class === 'burden').map((artifact) => artifact.id).sort();
  const kitIds = Object.values(ARTIFACTS)
    .filter((artifact) => artifact.class === 'kit').map((artifact) => artifact.id).sort();
  const trinketIds = Object.values(ARTIFACTS)
    .filter((artifact) => artifact.class === 'trinket').map((artifact) => artifact.id).sort();
  const installedIds = Object.keys(ARTIFACTS).sort();
  const requestKeys = artifactJob.requests.map((request) => request.catalog_key ?? '').sort();
  const requestGroups = new Map([
    'vanilla', 'charm', 'relic', 'burden', 'kit', 'trinket',
  ].map((group) => [group,
    artifactJob.requests.filter((request) => request.catalog_group === group)
      .map((request) => request.catalog_key ?? '').sort()]));
  if (artifactJob.collectible_family !== 'artifact' || artifactJob.requests.length !== 90
      || provenance.version !== 1 || provenance.generator !== 'built-in-imagegen'
      || provenance.job !== 'assets/jobs/artifact-sprites-built-in.json'
      || provenance.selections.length !== 90
      || JSON.stringify(requestKeys) !== JSON.stringify(installedIds)
      || JSON.stringify(requestGroups.get('vanilla')) !== JSON.stringify(vanillaIds)
      || JSON.stringify(requestGroups.get('charm')) !== JSON.stringify(charmIds)
      || JSON.stringify(requestGroups.get('relic')) !== JSON.stringify(relicIds)
      || JSON.stringify(requestGroups.get('burden')) !== JSON.stringify(burdenIds)
      || JSON.stringify(requestGroups.get('kit')) !== JSON.stringify(kitIds)
      || JSON.stringify(requestGroups.get('trinket')) !== JSON.stringify(trinketIds)) {
    errors.push('artifact collectible job/provenance must contain exactly 36 Vanilla, 22 Charm, 18 Relic, 4 Burden, 4 Kit, and 6 Trinket selections');
  }
  const byRequest = new Map(provenance.selections.map((entry) => [entry.request_id, entry]));
  const sourcePaths = new Set<string>(); const finalPaths = new Set<string>();
  const sourceHashes = new Set<string>(); const finalHashes = new Set<string>();
  const outputs = new Set<string>(); const prompts = new Set<string>();
  for (const request of artifactJob.requests) {
    const selection = byRequest.get(request.id);
    const label = `artifact provenance:${request.id}`;
    if (!selection?.accepted || selection.id !== request.assets[0]
        || selection.collectible_family !== 'artifact'
        || selection.catalog_key !== request.catalog_key
        || !['vanilla', 'charm', 'relic', 'burden', 'kit', 'trinket']
          .includes(request.catalog_group ?? '')
        || selection.source !== request.output || selection.final !== request.final) {
      errors.push(`${label}: missing or drifted accepted installed-class selection`); continue;
    }
    const subject = ARTIFACT_SPRITE_SUBJECTS[selection.catalog_key as keyof typeof ARTIFACT_SPRITE_SUBJECTS];
    const literalPrompt = request.prompt.includes(subject)
      || selection.discarded_outputs.some((discarded) => discarded.prompt?.includes(subject));
    if (!subject || !literalPrompt) errors.push(`${label}: literal catalog subject drift`);
    if (selection.prompt_sha256 !== sha256(request.prompt)) errors.push(`${label}: prompt hash drift`);
    for (const [kind, file, expected] of [
      ['source', selection.source, selection.source_sha256],
      ['final', selection.final, selection.final_sha256],
    ] as const) {
      const path = resolve(root, file);
      if (!existsSync(path) || sha256(readFileSync(path)) !== expected) {
        errors.push(`${label}: ${kind} content hash drift`);
      }
    }
    if (selection.final_dimensions?.[0] !== 32 || selection.final_dimensions?.[1] !== 32
        || selection.alpha.partial !== 0 || selection.alpha.transparent_corners !== 4
        || selection.alpha.transparent + selection.alpha.opaque !== 1024) {
      errors.push(`${label}: final must be native 32x32 with hard alpha and transparent corners`);
    }
    if (sourcePaths.has(selection.source) || finalPaths.has(selection.final)
        || sourceHashes.has(selection.source_sha256) || finalHashes.has(selection.final_sha256)
        || outputs.has(selection.built_in_output) || prompts.has(selection.prompt_sha256)) {
      errors.push(`${label}: duplicate source/final path, bytes, prompt, or built-in output`);
    }
    sourcePaths.add(selection.source); finalPaths.add(selection.final);
    sourceHashes.add(selection.source_sha256); finalHashes.add(selection.final_sha256);
    outputs.add(selection.built_in_output); prompts.add(selection.prompt_sha256);
    for (const discarded of selection.discarded_outputs) {
      if (!discarded.reason.trim() || !existsSync(resolve(root, discarded.source))) {
        errors.push(`${label}: rejected source must remain retained with an honest reason`);
      }
      if (discarded.prompt && discarded.prompt_sha256 !== sha256(discarded.prompt)) {
        errors.push(`${label}: rejected prompt hash drift`);
      }
      if (discarded.source_sha256
          && sha256(readFileSync(resolve(root, discarded.source))) !== discarded.source_sha256) {
        errors.push(`${label}: rejected source content hash drift`);
      }
    }
  }
} catch (error) {
  errors.push(`artifact sprite provenance: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const families = ['item', 'artifact'].flatMap((family) => {
    const provenance = JSON.parse(readFileSync(resolve(
      root, `assets/provenance/${family}-sprite-generation.json`,
    ), 'utf8')) as { selections: Array<{
      source: string; final: string; source_sha256: string; final_sha256: string;
      built_in_output: string; prompt_sha256: string;
    }> };
    return provenance.selections;
  });
  if (families.length !== 127
      || new Set(families.map((selection) => selection.source)).size !== 127
      || new Set(families.map((selection) => selection.final)).size !== 127
      || new Set(families.map((selection) => selection.source_sha256)).size !== 127
      || new Set(families.map((selection) => selection.final_sha256)).size !== 127
      || new Set(families.map((selection) => selection.built_in_output)).size !== 127
      || new Set(families.map((selection) => selection.prompt_sha256)).size !== 127) {
    errors.push('combined collectible provenance must retain 127 unique source/final paths and bytes, prompts, and built-in outputs');
  }
} catch (error) {
  errors.push(`combined collectible provenance: ${error instanceof Error ? error.message : String(error)}`);
}

console.log(`Pixel production jobs: ${ready} ready · ${staged} staged · ${requests} requests · ${builtInJobs} built-in provenance job`);
console.log(`PixelLab worklist coverage: ${covered.size}/${worklist.length} assets have a production path`);
if (errors.length) {
  console.error('\nPixelLab job validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
