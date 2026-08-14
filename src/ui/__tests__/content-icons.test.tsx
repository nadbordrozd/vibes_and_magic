import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CONTENT_ICON_MANIFEST, SKILL_ICON_MANIFEST, SPELL_ICON_MANIFEST,
  SPELL_EFFECT_ICON_MANIFEST, NATIVE_SKILL_ICON_IDS,
  NATIVE_SPELL_EFFECT_ICON_IDS, NATIVE_SPELL_ICON_IDS,
} from '../../../assets/iconManifest';
import { contentIconWorklist, spellEffectIconWorklist } from '../../../assets/iconWorklist';
import { SKILL_IDS } from '../../content/skills';
import { SPELL_IDS } from '../../content/spells';
import { KNACKS } from '../../content/knacks';
import { P1_RITE_CRAFT_SPELL_IDS } from '../../content/spells/p1RiteCraft';
import { ContentIcon } from '../components/ContentIcon';
import { SpellEffectIcon } from '../components/SpellEffectIcon';
import {
  DOCS_60_67_SPELL_LEXICON_IDS, SPELL_LEXICON, type SpellLexiconId,
} from '../../content/spellLexicon';
import { CONTENT_ICON_SURFACES } from '../contentIconSurfaces';

describe('manifest-backed spell and skill icons', () => {
  it('derives exact complete catalog coverage', () => {
    expect(Object.keys(SPELL_ICON_MANIFEST)).toEqual(NATIVE_SPELL_ICON_IDS);
    expect(Object.keys(SKILL_ICON_MANIFEST)).toEqual(NATIVE_SKILL_ICON_IDS);
    expect(contentIconWorklist()).toHaveLength(
      NATIVE_SPELL_ICON_IDS.length + SKILL_IDS.length + Object.keys(KNACKS).length,
    );
    expect(Object.keys(CONTENT_ICON_MANIFEST)).toHaveLength(
      NATIVE_SPELL_ICON_IDS.length + NATIVE_SKILL_ICON_IDS.length + Object.keys(KNACKS).length,
    );
    expect(new Set(Object.values(CONTENT_ICON_MANIFEST).map((entry) => entry.file)).size)
      .toBe(Object.keys(CONTENT_ICON_MANIFEST).length);
  });

  it('derives exact no-fallback spell-effect coverage from the canonical lexicon', () => {
    const ids = NATIVE_SPELL_EFFECT_ICON_IDS;
    expect(Object.keys(SPELL_EFFECT_ICON_MANIFEST)).toEqual(ids);
    expect(spellEffectIconWorklist()).toHaveLength(ids.length);
    expect(new Set(Object.values(SPELL_EFFECT_ICON_MANIFEST).map((entry) => entry.file)).size)
      .toBe(ids.length);
    for (const id of ids) {
      const markup = renderToStaticMarkup(<SpellEffectIcon id={id} />);
      expect(markup, id).toContain(`/assets/icons/effects/${id}.png`);
      expect(markup, id).toContain('width="32"');
      expect(markup, id).not.toContain('fallback');
    }
    for (const id of DOCS_60_67_SPELL_LEXICON_IDS) {
      const markup = renderToStaticMarkup(<SpellEffectIcon id={id} />);
      expect(markup, id).toContain(`/assets/icons/effects/${id}.png`);
      expect(markup, id).not.toContain('placeholder');
    }
  });

  it('renders a labelled native/integer-scale bitmap for every canonical id', () => {
    for (const id of NATIVE_SPELL_ICON_IDS) {
      const markup = renderToStaticMarkup(<ContentIcon kind="spell" id={id} />);
      expect(markup, id).toContain(`/assets/icons/spells/${id}.png`);
      expect(markup, id).toContain('width="32"');
      expect(markup, id).toContain('alt=');
    }
    for (const id of P1_RITE_CRAFT_SPELL_IDS) {
      const markup = renderToStaticMarkup(<ContentIcon kind="spell" id={id} />);
      expect(markup, id).toContain(`/assets/icons/spells/${id}.png`);
      expect(markup, id).not.toContain('placeholder');
    }
    for (const id of NATIVE_SKILL_ICON_IDS) {
      const markup = renderToStaticMarkup(<ContentIcon kind="skill" id={id} large />);
      expect(markup, id).toContain(`/assets/icons/skills/${id}.png`);
      expect(markup, id).toContain('width="64"');
      expect(markup, id).toContain('alt=');
    }
    for (const id of SKILL_IDS) {
      const markup = renderToStaticMarkup(<ContentIcon kind="skill" id={id} large />);
      expect(markup, id).toContain(`/assets/icons/skills/${id}.png`);
      expect(markup, id).not.toContain('placeholder');
    }
  });

  it('keeps every inventoried spell/skill surface on the shared component', () => {
    expect(CONTENT_ICON_SURFACES.map((surface) => surface.id)).toHaveLength(11);
    for (const surface of CONTENT_ICON_SURFACES) {
      expect(readFileSync(surface.source, 'utf8'), surface.id).toContain('<ContentIcon');
    }
  });
});
