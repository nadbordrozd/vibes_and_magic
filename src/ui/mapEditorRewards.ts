import { assetId, manifestEntry } from '../../assets/manifest';
import { ARTIFACTS, type ArtifactClass, type ArtifactDefinition } from '../content/artifacts';
import { ITEMS, type ItemDefinition, type ItemUse } from '../content/items';
import { REWARD_SITE_KINDS } from '../core/mapEditor/validation';
import { SPELLS } from '../content/spells';
import type {
  ArtifactId, ArtifactInstance, ItemId, ItemInstance, ResourceId, SpellId, SpellSchool,
} from '../core/types';
import {
  editorEntityIds, stableEntityId, type EditorMapDocument, type EditorMapObject,
  type EditorMapReward, type EditorRewardBundle,
} from '../core/mapEditor';
import {
  canPlaceEditorEntity, clipEditorCells, type EditorCell, type ObjectEdit, type OverlayEdit,
  type RewardEdit,
} from './mapEditorTerrain';
import {
  defaultEditorStructureProperties, type EditorStructureKind,
} from './mapEditorStructures';
import {
  createDefaultEditorArtifactInstance, createDefaultEditorItemInstance,
  isValidEditorArtifactInstance, isValidEditorItemInstance,
} from './mapEditorInstances';

export {
  createDefaultEditorArtifactInstance, createDefaultEditorItemInstance,
  EDITOR_TOME_SOURCES, editorTomeSpellChoices,
}
  from './mapEditorInstances';

export const EDITOR_RESOURCE_IDS = ['gold', 'timber', 'iron', 'essence'] as const satisfies readonly ResourceId[];
export const EDITOR_SPELL_SCHOOLS = ['rite', 'craft', 'grave', 'wild'] as const satisfies readonly SpellSchool[];

export interface EditorArtifactCatalogEntry {
  artifact: ArtifactDefinition;
  groupId: ArtifactClass;
  groupLabel: string;
  rendering: 'native' | 'fallback';
  renderingReason: string;
}

const ARTIFACT_GROUP_LABELS: Record<ArtifactClass, string> = {
  vanilla: 'Vanilla', charm: 'Charms', relic: 'Relics', burden: 'Burdens',
  kit: "Tailor's Kit", trinket: 'Migrated trinkets',
};
const ARTIFACT_GROUP_ORDER: ArtifactClass[] = [
  'vanilla', 'charm', 'relic', 'burden', 'kit', 'trinket',
];

/** Exhaustive artifact disposition; the complete catalog is native and the guard fallback stays explicit. */
export const EDITOR_ARTIFACT_CATALOG: readonly EditorArtifactCatalogEntry[] =
  (Object.values(ARTIFACTS) as ArtifactDefinition[]).map((artifact) => ({
    artifact,
    groupId: artifact.class,
    groupLabel: ARTIFACT_GROUP_LABELS[artifact.class],
    rendering: manifestEntry(assetId.mapObject('artifact', artifact.id))
      ? 'native' as const : 'fallback' as const,
    renderingReason: manifestEntry(assetId.mapObject('artifact', artifact.id))
      ? 'Installed native map-scale artifact sprite.'
      : 'Explicit accessible diamond fallback; no native map-scale artifact sprite is installed.',
  })).sort((left, right) => ARTIFACT_GROUP_ORDER.indexOf(left.groupId)
    - ARTIFACT_GROUP_ORDER.indexOf(right.groupId)
    || left.artifact.name.localeCompare(right.artifact.name)
    || left.artifact.id.localeCompare(right.artifact.id));

export const EDITOR_ARTIFACT_GROUPS = ARTIFACT_GROUP_ORDER.map((id) => ({
  id, label: ARTIFACT_GROUP_LABELS[id],
  entries: EDITOR_ARTIFACT_CATALOG.filter((entry) => entry.groupId === id),
}));

export interface EditorItemCatalogEntry {
  item: ItemDefinition;
  groupId: ItemUse;
  groupLabel: string;
  rendering: 'native' | 'fallback';
  spriteId: string;
}

