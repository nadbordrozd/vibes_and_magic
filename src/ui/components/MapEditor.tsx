import { useEffect, useMemo, useRef, useState } from 'react';
import { FACTIONS } from '../../content/factions';
import { TERRAIN } from '../../content/terrain';
import {
  parseEditorMapDocument, slugifyEditorId, validateEditorMapForPlay,
  type EditorMapDiagnostic, type EditorMapDocument,
} from '../../core/mapEditor';
import { encodeLocalMapReference } from '../../core/mapReference';
import type { LocalMapId } from '../../core/types';
import type { BuiltInMapId, TerrainId, TerrainSkinId } from '../../core/types';
import { CAMPAIGN_PRESENTATIONS } from '../campaignPresentation';
import {
  duplicateEditorMap, exportEditorMapFile, freezeEditorMapRevision, importEditorMapFile,
  listEditorMaps, loadEditorMapDraft, saveEditorMapDraft,
  type EditorMapImportCollision, type EditorMapStoredDocument,
  type EditorMapSummary,
} from '../mapPersistence';
import { browserStorage, type StorageLike } from '../persistence';
import {
  cloneBuiltInMapForEditor, createNewBlankEditorMap, editorDocumentIsDirty,
} from '../mapEditorLibrary';
import { EditorTerrainCanvas } from './EditorTerrainCanvas';

export interface MapEditorProps {
  onReturnToTitle: () => void;
  storage?: StorageLike | null;
  initialDocument?: EditorMapDocument;
  initialDocumentId?: string | null;
  initialMapHash?: string | null;
  onPlayMap?: (mapId: LocalMapId, returnTo: 'workspace' | 'library') => void;
}

interface OpenDocument {
  document: EditorMapDocument;
  baselineHash: string | null;
}

interface PendingImport {
  contents: string;
  documentId: string;
  copyId: string;
  copyName: string;
}

function resultError(result: { ok: false; error: { message: string } }): string {
  return result.error.message;
}

function diagnosticCounts(diagnostics: EditorMapDiagnostic[]) {
  return {
    errors: diagnostics.filter((item) => item.severity === 'error').length,
    warnings: diagnostics.filter((item) => item.severity === 'warning').length,
  };
}

function MapDiagnostics({ diagnostics }: { diagnostics: EditorMapDiagnostic[] }) {
  const counts = diagnosticCounts(diagnostics);
  const groups = [...new Set(diagnostics.map((item) => item.stage))];
  return (
    <section className="editor-diagnostics" aria-labelledby="editor-diagnostics-title">
      <header>
        <div><span className="kicker">Live validation</span>
          <h2 id="editor-diagnostics-title">Diagnostics</h2></div>
        <strong className={counts.errors ? 'has-errors' : ''}>
          {counts.errors} errors · {counts.warnings} warnings
        </strong>
      </header>
      {diagnostics.length === 0 ? <p className="editor-valid">No diagnostics.</p> : (
        <div className="editor-diagnostic-groups">{groups.map((stage) => (
          <section key={stage} aria-labelledby={`editor-diagnostics-${stage}`}>
            <h3 id={`editor-diagnostics-${stage}`}>{stage}</h3>
            <ul>{diagnostics.filter((item) => item.stage === stage)
              .map((diagnostic, index) => (
                <li key={`${diagnostic.code}-${index}`} className={diagnostic.severity}>
                  <b>{diagnostic.code}</b><span>{diagnostic.message}</span>
                  <small>{diagnostic.target.kind === 'entity'
                    ? `Entity: ${diagnostic.target.entityId}`
                    : diagnostic.target.kind === 'cell'
                      ? `Cell: ${diagnostic.target.x},${diagnostic.target.y}`
                      : diagnostic.target.path ? `Document: ${diagnostic.target.path}`
                        : 'Document'}</small>
                </li>
              ))}</ul>
          </section>
        ))}</div>
      )}
    </section>
  );
}

