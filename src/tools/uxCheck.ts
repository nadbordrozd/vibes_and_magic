import {
  readFileSync, readdirSync,
} from 'node:fs';
import { extname, resolve } from 'node:path';
import { validateAbilityPresentation } from '../content/abilityPresentation';
import { validateArtifacts } from '../content/artifacts';
import { validateBattleTiles } from '../content/battleTiles';
import { validateBuildings } from '../content/buildings';
import { validateFactionPresentation } from '../content/factionPresentation';
import { validateFactions } from '../content/factions';
import { validateHeroes } from '../content/heroes';
import { validateItems } from '../content/items';
import { validateMapObjectRegistry } from '../content/mapObjectRegistry';
import { validateOmens } from '../content/omens';
import { validateSkills } from '../content/skills';
import { validateSpells } from '../content/spells';
import { validateSpellPresentation } from '../content/spellPresentation';
import { validateUnits } from '../content/units';
import { validateKnacks } from '../content/knacks';
import { validateV2AcquisitionSites } from '../content/acquisitionSites';
import { INSPECTION_KINDS } from '../ui/inspection';
import { validateAdventureObjectInteractionRoutes } from '../ui/adventureStructureInteractions';
import { validateNonAdventureSurfaceCoverage } from '../ui/nonAdventureSurfaceCoverage';

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

const validators = [
  validateAbilityPresentation, validateArtifacts, validateBattleTiles, validateBuildings,
  validateFactionPresentation, validateFactions, validateHeroes, validateItems,
  validateMapObjectRegistry, validateOmens, validateSkills, validateSpells,
  validateSpellPresentation, validateUnits, validateKnacks, validateV2AcquisitionSites,
  validateAdventureObjectInteractionRoutes,
  validateNonAdventureSurfaceCoverage,
];

for (const validate of validators) validate();

const uiFiles = filesBelow(resolve(process.cwd(), 'src/ui'))
  .filter((path) => ['.ts', '.tsx'].includes(extname(path)));
const sources = uiFiles.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
const failures: string[] = [];

function openingButtonTags(source: string): Array<{ text: string; index: number }> {
  const tags: Array<{ text: string; index: number }> = [];
  let cursor = 0;
  while ((cursor = source.indexOf('<button', cursor)) >= 0) {
    const start = cursor;
    let braces = 0;
    let quote = '';
    cursor += 7;
    for (; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (quote) {
        if (character === quote && source[cursor - 1] !== '\\') quote = '';
      } else if (character === '"' || character === "'" || character === '`') quote = character;
      else if (character === '{') braces += 1;
      else if (character === '}') braces = Math.max(0, braces - 1);
      else if (character === '>' && braces === 0) {
        tags.push({ text: source.slice(start, cursor + 1), index: start });
        cursor += 1;
        break;
      }
    }
  }
  return tags;
}

for (const source of sources) {
  if (source.text.includes('onDoubleClick')) {
    failures.push(`${source.path}: double-click is forbidden; every primary action must be one click`);
  }
}

const allowedKinds = new Set<string>(INSPECTION_KINDS);
const literalKinds = new Set<string>();
for (const source of sources) {
  for (const match of source.text.matchAll(/data-inspect-kind=["']([^"']+)["']/g)) {
    literalKinds.add(match[1]);
    if (!allowedKinds.has(match[1])) {
      failures.push(`${source.path}: unknown inspection kind "${match[1]}"`);
    }
  }
  for (const match of source.text.matchAll(/data-inspect-kind=\{([^}\n]*)\}/g)) {
    for (const literal of match[1].matchAll(/["']([A-Za-z]+)["']/g)) {
      if (allowedKinds.has(literal[1])) literalKinds.add(literal[1]);
    }
  }
}

const requiredVisibleKinds = [
  'terrain', 'object', 'castle', 'hero', 'unit', 'building', 'spell', 'artifact',
  'item', 'skill', 'ability', 'counter', 'enchantment', 'omen', 'battleTile',
  'decoration',
];
for (const kind of requiredVisibleKinds) {
  if (!literalKinds.has(kind)) failures.push(`No visible UI surface exposes inspection kind "${kind}"`);
}

const disabledControls = sources.reduce((total, source) =>
  total + [...source.text.matchAll(/disabled=/g)].length, 0);
for (const source of sources.filter(({ path }) => path.endsWith('.tsx'))) {
  for (const tag of openingButtonTags(source.text)) {
    if (/\bdisabled\s*=/.test(tag.text)
        && !/\b(?:title|data-disabled-reason)\s*=/.test(tag.text)) {
      const line = source.text.slice(0, tag.index).split('\n').length;
      failures.push(`${source.path}:${line}: disabled button has no reason`);
    }
  }
}

if (failures.length) {
  throw new Error(`UX completeness check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`);
}

console.log(`UX catalogs and ${INSPECTION_KINDS.length} inspection kinds are covered. `
  + `${disabledControls} conditional disabled states are tracked for browser review.`);
