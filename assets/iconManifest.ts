import { DOCS_60_67_SKILL_IDS, SKILL_IDS } from '../src/content/skills';
import {
  DOCS_60_67_SPELL_LEXICON_IDS, SPELL_LEXICON, type SpellLexiconId,
} from '../src/content/spellLexicon';
import { SPELL_IDS } from '../src/content/spells';
import { P1_RITE_CRAFT_SPELL_IDS } from '../src/content/spells/p1RiteCraft';
import { P1_GRAVE_WILD_SPELL_IDS } from '../src/content/spells/p1GraveWild';
import { P2_NEW_SPELL_IDS } from '../src/content/spells/p2';
import { KNACKS } from '../src/content/knacks';
import type { FactionId } from '../src/core/types';
import type { SecondarySkillId, SpellId } from '../src/core/types';

/**
 * Final-resolution spell/skill icon contract. PixelLab generates directly at this size; the UI
 * may display the bitmap only at 32px or an integer multiple for review.
 */
export const CONTENT_ICON_SIZE = 32 as const;

export interface ContentIconManifestEntry {
  file: string;
  w: typeof CONTENT_ICON_SIZE;
  h: typeof CONTENT_ICON_SIZE;
  generator: 'pixellab' | 'built-in-imagegen';
}

function iconEntry(
  kind: 'spells' | 'skills' | 'knacks', id: string,
  generator: ContentIconManifestEntry['generator'] = 'pixellab',
): ContentIconManifestEntry {
  return {
    file: `assets/icons/${kind}/${id}.png`,
    w: CONTENT_ICON_SIZE,
    h: CONTENT_ICON_SIZE,
    generator,
  };
}

const developmentSpellIds = new Set<SpellId>([
  ...P1_RITE_CRAFT_SPELL_IDS, ...P1_GRAVE_WILD_SPELL_IDS,
  ...P2_NEW_SPELL_IDS,
]);
export const NATIVE_SPELL_ICON_IDS = SPELL_IDS;
const spellIconEntries = Object.fromEntries(NATIVE_SPELL_ICON_IDS
  .map((id) => [id, iconEntry('spells', id,
    developmentSpellIds.has(id) ? 'built-in-imagegen' : 'pixellab')])) as Partial<Record<SpellId, ContentIconManifestEntry>>;
export const SPELL_ICON_MANIFEST: Readonly<Partial<Record<SpellId, ContentIconManifestEntry>>> =
  Object.freeze(spellIconEntries);

const developmentSkillIds = new Set<SecondarySkillId>(DOCS_60_67_SKILL_IDS);
export const NATIVE_SKILL_ICON_IDS = SKILL_IDS;
const skillIconEntries = Object.fromEntries(NATIVE_SKILL_ICON_IDS.map((id) => [id,
  iconEntry('skills', id, developmentSkillIds.has(id) ? 'built-in-imagegen' : 'pixellab')])) as Partial<Record<SecondarySkillId, ContentIconManifestEntry>>;
export const SKILL_ICON_MANIFEST: Readonly<Partial<Record<SecondarySkillId, ContentIconManifestEntry>>> =
  Object.freeze(skillIconEntries);

export const CONTENT_ICON_MANIFEST: Readonly<Record<string, ContentIconManifestEntry>> =
  Object.freeze({
    ...Object.fromEntries(NATIVE_SPELL_ICON_IDS.map((id) =>
      [`spell-icon:${id}`, SPELL_ICON_MANIFEST[id]!])),
    ...Object.fromEntries(NATIVE_SKILL_ICON_IDS.map((id) => [`skill-icon:${id}`, SKILL_ICON_MANIFEST[id]!])),
    ...Object.fromEntries(Object.keys(KNACKS).map((id) => [`knack:${id}`, iconEntry('knacks', id, 'built-in-imagegen')])),
  });

export function spellIcon(id: SpellId): ContentIconManifestEntry {
  const entry = SPELL_ICON_MANIFEST[id];
  if (!entry) throw new Error(`Spell ${id} uses a typed development icon placeholder`);
  return entry;
}

export function skillIcon(id: SecondarySkillId): ContentIconManifestEntry {
  const entry = SKILL_ICON_MANIFEST[id];
  if (!entry) throw new Error(`Skill ${id} uses a typed development icon placeholder`);
  return entry;
}

export const NATIVE_SPELL_EFFECT_ICON_IDS = Object.keys(SPELL_LEXICON) as SpellLexiconId[];
const effectIconEntries = Object.fromEntries(NATIVE_SPELL_EFFECT_ICON_IDS.map((id) => [id, {
  file: `assets/icons/effects/${id}.png`,
  w: CONTENT_ICON_SIZE,
  h: CONTENT_ICON_SIZE,
  generator: 'built-in-imagegen' as const,
}])) as Partial<Record<SpellLexiconId, ContentIconManifestEntry>>;

/** Native shared icons for the canonical spell-effect lexicon, independent of spell cards. */
export const SPELL_EFFECT_ICON_MANIFEST: Readonly<
  Partial<Record<SpellLexiconId, ContentIconManifestEntry>>
> = Object.freeze(effectIconEntries);

export function spellEffectIcon(id: SpellLexiconId): ContentIconManifestEntry {
  const entry = SPELL_EFFECT_ICON_MANIFEST[id];
  if (!entry) throw new Error(`Spell term ${id} uses a typed development icon placeholder`);
  return entry;
}

export function knackIcon(id: FactionId): ContentIconManifestEntry {
  const entry = CONTENT_ICON_MANIFEST[`knack:${id}`];
  if (!entry) throw new Error(`Knack ${id} has no native icon`);
  return entry;
}
