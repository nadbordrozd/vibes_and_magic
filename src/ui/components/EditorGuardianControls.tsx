import { ITEMS } from '../../content/items';
import { SCROLL_SPELL_IDS, SPELLS } from '../../content/spells';
import { UNITS } from '../../content/units';
import type { ItemId, UnitId, UnitTier } from '../../core/types';
import { defaultEditorGuardianCount, EDITOR_GUARDIAN_TIERS } from '../../core/mapEditor';
import type {
  EditorGuardianStack, EditorMapDocument, EditorMapGuardian,
} from '../../core/mapEditor';
import { createDefaultEditorItemInstance } from '../mapEditorInstances';
import {
  EDITOR_GUARDIAN_GROUPS, editorGuardianProtectChoices, editorGuardianUnitChoices,
  nextEditorGuardianUnit, type EditorGuardianUpdate,
} from '../mapEditorGuardians';

function GuardianCreatureOptions({
  guardian, stackIndex,
}: { guardian: EditorMapGuardian; stackIndex: number }) {
  const allowed = new Set(editorGuardianUnitChoices(guardian, stackIndex));
  const occupiedRandomTiers = new Set(guardian.army.flatMap((stack, index) =>
    index === stackIndex || !('randomTier' in stack) ? [] : [stack.randomTier]));
  return <><optgroup label="Random creature placeholders">
    {EDITOR_GUARDIAN_TIERS.filter((tier) => !occupiedRandomTiers.has(tier)).map((tier) =>
      <option key={`random-${tier}`} value={`random:${tier}`}>Random tier {tier} creature</option>)}
  </optgroup>{EDITOR_GUARDIAN_GROUPS.map((group) => {
    const entries = group.entries.filter((entry) => allowed.has(entry.unit.id));
    return entries.length ? <optgroup key={group.id} label={group.label}>
      {entries.map((entry) => <option key={entry.unit.id} value={`unit:${entry.unit.id}`}>
        T{entry.unit.tier} · {entry.unit.name}
      </option>)}
    </optgroup> : null;
  })}</>;
}

