import { ARTIFACTS, ARTIFACT_SETS, type ArtifactClass } from '../content/artifacts';
import { buildingPrerequisites, buildingPresentation } from '../content/buildings';
import { BATTLE_TILE_TYPES, battleTileRuleSummary } from '../content/battleTiles';
import { MAP_OBJECT_FLAVOR, TERRAIN_PRESENTATION } from '../content/flavor';
import { HEROES } from '../content/heroes';
import { ITEMS } from '../content/items';
import { OMENS, omenEffectSummary } from '../content/omens';
import { SKILLS } from '../content/skills';
import { SPELLS } from '../content/spells';
import { spellCategory } from '../content/spellPresentation';
import { SPELL_LEXICON } from '../content/spellLexicon';
import { UNITS } from '../content/units';
import { NEUTRAL_CREATURE_ACQUISITION } from '../content/neutralCreatures';
import { ABILITY_PRESENTATION } from '../content/abilityPresentation';
import { FACTIONS } from '../content/factions';
import { KNACKS } from '../content/knacks';
import { CASTLE_NAMES, FACTION_PASSIVES } from '../content/factionPresentation';
import type {
  AbilityId, ArtifactId, ArtifactSlot, BuildingId, CounterId, FactionId, GameState, Hero, ItemId, MapObject,
  OmenId, SecondarySkillId, SpellId, TerrainId, UnitId,
} from '../core/types';
import { deriveTerrainDecorations, TERRAIN } from '../content/terrain';
import { guardianIntel } from '../core/selectors';

export const INSPECTION_KINDS = [
  'terrain', 'object', 'unit', 'building', 'spell', 'artifact', 'item', 'skill',
  'hero', 'counter', 'enchantment', 'omen', 'battleTile', 'decoration', 'ability',
  'castle', 'knack',
] as const;
export type InspectionKind = typeof INSPECTION_KINDS[number];
export const INSPECTION_KIND_NAMES: Record<InspectionKind, string> = {
  terrain: 'Terrain', object: 'Adventure object', unit: 'Creature', building: 'Building',
  spell: 'Spell', artifact: 'Artifact', item: 'Consumable', skill: 'Secondary skill',
  hero: 'Hero', counter: 'Counter', enchantment: 'Enchantment', omen: 'Weekly omen',
  battleTile: 'Battlefield tile', decoration: 'Landscape', ability: 'Creature ability',
  castle: 'City',
  knack: 'Faction Knack',
};
export interface InspectionTarget { kind: InspectionKind; id: string }
export interface InspectionCard {
  name: string; flavor: string; mechanics: string[]; learned?: boolean; terrain?: boolean;
}

const costs = (cost: Record<string, number | undefined>): string =>
  Object.entries(cost).filter(([, amount]) => amount).map(([id, amount]) => `${amount} ${id}`).join(', ') || 'Free';

const ARTIFACT_CLASS_NAMES: Record<ArtifactClass, string> = {
  vanilla: 'Standard artifact', charm: 'Charm', relic: 'Relic', burden: 'Burden',
  kit: "Tailor's Kit piece", trinket: 'Battle trinket',
};

const ARTIFACT_SLOT_NAMES: Record<ArtifactSlot, string> = {
  head: 'Head', cloak: 'Cloak', amulet: 'Amulet', weapon: 'Weapon', shield: 'Shield',
  armor: 'Armor', ring: 'Ring', boots: 'Boots', misc: 'Miscellaneous',
};

const titleCase = (value: string): string => value.replaceAll('-', ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (letter) => letter.toUpperCase());

const COUNTERS: Record<CounterId, InspectionCard> = {
  burn: { name: SPELL_LEXICON.burn.name, flavor: 'The fire has found somewhere to stay.', mechanics: [SPELL_LEXICON.burn.rule] },
  chill: { name: SPELL_LEXICON.chill.name, flavor: 'The cold has settled into every joint.', mechanics: [SPELL_LEXICON.chill.rule] },
  hex: { name: SPELL_LEXICON.hex.name, flavor: 'Bad luck has learned the company’s name.', mechanics: [SPELL_LEXICON.hex.rule] },
  bloom: { name: SPELL_LEXICON.bloom.name, flavor: 'Green life insists on returning.', mechanics: [SPELL_LEXICON.bloom.rule] },
};

