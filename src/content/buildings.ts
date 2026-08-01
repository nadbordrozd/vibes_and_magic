import type { BuildingId, FactionId, ResourceCost, UnitTier } from '../core/types';
import { buildingFlavor } from './flavor';
import { FACTION_UNITS, UNITS } from './units';

export type BuildingCategory = 'hall' | 'dwelling' | 'guild' | 'walls' | 'economy' | 'special';

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  flavor: string;
  function: string;
  cost: ResourceCost;
  prerequisite?: BuildingId;
  upgrades?: BuildingId;
  category: BuildingCategory;
}

const RAW_BUILDINGS = {
  villageHall: {
    id: 'villageHall', name: 'Village Hall', cost: {}, upgrades: 'townHall',
  },
  townHall: {
    id: 'townHall', name: 'Town Hall', cost: { gold: 1500 },
    prerequisite: 'villageHall', upgrades: 'cityHall',
  },
  cityHall: {
    id: 'cityHall', name: 'City Hall', cost: { gold: 3500, timber: 5 },
    prerequisite: 'townHall',
  },
  dwelling1: { id: 'dwelling1', name: 'Dwelling I', cost: {} },
  dwelling2: {
    id: 'dwelling2', name: 'Dwelling II',
    cost: { gold: 1200, timber: 3 },
  },
  dwelling3: {
    id: 'dwelling3', name: 'Dwelling III',
    cost: { gold: 2000, timber: 4, iron: 1 }, prerequisite: 'dwelling2',
  },
  dwelling4: {
    id: 'dwelling4', name: 'Dwelling IV',
    cost: { gold: 3200, timber: 4, iron: 3 }, prerequisite: 'dwelling3',
  },
  dwelling5: {
    id: 'dwelling5', name: 'Dwelling V',
    cost: { gold: 5500, timber: 6, iron: 5 }, prerequisite: 'dwelling4',
  },
  dwelling6: {
    id: 'dwelling6', name: 'Dwelling VI',
    cost: { gold: 8000, timber: 8, iron: 6, essence: 2 }, prerequisite: 'dwelling5',
  },
  walls: {
    id: 'walls', name: 'Walls', cost: { gold: 1500, iron: 3 }, upgrades: 'keep',
  },
  keep: {
    id: 'keep', name: 'Keep', cost: { gold: 2500, iron: 4 }, prerequisite: 'walls',
  },
  chapelOfTheBanner: {
    id: 'chapelOfTheBanner', name: 'Chapel of the Banner',
    cost: { gold: 1000, essence: 2 }, prerequisite: 'dwelling3',
  },
  guildWorkshop: {
    id: 'guildWorkshop', name: 'Guild Workshop',
    cost: { gold: 1200, essence: 2 }, prerequisite: 'dwelling3',
  },
  musterField: {
    id: 'musterField', name: 'Muster Field', cost: { gold: 1400, timber: 4 },
    prerequisite: 'dwelling3',
  },
  foundersVault: {
    id: 'foundersVault', name: "Founder's Vault", cost: { gold: 1600, essence: 2 },
    prerequisite: 'dwelling3',
  },
  chapelOfCandles: {
    id: 'chapelOfCandles', name: 'Chapel of Candles',
    cost: { gold: 1500, essence: 3 }, prerequisite: 'dwelling3',
  },
  lychgate: {
    id: 'lychgate', name: 'Lychgate', cost: { gold: 1800, iron: 2, essence: 1 },
    prerequisite: 'dwelling3',
  },
  rendery: {
    id: 'rendery', name: 'Rendery', cost: { gold: 1500, iron: 1 },
    prerequisite: 'dwelling3',
  },
  deepTunnels: {
    id: 'deepTunnels', name: 'Deep Tunnels', cost: { gold: 2200, iron: 3 },
    prerequisite: 'dwelling3',
  },
  bargainPost: {
    id: 'bargainPost', name: 'Bargain Post', cost: { gold: 1200, essence: 2 },
    prerequisite: 'dwelling3',
  },
  henLeggedFence: {
    id: 'henLeggedFence', name: 'The Hen-Legged Fence',
    cost: { gold: 3000, timber: 6, essence: 3 }, prerequisite: 'dwelling3',
  },
  greatKraal: {
    id: 'greatKraal', name: 'Great Kraal', cost: { gold: 1600, timber: 2 },
    prerequisite: 'dwelling3',
  },
  pyreOfTheFallen: {
    id: 'pyreOfTheFallen', name: 'Pyre of the Fallen', cost: { gold: 1400, iron: 1 },
    prerequisite: 'dwelling3',
  },
  mageGuild1: {
    id: 'mageGuild1', name: 'Mage Guild 1',
    cost: { gold: 1000, essence: 2 }, upgrades: 'mageGuild2',
  },
  mageGuild2: {
    id: 'mageGuild2', name: 'Mage Guild 2',
    cost: { gold: 1500, essence: 3 }, prerequisite: 'mageGuild1', upgrades: 'mageGuild3',
  },
  mageGuild3: {
    id: 'mageGuild3', name: 'Mage Guild 3',
    cost: { gold: 2500, essence: 5 }, prerequisite: 'mageGuild2',
  },
  tavern: {
    id: 'tavern', name: 'Tavern', cost: { gold: 800, timber: 2 },
  },
  marketplace: {
    id: 'marketplace', name: 'Marketplace', cost: { gold: 500, timber: 2 },
  },
  shipyard: {
    id: 'shipyard', name: 'Shipyard', cost: { gold: 2000, timber: 5 },
  },
} satisfies Record<BuildingId, Omit<BuildingDefinition, 'flavor' | 'function' | 'category'>>;

