import { assetId, manifestEntry, type AssetManifestEntry } from '../../assets/manifest';
import { FACTIONS } from '../content/factions';
import { UNITS, type UnitDefinition } from '../content/units';
import type { ItemInstance, UnitId, UnitTier } from '../core/types';
import {
  createDefaultEditorGuardian, editorEntityIds, stableEntityId,
  EDITOR_GUARDIAN_TIERS, EDITOR_NON_ROSTER_UNIT_IDS,
  type EditorGuardianCreature, type EditorGuardianStack, type EditorMapDocument,
  type EditorMapGuardian,
} from '../core/mapEditor';
import {
  canPlaceEditorEntity, type EditorCell, type GuardianEdit, type PropMutationFailure,
} from './mapEditorTerrain';
import { isValidEditorItemInstance } from './mapEditorInstances';

export const EDITOR_GUARDIAN_FOOTPRINT = { w: 1, h: 1 } as const;

export type EditorGuardianCatalogGroupId = UnitDefinition['faction'];
export interface EditorGuardianCatalogEntry {
  unit: UnitDefinition;
  groupId: EditorGuardianCatalogGroupId;
  groupLabel: string;
  authorable: boolean;
  authoringDisposition: 'adventure-creature' | 'special-battlefield-construct';
  authoringReason: string;
  rendering: 'native' | 'fallback';
  spriteId: string;
}

const GROUPS: ReadonlyArray<readonly [EditorGuardianCatalogGroupId, string]> = [
  ...Object.values(FACTIONS).map((faction) => [faction.id, faction.name] as const),
  ['gloamingCourt', 'Neutral · Gloaming Court'],
  ['seamborn', 'Neutral · Seamborn'],
  ['driftfolk', 'Neutral · Driftfolk'],
  ['neutralBeast', 'Neutral · Beasts'],
  ['unstruckBell', 'Neutral · Unstruck Bell'],
  ['hagwoodNeutral', 'Neutral · Hagwood'],
];
const GROUP_ORDER = new Map(GROUPS.map(([id], index) => [id, index]));
const GROUP_LABEL = new Map(GROUPS);
const NON_ROSTER = new Set<UnitId>(EDITOR_NON_ROSTER_UNIT_IDS);

/**
 * Exhaustive disposition of the combined canonical unit registry. Siege/mirror pseudo-stacks are
 * explicit special static encounters, never silently treated as ordinary growing creatures.
 */
export const EDITOR_GUARDIAN_CATALOG: readonly EditorGuardianCatalogEntry[] =
  (Object.values(UNITS) as UnitDefinition[]).map((unit) => {
    const construct = NON_ROSTER.has(unit.id);
    const authorable = true;
    const spriteId = assetId.guardianUnit(unit.id);
    return {
      unit,
      groupId: unit.faction,
      groupLabel: GROUP_LABEL.get(unit.faction) ?? `Neutral · ${unit.faction}`,
      authorable,
      authoringDisposition: construct
        ? 'special-battlefield-construct' as const : 'adventure-creature' as const,
      authoringReason: construct
        ? 'Canonical battlefield construct available as an explicit static special guardian encounter.'
        : 'Canonical creature legal in portable adventure guardian armies.',
      rendering: manifestEntry(spriteId) ? 'native' as const : 'fallback' as const,
      spriteId,
    };
  }).sort((left, right) =>
    (GROUP_ORDER.get(left.groupId) ?? Number.MAX_SAFE_INTEGER)
      - (GROUP_ORDER.get(right.groupId) ?? Number.MAX_SAFE_INTEGER)
    || left.unit.tier - right.unit.tier
    || left.unit.name.localeCompare(right.unit.name)
    || left.unit.id.localeCompare(right.unit.id));

export const EDITOR_AUTHORABLE_GUARDIAN_CATALOG = EDITOR_GUARDIAN_CATALOG.filter(
  (entry) => entry.authorable,
);
export const EDITOR_EXCLUDED_GUARDIAN_CATALOG = EDITOR_GUARDIAN_CATALOG.filter(
  (entry) => !entry.authorable,
);
export const EDITOR_GUARDIAN_GROUPS = GROUPS.map(([id, label]) => ({
  id, label,
  entries: EDITOR_AUTHORABLE_GUARDIAN_CATALOG.filter((entry) => entry.groupId === id),
})).filter((group) => group.entries.length > 0);

