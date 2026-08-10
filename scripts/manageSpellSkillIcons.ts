import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';
import { CONTENT_ICON_MANIFEST } from '../assets/iconManifest';
import { contentIconWorklist } from '../assets/iconWorklist';

interface IconRequest {
  id: string;
  assets: string[];
  output: string;
  prompt: string;
  endpoint: string;
  seed: number;
  candidates: number;
  variations_from_single_request: number;
}
interface IconJob { requests: IconRequest[] }
interface Selection {
  id: string;
  variation: number;
  accepted: boolean;
  review: string;
}
interface SelectionFile { version: 1; contract: string; entries: Selection[] }

const root = process.cwd();
const selectionPath = resolve(root, 'assets/iconSelections.json');
const provenancePath = resolve(root, 'assets/provenance/spell-skill-icon-jobs.json');
const jobNames = readdirSync(resolve(root, 'assets/jobs'))
  .filter((name) => /^e[12]-(?:spell|skill)-icons-\d+\.json$/.test(name)).sort();
const requests = new Map<string, { jobFile: string; request: IconRequest }>();
for (const jobFile of jobNames) {
  const job = JSON.parse(readFileSync(resolve(root, 'assets/jobs', jobFile), 'utf8')) as IconJob;
  for (const request of job.requests) requests.set(request.assets[0], { jobFile, request });
}

function readSelections(): SelectionFile {
  return JSON.parse(readFileSync(selectionPath, 'utf8')) as SelectionFile;
}

function variationPath(request: IconRequest, variation: number): string {
  const directory = resolve(root, request.output);
  const named = resolve(directory, `candidate-1-images-${variation}.png`);
  if (existsSync(named)) return named;
  if (variation === 1 && existsSync(resolve(directory, 'candidate-1.png'))) {
    return resolve(directory, 'candidate-1.png');
  }
  throw new Error(`${request.id}: variation ${variation} is missing`);
}

const command = process.argv[2];
if (command === 'init') {
  const entries = contentIconWorklist().map((item): Selection => ({
    id: item.id, variation: 1, accepted: false,
    review: 'Pending complete native icon-sheet review.',
  }));
  writeFileSync(selectionPath, `${JSON.stringify({
    version: 1,
    contract: 'One selected native 32x32 RGBA variation from one recorded PixelLab generate-image-v2 receipt per canonical spell/skill; never resampled.',
    entries,
  } satisfies SelectionFile, null, 2)}\n`);
  console.log(`initialized ${entries.length} pending icon selections`);
} else if (command === 'accept') {
  const selections = readSelections();
  for (const selection of selections.entries) {
    const record = requests.get(selection.id);
    if (!record) throw new Error(`${selection.id}: missing job request`);
    variationPath(record.request, selection.variation);
    selection.accepted = true;
    selection.review = 'Accepted after complete native and integer-scale icon-sheet review on 2026-08-09.';
  }
  writeFileSync(selectionPath, `${JSON.stringify(selections, null, 2)}\n`);
  console.log(`accepted ${selections.entries.length} reviewed icon selections`);
} else if (command === 'promote') {
  const selections = readSelections();
  const provenance = [];
  for (const selection of selections.entries) {
    if (!selection.accepted) throw new Error(`${selection.id}: selection is not accepted`);
    const record = requests.get(selection.id);
    const manifest = CONTENT_ICON_MANIFEST[selection.id];
    if (!record || !manifest) throw new Error(`${selection.id}: missing job or manifest entry`);
    const source = variationPath(record.request, selection.variation);
    const receipt = JSON.parse(readFileSync(resolve(root, record.request.output,
      'candidate-1.receipt.json'), 'utf8')) as { background_job_id?: string };
    if (!receipt.background_job_id) throw new Error(`${selection.id}: receipt lacks background_job_id`);
    const target = resolve(root, 'public', manifest.file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    const bytes = readFileSync(target);
    provenance.push({
      id: selection.id,
      generator: 'pixellab',
      jobFile: `assets/jobs/${record.jobFile}`,
      requestId: record.request.id,
      endpoint: record.request.endpoint,
      seed: record.request.seed,
      backgroundJobId: receipt.background_job_id,
      returnedVariations: record.request.variations_from_single_request,
      selectedVariation: selection.variation,
      candidate: source.slice(root.length + 1).replaceAll('\\', '/'),
      target: `public/${manifest.file}`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      promptSha256: createHash('sha256').update(record.request.prompt).digest('hex'),
      accepted: true,
      review: selection.review,
    });
  }
  mkdirSync(dirname(provenancePath), { recursive: true });
  writeFileSync(provenancePath, `${JSON.stringify({
    version: 1,
    generatedBy: basename(import.meta.filename),
    generatedOn: '2026-08-09',
    entries: provenance,
  }, null, 2)}\n`);
  console.log(`promoted ${provenance.length} accepted PixelLab icons without resampling`);
} else {
  throw new Error('usage: tsx scripts/manageSpellSkillIcons.ts init|accept|promote');
}
