import { LEGACY_BUILT_IN_MAP_IDS, type LegacyBuiltInMapId, type LocalMapId } from './types';

export interface LocalMapReference {
  kind: 'local';
  mapId: LocalMapId;
  documentId: string;
  revision: number;
  mapHash: string;
}

const LOCAL_MAP_REFERENCE = /^local:v1:([a-z0-9]+(?:-[a-z0-9]+)*):r([1-9][0-9]*):h([0-9a-f]{8})$/;

/**
 * Local references occupy a namespace that portable/built-in slugs cannot enter. The entire
 * immutable identity stays in the existing serialized `mapId` field.
 */
export function encodeLocalMapReference(
  reference: Omit<LocalMapReference, 'kind' | 'mapId'>,
): LocalMapId {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reference.documentId)) {
    throw new Error('Local map document ID must be a lowercase kebab-case slug.');
  }
  if (!Number.isSafeInteger(reference.revision) || reference.revision < 1) {
    throw new Error('Local map revision must be a positive safe integer.');
  }
  if (!/^[0-9a-f]{8}$/.test(reference.mapHash)) {
    throw new Error('Local map hash must be an eight-character lowercase hexadecimal hash.');
  }
  return `local:v1:${reference.documentId}:r${reference.revision}:h${reference.mapHash}`;
}

export function parseLocalMapReference(value: string): LocalMapReference | null {
  const match = LOCAL_MAP_REFERENCE.exec(value);
  if (!match) return null;
  const revision = Number(match[2]);
  if (!Number.isSafeInteger(revision)) return null;
  return {
    kind: 'local', mapId: value as LocalMapId,
    documentId: match[1], revision, mapHash: match[3],
  };
}

export function isLocalMapReference(value: string): boolean {
  return parseLocalMapReference(value) !== null;
}

export function isLegacyBuiltInMapId(value: string): value is LegacyBuiltInMapId {
  return (LEGACY_BUILT_IN_MAP_IDS as readonly string[]).includes(value);
}
