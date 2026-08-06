import { ARTIFACTS } from '../../content/artifacts';
import { CASTLE_NAMES } from '../../content/factionPresentation';
import { itemName } from '../../content/items';
import { OMENS, omenEffectSummary } from '../../content/omens';
import { SPELLS } from '../../content/spells';
import { SPELL_SCHOOL_NAMES } from '../../content/spellPresentation';
import { UNITS } from '../../content/units';
import { adventureSpellMoveCost, fickleWeatherOffers } from '../../core/game/adventureSpells';
import { sameCoord } from '../../core/map/pathfinding';
import type { GameState, SpellSchool } from '../../core/types';
import {
  adventureDraftIncompleteReason, type AdventureCastAction, beastGuardianGold,
} from '../adventureSpellTargeting';

interface Props {
  state: GameState;
  action: AdventureCastAction;
  onChange: (action: AdventureCastAction) => void;
  onConfirm: () => void;
  onBack: () => void;
  onCancel: () => void;
}

const BANDS = ['few', 'band', 'many', 'great host'];
const SCHOOLS: SpellSchool[] = ['rite', 'craft', 'grave', 'wild'];

function guardianLabel(state: GameState, id: string): string {
  const object = state.map.objects.find((candidate) => candidate.id === id);
  if (!object || object.kind !== 'guardian') return 'Unknown guardian';
  return object.army.map((stack) => `${stack.count} ${UNITS[stack.unitId].name}`).join(', ');
}

function castleLabel(state: GameState, id: string): string {
  const castle = state.castles.find((candidate) => candidate.id === id)!;
  return `${CASTLE_NAMES[castle.faction]} at ${castle.position.x}, ${castle.position.y}`;
}

function sourceValue(action: AdventureCastAction): string {
  return action.courierKind && action.sourceSlot !== undefined
    ? `${action.courierKind}:${action.sourceSlot}` : '';
}

function destinationValue(action: AdventureCastAction): string {
  if (action.destinationSlot === undefined) return '';
  if (action.targetHeroId) return `hero:${action.targetHeroId}:${action.destinationSlot}`;
  if (action.castleId) return `castle:${action.castleId}:${action.destinationSlot}`;
  return '';
}

