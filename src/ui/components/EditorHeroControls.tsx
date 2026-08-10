import { FACTIONS } from '../../content/factions';
import { HEROES } from '../../content/heroes';
import { UNITS } from '../../content/units';
import type { FactionId, HeroDefinitionId, PlayerId, UnitId } from '../../core/types';
import type { EditorMapDocument, EditorMapHero } from '../../core/mapEditor';
import { EDITOR_PLAYER_FLAGS } from '../mapEditorCastles';
import {
  editorHeroDefinitions, editorHeroUnitChoices, nextEditorHeroUnit,
  type EditorHeroUpdate,
} from '../mapEditorHeroes';

export function EditorHeroInspector({
  hero, document, onUpdate, onDelete, onPolicyMessage,
}: {
  hero: EditorMapHero;
  document: EditorMapDocument;
  onUpdate: (update: EditorHeroUpdate) => boolean;
  onDelete: () => void;
  onPolicyMessage: (message: string) => void;
}) {
  const updateArmy = (army: EditorMapHero['army']) => onUpdate({ army });
  return <section className="editor-object-inspector editor-hero-inspector"
    aria-labelledby="editor-hero-inspector-title">
    <header><div><span className="kicker">Selected hero</span>
      <h3 id="editor-hero-inspector-title">{HEROES[hero.definitionId]?.name ?? hero.id}</h3></div>
      <button className="danger" onClick={onDelete}>Delete</button></header>
    <div className="editor-object-form editor-hero-basics">
      <label>Stable ID<input defaultValue={hero.id} key={hero.id} onBlur={(event) => {
        if (event.target.value === hero.id) return;
        if (!onUpdate({ id: event.target.value })) event.currentTarget.value = hero.id;
      }} /></label>
      <label>Owner flag<select value={hero.owner} onChange={(event) =>
        onUpdate({ owner: event.target.value as PlayerId })}>
        {document.players.map((player) => <option key={player.id} value={player.id}>
          {player.id.toUpperCase()} · {EDITOR_PLAYER_FLAGS[player.id].label}
          {player.name ? ` · ${player.name}` : ''}
        </option>)}
      </select><small>Changes only ownership and flag color.</small></label>
      <label>Hero faction<select value={hero.faction} onChange={(event) => {
        const faction = event.target.value as FactionId;
        if (onUpdate({ faction })) onPolicyMessage(
          'Faction changed. A compatible named hero was selected; the owner and authored army were preserved.',
        );
      }}>
        {Object.values(FACTIONS).map((faction) =>
          <option key={faction.id} value={faction.id}>{faction.name}</option>)}
      </select><small>Controls identity roster, never owner color.</small></label>
      <label>Named hero<select value={hero.definitionId} onChange={(event) =>
        onUpdate({ definitionId: event.target.value as HeroDefinitionId })}>
        {editorHeroDefinitions(hero.faction).map((definition) =>
          <option key={definition.id} value={definition.id}>{definition.name}</option>)}
      </select><small>Only definitions from the selected faction are offered.</small></label>
    </div>
    <fieldset className="editor-hero-army">
      <legend>Starting army <em>{hero.army.length} / 7 stacks</em></legend>
      <p>Every stack is explicit portable setup data with a positive whole count. Duplicate creature choices are combined by the editor.</p>
      <div>{hero.army.map((stack, index) => <div key={`${stack.unitId}-${index}`}>
        <select aria-label={`Hero army stack ${index + 1} creature`} value={stack.unitId}
          onChange={(event) => {
            const army = structuredClone(hero.army);
            army[index].unitId = event.target.value as UnitId;
            updateArmy(army);
          }}>
          {editorHeroUnitChoices(hero, index).map((unitId) =>
            <option key={unitId} value={unitId}>{UNITS[unitId].name}</option>)}
        </select>
        <input aria-label={`Hero army stack ${index + 1} count`} type="number" min="1"
          step="1" value={stack.count} onChange={(event) => {
            const count = Number(event.target.value);
            if (!Number.isInteger(count) || count <= 0) return;
            const army = structuredClone(hero.army); army[index].count = count; updateArmy(army);
          }} />
        <button aria-label={`Remove hero army stack ${index + 1}`}
          disabled={hero.army.length <= 1}
          title={hero.army.length <= 1
            ? 'A starting hero must keep at least one positive stack.' : 'Remove this stack.'}
          onClick={() => updateArmy(hero.army.filter((_, candidate) => candidate !== index))}>−</button>
      </div>)}</div>
      <button disabled={hero.army.length >= 7 || !nextEditorHeroUnit(hero)}
        title={hero.army.length >= 7
          ? 'A hero supports at most seven stacks.'
          : !nextEditorHeroUnit(hero) ? 'No unused canonical creature remains.'
            : 'Add a different canonical creature with count 1.'}
        onClick={() => { const unitId = nextEditorHeroUnit(hero); if (unitId) updateArmy([
          ...hero.army, { unitId, count: 1 },
        ]); }}>+ Add army stack</button>
    </fieldset>
    <p className="editor-footprint-summary">Canonical 1×1 footprint · native south-facing sprite.</p>
    <small className="editor-preserved-fields">Imported level, XP, stats, skills, and spell overrides remain preserved when these focused fields are edited.</small>
  </section>;
}
