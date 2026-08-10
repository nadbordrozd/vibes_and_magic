import { ITEMS } from '../content/items';
import { MAP_OBJECT_KINDS } from '../content/mapObjectRegistry';
import { SKILLS } from '../content/skills';
import { SPELLS } from '../content/spells';
import { UNITS } from '../content/units';
import type { ItemId, MapObject, PlayerId, SpellSchool } from '../core/types';
import {
  editorEntityIds, stableEntityId, type EditorMapDocument, type EditorMapObject,
  type JsonObject, type JsonValue,
} from '../core/mapEditor';
import { REWARD_SITE_KINDS } from '../core/mapEditor/validation';
import {
  canPlaceEditorProp, editorFootprintCells, type EditorCell, type PropMutationResult,
} from './mapEditorTerrain';
import { createDefaultEditorItemInstance } from './mapEditorInstances';

export type EditorStructureKind = Exclude<MapObject['kind'], 'guardian' | 'obstacle' | 'rewardPickup'>;
export type StructureFieldKind =
  | 'text' | 'number' | 'resource' | 'owner' | 'school' | 'spell' | 'item'
  | 'unit' | 'skill' | 'cache' | 'route';

export interface StructureFieldDefinition {
  key: string;
  label: string;
  kind: StructureFieldKind;
  min?: number;
  help?: string;
}

export interface EditorStructureDefinition {
  kind: EditorStructureKind;
  label: string;
  group: 'Economy & capture' | 'Learning & recruiting' | 'Visits & services'
    | 'Guarded sites' | 'Information & topology' | 'Pickups & water';
  fields: readonly StructureFieldDefinition[];
  workflow?: 'whirlpool-pair' | 'cache-link';
}

const humanize = (value: string) => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/^./, (letter) => letter.toUpperCase());

const groups: Record<EditorStructureKind, EditorStructureDefinition['group']> = {
  mine: 'Economy & capture', richVein: 'Economy & capture', lighthouse: 'Economy & capture',
  watermill: 'Economy & capture', windmill: 'Economy & capture', tradingCamp: 'Economy & capture',
  shrine: 'Learning & recruiting', dwelling: 'Learning & recruiting', hedgeSchool: 'Learning & recruiting',
  hutOnTheHill: 'Learning & recruiting', mercenaryCamp: 'Learning & recruiting', chrysalis: 'Learning & recruiting',
  waystation: 'Visits & services', tinkersCart: 'Visits & services', monastery: 'Visits & services',
  gloamingRing: 'Visits & services', storyteller: 'Visits & services', bridge: 'Visits & services',
  reliquaryCairn: 'Visits & services', tollGate: 'Visits & services', crone: 'Visits & services',
  manaSpring: 'Visits & services', sparringStone: 'Visits & services', listeningStones: 'Visits & services',
  longDraught: 'Visits & services', grinningIdol: 'Visits & services', treeSecondThoughts: 'Visits & services',
  warmTable: 'Visits & services', coldSpring: 'Visits & services', idolOfSomebody: 'Visits & services',
  wishingWell: 'Visits & services', wagonCamp: 'Visits & services', titheBarn: 'Visits & services',
  lock: 'Guarded sites', shipwreck: 'Guarded sites', sirenRocks: 'Guarded sites',
  ruinedWatchtower: 'Guarded sites', oldBearsCave: 'Guarded sites', wolfHollow: 'Guarded sites',
  unquietYard: 'Guarded sites', moltingCourt: 'Guarded sites', spoolHoard: 'Guarded sites',
  omenStone: 'Information & topology', messageBottle: 'Information & topology',
  whirlpool: 'Information & topology', drownedBell: 'Information & topology', patientStone: 'Information & topology',
  cache: 'Information & topology', boat: 'Information & topology',
  pile: 'Pickups & water', chest: 'Pickups & water', item: 'Pickups & water',
  barrowField: 'Pickups & water', flotsam: 'Pickups & water', sealedCask: 'Pickups & water',
  castaway: 'Pickups & water', skeletonGrass: 'Pickups & water', coldCampfire: 'Pickups & water',
  shepherdsLeanTo: 'Pickups & water', overgrownCart: 'Pickups & water',
};

const field = (key: string, label: string, kind: StructureFieldKind, min?: number,
  help?: string): StructureFieldDefinition => ({ key, label, kind, min, help });

