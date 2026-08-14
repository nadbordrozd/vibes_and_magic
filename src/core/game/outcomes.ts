import {
  CASTLELESS_LOSS_DAYS, CHEST_GOLD, CHEST_XP, GUARDIAN_VICTORY_XP,
} from '../../content/constants';
import { UNITS } from '../../content/units';
import {
  addUnits, assertHeroArmyFitsCapacity, compactArmy, emptyArmy,
  synchronizeHeroArmyCapacity,
} from '../army';
import { armyAfterBattle } from '../combat/battle';
import { isOriginallyOwnedBy, originalOwnerSide } from '../combat/ownership';
import { gainExperience, specialtyHandler, skillRank } from '../heroBehaviors';
import {
  defeatHero, findHero, findOwnedHero, syncAllHeroViews,
} from '../heroes';
import {
  addArtifact, artifactEffectTotal, cloneArtifacts, dropAllArtifacts, hasEquippedArtifact,
  markBurdenRemovalReady,
} from '../artifacts';
import { revealForMovementPath } from '../map/visibility';
import { randomInt } from '../rng';
import { resolveDebtEvent } from '../debts';
import { buildingIsActive } from './buildingStatus';
import { SKILLS } from '../../content/skills';
import { FACTIONS } from '../../content/factions';
import type {
  ArtifactId, ArtifactInstance, BattleSide, BattleState, GameState, Hero, PlayerId, SpellId,
} from '../types';
import { PLAYER_IDS } from '../types';
import { visitShrine } from './magic';
import { addItem, claimSpellTome, sellTradeGoods } from './items';
import { offerChestChoice } from './chests';
import { checkLevel } from './levelUps';
import { castleEntrance } from '../map/occupancy';
import { learnSpell } from './spellLearning';
export { checkLevel };

export function recoverSpareParts(
  battle: BattleState,
  side: BattleSide,
  rate: number,
): Partial<Record<keyof typeof UNITS, number>> {
  const arkBonus = battle.stacks.some((stack) => isOriginallyOwnedBy(stack, side) && stack.count > 0
    && UNITS[stack.unitId].abilities.includes('hallowed_cargo')) ? 0.15 : 0;
  const recovered: Partial<Record<keyof typeof UNITS, number>> = {};
  for (const stack of battle.stacks) {
    if (!isOriginallyOwnedBy(stack, side) || stack.summoned
        || UNITS[stack.unitId].faction !== 'woundWrights') continue;
    const losses = Math.max(0, (battle.initialCounts[stack.id] ?? stack.count) - stack.count);
    const restored = Math.floor(losses * (rate + arkBonus));
    if (restored <= 0) continue;
    stack.count += restored;
    if (stack.topHp <= 0) stack.topHp = UNITS[stack.unitId].hp;
    recovered[stack.unitId] = (recovered[stack.unitId] ?? 0) + restored;
  }
  battle.recovered[side] = recovered;
  return recovered;
}

function recoverReaperCasualties(
  battle: BattleState, side: BattleSide, rate: number, skipWoundWrights: boolean,
): Partial<Record<keyof typeof UNITS, number>> {
  const recovered: Partial<Record<keyof typeof UNITS, number>> = {};
  for (const stack of battle.stacks) {
    if (!isOriginallyOwnedBy(stack, side) || stack.summoned
        || (skipWoundWrights && UNITS[stack.unitId].faction === 'woundWrights')) continue;
    const initial = battle.initialCounts[stack.id] ?? stack.count;
    const losses = Math.max(0, initial - stack.count);
    const restored = Math.min(losses, Math.floor(losses * rate));
    if (restored <= 0) continue;
    stack.count += restored;
    if (stack.topHp <= 0) stack.topHp = UNITS[stack.unitId].hp;
    recovered[stack.unitId] = (recovered[stack.unitId] ?? 0) + restored;
  }
  for (const [unitId, count] of Object.entries(recovered)) {
    battle.recovered[side][unitId as keyof typeof UNITS] =
      (battle.recovered[side][unitId as keyof typeof UNITS] ?? 0) + (count ?? 0);
  }
  return recovered;
}

