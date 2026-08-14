import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ITEM_SPRITE_SUBJECTS } from '../../../assets/adventureSpriteInventory';
import job from '../../../assets/jobs/item-sprites-built-in.json';
import { ASSET_MANIFEST, NON_SPRITE_REPRESENTATIONS, assetId } from '../../../assets/manifest';
import provenance from '../../../assets/provenance/item-sprite-generation.json';
import v2Provenance from '../../../assets/provenance/docs-60-67-native-generation.json';
import { ITEMS } from '../../content/items';
import type { ItemId, MapObject } from '../../core/types';
import { ItemSprite, mapObjectSpriteId } from '../assets';

const ids = Object.keys(ITEMS) as ItemId[];

describe('complete canonical item sprite family', () => {
  it('covers promoted items and all typed v2 placeholders', () => {
    expect(ids).toHaveLength(50);
    expect(Object.keys(ITEM_SPRITE_SUBJECTS)).toEqual(expect.arrayContaining(ids));
    expect(Object.values(ITEMS).filter((item) => item.use === 'combat')).toHaveLength(34);
    expect(Object.values(ITEMS).filter((item) => item.use === 'adventure')).toHaveLength(14);
    expect(Object.values(ITEMS).filter((item) => item.use === 'automatic')).toHaveLength(2);

    const promotedIds = ids.filter((id) =>
      ASSET_MANIFEST[assetId.mapObject('item', id)] !== undefined);
    const entries = promotedIds.map((id) => ASSET_MANIFEST[assetId.mapObject('item', id)]);
    expect(entries.every((entry) => entry?.w === 32 && entry.h === 32)).toBe(true);
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(50);
    const hashes = entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'));
    expect(new Set(hashes)).toHaveLength(50);
    const stagedIds = ids.filter((id) => !promotedIds.includes(id));
    expect(stagedIds).toHaveLength(0);
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
      if (NON_SPRITE_REPRESENTATIONS[assetId.mapObject('item', id)]) {
        expect(html).toContain('item-sprite-fallback');
      }
      else expect(html).toContain(ASSET_MANIFEST[assetId.mapObject('item', id)].file);
      expect(html).toContain('item-sprite-upgraded');
      expect(html).toContain(`aria-label="${ITEMS[id].name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')}"`);
    }
  });

  it('keeps exact deterministic provenance and removes every installed fallback', () => {
    const promotedIds = ids.filter((id) =>
      ASSET_MANIFEST[assetId.mapObject('item', id)] !== undefined);
    const originalIds = promotedIds.filter((id) => provenance.selections
      .some((selection) => selection.catalog_key === id));
    expect(job.requests.map((request) => request.catalog_key)).toEqual(originalIds);
    expect(provenance.selections.map((selection) => selection.catalog_key)).toEqual(originalIds);
    expect(v2Provenance.selections.filter((selection) => selection.family === 'item'))
      .toHaveLength(13);
    expect(new Set(job.requests.map((request) => request.output))).toHaveLength(37);
    expect(new Set(job.requests.map((request) => request.final))).toHaveLength(37);
    expect(new Set(job.requests.map((request) => request.prompt))).toHaveLength(37);
    expect(new Set(provenance.selections.map((selection) => selection.built_in_output)))
      .toHaveLength(37);
    expect(new Set(provenance.selections.map((selection) => selection.source_sha256)))
      .toHaveLength(37);
    for (const id of promotedIds) {
      const sprite = renderToStaticMarkup(<ItemSprite item={{ id }} />);
      expect(sprite, id).toContain(ASSET_MANIFEST[assetId.mapObject('item', id)].file);
      expect(sprite, id).not.toContain('item-sprite-fallback');
      const selection = provenance.selections.find((candidate) => candidate.catalog_key === id);
      const v2Selection = v2Provenance.selections.find((candidate) =>
        candidate.canonical_id === `item:${id}`);
      if (v2Selection) {
        expect(v2Selection.accepted).toBe(true);
        expect(v2Selection.final_dimensions).toEqual([32, 32]);
        continue;
      }
      expect(selection).toBeTruthy();
      expect(selection!.accepted).toBe(true);
      expect(selection!.final_dimensions).toEqual([32, 32]);
      expect(selection!.alpha.partial).toBe(0);
      expect(selection!.alpha.transparent_corners).toBe(4);
      expect(selection!.alpha.transparent + selection!.alpha.opaque).toBe(1024);
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
