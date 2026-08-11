import type {
  Action, BattleStatistics, GameState, Player, PrimaryStat,
} from '../../core/types';
import { CHEST_GOLD, CHEST_XP } from '../../content/constants';
import { SPELLS } from '../../content/spells';
import { SKILLS } from '../../content/skills';
import { ITEMS, itemName } from '../../content/items';
import { BARGAINS } from '../../content/bargains';
import { ARTIFACTS } from '../../content/artifacts';
import { UNITS } from '../../content/units';
import { ResourceAmount, ResourceIcon, ResourceRichText } from './ResourceToken';
import { FACTIONS } from '../../content/factions';
import { CASTLE_NAMES } from '../../content/factionPresentation';
import { bargainChoiceAvailability } from '../../core/game/bargains';
import { mapObjectName } from '../inspection';
import { campaignOutcome } from '../campaignOutcome';
import type { BattleResultData } from '../battleResult';
import { ContentIcon } from './ContentIcon';
import { ItemSprite } from '../assets';

interface ChoiceProps {
  state: GameState;
  dispatch: (action: Action) => void;
}

const STAT_COPY: Record<PrimaryStat, string> = {
  attack: 'Increase all allied physical damage.',
  defense: 'Reduce damage received by every stack.',
  spellPower: 'Empower future spells and their duration.',
  knowledge: 'Increase maximum mana by ten.',
};

function ChoiceCommitment({ detail }: { detail?: string }) {
  return (
    <p className="choice-commitment">
      Mutually exclusive choice · {detail ?? 'choose one result to continue. This choice cannot be cancelled.'}
    </p>
  );
}

function ChoiceSource({ state, objectId, label }: {
  state: GameState; objectId?: string; label: string;
}) {
  const inspectable = objectId && state.map.objects.some((object) => object.id === objectId);
  return (
    <span className="dialog-kicker choice-source"
      data-inspect-kind={inspectable ? 'object' : undefined}
      data-inspect-id={inspectable ? objectId : undefined}>
      Source · {label}
    </span>
  );
}

