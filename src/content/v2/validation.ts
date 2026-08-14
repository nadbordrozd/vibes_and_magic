import type { SpellSchool } from '../../core/types';
import {
  EFFECT_PRIMITIVE_CONTRACTS,
  registeredAcquisitionSiteHandlers, registeredArtifactEffectHandlers,
  registeredEffectPrimitiveHandlers, registeredKnackHandlers,
} from './registries';
import {
  type AcquisitionSiteHandler,
  SPELL_MANA_BANDS,
  type ArtifactEffectHandler,
  type ArtifactEffectMetadata,
  type ArtifactSetDefinition,
  type CreatureV2Shape,
  type EffectPrimitiveHandler,
  type KnackDefinition,
  type KnackHandler,
  type SpellScalingShape,
  type SpellTargetingMode,
  type SpellTier,
  type SpellTimeGate,
  V2_ARTIFACT_EFFECT_TAGS,
  type V2AcquisitionSiteDefinition,
} from './schema';

export type ContentValidationPhase = 'transition' | 'migration' | 'final';

interface SpellShape {
  id: string;
  school: SpellSchool;
  mana: number | 'X';
  kind: string;
  base: string;
  plus: string;
  tier?: SpellTier;
  scaling?: SpellScalingShape;
  targeting?: SpellTargetingMode;
  timeGate?: SpellTimeGate;
  primitives?: readonly EffectPrimitiveHandler['id'][];
  cantrip?: boolean;
  acquisition?: { guild: boolean; ordinaryScroll: boolean; provenance: boolean };
}

export function validateEffectPrimitiveCoverage(
  primitiveIds: readonly EffectPrimitiveHandler['id'][],
  handlers: ReadonlyMap<EffectPrimitiveHandler['id'], EffectPrimitiveHandler>,
): void {
  for (const id of new Set(primitiveIds)) {
    if (!Object.hasOwn(EFFECT_PRIMITIVE_CONTRACTS, id)) {
      throw new Error(`Unknown effect primitive: ${id}`);
    }
    const contract = EFFECT_PRIMITIVE_CONTRACTS[id];
    const handler = handlers.get(id);
    if (!handler) throw new Error(`Missing effect primitive handler: ${id}`);
    if (handler.id !== id || handler.stage !== contract.stage || typeof handler.apply !== 'function') {
      throw new Error(`Invalid effect primitive handler: ${id}`);
    }
  }
}

