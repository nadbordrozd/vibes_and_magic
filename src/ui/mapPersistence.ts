import {
  cloneEditorMapDocument,
  hashEditorMapDocument,
  parseEditorMapDocument,
  serializeEditorMapDocument,
  stableEntityId,
  validateEditorMapDocument, validateEditorMapForPlay,
  type EditorMapDiagnostic,
  type EditorMapDocument,
} from '../core/mapEditor';
import { parseLocalMapReference } from '../core/mapReference';
import type { LocalMapId } from '../core/types';
import { browserStorage, type StorageLike } from './persistence';

export const EDITOR_MAP_STORAGE_SCHEMA = 1 as const;
export const EDITOR_MAP_STORAGE_NAMESPACE = 'vibes-and-magic.editor-maps.v1' as const;
export const EDITOR_MAP_EXPORT_SUFFIX = '.vam-map.json' as const;

const INDEX_KEY = `${EDITOR_MAP_STORAGE_NAMESPACE}.index`;
const INDEX_TYPE = 'vibes-and-magic-map-library-index';
const ENVELOPE_TYPE = 'vibes-and-magic-local-map';

interface StoredMapSnapshot {
  revision: number;
  savedAt: number;
  mapHash: string;
  contents: string;
}

interface StoredMapEnvelope {
  envelopeType: typeof ENVELOPE_TYPE;
  schemaVersion: typeof EDITOR_MAP_STORAGE_SCHEMA;
  documentId: string;
  updatedAt: number;
  draft: StoredMapSnapshot;
  revisions: StoredMapSnapshot[];
}

interface StoredMapIndex {
  envelopeType: typeof INDEX_TYPE;
  schemaVersion: typeof EDITOR_MAP_STORAGE_SCHEMA;
  documentIds: string[];
}

export type EditorMapRepositoryFailureCode =
  | 'storage-unavailable'
  | 'storage-read-failed'
  | 'storage-write-failed'
  | 'storage-record-corrupt'
  | 'storage-version-unsupported'
  | 'map-not-found'
  | 'id-collision'
  | 'revision-collision'
  | 'draft-collision'
  | 'map-not-playable'
  | 'map-hash-mismatch'
  | 'confirmation-required'
  | 'import-invalid'
  | 'import-cancelled';

export interface EditorMapRepositoryFailure {
  code: EditorMapRepositoryFailureCode;
  message: string;
  documentId?: string;
  revision?: number;
  storageKey?: string;
  /** The repository never mutates a bad record; callers may offer these bytes for recovery. */
  rawRecord?: string;
  diagnostics?: EditorMapDiagnostic[];
}

export type EditorMapRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EditorMapRepositoryFailure };

export interface EditorMapStoredDocument {
  document: EditorMapDocument;
  diagnostics: EditorMapDiagnostic[];
  savedAt: number;
  mapHash: string;
  immutable: boolean;
}

export interface EditorMapSummary {
  id: string;
  name: string;
  draftRevision: number | null;
  revisions: number[];
  updatedAt: number | null;
  mapHash: string | null;
  compatibility: 'compatible' | 'diagnostic' | 'corrupt' | 'unsupported';
  diagnostics: EditorMapDiagnostic[];
  latestPlayable: null | {
    revision: number;
    mapHash: string;
    name: string;
    author: string;
    style: string;
    width: number;
    height: number;
  };
}

export interface EditorMapLibrary {
  maps: EditorMapSummary[];
}

export interface SaveEditorMapDraftOptions {
  /** Refuse to overwrite a map ID. Used by New map and Duplicate. */
  createOnly?: boolean;
  /** Optimistic-concurrency token returned by load/list. */
  expectedDraftHash?: string;
}

export interface DeleteEditorMapConfirmation {
  /** Must exactly match the requested ID, making deletion an explicit UI action. */
  confirmDocumentId: string;
}

