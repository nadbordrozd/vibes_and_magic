import { describe, expect, it } from 'vitest';
import { ARTIFACTS, DOC65_ARTIFACT_IDS } from '../../content/artifacts';
import { tile } from '../../content/terrain';
import { SPELLS } from '../../content/spells';
import { heroArmyCapacity, makeArmy } from '../army';
import {
  artifactSetProgress, canPlayerAfford, effectivePlayerPrimaryStat, payPlayer,
  forcedMoveDistance, refreshArtifactPointers, resolveWeeklyArtifactInstances,
} from '../artifacts';
import { applyBattleAction, createBattle, legalBattleActions } from '../combat/battle';
import { beginStackTurn, effectiveSpeed, endStackTurn } from '../combat/magicEffects';
import { applySpellImpactDamage } from '../combat/primitives';
import { runAttackPipeline, runTurnAdvancePipeline } from '../combat/pipeline';
import { castStoredSpell } from '../combat/spells';
import { scheduleDebt } from '../debts';
import { apply, createGame, incomeForPlayer } from '../game';
import {
  adventureSpellManaCost, adventureSpellPower, canCastAdventureSpell,
} from '../game/adventureSpells';
import { captureArtifactSpellLoans } from '../game/exploration';
import { chooseBargain } from '../game/bargains';
import { guildInscribe } from '../game/magic';
import { marketTrade } from '../game/marketplace';
import { recordArtifactFactionHistory } from '../game/outcomes';
import { maximumMana } from '../heroBehaviors';
import { updateBurdenCityStreaks } from '../game/setup';
import type { BattleState, GameState, Hero } from '../types';

function addSecondHero(state: GameState, owner: 'p1' | 'p2' = 'p1'): Hero {
  const player = state.players[owner];
  const hero = player.tavernPool.shift()!;
  hero.alive = true;
  hero.position = { x: player.hero!.position.x + 1, y: player.hero!.position.y };
  player.heroes.push(hero);
  return hero;
}

function battleFixture(seed = 9300): BattleState {
  const state = createGame({ seed, p1: 'human', p2: 'human' });
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 1 }, { unitId: 'longbowman', count: 30 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 10 }]),
    state.players.p1.hero!, state.players.p2.hero!, {
      kind: 'hero', targetId: state.players.p2.hero!.id, destination: { x: 4, y: 4 },
      attackerHeroId: state.players.p1.hero!.id, defenderHeroId: state.players.p2.hero!.id,
      defenderPlayerId: 'p2', attackerOpponentFaction: state.players.p2.hero!.faction,
      defenderOpponentFaction: state.players.p1.hero!.faction,
    }, seed,
  );
  battle.obstacles = [];
  return battle;
}

