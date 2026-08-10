import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGACY_MAP_FACTORIES } from '../src/content/maps/catalog';
import {
  EDITOR_CATALOG_HASH, hashEditorMapDocument,
  parseEditorMapDocument, serializeEditorMapDocument, validateEditorMapForPlay,
} from '../src/core/mapEditor';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export interface PromotionResult {
  id: string;
  mapHash: string;
  assetPath: string;
  checked: boolean;
}

function identifierFor(id: string): string {
  return `authored_${id.replace(/-([a-z0-9])/g,
    (_match, value: string) => value.toUpperCase())}Map`;
}

export function promoteMapFile(
  sourcePath: string,
  check = false,
  repositoryRoot = root,
): PromotionResult {
  const targetDirectory = join(repositoryRoot, 'src/content/maps/authored');
  const targetRegistry = join(targetDirectory, 'index.ts');
  const absoluteSource = resolve(sourcePath);
  const contents = readFileSync(absoluteSource, 'utf8');
  const parsed = parseEditorMapDocument(contents);
  if (!parsed.document) throw new Error(
    `Promotion refused: ${parsed.diagnostics.map((item) => `${item.code}: ${item.message}`).join('; ')}`,
  );
  const document = parsed.document;
  const diagnostics = validateEditorMapForPlay(document).filter((item) => item.severity === 'error');
  if (diagnostics.length) throw new Error(
    `Promotion refused: ${diagnostics.map((item) => `${item.code}: ${item.message}`).join('; ')}`,
  );
  if (document.compatibility.catalogHash !== EDITOR_CATALOG_HASH) throw new Error(
    `Promotion refused: catalog hash ${document.compatibility.catalogHash} does not match ${EDITOR_CATALOG_HASH}.`,
  );
  const canonical = serializeEditorMapDocument(document);
  if (contents !== canonical) throw new Error(
    'Promotion refused: the file is not the unchanged canonical output of Export map.',
  );
  if (Object.hasOwn(LEGACY_MAP_FACTORIES, document.id)) throw new Error(
    `Promotion refused: built-in map ID "${document.id}" already exists.`,
  );

  const filename = `${document.id}.vam-map.json`;
  const assetPath = join(targetDirectory, filename);
  const registry = readFileSync(targetRegistry, 'utf8');
  const identifier = identifierFor(document.id);
  const importLine = `import ${identifier} from './${filename}';`;
  const entryLine = `  { id: '${document.id}', document: ${identifier} },`;
  const registered = registry.includes(importLine) && registry.includes(entryLine);
  const assetMatches = existsSync(assetPath) && readFileSync(assetPath, 'utf8') === contents;

  if (check) {
    if (!registered || !assetMatches) throw new Error(
      `Promotion check failed: ${document.id} is not registered with identical portable bytes.`,
    );
  } else {
    if (registered || existsSync(assetPath)) throw new Error(
      `Promotion refused: authored map ID or asset "${document.id}" already exists; use --check to verify it.`,
    );
    const nextRegistry = registry
      .replace('// PROMOTED_MAP_IMPORTS', `${importLine}\n// PROMOTED_MAP_IMPORTS`)
      .replace('  // PROMOTED_MAP_ENTRIES', `${entryLine}\n  // PROMOTED_MAP_ENTRIES`);
    if (nextRegistry === registry) throw new Error('Promotion registry markers are missing.');
    writeFileSync(assetPath, contents, 'utf8');
    writeFileSync(targetRegistry, nextRegistry, 'utf8');
  }
  return {
    id: document.id,
    mapHash: hashEditorMapDocument(document),
    assetPath: `src/content/maps/authored/${basename(assetPath)}`,
    checked: check,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const source = args.find((arg) => arg !== '--check');
  if (!source) {
    console.error('Usage: npm run promote-map -- <export.vam-map.json> [--check]');
    process.exit(2);
  }
  try {
    const result = promoteMapFile(source, check);
    console.log(`${check ? 'Verified' : 'Promoted'} ${result.id} (${result.mapHash}) at ${result.assetPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
