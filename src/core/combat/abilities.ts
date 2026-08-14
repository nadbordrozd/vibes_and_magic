import { UNITS } from '../../content/units';
import { ARTIFACTS } from '../../content/artifacts';
import type {
  AbilityId, BattleStack, BattleState, UnitId,
} from '../types';

export interface AbilityHandler {
  id: AbilityId;
  stage?: 'target-selection' | 'damage-computation' | 'damage-routing' | 'apply'
    | 'death-triggers' | 'retaliation' | 'turn-advance' | 'turn-start'
    | 'activated' | 'hero-cost';
  canRangedAttack?: (stack: BattleStack) => boolean;
  ignoresMovementBlockers?: () => boolean;
  attackMultiplier?: (stack: BattleStack) => number;
  pinsIncomingRollToMinimum?: () => boolean;
  preventsRetaliation?: () => boolean;
  targetPriority?: number;
  meleeReflection?: number;
  replacesMeleeDamage?: boolean;
  healsToInitialAtRoundEnd?: boolean;
  unlimitedRetaliations?: boolean;
  canLandOnObstacles?: boolean;
}

export const ABILITY_REGISTRY: Record<AbilityId, AbilityHandler> = {
  ranged: {
    id: 'ranged',
    canRangedAttack: (stack) => stack.shots > 0,
  },
  flying: { id: 'flying', ignoresMovementBlockers: () => true },
  beast: { id: 'beast' },
  construct: { id: 'construct' },
  spirit: { id: 'spirit' },
  banner: { id: 'banner', targetPriority: 1.5 },
  charge: {
    id: 'charge',
    attackMultiplier: (stack) => 1 + Math.min(0.5, stack.movedHexes * 0.05),
  },
  oriflamme: { id: 'oriflamme', targetPriority: 1.5 },
  rampant: { id: 'rampant', targetPriority: 1.5 },
  springloaded: {
    id: 'springloaded',
    attackMultiplier: (stack) => stack.attacksMade === 0 ? 1.5 : 1,
  },
  no_retaliation: { id: 'no_retaliation', preventsRetaliation: () => true },
  soft_body: { id: 'soft_body', pinsIncomingRollToMinimum: () => true },
  overwind: { id: 'overwind' },
  procession_of_repair: { id: 'procession_of_repair', targetPriority: 1.5 },
  hallowed_cargo: { id: 'hallowed_cargo', targetPriority: 1.5 },
  last_light: { id: 'last_light' },
  the_errand_passes: { id: 'the_errand_passes' },
  still_on_watch: { id: 'still_on_watch', unlimitedRetaliations: true },
  swelling_dirge: { id: 'swelling_dirge' },
  unfinished_vow: { id: 'unfinished_vow', targetPriority: 1.5 },
  crossing: { id: 'crossing' },
  sting_and_circle: { id: 'sting_and_circle' },
  web: { id: 'web' },
  resin_trail: { id: 'resin_trail' },
  skim: { id: 'skim' },
  brood_call: { id: 'brood_call', targetPriority: 1.5 },
  pecking_order: { id: 'pecking_order' },
  boundary: { id: 'boundary' },
  sweep: { id: 'sweep' },
  beckoning_song: { id: 'beckoning_song' },
  home_ground: { id: 'home_ground' },
  thicket_walk: {
    id: 'thicket_walk', ignoresMovementBlockers: () => true,
    canLandOnObstacles: true,
  },
  fowl_legs: { id: 'fowl_legs' },
  crone_favor: { id: 'crone_favor', targetPriority: 1.5 },
  skirmish: { id: 'skirmish' },
  war_drums: { id: 'war_drums', targetPriority: 1.5 },
  pack_hunger: { id: 'pack_hunger' },
  trample: { id: 'trample' },
  undergrass: {
    id: 'undergrass', ignoresMovementBlockers: () => true,
    preventsRetaliation: () => true,
  },
  storm_wake: { id: 'storm_wake' },
  siege_wall: { id: 'siege_wall', targetPriority: 0.6 },
  siege_ram: { id: 'siege_ram' },
  immobile: { id: 'immobile' },
  mirror_hex: { id: 'mirror_hex', targetPriority: 1.8 },
  full_heal: {
    id: 'full_heal', stage: 'turn-advance', healsToInitialAtRoundEnd: true,
  },
  melee_reflect: {
    id: 'melee_reflect', stage: 'damage-routing',
    meleeReflection: 1, replacesMeleeDamage: true,
  },
  mask_reflect: {
    id: 'mask_reflect', stage: 'damage-routing',
    meleeReflection: (ARTIFACTS.mirrorMask.values?.percent ?? 0) / 100,
  },
  aquatic: { id: 'aquatic' },
  the_song: { id: 'the_song' },
  still_aboard: { id: 'still_aboard' },
  shellback: { id: 'shellback' },
  the_lure: { id: 'the_lure' },
  hex_feeder: { id: 'hex_feeder', stage: 'damage-computation' },
  counter_eater: { id: 'counter_eater', stage: 'turn-start' },
  burn_conduit: { id: 'burn_conduit', stage: 'apply' },
  bloomshare: { id: 'bloomshare', stage: 'turn-start' },
  echoing: { id: 'echoing', stage: 'apply' },
  spell_battery: { id: 'spell_battery', stage: 'hero-cost', targetPriority: 1.5 },
  mana_leech: { id: 'mana_leech', stage: 'apply' },
  spell_shrug: { id: 'spell_shrug', stage: 'damage-routing' },
  spellbound: { id: 'spellbound', stage: 'target-selection' },
  sniper: { id: 'sniper', stage: 'damage-computation' },
  chain_shot: { id: 'chain_shot', stage: 'apply' },
  first_strike: { id: 'first_strike', stage: 'retaliation' },
  phalanx: { id: 'phalanx', stage: 'damage-routing', targetPriority: 1.5 },
  unstable: { id: 'unstable', stage: 'death-triggers' },
  soul_tithe: { id: 'soul_tithe', stage: 'death-triggers', targetPriority: 1.5 },
  blink_step: { id: 'blink_step', stage: 'activated' },
  altar: { id: 'altar', stage: 'activated' },
  hedge_caster: { id: 'hedge_caster', stage: 'activated' },
  ward_bearer: { id: 'ward_bearer', stage: 'target-selection', targetPriority: 1.5 },
  siphon: { id: 'siphon', stage: 'apply', targetPriority: 1.5 },
  caster: { id: 'caster', stage: 'activated', targetPriority: 1.5 },
  warded_hide: { id: 'warded_hide', stage: 'damage-routing' },
  low_magic_immune: { id: 'low_magic_immune', stage: 'target-selection' },
  school_resistant: { id: 'school_resistant', stage: 'target-selection' },
  unburnable: { id: 'unburnable', stage: 'apply' },
  unchillable: { id: 'unchillable', stage: 'apply' },
  unhexable: { id: 'unhexable', stage: 'apply' },
  spell_ward: { id: 'spell_ward', stage: 'target-selection' },
  spell_deflect: { id: 'spell_deflect', stage: 'target-selection' },
  spell_frail: { id: 'spell_frail', stage: 'damage-routing' },
  all_adjacent: { id: 'all_adjacent', stage: 'target-selection' },
  breath: { id: 'breath', stage: 'target-selection' },
  cleave: { id: 'cleave', stage: 'target-selection' },
  line_strike: { id: 'line_strike', stage: 'target-selection' },
  blast_shot: { id: 'blast_shot', stage: 'target-selection' },
  arc_shot: { id: 'arc_shot', stage: 'target-selection' },
  dread: { id: 'dread', stage: 'turn-start' },
  hearth: { id: 'hearth', stage: 'turn-start' },
  standard_bearer: { id: 'standard_bearer', stage: 'turn-start', targetPriority: 1.5 },
  quench: { id: 'quench', stage: 'apply', targetPriority: 1.5 },
  cornered: { id: 'cornered', stage: 'damage-computation' },
  first_blood: { id: 'first_blood', stage: 'damage-computation' },
  last_stand: { id: 'last_stand', stage: 'damage-routing' },
  ambush: { id: 'ambush', stage: 'target-selection' },
  burrow: { id: 'burrow', stage: 'activated' },
  rear_guard: { id: 'rear_guard', stage: 'target-selection' },
  wall_walker: { id: 'wall_walker', stage: 'target-selection' },
  pathfinder: { id: 'pathfinder' },
  beast_of_burden: { id: 'beast_of_burden' },
  ley_touched: { id: 'ley_touched' },
  tithe_bearer: { id: 'tithe_bearer' },
  far_sighted: { id: 'far_sighted' },
  carrion_sense: { id: 'carrion_sense' },
  sea_legs: { id: 'sea_legs' },
  mindless: { id: 'mindless', stage: 'turn-start' },
  feral: { id: 'feral', stage: 'turn-start' },
  hungry: { id: 'hungry' },
  slow_witted: { id: 'slow_witted', stage: 'turn-start' },
  brittle_bones: { id: 'brittle_bones', stage: 'damage-routing' },
  unruly: { id: 'unruly', stage: 'target-selection' },
};

