import { ARTIFACTS } from '../../content/artifacts';
import { ITEMS } from '../../content/items';
import { SCROLL_SPELL_IDS, SPELLS } from '../../content/spells';
import type { ArtifactId, ItemId, ResourceId, SpellId, SpellSchool } from '../../core/types';
import type { EditorMapReward, EditorRewardBundle } from '../../core/mapEditor';
import {
  EDITOR_ARTIFACT_CATALOG, EDITOR_ITEM_CATALOG, EDITOR_RESOURCE_IDS,
  EDITOR_SPELL_SCHOOLS, createDefaultEditorArtifactInstance,
  createDefaultEditorItemInstance,
} from '../mapEditorRewards';
import { ArtifactSprite, ItemSprite } from '../assets';

export function EditorRewardInspector({
  reward, onUpdate, onDelete, onPolicyMessage,
}: {
  reward: EditorMapReward;
  onUpdate: (update: { id?: string; bundle?: EditorRewardBundle }) => boolean;
  onDelete: () => void;
  onPolicyMessage: (message: string) => void;
}) {
  const updateBundle = (bundle: EditorRewardBundle) => {
    if (!onUpdate({ bundle })) onPolicyMessage(
      'A reward must retain at least one valid artifact, item, positive resource, or taught spell.',
    );
  };
  const origin = reward.delivery.kind === 'pickup'
    ? reward.delivery.position : { x: 0, y: 0 };
  return <section className="editor-object-inspector editor-reward-inspector"
    aria-labelledby="editor-reward-inspector-title">
    <header><div><span className="kicker">Selected portable reward</span>
      <h3 id="editor-reward-inspector-title">Reward bundle</h3></div>
      <button className="danger" disabled={reward.delivery.kind === 'site'}
        title={reward.delivery.kind === 'site'
          ? 'Delete the carrier to remove its linked reward atomically.' : 'Delete direct reward'}
        onClick={onDelete}>Delete</button></header>
    <div className="editor-object-form">
      <label>Stable ID<input defaultValue={reward.id} key={reward.id}
        onBlur={(event) => {
          if (event.target.value === reward.id) return;
          if (!onUpdate({ id: event.target.value })) {
            event.currentTarget.value = reward.id;
            onPolicyMessage('Reward IDs must be globally unique and begin with a letter.');
          }
        }} /></label>
      <p><b>Delivery:</b> {reward.delivery.kind === 'pickup'
        ? `Direct pickup at ${reward.delivery.position.x},${reward.delivery.position.y}`
        : `Linked site carrier ${reward.delivery.objectId}`}</p>
    </div>
    <fieldset className="editor-reward-array"><legend>Artifacts</legend>
      {reward.bundle.artifacts.map((artifact, index) => <div key={`${index}-${artifact.id}`}>
        <ArtifactSprite artifact={artifact} />
        <select aria-label={`Reward artifact ${index + 1}`} value={artifact.id}
          onChange={(event) => {
            const artifacts = [...reward.bundle.artifacts];
            artifacts[index] = createDefaultEditorArtifactInstance(event.target.value as ArtifactId);
            updateBundle({ ...reward.bundle, artifacts });
          }}>{EDITOR_ARTIFACT_CATALOG.map((entry) => <option key={entry.artifact.id}
            value={entry.artifact.id}>{entry.groupLabel} · {entry.artifact.name}</option>)}</select>
        {artifact.id === 'seamstone' && <select aria-label={`Reward artifact ${index + 1} chosen school`}
          value={artifact.chosenSchool ?? 'rite'} onChange={(event) => {
            const artifacts = reward.bundle.artifacts.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate,
                chosenSchool: event.target.value as SpellSchool } : candidate);
            updateBundle({ ...reward.bundle, artifacts });
          }}>{EDITOR_SPELL_SCHOOLS.map((school) => <option key={school} value={school}>{school}</option>)}</select>}
        <button onClick={() => updateBundle({ ...reward.bundle,
          artifacts: reward.bundle.artifacts.filter((_item, candidate) => candidate !== index) })}>
          Remove
        </button>
      </div>)}
      <button onClick={() => updateBundle({ ...reward.bundle, artifacts: [
        ...reward.bundle.artifacts,
        createDefaultEditorArtifactInstance(EDITOR_ARTIFACT_CATALOG[0].artifact.id),
      ] })}>Add artifact</button>
    </fieldset>
    <fieldset className="editor-reward-array"><legend>Consumables &amp; items</legend>
      {reward.bundle.items.map((item, index) => {
        const definition = ITEMS[item.id];
        return <div key={`${index}-${item.id}`}>
          <ItemSprite item={item} />
          <select aria-label={`Reward item ${index + 1}`} value={item.id}
            onChange={(event) => {
              const items = [...reward.bundle.items];
              items[index] = createDefaultEditorItemInstance(event.target.value as ItemId, origin);
              updateBundle({ ...reward.bundle, items });
            }}>{EDITOR_ITEM_CATALOG.map((entry) => <option key={entry.item.id}
              value={entry.item.id}>{entry.groupLabel} · {entry.item.name}</option>)}</select>
          {definition.behavior === 'scroll' && <label>Upgraded spell<input type="checkbox"
            checked={item.plus ?? false} onChange={(event) => {
              const items = reward.bundle.items.map((candidate, candidateIndex) =>
                candidateIndex === index ? { ...candidate, plus: event.target.checked } : candidate);
              updateBundle({ ...reward.bundle, items });
            }} /></label>}
          {item.id === 'spellScroll' && <select aria-label={`Reward item ${index + 1} stored spell`}
            value={item.storedSpellId ?? SCROLL_SPELL_IDS[0]} onChange={(event) => {
              const items = reward.bundle.items.map((candidate, candidateIndex) =>
                candidateIndex === index ? { ...candidate, storedSpellId: event.target.value } : candidate);
              updateBundle({ ...reward.bundle, items });
            }}>{Object.values(SPELLS).map((spell) => <option key={spell.id} value={spell.id}>
              {spell.name}
            </option>)}</select>}
          {item.id === 'tradeGoods' && <span>Origin {item.origin?.x ?? origin.x},{item.origin?.y ?? origin.y}</span>}
          <button onClick={() => updateBundle({ ...reward.bundle,
            items: reward.bundle.items.filter((_item, candidate) => candidate !== index) })}>
            Remove
          </button>
        </div>;
      })}
      <button onClick={() => updateBundle({ ...reward.bundle, items: [
        ...reward.bundle.items,
        createDefaultEditorItemInstance(EDITOR_ITEM_CATALOG[0].item.id, origin),
      ] })}>Add item</button>
    </fieldset>
    <fieldset className="editor-reward-resources"><legend>Resources</legend>
      {EDITOR_RESOURCE_IDS.map((resource) => <label key={resource}>{resource}
        <input type="number" min="0" step="1" value={reward.bundle.resources[resource] ?? 0}
          onChange={(event) => {
            const amount = Number(event.target.value);
            const resources = { ...reward.bundle.resources };
            if (amount > 0) resources[resource as ResourceId] = amount;
            else delete resources[resource as ResourceId];
            updateBundle({ ...reward.bundle, resources });
          }} /></label>)}
    </fieldset>
    <label>Taught spell<select aria-label="Reward taught spell"
      value={reward.bundle.teachesSpell ?? ''} onChange={(event) => updateBundle({
        ...reward.bundle,
        teachesSpell: event.target.value ? event.target.value as SpellId : null,
      })}>
      <option value="">No taught spell</option>
      {EDITOR_SPELL_SCHOOLS.map((school) => <optgroup key={school} label={school}>
        {Object.values(SPELLS).filter((spell) => spell.school === school).map((spell) =>
          <option key={spell.id} value={spell.id}>{spell.name}</option>)}
      </optgroup>)}
    </select></label>
    <small>Arrays and instance-specific state are portable. Unrelated edits preserve imported scroll, origin, and chosen-school fields.</small>
  </section>;
}
