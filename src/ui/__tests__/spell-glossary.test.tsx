import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DOCS_60_67_SPELL_LEXICON_IDS, SPELL_LEXICON,
} from '../../content/spellLexicon';
import { SPELL_IDS } from '../../content/spells';
import { SPELL_RULE_PRESENTATIONS } from '../../content/spells/rulePresentation';
import {
  SemanticSpellText, SpellGlossaryReference, SpellRuleText,
} from '../components/SpellGlossary';

describe('shared spell glossary presentation', () => {
  it('renders an accessible compact icon reference without a nested control', () => {
    const html = renderToStaticMarkup(<p>Gain <SpellGlossaryReference
      termId="bloom" label="Bloom 3" />.</p>);
    expect(html).toContain('data-spell-term="bloom"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls=');
    expect(html).toContain('Bloom 3: open glossary rule');
    expect(html).toContain('/assets/icons/effects/bloom.png');
    expect(html).not.toMatch(/<button[^>]*>[^]*<button/);
  });

  it('renders every authored Standard and Upgraded token and all lexicon term consumers', () => {
    const rules = SPELL_IDS.flatMap((id) => [
      SPELL_RULE_PRESENTATIONS[id].standard, SPELL_RULE_PRESENTATIONS[id].upgraded,
    ]);
    const html = renderToStaticMarkup(<>{rules.map((tokens, index) =>
      <p key={index}><SpellRuleText tokens={tokens} /></p>)}</>);
    const authoredTermIds = new Set(rules.flatMap((tokens) => tokens.flatMap((token) =>
      token.kind === 'term' ? [token.termId] : [])));
    for (const termId of authoredTermIds) {
      expect(html, termId).toContain(`data-spell-term="${termId}"`);
      expect(html, termId).toContain(`/assets/icons/effects/${termId}.png`);
    }
    const catalogHtml = renderToStaticMarkup(<>{(
      Object.keys(SPELL_LEXICON) as Array<keyof typeof SPELL_LEXICON>
    ).map((termId) => <SpellGlossaryReference key={termId} termId={termId} />)}</>);
    for (const termId of Object.keys(SPELL_LEXICON)) {
      expect(catalogHtml, termId).toContain(`data-spell-term="${termId}"`);
      expect(catalogHtml, termId).toContain(`/assets/icons/effects/${termId}.png`);
    }
  });

  it('uses the tokenizer for unstructured player copy and pins interaction/bounds hooks', () => {
    const html = renderToStaticMarkup(<SemanticSpellText>
      {'Cleanse a Bloom counter, then gain an extra action.'}
    </SemanticSpellText>);
    for (const termId of ['cleanse', 'bloom', 'extra-action']) {
      expect(html).toContain(`data-spell-term="${termId}"`);
    }
    const source = readFileSync(new URL('../components/SpellGlossary.tsx', import.meta.url), 'utf8');
    for (const contract of ['onMouseEnter', 'onFocus', 'onClick', 'Escape', 'pointerdown',
      'createPortal', 'clientWidth', 'clientHeight', 'aria-expanded', 'aria-describedby']) {
      expect(source).toContain(contract);
    }
  });

  it('audits every player-facing mechanic surface for semantic rendering or inspection routing', () => {
    const semanticSurfaces = [
      'Spellbook.tsx', 'ContextHelp.tsx', 'InspectionLayer.tsx', 'CombatScreen.tsx',
      'CombatUnitPanel.tsx', 'AdventureHeroDetails.tsx', 'CastleScreen.tsx',
      'AdventureSpellTargetDialog.tsx', 'ActionConfirmationDialog.tsx',
      'AdventureItemDialog.tsx', 'ArtifactPaperDoll.tsx', 'AdventureStructureDialog.tsx',
      'EditorGuardianControls.tsx', 'EditorTerrainCanvas.tsx',
    ];
    for (const file of semanticSurfaces) {
      const source = readFileSync(new URL(`../components/${file}`, import.meta.url), 'utf8');
      expect(source, file).toMatch(/SemanticSpellText|SpellRuleText|SpellGlossaryReference/);
    }
    for (const file of ['AdventureScreen.tsx', 'Dialogs.tsx']) {
      const source = readFileSync(new URL(`../components/${file}`, import.meta.url), 'utf8');
      expect(source, file).toMatch(/ResourceRichText semantic|data-inspect-kind/);
    }
    const spellbook = readFileSync(new URL('../components/Spellbook.tsx', import.meta.url), 'utf8');
    expect(spellbook).not.toMatch(/selectedSpell\.(base|plus)/);
    expect(spellbook).not.toMatch(/<dt>Power<\/dt>|Spell Power.*<dd>/);
  });
});
