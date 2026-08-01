import { ARTIFACTS } from '../content/artifacts';
import { buildingPresentation } from '../content/buildings';
import { BATTLE_TILE_TYPES } from '../content/battleTiles';
import { MAP_OBJECT_FLAVOR, TERRAIN_PRESENTATION } from '../content/flavor';
import { HEROES } from '../content/heroes';
import { ITEMS } from '../content/items';
import { OMENS } from '../content/omens';
import { SKILLS } from '../content/skills';
import { SPELLS } from '../content/spells';
import { UNITS } from '../content/units';
import type {
  ArtifactId, BuildingId, CounterId, FactionId, GameState, Hero, ItemId, MapObject,
  OmenId, SecondarySkillId, SpellId, TerrainId, UnitId,
} from '../core/types';
import { deriveTerrainDecorations, TERRAIN } from '../content/terrain';

export type InspectionKind = 'terrain' | 'object' | 'unit' | 'building' | 'spell'
  | 'artifact' | 'item' | 'skill' | 'hero' | 'counter' | 'enchantment' | 'omen'
  | 'battleTile' | 'decoration';
export interface InspectionTarget { kind: InspectionKind; id: string }
export interface InspectionCard {
  name: string; flavor: string; mechanics: string[]; learned?: boolean; terrain?: boolean;
}

const costs = (cost: Record<string, number | undefined>): string =>
  Object.entries(cost).filter(([, amount]) => amount).map(([id, amount]) => `${amount} ${id}`).join(', ') || 'Free';

const COUNTERS: Record<CounterId, InspectionCard> = {
  burn: { name: 'Burn', flavor: 'The fire has found somewhere to stay.', mechanics: ['Deals damage at turn start, then decays.'] },
  chill: { name: 'Chill', flavor: 'The cold has settled into every joint.', mechanics: ['Reduces speed, then decays.'] },
  hex: { name: 'Hex', flavor: 'Bad luck has learned the company’s name.', mechanics: ['Increases incoming damage by 5% per counter, then decays.'] },
  bloom: { name: 'Bloom', flavor: 'Green life insists on returning.', mechanics: ['Restores health at turn start, then decays.'] },
};

function objectName(object: MapObject): string {
  if (object.kind === 'mine') return object.resource === 'gold' ? 'Gold Mine'
    : object.resource === 'timber' ? 'Timber Camp'
      : object.resource === 'iron' ? 'Iron Mine' : 'Essence Spring';
  if (object.kind === 'pile') return 'Resource Pile';
  if (object.kind === 'chest') return 'Treasure Chest';
  if (object.kind === 'shrine') return `${object.school[0].toUpperCase()}${object.school.slice(1)} Shrine`;
  if (object.kind === 'item') return ITEMS[object.item.id].name;
  if (object.kind === 'richVein') return 'Rich Vein';
  if (object.kind === 'waystation') return 'Waystation';
  if (object.kind === 'lock') return object.name;
  if (object.kind === 'dwelling') return `${UNITS[object.unitId].name} Dwelling`;
  if (object.kind === 'guardian') return 'Guardian Company';
  return ({ tinkersCart: "Wandering Tinker's Cart", monastery: 'The Unstruck Bell Monastery',
    gloamingRing: 'The Gloaming Ring', storyteller: "Storyteller's Fire", chrysalis: 'The Chrysalis Pool',
    bridge: 'The Half-Built Bridge', hedgeSchool: 'Hedge School', reliquaryCairn: 'The Reliquary Cairn',
    tollGate: 'Toll Gate', omenStone: 'Omen Stone', crone: 'Wayward Crone', barrowField: 'Barrow-mound',
    boat: 'Boat', manaSpring: 'Mana Spring', flotsam: 'Flotsam', sealedCask: 'Sealed Cask',
    castaway: 'Castaway', messageBottle: 'Message in a Bottle', whirlpool: 'Whirlpool',
    shipwreck: 'Shipwreck', drownedBell: 'Drowned Bell', sirenRocks: 'Siren Rocks',
    lighthouse: 'Lighthouse', watermill: 'Watermill', windmill: 'Windmill',
    tradingCamp: 'Trading Camp', sparringStone: 'The Sparring Stone',
    listeningStones: 'The Listening Stones', longDraught: 'The Long Draught',
    grinningIdol: 'The Grinning Idol', hutOnTheHill: 'The Hut on the Hill',
    treeSecondThoughts: 'Tree of Second Thoughts', warmTable: 'The Warm Table',
    coldSpring: 'The Cold Spring', idolOfSomebody: 'The Idol of Somebody',
    wishingWell: 'Wishing Well', ruinedWatchtower: 'Ruined Watchtower',
    oldBearsCave: "The Old Bear's Cave", wolfHollow: 'Wolf Hollow',
    unquietYard: 'The Unquiet Yard', moltingCourt: 'The Molting Court',
    spoolHoard: 'The Spool-Hoard', mercenaryCamp: 'Mercenary Camp',
    wagonCamp: 'Wagon Camp', titheBarn: 'The Tithe Barn',
    skeletonGrass: 'The Skeleton in the Grass', coldCampfire: 'Cold Campfire',
    shepherdsLeanTo: "Shepherd's Lean-to", overgrownCart: 'The Overgrown Cart',
    patientStone: 'Patient Stone', cache: 'Cache', obstacle: 'Obstacle',
  } as Record<string, string>)[object.kind] ?? object.kind;
}