export function validateSpellV2Schemas(
  spells: readonly SpellShape[],
  phase: ContentValidationPhase,
  handlers: ReadonlyMap<
    EffectPrimitiveHandler['id'], EffectPrimitiveHandler
  > = registeredEffectPrimitiveHandlers(),
): void {
  const ids = new Set<string>();
  for (const spell of spells) {
    if (ids.has(spell.id)) throw new Error(`Duplicate spell ID: ${spell.id}`);
    ids.add(spell.id);
    const fields = [spell.tier, spell.scaling, spell.targeting];
    const hasSomeV2 = fields.some((field) => field !== undefined)
      || spell.timeGate !== undefined || spell.primitives !== undefined
      || spell.cantrip !== undefined || spell.acquisition !== undefined;
    if (phase !== 'transition' && fields.some((field) => field === undefined)) {
      throw new Error(`Spell ${spell.id} is missing required v2 metadata`);
    }
    if (!hasSomeV2) continue;
    if (fields.some((field) => field === undefined)) {
      throw new Error(`Spell ${spell.id} has partial v2 metadata`);
    }
    const tier = spell.tier!;
    // Grave Bargain's named rule is the sole printed 0-mana tier-band exception.
    if (spell.mana !== 'X' && spell.id !== 'graveBargain') {
      const [minimum, maximum] = SPELL_MANA_BANDS[tier];
      if (!Number.isInteger(spell.mana) || spell.mana < minimum || spell.mana > maximum) {
        throw new Error(`Spell ${spell.id} mana ${spell.mana} is outside tier ${tier}`);
      }
    }
    if (spell.id === 'graveBargain' && spell.mana !== 0) {
      throw new Error('Grave Bargain must retain its printed 0-mana cost');
    }
    if (spell.cantrip && (tier !== 1 || spell.mana !== 2 || spell.scaling !== 'fixed')) {
      throw new Error(`Cantrip ${spell.id} must be tier 1, cost 2, and use fixed scaling`);
    }
    if (tier === 1 && spell.primitives?.includes('impact-damage')
        && spell.scaling !== 'capped' && !spell.cantrip) {
      throw new Error(`Tier-1 impact spell ${spell.id} must use capped scaling`);
    }
    if ((spell.kind === 'adventure' || spell.kind === 'topology') && tier >= 4
        && !spell.timeGate) {
      throw new Error(`High-tier adventure spell ${spell.id} needs a time gate`);
    }
    if (spell.acquisition?.provenance
        && (spell.acquisition.guild || spell.acquisition.ordinaryScroll)) {
      throw new Error(`Provenance spell ${spell.id} cannot enter ordinary pools`);
    }
    if (tier >= 4 && spell.acquisition?.ordinaryScroll) {
      throw new Error(`High-tier spell ${spell.id} cannot enter the ordinary scroll pool`);
    }
    if (spell.id === 'summonSkiff'
        && (spell.acquisition?.guild || spell.acquisition?.ordinaryScroll)) {
      throw new Error('Summon Skiff cannot enter ordinary pools');
    }
    validateEffectPrimitiveCoverage(spell.primitives ?? [], handlers);
  }
  if (phase !== 'transition' && spells.some((spell) => !spell.acquisition)) {
    throw new Error('Migrated spell catalog requires acquisition-pool metadata');
  }
  if (phase !== 'final') return;
  if (spells.length !== 124) throw new Error(`Final spell catalog needs 124 spells, found ${spells.length}`);
  const expected = [8, 8, 7, 5, 3];
  for (const school of ['rite', 'craft', 'grave', 'wild'] as const) {
    const schoolSpells = spells.filter((spell) => spell.school === school);
    if (schoolSpells.length !== 31) throw new Error(`${school} needs 31 spells`);
    expected.forEach((count, index) => {
      if (schoolSpells.filter((spell) => spell.tier === index + 1).length !== count) {
        throw new Error(`${school} tier ${index + 1} needs ${count} spells`);
      }
    });
    if (schoolSpells.filter((spell) => spell.cantrip).length !== 1) {
      throw new Error(`${school} needs exactly one cantrip`);
    }
    for (const tier of [1, 2, 3, 4, 5] as const) {
      if (!schoolSpells.some((spell) => spell.tier === tier && spell.acquisition?.guild)) {
        throw new Error(`${school} tier ${tier} has no guild-eligible spell`);
      }
    }
  }
  if (spells.some((spell) => spell.base.trim() === spell.plus.trim())) {
    throw new Error('Final spell catalog requires distinct Standard and Upgraded rules');
  }
}

function resistanceKind(unit: CreatureV2Shape, kind: string): boolean {
  return unit.resistances?.some((entry) => entry.kind === kind) ?? false;
}

