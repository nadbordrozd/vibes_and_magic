import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FactionId } from '../../core/types';
import { validateArtifacts } from '../artifacts';
import { validateSkills } from '../skills';
import { SPELLS, validateSpells } from '../spells';
import { validateUnits } from '../units';
import {
  developmentPlaceholderId, resolveContentAsset, validateContentAssets,
} from '../v2/assets';
import {
  EFFECT_PRIMITIVE_CONTRACTS, clearContentV2HandlersForTest,
  effectPrimitiveHandler, registerAcquisitionSiteHandler, registerArtifactEffectHandler,
  registerEffectPrimitiveHandler, registerKnackHandler,
} from '../v2/registries';
import type {
  AcquisitionSiteHandler, ArtifactEffectHandler, ContentAssetRequirement,
  CreatureV2Shape, EffectPrimitiveHandler, KnackDefinition, KnackHandler,
} from '../v2/schema';
import {
  validateAcquisitionSites, validateArtifactV2Schemas,
  validateCreatureV2Schemas, validateEffectPrimitiveCoverage,
  validateKnackCatalog, validateSkillOfferGates, validateSpellV2Schemas,
} from '../v2/validation';
import { derivedKnack, knackRankForLevel } from '../knacks';
import { ensureAdventurePrimitiveHandlersRegistered } from '../../core/game/adventurePrimitives';
import { ensureCombatPrimitiveHandlersRegistered } from '../../core/combat/primitives';

const handler = (id: EffectPrimitiveHandler['id']): EffectPrimitiveHandler => ({
  id,
  stage: EFFECT_PRIMITIVE_CONTRACTS[id].stage,
  apply: (_context, payload) => payload,
});

