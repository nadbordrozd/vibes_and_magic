import { describe, expect, it } from 'vitest';
import {
  ORDINARY_SPELL_TERM_DISPOSITIONS, SPELL_LEXICON, SPELL_MECHANICS_COVERAGE,
  spellLexiconTermIdsForText, spellRulePlainText, spellRuleTerm, spellRuleText,
  tokenizeSpellLexiconText,
  validateSpellLexicon,
} from '../spellLexicon';
import { SPELL_IDS, SPELLS } from '../spells';
import { makeArmy } from '../../core/army';
import { createBattle } from '../../core/combat/battle';
import { beginStackTurn, endStackTurn } from '../../core/combat/magicEffects';
import { castStoredSpell } from '../../core/combat/spells';
import { createGame } from '../../core/game';
import { inspectTarget } from '../../ui/inspection';

describe('spell mechanics lexicon', () => {
  it('covers all 68 catalog entries and maps each to the correct runtime domain', () => {
    expect(SPELL_IDS).toHaveLength(68);
    expect(Object.keys(SPELL_MECHANICS_COVERAGE).sort()).toEqual([...SPELL_IDS].sort());
    for (const spellId of SPELL_IDS) {
      const expectedDomain = ['adventure', 'topology'].includes(SPELLS[spellId].kind)
        ? 'adventure:' : 'combat:';
      const mapped = SPELL_MECHANICS_COVERAGE[spellId];
      expect(mapped.resolver, spellId).toMatch(new RegExp(`^${expectedDomain}`));
      expect(mapped.lexicon.length + mapped.ordinary.length, spellId).toBeGreaterThan(0);
      expect(new Set(mapped.lexicon).size, spellId).toBe(mapped.lexicon.length);
      expect(new Set(mapped.ordinary).size, spellId).toBe(mapped.ordinary.length);
    }
  });

  it('gives every reusable and ordinary term an explicit, valid disposition', () => {
    expect(() => validateSpellLexicon()).not.toThrow();
    const usedLexicon = new Set(Object.values(SPELL_MECHANICS_COVERAGE)
      .flatMap((entry) => entry.lexicon));
    const usedOrdinary = new Set(Object.values(SPELL_MECHANICS_COVERAGE)
      .flatMap((entry) => entry.ordinary));
    expect([...usedLexicon].sort()).toEqual(Object.keys(SPELL_LEXICON).sort());
    expect([...usedOrdinary].sort()).toEqual(Object.keys(ORDINARY_SPELL_TERM_DISPOSITIONS).sort());
    for (const definition of Object.values(SPELL_LEXICON)) {
      expect(definition.aliases.every((alias) => alias === alias.toLocaleLowerCase()), definition.id)
        .toBe(true);
      expect(definition.tokens.every((token) => token === token.toLocaleLowerCase()), definition.id)
        .toBe(true);
      expect(new Set(definition.aliases).size, definition.id).toBe(definition.aliases.length);
      expect(new Set(definition.tokens).size, definition.id).toBe(definition.tokens.length);
      expect(definition.visualSubject, definition.id).not.toMatch(/pixel|icon|style|glow|beautiful/i);
    }
    const aliases = Object.values(SPELL_LEXICON).flatMap((definition) => definition.aliases);
    expect(new Set(aliases).size).toBe(aliases.length);
    for (const disposition of Object.values(ORDINARY_SPELL_TERM_DISPOSITIONS)) {
      expect(disposition.examples.length, disposition.id).toBeGreaterThan(0);
      expect(disposition.reason.trim(), disposition.id).not.toBe('');
    }
  });

  it('keeps semantic references when rendering the token contract as plain text', () => {
    const rule = [
      spellRuleText('Give the ally '), spellRuleTerm('bloom', 'Bloom 3'),
      spellRuleText('.'),
    ] as const;
    expect(rule[1]).toEqual({ kind: 'term', termId: 'bloom', label: 'Bloom 3' });
    expect(spellRulePlainText(rule)).toBe('Give the ally Bloom 3.');
    expect(spellRulePlainText([spellRuleTerm('battle-enchantment')]))
      .toBe('Battle enchantment');
    expect(spellLexiconTermIdsForText('Cleanse every Burn counter, then give Bloom 1.'))
      .toEqual(expect.arrayContaining(['cleanse', 'burn', 'counter', 'bloom']));
    const state = createGame({ seed: 53, p1: 'human', p2: 'ai' });
    expect(inspectTarget(state, { kind: 'counter', id: 'bloom' })?.mechanics)
      .toEqual([SPELL_LEXICON.bloom.rule]);
  });

  it('tokenizes catalog prose deterministically with longest aliases first', () => {
    expect(tokenizeSpellLexiconText('A battle enchantment fills an enchantment slot.'))
      .toEqual([
        { kind: 'text', text: 'A ' },
        { kind: 'term', termId: 'battle-enchantment', label: 'battle enchantment' },
        { kind: 'text', text: ' fills an ' },
        { kind: 'term', termId: 'battle-enchantment', label: 'enchantment slot' },
        { kind: 'text', text: '.' },
      ]);
    expect(tokenizeSpellLexiconText('BLOOM counters and Bloom counter.'))
      .toEqual([
        { kind: 'term', termId: 'bloom', label: 'BLOOM counters' },
        { kind: 'text', text: ' and ' },
        { kind: 'term', termId: 'bloom', label: 'Bloom counter' },
        { kind: 'text', text: '.' },
      ]);
    expect(tokenizeSpellLexiconText('The counterweight and growthling remain ordinary.'))
      .toEqual([{ kind: 'text', text: 'The counterweight and growthling remain ordinary.' }]);
    expect(tokenizeSpellLexiconText('A barrow stands in a forest. Its status is quiet.'))
      .toEqual([{ kind: 'text', text: 'A barrow stands in a forest. Its status is quiet.' }]);
  });

  it('pins Bloom application, healing, non-resurrection, cap, and decay to real resolvers', () => {
    const game = createGame({ seed: 5301, p1: 'human', p2: 'human' });
    const battle = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 5 }]),
      makeArmy([{ unitId: 'tinSoldier', count: 5 }]),
      game.players.p1.hero!, game.players.p2.hero!, {
        kind: 'hero', targetId: 'p2-hero', destination: { x: 2, y: 2 },
        attackerHeroId: game.players.p1.hero!.id,
        defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
      }, 5301,
    )[0];
    const target = battle.stacks[0];
    const adjacent = battle.stacks[1];
    adjacent.position = { x: target.position.x + 1, y: target.position.y };
    battle.attackerHero.spellPower = 30;

    castStoredSpell(battle, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'bloom', targetId: target.id,
    }, false);
    // Bloom currently applies its printed fixed amount; it does not call scaledCounter.
    expect(target.counters.bloom).toBe(3);
    expect(adjacent.counters.bloom).toBe(0);

    target.counters.bloom = 8;
    castStoredSpell(battle, 'attacker', {
      type: 'BATTLE_CAST', spellId: 'bloom', targetId: target.id,
    }, true);
    expect(target.counters.bloom).toBe(9);
    expect(adjacent.counters.bloom).toBe(1);

    const countBefore = target.count;
    target.topHp = 1;
    beginStackTurn(battle, target);
    expect(target.count).toBe(countBefore);
    expect(target.topHp).toBeGreaterThan(1);
    endStackTurn(battle, target);
    expect(target.counters.bloom).toBe(8);

    const dead = battle.stacks[2];
    dead.count = 0;
    dead.topHp = 0;
    dead.counters.bloom = 9;
    beginStackTurn(battle, dead);
    expect(dead.count).toBe(0);
    expect(dead.topHp).toBe(0);
  });
});
