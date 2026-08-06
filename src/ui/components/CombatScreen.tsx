import { useEffect, useState, type CSSProperties } from 'react';
import { UNITS } from '../../content/units';
import { SPELLS } from '../../content/spells';
import { HEROES } from '../../content/heroes';
import {
  activeBattleStack, estimateDamageRange, surrenderCost,
} from '../../core/combat/battle';
import { activeBattleOptions } from '../../core/selectors';
import type {
  Action, BattleStack, Coord, GameState, SpellId, UnitId,
} from '../../core/types';
import type {
  AnimationSpeed, CombatAnimation,
} from '../animation';
import { CombatUnitPanel } from './CombatUnitPanel';
import { SpellbookPanel } from './SpellbookPanel';
import {
  effectiveResonances, legalSpellCasts,
} from '../../core/combat/spells';
import { legalCombatItemUses } from '../../core/combat/items';
import { ITEMS, itemName } from '../../content/items';
import { ResourceAmount } from './ResourceToken';
import { stackHexes, stackContains } from '../../core/combat/footprint';
import { canUseRanged } from '../../core/combat/damage';
import { PixelSprite, battleUnitSpriteId } from '../assets';
import { BATTLE_COLS, BATTLE_ROWS, MORALE_THRESHOLD } from '../../content/constants';
import {
  backCombatTarget, beginItemTargeting, beginSpellTargeting,
  chooseCombatTarget, combatTargetChoices, combatTargetConsequence,
  combatTargetCost, combatTargetFace, combatTargetName, combatTargetStackIds,
  combatTargetStage, combatTargetStagePrompt, confirmedCombatTargetAction,
  effectTargetLabel, legalCombatPlacements, requiredCombatPositions,
  toggleCombatPosition, type CombatTargetDraft, type CombatTargetField,
} from '../combatTargeting';

const SIZE = 42;
const HEX_W = Math.sqrt(3) * SIZE;
const ROW_H = SIZE * 1.5;
const BOARD_LEFT = 104;
const BOARD_TOP = 140;
const UNIT_BASE_Y = SIZE / 2;
const BOARD_W = BOARD_LEFT + (BATTLE_COLS - 1) * HEX_W + HEX_W / 2 + SIZE + 40;
const BOARD_H = BOARD_TOP + (BATTLE_ROWS - 1) * ROW_H + SIZE + 60;

const BATTLE_UNIT_SCALE: Partial<Record<UnitId, number>> = {
  // Source canvases share dimensions, but their opaque silhouettes do not. These values normalize
  // what the player sees, then restore the intended tier progression without resampling the art.
  yeoman: 0.62,
  longbowman: 0.78,
  bannerman: 0.95,
  lanceKnight: 0.9,
  oriflammeWarden: 0.95,
  oriflammeWyvern: 1.2,
  candleWisps: 0.78,
  couriers: 0.68,
  sentries: 0.82,
  boneChoir: 0.78,
  brides: 0.96,
  ferry: 1.08,
  tinSoldier: 0.58,
  hobbyKnight: 0.68,
  marionette: 0.92,
  stuffedSentinel: 0.9,
  woodenColossus: 0.95,
  reliquaryArk: 1,
  larvalTide: 0.7,
  paperWaspLancers: 0.7,
  silkSpinners: 0.7,
  amberCarriers: 0.8,
  dragonflyCavalry: 0.85,
  halfWokenQueen: 1.05,
  crowChorus: 0.55,
  fencePostFamiliars: 0.68,
  besomRiders: 0.95,
  rusalka: 0.75,
  leshy: 0.85,
  walkingHut: 1.15,
  outriders: 0.65,
  drumCallers: 0.7,
  ashmaneWolves: 0.75,
  aurochsHerd: 0.9,
  grassSerpent: 0.85,
  thunderbird: 1.05,
  mirrorBound: 0.95,
  maskedDuelist: 1.15,
  hearthHound: 1,
  waxServitor: 0.9,
  standingMirror: 0.95,
  sleeper: 1.05,
  siegeWall: 0.9,
  siegeRam: 1,
  watchtower: 0.95,
  makerWall: 0.95,
  sirens: 1,
  drownedCrew: 1,
  hullTurtle: 1,
  lanternAngler: 0.95,
};

function center(coord: Coord) {
  return {
    x: BOARD_LEFT + coord.x * HEX_W + (coord.y % 2 ? HEX_W / 2 : 0),
    y: BOARD_TOP + coord.y * ROW_H,
  };
}

