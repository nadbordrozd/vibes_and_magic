import { describe, expect, it } from 'vitest';
import { SPELL_IDS } from '../../content/spells';
import { makeArmy } from '../../core/army';
import { createBattle } from '../../core/combat/battle';
import { addTimedEffect } from '../../core/combat/magicEffects';
import { legalCombatItemUses } from '../../core/combat/items';
import { canCastSpell, legalSpellCasts } from '../../core/combat/spells';
import { createGame } from '../../core/game';
import type { BattleState, SpellId } from '../../core/types';
import {
  backCombatTarget, beginItemTargeting, beginSpellTargeting,
  chooseCombatTarget, combatTargetChoices, combatTargetCoverageFamilies,
  combatTargetStage, confirmedCombatTargetAction, legalCombatPlacements,
  requiredCombatPositions, toggleCombatPosition,
  unsupportedCombatTargetFields,
} from '../combatTargeting';

function targetingBattle(): BattleState {
  const game = createGame({ seed: 661, p1: 'human', p2: 'human' });
  const [battle] = createBattle(
    makeArmy([
      { unitId: 'yeoman', count: 10 },
      { unitId: 'longbowman', count: 6 },
      { unitId: 'oriflammeWyvern', count: 2 },
    ]),
    makeArmy([
      { unitId: 'tinSoldier', count: 12 },
      { unitId: 'woodenColossus', count: 2 },
    ]),
    game.players.p1.hero!, game.players.p2.hero!,
    {
      kind: 'hero', targetId: game.players.p2.hero!.id,
      destination: { x: 6, y: 6 }, attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, 661,
  );
  battle.currentStackId = 'attacker-0';
  battle.attackerHero.knownSpells = [...SPELL_IDS];
  battle.attackerHero.mana = 200;
  battle.stacks[0].counters.bloom = 2;
  battle.stacks[3].counters.hex = 3;
  addTimedEffect(battle.stacks[1], 'blessing', 2, 1, true, 'attacker');
  battle.enchantments.attacker = [
    { id: 'standard-a', spellId: 'standardOfDawn', side: 'attacker', multiplier: 1, upgraded: false },
    { id: 'forgefire-a', spellId: 'forgefire', side: 'attacker', multiplier: 1, upgraded: false },
  ];
  battle.enchantments.defender = [
    { id: 'last-candle-d', spellId: 'lastCandle', side: 'defender', multiplier: 1, upgraded: false },
  ];
  return battle;
}

function chooseFirstStackStages(battle: BattleState, spellId: SpellId) {
  let draft = beginSpellTargeting(battle, spellId)!;
  while (combatTargetStage(battle, draft) === 'targetId'
      || combatTargetStage(battle, draft) === 'secondaryTargetId') {
    const stage = combatTargetStage(battle, draft);
    const field = stage as 'targetId' | 'secondaryTargetId';
    draft = chooseCombatTarget(draft, field, combatTargetChoices(draft, field)[0]);
  }
  return draft;
}

describe('explicit combat targeting', () => {
  it('keeps the executable target-shape family audit exhaustive', () => {
    expect(combatTargetCoverageFamilies()).toEqual([
      'effect-operation', 'enchantment-replacement', 'global-confirm',
      'hex-placement', 'multi-stage', 'parameter-choice', 'unit-target',
    ]);
  });

  it('requires explicit primary and secondary Rally+ targets before confirmation', () => {
    const battle = targetingBattle();
    battle.attackerHero.upgradedSpells.push('rally');
    let draft = beginSpellTargeting(battle, 'rally')!;
    expect(combatTargetStage(battle, draft)).toBe('targetId');
    const primary = combatTargetChoices(draft, 'targetId')[0];
    draft = chooseCombatTarget(draft, 'targetId', primary);
    expect(combatTargetStage(battle, draft)).toBe('secondaryTargetId');
    const secondary = combatTargetChoices(draft, 'secondaryTargetId')[0];
    expect(secondary).not.toBe(primary);
    draft = chooseCombatTarget(draft, 'secondaryTargetId', secondary);
    expect(combatTargetStage(battle, draft)).toBe('confirm');
    expect(confirmedCombatTargetAction(battle, draft)).toMatchObject({
      type: 'BATTLE_CAST', spellId: 'rally', targetId: primary,
      secondaryTargetId: secondary,
    });
    expect(combatTargetStage(battle, backCombatTarget(draft))).toBe('secondaryTargetId');
  });

  it('reports upgraded multi-target spells unavailable when a complete choice is impossible', () => {
    const battle = targetingBattle();
    battle.attackerHero.upgradedSpells.push('rally', 'reflect');
    battle.stacks.filter((stack) => stack.side === 'attacker').slice(1)
      .forEach((stack) => { stack.count = 0; });
    battle.stacks.filter((stack) => stack.count > 0).slice(1)
      .forEach((stack) => { stack.count = 0; });
    expect(canCastSpell(battle, 'rally')).toBe(false);
    expect(canCastSpell(battle, 'reflect')).toBe(false);
    expect(beginSpellTargeting(battle, 'rally')).toBeNull();
    expect(beginSpellTargeting(battle, 'reflect')).toBeNull();
  });

  it('stages effect, two Reflect+ recipients, and invalid preselected effects', () => {
    const battle = targetingBattle();
    battle.attackerHero.upgradedSpells.push('reflect');
    let draft = beginSpellTargeting(battle, 'reflect', 'counter:missing:burn')!;
    expect(combatTargetStage(battle, draft)).toBe('effectId');
    const effect = combatTargetChoices(draft, 'effectId')[0];
    draft = chooseCombatTarget(draft, 'effectId', effect);
    expect(combatTargetStage(battle, draft)).toBe('targetId');
    draft = chooseCombatTarget(draft, 'targetId', combatTargetChoices(draft, 'targetId')[0]);
    expect(combatTargetStage(battle, draft)).toBe('secondaryTargetId');
    draft = chooseCombatTarget(
      draft, 'secondaryTargetId', combatTargetChoices(draft, 'secondaryTargetId')[0],
    );
    expect(confirmedCombatTargetAction(battle, draft)).toMatchObject({
      spellId: 'reflect', effectId: effect,
    });
  });

  it('asks which occupied enchantment slot to replace', () => {
    const battle = targetingBattle();
    let draft = beginSpellTargeting(battle, 'standardOfDawn')!;
    expect(combatTargetStage(battle, draft)).toBe('replaceEnchantment');
    expect(combatTargetChoices(draft, 'replaceEnchantment')).toEqual([0, 1]);
    draft = chooseCombatTarget(draft, 'replaceEnchantment', 1);
    expect(confirmedCombatTargetAction(battle, draft)).toMatchObject({
      spellId: 'standardOfDawn', replaceEnchantment: 1,
    });
  });

  it('collects distinct legal wall hexes and never mutates battle while cancelling', () => {
    const battle = targetingBattle();
    const before = structuredClone(battle);
    let draft = beginSpellTargeting(battle, 'wallOfTheMaker')!;
    expect(combatTargetStage(battle, draft)).toBe('positions');
    const required = requiredCombatPositions(battle, draft.source);
    const placements = legalCombatPlacements(battle);
    for (const position of placements.slice(0, required)) {
      draft = toggleCombatPosition(battle, draft, position);
    }
    expect(new Set(draft.positions.map((position) => `${position.x},${position.y}`)).size)
      .toBe(required);
    expect(combatTargetStage(battle, draft)).toBe('confirm');
    expect(confirmedCombatTargetAction(battle, draft)).toMatchObject({
      spellId: 'wallOfTheMaker', positions: draft.positions,
    });
    expect(battle).toEqual(before);
  });

  it('inherits multistage target shapes for Echo and stored items', () => {
    const battle = targetingBattle();
    battle.lastSpellCast = { spellId: 'borrowShape', plus: true, manaSpent: 5 };
    expect(combatTargetStage(battle, beginSpellTargeting(battle, 'echo')!)).toBe('targetId');

    battle.attackerHero.inventory[0] = {
      id: 'spellScroll', storedSpellId: 'hourglassCrack', plus: true,
    };
    let item = beginItemTargeting(battle, 0)!;
    expect(combatTargetStage(battle, item)).toBe('targetId');
    item = chooseCombatTarget(item, 'targetId', combatTargetChoices(item, 'targetId')[0]);
    expect(combatTargetStage(battle, item)).toBe('skipRound');
    item = chooseCombatTarget(item, 'skipRound', combatTargetChoices(item, 'skipRound')[1]);
    expect(confirmedCombatTargetAction(battle, item)).toMatchObject({
      type: 'BATTLE_USE_ITEM', inventorySlot: 0, skipRound: battle.round + 2,
    });
  });

  it('requires explicit enchantment item selection and global item confirmation', () => {
    const battle = targetingBattle();
    battle.attackerHero.inventory[0] = { id: 'powderOfUnmaking' };
    let item = beginItemTargeting(battle, 0)!;
    expect(combatTargetStage(battle, item)).toBe('effectId');
    const choices = combatTargetChoices(item, 'effectId');
    expect(choices).toHaveLength(3);
    item = chooseCombatTarget(item, 'effectId', choices[2]);
    expect(combatTargetStage(battle, item)).toBe('confirm');

    battle.attackerHero.inventory[0] = { id: 'bannerWhistle' };
    item = beginItemTargeting(battle, 0)!;
    expect(combatTargetStage(battle, item)).toBe('confirm');
    expect(confirmedCombatTargetAction(battle, item)).toMatchObject({
      type: 'BATTLE_USE_ITEM', inventorySlot: 0,
    });
  });

  it('enumerates every presently available spell and item without silent defaults', () => {
    const battle = targetingBattle();
    battle.attackerHero.skills.twicetold = 3;
    battle.attackerHero.skills.alchemist = 3;
    battle.lastSpellCast = { spellId: 'rally', plus: true, manaSpent: 5 };
    const casts = legalSpellCasts(battle);
    expect(unsupportedCombatTargetFields(casts)).toEqual([]);
    for (const spellId of battle.attackerHero.knownSpells) {
      const options = casts.filter((action) => action.spellId === spellId);
      if (options.length) expect(beginSpellTargeting(battle, spellId), spellId).not.toBeNull();
    }
    battle.attackerHero.inventory = [
      { id: 'potionOfVigor' }, { id: 'graveDust' }, { id: 'chalkOfWalls' },
      { id: 'waxSeal' }, { id: 'bannerWhistle' }, { id: 'bottledEcho' },
    ];
    const uses = legalCombatItemUses(battle);
    expect(unsupportedCombatTargetFields(uses)).toEqual([]);
    for (const slot of [...new Set(uses.map((action) => action.inventorySlot))]) {
      expect(beginItemTargeting(battle, slot), `inventory ${slot}`).not.toBeNull();
    }
  });

  it('keeps wide-company footprints as one target identity', () => {
    const battle = targetingBattle();
    const wide = battle.stacks.find((stack) => stack.unitId === 'oriflammeWyvern')!;
    const draft = beginSpellTargeting(battle, 'rally')!;
    expect(combatTargetChoices(draft, 'targetId')).toContain(wide.id);
    const selected = chooseCombatTarget(draft, 'targetId', wide.id);
    expect(confirmedCombatTargetAction(battle, selected)).toMatchObject({ targetId: wide.id });
  });

  it('can advance every direct unit-target family to review', () => {
    const battle = targetingBattle();
    battle.attackerHero.upgradedSpells.push('borrowShape');
    for (const spellId of ['blessing', 'forgeSpark', 'borrowShape'] as SpellId[]) {
      const draft = chooseFirstStackStages(battle, spellId);
      expect(combatTargetStage(battle, draft), spellId).toBe('confirm');
    }
  });
});
