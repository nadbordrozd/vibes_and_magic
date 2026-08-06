import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

interface Inventory {
  local_only_paths: string[];
  known_sha256: string[];
  original_replacement_jobs: string[];
}

const root = process.cwd();
const inventory = JSON.parse(readFileSync(
  resolve(root, 'assets/provenance/homm2-image-inventory.json'), 'utf8',
)) as Inventory;
const errors: string[] = [];
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff']);

function git(args: string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result.stdout;
}

function globExpression(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]*');
  return new RegExp(`^${escaped}$`);
}

const allFiles = git(['ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean);
for (const pattern of inventory.local_only_paths) {
  const matcher = globExpression(pattern);
  const localMatches = git(['ls-files', '-co', '-z']).split('\0').filter((path) => matcher.test(path));
  for (const path of localMatches) {
    const ignored = spawnSync('git', ['check-ignore', '-q', '--', path], { cwd: root }).status === 0;
    if (!ignored) errors.push(`${path}: local-only HoMM2 image provenance is not gitignored`);
  }
}

const knownHashes = new Set(inventory.known_sha256);
for (const path of allFiles) {
  if (!imageExtensions.has(extname(path).toLowerCase())) continue;
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) continue;
  const digest = createHash('sha256').update(readFileSync(absolute)).digest('hex');
  if (knownHashes.has(digest)) errors.push(`${path}: matches a known HoMM2 source, direct derivative, or stale screenshot`);
}

for (const path of inventory.original_replacement_jobs) {
  if (!existsSync(resolve(root, path))) errors.push(`${path}: original replacement job is missing`);
}

const runtimeFiles = allFiles.filter((path) => path.startsWith('src/')
  && ['.ts', '.tsx', '.js', '.mjs'].includes(extname(path)));
for (const path of runtimeFiles) {
  const source = readFileSync(resolve(root, path), 'utf8');
  if (/h2-(?:placeholder|transition)|docs\/(?:h2|homm2)|assets\/guides\/[^'"\n]*h2/i.test(source)) {
    errors.push(`${path}: runtime, test, or review code reads an ignored HoMM2 image path`);
  }
}

console.log(`HoMM2 asset boundary: ${allFiles.filter((path) => imageExtensions.has(extname(path).toLowerCase())).length} non-ignored images scanned · ${inventory.known_sha256.length} known fingerprints`);
if (errors.length) {
  console.error('\nHoMM2 asset boundary failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
}