function fieldsFor(kind: EditorStructureKind): readonly StructureFieldDefinition[] {
  switch (kind) {
    case 'mine': return [field('resource', 'Resource', 'resource'), field('income', 'Daily income', 'number', 1), field('owner', 'Owner', 'owner')];
    case 'pile': return [field('resource', 'Resource', 'resource'), field('amount', 'Amount', 'number', 1)];
    case 'shrine': return [field('school', 'School', 'school'), field('teaches', 'Spell', 'spell')];
    case 'item': return [field('item', 'Item', 'item')];
    case 'richVein': return [field('income', 'Daily income', 'number', 1), field('days', 'Duration (days)', 'number', 1), field('owner', 'Owner', 'owner')];
    case 'lock': return [field('name', 'Site name', 'text'), field('tell', 'Visible tell', 'text')];
    case 'dwelling': return [field('unitId', 'Creature', 'unit'), field('available', 'Starting recruits', 'number', 0)];
    case 'tinkersCart': return [field('route', 'Moving route', 'route'), field('stock', 'Initial stock', 'item')];
    case 'bridge': return [field('opens', 'Opened cells', 'route')];
    case 'barrowField': return [field('scroll', 'Scroll', 'item')];
    case 'boat': case 'lighthouse': return [field('owner', 'Owner', 'owner')];
    case 'flotsam': return [field('timber', 'Timber', 'number', 0), field('gold', 'Gold', 'number', 0)];
    case 'castaway': return [field('story', 'Story', 'text'), field('item', 'Carried item', 'item')];
    case 'messageBottle': return [field('rumour', 'Rumour', 'text')];
    case 'whirlpool': return [];
    case 'watermill': case 'windmill': case 'tradingCamp': return [
      field('owner', 'Owner', 'owner'), field('rareResource', 'Rare resource', 'resource'),
    ];
    case 'hutOnTheHill': return [field('skill', 'Skill', 'skill'), field('route', 'Moving route', 'route')];
    case 'ruinedWatchtower': case 'oldBearsCave': case 'wolfHollow':
    case 'unquietYard': case 'moltingCourt': case 'spoolHoard':
      return [field('recruitUnitId', 'Recruitable creature', 'unit')];
    case 'mercenaryCamp': return [field('roster', 'Roster creature', 'unit')];
    case 'wagonCamp': return [field('stock', 'Initial stock', 'item')];
    case 'patientStone': return [field('cacheId', 'Linked Cache', 'cache')];
    default: return [];
  }
}

export const EDITOR_STRUCTURE_KINDS = MAP_OBJECT_KINDS.filter(
  (kind): kind is EditorStructureKind => kind !== 'guardian' && kind !== 'obstacle'
    && kind !== 'rewardPickup',
);

export const EDITOR_REWARD_CARRIER_KINDS = new Set<typeof REWARD_SITE_KINDS[number]>(REWARD_SITE_KINDS);
export const EDITOR_DIRECT_REWARD_OBJECT_KINDS = new Set<'pile' | 'item'>(['pile', 'item']);
export const EDITOR_DEDICATED_REWARD_KINDS = new Set<EditorStructureKind>([
  ...EDITOR_REWARD_CARRIER_KINDS, ...EDITOR_DIRECT_REWARD_OBJECT_KINDS,
]);

/** Inventory is registry-derived; this exhaustive projection adds authoring presentation only. */
export const EDITOR_STRUCTURE_CATALOG: readonly EditorStructureDefinition[] =
  EDITOR_STRUCTURE_KINDS.map((kind) => ({
    kind,
    label: humanize(kind),
    group: groups[kind],
    fields: fieldsFor(kind),
    ...(kind === 'whirlpool' ? { workflow: 'whirlpool-pair' as const } : {}),
    ...(kind === 'patientStone' ? { workflow: 'cache-link' as const } : {}),
  }));

export const editorStructureByKind = (kind: EditorStructureKind) =>
  EDITOR_STRUCTURE_CATALOG.find((entry) => entry.kind === kind)!;

export const EDITOR_RESOURCE_CHOICES = ['gold', 'timber', 'iron', 'essence'] as const;
export const EDITOR_SCHOOL_CHOICES = ['rite', 'craft', 'grave', 'wild'] as const;
export const EDITOR_SPELL_CHOICES = Object.values(SPELLS);
export const EDITOR_ITEM_CHOICES = Object.values(ITEMS);
export const EDITOR_UNIT_CHOICES = Object.values(UNITS);
export const EDITOR_SKILL_CHOICES = Object.values(SKILLS);

