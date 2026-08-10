import { useMemo } from 'react';
import { ASSET_MANIFEST, PIXEL_SCALE, assetId } from '../../../assets/manifest';
import type { AdventureShowcaseItem } from '../adventureShowcase';
import {
  ADVENTURE_SHOWCASE_CATEGORIES, adventureShowcaseInventory,
  createInteractionHierarchyFixture, createMountainTopologyFixture,
  decorationDensityFixtures, terrainSkinCoverage,
} from '../adventureShowcase';
import { TERRAIN, terrainId } from '../../content/terrain';
import { gameMapTerrainGrid } from '../terrainTransitions';
import { NativeTerrainSurface } from './NativeTerrainSurface';
import { painterOrder } from '../assets';

const TILE = 32 * PIXEL_SCALE;
const STAGE_WIDTH = 224;
const STAGE_HEIGHT = 208;
const ORIGIN_X = 72;
const ORIGIN_Y = 128;

function titleCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelFor(item: AdventureShowcaseItem): string {
  const parts = item.id.split(':');
  if (item.category === 'terrain') return parts[0] === 'terrain-field'
    ? `${titleCase(parts[1])} field` : `${TERRAIN[parts[1] as keyof typeof TERRAIN]?.label ?? titleCase(parts[1])} · ${parts.slice(2).join(' · ')}`;
  return parts.slice(1).map(titleCase).join(' · ');
}

function SpriteImage({ item, x, y }: { item: AdventureShowcaseItem; x: number; y: number }) {
  const { entry } = item;
  return <image className="showcase-sprite" href={entry.file}
    data-asset-id={item.id} data-native-width={entry.w} data-native-height={entry.h}
    data-anchor-x={entry.anchor.x} data-anchor-y={entry.anchor.y}
    x={x - entry.anchor.x} y={y - entry.anchor.y} width={entry.w} height={entry.h}
    preserveAspectRatio="none" />;
}

function GroundPattern() {
  const field = ASSET_MANIFEST[assetId.terrainField('meadow')];
  return <defs><pattern id="showcase-meadow" patternUnits="userSpaceOnUse"
    width={field.w} height={field.h}>
    <image href={field.file} width={field.w} height={field.h} preserveAspectRatio="none" />
  </pattern><pattern id="showcase-alpha" width="12" height="12" patternUnits="userSpaceOnUse">
    <rect width="12" height="12" fill="#1c211d" />
    <rect width="6" height="6" fill="#30362f" />
    <rect x="6" y="6" width="6" height="6" fill="#30362f" />
  </pattern></defs>;
}

function SpriteAuditCard({ item }: { item: AdventureShowcaseItem }) {
  const footprintW = item.w;
  const footprintH = item.h;
  const isTerrain = item.category === 'terrain';
  const isOverlay = item.category === 'overlay';
  const anchorX = isTerrain || isOverlay ? 96 : ORIGIN_X;
  const anchorY = isTerrain || isOverlay ? 72 : ORIGIN_Y;
  return <figure className="adventure-showcase-card" data-showcase-category={item.category}
    data-showcase-id={item.id} data-source={item.source}>
    <svg width={STAGE_WIDTH} height={STAGE_HEIGHT} viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
      aria-label={`${labelFor(item)} native sprite audit`}>
      <GroundPattern />
      <rect width={STAGE_WIDTH} height={STAGE_HEIGHT} fill={isTerrain ? 'url(#showcase-alpha)' : 'url(#showcase-meadow)'} />
      {item.groundContact && <rect className="showcase-footprint" x={anchorX} y={anchorY}
        width={footprintW} height={footprintH} />}
      {(isTerrain || isOverlay) && <rect className="showcase-footprint" x={anchorX} y={anchorY}
        width={32} height={32} />}
      <SpriteImage item={item} x={anchorX} y={anchorY} />
      <path className="showcase-anchor" d={`M${anchorX - 5} ${anchorY}H${anchorX + 5}M${anchorX} ${anchorY - 5}V${anchorY + 5}`} />
      {item.ownable && item.entry.flagAnchor && <circle className="showcase-flag-anchor"
        cx={anchorX + item.entry.flagAnchor.x - item.entry.anchor.x}
        cy={anchorY + item.entry.flagAnchor.y - item.entry.anchor.y} r="3" />}
    </svg>
    <figcaption><strong>{labelFor(item)}</strong><code>{item.id}</code>
      <span>{item.entry.w}×{item.entry.h} · anchor {item.entry.anchor.x},{item.entry.anchor.y}
        {item.groundContact ? ` · contact ${footprintW}×${footprintH}` : ''}</span></figcaption>
  </figure>;
}

