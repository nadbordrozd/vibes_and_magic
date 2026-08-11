import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ITEM_SPRITE_SUBJECTS } from '../../../assets/adventureSpriteInventory';
import job from '../../../assets/jobs/item-sprites-built-in.json';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';
import provenance from '../../../assets/provenance/item-sprite-generation.json';
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

  it('keeps exact deterministic provenance and removes every installed fallback', () => {
    expect(job.requests.map((request) => request.catalog_key)).toEqual(ids);
    expect(provenance.selections.map((selection) => selection.catalog_key)).toEqual(ids);
    expect(new Set(job.requests.map((request) => request.output))).toHaveLength(37);
    expect(new Set(job.requests.map((request) => request.final))).toHaveLength(37);
    expect(new Set(job.requests.map((request) => request.prompt))).toHaveLength(37);
    expect(new Set(provenance.selections.map((selection) => selection.built_in_output)))
      .toHaveLength(37);
    expect(new Set(provenance.selections.map((selection) => selection.source_sha256)))
      .toHaveLength(37);
    for (const id of ids) {
      const sprite = renderToStaticMarkup(<ItemSprite item={{ id }} />);
      expect(sprite, id).toContain(ASSET_MANIFEST[assetId.mapObject('item', id)].file);
      expect(sprite, id).not.toContain('item-sprite-fallback');
      const selection = provenance.selections.find((candidate) => candidate.catalog_key === id)!;
      expect(selection.accepted).toBe(true);
      expect(selection.final_dimensions).toEqual([32, 32]);
      expect(selection.alpha.partial).toBe(0);
      expect(selection.alpha.transparent_corners).toBe(4);
      expect(selection.alpha.transparent + selection.alpha.opaque).toBe(1024);
    }
  });

  it('pins the sole corrected physical-subject equivalent to Scroll of Quiet', () => {
    const quietAcceptedSubject = 'A pale parchment scroll tied with a blue-grey cord around a tiny closed bell clasp without a clapper. The rolled parchment must be the dominant silhouette; the bell is only a miniature cord clasp, never a full-size bell.';
    for (const request of job.requests) {
      if (request.catalog_key === 'scrollQuiet') {
        expect(request.prompt).toContain(quietAcceptedSubject);
      } else {
        expect(request.prompt, request.catalog_key).toContain(
          ITEM_SPRITE_SUBJECTS[request.catalog_key as ItemId],
        );
      }
    }
  });

  it('keeps every audited item consumer on the shared ItemSprite', () => {
    const consumers = [
      'AdventureHeroDetails.tsx', 'AdventureItemDialog.tsx', 'AdventureScreen.tsx',
      'AdventureStructureDialog.tsx', 'CastleScreen.tsx', 'CombatScreen.tsx', 'Dialogs.tsx',
      'EditorGuardianControls.tsx', 'EditorRewardControls.tsx', 'EditorTerrainCanvas.tsx',
      'ExchangeScreen.tsx', 'InspectionLayer.tsx',
    ];
    for (const file of consumers) {
      const source = readFileSync(resolve(process.cwd(), 'src/ui/components', file), 'utf8');
      expect(source, file).toContain('ItemSprite');
    }
  });
});
