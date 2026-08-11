import { BUILDINGS, buildingBelongsToFaction } from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import { SPELLS } from '../../content/spells';
import { FACTION_UNITS, UNITS } from '../../content/units';
import type { BuildingId, FactionId, PlayerId, Resources, SpellId, UnitId } from '../../core/types';
import type { EditorMapCastle, EditorMapDocument } from '../../core/mapEditor';
import {
  EDITOR_PLAYER_FLAGS, addEditorPlayerSlot, editorCastleVariants,
  boundedEditorGuildDeck, editorGarrisonUnitChoices, inheritedEditorCastleState,
  nextEditorGarrisonUnit, reconcileCastleBuildingOverrides, removeEditorPlayerSlot,
  updateEditorPlayerSlot,
  type EditorCastleUpdate,
} from '../mapEditorCastles';
import type { PlayerEdit } from '../mapEditorTerrain';

const factionEntries = Object.values(FACTIONS);
const resourceIds = ['gold', 'timber', 'iron', 'essence'] as const;

export function EditorPlayerSlots({
  document, onEdit, onMessage,
}: {
  document: EditorMapDocument;
  onEdit: (edit: PlayerEdit) => void;
  onMessage: (message: string) => void;
}) {
  const remove = (id: PlayerId) => {
    const result = removeEditorPlayerSlot(document, id);
    if (result.ok) {
      onEdit(result.edit);
      onMessage(`${id.toUpperCase()} removed. Remaining slot IDs stay contiguous.`);
    } else if (result.reason === 'referenced') onMessage(
      `Cannot remove ${id.toUpperCase()}: reassign ${result.references!.join(', ')} first.`,
    );
    else if (result.reason === 'not-last') onMessage(
      `Remove later slots first; only ${document.players.at(-1)?.id.toUpperCase()} can be removed.`,
    );
    else onMessage('All six player slots are already present.');
  };
  return <div className="editor-player-slots" aria-label="Player color slots">
    {document.players.map((player, index) => <article key={player.id}>
      <header><span className="editor-player-flag" style={{ '--flag-color': EDITOR_PLAYER_FLAGS[player.id].color } as React.CSSProperties}
        aria-label={`${EDITOR_PLAYER_FLAGS[player.id].label} flag`} />
        <b>{player.id.toUpperCase()} · {EDITOR_PLAYER_FLAGS[player.id].label}</b>
        <button aria-label={`Remove ${player.id}`} disabled={index !== document.players.length - 1}
          title={index === document.players.length - 1
            ? `Remove trailing slot ${player.id.toUpperCase()}` : 'Remove later color slots first.'}
          onClick={() => remove(player.id)}>−</button></header>
      <label>Controller<select value={player.controller} onChange={(event) =>
        { const result = updateEditorPlayerSlot(document, player.id,
          { controller: event.target.value as typeof player.controller });
          if (result.ok) onEdit(result.edit); }}>
        <option value="human">Human</option><option value="ai">AI</option>
        <option value="dormant">Dormant</option>
      </select></label>
      <label>Default faction<select value={player.faction} onChange={(event) =>
        { const result = updateEditorPlayerSlot(document, player.id,
          { faction: event.target.value as FactionId }); if (result.ok) onEdit(result.edit); }}>
        {factionEntries.map((faction) => <option key={faction.id} value={faction.id}>{faction.name}</option>)}
      </select></label>
      <label>Optional name<input value={player.name ?? ''} placeholder={`Player ${index + 1}`}
        onChange={(event) => { const result = updateEditorPlayerSlot(document, player.id,
          { name: event.target.value }); if (result.ok) onEdit(result.edit); }} /></label>
    </article>)}
    <button className="editor-add-player" disabled={document.players.length >= 6}
      title={document.players.length >= 6 ? 'Maps support at most six player slots.' : 'Add the next contiguous color slot.'}
      onClick={() => {
      const result = addEditorPlayerSlot(document);
      if (result.ok) { onEdit(result.edit); onMessage(`${result.player!.id.toUpperCase()} added.`); }
      else onMessage('All six player slots are already present.');
    }}>+ Add next color slot</button>
    <small>Flag color comes from the slot ID. Changing a slot faction never recolors or refactions a city.</small>
  </div>;
}

function InheritedField({
  label, inherited, explicit, onOverride, onReset, children,
}: {
  label: string; inherited: string; explicit: boolean; onOverride: () => void;
  onReset: () => void; children: React.ReactNode;
}) {
  return <fieldset className="editor-castle-override" data-state={explicit ? 'explicit' : 'inherited'}>
    <legend>{label} <em>{explicit ? 'Explicit override' : 'Inherited from core'}</em></legend>
    {explicit ? <>{children}<button onClick={onReset}>Reset to inherited</button></>
      : <><span>{inherited}</span><button onClick={onOverride}>Set explicit override</button></>}
  </fieldset>;
}

