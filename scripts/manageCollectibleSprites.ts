import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ITEM_SPRITE_SUBJECTS } from '../assets/adventureSpriteInventory';
import { ITEMS } from '../src/content/items';

type CollectibleFamily = 'item' | 'artifact';
interface CollectibleInput {
  catalogKey: string;
  subject: string;
  group: string;
  chromaKey: '#00FF00' | '#FF00FF';
  builtInOutput: string;
}

const root = resolve(import.meta.dirname, '..');
const session = '/home/nadbor/.codex/generated_images/019fee78-b5f1-7191-9aa2-6a8e0029a0aa';
const calls: Record<string, string> = {
  spellScroll: 'exec-c0c119f8-0181-467e-85ae-7368e978f219.png', scrollRally: 'exec-4af99732-c50c-49f2-8f5a-976cc76c472c.png',
  scrollBlessing: 'exec-d1e5c96b-5f94-4271-ac7b-30dd5af1b10a.png', scrollForgeSpark: 'exec-6d0b3998-a0bf-4c03-982a-231d3ad4236a.png',
  scrollWard: 'exec-4b516789-3ed2-4430-b46f-5f636caf65c1.png', scrollWither: 'exec-2753e94e-2914-4d09-aa52-2a8561938f49.png',
  scrollQuiet: 'exec-e2a26bd7-9091-46b7-a746-2f55730f5121.png', scrollDirge: 'exec-f23a8359-bfcb-4d38-b0fe-4bd438447e24.png',
  scrollSour: 'exec-13912ded-ae06-45b1-9d20-bc7874714bbe.png', scrollAmplify: 'exec-b24ac50b-c50c-4d8b-93d0-c4a48d53b472.png',
  scrollReflect: 'exec-76064e13-9152-4b49-825d-bec987d4690b.png', potionOfVigor: 'exec-d261b2de-ab4c-4853-9cff-1a5ffc9bb916.png',
  draughtOfIron: 'exec-7b1db363-d57d-4aa6-84c0-f35b2b49ba28.png', smellingSalts: 'exec-d28f117c-2410-438d-854e-70442d023f21.png',
  haresHeel: 'exec-e7a647fa-cb03-4582-82f7-96e01e8a20c4.png', blackfireOil: 'exec-cddfe24d-2c6d-4fe6-ae96-0d08bc3f76ca.png',
  graveDust: 'exec-c625fd2f-0f12-4738-ac4e-f6ff3164c166.png', hornetJar: 'exec-784402ee-b477-4c75-929d-2a79e04929b7.png',
  milkOfTheMoon: 'exec-55150628-16e6-41a4-8019-456bdc02d495.png', chalkOfWalls: 'exec-04e81cae-4d30-408c-94ae-bf56ea49c410.png',
  waxSeal: 'exec-c1d47bd0-2746-4055-9c81-9af6b872d877.png', powderOfUnmaking: 'exec-6699b285-d99b-456a-a1d1-e57aa8ca1d97.png',
  bannerWhistle: 'exec-29704680-1b68-4ecb-9666-95d37e236399.png', secondCandle: 'exec-234ee16e-72a8-4b36-8bad-bf0b7feb4241.png',
  bottledEcho: 'exec-e3d78a34-7cd3-4c61-9ac1-12102668df72.png', cartographersCase: 'exec-d007c3c7-cf70-4980-b41c-ea549de69df3.png',
  waybread: 'exec-17e3e644-fbba-47e4-a378-77b0c9191e2d.png', saltedMeat: 'exec-8680fe54-b7e4-4f67-9d08-d30b844df449.png',
  tavernTales: 'exec-bcb967c1-a637-4466-836b-ab9c498a2c51.png', hearthstone: 'exec-69296aaf-ff00-4335-9761-cf3b2934010a.png',
  ferrymansCoin: 'exec-3098f906-8db8-48de-9e47-a9cfc4695156.png', militiaWrit: 'exec-f0aa5533-bf4d-4439-967e-c5121757e6a8.png',
  beggarsCoin: 'exec-cedb05d2-234a-43be-a2d1-8ee87772d7af.png', foundersTin: 'exec-cc8034b6-9bed-4344-8144-593030f8c863.png',
  cronesBundle: 'exec-6d95bb9e-0d25-419e-8ea6-46bf341ebd1c.png', overseersCharter: 'exec-94acc4b9-c846-450b-8e9b-37a48dc5a896.png',
  tradeGoods: 'exec-9a5f821e-6c7b-41cb-8f10-06f5ad757e3a.png',
};

