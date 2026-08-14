import type {
  Coord, FactionId, GameMap, MapObject, PlayerId, TerrainTile,
} from '../../core/types';
import { FACTION_UNITS, UNITS } from '../units';
import { NEUTRAL_CREATURE_ACQUISITION } from '../neutralCreatures';
import { tile } from '../terrain';
import {
  materializeGuardians, trimRoadsForCities, type AuthoredGuardian,
} from './occupancyAuthoring';
import { validateMap } from './borderMarches';
import { seededSpellTome } from '../../core/game/chests';

export const MANYWHERE_WIDTH = 48;
export const MANYWHERE_HEIGHT = 40;
export const MANYWHERE_CASTLE_POSITIONS: Coord[] = [
  { x: 5, y: 7 }, { x: 42, y: 7 }, { x: 42, y: 29 },
];
export const MANYWHERE_NEUTRAL_TOWNS: Array<{
  id: string; entrance: Coord; faction: FactionId;
  variant: 'freeTown' | 'oldSeat' | 'hollowTown' | 'coastal';
}> = [
  { id: 'free-town', entrance: { x: 14, y: 31 }, faction: 'hearthguard', variant: 'freeTown' },
  { id: 'old-seat', entrance: { x: 35, y: 20 }, faction: 'woundWrights', variant: 'oldSeat' },
  { id: 'hollow-town', entrance: { x: 18, y: 29 }, faction: 'unfinished', variant: 'hollowTown' },
  { id: 'coastal-town', entrance: { x: 37, y: 31 }, faction: 'vespiary', variant: 'coastal' },
];

function terrain(): TerrainTile[][] {
  return Array.from({ length: MANYWHERE_HEIGHT }, (_, y) =>
    Array.from({ length: MANYWHERE_WIDTH }, (_, x): TerrainTile => {
      const northRanges = [
        { start: 1, end: 10, base: 5 },
        { start: 12, end: 19, base: 4 },
        { start: 22, end: 31, base: 5 },
        { start: 34, end: 39, base: 4 },
        { start: 43, end: 46, base: 5 },
      ];
      const northMountain = northRanges.some(({ start, end, base }) =>
        x >= start && x <= end && y >= base - 2 && y <= base);
      const interiorRanges = [
        { start: 1, end: 4, base: 17 },
        { start: 20, end: 23, base: 20 },
        { start: 25, end: 28, base: 20 },
        { start: 42, end: 46, base: 18 },
        { start: 9, end: 14, base: 33 },
        { start: 16, end: 20, base: 33 },
        { start: 25, end: 28, base: 33 },
        { start: 40, end: 43, base: 33 },
      ];
      const interiorMountain = interiorRanges.some(({ start, end, base }) =>
        x >= start && x <= end && y >= base - 1 && y <= base);
      if (y >= 34 && !((x >= 3 && x <= 8) || (x >= 22 && x <= 27))) return tile('water', 'coastal');
      if (northMountain) return tile('mountain', x >= 43 ? 'snowcap' : 'granite');
      if (interiorMountain) return tile('mountain', 'granite');
      if (y < 5 + Math.round(Math.sin(x * 0.55))) return tile('hush', 'north');

      const ellipse = (centerX: number, centerY: number, radiusX: number, radiusY: number) =>
        ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2;
      const wobble = Math.sin(x * 0.71 + y * 0.23) * 0.11
        + Math.cos(x * 0.19 - y * 0.83) * 0.08;
      if (ellipse(42, 22, 8.5, 12) + wobble < 1) return tile('mire', 'coastal');
      if (ellipse(36, 29, 11, 8) - wobble < 1) return tile('lacquerFlats');
      if (ellipse(8, 29, 10, 7.5) + wobble < 1) return tile('ashsteppe', 'south');
      if (ellipse(24, 19, 10, 9) - wobble < 1) return tile('mosswold', 'mossy');
      if (ellipse(8, 18, 9.5, 9) + wobble < 1) return tile('barrowfield');

      const deepwood = Math.min(
        ellipse(10, 10, 6.5, 3.8),
        ellipse(34, 10, 6.5, 3.5),
        ellipse(17, 29, 5.5, 4),
        ellipse(29, 27, 5.5, 4.5),
      );
      if (deepwood + wobble < 1) return tile('deepwood', 'mossy');
      return tile('meadow');
    }));
}

