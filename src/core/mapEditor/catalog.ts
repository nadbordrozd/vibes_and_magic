import { ARTIFACTS } from '../../content/artifacts';
import { BUILDINGS } from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import { HEROES } from '../../content/heroes';
import { ITEMS } from '../../content/items';
import { MAP_OBJECT_KINDS } from '../../content/mapObjectRegistry';
import { SPELLS } from '../../content/spells';
import { TERRAIN } from '../../content/terrain';
import { UNITS } from '../../content/units';
import { ADVENTURE_PROP_CATALOG } from '../../content/adventureProps';

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const catalogIds = [
  ...Object.keys(TERRAIN).map((id) => `terrain:${id}:${TERRAIN[id as keyof typeof TERRAIN].skins.join(',')}`),
  ...Object.keys(FACTIONS).map((id) => `faction:${id}`),
  ...Object.keys(HEROES).map((id) => `hero:${id}`),
  ...Object.keys(UNITS).map((id) => `unit:${id}`),
  ...Object.keys(ARTIFACTS).map((id) => `artifact:${id}`),
  ...Object.keys(ITEMS).map((id) => `item:${id}`),
  ...Object.keys(SPELLS).map((id) => `spell:${id}`),
  ...Object.keys(BUILDINGS).map((id) => `building:${id}`),
  ...MAP_OBJECT_KINDS.map((id) => `object:${id}`),
  ...ADVENTURE_PROP_CATALOG.map((entry) =>
    `prop:${entry.prop}:${entry.footprint.w}x${entry.footprint.h}:${entry.anomaly}`),
].sort();

/** Changes whenever the installed authoring-facing catalog identity changes. */
export const EDITOR_CATALOG_HASH = fnv1a(catalogIds.join('\n'));

export const editorMapHash = fnv1a;