function exactConsequence(state: GameState, action: AdventureCastAction): string {
  const hero = state.players[state.activePlayer].hero!;
  const plus = hero.upgradedSpells.includes(action.spellId);
  const spell = SPELLS[action.spellId];
  if (action.spellId === 'saltTheVein') return action.targetId
    ? `Suppress the selected mine through day ${state.day + (plus ? 8 : 5) - 1}.` : spell[plus ? 'plus' : 'base'];
  if (action.spellId === 'wildGrowth') return action.castleId
    ? `${castleLabel(state, action.castleId)} gains ${plus ? '75%' : '50%'} growth this week.` : spell[plus ? 'plus' : 'base'];
  if (action.spellId === 'beastTongue' && action.targetId) {
    const value = beastGuardianGold(state, action.targetId) ?? 0;
    return `${action.recruit ? 'Recruit' : 'Disperse'} ${guardianLabel(state, action.targetId)} for ${
      value * (plus && action.recruit ? 3 : 2)} gold.`;
  }
  if (action.spellId === 'beacon' && action.castleId) return `Travel to ${castleLabel(state, action.castleId)}.`;
  if (action.spellId === 'waysideShrine' && action.school) {
    return `The next battle here resonates with ${SPELL_SCHOOL_NAMES[action.school]} magic.`;
  }
  if (action.spellId === 'falseColors' && action.displayedBand) {
    return `Enemies see this hero as a neutral “${action.displayedBand}” guardian band until adjacent.`;
  }
  if (action.spellId === 'clockworkCourier' && action.courierKind
      && action.sourceSlot !== undefined && action.destinationSlot !== undefined) {
    const source = action.courierKind === 'item' ? itemName(hero.inventory[action.sourceSlot])
      : hero.army[action.sourceSlot]
        ? `${hero.army[action.sourceSlot]!.count} ${UNITS[hero.army[action.sourceSlot]!.unitId].name}` : 'empty slot';
    const destination = action.targetHeroId
      ? `${state.players[hero.owner].heroes.find((candidate) => candidate.id === action.targetHeroId)?.name} ${action.courierKind} slot ${action.destinationSlot + 1}`
      : action.castleId ? `${castleLabel(state, action.castleId)} garrison slot ${action.destinationSlot + 1}` : 'unselected destination';
    return `Swap ${source} from ${hero.name} with ${destination}.`;
  }
  if (action.spellId === 'fickleWeather' && action.omen) {
    return `Replace ${OMENS[state.omen].title} with ${OMENS[action.omen].title}: ${
      omenEffectSummary(OMENS[action.omen]).join(' ')}`;
  }
  if (action.spellId === 'gate' && action.target && action.secondaryTarget) {
    return `Open a passage between ${action.target.x}, ${action.target.y} and ${
      action.secondaryTarget.x}, ${action.secondaryTarget.y} ${plus ? 'through this week' : 'through tomorrow'}.`;
  }
  if ((action.spellId === 'coldRoad' || action.spellId === 'greenway') && action.target) {
    return `Travel to ${action.target.x}, ${action.target.y}${action.targetHeroId
      ? ` with ${state.players[state.activePlayer].heroes.find((candidate) => candidate.id === action.targetHeroId)?.name}` : ''}.`;
  }
  if (action.spellId === 'rootAndRuin') return `Create ${action.positions?.length ?? 0} impassable thicket tiles for ${plus ? 5 : 3} days.`;
  if (action.spellId === 'murmuration') return `Scout ${Math.max(0, (action.positions?.length ?? 1) - 1)} chosen path steps${plus ? ' and adjacent tiles' : ''}.`;
  if (action.spellId === 'graveSpeech' && action.learnSpellId) {
    return `Replay the battle record and learn ${SPELLS[action.learnSpellId].name}.`;
  }
  return spell[plus ? 'plus' : 'base'];
}

