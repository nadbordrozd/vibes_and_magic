import type {
  Action, BattleStatistics, GameState, PlayerId, PrimaryStat,
} from '../../core/types';
import { CHEST_GOLD, CHEST_XP } from '../../content/constants';
import { SPELLS } from '../../content/spells';
import { SKILLS } from '../../content/skills';
import { itemName } from '../../content/items';
import { BARGAINS } from '../../content/bargains';
import { ARTIFACTS } from '../../content/artifacts';
import { campaignOutcome } from '../campaignOutcome';

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

export function ChoiceDialog({ state, dispatch }: ChoiceProps) {
  const pending = state.pendingChoice;
  if (!pending) return null;
  const player = state.players[pending.playerId];
  if (player.controller !== 'human') return null;
  if (pending.kind === 'siteStat') {
    return (
      <div className="modal-backdrop choice-backdrop"><section className="choice-dialog">
        <span className="dialog-kicker">The Sparring Stone</span><h2>Choose the lesson</h2>
        <p>Generations have hit this rock. The rock has learned nothing. The visitors have.</p>
        <div className="choice-cards">{pending.options.map((choice) =>
          <button key={choice} onClick={() => dispatch({ type: 'CHOOSE_SITE_STAT', choice })}>
            <i>{choice === 'attack' ? 'A' : 'D'}</i><b>+1 {choice}</b>
          </button>)}</div>
      </section></div>
    );
  }
  if (pending.kind === 'chest') {
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog chest-choice">
          <span className="dialog-kicker">Treasure claimed</span>
          <h2>Choose your reward</h2>
          <p>The old coffer holds coin and a cache of forgotten campaign journals.</p>
          <div className="choice-cards">
            <button onClick={() => dispatch({ type: 'CHOOSE_CHEST', choice: 'gold' })}>
              <i>G</i><b>{CHEST_GOLD.toLocaleString()} Gold</b><small>Fund buildings and fresh recruits.</small>
            </button>
            <button onClick={() => dispatch({ type: 'CHOOSE_CHEST', choice: 'xp' })}>
              <i>✦</i><b>{CHEST_XP.toLocaleString()} Experience</b><small>Advance your hero’s build.</small>
            </button>
            <button
              data-inspect-kind={pending.artifact ? 'artifact' : 'item'}
              data-inspect-id={pending.artifact?.id ?? pending.item.id}
              disabled={!player.heroes.find((hero) => hero.id === pending.heroId)
                ?.inventory.includes(null)}
              onClick={() => dispatch({ type: 'CHOOSE_CHEST', choice: 'item' })}
            >
              <i>◇</i><b>{pending.artifact
                ? ARTIFACTS[pending.artifact.id].name : itemName(pending.item)}</b>
              <small>{pending.artifact
                ? 'A rare artifact found where no shop could stock it.'
                : 'Take this campaign trick for later.'}</small>
            </button>
          </div>
        </section>
      </div>
    );
  }
  if (pending.kind === 'diplomacy') {
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog">
          <span className="dialog-kicker">Diplomacy</span>
          <h2>The guardians will bargain</h2>
          <div className="choice-cards three">
            <button onClick={() => dispatch({ type: 'CHOOSE_DIPLOMACY', choice: 'fight' })}>
              <i>⚔</i><b>Fight</b><small>Keep your gold and settle it in battle.</small>
            </button>
            <button
              disabled={player.resources.gold < pending.disbandCost}
              onClick={() => dispatch({ type: 'CHOOSE_DIPLOMACY', choice: 'disband' })}
            >
              <i>G</i><b>Pay {pending.disbandCost.toLocaleString()}g</b>
              <small>The guardians disband.</small>
            </button>
            {pending.recruitCost !== null && (
              <button
                disabled={player.resources.gold < pending.recruitCost}
                onClick={() => dispatch({ type: 'CHOOSE_DIPLOMACY', choice: 'recruit' })}
              >
                <i>+</i><b>Recruit · {pending.recruitCost.toLocaleString()}g</b>
                <small>The guardians join this army.</small>
              </button>
            )}
            {pending.canStandAside && (
              <button
                disabled={player.resources.gold < pending.disbandCost}
                onClick={() => dispatch({
                  type: 'CHOOSE_DIPLOMACY', choice: 'standAside',
                })}
              >
                <i>↔</i><b>Stand aside · {pending.disbandCost.toLocaleString()}g</b>
                <small>They remain, but this hero may pass.</small>
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }
  if (pending.kind === 'spellthief') {
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog spell-choice">
          <span className="dialog-kicker">Spellthief</span>
          <h2>Steal one defeated rival spell</h2>
          <div className="choice-cards three">
            {pending.options.map((spellId) => (
              <button
                key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}
                onClick={() => dispatch({ type: 'CHOOSE_STOLEN_SPELL', spellId })}
              >
                <i>✦</i><b>{SPELLS[spellId].name}</b>
                <small>{SPELLS[spellId].base}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }
  if (pending.kind === 'palimpsest') {
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog spell-choice">
          <span className="dialog-kicker">Palimpsest</span>
          <h2>Keep one spell from beneath the old text</h2>
          <div className="choice-cards three">
            {pending.options.map((spellId) => (
              <button
                key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}
                onClick={() => dispatch({ type: 'CHOOSE_PALIMPSEST', spellId })}
              >
                <i>⌘</i><b>{SPELLS[spellId].name}</b>
                <small>{SPELLS[spellId].base}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }
  if (pending.kind === 'bargain') {
    const hero = player.heroes.find((candidate) => candidate.id === pending.heroId)!;
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog bargain-choice">
          <span className="dialog-kicker">A benefit now. A Debt later.</span>
          <h2>Choose one bargain</h2>
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
              const castle = bargainId === 'cuckoosDeal'
                ? state.castles.find((candidate) => candidate.owner !== hero.owner)
                : state.castles.find((candidate) => candidate.owner === hero.owner
                  && candidate.position.x === hero.position.x
                  && candidate.position.y === hero.position.y);
              return (
                <button
                  key={bargainId}
                  disabled={(bargainId === 'cuckoosDeal' || bargainId === 'whatWasPromised')
                    && !castle}
                  onClick={() => dispatch({
                    type: 'CHOOSE_BARGAIN', bargainId, castleId: castle?.id,
                  })}
                >
                  <i>☾</i><b>{bargain.name}</b>
                  <small>{bargain.benefit}</small><em>Debt: {bargain.debt}{zimaTerm ? ` ${zimaTerm}` : ''}</em>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }
  if (pending.kind === 'toll') {
    return (
      <div className="modal-backdrop choice-backdrop"><section className="choice-dialog">
        <span className="dialog-kicker">Toll Gate</span><h2>Coin or combat</h2>
        <div className="choice-cards">
          <button disabled={player.resources.gold < pending.cost}
            onClick={() => dispatch({ type: 'CHOOSE_TOLL', choice: 'pay' })}>
            <i>G</i><b>Pay {pending.cost} gold</b><small>Pass once without bloodshed.</small>
          </button>
          <button onClick={() => dispatch({ type: 'CHOOSE_TOLL', choice: 'fight' })}>
            <i>⚔</i><b>Fight the Keeper</b><small>Break this Toll Gate permanently.</small>
          </button>
        </div>
      </section></div>
    );
  }
  if (pending.kind === 'siren') {
    return (
      <div className="modal-backdrop choice-backdrop"><section className="choice-dialog">
        <span className="dialog-kicker">Siren Rocks</span><h2>The song is about you</h2>
        <p>Specifically. Flatteringly. The oars have begun to hesitate.</p>
        <div className="choice-cards">
          <button onClick={() => dispatch({ type: 'CHOOSE_SIREN', choice: 'listen' })}>
            <i>♪</i><b>Listen</b><small>Fight the Sirens and claim their hoard.</small>
          </button>
          <button onClick={() => dispatch({ type: 'CHOOSE_SIREN', choice: 'rowPast' })}>
            <i>↝</i><b>Row past</b><small>Lose 300 movement.</small>
          </button>
        </div>
      </section></div>
    );
  }
  if (pending.kind === 'shrine' || pending.kind === 'inscribe') {
    return (
      <div className="modal-backdrop choice-backdrop">
        <section className="choice-dialog spell-choice">
          <span className="dialog-kicker">
            {pending.kind === 'shrine' ? 'Shrine inscription' : 'Rare inscription'}
          </span>
          <h2>Upgrade one known spell</h2>
          <div className="choice-cards three">
            {pending.options.map((spellId) => (
              <button
                key={spellId}
                data-inspect-kind="spell" data-inspect-id={spellId}
                onClick={() => dispatch({ type: 'CHOOSE_SPELL_UPGRADE', spellId })}
              >
                <i>✦</i><b>{SPELLS[spellId].name}+</b>
                <small>{SPELLS[spellId].plus}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="modal-backdrop choice-backdrop">
      <section className="choice-dialog level-choice">
        <span className="dialog-kicker">Level {
          player.heroes.find((hero) => hero.id === pending.heroId)?.level
            ? player.heroes.find((hero) => hero.id === pending.heroId)!.level + 1 : ''
        }</span>
        <h2>Choose your path</h2>
        <p>One lesson endures. The other possibilities are lost to this campaign.</p>
        <div className="choice-cards three">
          {pending.options.map((stat) => (
            <button key={stat} onClick={() => dispatch({ type: 'CHOOSE_LEVEL', stat })}
              data-inspect-kind={stat in SKILLS ? 'skill' : undefined}
              data-inspect-id={stat in SKILLS ? stat : undefined}>
              <i>{stat === 'inscribe' ? '✦' : stat === 'bargain' ? '☾' : stat.slice(0, 1).toUpperCase()}</i>
              <b>{stat === 'inscribe' ? 'Inscribe a spell'
                : stat === 'bargain' ? 'Take a bargain'
                : stat in SKILLS
                  ? `${SKILLS[stat as keyof typeof SKILLS].name} · Rank ${
                    (player.heroes.find((hero) => hero.id === pending.heroId)
                      ?.skills[stat as keyof typeof SKILLS] ?? 0) + 1
                  }`
                  : `+1 ${stat.replace(/([A-Z])/g, ' $1')}`}</b>
              <small>{stat === 'inscribe'
                ? 'Permanently unlock a known spell’s + face.'
                : stat === 'bargain'
                  ? 'Choose an immediate benefit and accept its visible Debt.'
                : stat in SKILLS
                  ? SKILLS[stat as keyof typeof SKILLS].ranks[
                    ((player.heroes.find((hero) => hero.id === pending.heroId)
                      ?.skills[stat as keyof typeof SKILLS] ?? 0) + 1) as 1 | 2 | 3
                  ]
                  : STAT_COPY[stat as PrimaryStat]}</small>
            </button>
          ))}
        </div>
        {(pending.canSkip || pending.canReroll) && (
          <div className="draft-tools">
            {pending.canReroll && (
              <button onClick={() => dispatch({ type: 'REROLL_LEVEL' })}>
                Reroll this deal
              </button>
            )}
            {pending.canSkip && (
              <button onClick={() => dispatch({ type: 'SKIP_LEVEL' })}>
                Skip for +300 XP
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export function PassDevice({
  playerId, onReady,
}: { playerId: PlayerId; onReady: () => void }) {
  return (
    <div className="pass-device">
      <div className={`pass-sigil ${playerId}`}><span>{playerId.slice(1)}</span></div>
      <span className="dialog-kicker">Hot seat</span>
      <h1>Pass the device</h1>
      <p>Player {playerId.slice(1)}, your turn is ready.</p>
      <button className="primary" onClick={onReady}>Reveal the map</button>
    </div>
  );
}

export interface BattleResultData {
  winner: 'attacker' | 'defender';
  casualties: {
    attacker: number;
    defender: number;
  };
  xp: number;
  recovered: number;
  statistics: BattleStatistics | null;
  projection: {
    targetId: string;
    winner: 'attacker' | 'defender';
    casualties: { attacker: number; defender: number };
  } | null;
}

export function BattleResult({
  result, onClose, onShare,
}: { result: BattleResultData; onClose: () => void; onShare?: () => void }) {
  return (
    <div className="modal-backdrop choice-backdrop">
      <section className="result-dialog">
        <span className="dialog-kicker">Battle concluded</span>
        <h2>{result.winner === 'attacker' ? 'Victory' : 'Defeat'}</h2>
        <div className="result-columns">
          <div><span>Attacker losses</span><b>{result.casualties.attacker}</b></div>
          <div><span>Defender losses</span><b>{result.casualties.defender}</b></div>
          <div><span>Experience</span><b>+{result.xp}</b></div>
          {result.recovered > 0 && (
            <div><span>Spare parts recovered</span><b>+{result.recovered}</b></div>
          )}
        </div>
        {result.projection && (
          <div className="projection-result">
            <b>No-magic auto-resolve projection: {result.projection.winner}</b>
            <span>Losses {result.projection.casualties.attacker} / {result.projection.casualties.defender}</span>
          </div>
        )}
        {result.statistics && (
          <div className="battle-statistics">
            <h3>Battle statistics</h3>
            <table><thead><tr><th>Company</th><th>Side</th><th>Dealt</th><th>Taken</th><th>Extra acts</th></tr></thead>
              <tbody>{result.statistics.stacks.filter((stack) =>
                stack.damageDealt || stack.damageTaken || stack.extraActions).map((stack) => (
                <tr key={stack.id}><td>{stack.unitId}</td><td>{stack.side}</td>
                  <td>{stack.damageDealt}</td><td>{stack.damageTaken}</td><td>{stack.extraActions}</td></tr>
              ))}</tbody></table>
            <p>Spells: {result.statistics.spellsCast.attacker} / {result.statistics.spellsCast.defender}
              {' · '}Casualty value: {result.statistics.casualtyValue.attacker.toLocaleString()}g / {result.statistics.casualtyValue.defender.toLocaleString()}g</p>
          </div>
        )}
        <div className="draft-tools">
          {onShare && <button onClick={onShare}>Share battle replay</button>}
          <button className="primary" onClick={onClose}>Continue</button>
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
        <h2>Final campaign record</h2>
        <table className="game-totals"><thead><tr><th>Player</th><th>Damage</th><th>Taken</th><th>Spells</th><th>Extra acts</th><th>Loss value</th></tr></thead>
          <tbody>{Object.values(state.players).filter((player) => player.heroes.length
            || player.active).map((player) => {
            const totals = state.metrics.playerTotals[player.id];
            return <tr key={player.id}><td>{player.name}</td><td>{totals.damageDealt}</td>
              <td>{totals.damageTaken}</td><td>{totals.spellsCast}</td>
              <td>{totals.extraActions}</td><td>{totals.casualtyValue.toLocaleString()}g</td></tr>;
          })}</tbody></table>
        <p className="outcome-next">This concluded state and its statistics remain authoritative
          for the loaded save or replay. Open Help to revisit the objective and reference, or
          return to the title to start or load another campaign.</p>
        <button className="primary" onClick={onMenu}>Return to title</button>
      </section>
    </div>
  );
}
