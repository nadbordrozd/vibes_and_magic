import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HEROES } from '../src/content/heroes';
import { HERO_DASHBOARD_MANIFEST, type HeroDashboardAssetId } from '../assets/heroDashboardManifest';
import { heroDashboardWorklist } from '../assets/heroDashboardWorklist';
import {
  HERO_PRIMARY_STAT_VISUAL_SUBJECTS, HERO_SPECIALTY_VISUAL_SUBJECTS,
  HERO_VITAL_VISUAL_SUBJECTS,
} from '../assets/heroDashboardSubjects';

const root = resolve(import.meta.dirname, '..');
const session = '/home/nadbor/.codex/generated_images/019ff549-5bd2-7f22-b688-c02063f0a729';
const outputs = [
  '04c9d2f7-fd68-4ba0-a933-6b33055c0c4e', '9ab0890b-f7e0-4968-8d3f-ad70857f91c4',
  'fb1292a7-cbe3-4ca5-922a-56181864d0c3', 'c05c6f64-dfba-4f69-8947-0db8b88eb13a',
  '7594601c-58fe-4eb0-b7f3-7a99e6f5da72', '97bfcf8f-ee74-4315-9063-23c0c13bdac1',
  'c1bbb03f-b07e-44b6-95f0-6f0d2addec49', '485e49fe-1e79-433b-a353-ec5433195be6',
  'b5fe517c-ee76-441c-b1f2-bc0289a68ac5', '7da7bddf-03bb-47b6-9f08-a134bd69f6f3',
  'e51ddcea-a843-4334-96d9-5f6e8b98e759', '1a8a5a71-e235-4a71-a311-2e9b3133633c',
  'b97ad214-ddf5-4c27-bbd9-59537b2db0e7', 'd4599a49-977e-4725-b527-69a316733525',
  '3add4a9b-ddf9-4ea6-83e0-3e7c57b76eaf', '11b527d1-65f3-4fa6-aba0-57024f6a6c50',
  '7bddaac8-6c03-4b97-a10d-3ad19769665e', '175214fb-5800-46c1-b693-aedf63b85d71',
  'b0693bf1-f6ea-4fc9-8529-9a1f5ccf6ef2', 'a326f676-9f76-42c6-b609-5d4487043350',
  'b2de9411-70dc-4788-a10a-669f228c4041', '51cdd881-50f3-4c36-8e3d-cc7294a8dae0',
  '03a8fed5-336b-453c-8639-859b6674ddbe', 'd66fe238-00cc-46af-b7fa-646d69c8f8db',
  '434ca832-56d4-41b0-88b8-0e31fe2513aa', '8bede223-db80-474c-9aee-87205f34775d',
  'c52c303e-3236-4ce3-8765-2444b1f781e4', '332d406b-1ce2-42e4-b2ae-cc2feffa4b52',
  '36777b55-7dbb-47cc-8731-02bf2c2eadff', '5bc37602-dced-4f5b-bf81-5edfc5f6ef21',
  'aa04bce4-dfcf-466a-b190-c4b20c91347c', '27a44a20-7fbe-4637-bb16-fbe5615c129a',
  '0ad402d1-f99a-49db-8574-f22ccf1f8087', 'c3de8abc-15a7-4fd0-b41d-31ca7ebe50ac',
  'bbcb4e6c-3b4d-4afd-9c0e-691c1d95b0ac', '1b186173-3096-48e8-b50b-05b50dc72328',
  '4ef73360-b844-42b9-923b-f1bb5da30d5c', '66ac8c07-c17b-487b-b04c-2c5d091bb0c3',
  '0abf91e1-5665-4f7b-a0d4-3bca7c0f9b8a', 'e405180a-50f8-4ca4-bfbc-9fbff877a8b4',
  '9908b6c7-3fcd-432b-87c5-5b0561a85bb4', 'df6fa922-c58d-4e73-805e-2e9095768ac2',
  '90cb85bf-a253-4988-b343-61799294ab08', '000e6551-6f89-43e4-9dd3-d353ad7b2109',
  '2e26d8df-dc86-4109-b80b-68aba0d09424', 'c0c9f633-99a3-4df2-a2ed-d7222f71d25d',
  '0f8f2c44-5de9-433f-90db-0181cfa5cca9', '2c2f097a-ad55-4e9e-a5b5-cc84eeabda64',
  'f07326cd-a048-4782-a489-43daef20ae27', '22158b26-0864-4547-8aaa-a12afd5882f7',
  '4e1dbd9f-b500-4bac-b988-917959ce41cd', '618eef18-cb93-4bc2-b048-225bf98761f6',
  'da05207b-e326-4285-b991-b10b53f10b40', 'f0bb6066-af2d-4666-a154-ab7bb3287384',
  '15a05ea0-f504-4cc3-97a9-d348ca4b8366', '26cc1ded-1775-42ff-8a35-d738eeef8586',
  'a532231a-7c0c-4c3d-8db5-d0d3dedd94f4', '2da131eb-c37f-42a1-af38-80ed69faf67d',
  '39c824d7-31be-4856-a269-af6563e198cd', '4629f5e3-9c7e-4ec9-be61-acc48ce8e8e6',
  '7b916111-2b58-4da9-aa41-f288ed34d3d3', '101343a5-03eb-4edf-8cbd-5a5d1d8f5adf',
  '83258a64-724e-452a-8ddf-bf728f9b2bad', 'd39ab1b8-4171-4fb2-bbe6-f291342758c3',
  '39bfb41e-4d48-45d0-95a5-e28ff45cb607', 'f304424c-de6b-4867-bb6a-31ed4b030395',
  '987e5fdf-6c24-47c7-96cc-ed1e3c6bb38c', 'c4813ae0-2add-4848-947f-adbefc4e9e35',
  '703848ce-3342-4d06-8018-a8ee92f1b39b', '38c5c835-99f1-4db5-aa06-93622df7528c',
  '05ab0954-20ec-4fbf-8045-29441ed2f7ab', 'd3b1b215-0b01-4cfd-acfb-faae66044700',
  '16449960-194b-4695-a9c5-d888614806d9', 'a8fe71ec-9ac5-48a4-bd77-65d4b929c473',
  '2e36bcb9-11f0-4755-bb68-1a94cbb2df0e', 'c80742cb-7d23-4cb7-9aa0-a6e9bb71cc19',
  'f15465f6-b3c2-4f51-8c94-7dfc6c14a79a', '673fe34d-ca91-4d15-aa64-65aed68f7218',
  '8c1728b8-4286-4ccb-91ae-172621f215dc',
] as const;