export interface EditorMapExport {
  filename: `${string}${typeof EDITOR_MAP_EXPORT_SUFFIX}`;
  mimeType: 'application/json';
  contents: string;
  mapHash: string;
  diagnostics: EditorMapDiagnostic[];
  promotion: {
    documentId: string;
    revision: number;
    eligible: boolean;
    suggestedRepositoryPath: string;
  };
}

export type EditorMapImportCollision = 'replace' | 'copy' | 'cancel';

export interface ImportEditorMapOptions {
  collision?: EditorMapImportCollision;
  copyId?: string;
  copyName?: string;
}

function recordKey(documentId: string): string {
  return `${EDITOR_MAP_STORAGE_NAMESPACE}.document.${encodeURIComponent(documentId)}`;
}

function failure(
  code: EditorMapRepositoryFailureCode,
  message: string,
  details: Omit<EditorMapRepositoryFailure, 'code' | 'message'> = {},
): EditorMapRepositoryResult<never> {
  return { ok: false, error: { code, message, ...details } };
}

function repositoryDiagnostic(
  code: string,
  message: string,
  stage: EditorMapDiagnostic['stage'] = 'schema',
): EditorMapDiagnostic {
  return {
    code,
    severity: 'error',
    stage,
    target: { kind: 'document' },
    message,
  };
}

function storageOrFailure(storage: StorageLike | null): EditorMapRepositoryResult<StorageLike> {
  return storage ? { ok: true, value: storage } : failure(
    'storage-unavailable',
    'Browser storage is unavailable. Export the map to keep a portable copy.',
  );
}

function storageRead(storage: StorageLike, key: string): EditorMapRepositoryResult<string | null> {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch (error) {
    return failure('storage-read-failed',
      `Could not read the local map library: ${error instanceof Error ? error.message : String(error)}`,
      { storageKey: key });
  }
}

function indexFailure(rawRecord: string, message: string, unsupported = false) {
  return failure(unsupported ? 'storage-version-unsupported' : 'storage-record-corrupt', message, {
    storageKey: INDEX_KEY, rawRecord,
  });
}

function readIndex(storage: StorageLike): EditorMapRepositoryResult<{
  index: StoredMapIndex;
  raw: string | null;
}> {
  const read = storageRead(storage, INDEX_KEY);
  if (!read.ok) return read;
  if (read.value === null) return {
    ok: true,
    value: {
      index: { envelopeType: INDEX_TYPE, schemaVersion: EDITOR_MAP_STORAGE_SCHEMA, documentIds: [] },
      raw: null,
    },
  };
  let value: unknown;
  try { value = JSON.parse(read.value); } catch {
    return indexFailure(read.value,
      'The local map index is unreadable. Its bytes were kept for recovery.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return indexFailure(read.value, 'The local map index has an invalid envelope.');
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== EDITOR_MAP_STORAGE_SCHEMA) {
    return indexFailure(read.value,
      `Local map index schema ${String(record.schemaVersion)} is not supported by this build.`, true);
  }
  if (record.envelopeType !== INDEX_TYPE || !Array.isArray(record.documentIds)
      || record.documentIds.some((id) => typeof id !== 'string')
      || new Set(record.documentIds).size !== record.documentIds.length) {
    return indexFailure(read.value, 'The local map index has invalid fields.');
  }
  return {
    ok: true,
    value: {
      index: {
        envelopeType: INDEX_TYPE,
        schemaVersion: EDITOR_MAP_STORAGE_SCHEMA,
        documentIds: [...record.documentIds as string[]].sort(),
      },
      raw: read.value,
    },
  };
}

function isSnapshot(value: unknown): value is StoredMapSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Partial<StoredMapSnapshot>;
  return Number.isInteger(snapshot.revision) && (snapshot.revision ?? 0) > 0
    && typeof snapshot.savedAt === 'number' && Number.isFinite(snapshot.savedAt)
    && typeof snapshot.mapHash === 'string' && typeof snapshot.contents === 'string';
}