export function abilityHandlers(unitId: UnitId): AbilityHandler[] {
  return UNITS[unitId].abilities.map((abilityId) => {
    const handler = ABILITY_REGISTRY[abilityId];
    if (!handler) throw new Error(`Unknown ability handler: ${abilityId}`);
    return handler;
  });
}

function abilitiesSuppressed(stack: BattleStack): boolean {
  return stack.effects.some((effect) => effect.duration > 0
    && (effect.spellId === 'brittle'
      || (effect.spellId === 'oathbind' && effect.magnitude >= 2)));
}

export function stackAbilityHandlers(stack: BattleStack): AbilityHandler[] {
  if (abilitiesSuppressed(stack)) return [];
  const handlers = [
    ...abilityHandlers(stack.unitId),
    ...(stack.temporaryAbilities ?? []).map((abilityId) => ABILITY_REGISTRY[abilityId]),
  ];
  return stack.effects.some((effect) => effect.spellId === 'rootTheSky'
    && effect.id.includes(':grounded')) ? handlers.filter((handler) => handler.id !== 'flying')
    : handlers;
}

export function battleAbilityHandlers(
  battle: BattleState,
  stack: BattleStack,
): AbilityHandler[] {
  return [
    ...stackAbilityHandlers(stack),
    ...battle.sideAbilities[stack.side].map((abilityId) => {
      const handler = ABILITY_REGISTRY[abilityId];
      if (!handler) throw new Error(`Unknown side ability handler: ${abilityId}`);
      return handler;
    }),
  ];
}

