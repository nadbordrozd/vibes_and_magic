import type { AbilityId } from '../core/types';

export interface AbilityPresentation {
  name: string;
  description: string;
  destinationSubject?: 'actor' | 'target';
}

const ability = (
  name: string, description: string,
  destinationSubject?: AbilityPresentation['destinationSubject'],
): AbilityPresentation => ({
  name, description, ...(destinationSubject ? { destinationSubject } : {}),
});

/** Presentation-only explanations for every rules-facing ability tag. */
export const ABILITY_PRESENTATION: Record<AbilityId, AbilityPresentation> = {
  ranged: ability('Ranged', 'Can shoot while shots remain. Adjacent enemies and very distant targets reduce ranged damage.'),
  flying: ability('Flying', 'Ignores battlefield movement blockers.'),
  beast: ability('Beast', 'Counts as a Beast for skills, artifacts, and other effects.'),
  construct: ability('Construct', 'Counts as a Construct for repair and other effects.'),
  spirit: ability('Spirit', 'Counts as a Spirit for spells and other effects.'),
  banner: ability('Banner', 'Adjacent allies gain morale at the start of each round.'),
  charge: ability('Charge', 'Deals 5% more attack damage per hex moved before striking, up to +50%.'),
  oriflamme: ability('Oriflamme', 'All allies gain morale each round and are steadied when an allied company is destroyed.'),
  rampant: ability('Rampant', 'Gains morale whenever an ally receives a morale-triggered extra action.'),
  springloaded: ability('Spring-Loaded', 'Its first attack each battle deals 50% more damage.'),
  no_retaliation: ability('No Retaliation', 'Enemies cannot retaliate against its attacks.'),
  soft_body: ability('Soft Body', 'Incoming attacks use the minimum of the attacker’s damage range.'),
  overwind: ability('Overwind', 'Take an extra full action now, then skip this company’s entire next round.'),
  procession_of_repair: ability('Procession of Repair', 'Spend the action to restore 15% maximum HP to every adjacent allied company, reviving units.'),
  hallowed_cargo: ability('Hallowed Cargo', 'If this company survives a victory, the army recovers additional Wound-Wrights spare parts.'),
  last_light: ability('Last Light', 'When destroyed, applies Hex to every adjacent enemy.'),
  the_errand_passes: ability('The Errand Passes', 'When destroyed, grants an allied company an immediate free move without an attack.'),
  still_on_watch: ability('Still on Watch', 'May retaliate any number of times each round.'),
  swelling_dirge: ability('Swelling Dirge', 'Deals 5% more damage for every company destroyed during this battle.'),
  unfinished_vow: ability('Unfinished Vow', 'The first time it is destroyed each battle, it returns with half its pre-battle company.'),
  crossing: ability('Crossing', 'Spend the action to carry an adjacent allied company to a free battlefield hex.', 'target'),
  sting_and_circle: ability('Sting and Circle', 'Returns to the hex it attacked from after striking.'),
  web: ability('Web', 'Ranged attacks also apply Chill 2.'),
  resin_trail: ability('Resin Trail', 'Hexes crossed become resin; enemies starting a turn there gain Chill.'),
  skim: ability('Skim', 'May strike two adjacent enemy companies in one attacking pass.'),
  brood_call: ability('Brood Call', 'Once per battle, spend the action to summon Larvae based on casualties so far.'),
  pecking_order: ability('Pecking Order', 'Attacks apply Hex 1.'),
  boundary: ability('Boundary', 'Enemies beginning their turn adjacent have their speed halved for that turn.'),
  sweep: ability('Sweep', 'Pushes the target one hex after attacking.'),
  beckoning_song: ability('Beckoning Song', 'Once per battle, forces an enemy to move toward this company.'),
  home_ground: ability('Home Ground', 'Creates two allied thicket hexes when battle begins.'),
  thicket_walk: ability('Thicket Walk', 'May enter and stand on obstacles and thickets.'),
  fowl_legs: ability('Fowl Legs', 'May relocate to a free hex at the end of a round.'),
  crone_favor: ability('Crone’s Favor', 'While it lives, its hero’s Wild and Grave spells cost one less mana.'),
  skirmish: ability('Skirmish', 'May use remaining speed to move after attacking.'),
  war_drums: ability('War Drums', 'Allies that lost units since their last turn gain morale at round start.'),
  pack_hunger: ability('Pack Hunger', 'Deals 15% more damage to companies that have already lost units this battle.'),
  trample: ability('Trample', 'May move through enemies, damaging them as it passes.', 'actor'),
  undergrass: ability('Undergrass', 'Ignores movement blockers and cannot be retaliated against.'),
  storm_wake: ability('Storm Wake', 'After attacking, applies Burn to enemies adjacent to the target.'),
  siege_wall: ability('Wall Section', 'An immobile siege obstacle that blocks movement and protects the defending side.'),
  siege_ram: ability('Siege Ram', 'A broad construct that deals double damage to castle walls.'),
  immobile: ability('Immobile', 'Cannot move from its battlefield position.'),
  mirror_hex: ability('Mirror Hex', 'An immobile mirror created as a battlefield obstacle.'),
  aquatic: ability('Aquatic', 'Ignores shallow-water movement cost and gains speed while standing in shallows.'),
  the_song: ability('The Song', 'Ranged attacks also drain 10 morale from the target.'),
  still_aboard: ability('Still Aboard', 'When destroyed, deals part of its former total HP to its killer.'),
  shellback: ability('Shellback', 'Ranged attacks against it use the minimum of the attacker’s damage range.'),
  the_lure: ability('The Lure', 'Once per battle, forces an enemy to move toward this company.'),
  full_heal: ability('Whole by Morning', 'Heals back to its battle-start strength at the end of every round.'),
  melee_reflect: ability('Blades Return', 'Melee damage is reflected completely to the attacker instead.'),
  mask_reflect: ability('Mirror Mask', 'Enemy melee attackers suffer part of the damage they deal.'),
};

export function validateAbilityPresentation(): void {
  for (const [id, entry] of Object.entries(ABILITY_PRESENTATION)) {
    if (!entry.name.trim() || !entry.description.trim()) {
      throw new Error(`Missing ability presentation: ${id}`);
    }
  }
}
