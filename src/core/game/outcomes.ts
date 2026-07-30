import {
  CASTLELESS_LOSS_DAYS, CHEST_GOLD, CHEST_XP, GUARDIAN_VICTORY_XP,
} from '../../content/constants';
import { UNITS } from '../../content/units';
import {
  compactArmy, emptyArmy,
} from '../army';
import { armyAfterBattle } from '../combat/battle';
import { specialtyHandler, skillRank } from '../heroBehaviors';
import {
  defeatHero, findHero, findOwnedHero, selectedHero, syncAllHeroViews,
} from '../heroes';
import {
  drawLevelOptions, needsLevel,
} from '../progression';
import type {
  BattleSide, BattleState, GameState, Hero, LevelChoice, PlayerId, PrimaryStat,
  SecondarySkillId, SpellId,
} from '../types';
import { visitShrine } from './magic';
import { addItem, sellTradeGoods } from './items';
import { offerChestChoice } from './chests';

export function recoverSpareParts(
  battle: BattleState,
  side: BattleSide,
  rate: number,
): Partial<Record<keyof typeof UNITS, number>> {
  const recovered: Partial<Record<keyof typeof UNITS, number>> = {};
  for (const stack of battle.stacks) {
    if (stack.side !== side || stack.count <= 0 || stack.summoned
        || UNITS[stack.unitId].faction !== 'woundWrights') continue;
    const losses = Math.max(0, (battle.initialCounts[stack.id] ?? stack.count) - stack.count);
    const restored = Math.floor(losses * rate);
    if (restored <= 0) continue;
    stack.count += restored;
    recovered[stack.unitId] = (recovered[stack.unitId] ?? 0) + restored;
  }
  battle.recovered[side] = recovered;
  return recovered;
}

export function updateCastlelessCountdowns(state: GameState): void {
  for (const player of Object.values(state.players)) {
    player.castlelessDays = state.castles.some((castle) => castle.owner === player.id)
      ? 0 : player.castlelessDays + 1;
  }
}

export function checkVictory(state: GameState): void {
  if (state.winner) return;
  for (const playerId of ['p1', 'p2'] as PlayerId[]) {
    const player = state.players[playerId];
    const hasCastle = state.castles.some((castle) => castle.owner === playerId);
    const hasHero = player.heroes.some((hero) => hero.alive);
    if (hasCastle) player.castlelessDays = 0;
    if ((!hasHero && !hasCastle) || player.castlelessDays >= CASTLELESS_LOSS_DAYS) {
      state.winner = playerId === 'p1' ? 'p2' : 'p1';
      state.phase = 'gameOver';
      state.lastMessage = `${state.players[state.winner].name} wins!`;
      return;
    }
  }
}

export function checkLevel(
  state: GameState,
  playerId: PlayerId,
  heroId?: string,
): void {
  const hero = heroId
    ? findOwnedHero(state, playerId, heroId)
    : selectedHero(state.players[playerId]);
  if (!hero || !needsLevel(hero)) return;
  const [options, nextRng] = drawLevelOptions(hero, state.rng);
  state.rng = nextRng;
  state.pendingChoice = { kind: 'level', playerId, heroId: hero.id, options };
}

export function chooseChest(state: GameState, choice: 'gold' | 'xp' | 'item'): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'chest') throw new Error('No chest choice pending');
  const object = state.map.objects.find((item) => item.id === pending.objectId);
  if (!object || object.kind !== 'chest') throw new Error('Chest missing');
  object.collected = true;
  if (choice === 'gold') state.players[pending.playerId].resources.gold += CHEST_GOLD;
  else if (choice === 'xp') {
    const hero = findOwnedHero(state, pending.playerId, pending.heroId);
    if (hero) hero.xp += CHEST_XP;
  } else {
    const hero = findOwnedHero(state, pending.playerId, pending.heroId);
    if (!hero || !addItem(hero, pending.item)) throw new Error('Inventory full');
  }
  state.pendingChoice = null;
  state.lastMessage = choice === 'gold' ? 'Claimed 1500 gold.'
    : choice === 'xp' ? 'Claimed 1000 XP.' : 'Claimed an item.';
  checkLevel(state, pending.playerId, pending.heroId);
}

const PRIMARY_STATS: PrimaryStat[] = ['attack', 'defense', 'spellPower', 'knowledge'];

export function chooseLevel(state: GameState, choice: LevelChoice): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'level' || !pending.options.includes(choice)) {
    throw new Error('Invalid level option');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Hero missing');
  hero.level += 1;
  if (choice === 'inscribe') {
    const options = hero.knownSpells.filter((id) => !hero.upgradedSpells.includes(id));
    state.pendingChoice = {
      kind: 'inscribe', playerId: pending.playerId, heroId: hero.id, options,
    };
    state.lastMessage = `Level ${hero.level}: choose a spell to inscribe.`;
  } else if (PRIMARY_STATS.includes(choice as PrimaryStat)) {
    hero[choice as PrimaryStat] += 1;
    if (choice === 'knowledge') hero.mana = Math.min(hero.mana, hero.knowledge * 10);
    state.pendingChoice = null;
    state.lastMessage = `Level ${hero.level}: +1 ${choice}.`;
  } else {
    const skillId = choice as SecondarySkillId;
    hero.skills[skillId] = hero.skills[skillId] === 1 ? 2 : 1;
    state.pendingChoice = null;
    state.lastMessage = `Level ${hero.level}: ${skillId} rank ${hero.skills[skillId]}.`;
  }
  if (!state.pendingChoice) checkLevel(state, pending.playerId, hero.id);
}

