import { ARTIFACTS } from '../content/artifacts';
import { HERO_REHIRE_COST } from '../content/constants';
import { CASTLE_NAMES } from '../content/factionPresentation';
import { itemName } from '../content/items';
import { UNITS } from '../content/units';
import { surrenderCost } from '../core/combat/battle';
import type {
  Action, BattleSide, BattleStatistics, GameState, Hero, PlayerId, ResourceId,
} from '../core/types';
import { PLAYER_IDS } from '../core/types';
import { inspectTarget } from './inspection';

export interface BattleResultData {
  winner: BattleSide;
  heading: string;
  perspective: 'victory' | 'defeat' | 'hotseat' | 'observed';
  attacker: { actor: string; player: string; controller: string };
  defender: { actor: string; player: string; controller: string };
  humanSide: string;
  encounter: string;
  actualWinner: string;
  casualties: Record<BattleSide, number>;
  xp: { hero: string; amount: number } | null;
  recovered: Array<{ unit: string; count: number }>;
  consequences: Array<{ label: string; detail: string }>;
  continuation: { label: string; detail: string };
  statistics: BattleStatistics | null;
  projection: {
    targetId: string;
    winner: BattleSide;
    casualties: Record<BattleSide, number>;
  } | null;
}

const RESOURCE_IDS: ResourceId[] = ['gold', 'timber', 'iron', 'essence'];

function heroInState(state: GameState, heroId?: string): Hero | null {
  if (!heroId) return null;
  for (const player of Object.values(state.players)) {
    const hero = [...player.heroes, ...player.tavernPool].find((candidate) =>
      candidate.id === heroId);
    if (hero) return hero;
  }
  return null;
}

