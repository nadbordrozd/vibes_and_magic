import { ARTIFACTS } from '../../content/artifacts';
import { BUILDINGS, buildingBelongsToFaction } from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import { HEROES } from '../../content/heroes';
import { ITEMS } from '../../content/items';
import { MAP_OBJECT_KINDS } from '../../content/mapObjectRegistry';
import { SKILLS } from '../../content/skills';
import { SPELLS } from '../../content/spells';
import { TERRAIN } from '../../content/terrain';
import { UNITS } from '../../content/units';
import { adventurePropByName } from '../../content/adventureProps';
import { PLAYER_IDS } from '../types';
import { CITY_ENTRANCE, CITY_FOOTPRINT } from '../map/occupancy';
import { EDITOR_CATALOG_HASH, LEGACY_3X2_EDITOR_CATALOG_HASH } from './catalog';
import { EDITOR_CASTLE_VARIANTS_BY_FACTION, isEditorArmyUnitId } from './defaults';
import type {
  EditorDiagnosticStage, EditorDiagnosticTarget, EditorMapDiagnostic, EditorMapDocument,
  EditorMapObject, JsonObject,
} from './types';
import {
  EDITOR_MAP_DOCUMENT_TYPE, EDITOR_MAP_SCHEMA_VERSION,
} from './types';

const TOP_LEVEL_FIELDS = new Set([
  'documentType', 'schemaVersion', 'id', 'revision', 'metadata', 'compatibility',
  'dimensions', 'tiles', 'overlays', 'players', 'castles', 'heroes', 'objects',
  'guardians', 'rewards', 'victory', 'defeat', 'source',
]);
const CONTROLLERS = new Set(['human', 'ai', 'dormant']);
const RESOURCE_IDS = new Set(['gold', 'timber', 'iron', 'essence']);
const OBJECT_KINDS = new Set<string>(MAP_OBJECT_KINDS.filter((kind) =>
  kind !== 'guardian' && kind !== 'rewardPickup'));
/** Portable reward carriers are shared by validation and every authoring client. */
export const REWARD_SITE_KINDS = [
  'lock', 'shipwreck', 'sirenRocks', 'ruinedWatchtower', 'oldBearsCave', 'wolfHollow',
  'unquietYard', 'moltingCourt', 'spoolHoard', 'skeletonGrass', 'coldCampfire',
  'shepherdsLeanTo', 'overgrownCart', 'cache',
] as const satisfies readonly EditorMapObject['kind'][];
const REWARD_SITE_KIND_SET = new Set<string>(REWARD_SITE_KINDS);

export const AUTHORABLE_OBJECT_PROPERTY_FIELDS: Record<string, readonly string[]> = {
  mine: ['resource', 'income', 'owner'], pile: ['resource', 'amount'], chest: [],
  shrine: ['school', 'teaches'], item: ['item'], richVein: ['owner', 'income', 'days'],
  waystation: [], lock: ['name', 'tell'], dwelling: ['unitId', 'available'],
  tinkersCart: ['route', 'stock'], monastery: [], gloamingRing: [],
  storyteller: [], chrysalis: [], bridge: ['opens'], hedgeSchool: [], reliquaryCairn: [],
  tollGate: [], omenStone: [], crone: [], barrowField: ['scroll'], boat: ['owner'],
  manaSpring: [], flotsam: ['timber', 'gold'], sealedCask: [],
  castaway: ['item', 'story'], messageBottle: ['rumour'], whirlpool: ['pairedId'],
  shipwreck: [], drownedBell: [], sirenRocks: [], lighthouse: ['owner'],
  watermill: ['owner', 'rareResource'], windmill: ['owner', 'rareResource'],
  tradingCamp: ['owner', 'rareResource'], sparringStone: [], listeningStones: [],
  longDraught: [], grinningIdol: [], hutOnTheHill: ['skill', 'route'],
  treeSecondThoughts: [], warmTable: [], coldSpring: [], idolOfSomebody: [],
  wishingWell: [], ruinedWatchtower: ['recruitUnitId'], oldBearsCave: ['recruitUnitId'],
  wolfHollow: ['recruitUnitId'], unquietYard: ['recruitUnitId'],
  moltingCourt: ['recruitUnitId'], spoolHoard: ['recruitUnitId'],
  mercenaryCamp: ['roster'], wagonCamp: ['stock'], titheBarn: [], skeletonGrass: [],
  coldCampfire: [], shepherdsLeanTo: [], overgrownCart: [], patientStone: ['cacheId'], cache: [],
  obstacle: ['prop', 'anomaly'],
};

const OBJECT_REQUIRED_FIELDS: Record<string, readonly string[]> = {
  mine: ['resource', 'income'], pile: ['resource', 'amount'], shrine: ['school', 'teaches'],
  item: ['item'], richVein: ['income', 'days'], lock: ['name', 'tell'], dwelling: ['unitId'],
  tinkersCart: ['route'], barrowField: ['scroll'], flotsam: ['timber', 'gold'],
  castaway: ['story'], messageBottle: ['rumour'], whirlpool: ['pairedId'],
  hutOnTheHill: ['skill'], mercenaryCamp: ['roster'], patientStone: ['cacheId'],
  obstacle: ['prop'],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isFiniteInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
const isPositiveInteger = (value: unknown): value is number => isFiniteInteger(value) && value > 0;
const isEntityId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(value);
const isMapDocumentId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

function unsafeJsonPath(value: unknown, path = '$', seen = new Set<object>()): string | null {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? null : path;
  if (typeof value !== 'object') return path;
  if (seen.has(value as object)) return path;
  seen.add(value as object);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) return path;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const unsafe = unsafeJsonPath(value[index], `${path}[${index}]`, seen);
      if (unsafe) return unsafe;
    }
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) return `${path}.${key}`;
      const unsafe = unsafeJsonPath(child, `${path}.${key}`, seen);
      if (unsafe) return unsafe;
    }
  }
  seen.delete(value as object);
  return null;
}

