import { describe, expect, it } from 'vitest';
import { makeArmy } from '../../core/army';
import { createBattle } from '../../core/combat/battle';
import { addBattleCounter, addTimedEffect } from '../../core/combat/magicEffects';
import { runAttackPipeline } from '../../core/combat/pipeline';
import { castStoredSpell } from '../../core/combat/spells';
import { createGame } from '../../core/game';
import { castAdventureSpell } from '../../core/game/adventureSpells';
import type { BattleState, GameState, Hero, SpellId } from '../../core/types';
import {
  SPELL_LEXICON, SPELL_MECHANICS_COVERAGE, spellLexiconTermIdsForText,
  spellRulePlainText,
} from '../spellLexicon';
import { SPELL_IDS, SPELLS } from '../spells';
import {
  RITE_CRAFT_SPELL_IDS, RITE_CRAFT_SPELL_RULES,
} from '../spells/rulePresentation';

function battle(): BattleState {
  const game = createGame({ seed: 5501, p1: 'human', p2: 'human' });
  return createBattle(
    makeArmy([{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 10 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 10 }]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 5501,
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
  const state = createGame({ seed: 5502, p1: 'human', p2: 'human' });
  const hero = state.players.p1.hero!;
  hero.knownSpells = [...spellIds];
  hero.mana = 100;
  hero.movement = 10_000;
  return [state, hero];
}

describe('Rite and Craft structured spell rules', () => {
  it('covers every current Rite/Craft spell in canonical school and catalog order', () => {
    expect(RITE_CRAFT_SPELL_IDS).toHaveLength(62);
    expect(new Set(RITE_CRAFT_SPELL_IDS).size).toBe(62);
    const rite = SPELL_IDS.filter((id) => SPELLS[id].school === 'rite');
    const craft = SPELL_IDS.filter((id) => SPELLS[id].school === 'craft');
    expect(rite).toHaveLength(31);
    expect(craft).toHaveLength(31);
    expect(RITE_CRAFT_SPELL_IDS).toEqual([...rite, ...craft]);
    expect(new Set(Object.keys(RITE_CRAFT_SPELL_RULES))).toEqual(new Set(RITE_CRAFT_SPELL_IDS));
  });

  it('keeps Standard and Upgraded catalog strings as exact deterministic projections', () => {
    for (const id of RITE_CRAFT_SPELL_IDS) {
      const rules = RITE_CRAFT_SPELL_RULES[id];
      expect(SPELLS[id].rulePresentation, id).toBe(rules);
      expect(SPELLS[id].base, `${id} Standard`).toBe(spellRulePlainText(rules.standard));
      expect(SPELLS[id].plus, `${id} Upgraded`).toBe(spellRulePlainText(rules.upgraded));
      expect(spellRulePlainText(rules.standard), `${id} Standard repeat`)
        .toBe(spellRulePlainText(rules.standard));
      expect(spellRulePlainText(rules.upgraded), `${id} Upgraded repeat`)
        .toBe(spellRulePlainText(rules.upgraded));
    }
  });

  it('retains every authored shared term ID and bans opaque implementation prose', () => {
    const banned = /(?:legal cast paths?|confirmation|source functions?|state fields?|resolver|implementation timing|durations gain|counter magnitudes gain|percentage effects gain|current Spell Power|currently|grants no additional effect|(?:base|plus|current) face)/i;
    for (const id of RITE_CRAFT_SPELL_IDS) {
      for (const version of ['standard', 'upgraded'] as const) {
        const presentation = RITE_CRAFT_SPELL_RULES[id][version];
        const plain = spellRulePlainText(presentation);
        expect(plain.trim(), `${id} ${version}`).not.toBe('');
        expect(plain, `${id} ${version} punctuation`).toMatch(/[.!?]$/);
        expect(plain, `${id} ${version} prose ban`).not.toMatch(banned);
        const refs = new Set(presentation.flatMap((token) =>
          token.kind === 'term' ? [token.termId] : []));
        for (const termId of refs) expect(SPELL_LEXICON[termId], `${id}:${termId}`).toBeDefined();
        const unstructured = presentation.flatMap((token) => token.kind === 'text'
          ? spellLexiconTermIdsForText(token.text).filter((termId) =>
            !(id === 'wallOfTheMaker' && termId === 'hex'))
          : []);
        expect(unstructured, `${id} ${version} unstructured term occurrences`).toEqual([]);
        const recognized = spellLexiconTermIdsForText(plain).filter((termId) =>
          SPELL_MECHANICS_COVERAGE[id].lexicon.includes(termId) || termId === 'spell-power');
        expect([...new Set(recognized)].filter((termId) => !refs.has(termId)),
          `${id} ${version} unstructured shared terms`).toEqual([]);
      }
    }
  });

  it('retunes Standing Mirror and executes Standard of Dawn distinctly', () => {
    for (const id of ['standingMirror'] as const) {
      expect(spellRulePlainText(RITE_CRAFT_SPELL_RULES[id].upgraded), id)
        .not.toBe(spellRulePlainText(RITE_CRAFT_SPELL_RULES[id].standard));
    }
    const standard = battle();
    const upgraded = battle();
    cast(standard, 'defender', 'standardOfDawn', false);
    cast(upgraded, 'defender', 'standardOfDawn', true);
    standard.stacks[0].count = 1;
    upgraded.stacks[0].count = 1;
    standard.stacks[1].morale = 50;
    upgraded.stacks[1].morale = 50;
    standard.stacks[2].position = { x: 1, y: standard.stacks[0].position.y };
    upgraded.stacks[2].position = { x: 1, y: upgraded.stacks[0].position.y };
    runAttackPipeline(standard, standard.stacks[2].id, standard.stacks[0].id);
    runAttackPipeline(upgraded, upgraded.stacks[2].id, upgraded.stacks[0].id);
    expect(upgraded.stacks[1].morale).toBe(standard.stacks[1].morale);
    expect(upgraded.stacks[1].morale).toBeLessThan(50);
    expect(upgraded.stacks[2].bonusActions).toBeGreaterThan(standard.stacks[2].bonusActions);

    const standardMirror = battle();
    const upgradedMirror = battle();
    cast(standardMirror, 'defender', 'standingMirror', false);
    cast(upgradedMirror, 'defender', 'standingMirror', true);
    const mirrorShape = (state: BattleState) => {
      const mirror = state.stacks.find((stack) => stack.unitId === 'standingMirror')!;
      return {
        unitId: mirror.unitId, count: mirror.count, topHp: mirror.topHp,
        position: mirror.position, effects: mirror.effects, temporaryAbilities: mirror.temporaryAbilities,
      };
    };
    expect(mirrorShape(upgradedMirror)).not.toEqual(mirrorShape(standardMirror));
  });

  it('pins Unmake to one selected effect and Oathbind to blocking only new company effects', () => {
    const state = battle();
    cast(state, 'defender', 'standardOfDawn', false);
    const enchantment = state.enchantments.defender[0];
    addBattleCounter(state, state.stacks[1], 'burn', 4, 'defender');
    cast(state, 'attacker', 'unmake', true, {
      effectId: `enchantment:defender:${enchantment.id}`,
    });
    expect(state.enchantments.defender).toEqual([]);
    expect(state.stacks[1].counters.burn).toBe(4);

    const target = state.stacks[2];
    addTimedEffect(target, 'blessing', 2, 1, true, 'defender');
    cast(state, 'attacker', 'oathbind', true, { targetId: target.id });
    addBattleCounter(state, target, 'hex', 3, 'attacker');
    addTimedEffect(target, 'quicksilver', 2, 3, true, 'defender');
    expect(target.effects.some((effect) => effect.spellId === 'blessing')).toBe(true);
    expect(target.effects.some((effect) => effect.spellId === 'quicksilver')).toBe(false);
    expect(target.counters.hex).toBe(0);
  });

  it('pins inclusive Gate duration, mine suppression, and Census records', () => {
    const [state, hero] = adventure('gate', 'saltTheVein', 'census');
    const first = { ...hero.position };
    const second = { x: first.x, y: first.y + 1 };
    state.players.p1.explored.push(`${second.x},${second.y}`);
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'gate', target: first, secondaryTarget: second,
    });
    expect(state.mapEffects.find((effect) => effect.kind === 'passage')?.expiresDay)
      .toBe(state.day + 1);

    const mine = state.map.objects.find((object) => object.kind === 'mine')!;
    if (mine.kind !== 'mine') throw new Error('fixture');
    mine.owner = 'p2';
    state.players.p1.explored.push(`${mine.position.x},${mine.position.y}`);
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'saltTheVein', targetId: mine.id,
    });
    expect(mine.suppressedUntilDay).toBe(state.day + 4);
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'census' });
    expect(state.players.p1.adventureEffects).toMatchObject({
      censusUntilDay: state.day, censusShowsMovement: false,
    });
  });

  it('pins Upgraded Summon Skiff to the nearest unoccupied boat regardless of owner', () => {
    const state = createGame({
      seed: 5503, mapId: 'torn-sound', p1: 'human', p2: 'human',
    });
    const hero = state.players.p1.hero!;
    hero.knownSpells = ['summonSkiff'];
    hero.upgradedSpells = ['summonSkiff'];
    hero.mana = 100;
    hero.movement = 10_000;
    state.map.objects.push({
      id: 'borrowed-skiff', kind: 'boat', position: { x: 0, y: 0 },
      owner: 'p2', occupiedBy: null,
    });
    const boats = state.map.objects.filter((object) => object.kind === 'boat');
    boats.forEach((boat, index) => {
      if (boat.kind === 'boat') {
        boat.owner = index === 0 ? 'p2' : 'p1';
        boat.occupiedBy = index === 0 ? null : 'someone-else';
      }
    });
    const chosen = boats[0];
    const before = { ...chosen.position };
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'summonSkiff' });
    expect(chosen.position).not.toEqual(before);
    expect(chosen.kind === 'boat' ? chosen.owner : null).toBe('p2');
  });
});