export function validateCreatureV2Schemas(
  units: readonly CreatureV2Shape[],
  knownSpellIds: ReadonlySet<string>,
): void {
  for (const unit of units) {
    if (unit.caster) {
      if (unit.caster.repertoire.length < 1 || unit.caster.repertoire.length > 3
          || new Set(unit.caster.repertoire).size !== unit.caster.repertoire.length) {
        throw new Error(`Creature caster ${unit.id} needs one to three distinct spells`);
      }
      if (!Number.isInteger(unit.caster.charges) || unit.caster.charges <= 0
          || !Number.isFinite(unit.caster.castPower) || unit.caster.castPower < 0) {
        throw new Error(`Creature caster ${unit.id} has invalid per-company casting values`);
      }
      for (const spellId of unit.caster.repertoire) {
        if (!knownSpellIds.has(spellId)) throw new Error(`Creature caster ${unit.id} references ${spellId}`);
      }
    }
    if (unit.attackPattern && !['all-adjacent', 'breath', 'cleave', 'line-strike',
      'blast-shot', 'arc-shot', 'chain-shot'].includes(unit.attackPattern.kind)) {
      throw new Error(`Creature ${unit.id} has invalid attack-pattern kind`);
    }
    if (unit.attackPattern?.kind === 'line-strike'
        && (!Number.isInteger(unit.attackPattern.range) || unit.attackPattern.range < 1)) {
      throw new Error(`Creature ${unit.id} has invalid line-strike range`);
    }
    const resistances = unit.resistances ?? [];
    if (new Set(resistances.map((entry) => JSON.stringify(entry))).size !== resistances.length) {
      throw new Error(`Creature ${unit.id} repeats resistance metadata`);
    }
    const resistanceAbilities: Record<string, string> = {
      'warded-hide': 'warded_hide', 'spell-shrug': 'spell_shrug',
      'low-magic-immune': 'low_magic_immune', 'school-resistant': 'school_resistant',
      'spell-ward': 'spell_ward', 'spell-deflect': 'spell_deflect',
      spellbound: 'spellbound', 'spell-frail': 'spell_frail',
    };
    for (const resistance of resistances as readonly any[]) {
      if (!['warded-hide', 'spell-shrug', 'low-magic-immune', 'school-resistant',
        'counter-immune', 'spell-ward', 'spell-deflect', 'spellbound', 'spell-frail']
        .includes(resistance.kind)) throw new Error(`Creature ${unit.id} has invalid resistance kind`);
      if (resistance.kind === 'warded-hide' && ![25, 40, 60].includes(resistance.percent)) {
        throw new Error(`Creature ${unit.id} has invalid warded-hide percent`);
      }
      if (resistance.kind === 'spell-ward' && ![1, 2].includes(resistance.charges)) {
        throw new Error(`Creature ${unit.id} has invalid spell-ward charges`);
      }
      if (resistance.kind === 'school-resistant'
          && !['rite', 'craft', 'grave', 'wild'].includes(resistance.school)) {
        throw new Error(`Creature ${unit.id} has invalid resistant school`);
      }
      if (resistance.kind === 'counter-immune'
          && !['burn', 'chill', 'hex'].includes(resistance.counter)) {
        throw new Error(`Creature ${unit.id} has invalid immune counter`);
      }
    }
    for (const resistance of resistances) {
      const ability = resistance.kind === 'counter-immune'
        ? resistance.counter === 'burn' ? 'unburnable'
          : resistance.counter === 'chill' ? 'unchillable' : 'unhexable'
        : resistanceAbilities[resistance.kind];
      if (ability && unit.abilities && !unit.abilities.includes(ability as never)) {
        throw new Error(`Creature ${unit.id} must print resistance ability ${ability}`);
      }
    }
    for (const ability of unit.abilities ?? []) {
      const metadata = Object.entries(resistanceAbilities).find(([, printed]) => printed === ability);
      const matchesCounter = ability === 'unburnable' ? 'burn'
        : ability === 'unchillable' ? 'chill' : ability === 'unhexable' ? 'hex' : null;
      if (metadata && !resistanceKind(unit, metadata[0])) {
        throw new Error(`Creature ${unit.id} prints ${ability} without resistance metadata`);
      }
      if (matchesCounter && !resistances.some((entry) => entry.kind === 'counter-immune'
          && entry.counter === matchesCounter)) {
        throw new Error(`Creature ${unit.id} prints ${ability} without resistance metadata`);
      }
    }
    if (unit.attackPattern && unit.abilities && !unit.abilities.includes(unit.attackPattern.kind
      .replace('-', '_') as never)) throw new Error(`Creature ${unit.id} must print its attack pattern`);
    for (const ability of ['all_adjacent', 'breath', 'cleave', 'line_strike',
      'blast_shot', 'arc_shot'] as const) {
      if (unit.abilities?.includes(ability)
          && unit.attackPattern?.kind.replace('-', '_') !== ability) {
        throw new Error(`Creature ${unit.id} prints ${ability} without matching attack-pattern metadata`);
      }
    }
    if (unit.caster && unit.abilities && !unit.abilities.some((ability) =>
      ability === 'caster' || ability === 'hedge_caster')) {
      throw new Error(`Creature caster ${unit.id} must print its casting ability`);
    }
    if (unit.caster && unit.abilities) {
      const degenerate = unit.caster.repertoire.length === 1 && unit.caster.charges === 1;
      if (unit.abilities.includes('hedge_caster') !== degenerate
          || unit.abilities.includes('caster') === degenerate) {
        throw new Error(`Creature caster ${unit.id} must print exactly ${degenerate ? 'hedge_caster' : 'caster'}`);
      }
    }
    if (!unit.caster && unit.abilities?.some((ability) =>
      ability === 'caster' || ability === 'hedge_caster')) {
      throw new Error(`Creature ${unit.id} prints a casting ability without caster metadata`);
    }
  }
  const resistant = units.filter((unit) => (unit.resistances?.some((entry) =>
    entry.kind !== 'spell-frail') ?? false));
  if (resistant.length * 5 > units.length) {
    throw new Error(`Resistance ration exceeded: ${resistant.length}/${units.length}`);
  }
  if (units.filter((unit) => resistanceKind(unit, 'spellbound')).length > 3) {
    throw new Error('At most three catalog creatures may be spellbound');
  }
  for (const faction of new Set(units.map((unit) => unit.faction))) {
    const rationed = units.filter((unit) => unit.faction === faction
      && (resistanceKind(unit, 'low-magic-immune')
        || resistanceKind(unit, 'school-resistant')));
    if (rationed.length > 2) throw new Error(`${faction} has too many tier/school immunities`);
  }
}