export function editorGuardianCatalogEntry(unitId: UnitId): EditorGuardianCatalogEntry {
  return EDITOR_GUARDIAN_CATALOG.find((entry) => entry.unit.id === unitId)!;
}

export function editorGuardianSpriteEntry(unitId: UnitId): AssetManifestEntry | undefined {
  return manifestEntry(assetId.guardianUnit(unitId));
}

/** Matches AdventureMap's native guardian world anchor at the center of its 1×1 post. */
export function editorGuardianCanvasGeometry(position: EditorCell, entry: AssetManifestEntry) {
  const worldAnchor = { x: position.x * 32 + 16, y: position.y * 32 + 16 };
  return {
    x: worldAnchor.x - entry.anchor.x,
    y: worldAnchor.y - entry.anchor.y,
    width: entry.w,
    height: entry.h,
  };
}

export type GuardianMutationFailure = PropMutationFailure
  | 'invalid-unit' | 'invalid-army' | 'invalid-protects' | 'invalid-drop';
export type GuardianMutationResult =
  | { ok: true; edit: GuardianEdit; guardian: EditorMapGuardian | null }
  | { ok: false; reason: GuardianMutationFailure };

const guardianEdit = (
  document: EditorMapDocument, after: EditorMapGuardian[], guardian: EditorMapGuardian | null,
): GuardianMutationResult => ({
  ok: true,
  guardian,
  edit: {
    kind: 'guardians', changes: [], before: structuredClone(document.guardians),
    after: structuredClone(after),
  },
});

export function canPlaceEditorGuardian(
  document: EditorMapDocument, position: EditorCell, exceptGuardianId?: string,
) {
  return canPlaceEditorEntity(document, position, EDITOR_GUARDIAN_FOOTPRINT, exceptGuardianId);
}

export function createGuardianPlacementEdit(
  document: EditorMapDocument, position: EditorCell,
  creature: UnitId | EditorGuardianCreature,
): GuardianMutationResult {
  const source: EditorGuardianCreature = typeof creature === 'string'
    ? { unitId: creature } : creature;
  if ('unitId' in source ? !Object.hasOwn(UNITS, source.unitId)
    : !EDITOR_GUARDIAN_TIERS.includes(source.randomTier)) {
    return { ok: false, reason: 'invalid-unit' };
  }
  const legal = canPlaceEditorGuardian(document, position);
  if (!legal.ok) return legal;
  const label = 'unitId' in source ? UNITS[source.unitId].name : `Random Tier ${source.randomTier}`;
  const guardian = createDefaultEditorGuardian(
    stableEntityId(`${label} Guardians`, editorEntityIds(document)), position, source,
  );
  return guardianEdit(document, [...document.guardians, guardian], guardian);
}

export function createGuardianMoveEdit(
  document: EditorMapDocument, guardianId: string, position: EditorCell,
): GuardianMutationResult {
  const guardian = document.guardians.find((candidate) => candidate.id === guardianId);
  if (!guardian) return { ok: false, reason: 'not-found' };
  const legal = canPlaceEditorGuardian(document, position, guardianId);
  if (!legal.ok) return legal;
  const moved = { ...guardian, position: { ...position } };
  return guardianEdit(document, document.guardians.map((candidate) =>
    candidate.id === guardianId ? moved : candidate), moved);
}

function objectiveReferences(document: EditorMapDocument, entityId: string): boolean {
  return [document.victory, document.defeat].some((objective) => objective
    && (objective.type === 'hold' || objective.type === 'slay')
    && objective.objectId === entityId);
}

export function createGuardianDeleteEdit(
  document: EditorMapDocument, guardianId: string,
): GuardianMutationResult {
  if (!document.guardians.some((candidate) => candidate.id === guardianId)) {
    return { ok: false, reason: 'not-found' };
  }
  if (objectiveReferences(document, guardianId)) {
    return { ok: false, reason: 'referenced-objective' };
  }
  return guardianEdit(document,
    document.guardians.filter((candidate) => candidate.id !== guardianId), null);
}

