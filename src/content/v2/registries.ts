import {
  CONTENT_SCHEMA_VERSION, EFFECT_PRIMITIVE_IDS,
  KNACK_HANDLER_IDS, V2_ACQUISITION_SITE_KINDS, V2_ARTIFACT_EFFECT_TAGS,
  type AcquisitionSiteHandler,
  type ArtifactEffectHandler,
  type EffectPrimitiveContract,
  type EffectPrimitiveHandler,
  type ExecutableContentHandler,
  type KnackHandler,
} from './schema';

export const EFFECT_PRIMITIVE_CONTRACTS: Readonly<Record<
  EffectPrimitiveContract['id'], EffectPrimitiveContract
>> = Object.freeze({
  'impact-damage': { id: 'impact-damage', domain: 'combat', stage: 'damage-computation' },
  resurrect: { id: 'resurrect', domain: 'combat', stage: 'apply' },
  'mind-control': { id: 'mind-control', domain: 'combat', stage: 'ownership-resolution' },
  'damage-link': { id: 'damage-link', domain: 'combat', stage: 'damage-routing' },
  'teleport-stack': { id: 'teleport-stack', domain: 'combat', stage: 'apply' },
  stun: { id: 'stun', domain: 'combat', stage: 'turn-advance' },
  berserk: { id: 'berserk', domain: 'combat', stage: 'target-selection' },
  clone: { id: 'clone', domain: 'combat', stage: 'apply' },
  'spell-immune': { id: 'spell-immune', domain: 'combat', stage: 'target-selection' },
  'counter-detonate': { id: 'counter-detonate', domain: 'combat', stage: 'apply' },
  'counter-convert': { id: 'counter-convert', domain: 'combat', stage: 'apply' },
  sacrifice: { id: 'sacrifice', domain: 'combat', stage: 'death-triggers' },
  'grant-shots': { id: 'grant-shots', domain: 'combat', stage: 'apply' },
  'grant-extra-action': { id: 'grant-extra-action', domain: 'combat', stage: 'turn-advance' },
  'delayed-trigger': { id: 'delayed-trigger', domain: 'combat', stage: 'turn-advance' },
  'mid-battle-resonance': { id: 'mid-battle-resonance', domain: 'combat', stage: 'declare' },
  'hazard-hex': { id: 'hazard-hex', domain: 'combat', stage: 'tile-registry' },
  'mana-drain': { id: 'mana-drain', domain: 'combat', stage: 'apply' },
  'hero-teleport-radius': { id: 'hero-teleport-radius', domain: 'adventure', stage: 'adventure-apply' },
  'terrain-ignore-day': { id: 'terrain-ignore-day', domain: 'adventure', stage: 'adventure-apply' },
  'remote-mana': { id: 'remote-mana', domain: 'adventure', stage: 'adventure-apply' },
  'production-steal': { id: 'production-steal', domain: 'adventure', stage: 'adventure-apply' },
  'enemy-movement-denial': { id: 'enemy-movement-denial', domain: 'adventure', stage: 'adventure-apply' },
  'prebattle-condition': { id: 'prebattle-condition', domain: 'adventure', stage: 'adventure-apply' },
  'guardian-intel': { id: 'guardian-intel', domain: 'adventure', stage: 'adventure-apply' },
});

/**
 * Mechanics phases register concrete handlers here. Keeping contracts separate means declaring an
 * ID cannot accidentally satisfy executable coverage.
 */
const primitiveHandlers = new Map<EffectPrimitiveHandler['id'], EffectPrimitiveHandler>();
const artifactEffectHandlers = new Map<ArtifactEffectHandler['id'], ArtifactEffectHandler>();
const knackHandlers = new Map<KnackHandler['id'], KnackHandler>();
const acquisitionSiteHandlers = new Map<
  AcquisitionSiteHandler['id'], AcquisitionSiteHandler
>();

