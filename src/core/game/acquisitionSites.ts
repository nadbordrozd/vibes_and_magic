import { SPELLS } from '../../content/spells';
import {
  registerAcquisitionSiteHandler, registeredAcquisitionSiteHandlers,
} from '../../content/v2/registries';
import type { AcquisitionSiteHandler } from '../../content/v2/schema';
import { activeHero, findOwnedHero } from '../heroes';
import { objectEntranceTile } from '../map/occupancy';
import { sameCoord } from '../map/pathfinding';
import type { GameState, Hero, MapObject, SpellId } from '../types';
import { skillRank } from '../heroBehaviors';
import { learnSpell } from './spellLearning';
import { claimSpellTome } from './items';

type SiteObject = Extract<MapObject, {
  kind: 'stacks' | 'wildShrine' | 'reliquaryOfPages';
}>;

function stableHash(seed: number, key: string): number {
  return [...key].reduce((value, character) =>
    Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, seed >>> 0);
}

function deterministicOffer(
  seed: number, key: string, pool: readonly SpellId[], count: number,
): SpellId[] {
  return [...pool].sort((first, second) =>
    stableHash(seed, `${key}:${first}`) - stableHash(seed, `${key}:${second}`)
    || first.localeCompare(second)).slice(0, count);
}

function highestOwnedGuild(state: GameState, hero: Hero): number {
  const levels = ['mageGuild1', 'mageGuild2', 'mageGuild3', 'mageGuild4', 'mageGuild5'] as const;
  return state.castles.filter((castle) => castle.owner === hero.owner)
    .reduce((highest, castle) => Math.max(highest,
      levels.reduce((level, building, index) => castle.buildings.includes(building)
        ? Math.max(level, index + 1) : level, 0)), 0);
}

function stacksHandler(state: GameState, object: SiteObject, hero: Hero): void {
  if (object.kind !== 'stacks') throw new Error('The Stacks handler received another site');
  if (object.visitedBy.includes(hero.id)) throw new Error('This hero already chose from The Stacks');
  const highest = highestOwnedGuild(state, hero);
  if (!highest) throw new Error('The Stacks require an owned Mage Guild');
  if (state.players[hero.owner].resources.essence < 3) throw new Error('The Stacks cost 3 essence');
  const pool = (Object.keys(SPELLS) as SpellId[]).filter((spellId) => {
    const spell = SPELLS[spellId];
    return spell.acquisition?.guild && (spell.tier ?? 1) <= highest
      && !hero.knownSpells.includes(spellId);
  });
  const choiceBonus = skillRank(hero, 'loremaster') >= 2 ? 1 : 0;
  const count = 3 + choiceBonus;
  const options = deterministicOffer(state.seed, `${object.id}:${hero.id}:stacks`, pool, count);
  if (options.length < count) throw new Error(`The Stacks cannot deal ${count} unknown legal spells`);
  state.players[hero.owner].resources.essence -= 3;
  object.visitedBy.push(hero.id);
  state.pendingChoice = {
    kind: 'acquisitionSite', objectId: object.id,
    playerId: hero.owner, heroId: hero.id, options,
  };
  state.lastMessage = 'The Stacks deal three spells. Keep one.';
}

function wildShrineHandler(state: GameState, object: SiteObject, hero: Hero): void {
  if (object.kind !== 'wildShrine') throw new Error('The Wild Shrine handler received another site');
  if (object.visitedBy.includes(hero.id)) throw new Error('This hero already gambled at the Wild Shrine');
  const weighted = (Object.keys(SPELLS) as SpellId[]).filter((spellId) => {
    const spell = SPELLS[spellId];
    return !spell.acquisition?.provenance && spellId !== 'summonSkiff'
      && !hero.knownSpells.includes(spellId);
  }).flatMap((spellId) => Array.from({ length: SPELLS[spellId].tier ?? 1 }, () => spellId));
  if (!weighted.length) throw new Error('The Wild Shrine knows no unknown legal spell');
  const index = stableHash(state.seed, `${object.id}:${hero.id}:wild-shrine`) % weighted.length;
  const spellId = weighted[index];
  learnSpell(hero, spellId);
  object.visitedBy.push(hero.id);
  state.lastMessage = `The Wild Shrine teaches ${SPELLS[spellId].name}.`;
  state.eventLog.push(`${hero.name}: ${state.lastMessage}`);
}

function reliquaryPagesHandler(state: GameState, object: SiteObject, hero: Hero): void {
  if (object.kind !== 'reliquaryOfPages') {
    throw new Error('The Reliquary of Pages handler received another site');
  }
  if (object.claimed) throw new Error('The Reliquary of Pages has already been claimed');
  const spell = SPELLS[object.tomeSpellId];
  if (spell.tier !== 4 || spell.acquisition?.provenance) {
    throw new Error('The Reliquary of Pages requires an ordinary tier-4 spell');
  }
  claimSpellTome(hero, {
    id: 'spellTome', storedSpellId: object.tomeSpellId, tomeSource: 'reliquary-pages',
  });
  object.claimed = true;
  state.lastMessage = `The Reliquary of Pages yields a Spell Tome: ${spell.name}.`;
  state.eventLog.push(`${hero.name}: ${state.lastMessage}`);
}

const APPLY = {
  stacks: stacksHandler,
  wildShrine: wildShrineHandler,
  reliquaryOfPages: reliquaryPagesHandler,
} as const;

export const ACQUISITION_SITE_HANDLERS: readonly AcquisitionSiteHandler[] =
  (Object.keys(APPLY) as Array<keyof typeof APPLY>).map((id) => ({
    id, stage: 'adventure-interaction',
    apply: (context) => {
      const { state, object, hero } = context as {
        state: GameState; object: SiteObject; hero: Hero;
      };
      return APPLY[id](state, object, hero as never);
    },
  }));

export function ensureAcquisitionSiteHandlersRegistered(): void {
  const registered = registeredAcquisitionSiteHandlers();
  for (const handler of ACQUISITION_SITE_HANDLERS) {
    const current = registered.get(handler.id);
    if (!current) registerAcquisitionSiteHandler(handler);
    else if (current !== handler) throw new Error(`Duplicate acquisition site handler: ${handler.id}`);
  }
}

export function useAcquisitionSite(state: GameState, objectId: string): void {
  ensureAcquisitionSiteHandlersRegistered();
  const hero = activeHero(state);
  const object = state.map.objects.find((candidate): candidate is SiteObject =>
    candidate.id === objectId && ['stacks', 'wildShrine', 'reliquaryOfPages'].includes(candidate.kind));
  if (!object || !sameCoord(objectEntranceTile(object), hero.position)) {
    throw new Error('Stand at the acquisition site to use it');
  }
  if (state.map.objects.some((candidate) => candidate.kind === 'guardian'
      && candidate.protects === object.id)) {
    throw new Error('Defeat the guardian before using this acquisition site');
  }
  const handler = registeredAcquisitionSiteHandlers().get(object.kind);
  if (!handler) throw new Error(`Acquisition site handler is missing: ${object.kind}`);
  handler.apply({ state, object, hero }, undefined);
}

export function chooseAcquisitionSpell(state: GameState, spellId: SpellId): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'acquisitionSite' || !pending.options.includes(spellId)) {
    throw new Error('No such acquisition-site spell choice is pending');
  }
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  if (!hero) throw new Error('The choosing hero is missing');
  learnSpell(hero, spellId);
  state.pendingChoice = null;
  state.lastMessage = `${hero.name} keeps ${SPELLS[spellId].name}.`;
  state.eventLog.push(state.lastMessage);
}

ensureAcquisitionSiteHandlersRegistered();
