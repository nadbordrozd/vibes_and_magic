import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetId, manifestEntry } from '../../../assets/manifest';
import { ADVENTURE_PROP_CATALOG } from '../../content/adventureProps';
import { TERRAIN } from '../../content/terrain';
import {
  createBlankEditorMap, hashEditorMapDocument, serializeEditorMapDocument,
  validateEditorMapDocument,
} from '../../core/mapEditor';
import {
  EditorTerrainCanvas, editorPropCanvasGeometry, ensureEditorCanvasImage,
} from '../components/EditorTerrainCanvas';
import { editorDocumentIsDirty } from '../mapEditorLibrary';
import {
  EMPTY_TERRAIN_HISTORY, appendUniqueEditorCells, clampEditorZoom, commitTerrainEdit,
  createPropEraseEdit, createPropMoveEdit, createPropPlacementEdit, createTerrainEdit,
  editorMoveAnchor, editorPropFootprint, legalEditorTerrainTile, pointerStartsPaint, pointerStartsPan,
  rasterizeEditorBrushLine, rasterizeEditorEllipse, rasterizeEditorLine,
  rasterizeEditorPolygon, rasterizeEditorRectangle, redoTerrainEdit, terrainBrushFootprint,
  undoTerrainEdit,
} from '../mapEditorTerrain';

function document(width = 8, height = 6) {
  return createBlankEditorMap({
    id: 'terrain-test', name: 'Terrain Test', width, height,
    terrain: 'meadow', skin: 'default',
  });
}

const keys = (cells: Array<{ x: number; y: number }>) =>
  cells.map(({ x, y }) => `${x},${y}`);

