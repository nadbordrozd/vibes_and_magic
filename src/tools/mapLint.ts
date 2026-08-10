import { pathToFileURL } from 'node:url';
import { createBorderMarches } from '../content/maps/borderMarches';
import {
  createCrosstitch, CROSSTITCH_CASTLE_POSITIONS,
} from '../content/maps/crosstitch';
import { createTornSound, TORN_SOUND_CASTLE_POSITIONS } from '../content/maps/tornSound';
import {
  createManywhere, MANYWHERE_CASTLE_POSITIONS, MANYWHERE_NEUTRAL_TOWNS,
} from '../content/maps/manywhere';
import {
  createGrandMuster, GRAND_MUSTER_CASTLES, GRAND_MUSTER_ENEMY_CASTLE,
} from '../content/maps/grandMuster';
import {
  createCrookedCrown, CROOKED_CROWN_GATE_IDS, CROOKED_CROWN_REWARD_IDS,
  CROOKED_CROWN_STARTS, crookedCrownMetrics,
} from '../content/maps/crookedCrown';
import {
  createSixfoldTrial, SIXFOLD_GUARDIAN_BANDS, SIXFOLD_PLAYER_SETUP, sixfoldMetrics,
} from '../content/maps/sixfoldTrial';
import { MAP_OBJECT_KINDS } from '../content/mapObjectRegistry';
import { TERRAIN } from '../content/terrain';
import type { Coord, GameMap } from '../core/types';
import { coordKey, findPath, inBounds, sameCoord } from '../core/map/pathfinding';
import {
  footprintTiles, guardianAggroTiles, objectEntrance, objectEntranceTile,
  objectFootprint, objectFootprintTiles,
} from '../core/map/occupancy';
import { terrainIdAt, tile } from '../content/terrain';

export interface MapLintIssue { mapId: string; code: string; message: string }