function registerKnownHandler<Id extends string, Stage extends string>(
  registry: Map<Id, ExecutableContentHandler<Id, Stage>>,
  knownIds: readonly string[],
  handler: ExecutableContentHandler<Id, Stage>,
  label: string,
  expectedStage?: Stage,
): void {
  if (!knownIds.includes(handler.id)) throw new Error(`Unknown ${label} handler: ${handler.id}`);
  if (!handler.stage || typeof handler.apply !== 'function') {
    throw new Error(`Invalid ${label} handler: ${handler.id}`);
  }
  if (expectedStage !== undefined && handler.stage !== expectedStage) {
    throw new Error(`${label} ${handler.id} must register at ${expectedStage}`);
  }
  if (registry.has(handler.id)) throw new Error(`Duplicate ${label} handler: ${handler.id}`);
  registry.set(handler.id, handler);
}

export function registerEffectPrimitiveHandler(handler: EffectPrimitiveHandler): void {
  if (!Object.hasOwn(EFFECT_PRIMITIVE_CONTRACTS, handler.id)) {
    throw new Error(`Unknown effect primitive handler: ${handler.id}`);
  }
  const contract = EFFECT_PRIMITIVE_CONTRACTS[handler.id];
  if (typeof handler.apply !== 'function') {
    throw new Error(`Invalid effect primitive handler: ${handler.id}`);
  }
  if (handler.stage !== contract.stage) {
    throw new Error(`Effect primitive ${handler.id} must register at ${contract.stage}`);
  }
  if (primitiveHandlers.has(handler.id)) {
    throw new Error(`Duplicate effect primitive handler: ${handler.id}`);
  }
  primitiveHandlers.set(handler.id, handler);
}

export function registerArtifactEffectHandler(handler: ArtifactEffectHandler): void {
  registerKnownHandler(
    artifactEffectHandlers, V2_ARTIFACT_EFFECT_TAGS, handler, 'artifact effect',
  );
}

export function registerKnackHandler(handler: KnackHandler): void {
  registerKnownHandler(knackHandlers, KNACK_HANDLER_IDS, handler, 'Knack', 'hero-act');
}

export function registerAcquisitionSiteHandler(handler: AcquisitionSiteHandler): void {
  registerKnownHandler(
    acquisitionSiteHandlers, V2_ACQUISITION_SITE_KINDS, handler,
    'acquisition site', 'adventure-interaction',
  );
}

export function effectPrimitiveHandler(
  id: EffectPrimitiveHandler['id'],
): EffectPrimitiveHandler | undefined {
  return primitiveHandlers.get(id);
}

export function registeredEffectPrimitiveHandlers(): ReadonlyMap<
  EffectPrimitiveHandler['id'], EffectPrimitiveHandler
> {
  return primitiveHandlers;
}

export function registeredArtifactEffectHandlers(): ReadonlyMap<
  ArtifactEffectHandler['id'], ArtifactEffectHandler
> {
  return artifactEffectHandlers;
}

export function registeredKnackHandlers(): ReadonlyMap<KnackHandler['id'], KnackHandler> {
  return knackHandlers;
}

export function registeredAcquisitionSiteHandlers(): ReadonlyMap<
  AcquisitionSiteHandler['id'], AcquisitionSiteHandler
> {
  return acquisitionSiteHandlers;
}

export function registeredEffectPrimitiveIds(): readonly EffectPrimitiveHandler['id'][] {
  return EFFECT_PRIMITIVE_IDS.filter((id) => primitiveHandlers.has(id));
}

export function clearEffectPrimitiveHandlersForTest(): void {
  primitiveHandlers.clear();
}

export function clearContentV2HandlersForTest(): void {
  primitiveHandlers.clear();
  artifactEffectHandlers.clear();
  knackHandlers.clear();
  acquisitionSiteHandlers.clear();
}

export const CONTENT_V2_HASH_INPUT = Object.freeze({
  schema: CONTENT_SCHEMA_VERSION,
  effectPrimitives: EFFECT_PRIMITIVE_IDS.map((id) => EFFECT_PRIMITIVE_CONTRACTS[id]),
  artifactEffectHandlerIds: V2_ARTIFACT_EFFECT_TAGS,
  knackHandlerIds: KNACK_HANDLER_IDS,
  acquisitionSiteHandlerIds: V2_ACQUISITION_SITE_KINDS,
});