export function updateCastlelessCountdowns(state: GameState): void {
  for (const player of Object.values(state.players)) {
    if (!player.active) continue;
    player.castlelessDays = state.castles.some((castle) => castle.owner === player.id)
      ? 0 : player.castlelessDays + 1;
  }
}

export function checkVictory(state: GameState): void {
  if (state.winner) return;
  const objective = state.map.victory;
  for (const player of Object.values(state.players).filter((candidate) => candidate.active)) {
    let achieved = false;
    if (objective.type === 'assemble') {
      const required = objective.setId === 'tailorsKit'
        ? ['tailorsNeedle', 'goldenThread', 'tailorsThimble', 'patternbook'] : [];
      const carried = [...player.heroes, ...player.tavernPool].flatMap((hero) => [
        ...hero.artifacts.backpack.map((artifact) => artifact.id),
        ...Object.values(hero.artifacts.equipment).flatMap((artifact) => artifact ? [artifact.id] : []),
      ]);
      achieved = required.length > 0 && required.every((id) => carried.includes(id as never));
    } else if (objective.type === 'slay') {
      achieved = state.objectiveClaims[objective.objectId] === player.id;
    } else if (objective.type === 'hold') {
      const object = state.map.objects.find((candidate) => candidate.id === objective.objectId);
      const owner = object && 'owner' in object ? object.owner : state.objectiveClaims[objective.objectId];
      if (state.objectiveLastDay[player.id] !== state.day) {
        state.objectiveProgress[player.id] = owner === player.id
          ? (state.objectiveProgress[player.id] ?? 0) + 1 : 0;
        state.objectiveLastDay[player.id] = state.day;
      }
      achieved = state.objectiveProgress[player.id] >= objective.days;
    }
    if (achieved) {
      state.winner = player.id; state.phase = 'gameOver';
      state.lastMessage = `${player.name} completes the objective and wins!`;
      return;
    }
  }
  for (const playerId of PLAYER_IDS as readonly PlayerId[]) {
    const player = state.players[playerId];
    if (!player) continue;
    if (!player.active) continue;
    const hasCastle = state.castles.some((castle) => castle.owner === playerId);
    const hasHero = player.heroes.some((hero) => hero.alive);
    if (hasCastle) player.castlelessDays = 0;
    if ((!hasHero && !hasCastle) || player.castlelessDays >= CASTLELESS_LOSS_DAYS) {
      player.active = false;
      state.eventLog.push(`${player.name} is eliminated.`);
    }
  }
  const survivors = Object.values(state.players).filter((player) => player.active);
  if (objective.type === 'conquest' && survivors.length === 1) {
    state.winner = survivors[0].id;
    state.phase = 'gameOver';
    state.lastMessage = `${survivors[0].name} wins!`;
  }
}

export function chooseChest(state: GameState, choice: 'gold' | 'xp' | 'item'): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'chest') throw new Error('No chest choice pending');
  const object = state.map.objects.find((item) => item.id === pending.objectId);
  if (!object || (object.kind !== 'chest' && object.kind !== 'sealedCask')) {
    throw new Error('Chest missing');
  }
  object.collected = true;
  if (choice === 'gold') state.players[pending.playerId].resources.gold += CHEST_GOLD;
  else if (choice === 'xp') {
    const hero = findOwnedHero(state, pending.playerId, pending.heroId);
    if (hero) gainExperience(hero, CHEST_XP);
  } else {
    const hero = findOwnedHero(state, pending.playerId, pending.heroId);
    if (!hero) throw new Error('Hero missing');
    if (pending.artifact) addArtifact(hero, pending.artifact);
    else if (pending.item.id === 'spellTome') claimSpellTome(hero, pending.item);
    else if (!addItem(hero, pending.item)) throw new Error('Inventory full');
  }
  state.pendingChoice = null;
  state.lastMessage = choice === 'gold' ? 'Claimed 1500 gold.'
    : choice === 'xp' ? 'Claimed 1000 XP.'
      : pending.artifact ? 'Claimed a rare artifact.'
        : pending.item.id === 'spellTome' ? `Learned ${pending.item.storedSpellId}.`
          : 'Claimed an item.';
  checkLevel(state, pending.playerId, pending.heroId);
}