export function lintMap(map: GameMap, starts: Coord[]): MapLintIssue[] {
  const issues: MapLintIssue[] = [];
  const report = (code: string, message: string) => issues.push({ mapId: map.id, code, message });
  const owners = new Map<string, string>();
  const waterKinds = new Set([
    'boat', 'manaSpring', 'flotsam', 'sealedCask', 'castaway', 'messageBottle', 'whirlpool',
    'shipwreck', 'drownedBell', 'sirenRocks', 'lighthouse', 'guardian',
  ]);
  if (map.id === 'manywhere') {
    const present = new Set(map.objects.map((object) => object.kind));
    MAP_OBJECT_KINDS.forEach((kind) => {
      if (!present.has(kind)) report('registry-coverage', `Manywhere is missing ${kind}`);
    });
    const caches = map.objects.filter((object) => object.kind === 'cache');
    const stones = map.objects.filter((object) => object.kind === 'patientStone');
    if (caches.length !== 1 || stones.length < 3 || stones.length > 6
        || stones.some((stone) => !caches.some((cache) => cache.id === stone.cacheId))) {
      report('cache-consistency', 'Manywhere needs one Cache and 3–6 linked Patient Stones');
    }
  }
  for (const object of map.objects) {
    const footprint = objectFootprint(object);
    const entrance = objectEntrance(object);
    if (entrance.dx < 0 || entrance.dy < 0
        || entrance.dx >= footprint.w || entrance.dy >= footprint.h) {
      report('entrance', `${object.id} entrance is outside its footprint`);
    }
    for (const tile of objectFootprintTiles(object)) {
      if (!inBounds(map, tile)) {
        report('bounds', `${object.id} footprint leaves the map at ${coordKey(tile)}`);
        continue;
      }
      if (object.kind !== 'bridge' && (terrainIdAt(map, tile) === 'mountain'
          || (terrainIdAt(map, tile) === 'water' && !waterKinds.has(object.kind)))) {
        report('terrain', `${object.id} footprint covers impassable ${coordKey(tile)}`);
      }
      const prior = owners.get(coordKey(tile));
      if (prior) report('overlap', `${prior} overlaps ${object.id} at ${coordKey(tile)}`);
      else owners.set(coordKey(tile), object.id);
    }
    if ('guard' in object && object.guard) {
      report('embedded-guard', `${object.id} still embeds guardian data`);
    }
  }

  const castleOwners = new Map<string, string>();
  starts.forEach((entrance, index) => {
    const anchor = { x: entrance.x - 1, y: entrance.y - 1 };
    for (const tile of footprintTiles(anchor, { w: 3, h: 2 })) {
      if (!inBounds(map, tile)) report('castle-bounds', `castle ${index + 1} leaves the map`);
      const object = owners.get(coordKey(tile));
      if (object) report('castle-overlap', `castle ${index + 1} overlaps ${object} at ${coordKey(tile)}`);
      const prior = castleOwners.get(coordKey(tile));
      if (prior) report('castle-overlap', `${prior} overlaps castle ${index + 1}`);
      castleOwners.set(coordKey(tile), `castle ${index + 1}`);
    }
  });

  const guardians = map.objects.filter((object) => object.kind === 'guardian');
  for (const guardian of guardians) {
    const protectedObject = guardian.protects
      ? map.objects.find((object) => object.id === guardian.protects) : undefined;
    if (!protectedObject) report('guard-target', `${guardian.id} has no protected target`);
    else if (!protectedObject.guardedBy?.includes(guardian.id)) {
      report('guard-link', `${guardian.id} is not linked back from ${protectedObject.id}`);
    }
    for (const start of starts) if (guardianAggroTiles(guardian, map).some((tile) =>
      sameCoord(tile, start))) report('start-aggro', `${guardian.id} covers start ${coordKey(start)}`);
  }

  const unavailable = new Set<string>();
  for (const object of map.objects) {
    const entrance = objectEntranceTile(object);
    objectFootprintTiles(object).forEach((tile) => {
      if (object.kind === 'guardian' || object.kind === 'obstacle' || !sameCoord(tile, entrance)) {
        unavailable.add(coordKey(tile));
      }
    });
  }
  starts.forEach((entrance) => footprintTiles(
    { x: entrance.x - 1, y: entrance.y - 1 }, { w: 3, h: 2 },
  ).forEach((tile) => { if (!sameCoord(tile, entrance)) unavailable.add(coordKey(tile)); }));

  for (const protectedObject of map.objects.filter((object) => object.guardedBy?.length)) {
    const linked = protectedObject.guardedBy!.map((id) => guardians.find((guard) => guard.id === id));
    linked.forEach((guardian, index) => {
      if (!guardian) report('guard-target',
        `${protectedObject.id} references missing guardian ${protectedObject.guardedBy![index]}`);
      else if (guardian.protects !== protectedObject.id) report('guard-link',
        `${guardian.id} protects ${guardian.protects ?? 'nothing'}, not ${protectedObject.id}`);
    });
    const entry = objectEntranceTile(protectedObject);
    const pickup = ['pile', 'item', 'chest', 'flotsam', 'sealedCask', 'castaway',
      'messageBottle'].includes(protectedObject.kind);
    const approaches = pickup ? Array.from({ length: 3 }, (_, row) =>
      Array.from({ length: 3 }, (_, col) => ({
        x: entry.x + col - 1, y: entry.y + row - 1,
      }))).flat() : [entry];
    const aggro = linked.flatMap((guardian) => guardian ? guardianAggroTiles(guardian, map) : []);
    const enterable = approaches.filter((tile) => inBounds(map, tile)
      && terrainIdAt(map, tile) !== 'mountain'
      && (terrainIdAt(map, tile) !== 'water'
        || terrainIdAt(map, entry) === 'water')
      && (!unavailable.has(coordKey(tile)) || sameCoord(tile, entry)));
    const exposed = enterable.filter((tile) => !aggro.some((zone) => sameCoord(zone, tile)));
    if (exposed.length) report('guard-efficacy',
      `${protectedObject.id} is exposed from ${exposed.map(coordKey).join(' ')}`);
  }

  const blocked = new Set<string>();
  for (const object of map.objects) {
    const entrance = objectEntranceTile(object);
    objectFootprintTiles(object).forEach((tile) => {
      if (!sameCoord(tile, entrance) || object.kind === 'guardian' || object.kind === 'obstacle') {
        blocked.add(coordKey(tile));
      }
    });
  }
  starts.forEach((entrance) => footprintTiles(
    { x: entrance.x - 1, y: entrance.y - 1 }, { w: 3, h: 2 },
  ).forEach((tile) => { if (!sameCoord(tile, entrance)) blocked.add(coordKey(tile)); }));
  const navigableMap: GameMap = {
    ...map, terrain: map.terrain.map((row, y) => row.map((_terrain, x) =>
      terrainIdAt(map, { x, y }) === 'water' ? tile('meadow') : map.terrain[y][x])),
  };
  const targets = [...starts, ...map.objects.map(objectEntranceTile)];
  for (const target of targets) {
    if (!starts.every((start) => findPath(navigableMap, start, target, blocked))) {
      const owner = map.objects.find((object) => sameCoord(objectEntranceTile(object), target));
      report('unreachable', `${owner?.id ?? `tile ${coordKey(target)}`} is unreachable`);
    }
  }
  return issues;
}

