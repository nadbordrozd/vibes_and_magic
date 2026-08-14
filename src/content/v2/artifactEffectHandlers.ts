import { registeredArtifactEffectHandlers, registerArtifactEffectHandler } from './registries';
import type { V2ArtifactEffectTag } from './schema';

/** Canonical pipeline homes for the doc-63 batch. Runtime resolvers narrow context and payload. */
export const DOC63_ARTIFACT_EFFECT_STAGES: Readonly<Record<V2ArtifactEffectTag, string>> = {
  burn_no_decay: 'turn-advance', counter_scaling: 'apply', impact_bonus: 'damage-computation',
  hex_cap: 'apply', created_hex_bonus: 'tile-registry', heal_bonus: 'apply',
  control_duration: 'ownership-resolution', death_mana: 'death-triggers', summon_bonus: 'apply',
  store_spell: 'hero-act', extra_spell_target: 'target-selection', free_first_spell: 'declare',
  round_one_double_cast: 'hero-act', owner_only_resonance: 'declare',
  random_counter_double: 'turn-advance', enchantment_protection: 'apply',
  enchantment_slots: 'declare', no_consumables: 'hero-act', visible_position: 'adventure-apply',
  mana_cost_reduction: 'declare', no_round_one_cast: 'declare', always_upgraded: 'declare',
  max_mana_penalty: 'declare',
  mountain_step: 'adventure-apply', water_strait: 'adventure-apply',
  return_to_day_start: 'adventure-apply', weekly_marker_teleport: 'adventure-apply',
  movement_carry: 'adventure-apply', object_compass: 'adventure-apply',
  guarded_reward_skip: 'adventure-apply', remote_transfer: 'adventure-apply',
  direct_exchange: 'adventure-apply', weekly_double_build: 'adventure-apply',
  gold_debt: 'adventure-apply', spend_refund: 'adventure-apply',
  dwelling_growth_choice: 'adventure-apply', lost_mine_income: 'adventure-apply',
  least_resource_income: 'adventure-apply', borrow_nearby_spell: 'declare',
  low_tier_free_casting: 'declare', seeded_prebattle_spell: 'declare',
  double_first_summon: 'apply', spell_deflect: 'target-selection',
  enemy_round_one_silence: 'declare', friendly_counter_no_decay: 'turn-advance',
  army_slot_bonus: 'adventure-apply', free_deployment: 'declare',
  inherit_destroyed_stats: 'death-triggers', proportionality_size: 'death-triggers',
  chill_retaliation_block: 'retaliation', faction_grudge_damage: 'damage-computation',
  forced_move_ward: 'apply', exact_hero_count_stats: 'declare',
  weekly_backpack_copy: 'adventure-apply', primary_stat_move: 'declare',
  debt_slot_bonus: 'adventure-apply', income_multiplier: 'adventure-apply',
  odd_day_build_block: 'adventure-apply', city_entry_block: 'adventure-apply',
  knack_block: 'hero-act', artifact_set_bonus: 'declare',
};

export function ensureArtifactEffectHandlersRegistered(): void {
  const registered = registeredArtifactEffectHandlers();
  for (const [id, stage] of Object.entries(DOC63_ARTIFACT_EFFECT_STAGES)) {
    if (!registered.has(id as V2ArtifactEffectTag)) registerArtifactEffectHandler({
      id: id as V2ArtifactEffectTag, stage,
      apply: (_context, payload) => payload,
    });
  }
}