export function chooseStolenSpell(state: GameState, spellId: SpellId): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'spellthief' || !pending.options.includes(spellId)) {
    throw new Error('Invalid stolen spell');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Spellthief missing');
  learnSpell(hero, spellId);
  if (skillRank(hero, 'spellthief') >= 2) {
    const upgrade = [...pending.upgradeOptions].sort().find((id) =>
      !hero.upgradedSpells.includes(id));
    if (upgrade) {
      learnSpell(hero, upgrade);
      hero.upgradedSpells.push(upgrade);
    }
  }
  state.pendingChoice = null;
  state.lastMessage = `${hero.name} stole ${spellId}.`;
  checkLevel(state, pending.playerId, hero.id);
}

export function recordArtifactFactionHistory(
  state: GameState, attackerHero: Hero, defenderHero: Hero | null,
  context: BattleState['context'],
): void {
  if (context.attackerOpponentFaction) {
    const history = state.players[attackerHero.owner].artifactState.priorBattlesByFaction;
    history[context.attackerOpponentFaction] = (history[context.attackerOpponentFaction] ?? 0) + 1;
  }
  if (defenderHero && context.defenderOpponentFaction) {
    const history = state.players[defenderHero.owner].artifactState.priorBattlesByFaction;
    history[context.defenderOpponentFaction] = (history[context.defenderOpponentFaction] ?? 0) + 1;
  }
}

