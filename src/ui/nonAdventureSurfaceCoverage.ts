export type NonAdventureSurface = {
  id: string;
  component: string;
  primaryJob: string;
  primaryState: string;
  primaryAction: string;
  referenceRoute: 'inspection' | 'help' | 'inline-detail';
  representative?: 'setup' | 'hero' | 'castle' | 'combat' | 'spellbook' | 'choice' | 'result' | 'save-import';
};

/**
 * Presentation inventory for every surface outside the adventure map shell. The map shell remains
 * separately owned; hero inspection and map spell dialogs are included because they are bounded
 * task surfaces displayed over it.
 */
export const NON_ADVENTURE_SURFACES = [
  { id: 'title-setup', component: 'MainMenu', primaryJob: 'Configure one deterministic campaign.', primaryState: 'Selected map, objective, difficulty, players, factions, and seed.', primaryAction: 'Begin campaign.', referenceRoute: 'help', representative: 'setup' },
  { id: 'title-load', component: 'MainMenu', primaryJob: 'Resume or import one campaign.', primaryState: 'Compatible save identity and turn.', primaryAction: 'Load or import.', referenceRoute: 'inline-detail', representative: 'save-import' },
  { id: 'map-editor-library', component: 'MapEditor', primaryJob: 'Create, open, clone, or import one authored map.', primaryState: 'Local drafts, built-in sources, and portable import identity.', primaryAction: 'Open an editable document.', referenceRoute: 'inline-detail' },
  { id: 'map-editor-workspace', component: 'MapEditor', primaryJob: 'Edit and preserve one portable authored map.', primaryState: 'Map identity, save state, dimensions, and diagnostics.', primaryAction: 'Save or export the draft.', referenceRoute: 'inline-detail' },
  { id: 'hot-seat-pass', component: 'PassDevice', primaryJob: 'Hand control to the named next player.', primaryState: 'Player and faction.', primaryAction: 'Reveal the map.', referenceRoute: 'help' },
  { id: 'hero-details', component: 'InspectionLayer', primaryJob: 'Understand one hero identity and rules.', primaryState: 'Hero story, specialty, stats, skills, army, and loadout.', primaryAction: 'Close and return.', referenceRoute: 'inspection', representative: 'hero' },
  { id: 'hero-equipment', component: 'ArtifactPaperDoll', primaryJob: 'Equip or unequip one artifact.', primaryState: 'Selected artifact, legal slots, and resulting loadout.', primaryAction: 'Confirm equipment change.', referenceRoute: 'inspection' },
  { id: 'hero-exchange', component: 'ExchangeScreen', primaryJob: 'Transfer one company or consumable between adjacent heroes.', primaryState: 'Both holders, selected source, and destination result.', primaryAction: 'Review and confirm transfer.', referenceRoute: 'inspection' },
  { id: 'castle', component: 'CastleScreen', primaryJob: 'Complete one town development task.', primaryState: 'Ownership, visiting context, resources, and selected task.', primaryAction: 'Build, recruit, transfer, or use one service.', referenceRoute: 'inspection', representative: 'castle' },
  { id: 'combat', component: 'CombatScreen', primaryJob: 'Resolve the active company action.', primaryState: 'Round, sides, active stack, reachable targets, and latest event.', primaryAction: 'Move, attack, wait, defend, cast, use an item, withdraw, or auto-resolve.', referenceRoute: 'help', representative: 'combat' },
  { id: 'combat-targeting', component: 'CombatScreen targeting banner', primaryJob: 'Choose and confirm legal targets.', primaryState: 'Source, stage, cost, prediction, and selected targets.', primaryAction: 'Confirm or cancel.', referenceRoute: 'inline-detail' },
  { id: 'combat-spellbook', component: 'SpellbookPanel', primaryJob: 'Choose one legal combat spell.', primaryState: 'Mana, active face, cost, and availability.', primaryAction: 'Cast or close.', referenceRoute: 'inspection', representative: 'spellbook' },
  { id: 'adventure-spellbook', component: 'AdventureSpellbook', primaryJob: 'Choose one legal map spell.', primaryState: 'Mana, movement, active face, and availability.', primaryAction: 'Cast or close.', referenceRoute: 'inspection' },
  { id: 'pending-choice', component: 'ChoiceDialog', primaryJob: 'Commit one canonical mutually exclusive outcome.', primaryState: 'Source, exact outcomes, costs, and disabled reasons.', primaryAction: 'Choose one result.', referenceRoute: 'inspection', representative: 'choice' },
  { id: 'battle-result', component: 'BattleResult', primaryJob: 'Understand the battle consequence and continue.', primaryState: 'Winner, losses, rewards, and persistent changes.', primaryAction: 'Continue.', referenceRoute: 'inline-detail', representative: 'result' },
  { id: 'campaign-result', component: 'VictoryDialog', primaryJob: 'Understand the authored campaign outcome.', primaryState: 'Outcome, objective, actor, final day, and battles.', primaryAction: 'Return to title.', referenceRoute: 'inline-detail' },
  { id: 'structure-service', component: 'AdventureStructureDialog', primaryJob: 'Complete one visited structure service.', primaryState: 'Structure, exact offer, cost, and availability.', primaryAction: 'Review action or close.', referenceRoute: 'inspection' },
  { id: 'item-target', component: 'AdventureItemDialog', primaryJob: 'Choose one legal item use.', primaryState: 'Item, legal target, cost, and effect.', primaryAction: 'Review or cancel.', referenceRoute: 'inspection' },
  { id: 'action-confirmation', component: 'ActionConfirmationDialog', primaryJob: 'Confirm one irreversible action.', primaryState: 'Actor, target, exact cost, and effect.', primaryAction: 'Confirm or cancel.', referenceRoute: 'inline-detail' },
  { id: 'building-detail', component: 'CastleScreen building detail', primaryJob: 'Inspect or build one town improvement.', primaryState: 'Function, cost, prerequisite, and exact availability.', primaryAction: 'Build or close.', referenceRoute: 'inspection' },
] as const satisfies readonly NonAdventureSurface[];

export function validateNonAdventureSurfaceCoverage(): void {
  const ids = new Set<string>();
  const representatives = new Set<string>();
  for (const surface of NON_ADVENTURE_SURFACES) {
    if (ids.has(surface.id)) throw new Error(`Duplicate non-adventure surface ${surface.id}`);
    ids.add(surface.id);
    if (!surface.component.trim() || !surface.primaryJob.trim()
        || !surface.primaryState.trim() || !surface.primaryAction.trim()) {
      throw new Error(`Non-adventure surface ${surface.id} has incomplete hierarchy`);
    }
    if ('representative' in surface && surface.representative) {
      representatives.add(surface.representative);
    }
  }
  for (const required of [
    'setup', 'hero', 'castle', 'combat', 'spellbook', 'choice', 'result', 'save-import',
  ]) {
    if (!representatives.has(required)) {
      throw new Error(`Non-adventure representative ${required} has no surface`);
    }
  }
}