const ITEM_GROUP_LABELS: Record<ItemUse, string> = {
  combat: 'Combat consumables & scrolls', adventure: 'Adventure items',
  automatic: 'Automatic items',
};
const ITEM_GROUP_ORDER: ItemUse[] = ['combat', 'adventure', 'automatic'];

export const EDITOR_ITEM_CATALOG: readonly EditorItemCatalogEntry[] =
  (Object.values(ITEMS) as ItemDefinition[]).map((item) => {
    const spriteId = assetId.mapObject('item', item.id);
    return {
      item, groupId: item.use, groupLabel: ITEM_GROUP_LABELS[item.use], spriteId,
      rendering: manifestEntry(spriteId) ? 'native' as const : 'fallback' as const,
    };
  }).sort((left, right) => ITEM_GROUP_ORDER.indexOf(left.groupId)
    - ITEM_GROUP_ORDER.indexOf(right.groupId)
    || left.item.name.localeCompare(right.item.name)
    || left.item.id.localeCompare(right.item.id));

export const EDITOR_ITEM_GROUPS = ITEM_GROUP_ORDER.map((id) => ({
  id, label: ITEM_GROUP_LABELS[id],
  entries: EDITOR_ITEM_CATALOG.filter((entry) => entry.groupId === id),
}));

export const EDITOR_TAUGHT_SPELL_GROUPS = EDITOR_SPELL_SCHOOLS.map((school) => ({
  id: school,
  label: school[0].toUpperCase() + school.slice(1),
  entries: Object.values(SPELLS).filter((spell) => spell.school === school)
    .sort((left, right) => left.name.localeCompare(right.name)),
}));

export function emptyEditorRewardBundle(): EditorRewardBundle {
  return { artifacts: [], items: [], resources: {}, teachesSpell: null };
}

export const artifactRewardBundle = (id: ArtifactId): EditorRewardBundle => ({
  ...emptyEditorRewardBundle(), artifacts: [createDefaultEditorArtifactInstance(id)],
});
export const itemRewardBundle = (id: ItemId, origin: EditorCell): EditorRewardBundle => ({
  ...emptyEditorRewardBundle(), items: [createDefaultEditorItemInstance(id, origin)],
});
export const resourceRewardBundle = (id: ResourceId, amount: number): EditorRewardBundle => ({
  ...emptyEditorRewardBundle(), resources: { [id]: amount },
});
export const spellRewardBundle = (id: SpellId): EditorRewardBundle => ({
  ...emptyEditorRewardBundle(), teachesSpell: id,
});

const cloneRewards = (rewards: readonly EditorMapReward[]): EditorMapReward[] =>
  rewards.map((reward) => structuredClone(reward));
const rewardEdit = (
  document: EditorMapDocument, after: EditorMapReward[], reward: EditorMapReward | null,
): { ok: true; edit: RewardEdit; reward: EditorMapReward | null } => ({
  ok: true, reward,
  edit: { kind: 'rewards', changes: [], before: cloneRewards(document.rewards), after: cloneRewards(after) },
});

export type RewardMutationFailure = 'out-of-bounds' | 'overlap' | 'not-found' | 'invalid-id'
  | 'empty-bundle' | 'invalid-bundle' | 'site-reward-requires-carrier';
export type RewardMutationResult =
  | { ok: true; edit: RewardEdit; reward: EditorMapReward | null }
  | { ok: false; reason: RewardMutationFailure };

export function canPlaceEditorReward(
  document: EditorMapDocument, position: EditorCell, exceptRewardId?: string,
) {
  return canPlaceEditorEntity(document, position, { w: 1, h: 1 }, exceptRewardId);
}

function bundleIsValid(bundle: EditorRewardBundle): boolean {
  return bundle.artifacts.every((artifact) => Object.hasOwn(ARTIFACTS, artifact.id)
      && isValidEditorArtifactInstance(artifact))
    && bundle.items.every(isValidEditorItemInstance)
    && Object.entries(bundle.resources).every(([resource, amount]) =>
      EDITOR_RESOURCE_IDS.includes(resource as ResourceId)
      && Number.isInteger(amount) && (amount ?? 0) > 0)
    && (bundle.teachesSpell === null || Object.hasOwn(SPELLS, bundle.teachesSpell));
}
const bundleIsEmpty = (bundle: EditorRewardBundle) => !bundle.artifacts.length
  && !bundle.items.length && !Object.keys(bundle.resources).length && !bundle.teachesSpell;

