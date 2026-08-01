import { useEffect, useState, type CSSProperties } from 'react';
import { UNITS } from '../../content/units';
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
  effectiveResonances, isUpgraded, legalSpellCasts,
} from '../../core/combat/spells';
import { legalCombatItemUses } from '../../core/combat/items';
import { itemName } from '../../content/items';
import { artifactEffectTotal } from '../../core/artifacts';
import { occupiedByStacks, stackHexes } from '../../core/combat/footprint';

const SIZE = 32;
const HEX_W = Math.sqrt(3) * SIZE;
const ROW_H = SIZE * 1.5;

function center(coord: Coord) {
  return {
    x: 48 + coord.x * HEX_W + (coord.y % 2 ? HEX_W / 2 : 0),
    y: 48 + coord.y * ROW_H,
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
const ALLY_SPELLS = new Set<SpellId>([
  'rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
  'ward', 'quicksilver', 'mournersVeil', 'remembrance',
  'clarion', 'bloom', 'shedSkin', 'loyalUntoDeath',
]);
const GLOBAL_SPELLS = new Set<SpellId>([
  'standardOfDawn', 'hymnOfTheHost', 'forgefire',
  'clockworkEscort', 'ironclad', 'reckoning',
  'vigilOfTheHost', 'standingMirror', 'silenceThePassing', 'theToll',
  'rains', 'stampedeCall', 'storm', 'hedgerowMarch',
]);

export function CombatScreen({
  state, dispatch, humanControl, onSave, onShare, animation,
  animationSpeed, onAnimationSpeedChange, replay,
}: Props) {
  const battle = state.battle!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spellbookOpen, setSpellbookOpen] = useState(false);
  const [casting, setCasting] = useState<{ spellId: SpellId; effectId?: string } | null>(null);
  const [usingItemSlot, setUsingItemSlot] = useState<number | null>(null);
  const [hourglassTarget, setHourglassTarget] = useState<string | null>(null);
  const [movePreview, setMovePreview] = useState<Coord | null>(null);
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
  const resonances = activeHero ? effectiveResonances(battle, activeHero) : [];

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

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
    setUsingItemSlot(null);
    if (['amplify', 'sour', 'unmake', 'overgrow'].includes(spellId)) {
      const counterTarget = battle.stacks.find((stack) =>
        Object.values(stack.counters).some((count) => count > 0));
      dispatch({
        type: 'BATTLE_CAST', spellId, effectId,
        targetId: spellId === 'unmake' ? counterTarget?.id : undefined,
      });
      setSpellbookOpen(false);
      return;
    }
    if (spellId === 'borrowShape') {
      const use = spellCasts.find((action) => action.spellId === spellId);
      if (use) dispatch(use);
      setSpellbookOpen(false);
      return;
    }
    if (GLOBAL_SPELLS.has(spellId)) {
      dispatch({ type: 'BATTLE_CAST', spellId, replaceEnchantment: 0 });
      setSpellbookOpen(false);
      return;
    }
    if (spellId === 'wallOfTheMaker' || spellId === 'thicket') {
      const occupied = new Set([
        ...occupiedByStacks(battle.stacks),
        ...battle.obstacles.map((coord) => `${coord.x},${coord.y}`),
        ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
      ]);
      const hero = active?.side === 'defender'
        ? battle.defenderHero : battle.attackerHero;
      const count = spellId === 'wallOfTheMaker'
        ? 3 + (hero ? artifactEffectTotal(hero, 'extra_wall') : 0) : 3;
      const positions = Array.from({ length: 9 }, (_, y) => ({ x: 6, y }))
        .filter((coord) => !occupied.has(`${coord.x},${coord.y}`)).slice(0, count);
      dispatch({ type: 'BATTLE_CAST', spellId, positions });
      setSpellbookOpen(false);
      return;
    }
    setCasting({ spellId, effectId });
    setSpellbookOpen(false);
  };

  const isSpellTarget = (stack: BattleStack) => {
    if (usingItemSlot !== null) {
      return itemUses.some((action) =>
        action.inventorySlot === usingItemSlot && action.targetId === stack.id);
    }
    if (!casting || !active) return false;
    if (casting.spellId === 'reflect') return stack.count > 0;
    if (casting.spellId === 'hourglassCrack') return stack.count > 0;
    const effectiveSpell = casting.spellId === 'echo'
      ? battle.lastSpellCast?.spellId ?? casting.spellId : casting.spellId;
    const ally = ALLY_SPELLS.has(effectiveSpell);
    return stack.count > 0 && (ally ? stack.side === active.side : stack.side !== active.side)
      && !(stack.side !== active.side
        && stack.effects.some((effect) => effect.spellId === 'sanctuary'));
  };

  const clickStack = (stack: BattleStack) => {
    if (usingItemSlot !== null) {
      const use = itemUses.find((action) =>
        action.inventorySlot === usingItemSlot && action.targetId === stack.id);
      if (use) {
        dispatch(use);
        setUsingItemSlot(null);
      } else setSelectedId(stack.id);
    } else if (casting && isSpellTarget(stack)) {
      if (casting.spellId === 'hourglassCrack' && activeHero
          && isUpgraded(battle, activeHero, 'hourglassCrack')) {
        setHourglassTarget(stack.id);
        setCasting(null);
        return;
      }
      const secondAlly = casting.spellId === 'rally'
        ? battle.stacks.find((item) =>
          item.side === stack.side && item.id !== stack.id && item.count > 0)?.id
        : undefined;
      dispatch({
        type: 'BATTLE_CAST', spellId: casting.spellId,
        targetId: stack.id, secondaryTargetId: secondAlly,
        effectId: casting.effectId,
      });
      setCasting(null);
    } else setSelectedId(stack.id);
  };

  return (
    <main className={`combat-shell terrain-${battle.battlefieldTemplate}`}>
      <header className="combat-header">
        <div><span>Battlefield</span><h2>{battle.battlefieldTemplate.replace(/([A-Z])/g, ' $1')}</h2></div>
        <div className="round-counter"><span>Round</span><b>{battle.round}</b></div>
        <div className="versus">
          <b className="crimson">Attacker</b><i>vs</i><b className="azure">Defender</b>
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
        <button className="combat-save" disabled={Boolean(animation)} onClick={() => onSave()}>
          Save game
        </button>
        <button className="combat-save" disabled={Boolean(animation)} onClick={onShare}>
          Share replay
        </button>
        {replay && (
          <div className="replay-controls" aria-label="Battle replay controls">
            <span>{replay.index}/{replay.total}</span>
            <button disabled={replay.playing || replay.index >= replay.total}
              onClick={replay.onStep}>Step</button>
            <button disabled={replay.index >= replay.total} onClick={replay.onToggle}>
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
                  return <span key={slot} title={effect?.spellId ?? 'Empty enchantment slot'}
                    data-inspect-kind={effect ? 'enchantment' : undefined}
                    data-inspect-id={effect?.spellId}>
                    {effect ? effect.spellId : '—'}
                  </span>;
                })}
              </div>
            ))}
          </div>
          <svg viewBox={`0 0 ${13 * HEX_W + 80} ${9 * ROW_H + 80}`}>
            {Array.from({ length: 9 }, (_, y) =>
              Array.from({ length: 13 }, (_, x) => {
                const coord = { x, y };
                const blocked = battle.obstacles.some(
                  (obstacle) => obstacle.x === x && obstacle.y === y,
                );
                const tile = battle.tiles.find(
                  (candidate) => candidate.position.x === x && candidate.position.y === y,
                );
                return (
                  <g key={`${x},${y}`}>
                    <polygon
                      points={points(coord)}
                      className={`battle-hex ${battle.shallowHexes.some((hex) => hex.x === x && hex.y === y) ? 'shallow' : ''} ${reachableSet.has(`${x},${y}`) ? 'reachable' : ''} ${movePreviewSet.has(`${x},${y}`) ? 'footprint-preview' : ''}`}
                      onMouseEnter={() => {
                        if (reachableSet.has(`${x},${y}`)) setMovePreview(coord);
                      }}
                      onMouseLeave={() => setMovePreview(null)}
                      onClick={() => {
                        if (humanControl && reachableSet.has(`${x},${y}`)) {
                          const freeMove = actions.find((action) =>
                            action.type === 'BATTLE_FREE_MOVE'
                            && action.destination.x === coord.x && action.destination.y === coord.y);
                          dispatch(freeMove ?? { type: 'BATTLE_MOVE', destination: coord });
                        }
                      }}
                    />
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
            {battle.stacks.filter((stack) => stack.count > 0).map((stack) => {
              const c = center(stack.position);
              const unit = UNITS[stack.unitId];
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
              return (
                <g
                  key={stack.id}
                  data-inspect-kind="unit" data-inspect-id={stack.unitId}
                  data-hex-size={unit.hexSize}
                  className={`battle-stack ${stackColor(stack)} ${unit.faction} ${active?.id === stack.id ? 'active' : ''} ${selected?.id === stack.id ? 'inspected' : ''} ${isSpellTarget(stack) ? 'spell-target' : ''} ${impact === 'damage' ? 'taking-damage' : ''} ${impact === 'death' ? 'dying' : ''}`}
                  transform={`translate(${c.x} ${c.y})`}
                  onClick={() => clickStack(stack)}
                  onDoubleClick={() => attackTarget(stack)}
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
                        <rect className="wide-stack-pill" x="-25" y="-28"
                          width={50 + (unit.hexSize - 1) * HEX_W} height="56" rx="28" />
                      )}
                      <circle className="stack-shadow" cy="4" r="23" />
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
                      <circle className="morale-track" r="27" pathLength="100" />
                      <circle
                        className="morale-value" r="27" pathLength="100"
                        strokeDasharray={`${stack.morale} 100`}
                      />
                      <rect className="count-plate" x="-16" y="19" width="32" height="17" rx="8" />
                      <text className="stack-count" y="31">{stack.count}</text>
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
                            <title>{effect.spellId} · {effect.duration} turns</title>
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
          </svg>
          {!humanControl && <div className="thinking-badge">Opponent considering…</div>}
        </section>
        <aside className="combat-sidebar">
          <CombatUnitPanel
            active={active} selected={selected} actions={actions}
            humanControl={humanControl} onAttack={() => attackTarget(selected)}
          />
          <div className="combat-items">
            <h4>Inventory</h4>
            <div className="army-slots">
              {(active?.side === 'defender'
                ? battle.defenderHero?.inventory ?? []
                : battle.attackerHero.inventory).map((item, index) => {
                const options = itemUses.filter((action) => action.inventorySlot === index);
                return (
                  <button
                    key={`combat-item-${index}`}
                    className={`army-slot ${usingItemSlot === index ? 'selected' : ''}`}
                    disabled={!humanControl || options.length === 0}
                    data-inspect-kind={item && typeof item !== 'string' ? 'item' : undefined}
                    data-inspect-id={item && typeof item !== 'string' ? item.id : undefined}
                    onClick={() => {
                      const immediate = options.find((action) => !action.targetId);
                      if (immediate) dispatch(immediate);
                      else {
                        setCasting(null);
                        setUsingItemSlot(index);
                      }
                    }}
                  >
                    {item ? itemName(item) : '+'}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="combat-actions">
            {hourglassTarget && (
              <div className="hourglass-choice">
                <b>Choose the skipped round</b>
                {[1, 2, 3].map((offset) => (
                  <button key={offset} onClick={() => {
                    dispatch({
                      type: 'BATTLE_CAST', spellId: 'hourglassCrack',
                      targetId: hourglassTarget, skipRound: battle.round + offset,
                    });
                    setHourglassTarget(null);
                  }}>Round {battle.round + offset}</button>
                ))}
              </div>
            )}
            {actions.filter((action) => action.type === 'BATTLE_USE_ARTIFACT').map((action) => (
              <button
                key={action.artifactId}
                disabled={!humanControl}
                onClick={() => dispatch(action)}
              ><span>✦</span> {action.artifactId === 'bellsClapper'
                  ? "Ring the Clapper" : 'Sound the Horn'}</button>
            ))}
            {actions.some((action) => action.type === 'BATTLE_OVERWIND') && (
              <button
                disabled={!humanControl}
                onClick={() => dispatch({ type: 'BATTLE_OVERWIND' })}
              ><span>↻</span> Overwind</button>
            )}
            <button
              disabled={!humanControl || !actions.some((action) => action.type === 'BATTLE_WAIT')}
              onClick={() => dispatch({ type: 'BATTLE_WAIT' })}
            ><span>◷</span> Wait</button>
            <button
              disabled={!humanControl}
              onClick={() => dispatch({ type: 'BATTLE_DEFEND' })}
            ><span>◇</span> Defend</button>
            {actions.some((action) => action.type === 'BATTLE_RETREAT') && (
              <button disabled={!humanControl}
                title="Lose the army; return this hero to the tavern for 2,500 gold."
                onClick={() => dispatch({ type: 'BATTLE_RETREAT' })}>
                <span>↩</span> Retreat · army lost
              </button>
            )}
            {active && actions.some((action) => action.type === 'BATTLE_SURRENDER') && (
              <button disabled={!humanControl || state.players[active.side === 'attacker'
                ? state.activePlayer : battle.context.defenderPlayerId!].resources.gold
                  < surrenderCost(battle, active.side)}
                title="Keep the surviving army in the tavern; rehire costs 2,500 gold."
                onClick={() => dispatch({ type: 'BATTLE_SURRENDER' })}>
                <span>G</span> Surrender · {surrenderCost(battle, active.side).toLocaleString()}g
              </button>
            )}
            <button
              className="auto"
              disabled={!humanControl}
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
            Click any unit to inspect it. Use Attack selected or double-click an enemy.
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
    </main>
  );
}
