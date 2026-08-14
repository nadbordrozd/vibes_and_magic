import { armyPower, makeArmy, unitStrength } from '../../core/army';
import type {
  ArtifactId, Coord, FactionId, GameMap, MapObject, ResourceId, TerrainTile, UnitId,
} from '../../core/types';
import { coordKey } from '../../core/map/pathfinding';
import { FACTION_UNITS, UNITS } from '../units';
import { terrainId, tile } from '../terrain';
import {
  materializeGuardians, trimRoadsForCities, type AuthoredGuardian,
} from './occupancyAuthoring';
import { validateMap } from './borderMarches';

export const CROOKED_CROWN_WIDTH = 72;
export const CROOKED_CROWN_HEIGHT = 72;

export const CROOKED_CROWN_STARTS: readonly Coord[] = [
  { x: 9, y: 9 }, { x: 62, y: 9 }, { x: 9, y: 62 }, { x: 62, y: 62 },
];

export const CROOKED_CROWN_CHAMBERS: readonly Coord[] = [
  { x: 9, y: 9 }, { x: 27, y: 10 }, { x: 45, y: 9 }, { x: 62, y: 9 },
  { x: 10, y: 35 }, { x: 27, y: 34 }, { x: 45, y: 36 }, { x: 61, y: 34 },
  { x: 9, y: 62 }, { x: 27, y: 61 }, { x: 45, y: 63 }, { x: 62, y: 62 },
];

const START_KEYS = new Set(CROOKED_CROWN_STARTS.map(coordKey));
const RESOURCE_ORDER: readonly ResourceId[] = ['gold', 'timber', 'iron', 'essence'];
const FACTIONS: readonly FactionId[] = [
  'hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass',
];
const GUARD_UNITS: readonly UnitId[] = [
  'yeoman', 'tinSoldier', 'boneChoir', 'silkSpinners', 'ashmaneWolves', 'maskedDuelist',
  'marionette', 'bannerman', 'woodenColossus', 'hearthHound', 'oriflammeWarden', 'waxServitor',
];
const REWARD_ARTIFACTS: readonly ArtifactId[] = [
  'travelersCloak', 'ringOfSmallMendings', 'falconersGlove', 'whetstoneOfTheClans',
  'quietHorseshoe', 'purseOfThePrudentToad', 'sashOfTheLeviedMile', 'scribesCuff',
  'captainsWeathercoat', 'surveyorsBoots', 'fieldClerksSeal', 'ashwoodBracer',
];

export const CROOKED_CROWN_REWARD_IDS = CROOKED_CROWN_CHAMBERS.map(
  (_center, index) => `crooked-crown-reward-${index + 1}`,
);

export const CROOKED_CROWN_GATE_IDS = [
  'crooked-crown-reward-2-guardian', 'crooked-crown-reward-3-guardian',
  'crooked-crown-reward-6-guardian', 'crooked-crown-reward-7-guardian',
  'crooked-crown-reward-10-guardian', 'crooked-crown-reward-11-guardian',
] as const;

interface Topology {
  carved: Set<string>;
  road: Set<string>;
  terrain: TerrainTile[][];
}

function carveCell(set: Set<string>, x: number, y: number, radius = 0): void {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const px = x + dx;
      const py = y + dy;
      if (px > 0 && py > 0 && px < CROOKED_CROWN_WIDTH - 1
          && py < CROOKED_CROWN_HEIGHT - 1) set.add(`${px},${py}`);
    }
  }
}

function carveLine(
  carved: Set<string>, road: Set<string>, points: readonly Coord[], width = 1,
): void {
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    let { x, y } = points[pointIndex - 1];
    const destination = points[pointIndex];
    while (x !== destination.x || y !== destination.y) {
      carveCell(carved, x, y, width - 1);
      carveCell(road, x, y);
      if (x !== destination.x) x += Math.sign(destination.x - x);
      else y += Math.sign(destination.y - y);
    }
    carveCell(carved, x, y, width - 1);
    carveCell(road, x, y);
  }
}

