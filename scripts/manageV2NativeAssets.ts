import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { V2_NATIVE_ASSET_WORKLIST } from '../assets/v2NativeAssets';
import { V2_NATIVE_OUTPUT_SELECTIONS } from '../assets/v2NativeOutputSelections';
import { ASSET_MANIFEST } from '../assets/manifest';
import { CONTENT_ICON_MANIFEST, SPELL_EFFECT_ICON_MANIFEST } from '../assets/iconManifest';

interface RequestRecord {
  id: string;
  native_asset_id: string;
  canonical_id: string;
  family: string;
  accessible_name: string;
  literal_subject: string;
  prompt: string;
  selected_output: string;
  discarded_outputs: Array<{ output: string; prompt: string; reason: string }>;
  provider_source: string;
  source: string;
  file: string;
  w: number;
  h: number;
  chroma_key: string;
  review: string;
  job?: string;
}

const root = process.cwd();
const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

function requests(): RequestRecord[] {
  const files = readdirSync(resolve(root, 'assets/jobs'))
    .filter((file) => /^docs-60-67-native-\d+(?:-[a-z-]+)?-built-in\.json$/.test(file)).sort();
  return files.flatMap((file) => {
    const path = `assets/jobs/${file}`;
    const job = JSON.parse(readFileSync(resolve(root, path), 'utf8')) as {
      status: string; generator: string; requests: RequestRecord[];
    };
    if (job.status !== 'ready' || job.generator !== 'built-in-imagegen') {
      throw new Error(`${path}: expected ready built-in-imagegen job`);
    }
    return job.requests.map((request) => ({ ...request, job: path }));
  });
}

function validate(rows: RequestRecord[], release = false): void {
  const expected = new Map(V2_NATIVE_ASSET_WORKLIST.map((item) => [item.runtimeAssetId, item]));
  if (!rows.length) throw new Error('Expected one or more records');
  for (const row of rows) {
    const item = expected.get(row.id);
    if (!item) throw new Error(`${row.id}: noncanonical native request`);
    expected.delete(row.id);
    for (const [actual, wanted, field] of [
      [row.native_asset_id, item.nativeAssetId, 'native asset ID'],
      [row.canonical_id, item.canonicalId, 'canonical ID'],
      [row.literal_subject, item.literalSubject, 'literal subject'],
      [row.accessible_name, item.accessibleName, 'accessible name'],
      [row.source, item.source, 'source path'], [row.file, item.file, 'final path'],
      [row.w, item.w, 'width'], [row.h, item.h, 'height'],
      [row.chroma_key.toLowerCase(), item.chromaKey, 'chroma key'],
    ] as const) if (actual !== wanted) throw new Error(`${row.id}: ${field} drift`);
    if (!row.prompt.includes(item.literalSubject)
        || !row.prompt.includes('flat solid') || !row.prompt.includes('chroma-key')
        || !row.prompt.includes('no frame') || !row.prompt.includes('text')) {
      throw new Error(`${row.id}: prompt contract/subject drift`);
    }
    if (!row.selected_output.startsWith('/home/nadbor/.codex/generated_images/')
        || !row.review.trim()) throw new Error(`${row.id}: missing selected output/review`);
  }
  if (release) {
    if (rows.length !== 192 || expected.size || Object.keys(V2_NATIVE_OUTPUT_SELECTIONS).length !== 192) {
      throw new Error(`Release needs exactly 192 canonical jobs/selections; jobs=${rows.length}, missing=${expected.size}, selections=${Object.keys(V2_NATIVE_OUTPUT_SELECTIONS).length}`);
    }
    for (const field of ['selected_output', 'provider_source', 'source', 'file'] as const) {
      if (new Set(rows.map((row) => row[field])).size !== 192) {
        throw new Error(`Release ${field} values must be unique per canonical ID`);
      }
    }
  }
}

const command = process.argv[2];
const rows = requests();
validate(rows, command === 'release');