export function lintMapWarnings(map: GameMap, starts: Coord[]): MapLintIssue[] {
  const warnings: MapLintIssue[] = [];
  const report = (code: string, message: string) => warnings.push({ mapId: map.id, code, message });
  for (const start of starts) {
    const nearby = map.terrain.flatMap((row, y) => row.flatMap((_tile, x) =>
      Math.max(Math.abs(x - start.x), Math.abs(y - start.y)) <= 6 ? [{ x, y }] : []));
    for (const faction of Object.keys(TERRAIN).flatMap((id) => {
      const native = TERRAIN[id as keyof typeof TERRAIN].nativeFaction;
      return native ? [native] : [];
    })) {
      const count = nearby.filter((position) =>
        TERRAIN[terrainIdAt(map, position)].nativeFaction === faction).length;
      if (count / nearby.length > 0.3) report('start-native-terrain',
        `${Math.round(count / nearby.length * 100)}% of the start at ${coordKey(start)} is ${faction} native ground`);
    }
  }
  const regions = new Map<string, string[]>();
  map.objects.filter((object) => object.kind === 'obstacle' && object.anomaly).forEach((object) => {
    const key = `${Math.floor(object.position.x / 12)},${Math.floor(object.position.y / 12)}`;
    regions.set(key, [...(regions.get(key) ?? []), object.id]);
  });
  regions.forEach((ids, region) => {
    if (ids.length > 1) report('anomaly-ration', `Region ${region} has ${ids.length} anomalous props`);
  });
  return warnings;
}

export function lintCrookedCrown(map: GameMap): MapLintIssue[] {
  const issues: MapLintIssue[] = [];
  const report = (code: string, message: string) => issues.push({ mapId: map.id, code, message });
  const metrics = crookedCrownMetrics(map);
  if (metrics.width !== 72 || metrics.height !== 72) {
    report('dense-dimensions', `expected 72x72, got ${metrics.width}x${metrics.height}`);
  }
  if (metrics.interactiveObjects < 100 || metrics.interactionPerPassableTile < 0.05) {
    report('object-density', `${metrics.interactiveObjects} interactions / ${metrics.passableTiles} passable tiles (${(metrics.interactionPerPassableTile * 100).toFixed(2)}%)`);
  }
  if (metrics.authoredLandmarks < 12 || metrics.decorationBlockerRatio < 0.68) {
    report('decoration-density', `${metrics.authoredLandmarks} landmarks and ${(metrics.decorationBlockerRatio * 100).toFixed(1)}% shaped/decorative terrain`);
  }
  if (metrics.maxOpenSquare > 10) {
    report('oversized-open-area', `largest unbroken passable square is ${metrics.maxOpenSquare}x${metrics.maxOpenSquare}`);
  }
  if (metrics.roads < 450) report('road-density', `only ${metrics.roads} road tiles`);

  const objects = new Map(map.objects.map((object) => [object.id, object]));
  for (const rewardId of CROOKED_CROWN_REWARD_IDS) {
    const reward = objects.get(rewardId);
    if (!reward?.guardedBy?.length) report('guardian-coverage', `${rewardId} lacks a guardian`);
  }
  for (const gateId of CROOKED_CROWN_GATE_IDS) {
    const gate = objects.get(gateId);
    if (gate?.kind !== 'guardian' || !gate.protects) {
      report('intended-gate', `${gateId} is not a linked guardian gate`);
    }
  }

  const routeTargets = [
    [objects.get('crooked-crown-dwelling-2'), objects.get('crooked-crown-dwelling-5')],
    [objects.get('crooked-crown-dwelling-3'), objects.get('crooked-crown-dwelling-8')],
    [objects.get('crooked-crown-dwelling-10'), objects.get('crooked-crown-dwelling-5')],
    [objects.get('crooked-crown-dwelling-11'), objects.get('crooked-crown-dwelling-8')],
  ];
  CROOKED_CROWN_STARTS.forEach((start, index) => {
    const routes = routeTargets[index].flatMap((target) => target
      ? [findPath(map, start, objectEntranceTile(target))] : []);
    if (routes.length !== 2 || routes.some((path) => !path)) {
      report('sealed-start', `start ${coordKey(start)} lacks two regional routes`);
      return;
    }
    const firstExits = routes.map((path) => path!.find((step) =>
      Math.max(Math.abs(step.x - start.x), Math.abs(step.y - start.y)) > 6));
    if (!firstExits[0] || !firstExits[1] || sameCoord(firstExits[0], firstExits[1])) {
      report('route-choice', `start ${coordKey(start)} routes do not diverge outside its chamber`);
    }
    const opening = map.objects.filter((object) => object.id.startsWith(
      `crooked-crown-pile-${[1, 4, 9, 12][index]}-`,
    ));
    if (opening.length < 2 || opening.some((object) =>
      !findPath(map, start, objectEntranceTile(object)))) {
      report('opening-economy', `start ${coordKey(start)} lacks two reachable opening pickups`);
    }
  });
  return issues;
}