function buildTopology(): Topology {
  const carved = new Set<string>();
  const road = new Set<string>();

  CROOKED_CROWN_CHAMBERS.forEach((center, index) => {
    const radiusX = START_KEYS.has(coordKey(center)) ? 5 : 4 + (index % 3 === 0 ? 1 : 0);
    const radiusY = START_KEYS.has(coordKey(center)) ? 5 : 4;
    for (let y = center.y - radiusY; y <= center.y + radiusY; y += 1) {
      for (let x = center.x - radiusX; x <= center.x + radiusX; x += 1) {
        const cornerCut = Math.abs(x - center.x) + Math.abs(y - center.y)
          > radiusX + radiusY - 2;
        if (!cornerCut) carveCell(carved, x, y);
      }
    }
  });
  for (let y = 31; y <= 39; y += 1) for (let x = 32; x <= 40; x += 1) {
    if (Math.abs(x - 36) + Math.abs(y - 35) <= 7) carveCell(carved, x, y);
  }

  const rows = [
    CROOKED_CROWN_CHAMBERS.slice(0, 4),
    CROOKED_CROWN_CHAMBERS.slice(4, 8),
    CROOKED_CROWN_CHAMBERS.slice(8, 12),
  ];
  rows.forEach((row, rowIndex) => {
    for (let index = 1; index < row.length; index += 1) {
      const left = row[index - 1];
      const right = row[index];
      const bendX = Math.floor((left.x + right.x) / 2);
      const bendY = rowIndex === 1 ? left.y + (index % 2 ? 2 : -2)
        : left.y + (index % 2 ? -1 : 1);
      carveLine(carved, road, [left, { x: bendX, y: left.y }, { x: bendX, y: bendY },
        { x: right.x, y: bendY }, right], index === 2 ? 2 : 1);
    }
  });

  const verticalColumns = [[0, 4, 8], [3, 7, 11], [1, 5, 9], [2, 6, 10]];
  verticalColumns.forEach((indices, column) => {
    const centers = indices.map((index) => CROOKED_CROWN_CHAMBERS[index]);
    for (let index = 1; index < centers.length; index += 1) {
      const top = centers[index - 1];
      const bottom = centers[index];
      const bendY = Math.floor((top.y + bottom.y) / 2);
      const bendX = top.x + (column % 2 ? 2 : -2);
      carveLine(carved, road, [top, { x: top.x, y: bendY }, { x: bendX, y: bendY },
        { x: bendX, y: bottom.y }, bottom]);
    }
  });

  // Four oblique links make the central field a looped contested circuit instead of a ladder.
  carveLine(carved, road, [{ x: 14, y: 14 }, { x: 20, y: 20 }, { x: 23, y: 29 }]);
  carveLine(carved, road, [{ x: 57, y: 14 }, { x: 52, y: 21 }, { x: 49, y: 31 }]);
  carveLine(carved, road, [{ x: 14, y: 57 }, { x: 20, y: 52 }, { x: 23, y: 39 }]);
  carveLine(carved, road, [{ x: 57, y: 57 }, { x: 52, y: 51 }, { x: 49, y: 41 }]);

  // Small blind pockets create optional reward chambers off the main road network.
  const pockets = [
    { x: 18, y: 5 }, { x: 36, y: 17 }, { x: 53, y: 5 }, { x: 67, y: 23 },
    { x: 5, y: 25 }, { x: 35, y: 48 }, { x: 67, y: 47 }, { x: 18, y: 67 },
    { x: 53, y: 68 },
  ];
  pockets.forEach((pocket, index) => {
    const nearest = CROOKED_CROWN_CHAMBERS.reduce((best, center) =>
      Math.abs(center.x - pocket.x) + Math.abs(center.y - pocket.y)
        < Math.abs(best.x - pocket.x) + Math.abs(best.y - pocket.y) ? center : best);
    carveLine(carved, road, [nearest, pocket]);
    for (let y = pocket.y - 2; y <= pocket.y + 2; y += 1) {
      for (let x = pocket.x - 2; x <= pocket.x + 2; x += 1) {
        if (Math.abs(x - pocket.x) + Math.abs(y - pocket.y) <= 3 + index % 2) {
          carveCell(carved, x, y);
        }
      }
    }
  });

  const terrain = Array.from({ length: CROOKED_CROWN_HEIGHT }, (_, y) =>
    Array.from({ length: CROOKED_CROWN_WIDTH }, (_, x): TerrainTile => {
      const key = `${x},${y}`;
      if (!carved.has(key)) {
        const ponds = [
          [18, 22, 4, 3], [36, 4, 5, 2], [54, 24, 4, 3],
          [18, 48, 4, 3], [36, 54, 5, 3], [55, 49, 4, 3],
        ];
        if (ponds.some(([cx, cy, rx, ry]) =>
          ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1)) {
          return tile('water', 'coastal');
        }
        return tile('mountain', y < 18 || (x > 51 && y > 48) ? 'snowcap' : 'granite');
      }
      if (CROOKED_CROWN_STARTS.some((start) =>
        Math.max(Math.abs(start.x - x), Math.abs(start.y - y)) <= 6)) return tile('meadow');
      const regionColumn = Math.floor(x / 18);
      const regionRow = Math.floor(y / 24);
      const regionTerrain = [
        ['deepwood', 'mosswold', 'hush', 'deepwood'],
        ['barrowfield', 'mire', 'lacquerFlats', 'mosswold'],
        ['ashsteppe', 'deepwood', 'barrowfield', 'lacquerFlats'],
      ] as const;
      const chosen = regionTerrain[Math.min(2, regionRow)][Math.min(3, regionColumn)];
      return (x * 13 + y * 7) % 11 < 3 ? tile('meadow')
        : tile(chosen, chosen === 'deepwood' || chosen === 'mosswold' ? 'mossy'
          : chosen === 'ashsteppe' ? 'south' : chosen === 'mire' ? 'coastal'
            : chosen === 'hush' ? 'north' : undefined);
    }));
  return { carved, road, terrain };
}

