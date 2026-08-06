import {
  copyFileSync, mkdirSync, readFileSync, statSync,
} from 'node:fs';
import {
  dirname, isAbsolute, relative, resolve,
} from 'node:path';
import { assetWorklist } from '../assets/worklist';

interface Selection {
  id: string;
  candidate: string;
  target: string;
  review_only?: boolean;
  w?: number;
  h?: number;
}

interface SelectionLedger {
  version: number;
  batches: Record<string, Selection[]>;
}

const root = resolve(import.meta.dirname, '..');
const ledger = JSON.parse(
  readFileSync(resolve(root, 'assets/selections.json'), 'utf8'),
) as SelectionLedger;
const requested = process.argv.slice(2);
const batches = requested.length ? requested : Object.keys(ledger.batches);
const worklist = new Map(assetWorklist().map((item) => [item.id, item]));

function below(prefix: string, value: string): string {
  const path = resolve(root, value);
  const boundary = resolve(root, prefix);
  const relation = relative(boundary, path);
  if (!relation || relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error(`${value} must stay below ${prefix}/`);
  }
  return path;
}

function pngSize(path: string): { w: number; h: number } {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`${path}: invalid PNG`);
  }
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

if (ledger.version !== 1) throw new Error('assets/selections.json must be version 1');
for (const batch of batches) {
  const selections = ledger.batches[batch];
  if (!selections) throw new Error(`unknown selection batch ${batch}`);
  for (const selection of selections) {
    const item = worklist.get(selection.id);
    if (!selection.review_only && !item) {
      throw new Error(`${selection.id}: not in the data-derived worklist`);
    }
    if (selection.review_only && (!selection.id.startsWith('review:')
        || !selection.w || !selection.h)) {
      throw new Error(`${selection.id}: review selection requires review id and dimensions`);
    }
    const source = below('.pixel-work/pixelgen', selection.candidate);
    const target = below('public/assets', selection.target);
    if (!statSync(source).isFile()) throw new Error(`${selection.id}: candidate is not a file`);
    const { w, h } = pngSize(source);
    const expectedW = selection.review_only ? selection.w! : item!.w;
    const expectedH = selection.review_only ? selection.h! : item!.h;
    if (selection.review_only ? w !== expectedW || h !== expectedH
      : item!.groundContact ? w < expectedW || h < expectedH
        : w !== expectedW || h !== expectedH) {
      throw new Error(`${selection.id}: candidate ${w}x${h} does not cover ${expectedW}x${expectedH}`);
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    console.log(`ok ${selection.id} ${w}x${h} -> ${selection.target}`);
  }
}