export function ChoiceDialog({ state, dispatch }: ChoiceProps) {
  const pending = state.pendingChoice;
  if (!pending) return null;
  const player = state.players[pending.playerId];
  if (player.controller !== 'human') return null;
  const hero = player.heroes.find((candidate) => candidate.id === pending.heroId);
  if (pending.kind === 'siteStat') {
    const source = state.map.objects.find((object) => object.id === pending.objectId);
    return (
      <div className="modal-backdrop choice-backdrop"><section className="choice-dialog">
        <ChoiceSource state={state} objectId={pending.objectId}
          label={source ? mapObjectName(source) : 'The Sparring Stone'} />
        <h2>{hero?.name ?? 'This hero'} chooses a lesson</h2>
        <p>Generations have hit this rock. The rock has learned nothing. The visitors have.</p>
        <div className="choice-cards">{pending.options.map((choice) =>
          <button key={choice} onClick={() => dispatch({ type: 'CHOOSE_SITE_STAT', choice })}>
            <i>{choice === 'attack' ? 'A' : 'D'}</i><b>Gain +1 {choice}</b>
            <small>Permanently add +1 {choice} to {hero?.name ?? 'this hero'}; the other lesson is lost.</small>
          </button>)}</div>
        <ChoiceCommitment />
      </section></div>
    );
  }
  if (pending.kind === 'chest') {
    const source = state.map.objects.find((object) => object.id === pending.objectId);
    const rewardDefinition = pending.artifact
      ? ARTIFACTS[pending.artifact.id] : ITEMS[pending.item.id];
    const itemDisabled = !hero || (!pending.artifact && !hero.inventory.includes(null));
    const disabledReason = !hero ? 'The reward hero is missing.'
      : 'This consumable needs one empty consumable inventory slot; the hero has none.';
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog chest-choice">
          <ChoiceSource state={state} objectId={pending.objectId}
            label={source ? mapObjectName(source) : 'Treasure chest'} />
          <h2>{hero?.name ?? 'This hero'} chooses one reward</h2>
          <p>The old coffer holds coin and a cache of forgotten campaign journals.</p>
          <div className="choice-cards">
            <button onClick={() => dispatch({ type: 'CHOOSE_CHEST', choice: 'gold' })}>
              <ResourceIcon resource="gold" /><b>{CHEST_GOLD.toLocaleString()} Gold</b>
              <small>Fund buildings and fresh recruits.</small>
            </button>
            <button onClick={() => dispatch({ type: 'CHOOSE_CHEST', choice: 'xp' })}>
              <i>✦</i><b>{CHEST_XP.toLocaleString()} Experience</b><small>Advance your hero’s build.</small>
            </button>
            <button
              data-inspect-kind={pending.artifact ? 'artifact' : 'item'}
              data-inspect-id={pending.artifact?.id ?? pending.item.id}
              disabled={itemDisabled}
              data-disabled-reason={itemDisabled ? disabledReason : undefined}
              title={itemDisabled ? disabledReason : pending.artifact
                ? 'Take this artifact into the unlimited backpack.'
                : 'Take this consumable into an empty inventory slot.'}
              onClick={() => dispatch({ type: 'CHOOSE_CHEST', choice: 'item' })}
            >
              {pending.artifact ? <i>◇</i> : <ItemSprite item={pending.item} />}<b>{pending.artifact
                ? ARTIFACTS[pending.artifact.id].name : itemName(pending.item)}</b>
              <small>{pending.artifact
                ? `${rewardDefinition.description} Goes to the unlimited artifact backpack; consumable slots do not matter.`
                : `${rewardDefinition.description} Occupies one empty consumable slot.`}</small>
              {itemDisabled && <em>Unavailable · {disabledReason}</em>}
            </button>
          </div>
          <ChoiceCommitment />
        </section>
      </div>
    );
  }
  if (pending.kind === 'diplomacy') {
    const guardian = state.map.objects.find((object) =>
      object.id === pending.objectId && object.kind === 'guardian');
    const diplomacyRank = hero?.skills.diplomacy ?? 0;
    const recruitReason = pending.recruitCost === null
      ? diplomacyRank < 2
        ? 'Recruit requires Diplomacy rank 2 or 3.'
        : 'Every guardian company must fit or merge into this hero’s seven army slots.'
      : player.resources.gold < pending.recruitCost
        ? `Recruit costs ${pending.recruitCost.toLocaleString()} gold; you have ${player.resources.gold.toLocaleString()}.`
        : 'Recruit every displayed guardian company.';
    const standAsideReason = !pending.canStandAside
      ? 'Stand aside requires Diplomacy rank 3.'
      : player.resources.gold < pending.disbandCost
        ? `Passage costs ${pending.disbandCost.toLocaleString()} gold; you have ${player.resources.gold.toLocaleString()}.`
        : 'Pay for this hero to pass once while the guardians remain.';
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog">
          <ChoiceSource state={state} objectId={pending.objectId} label="Guardian company · Diplomacy" />
          <h2>{hero?.name ?? 'This hero'} answers the guardians</h2>
          <p className="choice-offer-list">Offered company: {guardian?.kind === 'guardian'
            ? guardian.army.map((stack) => (
              <span key={stack.unitId} data-inspect-kind="unit" data-inspect-id={stack.unitId}>
                {stack.count} {UNITS[stack.unitId].name}
              </span>
            )) : 'guardian roster unavailable'}.</p>
          <div className="choice-cards three">
            <button onClick={() => dispatch({ type: 'CHOOSE_DIPLOMACY', choice: 'fight' })}>
              <i>⚔</i><b>Fight · 0 gold</b><small>Begin battle now; the guardians and their post remain unless defeated.</small>
            </button>
            <button
              disabled={player.resources.gold < pending.disbandCost}
              data-disabled-reason={player.resources.gold < pending.disbandCost
                ? `Disband costs ${pending.disbandCost.toLocaleString()} gold; you have ${player.resources.gold.toLocaleString()}.` : undefined}
              title={player.resources.gold < pending.disbandCost
                ? `Disband costs ${pending.disbandCost.toLocaleString()} gold; you have ${player.resources.gold.toLocaleString()}.`
                : 'Pay the whole company to disperse and remove its post.'}
              onClick={() => dispatch({ type: 'CHOOSE_DIPLOMACY', choice: 'disband' })}
            >
              <ResourceIcon resource="gold" /><b>Pay {pending.disbandCost.toLocaleString()}</b>
              <small>Spend exactly {pending.disbandCost.toLocaleString()} gold; remove the guardians without battle.</small>
              {player.resources.gold < pending.disbandCost && <em>Unavailable · Disband costs {
                pending.disbandCost.toLocaleString()} gold; you have {player.resources.gold.toLocaleString()}.</em>}
            </button>
            <button
              disabled={pending.recruitCost === null || player.resources.gold < pending.recruitCost}
              data-disabled-reason={pending.recruitCost === null
                || player.resources.gold < pending.recruitCost ? recruitReason : undefined}
              title={recruitReason}
              onClick={() => pending.recruitCost !== null
                && dispatch({ type: 'CHOOSE_DIPLOMACY', choice: 'recruit' })}
            >
              <ResourceIcon resource="gold" /><b>Recruit · {pending.recruitCost?.toLocaleString() ?? 'Unavailable'}</b>
              <small>{pending.recruitCost === null ? recruitReason
                : `Spend exactly ${pending.recruitCost.toLocaleString()} gold; every displayed company joins this army and the post is removed.`}</small>
              {(pending.recruitCost === null || player.resources.gold < pending.recruitCost)
                && <em>Unavailable · {recruitReason}</em>}
            </button>
            <button
              disabled={!pending.canStandAside || player.resources.gold < pending.disbandCost}
              data-disabled-reason={!pending.canStandAside
                || player.resources.gold < pending.disbandCost ? standAsideReason : undefined}
              title={standAsideReason}
              onClick={() => pending.canStandAside
                && dispatch({ type: 'CHOOSE_DIPLOMACY', choice: 'standAside' })}
            >
              <ResourceIcon resource="gold" /><b>Stand aside · {pending.disbandCost.toLocaleString()}</b>
              <small>Spend exactly {pending.disbandCost.toLocaleString()} gold; this hero may pass once and the guardians remain.</small>
              {(!pending.canStandAside || player.resources.gold < pending.disbandCost)
                && <em>Unavailable · {standAsideReason}</em>}
            </button>
          </div>
          <ChoiceCommitment />
        </section>
      </div>
    );
  }
  if (pending.kind === 'spellthief') {
    const copiedUpgrade = (hero?.skills.spellthief ?? 0) >= 2
      ? [...pending.upgradeOptions].sort().find((spellId) =>
        !hero?.upgradedSpells.includes(spellId)) : undefined;
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog spell-choice">
          <ChoiceSource state={state} label="Defeated rival · Spellthief" />
          <h2>{hero?.name ?? 'This hero'} steals one spell</h2>
          <p>Choose exactly one unknown spell from the defeated rival’s spellbook.</p>
          <div className="choice-cards three">
            {pending.options.map((spellId) => (
              <button
                key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}
                onClick={() => dispatch({ type: 'CHOOSE_STOLEN_SPELL', spellId })}
              >
                <ContentIcon large kind="spell" id={spellId} /><b>{SPELLS[spellId].name}</b>
                <small>Learn permanently · Standard: {SPELLS[spellId].base}{copiedUpgrade
                  ? ` Spellthief rank 2 also learns ${SPELLS[copiedUpgrade].name} as Upgraded automatically.`
                  : ''}</small>
              </button>
            ))}
          </div>
          <ChoiceCommitment />
        </section>
      </div>
    );
  }
  if (pending.kind === 'palimpsest') {
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog spell-choice">
          <ChoiceSource state={state} label="Forgotten spell · Palimpsest" />
          <h2>{hero?.name ?? 'This hero'} keeps one replacement</h2>
          <p>The forgotten spell is already erased. Learn exactly one offered spell permanently; every other offer is lost.</p>
          <div className="choice-cards three">
            {pending.options.map((spellId) => (
              <button
                key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}
                onClick={() => dispatch({ type: 'CHOOSE_PALIMPSEST', spellId })}
              >
                <ContentIcon large kind="spell" id={spellId} /><b>{SPELLS[spellId].name}</b>
                <small>Learn permanently · Standard: {SPELLS[spellId].base}</small>
              </button>
            ))}
          </div>
          <ChoiceCommitment />
        </section>
      </div>
    );
  }
  if (pending.kind === 'bargain') {
    if (!hero) return null;
    const source = pending.source === 'level' ? 'Level-up draft'
      : pending.source === 'post' ? 'Bargain Post' : 'Wayward Crone';
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog bargain-choice">
          <ChoiceSource state={state} label={source} />
          <h2>{hero.name} chooses one bargain</h2>
          <p>Each card grants its stated benefit now and adds its stated, unavoidable Debt.</p>
          <div className="choice-cards three">
            {pending.options.map((bargainId) => {
              const bargain = BARGAINS[bargainId];
              const zimaTerm = hero.specialtyId === 'gentleDebts' ? ({
                firstHarvest: 'Baba Zima: called one week later.',
                borrowedLegion: 'Baba Zima: departure one day later.',
                cuckoosDeal: 'Baba Zima: the watching begins one day later.',
                milkTeeth: 'Baba Zima: the lean weeks begin one week later.',
                longNap: 'Baba Zima: sleep begins one day later.',
                neverByIron: 'Baba Zima: iron is suppressed for one fewer day.',
                thirdChild: 'Baba Zima: the smaller draft comes one level later.',
                whatWasPromised: 'Baba Zima: instalments begin one week later.',
              } as const)[bargainId] : null;
              const availability = bargainChoiceAvailability(state, hero, bargainId);
              const castle = availability.castleId
                ? state.castles.find((candidate) => candidate.id === availability.castleId)
                : undefined;
              return (
                <button
                  key={bargainId}
                  disabled={!availability.available}
                  data-disabled-reason={!availability.available ? availability.reason : undefined}
                  title={availability.available ? `Accept ${bargain.name}. ${availability.reason}`
                    : availability.reason}
                  onClick={() => dispatch({
                    type: 'CHOOSE_BARGAIN', bargainId, castleId: castle?.id,
                  })}
                >
                  <i>☾</i><b>{bargain.name}</b>
                  <small className="choice-flavor">{bargain.flavor}</small>
                  <small><ResourceRichText>{bargain.benefit}</ResourceRichText></small>
                  <em>Debt: <ResourceRichText>{`${bargain.debt}${zimaTerm ? ` ${zimaTerm}` : ''}`}</ResourceRichText></em>
                  {!availability.available && <em>Unavailable · {availability.reason}</em>}
                  {castle && <small data-inspect-kind="castle" data-inspect-id={castle.id}>
                    Target · {CASTLE_NAMES[castle.faction]}
                  </small>}
                </button>
              );
            })}
          </div>
          <ChoiceCommitment />
        </section>
      </div>
    );
  }
  if (pending.kind === 'toll') {
    const guardian = state.map.objects.find((object) =>
      object.kind === 'guardian' && object.protects === pending.objectId);
    const cannotPay = player.resources.gold < pending.cost;
    const payReason = cannotPay
      ? `Passage costs ${pending.cost.toLocaleString()} gold; you have ${player.resources.gold.toLocaleString()}.`
      : 'Pay for this hero’s next passage; the Toll Gate and Keeper remain.';
    return (
      <div className="modal-backdrop choice-backdrop"><section className="choice-dialog">
        <ChoiceSource state={state} objectId={pending.objectId} label="Toll Gate" />
        <h2>{hero?.name ?? 'This hero'} chooses coin or combat</h2>
        {guardian?.kind === 'guardian' && <p className="choice-offer-list">Keeper company: {
          guardian.army.map((stack) => (
            <span key={stack.unitId} data-inspect-kind="unit" data-inspect-id={stack.unitId}>
              {stack.count} {UNITS[stack.unitId].name}
            </span>
          ))}.</p>}
        <div className="choice-cards">
          <button disabled={cannotPay}
            data-disabled-reason={cannotPay ? payReason : undefined}
            title={payReason}
            onClick={() => dispatch({ type: 'CHOOSE_TOLL', choice: 'pay' })}>
            <ResourceIcon resource="gold" /><b>Pay {pending.cost.toLocaleString()}</b>
            <small>Spend exactly {pending.cost.toLocaleString()} gold; this hero may pass once. The gate and Keeper remain.</small>
            {cannotPay && <em>Unavailable · {payReason}</em>}
          </button>
          <button onClick={() => dispatch({ type: 'CHOOSE_TOLL', choice: 'fight' })}>
            <i>⚔</i><b>Fight the Keeper · 0 gold</b><small>Begin the displayed guardian battle now; normal battle losses and victory resolution apply.</small>
          </button>
        </div>
        <ChoiceCommitment />
      </section></div>
    );
  }
  if (pending.kind === 'siren') {
    const rocks = state.map.objects.find((object) =>
      object.id === pending.objectId && object.kind === 'sirenRocks');
    const movementLoss = Math.min(300, hero?.movement ?? 0);
    return (
      <div className="modal-backdrop choice-backdrop"><section className="choice-dialog">
        <ChoiceSource state={state} objectId={pending.objectId} label="Siren Rocks" />
        <h2>The song is about {hero?.name ?? 'this hero'}</h2>
        <p>Specifically. Flatteringly. The oars have begun to hesitate.</p>
        {rocks?.kind === 'sirenRocks' && <p className="choice-offer-list">Hoard on victory: {
          [rocks.reward.gold ? `${rocks.reward.gold.toLocaleString()} gold` : '',
            rocks.reward.essence ? `${rocks.reward.essence.toLocaleString()} essence` : '']
            .filter(Boolean).join(', ') || 'no resources'}
          {(rocks.reward.items ?? []).map((item, index) => (
            <span key={`item-${index}`} data-inspect-kind="item" data-inspect-id={item.id}>
              <ItemSprite item={item} />{itemName(item)}
            </span>
          ))}
          {(rocks.reward.artifacts ?? []).map((artifact, index) => (
            <span key={`artifact-${index}`} data-inspect-kind="artifact" data-inspect-id={artifact.id}>
              {ARTIFACTS[artifact.id].name}
            </span>
          ))}
          {rocks.reward.teachesSpell && <span data-inspect-kind="spell"
            data-inspect-id={rocks.reward.teachesSpell}>{SPELLS[rocks.reward.teachesSpell].name}</span>}.
        </p>}
        <div className="choice-cards">
          <button onClick={() => dispatch({ type: 'CHOOSE_SIREN', choice: 'listen' })}>
            <i>♪</i><b>Listen · fight</b><small>Begin battle with the Sirens now; victory claims the displayed hoard.</small>
          </button>
          <button onClick={() => dispatch({ type: 'CHOOSE_SIREN', choice: 'rowPast' })}>
            <i>↝</i><b>Row past · −{movementLoss} movement</b>
            <small>End this approach without battle; movement falls from {(hero?.movement ?? 0).toLocaleString()} to {Math.max(0, (hero?.movement ?? 0) - 300).toLocaleString()}.</small>
          </button>
        </div>
        <ChoiceCommitment />
      </section></div>
    );
  }
  if (pending.kind === 'shrine' || pending.kind === 'inscribe') {
    const shrine = pending.kind === 'shrine'
      ? state.map.objects.find((object) => object.id === pending.objectId) : undefined;
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog spell-choice">
          <ChoiceSource state={state}
            objectId={pending.kind === 'shrine' ? pending.objectId : undefined}
            label={pending.kind === 'shrine' && shrine ? mapObjectName(shrine)
              : 'Level-up reward · Inscribe'} />
          <h2>{hero?.name ?? 'This hero'} upgrades one known spell</h2>
          <p>Choose one spell whose Upgraded rules will be learned permanently. Its Standard rules remain visible for comparison.</p>
          <div className="choice-cards three">
            {pending.options.map((spellId) => (
              <button
                key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}
                onClick={() => dispatch({ type: 'CHOOSE_SPELL_UPGRADE', spellId })}
              >
                <ContentIcon large kind="spell" id={spellId} /><b>{SPELLS[spellId].name} · Upgraded</b>
                <small>Permanently learn the Upgraded rules: {SPELLS[spellId].plus}</small>
              </button>
            ))}
          </div>
          <ChoiceCommitment detail={pending.kind === 'shrine' && pending.choicesRemaining > 1
            ? `choose one upgrade now; ${pending.choicesRemaining - 1} additional shrine choice follows from the remaining options. This step cannot be cancelled.`
            : undefined} />
        </section>
      </div>
    );
  }
  return (
    <div className="modal-backdrop choice-backdrop">
      <section className="choice-dialog level-choice">
        <ChoiceSource state={state} label={pending.source === 'hedgeSchool'
          ? 'Hedge School lesson · 1,500 gold already paid'
          : `Hero progression · level ${(hero?.level ?? 0) + 1}`} />
        <h2>{hero?.name ?? 'This hero'} chooses a path</h2>
        <p>One card grants the displayed permanent result and advances this hero to level {(hero?.level ?? 0) + 1}.</p>
        <div className="choice-cards three">
          {pending.options.map((stat) => (
            <button key={stat} onClick={() => dispatch({ type: 'CHOOSE_LEVEL', stat })}
              data-inspect-kind={stat in SKILLS ? 'skill' : undefined}
              data-inspect-id={stat in SKILLS ? stat : undefined}>
              {stat in SKILLS
                ? <ContentIcon large kind="skill" id={stat as keyof typeof SKILLS} />
                : <i>{stat === 'inscribe' ? '✦' : stat === 'bargain' ? '☾' : stat.slice(0, 1).toUpperCase()}</i>}
              <b>{stat === 'inscribe' ? 'Inscribe a spell'
                : stat === 'bargain' ? 'Take a bargain'
                : stat in SKILLS
                  ? `${SKILLS[stat as keyof typeof SKILLS].name} · Rank ${
                    (player.heroes.find((hero) => hero.id === pending.heroId)
                      ?.skills[stat as keyof typeof SKILLS] ?? 0) + 1
                  }`
                  : `+1 ${stat.replace(/([A-Z])/g, ' $1')}`}</b>
              <small>{stat === 'inscribe'
                ? `Advance to level ${(hero?.level ?? 0) + 1}, then choose one known spell to upgrade permanently; no resources are spent.`
                : stat === 'bargain'
                  ? `Advance to level ${(hero?.level ?? 0) + 1}, then inspect and choose one immediate benefit with its visible Debt.`
                  : stat in SKILLS
                  ? `Advance to level ${(hero?.level ?? 0) + 1}; permanently gain ${SKILLS[stat as keyof typeof SKILLS].name} rank ${
                    (hero?.skills[stat as keyof typeof SKILLS] ?? 0) + 1
                  }: ${SKILLS[stat as keyof typeof SKILLS].ranks[
                    ((player.heroes.find((hero) => hero.id === pending.heroId)
                      ?.skills[stat as keyof typeof SKILLS] ?? 0) + 1) as 1 | 2 | 3
                  ]}`
                  : `Advance to level ${(hero?.level ?? 0) + 1}; permanently gain +1 ${stat}. ${STAT_COPY[stat as PrimaryStat]}`}</small>
            </button>
          ))}
        </div>
        {(pending.canSkip || pending.canReroll) && (
          <div className="draft-tools">
            {pending.canReroll && (
              <button title="Replace every displayed card once; gain no level or card until the new deal is resolved."
                onClick={() => dispatch({ type: 'REROLL_LEVEL' })}>
                Reroll this deal
              </button>
            )}
            {pending.canSkip && (
              <button title={`Advance to level ${(hero?.level ?? 0) + 1} and gain 300 XP; take no displayed card.`}
                onClick={() => dispatch({ type: 'SKIP_LEVEL' })}>
                Skip for +300 XP
              </button>
            )}
          </div>
        )}
        <ChoiceCommitment detail={pending.canSkip || pending.canReroll
          ? 'choose one card, use the one-time reroll if shown, or skip if shown. There is no ordinary Cancel action.'
          : 'choose one result to continue. This choice cannot be cancelled.'} />
      </section>
    </div>
  );
}

