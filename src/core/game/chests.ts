import { CHEST_ITEM_POOL } from '../../content/items';
import { SCROLL_SPELL_IDS } from '../../content/spells';
import { randomInt } from '../rng';
import type { ArtifactInstance, GameState, Hero, ItemInstance } from '../types';
import { ARTIFACTS } from '../../content/artifacts';

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
  state.pendingChoice = {
    kind: 'chest', objectId, playerId: hero.owner, heroId: hero.id,
    item: drawChestItem(state), artifact,
  };
}
