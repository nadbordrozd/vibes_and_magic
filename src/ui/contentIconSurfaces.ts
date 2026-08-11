export interface ContentIconSurface {
  id: string;
  source: string;
  content: 'spell' | 'skill' | 'both';
  evidence: string;
}

/** Executable inventory of player-facing surfaces that present a spell or secondary skill. */
export const CONTENT_ICON_SURFACES: readonly ContentIconSurface[] = [
  { id: 'combat-spellbook', source: 'src/ui/components/Spellbook.tsx', content: 'spell', evidence: 'shared combat spell grid and details' },
  { id: 'adventure-spellbook', source: 'src/ui/components/Spellbook.tsx', content: 'spell', evidence: 'shared adventure spell grid and details' },
  { id: 'adventure-targeting', source: 'src/ui/components/AdventureSpellTargetDialog.tsx', content: 'spell', evidence: 'target dialog and remembered-spell choices' },
  { id: 'map-targeting', source: 'src/ui/components/AdventureScreen.tsx', content: 'spell', evidence: 'map targeting status card' },
  { id: 'combat-targeting', source: 'src/ui/components/CombatScreen.tsx', content: 'spell', evidence: 'targeting banner and enchantment slots' },
  { id: 'combat-effects', source: 'src/ui/components/CombatUnitPanel.tsx', content: 'spell', evidence: 'stack enchantments' },
  { id: 'guild', source: 'src/ui/components/CastleScreen.tsx', content: 'spell', evidence: 'guild deal and inscription' },
  { id: 'palimpsest', source: 'src/ui/components/PalimpsestService.tsx', content: 'spell', evidence: 'forget-spell choices' },
  { id: 'choices', source: 'src/ui/components/Dialogs.tsx', content: 'both', evidence: 'spell learning/upgrading and level-up skill cards' },
  { id: 'hero-details', source: 'src/ui/components/AdventureHeroDetails.tsx', content: 'skill', evidence: 'learned secondary skills' },
  { id: 'inspection', source: 'src/ui/components/InspectionLayer.tsx', content: 'both', evidence: 'full spell/skill rules inspection' },
] as const;
