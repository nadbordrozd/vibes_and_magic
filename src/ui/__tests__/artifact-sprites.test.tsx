import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ARTIFACT_SPRITE_SUBJECTS } from '../../../assets/adventureSpriteInventory';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';
import provenance from '../../../assets/provenance/artifact-sprite-generation.json';
import {
  ARTIFACTS, CHARM_ARTIFACT_IDS, INSTALLED_ARTIFACT_IDS, RELIC_ARTIFACT_IDS,
  VANILLA_ARTIFACT_IDS,
} from '../../content/artifacts';
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

    const vanillaSelections = provenance.selections.filter((selection) =>
      VANILLA_ARTIFACT_IDS.includes(selection.catalog_key as ArtifactId));
    expect(vanillaSelections).toHaveLength(36);
    for (const selection of vanillaSelections) {
      expect(selection.accepted).toBe(true);
      expect(selection.alpha.partial).toBe(0);
      expect(selection.alpha.transparent_corners).toBe(4);
      expect(selection.alpha.transparent + selection.alpha.opaque).toBe(1024);
      expect(ARTIFACT_SPRITE_SUBJECTS[selection.catalog_key as ArtifactId]).toBeTruthy();
    }
  });

  it('preserves exactly all 22 Charm definitions inside the cumulative installed set', () => {
    expect(CHARM_ARTIFACT_IDS).toHaveLength(22);
    expect(new Set(CHARM_ARTIFACT_IDS)).toHaveLength(22);
    expect(CHARM_ARTIFACT_IDS.every((id) => ARTIFACTS[id].class === 'charm')).toBe(true);
    expect(Object.values(ARTIFACTS).filter((artifact) => artifact.class === 'charm')
      .map((artifact) => artifact.id)).toEqual(CHARM_ARTIFACT_IDS);
    const vanillaAndCharm = [...VANILLA_ARTIFACT_IDS, ...CHARM_ARTIFACT_IDS];
    expect(vanillaAndCharm).toHaveLength(58);
    expect(new Set(vanillaAndCharm)).toHaveLength(58);
    expect(Object.keys(ARTIFACTS)).toHaveLength(90);

    const entries = vanillaAndCharm.map((id) =>
      ASSET_MANIFEST[assetId.mapObject('artifact', id)]);
    expect(entries.every((entry) => entry?.w === 32 && entry.h === 32)).toBe(true);
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(58);
    const hashes = entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'));
    expect(new Set(hashes)).toHaveLength(58);

    const charmSelections = provenance.selections.filter((selection) =>
      CHARM_ARTIFACT_IDS.includes(selection.catalog_key as ArtifactId));
    expect(charmSelections).toHaveLength(22);
    for (const selection of charmSelections) {
      expect(selection.accepted).toBe(true);
      expect(selection.discarded_outputs).toEqual([]);
      expect(selection.alpha.partial).toBe(0);
      expect(selection.alpha.transparent_corners).toBe(4);
      expect(selection.alpha.transparent + selection.alpha.opaque).toBe(1024);
      expect(ARTIFACT_SPRITE_SUBJECTS[selection.catalog_key as ArtifactId]).toBeTruthy();
    }
  });

  it('adds exactly all 18 Relic definitions and pins cumulative native coverage at 76/90', () => {
    expect(RELIC_ARTIFACT_IDS).toHaveLength(18);
    expect(new Set(RELIC_ARTIFACT_IDS)).toHaveLength(18);
    expect(RELIC_ARTIFACT_IDS.every((id) => ARTIFACTS[id].class === 'relic')).toBe(true);
    expect(Object.values(ARTIFACTS).filter((artifact) => artifact.class === 'relic')
      .map((artifact) => artifact.id)).toEqual(RELIC_ARTIFACT_IDS);
    expect(INSTALLED_ARTIFACT_IDS).toHaveLength(76);
    expect(new Set(INSTALLED_ARTIFACT_IDS)).toHaveLength(76);
    expect(Object.keys(ARTIFACTS)).toHaveLength(90);

    const entries = INSTALLED_ARTIFACT_IDS.map((id) =>
      ASSET_MANIFEST[assetId.mapObject('artifact', id)]);
    expect(entries.every((entry) => entry?.w === 32 && entry.h === 32)).toBe(true);
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(76);
    const hashes = entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'));
    expect(new Set(hashes)).toHaveLength(76);

    expect(provenance.selections).toHaveLength(76);
    const relicSelections = provenance.selections.filter((selection) =>
      RELIC_ARTIFACT_IDS.includes(selection.catalog_key as ArtifactId));
    expect(relicSelections).toHaveLength(18);
    for (const selection of relicSelections) {
      expect(selection.accepted).toBe(true);
      expect(selection.discarded_outputs).toEqual([]);
      expect(selection.alpha.partial).toBe(0);
      expect(selection.alpha.transparent_corners).toBe(4);
      expect(selection.alpha.transparent + selection.alpha.opaque).toBe(1024);
      expect(ARTIFACT_SPRITE_SUBJECTS[selection.catalog_key as ArtifactId]).toBeTruthy();
    }
  });

  it('uses one canonical sprite for reward pickups and HTML surfaces while metadata stays text', () => {
    for (const id of INSTALLED_ARTIFACT_IDS) {
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

  it('preserves Relic instance state while every remaining class keeps the fallback', () => {
    const definition = ARTIFACTS.seamstone;
    const html = renderToStaticMarkup(<button
      data-class={definition.class} data-slot={definition.slot} data-school="rite">
      <ArtifactSprite artifact={{ id: 'seamstone', chosenSchool: 'rite' }} />
      <span>{definition.class} · {definition.slot} · rite</span>
    </button>);
    expect(html).toContain(ASSET_MANIFEST[assetId.mapObject('artifact', 'seamstone')].file);
    expect(html).not.toContain('artifact-sprite-fallback');
    expect(html).toContain('data-class="relic"');
    expect(html).toContain('data-slot="amulet"');
    expect(html).toContain('data-school="rite"');
    expect(html).toContain('relic · amulet · rite');

    for (const artifactClass of ['burden', 'kit', 'trinket'] as const) {
      const remaining = Object.values(ARTIFACTS).filter((artifact) =>
        artifact.class === artifactClass);
      expect(remaining.length).toBeGreaterThan(0);
      for (const artifact of remaining) {
        const fallback = renderToStaticMarkup(<ArtifactSprite artifact={{ id: artifact.id }} />);
        expect(fallback, artifact.id).toContain('artifact-sprite-fallback');
      }
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
