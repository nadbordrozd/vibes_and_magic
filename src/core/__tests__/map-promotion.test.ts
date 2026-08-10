import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { promoteMapFile } from '../../../scripts/promoteMap';
import { createBuiltInMapRepository } from '../../content/maps/catalog';
import {
  convertEditorMapDocument, createBlankEditorMap, createDefaultEditorCastle,
  createDefaultEditorHero, createDefaultEditorPlayer, parseEditorMapDocument,
  serializeEditorMapDocument,
} from '../mapEditor';
import type { BuiltInMapId } from '../types';
import { portableCampaignPresentations } from '../../ui/campaignPresentation';
import { clonePortableBuiltInMapForEditor } from '../../ui/mapEditorLibrary';

function document() {
  const map = createBlankEditorMap({
    id: 'promotion-proof', name: 'Promotion Proof', author: 'Fixture Author',
    style: 'Repository fixture', width: 12, height: 8, terrain: 'meadow',
  });
  map.victory = {
    type: 'conquest', flavor: 'Prove the portable road.', mechanics: 'Defeat the rival.',
  };
  map.players = [
    createDefaultEditorPlayer('p1', 'hearthguard', 'human'),
    createDefaultEditorPlayer('p2', 'woundWrights', 'dormant'),
  ];
  map.castles = [
    createDefaultEditorCastle('proof-red', { x: 1, y: 1 }, 'p1', 'hearthguard'),
    createDefaultEditorCastle('proof-blue', { x: 8, y: 5 }, 'p2', 'woundWrights'),
  ];
  map.heroes = [
    createDefaultEditorHero('proof-hero', { x: 2, y: 2 }, 'p1', 'hearthguard', 'aldith'),
  ];
  return map;
}

describe('portable built-in promotion adapter', () => {
  it('promotes unchanged bytes through one registry entry and yields equivalent runtime setup', () => {
    const temp = mkdtempSync(join(tmpdir(), 'vam-promotion-'));
    const authored = join(temp, 'src/content/maps/authored');
    mkdirSync(authored, { recursive: true });
    writeFileSync(join(authored, 'index.ts'), [
      '// PROMOTED_MAP_IMPORTS',
      'export const BUILT_IN_PORTABLE_MAPS = [',
      '  // PROMOTED_MAP_ENTRIES',
      '] as const;',
    ].join('\n'));
    const source = join(temp, 'export.vam-map.json');
    const portable = document();
    writeFileSync(source, serializeEditorMapDocument(portable));

    const promoted = promoteMapFile(source, false, temp);
    expect(promoted).toMatchObject({ id: 'promotion-proof', checked: false });
    expect(readFileSync(join(authored, 'promotion-proof.vam-map.json'), 'utf8'))
      .toBe(readFileSync(source, 'utf8'));
    expect(readFileSync(join(authored, 'index.ts'), 'utf8')).toContain(
      "{ id: 'promotion-proof', document: authored_promotionProofMap }",
    );
    expect(promoteMapFile(source, true, temp).checked).toBe(true);
    expect(() => promoteMapFile(source, false, temp)).toThrow(/already exists/);

    const promotedDocument = parseEditorMapDocument(readFileSync(source, 'utf8')).document!;
    const repository = createBuiltInMapRepository([{
      id: promotedDocument.id, document: promotedDocument,
    }]);
    const resolved = repository.resolve(promotedDocument.id as BuiltInMapId, 81);
    const direct = convertEditorMapDocument(promotedDocument, 81);
    expect(resolved.map).toEqual({ ...direct.map, id: promotedDocument.id });
    expect(resolved.setup).toEqual(direct.setup);
    expect(portableCampaignPresentations([promotedDocument])).toEqual([expect.objectContaining({
      id: 'promotion-proof', name: 'Promotion Proof', style: 'Repository fixture',
    })]);
    const editorClone = clonePortableBuiltInMapForEditor(
      promotedDocument, 'promotion-proof-remix', 'Promotion Proof Remix',
    );
    expect(editorClone).toEqual({
      ...promotedDocument,
      id: 'promotion-proof-remix',
      revision: 1,
      metadata: { ...promotedDocument.metadata, name: 'Promotion Proof Remix' },
      source: { kind: 'builtIn', mapId: 'promotion-proof' },
    });
  });

  it('refuses noncanonical, incompatible, invalid, and duplicate legacy maps', () => {
    const temp = mkdtempSync(join(tmpdir(), 'vam-promotion-invalid-'));
    const authored = join(temp, 'src/content/maps/authored');
    mkdirSync(authored, { recursive: true });
    writeFileSync(join(authored, 'index.ts'), '// PROMOTED_MAP_IMPORTS\nexport const BUILT_IN_PORTABLE_MAPS = [\n  // PROMOTED_MAP_ENTRIES\n] as const;\n');
    const source = join(temp, 'invalid.vam-map.json');
    writeFileSync(source, serializeEditorMapDocument(document()).trim());
    expect(() => promoteMapFile(source, false, temp)).toThrow(/not the unchanged canonical output/);

    const duplicate = document();
    duplicate.id = 'border-marches';
    writeFileSync(source, serializeEditorMapDocument(duplicate));
    expect(() => promoteMapFile(source, false, temp)).toThrow(/already exists/);

    const incompatible = document();
    incompatible.compatibility.catalogHash = 'deadbeef';
    writeFileSync(source, serializeEditorMapDocument(incompatible));
    expect(() => promoteMapFile(source, false, temp)).toThrow(/catalog hash deadbeef/);

    const unplayable = document();
    unplayable.players = [];
    unplayable.castles = [];
    unplayable.heroes = [];
    writeFileSync(source, serializeEditorMapDocument(unplayable));
    expect(() => promoteMapFile(source, false, temp)).toThrow(/playable.active_player.required/);

    const unreachable = document();
    for (let y = 0; y < unreachable.dimensions.height; y += 1) {
      unreachable.tiles[y][6] = { terrain: 'mountain', skin: 'granite' };
    }
    writeFileSync(source, serializeEditorMapDocument(unreachable));
    expect(() => promoteMapFile(source, false, temp)).toThrow(/map-lint\.unreachable/);
  });
});
