import type {
  OmenId, SpellSchool,
} from '../core/types';

export interface OmenEffects {
  growthMultiplier?: number;
  burnBonus?: number;
  resonance?: SpellSchool;
  suppressTileResonance?: boolean;
  terrainCost?: number;
  rangedShots?: number;
  roundMeter?: number;
}

export interface OmenDefinition {
  id: OmenId;
  title: string;
  flavor: string;
  weight: number;
  effects: OmenEffects;
}

export const OMENS: Record<OmenId, OmenDefinition> = {
  quiet: {
    id: 'quiet', title: 'Quiet Week', weight: 45,
    flavor: 'The bells hold their breath. Even the quiet ones.',
    effects: {},
  },
  embers: {
    id: 'embers', title: 'Week of Embers', weight: 9,
    flavor: 'Soot settles on doors that have never known a chimney.',
    effects: { burnBonus: 1 },
  },
  veil: {
    id: 'veil', title: 'Week of the Veil', weight: 9,
    flavor: 'Every shadow remembers the person who cast it.',
    effects: { resonance: 'grave' },
  },
  plenty: {
    id: 'plenty', title: 'Week of Plenty', weight: 9,
    flavor: 'The granaries creak before the harvest carts arrive.',
    effects: { growthMultiplier: 1.25 },
  },
  stillAir: {
    id: 'stillAir', title: 'Week of Still Air', weight: 9,
    flavor: 'Arrows hang straight in air too patient to stir.',
    effects: { rangedShots: 4, suppressTileResonance: true },
  },
  openRoad: {
    id: 'openRoad', title: 'Week of the Open Road', weight: 9,
    flavor: 'Old milestones turn their faces toward the living.',
    effects: { terrainCost: 100 },
  },
  loudSky: {
    id: 'loudSky', title: 'Week of the Loud Sky', weight: 10,
    flavor: 'Thunder keeps time for banners below.',
    effects: { roundMeter: 5 },
  },
};

export const OMEN_IDS = Object.keys(OMENS) as OmenId[];

export function validateOmens(): void {
  if (OMEN_IDS.length !== 7
      || OMEN_IDS.reduce((sum, id) => sum + OMENS[id].weight, 0) !== 100
      || OMEN_IDS.some((id) =>
        !OMENS[id].title || !OMENS[id].flavor || OMENS[id].weight <= 0)) {
    throw new Error('Invalid omen catalog');
  }
}
