import { describe, expect, it } from 'vitest';
import { combatAbilityFixtures } from '../../sim/combat-action-fixtures';
import { pendingChoiceFixtures } from '../../sim/pending-choice-fixtures';
import {
  PENDING_CHOICE_COVERAGE, SCREEN_MATRIX_COVERAGE,
  SYNTHETIC_MODAL_TARGETING_COVERAGE, WALKTHROUGH_STEP_COVERAGE,
} from '../../sim/walkthrough-coverage';

describe('new-player acceptance evidence manifest', () => {
  it('indexes every binding matrix row and walkthrough step at both viewports', () => {
    expect(SCREEN_MATRIX_COVERAGE).toHaveLength(10);
    expect(WALKTHROUGH_STEP_COVERAGE).toHaveLength(8);
    for (const entry of [...SCREEN_MATRIX_COVERAGE, ...WALKTHROUGH_STEP_COVERAGE]) {
      expect(entry.requirement.length).toBeGreaterThan(20);
      expect(entry.evidence.desktop).toMatch(/-desktop\.png$/);
      expect(entry.evidence.narrow).toMatch(/-narrow\.png$/);
    }
  });

  it('keeps every pending-choice family backed by a concrete synthetic fixture', () => {
    const fixtureKinds = new Set(pendingChoiceFixtures().map((fixture) =>
      fixture.state.pendingChoice?.kind));
    expect(fixtureKinds).not.toContain(undefined);
    expect([...fixtureKinds].sort()).toEqual(Object.keys(PENDING_CHOICE_COVERAGE).sort());
    for (const coverage of Object.values(PENDING_CHOICE_COVERAGE)) {
      expect(coverage.runner).toMatch(/^npm run review:/);
      expect(coverage.evidence.length).toBeGreaterThan(0);
    }
  });

  it('pins every choice-driven combat ability and the modal/targeting family inventory', () => {
    expect(combatAbilityFixtures().map((fixture) => fixture.abilityId).sort()).toEqual([
      'beckoning_song', 'brood_call', 'crossing', 'procession_of_repair', 'the_lure',
      'trample',
    ]);
    expect(SYNTHETIC_MODAL_TARGETING_COVERAGE.map((entry) => entry.id)).toEqual([
      'setup-save-load-import', 'objective-help-inspection',
      'company-item-equipment-transfer', 'adventure-item-target-confirm',
      'combat-stack-targets', 'combat-effect-replacement-no-target',
      'combat-ability-targets', 'battle-and-campaign-results', 'hot-seat-pass',
    ]);
  });
});