function readEnvelope(
  storage: StorageLike,
  documentId: string,
): EditorMapRepositoryResult<{ envelope: StoredMapEnvelope; raw: string }> {
  const key = recordKey(documentId);
  const read = storageRead(storage, key);
  if (!read.ok) return read;
  if (read.value === null) return failure('map-not-found', `Local map "${documentId}" was not found.`, {
    documentId, storageKey: key,
  });
  let value: unknown;
  try { value = JSON.parse(read.value); } catch {
    return failure('storage-record-corrupt', `Local map "${documentId}" is unreadable.`, {
      documentId, storageKey: key, rawRecord: read.value,
    });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return failure(
    'storage-record-corrupt', `Local map "${documentId}" has an invalid envelope.`,
    { documentId, storageKey: key, rawRecord: read.value },
  );
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== EDITOR_MAP_STORAGE_SCHEMA) return failure(
    'storage-version-unsupported',
    `Local map "${documentId}" uses unsupported envelope schema ${String(record.schemaVersion)}.`,
    { documentId, storageKey: key, rawRecord: read.value },
  );
  if (record.envelopeType !== ENVELOPE_TYPE || record.documentId !== documentId
      || typeof record.updatedAt !== 'number' || !Number.isFinite(record.updatedAt)
      || !isSnapshot(record.draft) || !Array.isArray(record.revisions)
      || !record.revisions.every(isSnapshot)) return failure(
    'storage-record-corrupt', `Local map "${documentId}" has invalid envelope fields.`,
    { documentId, storageKey: key, rawRecord: read.value },
  );
  const revisions = record.revisions as StoredMapSnapshot[];
  if (new Set(revisions.map((snapshot) => snapshot.revision)).size !== revisions.length
      || revisions.some((snapshot) => snapshot.revision !== parseSnapshot(snapshot).revision)) {
    return failure('storage-record-corrupt',
      `Local map "${documentId}" has inconsistent revision metadata.`,
      { documentId, storageKey: key, rawRecord: read.value });
  }
  return {
    ok: true,
    value: {
      envelope: {
        envelopeType: ENVELOPE_TYPE,
        schemaVersion: EDITOR_MAP_STORAGE_SCHEMA,
        documentId,
        updatedAt: record.updatedAt,
        draft: record.draft,
        revisions: [...revisions].sort((left, right) => left.revision - right.revision),
      },
      raw: read.value,
    },
  };
}

function parseSnapshot(snapshot: StoredMapSnapshot): {
  revision: number | null;
  document: EditorMapDocument | null;
  diagnostics: EditorMapDiagnostic[];
} {
  const parsed = parseEditorMapDocument(snapshot.contents);
  return {
    revision: parsed.document?.revision ?? null,
    document: parsed.document,
    diagnostics: parsed.diagnostics,
  };
}

function snapshotFor(document: EditorMapDocument, savedAt = Date.now()): StoredMapSnapshot {
  const contents = serializeEditorMapDocument(document);
  return {
    revision: document.revision,
    savedAt,
    mapHash: hashEditorMapDocument(document),
    contents,
  };
}