const firstSpell = (school: SpellSchool) =>
  EDITOR_SPELL_CHOICES.find((spell) => spell.school === school)!.id;
export const editorItemInstance = (id: ItemId, position: EditorCell = { x: 0, y: 0 }): JsonValue =>
  createDefaultEditorItemInstance(id, position) as unknown as JsonValue;

/** Catalog-backed untouched initial facts; visit/growth state is deliberately absent. */
export function defaultEditorStructureProperties(
  kind: EditorStructureKind, position: EditorCell, document?: EditorMapDocument,
): JsonObject {
  switch (kind) {
    case 'mine': return { resource: 'gold', income: 1000, owner: null };
    case 'pile': return { resource: 'gold', amount: 500 };
    case 'shrine': return { school: 'rite', teaches: firstSpell('rite') };
    case 'item': return { item: editorItemInstance('waybread', position) };
    case 'richVein': return { owner: null, income: 2, days: 7 };
    case 'lock': return { name: 'Guarded Site', tell: 'Something here asks a price.' };
    case 'dwelling': return { unitId: EDITOR_UNIT_CHOICES[0].id, available: EDITOR_UNIT_CHOICES[0].growth };
    case 'tinkersCart': return { route: [{ ...position }], stock: editorItemInstance('smellingSalts', position) };
    case 'bridge': return { opens: [{ ...position }] };
    case 'barrowField': return { scroll: editorItemInstance('spellScroll', position) };
    case 'boat': case 'lighthouse': return { owner: null };
    case 'flotsam': return { timber: 4, gold: 300 };
    case 'castaway': return { item: editorItemInstance('waybread', position), story: 'A survivor waits for a road home.' };
    case 'messageBottle': return { rumour: 'The bottle carries a map-maker’s rumour.' };
    case 'whirlpool': return { pairedId: '' };
    case 'watermill': case 'windmill': case 'tradingCamp': return { owner: null, rareResource: 'iron' };
    case 'hutOnTheHill': return { skill: EDITOR_SKILL_CHOICES[0].id, route: [{ ...position }] };
    case 'oldBearsCave': return { recruitUnitId: 'hearthHound' };
    case 'wolfHollow': return { recruitUnitId: 'ashmaneWolves' };
    case 'mercenaryCamp': return { roster: [{ unitId: EDITOR_UNIT_CHOICES[0].id, count: 1 }] };
    case 'wagonCamp': return { stock: editorItemInstance('waybread', position) };
    case 'patientStone': return { cacheId: document?.objects.find((object) => object.kind === 'cache')?.id ?? '' };
    default: return {};
  }
}

export function editorStructureFootprint(object: Pick<EditorMapObject, 'kind' | 'footprint'>) {
  return object.footprint ?? (object.kind === 'mine' ? { w: 2, h: 1 } : { w: 1, h: 1 });
}

export function editorStructureEntrance(object: Pick<EditorMapObject, 'kind' | 'entrance'>) {
  // Runtime's historic mine fallback lies below the 2x1 footprint; portable authoring uses the
  // canonical authored-map entrance at its bottom-left ground-contact cell.
  return object.entrance ?? { dx: 0, dy: 0 };
}

export function canPlaceEditorStructure(
  document: EditorMapDocument, kind: EditorStructureKind, position: EditorCell,
  exceptObjectId?: string, authoredFootprint?: { w: number; h: number },
): { ok: true } | { ok: false; reason: 'out-of-bounds' | 'overlap' } {
  const footprint = authoredFootprint ?? (kind === 'mine' ? { w: 2, h: 1 } : { w: 1, h: 1 });
  if (kind === 'cache') return position.x >= 0 && position.y >= 0
    && position.x + footprint.w <= document.dimensions.width
    && position.y + footprint.h <= document.dimensions.height
    ? { ok: true } : { ok: false, reason: 'out-of-bounds' };
  const legal = canPlaceEditorProp(document, position, footprint, exceptObjectId);
  return legal.ok ? legal : { ok: false, reason: legal.reason === 'out-of-bounds'
    ? 'out-of-bounds' : 'overlap' };
}

