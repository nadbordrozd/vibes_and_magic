import type { Coord, GameMap, MapObject, TerrainTile } from '../../core/types';
import { tile } from '../terrain';
import { materializeGuardians, type AuthoredGuardian } from './occupancyAuthoring';
import { validateMap } from './borderMarches';

export const TORN_SOUND_WIDTH = 32;
export const TORN_SOUND_HEIGHT = 24;
export const TORN_SOUND_CASTLE_POSITIONS: Coord[] = [{ x: 2, y: 12 }, { x: 29, y: 12 }];

function terrain(): TerrainTile[][] {
  return Array.from({ length: TORN_SOUND_HEIGHT }, (_, y) =>
    Array.from({ length: TORN_SOUND_WIDTH }, (_, x): TerrainTile => {
      const west = x >= 1 && x <= 8 && y >= 7 && y <= 16;
      const east = x >= 23 && x <= 30 && y >= 7 && y <= 16;
      const centre = x >= 13 && x <= 19 && y >= 8 && y <= 15;
      const islet = (x >= 14 && x <= 17 && y >= 2 && y <= 4)
        || (x >= 14 && x <= 18 && y >= 18 && y <= 20);
      if (!(west || east || centre || islet)) return tile('water', 'coastal');
      if ((west || east || centre) && (x + y) % 5 === 0) return tile('mire', 'coastal');
      if (centre && (x + y) % 9 === 0) return tile('barrowfield');
      if ((west || east) && (x * 3 + y) % 13 === 0) return tile('deepwood', 'mossy');
      // The islands use the same salt-faded coastal presentation family as their waterline Mire;
      // gameplay remains ordinary Meadow away from the scattered bog cells.
      return tile('meadow', 'coastal');
    }));
}

function objects(seed: number): MapObject[] {
  const item = seed % 2 ? 'waybread' as const : 'smellingSalts' as const;
  return [
    { id: 'sound-centre-gold', kind: 'mine', position: { x: 15, y: 12 }, footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 }, resource: 'gold', income: 1000, owner: null, cleared: false, chartered: false },
    { id: 'sound-centre-timber', kind: 'mine', position: { x: 18, y: 14 }, footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 }, resource: 'timber', income: 2, owner: null, cleared: false, chartered: false },
    { id: 'sound-west-iron', kind: 'mine', position: { x: 7, y: 10 }, footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 }, resource: 'iron', income: 1, owner: null, cleared: true, chartered: false },
    { id: 'sound-east-essence', kind: 'mine', position: { x: 24, y: 15 }, footprint: { w: 2, h: 1 }, entrance: { dx: 0, dy: 0 }, resource: 'essence', income: 1, owner: null, cleared: true, chartered: false },
    { id: 'north-drowned-bell', kind: 'drownedBell', position: { x: 16, y: 1 }, visitedBy: [] },
    { id: 'west-siren-rocks', kind: 'sirenRocks', position: { x: 10, y: 10 }, cleared: false, reward: { gold: 1500, artifacts: [{ id: 'quietHorseshoe' }] } },
    { id: 'east-siren-rocks', kind: 'sirenRocks', position: { x: 21, y: 14 }, cleared: false, reward: { gold: 1500, artifacts: [{ id: 'beeCharmersVeil' }] } },
    { id: 'sound-shipwreck', kind: 'shipwreck', position: { x: 16, y: 6 }, cleared: false, reward: { gold: 2500, artifacts: [{ id: 'saltCrustedCompass' }] } },
    { id: 'sound-lighthouse', kind: 'lighthouse', position: { x: 16, y: 17 }, owner: null },
    { id: 'sound-whirlpool-nw', kind: 'whirlpool', position: { x: 1, y: 1 }, pairedId: 'sound-whirlpool-se' },
    { id: 'sound-whirlpool-se', kind: 'whirlpool', position: { x: 30, y: 22 }, pairedId: 'sound-whirlpool-nw' },
    { id: 'sound-flotsam-1', kind: 'flotsam', position: { x: 11, y: 5 }, timber: 3, gold: 200, collected: false },
    { id: 'sound-flotsam-2', kind: 'flotsam', position: { x: 22, y: 18 }, timber: 5, gold: 0, collected: false },
    { id: 'sound-cask-1', kind: 'sealedCask', position: { x: 11, y: 16 }, collected: false },
    { id: 'sound-cask-2', kind: 'sealedCask', position: { x: 20, y: 6 }, collected: false },
    { id: 'sound-castaway', kind: 'castaway', position: { x: 12, y: 20 }, collected: false, item: { id: item }, story: 'The castaway has named every wave and several are offended.' },
    { id: 'sound-bottle', kind: 'messageBottle', position: { x: 20, y: 20 }, collected: false, rumour: 'The centre island is not where the oldest charts put it.' },
  ];
}

function guardians(): AuthoredGuardian[] {
  return [
    { targetId: 'sound-centre-gold', army: [{ unitId: 'hullTurtle', count: 2 }], static: true },
    { targetId: 'sound-shipwreck', position: { x: 15, y: 6 }, army: [{ unitId: 'drownedCrew', count: 18 }] },
    { targetId: 'west-siren-rocks', position: { x: 10, y: 9 }, army: [{ unitId: 'sirens', count: 16 }] },
    { targetId: 'east-siren-rocks', position: { x: 21, y: 13 }, army: [{ unitId: 'sirens', count: 16 }] },
    { targetId: 'sound-lighthouse', position: { x: 15, y: 17 }, army: [{ unitId: 'lanternAngler', count: 5 }] },
  ];
}

export function createTornSound(seed = 1): GameMap {
  const map = materializeGuardians({
    id: 'torn-sound', name: 'The Torn Sound', seed, width: TORN_SOUND_WIDTH,
    height: TORN_SOUND_HEIGHT, terrain: terrain(), objects: objects(seed), roads: [],
    victory: {
      type: 'conquest', flavor: 'Read the broken sea, then break the rival banner.',
      mechanics: 'Defeat the opposing player.',
    },
  }, guardians());
  validateMap(map);
  return map;
}