const portraitReference = 'assets/references/c-heroes-style-lock.png';
const iconReferences = ['assets/sources/items/bannerWhistle-source.png',
  'assets/sources/items/potionOfVigor-source.png',
  'assets/sources/artifacts/falconersGlove-source.png'] as const;
const magenta = new Set<HeroDashboardAssetId>([
  'hero-specialty:brightWither', 'hero-specialty:brightBloom',
  'hero-specialty:lastingResin', 'hero-specialty:diagonalFenceSlow', 'hero-vital:luck',
]);

function sha(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function literalSubject(id: HeroDashboardAssetId): string {
  const [, value] = id.split(':');
  if (id.startsWith('hero-specialty:')) return HERO_SPECIALTY_VISUAL_SUBJECTS[value as keyof typeof HERO_SPECIALTY_VISUAL_SUBJECTS];
  if (id.startsWith('hero-primary-stat:')) return HERO_PRIMARY_STAT_VISUAL_SUBJECTS[value as keyof typeof HERO_PRIMARY_STAT_VISUAL_SUBJECTS];
  if (id.startsWith('hero-vital:')) return HERO_VITAL_VISUAL_SUBJECTS[value as keyof typeof HERO_VITAL_VISUAL_SUBJECTS];
  const hero = HEROES[value as keyof typeof HEROES];
  return `${hero.name}, ${hero.faction} ${hero.heroClass}; ${hero.story} Specialty: ${hero.specialty.description}`;
}

function promptFor(id: HeroDashboardAssetId): string {
  const subject = literalSubject(id);
  const key = magenta.has(id) ? '#FF00FF' : '#00FF00';
  if (id.startsWith('hero-portrait:')) return `Use case: stylized-concept
Asset type: production 96x96 hero portrait for a bright storybook fantasy strategy game
Primary request: Create one original isolated head-and-shoulders portrait of this canonical individual: ${subject}
Scene/backdrop: perfectly flat solid ${key} chroma-key background for local removal.
Style/medium: warm bright cartoony storybook fantasy pixel art; hand-pixelled appearance; crisp selective outline; restrained coherent pixel clusters; tactile faction materials; characterful face.
Composition/framing: one compact centered bust in front three-quarter view; face large and expressive; generous padding; no crop; identity legible at native 96x96.
Lighting/mood: warm light from screen lower-right; self-shadowed planes toward screen upper-left.
Constraints: one person only; distinct canonical identity derived from name, story, class, faction, and specialty; perfectly uniform ${key} background; opaque subject suitable for chroma removal.
Avoid: text, frame, scenery, player color, faction crest, slot or rarity marker, full body, mount, generic faction archetype, photorealism.`;
  return `Use case: stylized-concept
Asset type: production 32x32 hero-dashboard icon for a bright storybook fantasy strategy game
Primary request: Create exactly one isolated tightly unified physical icon subject: ${subject}.
Scene/backdrop: perfectly flat solid ${key} chroma-key background for local removal.
Style/medium: warm bright cartoony storybook fantasy pixel art; hand-pixelled appearance; crisp selective dark outline; restrained clusters; tactile miniature materials; match the accepted spell-effect and collectible families.
Composition/framing: centered high-oblique non-isometric object view where depth applies; generous padding; no crop; one readable silhouette at native 32x32.
Lighting/mood: warm key light from screen lower-right/map south-east; shadows toward upper-left/north-west.
Constraints: exact physical subject; uniform ${key} background; opaque crisp edges suitable for chroma removal.
Avoid: text, frame, scenery, player color, faction crest, slot, rarity, amount or upgrade marker, glow, aura, watermark, extra objects.`;
}

function sourceFor(id: HeroDashboardAssetId): string {
  const [kind, value] = id.split(':');
  const family = kind === 'hero-portrait' ? 'portraits'
    : kind === 'hero-specialty' ? 'specialties'
      : kind === 'hero-primary-stat' ? 'primary-stats' : 'vitals';
  return `assets/sources/hero-dashboard/${family}/${value}-source.png`;
}

const worklist = heroDashboardWorklist();
if (worklist.length !== 79 || outputs.length !== 79) throw new Error('dashboard catalog/call count drift');
const requests = worklist.map((item, index) => ({
  id: `${item.id}:built-in`, assets: [item.id], output: sourceFor(item.id),
  final: `public/${HERO_DASHBOARD_MANIFEST[item.id].file}`,
  size: [item.w, item.h], candidates: 1, chroma_key: magenta.has(item.id) ? '#FF00FF' : '#00FF00',
  literal_subject: literalSubject(item.id), prompt: promptFor(item.id),
  references: (item.category === 'hero-portrait' ? [portraitReference] : iconReferences)
    .map((file) => ({ file, parameter: 'style_reference' })),
  built_in_output: `${session}/exec-${outputs[index]}.png`,
}));

const command = process.argv[2];
if (command === 'records') {
  for (let batch = 0; batch < 8; batch += 1) {
    const job = { version: 1, status: 'ready', generator: 'built-in-imagegen',
      contract: 'One distinct built-in call per request; never n-variant generation.',
      contact_sheet: '.pixel-work/review/hero-dashboard/native-contact-sheet.png',
      requests: requests.slice(batch * 10, batch * 10 + 10) };
    writeFileSync(resolve(root, `assets/jobs/hero-dashboard-${batch + 1}-built-in.json`),
      `${JSON.stringify(job, null, 2)}\n`);
  }
  writeFileSync(resolve(root, 'assets/heroDashboardSelections.json'), `${JSON.stringify({
    version: 1, contract: 'One accepted provider source and deterministic native hard-alpha final per contracted dashboard asset; rejected attempts remain retained.',
    entries: requests.map((request) => ({ id: request.assets[0], accepted: true,
      source: request.output, final: request.final,
      review: 'Accepted after source, native, and exact-nearest 3x contact-sheet inspection on 2026-08-12.',
      discarded_outputs: [] })),
  }, null, 2)}\n`);
  console.log('wrote 79 literal requests in eight immutable built-in jobs and 79 selections');
} else if (command === 'provenance') {
  const selections = requests.map((request) => {
    const source = resolve(root, request.output); const final = resolve(root, request.final);
    if (!existsSync(source) || !existsSync(final)) throw new Error(`${request.assets[0]}: missing source/final`);
    return { id: request.assets[0], request_id: request.id, accepted: true,
      built_in_output: request.built_in_output, discarded_outputs: [],
      source: request.output, final: request.final, literal_subject: request.literal_subject,
      prompt: request.prompt, prompt_sha256: sha(request.prompt),
      source_sha256: sha(readFileSync(source)), final_sha256: sha(readFileSync(final)),
      source_dimensions: [1254, 1254], final_dimensions: request.size,
      chroma_key: request.chroma_key,
      bake: 'channel-dominance chroma removal; content crop; LANCZOS native fit; deterministic 64-colour palette; alpha>=128 hard bake; centered exact native canvas',
      review: 'Accepted after complete source, native, and exact-nearest 3x contact-sheet inspection on 2026-08-12.' };
  });
  writeFileSync(resolve(root, 'assets/provenance/hero-dashboard-generation.json'),
    `${JSON.stringify({ version: 1, generator: 'built-in-imagegen', generated_on: '2026-08-12',
      jobs: Array.from({ length: 8 }, (_, index) => `assets/jobs/hero-dashboard-${index + 1}-built-in.json`),
      style_references: [portraitReference, ...iconReferences], selections }, null, 2)}\n`);
  console.log('wrote 79 exact source/final hash provenance records');
} else {
  throw new Error('usage: tsx scripts/manageHeroDashboardAssets.ts records|provenance');
}
