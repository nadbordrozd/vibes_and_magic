import { useEffect, useState } from 'react';
import {
  BUILDINGS, buildingPresentation, type BuildingCategory,
} from '../../content/buildings';
import { FACTION_UNITS, UNITS } from '../../content/units';
import { SPELLS } from '../../content/spells';
import {
  buildingStatus, castleBuildingSlots, maxRecruitable, visitingCastle,
} from '../../core/selectors';
import type {
  Action, BuildingId, Castle, GameState, ResourceId, UnitTier,
} from '../../core/types';
import { ArmyExchange } from './ArmyExchange';
import { ArmySlots } from './ArmySlots';
import { guildSpellCount } from '../../core/game/magic';
import { heroHireCost } from '../../core/game/tavern';
import {
  MARKET_BUY_GOLD, MARKET_SELL_GOLD,
} from '../../content/marketplace';
import { itemName } from '../../content/items';
import { TERRAIN, terrainIdAt } from '../../content/terrain';
import {
  MARKET_SCROLL_PRICE, artifactMarketValue, itemMarketValue,
} from '../../core/game/marketplace';
import { ARTIFACTS } from '../../content/artifacts';
import { buildingIsActive } from '../../core/game/buildingStatus';
import {
  RESOURCE_NAMES, ResourceAmount, ResourceCost, ResourceIcon, ResourceRichText,
} from './ResourceToken';
import { HeroPortrait, UnitPortrait } from '../assets';
import { CASTLE_NAMES, FACTION_PASSIVES } from '../../content/factionPresentation';
import { FACTIONS } from '../../content/factions';
import { SPELL_SCHOOL_NAMES } from '../../content/spellPresentation';

