import { OMENS, OMEN_IDS } from '../content/omens';
import { nextRandom } from './rng';
import type {
  GameState, OmenAnnouncement, OmenId, SpellSchool,
} from './types';

export function rollOmen(rngState: number): [OmenId, number] {
  let value: number;
  let next: number;
  [value, next] = nextRandom(rngState);
  let cursor = value * 100;
  for (const id of OMEN_IDS) {
    cursor -= OMENS[id].weight;
    if (cursor < 0) return [id, next];
  }
  return ['loudSky', next];
}

export function omenAnnouncement(omen: OmenId, week: number): OmenAnnouncement {
  const definition = OMENS[omen];
  return {
    week, omen, title: definition.title, flavor: definition.flavor,
  };
}

export function beginWeekOmen(state: GameState): void {
  state.omen = state.nextOmen;
  [state.nextOmen, state.omenRng] = rollOmen(state.omenRng);
  state.omenAnnouncement = omenAnnouncement(state.omen, state.week);
  const line = `${state.omenAnnouncement.title}: ${state.omenAnnouncement.flavor}`;
  state.eventLog.push(line);
}

export function growthWithOmen(base: number, omen: OmenId): number {
  return Math.floor(base * (OMENS[omen].effects.growthMultiplier ?? 1));
}

export function burnApplicationBonus(omen: OmenId): number {
  return OMENS[omen].effects.burnBonus ?? 0;
}

export function omenResonances(omen: OmenId): SpellSchool[] {
  const resonance = OMENS[omen].effects.resonance;
  return resonance ? [resonance] : [];
}

export function tileResonanceAllowed(omen: OmenId): boolean {
  return !OMENS[omen].effects.suppressTileResonance;
}

export function rangedShotBonus(omen: OmenId): number {
  return OMENS[omen].effects.rangedShots ?? 0;
}

export function roundMeterBonus(omen: OmenId): number {
  return OMENS[omen].effects.roundMeter ?? 0;
}
