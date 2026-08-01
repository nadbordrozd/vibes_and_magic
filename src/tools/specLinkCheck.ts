import {
  existsSync, readFileSync, readdirSync, statSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const specRoot = resolve(root, 'docs/spec');

function markdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

function localTargets(markdown: string): string[] {
  const targets: string[] = [];
  const links = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(links)) {
    let target = match[1].trim();
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    target = target.split(/\s+["']/)[0].split('#')[0];
    if (!target || target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
    targets.push(decodeURIComponent(target));
  }
  return targets;
}

if (!existsSync(specRoot) || !statSync(specRoot).isDirectory()) {
  throw new Error('docs/spec is missing');
}

const failures: string[] = [];
for (const file of markdownFiles(specRoot)) {
  const markdown = readFileSync(file, 'utf8');
  for (const target of localTargets(markdown)) {
    const destination = resolve(dirname(file), target);
    if (!existsSync(destination)) {
      failures.push(`${relative(root, file)} -> ${target}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Broken spec links:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
}

console.log(`Spec links valid across ${markdownFiles(specRoot).length} Markdown files.`);