/** Refuses duplicates instead of silently losing an authored company identity. */
export function safeEditorGuardianArmy(
  stacks: readonly EditorGuardianStack[],
): EditorGuardianStack[] | null {
  if (!stacks.length || stacks.length > 7) return null;
  const seen = new Set<string>();
  const army: EditorGuardianStack[] = [];
  for (const stack of stacks) {
    const key = 'unitId' in stack ? `unit:${stack.unitId}` : `random-tier:${stack.randomTier}`;
    if (('unitId' in stack ? !Object.hasOwn(UNITS, stack.unitId)
      : !EDITOR_GUARDIAN_TIERS.includes(stack.randomTier)) || seen.has(key)
        || !Number.isInteger(stack.count) || stack.count <= 0) return null;
    seen.add(key);
    army.push({ ...stack });
  }
  return army;
}

export function editorGuardianProtectChoices(document: EditorMapDocument) {
  return [
    ...document.objects.map((object) => ({
      id: object.id, kind: 'object' as const, label: object.kind,
    })),
    ...document.rewards.map((reward) => ({
      id: reward.id, kind: 'reward' as const,
      label: reward.delivery.kind === 'pickup'
        ? `pickup reward at ${reward.delivery.position.x},${reward.delivery.position.y}`
        : `site reward carried by ${reward.delivery.objectId}`,
    })),
  ];
}

export function editorGuardianUnitChoices(
  guardian: EditorMapGuardian, stackIndex?: number,
): UnitId[] {
  const occupied = new Set(guardian.army.flatMap((stack, index) =>
    index === stackIndex || !('unitId' in stack) ? [] : [stack.unitId]));
  return EDITOR_AUTHORABLE_GUARDIAN_CATALOG.map((entry) => entry.unit.id)
    .filter((unitId) => !occupied.has(unitId));
}

export function nextEditorGuardianUnit(guardian: EditorMapGuardian): UnitId | null {
  return editorGuardianUnitChoices(guardian)[0] ?? null;
}

export type EditorGuardianUpdate = Partial<Pick<EditorMapGuardian,
  'id' | 'army' | 'split' | 'static' | 'protects' | 'drop'>>;

export function createGuardianUpdateEdit(
  document: EditorMapDocument, guardianId: string, update: EditorGuardianUpdate,
): GuardianMutationResult {
  const guardian = document.guardians.find((candidate) => candidate.id === guardianId);
  if (!guardian) return { ok: false, reason: 'not-found' };
  const nextId = update.id ?? guardian.id;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(nextId)
      || editorEntityIds(document).some((id) => id === nextId && id !== guardian.id)) {
    return { ok: false, reason: 'invalid-id' };
  }
  const army = update.army === undefined
    ? structuredClone(guardian.army) : safeEditorGuardianArmy(update.army);
  if (!army) return { ok: false, reason: 'invalid-army' };
  const protects = update.protects === undefined ? guardian.protects : update.protects;
  if (protects !== null && !document.objects.some((object) => object.id === protects)
      && !document.rewards.some((reward) => reward.id === protects)) {
    return { ok: false, reason: 'invalid-protects' };
  }
  const drop = update.drop === undefined ? guardian.drop : update.drop;
  if (drop !== null && (!drop || !isValidEditorItemInstance(drop))) {
    return { ok: false, reason: 'invalid-drop' };
  }
  const next: EditorMapGuardian = {
    ...structuredClone(guardian), ...update, id: nextId, army, protects,
    drop: drop ? structuredClone(drop as ItemInstance) : null,
  };
  const result = guardianEdit(document, document.guardians.map((candidate) =>
    candidate.id === guardianId ? next : candidate), next);
  if (result.ok && nextId !== guardian.id) {
    const cascade = <T extends EditorMapDocument['victory'] | EditorMapDocument['defeat']>(
      objective: T,
    ): T => objective && (objective.type === 'hold' || objective.type === 'slay')
      && objective.objectId === guardian.id
      ? { ...objective, objectId: nextId } as T : objective;
    result.edit.beforeReferences = structuredClone({
      victory: document.victory, defeat: document.defeat,
    });
    result.edit.afterReferences = structuredClone({
      victory: cascade(document.victory), defeat: cascade(document.defeat),
    });
  }
  return result;
}

export function editorGuardianAtCell(document: EditorMapDocument, cell: EditorCell) {
  return [...document.guardians].reverse().find((guardian) =>
    guardian.position.x === cell.x && guardian.position.y === cell.y);
}
