import { SKILL_IDS } from '../src/content/skills';
import { SPELL_IDS } from '../src/content/spells';
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
  generator: 'pixellab';
}

function iconEntry(kind: 'spells' | 'skills', id: string): ContentIconManifestEntry {
  return {
    file: `assets/icons/${kind}/${id}.png`,
    w: CONTENT_ICON_SIZE,
    h: CONTENT_ICON_SIZE,
    generator: 'pixellab',
  };
}

const spellIconEntries = Object.fromEntries(SPELL_IDS.map((id) => [id, iconEntry('spells', id)])) as Record<SpellId, ContentIconManifestEntry>;
export const SPELL_ICON_MANIFEST: Readonly<Record<SpellId, ContentIconManifestEntry>> =
  Object.freeze(spellIconEntries);

const skillIconEntries = Object.fromEntries(SKILL_IDS.map((id) => [id, iconEntry('skills', id)])) as Record<SecondarySkillId, ContentIconManifestEntry>;
export const SKILL_ICON_MANIFEST: Readonly<Record<SecondarySkillId, ContentIconManifestEntry>> =
  Object.freeze(skillIconEntries);

export const CONTENT_ICON_MANIFEST: Readonly<Record<string, ContentIconManifestEntry>> =
  Object.freeze({
    ...Object.fromEntries(SPELL_IDS.map((id) => [`spell-icon:${id}`, SPELL_ICON_MANIFEST[id]])),
    ...Object.fromEntries(SKILL_IDS.map((id) => [`skill-icon:${id}`, SKILL_ICON_MANIFEST[id]])),
  });

export function spellIcon(id: SpellId): ContentIconManifestEntry {
  return SPELL_ICON_MANIFEST[id];
}

export function skillIcon(id: SecondarySkillId): ContentIconManifestEntry {
  return SKILL_ICON_MANIFEST[id];
}