export function createDirectRewardPlacementEdit(
  document: EditorMapDocument, position: EditorCell, bundle: EditorRewardBundle, label: string,
): RewardMutationResult {
  const legal = canPlaceEditorReward(document, position);
  if (!legal.ok) return { ok: false, reason: legal.reason === 'out-of-bounds'
    ? 'out-of-bounds' : 'overlap' };
  if (bundleIsEmpty(bundle)) return { ok: false, reason: 'empty-bundle' };
  if (!bundleIsValid(bundle)) return { ok: false, reason: 'invalid-bundle' };
  const positionedBundle = structuredClone(bundle);
  positionedBundle.items = positionedBundle.items.map((item) => item.id === 'tradeGoods'
    ? { ...item, origin: { ...position } } : item);
  const reward: EditorMapReward = {
    id: stableEntityId(label, editorEntityIds(document)),
    delivery: { kind: 'pickup', position: { ...position } },
    bundle: positionedBundle,
  };
  return rewardEdit(document, [...document.rewards, reward], reward);
}

export function createRewardMoveEdit(
  document: EditorMapDocument, rewardId: string, position: EditorCell,
): RewardMutationResult {
  const reward = document.rewards.find((candidate) => candidate.id === rewardId);
  if (!reward) return { ok: false, reason: 'not-found' };
  if (reward.delivery.kind !== 'pickup') return { ok: false, reason: 'site-reward-requires-carrier' };
  const legal = canPlaceEditorReward(document, position, rewardId);
  if (!legal.ok) return { ok: false, reason: legal.reason === 'out-of-bounds'
    ? 'out-of-bounds' : 'overlap' };
  const moved: EditorMapReward = {
    ...structuredClone(reward), delivery: { kind: 'pickup', position: { ...position } },
  };
  return rewardEdit(document, document.rewards.map((candidate) =>
    candidate.id === rewardId ? moved : candidate), moved);
}

export function createRewardUpdateEdit(
  document: EditorMapDocument, rewardId: string,
  update: { id?: string; bundle?: EditorRewardBundle },
): RewardMutationResult {
  const reward = document.rewards.find((candidate) => candidate.id === rewardId);
  if (!reward) return { ok: false, reason: 'not-found' };
  const nextId = update.id ?? reward.id;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(nextId)
      || editorEntityIds(document).some((id) => id === nextId && id !== reward.id)) {
    return { ok: false, reason: 'invalid-id' };
  }
  const bundle = update.bundle ?? reward.bundle;
  if (bundleIsEmpty(bundle)) return { ok: false, reason: 'empty-bundle' };
  if (!bundleIsValid(bundle)) return { ok: false, reason: 'invalid-bundle' };
  const next = { ...structuredClone(reward), id: nextId, bundle: structuredClone(bundle) };
  const result = rewardEdit(document, document.rewards.map((candidate) =>
    candidate.id === rewardId ? next : candidate), next);
  if (nextId !== reward.id) {
    result.edit.beforeReferences = { guardians: structuredClone(document.guardians) };
    result.edit.afterReferences = { guardians: document.guardians.map((guardian) =>
      guardian.protects === reward.id ? { ...guardian, protects: nextId } : guardian) };
  }
  return result;
}

export function createRewardDeleteEdit(
  document: EditorMapDocument, rewardId: string,
): RewardMutationResult {
  const reward = document.rewards.find((candidate) => candidate.id === rewardId);
  if (!reward) return { ok: false, reason: 'not-found' };
  if (reward.delivery.kind === 'site') return { ok: false, reason: 'site-reward-requires-carrier' };
  const result = rewardEdit(document, document.rewards.filter((candidate) =>
    candidate.id !== rewardId), null);
  result.edit.beforeReferences = { guardians: structuredClone(document.guardians) };
  result.edit.afterReferences = { guardians: document.guardians.map((guardian) =>
    guardian.protects === rewardId ? { ...guardian, protects: null } : guardian) };
  return result;
}

