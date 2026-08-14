import type {
  ArtifactSlot, FactionId, SecondarySkillId, SpellId, SpellSchool, UnitId,
} from '../../core/types';
import type { AbilityId } from '../../core/contentTypes';

export const CONTENT_SCHEMA_VERSION = 'docs-60-67-v2-spell-catalog.5' as const;

export const SPELL_TIERS = [1, 2, 3, 4, 5] as const;
export type SpellTier = typeof SPELL_TIERS[number];
export type SpellScalingShape = 'fixed' | 'capped' | 'open';
export type SpellTargetingMode =
  | 'none' | 'self' | 'single-ally' | 'single-enemy' | 'single-any'
  | 'position' | 'positions' | 'counter-pile' | 'enchantment'
  | 'owned-hero' | 'owned-site' | 'enemy-hero' | 'enemy-mine'
  | 'mass-enemy' | 'mass-ally' | 'mass-all';
export type SpellTimeGate = 'once-per-day' | 'once-per-week';

export const SPELL_MANA_BANDS: Readonly<Record<SpellTier, readonly [number, number]>> = {
  1: [2, 5],
  2: [5, 9],
  3: [8, 14],
  4: [12, 20],
  5: [18, 30],
};

export interface SpellV2Fields {
  tier?: SpellTier;
  scaling?: SpellScalingShape;
  targeting?: SpellTargetingMode;
  timeGate?: SpellTimeGate;
  /** Player-wide effects debit the player's serialized ledger; every other gate is per hero. */
  timeGateScope?: 'hero' | 'player';
  primitives?: readonly EffectPrimitiveId[];
  cantrip?: boolean;
  acquisition?: {
    guild: boolean;
    ordinaryScroll: boolean;
    provenance: boolean;
  };
}

export const EFFECT_PRIMITIVE_IDS = [
  'impact-damage', 'resurrect', 'mind-control', 'damage-link', 'teleport-stack',
  'stun', 'berserk', 'clone', 'spell-immune', 'counter-detonate',
  'counter-convert', 'sacrifice', 'grant-shots', 'grant-extra-action',
  'delayed-trigger', 'mid-battle-resonance', 'hazard-hex', 'mana-drain',
  'hero-teleport-radius', 'terrain-ignore-day', 'remote-mana', 'production-steal',
  'enemy-movement-denial', 'prebattle-condition', 'guardian-intel',
] as const;
export type EffectPrimitiveId = typeof EFFECT_PRIMITIVE_IDS[number];

export type EffectPrimitiveDomain = 'combat' | 'adventure';
export type EffectPrimitiveStage =
  | 'declare' | 'target-selection' | 'ownership-resolution'
  | 'damage-computation' | 'damage-routing' | 'apply' | 'death-triggers'
  | 'retaliation' | 'turn-advance' | 'tile-registry' | 'adventure-apply';

export interface EffectPrimitiveContract {
  id: EffectPrimitiveId;
  domain: EffectPrimitiveDomain;
  stage: EffectPrimitiveStage;
}

export interface EffectPrimitiveHandler {
  id: EffectPrimitiveId;
  stage: EffectPrimitiveStage;
  /**
   * The shared dispatch boundary. Concrete state/payload types are narrowed by the owning
   * resolver when the primitive is implemented; content validation only depends on identity.
   */
  apply: (context: unknown, payload: unknown) => unknown;
}

export type CreatureResistance =
  | { kind: 'warded-hide'; percent: 25 | 40 | 60 }
  | { kind: 'spell-shrug' }
  | { kind: 'low-magic-immune' }
  | { kind: 'school-resistant'; school: SpellSchool }
  | { kind: 'counter-immune'; counter: 'burn' | 'chill' | 'hex' }
  | { kind: 'spell-ward'; charges: 1 | 2 }
  | { kind: 'spell-deflect' }
  | { kind: 'spellbound' }
  | { kind: 'spell-frail' };

export interface CreatureCasterMetadata {
  /** One to three spells. Charges and cast power are per company, never per unit. */
  repertoire: readonly SpellId[];
  charges: number;
  castPower: number;
}

export type CreatureAttackPattern =
  | { kind: 'all-adjacent' }
  | { kind: 'breath' }
  | { kind: 'cleave' }
  | { kind: 'line-strike'; range: number }
  | { kind: 'blast-shot' }
  | { kind: 'arc-shot' }
  | { kind: 'chain-shot' };

export interface CreatureV2Fields {
  caster?: CreatureCasterMetadata;
  resistances?: readonly CreatureResistance[];
  attackPattern?: CreatureAttackPattern;
}

export interface SkillOfferGate {
  minimumHeroLevel: number;
}

export type ItemContentKind = 'consumable' | 'scroll' | 'spell-tome';
export const V2_ACQUISITION_SITE_KINDS = [
  'stacks', 'wildShrine', 'reliquaryOfPages',
] as const;
export type V2AcquisitionSiteKind = typeof V2_ACQUISITION_SITE_KINDS[number];
export type AcquisitionSiteHandlerId = V2AcquisitionSiteKind;

export interface V2AcquisitionSiteDefinition {
  kind: V2AcquisitionSiteKind;
  name: string;
  flavor: string;
  handlerId: AcquisitionSiteHandlerId;
  oncePerHero: boolean;
}

