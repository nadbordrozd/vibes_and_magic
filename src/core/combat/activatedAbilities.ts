import { BATTLE_COLS, BATTLE_ROWS } from '../../content/constants';
import { UNITS } from '../../content/units';
import { specialtyHandler } from '../heroBehaviors';
import { stackUnitHp } from './damage';
import type { Action, BattleStack, BattleState, Coord } from '../types';
import { sameCoord } from '../map/pathfinding';
import { stackHasAbility, stackIgnoresMovementBlockers } from './abilities';
import { hexNeighbors, nearestReachableToTarget, reachableHexes } from './hex';
import { addSpellCounter, totalStackHp } from './magicEffects';
import { applyRoutedCombatDamage } from './damageRouting';
import {
  footprintFits, occupiedByStacks, stackHexes, stacksAdjacent,
} from './footprint';
import { coordKey } from '../map/pathfinding';
import { addManaClamped, forcedMovementDistance, teleportCompany } from './primitives';
import { runExternalDeathPipeline } from './pipeline';
import { castCreatureSpell, legalCreatureSpellActions } from './spells';

type AbilityAction = Extract<Action, { type: 'BATTLE_USE_ABILITY' }>;

interface TrampleRoute {
  destination: Coord;
  path: Coord[];
  targets: BattleStack[];
}

function occupied(battle: BattleState, exceptId?: string): Coord[] {
  return [
    ...[...occupiedByStacks(battle.stacks, exceptId)].map((key) => {
      const [x, y] = key.split(',').map(Number); return { x, y };
    }),
    ...battle.obstacles,
    ...battle.tiles.filter((tile) => tile.type === 'wall' || tile.type === 'thicket')
      .map((tile) => tile.position),
  ];
}

function allFreeHexes(
  battle: BattleState, stack?: BattleStack, exceptId = stack?.id,
): Coord[] {
  const blocked = occupied(battle, exceptId);
  const occupiedKeys = new Set(blocked.slice(0,
    [...occupiedByStacks(battle.stacks, exceptId)].length).map(coordKey));
  const blockers = new Set(blocked.slice(occupiedKeys.size).map(coordKey));
  const result: Coord[] = [];
  for (let y = 0; y < BATTLE_ROWS; y += 1) {
    for (let x = 0; x < BATTLE_COLS; x += 1) {
      const coord = { x, y };
      if (stack ? footprintFits(stack, coord, occupiedKeys, blockers)
        : !blocked.some((other) => sameCoord(coord, other))) result.push(coord);
    }
  }
  return result;
}

