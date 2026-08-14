import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { createBattle } from '../../core/combat/battle';
import { addBattleCounter, addTimedEffect } from '../../core/combat/magicEffects';
import { castStoredSpell } from '../../core/combat/spells';
import { createGame } from '../../core/game';
import { castAdventureSpell } from '../../core/game/adventureSpells';
import type { BattleState, GameState, Hero, SpellId } from '../../core/types';
import {
  SPELL_LEXICON, SPELL_MECHANICS_COVERAGE, spellLexiconTermIdsForText, spellRulePlainText,
} from '../spellLexicon';
import { SPELL_IDS, SPELLS } from '../spells';
import {
  GRAVE_WILD_SPELL_IDS, GRAVE_WILD_SPELL_RULES, RITE_CRAFT_SPELL_IDS,
  SPELL_RULE_PRESENTATIONS,
} from '../spells/rulePresentation';

function battle(): BattleState {
  const game = createGame({ seed: 5601, p1: 'human', p2: 'human' });
  return createBattle(
    makeArmy([{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 10 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 10 }]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 5601,
  )[0];
}

function cast(
  state: BattleState,
  side: 'attacker' | 'defender',
  spellId: SpellId,
  plus: boolean,
  extra: Record<string, unknown> = {},
) {
  castStoredSpell(state, side, { type: 'BATTLE_CAST', spellId, ...extra }, plus);
}

function adventure(...spellIds: SpellId[]): [GameState, Hero] {
  const state = createGame({ seed: 5602, p1: 'human', p2: 'human' });
  const hero = state.players.p1.hero!;
  hero.knownSpells = [...spellIds];
  hero.mana = 100;
  hero.movement = 10_000;
  return [state, hero];
}

describe('Grave and Wild structured spell rules', () => {
  it('covers all 62 Grave/Wild spells in canonical school and catalog order', () => {
    expect(GRAVE_WILD_SPELL_IDS).toHaveLength(62);
    expect(new Set(GRAVE_WILD_SPELL_IDS).size).toBe(62);
    const grave = SPELL_IDS.filter((id) => SPELLS[id].school === 'grave');
    const wild = SPELL_IDS.filter((id) => SPELLS[id].school === 'wild');
    expect(grave).toHaveLength(31);
    expect(wild).toHaveLength(31);
    expect(GRAVE_WILD_SPELL_IDS).toEqual([...grave, ...wild]);
    expect(new Set(Object.keys(GRAVE_WILD_SPELL_RULES))).toEqual(new Set(GRAVE_WILD_SPELL_IDS));
  });

  it('completes all 124 catalog projections', () => {
    expect(SPELL_IDS).toHaveLength(124);
    expect(Object.keys(SPELL_RULE_PRESENTATIONS)).toHaveLength(124);
    expect(Object.keys(SPELL_RULE_PRESENTATIONS)).toEqual([
      ...RITE_CRAFT_SPELL_IDS, ...GRAVE_WILD_SPELL_IDS,
    ]);
    for (const id of SPELL_IDS) {
      const rules = SPELL_RULE_PRESENTATIONS[id];
      expect(SPELLS[id].rulePresentation, id).toBe(rules);
      expect(SPELLS[id].base, `${id} Standard`).toBe(spellRulePlainText(rules.standard));
      expect(SPELLS[id].plus, `${id} Upgraded`).toBe(spellRulePlainText(rules.upgraded));
    }
  });

  it('tokenizes every shared Grave and Wild term and bans implementation prose', () => {
    const banned = /(?:legal cast paths?|confirmation|source functions?|state fields?|resolver|implementation timing|durations gain|counter magnitudes gain|percentage effects gain|current Spell Power|currently|grants no additional effect|(?:base|plus|current) face)/i;
    for (const id of GRAVE_WILD_SPELL_IDS) {
      for (const version of ['standard', 'upgraded'] as const) {
        const presentation = GRAVE_WILD_SPELL_RULES[id][version];
        const plain = spellRulePlainText(presentation);
        expect(plain.trim(), `${id} ${version}`).not.toBe('');
        expect(plain, `${id} ${version} punctuation`).toMatch(/[.!?]$/);
        expect(plain, `${id} ${version} prose ban`).not.toMatch(banned);
        const refs = new Set(presentation.flatMap((token) =>
          token.kind === 'term' ? [token.termId] : []));
        for (const termId of refs) expect(SPELL_LEXICON[termId], `${id}:${termId}`).toBeDefined();
        const unstructured = presentation.flatMap((token) => token.kind === 'text'
          ? spellLexiconTermIdsForText(token.text)
          : []);
        expect(unstructured, `${id} ${version} unstructured term occurrences`).toEqual([]);
        const recognized = new Set(spellLexiconTermIdsForText(plain));
        expect([...recognized].filter((termId) => !refs.has(termId)),
          `${id} ${version} unstructured shared terms`).toEqual([]);
      }
    }
  });

  it('pins Bloom scaling and Shed Skin explicit transfer targeting', () => {
    const standard = battle();
    const upgraded = battle();
    standard.attackerHero.spellPower = 99;
    upgraded.attackerHero.spellPower = 99;
    const standardTarget = standard.stacks[0];
    const upgradedTarget = upgraded.stacks[0];
    cast(standard, 'attacker', 'bloom', false, { targetId: standardTarget.id });
    cast(upgraded, 'attacker', 'bloom', true, { targetId: upgradedTarget.id });
    expect(standardTarget.counters.bloom).toBe(9);
    expect(upgradedTarget.counters.bloom).toBe(9);

    expect(spellRulePlainText(GRAVE_WILD_SPELL_RULES.shedSkin.standard))
      .not.toBe(spellRulePlainText(GRAVE_WILD_SPELL_RULES.shedSkin.upgraded));
    for (const plus of [false, true]) {
      const state = battle();
      state.attackerHero.spellPower = 50;
      const target = state.stacks[0];
      addTimedEffect(target, 'blessing', 2, 4, true, 'attacker');
      addTimedEffect(target, 'quicksilver', 2, 2, true, 'attacker');
      const enemy = state.stacks.find((stack) => stack.side === 'defender')!;
      enemy.position = { x: target.position.x + 1, y: target.position.y };
      cast(state, 'attacker', 'shedSkin', plus, {
        targetId: target.id, effectId: `timed:${target.id}:${target.effects[0].id}`,
        ...(plus ? { secondaryTargetId: enemy.id } : {}),
      });
      expect(target.effects.map((effect) => effect.spellId)).toEqual(['quicksilver']);
      expect(target.counters.bloom).toBe(4);
      if (plus) expect(enemy.effects.some((effect) => effect.spellId === 'blessing')).toBe(true);
    }

    const priority = battle();
    const target = priority.stacks[0];
    addBattleCounter(priority, target, 'burn', 2, 'attacker');
    addBattleCounter(priority, target, 'hex', 5, 'attacker');
    const adjacent = priority.stacks.find((stack) => stack.side === 'defender')!;
    adjacent.position = { x: target.position.x + 1, y: target.position.y };
    cast(priority, 'attacker', 'shedSkin', true, {
      targetId: target.id, secondaryTargetId: adjacent.id,
      effectId: `counter:${target.id}:burn`,
    });
    expect(target.counters).toMatchObject({ burn: 0, hex: 5, bloom: 2 });
    const enemyTarget = battle();
    expect(() => cast(enemyTarget, 'attacker', 'shedSkin', true, {
      targetId: enemyTarget.stacks.find((stack) => stack.side === 'defender')!.id,
    })).toThrow(/allied target/);
  });

  it('pins Overgrow source duplication and Sour enchantment inversion', () => {
    const overgrow = battle();
    const source = overgrow.stacks[0];
    const adjacent = overgrow.stacks[1];
    adjacent.position = { x: source.position.x + 1, y: source.position.y };
    addBattleCounter(overgrow, source, 'hex', 2, 'attacker');
    cast(overgrow, 'attacker', 'overgrow', false, {
      effectId: `counter:${source.id}:hex`,
    });
    expect(source.counters.hex).toBe(4);
    expect(adjacent.counters.hex).toBe(2);

    const sour = battle();
    cast(sour, 'defender', 'standardOfDawn', false);
    const enchantment = sour.enchantments.defender[0];
    cast(sour, 'attacker', 'sour', true, {
      effectId: `enchantment:defender:${enchantment.id}`,
    });
    expect(sour.enchantments.defender).toEqual([]);
    for (const enemy of sour.stacks.filter((stack) => stack.side === 'defender')) {
      expect(enemy.counters.hex).toBe(3);
    }
  });

  it('pins City-only Wild Growth and unconstrained-distance Cold Road', () => {
    const [growthState, growthHero] = adventure('wildGrowth');
    const city = growthState.castles.find((candidate) => candidate.owner === growthHero.owner)!;
    castAdventureSpell(growthState, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'wildGrowth', castleId: city.id,
    });
    expect(city.growthEffects.at(-1)).toMatchObject({
      multiplier: 1.5, expiresWeek: growthState.week,
    });

    const [roadState, roadHero] = adventure('coldRoad');
    const origin = { x: 0, y: 0 };
    const destination = {
      x: roadState.map.terrain[0].length - 1,
      y: roadState.map.terrain.length - 1,
    };
    roadHero.position = origin;
    roadState.map.terrain[origin.y][origin.x] = 'barrowfield';
    roadState.map.terrain[destination.y][destination.x] = 'barrowfield';
    roadState.players.p1.explored.push(`${destination.x},${destination.y}`);
    castAdventureSpell(roadState, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'coldRoad', target: destination,
    });
    expect(roadHero.position).toEqual(destination);
  });

  it('pins distinct executable Hedgerow March versions', () => {
    expect(spellRulePlainText(GRAVE_WILD_SPELL_RULES.hedgerowMarch.standard))
      .not.toBe(spellRulePlainText(GRAVE_WILD_SPELL_RULES.hedgerowMarch.upgraded));
    const standard = battle();
    const upgraded = battle();
    cast(standard, 'attacker', 'hedgerowMarch', false);
    cast(upgraded, 'attacker', 'hedgerowMarch', true);
    expect(standard.enchantments.attacker[0]).toMatchObject({
      spellId: 'hedgerowMarch', upgraded: false, multiplier: 1,
    });
    expect(upgraded.enchantments.attacker[0]).toMatchObject({
      spellId: 'hedgerowMarch', upgraded: true, multiplier: 1,
    });
    expect(SPELL_MECHANICS_COVERAGE.hedgerowMarch.lexicon)
      .toEqual(['battle-enchantment', 'phase']);
    expect(SPELL_MECHANICS_COVERAGE.shedSkin.lexicon)
      .toEqual(['counter', 'timed-effect', 'bloom', 'damage-link']);
  });
});