const BUILDING_FUNCTION: Record<BuildingId, string> = {
  villageHall: 'Provides 500 gold income each day.', townHall: 'Raises daily castle income to 1,000 gold.',
  cityHall: 'Raises daily castle income to 2,000 gold.',
  dwelling1: 'Adds weekly tier-one recruits.', dwelling2: 'Adds weekly tier-two recruits.',
  dwelling3: 'Adds weekly tier-three recruits.', dwelling4: 'Adds weekly tier-four recruits.',
  dwelling5: 'Adds weekly tier-five recruits.', dwelling6: 'Adds weekly tier-six recruits.',
  walls: 'Adds wall defenses to castle battles.', keep: 'Strengthens walls and adds a watchtower to castle battles.',
  chapelOfTheBanner: 'Hearthguard armies gain improved morale support.',
  musterField: 'Increases Hearthguard creature growth.', guildWorkshop: 'Improves Wound-Wright post-battle recovery.',
  foundersVault: 'Provides the Wound-Wrights with Founders’ reserves.', chapelOfCandles: 'Accrues Candle-Wisps from battle losses.',
  lychgate: 'Strengthens Unfinished castle death effects.', rendery: 'Doubles Larvae produced by Render Down.',
  deepTunnels: 'Allows Vespiary heroes to travel between owned castles.', bargainPost: 'Offers additional Hagwood bargains.',
  henLeggedFence: 'Can relocate the Hagwood castle.', greatKraal: 'Increases Wildergrass creature growth.',
  pyreOfTheFallen: 'Returns half of fallen defenders after a castle battle.',
  mageGuild1: 'Teaches 3 spells from Mage Guild level 1.',
  mageGuild2: 'Teaches 6 spells through Mage Guild level 2.',
  mageGuild3: 'Teaches 8 spells through Mage Guild level 3.', tavern: 'Offers named heroes for hire.',
  marketplace: 'Sells a weekly spell scroll and enables market services.',
  shipyard: 'Builds boats in an adjacent water tile.',
};

export interface DwellingDefinition {
  tier: UnitTier;
  name: string;
  flavor: string;
}

