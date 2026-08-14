import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPELL_EFFECT_ICON_MANIFEST } from '../../../assets/iconManifest';
import {
  SPELL_LEXICON, spellRulePlainText,
  tokenizeSpellLexiconText,
  type SpellLexiconId,
} from '../spellLexicon';
import { SPELL_IDS, SPELLS } from '../spells';
import { P2_SPELL_AUDIT_IDS } from '../spells/p2';
import {
  GRAVE_WILD_SPELL_IDS, RITE_CRAFT_SPELL_IDS, SPELL_RULE_PRESENTATIONS,
} from '../spells/rulePresentation';

const VERSIONS = ['standard', 'upgraded'] as const;
const RUNTIME_IDENTICAL = new Set<string>();
const P2_VERSION_MARKERS: Record<typeof P2_SPELL_AUDIT_IDS[number], readonly [string, string]> = {
  scrying: ['radius-6', 'radius-9'],
  bellBookAndCandle: ['first allied', 'first two allied'],
  processionOfLamps: ['full daily maximum.', 'one adjacent owned hero'],
  dayspring: ['20 ×', '30 ×'],
  theLongOath: ['at most 5 mana', 'at most 9 mana'],
  prospect: ['within 12 tiles', 'within 18 tiles'],
  falseColors: ['true army', 'will not attack'],
  counterweight: ['double damage.', 'without limit'],
  bulwark: ['five wall hexes', 'six wall hexes'],
  standingMirror: ['opposing target', 'you choose'],
  theUnmakingEngine: ['every enemy company', 'destroy both enemy'],
  mirrorHall: ['cannot grant mana', 'tier-5'],
  secondGrave: ['30%', '50%'],
  ashenPall: ['Hex 3', 'Hex 4'],
  theLedgerBalanced: ['is destroyed', 'below half'],
  ossuary: ['Candle-Wisps', 'Bone Choir'],
  stealAway: ['next 3 days', 'next 5 days'],
  theLongSilence: ['pay 3 mana', 'pay 2 mana'],
  harvest: ['20%', '30%'],
  theDebtCalled: ['tomorrow.', 'next 2 days'],
  beastSense: ['within 10 tiles', 'within 16 tiles'],
  illWind: ['Chill 2.', 'Chill 3'],
  rootTheSky: ['for 3 rounds', 'for 4 rounds'],
  beastSovereign: ['each round start.', 'unlimited retaliations'],
  windShear: ['2 positions', '3 positions'],
  theLongGreen: ['18 ×', '26 ×'],
  theWeatherItself: ['for both sides', 'only allies'],
};
const COMPLEX_RULE_WORD_LIMITS: Record<string, number> = {
  // Each must state a triggered multi-company reward plus the split-stack proportionality guard.
  'lastCandle:upgraded': 50,
  // Each must state enemy/allied rates, two caps, Spell Power scaling, minimum loss, and lethality.
  'reckoning:upgraded': 50,
  // These must disclose source inclusion and the resulting order-sensitive Counter amount.
  'overgrow:upgraded': 50,
  // Both complete versions name the summon, exclusions, copied version/Power, and failed-target case.
  'standingMirror:standard': 50,
  'standingMirror:upgraded': 50,
};

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const sentences = (value: string) => value.match(/[.!?](?=\s|$)/g)?.length ?? 0;