export type KnackRank = 1 | 2 | 3;
export const KNACK_HANDLER_IDS = [
  'hearten', 'patch', 'errand-remembered', 'lay-resin', 'ill-wish', 'blood-drum',
] as const;
export type KnackHandlerId = typeof KNACK_HANDLER_IDS[number];
export interface KnackRankDefinition {
  level: 1 | 6 | 12;
  effectText: string;
}

export interface KnackDefinition {
  id: string;
  faction: FactionId;
  name: string;
  flavor: string;
  handlerId: KnackHandlerId;
  targeting: SpellTargetingMode;
  ranks: Record<KnackRank, KnackRankDefinition>;
  iconAssetId: string;
}

export const V2_ARTIFACT_EFFECT_TAGS = [
  'burn_no_decay', 'counter_scaling', 'impact_bonus', 'hex_cap',
  'created_hex_bonus', 'heal_bonus', 'control_duration', 'death_mana',
  'summon_bonus', 'store_spell', 'extra_spell_target', 'free_first_spell',
  'round_one_double_cast', 'owner_only_resonance', 'random_counter_double',
  'enchantment_protection', 'enchantment_slots', 'no_consumables',
  'visible_position', 'mana_cost_reduction', 'no_round_one_cast',
  'always_upgraded', 'max_mana_penalty', 'mountain_step', 'water_strait',
  'return_to_day_start', 'weekly_marker_teleport', 'movement_carry', 'object_compass',
  'guarded_reward_skip', 'remote_transfer', 'direct_exchange', 'weekly_double_build',
  'gold_debt', 'spend_refund', 'dwelling_growth_choice', 'lost_mine_income',
  'least_resource_income', 'borrow_nearby_spell', 'low_tier_free_casting',
  'seeded_prebattle_spell', 'double_first_summon', 'spell_deflect',
  'enemy_round_one_silence', 'friendly_counter_no_decay', 'army_slot_bonus',
  'free_deployment', 'inherit_destroyed_stats', 'proportionality_size',
  'chill_retaliation_block', 'faction_grudge_damage', 'forced_move_ward',
  'exact_hero_count_stats', 'weekly_backpack_copy', 'primary_stat_move',
  'debt_slot_bonus', 'income_multiplier', 'odd_day_build_block', 'city_entry_block',
  'knack_block', 'artifact_set_bonus',
] as const;
export type V2ArtifactEffectTag = typeof V2_ARTIFACT_EFFECT_TAGS[number];

export interface ArtifactEffectMetadata {
  handlerId: V2ArtifactEffectTag;
  stage: string;
  values?: Readonly<Record<string, number | string | boolean>>;
}

export interface ExecutableContentHandler<Id extends string, Stage extends string = string> {
  id: Id;
  stage: Stage;
  apply: (context: unknown, payload: unknown) => unknown;
}

export type ArtifactEffectHandler = ExecutableContentHandler<V2ArtifactEffectTag>;
export type KnackHandler = ExecutableContentHandler<KnackHandlerId, 'hero-act'>;
export type AcquisitionSiteHandler = ExecutableContentHandler<
  AcquisitionSiteHandlerId, 'adventure-interaction'
>;

export interface ArtifactSetBonus {
  pieces: number;
  effectTags: readonly string[];
  description: string;
}

export interface ArtifactSetDefinition {
  id: string;
  name: string;
  memberIds: readonly string[];
  bonuses: readonly ArtifactSetBonus[];
}

export type ContentAssetFamily =
  | 'spell' | 'skill' | 'knack' | 'creature' | 'artifact' | 'item' | 'site'
  | 'lexicon';
export type ArtifactAssetClass = 'vanilla' | 'charm' | 'relic' | 'burden' | 'kit' | 'trinket';
export type SkillAssetFamily =
  | 'movement' | 'information' | 'economy' | 'magic' | 'items' | 'drafting'
  | 'army' | 'control' | 'siege' | 'hero-combat' | 'neutral-interaction';
export type CreatureAssetCulture =
  | FactionId | 'seamborn' | 'gloamingCourt' | 'driftfolk' | 'unstruckBell'
  | 'neutralBeast' | 'hagwoodNeutral';

export type ContentAssetSemantics =
  | { family: 'spell'; school: SpellSchool; tier: SpellTier }
  | { family: 'skill'; skillFamily: SkillAssetFamily }
  | { family: 'knack'; faction: FactionId }
  | { family: 'creature'; culture: CreatureAssetCulture; tier: number }
  | { family: 'artifact'; artifactClass: ArtifactAssetClass; slot: ArtifactSlot }
  | { family: 'item'; itemKind: ItemContentKind }
  | { family: 'site'; siteKind: V2AcquisitionSiteKind }
  | { family: 'lexicon'; category: string };

export interface ContentAssetRequirement {
  canonicalId: string;
  semantics: ContentAssetSemantics;
  /** Existing accepted content never receives placeholder leniency. */
  introducedBy: 'existing' | 'docs-60-67';
  nativeAssetId: string;
  /** Literal art subject; placeholders relax bitmap readiness, never worklist authorship. */
  visualSubject: string;
  accessibleName: string;
}

export type ContentAssetMode = 'development' | 'release';
export type ResolvedContentAsset =
  | { kind: 'native'; assetId: string }
  | { kind: 'placeholder'; placeholderId: string; semantics: ContentAssetSemantics };

export interface SkillV2Shape {
  id: SecondarySkillId | string;
  offerGate?: SkillOfferGate;
}

export interface CreatureV2Shape extends CreatureV2Fields {
  id: UnitId | string;
  faction: FactionId | string;
  abilities?: readonly AbilityId[];
}