function objectFlavor(object: MapObject): string {
  if (object.flavorHint?.trim()) return object.flavorHint;
  if (object.kind === 'mine') return MAP_OBJECT_FLAVOR[`mine${object.resource[0].toUpperCase()}${object.resource.slice(1)}`];
  if (object.kind === 'shrine') return MAP_OBJECT_FLAVOR[`shrine${object.school[0].toUpperCase()}${object.school.slice(1)}`];
  if (object.kind === 'lock') return MAP_OBJECT_FLAVOR[object.id === 'the-sleeper' ? 'lockSleeper' : 'lockMirror'];
  if (object.kind === 'item') return ITEMS[object.item.id].flavor;
  if (object.kind === 'guardian') return 'They have chosen this ground, and mean to keep it.';
  return MAP_OBJECT_FLAVOR[object.kind];
}

function objectMechanics(object: MapObject): string[] {
  if (object.kind === 'mine') return [`Produces ${object.income} ${object.resource} each day while owned.`];
  if (object.kind === 'pile') return [`Collect ${object.amount} ${object.resource}.`];
  if (object.kind === 'chest') return ['Choose gold, experience, or its item reward after defeating any guard.'];
  if (object.kind === 'shrine') return [`Teaches ${SPELLS[object.teaches].name}; each hero may visit once.`];
  if (object.kind === 'item') return [ITEMS[object.item.id].description];
  if (object.kind === 'richVein') return [`Produces ${object.income} essence daily for ${object.days} days after claiming.`];
  if (object.kind === 'waystation') return ['Restores movement once per hero each day.'];
  if (object.kind === 'lock') return [object.tell];
  if (object.kind === 'dwelling') return [`${object.available} ${UNITS[object.unitId].name} available to recruit.`];
  if (object.kind === 'guardian') return [
    `Guards ${object.protects ?? 'the surrounding road'} and engages on adjacent tiles.`,
    ...object.army.map((stack) => `${stack.count} ${UNITS[stack.unitId].name}`),
  ];
  return [...(({ tinkersCart: ['Sells a rotating weekly item.'], monastery: ['The first visitor receives the greater blessing.'],
    gloamingRing: ['Deposit an item or artifact; return next week for a transformed reward.'], storyteller: ['Grants a weekly seeded story reward.'],
    chrysalis: ['Promotes a company once per week.'], bridge: ['Pay resources to complete the crossing.'], hedgeSchool: ['Teaches a secondary skill once per hero.'],
    reliquaryCairn: ['Trade an artifact for a different relic.'], tollGate: ['Pay the posted toll or fight the Keeper.'], omenStone: ['Reveals next week’s omen.'],
    crone: ['Offers a Hagwood bargain.'], barrowField: ['Contains a Grave spell scroll.'],
    boat: ['Carries a hero across water.'], manaSpring: ['Restores mana once per hero each week.'],
    flotsam: ['Collect timber and gold.'], sealedCask: ['Choose its salvaged reward.'],
    castaway: ['Rescue the castaway for an item and a story.'], messageBottle: ['Contains a rumour.'],
    whirlpool: ['Travels to its paired whirlpool at a cost to the weakest company.'],
    shipwreck: ['Defeat its drowned guard to claim the salvage.'],
    drownedBell: ['Grants gold and a timing blessing once per hero.'],
    sirenRocks: ['Listen to the song or row past it.'], lighthouse: ['Adds 500 sea movement each day.'],
    watermill: ['Pays 500 gold at each week start while owned.'], windmill: ['Pays two seeded rare resources weekly.'],
    tradingCamp: ['Grants marketplace access from anywhere while owned.'], sparringStone: ['Once per hero: choose +1 attack or defense.'],
    listeningStones: ['Once per hero: +1 spell power.'], longDraught: ['Once per hero: +1 knowledge.'],
    grinningIdol: ['Once per hero: +1 luck.'], hutOnTheHill: ['Once per hero: learn its seeded skill at rank 1.'],
    treeSecondThoughts: ['Pay 1500 gold per level to gain one level.'], warmTable: ['Weekly: +10 meter next battle.'],
    coldSpring: ['Weekly: +400 movement today.'], idolOfSomebody: ['Weekly: +1 luck next battle.'],
    wishingWell: ['Throw one gold for a tiny seeded boon.'], mercenaryCamp: ['Hire a seeded weekly neutral company.'],
    wagonCamp: ['Buy one seeded consumable weekly.'], titheBarn: ['Pay 1000 gold for +10% town growth this week.'],
    patientStone: ['Reveals a Cache sketch fragment.'], cache: ['Spend the full day digging on the exact tile.'],
    obstacle: ['An authored impassable terrain prop.'],
  } as Record<string, readonly string[]>)[object.kind] ?? ['A place with its own terms.'])];
}