export function AdventureSpellTargetDialog({
  state, action, onChange, onConfirm, onBack, onCancel,
}: Props) {
  const hero = state.players[state.activePlayer].hero!;
  const player = state.players[hero.owner];
  const spell = SPELLS[action.spellId];
  const plus = hero.upgradedSpells.includes(action.spellId);
  const reason = adventureDraftIncompleteReason(state, action);
  const ownedCastles = state.castles.filter((castle) => castle.owner === hero.owner);
  const otherHeroes = player.heroes.filter((candidate) => candidate.alive && candidate.id !== hero.id);
  const beastGuardians = state.map.objects.filter((object) => object.kind === 'guardian'
    && object.army.every((stack) => UNITS[stack.unitId].abilities.includes('beast')));
  const battleRecord = [...state.battleRecords].reverse().find((record) =>
    sameCoord(record.position, hero.position));
  const choose = (patch: Partial<AdventureCastAction>) => onChange({ ...action, ...patch });
  const courierSources = [
    ...hero.inventory.flatMap((item, slot) => item ? [{ value: `item:${slot}`, label: `Item ${slot + 1}: ${itemName(item)}` }] : []),
    ...hero.army.flatMap((stack, slot) => stack ? [{ value: `army:${slot}`, label: `Army ${slot + 1}: ${stack.count} ${UNITS[stack.unitId].name}` }] : []),
  ];
  const destinationOptions = action.courierKind ? [
    ...otherHeroes.flatMap((target) => (action.courierKind === 'item' ? target.inventory : target.army)
      .map((slot, index) => ({
        value: `hero:${target.id}:${index}`,
        label: `${target.name} · ${action.courierKind === 'item' ? 'item' : 'army'} slot ${index + 1} · ${
          !slot ? 'empty' : action.courierKind === 'item' ? itemName(slot as never)
            : `${(slot as { count: number }).count} ${UNITS[(slot as { unitId: keyof typeof UNITS }).unitId].name}`}`,
      }))),
    ...(plus && action.courierKind === 'army' ? ownedCastles.flatMap((castle) =>
      castle.garrison.map((stack, index) => ({
        value: `castle:${castle.id}:${index}`,
        label: `${castleLabel(state, castle.id)} · garrison ${index + 1} · ${stack
          ? `${stack.count} ${UNITS[stack.unitId].name}` : 'empty'}`,
      }))) : []),
  ] : [];

  return <div className="modal-backdrop spell-target-backdrop" onClick={onCancel}>
    <section className="choice-dialog adventure-spell-target" role="dialog" aria-modal="true"
      aria-labelledby="adventure-spell-target-heading" onClick={(event) => event.stopPropagation()}>
      <span className="dialog-kicker">Adventure spell · stage 2 of 2</span>
      <h2 id="adventure-spell-target-heading">{spell.name}{plus ? '+' : ''}</h2>
      <p className="spell-target-cost"><b>{spell.mana} mana</b> · <b>{adventureSpellMoveCost(hero)} movement</b></p>
      <p>{plus ? spell.plus : spell.base}</p>

      {action.spellId === 'beacon' && plus && <label>Friendly castle
        <select value={action.castleId ?? ''} onChange={(event) => choose({ castleId: event.target.value || undefined })}>
          <option value="">Choose a destination…</option>
          {ownedCastles.map((castle) => <option key={castle.id} value={castle.id}>{castleLabel(state, castle.id)}</option>)}
        </select>
      </label>}
      {action.spellId === 'waysideShrine' && plus && <fieldset><legend>Resonance school</legend>
        {SCHOOLS.map((school) => <button key={school} className={action.school === school ? 'selected' : ''}
          onClick={() => choose({ school })}>{SPELL_SCHOOL_NAMES[school]}</button>)}
      </fieldset>}
      {action.spellId === 'saltTheVein' && <fieldset><legend>Visible enemy mine</legend>
        {state.map.objects.filter((object) => object.kind === 'mine' && object.owner
          && object.owner !== hero.owner && player.explored.includes(`${object.position.x},${object.position.y}`))
          .map((mine) => mine.kind === 'mine' && <button key={mine.id}
            className={action.targetId === mine.id ? 'selected' : ''} onClick={() => choose({ targetId: mine.id })}>
            {mine.resource[0].toUpperCase() + mine.resource.slice(1)} mine · {mine.income}/day · owner {state.players[mine.owner!].name} · {mine.position.x}, {mine.position.y}
          </button>)}
      </fieldset>}
      {action.spellId === 'falseColors' && plus && <fieldset><legend>Displayed guardian band</legend>
        {BANDS.map((band) => <button key={band} className={action.displayedBand === band ? 'selected' : ''}
          onClick={() => choose({ displayedBand: band })}>{band[0].toUpperCase() + band.slice(1)}</button>)}
      </fieldset>}
      {action.spellId === 'clockworkCourier' && <div className="spell-target-form">
        <label>1. Send from {hero.name}
          <select value={sourceValue(action)} onChange={(event) => {
            const [courierKind, slot] = event.target.value.split(':');
            choose({ courierKind: courierKind as 'item' | 'army' || undefined,
              sourceSlot: slot === undefined ? undefined : Number(slot), targetHeroId: undefined,
              castleId: undefined, destinationSlot: undefined });
          }}><option value="">Choose an item or company…</option>{courierSources.map((source) =>
            <option key={source.value} value={source.value}>{source.label}</option>)}</select>
        </label>
        <label>2. Exact destination
          <select disabled={!action.courierKind} value={destinationValue(action)} onChange={(event) => {
            const [kind, id, slot] = event.target.value.split(':');
            choose({ targetHeroId: kind === 'hero' ? id : undefined,
              castleId: kind === 'castle' ? id : undefined,
              destinationSlot: slot === undefined ? undefined : Number(slot) });
          }}><option value="">Choose a destination slot…</option>{destinationOptions.map((destination) =>
            <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select>
        </label>
      </div>}
      {action.spellId === 'coldRoad' && plus && <fieldset><legend>Who travels?</legend>
        <button className={!action.targetHeroId ? 'selected' : ''}
          onClick={() => choose({ targetHeroId: undefined })}>Travel alone</button>
        {otherHeroes.filter((candidate) => Math.max(
          Math.abs(candidate.position.x - hero.position.x), Math.abs(candidate.position.y - hero.position.y),
        ) <= 1).map((candidate) => <button key={candidate.id}
          className={action.targetHeroId === candidate.id ? 'selected' : ''}
          onClick={() => choose({ targetHeroId: candidate.id })}>Carry {candidate.name} · adjacent at {candidate.position.x}, {candidate.position.y}</button>)}
      </fieldset>}
      {action.spellId === 'graveSpeech' && plus && battleRecord?.spells.length ? <fieldset><legend>Remembered spell</legend>
        <button className={action.skipLearnSpell ? 'selected' : ''}
          onClick={() => choose({ skipLearnSpell: true, learnSpellId: undefined })}>Replay only · learn nothing</button>
        {battleRecord.spells.map((spellId) => <button key={spellId}
          disabled={hero.knownSpells.includes(spellId)} title={hero.knownSpells.includes(spellId) ? 'Already known.' : `Learn ${SPELLS[spellId].name}.`}
          className={action.learnSpellId === spellId ? 'selected' : ''}
          onClick={() => choose({ learnSpellId: spellId, skipLearnSpell: false })}>{SPELLS[spellId].name}{hero.knownSpells.includes(spellId) ? ' · already known' : ''}</button>)}
      </fieldset> : null}
      {action.spellId === 'beastTongue' && <><fieldset><legend>Beast guardian</legend>
        {beastGuardians.map((guardian) => <button key={guardian.id}
          className={action.targetId === guardian.id ? 'selected' : ''}
          onClick={() => choose({ targetId: guardian.id, recruit: plus ? undefined : false })}>
          {guardianLabel(state, guardian.id)} · value {beastGuardianGold(state, guardian.id)} gold · {guardian.position.x}, {guardian.position.y}
        </button>)}
      </fieldset>{plus && action.targetId && <fieldset><legend>Parley outcome</legend>
        <button className={action.recruit === false ? 'selected' : ''} onClick={() => choose({ recruit: false })}>Disperse · pay 2× value</button>
        <button className={action.recruit === true ? 'selected' : ''} onClick={() => choose({ recruit: true })}>Recruit · pay 3× value · needs army space</button>
      </fieldset>}</>}
      {action.spellId === 'wildGrowth' && <fieldset><legend>Owned castle</legend>
        {ownedCastles.map((castle) => <button key={castle.id} className={action.castleId === castle.id ? 'selected' : ''}
          onClick={() => choose({ castleId: castle.id })}>{castleLabel(state, castle.id)} · current growth effects {castle.growthEffects.length}</button>)}
      </fieldset>}
      {action.spellId === 'fickleWeather' && <fieldset><legend>Dealt omen</legend>
        {fickleWeatherOffers(state, plus).map((omen) => <button key={omen}
          data-inspect-kind="omen" data-inspect-id={omen} className={action.omen === omen ? 'selected' : ''}
          onClick={() => choose({ omen })}><b>{OMENS[omen].title}</b><small>{omenEffectSummary(OMENS[omen]).join(' ')}</small></button>)}
      </fieldset>}

      <section className="spell-consequence"><b>On confirmation</b><span>{exactConsequence(state, action)}</span></section>
      {reason && <p className="spell-target-reason">Cannot confirm · {reason}</p>}
      <div className="dialog-actions">
        <button autoFocus onClick={onCancel}>Cancel · spend nothing</button>
        <button onClick={onBack}>Back to spellbook</button>
        <button className="primary" disabled={Boolean(reason)} title={reason ?? `Confirm ${spell.name}.`}
          onClick={onConfirm}>Confirm {spell.name} · {spell.mana} mana</button>
      </div>
    </section>
  </div>;
}