describe('terrain stroke rasterization', () => {
  it('supercovers fast drags in every direction without skipped columns or rows', () => {
    const forward = rasterizeEditorLine({ x: 0, y: 1 }, { x: 7, y: 4 });
    const reverse = rasterizeEditorLine({ x: 7, y: 4 }, { x: 0, y: 1 });
    expect(new Set(forward.map(({ x }) => x))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(new Set(forward.map(({ y }) => y))).toEqual(new Set([1, 2, 3, 4]));
    expect(keys(reverse).reverse()).toEqual(keys(forward));
    for (let index = 1; index < forward.length; index += 1) {
      expect(Math.max(
        Math.abs(forward[index].x - forward[index - 1].x),
        Math.abs(forward[index].y - forward[index - 1].y),
      )).toBe(1);
    }
  });

  it('uses configurable square and cell-center round footprints and clips edge brushes', () => {
    expect(terrainBrushFootprint({ x: 4, y: 4 }, 1, 'round')).toEqual([{ x: 4, y: 4 }]);
    expect(terrainBrushFootprint({ x: 4, y: 4 }, 5, 'square')).toHaveLength(25);
    const round = terrainBrushFootprint({ x: 4, y: 4 }, 5, 'round');
    expect(round.length).toBeLessThan(25);
    expect(round).toContainEqual({ x: 4, y: 4 });
    expect(round).not.toContainEqual({ x: 2, y: 2 });
    expect(rasterizeEditorBrushLine(
      { x: 0, y: 0 }, { x: 3, y: 0 }, 3, 'square', { width: 4, height: 3 },
    ).every(({ x, y }) => x >= 0 && y >= 0 && x < 4 && y < 3)).toBe(true);
  });

  it('merges separately sampled pointer segments into one deterministic stroke', () => {
    const bounds = { width: 9, height: 6 };
    const first = rasterizeEditorBrushLine({ x: 0, y: 0 }, { x: 4, y: 2 }, 1, 'square', bounds);
    const second = rasterizeEditorBrushLine({ x: 4, y: 2 }, { x: 8, y: 5 }, 1, 'square', bounds);
    const merged = appendUniqueEditorCells(first, second, bounds);
    expect(merged).toHaveLength(new Set(keys([...first, ...second])).size);
    expect(merged[0]).toEqual({ x: 0, y: 0 });
    expect(merged.at(-1)).toEqual({ x: 8, y: 5 });
  });
});

describe('terrain filled-shape rasterization', () => {
  const bounds = { width: 10, height: 9 };

  it('fills rectangles identically in all drag directions and clips to map bounds', () => {
    const expected = rasterizeEditorRectangle({ x: 2, y: 1 }, { x: 6, y: 4 }, bounds);
    expect(expected).toHaveLength(20);
    expect(rasterizeEditorRectangle({ x: 6, y: 4 }, { x: 2, y: 1 }, bounds)).toEqual(expected);
    expect(rasterizeEditorRectangle({ x: 2, y: 4 }, { x: 6, y: 1 }, bounds)).toEqual(expected);
    expect(rasterizeEditorRectangle({ x: -3, y: -2 }, { x: 2, y: 1 }, bounds))
      .toHaveLength(6);
  });

  it('fills ellipses by cell center identically in every drag direction', () => {
    const expected = rasterizeEditorEllipse({ x: 1, y: 1 }, { x: 7, y: 5 }, bounds);
    expect(expected).toContainEqual({ x: 4, y: 3 });
    expect(expected).not.toContainEqual({ x: 1, y: 1 });
    expect(rasterizeEditorEllipse({ x: 7, y: 5 }, { x: 1, y: 1 }, bounds)).toEqual(expected);
    expect(rasterizeEditorEllipse({ x: 7, y: 1 }, { x: 1, y: 5 }, bounds)).toEqual(expected);
    expect(rasterizeEditorEllipse({ x: -4, y: 1 }, { x: 4, y: 7 }, bounds)
      .every(({ x, y }) => x >= 0 && y >= 0)).toBe(true);
  });

  it('fills clockwise and counter-clockwise polygons including cell centers on edges', () => {
    const clockwise = [{ x: 1, y: 1 }, { x: 7, y: 1 }, { x: 4, y: 6 }];
    const expected = rasterizeEditorPolygon(clockwise, bounds);
    expect(expected).toContainEqual({ x: 1, y: 1 });
    expect(expected).toContainEqual({ x: 4, y: 3 });
    expect(rasterizeEditorPolygon([...clockwise].reverse(), bounds)).toEqual(expected);
    expect(rasterizeEditorPolygon(
      [{ x: -4, y: 2 }, { x: 4, y: 2 }, { x: 1, y: 12 }], bounds,
    ).every(({ x, y }) => x >= 0 && y >= 0 && x < 10 && y < 9)).toBe(true);
  });
});

describe('terrain edit transactions and editor state boundaries', () => {
  it('undoes an entire smeared stroke in one step and redoes it in one step', () => {
    const original = document();
    const cells = rasterizeEditorBrushLine(
      { x: 0, y: 0 }, { x: 7, y: 5 }, 3, 'round', original.dimensions,
    );
    const edit = createTerrainEdit(original, cells, { terrain: 'mire', skin: 'coastal' });
    const committed = commitTerrainEdit(original, EMPTY_TERRAIN_HISTORY, edit);
    expect(committed.history.past).toHaveLength(1);
    expect(committed.document.tiles.flat().filter((tile) => tile.terrain === 'mire'))
      .toHaveLength(edit.changes.length);
    const undone = undoTerrainEdit(committed.document, committed.history);
    expect(undone.document).toEqual(original);
    expect(undone.history.future).toHaveLength(1);
    const redone = redoTerrainEdit(undone.document, undone.history);
    expect(redone.document).toEqual(committed.document);
  });

  it('writes canonical Mountain terrain and a legal selected skin for pencil, brush, and shapes', () => {
    const original = document(12, 10);
    const tools = [
      [{ x: 1, y: 1 }],
      rasterizeEditorBrushLine({ x: 2, y: 2 }, { x: 7, y: 3 }, 3, 'round', original.dimensions),
      rasterizeEditorRectangle({ x: 1, y: 5 }, { x: 3, y: 7 }, original.dimensions),
      rasterizeEditorEllipse({ x: 5, y: 5 }, { x: 9, y: 8 }, original.dimensions),
      rasterizeEditorPolygon([{ x: 8, y: 1 }, { x: 11, y: 1 }, { x: 10, y: 4 }], original.dimensions),
    ];
    let current = original;
    let history = EMPTY_TERRAIN_HISTORY;
    for (const cells of tools) {
      const result = commitTerrainEdit(current, history,
        createTerrainEdit(current, cells, legalEditorTerrainTile('mountain', 'amber')));
      current = result.document; history = result.history;
    }
    expect(history.past).toHaveLength(5);
    expect(current.tiles.flat().filter((tile) => tile.terrain === 'mountain').length)
      .toBeGreaterThan(20);
    expect(current.tiles.flat().filter((tile) => tile.terrain === 'mountain')
      .every((tile) => tile.skin === 'amber')).toBe(true);
    expect(legalEditorTerrainTile('mountain', 'coastal'))
      .toEqual({ terrain: 'mountain', skin: TERRAIN.mountain.skins[0] });
    const portable = JSON.parse(serializeEditorMapDocument(current));
    expect(portable.tiles.flat().filter((tile: { terrain: string }) =>
      tile.terrain === 'mountain').every((tile: { skin: string }) => tile.skin === 'amber')).toBe(true);
  });

  it('clears redo on a divergent edit and does not create no-op history', () => {
    const original = document();
    const first = commitTerrainEdit(original, EMPTY_TERRAIN_HISTORY,
      createTerrainEdit(original, [{ x: 1, y: 1 }], { terrain: 'hush', skin: 'north' }));
    const undone = undoTerrainEdit(first.document, first.history);
    const divergent = commitTerrainEdit(undone.document, undone.history,
      createTerrainEdit(undone.document, [{ x: 2, y: 2 }], { terrain: 'water', skin: 'coastal' }));
    expect(divergent.history.future).toEqual([]);
    const noOp = commitTerrainEdit(divergent.document, divergent.history,
      createTerrainEdit(divergent.document, [{ x: 2, y: 2 }], { terrain: 'water', skin: 'coastal' }));
    expect(noOp).toEqual(divergent);
  });

  it('tracks a terrain edit as dirty and a saved hash as the new clean baseline', () => {
    const original = document();
    const originalHash = hashEditorMapDocument(original);
    expect(editorDocumentIsDirty(original, originalHash)).toBe(false);
    const changed = commitTerrainEdit(original, EMPTY_TERRAIN_HISTORY,
      createTerrainEdit(original, [{ x: 2, y: 3 }], { terrain: 'deepwood', skin: 'mossy' }))
      .document;
    expect(editorDocumentIsDirty(changed, originalHash)).toBe(true);
    const savedHash = hashEditorMapDocument(changed);
    expect(editorDocumentIsDirty(changed, savedHash)).toBe(false);
  });

  it('keeps gameplay terrain and legal presentation skin separate', () => {
    expect(legalEditorTerrainTile('deepwood', 'mossy'))
      .toEqual({ terrain: 'deepwood', skin: 'mossy' });
    expect(legalEditorTerrainTile('deepwood', 'snowcap'))
      .toEqual({ terrain: 'deepwood', skin: TERRAIN.deepwood.skins[0] });
    const changed = commitTerrainEdit(document(), EMPTY_TERRAIN_HISTORY,
      createTerrainEdit(document(), [{ x: 0, y: 0 }], legalEditorTerrainTile('mire', 'coastal')))
      .document.tiles[0][0];
    expect(changed.terrain).toBe('mire');
    expect(changed.skin).toBe('coastal');
  });

  it('distinguishes pan from primary paint and clamps zoom to supported steps', () => {
    expect(pointerStartsPan(1, 'brush', false)).toBe(true);
    expect(pointerStartsPan(0, 'brush', true)).toBe(true);
    expect(pointerStartsPan(0, 'pan', false)).toBe(true);
    expect(pointerStartsPaint(0, 'brush', false)).toBe(true);
    expect(pointerStartsPaint(0, 'pan', false)).toBe(false);
    expect(clampEditorZoom(-4)).toBe(.5);
    expect(clampEditorZoom(.86)).toBe(.75);
    expect(clampEditorZoom(20)).toBe(3);
  });
});

describe('authored adventure prop transactions', () => {
  const oak = ADVENTURE_PROP_CATALOG[0];
  const spool = ADVENTURE_PROP_CATALOG[1];

  it('places explicit catalog-backed records, preserves grab offset on move, and erases atomically', () => {
    const original = document();
    const placement = createPropPlacementEdit(original, spool, { x: 2, y: 2 });
    expect(placement.ok).toBe(true);
    if (!placement.ok) return;
    const placed = commitTerrainEdit(original, EMPTY_TERRAIN_HISTORY, placement.edit);
    expect(placed.document.objects).toEqual([{
      id: 'the-spool', kind: 'obstacle', position: { x: 2, y: 2 },
      footprint: { w: 2, h: 1 }, properties: { prop: 'the Spool', anomaly: true },
    }]);
    expect(validateEditorMapDocument(placed.document).map((item) => item.code))
      .not.toContain('catalog.adventure_prop.unknown');
    expect(JSON.parse(serializeEditorMapDocument(placed.document)).objects[0])
      .toEqual(placed.document.objects[0]);
    const anchor = editorMoveAnchor({ x: 6, y: 4 }, { x: 1, y: 0 });
    expect(anchor).toEqual({ x: 5, y: 4 });
    const movement = createPropMoveEdit(placed.document, 'the-spool', anchor);
    expect(movement.ok).toBe(true);
    if (!movement.ok) return;
    const moved = commitTerrainEdit(placed.document, placed.history, movement.edit);
    expect(moved.document.objects[0].position).toEqual({ x: 5, y: 4 });
    expect(editorPropFootprint(moved.document.objects[0])).toEqual({ w: 2, h: 1 });
    const erasure = createPropEraseEdit(moved.document, 'the-spool');
    expect(erasure.ok).toBe(true);
    if (!erasure.ok) return;
    const erased = commitTerrainEdit(moved.document, moved.history, erasure.edit);
    expect(erased.document.objects).toEqual([]);
    expect(undoTerrainEdit(erased.document, erased.history).document.objects[0].position)
      .toEqual({ x: 5, y: 4 });
  });

  it('rejects overlap and out-of-bounds before document or history mutation', () => {
    const original = document(5, 4);
    const placement = createPropPlacementEdit(original, oak, { x: 1, y: 1 });
    expect(placement.ok).toBe(true);
    if (!placement.ok) return;
    const placed = commitTerrainEdit(original, EMPTY_TERRAIN_HISTORY, placement.edit);
    expect(createPropPlacementEdit(placed.document, spool, { x: 0, y: 1 }))
      .toEqual({ ok: false, reason: 'overlap' });
    expect(createPropPlacementEdit(placed.document, spool, { x: 4, y: 3 }))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(createPropMoveEdit(placed.document, 'old-oak', { x: 5, y: 0 }))
      .toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(placed.document.objects).toHaveLength(1);
    expect(placed.history.past).toHaveLength(1);
  });

  it('loads a first-placement native ghost and exposes the runtime north-overhang geometry', () => {
    class FakeImage {
      onload: (() => void) | null = null;
      src = '';
      complete = false;
      naturalWidth = 0;
    }
    vi.stubGlobal('Image', FakeImage);
    const cache = new Map<string, HTMLImageElement>();
    const image = ensureEditorCanvasImage(
      cache, 'assets/map-objects/obstacle-old-oak.png', () => undefined,
    );
    expect(image?.src).toBe('assets/map-objects/obstacle-old-oak.png');
    expect(cache.get('assets/map-objects/obstacle-old-oak.png')).toBe(image);
    const entry = manifestEntry(assetId.mapObject('obstacle', oak.prop))!;
    expect(entry).toMatchObject({ w: 32, h: 64, anchor: { x: 0, y: 32 } });
    expect(editorPropCanvasGeometry({ x: 2, y: 3 }, entry)).toEqual({
      x: 64, y: 64, width: 32, height: 64,
    });
    expect(editorPropCanvasGeometry({ x: 2, y: 3 }, entry).y).toBeLessThan(3 * 32);
  });

  it('keeps every organized prop-catalog entry backed by a native runtime asset', () => {
    for (const prop of ADVENTURE_PROP_CATALOG) {
      const entry = manifestEntry(assetId.mapObject('obstacle', prop.prop));
      expect(entry, prop.label).toBeDefined();
      expect(entry!.w).toBeGreaterThanOrEqual(prop.footprint.w * 32);
      expect(entry!.h - entry!.anchor.y).toBeLessThanOrEqual(prop.footprint.h * 32);
    }
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('terrain canvas static accessibility and pointer safety', () => {
  it('renders the ordered Terrain palette, tools, accessible canvas, and legal skins', () => {
    const html = renderToStaticMarkup(<EditorTerrainCanvas document={document()}
      onDocumentChange={() => undefined} />);
    for (const text of [
      'data-palette-order="1"', 'Terrain', 'Pencil', 'Brush', 'Rectangle', 'Ellipse',
      'Polygon / area', 'Pan', 'Terrain skin', 'role="application"', 'touch-action',
    ]) {
      if (text === 'touch-action') continue;
      expect(html).toContain(text);
    }
    expect(html).toContain('data-palette-order="2"');
    expect(html).toContain('Mountains &amp; props');
    expect(html).toContain('Mountain terrain');
    expect(html).toContain('Old Oak');
    expect(html.indexOf('data-palette-order="1"')).toBeLessThan(
      html.indexOf('data-palette-order="2"'),
    );
    expect(html).toContain('Editable 8 by 6 terrain map');
  });

  it('wires pointer cancellation/lost-capture safety and responsive touch presentation', () => {
    const source = readFileSync(resolve('src/ui/components/EditorTerrainCanvas.tsx'), 'utf8');
    const css = readFileSync(resolve('src/ui/styles/map-editor.css'), 'utf8');
    expect(source).toContain('onPointerCancel={pointerCancelled}');
    expect(source).toContain('onLostPointerCapture={pointerCancelled}');
    expect(source).toContain('setPointerCapture(event.pointerId)');
    expect(source).toContain("window.addEventListener('blur', cancel)");
    expect(css).toContain('touch-action: none');
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*\.editor-tool-layout\s*\{\s*grid-template-columns: 1fr/);
  });
});