export function EditorGuardianInspector({
  guardian, document, onUpdate, onDelete, onPolicyMessage,
}: {
  guardian: EditorMapGuardian;
  document: EditorMapDocument;
  onUpdate: (update: EditorGuardianUpdate) => boolean;
  onDelete: () => void;
  onPolicyMessage: (message: string) => void;
}) {
  const targets = editorGuardianProtectChoices(document);
  const nextUnit = nextEditorGuardianUnit(guardian);
  const replaceArmyStack = (index: number, stack: EditorGuardianStack) => {
    const army = guardian.army.map((current, candidate) => candidate === index
      ? stack : current);
    if (!onUpdate({ army })) onPolicyMessage(
      'Guardian armies need 1–7 unique creatures or random-tier placeholders with positive whole troop counts.',
    );
  };

  return <section className="editor-object-inspector editor-guardian-inspector"
    aria-labelledby="editor-guardian-inspector-title">
    <header><div><span className="kicker">Selected guardian</span>
      <h3 id="editor-guardian-inspector-title">{
        guardian.army[0] ? 'unitId' in guardian.army[0]
          ? UNITS[guardian.army[0].unitId].name
          : `Random tier ${guardian.army[0].randomTier} creature` : 'Guardian company'
      }</h3></div>
      <button className="danger" onClick={onDelete}>Delete</button></header>
    <div className="editor-object-form">
      <label>Stable ID<input defaultValue={guardian.id} key={guardian.id}
        onBlur={(event) => {
          if (event.target.value === guardian.id) return;
          if (!onUpdate({ id: event.target.value })) {
            event.currentTarget.value = guardian.id;
            onPolicyMessage('IDs must be globally unique and begin with a letter.');
          }
        }} /></label>
      <label>Protects<select aria-label="Guardian protects object" value={guardian.protects ?? ''}
        onChange={(event) => onUpdate({ protects: event.target.value || null })}>
        <option value="">Standalone · no protected object</option>
        {targets.map((target) => <option key={target.id} value={target.id}>
          {target.id} · {target.kind} · {target.label}
        </option>)}
      </select><small>Compatible portable map objects and existing reward records are offered. Standalone guardians use null.</small></label>
      <label>Direct item drop<select aria-label="Guardian direct item drop"
        value={guardian.drop?.id ?? ''} onChange={(event) => onUpdate({
          drop: event.target.value
            ? createDefaultEditorItemInstance(event.target.value as ItemId, guardian.position) : null,
        })}>
        <option value="">No direct item drop</option>
        {Object.values(ITEMS).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select><small>Schema v1 preserves one runtime-supported item instance here. Portable reward bundles remain separate records.</small></label>
      {guardian.drop && ITEMS[guardian.drop.id].behavior === 'scroll' && <label>Drop + face
        <input type="checkbox" checked={guardian.drop.plus ?? false}
          onChange={(event) => onUpdate({ drop: { ...guardian.drop!, plus: event.target.checked } })} />
        <small>The same canonical scroll instance state is used by direct rewards.</small>
      </label>}
      {guardian.drop?.id === 'spellScroll' && <label>Stored spell
        <select aria-label="Guardian drop stored spell"
          value={guardian.drop.storedSpellId ?? SCROLL_SPELL_IDS[0]}
          onChange={(event) => onUpdate({ drop: {
            ...guardian.drop!, storedSpellId: event.target.value,
          } })}>
          {Object.values(SPELLS).map((spell) => <option key={spell.id} value={spell.id}>
            {spell.name}
          </option>)}
        </select>
      </label>}
      {guardian.drop?.id === 'tradeGoods' && <p>Trade Goods origin: {
        guardian.drop.origin?.x ?? guardian.position.x
      },{guardian.drop.origin?.y ?? guardian.position.y}</p>}
    </div>
    <fieldset className="editor-guardian-flags"><legend>Encounter behavior</legend>
      <label><input type="checkbox" checked={guardian.split}
        onChange={(event) => onUpdate({ split: event.target.checked })} /> Split deployment</label>
      <small>Allows this authored company to split across legal battle deployment stacks.</small>
      <label><input type="checkbox" checked={guardian.static}
        onChange={(event) => onUpdate({ static: event.target.checked })} /> Static guardian</label>
      <small>{guardian.static
        ? 'Static guardians keep their authored counts.'
        : 'At week start, runtime growth derives from each authored original count (10%, minimum +1, capped at 5×). No duplicate growth field is authored.'}</small>
    </fieldset>
    <fieldset className="editor-army-editor"><legend>Guardian army</legend>
      <p>Every chosen adventure creature has a directly editable positive whole troop count.</p>
      {guardian.army.map((stack, index) => <div className="editor-army-stack"
        key={`${index}-${'unitId' in stack ? stack.unitId : `random-${stack.randomTier}`}`}>
        <select aria-label={`Guardian army stack ${index + 1} creature`}
          value={'unitId' in stack ? `unit:${stack.unitId}` : `random:${stack.randomTier}`}
          onChange={(event) => {
            const [kind, id] = event.target.value.split(':');
            replaceArmyStack(index, kind === 'random'
              ? { randomTier: Number(id) as UnitTier, count: stack.count }
              : { unitId: id as UnitId, count: stack.count });
          }}>
          <GuardianCreatureOptions guardian={guardian} stackIndex={index} />
        </select>
        <label>Count<input aria-label={`Guardian army stack ${index + 1} count`}
          type="number" min="1" step="1" value={stack.count}
          onChange={(event) => replaceArmyStack(index, {
            ...stack, count: Number(event.target.value),
          })} /></label>
        <button disabled={guardian.army.length <= 1}
          title={guardian.army.length <= 1
            ? 'A guardian must keep at least one stack.' : 'Remove this guardian stack.'}
          onClick={() => onUpdate({ army: guardian.army.filter((_stack, candidate) => candidate !== index) })}>
          Remove
        </button>
      </div>)}
      <button disabled={guardian.army.length >= 7 || !nextUnit}
        title={guardian.army.length >= 7
          ? 'Guardian armies are limited to seven stacks.'
          : !nextUnit ? 'No unused legitimate creature remains.'
            : 'Add another unique guardian creature with a tier-scaled default count.'}
        onClick={() => nextUnit && onUpdate({
          army: [...guardian.army, { unitId: nextUnit, count: defaultEditorGuardianCount(
            UNITS[nextUnit].tier, `${guardian.id}:stack-${guardian.army.length}:${nextUnit}`,
          ) }],
        })}>Add guardian stack</button>
      <output>{guardian.army.length} / 7 stacks</output>
    </fieldset>
  </section>;
}
