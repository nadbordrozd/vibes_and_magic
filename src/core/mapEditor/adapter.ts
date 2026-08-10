import { EDITOR_CATALOG_HASH } from './catalog';
import { normalizeEditorMapDocument, stableEntityId } from './codec';
import { objectPropertiesFromRuntime, runtimeRewardToBundle } from './runtime';
import { terrainId } from '../../content/terrain';
import { createInitialCastle } from '../game/setup';
import type { Castle, GameMap, Hero, Player } from '../types';
import type {
  EditorMapCastle, EditorMapDocument, EditorMapHero, EditorMapMetadata, EditorMapPlayer,
  EditorMapReward, EditorMapSource,
} from './types';
import {
  EDITOR_MAP_DOCUMENT_TYPE, EDITOR_MAP_SCHEMA_VERSION,
} from './types';
import { parseLocalMapReference } from '../mapReference';

export interface RuntimeMapAdapterOptions {
  id?: string;
  revision?: number;
  metadata?: Partial<EditorMapMetadata>;
  players?: Array<Pick<Player, 'id' | 'controller' | 'faction' | 'name'>>;
  castles?: Castle[];
  heroes?: Hero[];
  source?: EditorMapSource;
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function adaptCastle(castle: Castle, seed: number): EditorMapCastle {
  const entrancePosition = {
    x: castle.position.x + castle.entrance.dx,
    y: castle.position.y + castle.entrance.dy,
  };
  const inherited = createInitialCastle(
    castle.owner, castle.faction, seed >>> 0, entrancePosition, castle.id,
  );
  const garrison = castle.garrison.flatMap((stack) => stack ? [{ ...stack }] : []);
  const inheritedGarrison = inherited.garrison.flatMap((stack) => stack ? [{ ...stack }] : []);
  return {
    id: castle.id,
    position: { ...castle.position },
    owner: castle.owner,
    faction: castle.faction,
    ...(!same(castle.footprint, inherited.footprint)
      ? { footprint: { ...castle.footprint } } : {}),
    ...(!same(castle.entrance, inherited.entrance)
      ? { entrance: { ...castle.entrance } } : {}),
    ...(!same(castle.buildings, inherited.buildings)
      ? { buildings: [...castle.buildings] } : {}),
    ...(!same(castle.bannedBuildings, inherited.bannedBuildings)
      ? { bannedBuildings: [...castle.bannedBuildings] } : {}),
    ...(!same(castle.available, inherited.available)
      ? { available: [...castle.available] } : {}),
    ...(!same(garrison, inheritedGarrison) ? { garrison } : {}),
    ...(!same(castle.guildDeck, inherited.guildDeck)
      ? { guildDeck: [...castle.guildDeck] } : {}),
    ...(castle.variant ? { variant: castle.variant } : {}),
    ...(castle.vault ? { vault: { ...castle.vault } } : {}),
    ...(castle.flavor ? { flavor: castle.flavor } : {}),
  };
}

function adaptHero(hero: Hero): EditorMapHero {
  return {
    id: hero.id,
    definitionId: hero.definitionId,
    owner: hero.owner,
    faction: hero.faction,
    position: { ...hero.position },
    army: hero.army.flatMap((stack) => stack ? [{ ...stack }] : []),
    level: hero.level,
    xp: hero.xp,
    stats: {
      attack: hero.attack, defense: hero.defense, spellPower: hero.spellPower,
      knowledge: hero.knowledge, luck: hero.luck, moraleBonus: hero.moraleBonus,
    },
    skills: { ...hero.skills },
    knownSpells: [...hero.knownSpells],
    upgradedSpells: [...hero.upgradedSpells],
  };
}

/**
 * Adapts a freshly authored runtime map without importing setup policy. Passing starting players,
 * castles, and heroes makes those parts explicit; omitting them produces a valid draft with
 * playable-start diagnostics rather than inventing setup from coordinates.
 */
export function adaptRuntimeMapToEditorDocument(
  map: GameMap,
  options: RuntimeMapAdapterOptions = {},
): EditorMapDocument {
  const localReference = parseLocalMapReference(map.id);
  const existingIds = new Set<string>(map.objects.map((object) => object.id));
  for (const castle of options.castles ?? []) existingIds.add(castle.id);
  for (const hero of options.heroes ?? []) existingIds.add(hero.id);
  const rewards: EditorMapReward[] = [];
  const rewardIdByCarrierId = new Map<string, string>();
  const objects = map.objects.flatMap((object) => {
    if (object.kind === 'guardian') return [];
    if (object.kind === 'rewardPickup') {
      rewards.push({
        id: object.id,
        delivery: { kind: 'pickup', position: { ...object.position } },
        bundle: runtimeRewardToBundle(object.reward),
      });
      return [];
    }
    if ('reward' in object) {
      const id = stableEntityId(`${object.id}-reward`, existingIds);
      existingIds.add(id);
      rewards.push({
        id,
        delivery: { kind: 'site', objectId: object.id },
        bundle: runtimeRewardToBundle(object.reward),
      });
      rewardIdByCarrierId.set(object.id, id);
    }
    return [{
      id: object.id,
      kind: object.kind,
      position: { ...object.position },
      ...(object.flavorHint ? { flavorHint: object.flavorHint } : {}),
      ...(object.footprint ? { footprint: { ...object.footprint } } : {}),
      ...(object.entrance ? { entrance: { ...object.entrance } } : {}),
      properties: objectPropertiesFromRuntime(object),
    }];
  });
  const guardians = map.objects.flatMap((object) => object.kind === 'guardian' ? [{
    id: object.id,
    position: { ...object.position },
    army: (object.originalArmy ?? object.army).map((stack) => ({ ...stack })),
    split: object.split ?? false,
    static: object.static ?? false,
    protects: object.protects
      ? rewardIdByCarrierId.get(object.protects) ?? object.protects : null,
    drop: object.drop ? { ...object.drop } : null,
  }] : []);
  const players: EditorMapPlayer[] = (options.players ?? []).map((player) => ({
    id: player.id,
    controller: player.controller,
    faction: player.faction,
    ...(player.name ? { name: player.name } : {}),
  }));
  return normalizeEditorMapDocument({
    documentType: EDITOR_MAP_DOCUMENT_TYPE,
    schemaVersion: EDITOR_MAP_SCHEMA_VERSION,
    id: options.id ?? localReference?.documentId ?? map.id,
    revision: options.revision ?? localReference?.revision ?? 1,
    metadata: {
      name: options.metadata?.name ?? map.name,
      description: options.metadata?.description ?? '',
      author: options.metadata?.author ?? '',
      style: options.metadata?.style ?? '',
    },
    compatibility: { catalogHash: EDITOR_CATALOG_HASH },
    dimensions: { width: map.width, height: map.height },
    tiles: map.terrain.map((row) => row.map((cell) => typeof cell === 'object'
      ? { terrain: terrainId(cell), ...(cell.skin ? { skin: cell.skin } : {}) }
      : { terrain: terrainId(cell) })),
    overlays: {
      roads: (map.roads ?? []).map((coord) => ({ ...coord })),
      seams: (map.seams ?? []).map((coord) => ({ ...coord })),
    },
    players,
    castles: (options.castles ?? []).map((castle) => adaptCastle(castle, map.seed ?? 0)),
    heroes: (options.heroes ?? []).map(adaptHero),
    objects,
    guardians,
    rewards,
    victory: structuredClone(map.victory),
    defeat: map.defeat ? structuredClone(map.defeat) : null,
    source: options.source !== undefined ? options.source
      : localReference ? {
        kind: 'local', documentId: localReference.documentId,
        revision: localReference.revision,
      } : { kind: 'builtIn', mapId: map.id },
  });
}