export function inspectTarget(state: GameState, target: InspectionTarget): InspectionCard | null {
  if (target.kind === 'decoration') {
    const decoration = deriveTerrainDecorations(state.map).find((item) => item.id === target.id);
    return decoration ? {
      name: decoration.kind.replaceAll('-', ' '), flavor: decoration.label,
      mechanics: [], terrain: true,
    } : null;
  }
  if (target.kind === 'terrain') {
    const terrain = TERRAIN[target.id as TerrainId];
    return terrain ? {
      name: terrain.label, flavor: terrain.flavor, mechanics: [], terrain: true,
    } : null;
  }
  if (target.kind === 'battleTile') {
    const tile = BATTLE_TILE_TYPES[target.id as keyof typeof BATTLE_TILE_TYPES];
    return tile ? { name: tile.name, flavor: tile.flavor, mechanics: [], terrain: true } : null;
  }
  if (target.kind === 'object') {
    const object = state.map.objects.find((candidate) => candidate.id === target.id);
    if (!object) return null;
    const learned = state.players[state.activePlayer].discoveredObjectKinds.includes(object.kind);
    return { name: objectName(object), flavor: objectFlavor(object), mechanics: learned ? objectMechanics(object) : [], learned };
  }
  if (target.kind === 'unit') {
    const unit = UNITS[target.id as UnitId]; if (!unit) return null;
    return { name: unit.name, flavor: unit.flavor, mechanics: [`Tier ${unit.tier} · HP ${unit.hp} · Damage ${unit.damage.join('–')}`, `Attack ${unit.attack} · Defense ${unit.defense} · Speed ${unit.speed}`, `Growth ${unit.growth} · Cost ${costs(unit.cost)}`, `Abilities: ${unit.abilities.join(', ') || 'none'}`] };
  }
  if (target.kind === 'building') {
    const [id, faction] = target.id.split('@') as [BuildingId, FactionId?];
    const presentationFaction = faction ?? state.players[state.activePlayer].faction;
    const building = buildingPresentation(id, presentationFaction);
    if (!building) return null;
    return { name: building.name, flavor: building.flavor, mechanics: [building.function, `Cost: ${costs(building.cost)}`, `Requires: ${building.prerequisite ? buildingPresentation(building.prerequisite, presentationFaction).name : 'none'}`] };
  }
  if (target.kind === 'spell' || target.kind === 'enchantment') {
    const spell = SPELLS[target.id as SpellId]; if (!spell) return null;
    return { name: spell.name, flavor: spell.flavor, mechanics: [`${spell.mana} mana · ${spell.school} · ${spell.kind}`, `Base: ${spell.base}`, `Plus: ${spell.plus}`] };
  }
  if (target.kind === 'artifact') {
    const artifact = ARTIFACTS[target.id as ArtifactId]; if (!artifact) return null;
    return {
      name: artifact.name, flavor: artifact.flavor,
      mechanics: [
        `${artifact.class} · ${artifact.slot}`, artifact.description,
        ...(artifact.burdenRemoval ? [`Cannot be unequipped. Remove: ${artifact.burdenRemoval}`] : []),
      ],
    };
  }
  if (target.kind === 'item') {
    const item = ITEMS[target.id as ItemId]; if (!item) return null;
    return { name: item.name, flavor: item.flavor, mechanics: [`${item.use} use`, item.description] };
  }
  if (target.kind === 'skill') {
    const skill = SKILLS[target.id as SecondarySkillId]; if (!skill) return null;
    return { name: skill.name, flavor: skill.flavor, mechanics: Object.entries(skill.ranks).map(([rank, text]) => `Rank ${rank}: ${text}`) };
  }
  if (target.kind === 'hero') {
    const hero = Object.values(state.players).flatMap((player) => [...player.heroes, ...player.tavernPool]).find((candidate) => candidate.id === target.id)
      ?? Object.values(state.players).flatMap((player) => player.heroes).find((candidate) => candidate.definitionId === target.id);
    if (!hero) return null;
    const definition = HEROES[hero.definitionId];
    return { name: hero.name, flavor: definition.story, mechanics: [`Attack ${hero.attack} · Defense ${hero.defense} · Spell Power ${hero.spellPower} · Knowledge ${hero.knowledge}`, `Skills: ${Object.entries(hero.skills).map(([id, rank]) => `${SKILLS[id as SecondarySkillId].name} ${rank}`).join(', ') || 'none'}`, `Specialty: ${definition.specialty.description}`] };
  }
  if (target.kind === 'counter') return COUNTERS[target.id as CounterId] ?? null;
  if (target.kind === 'omen') {
    const omen = OMENS[target.id as OmenId]; if (!omen) return null;
    return { name: omen.title, flavor: omen.flavor, mechanics: Object.entries(omen).filter(([key]) => !['id', 'title', 'flavor'].includes(key)).map(([key, value]) => `${key}: ${String(value)}`) };
  }
  return null;
}

export function inspectionAttributes(kind: InspectionKind, id: string) {
  return { 'data-inspect-kind': kind, 'data-inspect-id': id };
}
