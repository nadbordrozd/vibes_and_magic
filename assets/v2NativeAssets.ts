import { ARTIFACT_ASSET_REQUIREMENTS } from '../src/content/artifacts';
import { ACQUISITION_SITE_ASSET_REQUIREMENTS } from '../src/content/acquisitionSites';
import { V2_ITEM_ASSET_REQUIREMENTS } from '../src/content/items';
import { KNACK_ASSET_REQUIREMENTS } from '../src/content/knacks';
import {
  CREATURE_ASSET_REQUIREMENTS, DOC63_64_CREATURES, DOC63_64_CREATURE_IDS,
} from '../src/content/neutralCreatures';
import { DOCS_60_67_SKILL_IDS, SKILL_ASSET_REQUIREMENTS } from '../src/content/skills';
import { DOCS_60_67_SPELL_LEXICON_ASSET_REQUIREMENTS } from '../src/content/spellLexicon';
import {
  P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS,
  P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS,
  P2_SPELL_ASSET_REQUIREMENTS,
} from '../src/content/spells';
import type { ContentAssetRequirement } from '../src/content/v2/schema';

export type V2NativeAssetFamily =
  | 'spell' | 'lexicon' | 'skill' | 'knack' | 'battle-creature'
  | 'guardian-creature' | 'dwelling' | 'artifact' | 'item' | 'site';

export interface V2NativeAssetWorkItem {
  /** Resolver identity used by the docs-60-67 strict native-asset set. */
  nativeAssetId: string;
  /** Renderer/worklist identity. Spell and skill renderers use their historic icon prefixes. */
  runtimeAssetId: string;
  canonicalId: string;
  family: V2NativeAssetFamily;
  accessibleName: string;
  literalSubject: string;
  source: string;
  file: string;
  w: number;
  h: number;
  chromaKey: '#00ff00' | '#ff00ff';
}

const safe = (id: string) => id.replace(/[^A-Za-z0-9_-]+/g, '-');
const sourcePath = (runtimeAssetId: string) =>
  `assets/sources/docs-60-67/${safe(runtimeAssetId)}-source.png`;

function iconItem(
  requirement: ContentAssetRequirement, family: 'spell' | 'lexicon' | 'skill' | 'knack',
): V2NativeAssetWorkItem {
  const suffix = requirement.nativeAssetId.slice(requirement.nativeAssetId.indexOf(':') + 1);
  const runtimeAssetId = family === 'spell' ? `spell-icon:${suffix}`
    : family === 'skill' ? `skill-icon:${suffix}` : requirement.nativeAssetId;
  const file = family === 'spell' ? `assets/icons/spells/${suffix}.png`
    : family === 'skill' ? `assets/icons/skills/${suffix}.png`
      : family === 'knack' ? `assets/icons/knacks/${suffix}.png`
        : `assets/icons/effects/${suffix}.png`;
  const chromaKey = requirement.visualSubject.match(/green|root|thorn|nettle|leaf|bloom/i)
    ? '#ff00ff' as const : '#00ff00' as const;
  return {
    nativeAssetId: requirement.nativeAssetId, runtimeAssetId,
    canonicalId: requirement.canonicalId, family,
    accessibleName: requirement.accessibleName, literalSubject: requirement.visualSubject,
    source: sourcePath(runtimeAssetId), file, w: 32, h: 32, chromaKey,
  };
}

function mapItem(
  requirement: ContentAssetRequirement,
  family: 'battle-creature' | 'guardian-creature' | 'artifact' | 'item' | 'site',
): V2NativeAssetWorkItem {
  const suffix = requirement.nativeAssetId.slice(requirement.nativeAssetId.indexOf(':') + 1);
  const runtimeAssetId = family === 'site' ? `${requirement.nativeAssetId}:default`
    : requirement.nativeAssetId;
  const file = family === 'battle-creature' ? `assets/battle-units/${suffix}.png`
    : family === 'guardian-creature' ? `assets/guardian-units/${suffix}.png`
      : family === 'artifact' ? `assets/artifacts/${suffix.replace('artifact:', '')}.png`
        : family === 'item' ? `assets/items/${suffix.replace('item:', '')}.png`
          : `assets/map-objects/${suffix}.png`;
  const unitId = family === 'battle-creature' ? suffix : undefined;
  const creatureHexSize = unitId === 'nineMouthedWell' ? 3 : unitId === 'stitchOx' ? 2 : 1;
  const battleWidth = unitId
    ? creatureHexSize === 3 ? 256 : creatureHexSize === 2 ? 192 : 128
    : 32;
  return {
    nativeAssetId: requirement.nativeAssetId, runtimeAssetId,
    canonicalId: requirement.canonicalId, family,
    accessibleName: requirement.accessibleName, literalSubject: requirement.visualSubject,
    source: sourcePath(runtimeAssetId), file,
    w: family === 'battle-creature' ? battleWidth : 32,
    h: family === 'battle-creature' ? 128
      : family === 'guardian-creature' ? 48 : 32,
    chromaKey: requirement.visualSubject.match(/green|root|thorn|moth|glass/i)
      ? '#ff00ff' : '#00ff00',
  };
}

