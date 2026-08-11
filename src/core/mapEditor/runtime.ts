import type { GuardianReward, MapObject, Resources, TerrainTile } from '../types';
import type { GameMap, ItemInstance } from '../types';
import { emptyArmy, makeArmy } from '../army';
import { createInitialCastle, createInitialHero } from '../game/setup';
import { CITY_ENTRANCE, CITY_FOOTPRINT } from '../map/occupancy';
import { logisticsRate } from '../heroBehaviors';
import { HERO_MOVE_POINTS } from '../../content/constants';
import { cloneEditorMapDocument } from './codec';
import { hashEditorMapDocument } from './codec';
import { encodeLocalMapReference, isLegacyBuiltInMapId } from '../mapReference';
import type {
  EditorMapDocument, EditorMapObject, EditorRewardBundle, EditorRuntimeConversion,
  JsonObject, JsonValue,
} from './types';
import { EditorMapCodecError } from './codec';
import { validateEditorMapDocument } from './validation';
import { AUTHORABLE_OBJECT_PROPERTY_FIELDS } from './validation';
import { resolveEditorGuardianStack } from './defaults';

const jsonClone = <T>(value: T): T => structuredClone(value);

function runtimeDefaults(kind: EditorMapObject['kind']): JsonObject {
  switch (kind) {
    case 'mine': return { owner: null, cleared: false, chartered: false };
    case 'pile': case 'item': case 'barrowField': case 'flotsam': case 'sealedCask':
    case 'castaway': case 'messageBottle': return { collected: false };
    case 'chest': return { cleared: false, collected: false };
    case 'shrine': return { cleared: false, visitedBy: [] };
    case 'richVein': return { owner: null, flaggedOnDay: null, depleted: false };
    case 'waystation': return { visitedOnDay: {} };
    case 'lock': case 'shipwreck': return { cleared: false };
    case 'dwelling': return { available: 0, lastGrowthWeek: 1 };
    case 'tinkersCart': return { routeIndex: 0, stock: null, stockWeek: 0 };
    case 'monastery': return { firstVisitorId: null, blessings: {} };
    case 'gloamingRing': return { deposit: null };
    case 'storyteller': case 'chrysalis': case 'manaSpring': case 'crone':
    case 'warmTable': case 'coldSpring': case 'idolOfSomebody': case 'wishingWell':
      return { visitedWeek: {} };
    case 'bridge': return { completed: false };
    case 'hedgeSchool': case 'omenStone': case 'drownedBell': case 'sparringStone':
    case 'listeningStones': case 'longDraught': case 'grinningIdol':
    case 'treeSecondThoughts': return { visitedBy: [] };
    case 'tollGate': return { paidBy: [], cleared: false };
    case 'boat': return { owner: null, occupiedBy: null };
    case 'sirenRocks': return { cleared: false, approachedBy: [] };
    case 'lighthouse': case 'watermill': case 'windmill': case 'tradingCamp':
      return { owner: null };
    case 'hutOnTheHill': return { visitedBy: [] };
    case 'ruinedWatchtower': case 'oldBearsCave': case 'wolfHollow':
    case 'unquietYard': case 'moltingCourt': case 'spoolHoard': return { cleared: false };
    case 'mercenaryCamp': return { stockWeek: 0 };
    case 'wagonCamp': return { stockWeek: 0, stock: null };
    case 'titheBarn': return { usedWeek: {} };
    case 'skeletonGrass': case 'coldCampfire': case 'shepherdsLeanTo':
    case 'overgrownCart': return { searched: false };
    case 'patientStone': return { revealedBy: [] };
    case 'cache': return { hidden: true, dug: false };
    default: return {};
  }
}

function bundleToRuntime(bundle: EditorRewardBundle): GuardianReward {
  return {
    ...(bundle.resources.gold ? { gold: bundle.resources.gold } : {}),
    ...(bundle.resources.timber ? { timber: bundle.resources.timber } : {}),
    ...(bundle.resources.iron ? { iron: bundle.resources.iron } : {}),
    ...(bundle.resources.essence ? { essence: bundle.resources.essence } : {}),
    ...(bundle.items.length ? { items: bundle.items.map((item) => ({ ...item })) } : {}),
    ...(bundle.artifacts.length
      ? { artifacts: bundle.artifacts.map((artifact) => ({ ...artifact })) } : {}),
    ...(bundle.teachesSpell ? { teachesSpell: bundle.teachesSpell } : {}),
  };
}

