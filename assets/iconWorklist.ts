import { SKILLS, SKILL_IDS } from '../src/content/skills';
import { SPELLS } from '../src/content/spells';
import { KNACKS } from '../src/content/knacks';
import type { FactionId } from '../src/core/types';
import { SPELL_LEXICON, type SpellLexiconId } from '../src/content/spellLexicon';
import {
  CONTENT_ICON_SIZE, NATIVE_SPELL_EFFECT_ICON_IDS, NATIVE_SPELL_ICON_IDS,
} from './iconManifest';

export interface ContentIconWorkItem {
  id: string;
  category: 'spell-icon' | 'skill-icon' | 'knack-icon';
  w: typeof CONTENT_ICON_SIZE;
  h: typeof CONTENT_ICON_SIZE;
  source: string;
}

export function contentIconWorklist(): ContentIconWorkItem[] {
  return [
    ...NATIVE_SPELL_ICON_IDS.map((id): ContentIconWorkItem => ({
      id: `spell-icon:${id}`, category: 'spell-icon',
      w: CONTENT_ICON_SIZE, h: CONTENT_ICON_SIZE,
      source: `canonical spell catalog:${SPELLS[id].name}`,
    })),
    ...SKILL_IDS.map((id): ContentIconWorkItem => ({
      id: `skill-icon:${id}`, category: 'skill-icon',
      w: CONTENT_ICON_SIZE, h: CONTENT_ICON_SIZE,
      source: `canonical secondary-skill catalog:${SKILLS[id].name}`,
    })),
    ...(Object.keys(KNACKS) as FactionId[]).map((id): ContentIconWorkItem => ({
      id: `knack:${id}`, category: 'knack-icon',
      w: CONTENT_ICON_SIZE, h: CONTENT_ICON_SIZE,
      source: `canonical faction-Knack catalog:${KNACKS[id].name}`,
    })),
  ];
}

export interface SpellEffectIconWorkItem {
  id: `spell-effect-icon:${SpellLexiconId}`;
  category: 'spell-effect-icon';
  w: typeof CONTENT_ICON_SIZE;
  h: typeof CONTENT_ICON_SIZE;
  source: string;
}

export function spellEffectIconWorklist(): SpellEffectIconWorkItem[] {
  return NATIVE_SPELL_EFFECT_ICON_IDS.map((id) => ({
    id: `spell-effect-icon:${id}`,
    category: 'spell-effect-icon',
    w: CONTENT_ICON_SIZE,
    h: CONTENT_ICON_SIZE,
    source: `canonical spell lexicon:${SPELL_LEXICON[id].name}`,
  }));
}
