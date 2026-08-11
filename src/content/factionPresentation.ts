import type { FactionId } from '../core/types';

export interface FactionPassivePresentation {
  name: string;
  description: string;
}

export const CASTLE_NAMES: Record<FactionId, string> = {
  hearthguard: 'Westwatch',
  woundWrights: 'Eastwatch',
  unfinished: 'Last Lantern',
  vespiary: 'Amber Court',
  hagwood: 'Crooked Fence',
  wildergrass: 'Ash Kraal',
};

/** Player-facing names for faction rules. Mechanics remain implemented in core. */
export const FACTION_PASSIVES: Record<FactionId, FactionPassivePresentation> = {
  hearthguard: {
    name: 'Steadfast',
    description: 'When an allied company is destroyed, other Hearthguard companies lose 15 morale instead of 30.',
  },
  woundWrights: {
    name: 'Spare Parts',
    description: 'After a victory, each surviving Wound-Wright company restores 30% of the creatures it lost.',
  },
  unfinished: {
    name: 'Unfinished Business',
    description: 'When an allied Unfinished company is destroyed, it deals 15% of its former total HP to its killer.',
  },
  vespiary: {
    name: 'Render Down',
    description: 'After a victory, destroyed enemy HP is rendered into Larvae for the city pool.',
  },
  hagwood: {
    name: 'Crooked Luck',
    description: 'Enemy companies fighting a Hagwood army suffer −1 luck.',
  },
  wildergrass: {
    name: 'Blood Price',
    description: 'Allies gain morale instead of losing it when a friendly company is destroyed, but gain less for destroying enemies.',
  },
};

export function validateFactionPresentation(): void {
  for (const [id, entry] of Object.entries(FACTION_PASSIVES)) {
    if (!entry.name.trim() || !entry.description.trim()) {
      throw new Error(`Missing faction presentation: ${id}`);
    }
  }
  for (const [id, name] of Object.entries(CASTLE_NAMES)) {
    if (!name.trim()) throw new Error(`Missing castle presentation: ${id}`);
  }
}