function writeEnvelope(
  storage: StorageLike,
  envelope: StoredMapEnvelope,
  indexState: { index: StoredMapIndex; raw: string | null },
): EditorMapRepositoryResult<void> {
  const key = recordKey(envelope.documentId);
  const previousRecord = storageRead(storage, key);
  if (!previousRecord.ok) return previousRecord;
  const isNew = !indexState.index.documentIds.includes(envelope.documentId);
  const nextIndex: StoredMapIndex = {
    ...indexState.index,
    documentIds: [...new Set([...indexState.index.documentIds, envelope.documentId])].sort(),
  };
  try {
    storage.setItem(key, JSON.stringify(envelope));
    if (isNew) storage.setItem(INDEX_KEY, JSON.stringify(nextIndex));
    return { ok: true, value: undefined };
  } catch (error) {
    try {
      if (previousRecord.value === null) storage.removeItem(key);
      else storage.setItem(key, previousRecord.value);
      if (isNew) {
        if (indexState.raw === null) storage.removeItem(INDEX_KEY);
        else storage.setItem(INDEX_KEY, indexState.raw);
      }
    } catch { /* Best-effort rollback; never touch campaign save keys. */ }
    return failure('storage-write-failed',
      `Could not save the local map. Export it before freeing browser storage. ${
        error instanceof Error ? error.message : String(error)}`,
      { documentId: envelope.documentId, storageKey: key });
  }
}

function loadSnapshot(
  envelopeResult: EditorMapRepositoryResult<{ envelope: StoredMapEnvelope; raw: string }>,
  snapshot: StoredMapSnapshot | undefined,
  immutable: boolean,
  revision?: number,
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  if (!envelopeResult.ok) return envelopeResult;
  const { envelope, raw } = envelopeResult.value;
  if (!snapshot) return failure('map-not-found',
    revision === undefined
      ? `Local map "${envelope.documentId}" has no draft.`
      : `Local map "${envelope.documentId}" has no revision ${revision}.`,
    { documentId: envelope.documentId, revision, storageKey: recordKey(envelope.documentId) });
  const parsed = parseSnapshot(snapshot);
  if (!parsed.document || parsed.document.id !== envelope.documentId
      || parsed.document.revision !== snapshot.revision
      || hashEditorMapDocument(parsed.document) !== snapshot.mapHash) return failure(
    'storage-record-corrupt',
    `Local map "${envelope.documentId}" ${immutable ? `revision ${snapshot.revision}` : 'draft'} is corrupt.`,
    {
      documentId: envelope.documentId, revision: snapshot.revision,
      storageKey: recordKey(envelope.documentId), rawRecord: raw,
      diagnostics: parsed.diagnostics,
    },
  );
  return {
    ok: true,
    value: {
      document: cloneEditorMapDocument(parsed.document),
      diagnostics: parsed.diagnostics,
      savedAt: snapshot.savedAt,
      mapHash: snapshot.mapHash,
      immutable,
    },
  };
}

