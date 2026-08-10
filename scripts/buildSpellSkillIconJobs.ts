import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SKILLS, SKILL_IDS } from '../src/content/skills';
import { SPELLS, SPELL_IDS } from '../src/content/spells';

const root = process.cwd();
const jobsDirectory = resolve(root, 'assets/jobs');
mkdirSync(jobsDirectory, { recursive: true });

const schoolPalette = {
  rite: 'ivory, heraldic crimson and sunrise gold',
  craft: 'copper, blue steel and furnace amber',
  grave: 'charcoal, bone white and muted violet',
  wild: 'leaf green, earthen ochre and moonlit teal',
} as const;

const shared = 'Native final-resolution 32x32 transparent UI icon. Authentic hand-placed 1990s warm storybook fantasy strategy-game pixel art. One bold centered silhouette occupying about 25x25 pixels, crisp selective two-pixel dark outline, compact painterly clusters, restrained four-to-six-colour palette, lower-right key light and upper-left shadow. No frame, border, badge, background, ground, scenery, person portrait, tiny scattered symbols, gradients, antialiasing, smooth vector edges, text, letters, numbers, logo or watermark.';

type Request = {
  id: string;
  assets: string[];
  output: string;
  prompt: string;
  endpoint: string;
  size: [number, number];
  candidates: number;
  variations_from_single_request: number;
  seed: number;
  parameters: Record<string, unknown>;
};

function writeBatches(prefix: string, requests: Request[]): void {
  for (let offset = 0; offset < requests.length; offset += 10) {
    const batch = Math.floor(offset / 10) + 1;
    const filename = `${prefix}-${batch}.json`;
    writeFileSync(resolve(jobsDirectory, filename), `${JSON.stringify({
      version: 1,
      status: 'ready',
      contact_sheet: `assets/jobs/${prefix}-${batch}-candidates.html`,
      requests: requests.slice(offset, offset + 10),
    }, null, 2)}\n`);
  }
}

const spellRequests = SPELL_IDS.map((id, index): Request => {
  const spell = SPELLS[id];
  return {
    id: `spell-icon:${id}`,
    assets: [`spell-icon:${id}`],
    output: `.pixel-work/pixelgen/spell-skill-icons/spells/${id}`,
    prompt: `${shared} Central visual metaphor for the spell “${spell.name}”: ${spell.base} Use ${schoolPalette[spell.school]}; the silhouette and object vocabulary must be unique to this exact spell.`,
    endpoint: 'generate-image-v2',
    size: [32, 32],
    candidates: 1,
    variations_from_single_request: 64,
    seed: 746000 + index * 17,
    parameters: { no_background: true },
  };
});

const skillRequests = SKILL_IDS.map((id, index): Request => {
  const skill = SKILLS[id];
  return {
    id: `skill-icon:${id}`,
    assets: [`skill-icon:${id}`],
    output: `.pixel-work/pixelgen/spell-skill-icons/skills/${id}`,
    prompt: `${shared} Central visual metaphor for the secondary skill “${skill.name}”: ${skill.ranks[1]} Prefer one recognizable tool, creature, gesture or heraldic object whose silhouette is unique to this exact skill; use warm brass, parchment cream and one concept-specific accent colour.`,
    endpoint: 'generate-image-v2',
    size: [32, 32],
    candidates: 1,
    variations_from_single_request: 64,
    seed: 759000 + index * 19,
    parameters: { no_background: true },
  };
});

writeBatches('e1-spell-icons', spellRequests);
writeBatches('e2-skill-icons', skillRequests);
const catalogPath = resolve(jobsDirectory, 'CATALOG.md');
const catalog = readFileSync(catalogPath, 'utf8').split('\n')
  .filter((line) => !/^- e[12]-(?:spell|skill)-icons-\d+\.json/.test(line));
while (catalog.at(-1) === '') catalog.pop();
for (let batch = 1; batch <= Math.ceil(spellRequests.length / 10); batch += 1) {
  const count = spellRequests.slice((batch - 1) * 10, batch * 10).length;
  catalog.push(`- e1-spell-icons-${batch}.json · ${count} request${count === 1 ? '' : 's'} · ready`);
}
for (let batch = 1; batch <= Math.ceil(skillRequests.length / 10); batch += 1) {
  const count = skillRequests.slice((batch - 1) * 10, batch * 10).length;
  catalog.push(`- e2-skill-icons-${batch}.json · ${count} request${count === 1 ? '' : 's'} · ready`);
}
writeFileSync(catalogPath, `${catalog.join('\n')}\n`);
console.log(`wrote ${Math.ceil(spellRequests.length / 10)} spell jobs and ${Math.ceil(skillRequests.length / 10)} skill jobs`);