function rewardSite(index: number, position: Coord): MapObject {
  const kinds = [
    'ruinedWatchtower', 'oldBearsCave', 'wolfHollow', 'unquietYard', 'moltingCourt',
    'spoolHoard',
  ] as const;
  return {
    id: CROOKED_CROWN_REWARD_IDS[index], kind: kinds[index % kinds.length], position,
    cleared: false,
    reward: {
      gold: 900 + index * 175, essence: 1 + Math.floor(index / 4),
      artifacts: [{ id: REWARD_ARTIFACTS[index] }],
    },
    ...(kinds[index % kinds.length] === 'oldBearsCave'
      ? { recruitUnitId: 'hearthHound' as const } : {}),
  } as MapObject;
}

function authoredObjects(seed: number): MapObject[] {
  const objects: MapObject[] = [];
  CROOKED_CROWN_CHAMBERS.forEach((center, index) => {
    const faction = FACTIONS[index % FACTIONS.length];
    const unitId = FACTION_UNITS[faction][2];
    const resource = RESOURCE_ORDER[index % RESOURCE_ORDER.length];
    const startChamber = START_KEYS.has(coordKey(center));
    objects.push(
      {
        id: `crooked-crown-mine-${index + 1}`, kind: 'mine',
        position: { x: center.x - 3, y: center.y - 3 }, footprint: { w: 2, h: 1 },
        entrance: { dx: 0, dy: 0 }, resource,
        income: resource === 'gold' ? 1_000 : resource === 'timber' ? 2 : 1,
        owner: null, cleared: startChamber, chartered: false,
      },
      {
        id: `crooked-crown-pile-${index + 1}-a`, kind: 'pile',
        position: { x: center.x + 2, y: center.y - 3 }, resource: 'gold',
        amount: startChamber ? 1_200 : 650 + index * 50, collected: false,
      },
      {
        id: `crooked-crown-pile-${index + 1}-b`, kind: 'pile',
        position: { x: center.x - 3, y: center.y + 2 }, resource,
        amount: resource === 'gold' ? 700 : startChamber ? 6 : 3 + index % 4,
        collected: false,
      },
      {
        id: `crooked-crown-item-${index + 1}`, kind: 'item',
        position: { x: center.x, y: center.y - 3 },
        item: { id: 'waybread' },
        collected: false,
      },
      {
        id: `crooked-crown-dwelling-${index + 1}`, kind: 'dwelling',
        position: { x: center.x + 3, y: center.y + 2 }, unitId,
        available: UNITS[unitId].growth, lastGrowthWeek: 1,
      },
      {
        id: `crooked-crown-shrine-${index + 1}`, kind: 'shrine',
        position: { x: center.x - 3, y: center.y },
        school: (['rite', 'craft', 'grave', 'wild'] as const)[index % 4],
        teaches: (['rally', 'forgeSpark', 'graveSpeech', 'bloom'] as const)[index % 4],
        cleared: false, visitedBy: [],
      },
      rewardSite(index, { x: center.x + 3, y: center.y - 1 }),
      index % 4 === 0
        ? { id: `crooked-crown-waystation-${index + 1}`, kind: 'waystation',
          position: { x: center.x + 1, y: center.y + 3 }, visitedOnDay: {} }
        : index % 4 === 1
          ? { id: `crooked-crown-table-${index + 1}`, kind: 'warmTable',
            position: { x: center.x + 1, y: center.y + 3 }, visitedWeek: {} }
          : index % 4 === 2
            ? { id: `crooked-crown-school-${index + 1}`, kind: 'hedgeSchool',
              position: { x: center.x + 1, y: center.y + 3 }, visitedBy: [] }
            : { id: `crooked-crown-well-${index + 1}`, kind: 'wishingWell',
              position: { x: center.x + 1, y: center.y + 3 }, visitedWeek: {} },
      {
        id: `crooked-crown-landmark-${index + 1}`, kind: 'obstacle',
        position: { x: center.x - 2, y: center.y + 3 },
        prop: index % 3 === 0 ? 'old oak' : index % 3 === 1 ? 'the Spool' : 'the Block',
        ...(index % 3 === 0 ? {} : { footprint: { w: 2, h: 1 } }),
      },
    );
  });

  const pocketPositions = [
    { x: 18, y: 5 }, { x: 36, y: 17 }, { x: 53, y: 5 }, { x: 67, y: 23 },
    { x: 5, y: 25 }, { x: 35, y: 48 }, { x: 67, y: 47 }, { x: 18, y: 67 },
    { x: 53, y: 68 },
  ];
  pocketPositions.forEach((position, index) => objects.push({
    id: `crooked-crown-pocket-chest-${index + 1}`, kind: 'chest', position,
    cleared: false, collected: false,
  }));
  objects.push(
    { id: 'crooked-crown-central-mercenaries', kind: 'mercenaryCamp',
      position: { x: 35, y: 34 }, stockWeek: 1,
      roster: [{ unitId: 'maskedDuelist', count: 6 }, { unitId: 'hearthHound', count: 10 }] },
    { id: 'crooked-crown-central-wagon', kind: 'wagonCamp', position: { x: 37, y: 36 },
      stockWeek: 1, stock: { id: seed % 2 ? 'bottledEcho' : 'smellingSalts' } },
    { id: 'crooked-crown-central-omen', kind: 'omenStone', position: { x: 35, y: 37 },
      visitedBy: [] },
    { id: 'crooked-crown-central-cairn', kind: 'reliquaryCairn', position: { x: 37, y: 34 } },
  );
  return objects;
}

