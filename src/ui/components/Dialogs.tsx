import type {
  Action, GameState, PlayerId, PrimaryStat,
} from '../../core/types';
import { CHEST_GOLD, CHEST_XP } from '../../content/constants';
import { SPELLS } from '../../content/spells';

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
          </div>
        </section>
      </div>
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
        <span className="dialog-kicker">Level {player.hero?.level ? player.hero.level + 1 : ''}</span>
        <h2>Choose your path</h2>
        <p>One lesson endures. The other possibilities are lost to this campaign.</p>
        <div className="choice-cards three">
          {pending.options.map((stat) => (
            <button key={stat} onClick={() => dispatch({ type: 'CHOOSE_LEVEL', stat })}>
              <i>{stat === 'inscribe' ? '✦' : stat.slice(0, 1).toUpperCase()}</i>
              <b>{stat === 'inscribe' ? 'Inscribe a spell' : `+1 ${stat.replace(/([A-Z])/g, ' $1')}`}</b>
              <small>{stat === 'inscribe'
                ? 'Permanently unlock a known spell’s + face.'
                : STAT_COPY[stat]}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PassDevice({
  playerId, onReady,
}: { playerId: PlayerId; onReady: () => void }) {
  return (
    <div className="pass-device">
      <div className={`pass-sigil ${playerId}`}><span>{playerId === 'p1' ? 'H' : 'W'}</span></div>
      <span className="dialog-kicker">Hot seat</span>
      <h1>Pass the device</h1>
      <p>{playerId === 'p1' ? 'Player 1 · Hearthguard' : 'Player 2 · Wound-Wrights'}, your turn is ready.</p>
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
  projection: {
    targetId: string;
    winner: 'attacker' | 'defender';
    casualties: { attacker: number; defender: number };
  } | null;
}

export function BattleResult({
  result, onClose,
}: { result: BattleResultData; onClose: () => void }) {
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
        <button className="primary" onClick={onClose}>Continue</button>
      </section>
    </div>
  );
}

export function VictoryDialog({
  state, onMenu,
}: { state: GameState; onMenu: () => void }) {
  if (!state.winner) return null;
  return (
    <div className="modal-backdrop victory-backdrop">
      <section className={`victory-dialog ${state.players[state.winner].faction}`}>
        <span className="dialog-kicker">Campaign complete</span>
        <h1>{state.players[state.winner].name}<br />is victorious</h1>
        <p>The rival banner falls. The Border Marches answer to one throne.</p>
        <div><span>Days</span><b>{state.day}</b><span>Battles</span><b>{state.metrics.battles}</b></div>
        <button className="primary" onClick={onMenu}>Return to title</button>
      </section>
    </div>
  );
}
