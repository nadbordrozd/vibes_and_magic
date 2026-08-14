import type { PendingChoice } from '../core/types';

export type ViewportEvidence = Readonly<{
  desktop: string;
  narrow: string;
}>;

export interface WalkthroughCoverageEntry {
  id: string;
  title: string;
  requirement: string;
  evidence: ViewportEvidence;
}

const pair = (stem: string): ViewportEvidence => ({
  desktop: `${stem}-desktop.png`,
  narrow: `${stem}-narrow.png`,
});

/** Binding rows from docs/34_UX_COMPLETENESS.md section 6. */
export const SCREEN_MATRIX_COVERAGE = [
  { id: 'title-setup-load', title: 'Title/setup/load', requirement: 'Objective, setup meanings, seed, difficulty, save metadata, and primary start/load action.', evidence: pair('matrix-01-title-setup-load') },
  { id: 'adventure-header-map', title: 'Adventure header/map', requirement: 'Time, omen, objective, economy, hero, route intent, fog, movement feedback, and turn completion.', evidence: pair('matrix-02-adventure-header-map') },
  { id: 'hero-sidebar', title: 'Hero sidebar', requirement: 'Stats, movement, mana, specialty, army, consumables, equipment, skills, spells, and services.', evidence: pair('matrix-03-hero-sidebar') },
  { id: 'castle', title: 'Castle', requirement: 'Context, building states, daily limit, recruitment, transfer, guild, tavern, market, and faction service.', evidence: pair('matrix-04-castle') },
  { id: 'combat', title: 'Combat', requirement: 'Actor, reach, attacks, prediction, spell/item targeting, effects, Wait, Defend, withdrawal, log, and result.', evidence: pair('matrix-05-combat') },
  { id: 'offers-choices', title: 'Offers/choices', requirement: 'Source, exclusivity, cost/consequence, inspection, disabled reason, and cancellation rule.', evidence: pair('matrix-06-offers-choices') },
  { id: 'exchange-equipment', title: 'Exchange/equipment', requirement: 'Source/destination, valid slot, exact transfer result, artifact class/slot/effect, and restrictions.', evidence: pair('matrix-07-exchange-equipment') },
  { id: 'spellbooks', title: 'Spellbooks', requirement: 'Timing, costs, Standard and Upgraded rules, targets, unavailability, and visible scheduled magic.', evidence: pair('matrix-08-spellbooks') },
  { id: 'results-victory', title: 'Results/victory', requirement: 'Winner/outcome, losses/rewards, persistent consequences, and next action.', evidence: pair('matrix-09-results-victory') },
  { id: 'global-reference', title: 'Global reference', requirement: 'Contextual controls, legend, glossary, objective, and help in every phase.', evidence: pair('matrix-10-global-reference') },
] as const satisfies readonly WalkthroughCoverageEntry[];

/** Binding steps from docs/34_UX_COMPLETENESS.md section 8. */
export const WALKTHROUGH_STEP_COVERAGE = [
  { id: 'step-1', title: 'Start and objective', requirement: 'Choose the first-game fixture and restate its authored objective.', evidence: pair('step-01-objective') },
  { id: 'step-2', title: 'Read hero and campaign state', requirement: 'Identify hero, movement, mana, army, skills, specialty, equipment, resources, income, and omen.', evidence: pair('matrix-03-hero-sidebar') },
  { id: 'step-3', title: 'Inspect visible subjects', requirement: 'Inspect terrain, object, guardian, unit, artifact, and secondary skill.', evidence: pair('step-03-inspections') },
  { id: 'step-4', title: 'Adventure actions', requirement: 'Choose empty ground, distinguish safety from a fight, collect, visit, and end turn.', evidence: pair('step-04-route-and-visit') },
  { id: 'step-5', title: 'Castle development', requirement: 'Read building states, build, recruit, and transfer a company.', evidence: pair('matrix-04-castle') },
  { id: 'step-6', title: 'Manual combat', requirement: 'Move, melee, range, Wait, Defend, cast, use an item, cancel targeting, inspect, and read damage/casualties.', evidence: pair('matrix-05-combat') },
  { id: 'step-7', title: 'Reward persistence', requirement: 'Read and accept a reward, then verify the persistent change.', evidence: pair('matrix-06-offers-choices') },
  { id: 'step-8', title: 'Help and targeting recovery', requirement: 'Reopen contextual help and leave targeting without mutation.', evidence: pair('matrix-10-global-reference') },
] as const satisfies readonly WalkthroughCoverageEntry[];

export interface SyntheticCoverageEntry {
  runner: string;
  evidence: readonly string[];
}

/**
 * Exhaustive at compile time: adding a PendingChoice kind requires assigning it a fixture runner
 * and evidence here, then adding the corresponding state to pending-choice-fixtures.ts.
 */