function points(coord: Coord): string {
  const c = center(coord);
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${c.x + SIZE * Math.cos(angle)},${c.y + SIZE * Math.sin(angle)}`;
  }).join(' ');
}

interface Props {
  state: GameState;
  dispatch: (action: Action) => void;
  humanControl: boolean;
  onSave: (slot?: number) => void;
  onShare: () => void;
  animation: CombatAnimation | null;
  animationSpeed: AnimationSpeed;
  onAnimationSpeedChange: (speed: AnimationSpeed) => void;
  replay?: {
    index: number; total: number; playing: boolean;
    onStep: () => void; onToggle: () => void;
  };
}

function stackColor(stack: BattleStack): string {
  return stack.side === 'attacker' ? 'crimson' : 'azure';
}

const UNIT_GLYPHS: Partial<Record<UnitId, string>> = {
  yeoman: 'Y', longbowman: 'L', bannerman: 'B',
  lanceKnight: 'K', oriflammeWarden: 'W',
  oriflammeWyvern: 'Ŵ',
  tinSoldier: 'T', hobbyKnight: 'H', marionette: 'M',
  stuffedSentinel: 'S', woodenColossus: 'C',
  reliquaryArk: 'A',
  candleWisps: '✦', couriers: 'C', sentries: 'S', boneChoir: '♫', brides: 'B', ferry: 'F',
  larvalTide: '∴', paperWaspLancers: 'P', silkSpinners: '✳', amberCarriers: 'A',
  dragonflyCavalry: 'D', halfWokenQueen: 'Q',
  crowChorus: '♦', fencePostFamiliars: 'F', besomRiders: 'B', rusalka: 'R',
  leshy: 'L', walkingHut: 'H',
  outriders: 'O', drumCallers: 'D', ashmaneWolves: 'A', aurochsHerd: 'U',
  grassSerpent: 'G', thunderbird: 'T',
  sleeper: '⌁', mirrorBound: '◈',
  siegeWall: '▥', siegeRam: 'R', watchtower: '♜',
  standingMirror: '◩',
  makerWall: '▥',
};
type AttackAction = Extract<Action, { type: 'BATTLE_ATTACK' | 'BATTLE_MOVE_ATTACK' }>;

interface AttackCursorState {
  targetId: string;
  hoveredHex: Coord;
  action: AttackAction;
  clientX: number;
  clientY: number;
  angle: number;
}

export function CombatScreen({
  state, dispatch, humanControl, onSave, onShare, animation,
  animationSpeed, onAnimationSpeedChange, replay,
}: Props) {
  const battle = state.battle!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spellbookOpen, setSpellbookOpen] = useState(false);
  const [targeting, setTargeting] = useState<CombatTargetDraft | null>(null);
  const [movePreview, setMovePreview] = useState<Coord | null>(null);
  const [attackCursor, setAttackCursor] = useState<AttackCursorState | null>(null);
  const active = activeBattleStack(battle);
  const selected = battle.stacks.find(
    (stack) => stack.id === selectedId && stack.count > 0,
  ) ?? null;
  const { actions, reachable } = activeBattleOptions(state);
  const spellCasts = legalSpellCasts(battle);
  const itemUses = legalCombatItemUses(battle);
  const reachableSet = new Set(reachable.map((coord) => `${coord.x},${coord.y}`));
  const movePreviewSet = new Set(active && movePreview
    ? stackHexes(active, movePreview).map((coord) => `${coord.x},${coord.y}`) : []);
  const activeHero = active?.side === 'defender'
    ? battle.defenderHero : active ? battle.attackerHero : null;
  const activeInventory = active?.side === 'defender'
    ? battle.defenderHero?.inventory ?? [] : battle.attackerHero.inventory;
  const resonances = activeHero ? effectiveResonances(battle, activeHero) : [];
  const targetingStage = targeting ? combatTargetStage(battle, targeting) : null;
  const targetStackIds = new Set(targeting ? combatTargetStackIds(targeting) : []);
  const placementKeys = new Set(targeting && targetingStage === 'positions'
    ? legalCombatPlacements(battle).map((coord) => `${coord.x},${coord.y}`) : []);
  const selectedPositionKeys = new Set(targeting?.positions
    .map((coord) => `${coord.x},${coord.y}`) ?? []);

  const attackActionsFor = (target: BattleStack): AttackAction[] => actions.filter(
    (action): action is AttackAction => (action.type === 'BATTLE_ATTACK'
      || action.type === 'BATTLE_MOVE_ATTACK') && action.targetId === target.id,
  );

  const aimAttack = (
    target: BattleStack, hoveredHex: Coord, event: React.MouseEvent<SVGPolygonElement>,
  ) => {
    if (!humanControl || !active || target.side === active.side || targeting) {
      setAttackCursor(null);
      return;
    }
    const options = attackActionsFor(target);
    if (!options.length) {
      setAttackCursor(null);
      return;
    }
    const direct = options.find((action) => action.type === 'BATTLE_ATTACK');
    if (direct && canUseRanged(active)) {
      setAttackCursor({
        targetId: target.id, hoveredHex, action: direct,
        clientX: event.clientX, clientY: event.clientY, angle: 45,
      });
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const desiredX = event.clientX - bounds.left - bounds.width / 2;
    const desiredY = event.clientY - bounds.top - bounds.height / 2;
    const desiredLength = Math.max(1, Math.hypot(desiredX, desiredY));
    const targetCenter = center(hoveredHex);
    const ranked = options.map((action) => {
      const origin = action.type === 'BATTLE_MOVE_ATTACK' ? action.destination : active.position;
      const originCenter = center(origin);
      originCenter.x += (UNITS[active.unitId].hexSize - 1) * HEX_W / 2;
      const vectorX = originCenter.x - targetCenter.x;
      const vectorY = originCenter.y - targetCenter.y;
      const vectorLength = Math.max(1, Math.hypot(vectorX, vectorY));
      return {
        action, originCenter,
        score: vectorX / vectorLength * desiredX / desiredLength
          + vectorY / vectorLength * desiredY / desiredLength,
      };
    }).sort((a, b) => b.score - a.score);
    const chosen = ranked[0];
    const swordX = targetCenter.x - chosen.originCenter.x;
    const swordY = targetCenter.y - chosen.originCenter.y;
    setAttackCursor({
      targetId: target.id, hoveredHex, action: chosen.action,
      clientX: event.clientX, clientY: event.clientY,
      angle: Math.atan2(swordY, swordX) * 180 / Math.PI + 90,
    });
  };

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!targeting) return undefined;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setTargeting(null);
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [targeting]);

  useEffect(() => {
    setTargeting(null);
  }, [battle.currentStackId, battle.round]);

  const attackTarget = (target: BattleStack | null) => {
    if (!humanControl || !active || !target || target.side === active.side) return;
    const direct = actions.find(
      (action) => action.type === 'BATTLE_ATTACK' && action.targetId === target.id,
    );
    if (direct) {
      dispatch(direct);
      return;
    }
    const moveAttack = actions.find(
      (action) => action.type === 'BATTLE_MOVE_ATTACK' && action.targetId === target.id,
    );
    if (moveAttack) dispatch(moveAttack);
  };

  const chooseSpell = (spellId: SpellId, effectId?: string) => {
    setTargeting(beginSpellTargeting(battle, spellId, effectId));
    setSpellbookOpen(false);
  };

  const isTargetChoice = (stack: BattleStack) => targetStackIds.has(stack.id);

  const clickStack = (stack: BattleStack) => {
    if (targeting && (targetingStage === 'targetId'
        || targetingStage === 'secondaryTargetId') && isTargetChoice(stack)) {
      setTargeting(chooseCombatTarget(
        targeting, targetingStage, stack.id,
      ));
      return;
    }
    setSelectedId(stack.id);
  };

  return (
    <main className={`combat-shell terrain-${battle.battlefieldTemplate}`}>
      <header className="combat-header">
        <div><span>Battlefield</span><h2>{battle.battlefieldTemplate.replace(/([A-Z])/g, ' $1')}</h2></div>
        <div className="round-counter"><span>Round</span><b>{battle.round}</b></div>
        <div className="versus">
          <b className="crimson"><small>Attacker</small>{HEROES[battle.attackerHero.definitionId].name}</b>
          <i>vs</i>
          <b className="azure"><small>Defender</small>{battle.context.kind === 'guardian'
            ? 'Guardians' : battle.defenderHero
              ? HEROES[battle.defenderHero.definitionId].name : 'Garrison'}</b>
        </div>
        <label className="animation-speed combat-speed">
          Motion
          <select
            value={animationSpeed}
            onChange={(event) => onAnimationSpeedChange(event.target.value as AnimationSpeed)}
          >
            <option value="instant">Off</option>
            <option value="fast">Fast</option>
            <option value="normal">Normal</option>
            <option value="slow">Slow</option>
          </select>
        </label>
        <button className="combat-save" disabled={Boolean(animation)}
          title={animation ? 'Wait for the current animation to finish.' : 'Save the campaign during combat.'}
          onClick={() => onSave()}>
          Save game
        </button>
        <button className="combat-save" disabled={Boolean(animation)}
          title={animation ? 'Wait for the current animation to finish.' : 'Copy a deterministic battle replay link.'}
          onClick={onShare}>
          Share replay
        </button>
        {replay && (
          <div className="replay-controls" aria-label="Battle replay controls">
            <span>{replay.index}/{replay.total}</span>
            <button disabled={replay.playing || replay.index >= replay.total}
              title={replay.playing ? 'Pause the replay before stepping.'
                : replay.index >= replay.total ? 'The replay has reached its end.' : 'Resolve one replay action.'}
              onClick={replay.onStep}>Step</button>
            <button disabled={replay.index >= replay.total}
              title={replay.index >= replay.total ? 'The replay has reached its end.' : replay.playing ? 'Pause replay.' : 'Play replay.'}
              onClick={replay.onToggle}>
              {replay.playing ? 'Pause' : 'Play'}
            </button>
          </div>
        )}
        <button
          className="spellbook-button"
          disabled={!humanControl || spellCasts.length === 0}
          title={!humanControl ? 'Wait for your stack'
            : spellCasts.length === 0 ? 'Already cast this round or insufficient mana' : 'Cast a spell'}
          onClick={() => setSpellbookOpen(true)}
        >Spellbook · {active?.side === 'defender'
            ? battle.defenderHero?.mana ?? 0 : battle.attackerHero.mana}</button>
      </header>
      <div className="combat-layout">
        <section className="battle-board">
          {targeting && targetingStage && (
            <div className="combat-targeting-banner" role="dialog" aria-modal="false"
              aria-label={`${combatTargetName(battle, targeting.source)} targeting`}
              data-target-stage={targetingStage}>
              <div className="combat-targeting-copy">
                <span className="targeting-kicker">Explicit combat choice · {targeting.source.kind}</span>
                <h3>{combatTargetName(battle, targeting.source)} <em>{combatTargetFace(battle, targeting.source)} face</em></h3>
                <p className="targeting-stage"><b>{targetingStage === 'confirm' ? 'Confirm' : `Stage: ${targetingStage.replace(/([A-Z])/g, ' $1')}`}</b>{combatTargetStagePrompt(battle, targeting)}</p>
                <p className="targeting-cost">Cost · {combatTargetCost(battle, targeting.source)}</p>
                <p className="targeting-consequence">Prediction · {combatTargetConsequence(battle, targeting)}</p>
                {(targetingStage === 'effectId' || targetingStage === 'replaceEnchantment'
                    || targetingStage === 'skipRound') && (
                  <div className="combat-targeting-choices" role="group"
                    aria-label={combatTargetStagePrompt(battle, targeting)}>
                    {combatTargetChoices(targeting, targetingStage).map((value) => {
                      const effect = targetingStage === 'effectId'
                        ? effectTargetLabel(battle, String(value)) : null;
                      const replacement = targetingStage === 'replaceEnchantment' && active
                        ? battle.enchantments[active.side][Number(value)] : null;
                      return (
                        <button key={String(value)}
                          data-choice-value={String(value)}
                          data-inspect-kind={effect ? 'enchantment' : undefined}
                          data-inspect-id={replacement?.spellId}
                          onClick={() => setTargeting(chooseCombatTarget(
                            targeting, targetingStage, value,
                          ))}>
                          {effect ?? (replacement
                            ? `Slot ${Number(value) + 1} · ${SPELLS[replacement.spellId].name}`
                            : `Round ${value}`)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {targetingStage === 'positions' && (
                  <small className="targeting-position-count">
                    {targeting.positions.length}/{requiredCombatPositions(battle, targeting.source)} hexes chosen · click again to remove
                  </small>
                )}
              </div>
              <div className="combat-targeting-controls">
                <button disabled={targeting.history.length === 0}
                  title={targeting.history.length === 0
                    ? 'This is the first targeting stage; use Cancel to leave it.'
                    : 'Return to the previous targeting choice.'}
                  onClick={() => setTargeting(backCombatTarget(targeting))}>Back</button>
                <button onClick={() => setTargeting(null)}>Cancel <kbd>Esc</kbd></button>
                <button className="confirm-target" disabled={targetingStage !== 'confirm'}
                  title={targetingStage !== 'confirm'
                    ? 'Complete every required targeting choice before confirming.'
                    : `Commit ${combatTargetName(battle, targeting.source)} with the choices shown.`}
                  onClick={() => {
                    const action = confirmedCombatTargetAction(battle, targeting);
                    if (!action) return;
                    dispatch(action);
                    setTargeting(null);
                  }}>Confirm</button>
              </div>
            </div>
          )}
          {resonances.length > 0 && (
            <div className="resonance-banner">
              {resonances.join(' + ')} resonance · matching spells use their + face
            </div>
          )}
          <div className="enchantment-row">
            {(['attacker', 'defender'] as const).map((side) => (
              <div key={side}><b>{side}</b>
                {[0, 1].map((slot) => {
                  const effect = battle.enchantments[side][slot];
                  return <span key={slot} title={effect ? `Inspect ${SPELLS[effect.spellId].name}` : 'Empty enchantment slot'}
                    data-inspect-kind={effect ? 'enchantment' : undefined}
                    data-inspect-id={effect?.spellId}>
                    {effect ? SPELLS[effect.spellId].name : '—'}
                  </span>;
                })}
              </div>
            ))}
          </div>
          <svg width={BOARD_W} height={BOARD_H} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
            {Array.from({ length: BATTLE_ROWS }, (_, y) =>
              Array.from({ length: BATTLE_COLS }, (_, x) => {
                const coord = { x, y };
                const blocked = battle.obstacles.some(
                  (obstacle) => obstacle.x === x && obstacle.y === y,
                );
                const tile = battle.tiles.find(
                  (candidate) => candidate.position.x === x && candidate.position.y === y,
                );
                const occupant = battle.stacks.find((stack) => stack.count > 0
                  && stackContains(stack, coord));
                const occupantEnemy = Boolean(active && occupant && occupant.side !== active.side);
                const occupantAttackable = Boolean(active && occupant
                  && occupant.side !== active.side && attackActionsFor(occupant).length > 0);
                const key = `${x},${y}`;
                const targetChoice = Boolean(occupant && targetStackIds.has(occupant.id));
                const placementChoice = targetingStage === 'positions' && placementKeys.has(key);
                const positionSelected = selectedPositionKeys.has(key);
                const activateHex = () => {
                  if (!humanControl) return;
                  if (targeting) {
                    if (occupant && targetChoice) clickStack(occupant);
                    else if (!occupant && placementChoice) {
                      setTargeting(toggleCombatPosition(battle, targeting, coord));
                    }
                    return;
                  }
                  if (occupant) {
                    if (occupant.side !== active?.side) {
                      const options = attackActionsFor(occupant);
                      const aimed = attackCursor?.targetId === occupant.id
                        && attackCursor.hoveredHex.x === coord.x
                        && attackCursor.hoveredHex.y === coord.y
                        ? attackCursor.action : options[0];
                      if (aimed) dispatch(aimed);
                    } else setSelectedId(occupant.id);
                  } else if (reachableSet.has(key)) {
                    const freeMove = actions.find((action) =>
                      action.type === 'BATTLE_FREE_MOVE'
                      && action.destination.x === coord.x && action.destination.y === coord.y);
                    dispatch(freeMove ?? { type: 'BATTLE_MOVE', destination: coord });
                  }
                };
                return (
                  <g key={key}>
                    <polygon
                      points={points(coord)}
                      data-occupant-id={occupant?.id}
                      data-occupant-side={occupant?.side}
                      data-inspect-kind={!occupant && tile ? 'battleTile' : undefined}
                      data-inspect-id={!occupant && tile ? tile.type : undefined}
                      role={targetChoice || placementChoice ? 'button' : undefined}
                      tabIndex={targetChoice || placementChoice ? 0 : undefined}
                      aria-label={targetChoice && occupant
                        ? `Choose ${UNITS[occupant.unitId].name}`
                        : placementChoice ? `Choose battlefield hex ${x}, ${y}` : undefined}
                      className={`battle-hex ${battle.shallowHexes.some((hex) => hex.x === x && hex.y === y) ? 'shallow' : ''} ${!targeting && reachableSet.has(key) ? 'reachable' : ''} ${!targeting && movePreviewSet.has(key) ? 'footprint-preview' : ''} ${occupant ? 'occupied' : ''} ${!targeting && occupantEnemy ? 'enemy-occupied' : ''} ${!targeting && occupantAttackable ? 'attackable' : ''} ${targetChoice ? 'target-choice' : ''} ${placementChoice ? 'placement-choice' : ''} ${positionSelected ? 'position-selected' : ''}`}
                      onMouseEnter={() => {
                        if (!targeting && !occupant && reachableSet.has(key)) setMovePreview(coord);
                      }}
                      onMouseMove={(event) => {
                        if (!targeting && occupant) aimAttack(occupant, coord, event);
                      }}
                      onMouseLeave={() => {
                        setMovePreview(null);
                        setAttackCursor(null);
                      }}
                      onContextMenu={(event) => {
                        if (!occupant) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedId(occupant.id);
                      }}
                      onClick={activateHex}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        activateHex();
                      }}
                    >
                      {occupant && <title>{UNITS[occupant.unitId].name} · {occupant.count} remaining · morale {occupant.morale}/{occupant.meterThreshold ?? MORALE_THRESHOLD}</title>}
                    </polygon>
                    {blocked && (
                      <path
                        className="battle-rock"
                        d={`M${center(coord).x - 16} ${center(coord).y + 15} L${center(coord).x - 3} ${center(coord).y - 18} L${center(coord).x + 18} ${center(coord).y + 15} Z`}
                      />
                    )}
                    {tile && (
                      <text
                        className={`battle-tile ${tile.type}`}
                        data-inspect-kind="battleTile" data-inspect-id={tile.type}
                        x={center(coord).x}
                        y={center(coord).y + 5}
                        textAnchor="middle"
                      >{tile.type === 'wall' ? '▥' : '✦'}</text>
                    )}
                  </g>
                );
              }),
            )}
            {battle.stacks.filter((stack) => stack.count > 0)
              .slice().sort((a, b) => a.position.y - b.position.y
                || a.position.x - b.position.x)
              .map((stack) => {
              const c = center(stack.position);
              const unit = UNITS[stack.unitId];
              const footprintCenterX = (unit.hexSize - 1) * HEX_W / 2;
              const enemy = active && stack.side !== active.side;
              const estimate = active && enemy ? estimateDamageRange(battle, active, stack) : null;
              const motion = animation?.actorId === stack.id ? animation : null;
              const impact = animation?.targetId === stack.id ? animation.phase : null;
              const shownCenter = motion ? center(motion.displayPosition) : c;
              const moveX = shownCenter.x - c.x;
              const moveY = shownCenter.y - c.y;
              const targetCenter = motion?.targetPosition
                ? center(motion.targetPosition) : shownCenter;
              const vectorX = targetCenter.x - shownCenter.x;
              const vectorY = targetCenter.y - shownCenter.y;
              const vectorLength = Math.max(1, Math.hypot(vectorX, vectorY));
              const bumpX = vectorX / vectorLength * 18;
              const bumpY = vectorY / vectorLength * 18;
              const moraleThreshold = stack.meterThreshold ?? MORALE_THRESHOLD;
              const moralePercent = Math.min(100, stack.morale / moraleThreshold * 100);
              return (
                <g
                  key={stack.id}
                  data-inspect-kind="unit" data-inspect-id={stack.unitId}
                  data-hex-size={unit.hexSize}
                  data-unit-scale={BATTLE_UNIT_SCALE[stack.unitId] ?? 1}
                  className={`battle-stack ${stackColor(stack)} ${unit.faction} ${active?.id === stack.id ? 'active' : ''} ${selected?.id === stack.id ? 'inspected' : ''} ${isTargetChoice(stack) ? 'target-choice' : ''} ${impact === 'damage' ? 'taking-damage' : ''} ${impact === 'death' ? 'dying' : ''}`}
                  transform={`translate(${c.x} ${c.y})`}
                >
                  <title>
                    {unit.name} · {stack.count} remaining · size {unit.hexSize}
                    {estimate ? ` · estimated kills ${estimate[0]}–${estimate[1]}` : ''}
                  </title>
                  <g
                    className="stack-motion"
                    style={{
                      transform: `translate(${moveX}px, ${moveY}px)`,
                      transitionDuration: motion?.phase === 'move'
                        ? `${motion.duration}ms` : '0ms',
                    }}
                  >
                    <g
                      className={motion?.phase === 'attack' ? 'attack-bump' : ''}
                      style={{
                        '--bump-x': `${bumpX}px`,
                        '--bump-y': `${bumpY}px`,
                        animationDuration: `${motion?.duration ?? 0}ms`,
                      } as CSSProperties}
                    >
                      {unit.hexSize > 1 && (
                        <rect className="wide-stack-pill" x="-25" y={UNIT_BASE_Y - 28}
                          width={50 + (unit.hexSize - 1) * HEX_W} height="56" rx="28" />
                      )}
                      <g transform={`translate(${footprintCenterX} 0)`}>
                        <ellipse className="stack-shadow" cy={UNIT_BASE_Y} rx="25" ry="9" />
                        <rect className="sprite-selection" x={-unit.hexSize * 32} y="-42"
                          width={unit.hexSize * 64} height="74" rx="8" />
                        <PixelSprite id={battleUnitSpriteId(stack.unitId)} x={0} y={UNIT_BASE_Y}
                          renderScale={BATTLE_UNIT_SCALE[stack.unitId] ?? 1}
                          className={`battle-unit-pixel ${stack.side}`} fallback={<>
                            {unit.faction === 'hearthguard' ? (
                              <rect className="stack-body" x="-18" y="-25" width="36" height="48" rx="5" />
                            ) : unit.faction === 'unfinished' ? (
                              <path className="stack-body" d="M0 -27 L19 -5 L13 24 L-13 24 L-19 -5 Z" />
                            ) : unit.faction === 'vespiary' ? (
                              <path className="stack-body" d="M0 -25 L20 -13 L20 13 L0 25 L-20 13 L-20 -13 Z" />
                            ) : unit.faction === 'hagwood' ? (
                              <path className="stack-body" d="M-13 -25 L18 -18 L13 0 L21 23 L-17 20 L-20 -3 Z" />
                            ) : unit.faction === 'wildergrass' ? (
                              <path className="stack-body" d="M-25 -15 L-12 -20 L0 -10 L12 -20 L25 -15 L18 22 L-18 22 Z" />
                            ) : (
                              <>
                                <circle className="stack-body" r="22" />
                                {unit.faction === 'woundWrights' && (
                                  <line className="joint-line" x1="-18" y1="7" x2="18" y2="-7" />
                                )}
                              </>
                            )}
                            <text className="stack-mark" y="5">{UNIT_GLYPHS[stack.unitId]}</text>
                          </>} />
                        <circle className="morale-track" r="27" pathLength="100" />
                        <circle
                          className="morale-value" r="27" pathLength="100"
                          strokeDasharray={`${moralePercent} 100`}
                        />
                        {motion?.phase === 'morale' && (
                          <g className="morale-rally" role="status" aria-label="High morale. Act again."
                            style={{ '--morale-duration': `${motion.duration}ms` } as CSSProperties}>
                            <circle className="morale-rally-ring" r="34" />
                            <path className="morale-rally-chevron" d="M-18 -12 L0 -26 L18 -12 M-13 0 L0 -11 L13 0" />
                            <g className="morale-rally-sparks">
                              <path d="M-30 -25 L-35 -33 M30 -25 L35 -33 M-35 2 L-43 2 M35 2 L43 2" />
                            </g>
                            <g className="morale-rally-banner" transform="translate(0 -61)">
                              <rect x="-43" y="-13" width="86" height="27" rx="4" />
                              <text y="-2">HIGH MORALE</text>
                              <text className="morale-rally-again" y="9">ACT AGAIN</text>
                            </g>
                          </g>
                        )}
                        <rect className="count-plate" x="4" y="17" width="32" height="17" rx="8" />
                        <text className="stack-count" x="20" y="29">{stack.count}</text>
                        <g className="counter-pips">
                          {(Object.entries(stack.counters) as Array<[string, number]>)
                            .filter(([, count]) => count > 0).map(([counter, count], index) => (
                              <g key={counter} transform={`translate(${-24 + index * 16} -31)`}
                                data-inspect-kind="counter" data-inspect-id={counter}>
                                <circle className={counter} r="7" />
                                <text y="3">{count}</text>
                              </g>
                            ))}
                        </g>
                        <g className="effect-pips">
                          {stack.effects.slice(0, 4).map((effect, index) => (
                            <g key={effect.id} transform={`translate(${-24 + index * 16} 45)`}
                              data-inspect-kind="enchantment" data-inspect-id={effect.spellId}>
                              <title>{SPELLS[effect.spellId].name} · {effect.duration} turns</title>
                              <rect
                                className={effect.beneficial ? 'buff' : 'debuff'}
                                x="-7" y="-7" width="14" height="14" rx="3"
                              />
                              <text y="3">{effect.spellId[0].toUpperCase()}</text>
                            </g>
                          ))}
                        </g>
                        {stack.defended && <text className="status-mark" x="20" y="-18">◆</text>}
                      </g>
                    </g>
                  </g>
                </g>
              );
              })}
            {animation?.phase === 'damage' && animation.targetPosition && (() => {
              const blood = center(animation.targetPosition);
              return (
                <g
                  transform={`translate(${blood.x} ${blood.y - 30})`}
                >
                  <g
                    className="damage-effect"
                    style={{ animationDuration: `${animation.duration}ms` }}
                  >
                    <path d="M0 -10 C7 0 9 5 9 10 A9 9 0 1 1 -9 10 C-9 5 -7 0 0 -10Z" />
                    <circle cx="-12" cy="9" r="3" />
                    <circle cx="13" cy="3" r="2" />
                  </g>
                </g>
              );
            })()}
            {animation?.phase === 'projectile' && animation.targetPosition && (() => {
              const actor = battle.stacks.find((stack) => stack.id === animation.actorId);
              const target = battle.stacks.find((stack) => stack.id === animation.targetId);
              const origin = center(animation.displayPosition);
              const destination = center(animation.targetPosition);
              origin.x += actor ? (UNITS[actor.unitId].hexSize - 1) * HEX_W / 2 : 0;
              destination.x += target ? (UNITS[target.unitId].hexSize - 1) * HEX_W / 2 : 0;
              const dx = destination.x - origin.x;
              const dy = destination.y - origin.y;
              const angle = Math.atan2(dy, dx) * 180 / Math.PI;
              return (
                <g transform={`translate(${origin.x} ${origin.y - 18})`}>
                  <g className="ranged-projectile" style={{
                    '--projectile-x': `${dx}px`, '--projectile-y': `${dy}px`,
                    animationDuration: `${animation.duration}ms`,
                  } as CSSProperties}>
                    <g transform={`rotate(${angle})`}>
                      <path className="projectile-shaft" d="M-12 0 H10" />
                      <path className="projectile-head" d="M10 -4 L17 0 L10 4 Z" />
                      <path className="projectile-fletching" d="M-12 0 L-17 -4 M-12 0 L-17 4" />
                    </g>
                  </g>
                </g>
              );
            })()}
          </svg>
          {!humanControl && <div className="thinking-badge">Opponent considering…</div>}
        </section>
        <aside className="combat-sidebar">
          <CombatUnitPanel
            active={active} selected={selected} battle={battle} actions={actions}
            humanControl={humanControl} onAttack={() => attackTarget(selected)}
          />
          <div className="combat-items">
            <h4>Inventory</h4>
            <div className="army-slots">
              {activeInventory.map((item, index) => {
                const options = itemUses.filter((action) => action.inventorySlot === index);
                const definition = item && typeof item !== 'string' ? ITEMS[item.id] : null;
                return (
                  <button
                    key={`combat-item-${index}`}
                    className={`army-slot ${targeting?.source.kind === 'item'
                      && targeting.source.inventorySlot === index ? 'selected' : ''}`}
                    disabled={!humanControl || options.length === 0}
                    title={!item ? 'Empty item slot.' : !humanControl
                      ? 'Wait for a human-controlled company to act.'
                      : options.length === 0
                        ? `${definition?.description ?? itemName(item)} This item cannot be used in the current combat state.`
                        : definition?.description ?? itemName(item)}
                    data-inspect-kind={item && typeof item !== 'string' ? 'item' : undefined}
                    data-inspect-id={item && typeof item !== 'string' ? item.id : undefined}
                    onClick={() => {
                      setTargeting(beginItemTargeting(battle, index));
                    }}
                  >
                    {item ? itemName(item) : '+'}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="combat-actions">
            {actions.filter((action) => action.type === 'BATTLE_USE_ARTIFACT').map((action) => (
              <button
                key={action.artifactId}
                disabled={!humanControl}
                title={!humanControl ? 'Wait for a human-controlled company to act.' : 'Use this once-per-battle artifact.'}
                onClick={() => dispatch(action)}
              ><span>✦</span> {action.artifactId === 'bellsClapper'
                  ? "Ring the Clapper" : 'Sound the Horn'}</button>
            ))}
            {actions.some((action) => action.type === 'BATTLE_OVERWIND') && (
              <button
                disabled={!humanControl}
                title={!humanControl ? 'Wait for a human-controlled company to act.' : 'Take another action now and skip the next round.'}
                onClick={() => dispatch({ type: 'BATTLE_OVERWIND' })}
              ><span>↻</span> Overwind</button>
            )}
            <button
              disabled={!humanControl || !actions.some((action) => action.type === 'BATTLE_WAIT')}
              title={!humanControl ? 'Wait for a human-controlled company to act.'
                : !actions.some((action) => action.type === 'BATTLE_WAIT')
                  ? 'This company has already waited or cannot wait now.' : 'Act later in this round.'}
              onClick={() => dispatch({ type: 'BATTLE_WAIT' })}
            ><span>◷</span> Wait</button>
            <button
              disabled={!humanControl}
              title={!humanControl ? 'Wait for a human-controlled company to act.' : 'End this action with a defensive bonus.'}
              onClick={() => dispatch({ type: 'BATTLE_DEFEND' })}
            ><span>◇</span> Defend</button>
            {actions.some((action) => action.type === 'BATTLE_RETREAT') && (
              <button disabled={!humanControl}
                title="Lose the army; return this hero to the tavern for 2,500 gold."
                onClick={() => dispatch({ type: 'BATTLE_RETREAT' })}>
                <span>↩</span> Retreat · army lost · <ResourceAmount
                  resource="gold" amount={2500} compact />
              </button>
            )}
            {active && actions.some((action) => action.type === 'BATTLE_SURRENDER') && (
              <button disabled={!humanControl || state.players[active.side === 'attacker'
                ? state.activePlayer : battle.context.defenderPlayerId!].resources.gold
                  < surrenderCost(battle, active.side)}
                title={!humanControl ? 'Wait for a human-controlled company to act.'
                  : state.players[active.side === 'attacker'
                    ? state.activePlayer : battle.context.defenderPlayerId!].resources.gold
                      < surrenderCost(battle, active.side)
                    ? `You need ${surrenderCost(battle, active.side).toLocaleString()} gold to surrender.`
                    : 'Pay now, keep the surviving army in the tavern; rehire costs 2,500 gold.'}
                onClick={() => dispatch({ type: 'BATTLE_SURRENDER' })}>
                <ResourceAmount resource="gold" amount={surrenderCost(battle, active.side)} compact /> Surrender
              </button>
            )}
            <button
              className="auto"
              disabled={!humanControl}
              title={!humanControl ? 'Wait for a human-controlled company to act.' : 'Let the computer resolve the rest of this battle.'}
              onClick={() => dispatch({ type: 'AUTO_COMBAT' })}
            ><span>≫</span> Auto-resolve</button>
          </div>
          <div className="battle-log">
            <h4>Battle log</h4>
            <div>
              {battle.log.slice(-12).reverse().map((entry, index) => (
                <p key={`${entry}-${index}`}>{entry}</p>
              ))}
            </div>
          </div>
          <div className="combat-help">
            Click an enemy hex to attack. Aim near an edge to choose the melee approach.
            Right-click any occupied hex to inspect its unit.
          </div>
        </aside>
      </div>
      {spellbookOpen && active && (
        <SpellbookPanel
          battle={battle} side={active.side}
          onClose={() => setSpellbookOpen(false)}
          onSelect={chooseSpell}
        />
      )}
      {attackCursor && (
        <div className="combat-sword-cursor"
          data-attack-type={attackCursor.action.type}
          data-destination-x={attackCursor.action.type === 'BATTLE_MOVE_ATTACK'
            ? attackCursor.action.destination.x : active?.position.x}
          data-destination-y={attackCursor.action.type === 'BATTLE_MOVE_ATTACK'
            ? attackCursor.action.destination.y : active?.position.y}
          data-angle={attackCursor.angle}
          style={{
          left: attackCursor.clientX, top: attackCursor.clientY,
          transform: `translate(-50%, -50%) rotate(${attackCursor.angle}deg)`,
          }} aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <path className="cursor-blade" d="M16 2 L20 15 L17.5 18 H14.5 L12 15 Z" />
            <path className="cursor-grip" d="M9 18 H23 V22 H18 V29 H14 V22 H9 Z" />
          </svg>
        </div>
      )}
    </main>
  );
}