export function validateArtifactV2Schemas(
  artifacts: readonly {
    id: string; class?: string; effects: readonly string[]; setId?: string;
    effectMetadata?: Readonly<Record<string, ArtifactEffectMetadata>>;
  }[],
  sets: Readonly<Record<string, ArtifactSetDefinition>>,
  phase: ContentValidationPhase,
  handlers: ReadonlyMap<
    ArtifactEffectHandler['id'], ArtifactEffectHandler
  > = registeredArtifactEffectHandlers(),
): void {
  const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
  for (const artifact of artifacts) {
    if (artifact.setId && !sets[artifact.setId]) {
      throw new Error(`Artifact ${artifact.id} references unknown set ${artifact.setId}`);
    }
    for (const tag of Object.keys(artifact.effectMetadata ?? {})) {
      if (!artifact.effects.includes(tag)) {
        throw new Error(`Artifact ${artifact.id} has metadata for absent effect ${tag}`);
      }
      const metadata = artifact.effectMetadata![tag];
      if (!metadata.handlerId.trim() || !metadata.stage.trim()) {
        throw new Error(`Artifact ${artifact.id} effect ${tag} has no registered handler identity`);
      }
      if (metadata.handlerId !== tag) {
        throw new Error(`Artifact ${artifact.id} effect ${tag} must dispatch by effect tag`);
      }
      const handler = handlers.get(metadata.handlerId);
      if (!handler) {
        throw new Error(`Missing artifact effect handler: ${metadata.handlerId}`);
      }
      if (handler.stage !== metadata.stage || typeof handler.apply !== 'function') {
        throw new Error(`Artifact effect handler ${metadata.handlerId} must register at ${metadata.stage}`);
      }
    }
    if (phase === 'final' && artifact.effects.some((tag) =>
      V2_ARTIFACT_EFFECT_TAGS.includes(tag as never) && !artifact.effectMetadata?.[tag])) {
      throw new Error(`Artifact ${artifact.id} has an effect without handler metadata`);
    }
  }
  for (const set of Object.values(sets)) {
    if (set.id.trim() === '' || set.name.trim() === '' || set.memberIds.length < 2
        || new Set(set.memberIds).size !== set.memberIds.length) {
      throw new Error(`Invalid artifact set: ${set.id}`);
    }
    for (const id of set.memberIds) {
      const member = artifacts.find((artifact) => artifact.id === id);
      if (!artifactIds.has(id) || member?.setId !== set.id) {
        throw new Error(`Artifact set ${set.id} has invalid member ${id}`);
      }
    }
    let previous = 0;
    for (const bonus of set.bonuses) {
      if (!Number.isInteger(bonus.pieces) || bonus.pieces <= previous
          || bonus.pieces > set.memberIds.length || !bonus.description.trim()
          || bonus.effectTags.length === 0) {
        throw new Error(`Artifact set ${set.id} has invalid bonus threshold`);
      }
      previous = bonus.pieces;
    }
  }
  if (phase === 'final') {
    const expected: Readonly<Record<string, number>> = {
      vanilla: 36, charm: 44, relic: 45, burden: 13, kit: 4, trinket: 6,
    };
    if (artifacts.length !== 148) {
      throw new Error(`Final artifact catalog needs 148 definitions, found ${artifacts.length}`);
    }
    for (const [artifactClass, count] of Object.entries(expected)) {
      if (artifacts.filter((artifact) => artifact.class === artifactClass).length !== count) {
        throw new Error(`Final artifact catalog needs ${count} ${artifactClass} definitions`);
      }
    }
  }
}