function runtimeObject(object: EditorMapObject): MapObject {
  return {
    ...runtimeDefaults(object.kind),
    ...jsonClone(object.properties),
    id: object.id,
    kind: object.kind,
    position: { ...object.position },
    ...(object.flavorHint ? { flavorHint: object.flavorHint } : {}),
    ...(object.footprint ? { footprint: { ...object.footprint } } : {}),
    ...(object.entrance ? { entrance: { ...object.entrance } } : {}),
  } as MapObject;
}

export interface EditorRuntimeConversionOptions {
  /** Draft tools can request map/setup materialization before playable lint is clean. */
  requirePlayable?: boolean;
}

/** Pure conversion to fresh runtime map and explicit setup inputs. */
export function convertEditorMapDocument(
  source: EditorMapDocument,
  seed: number,
  options: EditorRuntimeConversionOptions = {},
): EditorRuntimeConversion {
  const document = cloneEditorMapDocument(source);
  const diagnostics = validateEditorMapDocument(document).filter((diagnostic) =>
    diagnostic.severity === 'error'
    && (options.requirePlayable !== false || diagnostic.stage !== 'playable'));
  if (diagnostics.length) throw new EditorMapCodecError(diagnostics);

  const rewardById = new Map(document.rewards.map((reward) => [reward.id, reward]));
  const runtimeProtectionTarget = (target: string) => {
    const reward = rewardById.get(target);
    return reward?.delivery.kind === 'site' ? reward.delivery.objectId : target;
  };
  const guardedBy = new Map<string, string[]>();
  for (const guardian of document.guardians) if (guardian.protects) {
    const target = runtimeProtectionTarget(guardian.protects);
    guardedBy.set(target, [
      ...(guardedBy.get(target) ?? []), guardian.id,
    ]);
  }
  const rewardsBySite = new Map(document.rewards.flatMap((reward) =>
    reward.delivery.kind === 'site' ? [[reward.delivery.objectId, reward] as const] : []));
  const objects: MapObject[] = document.objects.map((object) => {
    const runtime = runtimeObject(object);
    const reward = rewardsBySite.get(object.id);
    return {
      ...runtime,
      ...(reward ? { reward: bundleToRuntime(reward.bundle) } : {}),
      ...(guardedBy.has(object.id) ? { guardedBy: guardedBy.get(object.id) } : {}),
    } as MapObject;
  });
  for (const reward of document.rewards) if (reward.delivery.kind === 'pickup') {
    objects.push({
      id: reward.id,
      kind: 'rewardPickup',
      position: { ...reward.delivery.position },
      reward: bundleToRuntime(reward.bundle),
      collected: false,
      ...(guardedBy.has(reward.id) ? { guardedBy: guardedBy.get(reward.id) } : {}),
    });
  }
  for (const guardian of document.guardians) {
    const resolvedArmy = guardian.army.map((stack, stackIndex) =>
      resolveEditorGuardianStack(stack, seed, guardian.id, stackIndex));
    objects.push({
    id: guardian.id, kind: 'guardian', position: { ...guardian.position },
    army: resolvedArmy.map((stack) => ({ ...stack })),
    originalArmy: resolvedArmy.map((stack) => ({ ...stack })),
    split: guardian.split,
    static: guardian.static,
    protects: guardian.protects ? runtimeProtectionTarget(guardian.protects) : undefined,
    drop: guardian.drop ? { ...guardian.drop } : undefined,
    stoodAsideFor: [],
  });
  }

  const map: GameMap = {
    id: document.source?.kind === 'builtIn' && isLegacyBuiltInMapId(document.source.mapId)
      ? document.source.mapId : encodeLocalMapReference({
        documentId: document.id,
        revision: document.revision,
        mapHash: hashEditorMapDocument(document),
      }),
    name: document.metadata.name,
    seed: seed >>> 0,
    width: document.dimensions.width,
    height: document.dimensions.height,
    terrain: document.tiles.map((row) => row.map((cell): TerrainTile => ({ ...cell }))),
    roads: document.overlays.roads.map((coord) => ({ ...coord })),
    seams: document.overlays.seams.map((coord) => ({ ...coord })),
    objects,
    victory: jsonClone(document.victory),
    ...(document.defeat ? { defeat: jsonClone(document.defeat) } : {}),
  };

  const castles = document.castles.map((authored) => {
    const footprint = authored.footprint ?? CITY_FOOTPRINT;
    const entrance = authored.entrance ?? CITY_ENTRANCE;
    const entrancePosition = {
      x: authored.position.x + entrance.dx,
      y: authored.position.y + entrance.dy,
    };
    const castle = createInitialCastle(
      authored.owner, authored.faction, seed >>> 0, entrancePosition, authored.id,
    );
    castle.position = { ...authored.position };
    castle.footprint = { ...footprint };
    castle.entrance = { ...entrance };
    if (authored.buildings) castle.buildings = [...authored.buildings];
    if (authored.bannedBuildings) castle.bannedBuildings = [...authored.bannedBuildings];
    if (authored.available) castle.available = [...authored.available];
    if (authored.garrison !== undefined) {
      castle.garrison = makeArmy(authored.garrison);
      castle.garrisonSource = 'explicit';
    } else if (authored.owner !== 'neutral') {
      castle.garrison = emptyArmy();
      castle.garrisonSource = 'explicit';
    } else {
      castle.garrisonSource = 'inherited';
    }
    if (authored.guildDeck) castle.guildDeck = [...authored.guildDeck];
    if (authored.variant) castle.variant = authored.variant;
    if (authored.vault) castle.vault = { ...authored.vault };
    if (authored.flavor) castle.flavor = authored.flavor;
    return castle;
  });
  const heroes = document.heroes.map((authored) => {
    const hero = createInitialHero(
      authored.owner, authored.faction, authored.definitionId, authored.position,
    );
    hero.id = authored.id;
    hero.army = makeArmy(authored.army);
    if (authored.level !== undefined) hero.level = authored.level;
    if (authored.xp !== undefined) hero.xp = authored.xp;
    if (authored.stats) Object.assign(hero, authored.stats);
    if (authored.skills) hero.skills = { ...authored.skills };
    if (authored.knownSpells) hero.knownSpells = [...authored.knownSpells];
    if (authored.upgradedSpells) hero.upgradedSpells = [...authored.upgradedSpells];
    hero.mana = hero.knowledge * 10;
    hero.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero)));
    return hero;
  });
  return {
    map,
    setup: {
      players: document.players.map((player) => ({ ...player })),
      castles,
      heroes,
      rewards: document.rewards.map((reward) => jsonClone(reward)),
    },
  };
}

export function runtimeRewardToBundle(reward: GuardianReward): EditorRewardBundle {
  return {
    artifacts: (reward.artifacts ?? []).map((artifact) => ({ ...artifact })),
    items: (reward.items ?? []).map((item) => ({ ...item })),
    resources: {
      ...(reward.gold ? { gold: reward.gold } : {}),
      ...(reward.timber ? { timber: reward.timber } : {}),
      ...(reward.iron ? { iron: reward.iron } : {}),
      ...(reward.essence ? { essence: reward.essence } : {}),
    },
    teachesSpell: reward.teachesSpell ?? null,
  };
}

export function objectPropertiesFromRuntime(object: MapObject): JsonObject {
  const copy = jsonClone(object) as unknown as Record<string, JsonValue | undefined>;
  const allowed = new Set(AUTHORABLE_OBJECT_PROPERTY_FIELDS[object.kind] ?? []);
  return Object.fromEntries(Object.entries(copy).filter(([key, value]) =>
    allowed.has(key) && value !== undefined)) as JsonObject;
}

export function itemFromRuntime(item: ItemInstance): ItemInstance { return { ...item }; }

export function resourcesFromRuntime(resources: Partial<Resources>): Partial<Resources> {
  return { ...resources };
}