export function createRewardCarrierPlacementEdit(
  document: EditorMapDocument, kind: typeof REWARD_SITE_KINDS[number], position: EditorCell,
): { ok: true; edit: ObjectEdit; object: EditorMapObject; reward: EditorMapReward }
  | { ok: false; reason: 'out-of-bounds' | 'overlap' } {
  const legal = canPlaceEditorEntity(document, position, { w: 1, h: 1 });
  if (!legal.ok) return { ok: false, reason: legal.reason === 'out-of-bounds'
    ? 'out-of-bounds' : 'overlap' };
  const objectId = stableEntityId(kind, editorEntityIds(document));
  const rewardId = stableEntityId(`${objectId}-reward`, [...editorEntityIds(document), objectId]);
  const object: EditorMapObject = {
    id: objectId, kind: kind as EditorStructureKind, position: { ...position },
    properties: defaultEditorStructureProperties(kind as EditorStructureKind, position, document),
  };
  const reward: EditorMapReward = {
    id: rewardId, delivery: { kind: 'site', objectId },
    bundle: resourceRewardBundle('gold', 500),
  };
  const objects = [...document.objects, object];
  if (kind === 'cache') {
    const usedIds = [...editorEntityIds(document), objectId, rewardId];
    const candidates = Array.from({ length: document.dimensions.width * document.dimensions.height },
      (_unused, index) => ({ x: index % document.dimensions.width,
        y: Math.floor(index / document.dimensions.width) }))
      .filter((candidate) => candidate.x !== position.x || candidate.y !== position.y)
      .sort((left, right) => Math.abs(left.x - position.x) + Math.abs(left.y - position.y)
        - Math.abs(right.x - position.x) - Math.abs(right.y - position.y)
        || left.y - right.y || left.x - right.x);
    for (const candidate of candidates) {
      if (objects.length >= document.objects.length + 4) break;
      const provisional = { ...document, objects };
      if (!canPlaceEditorEntity(provisional, candidate, { w: 1, h: 1 }).ok) continue;
      const id = stableEntityId('patient-stone', usedIds);
      usedIds.push(id);
      objects.push({
        id, kind: 'patientStone', position: { ...candidate }, properties: { cacheId: objectId },
      });
    }
    if (objects.length < document.objects.length + 4) return { ok: false, reason: 'overlap' };
  }
  return {
    ok: true, object, reward,
    edit: {
      kind: 'objects', changes: [], before: structuredClone(document.objects),
      after: structuredClone(objects),
      beforeReferences: structuredClone({ guardians: document.guardians,
        rewards: document.rewards, victory: document.victory, defeat: document.defeat }),
      afterReferences: structuredClone({ guardians: document.guardians,
        rewards: [...document.rewards, reward], victory: document.victory, defeat: document.defeat }),
    },
  };
}

export function createOverlayStrokeEdit(
  document: EditorMapDocument, overlay: 'roads' | 'seams', cells: Iterable<EditorCell>,
  mode: 'paint' | 'erase' = 'paint',
): OverlayEdit {
  const before = structuredClone(document.overlays);
  const keys = new Set(before[overlay].map((cell) => `${cell.x},${cell.y}`));
  for (const cell of clipEditorCells(cells, document.dimensions)) {
    const key = `${cell.x},${cell.y}`;
    if (mode === 'paint') keys.add(key); else keys.delete(key);
  }
  const next = [...keys].map((key) => {
    const [x, y] = key.split(',').map(Number); return { x, y };
  }).sort((left, right) => left.y - right.y || left.x - right.x);
  return { kind: 'overlays', changes: [], before, after: { ...before, [overlay]: next } };
}

export function editorRewardAtCell(document: EditorMapDocument, cell: EditorCell) {
  return [...document.rewards].reverse().find((reward) => reward.delivery.kind === 'pickup'
    && reward.delivery.position.x === cell.x && reward.delivery.position.y === cell.y);
}

export function rewardPrimaryKind(reward: EditorMapReward): 'artifact' | 'item' | 'resource' | 'spell' {
  if (reward.bundle.artifacts.length) return 'artifact';
  if (reward.bundle.items.length) return 'item';
  if (Object.keys(reward.bundle.resources).length) return 'resource';
  return 'spell';
}
