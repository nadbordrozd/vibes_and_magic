import type { SpellId } from '../core/types';
import { SPELLS } from './spells';

export type SpellKind = (typeof SPELLS)[SpellId]['kind'];
export type SpellSchool = (typeof SPELLS)[SpellId]['school'];

export const SPELL_KIND_NAMES: Record<SpellKind, string> = {
  staple: 'Staple spell', enchantment: 'Enchantment', twister: 'Twister spell',
  scaling: 'Scaling spell', 'build-around': 'Build-around spell',
  adventure: 'Adventure spell', topology: 'Topology spell',
};

export const SPELL_SCHOOL_NAMES: Record<SpellSchool, string> = {
  rite: 'Rite', craft: 'Craft', wild: 'Wild', grave: 'Grave',
};

/** Canonical reading/navigation order; never derive this from object-key insertion order. */
export const SPELL_SCHOOL_ORDER: readonly SpellSchool[] = [
  'rite', 'craft', 'grave', 'wild',
];

const TARGET_NAMES: Record<(typeof SPELLS)[SpellId]['aiHints']['target'], string> = {
  strongestEnemy: 'A legal enemy company',
  weakestAlly: 'A legal allied company',
  strongestAlly: 'A legal allied company',
  self: 'The battlefield, map, or casting hero as described',
  enchantmentSlot: 'One of your two battlefield enchantment slots',
  counterPile: 'An active counter, timed effect, or enchantment',
};

export function spellTargetSummary(spellId: SpellId): string {
  return TARGET_NAMES[SPELLS[spellId].aiHints.target];
}

export function spellCategory(spellId: SpellId): string {
  const spell = SPELLS[spellId];
  return `${SPELL_SCHOOL_NAMES[spell.school]} school · ${SPELL_KIND_NAMES[spell.kind]}`;
}

export function validateSpellPresentation(): void {
  for (const spell of Object.values(SPELLS)) {
    if (!SPELL_KIND_NAMES[spell.kind]?.trim() || !SPELL_SCHOOL_NAMES[spell.school]?.trim()) {
      throw new Error(`Missing spell presentation: ${spell.id}`);
    }
  }
}
