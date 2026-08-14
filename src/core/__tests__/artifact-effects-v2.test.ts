import { describe, expect, it } from 'vitest';
import {
  ARTIFACTS, ARTIFACT_ASSET_REQUIREMENTS, BURDEN_ARTIFACT_IDS,
  CHARM_ARTIFACT_IDS, DOC63_ARTIFACT_IDS, DOC65_ARTIFACT_IDS, RELIC_ARTIFACT_IDS,
  validateArtifactAssets, validateArtifacts,
} from '../../content/artifacts';
import { registeredArtifactEffectHandlers } from '../../content/v2/registries';
import { V2_ARTIFACT_EFFECT_TAGS } from '../../content/v2/schema';
import { makeArmy } from '../army';
import {
  addArtifact, artifactSetProgress, canUnequipArtifact, conditionalArtifactStatBonus,
  equipArtifact, forcedMoveDistance, markBurdenRemovalReady, maximumDebtSlots,
  resolveWeeklyArtifactInstances, unequipArtifact,
} from '../artifacts';
import { applyBattleAction, createBattle, legalBattleActions } from '../combat/battle';
import { applyImpactDamage, applySpellImpactDamage, mindControlCompany } from '../combat/primitives';
import {
  addBattleCounter, addSpellCounter, endStackTurn, healWithoutResurrection,
} from '../combat/magicEffects';
import { applyRoundMorale } from '../combat/round';
import { effectiveResonances, isUpgraded, spellManaCost } from '../combat/spellModifiers';
import { castStoredSpell, legalSpellCasts } from '../combat/spells';
import { applyEffectTwister } from '../combat/twisters';
import { createGame } from '../game';
import { maximumMana } from '../heroBehaviors';
import { heroVisibleToPlayer } from '../map/visibility';
import type { BattleState } from '../types';

function fixture(seed = 713): BattleState {
  const game = createGame({ seed, p1: 'human', p2: 'human' });
  const attacker = game.players.p1.hero!; const defender = game.players.p2.hero!;
  attacker.knownSpells = ['rally', 'forgeSpark', 'gale', 'clockworkEscort', 'thicket',
    'standardOfDawn', 'forgefire', 'ironclad'];
  attacker.mana = 99;
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 10 }, { unitId: 'longbowman', count: 5 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 10 }, { unitId: 'stuffedSentinel', count: 5 }]),
    attacker, defender, {
      kind: 'hero', targetId: defender.id, destination: defender.position,
      attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2',
    }, seed,
  );
  battle.obstacles = [];
  return battle;
}