export function validateEditorMapDocument(value: unknown): EditorMapDiagnostic[] {
  const diagnostics: EditorMapDiagnostic[] = [];
  const report = (
    code: string, message: string, stage: EditorDiagnosticStage = 'structure',
    target: EditorDiagnosticTarget = { kind: 'document' },
    severity: EditorMapDiagnostic['severity'] = 'error',
  ) => diagnostics.push({ code, severity, stage, target, message });

  const unsafe = unsafeJsonPath(value);
  if (unsafe) {
    report('schema.json.unsafe', `Value at ${unsafe} is not safe portable JSON.`, 'schema',
      { kind: 'document', path: unsafe });
    return diagnostics;
  }
  if (!isRecord(value)) {
    report('schema.document.object', 'Map document must be a JSON object.', 'schema');
    return diagnostics;
  }
  for (const key of Object.keys(value)) if (!TOP_LEVEL_FIELDS.has(key)) {
    report('schema.field.unknown', `Unknown top-level field: ${key}.`, 'schema',
      { kind: 'document', path: key });
  }
  if (value.documentType !== EDITOR_MAP_DOCUMENT_TYPE) {
    report('schema.document_type.invalid', `Expected documentType "${EDITOR_MAP_DOCUMENT_TYPE}".`,
      'schema', { kind: 'document', path: 'documentType' });
  }
  if (!isFiniteInteger(value.schemaVersion)) {
    report('schema.version.invalid', 'schemaVersion must be an integer.', 'schema',
      { kind: 'document', path: 'schemaVersion' });
  } else if (value.schemaVersion !== EDITOR_MAP_SCHEMA_VERSION) {
    report('schema.version.unsupported', `Schema version ${value.schemaVersion} is not supported.`,
      'schema', { kind: 'document', path: 'schemaVersion' });
  }

  if (!isMapDocumentId(value.id)) report('map.id.invalid', 'Map ID must be a lowercase kebab-case slug.',
    'structure', { kind: 'document', path: 'id' });
  if (!isPositiveInteger(value.revision)) report('map.revision.invalid',
    'Revision must be a positive integer.', 'structure', { kind: 'document', path: 'revision' });

  if (!isRecord(value.metadata)) report('schema.metadata.invalid', 'metadata must be an object.',
    'schema', { kind: 'document', path: 'metadata' });
  else {
    const allowed = new Set(['name', 'description', 'author', 'style']);
    for (const key of Object.keys(value.metadata)) if (!allowed.has(key)) report(
      'schema.field.unknown', `Unknown metadata field: ${key}.`, 'schema',
      { kind: 'document', path: `metadata.${key}` });
    for (const key of allowed) if (typeof value.metadata[key] !== 'string') report(
      'schema.metadata.field', `metadata.${key} must be a string.`, 'schema',
      { kind: 'document', path: `metadata.${key}` });
  }
  if (!isRecord(value.compatibility) || typeof value.compatibility.catalogHash !== 'string') {
    report('schema.compatibility.invalid', 'compatibility.catalogHash must be a string.', 'schema',
      { kind: 'document', path: 'compatibility' });
  } else if (value.compatibility.catalogHash !== EDITOR_CATALOG_HASH) {
    report('compatibility.catalog.mismatch',
      `Map catalog ${value.compatibility.catalogHash} differs from installed ${EDITOR_CATALOG_HASH}.`,
      'compatibility', { kind: 'document', path: 'compatibility.catalogHash' }, 'warning');
    if (value.compatibility.catalogHash === LEGACY_3X2_EDITOR_CATALOG_HASH
        && Array.isArray(value.castles) && value.castles.length > 0) report(
      'compatibility.city_geometry.migration_required',
      'This map uses the former 3×2 settlement anchors. Run “Migrate cities to 5×2”; each anchor will move one cell west to preserve its gate, then resolve any reported bounds or overlaps.',
      'compatibility', { kind: 'document', path: 'castles' });
  }

  let width = -1; let height = -1;
  if (!isRecord(value.dimensions)
      || !isPositiveInteger(value.dimensions.width)
      || !isPositiveInteger(value.dimensions.height)) {
    report('map.dimensions.invalid', 'Map width and height must be positive integers.', 'structure',
      { kind: 'document', path: 'dimensions' });
  } else { width = value.dimensions.width; height = value.dimensions.height; }
  const inBounds = (coord: Record<string, unknown>) => isFiniteInteger(coord.x)
    && isFiniteInteger(coord.y) && coord.x >= 0 && coord.y >= 0 && coord.x < width && coord.y < height;
  const validateCoord = (coord: unknown, target: EditorDiagnosticTarget, path: string) => {
    if (!isRecord(coord) || !isFiniteInteger(coord.x) || !isFiniteInteger(coord.y)) {
      report('map.coordinate.invalid', 'Coordinate must contain finite integer x and y.', 'structure',
        { ...target, path } as EditorDiagnosticTarget); return false;
    }
    if (!inBounds(coord)) {
      report('map.coordinate.out_of_bounds', `Coordinate ${coord.x},${coord.y} is outside the map.`,
        'structure', { ...target, path } as EditorDiagnosticTarget); return false;
    }
    return true;
  };
  const validateFields = (
    record: Record<string, unknown>, allowed: readonly string[], target: EditorDiagnosticTarget,
  ) => {
    const accepted = new Set(allowed);
    for (const key of Object.keys(record)) if (!accepted.has(key)) report(
      'schema.field.unknown', `Unknown field: ${key}.`, 'schema',
      { ...target, path: key } as EditorDiagnosticTarget);
  };
  const validateFootprint = (
    entity: Record<string, unknown>, target: EditorDiagnosticTarget,
    defaultFootprint: { w: number; h: number }, defaultEntrance: { dx: number; dy: number },
  ) => {
    const footprint = entity.footprint === undefined ? defaultFootprint : entity.footprint;
    const entrance = entity.entrance === undefined ? defaultEntrance : entity.entrance;
    if (!isRecord(footprint) || !isPositiveInteger(footprint.w) || !isPositiveInteger(footprint.h)) {
      report('entity.footprint.invalid', 'Footprint width and height must be positive integers.',
        'structure', target); return;
    }
    if (!isRecord(entrance) || !isFiniteInteger(entrance.dx) || !isFiniteInteger(entrance.dy)
        || entrance.dx < 0 || entrance.dy < 0
        || entrance.dx >= footprint.w || entrance.dy >= footprint.h) {
      report('entity.entrance.invalid', 'Entrance must be an integer offset inside the footprint.',
        'structure', target);
    }
    if (isRecord(entity.position) && isFiniteInteger(entity.position.x)
        && isFiniteInteger(entity.position.y)
        && (entity.position.x + footprint.w > width || entity.position.y + footprint.h > height)) {
      report('entity.footprint.out_of_bounds', 'Entity footprint leaves the map.', 'structure', target);
    }
  };

  if (!Array.isArray(value.tiles)) report('map.tiles.invalid', 'tiles must be an array.', 'structure',
    { kind: 'document', path: 'tiles' });
  else {
    if (height >= 0 && value.tiles.length !== height) report('map.tiles.height',
      `Expected ${height} tile rows, found ${value.tiles.length}.`, 'structure',
      { kind: 'document', path: 'tiles' });
    value.tiles.forEach((row, y) => {
      if (!Array.isArray(row)) {
        report('map.tiles.row', `Tile row ${y} must be an array.`, 'structure',
          { kind: 'document', path: `tiles[${y}]` }); return;
      }
      if (width >= 0 && row.length !== width) report('map.tiles.width',
        `Expected ${width} tiles in row ${y}, found ${row.length}.`, 'structure',
        { kind: 'document', path: `tiles[${y}]` });
      row.forEach((cell, x) => {
        if (!isRecord(cell) || typeof cell.terrain !== 'string') {
          report('map.tile.invalid', 'Tile must be an object containing terrain.', 'structure',
            { kind: 'cell', x, y }); return;
        }
        const terrain = TERRAIN[cell.terrain as keyof typeof TERRAIN];
        if (!terrain) report('catalog.terrain.unknown', `Unknown terrain: ${cell.terrain}.`, 'catalog',
          { kind: 'cell', x, y, path: 'terrain' });
        else if (cell.skin !== undefined
          && (typeof cell.skin !== 'string' || !terrain.skins.includes(cell.skin as never))) {
          report('catalog.terrain.skin_invalid',
            `Skin ${String(cell.skin)} is not valid for ${cell.terrain}.`, 'catalog',
            { kind: 'cell', x, y, path: 'skin' });
        }
        for (const key of Object.keys(cell)) if (!['terrain', 'skin'].includes(key)) report(
          'schema.field.unknown', `Unknown tile field: ${key}.`, 'schema',
          { kind: 'cell', x, y, path: key });
      });
    });
  }

  if (!isRecord(value.overlays)) report('map.overlays.invalid', 'overlays must be an object.',
    'structure', { kind: 'document', path: 'overlays' });
  else for (const overlay of ['roads', 'seams']) {
    const cells = value.overlays[overlay];
    if (!Array.isArray(cells)) {
      report('map.overlay.invalid', `${overlay} must be an array.`, 'structure',
        { kind: 'document', path: `overlays.${overlay}` }); continue;
    }
    const seen = new Set<string>();
    cells.forEach((coord, index) => {
      if (validateCoord(coord, { kind: 'document' }, `overlays.${overlay}[${index}]`)
          && isRecord(coord)) {
        const key = `${coord.x},${coord.y}`;
        if (seen.has(key)) report('map.overlay.duplicate', `Duplicate ${overlay} cell ${key}.`,
          'structure', { kind: 'cell', x: coord.x as number, y: coord.y as number });
        seen.add(key);
      }
    });
  }

  const arrays = ['players', 'castles', 'heroes', 'objects', 'guardians', 'rewards'] as const;
  for (const key of arrays) if (!Array.isArray(value[key])) report('schema.collection.invalid',
    `${key} must be an array.`, 'schema', { kind: 'document', path: key });

  const players = Array.isArray(value.players) ? value.players : [];
  const expectedSlots = PLAYER_IDS.slice(0, players.length);
  if (players.length > 6) report('player.slots.count', 'Maps support at most six player slots.',
    'structure', { kind: 'document', path: 'players' });
  const playerIds = new Set<string>();
  players.forEach((player, index) => {
    if (!isRecord(player)) { report('player.invalid', `Player ${index} must be an object.`, 'schema'); return; }
    const target: EditorDiagnosticTarget = { kind: 'entity', entityId: String(player.id ?? `player-${index}`) };
    validateFields(player, ['id', 'controller', 'faction', 'name'], target);
    if (player.id !== expectedSlots[index]) report('player.slots.noncontiguous',
      `Slot ${index + 1} must be ${expectedSlots[index] ?? 'absent'}.`, 'structure', target);
    if (typeof player.id === 'string') {
      if (playerIds.has(player.id)) report('player.slots.duplicate',
        `Player slot ${player.id} is duplicated.`, 'structure', target);
      playerIds.add(player.id);
    }
    if (!CONTROLLERS.has(player.controller as string)) report('player.controller.invalid',
      `Unknown controller: ${String(player.controller)}.`, 'catalog', target);
    if (!Object.hasOwn(FACTIONS, String(player.faction))) report('catalog.faction.unknown',
      `Unknown faction: ${String(player.faction)}.`, 'catalog', target);
    if (player.name !== undefined && typeof player.name !== 'string') report(
      'player.name.invalid', 'Player name must be a string.', 'structure', target);
  });

  const entityIds = new Set<string>();
  const registerEntity = (entity: Record<string, unknown>, collection: string, index: number) => {
    const id = entity.id;
    const target: EditorDiagnosticTarget = { kind: 'entity', entityId: String(id ?? `${collection}-${index}`) };
    if (!isEntityId(id)) report('entity.id.invalid',
      'Entity ID must begin with a letter and contain only letters, digits, hyphens, or underscores.',
      'structure', target);
    else if (entityIds.has(id)) report('entity.id.duplicate', `Duplicate entity ID: ${id}.`,
      'structure', target);
    else entityIds.add(id);
    return target;
  };
  const validateArmy = (
    army: unknown, target: EditorDiagnosticTarget, emptyAllowed: boolean,
    emptyCode = 'hero.army.empty', emptyMessage = 'A starting hero needs a nonempty army.',
    allowRandomTier = false,
  ) => {
    if (!Array.isArray(army)) { report('army.invalid', 'Army must be an array.', 'structure', target); return; }
    if (!emptyAllowed && army.length === 0) report(emptyCode, emptyMessage, 'playable', target);
    if (army.length > 7) report('army.too_many_stacks', 'An army may contain at most seven stacks.',
      'structure', target);
    army.forEach((stack, index) => {
      if (!isRecord(stack)) { report('army.stack.invalid', `Army stack ${index} is invalid.`, 'structure', target); return; }
      const allowedStackFields = allowRandomTier
        ? new Set(['unitId', 'randomTier', 'count']) : new Set(['unitId', 'count']);
      for (const key of Object.keys(stack)) if (!allowedStackFields.has(key)) report(
        'army.stack.field.unsupported', `Army stack ${index + 1} does not support ${key}.`,
        'structure', { ...target, path: `army[${index}].${key}` } as EditorDiagnosticTarget);
      const hasUnit = typeof stack.unitId === 'string';
      const hasRandomTier = stack.randomTier !== undefined;
      if (allowRandomTier && hasRandomTier) {
        if (hasUnit || typeof stack.randomTier !== 'number'
            || !Number.isInteger(stack.randomTier)
            || ![1, 2, 3, 4, 5, 6].includes(stack.randomTier)) report(
          'guardian.army.random_tier.invalid',
          `Stack ${index + 1} random tier must be one integer from 1 through 6 and cannot also name a creature.`,
          'structure', { ...target, path: `army[${index}].randomTier` } as EditorDiagnosticTarget);
      } else if (!Object.hasOwn(UNITS, String(stack.unitId))) report('catalog.unit.unknown',
        `Unknown creature: ${String(stack.unitId)}.`, 'catalog', { ...target, path: `army[${index}].unitId` } as EditorDiagnosticTarget);
      if (!isPositiveInteger(stack.count)) report('army.stack.count',
        `Stack ${index + 1} count must be a positive integer.`, 'structure',
        { ...target, path: `army[${index}].count` } as EditorDiagnosticTarget);
    });
  };

  const castles = Array.isArray(value.castles) ? value.castles : [];
  castles.forEach((castle, index) => {
    if (!isRecord(castle)) { report('castle.invalid', `City ${index} must be an object.`, 'schema'); return; }
    const target = registerEntity(castle, 'castle', index);
    validateFields(castle, [
      'id', 'position', 'owner', 'faction', 'footprint', 'entrance', 'buildings',
      'bannedBuildings', 'available', 'garrison', 'guildDeck', 'variant', 'vault', 'flavor',
    ], target);
    validateCoord(castle.position, target, 'position');
    validateFootprint(castle, target, CITY_FOOTPRINT, CITY_ENTRANCE);
    if (castle.footprint !== undefined && (!isRecord(castle.footprint)
        || castle.footprint.w !== CITY_FOOTPRINT.w
        || castle.footprint.h !== CITY_FOOTPRINT.h)) report(
      'castle.footprint.noncanonical', 'Cities use the canonical 5×2 footprint.',
      'catalog', target);
    if (castle.entrance !== undefined && (!isRecord(castle.entrance)
        || castle.entrance.dx !== CITY_ENTRANCE.dx
        || castle.entrance.dy !== CITY_ENTRANCE.dy)) report(
      'castle.entrance.noncanonical', 'City entrance must be bottom-center at +2,+1.',
      'catalog', target);
    if (castle.owner !== 'neutral' && !playerIds.has(String(castle.owner))) report(
      'reference.owner.unknown', `City owner ${String(castle.owner)} is not a declared slot.`,
      'reference', target);
    if (!Object.hasOwn(FACTIONS, String(castle.faction))) report('catalog.faction.unknown',
      `Unknown city faction: ${String(castle.faction)}.`, 'catalog', target);
    if (castle.variant !== undefined) {
      const variants = EDITOR_CASTLE_VARIANTS_BY_FACTION[
        String(castle.faction) as keyof typeof EDITOR_CASTLE_VARIANTS_BY_FACTION
      ];
      if (typeof castle.variant !== 'string' || !variants?.includes(castle.variant as never)) report(
        'castle.variant.unknown',
        `Variant ${String(castle.variant)} has no native ${String(castle.faction)} city.`,
        'catalog', { ...target, path: 'variant' } as EditorDiagnosticTarget);
    }
    if (castle.garrison !== undefined) {
      validateArmy(castle.garrison, target, true);
      if (Array.isArray(castle.garrison)) {
        const units = castle.garrison.flatMap((stack) => isRecord(stack)
          && typeof stack.unitId === 'string' ? [stack.unitId] : []);
        if (new Set(units).size !== units.length) report('castle.garrison.duplicate_unit',
          'City garrison must combine duplicate creature stacks.', 'structure', target);
      }
    }
    if (castle.available !== undefined && (!Array.isArray(castle.available)
      || castle.available.length !== 6 || castle.available.some((count) =>
        !isFiniteInteger(count) || count < 0))) report('castle.available.invalid',
      'City availability must contain six nonnegative integer tier counts.',
      'structure', target);
    for (const key of ['buildings', 'bannedBuildings']) if (castle[key] !== undefined) {
      if (!Array.isArray(castle[key])) report('castle.buildings.invalid', `${key} must be an array.`,
        'structure', target);
      else {
        const seen = new Set<string>();
        (castle[key] as unknown[]).forEach((building) => {
        if (seen.has(String(building))) report('castle.buildings.duplicate',
          `${key} contains duplicate building ${String(building)}.`, 'structure', target);
        seen.add(String(building));
        if (!Object.hasOwn(BUILDINGS, String(building))) report('catalog.building.unknown',
          `Unknown building: ${String(building)}.`, 'catalog', target);
        else if (Object.hasOwn(FACTIONS, String(castle.faction))
            && !buildingBelongsToFaction(building as keyof typeof BUILDINGS,
              castle.faction as keyof typeof FACTIONS)) report('castle.building.faction_mismatch',
          `${String(building)} is not available to ${String(castle.faction)}.`, 'catalog', target);
        });
      }
    }
    if (Array.isArray(castle.buildings) && Array.isArray(castle.bannedBuildings)) {
      const built = new Set(castle.buildings.map(String));
      const conflict = castle.bannedBuildings.find((building) => built.has(String(building)));
      if (conflict !== undefined) report('castle.building.built_and_banned',
        `${String(conflict)} cannot be both built and banned.`, 'structure', target);
    }
    if (castle.guildDeck !== undefined) {
      if (!Array.isArray(castle.guildDeck)
          || castle.guildDeck.length > Object.keys(SPELLS).length) report(
        'castle.guild.invalid', 'City guild deck must be a bounded canonical spell list.',
        'structure', target);
      else {
        const seen = new Set<string>();
        castle.guildDeck.forEach((spell) => {
          if (!Object.hasOwn(SPELLS, String(spell))) report('catalog.spell.unknown',
            `Unknown guild spell: ${String(spell)}.`, 'catalog', target);
          if (seen.has(String(spell))) report('castle.guild.duplicate_spell',
            `Guild deck contains duplicate spell ${String(spell)}.`, 'structure', target);
          seen.add(String(spell));
        });
      }
    }
    if (castle.vault !== undefined) {
      if (!isRecord(castle.vault)) report('castle.vault.invalid',
        'City vault must be a resource object.', 'structure', target);
      else {
        if ([...RESOURCE_IDS].some((resource) => !Object.hasOwn(castle.vault!, resource))) report(
          'castle.vault.invalid', 'City vault must state all four resource amounts.',
          'structure', target);
        for (const [resource, amount] of Object.entries(castle.vault)) {
          if (!RESOURCE_IDS.has(resource) || !isFiniteInteger(amount) || amount < 0) report(
            'castle.vault.invalid', `Invalid city vault entry ${resource}.`, 'structure', target);
        }
      }
    }
    if (castle.flavor !== undefined && (typeof castle.flavor !== 'string'
        || !castle.flavor.trim())) report('castle.flavor.invalid',
      'Explicit city flavor must be nonempty text.', 'structure', target);
  });

  const heroes = Array.isArray(value.heroes) ? value.heroes : [];
  heroes.forEach((hero, index) => {
    if (!isRecord(hero)) { report('hero.invalid', `Hero ${index} must be an object.`, 'schema'); return; }
    const target = registerEntity(hero, 'hero', index);
    validateFields(hero, [
      'id', 'definitionId', 'owner', 'faction', 'position', 'army', 'level', 'xp',
      'stats', 'skills', 'knownSpells', 'upgradedSpells',
    ], target);
    validateCoord(hero.position, target, 'position');
    if (!playerIds.has(String(hero.owner))) report('reference.owner.unknown',
      `Hero owner ${String(hero.owner)} is not a declared slot.`, 'reference', target);
    const faction = FACTIONS[String(hero.faction) as keyof typeof FACTIONS];
    if (!faction) report('catalog.faction.unknown', `Unknown hero faction: ${String(hero.faction)}.`,
      'catalog', target);
    const definition = HEROES[String(hero.definitionId) as keyof typeof HEROES];
    if (!definition) report('catalog.hero.unknown', `Unknown hero: ${String(hero.definitionId)}.`,
      'catalog', target);
    else if (definition.faction !== hero.faction) report('hero.definition.faction_mismatch',
      `${definition.id} belongs to ${definition.faction}, not ${String(hero.faction)}.`,
      'catalog', target);
    validateArmy(hero.army, target, false);
    if (Array.isArray(hero.army)) {
      const units = hero.army.flatMap((stack) => isRecord(stack)
        && typeof stack.unitId === 'string' ? [stack.unitId] : []);
      if (new Set(units).size !== units.length) report('hero.army.duplicate_unit',
        'Starting hero armies must combine duplicate creature stacks.', 'structure', target);
      hero.army.forEach((stack, stackIndex) => {
        if (isRecord(stack) && typeof stack.unitId === 'string'
            && Object.hasOwn(UNITS, stack.unitId) && !isEditorArmyUnitId(stack.unitId)) report(
          'hero.army.unit_not_authorable',
          `${UNITS[stack.unitId as keyof typeof UNITS].name} is a battlefield construct, not an army creature.`,
          'catalog', { ...target, path: `army[${stackIndex}].unitId` } as EditorDiagnosticTarget,
        );
      });
    }
    if (hero.level !== undefined && !isPositiveInteger(hero.level)) report('hero.level.invalid',
      'Hero level must be a positive integer.', 'structure', target);
    if (hero.xp !== undefined && (!isFiniteInteger(hero.xp) || hero.xp < 0)) report(
      'hero.xp.invalid', 'Hero XP must be a nonnegative integer.', 'structure', target);
    if (isRecord(hero.skills)) for (const [skill, rank] of Object.entries(hero.skills)) {
      if (!Object.hasOwn(SKILLS, skill)) report('catalog.skill.unknown', `Unknown skill: ${skill}.`,
        'catalog', target);
      if (![1, 2, 3].includes(rank as number)) report('hero.skill.rank',
        `Skill ${skill} has invalid rank ${String(rank)}.`, 'structure', target);
    }
    if (isRecord(hero.stats)) for (const [stat, amount] of Object.entries(hero.stats)) {
      if (!['attack', 'defense', 'spellPower', 'knowledge', 'luck', 'moraleBonus'].includes(stat)
          || !isFiniteInteger(amount)) report('hero.stats.invalid',
        `Invalid hero stat override ${stat}.`, 'structure', target);
    }
    for (const field of ['knownSpells', 'upgradedSpells']) if (hero[field] !== undefined) {
      if (!Array.isArray(hero[field])) report('hero.spells.invalid', `${field} must be an array.`,
        'structure', target);
      else (hero[field] as unknown[]).forEach((spell) => {
        if (!Object.hasOwn(SPELLS, String(spell))) report('catalog.spell.unknown',
          `Unknown spell: ${String(spell)}.`, 'catalog', target);
      });
    }
  });

  const objects = Array.isArray(value.objects) ? value.objects : [];
  const objectById = new Map<string, Record<string, unknown>>();
  objects.forEach((object, index) => {
    if (!isRecord(object)) { report('object.invalid', `Object ${index} must be an object.`, 'schema'); return; }
    const target = registerEntity(object, 'object', index);
    validateFields(object, [
      'id', 'kind', 'position', 'flavorHint', 'footprint', 'entrance', 'properties',
    ], target);
    if (typeof object.id === 'string') objectById.set(object.id, object);
    validateCoord(object.position, target, 'position');
    validateFootprint(object, target,
      object.kind === 'mine' ? { w: 2, h: 1 } : { w: 1, h: 1 }, { dx: 0, dy: 0 });
    if (!OBJECT_KINDS.has(String(object.kind))) report('catalog.object_kind.unknown',
      `Unknown map object kind: ${String(object.kind)}.`, 'catalog', target);
    if (!isRecord(object.properties)) report('object.properties.invalid',
      'Object properties must be a JSON object.', 'structure', target);
    else {
      const allowed = new Set(AUTHORABLE_OBJECT_PROPERTY_FIELDS[String(object.kind)] ?? []);
      for (const key of Object.keys(object.properties)) if (!allowed.has(key)) report(
        'object.property.unsupported', `${String(object.kind)} does not support property ${key}.`,
        'catalog', { ...target, path: `properties.${key}` } as EditorDiagnosticTarget);
      for (const key of OBJECT_REQUIRED_FIELDS[String(object.kind)] ?? []) {
        if (object.properties[key] === undefined) report('object.property.required',
          `${String(object.kind)} requires property ${key}.`, 'catalog',
          { ...target, path: `properties.${key}` } as EditorDiagnosticTarget);
      }
      validateObjectCatalogReferences(
        String(object.kind), object.properties as JsonObject, target, report,
      );
      for (const key of ['income', 'amount', 'days']) if (object.properties[key] !== undefined
          && !isPositiveInteger(object.properties[key])) report('object.property.positive_integer',
        `${String(object.kind)} ${key} must be a positive integer.`, 'structure',
        { ...target, path: `properties.${key}` } as EditorDiagnosticTarget);
      if (object.properties.available !== undefined
          && (!isFiniteInteger(object.properties.available) || object.properties.available < 0)) {
        report('object.property.nonnegative_integer', 'Dwelling availability must be a nonnegative integer.',
          'structure', { ...target, path: 'properties.available' } as EditorDiagnosticTarget);
      }
      for (const key of ['timber', 'gold']) if (object.kind === 'flotsam'
          && (!isFiniteInteger(object.properties[key]) || object.properties[key] < 0)) report(
        'object.property.nonnegative_integer', `Flotsam ${key} must be a nonnegative integer.`,
        'structure', { ...target, path: `properties.${key}` } as EditorDiagnosticTarget);
      if (object.properties.owner !== undefined && object.properties.owner !== null
          && !playerIds.has(String(object.properties.owner))) report('reference.owner.unknown',
        `Object owner ${String(object.properties.owner)} is not a declared slot.`, 'reference', target);
      if (object.properties.rareResource === 'gold') report('object.property.rare_resource',
        'Rare-resource production must use timber, iron, or essence, not gold.', 'catalog', target);
      if (object.properties.school !== undefined
          && !['rite', 'craft', 'grave', 'wild'].includes(String(object.properties.school))) report(
        'catalog.spell_school.unknown', `Unknown spell school: ${String(object.properties.school)}.`,
        'catalog', target);
      if (object.kind === 'shrine' && typeof object.properties.teaches === 'string'
          && Object.hasOwn(SPELLS, object.properties.teaches)
          && SPELLS[object.properties.teaches as keyof typeof SPELLS].school !== object.properties.school) {
        report('object.shrine.school_mismatch',
          `${SPELLS[object.properties.teaches as keyof typeof SPELLS].name} is not a ${String(object.properties.school)} spell.`,
          'catalog', target);
      }
      for (const key of ['route', 'opens']) if (object.properties[key] !== undefined) {
        const route = object.properties[key];
        if (!Array.isArray(route) || !route.length) report('object.route.empty',
          `${String(object.kind)} ${key} needs at least one cell.`, 'structure', target);
        else route.forEach((coord, routeIndex) => validateCoord(coord, target,
          `properties.${key}[${routeIndex}]`));
      }
      if (object.kind === 'obstacle' && typeof object.properties.prop === 'string') {
        const definition = adventurePropByName(object.properties.prop);
        if (!definition) report('catalog.adventure_prop.unknown',
          `Unknown authored adventure prop: ${object.properties.prop}.`, 'catalog', target);
        else {
          const footprint = isRecord(object.footprint) ? object.footprint : { w: 1, h: 1 };
          if (footprint.w !== definition.footprint.w || footprint.h !== definition.footprint.h) {
            report('object.prop.footprint_mismatch',
              `${definition.label} requires a ${definition.footprint.w}×${definition.footprint.h} footprint.`,
              'catalog', target);
          }
        }
      }
    }
  });

  const guardians = Array.isArray(value.guardians) ? value.guardians : [];
  const guardianById = new Map<string, Record<string, unknown>>();
  guardians.forEach((guardian, index) => {
    if (!isRecord(guardian)) { report('guardian.invalid', `Guardian ${index} must be an object.`, 'schema'); return; }
    const target = registerEntity(guardian, 'guardian', index);
    if (typeof guardian.id === 'string') guardianById.set(guardian.id, guardian);
    validateFields(guardian,
      ['id', 'position', 'army', 'split', 'static', 'protects', 'drop'], target);
    validateCoord(guardian.position, target, 'position');
    validateArmy(guardian.army, target, false, 'guardian.army.empty',
      'A guardian needs at least one creature stack.', true);
    if (Array.isArray(guardian.army)) {
      const creatures = guardian.army.flatMap((stack) => isRecord(stack)
        ? typeof stack.unitId === 'string' ? [`unit:${stack.unitId}`]
          : typeof stack.randomTier === 'number' && Number.isInteger(stack.randomTier)
            && [1, 2, 3, 4, 5, 6].includes(stack.randomTier)
            ? [`random-tier:${stack.randomTier}`] : [] : []);
      if (new Set(creatures).size !== creatures.length) report('guardian.army.duplicate_unit',
        'Guardian armies must use each creature or random-tier placeholder at most once.',
        'structure', target);
    }
    if (typeof guardian.split !== 'boolean' || typeof guardian.static !== 'boolean') report(
      'guardian.flags.invalid', 'Guardian split and static fields must be booleans.', 'structure', target);
    if (guardian.protects !== null && !isEntityId(guardian.protects)) report(
      'guardian.protects.invalid', 'Guardian protects must be an entity ID or null.', 'structure', target);
    if (guardian.drop !== null) validateItem(guardian.drop, target, report);
  });

  const rewards = Array.isArray(value.rewards) ? value.rewards : [];
  const rewardById = new Map<string, Record<string, unknown>>();
  rewards.forEach((reward, index) => {
    if (!isRecord(reward)) { report('reward.invalid', `Reward ${index} must be an object.`, 'schema'); return; }
    const target = registerEntity(reward, 'reward', index);
    if (typeof reward.id === 'string') rewardById.set(reward.id, reward);
    validateFields(reward, ['id', 'delivery', 'bundle'], target);
    if (!isRecord(reward.delivery)
      || !['pickup', 'site'].includes(String(reward.delivery.kind))) report(
      'reward.delivery.invalid', 'Reward delivery must be pickup or site.', 'structure', target);
    else if (reward.delivery.kind === 'pickup') {
      validateFields(reward.delivery, ['kind', 'position'], target);
      validateCoord(reward.delivery.position, target, 'delivery.position');
    } else validateFields(reward.delivery, ['kind', 'objectId'], target);
    if (!isRecord(reward.bundle)) report('reward.bundle.invalid',
      'Reward bundle must be an object.', 'structure', target);
    else {
      validateFields(reward.bundle,
        ['artifacts', 'items', 'resources', 'teachesSpell'], target);
      validateRewardBundle(reward.bundle, target, report);
    }
  });

  guardians.forEach((guardian) => {
    if (!isRecord(guardian) || guardian.protects === null || typeof guardian.protects !== 'string') return;
    if (!entityIds.has(guardian.protects)) report(
      'reference.guard_target.missing', `Guardian target ${guardian.protects} does not exist.`,
      'reference', { kind: 'entity', entityId: String(guardian.id) });
    else if (!objectById.has(guardian.protects) && !rewardById.has(guardian.protects)) report(
      'reference.guard_target.incompatible',
      `Guardian target ${guardian.protects} is not a compatible portable object or reward record.`,
      'reference', { kind: 'entity', entityId: String(guardian.id) });
  });
  rewards.forEach((reward) => {
    if (!isRecord(reward) || !isRecord(reward.delivery) || reward.delivery.kind !== 'site') return;
    const carrier = objectById.get(String(reward.delivery.objectId));
    const target: EditorDiagnosticTarget = { kind: 'entity', entityId: String(reward.id) };
    if (!carrier) report('reference.reward_site.missing',
      `Reward site ${String(reward.delivery.objectId)} does not exist.`, 'reference', target);
    else if (!REWARD_SITE_KIND_SET.has(String(carrier.kind))) report('reward.site.unsupported',
      `${String(carrier.kind)} cannot carry a reward bundle.`, 'catalog', target);
  });
  const siteRewardCounts = new Map<string, number>();
  rewards.forEach((reward) => {
    if (!isRecord(reward) || !isRecord(reward.delivery) || reward.delivery.kind !== 'site') return;
    const objectId = String(reward.delivery.objectId);
    siteRewardCounts.set(objectId, (siteRewardCounts.get(objectId) ?? 0) + 1);
  });
  for (const [objectId, count] of siteRewardCounts) if (count > 1) report(
    'reward.site.duplicate', `Reward site ${objectId} has ${count} linked rewards; only one is legal.`,
    'reference', { kind: 'entity', entityId: objectId });
  for (const object of objects) {
    if (!isRecord(object) || !REWARD_SITE_KIND_SET.has(String(object.kind))) continue;
    const linked = rewards.some((reward) => isRecord(reward) && isRecord(reward.delivery)
      && reward.delivery.kind === 'site' && reward.delivery.objectId === object.id);
    if (!linked) report('reference.reward_site.required',
      `${String(object.kind)} requires a linked portable reward before it can be played.`,
      'reference', { kind: 'entity', entityId: String(object.id) });
  }
  objects.forEach((object) => {
    if (!isRecord(object) || object.kind !== 'whirlpool' || !isRecord(object.properties)) return;
    const pair = objectById.get(String(object.properties.pairedId));
    if (!pair || pair.kind !== 'whirlpool') report('reference.whirlpool_pair.missing',
      `Whirlpool pair ${String(object.properties.pairedId)} does not exist.`, 'reference',
      { kind: 'entity', entityId: String(object.id) });
    else if (pair.id === object.id || !isRecord(pair.properties)
      || pair.properties.pairedId !== object.id) report('reference.whirlpool_pair.nonreciprocal',
      `Whirlpool ${String(object.id)} and ${String(pair.id)} must link to each other.`, 'reference',
      { kind: 'entity', entityId: String(object.id) });
  });
  objects.forEach((object) => {
    if (!isRecord(object) || object.kind !== 'patientStone' || !isRecord(object.properties)) return;
    const cache = objectById.get(String(object.properties.cacheId));
    if (!cache || cache.kind !== 'cache') report('reference.cache.missing',
      `Cache ${String(object.properties.cacheId)} does not exist.`, 'reference',
      { kind: 'entity', entityId: String(object.id) });
  });
  const cacheIds = objects.filter((object) => isRecord(object) && object.kind === 'cache')
    .map((object) => String(object.id));
  for (const cacheId of cacheIds) {
    const stoneCount = objects.filter((object) => isRecord(object) && object.kind === 'patientStone'
      && isRecord(object.properties) && object.properties.cacheId === cacheId).length;
    if (stoneCount < 3 || stoneCount > 6) report('reference.cache.stone_count',
      `Cache ${cacheId} needs three to six linked Patient Stones; found ${stoneCount}.`,
      'reference', { kind: 'entity', entityId: cacheId });
  }

  const occupied = new Map<string, string>();
  const heroOccupied = new Map<string, string>();
  const occupy = (
    entity: Record<string, unknown>, defaultFootprint: { w: number; h: number },
  ) => {
    if (!isRecord(entity.position) || !isFiniteInteger(entity.position.x)
        || !isFiniteInteger(entity.position.y)) return;
    const authored = isRecord(entity.footprint) ? entity.footprint : defaultFootprint;
    if (!isPositiveInteger(authored.w) || !isPositiveInteger(authored.h)) return;
    for (let dy = 0; dy < authored.h; dy += 1) for (let dx = 0; dx < authored.w; dx += 1) {
      const key = `${entity.position.x + dx},${entity.position.y + dy}`;
      const prior = occupied.get(key);
      if (prior) report('entity.overlap', `${String(entity.id)} overlaps ${prior} at ${key}.`,
        'playable', { kind: 'entity', entityId: String(entity.id) });
      else occupied.set(key, String(entity.id));
    }
  };
  castles.forEach((castle) => { if (isRecord(castle)) occupy(castle, CITY_FOOTPRINT); });
  heroes.forEach((hero) => {
    if (!isRecord(hero) || !isRecord(hero.position)
        || !isFiniteInteger(hero.position.x) || !isFiniteInteger(hero.position.y)) return;
    const heroX = hero.position.x;
    const heroY = hero.position.y;
    const heroOwner = hero.owner;
    const key = `${heroX},${heroY}`;
    const ownCastleEntrance = castles.some((castle) => {
      if (!isRecord(castle) || castle.owner !== heroOwner || !isRecord(castle.position)
          || !isFiniteInteger(castle.position.x) || !isFiniteInteger(castle.position.y)) return false;
      return castle.position.x + CITY_ENTRANCE.dx === heroX
        && castle.position.y + CITY_ENTRANCE.dy === heroY;
    });
    const priorHero = heroOccupied.get(key);
    if (priorHero) report('entity.overlap', `${String(hero.id)} overlaps ${priorHero} at ${key}.`,
      'playable', { kind: 'entity', entityId: String(hero.id) });
    else if (!ownCastleEntrance) occupy(hero, { w: 1, h: 1 });
    heroOccupied.set(key, String(hero.id));
  });
  objects.forEach((object) => {
    if (isRecord(object) && object.kind !== 'cache') occupy(
      object, object.kind === 'mine' ? { w: 2, h: 1 } : { w: 1, h: 1 },
    );
  });
  guardians.forEach((guardian) => { if (isRecord(guardian)) occupy(guardian, { w: 1, h: 1 }); });
  rewards.forEach((reward) => {
    if (isRecord(reward) && isRecord(reward.delivery) && reward.delivery.kind === 'pickup') {
      occupy({ id: reward.id, position: reward.delivery.position }, { w: 1, h: 1 });
    }
  });

  validateObjective(value.victory, 'victory', objectById, guardianById, report);
  if (value.defeat !== null) validateObjective(
    value.defeat, 'defeat', objectById, guardianById, report,
  );
  if (value.source !== null && !isRecord(value.source)) report('schema.source.invalid',
    'source must be null or a provenance object.', 'schema', { kind: 'document', path: 'source' });
  else if (isRecord(value.source)) {
    if (value.source.kind === 'builtIn') {
      validateFields(value.source, ['kind', 'mapId'], { kind: 'document', path: 'source' });
      if (typeof value.source.mapId !== 'string' || !value.source.mapId) report(
        'source.builtin.invalid', 'Built-in provenance needs a mapId.', 'structure',
        { kind: 'document', path: 'source.mapId' });
    } else if (value.source.kind === 'local') {
      validateFields(value.source, ['kind', 'documentId', 'revision'],
        { kind: 'document', path: 'source' });
      if (!isMapDocumentId(value.source.documentId) || !isPositiveInteger(value.source.revision)) report(
        'source.local.invalid', 'Local provenance needs a document ID and positive revision.',
        'structure', { kind: 'document', path: 'source' });
    } else report('source.kind.invalid', `Unknown source kind: ${String(value.source.kind)}.`,
      'structure', { kind: 'document', path: 'source.kind' });
  }

  if (isRecord(value.metadata) && typeof value.metadata.name === 'string'
      && !value.metadata.name.trim()) report('playable.name.required',
    'A playable map needs a name.', 'playable', { kind: 'document', path: 'metadata.name' });
  const active = players.filter((player) => isRecord(player) && player.controller !== 'dormant');
  if (!active.length) report('playable.active_player.required',
    'A playable map needs at least one non-dormant player.', 'playable',
    { kind: 'document', path: 'players' });
  for (const player of active) {
    const hasStart = castles.some((castle) => isRecord(castle) && castle.owner === player.id)
      || heroes.some((hero) => isRecord(hero) && hero.owner === player.id);
    if (!hasStart) report('playable.player_start.required',
      `${String(player.id)} needs an owned starting hero or city.`, 'playable',
      { kind: 'entity', entityId: String(player.id) });
  }
  return diagnostics;
}