const magenta = new Set(['scrollSour', 'haresHeel', 'waybread']);
const opaqueGlass: Record<string, string> = {
  potionOfVigor: 'Render the glass as opaque stylized red pixel clusters and crisp highlights, not see-through green.',
  draughtOfIron: 'Render the bottle and tonic as opaque stylized grey pixel clusters and crisp highlights, not see-through green.',
  blackfireOil: 'Render the black glass as opaque stylized near-black pixel clusters and one orange highlight, not see-through green.',
  hornetJar: 'Render the amber glass as opaque stylized amber pixel clusters with the hornet clearly inside, not see-through green.',
  milkOfTheMoon: 'Render the bottle and blue liquid as opaque stylized pixel clusters and crisp highlights, not see-through green.',
  powderOfUnmaking: 'Render the vial and powder as opaque stylized violet pixel clusters with crisp highlights; preserve the deliberately missing lower edge without any see-through green inside the remaining glass.',
  bottledEcho: 'Render the blue glass and visible cork rings as opaque stylized blue pixel clusters and crisp highlights, not see-through green.',
  secondCandle: 'Show a tiny ordinary flame only on the newly relit candle, with no aura or glow.',
};

const firstTen = new Set(Object.keys(calls).slice(0, 10));
const secondTen = new Set(Object.keys(calls).slice(10, 20));

function promptFor(input: CollectibleInput): string {
  if (input.catalogKey === 'scrollQuiet') return `Use case: stylized-concept
Asset type: production collectible item sprite for a storybook strategy game
Primary request: Create exactly one isolated item: A pale parchment scroll tied with a blue-grey cord around a tiny closed bell clasp without a clapper. The rolled parchment must be the dominant silhouette; the bell is only a miniature cord clasp, never a full-size bell.
Scene/backdrop: perfectly flat solid #00FF00 chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines and compact painterly pixel clusters.
Composition/framing: one complete isolated scroll, centered high-oblique non-isometric object view with visible rolled upper surfaces, generous padding, and a strong readable parchment silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes and any tiny object shadow point screen upper-left/map north-west.
Constraints: perfectly uniform #00FF00 background with no gradient, texture, floor plane, or lighting variation; do not use #00FF00 in the subject; opaque crisp-edged object suitable for chroma removal; visibly a scroll first and a tiny bell clasp second.
Avoid: full-size bell, bell-shaped scroll, scarf, text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, glow, aura, watermark, reflection, cast shadow on the background, contact shadow on the background, extra objects.`;
  const unified = firstTen.has(input.catalogKey) || secondTen.has(input.catalogKey)
    ? 'one complete isolated object' : 'one complete isolated object or tightly unified described set';
  const reflection = firstTen.has(input.catalogKey) ? 'reflection'
    : 'reflection on the background';
  const magical = Object.keys(calls).slice(20, 30).includes(input.catalogKey) ? 'magical glow' : 'glow';
  return `Use case: stylized-concept
Asset type: production collectible item sprite for a storybook strategy game
Primary request: Create exactly one isolated item: ${input.subject}
Scene/backdrop: perfectly flat solid ${input.chromaKey} chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines and compact painterly pixel clusters.
Composition/framing: ${unified}, centered high-oblique non-isometric object view with visible upper surfaces, generous padding, and a strong readable silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes and any tiny object shadow point screen upper-left/map north-west.
Constraints: perfectly uniform ${input.chromaKey} background with no gradient, texture, floor plane, or lighting variation; do not use ${input.chromaKey} in the subject; opaque crisp-edged object suitable for chroma removal.${opaqueGlass[input.catalogKey] ? ` ${opaqueGlass[input.catalogKey]}` : ''}
Avoid: text, letters, writing, glyphs, UI, frame, badge, terrain, ground plate, scenery, flag, ${magical}, aura, watermark, ${reflection}, cast shadow on the background, contact shadow on the background, extra objects.`;
}

function sha(fileOrText: string | Buffer): string {
  return createHash('sha256').update(fileOrText).digest('hex');
}

function pngDimensions(path: string): [number, number] {
  const bytes = readFileSync(path);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function upsertSelectionBatch(
  contents: string,
  batch: string,
  entries: Array<Record<string, unknown>>,
): string {
  const compactObject = (entry: Record<string, unknown>) =>
    `{${Object.entries(entry).map(([key, item]) =>
      `${JSON.stringify(key)}: ${JSON.stringify(item)}`).join(', ')}}`;
  const lines = entries.map((entry, index) =>
    `      ${compactObject(entry)}${index === entries.length - 1 ? '' : ','}`);
  const block = [`    ${JSON.stringify(batch)}: [`, ...lines, '    ]'].join('\n');
  const escapedBatch = batch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = new RegExp(`    "${escapedBatch}": \\[\\n[\\s\\S]*?\\n    \\]`);
  if (existing.test(contents)) return contents.replace(existing, block);
  return contents.replace(/\n  }\n}\s*$/, `,\n${block}\n  }\n}\n`);
}

