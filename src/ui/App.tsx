import { useCallback, useEffect, useState } from 'react';
import { chooseCombatAction } from '../ai/combat';
import { runStrategyTurn } from '../ai/strategy';
import { activeBattleStack } from '../core/combat/battle';
import { apply, applyAutomaticChoice, createGame } from '../core/game';
import {
  battleStackController,
} from '../core/selectors';
import type {
  Action, GameState, NewGameOptions, PlayerId,
} from '../core/types';
import { AdventureScreen } from './components/AdventureScreen';
import { CastleScreen } from './components/CastleScreen';
import { CombatScreen } from './components/CombatScreen';
import {
  BattleResult, type BattleResultData, ChoiceDialog, PassDevice, VictoryDialog,
} from './components/Dialogs';
import { MainMenu } from './components/MainMenu';
import {
  loadGame, saveGame, savedGameSummary, type SaveSummary,
} from './persistence';
import {
  type AnimationSpeed,
} from './animation';
import { useAnimatedDispatch } from './hooks/useAnimatedDispatch';

function casualtyCount(losses: Record<string, number | undefined>): number {
  let total = 0;
  for (const count of Object.values(losses)) total += count ?? 0;
  return total;
}

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [openCastleId, setOpenCastleId] = useState<string | null>(null);
  const [passPlayer, setPassPlayer] = useState<PlayerId | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResultData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savedSummary, setSavedSummary] = useState<SaveSummary | null>(
    () => savedGameSummary(),
  );
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('fast');
  const [mapAnimating, setMapAnimating] = useState(false);

  const save = () => {
    if (!game) return;
    const summary = saveGame(game);
    if (summary) {
      setSavedSummary(summary);
      setNotice('Game saved locally.');
      setTimeout(() => setNotice(''), 1800);
    } else {
      setError('Local saves are unavailable in this browser.');
    }
  };

  const loadSavedState = () => {
    const saved = loadGame();
    if (!saved) {
      setError('The saved game could not be loaded.');
      return;
    }
    setGame(saved);
    setOpenCastleId(null);
    setBattleResult(null);
    setPassPlayer(null);
  };

  const commitAction = useCallback((action: Action) => {
    setGame((current) => {
      if (!current) return current;
      try {
        const priorBattle = current.battle;
        const xpBefore = current.players[current.activePlayer].hero?.xp ?? 0;
        const next = apply(current, action);
        if (priorBattle && !next.battle && priorBattle.winner === null) {
          const resolved = action.type === 'AUTO_COMBAT'
            ? next.metrics.battles > current.metrics.battles : true;
          if (resolved) {
            const finalWinner = next.players[current.activePlayer].hero
              ? 'attacker' : 'defender';
            const defenderMetric = priorBattle.context.kind === 'guardian'
              ? 'neutral' : priorBattle.context.defenderPlayerId;
            queueMicrotask(() => setBattleResult({
              winner: finalWinner,
              casualties: {
                attacker: next.metrics.casualties[current.activePlayer]
                  - current.metrics.casualties[current.activePlayer],
                defender: defenderMetric
                  ? next.metrics.casualties[defenderMetric]
                    - current.metrics.casualties[defenderMetric]
                  : casualtyCount(priorBattle.casualties.defender),
              },
              xp: Math.max(0, (next.players[current.activePlayer].hero?.xp ?? xpBefore) - xpBefore),
            }));
          }
        }
        if (action.type === 'END_TURN'
            && current.players.p1.controller === 'human'
            && current.players.p2.controller === 'human') {
          queueMicrotask(() => setPassPlayer(next.activePlayer));
        }
        setError('');
        return next;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        return current;
      }
    });
  }, []);

  const {
    animation: combatAnimation,
    cancel: cancelAnimations,
    dispatch,
  } = useAnimatedDispatch(game, animationSpeed, commitAction);

  const start = (options: NewGameOptions) => {
    cancelAnimations();
    setMapAnimating(false);
    setGame(createGame(options));
    setOpenCastleId(null);
    setBattleResult(null);
  };

  const load = () => {
    cancelAnimations();
    setMapAnimating(false);
    loadSavedState();
  };

  useEffect(() => {
    if (!game || game.phase === 'gameOver' || passPlayer
        || battleResult || combatAnimation) return;
    const activePlayer = game.players[game.activePlayer];
    if (game.pendingChoice) {
      const chooser = game.players[game.pendingChoice.playerId];
      if (chooser.controller === 'ai') {
        const timer = setTimeout(() => setGame((state) =>
          state ? applyAutomaticChoice(state) : state), 120);
        return () => clearTimeout(timer);
      }
      return;
    }
    if (game.phase === 'adventure' && activePlayer.controller === 'ai') {
      const timer = setTimeout(() => setGame((state) =>
        state ? runStrategyTurn(state) : state), 220);
      return () => clearTimeout(timer);
    }
    if (game.phase === 'combat' && game.battle) {
      const stack = activeBattleStack(game.battle);
      if (stack && battleStackController(game, stack) === 'ai') {
        const timer = setTimeout(() => dispatch(chooseCombatAction(game.battle!)), 180);
        return () => clearTimeout(timer);
      }
    }
  }, [game, passPlayer, battleResult, combatAnimation, dispatch]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!game || combatAnimation || mapAnimating) return;
      if (event.key === 'Enter' && passPlayer) {
        setPassPlayer(null);
        return;
      }
      if (event.key === 'Enter' && battleResult) {
        setBattleResult(null);
        return;
      }
      if (event.key === 'Enter' && game.pendingChoice) {
        const choice = game.pendingChoice;
        if (choice.kind === 'chest') dispatch({ type: 'CHOOSE_CHEST', choice: 'gold' });
        else dispatch({ type: 'CHOOSE_LEVEL', stat: choice.options[0] });
        return;
      }
      if (passPlayer || battleResult || game.pendingChoice) return;
      if (event.code === 'Space' && game.phase === 'adventure'
          && game.players[game.activePlayer].controller === 'human') {
        event.preventDefault();
        dispatch({ type: 'END_TURN' });
      }
      if (event.key === 'Enter' && openCastleId) setOpenCastleId(null);
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [
    game, passPlayer, battleResult, openCastleId,
    combatAnimation, mapAnimating, dispatch,
  ]);

  if (!game) {
    return <MainMenu onStart={start} savedGame={savedSummary} onLoad={load} />;
  }
  if (passPlayer) return <PassDevice playerId={passPlayer} onReady={() => setPassPlayer(null)} />;

  const castle = game.castles.find((item) => item.id === openCastleId) ?? null;
  const battleStack = game.battle ? activeBattleStack(game.battle) : null;
  const humanControl = Boolean(
    battleStack && battleStackController(game, battleStack) === 'human',
  );

  return (
    <>
      {game.phase === 'combat' && game.battle
        ? (
          <CombatScreen
            state={game} dispatch={dispatch}
            humanControl={humanControl && !combatAnimation}
            onSave={save}
            animation={combatAnimation}
            animationSpeed={animationSpeed}
            onAnimationSpeedChange={setAnimationSpeed}
          />
        )
        : (
          <AdventureScreen
            state={game}
            dispatch={dispatch}
            onOpenCastle={setOpenCastleId}
            onMenu={() => setGame(null)}
            onSave={save}
            animationSpeed={animationSpeed}
            onAnimationSpeedChange={setAnimationSpeed}
            onMovementStateChange={setMapAnimating}
          />
        )}
      {openCastleId && castle && (
        <CastleScreen
          state={game} castle={castle} dispatch={dispatch}
          onClose={() => setOpenCastleId(null)}
        />
      )}
      {!battleResult && <ChoiceDialog state={game} dispatch={dispatch} />}
      {battleResult && (
        <BattleResult result={battleResult} onClose={() => setBattleResult(null)} />
      )}
      {!battleResult && <VictoryDialog state={game} onMenu={() => setGame(null)} />}
      {error && <button className="error-toast" onClick={() => setError('')}>{error} ×</button>}
      {notice && <div className="notice-toast">{notice}</div>}
    </>
  );
}
