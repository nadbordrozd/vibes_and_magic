import { HEROES } from '../../content/heroes';
import { SPELLS } from '../../content/spells';
import { SPELL_SCHOOL_NAMES, spellTargetSummary } from '../../content/spellPresentation';
import { kitBonuses } from '../../core/artifacts';
import { legalSpellCasts, canBeginSpellCast, effectiveResonances, isUpgraded } from '../../core/combat/spells';
import { spellManaCost } from '../../core/combat/spellModifiers';
import { skillRank, specialtyHandler } from '../../core/heroBehaviors';
import type { BattleSide, BattleState, SpellId } from '../../core/types';
import { Spellbook, type SpellbookEntry } from './Spellbook';

interface Props {
  battle: BattleState;
  side: BattleSide;
  maxMana?: number;
  onClose: () => void;
  onSelect: (spellId: SpellId) => void;
}

function combatDisabledReason(
  battle: BattleState, side: BattleSide, spellId: SpellId,
): string | undefined {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero!;
  const spell = SPELLS[spellId];
  const currentSide = battle.stacks.find((stack) => stack.id === battle.currentStackId)?.side;
  if (spell.kind === 'adventure' || spell.kind === 'topology') {
    return 'Adventure-only spell. Cast it from the adventure map.';
  }
  if (currentSide !== side) return 'Wait for one of this hero’s companies to become active.';
  if (!canBeginSpellCast(battle, spellId)) {
    if (battle.castRound[side] === battle.round) {
      return 'This hero has already cast a spell this round.';
    }
    const cost = spell.mana === 'X' ? hero.mana : spellManaCost(battle, side, hero, spellId);
    if (spell.mana === 'X' && hero.mana <= 0) return 'Requires at least 1 mana.';
    if (hero.mana < cost) return `Requires ${cost} mana; ${hero.mana} remains.`;
    return 'This spell cannot be started at the current combat timing.';
  }
  if (!legalSpellCasts(battle).some((action) => action.spellId === spellId)) {
    return spell.effectOperation
      ? 'No active effect satisfies this spell’s targeting rules.'
      : 'No legal target is currently available.';
  }
  return undefined;
}

function combatUpgrade(
  battle: BattleState, side: BattleSide, spellId: SpellId,
): SpellbookEntry['upgrade'] {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero!;
  if (hero.upgradedSpells.includes(spellId)) return { active: 'upgraded', learned: true };
  const twicetold = SPELLS[spellId].kind === 'twister' && skillRank(hero, 'twicetold') >= 2;
  const active = isUpgraded(battle, hero, spellId) || twicetold;
  if (!active) return { active: 'standard', learned: false };
  if (specialtyHandler(hero).spellAlwaysUpgraded?.(spellId)) {
    return { active: 'upgraded', learned: false, reason: `${HEROES[hero.definitionId].name}’s specialty` };
  }
  if (kitBonuses(hero).allSpellsUpgraded) {
    return { active: 'upgraded', learned: false, reason: 'Complete Tailor’s Kit' };
  }
  if (twicetold) return { active: 'upgraded', learned: false, reason: 'Twicetold rank 2' };
  const resonant = effectiveResonances(battle, hero).find((candidate) =>
    candidate === SPELLS[spellId].school);
  return {
    active: 'upgraded', learned: false,
    reason: resonant ? `${SPELL_SCHOOL_NAMES[resonant]} resonance` : 'A temporary battle effect',
  };
}

export function combatSpellbookEntries(
  battle: BattleState, side: BattleSide,
): SpellbookEntry[] {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero!;
  const legal = legalSpellCasts(battle);
  return [...new Set(hero.knownSpells)].map((spellId) => {
    const spell = SPELLS[spellId];
    const cost = spell.mana === 'X' ? hero.mana : spellManaCost(battle, side, hero, spellId);
    const choices = legal.filter((action) => action.spellId === spellId);
    return {
      id: spellId,
      manaCost: spell.mana === 'X' ? `${cost} mana · X (all remaining)` : `${cost} mana`,
      disabledReason: combatDisabledReason(battle, side, spellId),
      targetSummary: spellTargetSummary(spellId),
      currentValues: [
        `At Spell Power ${hero.spellPower}: durations gain +${Math.floor(hero.spellPower / 6)}, `
          + `counter magnitudes gain +${Math.floor(hero.spellPower / 5)}, and percentage effects `
          + `gain +${Math.floor(hero.spellPower / 2)} points where this spell uses that scaling.`,
      ],
      legalConsequences: choices.length
        ? `${choices.length} legal cast ${choices.length === 1 ? 'path' : 'paths'} available. Cast opens explicit targeting or confirmation; mana is spent only after confirmation.`
        : 'No legal cast path is available; the reason is shown below.',
      upgrade: combatUpgrade(battle, side, spellId),
    };
  });
}

export function SpellbookPanel({
  battle, side, maxMana, onClose, onSelect,
}: Props) {
  const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero!;
  const entries = combatSpellbookEntries(battle, side);
  return <Spellbook context="Combat magic" title="Battle spellbook"
    heroName={HEROES[hero.definitionId].name} mana={hero.mana}
    maxMana={maxMana ?? Math.max(hero.mana, 10)} spellPower={hero.spellPower}
    debts={hero.debts} entries={entries} onClose={onClose} onCast={onSelect} />;
}
