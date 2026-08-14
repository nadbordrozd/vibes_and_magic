import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { V2_NATIVE_ASSET_WORKLIST } from '../assets/v2NativeAssets';
import { V2_NATIVE_OUTPUT_SELECTIONS } from '../assets/v2NativeOutputSelections';

const FAMILY_STYLE: Record<string, string> = {
  spell: 'compact hand-painted dark medieval tabletop spell icon',
  lexicon: 'compact hand-painted physical rules-effect token',
  skill: 'compact hand-painted heraldic secondary-skill icon',
  knack: 'compact hand-painted faction-knack emblem',
  'battle-creature': 'complete high-oblique dark-fantasy battle company',
  'guardian-creature': 'complete high-oblique dark-fantasy adventure guardian company',
  dwelling: 'complete high-oblique dark-fantasy field dwelling',
  artifact: 'compact dark-fantasy artifact pickup', item: 'compact dark-fantasy item pickup',
  site: 'complete high-oblique dark-fantasy adventure acquisition site',
};

const selected = V2_NATIVE_ASSET_WORKLIST.filter((item) => V2_NATIVE_OUTPUT_SELECTIONS[item.runtimeAssetId]);
const requests = selected.map((item) => {
  const selection = V2_NATIVE_OUTPUT_SELECTIONS[item.runtimeAssetId];
  const keyName = item.chromaKey === '#00ff00' ? 'green' : 'magenta';
  return {
    id: item.runtimeAssetId, native_asset_id: item.nativeAssetId,
    canonical_id: item.canonicalId, family: item.family,
    accessible_name: item.accessibleName, literal_subject: item.literalSubject,
    prompt: `Create one ${FAMILY_STYLE[item.family]} showing exactly ${item.literalSubject}. `
      + `Transparent-ready isolated subject on a flat solid pure ${keyName} chroma-key background ${item.chromaKey}; `
      + 'no frame, border, UI, logo, watermark, letters, numbers, or readable text.',
    selected_output: selection.output,
    discarded_outputs: (selection.discarded ?? []).map((entry) => ({ ...entry,
      prompt: 'Retained rejected built-in attempt; see review reason and selected replacement prompt.' })),
    provider_source: `assets/sources/docs-60-67/provider/${item.runtimeAssetId.replace(/[^A-Za-z0-9_-]+/g, '-')}.png`,
    source: item.source, file: item.file, w: item.w, h: item.h,
    chroma_key: item.chromaKey, review: selection.review,
  };
});

const groups = new Map<string, typeof requests>();
for (const row of requests) {
  const rows = groups.get(row.family) ?? [];
  rows.push(row); groups.set(row.family, rows);
}
let index = 1;
for (const [family, rows] of groups) {
  writeFileSync(resolve(`assets/jobs/docs-60-67-native-${String(index).padStart(2, '0')}-${family}-built-in.json`),
    `${JSON.stringify({ version: 1, status: 'ready', generator: 'built-in-imagegen',
      contract: 'one distinct accepted built-in generation call and retained immutable provider source per runtime asset ID',
      requests: rows }, null, 2)}\n`);
  index += 1;
}
console.log(`wrote ${requests.length} selected requests across ${groups.size} family jobs`);
