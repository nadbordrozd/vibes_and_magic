import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ARTIFACT_SPRITE_SUBJECTS } from '../../../assets/adventureSpriteInventory';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';
import provenance from '../../../assets/provenance/artifact-sprite-generation.json';
import { ARTIFACTS, VANILLA_ARTIFACT_IDS } from '../../content/artifacts';
import type { ArtifactId, MapObject } from '../../core/types';
import { ArtifactSprite, mapObjectSpriteId } from '../assets';

describe('complete Vanilla artifact sprite batch', () => {
  it('covers exactly the 36 catalog Vanilla definitions with unique native hard-alpha bytes', () => {
    expect(VANILLA_ARTIFACT_IDS).toHaveLength(36);
    expect(new Set(VANILLA_ARTIFACT_IDS)).toHaveLength(36);
    expect(VANILLA_ARTIFACT_IDS.every((id) => ARTIFACTS[id].class === 'vanilla')).toBe(true);
    expect(Object.values(ARTIFACTS).filter((artifact) => artifact.class === 'vanilla')
      .map((artifact) => artifact.id)).toEqual(VANILLA_ARTIFACT_IDS);

    const entries = VANILLA_ARTIFACT_IDS.map((id) => ASSET_MANIFEST[assetId.mapObject('artifact', id)]);
    expect(entries.every((entry) => entry?.w === 32 && entry.h === 32)).toBe(true);
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(36);
    const hashes = entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'));
    expect(new Set(hashes)).toHaveLength(36);

    expect(provenance.selections).toHaveLength(36);
    for (const selection of provenance.selections) {
      expect(selection.accepted).toBe(true);
      expect(selection.alpha.partial).toBe(0);
      expect(selection.alpha.transparent_corners).toBe(4);
      expect(selection.alpha.transparent + selection.alpha.opaque).toBe(1024);
      expect(ARTIFACT_SPRITE_SUBJECTS[selection.catalog_key as ArtifactId]).toBeTruthy();
    }
  });

  it('uses one canonical sprite for reward pickups and HTML surfaces while metadata stays text', () => {
    for (const id of VANILLA_ARTIFACT_IDS) {
      const object: MapObject = {
        id: `test-${id}`, kind: 'rewardPickup', position: { x: 0, y: 0 },
        reward: { artifacts: [{ id }], items: [] }, collected: false,
      };
      expect(mapObjectSpriteId(object)).toBe(assetId.mapObject('artifact', id));
      const definition = ARTIFACTS[id];
      const html = renderToStaticMarkup(<button aria-label={`${definition.name}, ${definition.class}, ${definition.slot}`}>
        <ArtifactSprite artifact={{ id }} />
        <b>{definition.name}</b><small>{definition.class} · {definition.slot}</small>
      </button>);
      expect(html).toContain(ASSET_MANIFEST[assetId.mapObject('artifact', id)].file);
      expect(html).toContain(definition.name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;'));
      expect(html).toContain(`${definition.class} · ${definition.slot}`);
    }
  });

  it('keeps every audited artifact consumer on the shared ArtifactSprite', () => {
    const consumers = [
      'ArtifactPaperDoll.tsx', 'CastleScreen.tsx', 'Dialogs.tsx', 'InspectionLayer.tsx',
      'EditorTerrainCanvas.tsx', 'EditorRewardControls.tsx', 'AdventureStructureDialog.tsx',
    ];
    for (const file of consumers) {
      const source = readFileSync(resolve(process.cwd(), 'src/ui/components', file), 'utf8');
      expect(source, file).toContain('ArtifactSprite');
    }
  });
});