function TerrainSkinStudy() {
  const coverage = terrainSkinCoverage();
  return <section className="showcase-section terrain-skin-study" data-showcase-section="terrain-skins">
    <header><div className="kicker">Executable terrain catalog</div><h2>Every gameplay terrain and skin</h2>
      <p>Each card uses the production terrain adapter at 32×32 native pixels. Shared visual material is explicit: skins never change mechanics.</p></header>
    <div className="terrain-skin-grid">{coverage.map(({ terrain, skin, label, grid }) => <figure
      key={`${terrain}:${skin}`} data-terrain={terrain} data-skin={skin}>
      <svg width={96} height={96} viewBox="0 0 96 96" aria-label={`${label} native terrain field`}>
        <NativeTerrainSurface grid={gameMapTerrainGrid({ terrain: grid })} />
      </svg><figcaption>{label}</figcaption></figure>)}</div>
  </section>;
}

function MountainStudy() {
  const fixture = useMemo(createMountainTopologyFixture, []);
  const grid = gameMapTerrainGrid(fixture.map);
  const pieces = painterOrder(fixture.pieces.map((piece) => ({
    ...piece, row: piece.position.y, col: piece.position.x,
  })));
  return <section className="showcase-section mountain-topology-study" data-showcase-section="mountains">
    <header><div className="kicker">Production mountain compositor</div><h2>Runs, corners, branches, blobs, bottlenecks and boundaries</h2>
      <p>The fixture authors only impassable mountain cells. Every visible piece and variant is selected by <code>deriveMountainRanges</code>.</p></header>
    <div className="showcase-map-scroll"><svg className="showcase-native-map"
      width={fixture.map.width * TILE} height={fixture.map.height * TILE}
      viewBox={`0 0 ${fixture.map.width * TILE} ${fixture.map.height * TILE}`}
      data-piece-count={pieces.length}>
      <NativeTerrainSurface grid={grid} />
      {pieces.map((piece) => {
        const id = assetId.decoration('mountain', piece.variant);
        const entry = ASSET_MANIFEST[id];
        return <image key={piece.key} className="showcase-sprite mountain-showcase-piece"
          href={entry.file} data-asset-id={id} data-native-width={entry.w}
          data-native-height={entry.h} data-anchor-x={entry.anchor.x}
          data-anchor-y={entry.anchor.y} data-painter-row={piece.row} data-painter-col={piece.col}
          x={piece.position.x * TILE - entry.anchor.x}
          y={piece.position.y * TILE - entry.anchor.y} width={entry.w} height={entry.h} />;
      })}
      {fixture.labels.map((label) => <g key={label.name} className="showcase-topology-label">
        <rect x={label.x * TILE} y={label.y * TILE} width={label.w * TILE} height={label.h * TILE} />
        <text x={(label.x + 0.3) * TILE} y={(label.y + 0.7) * TILE}>{label.name}</text>
      </g>)}
    </svg></div>
  </section>;
}

function DecorationStudy() {
  const fixtures = useMemo(decorationDensityFixtures, []);
  return <section className="showcase-section decoration-density-study" data-showcase-section="decorations">
    <header><div className="kicker">Seeded presentation catalog</div><h2>Decorations at shipped densities</h2>
      <p>Standard maps use 4%; the large showcase map uses 1.5%. Each field is produced by <code>deriveTerrainDecorations</code>, not placed by the review.</p></header>
    <div className="decoration-fixture-grid">{fixtures.map((fixture) => {
      const terrain = terrainId(fixture.map.terrain[0][0]);
      const skin = typeof fixture.map.terrain[0][0] === 'object' ? fixture.map.terrain[0][0].skin : undefined;
      const grid = gameMapTerrainGrid(fixture.map);
      return <figure key={`${terrain}:${fixture.density}`} data-terrain={terrain}
        data-density={fixture.density} data-decoration-count={fixture.decorations.length}>
        <figcaption><strong>{TERRAIN[terrain].label}</strong> · {Math.round(fixture.density * 1000) / 10}% · {fixture.decorations.length} placements</figcaption>
        <div className="showcase-map-scroll"><svg className="showcase-native-map"
          width={fixture.map.width * TILE} height={fixture.map.height * TILE}
          viewBox={`0 0 ${fixture.map.width * TILE} ${fixture.map.height * TILE}`}>
          <NativeTerrainSurface grid={grid} />
          {fixture.decorations.map((decoration) => {
            const id = assetId.decoration(terrain, decoration.kind);
            const entry = ASSET_MANIFEST[id];
            return <image key={decoration.id} className="showcase-sprite decoration-showcase-piece"
              href={entry.file} data-asset-id={id} data-native-width={entry.w}
              data-native-height={entry.h} data-anchor-x={entry.anchor.x}
              data-anchor-y={entry.anchor.y} data-skin={skin}
              x={decoration.position.x * TILE - entry.anchor.x}
              y={decoration.position.y * TILE - entry.anchor.y}
              width={entry.w} height={entry.h} />;
          })}
        </svg></div>
      </figure>;
    })}</div>
  </section>;
}

