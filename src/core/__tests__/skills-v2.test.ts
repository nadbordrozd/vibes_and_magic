import { describe, expect, it } from 'vitest';
import {
  DOCS_60_67_SKILL_IDS, RARE_SKILL_RANKS, SKILL_ASSET_REQUIREMENTS, SKILLS, SKILL_IDS,
} from '../../content/skills';
import { SPELLS } from '../../content/spells';
import { FACTIONS } from '../../content/factions';
import { UNITS } from '../../content/units';
import { chooseCombatAction } from '../../ai/combat';
import { applyBattleAction, createBattle, legalBattleActions } from '../combat/battle';
import { addBattleCounter, endStackTurn } from '../combat/magicEffects';
import { applyImpactDamage } from '../combat/primitives';
import { castSpell } from '../combat/spells';
import { applyRoundMorale } from '../combat/round';
import { apply, applyAutomaticChoice, createGame } from '../game';
import { moveHero } from '../game/exploration';
import { chooseLevel } from '../game/levelUps';
import { learnSpell } from '../game/spellLearning';
import { finalizeBattle } from '../game/outcomes';
import { palimpsestForget } from '../game/palimpsest';
import { designateTactician, refreshLogistics, remoteRecruit } from '../game/skillActions';
import {
  addArtifact, artifactEffectTotal, equipArtifact, unequipArtifact,
} from '../artifacts';
import { enemyHeroIntel } from '../selectors';
import { gainExperience } from '../heroBehaviors';
import { learnGuildSpells, visitShrine } from '../game/magic';
import { hireHero } from '../game/tavern';
import { drawLevelOptions, grimoirePool } from '../progression';
import type { GameState, Hero } from '../types';
import { validateContentAssets } from '../../content/v2/assets';

const hero = (state: GameState, player: 'p1' | 'p2' = 'p1'): Hero => state.players[player].hero!;

function heroBattle(seed = 901) {
  const state = createGame({ seed, p1: 'human', p2: 'human' });
  const attacker = hero(state); const defender = hero(state, 'p2');
  const [battle] = createBattle(attacker.army, defender.army, attacker, defender, {
    kind: 'hero', targetId: defender.id, destination: defender.position,
    attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: defender.owner,
  }, seed);
  return { state, attacker, defender, battle };
}