describe('all-spell player-rule final acceptance', () => {
  it('covers the complete 124-spell catalog in canonical four-school order', () => {
    expect(SPELL_IDS).toHaveLength(124);
    const presentationOrder = [...RITE_CRAFT_SPELL_IDS, ...GRAVE_WILD_SPELL_IDS];
    expect(Object.keys(SPELL_RULE_PRESENTATIONS)).toEqual(presentationOrder);
    expect(new Set(presentationOrder)).toEqual(new Set(SPELL_IDS));
    expect(presentationOrder.map((id) => SPELLS[id].school)).toEqual([
      ...Array(31).fill('rite'), ...Array(31).fill('craft'),
      ...Array(31).fill('grave'), ...Array(31).fill('wild'),
    ]);
    const rules = SPELL_IDS.flatMap((id) => VERSIONS.map((version) =>
      SPELL_RULE_PRESENTATIONS[id][version]));
    expect(rules).toHaveLength(248);
  });

  it('keeps every structured rule projected exactly and free of developer narration', () => {
    const banned = /(?:resolver|implementation|source functions?|state fields?|legal cast paths?|eligible target combinations?|confirmation|currently|grants no additional effect|stored summary|recorded version|processing order|array order|metadata|rules below|click to|press to|dealt)/i;
    for (const id of SPELL_IDS) for (const version of VERSIONS) {
      const tokens = SPELL_RULE_PRESENTATIONS[id][version];
      const plain = spellRulePlainText(tokens);
      const key = `${id}:${version}`;
      expect(tokens.length, key).toBeGreaterThan(0);
      expect(plain, `${key} catalog projection`).toBe(
        version === 'standard' ? SPELLS[id].base : SPELLS[id].plus,
      );
      expect(plain, `${key} punctuation`).toMatch(/[.!?]$/);
      expect(plain, `${key} player prose`).not.toMatch(banned);
      expect(words(plain), `${key} minimum words`).toBeGreaterThanOrEqual(5);
      expect(words(plain), `${key} scan length`).toBeLessThanOrEqual(
        COMPLEX_RULE_WORD_LIMITS[key] ?? 45,
      );
      expect(sentences(plain), `${key} sentence count`).toBeGreaterThanOrEqual(1);
      expect(sentences(plain), `${key} sentence count`).toBeLessThanOrEqual(4);
      expect((plain.match(/[;:]/g) ?? []).length, `${key} clause punctuation`)
        .toBeLessThanOrEqual(2);
      for (const token of tokens) if (token.kind === 'term') {
        expect(SPELL_LEXICON[token.termId], `${key}:${token.termId}`).toBeDefined();
      }
    }
  });

  it('distinguishes every real upgrade and keeps only known runtime-identical versions equal', () => {
    const identical = SPELL_IDS.filter((id) => spellRulePlainText(
      SPELL_RULE_PRESENTATIONS[id].standard,
    ) === spellRulePlainText(SPELL_RULE_PRESENTATIONS[id].upgraded));
    expect(identical).toEqual([...RUNTIME_IDENTICAL]);
    for (const id of SPELL_IDS) {
      const same = SPELLS[id].base === SPELLS[id].plus;
      expect(same, id).toBe(RUNTIME_IDENTICAL.has(id));
    }
  });

  it.each(P2_SPELL_AUDIT_IDS)('%s explicitly pins its P2 Standard and Upgraded delta', (id) => {
    const [standardMarker, upgradedMarker] = P2_VERSION_MARKERS[id];
    expect(SPELLS[id].base, `${id} Standard marker`).toContain(standardMarker);
    expect(SPELLS[id].plus, `${id} Upgraded marker`).toContain(upgradedMarker);
    expect(SPELLS[id].plus, `${id} distinct versions`).not.toBe(SPELLS[id].base);
  });

  it('pins Bloom to concrete application and the complete reusable lifecycle rule', () => {
    const standard = spellRulePlainText(SPELL_RULE_PRESENTATIONS.bloom.standard);
    const upgraded = spellRulePlainText(SPELL_RULE_PRESENTATIONS.bloom.upgraded);
    expect(standard).toBe('Give one allied company Bloom 3.');
    expect(upgraded).toBe(
      'Give one allied company Bloom 4 and every adjacent allied company Bloom 1.',
    );
    expect(`${standard} ${upgraded}`).not.toMatch(/Spell Power|legal|eligible|confirm|target count/i);
    expect(SPELL_LEXICON.bloom.rule).toMatch(/turn start/i);
    expect(SPELL_LEXICON.bloom.rule).toMatch(/N%.*maximum HP/i);
    expect(SPELL_LEXICON.bloom.rule).toMatch(/never restores a dead unit/i);
    expect(SPELL_LEXICON.bloom.rule).toMatch(/capped at 9/i);
    expect(SPELL_LEXICON.bloom.rule).toMatch(/falls by 1 at turn end/i);
  });

  it('audits all concise definitions, complete native icons, and deterministic aliases', () => {
    const ids = Object.keys(SPELL_LEXICON) as SpellLexiconId[];
    expect(ids).toHaveLength(38);
    expect(Object.keys(SPELL_EFFECT_ICON_MANIFEST)).toHaveLength(38);
    for (const id of ids) {
      const definition = SPELL_LEXICON[id];
      expect(words(definition.rule), `${id} definition length`).toBeGreaterThanOrEqual(6);
      expect(words(definition.rule), `${id} definition length`).toBeLessThanOrEqual(36);
      expect(sentences(definition.rule), `${id} definition sentences`).toBeLessThanOrEqual(3);
      expect(definition.rule, `${id} definition prose`)
        .not.toMatch(/resolver|implementation|state field|source function|click|tooltip/i);
      const icon = SPELL_EFFECT_ICON_MANIFEST[id];
      expect(icon, id).toBeDefined();
      if (!icon) throw new Error(`Missing native lexicon icon: ${id}`);
      expect(icon.file, id).toBe(`assets/icons/effects/${id}.png`);
      expect(readFileSync(`public/${icon.file}`).byteLength, `${id} icon`).toBeGreaterThan(0);
      for (const alias of definition.aliases) {
        const references = tokenizeSpellLexiconText(alias).filter((token) => token.kind === 'term');
        expect(references, `${id}:${alias}`).toEqual([
          { kind: 'term', termId: id, label: alias },
        ]);
      }
    }
    expect(tokenizeSpellLexiconText(
      'A barrow stands in a forest. Its status is quiet beside a counterweight and growthling.',
    )).toEqual([{
      kind: 'text',
      text: 'A barrow stands in a forest. Its status is quiet beside a counterweight and growthling.',
    }]);
    expect(tokenizeSpellLexiconText('A battle enchantment fills an enchantment slot.'))
      .toEqual([
        { kind: 'text', text: 'A ' },
        { kind: 'term', termId: 'battle-enchantment', label: 'battle enchantment' },
        { kind: 'text', text: ' fills an ' },
        { kind: 'term', termId: 'battle-enchantment', label: 'enchantment slot' },
        { kind: 'text', text: '.' },
      ]);
  });

  it('keeps every rules and glossary surface on the semantic shared renderers', () => {
    const spellbook = readFileSync('src/ui/components/Spellbook.tsx', 'utf8');
    expect(spellbook).toContain('SpellRuleText tokens={spellRuleVersions(selected.id).standard}');
    expect(spellbook).toContain('SpellRuleText tokens={spellRuleVersions(selected.id).upgraded}');
    expect(spellbook).not.toMatch(/selectedSpell\.(base|plus)/);
    expect(spellbook).not.toMatch(/eligible target.*available|legal cast paths?|After Cast/i);
    const glossary = readFileSync('src/ui/components/SpellGlossary.tsx', 'utf8');
    for (const contract of ['createPortal', 'onMouseEnter', 'onFocus', 'onClick', 'Escape',
      'pointerdown', 'aria-expanded', 'aria-describedby', 'SpellEffectIcon']) {
      expect(glossary, contract).toContain(contract);
    }
    for (const file of [
      'ContextHelp.tsx', 'InspectionLayer.tsx', 'CombatScreen.tsx', 'CombatUnitPanel.tsx',
      'AdventureHeroDetails.tsx', 'CastleScreen.tsx', 'AdventureSpellTargetDialog.tsx',
      'ActionConfirmationDialog.tsx', 'AdventureItemDialog.tsx', 'ArtifactPaperDoll.tsx',
      'AdventureStructureDialog.tsx', 'EditorGuardianControls.tsx', 'EditorTerrainCanvas.tsx',
    ]) {
      expect(readFileSync(`src/ui/components/${file}`, 'utf8'), file)
        .toMatch(/SemanticSpellText|SpellRuleText|SpellGlossaryReference/);
    }
  });
});