export function EditorCastleInspector({
  castle, document, onUpdate, onDelete,
}: {
  castle: EditorMapCastle; document: EditorMapDocument;
  onUpdate: (update: EditorCastleUpdate) => void; onDelete: () => void;
}) {
  const inherited = inheritedEditorCastleState(castle);
  const legalBuildings = Object.values(BUILDINGS).filter((building) =>
    buildingBelongsToFaction(building.id, castle.faction));
  const selectValues = (options: HTMLOptionsCollection) => Array.from(options)
    .filter((option) => option.selected).map((option) => option.value);
  const ownerLabel = castle.owner === 'neutral' ? 'Neutral' : `${castle.owner.toUpperCase()} · ${EDITOR_PLAYER_FLAGS[castle.owner].label}`;
  return <section className="editor-object-inspector editor-castle-inspector"
    aria-labelledby="editor-castle-inspector-title">
    <header><div><span className="kicker">Selected city</span>
      <h3 id="editor-castle-inspector-title">{castle.id}</h3></div>
      <button className="danger" onClick={onDelete}>Delete</button></header>
    <div className="editor-object-form editor-castle-basics">
      <label>Stable ID<input value={castle.id} onChange={(event) => onUpdate({ id: event.target.value })} /></label>
      <label>Owner flag<select value={castle.owner} onChange={(event) =>
        onUpdate({ owner: event.target.value as PlayerId | 'neutral' })}>
        <option value="neutral">Neutral / no flag</option>
        {document.players.map((player) => <option key={player.id} value={player.id}>
          {player.id.toUpperCase()} · {EDITOR_PLAYER_FLAGS[player.id].label}{player.name ? ` · ${player.name}` : ''}
        </option>)}
      </select><small>{ownerLabel}; independent of city faction.</small></label>
      <label>City faction<select value={castle.faction} onChange={(event) =>
        onUpdate({ faction: event.target.value as FactionId })}>
        {factionEntries.map((faction) => <option key={faction.id} value={faction.id}>{faction.name}</option>)}
      </select><small>Controls native architecture and roster, not owner color.</small></label>
      <label>Native variant<select value={castle.variant ?? ''} onChange={(event) =>
        onUpdate({ variant: (event.target.value || undefined) as EditorMapCastle['variant'] })}>
        <option value="">Faction city · inherited</option>
        {editorCastleVariants(castle.faction).map((variant) =>
          <option key={variant} value={variant}>{variant}</option>)}
      </select></label>
    </div>
    <p className="editor-footprint-summary">Canonical 5×2 top-left footprint · entrance +2,+1 bottom-center.</p>
    <div className="editor-castle-overrides">
      <InheritedField label="Buildings" inherited={inherited.buildings.join(', ')}
        explicit={castle.buildings !== undefined}
        onOverride={() => onUpdate({ buildings: [...inherited.buildings] })}
        onReset={() => onUpdate({ buildings: undefined })}>
        <select multiple aria-label="Explicit city buildings" value={castle.buildings ?? []}
          onChange={(event) => onUpdate(reconcileCastleBuildingOverrides(
            'buildings', selectValues(event.target.options) as BuildingId[], castle,
          ))}>
          {legalBuildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
        </select>
      </InheritedField>
      <InheritedField label="Banned buildings" inherited="No bans"
        explicit={castle.bannedBuildings !== undefined}
        onOverride={() => onUpdate({ bannedBuildings: [] })}
        onReset={() => onUpdate({ bannedBuildings: undefined })}>
        <select multiple aria-label="Explicit banned buildings" value={castle.bannedBuildings ?? []}
          onChange={(event) => onUpdate(reconcileCastleBuildingOverrides(
            'bannedBuildings', selectValues(event.target.options) as BuildingId[], castle,
          ))}>
          {legalBuildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
        </select>
      </InheritedField>
      <InheritedField label="Available recruits" inherited={inherited.available.join(' / ')}
        explicit={castle.available !== undefined}
        onOverride={() => onUpdate({ available: [...inherited.available] })}
        onReset={() => onUpdate({ available: undefined })}>
        <div className="editor-tier-counts">{FACTION_UNITS[castle.faction].map((unitId, index) =>
          <label key={unitId}>T{index + 1} · {UNITS[unitId].name}<input type="number" min="0"
            value={castle.available?.[index] ?? 0} onChange={(event) => {
              const available = [...(castle.available ?? inherited.available)];
              available[index] = Number(event.target.value); onUpdate({ available });
            }} /></label>)}</div>
      </InheritedField>
      <InheritedField label="Garrison" inherited={castle.owner === 'neutral'
        ? inherited.garrison.flatMap((stack) => stack
          ? [`${stack.count} ${UNITS[stack.unitId].name}`] : []).join(' · ')
        : 'Empty canonical garrison'}
        explicit={castle.garrison !== undefined} onOverride={() => onUpdate({ garrison: [] })}
        onReset={() => onUpdate({ garrison: undefined })}>
        <div className="editor-garrison-editor">{(castle.garrison ?? []).map((stack, index) =>
          <div key={`${stack.unitId}-${index}`}><select aria-label={`Garrison stack ${index + 1} creature`}
            value={stack.unitId} onChange={(event) => {
              const garrison = structuredClone(castle.garrison ?? []);
              garrison[index].unitId = event.target.value as UnitId; onUpdate({ garrison });
            }}>{editorGarrisonUnitChoices(castle, index)
              .map((unitId) => <option key={unitId} value={unitId}>{UNITS[unitId].name}</option>)}</select>
            <input aria-label={`Garrison stack ${index + 1} count`} type="number" min="1" value={stack.count}
              onChange={(event) => { const garrison = structuredClone(castle.garrison ?? []);
                garrison[index].count = Number(event.target.value); onUpdate({ garrison }); }} />
            <button aria-label={`Remove garrison stack ${index + 1}`} onClick={() =>
              onUpdate({ garrison: (castle.garrison ?? []).filter((_, candidate) => candidate !== index) })}>−</button></div>)}
          <button disabled={(castle.garrison?.length ?? 0) >= 7 || !nextEditorGarrisonUnit(castle)}
            title={(castle.garrison?.length ?? 0) >= 7
              ? 'A garrison supports at most seven stacks.'
              : !nextEditorGarrisonUnit(castle) ? 'No unused recruitable creature remains.'
                : 'Add a different creature to the garrison.'}
            onClick={() => { const unitId = nextEditorGarrisonUnit(castle); if (unitId) onUpdate({
              garrison: [...(castle.garrison ?? []), { unitId, count: 1 }],
            }); }}>+ Add garrison stack</button></div>
      </InheritedField>
      <InheritedField label="Guild deck" inherited={`${inherited.guildDeck.length} spells derived from faction + seed`}
        explicit={castle.guildDeck !== undefined}
        onOverride={() => onUpdate({ guildDeck: [...inherited.guildDeck] })}
        onReset={() => onUpdate({ guildDeck: undefined })}>
        <select multiple aria-label="Explicit guild deck" value={castle.guildDeck ?? []}
          onChange={(event) => onUpdate({ guildDeck: boundedEditorGuildDeck(
            selectValues(event.target.options) as SpellId[],
          ) })}>
          {Object.values(SPELLS).map((spell) => <option key={spell.id} value={spell.id}>{spell.name}</option>)}
        </select>
        <small>Choose up to 8 spells. Imported scenario decks may remain longer until edited.</small>
      </InheritedField>
      <InheritedField label="Founder's vault" inherited="No explicit vault"
        explicit={castle.vault !== undefined}
        onOverride={() => onUpdate({ vault: { gold: 0, timber: 0, iron: 0, essence: 0 } })}
        onReset={() => onUpdate({ vault: undefined })}>
        <div className="editor-tier-counts">{resourceIds.map((resource) => <label key={resource}>{resource}
          <input type="number" min="0" value={castle.vault?.[resource] ?? 0}
            onChange={(event) => onUpdate({ vault: {
              ...(castle.vault ?? { gold: 0, timber: 0, iron: 0, essence: 0 }),
              [resource]: Number(event.target.value),
            } as Resources })} /></label>)}</div>
      </InheritedField>
      <fieldset className="editor-castle-override" data-state={castle.flavor === undefined ? 'inherited' : 'explicit'}>
        <legend>Flavor <em>{castle.flavor === undefined ? 'Inherited / none' : 'Explicit override'}</em></legend>
        <textarea value={castle.flavor ?? ''} placeholder="Optional initial city flavor"
          onChange={(event) => onUpdate({ flavor: event.target.value || undefined })} />
        {castle.flavor !== undefined && <button onClick={() => onUpdate({ flavor: undefined })}>Reset to inherited</button>}
      </fieldset>
    </div>
  </section>;
}
