import type { GameState, VictoryCondition } from '../core/types';

export type CampaignPerspective = 'victory' | 'defeat' | 'retirement';

export interface CampaignOutcomePresentation {
  perspective: CampaignPerspective;
  kicker: string;
  heading: string;
  actorLabel: string;
  actor: string;
  affectedLabel: string | null;
  affected: string | null;
  outcomeLabel: string;
  reason: string;
  objective: string;
  flavor: string;
  defeatCondition: string | null;
}

function objectiveLabel(objective: VictoryCondition): string {
  if (objective.type === 'conquest') return 'Conquest';
  if (objective.type === 'assemble') return 'Artifact assembly';
  if (objective.type === 'hold') return `${objective.days}-day hold`;
  if (objective.type === 'slay') return 'Target slain';
  return 'Expedition retired';
}

function objectiveReason(objective: VictoryCondition, actor: string): string {
  if (objective.type === 'conquest') {
    return `${actor} is the last active commander; every opposing banner has fallen.`;
  }
  if (objective.type === 'assemble') {
    return `${actor} completed the authored artifact-assembly objective.`;
  }
  if (objective.type === 'hold') {
    return `${actor} held the objective for ${objective.days} consecutive day${objective.days === 1 ? '' : 's'}.`;
  }
  if (objective.type === 'slay') {
    return `${actor} claimed the authored target and completed the slaying objective.`;
  }
  return `${actor} chose to retire from this sandbox expedition.`;
}

export function campaignOutcome(state: GameState): CampaignOutcomePresentation | null {
  if (!state.winner) return null;
  const winner = state.players[state.winner];
  const humans = Object.values(state.players).filter((player) => player.controller === 'human');
  const humanNames = humans.map((player) => player.name).join(', ');
  const retirement = state.map.victory.type === 'none';
  const humanWon = winner.controller === 'human';
  const perspective: CampaignPerspective = retirement ? 'retirement'
    : humanWon || humans.length === 0 ? 'victory' : 'defeat';
  const affected = perspective === 'defeat' ? humanNames || 'Human commanders' : null;
  return {
    perspective,
    kicker: `${state.map.name} · ${objectiveLabel(state.map.victory)}`,
    heading: perspective === 'retirement' ? `${winner.name} retires`
      : perspective === 'defeat' ? 'Campaign defeat'
        : `${winner.name} is victorious`,
    actorLabel: perspective === 'retirement' ? 'Retiring commander' : 'Winner',
    actor: winner.name,
    affectedLabel: affected ? 'Defeated commander' : null,
    affected,
    outcomeLabel: objectiveLabel(state.map.victory),
    reason: objectiveReason(state.map.victory, winner.name),
    objective: state.map.victory.mechanics,
    flavor: state.map.victory.flavor,
    defeatCondition: state.map.defeat?.mechanics ?? null,
  };
}
