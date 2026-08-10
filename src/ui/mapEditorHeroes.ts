import { assetId, type AssetManifestEntry } from '../../assets/manifest';
import { FACTIONS } from '../content/factions';
import { FACTION_HEROES, HEROES } from '../content/heroes';
import { FACTION_UNITS } from '../content/units';
import type { ArmyStack, FactionId, HeroDefinitionId, PlayerId, UnitId } from '../core/types';
import {
  createDefaultEditorHero, editorEntityIds, stableEntityId,
  EDITOR_ARMY_UNIT_IDS, isEditorArmyUnitId,
  type EditorMapDocument, type EditorMapHero,
} from '../core/mapEditor';
import {
  canPlaceEditorEntity, type EditorCell, type HeroEdit, type PropMutationFailure,
} from './mapEditorTerrain';

export const EDITOR_HERO_FOOTPRINT = { w: 1, h: 1 } as const;

export function editorHeroDefinitions(faction: FactionId) {
  return (FACTION_HEROES[faction] ?? []).map((id) => HEROES[id]);
}

export function editorHeroSpriteId(hero: Pick<EditorMapHero, 'faction'>) {
  return assetId.hero(hero.faction, 's');
}

/** Matches AdventureMap's native south-facing PixelSprite world anchor exactly. */
export function editorHeroCanvasGeometry(position: EditorCell, entry: AssetManifestEntry) {
  const worldAnchor = { x: position.x * 32 + 16, y: position.y * 32 + 16 };
  return {
    x: worldAnchor.x - entry.anchor.x,
    y: worldAnchor.y - entry.anchor.y,
    width: entry.w,
    height: entry.h,
  };
}

/** A visible owner pennant beside the hero; color still comes only from the player slot. */
export function editorHeroFlagAnchor(position: EditorCell) {
  return { x: position.x * 32 + 22, y: position.y * 32 + 15 };
}

export type HeroMutationFailure = PropMutationFailure
  | 'no-player' | 'invalid-owner' | 'invalid-definition' | 'invalid-army';
export type HeroMutationResult =
  | { ok: true; edit: HeroEdit; hero: EditorMapHero | null }
  | { ok: false; reason: HeroMutationFailure };

const heroEdit = (
  document: EditorMapDocument, after: EditorMapHero[], hero: EditorMapHero | null,
): HeroMutationResult => ({
  ok: true,
  hero,
  edit: {
    kind: 'heroes', changes: [], before: structuredClone(document.heroes),
    after: structuredClone(after),
  },
});

export function canPlaceEditorHero(
  document: EditorMapDocument, position: EditorCell, owner?: PlayerId, exceptHeroId?: string,
) {
  const castle = owner ? document.castles.find((candidate) => {
    if (candidate.owner !== owner) return false;
    return candidate.position.x + 1 === position.x
      && candidate.position.y + 1 === position.y;
  }) : undefined;
  // Canonical starts may stand at their same-owner castle entrance. Only that castle is ignored;
  // another hero, object, guardian, pickup, castle, or the map bounds can still reject the cell.
  const preflightDocument = castle ? {
    ...document, castles: document.castles.filter((candidate) => candidate.id !== castle.id),
  } : document;
  return canPlaceEditorEntity(preflightDocument, position, EDITOR_HERO_FOOTPRINT, exceptHeroId);
}

export function createHeroPlacementEdit(
  document: EditorMapDocument, position: EditorCell, owner: PlayerId,
  faction: FactionId, definitionId: HeroDefinitionId,
): HeroMutationResult {
  if (!document.players.length) return { ok: false, reason: 'no-player' };
  if (!document.players.some((player) => player.id === owner)) {
    return { ok: false, reason: 'invalid-owner' };
  }
  if (!FACTION_HEROES[faction].includes(definitionId)) {
    return { ok: false, reason: 'invalid-definition' };
  }
  const legal = canPlaceEditorHero(document, position, owner);
  if (!legal.ok) return legal;
  // This is intentionally the one core-owned construction path for every newly stamped hero.
  const hero = createDefaultEditorHero(
    stableEntityId(`${owner}-${definitionId}`, editorEntityIds(document)),
    position, owner, faction, definitionId,
  );
  return heroEdit(document, [...document.heroes, hero], hero);
}