export function finalizeBattle(state: GameState): void {
  const battle = state.battle;
  if (!battle?.winner) return;
  const context = battle.context;
  const attackerHero = findHero(state, context.attackerHeroId);
  if (!attackerHero) throw new Error('Battle attacker disappeared');
  const defenderHero = context.defenderHeroId
    ? findHero(state, context.defenderHeroId) : null;
  const remoteDefenderHero = context.remoteDefenderHeroId
    ? findHero(state, context.remoteDefenderHeroId) : null;
  const defeatedHero = battle.winner === 'attacker' ? defenderHero : attackerHero;
  const winningHero = battle.winner === 'attacker' ? attackerHero : defenderHero;
  if (defeatedHero && winningHero && !battle.duelistTrophyResolved
      && skillRank(winningHero, 'duelist') >= 3) {
    const losingBattleHero = battle.winner === 'attacker'
      ? battle.defenderHero : battle.attackerHero;
    const losingSide = battle.winner === 'attacker' ? 'defender' : 'attacker';
    const options = losingBattleHero
      ? [...Object.values(losingBattleHero.artifacts.equipment),
        ...losingBattleHero.artifacts.backpack]
        .filter((artifact): artifact is ArtifactInstance => artifact !== null)
        .map((artifact) => artifact.id)
        .filter((artifactId) => duelistArtifactCanTransfer(
          battle, losingBattleHero, losingSide, artifactId,
        ))
      : [];
    if (options.length) {
      state.pendingChoice = {
        kind: 'duelistArtifact', playerId: winningHero.owner, heroId: winningHero.id,
        loserHeroId: defeatedHero.id, options: [...new Set(options)], transferOnChoice: true,
      };
      return;
    }
    battle.duelistTrophyResolved = true;
  }
  attackerHero.mana = battle.attackerHero.mana;
  attackerHero.inventory = [...battle.attackerHero.inventory];
  attackerHero.artifacts = cloneArtifacts(battle.attackerHero.artifacts);
  if (defenderHero && battle.defenderHero) {
    defenderHero.mana = battle.defenderHero.mana;
    defenderHero.inventory = [...battle.defenderHero.inventory];
    defenderHero.artifacts = cloneArtifacts(battle.defenderHero.artifacts);
  }
  if (!defenderHero && remoteDefenderHero && battle.defenderHero) {
    remoteDefenderHero.mana = battle.defenderHero.mana;
  }
  if (battle.retaliationSuppressed.attacker) {
    attackerHero.adventureEffects.noRetaliationBattles = Math.max(
      0, attackerHero.adventureEffects.noRetaliationBattles - 1,
    );
  }
  if (defenderHero && battle.retaliationSuppressed.defender) {
    defenderHero.adventureEffects.noRetaliationBattles = Math.max(
      0, defenderHero.adventureEffects.noRetaliationBattles - 1,
    );
  }
  learnCastSpells(attackerHero, battle.spellsCastAgainst.attacker);
  if (defenderHero) learnCastSpells(defenderHero, battle.spellsCastAgainst.defender);
  if (defeatedHero && !battle.withdrawal) {
    dropAllArtifacts(defeatedHero, winningHero);
    applyRansomer(state, winningHero, defeatedHero);
  }
  if (defeatedHero && battle.withdrawal) applyRansomer(state, winningHero, defeatedHero);

  state.lastBattleRecovered = {};
  const reaperRank = winningHero ? skillRank(winningHero, 'reaper') : 0;
  const reaperRate = reaperRank >= 2
    ? SKILLS.reaper.values.rank2 : reaperRank >= 1 ? SKILLS.reaper.values.rank1 : 0;
  if (winningHero?.faction === 'woundWrights') {
    const workshop = state.castles.some(
      (castle) => castle.owner === winningHero.owner
        && buildingIsActive(castle, 'guildWorkshop'),
    );
    const specialty = specialtyHandler(winningHero).recoveryBonus?.() ?? 0;
    state.lastBattleRecovered = recoverSpareParts(
      battle, battle.winner, (workshop ? 0.5 : 0.3) + specialty + reaperRate,
    );
  }
  if (winningHero && reaperRate > 0) {
    const extra = recoverReaperCasualties(
      battle, battle.winner, reaperRate, winningHero.faction === 'woundWrights',
    );
    for (const [unitId, count] of Object.entries(extra)) {
      state.lastBattleRecovered[unitId as keyof typeof UNITS] =
        (state.lastBattleRecovered[unitId as keyof typeof UNITS] ?? 0) + (count ?? 0);
    }
  }
  if (winningHero?.faction === 'vespiary') {
    const losingSide = battle.winner === 'attacker' ? 'defender' : 'attacker';
    const destroyedHp = Object.entries(battle.casualties[losingSide]).reduce(
      (sum, [unitId, count]) => sum + UNITS[unitId as keyof typeof UNITS].hp * (count ?? 0),
      0,
    );
    const rendery = state.castles.some((castle) => castle.owner === winningHero.owner
      && buildingIsActive(castle, 'rendery'));
    const renderRate = specialtyHandler(winningHero).renderRate?.() ?? 0.1;
    const larvae = Math.floor(destroyedHp * renderRate * (rendery ? 2 : 1)
      / UNITS.larvalTide.hp);
    const castle = state.castles.find((item) => item.owner === winningHero.owner);
    if (castle && larvae > 0) {
      castle.available[0] += larvae;
      state.eventLog.push(`The Vespiary rendered the fallen into ${larvae} Larvae.`);
    }
  }
  for (const [side, battleHero] of [
    ['attacker', attackerHero] as const, ['defender', defenderHero] as const,
  ]) {
    if (!battleHero) continue;
    const chapel = state.castles.find((castle) => castle.owner === battleHero.owner
      && buildingIsActive(castle, 'chapelOfCandles'));
    if (!chapel) continue;
    const losses = Object.values(battle.casualties[side])
      .reduce((sum, count) => sum + (count ?? 0), 0);
    chapel.accruedCandleWisps += Math.floor(losses * 0.2);
  }
  if (context.kind === 'castle') {
    const castle = state.castles.find((candidate) => candidate.id === context.targetId);
    if (castle && winningHero && castle.owner === winningHero.owner) {
      markBurdenRemovalReady(winningHero, 'own-city-battle');
    }
    if (castle && buildingIsActive(castle, 'pyreOfTheFallen')) {
      let returning = castle.returningDefenders;
      for (const [unitId, count] of Object.entries(battle.casualties.defender)) {
        const amount = Math.floor((count ?? 0) * 0.5);
        if (amount <= 0) continue;
        returning = addUnits(returning, unitId as keyof typeof UNITS, amount) ?? returning;
      }
      castle.returningDefenders = returning;
    }
  }
  if (winningHero) {
    const winningSide = battle.winner;
    if ((battle.spellCastsBySide[winningSide] ?? 0) === 0) {
      markBurdenRemovalReady(winningHero, 'no-cast-win');
    }
    const ownCasualties = Object.values(battle.casualties[battle.winner])
      .reduce((sum, count) => sum + (count ?? 0), 0);
    if (ownCasualties === 0) markBurdenRemovalReady(winningHero, 'flawless-battle');
    if (defeatedHero && defeatedHero.level >= winningHero.level) {
      markBurdenRemovalReady(winningHero, 'equal-level-hero');
    }
  }
  recordArtifactFactionHistory(state, attackerHero, defenderHero, context);
  recordBattleMetrics(state, battle);
  const casualties = [...Object.values(battle.casualties.attacker),
    ...Object.values(battle.casualties.defender)]
    .reduce((sum, count) => sum + (count ?? 0), 0);
  const spells = [...new Set([
    ...battle.spellsCastAgainst.attacker, ...battle.spellsCastAgainst.defender,
    ...(battle.lastSpellCast ? [battle.lastSpellCast.spellId] : []),
  ])];
  const statistics = {
    stacks: battle.stacks.map((stack) => ({
      id: stack.id, unitId: stack.unitId, side: originalOwnerSide(stack),
      damageDealt: stack.damageDealt ?? 0, damageTaken: stack.damageTaken ?? 0,
      extraActions: stack.extraActionsTaken ?? 0,
    })),
    spellsCast: { ...battle.spellCastsBySide },
    casualtyValue: Object.fromEntries((['attacker', 'defender'] as const).map((side) => [side,
      Object.entries(battle.casualties[side]).reduce((sum, [unitId, count]) =>
        sum + (UNITS[unitId as keyof typeof UNITS].cost.gold ?? 0) * (count ?? 0), 0),
    ])) as Record<BattleSide, number>,
  };
  state.lastBattleStats = statistics;
  state.battleRecords.push({
    day: state.day, position: { ...context.destination }, casualties, spells,
    winner: battle.winner,
    summary: `Day ${state.day}: ${battle.winner} won a ${context.kind} battle in ${battle.round} rounds; ${casualties} casualties.`,
    statistics,
  });
  resolveDebtEvent(state, {
    kind: 'battle-complete', battle: state.metrics.battles,
  });

  if (battle.winner === 'attacker') {
    attackerHero.army = compactArmy(armyAfterBattle(battle, 'attacker'));
    if (reaperRank >= 3 && winningHero === attackerHero) {
      const dead = Object.values(battle.casualties.defender)
        .reduce((sum, count) => sum + (count ?? 0), 0);
      const raised = Math.floor(dead * SKILLS.reaper.values.enemyRaise);
      const tierOne = FACTIONS[attackerHero.faction].startingArmy[0].unitId;
      if (raised > 0) attackerHero.army = addUnits(attackerHero.army, tierOne, raised)
        ?? attackerHero.army;
    }
    attackerHero.position = { ...(context.completeMoveTo ?? context.destination) };
    if (context.completeMoveTo) {
      const player = state.players[attackerHero.owner];
      player.explored = revealForMovementPath(
        player.explored, state.map, player.heroes,
        state.castles.filter((castle) => castle.owner === attackerHero.owner),
        attackerHero, [attackerHero.position],
      );
    }
    const xp = Object.entries(battle.casualties.defender).reduce(
      (sum, [unitId, count]) =>
        sum + UNITS[unitId as keyof typeof UNITS].hp * (count ?? 0),
      context.kind === 'guardian' ? GUARDIAN_VICTORY_XP : 0,
    );
    const gainedXp = gainExperience(attackerHero, xp);
    if (defenderHero && battle.withdrawal?.side === 'defender') {
      defeatHero(state, defenderHero.id, battle.withdrawal.kind === 'surrender'
        ? compactArmy(armyAfterBattle(battle, 'defender')) : undefined);
    }
    applyAttackerVictory(state, attackerHero);
    state.lastMessage = battle.withdrawal
      ? `The defender ${battle.withdrawal.kind}ed.` : `Victory! ${gainedXp} XP gained.`;
    if (defeatedHero && !battle.withdrawal) offerSpellthief(state, attackerHero, defeatedHero);
  } else {
    defeatHero(state, attackerHero.id, battle.withdrawal?.kind === 'surrender'
      ? compactArmy(armyAfterBattle(battle, 'attacker')) : undefined);
    applyDefenderVictory(state, defenderHero);
    if (reaperRank >= 3 && winningHero === defenderHero && defenderHero) {
      const dead = Object.values(battle.casualties.attacker)
        .reduce((sum, count) => sum + (count ?? 0), 0);
      const raised = Math.floor(dead * SKILLS.reaper.values.enemyRaise);
      const tierOne = FACTIONS[defenderHero.faction].startingArmy[0].unitId;
      if (raised > 0) defenderHero.army = addUnits(defenderHero.army, tierOne, raised)
        ?? defenderHero.army;
    }
    state.lastMessage = battle.withdrawal
      ? `The attacker ${battle.withdrawal.kind}ed.` : 'The attacking hero was defeated.';
  }
  for (const battleHero of [attackerHero, defenderHero]) {
    if (!battleHero?.alive || artifactEffectTotal(battleHero, 'post_battle_stack_loss', 'percent') <= 0) continue;
    const largest = battleHero.army.flatMap((stack, slot) => stack ? [{ stack, slot }] : [])
      .sort((a, b) => b.stack.count - a.stack.count || a.slot - b.slot)[0];
    if (largest) {
      const percent = artifactEffectTotal(battleHero, 'post_battle_stack_loss', 'percent');
      largest.stack.count -= Math.max(1, Math.ceil(largest.stack.count * percent / 100));
      if (largest.stack.count <= 0) battleHero.army[largest.slot] = null;
    }
  }
  for (const player of Object.values(state.players)) {
    for (const hero of player.heroes) if (hero.alive) synchronizeHeroArmyCapacity(hero);
  }
  state.battle = null;
  state.phase = 'adventure';
  syncAllHeroViews(state);
  checkVictory(state);
  if (!state.winner && battle.winner === 'attacker' && !state.pendingChoice) {
    checkLevel(state, attackerHero.owner, attackerHero.id);
  }
}