function cloneObjects(objects: readonly EditorMapObject[]) {
  return objects.map((object) => structuredClone(object));
}

function edit(document: EditorMapDocument, after: EditorMapObject[], object: EditorMapObject | null): PropMutationResult {
  return { ok: true, object, edit: { kind: 'objects', changes: [], before: cloneObjects(document.objects), after: cloneObjects(after) } };
}

export function createStructurePlacementEdit(
  document: EditorMapDocument, kind: Exclude<EditorStructureKind, 'whirlpool'>, position: EditorCell,
): PropMutationResult {
  const footprint = kind === 'mine' ? { w: 2, h: 1 } : { w: 1, h: 1 };
  const legal = canPlaceEditorStructure(document, kind, position);
  if (!legal.ok) return legal;
  if (kind === 'patientStone' && !document.objects.some((object) => object.kind === 'cache')) {
    return { ok: false, reason: 'missing-link' } as PropMutationResult;
  }
  if (EDITOR_REWARD_CARRIER_KINDS.has(kind as typeof REWARD_SITE_KINDS[number])) {
    return { ok: false, reason: 'requires-linked-reward' } as PropMutationResult;
  }
  if (EDITOR_DIRECT_REWARD_OBJECT_KINDS.has(kind as 'pile' | 'item')) {
    return { ok: false, reason: 'requires-dedicated-reward' } as PropMutationResult;
  }
  const object: EditorMapObject = {
    id: stableEntityId(humanize(kind), editorEntityIds(document)), kind, position: { ...position },
    ...(kind === 'mine' ? { footprint, entrance: { dx: 0, dy: 0 } } : {}),
    properties: defaultEditorStructureProperties(kind, position, document),
  };
  return edit(document, [...document.objects, object], object);
}

export function createWhirlpoolPairPlacementEdit(
  document: EditorMapDocument, first: EditorCell, second: EditorCell,
): PropMutationResult {
  if (first.x === second.x && first.y === second.y) return { ok: false, reason: 'overlap' };
  const firstLegal = canPlaceEditorProp(document, first, { w: 1, h: 1 });
  if (!firstLegal.ok) return firstLegal;
  const provisional: EditorMapObject = { id: '__pair-preview', kind: 'whirlpool', position: first,
    properties: { pairedId: '__pair-preview-2' } };
  const withFirst = { ...document, objects: [...document.objects, provisional] };
  const secondLegal = canPlaceEditorProp(withFirst, second, { w: 1, h: 1 });
  if (!secondLegal.ok) return secondLegal;
  const used = editorEntityIds(document);
  const firstId = stableEntityId('Whirlpool A', used);
  const secondId = stableEntityId('Whirlpool B', [...used, firstId]);
  const a: EditorMapObject = { id: firstId, kind: 'whirlpool', position: { ...first }, properties: { pairedId: secondId } };
  const b: EditorMapObject = { id: secondId, kind: 'whirlpool', position: { ...second }, properties: { pairedId: firstId } };
  return edit(document, [...document.objects, a, b], b);
}

export function createStructureMoveEdit(document: EditorMapDocument, objectId: string, position: EditorCell): PropMutationResult {
  const object = document.objects.find((candidate) => candidate.id === objectId && candidate.kind !== 'obstacle');
  if (!object) return { ok: false, reason: 'not-found' };
  const legal = canPlaceEditorStructure(document, object.kind as EditorStructureKind, position,
    object.id, editorStructureFootprint(object));
  if (!legal.ok) return legal;
  const moved = { ...object, position: { ...position } };
  return edit(document, document.objects.map((candidate) => candidate.id === objectId ? moved : candidate), moved);
}