function InteractionHierarchyStudy() {
  const fixture = useMemo(createInteractionHierarchyFixture, []);
  const grid = gameMapTerrainGrid(fixture.map);
  const items = painterOrder([
    ...fixture.decorations.map((decoration) => ({
      key: `decoration:${decoration.id}`, row: decoration.position.y,
      col: decoration.position.x, kind: 'decoration' as const, decoration,
    })),
    ...fixture.items.map((item) => ({
      key: `item:${item.id}`, row: item.position.y + item.h / TILE - 1,
      col: item.position.x, kind: 'item' as const, item,
    })),
  ]);
  return <section className="showcase-section interaction-hierarchy-study"
    data-showcase-section="interaction-hierarchy">
    <header><div className="kicker">Unlabelled first-read stress surface</div>
      <h2>Every structure and interactable among ordinary decoration density</h2>
      <p>All object, castle, guardian, and one-per-faction hero presentations are laid out from sorted worklist data. The shipped 4% micro-decoration field is independently derived and everything is painter-sorted by ground contact.</p></header>
    <div className="showcase-map-scroll"><svg className="showcase-native-map"
      width={fixture.map.width * TILE} height={fixture.map.height * TILE}
      viewBox={`0 0 ${fixture.map.width * TILE} ${fixture.map.height * TILE}`}
      data-context-item-count={fixture.items.length}
      data-context-decoration-count={fixture.decorations.length}>
      <NativeTerrainSurface grid={grid} />
      {items.map((placed) => {
        if (placed.kind === 'decoration') {
          const terrain = terrainId(fixture.map.terrain[placed.decoration.position.y][placed.decoration.position.x]);
          const id = assetId.decoration(terrain, placed.decoration.kind);
          const entry = ASSET_MANIFEST[id];
          return <image key={placed.key} className="showcase-sprite context-decoration"
            href={entry.file} data-asset-id={id} data-native-width={entry.w}
            data-native-height={entry.h} data-anchor-x={entry.anchor.x}
            data-anchor-y={entry.anchor.y} data-painter-row={placed.row} data-painter-col={placed.col}
            x={placed.decoration.position.x * TILE - entry.anchor.x}
            y={placed.decoration.position.y * TILE - entry.anchor.y}
            width={entry.w} height={entry.h} />;
        }
        const { item } = placed;
        return <image key={placed.key} className="showcase-sprite context-interactable"
          href={item.entry.file} data-asset-id={item.id} data-native-width={item.entry.w}
          data-native-height={item.entry.h} data-anchor-x={item.entry.anchor.x}
          data-anchor-y={item.entry.anchor.y} data-painter-row={placed.row} data-painter-col={placed.col}
          x={item.position.x * TILE - item.entry.anchor.x}
          y={item.position.y * TILE - item.entry.anchor.y}
          width={item.entry.w} height={item.entry.h} />;
      })}
    </svg></div>
  </section>;
}

export function AdventureVisualShowcase() {
  const inventory = useMemo(adventureShowcaseInventory, []);
  const counts = Object.fromEntries(ADVENTURE_SHOWCASE_CATEGORIES.map((category) => [
    category, inventory.filter((item) => item.category === category).length,
  ]));
  return <main className="adventure-showcase-shell" data-ready="true"
    data-inventory-count={inventory.length}>
    <header className="adventure-showcase-header"><div>
      <div className="kicker">Native adventure-map visual acceptance</div>
      <h1>Adventure visual showcase</h1>
      <p>Catalog-derived coverage, production terrain and mountain composition, native sprite geometry, and shipped decoration densities.</p>
    </div><a href="./">Back to game</a></header>
    <nav className="showcase-summary" aria-label="Adventure showcase coverage">
      {ADVENTURE_SHOWCASE_CATEGORIES.map((category) => <span key={category}>
        <b>{counts[category]}</b> {titleCase(category)}</span>)}
    </nav>
    <TerrainSkinStudy />
    <MountainStudy />
    <DecorationStudy />
    <InteractionHierarchyStudy />
    {ADVENTURE_SHOWCASE_CATEGORIES.map((category) => <section key={category}
      className="showcase-section showcase-asset-section" data-showcase-section={category}>
      <header><div className="kicker">Manifest-backed native atlas</div>
        <h2>{titleCase(category)} · {counts[category]}</h2>
        <p>Blue outlines show gameplay contact or the native tile. Gold crosses show renderer anchors; magenta dots show required ownership-flag anchors.</p></header>
      <div className="adventure-showcase-atlas">{inventory.filter((item) => item.category === category)
        .map((item) => <SpriteAuditCard key={item.id} item={item} />)}</div>
    </section>)}
  </main>;
}