export function chooseDuelistArtifact(state: GameState, artifactId: ArtifactId): void {
  const pending = state.pendingChoice;
  const battle = state.battle;
  if (pending?.kind !== 'duelistArtifact' || !battle
      || !pending.options.includes(artifactId)) throw new Error('Invalid Duelist trophy');
  const winner = battle.winner === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const loser = battle.winner === 'attacker' ? battle.defenderHero : battle.attackerHero;
  const losingSide = battle.winner === 'attacker' ? 'defender' : 'attacker';
  if (!winner || !loser) throw new Error('Duelist trophy heroes are missing');
  if (!duelistArtifactCanTransfer(battle, loser, losingSide, artifactId)) {
    throw new Error('That artifact cannot be taken while it supports surviving army companies');
  }
  let trophy: ArtifactInstance | null = null;
  for (const slot of Object.keys(loser.artifacts.equipment) as Array<keyof typeof loser.artifacts.equipment>) {
    if (loser.artifacts.equipment[slot]?.id !== artifactId) continue;
    const projected = cloneArtifacts(loser.artifacts);
    projected.equipment[slot] = null;
    if (battle.withdrawal?.side === losingSide && battle.withdrawal.kind === 'surrender') {
      try {
        assertHeroArmyFitsCapacity(armyAfterBattle(battle, losingSide), {
          ...loser, artifacts: projected,
        });
      } catch {
        continue;
      }
    }
    trophy = loser.artifacts.equipment[slot];
    loser.artifacts.equipment[slot] = null;
    break;
  }
  if (!trophy) {
    const index = loser.artifacts.backpack.findIndex((artifact) => artifact.id === artifactId);
    if (index >= 0) [trophy] = loser.artifacts.backpack.splice(index, 1);
  }
  if (!trophy) throw new Error('Chosen Duelist trophy is missing');
  winner.artifacts.backpack.push({ ...trophy });
  battle.duelistTrophyResolved = true;
  state.pendingChoice = null;
  finalizeBattle(state);
}

