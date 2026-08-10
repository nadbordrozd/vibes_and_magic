import { FACTIONS } from '../content/factions';
import { adaptRuntimeMapToEditorDocument, createBlankEditorMap,
  cloneEditorMapDocument, createDefaultEditorPlayer, hashEditorMapDocument, slugifyEditorId,
  type EditorMapDocument } from '../core/mapEditor';
import { createGame } from '../core/game';
import { PLAYER_IDS, type BuiltInMapId, type FactionId, type NewGameOptions,
  type TerrainId, type TerrainSkinId } from '../core/types';
import { CAMPAIGN_PRESENTATION } from './campaignPresentation';
import { builtInPortableMapDocument } from '../content/maps/catalog';

export const BUILT_IN_EDITOR_CLONE_SEED = 1;

export const DEFAULT_EDITOR_FACTIONS = Object.keys(FACTIONS) as FactionId[];

export interface NewBlankEditorMapOptions {
  id: string;
  name: string;
  width: number;
  height: number;
  terrain: TerrainId;
  skin: TerrainSkinId;
  playerCount: number;
}

export function createNewBlankEditorMap(options: NewBlankEditorMapOptions) {
  const document = createBlankEditorMap({
    ...options,
    id: slugifyEditorId(options.id),
    description: 'A custom map created in the in-game editor.',
    author: 'Local mapmaker',
    style: `${options.playerCount}-player conquest map`,
  });
  document.players = PLAYER_IDS.slice(0, options.playerCount).map((id, index) =>
    createDefaultEditorPlayer(
      id,
      DEFAULT_EDITOR_FACTIONS[index % DEFAULT_EDITOR_FACTIONS.length],
    ));
  document.victory = {
    type: 'conquest',
    flavor: 'Claim the realm before your rivals do.',
    mechanics: 'Defeat every active opponent.',
  };
  return document;
}

function builtInPlayerCount(mapId: BuiltInMapId): 1 | 2 | 4 | 6 {
  if (mapId === 'manywhere') return 1;
  if (mapId === 'sixfold-trial') return 6;
  if (mapId === 'crosstitch' || mapId === 'crosstitch-kit'
      || mapId === 'crooked-crown') return 4;
  return 2;
}

export function builtInEditorSetup(mapId: BuiltInMapId): NewGameOptions {
  return {
    seed: BUILT_IN_EDITOR_CLONE_SEED,
    mapId,
    difficulty: 'normal',
    playerCount: builtInPlayerCount(mapId),
    p1: 'human',
    p2: mapId === 'grand-muster' ? 'dormant' : 'ai',
    p3: 'ai',
    p4: 'ai',
    p5: 'ai',
    p6: 'ai',
    p1Faction: 'hearthguard',
    p2Faction: 'woundWrights',
    p3Faction: 'unfinished',
    p4Faction: 'vespiary',
    p5Faction: 'hagwood',
    p6Faction: 'wildergrass',
  };
}

export function cloneBuiltInMapForEditor(mapId: BuiltInMapId, id: string, name: string) {
  const portable = builtInPortableMapDocument(mapId);
  if (portable) return clonePortableBuiltInMapForEditor(portable, id, name);
  const state = createGame(builtInEditorSetup(mapId));
  const players = Object.values(state.players).filter((player) => player.active);
  return adaptRuntimeMapToEditorDocument(state.map, {
    id: slugifyEditorId(id),
    revision: 1,
    metadata: {
      name,
      description: `Editable clone of ${state.map.name}.`,
      style: CAMPAIGN_PRESENTATION[mapId].style,
    },
    players,
    castles: state.castles,
    heroes: players.flatMap((player) => player.heroes),
    source: { kind: 'builtIn', mapId },
  });
}

/** Portable built-ins clone authoring facts directly; runtime adaptation is only for legacy maps. */
export function clonePortableBuiltInMapForEditor(
  source: EditorMapDocument,
  id: string,
  name: string,
): EditorMapDocument {
  const clone = cloneEditorMapDocument(source);
  clone.id = slugifyEditorId(id);
  clone.revision = 1;
  clone.metadata = { ...clone.metadata, name };
  clone.source = { kind: 'builtIn', mapId: source.id };
  return cloneEditorMapDocument(clone);
}

export function editorDocumentIsDirty(
  document: EditorMapDocument,
  baselineHash: string | null,
): boolean {
  if (baselineHash === null) return true;
  try { return hashEditorMapDocument(document) !== baselineHash; } catch { return true; }
}
