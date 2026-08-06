import type {
  AbilityId, FactionId, ResourceCost, UnitId, UnitTier,
} from '../core/types';
import { EXPANSION_UNITS } from './unitsExpansion';
import { unitFlavor } from './flavor';

export interface UnitDefinition {
  id: UnitId;
  name: string;
  flavor: string;
  faction: FactionId | 'seamborn' | 'gloamingCourt' | 'driftfolk';
  tier: UnitTier;
  hp: number;
  damage: readonly [number, number];
  attack: number;
  defense: number;
  speed: number;
  hexSize: 1 | 2 | 3;
  growth: number;
  cost: ResourceCost;
  abilities: readonly AbilityId[];
  shots?: number;
}

const RAW_UNITS = {
  yeoman: {
    id: 'yeoman', name: 'Yeoman', faction: 'hearthguard', tier: 1,
    hp: 7, damage: [1, 2], attack: 2, defense: 3, speed: 5,
    growth: 17, cost: { gold: 70 }, abilities: [],
  },
  longbowman: {
    id: 'longbowman', name: 'Longbowman', faction: 'hearthguard', tier: 2,
    hp: 11, damage: [2, 4], attack: 5, defense: 3, speed: 4,
    growth: 9, cost: { gold: 180 }, abilities: ['ranged'], shots: 12,
  },
  bannerman: {
    id: 'bannerman', name: 'Bannerman', faction: 'hearthguard', tier: 3,
    hp: 26, damage: [4, 7], attack: 7, defense: 7, speed: 5,
    growth: 6, cost: { gold: 320, iron: 1 }, abilities: ['banner'],
  },
  lanceKnight: {
    id: 'lanceKnight', name: 'Lance Knight', faction: 'hearthguard', tier: 4,
    hp: 45, damage: [8, 13], attack: 10, defense: 9, speed: 8,
    growth: 4, cost: { gold: 650, iron: 1 }, abilities: ['charge'],
  },
  oriflammeWarden: {
    id: 'oriflammeWarden', name: 'Oriflamme Warden', faction: 'hearthguard', tier: 5,
    hp: 130, damage: [18, 28], attack: 14, defense: 14, speed: 6,
    growth: 2, cost: { gold: 1600, iron: 3 }, abilities: ['oriflamme'],
  },
  tinSoldier: {
    id: 'tinSoldier', name: 'Tin Soldier', faction: 'woundWrights', tier: 1,
    hp: 5, damage: [1, 3], attack: 3, defense: 2, speed: 5,
    growth: 12, cost: { gold: 55 }, abilities: [],
  },
  hobbyKnight: {
    id: 'hobbyKnight', name: 'Hobby Knight', faction: 'woundWrights', tier: 2,
    hp: 15, damage: [3, 4], attack: 5, defense: 4, speed: 7,
    growth: 9, cost: { gold: 210 }, abilities: ['springloaded'],
  },
  marionette: {
    id: 'marionette', name: 'Marionette', faction: 'woundWrights', tier: 3,
    hp: 12, damage: [6, 10], attack: 9, defense: 2, speed: 6,
    growth: 6, cost: { gold: 340, essence: 1 }, abilities: ['no_retaliation'],
  },
  stuffedSentinel: {
    id: 'stuffedSentinel', name: 'Stuffed Sentinel', faction: 'woundWrights', tier: 4,
    hp: 70, damage: [6, 9], attack: 7, defense: 13, speed: 4,
    growth: 4, cost: { gold: 600, iron: 1 }, abilities: ['soft_body'],
  },
  woodenColossus: {
    id: 'woodenColossus', name: 'Wooden Colossus', faction: 'woundWrights', tier: 5,
    hp: 150, damage: [15, 25], attack: 13, defense: 12, speed: 5,
    growth: 2, cost: { gold: 1500, iron: 2, essence: 1 }, abilities: ['overwind'],
  },
  ...EXPANSION_UNITS,
  sleeper: {
    id: 'sleeper', name: 'The Sleeper', faction: 'seamborn', tier: 5,
    hp: 250, damage: [25, 40], attack: 18, defense: 24, speed: 3,
    growth: 1, cost: {}, abilities: ['full_heal'],
  },
  mirrorBound: {
    id: 'mirrorBound', name: 'The Mirror-Bound', faction: 'gloamingCourt', tier: 5,
    hp: 150, damage: [22, 32], attack: 18, defense: 18, speed: 6,
    growth: 1, cost: {}, abilities: ['melee_reflect'],
  },
  maskedDuelist: {
    id: 'maskedDuelist', name: 'Masked Duelist', faction: 'gloamingCourt', tier: 3,
    hp: 24, damage: [5, 8], attack: 9, defense: 7, speed: 7,
    growth: 4, cost: { gold: 420, essence: 1 }, abilities: ['no_retaliation'],
  },
  hearthHound: {
    id: 'hearthHound', name: 'Hearth-Hound', faction: 'gloamingCourt', tier: 2,
    hp: 18, damage: [3, 5], attack: 6, defense: 5, speed: 8,
    growth: 6, cost: { gold: 240 }, abilities: ['beast'],
  },
  waxServitor: {
    id: 'waxServitor', name: 'Wax Servitor', faction: 'gloamingCourt', tier: 3,
    hp: 30, damage: [4, 7], attack: 7, defense: 9, speed: 4,
    growth: 4, cost: { gold: 380 }, abilities: ['construct'],
  },
  sirens: {
    id: 'sirens', name: 'Sirens', faction: 'driftfolk', tier: 2,
    hp: 16, damage: [3, 5], attack: 5, defense: 4, speed: 6,
    growth: 1, cost: {}, abilities: ['aquatic', 'ranged', 'the_song'], shots: 8,
  },
  drownedCrew: {
    id: 'drownedCrew', name: 'Drowned Crew', faction: 'driftfolk', tier: 3,
    hp: 22, damage: [4, 7], attack: 6, defense: 7, speed: 4,
    growth: 1, cost: {}, abilities: ['aquatic', 'still_aboard'],
  },
  hullTurtle: {
    id: 'hullTurtle', name: 'Hull-Turtle', faction: 'driftfolk', tier: 5,
    hp: 130, damage: [10, 16], attack: 9, defense: 15, speed: 4,
    growth: 1, cost: {}, abilities: ['aquatic', 'shellback'],
  },
  lanternAngler: {
    id: 'lanternAngler', name: 'Lantern-Angler', faction: 'driftfolk', tier: 5,
    hp: 70, damage: [12, 19], attack: 11, defense: 8, speed: 7,
    growth: 1, cost: {}, abilities: ['aquatic', 'the_lure'],
  },
  siegeWall: {
    id: 'siegeWall', name: 'Wall Section', faction: 'seamborn', tier: 1,
    hp: 30, damage: [0, 0], attack: 0, defense: 10, speed: 1,
    growth: 1, cost: {}, abilities: ['construct', 'siege_wall', 'immobile'],
  },
  siegeRam: {
    id: 'siegeRam', name: 'Ram', faction: 'seamborn', tier: 1,
    hp: 80, damage: [10, 14], attack: 8, defense: 10, speed: 4,
    growth: 1, cost: {}, abilities: ['construct', 'siege_ram'],
  },
  watchtower: {
    id: 'watchtower', name: 'Watchtower', faction: 'seamborn', tier: 2,
    hp: 11, damage: [2, 4], attack: 5, defense: 3, speed: 1,
    growth: 1, cost: {}, abilities: ['construct', 'ranged', 'immobile'], shots: 99,
  },
  standingMirror: {
    id: 'standingMirror', name: 'Standing Mirror', faction: 'gloamingCourt', tier: 1,
    hp: 30, damage: [0, 0], attack: 0, defense: 0, speed: 1,
    growth: 1, cost: {}, abilities: ['construct', 'immobile', 'mirror_hex'],
  },
  makerWall: {
    id: 'makerWall', name: "Maker's Wall", faction: 'seamborn', tier: 1,
    hp: 40, damage: [0, 0], attack: 0, defense: 10, speed: 1,
    growth: 1, cost: {}, abilities: ['construct', 'siege_wall', 'immobile'],
  },
} satisfies Record<UnitId, Omit<UnitDefinition, 'flavor' | 'hexSize'>>;