export function mapObjectName(object: MapObject): string {
  if (object.kind === 'mine') return object.resource === 'gold' ? 'Gold Quarry'
    : object.resource === 'timber' ? 'Timber Saw Yard'
      : object.resource === 'iron' ? 'Iron Headframe Mine' : 'Essence Stitchwell';
  if (object.kind === 'pile') return 'Resource Pile';
  if (object.kind === 'chest') return 'Treasure Chest';
  if (object.kind === 'shrine') return `${object.school[0].toUpperCase()}${object.school.slice(1)} Shrine`;
  if (object.kind === 'item') return ITEMS[object.item.id].name;
  if (object.kind === 'rewardPickup') return 'Reward Pickup';
  if (object.kind === 'richVein') return 'Rich Vein';
  if (object.kind === 'waystation') return 'Waystation';
  if (object.kind === 'lock') return object.name;
  if (object.kind === 'dwelling') return NEUTRAL_CREATURE_ACQUISITION
    .find((row) => row.unitId === object.unitId)?.dwellingName
    ?? `${UNITS[object.unitId].name} Dwelling`;
  if (object.kind === 'guardian') return 'Guardian Company';
  return ({ tinkersCart: "Wandering Tinker's Cart", monastery: 'The Unstruck Bell Monastery',
    gloamingRing: 'The Gloaming Ring', storyteller: "Storyteller's Fire", chrysalis: 'The Chrysalis Pool',
    bridge: 'The Half-Built Bridge', hedgeSchool: 'Hedge School', reliquaryCairn: 'The Reliquary Cairn',
    stacks: 'The Stacks', wildShrine: 'Wild Shrine', reliquaryOfPages: 'Reliquary of Pages',
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
  if (object.kind === 'rewardPickup') return 'Something useful waits where it was left.';
  if (object.kind === 'guardian') return 'They have chosen this ground, and mean to keep it.';
  return MAP_OBJECT_FLAVOR[object.kind];
}

function objectMechanics(object: MapObject, state?: GameState): string[] {
  if (object.kind === 'mine') {
    const redirect = object.productionRedirect;
    const viewer = state?.activePlayer;
    const redirectLine = redirect && redirect.throughDay >= (state?.day ?? 0)
      && (viewer === redirect.originalOwner || viewer === redirect.recipient)
      ? viewer === redirect.originalOwner
        ? redirect.hidden
          ? `Production is redirected through day ${redirect.throughDay}; the recipient is concealed.`
          : `Production is redirected to ${state?.players[redirect.recipient].name ?? redirect.recipient} through day ${redirect.throughDay}.`
        : `Production is redirected to you through day ${redirect.throughDay}.`
      : null;
    return [`Produces ${object.income} ${object.resource} each day while owned.`,
      ...(redirectLine ? [redirectLine] : [])];
  }
  if (object.kind === 'pile') return [`Collect ${object.amount} ${object.resource}.`];
  if (object.kind === 'chest') return ['Choose gold, experience, or its item reward after defeating any guard.'];
  if (object.kind === 'shrine') return [`Teaches ${SPELLS[object.teaches].name}; each hero may visit once.`];
  if (object.kind === 'item') return [ITEMS[object.item.id].description];
  if (object.kind === 'rewardPickup') {
    const parts = [
      ...object.reward.artifacts?.map((artifact) => ARTIFACTS[artifact.id].name) ?? [],
      ...object.reward.items?.map((item) => ITEMS[item.id].name) ?? [],
      ...(['gold', 'timber', 'iron', 'essence'] as const).flatMap((resource) =>
        object.reward[resource] ? [`${object.reward[resource]} ${resource}`] : []),
      ...(object.reward.teachesSpell ? [`Teaches ${SPELLS[object.reward.teachesSpell].name}`] : []),
    ];
    return [`Collect ${parts.join(', ')}.`];
  }
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
    reliquaryCairn: [
      'Trade an artifact for a different relic.',
      'Its seeded tier-1–3 Spell Tome is a globally single-claim pickup; artifact exchange remains repeatable.',
    ], tollGate: ['Pay the posted toll or fight the Keeper.'], omenStone: ['Reveals next week’s omen.'],
    stacks: ['Once per hero: pay 3 essence, then keep one of three seeded spells no higher than your best owned Mage Guild.'],
    wildShrine: ['Once per hero: learn one seeded unknown spell, weighted toward higher tiers.'],
    reliquaryOfPages: ['Globally unique: learn its setup-seeded tier-4 spell.'],
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
    treeSecondThoughts: ['Pay 1500 gold per level to gain one level.'], warmTable: ['Weekly: +10 morale next battle.'],
    coldSpring: ['Weekly: +400 movement today.'], idolOfSomebody: ['Weekly: +1 luck next battle.'],
    wishingWell: ['Throw one gold for a tiny seeded boon.'], mercenaryCamp: ['Hire a seeded weekly neutral company.'],
    wagonCamp: ['Buy one seeded consumable weekly.'], titheBarn: ['Pay 1000 gold for +10% town growth this week.'],
    patientStone: ['Reveals a Cache sketch fragment.'], cache: ['Spend the full day digging on the exact tile.'],
    obstacle: ['An authored impassable terrain prop.'],
  } as Record<string, readonly string[]>)[object.kind] ?? ['A place with its own terms.'])];
}