export const PENDING_CHOICE_COVERAGE: Record<PendingChoice['kind'], SyntheticCoverageEntry> = {
  siteStat: { runner: 'npm run review:ux', evidence: ['choice-site-stat-desktop.png', 'choice-site-stat-narrow.png'] },
  chest: { runner: 'npm run review:ux', evidence: ['choice-chest-consumable-open-desktop.png', 'choice-chest-consumable-full-narrow.png', 'choice-chest-artifact-full-consumables-desktop.png'] },
  level: { runner: 'npm run review:ux', evidence: ['choice-level-up-chronicler-desktop.png', 'choice-level-hedge-school-narrow.png'] },
  shrine: { runner: 'npm run review:ux', evidence: ['choice-shrine-two-choices-desktop.png', 'choice-shrine-two-choices-narrow.png'] },
  inscribe: { runner: 'npm run review:ux', evidence: ['choice-inscription-desktop.png', 'choice-inscription-narrow.png'] },
  adept: { runner: 'npm run review:ux', evidence: ['choice-inscription-desktop.png'] },
  duelistArtifact: { runner: 'npm run review:campaign-outcomes', evidence: ['01-border-marches-victory-desktop.png'] },
  diplomacy: { runner: 'npm run review:ux', evidence: ['choice-diplomacy-affordable-desktop.png', 'choice-diplomacy-unavailable-narrow.png'] },
  spellthief: { runner: 'npm run review:ux', evidence: ['choice-spellthief-rank-two-desktop.png', 'choice-spellthief-rank-two-narrow.png'] },
  palimpsest: { runner: 'npm run review:ux', evidence: ['choice-palimpsest-desktop.png', 'choice-palimpsest-narrow.png'] },
  acquisitionSite: { runner: 'npm run review:ux', evidence: [
    'choice-acquisition-site-desktop.png', 'choice-acquisition-site-narrow.png',
  ] },
  bargain: { runner: 'npm run review:ux', evidence: ['choice-bargain-available-desktop.png', 'choice-bargain-unavailable-narrow.png'] },
  toll: { runner: 'npm run review:ux', evidence: ['choice-toll-unaffordable-desktop.png', 'choice-toll-unaffordable-narrow.png'] },
  siren: { runner: 'npm run review:ux', evidence: ['choice-siren-desktop.png', 'choice-siren-narrow.png'] },
};

export const SYNTHETIC_MODAL_TARGETING_COVERAGE = [
  { id: 'setup-save-load-import', runner: 'npm run review:setup-save', evidence: ['01-empty-desktop.png', '03-populated-narrow.png', '04-title-exit-desktop.png', '06-corrupt-import.png'] },
  { id: 'objective-help-inspection', runner: 'npm run review:ux', evidence: ['03-objective-primer.png', '02-menu-help.png', '05-hero-inspection.png', '15-battle-tile-inspection.png'] },
  { id: 'company-item-equipment-transfer', runner: 'npm run review:ux', evidence: ['04d1-exchange-company-confirm.png', '04d2-exchange-company-confirm-narrow.png', '04d3-exchange-item-confirm.png', '04d5-equipment-destination-narrow.png'] },
  { id: 'adventure-item-target-confirm', runner: 'npm run review:service-actions', evidence: ['01-item-hero-targets-desktop.png', '03-item-map-target-mode.png', '04-item-castle-targets-narrow.png', '07-service-confirm.png'] },
  { id: 'combat-stack-targets', runner: 'npm run review:combat-targeting', evidence: ['multistage-rally-desktop.png', 'wall-placement-narrow.png', 'confirmed-item-success.png'] },
  { id: 'combat-effect-replacement-no-target', runner: 'npm run review:combat-targeting', evidence: ['enchantment-replacement-desktop.png', 'no-effect-target-unavailable.png'] },
  { id: 'combat-ability-targets', runner: 'npm run review:ux', evidence: ['ability-procession-of-repair-desktop.png', 'ability-brood-call-desktop.png', 'ability-beckoning-song-desktop.png', 'ability-the-lure-desktop.png', 'ability-crossing-desktop.png', 'ability-trample-desktop.png'] },
  { id: 'battle-and-campaign-results', runner: 'npm run review:campaign-outcomes', evidence: ['01-border-marches-victory-desktop.png', '04-grand-muster-retirement-narrow.png', '05-terminal-help-narrow.png'] },
  { id: 'hot-seat-pass', runner: 'npm run review:ux', evidence: ['18-hot-seat-pass.png'] },
] as const;

export const REQUIRED_CONTINUOUS_ACTIONS = [
  'CAMPAIGN_SETUP', 'SELECT_HERO', 'MOVE_HERO', 'TRANSFER_ARMY', 'BUILD', 'RECRUIT',
  'CHOOSE_CHEST', 'ATTEND_HEDGE_SCHOOL', 'CHOOSE_LEVEL', 'END_TURN',
  'BUY_WAGON_ITEM', 'BATTLE_MOVE', 'BATTLE_MOVE_ATTACK', 'BATTLE_ATTACK',
  'BATTLE_WAIT', 'BATTLE_DEFEND', 'BATTLE_CAST', 'BATTLE_USE_ITEM', 'AUTO_COMBAT',
  'CHOOSE_SITE_STAT',
] as const;