function validateItem(
  value: unknown,
  target: EditorDiagnosticTarget,
  report: (code: string, message: string, stage?: EditorDiagnosticStage,
    target?: EditorDiagnosticTarget, severity?: EditorMapDiagnostic['severity']) => void,
) {
  if (!isRecord(value) || !Object.hasOwn(ITEMS, String(value.id))) {
    report('catalog.item.unknown', `Unknown item: ${isRecord(value) ? String(value.id) : String(value)}.`,
      'catalog', target); return;
  }
  const allowed = new Set(['id', 'plus', 'origin', 'storedSpellId']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) report(
    'item.instance.field.unsupported', `Item instances do not support ${key}.`, 'catalog', target);
  if (value.plus !== undefined && typeof value.plus !== 'boolean') report(
    'item.instance.plus.invalid', 'Scroll plus state must be a boolean.', 'structure', target);
  if (value.origin !== undefined && (!isRecord(value.origin)
      || !isFiniteInteger(value.origin.x) || !isFiniteInteger(value.origin.y))) report(
    'item.instance.origin.invalid', 'Item origin must contain integer x and y.', 'structure', target);
  if (value.id === 'tradeGoods' && value.origin === undefined) report(
    'item.instance.origin.required', 'Trade Goods require their pickup origin.', 'structure', target);
  const definition = ITEMS[String(value.id) as keyof typeof ITEMS];
  if (value.plus !== undefined && definition.behavior !== 'scroll') report(
    'item.instance.plus.unsupported', `${definition.name} does not store scroll plus state.`,
    'catalog', target);
  if (value.origin !== undefined && value.id !== 'tradeGoods') report(
    'item.instance.origin.unsupported', `${definition.name} does not store a pickup origin.`,
    'catalog', target);
  if (value.storedSpellId !== undefined && value.id !== 'spellScroll') report(
    'item.instance.stored_spell.unsupported', `${definition.name} has a fixed effect and does not store a spell.`,
    'catalog', target);
  if (definition.behavior === 'scroll' && definition.id === 'spellScroll'
      && typeof value.storedSpellId !== 'string') report(
    'item.instance.stored_spell.required', 'A generic Spell Scroll requires a stored spell.',
    'structure', target);
  if (value.storedSpellId !== undefined && !Object.hasOwn(SPELLS, String(value.storedSpellId))) {
    report('catalog.spell.unknown', `Unknown stored spell: ${String(value.storedSpellId)}.`,
      'catalog', target);
  }
}

