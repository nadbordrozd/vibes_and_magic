import type {
  Action, GameState, PlayerId, PrimaryStat,
} from '../../core/types';
import { CHEST_GOLD, CHEST_XP } from '../../content/constants';
import { SPELLS } from '../../content/spells';
import { SKILLS } from '../../content/skills';

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
        <span className="dialog-kicker">Level {
          player.heroes.find((hero) => hero.id === pending.heroId)?.level
            ? player.heroes.find((hero) => hero.id === pending.heroId)!.level + 1 : ''
        }</span>
        <h2>Choose your path</h2>
        <p>One lesson endures. The other possibilities are lost to this campaign.</p>
        <div className="choice-cards three">
          {pending.options.map((stat) => (
            <button key={stat} onClick={() => dispatch({ type: 'CHOOSE_LEVEL', stat })}>
              <i>{stat === 'inscribe' ? '✦' : stat.slice(0, 1).toUpperCase()}</i>
              <b>{stat === 'inscribe' ? 'Inscribe a spell'
                : stat in SKILLS
                  ? `${SKILLS[stat as keyof typeof SKILLS].name} · Rank ${
                    (player.heroes.find((hero) => hero.id === pending.heroId)
                      ?.skills[stat as keyof typeof SKILLS] ?? 0) + 1
                  }`
                  : `+1 ${stat.replace(/([A-Z])/g, ' $1')}`}</b>
              <small>{stat === 'inscribe'
                ? 'Permanently unlock a known spell’s + face.'
                : stat in SKILLS
                  ? SKILLS[stat as keyof typeof SKILLS].ranks[
                    ((player.heroes.find((hero) => hero.id === pending.heroId)
                      ?.skills[stat as keyof typeof SKILLS] ?? 0) + 1) as 1 | 2
                  ]
                  : STAT_COPY[stat as PrimaryStat]}</small>
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