describe('docs 60–67 content schema foundation', () => {
  beforeEach(clearContentV2HandlersForTest);
  afterEach(clearContentV2HandlersForTest);

  it('keeps every shipped v1 catalog valid during the transition', () => {
    ensureAdventurePrimitiveHandlersRegistered();
    ensureCombatPrimitiveHandlersRegistered();
    expect(() => {
      validateSpells(); validateUnits(); validateArtifacts(); validateSkills();
    }).not.toThrow();
  });

  it('validates tier bands, complete metadata, time gates, and primitive handlers', () => {
    registerEffectPrimitiveHandler(handler('impact-damage'));
    const spell = {
      id: 'testImpact', school: 'rite' as const, mana: 4, kind: 'staple',
      base: 'Damage.', plus: 'More damage.', tier: 1 as const, scaling: 'capped' as const,
      targeting: 'single-enemy' as const, primitives: ['impact-damage'] as const,
    };
    expect(() => validateSpellV2Schemas([spell], 'transition')).not.toThrow();
    expect(() => validateSpellV2Schemas([{ ...spell, mana: 6 }], 'transition'))
      .toThrow(/outside tier 1/);
    expect(() => validateSpellV2Schemas([{ ...spell, scaling: undefined }], 'transition'))
      .toThrow(/partial v2 metadata/);
    expect(() => validateSpellV2Schemas([{ ...spell, kind: 'adventure', tier: 4, mana: 16,
      scaling: 'open' }], 'transition')).toThrow(/time gate/);
    clearContentV2HandlersForTest();
    expect(() => validateSpellV2Schemas([spell], 'transition')).toThrow(/Missing effect primitive/);
  });

  it('makes ordinary spell catalog validation consult the live primitive registry', () => {
    const rally = SPELLS.rally;
    Object.assign(rally, {
      tier: 1, scaling: 'fixed', targeting: 'single-ally',
      primitives: ['grant-extra-action'],
    });
    try {
      expect(() => validateSpells()).toThrow(/Missing effect primitive handler/);
      ensureAdventurePrimitiveHandlersRegistered();
      ensureCombatPrimitiveHandlersRegistered();
      expect(() => validateSpells()).not.toThrow();
    } finally {
      delete rally.tier; delete rally.scaling; delete rally.targeting; delete rally.primitives;
    }
  });

  it('registers primitives only once and at their canonical pipeline stage', () => {
    registerEffectPrimitiveHandler(handler('counter-detonate'));
    expect(effectPrimitiveHandler('counter-detonate')).toBeDefined();
    expect(() => registerEffectPrimitiveHandler(handler('counter-detonate')))
      .toThrow(/Duplicate/);
    expect(() => registerEffectPrimitiveHandler({
      ...handler('damage-link'), stage: 'apply',
    })).toThrow(/must register at damage-routing/);
    expect(() => registerEffectPrimitiveHandler({
      id: 'unknown' as EffectPrimitiveHandler['id'], stage: 'apply', apply: () => undefined,
    })).toThrow(/Unknown effect primitive/);
    expect(() => validateEffectPrimitiveCoverage(
      ['counter-detonate'], new Map([['counter-detonate', handler('counter-detonate')]]),
    )).not.toThrow();
  });

  it('validates per-company caster metadata, attack patterns, and resistance rationing', () => {
    const plain = (id: string): CreatureV2Shape => ({ id, faction: 'hearthguard' });
    const units: CreatureV2Shape[] = [
      { ...plain('caster'), caster: { repertoire: ['rally'], charges: 2, castPower: 3 },
        attackPattern: { kind: 'line-strike', range: 3 },
        resistances: [{ kind: 'spell-ward', charges: 1 }] },
      plain('two'), plain('three'), plain('four'), plain('five'),
    ];
    expect(() => validateCreatureV2Schemas(units, new Set(['rally']))).not.toThrow();
    expect(() => validateCreatureV2Schemas(units.slice(0, 4), new Set(['rally'])))
      .toThrow(/Resistance ration exceeded/);
    expect(() => validateCreatureV2Schemas([
      { ...plain('bad'), caster: { repertoire: ['missing' as never], charges: 1, castPower: 1 } },
    ], new Set(['rally']))).toThrow(/references missing/);
  });

  it('validates artifact effect metadata and reciprocal, ordered set membership', () => {
    const artifacts: Array<{
      id: string; effects: string[]; setId: string;
      effectMetadata: Record<string, { handlerId: ArtifactEffectHandler['id']; stage: string }>;
    }> = [
      { id: 'a', effects: ['burn_no_decay'], setId: 'set',
        effectMetadata: { burn_no_decay: { handlerId: 'burn_no_decay', stage: 'turn-advance' } } },
      { id: 'b', effects: ['heal_bonus'], setId: 'set',
        effectMetadata: { heal_bonus: { handlerId: 'heal_bonus', stage: 'apply' } } },
    ];
    const sets = { set: { id: 'set', name: 'Set', memberIds: ['a', 'b'], bonuses: [
      { pieces: 2, effectTags: ['set-bonus'], description: 'A complete bonus.' },
    ] } };
    expect(() => validateArtifactV2Schemas(artifacts, sets, 'transition'))
      .toThrow(/Missing artifact effect handler/);
    registerArtifactEffectHandler({
      id: 'burn_no_decay', stage: 'turn-advance', apply: () => undefined,
    });
    registerArtifactEffectHandler({ id: 'heal_bonus', stage: 'apply', apply: () => undefined });
    expect(() => validateArtifactV2Schemas(artifacts, sets, 'transition')).not.toThrow();
    expect(() => registerArtifactEffectHandler({
      id: 'heal_bonus', stage: 'apply', apply: () => undefined,
    })).toThrow(/Duplicate artifact effect/);
    expect(() => validateArtifactV2Schemas([{ ...artifacts[0], setId: undefined,
      effectMetadata: { burn_no_decay: {
        handlerId: 'burn_no_decay', stage: 'damage-routing',
      } },
    }], {}, 'transition')).toThrow(/must register at damage-routing/);
    expect(() => validateArtifactV2Schemas(
      [{ id: 'a', effects: ['burn_no_decay'], setId: 'missing' }], {}, 'transition',
    )).toThrow(/unknown set/);
    expect(() => validateArtifactV2Schemas(
      [{ id: 'a', effects: ['burn_no_decay'] }], {}, 'final',
    )).toThrow(/without handler metadata/);
  });

  it('expresses skill gates, derived Knack ranks, and all three acquisition site kinds', () => {
    expect(() => validateSkillOfferGates([
      { id: 'reaper', offerGate: { minimumHeroLevel: 5 } },
    ])).not.toThrow();
    expect(() => validateSkillOfferGates([
      { id: 'bad', offerGate: { minimumHeroLevel: 0 } },
    ])).toThrow(/invalid offer gate/);
    expect([knackRankForLevel(1), knackRankForLevel(6), knackRankForLevel(12)])
      .toEqual([1, 2, 3]);

    const factions: FactionId[] = [
      'hearthguard', 'woundWrights', 'unfinished', 'vespiary', 'hagwood', 'wildergrass',
    ];
    const knackHandlerIds: KnackHandler['id'][] = [
      'hearten', 'patch', 'errand-remembered', 'lay-resin', 'ill-wish', 'blood-drum',
    ];
    const catalog = factions.map((faction, index): KnackDefinition => ({
      id: `${faction}Knack`, faction, name: 'Knack', flavor: 'A faction voice.',
      handlerId: knackHandlerIds[index], targeting: 'single-ally', iconAssetId: `knack:${faction}`,
      ranks: {
        1: { level: 1, effectText: 'First.' }, 2: { level: 6, effectText: 'Second.' },
        3: { level: 12, effectText: 'Third.' },
      },
    }));
    expect(() => validateKnackCatalog(catalog, 'final')).toThrow(/Missing Knack handler/);
    knackHandlerIds.forEach((id) => registerKnackHandler({
      id, stage: 'hero-act', apply: () => undefined,
    }));
    expect(() => validateKnackCatalog(catalog, 'final')).not.toThrow();
    expect(() => validateKnackCatalog([
      ...catalog.slice(0, 5), { ...catalog[5], faction: 'notPlayable' as FactionId },
    ], 'final')).toThrow(/exactly one entry per playable faction/);
    expect(derivedKnack('hagwood', 12,
      Object.fromEntries(catalog.map((entry) => [entry.faction, entry])))).toMatchObject({ rank: 3 });

    const sites = [
      { kind: 'stacks', name: 'The Stacks', flavor: 'Pages wait.', handlerId: 'stacks', oncePerHero: true },
      { kind: 'wildShrine', name: 'Wild Shrine', flavor: 'It chooses.', handlerId: 'wildShrine', oncePerHero: true },
      { kind: 'reliquaryOfPages', name: 'Reliquary of Pages', flavor: 'Guarded leaves.', handlerId: 'reliquaryOfPages', oncePerHero: false },
    ] as const;
    expect(() => validateAcquisitionSites(sites, 'final'))
      .toThrow(/Missing acquisition site handler/);
    sites.forEach((site) => registerAcquisitionSiteHandler({
      id: site.handlerId, stage: 'adventure-interaction', apply: () => undefined,
    }));
    expect(() => validateAcquisitionSites(sites, 'final')).not.toThrow();

    expect(() => registerKnackHandler({
      id: 'not-a-knack' as KnackHandler['id'], stage: 'hero-act', apply: () => undefined,
    })).toThrow(/Unknown Knack handler/);
    expect(() => registerKnackHandler({
      id: 'patch', stage: 'wrong-stage' as KnackHandler['stage'], apply: () => undefined,
    })).toThrow(/must register at hero-act/);
    expect(() => registerAcquisitionSiteHandler({
      id: 'not-a-site' as AcquisitionSiteHandler['id'],
      stage: 'adventure-interaction', apply: () => undefined,
    })).toThrow(/Unknown acquisition site handler/);
  });

  it('uses deterministic typed placeholders only for new development content', () => {
    const requirement: ContentAssetRequirement = {
      canonicalId: 'artifact:theBellows', nativeAssetId: 'artifact:theBellows',
      introducedBy: 'docs-60-67', accessibleName: 'The Bellows',
      visualSubject: 'small leather forge bellows dusted with ash',
      semantics: { family: 'artifact', artifactClass: 'charm', slot: 'misc' },
    };
    expect(developmentPlaceholderId(requirement.semantics))
      .toBe('content-placeholder:artifact:charm:misc');
    expect(resolveContentAsset(requirement, new Set(), 'development')).toMatchObject({
      kind: 'placeholder', placeholderId: 'content-placeholder:artifact:charm:misc',
    });
    expect(() => resolveContentAsset(requirement, new Set(), 'release'))
      .toThrow(/Release asset missing/);
    expect(() => resolveContentAsset(
      { ...requirement, introducedBy: 'existing' }, new Set(), 'development',
    )).toThrow(/Existing content/);
    expect(() => validateContentAssets([
      requirement, { ...requirement, canonicalId: 'artifact:other' },
    ], new Set(['artifact:theBellows']), 'release')).toThrow(/shared/);
  });
});