function validateObjectCatalogReferences(
  kind: string,
  properties: JsonObject,
  target: EditorDiagnosticTarget,
  report: (code: string, message: string, stage?: EditorDiagnosticStage,
    target?: EditorDiagnosticTarget, severity?: EditorMapDiagnostic['severity']) => void,
) {
  if (properties.resource !== undefined && !RESOURCE_IDS.has(String(properties.resource))) report(
    'catalog.resource.unknown', `Unknown resource: ${String(properties.resource)}.`, 'catalog', target);
  if (properties.rareResource !== undefined && !RESOURCE_IDS.has(String(properties.rareResource))) report(
    'catalog.resource.unknown', `Unknown resource: ${String(properties.rareResource)}.`, 'catalog', target);
  for (const field of ['unitId', 'recruitUnitId']) if (properties[field] !== undefined
      && !Object.hasOwn(UNITS, String(properties[field]))) report('catalog.unit.unknown',
    `Unknown creature: ${String(properties[field])}.`, 'catalog', target);
  if (properties.teaches !== undefined && !Object.hasOwn(SPELLS, String(properties.teaches))) report(
    'catalog.spell.unknown', `Unknown spell: ${String(properties.teaches)}.`, 'catalog', target);
  if (properties.skill !== undefined && !Object.hasOwn(SKILLS, String(properties.skill))) report(
    'catalog.skill.unknown', `Unknown skill: ${String(properties.skill)}.`, 'catalog', target);
  for (const field of ['item', 'scroll', 'stock']) if (properties[field] !== undefined
      && properties[field] !== null) validateItem(properties[field], target, report);
  if (kind === 'mercenaryCamp' && Array.isArray(properties.roster)) {
    properties.roster.forEach((stack) => {
      if (!isRecord(stack) || !Object.hasOwn(UNITS, String(stack.unitId))) report(
        'catalog.unit.unknown', `Unknown mercenary creature: ${isRecord(stack) ? String(stack.unitId) : String(stack)}.`,
        'catalog', target);
      else if (!isPositiveInteger(stack.count)) report('army.stack.count',
        'Mercenary stack count must be a positive integer.', 'structure', target);
    });
  }
}