export function createHeroMoveEdit(
  document: EditorMapDocument, heroId: string, position: EditorCell,
): HeroMutationResult {
  const hero = document.heroes.find((candidate) => candidate.id === heroId);
  if (!hero) return { ok: false, reason: 'not-found' };
  const legal = canPlaceEditorHero(document, position, hero.owner, heroId);
  if (!legal.ok) return legal;
  const moved = { ...hero, position: { ...position } };
  return heroEdit(document, document.heroes.map((candidate) =>
    candidate.id === heroId ? moved : candidate), moved);
}

export function createHeroDeleteEdit(
  document: EditorMapDocument, heroId: string,
): HeroMutationResult {
  if (!document.heroes.some((candidate) => candidate.id === heroId)) {
    return { ok: false, reason: 'not-found' };
  }
  return heroEdit(document, document.heroes.filter((candidate) => candidate.id !== heroId), null);
}

export type EditorHeroUpdate = Partial<Pick<EditorMapHero,
  'id' | 'owner' | 'faction' | 'definitionId' | 'army'>>;

/**
 * Combines duplicate creature stacks in first-seen order. Invalid or empty starts are refused, so
 * inspector edits cannot transiently author a broken army.
 */
export function safeEditorHeroArmy(stacks: readonly ArmyStack[]): ArmyStack[] | null {
  const combined = new Map<UnitId, number>();
  for (const stack of stacks) {
    if (!isEditorArmyUnitId(stack.unitId)
        || !Number.isInteger(stack.count) || stack.count <= 0) return null;
    combined.set(stack.unitId, (combined.get(stack.unitId) ?? 0) + stack.count);
  }
  if (!combined.size || combined.size > 7) return null;
  return [...combined].map(([unitId, count]) => ({ unitId, count }));
}

export function createHeroUpdateEdit(
  document: EditorMapDocument, heroId: string, update: EditorHeroUpdate,
): HeroMutationResult {
  const hero = document.heroes.find((candidate) => candidate.id === heroId);
  if (!hero) return { ok: false, reason: 'not-found' };
  const nextId = update.id ?? hero.id;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(nextId)
      || editorEntityIds(document).some((id) => id === nextId && id !== hero.id)) {
    return { ok: false, reason: 'invalid-id' };
  }
  const nextOwner = update.owner ?? hero.owner;
  if (!document.players.some((player) => player.id === nextOwner)) {
    return { ok: false, reason: 'invalid-owner' };
  }
  if (!canPlaceEditorHero(document, hero.position, nextOwner, hero.id).ok) {
    return { ok: false, reason: 'overlap' };
  }
  const nextFaction = update.faction ?? hero.faction;
  if (!Object.hasOwn(FACTIONS, nextFaction)) return { ok: false, reason: 'invalid-definition' };
  let nextDefinition = update.definitionId ?? hero.definitionId;
  // Faction changes preserve an edited (and legally mixed) army and the owner. Only identity is
  // reconciled atomically, choosing the first canonical definition when the old one is incompatible.
  if (update.faction !== undefined && !FACTION_HEROES[nextFaction].includes(nextDefinition)) {
    nextDefinition = FACTION_HEROES[nextFaction][0];
  } else if (!FACTION_HEROES[nextFaction].includes(nextDefinition)) {
    return { ok: false, reason: 'invalid-definition' };
  }
  const army = update.army === undefined ? structuredClone(hero.army) : safeEditorHeroArmy(update.army);
  if (!army) return { ok: false, reason: 'invalid-army' };
  const next: EditorMapHero = {
    ...structuredClone(hero), ...update,
    id: nextId, owner: nextOwner, faction: nextFaction,
    definitionId: nextDefinition, army,
  };
  return heroEdit(document, document.heroes.map((candidate) =>
    candidate.id === heroId ? next : candidate), next);
}

export function editorHeroAtCell(document: EditorMapDocument, cell: EditorCell) {
  return [...document.heroes].reverse().find((hero) =>
    hero.position.x === cell.x && hero.position.y === cell.y);
}

export function editorHeroUnitChoices(hero: EditorMapHero, stackIndex?: number): UnitId[] {
  const occupied = new Set(hero.army.flatMap((stack, index) =>
    index === stackIndex ? [] : [stack.unitId]));
  return EDITOR_ARMY_UNIT_IDS.filter((unitId) => !occupied.has(unitId));
}

export function nextEditorHeroUnit(hero: EditorMapHero): UnitId | null {
  const choices = editorHeroUnitChoices(hero);
  return (FACTION_UNITS[hero.faction] ?? []).find((unitId) => choices.includes(unitId))
    ?? choices[0] ?? null;
}