export const DWELLINGS: Record<FactionId, readonly DwellingDefinition[]> = {
  hearthguard: [
    { tier: 1, name: 'Yeoman Crofts', flavor: 'Good soil, straight fences, and sons to spare.' },
    { tier: 2, name: 'The Butts', flavor: 'Every village green has one. Sunday practice is law, and lately well attended.' },
    { tier: 3, name: 'Hall of Banners', flavor: 'The cloth is stored flat, carried high, and never folded in anger.' },
    { tier: 4, name: 'The Tilt Yard', flavor: 'Three generations have splintered lances here. The fourth is saddling up.' },
    { tier: 5, name: 'Oriflamme Chapel', flavor: 'The old banner rests here between wars. It does not rest well.' },
    { tier: 6, name: "Wyvern's Roost", flavor: 'Nothing nests in it. Something steps out of the blazon above the door, when asked properly.' },
  ],
  woundWrights: [
    { tier: 1, name: 'Tin Rows', flavor: 'Rank upon rank upon shelf upon shelf.' },
    { tier: 2, name: 'Rocking Stables', flavor: 'The mounts rock when no one is riding. The Guild finds this devout.' },
    { tier: 3, name: 'String Garret', flavor: 'High rafters, for reasons the Guild does not examine.' },
    { tier: 4, name: 'Batting Hall', flavor: 'Stuffing, sackcloth, and the patience of upholsterers.' },
    { tier: 5, name: 'The Great Jointworks', flavor: 'The largest lathes the Guild has ever built, copying the largest limbs it has ever found.' },
    { tier: 6, name: 'Procession Yard', flavor: 'The Ark is wheeled out singing and wheeled back heavier.' },
  ],
  unfinished: [
    { tier: 1, name: 'Candle Chapel', flavor: 'Lit for the small ones. Someone keeps lighting more.' },
    { tier: 2, name: 'Dead Letter Office', flavor: 'Every letter here is still expected somewhere.' },
    { tier: 3, name: 'The Watch-House', flavor: 'The rota was never cancelled. New names keep appearing on it.' },
    { tier: 4, name: 'Choir Loft', flavor: 'They rehearse endings. Attendance is excellent.' },
    { tier: 5, name: 'Bridal Bower', flavor: 'Kept ready. She has somewhere to be.' },
    { tier: 6, name: 'The Ferry Landing', flavor: 'A dock, nowhere near water, well maintained.' },
  ],
  vespiary: [
    { tier: 1, name: 'Larval Warren', flavor: "Warm, papered, and full. The Hive's future, by the thousand." },
    { tier: 2, name: 'Paper Barracks', flavor: 'Folded, not built. The lancers drill in courteous silence.' },
    { tier: 3, name: 'Silk Galleries', flavor: 'The looms are alive. The thread is a gift.' },
    { tier: 4, name: 'Amber Vaults', flavor: 'What the Hive values is kept in gold that was never metal.' },
    { tier: 5, name: 'The High Eaves', flavor: 'The fast ones roost highest. Guests are announced at speed.' },
    { tier: 6, name: 'The Waking Cell', flavor: 'She sleeps less every year. The court rehearses its manners.' },
  ],
  hagwood: [
    { tier: 1, name: 'Crow Gallows', flavor: "The wood's watchers hold assizes here. Verdicts are cawed." },
    { tier: 2, name: 'The Crooked Fence', flavor: 'Posts walk here at night to be planted by day.' },
    { tier: 3, name: 'Besom Yard', flavor: 'Brooms, bundled and waiting. Sweeping is serious work.' },
    { tier: 4, name: 'The Old Millpond', flavor: 'The mill is gone. Something still draws the water into rings.' },
    { tier: 5, name: 'The Old Growth', flavor: 'Trees older than the contract, honoring it anyway.' },
    { tier: 6, name: "Hut's Clearing", flavor: 'Trampled flat, twice a day, by something with excellent legs.' },
  ],
  wildergrass: [
    { tier: 1, name: 'Outrider Camp', flavor: 'Saddled by dawn, gone by rumor.' },
    { tier: 2, name: 'Drum Circle', flavor: 'The hides are stretched, the rhythm is inherited.' },
    { tier: 3, name: 'Wolf Runs', flavor: 'The packs come when the ash-horn blows. Mostly when.' },
    { tier: 4, name: 'Grazing Grounds', flavor: 'The herds eat, grow, and remember the fire.' },
    { tier: 5, name: 'The Long Grass', flavor: 'Do not walk it. Ride around, like everyone sensible.' },
    { tier: 6, name: 'Storm Eyrie', flavor: "The high ledge smells of rain that hasn't happened yet." },
  ],
};