describe('Skills v2', () => {
  it('validates exactly thirty complete skills, all class weights, and rare-rank exposure', () => {
    expect(SKILL_IDS).toHaveLength(30);
    expect(Object.values(SKILLS).every((skill) => Object.keys(skill.classWeight).length === 6
      && Object.values(skill.classWeight).every((weight) => weight > 0))).toBe(true);
    expect(RARE_SKILL_RANKS).toEqual([
      'chronicler:3', 'twicetold:3', 'reaper:3',
      'beguiler:3', 'duelist:3', 'loremaster:3',
    ]);
  });

  it('keeps nine skill assets as typed development placeholders and release-strict gaps', () => {
    const newIds = new Set(DOCS_60_67_SKILL_IDS.map((id) => `skill:${id}`));
    const native = new Set(SKILL_IDS.map((id) => `skill:${id}`).filter((id) => !newIds.has(id)));
    const resolved = validateContentAssets(SKILL_ASSET_REQUIREMENTS, native, 'development');
    expect(resolved.filter((asset) => asset.kind === 'placeholder')).toHaveLength(9);
    expect(() => validateContentAssets(SKILL_ASSET_REQUIREMENTS, native, 'release'))
      .toThrow('Release asset missing');
  });

  it('gates four new skills below level five, but still offers a held gated rank', () => {
    const candidate = hero(createGame({ seed: 902, p1: 'human', p2: 'human' }));
    candidate.level = 4;
    const before = new Set(Array.from({ length: 1000 }, (_, seed) =>
      drawLevelOptions(candidate, seed)[0]).flat());
    for (const id of ['reaper', 'beguiler', 'duelist', 'quartermaster'] as const) {
      expect(before.has(id)).toBe(false);
    }
    candidate.skills.reaper = 1;
    expect(Array.from({ length: 500 }, (_, seed) => drawLevelOptions(candidate, seed)[0])
      .some((offer) => offer.includes('reaper'))).toBe(true);
    candidate.skills = {};
    candidate.level = 5;
    const after = new Set(Array.from({ length: 1500 }, (_, seed) =>
      drawLevelOptions(candidate, seed)[0]).flat());
    for (const id of ['reaper', 'beguiler', 'duelist', 'quartermaster'] as const) {
      expect(after.has(id)).toBe(true);
    }
  });

  it('keeps class weights a bias rather than forcing the emphasized skill', () => {
    const candidate = hero(createGame({ seed: 903, p1: 'human', p2: 'human' }));
    candidate.level = 5;
    const offers = Array.from({ length: 60 }, (_, seed) => drawLevelOptions(candidate, seed)[0]);
    expect(offers.some((offer) => offer.includes('command'))).toBe(true);
    expect(offers.some((offer) => !offer.includes('command'))).toBe(true);
    expect(offers.flat().some((choice) => choice === 'siegewright')).toBe(true);
  });

  it('applies every Evoker rank and preserves the first impact-spell hero act', () => {
    const damages: number[] = [];
    for (const rank of [1, 2, 3] as const) {
      const { attacker, defender, battle } = heroBattle(930 + rank);
      attacker.skills.evoker = rank;
      const [fresh] = createBattle(attacker.army, defender.army, attacker, defender,
        battle.context, 930 + rank);
      const target = fresh.stacks.find((stack) => stack.side === 'defender')!;
      target.count = 100; target.topHp = UNITS[target.unitId].hp;
      const before = (target.count - 1) * UNITS[target.unitId].hp + target.topHp;
      expect(applyImpactDamage(fresh, {
        targetId: target.id, sourceSide: 'attacker', base: 20, coefficient: 0, spellPower: 0,
      }).ok).toBe(true);
      const after = (target.count - 1) * UNITS[target.unitId].hp + target.topHp;
      damages.push(before - after);
      expect(target.counters.burn).toBe(rank >= 2 ? 1 : 0);
    }
    expect(damages).toEqual([25, 30, 35]);

    const { attacker, defender, battle } = heroBattle(934);
    attacker.skills.evoker = 3; attacker.knownSpells = ['forgeSpark']; attacker.mana = 100;
    const [fresh] = createBattle(attacker.army, defender.army, attacker, defender,
      battle.context, 934);
    fresh.beguilerOpeningResolved.attacker = true;
    fresh.beguilerOpeningResolved.defender = true;
    fresh.currentStackId = fresh.stacks.find((stack) => stack.side === 'attacker')!.id;
    const target = fresh.stacks.find((stack) => stack.side === 'defender')!;
    target.count = 100; target.topHp = UNITS[target.unitId].hp;
    castSpell(fresh, { type: 'BATTLE_CAST', spellId: 'forgeSpark', targetId: target.id });
    expect(fresh.evokerActUsed.attacker).toBe(true);
    expect(fresh.castRound.attacker).not.toBe(fresh.round);
    castSpell(fresh, { type: 'BATTLE_CAST', spellId: 'forgeSpark', targetId: target.id });
    expect(fresh.castRound.attacker).toBe(fresh.round);
  });

  it('applies every Tallykeeper rank through the shared enemy-counter path', () => {
    const { attacker, defender, battle } = heroBattle(935);
    attacker.skills.tallykeeper = 1;
    const [fresh] = createBattle(attacker.army, defender.army, attacker, defender,
      battle.context, 935);
    const target = fresh.stacks.find((stack) => stack.side === 'defender')!;
    addBattleCounter(fresh, target, 'hex', 2, 'attacker');
    expect(target.counters.hex).toBe(3);

    fresh.attackerHero.skills.tallykeeper = 2;
    addBattleCounter(fresh, target, 'burn', 2, 'attacker');
    expect(target.counters.burn).toBe(3);
    endStackTurn(fresh, target);
    expect(target.counters.burn).toBe(3);
    endStackTurn(fresh, target);
    expect(target.counters.burn).toBe(2);

    fresh.attackerHero.skills.tallykeeper = 3;
    addBattleCounter(fresh, target, 'chill', 20, 'attacker');
    expect(target.counters.chill).toBe(12);
  });

  it('makes Adept explicit, replayable, min-one, and deterministic for AI', () => {
    let state = createGame({ seed: 904, p1: 'human', p2: 'human' });
    const candidate = hero(state); candidate.level = 6; candidate.knownSpells = ['ward'];
    state.pendingChoice = { kind: 'level', playerId: 'p1', heroId: candidate.id,
      options: ['adept'], canSkip: false, canReroll: false };
    state = apply(state, { type: 'CHOOSE_LEVEL', stat: 'adept' });
    expect(state.pendingChoice?.kind).toBe('adept');
    state = apply(state, { type: 'CHOOSE_ADEPT_SPELL', spellId: 'ward' });
    expect(hero(state).spellManaReductions.ward).toBeGreaterThan(0);
    const replay = state.replay.at(-1); expect(replay).toEqual({ type: 'CHOOSE_ADEPT_SPELL', spellId: 'ward' });
    const automatic = createGame({ seed: 905, p1: 'ai', p2: 'human' });
    automatic.pendingChoice = { kind: 'adept', playerId: 'p1', heroId: hero(automatic).id,
      options: ['ward'] };
    expect(applyAutomaticChoice(automatic).pendingChoice).toBeNull();
  });

  it('only offers Grimoire with a legal pool and resolves its hidden seeded outcome', () => {
    const exhausted = hero(createGame({ seed: 906, p1: 'human', p2: 'human' }));
    exhausted.level = 6; exhausted.knownSpells = Object.values(SPELLS)
      .filter((spell) => spell.school === SPELLS.ward.school && spell.acquisition?.guild
        && spell.tier! <= Math.ceil((exhausted.level + 1) / 3)).map((spell) => spell.id);
    expect(grimoirePool(exhausted)).toHaveLength(0);
    expect(Array.from({ length: 100 }, (_, seed) => drawLevelOptions(exhausted, seed)[0])
      .flat()).not.toContain('grimoire');
    const make = () => {
      let state = createGame({ seed: 907, p1: 'human', p2: 'human' });
      const candidate = hero(state); candidate.level = 6; candidate.knownSpells = ['ward'];
      state.pendingChoice = { kind: 'level', playerId: 'p1', heroId: candidate.id,
        options: ['grimoire'], canSkip: false, canReroll: false };
      state = apply(state, { type: 'CHOOSE_LEVEL', stat: 'grimoire' }); return state;
    };
    const first = make(); const second = make();
    expect(hero(first).knownSpells).toEqual(hero(second).knownSpells);
    expect(first.rng).toBe(second.rng);
    expect(first.pendingChoice).toBeNull();
    expect(first.replay.at(-1)).toEqual({ type: 'CHOOSE_LEVEL', stat: 'grimoire' });
  });

  it('retroactively and prospectively applies Loremaster rank three', () => {
    const state = createGame({ seed: 908, p1: 'human', p2: 'human' });
    const candidate = hero(state); candidate.knownSpells = ['ward']; candidate.skills.loremaster = 2;
    state.pendingChoice = { kind: 'level', playerId: 'p1', heroId: candidate.id,
      options: ['loremaster'], canSkip: false, canReroll: false };
    chooseLevel(state, 'loremaster');
    expect(candidate.upgradedSpells).toContain('ward');
    learnSpell(candidate, 'forgeSpark');
    expect(candidate.upgradedSpells).toContain('forgeSpark');
  });

  it('serializes Beguiler and Curse-Eater opening choices before ordinary actions', () => {
    const { state, attacker, defender, battle } = heroBattle(909);
    attacker.skills.curseEater = 3; defender.skills.beguiler = 1;
    const [fresh] = createBattle(attacker.army, defender.army, attacker, defender, battle.context, 909);
    let actions = legalBattleActions(fresh);
    expect(actions.every((action) => action.type === 'BATTLE_CHOOSE_COUNTER_REDIRECT')).toBe(true);
    fresh.counterRedirectTarget.attacker = null;
    const aiChoice = chooseCombatAction(fresh);
    expect(aiChoice.type).toBe('BATTLE_CHOOSE_COUNTER_REDIRECT');
    state.battle = fresh; state.phase = 'combat';
    const afterRedirect = apply(state, aiChoice);
    expect(afterRedirect.replay.at(-1)).toEqual(aiChoice);
    const redirected = afterRedirect.battle!;
    actions = legalBattleActions(redirected);
    expect(actions.every((action) => action.type === 'BATTLE_USE_SKILL')).toBe(true);
    const chill = actions[0];
    if (chill.type !== 'BATTLE_USE_SKILL') throw new Error('Beguiler choice missing');
    const afterChill = apply(afterRedirect, chill);
    expect(afterChill.replay.at(-1)).toEqual(chill);
    const chilled = afterChill.battle!;
    expect(chilled.stacks.find((stack) => stack.id === chill.targetId)?.counters.chill).toBe(2);
    addBattleCounter(chilled, chilled.stacks.find((stack) => stack.side === 'attacker')!,
      'hex', 2, 'defender');
    expect(chilled.counterRedirectUsed.attacker).toBe(true);
  });

  it('fails closed for forged adventure-only skill verbs during combat', () => {
    const state = createGame({ seed: 910, p1: 'human', p2: 'human' });
    const candidate = hero(state); candidate.skills.logistics = 3;
    state.phase = 'combat';
    expect(() => apply(state, { type: 'REFRESH_LOGISTICS', heroId: candidate.id }))
      .toThrow('adventure-only');
    expect(state.replay).toHaveLength(0);
  });

  it('exposes weekly Logistics and persistent footprint-legal Tactician verbs', () => {
    let state = createGame({ seed: 912, p1: 'human', p2: 'human' });
    let candidate = hero(state); candidate.skills.logistics = 3; candidate.movement = 1;
    state = apply(state, { type: 'REFRESH_LOGISTICS', heroId: candidate.id }); candidate = hero(state);
    expect(candidate.movement).toBeGreaterThan(1);
    expect(candidate.skillUses.weekly.logistics).toBe(state.week);
    expect(state.replay.at(-1)?.type).toBe('REFRESH_LOGISTICS');
    expect(() => refreshLogistics(state, candidate.id)).toThrow('this week');
    const denied = createGame({ seed: 925, p1: 'human', p2: 'human' });
    const deniedHero = hero(denied); deniedHero.skills.logistics = 3;
    deniedHero.dailyMovementMaximum = 0; deniedHero.movement = 0;
    refreshLogistics(denied, deniedHero.id);
    expect(deniedHero.movement).toBe(0);
    candidate.skills.tactician = 2;
    state = apply(state, { type: 'DESIGNATE_TACTICIAN', heroId: candidate.id, armySlot: 0 });
    candidate = hero(state);
    expect(candidate.tacticianSlot).toBe(0);
    expect(state.replay.at(-1)?.type).toBe('DESIGNATE_TACTICIAN');
    const defender = hero(state, 'p2');
    const context = {
      kind: 'hero', targetId: defender.id, destination: defender.position,
      attackerHeroId: candidate.id, defenderHeroId: defender.id, defenderPlayerId: defender.owner,
    } as const;
    const [battle] = createBattle(candidate.army, defender.army, candidate, defender, context, 912);
    const designated = battle.stacks.find((stack) => stack.side === 'attacker' && stack.slot === 0)!;
    expect(designated.position).toEqual({ x: 5, y: 4 });
    expect(designated.actsFirst).not.toBe(true);
    candidate.skills.tactician = 3;
    const [rankThree] = createBattle(candidate.army, defender.army, candidate, defender, context, 912);
    const first = rankThree.stacks.find((stack) => stack.side === 'attacker' && stack.slot === 0)!;
    expect(first.position).toEqual({ x: 5, y: 4 });
    expect(first.actsFirst).toBe(true);
    expect(rankThree.order[0]).toBe(first.id);
    candidate.skills.tactician = 1; candidate.tacticianSlot = null;
    const [rankOne] = createBattle(candidate.army, defender.army, candidate, defender, context, 912);
    expect(rankOne.stacks.filter((stack) => stack.side === 'attacker')
      .every((stack) => stack.position.x === 1)).toBe(true);
  });

  it('uses Palimpsest at The Stacks for four choices, five with Loremaster', () => {
    for (const [loremaster, count] of [[0, 4], [2, 5]] as const) {
      const state = createGame({ seed: 913 + loremaster, p1: 'human', p2: 'human' });
      const candidate = hero(state); candidate.skills.palimpsest = 3;
      if (loremaster) candidate.skills.loremaster = loremaster;
      candidate.knownSpells = ['ward'];
      state.castles[0].owner = candidate.owner;
      if (!state.castles[0].buildings.includes('mageGuild3')) state.castles[0].buildings.push('mageGuild3');
      const stacks = { id: `test-stacks-${loremaster}`, kind: 'stacks' as const,
        position: { x: candidate.position.x, y: candidate.position.y }, visitedBy: [] };
      state.map.objects.push(stacks);
      palimpsestForget(state, stacks.id, 'ward');
      expect(state.pendingChoice?.kind).toBe('palimpsest');
      expect(state.pendingChoice?.kind === 'palimpsest' && state.pendingChoice.options).toHaveLength(count);
    }
  });

  it('settles Reaper casualty recovery and faction tier-one raising by original owner', () => {
    const { state, attacker, battle } = heroBattle(916);
    attacker.skills.reaper = 3;
    const own = battle.stacks.find((stack) => stack.side === 'attacker')!;
    battle.initialCounts[own.id] = own.count;
    battle.casualties.attacker[own.unitId] = 10;
    own.count = Math.max(0, own.count - 10);
    const enemy = battle.stacks.find((stack) => stack.side === 'defender')!;
    battle.casualties.defender[enemy.unitId] = 20; enemy.count = 0;
    battle.winner = 'attacker'; state.battle = battle; state.phase = 'combat';
    finalizeBattle(state);
    expect(state.lastBattleRecovered[own.unitId]).toBe(2);
    expect(attacker.army.some((stack) => stack?.unitId === 'yeoman' && stack.count >= 3)).toBe(true);
  });

  it('recovers exactly ten and twenty percent at Reaper ranks one and two', () => {
    for (const [rank, restored] of [[1, 1], [2, 2]] as const) {
      const { state, attacker, battle } = heroBattle(930 + rank);
      attacker.skills.reaper = rank;
      const own = battle.stacks.find((stack) => stack.side === 'attacker')!;
      battle.initialCounts[own.id] = own.count + 10;
      battle.casualties.attacker[own.unitId] = 10;
      battle.winner = 'attacker'; state.battle = battle; state.phase = 'combat';
      finalizeBattle(state);
      expect(state.lastBattleRecovered[own.unitId]).toBe(restored);
    }
  });

  it('raises Reaper casualties for a defending winning hero into that hero faction', () => {
    const { state, defender, battle } = heroBattle(933);
    defender.skills.reaper = 3;
    const attackerStack = battle.stacks.find((stack) => stack.side === 'attacker')!;
    battle.casualties.attacker[attackerStack.unitId] = 20; attackerStack.count = 0;
    battle.winner = 'defender'; state.battle = battle; state.phase = 'combat';
    finalizeBattle(state);
    const tierOne = FACTIONS[defender.faction].startingArmy[0].unitId;
    expect(defender.army.some((stack) => stack?.unitId === tierOne && stack.count >= 3)).toBe(true);
  });

  it('pauses Duelist victory for an explicit artifact trophy and auto-resolves for AI', () => {
    const { state, attacker, defender, battle } = heroBattle(917);
    attacker.skills.duelist = 3;
    addArtifact(defender, { id: 'mirrorMask' });
    battle.defenderHero!.artifacts.backpack.push({ id: 'mirrorMask' });
    battle.winner = 'attacker'; state.battle = battle; state.phase = 'combat';
    finalizeBattle(state);
    expect(state.pendingChoice?.kind).toBe('duelistArtifact');
    const resolved = applyAutomaticChoice(state);
    expect(resolved.pendingChoice).toBeNull();
    expect(resolved.phase).toBe('adventure');
    expect(hero(resolved).artifacts.backpack.some((artifact) => artifact.id === 'mirrorMask')).toBe(true);
    expect(resolved.replay.at(-1)?.type).toBe('CHOOSE_DUELIST_ARTIFACT');
  });

  it('offers the Duelist trophy choice on surrender despite ordinary equipment protection', () => {
    const { state, attacker, defender, battle } = heroBattle(934);
    attacker.skills.duelist = 3;
    battle.defenderHero!.artifacts.equipment.misc1 = { id: 'mirrorMask' };
    defender.artifacts.equipment.misc1 = { id: 'mirrorMask' };
    battle.withdrawal = { side: 'defender', kind: 'surrender', cost: 0 };
    battle.winner = 'attacker'; state.battle = battle; state.phase = 'combat';
    finalizeBattle(state);
    expect(state.pendingChoice).toMatchObject({ kind: 'duelistArtifact', options: ['mirrorMask'] });
  });

  it('locks a Ransomer victim out of taverns for seven days', () => {
    const { state, attacker, defender, battle } = heroBattle(918);
    attacker.skills.ransomer = 3; battle.winner = 'attacker'; state.battle = battle;
    state.phase = 'combat'; finalizeBattle(state);
    expect(defender.rehireBlockedUntilDay).toBe(state.day + 7);
    state.activePlayer = defender.owner;
    const owner = state.players[defender.owner];
    owner.tavernOffers = [defender.id]; owner.resources.gold = 100_000;
    const castle = state.castles.find((item) => item.owner === defender.owner)!;
    expect(() => hireHero(state, castle.id, defender.id)).toThrow('cannot be re-hired');
  });

  it('buys a remote Peddler scroll through the weekly replayed verb only', () => {
    let state = createGame({ seed: 924, p1: 'human', p2: 'human' });
    let candidate = hero(state); candidate.skills.peddler = 3; candidate.position = { x: 10, y: 10 };
    const castle = state.castles.find((item) => item.owner === candidate.owner)!;
    if (!castle.buildings.includes('marketplace')) castle.buildings.push('marketplace');
    castle.marketScroll = { id: 'spellScroll', storedSpellId: 'ward' };
    state.players.p1.resources.gold = 100_000;
    state = apply(state, { type: 'BUY_MARKET_SCROLL', castleId: castle.id,
      heroId: candidate.id }); candidate = hero(state);
    expect(candidate.skillUses.weekly.peddler).toBe(state.week);
    expect(state.replay.at(-1)).toEqual({ type: 'BUY_MARKET_SCROLL', castleId: castle.id,
      heroId: candidate.id });
    expect(candidate.inventory.some((item) => item && typeof item !== 'string'
      && item.id === 'spellScroll')).toBe(true);
  });

  it('implements Quartermaster slot, morale, and replayed weekly remote recruitment ranks', () => {
    let state = createGame({ seed: 919, p1: 'human', p2: 'human' });
    let candidate = hero(state); candidate.level = 5;
    state.pendingChoice = { kind: 'level', playerId: 'p1', heroId: candidate.id,
      options: ['quartermaster'], canSkip: false, canReroll: false };
    state = apply(state, { type: 'CHOOSE_LEVEL', stat: 'quartermaster' });
    candidate = hero(state); expect(candidate.army).toHaveLength(8);
    const capped = createGame({ seed: 929, p1: 'human', p2: 'human' });
    const cappedHero = hero(capped); cappedHero.level = 5;
    capped.pendingChoice = { kind: 'level', playerId: 'p1', heroId: cappedHero.id,
      options: ['quartermaster'], canSkip: false, canReroll: false };
    chooseLevel(capped, 'quartermaster'); expect(cappedHero.army).toHaveLength(8);
    candidate.skills.quartermaster = 2;
    candidate.army[0] = { unitId: 'yeoman', count: 5 };
    candidate.army[1] = { unitId: 'tinSoldier', count: 5 };
    const defender = hero(state, 'p2');
    const [battle] = createBattle(candidate.army, defender.army, candidate, defender, {
      kind: 'hero', targetId: defender.id, destination: defender.position,
      attackerHeroId: candidate.id, defenderHeroId: defender.id, defenderPlayerId: defender.owner,
    }, 919);
    battle.stacks.filter((stack) => stack.side === 'attacker').forEach((stack) => { stack.morale = 20; });
    applyRoundMorale(battle);
    expect(battle.stacks.filter((stack) => stack.side === 'attacker')
      .every((stack) => stack.morale >= 20)).toBe(true);
    candidate.skills.quartermaster = 3;
    const castle = state.castles.find((item) => item.owner === candidate.owner)!;
    castle.available[0] = Math.max(2, castle.available[0]); state.players.p1.resources.gold = 100_000;
    state = apply(state, { type: 'REMOTE_RECRUIT', heroId: candidate.id,
      castleId: castle.id, tier: 1, count: 2 });
    candidate = hero(state);
    expect(candidate.skillUses.weekly.quartermaster).toBe(state.week);
    expect(state.replay.at(-1)).toEqual({ type: 'REMOTE_RECRUIT', heroId: candidate.id,
      castleId: castle.id, tier: 1, count: 2 });
    expect(() => remoteRecruit(state, candidate.id, castle.id, 1, 1)).toThrow('this week');
  });

  it('exposes Beguiler intelligence and free HP-capped control', () => {
    const { attacker, defender, battle } = heroBattle(920);
    attacker.skills.beguiler = 2;
    const intel = enemyHeroIntel(attacker, defender);
    expect(intel.spells).toEqual(defender.knownSpells);
    expect(intel.mana).toBe(defender.mana); expect(intel.artifacts).not.toBeNull();
    attacker.skills.beguiler = 3; attacker.level = 2;
    const [fresh] = createBattle(attacker.army, defender.army, attacker, defender, battle.context, 920);
    fresh.beguilerOpeningResolved.attacker = true;
    fresh.currentStackId = fresh.stacks.find((stack) => stack.side === 'attacker')!.id;
    const enemy = fresh.stacks.find((stack) => stack.side === 'defender')!;
    enemy.count = 100; enemy.topHp = UNITS[enemy.unitId].hp;
    expect(legalBattleActions(fresh).some((action) =>
      action.type === 'BATTLE_USE_SKILL' && action.mode === 'control'
      && action.targetId === enemy.id)).toBe(false);
    enemy.count = 1; enemy.topHp = Math.min(enemy.topHp, 50);
    const control = legalBattleActions(fresh).find((action) =>
      action.type === 'BATTLE_USE_SKILL' && action.mode === 'control');
    expect(control).toBeTruthy();
    const castRound = fresh.castRound.attacker;
    const controlled = applyBattleAction(fresh, control!);
    expect(controlled.beguilerControlUsed.attacker).toBe(true);
    expect(controlled.castRound.attacker).toBe(castRound);
  });

  it('applies Duelist hero-only stats and removes withdrawal choices', () => {
    const { attacker, defender, battle } = heroBattle(921);
    attacker.skills.duelist = 2;
    const [fresh] = createBattle(attacker.army, defender.army, attacker, defender, battle.context, 921);
    expect(fresh.attackerHero.attack).toBe(attacker.attack + 2);
    expect(fresh.attackerHero.defense).toBe(attacker.defense + 2);
    fresh.currentStackId = fresh.stacks.find((stack) => stack.side === 'defender')!.id;
    const types = legalBattleActions(fresh).map((action) => action.type);
    expect(types).not.toContain('BATTLE_RETREAT'); expect(types).not.toContain('BATTLE_SURRENDER');
  });

  it('implements all Reliquarian ranks through generic equipment and effect hooks', () => {
    const state = createGame({ seed: 922, p1: 'human', p2: 'human' });
    const candidate = hero(state); candidate.skills.reliquarian = 1;
    addArtifact(candidate, { id: 'purseOfThePrudentToad' });
    equipArtifact(state, candidate.id, 0, 'misc3');
    expect(candidate.artifacts.equipment.misc3?.id).toBe('purseOfThePrudentToad');
    expect(artifactEffectTotal(candidate, 'daily_gold')).toBe(200);
    candidate.skills.reliquarian = 2;
    expect(artifactEffectTotal(candidate, 'daily_gold')).toBe(300);
    candidate.skills.reliquarian = 3; addArtifact(candidate, { id: 'leadenCrown' });
    equipArtifact(state, candidate.id, candidate.artifacts.backpack.length - 1, 'head');
    unequipArtifact(state, candidate.id, 'head');
    expect(candidate.skillUses.game.reliquarian).toBe(true);
  });

  it('applies Loremaster XP and extra Guild/Shrine choices', () => {
    const state = createGame({ seed: 923, p1: 'human', p2: 'human' });
    const candidate = hero(state); candidate.skills.loremaster = 2;
    const before = candidate.xp; expect(gainExperience(candidate, 100)).toBe(125);
    expect(candidate.xp).toBe(before + 125);
    const castle = state.castles.find((item) => item.owner === candidate.owner)!;
    if (!castle.buildings.includes('mageGuild1')) castle.buildings.push('mageGuild1');
    candidate.knownSpells = [];
    const learned = learnGuildSpells(candidate, castle);
    expect(learned).toHaveLength(5);
    const shrine = state.map.objects.find((object) => object.kind === 'shrine')!;
    if (shrine.kind !== 'shrine') throw new Error('shrine missing');
    shrine.cleared = true;
    candidate.knownSpells = Object.values(SPELLS).filter((spell) => spell.school === shrine.school
      && (spell.tier ?? 5) <= 2).slice(0, 3).map((spell) => spell.id);
    visitShrine(state, shrine.id, candidate);
    expect(state.pendingChoice?.kind === 'shrine' && state.pendingChoice.choicesRemaining).toBe(2);
  });

  it('spends Wayfaring only on the explicit aggro-tile passage', () => {
    const ordinary = createGame({ seed: 911, p1: 'human', p2: 'human' });
    const candidate = hero(ordinary); candidate.skills.wayfaring = 3;
    const guard = ordinary.map.objects.find((object) => object.kind === 'guardian')!;
    if (guard.kind !== 'guardian') throw new Error('guardian missing');
    guard.position = { x: candidate.position.x, y: candidate.position.y + 2 };
    ordinary.map.objects = [guard];
    moveHero(ordinary, { x: candidate.position.x, y: candidate.position.y + 1 }, false, false);
    expect(candidate.skillUses.daily.wayfaring).toBeUndefined();
    expect(ordinary.battle).not.toBeNull();
    const special = createGame({ seed: 911, p1: 'human', p2: 'human' });
    const walker = hero(special); walker.skills.wayfaring = 3;
    const otherGuard = special.map.objects.find((object) => object.kind === 'guardian')!;
    if (otherGuard.kind !== 'guardian') throw new Error('guardian missing');
    otherGuard.position = { x: walker.position.x, y: walker.position.y + 2 };
    special.map.objects = [otherGuard];
    moveHero(special, { x: walker.position.x, y: walker.position.y + 1 }, false, true);
    expect(walker.skillUses.daily.wayfaring).toBe(special.day);
    expect(special.battle).toBeNull();
  });
});