/** Derive authored counts from doc 39's centralized calibrated rating, never a local heuristic. */
function calibratedGuard(
  targetId: string, unitId: UnitId, targetStrength: number,
): AuthoredGuardian {
  return {
    targetId, army: [{ unitId, count: Math.max(1, Math.round(targetStrength / unitStrength(unitId))) }],
    split: true,
  };
}

function authoredGuardians(): AuthoredGuardian[] {
  const rewardGuards = CROOKED_CROWN_REWARD_IDS.map((targetId, index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    const centrality = 3 - Math.min(3, Math.abs(column - 1.5) + Math.abs(row - 1));
    return calibratedGuard(targetId, GUARD_UNITS[index], 75 + centrality * 80 + index * 12);
  });
  const mineGuards = CROOKED_CROWN_CHAMBERS.flatMap((center, index) =>
    START_KEYS.has(coordKey(center)) ? [] : [calibratedGuard(
      `crooked-crown-mine-${index + 1}`, GUARD_UNITS[(index + 3) % GUARD_UNITS.length],
      90 + Math.abs(index - 5.5) * 18,
    )]);
  return [...rewardGuards, ...mineGuards];
}

export interface CrookedCrownMetrics {
  width: number;
  height: number;
  passableTiles: number;
  mountainTiles: number;
  waterTiles: number;
  forestTiles: number;
  interactiveObjects: number;
  guardians: number;
  authoredLandmarks: number;
  roads: number;
  decorationBlockerRatio: number;
  interactionPerPassableTile: number;
  maxOpenSquare: number;
  guardianStrength: { minimum: number; median: number; maximum: number };
}