if (command === 'records') {
  writeFileSync(resolve(root, 'assets/v2NativeSelections.json'), `${JSON.stringify({
    version: 1,
    contract: 'One distinct accepted built-in generation call, retained provider source, installed-helper alpha source, and unique exact native final per docs-60–67 runtime asset ID.',
    entries: rows.map((row) => ({ id: row.id, nativeAssetId: row.native_asset_id,
      source: row.source, file: row.file, accepted: true, review: row.review })),
  }, null, 2)}\n`);
  console.log(`wrote ${rows.length} docs-60–67 accepted selections`);
} else if (command === 'provenance') {
  const selections = rows.map((row) => {
    const provider = resolve(root, row.provider_source);
    const source = resolve(root, row.source);
    const final = resolve(root, 'public', row.file);
    for (const [label, path] of [['provider', provider], ['source', source], ['final', final]] as const) {
      if (!existsSync(path)) throw new Error(`${row.id}: missing ${label} ${path}`);
    }
    return {
      id: row.id, native_asset_id: row.native_asset_id, canonical_id: row.canonical_id,
      family: row.family, accepted: true, job: row.job, generator: 'built-in-imagegen',
      built_in_output: row.selected_output, discarded_outputs: row.discarded_outputs,
      provider_source: row.provider_source, source: row.source, final: `public/${row.file}`,
      literal_subject: row.literal_subject, accessible_name: row.accessible_name,
      prompt: row.prompt, prompt_sha256: sha(row.prompt),
      provider_sha256: sha(readFileSync(provider)), source_sha256: sha(readFileSync(source)),
      final_sha256: sha(readFileSync(final)), final_dimensions: [row.w, row.h],
      chroma_key: row.chroma_key,
      bake: 'built-in output copied to retained provider source; installed remove_chroma_key helper with explicit key, soft matte 12/220 and despill; browser-canvas crop; nearest fit; alpha>=128 hard bake; exact native canvas',
      review: row.review,
    };
  });
  writeFileSync(resolve(root, 'assets/provenance/docs-60-67-native-generation.json'),
    `${JSON.stringify({ version: 1, generator: 'built-in-imagegen', generated_on: '2026-08-13',
      jobs: [...new Set(rows.map((row) => row.job))], selections }, null, 2)}\n`);
  console.log(`wrote ${selections.length} exact docs-60–67 provenance records`);
} else if (command === 'release') {
  const provenance = JSON.parse(readFileSync(resolve(root,
    'assets/provenance/docs-60-67-native-generation.json'), 'utf8')) as {
    generator: string; selections: Array<{
      id: string; accepted: boolean; provider_sha256: string; source_sha256: string;
      final_sha256: string; final: string;
    }>;
  };
  if (provenance.generator !== 'built-in-imagegen' || provenance.selections.length !== 192
      || provenance.selections.some((row) => !row.accepted)) {
    throw new Error('Release provenance must contain exactly 192 accepted built-in selections');
  }
  for (const field of ['provider_sha256', 'source_sha256', 'final_sha256'] as const) {
    if (new Set(provenance.selections.map((row) => row[field])).size !== 192) {
      throw new Error(`Release ${field} values must be globally unique across the 192 new assets`);
    }
  }
  const shipped = [
    ...Object.entries(ASSET_MANIFEST).map(([id, entry]) => ({ id, ...entry })),
    ...Object.entries(CONTENT_ICON_MANIFEST).map(([id, entry]) => ({ id, ...entry })),
    ...Object.entries(SPELL_EFFECT_ICON_MANIFEST).map(([id, entry]) => ({
      id: `spell-effect-icon:${id}`, ...entry,
    })),
  ];
  const owners = new Map<string, { id: string; file: string }>();
  const aliases: string[] = [];
  for (const entry of shipped) {
    const bytes = readFileSync(resolve(root, 'public', entry.file));
    const fingerprint = sha(bytes); const prior = owners.get(fingerprint);
    if (prior && !('aliasOf' in entry && entry.aliasOf === prior.id)) {
      throw new Error(`Shipped native bytes are shared without an explicit alias: ${prior.id}/${entry.id}`);
    }
    if (prior) aliases.push(`${entry.id}->${prior.id}`);
    if (!prior) owners.set(fingerprint, { id: entry.id, file: entry.file });
  }
  const expectedAliases = [
    'castle:hearthguard:freeTown->castle:hearthguard:castle',
    'castle:unfinished:hollowTown->castle:unfinished:castle',
    'castle:vespiary:coastal->castle:vespiary:castle',
    'castle:woundWrights:oldSeat->castle:woundWrights:castle',
  ];
  if (JSON.stringify(aliases.sort()) !== JSON.stringify(expectedAliases.sort())) {
    throw new Error(`Release alias set drift: ${aliases.join(', ')}`);
  }
  console.log(`release native assets passed: 192/192 jobs + provenance; ${shipped.length} shipped manifest entries, ${owners.size} unique bytes, ${shipped.length - owners.size} explicit aliases`);
} else {
  throw new Error('usage: tsx scripts/manageV2NativeAssets.ts records|provenance|release');
}
