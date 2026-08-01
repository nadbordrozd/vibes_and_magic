import { UNITS } from '../../content/units';
import { ARTIFACTS } from '../../content/artifacts';
import type {
  AbilityId, BattleStack, BattleState, UnitId,
} from '../types';

export interface AbilityHandler {
  id: AbilityId;
  stage?: 'damage-routing' | 'turn-advance';
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
  return [
    ...abilityHandlers(stack.unitId),
    ...(stack.temporaryAbilities ?? []).map((abilityId) => ABILITY_REGISTRY[abilityId]),
  ];
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