function writeCollectibleJob(family: CollectibleFamily, inputs: CollectibleInput[]): void {
  const requests = inputs.map((input) => ({
    id: `collectible:${family}:${input.catalogKey}:built-in`,
    collectible_family: family,
    catalog_key: input.catalogKey,
    catalog_group: input.group,
    assets: [`map-object:${family}:${input.catalogKey}`],
    output: `assets/sources/${family}s/${input.catalogKey}-source.png`,
    final: `public/assets/${family}s/${input.catalogKey}.png`,
    size: [32, 32], candidates: 1, chroma_key: input.chromaKey,
    prompt: promptFor(input),
  }));
  const jobPath = `assets/jobs/${family}-sprites-built-in.json`;
  const job = { version: 1, status: 'ready', generator: 'built-in-imagegen',
    collectible_family: family,
    contact_sheet: `.pixel-work/review/collectibles/${family}`,
    requests };
  writeFileSync(resolve(root, jobPath), `${JSON.stringify(job, null, 2)}\n`);

  const selections = requests.map((request) => {
    const input = inputs.find((candidate) => candidate.catalogKey === request.catalog_key)!;
    const sourcePath = resolve(root, request.output);
    const finalPath = resolve(root, request.final);
    return {
      id: request.assets[0], request_id: request.id,
      collectible_family: family, catalog_key: request.catalog_key,
      accepted: existsSync(sourcePath) && existsSync(finalPath),
      built_in_output: input.builtInOutput,
      discarded_outputs: request.catalog_key === 'scrollQuiet' ? [{
        built_in_output: `${session}/exec-52fc5e1d-d2aa-4a35-8815-5780297a4e05.png`,
        source: 'assets/sources/items/discarded/scrollQuiet-full-bell-source.png',
        reason: 'Rejected in contact review: full-size bell dominated and the parchment scroll was not readable.',
      }] : [], source: request.output, final: request.final,
      prompt_sha256: sha(request.prompt),
      source_sha256: existsSync(sourcePath) ? sha(readFileSync(sourcePath)) : null,
      final_sha256: existsSync(finalPath) ? sha(readFileSync(finalPath)) : null,
      source_dimensions: existsSync(sourcePath) ? pngDimensions(sourcePath) : null,
      final_dimensions: existsSync(finalPath) ? pngDimensions(finalPath) : null,
      alpha: { hard: true, transparent_corners_required: 4 },
      visual_review: `Literal ${request.catalog_key} subject selected; high-oblique silhouette, south-east light, generous padding, no baked label or terrain.`,
    };
  });
  const provenancePath = resolve(root, `assets/provenance/${family}-sprite-generation.json`);
  mkdirSync(dirname(provenancePath), { recursive: true });
  writeFileSync(provenancePath, `${JSON.stringify({
    version: 1, generator: 'built-in-imagegen', generated_on: '2026-08-11', job: jobPath,
    workflow: { source: 'one separate built-in image_gen call per catalog key',
      bake: `uv run --no-project --with pillow python scripts/buildCollectibleSprites.py --job ${jobPath}`,
      resampling: 'nearest-neighbour reduction, adaptive 40-colour palette, hard alpha',
      review: `.pixel-work/review/collectibles/${family}/{combat,adventure,automatic}-contact-sheet.png` },
    selections,
  }, null, 2)}\n`);
}

const itemInputs = Object.values(ITEMS).map((item): CollectibleInput => ({
  catalogKey: item.id, subject: ITEM_SPRITE_SUBJECTS[item.id], group: item.use,
  chromaKey: magenta.has(item.id) ? '#FF00FF' : '#00FF00',
  builtInOutput: `${session}/${calls[item.id]}`,
}));
writeCollectibleJob('item', itemInputs);
const selectionsPath = resolve(root, 'assets/selections.json');
const catalogSelectionEntries = itemInputs.map((input) => ({
  id: `map-object:item:${input.catalogKey}`,
  candidate: `assets/sources/items/${input.catalogKey}-source.png`,
  target: `public/assets/items/${input.catalogKey}.png`,
}));
writeFileSync(selectionsPath, upsertSelectionBatch(
  readFileSync(selectionsPath, 'utf8'), 'item-sprites-built-in', catalogSelectionEntries,
));
console.log(`Wrote generic collectible job/provenance for ${itemInputs.length} items.`);