function validateRewardBundle(
  bundle: Record<string, unknown>,
  target: EditorDiagnosticTarget,
  report: (code: string, message: string, stage?: EditorDiagnosticStage,
    target?: EditorDiagnosticTarget, severity?: EditorMapDiagnostic['severity']) => void,
) {
  const artifacts = Array.isArray(bundle.artifacts) ? bundle.artifacts : [];
  const items = Array.isArray(bundle.items) ? bundle.items : [];
  if (!Array.isArray(bundle.artifacts) || !Array.isArray(bundle.items) || !isRecord(bundle.resources)
      || !(bundle.teachesSpell === null || typeof bundle.teachesSpell === 'string')) report(
    'reward.bundle.shape', 'Reward bundle needs artifacts, items, resources, and teachesSpell.',
    'structure', target);
  artifacts.forEach((artifact) => {
    if (!isRecord(artifact) || !Object.hasOwn(ARTIFACTS, String(artifact.id))) report(
      'catalog.artifact.unknown', `Unknown artifact: ${isRecord(artifact) ? String(artifact.id) : String(artifact)}.`,
      'catalog', target);
    else {
      for (const key of Object.keys(artifact)) if (!['id', 'chosenSchool'].includes(key)) report(
        'artifact.instance.field.unsupported', `Artifact instances do not support ${key}.`,
        'catalog', target);
      if (artifact.chosenSchool !== undefined
          && !['rite', 'craft', 'grave', 'wild'].includes(String(artifact.chosenSchool))) report(
        'artifact.instance.school.invalid', 'Artifact chosenSchool must be a canonical school.',
        'catalog', target);
      if (artifact.chosenSchool !== undefined && artifact.id !== 'seamstone') report(
        'artifact.instance.school.unsupported',
        `${ARTIFACTS[String(artifact.id) as keyof typeof ARTIFACTS].name} does not store a chosen school.`,
        'catalog', target);
    }
  });
  items.forEach((item) => validateItem(item, target, report));
  let positiveResource = false;
  if (isRecord(bundle.resources)) for (const [resource, amount] of Object.entries(bundle.resources)) {
    if (!RESOURCE_IDS.has(resource)) report('catalog.resource.unknown',
      `Unknown reward resource: ${resource}.`, 'catalog', target);
    if (!isPositiveInteger(amount)) report('reward.resource.amount',
      `Reward ${resource} must be a positive integer.`, 'structure', target);
    else positiveResource = true;
  }
  if (typeof bundle.teachesSpell === 'string' && !Object.hasOwn(SPELLS, bundle.teachesSpell)) report(
    'catalog.spell.unknown', `Unknown taught spell: ${bundle.teachesSpell}.`, 'catalog', target);
  if (!artifacts.length && !items.length && !positiveResource && bundle.teachesSpell === null) report(
    'reward.bundle.empty', 'Reward bundle must contain at least one reward.', 'playable', target);
}

