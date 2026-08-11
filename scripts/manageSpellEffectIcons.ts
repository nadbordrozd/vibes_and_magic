import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SPELL_LEXICON, type SpellLexiconId } from '../src/content/spellLexicon';

const root = process.cwd();
const session = '/home/nadbor/.codex/generated_images/019fec66-bea1-7442-98bd-e3fbc7a46ab7';
const outputs: Record<SpellLexiconId, string> = {
  ability: 'exec-f30aac20-9bdd-4f6f-8861-30343c5fe1d1.png',
  'active-effect': 'exec-06f59895-21a4-439c-9024-6bccecf8fa59.png',
  barrowfield: 'exec-fb270ad0-a032-42b2-9c77-47ccacccac16.png',
  'battle-enchantment': 'exec-37fc285e-3071-4478-acac-89bfa33dba22.png',
  beast: 'exec-3de2d927-ed2c-461d-b9ba-5c4ca21c9a90.png',
  'beneficial-effect': 'exec-5ee9743e-55c1-4d3b-a144-ed94d8301d25.png',
  bloom: 'exec-09b0f304-143b-4cff-ab60-153520e86b09.png',
  burn: 'exec-2fc269cc-f8fc-4f27-b96b-94dd232c7cd4.png',
  chill: 'exec-fabd27f4-f70a-4ae3-a4c9-b07771306817.png',
  cleanse: 'exec-ecb8bfa8-3837-49f1-8d9e-b87794d32ca4.png',
  'company-status': 'exec-8d4cf8ab-338f-417d-a2e8-f0f4b328c0b2.png',
  counter: 'exec-11acfb97-c61a-4a7c-a7c1-a9366e46d5da.png',
  'death-trigger': 'exec-694627fb-fbc1-4307-bfef-1f3f7594c0a6.png',
  deepwood: 'exec-f11152ef-4b30-4a5d-a6d1-e76294242efb.png',
  'extra-action': 'exec-4d2ae112-5efb-4c55-bfb4-e6afbcfa2355.png',
  'forced-movement': 'exec-42748c1b-2c91-407a-b216-fcaa707674df.png',
  growth: 'exec-716782ea-05e8-44ff-8ef5-786b7231665b.png',
  guardian: 'exec-ec21a1c6-8609-4f1b-a44a-02802868a659.png',
  'harmful-effect': 'exec-eb5b03b5-a5dd-4fb5-aa50-caef23051a14.png',
  hex: 'exec-2af3b8f0-14a6-4705-b891-837ede5c2fca.png',
  morale: 'exec-4fb0ed8b-bd60-4979-a65f-c48e7f6c078e.png',
  omen: 'exec-896c02c8-c364-4426-bf23-16ddec804394.png',
  phase: 'exec-f22e0c70-774a-4fad-8259-56c7f90da603.png',
  resonance: 'exec-82917c7b-0cc5-42b8-857e-4dc12c21b82e.png',
  'spell-power': 'exec-586bdc0d-176d-443f-8e63-49e19f315910.png',
  summon: 'exec-e83bb903-1746-4874-a85a-4449b613fd4f.png',
  'timed-effect': 'exec-1daf3ca5-fc30-4cdf-99d8-e0a1a20fe800.png',
  twister: 'exec-654fdfe1-abb5-4496-a265-137a291e61a6.png',
  undergrowth: 'exec-bc169837-d442-4b9a-9781-ecae1c3f52b3.png',
  'wall-hex': 'exec-747989e4-982e-4a6d-9787-221cddc349e3.png',
};

const magenta = new Set<SpellLexiconId>([
  'active-effect', 'barrowfield', 'beneficial-effect', 'bloom', 'cleanse',
  'company-status', 'counter', 'deepwood', 'phase', 'resonance', 'undergrowth', 'wall-hex',
]);
const extendedBatch = new Set<SpellLexiconId>([
  'omen', 'phase', 'resonance', 'spell-power', 'summon',
]);
const styleReferences = [
  'assets/sources/items/bannerWhistle-source.png',
  'assets/sources/items/potionOfVigor-source.png',
  'assets/sources/artifacts/falconersGlove-source.png',
] as const;