export function crookedCrownMetrics(map: GameMap): CrookedCrownMetrics {
  const ids = map.terrain.flat().map(terrainId);
  const mountainTiles = ids.filter((id) => id === 'mountain').length;
  const waterTiles = ids.filter((id) => id === 'water').length;
  const forestTiles = ids.filter((id) => id === 'deepwood' || id === 'mosswold').length;
  const passable = map.width * map.height - mountainTiles - waterTiles;
  const obstacles = map.objects.filter((object) => object.kind === 'obstacle').length;
  const interactive = map.objects.filter((object) =>
    object.kind !== 'guardian' && object.kind !== 'obstacle').length;
  const open = map.terrain.map((row) => row.map((entry) => {
    const id = terrainId(entry);
    return id !== 'mountain' && id !== 'water';
  }));
  let maxOpenSquare = 0;
  const squares = Array.from({ length: map.height }, () => Array(map.width).fill(0));
  for (let y = 0; y < map.height; y += 1) for (let x = 0; x < map.width; x += 1) {
    if (!open[y][x]) continue;
    squares[y][x] = 1 + (x && y ? Math.min(
      squares[y - 1][x], squares[y][x - 1], squares[y - 1][x - 1],
    ) : 0);
    maxOpenSquare = Math.max(maxOpenSquare, squares[y][x]);
  }
  const guardianStrengths = map.objects.filter((object) => object.kind === 'guardian')
    .map((guardian) => armyPower(makeArmy(guardian.army))).sort((a, b) => a - b);
  return {
    width: map.width, height: map.height, passableTiles: passable, mountainTiles, waterTiles,
    forestTiles, interactiveObjects: interactive, guardians: guardianStrengths.length,
    authoredLandmarks: obstacles, roads: map.roads?.length ?? 0,
    decorationBlockerRatio: (mountainTiles + waterTiles + forestTiles + obstacles)
      / (map.width * map.height),
    interactionPerPassableTile: interactive / passable,
    maxOpenSquare,
    guardianStrength: {
      minimum: guardianStrengths[0] ?? 0,
      median: guardianStrengths[Math.floor(guardianStrengths.length / 2)] ?? 0,
      maximum: guardianStrengths.at(-1) ?? 0,
    },
  };
}

export function createCrookedCrown(seed = 1): GameMap {
  const topology = buildTopology();
  const supportedRoadMasks = new Set([
    'e', 'es', 'esw', 'nsw', 'ew', 'n', 'ne', 'ns', 'nw', 's', 'sw', 'w',
  ]);
  const roadKeys = new Set(topology.road);
  let removedRoad = true;
  while (removedRoad) {
    removedRoad = false;
    for (const key of [...roadKeys]) {
      const [x, y] = key.split(',').map(Number);
      const mask = [
        roadKeys.has(`${x},${y - 1}`) ? 'n' : '', roadKeys.has(`${x + 1},${y}`) ? 'e' : '',
        roadKeys.has(`${x},${y + 1}`) ? 's' : '', roadKeys.has(`${x - 1},${y}`) ? 'w' : '',
      ].join('');
      if (!supportedRoadMasks.has(mask)) {
        roadKeys.delete(key);
        removedRoad = true;
      }
    }
  }
  const roads = [...roadKeys].map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
  const map = materializeGuardians({
    id: 'crooked-crown', name: 'The Crooked Crown', seed,
    width: CROOKED_CROWN_WIDTH, height: CROOKED_CROWN_HEIGHT,
    terrain: topology.terrain, objects: authoredObjects(seed),
    roads: trimRoadsForCities(roads.filter((position) => !['mountain', 'water'].includes(
      terrainId(topology.terrain[position.y][position.x]),
    )), CROOKED_CROWN_STARTS),
    seams: [
      { x: 35, y: 35 }, { x: 36, y: 35 }, { x: 36, y: 36 }, { x: 35, y: 36 },
    ],
    victory: {
      type: 'conquest',
      flavor: 'Four old roads bend toward a crown no cartographer admits drawing.',
      mechanics: 'Defeat all opposing players.',
    },
  }, authoredGuardians());
  validateMap(map);
  return map;
}
