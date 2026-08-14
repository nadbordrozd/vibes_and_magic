import { SPELLS } from '../../content/spells';
import type { Hero, SpellId } from '../types';
import { skillRank } from '../heroBehaviors';
import { markBurdenRemovalReady } from '../artifacts';

/** One acquisition boundary keeps Loremaster's immediate and future upgrades consistent. */
export function learnSpell(hero: Hero, spellId: SpellId): boolean {
  if (hero.knownSpells.includes(spellId)) return false;
  hero.knownSpells.push(spellId);
  if (SPELLS[spellId].tier === 5) markBurdenRemovalReady(hero, 'tier-five-spell');
  if (skillRank(hero, 'loremaster') >= 3 && SPELLS[spellId].tier! <= 3
      && !hero.upgradedSpells.includes(spellId)) hero.upgradedSpells.push(spellId);
  return true;
}

export function applyLoremasterRetroactiveUpgrades(hero: Hero): SpellId[] {
  if (skillRank(hero, 'loremaster') < 3) return [];
  const gained = hero.knownSpells.filter((id) => SPELLS[id].tier! <= 3
    && !hero.upgradedSpells.includes(id));
  hero.upgradedSpells.push(...gained);
  return gained;
}