const basePrompt = (subject: string, key: string, extended = false) => `Use case: stylized-concept
Asset type: production shared spell-effect icon for a bright storybook strategy game
Input images: Images 1–3 are style, palette, camera, and lighting references only. Do not copy their subjects.
Primary request: Create exactly one isolated, tightly unified physical icon subject: ${subject}.
Scene/backdrop: perfectly flat solid ${key} chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines, compact painterly pixel clusters, and the same cheerful tactile miniature quality as the references.
Composition/framing: complete subject centered in a high-oblique non-isometric object view where depth applies, visible upper surfaces, generous empty padding, no cropping, and one strong readable silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes point screen upper-left/map north-west.
Color palette: subject-appropriate warm wood, cloth, stone, parchment, and restrained jewel colors; flat readable color groups and restrained highlights.
Constraints: preserve exactly the requested semantic inventory and spatial relationships. Any requested labels must be conveyed by distinct physical token shapes and colors, never writing. Any requested counting pips, beads, meter segments, or measuring marks are physical parts of the subject, not UI overlays. Perfectly uniform ${key} background with no gradient, texture, floor plane, or lighting variation; do not use ${key} in the subject; opaque crisp-edged subject suitable for chroma removal.${extended ? ' If translucency is requested, depict it with pale blue material and interrupted contour clusters while keeping the subject opaque for clean keying.' : ''}
Avoid: text, letters, numerals, writing, glyphs, surrounding UI frame or panel, aura, glow, rarity marker, unrequested amount marker, unrequested duration marker, upgrade marker, watermark, cast shadow on the background, contact shadow on the background, scenery, and extra objects.`;

function promptFor(id: SpellLexiconId): string {
  const subject = SPELL_LEXICON[id].visualSubject;
  const key = magenta.has(id) ? '#FF00FF' : '#00FF00';
  if (id === 'ability') return `Use case: stylized-concept
Asset type: production shared spell-effect icon for a bright storybook strategy game
Input images: Images 1–3 are style, palette, camera, and lighting references only. Do not copy their subjects.
Primary request: Create exactly one isolated, tightly unified physical icon subject: ${subject}.
Scene/backdrop: perfectly flat solid #00FF00 chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines, compact painterly pixel clusters, and the same cheerful tactile miniature quality as the references.
Composition/framing: complete subject centered in a high-oblique non-isometric object view where depth applies, visible upper surfaces, generous empty padding, no cropping, and one strong readable silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes point screen upper-left/map north-west.
Color palette: warm parchment, wood, brass, and restrained heraldic red and blue; flat readable color groups and restrained highlights.
Constraints: preserve exactly the requested semantic inventory. Keep the open manual and plain heraldic badge distinct and equally legible. Perfectly uniform #00FF00 background with no gradient, texture, floor plane, or lighting variation; do not use #00FF00 in the subject; opaque crisp-edged subject suitable for chroma removal.
Avoid: text, letters, numerals, writing, glyphs, surrounding UI frame or panel, background badge, aura, glow, rarity marker, overlaid amount marker, overlaid duration marker, upgrade marker, watermark, cast shadow on the background, contact shadow on the background, scenery, and extra objects.`;
  if (id === 'wall-hex') return `Use case: stylized-concept
Asset type: production shared spell-effect icon for a bright storybook strategy game
Input images: Images 1–3 are style, palette, camera, and lighting references only. Do not copy their subjects.
Primary request: Create exactly one isolated, tightly unified physical icon subject: ${subject}.
Scene/backdrop: perfectly flat solid #FF00FF chroma-key background for local background removal.
Style/medium: bright cartoony storybook pixel art, hand-pixelled appearance with crisp selective dark outlines, compact painterly pixel clusters, and the same cheerful tactile miniature quality as the references.
Composition/framing: centered high-oblique non-isometric object view with generous empty padding and no cropping. The complete raised six-sided stone battlefield hex must be plainly visible as one compact hexagonal tile. The barricade must be smaller than the tile and sit wholly within all six tile edges, leaving a visible stone margin on every side. One strong readable silhouette when reduced to 32x32.
Lighting/mood: bright warm key light from screen lower-right/map south-east; self-shadowed planes point screen upper-left/map north-west.
Color palette: warm timber, grey stone, brass fasteners, and restrained red cloth; flat readable color groups and restrained highlights.
Constraints: preserve exactly the requested semantic inventory and spatial relationship: exactly one short timber-and-stone barricade plus exactly one enclosing battlefield hex. Perfectly uniform #FF00FF background with no gradient, texture, floor plane, or lighting variation; do not use #FF00FF in the subject; opaque crisp-edged subject suitable for chroma removal.
Avoid: free-standing barricade without a hex, barricade extending beyond the hex, text, letters, numerals, writing, glyphs, surrounding UI frame or panel, flag, shield emblem, aura, glow, rarity marker, amount marker, duration marker, upgrade marker, watermark, cast shadow on the background, contact shadow on the background, scenery, and extra objects.`;
  return basePrompt(subject, key, extendedBatch.has(id));
}