export function listEditorMaps(
  storage: StorageLike | null = browserStorage(),
): EditorMapRepositoryResult<EditorMapLibrary> {
  const available = storageOrFailure(storage);
  if (!available.ok) return available;
  const index = readIndex(available.value);
  if (!index.ok) return index;
  const maps: EditorMapSummary[] = [];
  for (const id of index.value.index.documentIds) {
    const stored = readEnvelope(available.value, id);
    if (!stored.ok) {
      const unsupported = stored.error.code === 'storage-version-unsupported';
      maps.push({
        id, name: unsupported ? 'Unsupported local map' : 'Unreadable local map',
        draftRevision: null, revisions: [], updatedAt: null, mapHash: null,
        compatibility: unsupported ? 'unsupported' : 'corrupt',
        latestPlayable: null,
        diagnostics: [repositoryDiagnostic(
          unsupported ? 'storage.envelope.version.unsupported' : 'storage.envelope.corrupt',
          stored.error.message,
          unsupported ? 'compatibility' : 'schema',
        )],
      });
      continue;
    }
    const parsed = parseSnapshot(stored.value.envelope.draft);
    const valid = parsed.document?.id === id
      && parsed.document.revision === stored.value.envelope.draft.revision
      && hashEditorMapDocument(parsed.document) === stored.value.envelope.draft.mapHash;
    const corruptRevision = stored.value.envelope.revisions.find((snapshot) => {
      const revision = parseSnapshot(snapshot);
      return revision.document?.id !== id || revision.document.revision !== snapshot.revision
        || hashEditorMapDocument(revision.document) !== snapshot.mapHash;
    });
    const diagnostics = [
      ...parsed.diagnostics,
      ...(!valid ? [repositoryDiagnostic(
        'storage.draft.corrupt', `Local map "${id}" has an unreadable or inconsistent draft.`,
      )] : []),
      ...(corruptRevision ? [repositoryDiagnostic(
        'storage.revision.corrupt',
        `Local map "${id}" has an unreadable or inconsistent revision ${corruptRevision.revision}.`,
      )] : []),
    ];
    const latestSnapshot = [...stored.value.envelope.revisions].reverse().find((snapshot) => {
      const candidate = parseSnapshot(snapshot);
      return candidate.document?.id === id
        && hashEditorMapDocument(candidate.document) === snapshot.mapHash;
    });
    const latestDocument = latestSnapshot ? parseSnapshot(latestSnapshot).document : null;
    maps.push({
      id,
      name: valid ? parsed.document!.metadata.name : 'Unreadable local map',
      draftRevision: valid ? parsed.document!.revision : null,
      revisions: stored.value.envelope.revisions.map((snapshot) => snapshot.revision),
      updatedAt: stored.value.envelope.updatedAt,
      mapHash: valid ? stored.value.envelope.draft.mapHash : null,
      compatibility: !valid || corruptRevision ? 'corrupt'
        : diagnostics.length > 0 ? 'diagnostic' : 'compatible',
      diagnostics,
      latestPlayable: latestSnapshot && latestDocument ? {
        revision: latestSnapshot.revision,
        mapHash: latestSnapshot.mapHash,
        name: latestDocument.metadata.name,
        author: latestDocument.metadata.author,
        style: latestDocument.metadata.style,
        width: latestDocument.dimensions.width,
        height: latestDocument.dimensions.height,
      } : null,
    });
  }
  maps.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  return { ok: true, value: { maps } };
}

export function loadEditorMapDraft(
  documentId: string,
  storage: StorageLike | null = browserStorage(),
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  const available = storageOrFailure(storage);
  if (!available.ok) return available;
  const envelope = readEnvelope(available.value, documentId);
  return loadSnapshot(envelope, envelope.ok ? envelope.value.envelope.draft : undefined, false);
}

export const loadNewestEditorMapDraft = loadEditorMapDraft;

export function loadEditorMapRevision(
  documentId: string,
  revision: number,
  storage: StorageLike | null = browserStorage(),
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  const available = storageOrFailure(storage);
  if (!available.ok) return available;
  const envelope = readEnvelope(available.value, documentId);
  return loadSnapshot(envelope, envelope.ok
    ? envelope.value.envelope.revisions.find((snapshot) => snapshot.revision === revision)
    : undefined, true, revision);
}