export function PassDevice({
  player, onReady,
}: { player: Player; onReady: () => void }) {
  return (
    <div className="pass-device">
      <div className={`pass-sigil ${player.id} ${player.faction}`}><span>{player.name.slice(0, 1)}</span></div>
      <span className="dialog-kicker">Hot seat</span>
      <h1>Pass the device</h1>
      <p><b>{player.name}</b>, commanding {FACTIONS[player.faction].name}, is next.<br />The map stays hidden until they are ready.</p>
      <button className="primary" onClick={onReady}>Reveal the map</button>
    </div>
  );
}

export function BattleResult({
  result, onClose, onShare,
}: { result: BattleResultData; onClose: () => void; onShare?: () => void }) {
  const projectedWinner = result.projection?.winner === 'attacker'
    ? result.attacker.player : result.defender.player;
  return (
    <div className="modal-backdrop choice-backdrop">
      <section className={`result-dialog ${result.perspective}`}
        aria-labelledby="battle-result-heading">
        <span className="dialog-kicker">{result.encounter}</span>
        <h2 id="battle-result-heading">{result.heading}</h2>
        <div className="result-identities">
          <div><span>Attacker</span><b>{result.attacker.actor}</b>
            <small>{result.attacker.player} · {result.attacker.controller}</small></div>
          <div><span>Defender</span><b>{result.defender.actor}</b>
            <small>{result.defender.player} · {result.defender.controller}</small></div>
          <div><span>Human-controlled side</span><b>{result.humanSide}</b></div>
          <div><span>Actual winner</span><b>{result.actualWinner}</b></div>
        </div>
        <div className="result-columns">
          <div><span>Attacker losses</span><b>{result.casualties.attacker}</b></div>
          <div><span>Defender losses</span><b>{result.casualties.defender}</b></div>
          {result.xp && (
            <div><span>{result.xp.hero} experience</span><b>+{result.xp.amount}</b></div>
          )}
        </div>
        <section className="battle-consequences">
          <h3>Persistent consequences</h3>
          {result.consequences.length ? result.consequences.map((consequence, index) => (
            <div key={`${consequence.label}-${index}`}>
              <b>{consequence.label}</b><span><ResourceRichText>{consequence.detail}</ResourceRichText></span>
            </div>
          )) : <p>No additional campaign state changed.</p>}
        </section>
        {result.projection && (
          <div className="projection-result">
            <b>No-magic auto-resolve projection: {projectedWinner} ({result.projection.winner})</b>
            <span>Losses {result.projection.casualties.attacker} / {result.projection.casualties.defender}</span>
          </div>
        )}
        {result.statistics && (
          <details className="battle-statistics">
            <summary>Battle statistics · {result.statistics.stacks.length} companies</summary>
            <table><thead><tr><th>Company</th><th>Side</th><th>Damage dealt</th><th>Damage taken</th><th>Extra actions</th></tr></thead>
              <tbody>{result.statistics.stacks.filter((stack) =>
                stack.damageDealt || stack.damageTaken || stack.extraActions).map((stack) => (
                <tr key={stack.id}><td>{UNITS[stack.unitId].name}</td><td>{stack.side[0].toUpperCase() + stack.side.slice(1)}</td>
                  <td>{stack.damageDealt}</td><td>{stack.damageTaken}</td><td>{stack.extraActions}</td></tr>
              ))}</tbody></table>
            <p><b>Attacker / defender:</b> {result.statistics.spellsCast.attacker} / {result.statistics.spellsCast.defender} spells cast
              {' · '}<ResourceAmount resource="gold" amount={result.statistics.casualtyValue.attacker} compact /> / <ResourceAmount resource="gold" amount={result.statistics.casualtyValue.defender} compact /> casualty value</p>
          </details>
        )}
        <p className="result-continuation">{result.continuation.detail}</p>
        <div className="draft-tools">
          {onShare && <button onClick={onShare}>Share battle replay</button>}
          <button className="primary" onClick={onClose}>{result.continuation.label}</button>
        </div>
      </section>
    </div>
  );
}

