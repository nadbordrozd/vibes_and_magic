import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RESOURCE_MINE_SUBJECTS, RESOURCE_PICKUP_SUBJECTS } from '../../../assets/adventureSpriteInventory';
import job from '../../../assets/jobs/mine-sprites-built-in.json';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';
import provenance from '../../../assets/provenance/mine-sprite-generation.json';
import selections from '../../../assets/selections.json';
import { assetWorklist } from '../../../assets/worklist';
import { tile } from '../../content/terrain';
import { createGame } from '../../core/game';
import type { MapObject, ResourceId } from '../../core/types';
import { mapObjectSpriteId } from '../assets';
import { AdventureMap } from '../components/AdventureMap';
import { EditorTerrainCanvas, editorPropCanvasGeometry } from '../components/EditorTerrainCanvas';
import { mapObjectName } from '../inspection';
import {
  createBlankEditorMap, type EditorMapObject,
} from '../../core/mapEditor';
import {
  defaultEditorStructureProperties, editorStructureEntrance, editorStructureFootprint,
  editorStructurePresentationObject,
} from '../mapEditorStructures';

const resources = Object.keys(RESOURCE_MINE_SUBJECTS) as ResourceId[];
const operations: Record<ResourceId, readonly string[]> = {
  gold: ['quarried-limestone', 'adit', 'hand-cranked wooden winch', 'gold-bearing chips'],
  timber: ['logging yard', 'saw shelter', 'sawbench', 'crosscut saw', 'round-ended cut logs'],
  iron: ['headframe', 'pulley wheel', 'iron rails', 'ore trolley', 'iron-bearing stone'],
  essence: ['stitchwell', 'stone-lined extraction basin', 'world seam', 'copper pump',
    'winding drum', 'glass collection vessel'],
};

const mine = (resource: ResourceId, index = 0): MapObject => ({
  id: `mine-${resource}`, kind: 'mine', position: { x: 2 + index * 3, y: 4 },
  resource, income: resource === 'gold' ? 1_000 : 1, owner: index % 2 ? 'p1' : null,
  cleared: false, chartered: false, footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 },
});

