import { SPELLS } from '../../content/spells';
import { pay } from '../army';
import type {
  Castle, GameState, Hero, SpellId,
} from '../types';
import { sameCoord } from '../map/pathfinding';
import { castleEntrance } from '../map/occupancy';
import { drawLevelOptions, needsLevel } from '../progression';
import { findOwnedHero, selectedHero } from '../heroes';
import { skillRank } from '../heroBehaviors';
import { SKILLS } from '../../content/skills';
import { buildingIsActive } from './buildingStatus';
import { consumeEquippedArtifact, hasEquippedArtifact } from '../artifacts';

export function guildSpellCount(castle: Castle): number {
  if (buildingIsActive(castle, 'mageGuild3')) return 8;
  if (buildingIsActive(castle, 'mageGuild2')) return 6;
  if (buildingIsActive(castle, 'mageGuild1')) return 3;
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
  if (hasEquippedArtifact(hero, 'leadenCrown')) {
    const player = state.players[hero.owner];
    if (player.resources.essence >= 5) {
      player.resources.essence -= 5;
      consumeEquippedArtifact(hero, 'leadenCrown');
      state.eventLog.push('The shrine takes five essence and lifts the Leaden Crown.');
    }
  }
  if (!hero.knownSpells.includes(shrine.teaches)) hero.knownSpells.push(shrine.teaches);
  const maxChoices = skillRank(hero, 'ritualist') >= 1
    || skillRank(hero, 'attunement') >= 2 ? 2 : 1;
  const choicesThisVisit = skillRank(hero, 'attunement') >= 2
    ? SKILLS.attunement.values.rank2ShrineChoices : 1;
  const used = hero.shrineChoices[shrine.id] ?? 0;
  if (used < maxChoices) {
    hero.shrineChoices[shrine.id] = used;
    if (!shrine.visitedBy.includes(hero.id)) shrine.visitedBy.push(hero.id);
    if (!hero.visitedShrines.includes(shrine.id)) hero.visitedShrines.push(shrine.id);
    const options = hero.knownSpells.filter((id) =>
      SPELLS[id].school === shrine.school && !hero.upgradedSpells.includes(id));
    if (options.length) {
      state.pendingChoice = {
        kind: 'shrine', objectId: shrine.id, playerId: hero.owner, heroId: hero.id,
        options, choicesRemaining: Math.min(choicesThisVisit, maxChoices - used),
      };
    }
  }
  state.lastMessage = `${SPELLS[shrine.teaches].name} learned at the ${shrine.school} shrine.`;
}

export function chooseSpellUpgrade(state: GameState, spellId: SpellId): void {
  const pending = state.pendingChoice;
  if (!pending || (pending.kind !== 'shrine' && pending.kind !== 'inscribe')
      || !pending.options.includes(spellId)) throw new Error('Invalid spell upgrade');
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero || hero.upgradedSpells.includes(spellId)) throw new Error('Spell cannot be upgraded');
  hero.upgradedSpells.push(spellId);
  if (pending.kind === 'shrine') {
    hero.shrineChoices[pending.objectId] =
      (hero.shrineChoices[pending.objectId] ?? 0) + 1;
    const shrine = state.map.objects.find((object) =>
      object.id === pending.objectId && object.kind === 'shrine');
    const options = shrine?.kind === 'shrine'
      ? hero.knownSpells.filter((id) => SPELLS[id].school === shrine.school
        && !hero.upgradedSpells.includes(id))
      : [];
    state.pendingChoice = pending.choicesRemaining > 1 && options.length
      ? { ...pending, options, choicesRemaining: pending.choicesRemaining - 1 }
      : null;
  } else {
    state.pendingChoice = null;
  }
  state.lastMessage = `${SPELLS[spellId].name}+ permanently inscribed.`;
  if (!state.pendingChoice && needsLevel(hero)) {
    const [options, rng] = drawLevelOptions(hero, state.rng);
    state.rng = rng;
    state.pendingChoice = {
      kind: 'level', playerId: hero.owner, heroId: hero.id, options,
      canSkip: skillRank(hero, 'chronicler') >= 2,
      canReroll: skillRank(hero, 'chronicler') >= 3,
    };
  }
}

export function guildInscribe(
  state: GameState,
  castleId: string,
  spellId: SpellId,
): void {
  const castle = state.castles.find((item) => item.id === castleId);
  const player = state.players[state.activePlayer];
  const hero = selectedHero(player);
  if (!castle || castle.owner !== player.id || !hero
      || !sameCoord(hero.position, castleEntrance(castle))
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