export function chooseStolenSpell(state: GameState, spellId: SpellId): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'spellthief' || !pending.options.includes(spellId)) {
    throw new Error('Invalid stolen spell');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Spellthief missing');
  if (!hero.knownSpells.includes(spellId)) hero.knownSpells.push(spellId);
  if (skillRank(hero, 'spellthief') === 2) {
    const upgrade = [...pending.upgradeOptions].sort().find((id) =>
      !hero.upgradedSpells.includes(id));
    if (upgrade) {
      if (!hero.knownSpells.includes(upgrade)) hero.knownSpells.push(upgrade);
      hero.upgradedSpells.push(upgrade);
    }
  }
  state.pendingChoice = null;
  state.lastMessage = `${hero.name} stole ${spellId}.`;
  checkLevel(state, pending.playerId, hero.id);
}

export function finalizeBattle(state: GameState): void {
  const battle = state.battle;
  if (!battle?.winner) return;
  const context = battle.context;
  const attackerHero = findHero(state, context.attackerHeroId);
  if (!attackerHero) throw new Error('Battle attacker disappeared');
  const defenderHero = context.defenderHeroId
    ? findHero(state, context.defenderHeroId) : null;
  attackerHero.mana = battle.attackerHero.mana;
  attackerHero.inventory = [...battle.attackerHero.inventory];
  if (defenderHero && battle.defenderHero) {
    defenderHero.mana = battle.defenderHero.mana;
    defenderHero.inventory = [...battle.defenderHero.inventory];
  }
  const defeatedHero = battle.winner === 'attacker' ? defenderHero : attackerHero;
  const winningHero = battle.winner === 'attacker' ? attackerHero : defenderHero;

  state.lastBattleRecovered = {};
  if (winningHero?.faction === 'woundWrights') {
    const workshop = state.castles.some(
      (castle) => castle.owner === winningHero.owner
        && castle.buildings.includes('guildWorkshop'),
    );
    const specialty = specialtyHandler(winningHero).recoveryBonus?.() ?? 0;
    state.lastBattleRecovered = recoverSpareParts(
      battle, battle.winner, (workshop ? 0.5 : 0.3) + specialty,
    );
  }
  recordBattleMetrics(state, battle);

  if (battle.winner === 'attacker') {
    attackerHero.army = compactArmy(armyAfterBattle(battle, 'attacker'));
    attackerHero.position = { ...context.destination };
    const xp = Object.entries(battle.casualties.defender).reduce(
      (sum, [unitId, count]) =>
        sum + UNITS[unitId as keyof typeof UNITS].hp * (count ?? 0),
      context.kind === 'guardian' ? GUARDIAN_VICTORY_XP : 0,
    );
    attackerHero.xp += xp;
    applyAttackerVictory(state, attackerHero);
    state.lastMessage = `Victory! ${xp} XP gained.`;
    if (defeatedHero) offerSpellthief(state, attackerHero, defeatedHero);
  } else {
    defeatHero(state, attackerHero.id);
    applyDefenderVictory(state, defenderHero);
    state.lastMessage = 'The attacking hero was defeated.';
  }
  state.battle = null;
  state.phase = 'adventure';
  syncAllHeroViews(state);
  checkVictory(state);
  if (!state.winner && battle.winner === 'attacker' && !state.pendingChoice) {
    checkLevel(state, attackerHero.owner, attackerHero.id);
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
    if (object && 'guard' in object && object.guard?.drop
        && addItem(hero, object.guard.drop)) {
      object.guard!.drop = undefined;
    }
    if (object?.kind === 'mine') {
      object.cleared = true;
      object.owner = hero.owner;
    } else if (object?.kind === 'chest') {
      object.cleared = true;
      offerChestChoice(state, object.id, hero);
    } else if (object?.kind === 'shrine') {
      object.cleared = true;
      visitShrine(state, object.id, hero);
    } else if (object?.kind === 'lock') {
      object.cleared = true;
      const player = state.players[hero.owner];
      player.resources.gold += object.reward.gold ?? 0;
      player.resources.essence += object.reward.essence ?? 0;
      object.reward.gold = undefined;
      object.reward.essence = undefined;
      object.reward.items = (object.reward.items ?? []).filter((item) => !addItem(hero, item));
    }
  } else if (context.kind === 'castle') {
    const castle = state.castles.find((item) => item.id === context.targetId)!;
    castle.owner = hero.owner;
    castle.garrison = emptyArmy();
    sellTradeGoods(state, hero, castle.position);
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
    if (object && 'guard' in object && object.guard) {
      object.guard.army = survivors.filter(
        (stack): stack is NonNullable<typeof stack> => stack !== null,
      );
    }
  } else if (context.kind === 'castle' && context.defenderPlayerId) {
    const castle = state.castles.find((item) => item.id === context.targetId)!;
    if (defenderHero) {
      defenderHero.army = survivors;
      castle.garrison = emptyArmy();
    } else {
      castle.garrison = survivors;
    }
  } else if (context.kind === 'hero' && defenderHero) {
    defenderHero.army = survivors;
  }
}