const spellRequirements = [
  ...P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS,
  ...P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS,
  ...P2_SPELL_ASSET_REQUIREMENTS,
];
const newSkillIds = new Set<string>(DOCS_60_67_SKILL_IDS);
const skillRequirements = SKILL_ASSET_REQUIREMENTS.filter((requirement) =>
  newSkillIds.has(requirement.canonicalId.replace('skill:', '')));

const creatureItems = CREATURE_ASSET_REQUIREMENTS.map((requirement) =>
  mapItem(requirement, requirement.nativeAssetId.startsWith('battle-unit:')
    ? 'battle-creature' : 'guardian-creature'));

const dwellingItems: V2NativeAssetWorkItem[] = DOC63_64_CREATURE_IDS.map((id) => {
  const battle = CREATURE_ASSET_REQUIREMENTS.find((requirement) =>
    requirement.nativeAssetId === `battle-unit:${id}`)!;
  const runtimeAssetId = `map-object:dwelling:${id}`;
  return {
    nativeAssetId: runtimeAssetId, runtimeAssetId,
    canonicalId: `creature:${id}:dwelling`, family: 'dwelling',
    accessibleName: `${DOC63_64_CREATURES[id].name} field dwelling`,
    literalSubject: `a small field dwelling physically shaped for ${battle.visualSubject.replace('battle company: ', '')}`,
    source: sourcePath(runtimeAssetId), file: `assets/map-objects/dwelling-${id}.png`,
    w: 32, h: 48,
    chromaKey: battle.visualSubject.match(/green|root|thorn|moth|glass/i) ? '#ff00ff' : '#00ff00',
  };
});

export const V2_NATIVE_ASSET_WORKLIST: readonly V2NativeAssetWorkItem[] = Object.freeze([
  ...spellRequirements.map((requirement) => iconItem(requirement, 'spell')),
  ...DOCS_60_67_SPELL_LEXICON_ASSET_REQUIREMENTS.map((requirement) =>
    iconItem(requirement, 'lexicon')),
  ...skillRequirements.map((requirement) => iconItem(requirement, 'skill')),
  ...KNACK_ASSET_REQUIREMENTS.map((requirement) => iconItem(requirement, 'knack')),
  ...creatureItems,
  ...dwellingItems,
  ...ARTIFACT_ASSET_REQUIREMENTS.map((requirement) => mapItem(requirement, 'artifact')),
  ...V2_ITEM_ASSET_REQUIREMENTS.map((requirement) => mapItem(requirement, 'item')),
  ...ACQUISITION_SITE_ASSET_REQUIREMENTS.map((requirement) => mapItem(requirement, 'site')),
]);

export const V2_NATIVE_ASSET_IDS: ReadonlySet<string> = new Set(
  V2_NATIVE_ASSET_WORKLIST.map((item) => item.nativeAssetId),
);
export const V2_NATIVE_RUNTIME_ASSET_IDS: ReadonlySet<string> = new Set(
  V2_NATIVE_ASSET_WORKLIST.map((item) => item.runtimeAssetId),
);

export function validateV2NativeAssetWorklist(): void {
  if (V2_NATIVE_ASSET_WORKLIST.length !== 192) {
    throw new Error(`Docs 60–67 native worklist needs 192 entries, found ${V2_NATIVE_ASSET_WORKLIST.length}`);
  }
  for (const key of ['nativeAssetId', 'runtimeAssetId', 'canonicalId', 'source', 'file'] as const) {
    const values = V2_NATIVE_ASSET_WORKLIST.map((item) => item[key]);
    if (new Set(values).size !== values.length) throw new Error(`Duplicate docs 60–67 ${key}`);
  }
  for (const item of V2_NATIVE_ASSET_WORKLIST) {
    if (!item.literalSubject.trim() || !item.accessibleName.trim()) {
      throw new Error(`${item.canonicalId} needs literal subject and accessible name`);
    }
  }
}

validateV2NativeAssetWorklist();
