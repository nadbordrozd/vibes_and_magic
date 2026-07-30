import { UNITS } from '../../content/units';
import {
  CHEST_GOLD, CHEST_XP, GUARDIAN_VICTORY_XP,
} from '../../content/constants';
import {
  compactArmy, emptyArmy,
} from '../army';
import { armyAfterBattle } from '../combat/battle';
import {
  drawLevelOptions, needsLevel,
} from '../progression';
import type {
  BattleSide, BattleState, GameState, LevelChoice, PlayerId, PrimaryStat,
} from '../types';
import { visitShrine } from './magic';

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

export function checkVictory(state: GameState): void {
  for (const playerId of ['p1', 'p2'] as PlayerId[]) {
    if (!state.castles.some((castle) => castle.owner === playerId)) {
      state.winner = playerId === 'p1' ? 'p2' : 'p1';
      state.phase = 'gameOver';
      state.lastMessage = `${state.players[state.winner].name} wins!`;
    }
  }
}

export function checkLevel(state: GameState, playerId: PlayerId): void {
  const hero = state.players[playerId].hero;
  if (!hero || !needsLevel(hero)) return;
  const [options, nextRng] = drawLevelOptions(hero, state.rng);
  state.rng = nextRng;
  state.pendingChoice = { kind: 'level', playerId, options };
}

export function chooseChest(state: GameState, choice: 'gold' | 'xp'): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'chest') throw new Error('No chest choice pending');
  const object = state.map.objects.find((item) => item.id === pending.objectId);
  if (!object || object.kind !== 'chest') throw new Error('Chest missing');
  object.collected = true;
  if (choice === 'gold') state.players[pending.playerId].resources.gold += CHEST_GOLD;
  else {
    const hero = state.players[pending.playerId].hero;
    if (hero) hero.xp += CHEST_XP;
  }
  state.pendingChoice = null;
  state.lastMessage = choice === 'gold' ? 'Claimed 1500 gold.' : 'Claimed 1000 XP.';
  checkLevel(state, pending.playerId);
}

export function chooseLevel(state: GameState, stat: LevelChoice): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'level' || !pending.options.includes(stat)) {
    throw new Error('Invalid level option');
  }
  const hero = state.players[pending.playerId].hero;
  if (!hero) throw new Error('Hero missing');
  hero.level += 1;
  if (stat === 'inscribe') {
    const options = hero.knownSpells.filter((id) => !hero.upgradedSpells.includes(id));
    state.pendingChoice = { kind: 'inscribe', playerId: pending.playerId, options };
    state.lastMessage = `Level ${hero.level}: choose a spell to inscribe.`;
  } else {
    hero[stat as PrimaryStat] += 1;
    if (stat === 'knowledge') hero.mana = Math.min(hero.mana, hero.knowledge * 10);
    state.pendingChoice = null;
    state.lastMessage = `Level ${hero.level}: +1 ${stat}.`;
  }
  checkLevel(state, pending.playerId);
}

