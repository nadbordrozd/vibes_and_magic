import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ARTIFACT_SPRITE_SUBJECTS } from '../../../assets/adventureSpriteInventory';
import job from '../../../assets/jobs/artifact-sprites-built-in.json';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';
import provenance from '../../../assets/provenance/artifact-sprite-generation.json';
import itemProvenance from '../../../assets/provenance/item-sprite-generation.json';
import {
  ARTIFACTS, BURDEN_ARTIFACT_IDS, CHARM_ARTIFACT_IDS, INSTALLED_ARTIFACT_IDS,
  KIT_ARTIFACT_IDS, KIT_PIECES, RELIC_ARTIFACT_IDS, TRINKET_ARTIFACT_IDS,
  VANILLA_ARTIFACT_IDS,
} from '../../content/artifacts';
import { ITEMS } from '../../content/items';
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

  it('adds exactly all 18 Relic definitions without changing the accepted 76-sprite prefix', () => {
    expect(RELIC_ARTIFACT_IDS).toHaveLength(18);
    expect(new Set(RELIC_ARTIFACT_IDS)).toHaveLength(18);
    expect(RELIC_ARTIFACT_IDS.every((id) => ARTIFACTS[id].class === 'relic')).toBe(true);
    expect(Object.values(ARTIFACTS).filter((artifact) => artifact.class === 'relic')
      .map((artifact) => artifact.id)).toEqual(RELIC_ARTIFACT_IDS);
    const throughRelic = [
      ...VANILLA_ARTIFACT_IDS, ...CHARM_ARTIFACT_IDS, ...RELIC_ARTIFACT_IDS,
    ];
    expect(throughRelic).toHaveLength(76);
    expect(new Set(throughRelic)).toHaveLength(76);
    expect(Object.keys(ARTIFACTS)).toHaveLength(90);

    const entries = throughRelic.map((id) =>
      ASSET_MANIFEST[assetId.mapObject('artifact', id)]);
    expect(entries.every((entry) => entry?.w === 32 && entry.h === 32)).toBe(true);
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(76);
    const hashes = entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'));
    expect(new Set(hashes)).toHaveLength(76);

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

  it('completes exact 90/90 coverage with 4 Burdens, 4 Kit pieces, and 6 Trinkets', () => {
    expect(BURDEN_ARTIFACT_IDS).toHaveLength(4);
    expect(KIT_ARTIFACT_IDS).toHaveLength(4);
    expect(TRINKET_ARTIFACT_IDS).toHaveLength(6);
    expect(INSTALLED_ARTIFACT_IDS).toHaveLength(90);
    expect(new Set(INSTALLED_ARTIFACT_IDS)).toHaveLength(90);
    expect(new Set(INSTALLED_ARTIFACT_IDS)).toEqual(new Set(Object.keys(ARTIFACTS)));
    expect(job.requests.map((request) => request.catalog_key)).toEqual(INSTALLED_ARTIFACT_IDS);
    expect(provenance.selections.map((selection) => selection.catalog_key))
      .toEqual(INSTALLED_ARTIFACT_IDS);

    expect(new Set(job.requests.map((request) => request.output))).toHaveLength(90);
    expect(new Set(job.requests.map((request) => request.final))).toHaveLength(90);
    expect(new Set(job.requests.map((request) => request.prompt))).toHaveLength(90);
    expect(new Set(provenance.selections.map((selection) => selection.built_in_output)))
      .toHaveLength(90);
    expect(new Set(provenance.selections.map((selection) => selection.prompt_sha256)))
      .toHaveLength(90);

    const sourceHashes = new Set<string>();
    const finalHashes = new Set<string>();
    for (const selection of provenance.selections) {
      const request = job.requests.find((candidate) =>
        candidate.catalog_key === selection.catalog_key)!;
      const sourceHash = createHash('sha256')
        .update(readFileSync(resolve(process.cwd(), selection.source))).digest('hex');
      const finalHash = createHash('sha256')
        .update(readFileSync(resolve(process.cwd(), selection.final))).digest('hex');
      sourceHashes.add(sourceHash);
      finalHashes.add(finalHash);
      expect(selection.accepted, selection.catalog_key).toBe(true);
      expect(selection.prompt_sha256).toBe(createHash('sha256').update(request.prompt).digest('hex'));
      expect(selection.source_sha256).toBe(sourceHash);
      expect(selection.final_sha256).toBe(finalHash);
      expect(selection.source_dimensions).not.toBeNull();
      expect(selection.source_dimensions![0]).toBeGreaterThan(32);
      expect(selection.source_dimensions![1]).toBeGreaterThan(32);
      expect(selection.final_dimensions).toEqual([32, 32]);
      expect(selection.alpha.partial).toBe(0);
      expect(selection.alpha.transparent_corners).toBe(4);
      expect(selection.alpha.transparent + selection.alpha.opaque).toBe(1024);
    }
    expect(sourceHashes).toHaveLength(90);
    expect(finalHashes).toHaveLength(90);
  });

  it('keeps all 127 collectible paths and bitmap bytes distinct across both families', () => {
    const entries = [
      ...Object.keys(ITEMS).map((id) => ASSET_MANIFEST[assetId.mapObject('item', id)]),
      ...INSTALLED_ARTIFACT_IDS.map((id) => ASSET_MANIFEST[assetId.mapObject('artifact', id)]),
    ];
    expect(entries).toHaveLength(127);
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(127);
    expect(new Set(entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'))))
      .toHaveLength(127);
    const selections = [...itemProvenance.selections, ...provenance.selections];
    expect(new Set(selections.map((selection) => selection.source))).toHaveLength(127);
    expect(new Set(selections.map((selection) => selection.source_sha256))).toHaveLength(127);
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

  it('preserves semantic instance and class state while removing every artifact fallback', () => {
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

    for (const id of Object.keys(ARTIFACTS) as ArtifactId[]) {
      const sprite = renderToStaticMarkup(<ArtifactSprite artifact={{ id }} />);
      expect(sprite, id).toContain(ASSET_MANIFEST[assetId.mapObject('artifact', id)].file);
      expect(sprite, id).not.toContain('artifact-sprite-fallback');
    }

    expect(KIT_PIECES).toEqual(KIT_ARTIFACT_IDS);
    for (const id of [...BURDEN_ARTIFACT_IDS, ...KIT_ARTIFACT_IDS, ...TRINKET_ARTIFACT_IDS]) {
      const artifact = ARTIFACTS[id];
      const request = job.requests.find((candidate) => candidate.catalog_key === id)!;
      expect(request.prompt).not.toContain(artifact.description);
      if (artifact.class === 'burden') {
        expect(artifact.burdenRemoval).toBeTruthy();
        expect(request.prompt).not.toContain(artifact.burdenRemoval!);
      }
    }
  });

  it('keeps every audited artifact consumer on the shared ArtifactSprite', () => {
    const consumers = [
      'ArtifactPaperDoll.tsx', 'CastleScreen.tsx', 'Dialogs.tsx', 'InspectionLayer.tsx',
      'EditorTerrainCanvas.tsx', 'EditorRewardControls.tsx', 'AdventureStructureDialog.tsx',
      'CombatScreen.tsx',
    ];
    for (const file of consumers) {
      const source = readFileSync(resolve(process.cwd(), 'src/ui/components', file), 'utf8');
      expect(source, file).toContain('ArtifactSprite');
    }
  });
});