const reward = (gold = 0, essence = 0): NonNullable<Extract<MapObject, { kind: 'lock' }>['reward']> => ({ gold, essence });

function authoredObjects(seed: number): MapObject[] {
  const dwellings = (['hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass'] as const)
    .map((faction, index): MapObject => {
      const unitId = FACTION_UNITS[faction][2];
      return {
        id: `manywhere-${faction}-dwelling`, kind: 'dwelling',
        position: { x: 4 + index * 7, y: 20 + (index % 2) * 3 }, unitId,
        available: UNITS[unitId].growth, lastGrowthWeek: 1,
      };
    });
  const locks: MapObject[] = [
    ['the-sleeper', 8, 9, 'A hill that breathes.'],
    ['the-mirror-bound', 14, 9, 'The mirror returns the blow.'],
    ['manywhere-lock-needle', 20, 8, 'A needle points at the only honest seam.'],
    ['manywhere-lock-thread', 26, 8, 'The knot has four beginnings.'],
    ['manywhere-lock-thimble', 32, 9, 'A cup too small for any known hand.'],
    ['manywhere-lock-pattern', 38, 9, 'The page is blank until folded.'],
  ].map(([id, x, y, tell], index) => ({
    id: id as string, kind: 'lock' as const, position: { x: x as number, y: y as number },
    name: id === 'the-sleeper' ? 'The Sleeper' : id === 'the-mirror-bound'
      ? 'The Mirror-Bound' : `Pattern Lock ${index - 1}`, tell: tell as string,
    reward: index >= 2 ? { artifacts: [{ id: ['tailorsNeedle', 'goldenThread', 'tailorsThimble', 'patternbook'][index - 2] as 'tailorsNeedle' }] }
      : index === 0 ? { ...reward(2_000, 2), items: [seededSpellTome(seed, `${id}`, 'lock')] }
        : reward(2_000, 2),
    cleared: false,
  }));
  const neutralPositions: Coord[] = [
    { x: 2, y: 10 }, { x: 5, y: 10 }, { x: 11, y: 10 }, { x: 17, y: 10 },
    { x: 23, y: 10 }, { x: 29, y: 10 }, { x: 35, y: 10 }, { x: 41, y: 10 },
    { x: 44, y: 10 }, { x: 2, y: 14 }, { x: 8, y: 14 }, { x: 14, y: 14 },
    { x: 20, y: 14 },
  ];
  const neutralDwellings: MapObject[] = NEUTRAL_CREATURE_ACQUISITION.map((row, index) => ({
    id: `manywhere-neutral-${row.unitId}`, kind: 'dwelling' as const,
    position: neutralPositions[index], unitId: row.unitId,
    available: UNITS[row.unitId].growth, lastGrowthWeek: 1,
    flavorHint: `${row.dwellingName}. ${row.dwellingFlavor}`,
  }));
  return [
    { id: 'manywhere-mine', kind: 'mine', position: { x: 3, y: 13 }, footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 }, resource: 'gold', income: 1000, owner: null, cleared: false, chartered: false },
    { id: 'manywhere-pile', kind: 'pile', position: { x: 7, y: 12 }, resource: 'timber', amount: 5, collected: false },
    { id: 'manywhere-chest', kind: 'chest', position: { x: 10, y: 12 }, cleared: false, collected: false },
    { id: 'manywhere-shrine', kind: 'shrine', position: { x: 13, y: 12 }, school: 'rite', teaches: 'rally', cleared: false, visitedBy: [] },
    { id: 'manywhere-item', kind: 'item', position: { x: 16, y: 12 }, item: { id: 'waybread' }, collected: false },
    { id: 'manywhere-rich-vein', kind: 'richVein', position: { x: 5, y: 16 }, owner: null, flaggedOnDay: null, depleted: false, income: 2, days: 7 },
    { id: 'manywhere-waystation', kind: 'waystation', position: { x: 7, y: 16 }, visitedOnDay: {} },
    ...locks, ...dwellings, ...neutralDwellings,
    { id: 'manywhere-tinker', kind: 'tinkersCart', position: { x: 10, y: 27 }, route: [{ x: 10, y: 27 }, { x: 11, y: 27 }, { x: 11, y: 28 }, { x: 10, y: 28 }], routeIndex: 0, stock: { id: 'smellingSalts' }, stockWeek: 1 },
    { id: 'manywhere-monastery', kind: 'monastery', position: { x: 13, y: 27 }, firstVisitorId: null, blessings: {} },
    { id: 'manywhere-ring', kind: 'gloamingRing', position: { x: 16, y: 26 }, deposit: null },
    { id: 'manywhere-story', kind: 'storyteller', position: { x: 20, y: 30 }, visitedWeek: {} },
    { id: 'manywhere-chrysalis', kind: 'chrysalis', position: { x: 23, y: 30 }, visitedWeek: {} },
    { id: 'manywhere-bridge', kind: 'bridge', position: { x: 30, y: 34 }, completed: false, opens: [{ x: 30, y: 34 }] },
    { id: 'manywhere-hedge-school', kind: 'hedgeSchool', position: { x: 26, y: 30 }, visitedBy: [] },
    { id: 'manywhere-cairn', kind: 'reliquaryCairn', position: { x: 29, y: 29 },
      tomeSpellId: seededSpellTome(seed, 'manywhere-cairn', 'reliquary-cairn').storedSpellId,
      tomeClaimed: false },
    { id: 'manywhere-stacks', kind: 'stacks', position: { x: 40, y: 12 }, visitedBy: [] },
    { id: 'manywhere-wild-shrine', kind: 'wildShrine', position: { x: 43, y: 12 }, visitedBy: [] },
    { id: 'manywhere-pages', kind: 'reliquaryOfPages', position: { x: 46, y: 12 }, claimed: false,
      tomeSpellId: seededSpellTome(seed, 'manywhere-pages', 'reliquary-pages').storedSpellId! },
    { id: 'manywhere-toll', kind: 'tollGate', position: { x: 32, y: 29 }, paidBy: [], cleared: false },
    { id: 'manywhere-omen', kind: 'omenStone', position: { x: 35, y: 27 }, visitedBy: [] },
    { id: 'manywhere-crone', kind: 'crone', position: { x: 38, y: 26 }, visitedWeek: {} },
    { id: 'manywhere-barrow', kind: 'barrowField', position: { x: 6, y: 19 },
      scroll: seededSpellTome(seed, 'manywhere-barrow', 'barrow'), collected: false },
    { id: 'manywhere-boat', kind: 'boat', position: { x: 12, y: 35 }, owner: null, occupiedBy: null },
    { id: 'manywhere-mana', kind: 'manaSpring', position: { x: 15, y: 36 }, visitedWeek: {} },
    { id: 'manywhere-flotsam', kind: 'flotsam', position: { x: 18, y: 36 }, timber: 4, gold: 300, collected: false },
    { id: 'manywhere-cask', kind: 'sealedCask', position: { x: 21, y: 36 }, collected: false },
    { id: 'manywhere-castaway', kind: 'castaway', position: { x: 29, y: 36 }, collected: false, item: { id: 'waybread' }, story: 'The castaway has named every wave except this one.' },
    { id: 'manywhere-bottle', kind: 'messageBottle', position: { x: 32, y: 36 }, collected: false, rumour: 'The stones draw a place the map declines to name.' },
    { id: 'manywhere-whirlpool-a', kind: 'whirlpool', position: { x: 35, y: 36 }, pairedId: 'manywhere-whirlpool-b' },
    { id: 'manywhere-whirlpool-b', kind: 'whirlpool', position: { x: 45, y: 36 }, pairedId: 'manywhere-whirlpool-a' },
    { id: 'manywhere-wreck', kind: 'shipwreck', position: { x: 38, y: 36 }, cleared: false, reward: { artifacts: [{ id: 'saltCrustedCompass' }] } },
    { id: 'manywhere-bell', kind: 'drownedBell', position: { x: 41, y: 36 }, visitedBy: [] },
    { id: 'manywhere-sirens', kind: 'sirenRocks', position: { x: 44, y: 34 }, cleared: false, reward: reward(1800, 2) },
    { id: 'manywhere-lighthouse', kind: 'lighthouse', position: { x: 34, y: 34 }, owner: null },
    { id: 'manywhere-watermill', kind: 'watermill', position: { x: 4, y: 31 }, owner: null },
    { id: 'manywhere-windmill', kind: 'windmill', position: { x: 8, y: 31 }, owner: null, rareResource: seed % 2 ? 'iron' : 'essence' },
    { id: 'manywhere-trading', kind: 'tradingCamp', position: { x: 11, y: 31 }, owner: null },
    { id: 'manywhere-sparring', kind: 'sparringStone', position: { x: 4, y: 24 }, visitedBy: [] },
    { id: 'manywhere-listening', kind: 'listeningStones', position: { x: 8, y: 24 }, visitedBy: [] },
    { id: 'manywhere-draught', kind: 'longDraught', position: { x: 12, y: 24 }, visitedBy: [] },
    { id: 'manywhere-idol', kind: 'grinningIdol', position: { x: 16, y: 24 }, visitedBy: [] },
    { id: 'manywhere-hut', kind: 'hutOnTheHill', position: { x: 20, y: 24 }, visitedBy: [], skill: 'scouting', route: [{ x: 20, y: 24 }, { x: 21, y: 24 }, { x: 21, y: 25 }], routeIndex: 0 },
    { id: 'manywhere-tree', kind: 'treeSecondThoughts', position: { x: 24, y: 24 }, visitedBy: [] },
    { id: 'manywhere-table', kind: 'warmTable', position: { x: 28, y: 24 }, visitedWeek: {} },
    { id: 'manywhere-spring', kind: 'coldSpring', position: { x: 32, y: 24 }, visitedWeek: {} },
    { id: 'manywhere-somebody', kind: 'idolOfSomebody', position: { x: 36, y: 22 }, visitedWeek: {} },
    { id: 'manywhere-well', kind: 'wishingWell', position: { x: 40, y: 22 }, visitedWeek: {} },
    { id: 'manywhere-watchtower', kind: 'ruinedWatchtower', position: { x: 18, y: 16 }, cleared: false, reward: { gold: 1500, artifacts: [{ id: 'fairScale' }] } },
    { id: 'manywhere-bear', kind: 'oldBearsCave', position: { x: 22, y: 16 }, cleared: false, reward: reward(1200), recruitUnitId: 'hearthHound' },
    { id: 'manywhere-wolves', kind: 'wolfHollow', position: { x: 26, y: 16 }, cleared: false, reward: reward(1000), recruitUnitId: 'ashmaneWolves' },
    { id: 'manywhere-yard', kind: 'unquietYard', position: { x: 30, y: 15 }, cleared: false, reward: { artifacts: [{ id: 'unsentLetter' }] } },
    { id: 'manywhere-court', kind: 'moltingCourt', position: { x: 34, y: 15 }, cleared: false, reward: reward(0, 6) },
    { id: 'manywhere-hoard', kind: 'spoolHoard', position: { x: 38, y: 15 }, cleared: false, reward: { artifacts: [{ id: 'longSpoon' }] } },
    { id: 'manywhere-mercenaries', kind: 'mercenaryCamp', position: { x: 4, y: 28 }, stockWeek: 1, roster: [{ unitId: 'maskedDuelist', count: 8 }, { unitId: 'hearthHound', count: 12 }] },
    { id: 'manywhere-wagon', kind: 'wagonCamp', position: { x: 8, y: 28 }, stockWeek: 1, stock: { id: 'bottledEcho' } },
    { id: 'manywhere-tithe', kind: 'titheBarn', position: { x: 12, y: 28 }, usedWeek: { p1: 0, p2: 0, p3: 0, p4: 0 } as Record<PlayerId, number> },
    { id: 'manywhere-skeleton', kind: 'skeletonGrass', position: { x: 25, y: 12 }, searched: false, reward: { items: [{ id: 'haresHeel' }] } },
    { id: 'manywhere-fire', kind: 'coldCampfire', position: { x: 28, y: 12 }, searched: false, reward: { gold: 250, items: [{ id: 'saltedMeat' }] } },
    { id: 'manywhere-lean-to', kind: 'shepherdsLeanTo', position: { x: 31, y: 12 }, searched: false, reward: { essence: 2 } },
    { id: 'manywhere-cart', kind: 'overgrownCart', position: { x: 34, y: 12 }, searched: false, reward: seed % 3 ? { items: [{ id: 'cartographersCase' }] } : {} },
    { id: 'manywhere-cache', kind: 'cache', position: { x: 28, y: 27 }, hidden: true, dug: false, reward: { gold: 4000, artifacts: [{ id: 'mothEatenMap' }] } },
    ...[6, 14, 22, 30, 38].map((x, index): MapObject => ({ id: `manywhere-stone-${index + 1}`, kind: 'patientStone', position: { x, y: 18 }, cacheId: 'manywhere-cache', revealedBy: [] })),
    { id: 'manywhere-obstacle-oak', kind: 'obstacle', position: { x: 2, y: 20 }, prop: 'old oak' },
    { id: 'manywhere-obstacle-spool', kind: 'obstacle', position: { x: 18, y: 12 }, footprint: { w: 2, h: 1 }, prop: 'the Spool', anomaly: true },
    { id: 'manywhere-obstacle-block', kind: 'obstacle', position: { x: 33, y: 26 }, footprint: { w: 2, h: 1 }, prop: 'the Block', anomaly: true },
  ];
}

