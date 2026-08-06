import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { autoResolveBattle, chooseCombatAction } from '../ai/combat';
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
import { InspectionLayer } from './components/InspectionLayer';
import { ContextHelp, type HelpContext } from './components/ContextHelp';
import { ResourceRichText } from './components/ResourceToken';
import {
  autoSaveGame, createBattleReplayLink, createGameLink, exportSaveFile, importSaveFile,
  loadBattleReplayLink, loadGame, loadGameLink, saveGame, savedGameSummary,
  type SaveSlot, type SaveSummary,
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
  const [manualSummaries, setManualSummaries] = useState<Array<SaveSummary | null>>(
    () => [1, 2, 3].map((slot) => savedGameSummary(undefined, slot)),
  );
  const [autoSummaries, setAutoSummaries] = useState<Array<SaveSummary | null>>(
    () => [0, 1, 2].map((slot) => savedGameSummary(undefined, `auto-${slot}`)),
  );
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('fast');
  const [mapAnimating, setMapAnimating] = useState(false);
  const [battleReplay, setBattleReplay] = useState<{
    actions: Action[]; index: number; playing: boolean;
  } | null>(null);
  const projectionRef = useRef<BattleResultData['projection']>(null);
  const lastMessageRef = useRef('');
  const noticeTimerRef = useRef<number | null>(null);

  const announce = useCallback((message: string, duration = 2400) => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(''); noticeTimerRef.current = null;
    }, duration);
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!game) { lastMessageRef.current = ''; return; }
    if (!lastMessageRef.current) { lastMessageRef.current = game.lastMessage; return; }
    if (game.lastMessage !== lastMessageRef.current) {
      lastMessageRef.current = game.lastMessage;
      if (game.phase !== 'combat') announce(game.lastMessage);
    }
  }, [announce, game]);

  useEffect(() => {
    if (!location.hash.match(/^#(?:game|battle)=/)) return;
    if (location.hash.startsWith('#battle=')) {
      loadBattleReplayLink(location.hash).then((replay) => {
        setGame(replay.state);
        setBattleReplay({ actions: replay.actions, index: 0, playing: false });
      }).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    } else {
      loadGameLink(location.hash).then(setGame).catch((caught) =>
        setError(caught instanceof Error ? caught.message : String(caught)));
    }
  }, []);

  useEffect(() => {
    if (!game?.battle || projectionRef.current?.targetId === game.battle.context.targetId) return;
    const projected = JSON.parse(JSON.stringify(game.battle)) as NonNullable<GameState['battle']>;
    projected.attackerHero.knownSpells = [];
    if (projected.defenderHero) projected.defenderHero.knownSpells = [];
    const result = autoResolveBattle(projected);
    projectionRef.current = {
      targetId: projected.context.targetId,
      winner: result.winner!,
      casualties: {
        attacker: casualtyCount(result.casualties.attacker),
        defender: casualtyCount(result.casualties.defender),
      },
    };
  }, [game?.battle?.context.targetId]);

  const save = (slot?: number) => {
    if (!game) return;
    const summary = saveGame(game, undefined, slot ?? 'primary');
    if (summary) {
      if (slot === undefined) setSavedSummary(summary);
      else setManualSummaries((current) => current.map((value, index) =>
        index === slot - 1 ? summary : value));
      announce(slot === undefined ? 'Game saved locally.' : `Game saved in slot ${slot}.`, 1800);
    } else {
      setError('Local saves are unavailable in this browser.');
    }
  };

  const loadSavedState = (slot?: SaveSlot) => {
    const saved = loadGame(undefined, slot ?? 'primary');
    if (!saved) {
      setError('The saved game could not be loaded. It remains untouched; dismiss this message and choose another slot.');
      return;
    }
    setGame(saved);
    setOpenCastleId(null);
    setBattleResult(null);
    setPassPlayer(null);
  };

  const exportFile = () => {
    if (!game) return;
    const url = URL.createObjectURL(new Blob([exportSaveFile(game)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${game.map.id}-day-${game.day}.vam-save.json`;
    anchor.click(); URL.revokeObjectURL(url);
  };

  const importFile = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      try {
        const file = input.files?.[0]; if (!file) return;
        setGame(importSaveFile(await file.text())); setBattleReplay(null); setError('');
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(`${message}. No campaign was changed; dismiss this message and choose another file.`);
      }
    };
    input.click();
  };

  const shareLink = async (battle = false) => {
    if (!game) return;
    try {
      const result = battle ? await createBattleReplayLink(game) : await createGameLink(game);
      const link = `${location.origin}${location.pathname}${result.fragment}`;
      await navigator.clipboard.writeText(link);
      announce(result.warning ?? `${battle ? 'Battle replay' : 'Game'} link copied.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  };

  const commitAction = useCallback((action: Action) => {
    setGame((current) => {
      if (!current) return current;
      try {
        const priorBattle = current.battle;
        const attackerId = priorBattle?.context.attackerHeroId;
        const xpBefore = attackerId
          ? current.players[current.activePlayer].heroes.find(
            (hero) => hero.id === attackerId,
          )?.xp ?? 0 : 0;
        const next = apply(current, action);
        if (action.type === 'END_TURN') autoSaveGame(next);
        if (priorBattle && !next.battle && priorBattle.winner === null) {
          const resolved = action.type === 'AUTO_COMBAT'
            ? next.metrics.battles > current.metrics.battles : true;
          if (resolved) {
            const finalWinner = next.metrics.battleOutcomes.at(-1)?.winner ?? 'defender';
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
              xp: Math.max(0, (attackerId
                ? next.players[current.activePlayer].heroes.find(
                  (hero) => hero.id === attackerId,
                )?.xp ?? xpBefore : xpBefore) - xpBefore),
              recovered: casualtyCount(next.lastBattleRecovered),
              statistics: next.lastBattleStats,
              projection: projectionRef.current,
            }));
            projectionRef.current = null;
          }
        }
        if (action.type === 'END_TURN'
            && current.players[current.activePlayer].controller === 'human'
            && next.players[next.activePlayer].controller === 'human') {
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
    setBattleReplay(null);
    projectionRef.current = null;
  };

  const load = (slot?: SaveSlot) => {
    cancelAnimations();
    setMapAnimating(false);
    projectionRef.current = null;
    setBattleReplay(null);
    loadSavedState(slot);
  };

  const returnToMenu = () => {
    setGame(null);
    setSavedSummary(savedGameSummary());
    setManualSummaries([1, 2, 3].map((slot) => savedGameSummary(undefined, slot)));
    setAutoSummaries([0, 1, 2].map((slot) => savedGameSummary(undefined, `auto-${slot}`)));
  };

  useEffect(() => {
    if (!game || battleReplay || game.phase === 'gameOver' || passPlayer
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
      const timer = setTimeout(() => setGame((state) => {
        if (!state) return state;
        const next = runStrategyTurn(state);
        if (next.activePlayer !== state.activePlayer || next.day !== state.day) autoSaveGame(next);
        return next;
      }), 220);
      return () => clearTimeout(timer);
    }
    if (game.phase === 'adventure' && activePlayer.controller === 'dormant') {
      const timer = setTimeout(() => setGame((state) => state
        ? apply(state, { type: 'END_TURN' }) : state), 120);
      return () => clearTimeout(timer);
    }
    if (game.phase === 'combat' && game.battle) {
      const stack = game.battle.pendingFreeMove
        ? game.battle.stacks.find((candidate) =>
          candidate.count > 0 && candidate.side === game.battle!.pendingFreeMove!.side) ?? null
        : activeBattleStack(game.battle);
      if (stack && battleStackController(game, stack) === 'ai') {
        const timer = setTimeout(() => dispatch(chooseCombatAction(game.battle!)), 180);
        return () => clearTimeout(timer);
      }
    }
  }, [game, battleReplay, passPlayer, battleResult, combatAnimation, dispatch]);

  const stepBattleReplay = useCallback(() => {
    if (!battleReplay || battleReplay.index >= battleReplay.actions.length) return;
    commitAction(battleReplay.actions[battleReplay.index]);
    setBattleReplay((current) => current ? {
      ...current, index: current.index + 1,
      playing: current.index + 1 < current.actions.length && current.playing,
    } : null);
  }, [battleReplay, commitAction]);

  useEffect(() => {
    if (!battleReplay?.playing || battleResult || combatAnimation) return;
    if (battleReplay.index >= battleReplay.actions.length) {
      setBattleReplay((current) => current ? { ...current, playing: false } : null);
      return;
    }
    const timer = setTimeout(stepBattleReplay, 450);
    return () => clearTimeout(timer);
  }, [battleReplay, battleResult, combatAnimation, stepBattleReplay]);

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
      if (battleReplay || passPlayer || battleResult || game.pendingChoice) return;
      if (event.key === 'Enter' && openCastleId) setOpenCastleId(null);
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [
    game, battleReplay, passPlayer, battleResult, openCastleId,
    combatAnimation, mapAnimating, dispatch,
  ]);

  if (!game) {
    return <><MainMenu onStart={start} savedGame={savedSummary}
      manualSaves={manualSummaries} autoSaves={autoSummaries} onLoad={load}
      onImport={importFile} /><ContextHelp state={null} context="menu" />
      {error && <button className="error-toast" role="alert"
        onClick={() => setError('')}>{error} · Dismiss ×</button>}</>;
  }
  if (passPlayer) return <><PassDevice player={game.players[passPlayer]}
    onReady={() => setPassPlayer(null)} /><ContextHelp state={game} context="adventure" /></>;

  const castle = game.castles.find((item) => item.id === openCastleId) ?? null;
  const battleStack = game.battle?.pendingFreeMove
    ? game.battle.stacks.find((candidate) =>
      candidate.count > 0 && candidate.side === game.battle!.pendingFreeMove!.side) ?? null
    : game.battle ? activeBattleStack(game.battle) : null;
  const humanControl = Boolean(
    !battleReplay && battleStack && battleStackController(game, battleStack) === 'human',
  );
  const helpContext: HelpContext = game.phase === 'gameOver' ? 'campaign'
    : battleResult ? 'result'
    : game.pendingChoice ? 'choice'
      : openCastleId ? 'castle'
        : game.phase === 'combat' ? 'combat' : 'adventure';

  return (
    <>
      {game.phase === 'combat' && game.battle
        ? (
          <CombatScreen
            state={game} dispatch={dispatch}
            humanControl={humanControl && !combatAnimation}
            onSave={save}
            onShare={() => { void shareLink(true); }}
            animation={combatAnimation}
            animationSpeed={animationSpeed}
            onAnimationSpeedChange={setAnimationSpeed}
            replay={battleReplay ? {
              index: battleReplay.index, total: battleReplay.actions.length,
              playing: battleReplay.playing,
              onStep: stepBattleReplay,
              onToggle: () => setBattleReplay((current) => current ? {
                ...current, playing: !current.playing,
              } : null),
            } : undefined}
          />
        )
        : (
          <AdventureScreen
            state={game}
            dispatch={dispatch}
            onOpenCastle={setOpenCastleId}
            onMenu={returnToMenu}
            onSave={save}
            onExport={exportFile} onImport={importFile}
            onShare={() => { void shareLink(false); }}
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
        <BattleResult result={battleResult} onClose={() => setBattleResult(null)}
          onShare={() => { void shareLink(true); }} />
      )}
      {!battleResult && <VictoryDialog state={game} onMenu={returnToMenu} />}
      {error && <button className="error-toast" role="alert" onClick={() => setError('')}>{error} ×</button>}
      {notice && <div className="notice-toast" role="status" aria-live="polite"><ResourceRichText>{notice}</ResourceRichText></div>}
      {!battleResult && !game.winner && <InspectionLayer state={game} />}
      <ContextHelp state={game} context={helpContext} />
    </>
  );
}
