import { describe, expect, it } from 'vitest';
import {
  NON_ADVENTURE_SURFACES, validateNonAdventureSurfaceCoverage,
} from '../nonAdventureSurfaceCoverage';

describe('non-adventure surface coverage', () => {
  it('inventories every representative task with one explicit hierarchy', () => {
    expect(() => validateNonAdventureSurfaceCoverage()).not.toThrow();
    expect(new Set(NON_ADVENTURE_SURFACES.map((surface) => surface.id)).size)
      .toBe(NON_ADVENTURE_SURFACES.length);
    for (const representative of [
      'setup', 'hero', 'castle', 'combat', 'spellbook', 'choice', 'result', 'save-import',
    ]) {
      expect(NON_ADVENTURE_SURFACES.some((surface) =>
        'representative' in surface && surface.representative === representative)).toBe(true);
    }
  });
});