function duelistArtifactCanTransfer(
  battle: BattleState,
  loser: NonNullable<BattleState['attackerHero']>,
  losingSide: BattleSide,
  artifactId: ArtifactId,
): boolean {
  if (loser.artifacts.backpack.some((artifact) => artifact.id === artifactId)) return true;
  if (battle.withdrawal?.side !== losingSide || battle.withdrawal.kind !== 'surrender') return true;
  return Object.keys(loser.artifacts.equipment).some((slot) => {
    const equipmentSlot = slot as keyof typeof loser.artifacts.equipment;
    if (loser.artifacts.equipment[equipmentSlot]?.id !== artifactId) return false;
    const projected = cloneArtifacts(loser.artifacts);
    projected.equipment[equipmentSlot] = null;
    try {
      assertHeroArmyFitsCapacity(armyAfterBattle(battle, losingSide), {
        ...loser, artifacts: projected,
      });
      return true;
    } catch {
      return false;
    }
  });
}

export function learnCastSpells(hero: Hero, spells: SpellId[]): void {
  if (skillRank(hero, 'spellthief') !== 3) return;
  for (const spell of spells) {
    learnSpell(hero, spell);
  }
}

export function applyRansomer(
  state: GameState,
  winner: Hero | null,
  loser: Hero,
): void {
  const rank = winner ? skillRank(winner, 'ransomer') : 0;
  if (!winner || !rank) return;
  state.players[winner.owner].resources.gold += SKILLS.ransomer.values.ransom;
  if (rank >= 2) {
    const carried = loser.inventory.flatMap((item, index) => item ? [index] : []);
    if (carried.length > 0) {
      let choice: number;
      [choice, state.rng] = randomInt(state.rng, carried.length);
      const source = carried[choice];
      const destination = winner.inventory.findIndex((item) => item === null);
      if (destination >= 0) {
        winner.inventory[destination] = loser.inventory[source];
        loser.inventory[source] = null;
      }
    }
  }
  if (rank >= 3) {
    loser.rehireMultiplier = SKILLS.ransomer.values.rehireMultiplier;
    loser.rehireBlockedUntilDay = state.day + SKILLS.ransomer.values.lockDays;
  }
}