export function saveEditorMapDraft(
  input: EditorMapDocument,
  storage: StorageLike | null = browserStorage(),
  options: SaveEditorMapDraftOptions = {},
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  const available = storageOrFailure(storage);
  if (!available.ok) return available;
  let canonical: EditorMapDocument;
  try {
    canonical = parseEditorMapDocument(serializeEditorMapDocument(input)).document!;
  } catch (error) {
    const diagnostics = validateEditorMapDocument(input);
    return failure('import-invalid',
      `Map draft is not structurally saveable: ${error instanceof Error ? error.message : String(error)}`,
      { documentId: input.id, diagnostics });
  }
  const index = readIndex(available.value);
  if (!index.ok) return index;
  const exists = index.value.index.documentIds.includes(canonical.id);
  if (exists && options.createOnly) return failure(
    'id-collision', `A local map with ID "${canonical.id}" already exists.`,
    { documentId: canonical.id });
  let envelope: StoredMapEnvelope;
  if (exists) {
    const existing = readEnvelope(available.value, canonical.id);
    if (!existing.ok) return existing;
    if (options.expectedDraftHash !== undefined
        && existing.value.envelope.draft.mapHash !== options.expectedDraftHash) return failure(
      'draft-collision', 'This draft changed after it was opened. Reload it or save a copy.',
      { documentId: canonical.id });
    const latestRevision = existing.value.envelope.revisions.at(-1)?.revision ?? 0;
    const collision = existing.value.envelope.revisions.find((snapshot) =>
      snapshot.revision === canonical.revision);
    if (collision && collision.contents !== serializeEditorMapDocument(canonical)) {
      canonical = cloneEditorMapDocument(canonical);
      canonical.revision = latestRevision + 1;
    } else if (canonical.revision < existing.value.envelope.draft.revision) {
      return failure('revision-collision',
        `Draft revision ${canonical.revision} is older than the stored draft revision ${
          existing.value.envelope.draft.revision}.`,
        { documentId: canonical.id, revision: canonical.revision });
    }
    const savedAt = Date.now();
    envelope = {
      ...existing.value.envelope,
      updatedAt: savedAt,
      draft: snapshotFor(canonical, savedAt),
    };
  } else {
    const savedAt = Date.now();
    envelope = {
      envelopeType: ENVELOPE_TYPE,
      schemaVersion: EDITOR_MAP_STORAGE_SCHEMA,
      documentId: canonical.id,
      updatedAt: savedAt,
      draft: snapshotFor(canonical, savedAt),
      revisions: [],
    };
  }
  const written = writeEnvelope(available.value, envelope, index.value);
  if (!written.ok) return written;
  return loadSnapshot({ ok: true, value: { envelope, raw: JSON.stringify(envelope) } },
    envelope.draft, false);
}

export function freezeEditorMapRevision(
  input: EditorMapDocument,
  storage: StorageLike | null = browserStorage(),
  options: SaveEditorMapDraftOptions = {},
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  const diagnostics = validateEditorMapForPlay(input);
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) return failure(
    'map-not-playable',
    'Only a map with zero validation errors can be frozen as a playable revision.',
    { documentId: input.id, revision: input.revision, diagnostics },
  );
  const saved = saveEditorMapDraft(input, storage, options);
  if (!saved.ok) return saved;
  const available = storageOrFailure(storage);
  if (!available.ok) return available;
  const index = readIndex(available.value);
  if (!index.ok) return index;
  const existing = readEnvelope(available.value, saved.value.document.id);
  if (!existing.ok) return existing;
  const snapshot = snapshotFor(saved.value.document);
  const prior = existing.value.envelope.revisions.find((revision) =>
    revision.revision === snapshot.revision);
  if (prior) {
    if (prior.contents !== snapshot.contents || prior.mapHash !== snapshot.mapHash) return failure(
      'revision-collision', `Revision ${snapshot.revision} is already frozen with different bytes.`,
      { documentId: saved.value.document.id, revision: snapshot.revision });
    return loadSnapshot(existing, prior, true, prior.revision);
  }
  const envelope: StoredMapEnvelope = {
    ...existing.value.envelope,
    updatedAt: snapshot.savedAt,
    draft: snapshot,
    revisions: [...existing.value.envelope.revisions, snapshot]
      .sort((left, right) => left.revision - right.revision),
  };
  const written = writeEnvelope(available.value, envelope, index.value);
  if (!written.ok) return written;
  return loadSnapshot({ ok: true, value: { envelope, raw: JSON.stringify(envelope) } },
    snapshot, true, snapshot.revision);
}

export function renameEditorMap(
  documentId: string,
  name: string,
  storage: StorageLike | null = browserStorage(),
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  const loaded = loadEditorMapDraft(documentId, storage);
  if (!loaded.ok) return loaded;
  const document = loaded.value.document;
  document.metadata.name = name;
  return saveEditorMapDraft(document, storage, { expectedDraftHash: loaded.value.mapHash });
}

function uniqueCopyId(id: string, existing: Iterable<string>): string {
  return stableEntityId(`${id}-copy`, existing);
}

