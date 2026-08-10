import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/game';
import type { GameState, VictoryCondition } from '../../core/types';
import { campaignOutcome } from '../campaignOutcome';
import { ContextHelp } from '../components/ContextHelp';
import { VictoryDialog } from '../components/Dialogs';

function terminalState(mapId: GameState['map']['id'], winner: 'p1' | 'p2' = 'p1'): GameState {
  const state = createGame({
    seed: 4302, mapId, difficulty: 'normal', p1: 'human', p2: 'ai',
  });
  state.winner = winner;
  state.phase = 'gameOver';
  state.pendingChoice = null;
  state.day = 19;
  state.metrics.battles = 7;
  return state;
}

function withObjective(objective: VictoryCondition): GameState {
  const state = terminalState('border-marches');
  state.map = { ...state.map, name: `Fixture ${objective.type}`, victory: objective };
  return state;
}

describe('campaign outcome presentation', () => {
  it('uses Border Marches conquest identity without leaking it into other maps', () => {
    const border = renderToStaticMarkup(<VictoryDialog
      state={terminalState('border-marches')} onMenu={() => undefined} />);
    expect(border).toContain('Border Marches · Conquest');
    expect(border).toContain('Defeat all opposing players.');
    expect(border).toContain('Player 1');
    expect(border).toContain('Final campaign record');
    expect(border).toContain('Return to title');

    const muster = renderToStaticMarkup(<VictoryDialog
      state={terminalState('grand-muster')} onMenu={() => undefined} />);
    expect(muster).toContain('The Grand Muster · Expedition retired');
    expect(muster).toContain('chose to retire from this sandbox expedition');
    expect(muster).toContain('Showcase sandbox: fight, explore, build, and retire when finished.');
    expect(muster).not.toContain('Border Marches');
    expect(muster).not.toContain('rival banner falls');
  });

  it.each([
    [{
      type: 'conquest', flavor: 'Last banner.', mechanics: 'Defeat every rival.',
    } satisfies VictoryCondition, 'Conquest', 'last active commander'],
    [{
      type: 'assemble', setId: 'tailorsKit', flavor: 'Finish the pattern.',
      mechanics: 'Carry all four tools.',
    } satisfies VictoryCondition, 'Artifact assembly', 'artifact-assembly objective'],
    [{
      type: 'hold', objectId: 'watch', days: 3, flavor: 'Keep the watch.',
      mechanics: 'Hold the watch for 3 days.',
    } satisfies VictoryCondition, '3-day hold', '3 consecutive days'],
    [{
      type: 'slay', objectId: 'sleeper', flavor: 'End the sleeper.',
      mechanics: 'Slay the Sleeper.',
    } satisfies VictoryCondition, 'Target slain', 'slaying objective'],
    [{
      type: 'none', flavor: 'Wander freely.', mechanics: 'Retire when ready.',
    } satisfies VictoryCondition, 'Expedition retired', 'sandbox expedition'],
  ])('describes the supported %s outcome deterministically', (objective, label, reason) => {
    const outcome = campaignOutcome(withObjective(objective));
    expect(outcome?.outcomeLabel).toBe(label);
    expect(outcome?.reason).toContain(reason);
    expect(outcome?.objective).toBe(objective.mechanics);
    expect(outcome?.flavor).toBe(objective.flavor);
  });

  it('presents an opposing winner as defeat from the human perspective', () => {
    const state = terminalState('border-marches', 'p2');
    state.map.defeat = {
      type: 'hold', objectId: 'home', days: 2,
      flavor: 'Do not lose the old watch.', mechanics: 'Lose if the rival holds the old watch.',
    };
    const outcome = campaignOutcome(state);
    expect(outcome).toMatchObject({
      perspective: 'defeat', heading: 'Campaign defeat', actor: 'Player 2',
      affected: 'Player 1', defeatCondition: 'Lose if the rival holds the old watch.',
    });
    const html = renderToStaticMarkup(<VictoryDialog state={state} onMenu={() => undefined} />);
    expect(html).toContain('Winner');
    expect(html).toContain('Defeated commander');
    expect(html).toContain('Defeat condition:');
  });

  it('keeps objective help and the return action available in terminal state', () => {
    const state = terminalState('crosstitch-kit');
    const help = renderToStaticMarkup(<ContextHelp state={state} context="campaign" />);
    const dialog = renderToStaticMarkup(<VictoryDialog state={state} onMenu={() => undefined} />);
    expect(help).toContain('Help');
    expect(help).toContain('aria-haspopup="dialog"');
    expect(dialog).toContain('Return to title');
    expect(dialog).toContain('Equip or carry Tailor');
    expect(dialog).toContain('Campaign complete · the loaded save remains unchanged.');
    expect(dialog).not.toContain('Open Help to revisit the objective and reference');
  });
});