function recordBattleMetrics(state: GameState, battle: BattleState): void {
  state.metrics.battles += 1;
  state.metrics.battleRounds.push(battle.round);
  state.metrics.spellCasts += battle.spellCasts;
  state.metrics.battleOutcomes.push({
    targetId: battle.context.targetId, winner: battle.winner!,
  });
  const attackerLosses = Object.values(battle.casualties.attacker)
    .reduce((sum, count) => sum + (count ?? 0), 0);
  const defenderLosses = Object.values(battle.casualties.defender)
    .reduce((sum, count) => sum + (count ?? 0), 0);
  state.metrics.casualties[state.activePlayer] += attackerLosses;
  const defenderMetric = battle.context.kind === 'guardian'
    ? 'neutral' : battle.context.defenderPlayerId;
  if (defenderMetric) state.metrics.casualties[defenderMetric] += defenderLosses;
  const sideOwners: Partial<Record<BattleSide, PlayerId>> = {
    attacker: state.activePlayer,
    ...(battle.context.defenderPlayerId ? { defender: battle.context.defenderPlayerId } : {}),
  };
  for (const side of ['attacker', 'defender'] as const) {
    const owner = sideOwners[side];
    if (!owner) continue;
    const totals = state.metrics.playerTotals[owner];
    totals.damageDealt += battle.stacks.filter((stack) => isOriginallyOwnedBy(stack, side))
      .reduce((sum, stack) => sum + (stack.damageDealt ?? 0), 0);
    totals.damageTaken += battle.stacks.filter((stack) => isOriginallyOwnedBy(stack, side))
      .reduce((sum, stack) => sum + (stack.damageTaken ?? 0), 0);
    totals.spellsCast += battle.spellCastsBySide[side] ?? 0;
    totals.extraActions += battle.extraActions[side];
    totals.casualtyValue += Object.entries(battle.casualties[side]).reduce(
      (sum, [unitId, count]) => sum
        + (UNITS[unitId as keyof typeof UNITS].cost.gold ?? 0) * (count ?? 0), 0,
    );
  }
}

