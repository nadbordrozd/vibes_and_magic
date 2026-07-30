import { useState } from 'react';
import { BUILDINGS } from '../../content/buildings';
import { FACTION_UNITS, UNITS } from '../../content/units';
import { SPELLS } from '../../content/spells';
import {
  buildingStatus, maxRecruitable, visitingCastle,
} from '../../core/selectors';
import type {
  Action, BuildingId, Castle, GameState, UnitTier,
} from '../../core/types';
import { ArmySlots } from './ArmySlots';
import { guildSpellCount } from '../../core/game/magic';
import { heroHireCost } from '../../core/game/tavern';
import {
  MARKET_BUY_GOLD, MARKET_SELL_GOLD,
} from '../../content/marketplace';

interface Props {
  state: GameState;
  castle: Castle;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

const COMMON_BUILDABLE: BuildingId[] = [
  'dwelling2', 'dwelling3', 'dwelling4', 'dwelling5', 'treasury', 'walls',
  'mageGuild1', 'mageGuild2', 'mageGuild3', 'tavern', 'marketplace',
];

function costLabel(cost: typeof BUILDINGS[BuildingId]['cost']): string {
  return Object.entries(cost).map(([resource, amount]) => `${amount} ${resource}`).join(' · ');
}

export function CastleScreen({ state, castle, dispatch, onClose }: Props) {
  const [counts, setCounts] = useState<Record<number, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  });
  const [heroSlot, setHeroSlot] = useState<number | null>(null);
  const hero = state.players[state.activePlayer].hero;
  const heroIsVisiting = visitingCastle(state)?.id === castle.id;
  const buildable = [
    ...COMMON_BUILDABLE,
    castle.faction === 'hearthguard' ? 'chapelOfTheBanner' : 'guildWorkshop',
  ] as BuildingId[];
  const guildSpells = castle.guildDeck.slice(0, guildSpellCount(castle));
  const tavernHeroes = state.players[state.activePlayer].tavernOffers
    .map((id) => state.players[state.activePlayer].tavernPool.find(
      (candidate) => candidate.id === id,
    )).filter((candidate) => candidate !== undefined);

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
            <h2>{castle.faction === 'hearthguard' ? 'Westwatch' : 'Eastwatch'}</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </header>
        <div className="castle-columns">
          <div>
            <h3>Town works</h3>
            <div className="building-grid">
              <div className="building built"><b>Town Hall</b><small>+500 gold daily</small></div>
              <div className="building built"><b>Tier 1 Dwelling</b><small>Basic troops</small></div>
              {buildable.map((id) => {
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
              {([1, 2, 3, 4, 5] as UnitTier[]).map((tier) => {
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
        <section className="guild-panel">
          <h3>Mage Guild</h3>
          {guildSpells.length === 0 ? (
            <p>Build Mage Guild I to reveal this castle’s spell deal.</p>
          ) : (
            <div className="guild-spells">
              {guildSpells.map((spellId) => {
                const known = hero?.knownSpells.includes(spellId);
                const upgraded = hero?.upgradedSpells.includes(spellId);
                return (
                  <article key={spellId} className={known ? 'known' : ''}>
                    <b>{SPELLS[spellId].name}{upgraded ? '+' : ''}</b>
                    <small>{SPELLS[spellId].school} · {SPELLS[spellId].mana} mana</small>
                    <span>{upgraded ? SPELLS[spellId].plus : SPELLS[spellId].base}</span>
                    <button
                      disabled={!heroIsVisiting || !known || upgraded
                        || state.players[state.activePlayer].resources.essence < 4}
                      onClick={() => dispatch({
                        type: 'GUILD_INSCRIBE', castleId: castle.id, spellId,
                      })}
                    >Inscribe · 4 essence</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="tavern-panel">
          <h3>Tavern</h3>
          {!castle.buildings.includes('tavern') ? (
            <p>Build the Tavern to hire named heroes.</p>
          ) : (
            <div className="tavern-offers">
              {tavernHeroes.length ? tavernHeroes.map((candidate) => {
                const cost = heroHireCost(candidate);
                return (
                  <article key={candidate.id}>
                    <i className={candidate.faction}>{candidate.name[0]}</i>
                    <div>
                      <b>{candidate.name}</b>
                      <small>Level {candidate.level} · {
                        candidate.defeated ? 'returning veteran' : 'new company'
                      }</small>
                    </div>
                    <button
                      disabled={state.players[state.activePlayer].heroes.length >= 3
                        || state.players[state.activePlayer].resources.gold < cost}
                      onClick={() => dispatch({
                        type: 'HIRE_HERO', castleId: castle.id, heroId: candidate.id,
                      })}
                    >
                      Hire · {cost.toLocaleString()}g
                    </button>
                  </article>
                );
              }) : <p>No heroes remain in this week’s pool.</p>}
            </div>
          )}
        </section>
        <section className="tavern-panel marketplace-panel">
          <h3>Marketplace</h3>
          {!castle.buildings.includes('marketplace') ? (
            <p>Build the Marketplace to exchange resources at concessionary rates.</p>
          ) : !heroIsVisiting ? (
            <p>A hero must visit this castle to trade.</p>
          ) : (
            <div className="tavern-offers">
              {(['timber', 'iron', 'essence'] as const).map((resource) => (
                <article key={resource}>
                  <div>
                    <b>{resource}</b>
                    <small>{state.players[state.activePlayer].resources[resource]} held</small>
                  </div>
                  <button
                    disabled={state.players[state.activePlayer].resources[resource] < 1}
                    onClick={() => dispatch({
                      type: 'MARKET_TRADE', castleId: castle.id,
                      direction: 'sell', resource, amount: 1,
                    })}
                  >Sell 1 · {MARKET_SELL_GOLD}g</button>
                  <button
                    disabled={state.players[state.activePlayer].resources.gold
                      < MARKET_BUY_GOLD[resource]}
                    onClick={() => dispatch({
                      type: 'MARKET_TRADE', castleId: castle.id,
                      direction: 'buy', resource, amount: 1,
                    })}
                  >Buy 1 · {MARKET_BUY_GOLD[resource]}g</button>
                </article>
              ))}
            </div>
          )}
        </section>
        <footer>One building may be constructed in each castle per day.</footer>
      </section>
    </div>
  );
}
