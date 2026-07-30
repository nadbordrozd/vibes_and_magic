import { SPELLS } from '../../content/spells';
import { pay } from '../army';
import type {
  Castle, GameState, Hero, SpellId,
} from '../types';
import { sameCoord } from '../map/pathfinding';
import { drawLevelOptions, needsLevel } from '../progression';

export function guildSpellCount(castle: Castle): number {
  if (castle.buildings.includes('mageGuild3')) return 8;
  if (castle.buildings.includes('mageGuild2')) return 6;
  if (castle.buildings.includes('mageGuild1')) return 3;
  return 0;
}

export function learnGuildSpells(hero: Hero, castle: Castle): SpellId[] {
  const learned: SpellId[] = [];
  for (const spellId of castle.guildDeck.slice(0, guildSpellCount(castle))) {
    if (!hero.knownSpells.includes(spellId)) {
      hero.knownSpells.push(spellId);
      learned.push(spellId);
    }
  }
  return learned;
}

export function visitShrine(
  state: GameState,
  objectId: string,
  hero: Hero,
): void {
  const shrine = state.map.objects.find((object) =>
    object.id === objectId && object.kind === 'shrine');
  if (!shrine || shrine.kind !== 'shrine' || !shrine.cleared) return;
  if (!hero.knownSpells.includes(shrine.teaches)) hero.knownSpells.push(shrine.teaches);
  if (!shrine.visitedBy.includes(hero.id)) {
    shrine.visitedBy.push(hero.id);
    hero.visitedShrines.push(shrine.id);
    const options = hero.knownSpells.filter((id) =>
      SPELLS[id].school === shrine.school && !hero.upgradedSpells.includes(id));
    if (options.length) {
      state.pendingChoice = {
        kind: 'shrine', objectId: shrine.id, playerId: hero.owner, options,
      };
    }
  }
  state.lastMessage = `${SPELLS[shrine.teaches].name} learned at the ${shrine.school} shrine.`;
}

export function chooseSpellUpgrade(state: GameState, spellId: SpellId): void {
  const pending = state.pendingChoice;
  if (!pending || (pending.kind !== 'shrine' && pending.kind !== 'inscribe')
      || !pending.options.includes(spellId)) throw new Error('Invalid spell upgrade');
  const hero = state.players[pending.playerId].hero;
  if (!hero || hero.upgradedSpells.includes(spellId)) throw new Error('Spell cannot be upgraded');
  hero.upgradedSpells.push(spellId);
  state.pendingChoice = null;
  state.lastMessage = `${SPELLS[spellId].name}+ permanently inscribed.`;
  if (needsLevel(hero)) {
    const [options, rng] = drawLevelOptions(hero, state.rng);
    state.rng = rng;
    state.pendingChoice = { kind: 'level', playerId: hero.owner, options };
  }
}

export function guildInscribe(
  state: GameState,
  castleId: string,
  spellId: SpellId,
): void {
  const castle = state.castles.find((item) => item.id === castleId);
  const player = state.players[state.activePlayer];
  const hero = player.hero;
  if (!castle || castle.owner !== player.id || !hero
      || !sameCoord(hero.position, castle.position)
      || guildSpellCount(castle) === 0) throw new Error('Mage Guild unavailable');
  if (!hero.knownSpells.includes(spellId) || hero.upgradedSpells.includes(spellId)
      || !castle.guildDeck.slice(0, guildSpellCount(castle))
        .some((id) => SPELLS[id].school === SPELLS[spellId].school)) {
    throw new Error('Spell cannot be inscribed here');
  }
  if (player.resources.essence < 4) throw new Error('Need 4 essence');
  player.resources = pay(player.resources, { essence: 4 });
  hero.upgradedSpells.push(spellId);
  state.lastMessage = `${SPELLS[spellId].name}+ inscribed for 4 essence.`;
}
