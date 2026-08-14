import { SPELLS } from '../../content/spells';
import {
  artifactEffectTotal, hasArtifactEffect, hasEquippedArtifact, kitBonuses,
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
  battle.midBattleResonance?.[side].forEach((school) => schools.add(school));
  omenResonances(battle.omen).forEach((school) => schools.add(school));
  const opposingHero = side === 'attacker' ? battle.defenderHero : battle.attackerHero;
  const resonanceClaimed = Boolean(opposingHero
    && (hasArtifactEffect(opposingHero, 'owner_only_seam')
      || hasArtifactEffect(opposingHero, 'owner_only_resonance')));
  if (!resonanceClaimed || hasArtifactEffect(hero, 'owner_only_seam')
      || hasArtifactEffect(hero, 'owner_only_resonance')) {
    battle.terrainResonances.forEach((school) => schools.add(school));
  }
  if (tileResonanceAllowed(battle.omen) && battle.resonance
      && (!resonanceClaimed || hasArtifactEffect(hero, 'owner_only_resonance'))) {
    schools.add(battle.resonance);
  }
  return [...schools];
}

/** Battlefield-only resonance for a company spell source; no commanding-hero gear or Kit leaks. */
export function creatureResonances(
  battle: BattleState, side: BattleSide,
): SpellSchool[] {
  const schools = new Set<SpellSchool>();
  if (battle.chosenResonance[side]) schools.add(battle.chosenResonance[side]!);
  battle.midBattleResonance?.[side].forEach((school) => schools.add(school));
  omenResonances(battle.omen).forEach((school) => schools.add(school));
  const opposingHero = heroFor(battle, enemySide(side));
  const ownHero = heroFor(battle, side);
  if (!opposingHero || (!hasArtifactEffect(opposingHero, 'owner_only_seam')
      && !hasArtifactEffect(opposingHero, 'owner_only_resonance'))
      || Boolean(ownHero && (hasArtifactEffect(ownHero, 'owner_only_seam')
        || hasArtifactEffect(ownHero, 'owner_only_resonance')))) {
    battle.terrainResonances.forEach((school) => schools.add(school));
  }
  const resonanceClaimed = Boolean(opposingHero
    && hasArtifactEffect(opposingHero, 'owner_only_resonance'));
  if (tileResonanceAllowed(battle.omen) && battle.resonance
      && (!resonanceClaimed || Boolean(ownHero
        && hasArtifactEffect(ownHero, 'owner_only_resonance')))) schools.add(battle.resonance);
  return [...schools];
}

export function isUpgraded(
  battle: BattleState,
  hero: BattleHero,
  spellId: SpellId,
): boolean {
  const side: BattleSide = hero.id === battle.attackerHero.id ? 'attacker' : 'defender';
  if (hasArtifactEffect(hero, 'spell_plus_block')) return false;
  return hero.upgradedSpells.includes(spellId)
    || specialtyHandler(hero).spellAlwaysUpgraded?.(spellId) === true
    || kitBonuses(hero).allSpellsUpgraded || hasArtifactEffect(hero, 'always_upgraded')
    || effectiveResonances(battle, hero).includes(SPELLS[spellId].school)
    || battle.itemUpgradedSchools[side].includes(SPELLS[spellId].school);
}

export function spellManaCost(
  battle: BattleState,
  side: BattleSide,
  hero: BattleHero,
  spellId: SpellId,
): number {
  const definition = SPELLS[spellId];
  if (hasArtifactEffect(hero, 'low_tier_free_casting') && definition.tier! <= 2) return 0;
  if (definition.mana === 'X') return hero.mana;
  const opposingHero = heroFor(battle, enemySide(side));
  const tax = !battle.firstSpellTaxPaid[side] && opposingHero
    ? artifactEffectTotal(opposingHero, 'first_spell_tax') : 0;
  const croneFavor = battle.stacks.some((stack) => stack.count > 0
    && stack.side === side && stackHasAbility(stack, 'crone_favor'))
    && (definition.school === 'wild' || definition.school === 'grave') ? 1 : 0;
  const batteries = battle.stacks.filter((stack) => stack.count > 0
    && stack.side === side && stackHasAbility(stack, 'spell_battery')).length;
  const adept = hero.spellManaReductions[spellId] ?? 0;
  const attunement = skillRank(hero, 'attunement') >= 2 ? 1 : 0;
  const ordinary = Math.max(1, definition.mana - adept - attunement - croneFavor - batteries);
  const discounted = skillRank(hero, 'twicetold') >= 1 && !battle.twisterFreeUsed[side]
    ? Math.ceil(ordinary / 2) : ordinary;
  const artifactReduction = artifactEffectTotal(hero, 'mana_cost_reduction');
  const reduced = Math.max(1, discounted - artifactReduction) + tax;
  return battle.spellCastsBySide[side] === 0 && hasArtifactEffect(hero, 'free_first_spell')
    ? 0 : reduced;
}