export function VictoryDialog({
  state, onMenu,
}: { state: GameState; onMenu: () => void }) {
  const outcome = campaignOutcome(state);
  if (!state.winner || !outcome) return null;
  return (
    <div className="modal-backdrop victory-backdrop">
      <section className={`victory-dialog ${state.players[state.winner].faction} ${outcome.perspective}`}
        aria-labelledby="campaign-outcome-heading">
        <span className="dialog-kicker">{outcome.kicker}</span>
        <h1 id="campaign-outcome-heading">{outcome.heading}</h1>
        <p className="outcome-reason">{outcome.reason}</p>
        <section className="outcome-objective">
          <span>Authored objective</span><b>{outcome.objective}</b><em>{outcome.flavor}</em>
          {outcome.defeatCondition && <small>Defeat condition: {outcome.defeatCondition}</small>}
        </section>
        <div className="outcome-facts">
          <span>{outcome.actorLabel}</span><b>{outcome.actor}</b>
          {outcome.affected && <><span>{outcome.affectedLabel}</span><b>{outcome.affected}</b></>}
          <span>Outcome</span><b>{outcome.outcomeLabel}</b>
          <span>Final day</span><b>{state.day}</b><span>Battles</span><b>{state.metrics.battles}</b>
        </div>
        <details className="campaign-record">
        <summary>Final campaign record</summary>
        <table className="game-totals"><thead><tr><th>Player</th><th>Damage</th><th>Taken</th><th>Spells</th><th>Extra acts</th><th>Loss value</th></tr></thead>
          <tbody>{Object.values(state.players).filter((player) => player.heroes.length
            || player.active).map((player) => {
            const totals = state.metrics.playerTotals[player.id];
            return <tr key={player.id}><td>{player.name}</td><td>{totals.damageDealt}</td>
              <td>{totals.damageTaken}</td><td>{totals.spellsCast}</td>
              <td>{totals.extraActions}</td><td><ResourceAmount resource="gold" amount={totals.casualtyValue} compact /></td></tr>;
          })}</tbody></table>
        </details>
        <p className="outcome-next">Campaign complete · the loaded save remains unchanged.</p>
        <button className="primary" onClick={onMenu}>Return to title</button>
      </section>
    </div>
  );
}