function sha(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

const ids = Object.keys(SPELL_LEXICON) as SpellLexiconId[];
const requests = ids.map((id) => ({
  id: `spell-effect-icon:${id}:built-in`,
  assets: [`spell-effect-icon:${id}`],
  output: `assets/sources/spell-effects/${id}-source.png`,
  final: `public/assets/icons/effects/${id}.png`,
  size: [32, 32], candidates: 1,
  chroma_key: magenta.has(id) ? '#FF00FF' : '#00FF00',
  literal_subject: SPELL_LEXICON[id].visualSubject,
  prompt: promptFor(id),
  references: styleReferences.map((file) => ({ file, parameter: 'style_reference' })),
}));

const command = process.argv[2];
if (command === 'records') {
  for (let batch = 0; batch < 3; batch += 1) {
    const job = {
      version: 1, status: 'ready', generator: 'built-in-imagegen',
      contact_sheet: '.pixel-work/review/spell-effect-icons/native-contact-sheet.png',
      requests: requests.slice(batch * 10, batch * 10 + 10),
    };
    writeFileSync(resolve(root, `assets/jobs/spell-effect-icons-${batch + 1}-built-in.json`),
      `${JSON.stringify(job, null, 2)}\n`);
  }
  writeFileSync(resolve(root, 'assets/spellEffectIconSelections.json'), `${JSON.stringify({
    version: 1,
    contract: 'One accepted built-in source and one deterministic native 32x32 hard-alpha bake per canonical SPELL_LEXICON entry.',
    entries: ids.map((id) => ({ id: `spell-effect-icon:${id}`, accepted: true,
      source: `assets/sources/spell-effects/${id}-source.png`,
      review: 'Accepted after complete source, native, and integer-scale contact-sheet review on 2026-08-12.' })),
  }, null, 2)}\n`);
  console.log(`wrote ${requests.length} requests in three immutable built-in batches`);
} else if (command === 'provenance') {
  const selections = requests.map((request) => {
    const id = request.assets[0].replace('spell-effect-icon:', '') as SpellLexiconId;
    const source = resolve(root, request.output); const final = resolve(root, request.final);
    if (!existsSync(source) || !existsSync(final)) throw new Error(`${id}: missing source or final`);
    const discarded = id === 'wall-hex' ? [{
      built_in_output: `${session}/exec-a794c9c4-d4e4-4518-ba93-3756447c40f5.png`,
      source: 'assets/sources/spell-effects/rejected/wall-hex-missing-hex-source.png',
      reason: 'Rejected: the barricade was present but the enclosing battlefield hex was omitted.',
      prompt: basePrompt(SPELL_LEXICON[id].visualSubject, '#00FF00'),
      prompt_sha256: sha(basePrompt(SPELL_LEXICON[id].visualSubject, '#00FF00')),
      source_sha256: sha(readFileSync(resolve(root,
        'assets/sources/spell-effects/rejected/wall-hex-missing-hex-source.png'))),
    }] : [];
    return {
      id: request.assets[0], request_id: request.id, accepted: true,
      built_in_output: `${session}/${outputs[id]}`, discarded_outputs: discarded,
      source: request.output, final: request.final, literal_subject: request.literal_subject,
      prompt: request.prompt, prompt_sha256: sha(request.prompt),
      source_sha256: sha(readFileSync(source)), final_sha256: sha(readFileSync(final)),
      source_dimensions: [1254, 1254], final_dimensions: [32, 32],
      chroma_key: request.chroma_key,
      bake: 'installed remove_chroma_key soft-matte 12/220/despill, crop, nearest-neighbour fit to 28px, adaptive 40-colour palette, alpha>=128 hard bake, centered 32px canvas',
      review: 'Accepted after source, native, and 3x contact-sheet inspection on 2026-08-12.',
    };
  });
  writeFileSync(resolve(root, 'assets/provenance/spell-effect-icon-generation.json'),
    `${JSON.stringify({ version: 1, generator: 'built-in-imagegen',
      jobs: [1, 2, 3].map((n) => `assets/jobs/spell-effect-icons-${n}-built-in.json`),
      generated_on: '2026-08-12', style_references: styleReferences, selections }, null, 2)}\n`);
  console.log(`wrote ${selections.length} exact prompt/source/final provenance records`);
} else {
  throw new Error('usage: tsx scripts/manageSpellEffectIcons.ts records|provenance');
}
