import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ITEM_SPRITE_SUBJECTS } from '../../../assets/adventureSpriteInventory';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';
import { ITEMS } from '../../content/items';
import type { ItemId, MapObject } from '../../core/types';
import { ItemSprite, mapObjectSpriteId } from '../assets';

const ids = Object.keys(ITEMS) as ItemId[];

describe('complete canonical item sprite family', () => {
  it('covers all 37 catalog definitions with literal subjects and distinct native paths/bytes', () => {
    expect(ids).toHaveLength(37);
    expect(Object.keys(ITEM_SPRITE_SUBJECTS)).toEqual(expect.arrayContaining(ids));
    expect(Object.values(ITEMS).filter((item) => item.use === 'combat')).toHaveLength(25);
    expect(Object.values(ITEMS).filter((item) => item.use === 'adventure')).toHaveLength(11);
    expect(Object.values(ITEMS).filter((item) => item.use === 'automatic')).toHaveLength(1);

    const entries = ids.map((id) => ASSET_MANIFEST[assetId.mapObject('item', id)]);
    expect(entries.every((entry) => entry?.w === 32 && entry.h === 32)).toBe(true);
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(37);
    const hashes = entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'));
    expect(new Set(hashes)).toHaveLength(37);
  });

  it('uses one manifest lookup for map pickups and HTML item surfaces while keeping state semantic', () => {
    for (const id of ids) {
      const object: MapObject = {
        id: `test-${id}`, kind: 'item', position: { x: 0, y: 0 },
        item: { id }, collected: false,
      };
      expect(mapObjectSpriteId(object)).toBe(assetId.mapObject('item', id));
      const html = renderToStaticMarkup(<button aria-label={ITEMS[id].name}>
        <ItemSprite item={{ id, plus: true }} /><span>{ITEMS[id].name}</span>
      </button>);
      expect(html).toContain(ASSET_MANIFEST[assetId.mapObject('item', id)].file);
      expect(html).toContain('item-sprite-upgraded');
      expect(html).toContain(`aria-label="${ITEMS[id].name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')}"`);
    }
  });
});