export function hasAbility(unitId: UnitId, ability: AbilityId): boolean {
  return UNITS[unitId].abilities.includes(ability);
}

export function ignoresMovementBlockers(unitId: UnitId): boolean {
  return abilityHandlers(unitId).some(
    (handler) => handler.ignoresMovementBlockers?.() === true,
  );
}

export function stackIgnoresMovementBlockers(stack: BattleStack): boolean {
  return stackAbilityHandlers(stack).some(
    (handler) => handler.ignoresMovementBlockers?.() === true,
  );
}

export function attackAbilityMultiplier(stack: BattleStack): number {
  return stackAbilityHandlers(stack).reduce(
    (value, handler) => value * (handler.attackMultiplier?.(stack) ?? 1),
    1,
  );
}

export function pinsIncomingRollToMinimum(stack: BattleStack): boolean {
  return stackAbilityHandlers(stack).some(
    (handler) => handler.pinsIncomingRollToMinimum?.() === true,
  );
}

export function preventsRetaliation(stack: BattleStack): boolean {
  return stackAbilityHandlers(stack).some(
    (handler) => handler.preventsRetaliation?.() === true,
  );
}

export function hasUnlimitedRetaliations(stack: BattleStack): boolean {
  return stackAbilityHandlers(stack).some(
    (handler) => handler.unlimitedRetaliations === true,
  );
}

export function targetPriority(stack: BattleStack): number {
  return stackAbilityHandlers(stack).reduce(
    (value, handler) => value * (handler.targetPriority ?? 1),
    1,
  );
}

export function canLandOnObstacles(stack: BattleStack): boolean {
  return stackAbilityHandlers(stack).some((handler) => handler.canLandOnObstacles === true);
}

export function stackHasAbility(stack: BattleStack, ability: AbilityId): boolean {
  return stackAbilityHandlers(stack).some((handler) => handler.id === ability);
}
