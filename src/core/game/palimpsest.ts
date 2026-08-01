import { ACQUIRABLE_SCHOOL_SPELLS } from '../../content/spells';
import { SKILLS } from '../../content/skills';
import { findOwnedHero, selectedHero } from '../heroes';
import { sameCoord } from '../map/pathfinding';
import { castleEntrance, objectEntranceTile } from '../map/occupancy';
import { shuffle } from '../rng';
import type {
  GameState, Hero, SpellId,
} from '../types';
import { guildSpellCount } from './magic';
import { skillRank } from '../heroBehaviors';

function sitePool(state: GameState, hero: Hero, siteId: string): SpellId[] {
  const castle = state.castles.find((candidate) => candidate.id === siteId);
  if (castle) {
    if (castle.owner !== hero.owner || !sameCoord(castleEntrance(castle), hero.position)
        || guildSpellCount(castle) === 0) {
      throw new Error('A friendly Mage Guild is required');
    }
    return castle.guildDeck.slice(0, guildSpellCount(castle));
  }
  const shrine = state.map.objects.find((object) =>
    object.id === siteId && object.kind === 'shrine');
  if (!shrine || shrine.kind !== 'shrine' || !shrine.cleared
      || !sameCoord(objectEntranceTile(shrine), hero.position)
      || skillRank(hero, 'palimpsest') < 3) {
    throw new Error('Palimpsest cannot be used at this site');
  }
  return ACQUIRABLE_SCHOOL_SPELLS(shrine.school);
}

export function palimpsestForget(
  state: GameState,
  siteId: string,
  spellId: SpellId,
): void {
  if (state.phase !== 'adventure') throw new Error('Palimpsest is adventure-only');
  const hero = selectedHero(state.players[state.activePlayer]);
  const rank = hero ? skillRank(hero, 'palimpsest') : 0;
  if (!hero || !rank || !hero.knownSpells.includes(spellId)) {
    throw new Error('A known spell must be forgotten');
  }
  const pool = sitePool(state, hero, siteId).filter((candidate) =>
    candidate !== spellId && !hero.knownSpells.includes(candidate));
  if (!pool.length) throw new Error('This site has no new spell offers');
  hero.knownSpells = hero.knownSpells.filter((candidate) => candidate !== spellId);
  hero.upgradedSpells = hero.upgradedSpells.filter((candidate) => candidate !== spellId);
  let shuffled: SpellId[];
  [shuffled, state.rng] = shuffle(pool, state.rng);
  const count = rank === 1
    ? SKILLS.palimpsest.values.rank1Draw : SKILLS.palimpsest.values.rank2Draw;
  state.pendingChoice = {
    kind: 'palimpsest', playerId: hero.owner, heroId: hero.id,
    options: shuffled.slice(0, count),
  };
  state.lastMessage = `${spellId} forgotten; choose what was written beneath it.`;
}

export function choosePalimpsest(state: GameState, spellId: SpellId): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'palimpsest' || !pending.options.includes(spellId)) {
    throw new Error('Invalid Palimpsest choice');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('Palimpsest hero missing');
  hero.knownSpells.push(spellId);
  state.pendingChoice = null;
  state.lastMessage = `${spellId} retained from the Palimpsest offer.`;
}