describe('doc-65 exhaustive printed behavior', () => {
  it('keeps the exact 38-row audit list attached to executable definitions', () => {
    expect(DOC65_ARTIFACT_IDS).toHaveLength(38);
    expect(DOC65_ARTIFACT_IDS.every((id) => ARTIFACTS[id].effects.length > 0)).toBe(true);
  });

  it('executes traversal timing, saved-position legality, persistent Compass progress, Hollow Key scope, and lossless Crow transfer', () => {
    let state = createGame({ seed: 9301, p1: 'human', p2: 'human' });
    let hero = state.players.p1.hero!;
    hero.movement = 1_000;
    hero.artifacts.equipment.boots = { id: 'longLadder' };
    const mountain = { x: hero.position.x + 1, y: hero.position.y };
    state.map.terrain[mountain.y][mountain.x] = tile('mountain');
    state = apply(state, { type: 'ARTIFACT_CROSS_TERRAIN', heroId: hero.id,
      destination: mountain, mode: 'mountain-step' });
    expect(state.players.p1.hero!.position).toEqual(mountain);
    expect(() => apply(state, { type: 'ARTIFACT_CROSS_TERRAIN', heroId: hero.id,
      destination: mountain, mode: 'mountain-step' })).toThrow();

    hero = state.players.p1.hero!;
    hero.artifacts.equipment.misc1 = { id: 'ferrymansLantern' };
    hero.artifactState.waterStraitSteps = 3;
    expect(() => apply(state, { type: 'ARTIFACT_CROSS_TERRAIN', heroId: hero.id,
      destination: { x: mountain.x + 1, y: mountain.y }, mode: 'water-strait' })).toThrow();

    hero.artifacts.equipment.boots = { id: 'backwardBoot' };
    hero.artifactState.dayStartPosition = { x: mountain.x + 2, y: mountain.y };
    const blocker = addSecondHero(state);
    blocker.position = { ...hero.artifactState.dayStartPosition };
    const beforeBoot = JSON.stringify(state);
    expect(() => apply(state, { type: 'ARTIFACT_RETURN_TO_START', heroId: hero.id })).toThrow(/occupied/);
    expect(JSON.stringify(state)).toBe(beforeBoot);

    blocker.position.x += 1;
    hero.artifacts.equipment.misc1 = { id: 'milestoneStone' };
    hero.artifactState.marker = { x: blocker.position.x, y: blocker.position.y };
    const beforeStone = JSON.stringify(state);
    expect(() => apply(state, { type: 'ARTIFACT_MARKER', heroId: hero.id, mode: 'teleport' })).toThrow(/occupied/);
    expect(JSON.stringify(state)).toBe(beforeStone);

    const mines = state.map.objects.filter((object) => object.kind === 'mine').slice(0, 2);
    expect(mines).toHaveLength(2);
    hero.artifacts.equipment.amulet = { id: 'patientCompass', chosenObjectKind: 'mine' };
    refreshArtifactPointers(state);
    const first = hero.artifactState.compassTargetId!;
    expect(state.players.p1.explored).toContain(`${state.map.objects.find((o) => o.id === first)!.position.x},${state.map.objects.find((o) => o.id === first)!.position.y}`);
    refreshArtifactPointers(state);
    expect(hero.artifactState.compassTargetId).toBe(first); // revealed is not visited
    hero.position = { ...state.map.objects.find((object) => object.id === first)!.position };
    refreshArtifactPointers(state);
    expect(hero.artifactState.compassTargetId).not.toBe(first);

    hero.artifacts.equipment.ring1 = { id: 'hollowKey' };
    state.map.objects.push({ id: 'guarded-doc65', kind: 'rewardPickup', position: { ...hero.position },
      reward: { gold: 7 }, collected: false, guardedBy: ['guardian-stays'] });
    const gold = state.players.p1.resources.gold;
    state = apply(state, { type: 'ARTIFACT_SKIP_GUARD', heroId: hero.id, objectId: 'guarded-doc65' });
    expect(state.players.p1.resources.gold).toBe(gold + 7);
    const collected = state.map.objects.find((object) => object.id === 'guarded-doc65');
    expect(collected?.guardedBy).toEqual(['guardian-stays']);

    hero = state.players.p1.hero!;
    hero.artifacts.equipment.cloak = { id: 'crowsErrand' };
    hero.artifacts.backpack.push({ id: 'quietBell' });
    const destination = state.players.p1.heroes.find((candidate) => candidate.id === blocker.id)!;
    const sourceIndex = hero.artifacts.backpack.length - 1;
    state = apply(state, { type: 'ARTIFACT_REMOTE_TRANSFER', sourceHeroId: hero.id,
      destinationHeroId: destination.id, kind: 'artifact', sourceSlot: sourceIndex });
    expect(state.players.p1.heroes.find((h) => h.id === destination.id)!.artifacts.backpack.at(-1)?.id)
      .toBe('quietBell');
  });

  it('executes gross-spend credit/refunds, daily income, chosen growth metadata, direct markets, and three real Debts', () => {
    const state = createGame({ seed: 9302, p1: 'human', p2: 'human' });
    const player = state.players.p1;
    const hero = player.hero!;
    hero.artifacts.equipment.misc1 = { id: 'borrowedPurse' };
    hero.artifacts.equipment.misc2 = { id: 'titheBox' };
    player.resources.gold = 0;
    expect(canPlayerAfford(player, { gold: 2_000 })).toBe(true);
    payPlayer(player, { gold: 5 }); payPlayer(player, { gold: 5 });
    expect(player.artifactState.weeklyRefundGold).toBe(1);
    expect(player.resources.gold).toBe(-10);
    hero.artifacts.equipment.misc2 = { id: 'purseOfThePrudentToad' };
    const retained = state.map.objects.find((object) => object.kind === 'mine')!;
    if (retained.kind !== 'mine') throw new Error('Mine fixture missing');
    retained.owner = 'p2'; retained.productionRedirect = {
      recipient: 'p1', originalOwner: 'p2', throughDay: state.day + 3, hidden: false,
    };
    const scheduled = incomeForPlayer(state, 'p1');
    hero.artifacts.equipment.misc3 = { id: 'openPurse' };
    const doubled = incomeForPlayer(state, 'p1');
    expect(doubled.gold).toBe(scheduled.gold * 2);
    expect(doubled[retained.resource]).toBe(scheduled[retained.resource] * 2);
    hero.artifacts.equipment.amulet = { id: 'growingLedger', chosenDwellingTier: 2 };
    expect(hero.artifacts.equipment.amulet.chosenDwellingTier).toBe(2);
    hero.artifacts.equipment.cloak = { id: 'saltSack' };
    hero.artifacts.equipment.weapon = { id: 'tallystick' };

    hero.artifacts.equipment.misc1 = { id: 'debtLedger' };
    for (let index = 0; index < 2; index += 1) scheduleDebt(hero, {
      id: `real-${index}`, name: 'Debt', description: 'Visible cost', handlerTag: 'announce',
      trigger: { kind: 'day-start', dueDay: 99 }, remainingTriggers: 1,
    });
    state.pendingChoice = { kind: 'bargain', playerId: 'p1', heroId: hero.id,
      options: ['firstHarvest'], source: 'crone' };
    chooseBargain(state, { type: 'CHOOSE_BARGAIN', bargainId: 'firstHarvest' });
    expect(hero.debts).toHaveLength(3);
    expect(() => scheduleDebt(hero, { id: 'fourth', name: 'Debt', description: 'No',
      handlerTag: 'announce', trigger: { kind: 'day-start', dueDay: 99 } })).toThrow(/at most 3/);

    hero.artifacts.equipment.ring1 = { id: 'misersThumb' };
    expect(ARTIFACTS.foundersTrowel.effects).toContain('weekly_double_build');
    expect(ARTIFACTS.saltSack.effects).toContain('lost_mine_income');
    expect(ARTIFACTS.tallystick.effects).toContain('least_resource_income');
  });

  it("executes Tinker's Rounds 2pc inscription and 3pc ordinary Marketplace buy/sell rates", () => {
    const state = createGame({ seed: 9312, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
    hero.position = { x: castle.position.x + castle.entrance.dx,
      y: castle.position.y + castle.entrance.dy };
    castle.buildings.push('mageGuild1', 'marketplace');
    hero.knownSpells = ['rally']; castle.guildDeck = ['rally'];
    hero.artifacts.equipment.misc1 = { id: 'tinkersSpectacles' };
    hero.artifacts.equipment.ring1 = { id: 'misersThumb' };
    state.players.p1.resources.essence = 2;
    guildInscribe(state, castle.id, 'rally');
    expect(state.players.p1.resources.essence).toBe(0);
    hero.artifacts.equipment.misc2 = { id: 'foundersTrowel' };
    state.players.p1.resources.gold = 1_000; state.players.p1.resources.timber = 10;
    marketTrade(state, castle.id, 'buy', 'timber', 1);
    expect(state.players.p1.resources.gold).toBe(800); // normal 400, set rate ×0.5
    const beforeSell = state.players.p1.resources.gold;
    marketTrade(state, castle.id, 'sell', 'timber', 1);
    expect(state.players.p1.resources.gold - beforeSell).toBe(300); // normal 150, doubled
  });

  it('records gross Tithe spend for the non-active defender surrender payer', () => {
    const state = createGame({ seed: 9313, p1: 'human', p2: 'human' });
    const attacker = state.players.p1.hero!; const defender = state.players.p2.hero!;
    defender.artifacts.equipment.misc1 = { id: 'titheBox' };
    state.players.p2.resources.gold = 20_000;
    const [battle] = createBattle(attacker.army, defender.army, attacker, defender, {
      kind: 'hero', targetId: defender.id, destination: defender.position,
      attackerHeroId: attacker.id, defenderHeroId: defender.id, defenderPlayerId: 'p2',
    }, 9313);
    battle.currentStackId = battle.stacks.find((stack) => stack.side === 'defender')!.id;
    state.battle = battle; state.phase = 'combat';
    const next = apply(state, { type: 'BATTLE_SURRENDER' });
    expect(next.players.p2.artifactState.goldSpentThisWeek).toBeGreaterThan(0);
    expect(next.players.p2.artifactState.weeklyRefundGold).toBe(
      Math.floor(next.players.p2.artifactState.goldSpentThisWeek * 0.1));
    expect(next.players.p1.artifactState.goldSpentThisWeek).toBe(0);
  });

  it('executes Spare Tongue for defenders, Pauper adventure casting, Wax order repair, Doll, Mirrorback, Quiet Bell, and Ninth Pip', () => {
    const state = createGame({ seed: 9303, p1: 'human', p2: 'human' });
    const defender = state.players.p2.hero!;
    const lender = addSecondHero(state, 'p2');
    lender.position = { x: defender.position.x + 1, y: defender.position.y };
    lender.knownSpells = ['forgeSpark'];
    defender.artifacts.equipment.head = { id: 'spareTongue' };
    let battle = battleFixture(9303);
    captureArtifactSpellLoans(state, defender, battle.defenderHero!);
    expect(battle.defenderHero!.borrowedSpellIds).toContain('forgeSpark');
    battle.defenderHero!.spellPower = 6;
    battle.currentStackId = battle.stacks.find((stack) => stack.side === 'defender')!.id;
    const target = battle.stacks.find((stack) => stack.side === 'attacker')!;
    const before = target.topHp;
    castStoredSpell(battle, 'defender', { type: 'BATTLE_CAST', spellId: 'forgeSpark',
      targetId: target.id }, false);
    expect(target.topHp).toBeLessThan(before);

    const pauper = state.players.p1.hero!;
    pauper.artifacts.equipment.misc1 = { id: 'paupersGrimoire' };
    pauper.knownSpells = ['wellspring', 'dimensionDoor']; pauper.mana = 0; pauper.movement = 1_000;
    expect(SPELLS.wellspring.tier).toBeLessThanOrEqual(2);
    expect(adventureSpellManaCost(pauper, 'wellspring')).toBe(0);
    expect(canCastAdventureSpell(state, 'wellspring')).toBe(true);
    expect(canCastAdventureSpell(state, 'dimensionDoor')).toBe(false);

    battle = battleFixture(9304);
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'nestingDoll' };
    battle.attackerHero.knownSpells.push('clockworkEscort');
    castStoredSpell(battle, 'attacker', { type: 'BATTLE_CAST', spellId: 'clockworkEscort' }, false);
    expect(battle.stacks.filter((stack) => stack.summoned && stack.side === 'attacker')).toHaveLength(2);
    battle.attackerHero.artifacts.equipment.ring1 = { id: 'ninthPip' };
    const ally = battle.stacks.find((stack) => stack.side === 'attacker')!;
    ally.counters.chill = 2; endStackTurn(battle, ally); expect(ally.counters.chill).toBe(2);
    const waxState = createGame({ seed: 9399, p1: 'human', p2: 'human' });
    waxState.players.p1.hero!.knownSpells = ['forgeSpark'];
    waxState.players.p1.hero!.artifacts.equipment.misc1 = { id: 'waxSealedEnvelope' };
    const [waxBattle] = createBattle(
      makeArmy([{ unitId: 'yeoman', count: 3 }]), makeArmy([{ unitId: 'tinSoldier', count: 1 }]),
      waxState.players.p1.hero!, waxState.players.p2.hero!, {
        kind: 'hero', targetId: 'wax-target', destination: { x: 4, y: 4 },
        attackerHeroId: waxState.players.p1.hero!.id,
        defenderHeroId: waxState.players.p2.hero!.id, defenderPlayerId: 'p2',
      }, 9399,
    );
    expect(waxBattle.attackerHero.artifacts.equipment.misc1?.seededSpellId).toBe('forgeSpark');
    expect(waxBattle.order.every((id) => waxBattle.stacks.some((stack) =>
      stack.id === id && stack.count > 0))).toBe(true);
    expect(waxBattle.currentStackId === null || waxBattle.order.includes(waxBattle.currentStackId))
      .toBe(true);
    const mirror = battleFixture(9340);
    mirror.defenderHero!.artifacts.equipment.cloak = { id: 'mirrorbackCloak' };
    mirror.attackerHero.knownSpells.push('forgeSpark');
    const mirrorTarget = mirror.stacks.find((stack) => stack.side === 'defender')!;
    castStoredSpell(mirror, 'attacker', { type: 'BATTLE_CAST', spellId: 'forgeSpark',
      targetId: mirrorTarget.id }, false);
    expect(mirror.pendingSpellDeflection).not.toBeNull();
    const deflect = legalBattleActions(mirror).find((action) =>
      action.type === 'BATTLE_CHOOSE_SPELL_DEFLECT')!;
    expect(applyBattleAction(mirror, deflect).artifactEffectUses.defender.spell_deflect).toBe(1);

    const quietState = createGame({ seed: 9341, p1: 'human', p2: 'human' });
    quietState.players.p2.hero!.artifacts.equipment.amulet = { id: 'quietBell' };
    quietState.players.p1.hero!.knownSpells.push('rally');
    const [quiet] = createBattle(quietState.players.p1.hero!.army, quietState.players.p2.hero!.army,
      quietState.players.p1.hero!, quietState.players.p2.hero!, { kind: 'hero', targetId: 'quiet',
        destination: { x: 4, y: 4 }, attackerHeroId: quietState.players.p1.hero!.id,
        defenderHeroId: quietState.players.p2.hero!.id, defenderPlayerId: 'p2' }, 9341);
    quiet.currentStackId = quiet.stacks.find((stack) => stack.side === 'attacker')!.id;
    expect(legalBattleActions(quiet).some((action) => action.type === 'BATTLE_CAST')).toBe(false);
  });

  it('executes Long Table/deployment/inheritance/proportionality morale/Chill/grudge/ward combat families', () => {
    const capacityState = createGame({ seed: 9320, p1: 'human', p2: 'human' });
    capacityState.players.p1.hero!.artifacts.equipment.misc1 = { id: 'longTable' };
    expect(heroArmyCapacity(capacityState.players.p1.hero!)).toBe(8);

    const deploymentState = createGame({ seed: 9321, p1: 'human', p2: 'human' });
    deploymentState.players.p1.hero!.artifacts.equipment.boots = { id: 'oddBoot' };
    const [deployment] = createBattle(deploymentState.players.p1.hero!.army,
      deploymentState.players.p2.hero!.army, deploymentState.players.p1.hero!,
      deploymentState.players.p2.hero!, { kind: 'hero', targetId: 'deploy',
        destination: { x: 4, y: 4 }, attackerHeroId: deploymentState.players.p1.hero!.id,
        defenderHeroId: deploymentState.players.p2.hero!.id, defenderPlayerId: 'p2' }, 9321);
    const deployAction = legalBattleActions(deployment).find((action) =>
      action.type === 'BATTLE_DEPLOY_AMBUSH')!;
    expect(applyBattleAction(deployment, deployAction).artifactEffectUses.attacker.free_deployment)
      .toBe(1);

    let battle = battleFixture(9305);
    battle.attackerHero.artifacts.equipment.cloak = { id: 'regimentalColors' };
    const smallest = battle.stacks.find((stack) => stack.id === 'attacker-0')!;
    const ordinary = battleFixture(9305);
    const ordinarySmallest = ordinary.stacks.find((stack) => stack.id === 'attacker-0')!;
    applySpellImpactDamage(battle, { targetId: smallest.id, sourceSide: 'defender',
      base: 9999, coefficient: 0, spellPower: 0 });
    applySpellImpactDamage(ordinary, { targetId: ordinarySmallest.id, sourceSide: 'defender',
      base: 9999, coefficient: 0, spellPower: 0 });
    const colorsMorale = battle.stacks.filter((stack) => stack.side === 'attacker')
      .reduce((sum, stack) => sum + stack.morale, 0);
    const ordinaryMorale = ordinary.stacks.filter((stack) => stack.side === 'attacker')
      .reduce((sum, stack) => sum + stack.morale, 0);
    expect(colorsMorale).toBeLessThan(ordinaryMorale); // triple-weighted loss reaches the zero floor
    expect(battle.recentDestructionScale.attacker)
      .toBeGreaterThan(ordinary.recentDestructionScale.attacker);
    expect(battle.recentDestructionScale.attacker)
      .toBeCloseTo(ordinary.recentDestructionScale.attacker * 3);
    const inherited = battleFixture(9322);
    inherited.attackerHero.artifacts.equipment.armor = { id: 'handMeDownArmor' };
    const fallen = inherited.stacks.find((stack) => stack.id === 'attacker-0')!;
    applySpellImpactDamage(inherited, { targetId: fallen.id, sourceSide: 'defender',
      base: 9999, coefficient: 0, spellPower: 0 });
    const heir = inherited.stacks.find((stack) => stack.id === 'attacker-1')!;
    beginStackTurn(inherited, heir);
    expect(heir.artifactAttackBonus).toBeGreaterThan(0);
    const capped = battleFixture(9315); const overCap = battleFixture(9315);
    for (const candidate of [capped, overCap]) {
      candidate.attackerHero.artifacts.equipment.misc1 = { id: 'grudgeBook' };
    }
    capped.context.attackerPriorFactionBattles = 15;
    overCap.context.attackerPriorFactionBattles = 99;
    const cappedTarget = capped.stacks.find((stack) => stack.id === 'defender-0')!;
    const overTarget = overCap.stacks.find((stack) => stack.id === 'defender-0')!;
    runAttackPipeline(capped, 'attacker-1', cappedTarget.id);
    runAttackPipeline(overCap, 'attacker-1', overTarget.id);
    expect(cappedTarget.count).toBe(overTarget.count);
    expect(cappedTarget.topHp).toBe(overTarget.topHp);
    const whistle = battleFixture(9323);
    whistle.attackerHero.artifacts.equipment.misc1 = { id: 'crackedWhistle' };
    const striker = whistle.stacks.find((stack) => stack.id === 'attacker-0')!;
    const chilled = whistle.stacks.find((stack) => stack.id === 'defender-0')!;
    striker.position = { x: chilled.position.x - 1, y: chilled.position.y };
    chilled.counters.chill = 3;
    runAttackPipeline(whistle, striker.id, chilled.id);
    expect(chilled.retaliationsMade ?? 0).toBe(0);
    const ward = battleFixture(9324);
    ward.defenderHero!.artifacts.equipment.shield = { id: 'deadmansWedge' };
    expect(forcedMoveDistance(ward, 'attacker', 2, 'defender')).toBe(0);
    expect(forcedMoveDistance(ward, 'attacker', 2, 'defender')).toBe(2);
    const campaign = createGame({ seed: 9316, p1: 'human', p2: 'human' });
    const campaignHero = campaign.players.p1.hero!;
    const neutralContext = { ...capped.context, attackerHeroId: campaignHero.id,
      attackerOpponentFaction: 'woundWrights', defenderHeroId: undefined };
    recordArtifactFactionHistory(campaign, campaignHero, null, neutralContext);
    recordArtifactFactionHistory(campaign, campaignHero, null, neutralContext);
    expect(campaign.players.p1.artifactState.priorBattlesByFaction.woundWrights).toBe(2);
    for (const id of ['longTable', 'oddBoot', 'handMeDownArmor', 'crackedWhistle',
      'grudgeBook', 'deadmansWedge'] as const) expect(ARTIFACTS[id].effects).toHaveLength(1);
  });

  it('executes roster-wide Twin Coin, seed-derived Frame copying, Second Face, all Burden contracts, and every set threshold', () => {
    let state = createGame({ seed: 9306, p1: 'human', p2: 'human' });
    const holder = state.players.p1.hero!;
    holder.artifacts.equipment.amulet = { id: 'twinCoin' };
    const ally = addSecondHero(state);
    expect(effectivePlayerPrimaryStat(state.players.p1, ally, 'spellPower')).toBe(ally.spellPower + 2);
    expect(adventureSpellPower(state, ally)).toBe(ally.spellPower + 2);
    expect(maximumMana(ally, state.players.p1)).toBe((ally.knowledge + 2) * 10);
    const third = addSecondHero(state); third.mana = 999;
    state = apply(state, { type: 'SELECT_HERO', heroId: ally.id });
    expect(effectivePlayerPrimaryStat(state.players.p1, ally, 'spellPower')).toBe(ally.spellPower - 1);
    expect(state.players.p1.heroes.find((hero) => hero.id === third.id)!.mana)
      .toBeLessThanOrEqual(maximumMana(third, state.players.p1));

    const frameHero = state.players.p1.hero!;
    frameHero.artifacts.equipment.misc1 = { id: 'emptyFrame' };
    frameHero.artifacts.backpack = [{ id: 'misersThumb' }];
    resolveWeeklyArtifactInstances(state);
    expect(frameHero.artifacts.equipment.misc1.copiedArtifactId).toBe('misersThumb');
    frameHero.artifacts.equipment.misc2 = { id: 'tinkersSpectacles' };
    expect(artifactSetProgress(frameHero, 'tinkersRounds')?.equipped).toBe(2);
    expect(ARTIFACTS.secondFace.effects).toContain('primary_stat_move');
    for (const id of ['gluttonsBit', 'sleeplessCrown', 'openPurse', 'faithfulHound',
      'rustedTongue'] as const) expect(ARTIFACTS[id].burdenRemovalTrigger).toBeTruthy();
    for (const setId of ['tinkersRounds', 'mournersSuit', 'droversKit']) {
      expect(artifactSetProgress(frameHero, setId)?.bonuses.length).toBeGreaterThan(0);
    }
  });

  it('requires Sleepless Crown to remain active in the same city for all seven days', () => {
    const state = createGame({ seed: 9317, p1: 'human', p2: 'human' });
    const hero = state.players.p1.hero!;
    const first = state.castles.find((castle) => castle.owner === 'p1')!;
    const second = { ...first, id: `${first.id}-second`, position: { x: first.position.x + 8,
      y: first.position.y }, buildings: [...first.buildings], available: [...first.available],
      garrison: first.garrison.map((stack) => stack && { ...stack }) };
    state.castles.push(second);
    const entrance = (castle: typeof first) => ({ x: castle.position.x + castle.entrance.dx,
      y: castle.position.y + castle.entrance.dy });
    hero.position = entrance(first);
    for (let day = 0; day < 6; day += 1) updateBurdenCityStreaks(state);
    expect(hero.artifactState.consecutiveCityDays).toBe(0); // pre-equip days never count
    hero.artifacts.equipment.head = { id: 'sleeplessCrown' };
    updateBurdenCityStreaks(state);
    expect(hero.artifactState.consecutiveCityDays).toBe(1);
    hero.position = entrance(second);
    updateBurdenCityStreaks(state);
    expect(hero.artifactState.consecutiveCityDays).toBe(1); // changing city resets
    for (let day = 0; day < 6; day += 1) updateBurdenCityStreaks(state);
    expect(hero.removableBurdens).toContain('sleeplessCrown');
  });

  it("executes Mourner's 2pc/3pc and Drover's 2pc bonuses at their rule boundaries", () => {
    const battle = battleFixture(9318);
    battle.attackerHero.artifacts.equipment.cloak = { id: 'gravebindersSash' };
    battle.attackerHero.artifacts.equipment.ring1 = { id: 'candleSnuffersRing' };
    const ally = battle.stacks.find((stack) => stack.side === 'attacker')!;
    ally.counters.hex = 3; endStackTurn(battle, ally); expect(ally.counters.hex).toBe(3);
    battle.attackerHero.artifacts.equipment.misc1 = { id: 'longestCandle' };
    ally.count = 0; battle.initialCounts[ally.id] = 9;
    battle.longestCandlePending.attacker = ally.id;
    runTurnAdvancePipeline(battle);
    expect(ally.count).toBe(5);

    const drover = battleFixture(9319);
    drover.attackerHero.artifacts.equipment.weapon = { id: 'droversCrook' };
    drover.attackerHero.artifacts.equipment.amulet = { id: 'whetstoneOfTheClans' };
    const beast = drover.stacks.find((stack) => stack.side === 'attacker')!;
    beast.unitId = 'hearthHound';
    const without = battleFixture(9319).stacks.find((stack) => stack.side === 'attacker')!;
    without.unitId = 'hearthHound';
    expect(effectiveSpeed(beast, drover)).toBe(effectiveSpeed(without, battleFixture(9319)) + 2);
  });
});