function trampleRoutes(battle: BattleState, actor: BattleStack): TrampleRoute[] {
  const allied = new Set(battle.stacks.filter((stack) => stack.count > 0
    && stack.side === actor.side && stack.id !== actor.id)
    .flatMap((stack) => stackHexes(stack)).map(coordKey));
  const occupiedAtRest = occupiedByStacks(battle.stacks, actor.id);
  const blockers = new Set([
    ...battle.obstacles,
    ...battle.tiles.filter((tile) => tile.type === 'wall' || tile.type === 'thicket')
      .map((tile) => tile.position),
  ].map(coordKey));
  const enemies = battle.stacks.filter((stack) => stack.count > 0 && stack.side !== actor.side);
  const enemyHexes = enemies.map((enemy) => new Set(stackHexes(enemy).map(coordKey)));
  const queue: Array<{ position: Coord; path: Coord[]; mask: number }> = [{
    position: { ...actor.position }, path: [{ ...actor.position }], mask: 0,
  }];
  const visited = new Set([`${coordKey(actor.position)}|0`]);
  const routes = new Map<string, TrampleRoute>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current.path.length > 1 && current.mask
        && footprintFits(actor, current.position, occupiedAtRest, blockers)) {
      const firstHit = (target: BattleStack) => current.path.findIndex((anchor) => {
        const swept = new Set(stackHexes(actor, anchor).map(coordKey));
        return stackHexes(target).some((hex) => swept.has(coordKey(hex)));
      });
      const targets = enemies.filter((_target, index) => current.mask & (1 << index))
        .sort((a, b) => firstHit(a) - firstHit(b) || a.id.localeCompare(b.id));
      const route = { destination: current.position, path: current.path, targets };
      const routeKey = coordKey(current.position);
      const prior = routes.get(routeKey);
      if (!prior || route.targets.length > prior.targets.length
          || (route.targets.length === prior.targets.length
            && route.path.length < prior.path.length)) routes.set(routeKey, route);
    }
    if (current.path.length - 1 >= UNITS[actor.unitId].speed) continue;
    for (const next of hexNeighbors(current.position)) {
      if (!footprintFits(actor, next, allied, blockers)) continue;
      const swept = new Set(stackHexes(actor, next).map(coordKey));
      const mask = enemyHexes.reduce((result, hexes, index) =>
        hexes.size && [...hexes].some((hex) => swept.has(hex))
          ? result | (1 << index) : result, current.mask);
      const visitKey = `${coordKey(next)}|${mask}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);
      queue.push({ position: next, path: [...current.path, next], mask });
    }
  }
  return [...routes.values()];
}

export function legalActivatedAbilityActions(
  battle: BattleState,
  actor: BattleStack,
): AbilityAction[] {
  const actions: AbilityAction[] = [];
  if (stackHasAbility(actor, 'procession_of_repair')) {
    actions.push({ type: 'BATTLE_USE_ABILITY', abilityId: 'procession_of_repair' });
  }
  if (stackHasAbility(actor, 'brood_call')
      && (actor.abilityUses?.brood_call ?? 0) === 0
      && stackHexes(actor).flatMap(hexNeighbors).some((position) => allFreeHexes(battle).some(
        (free) => sameCoord(free, position)))) {
    actions.push({ type: 'BATTLE_USE_ABILITY', abilityId: 'brood_call' });
  }
  const beckoningAbility = stackHasAbility(actor, 'beckoning_song')
    ? 'beckoning_song' as const : stackHasAbility(actor, 'the_lure') ? 'the_lure' as const : null;
  if (beckoningAbility && (actor.abilityUses?.[beckoningAbility] ?? 0) === 0) {
    battle.stacks.filter((stack) => stack.count > 0 && stack.side !== actor.side)
      .forEach((target) => actions.push({
        type: 'BATTLE_USE_ABILITY', abilityId: beckoningAbility, targetId: target.id,
      }));
  }
  const actorHero = actor.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const crossingUses = actorHero ? specialtyHandler(actorHero).crossingUses?.() ?? 1 : 1;
  if (stackHasAbility(actor, 'crossing')
      && (actor.abilityUses?.crossing ?? 0) < crossingUses) {
    const free = allFreeHexes(battle);
    battle.stacks.filter((stack) => stack.count > 0 && stack.side === actor.side
      && stack.id !== actor.id && stacksAdjacent(actor, stack))
      .forEach((target) => allFreeHexes(battle, target).forEach((destination) => actions.push({
        type: 'BATTLE_USE_ABILITY', abilityId: 'crossing',
        targetId: target.id, destination,
      })));
  }
  if (stackHasAbility(actor, 'trample')) {
    trampleRoutes(battle, actor).forEach((route) => actions.push({
      type: 'BATTLE_USE_ABILITY', abilityId: 'trample',
      targetId: route.targets[0].id, destination: route.destination,
    }));
  }
  if (stackHasAbility(actor, 'blink_step')
      && (actor.abilityUses?.blink_step ?? 0) === 0) {
    allFreeHexes(battle, actor).filter((destination) => !sameCoord(destination, actor.position)
      && !stackHexes(actor, destination).some((hex) => battle.tiles.some((tile) =>
        sameCoord(tile.position, hex)))).forEach((destination) => actions.push({
      type: 'BATTLE_USE_ABILITY', abilityId: 'blink_step', destination,
    }));
  }
  if (stackHasAbility(actor, 'burrow') && !actor.burrowReturnRound) {
    actions.push({ type: 'BATTLE_USE_ABILITY', abilityId: 'burrow' });
  }
  if (stackHasAbility(actor, 'altar')) {
    battle.stacks.filter((target) => target.count > 0 && target.side === actor.side
      && target.id !== actor.id && target.summoned && stacksAdjacent(actor, target))
      .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))
      .forEach((target) => actions.push({
        type: 'BATTLE_USE_ABILITY', abilityId: 'altar', targetId: target.id,
      }));
  }
  const caster = UNITS[actor.unitId].caster;
  const casterAbility = stackHasAbility(actor, 'caster') ? 'caster' as const
    : stackHasAbility(actor, 'hedge_caster') ? 'hedge_caster' as const : null;
  if (casterAbility && caster
      && (actor.abilityUses?.[casterAbility] ?? 0) < caster.charges) {
    caster.repertoire.forEach((spellId) => legalCreatureSpellActions(battle, actor, spellId)
      .forEach((choice) => actions.push({
        type: 'BATTLE_USE_ABILITY', abilityId: casterAbility, ...choice,
      })));
  }
  return actions;
}

function repairAdjacent(battle: BattleState, actor: BattleStack): void {
  for (const stack of battle.stacks.filter((candidate) =>
    candidate.side === actor.side && candidate.id !== actor.id && !candidate.summoned
    && stacksAdjacent(actor, candidate))) {
    const hp = stackUnitHp(stack);
    const maximum = (battle.initialCounts[stack.id] ?? stack.count) * hp;
    const restored = Math.ceil(maximum * 0.15);
    const after = Math.min(maximum, totalStackHp(stack) + restored);
    stack.count = Math.ceil(after / hp);
    stack.topHp = after === 0 ? 0 : ((after - 1) % hp) + 1;
  }
  battle.log.push(`${UNITS[actor.unitId].name} repairs its procession.`);
}

function broodCall(battle: BattleState, actor: BattleStack): void {
  const free = allFreeHexes(battle);
  const destination = stackHexes(actor).flatMap(hexNeighbors).find((position) =>
    free.some((candidate) => sameCoord(position, candidate)));
  if (!destination) throw new Error('No room for the brood');
  const dead = Object.values(battle.casualties.attacker).reduce(
    (sum, count) => sum + (count ?? 0), 0,
  ) + Object.values(battle.casualties.defender).reduce(
    (sum, count) => sum + (count ?? 0), 0,
  );
  const hero = actor.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
  const count = Math.max(1, Math.floor(dead / 2
    * (hero ? specialtyHandler(hero).broodMultiplier?.() ?? 1 : 1)));
  const larvaHp = hero
    ? specialtyHandler(hero).unitHp?.('larvalTide') ?? UNITS.larvalTide.hp
    : UNITS.larvalTide.hp;
  battle.stacks.push({
    id: `brood-${actor.side}-${battle.round}`, side: actor.side, slot: 7,
    unitId: 'larvalTide', count, topHp: larvaHp,
    hpOverride: larvaHp === UNITS.larvalTide.hp ? undefined : larvaHp,
    position: destination, shots: 0, morale: 0, retaliated: false,
    defended: false, waited: false, bonusActions: 0, attacksMade: 0,
    movedHexes: 0, overwindPrimed: false, overwindUsed: false,
    skipRound: null, summoned: true,
    counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [],
    abilityUses: {}, countAtTurnStart: count,
  });
  actor.abilityUses = { ...actor.abilityUses, brood_call: 1 };
  battle.log.push(`${UNITS[actor.unitId].name} calls a brood of ${count}.`);
}

function beckon(
  battle: BattleState, actor: BattleStack, targetId?: string,
  abilityId: 'beckoning_song' | 'the_lure' = 'beckoning_song',
): void {
  const target = battle.stacks.find((stack) => stack.id === targetId
    && stack.count > 0 && stack.side !== actor.side);
  if (!target) throw new Error('Invalid beckoning target');
  const destinations = reachableHexes(
    target.position, UNITS[target.unitId].speed,
    [...occupiedByStacks(battle.stacks, target.id)].map((key) => {
      const [x, y] = key.split(',').map(Number); return { x, y };
    }),
    [...battle.obstacles, ...battle.tiles.filter((tile) =>
      tile.type === 'wall' || tile.type === 'thicket').map((tile) => tile.position)],
    stackIgnoresMovementBlockers(target),
    false, () => 0, UNITS[target.unitId].hexSize,
  );
  const destination = nearestReachableToTarget(destinations, actor.position);
  if (destination && forcedMovementDistance(battle, target, actor.side, 1) > 0) {
    target.position = { ...destination };
  }
  actor.abilityUses = { ...actor.abilityUses, [abilityId]: 1 };
  battle.log.push(`${UNITS[actor.unitId].name} beckons ${UNITS[target.unitId].name}.`);
}

export function applyActivatedAbility(
  battle: BattleState,
  actor: BattleStack,
  action: AbilityAction,
): void {
  if (action.abilityId === 'procession_of_repair') repairAdjacent(battle, actor);
  else if (action.abilityId === 'brood_call') broodCall(battle, actor);
  else if (action.abilityId === 'beckoning_song' || action.abilityId === 'the_lure') {
    beckon(battle, actor, action.targetId, action.abilityId);
  }
  else if (action.abilityId === 'crossing') {
    const target = battle.stacks.find((stack) => stack.id === action.targetId
      && stack.count > 0 && stack.side === actor.side);
    if (!target || !action.destination
        || !allFreeHexes(battle, target).some((coord) => sameCoord(coord, action.destination!))) {
      throw new Error('Invalid crossing');
    }
    target.position = { ...action.destination };
    actor.abilityUses = {
      ...actor.abilityUses, crossing: (actor.abilityUses?.crossing ?? 0) + 1,
    };
    battle.log.push(`${UNITS[actor.unitId].name} carries ${UNITS[target.unitId].name}.`);
  } else if (action.abilityId === 'trample') {
    const route = action.destination && trampleRoutes(battle, actor).find((candidate) =>
      sameCoord(candidate.destination, action.destination!)
      && candidate.targets[0]?.id === action.targetId);
    if (!route) throw new Error('Invalid trample');
    let damageTotal = 0;
    for (const target of route.targets) {
      const damage = Math.max(1, Math.ceil(totalStackHp(target) * 0.05));
      applyRoutedCombatDamage(battle, target, damage, {
        sourceStack: actor,
        onUpgradedWard: (source, ward) => addSpellCounter(
          battle, source, 'burn', 2, ward.sourceSide,
        ),
      });
      damageTotal += damage;
    }
    actor.position = { ...route.destination };
    battle.log.push(`${UNITS[actor.unitId].name} tramples for ${damageTotal} damage.`);
  } else if (action.abilityId === 'blink_step') {
    if (!action.destination || (actor.abilityUses?.blink_step ?? 0) > 0) {
      throw new Error('Blink Step is unavailable');
    }
    const result = teleportCompany(battle, actor.id, action.destination);
    if (!result.ok) throw new Error(result.reason.text);
    actor.abilityUses = { ...actor.abilityUses, blink_step: 1 };
    battle.log.push(`${UNITS[actor.unitId].name} blinks across the field.`);
  } else if (action.abilityId === 'burrow') {
    actor.burrowReturnRound = battle.round + 1;
    actor.position = { x: -20, y: -20 };
    battle.log.push(`${UNITS[actor.unitId].name} burrows out of the field until its next turn.`);
  } else if (action.abilityId === 'altar') {
    const target = battle.stacks.find((stack) => stack.id === action.targetId
      && stack.count > 0 && stack.side === actor.side && stack.summoned
      && stacksAdjacent(actor, stack));
    if (!target) throw new Error('Altar requires an adjacent allied summoned company');
    const hpBefore = totalStackHp(target); const countBefore = target.count;
    target.count = 0; target.topHp = 0; target.destroyedRound = battle.round;
    runExternalDeathPipeline(battle, target, hpBefore, countBefore, 'sacrifice', actor.side);
    if (actor.count > 0) {
      const maximum = (battle.initialCounts[actor.id] ?? actor.count) * stackUnitHp(actor);
      actor.count = Math.ceil(maximum / stackUnitHp(actor));
      actor.topHp = ((maximum - 1) % stackUnitHp(actor)) + 1;
    }
    const hero = actor.side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    if (hero) addManaClamped(hero, 2);
    battle.log.push(`${UNITS[actor.unitId].name} consumes a summoned company at its altar.`);
  } else if (action.abilityId === 'hedge_caster' || action.abilityId === 'caster') {
    const caster = UNITS[actor.unitId].caster;
    const abilityId = action.abilityId;
    if (!caster || !action.spellId || !caster.repertoire.includes(action.spellId)
        || (actor.abilityUses?.[abilityId] ?? 0) >= caster.charges) {
      throw new Error('Creature casting is unavailable');
    }
    const { type: _type, abilityId: _abilityId, destination: _destination, ...castAction } = action;
    castCreatureSpell(battle, actor, castAction as Parameters<typeof castCreatureSpell>[2]);
    actor.abilityUses = {
      ...actor.abilityUses, [abilityId]: (actor.abilityUses?.[abilityId] ?? 0) + 1,
    };
  } else throw new Error(`Unsupported activated ability: ${action.abilityId}`);
}
