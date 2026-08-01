import { SPELLS } from '../../content/spells';
import {
  artifactEffectTotal, hasEquippedArtifact, kitBonuses,
} from '../artifacts';
import { skillRank, specialtyHandler } from '../heroBehaviors';
import { omenResonances, tileResonanceAllowed } from '../omens';
import type {
  BattleHero, BattleSide, BattleState, SpellId, SpellSchool,
} from '../types';
import { stackHasAbility } from './abilities';

const enemySide = (side: BattleSide): BattleSide =>
  side === 'attacker' ? 'defender' : 'attacker';
const heroFor = (battle: BattleState, side: BattleSide): BattleHero | null =>
  side === 'attacker' ? battle.attackerHero : battle.defenderHero;

export function effectiveResonances(
  battle: BattleState,
  hero: BattleHero,
): SpellSchool[] {
  const side = hero.id === battle.attackerHero.id ? 'attacker' : 'defender';
  const schools = new Set<SpellSchool>();
  if (kitBonuses(hero).allResonances) {
    (['rite', 'craft', 'grave', 'wild'] as const)
      .forEach((school) => schools.add(school));
  }
  if (battle.chosenResonance[side]) schools.add(battle.chosenResonance[side]!);
  omenResonances(battle.omen).forEach((school) => schools.add(school));
  const opposingHero = side === 'attacker' ? battle.defenderHero : battle.attackerHero;
  const seamClaimed = Boolean(opposingHero && hasEquippedArtifact(opposingHero, 'seamRipper'));
  if (!seamClaimed || hasEquippedArtifact(hero, 'seamRipper')) {
    battle.terrainResonances.forEach((school) => schools.add(school));
  }
  if (tileResonanceAllowed(battle.omen) && battle.resonance) {
    schools.add(battle.resonance);
  }
  return [...schools];
}

export function isUpgraded(
  battle: BattleState,
  hero: BattleHero,
  spellId: SpellId,
): boolean {
  if (hasEquippedArtifact(hero, 'patternlessCoat')) return false;
  return hero.upgradedSpells.includes(spellId)
    || specialtyHandler(hero).spellAlwaysUpgraded?.(spellId) === true
    || kitBonuses(hero).allSpellsUpgraded
    || effectiveResonances(battle, hero).includes(SPELLS[spellId].school);
}

export function spellManaCost(
  battle: BattleState,
  side: BattleSide,
  hero: BattleHero,
  spellId: SpellId,
): number {
  const definition = SPELLS[spellId];
  if (definition.mana === 'X') return hero.mana;
  const opposingHero = heroFor(battle, enemySide(side));
  const tax = !battle.firstSpellTaxPaid[side] && opposingHero
    ? artifactEffectTotal(opposingHero, 'first_spell_tax') : 0;
  const croneFavor = battle.stacks.some((stack) => stack.count > 0
    && stack.side === side && stackHasAbility(stack, 'crone_favor'))
    && (definition.school === 'wild' || definition.school === 'grave') ? 1 : 0;
  if (definition.kind === 'twister'
      && skillRank(hero, 'twicetold') >= 1 && !battle.twisterFreeUsed[side]) {
    return tax;
  }
  return Math.max(0, definition.mana - croneFavor) + tax;
}