describe('four literal adventure resource operations', () => {
  it('installs exactly four distinct 64x96 mine paths/bytes without changing pickup art', () => {
    expect(resources).toEqual(['gold', 'timber', 'iron', 'essence']);
    expect(Object.keys(RESOURCE_PICKUP_SUBJECTS)).toEqual(resources);
    const entries = resources.map((resource) =>
      ASSET_MANIFEST[assetId.mapObject('mine', resource)]);
    expect(entries).toHaveLength(4);
    for (const entry of entries) expect(entry).toMatchObject({
      w: 64, h: 96, anchor: { x: 0, y: 64 },
      contact: { w: 2, h: 1, entrance: { x: 0, y: 0 } },
    });
    expect(new Set(entries.map((entry) => entry.file))).toHaveLength(4);
    expect(entries.every((entry) => entry.file.startsWith('assets/mines/'))).toBe(true);
    const hashes = entries.map((entry) => createHash('sha256')
      .update(readFileSync(resolve(process.cwd(), 'public', entry.file))).digest('hex'));
    expect(new Set(hashes)).toHaveLength(4);
    expect(resources.map((resource) =>
      ASSET_MANIFEST[assetId.mapObject('pile', resource)].file)).toEqual([
      'assets/map-objects/pile-gold.png', 'assets/map-objects/pile-timber.png',
      'assets/map-objects/pile-iron.png', 'assets/map-objects/pile-essence.png',
    ]);
  });

  it('records four one-shot literal prompts, immutable hashes and accepted hard-alpha selections', () => {
    expect(job.generator).toBe('built-in-imagegen');
    expect(job.requests).toHaveLength(4);
    expect(provenance.selections).toHaveLength(4);
    expect(new Set(job.requests.map((request) => request.resource_id))).toEqual(new Set(resources));
    expect(new Set(job.requests.map((request) => request.output))).toHaveLength(4);
    expect(new Set(job.requests.map((request) => request.final))).toHaveLength(4);
    expect(new Set(job.requests.map((request) => request.prompt))).toHaveLength(4);
    expect(new Set(provenance.selections.map((selection) => selection.built_in_output)))
      .toHaveLength(4);
    expect(new Set(provenance.selections.map((selection) => selection.source_sha256)))
      .toHaveLength(4);
    expect(new Set(provenance.selections.map((selection) => selection.final_sha256)))
      .toHaveLength(4);
    expect(selections.batches['mine-sprites-built-in']).toEqual(resources.map((resource) => ({
      id: assetId.mapObject('mine', resource),
      candidate: `assets/sources/mines/${resource}-source.png`,
      target: `public/assets/mines/${resource}.png`,
    })));

    for (const request of job.requests) {
      const resource = request.resource_id as ResourceId;
      expect(request.candidates).toBe(1);
      expect(request.size).toEqual([64, 96]);
      expect(request.literal_subject).toBe(RESOURCE_MINE_SUBJECTS[resource]);
      for (const clause of [
        ...operations[resource], 'bright cartoony hand-pixelled storybook pixel art',
        'high-oblique non-isometric', 'screen lower-right/map south-east',
        'screen upper-left/map north-west', 'generous empty padding', 'no pole or flag',
      ]) expect(request.prompt, `${resource}: ${clause}`).toContain(clause);
      if (resource === 'essence') for (const excluded of [
        'generic crystals', 'gem cave', 'wizard tower', 'sci-fi machine',
      ]) expect(request.prompt).toContain(excluded);

      const selection = provenance.selections.find((candidate) =>
        candidate.resource_id === resource)!;
      expect(selection.accepted).toBe(true);
      expect(selection.discarded_outputs).toEqual([]);
      expect(selection.prompt_sha256).toBe(createHash('sha256')
        .update(request.prompt).digest('hex'));
      for (const [path, expected] of [
        [selection.source, selection.source_sha256], [selection.final, selection.final_sha256],
      ] as const) expect(createHash('sha256')
        .update(readFileSync(resolve(process.cwd(), path))).digest('hex')).toBe(expected);
      expect(selection.final_dimensions).toEqual([64, 96]);
      expect(selection.alpha.partial).toBe(0);
      expect(selection.alpha.transparent_corners).toBe(4);
      expect(selection.alpha.chroma_fringe_pixels).toBe(0);
      expect(selection.alpha.transparent + selection.alpha.opaque).toBe(64 * 96);
    }
  });

  it('keeps all four runtime renderings on the manifest while ownership and production stay data', () => {
    const state = createGame({ seed: 1506, p1: 'human', p2: 'dormant' });
    state.map = {
      ...state.map, width: 14, height: 8,
      terrain: Array.from({ length: 8 }, () => Array.from({ length: 14 }, () => tile('meadow'))),
      objects: resources.map((resource, index) => mine(resource, index)), roads: [], seams: [],
    };
    state.castles = [];
    state.mapEffects = [];
    const hero = state.players.p1.hero!;
    hero.position = { x: 0, y: 7 };
    state.players.p1.explored = state.map.terrain.flatMap((row, y) =>
      row.map((_cell, x) => `${x},${y}`));
    const html = renderToStaticMarkup(<AdventureMap state={state} hero={hero}
      reachable={new Set()} path={[]} movement={null} mapStep={0}
      onTile={() => undefined} onSelectHero={() => undefined}
      onMeetHero={() => undefined} onPreviewHero={() => undefined}
      onPreview={() => undefined} onPickup={() => undefined} />);
    for (const [index, resource] of resources.entries()) {
      const object = mine(resource, index);
      const entry = ASSET_MANIFEST[mapObjectSpriteId(object)];
      expect(html, resource).toContain(entry.file);
      expect(html, resource).toContain(mapObjectName(object));
      expect(object).toMatchObject({ resource, income: resource === 'gold' ? 1_000 : 1,
        owner: index % 2 ? 'p1' : null });
    }
    expect(html).toContain('owner-pennant p1');
  });

  it('uses the same four manifest variants in editor palette/canvas geometry and worklist', () => {
    const document = createBlankEditorMap({
      id: 'mine-art-review', name: 'Mine art review', width: 18, height: 12,
      terrain: 'meadow', skin: 'default',
    });
    const palette = renderToStaticMarkup(<EditorTerrainCanvas document={document}
      onDocumentChange={() => undefined} />);
    for (const resource of resources) {
      expect(palette).toContain(ASSET_MANIFEST[assetId.mapObject('mine', resource)].file);
      expect(palette).toContain(`aria-label="${resource[0].toUpperCase()}${resource.slice(1)} mine"`);
    }
    for (const [index, resource] of resources.entries()) {
      const object: EditorMapObject = {
        id: `editor-mine-${resource}`, kind: 'mine', position: { x: 2 + index * 3, y: 5 },
        footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 },
        properties: { ...defaultEditorStructureProperties('mine', { x: 0, y: 0 }),
          resource, income: resource === 'gold' ? 1_000 : 1, owner: null },
      };
      const id = mapObjectSpriteId(editorStructurePresentationObject(object));
      const entry = ASSET_MANIFEST[id];
      expect(id).toBe(assetId.mapObject('mine', resource));
      expect(editorStructureFootprint(object)).toEqual({ w: 2, h: 1 });
      expect(editorStructureEntrance(object)).toEqual({ dx: 0, dy: 0 });
      expect(editorPropCanvasGeometry(object.position, entry)).toEqual({
        x: object.position.x * 32, y: object.position.y * 32 - 64, width: 64, height: 96,
      });
      const work = assetWorklist().find((item) => item.id === id)!;
      expect(work).toMatchObject({ w: 64, h: 32, groundContact: true, ownable: true });
      expect(work.source).toContain(RESOURCE_MINE_SUBJECTS[resource]);
    }
  });
});