export function validateSkillOfferGates(
  skills: readonly { id: string; offerGate?: { minimumHeroLevel: number } }[],
  phase: ContentValidationPhase = 'transition',
): void {
  for (const skill of skills) {
    const level = skill.offerGate?.minimumHeroLevel;
    if (level !== undefined && (!Number.isInteger(level) || level < 1)) {
      throw new Error(`Skill ${skill.id} has an invalid offer gate`);
    }
  }
  if (phase === 'final' && skills.length !== 30) {
    throw new Error(`Final skill catalog needs 30 skills, found ${skills.length}`);
  }
}

export function validateKnackCatalog(
  catalog: readonly KnackDefinition[],
  phase: ContentValidationPhase,
  handlers: ReadonlyMap<KnackHandler['id'], KnackHandler> = registeredKnackHandlers(),
): void {
  if (phase === 'transition' && catalog.length === 0) return;
  const factions = new Set(catalog.map((knack) => knack.faction));
  const playableFactions = new Set([
    'hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass',
  ]);
  if (catalog.length !== 6 || factions.size !== 6
      || [...factions].some((faction) => !playableFactions.delete(faction))
      || playableFactions.size !== 0) {
    throw new Error('Knack catalog needs exactly one entry per playable faction');
  }
  for (const knack of catalog) {
    if (!knack.id.trim() || !knack.name.trim() || !knack.flavor.trim()
        || !knack.handlerId.trim() || !knack.iconAssetId.trim()) {
      throw new Error(`Incomplete Knack definition: ${knack.id}`);
    }
    const handler = handlers.get(knack.handlerId);
    if (!handler) throw new Error(`Missing Knack handler: ${knack.handlerId}`);
    if (handler.stage !== 'hero-act' || typeof handler.apply !== 'function') {
      throw new Error(`Knack handler ${knack.handlerId} must register at hero-act`);
    }
    if (knack.ranks[1].level !== 1 || knack.ranks[2].level !== 6
        || knack.ranks[3].level !== 12
        || Object.values(knack.ranks).some((rank) => !rank.effectText.trim())) {
      throw new Error(`Invalid Knack rank ladder: ${knack.id}`);
    }
  }
}

export function validateAcquisitionSites(
  sites: readonly V2AcquisitionSiteDefinition[],
  phase: ContentValidationPhase,
  handlers: ReadonlyMap<
    AcquisitionSiteHandler['id'], AcquisitionSiteHandler
  > = registeredAcquisitionSiteHandlers(),
): void {
  if (phase === 'transition' && sites.length === 0) return;
  const expected = new Set(['stacks', 'wildShrine', 'reliquaryOfPages']);
  if (sites.length !== expected.size || sites.some((site) => !expected.delete(site.kind))) {
    throw new Error('Acquisition site catalog needs The Stacks, Wild Shrine, and Reliquary of Pages');
  }
  if (sites.some((site) => !site.name.trim() || !site.flavor.trim() || !site.handlerId.trim())) {
    throw new Error('Acquisition site catalog contains an incomplete definition');
  }
  for (const site of sites) {
    const handler = handlers.get(site.handlerId);
    if (!handler) throw new Error(`Missing acquisition site handler: ${site.handlerId}`);
    if (handler.stage !== 'adventure-interaction' || typeof handler.apply !== 'function') {
      throw new Error(`Acquisition site handler ${site.handlerId} must register at adventure-interaction`);
    }
  }
}