function downloadMap(document: EditorMapDocument): string | null {
  const exported = exportEditorMapFile(document);
  if (!exported.ok) return exported.error.message;
  let url: string | null = null;
  try {
    url = URL.createObjectURL(new Blob([exported.value.contents], {
      type: exported.value.mimeType,
    }));
    const anchor = documentGlobal().createElement('a');
    anchor.href = url;
    anchor.download = exported.value.filename;
    anchor.click();
    return null;
  } catch (caught) {
    return `Could not download the portable map: ${
      caught instanceof Error ? caught.message : String(caught)}`;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

// Kept behind a function so static rendering never needs a DOM global.
function documentGlobal(): Document { return window.document; }

export function MapEditor({
  onReturnToTitle, storage, initialDocument, initialDocumentId = null,
  initialMapHash = null, onPlayMap,
}: MapEditorProps) {
  const repositoryStorage = useMemo(
    () => storage === undefined ? browserStorage() : storage,
    [storage],
  );
  const initialLibrary = useMemo(() => listEditorMaps(repositoryStorage), [repositoryStorage]);
  const [library, setLibrary] = useState<EditorMapSummary[]>(
    initialLibrary.ok ? initialLibrary.value.maps : [],
  );
  const initiallyStored = useMemo(() => initialDocumentId
    ? loadEditorMapDraft(initialDocumentId, repositoryStorage) : null,
  [initialDocumentId, repositoryStorage]);
  const [open, setOpen] = useState<OpenDocument | null>(() => initialDocument ? {
    document: initialDocument, baselineHash: initialMapHash,
  } : initiallyStored?.ok ? {
    document: initiallyStored.value.document, baselineHash: initiallyStored.value.mapHash,
  } : null);
  const [error, setError] = useState(initialLibrary.ok ? '' : initialLibrary.error.message);
  const [notice, setNotice] = useState('');
  const [pendingExit, setPendingExit] = useState<'library' | 'title' | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [newId, setNewId] = useState('untitled-map');
  const [newName, setNewName] = useState('Untitled Map');
  const [width, setWidth] = useState(28);
  const [height, setHeight] = useState(20);
  const [playerCount, setPlayerCount] = useState(2);
  const [terrain, setTerrain] = useState<TerrainId>('meadow');
  const [skin, setSkin] = useState<TerrainSkinId>('default');
  const [builtInId, setBuiltInId] = useState<BuiltInMapId>('border-marches');
  const [cloneId, setCloneId] = useState('border-marches-remix');
  const [cloneName, setCloneName] = useState('Border Marches Remix');
  const fileInput = useRef<HTMLInputElement>(null);
  const modal = useRef<HTMLElement>(null);
  const modalReturnFocus = useRef<HTMLElement | null>(null);

  const diagnostics = useMemo(
    () => open ? validateEditorMapForPlay(open.document) : [],
    [open],
  );
  const dirty = Boolean(open && editorDocumentIsDirty(open.document, open.baselineHash));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const exitDialogOpen = pendingExit !== null;
  const importDialogOpen = pendingImport !== null;
  useEffect(() => {
    if (!exitDialogOpen && !importDialogOpen) return;
    modalReturnFocus.current = importDialogOpen ? fileInput.current
      : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focus = window.requestAnimationFrame(() => {
      modal.current?.querySelector<HTMLElement>('button, input')?.focus();
    });
    const cancelDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (exitDialogOpen) setPendingExit(null);
      if (importDialogOpen) setPendingImport(null);
    };
    window.addEventListener('keydown', cancelDialog);
    return () => {
      window.cancelAnimationFrame(focus);
      window.removeEventListener('keydown', cancelDialog);
      if (modalReturnFocus.current?.isConnected) modalReturnFocus.current.focus();
    };
  }, [exitDialogOpen, importDialogOpen]);

  const refreshLibrary = () => {
    const result = listEditorMaps(repositoryStorage);
    if (!result.ok) { setError(resultError(result)); return false; }
    setLibrary(result.value.maps);
    return true;
  };

  const showStored = (stored: EditorMapStoredDocument) => {
    setOpen({ document: stored.document, baselineHash: stored.mapHash });
    setError('');
    setNotice('');
  };

  const createBlank = () => {
    const id = slugifyEditorId(newId);
    if (!id || !newName.trim()) {
      setError('Map ID and name are required. The ID must contain letters or numbers.');
      return;
    }
    if (![width, height].every((value) => Number.isInteger(value) && value > 0 && value <= 256)) {
      setError('Width and height must be whole numbers from 1 to 256.');
      return;
    }
    const document = createNewBlankEditorMap({
      id, name: newName.trim(), width, height, terrain, skin, playerCount,
    });
    setOpen({ document, baselineHash: null });
    setError('');
  };

  const openLocal = (id: string) => {
    const result = loadEditorMapDraft(id, repositoryStorage);
    if (!result.ok) { setError(resultError(result)); return; }
    showStored(result.value);
  };

  const cloneBuiltIn = () => {
    try {
      const document = cloneBuiltInMapForEditor(builtInId, cloneId, cloneName.trim());
      const saved = saveEditorMapDraft(document, repositoryStorage, { createOnly: true });
      if (!saved.ok) { setError(resultError(saved)); return; }
      refreshLibrary();
      showStored(saved.value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const completeImport = (stored: EditorMapStoredDocument) => {
    setPendingImport(null);
    refreshLibrary();
    showStored(stored);
  };

  const importContents = (contents: string) => {
    const imported = importEditorMapFile(contents, repositoryStorage);
    if (imported.ok) { completeImport(imported.value); return; }
    if (imported.error.code !== 'import-cancelled') {
      setError(imported.error.message);
      return;
    }
    const parsed = parseEditorMapDocument(contents).document;
    const documentId = imported.error.documentId ?? parsed?.id ?? 'imported-map';
    setPendingImport({
      contents,
      documentId,
      copyId: `${documentId}-copy`,
      copyName: `${parsed?.metadata.name ?? documentId} Copy`,
    });
    setError('');
  };

  const resolveImport = (collision: EditorMapImportCollision) => {
    if (!pendingImport || collision === 'cancel') { setPendingImport(null); return; }
    const imported = importEditorMapFile(pendingImport.contents, repositoryStorage, {
      collision,
      ...(collision === 'copy' ? {
        copyId: slugifyEditorId(pendingImport.copyId), copyName: pendingImport.copyName.trim(),
      } : {}),
    });
    if (!imported.ok) { setError(resultError(imported)); return; }
    completeImport(imported.value);
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    try { importContents(await file.text()); } catch (caught) {
      setError(`Could not read the selected map: ${caught instanceof Error ? caught.message : String(caught)}`);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = () => {
    if (!open) return;
    const saved = saveEditorMapDraft(open.document, repositoryStorage, {
      createOnly: open.baselineHash === null,
      expectedDraftHash: open.baselineHash ?? undefined,
    });
    if (!saved.ok) { setError(resultError(saved)); return; }
    showStored(saved.value);
    refreshLibrary();
    setNotice('Map draft saved locally.');
  };

  const playWorkspace = () => {
    if (!open || diagnostics.some((item) => item.severity === 'error')) return;
    const frozen = freezeEditorMapRevision(open.document, repositoryStorage, {
      createOnly: open.baselineHash === null,
      expectedDraftHash: open.baselineHash ?? undefined,
    });
    if (!frozen.ok) { setError(resultError(frozen)); return; }
    refreshLibrary();
    showStored(frozen.value);
    onPlayMap?.(encodeLocalMapReference({
      documentId: frozen.value.document.id,
      revision: frozen.value.document.revision,
      mapHash: frozen.value.mapHash,
    }), 'workspace');
  };

  const duplicateLocal = (id: string) => {
    const copied = duplicateEditorMap(id, repositoryStorage);
    if (!copied.ok) { setError(resultError(copied)); return; }
    refreshLibrary();
    showStored(copied.value);
  };

  const requestExit = (destination: 'library' | 'title') => {
    if (dirty) { setPendingExit(destination); return; }
    if (destination === 'title') onReturnToTitle();
    else setOpen(null);
  };

  const confirmExit = () => {
    const destination = pendingExit;
    setPendingExit(null);
    if (destination === 'title') onReturnToTitle();
    else if (destination === 'library') setOpen(null);
  };

  const updateMetadata = (field: keyof EditorMapDocument['metadata'], value: string) => {
    setOpen((current) => current ? {
      ...current,
      document: {
        ...current.document,
        metadata: { ...current.document.metadata, [field]: value },
      },
    } : current);
    setNotice('');
  };

  const updateVictoryText = (field: 'flavor' | 'mechanics', value: string) => {
    setOpen((current) => current ? {
      ...current,
      document: {
        ...current.document,
        victory: { ...current.document.victory, [field]: value },
      },
    } : current);
    setNotice('');
  };

  const updateDocument = (document: EditorMapDocument) => {
    setOpen((current) => current ? { ...current, document } : current);
    setNotice('');
  };

  if (open) return (
    <main className="map-editor-shell editor-workspace" data-surface="map-editor-workspace">
      <header className="editor-topbar">
        <div><span className="kicker">Local map editor · draft revision {open.document.revision}</span>
          <h1>{open.document.metadata.name || 'Untitled map'}</h1>
          <small>{open.document.id} · {open.document.dimensions.width} × {open.document.dimensions.height}
            {' · '}{dirty ? 'Unsaved changes' : 'Saved locally'}</small></div>
        <nav aria-label="Map document actions">
          <button onClick={() => requestExit('library')}>Map library</button>
          <button onClick={() => requestExit('title')}>Title screen</button>
          <button className="primary" onClick={save}>Save draft</button>
          <button className="primary" onClick={playWorkspace}
            disabled={diagnostics.some((item) => item.severity === 'error') || !onPlayMap}
            data-disabled-reason={diagnostics.some((item) => item.severity === 'error')
              ? 'Fix every validation error before test play.'
              : !onPlayMap ? 'Test play is unavailable in this view.' : undefined}
            title={diagnostics.some((item) => item.severity === 'error')
              ? 'Fix every validation error before test play.'
              : !onPlayMap ? 'Test play is unavailable in this view.'
              : dirty ? 'Save and freeze this draft, then test the exact revision.'
                : 'Freeze and test this exact revision.'}>
            {dirty ? 'Save, freeze & test play' : 'Test play'}
          </button>
          <button onClick={() => {
            const failure = downloadMap(open.document);
            if (failure) setError(failure); else setNotice('Portable map exported.');
          }}>Export map</button>
        </nav>
      </header>
      {error && <div className="editor-alert" role="alert">{error}
        <button aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="editor-notice" role="status">{notice}</div>}
      <div className="editor-workspace-grid">
        <details className="editor-identity">
          <summary>Edit map details</summary>
          <div className="editor-identity-fields">
            <label>Name<input value={open.document.metadata.name}
              onChange={(event) => updateMetadata('name', event.target.value)} /></label>
            <label>Description<textarea value={open.document.metadata.description}
              onChange={(event) => updateMetadata('description', event.target.value)} /></label>
            <label>Author<input value={open.document.metadata.author}
              onChange={(event) => updateMetadata('author', event.target.value)} /></label>
            <label>Style<input value={open.document.metadata.style}
              onChange={(event) => updateMetadata('style', event.target.value)} /></label>
            <label>Objective presentation<textarea value={open.document.victory.flavor}
              onChange={(event) => updateVictoryText('flavor', event.target.value)} /></label>
            <label>Objective rules<textarea value={open.document.victory.mechanics}
              onChange={(event) => updateVictoryText('mechanics', event.target.value)} /></label>
          </div>
          <dl><div><dt>Players</dt><dd>{open.document.players.length}</dd></div>
            <div><dt>Source</dt><dd>{open.document.source?.kind ?? 'new map'}</dd></div>
            <div><dt>Catalog</dt><dd>{open.document.compatibility.catalogHash}</dd></div></dl>
        </details>
        <EditorTerrainCanvas document={open.document} onDocumentChange={updateDocument} />
        <MapDiagnostics diagnostics={diagnostics} />
      </div>
      {pendingExit && <div className="modal-backdrop" role="presentation">
        <section ref={modal} className="editor-confirm" role="dialog" aria-modal="true"
          aria-labelledby="discard-map-title">
          <span className="kicker">Unsaved map changes</span>
          <h2 id="discard-map-title">Discard your changes?</h2>
          <p>Your last local save and every frozen revision will remain untouched.</p>
          <div className="dialog-actions"><button onClick={() => setPendingExit(null)}>Keep editing</button>
            <button className="danger" onClick={confirmExit}>Discard changes</button></div>
        </section>
      </div>}
    </main>
  );

  return (
    <main className="map-editor-shell editor-library" data-surface="map-editor-library">
      <header className="editor-library-header">
        <div><span className="kicker">Offline authoring library</span><h1>Map Editor</h1>
          <p>Create portable maps without starting or changing a campaign.</p></div>
        <button onClick={onReturnToTitle}>Return to title</button>
      </header>
      {error && !pendingImport && <div className="editor-alert" role="alert">{error}
        <button aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
      <div className="editor-library-grid">
        <section className="editor-library-card new-map-card">
          <span className="editor-step">01</span><h2>New blank map</h2>
          <p>Choose a legal ground fill and contiguous player slots. Starting entities can be placed in the workspace.</p>
          <div className="editor-form-grid">
            <label>Map ID<input value={newId} onChange={(event) => setNewId(event.target.value)} /></label>
            <label>Map name<input value={newName} onChange={(event) => setNewName(event.target.value)} /></label>
            <label>Width<input type="number" min="1" max="256" value={width}
              onChange={(event) => setWidth(Number(event.target.value))} /></label>
            <label>Height<input type="number" min="1" max="256" value={height}
              onChange={(event) => setHeight(Number(event.target.value))} /></label>
            <label>Fill terrain<select value={terrain} onChange={(event) => {
              const next = event.target.value as TerrainId;
              setTerrain(next); setSkin(TERRAIN[next].skins[0]);
            }}>{Object.values(TERRAIN).map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.label}</option>
              ))}</select></label>
            <label>Terrain skin<select value={skin} onChange={(event) =>
              setSkin(event.target.value as TerrainSkinId)}>
              {TERRAIN[terrain].skins.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select></label>
            <label>Player slots<select value={playerCount} onChange={(event) =>
              setPlayerCount(Number(event.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
            </select></label>
          </div>
          <p className="editor-defaults">Defaults: {Array.from({ length: playerCount }, (_, index) =>
            `P${index + 1} ${Object.values(FACTIONS)[index % Object.values(FACTIONS).length].name}`)
            .join(' · ')}</p>
          <button className="primary" onClick={createBlank}>Create map <span>→</span></button>
        </section>

        <section className="editor-library-card local-map-card">
          <span className="editor-step">02</span><h2>Edit local map</h2>
          <p>Open the newest editable draft. Frozen playable revisions remain unchanged.</p>
          <div className="editor-local-list">
            {library.length === 0 ? <p>No local maps yet.</p> : library.map((summary) => (
              <article key={summary.id} className={summary.compatibility}>
                <div><b>{summary.name}</b><small>{summary.id} · draft {summary.draftRevision ?? 'unreadable'}
                  {' · '}{summary.diagnostics.length} diagnostics</small></div>
                <div className="editor-library-actions"><button onClick={() => openLocal(summary.id)}
                  disabled={!summary.mapHash}
                  title={!summary.mapHash ? 'This local record is unreadable and was left untouched.' : `Edit ${summary.name}`}>
                  Open
                </button><button onClick={() => duplicateLocal(summary.id)}
                  disabled={!summary.mapHash}
                  data-disabled-reason={!summary.mapHash
                    ? 'This local record is unreadable and was left untouched.' : undefined}
                  title={!summary.mapHash
                    ? 'This local record is unreadable and was left untouched.'
                    : `Duplicate ${summary.name}`}>Duplicate as draft</button>
                <button className="primary" disabled={!summary.latestPlayable || !onPlayMap}
                  data-disabled-reason={!summary.latestPlayable
                    ? 'Freeze a zero-error revision before playing.'
                    : !onPlayMap ? 'Local play is unavailable in this view.' : undefined}
                  title={!summary.latestPlayable ? 'Freeze a zero-error revision before playing.'
                    : !onPlayMap ? 'Local play is unavailable in this view.'
                    : `Play frozen revision ${summary.latestPlayable.revision}`}
                  onClick={() => {
                    if (!summary.latestPlayable) return;
                    onPlayMap?.(encodeLocalMapReference({
                      documentId: summary.id,
                      revision: summary.latestPlayable.revision,
                      mapHash: summary.latestPlayable.mapHash,
                    }), 'library');
                  }}>Play</button></div>
              </article>
            ))}
          </div>
        </section>

        <section className="editor-library-card clone-map-card">
          <span className="editor-step">03</span><h2>Clone built-in map</h2>
          <p>Copy canonical terrain, setup, castles, heroes, objects, guardians, rewards, and objectives.</p>
          <label>Built-in map<select value={builtInId} onChange={(event) => {
            const id = event.target.value as BuiltInMapId;
            const presentation = CAMPAIGN_PRESENTATIONS.find((item) => item.id === id)!;
            setBuiltInId(id); setCloneId(`${id}-remix`); setCloneName(`${presentation.name} Remix`);
          }}>{CAMPAIGN_PRESENTATIONS.map((map) => (
              <option key={map.id} value={map.id}>{map.name} · {map.style}</option>
            ))}</select></label>
          <label>New local ID<input value={cloneId} onChange={(event) => setCloneId(event.target.value)} /></label>
          <label>New name<input value={cloneName} onChange={(event) => setCloneName(event.target.value)} /></label>
          <button className="primary" onClick={cloneBuiltIn}>Clone and edit <span>→</span></button>
        </section>

        <section className="editor-library-card import-map-card">
          <span className="editor-step">04</span><h2>Import map</h2>
          <p>Choose a <code>.vam-map.json</code> file. Invalid files never change the local library.</p>
          <label>Portable map file<input ref={fileInput} className="editor-file-input" type="file"
            accept=".vam-map.json,application/json" onChange={(event) => {
              void chooseFile(event.target.files?.[0]);
            }} /></label>
        </section>
      </div>
      {pendingImport && <div className="modal-backdrop" role="presentation">
        <section ref={modal} className="editor-confirm" role="dialog" aria-modal="true"
          aria-labelledby="import-collision-title">
          <span className="kicker">Local ID collision</span>
          <h2 id="import-collision-title">{pendingImport.documentId} already exists</h2>
          <p>Replace only its editable draft, import a separate copy, or keep the library unchanged.</p>
          {error && <p className="editor-inline-error" role="alert">{error}</p>}
          <label>Copy ID<input value={pendingImport.copyId} onChange={(event) =>
            setPendingImport({ ...pendingImport, copyId: event.target.value })} /></label>
          <label>Copy name<input value={pendingImport.copyName} onChange={(event) =>
            setPendingImport({ ...pendingImport, copyName: event.target.value })} /></label>
          <div className="dialog-actions"><button onClick={() => resolveImport('cancel')}>Cancel</button>
            <button onClick={() => resolveImport('copy')}>Import as copy</button>
            <button className="danger" onClick={() => resolveImport('replace')}>Replace draft</button></div>
        </section>
      </div>}
    </main>
  );
}