function controllerName(controller: GameState['players'][PlayerId]['controller']): string {
  if (controller === 'human') return 'Human';
  if (controller === 'dormant') return 'Dormant AI';
  return 'AI';
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

function countLosses(state: GameState, prior: GameState, playerId: PlayerId | 'neutral'): number {
  return state.metrics.casualties[playerId] - prior.metrics.casualties[playerId];
}

function multisetGain(before: string[], after: string[]): string[] {
  const remaining = [...before];
  return after.filter((value) => {
    const index = remaining.indexOf(value);
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
  });
}

function heroItems(hero: Hero | null): string[] {
  return hero?.inventory.flatMap((item) => item ? [itemName(item)] : []) ?? [];
}

function heroArtifacts(hero: Hero | null): string[] {
  if (!hero) return [];
  return [
    ...hero.artifacts.backpack.map((artifact) => ARTIFACTS[artifact.id].name),
    ...Object.values(hero.artifacts.equipment).flatMap((artifact) =>
      artifact ? [ARTIFACTS[artifact.id].name] : []),
  ];
}

function pendingChoiceName(state: GameState): string | null {
  switch (state.pendingChoice?.kind) {
    case 'spellthief': return 'Spellthief reward choice';
    case 'level': return 'level-up choice';
    case 'bargain': return 'bargain choice';
    case 'palimpsest': return 'Palimpsest choice';
    case 'inscribe': return 'inscription choice';
    case 'chest': return 'treasure choice';
    case 'shrine': return 'shrine choice';
    case 'siteStat': return 'site reward choice';
    case 'diplomacy': return 'diplomacy choice';
    case 'toll': return 'toll choice';
    case 'siren': return 'Siren Rocks choice';
    default: return null;
  }
}

export function buildBattleResult(
  prior: GameState,
  next: GameState,
  action: Action,
  projection: BattleResultData['projection'],
): BattleResultData | null {
  const battle = prior.battle;
  const outcome = next.metrics.battleOutcomes.at(-1);
  if (!battle || !outcome) return null;

  const context = battle.context;
  const attackerHero = heroInState(prior, context.attackerHeroId);
  if (!attackerHero) return null;
  const attackerPlayer = prior.players[attackerHero.owner];
  const defenderHero = heroInState(prior, context.defenderHeroId);
  const defenderPlayer = context.defenderPlayerId
    ? prior.players[context.defenderPlayerId] : null;
  const castleBefore = context.kind === 'castle'
    ? prior.castles.find((castle) => castle.id === context.targetId) ?? null : null;
  const guardianBefore = context.kind === 'guardian'
    ? prior.map.objects.find((object) => object.id === context.targetId
      && object.kind === 'guardian') ?? null : null;
  const guardianUnit = guardianBefore?.kind === 'guardian'
    ? guardianBefore.army[0]?.unitId : undefined;
  const defenderActor = defenderHero?.name
    ?? (castleBefore ? `${CASTLE_NAMES[castleBefore.faction]} garrison`
      : guardianUnit ? `${UNITS[guardianUnit].name} guardians` : 'Guardian Company');
  const defenderPlayerName = defenderPlayer?.name
    ?? (context.kind === 'guardian' ? 'Neutral guardians' : 'Neutral garrison');
  const attacker = {
    actor: attackerHero.name,
    player: attackerPlayer.name,
    controller: controllerName(attackerPlayer.controller),
  };
  const defender = {
    actor: defenderActor,
    player: defenderPlayerName,
    controller: defenderPlayer ? controllerName(defenderPlayer.controller) : 'Neutral',
  };
  const winner = outcome.winner;
  const actualWinner = winner === 'attacker'
    ? `${attacker.actor} · ${attacker.player} (attacker)`
    : `${defender.actor} · ${defender.player} (defender)`;

  const attackerHuman = attackerPlayer.controller === 'human';
  const defenderHuman = defenderPlayer?.controller === 'human';
  const humanSide = attackerHuman && defenderHuman
    ? `Both sides · ${attackerPlayer.name} attacks, ${defenderPlayer!.name} defends (hot seat)`
    : attackerHuman ? `Attacker · ${attackerPlayer.name}`
      : defenderHuman ? `Defender · ${defenderPlayer!.name}` : 'Neither side · AI-resolved battle';
  const soleHumanSide: BattleSide | null = attackerHuman !== defenderHuman
    ? (attackerHuman ? 'attacker' : 'defender') : null;
  const perspective = soleHumanSide
    ? (winner === soleHumanSide ? 'victory' : 'defeat')
    : attackerHuman && defenderHuman ? 'hotseat' : 'observed';
  const heading = perspective === 'victory' ? 'Victory'
    : perspective === 'defeat' ? 'Defeat'
      : `${winner === 'attacker' ? attacker.player : defender.player} wins`;

  let encounter: string;
  if (context.kind === 'castle' && castleBefore) {
    encounter = `City assault · ${CASTLE_NAMES[castleBefore.faction]}`;
  } else if (context.kind === 'guardian') {
    const protectedCard = guardianBefore?.kind === 'guardian' && guardianBefore.protects
      ? inspectTarget(prior, prior.castles.some((castle) => castle.id === guardianBefore.protects)
        ? { kind: 'castle', id: guardianBefore.protects }
        : { kind: 'object', id: guardianBefore.protects }) : null;
    encounter = `Guardian encounter · ${defenderActor}${protectedCard
      ? ` protecting ${protectedCard.name}` : ''}`;
  } else {
    encounter = `Hero engagement · ${attackerHero.name} versus ${defenderActor}`;
  }

  const defenderMetric = context.kind === 'guardian'
    ? 'neutral' : context.defenderPlayerId ?? 'neutral';
  const casualties = {
    attacker: countLosses(next, prior, attackerHero.owner),
    defender: countLosses(next, prior, defenderMetric),
  };
  const attackerAfter = heroInState(next, attackerHero.id);
  const xpAmount = Math.max(0, (attackerAfter?.xp ?? attackerHero.xp) - attackerHero.xp);
  const xp = xpAmount > 0 ? { hero: attackerHero.name, amount: xpAmount } : null;
  const recovered = Object.entries(next.lastBattleRecovered).flatMap(([unitId, count]) =>
    count ? [{ unit: UNITS[unitId as keyof typeof UNITS].name, count }] : []);

  const consequences: BattleResultData['consequences'] = [];
  const automaticWithdrawal = action.type === 'AUTO_COMBAT'
    ? next.lastMessage.match(/^The (attacker|defender) (retreat|surrender)ed\.$/) : null;
  const withdrawalSide: BattleSide | null = automaticWithdrawal
    ? automaticWithdrawal[1] as BattleSide
    : (action.type === 'BATTLE_RETREAT' || action.type === 'BATTLE_SURRENDER')
      ? battle.stacks.find((stack) => stack.id === battle.currentStackId)?.side ?? null : null;
  const withdrawalKind: 'retreat' | 'surrender' | null = automaticWithdrawal
    ? automaticWithdrawal[2] as 'retreat' | 'surrender'
    : action.type === 'BATTLE_RETREAT' ? 'retreat'
      : action.type === 'BATTLE_SURRENDER' ? 'surrender' : null;
  if (withdrawalSide) {
    const withdrawing = withdrawalSide === 'attacker' ? attacker : defender;
    if (withdrawalKind === 'retreat') {
      consequences.push({
        label: 'Retreat',
        detail: `${withdrawing.actor} withdrew. The army was lost; the hero retained progression and property.`,
      });
    } else {
      const withdrawingPlayerId = withdrawalSide === 'attacker'
        ? attackerHero.owner : context.defenderPlayerId;
      const paid = withdrawingPlayerId
        ? Math.max(0, prior.players[withdrawingPlayerId].resources.gold
          - next.players[withdrawingPlayerId].resources.gold)
        : surrenderCost(battle, withdrawalSide);
      consequences.push({
        label: 'Surrender',
        detail: `${withdrawing.actor} paid ${paid.toLocaleString()} gold and retained the surviving army.`,
      });
    }
  }

  const defeatedHeroId = winner === 'attacker' ? context.defenderHeroId : context.attackerHeroId;
  const defeatedBefore = heroInState(prior, defeatedHeroId);
  const defeatedAfter = heroInState(next, defeatedHeroId);
  if (defeatedBefore && defeatedAfter?.defeated
      && next.players[defeatedBefore.owner].tavernPool.some((hero) => hero.id === defeatedBefore.id)) {
    const retainedArmy = withdrawalSide === (winner === 'attacker' ? 'defender' : 'attacker')
      && withdrawalKind === 'surrender';
    const protectedProperty = Boolean(withdrawalSide);
    const artifactCount = heroArtifacts(defeatedBefore).length;
    consequences.push({
      label: 'Tavern return',
      detail: `${defeatedBefore.name} returned immediately to ${prior.players[defeatedBefore.owner].name}’s Tavern pool. ${
        retainedArmy ? 'The surviving army was retained.' : 'The army was lost.'} ${
        protectedProperty ? 'Artifacts and progression were retained.'
          : artifactCount ? `${plural(artifactCount, 'artifact')} transferred to the victor; progression was retained.`
            : 'Progression was retained.'} Re-hire costs ${(
        HERO_REHIRE_COST * defeatedAfter.rehireMultiplier).toLocaleString()} gold.`,
    });
  }

  const winningHeroId = winner === 'attacker' ? context.attackerHeroId : context.defenderHeroId;
  const winningBefore = heroInState(prior, winningHeroId);
  const winningAfter = heroInState(next, winningHeroId);
  if (winningBefore && winningAfter) {
    const gainedItems = multisetGain(heroItems(winningBefore), heroItems(winningAfter));
    const gainedArtifacts = multisetGain(heroArtifacts(winningBefore), heroArtifacts(winningAfter));
    if (gainedItems.length || gainedArtifacts.length) consequences.push({
      label: 'Loot',
      detail: [...gainedItems, ...gainedArtifacts].join(', '),
    });
    const learnedSpells = winningAfter.knownSpells.filter((spell) =>
      !winningBefore.knownSpells.includes(spell));
    if (learnedSpells.length) consequences.push({
      label: 'Learned', detail: plural(learnedSpells.length, 'new spell'),
    });
  }

  for (const playerId of PLAYER_IDS as readonly PlayerId[]) {
    const beforePlayer = prior.players[playerId];
    const afterPlayer = next.players[playerId];
    if (!beforePlayer || !afterPlayer) continue;
    const changes = RESOURCE_IDS.flatMap((resource) => {
      const delta = afterPlayer.resources[resource] - beforePlayer.resources[resource];
      return delta ? [`${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString()} ${resource}`] : [];
    });
    if (changes.length) consequences.push({
      label: `${beforePlayer.name} resources`, detail: changes.join(' · '),
    });
  }

  if (context.kind === 'guardian' && guardianBefore?.kind === 'guardian') {
    const guardianAfter = next.map.objects.find((object) => object.id === context.targetId);
    if (!guardianAfter) consequences.push({
      label: 'Guardian',
      detail: `Guardian removed; ${attacker.player} claimed the encounter${guardianBefore.protects ? ' and its protected objective' : ''}.`,
    });
    else if (guardianAfter.kind === 'guardian') consequences.push({
      label: 'Guardian',
      detail: `Guardian remains with ${plural(guardianAfter.army.reduce((sum, stack) => sum + stack.count, 0), 'creature')}.`,
    });
  }
  if (context.kind === 'castle' && castleBefore) {
    const castleAfter = next.castles.find((castle) => castle.id === castleBefore.id)!;
    consequences.push({
      label: 'City ownership',
      detail: castleAfter.owner !== castleBefore.owner
        ? `${CASTLE_NAMES[castleBefore.faction]} captured by ${next.players[castleAfter.owner as PlayerId].name}; its garrison was cleared.`
        : `${CASTLE_NAMES[castleBefore.faction]} remains under ${castleAfter.owner === 'neutral'
          ? 'neutral' : next.players[castleAfter.owner].name} control.`,
    });
  }
  if (recovered.length) consequences.push({
    label: 'Recovery',
    detail: recovered.map(({ unit, count }) => `${count.toLocaleString()} ${unit}`).join(', '),
  });

  const choice = pendingChoiceName(next);
  let continuation: BattleResultData['continuation'];
  if (next.winner) {
    continuation = {
      label: 'Continue to campaign result',
      detail: `${next.players[next.winner].name} completed the campaign; the campaign result and final statistics are next.`,
    };
  } else if (choice) {
    continuation = {
      label: `Continue to ${choice}`,
      detail: `The resolved battle state is saved; ${choice} is pending next.`,
    };
  } else {
    const destination = winner === 'attacker' && attackerAfter?.alive
      ? ` at ${attackerAfter.position.x}, ${attackerAfter.position.y}` : '';
    continuation = {
      label: 'Continue to adventure map',
      detail: `Return to the adventure map${destination} with these consequences already applied.`,
    };
  }

  return {
    winner, heading, perspective, attacker, defender, humanSide, encounter, actualWinner,
    casualties, xp, recovered, consequences, continuation,
    statistics: next.lastBattleStats, projection,
  };
}