export function finalizeBattle(state: GameState): void {
  const battle = state.battle;
  if (!battle?.winner) return;
  const attackerPlayer = state.players[state.activePlayer];
  const attackerHero = attackerPlayer.hero;
  if (!attackerHero) throw new Error('Battle attacker disappeared');
  const context = battle.context;
  attackerHero.mana = battle.attackerHero.mana;
  if (context.defenderPlayerId && battle.defenderHero) {
    const defenderHero = state.players[context.defenderPlayerId].hero;
    if (defenderHero) defenderHero.mana = battle.defenderHero.mana;
  }
  state.lastBattleRecovered = {};
  const winningPlayerId = battle.winner === 'attacker'
    ? state.activePlayer : context.defenderPlayerId;
  const winningPlayer = winningPlayerId ? state.players[winningPlayerId] : null;
  if (winningPlayer?.faction === 'woundWrights') {
    const workshop = state.castles.some(
      (castle) => castle.owner === winningPlayerId
        && castle.buildings.includes('guildWorkshop'),
    );
    state.lastBattleRecovered = recoverSpareParts(
      battle, battle.winner, workshop ? 0.5 : 0.3,
    );
  }
  state.metrics.battles += 1;
  state.metrics.battleRounds.push(battle.round);
  state.metrics.spellCasts += battle.spellCasts;
  state.metrics.battleOutcomes.push({
    targetId: battle.context.targetId, winner: battle.winner,
  });
  const attackerLosses = Object.values(battle.casualties.attacker)
    .reduce((sum, count) => sum + (count ?? 0), 0);
  const defenderLosses = Object.values(battle.casualties.defender)
    .reduce((sum, count) => sum + (count ?? 0), 0);
  state.metrics.casualties[state.activePlayer] += attackerLosses;
  const defenderMetric = context.kind === 'guardian'
    ? 'neutral' : context.defenderPlayerId;
  if (defenderMetric) state.metrics.casualties[defenderMetric] += defenderLosses;

  if (battle.winner === 'attacker') {
    attackerHero.army = compactArmy(armyAfterBattle(battle, 'attacker'));
    attackerHero.position = { ...context.destination };
    const xp = Object.entries(battle.casualties.defender).reduce(
      (sum, [unitId, count]) =>
        sum + UNITS[unitId as keyof typeof UNITS].hp * (count ?? 0),
      context.kind === 'guardian' ? GUARDIAN_VICTORY_XP : 0,
    );
    attackerHero.xp += xp;
    applyAttackerVictory(state);
    state.lastMessage = `Victory! ${xp} XP gained.`;
  } else {
    attackerPlayer.hero = null;
    applyDefenderVictory(state);
    state.lastMessage = 'The attacking hero was defeated.';
  }
  state.battle = null;
  state.phase = 'adventure';
  checkVictory(state);
  if (!state.winner && attackerPlayer.hero && !state.pendingChoice) {
    checkLevel(state, attackerPlayer.id);
  }
}

function applyAttackerVictory(state: GameState): void {
  const battle = state.battle!;
  const context = battle.context;
  const hero = state.players[state.activePlayer].hero!;
  if (context.kind === 'guardian') {
    const object = state.map.objects.find((item) => item.id === context.targetId);
    if (object?.kind === 'mine') {
      object.cleared = true;
      object.owner = hero.owner;
    } else if (object?.kind === 'chest') {
      object.cleared = true;
      state.pendingChoice = { kind: 'chest', objectId: object.id, playerId: hero.owner };
    } else if (object?.kind === 'shrine') {
      object.cleared = true;
      visitShrine(state, object.id, hero);
    }
  } else if (context.kind === 'castle') {
    const castle = state.castles.find((item) => item.id === context.targetId)!;
    castle.owner = hero.owner;
    castle.garrison = emptyArmy();
    const defender = context.defenderPlayerId
      ? state.players[context.defenderPlayerId] : null;
    if (defender?.hero && context.defenderHeroId) defender.hero = null;
  } else if (context.defenderPlayerId) {
    state.players[context.defenderPlayerId].hero = null;
  }
}

function applyDefenderVictory(state: GameState): void {
  const battle = state.battle!;
  const context = battle.context;
  const survivors = compactArmy(armyAfterBattle(battle, 'defender'));
  if (context.kind === 'guardian') {
    const object = state.map.objects.find((item) => item.id === context.targetId);
    if (object && object.kind !== 'pile' && object.guard) {
      object.guard.army = survivors.filter(
        (stack): stack is NonNullable<typeof stack> => stack !== null,
      );
    }
  } else if (context.kind === 'castle' && context.defenderPlayerId) {
    const defender = state.players[context.defenderPlayerId];
    const castle = state.castles.find((item) => item.id === context.targetId)!;
    if (defender.hero && context.defenderHeroId) {
      defender.hero.army = survivors;
      castle.garrison = emptyArmy();
    } else {
      castle.garrison = survivors;
    }
  } else if (context.kind === 'hero' && context.defenderPlayerId) {
    const defender = state.players[context.defenderPlayerId];
    if (defender.hero) defender.hero.army = survivors;
  }
}