describe('doc-63 artifact effect dispatch', () => {
  it('pins the 148-definition final catalog and every new tag consumer', () => {
    expect(() => validateArtifacts()).not.toThrow();
    expect(Object.keys(ARTIFACTS)).toHaveLength(148);
    expect(CHARM_ARTIFACT_IDS).toHaveLength(44);
    expect(RELIC_ARTIFACT_IDS).toHaveLength(45);
    expect(BURDEN_ARTIFACT_IDS).toHaveLength(13);
    expect(DOC63_ARTIFACT_IDS).toHaveLength(20);
    expect(DOC65_ARTIFACT_IDS).toHaveLength(38);
    const tags = new Set([...DOC63_ARTIFACT_IDS, ...DOC65_ARTIFACT_IDS]
      .flatMap((id) => ARTIFACTS[id].effects));
    expect([...tags].filter((tag) => V2_ARTIFACT_EFFECT_TAGS.includes(tag as never)))
      .toHaveLength(V2_ARTIFACT_EFFECT_TAGS.length);
    const handlers = registeredArtifactEffectHandlers();
    for (const id of [...DOC63_ARTIFACT_IDS, ...DOC65_ARTIFACT_IDS]) for (const [tag, metadata] of
      Object.entries(ARTIFACTS[id].effectMetadata ?? {})) {
      expect(metadata.handlerId).toBe(tag);
      expect(handlers.get(metadata.handlerId)?.stage).toBe(metadata.stage);
    }
  });

  it('authors all fifty-eight literal subjects and passes development and release asset gates', () => {
    expect(ARTIFACT_ASSET_REQUIREMENTS).toHaveLength(58);
    expect(new Set(ARTIFACT_ASSET_REQUIREMENTS.map((entry) => entry.visualSubject))).toHaveLength(58);
    expect(() => validateArtifactAssets('development')).not.toThrow();
    expect(() => validateArtifactAssets('release')).not.toThrow();
  });

  it('applies counter scaling, the printed Hex cap, and Burn no-decay through effect tags', () => {
    const battle = fixture();
    battle.attackerHero.spellPower = 9;
    battle.attackerHero.artifacts.equipment.amulet = { id: 'ninePipCord' };
    battle.attackerHero.artifacts.equipment.ring1 = { id: 'hexwrightsTally' };
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'bellows' };
    const enemy = battle.stacks.find((stack) => stack.id === 'defender-0')!;
    addSpellCounter(battle, enemy, 'hex', 10, 'attacker');
    expect(enemy.counters.hex).toBe(13);
    addSpellCounter(battle, enemy, 'hex', 10, 'attacker');
    expect(enemy.counters.hex).toBe(15);
    const ally = battle.stacks.find((stack) => stack.id === 'attacker-0')!;
    addSpellCounter(battle, enemy, 'burn', 4, 'attacker', { scalesWithSpellPower: false });
    addSpellCounter(battle, ally, 'burn', 4, 'defender', { scalesWithSpellPower: false });
    endStackTurn(battle, enemy);
    endStackTurn(battle, ally);
    expect(enemy.counters.burn).toBe(4);
    expect(ally.counters.burn).toBe(3);

    const exhausted = battle.stacks.find((stack) => stack.id === 'defender-1')!;
    addBattleCounter(battle, exhausted, 'burn', 1, 'attacker', { fixedAmount: true });
    battle.attackerHero.artifacts.equipment.misc1 = null;
    endStackTurn(battle, exhausted);
    expect(exhausted.counters.burn).toBe(0);
    expect(exhausted.counterSources?.burn).toBeUndefined();
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'bellows' };
    addBattleCounter(battle, exhausted, 'burn', 2, 'defender', { fixedAmount: true });
    endStackTurn(battle, exhausted);
    expect(exhausted.counters.burn).toBe(1);

    addBattleCounter(battle, enemy, 'burn', 5, 'attacker', { fixedAmount: true });
    addBattleCounter(battle, enemy, 'burn', 1, 'defender', { fixedAmount: true });
    expect(enemy.counters.burn).toBe(9);
    expect(enemy.counterSources?.burn).toBe('attacker');
  });

  it('bounds mana and casting exceptions without opening a third cast', () => {
    const game = createGame({ seed: 714, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    const ordinary = maximumMana(hero);
    hero.artifacts.equipment.weapon = { id: 'splitReed' };
    expect(maximumMana(hero)).toBe(Math.floor(ordinary / 2));
    const upgradedBattle = fixture(714);
    upgradedBattle.attackerHero.artifacts.equipment.weapon = { id: 'splitReed' };
    expect(isUpgraded(upgradedBattle, upgradedBattle.attackerHero, 'rally')).toBe(true);
    let battle = fixture(714);
    battle.attackerHero.artifacts.equipment.amulet = { id: 'ironTongue' };
    expect(legalBattleActions(battle).some((action) => action.type === 'BATTLE_CAST')).toBe(false);
    battle.round = 2;
    expect(spellManaCost(battle, 'attacker', battle.attackerHero, 'rally')).toBeGreaterThanOrEqual(1);
    battle = fixture(715);
    battle.attackerHero.artifacts.equipment.amulet = { id: 'secondSunrise' };
    expect(spellManaCost(battle, 'attacker', battle.attackerHero, 'rally')).toBe(0);
    battle.attackerHero.artifacts.equipment.weapon = { id: 'graftedHand' };
    battle = applyBattleAction(battle, { type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0' });
    battle = applyBattleAction(battle, { type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0' });
    expect(() => applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0',
    })).toThrow();
  });

  it('modifies impact, healing, control, summons, and deterministic round-start counters', () => {
    const battle = fixture(716);
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'ashCenser' };
    battle.spellResolutionSource = {
      kind: 'hero', spellPower: 2, spellId: 'forgeSpark', skippedRecipientIds: [],
    };
    const target = battle.stacks.find((stack) => stack.id === 'defender-0')!;
    const impact = applyImpactDamage(battle, {
      targetId: target.id, sourceSide: 'attacker', base: 8, coefficient: 4, spellPower: 2,
    });
    expect(impact).toMatchObject({ ok: true, value: { damage: 24 } });
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'loomSmallRepairs' };
    const ally = battle.stacks.find((stack) => stack.id === 'attacker-0')!;
    ally.count = 1; ally.topHp = 1;
    expect(healWithoutResurrection(ally, 20, battle)).toBeGreaterThanOrEqual(3);
    battle.attackerHero.artifacts.equipment.ring1 = { id: 'puppeteersThimble' };
    expect(mindControlCompany(battle, target.id, 'attacker', 2, 9999)).toMatchObject({ ok: true });
    expect(target.controlExpiresRound).toBe(battle.round + 3);
    expect(target.controlRetainsEffects).toBe(true);
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'beastCallersCord' };
    let summoned = applyBattleAction(battle, { type: 'BATTLE_CAST', spellId: 'clockworkEscort' });
    const company = summoned.stacks.find((stack) => stack.id.startsWith('summon-attacker'))!;
    expect(company).toMatchObject({ summoned: true, summonSpeedBonus: 1 });
    expect(company.counters.bloom).toBe(2);
    summoned.attackerHero.artifacts.equipment.misc1 = { id: 'whistlingKettle' };
    const enemy = summoned.stacks.find((stack) => stack.side === 'defender')!;
    enemy.counters.chill = 3;
    applyRoundMorale(summoned);
    expect(enemy.counters.chill).toBe(6);
  });

  it('expands persistent created hexes and owns resonance without changing the opponent', () => {
    let battle = fixture(719);
    battle.attackerHero.artifacts.equipment.ring1 = { id: 'sappersChalk' };
    const thicket = legalSpellCasts(battle).find((action) => action.spellId === 'thicket')!;
    expect(thicket.positions).toHaveLength(5);
    battle = applyBattleAction(battle, thicket);
    expect(battle.tiles.filter((tile) => tile.type === 'undergrowth')).toHaveLength(5);
    expect(battle.tiles.every((tile) => tile.duration === -1)).toBe(true);
    battle.attackerHero.artifacts.equipment.amulet = { id: 'discordantFork' };
    battle.resonance = 'wild';
    expect(effectiveResonances(battle, battle.attackerHero)).toContain('wild');
    expect(effectiveResonances(battle, battle.defenderHero!)).not.toContain('wild');
  });

  it('holds three protected enchantments while Upgraded Unmake remains an answer', () => {
    const battle = fixture(720);
    battle.attackerHero.artifacts.equipment.boots = { id: 'tuningPeg' };
    for (const spellId of ['standardOfDawn', 'forgefire', 'ironclad'] as const) {
      castStoredSpell(battle, 'attacker', { type: 'BATTLE_CAST', spellId }, false);
    }
    expect(battle.enchantments.attacker).toHaveLength(3);
    const target = `enchantment:attacker:${battle.enchantments.attacker[0].id}`;
    expect(() => applyEffectTwister(battle, 'defender', {
      type: 'BATTLE_CAST', spellId: 'sour', effectId: target,
    }, 'sour', false)).toThrow(/protected/);
    expect(() => applyEffectTwister(battle, 'defender', {
      type: 'BATTLE_CAST', spellId: 'unmake', effectId: target,
    }, 'unmake', true)).not.toThrow();
  });

  it('stores/releases one recorded spell and gives Prism casts an explicit second target', () => {
    let battle = fixture(721);
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'emptyReliquary' };
    battle = applyBattleAction(battle, {
      type: 'BATTLE_CAST', spellId: 'rally', targetId: 'attacker-0',
    });
    battle.round = 2;
    const store = legalBattleActions(battle).find((action) =>
      action.type === 'BATTLE_USE_ARTIFACT' && action.mode === 'store')!;
    battle = applyBattleAction(battle, store);
    expect(battle.artifactStoredSpell.attacker?.action.spellId).toBe('rally');
    const before = battle.stacks.find((stack) => stack.id === 'attacker-0')!.bonusActions;
    const release = legalBattleActions(battle).find((action) =>
      action.type === 'BATTLE_USE_ARTIFACT' && action.mode === 'release')!;
    battle = applyBattleAction(battle, release);
    expect(battle.artifactStoredSpell.attacker).toBeNull();
    expect(battle.stacks.find((stack) => stack.id === 'attacker-0')!.bonusActions)
      .toBe(before + 1);

    battle = fixture(722);
    battle.attackerHero.artifacts.equipment.head = { id: 'crackedPrism' };
    battle.attackerHero.spellPower = 4;
    const prism = legalSpellCasts(battle).find((action) => action.spellId === 'forgeSpark'
      && action.targetId === 'defender-0' && action.artifactSecondTargetId === 'defender-1')!;
    const hp = battle.stacks.filter((stack) => stack.side === 'defender')
      .map((stack) => [stack.id, stack.topHp] as const);
    battle = applyBattleAction(battle, prism);
    for (const [id, beforeHp] of hp) {
      expect(battle.stacks.find((stack) => stack.id === id)!.topHp).toBeLessThan(beforeHp);
    }
  });

  it('pays death mana once, blocks consumables, and exposes Loud Bell from unexplored fog', () => {
    const battle = fixture(723);
    battle.defenderHero!.artifacts.equipment.cloak = { id: 'quietLedger' };
    battle.defenderHero!.mana = 0;
    const first = battle.stacks.find((stack) => stack.id === 'defender-0')!;
    const second = battle.stacks.find((stack) => stack.id === 'defender-1')!;
    applySpellImpactDamage(battle, {
      targetId: first.id, sourceSide: 'attacker', base: 9999, coefficient: 0, spellPower: 0,
    });
    expect(battle.defenderHero!.mana).toBe(6);
    applySpellImpactDamage(battle, {
      targetId: second.id, sourceSide: 'attacker', base: 9999, coefficient: 0, spellPower: 0,
    });
    expect(battle.defenderHero!.mana).toBe(6);

    const blocked = fixture(724);
    blocked.attackerHero.artifacts.equipment.misc1 = { id: 'greedyGrimoire' };
    expect(legalBattleActions(blocked).some((action) => action.type === 'BATTLE_USE_ITEM')).toBe(false);
    const game = createGame({ seed: 724, p1: 'human', p2: 'human' });
    const enemy = game.players.p2.hero!;
    enemy.artifacts.equipment.cloak = { id: 'loudBell' };
    expect(heroVisibleToPlayer('p1', enemy, new Set())).toBe(true);
  });

  it('exposes Long Spoon as a once-per-battle explicit pile action', () => {
    let battle = fixture(717);
    battle.attackerHero.artifacts.equipment.weapon = { id: 'longSpoon' };
    const target = battle.stacks.find((stack) => stack.id === 'defender-0')!;
    target.counters.burn = 4;
    const moraleBefore = battle.stacks.find((stack) => stack.id === 'attacker-0')!.morale;
    const action = legalBattleActions(battle).find((candidate) =>
      candidate.type === 'BATTLE_USE_ARTIFACT' && candidate.targetId === target.id
      && candidate.counterId === 'burn')!;
    battle = applyBattleAction(battle, action);
    expect(target.counters.burn).toBe(4); // prior state stays immutable
    expect(battle.stacks.find((stack) => stack.id === target.id)!.counters.burn).toBe(0);
    expect(battle.stacks.find((stack) => stack.id === 'attacker-0')!.morale)
      .toBe(moraleBefore + 20);
    expect(legalBattleActions(battle).some((candidate) =>
      candidate.type === 'BATTLE_USE_ARTIFACT'
      && ARTIFACTS[candidate.artifactId].effects.includes('eat_counter'))).toBe(false);
  });

  it('shares the first-push credit between spell and company forced movement', () => {
    const battle = fixture(725);
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'gauntletSecondThrow' };
    expect(forcedMoveDistance(battle, 'attacker', 2)).toBe(3);
    expect(forcedMoveDistance(battle, 'attacker', 2)).toBe(2);
    expect(battle.artifactEffectUses.attacker.push_bonus).toBe(1);
  });

  it('reduces enemy flat death-trigger magnitude without touching proportional damage', () => {
    const game = createGame({ seed: 726, p1: 'human', p2: 'human' });
    const attackerHero = game.players.p1.hero!; const defenderHero = game.players.p2.hero!;
    attackerHero.artifacts.equipment.ring1 = { id: 'candleSnuffersRing' };
    const [battle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 10 }]),
      makeArmy([{ unitId: 'candleWisps', count: 10 }]),
      attackerHero, defenderHero, {
        kind: 'hero', targetId: defenderHero.id, destination: defenderHero.position,
        attackerHeroId: attackerHero.id, defenderHeroId: defenderHero.id, defenderPlayerId: 'p2',
      }, 726,
    );
    const attacker = battle.stacks.find((stack) => stack.side === 'attacker')!;
    const candleWisps = battle.stacks.find((stack) => stack.side === 'defender')!;
    attacker.position = { x: candleWisps.position.x - 1, y: candleWisps.position.y };
    const attackerHp = attacker.topHp;
    applySpellImpactDamage(battle, {
      targetId: candleWisps.id, sourceSide: 'attacker', base: 9999,
      coefficient: 0, spellPower: 0,
    });
    expect(attacker.counters.hex).toBe(1);
    expect(attacker.topHp).toBeLessThan(attackerHp); // Unstable remains proportional and unreduced.
  });

  it('locks each new Burden until its generic visible removal trigger is recorded', () => {
    const game = createGame({ seed: 718, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    addArtifact(hero, { id: 'greedyGrimoire' });
    equipArtifact(game, hero.id, 0, 'misc1');
    expect(canUnequipArtifact(hero, 'greedyGrimoire')).toBe(false);
    expect(() => unequipArtifact(game, hero.id, 'misc1')).toThrow(/Hedge School/);
    expect(markBurdenRemovalReady(hero, 'hedge-school-spell')).toEqual(['greedyGrimoire']);
    expect(canUnequipArtifact(hero, 'greedyGrimoire')).toBe(true);
    unequipArtifact(game, hero.id, 'misc1');
    expect(hero.artifacts.backpack.at(-1)?.id).toBe('greedyGrimoire');
  });

  it('pins every doc-65 definition, typed asset, handler, and authored instance choice', () => {
    expect(DOC65_ARTIFACT_IDS).toHaveLength(38);
    expect(new Set(DOC65_ARTIFACT_IDS)).toHaveLength(38);
    for (const id of DOC65_ARTIFACT_IDS) {
      const definition = ARTIFACTS[id];
      expect(definition.effects.length, id).toBeGreaterThan(0);
      expect(Object.keys(definition.effectMetadata ?? {}).sort(), id)
        .toEqual(definition.effects.filter((effect) =>
          V2_ARTIFACT_EFFECT_TAGS.includes(effect as never)).sort());
      expect(ARTIFACT_ASSET_REQUIREMENTS.some((entry) =>
        entry.canonicalId === `artifact:${id}` && entry.visualSubject.length > 12), id).toBe(true);
    }
    const game = createGame({ seed: 811, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    addArtifact(hero, { id: 'patientCompass' });
    expect(() => equipArtifact(game, hero.id, 0, 'amulet')).toThrow(/object kind/);
    equipArtifact(game, hero.id, 0, 'amulet', undefined, 'mine');
    expect(hero.artifacts.equipment.amulet?.chosenObjectKind).toBe('mine');
    addArtifact(hero, { id: 'growingLedger' });
    expect(() => equipArtifact(game, hero.id, 0, 'amulet')).toThrow(/dwelling tier/);
  });

  it('derives Empty Frame per week without consuming RNG and exposes all three set thresholds', () => {
    const first = createGame({ seed: 812, p1: 'human', p2: 'human' });
    const second = createGame({ seed: 812, p1: 'human', p2: 'human' });
    for (const state of [first, second]) {
      const hero = state.players.p1.hero!;
      hero.artifacts.equipment.misc1 = { id: 'emptyFrame' };
      hero.artifacts.backpack.push({ id: 'quietBell' }, { id: 'longLadder' });
      resolveWeeklyArtifactInstances(state);
    }
    expect(first.rng).toBe(second.rng);
    expect(first.players.p1.hero!.artifacts.equipment.misc1?.copiedArtifactId)
      .toBe(second.players.p1.hero!.artifacts.equipment.misc1?.copiedArtifactId);

    const hero = first.players.p1.hero!;
    hero.artifacts.equipment.misc1 = { id: 'tinkersSpectacles' };
    hero.artifacts.equipment.ring1 = { id: 'misersThumb' };
    hero.artifacts.equipment.misc2 = { id: 'foundersTrowel' };
    expect(artifactSetProgress(hero, 'tinkersRounds')?.bonuses.map((bonus) => bonus.active))
      .toEqual([true, true]);
    hero.artifacts.equipment.cloak = { id: 'gravebindersSash' };
    hero.artifacts.equipment.ring2 = { id: 'candleSnuffersRing' };
    expect(artifactSetProgress(hero, 'mournersSuit')?.equipped).toBe(2);
    hero.artifacts.equipment.weapon = { id: 'droversCrook' };
    hero.artifacts.equipment.amulet = { id: 'whetstoneOfTheClans' };
    expect(artifactSetProgress(hero, 'droversKit')?.bonuses[0].active).toBe(true);
  });

  it('uses generic conditional, debt, forced-move, and all five new removal contracts', () => {
    const game = createGame({ seed: 813, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    hero.artifacts.equipment.amulet = { id: 'twinCoin' };
    expect(conditionalArtifactStatBonus(hero, 1)).toBe(0);
    expect(conditionalArtifactStatBonus(hero, 2)).toBe(2);
    expect(conditionalArtifactStatBonus(hero, 3)).toBe(-1);
    hero.artifacts.equipment.misc1 = { id: 'debtLedger' };
    expect(maximumDebtSlots(hero)).toBe(3);

    const battle = fixture(813);
    battle.defenderHero!.artifacts.equipment.shield = { id: 'deadmansWedge' };
    expect(forcedMoveDistance(battle, 'attacker', 2, 'defender')).toBe(0);
    expect(forcedMoveDistance(battle, 'attacker', 2, 'defender')).toBe(2);

    const contracts = [
      ['gluttonsBit', 'flawless-battle'], ['sleeplessCrown', 'seven-city-days'],
      ['openPurse', 'marketplace-payment'], ['faithfulHound', 'equal-level-hero'],
      ['rustedTongue', 'tier-five-spell'],
    ] as const;
    for (const [id, trigger] of contracts) {
      const slot = ARTIFACTS[id].slot === 'ring' ? 'ring1'
        : ARTIFACTS[id].slot === 'misc' ? 'misc2' : ARTIFACTS[id].slot;
      hero.artifacts.equipment[slot] = { id };
      expect(markBurdenRemovalReady(hero, trigger)).toContain(id);
      expect(canUnequipArtifact(hero, id)).toBe(true);
    }
  });
});
