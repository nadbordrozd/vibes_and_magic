import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CONTENT_ICON_MANIFEST, SKILL_ICON_MANIFEST, SPELL_ICON_MANIFEST,
} from '../../../assets/iconManifest';
import { contentIconWorklist } from '../../../assets/iconWorklist';
import { SKILL_IDS } from '../../content/skills';
import { SPELL_IDS } from '../../content/spells';
import { ContentIcon } from '../components/ContentIcon';
import { CONTENT_ICON_SURFACES } from '../contentIconSurfaces';

describe('manifest-backed spell and skill icons', () => {
  it('derives exact complete catalog coverage', () => {
    expect(Object.keys(SPELL_ICON_MANIFEST)).toEqual(SPELL_IDS);
    expect(Object.keys(SKILL_ICON_MANIFEST)).toEqual(SKILL_IDS);
    expect(contentIconWorklist()).toHaveLength(89);
    expect(Object.keys(CONTENT_ICON_MANIFEST)).toHaveLength(89);
    expect(new Set(Object.values(CONTENT_ICON_MANIFEST).map((entry) => entry.file)).size).toBe(89);
  });

  it('renders a labelled native/integer-scale bitmap for every canonical id', () => {
    for (const id of SPELL_IDS) {
      const markup = renderToStaticMarkup(<ContentIcon kind="spell" id={id} />);
      expect(markup, id).toContain(`/assets/icons/spells/${id}.png`);
      expect(markup, id).toContain('width="32"');
      expect(markup, id).toContain('alt=');
    }
    for (const id of SKILL_IDS) {
      const markup = renderToStaticMarkup(<ContentIcon kind="skill" id={id} large />);
      expect(markup, id).toContain(`/assets/icons/skills/${id}.png`);
      expect(markup, id).toContain('width="64"');
      expect(markup, id).toContain('alt=');
    }
  });

  it('keeps every inventoried spell/skill surface on the shared component', () => {
    expect(CONTENT_ICON_SURFACES.map((surface) => surface.id)).toHaveLength(11);
    for (const surface of CONTENT_ICON_SURFACES) {
      expect(readFileSync(surface.source, 'utf8'), surface.id).toContain('<ContentIcon');
    }
  });
});