interface Props {
  state: GameState;
  castle: Castle;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

function BuildingPicture({ category, large = false }: {
  category: BuildingCategory; large?: boolean;
}) {
  return <svg className={`building-picture ${large ? 'large' : ''}`} viewBox="0 0 100 72"
    aria-hidden="true"><use href={`#building-${category}`} /></svg>;
}

function BuildingSymbols() {
  return (
    <svg className="building-symbols" aria-hidden="true">
      <defs>
        <symbol id="building-hall" viewBox="0 0 100 72"><path d="M12 61h76M20 61V30h60v31M15 30h70L50 8zM34 61V43h12v18M56 61V43h12v18" /></symbol>
        <symbol id="building-dwelling" viewBox="0 0 100 72"><path d="M15 61h70M23 61V35l27-20 27 20v26M41 61V46h18v15M30 37h12M58 37h12" /></symbol>
        <symbol id="building-guild" viewBox="0 0 100 72"><path d="M21 62h58M29 62V22h42v40M25 22h50L50 8zM43 62V45h14v17M38 31h24M50 26v10" /></symbol>
        <symbol id="building-walls" viewBox="0 0 100 72"><path d="M12 62h76V29H76v9H63v-9H50v9H37v-9H24v9H12zM43 62V48h14v14" /></symbol>
        <symbol id="building-economy" viewBox="0 0 100 72"><path d="M16 61h68M23 61V28h54v33M18 28h64L72 13H28zM38 61V42h24v19M31 37h8M61 37h8" /><circle cx="50" cy="23" r="5" /></symbol>
        <symbol id="building-special" viewBox="0 0 100 72"><path d="M50 8l10 18 21 4-15 15 3 21-19-9-19 9 3-21-15-15 21-4z" /></symbol>
      </defs>
    </svg>
  );
}

export function CastleScreen({ state, castle, dispatch, onClose }: Props) {
  const castleOwner = castle.owner === 'neutral' ? state.activePlayer : castle.owner;
  const [counts, setCounts] = useState<Record<number, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  });
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingId | null>(null);
  const hero = state.players[state.activePlayer].hero;
  const heroIsVisiting = visitingCastle(state)?.id === castle.id;
  const buildable = castleBuildingSlots(castle);
  const guildSpells = castle.guildDeck.slice(0, guildSpellCount(castle));
  const tavernHeroes = state.players[state.activePlayer].tavernOffers
    .map((id) => state.players[state.activePlayer].tavernPool.find(
      (candidate) => candidate.id === id,
    )).filter((candidate) => candidate !== undefined);
  const tunnelDestinations = state.castles.filter((candidate) =>
    candidate.id !== castle.id && candidate.owner === castle.owner
    && buildingIsActive(candidate, 'deepTunnels'));
  const relocationTargets = state.players[state.activePlayer].explored.flatMap((key) => {
    const [x, y] = key.split(',').map(Number);
    const terrain = terrainIdAt(state.map, { x, y });
    return Math.max(Math.abs(x - castle.position.x), Math.abs(y - castle.position.y)) <= 3
      && terrain !== 'water' && terrain !== 'mountain'
      && !state.castles.some((candidate) => candidate.position.x === x && candidate.position.y === y)
      && !state.map.objects.some((object) => object.position.x === x && object.position.y === y)
      ? [{ x, y }] : [];
  });

  useEffect(() => {
    const inspectBuilding = (event: Event) => {
      const detail = (event as CustomEvent<{ id: BuildingId }>).detail;
      if (detail?.id && buildable.includes(detail.id)) setSelectedBuilding(detail.id);
    };
    window.addEventListener('castle-building-inspect', inspectBuilding);
    return () => window.removeEventListener('castle-building-inspect', inspectBuilding);
  }, [buildable]);

  const selectedDefinition = selectedBuilding
    ? buildingPresentation(selectedBuilding, castle.faction) : null;
  const selectedStatus = selectedBuilding
    ? buildingStatus(state, castle, selectedBuilding) : null;

  return (
    <div className="modal-backdrop">
      <section className={`castle-screen ${castle.faction}`}>
        <BuildingSymbols />
        <header>
          <div>
            <span>{FACTIONS[castle.faction].name.replace(/^The /, '')} stronghold</span>
            <h2>{CASTLE_NAMES[castle.faction]}</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </header>
        <div className="castle-passive" data-inspect-kind="castle" data-inspect-id={castle.id}>
          <b>{FACTION_PASSIVES[castle.faction].name}</b>
          <span>{FACTION_PASSIVES[castle.faction].description}</span>
          <small>Right-click for ownership, magic schools, buildings, and garrison.</small>
        </div>
        <div className="castle-columns">
          <div>
            <h3>Town works</h3>
            <div className="building-grid">
              {buildable.map((id) => {
                const status = buildingStatus(state, castle, id);
                const definition = buildingPresentation(id, castle.faction);
                return (
                  <button
                    key={id}
                    className={`building-card ${status.color} ${castle.dormantBuildings[id] ? 'dormant' : ''}`}
                    onClick={() => setSelectedBuilding(id)}
                    title={status.reason}
                    data-inspect-kind="building" data-inspect-id={`${id}@${castle.faction}`}
                  >
                    <BuildingPicture category={definition.category} />
                    <b>{definition.name}</b>
                  </button>
                );
              })}
            </div>
            {buildingIsActive(castle, 'shipyard') && (
              <button className="secondary wide" onClick={() => dispatch({
                type: 'BUILD_BOAT', castleId: castle.id,
              })}>Launch boat · <ResourceCost cost={{ gold: 1000, timber: 3 }} compact /></button>
            )}
          </div>
          <div>
            <h3>Recruitment</h3>
            <div className="recruit-list">
              {([1, 2, 3, 4, 5, 6] as UnitTier[]).map((tier) => {
                const unit = UNITS[FACTION_UNITS[castle.faction][tier - 1]];
                const dwelling = buildingPresentation(`dwelling${tier}` as BuildingId, castle.faction);
                const max = maxRecruitable(state, castle, tier);
                const count = Math.min(counts[tier], max);
                return (
                  <div className={`recruit-row ${max === 0 ? 'locked' : ''}`} key={tier}
                    data-inspect-kind="unit" data-inspect-id={unit.id}>
                    <span className="tier">T{tier}</span>
                    <UnitPortrait unitId={unit.id} className="recruit-unit-portrait" />
                    <div><b>{dwelling.name}</b><small>Recruits: {unit.name} · Growth: {unit.growth}/week<br />{castle.available[tier - 1]} available · <ResourceCost cost={unit.cost} compact /> each</small></div>
                    <div className="stepper">
                      <button disabled={count === 0} title={count === 0 ? 'The selected amount is already zero.' : 'Select one fewer.'}
                        onClick={() => setCounts({ ...counts, [tier]: Math.max(0, count - 1) })}>−</button>
                      <b>{count}</b>
                      <button disabled={count >= max} title={count >= max
                        ? 'No more can be recruited with current stock, resources, and army space.' : 'Select one more.'}
                        onClick={() => setCounts({ ...counts, [tier]: Math.min(max, count + 1) })}>+</button>
                      <button disabled={count >= max} title={count >= max
                        ? 'The maximum recruitable amount is already selected.' : `Select all ${max} currently recruitable.`}
                        onClick={() => setCounts({ ...counts, [tier]: max })}>Max</button>
                    </div>
                    <button
                      className="hire"
                      disabled={count === 0}
                      title={count === 0
                        ? 'Choose at least one creature; the dwelling, weekly stock, army space, and resources must allow it.'
                        : `Hire ${count} ${unit.name}.`}
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
        <section className="castle-exchange" aria-label="Castle company exchange">
          {hero && heroIsVisiting ? (
            <ArmyExchange
              left={{
                label: `${hero.name} (visiting hero)`,
                holder: { kind: 'hero', id: hero.id },
                army: hero.army,
              }}
              right={{
                label: `${CASTLE_NAMES[castle.faction]} garrison`,
                holder: { kind: 'garrison', id: castle.id },
                army: castle.garrison,
              }}
              dispatch={dispatch} />
          ) : (
            <div className="transfer-area">
              <div className="remote-castle-note">
                <b>Remote command</b>
                <span>Build and recruit here. Move your hero into the castle to transfer troops.</span>
              </div>
              <div className="transfer-arrow">→</div>
              <ArmySlots army={castle.garrison} title="Castle garrison"
                onSplit={(sourceSlot, destinationSlot, count) => dispatch({ type: 'SPLIT_ARMY',
                  holder: { kind: 'garrison', id: castle.id }, sourceSlot, destinationSlot, count })} />
            </div>
          )}
        </section>
        <section className="guild-panel">
          <h3>Mage Guild</h3>
          {guildSpells.length === 0 ? (
            <p>Build Mage Guild 1 to reveal this castle’s spell deal.</p>
          ) : (
            <div className="guild-spells">
              {guildSpells.map((spellId) => {
                const known = hero?.knownSpells.includes(spellId);
                const upgraded = hero?.upgradedSpells.includes(spellId);
                return (
                  <article key={spellId} className={known ? 'known' : ''}
                    data-inspect-kind="spell" data-inspect-id={spellId}>
                    <b>{SPELLS[spellId].name}{upgraded ? '+' : ''}</b>
                    <small>{SPELL_SCHOOL_NAMES[SPELLS[spellId].school]} school · {SPELLS[spellId].mana} mana</small>
                    <span>{upgraded ? SPELLS[spellId].plus : SPELLS[spellId].base}</span>
                    <button
                      disabled={!heroIsVisiting || !known || upgraded
                        || state.players[state.activePlayer].resources.essence < 4}
                      title={!heroIsVisiting ? 'A hero must visit this castle to inscribe a spell.'
                        : !known ? 'The visiting hero must know this spell first.'
                          : upgraded ? 'This spell is already upgraded.'
                            : state.players[state.activePlayer].resources.essence < 4
                              ? 'You need 4 essence.' : `Upgrade ${SPELLS[spellId].name}.`}
                      onClick={() => dispatch({
                        type: 'GUILD_INSCRIBE', castleId: castle.id, spellId,
                      })}
                    >Inscribe · <ResourceAmount resource="essence" amount={4} compact /></button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="tavern-panel">
          <h3>Tavern</h3>
          {!buildingIsActive(castle, 'tavern') ? (
            <p>Build the Tavern to hire named heroes.</p>
          ) : (
            <div className="tavern-offers">
              {tavernHeroes.length ? tavernHeroes.map((candidate) => {
                const cost = heroHireCost(candidate);
                return (
                  <article key={candidate.id} data-inspect-kind="hero" data-inspect-id={candidate.id}>
                    <HeroPortrait faction={candidate.faction} className="tavern-hero-portrait" />
                    <div>
                      <b>{candidate.name}</b>
                      <small>Level {candidate.level} · {
                        candidate.defeated ? 'returning veteran' : 'new company'
                      }</small>
                    </div>
                    <button
                      disabled={state.players[state.activePlayer].heroes.length >= 3
                        || state.players[state.activePlayer].resources.gold < cost}
                      title={state.players[state.activePlayer].heroes.length >= 3
                        ? 'You already command the maximum of three heroes.'
                        : state.players[state.activePlayer].resources.gold < cost
                          ? `You need ${cost.toLocaleString()} gold.` : `Hire ${candidate.name}.`}
                      onClick={() => dispatch({
                        type: 'HIRE_HERO', castleId: castle.id, heroId: candidate.id,
                      })}
                    >
                      Hire · <ResourceAmount resource="gold" amount={cost} compact />
                    </button>
                  </article>
                );
              }) : <p>No heroes remain in this week’s pool.</p>}
            </div>
          )}
        </section>
        <section className="tavern-panel marketplace-panel">
          <h3>Marketplace</h3>
          {!buildingIsActive(castle, 'marketplace') ? (
            <p>Build the Marketplace to exchange resources at concessionary rates.</p>
          ) : !heroIsVisiting ? (
            <p>A hero must visit this castle to trade.</p>
          ) : (
            <div className="tavern-offers">
              {(['timber', 'iron', 'essence'] as const).map((resource) => (
                <article key={resource}>
                  <div>
                    <b><ResourceIcon resource={resource} /> {RESOURCE_NAMES[resource]}</b>
                    <small><ResourceAmount resource={resource}
                      amount={state.players[state.activePlayer].resources[resource]} compact /> held</small>
                  </div>
                  <button
                    disabled={state.players[state.activePlayer].resources[resource] < 1}
                    title={state.players[state.activePlayer].resources[resource] < 1
                      ? `You have no ${RESOURCE_NAMES[resource].toLowerCase()} to sell.` : `Sell 1 ${RESOURCE_NAMES[resource].toLowerCase()}.`}
                    onClick={() => dispatch({
                      type: 'MARKET_TRADE', castleId: castle.id,
                      direction: 'sell', resource, amount: 1,
                    })}
                  >Sell <ResourceAmount resource={resource} amount={1} compact /> → <ResourceAmount
                    resource="gold" amount={MARKET_SELL_GOLD} compact /></button>
                  <button
                    disabled={state.players[state.activePlayer].resources.gold
                      < MARKET_BUY_GOLD[resource]}
                    title={state.players[state.activePlayer].resources.gold < MARKET_BUY_GOLD[resource]
                      ? `You need ${MARKET_BUY_GOLD[resource]} gold.` : `Buy 1 ${RESOURCE_NAMES[resource].toLowerCase()}.`}
                    onClick={() => dispatch({
                      type: 'MARKET_TRADE', castleId: castle.id,
                      direction: 'buy', resource, amount: 1,
                    })}
                  ><ResourceAmount resource="gold" amount={MARKET_BUY_GOLD[resource]} compact /> → <ResourceAmount
                    resource={resource} amount={1} compact /></button>
                </article>
              ))}
              {(hero?.skills.peddler ?? 0) >= 2 && (
                <article>
                  <div><b>Weekly scroll</b><small>{castle.marketScroll
                    ? itemName(castle.marketScroll) : 'Sold out'}</small></div>
                  <button
                    disabled={!castle.marketScroll
                      || state.players[state.activePlayer].resources.gold < MARKET_SCROLL_PRICE
                      || !hero?.inventory.includes(null)}
                    title={!castle.marketScroll ? 'The weekly scroll is sold out.'
                      : state.players[state.activePlayer].resources.gold < MARKET_SCROLL_PRICE
                        ? `You need ${MARKET_SCROLL_PRICE} gold.`
                        : !hero?.inventory.includes(null) ? 'The visiting hero has no open inventory slot.'
                          : 'Buy the weekly scroll.'}
                    onClick={() => dispatch({
                      type: 'BUY_MARKET_SCROLL', castleId: castle.id,
                    })}
                  >Buy · <ResourceAmount resource="gold" amount={MARKET_SCROLL_PRICE} compact /></button>
                </article>
              )}
              {(hero?.skills.peddler ?? 0) >= 2 && hero?.inventory.map((item, index) =>
                item && typeof item !== 'string' ? (
                  <article key={`sell-item-${index}`} data-inspect-kind="item" data-inspect-id={item.id}>
                    <div><b>{itemName(item)}</b><small>Inventory slot {index + 1}</small></div>
                    <button onClick={() => dispatch({
                      type: 'SELL_MARKET_ITEM', castleId: castle.id, inventorySlot: index,
                    })}>Sell · <ResourceAmount resource="gold"
                      amount={Math.floor(itemMarketValue(item) * 0.6)} compact /></button>
                  </article>
                ) : null)}
              {(hero?.skills.peddler ?? 0) >= 2 && hero?.artifacts.backpack.map(
                (artifact, index) => artifactMarketValue(artifact) > 0 ? (
                  <article key={`sell-artifact-${index}`} data-inspect-kind="artifact" data-inspect-id={artifact.id}>
                    <div><b>{ARTIFACTS[artifact.id].name}</b><small>Artifact backpack</small></div>
                    <button onClick={() => dispatch({
                      type: 'SELL_MARKET_ARTIFACT', castleId: castle.id,
                      backpackIndex: index,
                    })}>Sell · <ResourceAmount resource="gold"
                      amount={Math.floor(artifactMarketValue(artifact) * 0.6)} compact /></button>
                  </article>
                ) : null,
              )}
            </div>
          )}
        </section>
        {heroIsVisiting && buildingIsActive(castle, 'deepTunnels') && (
          <section className="tavern-panel">
            <h3>Deep Tunnels</h3>
            {tunnelDestinations.map((destination) => (
              <button
                key={destination.id} disabled={(hero?.movement ?? 0) < 500}
                title={(hero?.movement ?? 0) < 500 ? 'The visiting hero needs 500 movement.'
                  : `Travel to ${CASTLE_NAMES[destination.faction]}.`}
                onClick={() => dispatch({
                  type: 'TUNNEL_TRAVEL', destinationCastleId: destination.id,
                })}
              >Travel to {CASTLE_NAMES[destination.faction]} · 500 move</button>
            ))}
            {!tunnelDestinations.length && <p>No other Tunnel-castle is connected.</p>}
          </section>
        )}
        {buildingIsActive(castle, 'henLeggedFence') && (state.day - 1) % 7 === 0 && (
          <section className="tavern-panel">
            <h3>The castle may walk</h3>
            <div className="tavern-offers">
              {relocationTargets.slice(0, 8).map((destination) => (
                <button key={`${destination.x},${destination.y}`}
                  title={`Relocate to map coordinate ${destination.x}, ${destination.y}.`}
                  onClick={() => dispatch({
                    type: 'RELOCATE_CASTLE', castleId: castle.id, destination,
                  })}>Move {Math.max(Math.abs(destination.x - castle.position.x),
                    Math.abs(destination.y - castle.position.y))} tiles {
                    Math.abs(destination.x - castle.position.x) > Math.abs(destination.y - castle.position.y)
                      ? destination.x > castle.position.x ? 'east' : 'west'
                      : destination.y > castle.position.y ? 'south' : 'north'
                  } · {TERRAIN[terrainIdAt(state.map, destination)].label}</button>
              ))}
            </div>
          </section>
        )}
        {selectedBuilding && selectedDefinition && selectedStatus && (
          <div className="building-detail-backdrop" onClick={() => setSelectedBuilding(null)}>
            <article className="building-detail" role="dialog"
              aria-label={selectedDefinition.name} onClick={(event) => event.stopPropagation()}>
              <button className="inspection-close" aria-label="Close building details"
                title="Close building details" onClick={() => setSelectedBuilding(null)}>×</button>
              <BuildingPicture category={selectedDefinition.category} large />
              <h2>{selectedDefinition.name}</h2>
              <p className="building-detail-flavor">{selectedDefinition.flavor}</p>
              <section><h3>Function</h3><p>{selectedDefinition.function}</p></section>
              {(selectedDefinition.upgrades || selectedDefinition.prerequisite) && (
                <p className="upgrade-line">
                  {selectedDefinition.prerequisite && <span>Upgrades: {
                    buildingPresentation(selectedDefinition.prerequisite, castle.faction).name
                  }</span>}
                  {selectedDefinition.upgrades && <span>Upgrades to: {
                    buildingPresentation(selectedDefinition.upgrades, castle.faction).name
                  }</span>}
                </p>
              )}
              <section><h3>Cost</h3><div className="building-costs">
                {Object.entries(selectedDefinition.cost).length === 0
                  ? <span>Free</span>
                  : Object.entries(selectedDefinition.cost).map(([resource, amount]) => {
                    const held = state.players[castleOwner].resources[resource as ResourceId];
                    return <span key={resource} className={held < (amount ?? 0) ? 'missing' : ''}>
                      <ResourceAmount resource={resource as ResourceId} amount={amount ?? 0} />
                    </span>;
                  })}
              </div></section>
              <section><h3>Requires</h3>
                {selectedDefinition.prerequisite ? (
                  <p className={castle.buildings.includes(selectedDefinition.prerequisite)
                    ? '' : 'missing'}>
                    {buildingPresentation(selectedDefinition.prerequisite, castle.faction).name}
                  </p>
                ) : <p>None</p>}
              </section>
              <p className={`building-state-line ${selectedStatus.state}`}>
                <ResourceRichText>{selectedStatus.reason}</ResourceRichText>
              </p>
              {selectedStatus.state === 'available' && (
                <button className="primary" onClick={() => {
                  dispatch({ type: 'BUILD', castleId: castle.id, buildingId: selectedBuilding });
                  setSelectedBuilding(null);
                }}>Build</button>
              )}
              {selectedStatus.state === 'locked' && <button disabled>Build</button>}
            </article>
          </div>
        )}
        <footer>One building may be constructed in each castle per day.</footer>
      </section>
    </div>
  );
}
