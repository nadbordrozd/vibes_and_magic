import { ITEMS } from '../content/items';
import { SCROLL_SPELL_IDS, SPELLS } from '../content/spells';
import type { ArtifactId, ArtifactInstance, ItemId, ItemInstance } from '../core/types';
import type { EditorCell } from './mapEditorTerrain';

export function createDefaultEditorArtifactInstance(id: ArtifactId): ArtifactInstance {
  return id === 'seamstone' ? { id, chosenSchool: 'rite' } : { id };
}

/** Canonical instance defaults shared by reward, object, and guardian-drop authoring. */
export function createDefaultEditorItemInstance(
  id: ItemId, origin: EditorCell = { x: 0, y: 0 },
): ItemInstance {
  const definition = ITEMS[id];
  return {
    id,
    ...(definition.behavior === 'scroll' ? {
      plus: false,
      ...(id === 'spellScroll' && { storedSpellId: SCROLL_SPELL_IDS[0] }),
    } : {}),
    ...(id === 'tradeGoods' ? { origin: { ...origin } } : {}),
  };
}

export function isValidEditorArtifactInstance(instance: ArtifactInstance): boolean {
  return Object.keys(instance).every((key) => ['id', 'chosenSchool'].includes(key))
    && (instance.chosenSchool === undefined || (instance.id === 'seamstone'
      && ['rite', 'craft', 'grave', 'wild'].includes(instance.chosenSchool)));
}

export function isValidEditorItemInstance(instance: ItemInstance): boolean {
  if (!Object.hasOwn(ITEMS, instance.id)
      || !Object.keys(instance).every((key) =>
        ['id', 'plus', 'origin', 'storedSpellId'].includes(key))
      || (instance.plus !== undefined && typeof instance.plus !== 'boolean')) return false;
  const definition = ITEMS[instance.id];
  if (instance.plus !== undefined && definition.behavior !== 'scroll') return false;
  if (instance.origin !== undefined && (instance.id !== 'tradeGoods'
      || !Number.isInteger(instance.origin.x) || !Number.isInteger(instance.origin.y))) return false;
  if (instance.id === 'tradeGoods' && !instance.origin) return false;
  if (instance.storedSpellId !== undefined && instance.id !== 'spellScroll') return false;
  if (instance.id === 'spellScroll' && (!instance.storedSpellId
      || !Object.hasOwn(SPELLS, instance.storedSpellId))) return false;
  return true;
}
