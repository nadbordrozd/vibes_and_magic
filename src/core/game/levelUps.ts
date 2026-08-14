import { consumableSlotCount, gainExperience, maximumMana, skillRank } from '../heroBehaviors';
import { SKILLS } from '../../content/skills';
import { findOwnedHero, selectedHero } from '../heroes';
import {
  drawLevelOptions, grimoirePool, MAX_SECONDARY_SKILLS, needsLevel,
} from '../progression';
import type {
  GameState, LevelChoice, PlayerId, PrimaryStat, SecondarySkillId,
} from '../types';
import { resolveDebtEvent } from '../debts';
import { dealBargains } from './bargains';
import { SPELLS } from '../../content/spells';
import { nextRandom } from '../rng';
import { applyLoremasterRetroactiveUpgrades, learnSpell } from './spellLearning';
import { markBurdenRemovalReady } from '../artifacts';
import { setQuartermasterRank } from '../army';

const PRIMARY_STATS: PrimaryStat[] = [
  'attack', 'defense', 'spellPower', 'knowledge',
];

export function checkLevel(
  state: GameState,
  playerId: PlayerId,
  heroId?: string,
): void {
  const hero = heroId
    ? findOwnedHero(state, playerId, heroId)
    : selectedHero(state.players[playerId]);
  if (!hero || !needsLevel(hero)) return;
  resolveDebtEvent(state, { kind: 'level-up', heroId: hero.id, level: hero.level + 1 });
  const [options, nextRng] = drawLevelOptions(hero, state.rng);
  hero.draftBonusCards = 0;
  state.rng = nextRng;
  state.pendingChoice = {
    kind: 'level', playerId, heroId: hero.id, options,
    canSkip: skillRank(hero, 'chronicler') >= 2, source: 'levelUp',
    canReroll: skillRank(hero, 'chronicler') >= 3,
  };
}

export function skipLevel(state: GameState): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'level' || !pending.canSkip) {
    throw new Error('This draft cannot be skipped');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Hero missing');
  hero.level += 1;
  gainExperience(hero, SKILLS.chronicler.values.skipXp);
  state.pendingChoice = null;
  state.lastMessage =
    `Level ${hero.level}: draft skipped for ${SKILLS.chronicler.values.skipXp} XP.`;
  checkLevel(state, pending.playerId, hero.id);
}

export function rerollLevel(state: GameState): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'level' || !pending.canReroll) {
    throw new Error('This draft cannot be rerolled');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Hero missing');
  const [options, rng] = drawLevelOptions(hero, state.rng);
  state.rng = rng;
  state.pendingChoice = { ...pending, options, canReroll: false };
  state.lastMessage = 'The level-up draft was rerolled.';
}

export function chooseLevel(state: GameState, choice: LevelChoice): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'level' || !pending.options.includes(choice)) {
    throw new Error('Invalid level option');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Hero missing');
  const fromHedgeSchool = pending.source === 'hedgeSchool';
  hero.level += 1;
  if (choice === 'bargain') {
    dealBargains(state, hero, 1, 'level');
  } else if (choice === 'inscribe') {
    const options = hero.knownSpells.filter((id) =>
      !hero.upgradedSpells.includes(id));
    state.pendingChoice = {
      kind: 'inscribe', playerId: pending.playerId, heroId: hero.id, options,
    };
    state.lastMessage = `Level ${hero.level}: choose a spell to inscribe.`;
  } else if (choice === 'adept') {
    const options = hero.knownSpells.filter((id) => {
      const mana = SPELLS[id].mana;
      return mana !== 'X' && Math.max(1, mana - (hero.spellManaReductions[id] ?? 0)) > 1;
    });
    if (!options.length) throw new Error('Adept needs a known spell costing at least 2 mana');
    state.pendingChoice = {
      kind: 'adept', playerId: pending.playerId, heroId: hero.id, options,
    };
    state.lastMessage = `Level ${hero.level}: choose a spell for Adept.`;
  } else if (choice === 'grimoire') {
    const pool = grimoirePool(hero, hero.level);
    if (!pool.length) throw new Error('Grimoire has no legal unknown spell outcome');
    let random: number;
    [random, state.rng] = nextRandom(state.rng);
    const learned = pool[Math.min(pool.length - 1, Math.floor(random * pool.length))].id;
    learnSpell(hero, learned);
    if (fromHedgeSchool) markBurdenRemovalReady(hero, 'hedge-school-spell');
    state.pendingChoice = null;
    state.lastMessage = `Level ${hero.level}: Grimoire teaches ${SPELLS[learned].name}.`;
  } else if (PRIMARY_STATS.includes(choice as PrimaryStat)) {
    hero[choice as PrimaryStat] += 1;
    if (choice === 'knowledge') {
      hero.mana = Math.min(hero.mana, maximumMana(hero, state.players[hero.owner]));
    }
    state.pendingChoice = null;
    state.lastMessage = `Level ${hero.level}: +1 ${choice}.`;
  } else {
    const skillId = choice as SecondarySkillId;
    const held = hero.skills[skillId] ?? 0;
    if (held === 0 && Object.values(hero.skills).filter(Boolean).length
        >= MAX_SECONDARY_SKILLS) {
      throw new Error('A hero may know at most six secondary skills');
    }
    const rank = Math.min(3, held + 1) as 1 | 2 | 3;
    if (skillId === 'quartermaster') setQuartermasterRank(hero, rank);
    else hero.skills[skillId] = rank;
    if (skillId === 'loremaster' && hero.skills.loremaster === 3) {
      applyLoremasterRetroactiveUpgrades(hero);
    }
    while (hero.inventory.length < consumableSlotCount(hero)) {
      hero.inventory.push(null);
    }
    state.pendingChoice = null;
    state.lastMessage =
      `Level ${hero.level}: ${skillId} rank ${hero.skills[skillId]}.`;
  }
  if (!state.pendingChoice) checkLevel(state, pending.playerId, hero.id);
}

export function chooseAdeptSpell(state: GameState, spellId: import('../types').SpellId): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'adept' || !pending.options.includes(spellId)) {
    throw new Error('Invalid Adept spell');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Hero missing');
  const mana = SPELLS[spellId].mana;
  if (mana === 'X') throw new Error('Adept cannot reduce an X-cost spell');
  hero.spellManaReductions[spellId] = Math.min(mana - 1,
    (hero.spellManaReductions[spellId] ?? 0) + 2);
  state.pendingChoice = null;
  state.lastMessage = `${SPELLS[spellId].name} now costs ${Math.max(1,
    mana - hero.spellManaReductions[spellId]!)} mana.`;
  checkLevel(state, pending.playerId, hero.id);
}
