import { useState } from 'react';
import { BUILDINGS } from '../../content/buildings';
import { FACTION_UNITS, UNITS } from '../../content/units';
import {
  buildingStatus, maxRecruitable, visitingCastle,
} from '../../core/selectors';
import type {
  Action, BuildingId, Castle, GameState,
} from '../../core/types';
import { ArmySlots } from './ArmySlots';

interface Props {
  state: GameState;
  castle: Castle;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

const BUILDABLE: BuildingId[] = ['dwelling2', 'dwelling3', 'treasury', 'walls'];

function costLabel(cost: typeof BUILDINGS[BuildingId]['cost']): string {
  return Object.entries(cost).map(([resource, amount]) => `${amount} ${resource}`).join(' · ');
}

export function CastleScreen({ state, castle, dispatch, onClose }: Props) {
  const [counts, setCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [heroSlot, setHeroSlot] = useState<number | null>(null);
  const hero = state.players[state.activePlayer].hero;
  const heroIsVisiting = visitingCastle(state)?.id === castle.id;

  const transfer = (garrisonSlot: number) => {
    if (heroSlot === null || !heroIsVisiting) return;
    dispatch({ type: 'SWAP_ARMY', castleId: castle.id, heroSlot, garrisonSlot });
    setHeroSlot(null);
  };

  return (
    <div className="modal-backdrop">
      <section className="castle-screen">
        <header>
          <div>
            <span>{castle.faction} stronghold</span>
            <h2>{castle.faction === 'crimson' ? 'Westwatch' : 'Eastwatch'}</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </header>
        <div className="castle-columns">
          <div>
            <h3>Town works</h3>
            <div className="building-grid">
              <div className="building built"><b>Town Hall</b><small>+500 gold daily</small></div>
              <div className="building built"><b>Tier 1 Dwelling</b><small>Basic troops</small></div>
              {BUILDABLE.map((id) => {
                const status = buildingStatus(state, castle, id);
                return (
                  <button
                    key={id}
                    className={`building ${status.state}`}
                    disabled={status.state !== 'available'}
                    onClick={() => dispatch({ type: 'BUILD', castleId: castle.id, buildingId: id })}
                    title={status.reason}
                  >
                    <b>{BUILDINGS[id].name}</b>
                    <small>{status.state === 'built' ? 'Constructed' : costLabel(BUILDINGS[id].cost)}</small>
                    <em>{status.reason}</em>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h3>Recruitment</h3>
            <div className="recruit-list">
              {([1, 2, 3] as const).map((tier) => {
                const unit = UNITS[FACTION_UNITS[castle.faction][tier - 1]];
                const max = maxRecruitable(state, castle, tier);
                const count = Math.min(counts[tier], max);
                return (
                  <div className={`recruit-row ${max === 0 ? 'locked' : ''}`} key={tier}>
                    <span className="tier">T{tier}</span>
                    <div><b>{unit.name}</b><small>{castle.available[tier - 1]} available · {costLabel(unit.cost)} each</small></div>
                    <div className="stepper">
                      <button onClick={() => setCounts({ ...counts, [tier]: Math.max(0, count - 1) })}>−</button>
                      <b>{count}</b>
                      <button onClick={() => setCounts({ ...counts, [tier]: Math.min(max, count + 1) })}>+</button>
                      <button onClick={() => setCounts({ ...counts, [tier]: max })}>Max</button>
                    </div>
                    <button
                      className="hire"
                      disabled={count === 0}
                      onClick={() => {
                        dispatch({ type: 'RECRUIT', castleId: castle.id, tier, count });
                        setCounts({ ...counts, [tier]: 0 });
                      }}
                    >Hire</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="transfer-area">
          {hero && heroIsVisiting ? (
            <>
              <ArmySlots army={hero.army} title="Visiting hero · select a stack" selected={heroSlot} onSelect={setHeroSlot} />
              <div className="transfer-arrow">⇄</div>
              <ArmySlots army={castle.garrison} title="Garrison · select destination" onSelect={transfer} />
            </>
          ) : (
            <>
              <div className="remote-castle-note">
                <b>Remote command</b>
                <span>Build and recruit here. Move your hero into the castle to transfer troops.</span>
              </div>
              <div className="transfer-arrow">→</div>
              <ArmySlots army={castle.garrison} title="Castle garrison" />
            </>
          )}
        </div>
        <footer>One building may be constructed in each castle per day.</footer>
      </section>
    </div>
  );
}