export function inspectTarget(state: GameState, target: InspectionTarget): InspectionCard | null {
  if (target.kind === 'knack') {
    const definition = KNACKS[target.id as FactionId];
    return definition ? {
      name: definition.name, flavor: definition.flavor,
      mechanics: ([1, 2, 3] as const).map((rank) =>
        `Rank ${rank} (level ${definition.ranks[rank].level}): ${definition.ranks[rank].effectText}`),
    } : null;
  }
  if (target.kind === 'decoration') {
    const decoration = deriveTerrainDecorations(state.map).find((item) => item.id === target.id);
    return decoration ? {
      name: titleCase(decoration.kind), flavor: decoration.label,
      mechanics: [], terrain: true,
    } : null;
  }
  if (target.kind === 'terrain') {
    const terrain = TERRAIN[target.id as TerrainId];
    return terrain ? {
      name: terrain.label, flavor: terrain.flavor, mechanics: [
        Number.isFinite(terrain.moveCost) ? `Base movement cost: ${terrain.moveCost}.`
          : terrain.id === 'water' ? 'Impassable on foot; travel by boat.' : 'Impassable.',
        `Native faction: ${terrain.nativeFaction ? FACTIONS[terrain.nativeFaction].name : 'none'}.`,
        `Magic resonance: ${terrain.resonance
          ? terrain.resonance[0].toUpperCase() + terrain.resonance.slice(1) : 'none'}.`,
        `Battlefield: ${titleCase(terrain.battlefieldTemplate)}.`,
      ], terrain: true,
    } : null;
  }
  if (target.kind === 'battleTile') {
    const tile = BATTLE_TILE_TYPES[target.id as keyof typeof BATTLE_TILE_TYPES];
    return tile ? {
      name: tile.name, flavor: tile.flavor, mechanics: battleTileRuleSummary(tile), terrain: true,
    } : null;
  }
  if (target.kind === 'object') {
    const object = state.map.objects.find((candidate) => candidate.id === target.id);
    if (!object) return null;
    if (object.kind === 'guardian') {
      const intel = guardianIntel(state, object);
      const protectedObject = state.map.objects.find((candidate) => candidate.id === object.protects);
      const protectedCastle = state.castles.find((candidate) => candidate.id === object.protects);
      const protectedName = protectedObject ? mapObjectName(protectedObject)
        : protectedCastle ? CASTLE_NAMES[protectedCastle.faction]
          : 'the surrounding road';
      return {
        name: intel?.label ?? 'Guardian Company',
        flavor: objectFlavor(object), learned: true,
        mechanics: [
          `Guards ${protectedName} and engages on adjacent tiles.`,
          ...(intel?.units.map((unit) => `${unit.label} ${unit.name}`) ?? []),
          ...(intel?.abilities.map((id) => {
            const ability = ABILITY_PRESENTATION[id];
            return `${ability.name}: ${ability.description}`;
          }) ?? []),
          ...(intel?.protectedRewardId ? [`Protected reward: ${
            state.map.objects.find((candidate) => candidate.id === intel.protectedRewardId)
              ? mapObjectName(state.map.objects.find((candidate) => candidate.id === intel.protectedRewardId)!)
              : state.castles.some((candidate) => candidate.id === intel.protectedRewardId)
                ? 'City' : intel.protectedRewardId
          }.`] : []),
        ],
      };
    }
    const learned = state.players[state.activePlayer].discoveredObjectKinds.includes(object.kind);
    return { name: mapObjectName(object), flavor: objectFlavor(object), mechanics: learned ? objectMechanics(object, state) : [], learned };
  }
  if (target.kind === 'castle') {
    const castle = state.castles.find((candidate) => candidate.id === target.id);
    if (!castle) return null;
    const faction = FACTIONS[castle.faction];
    const passive = FACTION_PASSIVES[castle.faction];
    const owner = castle.owner === 'neutral' ? 'Neutral'
      : state.players[castle.owner]?.name ?? castle.owner;
    const buildings = castle.buildings.map((id) => buildingPresentation(id, castle.faction).name);
    const garrison = castle.garrison.flatMap((stack) => stack
      ? [`${stack.count} ${UNITS[stack.unitId].name}`] : []);
    return {
      name: `${CASTLE_NAMES[castle.faction]} · ${castle.variant === 'freeTown' ? 'Free Town' : faction.name}`,
      flavor: castle.flavor?.trim() || faction.flavor,
      mechanics: [
        `Owner: ${owner}`,
        `${passive.name}: ${passive.description}`,
        `Magic schools: ${faction.schools.map((school) => school[0].toUpperCase() + school.slice(1)).join(' and ')}`,
        `Buildings: ${buildings.join(', ') || 'none'}`,
        `Garrison: ${garrison.join(', ') || 'empty'}`,
      ],
    };
  }
  if (target.kind === 'unit') {
    const unit = UNITS[target.id as UnitId]; if (!unit) return null;
    const acquisition = NEUTRAL_CREATURE_ACQUISITION.find((row) => row.unitId === unit.id);
    return { name: unit.name, flavor: unit.flavor, mechanics: [
      `Tier ${unit.tier} · ${titleCase(unit.faction)} culture · HP ${unit.hp} · Damage ${unit.damage.join('–')}`,
      `Attack ${unit.attack} · Defense ${unit.defense} · Speed ${unit.speed}`,
      `Footprint ${unit.hexSize} hex${unit.hexSize === 1 ? '' : 'es'}`,
      `Growth ${unit.growth} · Cost ${costs(unit.cost)}`,
      ...(unit.caster ? [`Caster repertoire: ${unit.caster.repertoire.map((id) =>
        SPELLS[id].name).join(', ')} · ${unit.caster.charges} company charges · Spell Power ${unit.caster.castPower}`] : []),
      ...(acquisition ? [
        `Field dwelling: ${acquisition.dwellingName}`,
        `Acquisition: ${acquisition.channels.map(titleCase).join(', ')} · mixed-culture armies take the ordinary morale penalty.`,
      ] : []),
      ...unit.abilities.map((id) => {
        const ability = ABILITY_PRESENTATION[id];
        return `${ability.name}: ${ability.description}`;
      }),
      ...(unit.abilities.length ? [] : ['Abilities: none']),
    ] };
  }
  if (target.kind === 'building') {
    const [id, faction] = target.id.split('@') as [BuildingId, FactionId?];
    const presentationFaction = faction ?? state.players[state.activePlayer].faction;
    const building = buildingPresentation(id, presentationFaction);
    if (!building) return null;
    const prerequisites = buildingPrerequisites(id);
    return { name: building.name, flavor: building.flavor, mechanics: [building.function, `Cost: ${costs(building.cost)}`, `Requires: ${prerequisites.length ? prerequisites.map((required) => buildingPresentation(required, presentationFaction).name).join(' and ') : 'none'}`] };
  }
  if (target.kind === 'spell' || target.kind === 'enchantment') {
    const spell = SPELLS[target.id as SpellId]; if (!spell) return null;
    return { name: spell.name, flavor: spell.flavor, mechanics: [`${spell.mana} mana · ${spellCategory(spell.id)}`, `Standard: ${spell.base}`, `Upgraded: ${spell.plus}`] };
  }
  if (target.kind === 'artifact') {
    const artifact = ARTIFACTS[target.id as ArtifactId]; if (!artifact) return null;
    const set = artifact.setId ? ARTIFACT_SETS[artifact.setId] : null;
    return {
      name: artifact.name, flavor: artifact.flavor,
      mechanics: [
        `${ARTIFACT_CLASS_NAMES[artifact.class]} · Equips in ${ARTIFACT_SLOT_NAMES[artifact.slot]}`, artifact.description,
        ...(artifact.burdenRemoval ? [`Cannot be unequipped. Remove: ${artifact.burdenRemoval}`] : []),
        ...(set ? [
          `${set.name} · ${set.memberIds.map((id) => ARTIFACTS[id as ArtifactId].name).join(' · ')}`,
          ...set.bonuses.map((bonus) => `${bonus.pieces}/${set.memberIds.length}: ${bonus.description}`),
        ] : []),
      ],
    };
  }
  if (target.kind === 'item') {
    const item = ITEMS[target.id as ItemId]; if (!item) return null;
    return { name: item.name, flavor: item.flavor, mechanics: [`Use timing: ${titleCase(item.use)}`, item.description] };
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
  if (target.kind === 'ability') {
    const ability = ABILITY_PRESENTATION[target.id as AbilityId];
    return ability ? { name: ability.name, flavor: 'A practiced battlefield distinction.', mechanics: [ability.description] } : null;
  }
  if (target.kind === 'omen') {
    const omen = OMENS[target.id as OmenId]; if (!omen) return null;
    return { name: omen.title, flavor: omen.flavor, mechanics: omenEffectSummary(omen) };
  }
  return null;
}

export function inspectionAttributes(kind: InspectionKind, id: string) {
  return { 'data-inspect-kind': kind, 'data-inspect-id': id };
}