export function duplicateEditorMap(
  documentId: string,
  storage: StorageLike | null = browserStorage(),
  options: { id?: string; name?: string } = {},
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  const loaded = loadEditorMapDraft(documentId, storage);
  if (!loaded.ok) return loaded;
  const library = listEditorMaps(storage);
  if (!library.ok) return library;
  const copy = loaded.value.document;
  const sourceRevision = copy.revision;
  copy.id = options.id ?? uniqueCopyId(documentId, library.value.maps.map((map) => map.id));
  copy.revision = 1;
  copy.metadata.name = options.name ?? `${copy.metadata.name} Copy`;
  copy.source = { kind: 'local', documentId, revision: sourceRevision };
  return saveEditorMapDraft(copy, storage, { createOnly: true });
}

export function deleteEditorMap(
  documentId: string,
  confirmation: DeleteEditorMapConfirmation | undefined,
  storage: StorageLike | null = browserStorage(),
): EditorMapRepositoryResult<void> {
  if (confirmation?.confirmDocumentId !== documentId) return failure(
    'confirmation-required', `Confirm deletion of local map "${documentId}" explicitly.`,
    { documentId });
  const available = storageOrFailure(storage);
  if (!available.ok) return available;
  const index = readIndex(available.value);
  if (!index.ok) return index;
  if (!index.value.index.documentIds.includes(documentId)) return failure(
    'map-not-found', `Local map "${documentId}" was not found.`, { documentId });
  const envelope = readEnvelope(available.value, documentId);
  if (!envelope.ok) return envelope;
  if (envelope.value.envelope.revisions.length) return failure(
    'confirmation-required',
    `Local map "${documentId}" has frozen playable revisions and cannot be deleted while campaigns may reference them. Duplicate or rename its draft instead.`,
    { documentId },
  );
  const key = recordKey(documentId);
  const previous = storageRead(available.value, key);
  if (!previous.ok) return previous;
  const nextIndex: StoredMapIndex = {
    ...index.value.index,
    documentIds: index.value.index.documentIds.filter((id) => id !== documentId),
  };
  try {
    available.value.setItem(INDEX_KEY, JSON.stringify(nextIndex));
    available.value.removeItem(key);
    return { ok: true, value: undefined };
  } catch (error) {
    try {
      if (index.value.raw === null) available.value.removeItem(INDEX_KEY);
      else available.value.setItem(INDEX_KEY, index.value.raw);
      if (previous.value !== null) available.value.setItem(key, previous.value);
    } catch { /* Best-effort rollback. */ }
    return failure('storage-write-failed',
      `Could not delete local map "${documentId}": ${
        error instanceof Error ? error.message : String(error)}`,
      { documentId, storageKey: key });
  }
}

export function exportEditorMapFile(
  document: EditorMapDocument,
): EditorMapRepositoryResult<EditorMapExport> {
  let contents: string;
  try { contents = serializeEditorMapDocument(document); } catch (error) {
    return failure('import-invalid',
      `Map cannot be exported until its structural errors are fixed: ${
        error instanceof Error ? error.message : String(error)}`,
      { documentId: document.id, diagnostics: validateEditorMapDocument(document) });
  }
  const parsed = parseEditorMapDocument(contents);
  const diagnostics = parsed.diagnostics;
  const filename = `${document.id}${EDITOR_MAP_EXPORT_SUFFIX}` as const;
  return {
    ok: true,
    value: {
      filename,
      mimeType: 'application/json',
      contents,
      mapHash: hashEditorMapDocument(parsed.document!),
      diagnostics,
      promotion: {
        documentId: document.id,
        revision: document.revision,
        eligible: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
        suggestedRepositoryPath: `src/content/maps/authored/${filename}`,
      },
    },
  };
}