function guardians(): AuthoredGuardian[] {
  return [
    { targetId: 'manywhere-mine', army: [{ unitId: 'yeoman', count: 30 }] },
    { id: 'manywhere-chest-guard-west', targetId: 'manywhere-chest', position: { x: 9, y: 12 }, army: [{ unitId: 'tinSoldier', count: 14 }] },
    { id: 'manywhere-chest-guard-east', targetId: 'manywhere-chest', position: { x: 11, y: 12 }, army: [{ unitId: 'tinSoldier', count: 14 }] },
    { id: 'manywhere-chest-guard-north', targetId: 'manywhere-chest', position: { x: 10, y: 11 }, army: [{ unitId: 'tinSoldier', count: 14 }] },
    { id: 'manywhere-chest-guard-south', targetId: 'manywhere-chest', position: { x: 10, y: 13 }, army: [{ unitId: 'tinSoldier', count: 14 }] },
    ...['the-sleeper', 'the-mirror-bound', 'manywhere-lock-needle', 'manywhere-lock-thread', 'manywhere-lock-thimble', 'manywhere-lock-pattern']
      .map((targetId, index): AuthoredGuardian => ({ targetId, army: [{ unitId: index < 2 ? (index ? 'mirrorBound' : 'sleeper') : 'maskedDuelist', count: index < 2 ? 10 : 12 }] })),
    { targetId: 'manywhere-watchtower', army: [{ unitId: 'yeoman', count: 40 }] },
    { targetId: 'manywhere-bear', army: [{ unitId: 'hearthHound', count: 30 }] },
    { targetId: 'manywhere-wolves', army: [{ unitId: 'ashmaneWolves', count: 30 }] },
    { targetId: 'manywhere-yard', army: [{ unitId: 'boneChoir', count: 12 }] },
    { targetId: 'manywhere-court', army: [{ unitId: 'silkSpinners', count: 18 }] },
    { targetId: 'manywhere-hoard', army: [{ unitId: 'woodenColossus', count: 8 }] },
    { targetId: 'manywhere-pages', army: [{ unitId: 'boneChoir', count: 18 }] },
    { targetId: 'manywhere-wreck', army: [{ unitId: 'drownedCrew', count: 24 }] },
    { targetId: 'manywhere-sirens', army: [{ unitId: 'sirens', count: 20 }] },
    ...NEUTRAL_CREATURE_ACQUISITION.map((row): AuthoredGuardian => ({
      targetId: `manywhere-neutral-${row.unitId}`,
      army: [{ unitId: row.unitId, count: Math.max(2, UNITS[row.unitId].growth * 2) }],
    })),
  ];
}

export function createManywhere(seed = 1): GameMap {
  const map = materializeGuardians({
    id: 'manywhere', name: 'Manywhere', seed,
    width: MANYWHERE_WIDTH, height: MANYWHERE_HEIGHT, terrain: terrain(),
    objects: authoredObjects(seed),
    roads: trimRoadsForCities([
      ...Array.from({ length: 40 }, (_, index) => ({ x: index + 4, y: 7 })),
      ...Array.from({ length: 23 }, (_, index) => ({ x: 24, y: index + 7 })),
    ], [...MANYWHERE_CASTLE_POSITIONS, ...MANYWHERE_NEUTRAL_TOWNS.map((town) => town.entrance)]),
    seams: Array.from({ length: 18 }, (_, index) => ({ x: 24, y: index + 9 })),
    victory: { type: 'none', flavor: 'Go until the road has nothing left to surprise you with.', mechanics: 'Sandbox: retire when you are ready.' },
  }, guardians());
  validateMap(map);
  return map;
}
