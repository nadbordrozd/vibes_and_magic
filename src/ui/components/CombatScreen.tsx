import { useEffect, useState, type CSSProperties } from 'react';
import { UNITS } from '../../content/units';
import {
  activeBattleStack, estimateDamageRange,
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
import { legalSpellCasts } from '../../core/combat/spells';
import { legalCombatItemUses } from '../../core/combat/items';
import { itemName } from '../../content/items';

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
  onSave: () => void;
  animation: CombatAnimation | null;
  animationSpeed: AnimationSpeed;
  onAnimationSpeedChange: (speed: AnimationSpeed) => void;
}

function stackColor(stack: BattleStack): string {
  return stack.side === 'attacker' ? 'crimson' : 'azure';
}

const UNIT_GLYPHS: Record<UnitId, string> = {
  yeoman: 'Y', longbowman: 'L', bannerman: 'B',
  lanceKnight: 'K', oriflammeWarden: 'W',
  tinSoldier: 'T', hobbyKnight: 'H', marionette: 'M',
  stuffedSentinel: 'S', woodenColossus: 'C',
  sleeper: '⌁', mirrorBound: '◈',
};
const ALLY_SPELLS = new Set<SpellId>([
  'rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
  'ward', 'quicksilver', 'mournersVeil', 'remembrance',
]);
const GLOBAL_SPELLS = new Set<SpellId>([
  'standardOfDawn', 'hymnOfTheHost', 'forgefire',
  'clockworkEscort', 'ironclad', 'reckoning',
]);

export function CombatScreen({
  state, dispatch, humanControl, onSave, animation,
  animationSpeed, onAnimationSpeedChange,
}: Props) {
  const battle = state.battle!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spellbookOpen, setSpellbookOpen] = useState(false);
  const [casting, setCasting] = useState<{ spellId: SpellId; effectId?: string } | null>(null);
  const [usingItemSlot, setUsingItemSlot] = useState<number | null>(null);
  const active = activeBattleStack(battle);
  const selected = battle.stacks.find(
    (stack) => stack.id === selectedId && stack.count > 0,
  ) ?? null;
  const { actions, reachable } = activeBattleOptions(state);
  const spellCasts = legalSpellCasts(battle);
  const itemUses = legalCombatItemUses(battle);
  const reachableSet = new Set(reachable.map((coord) => `${coord.x},${coord.y}`));

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
    if (['amplify', 'sour', 'unmake'].includes(spellId)) {
      const counterTarget = battle.stacks.find((stack) =>
        Object.values(stack.counters).some((count) => count > 0));
      dispatch({
        type: 'BATTLE_CAST', spellId, effectId,
        targetId: spellId === 'unmake' ? counterTarget?.id : undefined,
      });
      setSpellbookOpen(false);
      return;
    }
    if (GLOBAL_SPELLS.has(spellId)) {
      dispatch({ type: 'BATTLE_CAST', spellId, replaceEnchantment: 0 });
      setSpellbookOpen(false);
      return;
    }
    if (spellId === 'wallOfTheMaker') {
      const occupied = new Set([
        ...battle.stacks.map((stack) => `${stack.position.x},${stack.position.y}`),
        ...battle.obstacles.map((coord) => `${coord.x},${coord.y}`),
      ]);
      const positions = Array.from({ length: 9 }, (_, y) => ({ x: 6, y }))
        .filter((coord) => !occupied.has(`${coord.x},${coord.y}`)).slice(0, 3);
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
    const ally = ALLY_SPELLS.has(casting.spellId);
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
    <main className="combat-shell">
      <header className="combat-header">
        <div><span>Battlefield</span><h2>Mountain Pass</h2></div>
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
        <button className="combat-save" disabled={Boolean(animation)} onClick={onSave}>
          Save game
        </button>
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
          {battle.resonance && (
            <div className={`resonance-banner ${battle.resonance}`}>
              {battle.resonance} resonance · matching spells use their + face
            </div>
          )}
          <div className="enchantment-row">
            {(['attacker', 'defender'] as const).map((side) => (
              <div key={side}><b>{side}</b>
                {[0, 1].map((slot) => {
                  const effect = battle.enchantments[side][slot];
                  return <span key={slot} title={effect?.spellId ?? 'Empty enchantment slot'}>
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
                return (
                  <g key={`${x},${y}`}>
                    <polygon
                      points={points(coord)}
                      className={`battle-hex ${reachableSet.has(`${x},${y}`) ? 'reachable' : ''}`}
                      onClick={() => {
                        if (humanControl && reachableSet.has(`${x},${y}`)) {
                          dispatch({ type: 'BATTLE_MOVE', destination: coord });
                        }
                      }}
                    />
                    {blocked && (
                      <path
                        className="battle-rock"
                        d={`M${center(coord).x - 16} ${center(coord).y + 15} L${center(coord).x - 3} ${center(coord).y - 18} L${center(coord).x + 18} ${center(coord).y + 15} Z`}
                      />
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
                  className={`battle-stack ${stackColor(stack)} ${active?.id === stack.id ? 'active' : ''} ${selected?.id === stack.id ? 'inspected' : ''} ${isSpellTarget(stack) ? 'spell-target' : ''}`}
                  transform={`translate(${c.x} ${c.y})`}
                  onClick={() => clickStack(stack)}
                  onDoubleClick={() => attackTarget(stack)}
                >
                  <title>
                    {unit.name} · {stack.count} remaining
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
                      <circle className="stack-shadow" cy="4" r="23" />
                      {unit.faction === 'hearthguard' ? (
                        <rect className="stack-body" x="-18" y="-25" width="36" height="48" rx="5" />
                      ) : (
                        <>
                          <circle className="stack-body" r="22" />
                          <line className="joint-line" x1="-18" y1="7" x2="18" y2="-7" />
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
                            <g key={counter} transform={`translate(${-24 + index * 16} -31)`}>
                              <circle className={counter} r="7" />
                              <text y="3">{count}</text>
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