function offerSpellthief(state: GameState, winner: Hero, loser: Hero): void {
  if (!skillRank(winner, 'spellthief')) return;
  const options = loser.knownSpells.filter((id) => !winner.knownSpells.includes(id));
  if (!options.length) return;
  state.pendingChoice = {
    kind: 'spellthief', playerId: winner.owner, heroId: winner.id,
    options, upgradeOptions: [...loser.upgradedSpells],
  };
}

function applyAttackerVictory(state: GameState, hero: Hero): void {
  const context = state.battle!.context;
  if (context.kind === 'guardian') {
    const object = state.map.objects.find((item) => item.id === context.targetId);
    if (object?.kind === 'guardian') {
      state.objectiveClaims[object.id] = hero.owner;
      if (object.protects) state.objectiveClaims[object.protects] = hero.owner;
      if (object.drop && addItem(hero, object.drop)) object.drop = undefined;
      const protectedObject = object.protects
        ? state.map.objects.find((candidate) => candidate.id === object.protects) : undefined;
      if (protectedObject?.kind === 'shipwreck' || protectedObject?.kind === 'sirenRocks'
          || protectedObject?.kind === 'ruinedWatchtower'
          || protectedObject?.kind === 'oldBearsCave'
          || protectedObject?.kind === 'wolfHollow'
          || protectedObject?.kind === 'unquietYard'
          || protectedObject?.kind === 'moltingCourt'
          || protectedObject?.kind === 'spoolHoard') {
        const reward = protectedObject.reward;
        state.players[hero.owner].resources.gold += reward.gold ?? 0;
        state.players[hero.owner].resources.essence += reward.essence ?? 0;
        for (const item of reward.items ?? []) addItem(hero, item);
        for (const artifact of reward.artifacts ?? []) addArtifact(hero, artifact);
        if (reward.teachesSpell) learnSpell(hero, reward.teachesSpell);
        reward.gold = undefined; reward.essence = undefined;
        reward.items = []; reward.artifacts = []; reward.teachesSpell = undefined;
        protectedObject.cleared = true;
        if ('recruitUnitId' in protectedObject && protectedObject.recruitUnitId) {
          hero.army = addUnits(hero.army, protectedObject.recruitUnitId, 5) ?? hero.army;
        }
      }
      state.map.objects = state.map.objects.filter((candidate) => candidate.id !== object.id);
    }
  } else if (context.kind === 'castle') {
    const castle = state.castles.find((item) => item.id === context.targetId)!;
    if (castle.vault) {
      const multiplier = artifactEffectTotal(hero, 'neutral_town_intel') > 0 ? 2 : 1;
      for (const resource of Object.keys(castle.vault) as Array<keyof typeof castle.vault>) {
        state.players[hero.owner].resources[resource] += castle.vault[resource] * multiplier;
      }
      castle.vault = undefined;
    }
    castle.owner = hero.owner;
    castle.wardenHeroId = null;
    castle.garrison = emptyArmy();
    castle.garrisonSource = 'explicit';
    sellTradeGoods(state, hero, castleEntrance(castle));
    if (context.defenderHeroId) defeatHero(state, context.defenderHeroId);
  } else if (context.defenderHeroId) {
    defeatHero(state, context.defenderHeroId);
  }
}

function applyDefenderVictory(state: GameState, defenderHero: Hero | null): void {
  const battle = state.battle!;
  const context = battle.context;
  const survivors = compactArmy(armyAfterBattle(battle, 'defender'));
  if (context.kind === 'guardian') {
    const object = state.map.objects.find((item) => item.id === context.targetId);
    if (object?.kind === 'guardian') {
      object.army = survivors.filter(
        (stack): stack is NonNullable<typeof stack> => stack !== null,
      );
    }
  } else if (context.kind === 'castle') {
    const castle = state.castles.find((item) => item.id === context.targetId)!;
    if (defenderHero) {
      defenderHero.army = survivors;
      castle.garrison = emptyArmy();
    } else {
      castle.garrison = survivors;
    }
    castle.garrisonSource = 'explicit';
  } else if (context.kind === 'hero' && defenderHero) {
    defenderHero.army = survivors;
  }
}
