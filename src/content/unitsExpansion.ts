import type { UnitId } from '../core/types';
import type { UnitDefinition } from './units';

/** Six-tier additions from docs/14_UNITS.md. Values remain intentionally pencilled. */
export const EXPANSION_UNITS = {
  oriflammeWyvern: {
    id: 'oriflammeWyvern', name: 'Oriflamme Wyvern', faction: 'hearthguard', tier: 6,
    hp: 220, damage: [22, 34], attack: 15, defense: 14, speed: 9, growth: 1,
    cost: { gold: 3200, iron: 3, essence: 1 }, abilities: ['flying', 'rampant', 'breath'],
    attackPattern: { kind: 'breath' },
  },
  reliquaryArk: {
    id: 'reliquaryArk', name: 'Reliquary Ark', faction: 'woundWrights', tier: 6,
    hp: 160, damage: [10, 16], attack: 9, defense: 15, speed: 4, growth: 1,
    cost: { gold: 2900, iron: 2, essence: 2 },
    abilities: ['construct', 'ranged', 'procession_of_repair', 'hallowed_cargo', 'blast_shot'],
    attackPattern: { kind: 'blast-shot' }, shots: 6,
  },

  candleWisps: {
    id: 'candleWisps', name: 'Candle-Wisps', faction: 'unfinished', tier: 1,
    hp: 4, damage: [1, 2], attack: 2, defense: 1, speed: 6, growth: 18,
    cost: { gold: 45 }, abilities: ['flying', 'spirit', 'last_light', 'unstable'],
  },
  couriers: {
    id: 'couriers', name: 'Couriers', faction: 'unfinished', tier: 2,
    hp: 12, damage: [2, 4], attack: 4, defense: 3, speed: 8, growth: 9,
    cost: { gold: 190 }, abilities: ['spirit', 'the_errand_passes'],
  },
  sentries: {
    id: 'sentries', name: 'Sentries', faction: 'unfinished', tier: 3,
    hp: 24, damage: [3, 6], attack: 5, defense: 9, speed: 3, growth: 6,
    cost: { gold: 300 }, abilities: ['still_on_watch', 'first_strike'],
  },
  boneChoir: {
    id: 'boneChoir', name: 'Bone Choir', faction: 'unfinished', tier: 4,
    hp: 40, damage: [6, 10], attack: 8, defense: 6, speed: 5, growth: 4,
    cost: { gold: 620, essence: 1 }, abilities: ['ranged', 'swelling_dirge', 'caster'],
    caster: { repertoire: ['wither', 'graveChill'], charges: 2, castPower: 3 }, shots: 8,
  },
  brides: {
    id: 'brides', name: 'The Brides', faction: 'unfinished', tier: 5,
    hp: 90, damage: [12, 20], attack: 12, defense: 10, speed: 7, growth: 2,
    cost: { gold: 1400, essence: 1 }, abilities: ['spirit', 'unfinished_vow', 'caster'],
    caster: { repertoire: ['secondWind', 'mournersVeil'], charges: 2, castPower: 4 },
  },
  ferry: {
    id: 'ferry', name: 'The Ferry', faction: 'unfinished', tier: 6,
    hp: 180, damage: [20, 30], attack: 14, defense: 13, speed: 6, growth: 1,
    cost: { gold: 3000, iron: 2, essence: 2 },
    abilities: ['flying', 'crossing', 'aquatic', 'all_adjacent'],
    attackPattern: { kind: 'all-adjacent' },
  },

  larvalTide: {
    id: 'larvalTide', name: 'Larval Tide', faction: 'vespiary', tier: 1,
    hp: 4, damage: [1, 1], attack: 1, defense: 1, speed: 3, growth: 20,
    cost: { gold: 30 }, abilities: ['altar'],
  },
  paperWaspLancers: {
    id: 'paperWaspLancers', name: 'Paper-Wasp Lancers', faction: 'vespiary', tier: 2,
    hp: 13, damage: [3, 5], attack: 6, defense: 2, speed: 9, growth: 10,
    cost: { gold: 200 }, abilities: ['flying', 'sting_and_circle'],
  },
  silkSpinners: {
    id: 'silkSpinners', name: 'Silk-Spinners', faction: 'vespiary', tier: 3,
    hp: 20, damage: [2, 4], attack: 4, defense: 5, speed: 5, growth: 7,
    cost: { gold: 330, timber: 1 }, abilities: ['ranged', 'web', 'chain_shot'], shots: 6,
  },
  amberCarriers: {
    id: 'amberCarriers', name: 'Amber-Carriers', faction: 'vespiary', tier: 4,
    hp: 55, damage: [5, 8], attack: 7, defense: 11, speed: 4, growth: 4,
    cost: { gold: 640 }, abilities: ['resin_trail', 'bloomshare'],
  },
  dragonflyCavalry: {
    id: 'dragonflyCavalry', name: 'Dragonfly Cavalry', faction: 'vespiary', tier: 5,
    hp: 85, damage: [11, 18], attack: 12, defense: 8, speed: 10, growth: 2,
    cost: { gold: 1350, essence: 1 }, abilities: ['flying', 'line_strike'],
    attackPattern: { kind: 'line-strike', range: 2 },
  },
  halfWokenQueen: {
    id: 'halfWokenQueen', name: 'The Half-Woken Queen', faction: 'vespiary', tier: 6,
    hp: 200, damage: [18, 28], attack: 13, defense: 14, speed: 5, growth: 1,
    cost: { gold: 3200, iron: 2, essence: 2 }, abilities: ['brood_call', 'caster'],
    caster: { repertoire: ['bloom', 'sapAndSinew'], charges: 2, castPower: 5 },
  },

  crowChorus: {
    id: 'crowChorus', name: 'Crow Chorus', faction: 'hagwood', tier: 1,
    hp: 5, damage: [1, 2], attack: 3, defense: 1, speed: 7, growth: 16,
    cost: { gold: 60 }, abilities: ['flying', 'beast', 'pecking_order', 'hex_feeder'],
  },
  fencePostFamiliars: {
    id: 'fencePostFamiliars', name: 'Fence-Post Familiars', faction: 'hagwood', tier: 2,
    hp: 16, damage: [2, 5], attack: 4, defense: 6, speed: 2, growth: 9,
    cost: { gold: 170 }, abilities: ['boundary', 'echoing', 'caster', 'ley_touched'],
    caster: { repertoire: ['pinchOfAsh', 'grudge'], charges: 3, castPower: 1 },
  },
  besomRiders: {
    id: 'besomRiders', name: 'Besom Riders', faction: 'hagwood', tier: 3,
    hp: 22, damage: [4, 7], attack: 7, defense: 4, speed: 8, growth: 6,
    cost: { gold: 380, essence: 1 }, abilities: ['flying', 'sweep'],
  },
  rusalka: {
    id: 'rusalka', name: 'Rusalka', faction: 'hagwood', tier: 4,
    hp: 38, damage: [5, 9], attack: 8, defense: 7, speed: 6, growth: 4,
    cost: { gold: 700, essence: 1 }, abilities: ['spirit', 'beckoning_song', 'aquatic', 'siphon'],
  },
  leshy: {
    id: 'leshy', name: 'Leshy', faction: 'hagwood', tier: 5,
    hp: 110, damage: [14, 22], attack: 12, defense: 12, speed: 5, growth: 2,
    cost: { gold: 1500, timber: 1, essence: 1 },
    abilities: ['beast', 'home_ground', 'thicket_walk', 'caster', 'all_adjacent'],
    caster: { repertoire: ['bramblelash', 'thicket'], charges: 2, castPower: 5 },
    attackPattern: { kind: 'all-adjacent' },
  },
  walkingHut: {
    id: 'walkingHut', name: 'The Walking Hut', faction: 'hagwood', tier: 6,
    hp: 190, damage: [20, 32], attack: 14, defense: 13, speed: 7, growth: 1,
    cost: { gold: 3100, timber: 3, essence: 2 },
    abilities: ['fowl_legs', 'crone_favor', 'cleave'],
    attackPattern: { kind: 'cleave' },
  },

  outriders: {
    id: 'outriders', name: 'Outriders', faction: 'wildergrass', tier: 1,
    hp: 6, damage: [1, 3], attack: 3, defense: 2, speed: 8, growth: 15,
    cost: { gold: 65 }, abilities: ['skirmish'],
  },
  drumCallers: {
    id: 'drumCallers', name: 'Drum-Callers', faction: 'wildergrass', tier: 2,
    hp: 14, damage: [2, 4], attack: 4, defense: 4, speed: 5, growth: 9,
    cost: { gold: 190 }, abilities: ['war_drums', 'soul_tithe'],
  },
  ashmaneWolves: {
    id: 'ashmaneWolves', name: 'Ashmane Wolves', faction: 'wildergrass', tier: 3,
    hp: 18, damage: [4, 8], attack: 8, defense: 3, speed: 9, growth: 7,
    cost: { gold: 310 }, abilities: ['beast', 'pack_hunger'],
  },
  aurochsHerd: {
    id: 'aurochsHerd', name: 'Aurochs Herd', faction: 'wildergrass', tier: 4,
    hp: 60, damage: [7, 11], attack: 8, defense: 10, speed: 6, growth: 4,
    cost: { gold: 620, iron: 1 }, abilities: ['beast', 'trample', 'cleave'],
    attackPattern: { kind: 'cleave' },
  },
  grassSerpent: {
    id: 'grassSerpent', name: 'Grass-Serpent', faction: 'wildergrass', tier: 5,
    hp: 95, damage: [13, 21], attack: 12, defense: 9, speed: 7, growth: 2,
    cost: { gold: 1400, essence: 1 },
    abilities: ['beast', 'undergrass', 'aquatic', 'burn_conduit', 'all_adjacent'],
    attackPattern: { kind: 'all-adjacent' },
  },
  thunderbird: {
    id: 'thunderbird', name: 'Thunderbird', faction: 'wildergrass', tier: 6,
    hp: 170, damage: [19, 30], attack: 15, defense: 11, speed: 11, growth: 1,
    cost: { gold: 3000, iron: 2, essence: 2 },
    abilities: ['flying', 'beast', 'storm_wake', 'line_strike'],
    attackPattern: { kind: 'line-strike', range: 4 },
  },
} satisfies Partial<Record<UnitId, Omit<UnitDefinition, 'flavor' | 'hexSize'>>>;