export function lintSixfoldTrial(map: GameMap): MapLintIssue[] {
  const issues: MapLintIssue[] = [];
  const report = (code: string, message: string) => issues.push({ mapId: map.id, code, message });
  const metrics = sixfoldMetrics(map);
  if (metrics.chests !== 36) report('showcase-chests', `expected 36 chests, got ${metrics.chests}`);
  if (metrics.artifacts !== 18) report('showcase-artifacts', `expected 18 artifacts, got ${metrics.artifacts}`);
  if (metrics.guardians !== 18) report('showcase-guardians', `expected 18 guardians, got ${metrics.guardians}`);
  for (const band of SIXFOLD_GUARDIAN_BANDS) {
    const count = metrics.guardianStrengths.filter((strength) =>
      strength >= band.minimum && strength <= band.maximum).length;
    if (count < 4) report('showcase-strength-band', `${band.id} has only ${count} guardians`);
  }
  for (const slot of SIXFOLD_PLAYER_SETUP) {
    const exits = [
      { x: slot.entrance.x - 1, y: slot.entrance.y + 1 },
      { x: slot.entrance.x, y: slot.entrance.y + 1 },
      { x: slot.entrance.x + 1, y: slot.entrance.y + 1 },
      { x: slot.entrance.x - 1, y: slot.entrance.y - 2 },
      { x: slot.entrance.x, y: slot.entrance.y - 2 },
      { x: slot.entrance.x + 1, y: slot.entrance.y - 2 },
    ].filter((position) => inBounds(map, position)
      && !['mountain', 'water'].includes(terrainIdAt(map, position)));
    if (exits.length < 3) report('showcase-start-exits', `${slot.id} has only ${exits.length} exits`);
  }
  return issues;
}

export function lintAuthoredMaps(): MapLintIssue[] {
  return [
    ...lintMap(createBorderMarches(1), [{ x: 3, y: 10 }, { x: 24, y: 10 }]),
    ...lintMap(createCrosstitch(1), CROSSTITCH_CASTLE_POSITIONS),
    ...lintMap(createTornSound(1), TORN_SOUND_CASTLE_POSITIONS),
    ...lintMap(createManywhere(1), [
      ...MANYWHERE_CASTLE_POSITIONS,
      ...MANYWHERE_NEUTRAL_TOWNS.map((town) => town.entrance),
    ]),
    ...lintMap(createGrandMuster(1), [
      ...GRAND_MUSTER_CASTLES.map((castle) => castle.entrance),
      GRAND_MUSTER_ENEMY_CASTLE.entrance,
    ]),
    ...lintMap(createCrookedCrown(1), [...CROOKED_CROWN_STARTS]),
    ...lintCrookedCrown(createCrookedCrown(1)),
    ...lintMap(createSixfoldTrial(1), SIXFOLD_PLAYER_SETUP.map((slot) => slot.entrance)),
    ...lintSixfoldTrial(createSixfoldTrial(1)),
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issues = lintAuthoredMaps();
  if (issues.length) {
    issues.forEach((issue) => console.error(`${issue.mapId} ${issue.code}: ${issue.message}`));
    process.exit(1);
  } else {
    const dense = crookedCrownMetrics(createCrookedCrown(1));
    console.log('Map lint passed: no overlaps, unreachable entrances, or ineffective guards.');
    console.log(`The Crooked Crown: ${dense.interactiveObjects} interactions, ${dense.guardians} guardians, ${dense.authoredLandmarks} landmarks, ${dense.roads} roads, ${(dense.decorationBlockerRatio * 100).toFixed(1)}% shaped/decorative terrain, max open square ${dense.maxOpenSquare}.`);
    const showcase = sixfoldMetrics(createSixfoldTrial(1));
    console.log(`The Sixfold Trial: 6 slots, ${showcase.chests} chests, ${showcase.artifacts} artifacts, ${showcase.guardians} guardians, ${showcase.roads} roads.`);
  }
}
