import { SKILLS, SKILL_IDS } from '../src/content/skills';
import { SPELLS, SPELL_IDS } from '../src/content/spells';
import { CONTENT_ICON_SIZE } from './iconManifest';

export interface ContentIconWorkItem {
  id: string;
  category: 'spell-icon' | 'skill-icon';
  w: typeof CONTENT_ICON_SIZE;
  h: typeof CONTENT_ICON_SIZE;
  source: string;
}

export function contentIconWorklist(): ContentIconWorkItem[] {
  return [
    ...SPELL_IDS.map((id): ContentIconWorkItem => ({
      id: `spell-icon:${id}`, category: 'spell-icon',
      w: CONTENT_ICON_SIZE, h: CONTENT_ICON_SIZE,
      source: `canonical spell catalog:${SPELLS[id].name}`,
    })),
    ...SKILL_IDS.map((id): ContentIconWorkItem => ({
      id: `skill-icon:${id}`, category: 'skill-icon',
      w: CONTENT_ICON_SIZE, h: CONTENT_ICON_SIZE,
      source: `canonical secondary-skill catalog:${SKILLS[id].name}`,
    })),
  ];
}
