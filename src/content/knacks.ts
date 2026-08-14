import type { FactionId } from '../core/types';
import type { KnackDefinition, KnackRank } from './v2/schema';
import type { ContentAssetRequirement } from './v2/schema';
import { registerKnackHandler, registeredKnackHandlers } from './v2/registries';
import { validateKnackCatalog } from './v2/validation';

const rank = (level: 1 | 6 | 12, effectText: string) => ({ level, effectText });
const knack = (
  faction: FactionId, name: string, flavor: string,
  targeting: KnackDefinition['targeting'], effects: [string, string, string],
): KnackDefinition => ({
  id: faction, faction, name, flavor, handlerId: ({
    hearthguard: 'hearten', woundWrights: 'patch', unfinished: 'errand-remembered',
    vespiary: 'lay-resin', hagwood: 'ill-wish', wildergrass: 'blood-drum',
  } as const)[faction], targeting,
  ranks: { 1: rank(1, effects[0]), 2: rank(6, effects[1]), 3: rank(12, effects[2]) },
  iconAssetId: `knack:${faction}`,
});

export const KNACKS: Readonly<Record<FactionId, KnackDefinition>> = Object.freeze({
  hearthguard: knack('hearthguard', 'Hearten', 'A word down the line before the charge.',
    'single-ally', ['One allied company gains 20 morale.', 'One allied company gains 30 morale.',
      'One allied company gains 40 morale, and a second allied company gains 20.']),
  woundWrights: knack('woundWrights', 'Patch', 'Nothing is broken; things are merely between repairs.',
    'single-ally', ['Heal one allied company for 5% of maximum HP; no resurrection.',
      'Heal one allied company for 8% of maximum HP; no resurrection.',
      'Heal one allied company for 12% of maximum HP; constructs receive double healing.']),
  unfinished: knack('unfinished', 'The Errand Remembered', 'You had not finished. Go on.',
    'single-ally', ['Return units up to 10 + 3 × hero level HP, within starting count.',
      'Return units up to 10 + 5 × hero level HP, within starting count.',
      'Return units up to 10 + 7 × hero level HP; a company destroyed this round is eligible.']),
  vespiary: knack('vespiary', 'Lay Resin', 'The Hive extends the courtesy of a difficult floor.',
    'positions', ['Place one resin tile on an empty hex adjacent to an enemy company.',
      'Place one resin tile on any empty hex.', 'Place two resin tiles on any empty hexes.']),
  hagwood: knack('hagwood', 'Ill-Wish', 'It would be a shame if that went badly for you.',
    'single-enemy', ['One enemy company gains Hex 1.', 'One enemy company gains Hex 2.',
      'One enemy company gains Hex 3 and loses 10 morale.']),
  wildergrass: knack('wildergrass', 'Blood Drum', 'Grief is neither gothic nor abstract; it is spent forward.',
    'single-ally', ['One allied company loses 3% current HP; every other ally gains 10 morale.',
      'The payer loses 3% current HP; every other ally gains 15 morale and +1 speed this round.',
      'The payer loses 3% current HP; every other ally gains 20 morale and +1 speed this round; the payer gains +2 Attack this round.']),
});

export const KNACK_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] = Object.values(KNACKS)
  .map((definition) => ({
    canonicalId: `knack:${definition.faction}`, accessibleName: `${definition.name} Knack icon`,
    visualSubject: ({
      hearthguard: 'a small upright red-and-cream field banner lifted by a gloved hand',
      woundWrights: 'two lacquered jointed wooden hands fastening a bright brass repair patch',
      unfinished: 'a candle beside an unfinished folded letter tied with pale funeral thread',
      vespiary: 'a heavy amber resin drop spreading into a ridged honey-gold floor tile',
      hagwood: 'a crooked birch curse token bound with black crow feather and berry-red thread',
      wildergrass: 'a low hide blood drum with ashwood beater and ochre horn bindings',
    } as const)[definition.faction],
    nativeAssetId: definition.iconAssetId, introducedBy: 'docs-60-67' as const,
    semantics: { family: 'knack' as const, faction: definition.faction },
  }));

// Concrete combat resolution is owned by the Knack resolver. These registrations make every
// catalog row independently live without moving battle state into content data.
export function ensureKnackHandlersRegistered(): void {
  for (const handlerId of ['hearten', 'patch', 'errand-remembered', 'lay-resin', 'ill-wish', 'blood-drum'] as const) {
    if (registeredKnackHandlers().has(handlerId)) continue;
    registerKnackHandler({ id: handlerId, stage: 'hero-act', apply: (context, payload) => {
      const resolver = context as { resolveKnackHandler?: (id: typeof handlerId, payload: unknown) => unknown };
      if (!resolver.resolveKnackHandler) throw new Error(`Knack ${handlerId} needs a combat resolver`);
      return resolver.resolveKnackHandler(handlerId, payload);
    } });
  }
}
ensureKnackHandlersRegistered();

export function knackRankForLevel(level: number): KnackRank {
  if (!Number.isFinite(level) || level < 1) throw new Error('Knack rank needs a positive hero level');
  return level >= 12 ? 3 : level >= 6 ? 2 : 1;
}

export function derivedKnack(
  faction: FactionId,
  level: number,
  catalog: Readonly<Partial<Record<FactionId, KnackDefinition>>> = KNACKS,
): { definition: KnackDefinition; rank: KnackRank } {
  const definition = catalog[faction];
  if (!definition) throw new Error(`No Knack registered for faction: ${faction}`);
  return { definition, rank: knackRankForLevel(level) };
}

export function validateKnacks(): void {
  ensureKnackHandlersRegistered();
  validateKnackCatalog(Object.values(KNACKS), 'final');
}