export function buildingCategory(id: BuildingId): BuildingCategory {
  if (id.endsWith('Hall')) return 'hall';
  if (id.startsWith('dwelling')) return 'dwelling';
  if (id.startsWith('mageGuild')) return 'guild';
  if (id === 'walls' || id === 'keep') return 'walls';
  if (id === 'marketplace' || id === 'tavern' || id === 'shipyard') return 'economy';
  return 'special';
}

export const BUILDINGS = Object.fromEntries(Object.entries(RAW_BUILDINGS).map(([id, building]) => [
  id, {
    ...building, flavor: buildingFlavor(building.name),
    function: BUILDING_FUNCTION[id as BuildingId], category: buildingCategory(id as BuildingId),
  },
])) as Record<BuildingId, BuildingDefinition>;

export function buildingPresentation(id: BuildingId, faction: FactionId): BuildingDefinition {
  const building = BUILDINGS[id];
  if (!id.startsWith('dwelling')) return building;
  const tier = Number(id.slice(-1)) as UnitTier;
  const dwelling = DWELLINGS[faction][tier - 1];
  const unit = UNITS[FACTION_UNITS[faction][tier - 1]];
  return {
    ...building, name: dwelling.name, flavor: dwelling.flavor,
    function: `Recruits: ${unit.name} · Growth: ${unit.growth}/week`,
  };
}

export const AI_BUILD_ORDER: readonly BuildingId[] = [
  'townHall', 'marketplace', 'mageGuild1', 'dwelling2', 'walls', 'dwelling3',
  'cityHall', 'chapelOfTheBanner', 'musterField', 'guildWorkshop', 'foundersVault',
  'chapelOfCandles', 'lychgate', 'rendery', 'deepTunnels', 'bargainPost',
  'henLeggedFence', 'greatKraal', 'pyreOfTheFallen', 'keep',
  'dwelling4', 'dwelling5', 'dwelling6',
];

export const COMMON_BUILDING_SLOT_ROOTS: readonly BuildingId[] = [
  'villageHall', 'marketplace', 'tavern', 'shipyard', 'walls', 'mageGuild1',
  'dwelling1', 'dwelling2', 'dwelling3', 'dwelling4', 'dwelling5', 'dwelling6',
];

export const FACTION_BUILDING_SLOTS: Record<FactionId, readonly BuildingId[]> = {
  hearthguard: ['chapelOfTheBanner', 'musterField'],
  woundWrights: ['guildWorkshop', 'foundersVault'],
  unfinished: ['chapelOfCandles', 'lychgate'],
  vespiary: ['rendery', 'deepTunnels'],
  hagwood: ['bargainPost', 'henLeggedFence'],
  wildergrass: ['greatKraal', 'pyreOfTheFallen'],
};

export function buildingBelongsToFaction(id: BuildingId, faction: FactionId): boolean {
  const owner = (Object.entries(FACTION_BUILDING_SLOTS) as Array<
    [FactionId, readonly BuildingId[]]
  >).find(([, buildings]) => buildings.includes(id))?.[0];
  return !owner || owner === faction;
}

export function validateBuildings(): void {
  for (const building of Object.values(BUILDINGS)) {
    if (!building.name || !building.flavor.trim() || !building.function.trim()
        || Object.values(building.cost).some((amount) => amount! < 0)) {
      throw new Error(`Invalid building definition: ${building.id}`);
    }
    if (building.prerequisite && !BUILDINGS[building.prerequisite]) {
      throw new Error(`Unknown prerequisite: ${building.id}`);
    }
    if (building.upgrades && (!BUILDINGS[building.upgrades]
        || BUILDINGS[building.upgrades].prerequisite !== building.id)) {
      throw new Error(`Broken upgrade line: ${building.id}`);
    }
  }
  for (const [faction, dwellings] of Object.entries(DWELLINGS)) {
    if (dwellings.length !== 6 || dwellings.some((dwelling, index) =>
      dwelling.tier !== index + 1 || !dwelling.name.trim() || !dwelling.flavor.trim())) {
      throw new Error(`Invalid dwelling catalog: ${faction}`);
    }
  }
}
