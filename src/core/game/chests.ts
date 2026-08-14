import { CHEST_ITEM_POOL } from '../../content/items';
import { SCROLL_SPELL_IDS } from '../../content/spells';
import { randomInt } from '../rng';
import type { ArtifactInstance, GameState, Hero, ItemInstance, SpellId } from '../types';
import { ARTIFACTS } from '../../content/artifacts';
import { SPELLS } from '../../content/spells';
import { validateSpellTomeInstance } from '../../content/items';

export type SpellTomeSource = NonNullable<ItemInstance['tomeSource']>;

/** Dedicated seed/key selection: adding unrelated campaign RNG calls cannot change a Tome. */
export function seededSpellTome(
  seed: number, key: string, source: SpellTomeSource,
): ItemInstance & { id: 'spellTome'; storedSpellId: SpellId; tomeSource: SpellTomeSource } {
  const tierLimit = source === 'reliquary-pages' ? { minimum: 4, maximum: 4 }
    : source === 'lock' || source === 'barrow' ? { minimum: 1, maximum: 5 }
      : { minimum: 1, maximum: 3 };
  const pool = (Object.keys(SPELLS) as SpellId[]).filter((spellId) => {
    const spell = SPELLS[spellId];
    return (spell.tier ?? 1) >= tierLimit.minimum && (spell.tier ?? 1) <= tierLimit.maximum
      && !spell.acquisition?.provenance && spellId !== 'summonSkiff';
  }).sort((first, second) => first.localeCompare(second));
  if (!pool.length) throw new Error(`No eligible Spell Tome pool for ${source}`);
  const hash = [...`${key}:${source}`].reduce((value, character) =>
    Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, seed >>> 0);
  const item: ItemInstance & {
    id: 'spellTome'; storedSpellId: SpellId; tomeSource: SpellTomeSource;
  } = {
    id: 'spellTome', storedSpellId: pool[hash % pool.length], tomeSource: source,
  };
  validateSpellTomeInstance(item);
  return item;
}

export function drawChestItem(state: GameState): ItemInstance {
  let index: number;
  [index, state.rng] = randomInt(state.rng, CHEST_ITEM_POOL.length);
  const id = CHEST_ITEM_POOL[index];
  if (id !== 'spellScroll') return { id };
  let spellIndex: number;
  [spellIndex, state.rng] = randomInt(state.rng, SCROLL_SPELL_IDS.length);
  return { id, storedSpellId: SCROLL_SPELL_IDS[spellIndex] };
}

export function offerChestChoice(
  state: GameState,
  objectId: string,
  hero: Hero,
): void {
  const hash = [...objectId].reduce((value, character) =>
    Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, state.seed);
  const artifactPool = Object.values(ARTIFACTS).filter((artifact) =>
    artifact.class !== 'kit' && artifact.class !== 'trinket');
  const artifact: ArtifactInstance | undefined = hash % 10 === 0
    ? { id: artifactPool[hash % artifactPool.length].id } : undefined;
  const seededItem = hash % 8 === 0
    ? seededSpellTome(state.seed, objectId, 'chest') : drawChestItem(state);
  state.pendingChoice = {
    kind: 'chest', objectId, playerId: hero.owner, heroId: hero.id,
    item: seededItem, artifact,
  };
}