/** Export exactly the immutable revision pinned by a local campaign reference. */
export function exportFrozenEditorMapReference(
  mapId: LocalMapId,
  storage: StorageLike | null = browserStorage(),
): EditorMapRepositoryResult<EditorMapExport> {
  const reference = parseLocalMapReference(mapId);
  if (!reference) return failure(
    'import-invalid',
    'This campaign does not contain a valid local map reference. No map was exported.',
  );
  const loaded = loadEditorMapRevision(reference.documentId, reference.revision, storage);
  if (!loaded.ok) {
    const { code, message, ...details } = loaded.error;
    return failure(code,
      `${message} Import the required .vam-map.json; the newest draft is not a substitute.`,
      details);
  }
  if (loaded.value.mapHash !== reference.mapHash) return failure(
    'map-hash-mismatch',
    `Local map revision ${reference.revision} does not match required hash ${reference.mapHash}. Import the required .vam-map.json; the newest draft was not exported.`,
    { documentId: reference.documentId, revision: reference.revision },
  );
  return exportEditorMapFile(loaded.value.document);
}

export function importEditorMapFile(
  contents: string,
  storage: StorageLike | null = browserStorage(),
  options: ImportEditorMapOptions = {},
): EditorMapRepositoryResult<EditorMapStoredDocument> {
  const parsed = parseEditorMapDocument(contents);
  if (!parsed.document) return failure('import-invalid',
    'The selected file is not a supported portable Vibes and Magic map.',
    { diagnostics: parsed.diagnostics });
  const available = storageOrFailure(storage);
  if (!available.ok) return available;
  const index = readIndex(available.value);
  if (!index.ok) return index;
  const exists = index.value.index.documentIds.includes(parsed.document.id);
  if (!exists) {
    const saved = saveEditorMapDraft(parsed.document, available.value, { createOnly: true });
    if (!saved.ok) return saved;
    return parsed.diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      ? saved : freezeEditorMapRevision(saved.value.document, available.value);
  }
  const collision = options.collision ?? 'cancel';
  if (collision === 'cancel') return failure(
    'import-cancelled', `Import cancelled because local map "${parsed.document.id}" already exists.`,
    { documentId: parsed.document.id, revision: parsed.document.revision });
  if (collision === 'copy') {
    const copy = parsed.document;
    const sourceId = copy.id;
    const sourceRevision = copy.revision;
    copy.id = options.copyId ?? uniqueCopyId(
      copy.id, index.value.index.documentIds,
    );
    copy.revision = 1;
    copy.metadata.name = options.copyName ?? `${copy.metadata.name} Copy`;
    copy.source = {
      kind: 'local', documentId: sourceId, revision: sourceRevision,
    };
    const saved = saveEditorMapDraft(copy, available.value, { createOnly: true });
    if (!saved.ok) return saved;
    return parsed.diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      ? saved : freezeEditorMapRevision(saved.value.document, available.value);
  }
  // Replace means replace the editable draft. Frozen snapshots remain immutable. If an imported
  // playable revision does not collide, retain it exactly for future campaign references.
  const existing = readEnvelope(available.value, parsed.document.id);
  if (!existing.ok) return existing;
  const snapshot = snapshotFor(parsed.document);
  const frozen = existing.value.envelope.revisions.find((revision) =>
    revision.revision === snapshot.revision);
  const revisions = !frozen ? [...existing.value.envelope.revisions, snapshot]
    .sort((left, right) => left.revision - right.revision) : existing.value.envelope.revisions;
  const envelope: StoredMapEnvelope = {
    ...existing.value.envelope,
    updatedAt: snapshot.savedAt,
    draft: snapshot,
    revisions: parsed.diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      ? existing.value.envelope.revisions : revisions,
  };
  const written = writeEnvelope(available.value, envelope, index.value);
  if (!written.ok) return written;
  return loadSnapshot({ ok: true, value: { envelope, raw: JSON.stringify(envelope) } },
    snapshot, false);
}