export const UNITS = Object.fromEntries(Object.entries(RAW_UNITS).map(([id, unit]) => [
  id, {
    ...unit, flavor: unitFlavor(unit.name),
    hexSize: ([
      'lanceKnight', 'oriflammeWyvern', 'reliquaryArk', 'woodenColossus', 'stuffedSentinel',
      'ferry', 'halfWokenQueen', 'walkingHut', 'aurochsHerd', 'thunderbird', 'siegeRam',
      'hullTurtle',
    ].includes(id) ? 2 : id === 'sleeper' ? 3 : 1) as 1 | 2 | 3,
  },
])) as unknown as Record<UnitId, UnitDefinition>;

export const FACTION_UNITS: Record<FactionId, readonly UnitId[]> = {
  hearthguard: [
    'yeoman', 'longbowman', 'bannerman', 'lanceKnight', 'oriflammeWarden',
    'oriflammeWyvern',
  ],
  woundWrights: [
    'tinSoldier', 'hobbyKnight', 'marionette', 'stuffedSentinel', 'woodenColossus',
    'reliquaryArk',
  ],
  unfinished: ['candleWisps', 'couriers', 'sentries', 'boneChoir', 'brides', 'ferry'],
  vespiary: [
    'larvalTide', 'paperWaspLancers', 'silkSpinners', 'amberCarriers',
    'dragonflyCavalry', 'halfWokenQueen',
  ],
  hagwood: [
    'crowChorus', 'fencePostFamiliars', 'besomRiders', 'rusalka', 'leshy', 'walkingHut',
  ],
  wildergrass: [
    'outriders', 'drumCallers', 'ashmaneWolves', 'aurochsHerd', 'grassSerpent',
    'thunderbird',
  ],
};

export function validateUnits(): void {
  for (const unit of Object.values(UNITS)) {
    if (!unit.name || !unit.flavor.trim() || unit.hp <= 0 || unit.speed <= 0 || unit.growth <= 0) {
      throw new Error(`Invalid unit definition: ${unit.id}`);
    }
    if (unit.damage[0] > unit.damage[1]) throw new Error(`Invalid damage range: ${unit.id}`);
  }
}