export function createStructureDeleteEdit(document: EditorMapDocument, objectId: string): PropMutationResult {
  const object = document.objects.find((candidate) => candidate.id === objectId && candidate.kind !== 'obstacle');
  if (!object) return { ok: false, reason: 'not-found' };
  const linked = new Set([objectId]);
  if (object.kind === 'whirlpool') linked.add(String(object.properties.pairedId));
  if (object.kind === 'cache') document.objects.filter((candidate) => candidate.kind === 'patientStone'
    && candidate.properties.cacheId === object.id).forEach((candidate) => linked.add(candidate.id));
  if (((document.victory.type === 'hold' || document.victory.type === 'slay')
      && linked.has(document.victory.objectId))
      || (document.defeat && (document.defeat.type === 'hold' || document.defeat.type === 'slay')
      && linked.has(document.defeat.objectId))) {
    return { ok: false, reason: 'referenced-objective' } as PropMutationResult;
  }
  const result = edit(document, document.objects.filter((candidate) => !linked.has(candidate.id)), null);
  if (result.ok) {
    const removedRewardIds = new Set(document.rewards.flatMap((reward) =>
      reward.delivery.kind === 'site' && linked.has(reward.delivery.objectId)
        ? [reward.id] : []));
    const removedProtectionTargets = new Set([...linked, ...removedRewardIds]);
    result.edit.beforeReferences = structuredClone({ guardians: document.guardians,
      rewards: document.rewards, victory: document.victory, defeat: document.defeat });
    result.edit.afterReferences = structuredClone({
      guardians: document.guardians.map((guardian) =>
        removedProtectionTargets.has(guardian.protects ?? '')
        ? { ...guardian, protects: null } : guardian),
      rewards: document.rewards.filter((reward) => reward.delivery.kind !== 'site'
        || !linked.has(reward.delivery.objectId)),
      victory: document.victory, defeat: document.defeat,
    });
  }
  return result;
}

export function createStructureUpdateEdit(
  document: EditorMapDocument, objectId: string,
  update: { id?: string; properties?: JsonObject },
): PropMutationResult {
  const object = document.objects.find((candidate) => candidate.id === objectId && candidate.kind !== 'obstacle');
  if (!object) return { ok: false, reason: 'not-found' };
  const nextId = update.id ?? object.id;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(nextId)
      || editorEntityIds(document).some((id) => id === nextId && id !== object.id)) {
    return { ok: false, reason: 'invalid-id' } as PropMutationResult;
  }
  const next = { ...object, id: nextId, properties: update.properties ?? object.properties };
  const after = document.objects.map((candidate) => {
    if (candidate.id === object.id) return next;
    if (nextId !== object.id && candidate.kind === 'whirlpool'
        && candidate.properties.pairedId === object.id) {
      return { ...candidate, properties: { ...candidate.properties, pairedId: nextId } };
    }
    if (nextId !== object.id && candidate.kind === 'patientStone'
        && candidate.properties.cacheId === object.id) {
      return { ...candidate, properties: { ...candidate.properties, cacheId: nextId } };
    }
    return candidate;
  });
  const result = edit(document, after, next);
  if (result.ok && nextId !== object.id) {
    const updateObjective = <T extends EditorMapDocument['victory'] | EditorMapDocument['defeat']>(objective: T): T => {
      if (objective && (objective.type === 'hold' || objective.type === 'slay')
          && objective.objectId === object.id) return { ...objective, objectId: nextId } as T;
      return objective;
    };
    result.edit.beforeReferences = structuredClone({ guardians: document.guardians,
      rewards: document.rewards, victory: document.victory, defeat: document.defeat });
    result.edit.afterReferences = structuredClone({
      guardians: document.guardians.map((guardian) => guardian.protects === object.id
        ? { ...guardian, protects: nextId } : guardian),
      rewards: document.rewards.map((reward) => reward.delivery.kind === 'site'
        && reward.delivery.objectId === object.id
        ? { ...reward, delivery: { ...reward.delivery, objectId: nextId } } : reward),
      victory: updateObjective(document.victory), defeat: updateObjective(document.defeat),
    });
  }
  return result;
}

export function editorStructureAtCell(document: EditorMapDocument, cell: EditorCell) {
  return [...document.objects].reverse().find((object) => object.kind !== 'obstacle'
    && editorFootprintCells(object.position, editorStructureFootprint(object))
      .some((occupied) => occupied.x === cell.x && occupied.y === cell.y));
}

export function editorStructurePresentationObject(object: EditorMapObject): MapObject {
  return { id: object.id, kind: object.kind, position: object.position,
    ...object.properties, ...(object.footprint ? { footprint: object.footprint } : {}),
    ...(object.entrance ? { entrance: object.entrance } : {}) } as MapObject;
}

export function ownerChoices(document: EditorMapDocument): Array<{ value: PlayerId | null; label: string }> {
  return [{ value: null, label: 'Neutral / unowned' }, ...document.players.map((player) => ({
    value: player.id, label: `${player.id.toUpperCase()}${player.name ? ` — ${player.name}` : ''}`,
  }))];
}
