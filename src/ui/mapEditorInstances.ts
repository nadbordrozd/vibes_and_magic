import { ITEMS, validateSpellTomeInstance } from '../content/items';
import { SCROLL_SPELL_IDS, SPELLS } from '../content/spells';
import type { ArtifactId, ArtifactInstance, ItemId, ItemInstance, SpellId } from '../core/types';
import type { EditorCell } from './mapEditorTerrain';

export function createDefaultEditorArtifactInstance(id: ArtifactId): ArtifactInstance {
  return id === 'seamstone' ? { id, chosenSchool: 'rite' } : { id };
}

export const EDITOR_TOME_SOURCES = [
  'chest', 'lock', 'reliquary-cairn', 'barrow', 'reliquary-pages',
] as const satisfies readonly NonNullable<ItemInstance['tomeSource']>[];

export function editorTomeSpellChoices(
  source: NonNullable<ItemInstance['tomeSource']>,
): SpellId[] {
  const minimum = source === 'reliquary-pages' ? 4 : 1;
  const maximum = source === 'reliquary-pages' ? 4
    : source === 'lock' || source === 'barrow' ? 5 : 3;
  return (Object.keys(SPELLS) as SpellId[]).filter((spellId) => {
    const spell = SPELLS[spellId];
    return (spell.tier ?? 1) >= minimum && (spell.tier ?? 1) <= maximum
      && !spell.acquisition?.provenance && spellId !== 'summonSkiff';
  }).sort((a, b) => SPELLS[a].name.localeCompare(SPELLS[b].name));
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
    ...(id === 'spellTome' ? {
      tomeSource: 'chest' as const, storedSpellId: editorTomeSpellChoices('chest')[0],
    } : {}),
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
        ['id', 'plus', 'origin', 'storedSpellId', 'tomeSource'].includes(key))
      || (instance.plus !== undefined && typeof instance.plus !== 'boolean')) return false;
  const definition = ITEMS[instance.id];
  if (instance.plus !== undefined && definition.behavior !== 'scroll') return false;
  if (instance.origin !== undefined && (instance.id !== 'tradeGoods'
      || !Number.isInteger(instance.origin.x) || !Number.isInteger(instance.origin.y))) return false;
  if (instance.id === 'tradeGoods' && !instance.origin) return false;
  if (instance.storedSpellId !== undefined
      && instance.id !== 'spellScroll' && instance.id !== 'spellTome') return false;
  if (instance.id === 'spellScroll' && (!instance.storedSpellId
      || !Object.hasOwn(SPELLS, instance.storedSpellId))) return false;
  if (instance.id === 'spellTome') {
    try { validateSpellTomeInstance(instance); } catch { return false; }
  } else if (instance.tomeSource !== undefined) return false;
  return true;
}