function validateObjective(
  value: unknown,
  label: string,
  objects: Map<string, Record<string, unknown>>,
  guardians: Map<string, Record<string, unknown>>,
  report: (code: string, message: string, stage?: EditorDiagnosticStage,
    target?: EditorDiagnosticTarget, severity?: EditorMapDiagnostic['severity']) => void,
) {
  if (!isRecord(value) || !['conquest', 'hold', 'assemble', 'slay', 'none'].includes(String(value.type))) {
    report('objective.invalid', `${label} objective is invalid.`, 'structure',
      { kind: 'document', path: label }); return;
  }
  if (typeof value.flavor !== 'string' || typeof value.mechanics !== 'string') report(
    'objective.text.invalid', `${label} flavor and mechanics must be strings.`, 'structure',
    { kind: 'document', path: label });
  else if (!value.flavor.trim() || !value.mechanics.trim()) report('playable.objective_text.required',
    `${label} flavor and mechanics are required for play.`, 'playable',
    { kind: 'document', path: label });
  const targetExists = typeof value.objectId === 'string'
    && (objects.has(value.objectId) || (value.type === 'slay' && guardians.has(value.objectId)));
  if ((value.type === 'hold' || value.type === 'slay') && !targetExists) report(
    'reference.objective_target.missing', `${label} target ${String(value.objectId)} does not exist.`,
    'reference', { kind: 'document', path: `${label}.objectId` });
  if (value.type === 'hold' && !isPositiveInteger(value.days)) report('objective.days.invalid',
    'Hold objective days must be a positive integer.', 'structure',
    { kind: 'document', path: `${label}.days` });
  if (value.type === 'assemble' && (typeof value.setId !== 'string' || !value.setId.trim())) report(
    'objective.set.invalid', 'Assemble objective needs a set ID.', 'structure',
    { kind: 'document', path: `${label}.setId` });
}
